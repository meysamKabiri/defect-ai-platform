import { baseApi } from '@/services/baseApi'
import type {
  DetectionJobResponse,
  UploadDetectionResponse,
} from '@/features/detection/detectionTypes'

export const detectionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadDetection: builder.mutation<UploadDetectionResponse, { file: File }>({
      query: ({ file }) => {
        const formData = new FormData()
        formData.append('file', file)

        return {
          url: '/detect/upload',
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: ['Detection'],
    }),

    getDetectionJob: builder.query<DetectionJobResponse, string>({
      query: (jobId) => `/detect/jobs/${jobId}`,
      providesTags: (_result, _error, jobId) => [{ type: 'Detection', id: jobId }],
    }),
  }),
})

export const { useUploadDetectionMutation, useGetDetectionJobQuery } = detectionApi
