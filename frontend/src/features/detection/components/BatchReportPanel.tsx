import { Link } from 'react-router-dom'
import { Download, FileBarChart } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Panel } from '@/components/common/Panel'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { BatchReportSummary, InspectionBatch } from '@/features/detection/detectionTypes'
import {
  useGetBatchReportSummaryQuery,
  useLazyGetBatchReportCsvQuery,
} from '@/services/detectionApi'

type BatchReportPanelProps = {
  workspaceId?: string
  projectId?: string
  batch?: InspectionBatch
}

export function BatchReportPanel({
  workspaceId,
  projectId,
  batch,
}: BatchReportPanelProps) {
  const resolvedProjectId = projectId ?? batch?.project_id ?? undefined
  const {
    currentData: summary,
    isFetching,
  } = useGetBatchReportSummaryQuery(
    {
      workspaceId,
      projectId: resolvedProjectId,
      batchId: batch?.id,
    },
    {
      skip: !workspaceId || !batch?.id,
    },
  )
  const [getCsv, { isFetching: isDownloading }] = useLazyGetBatchReportCsvQuery()

  const handleDownloadCsv = async () => {
    if (!workspaceId || !batch?.id) return
    const csv = await getCsv({
      workspaceId,
      projectId: resolvedProjectId,
      batchId: batch.id,
    }).unwrap()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `defectai-batch-${batch.id}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Panel
      className="min-w-0"
      action={(
        <div className="flex min-w-0 flex-wrap justify-end gap-2">
          {resolvedProjectId && batch?.id ? (
            <>
              <Link
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                to={`/projects/${resolvedProjectId}/batches/${batch.id}`}
              >
                Review
              </Link>
              <Link
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                to={`/projects/${resolvedProjectId}/batches/${batch.id}/report`}
              >
                Report
              </Link>
            </>
          ) : null}
          <Button
            disabled={!workspaceId || !batch?.id}
            isLoading={isDownloading}
            leftIcon={<Download className="size-4" aria-hidden="true" />}
            onClick={() => void handleDownloadCsv()}
            size="sm"
            variant="secondary"
          >
            CSV
          </Button>
        </div>
      )}
      eyebrow="Report"
      title="Validation summary"
    >
      <div className="grid min-w-0 gap-4 p-5">
        {!batch ? (
          <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
            Select a batch to review validation results.
          </div>
        ) : summary ? (
          <ReportSummary summary={summary} />
        ) : (
          <div className="grid gap-3 rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileBarChart className="size-4" aria-hidden="true" />
              {isFetching ? 'Loading report...' : 'Report is not ready yet.'}
            </div>
            <ProgressBar value={Math.round((batch.progress?.completion_rate ?? 0) * 100)} />
          </div>
        )}
      </div>
    </Panel>
  )
}

function ReportSummary({ summary }: { summary: BatchReportSummary }) {
  const progress = Math.round(summary.completion_rate * 100)

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <ReportMetric label="Images" value={summary.total_images} />
        <ReportMetric label="Defects" value={summary.total_detections} />
        <ReportMetric label="Reviewed" value={summary.reviewed_jobs} />
        <ReportMetric
          label="Avg confidence"
          value={summary.average_confidence == null ? 'n/a' : `${Math.round(summary.average_confidence * 100)}%`}
        />
      </div>
      <div className="grid min-w-0 gap-2">
        {summary.batch_description ? (
          <div className="rounded-2xl border border-border bg-background p-3 text-sm leading-6 text-muted-foreground">
            <span className="font-semibold text-foreground">Description: </span>
            {summary.batch_description}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{progress}% terminal</span>
          <StatusBadge tone={summary.failed ? 'warning' : 'success'}>
            {summary.failed ? `${summary.failed} failed` : 'Clean run'}
          </StatusBadge>
        </div>
        <ProgressBar value={progress} />
      </div>
      <ReportCounts
        emptyLabel="No detections yet"
        items={summary.class_counts.map((item) => ({
          label: item.class_name,
          count: item.count,
        }))}
        title="Top classes"
      />
      <ReportCounts
        emptyLabel="No feedback yet"
        items={summary.feedback_counts.map((item) => ({
          label: item.feedback_type.replaceAll('_', ' '),
          count: item.count,
        }))}
        title="Operator feedback"
      />
    </div>
  )
}

function ReportMetric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

function ReportCounts({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string
  items: Array<{ label: string; count: number }>
  title: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <div className="mt-2 grid gap-2">
        {items.length ? (
          items.slice(0, 4).map((item) => (
            <div
              className="flex items-center justify-between gap-3 text-sm"
              key={item.label}
            >
              <span className="truncate capitalize text-foreground">{item.label}</span>
              <span className="font-semibold text-muted-foreground">{item.count}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </div>
    </div>
  )
}
