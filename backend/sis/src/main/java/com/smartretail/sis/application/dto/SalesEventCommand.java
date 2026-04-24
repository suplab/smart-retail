package com.smartretail.sis.application.dto;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Inbound command object carrying a parsed Kinesis sales event into the application service.
 * Created by the Kinesis consumer adapter — does not leak into the domain model directly.
 */
public record SalesEventCommand(
        String eventId,
        String transactionId,
        String skuId,
        String dcId,
        String channel,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal totalValue,
        Instant eventDate,
        String correlationId,
        String rawPayload,
        String traceId
) {}
