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
