from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime
from sqlalchemy import Float
from sqlalchemy import ForeignKey
from sqlalchemy import Index
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import func
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.db.base import Base


def new_uuid() -> str:
    return str(uuid4())


class DetectionJob(Base):
    __tablename__ = "detection_jobs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_uuid,
    )
    rq_job_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )
    project_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )

    original_filename: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    image_url: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )
    annotated_image_url: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )

    model_name: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )
    model_version: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )
    processing_time_seconds: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    detection_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    detections: Mapped[list["DetectionBox"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    user: Mapped["User | None"] = relationship(
        "User",
        back_populates="detection_jobs",
    )

    __table_args__ = (
        Index("ix_detection_jobs_status_created_at", "status", "created_at"),
    )


class DetectionBox(Base):
    __tablename__ = "detection_boxes"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_uuid,
    )
    job_id: Mapped[str] = mapped_column(
        ForeignKey(
            "detection_jobs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    class_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )
    class_name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        index=True,
    )
    label: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )
    severity: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        index=True,
    )

    x1: Mapped[float] = mapped_column(Float, nullable=False)
    y1: Mapped[float] = mapped_column(Float, nullable=False)
    x2: Mapped[float] = mapped_column(Float, nullable=False)
    y2: Mapped[float] = mapped_column(Float, nullable=False)
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)
    width: Mapped[float] = mapped_column(Float, nullable=False)
    height: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    job: Mapped[DetectionJob] = relationship(
        back_populates="detections",
    )

    __table_args__ = (
        Index("ix_detection_boxes_class_confidence", "class_name", "confidence"),
    )
