import uuid

from fastapi import (
    UploadFile,
    BackgroundTasks,
)

from app.core.job_store import jobs

from app.services.image_service import (
    ImageService,
)

from app.services.detection_pipeline_service import (
    DetectionPipelineService,
)


class UploadService:

    def __init__(self):

        self.image_service = ImageService()

        self.pipeline_service = DetectionPipelineService()

    async def upload_image(
        self,
        file: UploadFile,
        background_tasks: BackgroundTasks,
    ):

        saved_image = await self.image_service.save_image(file)

        job_id = str(uuid.uuid4())

        jobs[job_id] = {
            "status": "queued",
        }

        background_tasks.add_task(
            self.pipeline_service.process_detection,
            job_id,
            saved_image["file_path"],
            saved_image["file_url"],
        )

        return {
            "success": True,
            "job_id": job_id,
            "status": "queued",
            "message": "Detection started",
        }
