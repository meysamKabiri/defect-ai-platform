import { Navigate, Outlet } from 'react-router-dom'
import { Spinner } from '@/components/common/Spinner'
import { ROUTES } from '@/constants/routes'
import { useAppSelector } from '@/app/hooks'
import { selectAuthStatus, selectIsAuthenticated } from '@/features/auth/authSlice'

export function PublicRoute() {
  const status = useAppSelector(selectAuthStatus)
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  if (status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return <Outlet />
}
