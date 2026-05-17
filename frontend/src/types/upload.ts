export interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;

  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface UploadResponse {
  success: boolean;
  job_id: string;
  status: string;
  message: string;
}

export interface DetectionJobResponse {
  status: "queued" | "processing" | "completed" | "failed";

  detections?: Detection[];

  image_url?: string;

  annotated_image_url?: string;

  error?: string;
}
