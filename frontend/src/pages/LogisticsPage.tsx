import React from 'react'
import { Truck } from 'lucide-react'
import { LogisticsCard } from '@/features/logistics/LogisticsCard'
import { Select }         from '@/components/ui/Select'
import { useDashboardStore } from '@/store/dashboardStore'
import { DISTRIBUTION_CENTERS, DATE_RANGES } from '@/types/dashboard'

export function LogisticsPage() {
  const { selectedDC, setSelectedDC, dateRange, setDateRange } = useDashboardStore()

  return (
    <div className="min-h-full">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Truck size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Logistics & Performance</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Fulfilment metrics and delivery performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedDC} onChange={setSelectedDC} options={DISTRIBUTION_CENTERS.map(d => ({ value: d.value, label: d.label }))} size="sm" className="w-48" />
            <Select value={dateRange} onChange={v => setDateRange(v as typeof dateRange)} options={DATE_RANGES} size="sm" />
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6">
            <LogisticsCard />
          </div>
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 p-6">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Performance Targets
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Fulfilment Rate Target', target: '≥ 95%',  current: '96%', ok: true  },
                  { label: 'On-Time Delivery Target', target: '≥ 90%', current: '88%', ok: false },
                  { label: 'Max Stockout Incidents',  target: '≤ 5',   current: '3',   ok: true  },
                  { label: 'Overstock Threshold',     target: '≤ 15',  current: '12',  ok: true  },
                ].map(t => (
                  <div key={t.label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.label}</p>
                      <p className="text-xs text-slate-400">Target: {t.target}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${t.ok ? 'text-emerald-600' : 'text-red-500'}`}>{t.current}</p>
                      <p className={`text-[10px] font-medium ${t.ok ? 'text-emerald-500' : 'text-red-400'}`}>
                        {t.ok ? '✓ On target' : '✗ Below target'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
