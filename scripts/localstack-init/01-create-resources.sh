#!/usr/bin/env bash
# LocalStack init script — provisions all AWS resources for local development.
# Runs automatically on LocalStack startup (mounted at /etc/localstack/init/ready.d/).
# Also runnable manually: bash scripts/localstack-init/01-create-resources.sh

set -euo pipefail
ENDPOINT="http://localhost:4566"
REGION="us-east-1"
AWS="aws --endpoint-url=$ENDPOINT --region=$REGION"

echo "==> Creating DynamoDB tables..."

$AWS dynamodb create-table \
  --table-name sales-events \
  --attribute-definitions \
    AttributeName=transactionId,AttributeType=S \
    AttributeName=skuId,AttributeType=S \
    AttributeName=skuDcDate,AttributeType=S \
  --key-schema AttributeName=transactionId,KeyType=HASH \
  --global-secondary-indexes '[{"IndexName":"GSI-SKU-DC-Date","KeySchema":[{"AttributeName":"skuId","KeyType":"HASH"},{"AttributeName":"skuDcDate","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST 2>/dev/null || echo "  sales-events already exists"

$AWS dynamodb create-table \
  --table-name idempotency-keys \
  --attribute-definitions AttributeName=eventId,AttributeType=S \
  --key-schema AttributeName=eventId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST 2>/dev/null || echo "  idempotency-keys already exists"

$AWS dynamodb create-table \
  --table-name inventory-positions \
  --attribute-definitions \
    AttributeName=skuId,AttributeType=S \
    AttributeName=dcId,AttributeType=S \
    AttributeName=alertStatus,AttributeType=S \
  --key-schema \
    AttributeName=skuId,KeyType=HASH \
    AttributeName=dcId,KeyType=RANGE \
  --global-secondary-indexes '[{"IndexName":"GSI-DC-Alerts","KeySchema":[{"AttributeName":"dcId","KeyType":"HASH"},{"AttributeName":"alertStatus","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST 2>/dev/null || echo "  inventory-positions already exists"

$AWS dynamodb create-table \
  --table-name forecasts \
  --attribute-definitions \
    AttributeName=skuId,AttributeType=S \
    AttributeName=dcForecastDate,AttributeType=S \
  --key-schema \
    AttributeName=skuId,KeyType=HASH \
    AttributeName=dcForecastDate,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST 2>/dev/null || echo "  forecasts already exists"

$AWS dynamodb create-table \
  --table-name purchase-orders \
  --attribute-definitions AttributeName=poId,AttributeType=S \
  --key-schema AttributeName=poId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST 2>/dev/null || echo "  purchase-orders already exists"

$AWS dynamodb create-table \
  --table-name supplier-pos \
  --attribute-definitions \
    AttributeName=supplierId,AttributeType=S \
    AttributeName=poId,AttributeType=S \
  --key-schema \
    AttributeName=supplierId,KeyType=HASH \
    AttributeName=poId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST 2>/dev/null || echo "  supplier-pos already exists"

$AWS dynamodb create-table \
  --table-name elasticity-reference \
  --attribute-definitions \
    AttributeName=skuId,AttributeType=S \
    AttributeName=category,AttributeType=S \
  --key-schema \
    AttributeName=skuId,KeyType=HASH \
    AttributeName=category,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST 2>/dev/null || echo "  elasticity-reference already exists"

echo "==> Creating Kinesis stream..."
$AWS kinesis create-stream \
  --stream-name smartretail-pos-stream \
  --shard-count 1 2>/dev/null || echo "  stream already exists"

echo "==> Creating EventBridge custom bus..."
$AWS events create-event-bus \
  --name smartretail-events 2>/dev/null || echo "  event bus already exists"

echo "==> Creating SQS queues..."
for QUEUE in \
  ims-sales-events-queue ims-sales-events-dlq \
  ims-forecast-updated-queue ims-shipment-queue \
  dfs-sales-events-queue dfs-adjustment-queue \
  sup-po-dispatched-queue \
  ars-alert-queue ars-shipment-queue \
  sis-raw-events-dlq; do
  $AWS sqs create-queue --queue-name "$QUEUE" 2>/dev/null || echo "  $QUEUE already exists"
done

for FIFO in re-alert-queue re-confirmation-queue; do
  $AWS sqs create-queue \
    --queue-name "${FIFO}.fifo" \
    --attributes FifoQueue=true,ContentBasedDeduplication=true 2>/dev/null || echo "  ${FIFO}.fifo already exists"
done

echo "==> Creating S3 buckets..."
$AWS s3 mb s3://smartretail-raw-events-dev 2>/dev/null || echo "  bucket already exists"
$AWS s3 mb s3://smartretail-ml-artifacts-dev 2>/dev/null || echo "  bucket already exists"

echo "==> LocalStack init complete."
