from typing import Optional

from pydantic import BaseModel


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
