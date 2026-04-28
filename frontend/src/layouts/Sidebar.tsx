import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Warehouse, Truck,
  Users, Settings, ChevronLeft, ChevronRight,
  Package,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useSidebarStore } from '@/store/sidebarStore'

const NAV_ITEMS = [
  { path: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { path: '/forecasting', label: 'Forecasting',  icon: TrendingUp      },
  { path: '/inventory',   label: 'Inventory',    icon: Warehouse        },
  { path: '/orders',      label: 'Suppliers',    icon: Users            },
  { path: '/logistics',   label: 'Logistics',    icon: Truck            },
  { path: '/settings',    label: 'Settings',     icon: Settings         },
] as const

export function Sidebar() {
  const { isCollapsed, toggle, setCollapsed } = useSidebarStore()
  const location = useLocation()

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setCollapsed(true)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setCollapsed])

  return (
    <aside
      className={clsx(
        'bg-[#0f172a] flex flex-col shrink-0 transition-all duration-300 ease-in-out relative z-30',
        isCollapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo section */}
      <div className={clsx(
        'h-16 flex items-center border-b border-slate-700/60 shrink-0',
        isCollapsed ? 'justify-center px-2' : 'px-5',
      )}>
        <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <Package size={15} className="text-white" />
        </div>
        {!isCollapsed && (
          <span className="ml-2.5 font-bold text-sm text-white tracking-wide whitespace-nowrap">
            SmartRetail
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {!isCollapsed && (
          <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Main Menu
          </p>
        )}
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path + '/')
          return (
            <NavLink
              key={path}
              to={path}
              title={isCollapsed ? label : undefined}
              className={clsx(
                'flex items-center rounded-xl transition-all duration-150 group relative',
                isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                isCollapsed && isActive && 'border-l-0 ring-1 ring-indigo-500',
              )}
            >
              <Icon
                size={18}
                className={clsx(
                  'shrink-0 transition-colors',
                  isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300',
                )}
              />
              {!isCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap">{label}</span>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {label}
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Version badge */}
      {!isCollapsed && (
        <div className="px-5 py-3 border-t border-slate-700/60">
          <p className="text-[10px] text-slate-600 font-medium">Version 1.0 — Sprint 2</p>
          <p className="text-[10px] text-slate-600">SmartRetail MVP</p>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className={clsx(
          'absolute -right-3 top-20 h-6 w-6 rounded-full bg-slate-700 border border-slate-600',
          'flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-500',
          'transition-all duration-150 shadow-md z-50',
        )}
        aria-label="Toggle sidebar"
      >
        {isCollapsed
          ? <ChevronRight size={12} />
          : <ChevronLeft  size={12} />
        }
      </button>
    </aside>
  )
}
