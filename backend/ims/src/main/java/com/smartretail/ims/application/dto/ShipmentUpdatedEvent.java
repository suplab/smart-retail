package com.smartretail.ims.application.dto;

import java.math.BigDecimal;

/** Inbound DTO for ShipmentUpdated events from the SUP service via SQS. */
public record ShipmentUpdatedEvent(
        String shipmentId,
        String poId,
        String skuId,
        String dcId,
        BigDecimal receivedQuantity,
        String shipmentStatus,
        String correlationId,
        String traceId
) {}
