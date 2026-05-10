import { AlertTriangle, CheckCircle2, Gauge } from 'lucide-react'
import type { DetectionResult } from '@/features/detection/detectionTypes'

type DetectionCardProps = {
  result?: DetectionResult
  error?: string
  isLoading?: boolean
}

export function DetectionCard({ result, error, isLoading }: DetectionCardProps) {
  const defects = result?.defects ?? []

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Detection result</p>
          <h3 className="mt-2 text-2xl font-black text-white">{isLoading ? 'Scanning image...' : 'Quality report'}</h3>
        </div>
        <div className="grid size-12 place-items-center rounded-2xl bg-amber-300/10 text-amber-200">
          <Gauge className="size-6" />
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {!error && !result && !isLoading && (
        <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300">
          Run an analysis to see defect classes, confidence scores, and model metadata.
        </p>
      )}

      {result && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            {defects.length > 0 ? (
              <AlertTriangle className="size-5 text-amber-300" />
            ) : (
              <CheckCircle2 className="size-5 text-emerald-300" />
            )}
            <p className="text-sm text-slate-200">
              {result.summary ?? (defects.length > 0 ? `${defects.length} potential defect(s) found.` : 'No defects detected.')}
            </p>
          </div>

          {defects.map((defect, index) => (
            <div key={`${defect.label}-${defect.id ?? index}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{defect.label}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{defect.severity ?? 'unclassified'}</p>
                </div>
                <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">
                  {(defect.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
