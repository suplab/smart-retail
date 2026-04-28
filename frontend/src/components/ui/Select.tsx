import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value:      string
  onChange:   (value: string) => void
  options:    SelectOption[]
  className?: string
  size?:      'sm' | 'md'
}

export function Select({ value, onChange, options, className, size = 'md' }: SelectProps) {
  return (
    <div className={clsx('relative inline-block', className)}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={clsx(
          'appearance-none w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600',
          'text-slate-800 dark:text-slate-200 font-medium rounded-xl pr-8 cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
          'hover:border-indigo-300 transition-colors',
          size === 'sm' && 'pl-3 py-1.5 text-xs',
          size === 'md' && 'pl-3.5 py-2 text-sm',
        )}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
        size={14}
      />
    </div>
  )
}
