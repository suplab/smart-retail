package com.smartretail.sup.domain.port.outbound;

import com.smartretail.sup.domain.model.SupplierPo;

/**
 * Phase 2 EDI adapter port (AS2/SFTP full EDI deferred per CLAUDE.md §1.5).
 * MVP implementation is a stub that logs the intent without sending.
 * This port exists so the architecture is ready for Phase 2 without code restructuring.
 */
public interface EdiAdapterPort {
    /** Sends a PO dispatch notification to the supplier via EDI (Phase 2: AS2/SFTP). */
    void sendPoDispatch(SupplierPo po);
}
