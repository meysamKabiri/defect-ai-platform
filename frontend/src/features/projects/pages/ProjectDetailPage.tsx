import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarClock,
  FolderKanban,
  UserRound,
} from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { Panel } from '@/components/common/Panel'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useGetProjectQuery } from '@/features/admin/api/adminApi'
import { BatchUploadPanel } from '@/features/detection/components/BatchUploadPanel'
import { selectCurrentWorkspace } from '@/features/auth/authSlice'
import {
  useGetBatchesQuery,
  useGetDetectionJobsQuery,
} from '@/services/detectionApi'

function formatDate(value?: string | null) {
  if (!value) return 'Not available'

  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function projectLeadLabel(project?: {
  owner_email?: string | null
  owner_full_name?: string | null
  owner_id?: string | null
}) {
  if (project?.owner_full_name) return project.owner_full_name
  if (project?.owner_email) return project.owner_email
  if (project?.owner_id) return 'Project lead assigned'
  return 'No project lead'
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

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const canUpload =
    currentWorkspace?.role === 'OWNER' ||
    currentWorkspace?.role === 'ADMIN' ||
    currentWorkspace?.role === 'ENGINEER'

  const { data: project, isFetching: isFetchingProject } = useGetProjectQuery(
    {
      workspaceId: currentWorkspace?.id,
      projectId: projectId ?? '',
    },
    {
      skip: !currentWorkspace?.id || !projectId,
    },
  )
  const {
    data: batchesData,
    isFetching: isFetchingBatches,
    refetch: refetchBatches,
  } = useGetBatchesQuery(
    {
      workspaceId: currentWorkspace?.id,
      projectId,
      limit: 20,
      offset: 0,
    },
    {
      skip: !currentWorkspace?.id || !projectId,
    },
  )
  const { currentData: jobsData } = useGetDetectionJobsQuery(
    {
      workspaceId: currentWorkspace?.id,
      projectId,
      limit: 1,
      offset: 0,
    },
    {
      skip: !currentWorkspace?.id || !projectId,
    },
  )

  const batches = batchesData?.items ?? []
  const activeBatches = batches.filter((batch) => batch.status !== 'completed').length
  const totalImages = batches.reduce((sum, batch) => sum + (batch.total_jobs ?? 0), 0)

  return (
    <main className="mx-auto grid w-full max-w-[1180px] gap-5">
      <div>
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
          to="/projects"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Projects
        </Link>
      </div>

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Project detail
            </p>
            <StatusBadge tone={project?.is_active ? 'success' : 'danger'}>
              {project?.is_active ? 'Active' : 'Paused'}
            </StatusBadge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {project?.name ?? (isFetchingProject ? 'Loading project...' : 'Project not found')}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {currentWorkspace?.name ?? 'Selected workspace'} inspection validation flow.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
          <KpiTile label="Batches" value={batchesData?.total ?? 0} />
          <KpiTile label="Images" value={totalImages} />
          <KpiTile label="Jobs" value={jobsData?.total ?? 0} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <div className="grid gap-5">
          <Panel eyebrow="Context" title="Project summary">
            <div className="grid gap-4 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Workspace
                  </p>
                  <p className="mt-2 truncate text-sm font-semibold text-foreground">
                    {currentWorkspace?.name ?? 'Workspace'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Project Lead
                  </p>
                  <p className="mt-2 truncate text-sm font-semibold text-foreground">
                    {projectLeadLabel(project)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Created
                  </p>
                  <p className="mt-2 truncate text-sm font-semibold text-foreground">
                    {formatDate(project?.created_at)}
                  </p>
                </div>
              </div>

              {project?.description ? (
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {project.description}
                  </p>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel
            action={(
              <Button
                isLoading={isFetchingBatches}
                onClick={() => void refetchBatches()}
                size="sm"
                variant="ghost"
              >
                Refresh
              </Button>
            )}
            eyebrow="Batches"
            title="Validation batches"
          >
            <div className="grid gap-3 p-5">
              {batches.length ? (
                batches.map((batch) => {
                  const progress = Math.round((batch.progress?.completion_rate ?? 0) * 100)

                  return (
                    <article
                      className="grid gap-3 rounded-2xl border border-border bg-background p-4"
                      key={batch.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            className="block truncate text-sm font-semibold text-foreground transition hover:text-primary"
                            to={`/projects/${projectId}/batches/${batch.id}`}
                          >
                            {batch.name || 'Validation batch'}
                          </Link>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {batch.total_jobs} images
                          </p>
                        </div>
                        <StatusBadge status={batch.status}>{batch.status}</StatusBadge>
                      </div>
                      <ProgressBar value={progress} />
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{batch.progress?.completed ?? 0} complete</span>
                        <span>{batch.progress?.failed ?? 0} failed</span>
                        <span>{formatDate(batch.created_at)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                          to={`/projects/${projectId}/batches/${batch.id}`}
                        >
                          Add images / Review
                        </Link>
                        <Link
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                          to={`/projects/${projectId}/batches/${batch.id}/report`}
                        >
                          Report
                        </Link>
                      </div>
                    </article>
                  )
                })
              ) : (
                <div className="rounded-2xl border border-border bg-background p-6 text-sm leading-6 text-muted-foreground">
                  No validation batches for this project yet.
                </div>
              )}
            </div>
          </Panel>
        </div>

        <aside className="grid gap-5">
          <BatchUploadPanel
            disabledReason={
              canUpload
                ? undefined
                : 'Your workspace role can view batches, but cannot upload images.'
            }
            isDisabled={!canUpload || !project?.is_active}
            onUploaded={(batchId) => {
              void refetchBatches()
              navigate(`/projects/${projectId}/batches/${batchId}`)
            }}
            projectId={projectId ?? ''}
            workspaceId={currentWorkspace?.id}
          />

          <Panel eyebrow="Status" title="Project activity">
            <div className="grid gap-3 p-5 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <FolderKanban className="size-4 text-primary" aria-hidden="true" />
                {activeBatches} batch{activeBatches === 1 ? '' : 'es'} still in progress
              </div>
              <div className="inline-flex items-center gap-2">
                <UserRound className="size-4 text-primary" aria-hidden="true" />
                Project Lead: {projectLeadLabel(project)}
              </div>
              <div className="inline-flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" aria-hidden="true" />
                Updated {formatDate(project?.updated_at)}
              </div>
            </div>
          </Panel>
        </aside>
      </section>
    </main>
  )
}
