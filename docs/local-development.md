# Local Development Guide — SmartRetail Platform

This guide covers running the full SmartRetail stack locally using Docker Compose + LocalStack, as well as individual service development.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | ≥ 4.28 | https://docs.docker.com/desktop/ |
| Docker Compose | ≥ 2.24 (bundled with Desktop) | Bundled |
| Java | 17 (Amazon Corretto) | `brew install --cask corretto17` or [Corretto downloads](https://aws.amazon.com/corretto/) |
| Maven | ≥ 3.9 | `brew install maven` |
| Node.js | 20 LTS | `brew install node@20` or `nvm use 20` |
| AWS CLI | ≥ 2.15 | `brew install awscli` |
| AWS CDK | ≥ 2.130 | `npm install -g aws-cdk` |

Configure a dummy AWS CLI profile for LocalStack (no real credentials needed locally):

```bash
aws configure --profile localstack
# AWS Access Key ID: test
# AWS Secret Access Key: test
# Default region: us-east-1
# Default output format: json
```

Add to your shell profile:

```bash
export AWS_PROFILE=localstack
export AWS_DEFAULT_REGION=us-east-1
```

---

## Quick Start — Full Stack

The fastest way to run everything end-to-end:

```bash
# 1. Clone and enter the repo
git clone https://github.com/suplab/smart-retail.git
cd smart-retail

# 2. Build all Java services (compiles and runs unit + ArchUnit tests)
make build

# 3. Start LocalStack + all 5 ECS services + React dev server
make up

# 4. Seed LocalStack with tables, queues, streams, and sample data
make seed-local

# 5. Verify everything is healthy
make check-health
```

After `make up` and `make seed-local` succeed, the following URLs are available:

| Service | URL | Notes |
|---------|-----|-------|
| React SPA | http://localhost:5173 | Vite dev server with HMR |
| SIS | http://localhost:8081/actuator/health | Sales Ingestion |
| IMS | http://localhost:8082/actuator/health | Inventory Management |
| DFS | http://localhost:8083/actuator/health | Demand Forecasting |
| RE | http://localhost:8084/actuator/health | Replenishment Engine |
| SUP | http://localhost:8085/actuator/health | Supplier Integration |
| LocalStack | http://localhost:4566 | AWS service emulator |
| LocalStack UI | http://localhost:8055 | LocalStack Pro UI (if using Pro) |

---

## Full Stack Startup (Step by Step)

### Step 1 — Build Java Services

```bash
# Build all modules (skips tests for speed — run tests separately)
mvn -T 4 clean package -DskipTests

# Or build + run all tests including ArchUnit and domain unit tests
mvn -T 4 clean verify
```

### Step 2 — Start Infrastructure

```bash
docker compose up localstack -d
# Wait for LocalStack to be healthy
docker compose ps   # LocalStack should show "healthy"
```

### Step 3 — Create LocalStack Resources

```bash
bash scripts/seed/01-create-resources.sh
```

This creates:
- 7 DynamoDB tables (`sales-events`, `idempotency-keys`, `inventory-positions`, `forecasts`, `purchase-orders`, `supplier-pos`, `elasticity-reference`)
- Kinesis stream `smartretail-pos-stream` (1 shard)
- EventBridge custom bus `smartretail-events`
- 10 standard SQS queues + 2 FIFO queues, all with DLQs
- S3 buckets for raw events and ML data

### Step 4 — Seed Sample Data

```bash
bash scripts/seed/02-seed-dynamo.sh
```

Seeds:
- Inventory positions for SKU-001/002/003 × DC-LONDON/DC-MANCHESTER (NORMAL status)
- SKU-004 × DC-LONDON with LOW_STOCK status (triggers alert flow)
- Elasticity reference data for SKU-001

### Step 5 — Start Services

```bash
docker compose up sis ims dfs re sup -d
docker compose up frontend -d
```

Or start everything at once:

```bash
docker compose up -d
```

---

## Running the Golden Thread End-to-End

The golden thread validates the core event chain: `POS → SIS → EventBridge → IMS → ARS → SPA`.

### 1. Send a Synthetic POS Event

```bash
make post-event
# or directly:
bash scripts/send-test-pos-event.sh
```

Expected output:
```
==> Sending POS event: transactionId=TX-1714000000
{
    "ShardId": "shardId-000000000000",
    "SequenceNumber": "..."
}
==> Event sent.
```

### 2. Verify SIS Persisted the Transaction

```bash
# Replace TX-1714000000 with the transactionId from the previous step
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb get-item \
  --table-name sales-events \
  --key '{"transactionId":{"S":"TX-1714000000"}}'
```

You should see the full `SalesTransaction` record within ~2 seconds (NFR: ≤ 2s end-to-end).

### 3. Verify Idempotency Deduplication

```bash
# Send the same event again — SIS should reject the duplicate silently
bash scripts/send-test-pos-event.sh  # Different eventId, same behaviour

# Send with a known duplicate eventId to verify rejection
PAYLOAD='{"eventId":"EVT-DUPE","transactionId":"TX-DUPE","skuId":"SKU-001","dcId":"DC-LONDON","channel":"POS","quantity":1,"unitPrice":9.99,"totalValue":9.99,"eventDate":"2026-04-24T10:00:00Z","traceId":"test"}'
aws --endpoint-url=http://localhost:4566 kinesis put-record \
  --stream-name smartretail-pos-stream \
  --partition-key TX-DUPE \
  --data "$(echo $PAYLOAD | base64)"

# Send again — no duplicate in DynamoDB
aws --endpoint-url=http://localhost:4566 dynamodb get-item \
  --table-name sales-events \
  --key '{"transactionId":{"S":"TX-DUPE"}}'
```

### 4. Verify IMS Updated Inventory

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb get-item \
  --table-name inventory-positions \
  --key '{"skuId":{"S":"SKU-001"},"dcId":{"S":"DC-LONDON"}}'
```

The `currentStock` value should be decremented by the quantity from the POS event.

### 5. Verify EventBridge Delivery

```bash
# Check SQS queue depth — ims-sales-events-queue should have consumed the message
aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/ims-sales-events-queue \
  --attribute-names ApproximateNumberOfMessages
```

### 6. Query ARS Dashboard API

LocalStack does not run API Gateway. Query the ARS Lambda handler directly via the IMS service's actuator, or run ARS as a local Lambda emulator:

```bash
# Option A: direct DynamoDB query (simulates what ARS returns)
aws --endpoint-url=http://localhost:4566 dynamodb query \
  --table-name inventory-positions \
  --index-name GSI-DC-Alerts \
  --key-condition-expression "dcId = :dc" \
  --expression-attribute-values '{":dc":{"S":"DC-LONDON"}}'

# Option B: invoke ARS Lambda locally using Docker (requires ARS image built)
docker run --rm \
  -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  -e AWS_DEFAULT_REGION=us-east-1 \
  -e AWS_ENDPOINT_URL=http://host.docker.internal:4566 \
  -e INVENTORY_TABLE_NAME=inventory-positions \
  -p 9000:8080 \
  smartretail-ars:local
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -d '{"routeKey":"GET /v1/dashboard/inventory","queryStringParameters":{},"headers":{}}'
```

---

## Developing an Individual Service

### Running a Single Backend Service Locally

Each Spring Boot service can run outside Docker against LocalStack:

```bash
cd backend/sis
mvn spring-boot:run \
  -Dspring-boot.run.profiles=local \
  -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
```

The `local` Spring profile configures:
- `AWS_ENDPOINT_URL=http://localhost:4566`
- `AWS_REGION=us-east-1`
- `AWS_ACCESS_KEY_ID=test` / `AWS_SECRET_ACCESS_KEY=test`

Create `backend/sis/src/main/resources/application-local.yml` if it doesn't exist:

```yaml
sis:
  kinesis:
    stream-name: smartretail-pos-stream
    endpoint: http://localhost:4566
  dynamodb:
    sales-events-table: sales-events
    idempotency-table: idempotency-keys
    endpoint: http://localhost:4566
  eventbridge:
    bus-name: smartretail-events
    endpoint: http://localhost:4566
  s3:
    raw-events-bucket: smartretail-raw-events-local
    endpoint: http://localhost:4566

spring:
  main:
    cloud-platform: none
```

### Remote Debugging with IntelliJ / VS Code

All services start with JDWP on port `5005 + (service index)` in the dev Docker target:

| Service | Debug Port |
|---------|-----------|
| SIS | 5005 |
| IMS | 5006 |
| DFS | 5007 |
| RE | 5008 |
| SUP | 5009 |

In IntelliJ: **Run → Edit Configurations → Remote JVM Debug → localhost:5005**.

### Running Tests

```bash
# All unit + ArchUnit tests for a service
mvn -pl backend/sis test -Dgroups=unit

# Domain unit tests only (fastest)
mvn -pl backend/sis test -Dtest="**/domain/**/*Test"

# ArchUnit layer enforcement
mvn -pl backend/sis test -Dtest="*ArchitectureTest"

# Integration tests (requires Docker for Testcontainers)
mvn -pl backend/sis verify -Dgroups=integration

# All backend tests with coverage report
mvn clean verify
open backend/sis/target/site/jacoco/index.html
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev          # Vite dev server at http://localhost:5173
npm run type-check   # TypeScript strict mode check
npm run lint         # ESLint (no-any enforced)
npm run test         # Vitest
npm run test:ui      # Vitest browser UI
npm run build        # Production bundle
```

The Vite dev server proxies `/v1/*` to `http://localhost:4566` by default. To point at a deployed API Gateway, set:

```bash
VITE_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com npm run dev
```

---

## LocalStack Verification Commands

```bash
# List all DynamoDB tables
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# List SQS queues
aws --endpoint-url=http://localhost:4566 sqs list-queues

# List Kinesis streams
aws --endpoint-url=http://localhost:4566 kinesis list-streams

# List EventBridge buses
aws --endpoint-url=http://localhost:4566 events list-event-buses

# Check DLQ depth (should be 0 in healthy state)
aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/ims-sales-events-dlq \
  --attribute-names ApproximateNumberOfMessages

# Inspect SIS structured logs
docker compose logs sis | jq 'select(.level != "DEBUG")'

# Tail all service logs
docker compose logs -f sis ims
```

---

## Environment Variable Reference

All environment variables are set in `docker-compose.yml`. For local development outside Docker, set these in your shell or `application-local.yml`.

| Variable | Service | Description |
|----------|---------|-------------|
| `SPRING_PROFILES_ACTIVE` | All ECS | `local`, `dev`, `staging`, `prod` |
| `AWS_ENDPOINT_URL` | All | LocalStack: `http://localhost:4566` |
| `AWS_REGION` | All | `us-east-1` |
| `SIS_KINESIS_STREAM_NAME` | SIS | `smartretail-pos-stream` |
| `SIS_DYNAMODB_SALES_EVENTS_TABLE` | SIS | `sales-events` |
| `SIS_DYNAMODB_IDEMPOTENCY_TABLE` | SIS | `idempotency-keys` |
| `SIS_EVENTBRIDGE_BUS_NAME` | SIS | `smartretail-events` |
| `SIS_S3_RAW_EVENTS_BUCKET` | SIS | `smartretail-raw-events-local` |
| `IMS_SQS_SALES_QUEUE_URL` | IMS | LocalStack queue URL |
| `IMS_DYNAMODB_INVENTORY_TABLE` | IMS | `inventory-positions` |
| `IMS_EVENTBRIDGE_BUS_NAME` | IMS | `smartretail-events` |
| `INVENTORY_TABLE_NAME` | ARS Lambda | `inventory-positions` |
| `ELASTICITY_TABLE_NAME` | PPS Lambda | `elasticity-reference` |
| `EVENTBRIDGE_BUS_NAME` | PPS Lambda | `smartretail-events` |
| `VITE_API_BASE_URL` | Frontend | API Gateway URL (or LocalStack for local) |
| `VITE_COGNITO_USER_POOL_ID` | Frontend | Cognito User Pool ID |
| `VITE_COGNITO_CLIENT_ID` | Frontend | Cognito App Client ID |

---

## Common Errors and Fixes

### `Connection refused to localhost:4566`

LocalStack is not running or not yet healthy.

```bash
docker compose up localstack -d
docker compose ps   # wait for LocalStack to show "healthy"
```

### `ResourceNotFoundException: Table 'sales-events' not found`

Resources not created yet.

```bash
bash scripts/seed/01-create-resources.sh
```

### `ResourceInUseException` from seed script

Tables already exist — safe to ignore. The script uses `2>/dev/null || echo "already exists"`.

### `ArchUnit violation: domain imports infrastructure class`

A class in `domain/` is importing a Spring or AWS SDK class. This violates the hexagonal boundary (CG-01). Find the import, move the class to `infrastructure/adapter/` or `application/service/`.

### Maven build fails with `Cannot find symbol: EventEnvelope`

The `common` module wasn't built first. Run from the repo root:

```bash
mvn clean install -pl backend/common
```

### Frontend `Amplify.configure` error

Cognito configuration is missing. For local development (no real Cognito), you can stub auth by setting `VITE_COGNITO_USER_POOL_ID=local` and using the mock auth hook in `src/hooks/useAuth.ts`.

### Docker image build fails: `Cannot find target/*.jar`

Maven hasn't been run yet. The Dockerfile build stage requires the JAR:

```bash
# Build Maven first, then let Docker re-use the target/ directory
mvn -pl backend/common,backend/sis package -DskipTests
docker compose build sis
```

### SQS message stuck in queue (not consumed by service)

Check service logs for errors:

```bash
docker compose logs ims | tail -50
```

Common cause: DynamoDB table doesn't exist or IAM policy is missing (LocalStack accepts all IAM calls, so check table names).

---

## Makefile Target Reference

```bash
make up           # docker compose up -d (all services)
make down         # docker compose down
make build        # mvn clean verify (all tests)
make test         # mvn test (unit + arch tests only)
make test-unit    # mvn test -Dgroups=unit
make test-arch    # mvn test -Dtest="*ArchitectureTest"
make seed-local   # 01-create-resources.sh + 02-seed-dynamo.sh
make post-event   # send-test-pos-event.sh
make check-health # curl all /actuator/health endpoints
make cdk-synth    # cdk synth (dry run)
make cdk-diff     # cdk diff (change preview)
make cdk-deploy-dev # cdk deploy --all -c environment=dev
```

---

## CDK Local Development

```bash
cd infra/cdk
npm install

# Preview changes without deploying
cdk synth -c environment=dev
cdk diff  -c environment=dev

# Deploy to a real AWS dev account (requires AWS credentials — not LocalStack)
cdk deploy --all -c environment=dev

# Run cdk-nag checks
cdk synth 2>&1 | grep -i "nag\|error\|warning"
```

For CloudFormation-only deployments (alternative to CDK):

```bash
# Deploy stacks in order (each depends on the previous)
aws cloudformation deploy \
  --template-file infra/cloudformation/01-network.yaml \
  --stack-name smartretail-network-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM

aws cloudformation deploy \
  --template-file infra/cloudformation/02-data.yaml \
  --stack-name smartretail-data-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM

aws cloudformation deploy \
  --template-file infra/cloudformation/03-messaging.yaml \
  --stack-name smartretail-messaging-dev \
  --parameter-overrides Environment=dev KinesisPosShardCount=1

aws cloudformation deploy \
  --template-file infra/cloudformation/04-auth.yaml \
  --stack-name smartretail-auth-dev \
  --parameter-overrides Environment=dev

aws cloudformation deploy \
  --template-file infra/cloudformation/05-compute.yaml \
  --stack-name smartretail-compute-dev \
  --parameter-overrides Environment=dev \
    SisImageUri=<ECR_URI>/smartretail-sis-dev:latest \
    ImsImageUri=<ECR_URI>/smartretail-ims-dev:latest \
    DfsImageUri=<ECR_URI>/smartretail-dfs-dev:latest \
    ReImageUri=<ECR_URI>/smartretail-re-dev:latest \
    SupImageUri=<ECR_URI>/smartretail-sup-dev:latest \
    ArsLambdaS3Bucket=<BUCKET> ArsLambdaS3Key=ars/handler.jar \
    PpsLambdaS3Bucket=<BUCKET> PpsLambdaS3Key=pps/handler.jar \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

aws cloudformation deploy \
  --template-file infra/cloudformation/06-observability.yaml \
  --stack-name smartretail-observability-dev \
  --parameter-overrides Environment=dev
```
