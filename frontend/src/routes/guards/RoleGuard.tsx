import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { selectWorkspaceRole } from '@/features/auth/authSlice'
import type { WorkspaceRole } from '@/features/auth/types'
import { ROUTES } from '@/constants/routes'

type RoleGuardProps = {
  allowedRoles: WorkspaceRole[]
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const workspaceRole = useAppSelector(selectWorkspaceRole)

  if (!workspaceRole || !allowedRoles.includes(workspaceRole)) {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return <Outlet />
}
