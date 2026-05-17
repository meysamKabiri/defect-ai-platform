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
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.heic', '.heif'],
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
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30 backdrop-blur md:p-5">
      <div
        {...getRootProps()}
        className={cn(
          'group relative grid min-h-[320px] cursor-pointer place-items-center overflow-hidden rounded-[1.5rem] border border-dashed border-white/20 bg-slate-950/70 p-8 text-center transition duration-300',
          'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.18),transparent_42%)] before:opacity-70',
          isDragActive && 'scale-[0.99] border-amber-300 bg-amber-300/10',
          isDragReject && 'border-red-400 bg-red-500/10',
        )}
      >
        <input {...getInputProps()} />
        <div className="relative z-10 flex max-w-md flex-col items-center">
          <div className="mb-6 grid size-20 place-items-center rounded-3xl border border-amber-200/20 bg-amber-300/10 text-amber-200 shadow-lg shadow-amber-900/20 transition group-hover:rotate-3 group-hover:scale-105">
            <UploadCloud className="size-10" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-200/80">Defect scan input</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
            {isDragActive ? 'Drop the image here' : 'Drag, drop, detect'}
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Upload a production-line image and send it to the detection API.
            Supports PNG, JPG, WEBP, BMP, and HEIC.
          </p>
          <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950">
            <ImagePlus className="size-4" />
            Browse image
          </div>
        </div>
      </div>

      {file && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{file.name}</p>
              <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-300 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                Analyze
              </button>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Clear selected image"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {status !== 'idle' && (
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span>{progressLabel}</span>
                <span>{status}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-200 via-orange-400 to-red-400 transition-all duration-300"

                  style={{
                    width: `${progressValue}%`,
                  }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
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
