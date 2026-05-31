from types import SimpleNamespace
import unittest

from fastapi import HTTPException

from app.core.workspace_roles import WorkspaceRole
from app.services.workspace_service import WorkspaceService
from app.services.workspace_service import hash_invitation_token


class FakeWorkspaceRepository:
    def __init__(self, membership):
        self.membership = membership

    async def get_active_membership(self, *, workspace_id: str, user_id: str):
        if (
            self.membership
            and self.membership.workspace_id == workspace_id
            and self.membership.user_id == user_id
        ):
            return self.membership
        return None


def membership(
    *,
    role: WorkspaceRole,
    user_id: str = "user-1",
    workspace_id: str = "workspace-1",
):
    return SimpleNamespace(
        role=role.value,
        user_id=user_id,
        workspace_id=workspace_id,
    )


class WorkspaceServiceAuthorizationTests(unittest.IsolatedAsyncioTestCase):
    async def test_require_membership_allows_active_member_with_required_role(self):
        service = WorkspaceService.__new__(WorkspaceService)
        service.workspaces = FakeWorkspaceRepository(
            membership(role=WorkspaceRole.ADMIN)
        )

        result = await service.require_membership(
            workspace_id="workspace-1",
            user=SimpleNamespace(id="user-1"),
            roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
        )

        self.assertEqual(result.role, WorkspaceRole.ADMIN.value)

    async def test_require_membership_rejects_wrong_workspace_role(self):
        service = WorkspaceService.__new__(WorkspaceService)
        service.workspaces = FakeWorkspaceRepository(
            membership(role=WorkspaceRole.VIEWER)
        )

        with self.assertRaises(HTTPException) as error:
            await service.require_membership(
                workspace_id="workspace-1",
                user=SimpleNamespace(id="user-1"),
                roles={WorkspaceRole.OWNER, WorkspaceRole.ADMIN},
            )

        self.assertEqual(error.exception.status_code, 403)

    def test_admin_cannot_promote_members_to_admin_or_owner(self):
        service = WorkspaceService.__new__(WorkspaceService)
        actor = membership(role=WorkspaceRole.ADMIN, user_id="admin-1")
        target = membership(role=WorkspaceRole.ENGINEER, user_id="engineer-1")

        with self.assertRaises(HTTPException) as error:
            service._ensure_can_manage_member(actor, target, WorkspaceRole.ADMIN)

        self.assertEqual(error.exception.status_code, 403)

    def test_owner_cannot_remove_or_demote_self(self):
        service = WorkspaceService.__new__(WorkspaceService)
        actor = membership(role=WorkspaceRole.OWNER, user_id="owner-1")
        target = membership(role=WorkspaceRole.OWNER, user_id="owner-1")

        with self.assertRaises(HTTPException) as error:
            service._ensure_can_manage_member(actor, target, WorkspaceRole.VIEWER)

        self.assertEqual(error.exception.status_code, 400)

    def test_invitation_token_hash_is_sha256_digest(self):
        raw_token = "development-token"

        token_hash = hash_invitation_token(raw_token)

        self.assertNotEqual(token_hash, raw_token)
        self.assertEqual(len(token_hash), 64)
        self.assertEqual(token_hash, hash_invitation_token(raw_token))


if __name__ == "__main__":
    unittest.main()
