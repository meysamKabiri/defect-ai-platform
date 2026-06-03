import { NavLink, Outlet } from 'react-router-dom'
import {
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { ROUTES } from '@/constants/routes'
import { useLogoutMutation } from '@/features/auth/api/authApi'
import { selectCurrentUser, selectCurrentWorkspace } from '@/features/auth/authSlice'
import { WorkspaceEventListener } from '@/features/workspaces/components/WorkspaceEventListener'
import { WorkspaceSwitcher } from '@/features/workspaces/components/WorkspaceSwitcher'
import type { WorkspaceRole } from '@/features/auth/types'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  href: string
  icon: typeof LayoutDashboard
  platformAdminOnly?: boolean
  roles?: WorkspaceRole[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.dashboard,
    icon: LayoutDashboard,
  },
  {
    label: 'Users',
    href: ROUTES.users,
    icon: Users,
    roles: ['OWNER', 'ADMIN'],
  },
  {
    label: 'Roles',
    href: ROUTES.roles,
    icon: Shield,
    platformAdminOnly: true,
  },
  {
    label: 'Projects',
    href: ROUTES.projects,
    icon: FolderKanban,
  },
]

function canSeeItem(
  workspaceRole: WorkspaceRole | undefined,
  isPlatformAdmin: boolean,
  item: NavItem,
) {
  if (item.platformAdminOnly) {
    return isPlatformAdmin
  }

  return !item.roles || (workspaceRole ? item.roles.includes(workspaceRole) : false)
}

export function AppLayout() {
  const user = useAppSelector(selectCurrentUser)
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const [logout, { isLoading }] = useLogoutMutation()
  const visibleItems = navItems.filter((item) =>
    canSeeItem(currentWorkspace?.role, Boolean(user?.platform_admin), item),
  )
  const shouldShowAside = visibleItems.length > 1

  return (
    <div
      className={cn(
        'min-h-screen bg-background text-foreground',
        shouldShowAside && 'lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]',
      )}
    >
      {shouldShowAside && (
        <aside className="border-b border-border bg-surface lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center gap-3 px-5">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Shield className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Defect AI</p>
              <p className="text-xs text-muted-foreground">Admin console</p>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:grid lg:overflow-visible lg:pb-0">
            {visibleItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  className={({ isActive }) =>
                    cn(
                      'flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground',
                      isActive && 'bg-primary/10 text-primary',
                    )
                  }
                  key={item.href}
                  to={item.href}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </aside>
      )}

      <div className="min-w-0">
        <WorkspaceEventListener />
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {!shouldShowAside && (
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Shield className="size-5" aria-hidden="true" />
                </div>
              )}
              <WorkspaceSwitcher />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {shouldShowAside ? 'Secure workspace' : 'Defect AI'}
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {user?.email ?? 'Authenticated user'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge tone="primary">{currentWorkspace?.role?.toLowerCase() ?? 'member'}</StatusBadge>
              <ThemeToggle />
              <Button
                isLoading={isLoading}
                leftIcon={<LogOut className="size-4" aria-hidden="true" />}
                onClick={() => void logout().unwrap().catch(() => undefined)}
                size="sm"
                variant="secondary"
              >
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
