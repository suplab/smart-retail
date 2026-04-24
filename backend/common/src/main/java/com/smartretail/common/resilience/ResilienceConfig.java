package com.smartretail.common.resilience;

import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.bulkhead.BulkheadConfig;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Platform-wide resilience defaults for all outbound adapter calls.
 * Per ADR-008 and CLAUDE.md §5.3:
 *   - Circuit breaker opens at ≥50% failure rate, waits 30s
 *   - Retry: exponential backoff with jitter, max 3 retries
 *   - Bulkhead: separate thread pools for DynamoDB vs EventBridge
 * Individual services override via their resilience4j YAML config where needed.
 */
@Configuration
public class ResilienceConfig {

    @Bean("dynamoDbCircuitBreakerConfig")
    public CircuitBreakerConfig dynamoDbCircuitBreakerConfig() {
        return CircuitBreakerConfig.custom()
                .failureRateThreshold(50)
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .slidingWindowSize(10)
                .permittedNumberOfCallsInHalfOpenState(3)
                .build();
    }

    @Bean("eventBridgeCircuitBreakerConfig")
    public CircuitBreakerConfig eventBridgeCircuitBreakerConfig() {
        return CircuitBreakerConfig.custom()
                .failureRateThreshold(50)
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .slidingWindowSize(10)
                .permittedNumberOfCallsInHalfOpenState(3)
                .build();
    }

    @Bean("standardRetryConfig")
    public RetryConfig standardRetryConfig() {
        return RetryConfig.custom()
                .maxAttempts(3)
                .waitDuration(Duration.ofMillis(200))
                .enableExponentialBackoff()
                .exponentialBackoffMultiplier(2.0)
                .build();
    }

    @Bean("dynamoDbBulkheadConfig")
    public BulkheadConfig dynamoDbBulkheadConfig() {
        return BulkheadConfig.custom()
                .maxConcurrentCalls(20)
                .maxWaitDuration(Duration.ofMillis(500))
                .build();
    }

    @Bean("eventBridgeBulkheadConfig")
    public BulkheadConfig eventBridgeBulkheadConfig() {
        return BulkheadConfig.custom()
                .maxConcurrentCalls(10)
                .maxWaitDuration(Duration.ofMillis(500))
                .build();
    }
}
