import os
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path

CLASSES = [
    "crazing",
    "inclusion",
    "patches",
    "pitted_surface",
    "rolled-in_scale",
    "scratches",
]

CLASS_TO_ID = {name: idx for idx, name in enumerate(CLASSES)}

BASE_DIR = Path("../datasets/neu")

OUTPUT_DIR = Path("../datasets/neu-yolo")


def convert_box(size, box):
    dw = 1.0 / size[0]
    dh = 1.0 / size[1]

    x = (box[0] + box[1]) / 2.0
    y = (box[2] + box[3]) / 2.0

    w = box[1] - box[0]
    h = box[3] - box[2]

    x *= dw
    w *= dw
    y *= dh
    h *= dh

    return x, y, w, h


def process_split(split_name, output_split):
    annotations_dir = BASE_DIR / split_name / "annotations"

    output_images_dir = OUTPUT_DIR / "images" / output_split

    output_labels_dir = OUTPUT_DIR / "labels" / output_split

    output_images_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_labels_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    for xml_file in annotations_dir.glob("*.xml"):

        tree = ET.parse(xml_file)
        root = tree.getroot()

        filename = Path(root.find("filename").text).stem

        size = root.find("size")

        width = int(size.find("width").text)
        height = int(size.find("height").text)

        image_found = False
        image_path = None

        possible_extensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".bmp",
        ]

        for class_name in CLASSES:

            for ext in possible_extensions:

                possible_path = (
                    BASE_DIR / split_name / "images" / class_name / f"{filename}{ext}"
                )

                if possible_path.exists():
                    image_path = possible_path
                    image_found = True
                    break

            if image_found:
                break

        if not image_found:
            print(f"Image not found: {filename}")
            continue

        shutil.copy(
            image_path,
            output_images_dir / image_path.name,
        )
        stem = Path(image_path).stem

        label_path = output_labels_dir / f"{stem}.txt"

        with open(label_path, "w") as f:

            for obj in root.findall("object"):

                class_name = obj.find("name").text

                if class_name not in CLASS_TO_ID:
                    continue

                class_id = CLASS_TO_ID[class_name]

                xml_box = obj.find("bndbox")

                xmin = float(xml_box.find("xmin").text)
                xmax = float(xml_box.find("xmax").text)
                ymin = float(xml_box.find("ymin").text)
                ymax = float(xml_box.find("ymax").text)

                bb = convert_box(
                    (width, height),
                    (
                        xmin,
                        xmax,
                        ymin,
                        ymax,
                    ),
                )

                f.write(f"{class_id} " + " ".join(str(round(a, 6)) for a in bb) + "\n")


process_split("train", "train")
process_split("validation", "val")

print("Conversion completed.")
