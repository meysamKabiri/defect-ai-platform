import uuid

import cv2
from app.core.config import settings


class AnnotationService:

    async def annotate_image(
        self,
        image_path: str,
        detections: list,
    ):

        image = cv2.imread(image_path)

        for detection in detections:

            bbox = detection["bbox"]

            x1 = int(bbox["x1"])
            y1 = int(bbox["y1"])
            x2 = int(bbox["x2"])
            y2 = int(bbox["y2"])

            class_name = detection["class_name"]

            confidence = detection["confidence"]

            label = f"{class_name} " f"{confidence:.2f}"

            color = (0, 255, 0)

            cv2.rectangle(
                image,
                (x1, y1),
                (x2, y2),
                color,
                2,
            )

            cv2.putText(
                image,
                label,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2,
            )

        settings.output_path.mkdir(parents=True, exist_ok=True)

        output_filename = f"{uuid.uuid4()}.jpg"

        output_path = settings.output_path / output_filename

        cv2.imwrite(
            str(output_path),
            image,
        )

        return {
            "output_filename": output_filename,
            "output_path": str(output_path),
            "output_url": (f"/outputs/{output_filename}"),
        }
