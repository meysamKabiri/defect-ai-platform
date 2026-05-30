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
  CalendarClock,
  Clock3,
  Database,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import heic2any from 'heic2any'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { DetectionCard } from '@/components/DetectionCard'
import { Panel } from '@/components/common/Panel'
import { StatusBadge } from '@/components/common/StatusBadge'
import type {
  DetectionJobResponse,
  DetectionResult,
  DetectionStatus,
  HumanFeedbackType,
} from '@/features/detection/detectionTypes'
import { resetUploadProgress } from '@/features/detection/uploadProgressSlice'
import { getImageUrl } from '@/lib/image'
import {
  useGetAssignedProjectsQuery,
  useGetDetectionJobQuery,
  useGetDetectionJobsQuery,
  useGetJobFeedbackQuery,
  useCreateJobFeedbackMutation,
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
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const { data: assignedProjects } = useGetAssignedProjectsQuery()
  const selectedProject = assignedProjects?.items.find(
    (project) => project.id === selectedProjectId,
  )
  const {
    currentData: projectJobs,
    isFetching: isFetchingJobs,
    refetch: refetchProjectJobs,
  } = useGetDetectionJobsQuery(
    {
      limit: 10,
      offset: 0,
      projectId: selectedProjectId,
    },
    {
      pollingInterval: selectedProjectId ? 5000 : 0,
      skip: !selectedProjectId,
      skipPollingIfUnfocused: true,
    },
  )

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
  const { currentData: feedbackData } = useGetJobFeedbackQuery(jobId!, {
    skip: !jobId || jobData?.status !== 'completed',
  })
  const [createJobFeedback, { isLoading: isSubmittingFeedback }] =
    useCreateJobFeedbackMutation()

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
    if (!selectedProjectId) {
      setJobErrorMessage('Select an assigned project before starting analysis.')
      return
    }

    try {
      setJobErrorMessage(undefined)
      const response = await uploadDetection({
        file,
        projectId: selectedProjectId || undefined,
      }).unwrap()
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

  const handleSubmitFeedback = async (feedbackType: HumanFeedbackType) => {
    if (!currentJob?.job_id || currentJob.status !== 'completed') return

    try {
      setJobErrorMessage(undefined)
      await createJobFeedback({
        jobId: currentJob.job_id,
        payload: {
          feedback_type: feedbackType,
        },
      }).unwrap()
    } catch (requestError) {
      setJobErrorMessage(
        getErrorMessage(requestError) ?? 'Unable to save operator feedback.',
      )
    }
  }

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
          <div className="grid gap-5">
            <div className="max-w-4xl">
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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

        <section className="grid gap-6 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
          <aside className="grid gap-6 xl:sticky xl:top-24 xl:self-start">
            <Panel
              description="Engineers can run inspection work only in projects assigned to them."
              eyebrow="Assigned work"
              title="Project"
            >
              <div className="grid gap-3 p-5">
                <select
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  value={selectedProjectId}
                >
                  <option value="">No project selected</option>
                  {assignedProjects?.items.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{assignedProjects?.total ?? 0} assigned projects</span>
                  {selectedProjectId ? (
                    <StatusBadge tone="success">Project scoped</StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">Required</StatusBadge>
                  )}
                </div>
                {selectedProject?.description ? (
                  <p className="rounded-xl border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
                    {selectedProject.description}
                  </p>
                ) : null}
              </div>
            </Panel>

            <UploadZone
              disabledReason="Choose one of your assigned active projects before uploading an inspection image."
              file={file}
              isDisabled={!selectedProjectId}
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

          <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_26rem]">
            <div className="grid gap-6">
              <Suspense fallback={<DashboardSkeleton label="Loading inspection canvas" />}>
                <ImageViewer
                  alt={file?.name ?? 'Inspection preview'}
                  boxes={result?.defects}
                  imageUrl={displayImageUrl}
                />
              </Suspense>

              <Panel
                action={
                  <button
                    aria-label="Refresh project jobs"
                    className="grid size-9 place-items-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                    disabled={!selectedProjectId || isFetchingJobs}
                    onClick={() => void refetchProjectJobs()}
                    type="button"
                  >
                    <RefreshCw
                      className={isFetchingJobs ? 'size-4 animate-spin' : 'size-4'}
                      aria-hidden="true"
                    />
                  </button>
                }
                description="Track recent jobs for the selected project without leaving the engineer workspace."
                eyebrow="Project queue"
                title="Recent inspections"
              >
                <div className="grid gap-3 p-5">
                  {!selectedProjectId ? (
                    <div className="rounded-2xl border border-border bg-background p-5 text-sm leading-6 text-muted-foreground">
                      Select a project to load its inspection queue.
                    </div>
                  ) : projectJobs?.items.length ? (
                    projectJobs.items.map((job) => (
                      <button
                        className="grid gap-3 rounded-2xl border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/5 sm:grid-cols-[minmax(0,1fr)_auto]"
                        key={job.job_id}
                        onClick={() => job.job_id && setJobId(job.job_id)}
                        type="button"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={job.status}>{job.status}</StatusBadge>
                            <span className="truncate text-sm font-semibold text-foreground">
                              {job.original_filename ?? job.job_id}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Boxes className="size-3.5" aria-hidden="true" />
                              {job.detection_count ?? job.detections?.length ?? 0} defects
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="size-3.5" aria-hidden="true" />
                              {job.created_at ? new Date(job.created_at).toLocaleString() : 'Queued'}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-primary">
                          Review
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-border bg-background p-5 text-sm leading-6 text-muted-foreground">
                      No inspections have been created for this project yet.
                    </div>
                  )}
                </div>
              </Panel>
            </div>

            <DetectionCard
              error={errorMessage}
              feedbackItems={feedbackData?.items}
              isLoading={isUploading || isAnalyzing}
              isSubmittingFeedback={isSubmittingFeedback}
              job={currentJob}
              onSubmitFeedback={handleSubmitFeedback}
              result={result}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
