"""Sound packs: a pack is a key plus a set of instruments.

The recipes in recipes.py say *what* happens (which notes, envelopes, layers);
a pack says *what it is played on*. Every pack implements the same instrument
methods, so one recipe renders in any pack.

  warm   C major / A minor pentatonic. Marimba and kalimba plucks, small
         bells, wood knocks, soft filtered-noise whooshes. The default pack.
  synth  A major / F# minor pentatonic. FM glass, pure sine pings, pulse
         blips, resonant sweeps. Clean and sci-fi.

All instruments return mono float arrays that peak around `vel`.
"""
from __future__ import annotations

import math

import numpy as np

from dsp import (SR, TAU, Mix, add_reverb, bandpass, blosc, bq, butter, cents, colored, filt, fm, glide,
                 glide_exp, harmonics, highpass, lowpass, midi, modal, mtof, ns, onepole, perc, phase, points,
                 rcos_in, rcos_out, reverb_ir, sine, svf, white)

PENTA = (0, 2, 4, 7, 9)   # major pentatonic, in semitones above the key note


class Pack:
    name = ''
    key = ''
    transpose = 0          # semitones away from the reference key the recipes are written in (C)
    blurb = ''

    def __init__(self):
        self._irs = {}

    # ---- pitch helpers: recipes always name notes in C ---------------------
    def hz(self, note, detune_cents: float = 0.0) -> float:
        return mtof(midi(note) + self.transpose + detune_cents / 100.0)

    def penta(self, base: str, k: int = 0) -> float:
        """The k-th pentatonic step above (or below) `base`, itself a scale note."""
        m = int(midi(base))
        j = PENTA.index(m % 12) + k
        return mtof(m - m % 12 + 12 * (j // 5) + PENTA[j % 5] + self.transpose)

    def scale(self, lo: str, hi: str):
        """All pentatonic pitches between two note names (inclusive)."""
        out = []
        for m in range(int(midi(lo)), int(midi(hi)) + 1):
            if m % 12 in PENTA:
                out.append(mtof(m + self.transpose))
        return out

    # ---- reverb --------------------------------------------------------
    REVERBS = {'room': dict(t60=0.45, size=0.8, damp=0.3), 'hall': dict(t60=1.0, size=1.25, damp=0.25)}

    def verb(self, x, mix: float = 0.15, tail: float = 0.35, space: str = 'room'):
        if space not in self._irs:
            self._irs[space] = reverb_ir(**self.REVERBS[space])
        return add_reverb(x, self._irs[space], mix, tail)


# ===========================================================================
# warm: wood, tines and small bells
# ===========================================================================

# (frequency ratio, level, decay relative to the fundamental). The upper
# partials are deliberately *in*harmonic (that is what makes metal sound like
# metal) but nudged onto scale tones, so bells stay sweet over the pack's key.
BELLS = {
    'hand':  ((1.0, 1.0, 1.0), (2.0, 0.10, 0.60), (3.0, 0.30, 0.45), (4.16, 0.10, 0.25), (5.43, 0.05, 0.16)),
    'desk':  ((1.0, 1.0, 1.0), (2.672, 0.50, 0.68), (3.364, 0.20, 0.45), (4.49, 0.12, 0.22)),
    'glock': ((1.0, 1.0, 1.0), (2.756, 0.28, 0.35), (5.404, 0.10, 0.16), (8.933, 0.04, 0.08)),
    'glass': ((1.0, 1.0, 1.0), (2.32, 0.24, 0.50), (4.25, 0.11, 0.25), (6.63, 0.05, 0.12)),
    'tiny':  ((1.0, 1.0, 1.0), (2.52, 0.34, 0.60), (3.364, 0.16, 0.40)),
}

# vowel -> formants (centre Hz, bandwidth Hz, level)
VOWELS = {
    'o': ((470, 90, 1.0), (860, 110, 0.55), (2500, 180, 0.10)),
    'a': ((730, 110, 1.0), (1150, 130, 0.60), (2600, 190, 0.16)),
    'e': ((520, 90, 1.0), (1750, 140, 0.50), (2550, 190, 0.18)),
    'i': ((380, 100, 1.0), (2100, 220, 0.75), (2900, 260, 0.35)),
}


def _formants(vowel):
    F = VOWELS[vowel]

    def gain(kf):
        return sum(g / (1.0 + ((kf - fc) / bw) ** 2) for fc, bw, g in F)
    return gain


class WarmPack(Pack):
    name = 'warm'
    key = 'C major / A minor pentatonic'
    transpose = 0
    blurb = 'marimba and kalimba plucks, small bells, wood knocks, soft noise whooshes'

    # ---- plucks ----------------------------------------------------------
    def pluck(self, f, vel=1.0, ring=0.3, bright=1.0, rng=None, dur=None):
        """Marimba bar: fundamental, the tuned double octave (4f) and a short
        third mode near 9.3f, struck with a soft mallet (a few ms of rise and
        a little band-passed 'thock')."""
        tau = 0.40 * (261.6 / f) ** 0.7 * (0.22 + 0.78 * ring)
        n = ns(dur if dur else min(max(tau * 7.0, 0.07), 2.5))
        parts = [
            (f, 1.0, tau, 3.2),
            (f * 3.98, 0.20 * bright * vel ** 0.5, tau * 0.32, 1.6),
            (f * 9.3, 0.07 * bright * vel, max(tau * 0.10, 0.006), 1.0),
        ]
        y = modal(parts, n)
        nt = min(ns(0.03), n)
        th = bandpass(white(nt, rng), min(max(1.7 * f, 800.0), 2400.0), 0.9) * perc(nt, 1.0, 0.0045)
        y[:nt] += 0.10 * bright * th
        return vel * y

    def tine(self, f, vel=1.0, ring=0.6, bright=1.0, rng=None, dur=None):
        """Kalimba tine: a pure fundamental, faint body harmonics and the
        short inharmonic 'plink' near 5.9f, with a tiny nail tick."""
        tau = 0.36 * (523.3 / f) ** 0.5 * (0.2 + 0.8 * ring)
        n = ns(dur if dur else min(max(tau * 7.0, 0.07), 2.5))
        parts = [
            (f, 1.0, tau, 2.4),
            (2.0 * f, 0.07, tau * 0.5, 2.0),
            (3.0 * f, 0.03, tau * 0.35, 2.0),
            (5.93 * f, 0.20 * bright, 0.030, 1.0),
        ]
        y = modal(parts, n)
        nt = min(ns(0.02), n)
        y[:nt] += 0.05 * bright * bandpass(white(nt, rng), 3200.0, 1.0) * perc(nt, 0.8, 0.002)
        return vel * y

    # ---- bells ------------------------------------------------------------
    def bell(self, f, vel=1.0, ring=1.0, kind='hand', bright=1.0, hard=0.5, rng=None, dur=None, tau=None):
        """Small struck bell, additive. Every partial is a slightly split pair
        (real bells are never perfectly round), which gives the slow shimmer;
        a 2 ms noise tick is the clapper."""
        tau = tau if tau else 0.42 * (1000.0 / f) ** 0.55 * ring
        n = ns(dur if dur else min(max(tau * 7.0, 0.08), 3.0))
        parts = []
        for r, a, d in BELLS[kind]:
            amp = a * (bright if r > 1.0 else 1.0)
            split = rng.uniform(0.0012, 0.0032)
            ph = rng.uniform(0, TAU)
            parts.append((f * r * (1 - split / 2), amp * 0.62, tau * d, 1.0))
            parts.append((f * r * (1 + split / 2), amp * 0.38, tau * d * 0.92, 1.0, ph))
        y = modal(parts, n)
        nt = min(ns(0.02), n)
        tick = bandpass(white(nt, rng), min(3.2 * f, 5200.0), 0.8) * perc(nt, 0.7, 0.0018)
        y[:nt] += 0.22 * hard * bright * tick
        return vel * y

    def chime(self, f, vel=1.0, ring=1.0, bright=1.0, rng=None, dur=None):
        """Soft chime bar (glockenspiel partials, felt mallet)."""
        return self.bell(f, vel, ring * 0.8, 'glock', bright * 0.8, hard=0.2, rng=rng, dur=dur)

    def glass(self, f, vel=1.0, ring=1.0, bright=1.0, rng=None, dur=None):
        return self.bell(f, vel, ring * 0.7, 'glass', bright, hard=0.6, rng=rng, dur=dur)

    def desk_bell(self, f, vel=1.0, ring_tau=0.125, rng=None):
        """The counter bell: plunger clack, bright strike, 0.6 s of warbling ring."""
        m = Mix()
        m.add(self.bell(f, 1.0, kind='desk', bright=1.0, hard=1.0, rng=rng, tau=ring_tau))
        m.add(self.knock(f * 0.27, 0.22, tau=0.012, tone=0.6, rng=rng))
        return vel * m.out()

    def coin(self, f, vel=1.0, rng=None, shift_ms=0.0, ring=1.0):
        """Coin 'tink': the first modes of a small metal disc (1 : 1.78 : 2.38
        : 3.9 : 4.1), short. `shift_ms` delays the upper pair, as when a coin
        lands on its edge a hair late."""
        tau = 0.040 * ring
        low = [(f, 0.55, tau * 1.15, 0.8)]
        high = [(f * 1.782, 1.0, tau, 0.6), (f * 2.378, 0.70, tau * 0.8, 0.6),
                (f * 3.91, 0.22, tau * 0.35, 0.5), (f * 4.11, 0.18, tau * 0.30, 0.5)]
        n = ns(tau * 7.5)
        m = Mix()
        m.add(modal(_split(low, rng), n))
        m.add(modal(_split(high, rng), n), at=shift_ms / 1000.0)
        nt = ns(0.012)
        m.add(0.07 * bandpass(white(nt, rng), 4300.0, 1.0) * perc(nt, 0.6, 0.0012))
        return vel * m.out()

    # ---- wood and thumps -----------------------------------------------------
    def knock(self, f, vel=1.0, tau=0.03, tone=1.0, rng=None):
        """Wood knock: a few quickly dying block modes plus a noise 'tk'."""
        n = ns(tau * 7.0 + 0.01)
        parts = [(f, 1.0, tau, 1.5), (f * 2.41, 0.42 * tone, tau * 0.55, 1.0),
                 (f * 4.07, 0.18 * tone, tau * 0.30, 0.8), (f * 6.2, 0.07 * tone, tau * 0.20, 0.6)]
        y = modal(parts, n)
        nt = min(ns(0.025), n)
        y[:nt] += 0.25 * tone * bandpass(white(nt, rng), min(max(3.0 * f, 500.0), 3000.0), 0.8) * perc(nt, 0.8, 0.004)
        return vel * y

    def thump(self, vel=1.0, f0=150.0, f1=58.0, tau=0.10, drop=0.025, body=0.5, rng=None):
        """Low thump: a sine that falls from f0 to f1, with enough 2nd and 3rd
        harmonic that a phone speaker still says something."""
        n = ns(tau * 6.5 + 0.02)
        t = np.arange(n) / SR
        ph = phase(f1 + (f0 - f1) * np.exp(-t / drop), n)
        y = np.sin(ph) * perc(n, 3.0, tau)
        y += 0.30 * body * np.sin(2 * ph) * perc(n, 2.0, tau * 0.5)
        y += 0.12 * body * np.sin(3 * ph) * perc(n, 2.0, tau * 0.3)
        y += 0.30 * body * lowpass(white(n, rng), 520.0, 2) * perc(n, 2.0, 0.02)
        return vel * y

    def click(self, vel=1.0, f=1300.0, rng=None):
        """Tiny soft wooden tick."""
        return self.knock(f, vel, tau=0.004, tone=0.5, rng=rng)

    def pop(self, f0, f1, vel=1.0, tau=0.010, drop=0.012, puff=0.15, hold=0.0, rng=None):
        """Soft pop: a sine bubble whose pitch slides from f0 to f1 (down, or up).
        `hold` keeps it full for a moment before the decay: rounder, less of a click."""
        n = ns(hold + tau * 6.0 + 0.012)
        fr = glide_exp(f0, f1, n, drop)
        ph = phase(fr, n)
        t = np.arange(n) / SR
        env = rcos_in(n, 3.0) * np.exp(-np.maximum(t - hold, 0.0) / tau)
        y = (np.sin(ph) + 0.12 * np.sin(2 * ph)) * env
        y += puff * lowpass(white(n, rng), 1800.0, 2) * perc(n, 1.5, 0.004)
        return vel * y

    def bloop(self, f0, f1, dur=0.2, rise=0.06, tau=0.05, vel=1.0, rng=None):
        """Rounded rising 'bloop'."""
        n = ns(dur)
        ph = phase(glide_exp(f0, f1, n, rise / 3.0), n)
        y = (np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)) * perc(n, 4.0, tau)
        return vel * y

    # ---- air -----------------------------------------------------------------
    def whoosh(self, dur, path, q=1.1, env=None, air=0.3, rng=None, vel=1.0):
        """Soft whoosh: noise through a band-pass whose centre follows `path`
        (break-points in seconds/Hz, moved in pitch), then a low-pass an
        octave above the centre so the top stays soft. `air` lets a thinner
        band through above it."""
        n = ns(dur)
        fc = np.exp(points([(t, math.log(f)) for t, f in path], n))
        y = svf(svf(white(n, rng), fc, q, 'bp'), np.minimum(fc * 2.0, 6000.0), 0.7, 'lp')
        if air:
            y += 0.5 * air * svf(white(n, rng), np.minimum(fc * 2.6, 5600.0), q * 1.5, 'bp')
        y = lowpass(y, 6000.0, 4)
        if env is None:
            env = np.sin(np.pi * np.arange(n) / n) ** 2
        return vel * 2.6 * y * env

    def shaker(self, vel=1.0, fc=4200.0, q=1.1, attack_ms=4.0, tau=0.02, rng=None):
        n = ns(tau * 6.0 + attack_ms / 1000.0)
        return vel * 2.0 * lowpass(bandpass(white(n, rng), fc, q), 6500.0, 4) * perc(n, attack_ms, tau)

    def paper(self, dur=0.09, vel=1.0, rng=None):
        """Papery flick: bright noise that sweeps up and is cut short, with a
        fast random flutter so it reads as a card edge and not as steam."""
        n = ns(dur)
        fc = glide(1500.0, 5200.0, n, 0.7)
        y = svf(white(n, rng), fc, 0.9, 'bp')
        flutter = 1.0 + 0.5 * lowpass(white(n, rng), 320.0, 2) * 6.0
        env = points([(0, 0), (dur * 0.55, 0.55), (dur * 0.8, 1.0), (dur, 0)], n) ** 1.6
        return vel * 2.2 * lowpass(y * np.clip(flutter, 0.2, 2.0), 5800.0, 4) * env

    def creak(self, dur=0.2, vel=1.0, rng=None):
        """Wood creak: stick-slip pulses that speed up, ringing three plank resonances."""
        n = ns(dur)
        rate = glide(48.0, 135.0, n, 1.4) * (1.0 + 0.10 * lowpass(white(n, rng), 60.0, 2) * 8.0)
        src = blosc(rate, n, 'pulse', fmax=3200.0, pw=0.1)
        y = bandpass(src, 640.0, 5.0) + 0.7 * bandpass(src, 1370.0, 6.0) + 0.35 * bandpass(src, 2250.0, 5.0)
        env = points([(0, 0), (0.02, 0.5), (dur * 0.8, 1.0), (dur, 0)], n)
        return vel * 1.6 * y * env

    def riser(self, dur, f0, f1, vel=1.0, rng=None):
        """Tonal riser: a soft additive saw sliding up, swelling as it goes."""
        n = ns(dur)
        fr = glide(f0, f1, n, 1.3)
        y = np.zeros(n)
        for det in (-6.0, 6.0):
            y += harmonics(cents(fr, det), n, lambda k, kf: k ** -1.4, fmax=4500.0, ph_rng=rng)
        u = np.arange(n) / max(n - 1, 1)
        return vel * 0.4 * y * u ** 1.8 * rcos_out(n, 25.0)

    def clink(self, f, vel=1.0, tau=0.018, rng=None):
        """Ceramic clink: plate modes, very short."""
        n = ns(tau * 7.0 + 0.005)
        parts = [(f, 1.0, tau, 0.6), (f * 1.335, 0.7, tau * 0.8, 0.6), (f * 2.245, 0.5, tau * 0.5, 0.5),
                 (f * 2.94, 0.25, tau * 0.35, 0.5)]
        y = modal(parts, n)
        nt = min(ns(0.01), n)
        y[:nt] += 0.12 * bandpass(white(nt, rng), 3600.0, 0.9) * perc(nt, 0.5, 0.001)
        return vel * y

    def chirp(self, f0, f1, dur=0.06, vel=1.0, rng=None):
        """Cute voiced chirp: a rounded tone sliding from f0 to f1."""
        n = ns(dur)
        ph = phase(glide(f0, f1, n, 0.8), n)
        y = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.07 * np.sin(3 * ph)
        return vel * y * rcos_in(n, 6.0) * rcos_out(n, min(18.0, dur * 400.0))

    # ---- sustained voices ---------------------------------------------------
    def pad(self, freqs, dur, attack=0.05, release=0.2, bright=1.0, vel=1.0, rng=None):
        """Warm reed-organ pad: soft harmonics, two voices a few cents apart."""
        n = ns(dur)
        y = np.zeros(n)
        for f in freqs:
            for det in (-4.0, 5.0):
                y += harmonics(cents(f, det), n, lambda k, kf: k ** -(2.3 - 0.6 * bright), fmax=3600.0, ph_rng=rng)
        return vel * 0.5 * y / max(len(freqs), 1) ** 0.5 * rcos_in(n, attack * 1000.0) * rcos_out(n, release * 1000.0)

    def choir(self, freqs, dur, attack=0.12, release=0.4, vel=1.0, rng=None, vowel='a'):
        """Choir-like pad: harmonics shaped by 'ah' formants, three slightly
        detuned singers per note, each with its own slow vibrato."""
        n = ns(dur)
        t = np.arange(n) / SR
        gain = _formants(vowel)
        y = np.zeros(n)
        for f in freqs:
            for det in (-9.0, 0.0, 8.0):
                vib = 1.0 + 0.004 * np.sin(TAU * rng.uniform(4.6, 5.8) * t + rng.uniform(0, TAU))
                fv = cents(f, det) * vib
                y += harmonics(fv, n, lambda k, kf: k ** -0.9 * gain(kf), fmax=4200.0, ph_rng=rng)
        return vel * 0.45 * y / max(len(freqs), 1) ** 0.5 * rcos_in(n, attack * 1000.0) * rcos_out(n, release * 1000.0)

    def brass(self, f, dur, vel=1.0, bright=1.0, rng=None, release=0.055, fall=None):
        """Soft horn for fanfares: a band-limited saw whose low-pass opens fast
        on the attack and settles (done per harmonic), two players, late
        vibrato. `release` is the note-off fade; `fall` lets a held note sink
        with that time constant instead of standing still."""
        n = ns(dur)
        t = np.arange(n) / SR
        vib = 1.0 + 0.004 * np.sin(TAU * 5.6 * t) * np.clip((t - 0.12) / 0.15, 0.0, 1.0)
        fc = 450.0 + 2700.0 * bright * (1.0 - np.exp(-t / 0.025)) - 900.0 * bright * (1.0 - np.exp(-t / 0.22))
        y = np.zeros(n)
        for det in (-3.5, 3.5):
            y += harmonics(cents(f, det) * vib, n, lambda k, kf: (1.0 / k) / np.sqrt(1.0 + (kf / fc) ** 4), fmax=6000.0)
        env = rcos_in(n, 16.0) * rcos_out(n, release * 1000.0)
        if fall:
            env = env * np.exp(-t / fall)
        return vel * 0.55 * y * env

    def whistle(self, path, vel=1.0, breath=0.07, rng=None):
        """Slide whistle: a sine on a frequency path, vibrato arriving late, a little breath."""
        n = len(path)
        t = np.arange(n) / SR
        fr = np.asarray(path, float) * (1.0 + 0.007 * np.sin(TAU * 6.2 * t) * np.clip((t - 0.1) / 0.1, 0.0, 1.0))
        ph = phase(fr, n)
        y = np.sin(ph) + 0.05 * np.sin(2 * ph)
        y += breath * 3.0 * svf(white(n, rng), fr, 7.0, 'bp')
        return vel * y * rcos_in(n, 14.0) * rcos_out(n, 45.0)

    def voice(self, path, vowel='a', vel=1.0, rough=0.0, rng=None):
        """One syllable of a cartoon voice: a harmonic source through vowel formants."""
        n = len(path)
        gain = _formants(vowel)
        y = harmonics(path, n, lambda k, kf: k ** -1.0 * gain(kf), fmax=5200.0, schroeder=True)
        if rough:
            y *= 1.0 + rough * np.sin(0.5 * phase(path, n))     # a growl one octave under the voice
        return vel * y / (np.max(np.abs(y)) + 1e-9)

    # ---- glitter ----------------------------------------------------------------
    def sparkle(self, dur, rng, density=38.0, lo='C7', hi='E8', shape='fall', tau=(0.03, 0.08), vel=1.0):
        """A scatter of tiny bell pings on scale tones. shape: 'fall' is
        densest and loudest at the start (a tail), 'rise' swells, 'flat' is even."""
        notes = self.scale(lo, hi)
        count = max(int(density * dur), 1)
        u = np.sort(rng.uniform(0.0, 1.0, count))
        if shape == 'fall':
            times, levels = dur * u ** 1.7, (1.0 - 0.85 * u)
        elif shape == 'rise':
            times, levels = dur * (1.0 - (1.0 - u) ** 1.7), 0.25 + 0.75 * u
        else:
            times, levels = dur * u, np.ones(count)
        m = Mix(dur)
        for t0, lv in zip(times, levels):
            f = cents(notes[rng.randint(len(notes))], rng.uniform(-6, 6))
            tk = rng.uniform(*tau)
            n = ns(tk * 6.0)
            ping = modal([(f, 1.0, tk, 0.8), (f * 2.756, 0.22, tk * 0.4, 0.6)], n)
            m.add(ping, at=t0, gain=lv * rng.uniform(0.45, 1.0))
        return vel * 0.6 * m.out()


def _split(parts, rng, lo=0.0015, hi=0.003):
    """Turn each mode into a slightly detuned pair (slow beating, like real metal)."""
    out = []
    for p in parts:
        f, a, tau, att = p[0], p[1], p[2], p[3]
        s = rng.uniform(lo, hi)
        out.append((f * (1 - s / 2), a * 0.62, tau, att))
        out.append((f * (1 + s / 2), a * 0.38, tau * 0.92, att, rng.uniform(0, TAU)))
    return out


# ===========================================================================
# synth: clean and sci-fi
# ===========================================================================

class SynthPack(WarmPack):
    """Same recipes, different instruments: FM, pure sines, pulse waves and
    resonant sweeps, a third lower (A major / F# minor pentatonic)."""
    name = 'synth'
    key = 'A major / F# minor pentatonic'
    transpose = -3
    blurb = 'FM glass plucks, sine pings, pulse blips, resonant sweeps'

    REVERBS = {'room': dict(t60=0.7, size=1.1, damp=0.15, lp=6000.0), 'hall': dict(t60=1.4, size=1.5, damp=0.12, lp=6000.0)}

    def verb(self, x, mix=0.15, tail=0.35, space='room'):
        """Reverb plus one quiet echo: a little 'space station'."""
        y = super().verb(x, mix, tail, space)
        d = ns(0.11)
        out = np.concatenate([y, np.zeros(d)])
        out[d:] += 0.16 * mix / 0.15 * lowpass(y, 2600.0, 2)
        return out[:len(x) + ns(tail)] if len(out) > len(x) + ns(tail) else out

    def pluck(self, f, vel=1.0, ring=0.3, bright=1.0, rng=None, dur=None):
        """FM pluck (1:2, the index dies in 40 ms): an electric-piano tine."""
        tau = 0.45 * (261.6 / f) ** 0.6 * (0.22 + 0.78 * ring)
        n = ns(dur if dur else min(max(tau * 7.0, 0.07), 2.5))
        t = np.arange(n) / SR
        idx = 1.9 * bright * vel * np.exp(-t / 0.04) + 0.12
        y = fm(f, 2.0, idx, n, env=perc(n, 1.6, tau))
        y += 0.25 * sine(f, n) * perc(n, 3.0, tau * 1.1)
        return vel * 0.85 * y

    def tine(self, f, vel=1.0, ring=0.6, bright=1.0, rng=None, dur=None):
        """Sine ping with a fast downward pitch blip at the front."""
        tau = 0.30 * (523.3 / f) ** 0.5 * (0.2 + 0.8 * ring)
        n = ns(dur if dur else min(max(tau * 7.0, 0.07), 2.5))
        ph = phase(glide_exp(f * 1.5, f, n, 0.006), n)
        y = (np.sin(ph) + 0.10 * bright * np.sin(2 * ph)) * perc(n, 1.5, tau)
        return vel * y

    def bell(self, f, vel=1.0, ring=1.0, kind='hand', bright=1.0, hard=0.5, rng=None, dur=None, tau=None):
        """FM bell: 1:3.5 for bells, 1:1.4 for the console 'desk' chime, 1:2.76 for glass."""
        ratio = {'hand': 3.5, 'desk': 1.4, 'glock': 2.756, 'glass': 2.32, 'tiny': 3.5}[kind]
        tau = tau if tau else 0.45 * (1000.0 / f) ** 0.55 * ring
        n = ns(dur if dur else min(max(tau * 7.0, 0.08), 3.0))
        t = np.arange(n) / SR
        top = min(1.6 * bright, max((7000.0 - f) / (f * ratio) - 1.0, 0.1))     # keep the side-bands under 7 kHz
        idx = top * (0.25 + 0.75 * np.exp(-t / (tau * 0.35)))
        y = fm(f, ratio, idx, n, env=perc(n, 1.0, tau))
        y += 0.35 * sine(f * 1.003, n) * perc(n, 2.0, tau * 1.1)
        return vel * 0.8 * y

    def desk_bell(self, f, vel=1.0, ring_tau=0.125, rng=None):
        m = Mix()
        m.add(self.bell(f, 1.0, kind='desk', bright=1.0, rng=rng, tau=ring_tau))
        m.add(self.bell(f * 2.0, 0.35, kind='hand', bright=0.6, rng=rng, tau=ring_tau * 0.5))
        return vel * m.out()

    def coin(self, f, vel=1.0, rng=None, shift_ms=0.0, ring=1.0):
        """Two-step pulse 'bling' (a fourth up), band-limited."""
        tau = 0.045 * ring
        gap = 0.028 + shift_ms / 1000.0
        m = Mix()
        for i, (ff, lv) in enumerate(((f * 1.189, 0.8), (f * 1.587, 1.0))):
            n = ns(tau * 7.0 if i else gap + 0.01)
            y = blosc(ff, n, 'pulse', fmax=6800.0, pw=0.25) * perc(n, 1.0, tau if i else 0.02)
            m.add(lowpass(y, 5200.0, 2), at=i * gap, gain=lv)
        return vel * 0.9 * m.out()

    def knock(self, f, vel=1.0, tau=0.03, tone=1.0, rng=None):
        """Digital tick: a short sine with a little third harmonic."""
        n = ns(tau * 7.0 + 0.01)
        ph = phase(glide_exp(f * 1.25, f, n, 0.004), n)
        return vel * (np.sin(ph) + 0.25 * tone * np.sin(3 * ph)) * perc(n, 1.2, tau)

    def thump(self, vel=1.0, f0=150.0, f1=58.0, tau=0.10, drop=0.025, body=0.5, rng=None):
        """Clean sub drop."""
        n = ns(tau * 7.5 + 0.02)
        t = np.arange(n) / SR
        ph = phase(f1 * 0.85 + (f0 * 1.2 - f1 * 0.85) * np.exp(-t / (drop * 1.3)), n)
        y = np.sin(ph) * perc(n, 3.0, tau * 1.2) + 0.22 * body * np.sin(2 * ph) * perc(n, 2.0, tau * 0.6)
        return vel * y

    def pop(self, f0, f1, vel=1.0, tau=0.010, drop=0.012, puff=0.15, hold=0.0, rng=None):
        n = ns(hold + tau * 6.0 + 0.012)
        ph = phase(glide_exp(f0 * (1.6 if f0 > f1 else 0.7), f1, n, drop * 0.7), n)
        t = np.arange(n) / SR
        env = rcos_in(n, 2.0) * np.exp(-np.maximum(t - hold, 0.0) / tau)
        return vel * (np.sin(ph) + 0.18 * np.sin(3 * ph)) * env

    def bloop(self, f0, f1, dur=0.2, rise=0.06, tau=0.05, vel=1.0, rng=None):
        n = ns(dur)
        fr = glide_exp(f0, f1, n, rise / 3.0)
        y = blosc(fr, n, 'tri', fmax=5000.0) + 0.25 * blosc(fr * 2.0, n, 'square', fmax=4000.0)
        return vel * 0.9 * y * perc(n, 3.0, tau)

    def whoosh(self, dur, path, q=1.1, env=None, air=0.3, rng=None, vel=1.0):
        """Resonant sweep with a quiet sine riding the filter frequency."""
        n = ns(dur)
        fc = np.exp(points([(t, math.log(f)) for t, f in path], n))
        y = svf(white(n, rng), fc, q * 3.5, 'bp') * 1.8
        y += 0.12 * np.sin(phase(fc, n))
        y = lowpass(y, 6200.0, 4)
        if env is None:
            env = np.sin(np.pi * np.arange(n) / n) ** 2
        return vel * 2.0 * y * env

    def paper(self, dur=0.09, vel=1.0, rng=None):
        n = ns(dur)
        fc = glide(900.0, 5600.0, n, 0.6)
        y = svf(white(n, rng), fc, 5.0, 'bp') * 2.0 + 0.2 * np.sin(phase(fc, n))
        env = points([(0, 0), (dur * 0.7, 1.0), (dur, 0)], n) ** 1.5
        return vel * 1.8 * lowpass(y, 6500.0, 4) * env

    def creak(self, dur=0.2, vel=1.0, rng=None):
        """A servo winding up instead of wood."""
        n = ns(dur)
        fr = glide(140.0, 420.0, n, 1.3)
        y = fm(fr, 3.0, 1.2, n) + 0.4 * blosc(fr * 0.5, n, 'pulse', fmax=3000.0, pw=0.2)
        env = points([(0, 0), (0.02, 0.5), (dur * 0.85, 1.0), (dur, 0)], n)
        return vel * 0.7 * lowpass(y, 3200.0, 2) * env

    def riser(self, dur, f0, f1, vel=1.0, rng=None):
        """Saw sweep with the filter opening on the way up."""
        n = ns(dur)
        fr = glide(f0, f1, n, 1.2)
        y = blosc(fr, n, 'saw', fmax=6000.0) + blosc(fr * 1.005, n, 'saw', fmax=6000.0)
        y = svf(y, np.minimum(fr * 5.0, 6000.0), 2.5, 'lp')
        u = np.arange(n) / max(n - 1, 1)
        return vel * 0.28 * y * u ** 1.6 * rcos_out(n, 25.0)

    def clink(self, f, vel=1.0, tau=0.018, rng=None):
        n = ns(tau * 7.0 + 0.005)
        t = np.arange(n) / SR
        top = min(1.2, max((7000.0 - f) / (f * 2.4) - 1.0, 0.1))
        return vel * fm(f, 2.4, top * np.exp(-t / (tau * 0.5)), n, env=perc(n, 0.6, tau))

    def chirp(self, f0, f1, dur=0.06, vel=1.0, rng=None):
        n = ns(dur)
        fr = glide(f0, f1, n, 0.8)
        y = fm(fr, 2.0, 0.6, n)
        return vel * y * rcos_in(n, 4.0) * rcos_out(n, min(18.0, dur * 400.0))

    def pad(self, freqs, dur, attack=0.05, release=0.2, bright=1.0, vel=1.0, rng=None):
        """Detuned band-limited saws behind a low-pass."""
        n = ns(dur)
        y = np.zeros(n)
        for f in freqs:
            for det in (-9.0, 0.0, 9.0):
                y += blosc(cents(f, det), n, 'saw', fmax=5000.0, ph0=rng.uniform(0, TAU))
        y = lowpass(y, 1500.0 + 1300.0 * bright, 2)
        return vel * 0.28 * y / max(len(freqs), 1) ** 0.5 * rcos_in(n, attack * 1000.0) * rcos_out(n, release * 1000.0)

    def choir(self, freqs, dur, attack=0.12, release=0.4, vel=1.0, rng=None, vowel='a'):
        """Glass pad: octaves and fifths of pure tones with a slow chorus."""
        n = ns(dur)
        t = np.arange(n) / SR
        y = np.zeros(n)
        for f in freqs:
            for mult, lv in ((1.0, 1.0), (2.0, 0.45), (3.0, 0.2), (4.0, 0.12)):
                for det in (-6.0, 6.0):
                    trem = 1.0 + 0.2 * np.sin(TAU * rng.uniform(2.5, 4.5) * t + rng.uniform(0, TAU))
                    y += lv * trem * np.sin(TAU * cents(f * mult, det) * t + rng.uniform(0, TAU))
        return vel * 0.3 * y / max(len(freqs), 1) ** 0.5 * rcos_in(n, attack * 1000.0) * rcos_out(n, release * 1000.0)

    def brass(self, f, dur, vel=1.0, bright=1.0, rng=None, release=0.055, fall=None):
        """Saw lead with a snappy filter envelope."""
        n = ns(dur)
        t = np.arange(n) / SR
        fc = 700.0 + 3600.0 * bright * np.exp(-t / 0.09) + 900.0
        y = np.zeros(n)
        for det in (-7.0, 7.0):
            y += harmonics(cents(f, det), n, lambda k, kf: (1.0 / k) / np.sqrt(1.0 + (kf / fc) ** 6), fmax=6500.0)
        env = rcos_in(n, 5.0) * rcos_out(n, release * 1000.0)
        if fall:
            env = env * np.exp(-t / fall)
        return vel * 0.55 * y * env

    def whistle(self, path, vel=1.0, breath=0.07, rng=None):
        """Theremin-ish sine with a fast shallow vibrato."""
        n = len(path)
        t = np.arange(n) / SR
        ph = phase(np.asarray(path, float) * (1.0 + 0.012 * np.sin(TAU * 9.0 * t)), n)
        return vel * (np.sin(ph) + 0.15 * np.sin(2 * ph)) * rcos_in(n, 10.0) * rcos_out(n, 45.0)

    def voice(self, path, vowel='a', vel=1.0, rough=0.0, rng=None):
        """Robot syllable: a narrow pulse through a single formant."""
        n = len(path)
        y = blosc(path, n, 'pulse', fmax=5200.0, pw=0.18 + 0.2 * rough)
        fc = {'o': 600.0, 'a': 950.0, 'e': 1500.0, 'i': 2100.0}[vowel]
        y = bandpass(y, fc, 2.2) + 0.25 * y
        return vel * y / (np.max(np.abs(y)) + 1e-9)

    def shaker(self, vel=1.0, fc=4200.0, q=1.1, attack_ms=4.0, tau=0.02, rng=None):
        n = ns(tau * 6.0 + attack_ms / 1000.0)
        return vel * 2.4 * lowpass(bandpass(white(n, rng), fc * 1.15, q * 3.0), 6500.0, 4) * perc(n, attack_ms * 0.5, tau)

    def sparkle(self, dur, rng, density=38.0, lo='C7', hi='E8', shape='fall', tau=(0.03, 0.08), vel=1.0):
        """Pure sine pings, each with one echo."""
        notes = self.scale(lo, hi)
        count = max(int(density * dur * 0.7), 1)
        u = np.sort(rng.uniform(0.0, 1.0, count))
        if shape == 'fall':
            times, levels = dur * u ** 1.7, (1.0 - 0.85 * u)
        elif shape == 'rise':
            times, levels = dur * (1.0 - (1.0 - u) ** 1.7), 0.25 + 0.75 * u
        else:
            times, levels = dur * u, np.ones(count)
        m = Mix(dur)
        for t0, lv in zip(times, levels):
            f = notes[rng.randint(len(notes))]
            tk = rng.uniform(*tau)
            n = ns(tk * 6.0)
            ping = np.sin(phase(glide_exp(f * 1.2, f, n, 0.004), n)) * perc(n, 0.8, tk)
            g = lv * rng.uniform(0.45, 1.0)
            m.add(ping, at=t0, gain=g)
            if t0 + 0.07 < dur:
                m.add(ping, at=t0 + 0.07, gain=g * 0.3)
        return vel * 0.6 * m.out()


PACKS = {'warm': WarmPack, 'synth': SynthPack}
