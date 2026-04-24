package com.smartretail.re.domain.exception;

import com.smartretail.common.exception.DomainException;
import com.smartretail.re.domain.model.PoStatus;

public class InvalidPoStateTransitionException extends DomainException {
    public InvalidPoStateTransitionException(String poId, PoStatus current, PoStatus attempted) {
        super("Invalid PO state transition. poId=" + poId
                + " currentStatus=" + current + " attemptedStatus=" + attempted);
    }
}
