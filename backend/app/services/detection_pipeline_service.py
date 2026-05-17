from app.core.job_store import jobs

from app.services.yolo_service import (
    YoloService,
)

from app.services.annotation_service import (
    AnnotationService,
)


class DetectionPipelineService:

    def __init__(self):

        self.yolo_service = YoloService()

        self.annotation_service = AnnotationService()

    async def process_detection(
        self,
        job_id: str,
        image_path: str,
        image_url: str,
    ):

        try:

            jobs[job_id]["status"] = "processing"

            detections = await self.yolo_service.detect(image_path)

            annotated_output = await self.annotation_service.annotate_image(
                image_path=image_path,
                detections=detections,
            )

            jobs[job_id] = {
                "status": "completed",
                "detections": detections,
                "image_url": image_url,
                "annotated_image_url": annotated_output["output_url"],
            }

        except Exception as e:

            jobs[job_id] = {
                "status": "failed",
                "error": str(e),
            }
