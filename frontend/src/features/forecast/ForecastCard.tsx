import { useQuery } from '@tanstack/react-query'
import {
  ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useDashboardStore } from '@/store/dashboardStore'
import { fetchForecast } from '@/services/api'
import type { StockoutRisk } from '@/types/dashboard'
import type { BadgeVariant } from '@/components/ui/Badge'

const riskVariant: Record<StockoutRisk, BadgeVariant> = {
  Low:      'success',
  Moderate: 'warning',
  High:     'danger',
}

interface TooltipEntry {
  dataKey: string
  name:    string
  value:   number
  color:   string
}
interface TooltipPayload {
  active?:  boolean
  payload?: TooltipEntry[]
  label?:   string
}

function ChartTooltip({ active, payload, label }: TooltipPayload) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg px-3 py-2.5">
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs py-0.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {entry.value.toLocaleString()} units
          </span>
        </div>
      ))}
    </div>
  )
}

export function ForecastCard() {
  const { selectedDC, dateRange } = useDashboardStore()

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey:       ['forecast', selectedDC, dateRange],
    queryFn:        () => fetchForecast(selectedDC, dateRange),
    refetchInterval: 30_000,
  })

  if (isLoading) return <CardSkeleton />

  if (isError) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center justify-center gap-3 min-h-[280px]">
        <TrendingUp size={32} className="text-slate-300" />
        <p className="text-sm text-slate-500">Failed to load forecast data.</p>
        <button onClick={() => refetch()} className="text-xs text-indigo-600 hover:underline font-medium">
          Retry
        </button>
      </div>
    )
  }

  const { data: chartData, unitsSold, accuracy, stockoutRisk, predictedDemand } = data!

  const visibleData = chartData.map(d => ({
    ...d,
    actual: d.actual === 0 ? null : d.actual,
  }))

  return (
    <Card>
      <CardHeader
        title="Sales Forecast"
        subtitle="Actual vs predicted demand — rolling 12 months"
        badge={
          <Badge variant="success" dot>
            Predicted Demand: {predictedDemand.toLocaleString()} units
          </Badge>
        }
        action={
          <button
            onClick={() => void refetch()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
            title="Refresh forecast"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        }
      />

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={visibleData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}k`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              fill="url(#fcGrad)"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer metrics */}
      <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100 dark:border-slate-700">
        <div className="text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium uppercase tracking-wide">Units Sold</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {unitsSold.toLocaleString()}
          </p>
        </div>
        <div className="text-center border-x border-slate-100 dark:border-slate-700">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium uppercase tracking-wide">Accuracy</p>
          <p className="text-2xl font-bold text-emerald-600">{accuracy}%</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium uppercase tracking-wide">Stockout Risk</p>
          <div className="flex justify-center mt-0.5">
            <Badge variant={riskVariant[stockoutRisk]} dot>{stockoutRisk}</Badge>
          </div>
        </div>
      </div>
    </Card>
  )
}
