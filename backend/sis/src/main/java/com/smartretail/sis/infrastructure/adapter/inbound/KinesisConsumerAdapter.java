package com.smartretail.sis.infrastructure.adapter.inbound;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.sis.application.dto.SalesEventCommand;
import com.smartretail.sis.domain.exception.DuplicateSalesEventException;
import com.smartretail.sis.domain.exception.InvalidSalesEventException;
import com.smartretail.sis.domain.port.inbound.SalesIngestionPort;
import com.smartretail.sis.infrastructure.config.SisProperties;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.kinesis.KinesisClient;
import software.amazon.awssdk.services.kinesis.model.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Inbound adapter: polls Kinesis Data Streams, deserialises each record, and feeds
 * the application service. In production this would be replaced by a Lambda trigger
 * (KCL or Lambda event source mapping). This Spring @Scheduled variant supports
 * local dev and integration testing.
 *
 * The Lambda-based Kinesis consumer for production is in:
 *   infra/cdk/lib/compute-stack.ts (Lambda event source mapping to SIS ECS endpoint)
 */
@Component
public class KinesisConsumerAdapter {

    private static final StructuredLogger LOG = StructuredLogger.of(KinesisConsumerAdapter.class, "sis");

    private final KinesisClient kinesisClient;
    private final SalesIngestionPort ingestionPort;
    private final ObjectMapper objectMapper;
    private final SisProperties properties;
    private final List<String> shardIterators = new ArrayList<>();

    public KinesisConsumerAdapter(KinesisClient kinesisClient,
                                  SalesIngestionPort ingestionPort,
                                  ObjectMapper objectMapper,
                                  SisProperties properties) {
        this.kinesisClient = kinesisClient;
        this.ingestionPort = ingestionPort;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${sis.kinesis.poll-interval-ms:1000}")
    @CircuitBreaker(name = "kinesisConsumer", fallbackMethod = "consumeFallback")
    public void consumeRecords() {
        ensureShardIterators();
        List<String> refreshedIterators = new ArrayList<>();

        for (String iterator : shardIterators) {
            GetRecordsRequest request = GetRecordsRequest.builder()
                    .shardIterator(iterator)
                    .limit(100)
                    .build();
            GetRecordsResponse response = kinesisClient.getRecords(request);

            for (Record record : response.records()) {
                String payload = record.data().asUtf8String();
                processRecord(payload);
            }

            if (response.nextShardIterator() != null) {
                refreshedIterators.add(response.nextShardIterator());
            }
        }

        shardIterators.clear();
        shardIterators.addAll(refreshedIterators);
    }

    private void processRecord(String payload) {
        String correlationId = UUID.randomUUID().toString();
        try {
            JsonNode node = objectMapper.readTree(payload);
            SalesEventCommand command = new SalesEventCommand(
                    getTextField(node, "eventId", UUID.randomUUID().toString()),
                    getTextField(node, "transactionId", null),
                    getTextField(node, "skuId", null),
                    getTextField(node, "dcId", null),
                    getTextField(node, "channel", null),
                    getBigDecimalField(node, "quantity"),
                    getBigDecimalField(node, "unitPrice"),
                    getBigDecimalField(node, "totalValue"),
                    Instant.parse(getTextField(node, "eventDate", Instant.now().toString())),
                    correlationId,
                    payload,
                    getTextField(node, "traceId", "")
            );
            ingestionPort.ingest(command);
        } catch (DuplicateSalesEventException e) {
            // Expected path — already logged in service. Do not rethrow (no DLQ needed for duplicates).
        } catch (InvalidSalesEventException e) {
            // Schema validation failure — route to DLQ by rethrowing
            LOG.error("Invalid sales event routed to DLQ", correlationId, "", e);
            throw new RuntimeException("Invalid event — routing to DLQ", e);
        } catch (Exception e) {
            LOG.error("Unexpected error processing Kinesis record", correlationId, "", e);
            throw new RuntimeException("Processing failed — routing to DLQ", e);
        }
    }

    private void ensureShardIterators() {
        if (!shardIterators.isEmpty()) return;
        DescribeStreamRequest describeRequest = DescribeStreamRequest.builder()
                .streamName(properties.kinesis().streamName())
                .build();
        DescribeStreamResponse describeResponse = kinesisClient.describeStream(describeRequest);
        for (Shard shard : describeResponse.streamDescription().shards()) {
            GetShardIteratorRequest iterRequest = GetShardIteratorRequest.builder()
                    .streamName(properties.kinesis().streamName())
                    .shardId(shard.shardId())
                    .shardIteratorType(ShardIteratorType.LATEST)
                    .build();
            shardIterators.add(kinesisClient.getShardIterator(iterRequest).shardIterator());
        }
    }

    private void consumeFallback(Exception e) {
        LOG.warn("Kinesis consumer circuit breaker OPEN — skipping poll cycle",
                null, null, Map.of("error", e.getMessage()));
    }

    private String getTextField(JsonNode node, String field, String defaultValue) {
        JsonNode n = node.get(field);
        return (n != null && !n.isNull()) ? n.asText() : defaultValue;
    }

    private BigDecimal getBigDecimalField(JsonNode node, String field) {
        JsonNode n = node.get(field);
        return (n != null && !n.isNull()) ? n.decimalValue() : BigDecimal.ZERO;
    }
}
