import type { UserRole } from '@/features/auth/types'

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
