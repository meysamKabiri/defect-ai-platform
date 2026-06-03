import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react'
import { Panel } from '@/components/common/Panel'
import { StatusBadge } from '@/components/common/StatusBadge'
import type {
  DetectionBox,
  DetectionJobResponse,
  DetectionResult,
  HumanFeedbackResponse,
  HumanFeedbackType,
} from '@/features/detection/detectionTypes'
import { cn } from '@/lib/utils'

type DetectionCardProps = {
  result?: DetectionResult
  job?: DetectionJobResponse
  error?: string
  feedbackItems?: HumanFeedbackResponse[]
  isLoading?: boolean
  isSubmittingFeedback?: boolean
  canSubmitFeedback?: boolean
  feedbackDisabledReason?: string
  feedbackSavedMessage?: string
  onSubmitFeedback?: (feedbackType: HumanFeedbackType) => void
}

const feedbackOptions: Array<{
  label: string
  value: HumanFeedbackType
}> = [
  { label: 'Correct', value: 'correct' },
  { label: 'False Positive', value: 'false_positive' },
  { label: 'Wrong Class', value: 'wrong_class' },
  { label: 'Missed Defect', value: 'missed_defect' },
  { label: 'Not Sure', value: 'not_sure' },
  { label: 'Bad Image', value: 'bad_image' },
]

const feedbackLabelByType = Object.fromEntries(
  feedbackOptions.map((option) => [option.value, option.label]),
) as Record<HumanFeedbackType, string>

function formatPercent(value?: number) {
  if (value === undefined) return '--'

  return `${(value * 100).toFixed(1)}%`
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
  canSubmitFeedback: canSubmitFeedbackAction = true,
  error,
  feedbackDisabledReason,
  feedbackItems = [],
  feedbackSavedMessage,
  isLoading,
  isSubmittingFeedback,
  job,
  onSubmitFeedback,
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
  const canSubmitFeedback =
    canSubmitFeedbackAction &&
    Boolean(job?.job_id ?? result?.jobId) &&
    status === 'completed' &&
    !isLoading &&
    Boolean(onSubmitFeedback)
  const latestFeedback = feedbackItems[0]

  return (
    <Panel
      className="min-h-0"
      action={<StatusBadge status={status}>{status}</StatusBadge>}
      eyebrow="Output"
      title="Detection results"
    >
      <div className="grid min-w-0 gap-5 p-5">
        {error && (
          <div className="flex gap-3 rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm leading-6 text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="min-w-0 rounded-2xl border border-border bg-background">
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
            <div className="max-h-[26rem] min-h-0 overflow-auto">
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

                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Bounding-box geometry is shown on the inspection canvas.
                    </p>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Operator feedback</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Capture one-click validation signal for the current prediction.
              </p>
            </div>
            {latestFeedback ? (
              <StatusBadge tone="primary">
                Saved: {feedbackLabelByType[latestFeedback.feedback_type]}
              </StatusBadge>
            ) : (
              <StatusBadge tone="warning">Unreviewed</StatusBadge>
            )}
          </div>

          {feedbackSavedMessage ? (
            <div className="mt-4 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success">
              {feedbackSavedMessage}
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {feedbackOptions.map((option) => (
              <button
                className={cn(
                  'min-h-10 rounded-xl border px-3 py-2 text-sm font-semibold transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60',
                  latestFeedback?.feedback_type === option.value
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border bg-surface text-foreground',
                )}
                disabled={!canSubmitFeedback || isSubmittingFeedback}
                key={option.value}
                onClick={() => onSubmitFeedback?.(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          {!canSubmitFeedback ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {feedbackDisabledReason ?? 'Feedback unlocks after a completed detection job is loaded.'}
            </p>
          ) : null}
        </div>

        <details className="min-w-0 rounded-2xl border border-border bg-background p-4">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Job details
          </summary>
          <dl className="mt-4 grid gap-3">
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
        </details>
      </div>
    </Panel>
  )
}
