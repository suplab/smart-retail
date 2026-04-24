package com.smartretail.pps.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartretail.common.event.EventEnvelope;
import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.pps.calculator.DemandUpliftCalculator;
import com.smartretail.pps.dto.PromotionActivatedEvent;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequestEntry;

import java.net.URI;
import java.util.Map;

/**
 * PPS Lambda handler — triggered by EventBridge rule on PromotionActivated events.
 * Computes demand uplift using price elasticity formula and publishes
 * ForecastAdjustmentPublished to EventBridge for DFS consumption.
 *
 * No Spring Boot, no ECS, no hexagonal architecture (ADR-002 / AG-08).
 *
 * OQ-05: Source format of promotion events TBD — currently assumes EventBridge rule
 * → SQS → Lambda. Adjust if Campaign Mgmt System sends REST webhook instead.
 */
public class PpsHandler implements RequestHandler<SQSEvent, Void> {

    private static final StructuredLogger LOG = StructuredLogger.of(PpsHandler.class, "pps");
    private static final ObjectMapper MAPPER = new ObjectMapper().findAndRegisterModules();
    private static final String EVENT_BUS = System.getenv()
            .getOrDefault("EVENTBRIDGE_BUS_NAME", "smartretail-events");

    private static final EventBridgeClient EVENT_BRIDGE = buildEventBridgeClient();
    private static final DemandUpliftCalculator CALCULATOR = new DemandUpliftCalculator();

    @Override
    public Void handleRequest(SQSEvent sqsEvent, Context context) {
        for (SQSEvent.SQSMessage record : sqsEvent.getRecords()) {
            String correlationId = context.getAwsRequestId();
            try {
                JsonNode root = MAPPER.readTree(record.getBody());
                JsonNode detail = root.path("detail");

                PromotionActivatedEvent promotion = new PromotionActivatedEvent(
                        detail.path("promotionId").asText(),
                        detail.path("skuId").asText(),
                        detail.path("category").asText(),
                        detail.path("discountPct").decimalValue(),
                        detail.path("startDate").asText(),
                        detail.path("endDate").asText(),
                        root.path("correlationId").asText(correlationId),
                        root.path("traceId").asText("")
                );

                var upliftResult = CALCULATOR.computeUplift(promotion);

                publishForecastAdjustment(upliftResult, promotion);

                LOG.info("PPS: ForecastAdjustmentPublished",
                        promotion.correlationId(), promotion.traceId(),
                        Map.of("skuId", promotion.skuId(),
                                "upliftFactor", upliftResult.upliftFactor().toPlainString()));

            } catch (Exception e) {
                LOG.error("PPS handler error for record", correlationId, "", e);
                throw new RuntimeException("PPS processing failed — routing to DLQ", e);
            }
        }
        return null;
    }

    private void publishForecastAdjustment(DemandUpliftCalculator.UpliftResult result,
                                            PromotionActivatedEvent promotion) throws Exception {
        var detail = MAPPER.valueToTree(Map.of(
                "skuId", promotion.skuId(),
                "category", promotion.category(),
                "upliftFactor", result.upliftFactor(),
                "adjustedForecastPeriodStart", promotion.startDate(),
                "adjustedForecastPeriodEnd", promotion.endDate()
        ));

        EventEnvelope envelope = EventEnvelope.builder()
                .eventType("ForecastAdjustmentPublished")
                .source("pps")
                .correlationId(promotion.correlationId())
                .traceId(promotion.traceId())
                .detail(detail)
                .build();

        String detailJson = MAPPER.writeValueAsString(envelope);
        EVENT_BRIDGE.putEvents(PutEventsRequest.builder()
                .entries(PutEventsRequestEntry.builder()
                        .eventBusName(EVENT_BUS)
                        .source("com.smartretail.pps")
                        .detailType("ForecastAdjustmentPublished")
                        .detail(detailJson)
                        .build())
                .build());
    }

    private static EventBridgeClient buildEventBridgeClient() {
        String endpointUrl = System.getenv("AWS_ENDPOINT_URL");
        var builder = EventBridgeClient.builder()
                .region(Region.of(System.getenv().getOrDefault("AWS_REGION", "us-east-1")))
                .credentialsProvider(DefaultCredentialsProvider.create());
        if (endpointUrl != null && !endpointUrl.isBlank()) {
            builder.endpointOverride(URI.create(endpointUrl));
        }
        return builder.build();
    }
}
