package com.smartretail.ims.domain.exception;

import com.smartretail.common.exception.DomainException;

public class InventoryPositionNotFoundException extends DomainException {
    public InventoryPositionNotFoundException(String skuId, String dcId) {
        super("Inventory position not found. skuId=" + skuId + " dcId=" + dcId);
    }
}
