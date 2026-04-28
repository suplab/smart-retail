export type StockoutRisk  = 'Low' | 'Moderate' | 'High'
export type OrderStatus   = 'Delivered' | 'In Transit' | 'Delayed'
export type DateRange     = '7d' | '30d' | '90d' | '1y'

export interface ForecastDataPoint {
  month:    string
  actual:   number
  forecast: number
}

export interface ForecastData {
  data:            ForecastDataPoint[]
  unitsSold:       number
  accuracy:        number
  stockoutRisk:    StockoutRisk
  predictedDemand: number
}

export interface InventoryData {
  dc:               string
  stockValue:       number
  onHand:           number
  inTransit:        number
  reorderRequired:  boolean
  lowStockAlerts:   number
}

export interface Order {
  id:        string
  poNumber:  string
  supplier:  string
  eta:       string
  status:    OrderStatus
  amount:    number
  sku:       string
}

export interface OrdersData {
  orders: Order[]
  total:  number
}

export interface DeliveryMetric {
  month:   string
  early:   number
  onTime:  number
  delayed: number
}

export interface LogisticsData {
  fulfillmentRate:      number
  onTimeDelivery:       number
  overstockItems:       number
  stockoutIncidents:    number
  deliveryPerformance:  DeliveryMetric[]
}

export const DISTRIBUTION_CENTERS = [
  { value: 'dc-a', label: 'Distribution Center A' },
  { value: 'dc-b', label: 'Distribution Center B' },
  { value: 'dc-c', label: 'Distribution Center C – North' },
  { value: 'dc-d', label: 'Distribution Center D – South' },
] as const

export const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: '7d',  label: 'Last 7 days'  },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y',  label: 'Last year'    },
]
