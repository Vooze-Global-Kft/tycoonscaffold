#!/usr/bin/env python3
"""Measure a folder of sounds, fail on anything out of spec, draw a contact sheet.

  python3 scripts/audio/qa.py shared/sfx
  python3 scripts/audio/qa.py shared/sfx games/pizza-empire/assets/sfx     (several folders, one sheet)
  python3 scripts/audio/qa.py games/space-miner/assets/sfx --sheet /tmp/space.png
  python3 scripts/audio/qa.py shared/sfx --only 'tap_*,coin_*' --sheet /tmp/taps.png --cols 4

For every .wav it prints: duration, peak dBFS, RMS dBFS, loudness (the
K-weighted RMS of the loudest 200 ms, which is what the pack is normalised
to), spectral centroid, DC offset, clipped samples, energy above 8 kHz, the
strongest partial as a note name, and how long the sound takes to speak.
Music (.m4a) is decoded with ffmpeg and gets the loop-seam report on top: the
level and spectral difference between its last and first 50 ms, compared
with every other 50 ms boundary inside the piece.

The contact sheet (default docs/design/audio-qa.png) shows a waveform and a
log-frequency spectrogram per sound, so envelopes, pitch contours and
brightness can be reviewed by eye. Numpy and PIL only.

A folder that holds the whole catalogue is checked as a complete pack
(nothing missing, size budget); a folder with a few files is treated as a
game's overrides. Exit code 1 when any check fails.
"""
from __future__ import annotations

import sys

sys.dont_write_bytecode = True

import argparse
import fnmatch
import math
import os
import subprocess

import numpy as np

import dsp
from dsp import SR

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
DEFAULT_SHEET = os.path.join(ROOT, 'docs', 'design', 'audio-qa.png')

# ---- thresholds -------------------------------------------------------------
PEAK_MAX_DB = dsp.PEAK_CEILING_DB + 0.02
LOUD_TOL_DB = 1.0             # every effect within this of the loudness target ...
LOUD_LIMITED_TOL_DB = 3.0     # ... or this far under it when it already sits at the peak ceiling
DC_MAX = 0.001                # -60 dBFS
HF_FAIL_DB = -20.0            # energy above 8 kHz, relative to the whole sound (1 %)
HF_WARN_DB = -26.0
CENTROID_WARN_HZ = 5000.0
EDGE_MAX = 0.002              # first and last sample: fades present
ONSET_WARN_MS = 25.0          # events with a haptic should speak at once
MAX_EFFECT_S = 3.0
PACK_BUDGET_BYTES = 3_000_000
MUSIC_BUDGET_BYTES = 700_000
MUSIC_MIN_S, MUSIC_MAX_S = 30.0, 45.0
SEAM_S = 0.050
SEAM_LEVEL_WARN_DB, SEAM_LEVEL_FAIL_DB = 3.0, 6.0
PHONE_HP_HZ = 550.0           # "phone": loudness lost through a 550 Hz high-pass, a rough phone speaker
PHONE_WARN_DB, PHONE_FAIL_DB = -3.0, -6.0
MUSIC_PHONE_WARN_DB = -6.0    # music is only warned about: a loop may keep some real bass


# ---------------------------------------------------------------------------
# measurements
# ---------------------------------------------------------------------------

def spectrum(x):
    n = dsp.pow2(max(len(x), 2048))
    return np.abs(np.fft.rfft(x, n)), np.fft.rfftfreq(n, 1.0 / SR)


def analyse(x):
    """All per-file numbers for a mono float signal."""
    S, f = spectrum(x)
    P = S * S
    tot = float(P.sum()) + 1e-30
    peak = float(np.max(np.abs(x))) if len(x) else 0.0
    k = int(np.argmax(np.where(f >= 60.0, S, 0.0)))
    if 1 <= k < len(S) - 1 and S[k - 1] > 0 and S[k + 1] > 0:
        a, b, c = math.log(S[k - 1]), math.log(S[k]), math.log(S[k + 1])
        den = a - 2 * b + c
        k = k + (0.5 * (a - c) / den if den else 0.0)
    env = np.abs(x)
    above = np.nonzero(env > peak * dsp.undb(-20.0))[0]
    ints = np.round(x * 32767.0).astype(int)
    clipped = int(np.sum(np.abs(ints) >= 32767))                 # samples on the rails
    flat = _flat_tops(ints)
    quiet = np.nonzero(env > dsp.undb(-70.0))[0]
    return {
        'duration': len(x) / SR,
        'peak_db': dsp.db(peak),
        'rms_db': dsp.rms_db(x),
        'loud_db': dsp.loudness_db(x),
        'centroid': float((S * f).sum() / (S.sum() + 1e-30)),
        'dc': float(np.mean(x)),
        'clipped': clipped,
        'flat_tops': flat,
        'hf_db': 10.0 * math.log10(float(P[f > dsp.HF_SPLIT_HZ].sum()) / tot + 1e-12),
        'pitch': float(k * SR / (2 * (len(S) - 1))),
        'onset_ms': 1000.0 * (above[0] / SR if len(above) else 0.0),
        'head': abs(float(x[0])) if len(x) else 0.0,
        'tail': abs(float(x[-1])) if len(x) else 0.0,
        'dead_tail_ms': 1000.0 * (len(x) - 1 - quiet[-1]) / SR if len(quiet) else 0.0,
        'phone_db': phone_loss_db(x),
    }


_PHONE = dsp.butter('hp', PHONE_HP_HZ, 2)


def phone_loss_db(x):
    """Loudest-200-ms loudness through a 550 Hz high-pass minus the same without it (dB, <= 0)."""
    if len(x) < 64:
        return 0.0
    return dsp.loudness_db(dsp.filt(x, _PHONE, 0.01)) - dsp.loudness_db(x)


def _flat_tops(ints, run_len: int = 8) -> int:
    """Plateaus at the peak value: the fingerprint of a file that was clipped
    and then turned down. Counts runs of `run_len` equal samples at the peak."""
    pk = int(np.max(np.abs(ints))) if len(ints) else 0
    if pk < 3000:
        return 0
    at = (np.abs(ints) >= pk - 1).astype(int)
    c = np.concatenate(([0], np.cumsum(at)))
    if len(at) < run_len:
        return 0
    full = (c[run_len:] - c[:-run_len]) == run_len
    return int(np.sum(full[1:] & ~full[:-1]) + (1 if full[0] else 0))


def decode(path):
    """Decode any audio file with ffmpeg -> float array (n, channels) at its own rate."""
    probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries',
                            'stream=sample_rate,channels,bit_rate,codec_name', '-of', 'default=nw=1', path],
                           capture_output=True, text=True)
    meta = dict(line.split('=', 1) for line in probe.stdout.strip().splitlines() if '=' in line)
    ch = int(meta.get('channels', 2))
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-acodec', 'pcm_f32le', '-'],
                         capture_output=True)
    if raw.returncode != 0:
        raise RuntimeError('ffmpeg cannot decode %s: %s' % (path, raw.stderr.decode()[:200]))
    x = np.frombuffer(raw.stdout, '<f4').astype(float).reshape(-1, ch)
    return x, meta


def band_levels(x):
    """Level in dB of 24 third-octave-ish bands, 100 Hz .. 10 kHz, for a short window."""
    w = x * np.hanning(len(x))
    S = np.abs(np.fft.rfft(w, 8192)) ** 2
    f = np.fft.rfftfreq(8192, 1.0 / SR)
    edges = np.geomspace(100.0, 10000.0, 25)
    return np.array([10.0 * math.log10(S[(f >= lo) & (f < hi)].sum() + 1e-12) for lo, hi in zip(edges[:-1], edges[1:])])


def seam_report(x):
    """How the end of a loop meets its start, next to every boundary inside it."""
    mono = x.mean(axis=1) if x.ndim > 1 else x
    n = int(SEAM_S * SR)

    def pair(a, b):
        la, lb = band_levels(a), band_levels(b)
        floor = max(la.max(), lb.max()) - 50.0          # ignore bands that are silent in both
        keep = (la > floor) | (lb > floor)
        level = dsp.rms_db(b) - dsp.rms_db(a)
        return level, float(np.sqrt(np.mean((np.maximum(la, floor)[keep] - np.maximum(lb, floor)[keep]) ** 2)))

    level, spec = pair(mono[-n:], mono[:n])
    inner_spec, inner_level = [], []
    for s in range(n, len(mono) - n, n):
        lv, sp = pair(mono[s - n:s], mono[s:s + n])
        inner_level.append(abs(lv))
        inner_spec.append(sp)
    # level steps on a fine grid (5 ms hop), so the downbeats inside the piece,
    # where a loud attack follows a decaying bar, are measured the same way the
    # seam is: the start of a loop is a downbeat too.
    c = np.concatenate(([0.0], np.cumsum(mono * mono)))
    hop = int(0.005 * SR)
    starts = np.arange(n, len(mono) - n, hop)
    e_a = (c[starts] - c[starts - n]) / n
    e_b = (c[starts + n] - c[starts]) / n
    fine = np.abs(10.0 * np.log10((e_b + 1e-12) / (e_a + 1e-12)))
    d = np.abs(np.diff(mono))
    jump = abs(float(mono[0] - mono[-1]))
    return {
        'level_db': level, 'spec_db': spec,
        'spec_median': float(np.median(inner_spec)), 'spec_p95': float(np.percentile(inner_spec, 95)),
        'spec_pct': float(np.mean(np.array(inner_spec) <= spec) * 100.0),
        'level_p95': float(np.percentile(inner_level, 95)),
        'level_max': float(fine.max()), 'level_p99': float(np.percentile(fine, 99)),
        'level_pct': float(np.mean(fine <= abs(level)) * 100.0),
        'jump': jump, 'jump_p999': float(np.percentile(d, 99.9)), 'jump_max': float(d.max()),
    }


# ---------------------------------------------------------------------------
# checks
# ---------------------------------------------------------------------------

def check_effect(a, fmt, has_haptic, target_db=dsp.LOUDNESS_TARGET_DB):
    """-> (errors, warnings) for one .wav. `target_db` is the pack target plus the recipe's loudness tier."""
    err, warn = [], []
    sr, ch, bits = fmt
    if (sr, ch, bits) != (SR, 1, 16):
        err.append('format %d Hz/%d ch/%d bit' % (sr, ch, bits))
    if a['peak_db'] > PEAK_MAX_DB:
        err.append('peak %.2f dBFS' % a['peak_db'])
    if a['clipped']:
        err.append('%d clipped' % a['clipped'])
    if a['flat_tops']:
        warn.append('%d flat top(s): clipped before it was turned down?' % a['flat_tops'])
    if abs(a['dc']) > DC_MAX:
        err.append('DC %.4f' % a['dc'])
    if a['hf_db'] > HF_FAIL_DB:
        err.append('%.0f dB above 8 kHz' % a['hf_db'])
    elif a['hf_db'] > HF_WARN_DB:
        warn.append('%.0f dB above 8 kHz' % a['hf_db'])
    off = a['loud_db'] - target_db
    at_ceiling = a['peak_db'] > dsp.PEAK_CEILING_DB - 0.6
    if off > LOUD_TOL_DB or off < -LOUD_LIMITED_TOL_DB or (off < -LOUD_TOL_DB and not at_ceiling):
        err.append('loudness %+.1f dB off target' % off)
    elif off < -LOUD_TOL_DB / 2 and at_ceiling:
        warn.append('peak-limited, %.1f dB quiet' % -off)
    if a['head'] > EDGE_MAX or a['tail'] > EDGE_MAX:
        err.append('no fade (edge %.4f)' % max(a['head'], a['tail']))
    if a['dead_tail_ms'] > 40.0:
        warn.append('%.0f ms of dead tail' % a['dead_tail_ms'])
    if a['duration'] > MAX_EFFECT_S:
        warn.append('long (%.1f s)' % a['duration'])
    if a['centroid'] > CENTROID_WARN_HZ:
        warn.append('bright (centroid %.0f Hz)' % a['centroid'])
    if has_haptic and a['onset_ms'] > ONSET_WARN_MS:
        warn.append('speaks %.0f ms after its haptic' % a['onset_ms'])
    if a['phone_db'] < PHONE_FAIL_DB:
        err.append('phone speaker loses %.1f dB' % -a['phone_db'])
    elif a['phone_db'] < PHONE_WARN_DB:
        warn.append('phone speaker loses %.1f dB' % -a['phone_db'])
    return err, warn


def check_music(a, seam, meta, size):
    err, warn = [], []
    if not MUSIC_MIN_S <= a['duration'] <= MUSIC_MAX_S:
        err.append('%.1f s (want %g..%g)' % (a['duration'], MUSIC_MIN_S, MUSIC_MAX_S))
    if size > MUSIC_BUDGET_BYTES:
        err.append('%.0f KB (budget %.0f)' % (size / 1000.0, MUSIC_BUDGET_BYTES / 1000.0))
    if a['peak_db'] > -0.1 or a['clipped']:
        err.append('clipping (peak %.2f dBFS)' % a['peak_db'])
    if abs(a['dc']) > DC_MAX:
        err.append('DC %.4f' % a['dc'])
    if meta.get('channels') != '2':
        warn.append('%s channel(s)' % meta.get('channels'))
    # A loop starts on a downbeat, so a level step at the seam is fine as long
    # as the piece has steps like it inside (its own downbeats); it fails only
    # when it is bigger than every step inside and bigger than the absolute limit.
    lv = abs(seam['level_db'])
    if lv > SEAM_LEVEL_FAIL_DB and lv > seam['level_max'] + 1.0:
        err.append('seam level jump %+.1f dB (largest inside %.1f)' % (seam['level_db'], seam['level_max']))
    elif lv > SEAM_LEVEL_WARN_DB and lv > seam['level_p99']:
        warn.append('seam level jump %+.1f dB (p%.1f of steps inside)' % (seam['level_db'], seam['level_pct']))
    if seam['spec_pct'] > 99.5:
        err.append('seam spectral jump %.1f dB (worse than any bar line inside)' % seam['spec_db'])
    elif seam['spec_pct'] > 97.0:
        warn.append('seam spectral jump %.1f dB (p%.0f)' % (seam['spec_db'], seam['spec_pct']))
    if seam['jump'] > 3.0 * seam['jump_p999'] and seam['jump'] > 0.02:
        err.append('click at the seam (step %.3f)' % seam['jump'])
    if a['phone_db'] < MUSIC_PHONE_WARN_DB:
        warn.append('phone speaker loses %.1f dB' % -a['phone_db'])
    return err, warn


# ---------------------------------------------------------------------------
# contact sheet (PIL)
# ---------------------------------------------------------------------------

_CMAP = np.array([(0.0, 8, 8, 20), (0.2, 44, 20, 92), (0.45, 140, 40, 120), (0.7, 232, 96, 76),
                  (0.88, 252, 186, 92), (1.0, 252, 253, 220)], float)
BG, PANEL, INK, DIM, OK, BAD, WARN_C, WAVE = (18, 18, 26), (28, 28, 40), (236, 236, 244), (140, 140, 160), (120, 220, 150), (255, 96, 96), (255, 196, 84), (116, 200, 255)
FMIN, FMAX = 80.0, 16000.0


def _colour(v):
    v = np.clip(v, 0.0, 1.0)
    out = np.zeros(v.shape + (3,), np.uint8)
    for c in range(3):
        out[..., c] = np.interp(v, _CMAP[:, 0], _CMAP[:, c + 1]).astype(np.uint8)
    return out


def spectrogram(x, w, h, dyn=72.0):
    """(h, w, 3) uint8 image: log frequency FMIN..FMAX bottom to top, `dyn` dB range."""
    n = len(x)
    nwin = 256 if n < 0.12 * SR else 512 if n < 0.5 * SR else 1024 if n < 1.3 * SR else 2048
    if n > 6 * SR:
        nwin = 4096
    nfft = max(4096, nwin)
    xp = np.concatenate([np.zeros(nwin // 2), x, np.zeros(nwin // 2)])
    centres = np.linspace(0, n - 1, w).astype(int)
    idx = centres[:, None] + np.arange(nwin)[None, :]
    S = np.abs(np.fft.rfft(xp[idx] * np.hanning(nwin)[None, :], nfft, axis=1))
    S = 20.0 * np.log10(S / (S.max() + 1e-12) + 1e-9)
    edges = np.geomspace(FMIN, FMAX, h + 1)
    bins = edges * nfft / SR
    rows = np.empty((h, w))
    fb = np.arange(S.shape[1])
    for r in range(h):
        lo, hi = bins[r], bins[r + 1]
        a, b = int(math.ceil(lo)), int(math.floor(hi))
        if b >= a:
            rows[h - 1 - r] = S[:, a:b + 1].max(axis=1)
        else:
            c = 0.5 * (lo + hi)
            i0 = int(c)
            fr = c - i0
            rows[h - 1 - r] = (1 - fr) * S[:, i0] + fr * S[:, min(i0 + 1, len(fb) - 1)]
    return _colour((rows + dyn) / dyn)


def _row_of(freq, h):
    return int(round((h - 1) * (1.0 - math.log(freq / FMIN) / math.log(FMAX / FMIN))))


def _tick_step(dur):
    for s in (0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0):
        if dur / s <= 8:
            return s
    return 20.0


def _fonts():
    from PIL import ImageFont
    try:
        return (ImageFont.truetype('DejaVuSans-Bold.ttf', 13), ImageFont.truetype('DejaVuSans.ttf', 11),
                ImageFont.truetype('DejaVuSans-Bold.ttf', 20))
    except OSError:
        return ImageFont.load_default(size=13), ImageFont.load_default(size=11), ImageFont.load_default(size=20)


def _draw_wave(draw, x, left, mid, pw, half, gain=1.0):
    """Waveform into pw pixel columns. Zoomed far in (a few samples per
    pixel) it is the curve itself; otherwise min/max bars, each taken over at
    least 2.5 ms so that a column narrower than one cycle cannot fake a
    tremolo (moire)."""
    n = len(x)
    spp = n / float(pw)
    if spp <= 6.0:
        pts = [(left + i / spp, mid - float(v) * gain * half) for i, v in enumerate(x)]
        if len(pts) > 1:
            draw.line(pts, fill=WAVE)
        return
    wlen = max(int(spp), int(0.0025 * SR))
    for cx in range(pw):
        c0 = int((cx + 0.5) * spp)
        seg = x[max(c0 - wlen // 2, 0): min(c0 + wlen // 2 + 1, n)]
        if len(seg) == 0:
            continue
        hi, lo = float(seg.max()) * gain, float(seg.min()) * gain
        draw.line([left + cx, mid - int(round(hi * half)), left + cx, mid - int(round(lo * half))], fill=WAVE)


def draw_cell(img, draw, fonts, x0, y0, w, h, item):
    """One sound: label line, waveform, spectrogram, time ticks."""
    from PIL import Image
    f_b, f_s, _ = fonts
    a, x = item['a'], item['mono']
    state = BAD if item['err'] else WARN_C if item['warn'] else OK
    draw.rectangle([x0, y0, x0 + w - 1, y0 + h - 1], fill=PANEL, outline=state if item['err'] else (52, 52, 70))
    draw.ellipse([x0 + 6, y0 + 7, x0 + 14, y0 + 15], fill=state)
    draw.text((x0 + 20, y0 + 3), item['name'], font=f_b, fill=INK)
    info = '%d ms   pk %.1f   loud %.1f   ph %+.1f   %s' % (round(a['duration'] * 1000), a['peak_db'], a['loud_db'], a['phone_db'], dsp.note_name(a['pitch']))
    draw.text((x0 + 6, y0 + 20), info, font=f_s, fill=DIM)
    note = '; '.join(item['err'] + item['warn'])
    if note:
        tw = draw.textlength(note, font=f_s)
        name_end = x0 + 20 + draw.textlength(item['name'], font=f_b) + 10
        if x0 + w - 6 - tw >= name_end:            # fits on the title line, right-aligned
            draw.text((x0 + w - 6 - tw, y0 + 5), note, font=f_s, fill=state)
        else:                                       # second line, after the numbers, cut to fit
            nx = x0 + 6 + draw.textlength(info, font=f_s) + 12
            if nx + draw.textlength(note, font=f_s) > x0 + w - 6:
                while note and nx + draw.textlength(note + '...', font=f_s) > x0 + w - 6:
                    note = note[:-1]
                note += '...'
            draw.text((nx, y0 + 20), note, font=f_s, fill=state)
    pad, top = 6, 36
    pw = w - 2 * pad
    wave_h = 46
    spec_h = h - top - wave_h - 20
    # waveform: min/max per pixel column, full scale = panel height
    wy = y0 + top
    draw.rectangle([x0 + pad, wy, x0 + pad + pw - 1, wy + wave_h - 1], fill=(12, 12, 18))
    n = len(x)
    mid = wy + wave_h // 2
    half = wave_h // 2 - 1
    _draw_wave(draw, x, x0 + pad, mid, pw, half)
    # spectrogram
    sy = wy + wave_h + 2
    sp = spectrogram(x, pw, spec_h)
    img.paste(Image.fromarray(sp, 'RGB'), (x0 + pad, sy))
    for fq, lab in ((100.0, '100'), (1000.0, '1k'), (8000.0, '8k')):
        ry = sy + _row_of(fq, spec_h)
        col = (255, 255, 255) if fq == 8000.0 else (90, 90, 110)
        for dx in range(0, pw, 6 if fq == 8000.0 else 12):
            draw.point((x0 + pad + dx, ry), fill=col)
        draw.text((x0 + pad + 2, ry - 12), lab, font=f_s, fill=(200, 200, 215))
    # time ticks
    step = _tick_step(a['duration'])
    ty = sy + spec_h
    k = 0
    while k * step <= a['duration'] + 1e-9:
        tx = x0 + pad + int(round(k * step / max(a['duration'], 1e-9) * (pw - 1)))
        draw.line([tx, ty, tx, ty + 3], fill=DIM)
        if k % 2 == 0 and tx < x0 + w - 62:
            lab = ('%g' % (k * step * 1000)) if step < 1.0 else ('%gs' % (k * step))
            draw.text((tx + 2, ty + 3), lab, font=f_s, fill=DIM)
        k += 1
    if step < 1.0:
        draw.text((x0 + w - 26, ty + 3), 'ms', font=f_s, fill=DIM)


def draw_music(img, draw, fonts, x0, y0, w, h, item):
    """Full-width strip for a loop: whole-piece waveform and spectrogram, plus the seam under a magnifier."""
    from PIL import Image
    f_b, f_s, _ = fonts
    a, x, seam = item['a'], item['mono'], item['seam']
    state = BAD if item['err'] else WARN_C if item['warn'] else OK
    draw.rectangle([x0, y0, x0 + w - 1, y0 + h - 1], fill=PANEL, outline=state if item['err'] else (52, 52, 70))
    draw.ellipse([x0 + 6, y0 + 7, x0 + 14, y0 + 15], fill=state)
    draw.text((x0 + 20, y0 + 3), item['name'], font=f_b, fill=INK)
    info = ('%.2f s   %s   peak %.1f dBFS   K-RMS %.1f dB   centroid %.0f Hz   %.0f KB   |   seam: level %+.1f dB, spectrum %.1f dB '
            '(inside the loop: median %.1f, p95 %.1f), step %.3f (largest inside %.3f)'
            % (a['duration'], item['meta'].get('codec_name', '?'), a['peak_db'], a['loud_db'], a['centroid'], item['size'] / 1000.0,
               seam['level_db'], seam['spec_db'], seam['spec_median'], seam['spec_p95'], seam['jump'], seam['jump_max']))
    draw.text((x0 + 6, y0 + 20), info, font=f_s, fill=DIM)
    note = '; '.join(item['err'] + item['warn'])
    if note:
        draw.text((x0 + 260, y0 + 4), note[:160], font=f_s, fill=state)
    pad, top = 6, 38
    zoom_w = 330
    pw = w - 3 * pad - zoom_w
    wave_h = 40
    spec_h = h - top - wave_h - 20
    wy = y0 + top
    n = len(x)
    draw.rectangle([x0 + pad, wy, x0 + pad + pw - 1, wy + wave_h - 1], fill=(12, 12, 18))
    mid, half = wy + wave_h // 2, wave_h // 2 - 1
    _draw_wave(draw, x, x0 + pad, mid, pw, half, gain=2.0)
    sy = wy + wave_h + 2
    img.paste(Image.fromarray(spectrogram(x, pw, spec_h), 'RGB'), (x0 + pad, sy))
    for fq, lab in ((100.0, '100'), (1000.0, '1k'), (8000.0, '8k')):
        ry = sy + _row_of(fq, spec_h)
        for dx in range(0, pw, 12):
            draw.point((x0 + pad + dx, ry), fill=(90, 90, 110))
        draw.text((x0 + pad + 2, ry - 12), lab, font=f_s, fill=(200, 200, 215))
    step = _tick_step(a['duration'])
    k = 0
    while k * step <= a['duration']:
        tx = x0 + pad + int(round(k * step / a['duration'] * (pw - 1)))
        draw.line([tx, sy + spec_h, tx, sy + spec_h + 3], fill=DIM)
        draw.text((tx + 2, sy + spec_h + 3), '%gs' % (k * step), font=f_s, fill=DIM)
        k += 1
    # the seam: last 50 ms | first 50 ms, joined as the player will join them
    zx = x0 + 2 * pad + pw
    m = int(SEAM_S * SR)
    joined = np.concatenate([x[-m:], x[:m]])
    zh = h - top - 20
    draw.rectangle([zx, wy, zx + zoom_w - 1, wy + zh - 1], fill=(12, 12, 18))
    scale = (zh / 2 - 2) / (np.max(np.abs(joined)) + 1e-9)
    pts = [(zx + i * (zoom_w - 1) / (len(joined) - 1), wy + zh / 2 - v * scale) for i, v in enumerate(joined)]
    draw.line(pts, fill=WAVE)
    draw.line([zx + zoom_w // 2, wy, zx + zoom_w // 2, wy + zh - 1], fill=(255, 255, 255))
    draw.text((zx + 4, wy + zh + 3), 'last 50 ms', font=f_s, fill=DIM)
    draw.text((zx + zoom_w // 2 + 4, wy + zh + 3), 'first 50 ms  (the loop seam)', font=f_s, fill=DIM)


def contact_sheet(path, items, title, cols=6, cell=(396, 196)):
    from PIL import Image, ImageDraw
    fonts = _fonts()
    fx = [it for it in items if not it['music']]
    mus = [it for it in items if it['music']]
    cw, chh = cell
    gap, head, mh = 6, 52, 190
    cols = max(1, min(cols, max(len(fx), 1)))
    rows = int(math.ceil(len(fx) / cols)) if fx else 0
    W = max(cols * (cw + gap) + gap, 1300 if mus else 0)
    H = head + rows * (chh + gap) + len(mus) * (mh + gap) + gap
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.text((gap + 2, 8), title, font=fonts[2], fill=INK)
    legend = ('each cell: waveform (full scale = panel height) over a log-frequency spectrogram, %g Hz to %g kHz, 72 dB range; '
              'dotted white line = 8 kHz; time axis is per sound' % (FMIN, FMAX / 1000))
    draw.text((gap + 2, 33), legend, font=fonts[1], fill=DIM)
    for i, it in enumerate(fx):
        draw_cell(img, draw, fonts, gap + (i % cols) * (cw + gap), head + (i // cols) * (chh + gap), cw, chh, it)
    y = head + rows * (chh + gap)
    for it in mus:
        draw_music(img, draw, fonts, gap, y, W - 2 * gap, mh, it)
        y += mh + gap
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    img = img.quantize(colors=200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    img.save(path, optimize=True)
    return W, H


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def load_catalog():
    """Catalogue entries from make_sfx (None when the catalogue cannot be read)."""
    try:
        import make_sfx
        return make_sfx.parse_catalog(), make_sfx.file_names
    except Exception as e:                      # QA still measures files without it
        print('qa: catalogue not available (%s); skipping name and coverage checks' % e, file=sys.stderr)
        return None, None


def _recipes():
    try:
        from recipes import RECIPES
        return RECIPES
    except Exception:
        return {}


def recipe_key(base):
    """File base name -> recipe key ('tap_3' -> 'tap'), without needing the catalogue."""
    R = _recipes()
    if base in R:
        return base
    head, _, tail = base.rpartition('_')
    return head if tail.isdigit() and head in R else base


def stream_interval(key):
    """Repeat interval for sounds that are normalised as a stream (read from
    recipes.RECIPES, so it works even when the catalogue cannot be parsed), else None."""
    return getattr(_recipes().get(recipe_key(key)), 'stream_ms', None)


def target_for(key):
    """Loudness target of one file: the pack target plus its recipe's tier (recipes.BIG / FREQUENT)."""
    return dsp.LOUDNESS_TARGET_DB + getattr(_recipes().get(recipe_key(key)), 'loud_db', 0.0)


def print_stems(duration):
    """Per-stem K-RMS and phone loss of the tune whose loop length matches `duration` (warm pack)."""
    import music
    from packs import PACKS
    pack = PACKS['warm']()
    for tune in music.TUNES:
        loop, _, _, _ = music.TUNES[tune](pack)
        if abs(loop.seconds - duration) < 0.1:
            _, rows = music.stem_levels(tune, pack)
            print('%-24s stems of %r (warm pack, dry, at mix level):' % ('', tune))
            for name, lv, ph in sorted(rows, key=lambda r: -r[1]):
                print('%-24s   %-12s K-RMS %6.1f dB   phone %+5.1f dB' % ('', name, lv, ph))
            return
    print('%-24s stems: no tune is %.2f s long' % ('', duration))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('folders', nargs='+')
    ap.add_argument('--sheet', default=DEFAULT_SHEET, help='contact sheet PNG (default docs/design/audio-qa.png); "none" to skip')
    ap.add_argument('--only', help='comma-separated file globs (without extension), e.g. "tap_*,coin_*"')
    ap.add_argument('--cols', type=int, default=6)
    ap.add_argument('--partial', action='store_true', help='treat every folder as overrides: missing files are fine')
    ap.add_argument('--stems', action='store_true', help='also print per-stem levels of each music loop (re-renders the tune)')
    args = ap.parse_args(argv)

    entries, file_names = load_catalog()
    order, haptic, music_names, known = {}, {}, set(), set()
    if entries:
        for e in entries:
            for b in file_names(e):
                order[b] = len(order)
                haptic[b] = bool(e['haptic'])
                known.add(b + ('.m4a' if e['loop'] else '.wav'))
                if e['loop']:
                    music_names.add(b)
    pats = [p.strip() for p in args.only.split(',')] if args.only else None

    items, failures, warnings, summary = [], 0, 0, []
    for folder in args.folders:
        if not os.path.isdir(folder):
            print('qa: no such folder: %s' % folder, file=sys.stderr)
            return 1
        rel = os.path.relpath(folder, ROOT) if os.path.abspath(folder).startswith(ROOT) else folder
        names = sorted((f for f in os.listdir(folder) if f.lower().endswith(('.wav', '.m4a'))),
                       key=lambda f: (order.get(os.path.splitext(f)[0], 10 ** 6), f))
        if pats:
            names = [f for f in names if any(fnmatch.fnmatchcase(os.path.splitext(f)[0], p) for p in pats)]
        wavs = [f for f in names if f.endswith('.wav')]
        complete = bool(entries) and not args.partial and not pats and len(wavs) >= 0.5 * sum(1 for k in known if k.endswith('.wav'))
        print('\n%s  (%s)' % (rel, 'complete pack' if complete else 'overrides'))
        print('%-24s %6s %6s %6s %6s %5s %6s %6s %8s %5s %6s %8s %6s  %s'
              % ('file', 'ms', 'peak', 'RMS', 'loud', 'tier', 'phone', 'cent', 'DC', 'clip', '>8k', 'pitch', 'onset', 'notes'))
        folder_bytes, wav_bytes, wav_seconds = 0, 0, 0.0
        for f in names:
            path = os.path.join(folder, f)
            size = os.path.getsize(path)
            folder_bytes += size
            base = os.path.splitext(f)[0]
            if f.endswith('.wav'):
                x, sr, ch, bits = dsp.read_wav(path)
                mono = x if x.ndim == 1 else x.mean(axis=1)
                a = analyse(mono)
                every = stream_interval(base)
                if every:
                    a['loud_db'] = dsp.stream_loudness_db(mono, every)
                err, warn = check_effect(a, (sr, ch, bits), haptic.get(base, False), target_for(base))
                item = {'music': False, 'mono': mono}
                wav_bytes += size
                wav_seconds += a['duration']
            else:
                x, meta = decode(path)
                mono = x.mean(axis=1)
                a = analyse(mono)
                a['loud_db'] = dsp.krms_db(x)
                a['peak_db'] = dsp.peak_db(x)
                a['clipped'] = int(np.sum(np.abs(x) >= 0.9999))
                seam = seam_report(x)
                err, warn = check_music(a, seam, meta, size)
                item = {'music': True, 'mono': mono, 'seam': seam, 'meta': meta, 'size': size}
            if entries and f not in known:
                err.append('not a catalogue name')
            item.update({'name': (rel + '/' + f) if len(args.folders) > 1 else f, 'a': a, 'err': err, 'warn': warn})
            items.append(item)
            failures += bool(err)
            warnings += bool(warn)
            notes = '; '.join(['FAIL ' + e for e in err] + warn)
            tier = target_for(base) - dsp.LOUDNESS_TARGET_DB if not item['music'] else 0.0
            print('%-24s %6.0f %6.1f %6.1f %6.1f %+5.0f %+6.1f %6.0f %+8.4f %5d %6.1f %8s %6.1f  %s'
                  % (f, a['duration'] * 1000, a['peak_db'], a['rms_db'], a['loud_db'], tier, a['phone_db'], a['centroid'], a['dc'], a['clipped'],
                     a['hf_db'], dsp.note_name(a['pitch']), a['onset_ms'], notes))
            if item['music']:
                s = item['seam']
                print('%-24s loop seam: level %+.1f dB (downbeat-sized steps inside: p99 %.1f, max %.1f), spectrum %.1f dB (inside the loop: median %.1f, p95 %.1f; '
                      'the seam is at p%.0f), step %.4f (inside: p99.9 %.4f, max %.4f); %s Hz, %s ch, %.0f kb/s, %.0f KB'
                      % ('', s['level_db'], s['level_p99'], s['level_max'], s['spec_db'], s['spec_median'], s['spec_p95'], s['spec_pct'], s['jump'],
                         s['jump_p999'], s['jump_max'], item['meta'].get('sample_rate'), item['meta'].get('channels'),
                         size * 8 / 1000.0 / a['duration'], size / 1000.0))
                if args.stems:
                    print_stems(a['duration'])
        line = '%s: %d effect(s), %.1f s, %.2f MB of WAV; folder %.2f MB' % (rel, len(wavs), wav_seconds, wav_bytes / 1e6, folder_bytes / 1e6)
        if complete:
            have = set(names)
            missing = sorted(k for k in known if k not in have and not (k.endswith('.m4a') and os.path.splitext(k)[0] in music_names and False))
            missing_fx = [k for k in missing if k.endswith('.wav')]
            if missing_fx:
                failures += 1
                line += '; FAIL missing: ' + ', '.join(missing_fx)
            if folder_bytes > PACK_BUDGET_BYTES:
                failures += 1
                line += '; FAIL over the %.1f MB pack budget' % (PACK_BUDGET_BYTES / 1e6)
        print(line)
        summary.append(line)

    if args.sheet and args.sheet.lower() != 'none' and items:
        title = 'Audio QA: ' + ', '.join(os.path.relpath(f, ROOT) if os.path.abspath(f).startswith(ROOT) else f for f in args.folders)
        title += '    target loudness %.0f dB (K-weighted, loudest 200 ms), peak ceiling %.0f dBFS' % (dsp.LOUDNESS_TARGET_DB, dsp.PEAK_CEILING_DB)
        W, H = contact_sheet(args.sheet, items, title, cols=args.cols)
        print('\ncontact sheet: %s (%dx%d, %.0f KB)' % (args.sheet, W, H, os.path.getsize(args.sheet) / 1000.0))

    print('\nQA %s: %d file(s), %d failing, %d with warnings' % ('FAILED' if failures else 'passed', len(items), failures, warnings))
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
