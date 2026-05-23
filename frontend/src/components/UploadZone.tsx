import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { ImagePlus, Loader2, UploadCloud, X } from 'lucide-react'
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
  onFileSelect: (file: File) => void
  onAnalyze: () => void
  onClear: () => void
}

export function UploadZone({
  file,
  progress,
  status,
  isLoading,
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

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.heic', '.heif'],
    },
    maxFiles: 1,
    multiple: false,
  })




  const progressLabelMap = {
    idle: 'Waiting for upload',
    uploading: `${progress}% uploaded`,
    queued: 'Queued for AI processing',
    processing: 'AI is analyzing image',
    completed: 'Detection completed',
    failed: 'Detection failed',
  }

  const progressLabel =
    progressLabelMap[status]


  const progressValueMap = {
    idle: 0,
    uploading: progress,
    queued: 25,
    processing: 70,
    completed: 100,
    failed: 100,
  }

  const progressValue =
    progressValueMap[status]

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Input image
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Backend accepts JPG, JPEG, and PNG.
          </p>
        </div>

        {file && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-800 text-slate-500 transition hover:bg-slate-900 hover:text-white"
            aria-label="Clear selected image"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'group grid min-h-[220px] cursor-pointer place-items-center rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-6 text-center transition',
          isDragActive && 'border-cyan-300 bg-cyan-950/20',
          isDragReject && 'border-red-400 bg-red-950/20',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex max-w-xs flex-col items-center">
          <div className="mb-4 grid size-12 place-items-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition group-hover:text-cyan-300">
            <UploadCloud className="size-5" />
          </div>

          <p className="text-base font-semibold text-white">
            {isDragActive ? 'Drop image' : 'Drop image or browse'}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            HEIC uploads are converted to JPG before analysis.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200">
            <ImagePlus className="size-4" />
            Browse image
          </div>
        </div>
      </div>

      {file && (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>

            <button
              type="button"
              onClick={onAnalyze}
              disabled={isLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              Analyze
            </button>
          </div>

          {status !== 'idle' && (
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs font-medium text-slate-500">
                <span>{progressLabel}</span>
                <span className="capitalize">{status}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-300 transition-all duration-300"

                  style={{
                    width: `${progressValue}%`,
                  }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                {(status === 'uploading' ||
                  status === 'queued' ||
                  status === 'processing') && (
                    <Loader2 className="size-4 animate-spin" />
                  )}

                <span>{progressLabel}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
