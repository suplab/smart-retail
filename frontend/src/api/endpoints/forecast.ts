import { apiClient } from '../client'
import type { ForecastData, ForecastDataPoint, StockoutRisk } from '@/types/dashboard'

// ---------------------------------------------------------------------------
// ARS response contract — GET /v1/dashboard/forecast
// ---------------------------------------------------------------------------
// The ARS Lambda aggregates per-SKU daily DynamoDB `forecasts` records into
// monthly buckets per DC and returns the summary below.
// Field names follow camelCase; units are documented inline.

interface ARSTrendPoint {
  /** Month abbreviation matching the frontend x-axis: "Jan", "Feb", … */
  period:      string
  /** Sum of actual sales quantities for all SKUs in this DC for the period. */
  actualQty:   number
  /** Sum of ML-predicted quantities for all SKUs in this DC for the period. */
  forecastQty: number
}

interface ARSForecastResponse {
  dcId:            string
  /** Next-period predicted total demand across all SKUs in the DC. */
  predictedDemand: number
  /** Total units sold in the selected date range. */
  unitsSold:       number
  /** Forecast MAPE-based accuracy percentage (0–100). */
  accuracyPct:     number
  /** Aggregate stockout risk derived from safety-stock evaluations. */
  stockoutRisk:    'Low' | 'Moderate' | 'High'
  trendData:       ARSTrendPoint[]
}

// ---------------------------------------------------------------------------
// Mapper — ARS shape → ForecastData (frontend display type)
// ---------------------------------------------------------------------------

function mapForecast(res: ARSForecastResponse): ForecastData {
  return {
    predictedDemand: res.predictedDemand,
    unitsSold:       res.unitsSold,
    accuracy:        res.accuracyPct,
    stockoutRisk:    res.stockoutRisk as StockoutRisk,
    data: res.trendData.map((p): ForecastDataPoint => ({
      month:    p.period,
      actual:   p.actualQty,
      forecast: p.forecastQty,
    })),
  }
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

export async function fetchForecastFromAPI(
  dcId: string,
  dateRange: string,
): Promise<ForecastData> {
  const { data } = await apiClient.get<ARSForecastResponse>('/v1/dashboard/forecast', {
    params: { dcId, dateRange },
  })
  return mapForecast(data)
}
