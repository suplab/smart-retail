import React from 'react'
import { clsx } from 'clsx'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-slate-100 text-slate-700',
  success:  'bg-emerald-100 text-emerald-700',
  warning:  'bg-amber-100 text-amber-700',
  danger:   'bg-red-100 text-red-700',
  info:     'bg-indigo-100 text-indigo-700',
  neutral:  'bg-blue-100 text-blue-700',
}

interface BadgeProps {
  variant?:  BadgeVariant
  children:  React.ReactNode
  className?: string
  dot?:      boolean
}

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {dot && (
        <span className={clsx(
          'h-1.5 w-1.5 rounded-full',
          variant === 'success' && 'bg-emerald-500',
          variant === 'warning' && 'bg-amber-500',
          variant === 'danger'  && 'bg-red-500',
          variant === 'info'    && 'bg-indigo-500',
          variant === 'neutral' && 'bg-blue-500',
          variant === 'default' && 'bg-slate-500',
        )} />
      )}
      {children}
    </span>
  )
}
