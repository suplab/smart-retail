import { apiClient } from '../client'
import type { LogisticsData, DeliveryMetric } from '@/types/dashboard'

// ---------------------------------------------------------------------------
// ARS response contract — GET /v1/dashboard/logistics
// ---------------------------------------------------------------------------
// The ARS Lambda aggregates ShipmentUpdated events (from the `ars-shipment-queue`
// SQS subscriber) to produce per-DC delivery performance KPIs and monthly trends.

interface ARSTrendPoint {
  /** Month abbreviation: "Jan", "Feb", … */
  period:       string
  earlyCount:   number
  onTimeCount:  number
  delayedCount: number
}

interface ARSLogisticsResponse {
  dcId: string
  /** Percentage of orders fully fulfilled (0–100). */
  fulfillmentRatePct:    number
  /** Percentage of shipments arriving on or before ETA (0–100). */
  onTimeDeliveryPct:     number
  /** Count of SKUs currently flagged as overstock in IMS. */
  overstockItemCount:    number
  /** Count of stockout events recorded in the selected date range. */
  stockoutIncidentCount: number
  /** Monthly delivery performance breakdown for the bar chart. */
  deliveryTrend: ARSTrendPoint[]
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapLogistics(res: ARSLogisticsResponse): LogisticsData {
  return {
    fulfillmentRate:     res.fulfillmentRatePct,
    onTimeDelivery:      res.onTimeDeliveryPct,
    overstockItems:      res.overstockItemCount,
    stockoutIncidents:   res.stockoutIncidentCount,
    deliveryPerformance: res.deliveryTrend.map((p): DeliveryMetric => ({
      month:   p.period,
      early:   p.earlyCount,
      onTime:  p.onTimeCount,
      delayed: p.delayedCount,
    })),
  }
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

export async function fetchLogisticsFromAPI(
  dcId: string,
  dateRange: string,
): Promise<LogisticsData> {
  const { data } = await apiClient.get<ARSLogisticsResponse>('/v1/dashboard/logistics', {
    params: { dcId, dateRange },
  })
  return mapLogistics(data)
}
