import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAppSelector } from '@/app/hooks'
import {
  selectIsAuthenticated,
  selectNeedsWorkspaceSelection,
} from '@/features/auth/authSlice'

export function RootRedirect() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const needsWorkspaceSelection = useAppSelector(selectNeedsWorkspaceSelection)
  const target = needsWorkspaceSelection ? ROUTES.selectWorkspace : ROUTES.dashboard

  return <Navigate to={isAuthenticated ? target : ROUTES.auth} replace />
}
