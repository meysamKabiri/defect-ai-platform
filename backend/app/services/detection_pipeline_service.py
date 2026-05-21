from app.core.job_store import (
    update_job,
)
from app.ml.yolo_detector import run_detection


class DetectionPipelineService:
    async def process_detection(
        self,
        job_id: str,
        image_path: str,
        file_url: str,
    ):
        try:

            update_job(
                job_id,
                {
                    "status": "processing",
                },
            )

            detection_result = run_detection(
                image_path=image_path,
                output_filename=f"{job_id}.jpg",
            )
            update_job(
                job_id,
                {
                    "status": "completed",
                    "detections": detection_result["detections"],
                    "image_url": file_url,
                    "annotated_image_url": detection_result["annotated_image_url"],
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
