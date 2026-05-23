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
    <section className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Image review
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {boxes.length > 0
              ? `${boxes.length} detection box${boxes.length === 1 ? '' : 'es'} rendered`
              : 'Awaiting detection boxes'}
          </p>
        </div>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-800 bg-[linear-gradient(45deg,rgba(30,41,59,.42)_25%,transparent_25%),linear-gradient(-45deg,rgba(30,41,59,.42)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(30,41,59,.42)_75%),linear-gradient(-45deg,transparent_75%,rgba(30,41,59,.42)_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={alt} className="h-full w-full object-contain" />
            {boxes.map((box, index) => {
              const geometry = getBoxGeometry(box)
              const label = box.label ?? box.class_name

              return (
                <div
                  key={`${label}-${box.id ?? index}`}
                  className="absolute border-2 border-rose-400 bg-rose-500/10 shadow-[0_0_0_1px_rgba(15,23,42,0.9)]"
                  style={{
                    left: `${toPercent(geometry.left)}%`,
                    top: `${toPercent(geometry.top)}%`,
                    width: `${toPercent(geometry.width)}%`,
                    height: `${toPercent(geometry.height)}%`,
                  }}
                >
                  <span className="absolute left-0 top-0 max-w-[180px] -translate-y-full truncate rounded-t-md bg-rose-500 px-2 py-1 text-xs font-semibold text-white">
                    {label} {(box.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </>
        ) : (
          <div className="grid h-full place-items-center px-8 text-center text-sm text-slate-500">
            <p>Image preview appears here after you select a file.</p>
          </div>
        )}
      </div>
    </section>
  )
}
