package com.smartretail.ars.dto;

import java.util.List;

/**
 * Response DTO for GET /v1/dashboard/inventory.
 * Paginated via cursor-based nextToken (not offset-based — DynamoDB doesn't support offset).
 * Cache-Control: max-age=60 applied at API Gateway response level.
 */
public record DashboardInventoryResponse(
        List<InventoryItem> items,
        String nextToken,
        int totalCount
) {
    public record InventoryItem(
            String skuId,
            String dcId,
            String currentStock,
            String safetyStockThreshold,
            String overstockThreshold,
            String alertStatus,
            String lastUpdated
    ) {}
}
