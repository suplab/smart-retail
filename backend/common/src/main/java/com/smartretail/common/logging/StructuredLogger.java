package com.smartretail.common.logging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.Map;

/**
 * Emits log lines as JSON objects conforming to the structured log contract in LLD §9.1 / CLAUDE.md §6.5.
 * Never log PII (supplier email, phone), raw JWTs, or DynamoDB item content at DEBUG in production.
 */
public final class StructuredLogger {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .findAndRegisterModules();

    private final Logger delegate;
    private final String service;

    private StructuredLogger(Class<?> clazz, String service) {
        this.delegate = LoggerFactory.getLogger(clazz);
        this.service = service;
    }

    public static StructuredLogger of(Class<?> clazz, String service) {
        return new StructuredLogger(clazz, service);
    }

    public void info(String message, String correlationId, String traceId, Map<String, Object> context) {
        delegate.info(buildLine("INFO", message, correlationId, traceId, context, null));
    }

    public void warn(String message, String correlationId, String traceId, Map<String, Object> context) {
        delegate.warn(buildLine("WARN", message, correlationId, traceId, context, null));
    }

    public void error(String message, String correlationId, String traceId, Throwable ex) {
        delegate.error(buildLine("ERROR", message, correlationId, traceId, Map.of(), ex));
    }

    public void debug(String message, String correlationId, String traceId, Map<String, Object> context) {
        delegate.debug(buildLine("DEBUG", message, correlationId, traceId, context, null));
    }

    private String buildLine(String level, String message, String correlationId,
                              String traceId, Map<String, Object> context, Throwable ex) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("timestamp", Instant.now().toString());
        node.put("level", level);
        node.put("service", service);
        node.put("traceId", traceId != null ? traceId : "");
        node.put("correlationId", correlationId != null ? correlationId : "");
        node.put("message", message);

        if (ex != null) {
            node.put("errorType", ex.getClass().getSimpleName());
            node.put("errorMessage", ex.getMessage());
        }

        if (context != null && !context.isEmpty()) {
            ObjectNode ctx = MAPPER.createObjectNode();
            context.forEach((k, v) -> ctx.put(k, v != null ? v.toString() : "null"));
            node.set("context", ctx);
        }

        try {
            return MAPPER.writeValueAsString(node);
        } catch (JsonProcessingException e) {
            // Safe fallback — should never happen with this object graph
            return "{\"level\":\"ERROR\",\"message\":\"Failed to serialise log line\"}";
        }
    }
}
