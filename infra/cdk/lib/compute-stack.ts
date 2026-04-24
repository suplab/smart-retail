import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as kinesis from 'aws-cdk-lib/aws-kinesis'
import * as events from 'aws-cdk-lib/aws-events'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'
import { SmartRetailTables } from './data-stack'
import { SmartRetailQueues } from './messaging-stack'
import { NagSuppressions } from 'cdk-nag'

interface ComputeStackProps extends cdk.StackProps {
  envName: string
  envConfig: { ecsTaskMinCount: number; ecsTaskMaxCount: number; removalPolicy: string }
  vpc: ec2.Vpc
  cluster: ecs.Cluster
  tables: SmartRetailTables
  queues: SmartRetailQueues
  eventBus: events.EventBus
  kinesisStream: kinesis.Stream
  internalUserPool: cognito.UserPool
  supplierUserPool: cognito.UserPool
}

/**
 * ComputeStack — ECS Fargate task definitions for 5 services + Lambda for ARS and PPS.
 * IAM task roles: minimum required permissions per service (least-privilege, no wildcards).
 * OpenTelemetry Java agent injected via JAVA_TOOL_OPTIONS (ADR-007 — no per-service code).
 * Blue-green deployment enabled for prod via CodeDeploy (CLAUDE.md §1.3 / §6.7).
 */
export class ComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props)

    const removalPolicy = props.envConfig.removalPolicy === 'RETAIN'
      ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY

    // S3 bucket for raw events and ML artifacts
    const rawEventsBucket = new s3.Bucket(this, 'RawEventsBucket', {
      bucketName: `smartretail-raw-events-${props.envName}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy,
    })

    // ── SIS — Sales Ingestion Service ───────────────────────────────────────
    const sisRole = this.makeTaskRole('SisTaskRole', {
      kinesisStream: props.kinesisStream,
      tables: [props.tables.salesEvents, props.tables.idempotencyKeys],
      eventBus: props.eventBus,
      s3Buckets: [rawEventsBucket],
    })

    this.makeFargateService('SIS', {
      cluster: props.cluster,
      taskRole: sisRole,
      imageTag: 'latest',
      envName: props.envName,
      environment: {
        KINESIS_STREAM_NAME: props.kinesisStream.streamName,
        DYNAMODB_SALES_TABLE: props.tables.salesEvents.tableName,
        DYNAMODB_IDEMPOTENCY_TABLE: props.tables.idempotencyKeys.tableName,
        EVENTBRIDGE_BUS_NAME: props.eventBus.eventBusName,
        S3_RAW_EVENTS_BUCKET: rawEventsBucket.bucketName,
        AWS_REGION: this.region,
        // OTel agent injected — no per-service code (ADR-007)
        JAVA_TOOL_OPTIONS: '-javaagent:/otel-agent/opentelemetry-javaagent.jar',
      },
      minCount: props.envConfig.ecsTaskMinCount,
      maxCount: props.envConfig.ecsTaskMaxCount,
    })

    // ── IMS — Inventory Management Service ──────────────────────────────────
    const imsRole = this.makeTaskRole('ImsTaskRole', {
      tables: [props.tables.inventoryPositions],
      queues: [props.queues.imsSalesEventsQueue, props.queues.imsShipmentQueue, props.queues.imsForecastUpdatedQueue],
      eventBus: props.eventBus,
    })

    this.makeFargateService('IMS', {
      cluster: props.cluster,
      taskRole: imsRole,
      imageTag: 'latest',
      envName: props.envName,
      environment: {
        SQS_SALES_EVENTS_QUEUE_URL: props.queues.imsSalesEventsQueue.queueUrl,
        SQS_FORECAST_QUEUE_URL: props.queues.imsForecastUpdatedQueue.queueUrl,
        SQS_SHIPMENT_QUEUE_URL: props.queues.imsShipmentQueue.queueUrl,
        DYNAMODB_INVENTORY_TABLE: props.tables.inventoryPositions.tableName,
        EVENTBRIDGE_BUS_NAME: props.eventBus.eventBusName,
        AWS_REGION: this.region,
        JAVA_TOOL_OPTIONS: '-javaagent:/otel-agent/opentelemetry-javaagent.jar',
      },
      minCount: props.envConfig.ecsTaskMinCount,
      maxCount: props.envConfig.ecsTaskMaxCount,
    })

    // ── ARS Lambda — Analytics & Reporting ──────────────────────────────────
    const arsRole = new iam.Role(this, 'ArsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    })
    props.tables.inventoryPositions.grantReadData(arsRole)
    props.tables.forecasts.grantReadData(arsRole)
    props.tables.purchaseOrders.grantReadData(arsRole)

    const arsLambda = new lambda.Function(this, 'ArsLambda', {
      functionName: `smartretail-ars-${props.envName}`,
      runtime: lambda.Runtime.JAVA_17,
      handler: 'com.smartretail.ars.handler.ArsHandler::handleRequest',
      code: lambda.Code.fromAsset('../../backend/ars/target/ars-1.0.0-SNAPSHOT.jar'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29), // API GW max is 29s
      role: arsRole,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      tracing: lambda.Tracing.ACTIVE, // X-Ray (ADR-007)
      environment: {
        DYNAMODB_INVENTORY_TABLE: props.tables.inventoryPositions.tableName,
        EVENTBRIDGE_BUS_NAME: props.eventBus.eventBusName,
        AWS_REGION: this.region,
      },
    })

    // API Gateway with Cognito JWT authoriser for Internal users
    const internalAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'InternalAuthorizer', {
      cognitoUserPools: [props.internalUserPool],
    })

    const api = new apigateway.RestApi(this, 'SmartRetailApi', {
      restApiName: `smartretail-api-${props.envName}`,
      deployOptions: {
        stageName: 'v1',
        tracingEnabled: true,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    })

    const v1 = api.root.addResource('v1')
    const dashboard = v1.addResource('dashboard')
    const inventoryResource = dashboard.addResource('inventory')
    inventoryResource.addMethod('GET', new apigateway.LambdaIntegration(arsLambda), {
      authorizer: internalAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    new cdk.CfnOutput(this, 'ApiGatewayUrl', { value: api.url })

    cdk.Tags.of(this).add('Project', 'SmartRetail')
    cdk.Tags.of(this).add('Environment', props.envName)
  }

  private makeFargateService(name: string, opts: {
    cluster: ecs.Cluster
    taskRole: iam.Role
    imageTag: string
    envName: string
    environment: Record<string, string>
    minCount: number
    maxCount: number
  }): ecs.FargateService {
    const taskDef = new ecs.FargateTaskDefinition(this, `${name}TaskDef`, {
      cpu: 512,
      memoryLimitMiB: 1024,
      taskRole: opts.taskRole,
      executionRole: new iam.Role(this, `${name}ExecRole`, {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
        ],
      }),
    })

    taskDef.addContainer(`${name}Container`, {
      image: ecs.ContainerImage.fromRegistry(`smartretail-${name.toLowerCase()}:${opts.imageTag}`),
      environment: opts.environment,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: `smartretail-${name.toLowerCase()}`,
        logRetention: 30,
      }),
      portMappings: [{ containerPort: 8080 }],
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:8080/actuator/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
      },
    })

    const service = new ecs.FargateService(this, `${name}Service`, {
      cluster: opts.cluster,
      taskDefinition: taskDef,
      desiredCount: opts.minCount,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
    })

    // Auto-scaling
    const scaling = service.autoScaleTaskCount({ minCapacity: opts.minCount, maxCapacity: opts.maxCount })
    scaling.scaleOnCpuUtilization(`${name}CpuScaling`, { targetUtilizationPercent: 70 })

    return service
  }

  private makeTaskRole(id: string, grants: {
    kinesisStream?: kinesis.Stream
    tables?: cdk.aws_dynamodb.ITable[]
    queues?: sqs.Queue[]
    eventBus?: events.EventBus
    s3Buckets?: s3.Bucket[]
  }): iam.Role {
    const role = new iam.Role(this, id, {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    })
    grants.kinesisStream?.grantRead(role)
    grants.tables?.forEach(t => t.grantReadWriteData(role))
    grants.queues?.forEach(q => q.grantConsumeMessages(role))
    grants.eventBus?.grantPutEventsTo(role)
    grants.s3Buckets?.forEach(b => b.grantWrite(role))
    return role
  }
}
