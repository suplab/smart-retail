import React from 'react'

/**
 * Replenishment View — Sprint 2 Week 2+ deliverable.
 * RE Step Functions saga is excluded from the golden thread (CLAUDE.md §4.1).
 */
export default function ReplenishmentView(): JSX.Element {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Replenishment</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
        <p className="font-semibold">Sprint 2 Week 2+ Deliverable</p>
        <p className="text-sm mt-1">
          The Replenishment view will display PO lifecycle managed by the RE Step Functions saga.
          Pending OQ-02 (auto-approval threshold) confirmation from business stakeholders.
        </p>
      </div>
    </div>
  )
}
