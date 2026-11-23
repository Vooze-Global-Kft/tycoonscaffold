"""Night Market ("Lantern Row", mode "merge"): one recipe per sound key, and the instruments.

Written for this game from docs/design/market-design.md section 6. Character (6.1): steam,
paper, cloth, clay and charcoal, a street at dusk; not a restaurant, not a radio.

This module imports dsp.py and nothing else of scripts/audio: never recipes.py (Pizza Empire),
never recipes_haul.py (Orbit Haulers), never packs.py (the timbres those two games are rendered
on). Every instrument below is built here from dsp primitives (noise, filters, envelopes,
additive voices):

  pff()            a puff of steam's breath: noise through two vowel-like resonances (f1 0.4 to
                   1.1 kHz, f2 1.7 to 3.2 kHz) with a deep valley between them, not one flat band
  lid_clink()      a clay steamer lid knocked: a 2 to 3 ms 'tok' of noise through two wide clay
                   resonances (the same lid for every tier: a colour, not a note)
  rattle_gate()    the lid rattling on its seat: a chuff gate, about 18 a second and slowing
  sizzle()         sparse crackle grains, water on a hot lid
  merge_puff()     the merges: lid tok + pff + low whoomph, chuffed by the rattle, then a sizzle
  stickslip()      friction's stick-slip (an amplitude gate, 20 to 110 slips a second): what makes
                   cloth and paper read as rubbing rather than as a whoosh
  cloth_rub()      cloth on cloth: low noise (300 to 1,500 Hz, fixed band) with a deep stick-slip
  crinkle()        paper: Poisson clicks of tiny noise grains, band-limited (crinkle, flutter,
                   crumple, unfolding, the basket); crinkle_burst() one short dense burst of them
  paper_slide()    paper sliding on paper: a dense stream of fibre micro-clicks in two FIXED bands
                   with a stick-slip; a rising slide fades the upper band in (no swept filter)
  paper_tick()     a crisp paper tick (a pen tick on a ticket)
  felt_stamp()     a felt stamp: a dull pressed thud with a fibrous pat, no ring
  clay_click()     one clay coin: a few strongly damped inharmonic modes, no ring
  cloth_flap()     one snap of an awning
  charcoal()       tiny charcoal crackle: a few sparse pops and an ember hiss
  hand_drum()      a small hand drum: membrane modes (circular-membrane ratios) with a palm slap
  reed()           a low free reed: additive, formant-shaped, breathy, slow vibrato
  bowed()          a bowed pad voice: saw-like additive spectrum, bow noise, slow swell
  temple_bell()    the one bell (the Festival's only): a struck modal bell
  wind(), flame(), crowd()  the street's air

There is no swept band-pass 'whoosh' in this pack (the warm pack's whoosh is a band-pass of white
noise along a path; the first version of this file had one, and its merges, moves and sheets
measured as near copies of the other games' whooshes on compare.py's timbre leg). Every noise sound
here is shaped instead by formants, stick-slip, chuffs or grains.

Rules held to (6.1):
  - no pitched ladder for the merge tiers: merge_1 .. merge_8 grow in size (length, the number of
    rattles, the low body, the mastering level) and brightness (the formants open, the upper
    formant and the sizzle grow), never up a scale; no part of a merge has a pitch that moves from
    tier to tier;
  - no plucked strings, wood knocks, register, marimba, pulse blips, radio squelch;
  - no bell on any money moment (ticket_filled, coins, basket_sell carry none); the bell is only
    in festival_done.

A recipe returns a mono float array; render_night.py masters it with dsp.master exactly as the
other two packs are mastered (EQ guard, trim, fades, DC, loudness target plus the tier, limiter).
"""
from __future__ import annotations

import math

import numpy as np

from dsp import (SR, TAU, Mix, bandpass, butter, filt, glide, harmonics, highpass, lowpass, midi, modal, mtof, ns,
                 perc, phase, points, rcos_in, rcos_out, rng_for, svf, white, colored)

NIGHT_RECIPES = {}

BIG = 2.0          # loudness tiers, dB on the mastering target (the convention of both other packs)
LOUD = 1.0
FREQUENT = -2.0
QUIET = -4.0


def night_recipe(name, length=None, stream_ms=None, loud_db=0.0):
    """Register a recipe of this game. length (s) caps the file with a long fade; stream_ms
    measures loudness on the sound repeated at that interval; loud_db is the tier."""
    def deco(fn):
        fn.length = length
        fn.stream_ms = stream_ms
        fn.loud_db = float(loud_db)
        fn.night = True
        if name in NIGHT_RECIPES:
            raise ValueError('two night recipes for %r' % name)
        NIGHT_RECIPES[name] = fn
        return fn
    return deco


class NightCtx:
    """What a recipe gets: its key, a private random stream named after it, the accents list."""

    def __init__(self, key):
        self.key = key
        self.rng = rng_for('night', key)
        self.accents = []
        self.notes = []
        self.floor_db = -50.0
        self.length = None

    def accent(self, *times):
        self.accents.extend(float(t) for t in times)

    def sub(self, tag):
        return rng_for('night', self.key, tag)

    def hz(self, name):
        self.notes.append(name)
        return mtof(midi(name))


# ===========================================================================
# small helpers
# ===========================================================================

def path_env(pts, n, log=False):
    """Break-point path [(s, v), ...] over n samples; log=True interpolates in log (for Hz)."""
    if log:
        return np.exp(points([(t, math.log(v)) for t, v in pts], n))
    return points(pts, n)


def band(x, lo, hi, order=2):
    """Band-limit: a high-pass at lo (order), a 4th-order low-pass at hi (nothing harsh above 8 kHz)."""
    return filt(x, butter('hp', lo, order) + butter('lp', hi, 4))


def top(x, fc=5600.0):
    """The 'air' ceiling of this pack: a 4th-order low-pass, so noise sounds keep under -26 dB above 8 kHz."""
    return filt(x, butter('lp', fc, 4))


def flutter(rng, n, rate_hz, depth):
    """Slow random amplitude movement (1 +- depth), smooth at about rate_hz."""
    m = lowpass(rng.standard_normal(n + ns(0.2)), rate_hz, 2)[:n]
    m /= (np.std(m) + 1e-12)
    return np.clip(1.0 + depth * m, 0.0, None)


def soft(x, drive=2.0):
    """A gentle saturation (tanh) of x scaled to unit peak: it rounds the highest peaks of a noise
    burst by a few dB, so a short puff reaches its loudness without the limiter. Back at unit peak."""
    pk = np.max(np.abs(x)) + 1e-12
    return np.tanh(drive * x / pk) / math.tanh(drive)


def decay(n, attack_ms, tau):
    return perc(n, attack_ms, tau)


# ===========================================================================
# instruments (used here and by night_music.py)
# ===========================================================================

def grains(rng, dur, rate, glen_ms=(0.25, 1.6), sigma=0.9, density=None):
    """Poisson clicks: each a tiny noise grain with a lognormal level. density [(s, 0..1)] thins
    the stream over time. Unfiltered: a raw crackle for crinkle(), charcoal() and the basket."""
    n = ns(dur)
    out = np.zeros(n)
    count = rng.poisson(max(rate * dur, 1.0))
    times = np.sort(rng.uniform(0.0, dur, count))
    dens = None if density is None else np.interp(times, [p[0] for p in density], [p[1] for p in density])
    for j, t in enumerate(times):
        if dens is not None and rng.uniform() > dens[j]:
            continue
        L = ns(rng.uniform(*glen_ms) / 1000.0)
        i = int(t * SR)
        k = min(L, n - i)
        if k <= 2:
            continue
        g = math.exp(rng.normal(0.0, sigma))
        seg = white(L, rng) * np.exp(-np.arange(L) / (L / 3.0))
        out[i:i + k] += g * seg[:k]
    return out


def crinkle(rng, dur, rate=500.0, lo=1500.0, hi=5600.0, density=None, sigma=0.9, glen_ms=(0.25, 1.6)):
    """Paper crinkle: a grain stream through the paper band, normalised to unit peak."""
    y = band(grains(rng, dur, rate, glen_ms, sigma, density), lo, hi, 2)
    return y / (np.max(np.abs(y)) + 1e-12)


def stickslip(rng, n, rate, depth, dec_ms=None, accel=0.0):
    """Friction's stick-slip: an amplitude gate with one pulse per slip, about `rate` a second
    (gaps jittered 12 %; accel > 0 slows the slips over the sound), each opening in 1.5 ms and
    closing in dec_ms. depth 0..1. This, not a moving filter, is what makes cloth and paper read
    as rubbing."""
    dec_ms = dec_ms or 350.0 / rate
    g = np.zeros(n)
    k = ns(4.0 * dec_ms / 1000.0) + 1
    shape = rcos_in(k, 1.5) * np.exp(-np.arange(k) / max(ns(dec_ms / 1000.0), 1))
    t, dur = 0.0, n / SR
    gap = 1.0 / rate
    while t < dur:
        i = int(t * SR)
        j = min(n, i + k)
        g[i:j] = np.maximum(g[i:j], shape[:j - i] * rng.uniform(0.7, 1.0))
        t += gap * rng.uniform(0.88, 1.12) * (1.0 + accel * t / dur)
    return (1.0 - depth) + depth * g


def paper_slide(rng, dur, fc_pts, q=1.0, env=None, grain=0.55, slip_hz=38.0):
    """Paper sliding over paper: a dense stream of fibre micro-clicks (2,500 a second) in two fixed
    paper bands, the lowest and the highest frequency of fc_pts, with a stick-slip at about
    slip_hz. There is no swept filter: a 'rising' slide fades the upper band in, a 'falling' one
    fades it out. q is kept for the callers' signature and only narrows the two bands."""
    n = ns(dur)
    fs = [v for _, v in fc_pts]
    lo_f, hi_f = min(fs), max(fs)
    rising = fs[-1] >= fs[0]
    g = grains(rng, dur, 2500.0, (0.08, 0.4), 0.6)
    w = 1.45 / max(q, 0.5)
    lo_b = band(g, lo_f / w, lo_f * w, 2)
    hi_b = band(g, hi_f / w, min(hi_f * w, 5600.0), 2)
    ramp = np.linspace(0.0, 1.0, n) if rising else np.linspace(1.0, 0.0, n)
    y = (1.0 - 0.6 * ramp) * lo_b + (0.25 + 0.75 * ramp) * hi_b
    y = soft(y, 2.5)                                         # round the grain peaks so the slide reaches its loudness
    y = y * stickslip(rng, n, slip_hz, grain)
    if env is None:
        env = np.sin(np.pi * np.arange(n) / n) ** 1.5
    return 1.2 * y * env


def paper_tick(rng, vel=1.0, bright=1.0):
    """A crisp paper tick: a 3 ms high crack and a little 1.4 kHz body."""
    n = ns(0.04)
    crack = band(white(n, rng), 2200.0 * bright, 5600.0, 2) * decay(n, 0.15, 0.0016)
    body = bandpass(white(n, rng), 1400.0 * bright, 1.6) * decay(n, 0.4, 0.006)
    return vel * (1.4 * crack + 1.1 * body)


def felt_stamp(rng, vel=1.0, weight=1.0):
    """A felt stamp pressed on paper: a dull low thud, a fibrous pat at 900 Hz and a soft press
    of fibres above 2 kHz. No ring: felt has no modes worth the name."""
    n = ns(0.13)
    thud = lowpass(white(n, rng), 260.0, 2) * decay(n, 1.6, 0.022 * weight)
    pat = bandpass(white(n, rng), 880.0, 0.9) * decay(n, 1.0, 0.014 * weight)
    press = band(white(n, rng), 2000.0, 5200.0, 2) * decay(n, 0.6, 0.005)
    return vel * (2.4 * thud + 2.0 * pat + 0.45 * press)


def clay_click(rng, f0, vel=1.0):
    """One small fired-clay coin knocking another: three strongly damped inharmonic modes (4 to
    9 ms) and a 1 ms grit click. Damped so hard that it is a 'tok' with a colour, not a tone."""
    n = ns(0.035)
    r = rng.uniform
    parts = [(f0, 1.0, 0.0085 * r(0.8, 1.2), 0.3), (f0 * r(1.48, 1.58), 0.7, 0.0055, 0.3),
             (f0 * r(2.2, 2.45), 0.45, 0.004, 0.2), (f0 * r(3.1, 3.4), 0.25, 0.003, 0.2)]
    y = modal([(f, a, t, at, r(0, TAU)) for f, a, t, at in parts], n)
    grit = band(white(n, rng), 2500.0, 6000.0, 2) * decay(n, 0.1, 0.0012)
    return vel * (y + 0.6 * grit)


def cloth_flap(rng, vel=1.0, fc=900.0):
    """One snap of an awning in the wind: a fast attack band of noise, 30 ms."""
    n = ns(0.06)
    y = band(colored(n, rng, -1.5), fc * 0.55, fc * 2.2, 2) * decay(n, 0.8, 0.012)
    low = lowpass(white(n, rng), 300.0, 2) * decay(n, 1.5, 0.02)
    return vel * (2.0 * y + 1.5 * low)


def cloth_rub(rng, dur, lo, hi, slip_hz=30.0, depth=0.85, env=None, accel=0.3):
    """Cloth rubbing on cloth: brown-ish noise in a fixed low band (lo..hi, inside 300 to 1,500 Hz)
    chopped by a deep stick-slip at slip_hz (20 to 40 a second), slowing as the rub ends. No sweep."""
    n = ns(dur)
    y = band(colored(n, rng, -2.0), lo, hi, 2)
    y = y / (np.max(np.abs(y)) + 1e-12)
    y = y * stickslip(rng, n, slip_hz, depth, accel=accel)
    if env is None:
        env = points([(0, 0.0), (0.008, 1.0), (dur * 0.45, 0.8), (dur, 0.0)], n)
    return 1.6 * y * env


def charcoal(rng, dur=0.08, pops=4, vel=1.0, ember=0.12):
    """A tiny charcoal crackle: a few sparse high pops (random polarity, under a millisecond)
    and a faint ember hiss."""
    n = ns(dur)
    y = np.zeros(n)
    times = np.sort(rng.uniform(0.0, dur * 0.7, pops))
    times[0] = 0.0
    for j, t in enumerate(times):
        L = ns(rng.uniform(0.0003, 0.0011))
        i = int(t * SR)
        k = min(L, n - i)
        g = (1.0 if j == 0 else min(math.exp(rng.normal(-0.5, 0.4)), 0.85)) * (1 if rng.uniform() < 0.5 else -1)
        y[i:i + k] += g * white(L, rng)[:k] * np.exp(-np.arange(k) / (L / 2.5))
    y = band(y, 1800.0, 5600.0, 2)
    y /= np.max(np.abs(y)) + 1e-12
    hissy = band(white(n, rng), 2600.0, 5600.0, 2) * np.sin(np.pi * np.arange(n) / n) ** 2
    return vel * (y + ember * hissy)


MEMBRANE = (1.0, 1.593, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501)


def hand_drum(rng, f0=200.0, vel=1.0, kind='dum', dur=None):
    """A small hand drum. kind 'dum' (the open low stroke: membrane modes, a slight pitch drop),
    'tek' (the rim: upper modes and a slap, short), 'ghost' (a soft finger)."""
    dur = dur or {'dum': 0.42, 'tek': 0.16, 'ghost': 0.12}[kind]
    n = ns(dur)
    t = np.arange(n) / SR
    drop = 1.0 + 0.035 * np.exp(-t / 0.025)
    amps = {'dum': (1.0, 0.55, 0.38, 0.3, 0.22, 0.16, 0.1, 0.08),
            'tek': (0.15, 0.35, 0.55, 0.6, 0.55, 0.45, 0.35, 0.3),
            'ghost': (0.3, 0.3, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05)}[kind]
    taus = {'dum': 0.13, 'tek': 0.05, 'ghost': 0.04}[kind]
    y = np.zeros(n)
    for j, (r, a) in enumerate(zip(MEMBRANE, amps)):
        tau = taus / (1.0 + 0.45 * j)
        y += a * np.sin(phase(f0 * r * drop, n) + rng.uniform(0, TAU)) * np.exp(-t / tau)
    y *= rcos_in(n, 0.8)
    slap_fc = {'dum': 1500.0, 'tek': 2700.0, 'ghost': 2000.0}[kind]
    slap_v = {'dum': 0.8, 'tek': 1.4, 'ghost': 0.8}[kind]
    slap = band(white(n, rng), slap_fc * 0.6, slap_fc * 1.8, 2) * decay(n, 0.3, 0.007)
    skin = band(white(n, rng), 700.0, 2400.0, 2) * decay(n, 0.5, taus * 0.25)       # the skin's buzz under the palm
    return vel * (y + slap_v * 2.0 * slap + 0.5 * skin) * rcos_out(n, 20.0)


def _reed_amp(f0):
    """Spectrum of the free reed: 1/k^0.65 under two nasal formants (650 and 1,500 Hz), odd
    harmonics a little stronger (a narrow reed slot)."""
    def amp(k, kf):
        form = 0.35 + 1.0 / (1.0 + ((kf - 650.0) / 260.0) ** 2) + 0.7 / (1.0 + ((kf - 1500.0) / 420.0) ** 2) \
            + 0.25 / (1.0 + ((kf - 2900.0) / 700.0) ** 2)
        odd = 1.25 if k % 2 else 1.0
        return form * odd / k ** 0.65
    return amp


def reed(f, dur, rng, attack=0.12, release=0.3, vib=0.004, vib_hz=4.6, breath=0.06, fmax=5200.0, swell=None, scoop=0.0):
    """A low free reed: additive with a formant spectrum, a chiff of breath at the start, a slow
    vibrato that grows in, and breath noise in the formant band. Peak about 1."""
    n = ns(dur)
    t = np.arange(n) / SR
    depth = vib * np.clip(t / 0.6, 0.0, 1.0)
    fr = f * (1.0 + depth * np.sin(TAU * vib_hz * t + rng.uniform(0, TAU)) + 0.0015 * flutter(rng, n, 1.5, 1.0) - 0.0015)
    if scoop:
        fr = fr * 2.0 ** (scoop / 1200.0 * np.exp(-t / 0.05))
    y = harmonics(fr, n, _reed_amp(f), fmax=fmax, ph_rng=rng)
    y /= (np.max(np.abs(y[:min(n, ns(0.3))])) + 1e-12)
    air = band(white(n, rng), 500.0, 2400.0, 2)
    chiff = band(white(n, rng), 900.0, 3500.0, 2) * decay(n, 1.0, 0.03)
    env = rcos_in(n, attack * 1000.0) * rcos_out(n, release * 1000.0)
    if swell is not None:
        env = env * swell
    return (y * env + breath * air * env + 0.25 * chiff) * 0.8


def bowed(f, dur, rng, attack=1.2, release=1.6, bright=1.0, fmax=4200.0):
    """A bowed pad voice: a saw-like additive spectrum with a soft tilt, bow noise, a slow vibrato,
    a slow swell. Several of these make the pad."""
    n = ns(dur)
    t = np.arange(n) / SR
    fr = f * (1.0 + 0.0025 * np.sin(TAU * rng.uniform(4.6, 5.4) * t + rng.uniform(0, TAU)) * np.clip(t / 1.0, 0, 1))
    cut = 1700.0 * bright

    def amp(k, kf):
        return (1.0 / k) / (1.0 + (kf / cut) ** 2)
    y = harmonics(fr, n, amp, fmax=fmax, ph_rng=rng)
    y /= np.max(np.abs(y)) + 1e-12
    bow = band(white(n, rng), 1200.0, 3600.0, 2) * flutter(rng, n, 8.0, 0.5)
    env = rcos_in(n, attack * 1000.0) * rcos_out(n, release * 1000.0) * flutter(rng, n, 0.4, 0.12)
    return (y + 0.035 * bow) * env


BELL_PARTIALS = ((0.5, 0.12, 1.9), (1.0, 1.0, 1.5), (1.19, 0.55, 1.1), (1.505, 0.5, 0.9), (2.0, 0.45, 0.8),
                 (2.52, 0.3, 0.55), (2.98, 0.3, 0.35), (4.07, 0.3, 0.18), (5.43, 0.25, 0.08))


def temple_bell(f, dur, rng, vel=1.0):
    """The one bell: a small struck bronze bell, minor-third partial and a hum, with a soft
    mallet (felt, 2 ms) and a slow beat between two close modes."""
    n = ns(dur)
    parts = []
    for r, a, tau in BELL_PARTIALS:
        parts.append((f * r, a, tau, 2.0, rng.uniform(0, TAU)))
        parts.append((f * r * 1.0025, a * 0.45, tau * 0.9, 2.0, rng.uniform(0, TAU)))      # the beat
    y = modal(parts, n)
    strike = bandpass(white(n, rng), 2400.0, 1.0) * decay(n, 0.3, 0.004)
    return vel * (y / (np.max(np.abs(y)) + 1e-12) + 0.6 * strike)


def wind(rng, dur, fc_pts, q=0.6, env=None):
    """Wind through the street: low-mid noise with a slowly moving band and gusts."""
    n = ns(dur)
    fc = path_env(fc_pts, n, log=True)
    y = svf(colored(n, rng, -3.0), fc, q, 'bp') * flutter(rng, n, 1.8, 0.45)
    if env is None:
        env = np.sin(np.pi * np.arange(n) / n) ** 2
    return y * env


def flame(rng, dur=0.5, vel=1.0):
    """A flame catching: a 'fwump' (noise whose low-pass opens 300 -> 2,800 Hz in 80 ms), then a
    soft burning hiss with a few crackles."""
    n = ns(dur)
    t = np.arange(n) / SR
    fc = path_env([(0, 280.0), (0.08, 2800.0), (dur, 1600.0)], n, log=True)
    fw = svf(colored(n, rng, -1.5), fc, 0.7, 'lp')
    env = points([(0, 0), (0.05, 1.0), (0.12, 0.55), (dur, 0.0)], n) ** 1.3
    burn = band(white(n, rng), 1800.0, 5500.0, 2) * flutter(rng, n, 30.0, 0.6) * points([(0, 0), (0.08, 0.5), (dur, 0.0)], n)
    crack = 0.5 * band(grains(rng, dur, 28.0, (0.2, 0.8), 0.6, [(0, 0), (0.08, 1), (dur, 0.3)]), 2000.0, 5600.0, 2)
    return vel * (1.6 * fw * env + 0.45 * burn + crack * (t > 0.05))


def crowd(rng, dur, voices=10, sr_div=4, near=0.5, rate=1.0):
    """A distant crowd: `voices` talkers, each a noise source through two vowel formants that
    change every syllable, gated in syllables (0.1 to 0.3 s) and phrases (1 to 3 s), then the
    whole bed band-limited (250 to 2,200 Hz). Rendered at SR / sr_div and brought up by FFT.
    -> (left, right) at SR, each of length ns(dur)."""
    sr = SR // sr_div
    n = int(round(dur * sr))
    vowels = ((700, 1200), (500, 1700), (400, 2100), (600, 1000), (350, 900), (550, 1500))
    L = np.zeros(n)
    R = np.zeros(n)
    t_ax = np.arange(n) / sr
    for v in range(voices):
        vr = rng_for('crowd', v, int(rng.randint(1 << 30)))
        src = vr.standard_normal(n)
        # syllable plan
        f1 = np.zeros(n)
        f2 = np.zeros(n)
        gate = np.zeros(n)
        t = vr.uniform(0.0, 1.0)
        pitch_bias = vr.uniform(0.85, 1.25)
        while t < dur:
            phrase = vr.uniform(0.8, 3.0) / rate
            end = min(t + phrase, dur)
            while t < end:
                syl = vr.uniform(0.09, 0.28)
                a, b = int(t * sr), min(int((t + syl) * sr), n)
                if b > a:
                    vo = vowels[vr.randint(len(vowels))]
                    f1[a:b] = vo[0] * pitch_bias
                    f2[a:b] = vo[1] * pitch_bias
                    k = b - a
                    gate[a:b] = vr.uniform(0.5, 1.0) * np.sin(np.pi * np.arange(k) / k) ** 0.8
                t += syl + vr.uniform(0.0, 0.06)
            t = end + vr.uniform(0.4, 2.2) / rate
        # formant filtering in short blocks (static filters per block, crossfaded by the gate)
        out = np.zeros(n)
        blk = int(0.05 * sr)
        for s in range(0, n, blk):
            e = min(s + blk, n)
            if gate[s:e].max() <= 0.0:
                continue
            ff1, ff2 = max(f1[s:e].max(), 200.0), max(f2[s:e].max(), 600.0)
            seg = src[max(s - 64, 0):e]
            w0 = 2 * np.pi * ff1 / sr
            w1 = 2 * np.pi * ff2 / sr
            # two-pole resonators applied by FFT on the short block
            nfft = 1 << int(len(seg) + 256 - 1).bit_length()
            w = 2 * np.pi * np.arange(nfft // 2 + 1) / nfft
            z = np.exp(-1j * w)

            def reso(w_, r):
                return (1 - r) / (1 - 2 * r * np.cos(w_) * z + r * r * z * z)
            H = reso(w0, 0.93) + 0.6 * reso(w1, 0.95)
            y = np.fft.irfft(np.fft.rfft(seg, nfft) * H, nfft)[:len(seg)]
            out[s:e] += y[-(e - s):]
        out = out * gate
        pan = vr.uniform(-0.8, 0.8)
        gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
        lvl = vr.uniform(0.5, 1.0)
        L += lvl * gl * out
        R += lvl * gr * out

    def up(x):
        X = np.fft.rfft(x)
        m = ns(dur)
        Y = np.zeros(m // 2 + 1, complex)
        Y[:len(X)] = X
        y = np.fft.irfft(Y, m) * (m / len(x))
        sections = butter('hp', 250.0, 2) + butter('lp', 1600.0 + 1200.0 * near, 2)
        return filt(y, sections)[:m]
    L, R = up(L), up(R)
    pk = max(np.max(np.abs(L)), np.max(np.abs(R))) + 1e-12
    return L / pk, R / pk


# ===========================================================================
# the sounds of 6.2
# ===========================================================================

# --- merges: one steam puff per tier, growing in size and brightness (not up a scale) -------------

def lid_clink(rng, vel=1.0, weight=0.0):
    """A clay steamer lid knocked by the puff: a 'tok' of noise through two wide clay resonances
    (2.1 and 3.4 kHz, Q 3, 2 to 3 ms: a colour, not a note; the same lid for every tier) and a grit
    click. weight 0..1 adds the lower knock of a heavier lid seat (1.2 kHz)."""
    n = ns(0.025)
    y = 1.0 * bandpass(white(n, rng), 2150.0, 3.0) * decay(n, 0.1, 0.0028)
    y += 0.7 * bandpass(white(n, rng), 3400.0, 3.0) * decay(n, 0.1, 0.0020)
    y += 0.6 * weight * bandpass(white(n, rng), 1240.0, 2.5) * decay(n, 0.2, 0.0035)
    grit = band(white(n, rng), 2600.0, 5600.0, 2) * decay(n, 0.05, 0.0008)
    return vel * (2.2 * y + 0.8 * grit)


def pff(rng, dur, f1, f2, q1=2.2, q2=2.6, attack_ms=4.0, tau=0.03, bal=0.5, wander=0.06):
    """The breath of a puff: noise through two vowel-like resonances (f1 about 500 to 900 Hz, f2
    about 2.2 to 2.9 kHz) with a deep valley between them, not one flat band. bal is f2's share.
    The resonances wander a few per cent (turbulence), never enough to make a pitch."""
    n = ns(dur)
    t = np.arange(n) / SR
    src = white(n, rng)
    w = np.exp(wander * (flutter(rng, n, 30.0, 1.0) - 1.0))
    lo = svf(src, f1 * w, q1, 'bp')
    hi = svf(src, f2 * w, q2, 'bp')
    env = rcos_in(n, attack_ms) * np.exp(-t / tau) * rcos_out(n, min(20.0, dur * 300.0))
    return (2.2 * (1.0 - bal) * lo + 2.6 * bal * hi) * flutter(rng, n, 70.0, 0.35) * env


def sizzle(rng, dur, rate, lo=2400.0, hi=5200.0, start=1.0, sigma=0.5):
    """A sizzle: sparse crackle grains (water on a hot lid) thinning out over dur."""
    g = grains(rng, dur, rate, (0.15, 0.7), sigma, [(0, start), (dur, 0.0)])
    return band(g, lo, hi, 2)


def rattle_times(rng, dur, rate, count=None):
    """Onsets of a lid rattling at about `rate` a second, slowing as it settles (each gap 7 %
    longer, jittered +-8 %): the same schedule for every tier. With count, the first `count` onsets
    whatever dur is."""
    t, out, gap = 0.0, [], 1.0 / rate
    while (t < dur) if count is None else (len(out) < count):
        out.append(t)
        t += gap * rng.uniform(0.92, 1.08)
        gap *= 1.07
    return out


def rattle_gate(rng, n, rate, depth, dec=0.008, count=None):
    """An amplitude gate that opens at each rattle onset and closes in about 8 ms: steam let out in
    chuffs as the lid lifts and drops. depth 0..1 (1: the gate closes fully between chuffs)."""
    g = np.zeros(n)
    k = ns(0.03)
    shape = np.exp(-np.arange(k) / ns(dec)) * rcos_in(k, 2.0)
    for t in rattle_times(rng, n / SR, rate, count):
        i = int(t * SR)
        j = min(n, i + k)
        g[i:j] = np.maximum(g[i:j], shape[:j - i])
    return (1.0 - depth) + depth * g


MP = dict(clink=0.25, f1=400.0, f1g=1.165, f2=1700.0, f2g=1.105, q1=2.2, q2=2.6, bal0=0.06, bald=0.085, tau=0.6,
          wtab=(0.06, 0.1471, 0.66, 1.2687, 1.5797, 2.45, 3.15, 3.2), sz0=0.15, szdb=4.0, szg=1.22, szd0=0.04, szr=150.0,
          szrg=1.15, szs=0.3, rhz=18.0, rdec=0.012, szlo=2400.0, szhi=4800.0, drive=2.5)


def merge_puff(rng, k):
    """Tier k (1..8): a steamer lid lifted by the steam.

    A clay lid 'tok' at the attack; a two-formant 'pff' of breath and a low whoomph under it, let
    out in chuffs as the lid rattles on its seat (about 18 a second, slowing); then a sizzle tail of
    sparse crackle grains (water on the hot lid).

    Size with the tier: tier k lets the lid rattle k times (the same schedule for every tier, so
    the length grows 20 % or more a tier: 0.06 s to 0.5 s), the whoomph gets stronger, the sizzle
    longer, and the file is mastered 0.4 dB louder a tier. Brightness: the formants open (f1 and
    f2 rise about 10 % and 5 % a tier), the upper formant's share grows and the sizzle gets denser.
    Never up a scale: nothing has a pitch that moves from tier to tier (the lid is the same lid;
    the formants are wide noise bands that wander)."""
    P = MP
    j = k - 1
    on = rattle_times(rng_for('night', 'rattle'), 0.0, P['rhz'], k)
    d_pff = on[-1] + 0.045
    m = Mix()
    m.add(P['clink'] * (1.6 if k == 1 else 1.0) * lid_clink(rng_for('night', 'lid', k), 1.0, j / 7.0))      # tier 1: the lid is most of it
    m.add(pff(rng_for('night', 'pff'), d_pff, P['f1'] * P['f1g'] ** j, P['f2'] * P['f2g'] ** j, q1=P['q1'], q2=P['q2'],
              attack_ms=3.0, tau=P['tau'] * d_pff + 0.01, bal=P['bal0'] + P['bald'] * j), 0.003)
    nl = ns(d_pff)
    whoomph = lowpass(white(nl, rng_for('night', 'whoomph')), 260.0, 2) * decay(nl, 4.0, 0.5 * d_pff + 0.01)
    m.add(P['wtab'][j] * whoomph, 0.002)
    y = m.out()
    y = y * rattle_gate(rng_for('night', 'rattle'), len(y), P['rhz'], 1.0, P['rdec'], k)
    y = soft(y, P['drive'])
    out = Mix()
    out.add(y)
    d_s = P['szd0'] * P['szg'] ** j
    out.add(P['sz0'] * 10 ** (P['szdb'] * j / 20.0) * sizzle(rng_for('night', 'sizzle'), d_s, P['szr'] * P['szrg'] ** j, P['szlo'], P['szhi'], sigma=P['szs']),
            on[-1] + 0.02)
    return out.out()


def _merge(k):
    last = rattle_times(rng_for('night', 'rattle'), 0.0, MP['rhz'], k)[-1]

    @night_recipe('merge_%d' % k, length=last + 0.1 + 0.015 * (k - 1), loud_db=FREQUENT - 0.4 + 0.4 * (k - 1))
    def fn(c):
        c.accent(0.0)
        return merge_puff(c.rng, k)
    fn.__name__ = 'merge_%d' % k
    fn.__doc__ = 'Steam puff, tier %d of 8: size and brightness grow with the tier (merge_puff).' % k
    return fn


for _k in range(1, 9):
    globals()['merge_%d' % _k] = _merge(_k)


@night_recipe('lucky', length=0.46)
def lucky(c):
    """A puff like a tier-4 merge, then a second, brighter puff 90 ms later (the two formants high,
    900 Hz and 3 kHz, its lid rattling quicker, 26 a second) with a paper flutter (a crinkle stream
    gated at about 22 Hz) lifting through it."""
    m = Mix()
    m.add(merge_puff(c.sub('a'), 4))
    nb = ns(0.26)
    bright = pff(c.sub('b'), 0.26, 900.0, 3000.0, attack_ms=4.0, tau=0.09, bal=0.7)
    m.add(soft(bright * rattle_gate(c.sub('g'), nb, 26.0, 1.0, 0.01), 2.0), 0.09, 0.8)
    n = ns(0.3)
    gate = (0.5 + 0.5 * np.sign(np.sin(TAU * 22.0 * np.arange(n) / SR))) * np.sin(np.pi * np.arange(n) / n)
    m.add(0.5 * crinkle(c.sub('f'), 0.3, 900.0, 2200.0, 5600.0) * lowpass(gate, 200.0, 2), 0.1)
    c.accent(0.0, 0.09)
    return m.out()


# --- moving goods ---------------------------------------------------------------------------------

@night_recipe('move', length=0.14, loud_db=FREQUENT)
def move(c):
    """A short cloth rub: a good pushed across the stall cloth into a new cell. 130 ms of low cloth
    noise (360 to 1,150 Hz) with a 32-a-second stick-slip that slows as it settles."""
    c.accent(0.0)
    return cloth_rub(c.sub('x'), 0.13, 360.0, 1150.0, 32.0, 0.92)


@night_recipe('swap', length=0.2, loud_db=FREQUENT)
def swap(c):
    """Two cloth rubs that cross: a lower, slower one (350 to 1,000 Hz, 24 a second), and 70 ms
    later a lighter, quicker one (650 to 1,500 Hz, 36 a second)."""
    m = Mix()
    m.add(cloth_rub(c.sub('a'), 0.11, 350.0, 1000.0, 24.0, 0.85))
    m.add(cloth_rub(c.sub('b'), 0.11, 650.0, 1500.0, 36.0, 0.8), 0.07, 0.8)
    c.accent(0.0, 0.07)
    return m.out()


@night_recipe('return', length=0.1, loud_db=FREQUENT)
def return_(c):
    """A dull paper tap (the good goes back where it was; meant also for every button press, through
    the shared ui_tap: requested of soundKeys.ts): a fingertip on a paper ticket. A soft low pat (noise 300 to 1,100 Hz, 14 ms) and,
    12 ms later, a few fibre grains of the paper giving under it. Nothing above 3 kHz to speak of."""
    c.accent(0.0)
    m = Mix()
    n = ns(0.07)
    m.add(2.0 * band(colored(n, c.rng, -1.0), 300.0, 1100.0, 2) * decay(n, 1.5, 0.014))
    m.add(0.35 * band(grains(c.sub('g'), 0.03, 700.0, (0.1, 0.5), 0.5, [(0, 1.0), (0.03, 0.0)]), 900.0, 2800.0, 2), 0.012)
    return m.out()


@night_recipe('drop', length=0.15, loud_db=QUIET)
def drop(c):
    """A tiny charcoal crackle as the gear drops a good: five sparse pops in 100 ms over a faint
    ember hiss. Quiet (tier -4, catalogue volume 0.22): it plays every 5 s per stall, for an hour."""
    c.accent(0.0)
    return charcoal(c.rng, 0.14, pops=5, vel=1.0, ember=0.1)


# --- tickets and coins ------------------------------------------------------------------------------

@night_recipe('line_fill', length=0.06, loud_db=FREQUENT)
def line_fill(c):
    """A paper tick: one line of the ticket is ticked off (a pen tick and the paper's tiny flick)."""
    m = Mix()
    m.add(paper_tick(c.sub('t'), 1.0, bright=1.15))
    m.add(0.3 * band(grains(c.sub('flick'), 0.035, 900.0, (0.08, 0.3), 0.5, [(0, 1.0), (0.035, 0.0)]), 2500.0, 5200.0, 2), 0.006)
    c.accent(0.0)
    return m.out()


def paper_fold(rng, dur=0.3, vel=1.0):
    """A ticket folding: a slide down the sheet, a crease crinkle in the middle and a soft settle."""
    m = Mix()
    m.add(paper_slide(rng, dur, [(0, 2600.0), (dur * 0.5, 1500.0), (dur, 1100.0)], q=1.0,
                      env=points([(0, 0.0), (dur * 0.15, 1.0), (dur * 0.55, 0.6), (dur, 0.0)], ns(dur))), 0.0, 0.8)
    m.add(0.9 * crinkle(rng, 0.06, 1400.0, 1800.0, 6000.0, density=[(0, 1), (0.06, 0.1)]), dur * 0.42)
    m.add(0.4 * crinkle(rng, 0.05, 700.0, 1500.0, 5000.0, density=[(0, 0.3), (0.05, 0.0)]), dur * 0.85)
    return vel * m.out()


@night_recipe('ticket_filled', length=0.5, loud_db=LOUD)
def ticket_filled(c):
    """The money moment, with no bell and no register: a felt stamp (FILLED) at 0, then the ticket
    folds into a lantern (a paper fold from 120 ms)."""
    m = Mix()
    m.add(felt_stamp(c.sub('stamp'), 1.0, 1.25))
    m.add(paper_fold(c.sub('fold'), 0.32, 0.75), 0.12)
    c.accent(0.0, 0.12)
    return m.out()


@night_recipe('coins', length=0.4, loud_db=FREQUENT)
def coins(c):
    """Clay coins into a cloth pouch: five fired-clay clicks in about 180 ms (each a damped 'tok'
    of its own colour, 1.7 to 3.1 kHz), then the pouch closes with a soft cloth thump."""
    m = Mix()
    rng = c.rng
    times = [0.0, 0.035, 0.07, 0.12, 0.175]
    for j, t in enumerate(times):
        m.add(clay_click(rng, rng.uniform(1700.0, 3100.0), (1.0, 0.7, 0.85, 0.6, 0.5)[j]), t + rng.uniform(0, 0.006))
    m.add(0.9 * cloth_rub(c.sub('pouch'), 0.16, 600.0, 1300.0, 28.0, 0.8), 0.16)
    m.add(0.5 * felt_stamp(c.sub('thump'), 1.0, 0.7), 0.2)
    c.accent(0.0)
    return m.out()


# --- the basket -------------------------------------------------------------------------------------

def basket_rustle(rng, dur=0.3):
    """A woven basket taking a good: straw crinkling in clumps (three clusters of long, low grains,
    600 to 2,800 Hz), the creak of the weave at each clump (a short resonant noise burst at 600 to
    1,000 Hz, Q 6) and the cloth lining rubbed under it (a stick-slip rub, 400 to 1,100 Hz)."""
    m = Mix()
    for t, d, v in ((0.0, 0.05, 0.8), (0.1, 0.05, 1.0), (0.2, 0.05, 0.6)):
        m.add(v * crinkle(rng, d, 900.0, 600.0, 2800.0, density=[(0, 1.0), (d, 0.1)], sigma=0.6, glen_ms=(0.6, 2.2)), t)
        nc = ns(0.045)
        m.add(1.0 * v * bandpass(white(nc, rng), rng.uniform(600.0, 1000.0), 6.0) * decay(nc, 1.0, 0.012), t + 0.01)
    m.add(0.35 * cloth_rub(rng, dur, 400.0, 1100.0, 22.0, 0.9))
    return m.out()


@night_recipe('basket_sell', length=0.32)
def basket_sell(c):
    """A basket rustle (the good goes in), opening with a soft cloth touch at t = 0."""
    m = Mix()
    m.add(basket_rustle(c.rng, 0.3))
    m.add(0.6 * cloth_flap(c.sub('t'), 1.0, 1100.0))
    c.accent(0.0)
    return m.out()


@night_recipe('undo', length=0.32)
def undo(c):
    """Its reverse: the same rustle played backwards (the good comes out), with a paper tick at
    t = 0 so the haptic has something to land on, and a little lift at the end."""
    m = Mix()
    r = basket_rustle(rng_for('night', 'basket_sell'), 0.3)[::-1].copy()
    m.add(r * rcos_in(len(r), 15.0))
    m.add(0.7 * paper_tick(c.sub('t'), 1.0, bright=0.9))
    c.accent(0.0)
    return m.out()


# --- purchases ----------------------------------------------------------------------------------------

@night_recipe('shutter_open', length=0.66)
def shutter_open(c):
    """A cane shutter rolled up: the cane slats catch on the roller in a stick-slip (a dull,
    low knock of noise every 45 to 80 ms, uneven, 400 to 1,500 Hz, no ring), the rolled cane
    rubbing between them, and a felt stop at the top."""
    m = Mix()
    rng = c.rng
    gaps = [0.07, 0.058, 0.05, 0.046, 0.05, 0.056, 0.064, 0.078]
    t = 0.0
    times = [0.0]
    for g in gaps:
        t += g * rng.uniform(0.9, 1.1)
        times.append(t)
    for j, tt in enumerate(times):
        nn = ns(0.03)
        knock = band(colored(nn, rng, -1.0), 400.0, 1500.0, 2) * decay(nn, 0.5, 0.006)
        grit = band(white(nn, rng), 1800.0, 3600.0, 2) * decay(nn, 0.2, 0.0015)
        m.add((1.0 - 0.05 * j) * (1.5 * knock + 0.5 * grit), tt)
    roll = times[-1] + 0.03
    m.add(0.5 * cloth_rub(c.sub('roll'), roll, 500.0, 1300.0, 70.0, 0.6,
                          env=points([(0, 0.0), (0.05, 1.0), (roll * 0.7, 0.8), (roll, 0.0)], ns(roll)), accel=0.0))
    m.add(0.9 * felt_stamp(c.sub('stop'), 1.0, 0.8), times[-1] + 0.05)
    c.accent(0.0, times[-1] + 0.05)
    return m.out()


@night_recipe('stall_open', length=0.6)
def stall_open(c):
    """An awning flapping open: three cloth snaps (the last the biggest) and the cloth settling
    in the breeze."""
    m = Mix()
    for t, v, fc in ((0.0, 0.7, 1100.0), (0.09, 0.8, 950.0), (0.2, 1.0, 800.0)):
        m.add(cloth_flap(c.sub('f%d' % int(t * 100)), v, fc), t)
    m.add(0.7 * cloth_rub(c.sub('settle'), 0.36, 700.0, 1400.0, 20.0, 0.75,
                          env=points([(0, 0.0), (0.05, 1.0), (0.36, 0.0)], ns(0.36))), 0.22)
    c.accent(0.0, 0.2)
    return m.out()


@night_recipe('upgrade', length=0.16, loud_db=FREQUENT)
def upgrade(c):
    """A steamer coming to the boil: the two-formant steam breath with its formants rising (f1 500
    -> 1,000 Hz, f2 1.9 -> 3.2 kHz over 110 ms) while the lid begins to rattle faster (a chuff gate
    speeding from 14 to 40 a second), then a short sizzle. It rises without a swept band and stays a
    row of separate boils when level-ups come every 100 ms."""
    m = Mix()
    d = 0.11
    n = ns(d)
    t = np.arange(n) / SR
    src = white(n, c.rng)
    f1 = path_env([(0, 500.0), (d, 1000.0)], n, log=True)
    f2 = path_env([(0, 1900.0), (d, 3200.0)], n, log=True)
    y = 2.0 * svf(src, f1, 2.4, 'bp') + 2.4 * points([(0, 0.4), (d, 1.0)], n) * svf(src, f2, 2.8, 'bp')
    gate = np.zeros(n)
    k = ns(0.02)
    shape = rcos_in(k, 1.0) * np.exp(-np.arange(k) / ns(0.006))
    tt, rate = 0.0, 14.0
    while tt < d:
        i = int(tt * SR)
        j = min(n, i + k)
        gate[i:j] = np.maximum(gate[i:j], shape[:j - i])
        tt += 1.0 / rate
        rate = min(rate * 1.3, 32.0)
    env = points([(0, 0.5), (0.01, 0.7), (d * 0.85, 1.0), (d, 0.0)], n)
    m.add(soft(y * gate * env, 2.0))
    m.add(0.35 * sizzle(c.sub('s'), 0.05, 400.0), d - 0.01)
    c.accent(0.0)
    return m.out()


@night_recipe('minder_hire', length=0.55)
def minder_hire(c):
    """A cloth bow: the minder's apron rubbed down as they bow (a stick-slip rub that slows, 500 to
    1,400 Hz), a soft felt pat at the bottom, and a lighter, quicker rub back up."""
    m = Mix()
    m.add(cloth_rub(c.sub('down'), 0.24, 500.0, 1400.0, 26.0, 0.85,
                    env=points([(0, 0.5), (0.02, 1.0), (0.24, 0.1)], ns(0.24)), accel=0.5))
    m.add(0.7 * felt_stamp(c.sub('pat'), 1.0, 0.7), 0.24)
    m.add(0.6 * cloth_rub(c.sub('up'), 0.18, 650.0, 1500.0, 36.0, 0.8), 0.3)
    c.accent(0.0, 0.24)
    return m.out()


# --- book, lanterns, parade, gift ---------------------------------------------------------------------

@night_recipe('discovery', length=0.42)
def discovery(c):
    """A brush stroke (the name is written into the Ladder Book) and a stamp at 160 ms. The brush is
    its bristles dragging: fibre grains in a fixed band (1.2 to 3.4 kHz) chopped by a 55-a-second
    stick-slip, pressure swelling and lifting; no swept filter."""
    m = Mix()
    nb = ns(0.15)
    br = crinkle(c.sub('brush'), 0.15, 2600.0, 1200.0, 3400.0, sigma=0.4, glen_ms=(0.1, 0.5))
    br = br * stickslip(c.sub('slip'), nb, 55.0, 0.75) * points([(0, 0.4), (0.03, 1.0), (0.11, 0.8), (0.15, 0.0)], nb)
    m.add(1.4 * br)
    m.add(felt_stamp(c.sub('stamp'), 0.9, 0.9), 0.16)
    m.add(0.4 * paper_tick(c.sub('t'), 1.0), 0.16)
    c.accent(0.0, 0.16)
    return m.out()


@night_recipe('lantern_lit', length=0.9)
def lantern_lit(c):
    """A paper lantern lit: a paper rustle as it is opened, then a flame catching at 220 ms
    (the 'fwump') and burning softly."""
    m = Mix()
    m.add(0.55 * crinkle(c.sub('r'), 0.24, 900.0, 1600.0, 6000.0, density=[(0, 1.0), (0.24, 0.2)]))
    m.add(0.5 * paper_slide(c.sub('s'), 0.22, [(0, 1500.0), (0.22, 2600.0)]), 0.0)
    m.add(flame(c.sub('flame'), 0.62, 1.0), 0.22)
    c.accent(0.0, 0.22)
    return m.out()


@night_recipe('parade_arrive', length=1.55)
def parade_arrive(c):
    """A small hand drum roll as the paper dragon comes: strokes accelerating from 7 to 18 a
    second with a crescendo, closing on an open 'dum' and a rim 'tek'."""
    m = Mix()
    rng = c.rng
    t, rate = 0.0, 7.0
    j = 0
    while t < 1.05:
        v = 0.35 + 0.5 * (t / 1.05) ** 1.5
        m.add(hand_drum(rng, 330.0 * rng.uniform(0.98, 1.02), v * rng.uniform(0.9, 1.05), 'ghost' if j % 2 else 'tek'), t)
        t += 1.0 / rate
        rate = min(rate * 1.09, 18.0)
        j += 1
    m.add(hand_drum(rng, 230.0, 0.55, 'dum'), 1.1)
    m.add(hand_drum(rng, 330.0, 1.0, 'tek'), 1.1)
    m.add(hand_drum(rng, 330.0, 0.6, 'tek'), 1.28)
    c.accent(0.0, 1.1)
    return m.out()


@night_recipe('giftbox_open', length=0.72)
def giftbox_open(c):
    """A paper bag unfolding: a crisp first crease at 0, two slides as the sides open, and a
    last soft crinkle as it settles."""
    m = Mix()
    m.add(0.9 * crinkle(c.sub('a'), 0.07, 1500.0, 1800.0, 5600.0, density=[(0, 1), (0.07, 0.2)]))
    m.add(paper_slide(c.sub('b'), 0.2, [(0, 1300.0), (0.2, 2600.0)]), 0.08, 0.8)
    m.add(paper_slide(c.sub('c'), 0.22, [(0, 1700.0), (0.22, 3000.0)]), 0.28, 0.75)
    m.add(0.5 * crinkle(c.sub('d'), 0.16, 700.0, 1500.0, 5500.0, density=[(0, 0.8), (0.16, 0.0)]), 0.5)
    c.accent(0.0, 0.08, 0.28)
    return m.out()


@night_recipe('slot_reveal', length=0.1)
def slot_reveal(c):
    """One slot of the bag turned out: a felt pat as the thing lands, then a short paper crinkle
    (25 ms) over it. Short and low, so three in a row stay three."""
    m = Mix()
    m.add(0.9 * felt_stamp(c.sub('pat'), 1.0, 0.6))
    m.add(0.7 * crinkle(c.rng, 0.03, 2200.0, 1300.0, 4200.0, density=[(0, 1.0), (0.03, 0.2)], sigma=0.5), 0.018)
    c.accent(0.0)
    return m.out()


# --- the Festival and the season ----------------------------------------------------------------------

@night_recipe('festival_line', length=0.95)
def festival_line(c):
    """A low reed note: one Festival line lands. A single D3 reed that speaks at once with a breathy
    chiff, scoops up into pitch from 40 cents under, and gets a second breath push at 0.3 s
    ('hoo-oo'), with its octave faintly over it."""
    m = Mix()
    n = ns(0.9)
    push = points([(0, 0.75), (0.2, 0.6), (0.32, 1.0), (0.55, 0.85), (0.9, 0.6)], n)
    m.add(reed(c.hz('D3'), 0.9, c.sub('r'), attack=0.04, release=0.4, breath=0.1, swell=push, scoop=-40.0))
    m.add(0.18 * reed(c.hz('D4'), 0.9, c.sub('r8'), attack=0.2, release=0.45, breath=0.04, swell=push))
    m.add(0.35 * felt_stamp(c.sub('pat'), 1.0, 0.6))
    c.accent(0.0)
    return m.out()


@night_recipe('festival_done', length=2.3, loud_db=BIG)
def festival_done(c):
    """The Festival is filled: the game's one bell (struck at 0, on D5, ringing out) and a
    lantern swell under it (reeds on D and A and a bowed fifth rising, with a warm air glow)."""
    m = Mix()
    m.add(temple_bell(c.hz('D5'), 2.2, c.sub('bell'), 1.0))
    n = ns(2.1)
    sw = points([(0, 0.0), (0.7, 1.0), (1.3, 0.8), (2.1, 0.0)], n) ** 1.2
    m.add(0.35 * reed(c.hz('D3'), 2.1, c.sub('r1'), attack=0.4, release=0.8, swell=sw), 0.05)
    m.add(0.25 * reed(c.hz('A3'), 2.1, c.sub('r2'), attack=0.5, release=0.8, swell=sw), 0.05)
    m.add(0.3 * bowed(c.hz('D4'), 2.0, c.sub('b1'), attack=0.6, release=0.8, bright=1.4), 0.1)
    m.add(0.25 * bowed(c.hz('A4'), 2.0, c.sub('b2'), attack=0.7, release=0.8, bright=1.4), 0.1)
    m.add(0.2 * wind(c.sub('glow'), 2.0, [(0, 900.0), (1.0, 1800.0), (2.0, 1100.0)], q=0.8), 0.1)
    c.accent(0.0)
    return m.out()


@night_recipe('season_close', length=2.8, loud_db=BIG)
def season_close(c):
    """A reed swell and wind: the wind rises from t = 0, two reeds enter a fifth apart at 0.3 s and
    swell to a peak at 0.9 s, then everything thins into the wind."""
    m = Mix()
    m.add(0.8 * wind(c.sub('w'), 2.7, [(0, 500.0), (0.9, 1500.0), (2.7, 700.0)], q=0.7,
                     env=points([(0, 0.25), (0.05, 0.5), (0.9, 1.0), (2.7, 0.0)], ns(2.7))))
    m.add(0.35 * cloth_flap(c.sub('gust'), 1.0, 1200.0))
    n = ns(2.3)
    sw = points([(0, 0.2), (0.6, 1.0), (1.1, 0.7), (2.3, 0.0)], n) ** 1.3
    m.add(0.6 * reed(c.hz('G2'), 2.3, c.sub('r1'), attack=0.05, release=0.9, swell=sw), 0.3)
    m.add(0.45 * reed(c.hz('D3'), 2.3, c.sub('r2'), attack=0.08, release=0.9, swell=sw), 0.3)
    m.add(0.3 * reed(c.hz('G3'), 2.0, c.sub('r3'), attack=0.25, release=0.9, swell=sw[:ns(2.0)]), 0.9)
    m.add(0.4 * felt_stamp(c.sub('p'), 1.0, 0.8), 0.9)
    c.accent(0.0, 0.3, 0.9)
    return m.out()


# --- interface ---------------------------------------------------------------------------------------

def crinkle_burst(rng, dur, lo, hi, rate=1800.0, sigma=0.5):
    """One short burst of paper crinkle: grains that start dense and thin out over dur."""
    return crinkle(rng, dur, rate, lo, hi, density=[(0, 1.0), (dur, 0.05)], sigma=sigma, glen_ms=(0.1, 0.6))


@night_recipe('ui_open', length=0.21, loud_db=FREQUENT)
def ui_open(c):
    """A sheet unfolded from its fold: a crisp fold click at 0 with the loudest crinkle burst,
    then two softer, lower bursts at 55 and 115 ms as the sheet opens flat. No sweep; the energy
    is in the first 30 ms."""
    m = Mix()
    m.add(0.7 * paper_tick(c.sub('fold'), 1.0, 0.9))
    m.add(1.0 * crinkle_burst(c.sub('a'), 0.03, 1300.0, 5000.0))
    m.add(0.5 * crinkle_burst(c.sub('b'), 0.025, 900.0, 3200.0), 0.055)
    m.add(0.3 * crinkle_burst(c.sub('c'), 0.03, 700.0, 2400.0), 0.115)
    c.accent(0.0)
    return m.out()


@night_recipe('ui_close', length=0.19, loud_db=FREQUENT)
def ui_close(c):
    """The sheet folded away: a soft low crinkle as it is creased (0), a second at 50 ms, and the
    fold pressed shut at 95 ms (a felt pat and a dull click). The weight is at the end, the reverse
    of ui_open."""
    m = Mix()
    m.add(0.35 * crinkle_burst(c.sub('a'), 0.03, 700.0, 2600.0))
    m.add(0.5 * crinkle_burst(c.sub('b'), 0.025, 900.0, 3000.0), 0.05)
    m.add(0.8 * felt_stamp(c.sub('p'), 1.0, 0.55), 0.095)
    m.add(0.35 * paper_tick(c.sub('t'), 1.0, 0.6), 0.095)
    c.accent(0.0)
    return m.out()


@night_recipe('ui_denied', length=0.22)
def ui_denied(c):
    """A soft crumple: a scrap of paper squeezed in the hand, three dull clumps of long, low
    grains (600 to 2,600 Hz) at 0, 55 and 120 ms, each quieter, over a felt pat. Gentle, not a buzzer."""
    m = Mix()
    for t, v, d in ((0.0, 1.0, 0.045), (0.055, 0.7, 0.04), (0.12, 0.45, 0.04)):
        m.add(v * crinkle(c.sub('k%d' % int(t * 1000)), d, 1100.0, 600.0, 2600.0, density=[(0, 1.0), (d, 0.1)], sigma=0.5,
                          glen_ms=(0.8, 2.6)), t)
    m.add(0.6 * felt_stamp(c.sub('p'), 1.0, 0.5))
    c.accent(0.0)
    return m.out()


# ===========================================================================
# the event table (spec 6.2, in the shape of src/services/fx/catalog.merge.ts)
# key: (volume, minimum interval ms, haptic, brief, voices)
# ===========================================================================

EVENTS = {
    'merge': (0.5, 60, ['light'], 'a steamer lid lifted by a puff of steam: a clay tok, a two-formant pff let out in chuffs as the lid rattles (tier k rattles k times), a sizzle; grows in size and brightness with the tier, never up a scale; eight files, tier 1 to 8', 3),
    'lucky': (0.6, 120, ['light'], 'a second, brighter puff with a paper flutter', 2),
    'move': (0.35, 80, None, 'a cloth rub (low cloth noise with a stick-slip)', 2),
    'swap': (0.38, 80, None, 'two cloth rubs crossing', 2),
    'return': (0.35, 80, None, 'a dull paper tap (meant for ui_tap too: every button press)', 2),
    'drop': (0.22, 300, None, 'a tiny charcoal crackle, quiet', 2),
    'line_fill': (0.45, 60, ['light'], 'a paper tick', 2),
    'ticket_filled': (0.7, 120, ['medium'], 'a felt stamp and a paper fold', 2),
    'coins': (0.45, 150, None, 'clay coins into a cloth pouch', 2),
    'basket_sell': (0.5, 150, ['light'], 'a basket rustle', 1),
    'undo': (0.5, 150, ['light'], 'the basket rustle reversed', 1),
    'shutter_open': (0.6, None, ['medium'], 'a cane shutter rolling up', 1),
    'stall_open': (0.7, None, ['medium'], 'an awning flapping open', 1),
    'upgrade': (0.5, 100, ['light'], 'a rising steam hiss: a steamer coming to the boil, its lid rattling faster', 3),
    'minder_hire': (0.6, None, ['medium'], 'a cloth bow', 1),
    'discovery': (0.6, 200, ['light', 160, 'success'], 'a brush stroke and a stamp', 1),
    'lantern_lit': (0.65, None, ['light', 220, 'success'], 'a paper rustle and a flame catching', 1),
    'parade_arrive': (0.6, None, None, 'a small hand drum roll', 1),
    'giftbox_open': (0.6, None, ['light'], 'paper unfolding', 1),
    'slot_reveal': (0.55, 120, ['light'], 'a crinkle per slot (a felt pat and a short crinkle)', 3),
    'festival_line': (0.65, None, ['medium'], 'a low reed note', 1),
    'festival_done': (0.8, None, ['success'], 'the one bell and a lantern swell', 1),
    'season_close': (0.85, None, ['light', 300, 'medium', 600, 'success'], 'a reed swell and wind (3 pulses)', 1),
    'ui_open': (0.4, None, None, 'a sheet unfolded: a fold click and three crinkle bursts, the first the loudest', 1),
    'ui_close': (0.35, None, None, 'the sheet folded away: two soft crinkles and the fold pressed shut', 1),
    'ui_denied': (0.5, 300, ['light'], 'a soft crumple', 1),
    'music_main': (0.35, None, None, 'the spring loop "Lantern Dusk": 90 s at 72 bpm, D dorian; low reed drone, bowed pad, hand drum, a distant crowd', 1),
    'music_summer': (0.35, None, None, 'the summer loop "Firefly Lane": 90 s at 72 bpm, G lydian; reed drone and reed song, bowed pad, a triplet hand drum, a nearer crowd, fireflies', 1),
}

FILES = {'merge': 8}                     # keys with several files: <key>_1 .. <key>_n (pick: ladder, the tier)
MUSIC_KEYS = ('music_main', 'music_summer')


def file_stems(key):
    n = FILES.get(key, 1)
    return [key] if n == 1 else ['%s_%d' % (key, i) for i in range(1, n + 1)]


def key_of(stem):
    """The catalogue key a file belongs to (merge_3 -> merge)."""
    head, _, tail = stem.rpartition('_')
    return head if tail.isdigit() and head in FILES else stem


# The sounds that repeat fast (spec 6.2: merges, drop, move, line_fill, coins; also the other two
# moves, the upgrade and the gift slots), with the interval they can repeat at in play (the
# catalogue's minimum interval), measured by render_night.py --rows.
ROW_KEYS = {
    'merge_1': 60, 'merge_2': 60, 'merge_3': 60, 'merge_4': 60, 'merge_5': 60, 'merge_6': 60, 'merge_7': 60,
    'merge_8': 60, 'lucky': 120, 'drop': 300, 'move': 80, 'swap': 80, 'return': 80, 'line_fill': 60, 'coins': 150,
    'upgrade': 100, 'slot_reveal': 120,
}
