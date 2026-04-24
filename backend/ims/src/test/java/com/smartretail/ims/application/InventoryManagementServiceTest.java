package com.smartretail.ims.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartretail.ims.application.dto.SalesTransactionRecordedEvent;
import com.smartretail.ims.application.service.InventoryManagementService;
import com.smartretail.ims.domain.model.AlertStatus;
import com.smartretail.ims.domain.model.InventoryPosition;
import com.smartretail.ims.domain.port.outbound.AlertPublisherPort;
import com.smartretail.ims.domain.port.outbound.InventoryRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@Tag("unit")
@ExtendWith(MockitoExtension.class)
class InventoryManagementServiceTest {

    @Mock InventoryRepositoryPort inventoryRepository;
    @Mock AlertPublisherPort alertPublisher;

    private InventoryManagementService service;

    @BeforeEach
    void setUp() {
        service = new InventoryManagementService(inventoryRepository, alertPublisher,
                new ObjectMapper().findAndRegisterModules());
    }

    @Test
    void salesEvent_updatesInventoryPosition() {
        InventoryPosition existing = existingPosition(new BigDecimal("100"), AlertStatus.NORMAL);
        when(inventoryRepository.findBySkuAndDc("SKU-001", "DC-LONDON")).thenReturn(Optional.of(existing));

        service.handleSalesTransactionRecorded(salesEvent(new BigDecimal("10")));

        var captor = ArgumentCaptor.forClass(InventoryPosition.class);
        verify(inventoryRepository).save(captor.capture());
        assertThat(captor.getValue().currentStock()).isEqualByComparingTo("90");
    }

    @Test
    void stockDropsBelowThreshold_publishesLowStockAlert() {
        InventoryPosition existing = existingPosition(new BigDecimal("55"), AlertStatus.NORMAL);
        when(inventoryRepository.findBySkuAndDc("SKU-001", "DC-LONDON")).thenReturn(Optional.of(existing));

        service.handleSalesTransactionRecorded(salesEvent(new BigDecimal("10")));

        verify(alertPublisher).publish(any());
    }

    @Test
    void stockAlreadyLow_sameStatus_doesNotPublishDuplicateAlert() {
        InventoryPosition existing = existingPosition(new BigDecimal("45"), AlertStatus.LOW_STOCK);
        when(inventoryRepository.findBySkuAndDc("SKU-001", "DC-LONDON")).thenReturn(Optional.of(existing));

        service.handleSalesTransactionRecorded(salesEvent(new BigDecimal("5")));

        verify(alertPublisher, never()).publish(any());
    }

    @Test
    void noExistingPosition_createsDefaultAndUpdates() {
        when(inventoryRepository.findBySkuAndDc("SKU-001", "DC-LONDON")).thenReturn(Optional.empty());

        service.handleSalesTransactionRecorded(salesEvent(new BigDecimal("10")));

        verify(inventoryRepository).save(any());
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private SalesTransactionRecordedEvent salesEvent(BigDecimal qty) {
        return new SalesTransactionRecordedEvent("TX-001", "SKU-001", "DC-LONDON",
                "POS", qty, "2026-04-23T10:00:00Z", "corr-001", "trace-001");
    }

    private InventoryPosition existingPosition(BigDecimal stock, AlertStatus status) {
        return InventoryPosition.builder()
                .skuId("SKU-001").dcId("DC-LONDON")
                .currentStock(stock)
                .safetyStockThreshold(new BigDecimal("50"))
                .overstockThreshold(new BigDecimal("1000"))
                .alertStatus(status)
                .build();
    }
}
