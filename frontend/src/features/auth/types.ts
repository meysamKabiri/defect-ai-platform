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

export type LoginRequest = {
  email: string
  password: string
}

export type CreateUserRequest = {
  email: string
  password: string
  full_name?: string | null
}

export type AuthResponse = {
  user?: AuthUser
  accessToken: string
  refreshToken?: string
}

export type ApiAuthResponse = {
  user?: AuthUser
  access_token?: string
  refresh_token?: string
  accessToken?: string
  refreshToken?: string
}

export type SessionStatus = 'idle' | 'checking' | 'authenticated' | 'anonymous'
