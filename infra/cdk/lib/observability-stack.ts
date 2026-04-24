import * as cdk from 'aws-cdk-lib'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'
import { SmartRetailQueues } from './messaging-stack'

interface ObservabilityStackProps extends cdk.StackProps {
  envName: string
  queues: SmartRetailQueues
}

/**
 * ObservabilityStack — CloudWatch alarms on DLQ depth for every queue (CG-09).
 * All alarms: trigger at depth > 0 (any message in DLQ is an actionable alert).
 * SNS topic for alarm routing — integrate PagerDuty/OpsGenie in prod.
 * No Amazon Managed Grafana, no third-party APM (ADR-007 / AG-07).
 */
export class ObservabilityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props)

    // SNS topic for alarm notifications
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `smartretail-alarms-${props.envName}`,
      displayName: 'SmartRetail CloudWatch Alarms',
    })

    // DLQ depth alarms — mandatory per CG-08 / CG-09
    const dlqsToMonitor: Array<{ queue: sqs.Queue; name: string }> = [
      { queue: props.queues.imsSalesEventsDlq, name: 'ims-sales-events-dlq' },
      { queue: props.queues.sisRawEventsDlq,   name: 'sis-raw-events-dlq' },
    ]

    for (const { queue, name } of dlqsToMonitor) {
      const alarm = new cloudwatch.Alarm(this, `${name}-depth-alarm`, {
        alarmName: `smartretail-${name}-depth-${props.envName}`,
        alarmDescription: `DLQ depth > 0 for ${name} — messages not processed`,
        metric: queue.metricApproximateNumberOfMessagesVisible({
          period: cdk.Duration.minutes(1),
          statistic: 'Maximum',
        }),
        threshold: 0,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      })
      alarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic))
    }

    cdk.Tags.of(this).add('Project', 'SmartRetail')
    cdk.Tags.of(this).add('Environment', props.envName)
  }
}
