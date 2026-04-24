package com.smartretail.sis.infrastructure.adapter.outbound;

import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.sis.domain.port.outbound.RawEventStorePort;
import com.smartretail.sis.infrastructure.config.SisProperties;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Map;

/**
 * Outbound adapter: archives raw Kinesis event JSON to S3.
 * Key pattern: raw-events/year={y}/month={m}/day={d}/{eventId}.json
 * Enables replay and audit without querying DynamoDB.
 */
@Component
public class S3RawEventStoreAdapter implements RawEventStorePort {

    private static final StructuredLogger LOG = StructuredLogger.of(S3RawEventStoreAdapter.class, "sis");

    private final S3Client s3Client;
    private final SisProperties properties;

    public S3RawEventStoreAdapter(S3Client s3Client, SisProperties properties) {
        this.s3Client = s3Client;
        this.properties = properties;
    }

    @Override
    @CircuitBreaker(name = "s3", fallbackMethod = "storeFallback")
    public void store(String eventId, String rawPayload) {
        LocalDate today = LocalDate.now();
        String key = String.format("raw-events/year=%d/month=%02d/day=%02d/%s.json",
                today.getYear(), today.getMonthValue(), today.getDayOfMonth(), eventId);
        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(properties.s3().rawEventsBucket())
                        .key(key)
                        .contentType("application/json")
                        .build(),
                RequestBody.fromBytes(rawPayload.getBytes(StandardCharsets.UTF_8)));
    }

    // S3 failure is non-fatal — log warn and proceed (event will still be processed)
    private void storeFallback(String eventId, String rawPayload, Exception e) {
        LOG.warn("S3 raw event store circuit open — skipping archive",
                null, null, Map.of("eventId", eventId, "error", e.getMessage()));
    }
}
