import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as kms from 'aws-cdk-lib/aws-kms'
import { Construct } from 'constructs'
import { NagSuppressions } from 'cdk-nag'

interface DataStackProps extends cdk.StackProps {
  envName: string
  envConfig: { removalPolicy: string }
  vpc: ec2.Vpc
}

export interface SmartRetailTables {
  salesEvents: dynamodb.Table
  idempotencyKeys: dynamodb.Table
  inventoryPositions: dynamodb.Table
  forecasts: dynamodb.Table
  purchaseOrders: dynamodb.Table
  supplierPos: dynamodb.Table
  elasticityReference: dynamodb.Table
}

/**
 * DataStack — all DynamoDB tables (sole operational store per ADR-004).
 * Table names match exactly the schema in CLAUDE.md §3.3 — never deviate.
 * All tables: on-demand mode, PITR enabled, encrypted at rest.
 * GSIs defined per LLD access patterns (CG-07: no ad-hoc scans).
 */
export class DataStack extends cdk.Stack {
  public readonly tables: SmartRetailTables
  public readonly piiKey: kms.Key

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props)

    const removalPolicy = props.envConfig.removalPolicy === 'RETAIN'
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY

    // KMS key for PII encryption (supplier email/phone) — CLAUDE.md §1.3 / §5.4
    this.piiKey = new kms.Key(this, 'PiiKey', {
      description: 'SmartRetail PII encryption key for supplier contact data',
      enableKeyRotation: true,
      alias: `alias/smartretail-pii-${props.envName}`,
      removalPolicy,
    })

    // DynamoDB on-demand — cost scales with actual request volume (CLAUDE.md §6.6)
    const tableDefaults = {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true, // RPO ≤ 15 min (CLAUDE.md §1.3)
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy,
    }

    // sales-events: PK=transactionId, GSI-SKU-DC-Date
    const salesEvents = new dynamodb.Table(this, 'SalesEvents', {
      ...tableDefaults,
      tableName: 'sales-events',
      partitionKey: { name: 'transactionId', type: dynamodb.AttributeType.STRING },
    })
    salesEvents.addGlobalSecondaryIndex({
      indexName: 'GSI-SKU-DC-Date',
      partitionKey: { name: 'skuId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'skuDcDate', type: dynamodb.AttributeType.STRING },
    })

    // idempotency-keys: PK=eventId, TTL=ttlEpochSeconds (48h)
    const idempotencyKeys = new dynamodb.Table(this, 'IdempotencyKeys', {
      ...tableDefaults,
      tableName: 'idempotency-keys',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttlEpochSeconds',
    })

    // inventory-positions: PK=skuId, SK=dcId, GSI-DC-Alerts
    const inventoryPositions = new dynamodb.Table(this, 'InventoryPositions', {
      ...tableDefaults,
      tableName: 'inventory-positions',
      partitionKey: { name: 'skuId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'dcId', type: dynamodb.AttributeType.STRING },
    })
    inventoryPositions.addGlobalSecondaryIndex({
      indexName: 'GSI-DC-Alerts',
      partitionKey: { name: 'dcId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'alertStatus', type: dynamodb.AttributeType.STRING },
    })

    // forecasts: PK=skuId, SK=dcId#forecastDate, GSI-DC-ForecastDate
    const forecasts = new dynamodb.Table(this, 'Forecasts', {
      ...tableDefaults,
      tableName: 'forecasts',
      partitionKey: { name: 'skuId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'dcForecastDate', type: dynamodb.AttributeType.STRING },
    })
    forecasts.addGlobalSecondaryIndex({
      indexName: 'GSI-DC-ForecastDate',
      partitionKey: { name: 'dcId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'forecastDate', type: dynamodb.AttributeType.STRING },
    })

    // purchase-orders: PK=poId, GSI-Supplier-Status, GSI-SKU-DC
    const purchaseOrders = new dynamodb.Table(this, 'PurchaseOrders', {
      ...tableDefaults,
      tableName: 'purchase-orders',
      partitionKey: { name: 'poId', type: dynamodb.AttributeType.STRING },
    })
    purchaseOrders.addGlobalSecondaryIndex({
      indexName: 'GSI-Supplier-Status',
      partitionKey: { name: 'supplierId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'statusCreatedAt', type: dynamodb.AttributeType.STRING },
    })
    purchaseOrders.addGlobalSecondaryIndex({
      indexName: 'GSI-SKU-DC',
      partitionKey: { name: 'skuId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'dcCreatedAt', type: dynamodb.AttributeType.STRING },
    })

    // supplier-pos: PK=supplierId, SK=poId, GSI-PO-Status
    const supplierPos = new dynamodb.Table(this, 'SupplierPos', {
      ...tableDefaults,
      tableName: 'supplier-pos',
      partitionKey: { name: 'supplierId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'poId', type: dynamodb.AttributeType.STRING },
    })
    supplierPos.addGlobalSecondaryIndex({
      indexName: 'GSI-PO-Status',
      partitionKey: { name: 'poId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    })

    // elasticity-reference: PK=skuId, SK=category (read by PPS Lambda)
    const elasticityReference = new dynamodb.Table(this, 'ElasticityReference', {
      ...tableDefaults,
      tableName: 'elasticity-reference',
      partitionKey: { name: 'skuId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'category', type: dynamodb.AttributeType.STRING },
    })

    this.tables = {
      salesEvents, idempotencyKeys, inventoryPositions,
      forecasts, purchaseOrders, supplierPos, elasticityReference,
    }

    cdk.Tags.of(this).add('Project', 'SmartRetail')
    cdk.Tags.of(this).add('Environment', props.envName)
  }
}
