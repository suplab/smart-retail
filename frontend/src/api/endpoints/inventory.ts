import { apiClient } from '../client'
import type { InventoryData } from '@/types/dashboard'
import type { InventoryItem } from '@/types/inventory'

// ---------------------------------------------------------------------------
// ARS response contract — GET /v1/dashboard/inventory
// ---------------------------------------------------------------------------
// The ARS Lambda reads the `inventory-positions` DynamoDB table via
// GSI-DC-Alerts (PK=dcId) and returns both a pre-computed KPI summary and
// the raw per-SKU items for potential drill-down.

interface ARSInventoryResponse {
  dcId:  string
  dcName: string
  /**
   * Total stock value in USD — computed server-side as sum(currentStock × unitCostUSD)
   * per SKU, where unitCostUSD comes from a pricing reference in the same table.
   * Falls back to 0 if the pricing reference is missing (handled by mapper).
   */
  stockValueUSD:    number
  /** Sum of currentStock across all SKUs in this DC. */
  onHandUnits:      number
  /**
   * Units currently in transit to this DC, sourced from the SUP service
   * ShipmentUpdated events persisted by IMS.
   */
  inTransitUnits:   number
  /** True if any SKU in this DC has currentStock < safetyStockThreshold. */
  reorderRequired:  boolean
  /** Count of SKUs where alertStatus = LOW_STOCK. */
  lowStockSkuCount: number
  /** Paginated raw SKU-level items for drill-down. */
  items:     InventoryItem[]
  nextToken: string | null
  totalCount: number
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapInventory(res: ARSInventoryResponse): InventoryData {
  // If the backend does not yet return stockValueUSD (partial rollout), derive
  // a rough proxy from onHandUnits so the card still renders meaningful data.
  const stockValue = res.stockValueUSD > 0
    ? res.stockValueUSD
    : res.onHandUnits * 85   // $85 estimated average unit cost — update when pricing data is live

  return {
    dc:             res.dcName || res.dcId,
    stockValue,
    onHand:         res.onHandUnits,
    inTransit:      res.inTransitUnits,
    reorderRequired: res.reorderRequired,
    lowStockAlerts:  res.lowStockSkuCount,
  }
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

export async function fetchInventoryFromAPI(dcId: string): Promise<InventoryData> {
  const { data } = await apiClient.get<ARSInventoryResponse>('/v1/dashboard/inventory', {
    params: { dcId, limit: 100 },
  })
  return mapInventory(data)
}

/**
 * Raw paginated inventory fetch — used by future drill-down views.
 * Components should prefer fetchInventoryFromAPI for dashboard cards.
 */
export async function fetchInventoryItems(
  dcId?: string,
  limit = 20,
  nextToken?: string,
): Promise<ARSInventoryResponse> {
  const params: Record<string, string | number> = { limit }
  if (dcId)       params.dcId = dcId
  if (nextToken)  params.nextToken = nextToken
  const { data } = await apiClient.get<ARSInventoryResponse>('/v1/dashboard/inventory', { params })
  return data
}
