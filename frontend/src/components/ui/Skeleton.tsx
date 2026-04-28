import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
  rounded?:   'sm' | 'md' | 'lg' | 'full'
}

export function Skeleton({ className, rounded = 'md' }: SkeletonProps) {
  return (
    <div className={clsx(
      'skeleton',
      rounded === 'sm'   && 'rounded',
      rounded === 'md'   && 'rounded-lg',
      rounded === 'lg'   && 'rounded-2xl',
      rounded === 'full' && 'rounded-full',
      className,
    )} />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-6 w-28" rounded="full" />
      </div>
      <Skeleton className="h-52 w-full" rounded="lg" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-14" rounded="lg" />
        <Skeleton className="h-14" rounded="lg" />
        <Skeleton className="h-14" rounded="lg" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 p-6 space-y-3">
      <Skeleton className="h-5 w-40 mb-5" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-20" rounded="full" />
        </div>
      ))}
    </div>
  )
}
