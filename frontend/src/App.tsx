import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/layouts/AppLayout'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { LoginPage } from '@/routes/LoginPage'

// Route-level code splitting — mandatory per CLAUDE.md §6.3
const DashboardPage   = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ForecastingPage = lazy(() => import('@/pages/ForecastingPage').then(m => ({ default: m.ForecastingPage })))
const InventoryPage   = lazy(() => import('@/pages/InventoryPage').then(m => ({ default: m.InventoryPage })))
const SuppliersPage   = lazy(() => import('@/pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })))
const LogisticsPage   = lazy(() => import('@/pages/LogisticsPage').then(m => ({ default: m.LogisticsPage })))
const SettingsPage    = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" />
    </div>
  )
}

export default function App(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
              <rect x="2"  y="2"  width="9" height="9" rx="2" fill="currentColor" />
              <rect x="13" y="2"  width="9" height="9" rx="2" fill="currentColor" fillOpacity=".7" />
              <rect x="2"  y="13" width="9" height="9" rx="2" fill="currentColor" fillOpacity=".7" />
              <rect x="13" y="13" width="9" height="9" rx="2" fill="currentColor" fillOpacity=".4" />
            </svg>
          </div>
          <LoadingSpinner size="md" />
          <p className="text-sm text-slate-500">Loading Smart Retail Platform…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
          } />
          <Route path="/forecasting" element={
            <Suspense fallback={<PageLoader />}><ForecastingPage /></Suspense>
          } />
          <Route path="/inventory" element={
            <Suspense fallback={<PageLoader />}><InventoryPage /></Suspense>
          } />
          <Route path="/orders" element={
            <Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense>
          } />
          <Route path="/logistics" element={
            <Suspense fallback={<PageLoader />}><LogisticsPage /></Suspense>
          } />
          <Route path="/settings" element={
            <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>
          } />
          {/* Legacy route aliases — keep existing deep links working */}
          <Route path="/replenishment" element={<Navigate to="/orders" replace />} />
          <Route path="/supplier"      element={<Navigate to="/orders" replace />} />
          <Route path="*"              element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
