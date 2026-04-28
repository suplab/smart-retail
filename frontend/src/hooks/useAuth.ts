import { useState, useEffect } from 'react'

interface AuthState {
  isAuthenticated: boolean
  isLoading:       boolean
  username:        string | null
  userGroups:      string[]
}

interface UseAuthReturn extends AuthState {
  signOut: () => Promise<void>
}

// When Cognito env vars are absent (local dev / demo), return a pre-authenticated
// mock user so the dashboard loads immediately without a real Cognito pool.
const hasCognito = Boolean(
  import.meta.env.VITE_COGNITO_USER_POOL_ID &&
  import.meta.env.VITE_COGNITO_CLIENT_ID,
)

const MOCK_STATE: AuthState = {
  isAuthenticated: true,
  isLoading:       false,
  username:        'supply.planner@smartretail.io',
  userGroups:      ['SupplyChainPlanner'],
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading:       true,
    username:        null,
    userGroups:      [],
  })

  useEffect(() => {
    if (!hasCognito) {
      // Short artificial delay so the loading screen is visible for UX demo
      const t = setTimeout(() => setState(MOCK_STATE), 400)
      return () => clearTimeout(t)
    }

    // Real Cognito path — dynamically imported so it tree-shakes in demo mode
    let cancelled = false
    void import('aws-amplify/auth').then(({ getCurrentUser }) =>
      getCurrentUser()
        .then(user => {
          if (!cancelled) {
            setState({
              isAuthenticated: true,
              isLoading:       false,
              username:        user.username,
              userGroups:      [],
            })
          }
        })
        .catch(() => {
          if (!cancelled) {
            setState({ isAuthenticated: false, isLoading: false, username: null, userGroups: [] })
          }
        }),
    )
    return () => { cancelled = true }
  }, [])

  async function signOut(): Promise<void> {
    if (hasCognito) {
      const { signOut: amplifySignOut } = await import('aws-amplify/auth')
      await amplifySignOut()
    }
    setState({ isAuthenticated: false, isLoading: false, username: null, userGroups: [] })
  }

  return { ...state, signOut }
}
