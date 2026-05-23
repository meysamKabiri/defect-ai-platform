# from app.services.detection_pipeline_service import (
#     DetectionPipelineService,
# )

# pipeline_service = DetectionPipelineService()


# def process_detection_task(
#     job_id: str,
#     image_path: str,
#     image_url: str,
# ):

#     pipeline_service.process_detection(
#         job_id,
#         image_path,
#         image_url,
#     )

import logging
from app.core.job_store import update_job
from app.services.detection_pipeline_service import (
    DetectionPipelineService,
)

pipeline_service = DetectionPipelineService()
logger = logging.getLogger(__name__)


def process_detection_task(
    job_id: str,
    image_path: str,
    image_url: str,
):
    print("========== TASK STARTED ==========")
    print(f"job_id: {job_id}")
    print(f"image_path: {image_path}")
    print(f"image_url: {image_url}")
    try:

        update_job(
            job_id,
            {
                "status": "processing",
            },
        )

        result = pipeline_service.process_detection(
            job_id,
            image_path,
            image_url,
        )
        print("========== TASK FINISHED ==========")
        print(f"job_id: {job_id}")

        update_job(
            job_id,
            {
                "status": "completed",
                "result": result,
            },
        )

    except Exception as e:

        update_job(
            job_id,
            {
                "status": "failed",
                "error": str(e),
            },
        )

        raise
