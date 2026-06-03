import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, HelpCircle, ImageOff, SearchX, XCircle } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { Panel } from '@/components/common/Panel'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useGetProjectQuery } from '@/features/admin/api/adminApi'
import { selectCurrentWorkspace } from '@/features/auth/authSlice'
import type { DetectionBox, HumanFeedbackType } from '@/features/detection/detectionTypes'
import { getImageUrl } from '@/lib/image'
import { cn } from '@/lib/utils'
import {
  useCreateJobFeedbackMutation,
  useGetBatchQuery,
  useGetDetectionJobQuery,
  useGetJobFeedbackQuery,
} from '@/services/detectionApi'

const ImageViewer = lazy(() =>
  import('@/components/ImageViewer').then((module) => ({
    default: module.ImageViewer,
  })),
)

const feedbackLabels: Record<HumanFeedbackType, string> = {
  bad_image: 'Bad image',
  correct: 'Correct',
  false_positive: 'False positive',
  missed_defect: 'Missed defect',
  not_sure: 'Not sure',
  wrong_class: 'Wrong class',
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) return 'Not available'
  return `${(value * 100).toFixed(1)}%`
}

export function JobReviewPage() {
  const { batchId, jobId, projectId } = useParams()
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const [comment, setComment] = useState('')
  const [isCommentDirty, setIsCommentDirty] = useState(false)
  const [wrongClassBox, setWrongClassBox] = useState<DetectionBox>()
  const [correctedClassName, setCorrectedClassName] = useState('')
  const [message, setMessage] = useState<string>()
  const canSubmitFeedback =
    currentWorkspace?.role === 'OWNER' ||
    currentWorkspace?.role === 'ADMIN' ||
    currentWorkspace?.role === 'ENGINEER'

  const { data: project } = useGetProjectQuery(
    {
      workspaceId: currentWorkspace?.id,
      projectId: projectId ?? '',
    },
    {
      skip: !currentWorkspace?.id || !projectId,
    },
  )
  const { data: batch } = useGetBatchQuery(
    {
      workspaceId: currentWorkspace?.id,
      batchId,
    },
    {
      skip: !currentWorkspace?.id || !batchId,
    },
  )
  const { currentData: job } = useGetDetectionJobQuery(jobId ?? '', {
    skip: !jobId,
  })
  const { currentData: feedbackData } = useGetJobFeedbackQuery(jobId ?? '', {
    skip: !jobId,
  })
  const [createJobFeedback, createState] = useCreateJobFeedbackMutation()

  const detections = job?.detections ?? job?.result?.detections ?? []
  const imageUrl = getImageUrl(job?.annotated_image_url ?? job?.image_url)
  const feedbackItems = useMemo(() => feedbackData?.items ?? [], [feedbackData?.items])
  const wholeImageFeedback = useMemo(
    () => feedbackItems.find((item) => !item.detection_box_id),
    [feedbackItems],
  )
  const feedbackByDetectionId = useMemo(() => {
    const feedbackMap = new Map<string, (typeof feedbackItems)[number]>()
    for (const item of feedbackItems) {
      if (item.detection_box_id && !feedbackMap.has(item.detection_box_id)) {
        feedbackMap.set(item.detection_box_id, item)
      }
    }
    return feedbackMap
  }, [feedbackItems])

  const currentComment = isCommentDirty ? comment : wholeImageFeedback?.comment ?? ''
  const feedbackComment = (
    detectionBoxId?: string,
  ) => {
    const nextComment = detectionBoxId && !isCommentDirty
      ? ''
      : currentComment.trim()

    return nextComment || undefined
  }

  const submitFeedback = async (
    feedbackType: HumanFeedbackType,
    detectionBoxId?: string,
    correctedClass?: string,
  ) => {
    if (!jobId || !canSubmitFeedback) return

    try {
      setMessage(undefined)
      await createJobFeedback({
        jobId,
        batchId,
        payload: {
          feedback_type: feedbackType,
          detection_box_id: detectionBoxId,
          corrected_class_name: correctedClass || undefined,
          comment: feedbackComment(detectionBoxId),
        },
      }).unwrap()
      setComment('')
      setIsCommentDirty(false)
      setWrongClassBox(undefined)
      setCorrectedClassName('')
      setMessage(`Feedback saved as ${feedbackLabels[feedbackType]}.`)
    } catch {
      setMessage('Unable to save feedback.')
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-[1320px] gap-5">
      <div>
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
          to={projectId && batchId ? `/projects/${projectId}/batches/${batchId}` : '/projects'}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Batch
        </Link>
      </div>

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Image review
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {job?.original_filename ?? 'Inspection image'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {currentWorkspace?.name ?? 'Workspace'} / {project?.name ?? 'Project'} / {batch?.name ?? 'Batch'}
          </p>
        </div>
        <StatusBadge status={job?.status}>{job?.status ?? 'loading'}</StatusBadge>
      </section>

      {message ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <Suspense
          fallback={(
            <Panel>
              <div className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
            </Panel>
          )}
        >
          <ImageViewer
            alt={job?.original_filename ?? 'Inspection image'}
            boxes={detections}
            imageUrl={imageUrl}
          />
        </Suspense>

        <Panel eyebrow="Image feedback" title="Whole-image review">
          <div className="grid gap-4 p-5">
            {!canSubmitFeedback ? (
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                Your workspace role can view feedback, but cannot submit it.
              </div>
            ) : null}

            <textarea
              className="min-h-24 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              disabled={!canSubmitFeedback}
              onChange={(event) => {
                setComment(event.target.value)
                setIsCommentDirty(true)
              }}
              placeholder="Optional comment for whole-image or prediction feedback"
              value={currentComment}
            />
            {wholeImageFeedback ? (
              <div className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success">
                Saved whole-image feedback: {feedbackLabels[wholeImageFeedback.feedback_type]}
              </div>
            ) : null}

            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Whole-image/job feedback
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Use this for the full image review, especially when there are no detections or when the image-level result is acceptable.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                disabled={!canSubmitFeedback}
                isLoading={createState.isLoading}
                leftIcon={<CheckCircle2 className="size-4" aria-hidden="true" />}
                onClick={() => void submitFeedback('correct')}
                size="sm"
                variant={wholeImageFeedback?.feedback_type === 'correct' ? 'primary' : 'secondary'}
              >
                Correct
              </Button>
              <Button
                disabled={!canSubmitFeedback}
                isLoading={createState.isLoading}
                leftIcon={<SearchX className="size-4" aria-hidden="true" />}
                onClick={() => void submitFeedback('missed_defect')}
                size="sm"
                variant="secondary"
              >
                Missed defect
              </Button>
              <Button
                disabled={!canSubmitFeedback}
                isLoading={createState.isLoading}
                leftIcon={<HelpCircle className="size-4" aria-hidden="true" />}
                onClick={() => void submitFeedback('not_sure')}
                size="sm"
                variant="secondary"
              >
                Not sure
              </Button>
              <Button
                disabled={!canSubmitFeedback}
                isLoading={createState.isLoading}
                leftIcon={<ImageOff className="size-4" aria-hidden="true" />}
                onClick={() => void submitFeedback('bad_image')}
                size="sm"
                variant="secondary"
              >
                Bad image
              </Button>
            </div>

            {wrongClassBox ? (
              <div className="grid gap-3 rounded-2xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">
                  Correct class for {wrongClassBox.class_name}
                </p>
                <input
                  className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                  onChange={(event) => setCorrectedClassName(event.target.value)}
                  placeholder="Corrected class name"
                  value={correctedClassName}
                />
                <Button
                  disabled={!canSubmitFeedback || !correctedClassName.trim()}
                  isLoading={createState.isLoading}
                  onClick={() =>
                    void submitFeedback('wrong_class', wrongClassBox.id, correctedClassName.trim())
                  }
                  size="sm"
                >
                  Save wrong-class feedback
                </Button>
              </div>
            ) : null}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <Panel eyebrow="Prediction feedback" title="Detection rows">
          <div className="grid gap-3 p-5">
            <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
              Use this for individual detected boxes/classes. Each prediction row supports Correct, False Positive, or Wrong Class. Wrong Class asks for the corrected class name.
            </div>
            {detections.length ? (
              detections.map((detection) => {
                const savedFeedback = detection.id
                  ? feedbackByDetectionId.get(detection.id)
                  : undefined

                return (
                <article
                  className="grid gap-3 rounded-2xl border border-border bg-background p-4"
                  key={detection.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {detection.label ?? detection.class_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Confidence {formatPercent(detection.confidence)}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {savedFeedback ? (
                        <StatusBadge tone="success">
                          Saved: {feedbackLabels[savedFeedback.feedback_type]}
                        </StatusBadge>
                      ) : null}
                      <StatusBadge tone="primary">{formatPercent(detection.confidence)}</StatusBadge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!canSubmitFeedback || !detection.id}
                      isLoading={createState.isLoading}
                      leftIcon={<CheckCircle2 className="size-4" aria-hidden="true" />}
                      onClick={() => void submitFeedback('correct', detection.id)}
                      size="sm"
                      variant={savedFeedback?.feedback_type === 'correct' ? 'primary' : 'secondary'}
                    >
                      Correct
                    </Button>
                    <Button
                      disabled={!canSubmitFeedback || !detection.id}
                      isLoading={createState.isLoading}
                      leftIcon={<XCircle className="size-4" aria-hidden="true" />}
                      onClick={() => void submitFeedback('false_positive', detection.id)}
                      size="sm"
                      variant={savedFeedback?.feedback_type === 'false_positive' ? 'primary' : 'secondary'}
                    >
                      False positive
                    </Button>
                    <Button
                      className={cn(
                        savedFeedback?.feedback_type === 'wrong_class' && 'border-primary/60 bg-primary/10 text-primary',
                      )}
                      disabled={!canSubmitFeedback || !detection.id}
                      onClick={() => {
                        setWrongClassBox(detection)
                        setCorrectedClassName(savedFeedback?.corrected_class_name ?? '')
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      Wrong class
                    </Button>
                  </div>
                </article>
                )
              })
            ) : (
              <div className="rounded-2xl border border-border bg-background p-6 text-sm leading-6 text-muted-foreground">
                No detection rows are available for this image yet.
              </div>
            )}
          </div>
        </Panel>

        <Panel eyebrow="History" title="Existing feedback">
          <div className="grid gap-3 p-5">
            {feedbackItems.length ? (
              feedbackItems.map((item) => (
                <article
                  className="rounded-2xl border border-border bg-background p-4"
                  key={item.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StatusBadge tone="primary">{feedbackLabels[item.feedback_type]}</StatusBadge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    {item.predicted_class ?? 'Whole image'}
                    {item.confidence !== undefined && item.confidence !== null
                      ? ` / ${formatPercent(item.confidence)}`
                      : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    By {item.reviewer_name || item.reviewer_email || 'Unknown reviewer'}
                  </p>
                  {item.corrected_class_name ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Corrected class: {item.corrected_class_name}
                    </p>
                  ) : null}
                  {item.comment ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.comment}</p>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-background p-6 text-sm leading-6 text-muted-foreground">
                No feedback has been submitted for this image yet.
              </div>
            )}
          </div>
        </Panel>
      </section>
    </main>
  )
}
