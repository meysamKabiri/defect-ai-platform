import { useState } from 'react'
import {
  Archive,
  FolderKanban,
  FolderPlus,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Panel } from '@/components/common/Panel'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useGetWorkspaceMembersQuery,
  useListProjectsQuery,
  useUpdateProjectMutation,
} from '@/features/admin/api/adminApi'
import type { AdminProject } from '@/features/admin/types'
import { selectCurrentWorkspace } from '@/features/auth/authSlice'
import { useAppSelector } from '@/app/hooks'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function KpiTile({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </article>
  )
}

export function ProjectsPage() {
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [form, setForm] = useState({
    name: '',
    description: '',
    owner_id: '',
  })
  const limit = 10
  const { data } = useListProjectsQuery({ workspaceId: currentWorkspace?.id, search, limit, offset })
  const { data: members } = useGetWorkspaceMembersQuery(currentWorkspace?.id ?? '', {
    skip: !currentWorkspace?.id,
  })
  const [createProject, createState] = useCreateProjectMutation()
  const [updateProject] = useUpdateProjectMutation()
  const [deleteProject] = useDeleteProjectMutation()

  const projects = data?.items ?? []
  const activeProjects = projects.filter((project) => project.is_active).length
  const unassignedProjects = projects.filter((project) => !project.owner_id).length

  const handleCreate = async () => {
    await createProject({
      workspaceId: currentWorkspace?.id,
      name: form.name,
      description: form.description || undefined,
      owner_id: form.owner_id || undefined,
    }).unwrap()
    setForm({ name: '', description: '', owner_id: '' })
  }

  const ownerLabel = (ownerId?: string | null) =>
    members?.items.find((member) => member.user_id === ownerId)?.email ?? 'Unassigned'

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setOffset(0)
  }

  const renderProject = (project: AdminProject) => (
    <article
      className="grid gap-4 rounded-2xl border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_auto]"
      key={project.id}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-semibold text-foreground">{project.name}</h2>
          <StatusBadge tone={project.is_active ? 'success' : 'danger'}>
            {project.is_active ? 'Active pilot' : 'Paused'}
          </StatusBadge>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-3.5" aria-hidden="true" />
            {ownerLabel(project.owner_id)}
          </span>
          <span>Created {formatDate(project.created_at)}</span>
        </div>

        {project.description ? (
          <details className="mt-3 text-sm leading-6 text-muted-foreground">
            <summary className="cursor-pointer text-xs font-semibold text-foreground">
              Pilot notes
            </summary>
            <p className="mt-2">{project.description}</p>
          </details>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <Button
          leftIcon={<Archive className="size-4" aria-hidden="true" />}
          onClick={() =>
            void updateProject({
              projectId: project.id,
              workspaceId: currentWorkspace?.id,
              body: { is_active: !project.is_active },
            })
          }
          size="sm"
          variant="secondary"
        >
          {project.is_active ? 'Pause' : 'Activate'}
        </Button>
        <Button
          leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
          onClick={() => void deleteProject({ projectId: project.id, workspaceId: currentWorkspace?.id })}
          size="sm"
          variant="ghost"
        >
          Delete
        </Button>
      </div>
    </article>
  )

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-5">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Pilot workspaces
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Manage validation projects.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Keep each paid diagnostic or pilot scoped to one owner, one dataset, and one clear inspection goal.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
          <KpiTile label="Total" value={data?.total ?? 0} />
          <KpiTile label="Active" value={activeProjects} />
          <KpiTile label="Unassigned" value={unassignedProjects} />
        </div>
      </section>

      <Panel eyebrow="Setup" title="Validation pilots">
        <div className="grid gap-4 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative md:max-w-sm md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                className="pl-9"
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search pilots"
                value={search}
              />
            </div>

            <details className="rounded-xl border border-border bg-background">
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground">
                <FolderPlus className="size-4 text-primary" aria-hidden="true" />
                New pilot
              </summary>
              <div className="grid gap-3 border-t border-border p-4 md:min-w-[34rem] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Input
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Pilot name"
                  value={form.name}
                />
                <select
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                  onChange={(event) => setForm((current) => ({ ...current, owner_id: event.target.value }))}
                  value={form.owner_id}
                >
                  <option value="">Unassigned</option>
                  {members?.items.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.email}
                    </option>
                  ))}
                </select>
                <Input
                  className="md:col-span-2"
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Inspection goal or dataset notes"
                  value={form.description}
                />
                <Button
                  className="md:col-span-2"
                  disabled={!form.name}
                  isLoading={createState.isLoading}
                  leftIcon={<FolderKanban className="size-4" aria-hidden="true" />}
                  onClick={() => void handleCreate()}
                >
                  Create pilot
                </Button>
              </div>
            </details>
          </div>

          <div className="grid gap-3">
            {projects.length ? (
              projects.map(renderProject)
            ) : (
              <div className="rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
                No validation pilots found.
              </div>
            )}
          </div>
        </div>
      </Panel>

      <div className="flex justify-end gap-2">
        <Button
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
          size="sm"
          variant="secondary"
        >
          Previous
        </Button>
        <Button
          disabled={!data || offset + limit >= data.total}
          onClick={() => setOffset(offset + limit)}
          size="sm"
          variant="secondary"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
