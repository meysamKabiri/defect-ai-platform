import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Panel } from '@/components/common/Panel'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { InspectionBatch } from '@/features/detection/detectionTypes'

type BatchListPanelProps = {
  batches: InspectionBatch[]
  isFetching: boolean
  selectedBatchId?: string
  onRefresh: () => void
  onSelect: (batchId: string) => void
}

export function BatchListPanel({
  batches,
  isFetching,
  selectedBatchId,
  onRefresh,
  onSelect,
}: BatchListPanelProps) {
  return (
    <Panel
      action={(
        <Button
          aria-label="Refresh batches"
          isLoading={isFetching}
          leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
          onClick={onRefresh}
          size="sm"
          variant="ghost"
        >
          Refresh
        </Button>
      )}
      eyebrow="Runs"
      title="Recent batches"
    >
      <div className="grid max-h-80 gap-3 overflow-auto p-5">
        {batches.length ? (
          batches.map((batch) => {
            const progress = Math.round((batch.progress?.completion_rate ?? 0) * 100)

            return (
              <button
                className="grid gap-3 rounded-2xl border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/5 data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/10"
                data-selected={selectedBatchId === batch.id}
                key={batch.id}
                onClick={() => onSelect(batch.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {batch.name || 'Validation batch'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {batch.total_jobs} images
                    </p>
                  </div>
                  <StatusBadge status={batch.status}>{batch.status}</StatusBadge>
                </div>
                <ProgressBar value={progress} />
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{batch.progress?.completed ?? 0} complete</span>
                  <span>{batch.progress?.failed ?? 0} failed</span>
                  <span>{batch.created_at ? new Date(batch.created_at).toLocaleString() : 'Queued'}</span>
                </div>
              </button>
            )
          })
        ) : (
          <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
            No validation batches for this project yet.
          </div>
        )}
      </div>
    </Panel>
  )
}
