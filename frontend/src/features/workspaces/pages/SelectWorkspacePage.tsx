import { useEffect } from 'react'
import {
  Building2,
  CheckCircle2,
  LogOut,
} from 'lucide-react'
import {
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { Panel } from '@/components/common/Panel'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ROUTES } from '@/constants/routes'
import { useLogoutMutation } from '@/features/auth/api/authApi'
import {
  selectCurrentWorkspace,
  selectWorkspaces,
  setCurrentWorkspace,
} from '@/features/auth/authSlice'
import type { WorkspaceSummary } from '@/features/auth/types'
import { baseApi } from '@/services/baseApi'

type RouteState = {
  from?: {
    pathname?: string
    search?: string
  }
}

function roleLabel(role: string) {
  return role.toLowerCase().replaceAll('_', ' ')
}

function destinationFromState(state: unknown) {
  const routeState = state as RouteState | null
  const from = routeState?.from
  if (!from?.pathname || from.pathname === ROUTES.selectWorkspace) {
    return ROUTES.dashboard
  }

  return `${from.pathname}${from.search ?? ''}`
}

function destinationAfterLogin(state: unknown) {
  return state ? destinationFromState(state) : ROUTES.dashboard
}

export function SelectWorkspacePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const workspaces = useAppSelector(selectWorkspaces)
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation()

  useEffect(() => {
    if (!currentWorkspace && workspaces.length === 1) {
      dispatch(setCurrentWorkspace(workspaces[0]))
      dispatch(baseApi.util.resetApiState())
      navigate(destinationAfterLogin(location.state), { replace: true })
    }
  }, [currentWorkspace, dispatch, location.state, navigate, workspaces])

  if (currentWorkspace) {
    return <Navigate to={destinationAfterLogin(location.state)} replace />
  }

  const handleSelect = (workspace: WorkspaceSummary) => {
    dispatch(setCurrentWorkspace(workspace))
    dispatch(baseApi.util.resetApiState())
    navigate(destinationAfterLogin(location.state), { replace: true })
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8 text-foreground">
      <section className="grid w-full max-w-3xl gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="size-6" aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase text-muted-foreground">
              DefectAI workspace
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Choose a workspace
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Select the company workspace you want to inspect, review, and manage.
            </p>
          </div>
          <Button
            isLoading={isLoggingOut}
            leftIcon={<LogOut className="size-4" aria-hidden="true" />}
            onClick={() => void logout().unwrap().catch(() => undefined)}
            variant="secondary"
          >
            Logout
          </Button>
        </div>

        <Panel>
          <div className="grid gap-3 p-4 sm:p-5">
            {workspaces.length ? (
              workspaces.map((workspace) => (
                <button
                  className="flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  key={workspace.id}
                  onClick={() => handleSelect(workspace)}
                  type="button"
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-foreground">
                      {workspace.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {workspace.slug ?? 'workspace'}
                    </p>
                  </div>
                  <StatusBadge tone="primary">{roleLabel(workspace.role)}</StatusBadge>
                  <CheckCircle2 className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-background p-5 text-sm leading-6 text-muted-foreground">
                No active workspaces are available for this account.
              </div>
            )}
          </div>
        </Panel>
      </section>
    </main>
  )
}
