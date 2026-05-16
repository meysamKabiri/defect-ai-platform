export type DetectionBox = {
  id?: string | number
  label: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
  severity?: 'low' | 'medium' | 'high' | 'critical' | string
}

export type DetectionResult = {
  id?: string | number
  imageId?: string
  detectionId?: string
  jobId?: string
  status?: DetectionStatus
  streamUrl?: string
  filename?: string
  imageUrl?: string
  annotatedImageUrl?: string
  inferenceMs?: number
  modelVersion?: string
  defects: DetectionBox[]
  summary?: string
  createdAt?: string
}

export type UploadDetectionResponse = DetectionResult

export type DetectionStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

export type UploadJobResponse = {
  image_id: string
  detection_id: string
  job_id: string
  status: DetectionStatus
  stream_url: string
}

export type DetectionHistoryItem = {
  id: string
  image_id: string
  status: DetectionStatus
  model_name?: string | null
  model_version?: string | null
  confidence?: number | null
  defect_type?: string | null
  result?: Record<string, unknown> | null
  error_message?: string | null
  created_at: string
  completed_at?: string | null
}

export type DetectionHistoryResponse = {
  items: DetectionHistoryItem[]
  limit: number
  offset: number
  total: number
}

export type DetectionStreamEvent = {
  type: string
  detectionId: string
  progress?: number
  result?: Record<string, unknown>
  error?: string
}
