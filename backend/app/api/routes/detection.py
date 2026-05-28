from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status as http_status,
)
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.roles import require_job_access
from app.api.dependencies.roles import require_permissions
from app.core.config import settings
from app.core.database import get_db_session
from app.core.permissions import Permission
from app.core.permissions import has_permission
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
    current_user: User = Depends(require_permissions(Permission.JOB_CREATE)),
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
    job: DetectionJob = Depends(require_job_access(Permission.JOB_READ)),
):
    return _serialize_job(job)


@router.get("/jobs/{job_id}/image/original")
async def get_original_job_image(
    job: DetectionJob = Depends(require_job_access(Permission.JOB_READ)),
):
    return _job_file_response(
        stored_url=job.image_url,
        storage_root=settings.upload_path,
    )


@router.get("/jobs/{job_id}/image/annotated")
async def get_annotated_job_image(
    job: DetectionJob = Depends(require_job_access(Permission.JOB_READ)),
):
    return _job_file_response(
        stored_url=job.annotated_image_url,
        storage_root=settings.output_path,
    )


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
    current_user: User = Depends(require_permissions(Permission.JOB_READ)),
):
    persistence_service = DetectionPersistenceService(db)
    user_id = (
        None
        if has_permission(current_user, Permission.JOB_READ_ALL)
        else current_user.id
    )
    jobs, total = await persistence_service.list_jobs(
        status=status,
        class_name=class_name,
        user_id=user_id,
        limit=limit,
        offset=offset,
    )

    return {
        "items": [_serialize_job(job) for job in jobs],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.delete(
    "/jobs/{job_id}",
    status_code=http_status.HTTP_204_NO_CONTENT,
)
async def delete_detection_job(
    response: Response,
    db: AsyncSession = Depends(get_db_session),
    job: DetectionJob = Depends(require_job_access(Permission.JOB_DELETE)),
):
    persistence_service = DetectionPersistenceService(db)
    deleted = await persistence_service.delete_job(job.id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    await db.commit()
    response.status_code = http_status.HTTP_204_NO_CONTENT
    return None


def _serialize_job(
    job: DetectionJob,
) -> PersistedDetectionJobResponse:
    return PersistedDetectionJobResponse(
        job_id=job.id,
        rq_job_id=job.rq_job_id,
        status=job.status,
        original_filename=job.original_filename,
        image_url=f"/api/v1/detect/jobs/{job.id}/image/original"
        if job.image_url
        else None,
        annotated_image_url=f"/api/v1/detect/jobs/{job.id}/image/annotated"
        if job.annotated_image_url
        else None,
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


def _job_file_response(
    *,
    stored_url: str | None,
    storage_root: Path,
) -> FileResponse:
    if not stored_url:
        raise HTTPException(
            status_code=404,
            detail="Job image not found",
        )

    file_path = storage_root / stored_url.rsplit("/", 1)[-1]
    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Job image not found",
        )

    return FileResponse(file_path)


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
