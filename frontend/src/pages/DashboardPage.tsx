import React from 'react'
import { RefreshCcw, Calendar, Building2, Activity } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { ForecastCard }   from '@/features/forecast/ForecastCard'
import { InventoryCard }  from '@/features/inventory/InventoryCard'
import { OrdersTable }    from '@/features/orders/OrdersTable'
import { LogisticsCard }  from '@/features/logistics/LogisticsCard'
import { Select }         from '@/components/ui/Select'
import { Button }         from '@/components/ui/Button'
import { useDashboardStore } from '@/store/dashboardStore'
import { DISTRIBUTION_CENTERS, DATE_RANGES } from '@/types/dashboard'

function LiveIndicator() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      Live
    </div>
  )
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const { selectedDC, setSelectedDC, dateRange, setDateRange } = useDashboardStore()

  const refreshAll = () => {
    void queryClient.invalidateQueries()
  }

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Operations Overview
              </h1>
              <LiveIndicator />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time supply chain performance • Auto-refreshes every 30s
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Building2 size={14} className="text-slate-400 shrink-0" />
              <Select
                value={selectedDC}
                onChange={setSelectedDC}
                options={DISTRIBUTION_CENTERS.map(d => ({ value: d.value, label: d.label }))}
                size="sm"
                className="w-52"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <Select
                value={dateRange}
                onChange={v => setDateRange(v as typeof dateRange)}
                options={DATE_RANGES}
                size="sm"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCcw size={13} />}
              onClick={refreshAll}
            >
              Refresh All
            </Button>
          </div>
        </div>
      </div>

      {/* KPI summary bar */}
      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-6 overflow-x-auto">
          {[
            { label: 'Active DCs',        value: '4',   color: 'text-indigo-600' },
            { label: 'Open POs',          value: '20',  color: 'text-amber-600'  },
            { label: 'SKUs Tracked',      value: '847', color: 'text-slate-700 dark:text-slate-300' },
            { label: 'Alerts Today',      value: '8',   color: 'text-red-600'    },
            { label: 'Avg Accuracy',      value: '89%', color: 'text-emerald-600'},
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-1.5 shrink-0">
              <Activity size={12} className="text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{stat.label}:</span>
              <span className={`text-xs font-bold whitespace-nowrap ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Row 1 */}
          <div className="lg:col-span-8">
            <ForecastCard />
          </div>
          <div className="lg:col-span-4">
            <InventoryCard />
          </div>

          {/* Row 2 */}
          <div className="lg:col-span-6">
            <OrdersTable />
          </div>
          <div className="lg:col-span-6">
            <LogisticsCard />
          </div>
        </div>
      </div>
    </div>
  )
}
