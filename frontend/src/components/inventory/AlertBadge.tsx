import type { AlertStatus } from '@/types/inventory'
import { clsx } from 'clsx'

const CONFIG: Record<AlertStatus, { label: string; classes: string }> = {
  NORMAL:    { label: 'Normal',    classes: 'bg-green-100 text-green-800' },
  LOW_STOCK: { label: 'Low Stock', classes: 'bg-red-100 text-red-800' },
  OVERSTOCK: { label: 'Overstock', classes: 'bg-amber-100 text-amber-800' },
}

export function AlertBadge({ status }: { status: AlertStatus }): JSX.Element {
  const { label, classes } = CONFIG[status]
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', classes)}>
      {label}
    </span>
  )
}
