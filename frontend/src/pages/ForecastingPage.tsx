import { TrendingUp, Info } from 'lucide-react'
import { ForecastCard } from '@/features/forecast/ForecastCard'
import { Select }        from '@/components/ui/Select'
import { useDashboardStore } from '@/store/dashboardStore'
import { DATE_RANGES, DISTRIBUTION_CENTERS } from '@/types/dashboard'

function PageHeader() {
  const { selectedDC, setSelectedDC, dateRange, setDateRange } = useDashboardStore()
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <TrendingUp size={18} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Demand Forecasting</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">ML-powered demand predictions at SKU × DC granularity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedDC} onChange={setSelectedDC} options={DISTRIBUTION_CENTERS.map(d => ({ value: d.value, label: d.label }))} size="sm" className="w-52" />
          <Select value={dateRange} onChange={v => setDateRange(v as typeof dateRange)} options={DATE_RANGES} size="sm" />
        </div>
      </div>
    </div>
  )
}

export function ForecastingPage() {
  return (
    <div className="min-h-full">
      <PageHeader />
      <div className="p-6 space-y-5">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
          <Info size={16} className="text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">SageMaker DeepAR — Daily Batch</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
              Forecasts are generated each day before 06:00 local time using the DeepAR algorithm.
              Model path stored in Parameter Store at <code className="bg-indigo-100 dark:bg-indigo-800 px-1 rounded">/smartretail/ml/active-model-path</code>.
            </p>
          </div>
        </div>
        {/* Full-width forecast card */}
        <ForecastCard />
        {/* Model metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Algorithm',       value: 'DeepAR'    },
            { label: 'Horizon',         value: '30 days'   },
            { label: 'Training Depth',  value: '12 months' },
            { label: 'Last Run',        value: 'Today 05:48' },
          ].map(m => (
            <div key={m.label} className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">{m.label}</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
