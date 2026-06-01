from datetime import datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Boolean
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Index
from sqlalchemy import inspect
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import func
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.workspace import Workspace


def new_uuid() -> str:
    return str(uuid4())


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_uuid,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    workspace_id: Mapped[str | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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

    owner: Mapped["User | None"] = relationship("User", back_populates="projects")
    workspace: Mapped["Workspace | None"] = relationship("Workspace")

    @property
    def owner_email(self) -> str | None:
        if "owner" in inspect(self).unloaded or self.owner is None:
            return None
        return self.owner.email

    @property
    def owner_full_name(self) -> str | None:
        if "owner" in inspect(self).unloaded or self.owner is None:
            return None
        return self.owner.full_name

    __table_args__ = (
        Index("ix_projects_owner_name", "owner_id", "name"),
        Index("ix_projects_workspace_name", "workspace_id", "name"),
    )
