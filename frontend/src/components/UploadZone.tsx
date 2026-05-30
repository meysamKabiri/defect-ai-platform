import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  AlertTriangle,
  CheckCircle2,
  FileImage,
  ImagePlus,
  Loader2,
  UploadCloud,
  X,
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Panel } from '@/components/common/Panel'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { cn } from '@/lib/utils'

type UploadStatus =
  | 'idle'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'

type UploadZoneProps = {
  file: File | null
  progress: number
  status: UploadStatus
  isLoading: boolean
  isDisabled?: boolean
  disabledReason?: string
  onFileSelect: (file: File) => void
  onAnalyze: () => void
  onClear: () => void
}

const statusCopy: Record<UploadStatus, {
  description: string
  label: string
  progress: (progress: number) => number
}> = {
  idle: {
    label: 'Ready for image',
    description: 'Select an inspection image to begin the defect analysis workflow.',
    progress: () => 0,
  },
  uploading: {
    label: 'Uploading image',
    description: 'Transferring the source image to the FastAPI backend.',
    progress: (progress) => progress,
  },
  queued: {
    label: 'Queued for inference',
    description: 'The Redis/RQ worker has received the job and is waiting for capacity.',
    progress: () => 35,
  },
  processing: {
    label: 'Running AI inference',
    description: 'YOLOv8 is analyzing the image and generating detection boxes.',
    progress: () => 76,
  },
  completed: {
    label: 'Analysis complete',
    description: 'Detection results are ready for review.',
    progress: () => 100,
  },
  failed: {
    label: 'Analysis failed',
    description: 'The backend returned an error. Clear the image and try another upload.',
    progress: () => 100,
  },
}

function formatFileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function getStatusIcon(status: UploadStatus) {
  if (status === 'completed') return CheckCircle2
  if (status === 'failed') return AlertTriangle
  if (status === 'uploading' || status === 'queued' || status === 'processing') {
    return Loader2
  }
  return UploadCloud
}

export function UploadZone({
  file,
  progress,
  status,
  isLoading,
  isDisabled = false,
  disabledReason,
  onFileSelect,
  onAnalyze,
  onClear,
}: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const nextFile = acceptedFiles[0]
      if (nextFile) onFileSelect(nextFile)
    },
    [onFileSelect],
  )

  const { getInputProps, getRootProps, isDragActive, isDragReject } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.heic', '.heif'],
    },
    maxFiles: 1,
    multiple: false,
    onDrop,
    disabled: isDisabled,
  })

  const copy = statusCopy[status]
  const StatusIcon = getStatusIcon(status)
  const progressValue = copy.progress(progress)
  const canAnalyze = Boolean(file) && !isLoading && !isDisabled

  return (
    <Panel
      action={<StatusBadge status={status}>{status}</StatusBadge>}
      eyebrow="Input"
      title="Inspection image"
    >
      <div className="grid gap-4 p-5">
        <div
          {...getRootProps()}
          className={cn(
            'group grid min-h-44 cursor-pointer place-items-center rounded-2xl border border-dashed border-border bg-background p-5 text-center outline-none transition hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring',
            isDisabled && 'cursor-not-allowed opacity-60 hover:border-border hover:bg-background',
            isDragActive && 'border-primary bg-primary/10',
            isDragReject && 'border-danger bg-danger/10',
          )}
        >
          <input {...getInputProps()} aria-label="Upload inspection image" />

          <div className="flex max-w-sm flex-col items-center">
            <div
              className={cn(
                'mb-4 grid size-12 place-items-center rounded-2xl border border-border bg-surface text-primary shadow-card transition group-hover:scale-105',
                isDragReject && 'text-danger',
              )}
            >
              {isDragReject ? (
                <AlertTriangle className="size-6" aria-hidden="true" />
              ) : (
                <UploadCloud className="size-6" aria-hidden="true" />
              )}
            </div>

            <p className="text-base font-semibold text-foreground">
              {isDisabled
                ? 'Select a project first'
                : isDragActive
                  ? 'Drop image to inspect'
                  : 'Drop image or browse'}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {disabledReason ?? 'Supports JPG, PNG, and HEIC. HEIC images are converted before analysis.'}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-card transition group-hover:border-primary/40">
              <ImagePlus className="size-4 text-primary" aria-hidden="true" />
              Browse image
            </div>
          </div>
        </div>

        {file ? (
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileImage className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {file.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatFileSize(file.size)} · {file.type || 'image file'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  aria-label="Clear selected image"
                  className="shrink-0"
                  disabled={isLoading}
                  onClick={onClear}
                  size="md"
                  type="button"
                  variant="secondary"
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  className="shrink-0"
                  disabled={!canAnalyze}
                  isLoading={isLoading}
                  leftIcon={<UploadCloud className="size-4" aria-hidden="true" />}
                  onClick={onAnalyze}
                  size="md"
                  type="button"
                >
                  Analyze
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-surface p-3">
              <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <StatusIcon
                    className={cn(
                      'size-4 text-primary',
                      (status === 'uploading' || status === 'queued' || status === 'processing') && 'animate-spin',
                      status === 'failed' && 'text-danger',
                      status === 'completed' && 'text-success',
                    )}
                    aria-hidden="true"
                  />
                  {copy.label}
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {Math.round(progressValue)}%
                </span>
              </div>
              <ProgressBar label={copy.label} value={progressValue} />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {copy.description}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
            Select a source image to unlock analysis controls, preview rendering, and model output panels.
          </div>
        )}
      </div>
    </Panel>
  )
}
