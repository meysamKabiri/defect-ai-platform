"""initial schema

Revision ID: 0bba724d8077
Revises: 
Create Date: 2026-05-28 17:30:12.776133

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0bba724d8077'
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    role_enum = sa.Enum(
        "SUPER_ADMIN",
        "ADMIN",
        "ENGINEER",
        "VIEWER",
        name="userrole",
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("token_version", sa.Integer(), nullable=False),
        sa.Column("role", role_enum, nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.String(length=36), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_projects_name"), "projects", ["name"], unique=False)
    op.create_index(
        "ix_projects_owner_name",
        "projects",
        ["owner_id", "name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_projects_owner_id"),
        "projects",
        ["owner_id"],
        unique=False,
    )

    op.create_table(
        "detection_jobs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("rq_job_id", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("image_url", sa.String(length=512), nullable=True),
        sa.Column("annotated_image_url", sa.String(length=512), nullable=True),
        sa.Column("model_name", sa.String(length=128), nullable=True),
        sa.Column("model_version", sa.String(length=128), nullable=True),
        sa.Column("processing_time_seconds", sa.Float(), nullable=True),
        sa.Column("detection_count", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
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
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_detection_jobs_user_id_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_detection_jobs_project_id"),
        "detection_jobs",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_detection_jobs_rq_job_id"),
        "detection_jobs",
        ["rq_job_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_detection_jobs_status"),
        "detection_jobs",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_detection_jobs_status_created_at",
        "detection_jobs",
        ["status", "created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_detection_jobs_user_id"),
        "detection_jobs",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "detection_boxes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("class_id", sa.Integer(), nullable=False),
        sa.Column("class_name", sa.String(length=128), nullable=False),
        sa.Column("label", sa.String(length=128), nullable=True),
        sa.Column("severity", sa.String(length=64), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("x1", sa.Float(), nullable=False),
        sa.Column("y1", sa.Float(), nullable=False),
        sa.Column("x2", sa.Float(), nullable=False),
        sa.Column("y2", sa.Float(), nullable=False),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("width", sa.Float(), nullable=False),
        sa.Column("height", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["job_id"],
            ["detection_jobs.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_detection_boxes_class_id"),
        "detection_boxes",
        ["class_id"],
        unique=False,
    )
    op.create_index(
        "ix_detection_boxes_class_confidence",
        "detection_boxes",
        ["class_name", "confidence"],
        unique=False,
    )
    op.create_index(
        op.f("ix_detection_boxes_class_name"),
        "detection_boxes",
        ["class_name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_detection_boxes_confidence"),
        "detection_boxes",
        ["confidence"],
        unique=False,
    )
    op.create_index(
        op.f("ix_detection_boxes_job_id"),
        "detection_boxes",
        ["job_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_detection_boxes_severity"),
        "detection_boxes",
        ["severity"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_detection_boxes_severity"), table_name="detection_boxes")
    op.drop_index(op.f("ix_detection_boxes_job_id"), table_name="detection_boxes")
    op.drop_index(op.f("ix_detection_boxes_confidence"), table_name="detection_boxes")
    op.drop_index(op.f("ix_detection_boxes_class_name"), table_name="detection_boxes")
    op.drop_index("ix_detection_boxes_class_confidence", table_name="detection_boxes")
    op.drop_index(op.f("ix_detection_boxes_class_id"), table_name="detection_boxes")
    op.drop_table("detection_boxes")

    op.drop_index(op.f("ix_detection_jobs_user_id"), table_name="detection_jobs")
    op.drop_index("ix_detection_jobs_status_created_at", table_name="detection_jobs")
    op.drop_index(op.f("ix_detection_jobs_status"), table_name="detection_jobs")
    op.drop_index(op.f("ix_detection_jobs_rq_job_id"), table_name="detection_jobs")
    op.drop_index(op.f("ix_detection_jobs_project_id"), table_name="detection_jobs")
    op.drop_table("detection_jobs")

    op.drop_index(op.f("ix_projects_owner_id"), table_name="projects")
    op.drop_index("ix_projects_owner_name", table_name="projects")
    op.drop_index(op.f("ix_projects_name"), table_name="projects")
    op.drop_table("projects")

    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
