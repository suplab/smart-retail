# SmartRetail — Demand Forecasting & Supply Chain Platform

> **Author:** Suplab Debnath — Solutions Architect → Enterprise Architect (Transitioning), Cognizant
> **Version:** 1.0 | April 2026 | **Classification:** Internal — Confidential

---

## Overview

SmartRetail is an event-driven, AWS-native supply chain platform that replaces fragmented batch-driven replenishment tooling with real-time demand sensing, ML-based forecasting, automated replenishment, and supplier collaboration.

### Service Inventory

| Service | Runtime | Role |
|---------|---------|------|
| **SIS** — Sales Ingestion | ECS Fargate / Java 17 / Spring Boot 3.x | Kinesis consumer — ingest, deduplicate, persist POS events |
| **IMS** — Inventory Management | ECS Fargate / Java 17 / Spring Boot 3.x | Real-time inventory positions, safety stock, low-stock alerts |
| **DFS** — Demand Forecasting | ECS Fargate / Java 17 + Python 3.11 | ML pipeline orchestration (SageMaker Batch) |
| **RE** — Replenishment Engine | ECS Fargate / Java 17 / Spring Boot 3.x | PO generation, Step Functions replenishment saga |
| **SUP** — Supplier Integration | ECS Fargate / Java 17 / Spring Boot 3.x | Supplier REST portal, PII-encrypted contact data |
| **PPS** — Pricing & Promotions | Lambda / Java 17 | Promotion events -> demand uplift -> forecast adjustment |
| **ARS** — Analytics & Reporting | Lambda / Java 17 | KPI dashboard REST APIs |

---

## Repository Structure

```
smart-retail/
├── backend/
│   ├── common/          # Shared: EventEnvelope, StructuredLogger, resilience config
│   ├── sis/             # Sales Ingestion Service (ECS Fargate, hexagonal)
│   ├── ims/             # Inventory Management Service (ECS Fargate, hexagonal)
│   ├── dfs/             # Demand Forecasting Service (ECS Fargate, hexagonal)
│   ├── re/              # Replenishment Engine (ECS Fargate, hexagonal)
│   ├── sup/             # Supplier Integration Service (ECS Fargate, hexagonal)
│   ├── ars/             # Analytics & Reporting Lambda
│   └── pps/             # Pricing & Promotions Lambda
├── frontend/            # React 18 + TypeScript + Vite + Tailwind CSS
├── infra/
│   ├── cdk/             # AWS CDK TypeScript stacks (PRIMARY IaC)
│   └── cloudformation/  # CFN export (generated from CDK synth)
├── devops/
│   ├── buildspecs/      # AWS CodeBuild buildspec YAML files
│   └── pipelines/       # CodePipeline CDK stack
├── docs/
│   ├── openapi/         # OpenAPI spec (source of truth for all APIs)
│   └── architecture-mapping.md
└── scripts/
    ├── localstack-init/ # LocalStack resource provisioning scripts
    └── seed/            # DynamoDB seed data
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Java | 17 (Corretto) | `sdk install java 17.0.10-amzn` |
| Maven | 3.9+ | `sdk install maven` |
| Node.js | 20 LTS | `nvm install 20` |
| Docker | 24+ | docker.com/get-docker |
| AWS CDK CLI | 2.x | `npm install -g aws-cdk` |
| AWS CLI | 2.x | aws.amazon.com/cli |

---

## Quick Start

```bash
# 1. Start full local stack
make up

# 2. Verify all services healthy
make check-health

# 3. Send a test POS event (golden thread)
make post-event

# 4. Open SPA: http://localhost:3000
```

---

## Building

```bash
make build          # all Maven modules
make build-frontend # React SPA
```

## Testing

```bash
make test       # unit + integration
make test-arch  # ArchUnit hexagonal layer enforcement
make coverage   # JaCoCo HTML report
```

## Infrastructure (CDK)

```bash
cd infra/cdk && npm ci
make cdk-synth        # synthesise
make cdk-diff         # diff vs deployed
make cdk-deploy-dev   # deploy to dev
```

---

## Architecture & ADRs

See `CLAUDE.md` for the full architecture decision record set.
See `docs/architecture-mapping.md` for code-to-HLD traceability.
