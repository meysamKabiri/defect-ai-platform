from fastapi import (
    APIRouter,
    Depends,
    File,
    UploadFile,
    HTTPException,
    Query,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.dependencies import get_current_user
from app.db.models.detection import DetectionBox
from app.db.models.detection import DetectionJob
from app.db.models.user import User
from app.schemas.detection import DetectionBoxResponse
from app.schemas.detection import DetectionJobListResponse
from app.schemas.detection import PersistedDetectionJobResponse
from app.services.detection_persistence_service import DetectionPersistenceService
from app.services.upload_service import UploadService

router = APIRouter(
    prefix="/detect",
    tags=["Detection"],
)

upload_service = UploadService()


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):

    try:

        return await upload_service.upload_image(
            file=file,
            db=db,
            user_id=current_user.id,
        )

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/jobs/{job_id}")
async def get_detection_job(
    job_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    persistence_service = DetectionPersistenceService(db)
    job = await persistence_service.get_job(
        job_id,
        user_id=current_user.id,
    )

    if job is None:

        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    return _serialize_job(job)


@router.get(
    "/jobs",
    response_model=DetectionJobListResponse,
)
async def list_detection_jobs(
    status: str | None = None,
    class_name: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    persistence_service = DetectionPersistenceService(db)
    jobs, total = await persistence_service.list_jobs(
        status=status,
        class_name=class_name,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )

    return {
        "items": [_serialize_job(job) for job in jobs],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def _serialize_job(
    job: DetectionJob,
) -> PersistedDetectionJobResponse:
    return PersistedDetectionJobResponse(
        job_id=job.id,
        rq_job_id=job.rq_job_id,
        status=job.status,
        original_filename=job.original_filename,
        image_url=job.image_url,
        annotated_image_url=job.annotated_image_url,
        processing_time_seconds=job.processing_time_seconds,
        detection_count=job.detection_count,
        error=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        detections=[
            _serialize_detection_box(detection)
            for detection in job.detections
        ],
    )


def _serialize_detection_box(
    detection: DetectionBox,
) -> DetectionBoxResponse:
    return DetectionBoxResponse(
        id=detection.id,
        class_id=detection.class_id,
        class_name=detection.class_name,
        label=detection.label,
        severity=detection.severity,
        confidence=detection.confidence,
        x1=detection.x1,
        y1=detection.y1,
        x2=detection.x2,
        y2=detection.y2,
        x=detection.x,
        y=detection.y,
        width=detection.width,
        height=detection.height,
    )
