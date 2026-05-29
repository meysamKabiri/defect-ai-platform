# Admin RBAC Notes

## Backend enforcement

- `backend/app/core/roles.py` defines the persisted role enum.
- `backend/app/core/permissions.py` maps roles to permissions and owns role hierarchy checks.
- `backend/app/api/dependencies/roles.py` exposes reusable FastAPI dependencies for route protection.
- `backend/app/api/routes/admin.py` protects admin APIs with those dependencies:
  - `SUPER_ADMIN` can manage roles and all user/project operations.
  - `ADMIN` can manage users and projects below admin level.
  - `ENGINEER` and `VIEWER` cannot access admin APIs.
- `backend/scripts/bootstrap_super_admin.py` creates the first `SUPER_ADMIN` from the CLI and refuses to run if a super-admin already exists.

## Frontend enforcement

- `frontend/src/layouts/AppLayout.tsx` renders navigation items only when the current user's role allows them.
- `frontend/src/routes/guards/RoleGuard.tsx` blocks direct navigation to role-restricted pages.
- `frontend/src/features/admin/api/adminApi.ts` centralizes all RTK Query calls for admin APIs.
- Backend authorization remains authoritative; frontend guards are for user experience, not security.

## Bootstrap command

Run from the repository root:

```bash
PYTHONPATH=backend python3 backend/scripts/bootstrap_super_admin.py --email admin@example.com --full-name "Platform Owner"
```
