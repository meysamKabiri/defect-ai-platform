"""add super admin role and projects

Revision ID: 20260528_0003
Revises: 0bba724d8077
Create Date: 2026-05-28

"""
from collections.abc import Sequence

from alembic import op


revision: str = "20260528_0003"
down_revision: str | Sequence[str] | None = "0bba724d8077"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE users MODIFY COLUMN role "
        "ENUM('SUPER_ADMIN','ADMIN','ENGINEER','VIEWER') NOT NULL"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS projects (
            id VARCHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT NULL,
            owner_id VARCHAR(36) NULL,
            is_active BOOL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT fk_projects_owner_id_users
                FOREIGN KEY(owner_id) REFERENCES users (id)
                ON DELETE SET NULL
        )
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE users MODIFY COLUMN role "
        "ENUM('ADMIN','ENGINEER','VIEWER') NOT NULL"
    )
