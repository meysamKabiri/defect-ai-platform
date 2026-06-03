import { Link } from 'react-router-dom'
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  FileBarChart,
  FileImage,
  FolderKanban,
  ImageOff,
  RefreshCw,
  UploadCloud,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { Panel } from '@/components/common/Panel'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { selectCurrentWorkspace } from '@/features/auth/authSlice'
import { BatchUploadPanel } from '@/features/detection/components/BatchUploadPanel'
import type { InspectionBatch } from '@/features/detection/detectionTypes'
import { useAuthenticatedImageUrl } from '@/features/detection/hooks/useAuthenticatedImageUrl'
import { getImageUrl } from '@/lib/image'
import {
  useGetAssignedProjectsQuery,
  useGetBatchFeedbackQuery,
  useGetBatchQuery,
  useGetBatchesQuery,
  useCreateBatchMutation,
} from '@/services/detectionApi'

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function dashboardProjectStorageKey(workspaceId?: string) {
  return workspaceId ? `defectai.dashboard.project.${workspaceId}` : undefined
}

function readStoredProjectId(workspaceId?: string) {
  const key = dashboardProjectStorageKey(workspaceId)
  if (!key) return ''

  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeStoredProjectId(workspaceId: string | undefined, projectId: string) {
  const key = dashboardProjectStorageKey(workspaceId)
  if (!key) return

  try {
    if (projectId) {
      window.localStorage.setItem(key, projectId)
    } else {
      window.localStorage.removeItem(key)
    }
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
  }
}

function statusLabel(batch?: InspectionBatch, reviewed = 0) {
  if (!batch) return 'No validation run'
  const progress = batch.progress
  const total = batch.total_jobs ?? 0
  const completed = progress?.completed ?? 0
  const terminal = completed + (progress?.failed ?? 0)

  if (batch.status === 'queued' || (progress?.queued ?? 0) > 0 || (progress?.processing ?? 0) > 0) {
    return 'Processing'
  }
  if (terminal >= total && total > 0 && reviewed < completed) return 'Ready for review'
  if (completed > 0 && reviewed >= completed) return 'Report ready'
  return batch.status
}

function MetricCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  )
}

function WorkflowProgress({
  hasProject,
  batch,
  reviewed,
}: {
  hasProject: boolean
  batch?: InspectionBatch
  reviewed: number
}) {
  const uploaded = Boolean(batch?.total_jobs)
  const completed = batch?.progress?.completed ?? 0
  const processing = (batch?.progress?.processing ?? 0) + (batch?.progress?.queued ?? 0)
  const reportReady = uploaded && completed > 0 && reviewed >= completed
  const reviewLabel = completed ? `${reviewed} / ${completed}` : 'Pending'

  const steps = [
    {
      label: 'Project selected',
      detail: hasProject ? 'Ready' : 'Choose project',
      done: hasProject,
    },
    {
      label: 'Images uploaded',
      detail: uploaded ? `${batch?.total_jobs ?? 0} images` : 'Start validation run',
      done: uploaded,
    },
    {
      label: 'AI processing',
      detail: processing ? `${processing} active` : completed ? 'Complete' : 'Pending',
      done: completed > 0 && !processing,
    },
    {
      label: 'Review in progress',
      detail: reviewLabel,
      done: completed > 0 && reviewed >= completed,
    },
    {
      label: 'Validation report',
      detail: reportReady ? 'Ready' : 'Pending',
      done: reportReady,
    },
  ]

  return (
    <Panel eyebrow="Workflow" title="Validation progress">
      <div className="grid min-w-0 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((step, index) => (
          <div
            className="min-w-0 rounded-2xl border border-border bg-background p-4"
            key={step.label}
          >
            <div className="flex items-start gap-3">
              <div className={step.done
                ? 'grid size-9 shrink-0 place-items-center rounded-xl bg-success/10 text-success'
                : 'grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground'}
              >
                {step.done ? <CheckCircle2 className="size-4" aria-hidden="true" /> : index + 1}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{step.label}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function CurrentBatchSummary({
  batch,
  reviewed,
}: {
  batch?: InspectionBatch
  reviewed: number
}) {
  const jobs = batch?.jobs ?? []
  const completed = batch?.progress?.completed ?? 0
  const processing = (batch?.progress?.processing ?? 0) + (batch?.progress?.queued ?? 0)
  const defectsFound = jobs.reduce(
    (sum, job) => sum + (job.detection_count ?? job.detections?.length ?? 0),
    0,
  )
  const awaitingReview = Math.max(completed - reviewed, 0)

  return (
    <Panel
      action={<StatusBadge status={batch?.status}>{batch?.status ?? 'waiting'}</StatusBadge>}
      eyebrow="Current batch"
      title="Summary"
    >
      <div className="grid min-w-0 gap-4 p-5">
        {!batch ? (
          <div className="rounded-2xl border border-border bg-background p-5 text-sm leading-6 text-muted-foreground">
            No active validation batch yet. Upload a batch to start AI processing.
          </div>
        ) : (
          <>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Images" value={batch.total_jobs} />
              <MetricCard label="Completed" value={completed} />
              <MetricCard label="Processing" value={processing} />
              <MetricCard label="Defects found" value={defectsFound} />
              <MetricCard label="Reviewed" value={reviewed} />
              <MetricCard label="Awaiting review" value={awaitingReview} />
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-foreground">Processing completion</span>
                <span className="text-muted-foreground">
                  {Math.round((batch.progress?.completion_rate ?? 0) * 100)}%
                </span>
              </div>
              <ProgressBar value={Math.round((batch.progress?.completion_rate ?? 0) * 100)} />
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}

function NextActionCard({
  batch,
  projectId,
  reviewed,
}: {
  batch?: InspectionBatch
  projectId: string
  reviewed: number
}) {
  const completed = batch?.progress?.completed ?? 0
  const processing = (batch?.progress?.processing ?? 0) + (batch?.progress?.queued ?? 0)
  const awaitingReview = Math.max(completed - reviewed, 0)
  let title = 'Upload New Validation Batch'
  let description = 'Choose a project and upload inspection images to start a validation run.'
  let href = '/projects'
  let cta = 'Open Projects'
  let icon = <UploadCloud className="size-4" aria-hidden="true" />

  if (!projectId) {
    title = 'Choose a Project'
    description = 'Select the product line or packaging scope you want to validate.'
  } else if (batch && processing > 0) {
    title = 'Continue Processing'
    description = `${processing} image${processing === 1 ? '' : 's'} still queued or processing. Refresh the batch when processing completes.`
    href = `/projects/${projectId}/batches/${batch.id}`
    cta = 'Open Batch Status'
    icon = <Activity className="size-4" aria-hidden="true" />
  } else if (batch && awaitingReview > 0) {
    title = 'Review Remaining Images'
    description = `${awaitingReview} completed image${awaitingReview === 1 ? '' : 's'} still need operator feedback.`
    href = `/projects/${projectId}/batches/${batch.id}`
    cta = 'Review Batch'
    icon = <ClipboardCheck className="size-4" aria-hidden="true" />
  } else if (batch && completed > 0) {
    title = 'Open Validation Report'
    description = 'The batch has reviewed output available for buyer-facing validation analysis.'
    href = `/projects/${projectId}/batches/${batch.id}/report`
    cta = 'Open Report'
    icon = <FileBarChart className="size-4" aria-hidden="true" />
  }

  return (
    <Panel eyebrow="Next action" title={title}>
      <div className="grid min-w-0 gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-button transition hover:brightness-110"
          to={href}
        >
          {icon}
          {cta}
        </Link>
      </div>
    </Panel>
  )
}

function RecentValidationRuns({
  batches,
  isFetching,
  onRefresh,
  projectId,
  selectedBatchId,
  onSelect,
}: {
  batches: InspectionBatch[]
  isFetching: boolean
  onRefresh: () => void
  projectId: string
  selectedBatchId?: string
  onSelect: (batchId: string) => void
}) {
  return (
    <Panel
      action={(
        <Button
          disabled={!projectId}
          isLoading={isFetching}
          leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
          onClick={onRefresh}
          size="sm"
          variant="ghost"
        >
          Refresh
        </Button>
      )}
      eyebrow="History"
      title="Recent validation runs"
    >
      <div className="grid min-w-0 gap-3 p-5">
        {batches.length ? (
          batches.map((batch) => {
            const reviewed = 0
            return (
              <article
                className="grid min-w-0 gap-3 rounded-2xl border border-border bg-background p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                key={batch.id}
              >
                <button
                  className="min-w-0 text-left"
                  onClick={() => onSelect(batch.id)}
                  type="button"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <StatusBadge status={batch.status}>{batch.status}</StatusBadge>
                    {selectedBatchId === batch.id ? <StatusBadge tone="primary">Current</StatusBadge> : null}
                    <p className="truncate text-sm font-semibold text-foreground">
                      {batch.name || 'Validation batch'}
                    </p>
                  </div>
                  <div className="mt-3 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{batch.total_jobs} images</span>
                    <span>{reviewed} reviewed</span>
                    <span>{formatDate(batch.created_at)}</span>
                  </div>
                </button>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                    to={`/projects/${projectId}/batches/${batch.id}`}
                  >
                    Review
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
          <div className="rounded-2xl border border-border bg-background p-5 text-sm leading-6 text-muted-foreground">
            No validation runs yet. Start by uploading a batch of inspection images.
          </div>
        )}
      </div>
    </Panel>
  )
}

function LatestAnalyzedImagePreview({
  batch,
  projectId,
}: {
  batch?: InspectionBatch
  projectId: string
}) {
  const jobs = batch?.jobs ?? []
  const latestCompletedJob = jobs
    .filter((job) => job.status === 'completed')
    .sort((left, right) => {
      const leftTime = new Date(left.completed_at ?? left.updated_at ?? left.created_at ?? 0).getTime()
      const rightTime = new Date(right.completed_at ?? right.updated_at ?? right.created_at ?? 0).getTime()
      return rightTime - leftTime
    })[0]
  const processing = (batch?.progress?.processing ?? 0) + (batch?.progress?.queued ?? 0)
  const normalizedImageUrl = getImageUrl(
    latestCompletedJob?.annotated_image_url ??
    latestCompletedJob?.result?.annotated_image_url ??
    latestCompletedJob?.image_url,
  )
  const {
    error: authenticatedImageError,
    imageUrl: displayImageUrl,
    isLoading: isImageLoading,
  } = useAuthenticatedImageUrl(normalizedImageUrl || null)
  const [hasImageElementError, setHasImageElementError] = useState(false)
  const findings = latestCompletedJob?.detection_count ?? latestCompletedJob?.detections?.length ?? 0
  const hasImageError = Boolean(authenticatedImageError || hasImageElementError)

  useEffect(() => {
    setHasImageElementError(false)
  }, [normalizedImageUrl])

  return (
    <Panel
      action={latestCompletedJob ? <StatusBadge status={latestCompletedJob.status}>{latestCompletedJob.status}</StatusBadge> : null}
      eyebrow="Latest result"
      title="Latest analyzed image"
    >
      <div className="grid min-w-0 max-w-full gap-4 p-5">
        {latestCompletedJob ? (
          <>
            <div className="grid aspect-[4/3] min-w-0 place-items-center overflow-hidden rounded-2xl border border-border bg-background">
              {displayImageUrl && !hasImageError ? (
                <img
                  alt={latestCompletedJob.original_filename ?? 'Latest analyzed image'}
                  className="h-full w-full object-contain"
                  onError={() => setHasImageElementError(true)}
                  src={displayImageUrl}
                />
              ) : hasImageError ? (
                <div className="grid h-full place-items-center px-6 text-center">
                  <div>
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-border bg-surface text-muted-foreground">
                      <ImageOff className="size-5" aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">Image preview unavailable</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Open review to inspect the full image.
                    </p>
                  </div>
                </div>
              ) : isImageLoading ? (
                <div className="h-full w-full animate-pulse bg-muted" />
              ) : (
                <FileImage className="size-10 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {latestCompletedJob.original_filename ?? 'Inspection image'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {findings} finding{findings === 1 ? '' : 's'} detected
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-button transition hover:brightness-110"
              to={projectId && batch?.id && latestCompletedJob.job_id
                ? `/projects/${projectId}/batches/${batch.id}/jobs/${latestCompletedJob.job_id}`
                : '#'}
            >
              Review image
            </Link>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-background p-5 text-sm leading-6 text-muted-foreground">
            {processing > 0
              ? `${processing} image${processing === 1 ? '' : 's'} still processing. The analyzed image preview will appear here after processing.`
              : 'Analyzed image preview will appear here after processing.'}
          </div>
        )}
      </div>
    </Panel>
  )
}

export function DashboardPage() {
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const [selectedProjectId, setSelectedProjectId] = useState(() => readStoredProjectId(currentWorkspace?.id))
  const [selectedBatchId, setSelectedBatchId] = useState<string>()
  const [newBatchName, setNewBatchName] = useState('')
  const [newBatchDescription, setNewBatchDescription] = useState('')
  const [createBatchError, setCreateBatchError] = useState<string>()
  const canUpload =
    currentWorkspace?.role === 'OWNER' ||
    currentWorkspace?.role === 'ADMIN' ||
    currentWorkspace?.role === 'ENGINEER'

  const { data: assignedProjects, isFetching: isFetchingProjects } =
    useGetAssignedProjectsQuery(currentWorkspace?.id)
  const [createBatch, { isLoading: isCreatingBatch }] = useCreateBatchMutation()
  const selectedProject = assignedProjects?.items.find(
    (project) => project.id === selectedProjectId,
  )

  useEffect(() => {
    const storedProjectId = readStoredProjectId(currentWorkspace?.id)
    if (!assignedProjects) return
    if (!storedProjectId) return
    if (!assignedProjects.items.some((project) => project.id === storedProjectId)) {
      setSelectedProjectId('')
      return
    }

    setSelectedProjectId(storedProjectId)
  }, [assignedProjects, currentWorkspace?.id])

  useEffect(() => {
    if (!assignedProjects) return
    writeStoredProjectId(currentWorkspace?.id, selectedProjectId)
  }, [assignedProjects, currentWorkspace?.id, selectedProjectId])
  const {
    currentData: batchesData,
    isFetching: isFetchingBatches,
    refetch: refetchBatches,
  } = useGetBatchesQuery(
    {
      workspaceId: currentWorkspace?.id,
      projectId: selectedProjectId,
      limit: 8,
      offset: 0,
    },
    {
      skip: !currentWorkspace?.id || !selectedProjectId,
    },
  )

  const batches = batchesData?.items ?? []
  const selectedBatch = (selectedBatchId ? batches.find((batch) => batch.id === selectedBatchId) : undefined) ?? batches[0]
  const activeBatchId = selectedBatchId ?? selectedBatch?.id
  const { currentData: batchDetail } = useGetBatchQuery(
    {
      workspaceId: currentWorkspace?.id,
      batchId: activeBatchId,
    },
    {
      skip: !currentWorkspace?.id || !activeBatchId,
    },
  )
  const { currentData: batchFeedbackData } = useGetBatchFeedbackQuery(
    {
      workspaceId: currentWorkspace?.id,
      projectId: selectedProjectId,
      batchId: activeBatchId,
    },
    {
      skip: !currentWorkspace?.id || !selectedProjectId || !activeBatchId,
    },
  )
  const currentBatch = batchDetail ?? selectedBatch
  const reviewedJobIds = new Set((batchFeedbackData?.items ?? []).map((item) => item.job_id))
  const reviewed = reviewedJobIds.size
  const currentStatus = statusLabel(currentBatch, reviewed)

  const handleCreateBatch = async () => {
    if (!currentWorkspace?.id || !selectedProjectId || !canUpload) return

    try {
      setCreateBatchError(undefined)
      const batch = await createBatch({
        workspaceId: currentWorkspace.id,
        projectId: selectedProjectId,
        name: newBatchName.trim() || undefined,
        description: newBatchDescription.trim() || undefined,
      }).unwrap()
      setSelectedBatchId(batch.id)
      setNewBatchName('')
      setNewBatchDescription('')
      void refetchBatches()
    } catch (error) {
      const message = error && typeof error === 'object' && 'error' in error
        ? String((error as { error?: string }).error)
        : 'Unable to create validation batch.'
      setCreateBatchError(message)
    }
  }

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5 overflow-x-hidden">
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-card sm:p-6">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Validation command center
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                What should we validate next?
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Guide a packaging inspection pilot from project setup to batch upload, AI processing, review, and report export.
              </p>
            </div>
            <div className="grid min-w-0 gap-3 rounded-2xl border border-border bg-background p-4 text-sm lg:min-w-[21rem]">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="text-muted-foreground">Project</span>
                <span className="min-w-0 truncate font-semibold text-foreground">
                  {selectedProject?.name ?? 'Not selected'}
                </span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="text-muted-foreground">Current batch</span>
                <span className="min-w-0 truncate font-semibold text-foreground">
                  {currentBatch?.name || (currentBatch ? 'Validation batch' : 'None')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge tone={currentBatch ? 'primary' : 'warning'}>{currentStatus}</StatusBadge>
              </div>
            </div>
          </div>
        </section>

        <WorkflowProgress
          batch={currentBatch}
          hasProject={Boolean(selectedProjectId)}
          reviewed={reviewed}
        />

        <section className="grid min-w-0 max-w-full gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] xl:items-start">
          <div className="grid min-w-0 max-w-full gap-5">
            <Panel eyebrow="Project" title="Validation scope">
              <div className="grid min-w-0 gap-4 p-5">
                <select
                  className="h-11 min-w-0 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                  disabled={isFetchingProjects}
                  onChange={(event) => {
                    setSelectedProjectId(event.target.value)
                    setSelectedBatchId(undefined)
                  }}
                  value={selectedProjectId}
                >
                  <option value="">Select project</option>
                  {assignedProjects?.items.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                  <div className="flex min-w-0 items-center gap-2">
                    <FolderKanban className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 truncate font-semibold text-foreground">
                      {selectedProject?.name ?? 'Choose a packaging validation project'}
                    </span>
                  </div>
                  <p className="mt-2 break-words">
                    {selectedProject?.description || 'A project should represent one product line, packaging type, or inspection scope.'}
                  </p>
                </div>
                <div className="grid min-w-0 gap-3 rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Create validation batch</p>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <input
                      className="h-10 min-w-0 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                      disabled={!selectedProjectId || !canUpload}
                      onChange={(event) => setNewBatchName(event.target.value)}
                      placeholder="June production run"
                      value={newBatchName}
                    />
                    <Button
                      disabled={!selectedProjectId || !canUpload}
                      isLoading={isCreatingBatch}
                      onClick={() => void handleCreateBatch()}
                    >
                      Create Empty Batch
                    </Button>
                  </div>
                  <textarea
                    className="min-h-20 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                    disabled={!selectedProjectId || !canUpload}
                    onChange={(event) => setNewBatchDescription(event.target.value)}
                    placeholder="Optional run notes"
                    value={newBatchDescription}
                  />
                  {createBatchError ? (
                    <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                      {createBatchError}
                    </p>
                  ) : null}
                </div>
              </div>
            </Panel>

            <CurrentBatchSummary batch={currentBatch} reviewed={reviewed} />

            <RecentValidationRuns
              batches={batches}
              isFetching={isFetchingBatches}
              onRefresh={() => void refetchBatches()}
              onSelect={setSelectedBatchId}
              projectId={selectedProjectId}
              selectedBatchId={currentBatch?.id}
            />
          </div>

          <div className="grid min-w-0 max-w-full gap-5">
            <BatchUploadPanel
              batchId={activeBatchId}
              ctaLabel="Add Images to Validation Run"
              disabledReason={
                !selectedProjectId
                  ? 'Choose a project before adding validation images.'
                  : !activeBatchId
                    ? 'Create or select a validation run before adding images.'
                    : canUpload
                      ? undefined
                      : 'Your workspace role can view validation runs, but cannot upload images.'
              }
              eyebrow="Primary action"
              isDisabled={!selectedProjectId || !activeBatchId || !canUpload}
              onUploaded={(batchId) => {
                setSelectedBatchId(batchId)
                void refetchBatches()
              }}
              projectId={selectedProjectId}
              title="Add images to validation run"
              workspaceId={currentWorkspace?.id}
            />

            <LatestAnalyzedImagePreview batch={currentBatch} projectId={selectedProjectId} />

            <NextActionCard
              batch={currentBatch}
              projectId={selectedProjectId}
              reviewed={reviewed}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
