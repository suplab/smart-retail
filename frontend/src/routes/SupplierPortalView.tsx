
/**
 * Supplier Portal View — Sprint 2 Week 2+ deliverable.
 * SUP service excluded from golden thread (CLAUDE.md §4.1).
 * Low-bandwidth design: route-level code splitting already applied (React.lazy above).
 */
export default function SupplierPortalView(): JSX.Element {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Supplier Portal</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
        <p className="font-semibold">Sprint 2 Week 2+ Deliverable</p>
        <p className="text-sm mt-1">
          The Supplier Portal will display POs, acknowledgements, and shipment tracking.
          Pending OQ-09 (supplier onboarding fields) confirmation.
          Designed for Tier 2/3 suppliers on low-bandwidth connections.
        </p>
      </div>
    </div>
  )
}
