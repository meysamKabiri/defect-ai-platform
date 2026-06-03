import { baseApi } from '@/services/baseApi'
import type { UserRole } from '@/features/auth/types'
import type {
  AdminProject,
  AdminUser,
  CreateProjectPayload,
  CreateUserPayload,
  PaginatedResponse,
  UpdateProjectPayload,
  WorkspaceInvitation,
  WorkspaceMember,
} from '@/features/admin/types'
import type { WorkspaceRole } from '@/features/auth/types'

type ListParams = {
  workspaceId?: string
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
      query: (params) => {
        const { workspaceId, ...queryParams } = params ?? {}
        return {
          url: workspaceId ? `/workspaces/${workspaceId}/projects` : '/admin/projects',
          params: queryParams,
        }
      },
      providesTags: (result, _error, params) => [
        'AdminProjects',
        'Projects',
        { type: 'Projects', id: params?.workspaceId ?? 'default' },
        ...(result?.items.map((project) => ({ type: 'Project' as const, id: project.id })) ?? []),
      ],
    }),

    getProject: builder.query<AdminProject, { workspaceId?: string; projectId: string }>({
      query: ({ workspaceId, projectId }) =>
        workspaceId
          ? `/workspaces/${workspaceId}/projects/${projectId}`
          : `/admin/projects/${projectId}`,
      providesTags: (_result, _error, { projectId }) => [
        { type: 'AdminProjects', id: projectId },
        { type: 'Project', id: projectId },
      ],
    }),

    createProject: builder.mutation<AdminProject, CreateProjectPayload & { workspaceId?: string }>({
      query: ({ workspaceId, ...body }) => ({
        url: workspaceId ? `/workspaces/${workspaceId}/projects` : '/admin/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        'AdminProjects',
        'Projects',
        { type: 'Projects', id: workspaceId ?? 'default' },
      ],
    }),

    updateProject: builder.mutation<AdminProject, { projectId: string; workspaceId?: string; body: UpdateProjectPayload }>({
      query: ({ projectId, workspaceId, body }) => ({
        url: workspaceId ? `/workspaces/${workspaceId}/projects/${projectId}` : `/admin/projects/${projectId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId, workspaceId }) => [
        'AdminProjects',
        'Projects',
        { type: 'Projects', id: workspaceId ?? 'default' },
        { type: 'Project', id: projectId },
      ],
    }),

    deleteProject: builder.mutation<void, string | { projectId: string; workspaceId?: string }>({
      query: (arg) => {
        const projectId = typeof arg === 'string' ? arg : arg.projectId
        const workspaceId = typeof arg === 'string' ? undefined : arg.workspaceId
        return {
          url: workspaceId ? `/workspaces/${workspaceId}/projects/${projectId}` : `/admin/projects/${projectId}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (_result, _error, arg) => {
        const projectId = typeof arg === 'string' ? arg : arg.projectId
        const workspaceId = typeof arg === 'string' ? undefined : arg.workspaceId
        return [
          'AdminProjects',
          'Projects',
          { type: 'Projects' as const, id: workspaceId ?? 'default' },
          { type: 'Project' as const, id: projectId },
        ]
      },
    }),

    getWorkspaceMembers: builder.query<{ items: WorkspaceMember[] }, string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/members`,
      providesTags: (_result, _error, workspaceId) => [
        'WorkspaceMembers',
        { type: 'WorkspaceMembers', id: workspaceId },
      ],
    }),

    inviteWorkspaceUser: builder.mutation<WorkspaceInvitation, { workspaceId: string; email: string; role: WorkspaceRole }>({
      query: ({ workspaceId, ...body }) => ({
        url: `/workspaces/${workspaceId}/invitations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        'WorkspaceInvitations',
        { type: 'WorkspaceInvitations', id: workspaceId },
        'WorkspaceMembers',
        { type: 'WorkspaceMembers', id: workspaceId },
      ],
    }),

    getWorkspaceInvitations: builder.query<{ items: WorkspaceInvitation[] }, string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/invitations`,
      providesTags: (_result, _error, workspaceId) => [
        'WorkspaceInvitations',
        { type: 'WorkspaceInvitations', id: workspaceId },
      ],
    }),

    revokeInvitation: builder.mutation<WorkspaceInvitation, { workspaceId: string; invitationId: string }>({
      query: ({ workspaceId, invitationId }) => ({
        url: `/workspaces/${workspaceId}/invitations/${invitationId}/revoke`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        'WorkspaceInvitations',
        { type: 'WorkspaceInvitations', id: workspaceId },
      ],
    }),

    resendInvitation: builder.mutation<WorkspaceInvitation, { workspaceId: string; invitationId: string }>({
      query: ({ workspaceId, invitationId }) => ({
        url: `/workspaces/${workspaceId}/invitations/${invitationId}/resend`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        'WorkspaceInvitations',
        { type: 'WorkspaceInvitations', id: workspaceId },
      ],
    }),

    updateMemberRole: builder.mutation<WorkspaceMember, { workspaceId: string; userId: string; role: WorkspaceRole }>({
      query: ({ workspaceId, userId, role }) => ({
        url: `/workspaces/${workspaceId}/members/${userId}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        'WorkspaceMembers',
        { type: 'WorkspaceMembers', id: workspaceId },
      ],
    }),

    removeMember: builder.mutation<WorkspaceMember, { workspaceId: string; userId: string }>({
      query: ({ workspaceId, userId }) => ({
        url: `/workspaces/${workspaceId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        'WorkspaceMembers',
        { type: 'WorkspaceMembers', id: workspaceId },
      ],
    }),
  }),
})

export const {
  useCreateAdminUserMutation,
  useCreateProjectMutation,
  useDeleteAdminUserMutation,
  useDeleteProjectMutation,
  useGetProjectQuery,
  useGetWorkspaceInvitationsQuery,
  useGetWorkspaceMembersQuery,
  useInviteWorkspaceUserMutation,
  useListAdminUsersQuery,
  useListProjectsQuery,
  useListRolesQuery,
  useRemoveMemberMutation,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
  useUpdateMemberRoleMutation,
  useUpdateProjectMutation,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
} = adminApi
