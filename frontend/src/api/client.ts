import axios, { type AxiosError } from 'axios'

// ARS API Gateway base URL — injected from env, never hardcoded (CLAUDE.md CG-03).
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
})

// Attach Cognito ID token when the app is running against a real pool.
// Skipped in demo mode (no Cognito vars) — API Gateway will 401 if auth is required.
apiClient.interceptors.request.use(async config => {
  const hasCognito = Boolean(
    import.meta.env.VITE_COGNITO_USER_POOL_ID &&
    import.meta.env.VITE_COGNITO_CLIENT_ID,
  )
  if (hasCognito) {
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth')
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch {
      // No active session — request proceeds without auth header
    }
  }
  return config
})

// Unwrap API Gateway error envelopes into plain Error objects.
apiClient.interceptors.response.use(
  res => res,
  (err: AxiosError<{ message?: string }>) => {
    const message =
      err.response?.data?.message ??
      err.message ??
      'Unknown API error'
    return Promise.reject(new Error(message))
  },
)
