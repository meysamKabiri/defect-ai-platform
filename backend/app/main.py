from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
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
    allow_origins=["*"],  # Change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount(
    "/uploads",
    StaticFiles(directory=settings.upload_path),
    name="uploads",
)
app.mount(
    "/outputs",
    StaticFiles(directory=settings.output_path),
    name="outputs",
)


@app.get("/")
async def root():
    return {"message": "Backend running"}
