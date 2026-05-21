from app.services.detection_pipeline_service import (
    DetectionPipelineService,
)

pipeline_service = DetectionPipelineService()


def process_detection_task(
    job_id: str,
    image_path: str,
    image_url: str,
):

    pipeline_service.process_detection(
        job_id,
        image_path,
        image_url,
    )
