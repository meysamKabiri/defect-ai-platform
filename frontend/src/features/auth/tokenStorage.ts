import type { AuthTokens, AuthUser } from './types'

const ACCESS_TOKEN_KEY = 'defect_ai.access_token'
const REFRESH_TOKEN_KEY = 'defect_ai.refresh_token'
const USER_KEY = 'defect_ai.user'

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export const tokenStorage = {
  getAccessToken() {
    if (!canUseStorage()) return null
    return window.localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken() {
    if (!canUseStorage()) return null
    return window.localStorage.getItem(REFRESH_TOKEN_KEY)
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

  setSession(tokens: AuthTokens, user?: AuthUser | null) {
    if (!canUseStorage()) return

    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)

    if (tokens.refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
    }

    if (user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
  },

  clearSession() {
    if (!canUseStorage()) return

    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
    window.localStorage.removeItem('auth_token')
  },
}
