"""add batch description

Revision ID: 20260601_0010
Revises: 20260531_0009
Create Date: 2026-06-01

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260601_0010"
down_revision: str | Sequence[str] | None = "20260531_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "inspection_batches",
        sa.Column("description", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("inspection_batches", "description")
