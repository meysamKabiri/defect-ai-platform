from typing import Optional
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel
from pydantic import Field


class DetectionItem(BaseModel):
    id: str
    label: str
    confidence: float
    x: float
    y: float
    width: float
    height: float


class UploadResponse(BaseModel):
    success: bool
    job_id: str
    status: str
    message: str


class BatchJobUploadResponse(BaseModel):
    job_id: str
    status: str
    original_filename: str | None = None


class BatchCreateRequest(BaseModel):
    project_id: str
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None


class BatchUploadResponse(BaseModel):
    id: str
    workspace_id: str
    project_id: str | None = None
    name: str | None = None
    description: str | None = None
    status: str
    total_jobs: int
    jobs: list[BatchJobUploadResponse]


class DetectionJobResponse(BaseModel):
    job_id: Optional[str] = None
    status: str
    filename: Optional[str] = None
    image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    detections: Optional[list[DetectionItem]] = None
    error: Optional[str] = None


class DetectionBoxResponse(BaseModel):
    id: str
    class_id: int
    class_name: str
    label: str | None = None
    severity: str | None = None
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float
    x: float
    y: float
    width: float
    height: float


class PersistedDetectionJobResponse(BaseModel):
    job_id: str
    rq_job_id: str | None = None
    status: str
    project_id: str | None = None
    batch_id: str | None = None
    original_filename: str | None = None
    image_url: str | None = None
    annotated_image_url: str | None = None
    processing_time_seconds: float | None = None
    detection_count: int
    error: str | None = None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    detections: list[DetectionBoxResponse] = Field(default_factory=list)


class DetectionJobListResponse(BaseModel):
    items: list[PersistedDetectionJobResponse]
    total: int
    limit: int
    offset: int


class BatchProgressResponse(BaseModel):
    batch_id: str
    total_jobs: int
    queued: int
    processing: int
    completed: int
    failed: int
    status: str
    completion_rate: float


class BatchResponse(BaseModel):
    id: str
    workspace_id: str
    workspace_name: str | None = None
    project_id: str | None = None
    project_name: str | None = None
    name: str | None = None
    description: str | None = None
    uploaded_by_name: str | None = None
    uploaded_by_email: str | None = None
    status: str
    total_jobs: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    progress: BatchProgressResponse | None = None
    jobs: list[PersistedDetectionJobResponse] = Field(default_factory=list)


class BatchListResponse(BaseModel):
    items: list[BatchResponse]
    total: int
    limit: int
    offset: int


class ReportClassCount(BaseModel):
    class_name: str
    count: int


class ReportFeedbackCount(BaseModel):
    feedback_type: str
    count: int


class BatchFeedbackResponse(BaseModel):
    id: str
    job_id: str
    detection_box_id: str | None = None
    image_filename: str | None = None
    predicted_class: str | None = None
    confidence: float | None = None
    feedback_type: str
    corrected_class_name: str | None = None
    reviewer_id: str | None = None
    reviewer_name: str | None = None
    reviewer_email: str | None = None
    reviewed_at: datetime
    comment: str | None = None


class BatchFeedbackListResponse(BaseModel):
    items: list[BatchFeedbackResponse] = Field(default_factory=list)


class BatchReportSummaryResponse(BaseModel):
    batch_id: str
    workspace_id: str
    workspace_name: str | None = None
    project_id: str | None = None
    project_name: str | None = None
    batch_name: str | None = None
    batch_description: str | None = None
    uploaded_by_name: str | None = None
    uploaded_by_email: str | None = None
    created_at: datetime | None = None
    total_images: int
    queued_images: int
    processing_images: int
    completed_images: int
    failed_images: int
    queued: int
    processing: int
    completed: int
    failed: int
    total_predictions: int
    total_detections: int
    average_confidence: float | None = None
    prediction_class_counts: list[ReportClassCount] = Field(default_factory=list)
    class_counts: list[ReportClassCount] = Field(default_factory=list)
    feedback_counts: list[ReportFeedbackCount] = Field(default_factory=list)
    correct_count: int = 0
    false_positive_count: int = 0
    wrong_class_count: int = 0
    missed_defect_count: int = 0
    not_sure_count: int = 0
    bad_image_count: int = 0
    reviewed_images_count: int
    unreviewed_images_count: int
    estimated_false_positive_rate: float | None = None
    estimated_missed_defect_rate: float | None = None
    recommendation: str
    reviewed_jobs: int
    completion_rate: float


class FeedbackType(StrEnum):
    CORRECT = "correct"
    FALSE_POSITIVE = "false_positive"
    WRONG_CLASS = "wrong_class"
    MISSED_DEFECT = "missed_defect"
    NOT_SURE = "not_sure"
    BAD_IMAGE = "bad_image"


class HumanFeedbackCreateRequest(BaseModel):
    feedback_type: FeedbackType
    detection_box_id: str | None = None
    corrected_class_name: str | None = Field(default=None, max_length=128)
    comment: str | None = Field(default=None, max_length=1000)


class HumanFeedbackResponse(BaseModel):
    id: str
    job_id: str
    detection_box_id: str | None = None
    reviewer_id: str | None = None
    reviewer_name: str | None = None
    reviewer_email: str | None = None
    predicted_class: str | None = None
    confidence: float | None = None
    feedback_type: FeedbackType
    corrected_class_name: str | None = None
    comment: str | None = None
    created_at: datetime


class HumanFeedbackListResponse(BaseModel):
    items: list[HumanFeedbackResponse]
