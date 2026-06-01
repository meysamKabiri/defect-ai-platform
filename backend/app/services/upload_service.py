import logging
import uuid

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.job_store import create_job
from app.core.queue import queue
from app.services.detection_persistence_service import DetectionPersistenceService
from app.services.event_publisher import publish_workspace_event
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
        batch_id: str | None = None,
        workspace_id: str | None = None,
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
            batch_id=batch_id,
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
            if workspace_id is not None:
                await publish_workspace_event(
                    event_type="job.failed",
                    workspace_id=workspace_id,
                    project_id=project_id,
                    batch_id=batch_id,
                    job_id=job_id,
                    status="failed",
                )

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
        if workspace_id is not None:
            await publish_workspace_event(
                event_type="job.created",
                workspace_id=workspace_id,
                project_id=project_id,
                batch_id=batch_id,
                job_id=job_id,
                status="queued",
            )

        return {
            "success": True,
            "job_id": job_id,
            "status": "queued",
            "message": "Detection job queued",
        }

    async def upload_batch(
        self,
        *,
        files: list[UploadFile],
        db: AsyncSession,
        user_id: str,
        workspace_id: str,
        project_id: str,
        name: str | None = None,
        description: str | None = None,
    ):
        if not files:
            raise ValueError("At least one image is required")
        for file in files:
            self.image_service.validate_extension(file.filename)

        persistence_service = DetectionPersistenceService(db)
        batch = await persistence_service.create_batch(
            workspace_id=workspace_id,
            project_id=project_id,
            created_by_user_id=user_id,
            name=name,
            description=description,
            total_jobs=len(files),
        )
        await db.commit()
        await db.refresh(batch)
        await publish_workspace_event(
            event_type="batch.created",
            workspace_id=workspace_id,
            project_id=project_id,
            batch_id=batch.id,
            status=batch.status,
        )

        jobs = []
        for file in files:
            response = await self.upload_image(
                file=file,
                db=db,
                user_id=user_id,
                project_id=project_id,
                batch_id=batch.id,
                workspace_id=workspace_id,
            )
            jobs.append(
                {
                    "job_id": response["job_id"],
                    "status": response["status"],
                    "original_filename": file.filename,
                }
            )

        await publish_workspace_event(
            event_type="batch.updated",
            workspace_id=workspace_id,
            project_id=project_id,
            batch_id=batch.id,
            status=batch.status,
        )

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
