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
  ClipboardCheck,
  RefreshCw,
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
import { selectCurrentWorkspace } from '@/features/auth/authSlice'
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

const feedbackLabels: Record<HumanFeedbackType, string> = {
  bad_image: 'Bad image',
  correct: 'Correct',
  false_positive: 'False positive',
  missed_defect: 'Missed defect',
  not_sure: 'Not sure',
  wrong_class: 'Wrong class',
}

function KpiTile({
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
    <article className="rounded-2xl border border-border bg-surface p-4">
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
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobErrorMessage, setJobErrorMessage] = useState<string>()
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const { data: assignedProjects } = useGetAssignedProjectsQuery(currentWorkspace?.id)
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
      workspaceId: currentWorkspace?.id,
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
  const feedbackItems = feedbackData?.items ?? []
  const latestFeedback = feedbackItems[0]
  const reviewedCount = feedbackItems.length

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
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5">
        <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Validation console
              </p>
              <StatusBadge tone={selectedProjectId ? 'success' : 'warning'}>
                {selectedProject?.name ?? 'No project'}
              </StatusBadge>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Inspect, validate, move on.
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Project-scoped image analysis with one-click operator feedback.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[34rem]">
            <KpiTile
              description="Pipeline state"
              icon={Activity}
              label="Status"
              value={uploadStatus}
            />
            <KpiTile
              description="Current model findings"
              icon={Boxes}
              label="Defects"
              value={defectCount}
            />
            <KpiTile
              description={latestFeedback ? feedbackLabels[latestFeedback.feedback_type] : 'Awaiting review'}
              icon={ClipboardCheck}
              label="Feedback"
              value={reviewedCount}
            />
          </div>
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
          <aside className="grid min-w-0 gap-5 xl:sticky xl:top-24">
            <Panel
              eyebrow="Scope"
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
                  <details className="rounded-xl border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
                    <summary className="cursor-pointer font-semibold text-foreground">
                      Project notes
                    </summary>
                    <p className="mt-2">{selectedProject.description}</p>
                  </details>
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

            <details className="rounded-2xl border border-border bg-surface shadow-card">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-foreground">
                Recent inspections
              </summary>
              <div className="border-t border-border">
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <p className="text-xs text-muted-foreground">
                    {projectJobs?.total ?? 0} project jobs
                  </p>
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
                </div>
                <div className="grid max-h-80 gap-3 overflow-auto p-5 pt-0">
                  {!selectedProjectId ? (
                    <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                      Select a project to load its queue.
                    </div>
                  ) : projectJobs?.items.length ? (
                    projectJobs.items.map((job) => (
                      <button
                        className="grid gap-3 rounded-2xl border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
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
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                      No inspections for this project yet.
                    </div>
                  )}
                </div>
              </div>
            </details>
          </aside>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
            <Suspense fallback={<DashboardSkeleton label="Loading inspection canvas" />}>
              <ImageViewer
                alt={file?.name ?? 'Inspection preview'}
                boxes={result?.defects}
                imageUrl={displayImageUrl}
              />
            </Suspense>

            <DetectionCard
              error={errorMessage}
              feedbackItems={feedbackItems}
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
