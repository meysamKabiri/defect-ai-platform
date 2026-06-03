from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import HTTPException
from fastapi import Query
from fastapi import Request
from fastapi import UploadFile
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.roles import require_authenticated
from app.core.database import get_db_session
from app.core.workspace_roles import WorkspaceRole
from app.db.models.detection import DetectionJob
from app.db.models.detection import InspectionBatch
from app.db.models.user import User
from app.repositories.project_repository import ProjectRepository
from app.schemas.detection import BatchCreateRequest
from app.schemas.detection import BatchListResponse
from app.schemas.detection import BatchProgressResponse
from app.schemas.detection import BatchResponse
from app.schemas.detection import BatchUploadResponse
from app.schemas.detection import DetectionBoxResponse
from app.schemas.detection import PersistedDetectionJobResponse
from app.services.detection_persistence_service import DetectionPersistenceService
from app.services.upload_service import UploadService
from app.services.workspace_service import WorkspaceService

router = APIRouter(tags=["Batches"])

upload_service = UploadService()


@router.post(
    "/workspaces/{workspace_id}/batches",
    response_model=BatchResponse | BatchUploadResponse,
    status_code=201,
)
async def create_or_upload_batch(
    workspace_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
        roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.ENGINEER},
    )
    content_type = request.headers.get("content-type", "").lower()
    if "multipart/form-data" in content_type:
        form = await request.form()
        files = [file for file in form.getlist("files") if hasattr(file, "filename")]
        project_id = form.get("project_id")
        if not isinstance(project_id, str) or not project_id:
            raise HTTPException(status_code=400, detail="project_id is required")
        await _ensure_project_in_workspace(
            db=db,
            workspace_id=workspace_id,
            project_id=project_id,
        )

        try:
            return await upload_service.upload_batch(
                files=files,
                db=db,
                user_id=current_user.id,
                workspace_id=workspace_id,
                project_id=project_id,
                name=_form_text(form.get("name")),
                description=_form_text(form.get("description")),
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        payload = BatchCreateRequest.model_validate(await request.json())
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
    await _ensure_project_in_workspace(
        db=db,
        workspace_id=workspace_id,
        project_id=payload.project_id,
    )
    created_batch = await upload_service.create_batch(
        db=db,
        user_id=current_user.id,
        workspace_id=workspace_id,
        project_id=payload.project_id,
        name=payload.name,
        description=payload.description,
    )
    service = DetectionPersistenceService(db)
    batch = await service.get_batch(
        batch_id=created_batch.id,
        workspace_id=workspace_id,
    )
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return await _serialize_batch(service=service, batch=batch, include_jobs=False)


@router.post(
    "/workspaces/{workspace_id}/batches/{batch_id}/images",
    response_model=BatchUploadResponse,
    status_code=201,
)
async def add_batch_images(
    workspace_id: str,
    batch_id: str,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
        roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.ENGINEER},
    )
    service = DetectionPersistenceService(db)
    batch = await service.get_batch(batch_id=batch_id, workspace_id=workspace_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.project_id is None:
        raise HTTPException(status_code=400, detail="Batch is not linked to a project")
    await _ensure_project_in_workspace(
        db=db,
        workspace_id=workspace_id,
        project_id=batch.project_id,
    )

    try:
        jobs = await upload_service.add_images_to_batch(
            files=files,
            db=db,
            user_id=current_user.id,
            workspace_id=workspace_id,
            project_id=batch.project_id,
            batch_id=batch_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    batch = await service.get_batch(batch_id=batch_id, workspace_id=workspace_id)
    return {
        "id": batch.id,
        "workspace_id": batch.workspace_id,
        "project_id": batch.project_id,
        "name": batch.name,
        "description": batch.description,
        "status": batch.status,
        "total_jobs": batch.total_jobs,
        "jobs": jobs,
    }


@router.get(
    "/workspaces/{workspace_id}/batches",
    response_model=BatchListResponse,
)
async def list_batches(
    workspace_id: str,
    project_id: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
    )
    if project_id is not None:
        await _ensure_project_in_workspace(
            db=db,
            workspace_id=workspace_id,
            project_id=project_id,
        )

    service = DetectionPersistenceService(db)
    batches, total = await service.list_batches(
        workspace_id=workspace_id,
        project_id=project_id,
        limit=limit,
        offset=offset,
    )
    return {
        "items": [
            await _serialize_batch(service=service, batch=batch, include_jobs=False)
            for batch in batches
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get(
    "/workspaces/{workspace_id}/batches/{batch_id}",
    response_model=BatchResponse,
)
async def get_batch(
    workspace_id: str,
    batch_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
    )
    service = DetectionPersistenceService(db)
    batch = await service.get_batch(
        batch_id=batch_id,
        workspace_id=workspace_id,
        include_jobs=True,
    )
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return await _serialize_batch(service=service, batch=batch, include_jobs=True)


@router.get(
    "/workspaces/{workspace_id}/batches/{batch_id}/progress",
    response_model=BatchProgressResponse,
)
async def get_batch_progress(
    workspace_id: str,
    batch_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
    )
    service = DetectionPersistenceService(db)
    batch = await service.get_batch(
        batch_id=batch_id,
        workspace_id=workspace_id,
    )
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return await _batch_progress(service=service, batch=batch)


async def _ensure_project_in_workspace(
    *,
    db: AsyncSession,
    workspace_id: str,
    project_id: str,
) -> None:
    project = await ProjectRepository(db).get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.workspace_id != workspace_id:
        raise HTTPException(status_code=403, detail="Project is not in this workspace")
    if not project.is_active:
        raise HTTPException(status_code=400, detail="Project is not active")


def _form_text(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    return value or None


async def _serialize_batch(
    *,
    service: DetectionPersistenceService,
    batch: InspectionBatch,
    include_jobs: bool,
) -> BatchResponse:
    progress = await _batch_progress(service=service, batch=batch)
    return BatchResponse(
        id=batch.id,
        workspace_id=batch.workspace_id,
        workspace_name=batch.workspace.name if batch.workspace else None,
        project_id=batch.project_id,
        project_name=batch.project.name if batch.project else None,
        name=batch.name,
        description=batch.description,
        uploaded_by_name=batch.created_by.full_name if batch.created_by else None,
        uploaded_by_email=batch.created_by.email if batch.created_by else None,
        status=progress.status,
        total_jobs=batch.total_jobs,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        completed_at=batch.completed_at,
        progress=progress,
        jobs=(
            [_serialize_job(job) for job in sorted(batch.jobs, key=lambda item: item.created_at, reverse=True)]
            if include_jobs
            else []
        ),
    )


async def _batch_progress(
    *,
    service: DetectionPersistenceService,
    batch: InspectionBatch,
) -> BatchProgressResponse:
    counts = await service.batch_status_counts(batch_id=batch.id)
    queued = counts.get("queued", 0)
    processing = counts.get("processing", 0)
    completed = counts.get("completed", 0)
    failed = counts.get("failed", 0)
    total = batch.total_jobs or sum(counts.values())
    terminal = completed + failed

    if total and terminal >= total:
        status = "completed"
    elif processing:
        status = "processing"
    elif queued:
        status = "queued"
    elif failed:
        status = "failed"
    else:
        status = batch.status

    return BatchProgressResponse(
        batch_id=batch.id,
        total_jobs=total,
        queued=queued,
        processing=processing,
        completed=completed,
        failed=failed,
        status=status,
        completion_rate=(terminal / total) if total else 0,
    )


def _serialize_job(job: DetectionJob) -> PersistedDetectionJobResponse:
    return PersistedDetectionJobResponse(
        job_id=job.id,
        rq_job_id=job.rq_job_id,
        status=job.status,
        project_id=job.project_id,
        batch_id=job.batch_id,
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
            DetectionBoxResponse(
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
            for detection in job.detections
        ],
    )
