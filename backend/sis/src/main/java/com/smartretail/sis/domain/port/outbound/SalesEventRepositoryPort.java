package com.smartretail.sis.domain.port.outbound;

import com.smartretail.sis.domain.model.SalesTransaction;

/**
 * Secondary port: persists a validated sales transaction to the `sales-events` DynamoDB table.
 * Implemented by DynamoDbSalesEventAdapter.
 */
public interface SalesEventRepositoryPort {
    void save(SalesTransaction transaction);
}
