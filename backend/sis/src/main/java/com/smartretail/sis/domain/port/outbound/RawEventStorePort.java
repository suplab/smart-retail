package com.smartretail.sis.domain.port.outbound;

/**
 * Secondary port: archives the raw Kinesis event payload to S3 (smartretail-raw-events bucket)
 * before any transformation. This provides an audit trail and replay capability.
 */
public interface RawEventStorePort {
    /**
     * @param eventId       unique event identifier (used as S3 object key prefix)
     * @param rawPayload    the original JSON string from Kinesis
     */
    void store(String eventId, String rawPayload);
}
