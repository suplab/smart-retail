package com.smartretail.pps.dto;

import java.math.BigDecimal;

/** Inbound DTO for PromotionActivated events from the Campaign Management System. */
public record PromotionActivatedEvent(
        String promotionId,
        String skuId,
        String category,
        BigDecimal discountPct,
        String startDate,
        String endDate,
        String correlationId,
        String traceId
) {}
