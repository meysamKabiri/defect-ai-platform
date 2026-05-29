import { useState } from 'react'
import { FolderPlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { DataTable } from '@/components/common/DataTable'
import { Input } from '@/components/common/Input'
import { Panel } from '@/components/common/Panel'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useListAdminUsersQuery,
  useListProjectsQuery,
  useUpdateProjectMutation,
} from '@/features/admin/api/adminApi'
import type { AdminProject } from '@/features/admin/types'

export function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [form, setForm] = useState({
    name: '',
    description: '',
    owner_id: '',
  })
  const limit = 10
  const { data } = useListProjectsQuery({ search, limit, offset })
  const { data: users } = useListAdminUsersQuery({ limit: 100, offset: 0 })
  const [createProject, createState] = useCreateProjectMutation()
  const [updateProject] = useUpdateProjectMutation()
  const [deleteProject] = useDeleteProjectMutation()

  const handleCreate = async () => {
    await createProject({
      name: form.name,
      description: form.description || undefined,
      owner_id: form.owner_id || undefined,
    }).unwrap()
    setForm({ name: '', description: '', owner_id: '' })
  }

  const ownerLabel = (ownerId?: string | null) =>
    users?.items.find((user) => user.id === ownerId)?.email ?? 'Unassigned'

  const columns = [
    {
      key: 'project',
      header: 'Project',
      render: (project: AdminProject) => (
        <div>
          <p className="font-semibold text-foreground">{project.name}</p>
          <p className="text-xs text-muted-foreground">{project.description ?? 'No description'}</p>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (project: AdminProject) => (
        <span className="text-sm text-muted-foreground">{ownerLabel(project.owner_id)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (project: AdminProject) => (
        <button
          onClick={() =>
            void updateProject({
              projectId: project.id,
              body: { is_active: !project.is_active },
            })
          }
          type="button"
        >
          <StatusBadge tone={project.is_active ? 'success' : 'danger'}>
            {project.is_active ? 'Active' : 'Inactive'}
          </StatusBadge>
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (project: AdminProject) => (
        <Button
          leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
          onClick={() => void deleteProject(project.id)}
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
        description="Assign projects to users so future job ownership can move from individual operators to team workspaces."
        eyebrow="Administration"
        title="Projects"
      >
        <div className="grid gap-3 p-5 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter projects"
            value={search}
          />
          <Input
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Project name"
            value={form.name}
          />
          <select
            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm"
            onChange={(event) => setForm((current) => ({ ...current, owner_id: event.target.value }))}
            value={form.owner_id}
          >
            <option value="">Unassigned</option>
            {users?.items.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
          <Button
            disabled={!form.name}
            isLoading={createState.isLoading}
            leftIcon={<FolderPlus className="size-4" aria-hidden="true" />}
            onClick={() => void handleCreate()}
          >
            Add
          </Button>
          <Input
            className="lg:col-span-3"
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Description"
            value={form.description}
          />
        </div>
      </Panel>

      <div className="flex justify-end gap-2">
        <Button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} size="sm" variant="secondary">
          Previous
        </Button>
        <Button disabled={!data || offset + limit >= data.total} onClick={() => setOffset(offset + limit)} size="sm" variant="secondary">
          Next
        </Button>
      </div>

      <DataTable columns={columns} rows={data?.items ?? []} />
    </div>
  )
}
