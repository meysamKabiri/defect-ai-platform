"""add inspection batches

Revision ID: 20260531_0009
Revises: 20260531_0008
Create Date: 2026-05-31

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260531_0009"
down_revision: str | Sequence[str] | None = "20260531_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "inspection_batches",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("workspace_id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("total_jobs", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_inspection_batches_created_by_user_id"), "inspection_batches", ["created_by_user_id"])
    op.create_index(op.f("ix_inspection_batches_project_id"), "inspection_batches", ["project_id"])
    op.create_index(op.f("ix_inspection_batches_status"), "inspection_batches", ["status"])
    op.create_index(op.f("ix_inspection_batches_workspace_id"), "inspection_batches", ["workspace_id"])
    op.create_index(
        "ix_inspection_batches_workspace_status",
        "inspection_batches",
        ["workspace_id", "status"],
    )
    op.create_index(
        "ix_inspection_batches_project_created_at",
        "inspection_batches",
        ["project_id", "created_at"],
    )

    op.add_column("detection_jobs", sa.Column("batch_id", sa.String(length=36), nullable=True))
    op.create_index(op.f("ix_detection_jobs_batch_id"), "detection_jobs", ["batch_id"])
    op.create_index(
        "ix_detection_jobs_batch_status_created_at",
        "detection_jobs",
        ["batch_id", "status", "created_at"],
    )
    op.create_foreign_key(
        "fk_detection_jobs_batch_id_inspection_batches",
        "detection_jobs",
        "inspection_batches",
        ["batch_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_detection_jobs_batch_id_inspection_batches",
        "detection_jobs",
        type_="foreignkey",
    )
    op.drop_index("ix_detection_jobs_batch_status_created_at", table_name="detection_jobs")
    op.drop_index(op.f("ix_detection_jobs_batch_id"), table_name="detection_jobs")
    op.drop_column("detection_jobs", "batch_id")

    op.drop_index("ix_inspection_batches_project_created_at", table_name="inspection_batches")
    op.drop_index("ix_inspection_batches_workspace_status", table_name="inspection_batches")
    op.drop_index(op.f("ix_inspection_batches_workspace_id"), table_name="inspection_batches")
    op.drop_index(op.f("ix_inspection_batches_status"), table_name="inspection_batches")
    op.drop_index(op.f("ix_inspection_batches_project_id"), table_name="inspection_batches")
    op.drop_index(op.f("ix_inspection_batches_created_by_user_id"), table_name="inspection_batches")
    op.drop_table("inspection_batches")
