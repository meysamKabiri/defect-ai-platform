import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  selectAccessToken,
  selectCurrentWorkspace,
} from '@/features/auth/authSlice'
import { API_V1_BASE_URL } from '@/lib/config'
import { baseApi } from '@/services/baseApi'

type WorkspaceEvent = {
  type: string
  workspace_id: string
  project_id?: string
  batch_id?: string
  job_id?: string
  feedback_id?: string
  status?: string
  timestamp?: string
}

type CacheTag = Parameters<typeof baseApi.util.invalidateTags>[0][number]
type CacheTagType = Extract<CacheTag, string>

const INITIAL_RECONNECT_MS = 1000
const MAX_RECONNECT_MS = 15000
const REPORT_DEBOUNCE_MS = 300

function parseEventBlock(block: string) {
  let event = 'message'
  const dataLines: string[] = []

  for (const rawLine of block.split('\n')) {
    const line = rawLine.trimEnd()
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  return {
    event,
    data: dataLines.join('\n'),
  }
}

function parseWorkspaceEvent(data: string): WorkspaceEvent | null {
  try {
    const parsed = JSON.parse(data) as WorkspaceEvent
    return typeof parsed.type === 'string' && typeof parsed.workspace_id === 'string'
      ? parsed
      : null
  } catch {
    return null
  }
}

function listTag(type: CacheTagType, id?: string): CacheTag {
  return id ? { type, id } : type
}

function workspaceRefreshTags(workspaceId: string): CacheTag[] {
  return [
    listTag('Projects', workspaceId),
    'Projects',
    'Batches',
    'Jobs',
    'Feedback',
    'Report',
    'WorkspaceMembers',
    'WorkspaceInvitations',
  ]
}

function eventTags(event: WorkspaceEvent): CacheTag[] {
  const tags: CacheTag[] = []

  switch (event.type) {
    case 'project.created':
      tags.push(listTag('Projects', event.workspace_id), 'Projects')
      break
    case 'project.updated':
    case 'project.deleted':
      tags.push(listTag('Projects', event.workspace_id), 'Projects')
      if (event.project_id) tags.push(listTag('Project', event.project_id))
      break
    case 'batch.created':
      tags.push('Batches')
      if (event.project_id) {
        tags.push(listTag('Batches', `project:${event.project_id}`))
        tags.push(listTag('Project', event.project_id))
      }
      break
    case 'batch.updated':
    case 'batch.completed':
    case 'batch.failed':
      tags.push('Batches')
      if (event.batch_id) tags.push(listTag('Batch', event.batch_id))
      if (event.project_id) tags.push(listTag('Batches', `project:${event.project_id}`))
      break
    case 'job.created':
      tags.push('Jobs')
      if (event.batch_id) tags.push(listTag('Batch', event.batch_id))
      if (event.project_id) tags.push(listTag('Jobs', `project:${event.project_id}`))
      break
    case 'job.updated':
    case 'job.completed':
    case 'job.failed':
      tags.push('Jobs')
      if (event.job_id) tags.push(listTag('Job', event.job_id))
      if (event.batch_id) tags.push(listTag('Batch', event.batch_id))
      if (event.project_id) tags.push(listTag('Jobs', `project:${event.project_id}`))
      break
    case 'feedback.created':
    case 'feedback.updated':
      if (event.job_id) {
        tags.push(listTag('Feedback', event.job_id))
        tags.push(listTag('Job', event.job_id))
      }
      if (event.batch_id) {
        tags.push(listTag('Feedback', event.batch_id))
        tags.push(listTag('Batch', event.batch_id))
      }
      break
    case 'report.updated':
      break
    default:
      break
  }

  return tags
}

function reportBatchId(event: WorkspaceEvent) {
  if (
    event.type === 'report.updated' ||
    event.type === 'batch.updated' ||
    event.type === 'batch.completed' ||
    event.type === 'batch.failed' ||
    event.type === 'job.updated' ||
    event.type === 'job.completed' ||
    event.type === 'job.failed' ||
    event.type === 'feedback.created' ||
    event.type === 'feedback.updated'
  ) {
    return event.batch_id
  }

  return undefined
}

export function WorkspaceEventListener() {
  const dispatch = useAppDispatch()
  const accessToken = useAppSelector(selectAccessToken)
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const reportTimersRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const workspaceId = currentWorkspace?.id
    if (!workspaceId || !accessToken) return undefined

    const abortController = new AbortController()
    const reportTimers = reportTimersRef.current
    let reconnectTimer: number | undefined
    let reconnectDelay = INITIAL_RECONNECT_MS
    let stopped = false
    let hasConnectedOnce = false

    const clearReconnect = () => {
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = undefined
      }
    }

    const scheduleReportInvalidation = (batchId?: string) => {
      if (!batchId) return

      const existingTimer = reportTimers.get(batchId)
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer)
      }

      const timer = window.setTimeout(() => {
        dispatch(baseApi.util.invalidateTags([listTag('Report', batchId)]))
        reportTimers.delete(batchId)
      }, REPORT_DEBOUNCE_MS)

      reportTimers.set(batchId, timer)
    }

    const handleEvent = (event: WorkspaceEvent) => {
      if (event.workspace_id !== workspaceId) return

      const tags = eventTags(event)
      if (tags.length) {
        dispatch(baseApi.util.invalidateTags(tags))
      }

      scheduleReportInvalidation(reportBatchId(event))
    }

    const connect = async () => {
      try {
        const response = await fetch(`${API_V1_BASE_URL}/workspaces/${workspaceId}/events`, {
          headers: {
            Accept: 'text/event-stream',
            Authorization: `Bearer ${accessToken}`,
          },
          signal: abortController.signal,
        })

        if (response.status === 401 || response.status === 403) {
          stopped = true
          return
        }

        if (!response.ok || !response.body) {
          throw new Error(`Workspace event stream failed with status ${response.status}`)
        }

        if (hasConnectedOnce) {
          dispatch(baseApi.util.invalidateTags(workspaceRefreshTags(workspaceId)))
        }
        hasConnectedOnce = true
        reconnectDelay = INITIAL_RECONNECT_MS

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (!stopped) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const blocks = buffer.split(/\r?\n\r?\n/)
          buffer = blocks.pop() ?? ''

          for (const block of blocks) {
            const parsedBlock = parseEventBlock(block)
            if (parsedBlock.event !== 'workspace.event') continue

            const workspaceEvent = parseWorkspaceEvent(parsedBlock.data)
            if (workspaceEvent) {
              handleEvent(workspaceEvent)
            }
          }
        }
      } catch {
        if (abortController.signal.aborted || stopped) return
      }

      if (!stopped && !abortController.signal.aborted) {
        reconnectTimer = window.setTimeout(() => {
          void connect()
        }, reconnectDelay)
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS)
      }
    }

    void connect()

    return () => {
      stopped = true
      clearReconnect()
      abortController.abort()
      for (const timer of reportTimers.values()) {
        window.clearTimeout(timer)
      }
      reportTimers.clear()
    }
  }, [accessToken, currentWorkspace?.id, dispatch])

  return null
}
