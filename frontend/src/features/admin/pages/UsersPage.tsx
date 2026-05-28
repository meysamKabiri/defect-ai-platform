import { useMemo, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { DataTable } from '@/components/common/DataTable'
import { Input } from '@/components/common/Input'
import { Panel } from '@/components/common/Panel'
import { Spinner } from '@/components/common/Spinner'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  useCreateAdminUserMutation,
  useDeleteAdminUserMutation,
  useListAdminUsersQuery,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
} from '@/features/admin/api/adminApi'
import type { AdminUser } from '@/features/admin/types'
import { selectCurrentUser } from '@/features/auth/authSlice'
import type { UserRole } from '@/features/auth/types'
import { useAppSelector } from '@/app/hooks'

const adminAssignableRoles: UserRole[] = ['engineer', 'viewer']
const superAdminAssignableRoles: UserRole[] = ['super_admin', 'admin', ...adminAssignableRoles]

export function UsersPage() {
  const currentUser = useAppSelector(selectCurrentUser)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'engineer' as UserRole,
  })
  const limit = 10
  const { data, isFetching } = useListAdminUsersQuery({ search, limit, offset })
  const [createUser, createState] = useCreateAdminUserMutation()
  const [updateRole] = useUpdateUserRoleMutation()
  const [updateStatus] = useUpdateUserStatusMutation()
  const [deleteUser] = useDeleteAdminUserMutation()
  const canManageRoles = currentUser?.role === 'super_admin'

  const roleOptions = useMemo(
    () => (canManageRoles ? superAdminAssignableRoles : adminAssignableRoles),
    [canManageRoles],
  )

  const handleCreate = async () => {
    await createUser({
      email: form.email,
      full_name: form.full_name || undefined,
      password: form.password,
      role: form.role,
      is_active: true,
    }).unwrap()
    setForm({ email: '', full_name: '', password: '', role: 'engineer' })
  }

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (user: AdminUser) => (
        <div>
          <p className="font-semibold text-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">{user.full_name ?? 'No name set'}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: AdminUser) =>
        canManageRoles ? (
          <select
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            disabled={user.id === currentUser?.id}
            onChange={(event) =>
              void updateRole({ userId: user.id, role: event.target.value as UserRole })
            }
            value={user.role}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role.replace('_', ' ')}
              </option>
            ))}
          </select>
        ) : (
          <StatusBadge tone="primary">{user.role.replace('_', ' ')}</StatusBadge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: AdminUser) => (
        <button
          className="text-left"
          disabled={user.id === currentUser?.id}
          onClick={() =>
            void updateStatus({ userId: user.id, is_active: !user.is_active })
          }
          type="button"
        >
          <StatusBadge tone={user.is_active ? 'success' : 'danger'}>
            {user.is_active ? 'Active' : 'Inactive'}
          </StatusBadge>
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: AdminUser) => (
        <Button
          disabled={user.id === currentUser?.id}
          leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
          onClick={() => void deleteUser(user.id)}
          size="sm"
          variant="ghost"
        >
          Delete
        </Button>
      ),
    },
  ]

  return (
    <div className="grid gap-5">
      <Panel
        description="Create operators, control active sessions, and keep role elevation restricted to super-admins."
        eyebrow="Administration"
        title="Users"
      >
        <div className="grid gap-3 p-5 lg:grid-cols-[1fr_1fr_auto_auto]">
          <Input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter users"
            value={search}
          />
          <Input
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="new.user@company.com"
            value={form.email}
          />
          <Input
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Temporary password"
            type="password"
            value={form.password}
          />
          <Button
            disabled={!form.email || form.password.length < 12}
            isLoading={createState.isLoading}
            leftIcon={<Plus className="size-4" aria-hidden="true" />}
            onClick={() => void handleCreate()}
          >
            Add
          </Button>
          <Input
            className="lg:col-span-2"
            onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            placeholder="Full name"
            value={form.full_name}
          />
          <select
            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm"
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
            value={form.role}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="size-4" aria-hidden="true" />
          {data?.total ?? 0} users
          {isFetching && <Spinner className="size-4" />}
        </div>
        <div className="flex gap-2">
          <Button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} size="sm" variant="secondary">
            Previous
          </Button>
          <Button disabled={!data || offset + limit >= data.total} onClick={() => setOffset(offset + limit)} size="sm" variant="secondary">
            Next
          </Button>
        </div>
      </div>

      <DataTable columns={columns} rows={data?.items ?? []} />
    </div>
  )
}
