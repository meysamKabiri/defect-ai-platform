import asyncio
import logging

from app.core.database import AsyncSessionLocal
from app.core.job_store import update_job
from app.db.models.detection import DetectionJob
from app.repositories.project_repository import ProjectRepository
from app.services.detection_pipeline_service import (
    DetectionPipelineService,
)
from app.services.detection_persistence_service import DetectionPersistenceService
from app.services.event_publisher import publish_workspace_event

pipeline_service = DetectionPipelineService()
logger = logging.getLogger(__name__)


def process_detection_task(
    job_id: str,
    image_path: str,
    image_url: str,
):
    asyncio.run(_process_detection_task(job_id, image_path, image_url))


async def _process_detection_task(
    job_id: str,
    image_path: str,
    image_url: str,
):
    logger.info("Detection task started: %s", job_id)

    try:
        await _mark_job_processing(job_id)

        update_job(
            job_id,
            {
                "status": "processing",
            },
        )

        result = pipeline_service.process_detection(
            job_id,
            image_path,
            image_url,
        )
        await _save_job_result(job_id, result)
        logger.info("Detection task completed: %s", job_id)

        update_job(
            job_id,
            {
                "status": "completed",
                "result": result,
            },
        )

    except Exception as e:
        await _mark_job_failed(job_id, str(e))

        update_job(
            job_id,
            {
                "status": "failed",
                "error": str(e),
            },
        )

        raise


async def _mark_job_processing(job_id: str) -> None:
    async with AsyncSessionLocal() as db:
        persistence_service = DetectionPersistenceService(db)
        job = await persistence_service.mark_processing(job_id)
        context = await _job_event_context(
            db=db,
            service=persistence_service,
            job=job,
            status="processing",
        )
        await db.commit()
    await _publish_job_context_events(
        context,
        job_event_type="job.updated",
        batch_event_type="batch.updated",
        include_report=False,
    )


async def _save_job_result(
    job_id: str,
    result: dict,
) -> None:
    async with AsyncSessionLocal() as db:
        persistence_service = DetectionPersistenceService(db)
        job = await persistence_service.save_completed_result(
            job_id=job_id,
            result=result,
        )
        context = await _job_event_context(
            db=db,
            service=persistence_service,
            job=job,
            status="completed",
        )
        await db.commit()
    await _publish_job_context_events(
        context,
        job_event_type="job.completed",
        batch_event_type=context.get("batch_event_type") if context else None,
        include_report=True,
    )


async def _mark_job_failed(
    job_id: str,
    error_message: str,
) -> None:
    async with AsyncSessionLocal() as db:
        persistence_service = DetectionPersistenceService(db)
        job = await persistence_service.mark_failed(
            job_id=job_id,
            error_message=error_message,
        )
        context = await _job_event_context(
            db=db,
            service=persistence_service,
            job=job,
            status="failed",
        )
        await db.commit()
    await _publish_job_context_events(
        context,
        job_event_type="job.failed",
        batch_event_type=context.get("batch_event_type") if context else None,
        include_report=True,
    )


async def _job_event_context(
    *,
    db,
    service: DetectionPersistenceService,
    job: DetectionJob | None,
    status: str,
) -> dict | None:
    if job is None or job.project_id is None:
        return None

    project = await ProjectRepository(db).get_project(job.project_id)
    if project is None or project.workspace_id is None:
        return None

    context = {
        "workspace_id": project.workspace_id,
        "project_id": job.project_id,
        "batch_id": job.batch_id,
        "job_id": job.id,
        "status": status,
    }

    if job.batch_id is not None:
        batch = await service.get_batch(
            batch_id=job.batch_id,
            workspace_id=project.workspace_id,
        )
        if batch is not None:
            counts = await service.batch_status_counts(batch_id=job.batch_id)
            context["batch_event_type"] = _batch_event_type(
                total_jobs=batch.total_jobs,
                counts=counts,
            )

    return context


def _batch_event_type(
    *,
    total_jobs: int,
    counts: dict[str, int],
) -> str:
    completed = counts.get("completed", 0)
    failed = counts.get("failed", 0)
    terminal = completed + failed

    if total_jobs and terminal >= total_jobs:
        if failed >= total_jobs:
            return "batch.failed"
        return "batch.completed"

    return "batch.updated"


async def _publish_job_context_events(
    context: dict | None,
    *,
    job_event_type: str,
    batch_event_type: str | None,
    include_report: bool,
) -> None:
    if context is None:
        return

    await publish_workspace_event(
        event_type=job_event_type,
        workspace_id=context["workspace_id"],
        project_id=context["project_id"],
        batch_id=context["batch_id"],
        job_id=context["job_id"],
        status=context["status"],
    )

    if context.get("batch_id") is not None and batch_event_type is not None:
        await publish_workspace_event(
            event_type=batch_event_type,
            workspace_id=context["workspace_id"],
            project_id=context["project_id"],
            batch_id=context["batch_id"],
        )

    if include_report and context.get("batch_id") is not None:
        await publish_workspace_event(
            event_type="report.updated",
            workspace_id=context["workspace_id"],
            project_id=context["project_id"],
            batch_id=context["batch_id"],
        )
