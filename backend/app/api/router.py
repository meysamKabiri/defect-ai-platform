from fastapi import APIRouter

from app.api.routes import admin
from app.api.routes import auth
from app.api.routes import detection
from app.api.routes import projects

api_router = APIRouter()

api_router.include_router(admin.router)
api_router.include_router(auth.router)
api_router.include_router(detection.router)
api_router.include_router(projects.router)
