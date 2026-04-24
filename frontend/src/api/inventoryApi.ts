import axios from 'axios'
import type { DashboardInventoryResponse } from '@/types/inventory'

/**
 * API client for the ARS inventory dashboard endpoint.
 * In production, this file is replaced by the OpenAPI Generator output (CLAUDE.md §6.3 / CG-06).
 * This hand-written version is the MVP stub until the spec is finalised and linted.
 *
 * Base URL is injected from environment variable (VITE_API_BASE_URL) — never hardcoded (CG-03).
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string | undefined ?? '',
  headers: { 'Content-Type': 'application/json' },
})

// Attach Cognito JWT to every request
apiClient.interceptors.request.use(async (config) => {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth')
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // Unauthenticated — API Gateway will reject if auth is required
  }
  return config
})

export async function fetchInventoryDashboard(
  dcId?: string,
  limit = 20,
  nextToken?: string,
): Promise<DashboardInventoryResponse> {
  const params: Record<string, string | number> = { limit }
  if (dcId) params.dcId = dcId
  if (nextToken) params.nextToken = nextToken

  const response = await apiClient.get<DashboardInventoryResponse>('/v1/dashboard/inventory', { params })
  return response.data
}
