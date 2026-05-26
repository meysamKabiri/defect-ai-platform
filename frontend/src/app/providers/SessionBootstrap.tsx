import { useEffect, type ReactNode } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useRefreshSessionMutation } from '@/features/auth/api/authApi'
import { logout, selectAccessToken, selectAuthStatus, setSessionChecking } from '@/features/auth/authSlice'

export function SessionBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()
  const accessToken = useAppSelector(selectAccessToken)
  const status = useAppSelector(selectAuthStatus)
  const [refreshSession] = useRefreshSessionMutation()

  useEffect(() => {
    if (!accessToken || status !== 'authenticated') return

    dispatch(setSessionChecking())

    refreshSession()
      .unwrap()
      .catch(() => {
        dispatch(logout())
      })
  }, [accessToken, dispatch, refreshSession, status])

  return children
}
