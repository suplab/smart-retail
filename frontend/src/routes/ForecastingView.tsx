
/**
 * Forecasting View — Sprint 2 Week 2+ deliverable.
 * Golden thread excludes DFS (CLAUDE.md §4.1).
 * Placeholder until DFS service and forecast API are implemented.
 */
export default function ForecastingView(): JSX.Element {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Demand Forecasting</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
        <p className="font-semibold">Sprint 2 Week 2+ Deliverable</p>
        <p className="text-sm mt-1">
          The Demand Forecasting view will display ML-generated forecasts from the DFS service.
          DFS is excluded from the golden thread (CLAUDE.md §4.1).
          Implement after SIS and IMS are validated end-to-end.
        </p>
      </div>
    </div>
  )
}
