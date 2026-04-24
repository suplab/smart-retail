package com.smartretail.sis.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartretail.sis.application.dto.SalesEventCommand;
import com.smartretail.sis.application.service.SalesIngestionService;
import com.smartretail.sis.domain.exception.DuplicateSalesEventException;
import com.smartretail.sis.domain.model.IdempotencyRecord;
import com.smartretail.sis.domain.port.outbound.EventPublisherPort;
import com.smartretail.sis.domain.port.outbound.IdempotencyRepositoryPort;
import com.smartretail.sis.domain.port.outbound.RawEventStorePort;
import com.smartretail.sis.domain.port.outbound.SalesEventRepositoryPort;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@Tag("unit")
@ExtendWith(MockitoExtension.class)
class SalesIngestionServiceTest {

    @Mock SalesEventRepositoryPort salesEventRepository;
    @Mock IdempotencyRepositoryPort idempotencyRepository;
    @Mock EventPublisherPort eventPublisher;
    @Mock RawEventStorePort rawEventStore;

    private SalesIngestionService service;

    @BeforeEach
    void setUp() {
        service = new SalesIngestionService(
                salesEventRepository, idempotencyRepository,
                eventPublisher, rawEventStore,
                new ObjectMapper().findAndRegisterModules(),
                new SimpleMeterRegistry());
    }

    @Test
    void validNewEvent_isSavedAndPublished() {
        when(idempotencyRepository.find(any())).thenReturn(Optional.empty());

        service.ingest(validCommand());

        verify(rawEventStore).store(any(), any());
        verify(salesEventRepository).save(any());
        verify(idempotencyRepository).save(any());
        verify(eventPublisher).publish(any());
    }

    @Test
    void duplicateEvent_throwsDuplicateSalesEventException() {
        when(idempotencyRepository.find("EVT-001")).thenReturn(
                Optional.of(IdempotencyRecord.forEvent("EVT-001")));

        assertThatThrownBy(() -> service.ingest(validCommand()))
                .isInstanceOf(DuplicateSalesEventException.class);

        verify(salesEventRepository, never()).save(any());
        verify(eventPublisher, never()).publish(any());
    }

    @Test
    void rawEventStoredBeforeIdempotencyCheck() {
        when(idempotencyRepository.find(any())).thenReturn(Optional.empty());
        var orderVerifier = inOrder(rawEventStore, idempotencyRepository, salesEventRepository);

        service.ingest(validCommand());

        orderVerifier.verify(rawEventStore).store(any(), any());
        orderVerifier.verify(idempotencyRepository).find(any());
        orderVerifier.verify(salesEventRepository).save(any());
    }

    @Test
    void eventPublisherFailure_doesNotRollbackPersistence() {
        when(idempotencyRepository.find(any())).thenReturn(Optional.empty());
        doThrow(new RuntimeException("EventBridge down")).when(eventPublisher).publish(any());

        // Should not rethrow — EventBridge failure is non-fatal (event already persisted)
        assertThatCode(() -> service.ingest(validCommand())).doesNotThrowAnyException();
        verify(salesEventRepository).save(any());
    }

    @Test
    void publishedEventHasCorrectType() {
        when(idempotencyRepository.find(any())).thenReturn(Optional.empty());
        var captor = ArgumentCaptor.forClass(com.smartretail.common.event.EventEnvelope.class);

        service.ingest(validCommand());

        verify(eventPublisher).publish(captor.capture());
        assertThat(captor.getValue().eventType()).isEqualTo("SalesTransactionRecorded");
        assertThat(captor.getValue().source()).isEqualTo("sis");
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private SalesEventCommand validCommand() {
        return new SalesEventCommand(
                "EVT-001", "TX-001", "SKU-001", "DC-LONDON",
                "POS", new BigDecimal("2"), new BigDecimal("9.99"),
                new BigDecimal("19.98"), Instant.now(),
                "corr-001", "{}", "trace-001");
    }
}
