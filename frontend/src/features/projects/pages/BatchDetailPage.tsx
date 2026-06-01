import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  Download,
  FileImage,
  FolderKanban,
} from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { Panel } from '@/components/common/Panel'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useGetProjectQuery } from '@/features/admin/api/adminApi'
import { selectCurrentWorkspace } from '@/features/auth/authSlice'
import {
  useGetBatchFeedbackQuery,
  useGetBatchProgressQuery,
  useGetBatchQuery,
} from '@/services/detectionApi'

function formatDateTime(value?: string | null) {
  if (!value) return 'Not available'

  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
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

export function BatchDetailPage() {
  const { batchId, projectId } = useParams()
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const { data: project } = useGetProjectQuery(
    {
      workspaceId: currentWorkspace?.id,
      projectId: projectId ?? '',
    },
    {
      skip: !currentWorkspace?.id || !projectId,
    },
  )
  const { data: batch, isFetching } = useGetBatchQuery(
    {
      workspaceId: currentWorkspace?.id,
      batchId,
    },
    {
      skip: !currentWorkspace?.id || !batchId,
    },
  )
  const { data: progress } = useGetBatchProgressQuery(
    {
      workspaceId: currentWorkspace?.id,
      batchId,
    },
    {
      skip: !currentWorkspace?.id || !batchId,
    },
  )
  const { data: feedbackData } = useGetBatchFeedbackQuery(
    {
      workspaceId: currentWorkspace?.id,
      projectId,
      batchId,
    },
    {
      skip: !currentWorkspace?.id || !projectId || !batchId,
    },
  )

  const resolvedProgress = progress ?? batch?.progress
  const progressPercent = Math.round((resolvedProgress?.completion_rate ?? 0) * 100)
  const jobs = batch?.jobs ?? []
  const feedbackItems = feedbackData?.items ?? []
  const totalDetections = jobs.reduce(
    (sum, job) => sum + (job.detection_count ?? job.detections?.length ?? 0),
    0,
  )

  return (
    <main className="mx-auto grid w-full max-w-[1180px] gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
          to={projectId ? `/projects/${projectId}` : '/projects'}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Project
        </Link>
      </div>

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Batch detail
            </p>
            <StatusBadge status={batch?.status}>{batch?.status ?? 'loading'}</StatusBadge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {batch?.name ?? (isFetching ? 'Loading batch...' : 'Batch not found')}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {currentWorkspace?.name ?? 'Workspace'} / {project?.name ?? 'Project'}
          </p>
          {batch?.description ? (
            <p className="mt-3 max-w-2xl rounded-2xl border border-border bg-surface px-4 py-3 text-sm leading-6 text-muted-foreground">
              {batch.description}
            </p>
          ) : null}
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Uploaded by {batch?.uploaded_by_name || batch?.uploaded_by_email || 'Not available'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
          <KpiTile label="Images" value={batch?.total_jobs ?? 0} />
          <KpiTile label="Completed" value={resolvedProgress?.completed ?? 0} />
          <KpiTile label="Failed" value={resolvedProgress?.failed ?? 0} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <Panel eyebrow="Progress" title="Batch processing">
          <div className="grid gap-4 p-5">
            <ProgressBar value={progressPercent} />
            <div className="grid gap-3 sm:grid-cols-4">
              <KpiTile label="Queued" value={resolvedProgress?.queued ?? 0} />
              <KpiTile label="Processing" value={resolvedProgress?.processing ?? 0} />
              <KpiTile label="Complete" value={resolvedProgress?.completed ?? 0} />
              <KpiTile label="Detections" value={totalDetections} />
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Context" title="Batch context">
          <div className="grid gap-3 p-5 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <FolderKanban className="size-4 text-primary" aria-hidden="true" />
              {project?.name ?? projectId ?? 'Project'}
            </div>
            <div className="inline-flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" aria-hidden="true" />
              Created {formatDateTime(batch?.created_at)}
            </div>
            <div className="inline-flex items-center gap-2">
              <Boxes className="size-4 text-primary" aria-hidden="true" />
              {totalDetections} model-generated detection row{totalDetections === 1 ? '' : 's'}
            </div>
            <div className="inline-flex items-center gap-2">
              <Download className="size-4 text-primary" aria-hidden="true" />
              {feedbackItems.length} feedback record{feedbackItems.length === 1 ? '' : 's'}
            </div>
            {batch?.description ? (
              <div className="rounded-2xl border border-border bg-background p-3 leading-6">
                <span className="font-semibold text-foreground">Description: </span>
                {batch.description}
              </div>
            ) : null}
          </div>
        </Panel>
      </section>

      <div className="flex justify-end">
        <Link
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          to={projectId && batchId ? `/projects/${projectId}/batches/${batchId}/report` : '#'}
        >
          Open report
        </Link>
      </div>

      <Panel eyebrow="Images" title="Jobs in this batch">
        <div className="grid gap-3 p-5">
          {jobs.length ? (
            jobs.map((job) => (
              <Link
                className="grid gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_auto]"
                key={job.job_id}
                to={
                  projectId && batchId && job.job_id
                    ? `/projects/${projectId}/batches/${batchId}/jobs/${job.job_id}`
                    : '#'
                }
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileImage className="size-4 text-primary" aria-hidden="true" />
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {job.original_filename ?? job.job_id ?? 'Inspection image'}
                    </h2>
                    <StatusBadge status={job.status}>{job.status}</StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span>{job.detection_count ?? job.detections?.length ?? 0} detections</span>
                    <span>Created {formatDateTime(job.created_at)}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground md:text-right">
                  {job.completed_at ? `Completed ${formatDateTime(job.completed_at)}` : 'Awaiting completion'}
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-border bg-background p-6 text-sm leading-6 text-muted-foreground">
              No jobs are available for this batch yet.
            </div>
          )}
        </div>
      </Panel>

      <Panel eyebrow="Feedback" title="Batch feedback">
        <div className="overflow-x-auto p-5">
          {feedbackItems.length ? (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Image</th>
                  <th className="px-3 py-2">Predicted class</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">Feedback</th>
                  <th className="px-3 py-2">Corrected class</th>
                  <th className="px-3 py-2">Reviewer</th>
                  <th className="px-3 py-2">Reviewed at</th>
                  <th className="px-3 py-2">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {feedbackItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 text-foreground">{item.image_filename ?? 'Image'}</td>
                    <td className="px-3 py-3 text-muted-foreground">{item.predicted_class ?? 'Whole image'}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {item.confidence !== null && item.confidence !== undefined
                        ? `${(item.confidence * 100).toFixed(1)}%`
                        : 'Not available'}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge tone="primary">{item.feedback_type.replaceAll('_', ' ')}</StatusBadge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{item.corrected_class_name ?? '-'}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {item.reviewer_name || item.reviewer_email || 'Unknown'}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDateTime(item.reviewed_at)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{item.comment ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded-2xl border border-border bg-background p-6 text-sm leading-6 text-muted-foreground">
              No feedback has been submitted for this batch yet.
            </div>
          )}
        </div>
      </Panel>
    </main>
  )
}
