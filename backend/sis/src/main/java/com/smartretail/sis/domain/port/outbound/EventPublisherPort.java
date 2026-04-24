package com.smartretail.sis.domain.port.outbound;

import com.smartretail.common.event.EventEnvelope;

/**
 * Secondary port: publishes domain events to the EventBridge custom bus.
 * Implemented by EventBridgePublisherAdapter.
 */
public interface EventPublisherPort {
    void publish(EventEnvelope event);
}
