from PIL import Image
import os

files = [
    "frontend/static/images/examplePageModel.jpg",
]

output_format = "webp"
output_dir = "frontend/static/images/converted"
os.makedirs(output_dir, exist_ok=True)

target_width = 800

for i, file in enumerate(files):
    with Image.open(file) as img:
        # Calculate the new height to maintain aspect ratio
        width_percent = target_width / float(img.width)
        target_height = int(img.height * width_percent)
        resized_img = img.resize((target_width, target_height), Image.LANCZOS)

        # Build the new filename
        filename_no_ext = os.path.splitext(os.path.basename(file))[0]
        new_path = os.path.join(output_dir, f"{filename_no_ext}.{output_format}")

        # Save in chosen format
        resized_img.save(new_path, format=output_format.upper())

        print(f"Saved: {new_path}")