package com.smartretail.sis.infrastructure.adapter.outbound;

import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.sis.domain.model.IdempotencyRecord;
import com.smartretail.sis.domain.port.outbound.IdempotencyRepositoryPort;
import com.smartretail.sis.infrastructure.config.SisProperties;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;

import java.time.Instant;
import java.util.Optional;

/**
 * Outbound adapter: read/write against the `idempotency-keys` DynamoDB table.
 * TTL attribute `ttlEpochSeconds` enables DynamoDB's automatic expiry at 48 hours.
 */
@Component
public class DynamoDbIdempotencyAdapter implements IdempotencyRepositoryPort {

    private static final StructuredLogger LOG = StructuredLogger.of(DynamoDbIdempotencyAdapter.class, "sis");

    private final DynamoDbTable<IdempotencyItem> table;

    public DynamoDbIdempotencyAdapter(DynamoDbEnhancedClient enhancedClient, SisProperties properties) {
        this.table = enhancedClient.table(
                properties.dynamodb().idempotencyTableName(),
                TableSchema.fromBean(IdempotencyItem.class));
    }

    @Override
    @CircuitBreaker(name = "dynamoDb")
    @Retry(name = "dynamoDb")
    public Optional<IdempotencyRecord> find(String eventId) {
        IdempotencyItem item = table.getItem(Key.builder().partitionValue(eventId).build());
        if (item == null) return Optional.empty();
        return Optional.of(new IdempotencyRecord(item.getEventId(),
                Instant.parse(item.getProcessedAt()), item.getTtlEpochSeconds()));
    }

    @Override
    @CircuitBreaker(name = "dynamoDb")
    @Retry(name = "dynamoDb")
    public void save(IdempotencyRecord record) {
        IdempotencyItem item = new IdempotencyItem();
        item.setEventId(record.eventId());
        item.setProcessedAt(record.processedAt().toString());
        item.setTtlEpochSeconds(record.ttlEpochSeconds());
        table.putItem(item);
    }

    @DynamoDbBean
    public static class IdempotencyItem {
        private String eventId;
        private String processedAt;
        private long ttlEpochSeconds;

        @DynamoDbPartitionKey
        public String getEventId() { return eventId; }
        public void setEventId(String v) { this.eventId = v; }
        public String getProcessedAt() { return processedAt; }
        public void setProcessedAt(String v) { this.processedAt = v; }
        public long getTtlEpochSeconds() { return ttlEpochSeconds; }
        public void setTtlEpochSeconds(long v) { this.ttlEpochSeconds = v; }
    }
}
