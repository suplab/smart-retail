package com.smartretail.ims;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Inventory Management Service — ECS Fargate entry point.
 * Inbound: SQS (ims-sales-events-queue, ims-forecast-updated-queue, ims-shipment-queue).
 * Outbound: DynamoDB (inventory-positions), EventBridge (LowStockAlertRaised, OverstockAlert).
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class ImsApplication {
    public static void main(String[] args) {
        SpringApplication.run(ImsApplication.class, args);
    }
}
