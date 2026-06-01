import { Boxes, ImageIcon } from 'lucide-react'
import { Panel } from '@/components/common/Panel'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { DetectionBox } from '@/features/detection/detectionTypes'
import { useAuthenticatedImageUrl } from '@/features/detection/hooks/useAuthenticatedImageUrl'

function toPercent(value: number) {
  const asPercent = value <= 1 ? value * 100 : value
  return Math.min(100, Math.max(0, asPercent))
}

function formatConfidence(value: number) {
  return `${(value * 100).toFixed(0)}%`
}

function getBoxGeometry(box: DetectionBox) {
  if (box.bbox) {
    return {
      height: box.bbox.y2 - box.bbox.y1,
      left: box.bbox.x1,
      top: box.bbox.y1,
      width: box.bbox.x2 - box.bbox.x1,
    }
  }

  return {
    height: box.height ?? 0,
    left: box.x ?? 0,
    top: box.y ?? 0,
    width: box.width ?? 0,
  }
}

type ImageViewerProps = {
  imageUrl: string | null
  boxes?: DetectionBox[]
  alt?: string
}

export function ImageViewer({
  alt = 'Uploaded inspection image',
  boxes = [],
  imageUrl,
}: ImageViewerProps) {
  const {
    error: imageError,
    imageUrl: displayUrl,
    isLoading: isImageLoading,
  } = useAuthenticatedImageUrl(imageUrl)

  return (
    <Panel
      className="min-w-0 overflow-hidden"
      action={
        <StatusBadge tone={boxes.length > 0 ? 'warning' : 'default'}>
          {boxes.length > 0 ? `${boxes.length} boxes` : 'No boxes'}
        </StatusBadge>
      }
      eyebrow="Review"
      title="Inspection canvas"
    >
      <div className="min-w-0 p-5">
        <div className="relative aspect-[4/3] max-h-[70vh] w-full overflow-hidden rounded-2xl border border-border bg-muted">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,hsl(var(--border)/0.4)_25%,transparent_25%),linear-gradient(-45deg,hsl(var(--border)/0.4)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,hsl(var(--border)/0.4)_75%),linear-gradient(-45deg,transparent_75%,hsl(var(--border)/0.4)_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]" aria-hidden="true" />

          {displayUrl ? (
            <>
              <img
                alt={alt}
                className="absolute inset-0 z-10 h-full w-full object-contain"
                src={displayUrl}
              />
              <div className="pointer-events-none absolute inset-0 z-20">
                {boxes.map((box, index) => {
                  const geometry = getBoxGeometry(box)
                  const label = box.label ?? box.class_name

                  return (
                    <div
                      className="absolute rounded-sm border-2 border-danger bg-danger/10 shadow-card"
                      key={`${label}-${box.id ?? index}`}
                      style={{
                        height: `${toPercent(geometry.height)}%`,
                        left: `${toPercent(geometry.left)}%`,
                        top: `${toPercent(geometry.top)}%`,
                        width: `${toPercent(geometry.width)}%`,
                      }}
                    >
                      <span className="absolute left-0 top-0 max-w-48 -translate-y-full truncate rounded-t-lg bg-danger px-2 py-1 text-xs font-semibold text-danger-foreground">
                        {label} · {formatConfidence(box.confidence)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="relative z-10 grid h-full place-items-center px-8 text-center">
              <div>
                <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-border bg-surface text-primary shadow-card">
                  <ImageIcon className="size-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {isImageLoading ? 'Loading inspection image' : 'No inspection image selected'}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  {imageError ?? 'Upload a production image to preview it here before AI inference begins.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <details className="mt-4 min-w-0 rounded-xl border border-border bg-background p-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Canvas details
          </summary>
          <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <span>{isImageLoading ? 'Loading image' : imageUrl ? 'Preview ready' : 'Awaiting image'}</span>
            <span className="inline-flex items-center gap-1">
              <Boxes className="size-3.5 text-primary" aria-hidden="true" />
              {boxes.length} rendered detections
            </span>
            <span className="truncate">{alt}</span>
          </div>
        </details>
      </div>
    </Panel>
  )
}
