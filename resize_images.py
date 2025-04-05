from PIL import Image
import os

files = [
    "frontend/static/images/blueCheck.png",
    "frontend/static/images/warning.png",
    "frontend/static/images/failure.png",
]

output_format = "png"  # or "avif"
output_dir = "frontend/static/images/converted"
os.makedirs(output_dir, exist_ok=True)

target_size = 50

for i, file in enumerate(files):
    with Image.open(file) as img:
        # Maintain aspect ratio by calculating the new width
        resized_img = img.resize((target_size, target_size), Image.LANCZOS)

        # Build the new filename
        filename_no_ext = os.path.splitext(os.path.basename(file))[0]
        new_path = os.path.join(output_dir, f"{filename_no_ext}.{output_format}")

        # Save in chosen format
        resized_img.save(new_path, format=output_format.upper())

        print(f"Saved: {new_path}")