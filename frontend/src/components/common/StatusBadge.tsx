import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Radio, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusTone = 'danger' | 'default' | 'primary' | 'success' | 'warning'

type StatusBadgeProps = {
  children?: ReactNode
  className?: string
  status?: string
  tone?: StatusTone
}

const toneClasses: Record<StatusTone, string> = {
  danger: 'border-danger/20 bg-danger/10 text-danger',
  default: 'border-border bg-muted text-muted-foreground',
  primary: 'border-primary/20 bg-primary/10 text-primary',
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/20 bg-warning/10 text-warning',
}

function getTone(status?: string): StatusTone {
  switch (status) {
    case 'completed':
    case 'complete':
      return 'success'
    case 'failed':
    case 'error':
      return 'danger'
    case 'processing':
    case 'uploading':
      return 'primary'
    case 'queued':
      return 'warning'
    default:
      return 'default'
  }
}

function getIcon(status?: string) {
  switch (status) {
    case 'completed':
    case 'complete':
      return CheckCircle2
    case 'failed':
    case 'error':
      return AlertTriangle
    case 'processing':
    case 'uploading':
      return Loader2
    case 'queued':
      return Clock3
    case 'idle':
      return Radio
    default:
      return UploadCloud
  }
}

export function StatusBadge({
  children,
  className,
  status,
  tone,
}: StatusBadgeProps) {
  const resolvedTone = tone ?? getTone(status)
  const Icon = getIcon(status)

  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
        toneClasses[resolvedTone],
        className,
      )}
    >
      <Icon
        className={cn(
          'size-3.5',
          (status === 'processing' || status === 'uploading') && 'animate-spin',
        )}
        aria-hidden="true"
      />
      <span className="truncate">{children ?? status ?? 'idle'}</span>
    </span>
  )
}
