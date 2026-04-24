import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import { Construct } from 'constructs'
import { NagSuppressions } from 'cdk-nag'

interface NetworkStackProps extends cdk.StackProps {
  envName: string
}

/**
 * NetworkStack — VPC, private subnets, NAT Gateway, VPC endpoints.
 * All ECS tasks and Lambda functions run in private subnets (CLAUDE.md §1.3 / §5.4).
 * VPC endpoints eliminate internet egress for DynamoDB, S3, SSM, Secrets Manager, EventBridge.
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc
  public readonly ecsCluster: ecs.Cluster
  public readonly ecrRepos: Record<string, ecr.Repository>

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props)

    // VPC: 2 AZs, private subnets only for compute, public for NAT
    this.vpc = new ec2.Vpc(this, 'SmartRetailVpc', {
      maxAzs: 2,
      natGateways: 1, // cost: 1 NAT GW per AZ in prod; 1 shared in dev
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    })

    // VPC Endpoints — eliminate public egress for AWS service calls (§5.4)
    this.vpc.addGatewayEndpoint('DynamoDbEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    })
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    })
    this.vpc.addInterfaceEndpoint('SsmEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
    })
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    })
    this.vpc.addInterfaceEndpoint('EventBridgeEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.EVENTBRIDGE,
    })
    this.vpc.addInterfaceEndpoint('KinesisEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.KINESIS_STREAMS,
    })

    // ECS Cluster with Container Insights (ADR-007)
    this.ecsCluster = new ecs.Cluster(this, 'SmartRetailCluster', {
      vpc: this.vpc,
      containerInsights: true,
      clusterName: `smartretail-${props.envName}`,
    })

    // ECR repositories for each ECS service
    const services = ['sis', 'ims', 'dfs', 're', 'sup']
    this.ecrRepos = {}
    for (const svc of services) {
      this.ecrRepos[svc] = new ecr.Repository(this, `${svc.toUpperCase()}Repo`, {
        repositoryName: `smartretail-${svc}-${props.envName}`,
        imageScanOnPush: true,
        removalPolicy: props.envName === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      })
    }

    // Tags per CDK convention (CLAUDE.md §6.6)
    cdk.Tags.of(this).add('Project', 'SmartRetail')
    cdk.Tags.of(this).add('Environment', props.envName)
    cdk.Tags.of(this).add('Owner', 'suplab.debnath@cognizant.com')

    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-VPC7',
        reason: 'VPC flow logs omitted in dev; enabled in staging/prod via ObservabilityStack',
      },
    ])
  }
}
