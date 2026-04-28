/**
 * API facade — the only import surface for all four dashboard data calls.
 *
 * VITE_USE_MOCK_API=true  (default in .env.development)
 *   → returns local mock data with a simulated network delay; no backend needed.
 *
 * VITE_USE_MOCK_API=false  (.env.production, or .env.local override)
 *   → calls the real ARS Lambda endpoints via VITE_API_BASE_URL.
 *
 * The constant is replaced at build time by Vite, so the unused branch is
 * tree-shaken from production bundles.
 */

import type { ForecastData, InventoryData, OrdersData, LogisticsData } from '@/types/dashboard'
import { MOCK_FORECAST, MOCK_INVENTORY, getMockOrders, MOCK_LOGISTICS } from './mockData'
import { fetchForecastFromAPI }  from '@/api/endpoints/forecast'
import { fetchInventoryFromAPI } from '@/api/endpoints/inventory'
import { fetchOrdersFromAPI }    from '@/api/endpoints/orders'
import { fetchLogisticsFromAPI } from '@/api/endpoints/logistics'

// True unless VITE_USE_MOCK_API is explicitly "false" — safe fallback default.
const USE_MOCK = (import.meta.env.VITE_USE_MOCK_API as string | undefined) !== 'false'

const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms))

async function simulateFetch<T>(data: T): Promise<T> {
  await delay(600 + Math.random() * 200)
  return data
}

// ---------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------

export async function fetchForecast(dc: string, range: string): Promise<ForecastData> {
  if (USE_MOCK) return simulateFetch(MOCK_FORECAST[dc] ?? MOCK_FORECAST['dc-a'])
  return fetchForecastFromAPI(dc, range)
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export async function fetchInventory(dc: string): Promise<InventoryData> {
  if (USE_MOCK) return simulateFetch(MOCK_INVENTORY[dc] ?? MOCK_INVENTORY['dc-a'])
  return fetchInventoryFromAPI(dc)
}

// ---------------------------------------------------------------------------
// Orders / Purchase Orders
// ---------------------------------------------------------------------------

export async function fetchOrders(dc: string, page = 1, pageSize = 5): Promise<OrdersData> {
  if (USE_MOCK) return simulateFetch(getMockOrders(page, pageSize))
  return fetchOrdersFromAPI(dc, page, pageSize)
}

// ---------------------------------------------------------------------------
// Logistics
// ---------------------------------------------------------------------------

export async function fetchLogistics(dc: string, range: string): Promise<LogisticsData> {
  if (USE_MOCK) return simulateFetch(MOCK_LOGISTICS[dc] ?? MOCK_LOGISTICS['dc-a'])
  return fetchLogisticsFromAPI(dc, range)
}
