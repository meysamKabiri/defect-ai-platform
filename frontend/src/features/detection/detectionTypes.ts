export type DetectionStatus =
  | "idle"
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type BoundingBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type DetectionBox = {
  id?: string;

  class_id: number;

  class_name: string;

  label?: string;

  severity?: string;

  confidence: number;

  bbox: BoundingBox;

  x?: number;

  y?: number;

  width?: number;

  height?: number;
};

export type DetectionResult = {
  status: DetectionStatus;

  jobId?: string;

  rqJobId?: string;

  imageUrl?: string;

  annotatedImageUrl?: string;

  defects: DetectionBox[];

  inferenceMs?: number;

  processingTimeSeconds?: number;

  modelVersion?: string;

  error?: string;

  summary?: string;
};

export type UploadDetectionResponse = {
  success: boolean;

  job_id: string;

  status: DetectionStatus;

  message: string;
};

export type DetectionJobResponse = {
  job_id?: string;

  status: DetectionStatus;

  rq_job_id?: string;

  image_url?: string;

  annotated_image_url?: string;

  detections?: DetectionBox[];

  result?: {
    detections?: DetectionBox[];
    annotated_image_url?: string;
  };

  inference_ms?: number;

  processing_time_seconds?: number;

  model_version?: string;

  error?: string;
};

export type DetectionHistoryItem = {
  id: string;

  status: DetectionStatus;

  image_url?: string;

  annotated_image_url?: string;

  created_at: string;
};

export type DetectionHistoryResponse = {
  items: DetectionHistoryItem[];

  total: number;
};
