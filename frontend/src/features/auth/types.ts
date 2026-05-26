export type AuthUser = {
  id: string
  email: string
  name?: string
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
