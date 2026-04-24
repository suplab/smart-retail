import React from 'react'
import { clsx } from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps): JSX.Element {
  return (
    <div className="flex items-center justify-center p-8">
      <div
        className={clsx(
          'animate-spin rounded-full border-b-2 border-brand-600',
          size === 'sm' && 'w-5 h-5',
          size === 'md' && 'w-8 h-8',
          size === 'lg' && 'w-12 h-12',
        )}
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}
