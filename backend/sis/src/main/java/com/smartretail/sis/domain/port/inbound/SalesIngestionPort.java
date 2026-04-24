package com.smartretail.sis.domain.port.inbound;

import com.smartretail.sis.application.dto.SalesEventCommand;

/**
 * Primary port: entry point for ingesting a sales event.
 * Implemented by SalesIngestionService.
 * Called by the inbound Kinesis consumer adapter.
 */
public interface SalesIngestionPort {

    /**
     * Validate, deduplicate, persist, and publish a sales event.
     *
     * @param command the inbound event payload
     * @throws com.smartretail.sis.domain.exception.DuplicateSalesEventException if already processed
     * @throws com.smartretail.sis.domain.exception.InvalidSalesEventException   if validation fails
     */
    void ingest(SalesEventCommand command);
}
