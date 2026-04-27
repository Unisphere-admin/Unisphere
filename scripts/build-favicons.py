"""
Generate favicon assets from public/logo.png:
  - src/app/favicon.ico    (multi-size: 16, 32, 48)
  - src/app/icon.png       (192x192, used as <link rel="icon">)
  - src/app/apple-icon.png (180x180, used as apple-touch-icon)

Each output is the logo centered on a WHITE square with ~14% inner padding,
so the logo doesn't crowd the rounded-corner mask Chrome puts around tab icons.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "logo.png"

assert SRC.exists(), f"missing source: {SRC}"

logo = Image.open(SRC).convert("RGBA")


def square(size: int, pad_pct: float = 0.14) -> Image.Image:
    """Return a `size x size` PNG: white background, logo centered with padding."""
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    inner = int(size * (1 - 2 * pad_pct))
    # Resize the logo so the LONGER side fits `inner`, preserving aspect.
    lw, lh = logo.size
    if lw >= lh:
        new_w = inner
        new_h = int(round(lh * inner / lw))
    else:
        new_h = inner
        new_w = int(round(lw * inner / lh))
    resized = logo.resize((new_w, new_h), Image.LANCZOS)
    # Centre it.
    x = (size - new_w) // 2
    y = (size - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


# 192x192 generic icon
icon_png = square(192)
icon_png.save(ROOT / "src/app/icon.png", format="PNG", optimize=True)
print(f"wrote src/app/icon.png ({icon_png.size})")

# 180x180 Apple touch icon
apple = square(180)
apple.save(ROOT / "src/app/apple-icon.png", format="PNG", optimize=True)
print(f"wrote src/app/apple-icon.png ({apple.size})")

# Multi-size .ico for browser tab. PIL's .ico writer accepts a sizes list and
# will downscale the source image for each entry.
ico_master = square(256)
ico_master.save(
    ROOT / "src/app/favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
)
print("wrote src/app/favicon.ico (16, 32, 48, 64)")
