package com.smartretail.sis.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Externalised configuration for SIS using @ConfigurationProperties (not scattered @Value).
 * All values injected from application.yml / environment variables.
 */
@ConfigurationProperties(prefix = "sis")
public record SisProperties(
        Kinesis kinesis,
        DynamoDb dynamodb,
        EventBridgeConfig eventbridge,
        S3Config s3
) {
    public record Kinesis(String streamName, long pollIntervalMs) {}
    public record DynamoDb(String salesTableName, String idempotencyTableName) {}
    public record EventBridgeConfig(String busName) {}
    public record S3Config(String rawEventsBucket) {}
}
