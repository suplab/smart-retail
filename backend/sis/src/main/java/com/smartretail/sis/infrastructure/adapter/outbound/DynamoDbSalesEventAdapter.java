package com.smartretail.sis.infrastructure.adapter.outbound;

import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.sis.domain.model.SalesTransaction;
import com.smartretail.sis.domain.port.outbound.SalesEventRepositoryPort;
import com.smartretail.sis.infrastructure.config.SisProperties;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import java.time.Instant;
import java.util.Map;

/**
 * Outbound adapter: persists SalesTransaction to the `sales-events` DynamoDB table.
 * Uses DynamoDB Enhanced Client per coding standards (CG-07 / ADR-004).
 * Table schema: PK=transactionId, GSI-SKU-DC-Date: PK=skuId, SK=dcId#eventDate.
 */
@Component
public class DynamoDbSalesEventAdapter implements SalesEventRepositoryPort {

    private static final StructuredLogger LOG = StructuredLogger.of(DynamoDbSalesEventAdapter.class, "sis");

    private final DynamoDbTable<SalesEventItem> table;

    public DynamoDbSalesEventAdapter(DynamoDbEnhancedClient enhancedClient, SisProperties properties) {
        this.table = enhancedClient.table(
                properties.dynamodb().salesTableName(),
                TableSchema.fromBean(SalesEventItem.class));
    }

    @Override
    @CircuitBreaker(name = "dynamoDb")
    @Retry(name = "dynamoDb")
    public void save(SalesTransaction transaction) {
        try {
            SalesEventItem item = SalesEventItem.from(transaction);
            table.putItem(item);
        } catch (DynamoDbException e) {
            LOG.error("Failed to persist SalesTransaction to DynamoDB",
                    transaction.correlationId(), null, e);
            throw new RuntimeException("DynamoDB write failed for transactionId=" + transaction.transactionId(), e);
        }
    }

    /**
     * DynamoDB table item mapping.
     * GSI-SKU-DC-Date: PK=skuId, SK=dcId#eventDate — supports sales-by-SKU-and-DC queries.
     */
    @DynamoDbBean
    public static class SalesEventItem {
        private String transactionId;
        private String skuId;
        private String dcId;
        private String channel;
        private String quantity;
        private String unitPrice;
        private String totalValue;
        private String eventDate;
        private String correlationId;
        private String skuDcDate;   // GSI sort key: dcId#eventDate

        public static SalesEventItem from(SalesTransaction t) {
            SalesEventItem item = new SalesEventItem();
            item.transactionId = t.transactionId();
            item.skuId = t.skuId();
            item.dcId = t.dcId();
            item.channel = t.channel();
            item.quantity = t.quantity().toPlainString();
            item.unitPrice = t.unitPrice().toPlainString();
            item.totalValue = t.totalValue().toPlainString();
            item.eventDate = t.eventDate().toString();
            item.correlationId = t.correlationId();
            item.skuDcDate = t.dcId() + "#" + t.eventDate().toString().substring(0, 10);
            return item;
        }

        @DynamoDbPartitionKey
        public String getTransactionId() { return transactionId; }
        public void setTransactionId(String v) { this.transactionId = v; }

        @DynamoDbSecondaryPartitionKey(indexNames = "GSI-SKU-DC-Date")
        public String getSkuId() { return skuId; }
        public void setSkuId(String v) { this.skuId = v; }

        @DynamoDbSecondarySortKey(indexNames = "GSI-SKU-DC-Date")
        public String getSkuDcDate() { return skuDcDate; }
        public void setSkuDcDate(String v) { this.skuDcDate = v; }

        public String getDcId() { return dcId; }
        public void setDcId(String v) { this.dcId = v; }
        public String getChannel() { return channel; }
        public void setChannel(String v) { this.channel = v; }
        public String getQuantity() { return quantity; }
        public void setQuantity(String v) { this.quantity = v; }
        public String getUnitPrice() { return unitPrice; }
        public void setUnitPrice(String v) { this.unitPrice = v; }
        public String getTotalValue() { return totalValue; }
        public void setTotalValue(String v) { this.totalValue = v; }
        public String getEventDate() { return eventDate; }
        public void setEventDate(String v) { this.eventDate = v; }
        public String getCorrelationId() { return correlationId; }
        public void setCorrelationId(String v) { this.correlationId = v; }
    }
}
