import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type {
  DetectionHistoryItem,
  DetectionHistoryResponse,
  DetectionStreamEvent,
  UploadDetectionResponse,
  UploadJobResponse,
} from '@/features/detection/detectionTypes'
import { setUploadProgress, setUploadStatus } from '@/features/detection/uploadProgressSlice'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const DETECTION_UPLOAD_URL = `${API_BASE_URL.replace(/\/$/, '')}/uploads/image`

type UploadDetectionArg = {
  file: File
}

type ApiError = FetchBaseQueryError

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (progress: number) => void,
) {
  return new Promise<UploadDetectionResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()

    formData.append('file', file)
    xhr.open('POST', url)
    xhr.responseType = 'json'

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100)
      }
    }

    xhr.onload = () => {
      const response = xhr.response || JSON.parse(xhr.responseText || '{}')

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(normalizeDetectionResponse(response, file.name))
        return
      }

      reject({
        status: xhr.status,
        data: { message: response?.message || response?.detail || 'Detection upload failed' },
      } satisfies ApiError)
    }

    xhr.onerror = () => {
      reject({ status: 'FETCH_ERROR', error: 'Network error while uploading image' } satisfies ApiError)
    }

    xhr.send(formData)
  })
}

function normalizeDetectionResponse(data: unknown, filename: string): UploadDetectionResponse {
  if (typeof data === 'object' && data !== null) {
    const value = data as Partial<UploadDetectionResponse> &
      Partial<UploadJobResponse> & {
        detections?: UploadDetectionResponse['defects']
      }

    return {
      ...value,
      id: value.id ?? value.detection_id,
      imageId: value.imageId ?? value.image_id,
      detectionId: value.detectionId ?? value.detection_id,
      jobId: value.jobId ?? value.job_id,
      streamUrl: value.streamUrl ?? value.stream_url,
      filename: value.filename ?? filename,
      defects: value.defects ?? value.detections ?? [],
      summary:
        value.summary ??
        (value.detection_id
          ? 'Image accepted. AI inference is running in the background.'
          : undefined),
    }
  }

  return {
    filename,
    defects: [],
    summary: 'Upload completed, but the API returned an empty response.',
  }
}

function normalizeHistoryItem(item: DetectionHistoryItem): UploadDetectionResponse {
  const result = item.result as
    | {
        boxes?: UploadDetectionResponse['defects']
        defects?: UploadDetectionResponse['defects']
        confidence?: number
        defect_type?: string
        model_version?: string
      }
    | null
    | undefined

  return {
    id: item.id,
    imageId: item.image_id,
    detectionId: item.id,
    status: item.status,
    modelVersion: item.model_version ?? result?.model_version,
    defects: result?.boxes ?? result?.defects ?? [],
    summary: item.error_message ?? item.defect_type ?? undefined,
    createdAt: item.created_at,
  }
}

export const detectionApi = createApi({
  reducerPath: 'detectionApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('access_token')
      if (token) headers.set('authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['Detection'],
  endpoints: (builder) => ({
    uploadDetection: builder.mutation<UploadDetectionResponse, UploadDetectionArg>({
      async queryFn({ file }, api) {
        try {
          api.dispatch(setUploadStatus('uploading'))
          const data = await uploadWithProgress(DETECTION_UPLOAD_URL, file, (progress) => {
            api.dispatch(setUploadProgress(progress))
          })
          api.dispatch(setUploadStatus('complete'))
          return { data }
        } catch (error) {
          api.dispatch(setUploadStatus('error'))
          return { error: error as ApiError }
        }
      },
      invalidatesTags: ['Detection'],
    }),
    getDetectionHistory: builder.query<DetectionHistoryResponse, { limit?: number; offset?: number } | void>({
      query: (params) => ({
        url: '/detections',
        params: {
          limit: params?.limit ?? 50,
          offset: params?.offset ?? 0,
        },
      }),
      providesTags: ['Detection'],
    }),
    getDetection: builder.query<UploadDetectionResponse, string>({
      query: (detectionId) => `/detections/${detectionId}`,
      transformResponse: (response: DetectionHistoryItem) => normalizeHistoryItem(response),
      providesTags: (_result, _error, detectionId) => [{ type: 'Detection', id: detectionId }],
    }),
    streamDetection: builder.query<DetectionStreamEvent[], string>({
      queryFn: () => ({ data: [] }),
      async onCacheEntryAdded(detectionId, { cacheDataLoaded, cacheEntryRemoved, updateCachedData }) {
        await cacheDataLoaded
        const streamUrl = detectionId.startsWith('/api')
          ? detectionId
          : `${API_BASE_URL.replace(/\/$/, '')}/streams/detections/${detectionId}`
        const resolvedDetectionId = detectionId.includes('/streams/detections/')
          ? detectionId.split('/streams/detections/')[1]?.split('?')[0] ?? detectionId
          : detectionId
        const eventSource = new EventSource(streamUrl, { withCredentials: true })

        const pushEvent = (type: string, event: MessageEvent<string>) => {
          const data = JSON.parse(event.data || '{}') as Partial<DetectionStreamEvent> & {
            detection_id?: string
          }

          updateCachedData((draft) => {
            draft.push({
              type,
              detectionId: data.detectionId ?? data.detection_id ?? resolvedDetectionId,
              progress: data.progress,
              result: data.result,
              error: data.error,
            })
          })

          if (['completed', 'failed', 'cancelled'].includes(type)) eventSource.close()
        }

        eventSource.addEventListener('queued', (event) => pushEvent('queued', event as MessageEvent<string>))
        eventSource.addEventListener('processing', (event) => pushEvent('processing', event as MessageEvent<string>))
        eventSource.addEventListener('completed', (event) => pushEvent('completed', event as MessageEvent<string>))
        eventSource.addEventListener('failed', (event) => pushEvent('failed', event as MessageEvent<string>))

        await cacheEntryRemoved
        eventSource.close()
      },
      providesTags: (_result, _error, detectionId) => [{ type: 'Detection', id: detectionId }],
    }),
  }),
})

export const {
  useGetDetectionHistoryQuery,
  useGetDetectionQuery,
  useStreamDetectionQuery,
  useUploadDetectionMutation,
} = detectionApi
