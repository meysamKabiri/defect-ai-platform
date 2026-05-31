"""add detection project foreign key

Revision ID: 20260531_0007
Revises: 20260530_0006
Create Date: 2026-05-31

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260531_0007"
down_revision: str | Sequence[str] | None = "20260530_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE detection_jobs dj
            LEFT JOIN projects p ON p.id = dj.project_id
            SET dj.project_id = NULL
            WHERE dj.project_id IS NOT NULL AND p.id IS NULL
            """
        )
    )
    op.create_foreign_key(
        "fk_detection_jobs_project_id_projects",
        "detection_jobs",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_detection_jobs_project_id_projects",
        "detection_jobs",
        type_="foreignkey",
    )
