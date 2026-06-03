import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { selectCurrentUser } from '@/features/auth/authSlice'

export function PlatformAdminGuard() {
  const user = useAppSelector(selectCurrentUser)

  if (!user?.platform_admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
