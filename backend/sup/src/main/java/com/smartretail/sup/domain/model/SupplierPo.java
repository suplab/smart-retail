package com.smartretail.sup.domain.model;

import java.time.Instant;
import java.util.Objects;

/**
 * Aggregate root: SupplierPo — the supplier's view of a Purchase Order.
 * Stored in the `supplier-pos` table. PII fields (email, phone) are NOT stored here;
 * they live in an encrypted form in a separate supplier-profile entry (OQ-09).
 *
 * Full EDI is Phase 2 (CLAUDE.md §1.5). MVP provides a stub EDI adapter port.
 */
public final class SupplierPo {

    private final String supplierId;
    private final String poId;
    private SupplierPoStatus status;
    private String shipmentReference;
    private String exceptionNote;
    private final Instant receivedAt;
    private Instant acknowledgedAt;
    private Instant lastUpdated;

    private SupplierPo(Builder builder) {
        this.supplierId = Objects.requireNonNull(builder.supplierId);
        this.poId = Objects.requireNonNull(builder.poId);
        this.status = builder.status != null ? builder.status : SupplierPoStatus.DISPATCHED;
        this.receivedAt = builder.receivedAt != null ? builder.receivedAt : Instant.now();
        this.shipmentReference = builder.shipmentReference;
        this.exceptionNote = builder.exceptionNote;
        this.acknowledgedAt = builder.acknowledgedAt;
        this.lastUpdated = builder.lastUpdated != null ? builder.lastUpdated : Instant.now();
    }

    public void acknowledge() {
        if (status != SupplierPoStatus.DISPATCHED) {
            throw new com.smartretail.common.exception.DomainException(
                    "Cannot acknowledge PO in status " + status) {};
        }
        this.status = SupplierPoStatus.ACKNOWLEDGED;
        this.acknowledgedAt = Instant.now();
        this.lastUpdated = Instant.now();
    }

    public void updateShipment(String shipmentRef) {
        this.shipmentReference = Objects.requireNonNull(shipmentRef);
        this.status = SupplierPoStatus.SHIPPED;
        this.lastUpdated = Instant.now();
    }

    public void raiseException(String note) {
        this.exceptionNote = note;
        this.status = SupplierPoStatus.EXCEPTION;
        this.lastUpdated = Instant.now();
    }

    public String supplierId() { return supplierId; }
    public String poId() { return poId; }
    public SupplierPoStatus status() { return status; }
    public String shipmentReference() { return shipmentReference; }
    public String exceptionNote() { return exceptionNote; }
    public Instant receivedAt() { return receivedAt; }
    public Instant acknowledgedAt() { return acknowledgedAt; }
    public Instant lastUpdated() { return lastUpdated; }

    public static Builder builder() { return new Builder(); }

    public static final class Builder {
        private String supplierId, poId, shipmentReference, exceptionNote;
        private SupplierPoStatus status;
        private Instant receivedAt, acknowledgedAt, lastUpdated;
        public Builder supplierId(String v) { this.supplierId = v; return this; }
        public Builder poId(String v) { this.poId = v; return this; }
        public Builder status(SupplierPoStatus v) { this.status = v; return this; }
        public Builder shipmentReference(String v) { this.shipmentReference = v; return this; }
        public Builder exceptionNote(String v) { this.exceptionNote = v; return this; }
        public Builder receivedAt(Instant v) { this.receivedAt = v; return this; }
        public Builder acknowledgedAt(Instant v) { this.acknowledgedAt = v; return this; }
        public Builder lastUpdated(Instant v) { this.lastUpdated = v; return this; }
        public SupplierPo build() { return new SupplierPo(this); }
    }
}
