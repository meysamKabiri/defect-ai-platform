"""add workspaces

Revision ID: 20260530_0005
Revises: 20260530_0004
Create Date: 2026-05-30

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260530_0005"
down_revision: str | Sequence[str] | None = "20260530_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=True),
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
            ["created_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_workspaces_created_by_user_id"), "workspaces", ["created_by_user_id"])
    op.create_index(op.f("ix_workspaces_slug"), "workspaces", ["slug"], unique=True)

    op.create_table(
        "workspace_memberships",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("workspace_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
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
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_membership_user"),
    )
    op.create_index(op.f("ix_workspace_memberships_role"), "workspace_memberships", ["role"])
    op.create_index(op.f("ix_workspace_memberships_status"), "workspace_memberships", ["status"])
    op.create_index(op.f("ix_workspace_memberships_user_id"), "workspace_memberships", ["user_id"])
    op.create_index(op.f("ix_workspace_memberships_workspace_id"), "workspace_memberships", ["workspace_id"])
    op.create_index(
        "ix_workspace_memberships_workspace_status",
        "workspace_memberships",
        ["workspace_id", "status"],
    )

    op.create_table(
        "workspace_invitations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("workspace_id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("invited_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(op.f("ix_workspace_invitations_email"), "workspace_invitations", ["email"])
    op.create_index(op.f("ix_workspace_invitations_invited_by_user_id"), "workspace_invitations", ["invited_by_user_id"])
    op.create_index(op.f("ix_workspace_invitations_role"), "workspace_invitations", ["role"])
    op.create_index(op.f("ix_workspace_invitations_status"), "workspace_invitations", ["status"])
    op.create_index(op.f("ix_workspace_invitations_token_hash"), "workspace_invitations", ["token_hash"], unique=True)
    op.create_index(op.f("ix_workspace_invitations_workspace_id"), "workspace_invitations", ["workspace_id"])
    op.create_index(
        "ix_workspace_invitations_workspace_email_status",
        "workspace_invitations",
        ["workspace_id", "email", "status"],
    )

    op.add_column("projects", sa.Column("workspace_id", sa.String(length=36), nullable=True))
    op.create_index(op.f("ix_projects_workspace_id"), "projects", ["workspace_id"])
    op.create_index("ix_projects_workspace_name", "projects", ["workspace_id", "name"])
    op.create_foreign_key(
        "fk_projects_workspace_id_workspaces",
        "projects",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )

    _migrate_existing_data()


def _migrate_existing_data() -> None:
    connection = op.get_bind()
    first_user = connection.execute(
        sa.text(
            "SELECT id FROM users ORDER BY "
            "CASE UPPER(role) WHEN 'SUPER_ADMIN' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END, created_at ASC LIMIT 1"
        )
    ).mappings().first()

    if first_user is None:
        return

    workspace_id = "00000000-0000-0000-0000-000000000001"
    connection.execute(
        sa.text(
            "INSERT INTO workspaces (id, name, slug, created_by_user_id) "
            "VALUES (:id, 'Default Workspace', 'default-workspace', :user_id)"
        ),
        {"id": workspace_id, "user_id": first_user["id"]},
    )

    users = connection.execute(sa.text("SELECT id, role FROM users")).mappings()
    for user in users:
        role = {
            "SUPER_ADMIN": "OWNER",
            "ADMIN": "ADMIN",
            "ENGINEER": "ENGINEER",
            "VIEWER": "VIEWER",
        }.get(str(user["role"]).upper(), "VIEWER")
        connection.execute(
            sa.text(
                "INSERT INTO workspace_memberships "
                "(id, workspace_id, user_id, role, status) "
                "VALUES (UUID(), :workspace_id, :user_id, :role, 'ACTIVE')"
            ),
            {"workspace_id": workspace_id, "user_id": user["id"], "role": role},
        )

    connection.execute(
        sa.text("UPDATE projects SET workspace_id = :workspace_id WHERE workspace_id IS NULL"),
        {"workspace_id": workspace_id},
    )


def downgrade() -> None:
    op.drop_constraint("fk_projects_workspace_id_workspaces", "projects", type_="foreignkey")
    op.drop_index("ix_projects_workspace_name", table_name="projects")
    op.drop_index(op.f("ix_projects_workspace_id"), table_name="projects")
    op.drop_column("projects", "workspace_id")

    op.drop_index("ix_workspace_invitations_workspace_email_status", table_name="workspace_invitations")
    op.drop_index(op.f("ix_workspace_invitations_workspace_id"), table_name="workspace_invitations")
    op.drop_index(op.f("ix_workspace_invitations_token_hash"), table_name="workspace_invitations")
    op.drop_index(op.f("ix_workspace_invitations_status"), table_name="workspace_invitations")
    op.drop_index(op.f("ix_workspace_invitations_role"), table_name="workspace_invitations")
    op.drop_index(op.f("ix_workspace_invitations_invited_by_user_id"), table_name="workspace_invitations")
    op.drop_index(op.f("ix_workspace_invitations_email"), table_name="workspace_invitations")
    op.drop_table("workspace_invitations")

    op.drop_index("ix_workspace_memberships_workspace_status", table_name="workspace_memberships")
    op.drop_index(op.f("ix_workspace_memberships_workspace_id"), table_name="workspace_memberships")
    op.drop_index(op.f("ix_workspace_memberships_user_id"), table_name="workspace_memberships")
    op.drop_index(op.f("ix_workspace_memberships_status"), table_name="workspace_memberships")
    op.drop_index(op.f("ix_workspace_memberships_role"), table_name="workspace_memberships")
    op.drop_table("workspace_memberships")

    op.drop_index(op.f("ix_workspaces_slug"), table_name="workspaces")
    op.drop_index(op.f("ix_workspaces_created_by_user_id"), table_name="workspaces")
    op.drop_table("workspaces")
