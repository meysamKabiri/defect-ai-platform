import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: 'article' | 'aside' | 'section'
  title?: string
  eyebrow?: string
  description?: string
  action?: ReactNode
}

export function Panel({
  action,
  as: Component = 'section',
  children,
  className,
  description,
  eyebrow,
  title,
  ...props
}: PanelProps) {
  return (
    <Component
      className={cn(
        'rounded-2xl border border-border bg-surface shadow-card transition-colors',
        className,
      )}
      {...props}
    >
      {(title || eyebrow || description || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </Component>
  )
}
