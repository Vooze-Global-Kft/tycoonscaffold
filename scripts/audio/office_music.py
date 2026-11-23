#!/usr/bin/env python3
"""High Office's music: two loops of about 90 s and the two election-night stings (spec 6).
Python 3 + numpy; ffmpeg for the AAC export.

  python3 scripts/audio/office_music.py --tune music_main --out /tmp/desk.m4a
  python3 scripts/audio/office_music.py --tune music_campaign --wav /tmp/march.wav --stems /tmp/stems   (no ffmpeg needed)
  python3 scripts/audio/office_music.py --tune music_main --levels
  python3 scripts/audio/office_music.py --score                     print the march's melody (for the originality check)

  music_main      spec 6's music_desk, "Minutes of the Previous Meeting": 34 bars of 4/4 at 90 bpm in F
                  major (90.7 s). Pizzicato bass on beats 1 and 3 with a walk into some chord changes;
                  wire brushes stirring the snare with taps on 2 and 4; two bassoons: one holds a soft
                  chord tone every four bars, the other makes four short, different remarks (bars 4, 12,
                  20, 28), never the same twice and never a tune: there is nothing to hum, so twenty
                  minutes of reading over it should not tire. The key is the shared player's: it starts
                  only `music_main` (src/services/fx/mix.ts MUSIC).
  music_campaign  "The Middling March" for the bandstand: 84 bars of 2/4 at 112 bpm in B-flat (90.0 s):
                  intro 4, A 8, A' 8, trio (E-flat) B 8, B' 8, a comic break of 8 (tuba and trombones
                  answering each other), A, A', B, B' again with a trombone counter-line, a tag of 8 back
                  to the intro. Cornet melody, euphonium and trombone after-beats, tuba, snare, bass drum,
                  clash cymbals at the phrase starts. Played from a distance (a lower top, more room).
  majority        the sting: the march's first eight bars, full band, the eighth bar a held B-flat chord
                  with a cymbal (mono .m4a, about 9 s).
  defeat          the sting: one tuba playing the march's first four bars slowly (70 bpm), two octaves
                  down, its last note sagging (mono .m4a, about 7 s).

The march is original: written for this game. `--score` prints it, and docs/design/office-audio-notes.md
records the check against the marches and anthems I could write down from memory (chroma and interval
n-grams) and against the other three games' music (compare.py --cross, music against music).

The instruments are this game's own (scripts/audio/recipes_office.py: brass, bassoon, pizzicato,
the bandstand's percussion, the brushes), never the first game's accordion, mandolin or kalimba,
nothing of the second game's synth pack, nothing of the third game's reed, bowed pad or hand drum.
Only the machinery is reused, imported from music.py: the Loop on a common clock, the AAC-frame loop
length, the stereo mixdown that folds tails through the seam, the circular mastering to the music
loudness, and the gapless AAC export.
"""
from __future__ import annotations

import sys

sys.dont_write_bytecode = True

import argparse
import math
import os

import numpy as np

import dsp
import music
import recipes_office as RO
from dsp import SR, midi, mtof, ns, points, rng_for

MUSIC_KBPS = 56          # 90 s at 56 kb/s is about 650 KB a loop: two loops, two stings and the effects under 3 MB
STING_KBPS = 56


def hz(name):
    return mtof(midi(name))


# ---------------------------------------------------------------------------
# a cache for notes that repeat (after-beats, tuba, pizzicato): same parameters, same samples
# ---------------------------------------------------------------------------

_CACHE = {}


def note(kind, nt, dur, dyn=0.8, var=0, **kw):
    """One rendered note of an instrument of recipes_office, cached by its parameters (var picks
    one of a few random takes so repeated notes are not identical copies)."""
    key = (kind, nt, round(dur, 4), round(dyn, 3), var, tuple(sorted(kw.items())))
    y = _CACHE.get(key)
    if y is None:
        rng = rng_for('office-music', *[str(k) for k in key])
        f = hz(nt)
        if kind in RO.BRASS:
            y = RO.brass(f, dur, rng, kind, dyn=dyn, **kw)
        elif kind == 'bassoon':
            y = RO.bassoon(f, dur, rng, dyn=dyn, **kw)
        elif kind == 'clarinet':
            y = RO.clarinet(f, dur, rng, dyn=dyn, **kw)
        elif kind == 'pizz':
            y = RO.pizz(f, rng, vel=dyn, dur=dur, **kw)
        else:
            raise ValueError(kind)
        _CACHE[key] = y
    return y


# ---------------------------------------------------------------------------
# "The Middling March" (B-flat, 2/4; the grid is a sixteenth, 8 to the bar)
# ---------------------------------------------------------------------------

MARCH_BPM = 112.0
MARCH_PER_BAR = 8

MARCH_A1 = """
f4/3 g4/1 a4/2 bb4/2 | d5/4 c5/2 r/2 | eb5/3 d5/1 c5/2 bb4/2 | a4/2 c5/2 f4/4 |
g4/3 a4/1 bb4/2 g4/2 | eb5/4 d5/2 c5/2 | bb4/2 d5/2 c5/2 a4/2 | bb4/4 r/2 f4/2
"""
MARCH_A2 = """
f4/3 g4/1 a4/2 bb4/2 | f5/4 eb5/2 d5/2 | c5/3 d5/1 eb5/2 c5/2 | a4/2 bb4/2 c5/4 |
d5/3 c5/1 bb4/2 a4/2 | g4/2 bb4/2 eb5/4 | d5/2 f4/2 a4/2 c5/2 | bb4/4 r/4
"""
MARCH_B1 = """
g4/4 ab4/2 bb4/2 | eb5/6 d5/2 | c5/4 bb4/2 ab4/2 | g4/6 r/2 |
f4/4 g4/2 ab4/2 | d5/6 c5/2 | bb4/2 ab4/2 g4/2 f4/2 | eb4/6 r/2
"""
MARCH_B2 = """
g4/4 ab4/2 bb4/2 | g5/6 f5/2 | eb5/4 d5/2 c5/2 | bb4/4 eb5/4 |
ab4/4 c5/2 bb4/2 | g4/4 f4/2 g4/2 | bb4/2 ab4/2 f4/2 d4/2 | eb4/6 r/2
"""
# the break: the tuba asks (bars 1, 3, 5), the trombones answer (bars 2, 4, 6), a run-up (7, 8)
MARCH_BREAK_TUBA = """
eb2/2 g2/2 bb2/2 g2/2 | r/8 | ab2/2 c3/2 eb3/2 c3/2 | r/8 | f2/2 a2/2 c3/2 eb3/2 | r/8 | f2/2 g2/2 a2/2 bb2/2 | c3/2 d3/2 eb3/2 e3/2
"""
MARCH_BREAK_BONE = """
r/8 | bb3/3 g3/1 eb3/4 | r/8 | c4/3 ab3/1 eb3/4 | r/8 | a3/3 f3/1 c3/4 | r/8 | r/8
"""
# the trombones' counter-line under the second A, A' (half notes on chord tones)
MARCH_COUNTER = """
d4/8 | f4/8 | g4/8 | a4/8 | bb4/8 | g4/8 | f4/4 eb4/4 | d4/8 |
d4/8 | ab4/8 | g4/8 | f4/8 | f4/8 | eb4/8 | eb4/4 c4/4 | d4/8
"""

CHORDS = {        # root (tuba, octave 2), the after-beat voicing
    'Bb': ('Bb', ('D4', 'F4', 'Bb4')), 'Bb7': ('Bb', ('D4', 'Ab4', 'Bb4')), 'Eb': ('Eb', ('Eb4', 'G4', 'Bb4')),
    'F7': ('F', ('Eb4', 'F4', 'A4')), 'F': ('F', ('C4', 'F4', 'A4')), 'Gm': ('G', ('D4', 'G4', 'Bb4')),
    'Cm': ('C', ('Eb4', 'G4', 'C5')), 'Ab': ('Ab', ('Eb4', 'Ab4', 'C5')), 'Fm': ('F', ('C4', 'F4', 'Ab4')),
    'Bb/F': ('F', ('D4', 'F4', 'Bb4')),
}
TUBA = {          # the tuba's root and fifth for each root, in octave 2 to 3 (a phone hears its harmonics)
    'Bb': ('Bb2', 'F3'), 'Eb': ('Eb3', 'Bb2'), 'F': ('F2', 'C3'), 'G': ('G2', 'D3'), 'C': ('C3', 'G2'), 'Ab': ('Ab2', 'Eb3'),
}
SECTIONS = (      # (name, bars, chords, melody text or None, extras)
    ('intro', 4, 'Bb Bb F7 F7', None, ()),
    ('A1', 8, 'Bb Bb Eb F7 Gm Cm F7 Bb', MARCH_A1, ()),
    ('A2', 8, 'Bb Bb7 Cm F Gm Eb F7 Bb', MARCH_A2, ()),
    ('B1', 8, 'Eb Eb Ab Eb Bb7 Bb7 Bb7 Eb', MARCH_B1, ('trio',)),
    ('B2', 8, 'Eb Cm Ab Eb Fm Bb7 Bb7 Eb', MARCH_B2, ('trio',)),
    ('break', 8, 'Eb Eb Ab Ab F7 F7 F7 F7', None, ('break',)),
    ('A1', 8, 'Bb Bb Eb F7 Gm Cm F7 Bb', MARCH_A1, ('counter',)),
    ('A2', 8, 'Bb Bb7 Cm F Gm Eb F7 Bb', MARCH_A2, ('counter',)),
    ('B1', 8, 'Eb Eb Ab Eb Bb7 Bb7 Bb7 Eb', MARCH_B1, ('trio', 'tutti')),
    ('B2', 8, 'Eb Cm Ab Eb Fm Bb7 Bb7 Eb', MARCH_B2, ('trio', 'tutti')),
    ('tag', 8, 'Eb Ab Bb/F F7 Bb Bb F7 F7', None, ('tag',)),
)


def march_melody():
    """-> [(bar, sixteenth offset, midi, sixteenths)] of the whole loop's melody (the score check)."""
    out = []
    bar0 = 0
    for name, bars, chords, mel, extra in SECTIONS:
        if mel:
            notes, nb = music.parse(mel, MARCH_PER_BAR, name)
            assert nb == bars, name
            for nt in notes:
                out.append((bar0 + int(nt.u // MARCH_PER_BAR), nt.u % MARCH_PER_BAR, nt.m, nt.dur))
        bar0 += bars
    return out


def _mname(m):
    names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    m = int(round(m))
    return '%s%d' % (names[m % 12], m // 12 - 1)


def snare_bar(loop, at, unit, rng, level, busy=False):
    """A march snare bar on the sixteenth grid: accents on the beats, ghosts between."""
    pat = ((0, 1.0), (2, 0.35), (3, 0.5), (4, 0.85), (6, 0.35), (7, 0.5)) if busy else ((0, 0.9), (3, 0.4), (4, 0.75), (7, 0.4))
    for step, v in pat:
        y = RO.snare(rng, v * level * rng.uniform(0.9, 1.05), wires=1.0, dur=0.2)
        loop.add('snare', y, at + step * unit + rng.normal(0.0, 0.002))


def march(loop, unit, bars_from=0, bars_to=None, tutti_all=False, distant=True):
    """Write the march (or the bars bars_from .. bars_to of it) into the loop's stems."""
    bar = MARCH_PER_BAR * unit
    rng = rng_for('office-music', 'march')
    b0 = 0
    for si, (name, bars, chords, mel, extra) in enumerate(SECTIONS):
        chs = chords.split()
        tutti = 'tutti' in extra or tutti_all
        for b in range(bars):
            gb = b0 + b
            if gb < bars_from or (bars_to is not None and gb >= bars_to):
                continue
            at = (gb - bars_from) * bar
            root, voicing = CHORDS[chs[b]]
            # tuba: root on 1, fifth (or root) on 2 (the break has its own tuba line)
            if 'break' not in extra:
                rname, fifth = TUBA[root]
                loop.add('tuba', note('tuba', rname, 2.2 * unit, 0.85, gb % 3, release=0.05), at)
                loop.add('tuba', note('tuba', fifth, 2.2 * unit, 0.75, gb % 3, release=0.05), at + 4 * unit)
            # after-beats: euphonium and trombone chords on the 'and's
            if 'break' not in extra:
                for off in (2, 6):
                    for j, nt in enumerate(voicing):
                        loop.add('after', note('euph' if j < 2 else 'bone', nt, 1.3 * unit, 0.55 if not tutti else 0.68, (gb + j) % 3,
                                              attack=0.012, release=0.03), at + off * unit + rng.normal(0, 0.003))
            # percussion
            phrase_start = b % 8 == 0
            if name != 'break' or b >= 6:
                snare_bar(loop, at, unit, rng, 0.8 if tutti else 0.6, busy=(name == 'break' and b >= 6) or (b % 8 == 7))
            loop.add('bass_drum', RO.bass_drum(rng, 0.9 if b % 2 == 0 else 0.7), at)
            loop.add('bass_drum', RO.bass_drum(rng, 0.65), at + 4 * unit)
            if phrase_start and name != 'intro':
                loop.add('cymbal', RO.clash(rng, 0.8 if tutti else 0.6, 1.1), at)
        # melody: cornet in A strains; euphonium + cornet an octave apart in the trio
        if mel:
            notes, _ = music.parse(mel, MARCH_PER_BAR, name)
            for nt in notes:
                gb = b0 + int(nt.u // MARCH_PER_BAR)
                if gb < bars_from or (bars_to is not None and gb >= bars_to):
                    continue
                at = (b0 * MARCH_PER_BAR + nt.u) * unit - bars_from * bar
                d = nt.dur * unit
                nm = _mname(nt.m)
                stacc = d * (0.82 if nt.dur <= 2 else 0.92)
                if 'trio' in extra and not tutti:
                    lower = _mname(nt.m - 12)
                    loop.add('lead', note('euph', lower, stacc + 0.05, 0.72, 0, release=0.06), at)
                    loop.add('lead', 0.5 * note('cornet', nm, stacc + 0.05, 0.55, 0, release=0.06), at)
                else:
                    loop.add('lead', note('cornet', nm, stacc + 0.05, 0.78 if tutti else 0.7, 0, release=0.06), at)
                    if tutti:
                        loop.add('lead2', note('euph', _mname(nt.m - 12), stacc + 0.05, 0.7, 0, release=0.06), at)
        if 'counter' in extra:
            text = MARCH_COUNTER.split('|')
            half = '|'.join(text[:8]) if name == 'A1' else '|'.join(text[8:])
            notes, _ = music.parse(half, MARCH_PER_BAR, 'counter')
            for nt in notes:
                gb = b0 + int(nt.u // MARCH_PER_BAR)
                if gb < bars_from or (bars_to is not None and gb >= bars_to):
                    continue
                at = (b0 * MARCH_PER_BAR + nt.u) * unit - bars_from * bar
                loop.add('counter', note('bone', _mname(nt.m - 12), nt.dur * unit * 0.95, 0.5, 0, attack=0.05, release=0.12), at)
        if 'break' in extra:
            for text, kind, stem, dyn in ((MARCH_BREAK_TUBA, 'tuba', 'tuba', 0.9), (MARCH_BREAK_BONE, 'bone', 'counter', 0.75)):
                notes, _ = music.parse(text, MARCH_PER_BAR, 'break')
                for nt in notes:
                    gb = b0 + int(nt.u // MARCH_PER_BAR)
                    if gb < bars_from or (bars_to is not None and gb >= bars_to):
                        continue
                    at = (b0 * MARCH_PER_BAR + nt.u) * unit - bars_from * bar
                    nm = _mname(nt.m + (12 if kind == 'tuba' else 0))
                    loop.add(stem, note(kind, nm, nt.dur * unit * 0.85, dyn, 0, release=0.05), at)
        b0 += bars
    return loop


MARCH_STRIPS = {
    'lead': dict(gain=0.55, pan=0.1, send=0.3),
    'lead2': dict(gain=0.3, pan=-0.15, send=0.3),
    'after': dict(gain=0.3, pan=-0.3, send=0.35),
    'counter': dict(gain=0.34, pan=-0.45, send=0.35),
    'tuba': dict(gain=0.36, pan=0.0, send=0.2),
    'snare': dict(gain=0.45, pan=0.35, send=0.3),
    'bass_drum': dict(gain=0.4, pan=0.0, send=0.25),
    'cymbal': dict(gain=0.3, pan=0.4, send=0.4),
}


# ---------------------------------------------------------------------------
# the desk loop (F major, 4/4 at 90 bpm; the grid is an eighth, 8 to the bar)
# ---------------------------------------------------------------------------

DESK_BPM = 90.0
DESK_BARS = 34
DESK_PER_BAR = 8
DESK_CHORDS = ('F', 'Dm7', 'Gm7', 'C7sus4', 'F', 'Bbmaj7', 'Am7', 'D7', 'Gm7', 'C7', 'Am7', 'Dm7', 'Bbmaj7', 'Bbm6', 'F/C', 'Gm7', 'C7')
DESK_HARM = {     # (pizz root, pizz fifth, a soft held chord tone for the second bassoon)
    'F': ('F3', 'C4', 'A3'), 'Dm7': ('D3', 'A3', 'F3'), 'Gm7': ('G3', 'D4', 'Bb3'), 'C7sus4': ('C4', 'G3', 'F3'),
    'Bbmaj7': ('Bb3', 'F4', 'A3'), 'Am7': ('A3', 'E4', 'G3'), 'D7': ('D4', 'A3', 'F#3'), 'C7': ('C4', 'G3', 'E3'),
    'Bbm6': ('Bb3', 'F4', 'Db4'), 'F/C': ('C4', 'F3', 'A3'),
}
DESK_WALK = {1: 'B3', 7: 'Bb3', 13: 'G3', 15: 'C#4', 19: 'F3', 23: 'Bb3', 29: 'A3', 33: 'E3'}       # bar -> a pickup on the last eighth
# the first bassoon's four remarks: (bar, [(eighth offset, note, eighths, staccato)]); each different
DESK_REMARKS = (
    (3, ((4, 'C3', 1, True), (5, 'C3', 1, True), (6, 'F2', 2, False))),
    (11, ((2, 'A3', 1, True), (3, 'G3', 1, True), (4, 'E3', 1, True), (6, 'C3', 2, False))),
    (19, ((5, 'D3', 1, True), (6, 'Bb2', 1, True), (7, 'Bb2', 1, True), (8, 'F3', 4, False))),
    (27, ((0, 'G2', 3, False), (4, 'A2', 1, True), (5, 'Bb2', 1, True), (6, 'C3', 2, True))),
)


def desk(loop, unit):
    bar = DESK_PER_BAR * unit
    rng = rng_for('office-music', 'desk')
    for b in range(DESK_BARS):
        at = b * bar
        ch = DESK_CHORDS[b // 2]
        root, fifth, held = DESK_HARM[ch]
        # pizzicato: root on 1, fifth on 3 (the second bar of a chord: fifth on 1, root on 3)
        a, c = (root, fifth) if b % 2 == 0 else (fifth, root)
        loop.add('pizz', note('pizz', a, 1.2, 0.9, b % 3), at + rng.normal(0, 0.004))
        loop.add('pizz', note('pizz', c, 1.0, 0.7, (b + 1) % 3), at + 4 * unit + rng.normal(0, 0.004))
        if b in DESK_WALK:
            loop.add('pizz', note('pizz', DESK_WALK[b], 0.6, 0.55, 0), at + 7 * unit + rng.normal(0, 0.004))
        # brushes: taps on 2 and 4, a ghost now and then
        for beat in (2, 6):
            loop.add('brush_tap', RO.brush_tap(rng, rng.uniform(0.75, 0.9)), at + beat * unit + rng.normal(0, 0.004))
        if b % 4 == 3:
            loop.add('brush_tap', RO.brush_tap(rng, 0.4), at + 7 * unit)
        # the second bassoon: a soft held chord tone every four bars
        if b % 4 == 0:
            loop.add('bsn2', note('bassoon', held, 3.3 * bar, 0.35, b % 2, attack=0.35, release=0.8), at + 0.05)
    for b0, phrase in DESK_REMARKS:
        for off, nt, eighths, stacc in phrase:
            d = eighths * unit * (0.6 if stacc else 0.95)
            loop.add('bsn1', note('bassoon', nt, d + 0.08, 0.6, 0, stacc=stacc, attack=0.02), b0 * bar + off * unit)
    # the brushes' stir: one sweep under the whole loop (a circle a beat), folded through the seam
    xf = ns(2.0)
    sw = RO.brush_sweep(rng_for('office-music', 'sweep'), (loop.n + xf) / SR + 0.01, circles=DESK_BPM / 60.0)
    loop.add('brush_sweep', fold_xfade(sw, loop.n, xf), 0.0)
    return loop


DESK_STRIPS = {
    'pizz': dict(gain=0.5, pan=-0.1, send=0.18),
    'brush_tap': dict(gain=0.6, pan=0.3, send=0.15),
    'brush_sweep': dict(gain=0.12, pan=0.3, send=0.1),
    'bsn1': dict(gain=0.7, pan=0.25, send=0.25),
    'bsn2': dict(gain=0.32, pan=-0.35, send=0.3),
}


def fold_xfade(x, n, xf):
    """A buffer of n + xf samples -> n samples that loop: the overflow is crossfaded (equal power)
    onto the start. For uncorrelated material (the brushes' stir)."""
    out = x[:n].copy()
    k = min(xf, len(x) - n)
    if k > 0:
        u = np.arange(k) / k
        out[:k] = x[:k] * np.sin(0.5 * np.pi * u) + x[n:n + k] * np.cos(0.5 * np.pi * u)
    return out


# ---------------------------------------------------------------------------
# tunes in music.py's format; the stings
# ---------------------------------------------------------------------------

TUNES = ('music_main', 'music_campaign')
STINGS = ('majority', 'defeat')


def tune(name):
    """-> (loop, strips, irs, meta)."""
    if name == 'music_campaign':
        bars = sum(s[1] for s in SECTIONS)
        loop, unit = music.loop_of(bars, MARCH_PER_BAR, 60.0 / MARCH_BPM / 4.0)
        march(loop, unit)
        strips = MARCH_STRIPS
        kw = dict(t60=1.4, size=1.6, damp=0.35, lp=3800.0, hp=200.0)
        meta = {'bars': bars, 'bpm': MARCH_BPM, 'meter': '2/4', 'title': 'The Middling March', 'key': 'B-flat major'}
    elif name == 'music_main':
        loop, unit = music.loop_of(DESK_BARS, DESK_PER_BAR, 60.0 / DESK_BPM / 2.0)
        desk(loop, unit)
        strips = DESK_STRIPS
        kw = dict(t60=0.7, size=0.9, damp=0.3, lp=4200.0, hp=220.0)
        meta = {'bars': DESK_BARS, 'bpm': DESK_BPM, 'meter': '4/4', 'title': 'Minutes of the Previous Meeting', 'key': 'F major'}
    else:
        raise ValueError(name)
    irs = [dsp.reverb_ir(spread=s, **kw) for s in (1.0, 1.029)]
    return loop, strips, irs, meta


def render(name, stems_dir=None):
    """A loop -> (mastered stereo loop (n, 2), info)."""
    loop, strips, irs, meta = tune(name)
    x = music.mixdown(loop, strips, irs)
    if name == 'music_campaign':
        x = music.circ_filt(x, dsp.butter('lp', 5200.0, 2))            # a bandstand across the square
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


def render_sting(name):
    """-> (mastered mono sting, info). majority: the march's first 8 bars, the 8th a held chord;
    defeat: one tuba, the first four bars of the tune slowly, two octaves down."""
    if name == 'majority':
        unit = 60.0 / MARCH_BPM / 4.0
        bar = MARCH_PER_BAR * unit
        loop = music.Loop(7 * bar + 6.0, tail=0.1)              # long enough that nothing folds back onto the start
        march(loop, unit, bars_from=4, bars_to=11, tutti_all=True)         # the intro is 4 bars: A1 is bars 4 .. 11
        at = 7 * bar
        for kind, nt, dyn, stem in (('cornet', 'Bb4', 0.8, 'lead'), ('cornet', 'D5', 0.75, 'lead'), ('euph', 'F4', 0.75, 'after'),
                                    ('bone', 'D4', 0.7, 'after'), ('bone', 'Bb3', 0.7, 'counter'), ('tuba', 'Bb2', 0.95, 'tuba')):
            env_n = ns(2.2)
            env = dsp.rcos_in(env_n, 20.0) * points([(0, 1.0), (0.3, 0.85), (1.6, 0.8), (2.2, 0.0)], env_n)
            loop.add(stem, RO.brass(hz(nt), 2.2, rng_for('office-music', 'final', nt, kind), kind, dyn=dyn, env=env), at)
        rng = rng_for('office-music', 'final-perc')
        loop.add('cymbal', RO.clash(rng, 1.0, 2.0), at)
        loop.add('bass_drum', RO.bass_drum(rng, 1.0), at)
        loop.add('snare', RO.snare_roll(rng, 0.25, ((0, 0.4), (1, 0.9)), 30.0, True), at - 0.25)
        strips = dict(MARCH_STRIPS)
        x = music.mixdown(loop, strips, [dsp.reverb_ir(t60=1.2, size=1.4, damp=0.3, lp=4200.0, hp=200.0, spread=s) for s in (1.0, 1.029)])
        mono = x.mean(axis=1)
        n_end = ns(7 * bar + 2.4)
        mono = mono[:n_end] * dsp.rcos_out(n_end, 400.0)
        title, loud = 'The Middling March (eight bars)', 2.0
    elif name == 'defeat':
        unit = 60.0 / 70.0 / 4.0
        notes, _ = music.parse(MARCH_A1, MARCH_PER_BAR, 'A1')
        m = dsp.Mix()
        rng = rng_for('office-music', 'defeat')
        last = [nt for nt in notes if nt.u < 4 * MARCH_PER_BAR][-1]
        for nt in notes:
            if nt.u >= 4 * MARCH_PER_BAR:
                break
            d = nt.dur * unit * 0.9
            f = mtof(nt.m - 24)
            n = ns(d + 0.1)
            if nt is last:
                d = 1.6
                n = ns(d)
                fpath = f * 2.0 ** (points([(0, 0.0), (0.5, 0.0), (d, -45.0)], n) / 1200.0)         # the last note sags
                env = dsp.rcos_in(n, 30.0) * points([(0, 1.0), (0.4, 0.9), (d, 0.0)], n)
                y = RO.brass(0.0, d, rng, 'tuba', dyn=0.8, env=env, fpath=fpath, phone=300.0)
            else:
                y = RO.brass(f, d + 0.1, rng, 'tuba', dyn=0.7, attack=0.04, release=0.1, phone=300.0)
            m.add(y, nt.u * unit + rng.normal(0.0, 0.012))
        dry = m.out()
        wet = dsp.add_reverb(dry, dsp.reverb_ir(t60=0.9, size=1.2, damp=0.3, lp=3600.0, hp=180.0), 0.2, tail=0.6)
        mono = wet
        title, loud = 'The Middling March, on one tuba', 0.0
    else:
        raise ValueError(name)
    y, info = dsp.normalise(dsp.master_eq(mono) - np.mean(mono), dsp.LOUDNESS_TARGET_DB + loud)
    y = dsp.fades(y, 5.0, 200.0)
    info.update({'title': title, 'duration': len(y) / SR, 'samples': len(y), 'peak_db': dsp.peak_db(y)})
    return y, info


def build(name, path, kbps=None):
    """Render and write the .m4a the way music.build does (re-encoded lower if AAC overshoots the peak)."""
    if name in STINGS:
        y, info = render_sting(name)
        y = np.stack([y, y], axis=1)
        kbps = kbps or STING_KBPS
        ceiling = dsp.PEAK_CEILING_DB
    else:
        y, info = render(name)
        kbps = kbps or MUSIC_KBPS
        ceiling = music.MUSIC_PEAK_MAX_DB
    trim = 0.0
    for _ in range(4):
        music.encode_m4a(y * dsp.undb(-trim), path, kbps)
        z = music.decode(path)
        over = dsp.peak_db(z) - ceiling + 0.05
        if over <= 0.0:
            break
        trim += over + 0.1
    info.update({'peak_db': dsp.peak_db(z), 'loudness_db': dsp.krms_db(z), 'bytes': os.path.getsize(path), 'trim_db': trim,
                 'decoded_samples': len(z), 'kbps': os.path.getsize(path) * 8 / 1000.0 / info['duration']})
    return info


def stem_levels(name):
    """[(stem, K-RMS dB at mix level, phone loss dB)] of the dry stems."""
    loop, strips, irs, meta = tune(name)
    x = music.mixdown(loop, strips, irs)
    _, m = music.master_loop(x)
    g = dsp.undb(m['gain_db'])
    rows = []
    for stem, buf in loop.stems.items():
        one = music.Loop(loop.seconds)
        one.stems[stem] = buf
        dry = music.mixdown(one, {stem: dict(strips[stem], send=0.0)}, [np.zeros(1), np.zeros(1)]) * g
        rows.append((stem, dsp.krms_db(dry), music.phone_loss_db(dry.mean(axis=1))))
    return rows, music.phone_loss_db(x.mean(axis=1))


def print_score():
    mel = march_melody()
    for bar, u, m, d in mel:
        print('%3d %4.1f %-4s %g' % (bar + 1, u, _mname(m), d))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--tune', choices=TUNES + STINGS, default='music_main')
    ap.add_argument('--out', help='.m4a to write')
    ap.add_argument('--kbps', type=int, default=None)
    ap.add_argument('--wav', help='also write the mastered result as a 16-bit WAV')
    ap.add_argument('--stems', help='folder for one WAV per stem (loops only)')
    ap.add_argument('--levels', action='store_true', help='print per-stem levels (loops only)')
    ap.add_argument('--score', action='store_true', help="print the march's melody")
    args = ap.parse_args(argv)
    if args.score:
        print_score()
        return 0
    if args.levels:
        rows, mix_phone = stem_levels(args.tune)
        for stem, lv, ph in sorted(rows, key=lambda r: -r[1]):
            print('%-12s K-RMS %6.1f dB   phone %+5.1f dB' % (stem, lv, ph))
        print('%-12s phone %+5.1f dB' % ('mix', mix_phone))
    if args.out:
        info = build(args.tune, args.out, args.kbps)
        print('%s: %s, %.2f s, peak %.1f dBFS, K-RMS %.1f dB, %.0f KB (%.0f kb/s)'
              % (args.out, info['title'], info['duration'], info['peak_db'], info['loudness_db'], info['bytes'] / 1000.0, info['kbps']))
    if args.wav or args.stems:
        if args.tune in STINGS:
            y, info = render_sting(args.tune)
            dsp.write_wav(args.wav, y)
        else:
            y, info = render(args.tune, args.stems)
            if args.wav:
                dsp.write_wav(args.wav, y.reshape(-1), channels=2)
    return 0


if __name__ == '__main__':
    sys.exit(main())
