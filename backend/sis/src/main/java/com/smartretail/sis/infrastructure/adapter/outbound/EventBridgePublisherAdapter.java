package com.smartretail.sis.infrastructure.adapter.outbound;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartretail.common.event.EventEnvelope;
import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.sis.domain.port.outbound.EventPublisherPort;
import com.smartretail.sis.infrastructure.config.SisProperties;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequestEntry;
import software.amazon.awssdk.services.eventbridge.model.PutEventsResponse;

import java.util.Map;

/**
 * Outbound adapter: publishes domain events to the `smartretail-events` EventBridge custom bus.
 * Uses the EventEnvelope schema defined in CLAUDE.md §3.5.
 * W3C Trace Context propagated via the envelope traceId field.
 */
@Component
public class EventBridgePublisherAdapter implements EventPublisherPort {

    private static final StructuredLogger LOG = StructuredLogger.of(EventBridgePublisherAdapter.class, "sis");

    private final EventBridgeClient eventBridgeClient;
    private final ObjectMapper objectMapper;
    private final SisProperties properties;

    public EventBridgePublisherAdapter(EventBridgeClient eventBridgeClient,
                                       ObjectMapper objectMapper,
                                       SisProperties properties) {
        this.eventBridgeClient = eventBridgeClient;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Override
    @CircuitBreaker(name = "eventBridge")
    @Retry(name = "eventBridge")
    public void publish(EventEnvelope event) {
        try {
            String detailJson = objectMapper.writeValueAsString(event);
            PutEventsRequestEntry entry = PutEventsRequestEntry.builder()
                    .eventBusName(properties.eventbridge().busName())
                    .source("com.smartretail." + event.source())
                    .detailType(event.eventType())
                    .detail(detailJson)
                    .build();
            PutEventsResponse response = eventBridgeClient.putEvents(
                    PutEventsRequest.builder().entries(entry).build());

            if (response.failedEntryCount() > 0) {
                LOG.error("EventBridge rejected event",
                        event.correlationId(), event.traceId(),
                        new RuntimeException("failedEntryCount=" + response.failedEntryCount()));
                throw new RuntimeException("EventBridge rejected event: " + event.eventType());
            }
            LOG.debug("Published to EventBridge",
                    event.correlationId(), event.traceId(),
                    Map.of("eventType", event.eventType(), "eventId", event.eventId()));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialise EventEnvelope", e);
        }
    }
}
