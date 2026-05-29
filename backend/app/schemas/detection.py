from typing import Optional
from datetime import datetime

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
