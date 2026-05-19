# from pathlib import Path
# import uuid
# import cv2

# from ultralytics import YOLO

# from app.core.job_store import jobs

# MODEL_PATH = (
#     Path(__file__).resolve().parents[3]
#     / "ml"
#     / "runs"
#     / "detect"
#     / "train"
#     / "weights"
#     / "best.pt"
# )

# model = YOLO(str(MODEL_PATH))


# CLASS_NAMES = {
#     0: "crazing",
#     1: "inclusion",
#     2: "patches",
#     3: "pitted_surface",
#     4: "rolled-in_scale",
#     5: "scratches",
# }


# class DetectionPipelineService:

#     async def process_detection(
#         self,
#         job_id: str,
#         image_path: str,
#         file_url: str,
#     ):

#         try:

#             jobs[job_id]["status"] = "processing"

#             results = model(image_path)

#             result = results[0]

#             detections = []

#             for box in result.boxes:

#                 cls_id = int(box.cls[0])

#                 confidence = float(box.conf[0])

#                 x1, y1, x2, y2 = box.xyxy[0].tolist()

#                 detections.append(
#                     {
#                         "id": str(uuid.uuid4()),
#                         "label": CLASS_NAMES.get(
#                             cls_id,
#                             "unknown",
#                         ),
#                         "confidence": confidence,
#                         "x": x1,
#                         "y": y1,
#                         "width": x2 - x1,
#                         "height": y2 - y1,
#                     }
#                 )

#             outputs_dir = Path(__file__).resolve().parents[2] / "outputs"

#             outputs_dir.mkdir(
#                 exist_ok=True,
#             )

#             output_filename = f"{job_id}.jpg"

#             output_path = outputs_dir / output_filename

#             plotted_image = result.plot()

#             cv2.imwrite(
#                 str(output_path),
#                 plotted_image,
#             )

#             jobs[job_id] = {
#                 "status": "completed",
#                 "detections": detections,
#                 "image_url": file_url,
#                 "annotated_image_url": f"/outputs/{output_filename}",
#             }

#         except Exception as e:

#             jobs[job_id] = {
#                 "status": "failed",
#                 "error": str(e),
#             }


from app.core.job_store import jobs
from app.ml.yolo_detector import run_detection


class DetectionPipelineService:
    async def process_detection(
        self,
        job_id: str,
        image_path: str,
        file_url: str,
    ):
        try:
            jobs[job_id]["status"] = "processing"

            detection_result = run_detection(
                image_path=image_path,
                output_filename=f"{job_id}.jpg",
            )

            jobs[job_id] = {
                "status": "completed",
                "detections": detection_result["detections"],
                "image_url": file_url,
                "annotated_image_url": detection_result["annotated_image_url"],
            }

        except Exception as e:
            jobs[job_id] = {
                "status": "failed",
                "error": str(e),
            }
