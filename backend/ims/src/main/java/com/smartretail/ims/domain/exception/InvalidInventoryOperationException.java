package com.smartretail.ims.domain.exception;

import com.smartretail.common.exception.DomainException;

public class InvalidInventoryOperationException extends DomainException {
    public InvalidInventoryOperationException(String message) {
        super(message);
    }
}
