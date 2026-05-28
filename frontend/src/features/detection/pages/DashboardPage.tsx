import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Activity,
  Boxes,
  Clock3,
  Cpu,
  Database,
  Sparkles,
} from 'lucide-react'
import heic2any from 'heic2any'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { DetectionCard } from '@/components/DetectionCard'
import { Panel } from '@/components/common/Panel'
import type {
  DetectionJobResponse,
  DetectionResult,
  DetectionStatus,
} from '@/features/detection/detectionTypes'
import { resetUploadProgress } from '@/features/detection/uploadProgressSlice'
import { getImageUrl } from '@/lib/image'
import {
  useGetDetectionJobQuery,
  useUploadDetectionMutation,
} from '@/services/detectionApi'
import { UploadZone } from '@/components/UploadZone'

const ImageViewer = lazy(() =>
  import('@/components/ImageViewer').then((module) => ({
    default: module.ImageViewer,
  })),
)

const StatsCard = lazy(() =>
  import('@/components/StatsCard').then((module) => ({
    default: module.StatsCard,
  })),
)

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return undefined

  const maybeError = error as {
    data?: {
      detail?: string
      message?: string
    }
    error?: string
  }

  return (
    maybeError.data?.message ??
    maybeError.data?.detail ??
    maybeError.error ??
    'Unable to analyze this image.'
  )
}

function isHeicFile(file: File) {
  const name = file.name.toLowerCase()

  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}

function DashboardSkeleton({ label }: { label: string }) {
  return (
    <Panel>
      <div className="grid gap-4 p-5" aria-label={label}>
        <div className="h-5 w-36 animate-pulse rounded-full bg-muted" />
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-20 animate-pulse rounded-2xl bg-muted" />
          <div className="h-20 animate-pulse rounded-2xl bg-muted" />
          <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </Panel>
  )
}

function formatRuntime(value?: number) {
  return value !== undefined ? `${value}s` : '--'
}

function DashboardMetric({
  description,
  icon: Icon,
  label,
  value,
}: {
  description: string
  icon: typeof Activity
  label: string
  value: string | number
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:border-primary/30 hover:bg-primary/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  )
}

export function DashboardPage() {
  const dispatch = useAppDispatch()
  const { progress } = useAppSelector((state) => state.uploadProgress)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobErrorMessage, setJobErrorMessage] = useState<string>()

  const [
    uploadDetection,
    {
      error,
      isLoading: isUploading,
      reset: resetUploadDetection,
    },
  ] = useUploadDetectionMutation()

  const { currentData: jobData } = useGetDetectionJobQuery(jobId!, {
    pollingInterval: 1000,
    skip: !jobId,
    skipPollingIfUnfocused: true,
  })

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const isAnalyzing =
    Boolean(jobId) &&
    (jobData?.status === 'queued' || jobData?.status === 'processing')

  const uploadStatus: DetectionStatus =
    isUploading
      ? 'uploading'
      : jobId
        ? jobData?.status ?? 'queued'
        : jobErrorMessage
          ? 'failed'
          : 'idle'

  const result =
    jobData?.status === 'completed'
      ? {
        annotatedImageUrl: jobData.result?.annotated_image_url ?? jobData.annotated_image_url,
        defects: jobData.result?.detections ?? jobData.detections ?? [],
        imageUrl: jobData.image_url,
        inferenceMs: jobData.inference_ms,
        jobId: jobData.job_id,
        modelVersion: jobData.model_version,
        processingTimeSeconds: jobData.processing_time_seconds,
        rqJobId: jobData.rq_job_id,
        status: jobData.status,
      } satisfies DetectionResult
      : undefined

  const currentJob =
    jobData ??
    (jobId
      ? ({
        job_id: jobId,
        status: 'queued',
      } satisfies DetectionJobResponse)
      : undefined)

  const displayImageUrl = getImageUrl(
    result?.annotatedImageUrl ??
    result?.imageUrl ??
    previewUrl,
  )

  const errorMessage =
    jobErrorMessage ??
    (jobData?.status === 'failed'
      ? jobData.error ?? 'Unable to analyze this image.'
      : undefined) ??
    getErrorMessage(error)

  const defectCount = result?.defects.length ?? currentJob?.detections?.length ?? currentJob?.result?.detections?.length ?? 0

  const replacePreviewUrl = (nextUrl: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }

    previewUrlRef.current = nextUrl
    setPreviewUrl(nextUrl)
  }

  const handleFileSelect = async (nextFile: File) => {
    setJobId(null)
    setJobErrorMessage(undefined)
    resetUploadDetection()
    dispatch(resetUploadProgress())
    replacePreviewUrl(null)

    try {
      if (isHeicFile(nextFile)) {
        const convertedBlob = await heic2any({
          blob: nextFile,
          quality: 0.9,
          toType: 'image/jpeg',
        })
        const jpegBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob
        const convertedFile = new File(
          [jpegBlob],
          nextFile.name.replace(/\.(heic|heif)$/i, '.jpg'),
          {
            type: 'image/jpeg',
          },
        )

        setFile(convertedFile)
        replacePreviewUrl(URL.createObjectURL(jpegBlob))
      } else {
        setFile(nextFile)
        replacePreviewUrl(URL.createObjectURL(nextFile))
      }
    } catch {
      setFile(null)
      setJobErrorMessage('Unable to convert this HEIC image. Please try a JPG or PNG file.')
    }
  }

  const handleAnalyze = async () => {
    if (!file) return

    try {
      setJobErrorMessage(undefined)
      const response = await uploadDetection({ file }).unwrap()
      setJobId(response.job_id)
    } catch (requestError) {
      setJobErrorMessage(getErrorMessage(requestError) ?? 'Unable to analyze this image.')
    }
  }

  const handleClear = () => {
    setFile(null)
    setJobId(null)
    setJobErrorMessage(undefined)
    resetUploadDetection()
    replacePreviewUrl(null)
    dispatch(resetUploadProgress())
  }

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,hsl(var(--primary)/0.16),transparent_30%),radial-gradient(circle_at_90%_10%,hsl(var(--success)/0.12),transparent_28%)]" aria-hidden="true" />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" />
                AI-powered industrial QA
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Upload, analyze, and review production defects with real-time model feedback.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                Queue images through the FastAPI and Redis worker pipeline, monitor YOLOv8 inference, and inspect persisted detection metadata in one operator-focused workspace.
              </p>
            </div>

            <div className="grid min-w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
              <DashboardMetric
                description="Pipeline state"
                icon={Activity}
                label="Status"
                value={uploadStatus}
              />
              <DashboardMetric
                description="Worker reference"
                icon={Database}
                label="Job"
                value={currentJob?.job_id ? currentJob.job_id.slice(0, 8) : 'No job'}
              />
              <DashboardMetric
                description="Model findings"
                icon={Boxes}
                label="Defects"
                value={defectCount}
              />
              <DashboardMetric
                description="Inference time"
                icon={Clock3}
                label="Runtime"
                value={formatRuntime(result?.processingTimeSeconds)}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <aside className="grid gap-6 xl:sticky xl:top-24 xl:self-start">
            <UploadZone
              file={file}
              isLoading={isUploading || isAnalyzing}
              onAnalyze={handleAnalyze}
              onClear={handleClear}
              onFileSelect={handleFileSelect}
              progress={progress}
              status={uploadStatus}
            />

            <Suspense fallback={<DashboardSkeleton label="Loading inspection summary" />}>
              <StatsCard job={currentJob} result={result} />
            </Suspense>
          </aside>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_28rem]">
            <div className="grid gap-6">
              <Suspense fallback={<DashboardSkeleton label="Loading inspection canvas" />}>
                <ImageViewer
                  alt={file?.name ?? 'Inspection preview'}
                  boxes={result?.defects}
                  imageUrl={displayImageUrl}
                />
              </Suspense>

              <Panel
                description="Queue-backed inference separates uploads from GPU-heavy model execution."
                eyebrow="Architecture"
                title="Processing pipeline"
              >
                <div className="grid gap-3 p-5 sm:grid-cols-3">
                  {[
                    ['FastAPI upload', 'Validates image and creates a persisted job.'],
                    ['Redis/RQ worker', 'Executes asynchronous inference without blocking the UI.'],
                    ['YOLOv8 output', 'Returns annotated images, boxes, confidence, and metadata.'],
                  ].map(([title, description], index) => (
                    <article className="rounded-2xl border border-border bg-background p-4" key={title}>
                      <div className="mb-4 grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Cpu className="size-4" aria-hidden="true" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {index + 1}. {title}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {description}
                      </p>
                    </article>
                  ))}
                </div>
              </Panel>
            </div>

            <DetectionCard
              error={errorMessage}
              isLoading={isUploading || isAnalyzing}
              job={currentJob}
              result={result}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
