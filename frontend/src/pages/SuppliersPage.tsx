import { Users } from 'lucide-react'
import { OrdersTable } from '@/features/orders/OrdersTable'

export function SuppliersPage() {
  return (
    <div className="min-h-full">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <Users size={18} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Supplier Orders</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Purchase orders, ETAs, and fulfillment status</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Supplier KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Suppliers', value: '6',   color: 'text-indigo-600' },
            { label: 'Open POs',         value: '12',  color: 'text-amber-600'  },
            { label: 'Delayed POs',      value: '4',   color: 'text-red-600'    },
            { label: 'On-Time Rate',     value: '83%', color: 'text-emerald-600'},
          ].map(kpi => (
            <div key={kpi.label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">{kpi.label}</p>
              <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
        <OrdersTable />
      </div>
    </div>
  )
}
