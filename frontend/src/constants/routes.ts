export const ROUTES = {
  root: '/',
  auth: '/auth',
  dashboard: '/dashboard',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
