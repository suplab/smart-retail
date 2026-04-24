# Architecture Mapping — Code ↔ HLD/LLD Traceability

> Maps every code artefact to the HLD section, ADR, and LLD section that mandates it.

---

## Service Boundaries (HLD §3.2 / ADR-001)

| Code Location | Service | HLD Section | ADR |
|---|---|---|---|
| `backend/sis/` | Sales Ingestion Service | §3.2 Service Inventory | ADR-001, ADR-002 |
| `backend/ims/` | Inventory Management Service | §3.2 | ADR-001, ADR-002 |
| `backend/dfs/` | Demand Forecasting Service | §3.2 | ADR-001, ADR-002, ADR-005 |
| `backend/re/` | Replenishment Engine | §3.2 | ADR-001, ADR-002, ADR-003 |
| `backend/sup/` | Supplier Integration Service | §3.2 | ADR-001, ADR-002 |
| `backend/ars/` | Analytics & Reporting (Lambda) | §3.2 | ADR-002 |
| `backend/pps/` | Pricing & Promotions (Lambda) | §3.2 | ADR-002 |
| `backend/common/` | Shared library | — | ADR-008 |
| `frontend/` | React 18 SPA | §3.2 | ADR-006 |
| `infra/cdk/` | AWS CDK IaC | §3 Platform Architecture | ADR-009 |

---

## Hexagonal Architecture (ADR-008)

| Package Pattern | Layer | Rule |
|---|---|---|
| `com.smartretail.{svc}.domain.model` | Domain Aggregates | Pure Java — zero Spring/AWS imports (CG-01) |
| `com.smartretail.{svc}.domain.port.inbound` | Primary Ports | Interfaces only |
| `com.smartretail.{svc}.domain.port.outbound` | Secondary Ports | Interfaces only |
| `com.smartretail.{svc}.domain.exception` | Domain Exceptions | Extend `DomainException` — no SDK exceptions |
| `com.smartretail.{svc}.application.service` | Application Services | `@Service`, orchestrates domain, no AWS SDK |
| `com.smartretail.{svc}.application.dto` | Command/Query DTOs | Records — no domain leakage |
| `com.smartretail.{svc}.infrastructure.adapter.inbound` | Inbound Adapters | Kinesis/SQS consumers, REST controllers |
| `com.smartretail.{svc}.infrastructure.adapter.outbound` | Outbound Adapters | DynamoDB, EventBridge, S3, SageMaker |
| `com.smartretail.{svc}.infrastructure.config` | Spring Config | `@ConfigurationProperties`, `@Bean` |

ArchUnit tests in `*ArchitectureTest.java` enforce these rules in CI.

---

## DynamoDB Tables (LLD §4 / CLAUDE.md §3.3)

| Table | CDK | Java Adapter | Owner Service |
|---|---|---|---|
| `sales-events` | `DataStack.salesEvents` | `DynamoDbSalesEventAdapter` | SIS |
| `idempotency-keys` | `DataStack.idempotencyKeys` | `DynamoDbIdempotencyAdapter` | SIS |
| `inventory-positions` | `DataStack.inventoryPositions` | `DynamoDbInventoryAdapter` | IMS |
| `forecasts` | `DataStack.forecasts` | *(DFS — Sprint 2 Week 2)* | DFS |
| `purchase-orders` | `DataStack.purchaseOrders` | *(RE — Sprint 2 Week 2)* | RE |
| `supplier-pos` | `DataStack.supplierPos` | *(SUP — Sprint 2 Week 2)* | SUP |
| `elasticity-reference` | `DataStack.elasticityReference` | *(PPS read — Sprint 2 Week 2)* | PPS |

---

## EventBridge Topology (CLAUDE.md §3.4)

| Event | Producer Code | Consumer Queues | CDK Rule |
|---|---|---|---|
| `SalesTransactionRecorded` | `EventBridgePublisherAdapter` (SIS) | `ims-sales-events-queue`, `dfs-sales-events-queue` | `MessagingStack.addRule('SalesTransactionRecorded')` |
| `LowStockAlertRaised` | `EventBridgeAlertAdapter` (IMS) | `re-alert-queue.fifo`, `ars-alert-queue` | `MessagingStack.addRule('LowStockAlertRaised')` |
| `ForecastAdjustmentPublished` | `PpsHandler` (PPS Lambda) | `dfs-adjustment-queue` | `MessagingStack.addRule('ForecastAdjustmentPublished')` |

---

## CDK Stack Dependencies

```
NetworkStack
  └── DataStack (vpc)
  └── MessagingStack (vpc)
  └── AuthStack (independent)
  └── ComputeStack (vpc, cluster, tables, queues, eventBus, streams, userPools)
  └── ObservabilityStack (queues)
```

---

## Golden Thread Flow (CLAUDE.md §4.1)

```
POS event
  → Kinesis (smartretail-pos-stream)       [MessagingStack]
    → KinesisConsumerAdapter               [SIS inbound adapter]
      → SalesIngestionService.ingest()     [SIS application service]
        → DynamoDbSalesEventAdapter        [SIS outbound adapter → sales-events table]
        → DynamoDbIdempotencyAdapter       [SIS outbound adapter → idempotency-keys table]
        → S3RawEventStoreAdapter           [SIS outbound adapter → raw-events S3]
        → EventBridgePublisherAdapter      [SIS outbound adapter → smartretail-events bus]
          → SalesTransactionRecorded       [EventBridge rule → ims-sales-events-queue]
            → SqsMessageConsumerAdapter    [IMS inbound adapter]
              → InventoryManagementService [IMS application service]
                → DynamoDbInventoryAdapter [IMS outbound → inventory-positions table]
                → EventBridgeAlertAdapter  [IMS outbound → LowStockAlertRaised if threshold]
                  → GET /v1/dashboard/inventory [ARS Lambda → React SPA]
```

---

## Open Questions Blocking Implementation

| OQ | Blocking What | Code Reference |
|---|---|---|
| OQ-01 | Kinesis shard count, DynamoDB capacity | `cdk.json` context parameters |
| OQ-02 | PO auto-approval threshold | `PurchaseOrder.AUTO_APPROVAL_THRESHOLD` |
| OQ-03 | ML training data depth | DFS SageMaker Training Job config |
| OQ-04 | DeepAR forecastHorizon / predictionLength | `application.yml` in DFS |
| OQ-05 | Promotion event source format | `PpsHandler` trigger design |
| OQ-09 | Supplier onboarding fields | `SupplierPo` domain model |
| OQ-10 | Safety stock formula | `InventoryManagementService` placeholder |
