#!/usr/bin/env bash
# Seed DynamoDB with sample inventory positions and elasticity reference data.
set -euo pipefail
ENDPOINT="http://localhost:4566"
REGION="us-east-1"
AWS="aws --endpoint-url=$ENDPOINT --region=$REGION"

echo "==> Seeding inventory-positions..."
for SKU in SKU-001 SKU-002 SKU-003; do
  for DC in DC-LONDON DC-MANCHESTER; do
    $AWS dynamodb put-item --table-name inventory-positions --item "{
      \"skuId\": {\"S\": \"$SKU\"},
      \"dcId\": {\"S\": \"$DC\"},
      \"currentStock\": {\"S\": \"120\"},
      \"safetyStockThreshold\": {\"S\": \"50\"},
      \"overstockThreshold\": {\"S\": \"500\"},
      \"alertStatus\": {\"S\": \"NORMAL\"},
      \"lastUpdated\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}
    }"
  done
done

# Seed one low-stock item
$AWS dynamodb put-item --table-name inventory-positions --item '{
  "skuId": {"S": "SKU-004"},
  "dcId": {"S": "DC-LONDON"},
  "currentStock": {"S": "30"},
  "safetyStockThreshold": {"S": "50"},
  "overstockThreshold": {"S": "500"},
  "alertStatus": {"S": "LOW_STOCK"},
  "lastUpdated": {"S": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}
}'

echo "==> Seeding elasticity-reference..."
$AWS dynamodb put-item --table-name elasticity-reference --item '{
  "skuId": {"S": "SKU-001"},
  "category": {"S": "ELECTRONICS"},
  "elasticityCoefficient": {"N": "1.8"}
}'

echo "==> Seed complete."
