#!/usr/bin/env python3
"""
Turn a portrait photo into the "sticker cutout" style used by
JoshuaOoi-cutout.png / JustinLee-cutout.png / GhaYuanNg-cutout.png:

  1. Remove the background (transparent PNG).
  2. Add a thick white stroke around the subject silhouette.
  3. Save both PNG (source) and WebP (browser-optimized).

Usage:
    python3 scripts/make-cutout.py <input_image_path> <output_name>

Example:
    python3 scripts/make-cutout.py raw/aidan.jpg AidanLee

Outputs:
    public/headshots/AidanLee-cutout.png
    public/headshots/AidanLee-cutout.webp
"""

import sys
import os
from pathlib import Path

try:
    from rembg import remove, new_session
except ImportError:
    print("ERROR: rembg not installed. Run: pip3 install rembg[cpu] --break-system-packages")
    sys.exit(1)

from PIL import Image, ImageFilter, ImageChops
import io


def make_cutout(input_path: str, output_name: str, stroke_px: int = 14) -> None:
    input_path = Path(input_path)
    if not input_path.exists():
        print(f"ERROR: input not found: {input_path}")
        sys.exit(1)

    project_root = Path(__file__).resolve().parent.parent
    headshots = project_root / "public" / "headshots"
    headshots.mkdir(parents=True, exist_ok=True)

    # 1. Remove background using rembg. `isnet-general-use` is more accurate
    #    on portraits than the default u2net model. If model download fails,
    #    falls back to default.
    print(f"Reading {input_path} ...")
    raw_bytes = input_path.read_bytes()

    try:
        session = new_session("isnet-general-use")
    except Exception:
        session = new_session()

    print("Removing background ...")
    cut_bytes = remove(raw_bytes, session=session)
    cut = Image.open(io.BytesIO(cut_bytes)).convert("RGBA")

    # 2. Build a white stroke. Take the alpha channel, dilate it by
    #    `stroke_px`, and composite a white layer into the dilated region
    #    *behind* the original cutout.
    print(f"Adding {stroke_px}px white stroke ...")
    alpha = cut.split()[-1]

    # Dilate alpha by stroke_px. MaxFilter approximates a square dilation;
    # a GaussianBlur + threshold gives a rounder, smoother stroke.
    dilated = alpha.filter(ImageFilter.GaussianBlur(radius=stroke_px * 0.9))
    # Threshold everything that was even slightly inside the blur cloud.
    dilated = dilated.point(lambda v: 255 if v > 12 else 0)

    # The stroke mask is dilated MINUS original alpha.
    original_mask = alpha.point(lambda v: 255 if v > 0 else 0)
    stroke_mask = ImageChops.subtract(dilated, original_mask)

    # Compose: white layer where stroke_mask is set, then paste cutout on top.
    w, h = cut.size
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    white_layer = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    canvas.paste(white_layer, (0, 0), stroke_mask)
    canvas.alpha_composite(cut)

    # 3. Save both PNG and WebP.
    png_out = headshots / f"{output_name}-cutout.png"
    webp_out = headshots / f"{output_name}-cutout.webp"

    canvas.save(png_out, "PNG", optimize=True)
    # WebP with quality 85 is a good tradeoff for transparent portrait cutouts.
    canvas.save(webp_out, "WEBP", quality=85, method=6)

    print(f"OK  {png_out}  ({png_out.stat().st_size // 1024} KB)")
    print(f"OK  {webp_out}  ({webp_out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    stroke = int(os.environ.get("STROKE_PX", "14"))
    make_cutout(sys.argv[1], sys.argv[2], stroke_px=stroke)
