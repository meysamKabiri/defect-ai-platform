import uuid

from fastapi import (
    UploadFile,
)

from app.core.job_store import (
    create_job,
)

from app.core.queue import queue

from app.tasks import (
    process_detection_task,
)

from app.services.image_service import (
    ImageService,
)


class UploadService:

    def __init__(self):

        self.image_service = ImageService()

    async def upload_image(
        self,
        file: UploadFile,
    ):

        saved_image = await self.image_service.save_image(file)

        job_id = str(uuid.uuid4())

        create_job(job_id)

        queue.enqueue(
            process_detection_task,
            job_id,
            saved_image["file_path"],
            saved_image["file_url"],
        )

        return {
            "success": True,
            "job_id": job_id,
            "status": "queued",
        }
