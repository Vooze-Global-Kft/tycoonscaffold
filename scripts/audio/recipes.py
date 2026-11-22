"""One recipe per key of src/services/fx/catalog.ts.

A recipe says what happens and when: which notes, which envelopes, which
layers. It never says what the notes are played on; that is the pack's job
(packs.py), so the same recipes render the warm pack, the synth pack and any
future one. Notes are written in C (the reference key) and transposed by the
pack.

Rules of thumb used throughout (see docs/design/audio-notes.md):
  - only the five notes C D E G A, so any two sounds harmonise by accident;
  - rewards rise in pitch and end in a sparkle tail;
  - big moments are three layers: a low thump, a mid chord, a high sparkle;
  - something audible happens at t = 0, where the haptic fires. `c.accent(t)`
    records the other moments worth a vibration.
"""
from __future__ import annotations

import numpy as np

from dsp import SR, TAU, Mix, cents, glide, lowpass, ns, points, rcos_in, rcos_out, rng_for

RECIPES = {}


def recipe(name, length=None, stream_ms=None):
    """Register a recipe.

    length     seconds; the mastering stage ends the file there with a long
               fade, which keeps tails musical and the pack small.
    stream_ms  for sounds that are only ever heard as a rapid stream
               (typewriter blips): loudness is measured on the sound repeated
               at this interval instead of on a single shot.
    """
    def deco(fn):
        fn.length = length
        fn.stream_ms = stream_ms
        RECIPES[name] = fn
        return fn
    return deco


class Ctx:
    """What a recipe gets: the pack, the variant index and a private random stream."""

    def __init__(self, pack, key, i=1, n=1):
        self.p, self.key, self.i, self.n = pack, key, i, n
        self.rng = rng_for(pack.name, key, i)
        self.accents = []
        self.floor_db = -50.0       # where the tail is cut, relative to the peak
        self.length = None          # set by the recipe (or its decorator) to cap the file length

    def accent(self, *times):
        self.accents.extend(float(t) for t in times)

    def sub(self, tag):
        return rng_for(self.p.name, self.key, self.i, tag)


# ---- small shared gestures --------------------------------------------------

def strum(c, m, notes, at=0.0, gap=0.007, inst='pluck', gain=1.0, **kw):
    """A chord rolled bottom to top, a few ms per note."""
    for j, nt in enumerate(notes):
        m.add(getattr(c.p, inst)(c.p.hz(nt), rng=c.rng, **kw), at + j * gap, gain)


def run(c, m, notes, at=0.0, step=0.06, inst='pluck', gain=1.0, cresc=0.0, **kw):
    """Notes one after another; `cresc` raises the level along the way."""
    for j, nt in enumerate(notes):
        g = gain * (1.0 + cresc * j / max(len(notes) - 1, 1))
        m.add(getattr(c.p, inst)(c.p.hz(nt), rng=c.rng, **kw), at + j * step, g)


def scatter(rng, count):
    """`count` times in 0..1, one per equal slot with jitter: random but never clumped."""
    return (np.arange(count) + rng.uniform(0.1, 0.9, count)) / count


def tremolo(x, rate=7.0, depth=0.25, start=0.0):
    t = np.arange(len(x)) / SR
    return x * (1.0 - depth * 0.5 * (1.0 - np.cos(TAU * rate * np.maximum(t - start, 0.0))))


# ===========================================================================
# interface
# ===========================================================================

@recipe('ui_tap')
def ui_tap(c):
    """Tiny soft pop, about 40 ms: a sine bubble falling a fourth onto the key note."""
    c.accent(0.0)
    return c.p.pop(c.p.hz('G5'), c.p.hz('C5'), tau=0.0065, drop=0.012, puff=0.08, hold=0.007, rng=c.rng)


@recipe('ui_tab', length=0.1)
def ui_tab(c):
    """Two soft wooden ticks a fourth apart, 50 ms between them."""
    p, m = c.p, Mix()
    m.add(p.knock(p.hz('E5'), 0.8, tau=0.009, tone=0.5, rng=c.rng), 0.0)
    m.add(p.knock(p.hz('A5'), 1.0, tau=0.011, tone=0.5, rng=c.rng), 0.050)
    c.accent(0.0, 0.050)
    return lowpass(m.out(), 3400.0, 2)


@recipe('ui_open', length=0.135)
def ui_open(c):
    """Upward whoosh that ends in a small rising pop."""
    p, m = c.p, Mix()
    dur = 0.105
    env = points([(0, 0), (0.012, 0.3), (0.085, 1.0), (dur, 0)], ns(dur))
    m.add(p.whoosh(dur, [(0, 450.0), (dur, 3000.0)], q=1.3, env=env, air=0.25, rng=c.rng), 0.0, 0.75)
    m.add(p.pop(p.hz('E5'), p.hz('A5'), tau=0.011, drop=0.008, puff=0.0, rng=c.rng), 0.076)
    c.accent(0.0, 0.076)
    return m.out()


@recipe('ui_close', length=0.125)
def ui_close(c):
    """The mirror image: a falling pop, then the whoosh drops away."""
    p, m = c.p, Mix()
    dur = 0.115
    env = points([(0, 0), (0.012, 1.0), (0.05, 0.6), (dur, 0)], ns(dur))
    m.add(p.pop(p.hz('A5'), p.hz('E5'), tau=0.011, drop=0.008, puff=0.0, rng=c.rng), 0.0)
    m.add(p.whoosh(dur, [(0, 2800.0), (dur, 420.0)], q=1.3, env=env, air=0.25, rng=c.rng), 0.004, 0.75)
    c.accent(0.0)
    return m.out()


@recipe('ui_denied', length=0.28)
def ui_denied(c):
    """Dull low double bonk, a minor third down ("uh-uh"), low-passed so it never bites."""
    p, m = c.p, Mix()
    m.add(p.knock(p.hz('G3'), 1.0, tau=0.038, tone=0.45, rng=c.rng), 0.0)
    m.add(p.knock(p.hz('E3'), 0.85, tau=0.042, tone=0.45, rng=c.rng), 0.115)
    c.accent(0.0, 0.115)
    return lowpass(m.out(), 1500.0, 2)


@recipe('hint', length=0.26)
def hint(c):
    """A breathy 'ps' into a soft two-note pluck."""
    p, m = c.p, Mix()
    m.add(p.shaker(0.8, fc=3600.0, q=0.9, attack_ms=12.0, tau=0.012, rng=c.rng), 0.0)
    m.add(p.tine(p.hz('E6'), 0.9, ring=0.3, rng=c.rng), 0.032)
    m.add(p.tine(p.hz('G6'), 0.45, ring=0.25, rng=c.rng), 0.090)
    c.accent(0.032)
    return m.out()


# ===========================================================================
# tapping and combo
# ===========================================================================

@recipe('tap')
def tap(c):
    """The combo ladder: one plucked note per file, climbing the pentatonic
    scale from C5 (eight steps reach E6, a tenth higher). Higher steps are a
    touch brighter, so a streak also opens up in tone."""
    k = c.i - 1
    c.accent(0.0)
    c.length = max(0.22 - 0.01 * k, 0.12)
    return c.p.pluck(c.p.penta('C5', k), ring=0.05, bright=0.9 + 0.04 * k, rng=c.rng)


@recipe('combo_up', length=0.4)
def combo_up(c):
    """Three notes up (G C E), each with a glint an octave above, then a short sparkle."""
    p, m = c.p, Mix()
    step = 0.065
    for j, nt in enumerate(('G5', 'C6', 'E6')):
        m.add(p.pluck(p.hz(nt), 0.9 + 0.05 * j, ring=0.22, bright=1.1, rng=c.rng), j * step)
        m.add(p.bell(p.hz(nt) * 2.0, 0.26, ring=0.3, kind='tiny', rng=c.rng), j * step)
    m.add(p.sparkle(0.2, c.sub('sparkle'), density=48.0, lo='E7', hi='E8'), 0.16, 0.5)
    c.accent(0.0, step, 2 * step)
    return p.verb(m.out(), 0.10, tail=0.15)


@recipe('combo_max', length=0.65)
def combo_max(c):
    """Five-note flourish (C E G C E) into a rolled chord, a thump underneath, sparkle on top."""
    p, m = c.p, Mix()
    step = 0.052
    m.add(p.thump(0.7, f0=150.0, f1=62.0, tau=0.07, rng=c.rng), 0.0)
    run(c, m, ('C5', 'E5', 'G5', 'C6', 'E6'), 0.0, step, 'pluck', 0.8, cresc=0.3, ring=0.25, bright=1.1)
    last = 5 * step
    strum(c, m, ('C6', 'E6', 'G6'), last, 0.006, 'bell', 0.5, ring=0.45, kind='hand')
    m.add(p.pluck(p.hz('C6'), 1.0, ring=0.5, bright=1.2, rng=c.rng), last)
    m.add(p.thump(0.5, f0=130.0, f1=65.0, tau=0.06, rng=c.rng), last)
    m.add(p.sparkle(0.4, c.sub('sparkle'), density=40.0), last + 0.03, 0.55)
    c.accent(0.0, step, 2 * step, last)
    return p.verb(m.out(), 0.12, tail=0.2)


# ===========================================================================
# money
# ===========================================================================

_COIN_CENTS = (-9.0, 0.0, 11.0)
_COIN_SHIFT_MS = (0.0, 2.5, 4.5)
_COIN_RING = (1.0, 0.93, 1.08)


@recipe('coin', length=0.19)
def coin(c):
    """Coin tink. The variants are the same coin landing slightly differently:
    a few cents apart, the upper modes a few ms late, a slightly different ring."""
    j = (c.i - 1) % 3
    extra = c.rng.uniform(-14.0, 14.0) if c.i > 3 else 0.0
    f = c.p.hz('A6', _COIN_CENTS[j] + extra)
    c.accent(0.0)
    return c.p.coin(f, shift_ms=_COIN_SHIFT_MS[j], ring=_COIN_RING[j], rng=c.rng)


@recipe('cash', length=0.38)
def cash(c):
    """Ka-ching: a short small bell, a brighter ringing one, and a soft shake of change."""
    p, m = c.p, Mix()
    m.add(p.bell(p.hz('E6'), 0.7, kind='tiny', tau=0.035, hard=0.8, rng=c.rng), 0.0)
    m.add(p.bell(p.hz('C7'), 1.0, kind='tiny', tau=0.085, hard=0.7, rng=c.rng), 0.095)
    m.add(p.bell(p.hz('G7'), 0.4, kind='tiny', tau=0.065, hard=0.3, rng=c.rng), 0.098)
    for t0, v in ((0.02, 0.16), (0.065, 0.22), (0.125, 0.2), (0.175, 0.12)):
        m.add(p.shaker(v, fc=4400.0, q=0.9, attack_ms=5.0, tau=0.013, rng=c.rng), t0)
    c.accent(0.0, 0.095)
    return m.out()


@recipe('buy', length=0.21)
def buy(c):
    """Soft click, then a rounded bloop rising an octave onto the key note, with a faint tine on top."""
    p, m = c.p, Mix()
    m.add(p.click(0.45, f=p.hz('E6'), rng=c.rng), 0.0)
    m.add(p.bloop(p.hz('C4'), p.hz('C5'), dur=0.2, rise=0.07, tau=0.048, rng=c.rng), 0.003)
    m.add(p.tine(p.hz('C6'), 0.2, ring=0.18, rng=c.rng), 0.055)
    c.accent(0.0)
    return m.out()


@recipe('milestone', length=0.6)
def milestone(c):
    """C major stab (rolled, plucks doubled by chime bars) over a small thump, sparkle after."""
    p, m = c.p, Mix()
    chord = ('C5', 'E5', 'G5', 'C6')
    m.add(p.thump(0.7, f0=140.0, f1=60.0, tau=0.07, rng=c.rng), 0.0)
    strum(c, m, chord, 0.0, 0.007, 'pluck', 0.8, ring=0.5, bright=1.1)
    strum(c, m, chord, 0.0, 0.007, 'chime', 0.4, ring=0.45)
    m.add(p.pad([p.hz(nt) for nt in chord[:3]], 0.26, attack=0.01, release=0.2, rng=c.rng), 0.0, 0.35)
    m.add(p.sparkle(0.45, c.sub('sparkle'), density=36.0), 0.06, 0.55)
    c.accent(0.0)
    return p.verb(m.out(), 0.13, tail=0.22)


@recipe('upgrade', length=0.65)
def upgrade(c):
    """Power-up: a quarter-second sweep (tone and air rising together) lands on a bright chord."""
    p, m = c.p, Mix()
    hit = 0.24
    m.add(p.click(0.6, f=p.hz('C6'), rng=c.rng), 0.0)
    m.add(p.thump(0.45, f0=120.0, f1=66.0, tau=0.05, rng=c.rng), 0.0)
    m.add(p.riser(hit, p.hz('C4'), p.hz('C6'), rng=c.rng), 0.0, 0.9)
    env = (0.15 + 0.85 * np.arange(ns(hit)) / ns(hit)) ** 1.3 * rcos_in(ns(hit), 6.0) * rcos_out(ns(hit), 20.0)
    m.add(p.whoosh(hit, [(0, 350.0), (hit, 3800.0)], q=1.2, env=env, rng=c.rng), 0.0, 0.5)
    m.add(p.thump(0.6, f0=140.0, f1=62.0, tau=0.07, rng=c.rng), hit)
    strum(c, m, ('E5', 'G5', 'C6', 'E6'), hit, 0.006, 'pluck', 0.8, ring=0.5, bright=1.15)
    strum(c, m, ('C6', 'E6'), hit, 0.006, 'bell', 0.45, ring=0.4, kind='hand')
    m.add(p.sparkle(0.3, c.sub('sparkle'), density=36.0), hit + 0.04, 0.45)
    c.accent(0.0, hit)
    return p.verb(m.out(), 0.12, tail=0.2)


@recipe('unlock', length=0.92)
def unlock(c):
    """Sol-do-mi-SOL: three quick horn notes and a held chord, about 0.9 s."""
    p, m = c.p, Mix()
    step = 0.085
    m.add(p.thump(0.75, f0=150.0, f1=60.0, tau=0.08, rng=c.rng), 0.0)
    for j, nt in enumerate(('G5', 'C6', 'E6')):
        m.add(p.brass(p.hz(nt), 0.075, 0.8, rng=c.rng), j * step)
        m.add(p.pluck(p.hz(nt), 0.7, ring=0.25, bright=1.1, rng=c.rng), j * step)
    hit = 3 * step
    m.add(p.thump(0.8, f0=160.0, f1=58.0, tau=0.09, rng=c.rng), hit)
    for nt, v in (('G6', 0.85), ('E6', 0.5), ('C6', 0.55), ('G5', 0.4)):
        m.add(p.brass(p.hz(nt), 0.5, v, rng=c.rng, release=0.25, fall=0.5), hit)
    strum(c, m, ('C6', 'E6', 'G6'), hit, 0.006, 'bell', 0.4, ring=0.5, kind='hand')
    m.add(p.sparkle(0.42, c.sub('sparkle'), density=34.0), hit + 0.08, 0.5)
    c.accent(0.0, step, 2 * step, hit)
    return p.verb(m.out(), 0.14, tail=0.25)


@recipe('unlock_venue', length=1.6)
def unlock_venue(c):
    """The bigger fanfare: da-da-DAA, an answer, and a wide final chord with
    thump, choir and a sparkle wash. About 1.6 s."""
    p, m = c.p, Mix()
    # da-da-DAA
    for t0, nt in ((0.0, 'E5'), (0.10, 'G5')):
        m.add(p.thump(0.7, f0=150.0, f1=62.0, tau=0.07, rng=c.rng), t0)
        m.add(p.brass(p.hz(nt), 0.085, 0.8, rng=c.rng), t0)
        m.add(p.pluck(p.hz(nt), 0.6, ring=0.25, rng=c.rng), t0)
    m.add(p.thump(0.85, f0=160.0, f1=58.0, tau=0.09, rng=c.rng), 0.20)
    for nt, v in (('C6', 0.85), ('G5', 0.5), ('E5', 0.45)):
        m.add(p.brass(p.hz(nt), 0.30, v, rng=c.rng), 0.20)
    m.add(p.pluck(p.hz('C6'), 0.6, ring=0.4, rng=c.rng), 0.20)
    # the answer: la, do ...
    for t0, nt in ((0.55, 'A5'), (0.68, 'C6')):
        m.add(p.brass(p.hz(nt), 0.11, 0.75, rng=c.rng), t0)
        m.add(p.pluck(p.hz(nt), 0.55, ring=0.25, rng=c.rng), t0)
    # ... MI, on top of a wide C major
    hit = 0.82
    m.add(p.thump(1.0, f0=170.0, f1=52.0, tau=0.13, rng=c.rng), hit)
    for nt, v in (('E6', 0.9), ('C6', 0.55), ('G5', 0.5), ('C5', 0.45)):
        m.add(p.brass(p.hz(nt), 0.68, v, rng=c.rng, release=0.3, fall=0.6), hit)
    strum(c, m, ('G5', 'C6', 'E6', 'G6', 'C7'), hit, 0.008, 'bell', 0.42, ring=0.6, kind='hand')
    m.add(p.choir([p.hz(nt) for nt in ('C4', 'G4', 'E5')], 0.68, attack=0.03, release=0.4, rng=c.rng), hit, 0.5)
    m.add(p.sparkle(0.62, c.sub('sparkle'), density=34.0), hit + 0.06, 0.8)
    c.accent(0.0, 0.10, 0.20, hit)
    return p.verb(m.out(), 0.16, tail=0.3, space='hall')


@recipe('hire', length=0.72)
def hire(c):
    """Ta-da: a short open chord, then C major, and a slide whistle swooping up a fifth."""
    p, m = c.p, Mix()
    strum(c, m, ('G4', 'D5', 'G5', 'A5'), 0.0, 0.005, 'pluck', 0.75, ring=0.2, bright=1.1)
    strum(c, m, ('D5', 'G5'), 0.0, 0.005, 'chime', 0.3, ring=0.25)
    da = 0.17
    m.add(p.thump(0.6, f0=140.0, f1=62.0, tau=0.07, rng=c.rng), da)
    strum(c, m, ('C5', 'E5', 'G5', 'C6', 'E6'), da, 0.006, 'pluck', 0.85, ring=0.55, bright=1.15)
    strum(c, m, ('C6', 'E6', 'G6'), da, 0.006, 'chime', 0.4, ring=0.5)
    wd = ns(0.30)
    path = np.concatenate([glide(p.hz('C6'), p.hz('G6'), ns(0.16), 0.8), np.full(wd - ns(0.16), p.hz('G6'))])
    m.add(p.whistle(path, 0.5, rng=c.rng), da + 0.13)
    m.add(p.sparkle(0.3, c.sub('sparkle'), density=30.0), da + 0.3, 0.4)
    c.accent(0.0, da)
    return p.verb(m.out(), 0.13, tail=0.22)


@recipe('prestige', length=2.5)
def prestige(c):
    """The biggest moment: three rising heart-beats under a swelling riser
    (0.44 s), then everything at once: sub thump, a six-note C major from C4
    to C6, bells, a choir, and a shimmer that takes two seconds to fall."""
    p, m = c.p, Mix()
    hit = 0.44
    beats = (0.0, 0.12, 0.24)
    for j, t0 in enumerate(beats):
        m.add(p.thump(0.55 + 0.15 * j, f0=120.0 + 25.0 * j, f1=55.0 + 9.0 * j, tau=0.06, rng=c.rng), t0)
        m.add(p.pluck(p.hz(('C4', 'E4', 'G4')[j]), 0.45 + 0.1 * j, ring=0.3, rng=c.rng), t0)
    m.add(p.riser(hit, p.hz('C3'), p.hz('C5'), rng=c.rng), 0.0, 1.8)
    m.add(p.riser(hit, p.hz('G3'), p.hz('G5'), rng=c.rng), 0.0, 1.2)
    env = (np.arange(ns(hit)) / ns(hit)) ** 2.0 * rcos_out(ns(hit), 18.0)
    m.add(p.whoosh(hit, [(0, 250.0), (hit, 4200.0)], q=1.0, env=env, air=0.4, rng=c.rng), 0.0, 1.4)
    # impact
    m.add(p.thump(0.85, f0=180.0, f1=48.0, tau=0.17, body=0.6, rng=c.rng), hit)
    strum(c, m, ('C4', 'G4', 'C5', 'E5', 'G5', 'C6'), hit, 0.006, 'pluck', 0.5, ring=1.0, bright=1.2)
    bells = Mix()
    strum(c, bells, ('E6', 'G6', 'C7'), 0.0, 0.012, 'bell', 0.5, ring=1.0, kind='hand')
    strum(c, bells, ('C6', 'G6'), 0.5, 0.02, 'bell', 0.35, ring=0.9, kind='hand')
    strum(c, bells, ('E6', 'C7'), 1.0, 0.02, 'bell', 0.25, ring=0.9, kind='hand')
    m.add(tremolo(bells.out(), 6.5, 0.4, 0.1), hit)
    choir = p.choir([p.hz(nt) for nt in ('C4', 'G4', 'C5', 'E5')], 2.05, attack=0.04, release=1.0, rng=c.rng)
    m.add(tremolo(choir, 5.0, 0.25, 0.2), hit, 1.5)
    for nt, v in (('C5', 0.55), ('E5', 0.5), ('G5', 0.55), ('C6', 0.6)):
        m.add(p.brass(p.hz(nt), 1.7, v, rng=c.rng, release=0.6, fall=1.1), hit)
    m.add(p.sparkle(1.75, c.sub('sparkle'), density=30.0, tau=(0.04, 0.1)), hit + 0.05, 0.6)
    m.add(p.sparkle(1.2, c.sub('sparkle2'), density=14.0, shape='flat', lo='C7', hi='A7'), hit + 0.3, 0.25)
    c.accent(*beats, hit)
    return p.verb(m.out(), 0.2, tail=0.5, space='hall')


@recipe('offline_collect', length=1)
def offline_collect(c):
    """A one-second shower of coins: about eighteen tinks on scale tones,
    thick at first and thinning out, over a soft rattle."""
    p, m = c.p, Mix()
    rng = c.rng
    notes = p.scale('A6', 'G7')
    times = [0.0, 0.05, 0.10] + list(0.12 + 0.80 * scatter(rng, 15) ** 1.25)
    for j, t0 in enumerate(times):
        f = cents(notes[rng.randint(len(notes))], rng.uniform(-12, 12))
        v = (1.0 - 0.55 * t0) * rng.uniform(0.6, 1.0)
        m.add(p.coin(f, v, shift_ms=rng.uniform(0, 5), ring=rng.uniform(0.9, 1.25), rng=rng), t0)
    for t0 in np.linspace(0.0, 0.85, 12):
        m.add(p.shaker(0.14 * (1.0 - 0.6 * t0), fc=4300.0, q=0.8, attack_ms=6.0, tau=0.02, rng=rng), t0 + rng.uniform(0, 0.03))
    m.add(p.thump(0.35, f0=130.0, f1=70.0, tau=0.05, rng=rng), 0.0)
    c.accent(0.0, 0.05, 0.10)
    return p.verb(m.out(), 0.08, tail=0.15)


@recipe('boost_start', length=0.65)
def boost_start(c):
    """Energy: a six-note run in a quarter of a second over a rising sweep, into a bright hit."""
    p, m = c.p, Mix()
    step = 0.04
    notes = ('C5', 'E5', 'G5', 'C6', 'E6', 'G6')
    run(c, m, notes, 0.0, step, 'pluck', 0.7, cresc=0.4, ring=0.2, bright=1.2)
    hit = len(notes) * step
    m.add(p.thump(0.5, f0=140.0, f1=64.0, tau=0.06, rng=c.rng), 0.0)
    m.add(p.riser(hit, p.hz('C4'), p.hz('C6'), rng=c.rng), 0.0, 0.7)
    env = (np.arange(ns(hit)) / ns(hit)) ** 1.5 * rcos_out(ns(hit), 18.0)
    m.add(p.whoosh(hit, [(0, 500.0), (hit, 4200.0)], q=1.2, env=env, rng=c.rng), 0.0, 0.45)
    m.add(p.thump(0.8, f0=170.0, f1=60.0, tau=0.09, rng=c.rng), hit)
    strum(c, m, ('C6', 'E6', 'G6', 'C7'), hit, 0.005, 'bell', 0.55, ring=0.55, kind='hand', hard=0.8)
    strum(c, m, ('G5', 'C6', 'E6'), hit, 0.005, 'pluck', 0.8, ring=0.5, bright=1.2)
    m.add(p.sparkle(0.42, c.sub('sparkle'), density=38.0), hit + 0.04, 0.55)
    c.accent(0.0, 2 * step, hit)
    return p.verb(m.out(), 0.13, tail=0.22)


# ===========================================================================
# the living scene
# ===========================================================================

@recipe('cook_done', length=0.34)
def cook_done(c):
    """Small oven-timer bell: one high, thin ding."""
    c.accent(0.0)
    return c.p.bell(c.p.hz('C7'), kind='tiny', tau=0.09, hard=0.5, rng=c.rng)


@recipe('toss', length=0.22)
def toss(c):
    """Airy whoosh with an arc: up, over and down, like the dish itself."""
    return c.p.whoosh(0.24, [(0, 520.0), (0.11, 1900.0), (0.24, 820.0)], q=0.9, air=0.35, rng=c.rng)


@recipe('bell', length=0.66)
def bell(c):
    """The service bell, rung by hand: plunger clack, a bright strike on G6
    with inharmonic partials, and 0.6 s of gently beating ring."""
    c.accent(0.0)
    return c.p.verb(c.p.desk_bell(c.p.hz('G6'), ring_tau=0.125, rng=c.rng), 0.05, tail=0.1)


@recipe('pickup', length=0.14)
def pickup(c):
    """Two plates clink onto a tray."""
    p, m = c.p, Mix()
    m.add(p.knock(p.hz('E4'), 0.3, tau=0.012, tone=0.5, rng=c.rng), 0.004)
    m.add(p.clink(p.hz('D7'), 0.9, tau=0.017, rng=c.rng), 0.0)
    m.add(p.clink(p.hz('E7'), 0.7, tau=0.021, rng=c.rng), 0.048)
    return m.out()


@recipe('serve', length=0.16)
def serve(c):
    """Plate set down: a soft table thud with one tiny clink."""
    p, m = c.p, Mix()
    m.add(lowpass(p.knock(p.hz('C4'), 1.0, tau=0.024, tone=0.7, rng=c.rng), 1800.0, 2), 0.0)
    m.add(p.thump(0.3, f0=150.0, f1=90.0, tau=0.03, body=0.5, rng=c.rng), 0.0)
    m.add(p.clink(p.hz('E7'), 0.2, tau=0.012, rng=c.rng), 0.014)
    return m.out()


@recipe('door', length=0.52)
def door(c):
    """Shop door chime: ding-dong, a major third down (E6, C6)."""
    p, m = c.p, Mix()
    m.add(p.chime(p.hz('E6'), 1.0, ring=0.32, rng=c.rng), 0.0)
    m.add(p.chime(p.hz('C6'), 0.9, ring=0.30, rng=c.rng), 0.19)
    return p.verb(m.out(), 0.1, tail=0.15)


@recipe('happy', length=0.16)
def happy(c):
    """Two short chirps, each sliding up, the second higher."""
    p, m = c.p, Mix()
    m.add(p.chirp(p.hz('E6'), p.hz('G6'), 0.055, 0.85, rng=c.rng), 0.0)
    m.add(p.chirp(p.hz('G6'), p.hz('C7'), 0.075, 1.0, rng=c.rng), 0.085)
    return m.out()


# ===========================================================================
# bonus, rush
# ===========================================================================

@recipe('bonus_appear', length=0.78)
def bonus_appear(c):
    """Twinkling shimmer that swells: chime bars run up the scale under a rising scatter of pings."""
    p, m = c.p, Mix()
    notes = ('C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7')
    for j, nt in enumerate(notes):
        t0 = 0.5 * (j / (len(notes) - 1)) ** 0.85
        m.add(p.chime(p.hz(nt), 0.35 + 0.05 * j, ring=0.35, rng=c.rng), t0)
    m.add(p.sparkle(0.5, c.sub('rise'), density=34.0, lo='G6', hi='E8', shape='rise'), 0.0, 0.6)
    m.add(p.sparkle(0.3, c.sub('fall'), density=34.0, lo='C7', hi='E8', shape='fall'), 0.5, 0.6)
    pad = p.pad([p.hz('C6'), p.hz('G6')], 0.7, attack=0.35, release=0.3, rng=c.rng)
    m.add(tremolo(pad, 9.0, 0.5), 0.0, 0.3)
    return p.verb(m.out(), 0.2, tail=0.25, space='hall')


@recipe('bonus_collect', length=0.9)
def bonus_collect(c):
    """Glittery burst (thump, bright bell chord, a puff of glitter) and then coins tumbling out."""
    p, m = c.p, Mix()
    rng = c.rng
    m.add(p.thump(0.85, f0=160.0, f1=58.0, tau=0.08, rng=rng), 0.0)
    strum(c, m, ('C6', 'E6', 'G6', 'C7'), 0.0, 0.004, 'bell', 0.6, ring=0.4, kind='hand', hard=0.9)
    m.add(p.shaker(0.5, fc=4500.0, q=0.7, attack_ms=3.0, tau=0.05, rng=rng), 0.0)
    m.add(p.sparkle(0.3, c.sub('burst'), density=60.0), 0.0, 0.6)
    notes = p.scale('A6', 'G7')
    for t0 in 0.13 + 0.62 * scatter(rng, 11) ** 1.15:
        f = cents(notes[rng.randint(len(notes))], rng.uniform(-12, 12))
        m.add(p.coin(f, (1.0 - 0.5 * t0) * rng.uniform(0.6, 1.0), shift_ms=rng.uniform(0, 5), rng=rng), t0)
    c.accent(0.0, 0.13)
    return p.verb(m.out(), 0.1, tail=0.15)


@recipe('rush_start', length=0.78)
def rush_start(c):
    """A bell rung faster and faster, swallowed by a rising whoosh. It does not resolve: the rush is on."""
    p, m = c.p, Mix()
    times = (0.0, 0.075, 0.14, 0.195, 0.24, 0.28, 0.315)
    for j, t0 in enumerate(times):
        m.add(p.bell(p.hz('G6'), 0.6 + 0.06 * j, kind='desk', tau=0.05, hard=0.8, rng=c.rng), t0)
    m.add(p.thump(0.6, f0=140.0, f1=64.0, tau=0.06, rng=c.rng), 0.0)
    dur = 0.66
    env = (np.arange(ns(dur)) / ns(dur)) ** 2.0 * rcos_out(ns(dur), 70.0)
    m.add(p.whoosh(dur, [(0, 380.0), (dur, 4600.0)], q=1.0, env=env, air=0.4, rng=c.rng), 0.2, 1.0)
    m.add(p.riser(dur, p.hz('G4'), p.hz('G6'), rng=c.rng), 0.2, 0.5)
    c.accent(0.0, 0.075, 0.14)
    return p.verb(m.out(), 0.1, tail=0.12)


@recipe('rush_end', length=0.52)
def rush_end(c):
    """Everything winds down: a whoosh falling four octaves and a tone sliding down a fifth."""
    p, m = c.p, Mix()
    dur = 0.58
    env = points([(0, 0), (0.035, 1.0), (0.2, 0.6), (dur, 0)], ns(dur))
    m.add(p.whoosh(dur, [(0, 3400.0), (dur, 280.0)], q=1.0, env=env, air=0.3, rng=c.rng), 0.0)
    path = glide(p.hz('G5'), p.hz('C5'), ns(0.45), 0.9)
    m.add(p.whistle(path, 0.22, breath=0.0, rng=c.rng), 0.02)
    c.accent(0.0)
    return m.out()


# ===========================================================================
# chests and cards
# ===========================================================================

@recipe('chest_appear', length=0.48)
def chest_appear(c):
    """A heavy wooden chest lands: deep thump, plank knocks, the lid rattling once, a few sparkles."""
    p, m = c.p, Mix()
    m.add(p.thump(1.0, f0=165.0, f1=52.0, tau=0.11, body=0.7, rng=c.rng), 0.0)
    m.add(p.knock(p.hz('G2'), 0.8, tau=0.05, tone=0.6, rng=c.rng), 0.0)
    m.add(p.knock(p.hz('G3'), 0.5, tau=0.035, tone=0.7, rng=c.rng), 0.004)
    m.add(p.knock(p.hz('E4'), 0.22, tau=0.02, tone=0.6, rng=c.rng), 0.09)
    m.add(p.sparkle(0.3, c.sub('sparkle'), density=30.0), 0.12, 0.45)
    c.accent(0.0)
    return p.verb(m.out(), 0.08, tail=0.12)


@recipe('chest_shake', length=0.5)
def chest_shake(c):
    """Rattle: wooden knocks that speed up and get louder, coins jingling inside."""
    p, m = c.p, Mix()
    rng = c.rng
    times = (0.0, 0.055, 0.105, 0.15, 0.20, 0.245, 0.29, 0.33, 0.365, 0.40, 0.43, 0.455)
    woods = ('G3', 'C4', 'A3', 'E4')
    coins = p.scale('A6', 'G7')
    for j, t0 in enumerate(times):
        v = 0.45 + 0.55 * j / (len(times) - 1)
        m.add(p.knock(p.hz(woods[j % 4]), v, tau=0.016, tone=0.8, rng=rng), t0)
        if j % 2 == 1 or j > 7:
            f = cents(coins[rng.randint(len(coins))], rng.uniform(-10, 10))
            m.add(p.coin(f, 0.3 * v, shift_ms=rng.uniform(0, 4), ring=0.8, rng=rng), t0 + rng.uniform(0.008, 0.02))
    c.accent(*times[:4])
    return m.out()


@recipe('chest_open', length=1.2)
def chest_open(c):
    """Latch, creak, and the lid flies open: a puff of air, a thump, a
    shimmering Cadd9 with a choir behind it and sparkle pouring out. About 1.2 s."""
    p, m = c.p, Mix()
    m.add(p.knock(p.hz('D5'), 0.5, tau=0.008, tone=0.8, rng=c.rng), 0.0)
    m.add(p.thump(0.5, f0=120.0, f1=70.0, tau=0.04, rng=c.rng), 0.0)
    m.add(p.creak(0.2, 0.8, rng=c.rng), 0.02)
    hit = 0.23
    m.add(p.thump(0.9, f0=170.0, f1=55.0, tau=0.1, rng=c.rng), hit)
    env = points([(0, 0), (0.01, 1.0), (0.14, 0)], ns(0.14))
    m.add(p.whoosh(0.14, [(0, 900.0), (0.14, 2600.0)], q=0.8, env=env, rng=c.rng), hit, 0.5)
    strum(c, m, ('C5', 'E5', 'G5', 'D6', 'E6'), hit, 0.008, 'pluck', 0.8, ring=0.8, bright=1.15)
    bells = Mix()
    strum(c, bells, ('G6', 'C7'), 0.0, 0.01, 'bell', 0.5, ring=0.8, kind='hand')
    m.add(tremolo(bells.out(), 7.0, 0.35, 0.05), hit)
    choir = p.choir([p.hz(nt) for nt in ('C4', 'G4', 'E5')], 0.75, attack=0.03, release=0.45, rng=c.rng)
    m.add(tremolo(choir, 5.5, 0.2, 0.1), hit, 0.4)
    m.add(p.sparkle(0.8, c.sub('sparkle'), density=34.0), hit + 0.04, 0.6)
    c.accent(0.0, hit)
    return p.verb(m.out(), 0.17, tail=0.3, space='hall')


@recipe('card_flip', length=0.11)
def card_flip(c):
    """Papery whip: a bright flick that is cut short by the card landing."""
    p, m = c.p, Mix()
    m.add(p.paper(0.085, rng=c.rng), 0.0)
    m.add(p.knock(p.hz('A4'), 0.3, tau=0.008, tone=0.3, rng=c.rng), 0.08)
    c.accent(0.0)
    return m.out()


@recipe('reveal_common', length=0.48)
def reveal_common(c):
    """One soft chime on the key note."""
    p, m = c.p, Mix()
    m.add(p.chime(p.hz('C6'), 0.9, ring=0.45, rng=c.rng), 0.0)
    m.add(p.tine(p.hz('C5'), 0.3, ring=0.4, rng=c.rng), 0.0)
    c.accent(0.0)
    return p.verb(m.out(), 0.12, tail=0.2)


@recipe('reveal_rare', length=0.66)
def reveal_rare(c):
    """Two brighter chimes, a fourth up (G6 to C7), each doubled an octave below, with a shimmer."""
    p, m = c.p, Mix()
    for t0, nt, low in ((0.0, 'G6', 'G5'), (0.13, 'C7', 'C6')):
        m.add(p.chime(p.hz(nt), 0.9, ring=0.55, bright=1.2, rng=c.rng), t0)
        m.add(p.tine(p.hz(low), 0.45, ring=0.5, rng=c.rng), t0)
    m.add(p.sparkle(0.5, c.sub('sparkle'), density=28.0), 0.16, 0.5)
    c.accent(0.0, 0.13)
    return p.verb(m.out(), 0.16, tail=0.25, space='hall')


@recipe('reveal_epic', length=0.9)
def reveal_epic(c):
    """Drama: a low A and a thump, an A minor triad climbing on horns, and
    the octave arriving with bells, a pad and sparkle."""
    p, m = c.p, Mix()
    m.add(p.thump(0.9, f0=160.0, f1=55.0, tau=0.1, rng=c.rng), 0.0)
    m.add(p.pluck(p.hz('A3'), 0.7, ring=0.9, rng=c.rng), 0.0)
    m.add(p.pad([p.hz('A3'), p.hz('E4')], 0.95, attack=0.02, release=0.5, rng=c.rng), 0.0, 0.45)
    step = 0.09
    for j, nt in enumerate(('A4', 'C5', 'E5')):
        m.add(p.brass(p.hz(nt), 0.085, 0.65 + 0.1 * j, rng=c.rng), j * step)
        m.add(p.pluck(p.hz(nt), 0.6 + 0.1 * j, ring=0.35, bright=1.1, rng=c.rng), j * step)
    hit = 3 * step
    m.add(p.thump(0.7, f0=150.0, f1=58.0, tau=0.08, rng=c.rng), hit)
    for nt, v in (('A5', 0.85), ('E5', 0.5), ('C5', 0.45)):
        m.add(p.brass(p.hz(nt), 0.6, v, rng=c.rng, release=0.3, fall=0.5), hit)
    strum(c, m, ('A5', 'C6', 'E6', 'A6'), hit, 0.008, 'bell', 0.45, ring=0.6, kind='hand')
    m.add(p.sparkle(0.6, c.sub('sparkle'), density=34.0), hit + 0.05, 0.55)
    c.accent(0.0, step, hit)
    return p.verb(m.out(), 0.17, tail=0.3, space='hall')


@recipe('reveal_legendary', length=2)
def reveal_legendary(c):
    """Golden fanfare: three pick-up notes with thumps, then C major on horns
    over a choir, the top line climbing do-mi-sol, bells on every arrival and a
    sparkle tail that outlasts everything. About 2 s."""
    p, m = c.p, Mix()
    for j, (t0, nt) in enumerate(((0.0, 'G4'), (0.08, 'C5'), (0.16, 'E5'))):
        m.add(p.thump(0.6 + 0.1 * j, f0=140.0 + 10 * j, f1=60.0, tau=0.06, rng=c.rng), t0)
        m.add(p.brass(p.hz(nt), 0.07, 0.75, rng=c.rng), t0)
        m.add(p.brass(p.hz(nt) * 2.0, 0.07, 0.45, rng=c.rng), t0)
    hit = 0.32
    m.add(p.thump(1.0, f0=180.0, f1=50.0, tau=0.15, body=0.6, rng=c.rng), hit)
    for nt, v in (('C5', 0.5), ('E5', 0.5), ('G5', 0.55)):
        m.add(p.brass(p.hz(nt), 1.15, v, rng=c.rng, release=0.4, fall=1.2), hit)
    m.add(p.brass(p.hz('C6'), 0.3, 0.85, rng=c.rng), hit)
    m.add(p.brass(p.hz('E6'), 0.16, 0.85, rng=c.rng), hit + 0.3)
    m.add(p.brass(p.hz('G6'), 0.75, 0.85, rng=c.rng, release=0.35, fall=0.8), hit + 0.46)
    choir = p.choir([p.hz(nt) for nt in ('C4', 'G4', 'C5', 'E5')], 1.5, attack=0.04, release=0.9, rng=c.rng)
    m.add(tremolo(choir, 5.0, 0.15, 0.2), hit, 0.55)
    strum(c, m, ('C6', 'E6', 'G6', 'C7'), hit, 0.01, 'bell', 0.42, ring=0.8, kind='hand')
    strum(c, m, ('G6', 'C7', 'E7'), hit + 0.46, 0.012, 'bell', 0.45, ring=1.0, kind='hand')
    strum(c, m, ('C7', 'G7'), hit + 0.95, 0.02, 'bell', 0.3, ring=1.0, kind='hand')
    m.add(p.sparkle(1.55, c.sub('sparkle'), density=30.0, tau=(0.04, 0.1)), hit + 0.1, 0.9)
    m.add(p.sparkle(1.1, c.sub('sparkle2'), density=22.0, shape='flat', lo='C7', hi='A7'), hit + 0.5, 0.6)
    c.accent(0.0, 0.08, 0.16, hit)
    return p.verb(m.out(), 0.2, tail=0.5, space='hall')


@recipe('card_levelup', length=0.62)
def card_levelup(c):
    """Five notes up the scale, 60 ms apart, and a bell 'ding' on top."""
    p, m = c.p, Mix()
    step = 0.06
    run(c, m, ('C5', 'E5', 'G5', 'A5', 'C6'), 0.0, step, 'tine', 0.75, cresc=0.3, ring=0.3)
    ding = 5 * step + 0.02
    m.add(p.bell(p.hz('G6'), 1.0, ring=0.6, kind='hand', hard=0.8, rng=c.rng), ding)
    m.add(p.bell(p.hz('C7'), 0.35, ring=0.5, kind='hand', rng=c.rng), ding)
    m.add(p.tine(p.hz('C6'), 0.4, ring=0.5, rng=c.rng), ding)
    c.accent(0.0, step, ding)
    return p.verb(m.out(), 0.12, tail=0.2)


@recipe('gems', length=0.62)
def gems(c):
    """Glass: four struck-crystal notes up (E G C E), the last ringing with its fifth."""
    p, m = c.p, Mix()
    step = 0.055
    run(c, m, ('E6', 'G6', 'C7', 'E7'), 0.0, step, 'glass', 0.8, cresc=0.2, ring=0.6)
    m.add(p.glass(p.hz('G6'), 0.35, ring=0.8, rng=c.rng), 3 * step)
    m.add(p.sparkle(0.3, c.sub('sparkle'), density=26.0, lo='E7', hi='E8'), 3 * step + 0.05, 0.3)
    c.accent(0.0)
    return p.verb(m.out(), 0.2, tail=0.3, space='hall')


# ===========================================================================
# deals, missions, daily
# ===========================================================================

@recipe('deal_popup', length=0.52)
def deal_popup(c):
    """Sol-do-mi, unhurried and mid-register: an invitation, not an alarm."""
    p, m = c.p, Mix()
    for t0, nt, v in ((0.0, 'G5', 0.85), (0.13, 'C6', 1.0), (0.26, 'E6', 0.7)):
        m.add(p.pluck(p.hz(nt), v, ring=0.45, rng=c.rng), t0)
        m.add(p.chime(p.hz(nt), 0.4 * v, ring=0.35, rng=c.rng), t0)
    c.accent(0.0, 0.13)
    return p.verb(m.out(), 0.13, tail=0.2)


@recipe('purchase_success', length=1.05)
def purchase_success(c):
    """Cash register (drawer knock, ching, loose change), then a short
    fanfare: do-mi-sol and a held C major with a thump and sparkle."""
    p, m = c.p, Mix()
    m.add(p.knock(p.hz('G3'), 0.6, tau=0.02, tone=0.8, rng=c.rng), 0.0)
    m.add(p.bell(p.hz('C7'), 0.9, kind='tiny', tau=0.09, hard=0.9, rng=c.rng), 0.015)
    m.add(p.bell(p.hz('E7'), 0.5, kind='tiny', tau=0.07, hard=0.5, rng=c.rng), 0.02)
    for t0, v in ((0.04, 0.2), (0.09, 0.24), (0.15, 0.18), (0.2, 0.1)):
        m.add(p.shaker(v, fc=4400.0, q=0.9, attack_ms=5.0, tau=0.013, rng=c.rng), t0)
    t0, step = 0.27, 0.09
    for j, nt in enumerate(('C5', 'E5', 'G5')):
        m.add(p.brass(p.hz(nt), 0.08, 0.75, rng=c.rng), t0 + j * step)
        m.add(p.pluck(p.hz(nt), 0.65, ring=0.25, bright=1.1, rng=c.rng), t0 + j * step)
    hit = t0 + 3 * step
    m.add(p.thump(0.9, f0=165.0, f1=56.0, tau=0.1, rng=c.rng), hit)
    for nt, v in (('C6', 0.85), ('G5', 0.5), ('E5', 0.45)):
        m.add(p.brass(p.hz(nt), 0.5, v, rng=c.rng, release=0.25, fall=0.5), hit)
    strum(c, m, ('C6', 'E6', 'G6', 'C7'), hit, 0.008, 'bell', 0.42, ring=0.6, kind='hand')
    m.add(p.sparkle(0.5, c.sub('sparkle'), density=34.0), hit + 0.06, 0.7)
    c.accent(0.0, hit)
    return p.verb(m.out(), 0.15, tail=0.28, space='hall')


@recipe('mission_complete', length=0.52)
def mission_complete(c):
    """Do-mi-SOL in a bright register, the last note held with its octave: task done."""
    p, m = c.p, Mix()
    for t0, nt, v, ring in ((0.0, 'C6', 0.85, 0.3), (0.11, 'E6', 0.9, 0.3), (0.22, 'G6', 1.0, 0.6)):
        m.add(p.pluck(p.hz(nt), v, ring=ring, bright=1.15, rng=c.rng), t0)
        m.add(p.bell(p.hz(nt), 0.45 * v, ring=ring, kind='hand', rng=c.rng), t0)
    m.add(p.bell(p.hz('C7'), 0.3, ring=0.5, kind='hand', rng=c.rng), 0.225)
    m.add(p.sparkle(0.22, c.sub('sparkle'), density=30.0), 0.27, 0.35)
    c.accent(0.0, 0.11, 0.22)
    return p.verb(m.out(), 0.12, tail=0.2)


@recipe('daily_claim', length=0.52)
def daily_claim(c):
    """The gift box pops (a low bubble and a puff), then a two-note chime rings out."""
    p, m = c.p, Mix()
    m.add(p.pop(p.hz('C5'), p.hz('G3'), tau=0.02, drop=0.014, puff=0.5, rng=c.rng), 0.0)
    m.add(p.thump(0.4, f0=130.0, f1=75.0, tau=0.04, rng=c.rng), 0.0)
    m.add(p.bell(p.hz('C6'), 0.9, ring=0.5, kind='hand', rng=c.rng), 0.11)
    m.add(p.bell(p.hz('G6'), 0.6, ring=0.5, kind='hand', rng=c.rng), 0.118)
    m.add(p.sparkle(0.25, c.sub('sparkle'), density=28.0), 0.16, 0.35)
    c.accent(0.0, 0.11)
    return p.verb(m.out(), 0.12, tail=0.2)


# ===========================================================================
# story
# ===========================================================================

@recipe('story_open', length=0.27)
def story_open(c):
    """Soft low whoosh: in, and settle."""
    env = points([(0, 0), (0.012, 0.3), (0.13, 1.0), (0.28, 0)], ns(0.28))
    c.accent(0.0)
    return c.p.whoosh(0.28, [(0, 380.0), (0.16, 1500.0), (0.28, 1000.0)], q=0.8, env=env, air=0.2, rng=c.rng)


BLIP_EVERY_MS = 55.0     # how fast the typewriter fires them (the catalogue's floor is 45 ms)


def _blip(c, note, bend, vowel, rough=0.0, dur=0.042):
    n = ns(dur)
    path = glide(c.p.hz(note), c.p.hz(note) * bend, n)
    return c.p.voice(path, vowel, rough=rough, rng=c.rng) * rcos_in(n, 5.0) * rcos_out(n, 17.0)


@recipe('blip_low', stream_ms=BLIP_EVERY_MS)
def blip_low(c):
    """Gruff: 'oh' on E3, sagging a little, with a growl."""
    return _blip(c, 'E3', 0.94, 'o', rough=0.3)


@recipe('blip_mid', stream_ms=BLIP_EVERY_MS)
def blip_mid(c):
    """Neutral: 'ah' on C4, almost level."""
    return _blip(c, 'C4', 1.03, 'a')


@recipe('blip_high', stream_ms=BLIP_EVERY_MS)
def blip_high(c):
    """Small and excitable: 'ee' on A4, bouncing up a tone."""
    return _blip(c, 'A4', 1.12, 'i')
