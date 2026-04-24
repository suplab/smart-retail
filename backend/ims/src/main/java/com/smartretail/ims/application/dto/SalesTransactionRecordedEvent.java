package com.smartretail.ims.application.dto;

import java.math.BigDecimal;

/**
 * Inbound DTO for the SalesTransactionRecorded EventBridge event consumed from SQS.
 * Field names match the EventEnvelope detail schema defined in CLAUDE.md §3.5.
 */
public record SalesTransactionRecordedEvent(
        String transactionId,
        String skuId,
        String dcId,
        String channel,
        BigDecimal quantity,
        String eventDate,
        String correlationId,
        String traceId
) {}
