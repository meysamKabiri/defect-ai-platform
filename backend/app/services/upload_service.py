import logging
import uuid

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.job_store import create_job
from app.core.queue import queue
from app.services.detection_persistence_service import DetectionPersistenceService
from app.services.image_service import ImageService

logger = logging.getLogger(__name__)


class UploadService:

    def __init__(self):

        self.image_service = ImageService()

    async def upload_image(
        self,
        file: UploadFile,
        db: AsyncSession,
        user_id: str,
        project_id: str | None = None,
    ):

        saved_image = await self.image_service.save_image(file)

        job_id = str(uuid.uuid4())
        persistence_service = DetectionPersistenceService(db)

        await persistence_service.create_queued_job(
            job_id=job_id,
            original_filename=file.filename,
            image_url=saved_image["file_url"],
            user_id=user_id,
            project_id=project_id,
        )
        await db.commit()

        try:

            rq_job = queue.enqueue(
                "app.tasks.process_detection_task",
                job_id,
                saved_image["file_path"],
                saved_image["file_url"],
                job_timeout=600,
                failure_ttl=86400,
                result_ttl=86400,
            )

        except Exception as e:

            logger.exception("Failed to enqueue detection job")
            await persistence_service.mark_failed(
                job_id=job_id,
                error_message=str(e),
            )
            await db.commit()

            raise RuntimeError(str(e))

        await persistence_service.attach_rq_job(
            job_id=job_id,
            rq_job_id=rq_job.id,
        )
        await db.commit()

        create_job(
            job_id,
            rq_job_id=rq_job.id,
        )

        logger.info(f"Detection job queued: {job_id}")

        return {
            "success": True,
            "job_id": job_id,
            "status": "queued",
            "message": "Detection job queued",
        }
