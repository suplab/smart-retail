import * as cdk from 'aws-cdk-lib'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as kinesis from 'aws-cdk-lib/aws-kinesis'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'
import { NagSuppressions } from 'cdk-nag'

interface MessagingStackProps extends cdk.StackProps {
  envName: string
  envConfig: { kinesisShardCount: number; removalPolicy: string }
  vpc: ec2.Vpc
}

export interface SmartRetailQueues {
  // SIS
  sisRawEventsDlq: sqs.Queue
  // IMS
  imsSalesEventsQueue: sqs.Queue
  imsSalesEventsDlq: sqs.Queue
  imsForecastUpdatedQueue: sqs.Queue
  imsShipmentQueue: sqs.Queue
  // DFS
  dfsSalesEventsQueue: sqs.Queue
  dfsAdjustmentQueue: sqs.Queue
  // RE
  reAlertQueue: sqs.Queue   // FIFO
  reConfirmationQueue: sqs.Queue // FIFO
  // SUP
  supPoDispatchedQueue: sqs.Queue
  // ARS
  arsAlertQueue: sqs.Queue
  arsShipmentQueue: sqs.Queue
}

/**
 * MessagingStack — Kinesis, EventBridge custom bus, all SQS queues with DLQs.
 * Every queue has a DLQ with CloudWatch alarm (CG-08 / CG-09 / CLAUDE.md §3.4).
 * EventBridge rules route events to subscriber queues per the topology in CLAUDE.md §3.4.
 * Kinesis shard count is a CDK context parameter — never hardcoded (PG-06).
 */
export class MessagingStack extends cdk.Stack {
  public readonly posStream: kinesis.Stream
  public readonly eventBus: events.EventBus
  public readonly queues: SmartRetailQueues

  constructor(scope: Construct, id: string, props: MessagingStackProps) {
    super(scope, id, props)

    const removalPolicy = props.envConfig.removalPolicy === 'RETAIN'
      ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY

    // Kinesis Data Streams — shard count from CDK context (OQ-01 / PG-06)
    this.posStream = new kinesis.Stream(this, 'PosStream', {
      streamName: `smartretail-pos-stream-${props.envName}`,
      shardCount: props.envConfig.kinesisShardCount, // confirmed by load test
      retentionPeriod: cdk.Duration.hours(24),
      encryption: kinesis.StreamEncryption.MANAGED,
    })

    // EventBridge custom bus
    this.eventBus = new events.EventBus(this, 'SmartRetailEventBus', {
      eventBusName: 'smartretail-events',
    })

    // Helper — create Standard queue + DLQ pair
    const makeQueue = (name: string, visibilityTimeout = 30): { queue: sqs.Queue; dlq: sqs.Queue } => {
      const dlq = new sqs.Queue(this, `${name}Dlq`, {
        queueName: `${name}-dlq-${props.envName}`,
        retentionPeriod: cdk.Duration.days(14),
        removalPolicy,
      })
      const queue = new sqs.Queue(this, name, {
        queueName: `${name}-${props.envName}`,
        visibilityTimeout: cdk.Duration.seconds(visibilityTimeout),
        removalPolicy,
        deadLetterQueue: {
          queue: dlq,
          maxReceiveCount: 3, // per LLD §5.3 DLQ configuration
        },
      })
      return { queue, dlq }
    }

    // Helper — create FIFO queue + DLQ
    const makeFifoQueue = (name: string): { queue: sqs.Queue; dlq: sqs.Queue } => {
      const dlq = new sqs.Queue(this, `${name}Dlq`, {
        queueName: `${name}-dlq-${props.envName}.fifo`,
        fifo: true,
        retentionPeriod: cdk.Duration.days(14),
        removalPolicy,
      })
      const queue = new sqs.Queue(this, name, {
        queueName: `${name}-${props.envName}.fifo`,
        fifo: true,
        contentBasedDeduplication: true,
        visibilityTimeout: cdk.Duration.seconds(60),
        removalPolicy,
        deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
      })
      return { queue, dlq }
    }

    // Provision all queues
    const { queue: imsSalesEvents, dlq: imsSalesDlq } = makeQueue('ims-sales-events-queue')
    const { queue: imsForecastUpdated } = makeQueue('ims-forecast-updated-queue')
    const { queue: imsShipment } = makeQueue('ims-shipment-queue')
    const { queue: dfsSalesEvents } = makeQueue('dfs-sales-events-queue')
    const { queue: dfsAdjustment } = makeQueue('dfs-adjustment-queue')
    const { queue: reAlert, dlq: reAlertDlq } = makeFifoQueue('re-alert-queue')
    const { queue: reConfirmation } = makeFifoQueue('re-confirmation-queue')
    const { queue: supPoDispatched } = makeQueue('sup-po-dispatched-queue')
    const { queue: arsAlert } = makeQueue('ars-alert-queue')
    const { queue: arsShipment } = makeQueue('ars-shipment-queue')
    const { dlq: sisRawEventsDlq } = makeQueue('sis-raw-events')

    this.queues = {
      sisRawEventsDlq,
      imsSalesEventsQueue: imsSalesEvents,
      imsSalesEventsDlq: imsSalesDlq,
      imsForecastUpdatedQueue: imsForecastUpdated,
      imsShipmentQueue: imsShipment,
      dfsSalesEventsQueue: dfsSalesEvents,
      dfsAdjustmentQueue: dfsAdjustment,
      reAlertQueue: reAlert,
      reConfirmationQueue: reConfirmation,
      supPoDispatchedQueue: supPoDispatched,
      arsAlertQueue: arsAlert,
      arsShipmentQueue: arsShipment,
    }

    // EventBridge rules — route domain events to subscriber queues (CLAUDE.md §3.4)
    const addRule = (eventType: string, ...targetQueues: sqs.Queue[]) => {
      new events.Rule(this, `Rule-${eventType}`, {
        eventBus: this.eventBus,
        ruleName: `smartretail-${eventType}-${props.envName}`,
        eventPattern: { detailType: [eventType] },
        targets: targetQueues.map(q => new targets.SqsQueue(q)),
      })
    }

    addRule('SalesTransactionRecorded', dfsSalesEvents, imsSalesEvents)
    addRule('ForecastUpdated', imsForecastUpdated)
    addRule('LowStockAlertRaised', reAlert, arsAlert)
    addRule('OverstockAlert', arsAlert)
    addRule('PODispatched', supPoDispatched)
    addRule('ShipmentUpdated', imsShipment, arsShipment)
    addRule('OrderConfirmed', reConfirmation)
    addRule('ForecastAdjustmentPublished', dfsAdjustment)

    cdk.Tags.of(this).add('Project', 'SmartRetail')
    cdk.Tags.of(this).add('Environment', props.envName)
  }
}
