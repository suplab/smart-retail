import { apiClient } from '../client'
import type { OrdersData, Order, OrderStatus } from '@/types/dashboard'

// ---------------------------------------------------------------------------
// ARS response contract — GET /v1/dashboard/orders
// ---------------------------------------------------------------------------
// The ARS Lambda reads the `purchase-orders` DynamoDB table via
// GSI-Supplier-Status and returns paginated PO summaries.

type ARSOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'CONFIRMED'
  | 'DELAYED'
  | 'FAILED'

interface ARSOrderItem {
  poId:         string
  poNumber:     string
  supplierId:   string
  supplierName: string
  skuId:        string
  /** Total PO value in USD. */
  totalValue:   number
  status:       ARSOrderStatus
  /** ISO-8601 date string — e.g. "2024-06-15T00:00:00Z" */
  eta:          string
  createdAt:    string
}

interface ARSOrdersResponse {
  items:     ARSOrderItem[]
  total:     number
  nextToken: string | null
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

// Map Step-Functions saga states → simplified frontend display statuses.
const STATUS_MAP: Record<ARSOrderStatus, OrderStatus> = {
  DRAFT:            'In Transit',
  PENDING_APPROVAL: 'In Transit',
  APPROVED:         'In Transit',
  DISPATCHED:       'In Transit',
  CONFIRMED:        'Delivered',
  DELAYED:          'Delayed',
  FAILED:           'Delayed',
}

function mapOrder(item: ARSOrderItem): Order {
  return {
    id:       item.poId,
    poNumber: item.poNumber,
    supplier: item.supplierName,
    // Truncate ISO timestamp to YYYY-MM-DD for table display
    eta:      item.eta.slice(0, 10),
    status:   STATUS_MAP[item.status] ?? 'In Transit',
    amount:   item.totalValue,
    sku:      item.skuId,
  }
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

export async function fetchOrdersFromAPI(
  dcId: string,
  page = 1,
  pageSize = 5,
): Promise<OrdersData> {
  const { data } = await apiClient.get<ARSOrdersResponse>('/v1/dashboard/orders', {
    params: { dcId, page, pageSize },
  })
  return {
    orders: data.items.map(mapOrder),
    total:  data.total,
  }
}
