from datetime import datetime
from datetime import timezone
from typing import Any

from sqlalchemy import Select
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.detection import DetectionBox
from app.db.models.detection import DetectionJob
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
    ) -> DetectionJob:
        job = DetectionJob(
            id=job_id,
            rq_job_id=rq_job_id,
            status=status,
            original_filename=original_filename,
            image_url=image_url,
            user_id=user_id,
            project_id=project_id,
        )
        self.session.add(job)
        await self.session.flush()
        return job

    async def get_job(
        self,
        job_id: str,
        *,
        user_id: str | None = None,
        include_detections: bool = False,
    ) -> DetectionJob | None:
        statement = select(DetectionJob).where(DetectionJob.id == job_id)

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
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[DetectionJob], int]:
        statement = self._job_filter_statement(
            status=status,
            class_name=class_name,
            user_id=user_id,
            project_id=project_id,
            project_owner_id=project_owner_id,
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

    def _job_filter_statement(
        self,
        *,
        status: str | None,
        class_name: str | None,
        user_id: str | None,
        project_id: str | None,
        project_owner_id: str | None,
    ) -> Select[tuple[DetectionJob]]:
        statement = select(DetectionJob)

        if class_name is not None:
            statement = statement.join(DetectionJob.detections)

        if project_owner_id is not None:
            statement = statement.join(Project, DetectionJob.project_id == Project.id)

        if status is not None:
            statement = statement.where(DetectionJob.status == status)

        if user_id is not None:
            statement = statement.where(DetectionJob.user_id == user_id)

        if project_id is not None:
            statement = statement.where(DetectionJob.project_id == project_id)

        if project_owner_id is not None:
            statement = statement.where(Project.owner_id == project_owner_id)

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
