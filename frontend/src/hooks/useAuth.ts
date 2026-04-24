import { useState, useEffect } from 'react'
import { getCurrentUser, signOut as amplifySignOut } from 'aws-amplify/auth'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  username: string | null
  userGroups: string[]
}

/**
 * Auth hook using AWS Amplify Auth v6 (Cognito).
 * Separate internal and supplier user pools are distinguished by the Cognito group claim.
 * No custom auth flows (CLAUDE.md §6.3).
 */
export function useAuth(): AuthState & { signOut: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    username: null,
    userGroups: [],
  })

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth(): Promise<void> {
    try {
      const user = await getCurrentUser()
      setState({
        isAuthenticated: true,
        isLoading: false,
        username: user.username,
        userGroups: [],
      })
    } catch {
      setState({ isAuthenticated: false, isLoading: false, username: null, userGroups: [] })
    }
  }

  async function signOut(): Promise<void> {
    await amplifySignOut()
    setState({ isAuthenticated: false, isLoading: false, username: null, userGroups: [] })
  }

  return { ...state, signOut }
}
