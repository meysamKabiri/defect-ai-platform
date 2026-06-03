import { useEffect, useId, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { ImageIcon, Trash2, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Panel } from '@/components/common/Panel'
import { useAddBatchImagesMutation, useUploadBatchMutation } from '@/services/detectionApi'

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return 'Unable to upload this batch.'
  const maybeError = error as {
    data?: { detail?: string; message?: string }
    error?: string
  }

  return maybeError.data?.message ?? maybeError.data?.detail ?? maybeError.error ?? 'Unable to upload this batch.'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

type BatchUploadPanelProps = {
  workspaceId?: string
  projectId: string
  batchId?: string
  onUploaded: (batchId: string) => void
  isDisabled?: boolean
  disabledReason?: string
  ctaLabel?: string
  eyebrow?: string
  title?: string
}

export function BatchUploadPanel({
  workspaceId,
  projectId,
  batchId,
  onUploaded,
  isDisabled: isExternallyDisabled,
  disabledReason,
  ctaLabel = 'Add Images to Validation Run',
  eyebrow = 'Batch',
  title = 'Validation run',
}: BatchUploadPanelProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string>()
  const fileInputId = useId()
  const [uploadBatch, { isLoading }] = useUploadBatchMutation()
  const [addBatchImages, { isLoading: isAddingImages }] = useAddBatchImagesMutation()
  const cannotSelectFiles = Boolean(isExternallyDisabled)
  const isDisabled = cannotSelectFiles || !workspaceId || !projectId || !files.length || isAddingImages
  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    disabled: cannotSelectFiles,
    multiple: true,
    onDrop: (acceptedFiles) => setFiles((currentFiles) => [...currentFiles, ...acceptedFiles]),
  })

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviewUrls(urls)

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [files])

  const handleRemoveFile = (index: number) => {
    setFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index))
  }

  const handleUpload = async () => {
    if (isDisabled || !workspaceId || !projectId || !files.length) return

    try {
      setErrorMessage(undefined)
      const response = batchId
        ? await addBatchImages({ workspaceId, projectId, batchId, files }).unwrap()
        : await uploadBatch({
          workspaceId,
          projectId,
          files,
          name: name.trim() || undefined,
          description: description.trim() || undefined,
        }).unwrap()
      setName('')
      setDescription('')
      setFiles([])
      onUploaded(response.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return (
    <Panel className="min-w-0" eyebrow={eyebrow} title={title}>
      <div className="grid min-w-0 gap-3 p-5">
        {!batchId ? (
          <>
            <input
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              onChange={(event) => setName(event.target.value)}
              placeholder="Run name"
              value={name}
            />
            <textarea
              className="min-h-20 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional batch description"
              value={description}
            />
          </>
        ) : null}
        <div
          {...getRootProps()}
          aria-disabled={cannotSelectFiles}
          className="grid min-w-0 max-w-full cursor-pointer gap-2 rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 data-[active=true]:border-primary data-[active=true]:bg-primary/10"
          data-active={isDragActive}
          role="button"
          tabIndex={cannotSelectFiles ? -1 : 0}
        >
          <span className="inline-flex items-center gap-2 font-semibold text-foreground">
            <UploadCloud className="size-4" aria-hidden="true" />
            {isDragActive ? 'Drop images to add to this run' : 'Drag images here or browse'}
          </span>
          <span className="min-w-0 break-words">{disabledReason ?? (files.length ? `${files.length} images staged. They are not uploaded yet.` : 'JPG or PNG, added to the selected validation run.')}</span>
          <input
            {...getInputProps({
              id: fileInputId,
              onClick: (event) => {
                event.currentTarget.value = ''
              },
            })}
            accept="image/jpeg,image/png"
            className="sr-only"
            disabled={cannotSelectFiles}
            multiple
            type="file"
          />
        </div>
        {files.length ? (
          <div className="grid min-w-0 max-w-full gap-3 rounded-2xl border border-border bg-background p-4">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Selected images</p>
                <p className="mt-1 text-xs text-muted-foreground">Review before upload. These files are not uploaded yet.</p>
              </div>
              {files.length > 1 ? (
                <button
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onClick={() => setFiles([])}
                  type="button"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Clear all
                </button>
              ) : null}
            </div>
            <div className="grid max-h-80 min-w-0 gap-2 overflow-auto pr-1">
              {files.map((file, index) => (
                <div
                  className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface p-2"
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                >
                  <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                    {previewUrls[index] ? (
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={previewUrls[index]}
                      />
                    ) : (
                      <ImageIcon className="size-5" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    onClick={() => handleRemoveFile(index)}
                    type="button"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {errorMessage ? (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}
        <Button
          disabled={isDisabled}
          isLoading={isLoading || isAddingImages}
          leftIcon={<UploadCloud className="size-4" aria-hidden="true" />}
          onClick={() => void handleUpload()}
        >
          {ctaLabel}
        </Button>
      </div>
    </Panel>
  )
}
