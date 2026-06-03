import type { UserRole, WorkspaceRole } from '@/features/auth/types'

export type AdminUser = {
  id: string
  email: string
  full_name?: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  limit: number
  offset: number
}

export type AdminProject = {
  id: string
  name: string
  description?: string | null
  owner_id?: string | null
  owner_email?: string | null
  owner_full_name?: string | null
  workspace_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CreateUserPayload = {
  email: string
  password: string
  full_name?: string
  role: UserRole
  is_active: boolean
}

export type CreateProjectPayload = {
  name: string
  description?: string
  owner_id?: string
}

export type UpdateProjectPayload = Partial<CreateProjectPayload> & {
  is_active?: boolean
}

export type WorkspaceMember = {
  user_id: string
  email: string
  full_name?: string | null
  role: WorkspaceRole
  status: 'ACTIVE' | 'REMOVED' | 'SUSPENDED'
  joined_at: string
}

export type WorkspaceInvitation = {
  id: string
  workspace_id: string
  email: string
  role: WorkspaceRole
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
  expires_at: string
  accepted_at?: string | null
  revoked_at?: string | null
  invited_by_user_id?: string | null
  created_at: string
  updated_at: string
  invite_url?: string | null
}
