package com.smartretail.sis.domain;

import com.smartretail.sis.domain.exception.InvalidSalesEventException;
import com.smartretail.sis.domain.model.SalesTransaction;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.*;

@Tag("unit")
class SalesTransactionTest {

    @Test
    void validTransaction_passesInvariantCheck() {
        SalesTransaction tx = validTransaction().build();
        assertThatCode(tx::validateInvariants).doesNotThrowAnyException();
    }

    @Test
    void zeroQuantity_throwsInvalidSalesEventException() {
        SalesTransaction tx = validTransaction().quantity(BigDecimal.ZERO).build();
        assertThatThrownBy(tx::validateInvariants)
                .isInstanceOf(InvalidSalesEventException.class)
                .hasMessageContaining("Quantity must be positive");
    }

    @Test
    void negativeUnitPrice_throwsInvalidSalesEventException() {
        SalesTransaction tx = validTransaction().unitPrice(new BigDecimal("-1.00")).build();
        assertThatThrownBy(tx::validateInvariants)
                .isInstanceOf(InvalidSalesEventException.class)
                .hasMessageContaining("Unit price cannot be negative");
    }

    @Test
    void unknownChannel_throwsInvalidSalesEventException() {
        SalesTransaction tx = validTransaction().channel("UNKNOWN").build();
        assertThatThrownBy(tx::validateInvariants)
                .isInstanceOf(InvalidSalesEventException.class)
                .hasMessageContaining("Unknown channel");
    }

    @Test
    void ecommerceChannel_isValid() {
        SalesTransaction tx = validTransaction().channel("ECOMMERCE").build();
        assertThatCode(tx::validateInvariants).doesNotThrowAnyException();
    }

    @Test
    void equality_basedOnTransactionId() {
        SalesTransaction a = validTransaction().transactionId("TX-001").build();
        SalesTransaction b = validTransaction().transactionId("TX-001").channel("ECOMMERCE").build();
        assertThat(a).isEqualTo(b);
    }

    @Test
    void missingTransactionId_throwsNullPointerException() {
        assertThatThrownBy(() -> validTransaction().transactionId(null).build())
                .isInstanceOf(NullPointerException.class);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private SalesTransaction.Builder validTransaction() {
        return SalesTransaction.builder()
                .transactionId("TX-" + System.nanoTime())
                .skuId("SKU-001")
                .dcId("DC-LONDON")
                .channel("POS")
                .quantity(new BigDecimal("2.00"))
                .unitPrice(new BigDecimal("9.99"))
                .totalValue(new BigDecimal("19.98"))
                .eventDate(Instant.now())
                .correlationId("corr-001");
    }
}
