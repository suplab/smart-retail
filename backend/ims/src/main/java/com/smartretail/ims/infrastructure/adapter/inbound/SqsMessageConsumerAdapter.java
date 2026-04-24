package com.smartretail.ims.infrastructure.adapter.inbound;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.ims.application.dto.SalesTransactionRecordedEvent;
import com.smartretail.ims.application.dto.ShipmentUpdatedEvent;
import com.smartretail.ims.domain.port.inbound.InventoryUpdatePort;
import com.smartretail.ims.infrastructure.config.ImsProperties;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Inbound adapter: polls three SQS queues and dispatches to the application service.
 * Queues: ims-sales-events-queue, ims-forecast-updated-queue, ims-shipment-queue.
 * Uses long-polling (WaitTimeSeconds=20) to reduce empty-receive costs.
 */
@Component
public class SqsMessageConsumerAdapter {

    private static final StructuredLogger LOG = StructuredLogger.of(SqsMessageConsumerAdapter.class, "ims");
    private static final int MAX_MESSAGES = 10;
    private static final int WAIT_TIME_SECONDS = 20;

    private final SqsClient sqsClient;
    private final InventoryUpdatePort inventoryUpdatePort;
    private final ObjectMapper objectMapper;
    private final ImsProperties properties;

    public SqsMessageConsumerAdapter(SqsClient sqsClient,
                                     InventoryUpdatePort inventoryUpdatePort,
                                     ObjectMapper objectMapper,
                                     ImsProperties properties) {
        this.sqsClient = sqsClient;
        this.inventoryUpdatePort = inventoryUpdatePort;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${ims.sqs.poll-interval-ms:100}")
    @CircuitBreaker(name = "sqsConsumer", fallbackMethod = "pollFallback")
    public void pollSalesEventsQueue() {
        pollAndProcess(properties.sqs().salesEventsQueueUrl(), this::processSalesEvent);
    }

    @Scheduled(fixedDelayString = "${ims.sqs.poll-interval-ms:100}")
    @CircuitBreaker(name = "sqsConsumer", fallbackMethod = "pollFallback")
    public void pollShipmentQueue() {
        pollAndProcess(properties.sqs().shipmentQueueUrl(), this::processShipmentEvent);
    }

    private void pollAndProcess(String queueUrl, java.util.function.Consumer<Message> processor) {
        ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                .queueUrl(queueUrl)
                .maxNumberOfMessages(MAX_MESSAGES)
                .waitTimeSeconds(WAIT_TIME_SECONDS)
                .messageAttributeNames("All")
                .build();

        List<Message> messages = sqsClient.receiveMessage(request).messages();
        for (Message message : messages) {
            try {
                processor.accept(message);
                sqsClient.deleteMessage(DeleteMessageRequest.builder()
                        .queueUrl(queueUrl)
                        .receiptHandle(message.receiptHandle())
                        .build());
            } catch (Exception e) {
                LOG.error("Failed to process SQS message — leaving for DLQ retry",
                        null, null, e);
                // Do NOT delete — SQS will redeliver up to maxReceiveCount then route to DLQ
            }
        }
    }

    private void processSalesEvent(Message message) throws Exception {
        JsonNode root = objectMapper.readTree(message.body());
        JsonNode detail = root.path("detail");
        SalesTransactionRecordedEvent event = new SalesTransactionRecordedEvent(
                detail.path("transactionId").asText(),
                detail.path("skuId").asText(),
                detail.path("dcId").asText(),
                detail.path("channel").asText(),
                new BigDecimal(detail.path("quantity").asText("0")),
                detail.path("eventDate").asText(),
                root.path("correlationId").asText(),
                root.path("traceId").asText()
        );
        inventoryUpdatePort.handleSalesTransactionRecorded(event);
    }

    private void processShipmentEvent(Message message) throws Exception {
        JsonNode root = objectMapper.readTree(message.body());
        JsonNode detail = root.path("detail");
        ShipmentUpdatedEvent event = new ShipmentUpdatedEvent(
                detail.path("shipmentId").asText(),
                detail.path("poId").asText(),
                detail.path("skuId").asText(),
                detail.path("dcId").asText(),
                new BigDecimal(detail.path("receivedQuantity").asText("0")),
                detail.path("shipmentStatus").asText(),
                root.path("correlationId").asText(),
                root.path("traceId").asText()
        );
        inventoryUpdatePort.handleShipmentUpdated(event);
    }

    private void pollFallback(Exception e) {
        LOG.warn("SQS consumer circuit breaker OPEN — skipping poll cycle",
                null, null, Map.of("error", e.getMessage()));
    }
}
