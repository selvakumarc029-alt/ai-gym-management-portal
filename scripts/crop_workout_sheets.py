from pathlib import Path

from PIL import Image, ImageStat


ASSET_DIR = Path(__file__).resolve().parents[1] / "assets" / "workout-demo"

SHEETS = {
    "push-power-contact-sheet.png": [
        "barbell-bench-press",
        "dumbbell-shoulder-press",
        "incline-dumbbell-press",
        "cable-triceps-pushdown",
    ],
    "pull-posture-contact-sheet.png": [
        "lat-pulldown",
        "seated-cable-row",
        "face-pull",
        "dumbbell-biceps-curl",
    ],
    "leg-development-contact-sheet.png": [
        "leg-press",
        "bulgarian-split-squat",
        "leg-extension",
        "lying-leg-curl",
    ],
    "core-conditioning-contact-sheet.png": [
        "front-plank",
        "dead-bug",
        "mountain-climber",
        "hanging-leg-raise",
    ],
}


def line_brightness(image: Image.Image, axis: str, position: int) -> float:
    if axis == "x":
        sample = image.crop((position, 0, min(position + 2, image.width), image.height))
    else:
        sample = image.crop((0, position, image.width, min(position + 2, image.height)))
    return sum(ImageStat.Stat(sample).mean) / 3


def darkest_near(image: Image.Image, axis: str, expected: int, radius: int = 28) -> int:
    limit = image.width if axis == "x" else image.height
    candidates = range(max(1, expected - radius), min(limit - 2, expected + radius + 1))
    return min(candidates, key=lambda value: line_brightness(image, axis, value))


def crop_sheet(sheet_name: str, exercise_names: list[str]) -> None:
    image = Image.open(ASSET_DIR / sheet_name).convert("RGB")
    x_separator = darkest_near(image, "x", image.width // 2)
    y_separators = [darkest_near(image, "y", image.height * index // 4) for index in range(1, 4)]

    x_ranges = [(2, x_separator - 3), (x_separator + 4, image.width - 2)]
    y_edges = [2] + [separator + 4 for separator in y_separators]
    y_ends = [separator - 3 for separator in y_separators] + [image.height - 2]

    for row, exercise_name in enumerate(exercise_names):
        for column, suffix in enumerate(("start", "end")):
            left, right = x_ranges[column]
            top, bottom = y_edges[row], y_ends[row]
            output = ASSET_DIR / f"{exercise_name}-{suffix}.png"
            image.crop((left, top, right, bottom)).save(output, optimize=True)
            print(f"{output.name}: {right - left}x{bottom - top}")


for filename, names in SHEETS.items():
    crop_sheet(filename, names)
