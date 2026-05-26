import asyncio
import logging

from app.core.database import AsyncSessionLocal
from app.core.job_store import update_job
from app.services.detection_pipeline_service import (
    DetectionPipelineService,
)
from app.services.detection_persistence_service import DetectionPersistenceService

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
        await persistence_service.mark_processing(job_id)
        await db.commit()


async def _save_job_result(
    job_id: str,
    result: dict,
) -> None:
    async with AsyncSessionLocal() as db:
        persistence_service = DetectionPersistenceService(db)
        await persistence_service.save_completed_result(
            job_id=job_id,
            result=result,
        )
        await db.commit()


async def _mark_job_failed(
    job_id: str,
    error_message: str,
) -> None:
    async with AsyncSessionLocal() as db:
        persistence_service = DetectionPersistenceService(db)
        await persistence_service.mark_failed(
            job_id=job_id,
            error_message=error_message,
        )
        await db.commit()
