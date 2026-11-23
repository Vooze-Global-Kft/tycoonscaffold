#!/usr/bin/env python3
"""
Android notification icons: games/<id>/notification-icon.png, 96 x 96, white on transparent.

Android draws a notification's small icon from the alpha channel only, in one colour, at 24 dp, so
an app icon will not do (a full-colour icon shows as a white square). Each game gets its own
glyph, drawn here with Pillow (4x supersampled): a paper lantern for Lantern Row, a pizza slice for
Pizza Empire, a ringed rock for Orbit Haulers. app.config.ts hands the file to the
expo-notifications plugin when it exists.

    python3 scripts/art/notification-icons.py
"""
import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SIZE = 96
SS = 4  # supersampling
N = SIZE * SS
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)


def canvas():
    im = Image.new('RGBA', (N, N), CLEAR)
    return im, ImageDraw.Draw(im)


def u(v):
    """A length in 96ths of the icon."""
    return v * SS


def lantern():
    im, d = canvas()
    # The cord and its loop.
    d.line([(u(48), u(6)), (u(48), u(18))], fill=WHITE, width=u(4))
    # Top and bottom caps.
    d.rounded_rectangle([u(34), u(16), u(62), u(25)], radius=u(3), fill=WHITE)
    d.rounded_rectangle([u(36), u(72), u(60), u(80)], radius=u(3), fill=WHITE)
    # The paper body, with two ribs cut out so it reads as a lantern at 24 dp.
    d.ellipse([u(18), u(22), u(78), u(76)], fill=WHITE)
    d.arc([u(34), u(20), u(62), u(78)], start=0, end=360, fill=CLEAR, width=u(3))
    # The tassel.
    d.line([(u(48), u(80)), (u(48), u(92))], fill=WHITE, width=u(4))
    return im


def slice_():
    im, d = canvas()
    tip = (u(48), u(90))
    left = (u(14), u(24))
    right = (u(82), u(24))
    d.polygon([left, right, tip], fill=WHITE)
    # The crust: a thick arc over the top edge.
    d.rounded_rectangle([u(8), u(10), u(88), u(26)], radius=u(8), fill=WHITE)
    # A gap between crust and slice, then three toppings cut out.
    d.line([(u(14), u(29)), (u(82), u(29))], fill=CLEAR, width=u(3))
    for cx, cy, r in [(36, 42, 6), (58, 46, 6), (47, 64, 5)]:
        d.ellipse([u(cx - r), u(cy - r), u(cx + r), u(cy + r)], fill=CLEAR)
    return im


def rock():
    im, d = canvas()
    # A faceted rock (an irregular hexagon).
    cx, cy, r = 48, 50, 27
    pts = []
    for i, k in enumerate([1.0, 0.86, 1.0, 0.92, 1.0, 0.84]):
        a = math.radians(60 * i - 20)
        pts.append((u(cx + r * k * math.cos(a)), u(cy + r * k * math.sin(a))))
    d.polygon(pts, fill=WHITE)

    def ring(width, grow=0):
        layer = Image.new('RGBA', (N, N), CLEAR)
        ld = ImageDraw.Draw(layer)
        ld.ellipse([u(3 - grow), u(40 - grow), u(93 + grow), u(60 + grow)], outline=WHITE, width=u(width))
        return layer.rotate(24, resample=Image.BICUBIC, center=(u(48), u(50)))

    # The route round it: a tilted ring in front of the rock, with a clear gap either side of the
    # line so it still reads in one colour.
    gap = ring(12, grow=3.5).split()[3]
    alpha = Image.composite(Image.new('L', (N, N), 0), im.split()[3], gap)
    im.putalpha(alpha)
    im = Image.alpha_composite(im, ring(5))
    # A drone on the route: a dot where the ring comes round at the upper right.
    d2 = ImageDraw.Draw(im)
    d2.ellipse([u(78), u(14), u(91), u(27)], fill=WHITE)
    return im


GLYPHS = {'night-market': lantern, 'pizza-empire': slice_, 'space-miner': rock}

for game, draw in GLYPHS.items():
    out = draw().resize((SIZE, SIZE), Image.LANCZOS)
    # One colour only: every visible pixel is pure white, the shape is in the alpha channel.
    a = out.split()[3]
    flat = Image.new('RGBA', (SIZE, SIZE), WHITE)
    flat.putalpha(a)
    path = os.path.join(ROOT, 'games', game, 'notification-icon.png')
    flat.save(path, optimize=True)
    print('wrote', os.path.relpath(path, ROOT))
