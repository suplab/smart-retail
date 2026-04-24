package com.smartretail.sis.domain.exception;

import com.smartretail.common.exception.DomainException;

/** Thrown when an inbound sales event fails schema or business-rule validation. */
public class InvalidSalesEventException extends DomainException {
    public InvalidSalesEventException(String message) {
        super(message);
    }
}
