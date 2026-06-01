import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Spinner } from '@/components/common/Spinner'
import { ROUTES } from '@/constants/routes'
import { AppLayout } from '@/layouts/AppLayout'
import { RootLayout } from '@/layouts/RootLayout'
import { ProtectedRoute } from '@/routes/guards/ProtectedRoute'
import { PublicRoute } from '@/routes/guards/PublicRoute'
import { RoleGuard } from '@/routes/guards/RoleGuard'
import { PlatformAdminGuard } from '@/routes/guards/PlatformAdminGuard'
import { NotFoundPage } from '@/routes/pages/NotFoundPage'
import { RootRedirect } from '@/routes/pages/RootRedirect'

const AuthPage = lazy(() => import('@/features/auth/pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const AcceptInvitationPage = lazy(() => import('@/features/auth/pages/AcceptInvitationPage').then((module) => ({ default: module.AcceptInvitationPage })))
const SelectWorkspacePage = lazy(() => import('@/features/workspaces/pages/SelectWorkspacePage').then((module) => ({ default: module.SelectWorkspacePage })))
const DashboardPage = lazy(() => import('@/features/detection/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const UsersPage = lazy(() => import('@/features/admin/pages/UsersPage').then((module) => ({ default: module.UsersPage })))
const RolesPage = lazy(() => import('@/features/admin/pages/RolesPage').then((module) => ({ default: module.RolesPage })))
const ProjectsPage = lazy(() => import('@/features/admin/pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('@/features/projects/pages/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })))
const BatchDetailPage = lazy(() => import('@/features/projects/pages/BatchDetailPage').then((module) => ({ default: module.BatchDetailPage })))
const JobReviewPage = lazy(() => import('@/features/projects/pages/JobReviewPage').then((module) => ({ default: module.JobReviewPage })))
const BatchReportPage = lazy(() => import('@/features/projects/pages/BatchReportPage').then((module) => ({ default: module.BatchReportPage })))

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
            path: ROUTES.selectWorkspace,
            element: withSuspense(<SelectWorkspacePage />),
          },
          {
            element: <AppLayout />,
            children: [
              {
                path: ROUTES.dashboard,
                element: withSuspense(<DashboardPage />),
              },
              {
                path: ROUTES.projects,
                element: withSuspense(<ProjectsPage />),
              },
              {
                path: ROUTES.projectDetail,
                element: withSuspense(<ProjectDetailPage />),
              },
              {
                path: ROUTES.batchDetail,
                element: withSuspense(<BatchDetailPage />),
              },
              {
                path: ROUTES.batchJobDetail,
                element: withSuspense(<JobReviewPage />),
              },
              {
                path: ROUTES.batchReport,
                element: withSuspense(<BatchReportPage />),
              },
              {
                path: ROUTES.legacyProjects,
                element: <Navigate to={ROUTES.projects} replace />,
              },
              {
                element: <RoleGuard allowedRoles={['OWNER', 'ADMIN']} />,
                children: [
                  {
                    path: ROUTES.users,
                    element: withSuspense(<UsersPage />),
                  },
                ],
              },
              {
                element: <PlatformAdminGuard />,
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
