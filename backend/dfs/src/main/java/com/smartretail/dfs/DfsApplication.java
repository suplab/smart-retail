package com.smartretail.dfs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Demand Forecasting Service — ECS Fargate entry point.
 * Inbound: SQS (dfs-sales-events-queue, dfs-adjustment-queue), EventBridge Scheduler.
 * Outbound: SageMaker (Batch Transform + Training Job), DynamoDB (forecasts), S3, EventBridge, Parameter Store.
 *
 * Sprint 2 Week 2+ deliverable. Golden thread excludes DFS (CLAUDE.md §4.1).
 * SageMaker Batch Transform — NO real-time inference endpoints (ADR-005 / AG-03).
 *
 * OQ-03: Historical data depth required for DeepAR training not yet confirmed.
 * OQ-04: forecastHorizon and predictionLength not yet confirmed.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class DfsApplication {
    public static void main(String[] args) {
        SpringApplication.run(DfsApplication.class, args);
    }
}
