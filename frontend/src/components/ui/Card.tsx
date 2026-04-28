import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children:   ReactNode
  className?: string
  noPadding?: boolean
}

export function Card({ children, className, noPadding }: CardProps) {
  return (
    <div className={clsx(
      'bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700',
      !noPadding && 'p-6',
      className,
    )}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title:       string
  subtitle?:   string
  action?:     ReactNode
  badge?:      ReactNode
  className?:  string
}

export function CardHeader({ title, subtitle, action, badge, className }: CardHeaderProps) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 mb-5', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardDivider() {
  return <hr className="border-slate-100 dark:border-slate-700 my-5" />
}
