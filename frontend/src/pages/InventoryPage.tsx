import React from 'react'
import { Warehouse } from 'lucide-react'
import { InventoryCard } from '@/features/inventory/InventoryCard'
import { Select }         from '@/components/ui/Select'
import { useDashboardStore } from '@/store/dashboardStore'
import { DISTRIBUTION_CENTERS } from '@/types/dashboard'

export function InventoryPage() {
  const { selectedDC, setSelectedDC } = useDashboardStore()

  return (
    <div className="min-h-full">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Warehouse size={18} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Inventory Management</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time stock positions across all DCs</p>
            </div>
          </div>
          <Select
            value={selectedDC}
            onChange={setSelectedDC}
            options={DISTRIBUTION_CENTERS.map(d => ({ value: d.value, label: d.label }))}
            size="sm"
            className="w-56"
          />
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4">
            <InventoryCard />
          </div>
          <div className="lg:col-span-8">
            {/* All DCs summary */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 p-6">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
                All Distribution Centers
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DISTRIBUTION_CENTERS.map(dc => (
                  <button
                    key={dc.value}
                    onClick={() => setSelectedDC(dc.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedDC === dc.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-indigo-700 bg-slate-50 dark:bg-slate-700/40'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${selectedDC === dc.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                      {dc.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{dc.value.toUpperCase()}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
