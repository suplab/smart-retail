package com.smartretail.sup.infrastructure.adapter.outbound;

import com.smartretail.common.logging.StructuredLogger;
import com.smartretail.sup.domain.model.SupplierPo;
import com.smartretail.sup.domain.port.outbound.EdiAdapterPort;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Stub EDI adapter — MVP implementation.
 * Full EDI (AS2/SFTP) is deferred to Phase 2 (CLAUDE.md §1.5).
 * This stub logs the intended EDI send without performing any I/O.
 * Replace this class with the real AS2/SFTP implementation in Phase 2
 * without changing the EdiAdapterPort interface.
 */
@Component
public class StubEdiAdapter implements EdiAdapterPort {

    private static final StructuredLogger LOG = StructuredLogger.of(StubEdiAdapter.class, "sup");

    @Override
    public void sendPoDispatch(SupplierPo po) {
        // Phase 2: replace with actual AS2/SFTP dispatch
        LOG.info("STUB EDI: PO dispatch logged (Phase 2 not yet implemented)",
                null, null,
                Map.of("poId", po.poId(), "supplierId", po.supplierId()));
    }
}
