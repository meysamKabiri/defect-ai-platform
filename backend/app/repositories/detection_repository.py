from datetime import datetime
from datetime import timezone
from typing import Any

from sqlalchemy import Select
from sqlalchemy import distinct
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.detection import DetectionBox
from app.db.models.detection import DetectionJob
from app.db.models.detection import HumanFeedback
from app.db.models.detection import InspectionBatch
from app.db.models.project import Project


class DetectionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_job(
        self,
        *,
        job_id: str,
        status: str,
        original_filename: str | None,
        image_url: str | None,
        rq_job_id: str | None = None,
        user_id: str | None = None,
        project_id: str | None = None,
        batch_id: str | None = None,
    ) -> DetectionJob:
        job = DetectionJob(
            id=job_id,
            rq_job_id=rq_job_id,
            status=status,
            original_filename=original_filename,
            image_url=image_url,
            user_id=user_id,
            project_id=project_id,
            batch_id=batch_id,
        )
        self.session.add(job)
        await self.session.flush()
        return job

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
        batch = InspectionBatch(
            workspace_id=workspace_id,
            project_id=project_id,
            created_by_user_id=created_by_user_id,
            name=name,
            description=description,
            status="queued",
            total_jobs=total_jobs,
        )
        self.session.add(batch)
        await self.session.flush()
        return batch

    async def get_batch(
        self,
        *,
        batch_id: str,
        workspace_id: str,
        include_jobs: bool = False,
    ) -> InspectionBatch | None:
        statement = select(InspectionBatch).where(
            InspectionBatch.id == batch_id,
            InspectionBatch.workspace_id == workspace_id,
        ).options(
            selectinload(InspectionBatch.workspace),
            selectinload(InspectionBatch.project),
            selectinload(InspectionBatch.created_by),
        )
        if include_jobs:
            statement = statement.options(
                selectinload(InspectionBatch.jobs).selectinload(DetectionJob.detections),
                selectinload(InspectionBatch.jobs)
                .selectinload(DetectionJob.feedback)
                .selectinload(HumanFeedback.reviewer),
                selectinload(InspectionBatch.jobs)
                .selectinload(DetectionJob.feedback)
                .selectinload(HumanFeedback.detection_box),
                selectinload(InspectionBatch.jobs).selectinload(DetectionJob.user),
            )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_batches(
        self,
        *,
        workspace_id: str,
        project_id: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[InspectionBatch], int]:
        statement = (
            select(InspectionBatch)
            .where(InspectionBatch.workspace_id == workspace_id)
            .options(
                selectinload(InspectionBatch.workspace),
                selectinload(InspectionBatch.project),
                selectinload(InspectionBatch.created_by),
            )
        )
        if project_id is not None:
            statement = statement.where(InspectionBatch.project_id == project_id)

        count_statement = select(func.count()).select_from(statement.subquery())
        total_result = await self.session.execute(count_statement)
        total = total_result.scalar_one()

        page_statement = (
            statement.order_by(InspectionBatch.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        page_result = await self.session.execute(page_statement)
        return list(page_result.scalars()), total

    async def batch_status_counts(self, *, batch_id: str) -> dict[str, int]:
        statement = (
            select(DetectionJob.status, func.count(DetectionJob.id))
            .where(DetectionJob.batch_id == batch_id)
            .group_by(DetectionJob.status)
        )
        result = await self.session.execute(statement)
        return {status: count for status, count in result.all()}

    async def batch_class_counts(self, *, batch_id: str) -> list[tuple[str, int]]:
        statement = (
            select(DetectionBox.class_name, func.count(DetectionBox.id))
            .join(DetectionJob, DetectionBox.job_id == DetectionJob.id)
            .where(DetectionJob.batch_id == batch_id)
            .group_by(DetectionBox.class_name)
            .order_by(func.count(DetectionBox.id).desc())
        )
        result = await self.session.execute(statement)
        return [(class_name, count) for class_name, count in result.all()]

    async def batch_feedback_counts(self, *, batch_id: str) -> list[tuple[str, int]]:
        statement = (
            select(HumanFeedback.feedback_type, func.count(HumanFeedback.id))
            .join(DetectionJob, HumanFeedback.job_id == DetectionJob.id)
            .where(DetectionJob.batch_id == batch_id)
            .group_by(HumanFeedback.feedback_type)
            .order_by(func.count(HumanFeedback.id).desc())
        )
        result = await self.session.execute(statement)
        return [(feedback_type, count) for feedback_type, count in result.all()]

    async def batch_detection_totals(self, *, batch_id: str) -> tuple[int, float | None]:
        statement = (
            select(func.count(DetectionBox.id), func.avg(DetectionBox.confidence))
            .join(DetectionJob, DetectionBox.job_id == DetectionJob.id)
            .where(DetectionJob.batch_id == batch_id)
        )
        result = await self.session.execute(statement)
        count, average_confidence = result.one()
        return count, average_confidence

    async def batch_reviewed_jobs_count(self, *, batch_id: str) -> int:
        statement = (
            select(func.count(distinct(HumanFeedback.job_id)))
            .join(DetectionJob, HumanFeedback.job_id == DetectionJob.id)
            .where(DetectionJob.batch_id == batch_id)
        )
        result = await self.session.execute(statement)
        return result.scalar_one()

    async def get_job(
        self,
        job_id: str,
        *,
        user_id: str | None = None,
        workspace_id: str | None = None,
        include_detections: bool = False,
    ) -> DetectionJob | None:
        statement = select(DetectionJob).where(DetectionJob.id == job_id)

        if workspace_id is not None:
            statement = statement.join(Project, DetectionJob.project_id == Project.id).where(
                Project.workspace_id == workspace_id,
            )

        if user_id is not None:
            statement = statement.where(DetectionJob.user_id == user_id)

        if include_detections:
            statement = statement.options(selectinload(DetectionJob.detections))

        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_jobs(
        self,
        *,
        status: str | None = None,
        class_name: str | None = None,
        user_id: str | None = None,
        project_id: str | None = None,
        project_owner_id: str | None = None,
        workspace_id: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[DetectionJob], int]:
        statement = self._job_filter_statement(
            status=status,
            class_name=class_name,
            user_id=user_id,
            project_id=project_id,
            project_owner_id=project_owner_id,
            workspace_id=workspace_id,
        )
        count_statement = select(func.count()).select_from(statement.subquery())

        total_result = await self.session.execute(count_statement)
        total = total_result.scalar_one()

        page_statement = (
            statement.options(selectinload(DetectionJob.detections))
            .order_by(DetectionJob.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        page_result = await self.session.execute(page_statement)
        return list(page_result.scalars().unique()), total

    async def set_rq_job_id(
        self,
        *,
        job_id: str,
        rq_job_id: str,
    ) -> DetectionJob | None:
        job = await self.get_job(job_id)

        if job is None:
            return None

        job.rq_job_id = rq_job_id
        await self.session.flush()
        return job

    async def mark_processing(
        self,
        job_id: str,
    ) -> DetectionJob | None:
        job = await self.get_job(job_id)

        if job is None:
            return None

        job.status = "processing"
        job.started_at = datetime.now(timezone.utc)
        await self.session.flush()
        return job

    async def mark_completed(
        self,
        *,
        job_id: str,
        annotated_image_url: str | None,
        processing_time_seconds: float | None,
        detections: list[dict[str, Any]],
    ) -> DetectionJob | None:
        job = await self.get_job(job_id, include_detections=True)

        if job is None:
            return None

        job.status = "completed"
        job.annotated_image_url = annotated_image_url
        job.processing_time_seconds = processing_time_seconds
        job.detection_count = len(detections)
        job.completed_at = datetime.now(timezone.utc)
        job.error_message = None
        job.detections = [
            self._build_detection_box(job_id=job_id, payload=detection)
            for detection in detections
        ]
        await self.session.flush()
        return job

    async def mark_failed(
        self,
        *,
        job_id: str,
        error_message: str,
    ) -> DetectionJob | None:
        job = await self.get_job(job_id)

        if job is None:
            return None

        job.status = "failed"
        job.error_message = error_message
        job.completed_at = datetime.now(timezone.utc)
        await self.session.flush()
        return job

    async def delete_job(
        self,
        job_id: str,
    ) -> bool:
        job = await self.get_job(job_id)

        if job is None:
            return False

        await self.session.delete(job)
        await self.session.flush()
        return True

    async def detection_box_belongs_to_job(
        self,
        *,
        detection_box_id: str,
        job_id: str,
    ) -> bool:
        statement = select(DetectionBox.id).where(
            DetectionBox.id == detection_box_id,
            DetectionBox.job_id == job_id,
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none() is not None

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
        feedback = HumanFeedback(
            job_id=job_id,
            detection_box_id=detection_box_id,
            reviewer_id=reviewer_id,
            feedback_type=feedback_type,
            corrected_class_name=corrected_class_name,
            comment=comment,
        )
        self.session.add(feedback)
        await self.session.flush()
        return feedback

    async def get_feedback(self, *, feedback_id: str) -> HumanFeedback | None:
        statement = (
            select(HumanFeedback)
            .options(
                selectinload(HumanFeedback.reviewer),
                selectinload(HumanFeedback.detection_box),
                selectinload(HumanFeedback.job),
            )
            .where(HumanFeedback.id == feedback_id)
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_feedback(
        self,
        *,
        job_id: str,
    ) -> list[HumanFeedback]:
        statement = (
            select(HumanFeedback)
            .options(
                selectinload(HumanFeedback.reviewer),
                selectinload(HumanFeedback.detection_box),
                selectinload(HumanFeedback.job),
            )
            .where(HumanFeedback.job_id == job_id)
            .order_by(HumanFeedback.created_at.desc())
        )
        result = await self.session.execute(statement)
        return list(result.scalars())

    async def list_batch_feedback(self, *, batch_id: str) -> list[HumanFeedback]:
        statement = (
            select(HumanFeedback)
            .join(DetectionJob, HumanFeedback.job_id == DetectionJob.id)
            .options(
                selectinload(HumanFeedback.reviewer),
                selectinload(HumanFeedback.detection_box),
                selectinload(HumanFeedback.job),
            )
            .where(DetectionJob.batch_id == batch_id)
            .order_by(HumanFeedback.created_at.desc())
        )
        result = await self.session.execute(statement)
        return list(result.scalars())

    def _job_filter_statement(
        self,
        *,
        status: str | None,
        class_name: str | None,
        user_id: str | None,
        project_id: str | None,
        project_owner_id: str | None,
        workspace_id: str | None,
    ) -> Select[tuple[DetectionJob]]:
        statement = select(DetectionJob)

        if class_name is not None:
            statement = statement.join(DetectionJob.detections)

        if project_owner_id is not None or workspace_id is not None:
            statement = statement.join(Project, DetectionJob.project_id == Project.id)

        if status is not None:
            statement = statement.where(DetectionJob.status == status)

        if user_id is not None:
            statement = statement.where(DetectionJob.user_id == user_id)

        if project_id is not None:
            statement = statement.where(DetectionJob.project_id == project_id)

        if project_owner_id is not None:
            statement = statement.where(Project.owner_id == project_owner_id)

        if workspace_id is not None:
            statement = statement.where(Project.workspace_id == workspace_id)

        if class_name is not None:
            statement = statement.where(DetectionBox.class_name == class_name)

        return statement.distinct()

    def _build_detection_box(
        self,
        *,
        job_id: str,
        payload: dict[str, Any],
    ) -> DetectionBox:
        bbox = payload.get("bbox") or {}
        detection_box = DetectionBox(
            job_id=job_id,
            class_id=payload["class_id"],
            class_name=payload["class_name"],
            label=payload.get("label"),
            severity=payload.get("severity"),
            confidence=payload["confidence"],
            x1=bbox.get("x1", payload.get("x")),
            y1=bbox.get("y1", payload.get("y")),
            x2=bbox.get("x2", payload.get("x", 0) + payload.get("width", 0)),
            y2=bbox.get("y2", payload.get("y", 0) + payload.get("height", 0)),
            x=payload["x"],
            y=payload["y"],
            width=payload["width"],
            height=payload["height"],
        )

        if payload.get("id") is not None:
            detection_box.id = payload["id"]

        return detection_box
