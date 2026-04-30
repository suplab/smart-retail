import React, { useState } from 'react'
import { Package } from 'lucide-react'

// When real Cognito env vars are absent, render a demo-mode bypass form
// instead of the Amplify Authenticator, which hangs without a configured pool.
const hasCognito = Boolean(
  import.meta.env.VITE_COGNITO_USER_POOL_ID &&
  import.meta.env.VITE_COGNITO_CLIENT_ID,
)

function AmplifyAuth() {
  const [AuthUI, setAuthUI] = React.useState<React.ComponentType | null>(null)

  React.useEffect(() => {
    // Lazy-load Amplify UI only when Cognito is actually configured so the
    // bundle is excluded from demo builds and won't hang without a pool.
    void import('@aws-amplify/ui-react').then(mod => {
      setAuthUI(() => mod.Authenticator as React.ComponentType)
    })
  }, [])

  if (!AuthUI) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 rounded-full border-b-2 border-indigo-600" />
      </div>
    )
  }
  return <AuthUI />
}

function DemoLoginForm() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Navigate to dashboard — useAuth mock returns isAuthenticated immediately
    window.location.href = '/dashboard'
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          defaultValue="supply.planner@smartretail.io"
          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-500"
          readOnly
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          type="password"
          defaultValue="demo-password"
          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-500"
          readOnly
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : null}
        {loading ? 'Signing in…' : 'Sign in to Dashboard'}
      </button>
      <p className="text-center text-xs text-slate-400 pt-1">
        Demo mode — no Cognito pool required
      </p>
    </form>
  )
}

export function LoginPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg mb-4">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Smart Retail Platform</h1>
          <p className="text-sm text-slate-500 mt-1">Supply Chain &amp; Demand Forecasting</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-7">
          <h2 className="text-base font-semibold text-slate-800 mb-5">
            {hasCognito ? 'Sign in to your account' : 'Sign in'}
          </h2>
          {hasCognito ? <AmplifyAuth /> : <DemoLoginForm />}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          SmartRetail v1.0 · Sprint 2 MVP
        </p>
      </div>
    </div>
  )
}
