#!/usr/bin/env python3
"""Lantern Row's music: two loops of 90 s at 72 bpm (spec market-design 6.2). Python 3 + numpy; ffmpeg for the AAC export.

  python3 scripts/audio/night_music.py --tune music_main --out games/night-market/assets/sfx/music_main.m4a
  python3 scripts/audio/night_music.py --tune music_summer --wav /tmp/summer.wav --stems /tmp/stems   (no ffmpeg needed)
  python3 scripts/audio/night_music.py --tune music_main --levels

  music_main    "Lantern Dusk", the spring loop (and the one the shared player starts):
                27 bars of 4/4 at 72 bpm, D dorian over a D-A reed drone. Nine chords of three bars
                on a bowed pad; a sparse hand drum on a sixteenth grid that fills out in the middle
                third; a distant crowd of eight talkers.
  music_summer  "Firefly Lane", the summer loop: 27 bars at 72 bpm on a TRIPLET grid, G lydian over a
                G-D drone. Other chords (and a bright raised fourth), a lilting 12/8 hand drum pattern,
                a reed that sings three short phrases over the drone, a nearer and busier crowd of
                twelve, and fireflies (soft high shimmers). It differs from spring in key, mode,
                chords, rhythm grid, drum pattern, a melody and the crowd, not by a filter.

The instruments are this game's own (scripts/audio/recipes_night.py: the free reed, the bowed
voice, the hand drum, the crowd), never the first game's accordion, mandolin or kalimba, and
nothing of the second game's synth pack. Only the machinery is reused, imported from music.py: the
Loop on a common clock, the AAC-frame loop length, the stereo mixdown that folds tails through
the seam, the circular mastering to the music loudness, and the gapless AAC export.

The drone is exactly periodic over the loop (its frequency, vibrato and breathing are whole
numbers of cycles per loop, its noise is filtered circularly), so it runs through the seam with no
crossfade at all; the crowd is rendered a little longer than the loop and folded back with an
equal-power crossfade.
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
import recipes_night as RN
from dsp import SR, TAU, midi, mtof, ns, points, rng_for

BPM = 72.0
BARS = 27
MUSIC_KBPS = 56          # 90 s at 56 kb/s is about 650 KB: under qa.py's 700 KB per loop, and two loops plus the effects under 3 MB


def hz(name):
    return mtof(midi(name))


# ---------------------------------------------------------------------------
# periodic layers (they loop with no seam at all)
# ---------------------------------------------------------------------------

def periodic_noise(rng, n, lo, hi):
    """White noise band-limited to lo..hi by a circular FFT filter: exactly periodic over n samples."""
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1.0 / SR)
    X[(f < lo) | (f > hi)] = 0.0
    y = np.fft.irfft(X, n)
    return y / (np.std(y) + 1e-12)


def whole(rate, seconds):
    """The nearest rate with a whole number of cycles in `seconds` (at least one)."""
    return max(round(rate * seconds), 1) / seconds


def drone(f, n, rng, level=1.0, vib=0.003, vib_hz=4.3, breathe_cycles=9, fmax=3600.0):
    """A low free reed held for the whole loop, exactly periodic: the reed spectrum of
    recipes_night (formants at 650 and 1,500 Hz), a slow vibrato, a breathing swell (one per
    `breathe_cycles`-th of the loop), breath noise in the formant band."""
    L = n / SR
    f = whole(f, L)
    t = np.arange(n) / SR
    wob = periodic_noise(rng, n, 0.05, 0.6)
    fr = f * (1.0 + vib * np.sin(TAU * whole(vib_hz, L) * t) + 0.0012 * wob)
    ph = TAU * np.concatenate(([0.0], np.cumsum(fr[:-1]))) / SR
    ph *= (TAU * f * L) / (TAU * np.sum(fr) / SR)          # exactly f * L cycles: the phase meets itself at the seam
    amp = RN._reed_amp(f)
    y = np.zeros(n)
    for k in range(1, int(fmax // f) + 1):
        a = amp(k, k * f)
        y += a * np.sin(k * ph + rng.uniform(0, TAU))
    y /= np.max(np.abs(y)) + 1e-12
    breath = periodic_noise(rng, n, 450.0, 2400.0) * 0.05
    swell = 0.8 + 0.2 * np.sin(TAU * breathe_cycles * t / L + rng.uniform(0, TAU))
    return level * (y + breath) * swell


def fold_xfade(x, n, xf):
    """A buffer of n + xf samples -> n samples that loop: the overflow is crossfaded (equal power)
    onto the start. For uncorrelated material (noise, a crowd)."""
    out = x[:n].copy()
    k = min(xf, len(x) - n)
    if k > 0:
        u = np.arange(k) / k
        out[:k] = x[:k] * np.sin(0.5 * np.pi * u) + x[n:n + k] * np.cos(0.5 * np.pi * u)
    return out


def fireflies(rng, n, count=40):
    """Soft high shimmers: short grain clouds in 3 to 5 kHz with slow swells, scattered (periodic)."""
    y = np.zeros(n)
    for _ in range(count):
        d = rng.uniform(0.25, 0.7)
        m = ns(d)
        g = RN.band(RN.grains(rng, d, 300.0, (0.2, 0.8), 0.5), 3000.0, 5200.0, 2)
        g *= np.sin(np.pi * np.arange(m) / m) ** 2 * rng.uniform(0.3, 1.0)
        i = int(rng.uniform(0, n))
        idx = (i + np.arange(m)) % n
        np.add.at(y, idx, g)
    return y / (np.max(np.abs(y)) + 1e-12)


# ---------------------------------------------------------------------------
# the two tunes
# ---------------------------------------------------------------------------

SPRING_CHORDS = [            # 9 chords of 3 bars, over the D-A drone
    ('D3', 'F3', 'A3', 'C4', 'E4'),          # Dm9
    ('E3', 'G3', 'C4', 'D4'),                # C/D add9
    ('D3', 'F3', 'A3', 'Bb3'),               # Bbmaj7/D
    ('D3', 'G3', 'Bb3', 'F4', 'A4'),         # Gm9/D
    ('F3', 'A3', 'C4', 'E4'),                # Fmaj7
    ('E3', 'G3', 'A3', 'C4'),                # Am7
    ('G3', 'Bb3', 'D4', 'F4'),               # Gm7
    ('D3', 'F3', 'A3', 'C4', 'Bb3'),         # Bbmaj9 (over D)
    ('E3', 'A3', 'D4', 'G4'),                # A7sus4, back to Dm
]

SUMMER_CHORDS = [            # 9 chords of 3 bars, over the G-D drone (G lydian: C#)
    ('G3', 'B3', 'D4', 'F#4', 'A4'),         # Gmaj9
    ('A3', 'C#4', 'E4', 'G4'),               # A/G (the lydian II)
    ('E3', 'G3', 'B3', 'D4', 'F#4'),         # Em9
    ('D3', 'F#3', 'B3', 'E4'),               # D6/9
    ('B3', 'D4', 'F#4', 'A4'),               # Bm7
    ('A3', 'D4', 'E4', 'F#4'),               # A6sus
    ('G3', 'B3', 'C#4', 'F#4'),              # Gmaj7#11
    ('E3', 'G3', 'B3', 'D4'),                # Em7
    ('D3', 'G3', 'A3', 'C#4'),               # Dsus4 with the raised fourth, back to G
]

# hand drum patterns: (grid step, kind, level)
SPRING_DRUM_SPARSE = ((0, 'dum', 1.0), (8, 'tek', 0.7), (14, 'ghost', 0.4))
SPRING_DRUM_FULL = ((0, 'dum', 1.0), (6, 'ghost', 0.45), (8, 'tek', 0.75), (10, 'ghost', 0.4), (12, 'dum', 0.6), (14, 'tek', 0.5))
SUMMER_DRUM_A = ((0, 'dum', 1.0), (3, 'ghost', 0.4), (5, 'tek', 0.6), (6, 'tek', 0.75), (9, 'ghost', 0.45), (11, 'tek', 0.5))
SUMMER_DRUM_B = ((0, 'dum', 1.0), (2, 'ghost', 0.4), (4, 'ghost', 0.35), (6, 'dum', 0.6), (8, 'tek', 0.7), (10, 'ghost', 0.45), (11, 'tek', 0.55))

# the summer reed's three phrases: (bar, [(beat offset, note, beats)])
SUMMER_SONG = (
    (6, (( 0.0, 'D4', 1.5), (1.5, 'E4', 0.5), (2.0, 'F#4', 2.0), (4.0, 'E4', 1.0), (5.0, 'D4', 3.0))),
    (13, ((0.0, 'B3', 1.0), (1.0, 'C#4', 1.0), (2.0, 'D4', 1.5), (3.5, 'F#4', 0.5), (4.0, 'A4', 2.0), (6.0, 'F#4', 2.0))),
    (21, ((0.0, 'A4', 1.5), (1.5, 'G4', 0.5), (2.0, 'F#4', 1.0), (3.0, 'E4', 1.0), (4.0, 'C#4', 1.0), (5.0, 'D4', 3.0))),
)


def _drum_bar(loop, at, unit, pattern, rng, f_dum, f_tek, level):
    for step, kind, v in pattern:
        f = f_dum if kind == 'dum' else f_tek
        y = RN.hand_drum(rng, f * rng.uniform(0.99, 1.01), v * level * rng.uniform(0.9, 1.05), kind)
        loop.add('drum', y, at + step * unit + rng.normal(0.0, 0.003))


def _pad(loop, chords, bar, rng_name, bright):
    for i, chord in enumerate(chords):
        t0 = 3 * i * bar
        span = 3 * bar
        for j, nt in enumerate(chord):
            side = 'pad_l' if j % 2 == 0 else 'pad_r'
            start = t0 - 0.3 if t0 > 0 else 0.0
            y = RN.bowed(hz(nt), span + 1.9 + (t0 - start), rng_for('music', rng_name, i, j), attack=1.3, release=1.9, bright=bright)
            loop.add(side, y / len(chord) ** 0.5, start)


def tune(name):
    """-> (loop, strips, irs, meta) in music.py's tune format."""
    summer = name == 'music_summer'
    per_bar = 12 if summer else 16
    loop, unit = music.loop_of(BARS, per_bar, 60.0 / BPM / (per_bar / 4))
    n = loop.n
    bar = per_bar * unit
    rng = rng_for('music', name)
    title = 'Firefly Lane' if summer else 'Lantern Dusk'

    # the drone, periodic over the loop
    roots = ('G2', 'D3') if summer else ('D2', 'A2')
    loop.add('drone', drone(hz(roots[0]), n, rng_for('music', name, 'drone0'), 1.0, breathe_cycles=9), 0.0)
    loop.add('drone', drone(hz(roots[1]), n, rng_for('music', name, 'drone1'), 0.55, breathe_cycles=27 if summer else 9), 0.0)

    # the bowed pad
    _pad(loop, SUMMER_CHORDS if summer else SPRING_CHORDS, bar, name, 1.8 if summer else 1.4)

    # the hand drum
    for b in range(BARS):
        if summer:
            pat = SUMMER_DRUM_B if b % 4 == 3 else SUMMER_DRUM_A
            lvl = 0.85 if b < 3 else 1.0
            _drum_bar(loop, b * bar, unit, pat, rng, 210.0, 330.0, lvl)
        else:
            full = 9 <= b < 18
            pat = SPRING_DRUM_FULL if full else SPRING_DRUM_SPARSE
            lvl = 0.75 if b == BARS - 1 else 1.0
            _drum_bar(loop, b * bar, unit, pat, rng, 190.0, 300.0, lvl)

    # the summer reed song
    if summer:
        beat = bar / 4.0
        for b0, phrase in SUMMER_SONG:
            for off, nt, beats in phrase:
                d = beats * beat
                y = RN.reed(hz(nt), d + 0.35, rng_for('music', name, 'song', b0, off), attack=0.09, release=0.35, vib=0.006, breath=0.09)
                loop.add('song', y, b0 * bar + off * beat)

    # the crowd, folded through the seam with an equal-power crossfade
    xf = ns(3.0)
    voices, near, rate = (12, 0.65, 1.25) if summer else (8, 0.3, 1.0)
    L, R = RN.crowd(rng_for('music', name, 'crowd'), (n + xf) / SR + 0.01, voices=voices, near=near, rate=rate)
    loop.add('crowd_l', fold_xfade(L, n, xf), 0.0)
    loop.add('crowd_r', fold_xfade(R, n, xf), 0.0)

    if summer:
        loop.add('flies', fireflies(rng_for('music', name, 'flies'), n), 0.0)

    strips = {
        'drone': dict(gain=0.42, pan=0.0, send=0.12),
        'pad_l': dict(gain=0.5, pan=-0.6, send=0.3),
        'pad_r': dict(gain=0.5, pan=0.6, send=0.3),
        'drum': dict(gain=0.9 if summer else 0.8, pan=0.15, send=0.22),
        'crowd_l': dict(gain=0.13 if summer else 0.09, pan=-0.75, send=0.4),
        'crowd_r': dict(gain=0.13 if summer else 0.09, pan=0.75, send=0.4),
    }
    if summer:
        strips['song'] = dict(gain=0.8, pan=-0.2, send=0.35)
        strips['flies'] = dict(gain=0.6, pan=0.3, send=0.5)
    kw = dict(t60=1.5, size=1.35, damp=0.25, lp=4200.0, hp=220.0)
    irs = [dsp.reverb_ir(spread=s, **kw) for s in (1.0, 1.029)]
    meta = {'bars': BARS, 'bpm': BPM, 'meter': '4/4' if not summer else '4/4 on a triplet grid', 'title': title,
            'key': 'G lydian' if summer else 'D dorian'}
    return loop, strips, irs, meta


TUNES = ('music_main', 'music_summer')


def render(name, stems_dir=None):
    """-> (mastered stereo loop (n, 2), info)."""
    loop, strips, irs, meta = tune(name)
    x = music.mixdown(loop, strips, irs)
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


def build(name, path, kbps=MUSIC_KBPS):
    """Render and write the .m4a the way music.build does (re-encoded lower if AAC overshoots the peak)."""
    y, info = render(name)
    trim = 0.0
    for _ in range(4):
        music.encode_m4a(y * dsp.undb(-trim), path, kbps)
        z = music.decode(path)
        over = dsp.peak_db(z) - music.MUSIC_PEAK_MAX_DB
        if over <= 0.0:
            break
        trim += over + 0.1
    info.update({'peak_db': dsp.peak_db(z), 'loudness_db': dsp.krms_db(z), 'bytes': os.path.getsize(path), 'trim_db': trim,
                 'decoded_samples': len(z), 'kbps': os.path.getsize(path) * 8 / 1000.0 / info['duration']})
    return info


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--tune', choices=TUNES, default='music_main')
    ap.add_argument('--out', help='.m4a to write')
    ap.add_argument('--kbps', type=int, default=MUSIC_KBPS)
    ap.add_argument('--wav', help='also write the mastered loop as a 16-bit stereo WAV')
    ap.add_argument('--stems', help='folder for one WAV per stem')
    ap.add_argument('--levels', action='store_true', help='print per-stem levels')
    args = ap.parse_args(argv)
    if args.levels:
        rows, mix_phone = stem_levels(args.tune)
        for stem, lv, ph in sorted(rows, key=lambda r: -r[1]):
            print('%-10s K-RMS %6.1f dB   phone %+5.1f dB' % (stem, lv, ph))
        print('%-10s phone %+5.1f dB' % ('mix', mix_phone))
    if args.out:
        info = build(args.tune, args.out, args.kbps)
        print('%s: %s, %d bars at %g bpm, %.2f s, peak %.1f dBFS, K-RMS %.1f dB, %.0f KB (%.0f kb/s)'
              % (args.out, info['title'], info['bars'], info['bpm'], info['duration'], info['peak_db'], info['loudness_db'],
                 info['bytes'] / 1000.0, info['kbps']))
    if args.wav or args.stems:
        y, info = render(args.tune, args.stems)
        if args.wav:
            dsp.write_wav(args.wav, y.reshape(-1), channels=2)
    return 0


if __name__ == '__main__':
    sys.exit(main())
