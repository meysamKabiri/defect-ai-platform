"""repair default workspace roles

Revision ID: 20260530_0006
Revises: 20260530_0005
Create Date: 2026-05-30

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260530_0006"
down_revision: str | Sequence[str] | None = "20260530_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE workspace_memberships wm
            JOIN users u ON u.id = wm.user_id
            SET wm.role = CASE UPPER(u.role)
                WHEN 'SUPER_ADMIN' THEN 'OWNER'
                WHEN 'ADMIN' THEN 'ADMIN'
                WHEN 'ENGINEER' THEN 'ENGINEER'
                ELSE 'VIEWER'
            END
            WHERE wm.workspace_id = :workspace_id
            """
        ).bindparams(workspace_id=DEFAULT_WORKSPACE_ID)
    )


def downgrade() -> None:
    pass
