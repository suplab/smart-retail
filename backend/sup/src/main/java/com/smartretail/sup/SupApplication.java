package com.smartretail.sup;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Supplier Integration Service — ECS Fargate entry point.
 * Inbound: API Gateway (supplier REST portal), SQS (sup-po-dispatched-queue).
 * Outbound: DynamoDB (supplier-pos), EventBridge, KMS (PII encryption for email/phone).
 *
 * PII handling: Supplier email and phone are encrypted at application layer with KMS
 * before DynamoDB write (CLAUDE.md §1.3 / §5.4). Never log these fields.
 *
 * OQ-09: Supplier onboarding fields not yet confirmed — schema is a placeholder.
 * Full EDI (AS2/SFTP) is Phase 2 — this service contains a stub EDI adapter port.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class SupApplication {
    public static void main(String[] args) {
        SpringApplication.run(SupApplication.class, args);
    }
}
