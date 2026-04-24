package com.smartretail.re.domain.model;

import com.smartretail.re.domain.exception.InvalidPoStateTransitionException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

/**
 * Aggregate root: PurchaseOrder.
 * State machine managed by Step Functions saga (ADR-003).
 * Java sealed interface models valid transitions; ArchUnit enforces no infra imports here.
 *
 * OQ-02: AUTO_APPROVAL_THRESHOLD requires confirmation — placeholder £10,000.
 */
public final class PurchaseOrder {

    // OQ-02: placeholder threshold — confirm with business before Sprint 2 completion
    public static final BigDecimal AUTO_APPROVAL_THRESHOLD = new BigDecimal("10000");

    private final String poId;
    private final String skuId;
    private final String dcId;
    private final String supplierId;
    private final BigDecimal quantity;
    private final BigDecimal totalValue;
    private PoStatus status;
    private final Instant createdAt;
    private String stepFunctionsExecutionArn;

    private PurchaseOrder(Builder builder) {
        this.poId = Objects.requireNonNull(builder.poId);
        this.skuId = Objects.requireNonNull(builder.skuId);
        this.dcId = Objects.requireNonNull(builder.dcId);
        this.supplierId = Objects.requireNonNull(builder.supplierId);
        this.quantity = Objects.requireNonNull(builder.quantity);
        this.totalValue = Objects.requireNonNull(builder.totalValue);
        this.status = builder.status != null ? builder.status : PoStatus.DRAFT;
        this.createdAt = builder.createdAt != null ? builder.createdAt : Instant.now();
        this.stepFunctionsExecutionArn = builder.stepFunctionsExecutionArn;
    }

    public boolean requiresManualApproval() {
        return totalValue.compareTo(AUTO_APPROVAL_THRESHOLD) > 0;
    }

    public void approve() {
        if (status != PoStatus.PENDING_APPROVAL && status != PoStatus.DRAFT) {
            throw new InvalidPoStateTransitionException(poId, status, PoStatus.APPROVED);
        }
        this.status = PoStatus.APPROVED;
    }

    public void dispatch() {
        if (status != PoStatus.APPROVED) {
            throw new InvalidPoStateTransitionException(poId, status, PoStatus.DISPATCHED);
        }
        this.status = PoStatus.DISPATCHED;
    }

    public void confirm() {
        if (status != PoStatus.DISPATCHED) {
            throw new InvalidPoStateTransitionException(poId, status, PoStatus.CONFIRMED);
        }
        this.status = PoStatus.CONFIRMED;
    }

    public String poId() { return poId; }
    public String skuId() { return skuId; }
    public String dcId() { return dcId; }
    public String supplierId() { return supplierId; }
    public BigDecimal quantity() { return quantity; }
    public BigDecimal totalValue() { return totalValue; }
    public PoStatus status() { return status; }
    public Instant createdAt() { return createdAt; }
    public String stepFunctionsExecutionArn() { return stepFunctionsExecutionArn; }
    public void setStepFunctionsExecutionArn(String arn) { this.stepFunctionsExecutionArn = arn; }

    public static Builder builder() { return new Builder(); }

    public static final class Builder {
        private String poId, skuId, dcId, supplierId, stepFunctionsExecutionArn;
        private BigDecimal quantity, totalValue;
        private PoStatus status;
        private Instant createdAt;
        public Builder poId(String v) { this.poId = v; return this; }
        public Builder skuId(String v) { this.skuId = v; return this; }
        public Builder dcId(String v) { this.dcId = v; return this; }
        public Builder supplierId(String v) { this.supplierId = v; return this; }
        public Builder quantity(BigDecimal v) { this.quantity = v; return this; }
        public Builder totalValue(BigDecimal v) { this.totalValue = v; return this; }
        public Builder status(PoStatus v) { this.status = v; return this; }
        public Builder createdAt(Instant v) { this.createdAt = v; return this; }
        public Builder stepFunctionsExecutionArn(String v) { this.stepFunctionsExecutionArn = v; return this; }
        public PurchaseOrder build() { return new PurchaseOrder(this); }
    }
}
