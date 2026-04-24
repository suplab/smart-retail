package com.smartretail.sis.domain.port.outbound;

import com.smartretail.sis.domain.model.IdempotencyRecord;

import java.util.Optional;

/**
 * Secondary port: read/write operations against the `idempotency-keys` DynamoDB table.
 * Used to detect and reject duplicate Kinesis events before processing.
 */
public interface IdempotencyRepositoryPort {

    /** Returns the existing record if the event was already processed. */
    Optional<IdempotencyRecord> find(String eventId);

    /** Persists a new idempotency record with 48-hour TTL. */
    void save(IdempotencyRecord record);
}
