package com.smartretail.sis.domain.exception;

import com.smartretail.common.exception.DomainException;

/** Thrown when an event with the same transactionId has already been processed (idempotency guard). */
public class DuplicateSalesEventException extends DomainException {
    public DuplicateSalesEventException(String transactionId) {
        super("Duplicate event detected. transactionId=" + transactionId);
    }
}
