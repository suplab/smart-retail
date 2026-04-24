import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/common/AppShell'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { LoginPage } from '@/routes/LoginPage'

// Route-level code splitting — mandatory per CLAUDE.md §6.3
const InventoryView = lazy(() => import('@/routes/InventoryView'))
const ForecastingView = lazy(() => import('@/routes/ForecastingView'))
const ReplenishmentView = lazy(() => import('@/routes/ReplenishmentView'))
const SupplierPortalView = lazy(() => import('@/routes/SupplierPortalView'))

export default function App(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <AppShell>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner size="md" />}>
          <Routes>
            <Route path="/" element={<Navigate to="/inventory" replace />} />
            <Route path="/inventory" element={<InventoryView />} />
            <Route path="/forecasting" element={<ForecastingView />} />
            <Route path="/replenishment" element={<ReplenishmentView />} />
            <Route path="/supplier" element={<SupplierPortalView />} />
            <Route path="*" element={<Navigate to="/inventory" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  )
}
