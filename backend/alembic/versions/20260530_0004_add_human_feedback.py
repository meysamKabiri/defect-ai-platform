"""add human feedback

Revision ID: 20260530_0004
Revises: 20260528_0003
Create Date: 2026-05-30

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260530_0004"
down_revision: str | Sequence[str] | None = "20260528_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "human_feedback",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("detection_box_id", sa.String(length=36), nullable=True),
        sa.Column("reviewer_id", sa.String(length=36), nullable=True),
        sa.Column("feedback_type", sa.String(length=32), nullable=False),
        sa.Column("corrected_class_name", sa.String(length=128), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["detection_box_id"],
            ["detection_boxes.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["job_id"],
            ["detection_jobs.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["reviewer_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_human_feedback_detection_box_id"),
        "human_feedback",
        ["detection_box_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_human_feedback_feedback_type"),
        "human_feedback",
        ["feedback_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_human_feedback_job_id"),
        "human_feedback",
        ["job_id"],
        unique=False,
    )
    op.create_index(
        "ix_human_feedback_job_type",
        "human_feedback",
        ["job_id", "feedback_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_human_feedback_reviewer_id"),
        "human_feedback",
        ["reviewer_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_human_feedback_reviewer_id"), table_name="human_feedback")
    op.drop_index("ix_human_feedback_job_type", table_name="human_feedback")
    op.drop_index(op.f("ix_human_feedback_job_id"), table_name="human_feedback")
    op.drop_index(op.f("ix_human_feedback_feedback_type"), table_name="human_feedback")
    op.drop_index(
        op.f("ix_human_feedback_detection_box_id"),
        table_name="human_feedback",
    )
    op.drop_table("human_feedback")
