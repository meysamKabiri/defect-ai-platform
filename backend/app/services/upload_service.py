import logging
import uuid

from fastapi import UploadFile

from app.core.job_store import create_job
from app.core.queue import queue
from app.services.image_service import ImageService

logger = logging.getLogger(__name__)


class UploadService:

    def __init__(self):

        self.image_service = ImageService()

    async def upload_image(
        self,
        file: UploadFile,
    ):

        saved_image = await self.image_service.save_image(file)

        job_id = str(uuid.uuid4())

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

            raise RuntimeError(str(e))

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
