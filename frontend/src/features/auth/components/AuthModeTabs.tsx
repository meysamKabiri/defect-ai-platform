import { Building2, LockKeyhole } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AuthMode = 'login' | 'signUp'

type AuthModeTabsProps = {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
}

const modes: Array<{
  icon: typeof LockKeyhole
  label: string
  value: AuthMode
}> = [
  {
    icon: LockKeyhole,
    label: 'Sign in',
    value: 'login',
  },
  {
    icon: Building2,
    label: 'New workspace',
    value: 'signUp',
  },
]

export function AuthModeTabs({ mode, onModeChange }: AuthModeTabsProps) {
  return (
    <div className="grid grid-cols-2 rounded-2xl border border-border bg-muted p-1" role="tablist" aria-label="Authentication mode">
      {modes.map(({ icon: Icon, label, value }) => {
        const isSelected = mode === value

        return (
          <button
            aria-selected={isSelected}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring hover:text-foreground',
              isSelected && 'bg-surface text-foreground shadow-card',
            )}
            key={value}
            role="tab"
            type="button"
            onClick={() => onModeChange(value)}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
