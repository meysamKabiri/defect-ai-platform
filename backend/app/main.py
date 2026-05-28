from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings

settings.upload_path.mkdir(parents=True, exist_ok=True)
settings.output_path.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Defect AI Platform")

app.include_router(
    api_router,
    prefix="/api/v1",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Backend running"}
