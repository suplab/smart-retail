import React from 'react'
import { Bell, Sun, Moon, Menu, ChevronRight, User } from 'lucide-react'
import { useSidebarStore } from '@/store/sidebarStore'
import { useDashboardStore } from '@/store/dashboardStore'

const ENV = (import.meta.env.VITE_APP_ENV ?? 'DEV') as string

const envConfig: Record<string, { label: string; className: string }> = {
  DEV:     { label: 'DEV',     className: 'bg-amber-100 text-amber-700 border border-amber-200' },
  QA:      { label: 'QA',      className: 'bg-blue-100 text-blue-700 border border-blue-200' },
  STAGING: { label: 'STAGING', className: 'bg-violet-100 text-violet-700 border border-violet-200' },
  PROD:    { label: 'PROD',    className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
}

export function Header() {
  const { toggle }        = useSidebarStore()
  const { isDarkMode, toggleDarkMode } = useDashboardStore()

  const envInfo = envConfig[ENV] ?? envConfig['DEV']

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-4 z-40 shrink-0 shadow-sm">
      {/* Hamburger */}
      <button
        onClick={toggle}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Logo + Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" fill="currentColor" fillOpacity=".9" />
          </svg>
        </div>
        <div className="min-w-0">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate block leading-tight">
            Smart Retail Platform
          </span>
          <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
            Supply Chain & Forecasting
          </span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="hidden lg:flex items-center gap-1 text-xs text-slate-400 ml-2">
        <ChevronRight size={12} />
        <span>Dashboard</span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* Env tag */}
        <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider ${envInfo.className}`}>
          {envInfo.label}
        </span>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* User avatar */}
        <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">Supply Planner</p>
            <p className="text-[10px] text-slate-400 leading-tight">Admin</p>
          </div>
        </button>
      </div>
    </header>
  )
}
