#!/usr/bin/env bash
# Sends a synthetic POS event to the local Kinesis stream for golden thread testing.
set -euo pipefail
ENDPOINT="http://localhost:4566"
REGION="us-east-1"
TXN_ID="TX-$(date +%s)"
EVENT_ID="EVT-$(date +%s)"

PAYLOAD=$(cat <<EOF
{
  "eventId": "$EVENT_ID",
  "transactionId": "$TXN_ID",
  "skuId": "SKU-001",
  "dcId": "DC-LONDON",
  "channel": "POS",
  "quantity": 2,
  "unitPrice": 9.99,
  "totalValue": 19.98,
  "eventDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "traceId": "test-trace-$(date +%s)"
}
EOF
)

echo "==> Sending POS event: transactionId=$TXN_ID"
aws --endpoint-url=$ENDPOINT --region=$REGION kinesis put-record \
  --stream-name smartretail-pos-stream \
  --partition-key "$TXN_ID" \
  --data "$(echo $PAYLOAD | base64)"

echo "==> Event sent. Watch SIS logs: docker compose logs -f sis"
echo "    Then check DynamoDB: aws --endpoint-url=$ENDPOINT dynamodb get-item --table-name sales-events --key '{\"transactionId\":{\"S\":\"$TXN_ID\"}}'"
