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

export type AssignedProject = {
  id: string;

  name: string;

  description?: string | null;

  owner_id?: string | null;

  is_active: boolean;

  created_at?: string;

  updated_at?: string;
};

export type AssignedProjectListResponse = {
  items: AssignedProject[];

  total: number;

  limit: number;

  offset: number;
};

export type DetectionJobResponse = {
  job_id?: string;

  status: DetectionStatus;

  rq_job_id?: string;

  project_id?: string | null;

  batch_id?: string | null;

  original_filename?: string | null;

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

  detection_count?: number;

  created_at?: string;

  updated_at?: string;

  started_at?: string | null;

  completed_at?: string | null;
};

export type DetectionJobListResponse = {
  items: DetectionJobResponse[];

  total: number;

  limit: number;

  offset: number;
};

export type DetectionJobQuery = {
  workspaceId?: string;

  projectId?: string;

  status?: Exclude<DetectionStatus, "idle" | "uploading"> | "";

  limit?: number;

  offset?: number;
};

export type BatchProgress = {
  batch_id: string;
  total_jobs: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  status: DetectionStatus | "completed";
  completion_rate: number;
};

export type InspectionBatch = {
  id: string;
  workspace_id: string;
  workspace_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  name?: string | null;
  description?: string | null;
  uploaded_by_name?: string | null;
  uploaded_by_email?: string | null;
  status: DetectionStatus | "completed";
  total_jobs: number;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  progress?: BatchProgress | null;
  jobs?: DetectionJobResponse[];
};

export type BatchListResponse = {
  items: InspectionBatch[];
  total: number;
  limit: number;
  offset: number;
};

export type BatchCreateRequest = {
  workspaceId: string;
  projectId: string;
  name?: string;
  description?: string;
};

export type BatchUploadResponse = {
  id: string;
  workspace_id: string;
  project_id?: string | null;
  name?: string | null;
  description?: string | null;
  status: DetectionStatus | "completed";
  total_jobs: number;
  jobs: Array<{
    job_id: string;
    status: DetectionStatus;
    original_filename?: string | null;
  }>;
};

export type BatchReportSummary = {
  batch_id: string;
  workspace_id: string;
  workspace_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  batch_name?: string | null;
  batch_description?: string | null;
  uploaded_by_name?: string | null;
  uploaded_by_email?: string | null;
  created_at?: string | null;
  total_images: number;
  queued_images: number;
  processing_images: number;
  completed_images: number;
  failed_images: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  total_predictions: number;
  total_detections: number;
  average_confidence?: number | null;
  prediction_class_counts: Array<{ class_name: string; count: number }>;
  class_counts: Array<{ class_name: string; count: number }>;
  feedback_counts: Array<{ feedback_type: string; count: number }>;
  correct_count: number;
  false_positive_count: number;
  wrong_class_count: number;
  missed_defect_count: number;
  not_sure_count: number;
  bad_image_count: number;
  reviewed_images_count: number;
  unreviewed_images_count: number;
  estimated_false_positive_rate?: number | null;
  estimated_missed_defect_rate?: number | null;
  recommendation: string;
  reviewed_jobs: number;
  completion_rate: number;
};

export type BatchFeedbackItem = {
  id: string;
  job_id: string;
  detection_box_id?: string | null;
  image_filename?: string | null;
  predicted_class?: string | null;
  confidence?: number | null;
  feedback_type: HumanFeedbackType;
  corrected_class_name?: string | null;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  reviewer_email?: string | null;
  reviewed_at: string;
  comment?: string | null;
};

export type BatchFeedbackListResponse = {
  items: BatchFeedbackItem[];
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

export type HumanFeedbackType =
  | "correct"
  | "false_positive"
  | "wrong_class"
  | "missed_defect"
  | "not_sure"
  | "bad_image";

export type HumanFeedbackCreateRequest = {
  feedback_type: HumanFeedbackType;

  detection_box_id?: string;

  corrected_class_name?: string;

  comment?: string;
};

export type HumanFeedbackResponse = {
  id: string;

  job_id: string;

  detection_box_id?: string | null;

  reviewer_id?: string | null;

  reviewer_name?: string | null;

  reviewer_email?: string | null;

  predicted_class?: string | null;

  confidence?: number | null;

  feedback_type: HumanFeedbackType;

  corrected_class_name?: string | null;

  comment?: string | null;

  created_at: string;
};

export type HumanFeedbackListResponse = {
  items: HumanFeedbackResponse[];
};
