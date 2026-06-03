import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { Panel } from '@/components/common/Panel'
import { StatusBadge } from '@/components/common/StatusBadge'
import { selectCurrentWorkspace } from '@/features/auth/authSlice'
import {
  useGetBatchReportSummaryQuery,
  useLazyGetBatchReportCsvQuery,
} from '@/services/detectionApi'

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) return 'Not available'
  return `${(value * 100).toFixed(1)}%`
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

function CountList({
  emptyLabel,
  items,
}: {
  emptyLabel: string
  items: Array<{ label: string; count: number }>
}) {
  return (
    <div className="grid gap-2">
      {items.length ? (
        items.map((item) => (
          <div
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            key={item.label}
          >
            <span className="capitalize text-muted-foreground">{item.label.replaceAll('_', ' ')}</span>
            <span className="font-semibold text-foreground">{item.count}</span>
          </div>
        ))
      ) : (
        <div className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </div>
  )
}

export function BatchReportPage() {
  const { batchId, projectId } = useParams()
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const [csvError, setCsvError] = useState<string>()
  const { data: summary, isFetching } = useGetBatchReportSummaryQuery(
    {
      workspaceId: currentWorkspace?.id,
      projectId,
      batchId,
    },
    {
      skip: !currentWorkspace?.id || !projectId || !batchId,
    },
  )
  const [loadCsv, csvState] = useLazyGetBatchReportCsvQuery()

  const handleDownloadCsv = async () => {
    if (!currentWorkspace?.id || !projectId || !batchId) return

    try {
      setCsvError(undefined)
      const csv = await loadCsv({
        workspaceId: currentWorkspace.id,
        projectId,
        batchId,
      }).unwrap()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `defectai-${summary?.batch_name ?? batchId}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setCsvError('Unable to download the CSV export.')
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-[1180px] gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
          to={projectId && batchId ? `/projects/${projectId}/batches/${batchId}` : '/projects'}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Batch
        </Link>
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
            to={projectId && batchId ? `/projects/${projectId}/batches/${batchId}` : '/projects'}
          >
            Review images
          </Link>
          <Button
            isLoading={csvState.isFetching}
            leftIcon={<Download className="size-4" aria-hidden="true" />}
            onClick={() => void handleDownloadCsv()}
            size="sm"
            variant="secondary"
          >
            Export CSV
          </Button>
        </div>
      </div>

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Batch report
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {summary?.batch_name ?? (isFetching ? 'Loading report...' : 'Validation report')}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {summary?.workspace_name ?? currentWorkspace?.name ?? 'Workspace'} / {summary?.project_name ?? 'Project'}
          </p>
        </div>
        <StatusBadge tone="primary">
          {formatPercent(summary?.completion_rate)} complete
        </StatusBadge>
      </section>

      {csvError ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {csvError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <KpiTile label="Images" value={summary?.total_images ?? 0} />
        <KpiTile label="Completed" value={summary?.completed_images ?? 0} />
        <KpiTile label="Predictions" value={summary?.total_predictions ?? 0} />
        <KpiTile label="Reviewed" value={summary?.reviewed_images_count ?? 0} />
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <Panel eyebrow="Summary" title="Validation outcome">
          <div className="grid gap-4 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <KpiTile label="False positives" value={summary?.false_positive_count ?? 0} />
              <KpiTile label="Missed defects" value={summary?.missed_defect_count ?? 0} />
              <KpiTile label="Wrong class" value={summary?.wrong_class_count ?? 0} />
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Recommendation</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {summary?.recommendation ?? 'Report data is not available yet.'}
              </p>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Context" title="Batch details">
          <div className="grid gap-3 p-5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Uploaded by</span>
              <span className="font-semibold text-foreground">
                {summary?.uploaded_by_name || summary?.uploaded_by_email || 'Not available'}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Created</span>
              <span className="font-semibold text-foreground">{formatDate(summary?.created_at)}</span>
            </div>
            {summary?.batch_description ? (
              <div className="grid gap-1 rounded-2xl border border-border bg-background p-3">
                <span className="text-muted-foreground">Description</span>
                <span className="font-semibold leading-6 text-foreground">{summary.batch_description}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Avg confidence</span>
              <span className="font-semibold text-foreground">{formatPercent(summary?.average_confidence)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Est. false positive rate</span>
              <span className="font-semibold text-foreground">
                {formatPercent(summary?.estimated_false_positive_rate)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Est. missed defect rate</span>
              <span className="font-semibold text-foreground">
                {formatPercent(summary?.estimated_missed_defect_rate)}
              </span>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Predictions" title="Detected classes">
          <div className="p-5">
            <CountList
              emptyLabel="No predictions yet"
              items={(summary?.prediction_class_counts ?? []).map((item) => ({
                label: item.class_name,
                count: item.count,
              }))}
            />
          </div>
        </Panel>

        <Panel eyebrow="Feedback" title="Operator feedback">
          <div className="p-5">
            <CountList
              emptyLabel="No feedback yet"
              items={(summary?.feedback_counts ?? []).map((item) => ({
                label: item.feedback_type,
                count: item.count,
              }))}
            />
          </div>
        </Panel>
      </section>
    </main>
  )
}
