# AGENTS.md

## Project Shape
- `frontend/` is a Vite React 19 app; run all npm commands from `frontend/` because there is no root package manifest.
- `backend/` is a FastAPI app mounted at `/api/v1`; imports assume `backend/` is the working directory or on `PYTHONPATH`.
- `ml/requirements.txt` is empty; the runtime YOLO dependencies used by the app live in `backend/requirements/worker.txt` and `backend/requirements/worker-gpu.txt`.

## Commands
- Frontend install/build/dev: `cd frontend && npm install`, `npm run build`, `npm run dev`.
- Frontend lint: `cd frontend && npm run lint`; it currently fails on existing React refresh/hook compiler rules, while `npm run build` passes.
- Backend API deps: `cd backend && pip install -r requirements/api.txt -r requirements/dev.txt`.
- Backend worker deps: `cd backend && pip install -r requirements/worker.txt`; use `worker-gpu.txt` only for CUDA environments.
- Backend tests: `cd backend && python -m pytest tests`; focused example: `python -m pytest tests/services/test_workspace_service.py`.
- Local services: `docker compose up redis mysql` starts Redis on `6379` and MySQL on host port `3307`.
- Full Docker stack: `docker compose up api worker redis mysql`; the API container runs `alembic upgrade head` before `uvicorn`.

## Runtime Gotchas
- Copy `backend/.env.example` to `backend/.env` for local backend work; `app.core.config` reads that file directly.
- Alembic gets `DATABASE_URL` from `backend/.env`, not from `alembic.ini`; run migrations from `backend/` with `alembic upgrade head`.
- The worker queue is named `detection`; the Docker worker command is `rq worker detection`.
- YOLO inference imports `backend/app/models/best.pt` at module import time; `*.pt` is gitignored, so missing weights break detection paths even if API-only code starts.
- Uploaded and annotated images are stored under paths from `UPLOAD_DIR` and `OUTPUT_DIR`, defaulting to `backend/storage/uploads` and `backend/storage/outputs`.

## Frontend Integration
- API defaults are in `frontend/src/lib/config.ts`: `VITE_API_BASE_URL` overrides the full `/api/v1` base, otherwise `VITE_API_URL` or `VITE_API_ORIGIN` sets the origin and `/api/v1` is appended.
- Use the `@/` alias for frontend imports; it maps to `frontend/src` in both Vite and `tsconfig.app.json`.
- RTK Query endpoints inject into `frontend/src/services/baseApi.ts`; auth refresh is handled there, so new API slices should reuse `baseApi`.
