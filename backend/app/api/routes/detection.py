from fastapi import (
    APIRouter,
    File,
    UploadFile,
    HTTPException,
)

from app.services.upload_service import (
    UploadService,
)

from app.core.job_store import (
    get_job,
)

router = APIRouter(
    prefix="/detect",
    tags=["Detection"],
)

upload_service = UploadService()


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
):

    try:

        return await upload_service.upload_image(
            file=file,
        )

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/jobs/{job_id}")
async def get_detection_job(
    job_id: str,
):

    job = get_job(job_id)

    if not job:

        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    return job
