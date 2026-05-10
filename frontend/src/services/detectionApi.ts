import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { UploadDetectionResponse } from '@/features/detection/detectionTypes'
import { setUploadProgress, setUploadStatus } from '@/features/detection/uploadProgressSlice'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const DETECTION_ENDPOINT = import.meta.env.VITE_DETECTION_ENDPOINT ?? '/detections'
const DETECTION_UPLOAD_URL = `${API_BASE_URL.replace(/\/$/, '')}/${DETECTION_ENDPOINT.replace(/^\//, '')}`

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
    const value = data as Partial<UploadDetectionResponse> & { detections?: UploadDetectionResponse['defects'] }

    return {
      ...value,
      filename: value.filename ?? filename,
      defects: value.defects ?? value.detections ?? [],
    }
  }

  return {
    filename,
    defects: [],
    summary: 'Upload completed, but the API returned an empty response.',
  }
}

export const detectionApi = createApi({
  reducerPath: 'detectionApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
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
  }),
})

export const { useUploadDetectionMutation } = detectionApi
