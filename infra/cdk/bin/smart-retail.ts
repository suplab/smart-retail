#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { AwsSolutionsChecks } from 'cdk-nag'
import { Aspects } from 'aws-cdk-lib'
import { NetworkStack } from '../lib/network-stack'
import { DataStack } from '../lib/data-stack'
import { MessagingStack } from '../lib/messaging-stack'
import { AuthStack } from '../lib/auth-stack'
import { ComputeStack } from '../lib/compute-stack'
import { ObservabilityStack } from '../lib/observability-stack'

const app = new cdk.App()

// Environment is passed as CDK context: npx cdk deploy --context env=dev
const envName = app.node.tryGetContext('env') as string ?? 'dev'
const envConfig = app.node.tryGetContext(envName) as {
  account: string
  region: string
  kinesisShardCount: number
  ecsTaskMinCount: number
  ecsTaskMaxCount: number
  removalPolicy: string
}

if (!envConfig) throw new Error(`No CDK context found for env=${envName}. Check cdk.json.`)

const env: cdk.Environment = {
  account: envConfig.account,
  region: envConfig.region,
}

const stackProps = { env, envName, envConfig }

// Stack deployment order — cross-stack references flow downward
const networkStack = new NetworkStack(app, `SmartRetail-NetworkStack-${envName}`, stackProps)

const dataStack = new DataStack(app, `SmartRetail-DataStack-${envName}`, {
  ...stackProps,
  vpc: networkStack.vpc,
})

const messagingStack = new MessagingStack(app, `SmartRetail-MessagingStack-${envName}`, {
  ...stackProps,
  vpc: networkStack.vpc,
})

const authStack = new AuthStack(app, `SmartRetail-AuthStack-${envName}`, stackProps)

const computeStack = new ComputeStack(app, `SmartRetail-ComputeStack-${envName}`, {
  ...stackProps,
  vpc: networkStack.vpc,
  cluster: networkStack.ecsCluster,
  tables: dataStack.tables,
  queues: messagingStack.queues,
  eventBus: messagingStack.eventBus,
  kinesisStream: messagingStack.posStream,
  internalUserPool: authStack.internalUserPool,
  supplierUserPool: authStack.supplierUserPool,
})

new ObservabilityStack(app, `SmartRetail-ObservabilityStack-${envName}`, {
  ...stackProps,
  queues: messagingStack.queues,
})

// cdk-nag runs on all stacks in CI — all suppressions need documented justification (PG-04)
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

app.synth()
