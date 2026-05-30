export const ROUTES = {
  root: '/',
  auth: '/auth',
  acceptInvite: '/accept-invite',
  dashboard: '/dashboard',
  users: '/admin/users',
  roles: '/admin/roles',
  projects: '/admin/projects',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
