"""PLACEHOLDER icon, adaptive icon and splash of the scrapyard game (games/scrap-yard), drawn from
nothing by these few lines (never a copy of another game's files). The art package replaces them.

    python3 scripts/art/scrap-yard-placeholder.py
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'games', 'scrap-yard')
BG, RUST, STEEL, INK, PAPER = (58, 54, 49), (184, 115, 51), (126, 138, 147), (43, 38, 34), (244, 238, 220)


def mark(d, cx, cy, s):
    """A stack of three flat slabs (rust, steel, rust) with a hook above: a placeholder mark."""
    for i, col in enumerate((RUST, STEEL, RUST)):
        y = cy + s * (0.28 - i * 0.22)
        d.rounded_rectangle([cx - s * (0.42 - i * 0.05), y - s * 0.09, cx + s * (0.42 - i * 0.05), y + s * 0.09], radius=s * 0.03, fill=col, outline=INK, width=max(2, int(s * 0.025)))
    d.line([cx, cy - s * 0.55, cx, cy - s * 0.3], fill=INK, width=max(3, int(s * 0.04)))
    d.arc([cx - s * 0.08, cy - s * 0.34, cx + s * 0.08, cy - s * 0.18], 0, 200, fill=INK, width=max(3, int(s * 0.04)))


icon = Image.new('RGB', (1024, 1024), BG)
d = ImageDraw.Draw(icon)
mark(d, 512, 560, 900)
d.text((40, 40), 'PLACEHOLDER', fill=PAPER)
icon.save(os.path.join(OUT, 'icon.png'))

fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
mark(ImageDraw.Draw(fg), 512, 560, 560)
fg.save(os.path.join(OUT, 'adaptive-icon.png'))

splash = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
mark(ImageDraw.Draw(splash), 512, 560, 700)
splash.save(os.path.join(OUT, 'splash.png'))
