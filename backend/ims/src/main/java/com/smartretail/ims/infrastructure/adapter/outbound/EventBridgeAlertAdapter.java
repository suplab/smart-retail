package com.smartretail.ims.infrastructure.adapter.outbound;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartretail.common.event.EventEnvelope;
import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.ims.domain.port.outbound.AlertPublisherPort;
import com.smartretail.ims.infrastructure.config.ImsProperties;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.*;

/**
 * Outbound adapter: publishes LowStockAlertRaised and OverstockAlert events to EventBridge.
 * LowStockAlertRaised routes to re-alert-queue (FIFO) and ars-alert-queue (Standard).
 */
@Component
public class EventBridgeAlertAdapter implements AlertPublisherPort {

    private static final StructuredLogger LOG = StructuredLogger.of(EventBridgeAlertAdapter.class, "ims");

    private final EventBridgeClient eventBridgeClient;
    private final ObjectMapper objectMapper;
    private final ImsProperties properties;

    public EventBridgeAlertAdapter(EventBridgeClient eventBridgeClient,
                                   ObjectMapper objectMapper,
                                   ImsProperties properties) {
        this.eventBridgeClient = eventBridgeClient;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Override
    @CircuitBreaker(name = "eventBridge")
    @Retry(name = "eventBridge")
    public void publish(EventEnvelope alert) {
        try {
            String detailJson = objectMapper.writeValueAsString(alert);
            PutEventsRequestEntry entry = PutEventsRequestEntry.builder()
                    .eventBusName(properties.eventbridge().busName())
                    .source("com.smartretail.ims")
                    .detailType(alert.eventType())
                    .detail(detailJson)
                    .build();
            PutEventsResponse response = eventBridgeClient.putEvents(
                    PutEventsRequest.builder().entries(entry).build());
            if (response.failedEntryCount() > 0) {
                throw new RuntimeException("EventBridge rejected alert: " + alert.eventType());
            }
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialise alert event", e);
        }
    }
}
