import { ShieldCheck } from 'lucide-react'
import { Panel } from '@/components/common/Panel'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useListRolesQuery } from '@/features/admin/api/adminApi'

const roleDescriptions: Record<string, string> = {
  super_admin: 'Owns role elevation, platform-wide policy, and all admin operations.',
  admin: 'Manages users, projects, detection jobs, and operational resources below admin level.',
  engineer: 'Uploads images, processes jobs, and reviews assigned inspection work.',
  viewer: 'Read-only access to assigned inspection resources.',
}

export function RolesPage() {
  const { data: roles = [] } = useListRolesQuery()

  return (
    <Panel
      description="Role definitions are enforced by backend permissions and mirrored here for operators."
      eyebrow="Super-admin"
      title="Roles"
    >
      <div className="grid gap-4 p-5 md:grid-cols-2">
        {roles.map((role) => (
          <article className="rounded-lg border border-border bg-background p-4" key={role}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold capitalize text-foreground">{role.replace('_', ' ')}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {roleDescriptions[role] ?? 'Custom platform role.'}
                  </p>
                </div>
              </div>
              <StatusBadge tone={role === 'super_admin' ? 'warning' : 'primary'}>
                {role === 'super_admin' ? 'Restricted' : 'Assignable'}
              </StatusBadge>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  )
}
