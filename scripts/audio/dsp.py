"""Numpy-only DSP toolkit shared by make_sfx.py, music.py and qa.py.

Everything here is deterministic: random numbers come from `rng_for(...)`,
which seeds a legacy `RandomState` from a CRC of the sound's name, so a file
renders bit-identically no matter which other files are rendered with it.

Conventions: mono float64 arrays at SR Hz, nominal full scale +-1.0.
"""
from __future__ import annotations

import math
import wave
import zlib

import numpy as np

SR = 44100
TAU = 2.0 * math.pi

# ---- mastering contract (qa.py checks the same numbers) -------------------
PEAK_CEILING_DB = -1.0        # no sample above this
LOUDNESS_TARGET_DB = -17.0    # K-weighted RMS of the loudest 200 ms of every effect
LOUDNESS_WINDOW_S = 0.2
MAX_LIMIT_DB = 3.0            # the limiter may shave at most this much off a peak
HF_SPLIT_HZ = 8000.0          # "nothing harsh above 8 kHz"
PARTIAL_CEILING_HZ = 7400.0   # tonal partials above this are simply not synthesised
MUSIC_TARGET_DB = -20.0       # K-weighted RMS of a whole music loop
MUSIC_CEILING_DB = -2.5       # head-room for AAC overshoot

# ---------------------------------------------------------------------------
# small helpers
# ---------------------------------------------------------------------------

_NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def midi(note) -> float:
    """'C5' -> 72, 'F#4' -> 66, 'Bb3' -> 58. Numbers pass through."""
    if isinstance(note, (int, float, np.integer, np.floating)):
        return float(note)
    name, rest, acc = note[0].upper(), note[1:], 0
    while rest and rest[0] in '#b':
        acc += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return 12.0 * (int(rest) + 1) + _NOTE[name] + acc


def mtof(m: float) -> float:
    return 440.0 * 2.0 ** ((m - 69.0) / 12.0)


def ftom(f: float) -> float:
    return 69.0 + 12.0 * math.log2(max(f, 1e-9) / 440.0)


def note_name(f: float) -> str:
    """Nearest note with the deviation in cents, e.g. 'E6+3'."""
    m = ftom(f)
    r = int(round(m))
    c = int(round((m - r) * 100))
    return '%s%d%+d' % (_NAMES[r % 12], r // 12 - 1, c)


def cents(f, c):
    return f * 2.0 ** (c / 1200.0)


def db(x: float) -> float:
    return 20.0 * math.log10(max(float(x), 1e-12))


def undb(d: float) -> float:
    return 10.0 ** (d / 20.0)


def ns(seconds: float) -> int:
    return max(int(round(seconds * SR)), 1)


def pow2(n: int) -> int:
    return 1 << (int(max(n, 2) - 1).bit_length())


def rng_for(*parts, seed: int = 20261122) -> np.random.RandomState:
    """A reproducible random stream named after what it is used for."""
    key = '/'.join(str(p) for p in parts).encode()
    return np.random.RandomState((zlib.crc32(key) ^ seed) & 0xFFFFFFFF)


class Mix:
    """A growing mono buffer: layers are added at a time offset."""

    def __init__(self, seconds: float = 0.0):
        self.buf = np.zeros(ns(seconds) if seconds > 0 else 0)

    def add(self, x, at: float = 0.0, gain: float = 1.0):
        i = max(int(round(at * SR)), 0)
        need = i + len(x)
        if need > len(self.buf):
            self.buf = np.concatenate([self.buf, np.zeros(need - len(self.buf))])
        self.buf[i:need] += gain * np.asarray(x, float)
        return self

    def out(self):
        return self.buf


# ---------------------------------------------------------------------------
# envelopes
# ---------------------------------------------------------------------------

def rcos_in(n: int, ms: float):
    """1.0 everywhere, with a raised-cosine rise over the first `ms`."""
    e = np.ones(n)
    k = min(int(ms * SR / 1000.0), n)
    if k > 1:
        e[:k] = 0.5 - 0.5 * np.cos(np.pi * np.arange(k) / k)
    return e


def rcos_out(n: int, ms: float):
    e = np.ones(n)
    k = min(int(ms * SR / 1000.0), n)
    if k > 1:
        e[n - k:] = 0.5 + 0.5 * np.cos(np.pi * (np.arange(k) + 1) / k)
    return e


def perc(n: int, attack_ms: float, tau: float):
    """Percussive envelope: soft raised-cosine attack into an exponential decay."""
    t = np.arange(n) / SR
    return rcos_in(n, attack_ms) * np.exp(-t / tau)


def hann(n: int):
    return np.sin(np.pi * (np.arange(n) + 0.5) / n) ** 2


def points(pts, n: int, curve: float = 1.0):
    """Break-point envelope. pts = [(seconds, value), ...]; `curve` > 1 eases in."""
    ts = np.array([p[0] for p in pts], float)
    vs = np.array([p[1] for p in pts], float)
    t = np.arange(n) / SR
    y = np.interp(t, ts, vs)
    return y if curve == 1.0 else np.sign(y) * np.abs(y) ** curve


def swell(n: int, rise: float = 0.7, power: float = 2.0, fall_ms: float = 30.0):
    """Rises as u**power to the `rise` fraction of the length, then lets go."""
    u = np.arange(n) / max(n - 1, 1)
    e = np.where(u < rise, (u / rise) ** power, 1.0)
    return e * rcos_out(n, fall_ms)


def glide(f0: float, f1: float, n: int, shape: float = 1.0):
    """Frequency path from f0 to f1, linear in pitch. shape < 1 moves early, > 1 late."""
    u = (np.arange(n) / max(n - 1, 1)) ** shape
    return f0 * (f1 / f0) ** u


def glide_exp(f0: float, f1: float, n: int, tau: float):
    """Frequency that starts at f0 and settles on f1 with time constant tau (in pitch)."""
    t = np.arange(n) / SR
    return f1 * (f0 / f1) ** np.exp(-t / tau)


# ---------------------------------------------------------------------------
# oscillators
# ---------------------------------------------------------------------------

def phase(freq, n: int):
    """Running phase in radians for a constant or per-sample frequency."""
    if np.isscalar(freq):
        return TAU * float(freq) * np.arange(n) / SR
    f = np.asarray(freq, float)
    return TAU * np.concatenate(([0.0], np.cumsum(f[:n - 1]))) / SR


def sine(freq, n: int, ph0: float = 0.0):
    return np.sin(phase(freq, n) + ph0)


def _taper(f, fmax):
    """1 below 0.82*fmax, a cosine roll-off to 0 at fmax: keeps additive voices alias-free."""
    u = np.clip((fmax - np.asarray(f, float)) / (0.18 * fmax), 0.0, 1.0)
    return 0.5 - 0.5 * np.cos(np.pi * u)


def blosc(freq, n: int, shape: str = 'saw', fmax: float = 6500.0, pw: float = 0.5,
          ph0: float = 0.0, tilt: float = 0.0):
    """Band-limited oscillator by additive synthesis (harmonics stop at fmax).

    shape: 'saw' | 'square' | 'tri' | 'pulse' (width pw). `tilt` adds an extra
    1/k**tilt roll-off, which turns a saw into something rounder.
    """
    ph = phase(freq, n) + ph0
    fmin = float(np.min(freq))
    kmax = max(int(fmax // max(fmin, 1.0)), 1)
    out = np.zeros(n)
    for k in range(1, kmax + 1):
        if shape == 'saw':
            a = (2.0 / np.pi) * (-1.0) ** (k + 1) / k
        elif shape == 'square':
            a = (4.0 / np.pi) / k if k % 2 else 0.0
        elif shape == 'tri':
            a = (8.0 / np.pi ** 2) * (-1.0) ** ((k - 1) // 2) / (k * k) if k % 2 else 0.0
        elif shape == 'pulse':
            a = (2.0 / np.pi) * math.sin(np.pi * k * pw) / k
        else:
            raise ValueError(shape)
        if a == 0.0:
            continue
        if tilt:
            a /= k ** tilt
        out += a * _taper(k * np.asarray(freq, float), fmax) * np.sin(k * ph)
    return out


def harmonics(freq, n: int, amp_of, fmax: float = 6500.0, ph_rng=None, schroeder: bool = False):
    """Additive voice whose k-th harmonic has amplitude amp_of(k, k*freq).

    amp_of may return arrays (time-varying spectra, e.g. a formant the pitch
    glides through or a filter envelope). Start phases: zero, random
    (ph_rng), or Schroeder's quadratic phases, which give the flattest
    waveform for a given spectrum (more level under the same peak).
    """
    ph = phase(freq, n)
    f = np.asarray(freq, float)
    kmax = max(int(fmax // max(float(np.min(f)), 1.0)), 1)
    out = np.zeros(n)
    for k in range(1, kmax + 1):
        a = amp_of(k, k * f)
        if schroeder:
            p0 = -np.pi * k * (k - 1) / kmax
        else:
            p0 = ph_rng.uniform(0, TAU) if ph_rng is not None else 0.0
        out += a * _taper(k * f, fmax) * np.sin(k * ph + p0)
    return out


def fm(fc, ratio: float, index, n: int, env=None, os: int = 4):
    """Two-operator FM, rendered `os` times oversampled and decimated so the
    side-bands that would alias are filtered out instead."""
    N = n * os
    pos = np.arange(N) / os

    def up(v):
        return np.interp(pos, np.arange(n), np.asarray(v, float))

    idx = index if np.isscalar(index) else up(index)
    if np.isscalar(fc):
        pc = TAU * fc * np.arange(N) / (SR * os)
    else:
        f = up(fc)
        pc = TAU * np.concatenate(([0.0], np.cumsum(f[:-1]))) / (SR * os)
    y = np.sin(pc + idx * np.sin(ratio * pc))
    if env is not None:
        y *= up(env)
    return decimate(y, os)


def decimate(y, os: int):
    """Decimate by an integer factor with an FFT brick-wall (cosine transition)."""
    N = len(y)
    n = N // os
    Y = np.fft.rfft(y)
    keep = n // 2 + 1
    Z = Y[:keep].copy()
    edge = int(keep * 0.9)
    k = np.arange(keep - edge)
    Z[edge:] *= 0.5 + 0.5 * np.cos(np.pi * k / max(len(k), 1))
    return np.fft.irfft(Z, n) / os


def white(n: int, rng):
    return rng.uniform(-1.0, 1.0, n)


def colored(n: int, rng, slope_db_oct: float = -3.0):
    """Noise with a spectral slope (-3 dB/oct = pink), unit RMS."""
    nfft = pow2(n)
    X = np.fft.rfft(rng.standard_normal(nfft))
    f = np.maximum(np.fft.rfftfreq(nfft, 1.0 / SR), 20.0)
    X *= (f / 1000.0) ** (slope_db_oct / 6.0206)
    y = np.fft.irfft(X, nfft)[:n]
    return y / (np.sqrt(np.mean(y * y)) + 1e-12)


# ---------------------------------------------------------------------------
# filters
# ---------------------------------------------------------------------------

def bq(kind: str, fc: float, q: float = 0.70710678, gain: float = 0.0):
    """RBJ cookbook biquad -> (b, a). kinds: lp hp bp notch peak ls hs."""
    fc = min(max(fc, 5.0), SR * 0.49)
    w0 = TAU * fc / SR
    cw, sw = math.cos(w0), math.sin(w0)
    alpha = sw / (2.0 * q)
    A = 10.0 ** (gain / 40.0)
    if kind == 'lp':
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'hp':
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'bp':      # 0 dB at fc
        b = [alpha, 0.0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'notch':
        b = [1.0, -2 * cw, 1.0]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'peak':
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind in ('ls', 'hs'):
        s = 2.0 * math.sqrt(A) * alpha
        if kind == 'ls':
            b = [A * ((A + 1) - (A - 1) * cw + s), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - s)]
            a = [(A + 1) + (A - 1) * cw + s, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - s]
        else:
            b = [A * ((A + 1) + (A - 1) * cw + s), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - s)]
            a = [(A + 1) - (A - 1) * cw + s, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - s]
    else:
        raise ValueError(kind)
    return np.array(b, float), np.array(a, float)


def onepole(fc: float):
    """One-pole low-pass as a (b, a) section."""
    p = math.exp(-TAU * fc / SR)
    return np.array([1.0 - p, 0.0, 0.0]), np.array([1.0, -p, 0.0])


_BUTTER_Q = {2: [0.70710678], 4: [0.54119610, 1.30656296], 6: [0.51763809, 0.70710678, 1.93185165],
             8: [0.50979558, 0.60134489, 0.89997622, 2.56291545]}


def butter(kind: str, fc: float, order: int = 4):
    """Butterworth low/high-pass as cascaded biquads."""
    return [bq(kind, fc, q) for q in _BUTTER_Q[order]]


def _ring_len(a) -> int:
    r = np.abs(np.roots(a))
    rmax = float(min(max(r.max() if len(r) else 0.0, 1e-6), 0.999999))
    return int(min(math.log(1e-5) / math.log(rmax), 4 * SR))


def response(sections, w):
    """Complex response of cascaded sections at w (radians per sample)."""
    z1 = np.exp(-1j * w)
    z2 = z1 * z1
    H = np.ones(len(w), complex)
    for b, a in sections:
        H *= (b[0] + b[1] * z1 + b[2] * z2) / (a[0] + a[1] * z1 + a[2] * z2)
    return H


def filt(x, sections, tail: float = 0.0):
    """Run x through cascaded biquads.

    Recursive filters are slow as Python loops, so the exact filter response is
    applied in the frequency domain instead; zero padding as long as the
    filter's ring keeps the circular wrap-around below -100 dB.
    """
    x = np.asarray(x, float)
    if isinstance(sections, tuple):
        sections = [sections]
    n, nt = len(x), int(round(tail * SR))
    ring = max(_ring_len(a) for _, a in sections)
    nfft = pow2(n + max(nt, ring) + 8)
    w = TAU * np.arange(nfft // 2 + 1) / nfft
    return np.fft.irfft(np.fft.rfft(x, nfft) * response(sections, w), nfft)[:n + nt]


def lowpass(x, fc, order: int = 2):
    return filt(x, butter('lp', fc, order))


def highpass(x, fc, order: int = 2):
    return filt(x, butter('hp', fc, order))


def bandpass(x, fc, q: float = 1.0, tail: float = 0.0):
    return filt(x, bq('bp', fc, q), tail)


def peak(x, fc, q, gain):
    return filt(x, bq('peak', fc, q, gain))


def svf(x, fc, q=1.0, mode: str = 'bp'):
    """Time-varying state-variable filter (trapezoidal / TPT form, stable for
    fast sweeps). fc and q may be arrays. 'bp' has 0 dB peak gain."""
    n = len(x)
    fcv = np.clip(np.broadcast_to(np.asarray(fc, float), (n,)), 15.0, SR * 0.45)
    kv = 1.0 / np.broadcast_to(np.asarray(q, float), (n,))
    g = np.tan(np.pi * fcv / SR)
    a1 = 1.0 / (1.0 + g * (g + kv))
    a2 = g * a1
    a3 = g * a2
    xs, a1l, a2l, a3l, kl = np.asarray(x, float).tolist(), a1.tolist(), a2.tolist(), a3.tolist(), kv.tolist()
    out = [0.0] * n
    ic1 = ic2 = 0.0
    if mode == 'bp':
        for i in range(n):
            v3 = xs[i] - ic2
            v1 = a1l[i] * ic1 + a2l[i] * v3
            v2 = ic2 + a2l[i] * ic1 + a3l[i] * v3
            ic1 = 2.0 * v1 - ic1
            ic2 = 2.0 * v2 - ic2
            out[i] = kl[i] * v1
    elif mode == 'lp':
        for i in range(n):
            v3 = xs[i] - ic2
            v1 = a1l[i] * ic1 + a2l[i] * v3
            v2 = ic2 + a2l[i] * ic1 + a3l[i] * v3
            ic1 = 2.0 * v1 - ic1
            ic2 = 2.0 * v2 - ic2
            out[i] = v2
    elif mode == 'hp':
        for i in range(n):
            v3 = xs[i] - ic2
            v1 = a1l[i] * ic1 + a2l[i] * v3
            v2 = ic2 + a2l[i] * ic1 + a3l[i] * v3
            ic1 = 2.0 * v1 - ic1
            ic2 = 2.0 * v2 - ic2
            out[i] = xs[i] - kl[i] * v1 - v2
    else:
        raise ValueError(mode)
    return np.array(out)


# ---------------------------------------------------------------------------
# physical-ish voices
# ---------------------------------------------------------------------------

def modal(parts, n: int, attack_ms: float = 1.5, ceiling: float = PARTIAL_CEILING_HZ):
    """Bank of exponentially decaying sine modes.

    parts = [(freq, amp, tau[, attack_ms[, phase]]), ...]. Each mode gets its
    own raised-cosine onset, which is what makes a mallet soft or hard.
    """
    t = np.arange(n) / SR
    out = np.zeros(n)
    for p in parts:
        f, a, tau = p[0], p[1], p[2]
        if f >= ceiling or a == 0.0:
            continue
        att = p[3] if len(p) > 3 else attack_ms
        ph0 = p[4] if len(p) > 4 else 0.0
        out += a * rcos_in(n, att) * np.exp(-t / tau) * np.sin(TAU * f * t + ph0)
    return out


def lagrange(d: float, order: int = 3):
    """Lagrange fractional-delay FIR for a delay of d samples (best for 1 <= d <= 2)."""
    h = np.ones(order + 1)
    for k in range(order + 1):
        for m in range(order + 1):
            if m != k:
                h[k] *= (d - m) / (k - m)
    return h


def karplus(f: float, n: int, rng, t60: float = 1.2, damp: float = 0.35, pick: float = 0.18,
            hardness: float = 0.6, noise: float = 0.35):
    """Extended Karplus-Strong plucked string.

    A burst (an ideal pluck shape plus some pick noise, combed by the pick
    position and low-passed by the pick hardness) circulates in a delay line
    whose loop holds a one-zero low-pass `damp` (0 bright .. 0.5 dull) and a
    Lagrange fractional delay for exact tuning. The loop only reads samples at
    least one period old, so it is computed a whole period at a time.
    """
    D = SR / f
    M = int(math.floor(D - damp - 1.0))
    if M < 4:
        raise ValueError('karplus: note too high')
    taps = np.convolve(lagrange(D - damp - M), [1.0 - damp, damp])   # delays M .. M+4
    # loop gain for the wanted T60 of the fundamental, compensating the loop filter
    w1 = TAU * f / SR
    loop_mag = abs(np.sum(taps * np.exp(-1j * w1 * np.arange(5))))
    rho = min(10.0 ** (-3.0 / (f * t60)) / max(loop_mag, 1e-6), 0.9999)

    L = int(round(D))
    k = np.arange(L)
    apex = min(max(int(round(pick * L)), 1), L - 1)
    shape = np.where(k < apex, 1.0 / apex, -1.0 / (L - apex)) * apex      # d/dt of a pluck triangle
    burst = rng.uniform(-1.0, 1.0, L)
    burst[apex:] -= burst[:-apex].copy()                                  # pick-position comb for the noise
    exc = np.concatenate([shape + noise * burst, np.zeros(L)])
    exc = filt(exc, onepole(600.0 + 9000.0 * hardness ** 2))
    win = rcos_in(len(exc), 0.5) * rcos_out(len(exc), 1.0)
    exc = exc * win
    exc -= win * (exc.sum() / win.sum())       # no DC into the loop: it would circulate for ever

    off = M + 5
    y = np.zeros(off + n)
    x = np.zeros(n)
    m = min(len(exc), n)
    x[:m] = exc[:m]
    for s in range(0, n, M):
        e = min(s + M, n)
        acc = x[s:e].copy()
        for j in range(5):
            acc += rho * taps[j] * y[off + s - M - j: off + e - M - j]
        y[off + s: off + e] = acc
    out = y[off:]
    return out / (np.max(np.abs(out[:min(n, 4 * L + 64)])) + 1e-12)


# ---------------------------------------------------------------------------
# reverb (Schroeder / Moorer network rendered once into an impulse response)
# ---------------------------------------------------------------------------

def comb_fb(x, D: int, g: float, damp: float = 0.2):
    """Feedback comb with a one-zero low-pass in the loop, a delay-length block at a time."""
    n = len(x)
    pad = D + 1
    y = np.zeros(n + pad)
    for s in range(0, n, D):
        e = min(s + D, n)
        y[pad + s: pad + e] = x[s:e] + g * ((1.0 - damp) * y[pad + s - D: pad + e - D]
                                             + damp * y[pad + s - D - 1: pad + e - D - 1])
    return y[pad:]


def allpass(x, D: int, g: float = 0.7):
    """Schroeder all-pass diffuser."""
    n = len(x)
    xb = np.concatenate([np.zeros(D), x])
    yb = np.zeros(n + D)
    for s in range(0, n, D):
        e = min(s + D, n)
        yb[D + s: D + e] = -g * x[s:e] + xb[s:e] + g * yb[s:e]
    return yb[D:]


_COMBS_MS = (25.31, 26.94, 28.96, 30.75, 32.24, 33.81)
_ALLPASS_MS = (5.10, 1.73, 12.61)


def reverb_ir(t60: float = 0.6, size: float = 1.0, damp: float = 0.25, predelay_ms: float = 6.0,
              lp: float = 5200.0, hp: float = 260.0, spread: float = 1.0):
    """Impulse response of a small Schroeder-Moorer reverb, unit energy.

    Two all-pass diffusers feed six damped parallel combs and a last all-pass.
    `spread` detunes the delay set (use 1.0 / 1.03 for a left / right pair).
    """
    n = ns(t60 * 1.6 + 0.08)
    x = np.zeros(n)
    x[min(int(predelay_ms * SR / 1000.0), n - 1)] = 1.0
    for ms in _ALLPASS_MS[:2]:
        x = allpass(x, max(int(ms * size * spread * SR / 1000.0) | 1, 3), 0.6)
    acc = np.zeros(n)
    for i, ms in enumerate(_COMBS_MS):
        D = max(int(ms * size * spread * SR / 1000.0) | 1, 3)
        g = 10.0 ** (-3.0 * (D / SR) / t60)
        acc += (1.0 if i % 2 == 0 else -1.0) * comb_fb(x, D, g, damp)
    y = allpass(acc, max(int(_ALLPASS_MS[2] * size * spread * SR / 1000.0) | 1, 3), 0.6)
    y = filt(y, butter('lp', lp, 2) + butter('hp', hp, 2))
    y *= rcos_out(len(y), 40.0)
    return y / (np.sqrt(np.sum(y * y)) + 1e-12)


def convolve(x, ir):
    nfft = pow2(len(x) + len(ir))
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:len(x) + len(ir) - 1]


def add_reverb(x, ir, mix: float = 0.15, tail: float = None):
    """Dry signal plus `mix` of the reverb; `tail` limits how much ring is kept (seconds)."""
    wet = convolve(x, ir)
    keep = len(wet) if tail is None else min(len(wet), len(x) + ns(tail))
    out = np.zeros(keep)
    out[:len(x)] = x
    out += mix * wet[:keep]
    return out


# ---------------------------------------------------------------------------
# measuring, limiting, mastering
# ---------------------------------------------------------------------------

def _k_sections():
    """ITU-R BS.1770 K-weighting (shelf + RLB high-pass) designed for SR."""
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = math.tan(math.pi * f0 / SR)
    Vh = 10.0 ** (G / 20.0)
    Vb = Vh ** 0.4996667741545416
    a0 = 1.0 + K / Q + K * K
    b1 = np.array([(Vh + Vb * K / Q + K * K) / a0, 2.0 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0])
    a1 = np.array([1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0])
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = math.tan(math.pi * f0 / SR)
    a0 = 1.0 + K / Q + K * K
    b2 = np.array([1.0, -2.0, 1.0])
    a2 = np.array([1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0])
    return [(b1, a1), (b2, a2)]


K_SECTIONS = _k_sections()


def kweight(x):
    return filt(x, K_SECTIONS, tail=0.01)


def loudness_db(x, window: float = LOUDNESS_WINDOW_S) -> float:
    """Perceived level of a one-shot: K-weighted RMS of its loudest `window`.

    Sounds shorter than the window are measured as if padded with silence,
    which is how the ear integrates very short blips too.
    """
    y = kweight(x)
    w = int(window * SR)
    p = y * y
    if len(p) <= w:
        ms = p.sum() / w
    else:
        c = np.concatenate(([0.0], np.cumsum(p)))
        ms = float((c[w:] - c[:-w]).max()) / w
    return 10.0 * math.log10(ms + 1e-20)


def stream_loudness_db(x, every_ms: float, count: int = 8) -> float:
    """Loudness of a sound retriggered every `every_ms`, the way typewriter
    blips are really heard: as a stream, not as single shots."""
    step = int(every_ms * SR / 1000.0)
    buf = np.zeros(step * (count - 1) + len(x))
    for i in range(count):
        buf[i * step: i * step + len(x)] += x
    return loudness_db(buf)


def krms_db(x) -> float:
    """K-weighted RMS of a whole signal (mono, or mean power of the channels)."""
    x = np.asarray(x, float)
    chans = [x] if x.ndim == 1 else [x[:, c] for c in range(x.shape[1])]
    p = np.mean([np.mean(kweight(c) ** 2) for c in chans])
    return 10.0 * math.log10(p + 1e-20)


def peak_db(x) -> float:
    return db(np.max(np.abs(x)) if len(x) else 0.0)


def rms_db(x) -> float:
    return 10.0 * math.log10(float(np.mean(np.asarray(x, float) ** 2)) + 1e-20)


def _sliding_min(g, L):
    h = L // 2
    pad = np.concatenate([np.ones(h), g, np.ones(h)])
    out = pad[:len(g)].copy()
    for k in range(1, L):
        np.minimum(out, pad[k:k + len(g)], out=out)
    return out


def _moving_avg(g, L):
    h = L // 2
    pad = np.concatenate([np.full(h, g[0]), g, np.full(h, g[-1])])
    c = np.concatenate(([0.0], np.cumsum(pad)))
    return (c[L:] - c[:-L]) / L


def limit(x, ceil_db: float = PEAK_CEILING_DB, knee_db: float = 6.0, look_ms: float = 4.0):
    """Soft-knee look-ahead limiter. Returns (y, max gain reduction in dB).

    The wanted gain follows a tanh knee that starts `knee_db` under the
    ceiling; it is then min-filtered and averaged over the look-ahead window,
    so the gain moves smoothly and the output can never pass the ceiling.
    Works on mono (n,) or multi-channel (n, c) with linked gain.
    """
    x = np.asarray(x, float)
    C = undb(ceil_db)
    T = C * undb(-knee_db)
    a = np.abs(x) if x.ndim == 1 else np.max(np.abs(x), axis=1)
    over = a > T
    if not over.any():
        return x.copy(), 0.0
    tgt = np.where(over, T + (C - T) * np.tanh((a - T) / (C - T)), a)
    g = np.where(over, tgt / np.maximum(a, 1e-12), 1.0)
    L = int(look_ms * SR / 1000.0) | 1
    gs = _moving_avg(_sliding_min(g, L), L)
    y = x * gs if x.ndim == 1 else x * gs[:, None]
    return y, -db(float(gs.min()))


def normalise(x, target_db: float = LOUDNESS_TARGET_DB, ceil_db: float = PEAK_CEILING_DB,
              max_gr_db: float = MAX_LIMIT_DB, measure=loudness_db):
    """Scale + limit so `measure` hits the target, never passing the ceiling.

    If reaching the target would need more than max_gr_db of limiting, the
    file stays quieter instead (returned info says so): loud and crushed is
    worse than a little quiet. Returns (y, info dict).
    """
    x = np.asarray(x, float)

    def run(gain_db):
        y, gr = limit(x * undb(gain_db), ceil_db)
        return y, gr, measure(y)

    g0 = target_db - measure(x)
    y, gr, loud = run(g0)
    if gr == 0.0:
        return y, {'gain_db': g0, 'limit_db': 0.0, 'loudness_db': loud, 'peak_limited': False}
    lo, hi = g0, g0 + 12.0          # the limiter only ever lowers loudness: search upwards
    for _ in range(26):
        mid = 0.5 * (lo + hi)
        y, gr, loud = run(mid)
        if loud < target_db:
            lo = mid
        else:
            hi = mid
    y, gr, loud = run(hi)
    limited = False
    if gr > max_gr_db:
        limited = True
        lo, hi2 = g0 - 12.0, hi
        for _ in range(26):
            mid = 0.5 * (lo + hi2)
            _, grm, _ = run(mid)
            if grm > max_gr_db:
                hi2 = mid
            else:
                lo = mid
        hi = lo
        y, gr, loud = run(hi)
    return y, {'gain_db': hi, 'limit_db': gr, 'loudness_db': loud, 'peak_limited': limited}


def trim(x, floor_db: float = -50.0, lead_db: float = -46.0, keep_ms: float = 4.0):
    """Cut leading silence and the tail below `floor_db` (relative to the peak)."""
    a = np.abs(x)
    pk = a.max() if len(a) else 0.0
    if pk <= 0.0:
        return x
    loud = np.nonzero(a > pk * undb(floor_db))[0]
    first = np.nonzero(a > pk * undb(lead_db))[0]
    keep = int(keep_ms * SR / 1000.0)
    start = max(int(first[0]) - int(0.0015 * SR), 0)
    end = min(int(loud[-1]) + keep, len(x))
    return x[start:end]


def fades(x, in_ms: float = 3.0, out_ms: float = None):
    """3 ms raised-cosine fade-in and a fade-out (12 % of the length, 6..60 ms)."""
    n = len(x)
    if out_ms is None:
        out_ms = min(max(0.12 * n / SR * 1000.0, 6.0), 60.0)
    return x * rcos_in(n, in_ms) * rcos_out(n, out_ms)


def master_eq(x, hp_hz: float = 40.0, lp_hz: float = 7300.0):
    """Sub-sonic high-pass and the '8 kHz' guard low-pass every effect goes through."""
    return filt(x, butter('hp', hp_hz, 2) + butter('lp', lp_hz, 4), tail=0.004)


def _dc_out(y, w):
    """Remove the mean with a window-shaped correction, so faded ends stay exactly zero."""
    return y - w * (np.sum(y) / np.sum(w))


def master(x, hp_hz: float = 40.0, lp_hz: float = 7300.0, target_db: float = LOUDNESS_TARGET_DB,
           floor_db: float = -50.0, length: float = None, stream_ms: float = None):
    """The whole one-shot mastering chain. Returns (y, info).

    EQ guard -> trim (tail cut `floor_db` under the peak, and at `length`
    seconds if given, with a longer fade so a cut tail still sounds like a
    decay) -> DC out -> 3 ms fade-in and a fade-out -> loudness target with
    the soft limiter -> DC out again (limiting an asymmetric wave shifts it).
    With `stream_ms` the loudness is that of the sound repeated at that
    interval (see stream_loudness_db).
    """
    y = master_eq(x, hp_hz, lp_hz)
    y = trim(y, floor_db)
    out_ms = None
    if length is not None and len(y) > ns(length):
        y = y[:ns(length)]
        out_ms = min(max(350.0 * length, 12.0), 320.0)
    y = y - np.mean(y)
    y = fades(y, out_ms=out_ms)
    w = fades(np.ones(len(y)), out_ms=out_ms)
    y = _dc_out(y, w)
    measure = loudness_db if not stream_ms else (lambda v: stream_loudness_db(v, stream_ms))
    y, info = normalise(y, target_db, measure=measure)
    y = _dc_out(y, w)
    over = np.max(np.abs(y)) / undb(PEAK_CEILING_DB)
    if over > 1.0:
        y = y / over
    # the foot of a long fade is inaudible: stop the file where it drops under -64 dBFS
    live = np.nonzero(np.abs(y) > undb(-64.0))[0]
    if len(live) and live[-1] + ns(0.004) < len(y):
        y = y[:live[-1] + ns(0.004)]
        y = y * rcos_out(len(y), 3.0)
    info['duration'] = len(y) / SR
    info['peak_db'] = peak_db(y)
    return y, info


# ---------------------------------------------------------------------------
# files
# ---------------------------------------------------------------------------

def to_int16(x):
    return np.clip(np.round(np.asarray(x, float) * 32767.0), -32768, 32767).astype('<i2')


def write_wav(path: str, x, channels: int = 1):
    data = to_int16(x)
    with wave.open(path, 'wb') as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def read_wav(path: str):
    """-> (float array (n,) or (n, c), sample rate, channels, bits)."""
    with wave.open(path, 'rb') as w:
        ch, width, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    if width == 2:
        x = np.frombuffer(raw, '<i2').astype(float) / 32767.0
    elif width == 1:
        x = (np.frombuffer(raw, 'u1').astype(float) - 128.0) / 127.0
    else:
        x = np.frombuffer(raw, '<i%d' % width).astype(float) / float(2 ** (8 * width - 1) - 1)
    if ch > 1:
        x = x.reshape(-1, ch)
    return x, sr, ch, width * 8
