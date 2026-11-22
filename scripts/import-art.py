#!/usr/bin/env python3
"""Shrinks raw artwork (1024px PNGs) into a game's assets folder.

  python3 scripts/import-art.py <raw-dir> <game-id>

File names become asset keys: raw/biz_food_truck.png -> "asset:biz_food_truck".
Sizes: hero 512, char_* 512, everything else 256. Then add each key to
"assets" in game.json (npm run validate reports any that are missing).
"""
import sys, os
from PIL import Image

raw, game = sys.argv[1], sys.argv[2]
out = os.path.join(os.path.dirname(__file__), '..', 'games', game, 'assets')
os.makedirs(out, exist_ok=True)
for f in sorted(os.listdir(raw)):
    if not f.lower().endswith('.png'):
        continue
    key = f[:-4]
    size = 512 if key == 'hero' or key.startswith('char_') else 256
    im = Image.open(os.path.join(raw, f)).convert('RGBA')
    box = im.getbbox()  # trim transparent margins so art fills its slot
    if box:
        im = im.crop(box)
    side = max(im.size)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    sq.resize((size, size), Image.LANCZOS).save(os.path.join(out, key + '.png'), optimize=True)
    print(f'{key}: {size}px, {os.path.getsize(os.path.join(out, key + ".png")) // 1024} KB')
