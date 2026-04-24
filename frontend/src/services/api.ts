import type { ForecastData, InventoryData, OrdersData, LogisticsData } from '@/types/dashboard'
import { MOCK_FORECAST, MOCK_INVENTORY, getMockOrders, MOCK_LOGISTICS } from './mockData'

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

async function simulateFetch<T>(data: T, ms = 600): Promise<T> {
  await delay(ms + Math.random() * 200)
  return data
}

export async function fetchForecast(dc: string, _range: string): Promise<ForecastData> {
  return simulateFetch(MOCK_FORECAST[dc] ?? MOCK_FORECAST['dc-a'])
}

export async function fetchInventory(dc: string): Promise<InventoryData> {
  return simulateFetch(MOCK_INVENTORY[dc] ?? MOCK_INVENTORY['dc-a'])
}

export async function fetchOrders(
  _dc: string, page = 1, pageSize = 8,
): Promise<OrdersData> {
  return simulateFetch(getMockOrders(page, pageSize))
}

export async function fetchLogistics(dc: string, _range: string): Promise<LogisticsData> {
  return simulateFetch(MOCK_LOGISTICS[dc] ?? MOCK_LOGISTICS['dc-a'])
}
