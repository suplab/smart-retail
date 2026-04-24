/** Type definitions for the Inventory domain — mirrors the ARS OpenAPI spec. */

export type AlertStatus = 'NORMAL' | 'LOW_STOCK' | 'OVERSTOCK'

export interface InventoryItem {
  skuId: string
  dcId: string
  currentStock: string
  safetyStockThreshold: string
  overstockThreshold: string
  alertStatus: AlertStatus
  lastUpdated: string
}

export interface DashboardInventoryResponse {
  items: InventoryItem[]
  nextToken: string | null
  totalCount: number
}
