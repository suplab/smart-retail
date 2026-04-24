package com.smartretail.ims.domain.model;

import com.smartretail.ims.domain.exception.InvalidInventoryOperationException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

/**
 * Aggregate root for the Inventory bounded context.
 * Tracks the current stock position for a SKU at a Distribution Centre.
 * Owns the logic for evaluating low-stock and overstock conditions.
 * No AWS SDK or Spring imports (ADR-008 / CG-01).
 *
 * OQ-10: Safety stock formula is a placeholder — requires stakeholder confirmation
 * before the actual z-score × σ formula is implemented.
 */
public final class InventoryPosition {

    private final String skuId;
    private final String dcId;
    private BigDecimal currentStock;
    private BigDecimal safetyStockThreshold;
    private BigDecimal overstockThreshold;
    private AlertStatus alertStatus;
    private Instant lastUpdated;

    private InventoryPosition(Builder builder) {
        this.skuId = Objects.requireNonNull(builder.skuId, "skuId");
        this.dcId = Objects.requireNonNull(builder.dcId, "dcId");
        this.currentStock = Objects.requireNonNull(builder.currentStock, "currentStock");
        this.safetyStockThreshold = Objects.requireNonNull(builder.safetyStockThreshold, "safetyStockThreshold");
        this.overstockThreshold = Objects.requireNonNull(builder.overstockThreshold, "overstockThreshold");
        this.alertStatus = builder.alertStatus != null ? builder.alertStatus : AlertStatus.NORMAL;
        this.lastUpdated = builder.lastUpdated != null ? builder.lastUpdated : Instant.now();
    }

    // ── Domain behaviour ────────────────────────────────────────────────────

    /**
     * Reduces stock by the sold quantity and re-evaluates alert status.
     * Returns the resulting alert status so the application service can
     * decide whether to publish a domain event.
     */
    public AlertStatus applyStockReduction(BigDecimal soldQuantity) {
        if (soldQuantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidInventoryOperationException(
                    "soldQuantity must be positive. skuId=" + skuId + " dcId=" + dcId);
        }
        this.currentStock = this.currentStock.subtract(soldQuantity);
        this.lastUpdated = Instant.now();
        this.alertStatus = evaluateAlertStatus();
        return this.alertStatus;
    }

    /**
     * Updates stock on shipment receipt.
     */
    public void applyStockReceipt(BigDecimal receivedQuantity) {
        if (receivedQuantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidInventoryOperationException(
                    "receivedQuantity must be positive. skuId=" + skuId + " dcId=" + dcId);
        }
        this.currentStock = this.currentStock.add(receivedQuantity);
        this.lastUpdated = Instant.now();
        this.alertStatus = evaluateAlertStatus();
    }

    // OQ-10: Placeholder formula. Replace with z-score × σ formula once confirmed by domain expert.
    private AlertStatus evaluateAlertStatus() {
        if (currentStock.compareTo(safetyStockThreshold) <= 0) {
            return AlertStatus.LOW_STOCK;
        }
        if (currentStock.compareTo(overstockThreshold) >= 0) {
            return AlertStatus.OVERSTOCK;
        }
        return AlertStatus.NORMAL;
    }

    public boolean isLowStock() { return alertStatus == AlertStatus.LOW_STOCK; }
    public boolean isOverstock() { return alertStatus == AlertStatus.OVERSTOCK; }

    // ── Accessors ────────────────────────────────────────────────────────────
    public String skuId() { return skuId; }
    public String dcId() { return dcId; }
    public BigDecimal currentStock() { return currentStock; }
    public BigDecimal safetyStockThreshold() { return safetyStockThreshold; }
    public BigDecimal overstockThreshold() { return overstockThreshold; }
    public AlertStatus alertStatus() { return alertStatus; }
    public Instant lastUpdated() { return lastUpdated; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof InventoryPosition that)) return false;
        return skuId.equals(that.skuId) && dcId.equals(that.dcId);
    }

    @Override
    public int hashCode() { return Objects.hash(skuId, dcId); }

    public static Builder builder() { return new Builder(); }

    public static final class Builder {
        private String skuId;
        private String dcId;
        private BigDecimal currentStock;
        private BigDecimal safetyStockThreshold;
        private BigDecimal overstockThreshold;
        private AlertStatus alertStatus;
        private Instant lastUpdated;

        public Builder skuId(String v) { this.skuId = v; return this; }
        public Builder dcId(String v) { this.dcId = v; return this; }
        public Builder currentStock(BigDecimal v) { this.currentStock = v; return this; }
        public Builder safetyStockThreshold(BigDecimal v) { this.safetyStockThreshold = v; return this; }
        public Builder overstockThreshold(BigDecimal v) { this.overstockThreshold = v; return this; }
        public Builder alertStatus(AlertStatus v) { this.alertStatus = v; return this; }
        public Builder lastUpdated(Instant v) { this.lastUpdated = v; return this; }
        public InventoryPosition build() { return new InventoryPosition(this); }
    }
}
