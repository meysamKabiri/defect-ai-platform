import csv
from datetime import datetime
from datetime import timedelta
from datetime import timezone
from io import StringIO
from types import SimpleNamespace
import unittest

from app.api.routes import reports
from app.repositories.detection_repository import DetectionRepository


def utc(minutes: int) -> datetime:
    return datetime(2026, 6, 1, 12, minutes, tzinfo=timezone.utc)


def user(name: str = "Reviewer", email: str = "reviewer@example.com"):
    return SimpleNamespace(full_name=name, email=email)


def detection_box(
    box_id: str = "box-1",
    class_name: str = "scratch",
    confidence: float = 0.91,
):
    return SimpleNamespace(
        id=box_id,
        class_name=class_name,
        confidence=confidence,
        x=10,
        y=20,
        width=30,
        height=40,
    )


def feedback(
    *,
    feedback_id: str,
    job_id: str = "job-1",
    detection_box_id: str | None = "box-1",
    feedback_type: str,
    created_at: datetime,
    corrected_class_name: str | None = None,
    comment: str | None = None,
    detection=None,
):
    return SimpleNamespace(
        id=feedback_id,
        job_id=job_id,
        detection_box_id=detection_box_id,
        reviewer_id="reviewer-1",
        reviewer=user(),
        feedback_type=feedback_type,
        corrected_class_name=corrected_class_name,
        comment=comment,
        created_at=created_at,
        detection_box=detection,
        job=None,
    )


def batch_with_job(feedback_items):
    workspace = SimpleNamespace(name="Factory A")
    project = SimpleNamespace(name="Coil Inspection")
    created_by = user("Uploader", "uploader@example.com")
    detection = detection_box()
    job = SimpleNamespace(
        id="job-1",
        original_filename="coil-001.png",
        status="completed",
        model_name="YOLO",
        model_version="v8",
        created_at=utc(0),
        detections=[detection],
        feedback=feedback_items,
    )
    for item in feedback_items:
        item.job = job
        if item.detection_box_id == detection.id:
            item.detection_box = detection

    return SimpleNamespace(
        id="batch-1",
        workspace_id="workspace-1",
        workspace=workspace,
        project_id="project-1",
        project=project,
        name="Morning Run",
        description="Line A",
        created_by=created_by,
        created_at=utc(0),
        total_jobs=1,
        jobs=[job],
    )


class FakeResult:
    def __init__(self, items):
        self.items = items

    def scalars(self):
        return iter(self.items)


class FakeSession:
    def __init__(self, items):
        self.items = items
        self.deleted = []
        self.flushed = False

    async def execute(self, _statement):
        return FakeResult(self.items)

    async def delete(self, item):
        self.deleted.append(item)

    async def flush(self):
        self.flushed = True


class FakeSummaryService:
    def __init__(self, feedback_items):
        self.feedback_items = feedback_items

    async def batch_status_counts(self, *, batch_id: str):
        assert batch_id == "batch-1"
        return {"completed": 1}

    async def batch_detection_totals(self, *, batch_id: str):
        assert batch_id == "batch-1"
        return 1, 0.91

    async def batch_class_counts(self, *, batch_id: str):
        assert batch_id == "batch-1"
        return [("scratch", 1)]

    async def list_batch_feedback(self, *, batch_id: str):
        assert batch_id == "batch-1"
        return self.feedback_items

    async def batch_reviewed_jobs_count(self, *, batch_id: str):
        assert batch_id == "batch-1"
        return 1


class FeedbackRegressionTests(unittest.IsolatedAsyncioTestCase):
    async def test_latest_feedback_value_per_prediction_target_is_returned(self):
        older = feedback(
            feedback_id="feedback-old",
            feedback_type="false_positive",
            created_at=utc(1),
        )
        newer = feedback(
            feedback_id="feedback-new",
            feedback_type="correct",
            created_at=utc(2),
        )

        repository = DetectionRepository.__new__(DetectionRepository)
        latest = repository._latest_feedback_items([older, newer])

        self.assertEqual([item.id for item in latest], ["feedback-new"])

    async def test_updating_feedback_reuses_latest_row_and_removes_duplicate_targets(self):
        newer = feedback(
            feedback_id="feedback-new",
            feedback_type="false_positive",
            created_at=utc(2),
        )
        older = feedback(
            feedback_id="feedback-old",
            feedback_type="wrong_class",
            created_at=utc(1),
        )
        session = FakeSession([newer, older])
        repository = DetectionRepository(session)

        result = await repository.create_feedback(
            job_id="job-1",
            detection_box_id="box-1",
            reviewer_id="reviewer-2",
            feedback_type="correct",
            corrected_class_name=None,
            comment="latest value",
        )

        self.assertIs(result, newer)
        self.assertEqual(newer.reviewer_id, "reviewer-2")
        self.assertEqual(newer.feedback_type, "correct")
        self.assertEqual(newer.comment, "latest value")
        self.assertGreater(newer.created_at, utc(2) - timedelta(seconds=1))
        self.assertEqual(session.deleted, [older])
        self.assertTrue(session.flushed)

    async def test_report_summary_uses_latest_feedback_value(self):
        older = feedback(
            feedback_id="feedback-old",
            feedback_type="false_positive",
            created_at=utc(1),
        )
        newer = feedback(
            feedback_id="feedback-new",
            feedback_type="correct",
            created_at=utc(2),
        )
        summary = await reports._build_summary(
            service=FakeSummaryService([older, newer]),
            batch=batch_with_job([older, newer]),
        )

        self.assertEqual(summary.correct_count, 1)
        self.assertEqual(summary.false_positive_count, 0)
        self.assertEqual(
            [(item.feedback_type, item.count) for item in summary.feedback_counts],
            [("correct", 1)],
        )

    async def test_csv_export_uses_latest_feedback_value(self):
        older = feedback(
            feedback_id="feedback-old",
            feedback_type="false_positive",
            created_at=utc(1),
            comment="stale",
        )
        newer = feedback(
            feedback_id="feedback-new",
            feedback_type="wrong_class",
            created_at=utc(2),
            corrected_class_name="rolled scale",
            comment="latest",
        )
        csv_body = await reports._build_csv(
            service=SimpleNamespace(),
            batch=batch_with_job([older, newer]),
        )

        rows = list(csv.DictReader(StringIO(csv_body)))

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["feedback_type"], "wrong_class")
        self.assertEqual(rows[0]["corrected_class_name"], "rolled scale")
        self.assertEqual(rows[0]["comment"], "latest")


if __name__ == "__main__":
    unittest.main()
