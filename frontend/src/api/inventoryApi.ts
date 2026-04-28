/**
 * @deprecated Superseded by `@/api/endpoints/inventory`.
 * This shim re-exports for backward compatibility during the migration period.
 * Remove once all callers have been updated to import from the new location.
 */
export { fetchInventoryItems as fetchInventoryDashboard } from './endpoints/inventory'
