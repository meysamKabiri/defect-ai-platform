import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Crosshair,
  Gauge,
  Info,
  Timer,
} from 'lucide-react'
import { Panel } from '@/components/common/Panel'
import { StatusBadge } from '@/components/common/StatusBadge'
import type {
  DetectionBox,
  DetectionJobResponse,
  DetectionResult,
} from '@/features/detection/detectionTypes'
import { cn } from '@/lib/utils'

type DetectionCardProps = {
  result?: DetectionResult
  job?: DetectionJobResponse
  error?: string
  isLoading?: boolean
}

function formatPercent(value?: number) {
  if (value === undefined) return '--'

  return `${(value * 100).toFixed(1)}%`
}

function formatNumber(value?: number) {
  if (value === undefined) return '--'

  return value.toFixed(2)
}

function getDetections(
  result?: DetectionResult,
  job?: DetectionJobResponse,
): DetectionBox[] {
  return (
    result?.defects ??
    job?.result?.detections ??
    job?.detections ??
    []
  )
}

function getConfidenceTone(confidence: number) {
  if (confidence >= 0.85) return 'danger'
  if (confidence >= 0.65) return 'warning'
  return 'primary'
}

function DataTile({
  label,
  value,
}: {
  label: string
  value?: string | number
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-foreground">
        {value ?? '--'}
      </dd>
    </div>
  )
}

function EmptyDetectionState({
  isLoading,
}: {
  isLoading?: boolean
}) {
  return (
    <div className="grid min-h-52 place-items-center rounded-2xl border border-border bg-background p-6 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ClipboardList className="size-5" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-foreground">
          {isLoading ? 'Waiting for inference output' : 'No detection rows yet'}
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {isLoading
            ? 'The worker is processing the queued job. Detection rows will appear here as soon as the backend returns results.'
            : 'Run an analysis to populate model confidence, class labels, and bounding-box geometry.'}
        </p>
      </div>
    </div>
  )
}

export function DetectionCard({
  error,
  isLoading,
  job,
  result,
}: DetectionCardProps) {
  const defects = getDetections(result, job)
  const annotatedImageUrl =
    result?.annotatedImageUrl ??
    job?.result?.annotated_image_url ??
    job?.annotated_image_url
  const processingTime =
    result?.processingTimeSeconds ??
    job?.processing_time_seconds
  const status = job?.status ?? result?.status ?? 'idle'

  return (
    <Panel
      action={<StatusBadge status={status}>{status}</StatusBadge>}
      description="Scan model output, confidence scores, and persisted job metadata."
      eyebrow="Output"
      title="Detection results"
    >
      <div className="grid gap-5 p-5">
        {error && (
          <div className="flex gap-3 rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm leading-6 text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <DataTile label="Job ID" value={job?.job_id ?? result?.jobId} />
          <DataTile label="RQ worker job" value={job?.rq_job_id ?? result?.rqJobId} />
          <DataTile label="Source image" value={job?.image_url ?? result?.imageUrl} />
          <DataTile label="Annotated image" value={annotatedImageUrl} />
          <DataTile
            label="Processing time"
            value={processingTime !== undefined ? `${processingTime}s` : undefined}
          />
          <DataTile label="Model" value={result?.modelVersion ?? job?.model_version ?? 'YOLOv8'} />
        </dl>

        <div className="rounded-2xl border border-border bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  'grid size-9 place-items-center rounded-xl',
                  defects.length > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success',
                )}
              >
                {defects.length > 0 ? (
                  <AlertTriangle className="size-4" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Detection rows</h3>
                <p className="text-xs text-muted-foreground">
                  {defects.length} model-generated result{defects.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <StatusBadge tone={defects.length > 0 ? 'warning' : 'success'}>
              {defects.length > 0 ? 'Review' : 'Clear'}
            </StatusBadge>
          </div>

          {defects.length === 0 ? (
            <div className="p-4">
              <EmptyDetectionState isLoading={isLoading} />
            </div>
          ) : (
            <div className="max-h-[34rem] overflow-auto">
              {defects.map((defect, index) => {
                const label = defect.label ?? defect.class_name
                const confidenceTone = getConfidenceTone(defect.confidence)

                return (
                  <article
                    className="border-b border-border p-4 transition hover:bg-muted/40 last:border-0"
                    key={`${label}-${defect.id ?? index}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {label}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Class {defect.class_id}{defect.id ? ` · ${defect.id}` : ''}
                        </p>
                      </div>

                      <StatusBadge tone={confidenceTone}>
                        {formatPercent(defect.confidence)}
                      </StatusBadge>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div className="rounded-xl border border-border bg-surface p-3">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <Crosshair className="size-3.5" aria-hidden="true" />
                          X
                        </dt>
                        <dd className="mt-1 font-semibold text-foreground">
                          {formatNumber(defect.x ?? defect.bbox?.x1)}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-border bg-surface p-3">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <Crosshair className="size-3.5" aria-hidden="true" />
                          Y
                        </dt>
                        <dd className="mt-1 font-semibold text-foreground">
                          {formatNumber(defect.y ?? defect.bbox?.y1)}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-border bg-surface p-3">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <Gauge className="size-3.5" aria-hidden="true" />
                          W
                        </dt>
                        <dd className="mt-1 font-semibold text-foreground">
                          {formatNumber(
                            defect.width ??
                            (defect.bbox ? defect.bbox.x2 - defect.bbox.x1 : undefined),
                          )}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-border bg-surface p-3">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <Timer className="size-3.5" aria-hidden="true" />
                          H
                        </dt>
                        <dd className="mt-1 font-semibold text-foreground">
                          {formatNumber(
                            defect.height ??
                            (defect.bbox ? defect.bbox.y2 - defect.bbox.y1 : undefined),
                          )}
                        </dd>
                      </div>
                    </dl>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p>
            Confidence badges highlight high-probability detections first. Persisted job metadata is shown above for audit and debugging workflows.
          </p>
        </div>
      </div>
    </Panel>
  )
}
