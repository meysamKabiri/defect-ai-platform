from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router

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
    StaticFiles(directory="uploads"),
    name="uploads",
)
app.mount(
    "/outputs",
    StaticFiles(directory="outputs"),
    name="outputs",
)


@app.get("/")
async def root():
    return {"message": "Backend running"}
