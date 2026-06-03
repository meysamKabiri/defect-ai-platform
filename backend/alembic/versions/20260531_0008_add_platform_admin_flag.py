"""add platform admin flag

Revision ID: 20260531_0008
Revises: 20260531_0007
Create Date: 2026-05-31

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260531_0008"
down_revision: str | Sequence[str] | None = "20260531_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_platform_admin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "is_platform_admin")
