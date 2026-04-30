import { type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { CheckCircle2, Clock, PackageOpen, AlertOctagon, RefreshCw, Truck } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useDashboardStore } from '@/store/dashboardStore'
import { fetchLogistics } from '@/services/api'

interface KpiProps {
  label:      string
  value:      string | number
  icon:       ReactNode
  colorClass: string
  sub?:       string
}

function KpiTile({ label, value, icon, colorClass, sub }: KpiProps) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600/40">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide leading-tight">{label}</p>
        <p className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 leading-tight">{sub}</p>}
      </div>
    </div>
  )
}

interface TooltipEntry { dataKey: string; name: string; value: number; color: string }
interface TooltipPayload { active?: boolean; payload?: TooltipEntry[]; label?: string }

function ChartTooltip({ active, payload, label }: TooltipPayload) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg px-3 py-2">
      <p className="text-[11px] font-semibold text-slate-500 mb-1.5">{label}</p>
      {payload.map(e => (
        <div key={e.dataKey} className="flex items-center gap-2 text-xs py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-slate-500">{e.name}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{e.value}</span>
        </div>
      ))}
    </div>
  )
}

export function LogisticsCard() {
  const { selectedDC, dateRange } = useDashboardStore()

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey:        ['logistics', selectedDC, dateRange],
    queryFn:         () => fetchLogistics(selectedDC, dateRange),
    refetchInterval: 60_000,
  })

  if (isLoading) return <CardSkeleton className="h-full" />

  if (isError) {
    return (
      <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3">
        <Truck size={32} className="text-slate-300" />
        <p className="text-sm text-slate-500">Failed to load logistics data.</p>
        <button onClick={() => void refetch()} className="text-xs text-indigo-600 hover:underline font-medium">Retry</button>
      </div>
    )
  }

  const { fulfillmentRate, onTimeDelivery, overstockItems, stockoutIncidents, deliveryPerformance } = data!

  const kpis: KpiProps[] = [
    { label: 'Fulfillment Rate',  value: `${fulfillmentRate}%`,  icon: <CheckCircle2 size={16} className="text-emerald-600" />, colorClass: 'bg-emerald-100 dark:bg-emerald-900/40', sub: fulfillmentRate >= 95 ? 'On target' : 'Below target' },
    { label: 'On-Time Delivery',  value: `${onTimeDelivery}%`,   icon: <Clock        size={16} className="text-blue-600"    />, colorClass: 'bg-blue-100 dark:bg-blue-900/40',    sub: onTimeDelivery >= 90 ? 'Healthy' : 'Needs attention' },
    { label: 'Overstock Items',   value: overstockItems,          icon: <PackageOpen  size={16} className="text-amber-600"   />, colorClass: 'bg-amber-100 dark:bg-amber-900/40',  sub: 'Active SKUs' },
    { label: 'Stockout Incidents',value: stockoutIncidents,       icon: <AlertOctagon size={16} className="text-red-600"     />, colorClass: 'bg-red-100 dark:bg-red-900/40',      sub: 'This period' },
  ]

  return (
    <Card className="h-full flex flex-col p-5">
      <CardHeader
        className="mb-3 shrink-0"
        title="Logistics & Performance"
        subtitle="Delivery performance breakdown by month"
        action={
          <button
            onClick={() => void refetch()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        }
      />

      {/* KPI tiles — compact 2×2 grid */}
      <div className="shrink-0 grid grid-cols-2 gap-2 mb-3">
        {kpis.map(kpi => <KpiTile key={kpi.label} {...kpi} />)}
      </div>

      {/* Chart fills remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <p className="shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Delivery Performance
        </p>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={deliveryPerformance}
              margin={{ top: 0, right: 0, left: -28, bottom: 0 }}
              barCategoryGap="28%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} iconType="circle" iconSize={8} />
              <Bar dataKey="early"   name="Early"   fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="onTime"  name="On Time"  fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="delayed" name="Delayed"  fill="#f43f5e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}
