import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import { tokenStorage } from './tokenStorage'
import type { AuthResponse, AuthUser, SessionStatus } from './types'

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  status: SessionStatus
  error: string | null
}

const persistedAccessToken = tokenStorage.getAccessToken()
const persistedRefreshToken = tokenStorage.getRefreshToken()
const persistedUser = tokenStorage.getUser()

const initialState: AuthState = {
  user: persistedUser,
  accessToken: persistedAccessToken,
  refreshToken: persistedRefreshToken,
  status: persistedAccessToken ? 'authenticated' : 'anonymous',
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSessionChecking(state) {
      state.status = 'checking'
      state.error = null
    },

    setCredentials(state, action: PayloadAction<AuthResponse>) {
      state.user = action.payload.user ?? state.user
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken ?? state.refreshToken
      state.status = 'authenticated'
      state.error = null

      tokenStorage.setSession(
        {
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
        },
        action.payload.user,
      )
    },

    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
    },

    setAuthError(state, action: PayloadAction<string>) {
      state.error = action.payload
      state.status = 'anonymous'
    },

    logout(state) {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.status = 'anonymous'
      state.error = null
      tokenStorage.clearSession()
    },
  },
})

export const { setSessionChecking, setCredentials, setUser, setAuthError, logout } = authSlice.actions
export const authReducer = authSlice.reducer

export const selectAuth = (state: RootState) => state.auth
export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectAccessToken = (state: RootState) => state.auth.accessToken
export const selectAuthStatus = (state: RootState) => state.auth.status
export const selectIsAuthenticated = createSelector(
  selectAuth,
  (auth) => auth.status === 'authenticated' && Boolean(auth.accessToken),
)
