import { cn } from '@/lib/utils'

type ProgressBarProps = {
  value: number
  className?: string
  indicatorClassName?: string
  label?: string
}

export function ProgressBar({
  className,
  indicatorClassName,
  label = 'Progress',
  value,
}: ProgressBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, value))

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(normalizedValue)}
      className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
    >
      <div
        className={cn(
          'h-full rounded-full bg-primary transition-all duration-500 ease-out',
          indicatorClassName,
        )}
        style={{ width: `${normalizedValue}%` }}
      />
    </div>
  )
}
