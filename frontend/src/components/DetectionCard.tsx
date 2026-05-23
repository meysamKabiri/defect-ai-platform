import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Loader2,
} from 'lucide-react'
import type {
  DetectionBox,
  DetectionJobResponse,
  DetectionResult,
} from '@/features/detection/detectionTypes'

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

function DataRow({
  label,
  value,
}: {
  label: string
  value?: string | number
}) {
  return (
    <div className="min-w-0 border-b border-slate-800 py-2 last:border-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-white">
        {value ?? '--'}
      </dd>
    </div>
  )
}

export function DetectionCard({
  result,
  job,
  error,
  isLoading,
}: DetectionCardProps) {
  const defects = getDetections(result, job)
  const annotatedImageUrl =
    result?.annotatedImageUrl ??
    job?.result?.annotated_image_url ??
    job?.annotated_image_url
  const processingTime =
    result?.processingTimeSeconds ??
    job?.processing_time_seconds

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Backend response
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Detection data
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium capitalize text-slate-300">
            {isLoading && <Loader2 className="size-3.5 animate-spin" />}
            {job?.status ?? result?.status ?? 'idle'}
          </div>
        </div>

        {error && (
          <div className="mt-4 flex gap-3 rounded-lg border border-red-900/70 bg-red-950/40 p-3 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!error && !result && !job && !isLoading && (
          <div className="mt-4 flex gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-400">
            <ClipboardList className="mt-0.5 size-4 shrink-0" />
            <span>Run an analysis to populate job and detection fields.</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 p-4">
        <dl className="grid gap-x-4 sm:grid-cols-2">
          <DataRow label="Job ID" value={job?.job_id ?? result?.jobId} />
          <DataRow label="RQ Job ID" value={job?.rq_job_id ?? result?.rqJobId} />
          <DataRow label="Original image" value={job?.image_url ?? result?.imageUrl} />
          <DataRow label="Annotated image" value={annotatedImageUrl} />
          <DataRow
            label="Processing time"
            value={
              processingTime !== undefined
                ? `${processingTime}s`
                : undefined
            }
          />
          <DataRow label="Model" value={result?.modelVersion ?? job?.model_version ?? 'YOLOv8'} />
        </dl>

        <div className="rounded-lg border border-slate-800">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-3 py-2">
            <div className="flex items-center gap-2">
              {defects.length > 0 ? (
                <AlertTriangle className="size-4 text-rose-400" />
              ) : (
                <CheckCircle2 className="size-4 text-emerald-400" />
              )}
              <h3 className="text-sm font-semibold text-white">
                Detections
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {defects.length} total
            </span>
          </div>

          {defects.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">
              No detection rows returned yet.
            </p>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              {defects.map((defect, index) => (
                <article
                  key={`${defect.label ?? defect.class_name}-${defect.id ?? index}`}
                  className="border-b border-slate-800 p-3 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {defect.label ?? defect.class_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Class {defect.class_id} {defect.id ? `- ${defect.id}` : ''}
                      </p>
                    </div>

                    <span className="rounded-md bg-rose-500 px-2 py-1 text-xs font-semibold text-white">
                      {formatPercent(defect.confidence)}
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-md bg-slate-900 p-2">
                      <dt className="text-slate-500">X</dt>
                      <dd className="font-medium text-slate-200">
                        {formatNumber(defect.x ?? defect.bbox?.x1)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-slate-900 p-2">
                      <dt className="text-slate-500">Y</dt>
                      <dd className="font-medium text-slate-200">
                        {formatNumber(defect.y ?? defect.bbox?.y1)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-slate-900 p-2">
                      <dt className="text-slate-500">W</dt>
                      <dd className="font-medium text-slate-200">
                        {formatNumber(
                          defect.width ??
                          (defect.bbox ? defect.bbox.x2 - defect.bbox.x1 : undefined),
                        )}
                      </dd>
                    </div>
                    <div className="rounded-md bg-slate-900 p-2">
                      <dt className="text-slate-500">H</dt>
                      <dd className="font-medium text-slate-200">
                        {formatNumber(
                          defect.height ??
                          (defect.bbox ? defect.bbox.y2 - defect.bbox.y1 : undefined),
                        )}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
