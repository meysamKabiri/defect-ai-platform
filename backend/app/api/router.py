from fastapi import APIRouter

from app.api.routes import detection

api_router = APIRouter()

api_router.include_router(detection.router)
