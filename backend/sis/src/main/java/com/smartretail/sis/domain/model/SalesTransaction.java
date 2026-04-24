package com.smartretail.sis.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

/**
 * Aggregate root for the SalesTransaction bounded context.
 * Represents a single validated, deduplicated POS or e-commerce transaction.
 * Immutable by design — state is not mutated after construction.
 * No AWS SDK or Spring imports allowed in this package (ADR-008 / CG-01).
 */
public final class SalesTransaction {

    private final String transactionId;
    private final String skuId;
    private final String dcId;
    private final String channel;    // POS | ECOMMERCE
    private final BigDecimal quantity;
    private final BigDecimal unitPrice;
    private final BigDecimal totalValue;
    private final Instant eventDate;
    private final String correlationId;

    private SalesTransaction(Builder builder) {
        this.transactionId = Objects.requireNonNull(builder.transactionId, "transactionId");
        this.skuId = Objects.requireNonNull(builder.skuId, "skuId");
        this.dcId = Objects.requireNonNull(builder.dcId, "dcId");
        this.channel = Objects.requireNonNull(builder.channel, "channel");
        this.quantity = Objects.requireNonNull(builder.quantity, "quantity");
        this.unitPrice = Objects.requireNonNull(builder.unitPrice, "unitPrice");
        this.totalValue = Objects.requireNonNull(builder.totalValue, "totalValue");
        this.eventDate = Objects.requireNonNull(builder.eventDate, "eventDate");
        this.correlationId = builder.correlationId;
    }

    public static Builder builder() { return new Builder(); }

    // ── Domain behaviour ────────────────────────────────────────────────────

    /**
     * Validates business invariants.
     * Called by the application service before persistence.
     * Throws InvalidSalesEventException (domain exception) on violation.
     */
    public void validateInvariants() {
        if (quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new com.smartretail.sis.domain.exception.InvalidSalesEventException(
                    "Quantity must be positive. transactionId=" + transactionId);
        }
        if (unitPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new com.smartretail.sis.domain.exception.InvalidSalesEventException(
                    "Unit price cannot be negative. transactionId=" + transactionId);
        }
        if (!channel.equals("POS") && !channel.equals("ECOMMERCE")) {
            throw new com.smartretail.sis.domain.exception.InvalidSalesEventException(
                    "Unknown channel: " + channel + ". transactionId=" + transactionId);
        }
    }

    // ── Accessors ────────────────────────────────────────────────────────────
    public String transactionId() { return transactionId; }
    public String skuId() { return skuId; }
    public String dcId() { return dcId; }
    public String channel() { return channel; }
    public BigDecimal quantity() { return quantity; }
    public BigDecimal unitPrice() { return unitPrice; }
    public BigDecimal totalValue() { return totalValue; }
    public Instant eventDate() { return eventDate; }
    public String correlationId() { return correlationId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SalesTransaction that)) return false;
        return transactionId.equals(that.transactionId);
    }

    @Override
    public int hashCode() { return Objects.hash(transactionId); }

    @Override
    public String toString() {
        return "SalesTransaction{transactionId='" + transactionId + "', skuId='" + skuId
                + "', dcId='" + dcId + "', channel='" + channel + "'}";
    }

    public static final class Builder {
        private String transactionId;
        private String skuId;
        private String dcId;
        private String channel;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalValue;
        private Instant eventDate;
        private String correlationId;

        public Builder transactionId(String v) { this.transactionId = v; return this; }
        public Builder skuId(String v) { this.skuId = v; return this; }
        public Builder dcId(String v) { this.dcId = v; return this; }
        public Builder channel(String v) { this.channel = v; return this; }
        public Builder quantity(BigDecimal v) { this.quantity = v; return this; }
        public Builder unitPrice(BigDecimal v) { this.unitPrice = v; return this; }
        public Builder totalValue(BigDecimal v) { this.totalValue = v; return this; }
        public Builder eventDate(Instant v) { this.eventDate = v; return this; }
        public Builder correlationId(String v) { this.correlationId = v; return this; }

        public SalesTransaction build() { return new SalesTransaction(this); }
    }
}
