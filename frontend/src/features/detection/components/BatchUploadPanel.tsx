import { useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Panel } from '@/components/common/Panel'
import { useUploadBatchMutation } from '@/services/detectionApi'

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return 'Unable to upload this batch.'
  const maybeError = error as {
    data?: { detail?: string; message?: string }
    error?: string
  }

  return maybeError.data?.message ?? maybeError.data?.detail ?? maybeError.error ?? 'Unable to upload this batch.'
}

type BatchUploadPanelProps = {
  workspaceId?: string
  projectId: string
  onUploaded: (batchId: string) => void
  isDisabled?: boolean
  disabledReason?: string
}

export function BatchUploadPanel({
  workspaceId,
  projectId,
  onUploaded,
  isDisabled: isExternallyDisabled,
  disabledReason,
}: BatchUploadPanelProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [errorMessage, setErrorMessage] = useState<string>()
  const [uploadBatch, { isLoading }] = useUploadBatchMutation()
  const cannotSelectFiles = Boolean(isExternallyDisabled)
  const isDisabled = cannotSelectFiles || !workspaceId || !projectId || !files.length

  const handleUpload = async () => {
    if (isDisabled || !workspaceId || !projectId || !files.length) return

    try {
      setErrorMessage(undefined)
      const response = await uploadBatch({
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
    <Panel className="min-w-0" eyebrow="Batch" title="Validation run">
      <div className="grid min-w-0 gap-3 p-5">
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
        <label className="grid min-w-0 cursor-pointer gap-2 rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          <span className="inline-flex items-center gap-2 font-semibold text-foreground">
            <UploadCloud className="size-4" aria-hidden="true" />
            Select inspection images
          </span>
          <span className="min-w-0 break-words">{disabledReason ?? (files.length ? `${files.length} images selected` : 'JPG or PNG, uploaded as one validation batch.')}</span>
          <input
            accept="image/jpeg,image/png"
            className="sr-only"
            disabled={cannotSelectFiles}
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            type="file"
          />
        </label>
        {errorMessage ? (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}
        <Button
          disabled={isDisabled}
          isLoading={isLoading}
          leftIcon={<UploadCloud className="size-4" aria-hidden="true" />}
          onClick={() => void handleUpload()}
        >
          Upload Batch
        </Button>
      </div>
    </Panel>
  )
}
