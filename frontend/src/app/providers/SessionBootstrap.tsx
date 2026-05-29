import { useEffect, useRef, type ReactNode } from 'react'
import { useAppDispatch } from '@/app/hooks'
import { useRefreshSessionMutation } from '@/features/auth/api/authApi'
import { logout, setSessionChecking } from '@/features/auth/authSlice'

export function SessionBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()
  const [refreshSession] = useRefreshSessionMutation()
  const hasBootstrapped = useRef(false)

  useEffect(() => {
    if (hasBootstrapped.current) return
    hasBootstrapped.current = true

    dispatch(setSessionChecking())

    refreshSession()
      .unwrap()
      .catch(() => {
        dispatch(logout())
      })
  }, [dispatch, refreshSession])

  return children
}
