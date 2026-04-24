package com.smartretail.ims.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartretail.common.event.EventEnvelope;
import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.ims.application.dto.SalesTransactionRecordedEvent;
import com.smartretail.ims.application.dto.ShipmentUpdatedEvent;
import com.smartretail.ims.domain.model.AlertStatus;
import com.smartretail.ims.domain.model.InventoryPosition;
import com.smartretail.ims.domain.port.inbound.InventoryUpdatePort;
import com.smartretail.ims.domain.port.outbound.AlertPublisherPort;
import com.smartretail.ims.domain.port.outbound.InventoryRepositoryPort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Application service implementing inventory update use cases.
 * Consumes SalesTransactionRecorded events and updates inventory positions.
 * Raises LowStockAlertRaised or OverstockAlert when thresholds are crossed.
 *
 * OQ-10: Safety stock thresholds are seeded from DynamoDB on startup.
 * The actual formula (z-score × σ) requires domain expert confirmation.
 */
@Service
public class InventoryManagementService implements InventoryUpdatePort {

    private static final StructuredLogger LOG = StructuredLogger.of(InventoryManagementService.class, "ims");

    private final InventoryRepositoryPort inventoryRepository;
    private final AlertPublisherPort alertPublisher;
    private final ObjectMapper objectMapper;

    // Default safety stock thresholds — OQ-10: replace with configurable values once formula confirmed
    private static final BigDecimal DEFAULT_SAFETY_STOCK = new BigDecimal("50");
    private static final BigDecimal DEFAULT_OVERSTOCK = new BigDecimal("1000");

    public InventoryManagementService(InventoryRepositoryPort inventoryRepository,
                                      AlertPublisherPort alertPublisher,
                                      ObjectMapper objectMapper) {
        this.inventoryRepository = inventoryRepository;
        this.alertPublisher = alertPublisher;
        this.objectMapper = objectMapper;
    }

    @Override
    public void handleSalesTransactionRecorded(SalesTransactionRecordedEvent event) {
        InventoryPosition position = inventoryRepository
                .findBySkuAndDc(event.skuId(), event.dcId())
                .orElseGet(() -> createDefaultPosition(event.skuId(), event.dcId()));

        AlertStatus previousStatus = position.alertStatus();
        AlertStatus newStatus = position.applyStockReduction(event.quantity());

        inventoryRepository.save(position);

        // Only publish alert event when status transitions into a new alert state
        if (newStatus != previousStatus) {
            publishAlertEvent(position, event.correlationId(), event.traceId());
        }

        LOG.info("Inventory position updated",
                event.correlationId(), event.traceId(),
                Map.of("skuId", event.skuId(), "dcId", event.dcId(),
                        "currentStock", position.currentStock().toPlainString(),
                        "alertStatus", newStatus.name()));
    }

    @Override
    public void handleShipmentUpdated(ShipmentUpdatedEvent event) {
        InventoryPosition position = inventoryRepository
                .findBySkuAndDc(event.skuId(), event.dcId())
                .orElseGet(() -> createDefaultPosition(event.skuId(), event.dcId()));

        position.applyStockReceipt(event.receivedQuantity());
        inventoryRepository.save(position);

        LOG.info("Inventory position updated on shipment",
                event.correlationId(), event.traceId(),
                Map.of("skuId", event.skuId(), "dcId", event.dcId(),
                        "receivedQuantity", event.receivedQuantity().toPlainString()));
    }

    private void publishAlertEvent(InventoryPosition position, String correlationId, String traceId) {
        String eventType = position.isLowStock() ? "LowStockAlertRaised" : "OverstockAlert";
        try {
            var detail = objectMapper.valueToTree(Map.of(
                    "skuId", position.skuId(),
                    "dcId", position.dcId(),
                    "currentStock", position.currentStock(),
                    "safetyStockThreshold", position.safetyStockThreshold(),
                    "alertStatus", position.alertStatus().name()
            ));
            EventEnvelope event = EventEnvelope.builder()
                    .eventType(eventType)
                    .source("ims")
                    .correlationId(correlationId)
                    .traceId(traceId)
                    .detail(detail)
                    .build();
            alertPublisher.publish(event);
        } catch (Exception e) {
            LOG.error("Failed to publish alert event", correlationId, traceId, e);
        }
    }

    private InventoryPosition createDefaultPosition(String skuId, String dcId) {
        // New SKU×DC position seeded with defaults until a forecast is available (OQ-10)
        return InventoryPosition.builder()
                .skuId(skuId)
                .dcId(dcId)
                .currentStock(new BigDecimal("100"))
                .safetyStockThreshold(DEFAULT_SAFETY_STOCK)
                .overstockThreshold(DEFAULT_OVERSTOCK)
                .build();
    }
}
