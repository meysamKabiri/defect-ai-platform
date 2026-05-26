from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.detection import DetectionJob
from app.repositories import DetectionRepository


class DetectionPersistenceService:
    def __init__(self, session: AsyncSession):
        self.repository = DetectionRepository(session)

    async def create_queued_job(
        self,
        *,
        job_id: str,
        original_filename: str | None,
        image_url: str | None,
        rq_job_id: str | None = None,
    ) -> DetectionJob:
        return await self.repository.create_job(
            job_id=job_id,
            status="queued",
            original_filename=original_filename,
            image_url=image_url,
            rq_job_id=rq_job_id,
        )

    async def attach_rq_job(
        self,
        *,
        job_id: str,
        rq_job_id: str,
    ) -> DetectionJob | None:
        return await self.repository.set_rq_job_id(
            job_id=job_id,
            rq_job_id=rq_job_id,
        )

    async def mark_processing(
        self,
        job_id: str,
    ) -> DetectionJob | None:
        return await self.repository.mark_processing(job_id)

    async def save_completed_result(
        self,
        *,
        job_id: str,
        result: dict[str, Any],
    ) -> DetectionJob | None:
        return await self.repository.mark_completed(
            job_id=job_id,
            annotated_image_url=result.get("annotated_image_url"),
            processing_time_seconds=result.get("processing_time_seconds"),
            detections=result.get("detections", []),
        )

    async def mark_failed(
        self,
        *,
        job_id: str,
        error_message: str,
    ) -> DetectionJob | None:
        return await self.repository.mark_failed(
            job_id=job_id,
            error_message=error_message,
        )

    async def get_job(
        self,
        job_id: str,
    ) -> DetectionJob | None:
        return await self.repository.get_job(
            job_id,
            include_detections=True,
        )

    async def list_jobs(
        self,
        *,
        status: str | None,
        class_name: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[DetectionJob], int]:
        return await self.repository.list_jobs(
            status=status,
            class_name=class_name,
            limit=limit,
            offset=offset,
        )
