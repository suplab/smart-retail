// Public surface of the API layer — import from here in application code.
// Each endpoint module contains: ARS response type, mapper, and exported fetch fn.
export { apiClient }                    from './client'
export { fetchForecastFromAPI }         from './endpoints/forecast'
export { fetchInventoryFromAPI,
         fetchInventoryItems }          from './endpoints/inventory'
export { fetchOrdersFromAPI }           from './endpoints/orders'
export { fetchLogisticsFromAPI }        from './endpoints/logistics'
