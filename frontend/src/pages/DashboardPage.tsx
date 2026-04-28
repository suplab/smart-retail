import { RefreshCcw, Calendar, Building2 } from 'lucide-react'
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

  const refreshAll = () => { void queryClient.invalidateQueries() }

  return (
    <div className="h-full flex flex-col">
      {/* Single compact toolbar — replaces separate page-header + KPI bar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-5 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Operations Overview</span>
          <LiveIndicator />
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <div className="flex items-center gap-1.5">
            <Building2 size={13} className="text-slate-400 shrink-0" />
            <Select
              value={selectedDC}
              onChange={setSelectedDC}
              options={DISTRIBUTION_CENTERS.map(d => ({ value: d.value, label: d.label }))}
              size="sm"
              className="w-52"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <Select
              value={dateRange}
              onChange={v => setDateRange(v as typeof dateRange)}
              options={DATE_RANGES}
              size="sm"
            />
          </div>
          <Button variant="secondary" size="sm" icon={<RefreshCcw size={13} />} onClick={refreshAll}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Dashboard grid — fills remaining viewport height; scrolls only on very small screens */}
      <div className="flex-1 min-h-0 p-3 overflow-auto">
        <div
          className="grid grid-cols-12 grid-rows-2 gap-3 h-full"
          style={{ minHeight: '580px' }}
        >
          <div className="col-span-12 lg:col-span-8 min-h-0">
            <ForecastCard />
          </div>
          <div className="col-span-12 lg:col-span-4 min-h-0">
            <InventoryCard />
          </div>
          <div className="col-span-12 lg:col-span-6 min-h-0">
            <OrdersTable />
          </div>
          <div className="col-span-12 lg:col-span-6 min-h-0">
            <LogisticsCard />
          </div>
        </div>
      </div>
    </div>
  )
}
