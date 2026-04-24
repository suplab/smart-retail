package com.smartretail.re.domain.model;

/** Purchase Order status — mirrors the Step Functions saga states (ADR-003). */
public enum PoStatus {
    DRAFT,
    PENDING_APPROVAL,
    APPROVED,
    DISPATCHED,
    CONFIRMED,
    FAILED
}
