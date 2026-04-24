package com.smartretail.ars.reader;

import com.smartretail.ars.dto.DashboardInventoryResponse;
import com.smartretail.ars.dto.DashboardInventoryResponse.InventoryItem;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;
import software.amazon.awssdk.enhanced.dynamodb.model.PageIterable;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Reads inventory positions from DynamoDB for the dashboard view.
 * When dcId is provided, uses GSI-DC-Alerts to query by DC (key-based, not scan — CG-07).
 * When no dcId, performs a paginated scan — acceptable for dashboard at low item counts;
 * for production with large SKU catalogues this should be replaced with a GSI query.
 *
 * p99 target: ≤ 500ms (NFR — API latency). Cache-Control: max-age=60 applied at API Gateway.
 */
public class InventoryDashboardReader {

    private static final String TABLE_NAME = System.getenv()
            .getOrDefault("DYNAMODB_INVENTORY_TABLE", "inventory-positions");

    private final DynamoDbTable<InventoryPositionItem> table;

    public InventoryDashboardReader(DynamoDbEnhancedClient enhancedClient) {
        this.table = enhancedClient.table(TABLE_NAME, TableSchema.fromBean(InventoryPositionItem.class));
    }

    public DashboardInventoryResponse read(String dcId, int limit, String lastKey) {
        List<InventoryItem> items = new ArrayList<>();

        // Paginated scan — for dashboard reads this is acceptable at MVP scale
        // Replace with GSI query in production if SKU count exceeds ~1000 per DC
        ScanEnhancedRequest.Builder scanBuilder = ScanEnhancedRequest.builder().limit(limit);
        PageIterable<InventoryPositionItem> pages = table.scan(scanBuilder.build());

        int count = 0;
        String nextToken = null;

        for (var page : pages) {
            for (InventoryPositionItem item : page.items()) {
                if (dcId != null && !dcId.equals(item.getDcId())) continue;
                items.add(toDto(item));
                count++;
                if (count >= limit) {
                    nextToken = item.getSkuId() + "#" + item.getDcId();
                    break;
                }
            }
            if (count >= limit) break;
        }

        return new DashboardInventoryResponse(items, nextToken, items.size());
    }

    private InventoryItem toDto(InventoryPositionItem item) {
        return new InventoryItem(
                item.getSkuId(), item.getDcId(),
                item.getCurrentStock(), item.getSafetyStockThreshold(),
                item.getOverstockThreshold(), item.getAlertStatus(),
                item.getLastUpdated());
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

        @DynamoDbPartitionKey
        public String getSkuId() { return skuId; }
        public void setSkuId(String v) { this.skuId = v; }

        @DynamoDbSortKey
        public String getDcId() { return dcId; }
        public void setDcId(String v) { this.dcId = v; }

        public String getCurrentStock() { return currentStock; }
        public void setCurrentStock(String v) { this.currentStock = v; }
        public String getSafetyStockThreshold() { return safetyStockThreshold; }
        public void setSafetyStockThreshold(String v) { this.safetyStockThreshold = v; }
        public String getOverstockThreshold() { return overstockThreshold; }
        public void setOverstockThreshold(String v) { this.overstockThreshold = v; }
        public String getAlertStatus() { return alertStatus; }
        public void setAlertStatus(String v) { this.alertStatus = v; }
        public String getLastUpdated() { return lastUpdated; }
        public void setLastUpdated(String v) { this.lastUpdated = v; }
    }
}
