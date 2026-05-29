import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAppSelector } from '@/app/hooks'
import { selectIsAuthenticated } from '@/features/auth/authSlice'

export function RootRedirect() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  return <Navigate to={isAuthenticated ? ROUTES.dashboard : ROUTES.auth} replace />
}
