import type {
  ForecastData, InventoryData, OrdersData, LogisticsData, Order,
} from '@/types/dashboard'

export const MOCK_FORECAST: Record<string, ForecastData> = {
  'dc-a': {
    predictedDemand: 1750,
    unitsSold: 1200,
    accuracy: 92,
    stockoutRisk: 'Low',
    data: [
      { month: 'Jul', actual: 980,  forecast: 950  },
      { month: 'Aug', actual: 1050, forecast: 1020 },
      { month: 'Sep', actual: 1120, forecast: 1100 },
      { month: 'Oct', actual: 1380, forecast: 1350 },
      { month: 'Nov', actual: 1550, forecast: 1520 },
      { month: 'Dec', actual: 1820, forecast: 1800 },
      { month: 'Jan', actual: 1200, forecast: 1250 },
      { month: 'Feb', actual: 1100, forecast: 1150 },
      { month: 'Mar', actual: 1320, forecast: 1300 },
      { month: 'Apr', actual: 1450, forecast: 1420 },
      { month: 'May', actual: 1580, forecast: 1600 },
      { month: 'Jun', actual: 0,    forecast: 1750 },
    ],
  },
  'dc-b': {
    predictedDemand: 2100,
    unitsSold: 1650,
    accuracy: 88,
    stockoutRisk: 'Moderate',
    data: [
      { month: 'Jul', actual: 1200, forecast: 1150 },
      { month: 'Aug', actual: 1350, forecast: 1300 },
      { month: 'Sep', actual: 1480, forecast: 1500 },
      { month: 'Oct', actual: 1620, forecast: 1650 },
      { month: 'Nov', actual: 1800, forecast: 1820 },
      { month: 'Dec', actual: 2200, forecast: 2150 },
      { month: 'Jan', actual: 1450, forecast: 1500 },
      { month: 'Feb', actual: 1380, forecast: 1400 },
      { month: 'Mar', actual: 1560, forecast: 1580 },
      { month: 'Apr', actual: 1720, forecast: 1700 },
      { month: 'May', actual: 1850, forecast: 1900 },
      { month: 'Jun', actual: 0,    forecast: 2100 },
    ],
  },
  'dc-c': {
    predictedDemand: 1350,
    unitsSold: 980,
    accuracy: 79,
    stockoutRisk: 'High',
    data: [
      { month: 'Jul', actual: 720,  forecast: 700  },
      { month: 'Aug', actual: 780,  forecast: 810  },
      { month: 'Sep', actual: 850,  forecast: 880  },
      { month: 'Oct', actual: 920,  forecast: 900  },
      { month: 'Nov', actual: 980,  forecast: 1000 },
      { month: 'Dec', actual: 1200, forecast: 1150 },
      { month: 'Jan', actual: 820,  forecast: 850  },
      { month: 'Feb', actual: 760,  forecast: 780  },
      { month: 'Mar', actual: 890,  forecast: 900  },
      { month: 'Apr', actual: 940,  forecast: 960  },
      { month: 'May', actual: 1010, forecast: 1050 },
      { month: 'Jun', actual: 0,    forecast: 1350 },
    ],
  },
  'dc-d': {
    predictedDemand: 1900,
    unitsSold: 1480,
    accuracy: 94,
    stockoutRisk: 'Low',
    data: [
      { month: 'Jul', actual: 1100, forecast: 1080 },
      { month: 'Aug', actual: 1180, forecast: 1200 },
      { month: 'Sep', actual: 1250, forecast: 1230 },
      { month: 'Oct', actual: 1420, forecast: 1400 },
      { month: 'Nov', actual: 1600, forecast: 1580 },
      { month: 'Dec', actual: 1950, forecast: 1900 },
      { month: 'Jan', actual: 1300, forecast: 1320 },
      { month: 'Feb', actual: 1180, forecast: 1200 },
      { month: 'Mar', actual: 1380, forecast: 1360 },
      { month: 'Apr', actual: 1520, forecast: 1500 },
      { month: 'May', actual: 1660, forecast: 1680 },
      { month: 'Jun', actual: 0,    forecast: 1900 },
    ],
  },
}

export const MOCK_INVENTORY: Record<string, InventoryData> = {
  'dc-a': { dc: 'Distribution Center A', stockValue: 750000, onHand: 1100, inTransit: 450,  reorderRequired: true,  lowStockAlerts: 5 },
  'dc-b': { dc: 'Distribution Center B', stockValue: 920000, onHand: 1480, inTransit: 620,  reorderRequired: false, lowStockAlerts: 2 },
  'dc-c': { dc: 'DC C – North',          stockValue: 380000, onHand: 620,  inTransit: 180,  reorderRequired: true,  lowStockAlerts: 8 },
  'dc-d': { dc: 'DC D – South',          stockValue: 680000, onHand: 980,  inTransit: 390,  reorderRequired: false, lowStockAlerts: 3 },
}

const ALL_ORDERS: Order[] = [
  { id: '1',  poNumber: 'PO-2024-001', supplier: 'Apex Supplies Ltd',    eta: '2024-06-15', status: 'Delivered',  amount: 48500,  sku: 'SKU-1042' },
  { id: '2',  poNumber: 'PO-2024-002', supplier: 'GlobalTrade Co.',      eta: '2024-06-18', status: 'In Transit', amount: 72300,  sku: 'SKU-0887' },
  { id: '3',  poNumber: 'PO-2024-003', supplier: 'NorthStar Goods',      eta: '2024-06-10', status: 'Delayed',    amount: 31200,  sku: 'SKU-2201' },
  { id: '4',  poNumber: 'PO-2024-004', supplier: 'Meridian Wholesale',   eta: '2024-06-20', status: 'Delivered',  amount: 95600,  sku: 'SKU-3310' },
  { id: '5',  poNumber: 'PO-2024-005', supplier: 'SunRise Imports',      eta: '2024-06-22', status: 'In Transit', amount: 18900,  sku: 'SKU-0114' },
  { id: '6',  poNumber: 'PO-2024-006', supplier: 'BlueSky Trading',      eta: '2024-06-12', status: 'Delayed',    amount: 42100,  sku: 'SKU-1198' },
  { id: '7',  poNumber: 'PO-2024-007', supplier: 'Apex Supplies Ltd',    eta: '2024-06-25', status: 'In Transit', amount: 67800,  sku: 'SKU-0556' },
  { id: '8',  poNumber: 'PO-2024-008', supplier: 'TerraFirm Logistics',  eta: '2024-06-28', status: 'Delivered',  amount: 29400,  sku: 'SKU-4490' },
  { id: '9',  poNumber: 'PO-2024-009', supplier: 'GlobalTrade Co.',      eta: '2024-07-02', status: 'In Transit', amount: 88200,  sku: 'SKU-0231' },
  { id: '10', poNumber: 'PO-2024-010', supplier: 'Meridian Wholesale',   eta: '2024-07-05', status: 'Delivered',  amount: 54700,  sku: 'SKU-1567' },
  { id: '11', poNumber: 'PO-2024-011', supplier: 'NorthStar Goods',      eta: '2024-07-08', status: 'In Transit', amount: 33100,  sku: 'SKU-2098' },
  { id: '12', poNumber: 'PO-2024-012', supplier: 'SunRise Imports',      eta: '2024-07-10', status: 'Delayed',    amount: 21600,  sku: 'SKU-0789' },
  { id: '13', poNumber: 'PO-2024-013', supplier: 'BlueSky Trading',      eta: '2024-07-12', status: 'Delivered',  amount: 76400,  sku: 'SKU-3344' },
  { id: '14', poNumber: 'PO-2024-014', supplier: 'TerraFirm Logistics',  eta: '2024-07-15', status: 'In Transit', amount: 45900,  sku: 'SKU-1122' },
  { id: '15', poNumber: 'PO-2024-015', supplier: 'Apex Supplies Ltd',    eta: '2024-07-18', status: 'Delivered',  amount: 62300,  sku: 'SKU-0443' },
  { id: '16', poNumber: 'PO-2024-016', supplier: 'GlobalTrade Co.',      eta: '2024-07-20', status: 'In Transit', amount: 39800,  sku: 'SKU-2299' },
  { id: '17', poNumber: 'PO-2024-017', supplier: 'Meridian Wholesale',   eta: '2024-06-08', status: 'Delayed',    amount: 58100,  sku: 'SKU-3901' },
  { id: '18', poNumber: 'PO-2024-018', supplier: 'NorthStar Goods',      eta: '2024-07-25', status: 'Delivered',  amount: 84600,  sku: 'SKU-0678' },
  { id: '19', poNumber: 'PO-2024-019', supplier: 'SunRise Imports',      eta: '2024-07-28', status: 'In Transit', amount: 27300,  sku: 'SKU-1834' },
  { id: '20', poNumber: 'PO-2024-020', supplier: 'BlueSky Trading',      eta: '2024-07-30', status: 'Delivered',  amount: 91200,  sku: 'SKU-2560' },
]

export function getMockOrders(page = 1, pageSize = 8): OrdersData {
  const start = (page - 1) * pageSize
  return {
    orders: ALL_ORDERS.slice(start, start + pageSize),
    total:  ALL_ORDERS.length,
  }
}

export const MOCK_LOGISTICS: Record<string, LogisticsData> = {
  'dc-a': {
    fulfillmentRate:   96,
    onTimeDelivery:    88,
    overstockItems:    12,
    stockoutIncidents: 3,
    deliveryPerformance: [
      { month: 'Jan', early: 42, onTime: 98,  delayed: 12 },
      { month: 'Feb', early: 38, onTime: 105, delayed: 8  },
      { month: 'Mar', early: 55, onTime: 118, delayed: 15 },
      { month: 'Apr', early: 48, onTime: 112, delayed: 10 },
      { month: 'May', early: 62, onTime: 125, delayed: 7  },
      { month: 'Jun', early: 35, onTime: 98,  delayed: 18 },
    ],
  },
  'dc-b': {
    fulfillmentRate:   91,
    onTimeDelivery:    83,
    overstockItems:    21,
    stockoutIncidents: 7,
    deliveryPerformance: [
      { month: 'Jan', early: 30, onTime: 88,  delayed: 22 },
      { month: 'Feb', early: 35, onTime: 95,  delayed: 18 },
      { month: 'Mar', early: 42, onTime: 102, delayed: 25 },
      { month: 'Apr', early: 28, onTime: 90,  delayed: 30 },
      { month: 'May', early: 45, onTime: 110, delayed: 15 },
      { month: 'Jun', early: 32, onTime: 88,  delayed: 20 },
    ],
  },
  'dc-c': {
    fulfillmentRate:   84,
    onTimeDelivery:    76,
    overstockItems:    4,
    stockoutIncidents: 14,
    deliveryPerformance: [
      { month: 'Jan', early: 18, onTime: 72,  delayed: 28 },
      { month: 'Feb', early: 22, onTime: 78,  delayed: 32 },
      { month: 'Mar', early: 15, onTime: 68,  delayed: 38 },
      { month: 'Apr', early: 20, onTime: 75,  delayed: 25 },
      { month: 'May', early: 25, onTime: 82,  delayed: 20 },
      { month: 'Jun', early: 12, onTime: 65,  delayed: 35 },
    ],
  },
  'dc-d': {
    fulfillmentRate:   98,
    onTimeDelivery:    94,
    overstockItems:    8,
    stockoutIncidents: 1,
    deliveryPerformance: [
      { month: 'Jan', early: 65, onTime: 128, delayed: 5  },
      { month: 'Feb', early: 58, onTime: 118, delayed: 8  },
      { month: 'Mar', early: 72, onTime: 135, delayed: 4  },
      { month: 'Apr', early: 68, onTime: 130, delayed: 6  },
      { month: 'May', early: 80, onTime: 145, delayed: 3  },
      { month: 'Jun', early: 55, onTime: 115, delayed: 9  },
    ],
  },
}
