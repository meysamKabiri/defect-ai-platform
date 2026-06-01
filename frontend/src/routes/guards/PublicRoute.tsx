import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@/components/common/Spinner'
import { ROUTES } from '@/constants/routes'
import { useAppSelector } from '@/app/hooks'
import {
  selectAuthStatus,
  selectIsAuthenticated,
  selectNeedsWorkspaceSelection,
} from '@/features/auth/authSlice'

export function PublicRoute() {
  const location = useLocation()
  const status = useAppSelector(selectAuthStatus)
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const needsWorkspaceSelection = useAppSelector(selectNeedsWorkspaceSelection)

  if (status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={needsWorkspaceSelection ? ROUTES.selectWorkspace : ROUTES.dashboard}
        replace
        state={location.state}
      />
    )
  }

  return <Outlet />
}
