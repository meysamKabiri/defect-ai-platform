import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  FolderKanban,
  FolderPlus,
  SlidersHorizontal,
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
import { selectCurrentUser, selectCurrentWorkspace } from '@/features/auth/authSlice'
import { useAppSelector } from '@/app/hooks'

type ProjectFilter = 'all' | 'led-by-me' | 'active'

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
  const currentUser = useAppSelector(selectCurrentUser)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ProjectFilter>('all')
  const [offset, setOffset] = useState(0)
  const [form, setForm] = useState({
    name: '',
    description: '',
    owner_id: '',
  })
  const limit = 10
  const canManageProjects = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN'
  const { data } = useListProjectsQuery(
    {
      workspaceId: currentWorkspace?.id,
      search,
      limit,
      offset,
      owner_id: filter === 'led-by-me' ? currentUser?.id : undefined,
      is_active: filter === 'active' ? true : undefined,
    },
    { skip: !currentWorkspace?.id },
  )
  const { data: members } = useGetWorkspaceMembersQuery(currentWorkspace?.id ?? '', {
    skip: !currentWorkspace?.id || !canManageProjects,
  })
  const [createProject, createState] = useCreateProjectMutation()
  const [updateProject] = useUpdateProjectMutation()
  const [deleteProject] = useDeleteProjectMutation()

  const projects = data?.items ?? []
  const activeProjects = projects.filter((project) => project.is_active).length
  const projectsWithoutLead = projects.filter((project) => !project.owner_id).length

  const handleCreate = async () => {
    if (!canManageProjects) {
      return
    }

    await createProject({
      workspaceId: currentWorkspace?.id,
      name: form.name,
      description: form.description || undefined,
      owner_id: form.owner_id || undefined,
    }).unwrap()
    setForm({ name: '', description: '', owner_id: '' })
  }

  const projectLeadLabel = (project: AdminProject) => {
    if (project.owner_full_name) {
      return project.owner_full_name
    }
    if (project.owner_email) {
      return project.owner_email
    }
    if (project.owner_id) {
      return 'Project lead assigned'
    }
    return 'No project lead'
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setOffset(0)
  }

  const handleFilterChange = (nextFilter: ProjectFilter) => {
    setFilter(nextFilter)
    setOffset(0)
  }

  const renderProject = (project: AdminProject) => (
    <article
      className="grid gap-4 rounded-2xl border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_auto]"
      key={project.id}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="truncate text-base font-semibold text-foreground transition hover:text-primary"
            to={`/projects/${project.id}`}
          >
            {project.name}
          </Link>
          <StatusBadge tone={project.is_active ? 'success' : 'danger'}>
            {project.is_active ? 'Active' : 'Paused'}
          </StatusBadge>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-3.5" aria-hidden="true" />
            Project Lead: {projectLeadLabel(project)}
          </span>
          <span>Created {formatDate(project.created_at)}</span>
        </div>

        {project.description ? (
          <details className="mt-3 text-sm leading-6 text-muted-foreground">
            <summary className="cursor-pointer text-xs font-semibold text-foreground">
              Project notes
            </summary>
            <p className="mt-2">{project.description}</p>
          </details>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <Link
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          to={`/projects/${project.id}`}
        >
          Open
        </Link>
        {canManageProjects ? (
          <>
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
          </>
        ) : null}
      </div>
    </article>
  )

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-5">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Workspace projects
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Inspection validation projects.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            All active members can see projects in this workspace. Your workspace role controls who can create,
            pause, or delete project work.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
          <KpiTile label="Matching" value={data?.total ?? 0} />
          <KpiTile label="Active on page" value={activeProjects} />
          <KpiTile label="No lead" value={projectsWithoutLead} />
        </div>
      </section>

      <Panel eyebrow="Projects" title="Workspace project list">
        <div className="grid gap-4 p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative md:max-w-sm md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                className="pl-9"
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search projects"
                value={search}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-1">
                <span className="inline-flex items-center gap-1 px-2 text-xs font-semibold uppercase text-muted-foreground">
                  <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                  Filter
                </span>
                <Button
                  onClick={() => handleFilterChange('all')}
                  size="sm"
                  variant={filter === 'all' ? 'primary' : 'ghost'}
                >
                  All projects
                </Button>
                <Button
                  onClick={() => handleFilterChange('led-by-me')}
                  size="sm"
                  variant={filter === 'led-by-me' ? 'primary' : 'ghost'}
                >
                  Created/led by me
                </Button>
                <Button
                  onClick={() => handleFilterChange('active')}
                  size="sm"
                  variant={filter === 'active' ? 'primary' : 'ghost'}
                >
                  Active
                </Button>
              </div>

              {canManageProjects ? (
                <details className="rounded-xl border border-border bg-background">
                  <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground">
                    <FolderPlus className="size-4 text-primary" aria-hidden="true" />
                    New project
                  </summary>
                  <div className="grid gap-3 border-t border-border p-4 md:min-w-[34rem] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <Input
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Project name"
                      value={form.name}
                    />
                    <select
                      className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                      onChange={(event) => setForm((current) => ({ ...current, owner_id: event.target.value }))}
                      value={form.owner_id}
                    >
                      <option value="">No project lead</option>
                      {members?.items.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.full_name || member.email}
                        </option>
                      ))}
                    </select>
                    <Input
                      className="md:col-span-2"
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Inspection goal or validation notes"
                      value={form.description}
                    />
                    <Button
                      className="md:col-span-2"
                      disabled={!form.name}
                      isLoading={createState.isLoading}
                      leftIcon={<FolderKanban className="size-4" aria-hidden="true" />}
                      onClick={() => void handleCreate()}
                    >
                      Create project
                    </Button>
                  </div>
                </details>
              ) : null}
            </div>
          </div>

          {!canManageProjects ? (
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              Project management actions are available to workspace owners and admins.
            </div>
          ) : null}

          <div className="grid gap-3">
            {projects.length ? (
              projects.map(renderProject)
            ) : (
              <div className="rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
                No projects found.
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
