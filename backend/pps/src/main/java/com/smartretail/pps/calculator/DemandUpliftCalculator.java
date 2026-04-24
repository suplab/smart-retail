package com.smartretail.pps.calculator;

import com.smartretail.pps.dto.PromotionActivatedEvent;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Computes demand uplift factor from a promotion using a simplified price elasticity formula.
 * Formula: upliftFactor = 1 + (elasticity × discountPct / 100)
 *
 * The elasticity coefficient is read from the `elasticity-reference` DynamoDB table at runtime.
 * For MVP, a default elasticity of 1.5 is used if no entry exists for the SKU/category.
 *
 * This is pure logic — no AWS SDK, no I/O. Unit-testable in isolation.
 */
public class DemandUpliftCalculator {

    // Default elasticity — OQ-01/OQ-04: replace with actual elasticity lookup from DynamoDB
    private static final BigDecimal DEFAULT_ELASTICITY = new BigDecimal("1.5");

    public UpliftResult computeUplift(PromotionActivatedEvent promotion) {
        BigDecimal elasticity = DEFAULT_ELASTICITY;
        BigDecimal discountFraction = promotion.discountPct()
                .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        BigDecimal upliftFactor = BigDecimal.ONE.add(elasticity.multiply(discountFraction))
                .setScale(4, RoundingMode.HALF_UP);
        return new UpliftResult(promotion.skuId(), upliftFactor, elasticity);
    }

    public record UpliftResult(String skuId, BigDecimal upliftFactor, BigDecimal elasticityUsed) {}
}
