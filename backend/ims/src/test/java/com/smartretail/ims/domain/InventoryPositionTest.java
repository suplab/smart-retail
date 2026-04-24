package com.smartretail.ims.domain;

import com.smartretail.ims.domain.exception.InvalidInventoryOperationException;
import com.smartretail.ims.domain.model.AlertStatus;
import com.smartretail.ims.domain.model.InventoryPosition;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;

@Tag("unit")
class InventoryPositionTest {

    @Test
    void stockReduction_updatesCurrentStock() {
        InventoryPosition pos = position(new BigDecimal("100")).build();
        pos.applyStockReduction(new BigDecimal("20"));
        assertThat(pos.currentStock()).isEqualByComparingTo("80");
    }

    @Test
    void stockFallsBelowSafetyThreshold_triggersLowStockAlert() {
        InventoryPosition pos = position(new BigDecimal("55"))
                .safetyStockThreshold(new BigDecimal("50"))
                .build();
        AlertStatus result = pos.applyStockReduction(new BigDecimal("10"));
        assertThat(result).isEqualTo(AlertStatus.LOW_STOCK);
        assertThat(pos.isLowStock()).isTrue();
    }

    @Test
    void stockAboveOverstockThreshold_triggersOverstockAlert() {
        InventoryPosition pos = position(new BigDecimal("990"))
                .overstockThreshold(new BigDecimal("1000"))
                .build();
        pos.applyStockReceipt(new BigDecimal("20"));
        assertThat(pos.isOverstock()).isTrue();
        assertThat(pos.alertStatus()).isEqualTo(AlertStatus.OVERSTOCK);
    }

    @Test
    void stockWithinBounds_isNormalStatus() {
        InventoryPosition pos = position(new BigDecimal("100")).build();
        AlertStatus result = pos.applyStockReduction(new BigDecimal("10"));
        assertThat(result).isEqualTo(AlertStatus.NORMAL);
    }

    @Test
    void negativeReduction_throwsInvalidInventoryOperationException() {
        InventoryPosition pos = position(new BigDecimal("100")).build();
        assertThatThrownBy(() -> pos.applyStockReduction(BigDecimal.ZERO))
                .isInstanceOf(InvalidInventoryOperationException.class)
                .hasMessageContaining("soldQuantity must be positive");
    }

    @Test
    void stockReceipt_updatesCurrentStock() {
        InventoryPosition pos = position(new BigDecimal("40")).build();
        pos.applyStockReceipt(new BigDecimal("60"));
        assertThat(pos.currentStock()).isEqualByComparingTo("100");
    }

    @Test
    void equality_basedOnSkuAndDc() {
        InventoryPosition a = position(new BigDecimal("100")).build();
        InventoryPosition b = position(new BigDecimal("200")).build();
        assertThat(a).isEqualTo(b);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private InventoryPosition.Builder position(BigDecimal stock) {
        return InventoryPosition.builder()
                .skuId("SKU-001")
                .dcId("DC-LONDON")
                .currentStock(stock)
                .safetyStockThreshold(new BigDecimal("50"))
                .overstockThreshold(new BigDecimal("1000"));
    }
}
