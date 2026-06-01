from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.detection import DetectionJob
from app.db.models.detection import HumanFeedback
from app.db.models.detection import InspectionBatch
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
        user_id: str,
        project_id: str | None = None,
        batch_id: str | None = None,
        rq_job_id: str | None = None,
    ) -> DetectionJob:
        return await self.repository.create_job(
            job_id=job_id,
            status="queued",
            original_filename=original_filename,
            image_url=image_url,
            user_id=user_id,
            project_id=project_id,
            batch_id=batch_id,
            rq_job_id=rq_job_id,
        )

    async def create_batch(
        self,
        *,
        workspace_id: str,
        project_id: str | None,
        created_by_user_id: str | None,
        name: str | None,
        description: str | None,
        total_jobs: int,
    ) -> InspectionBatch:
        return await self.repository.create_batch(
            workspace_id=workspace_id,
            project_id=project_id,
            created_by_user_id=created_by_user_id,
            name=name,
            description=description,
            total_jobs=total_jobs,
        )

    async def get_batch(
        self,
        *,
        batch_id: str,
        workspace_id: str,
        include_jobs: bool = False,
    ) -> InspectionBatch | None:
        return await self.repository.get_batch(
            batch_id=batch_id,
            workspace_id=workspace_id,
            include_jobs=include_jobs,
        )

    async def list_batches(
        self,
        *,
        workspace_id: str,
        project_id: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[InspectionBatch], int]:
        return await self.repository.list_batches(
            workspace_id=workspace_id,
            project_id=project_id,
            limit=limit,
            offset=offset,
        )

    async def batch_status_counts(self, *, batch_id: str) -> dict[str, int]:
        return await self.repository.batch_status_counts(batch_id=batch_id)

    async def batch_class_counts(self, *, batch_id: str) -> list[tuple[str, int]]:
        return await self.repository.batch_class_counts(batch_id=batch_id)

    async def batch_feedback_counts(self, *, batch_id: str) -> list[tuple[str, int]]:
        return await self.repository.batch_feedback_counts(batch_id=batch_id)

    async def batch_detection_totals(self, *, batch_id: str) -> tuple[int, float | None]:
        return await self.repository.batch_detection_totals(batch_id=batch_id)

    async def batch_reviewed_jobs_count(self, *, batch_id: str) -> int:
        return await self.repository.batch_reviewed_jobs_count(batch_id=batch_id)

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
        *,
        user_id: str | None = None,
        workspace_id: str | None = None,
    ) -> DetectionJob | None:
        return await self.repository.get_job(
            job_id,
            user_id=user_id,
            workspace_id=workspace_id,
            include_detections=True,
        )

    async def list_jobs(
        self,
        *,
        status: str | None,
        class_name: str | None,
        user_id: str | None,
        limit: int,
        offset: int,
        project_id: str | None = None,
        project_owner_id: str | None = None,
        workspace_id: str | None = None,
    ) -> tuple[list[DetectionJob], int]:
        return await self.repository.list_jobs(
            status=status,
            class_name=class_name,
            user_id=user_id,
            project_id=project_id,
            project_owner_id=project_owner_id,
            workspace_id=workspace_id,
            limit=limit,
            offset=offset,
        )

    async def delete_job(
        self,
        job_id: str,
    ) -> bool:
        return await self.repository.delete_job(job_id)

    async def detection_box_belongs_to_job(
        self,
        *,
        detection_box_id: str,
        job_id: str,
    ) -> bool:
        return await self.repository.detection_box_belongs_to_job(
            detection_box_id=detection_box_id,
            job_id=job_id,
        )

    async def create_feedback(
        self,
        *,
        job_id: str,
        feedback_type: str,
        reviewer_id: str | None,
        detection_box_id: str | None = None,
        corrected_class_name: str | None = None,
        comment: str | None = None,
    ) -> HumanFeedback:
        return await self.repository.create_feedback(
            job_id=job_id,
            feedback_type=feedback_type,
            reviewer_id=reviewer_id,
            detection_box_id=detection_box_id,
            corrected_class_name=corrected_class_name,
            comment=comment,
        )

    async def get_feedback(self, *, feedback_id: str) -> HumanFeedback | None:
        return await self.repository.get_feedback(feedback_id=feedback_id)

    async def list_feedback(
        self,
        *,
        job_id: str,
    ) -> list[HumanFeedback]:
        return await self.repository.list_feedback(job_id=job_id)

    async def list_batch_feedback(
        self,
        *,
        batch_id: str,
    ) -> list[HumanFeedback]:
        return await self.repository.list_batch_feedback(batch_id=batch_id)
