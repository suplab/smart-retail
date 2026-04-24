package com.smartretail.ars.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.smartretail.ars.dto.DashboardInventoryResponse;
import com.smartretail.ars.reader.InventoryDashboardReader;
import com.smartretail.common.logging.StructuredLogger;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import java.net.URI;
import java.util.Map;

/**
 * ARS Lambda handler — single entry point for all Analytics & Reporting API calls.
 * Routed from API Gateway. JWT validation occurs at API Gateway; this handler
 * receives pre-validated request context.
 *
 * No Spring Boot, no ECS, no hexagonal architecture (ADR-002 / AG-08).
 * AWS SDK clients are initialised once in the Lambda execution context (outside handler method)
 * to be reused across warm invocations.
 */
public class ArsHandler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    private static final StructuredLogger LOG = StructuredLogger.of(ArsHandler.class, "ars");
    private static final ObjectMapper MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    // Initialised outside handleRequest to survive Lambda warm starts
    private static final DynamoDbEnhancedClient DYNAMO_CLIENT = buildDynamoClient();
    private static final InventoryDashboardReader INVENTORY_READER =
            new InventoryDashboardReader(DYNAMO_CLIENT);

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent request, Context context) {
        String path = request.getPath();
        String correlationId = getHeader(request, "x-correlation-id", context.getAwsRequestId());
        String traceId = getHeader(request, "x-amzn-trace-id", "");

        try {
            if (path.startsWith("/v1/dashboard/inventory")) {
                return handleInventoryDashboard(request, correlationId, traceId);
            }
            return notFound(path);
        } catch (Exception e) {
            LOG.error("Unhandled error in ARS Lambda", correlationId, traceId, e);
            return error500("Internal server error");
        }
    }

    private APIGatewayProxyResponseEvent handleInventoryDashboard(
            APIGatewayProxyRequestEvent request, String correlationId, String traceId) throws Exception {

        String dcId = request.getQueryStringParameters() != null
                ? request.getQueryStringParameters().get("dcId")
                : null;

        // Pagination support for low-bandwidth connections (NFR — supplier portal)
        int limit = parseIntParam(request, "limit", 20);
        String lastKey = request.getQueryStringParameters() != null
                ? request.getQueryStringParameters().get("nextToken")
                : null;

        DashboardInventoryResponse response = INVENTORY_READER.read(dcId, limit, lastKey);

        LOG.info("GET /v1/dashboard/inventory served", correlationId, traceId,
                Map.of("dcId", dcId != null ? dcId : "all", "resultCount",
                        String.valueOf(response.items().size())));

        return ok(MAPPER.writeValueAsString(response));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static DynamoDbEnhancedClient buildDynamoClient() {
        String endpointUrl = System.getenv("AWS_ENDPOINT_URL");
        DynamoDbClient.Builder builder = DynamoDbClient.builder()
                .region(Region.of(System.getenv().getOrDefault("AWS_REGION", "us-east-1")))
                .credentialsProvider(DefaultCredentialsProvider.create());
        if (endpointUrl != null && !endpointUrl.isBlank()) {
            builder.endpointOverride(URI.create(endpointUrl));
        }
        return DynamoDbEnhancedClient.builder().dynamoDbClient(builder.build()).build();
    }

    private APIGatewayProxyResponseEvent ok(String body) {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(200)
                .withHeaders(Map.of("Content-Type", "application/json",
                        "Cache-Control", "max-age=60"))
                .withBody(body);
    }

    private APIGatewayProxyResponseEvent notFound(String path) {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(404)
                .withBody("{\"error\":\"Route not found: " + path + "\"}");
    }

    private APIGatewayProxyResponseEvent error500(String message) {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(500)
                .withBody("{\"error\":\"" + message + "\"}");
    }

    private String getHeader(APIGatewayProxyRequestEvent request, String name, String defaultValue) {
        if (request.getHeaders() == null) return defaultValue;
        return request.getHeaders().getOrDefault(name, defaultValue);
    }

    private int parseIntParam(APIGatewayProxyRequestEvent request, String name, int defaultValue) {
        if (request.getQueryStringParameters() == null) return defaultValue;
        String val = request.getQueryStringParameters().get(name);
        if (val == null) return defaultValue;
        try { return Math.min(Integer.parseInt(val), 100); } catch (NumberFormatException e) { return defaultValue; }
    }
}
