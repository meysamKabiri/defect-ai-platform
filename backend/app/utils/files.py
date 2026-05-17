import os
import uuid

from fastapi import UploadFile

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
}


def validate_image_extension(filename: str):
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Invalid image format")


async def save_upload_file(
    file: UploadFile,
    upload_dir: str,
):
    os.makedirs(upload_dir, exist_ok=True)

    extension = os.path.splitext(file.filename)[1]

    unique_filename = f"{uuid.uuid4()}{extension}"

    file_path = os.path.join(
        upload_dir,
        unique_filename,
    )

    contents = await file.read()

    with open(file_path, "wb") as f:
        f.write(contents)

    return unique_filename, file_path
