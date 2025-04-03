from PIL import Image

files = [
    "frontend/static/images/landing1.png",
    "frontend/static/images/landing2.png",
    "frontend/static/images/landing3.png",
    "frontend/static/images/landing4.jpg",
    "frontend/static/images/landing5.avif",
    "frontend/static/images/landing6.png",
    "frontend/static/images/landing7.webp",
    "frontend/static/images/landing8.webp",
    "frontend/static/images/landing9.jpg",
]

idx_to_size = {
    0: (),
    1: (),
    2: (),
    3: (),
    4: (),
    5: (),
    6: (),
    7: (),
    8: (),
}

for i, file in enumerate(files):
    with Image.open(file) as img:
        new_size = idx_to_size[i]
        img = img.resize(new_size, Image.Resampling.LANCZOS)