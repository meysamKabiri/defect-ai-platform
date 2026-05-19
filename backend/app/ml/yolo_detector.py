from pathlib import Path
import uuid

import cv2
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = BASE_DIR / "app" / "models" / "best.pt"
OUTPUT_DIR = BASE_DIR / "outputs"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CLASS_NAMES = {
    0: "crazing",
    1: "inclusion",
    2: "patches",
    3: "pitted_surface",
    4: "rolled-in_scale",
    5: "scratches",
}

model = YOLO(str(MODEL_PATH))


def run_detection(image_path: str, output_filename: str | None = None) -> dict:
    results = model(image_path)
    result = results[0]

    detections = []
    for box in result.boxes:
        cls_id = int(box.cls[0])
        confidence = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()

        detections.append(
            {
                "id": str(uuid.uuid4()),
                "label": CLASS_NAMES.get(cls_id, "unknown"),
                "confidence": confidence,
                "x": x1,
                "y": y1,
                "width": x2 - x1,
                "height": y2 - y1,
            }
        )

    if output_filename is None:
        output_filename = f"{uuid.uuid4()}.jpg"

    output_path = OUTPUT_DIR / output_filename
    plotted_image = result.plot()
    cv2.imwrite(str(output_path), plotted_image)

    return {
        "detections": detections,
        "annotated_image_url": f"/outputs/{output_filename}",
    }
