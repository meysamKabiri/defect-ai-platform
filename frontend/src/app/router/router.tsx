import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Spinner } from '@/components/common/Spinner'
import { ROUTES } from '@/constants/routes'
import { RootLayout } from '@/layouts/RootLayout'
import { ProtectedRoute } from '@/routes/guards/ProtectedRoute'
import { PublicRoute } from '@/routes/guards/PublicRoute'
import { NotFoundPage } from '@/routes/pages/NotFoundPage'
import { RootRedirect } from '@/routes/pages/RootRedirect'

const AuthPage = lazy(() => import('@/features/auth/pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const DashboardPage = lazy(() => import('@/features/detection/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))

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
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: ROUTES.dashboard,
            element: withSuspense(<DashboardPage />),
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
