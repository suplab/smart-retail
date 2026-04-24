package com.smartretail.ims.domain.port.outbound;

import com.smartretail.common.event.EventEnvelope;

/**
 * Secondary port: publishes LowStockAlertRaised and OverstockAlert events to EventBridge.
 * Implemented by EventBridgeAlertAdapter.
 */
public interface AlertPublisherPort {
    void publish(EventEnvelope alert);
}
