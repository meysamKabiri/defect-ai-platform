from __future__ import annotations

from datetime import datetime
from uuid import uuid4
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, Enum, Integer, String
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.roles import UserRole
from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.detection import DetectionJob
    from app.db.models.project import Project
    from app.db.models.workspace import WorkspaceMembership


def new_uuid() -> str:
    return str(uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_uuid,
        index=True,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    full_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_platform_admin: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    token_version: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        default=UserRole.ENGINEER,
        nullable=False,
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

    # Relationships
    detection_jobs: Mapped[list["DetectionJob"]] = relationship(
        "DetectionJob",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="owner",
        passive_deletes=True,
    )
    workspace_memberships: Mapped[list["WorkspaceMembership"]] = relationship(
        "WorkspaceMembership",
        back_populates="user",
        passive_deletes=True,
    )
