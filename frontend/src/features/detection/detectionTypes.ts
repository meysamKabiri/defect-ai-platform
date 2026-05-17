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
  class_id: number;

  class_name: string;

  confidence: number;

  bbox: BoundingBox;
};

export type DetectionResult = {
  status: DetectionStatus;

  imageUrl?: string;

  annotatedImageUrl?: string;

  defects: DetectionBox[];

  inferenceMs?: number;

  modelVersion?: string;

  error?: string;
};

export type UploadDetectionResponse = {
  success: boolean;

  job_id: string;

  status: DetectionStatus;

  message: string;
};

export type DetectionJobResponse = {
  status: DetectionStatus;

  detections?: DetectionBox[];

  image_url?: string;

  annotated_image_url?: string;

  inference_ms?: number;

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
