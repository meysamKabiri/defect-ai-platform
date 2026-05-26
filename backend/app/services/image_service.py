import os
import uuid
from pathlib import Path

from fastapi import UploadFile
from app.core.config import settings


class ImageService:

    ALLOWED_EXTENSIONS = {
        ".jpg",
        ".jpeg",
        ".png",
    }

    def validate_extension(
        self,
        filename: str,
    ):

        extension = os.path.splitext(filename)[1].lower()

        if extension not in self.ALLOWED_EXTENSIONS:
            raise ValueError("Invalid image format")

    async def save_image(
        self,
        file: UploadFile,
        upload_dir: str | None = None,
    ):

        self.validate_extension(file.filename)
        upload_path = (
            settings.resolve_backend_path(upload_dir)
            if upload_dir is not None
            else settings.upload_path
        )

        upload_path.mkdir(parents=True, exist_ok=True)

        extension = os.path.splitext(file.filename)[1]

        unique_filename = f"{uuid.uuid4()}{extension}"

        file_path = Path(upload_path) / unique_filename

        contents = await file.read()

        with open(file_path, "wb") as f:
            f.write(contents)

        return {
            "filename": unique_filename,
            "file_path": str(file_path),
            "file_url": f"/uploads/{unique_filename}",
        }
