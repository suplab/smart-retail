package com.smartretail.common.exception;

/**
 * Base class for all domain exceptions.
 * Infrastructure adapters must catch SDK-specific exceptions and rethrow
 * as subclasses of this type at the adapter boundary — keeping the domain
 * free of AWS SDK imports (ADR-008 / CG-01).
 */
public abstract class DomainException extends RuntimeException {

    protected DomainException(String message) {
        super(message);
    }

    protected DomainException(String message, Throwable cause) {
        super(message, cause);
    }
}
