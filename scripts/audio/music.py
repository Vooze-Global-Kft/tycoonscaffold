#!/usr/bin/env python3
"""Compose and render the music loops. Python 3 + numpy; ffmpeg for the AAC export.

  python3 scripts/audio/music.py --tune trattoria --out games/pizza-empire/assets/sfx/music_main.m4a
  python3 scripts/audio/music.py --tune neutral --out shared/sfx/music_main.m4a
  python3 scripts/audio/music.py --tune trattoria --wav /tmp/t.wav --stems /tmp/stems   (no ffmpeg needed)
  python3 scripts/audio/music.py --list

make_sfx.py calls build() for every catalogue key with `loop: true`, so the
usual way in is `make_sfx.py --only music_main --music <tune>`.

Two tunes, both original:

  trattoria  Pizza Empire. A 6/8 tarantella-lilt in C at 116 bpm, 40 bars
             (A A' B B' A''): Karplus-Strong mandolin with tremolo on the long
             notes, a second mandolin in thirds, an accordion (stabs and a
             reed pad), a plucked bass and a tambourine.
  neutral    The shared fallback. 16 bars of 4/4 at 120 bpm, played on the
             *pack's* instruments (marimba, kalimba, pad in the warm pack), so
             it follows the pack's key and colour.

A tune is written as text (see the SCORE strings), performed onto mono stems
that may run past the end of the loop, mixed to stereo with a reverb, and
then *folded*: everything after the last bar is added back onto the first
bars. Decays and reverb therefore run through the seam, and the file can
repeat for ever without a click or a breath. The last bar of each tune is a
pick-up into the first.
"""
from __future__ import annotations

import sys

sys.dont_write_bytecode = True

import argparse
import collections
import math
import os
import re
import subprocess

import numpy as np

import dsp
from dsp import (SR, TAU, bandpass, bq, butter, cents, filt, glide_exp, harmonics, highpass, lowpass, midi,
                 mtof, ns, perc, phase, pluck_burst, rcos_in, rcos_out, rng_for, string_loop, white)

MUSIC_KBPS = 96
MUSIC_PEAK_MAX_DB = -1.0          # of the *decoded* file; AAC overshoots what it was given
MUSIC_BUDGET_BYTES = 700_000
AAC_FRAME = 1024


# ---------------------------------------------------------------------------
# the score language
# ---------------------------------------------------------------------------
#
#   "g5 f#5 g5 e6/2 d6 | c6/3~ g5/2 e5"
#
# Bars are separated by `|`. A token is a note name with its octave (c4 is
# middle C; `#` and `b` are accidentals), or `r` for a rest. `/n` makes it n
# grid units long (default 1; the unit is the tune's shortest common value, an
# eighth note in both tunes here). Flags: `~` tremolo (mandolin), `>` accent,
# `.` short. Every bar must add up, which catches most typing mistakes.

Note = collections.namedtuple('Note', 'u dur m flags')     # u, dur in grid units from the start of the passage

_TOKEN = re.compile(r'([a-gr])([#b]?)(\d?)(?:/(\d+(?:\.\d+)?))?([~>.]*)$')


def parse(text, per_bar, what='voice'):
    """Score text -> ([Note, ...], number of bars)."""
    notes = []
    bars = [b for b in (s.strip() for s in text.replace('\n', ' ').split('|')) if b]
    for bi, bar in enumerate(bars):
        pos = 0.0
        for tok in bar.split():
            m = _TOKEN.match(tok)
            if not m or (m.group(1) != 'r' and not m.group(3)):
                raise ValueError('%s, bar %d: cannot read %r' % (what, bi + 1, tok))
            d = float(m.group(4)) if m.group(4) else 1.0
            if m.group(1) != 'r':
                notes.append(Note(bi * per_bar + pos, d, midi(m.group(1).upper() + m.group(2) + m.group(3)), m.group(5)))
            pos += d
        if abs(pos - per_bar) > 1e-9:
            raise ValueError('%s, bar %d holds %g units, not %g: "%s"' % (what, bi + 1, pos, per_bar, bar))
    return notes, len(bars)


def parse_chords(text):
    """'C C G7 C/E7' -> [('C', 'C'), ('C', 'C'), ('G7', 'G7'), ('C', 'E7')]: one entry per bar, as two halves."""
    out = []
    for tok in text.replace('|', ' ').split():
        a, _, b = tok.partition('/')
        out.append((a, b or a))
    return out


# ---------------------------------------------------------------------------
# the loop under construction
# ---------------------------------------------------------------------------

class Loop:
    """Mono stems on a common clock. Sounds may start before 0 (a pick-up: it
    is moved to the end of the loop) and may ring past the end (the tail is
    folded back onto the start in mixdown)."""

    def __init__(self, seconds, tail=4.0):
        self.seconds = float(seconds)
        self.n = int(round(seconds * SR))
        self.size = self.n + ns(tail)
        self.stems = collections.OrderedDict()

    def add(self, stem, x, at, gain=1.0):
        if at < 0.0:
            at += self.seconds
        buf = self.stems.get(stem)
        if buf is None:
            buf = self.stems[stem] = np.zeros(self.size)
        i = int(round(at * SR))
        k = min(len(x), self.size - i)
        if k <= 0:
            return
        seg = np.asarray(x[:k], float)
        if k < len(x):
            seg = seg * rcos_out(k, 30.0)
        buf[i:i + k] += gain * seg


def loop_of(bars, per_bar, unit):
    """-> (an empty Loop of `bars` bars, the exact grid unit in seconds).

    The length is rounded to a whole number of AAC frames. A frame is 1024
    samples, and an encoder has to pad the last one; players that do not trim
    that padding (it is up to 23 ms of silence) would breathe at every
    repeat. With nothing to pad, every decoder returns exactly the loop. The
    price is a tempo that is off by less than 0.01 %.
    """
    n = int(round(bars * per_bar * unit * SR / AAC_FRAME)) * AAC_FRAME
    loop = Loop(n / float(SR))
    return loop, loop.seconds / (bars * per_bar)


def fold(full, n):
    """Wrap everything after sample n back onto the start (as often as it takes)."""
    out = full[:n].copy()
    rest = full[n:]
    while len(rest):
        k = min(len(rest), n)
        out[:k] += rest[:k]
        rest = rest[k:]
    return out


def pan_gains(pan):
    """Constant-power pan, -1 (left) .. +1 (right)."""
    a = (pan + 1.0) * math.pi / 4.0
    return math.cos(a), math.sin(a)


def mixdown(loop, strips, irs):
    """Stems -> one stereo loop.

    strips = {stem: dict(gain, pan, send, eq)}; `send` is how much of the stem
    feeds the reverb (irs = left and right impulse responses), `eq` an
    optional list of biquad sections (an instrument's body).
    """
    extra = max(len(ir) for ir in irs) + ns(0.1)
    full = np.zeros((loop.size + extra, 2))
    send = np.zeros(loop.size + ns(0.06))
    for name, buf in loop.stems.items():
        s = strips[name]
        x = filt(buf, s['eq'], tail=0.05) if s.get('eq') else buf
        l, r = pan_gains(s.get('pan', 0.0))
        full[:len(x), 0] += s['gain'] * l * x
        full[:len(x), 1] += s['gain'] * r * x
        send[:len(x)] += s['gain'] * s.get('send', 0.0) * x
    for c in (0, 1):
        wet = dsp.convolve(send, irs[c])[:len(full)]
        full[:len(wet), c] += wet
    return fold(full, loop.n)


def circ_filt(x, sections):
    """Filter a finished loop circularly (the FFT of exactly one pass), so the
    filter's own ringing wraps through the seam as well."""
    n = len(x)
    H = dsp.response(sections, TAU * np.arange(n // 2 + 1) / n)
    return np.stack([np.fft.irfft(np.fft.rfft(x[:, c]) * H, n) for c in range(x.shape[1])], axis=1)


def master_loop(x, target_db=dsp.MUSIC_TARGET_DB, ceil_db=dsp.MUSIC_CEILING_DB):
    """Sub-sonic high-pass, loudness target, soft limiter: all of it circular."""
    x = circ_filt(x - x.mean(axis=0), butter('hp', 38.0, 2))
    m = ns(0.25)

    def lim(y):
        z, gr = dsp.limit(np.concatenate([y[-m:], y, y[:m]]), ceil_db)       # limiter gain is continuous over the seam
        return z[m:-m], gr

    g = target_db - dsp.krms_db(x)
    for _ in range(6):
        y, gr = lim(x * dsp.undb(g))
        err = target_db - dsp.krms_db(y)
        if abs(err) < 0.02:
            break
        g += err
    return y, {'gain_db': g, 'limit_db': gr}


# ---------------------------------------------------------------------------
# instruments of the trattoria band
# ---------------------------------------------------------------------------

def mandolin_note(f, dur, strokes, rng, bright=1.0):
    """One course (a pair of strings) of a mandolin, Karplus-Strong.

    strokes = [(seconds, velocity, down_stroke), ...]. Every stroke is a new
    pick burst fed into the *same* two ringing strings: that is what a
    tremolo is, and why it sounds like one instrument and not like a row of
    separate notes. Just before each new stroke the pick rests on the string
    for a few ms (the loop gain dips). The two strings sit a few cents apart,
    and the pick crosses them one after the other: first-second on the way
    down, second-first on the way up, the up-stroke a little softer, closer
    to the neck and of opposite polarity.
    """
    n = ns(dur)
    t60 = 1.25 * (440.0 / f) ** 0.45
    damp, contact = 0.22, 0.003
    out = np.zeros(n)
    for si, det in enumerate((-2.2, 2.8)):
        fs = cents(f, det)
        x = np.zeros(n)
        gain = np.ones(n)
        keep = 0.25 ** (1.0 / max(fs * contact, 1.0))     # per round trip: the touch costs the same at any pitch
        ref = None
        for j, (t, vel, down) in enumerate(strokes):
            i = int(round((t + 0.0022 * (si if down else 1 - si)) * SR))
            if i >= n:
                continue
            hard = min((0.60 if down else 0.52) * bright * (0.75 + 0.25 * min(vel, 1.2)), 0.95)
            b = pluck_burst(fs, rng, pick=0.13 if down else 0.17, hardness=hard, noise=0.30)
            if ref is None:
                probe = np.zeros(4 * len(b))
                probe[:len(b)] = b
                ref = np.max(np.abs(string_loop(fs, probe, t60, damp))) + 1e-12      # a full stroke peaks at 1
            k = min(len(b), n - i)
            x[i:i + k] += (vel if down else -vel) * b[:k]
            if j:
                gain[max(i - int(contact * SR), 0): i] = keep
        if ref is not None:
            out += string_loop(fs, x, t60, damp, gain) / ref
    return 0.5 * out


def play_mandolin(loop, stem, notes, unit, per_bar, hz, rng, level=1.0, bright=1.0):
    """Perform a voice on the mandolin. `level` is a number or a function of the note.

    Long notes marked `~` are a measured tremolo (two strokes per grid unit,
    swelling a little towards the middle of the note); everything else is one
    stroke: in 6/8 down-up-down on each beat, otherwise down on the eighth
    and up off it. A note is damped where the next one of the voice begins
    (it is the same hand), so lines stay clean, and the last note of the loop
    is damped by the first: the voice comes round again. A note before a
    rest rings out.
    """
    notes = sorted(notes, key=lambda nt: nt.u)
    half = per_bar / 2.0
    for i, nt in enumerate(notes):
        f = hz(nt.m)
        t0, d = nt.u * unit, nt.dur * unit
        nxt = notes[i + 1].u * unit if i + 1 < len(notes) else notes[0].u * unit + loop.seconds
        pos = nt.u % per_bar
        accent = 1.0 if pos == 0 else 0.93 if pos == half else 0.84
        vel = (level(nt) if callable(level) else level) * accent * (1.1 if '>' in nt.flags else 1.0) * rng.uniform(0.95, 1.04)
        if '~' in nt.flags:
            count = max(int(round(nt.dur * 2)), 2)
            gap = d / count
            strokes = []
            for k in range(count):
                swell = 0.84 + 0.16 * math.sin(math.pi * (k + 0.5) / count)
                v = vel * swell * (1.0 if k % 2 == 0 else 0.86) * rng.uniform(0.95, 1.05)
                strokes.append((k * gap + (rng.normal(0.0, 0.0025) if k else 0.0), v, k % 2 == 0))
        else:
            down = (pos % 3 != 1) if per_bar % 3 == 0 else (int(pos) % 2 == 0)
            strokes = [(0.0, vel * (1.0 if down else 0.9), down)]
        last = max(strokes[-1][0], 0.0)
        length = last + 1.5 * 1.25 * (440.0 / f) ** 0.45        # let it ring: one and a half T60
        fade = 140.0
        if '.' in nt.flags:
            length, fade = min(length, 0.6 * d), 40.0
        if nxt - t0 + 0.05 < length:
            length, fade = nxt - t0 + 0.05, 55.0
        y = mandolin_note(f, length, strokes, rng, bright)
        y *= rcos_out(len(y), fade)
        loop.add(stem, y, t0 + rng.normal(0.0, 0.002))


def _reed_amp(k, kf):
    """Spectrum of a free reed: close to 1/k, a nasal bump near 1.4 kHz, soft above 3.6 kHz."""
    return k ** -1.15 * (1.0 + 0.8 / (1.0 + ((kf - 1400.0) / 600.0) ** 2)) / np.sqrt(1.0 + (kf / 3600.0) ** 4)


_REED_CACHE = {}


def accordion(freqs, dur, attack=0.022, release=0.05, swell=0.0):
    """Accordion chord, RMS about 0.2. Every note is two reeds ten cents apart
    (the 'tremolo' tuning that makes an accordion sound Italian: they beat a
    few times a second). The bellows give a soft attack and release; `swell`
    leans into the middle of a held chord."""
    key = (tuple(round(f, 3) for f in freqs), round(dur, 4), attack, release, swell)
    if key not in _REED_CACHE:
        rng = rng_for('music', 'reed', key)
        n = ns(dur + release)
        y = np.zeros(n)
        for f in freqs:
            for det, lv in ((0.0, 1.0), (10.0, 0.8)):
                y += lv * harmonics(cents(f, det), n, _reed_amp, fmax=5200.0, ph_rng=rng)
        y *= 0.2 / (np.sqrt(np.mean(y * y)) + 1e-12)
        env = rcos_in(n, attack * 1000.0) * rcos_out(n, release * 1000.0)
        if swell:
            env = env * (1.0 - swell + swell * np.sin(np.pi * np.arange(n) / n))
        _REED_CACHE[key] = y * env
    return _REED_CACHE[key]


def bass_note(f, dur, rng):
    """Plucked bass: a dull, heavily damped Karplus-Strong string with a
    little pure fundamental under it, stopped by the hand after `dur`."""
    n = ns(dur)
    y = dsp.karplus(f, n, rng, t60=1.8, damp=0.5, pick=0.30, hardness=0.25, noise=0.10)
    y = lowpass(y, 1200.0, 2)
    t = np.arange(n) / SR
    y += 0.4 * np.sin(TAU * f * t) * perc(n, 6.0, 0.16)
    return y * rcos_in(n, 2.0) * rcos_out(n, 70.0)


def jingle(rng, dur=0.10, tap=0.0):
    """Tambourine: a handful of zils set off within a few ms of each other
    (noise grains ringing five narrow bands), with the hand on the skin
    (`tap`: a short low thump) for the accented beats."""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.zeros(n)
    for g in range(4):
        d = rng.uniform(0.002, 0.016) if g else 0.0
        a = rng.uniform(0.45, 1.0) if g else 1.0
        env += a * np.exp(-np.maximum(t - d, 0.0) / rng.uniform(0.010, 0.026)) * (t >= d)
    x = white(n, rng) * env * rcos_in(n, 1.5)
    y = 0.22 * highpass(x, 3200.0, 2)
    for fc, q, a in ((3100.0, 5.0, 0.55), (4300.0, 6.0, 1.0), (5600.0, 6.0, 0.9), (6900.0, 7.0, 0.65), (8100.0, 7.0, 0.35)):
        y += a * bandpass(x, fc * rng.uniform(0.97, 1.03), q)
    y = lowpass(y, 9000.0, 2) * rcos_out(n, 12.0)
    if tap:
        nt = min(ns(0.12), n)
        ph = phase(glide_exp(250.0, 165.0, nt, 0.02), nt)
        y[:nt] += tap * 1.4 * np.sin(ph) * perc(nt, 1.5, 0.030)
    return y


def shake(rng, dur=0.09, attack_ms=10.0):
    """Shaker: a soft swell of band-passed noise ('tss')."""
    n = ns(dur)
    y = lowpass(bandpass(white(n, rng), 5200.0, 1.0), 8500.0, 2)
    return 1.6 * y * perc(n, attack_ms, 0.022) * rcos_out(n, 12.0)


MANDOLIN_BODY = [bq('hp', 230.0, 0.7), bq('peak', 470.0, 2.5, 4.0), bq('peak', 1150.0, 1.8, 3.0),
                 bq('peak', 2700.0, 2.2, 3.5), bq('hs', 5200.0, 0.7, -5.0)] + butter('lp', 8200.0, 2)


# ---------------------------------------------------------------------------
# tune: trattoria (Pizza Empire)
# ---------------------------------------------------------------------------
#
# 6/8, the unit is an eighth note. Form A A' B B' A'', eight bars each.
# The theme (bars 1-2) is a chromatic neighbour-note curl, a leap of a sixth
# and a step-wise fall onto the key note; bars 3-4 answer a step lower over
# the dominant. B turns to the relative minor, B' climbs back through F and a
# D7 to the dominant. The last three eighths of bars 8, 32 and 40 are the same
# chromatic pick-up (e f f#) into the theme, so the end of the loop leads
# into its beginning exactly as the end of A leads into A'.

TRATTORIA_BPM = 116.0           # dotted quarters per minute: two to the bar

TRATTORIA_LEAD = """
 g5 f#5 g5 e6/2 d6 | c6/3~ g5/2 e5    | f5 e5 f5 d6/2 c6  | b5/3~ g5/2 d5    |
 f5/2 a5 d6/2 c6   | b5/2 a5 g5/2 f5  | e5/2 g5 c6/2 e6   | d6/3~ e5 f5 f#5  |

 g5 f#5 g5 e6/2 d6 | c6/3~ g5/2 e5    | f5 e5 f5 d6/2 c6  | b5/3~ g5/2 d5    |
 f5/2 a5 d6/2 f6   | e6/2 d6 b5/2 g5  | c6/2 e6 d6 c6 b5  | c6/3~ r e5 g#5   |

 a5/2 e5 a5/2 b5   | c6/3~ b5/2 a5    | g#5/2 e5 g#5/2 a5 | b5/3~ a5/2 g#5   |
 a5/2 c6 e6/2 d6   | f6/2 e6 d6/2 c6  | b5/2 c6 b5/2 g#5  | a5/3~ g5 a5 a#5  |

 c6/2 a5 f6/2 e6   | d6/2 c6 a5/3~    | c6/2 g5 e6/2 d6   | c6/2 b5 g5/3~    |
 d5 e5 f5 a5/2 d6  | c6/2 a5 f#5/2 a5 | g5/2 b5 d6/2 f6   | d6/3~ e5 f5 f#5  |

 g5 f#5 g5 e6/2 d6 | c6/3~ g5/2 e5    | f5 e5 f5 d6/2 c6  | b5/3~ g5/2 d5    |
 f5/2 a5 d6/2 f6   | e6/2 d6 b5/2 d6  | c6/6~             | g5/3~ e5 f5 f#5  |
"""

# The second mandolin: thirds (now and then a sixth or a fourth) under the
# lead in A' and A'', and for the climb at the end of B'.
TRATTORIA_SECOND = """
 r/6 | r/6 | r/6 | r/6 | r/6 | r/6 | r/6 | r/3 c5 d5 d#5 |

 e5 d#5 e5 c6/2 b5 | e5/3~ e5/2 c5    | d5 c#5 d5 b5/2 a5 | g5/3~ d5/2 b4    |
 d5/2 f5 a5/2 d6   | c6/2 b5 g5/2 d5  | g5/2 c6 b5 a5 g5  | e5/3~ r b4 e5    |

 r/6 | r/6 | r/6 | r/6 | r/6 | r/6 | r/6 | r/6 |

 r/6 | r/6 | r/6 | r/6 | r/6 | r/6 | b4/2 d5 f5/2 b5 | b5/3~ c5 d5 d#5 |

 e5 d#5 e5 c6/2 b5 | e5/3~ e5/2 c5    | d5 c#5 d5 b5/2 a5 | g5/3~ d5/2 b4    |
 d5/2 f5 a5/2 d6   | c6/2 b5 g5/2 b5  | e5/6~             | e5/3~ c5 d5 d#5  |
"""

TRATTORIA_CHORDS = """
 C  C  G7 G7 Dm G7 C  G7    |  C  C  G7 G7 Dm G7 C  C/E7   |  Am Am E7 E7 Am Dm E7 Am/C7  |
 F  F  C  C  Dm D7 G7 G7    |  C  C  G7 G7 Dm G7 C  C/G7
"""

# chord -> (bass: root, fifth, another chord tone), accordion stab, accordion pad
TRATTORIA_VOICINGS = {
    'C':  (('C3', 'G2', 'E3'), ('G4', 'C5', 'E5'), ('E4', 'G4', 'C5')),
    'G7': (('G2', 'D3', 'B2'), ('F4', 'B4', 'D5'), ('D4', 'F4', 'B4')),
    'Dm': (('D3', 'A2', 'F3'), ('F4', 'A4', 'D5'), ('D4', 'F4', 'A4')),
    'F':  (('F2', 'C3', 'A2'), ('F4', 'A4', 'C5'), ('C4', 'F4', 'A4')),
    'Am': (('A2', 'E3', 'C3'), ('E4', 'A4', 'C5'), ('C4', 'E4', 'A4')),
    'E7': (('E2', 'B2', 'G#2'), ('E4', 'G#4', 'D5'), ('D4', 'E4', 'G#4')),
    'D7': (('D3', 'A2', 'F#2'), ('F#4', 'A4', 'C5'), ('C4', 'D4', 'F#4')),
    'C7': (('C3', 'E3', 'G2'), ('G4', 'A#4', 'E5'), ('E4', 'G4', 'A#4')),
}

# bars (counted from 0) whose bass walks into the next section instead of root-and-fifth
TRATTORIA_WALKS = {
    7:  ((0, 'G2'), (3, 'G2'), (4, 'A2'), (5, 'B2')),
    15: ((0, 'C3'), (3, 'E2'), (4, 'G#2'), (5, 'B2')),
    23: ((0, 'A2'), (3, 'C3'), (4, 'A#2'), (5, 'G2')),
    31: ((0, 'G2'), (3, 'G2'), (4, 'A2'), (5, 'B2')),
    39: ((0, 'C3'), (3, 'G2'), (4, 'A2'), (5, 'B2')),
}

# per section (eight bars each): how the band plays
#   stab, pad: accordion levels; second: second mandolin level; perc: pattern name
TRATTORIA_SECTIONS = (
    dict(name='A',   lead=0.92, second=0.0,  stab=0.80, pad=0.55, perc='shaker'),
    dict(name="A'",  lead=1.00, second=0.85, stab=0.95, pad=0.70, perc='tambourine'),
    dict(name='B',   lead=0.90, second=0.0,  stab=0.55, pad=1.00, perc='shaker6'),
    dict(name="B'",  lead=0.97, second=0.85, stab=0.85, pad=0.90, perc='build'),
    dict(name="A''", lead=1.05, second=0.95, stab=1.00, pad=0.80, perc='full'),
)

# eighth-note position -> (kind, level); kinds: s shaker, j jingle, t jingle with the hand on the skin
TRATTORIA_PERC = {
    'shaker':     {2: ('s', 0.55), 5: ('s', 0.50)},
    'tambourine': {0: ('t', 0.60), 2: ('j', 0.50), 3: ('t', 0.45), 5: ('j', 0.45)},
    'shaker6':    {0: ('s', 0.60), 1: ('s', 0.25), 2: ('s', 0.42), 3: ('s', 0.52), 4: ('s', 0.25), 5: ('s', 0.42)},
    'build':      {0: ('t', 0.55), 2: ('j', 0.50), 3: ('j', 0.42), 5: ('j', 0.50)},
    'full':       {0: ('t', 0.80), 1: ('j', 0.26), 2: ('j', 0.55), 3: ('t', 0.62), 4: ('j', 0.26), 5: ('j', 0.55)},
}


def trattoria(pack):
    per_bar = 6
    unit = 60.0 / TRATTORIA_BPM / 3.0
    lead, bars = parse(TRATTORIA_LEAD, per_bar, 'trattoria lead')
    second, bars2 = parse(TRATTORIA_SECOND, per_bar, 'trattoria second mandolin')
    chords = parse_chords(TRATTORIA_CHORDS)
    if not bars == bars2 == len(chords) == 8 * len(TRATTORIA_SECTIONS):
        raise ValueError('trattoria: the parts disagree about the number of bars (%d, %d, %d)' % (bars, bars2, len(chords)))
    loop, unit = loop_of(bars, per_bar, unit)

    def hz(m):
        return mtof(midi(m) + pack.transpose)

    def section(u):
        return TRATTORIA_SECTIONS[int(u // (8 * per_bar)) % len(TRATTORIA_SECTIONS)]

    # --- mandolins: how hard they play follows the section a note is in
    for stem, notes, which in (('mandolin', lead, 'lead'), ('mandolin 2', second, 'second')):
        play_mandolin(loop, stem, notes, unit, per_bar, hz, rng_for('music', 'trattoria', stem),
                      level=lambda nt, which=which: section(nt.u)[which])

    # --- accordion, bass, percussion: bar by bar
    rng_b = rng_for('music', 'trattoria', 'bass')
    rng_p = rng_for('music', 'trattoria', 'perc')
    zils = [(jingle(rng_p), jingle(rng_p, tap=1.0), shake(rng_p)) for _ in range(6)]
    prev = None
    for b, (c1, c2) in enumerate(chords):
        sec = TRATTORIA_SECTIONS[b // 8]
        t_bar = b * per_bar * unit
        # accordion: the "pah" of oom-pah on the third and sixth eighth, over a soft held chord
        for pos, ch in ((2, c1), (5, c2)):
            stab = accordion([hz(nt) for nt in TRATTORIA_VOICINGS[ch][1]], 0.60 * unit)
            loop.add('accordion', stab, t_bar + pos * unit + 0.004, 0.75 * sec['stab'] * (1.0 if pos == 2 else 0.9))
        for half, ch in enumerate((c1, c2)):
            if half and c2 == c1:
                continue
            length = (per_bar if c2 == c1 else per_bar / 2.0) * unit
            pad = accordion([hz(nt) for nt in TRATTORIA_VOICINGS[ch][2]], length - 0.03, attack=0.07, release=0.12, swell=0.25)
            loop.add('accordion', pad, t_bar + half * 3 * unit, 0.50 * sec['pad'])
        # bass: root on one, fifth on two; the third instead of the root when the chord repeats
        if b in TRATTORIA_WALKS:
            line = TRATTORIA_WALKS[b]
        else:
            root, fifth, other = TRATTORIA_VOICINGS[c1][0]
            line = ((0, other if prev == c1 and b % 2 else root), (3, TRATTORIA_VOICINGS[c2][0][1] if c2 == c1 else TRATTORIA_VOICINGS[c2][0][0]))
        for pos, nt in line:
            walking = len(line) > 2 and pos >= 3
            y = bass_note(hz(nt), (0.95 if walking else 2.3) * unit, rng_b)
            loop.add('bass', y, t_bar + pos * unit + rng_b.normal(0.0, 0.0015), (0.9 if pos else 1.0) * rng_b.uniform(0.95, 1.03))
        prev = c2
        # tambourine and shaker
        grow = 1.0
        if sec['perc'] == 'build':
            grow = 0.75 + 0.35 * (b % 8) / 7.0
        for pos, (kind, lv) in TRATTORIA_PERC[sec['perc']].items():
            j, jt, s = zils[rng_p.randint(len(zils))]
            y = {'s': s, 'j': j, 't': jt}[kind]
            loop.add('percussion', y, t_bar + pos * unit + rng_p.normal(0.0, 0.002), grow * lv * rng_p.uniform(0.9, 1.05))
        if b % 8 == 7 and sec['perc'] in ('build', 'full'):
            # a sixteenth-note shake through the last half bar: the lead-in to the next section, and to the top of the loop
            for k in range(6):
                j = zils[rng_p.randint(len(zils))][0]
                loop.add('percussion', j, t_bar + (3 + k / 2.0) * unit, 0.30 + 0.07 * k)

    strips = {
        'mandolin':   dict(gain=1.00, pan=-0.14, send=0.20, eq=MANDOLIN_BODY),
        'mandolin 2': dict(gain=0.62, pan=0.32, send=0.20, eq=MANDOLIN_BODY),
        'accordion':  dict(gain=0.70, pan=0.20, send=0.16),
        'bass':       dict(gain=0.85, pan=0.0, send=0.03),
        'percussion': dict(gain=0.22, pan=-0.30, send=0.10),
    }
    irs = [dsp.reverb_ir(t60=0.85, size=1.05, damp=0.30, predelay_ms=12.0, lp=4800.0, hp=320.0, spread=s) for s in (1.0, 1.031)]
    meta = {'bars': bars, 'bpm': TRATTORIA_BPM, 'meter': '6/8', 'key': 'C major' if not pack.transpose else 'C major %+d semitones' % pack.transpose}
    return loop, strips, irs, meta


# ---------------------------------------------------------------------------
# tune: neutral (the shared fallback), on the pack's own instruments
# ---------------------------------------------------------------------------
#
# 4/4, the unit is an eighth note. Only the pack's five notes in the lead, so
# every sound effect is in tune with it at any moment. Two eight-bar halves:
# a syncopated two-bar question and answer over slow chords, then longer
# notes over a quicker I-V-vi-IV style turn; the last bar runs down into the
# first note of the tune.

NEUTRAL_BPM = 120.0

NEUTRAL_LEAD = """
 e5/2 g5 a5/2 g5 e5/2 | c5/2 d5 e5/3 r/2 | e5/2 g5 a5/2 c6 a5/2 | g5/2 e5 a5/3 r/2 |
 a5/2 c6 d6/2 c6 a5/2 | g5/2 a5 c6/3 r/2 | d6/2 c6 a5/2 g5 d5/2 | e5/2 d5 g5/3 r/2 |
 c6/3 a5/3 c6/2       | d6/3 g5/3 d6/2   | e6/3 c6/3 g5/2       | a5/2 c6 a5/2 g5 e5/2 |
 c6/3 a5/3 c6/2       | d6/3 g5/3 a5 d6  | e6/2 d6 c6/2 a5 g5/2 | g5/3 r a5 g5 e5 d5 |
"""

NEUTRAL_CHORDS = "C C Am Am F F G G | F G C Am F G C G"

# chord -> (bass: root, fifth), kalimba cell (low to high), pad
NEUTRAL_VOICINGS = {
    'C':  (('C3', 'G2'), ('E4', 'G4', 'C5'), ('C4', 'E4', 'G4')),
    'Am': (('A2', 'E3'), ('E4', 'A4', 'C5'), ('C4', 'E4', 'A4')),
    'F':  (('F2', 'C3'), ('F4', 'A4', 'C5'), ('C4', 'F4', 'A4')),
    'G':  (('G2', 'D3'), ('D4', 'G4', 'B4'), ('B3', 'D4', 'G4')),
}

NEUTRAL_KALIMBA = ((1, 0, 0.8), (3, 1, 1.0), (4, 2, 0.9), (6, 1, 0.8), (7, 0, 0.7))      # (eighth, cell note, level)
NEUTRAL_SHAKER = (0.50, 0.28, 0.80, 0.30, 0.50, 0.28, 0.80, 0.36)


def neutral(pack):
    per_bar = 8
    unit = 60.0 / NEUTRAL_BPM / 2.0
    lead, bars = parse(NEUTRAL_LEAD, per_bar, 'neutral lead')
    chords = parse_chords(NEUTRAL_CHORDS)
    if bars != len(chords):
        raise ValueError('neutral: %d bars of melody, %d of chords' % (bars, len(chords)))
    loop, unit = loop_of(bars, per_bar, unit)
    rng = rng_for('music', 'neutral', pack.name)

    # lead: the pack's pluck (a marimba in the warm pack)
    for nt in lead:
        pos = nt.u % per_bar
        vel = (1.0 if pos == 0 else 0.92 if pos == 4 else 0.85) * rng.uniform(0.94, 1.04) * (0.9 if nt.u < 4 * per_bar else 1.0)
        y = pack.pluck(pack.hz(nt.m), vel, ring=0.42, bright=1.0, rng=rng, dur=min(nt.dur * unit + 0.45, 1.2))
        loop.add('lead', y * rcos_out(len(y), 120.0), nt.u * unit + rng.normal(0.0, 0.003))

    for b, (c1, _) in enumerate(chords):
        t_bar = b * per_bar * unit
        bassn, cell, padn = NEUTRAL_VOICINGS[c1]
        # bass: 3 + 3 + 2, the little push that makes it walk
        for pos, nt, lv in ((0, bassn[0], 1.0), (3, bassn[0], 0.8), (6, bassn[1], 0.85)):
            y = pack.pluck(pack.hz(nt), lv, ring=0.5, bright=0.7, rng=rng, dur=0.62)
            loop.add('bass', lowpass(y, 900.0, 2) * rcos_out(len(y), 150.0), t_bar + pos * unit + rng.normal(0.0, 0.002))
        # pad: one soft chord per bar, tied when the chord stays
        if b == 0 or chords[b - 1][0] != c1:
            held = 1
            while b + held < bars and chords[b + held][0] == c1:
                held += 1
            y = pack.pad([pack.hz(nt) for nt in padn], held * per_bar * unit + 0.3, attack=0.35, release=0.6, bright=0.8, rng=rng)
            loop.add('pad', y, t_bar)
        # kalimba: enters in bar 5 and fills the gaps the lead leaves
        if b >= 4:
            for pos, k, lv in NEUTRAL_KALIMBA:
                y = pack.tine(pack.hz(cell[k]), lv * rng.uniform(0.85, 1.0), ring=0.45, rng=rng, dur=0.7)
                loop.add('kalimba', y * rcos_out(len(y), 120.0), t_bar + pos * unit + rng.normal(0.0, 0.003))
        # shaker all the way, a wood-block back-beat and a soft thump in the second half
        soft = 0.7 if b < 4 else 1.0
        for pos, lv in enumerate(NEUTRAL_SHAKER):
            y = pack.shaker(lv * soft * rng.uniform(0.9, 1.05), fc=5000.0, q=1.0, attack_ms=7.0, tau=0.018, rng=rng)
            loop.add('shaker', y, t_bar + pos * unit + rng.normal(0.0, 0.002))
        if b == bars - 1:
            for k in range(4):        # a sixteenth-note shake into the top of the loop
                y = pack.shaker(0.45 + 0.1 * k, fc=5000.0, q=1.0, attack_ms=5.0, tau=0.014, rng=rng)
                loop.add('shaker', y, t_bar + (6 + k / 2.0) * unit)
        if b >= 8:
            for pos in (2, 6):
                loop.add('wood', pack.knock(pack.hz('E5'), 0.8, tau=0.012, tone=0.5, rng=rng), t_bar + pos * unit)
            for pos, lv in ((0, 0.9), (5, 0.5)):
                loop.add('thump', pack.thump(lv, f0=120.0, f1=62.0, tau=0.06, body=0.5, rng=rng), t_bar + pos * unit)

    strips = {
        'lead':    dict(gain=1.00, pan=-0.10, send=0.16),
        'kalimba': dict(gain=0.34, pan=0.35, send=0.20),
        'pad':     dict(gain=0.42, pan=0.10, send=0.12),
        'bass':    dict(gain=0.80, pan=0.0, send=0.02),
        'shaker':  dict(gain=0.11, pan=0.30, send=0.06),
        'wood':    dict(gain=0.16, pan=-0.30, send=0.12),
        'thump':   dict(gain=0.50, pan=0.0, send=0.0),
    }
    kw = dict(pack.REVERBS['hall'])
    irs = [dsp.reverb_ir(spread=s, **kw) for s in (1.0, 1.031)]
    meta = {'bars': bars, 'bpm': NEUTRAL_BPM, 'meter': '4/4', 'key': pack.key}
    return loop, strips, irs, meta


TUNES = collections.OrderedDict((('neutral', neutral), ('trattoria', trattoria)))


# ---------------------------------------------------------------------------
# rendering and export
# ---------------------------------------------------------------------------

def render(tune, pack, stems_dir=None):
    """-> (mastered stereo loop as an (n, 2) float array, info)."""
    if tune not in TUNES:
        raise ValueError('unknown tune %r (have: %s)' % (tune, ', '.join(TUNES)))
    loop, strips, irs, meta = TUNES[tune](pack)
    missing = [s for s in loop.stems if s not in strips]
    if missing:
        raise ValueError('%s: no mixer strip for %s' % (tune, ', '.join(missing)))
    x = mixdown(loop, strips, irs)
    y, m = master_loop(x)
    info = dict(meta)
    info.update(m)
    info.update({'tune': tune, 'duration': len(y) / SR, 'samples': len(y), 'peak_db': dsp.peak_db(y), 'loudness_db': dsp.krms_db(y)})
    if stems_dir:
        os.makedirs(stems_dir, exist_ok=True)
        g = dsp.undb(m['gain_db'])
        for name, buf in loop.stems.items():
            s = strips[name]
            one = Loop(loop.seconds)
            one.stems[name] = buf
            dry = mixdown(one, {name: dict(s, send=0.0)}, [np.zeros(1), np.zeros(1)])
            dsp.write_wav(os.path.join(stems_dir, '%s.wav' % name.replace(' ', '_')), np.clip(dry * g, -1.0, 1.0).reshape(-1), channels=2)
        dsp.write_wav(os.path.join(stems_dir, 'mix.wav'), y.reshape(-1), channels=2)
    return y, info


def _ffmpeg(cmd, data=None):
    try:
        run = subprocess.run(cmd, input=data, capture_output=True)
    except FileNotFoundError:
        raise RuntimeError('ffmpeg is needed to write .m4a (not found on PATH)')
    if run.returncode != 0:
        raise RuntimeError('ffmpeg failed: %s' % run.stderr.decode(errors='replace')[-400:])
    return run.stdout


def encode_m4a(x, path, kbps=MUSIC_KBPS):
    """Stereo float array -> AAC-LC in an .m4a, with ffmpeg's own encoder.

    Gapless looping needs the player to know exactly which decoded samples
    are the loop. The muxer writes an edit list that skips the encoder's 1024
    priming samples; `-movie_timescale` makes the edit's duration exact to the
    sample (the default, milliseconds, is not); and because loops are whole
    AAC frames long (see loop_of) there is no padding at the end to trim.
    AVFoundation (iOS queues a second copy of the item), ExoPlayer and
    browsers all read this. No tags, bit-exact flags: same input, same file.
    """
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    tmp = path + '.part.m4a'
    _ffmpeg(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', 'pipe:0',
             '-c:a', 'aac', '-b:a', '%dk' % kbps, '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact',
             '-movie_timescale', str(SR), '-movflags', '+faststart', tmp], np.asarray(x, '<f4').tobytes())
    os.replace(tmp, path)


def decode(path):
    """Any audio file -> (n, 2) float array, through ffmpeg."""
    raw = _ffmpeg(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '2', '-ar', str(SR), '-'])
    return np.frombuffer(raw, '<f4').astype(float).reshape(-1, 2)


def build(tune, pack, path, kbps=MUSIC_KBPS, stems_dir=None):
    """Render `tune` and write it to `path` (.m4a). Returns the info dict
    make_sfx.py prints: duration, peak_db and loudness_db (of the decoded
    file), bars, bpm, bytes.

    AAC does not preserve peaks, so the file is decoded again and, if its
    peak passes MUSIC_PEAK_MAX_DB, encoded once more a little lower.
    """
    y, info = render(tune, pack, stems_dir)
    trim = 0.0
    for _ in range(4):
        encode_m4a(y * dsp.undb(-trim), path, kbps)
        z = decode(path)
        over = dsp.peak_db(z) - MUSIC_PEAK_MAX_DB
        if over <= 0.0:
            break
        trim += over + 0.1
    info.update({'peak_db': dsp.peak_db(z), 'loudness_db': dsp.krms_db(z), 'bytes': os.path.getsize(path), 'trim_db': trim,
                 'decoded_samples': len(z), 'kbps': os.path.getsize(path) * 8 / 1000.0 / info['duration']})
    return info


def main(argv=None):
    from packs import PACKS
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--tune', default='neutral', choices=list(TUNES))
    ap.add_argument('--pack', default='warm', choices=sorted(PACKS), help='key and, for the neutral tune, the instruments')
    ap.add_argument('--out', help='.m4a to write (AAC, %d kb/s stereo)' % MUSIC_KBPS)
    ap.add_argument('--wav', help='also write the mastered loop as a 16-bit stereo WAV')
    ap.add_argument('--stems', help='folder for one WAV per instrument (dry, at mix level) and mix.wav')
    ap.add_argument('--list', action='store_true', help='show the tunes and stop')
    args = ap.parse_args(argv)
    if args.list:
        for name, fn in TUNES.items():
            loop, _, _, meta = fn(PACKS[args.pack]())
            print('%-10s %d bars of %s at %g bpm, %.2f s, %s; stems: %s'
                  % (name, meta['bars'], meta['meter'], meta['bpm'], loop.seconds, meta['key'], ', '.join(loop.stems)))
        return 0
    if not (args.out or args.wav or args.stems):
        ap.error('nothing to do: give --out, --wav or --stems')
    pack = PACKS[args.pack]()
    if args.out:
        info = build(args.tune, pack, args.out, stems_dir=args.stems)
        if args.wav:
            dsp.write_wav(args.wav, render(args.tune, pack)[0].reshape(-1), channels=2)
        print('%s: %s, %d bars of %s at %g bpm, %.2f s, peak %.1f dBFS, K-RMS %.1f dB, limiter %.1f dB, %.0f KB (%.0f kb/s)%s'
              % (args.out, args.tune, info['bars'], info['meter'], info['bpm'], info['duration'], info['peak_db'], info['loudness_db'],
                 info['limit_db'], info['bytes'] / 1000.0, info['kbps'],
                 '' if info['decoded_samples'] == info['samples'] else '; WARNING: decodes to %d samples, not %d' % (info['decoded_samples'], info['samples'])))
        if info['bytes'] > MUSIC_BUDGET_BYTES:
            print('music: %s is over the %d KB budget' % (args.out, MUSIC_BUDGET_BYTES // 1000), file=sys.stderr)
            return 1
    else:
        y, info = render(args.tune, pack, args.stems)
        if args.wav:
            dsp.write_wav(args.wav, y.reshape(-1), channels=2)
        print('%s: %d bars of %s at %g bpm, %.2f s, peak %.1f dBFS, K-RMS %.1f dB, limiter %.1f dB'
              % (args.tune, info['bars'], info['meter'], info['bpm'], info['duration'], info['peak_db'], info['loudness_db'], info['limit_db']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
