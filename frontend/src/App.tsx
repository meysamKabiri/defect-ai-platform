import {
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
} from 'react'


import {
  Activity,
  CheckCircle2,
  Clock3,
  Database,
} from 'lucide-react'

import heic2any from 'heic2any'

import { getImageUrl }
  from './lib/image'

import { DetectionCard } from '@/components/DetectionCard'

const ImageViewer = lazy(() =>
  import('@/components/ImageViewer').then(
    (m) => ({
      default: m.ImageViewer,
    }),
  ),
)

const StatsCard = lazy(() =>
  import('@/components/StatsCard').then(
    (m) => ({
      default: m.StatsCard,
    }),
  ),
)

import { UploadZone } from '@/components/UploadZone'

import {
  useAppDispatch,
  useAppSelector,
} from '@/app/hooks'

import { resetUploadProgress } from '@/features/detection/uploadProgressSlice'

import type {
  DetectionJobResponse,
  DetectionResult,
  DetectionStatus,
} from '@/features/detection/detectionTypes'

import {
  useUploadDetectionMutation,
  useGetDetectionJobQuery,
} from '@/services/detectionApi'

function getErrorMessage(
  error: unknown,
) {
  if (
    !error ||
    typeof error !== 'object'
  ) {
    return undefined
  }

  const maybeError =
    error as {
      data?: {
        message?: string
        detail?: string
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

function App() {
  const dispatch = useAppDispatch()

  const { progress } =
    useAppSelector(
      (state) =>
        state.uploadProgress,
    )

  const [file, setFile] =
    useState<File | null>(null)

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState<string | null>(
    null,
  )

  const previewUrlRef =
    useRef<string | null>(null)

  const [jobId, setJobId] =
    useState<string | null>(null)

  const [
    jobErrorMessage,
    setJobErrorMessage,
  ] = useState<string>()

  const [
    uploadDetection,
    {
      isLoading:
      isUploading,
      error,
      reset: resetUploadDetection,
    },
  ] =
    useUploadDetectionMutation()

  const {
    currentData: jobData,
  } = useGetDetectionJobQuery(
    jobId!,
    {
      skip: !jobId,

      pollingInterval: 1000,

      skipPollingIfUnfocused: true,
    },
  )


  useEffect(() => {
    return () => {
      if (
        previewUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewUrlRef.current,
        )
      }
    }
  }, [])

  const isAnalyzing =
    !!jobId &&
    (jobData?.status ===
      'queued' ||
      jobData?.status ===
      'processing')

  const uploadStatus: DetectionStatus =
    isUploading
      ? 'uploading'
      : jobId
        ? jobData?.status ??
        'queued'
        : jobErrorMessage
          ? 'failed'
          : 'idle'

  const result =
    jobData?.status ===
      'completed'
      ? {
        status: jobData.status,

        jobId: jobData.job_id,

        rqJobId: jobData.rq_job_id,

        imageUrl:
          jobData.image_url,

        annotatedImageUrl:
          jobData.result
            ?.annotated_image_url ??
          jobData.annotated_image_url,

        defects:
          jobData.result
            ?.detections ??
          jobData.detections ??
          [],

        inferenceMs:
          jobData.inference_ms,

        processingTimeSeconds:
          jobData.processing_time_seconds,

        modelVersion:
          jobData.model_version,
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

  const displayImageUrl =
    getImageUrl(
      result?.annotatedImageUrl ??
      result?.imageUrl ??
      previewUrl,
    )

  const errorMessage =
    jobErrorMessage ??
    (jobData?.status === 'failed'
      ? jobData.error ??
      'Unable to analyze this image.'
      : undefined) ??
    getErrorMessage(error)

  const replacePreviewUrl = (
    nextUrl:
      | string
      | null,
  ) => {
    if (
      previewUrlRef.current
    ) {
      URL.revokeObjectURL(
        previewUrlRef.current,
      )
    }

    previewUrlRef.current =
      nextUrl

    setPreviewUrl(nextUrl)
  }

  const handleFileSelect =
    async (
      nextFile: File,
    ) => {
      setJobId(null)
      setJobErrorMessage(
        undefined,
      )
      resetUploadDetection()
      dispatch(
        resetUploadProgress(),
      )
      replacePreviewUrl(null)

      const isHeic =
        nextFile.type ===
        'image/heic' ||
        nextFile.type ===
        'image/heif' ||
        nextFile.name
          .toLowerCase()
          .endsWith(
            '.heic',
          ) ||
        nextFile.name
          .toLowerCase()
          .endsWith(
            '.heif',
          )

      try {
        if (isHeic) {
          const convertedBlob =
            await heic2any({
              blob: nextFile,

              toType:
                'image/jpeg',

              quality: 0.9,
            })

          const jpegBlob =
            Array.isArray(
              convertedBlob,
            )
              ? convertedBlob[0]
              : convertedBlob

          const convertedFile =
            new File(
              [jpegBlob],
              nextFile.name.replace(
                /\.(heic|heif)$/i,
                '.jpg',
              ),
              {
                type: 'image/jpeg',
              },
            )

          setFile(
            convertedFile,
          )

          replacePreviewUrl(
            URL.createObjectURL(
              jpegBlob,
            ),
          )
        } else {
          setFile(nextFile)

          replacePreviewUrl(
            URL.createObjectURL(
              nextFile,
            ),
          )
        }

      } catch (error) {
        console.error(
          'HEIC conversion failed:',
          error,
        )
      }
    }

  const handleAnalyze =
    async () => {
      if (!file) return

      try {
        setJobErrorMessage(
          undefined,
        )

        const response =
          await uploadDetection(
            {
              file,
            },
          ).unwrap()

        setJobId(
          response.job_id,
        )
      } catch (error) {
        console.error(error)
      }
    }

  const handleClear = () => {
    setFile(null)

    setJobId(null)

    setJobErrorMessage(
      undefined,
    )

    resetUploadDetection()

    replacePreviewUrl(null)

    dispatch(
      resetUploadProgress(),
    )
  }

  return (
    <main className="min-h-screen bg-[#05070a] text-slate-100">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-300/80">
              Defect AI Platform
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
              Inspection workspace
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Upload a production image, track the queued inference job, and
              review every field returned by the detection backend.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Activity className="size-3.5" />
                Status
              </div>
              <p className="mt-2 truncate text-sm font-semibold capitalize text-white">
                {uploadStatus}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Database className="size-3.5" />
                Job
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-white">
                {currentJob?.job_id ?? 'No job'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <CheckCircle2 className="size-3.5" />
                Defects
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {result?.defects.length ?? 0}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Clock3 className="size-3.5" />
                Runtime
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {result?.processingTimeSeconds
                  ? `${result.processingTimeSeconds}s`
                  : '--'}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <UploadZone
              file={file}
              progress={progress}
              status={uploadStatus}
              isLoading={
                isUploading ||
                isAnalyzing
              }
              onFileSelect={
                handleFileSelect
              }
              onAnalyze={
                handleAnalyze
              }
              onClear={handleClear}
            />

            <Suspense
              fallback={
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
                  Loading stats...
                </div>
              }
            >
              <StatsCard
                result={result}
                job={currentJob}
              />
            </Suspense>
          </aside>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Suspense
              fallback={
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
                  Loading viewer...
                </div>
              }
            >
              <ImageViewer
                imageUrl={
                  displayImageUrl
                }
                boxes={
                  result?.defects
                }
                alt={
                  file?.name ??
                  'Inspection preview'
                }
              />
            </Suspense>

            <DetectionCard
              result={result}
              job={currentJob}
              error={errorMessage}
              isLoading={
                isUploading ||
                isAnalyzing
              }
            />
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
