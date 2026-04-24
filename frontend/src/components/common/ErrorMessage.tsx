import React from 'react'

interface ErrorMessageProps { error: unknown }

export function ErrorMessage({ error }: ErrorMessageProps): JSX.Element {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
      <p className="font-semibold">Failed to load data</p>
      <p className="text-sm mt-1">{message}</p>
    </div>
  )
}
