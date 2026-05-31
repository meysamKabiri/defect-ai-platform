from enum import StrEnum


class WorkspaceRole(StrEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    ENGINEER = "ENGINEER"
    VIEWER = "VIEWER"


class MembershipStatus(StrEnum):
    ACTIVE = "ACTIVE"
    REMOVED = "REMOVED"
    SUSPENDED = "SUSPENDED"


class InvitationStatus(StrEnum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
