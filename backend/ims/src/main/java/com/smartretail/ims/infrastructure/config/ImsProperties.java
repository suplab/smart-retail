package com.smartretail.ims.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ims")
public record ImsProperties(
        SqsConfig sqs,
        DynamoDbConfig dynamodb,
        EventBridgeConfig eventbridge
) {
    public record SqsConfig(
            String salesEventsQueueUrl,
            String forecastQueueUrl,
            String shipmentQueueUrl,
            long pollIntervalMs) {}

    public record DynamoDbConfig(String inventoryTableName) {}

    public record EventBridgeConfig(String busName) {}
}
