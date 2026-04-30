import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Package, RefreshCw, Truck } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useDashboardStore } from '@/store/dashboardStore'
import { fetchInventory } from '@/services/api'
import { DISTRIBUTION_CENTERS } from '@/types/dashboard'

function formatUSD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function InventoryCard() {
  const { selectedDC } = useDashboardStore()

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey:        ['inventory', selectedDC],
    queryFn:         () => fetchInventory(selectedDC),
    refetchInterval: 15_000,
  })

  if (isLoading) return <CardSkeleton className="h-full" />

  if (isError) {
    return (
      <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3">
        <Package size={32} className="text-slate-300" />
        <p className="text-sm text-slate-500">Failed to load inventory.</p>
        <button onClick={() => void refetch()} className="text-xs text-indigo-600 hover:underline font-medium">Retry</button>
      </div>
    )
  }

  const { stockValue, onHand, inTransit, reorderRequired, lowStockAlerts } = data!
  const dcLabel = DISTRIBUTION_CENTERS.find(d => d.value === selectedDC)?.label ?? 'DC'

  return (
    <Card className="h-full flex flex-col p-5">
      <CardHeader
        className="mb-3 shrink-0"
        title="Inventory Overview"
        action={
          <button
            onClick={() => void refetch()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        }
      />

      {/* Stock value — compact */}
      <div className="shrink-0 mb-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-0.5">
          Stock Value · {dcLabel}
        </p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
          {formatUSD(stockValue)}
        </p>
      </div>

      {/* Stat blocks — compact */}
      <div className="shrink-0 space-y-2 mb-3">
        <div className="stat-block-green flex items-center justify-between py-2.5">
          <div>
            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">On Hand</p>
            <p className="text-xl font-bold text-emerald-800 leading-tight">{onHand.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600">units available</p>
          </div>
          <Package size={22} className="text-emerald-300" />
        </div>

        <div className="stat-block-yellow flex items-center justify-between py-2.5">
          <div>
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">In Transit</p>
            <p className="text-xl font-bold text-amber-800 leading-tight">{inTransit.toLocaleString()}</p>
            <p className="text-[10px] text-amber-600">units en route</p>
          </div>
          <Truck size={22} className="text-amber-300" />
        </div>

        <div className={reorderRequired ? 'stat-block-red py-2.5' : 'stat-block-green py-2.5'}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${reorderRequired ? 'text-red-700' : 'text-emerald-700'}`}>
                Reorder Required
              </p>
              <p className={`text-xl font-bold leading-tight ${reorderRequired ? 'text-red-800' : 'text-emerald-800'}`}>
                {reorderRequired ? 'Yes' : 'No'}
              </p>
            </div>
            <Badge variant={reorderRequired ? 'danger' : 'success'} dot>
              {reorderRequired ? 'Action Needed' : 'Sufficient'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Low-stock alerts — pushed to bottom with mt-auto */}
      <div className="mt-auto shrink-0 flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-600/40">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className={lowStockAlerts > 0 ? 'text-amber-500' : 'text-slate-400'} />
          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Low Stock Alerts</span>
        </div>
        <Badge variant={lowStockAlerts > 5 ? 'danger' : lowStockAlerts > 0 ? 'warning' : 'success'} dot>
          {lowStockAlerts} SKUs
        </Badge>
      </div>
    </Card>
  )
}
