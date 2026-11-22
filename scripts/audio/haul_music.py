#!/usr/bin/env python3
"""Orbit Haulers' music: "Slow Orbit" (spec 6.1). Python 3 + numpy; ffmpeg for the AAC export.

  python3 scripts/audio/haul_music.py --out games/space-miner/assets/sfx/music_main.m4a
  python3 scripts/audio/haul_music.py --wav /tmp/slow_orbit.wav --stems /tmp/stems     (no ffmpeg needed)

One 60 s loop: 20 bars of 4/4 at 80 bpm in F# minor. A wide detuned pad
(two saw pads panned apart, slowly breathing), a sub-bass on the chord roots,
a sparse sixteenth-note pulse arpeggio from bar 9 with a dotted-eighth echo
(a little softer in the last two bars, so the loop breathes back into bar 1),
a soft band-passed noise "radio wash" every 8 bars (bars 1, 9, 17), and a
muted kick on beat 1. No lead melody, no other percussion.

It shares nothing with the first game's music (music.py, "trattoria": a 6/8
mandolin and accordion tarantella in C at 116 bpm, or "neutral"): other meter,
tempo, key, chord loop, form and instruments. Only the machinery is reused,
imported from music.py: the Loop on a common clock, the AAC-frame loop length,
the stereo mixdown with the fold that wraps tails through the seam, the
circular mastering to the music loudness, and the gapless AAC export.

The chord loop, one chord per 4 bars (12 s each):
  F#m7 | Dmaj9 | Bm11 | A/C# (add9) | Esus4 -> E6sus2 (back to F#m)
"""
from __future__ import annotations

import sys

sys.dont_write_bytecode = True

import argparse
import os

import numpy as np

import dsp
import music
from dsp import SR, TAU, blosc, bandpass, glide, lowpass, midi, mtof, ns, phase, points, rcos_in, rcos_out, rng_for, svf, white

TITLE = 'Slow Orbit'
BPM = 80.0
BARS = 20
PER_BAR = 16                     # grid unit: a sixteenth note
MUSIC_KBPS = 76                  # 60 s at 96 kb/s would be ~720 KB: over the 700 KB music budget and, with 55 effects, the 3 MB pack budget

# chord: (bass root, pad voicing, arpeggio notes low to high)
CHORDS = [
    ('F#2', ('F#3', 'C#4', 'E4', 'A4'), ('C#5', 'E5', 'F#5', 'A5', 'C#6')),
    ('D2', ('D3', 'A3', 'C#4', 'E4'), ('A4', 'C#5', 'E5', 'F#5', 'A5')),
    ('B1', ('B2', 'D4', 'E4', 'A4'), ('B4', 'E5', 'F#5', 'A5', 'B5')),
    ('C#2', ('C#3', 'E4', 'A4', 'B4'), ('C#5', 'E5', 'A5', 'B5', 'C#6')),
    ('E2', ('E3', 'A3', 'B3', 'E4'), ('B4', 'E5', 'F#5', 'A5', 'B5')),
]
LAST_PAD = ('E3', 'B3', 'C#4', 'F#4')          # bars 19-20: E6sus2, leaning into F#m

# a two-bar arpeggio cell: (sixteenth step, index into the chord's arpeggio notes, level)
ARP_A = ((0, 2, 1.0), (3, 3, 0.7), (6, 1, 0.8), (10, 4, 0.75), (13, 2, 0.6))
ARP_B = ((2, 3, 0.8), (5, 0, 0.6), (8, 2, 0.9), (11, 4, 0.65), (14, 1, 0.55))
ECHO_S = 3.0 * 60.0 / BPM / 4.0              # dotted eighth


def hz(name):
    return mtof(midi(name))


def wide_pad(freqs, dur, rng, attack=1.6, release=2.2, cutoff=2200.0):
    """Detuned band-limited saws (three per note) behind a low-pass, with a slow breathing swell."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f in freqs:
        for det in (-11.0, 0.0, 12.0):
            fr = f * 2.0 ** (det / 1200.0) * (1.0 + 0.0009 * np.sin(TAU * rng.uniform(0.09, 0.16) * t + rng.uniform(0, TAU)))
            y += blosc(fr, n, 'saw', fmax=3200.0, ph0=rng.uniform(0, TAU))
    y = lowpass(y, cutoff, 2)
    breath = 0.82 + 0.18 * np.sin(TAU * t / (2 * 4 * 60.0 / BPM) + rng.uniform(0, TAU))
    return 0.3 * y / len(freqs) ** 0.5 * breath * rcos_in(n, attack * 1000.0) * rcos_out(n, release * 1000.0)


def sub_note(f, dur):
    """Sub-bass: a sine on the root with a little 2nd harmonic, soft in and out."""
    n = ns(dur)
    ph = phase(f, n)
    y = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
    return y * rcos_in(n, 90.0) * rcos_out(n, 600.0)


def arp_note(f, rng, vel=1.0):
    """A short pulse-wave pluck (filter closing), the arpeggio's voice."""
    n = ns(0.42)
    t = np.arange(n) / SR
    y = blosc(f, n, 'pulse', fmax=5000.0, pw=0.32)
    y = 0.6 * lowpass(y, 2300.0, 2) + 0.4 * lowpass(y, 900.0, 2)
    env = rcos_in(n, 2.0) * np.exp(-t / 0.11)
    return vel * y * env * rcos_out(n, 40.0)


def radio_wash(rng, dur=5.0):
    """A soft band of noise whose centre drifts 400 -> 1,800 -> 600 Hz: distant radio."""
    n = ns(dur)
    fc = np.exp(points([(0, np.log(400.0)), (dur * 0.45, np.log(1800.0)), (dur, np.log(600.0))], n))
    y = svf(white(n, rng), fc, 2.2, 'bp')
    y = dsp.filt(y, dsp.butter('hp', 300.0, 2) + dsp.butter('lp', 3000.0, 2))
    grit = 1.0 + 0.25 * lowpass(white(n, rng), 18.0, 2) * 12.0
    env = np.sin(np.pi * np.arange(n) / n) ** 2
    return y * np.clip(grit, 0.4, 1.6) * env


def kick(rng):
    """Muted kick: a soft low drop, felt more than heard."""
    n = ns(0.35)
    t = np.arange(n) / SR
    ph = phase(48.0 + 70.0 * np.exp(-t / 0.03), n)
    y = np.sin(ph) * rcos_in(n, 3.0) * np.exp(-t / 0.11)
    return lowpass(y, 380.0, 2)


def slow_orbit(pack=None):
    """-> (loop, strips, irs, meta) in music.py's tune format."""
    loop, unit = music.loop_of(BARS, PER_BAR, 60.0 / BPM / 4.0)
    rng = rng_for('music', 'slow_orbit')
    bar = PER_BAR * unit
    for k in range(5):
        root, voicing, _ = CHORDS[k]
        t0 = 4 * k * bar
        voices = (voicing,) if k < 4 else (voicing, LAST_PAD)
        if k < 4:
            spans = ((t0, 4 * bar),)
        else:
            spans = ((t0, 2 * bar), (t0 + 2 * bar, 2 * bar))
        for (ts, span), vc in zip(spans, voices):
            f = [hz(nt) for nt in vc]
            for side in ('pad_l', 'pad_r'):
                # each pad leans in 0.4 s early (except the first: a negative time would be a pick-up at the loop's end,
                # which Loop truncates to its 4 s tail); the last one's release folds through the seam into bar 1
                start = ts - 0.4 if ts > 0 else 0.0
                loop.add(side, wide_pad(f, span + 2.4 + (ts - start), rng_for('music', 'slow_orbit', side, ts), attack=1.4, release=2.4), start)
        for b in range(4):
            loop.add('sub', lowpass(sub_note(hz(root), bar + 0.5), 260.0, 2), t0 + b * bar)
            loop.add('kick', kick(rng), t0 + b * bar)
    # arpeggio from bar 9 (index 8) to the end, thinning in the last bar
    for b in range(8, BARS):
        k = b // 4
        notes = [hz(nt) for nt in CHORDS[k][2]]
        cell = ARP_A if b % 2 == 0 else ARP_B
        lvl = 0.75 if b < 12 else 1.0
        if b == BARS - 2:
            lvl = 0.8
        if b == BARS - 1:
            lvl = 0.7
        for step, idx, v in cell:
            y = arp_note(notes[idx], rng, v * lvl * rng.uniform(0.9, 1.05))
            at = b * bar + step * unit + rng.normal(0.0, 0.002)
            loop.add('arp', y, at)
            loop.add('arp_echo', lowpass(y, 1800.0, 2), at + ECHO_S, 0.45)
            loop.add('arp_echo', lowpass(y, 1200.0, 2), at + 2 * ECHO_S, 0.2)
    for b in (0, 8, 16):
        for side in ('wash_l', 'wash_r'):
            loop.add(side, radio_wash(rng_for('music', 'slow_orbit', side, b), 5.5), b * bar + 0.2)
    strips = {
        'pad_l': dict(gain=0.95, pan=-0.7, send=0.18),
        'pad_r': dict(gain=0.95, pan=0.7, send=0.18),
        'sub': dict(gain=0.32, pan=0.0, send=0.0),
        'arp': dict(gain=2.0, pan=0.25, send=0.25),
        'arp_echo': dict(gain=1.8, pan=-0.45, send=0.3),
        'wash_l': dict(gain=0.9, pan=-0.6, send=0.15),
        'wash_r': dict(gain=0.9, pan=0.6, send=0.15),
        'kick': dict(gain=0.36, pan=0.0, send=0.0),
    }
    kw = dict(t60=2.2, size=1.6, damp=0.1, lp=5000.0)
    irs = [dsp.reverb_ir(spread=s, **kw) for s in (1.0, 1.031)]
    meta = {'bars': BARS, 'bpm': BPM, 'meter': '4/4', 'key': 'F# minor', 'title': TITLE}
    return loop, strips, irs, meta


def render(stems_dir=None):
    """-> (mastered stereo loop (n, 2), info)."""
    loop, strips, irs, meta = slow_orbit()
    x = music.mixdown(loop, strips, irs)
    y, m = music.master_loop(x)
    info = dict(meta)
    info.update(m)
    info.update({'duration': len(y) / SR, 'samples': len(y), 'peak_db': dsp.peak_db(y), 'loudness_db': dsp.krms_db(y)})
    if stems_dir:
        os.makedirs(stems_dir, exist_ok=True)
        g = dsp.undb(m['gain_db'])
        for name, buf in loop.stems.items():
            one = music.Loop(loop.seconds)
            one.stems[name] = buf
            dry = music.mixdown(one, {name: dict(strips[name], send=0.0)}, [np.zeros(1), np.zeros(1)])
            dsp.write_wav(os.path.join(stems_dir, name + '.wav'), np.clip(dry * g, -1, 1).reshape(-1), channels=2)
        dsp.write_wav(os.path.join(stems_dir, 'mix.wav'), y.reshape(-1), channels=2)
    return y, info


def stem_levels():
    """[(stem, K-RMS dB at mix level, phone loss dB)] of the dry stems."""
    loop, strips, irs, meta = slow_orbit()
    x = music.mixdown(loop, strips, irs)
    _, m = music.master_loop(x)
    g = dsp.undb(m['gain_db'])
    rows = []
    for name, buf in loop.stems.items():
        one = music.Loop(loop.seconds)
        one.stems[name] = buf
        dry = music.mixdown(one, {name: dict(strips[name], send=0.0)}, [np.zeros(1), np.zeros(1)]) * g
        rows.append((name, dsp.krms_db(dry), music.phone_loss_db(dry.mean(axis=1))))
    return rows


def build(path, kbps=MUSIC_KBPS):
    """Render and write the .m4a the way music.build does (re-encoded lower if AAC overshoots the peak)."""
    y, info = render()
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
    ap.add_argument('--out', help='.m4a to write')
    ap.add_argument('--kbps', type=int, default=MUSIC_KBPS)
    ap.add_argument('--wav', help='also write the mastered loop as a 16-bit stereo WAV')
    ap.add_argument('--stems', help='folder for one WAV per stem')
    ap.add_argument('--levels', action='store_true', help='print per-stem levels')
    args = ap.parse_args(argv)
    if args.levels:
        for name, lv, ph in sorted(stem_levels(), key=lambda r: -r[1]):
            print('%-10s K-RMS %6.1f dB   phone %+5.1f dB' % (name, lv, ph))
    if args.out:
        info = build(args.out, args.kbps)
        print('%s: %s, %d bars at %g bpm, %.2f s, peak %.1f dBFS, K-RMS %.1f dB, %.0f KB (%.0f kb/s)%s'
              % (args.out, TITLE, info['bars'], info['bpm'], info['duration'], info['peak_db'], info['loudness_db'],
                 info['bytes'] / 1000.0, info['kbps'],
                 '' if info['decoded_samples'] == info['samples'] else '; WARNING: decodes to %d samples, not %d' % (info['decoded_samples'], info['samples'])))
    if args.wav or args.stems:
        y, info = render(args.stems)
        if args.wav:
            dsp.write_wav(args.wav, y.reshape(-1), channels=2)
    return 0


if __name__ == '__main__':
    sys.exit(main())
