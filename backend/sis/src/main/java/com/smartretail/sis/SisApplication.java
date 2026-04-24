package com.smartretail.sis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Sales Ingestion Service — ECS Fargate entry point.
 * Inbound: Kinesis Data Streams (via Lambda consumer adapter).
 * Outbound: DynamoDB (sales-events, idempotency-keys), EventBridge, S3.
 * Architecture: Hexagonal (ADR-008). Domain is pure Java — zero AWS SDK imports.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class SisApplication {
    public static void main(String[] args) {
        SpringApplication.run(SisApplication.class, args);
    }
}
