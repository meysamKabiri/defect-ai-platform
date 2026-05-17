from fastapi import (
    APIRouter,
    File,
    UploadFile,
    HTTPException,
    BackgroundTasks,
)

from app.services.upload_service import (
    UploadService,
)
from app.core.job_store import jobs

router = APIRouter(
    prefix="/detect",
    tags=["Detection"],
)

upload_service = UploadService()


@router.post("/upload")
async def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):

    try:

        return await upload_service.upload_image(
            file=file,
            background_tasks=background_tasks,
        )

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):

    job = jobs.get(job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    return job
