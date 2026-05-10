import { Activity, Boxes, Timer } from 'lucide-react'
import type { DetectionResult } from '@/features/detection/detectionTypes'

type StatsCardProps = {
  result?: DetectionResult
}

export function StatsCard({ result }: StatsCardProps) {
  const stats = [
    { label: 'Defects', value: result?.defects.length ?? 0, icon: Boxes },
    { label: 'Inference', value: result?.inferenceMs ? `${result.inferenceMs}ms` : '--', icon: Timer },
    { label: 'Model', value: result?.modelVersion ?? 'YOLO', icon: Activity },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
          <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-white/10 text-amber-200">
            <stat.icon className="size-5" />
          </div>
          <p className="text-2xl font-black text-white">{stat.value}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{stat.label}</p>
        </div>
      ))}
    </section>
  )
}
