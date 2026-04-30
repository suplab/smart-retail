import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Card, CardHeader } from '@/components/ui/Card'
import { useDashboardStore } from '@/store/dashboardStore'
import { fetchOrders } from '@/services/api'
import type { Order, OrderStatus } from '@/types/dashboard'
import type { BadgeVariant } from '@/components/ui/Badge'

const PAGE_SIZE = 5

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

type SortKey = keyof Pick<Order, 'poNumber' | 'supplier' | 'eta' | 'status' | 'amount'>
type SortDir = 'asc' | 'desc' | null

const statusVariant: Record<OrderStatus, BadgeVariant> = {
  Delivered:    'success',
  'In Transit': 'neutral',
  Delayed:      'danger',
}

interface SortIconProps { field: SortKey; sort: SortKey | null; dir: SortDir }
function SortIcon({ field, sort, dir }: SortIconProps) {
  if (sort !== field) return <ChevronsUpDown size={11} className="text-slate-300" />
  if (dir === 'asc')  return <ChevronUp      size={11} className="text-indigo-500" />
  return                     <ChevronDown    size={11} className="text-indigo-500" />
}

function sortOrders(orders: Order[], key: SortKey | null, dir: SortDir): Order[] {
  if (!key || !dir) return orders
  return [...orders].sort((a, b) => {
    const av = a[key], bv = b[key]
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return dir === 'asc' ? cmp : -cmp
  })
}

export function OrdersTable() {
  const { selectedDC } = useDashboardStore()
  const [page,    setPage]    = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [search,  setSearch]  = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey:        ['orders', selectedDC, page],
    queryFn:         () => fetchOrders(selectedDC, page, PAGE_SIZE),
    placeholderData: prev => prev,
    refetchInterval: 45_000,
  })

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc');  return }
    if (sortDir === 'asc')  { setSortDir('desc'); return }
    setSortKey(null); setSortDir(null)
  }, [sortKey, sortDir])

  if (isLoading) return <TableSkeleton rows={5} className="h-full" />

  if (isError) {
    return (
      <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 flex items-center justify-center">
        <p className="text-sm text-slate-500">Failed to load purchase orders.</p>
      </div>
    )
  }

  const { orders = [], total = 0 } = data ?? {}
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filtered = orders.filter(o =>
    search === '' ||
    o.poNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.supplier.toLowerCase().includes(search.toLowerCase()),
  )
  const sorted = sortOrders(filtered, sortKey, sortDir)

  const cols: { key: SortKey; label: string; className?: string }[] = [
    { key: 'poNumber', label: 'PO #',     className: 'w-28' },
    { key: 'supplier', label: 'Supplier'                     },
    { key: 'amount',   label: 'Amount',   className: 'w-28' },
    { key: 'eta',      label: 'ETA',      className: 'w-24' },
    { key: 'status',   label: 'Status',   className: 'w-28' },
  ]

  return (
    <Card className="h-full flex flex-col" noPadding>
      {/* Header + search — fixed */}
      <div className="shrink-0 px-5 pt-4 pb-3">
        <CardHeader className="mb-2.5" title="Purchase Orders" subtitle={`${total} orders total`} />
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search PO or supplier…"
            className="w-full pl-8 pr-4 py-1.5 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Scrollable table area — flex-1 so it fills remaining height */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-y border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60">
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-indigo-600 transition-colors ${col.className ?? ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon field={col.key} sort={sortKey} dir={sortDir} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/60">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                  No orders match your search.
                </td>
              </tr>
            ) : (
              sorted.map((order, idx) => (
                <tr
                  key={order.id}
                  className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors ${
                    idx % 2 === 1 ? 'bg-slate-50/60 dark:bg-slate-700/20' : 'bg-white dark:bg-slate-800'
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">{order.poNumber}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate max-w-[140px]">{order.supplier}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{order.sku}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatUSD(order.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">{order.eta}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusVariant[order.status]} dot>{order.status}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — fixed at bottom */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-t border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Page <span className="font-semibold">{page}</span> of{' '}
          <span className="font-semibold">{totalPages}</span> · {total} orders
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`h-6 w-6 rounded-md text-xs font-medium transition-colors ${
                n === page
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </Card>
  )
}
