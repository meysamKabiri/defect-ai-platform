export const ROUTES = {
  root: '/',
  auth: '/auth',
  acceptInvite: '/accept-invite',
  selectWorkspace: '/select-workspace',
  dashboard: '/dashboard',
  users: '/admin/users',
  roles: '/admin/roles',
  projects: '/projects',
  projectDetail: '/projects/:projectId',
  batchDetail: '/projects/:projectId/batches/:batchId',
  batchJobDetail: '/projects/:projectId/batches/:batchId/jobs/:jobId',
  batchReport: '/projects/:projectId/batches/:batchId/report',
  legacyProjects: '/admin/projects',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
