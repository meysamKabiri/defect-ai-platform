import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { selectCurrentUser } from '@/features/auth/authSlice'
import type { UserRole } from '@/features/auth/types'
import { ROUTES } from '@/constants/routes'

type RoleGuardProps = {
  allowedRoles: UserRole[]
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const user = useAppSelector(selectCurrentUser)

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return <Outlet />
}
