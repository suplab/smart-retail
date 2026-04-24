package com.smartretail.ims.infrastructure.adapter.outbound;

import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.ims.domain.model.AlertStatus;
import com.smartretail.ims.domain.model.InventoryPosition;
import com.smartretail.ims.domain.port.outbound.InventoryRepositoryPort;
import com.smartretail.ims.infrastructure.config.ImsProperties;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

/**
 * Outbound adapter: persists InventoryPosition to the `inventory-positions` DynamoDB table.
 * Table: PK=skuId (S), SK=dcId (S), GSI-DC-Alerts: PK=dcId, SK=alertStatus.
 */
@Component
public class DynamoDbInventoryAdapter implements InventoryRepositoryPort {

    private static final StructuredLogger LOG = StructuredLogger.of(DynamoDbInventoryAdapter.class, "ims");

    private final DynamoDbTable<InventoryPositionItem> table;

    public DynamoDbInventoryAdapter(DynamoDbEnhancedClient enhancedClient, ImsProperties properties) {
        this.table = enhancedClient.table(
                properties.dynamodb().inventoryTableName(),
                TableSchema.fromBean(InventoryPositionItem.class));
    }

    @Override
    @CircuitBreaker(name = "dynamoDb")
    @Retry(name = "dynamoDb")
    public Optional<InventoryPosition> findBySkuAndDc(String skuId, String dcId) {
        try {
            Key key = Key.builder().partitionValue(skuId).sortValue(dcId).build();
            InventoryPositionItem item = table.getItem(key);
            if (item == null) return Optional.empty();
            return Optional.of(item.toDomain());
        } catch (DynamoDbException e) {
            LOG.error("Failed to read inventory position", null, null, e);
            throw new RuntimeException("DynamoDB read failed for skuId=" + skuId + " dcId=" + dcId, e);
        }
    }

    @Override
    @CircuitBreaker(name = "dynamoDb")
    @Retry(name = "dynamoDb")
    public void save(InventoryPosition position) {
        try {
            table.putItem(InventoryPositionItem.from(position));
        } catch (DynamoDbException e) {
            LOG.error("Failed to save inventory position", null, null, e);
            throw new RuntimeException("DynamoDB write failed for skuId=" + position.skuId(), e);
        }
    }

    @DynamoDbBean
    public static class InventoryPositionItem {
        private String skuId;
        private String dcId;
        private String currentStock;
        private String safetyStockThreshold;
        private String overstockThreshold;
        private String alertStatus;
        private String lastUpdated;

        public static InventoryPositionItem from(InventoryPosition p) {
            InventoryPositionItem item = new InventoryPositionItem();
            item.skuId = p.skuId();
            item.dcId = p.dcId();
            item.currentStock = p.currentStock().toPlainString();
            item.safetyStockThreshold = p.safetyStockThreshold().toPlainString();
            item.overstockThreshold = p.overstockThreshold().toPlainString();
            item.alertStatus = p.alertStatus().name();
            item.lastUpdated = p.lastUpdated().toString();
            return item;
        }

        public InventoryPosition toDomain() {
            return InventoryPosition.builder()
                    .skuId(skuId)
                    .dcId(dcId)
                    .currentStock(new BigDecimal(currentStock))
                    .safetyStockThreshold(new BigDecimal(safetyStockThreshold))
                    .overstockThreshold(new BigDecimal(overstockThreshold))
                    .alertStatus(AlertStatus.valueOf(alertStatus))
                    .lastUpdated(Instant.parse(lastUpdated))
                    .build();
        }

        @DynamoDbPartitionKey
        public String getSkuId() { return skuId; }
        public void setSkuId(String v) { this.skuId = v; }

        @DynamoDbSortKey
        public String getDcId() { return dcId; }
        public void setDcId(String v) { this.dcId = v; }

        @DynamoDbSecondaryPartitionKey(indexNames = "GSI-DC-Alerts")
        public String getAlertStatus() { return alertStatus; }
        public void setAlertStatus(String v) { this.alertStatus = v; }

        public String getCurrentStock() { return currentStock; }
        public void setCurrentStock(String v) { this.currentStock = v; }
        public String getSafetyStockThreshold() { return safetyStockThreshold; }
        public void setSafetyStockThreshold(String v) { this.safetyStockThreshold = v; }
        public String getOverstockThreshold() { return overstockThreshold; }
        public void setOverstockThreshold(String v) { this.overstockThreshold = v; }
        public String getLastUpdated() { return lastUpdated; }
        public void setLastUpdated(String v) { this.lastUpdated = v; }
    }
}
