package com.smartretail.sis.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartretail.common.event.EventEnvelope;
import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.sis.application.dto.SalesEventCommand;
import com.smartretail.sis.domain.exception.DuplicateSalesEventException;
import com.smartretail.sis.domain.model.IdempotencyRecord;
import com.smartretail.sis.domain.model.SalesTransaction;
import com.smartretail.sis.domain.port.inbound.SalesIngestionPort;
import com.smartretail.sis.domain.port.outbound.EventPublisherPort;
import com.smartretail.sis.domain.port.outbound.IdempotencyRepositoryPort;
import com.smartretail.sis.domain.port.outbound.RawEventStorePort;
import com.smartretail.sis.domain.port.outbound.SalesEventRepositoryPort;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Application service implementing the sales ingestion use case.
 * Orchestrates: idempotency check → validation → raw store → persist → publish event.
 * Does NOT contain business logic — delegates to domain model (SalesTransaction.validateInvariants).
 */
@Service
public class SalesIngestionService implements SalesIngestionPort {

    private static final StructuredLogger LOG = StructuredLogger.of(SalesIngestionService.class, "sis");
    private static final String EVENT_TYPE = "SalesTransactionRecorded";

    private final SalesEventRepositoryPort salesEventRepository;
    private final IdempotencyRepositoryPort idempotencyRepository;
    private final EventPublisherPort eventPublisher;
    private final RawEventStorePort rawEventStore;
    private final ObjectMapper objectMapper;
    private final Counter recordsProcessedCounter;
    private final Counter duplicatesRejectedCounter;

    public SalesIngestionService(
            SalesEventRepositoryPort salesEventRepository,
            IdempotencyRepositoryPort idempotencyRepository,
            EventPublisherPort eventPublisher,
            RawEventStorePort rawEventStore,
            ObjectMapper objectMapper,
            MeterRegistry meterRegistry) {
        this.salesEventRepository = salesEventRepository;
        this.idempotencyRepository = idempotencyRepository;
        this.eventPublisher = eventPublisher;
        this.rawEventStore = rawEventStore;
        this.objectMapper = objectMapper;
        // Custom CloudWatch metrics per CLAUDE.md §4.2 (Day 4 — SIS requirements)
        this.recordsProcessedCounter = Counter.builder("sis.records.processed")
                .description("Total POS/e-commerce events successfully processed")
                .register(meterRegistry);
        this.duplicatesRejectedCounter = Counter.builder("sis.duplicates.rejected")
                .description("Events rejected due to idempotency check")
                .register(meterRegistry);
    }

    @Override
    public void ingest(SalesEventCommand command) {
        // 1. Archive raw event first — ensures replay capability even if downstream fails
        rawEventStore.store(command.eventId(), command.rawPayload());

        // 2. Idempotency check — reject duplicates before any DynamoDB write
        if (idempotencyRepository.find(command.eventId()).isPresent()) {
            duplicatesRejectedCounter.increment();
            LOG.warn("Duplicate event rejected",
                    command.correlationId(), command.traceId(),
                    Map.of("eventId", command.eventId(), "transactionId", command.transactionId()));
            throw new DuplicateSalesEventException(command.transactionId());
        }

        // 3. Build domain aggregate and run invariant validation
        SalesTransaction transaction = SalesTransaction.builder()
                .transactionId(command.transactionId())
                .skuId(command.skuId())
                .dcId(command.dcId())
                .channel(command.channel())
                .quantity(command.quantity())
                .unitPrice(command.unitPrice())
                .totalValue(command.totalValue())
                .eventDate(command.eventDate())
                .correlationId(command.correlationId())
                .build();

        transaction.validateInvariants();

        // 4. Persist to sales-events table
        salesEventRepository.save(transaction);

        // 5. Write idempotency key with 48h TTL to prevent reprocessing
        idempotencyRepository.save(IdempotencyRecord.forEvent(command.eventId()));

        // 6. Publish SalesTransactionRecorded to EventBridge
        try {
            var detail = objectMapper.valueToTree(Map.of(
                    "transactionId", transaction.transactionId(),
                    "skuId", transaction.skuId(),
                    "dcId", transaction.dcId(),
                    "channel", transaction.channel(),
                    "quantity", transaction.quantity(),
                    "unitPrice", transaction.unitPrice(),
                    "totalValue", transaction.totalValue(),
                    "eventDate", transaction.eventDate().toString()
            ));
            EventEnvelope envelope = EventEnvelope.builder()
                    .eventType(EVENT_TYPE)
                    .source("sis")
                    .correlationId(command.correlationId())
                    .traceId(command.traceId())
                    .detail(detail)
                    .build();
            eventPublisher.publish(envelope);
        } catch (Exception e) {
            // EventBridge publish failure is non-fatal for idempotency — event is persisted.
            // The DLQ and CloudWatch alarm handle retry/alert. Log as ERROR so the alarm triggers.
            LOG.error("Failed to publish SalesTransactionRecorded to EventBridge",
                    command.correlationId(), command.traceId(), e);
        }

        recordsProcessedCounter.increment();
        LOG.info("SalesTransaction ingested",
                command.correlationId(), command.traceId(),
                Map.of("transactionId", transaction.transactionId(),
                        "skuId", transaction.skuId(),
                        "dcId", transaction.dcId()));
    }
}
