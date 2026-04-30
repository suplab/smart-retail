import { type ReactNode, useState } from 'react'
import { Settings, Moon, Sun, RefreshCw, Info } from 'lucide-react'
import { useDashboardStore } from '@/store/dashboardStore'

interface SettingsRowProps {
  label:    string
  sub?:     string
  children: ReactNode
}
function SettingsRow({ label, sub, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

interface ToggleProps { checked: boolean; onChange: () => void }
function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export function SettingsPage() {
  const { isDarkMode, toggleDarkMode } = useDashboardStore()
  const [notifications, setNotifications] = useState(true)
  const [autoRefresh,   setAutoRefresh]   = useState(true)

  return (
    <div className="min-h-full">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Settings size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Settings</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Dashboard preferences and configuration</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-2xl space-y-5">
        {/* Appearance */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">Appearance</h2>
          <p className="text-xs text-slate-400 mb-4">Control how the dashboard looks</p>
          <SettingsRow
            label="Dark Mode"
            sub="Switch between light and dark theme"
          >
            <div className="flex items-center gap-2">
              {isDarkMode ? <Moon size={14} className="text-indigo-400" /> : <Sun size={14} className="text-amber-500" />}
              <Toggle checked={isDarkMode} onChange={toggleDarkMode} />
            </div>
          </SettingsRow>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">Notifications</h2>
          <p className="text-xs text-slate-400 mb-4">Alert and notification preferences</p>
          <SettingsRow label="Low Stock Alerts" sub="Notify when SKU stock drops below threshold">
            <Toggle checked={notifications} onChange={() => setNotifications(p => !p)} />
          </SettingsRow>
          <SettingsRow label="DLQ Depth Alerts" sub="Alert when dead-letter queue depth > 0">
            <Toggle checked={true} onChange={() => undefined} />
          </SettingsRow>
        </div>

        {/* Data refresh */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">Data Refresh</h2>
          <p className="text-xs text-slate-400 mb-4">Configure auto-refresh intervals</p>
          <SettingsRow label="Auto Refresh" sub="Automatically poll for updates">
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className="text-slate-400" />
              <Toggle checked={autoRefresh} onChange={() => setAutoRefresh(p => !p)} />
            </div>
          </SettingsRow>
          <SettingsRow label="Forecast Interval"  sub="How often forecast data refreshes"><span className="text-sm font-medium text-slate-600 dark:text-slate-300">30s</span></SettingsRow>
          <SettingsRow label="Inventory Interval" sub="How often inventory data refreshes"><span className="text-sm font-medium text-slate-600 dark:text-slate-300">15s</span></SettingsRow>
          <SettingsRow label="Logistics Interval" sub="How often logistics data refreshes"><span className="text-sm font-medium text-slate-600 dark:text-slate-300">60s</span></SettingsRow>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">About</h2>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Platform',   value: 'SmartRetail Supply Chain'   },
              { label: 'Version',    value: '1.0.0 — MVP Sprint 2'        },
              { label: 'Build',      value: import.meta.env.VITE_APP_ENV ?? 'DEV' },
              { label: 'Stack',      value: 'React 18 + TypeScript + Vite' },
              { label: 'Author',     value: 'Suplab Debnath, Cognizant'   },
            ].map(row => (
              <div key={row.label} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
          <Info size={14} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Settings are persisted to localStorage. Cognito authentication required for production use.
          </p>
        </div>
      </div>
    </div>
  )
}
