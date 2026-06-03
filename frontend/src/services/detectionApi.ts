import { baseApi } from '@/services/baseApi'
import type {
  AssignedProjectListResponse,
  BatchFeedbackListResponse,
  BatchCreateRequest,
  BatchListResponse,
  BatchProgress,
  BatchReportSummary,
  BatchUploadResponse,
  DetectionJobListResponse,
  DetectionJobQuery,
  DetectionJobResponse,
  HumanFeedbackCreateRequest,
  HumanFeedbackListResponse,
  HumanFeedbackResponse,
  InspectionBatch,
  UploadDetectionResponse,
} from '@/features/detection/detectionTypes'

export const detectionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAssignedProjects: builder.query<AssignedProjectListResponse, string | void>({
      query: (workspaceId) =>
        workspaceId
          ? `/workspaces/${workspaceId}/projects?limit=100&is_active=true`
          : '/projects/my?limit=100',
      providesTags: (result, _error, workspaceId) => [
        'AdminProjects',
        'Projects',
        { type: 'Projects', id: workspaceId ?? 'default' },
        ...(result?.items.map((project) => ({ type: 'Project' as const, id: project.id })) ?? []),
      ],
    }),

    getDetectionJobs: builder.query<DetectionJobListResponse, DetectionJobQuery | void>({
      query: (filters) => {
        const params = new URLSearchParams()
        params.set('limit', String(filters?.limit ?? 20))
        params.set('offset', String(filters?.offset ?? 0))

        if (filters?.projectId) {
          params.set('project_id', filters.projectId)
        }

        if (filters?.workspaceId) {
          params.set('workspace_id', filters.workspaceId)
        }

        if (filters?.status) {
          params.set('status', filters.status)
        }

        return `/detect/jobs?${params.toString()}`
      },
      providesTags: (result, _error, filters) => [
        'Detection',
        'Jobs',
        { type: 'Jobs', id: filters?.projectId ? `project:${filters.projectId}` : 'workspace' },
        ...(result?.items
          .map((job) => job.job_id)
          .filter((jobId): jobId is string => Boolean(jobId))
          .map((jobId) => ({ type: 'Job' as const, id: jobId })) ?? []),
      ],
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
      invalidatesTags: ['Detection', 'Jobs'],
    }),

    uploadBatch: builder.mutation<
      BatchUploadResponse,
      { workspaceId: string; files: File[]; projectId: string; name?: string; description?: string }
    >({
      query: ({ workspaceId, files, projectId, name, description }) => {
        const formData = new FormData()
        files.forEach((file) => formData.append('files', file))
        formData.append('project_id', projectId)
        if (name) {
          formData.append('name', name)
        }
        if (description) {
          formData.append('description', description)
        }

        return {
          url: `/workspaces/${workspaceId}/batches`,
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: (_result, _error, { projectId }) => [
        'Batches',
        { type: 'Batches', id: `project:${projectId}` },
        'Detection',
        'Jobs',
        'Reports',
        'Report',
        { type: 'Project', id: projectId },
      ],
    }),

    createBatch: builder.mutation<InspectionBatch, BatchCreateRequest>({
      query: ({ workspaceId, projectId, name, description }) => ({
        url: `/workspaces/${workspaceId}/batches`,
        method: 'POST',
        body: {
          project_id: projectId,
          name,
          description,
        },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        'Batches',
        { type: 'Batches', id: `project:${projectId}` },
        { type: 'Project', id: projectId },
      ],
    }),

    addBatchImages: builder.mutation<
      BatchUploadResponse,
      { workspaceId: string; batchId: string; projectId: string; files: File[] }
    >({
      query: ({ workspaceId, batchId, files }) => {
        const formData = new FormData()
        files.forEach((file) => formData.append('files', file))

        return {
          url: `/workspaces/${workspaceId}/batches/${batchId}/images`,
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: (_result, _error, { batchId, projectId }) => [
        'Batches',
        { type: 'Batches', id: `project:${projectId}` },
        { type: 'Batch', id: batchId },
        'Detection',
        'Jobs',
        'Reports',
        'Report',
        { type: 'Report', id: batchId },
        { type: 'Project', id: projectId },
      ],
    }),

    getBatches: builder.query<
      BatchListResponse,
      { workspaceId?: string; projectId?: string; limit?: number; offset?: number }
    >({
      query: ({ workspaceId, projectId, limit = 10, offset = 0 }) => {
        const params = new URLSearchParams()
        params.set('limit', String(limit))
        params.set('offset', String(offset))
        if (projectId) {
          params.set('project_id', projectId)
        }

        return `/workspaces/${workspaceId}/batches?${params.toString()}`
      },
      providesTags: (result, _error, { workspaceId, projectId }) => [
        'Batches',
        { type: 'Batches', id: projectId ? `project:${projectId}` : `workspace:${workspaceId ?? 'default'}` },
        ...(result?.items.map((batch) => ({ type: 'Batch' as const, id: batch.id })) ?? []),
      ],
    }),

    getBatch: builder.query<
      InspectionBatch,
      { workspaceId?: string; batchId?: string }
    >({
      query: ({ workspaceId, batchId }) =>
        `/workspaces/${workspaceId}/batches/${batchId}`,
      providesTags: (_result, _error, { batchId }) => [
        { type: 'Batches', id: batchId },
        { type: 'Batch', id: batchId },
      ],
    }),

    getBatchProgress: builder.query<
      BatchProgress,
      { workspaceId?: string; batchId?: string }
    >({
      query: ({ workspaceId, batchId }) =>
        `/workspaces/${workspaceId}/batches/${batchId}/progress`,
      providesTags: (_result, _error, { batchId }) => [
        { type: 'Batches', id: `${batchId}:progress` },
        { type: 'Batch', id: batchId },
      ],
    }),

    getBatchReportSummary: builder.query<
      BatchReportSummary,
      { workspaceId?: string; projectId?: string; batchId?: string }
    >({
      query: ({ workspaceId, projectId, batchId }) =>
        projectId
          ? `/workspaces/${workspaceId}/projects/${projectId}/batches/${batchId}/report`
          : `/workspaces/${workspaceId}/reports/batches/${batchId}/summary`,
      providesTags: (_result, _error, { batchId }) => [
        { type: 'Reports', id: batchId },
        { type: 'Report', id: batchId },
      ],
    }),

    getBatchReportCsv: builder.query<
      string,
      { workspaceId: string; projectId?: string; batchId: string }
    >({
      query: ({ workspaceId, projectId, batchId }) => ({
        url: projectId
          ? `/workspaces/${workspaceId}/projects/${projectId}/batches/${batchId}/export.csv`
          : `/workspaces/${workspaceId}/reports/batches/${batchId}.csv`,
        responseHandler: (response) => response.text(),
      }),
      providesTags: (_result, _error, { batchId }) => [
        { type: 'Reports', id: `${batchId}:csv` },
        { type: 'Report', id: batchId },
      ],
    }),

    getBatchFeedback: builder.query<
      BatchFeedbackListResponse,
      { workspaceId?: string; projectId?: string; batchId?: string }
    >({
      query: ({ workspaceId, projectId, batchId }) =>
        `/workspaces/${workspaceId}/projects/${projectId}/batches/${batchId}/feedback`,
      providesTags: (_result, _error, { batchId }) => [
        { type: 'Batches', id: `${batchId}:feedback` },
        { type: 'Feedback', id: batchId },
      ],
    }),

    getDetectionJob: builder.query<DetectionJobResponse, string>({
      query: (jobId) => `/detect/jobs/${jobId}`,
      providesTags: (_result, _error, jobId) => [
        { type: 'Detection', id: jobId },
        { type: 'Job', id: jobId },
      ],
    }),

    getJobFeedback: builder.query<HumanFeedbackListResponse, string>({
      query: (jobId) => `/detect/jobs/${jobId}/feedback`,
      providesTags: (_result, _error, jobId) => [
        { type: 'Detection', id: `${jobId}:feedback` },
        { type: 'Feedback', id: jobId },
      ],
    }),

    createJobFeedback: builder.mutation<
      HumanFeedbackResponse,
      { jobId: string; payload: HumanFeedbackCreateRequest; batchId?: string | null }
    >({
      query: ({ jobId, payload }) => ({
        url: `/detect/jobs/${jobId}/feedback`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { jobId, batchId }) => [
        { type: 'Detection', id: `${jobId}:feedback` },
        { type: 'Feedback', id: jobId },
        { type: 'Job', id: jobId },
        ...(batchId
          ? [
            { type: 'Feedback' as const, id: batchId },
            { type: 'Batches' as const, id: `${batchId}:feedback` },
            { type: 'Batch' as const, id: batchId },
            { type: 'Report' as const, id: batchId },
            { type: 'Reports' as const, id: batchId },
            { type: 'Reports' as const, id: `${batchId}:csv` },
          ]
          : []),
        'Batches',
        'Reports',
        'Report',
      ],
    }),
  }),
})

export const {
  useAddBatchImagesMutation,
  useCreateBatchMutation,
  useCreateJobFeedbackMutation,
  useGetBatchQuery,
  useGetBatchFeedbackQuery,
  useGetBatchProgressQuery,
  useGetBatchReportSummaryQuery,
  useGetBatchesQuery,
  useGetAssignedProjectsQuery,
  useGetDetectionJobQuery,
  useGetDetectionJobsQuery,
  useGetJobFeedbackQuery,
  useLazyGetBatchReportCsvQuery,
  useUploadBatchMutation,
  useUploadDetectionMutation,
} = detectionApi
