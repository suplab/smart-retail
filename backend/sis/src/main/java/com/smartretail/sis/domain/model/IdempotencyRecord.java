package com.smartretail.sis.domain.model;

import java.time.Instant;

/**
 * Value object representing an idempotency check record.
 * Stored in the DynamoDB `idempotency-keys` table with a 48-hour TTL (CLAUDE.md §3.3).
 * Presence of this record for a given eventId means the event was already processed.
 */
public record IdempotencyRecord(
        String eventId,
        Instant processedAt,
        long ttlEpochSeconds
) {
    public static IdempotencyRecord forEvent(String eventId) {
        Instant now = Instant.now();
        long ttl = now.plusSeconds(48 * 60 * 60).getEpochSecond();
        return new IdempotencyRecord(eventId, now, ttl);
    }
}
