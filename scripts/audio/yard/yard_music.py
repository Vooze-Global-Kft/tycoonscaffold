#!/usr/bin/env python3
"""Scrap to Ingot's music: "yard radio" (yard-stage1.md 7), the one loop the shared player starts (`music_main`).

  python3 scripts/audio/yard/yard_music.py --out /tmp/yard.m4a
  python3 scripts/audio/yard/yard_music.py --wav /tmp/yard.wav --stems /tmp/stems    (no ffmpeg needed for these)
  python3 scripts/audio/yard/yard_music.py --levels                                  each stem's loudness in the mix
  python3 scripts/audio/yard/yard_music.py --score                                   the guitar's fills, for the originality check

"Yard radio": 34 bars of 4/4 at 92 bpm in E major (88.7 s), as if from a radio on the scale-house shelf,
sparse and warm. A clean electric guitar on its neck pickup and a fingered electric bass, over the yard's
own metal hits played softly as a kit (a far sledge on a plate for the kick, a wire brush on sheet steel
and a struck steel pipe for the backbeat, a few chain links for the shaker, a small anvil's ting every
four bars).

Two variants, crossfaded inside the one file (the shared player has one loop): A (bars 1 to 16) the
guitar picks three or four notes of each chord, the brush on 2 and 4; B (bars 17 to 34) the guitar lays
soft chords on the and-of-2, makes a short fill every four bars (never the same twice, never a tune to
hum), the pipe takes the backbeat and the chain shakes the off-beats. Each variant fades into the other
over four bars (bars 15 to 18, and bars 33 to 2 across the seam), so a five-minute test hears the
music change without a seam or a jump.

The shared player has no ducking (src/services/fx/audio.ts: `music.setVolume` sets the level at once);
src/modes/salvage/soundKeys.ts SALVAGE_DUCK says by how much the screen lowers it under the pour and the
tickets, through `fx.music.setVolume`.

Instruments are this game's own, built here: a modal string with a neck pickup through a clean amplifier
(no Karplus-Strong, no mandolin or accordion of the first game, nothing of the second game's synth pack, no
reed, bowed pad or hand drum of the third, no brass band, bassoon or pizzicato of the fourth). Only the
machinery is reused, imported from music.py: the Loop on a common clock, the AAC-frame loop length, the
stereo mixdown that folds tails through the seam, the circular mastering, the gapless AAC export.
"""
from __future__ import annotations

import sys

sys.dont_write_bytecode = True

import argparse
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.normpath(os.path.join(HERE, '..'))
for p in (HERE, AUDIO):
    if p not in sys.path:
        sys.path.insert(0, p)

import numpy as np  # noqa: E402

import dsp  # noqa: E402
import music  # noqa: E402
import yard_recipes as YR  # noqa: E402
from dsp import SR, TAU, butter, filt, midi, mtof, ns, rcos_in, rcos_out, rng_for  # noqa: E402

BPM = 92.0
PER_BAR = 8                 # eighth notes
BARS = 34
KBPS = 56
LENGTH_S = (86.0, 92.0)

# Two bars a chord. Variant A: bars 0..15 (8 chords); variant B: bars 16..33 (9 chords).
CHORDS = ['Emaj7', 'C#m7', 'Amaj7', 'B7sus', 'Emaj7', 'G#m7', 'Amaj7', 'B7',
          'Amaj7', 'G#m7', 'F#m7', 'B7sus', 'Amaj7', 'G#m7', 'C#m7', 'F#m7', 'B7sus']
VOICING = {                 # guitar, low to high (a close, warm voicing around middle C)
    'Emaj7': ('E3', 'B3', 'D#4', 'G#4'),
    'C#m7': ('C#3', 'G#3', 'B3', 'E4'),
    'Amaj7': ('A2', 'E3', 'G#3', 'C#4'),
    'B7sus': ('B2', 'F#3', 'A3', 'E4'),
    'B7': ('B2', 'F#3', 'A3', 'D#4'),
    'G#m7': ('G#2', 'D#3', 'F#3', 'B3'),
    'F#m7': ('F#2', 'C#3', 'E3', 'A3'),
}
ROOT = {'Emaj7': 'E2', 'C#m7': 'C#2', 'Amaj7': 'A1', 'B7sus': 'B1', 'B7': 'B1', 'G#m7': 'G#1', 'F#m7': 'F#2'}
FIFTH = {'Emaj7': 'B2', 'C#m7': 'G#2', 'Amaj7': 'E2', 'B7sus': 'F#2', 'B7': 'F#2', 'G#m7': 'D#2', 'F#m7': 'C#3'}

# Variant B's fills (bar, [(eighth, note, eighths)]): short, different each time, scale tones only.
FILLS = [
    (19, [(4, 'B4', 1), (5, 'C#5', 1), (6, 'E5', 2)]),
    (23, [(3, 'G#4', 1), (4, 'B4', 2), (6, 'A4', 1), (7, 'G#4', 1)]),
    (27, [(4, 'E5', 1), (5, 'D#5', 1), (6, 'B4', 2)]),
    (31, [(2, 'F#4', 2), (5, 'A4', 1), (6, 'B4', 2)]),
]


def gain_a(b):
    """Variant A's level in bar b (B's is 1 minus it): the crossfades of bars 14..17 and 32..1."""
    return {14: 0.8, 15: 0.6, 16: 0.35, 17: 0.15, 32: 0.35, 33: 0.65, 0: 0.9}.get(b, 1.0 if b < 14 else 0.0)


def hz(name):
    return YR.hz(name, strict=True)


def approach(root):
    """The scale tone just under a root (the bass walks up into the next chord)."""
    m = int(round(midi(root))) - 1
    if m % 12 not in YR.SCALE_PCS:
        m -= 1
    return mtof(m)


# ---------------------------------------------------------------------------
# instruments
# ---------------------------------------------------------------------------

def guitar_note(f, dur, rng, dyn=0.8, pluck=0.22, pickup=0.27, tone=1.0):
    """A clean electric guitar, neck pickup: a string's harmonic partials (a touch of stiffness),
    plucked at `pluck` of its length (sin(pi k p) / k), heard at `pickup` (sin(pi k q)), the upper
    partials dying faster; a little finger noise at the attack; through a clean amplifier (gentle
    saturation, a 12-inch cabinet's roll-off from 3.2 kHz and its bump at 1.1 kHz)."""
    n = ns(dur + 0.6)
    t = np.arange(n) / SR
    y = np.zeros(n)
    B = 0.00008
    tau0 = 1.6 * (220.0 / f) ** 0.35
    for k in range(1, 40):
        fk = f * k * math.sqrt(1.0 + B * k * k)
        if fk > 5500.0:
            break
        a = abs(math.sin(math.pi * k * pluck)) / k * abs(math.sin(math.pi * k * pickup)) * (1.0 + 0.3 * tone * (k < 6))
        tau = tau0 / (1.0 + 0.11 * (k ** 1.35))
        y += a * np.exp(-t / tau) * np.sin(TAU * fk * t + rng.uniform(0, TAU))
    y *= rcos_in(n, 2.5)
    fn = dsp.white(ns(0.012), rng)
    y[:len(fn)] += 0.03 * dyn * filt(fn, butter('hp', 1800.0, 2)) * rcos_out(len(fn), 8.0)
    # the hand lets the note go at `dur`
    rel = np.ones(n)
    k0 = ns(dur)
    if k0 < n:
        rel[k0:] = np.exp(-np.arange(n - k0) / (0.07 * SR))
    y *= rel * dyn
    y = np.tanh(1.4 * y / (np.max(np.abs(y)) + 1e-9)) * (np.max(np.abs(y)) + 1e-9) / math.tanh(1.4)
    y = filt(y, butter('lp', 3200.0, 2) + [dsp.bq('peak', 1100.0, 0.9, 2.5)])
    return y


def bass_note(f, dur, rng, dyn=0.8):
    """A fingered electric bass: harmonics falling as 1/k^1.5, the upper ones shorter, a soft thump of the
    finger, let go at `dur`."""
    n = ns(dur + 0.25)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k in range(1, 12):
        fk = f * k
        if fk > 2500.0:
            break
        y += (1.0 / k ** 1.5) * np.exp(-t / (1.2 / (1.0 + 0.5 * k))) * np.sin(TAU * fk * t + rng.uniform(0, TAU))
    th = dsp.white(ns(0.02), rng)
    y[:len(th)] += 0.05 * filt(th, butter('lp', 900.0, 2)) * rcos_out(len(th), 15.0)
    y *= rcos_in(n, 4.0)
    rel = np.ones(n)
    k0 = ns(dur)
    if k0 < n:
        rel[k0:] = np.exp(-np.arange(n - k0) / (0.05 * SR))
    return dyn * y * rel


def kick(rng, dyn=0.7):
    """A far sledge on a steel plate, played softly: a falling low thump and the plate's short clank."""
    n = ns(0.35)
    t = np.arange(n) / SR
    f = 70.0 * (1.0 + 0.9 * np.exp(-t / 0.015))
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.08)
    y += 0.25 * YR.metal(rng, 420.0, YR.PLATE, 0.03, 0.35, click=0.3)
    return dyn * YR.norm(y * rcos_in(n, 1.0))


def brush(rng, dyn=0.6):
    """A wire brush slapped on sheet steel: a short band of noise and a faint ring."""
    n = ns(0.18)
    y = YR.band(dsp.white(n, rng), 1500.0, 6500.0) * YR.expenv(n, 0.03, 2.0)
    y += 0.15 * YR.metal(rng, 900.0, YR.PLATE, 0.04, 0.18, click=0.0)
    return dyn * YR.norm(y)


def pipe(rng, dyn=0.6):
    """A steel pipe struck with a padded stick (C#5): the backbeat of variant B."""
    return dyn * YR.norm(YR.metal(rng, hz('C#5'), YR.BAR, 0.09, 0.4, amps=(1.0, 0.25, 0.08), spread=0.003, click=0.25, attack_ms=2.0))


def chain(rng, dyn=0.4):
    """A few chain links shaken once (an off-beat)."""
    return dyn * YR.norm(YR.grit(rng, 0.09, 260.0, 2800.0, 6500.0, tau=0.004, env=YR.points([(0, 0.0), (0.02, 1.0), (0.09, 0.0)], ns(0.09))))


def ting(rng, dyn=0.5):
    """A small anvil's ting (E6), every four bars."""
    return dyn * YR.norm(YR.metal(rng, hz('E6'), YR.BAR, 0.6, 1.6, amps=(1.0, 0.18, 0.05), spread=0.0, click=0.1, attack_ms=1.5))


# ---------------------------------------------------------------------------
# the arrangement
# ---------------------------------------------------------------------------

def yard_radio(loop, unit):
    bar = PER_BAR * unit
    rng = rng_for('yard-music', 'radio')
    jit = lambda: rng.normal(0, 0.005)  # noqa: E731
    for b in range(BARS):
        at = b * bar
        ch = CHORDS[b // 2]
        v = VOICING[ch]
        first = b % 2 == 0
        ga = gain_a(b)
        gb = 1.0 - ga
        # bass: root on 1, fifth on the and-of-3, an approach into the next chord on the and-of-4
        loop.add('bass', bass_note(hz(ROOT[ch]), 3 * unit, rng, 0.85), at + jit())
        loop.add('bass', bass_note(hz(FIFTH[ch]), 1.6 * unit, rng, 0.6), at + 5 * unit + jit())
        if not first:
            nxt = CHORDS[((b + 1) % BARS) // 2]
            loop.add('bass', bass_note(approach(ROOT[nxt]), 0.8 * unit, rng, 0.45), at + 7 * unit + jit())
        # the kit: kick on 1 and 3
        loop.add('kick', kick(rng, 0.7 if first else 0.55), at + jit())
        loop.add('kick', kick(rng, 0.45), at + 4 * unit + jit())
        # variant A: picked chord tones, the brush on 2 and 4
        if ga > 0.04:
            pat = ((0, 0, 0.75), (3, 2, 0.55), (5, 3, 0.5)) if first else ((0, 1, 0.6), (4, 2, 0.5), (4, 3, 0.45), (6, 1, 0.4))
            for pos, idx, dyn in pat:
                loop.add('gtrA', guitar_note(hz(v[idx]), 2.6 * unit, rng, dyn * ga), at + pos * unit + jit())
            for pos in (2, 6):
                loop.add('brush', brush(rng, 0.6 * ga), at + pos * unit + jit())
        # variant B: soft chords on the and-of-2, pipe backbeat, chain off-beats
        if gb > 0.04:
            if first:
                for i, nm in enumerate(v):
                    loop.add('gtrB', guitar_note(hz(nm), 5.5 * unit, rng, 0.42 * gb, pluck=0.3), at + 0.012 * i + jit())
            for i, nm in enumerate(v[1:]):
                loop.add('gtrB', guitar_note(hz(nm), 1.2 * unit, rng, 0.35 * gb, pluck=0.3), at + 3 * unit + 0.01 * i + jit())
            for pos in (2, 6):
                loop.add('pipe', pipe(rng, 0.55 * gb), at + pos * unit + jit())
            for pos in (1, 3, 5, 7):
                loop.add('chain', chain(rng, (0.4 if pos % 4 == 3 else 0.28) * gb), at + pos * unit + jit())
        if b % 4 == 0:
            loop.add('ting', ting(rng, 0.45), at + jit())
    for b0, notes in FILLS:
        for pos, nm, eighths in notes:
            loop.add('lead', guitar_note(hz(nm), eighths * unit * 0.95, rng, 0.6, pluck=0.15, pickup=0.2, tone=1.4),
                     b0 * bar + pos * unit + rng.normal(0, 0.004))
    return loop


STRIPS = {
    'bass': dict(gain=0.55, pan=0.0, send=0.04),
    'kick': dict(gain=0.64, pan=0.0, send=0.05),
    'gtrA': dict(gain=0.5, pan=-0.22, send=0.22),
    'gtrB': dict(gain=0.45, pan=0.2, send=0.25),
    'lead': dict(gain=0.42, pan=-0.05, send=0.3),
    'brush': dict(gain=0.63, pan=0.35, send=0.12),
    'pipe': dict(gain=0.47, pan=0.35, send=0.2),
    'chain': dict(gain=0.74, pan=-0.4, send=0.15),
    'ting': dict(gain=0.23, pan=0.45, send=0.45),
}


def tune(name='music_main'):
    if name != 'music_main':
        raise ValueError(name)
    loop, unit = music.loop_of(BARS, PER_BAR, 60.0 / BPM / 2.0)
    yard_radio(loop, unit)
    irs = [dsp.reverb_ir(t60=0.9, size=1.1, damp=0.3, lp=4500.0, hp=220.0, spread=s) for s in (1.0, 1.029)]
    meta = {'bars': BARS, 'bpm': BPM, 'meter': '4/4', 'title': 'yard radio', 'key': 'E major'}
    return loop, STRIPS, irs, meta


def render(name='music_main', stems_dir=None):
    loop, strips, irs, meta = tune(name)
    x = music.mixdown(loop, strips, irs)
    x = music.circ_filt(x, butter('lp', 6000.0, 2))       # a small radio's top
    y, m = music.master_loop(x)
    info = dict(meta)
    info.update(m)
    info.update({'duration': len(y) / SR, 'samples': len(y), 'peak_db': dsp.peak_db(y), 'loudness_db': dsp.krms_db(y)})
    if stems_dir:
        os.makedirs(stems_dir, exist_ok=True)
        g = dsp.undb(m['gain_db'])
        for stem, buf in loop.stems.items():
            one = music.Loop(loop.seconds)
            one.stems[stem] = buf
            dry = music.mixdown(one, {stem: dict(strips[stem], send=0.0)}, [np.zeros(1), np.zeros(1)])
            dsp.write_wav(os.path.join(stems_dir, stem + '.wav'), np.clip(dry * g, -1, 1).reshape(-1), channels=2)
        dsp.write_wav(os.path.join(stems_dir, 'mix.wav'), y.reshape(-1), channels=2)
    return y, info


def build(name, path, kbps=KBPS):
    y, info = render(name)
    trim = 0.0
    for _ in range(4):
        music.encode_m4a(y * dsp.undb(-trim), path, kbps)
        z = music.decode(path)
        over = dsp.peak_db(z) - music.MUSIC_PEAK_MAX_DB
        if over <= 0.0:
            break
        trim += over + 0.1
    info.update({'peak_db': dsp.peak_db(z), 'loudness_db': dsp.krms_db(z), 'bytes': os.path.getsize(path), 'trim_db': trim})
    return info


def stem_levels():
    loop, strips, irs, _ = tune()
    for stem, buf in loop.stems.items():
        print('%-6s %6.1f dB K-RMS (dry, at its strip gain)' % (stem, dsp.krms_db(buf * strips[stem]['gain'])))


def print_score():
    for b0, notes in FILLS:
        print('bar %2d: %s' % (b0 + 1, ' '.join('%s/%d@%d' % (nm, e, pos) for pos, nm, e in notes)))
    print('chords, two bars each:', ' '.join(CHORDS))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out')
    ap.add_argument('--wav')
    ap.add_argument('--stems')
    ap.add_argument('--levels', action='store_true')
    ap.add_argument('--score', action='store_true')
    a = ap.parse_args(argv)
    if a.score:
        print_score()
        return 0
    if a.levels:
        stem_levels()
        return 0
    if a.out:
        info = build('music_main', a.out)
        print(info)
    if a.wav or a.stems:
        y, info = render('music_main', a.stems)
        if a.wav:
            dsp.write_wav(a.wav, y.reshape(-1), channels=2)
        print(info)
    return 0


if __name__ == '__main__':
    sys.exit(main())
