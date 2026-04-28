import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fetchInventoryDashboard } from '@/api/inventoryApi'
import type { AlertStatus, InventoryItem } from '@/types/inventory'
import { AlertBadge } from '@/components/inventory/AlertBadge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorMessage } from '@/components/common/ErrorMessage'

const ALERT_COLOURS: Record<AlertStatus, string> = {
  NORMAL: '#22c55e',
  LOW_STOCK: '#ef4444',
  OVERSTOCK: '#f59e0b',
}

/**
 * Inventory view — primary golden thread SPA view.
 * Consumes GET /v1/dashboard/inventory (ARS Lambda).
 * Recharts BarChart for stock levels per SKU (CLAUDE.md §6.3).
 * React Query handles caching and stale-while-revalidate (60s TTL matching ARS Cache-Control).
 */
export default function InventoryView(): JSX.Element {
  const [selectedDcId, setSelectedDcId] = useState<string>('')
  const [nextToken, setNextToken] = useState<string | undefined>(undefined)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inventory-dashboard', selectedDcId, nextToken],
    queryFn: () => fetchInventoryDashboard(selectedDcId || undefined, 20, nextToken),
  })

  if (isLoading) return <LoadingSpinner size="lg" />
  if (isError) return <ErrorMessage error={error} />

  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600" htmlFor="dc-filter">
            Distribution Centre
          </label>
          <select
            id="dc-filter"
            value={selectedDcId}
            onChange={(e) => { setSelectedDcId(e.target.value); setNextToken(undefined) }}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-brand-500 focus:border-brand-500"
          >
            <option value="">All DCs</option>
            <option value="DC-LONDON">DC-LONDON</option>
            <option value="DC-MANCHESTER">DC-MANCHESTER</option>
            <option value="DC-BIRMINGHAM">DC-BIRMINGHAM</option>
          </select>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="Total SKUs"
          value={items.length}
          subtitle="positions tracked"
          colour="blue"
        />
        <KpiCard
          label="Low Stock Alerts"
          value={items.filter(i => i.alertStatus === 'LOW_STOCK').length}
          subtitle="requiring action"
          colour="red"
        />
        <KpiCard
          label="Overstock Alerts"
          value={items.filter(i => i.alertStatus === 'OVERSTOCK').length}
          subtitle="excess stock"
          colour="amber"
        />
      </div>

      {/* Bar chart: current stock levels */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Stock Levels by SKU</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={items} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
            <XAxis dataKey="skuId" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: string | number) => [value, 'Current Stock']}
              labelFormatter={(label) => `SKU: ${label}`}
            />
            <Bar dataKey="currentStock" radius={[4, 4, 0, 0]}>
              {items.map((item) => (
                <Cell key={item.skuId + item.dcId} fill={ALERT_COLOURS[item.alertStatus]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <LegendItem colour={ALERT_COLOURS.NORMAL} label="Normal" />
          <LegendItem colour={ALERT_COLOURS.LOW_STOCK} label="Low Stock" />
          <LegendItem colour={ALERT_COLOURS.OVERSTOCK} label="Overstock" />
        </div>
      </div>

      {/* Inventory table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['SKU', 'DC', 'Current Stock', 'Safety Threshold', 'Overstock Threshold', 'Status', 'Last Updated'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item: InventoryItem) => (
              <InventoryRow key={item.skuId + item.dcId} item={item} />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No inventory positions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data?.nextToken && (
        <div className="flex justify-center">
          <button
            onClick={() => setNextToken(data.nextToken ?? undefined)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function InventoryRow({ item }: { item: InventoryItem }): JSX.Element {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-gray-700">{item.skuId}</td>
      <td className="px-4 py-3 text-gray-600">{item.dcId}</td>
      <td className="px-4 py-3 font-semibold">{item.currentStock}</td>
      <td className="px-4 py-3 text-gray-500">{item.safetyStockThreshold}</td>
      <td className="px-4 py-3 text-gray-500">{item.overstockThreshold}</td>
      <td className="px-4 py-3"><AlertBadge status={item.alertStatus} /></td>
      <td className="px-4 py-3 text-gray-400 text-xs">
        {new Date(item.lastUpdated).toLocaleString()}
      </td>
    </tr>
  )
}

function KpiCard({ label, value, subtitle, colour }: {
  label: string; value: number; subtitle: string; colour: 'blue' | 'red' | 'amber'
}): JSX.Element {
  const colourMap = { blue: 'text-brand-600', red: 'text-red-500', amber: 'text-amber-500' }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colourMap[colour]}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  )
}

function LegendItem({ colour, label }: { colour: string; label: string }): JSX.Element {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: colour }} />
      {label}
    </span>
  )
}
