import { baseApi } from '@/services/baseApi'
import type { UserRole } from '@/features/auth/types'
import type {
  AdminProject,
  AdminUser,
  CreateProjectPayload,
  CreateUserPayload,
  PaginatedResponse,
  UpdateProjectPayload,
} from '@/features/admin/types'

type ListParams = {
  search?: string
  role?: UserRole
  is_active?: boolean
  owner_id?: string
  limit?: number
  offset?: number
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listAdminUsers: builder.query<PaginatedResponse<AdminUser>, ListParams | void>({
      query: (params) => ({
        url: '/admin/users',
        params: params ?? undefined,
      }),
      providesTags: ['AdminUsers'],
    }),

    createAdminUser: builder.mutation<AdminUser, CreateUserPayload>({
      query: (body) => ({
        url: '/admin/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminUsers'],
    }),

    updateUserRole: builder.mutation<AdminUser, { userId: string; role: UserRole }>({
      query: ({ userId, role }) => ({
        url: `/admin/users/${userId}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: ['AdminUsers'],
    }),

    updateUserStatus: builder.mutation<AdminUser, { userId: string; is_active: boolean }>({
      query: ({ userId, is_active }) => ({
        url: `/admin/users/${userId}/status`,
        method: 'PATCH',
        body: { is_active },
      }),
      invalidatesTags: ['AdminUsers'],
    }),

    deleteAdminUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminUsers'],
    }),

    listRoles: builder.query<UserRole[], void>({
      query: () => '/admin/roles',
      providesTags: ['AdminRoles'],
    }),

    listProjects: builder.query<PaginatedResponse<AdminProject>, ListParams | void>({
      query: (params) => ({
        url: '/admin/projects',
        params: params ?? undefined,
      }),
      providesTags: ['AdminProjects'],
    }),

    createProject: builder.mutation<AdminProject, CreateProjectPayload>({
      query: (body) => ({
        url: '/admin/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminProjects'],
    }),

    updateProject: builder.mutation<AdminProject, { projectId: string; body: UpdateProjectPayload }>({
      query: ({ projectId, body }) => ({
        url: `/admin/projects/${projectId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminProjects'],
    }),

    deleteProject: builder.mutation<void, string>({
      query: (projectId) => ({
        url: `/admin/projects/${projectId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminProjects'],
    }),
  }),
})

export const {
  useCreateAdminUserMutation,
  useCreateProjectMutation,
  useDeleteAdminUserMutation,
  useDeleteProjectMutation,
  useListAdminUsersQuery,
  useListProjectsQuery,
  useListRolesQuery,
  useUpdateProjectMutation,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
} = adminApi
