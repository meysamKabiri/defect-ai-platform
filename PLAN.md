## Plan: Backend ML Inference Refactor

TL;DR: Centralize YOLO inference in a dedicated backend/app/ml/yolo_detector.py module, update the detection pipeline service to use it, add pydantic response schemas for detection jobs, and clean up duplicate inference code.

**Steps**
1. Create backend/app/ml/yolo_detector.py.
   - Load the YOLO model globally once.
   - Define the defect class mapping.
   - Implement a reusable detection function that:
     - runs inference on an image path,
     - extracts bounding boxes, class labels, confidence, and normalized box data,
     - saves an annotated output image,
     - returns structured detection results and the annotated image URL.
2. Update backend/app/services/detection_pipeline_service.py.
   - Remove model loading and inference logic.
   - Import and call the new detector module.
   - Keep job lifecycle handling (queued, processing, completed, failed).
   - Ensure outputs are written to the same outputs static mount path.
3. Add or extend backend schemas.
   - Create backend/app/schemas/detection.py or extend backend/app/schemas/upload.py.
   - Define Detection and job response models such as DetectionJobResponse.
   - Use these schemas in the FastAPI route return annotations.
4. Update backend/app/api/routes/detection.py.
   - Add response model annotations for upload and job endpoints.
   - Keep UploadService and job polling flow unchanged.
5. Clean duplicate code and housekeeping.
   - Remove or deprecate backend/app/services/yolo_service.py if it is unused.
   - Keep backend/app/services/image_service.py unchanged unless you want to centralize upload directory config.
   - Confirm main.py already mounts /uploads and /outputs correctly.

**Relevant files**
- backend/app/ml/yolo_detector.py — new ML inference layer.
- backend/app/services/detection_pipeline_service.py — update to use the ML layer.
- backend/app/api/routes/detection.py — add response schemas.
- backend/app/schemas/upload.py or backend/app/schemas/detection.py — new schema definitions.
- backend/app/services/yolo_service.py — duplicate inference module to remove.
- backend/app/main.py — verify static mounts remain correct.

**Verification**
1. Start the backend and verify the API is reachable at /api/v1/detect/upload and /api/v1/detect/jobs/{job_id}.
2. Upload a supported image and confirm the job enters queued then completed.
3. Confirm the returned annotated_image_url loads the saved annotated image from /outputs.
4. Validate the detection payload contains class labels, confidence, and bbox attributes.
5. Optionally add a simple unit test for the new detector function using a sample image path.

**Decisions**
- Focus this phase on clean architecture rather than changing frontend behavior.
- Keep the existing background task and in-memory job store as-is.
- Use the model path and outputs path relative to the backend package, matching current static mounts.

**Further Considerations**
1. In a later phase, move configuration into backend/app/core/config.py and use environment variables for MODEL_PATH and OUTPUT_DIR.
2. Add persistent job storage and a more robust status model when moving beyond the in-memory store.

**Next Phase Options**
1. Production backend: add Redis queue + persistent job store with MySQL, decouple inference into a worker service, and wire up Docker Compose worker/api flow.
2. ML pipeline: add model monitoring, confidence threshold tuning, and a training script for YOLO dataset conversion with evaluation metrics.
3. Frontend polish: add error states, retry/polling resilience, live job history, and an end-to-end status dashboard.

**Recommended next step**
- Implement the full queue/worker architecture using Redis + MySQL because the repo already has Docker Compose definitions and that will move your platform from a prototype to a production-style system.
