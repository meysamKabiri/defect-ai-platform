import {
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
} from 'react'


import {
  Cpu,
  ShieldCheck,
  Sparkles,
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
    completedResult,
    setCompletedResult,
  ] = useState<DetectionResult>()

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
    if (!jobId || !jobData) {
      return
    }

    if (
      jobData.status ===
      'completed'
    ) {
      setCompletedResult({
        status: jobData.status,

        imageUrl:
          jobData.image_url,

        annotatedImageUrl:
          jobData.result
            ?.annotated_image_url,

        defects:
          jobData.result
            ?.detections ??
          [],
      })

      setJobErrorMessage(
        undefined,
      )

      setJobId(null)
    }

    if (
      jobData.status ===
      'failed'
    ) {
      setCompletedResult(
        undefined,
      )

      setJobErrorMessage(
        jobData.error ??
        'Unable to analyze this image.',
      )

      setJobId(null)
    }
  }, [jobData, jobId])



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
        : completedResult
          ? 'completed'
          : jobErrorMessage
            ? 'failed'
            : 'idle'

  const result =
    completedResult

  const displayImageUrl =
    getImageUrl(
      result?.annotatedImageUrl ??
      result?.imageUrl ??
      previewUrl,
    )
  console.log(result, displayImageUrl, 'displayImageUrl');

  const errorMessage =
    jobErrorMessage ??
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
      setCompletedResult(
        undefined,
      )
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
        setCompletedResult(
          undefined,
        )
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

    setCompletedResult(
      undefined,
    )

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
    <main className="min-h-screen overflow-hidden bg-[#07110f] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(251,191,36,0.24),transparent_32%),radial-gradient(circle_at_86%_4%,rgba(45,212,191,0.16),transparent_28%),linear-gradient(135deg,#07110f_0%,#0f172a_48%,#1c1917_100%)]" />

      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 lg:py-12">
        <header className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-sm font-bold text-amber-100">
              <Sparkles className="size-4" />

              AI visual inspection
              console
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-white md:text-7xl">
              Detect defects before
              they leave the line.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Drop an image,
              preview it instantly,
              track AI processing,
              and review detection
              results in one
              focused dashboard.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <Cpu className="mb-5 size-8 text-teal-200" />

              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                Pipeline
              </p>

              <p className="mt-2 text-xl font-black text-white">
                RTK Query +
                Redux Toolkit
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <ShieldCheck className="mb-5 size-8 text-amber-200" />

              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                Purpose
              </p>

              <p className="mt-2 text-xl font-black text-white">
                Industrial QA
                detection
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
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

          <div className="space-y-6">
            <Suspense
              fallback={
                <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 text-center text-slate-400">
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

            <Suspense
              fallback={
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-center text-slate-400">
                  Loading stats...
                </div>
              }
            >
              <StatsCard
                result={result}
              />
            </Suspense>
          </div>
        </section>

        <DetectionCard
          result={result}
          error={errorMessage}
          isLoading={
            isUploading ||
            isAnalyzing
          }
        />
      </div>
    </main>
  )
}

export default App
