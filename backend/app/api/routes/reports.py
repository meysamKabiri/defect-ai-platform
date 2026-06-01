import csv
from io import StringIO

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.roles import require_authenticated
from app.core.database import get_db_session
from app.db.models.detection import DetectionJob
from app.db.models.detection import DetectionBox
from app.db.models.detection import HumanFeedback
from app.db.models.detection import InspectionBatch
from app.db.models.user import User
from app.schemas.detection import BatchFeedbackListResponse
from app.schemas.detection import BatchFeedbackResponse
from app.schemas.detection import BatchReportSummaryResponse
from app.services.detection_persistence_service import DetectionPersistenceService
from app.services.workspace_service import WorkspaceService

router = APIRouter(tags=["Reports"])


@router.get(
    "/workspaces/{workspace_id}/reports/batches/{batch_id}/summary",
    response_model=BatchReportSummaryResponse,
)
async def get_batch_report_summary(
    workspace_id: str,
    batch_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
    )
    service = DetectionPersistenceService(db)
    batch = await _get_batch_or_404(
        service=service,
        workspace_id=workspace_id,
        batch_id=batch_id,
        include_jobs=True,
    )
    return await _build_summary(service=service, batch=batch)


@router.get(
    "/workspaces/{workspace_id}/projects/{project_id}/batches/{batch_id}/report",
    response_model=BatchReportSummaryResponse,
)
async def get_project_batch_report(
    workspace_id: str,
    project_id: str,
    batch_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
    )
    service = DetectionPersistenceService(db)
    batch = await _get_batch_or_404(
        service=service,
        workspace_id=workspace_id,
        batch_id=batch_id,
        include_jobs=True,
    )
    _ensure_batch_project(batch=batch, project_id=project_id)
    return await _build_summary(service=service, batch=batch)


@router.get(
    "/workspaces/{workspace_id}/projects/{project_id}/batches/{batch_id}/feedback",
    response_model=BatchFeedbackListResponse,
)
async def list_project_batch_feedback(
    workspace_id: str,
    project_id: str,
    batch_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
    )
    service = DetectionPersistenceService(db)
    batch = await _get_batch_or_404(
        service=service,
        workspace_id=workspace_id,
        batch_id=batch_id,
    )
    _ensure_batch_project(batch=batch, project_id=project_id)
    feedback_items = await service.list_batch_feedback(batch_id=batch.id)
    return {"items": [_serialize_batch_feedback(item) for item in feedback_items]}


@router.get("/workspaces/{workspace_id}/reports/batches/{batch_id}.csv")
async def export_batch_report_csv(
    workspace_id: str,
    batch_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
    )
    service = DetectionPersistenceService(db)
    batch = await _get_batch_or_404(
        service=service,
        workspace_id=workspace_id,
        batch_id=batch_id,
        include_jobs=True,
    )
    csv_body = await _build_csv(service=service, batch=batch)
    filename = f"defectai-batch-{batch.id}.csv"
    return StreamingResponse(
        iter([csv_body]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/workspaces/{workspace_id}/projects/{project_id}/batches/{batch_id}/export.csv")
async def export_project_batch_report_csv(
    workspace_id: str,
    project_id: str,
    batch_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
    )
    service = DetectionPersistenceService(db)
    batch = await _get_batch_or_404(
        service=service,
        workspace_id=workspace_id,
        batch_id=batch_id,
        include_jobs=True,
    )
    _ensure_batch_project(batch=batch, project_id=project_id)
    csv_body = await _build_csv(service=service, batch=batch)
    filename = f"defectai-{_slug(batch.project.name if batch.project else 'project')}-{_slug(batch.name or batch.id)}.csv"
    return StreamingResponse(
        iter([csv_body]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _get_batch_or_404(
    *,
    service: DetectionPersistenceService,
    workspace_id: str,
    batch_id: str,
    include_jobs: bool = False,
) -> InspectionBatch:
    batch = await service.get_batch(
        batch_id=batch_id,
        workspace_id=workspace_id,
        include_jobs=include_jobs,
    )
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


def _ensure_batch_project(*, batch: InspectionBatch, project_id: str) -> None:
    if batch.project_id != project_id:
        raise HTTPException(status_code=404, detail="Batch not found for this project")


async def _build_summary(
    *,
    service: DetectionPersistenceService,
    batch: InspectionBatch,
) -> BatchReportSummaryResponse:
    counts = await service.batch_status_counts(batch_id=batch.id)
    total_detections, average_confidence = await service.batch_detection_totals(batch_id=batch.id)
    class_counts = await service.batch_class_counts(batch_id=batch.id)
    feedback_counts = await service.batch_feedback_counts(batch_id=batch.id)
    reviewed_jobs = await service.batch_reviewed_jobs_count(batch_id=batch.id)

    queued = counts.get("queued", 0)
    processing = counts.get("processing", 0)
    completed = counts.get("completed", 0)
    failed = counts.get("failed", 0)
    total_images = batch.total_jobs or sum(counts.values())
    terminal = completed + failed
    feedback_count_map = dict(feedback_counts)
    correct_count = feedback_count_map.get("correct", 0)
    false_positive_count = feedback_count_map.get("false_positive", 0)
    wrong_class_count = feedback_count_map.get("wrong_class", 0)
    missed_defect_count = feedback_count_map.get("missed_defect", 0)
    not_sure_count = feedback_count_map.get("not_sure", 0)
    bad_image_count = feedback_count_map.get("bad_image", 0)
    total_feedback = sum(feedback_count_map.values())
    unreviewed_images = max(total_images - reviewed_jobs, 0)
    estimated_false_positive_rate = (
        false_positive_count / total_feedback
        if total_feedback
        else None
    )
    estimated_missed_defect_rate = (
        missed_defect_count / total_feedback
        if total_feedback
        else None
    )
    recommendation = _recommendation(
        correct_count=correct_count,
        false_positive_count=false_positive_count,
        missed_defect_count=missed_defect_count,
        reviewed_count=total_feedback,
    )
    serialized_class_counts = [
        {"class_name": class_name, "count": count}
        for class_name, count in class_counts
    ]
    serialized_feedback_counts = [
        {"feedback_type": feedback_type, "count": count}
        for feedback_type, count in feedback_counts
    ]

    return BatchReportSummaryResponse(
        batch_id=batch.id,
        workspace_id=batch.workspace_id,
        workspace_name=batch.workspace.name if batch.workspace else None,
        project_id=batch.project_id,
        project_name=batch.project.name if batch.project else None,
        batch_name=batch.name,
        batch_description=batch.description,
        uploaded_by_name=batch.created_by.full_name if batch.created_by else None,
        uploaded_by_email=batch.created_by.email if batch.created_by else None,
        created_at=batch.created_at,
        total_images=total_images,
        queued_images=queued,
        processing_images=processing,
        completed_images=completed,
        failed_images=failed,
        queued=queued,
        processing=processing,
        completed=completed,
        failed=failed,
        total_predictions=total_detections,
        total_detections=total_detections,
        average_confidence=float(average_confidence) if average_confidence is not None else None,
        prediction_class_counts=serialized_class_counts,
        class_counts=serialized_class_counts,
        feedback_counts=serialized_feedback_counts,
        correct_count=correct_count,
        false_positive_count=false_positive_count,
        wrong_class_count=wrong_class_count,
        missed_defect_count=missed_defect_count,
        not_sure_count=not_sure_count,
        bad_image_count=bad_image_count,
        reviewed_images_count=reviewed_jobs,
        unreviewed_images_count=unreviewed_images,
        estimated_false_positive_rate=estimated_false_positive_rate,
        estimated_missed_defect_rate=estimated_missed_defect_rate,
        recommendation=recommendation,
        reviewed_jobs=reviewed_jobs,
        completion_rate=(terminal / total_images) if total_images else 0,
    )


async def _build_csv(
    *,
    service: DetectionPersistenceService,
    batch: InspectionBatch,
) -> str:
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "workspace_name",
            "project_name",
            "batch_name",
            "batch_description",
            "image_filename",
            "uploaded_by_name",
            "job_status",
            "model_name",
            "model_version",
            "predicted_class",
            "confidence",
            "bbox_x",
            "bbox_y",
            "bbox_width",
            "bbox_height",
            "feedback_type",
            "corrected_class_name",
            "reviewed_by_name",
            "reviewed_at",
            "comment",
        ]
    )

    for job in sorted(batch.jobs, key=lambda item: item.created_at):
        feedback_items = sorted(job.feedback, key=lambda item: item.created_at)
        job_level_feedback = [item for item in feedback_items if item.detection_box_id is None]
        feedback_by_detection: dict[str, list[HumanFeedback]] = {}
        for item in feedback_items:
            if item.detection_box_id is not None:
                feedback_by_detection.setdefault(item.detection_box_id, []).append(item)

        if job.detections:
            for detection in job.detections:
                linked_feedback = feedback_by_detection.get(detection.id) or [None]
                for feedback in linked_feedback:
                    _write_job_row(
                        writer=writer,
                        batch=batch,
                        job=job,
                        detection=detection,
                        feedback=feedback,
                    )

        if not job.detections and not job_level_feedback:
            _write_job_row(
                writer=writer,
                batch=batch,
                job=job,
                detection=None,
                feedback=None,
            )

        for feedback in job_level_feedback:
            _write_job_row(
                writer=writer,
                batch=batch,
                job=job,
                detection=None,
                feedback=feedback,
            )

    return output.getvalue()


def _write_job_row(
    *,
    writer: csv.writer,
    batch: InspectionBatch,
    job: DetectionJob,
    detection: DetectionBox | None,
    feedback: HumanFeedback | None,
) -> None:
    reviewer = feedback.reviewer if feedback else None
    reviewer_name = _display_name(reviewer)
    writer.writerow(
        [
            batch.workspace.name if batch.workspace else "",
            batch.project.name if batch.project else "",
            batch.name or "",
            batch.description or "",
            job.original_filename,
            _display_name(batch.created_by),
            job.status,
            job.model_name or "",
            job.model_version or "",
            detection.class_name if detection else "",
            detection.confidence if detection else "",
            detection.x if detection else "",
            detection.y if detection else "",
            detection.width if detection else "",
            detection.height if detection else "",
            feedback.feedback_type if feedback else "",
            feedback.corrected_class_name if feedback else "",
            reviewer_name,
            feedback.created_at.isoformat() if feedback and feedback.created_at else "",
            feedback.comment if feedback else "",
        ]
    )


def _serialize_batch_feedback(feedback: HumanFeedback) -> BatchFeedbackResponse:
    detection = feedback.detection_box
    reviewer = feedback.reviewer
    return BatchFeedbackResponse(
        id=feedback.id,
        job_id=feedback.job_id,
        detection_box_id=feedback.detection_box_id,
        image_filename=feedback.job.original_filename if feedback.job else None,
        predicted_class=detection.class_name if detection else None,
        confidence=detection.confidence if detection else None,
        feedback_type=feedback.feedback_type,
        corrected_class_name=feedback.corrected_class_name,
        reviewer_id=feedback.reviewer_id,
        reviewer_name=reviewer.full_name if reviewer else None,
        reviewer_email=reviewer.email if reviewer else None,
        reviewed_at=feedback.created_at,
        comment=feedback.comment,
    )


def _display_name(user: User | None) -> str:
    if user is None:
        return ""
    return user.full_name or user.email


def _recommendation(
    *,
    correct_count: int,
    false_positive_count: int,
    missed_defect_count: int,
    reviewed_count: int,
) -> str:
    if missed_defect_count >= max(2, reviewed_count * 0.25):
        return "Needs more data before production use. Do not use for autonomous rejection."
    if false_positive_count >= max(2, reviewed_count * 0.25):
        return "Useful for screening, but needs false-positive reduction. Do not use for autonomous rejection."
    if reviewed_count and correct_count / reviewed_count >= 0.7:
        return "Potentially useful for first-pass screening. Keep human review before production decisions."
    return "Collect more reviewed examples before scaling. Do not use for autonomous rejection."


def _slug(value: str) -> str:
    return "-".join(value.lower().strip().split())[:80] or "batch"
