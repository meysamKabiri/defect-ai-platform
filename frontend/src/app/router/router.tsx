import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Spinner } from '@/components/common/Spinner'
import { ROUTES } from '@/constants/routes'
import { AppLayout } from '@/layouts/AppLayout'
import { RootLayout } from '@/layouts/RootLayout'
import { ProtectedRoute } from '@/routes/guards/ProtectedRoute'
import { PublicRoute } from '@/routes/guards/PublicRoute'
import { RoleGuard } from '@/routes/guards/RoleGuard'
import { NotFoundPage } from '@/routes/pages/NotFoundPage'
import { RootRedirect } from '@/routes/pages/RootRedirect'

const AuthPage = lazy(() => import('@/features/auth/pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const AcceptInvitationPage = lazy(() => import('@/features/auth/pages/AcceptInvitationPage').then((module) => ({ default: module.AcceptInvitationPage })))
const DashboardPage = lazy(() => import('@/features/detection/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const UsersPage = lazy(() => import('@/features/admin/pages/UsersPage').then((module) => ({ default: module.UsersPage })))
const RolesPage = lazy(() => import('@/features/admin/pages/RolesPage').then((module) => ({ default: module.RolesPage })))
const ProjectsPage = lazy(() => import('@/features/admin/pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))

function RouteLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-background text-foreground">
      <Spinner className="size-8 text-primary" />
    </div>
  )
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteLoader />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: ROUTES.root,
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <RootRedirect />,
      },
      {
        element: <PublicRoute />,
        children: [
          {
            path: ROUTES.auth,
            element: withSuspense(<AuthPage />),
          },
          {
            path: ROUTES.acceptInvite,
            element: withSuspense(<AcceptInvitationPage />),
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                path: ROUTES.dashboard,
                element: withSuspense(<DashboardPage />),
              },
              {
                element: <RoleGuard allowedRoles={['super_admin', 'admin']} />,
                children: [
                  {
                    path: ROUTES.users,
                    element: withSuspense(<UsersPage />),
                  },
                  {
                    path: ROUTES.projects,
                    element: withSuspense(<ProjectsPage />),
                  },
                ],
              },
              {
                element: <RoleGuard allowedRoles={['super_admin']} />,
                children: [
                  {
                    path: ROUTES.roles,
                    element: withSuspense(<RolesPage />),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
