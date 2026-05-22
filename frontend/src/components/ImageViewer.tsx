import type { DetectionBox } from '@/features/detection/detectionTypes'

function toPercent(value: number) {
  const asPercent = value <= 1 ? value * 100 : value
  return Math.min(100, Math.max(0, asPercent))
}

function getBoxGeometry(box: DetectionBox) {
  if (box.bbox) {
    return {
      left: box.bbox.x1,
      top: box.bbox.y1,
      width: box.bbox.x2 - box.bbox.x1,
      height: box.bbox.y2 - box.bbox.y1,
    }
  }

  return {
    left: box.x ?? 0,
    top: box.y ?? 0,
    width: box.width ?? 0,
    height: box.height ?? 0,
  }
}



type ImageViewerProps = {
  imageUrl: string | null
  boxes?: DetectionBox[]
  alt?: string
}

export function ImageViewer({ imageUrl, boxes = [], alt = 'Uploaded inspection image' }: ImageViewerProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,rgba(148,163,184,0.12)_25%,transparent_25%),linear-gradient(225deg,rgba(148,163,184,0.12)_25%,transparent_25%),linear-gradient(45deg,rgba(148,163,184,0.12)_25%,transparent_25%),linear-gradient(315deg,rgba(148,163,184,0.12)_25%,#020617_25%)] bg-[length:28px_28px] bg-[position:14px_0,14px_0,0_0,0_0]">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={alt} className="h-full w-full object-contain" />
            {boxes.map((box, index) => {
              const geometry = getBoxGeometry(box)
              const label = box.label ?? box.class_name

              return (
                <div
                  key={`${label}-${box.id ?? index}`}
                  className="absolute border-2 border-amber-300 bg-amber-300/10 shadow-[0_0_30px_rgba(251,191,36,0.35)]"
                  style={{
                    left: `${toPercent(geometry.left)}%`,
                    top: `${toPercent(geometry.top)}%`,
                    width: `${toPercent(geometry.width)}%`,
                    height: `${toPercent(geometry.height)}%`,
                  }}
                >
                  <span className="absolute left-0 top-0 -translate-y-full rounded-t-lg bg-amber-300 px-2 py-1 text-xs font-black text-slate-950">
                    {label} {(box.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </>
        ) : (
          <div className="grid h-full place-items-center px-8 text-center text-slate-400">
            <p>Image preview appears here after you select a file.</p>
          </div>
        )}
      </div>
    </section>
  )
}
