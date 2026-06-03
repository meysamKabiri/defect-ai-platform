import { useEffect, useRef, useState } from 'react'
import {
  Building2,
  Check,
  ChevronDown,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  selectCurrentWorkspace,
  selectWorkspaces,
  setCurrentWorkspace,
} from '@/features/auth/authSlice'
import type { WorkspaceSummary } from '@/features/auth/types'
import { baseApi } from '@/services/baseApi'
import { cn } from '@/lib/utils'

function roleLabel(role: string) {
  return role.toLowerCase().replaceAll('_', ' ')
}

type WorkspaceSwitcherProps = {
  className?: string
}

export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps) {
  const dispatch = useAppDispatch()
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const workspaces = useAppSelector(selectWorkspaces)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hasMultipleWorkspaces = workspaces.length > 1

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  if (!currentWorkspace) return null

  if (!hasMultipleWorkspaces) {
    return (
      <div className={cn('flex min-w-0 items-center gap-2', className)}>
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {currentWorkspace.name}
          </p>
          <p className="text-xs capitalize text-muted-foreground">
            {roleLabel(currentWorkspace.role)}
          </p>
        </div>
      </div>
    )
  }

  const handleSelect = (workspace: WorkspaceSummary) => {
    if (workspace.id === currentWorkspace.id) {
      setIsOpen(false)
      return
    }

    dispatch(setCurrentWorkspace(workspace))
    dispatch(baseApi.util.resetApiState())
    setIsOpen(false)
  }

  return (
    <div className={cn('relative min-w-0', className)} ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex h-11 min-w-0 max-w-[18rem] items-center gap-2 rounded-xl border border-border bg-surface px-3 text-left transition hover:border-primary/40 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {currentWorkspace.name}
          </p>
          <p className="text-xs capitalize text-muted-foreground">
            {roleLabel(currentWorkspace.role)}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'ml-auto size-4 shrink-0 text-muted-foreground transition',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
          role="listbox"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Switch workspace
            </p>
          </div>
          <div className="grid max-h-80 overflow-auto p-2">
            {workspaces.map((workspace) => {
              const isSelected = workspace.id === currentWorkspace.id

              return (
                <button
                  aria-selected={isSelected}
                  className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted data-[selected=true]:bg-primary/10"
                  data-selected={isSelected}
                  key={workspace.id}
                  onClick={() => handleSelect(workspace)}
                  role="option"
                  type="button"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
                    <Building2 className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {workspace.name}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {roleLabel(workspace.role)}
                    </p>
                  </div>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
