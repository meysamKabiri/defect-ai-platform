from pydantic import BaseModel


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class DetectionItem(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: BoundingBox


class UploadResponse(BaseModel):
    success: bool

    filename: str

    file_url: str

    annotated_image_url: str

    detections: list[DetectionItem]

    message: str
