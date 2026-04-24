package com.smartretail.ims.domain.port.inbound;

import com.smartretail.ims.application.dto.SalesTransactionRecordedEvent;
import com.smartretail.ims.application.dto.ShipmentUpdatedEvent;

/**
 * Primary port for inventory state mutations.
 * Implemented by InventoryManagementService.
 * Called by the SQS consumer inbound adapter.
 */
public interface InventoryUpdatePort {

    /** Reduces inventory position for the sold SKU×DC and raises alerts if thresholds crossed. */
    void handleSalesTransactionRecorded(SalesTransactionRecordedEvent event);

    /** Increases inventory position on shipment receipt. */
    void handleShipmentUpdated(ShipmentUpdatedEvent event);
}
