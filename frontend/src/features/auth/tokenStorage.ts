import type { AuthUser, WorkspaceSummary } from './types'

const ACCESS_TOKEN_KEY = 'defect_ai.access_token'
const REFRESH_TOKEN_KEY = 'defect_ai.refresh_token'
const USER_KEY = 'defect_ai.user'
const WORKSPACE_KEY = 'defect_ai.current_workspace'

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export const tokenStorage = {
  getAccessToken() {
    if (!canUseStorage()) return null
    return window.localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken() {
    return null
  },

  getUser(): AuthUser | null {
    if (!canUseStorage()) return null

    const value = window.localStorage.getItem(USER_KEY)
    if (!value) return null

    try {
      return JSON.parse(value) as AuthUser
    } catch {
      return null
    }
  },

  getCurrentWorkspace(): WorkspaceSummary | null {
    if (!canUseStorage()) return null

    const value = window.localStorage.getItem(WORKSPACE_KEY)
    if (!value) return null

    try {
      return JSON.parse(value) as WorkspaceSummary
    } catch {
      return null
    }
  },

  setSession(_tokens: unknown, user?: AuthUser | null, currentWorkspace?: WorkspaceSummary | null) {
    if (!canUseStorage()) return

    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)

    if (user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user))
    }

    if (currentWorkspace) {
      window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(currentWorkspace))
    }
  },

  clearSession() {
    if (!canUseStorage()) return

    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
    window.localStorage.removeItem(WORKSPACE_KEY)
    window.localStorage.removeItem('auth_token')
  },
}
