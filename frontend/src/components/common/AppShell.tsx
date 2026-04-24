import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/forecasting', label: 'Forecasting', icon: '📈' },
  { to: '/replenishment', label: 'Replenishment', icon: '🔄' },
  { to: '/supplier', label: 'Supplier Portal', icon: '🤝' },
]

export function AppShell({ children }: { children: React.ReactNode }): JSX.Element {
  const { username, signOut } = useAuth()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-brand-900 text-white flex flex-col">
        <div className="px-4 py-5 border-b border-brand-700">
          <h1 className="text-lg font-bold">SmartRetail</h1>
          <p className="text-xs text-brand-300 mt-0.5">Supply Chain Platform</p>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-200 hover:bg-brand-800 hover:text-white'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-brand-700">
          <p className="text-xs text-brand-300 truncate">{username}</p>
          <button
            onClick={signOut}
            className="mt-2 text-xs text-brand-300 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
