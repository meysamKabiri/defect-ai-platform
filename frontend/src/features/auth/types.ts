export type UserRole = 'super_admin' | 'admin' | 'engineer' | 'viewer'

export type AuthUser = {
  id: string
  email: string
  full_name?: string | null
  name?: string
  role: UserRole
  roles?: string[]
}

export type AuthTokens = {
  accessToken: string
  refreshToken?: string
}

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'ENGINEER' | 'VIEWER'

export type WorkspaceSummary = {
  id: string
  name: string
  slug?: string
  role: WorkspaceRole
}

export type LoginRequest = {
  email: string
  password: string
}

export type CreateUserRequest = {
  email: string
  password: string
  full_name?: string | null
}

export type CreateWorkspaceRequest = {
  workspace_name: string
  owner_full_name?: string | null
  owner_email: string
  password: string
}

export type AcceptInvitationRequest = {
  token: string
  full_name?: string | null
  password: string
}

export type AuthResponse = {
  user?: AuthUser
  accessToken: string
  refreshToken?: string
  workspaces?: WorkspaceSummary[]
  currentWorkspace?: WorkspaceSummary | null
}

export type ApiAuthResponse = {
  user?: AuthUser
  access_token?: string
  refresh_token?: string
  accessToken?: string
  refreshToken?: string
  workspaces?: WorkspaceSummary[]
  current_workspace?: WorkspaceSummary | null
  workspace?: WorkspaceSummary | null
}

export type SessionStatus = 'idle' | 'checking' | 'authenticated' | 'anonymous'
