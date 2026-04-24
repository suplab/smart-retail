package com.smartretail.ims.domain.port.outbound;

import com.smartretail.ims.domain.model.InventoryPosition;

import java.util.Optional;

/**
 * Secondary port: read/write against the `inventory-positions` DynamoDB table.
 * PK=skuId, SK=dcId. GSI-DC-Alerts: PK=dcId, SK=alertStatus.
 */
public interface InventoryRepositoryPort {
    Optional<InventoryPosition> findBySkuAndDc(String skuId, String dcId);
    void save(InventoryPosition position);
}
