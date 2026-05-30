import { baseApi } from '@/services/baseApi'
import type {
  AssignedProjectListResponse,
  DetectionJobListResponse,
  DetectionJobQuery,
  DetectionJobResponse,
  HumanFeedbackCreateRequest,
  HumanFeedbackListResponse,
  HumanFeedbackResponse,
  UploadDetectionResponse,
} from '@/features/detection/detectionTypes'

export const detectionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAssignedProjects: builder.query<AssignedProjectListResponse, string | void>({
      query: (workspaceId) =>
        workspaceId
          ? `/workspaces/${workspaceId}/projects?limit=100&is_active=true`
          : '/projects/my?limit=100',
      providesTags: ['AdminProjects'],
    }),

    getDetectionJobs: builder.query<DetectionJobListResponse, DetectionJobQuery | void>({
      query: (filters) => {
        const params = new URLSearchParams()
        params.set('limit', String(filters?.limit ?? 20))
        params.set('offset', String(filters?.offset ?? 0))

        if (filters?.projectId) {
          params.set('project_id', filters.projectId)
        }

        if (filters?.status) {
          params.set('status', filters.status)
        }

        return `/detect/jobs?${params.toString()}`
      },
      providesTags: ['Detection'],
    }),

    uploadDetection: builder.mutation<UploadDetectionResponse, { file: File; projectId?: string }>({
      query: ({ file, projectId }) => {
        const formData = new FormData()
        formData.append('file', file)
        if (projectId) {
          formData.append('project_id', projectId)
        }

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

    getJobFeedback: builder.query<HumanFeedbackListResponse, string>({
      query: (jobId) => `/detect/jobs/${jobId}/feedback`,
      providesTags: (_result, _error, jobId) => [{ type: 'Detection', id: `${jobId}:feedback` }],
    }),

    createJobFeedback: builder.mutation<
      HumanFeedbackResponse,
      { jobId: string; payload: HumanFeedbackCreateRequest }
    >({
      query: ({ jobId, payload }) => ({
        url: `/detect/jobs/${jobId}/feedback`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { jobId }) => [
        { type: 'Detection', id: `${jobId}:feedback` },
      ],
    }),
  }),
})

export const {
  useCreateJobFeedbackMutation,
  useGetAssignedProjectsQuery,
  useGetDetectionJobQuery,
  useGetDetectionJobsQuery,
  useGetJobFeedbackQuery,
  useUploadDetectionMutation,
} = detectionApi
