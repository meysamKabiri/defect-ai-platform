import { Activity, Boxes, Timer } from 'lucide-react'
import type {
  DetectionJobResponse,
  DetectionResult,
} from '@/features/detection/detectionTypes'

type StatsCardProps = {
  result?: DetectionResult
  job?: DetectionJobResponse
}

export function StatsCard({ result, job }: StatsCardProps) {
  const stats = [
    {
      label: 'Defects',
      value: result?.defects.length ?? job?.result?.detections?.length ?? job?.detections?.length ?? 0,
      icon: Boxes,
    },
    {
      label: 'Processing',
      value: result?.processingTimeSeconds
        ? `${result.processingTimeSeconds}s`
        : job?.processing_time_seconds
          ? `${job.processing_time_seconds}s`
          : '--',
      icon: Timer,
    },
    {
      label: 'Model',
      value: result?.modelVersion ?? job?.model_version ?? 'YOLOv8',
      icon: Activity,
    },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
          <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-slate-900 text-cyan-300">
            <stat.icon className="size-5" />
          </div>
          <p className="truncate text-xl font-semibold text-white">{stat.value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{stat.label}</p>
        </div>
      ))}
    </section>
  )
}
