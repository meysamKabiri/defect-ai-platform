from fastapi import APIRouter

from app.api.routes import admin
from app.api.routes import auth
from app.api.routes import batches
from app.api.routes import detection
from app.api.routes import events
from app.api.routes import projects
from app.api.routes import reports
from app.api.routes import workspaces

api_router = APIRouter()

api_router.include_router(admin.router)
api_router.include_router(auth.router)
api_router.include_router(batches.router)
api_router.include_router(detection.router)
api_router.include_router(events.router)
api_router.include_router(projects.router)
api_router.include_router(reports.router)
api_router.include_router(workspaces.router)
