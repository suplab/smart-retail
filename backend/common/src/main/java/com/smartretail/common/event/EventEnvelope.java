package com.smartretail.common.event;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

/**
 * Mandatory envelope for all domain events published to the smartretail-events EventBridge bus.
 * Every field is required; the "detail" payload is service-specific.
 * Schema is defined in LLD §5.1 and CLAUDE.md §3.5.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EventEnvelope(
        String eventId,
        String eventType,
        String source,
        String version,
        Instant timestamp,
        String correlationId,
        String traceId,
        JsonNode detail
) {
    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String eventId = UUID.randomUUID().toString();
        private String eventType;
        private String source;
        private String version = "1.0";
        private Instant timestamp = Instant.now();
        private String correlationId;
        private String traceId;
        private JsonNode detail;

        public Builder eventType(String eventType) { this.eventType = eventType; return this; }
        public Builder source(String source) { this.source = source; return this; }
        public Builder version(String version) { this.version = version; return this; }
        public Builder correlationId(String correlationId) { this.correlationId = correlationId; return this; }
        public Builder traceId(String traceId) { this.traceId = traceId; return this; }
        public Builder detail(JsonNode detail) { this.detail = detail; return this; }

        public EventEnvelope build() {
            if (eventType == null) throw new IllegalStateException("eventType is required");
            if (source == null) throw new IllegalStateException("source is required");
            return new EventEnvelope(eventId, eventType, source, version, timestamp, correlationId, traceId, detail);
        }
    }
}
