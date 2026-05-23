from app.core.job_store import update_job
from app.ml.yolo_detector import run_detection
import time
import traceback


class DetectionPipelineService:

    def process_detection(
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
            start_time = time.time()

            detection_result = run_detection(
                image_path=image_path,
                output_filename=f"{job_id}.jpg",
            )
            print("------detection_result-------")
            print(detection_result)
            print("------detection_result-------")
            processing_time = round(
                time.time() - start_time,
                2,
            )
            print(detection_result, processing_time)
            update_job(
                job_id,
                {
                    "status": "completed",
                    "image_url": file_url,
                    "result": detection_result,
                    "processing_time_seconds": processing_time,
                },
            )

            return detection_result

        except Exception as e:

            print(traceback.format_exc())

            update_job(
                job_id,
                {
                    "status": "failed",
                    "error": str(e),
                },
            )

            raise
