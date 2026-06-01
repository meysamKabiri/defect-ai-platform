import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import { tokenStorage } from './tokenStorage'
import type { AuthResponse, AuthUser, SessionStatus, WorkspaceSummary } from './types'

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  currentWorkspace: WorkspaceSummary | null
  workspaces: WorkspaceSummary[]
  status: SessionStatus
  error: string | null
}

const persistedAccessToken = tokenStorage.getAccessToken()
const persistedRefreshToken = tokenStorage.getRefreshToken()
const persistedUser = tokenStorage.getUser()
const persistedWorkspace = tokenStorage.getCurrentWorkspace()

const initialState: AuthState = {
  user: persistedUser,
  accessToken: persistedAccessToken,
  refreshToken: persistedRefreshToken,
  currentWorkspace: persistedWorkspace,
  workspaces: persistedWorkspace ? [persistedWorkspace] : [],
  status: 'checking',
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
      const workspaces = action.payload.workspaces ?? state.workspaces
      const selectedWorkspace = tokenStorage.resolveCurrentWorkspace(workspaces)

      state.user = action.payload.user ?? state.user
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken ?? state.refreshToken
      state.workspaces = workspaces
      state.currentWorkspace = selectedWorkspace
      state.status = 'authenticated'
      state.error = null

      tokenStorage.setSession(
        {
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
        },
        action.payload.user,
        selectedWorkspace,
      )
    },

    setCurrentWorkspace(state, action: PayloadAction<WorkspaceSummary | null>) {
      state.currentWorkspace = action.payload
      tokenStorage.setCurrentWorkspace(action.payload)
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
      state.currentWorkspace = null
      state.workspaces = []
      state.status = 'anonymous'
      state.error = null
      tokenStorage.clearSession()
    },
  },
})

export const {
  setAuthError,
  setCredentials,
  setCurrentWorkspace,
  setSessionChecking,
  setUser,
  logout,
} = authSlice.actions
export const authReducer = authSlice.reducer

export const selectAuth = (state: RootState) => state.auth
export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectAccessToken = (state: RootState) => state.auth.accessToken
export const selectRefreshToken = (state: RootState) => state.auth.refreshToken
export const selectCurrentWorkspace = (state: RootState) => state.auth.currentWorkspace
export const selectWorkspaces = (state: RootState) => state.auth.workspaces
export const selectWorkspaceRole = (state: RootState) => state.auth.currentWorkspace?.role ?? null
export const selectAuthStatus = (state: RootState) => state.auth.status
export const selectNeedsWorkspaceSelection = (state: RootState) =>
  state.auth.status === 'authenticated' &&
  state.auth.workspaces.length > 1 &&
  !state.auth.currentWorkspace
export const selectIsAuthenticated = createSelector(
  selectAuth,
  (auth) => auth.status === 'authenticated' && Boolean(auth.accessToken),
)
