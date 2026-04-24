# CLAUDE.md — SmartRetail Demand Forecasting & Supply Chain Platform
> **Project Context File for AI Code Companion Tools**
>
> Author: Suplab Debnath — Solutions Architect → Enterprise Architect (Transitioning)
> Version: 1.0 | April 2026 | Classification: Internal — Confidential
> Companion Docs: `SmartRetail_PreWork_Assessment_v3.docx` · `SmartRetail_HLD_v2_revised.docx` · `SmartRetail_LLD_v3.docx` · `SmartRetail_APISpec_v2.docx`

---

## ⚠️ CRITICAL GUARDRAILS — READ BEFORE GENERATING ANY CODE OR ARTEFACT

These rules are non-negotiable and apply to every interaction in this project. Violating them will produce output that diverges from the agreed architecture and creates rework.

1. **Zero Assumptions.** Never invent numbers, service names, table schemas, event field names, or technology choices that are not in the source documents. If something is ambiguous or missing, STOP and ask before proceeding.
2. **No Fictive Creations.** Do not create placeholder services, stub APIs, mock data structures, or example configurations that are not derived from the LLD, HLD, or API Spec. Every artefact must trace to a documented decision.
3. **Architecture is Locked for MVP.** The five ECS Fargate services (SIS, DFS, IMS, RE, SUP), two Lambda functions (PPS, ARS), DynamoDB as the sole operational store, and the Kinesis → EventBridge + SQS messaging topology are **final**. Do not propose or introduce alternative patterns without an ADR change request and architect sign-off.
4. **Phase 2 Items Stay in Phase 2.** The following are explicitly deferred and must NOT appear in any MVP code or IaC: SageMaker Pipelines, Feature Store, Model Registry, MSK/Kafka, Module Federation, RDS PostgreSQL, Avro schema registry, AWS Glue, Athena, Kinesis Firehose, GraphQL, Amazon Managed Grafana, SageMaker real-time inference endpoints, full EDI (AS2/SFTP).
5. **Hexagonal Architecture is Mandatory for Five ECS Services.** Never import infrastructure classes into the domain package. ArchUnit rules enforce this at compile time — do not bypass them.
6. **IaC Only — No Console.** Every AWS resource is provisioned via AWS CDK (TypeScript). No manual console operations. No Terraform, no CloudFormation YAML — CDK is the agreed IaC toolchain.
7. **Contract-First API.** Never write a REST controller or API client before the OpenAPI spec for that endpoint has been defined and lint-checked. The spec is the source of truth. Generated stubs flow from the spec.
8. **Structured Logging is Mandatory.** All log lines must be JSON objects conforming to the structured log contract in §9.1 of the LLD. No unstructured `System.out.println` or bare string logging.
9. **DLQ on Every Queue.** Every SQS queue provisioned must have a DLQ attached. `maxReceiveCount` as per the LLD §5.3 DLQ configuration table. CloudWatch alarm on DLQ depth is mandatory.
10. **When In Doubt — Ask.** Do not proceed speculatively on ambiguous requirements. Pause and raise a clarifying question. This is more valuable than fast but incorrect output.

---

## 1. Detailed Requirements

### 1.1 Business Problem

Modern retail enterprises operating across multiple Distribution Centres (DCs) and a large SKU catalogue are adversely impacted by poor inventory decisions. Overstock ties up working capital; stockouts erode revenue and customer loyalty. Legacy batch-driven replenishment and siloed supplier workflows cannot respond to the pace of demand signal change driven by promotions, seasonality, and pricing events.

**SmartRetail** is a unified, event-driven platform that replaces fragmented supply chain tooling with real-time demand sensing, ML-based forecasting, automated replenishment, and supplier collaboration — all on a single AWS-native architecture.

### 1.2 Functional Requirements

| ID | Requirement | Implementing Service | Priority |
|----|-------------|----------------------|----------|
| FR-01 | Ingest real-time POS and e-commerce sales events. Validate schema, deduplicate, and persist. | SIS (Sales Ingestion Service) | Must Have |
| FR-02 | Generate ML-based demand forecasts at SKU × DC granularity on a daily scheduled batch run. | DFS (Demand Forecasting Service) | Must Have |
| FR-03 | Maintain real-time inventory positions per SKU × DC. Compute safety stock thresholds. Raise low-stock and overstock alerts. | IMS (Inventory Management Service) | Must Have |
| FR-04 | Auto-generate Purchase Orders on low-stock alerts. Support auto-approval below a value threshold and manual planner approval above it. Manage the full PO lifecycle via a saga. | RE (Replenishment Engine) | Must Have |
| FR-05 | Expose a REST API portal for suppliers to view POs, acknowledge orders, update shipment status, and raise fulfilment exceptions. | SUP (Supplier Integration Service) | Must Have |
| FR-06 | Consume promotion activation events from an external Campaign Management System. Compute demand uplift using a price elasticity formula. Publish a forecast adjustment signal to DFS. | PPS (Pricing & Promotions Service — Lambda) | Must Have |
| FR-07 | Expose aggregated KPI dashboard REST APIs consumed by the React SPA. Four views: Inventory, Forecasting, Replenishment, Supplier. | ARS (Analytics & Reporting Service — Lambda) | Must Have |
| FR-08 | Single React 18 SPA with four route-based views for Supply Chain Planners, Buyers, Inventory Managers, and Supplier Portal users. | React SPA | Must Have |

### 1.3 Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| **Availability** | Platform uptime across all ECS services | ≥ 99.9% |
| **Latency — API** | p99 response time for dashboard reads (ARS) | ≤ 500 ms |
| **Latency — Ingestion** | End-to-end POS event from Kinesis to DynamoDB | ≤ 2 seconds |
| **Throughput** | Peak POS event ingestion volume | To be confirmed via load test; Kinesis shard count is a CDK context parameter |
| **Forecasting SLA** | Daily forecast run completes within the business planning day | Before 06:00 local business time |
| **Recovery** | RTO / RPO | RTO ≤ 1 hour / RPO ≤ 15 minutes (DynamoDB PITR) |
| **Security** | Authentication for all API paths | Cognito JWT. Separate User Pools: Internal users and Supplier users |
| **Security** | PII handling | Supplier contact PII (email, phone) encrypted at application layer using AWS KMS before DynamoDB write |
| **Security** | Network | All ECS tasks and Lambda functions in private VPC subnets. No public egress except via NAT Gateway |
| **Compliance** | SOC2 controls | PII encryption, VPC isolation, CloudTrail enabled, IAM least-privilege task roles |
| **Scalability** | Handle peak seasonal loads without degradation | ECS Fargate auto-scaling, DynamoDB on-demand mode, Kinesis shard-based parallelism |
| **Observability** | Full distributed tracing across all service hops | X-Ray trace propagation mandatory on all inter-service calls and event consumers |
| **Cost** | Compute model for thin services | Lambda for PPS and ARS — no idle ECS containers |
| **Supplier Portal** | Low-bandwidth connectivity support | React route-level code splitting, CloudFront edge caching, API response pagination |

### 1.4 User Personas

| Persona | Role | Primary SPA Views |
|---------|------|-------------------|
| Supply Chain Planner | Reviews forecasts, approves POs above auto-approval threshold, manages exceptions | Forecasting, Replenishment |
| Inventory Manager | Monitors real-time stock positions, low-stock alerts, safety stock levels | Inventory |
| Buyer | Reviews demand signals and overstock alerts, initiates manual replenishment | Inventory, Replenishment |
| Supplier User | Views POs assigned to their account, acknowledges, updates shipment status, raises exceptions | Supplier Portal |

### 1.5 Confirmed Constraints

**Technical:**
- AWS cloud only. No multi-cloud or on-premise.
- SageMaker real-time inference endpoints excluded. Batch Transform only.
- DynamoDB is the sole operational data store for MVP.
- Backend: Java 17 / Spring Boot 3.x for ECS services. Python 3.11 for ML scripts.
- Frontend: React 18 / TypeScript / Tailwind CSS.
- IaC: AWS CDK (TypeScript) only.

**Business:**
- SOC2 compliance — explicit PII controls required.
- Supplier portal must support Tier 2/3 suppliers on low-bandwidth connections.
- Full EDI (AS2/SFTP) is Phase 2. MVP provides a stub EDI adapter.

**Operational:**
- No downtime windows during peak season. Blue-green or canary deployments mandatory in production.
- On-call rotation required before production go-live (pre-condition, not MVP deliverable).
- Specific SKU counts and DC counts are NOT assumed in design — Kinesis shard counts and DynamoDB capacity are CDK context parameters confirmed by load testing.

---

## 2. Detailed Design Decisions

All design decisions are captured as Architecture Decision Records (ADRs). The full ADR set lives in `SmartRetail_HLD_v2_revised.docx`. The most critical decisions and their direct coding implications are summarised below.

### ADR-001 — Event-Driven Microservices with DDD Bounded Contexts
**Decision:** Seven services across seven bounded contexts. EventBridge + SQS fan-out for inter-service domain events. Synchronous REST APIs for query operations only.
**Coding Implication:** Services NEVER share a database. Services NEVER call each other's internal APIs for write operations. All state-changing inter-service communication is via EventBridge events.

### ADR-002 — ECS Fargate for Core Services, Lambda for Thin Services
**Decision:** SIS, DFS, IMS, RE, SUP → ECS Fargate. PPS, ARS → AWS Lambda.
**Coding Implication:** PPS and ARS have no Spring Boot, no hexagonal architecture, no ECS task definition. They are single handler classes. Do not add Spring context to these two.

### ADR-003 — Kinesis + EventBridge + SQS + Step Functions
**Decision:** Kinesis Data Streams for POS/e-commerce ingestion. EventBridge (smartretail-events custom bus) + SQS for inter-service events. Step Functions for the replenishment saga only.
**Coding Implication:** No direct queue-to-queue calls. All inter-service events route through EventBridge rules → SQS queues per subscriber. Step Functions state machine is the sole orchestrator for the replenishment PO lifecycle.

### ADR-004 — DynamoDB as Sole Operational Store
**Decision:** DynamoDB on-demand mode. All access patterns are key-based. No joins. No RDS.
**Coding Implication:** Every DynamoDB access pattern must be defined in the LLD table design before implementing a repository. Introduce a GSI only when a documented access pattern requires it. Do not add ad-hoc scans.

### ADR-005 — Simplified ML Pipeline (SageMaker Training Job + Batch Transform)
**Decision:** No SageMaker Pipelines, Feature Store, or Model Registry at MVP. Model artifact versioned in S3. Active model path stored in Parameter Store (`/smartretail/ml/active-model-path`).
**Coding Implication:** DFS triggers a Training Job via the SageMaker Java SDK. Post-training Lambda computes MAPE and writes to CloudWatch. Batch Transform is triggered by EventBridge Scheduler. Post-processor Lambda reads S3 output and writes forecasts to DynamoDB.

### ADR-006 — Single React SPA (No Module Federation)
**Decision:** One SPA, four route-based views, single CloudFront distribution + S3 bucket.
**Coding Implication:** No webpack module federation config. No remote/host shell architecture. All four views are route components within one React project. React Router 6 for client-side routing.

### ADR-007 — AWS-Native Observability (CloudWatch + X-Ray)
**Decision:** No Amazon Managed Grafana, no third-party APM. CloudWatch Logs, Container Insights, X-Ray.
**Coding Implication:** OpenTelemetry Java agent injected via `JAVA_TOOL_OPTIONS` in ECS task definition. No per-service instrumentation code. W3C Trace Context propagation on all outbound HTTP calls and SQS message attributes.

### ADR-008 — Hexagonal Architecture for Five ECS Services
**Decision:** Strict ports and adapters separation. Domain core has zero infrastructure dependencies.
**Coding Implication:** Domain package (`com.smartretail.{svc}.domain`) must contain only pure Java — no Spring annotations, no AWS SDK imports. ArchUnit rules enforced in CI. Adapters live in `infrastructure/adapter/`. Application services in `application/service/`.

### ADR-009 — CDK TypeScript for All IaC
**Decision:** AWS CDK (TypeScript). No manual console provisioning. CDK diff as PR quality gate.
**Coding Implication:** Every AWS resource (VPC, ECS cluster, task definitions, DynamoDB tables, Kinesis streams, SQS queues, EventBridge rules, API Gateway stages, Lambda functions, SageMaker resources) is defined in a CDK stack. No CloudFormation YAML hand-edits.

### ADR-010 — Contract-First OpenAPI APIs
**Decision:** OpenAPI spec is drafted before any controller code. Spring Boot controller interfaces generated from the spec. TypeScript Axios client generated from the spec for the React SPA.
**Coding Implication:** The workflow is: spec → Spectral lint → Redocly validation → OpenAPI Generator → implementation. Never the reverse. API changes start with a spec change, not a code change.

---

## 3. Target Architecture

### 3.1 Platform Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        AWS us-east-1 Region                              │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Public Subnet (per AZ)                                             │ │
│  │  ┌──────────────────┐    ┌──────────────────────────────────────┐  │ │
│  │  │  Application LB   │    │   CloudFront Distribution             │  │ │
│  │  │  (API Gateway    │    │   → S3 (React SPA static assets)      │  │ │
│  │  │   backed)        │    └──────────────────────────────────────┘  │ │
│  │  └──────────────────┘                                              │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Private Subnet (per AZ) — ECS Fargate Services                    │ │
│  │                                                                     │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐               │ │
│  │  │  SIS │  │  DFS │  │  IMS │  │  RE  │  │  SUP │               │ │
│  │  │ECS   │  │ECS   │  │ECS   │  │ECS   │  │ECS   │               │ │
│  │  │Fargate│  │Fargate│  │Fargate│  │Fargate│  │Fargate│               │ │
│  │  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘               │ │
│  │                                                                     │ │
│  │  ┌─────────────────────┐  ┌──────────────────────┐                │ │
│  │  │  PPS — Lambda       │  │  ARS — Lambda        │                │ │
│  │  │  (EventBridge rule) │  │  (API Gateway proxy) │                │ │
│  │  └─────────────────────┘  └──────────────────────┘                │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Messaging Layer                                                    │ │
│  │  Kinesis Data Streams → Lambda Consumer → EventBridge (custom bus) │ │
│  │  EventBridge Rules → SQS Queues (Standard + FIFO) → ECS/Lambda    │ │
│  │  Step Functions (Replenishment Saga only)                          │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Data & ML Layer                                                   │ │
│  │  DynamoDB (on-demand, multi-AZ, PITR enabled)                     │ │
│  │  S3 (raw events, ML training data, model artefacts, forecasts)    │ │
│  │  SageMaker Training Job + Batch Transform (daily schedule)        │ │
│  │  Parameter Store (active model path, config)                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Security Layer                                                    │ │
│  │  Cognito (Internal User Pool + Supplier User Pool)                │ │
│  │  API Gateway (JWT authoriser per pool)                            │ │
│  │  IAM Task Roles (per ECS service, per Lambda function)            │ │
│  │  KMS (PII encryption for supplier contact data)                   │ │
│  │  VPC Endpoints (DynamoDB, S3, SSM, SageMaker — no public egress) │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Observability Layer                                               │ │
│  │  CloudWatch Logs (structured JSON) + Metrics + Alarms             │ │
│  │  ECS Container Insights                                           │ │
│  │  AWS X-Ray (distributed tracing, W3C Trace Context)              │ │
│  │  CloudTrail (audit)                                               │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Service Inventory

| Service | Runtime | Pattern | Inbound | Outbound |
|---------|---------|---------|---------|---------|
| **SIS** — Sales Ingestion | ECS Fargate / Java 17 / Spring Boot 3.x | Hexagonal | Kinesis Data Streams (Lambda consumer) | DynamoDB, S3, EventBridge |
| **DFS** — Demand Forecasting | ECS Fargate / Java 17 + Python 3.11 scripts | Hexagonal | SQS (dfs-sales-events-queue, dfs-adjustment-queue), EventBridge Scheduler | SageMaker, DynamoDB, S3, EventBridge, Parameter Store |
| **IMS** — Inventory Management | ECS Fargate / Java 17 / Spring Boot 3.x | Hexagonal | SQS (ims-sales-events-queue, ims-forecast-updated-queue, ims-shipment-queue) | DynamoDB, EventBridge |
| **RE** — Replenishment Engine | ECS Fargate / Java 17 / Spring Boot 3.x | Hexagonal | SQS FIFO (re-alert-queue, re-confirmation-queue), API Gateway (manual approval callback) | Step Functions, DynamoDB, EventBridge |
| **SUP** — Supplier Integration | ECS Fargate / Java 17 / Spring Boot 3.x | Lightweight Hexagonal | API Gateway (supplier REST), SQS (sup-po-dispatched-queue) | DynamoDB, EventBridge, EDI Stub Port |
| **PPS** — Pricing & Promotions | Lambda / Java 17 or Python 3.11 | Single Handler | EventBridge (PromotionActivated) | EventBridge (ForecastAdjustmentPublished), DynamoDB (read) |
| **ARS** — Analytics & Reporting | Lambda / Java 17 or Python 3.11 | Single Handler | API Gateway | DynamoDB GSI reads |

### 3.3 DynamoDB Table Inventory

All tables are defined in LLD §4. The table names below must be used exactly in CDK and all service code.

| Table Name | Partition Key | Sort Key | GSIs | Owner Service | TTL |
|------------|--------------|----------|------|--------------|-----|
| `sales-events` | `transactionId` (S) | — | `GSI-SKU-DC-Date`: PK=`skuId`, SK=`dcId#eventDate` | SIS | None |
| `idempotency-keys` | `eventId` (S) | — | None | SIS | 48 hours |
| `inventory-positions` | `skuId` (S) | `dcId` (S) | `GSI-DC-Alerts`: PK=`dcId`, SK=`alertStatus` | IMS | None |
| `forecasts` | `skuId` (S) | `dcId#forecastDate` (S) | `GSI-DC-ForecastDate`: PK=`dcId`, SK=`forecastDate` | DFS | None |
| `purchase-orders` | `poId` (S) | — | `GSI-Supplier-Status`: PK=`supplierId`, SK=`status#createdAt`; `GSI-SKU-DC`: PK=`skuId`, SK=`dcId#createdAt` | RE | None |
| `supplier-pos` | `supplierId` (S) | `poId` (S) | `GSI-PO-Status`: PK=`poId`, SK=`status` | SUP | None |
| `elasticity-reference` | `skuId` (S) | `category` (S) | None | PPS (read) | None |

### 3.4 EventBridge Event Topology

Bus Name: `smartretail-events`

| Event | Producer | Subscriber Queues | Queue Type |
|-------|----------|-------------------|-----------|
| `SalesTransactionRecorded` | SIS | `dfs-sales-events-queue`, `ims-sales-events-queue`, `ars-sales-events-queue` | Standard |
| `ForecastUpdated` | DFS | `ims-forecast-updated-queue`, `ars-forecast-updated-queue` | Standard |
| `LowStockAlertRaised` | IMS | `re-alert-queue`, `ars-alert-queue` | FIFO (RE), Standard (ARS) |
| `OverstockAlert` | IMS | `ars-overstock-queue` | Standard |
| `PODispatched` | RE | `sup-po-dispatched-queue` | Standard |
| `ShipmentUpdated` | SUP | `ims-shipment-queue`, `ars-shipment-queue` | Standard |
| `OrderConfirmed` | SUP | `re-confirmation-queue` | FIFO |
| `ForecastAdjustmentPublished` | PPS | `dfs-adjustment-queue` | Standard |
| `PromotionActivated` | External (Campaign Mgmt) | PPS Lambda (direct rule → Lambda) | — |

### 3.5 Domain Event Envelope Schema

All events published to EventBridge follow this envelope. This schema is mandatory — do not deviate.

```json
{
  "eventId": "uuid-v4",
  "eventType": "SalesTransactionRecorded",
  "source": "sis",
  "version": "1.0",
  "timestamp": "2026-04-23T10:00:00Z",
  "correlationId": "uuid-v4",
  "traceId": "w3c-trace-context-value",
  "detail": { }
}
```

### 3.6 ML Pipeline Flow

```
EventBridge Scheduler (daily)
  → DFS Lambda Trigger
    → SageMaker Training Job (DeepAR algorithm, Python 3.11 script, S3 input)
      → Training Complete → MAPE computed → CloudWatch metric published
        → Parameter Store updated (/smartretail/ml/active-model-path)
          → SageMaker Batch Transform (S3 input: SKU×DC matrix, S3 output: forecasts JSON)
            → Post-processor Lambda (reads S3 output)
              → DynamoDB write (forecasts table)
                → EventBridge publish (ForecastUpdated)
```

### 3.7 Replenishment Saga (Step Functions)

States: `DRAFT` → `PENDING_APPROVAL` (if totalValue > threshold) or `APPROVED` (if ≤ threshold) → `APPROVED` → `DISPATCHED` → `CONFIRMED`.
Compensation path: `FAILED` → saga logs failure, raises L1 CloudWatch alarm, halts (manual re-trigger by planner).
Manual approval: Step Functions Wait state + task token callback via `POST /v1/replenishment/orders/{poId}/approve`.

---

## 4. Golden Thread Slice — 2-Week POC

The Golden Thread is the thinnest vertical slice that proves the core event-driven value proposition end-to-end and leaves a working, deployable foundation for the rest of Sprint 2. It is not a demo — it is production-quality code on the critical path.

### 4.1 Scope of the Golden Thread

**The thread covers:**
`POS Event → Kinesis → SIS (ingest, validate, persist) → EventBridge → IMS (inventory update, alert check) → ARS (dashboard read) → React SPA (Inventory view)`

This demonstrates:
- Real-time event ingestion with idempotency and schema validation
- Domain event propagation via EventBridge + SQS
- Inventory position update from a sales event
- A live dashboard read via the ARS Lambda
- React SPA authenticated via Cognito reading a live API

**Explicitly excluded from the Golden Thread (deferred to remainder of Sprint 2):**
- DFS (ML pipeline — no SageMaker Training Job in week 1)
- RE (Step Functions saga)
- SUP (Supplier portal)
- PPS (Promotion events)

### 4.2 Week 1 — Infrastructure & Ingestion

| Day | Task | Owner | Output |
|-----|------|-------|--------|
| 1 | CDK: VPC, private subnets, NAT Gateway, VPC endpoints (DynamoDB, S3, SSM) | DevOps / Arch | CDK VPC stack deployed to dev account |
| 1 | CDK: ECS Cluster, ECR repositories for SIS and IMS | DevOps | CDK ECS stack deployed |
| 1 | CDK: DynamoDB tables — `sales-events`, `idempotency-keys`, `inventory-positions` | DevOps | Tables created via CDK |
| 2 | CDK: Kinesis Data Stream (`smartretail-pos-stream`, 1 shard for dev), SQS queues with DLQs (`ims-sales-events-queue`, `ars-sales-events-queue`), EventBridge custom bus (`smartretail-events`) and rules | DevOps | CDK Messaging stack deployed |
| 2 | CDK: Cognito User Pool (Internal), API Gateway with JWT authoriser | DevOps | Auth stack deployed |
| 3–4 | SIS: Domain model (`SalesTransaction`, `IdempotencyRecord`), Ports (Inbound: `KinesisEventPort`; Outbound: `SalesEventRepositoryPort`, `EventPublisherPort`, `RawEventStorePort`), Kinesis Lambda consumer adapter, DynamoDB outbound adapter, EventBridge outbound adapter, S3 outbound adapter | Backend | SIS service with unit tests (domain layer, 100% coverage) |
| 4 | SIS: Spring Boot application service, structured logging, X-Ray instrumentation, CloudWatch metrics (`RecordsProcessed`, `DuplicatesRejected`) | Backend | SIS integration test passing against LocalStack |
| 5 | SIS: Dockerfile, ECS task definition (CDK), IAM task role, Container Insights enabled. Deploy SIS to dev ECS cluster. | DevOps | SIS running in ECS, health check passing |

### 4.3 Week 2 — Inventory, Analytics & SPA

| Day | Task | Owner | Output |
|-----|------|-------|--------|
| 6–7 | IMS: Domain model (`InventoryPosition`, safety stock rule), Ports (SQS inbound, DynamoDB outbound, EventBridge outbound for `LowStockAlertRaised`), Application service (consume `SalesTransactionRecorded`, update position, evaluate reorder point), DynamoDB adapter | Backend | IMS domain unit tests 100%, integration tests against LocalStack |
| 7 | IMS: Dockerfile, ECS task definition, IAM role, deploy to dev. | DevOps | IMS running in ECS, consuming from SQS |
| 8 | ARS: Lambda function. API: `GET /v1/dashboard/inventory`. Reads `inventory-positions` table via GSI. Returns paginated JSON. OpenAPI spec for this endpoint defined first. API Gateway route connected to Lambda. | Backend | ARS Lambda deployed, curl test against API Gateway passes |
| 8 | CDK: CloudWatch alarms — DLQ depth alerts (L2) for `ims-sales-events-dlq` and `ars-sales-events-dlq` | DevOps | Alarms visible in CloudWatch |
| 9 | React SPA: Project scaffold (Vite + React 18 + TypeScript + Tailwind), React Router 6, Cognito auth hook (AWS Amplify Auth), Axios API client (generated from ARS OpenAPI spec), Inventory view wired to `GET /v1/dashboard/inventory`, Recharts for stock level chart | Frontend | SPA builds and renders live inventory data from dev environment |
| 9 | End-to-end test: POST a synthetic POS event to Kinesis → confirm SIS persists → confirm IMS updates position → confirm ARS returns updated data → confirm React SPA reflects the update | QA / Backend | E2E test documented with screenshots |
| 10 | Performance baseline: k6 load test against Kinesis → SIS path. Establish p99 latency baseline. Document in ADR supplement. | QA | k6 test results recorded |
| 10 | Code quality: SonarQube or Checkstyle + SpotBugs pass. ArchUnit hexagonal layer tests pass. Test coverage report generated. | Backend | Quality gate green |

### 4.4 Golden Thread — Explicit Acceptance Criteria

The Golden Thread POC is accepted when ALL of the following are verified:

- [ ] A synthetic POS event published to Kinesis appears as a `SalesTransaction` record in DynamoDB `sales-events` table within 2 seconds
- [ ] A duplicate event (same `transactionId`) is rejected by the idempotency check — no duplicate row in DynamoDB
- [ ] An invalid event (missing required field) is routed to the SIS DLQ — not persisted
- [ ] `SalesTransactionRecorded` event appears on EventBridge and is delivered to `ims-sales-events-queue` and `ars-sales-events-queue`
- [ ] IMS consumes the SQS message and updates the `inventory-positions` table
- [ ] `GET /v1/dashboard/inventory` returns HTTP 200 with the updated inventory position
- [ ] The React SPA Inventory view renders the live data returned by ARS
- [ ] All service logs are valid JSON conforming to the structured log contract
- [ ] X-Ray traces show the full distributed path from Kinesis → SIS → EventBridge → IMS
- [ ] DLQ CloudWatch alarms exist for all queues provisioned in the golden thread scope
- [ ] CDK diff on the golden thread stacks produces zero unintended drift
- [ ] ArchUnit hexagonal layer tests pass for SIS and IMS
- [ ] Domain unit test coverage ≥ 80% for SIS and IMS domain packages

---

## 5. Architecture Best Practices

### 5.1 Domain-Driven Design

- Bounded contexts are the unit of service autonomy. A service owns its data model and its domain events. Nothing crosses the boundary except well-defined event contracts.
- Aggregate roots are the only entry points into a bounded context's domain model. Repositories accept and return aggregate roots.
- Value objects are immutable. Entities have identity. Do not confuse the two.
- Domain events represent facts that have happened. Name them in past tense (`SalesTransactionRecorded`, not `RecordSalesTransaction`).

### 5.2 Hexagonal Architecture (Ports & Adapters)

```
Domain Core (Pure Java — zero AWS SDK, zero Spring)
  ↓ implements
Application Service (Spring @Service, orchestrates domain, invokes ports)
  ↓ depends on interfaces
Port Interfaces (in domain/port/inbound and domain/port/outbound)
  ↑ implemented by
Infrastructure Adapters (in infrastructure/adapter/inbound and outbound)
  — can import AWS SDK, Spring annotations, DynamoDB Enhanced Client, etc.
```

**Package structure for all five ECS services:**
```
com.smartretail.{svc}/
  domain/
    model/          ← Aggregates, Entities, Value Objects
    port/
      inbound/      ← Primary port interfaces
      outbound/     ← Secondary port interfaces
    exception/      ← Domain exceptions (pure Java)
  application/
    service/        ← Application services (@Service)
    dto/            ← Command/Query objects (no domain leakage outward)
  infrastructure/
    adapter/
      inbound/      ← REST controllers, Kinesis/SQS consumers
      outbound/     ← DynamoDB, EventBridge, S3, SageMaker adapters
    config/         ← Spring @Configuration, @Bean, CDK-derived @Value properties
```

### 5.3 Resilience Patterns

- **Circuit Breaker (Resilience4j):** Mandatory on all outbound adapter calls — DynamoDB, EventBridge, SageMaker, inter-service REST. Configuration in `common-resilience` shared library. Thresholds: failure rate ≥ 50% → OPEN. Wait duration: 30 seconds.
- **Retry:** Exponential backoff with jitter. Max 3 retries on transient failures. DLQ handles exhausted retries for async paths.
- **Bulkhead:** Separate thread pools for DynamoDB calls and EventBridge calls within the same service to prevent resource saturation cascades.
- **Timeout:** Every outbound adapter call has an explicit timeout configured. No unbounded waits. Defaults in `common-resilience`: DynamoDB 2s, EventBridge 3s, SageMaker 60s, inter-service REST 5s.
- **Graceful Degradation:** Dashboard views display cached data (last-known-good from DynamoDB) when the originating service is unavailable. Never a blank screen.

### 5.4 Security

- **Cognito JWT validation** occurs at API Gateway — not in the ECS service. ECS services receive pre-validated JWT claims in request headers set by API Gateway.
- **IAM task roles** are scoped to the minimum permissions required by each service. No wildcard resource policies. No `*` actions.
- **PII encryption:** Supplier `email` and `phone` fields are encrypted using the AWS KMS Java SDK before the DynamoDB `PutItem` call. Decryption occurs only in the SUP service and only on authenticated reads by a Supplier User Pool token.
- **No secrets in environment variables.** Credentials, API keys, and connection strings are fetched from AWS Secrets Manager at startup. CDK provisions the secret reference; the service fetches at cold start.
- **VPC-first:** All ECS tasks, Lambda functions, and SageMaker jobs run in private subnets. VPC endpoints for DynamoDB, S3, SSM, Secrets Manager, and EventBridge eliminate the need for internet egress for these services.

### 5.5 Cost Efficiency

- DynamoDB on-demand mode: no idle capacity cost. Switch to provisioned + auto-scaling after 6 months of production traffic data.
- SageMaker Batch Transform: no always-on inference endpoint. Training Job runs once daily. Endpoint cost: zero at rest.
- Lambda for PPS and ARS: zero idle container cost. Pay per invocation.
- ECS Fargate minimum task count: 1 per service in dev, 2 per service in staging/prod (multi-AZ). Scale-to-zero is not appropriate for ingestion services.
- EventBridge Scheduler (not CloudWatch Events): lower cost for scheduled rules.
- CloudFront caching: SPA static assets cached at edge. API responses for dashboard views: Cache-Control max-age=60s to reduce ARS Lambda invocations.

---

## 6. Coding Best Practices

### 6.1 Java / Spring Boot

- **Java 17.** Use records for immutable value objects and DTOs. Use sealed classes where state machines are modelled in Java (e.g., PO status transitions). Use text blocks for multi-line strings in tests.
- **Spring Boot 3.x.** Use `@ConfigurationProperties` (not `@Value` scattered across classes) for externalised configuration. Group config by adapter.
- **No `@Autowired` on fields.** Constructor injection only. Immutable dependencies.
- **No checked exceptions** crossing package boundaries. Translate infrastructure exceptions to domain exceptions at the adapter boundary.
- **No `Optional.get()` without `.isPresent()` check.** Use `.orElseThrow()` with a meaningful domain exception.
- **Lombok is permitted** for `@Builder`, `@Slf4j`, `@RequiredArgsConstructor` only. No `@Data` on domain entities (breaks equals/hashCode contract).
- **DynamoDB Enhanced Client** (not low-level DynamoDB client) for all DynamoDB operations in Java services.
- **Spring Modulith** is NOT used — hexagonal architecture enforces modularity via package conventions and ArchUnit.

### 6.2 Python (ML Scripts)

- Python 3.11 in a `pyproject.toml`-managed project (Poetry or pip-tools). No `requirements.txt` without version pinning.
- Type hints mandatory. `mypy` strict mode in CI.
- ML feature preparation script is a standalone executable: reads from S3, writes to S3, no external service calls.
- No Jupyter notebooks in production pipeline. Notebooks are for exploration only and live in a `/notebooks` directory excluded from CI.

### 6.3 TypeScript / React (SPA)

- React 18 with TypeScript strict mode (`strict: true` in tsconfig).
- Functional components only. No class components.
- **No `any` type.** ESLint rule `@typescript-eslint/no-explicit-any` set to `error`.
- API client is generated from the OpenAPI spec via OpenAPI Generator — do not hand-write API calls.
- Tailwind CSS for styling. No inline styles. No CSS-in-JS.
- Recharts for all data visualisation.
- React Query (TanStack Query) for server state management — no raw `useEffect` for data fetching.
- Route-level code splitting via `React.lazy()` + `Suspense` — mandatory for all four route-level view components.
- Cognito auth via AWS Amplify Auth v6. No custom auth flows.

### 6.4 Testing Standards

| Layer | Tool | Coverage Target | Runs In |
|-------|------|-----------------|---------|
| Domain unit tests (Java) | JUnit 5 + AssertJ + Mockito | ≥ 80% line coverage | Local + CI |
| Domain unit tests (Python) | pytest | ≥ 80% line coverage | Local + CI |
| Hexagonal layer enforcement | ArchUnit | N/A — binary pass/fail | CI |
| Integration tests (Java) | Spring Boot Test + Testcontainers (DynamoDB Local, LocalStack) | Key flows covered | CI |
| Contract tests | Pact (Consumer-Driven) | All published contracts pass | CI |
| API spec conformance | Dredd | All documented endpoints | CI (staging) |
| Load test | k6 | NFR latency targets met | CI (staging) |
| Frontend unit tests | Vitest + React Testing Library | ≥ 70% component coverage | CI |
| E2E | Playwright | Golden thread happy path + auth flow | CI (staging) |

### 6.5 Structured Logging Contract

Every log line emitted by every service (ECS and Lambda) must be a valid JSON object with these mandatory fields:

```json
{
  "timestamp": "ISO-8601",
  "level": "INFO | WARN | ERROR | DEBUG",
  "service": "sis | dfs | ims | re | sup | pps | ars",
  "traceId": "w3c-trace-context",
  "spanId": "span-id",
  "correlationId": "uuid",
  "message": "human-readable string",
  "context": { }
}
```

**Do NOT log:** PII fields (supplier email, phone). Raw JWT tokens. AWS account IDs. Kinesis shard iterator values. DynamoDB item content at DEBUG level in production.

### 6.6 CDK Conventions

- One CDK app per environment (`dev`, `staging`, `prod`). Context parameters in `cdk.context.json` — not hardcoded.
- Stack separation: `NetworkStack` → `DataStack` → `MessagingStack` → `AuthStack` → `ComputeStack` → `ObservabilityStack`. Stacks pass outputs via `Stack.exportValue()`.
- No `cdk.Fn.importValue()` for cross-stack references — use direct stack references within the same CDK app.
- All removable resources (DynamoDB tables, S3 buckets) use `RemovalPolicy.RETAIN` in prod, `RemovalPolicy.DESTROY` in dev.
- CDK Nag (`cdk-nag`) runs on all stacks in CI. `AwsSolutionsChecks` ruleset. All suppressions must have a documented justification.
- Tag all resources: `Project=SmartRetail`, `Environment={env}`, `Owner=suplab.debnath@cognizant.com`, `CostCentre=confirmed-before-prod`.

### 6.7 CI/CD Pipeline (CodePipeline)

```
Source (CodeCommit / GitHub)
  → Build (CodeBuild — mvn test, npm test, cdk synth, cdk-nag)
  → CDK Diff (PR quality gate — no merge if unexpected diff)
  → Deploy Dev (CDK deploy)
  → Integration Tests (LocalStack + Testcontainers in CodeBuild)
  → Deploy Staging (CDK deploy)
  → k6 Load Test
  → Dredd API conformance
  → Pact contract verification
  → Lighthouse CI (SPA performance budget)
  → Manual Approval Gate (for prod promotions)
  → Deploy Prod (Blue-Green via CodeDeploy for ECS services)
```

---

## 7. Guardrails Summary

This section is the quick-reference enforcement list. Every code generation or artefact creation must pass all checks before output is considered complete.

### 7.1 Architecture Guardrails

| # | Rule | Violation Action |
|---|------|-----------------|
| AG-01 | No RDS, no PostgreSQL, no relational joins anywhere in MVP | Reject and raise to architect |
| AG-02 | No MSK/Kafka | Reject and raise to architect |
| AG-03 | No SageMaker real-time endpoints | Reject and raise to architect |
| AG-04 | No Module Federation | Reject and raise to architect |
| AG-05 | No GraphQL | Reject and raise to architect |
| AG-06 | No AWS Glue, no Athena, no Kinesis Firehose | Reject and raise to architect |
| AG-07 | No Amazon Managed Grafana, no third-party APM | Reject and raise to architect |
| AG-08 | PPS and ARS must NOT use ECS Fargate, Spring Boot, or hexagonal architecture | Reject and rewrite as Lambda handlers |
| AG-09 | No shared database tables across service boundaries | Reject and raise to architect |
| AG-10 | All five ECS services must implement hexagonal architecture | Reject any code that violates layer separation |

### 7.2 Code Guardrails

| # | Rule | Violation Action |
|---|------|-----------------|
| CG-01 | No infrastructure imports in domain package | ArchUnit will fail CI — fix before committing |
| CG-02 | No unstructured log lines | Rewrite as structured JSON log |
| CG-03 | No hardcoded AWS account IDs, ARNs, or region strings in application code | Use CDK context / environment variables |
| CG-04 | No secrets in environment variables or source code | Use Secrets Manager — fix before committing |
| CG-05 | No `any` TypeScript type in SPA code | ESLint will fail CI — fix before committing |
| CG-06 | No hand-written API client in the SPA | Generate from OpenAPI spec — reject and regenerate |
| CG-07 | No direct DynamoDB scan operations in hot paths | Use GSI — raise to architect if GSI is missing |
| CG-08 | No SQS queue without a DLQ | Add DLQ in CDK before deploying |
| CG-09 | No CloudWatch alarm missing from DLQ | Add alarm in CDK before deploying |
| CG-10 | No console.log in React components | Use a structured logger utility — ESLint will flag |

### 7.3 Process Guardrails

| # | Rule |
|---|------|
| PG-01 | No OpenAPI spec change without Spectral lint passing |
| PG-02 | No merge to main without CDK diff review in PR |
| PG-03 | No production deploy without manual approval gate |
| PG-04 | No cdk-nag suppression without documented justification comment in CDK code |
| PG-05 | No new Phase 2 capability introduced in Sprint 2 without a formal ADR change request |
| PG-06 | All Kinesis shard counts and DynamoDB capacity settings are CDK context parameters — never hardcoded |
| PG-07 | SKU counts and DC counts are NOT assumed — confirm with business before sizing any resource |

---

## 8. Open Questions — Require Business / Stakeholder Input Before Sprint 2 Completion

These items are explicitly unresolved and MUST be confirmed before the corresponding service or resource is built. Do not assume answers.

| # | Question | Blocking | Impact |
|---|----------|---------|--------|
| OQ-01 | What is the target SKU count and DC count? | Kinesis shard sizing, DynamoDB capacity estimation | DevOps / Arch |
| OQ-02 | What is the auto-approval threshold for PO value (£/$ amount)? | RE Step Functions auto-approval condition | Backend (RE) |
| OQ-03 | What is the minimum historical sales data depth available for ML training (months/years)? | DFS Training Job input, DeepAR context window config | ML / DFS |
| OQ-04 | What is the confirmed `forecastHorizon` (days) and `predictionLength` for DeepAR? | SageMaker Training Job hyperparameters | ML / DFS |
| OQ-05 | What is the source format of the external Campaign Management System promotion events — EventBridge event from an existing bus, or a REST webhook? | PPS trigger design | Backend (PPS) |
| OQ-06 | What are the RBAC roles required for Internal User Pool beyond Supply Chain Planner, Inventory Manager, and Buyer? | Cognito User Pool group configuration, Spring Security RBAC annotations | Auth / Backend |
| OQ-07 | What is the AWS account structure — single account with environment namespacing, or separate dev/staging/prod accounts? | CDK app structure, IAM cross-account roles | DevOps / Arch |
| OQ-08 | Is there a confirmed AWS cost ceiling for the MVP environment per month? | Service selection validation, reserved capacity decisions | FinOps / Arch |
| OQ-09 | What supplier data (fields) is required in the initial onboarding flow — what does a Supplier record look like? | SUP DynamoDB schema, SUP portal registration API | Backend (SUP) |
| OQ-10 | What is the agreed safety stock calculation formula — fixed days of supply, or a statistical model (e.g., z-score × σ)? | IMS domain model, safety stock threshold evaluation logic | Domain Expert / Backend (IMS) |

---

## 9. Reference Document Index

| Document | Purpose | Location |
|----------|---------|---------|
| `SmartRetail_PreWork_Assessment_v3.docx` | Problem statement, requirements, technology analysis, comparative decisions, cost modelling | Project Knowledge |
| `SmartRetail_HLD_v2_revised.docx` | Architecture overview, ADRs, service boundaries, cross-cutting concerns, deployment design | Project Knowledge |
| `SmartRetail_LLD_v3.docx` | Component designs, DynamoDB schemas, messaging topology, ML pipeline, flow diagrams, error handling | Project Knowledge |
| `SmartRetail_APISpec_v2.docx` | OpenAPI spec templates, API design principles, contract-first workflow, all endpoint definitions | Project Knowledge |
| `HLD_diagram_doc.md` | Mermaid diagram source files for HLD diagrams | Project Knowledge |
| `pre-work_and_assessment_phase.md` | Sprint-level deliverables for Pre-Work phase | Project Knowledge |
| `sprint_1_architecture_design_and_documentation.md` | Sprint 1 deliverables | Project Knowledge |
| `sprint_2_Implementation.md` | Sprint 2 deliverables | Project Knowledge |
| `smart-retail-case-study.md` | Original problem statement / case study | Project Knowledge |

---

## 10. How Claude Should Behave in This Project

This section is written directly to the AI assistant as operating instructions.

**You are a senior Java Technical Architect with AWS cloud and retail domain expertise. Your output must reflect that seniority.**

1. **Read before you write.** For any task involving a service, table, event, or API endpoint — search the project knowledge first. The answer is almost certainly in the documents. Do not invent.

2. **Confirm the scope.** Before generating code for any service, state which LLD section and which ADR your output corresponds to. This keeps output anchored to decisions already made.

3. **Respect the package structure.** Always use `com.smartretail.{svc}.domain`, `com.smartretail.{svc}.application`, `com.smartretail.{svc}.infrastructure` as the root package hierarchy. Replace `{svc}` with the lowercase service abbreviation: `sis`, `dfs`, `ims`, `re`, `sup`.

4. **Follow the Golden Thread sequence.** In Sprint 2, build in this order: CDK Infrastructure → SIS → IMS → ARS Lambda → React SPA Inventory View → End-to-end validation → then DFS, RE, SUP, PPS. Do not skip ahead.

5. **Generate tests alongside production code.** Never generate a domain class without a corresponding JUnit 5 test class. Never generate a React component without a Vitest test.

6. **Surface open questions.** If you encounter any scenario that maps to an Open Question in §8, or that is genuinely not answered by the project documents, say so explicitly rather than inventing an answer. State: *"This requires confirmation on OQ-[N] before I can proceed accurately."*

7. **Be explicit about Phase 2 deferrals.** If a prompt asks for something that is in the Phase 2 deferral list (SageMaker Pipelines, MSK, Module Federation, etc.), state clearly: *"This is a Phase 2 deferral per ADR-[N]. I will implement the MVP substitute instead, which is [X]."*

8. **Cost-awareness in CDK.** When provisioning AWS resources in CDK, always include the cost implication in a comment. For example: `// DynamoDB on-demand — cost scales with actual request volume. Switch to provisioned after 6 months of production data.`

9. **Never generate console-provisioned resources.** All CDK code must be complete and deployable via `cdk deploy`. No instructions like "now go to the console and manually create X."

10. **Document every non-obvious decision.** Inline comments in generated code must explain WHY a choice was made, not just WHAT the code does. A future engineer reading the code must be able to understand the architectural rationale without opening the HLD.

---

*End of CLAUDE.md — SmartRetail Demand Forecasting & Supply Chain Platform*
*This file should be updated whenever an ADR is revised, an Open Question is resolved, or the Golden Thread scope changes. It is the single source of truth for AI-assisted development in this project.*
