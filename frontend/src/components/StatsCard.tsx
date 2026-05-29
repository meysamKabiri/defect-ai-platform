import { Activity, Boxes, CheckCircle2, Timer } from 'lucide-react'
import { Panel } from '@/components/common/Panel'
import type {
  DetectionJobResponse,
  DetectionResult,
} from '@/features/detection/detectionTypes'

type StatsCardProps = {
  result?: DetectionResult
  job?: DetectionJobResponse
}

function formatRuntime(result?: DetectionResult, job?: DetectionJobResponse) {
  const runtime = result?.processingTimeSeconds ?? job?.processing_time_seconds
  return runtime !== undefined ? `${runtime}s` : '--'
}

export function StatsCard({ result, job }: StatsCardProps) {
  const defectCount = result?.defects.length ?? job?.result?.detections?.length ?? job?.detections?.length ?? 0
  const stats = [
    {
      description: 'Detected regions',
      icon: Boxes,
      label: 'Defects',
      value: defectCount,
    },
    {
      description: 'Worker runtime',
      icon: Timer,
      label: 'Processing',
      value: formatRuntime(result, job),
    },
    {
      description: 'Vision pipeline',
      icon: Activity,
      label: 'Model',
      value: result?.modelVersion ?? job?.model_version ?? 'YOLOv8',
    },
    {
      description: 'Current job state',
      icon: CheckCircle2,
      label: 'Status',
      value: job?.status ?? result?.status ?? 'Idle',
    },
  ]

  return (
    <Panel
      description="At-a-glance model and worker telemetry."
      eyebrow="Telemetry"
      title="Inspection summary"
    >
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-1">
        {stats.map((stat) => (
          <article
            className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/30 hover:bg-primary/5"
            key={stat.label}
          >
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{stat.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  )
}
