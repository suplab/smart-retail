package com.smartretail.re;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Replenishment Engine — ECS Fargate entry point.
 * Inbound: SQS FIFO (re-alert-queue, re-confirmation-queue), API Gateway (manual approval callback).
 * Outbound: Step Functions (replenishment saga), DynamoDB (purchase-orders), EventBridge.
 *
 * Step Functions is the sole orchestrator for the replenishment PO lifecycle (ADR-003).
 * States: DRAFT → PENDING_APPROVAL | APPROVED → DISPATCHED → CONFIRMED.
 * Manual approval callback: POST /v1/replenishment/orders/{poId}/approve.
 *
 * OQ-02: Auto-approval PO value threshold not yet confirmed — placeholder: £10,000.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class ReApplication {
    public static void main(String[] args) {
        SpringApplication.run(ReApplication.class, args);
    }
}
