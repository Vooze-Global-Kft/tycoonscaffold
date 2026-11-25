"""Scrap to Ingot's yard (game "scrap-yard", mode "salvage"): one recipe per sound key, and the instruments.

Written for this game from docs/design/yard-stage1.md section 7 (the keys and their triggers) and
docs/design/yard-design.md section 11. Character: a working yard heard from inside it, in daylight:
steel on concrete, a grinder's short bite, a sledge on cast iron, copper's bright ring against iron's
dull clank (the grade is heard as well as seen), the platform scale's relay and its dot-matrix
printer, a diesel flatbed, a gas burner's roar building to the pour, the hiss of a cooling bar.

This module imports dsp.py (one folder up) and nothing else of scripts/audio: never recipes.py
(Pizza Empire), recipes_haul.py (Orbit Haulers), recipes_night.py (Lantern Row), recipes_office.py
(Proudly Adequate) or packs.py. Every instrument below is built here from dsp primitives (noise,
impulse trains, biquads, modal banks, additive voices):

  metal()          a struck metal body: an inharmonic modal bank (plate, bar, tube or casting
                   ratios), each mode with its own decay, plus a contact click; the family decides
                   the ratios and the damping, which is what makes copper ring and cast iron clank
  concrete()       the ground answering: a low thump of the slab and a short band of grit, so a
                   phone (which keeps nothing under 500 Hz) still hears the contact
  grit()           a crackle: sparse impulses through a band (sparks, rubble, gravel, dust)
  ratchet()        a pawl over a toothed wheel (spanner, ratchet strap, crank)
  diesel()         a six-cylinder diesel: firing pulses at the engine's rate, each a little
                   different, through exhaust resonances, with the injectors' tick riding on top
  hydraulic()      a gear pump's whine (its tooth rate and harmonics) and the valve's hiss
  burner()         a gas burner: band-limited roar whose turbulence flutters, a low rumble under it
  hiss()           steam and sizzle: high noise in a band with a slow flutter
  dotmatrix()      a 9-pin printer head: needle impacts in character cells, the carriage, the line feed
  relay()          a relay pulling in: coil buzz and the armature's clack
  beep()           the scale display's piezo, odd harmonics, band-limited
  grinder()        an angle grinder: the disc's rotation tone and harmonics, the bite's band noise
  torch()          an oxy-propane cutting torch: the jet's roar, the oxygen lever, the slag pops
  bird(), traffic(), far_beeper()   the yard's surroundings
  hum()            a person humming two notes through closed lips (the crew's hello)

What is not in this pack (the four games): no marimba or kalimba, no bell ladder, no cash register
or till, no synth blips or radio squelch, no FM glass, no steam chuff from a paper street, no
felt or clay, no brass band, no pen nib, no pneumatic tube, no swept band-pass whoosh. Coins are not
coins: money moves by transfer here, so the "coin" is the cash counter's tumblers.

Pitched sounds are in E major (c.hz() refuses a note outside it; noise and machine tones are
unpitched). Pizza Empire is in C pentatonic, Orbit Haulers A pentatonic, Lantern Row D dorian and
G lydian, Proudly Adequate B-flat major.

A recipe returns a mono float array; render_yard.py masters it with dsp.master exactly as the other
four packs are mastered (EQ guard, trim, fades, DC, loudness target plus the tier, limiter).
"""
from __future__ import annotations

import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.normpath(os.path.join(HERE, '..'))
if AUDIO not in sys.path:
    sys.path.insert(0, AUDIO)

import numpy as np  # noqa: E402

from dsp import (SR, TAU, Mix, bq, butter, filt, lowpass, midi, modal, mtof, ns, points, rcos_in, rcos_out,  # noqa: E402
                 rng_for, white)

YARD_RECIPES = {}

BIG = 2.0          # loudness tiers, dB on the mastering target (the convention of the other packs)
LOUD = 1.0
FREQUENT = -2.0
QUIET = -4.0
AMBIENT = -8.0     # the yard's surroundings sit under everything

SCALE_PCS = (4, 6, 8, 9, 11, 1, 3)       # E major: E F# G# A B C# D#
SCALE_NAME = 'E major'


def yard_recipe(name, length=None, stream_ms=None, loud_db=0.0):
    """Register a recipe of this game. length (s) caps the file with a long fade; stream_ms measures
    loudness on the sound repeated at that interval; loud_db is the tier."""
    def deco(fn):
        fn.length = length
        fn.stream_ms = stream_ms
        fn.loud_db = float(loud_db)
        fn.yard = True
        if name in YARD_RECIPES:
            raise ValueError('two yard recipes for %r' % name)
        YARD_RECIPES[name] = fn
        return fn
    return deco


def hz(name, strict=True):
    m = midi(name)
    if strict and int(round(m)) % 12 not in SCALE_PCS:
        raise ValueError('%s is not in %s' % (name, SCALE_NAME))
    return mtof(m)


class YardCtx:
    """What a recipe gets: its key (the file stem), a private random stream, the accents list."""

    def __init__(self, key):
        self.key = key
        self.rng = rng_for('yard', key)
        self.accents = []
        self.notes = []
        self.floor_db = -50.0
        self.length = None

    @property
    def var(self):
        """The variant index of a file (0 for step_concrete_1 or a single file)."""
        head, _, tail = self.key.rpartition('_')
        return int(tail) - 1 if tail.isdigit() and head else 0

    def accent(self, *times):
        self.accents.extend(float(t) for t in times)

    def sub(self, tag):
        return rng_for('yard', self.key, tag)

    def hz(self, name):
        self.notes.append(name)
        return hz(name)


# ===========================================================================
# helpers
# ===========================================================================

def band(x, lo, hi, order=2):
    return filt(x, butter('hp', lo, order) + butter('lp', hi, 4))


def reso(x, parts):
    out = np.zeros(len(x))
    for fc, q, g in parts:
        out += g * filt(x, bq('bp', fc, q))
    return out


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


def soft(x, drive=2.0):
    pk = np.max(np.abs(x)) + 1e-12
    return np.tanh(drive * x / pk) / math.tanh(drive)


def wobble(rng, n, rate_hz, depth):
    m = lowpass(rng.standard_normal(n + ns(0.2)), rate_hz, 2)[:n]
    m /= (np.std(m) + 1e-12)
    return np.clip(1.0 + depth * m, 0.0, None)


def expenv(n, tau, attack_ms=1.0):
    t = np.arange(n) / SR
    return rcos_in(n, attack_ms) * np.exp(-t / tau)


def noise(rng, dur):
    return white(ns(dur), rng)


def burst(rng, dur, lo, hi, tau, attack_ms=0.5):
    n = ns(dur)
    return band(white(n, rng), lo, hi) * expenv(n, tau, attack_ms)


def phone(y, fc=380.0):
    """Keep a heavy sound audible on a phone: a 2nd-order high-pass (a phone speaker keeps little under 500 Hz)."""
    return filt(y, butter('hp', fc, 2))


def place(m, x, at, gain=1.0):
    m.add(x, max(at, 0.0), gain)
    return m


def seg_env(n, fade_in_ms, fade_out_ms):
    """A segment's envelope: steady body, short raised-cosine ends (a re-triggered segment chains)."""
    return rcos_in(n, fade_in_ms) * rcos_out(n, fade_out_ms)


# ===========================================================================
# instruments
# ===========================================================================

# Mode ratios by shape (from the textbook values; a little jitter per strike).
PLATE = (1.0, 1.47, 1.94, 2.43, 2.90, 3.42, 4.10, 4.85, 5.62)          # a thin steel panel
BAR = (1.0, 2.756, 5.404, 8.933)                                        # a free-free bar or pipe
CASTING = (1.0, 1.31, 1.73, 2.06, 2.38, 2.95)                           # a lumpy casting (cast iron)
RIM = (1.0, 1.58, 2.21, 2.67, 3.31)                                     # an aluminium wheel's rim


def metal(rng, f0, ratios, tau, dur, amps=None, tau_fall=0.6, spread=0.012, click=0.4, click_band=(1500.0, 6000.0),
          attack_ms=0.6):
    """A struck metal body: modes f0 x ratios (jittered by `spread`), the k-th decaying with tau x
    tau_fall^k, plus a contact click. -> mono array of `dur` s."""
    n = ns(dur)
    parts = []
    for k, r in enumerate(ratios):
        a = (amps[k] if amps is not None and k < len(amps) else 1.0 / (1.0 + 0.5 * k))
        f = f0 * r * (1.0 + rng.uniform(-spread, spread))
        parts.append((f, a, tau * (tau_fall ** k), attack_ms, rng.uniform(0, TAU)))
    y = modal(parts, n)
    if click:
        c = np.zeros(n)
        cb = burst(rng, 0.02, click_band[0], click_band[1], 0.0025)
        c[:len(cb)] += cb
        y = norm(y) + click * norm(c)
    return y


def concrete(rng, dur=0.18, weight=1.0, grit_gain=0.5, low=110.0):
    """The slab answering a weight landing on it: a low thump (pitch falling a little) and a short
    band of grit 1.2 to 4.5 kHz."""
    n = ns(dur)
    t = np.arange(n) / SR
    f = low * (1.0 + 0.35 * np.exp(-t / 0.02))
    thump = np.sin(TAU * np.cumsum(f) / SR) * expenv(n, 0.035 * weight, 1.2)
    body = band(white(n, rng), 250.0, 1400.0) * expenv(n, 0.03 * weight, 0.8)
    g = burst(rng, dur, 1200.0, 4500.0, 0.012)
    return 0.45 * norm(thump) + 0.6 * norm(body) + grit_gain * norm(g)


def grit(rng, dur, rate, lo, hi, tau=0.004, amp_spread=0.7, env=None):
    """A crackle: impulses at about `rate` a second through a band, each a tiny ring."""
    n = ns(dur)
    y = np.zeros(n)
    t = 0.0
    while t < dur:
        i = int(t * SR)
        if i < n:
            y[i] += rng.uniform(1.0 - amp_spread, 1.0) * rng.choice((-1.0, 1.0))
        t += rng.exponential(1.0 / max(rate, 1.0))
    y = band(y, lo, hi)
    k = ns(tau * 6)
    if k > 2:
        y = np.convolve(y, np.exp(-np.arange(k) / (tau * SR)), 'same')
    if env is not None:
        y = y * env
    return y


def ratchet(rng, n_clicks, rate, f_ring=(2300.0, 3700.0), tau=0.012, jitter=0.12, start=0.0, accel=0.0):
    """A pawl over a toothed wheel: clicks at `rate` a second, each ringing two small steel modes."""
    m = Mix()
    t = start
    for k in range(n_clicks):
        dur = 0.05
        c = metal(rng, f_ring[0], (1.0, f_ring[1] / f_ring[0], 2.3), tau, dur, click=0.8, click_band=(2500.0, 7000.0))
        m.add(c * rng.uniform(0.7, 1.0), t)
        t += (1.0 / rate) * rng.uniform(1.0 - jitter, 1.0 + jitter) * (1.0 + accel * k)
    return m.out()


def diesel(rng, dur, fire_hz, load=0.5, rough=0.12, exhaust=(560.0, 980.0, 1650.0, 2600.0)):
    """A six-cylinder diesel: firing pulses at fire_hz (each a little different in strength and
    timing), through exhaust and body resonances, with the injectors' tick (2.5 to 5 kHz) at half the
    firing rate. load raises the pulses' sharpness and the upper resonances."""
    n = ns(dur)
    y = np.zeros(n)
    t = 0.0
    k = 0
    tick = np.zeros(n)
    while t < dur:
        i = int(t * SR)
        a = rng.uniform(1.0 - rough, 1.0) * (1.0 + 0.25 * ((k % 6) == 0))
        w = int(SR * (0.0045 - 0.0015 * load))
        if i + w < n:
            y[i:i + w] += a * np.hanning(w)
        if k % 2 == 0 and i < n:
            tick[i] += rng.uniform(0.6, 1.0)
        t += (1.0 / fire_hz) * rng.uniform(1.0 - rough * 0.15, 1.0 + rough * 0.15)
        k += 1
    g = (0.6 + 0.6 * load)
    body = reso(y, [(exhaust[0], 3.0, 1.0), (exhaust[1], 4.0, 0.8 * g), (exhaust[2], 5.0, 0.6 * g), (exhaust[3], 6.0, 0.45 * g)])
    body += 0.15 * band(y, 300.0, 3000.0)
    tk = band(tick, 2500.0, 5200.0)
    tk = np.convolve(tk, np.exp(-np.arange(ns(0.004)) / (0.0008 * SR)), 'same')
    rattle = band(white(n, rng), 900.0, 2600.0) * (0.3 + 0.7 * lowpass(np.abs(y), 40.0, 2) / (np.max(np.abs(y)) + 1e-9))
    return filt(norm(body) + 0.3 * norm(tk) + (0.25 + 0.3 * load) * norm(rattle), butter('hp', 480.0, 4))


def hydraulic(rng, dur, f0, f1, hiss_gain=0.35, teeth=9):
    """A gear pump: its tooth rate gliding f0 -> f1 with a few harmonics, a valve's hiss over it."""
    n = ns(dur)
    t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (1.0 - np.exp(-t / max(dur * 0.4, 0.01)))
    ph = TAU * np.cumsum(f) / SR
    tone = sum((0.9 ** h) * np.sin(h * ph + h) for h in range(1, 7))
    tone *= wobble(rng, n, 12.0, 0.08)
    h = band(white(n, rng), 1800.0, 5000.0) * wobble(rng, n, 6.0, 0.3)
    return norm(tone) + hiss_gain * norm(h)


def burner(rng, dur, heat=0.5):
    """A gas burner at the crucible: turbulent roar 250 Hz to 2.5 kHz that flutters at 7 to 14 Hz,
    a low rumble under it; heat (0..1) brings the upper band and the flutter up."""
    n = ns(dur)
    roar = band(white(n, rng), 250.0, 1400.0 + 1600.0 * heat) * wobble(rng, n, 7.0 + 7.0 * heat, 0.35)
    jet = band(white(n, rng), 1500.0, 3800.0) * wobble(rng, n, 20.0, 0.25)
    rumble = band(white(n, rng), 50.0, 220.0) * wobble(rng, n, 4.0, 0.5)
    return norm(roar) + (0.25 + 0.4 * heat) * norm(jet) + 0.6 * norm(rumble)


def hiss(rng, dur, lo, hi, flutter=10.0, depth=0.3):
    n = ns(dur)
    return band(white(n, rng), lo, hi) * wobble(rng, n, flutter, depth)


def relay(rng, buzz_ms=12.0):
    """A relay pulling in: a short coil buzz (100 Hz, the mains) and the armature's clack."""
    m = Mix()
    nb = ns(buzz_ms / 1000.0)
    t = np.arange(nb) / SR
    bz = np.sign(np.sin(TAU * 100.0 * t)) * rcos_in(nb, 2.0) * rcos_out(nb, 3.0)
    m.add(0.25 * band(bz, 300.0, 3000.0))
    m.add(metal(rng, 1850.0, (1.0, 2.4, 3.9), 0.008, 0.04, click=1.0, click_band=(2000.0, 7000.0)), buzz_ms / 1000.0)
    return m.out()


def beep(f, dur, level=1.0, attack_ms=2.0, release_ms=6.0):
    """The scale display's piezo: odd harmonics (a square's) band-limited to 7 kHz."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for h in (1, 3, 5, 7):
        if f * h < 7000.0:
            y += np.sin(TAU * f * h * t) / h
    return level * y * rcos_in(n, attack_ms) * rcos_out(n, release_ms)


def dotmatrix(rng, dur, chars_per_s=55.0, line_every=0.42, feed=True):
    """A 9-pin dot-matrix head printing: in each character cell up to nine needles fire (a buzz at
    the column rate, about 1.1 kHz), the head's carriage hums, a line feed's stepper clunks
    between lines; the paper rattles."""
    n = ns(dur)
    y = np.zeros(n)
    col_rate = chars_per_s * 6.0                    # six columns a cell
    t = 0.0
    line_t = 0.0
    while t < dur:
        if t - line_t > line_every:                 # a line feed: the head returns
            line_t = t
            t += 0.07
            continue
        i = int(t * SR)
        if i < n and rng.uniform() < 0.72:          # a column with ink (spaces are blank)
            y[i] += rng.uniform(0.5, 1.0) * (1.0 + 0.2 * rng.standard_normal())
        t += 1.0 / col_rate
    pins = reso(y, [(2100.0, 6.0, 1.0), (3300.0, 7.0, 0.7), (1250.0, 4.0, 0.5)])
    pins = np.convolve(pins, np.exp(-np.arange(ns(0.003)) / (0.0006 * SR)), 'same')
    carriage = band(white(n, rng), 400.0, 1200.0) * 0.15
    out = norm(pins) + carriage
    if feed:
        lt = line_every
        while lt < dur:
            k = ns(0.06)
            st = metal(rng, 520.0, (1.0, 1.9, 3.1), 0.01, 0.06, click=0.5, click_band=(800.0, 3000.0))
            i = int(lt * SR)
            out[i:i + k] += 0.5 * st[:max(0, min(k, n - i))]
            lt += line_every + 0.07
    return out


def grinder(rng, dur, rpm=10500.0, bite=None):
    """An angle grinder: the disc's rotation (rpm/60) and its harmonics with the gearbox's whine,
    and where the disc bites the steel a band of noise 2 to 6 kHz with sparks crackling.
    bite [(s, v)] is the contact pressure over time."""
    n = ns(dur)
    f = rpm / 60.0
    load = points(bite or [(0, 0.0), (dur, 0.0)], n)
    fr = f * (1.0 - 0.12 * load) * wobble(rng, n, 5.0, 0.01)
    ph = TAU * np.cumsum(fr) / SR
    tone = sum((0.75 ** h) * np.sin(h * ph) for h in (1, 2, 3, 5, 8, 13))
    gear = np.sin(TAU * np.cumsum(fr * 4.2) / SR) * 0.5 + np.sin(TAU * np.cumsum(fr * 8.4) / SR) * 0.25
    bite_n = band(white(n, rng), 1900.0, 6000.0) * (load ** 1.3) * wobble(rng, n, 25.0, 0.4)
    sparks = grit(rng, dur, 260.0, 2500.0, 6500.0, tau=0.0015, env=load)
    return 0.55 * norm(tone) * (0.6 + 0.4 * (1 - load)) + 0.35 * norm(gear) + 0.9 * norm(bite_n) + 0.35 * norm(sparks)


def torch(rng, dur, cut=1.0):
    """An oxy-propane cutting torch: the preheat flame's soft roar, the cutting oxygen's hard jet
    (2 to 5 kHz) when the lever is down (cut), slag pops."""
    n = ns(dur)
    roar = band(white(n, rng), 300.0, 1800.0) * wobble(rng, n, 11.0, 0.25)
    jet = band(white(n, rng), 2000.0, 5200.0) * wobble(rng, n, 30.0, 0.15) * cut
    pops = grit(rng, dur, 18.0 * cut, 700.0, 3500.0, tau=0.006, amp_spread=0.9)
    return 0.7 * norm(roar) + 0.6 * norm(jet) + 0.55 * norm(pops)


def bird(rng, at_freq, n_notes=3, gap=0.09, glide=0.25):
    """A small bird: short sine chirps gliding up or down, a little trill of FM."""
    m = Mix()
    t = 0.0
    for k in range(n_notes):
        d = rng.uniform(0.04, 0.08)
        nn = ns(d)
        tt = np.arange(nn) / SR
        f0 = at_freq * rng.uniform(0.9, 1.15)
        f = f0 * (1.0 + glide * rng.choice((-1.0, 1.0)) * tt / d) * (1.0 + 0.03 * np.sin(TAU * 45.0 * tt))
        y = np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2
        m.add(y, t)
        t += d + gap * rng.uniform(0.6, 1.4)
    return m.out()


def traffic(rng, dur):
    """Distant traffic: a band of low noise whose level swells slowly as vehicles pass, far off."""
    n = ns(dur)
    x = band(white(n, rng), 180.0, 1300.0)
    sw = wobble(rng, n, 0.35, 0.45)
    return x * sw


def far_beeper(rng, dur, f=1180.0, on=0.45, off=0.45, start=0.0):
    """A reverse alarm far across the yard: tone bursts, lowpassed and a little reverberant."""
    n = ns(dur)
    y = np.zeros(n)
    t = start
    while t + on < dur:
        b = beep(f, on, attack_ms=10.0, release_ms=20.0)
        i = int(t * SR)
        y[i:i + len(b)] += b[:n - i]
        t += on + off
    y = lowpass(y, 2400.0, 2)
    tail = np.exp(-np.arange(ns(0.25)) / (0.06 * SR))
    return np.convolve(y, tail / tail.sum() * 8.0, 'full')[:n] * 0.5 + 0.5 * y


def hum(rng, notes, durs, level=1.0):
    """Closed-lip humming: a voiced source (glottal pulse train, harmonics falling 12 dB/oct) through
    the nasal 'm' formants (250 Hz, 2.2 kHz, 3 kHz), a slight scoop into each note."""
    m = Mix()
    t = 0.0
    for f, d in zip(notes, durs):
        nn = ns(d)
        tt = np.arange(nn) / SR
        fr = f * (1.0 - 0.03 * np.exp(-tt / 0.05)) * (1.0 + 0.004 * np.sin(TAU * 5.5 * tt))
        ph = TAU * np.cumsum(fr) / SR
        src = sum(np.sin(h * ph) / (h ** 1.0) for h in range(1, 18))
        v = reso(src, [(260.0, 3.0, 0.5), (1100.0, 5.0, 1.0), (2250.0, 6.0, 1.3), (3000.0, 7.0, 0.8)])
        v *= rcos_in(nn, 40.0) * rcos_out(nn, 70.0)
        m.add(v, t)
        t += d * 0.92
    return level * m.out()


# ===========================================================================
# the walk: one footstep by ground tile (four files each)
# ===========================================================================

def _boot(c, heel_hz, grit_band, grit_rate, grit_gain, thump_gain, dur=0.13, scuff=0.5, crunch2=0.0, slab_hz=640.0, slab_q=9.0,
          grain_tau=0.0025):
    """One footstep in three parts: the heel strikes (a short knock of the slab), the sole rolls with a
    scuff (friction noise with the rubber's roughness, 1.2 to 3.4 kHz), the toe pushes off; on gravel the
    stones crunch under the heel and again under the toe."""
    rng = c.rng
    v = c.var
    m = Mix()
    hn = ns(0.06)
    imp = np.zeros(hn)
    imp[0] = 1.0
    imp[:ns(0.004)] += 0.3 * white(ns(0.004), rng)
    heel = reso(imp, [(slab_hz * (1.0 + 0.04 * (v - 1.5)), slab_q, 1.0), (slab_hz * 2.2, slab_q, 0.5)]) * expenv(hn, 0.02, 0.3)
    m.add(thump_gain * norm(heel))
    th = concrete(c.sub('th'), 0.07, 0.5, 0.2, heel_hz * (1.0 + 0.06 * (v - 1.5)))
    m.add(0.45 * thump_gain * phone(th, 320.0))
    roll_at = 0.03 + 0.006 * v
    nr = ns(0.075 + 0.01 * (v % 2))
    tr = np.arange(nr) / SR
    rough = 1.0 + 0.7 * np.sign(np.sin(TAU * (130.0 + 25.0 * v) * tr))
    sc = band(white(nr, c.sub('sc')), 1200.0, 3400.0) * rough * np.sin(np.pi * tr / tr[-1]) ** 1.5
    m.add(scuff * norm(sc), roll_at)
    toe = band(white(ns(0.03), rng), 700.0, 3200.0) * expenv(ns(0.03), 0.006, 0.6)
    m.add(0.5 * norm(toe), roll_at + nr / SR - 0.01)
    for k, (at, g) in enumerate(((0.0, 1.0), (roll_at + 0.05, crunch2))):
        if g <= 0.0:
            continue
        gr = grit(c.sub('g%d' % k), dur, grit_rate, grit_band[0], grit_band[1], tau=grain_tau, amp_spread=0.95,
                  env=points([(0, 0.0), (0.008, 1.0), (dur * 0.5, 0.45), (dur, 0.0)], ns(dur)))
        m.add(g * grit_gain * norm(gr), at)
    c.accent(0.0)
    return m.out()


@yard_recipe('step_concrete', stream_ms=420, loud_db=FREQUENT)
def step_concrete(c):
    """A work boot on the yard's concrete: the heel's knock, the sole's scuffed roll, the toe."""
    return _boot(c, 140.0, (1500.0, 4500.0), 120.0, 0.15, 1.0, scuff=0.4, slab_hz=640.0, slab_q=9.0)


@yard_recipe('step_gravel', stream_ms=420, loud_db=FREQUENT)
def step_gravel(c):
    """A boot on the lane's gravel: the stones crunch under the heel and again under the toe."""
    return _boot(c, 120.0, (900.0, 3600.0), 420.0, 1.0, 0.3, dur=0.12, scuff=0.1, crunch2=0.8, slab_hz=520.0, slab_q=3.0, grain_tau=0.005)


@yard_recipe('step_asphalt', stream_ms=420, loud_db=FREQUENT)
def step_asphalt(c):
    """A boot on the weighbridge apron's asphalt: a duller heel, a soft roll, no grit."""
    return _boot(c, 105.0, (700.0, 2400.0), 300.0, 0.08, 0.9, scuff=0.25, slab_hz=520.0, slab_q=4.0)


# ===========================================================================
# working a thing: the tools (segments the screen chains while the work lasts)
# ===========================================================================

@yard_recipe('cut_spanner', loud_db=FREQUENT)
def cut_spanner(c):
    """Spanners and bolt cutters, one 0.55 s segment: four quick ratchet clicks, a bolt giving with a
    short squeal, the spanner tapping the panel; chained every 500 ms while the work lasts."""
    v = c.var
    m = Mix()
    m.add(ratchet(c.sub('r'), 4, 15.0 + 2 * v, f_ring=(2200.0 + 150 * v, 3500.0)), 0.0)
    n = ns(0.12)
    t = np.arange(n) / SR
    f = 1450.0 * (1.0 + 0.12 * t / 0.12 + 0.02 * np.sin(TAU * 32 * t))
    sq = np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.12) ** 2
    m.add(0.35 * band(sq + 0.4 * np.sin(2 * TAU * np.cumsum(f) / SR), 900.0, 4500.0), 0.29)
    m.add(0.55 * metal(c.sub('tap'), 610.0, PLATE, 0.05, 0.18, click=0.6), 0.43)
    c.accent(0.0, 0.43)
    y = m.out()[:ns(0.55)]
    return y * seg_env(len(y), 2.0, 40.0)


@yard_recipe('cut_sledge', loud_db=0.0)
def cut_sledge(c):
    """The sledgehammer on cast iron, one blow (0.7 s): the swing's short air, the heavy dull clank of
    the casting (low inharmonic modes, damped), its crack and a little dust; chained every 700 ms."""
    v = c.var
    m = Mix()
    sw = band(white(ns(0.12), c.sub('sw')), 400.0, 1800.0) * points([(0, 0.0), (0.09, 1.0), (0.12, 0.0)], ns(0.12), 2.0)
    m.add(0.12 * norm(sw))
    hit = metal(c.sub('hit'), 560.0 * (1.0 + 0.04 * v), CASTING, 0.04, 0.45, tau_fall=0.7, spread=0.06, click=1.0, click_band=(1200.0, 5500.0))
    m.add(hit, 0.12)
    m.add(0.6 * concrete(c.sub('c'), 0.2, 1.4, 0.8, 85.0), 0.12)
    m.add(0.6 * burst(c.sub('crack'), 0.05, 1500.0, 6000.0, 0.008), 0.121)
    m.add(0.35 * grit(c.sub('dust'), 0.3, 500.0, 1500.0, 5000.0, tau=0.002,
                      env=points([(0, 1.0), (0.3, 0.0)], ns(0.3))), 0.14)
    c.accent(0.12)
    y = phone(m.out()[:ns(0.7)], 350.0)
    return y * seg_env(len(y), 2.0, 60.0)


@yard_recipe('cut_grinder', loud_db=0.0)
def cut_grinder(c):
    """The angle grinder's short bite (0.8 s): the disc at speed, pressed into thin steel for half a
    second (its note drops, the bite hisses, sparks crackle), lifted off; chained every 750 ms."""
    v = c.var
    dur = 0.8
    y = grinder(c.sub('g'), dur, rpm=10200.0 + 300 * v, bite=[(0, 0.0), (0.12, 0.0), (0.2, 1.0), (0.58, 0.9), (0.68, 0.0), (dur, 0.0)])
    c.accent(0.15)
    return y * seg_env(len(y), 25.0, 50.0)


@yard_recipe('cut_torch', loud_db=0.0)
def cut_torch(c):
    """The cutting torch through a beam (1.2 s segment): the preheat's roar, the oxygen jet's hard
    hiss, slag popping; steady, chained every 1100 ms (the two files take turns)."""
    y = torch(c.sub('t'), 1.2, cut=1.0)
    c.accent(0.0)
    return y * seg_env(len(y), 60.0, 90.0)


# ===========================================================================
# pieces coming off, by family (the grade is heard as well as seen)
# ===========================================================================

@yard_recipe('piece_steel', loud_db=0.0)
def piece_steel(c):
    """A sheet-steel panel onto the frame or the ground: the panel's plate modes (300 Hz to 3 kHz,
    a wobbly flat clang) with a second bounce, the concrete under it."""
    v = c.var
    m = Mix()
    f0 = 470.0 * (1.0 + 0.07 * (v - 1))
    m.add(metal(c.sub('a'), f0, PLATE, 0.09, 0.45, tau_fall=0.82, click=0.5))
    m.add(0.45 * metal(c.sub('b'), f0 * 1.03, PLATE, 0.05, 0.3, tau_fall=0.8, click=0.4), 0.07 + 0.01 * v)
    m.add(0.35 * concrete(c.sub('c'), 0.15, 1.0, 0.4), 0.0)
    c.accent(0.0)
    return phone(m.out(), 360.0)


@yard_recipe('piece_cast', loud_db=0.0)
def piece_cast(c):
    """A cast-iron section: iron's dull clank: a lumpy casting's low modes damped almost at once,
    grit off its rough skin, a heavy concrete thud (no ring at all)."""
    v = c.var
    m = Mix()
    m.add(metal(c.sub('a'), 640.0 * (1.0 + 0.05 * (v - 1)), CASTING, 0.02, 0.25, tau_fall=0.7, spread=0.06, click=1.0,
                click_band=(1000.0, 4500.0)))
    m.add(0.8 * concrete(c.sub('c'), 0.2, 1.5, 0.7, 90.0))
    m.add(0.45 * grit(c.sub('g'), 0.12, 600.0, 1500.0, 5000.0, tau=0.002, env=points([(0, 1.0), (0.12, 0.0)], ns(0.12))), 0.01)
    c.accent(0.0)
    return phone(m.out(), 420.0)


@yard_recipe('piece_alu', loud_db=0.0)
def piece_alu(c):
    """An aluminium wheel or end cap: a light hollow tonk (the rim's modes, short, higher and
    softer than steel), a small roll on the concrete."""
    v = c.var
    m = Mix()
    m.add(metal(c.sub('a'), 760.0 * (1.0 + 0.06 * (v - 1)), RIM, 0.05, 0.3, tau_fall=0.75, click=0.35, attack_ms=1.2))
    m.add(0.25 * concrete(c.sub('c'), 0.1, 0.6, 0.3, 150.0))
    m.add(0.25 * metal(c.sub('b'), 820.0, RIM, 0.03, 0.15, click=0.2), 0.11)
    c.accent(0.0)
    return m.out()


@yard_recipe('piece_copper', length=0.6, loud_db=0.0)
def piece_copper(c):
    """Copper (a bundle of bare wire, a pipe): copper's bright ring: a tube's bar modes tuned high in
    E major (B5 or G#5 by file), ringing 0.5 s, the bundle's strands shimmering on top."""
    v = c.var
    note = ('B5', 'G#5', 'C#6')[v % 3]
    f0 = c.hz(note)
    m = Mix()
    m.add(metal(c.sub('a'), f0, BAR, 0.35, 0.9, amps=(1.0, 0.9, 0.6, 0.25), tau_fall=0.7, spread=0.002, click=0.25,
                click_band=(2500.0, 7000.0)))
    m.add(0.35 * metal(c.sub('s'), f0 * 1.5, BAR, 0.12, 0.4, amps=(1.0, 0.3, 0.1), spread=0.01, click=0.0), 0.004)
    m.add(0.2 * concrete(c.sub('c'), 0.08, 0.4, 0.2, 160.0))
    m.add(0.35 * metal(c.sub('bounce'), f0 * 1.003, BAR, 0.1, 0.3, amps=(1.0, 0.45, 0.2), spread=0.002, click=0.5), 0.07 + 0.01 * v)
    c.accent(0.0)
    return m.out()


@yard_recipe('piece_brass', length=0.48, loud_db=0.0)
def piece_brass(c):
    """Brass taps and fittings: a heavier, warmer ring than copper (cast bell-ish partials around
    E5 and A5) as two or three fittings land against each other, a short clatter."""
    v = c.var
    m = Mix()
    roots = (('E5', 'A5'), ('F#5', 'B5'), ('G#5', 'C#6'))[v % 3]
    for k, nm in enumerate(roots):
        f = c.hz(nm)
        m.add(metal(c.sub('t%d' % k), f, (1.0, 1.59, 2.42, 3.11, 4.07), 0.14, 0.45, amps=(1.0, 0.7, 0.5, 0.35, 0.2),
                    tau_fall=0.65, spread=0.01, click=0.5), 0.035 * k + 0.01 * v)
    m.add(0.4 * grit(c.sub('cl'), 0.12, 90.0, 1500.0, 5000.0, tau=0.003, env=points([(0, 1.0), (0.12, 0.0)], ns(0.12))), 0.02)
    m.add(0.2 * concrete(c.sub('c'), 0.08, 0.5, 0.25, 150.0))
    c.accent(0.0)
    return m.out()


@yard_recipe('thud_waste', loud_db=0.0)
def thud_waste(c):
    """The concrete counterweight into the rubble skip: a dead heavy thud on the skip's steel floor
    (one low boom of the skip, damped by rubble), stones skittering."""
    v = c.var
    m = Mix()
    m.add(0.9 * concrete(c.sub('c'), 0.25, 2.0, 0.6, 75.0))
    m.add(0.6 * metal(c.sub('skip'), 340.0 * (1.0 + 0.05 * v), PLATE, 0.08, 0.35, tau_fall=0.7, click=0.2))
    m.add(0.6 * grit(c.sub('g'), 0.3, 220.0, 1200.0, 4500.0, tau=0.003, env=points([(0, 1.0), (0.3, 0.0)], ns(0.3))), 0.02)
    c.accent(0.0)
    return phone(m.out(), 400.0)


# ===========================================================================
# the hand: pickup, swap, load full, feed
# ===========================================================================

@yard_recipe('pickup', loud_db=FREQUENT)
def pickup(c):
    """A piece lifted onto the carry frame: a glove scraping metal, the piece settling on the frame's
    tube with a small clink (three files)."""
    v = c.var
    m = Mix()
    m.add(0.5 * band(white(ns(0.06), c.sub('s')), 1200.0, 4200.0) * points([(0, 0.0), (0.02, 1.0), (0.06, 0.0)], ns(0.06)))
    m.add(0.6 * metal(c.sub('k'), 1250.0 * (1.0 + 0.08 * v), BAR, 0.035, 0.15, click=0.6), 0.06)
    c.accent(0.06)
    return m.out()


@yard_recipe('swap', loud_db=FREQUENT)
def swap(c):
    """The swap: the cheaper piece set down (a dull knock), the better one lifted (a brighter clink)."""
    m = Mix()
    m.add(0.6 * metal(c.sub('down'), 520.0, CASTING, 0.03, 0.15, click=0.6))
    m.add(0.3 * concrete(c.sub('c'), 0.08, 0.6, 0.3, 130.0))
    m.add(0.7 * metal(c.sub('up'), 1480.0, BAR, 0.05, 0.2, click=0.5), 0.17)
    c.accent(0.0, 0.17)
    return m.out()


@yard_recipe('load_full', loud_db=0.0)
def load_full(c):
    """Load full: the frame's strap cinched (two ratchet clicks, the webbing pulled tight with a creak)."""
    m = Mix()
    m.add(ratchet(c.sub('r'), 2, 9.0, f_ring=(1800.0, 3000.0), tau=0.02))
    n = ns(0.16)
    t = np.arange(n) / SR
    web = band(white(n, c.sub('w')), 700.0, 2600.0) * (np.sin(np.pi * t / 0.16) ** 2) * (1.0 + 0.6 * np.sin(TAU * 70 * t))
    m.add(0.5 * web, 0.22)
    c.accent(0.0, 0.11)
    return m.out()


@yard_recipe('feed', loud_db=FREQUENT)
def feed(c):
    """Pieces fed into a hopper: they slide down its steel chute (a rasp) and drop in (a hollow knock)."""
    v = c.var
    m = Mix()
    n = ns(0.22)
    m.add(0.5 * band(white(n, c.sub('s')), 800.0, 3600.0) * points([(0, 0.0), (0.05, 1.0), (0.22, 0.2)], n))
    m.add(0.8 * metal(c.sub('k'), 540.0 * (1.0 + 0.06 * v), PLATE, 0.035, 0.25, tau_fall=0.75, spread=0.05, click=0.6), 0.2)
    c.accent(0.2)
    return m.out()


# ===========================================================================
# weighing, tickets
# ===========================================================================

@yard_recipe('scale_beeps', loud_db=0.0)
def scale_beeps(c):
    """Weighed in: the scale's relay pulls in, the display counts (a fast run of short ticks rising
    to a settle), and confirms with two piezo beeps (B6 then E7)."""
    m = Mix()
    m.add(0.8 * relay(c.sub('r')))
    t = 0.06
    for k in range(9):
        m.add(0.18 * beep(2600.0, 0.008, attack_ms=0.5, release_ms=3.0), t)
        t += 0.045 - 0.002 * k
    m.add(0.55 * beep(c.hz('B6'), 0.07), t + 0.05)
    m.add(0.55 * beep(c.hz('E7'), 0.11), t + 0.15)
    c.accent(0.0, t + 0.05)
    return m.out()


@yard_recipe('scale_print', length=1.3, loud_db=FREQUENT)
def scale_print(c):
    """The weigh-in ticket: the scale house's dot-matrix printer: three lines of needles at work, the
    line feeds between them, the ticket torn off at the end."""
    m = Mix()
    m.add(dotmatrix(c.sub('p'), 1.05, line_every=0.3))
    n = ns(0.12)
    tear = band(white(n, c.sub('tear')), 1500.0, 5500.0) * points([(0, 0.0), (0.02, 1.0), (0.12, 0.0)], n, 1.5)
    m.add(0.6 * tear, 1.1)
    c.accent(0.0)
    return m.out()


@yard_recipe('slip', loud_db=FREQUENT)
def slip(c):
    """The drop-off slip: a slip torn from the gate pad (a short paper rip), stamped once."""
    m = Mix()
    n = ns(0.09)
    m.add(0.6 * band(white(n, c.sub('rip')), 1800.0, 5500.0) * points([(0, 0.0), (0.01, 1.0), (0.09, 0.0)], n))
    m.add(0.8 * concrete(c.sub('st'), 0.06, 0.4, 0.1, 210.0), 0.16)
    m.add(0.4 * band(white(ns(0.03), c.sub('c')), 600.0, 2500.0) * expenv(ns(0.03), 0.006), 0.16)
    c.accent(0.16)
    return phone(m.out(), 500.0)


# ===========================================================================
# the merchant's round and the money
# ===========================================================================

@yard_recipe('flatbed_arrive', length=2.4, loud_db=QUIET)
def flatbed_arrive(c):
    """The merchant's diesel flatbed back at its stand: the engine slowing from a crawl to idle, the
    air brake's hiss, the engine ticking over."""
    dur = 2.4
    n = ns(dur)
    a = diesel(c.sub('d1'), 1.6, 38.0, load=0.6) * points([(0, 0.0), (0.3, 1.0), (1.6, 0.7)], ns(1.6))
    b = diesel(c.sub('d2'), 1.0, 26.0, load=0.2) * points([(0, 0.6), (1.0, 0.0)], ns(1.0))
    m = Mix()
    m.add(a)
    m.add(b, 1.4)
    air = hiss(c.sub('air'), 0.45, 2200.0, 6500.0, 25.0, 0.2) * points([(0, 0.0), (0.02, 1.0), (0.45, 0.0)], ns(0.45), 1.6)
    m.add(0.55 * air, 1.35)
    c.accent(1.35)
    y = m.out()[:n]
    return y


@yard_recipe('flatbed_load', length=3.0, loud_db=QUIET)
def flatbed_load(c):
    """The flatbed's crane loads the bay (3 s): the pump's whine rising, the grab closing on the lot
    (a heavy rattle of metal), set down on the bed with a deep clank."""
    m = Mix()
    m.add(0.6 * hydraulic(c.sub('h'), 2.6, 230.0, 310.0) * points([(0, 0.0), (0.2, 1.0), (2.3, 1.0), (2.6, 0.0)], ns(2.6)))
    rat = grit(c.sub('r'), 0.6, 80.0, 600.0, 3000.0, tau=0.01, amp_spread=0.9, env=points([(0, 1.0), (0.6, 0.2)], ns(0.6)))
    m.add(0.6 * rat, 0.8)
    m.add(0.9 * metal(c.sub('bed'), 210.0, PLATE, 0.12, 0.6, tau_fall=0.8, click=0.6), 2.2)
    m.add(0.5 * concrete(c.sub('c'), 0.2, 1.5, 0.3, 80.0), 2.2)
    c.accent(0.8, 2.2)
    return phone(m.out(), 380.0)


def _tumblers(rng, n_clicks, start_rate, end_rate, f=(1650.0, 2900.0)):
    """The cash counter's number wheels turning over: clicks slowing from start_rate to end_rate."""
    m = Mix()
    t = 0.0
    for k in range(n_clicks):
        r = start_rate + (end_rate - start_rate) * k / max(n_clicks - 1, 1)
        m.add(rng.uniform(0.7, 1.0) * metal(rng, f[0] * rng.uniform(0.98, 1.02), (1.0, f[1] / f[0], 2.6), 0.01, 0.04, click=0.7,
                                            click_band=(2000.0, 6500.0)), t)
        t += 1.0 / r
    return m.out(), t


@yard_recipe('coin', loud_db=FREQUENT)
def coin(c):
    """Paid by transfer: the cash counter's wheels turn over (five quick tumbler clicks) and settle
    with a soft steel tick (three files)."""
    v = c.var
    m = Mix()
    tum, t = _tumblers(c.sub('t'), 5, 34.0 + 3 * v, 22.0)
    m.add(0.8 * tum)
    m.add(0.6 * metal(c.sub('set'), c.hz(('E6', 'G#6', 'B6')[v % 3]), BAR, 0.08, 0.3, amps=(1.0, 0.3, 0.1), click=0.3), t)
    c.accent(0.0)
    return m.out()


@yard_recipe('coin_big', loud_db=LOUD)
def coin_big(c):
    """A big collection (copper or a grade's first lot): the counter rolls longer, a heavier wheel
    lands, and two struck steel bars ring an open fifth (E5 and B5) under it."""
    m = Mix()
    tum, t = _tumblers(c.sub('t'), 12, 40.0, 16.0)
    m.add(0.8 * tum)
    m.add(0.7 * metal(c.sub('a'), c.hz('E5'), BAR, 0.4, 1.0, amps=(1.0, 0.3, 0.12), spread=0.002, click=0.4), t)
    m.add(0.5 * metal(c.sub('b'), c.hz('B5'), BAR, 0.35, 0.9, amps=(1.0, 0.25, 0.1), spread=0.002, click=0.3), t + 0.06)
    c.accent(0.0, t)
    return m.out()


@yard_recipe('lesson', length=1.4, loud_db=QUIET)
def lesson(c):
    """A lesson on the ticket: a soft bell: a small steel bowl struck with a padded beater (G#5,
    its partials 2.7 and 5.0 times up), long and quiet."""
    f = c.hz('G#5')
    y = metal(c.sub('b'), f, (1.0, 1.007, 2.71, 2.735, 5.03), 0.55, 1.4, amps=(1.0, 0.8, 0.5, 0.4, 0.15), tau_fall=0.85, spread=0.0, click=0.05, attack_ms=6.0)
    c.accent(0.0)
    return y


@yard_recipe('deal_stamp', loud_db=0.0)
def deal_stamp(c):
    """A deal delivery: the delivery note stamped on the counter: a rubber stamp's thump and its handle's
    wooden knock, the pad's squelch."""
    m = Mix()
    m.add(0.9 * concrete(c.sub('t'), 0.1, 0.6, 0.15, 160.0))
    m.add(0.5 * metal(c.sub('h'), 900.0, CASTING, 0.015, 0.08, click=0.5), 0.004)
    sq = band(white(ns(0.05), c.sub('sq')), 500.0, 1800.0) * expenv(ns(0.05), 0.01)
    m.add(0.4 * sq, 0.09)
    c.accent(0.0)
    return phone(m.out(), 450.0)


# ===========================================================================
# interface
# ===========================================================================

@yard_recipe('ui_open', loud_db=QUIET)
def ui_open(c):
    """A card opens: a clipboard's spring clip lifted: the steel clip's click and its spring's short buzz."""
    m = Mix()
    m.add(0.8 * metal(c.sub('clip'), 1900.0, (1.0, 1.55, 2.4), 0.012, 0.05, click=0.8))
    n = ns(0.07)
    t = np.arange(n) / SR
    sp = np.sin(TAU * 520.0 * t + 2.0 * np.sin(TAU * 31.0 * t)) * expenv(n, 0.02)
    m.add(0.35 * band(sp, 400.0, 3000.0), 0.01)
    c.accent(0.0)
    return m.out()


@yard_recipe('ui_close', loud_db=QUIET)
def ui_close(c):
    """The card closes: the clipboard laid down on the cabin's desk: a hollow plywood tok (two board
    resonances) and the sheets settling."""
    m = Mix()
    n = ns(0.09)
    imp = np.zeros(n)
    imp[0] = 1.0
    tok = reso(imp + 0.2 * np.r_[white(ns(0.003), c.sub('i')), np.zeros(n - ns(0.003))], [(720.0, 7.0, 1.0), (1180.0, 9.0, 0.6), (2050.0, 6.0, 0.3)])
    m.add(norm(tok * expenv(n, 0.025, 0.4)))
    nn = ns(0.06)
    m.add(0.25 * band(white(nn, c.sub('p')), 1800.0, 5000.0) * points([(0, 0.0), (0.01, 1.0), (0.06, 0.0)], nn), 0.02)
    c.accent(0.0)
    return phone(m.out(), 450.0)


@yard_recipe('buy', loud_db=0.0)
def buy(c):
    """Bought: a steel ticket punch's crunch, then the steel tag stamped with the item hung on the rack's
    hook (a small stamped plate ringing around A5, the hook's tick)."""
    m = Mix()
    m.add(0.7 * band(white(ns(0.03), c.sub('p')), 900.0, 4500.0) * expenv(ns(0.03), 0.005))
    m.add(0.6 * metal(c.sub('k'), 780.0, CASTING, 0.012, 0.06, click=0.7), 0.002)
    m.add(0.55 * metal(c.sub('tag'), c.hz('A5'), PLATE, 0.12, 0.4, tau_fall=0.85, spread=0.02, click=0.3), 0.08)
    m.add(0.35 * metal(c.sub('hook'), 2300.0, (1.0, 1.8), 0.02, 0.05, click=0.6), 0.2)
    c.accent(0.0, 0.08)
    return m.out()


@yard_recipe('denied', loud_db=0.0)
def denied(c):
    """Refused: a gloved fist on a steel cabinet door, twice, dull (low panel modes, no ring)."""
    m = Mix()
    for k, at in enumerate((0.0, 0.13)):
        m.add((1.0 - 0.3 * k) * metal(c.sub('k%d' % k), 560.0, PLATE, 0.02, 0.12, tau_fall=0.7, click=0.5, click_band=(700.0, 2500.0)), at)
    c.accent(0.0, 0.13)
    return phone(m.out(), 480.0)


@yard_recipe('goal_tick', loud_db=QUIET)
def goal_tick(c):
    """A goal done: a carpenter's pencil ticks the clipboard (two strokes of graphite) (my key; the
    first-yard document gives the goal event none)."""
    m = Mix()
    for k, (at, d) in enumerate(((0.0, 0.035), (0.05, 0.07))):
        n = ns(d)
        m.add(band(white(n, c.sub('s%d' % k)), 1400.0, 5000.0) * points([(0, 0.0), (0.006, 1.0), (d, 0.0)], n), at)
    m.add(0.5 * concrete(c.sub('t'), 0.04, 0.3, 0.0, 240.0))
    c.accent(0.0)
    return m.out()


# ===========================================================================
# arrivals and hires
# ===========================================================================

@yard_recipe('van', length=2.2, loud_db=QUIET)
def van(c):
    """The delivery van at the tool rack: a petrol engine (four cylinders, quicker and lighter than the
    diesels) slowing, stopping, its sliding door rolling open on its rail."""
    m = Mix()
    eng = diesel(c.sub('e'), 1.3, 58.0, load=0.3, exhaust=(240.0, 560.0, 1200.0, 2300.0))
    m.add(0.8 * eng * points([(0, 0.0), (0.2, 1.0), (1.0, 0.8), (1.3, 0.0)], ns(1.3)))
    n = ns(0.55)
    roll = band(white(n, c.sub('r')), 400.0, 2600.0) * wobble(c.sub('w'), n, 40.0, 0.4) * points([(0, 0.0), (0.06, 1.0), (0.5, 0.8), (0.55, 0.0)], n)
    m.add(0.5 * roll, 1.35)
    m.add(0.8 * metal(c.sub('stop'), 410.0, PLATE, 0.05, 0.3, click=0.6), 1.9)
    c.accent(1.9)
    return m.out()


@yard_recipe('set_down', loud_db=0.0)
def set_down(c):
    """A thing set down on the concrete (the public's car leaving one at the drop-off): a weight landing
    on its feet, its sheet body clanking once."""
    m = Mix()
    m.add(0.9 * concrete(c.sub('c'), 0.2, 1.4, 0.5, 95.0))
    m.add(0.6 * metal(c.sub('b'), 520.0, PLATE, 0.035, 0.3, tau_fall=0.8, spread=0.05, click=0.5), 0.01)
    m.add(0.35 * concrete(c.sub('c2'), 0.1, 0.6, 0.5, 120.0), 0.07)
    c.accent(0.0)
    return phone(m.out(), 400.0)


@yard_recipe('crane_set', length=2.4, loud_db=0.0)
def crane_set(c):
    """A machine arrives on the flatbed's crane: the pump whining as it lowers, the machine landing on
    its pad with a deep clunk, the chains going slack."""
    m = Mix()
    m.add(0.55 * hydraulic(c.sub('h'), 1.6, 300.0, 240.0) * points([(0, 0.0), (0.15, 1.0), (1.4, 1.0), (1.6, 0.0)], ns(1.6)))
    m.add(1.0 * metal(c.sub('land'), 150.0, CASTING, 0.12, 0.6, tau_fall=0.75, click=0.6), 1.5)
    m.add(0.7 * concrete(c.sub('c'), 0.25, 2.0, 0.4, 70.0), 1.5)
    ch = grit(c.sub('ch'), 0.5, 45.0, 1800.0, 6000.0, tau=0.012, amp_spread=0.8, env=points([(0, 1.0), (0.5, 0.0)], ns(0.5)))
    m.add(0.5 * ch, 1.62)
    c.accent(1.5)
    return phone(m.out(), 380.0)


@yard_recipe('door', loud_db=QUIET)
def door(c):
    """The portacabin door: its lever handle, the light door swinging out, a hollow knock on its frame."""
    m = Mix()
    m.add(0.7 * metal(c.sub('h'), 1350.0, (1.0, 1.7, 2.9), 0.015, 0.06, click=0.7))
    n = ns(0.3)
    t = np.arange(n) / SR
    cr = reso(np.sign(np.sin(TAU * (60.0 + 40.0 * t / 0.3) * t)) * 1.0, [(700.0, 6.0, 1.0), (1500.0, 7.0, 0.5)])
    m.add(0.2 * cr * np.sin(np.pi * t / 0.3), 0.08)
    m.add(0.8 * metal(c.sub('k'), 390.0, PLATE, 0.04, 0.25, tau_fall=0.7, click=0.4, click_band=(600.0, 2400.0)), 0.42)
    c.accent(0.0, 0.42)
    return phone(m.out(), 380.0)


@yard_recipe('crew_hello', loud_db=QUIET)
def crew_hello(c):
    """A new hand says hello: a hummed "mm-hm" (G#4 down to E4), warm and short."""
    y = filt(hum(c.sub('h'), [c.hz('G#4'), c.hz('E4')], [0.22, 0.34]), butter('hp', 520.0, 4))
    c.accent(0.0)
    return y


# ===========================================================================
# machines working (segments chained while they work)
# ===========================================================================

@yard_recipe('stripper_hand', loud_db=QUIET)
def stripper_hand(c):
    """The hand stripper cranked (0.8 s segment): the crank's gear clicking, the blade slitting PVC
    (a ripping zip), the cable drawn through the rollers; chained every 750 ms."""
    v = c.var
    m = Mix()
    m.add(0.7 * ratchet(c.sub('g'), 6, 8.0, f_ring=(1500.0 + 100 * v, 2600.0), tau=0.01, jitter=0.08))
    n = ns(0.7)
    t = np.arange(n) / SR
    zip_ = band(white(n, c.sub('z')), 1000.0, 4500.0) * (0.5 + 0.5 * np.abs(np.sin(TAU * 4.0 * t))) * wobble(c.sub('w'), n, 60.0, 0.5)
    m.add(0.5 * zip_, 0.05)
    c.accent(0.0)
    y = m.out()[:ns(0.8)]
    return y * seg_env(len(y), 15.0, 60.0)


@yard_recipe('stripper_power', loud_db=QUIET)
def stripper_power(c):
    """The powered stripper (1.0 s segment): its motor's hum (100 Hz mains and harmonics), the rollers'
    grind and the blade slitting faster; chained every 950 ms."""
    n = ns(1.0)
    t = np.arange(n) / SR
    hum_ = sum(np.sin(TAU * 100.0 * h * t + h) / h for h in (1, 2, 3, 4, 6, 8, 12))
    rol = band(white(n, c.sub('r')), 700.0, 2400.0) * wobble(c.sub('w'), n, 18.0, 0.3)
    zp = band(white(n, c.sub('z')), 1500.0, 5000.0) * wobble(c.sub('z2'), n, 90.0, 0.6)
    y = phone(0.45 * norm(hum_) + 0.5 * norm(rol) + 0.4 * norm(zp), 420.0)
    c.accent(0.0)
    return y * seg_env(n, 40.0, 70.0)


@yard_recipe('bench_knock', loud_db=QUIET)
def bench_knock(c):
    """The motor bench (0.6 s segment): a hammer and cold chisel on a motor's steel casing, two knocks
    (the second lighter), a winding pulled loose; chained every 600 ms."""
    v = c.var
    m = Mix()
    m.add(metal(c.sub('a'), 880.0 * (1.0 + 0.04 * v), (1.0, 1.6, 2.3, 3.7), 0.03, 0.2, click=0.9))
    m.add(0.6 * metal(c.sub('b'), 910.0, (1.0, 1.6, 2.3, 3.7), 0.025, 0.18, click=0.8), 0.24)
    n = ns(0.15)
    m.add(0.25 * band(white(n, c.sub('w')), 900.0, 3500.0) * points([(0, 0.0), (0.03, 1.0), (0.15, 0.0)], n), 0.4)
    c.accent(0.0, 0.24)
    y = m.out()[:ns(0.6)]
    return y * seg_env(len(y), 2.0, 40.0)


# ===========================================================================
# the crucible
# ===========================================================================

@yard_recipe('furnace_roar', loud_db=QUIET)
def furnace_roar(c):
    """The crucible's burner (2.0 s segment), three files a ladder of heat (step 0 lit, 1 half way, 2
    at pouring heat): the roar opening up and the flutter quickening as the heat builds; chained
    every 1900 ms."""
    heat = (0.15, 0.5, 0.95)[c.var % 3]
    y = burner(c.sub('b'), 2.0, heat)
    c.accent(0.0)
    return y * seg_env(len(y), 120.0, 140.0)


@yard_recipe('ready_chime', length=1.6, loud_db=0.0)
def ready_chime(c):
    """Ready to pour: the burner turned down (its roar falling away) and the crucible's steel signal bar
    rapped three times quickly (B5), the hand damping it after the third."""
    m = Mix()
    n = ns(0.6)
    m.add(0.5 * burner(c.sub('bn'), 0.6, 0.6) * points([(0, 1.0), (0.6, 0.0)], n, 1.8))
    f = c.hz('B5')
    for k, at in enumerate((0.05, 0.16, 0.27)):
        m.add((1.0 - 0.15 * k) * metal(c.sub('r%d' % k), f, BAR, 0.35 if k == 2 else 0.12, 0.9 if k == 2 else 0.2,
                                       amps=(1.0, 0.6, 0.35, 0.1), spread=0.002, click=0.5), at)
    c.accent(0.05, 0.16, 0.27)
    return m.out()


@yard_recipe('pour_glug', length=2.0, loud_db=LOUD)
def pour_glug(c):
    """The pour: the crucible tipped, molten brass running into the mould: a thick hiss and sizzle
    (steam off the mould's coating), low glugs as the stream breaks, sparkle where it splashes."""
    dur = 2.0
    n = ns(dur)
    env = points([(0, 0.0), (0.15, 1.0), (1.5, 0.85), (dur, 0.0)], n, 1.3)
    m = Mix()
    m.add(0.8 * hiss(c.sub('h'), dur, 1800.0, 6000.0, 16.0, 0.4) * env)
    m.add(0.5 * burner(c.sub('b'), dur, 0.7) * env)
    rng = c.sub('g')
    t = 0.18
    while t < 1.6:
        d = rng.uniform(0.06, 0.1)
        nn = ns(d)
        tt = np.arange(nn) / SR
        f = rng.uniform(280.0, 420.0) * (1.0 + 0.8 * tt / d)
        gl = np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2
        m.add(0.45 * band(gl + 0.3 * np.sin(2 * TAU * np.cumsum(f) / SR), 250.0, 2500.0), t)
        t += rng.uniform(0.12, 0.25)
    m.add(0.4 * grit(c.sub('sp'), dur, 90.0, 2500.0, 6500.0, tau=0.002, env=env))
    c.accent(0.15)
    return m.out()[:n]


@yard_recipe('cool_ticks', length=2.6, loud_db=QUIET)
def cool_ticks(c):
    """The bars cooling to brass (2.6 s): a sizzle fading as the bar sets, then the metal ticking as it
    contracts (small high pings, sparse, slowing)."""
    dur = 2.6
    n = ns(dur)
    m = Mix()
    m.add(0.7 * hiss(c.sub('h'), dur, 2500.0, 6500.0, 9.0, 0.3) * points([(0, 1.0), (0.8, 0.5), (2.0, 0.0), (dur, 0.0)], n, 1.6))
    rng = c.sub('t')
    t = 0.5
    gap = 0.12
    while t < dur - 0.1:
        m.add(rng.uniform(0.25, 0.5) * metal(rng, rng.uniform(2800.0, 4200.0), (1.0, 1.9, 2.8), 0.02, 0.06, click=0.4), t)
        t += gap * rng.uniform(0.6, 1.6)
        gap *= 1.35
    c.accent(0.0)
    return m.out()[:n]


# ===========================================================================
# the truck and the skips
# ===========================================================================

@yard_recipe('truck_diesel', loud_db=QUIET)
def truck_diesel(c):
    """The hook-lift truck's diesel (1.0 s segment), three files a ladder of speed (0 idle, 1 driving,
    2 pulling hard): the firing rate and the load rise with each; chained every 950 ms while driving."""
    v = c.var % 3
    fire = (30.0, 52.0, 78.0)[v]
    load = (0.15, 0.5, 0.85)[v]
    y = diesel(c.sub('d'), 1.0, fire, load=load)
    c.accent(0.0)
    return y * seg_env(len(y), 40.0, 70.0)


@yard_recipe('truck_reverse', length=1.6, loud_db=QUIET)
def truck_reverse(c):
    """The truck backing up over the weighbridge: its reverse alarm (three tone bursts at 1.18 kHz)
    over the engine at idle."""
    m = Mix()
    m.add(0.4 * diesel(c.sub('d'), 1.6, 32.0, load=0.2))
    for k in range(3):
        m.add(0.7 * beep(1180.0, 0.28, attack_ms=8.0, release_ms=12.0), 0.05 + 0.5 * k)
    c.accent(0.05)
    return m.out()


@yard_recipe('hook_swap', length=2.6, loud_db=0.0)
def hook_swap(c):
    """The hook-lift swap: the arm's hydraulics, its hook catching the skip's bar (a heavy clank), the
    skip dragging up its rollers onto the chassis and seating."""
    m = Mix()
    m.add(0.5 * hydraulic(c.sub('h'), 2.3, 210.0, 290.0) * points([(0, 0.0), (0.15, 1.0), (2.1, 1.0), (2.3, 0.0)], ns(2.3)))
    m.add(0.9 * metal(c.sub('hook'), 260.0, CASTING, 0.07, 0.4, click=0.8), 0.5)
    n = ns(1.2)
    drag = band(white(n, c.sub('dr')), 300.0, 2200.0) * wobble(c.sub('w'), n, 15.0, 0.5) * points([(0, 0.0), (0.1, 1.0), (1.1, 0.8), (1.2, 0.0)], n)
    m.add(0.45 * drag, 0.8)
    m.add(0.9 * metal(c.sub('seat'), 150.0, PLATE, 0.1, 0.5, tau_fall=0.8, click=0.5), 2.05)
    m.add(0.6 * concrete(c.sub('c'), 0.2, 1.5, 0.3, 80.0), 2.05)
    c.accent(0.5, 2.05)
    return phone(m.out(), 380.0)


@yard_recipe('skip_tip', length=2.6, loud_db=LOUD)
def skip_tip(c):
    """The skip tipped on the tipping floor: the arm lifting, the load sliding out in a long crash of
    mixed scrap (sheet, cast pieces, a pipe's ring) and settling."""
    m = Mix()
    m.add(0.4 * hydraulic(c.sub('h'), 1.0, 240.0, 300.0) * points([(0, 0.0), (0.1, 1.0), (0.9, 1.0), (1.0, 0.0)], ns(1.0)))
    rng = c.sub('crash')
    t = 0.7
    while t < 2.0:
        kind = rng.randint(3)
        if kind == 0:
            x = metal(rng, rng.uniform(250.0, 450.0), PLATE, 0.06, 0.3, tau_fall=0.8, click=0.5)
        elif kind == 1:
            x = metal(rng, rng.uniform(350.0, 600.0), CASTING, 0.03, 0.2, click=0.8)
        else:
            x = 0.6 * metal(rng, rng.uniform(900.0, 1500.0), BAR, 0.12, 0.4, click=0.3)
        m.add(rng.uniform(0.4, 1.0) * x, t)
        t += rng.exponential(0.06)
    m.add(0.7 * concrete(c.sub('c'), 0.3, 2.0, 0.5, 70.0), 0.75)
    m.add(0.4 * grit(c.sub('g'), 1.6, 300.0, 1200.0, 5000.0, tau=0.003,
                     env=points([(0, 0.0), (0.1, 1.0), (1.0, 0.5), (1.6, 0.0)], ns(1.6))), 0.7)
    c.accent(0.75)
    return phone(m.out(), 380.0)


# ===========================================================================
# the industry table
# ===========================================================================

@yard_recipe('chip_slide', loud_db=0.0)
def chip_slide(c):
    """A rival passed: the enamel name plate slides along its steel rail and clicks into the slot above."""
    m = Mix()
    n = ns(0.25)
    sl = band(white(n, c.sub('s')), 1200.0, 4200.0) * wobble(c.sub('w'), n, 50.0, 0.3) * points([(0, 0.0), (0.04, 1.0), (0.2, 0.7), (0.25, 0.0)], n)
    m.add(0.45 * sl)
    m.add(0.8 * metal(c.sub('k'), 1250.0, (1.0, 1.8, 2.7), 0.025, 0.12, click=0.8), 0.25)
    m.add(0.45 * metal(c.sub('ring'), c.hz('E6'), BAR, 0.15, 0.4, amps=(1.0, 0.3, 0.1), spread=0.002, click=0.1), 0.26)
    c.accent(0.25)
    return m.out()


@yard_recipe('rung_sign', length=2.6, loud_db=BIG)
def rung_sign(c):
    """A rung: the crane hangs the yard's new sign: the big steel sign stops on its chains (they
    rattle under it) and rings low and long (a plate tuned to E3, partials up to B5), the chains settle."""
    m = Mix()
    ch = grit(c.sub('ch'), 0.35, 70.0, 1500.0, 5500.0, tau=0.015, amp_spread=0.7, env=points([(0, 0.6), (0.25, 1.0), (0.35, 0.4)], ns(0.35)))
    m.add(0.6 * ch)
    f0 = c.hz('E3')
    sign = metal(c.sub('sign'), f0, (1.0, 2.0, 3.0, 4.0, 5.04, 6.0), 0.9, 2.0, amps=(0.5, 0.8, 0.7, 0.6, 0.45, 0.4),
                 tau_fall=0.85, spread=0.003, click=0.4)
    m.add(1.0 * sign, 0.02)
    m.add(0.4 * metal(c.sub('hi'), c.hz('B5'), BAR, 0.6, 1.5, amps=(1.0, 0.2), spread=0.001, click=0.0), 0.04)
    m.add(0.3 * grit(c.sub('ch2'), 0.5, 30.0, 1500.0, 5500.0, tau=0.015, env=points([(0, 1.0), (0.5, 0.0)], ns(0.5))), 0.4)
    c.accent(0.02)
    return phone(m.out(), 300.0)


# ===========================================================================
# the loading animation (yard-stage1.md 6.4; src/ui/salvage/loading/timeline.ts)
# ===========================================================================

@yard_recipe('load_crane', loud_db=QUIET)
def load_crane(c):
    """The gantry's trolley running in (0.6 s): its wheels rumbling over the rail joints and the
    travel motor's whine rising and settling."""
    dur = 0.6
    n = ns(dur)
    m = Mix()
    m.add(0.6 * hydraulic(c.sub('m'), dur, 380.0, 520.0, hiss_gain=0.1) * points([(0, 0.0), (0.08, 1.0), (0.5, 0.8), (dur, 0.0)], n))
    for k, at in enumerate((0.1, 0.27, 0.44)):
        m.add(0.5 * metal(c.sub('j%d' % k), 520.0, PLATE, 0.02, 0.1, click=0.6), at)
    m.add(0.3 * band(white(n, c.sub('r')), 300.0, 1500.0) * points([(0, 0.0), (0.1, 1.0), (dur, 0.0)], n))
    c.accent(0.1)
    return m.out()


@yard_recipe('load_clank', loud_db=LOUD)
def load_clank(c):
    """A title plate set down on the weighbridge deck: a thick steel plate's clank on steel (three
    files, three plates of different size), the deck answering."""
    v = c.var
    m = Mix()
    f0 = (430.0, 480.0, 390.0)[v % 3]
    m.add(metal(c.sub('p'), f0, PLATE, 0.06, 0.6, tau_fall=0.85, spread=0.08, click=1.0))
    m.add(0.5 * grit(c.sub('gr'), 0.15, 300.0, 1200.0, 5000.0, tau=0.003, env=points([(0, 1.0), (0.15, 0.0)], ns(0.15))))
    m.add(0.4 * metal(c.sub('p2'), f0 * 1.02, PLATE, 0.04, 0.3, tau_fall=0.8, spread=0.03, click=0.8), 0.055 + 0.01 * v)
    m.add(0.7 * concrete(c.sub('c'), 0.2, 1.6, 0.4, 85.0))
    c.accent(0.0)
    return phone(m.out(), 380.0)


@yard_recipe('load_beeps', loud_db=QUIET)
def load_beeps(c):
    """The weighbridge display counting up a plate's kilograms (0.35 s): a run of digit ticks slowing to
    one settle beep (E7)."""
    m = Mix()
    t = 0.0
    for k in range(7):
        m.add(0.25 * beep(2600.0, 0.008, attack_ms=0.5, release_ms=3.0), t)
        t += 0.028 + 0.006 * k
    m.add(0.5 * beep(c.hz('E7'), 0.06), t + 0.02)
    c.accent(0.0)
    return m.out()


@yard_recipe('load_pour', length=1.0, loud_db=0.0)
def load_pour(c):
    """The loading crucible tips and pours (1.0 s): a short burner swell, then the stream's hiss into
    the mould with two glugs."""
    dur = 1.0
    n = ns(dur)
    m = Mix()
    m.add(0.5 * burner(c.sub('b'), dur, 0.8) * points([(0, 0.0), (0.2, 1.0), (dur, 0.0)], n))
    m.add(0.8 * hiss(c.sub('h'), 0.8, 1800.0, 6000.0, 16.0, 0.4) * points([(0, 0.0), (0.05, 1.0), (0.8, 0.0)], ns(0.8)), 0.2)
    for k, at in enumerate((0.3, 0.52)):
        nn = ns(0.08)
        tt = np.arange(nn) / SR
        f = (320.0, 380.0)[k] * (1.0 + 0.8 * tt / 0.08)
        m.add(0.4 * band(np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.08) ** 2, 250.0, 2500.0), at)
    c.accent(0.2)
    return m.out()[:n]


@yard_recipe('load_cool', loud_db=QUIET)
def load_cool(c):
    """The loading animation's bar cooled to brass (requested by the loading engineer): the last of the
    sizzle and one bright glint ping (B6)."""
    m = Mix()
    n = ns(0.5)
    m.add(0.6 * hiss(c.sub('h'), 0.5, 2500.0, 6500.0, 9.0, 0.3) * points([(0, 1.0), (0.5, 0.0)], n, 1.5))
    m.add(0.6 * metal(c.sub('g'), c.hz('B6'), BAR, 0.25, 0.7, amps=(1.0, 0.15), spread=0.0, click=0.1, attack_ms=2.0), 0.15)
    c.accent(0.15)
    return m.out()


@yard_recipe('load_loop', length=2.0, loud_db=AMBIENT)
def load_loop(c):
    """The calm loop (2.0 s segment, chained every 2 s while the bakes finish): the parked magnet's
    rope creaking as it sways, the furnace breathing low, one soft glint ping (E7)."""
    dur = 2.0
    n = ns(dur)
    m = Mix()
    m.add(0.5 * burner(c.sub('b'), dur, 0.1) * wobble(c.sub('br'), n, 0.6, 0.3))
    t = np.arange(ns(0.35)) / SR
    cr = reso(np.sign(np.sin(TAU * (45.0 + 25.0 * t) * t)), [(800.0, 8.0, 1.0), (1700.0, 9.0, 0.5)]) * np.sin(np.pi * t / 0.35) ** 2
    m.add(0.25 * cr, 0.3)
    m.add(0.35 * metal(c.sub('g'), c.hz('E7'), BAR, 0.2, 0.5, amps=(1.0,), spread=0.0, click=0.0, attack_ms=3.0), 1.2)
    y = m.out()[:n]
    c.accent(0.0)
    return y * seg_env(len(y), 150.0, 150.0)


@yard_recipe('gate_open', loud_db=0.0)
def gate_open(c):
    """The picture parts like two gate leaves: the yard gate's two steel leaves rolling apart on their
    wheels (0.45 s) and stopping with a clack against their posts."""
    m = Mix()
    n = ns(0.45)
    roll = band(white(n, c.sub('r')), 350.0, 2200.0) * wobble(c.sub('w'), n, 35.0, 0.4) * points([(0, 0.0), (0.05, 1.0), (0.4, 0.8), (0.45, 0.0)], n)
    m.add(0.6 * roll)
    m.add(0.7 * metal(c.sub('a'), 470.0, PLATE, 0.05, 0.3, click=0.7), 0.42)
    m.add(0.55 * metal(c.sub('b'), 505.0, PLATE, 0.05, 0.3, click=0.7), 0.45)
    c.accent(0.0, 0.42)
    return m.out()


# ===========================================================================
# the yard around you
# ===========================================================================

@yard_recipe('amb_yard', length=8.0, loud_db=AMBIENT)
def amb_yard(c):
    """The yard's surroundings (8.0 s segment, three files taking turns, chained every 7.5 s): distant
    traffic swelling and fading, a few small birds on the fence, and in one file a far reverse
    beeper across the estate."""
    dur = 8.0
    n = ns(dur)
    v = c.var
    m = Mix()
    m.add(0.5 * traffic(c.sub('tr'), dur))
    rng = c.sub('birds')
    t = rng.uniform(0.3, 1.2)
    while t < dur - 0.6:
        m.add(0.35 * bird(rng, rng.uniform(3000.0, 4400.0), n_notes=rng.randint(2, 5)), t)
        t += rng.uniform(1.4, 3.2)
    if v == 1:
        m.add(0.12 * far_beeper(c.sub('fb'), 3.0, start=0.2), 3.5)
    y = m.out()[:n]
    c.accent(0.0)
    return y * seg_env(len(y), 500.0, 500.0)


# ===========================================================================
# the event table (yard-stage1.md 7, in the shape of src/services/fx/catalog.salvage.ts)
# key: (volume, minimum interval ms, haptic, brief, voices, preload rank or None)
# ===========================================================================

MUSIC_KEYS = ('music_main',)          # "yard radio" (yard_music.py), the loop the shared player starts

EVENTS = {
    # the walk
    'step_concrete': (0.25, 150, None, 'a work boot on concrete: heel tap with a thin scuff, the toe after; four files, random', 2, 3),
    'step_gravel': (0.25, 150, None, 'a boot on gravel: a soft heel under a crunch of stones; four files, random', 2, 4),
    'step_asphalt': (0.25, 150, None, 'a boot on asphalt: a duller heel, no grit; four files, random', 2, 5),
    # working a thing (segments: the screen plays them every SEGMENT_MS while the work lasts)
    'cut_spanner': (0.5, 450, None, 'spanners and bolt cutters, a 0.55 s segment: ratchet clicks, a bolt squeal, a tap on the panel; chained every 500 ms; two files', 2, 6),
    'cut_sledge': (0.6, 650, None, 'the sledgehammer on cast iron, one blow (0.7 s): the swing, the dull heavy clank, dust; chained every 700 ms; two files', 2, 7),
    'cut_grinder': (0.5, 700, None, 'the angle grinder\'s short bite (0.8 s): disc at speed, pressed in (its note drops, sparks), lifted; chained every 750 ms; two files', 2, 8),
    'cut_torch': (0.45, 1050, None, 'the cutting torch (1.2 s segment): preheat roar, the oxygen jet, slag pops; chained every 1100 ms; two files', 2, 9),
    # pieces coming off, by family (light haptic: a finished piece, yard-stage1.md 7)
    'piece_steel': (0.55, 90, ['light'], 'a sheet-steel panel landing: a wobbly flat clang and a bounce on concrete (steel clunk); three files, random', 2, 10),
    'piece_cast': (0.6, 90, ['light'], 'a cast-iron section: iron\'s dull clank, no ring, a heavy thud; three files, random', 2, 11),
    'piece_alu': (0.5, 90, ['light'], 'an aluminium wheel or end cap: a light hollow tonk; three files, random', 2, 12),
    'piece_copper': (0.5, 90, ['light'], 'copper: a bright ring (a tube\'s bar modes in E major, B5/G#5/C#6), 0.5 s; three files, random', 2, 13),
    'piece_brass': (0.5, 90, ['light'], 'brass taps and fittings: a warmer ring than copper, two or three fittings clattering; three files, random', 2, 14),
    'thud_waste': (0.5, 150, ['light'], 'the concrete counterweight into the rubble skip: a dead heavy thud, stones skittering; two files, random', 1, 15),
    # the hand
    'pickup': (0.4, 120, None, 'a piece lifted onto the carry frame: a glove scrape and a small clink; three files, random', 2, 16),
    'swap': (0.45, 300, None, 'the swap: the cheaper piece knocked down, the better one clinked up', 1, 17),
    'load_full': (0.5, 1000, None, 'load full: the frame\'s strap cinched (two ratchet clicks, the webbing pulled tight)', 1, 18),
    'feed': (0.45, 200, None, 'pieces down a hopper\'s chute: a rasp and a hollow knock; two files, random', 2, 19),
    # weighing and tickets
    'scale_beeps': (0.5, 400, None, 'weighed in: the scale\'s relay, the display counting, two piezo beeps (B6, E7)', 1, 20),
    'scale_print': (0.4, 600, None, 'the scale house\'s dot-matrix printer: three lines, line feeds, the ticket torn off', 1, 21),
    'slip': (0.45, 400, None, 'the drop-off slip torn from the pad and stamped', 1, 22),
    # the round and the money (medium haptic on a collection, yard-stage1.md 7)
    'flatbed_arrive': (0.4, 3000, None, 'the merchant\'s diesel flatbed back at its stand: slowing to idle, the air brake\'s hiss', 1, None),
    'flatbed_load': (0.45, 2500, None, 'the flatbed\'s crane loading the bay (3 s): pump whine, the grab\'s rattle, the deep clank on the bed', 1, None),
    'coin': (0.45, 200, ['medium'], 'paid by transfer: the cash counter\'s number wheels turning over and settling with a steel tick; three files, random', 1, 1),
    'coin_big': (0.55, 400, ['medium'], 'a big collection: the counter rolling longer, two struck steel bars ringing an open fifth (E5, B5)', 1, 2),
    'lesson': (0.35, 1500, None, 'a lesson on the ticket: a soft bell (a small steel bowl, G#5, padded beater)', 1, 23),
    'deal_stamp': (0.5, 400, None, 'a deal delivery stamped: a rubber stamp\'s thump and its handle\'s knock', 1, None),
    # interface
    'ui_open': (0.4, 60, None, 'a card opens: a clipboard\'s spring clip lifted (a click, the spring\'s short buzz)', 1, 24),
    'ui_close': (0.35, 60, None, 'the card closes: the clipboard laid on the cabin desk (a hollow plywood tok, the sheets settling)', 1, 25),
    'buy': (0.55, 150, ['medium'], 'bought: a ticket punch\'s crunch and the steel tag hung on the rack\'s hook (a stamped plate around A5)', 2, 26),
    'denied': (0.5, 300, ['light'], 'refused: a gloved fist on a steel cabinet door, twice, dull', 1, 27),
    'goal_tick': (0.4, 500, None, 'a goal done (my key): a carpenter\'s pencil ticking the clipboard', 1, None),
    # arrivals and hires
    'van': (0.45, 2000, None, 'the delivery van at the tool rack: a petrol engine slowing, the sliding door rolling open', 1, None),
    'set_down': (0.5, 500, None, 'a thing set down on the concrete at the drop-off: a weight on its feet, a clank', 1, None),
    'crane_set': (0.55, 2000, None, 'a machine set on its pad by the flatbed\'s crane: pump lowering, a deep clunk, chains going slack', 1, None),
    'door': (0.4, 800, None, 'the portacabin door: lever handle, the light door swinging, a hollow knock on its frame', 1, None),
    'crew_hello': (0.4, 2000, None, 'a new hand\'s hummed "mm-hm" (G#4 down to E4)', 1, None),
    # machines working (segments)
    'stripper_hand': (0.4, 700, None, 'the hand stripper cranked (0.8 s segment): gear clicks, the blade slitting PVC; chained every 750 ms; two files', 2, 28),
    'stripper_power': (0.35, 900, None, 'the powered stripper (1.0 s segment): motor hum, rollers, the blade; chained every 950 ms', 2, None),
    'bench_knock': (0.4, 550, None, 'the motor bench (0.6 s segment): hammer and chisel on a motor casing, two knocks; chained every 600 ms; two files', 2, None),
    # the crucible
    'furnace_roar': (0.4, 1800, None, 'the crucible\'s burner (2.0 s segment), a ladder of heat (0 lit, 1 half, 2 pouring heat); chained every 1900 ms', 2, None),
    'ready_chime': (0.5, 3000, None, 'ready to pour: the burner turned down and the crucible\'s steel signal bar rapped three times (B5)', 1, None),
    'pour_glug': (0.6, 2000, None, 'the pour: a thick hiss and sizzle, low glugs, sparkle where it splashes (2 s)', 1, 29),
    'cool_ticks': (0.4, 2000, None, 'the bar cooling: the sizzle fading, then metal ticking as it contracts (2.6 s)', 1, None),
    # the truck and the skips
    'truck_diesel': (0.35, 900, None, 'the hook-lift truck\'s diesel (1.0 s segment), a ladder of speed (0 idle, 1 driving, 2 pulling); chained every 950 ms', 2, 30),
    'truck_reverse': (0.4, 1500, None, 'reversing over the weighbridge: three reverse-alarm bursts (1.18 kHz) over the idle', 1, None),
    'hook_swap': (0.5, 2500, None, 'the hook-lift swap: hydraulics, the hook\'s clank on the skip bar, the skip dragged up and seated', 1, None),
    'skip_tip': (0.55, 2500, None, 'the skip tipped: the arm lifting, a long crash of mixed scrap sliding out', 1, None),
    # the industry table (success haptic on a rung, yard-stage1.md 7)
    'chip_slide': (0.5, 1000, None, 'a rival passed: the enamel name plate sliding along its rail and clicking into the slot above', 1, None),
    'rung_sign': (0.65, 3000, ['success'], 'a rung: the crane hangs the new sign; it stops on its chains and rings low and long (E3)', 1, None),
    # the loading animation
    'load_crane': (0.45, 400, None, 'loading: the gantry trolley running in, wheels over rail joints, the motor\'s whine', 1, 31),
    'load_clank': (0.6, 300, None, 'loading: a title plate set down on the weighbridge deck (a thick plate\'s clank); three files, random', 1, 32),
    'load_beeps': (0.4, 300, None, 'loading: the display counting a plate\'s kilograms, a settle beep (E7)', 1, 33),
    'load_pour': (0.55, 800, None, 'loading: the crucible tips and pours: a burner swell, the stream\'s hiss, two glugs', 1, 34),
    'load_cool': (0.45, 800, None, 'loading: the bar cooled to brass: the last sizzle and one glint ping (B6) (requested by the loading engineer)', 1, 35),
    'load_loop': (0.35, 1900, None, 'loading\'s calm loop (2.0 s segment): the magnet\'s rope creaking, the furnace breathing, a soft glint; chained every 2 s', 2, None),
    'gate_open': (0.55, 800, None, 'the picture parts: the yard gate\'s two leaves rolling apart and clacking against their posts', 1, 36),
    # the yard around you
    'amb_yard': (0.25, 7000, None, 'the yard\'s surroundings (8 s segment): distant traffic, small birds, a far reverse beeper in one file; chained every 7.5 s', 2, None),
    # music
    'music_main': (0.22, None, None, '"yard radio": 92 bpm in E, mellow clean electric guitar and fingered bass over the yard\'s own metal hits, two variants crossfaded inside one 89 s loop; sparse', 1, None),
}

FILES = {
    'step_concrete': 4, 'step_gravel': 4, 'step_asphalt': 4,
    'cut_spanner': 2, 'cut_sledge': 2, 'cut_grinder': 2, 'cut_torch': 2,
    'piece_steel': 3, 'piece_cast': 3, 'piece_alu': 3, 'piece_copper': 3, 'piece_brass': 3, 'thud_waste': 2,
    'pickup': 3, 'feed': 2, 'coin': 3,
    'stripper_hand': 2, 'bench_knock': 2, 'stripper_power': 2,
    'load_clank': 3, 'load_loop': 2, 'amb_yard': 3,
    'furnace_roar': 3, 'truck_diesel': 3,          # ladders (pick: 'ladder')
}
LADDERS = ('furnace_roar', 'truck_diesel')

# Effects written as .m4a (mono AAC) rather than .wav: the long ones, where a .wav would cost the budget
# (8 s of ambience is 700 KB as .wav, about 50 KB as AAC). Short sounds stay .wav (no codec delay).
M4A = ('amb_yard', 'furnace_roar', 'flatbed_arrive', 'flatbed_load', 'van', 'crane_set', 'hook_swap', 'skip_tip',
       'rung_sign', 'pour_glug', 'cool_ticks', 'truck_reverse', 'cut_torch', 'load_loop', 'scale_print', 'ready_chime',
       'lesson', 'stripper_power', 'truck_diesel', 'coin_big', 'load_pour', 'load_cool', 'load_crane', 'chip_slide',
       'gate_open', 'door', 'crew_hello', 'stripper_hand', 'cut_grinder', 'scale_beeps')
M4A_KBPS = 64

# The interval at which the screen chains a segment while its work lasts (soundKeys.ts SEGMENT_MS mirrors it;
# render_yard.py --check fails when they disagree).
SEGMENT_MS = {
    'cut_spanner': 500, 'cut_sledge': 700, 'cut_grinder': 750, 'cut_torch': 1100,
    'stripper_hand': 750, 'stripper_power': 950, 'bench_knock': 600,
    'furnace_roar': 1900, 'truck_diesel': 950, 'load_loop': 2000, 'amb_yard': 7500,
}

# Segments of separate blows: silence between two plays is the sound (a sledge is swung, not held).
GAPPED = ('cut_spanner', 'cut_sledge', 'bench_knock')

# The shared keys the store and the shared kit play, mapped onto this table (src/modes/salvage/soundKeys.ts).
SHARED_SOUNDS = {
    'ui_denied': 'denied',
    'ui_open': 'ui_open',
    'ui_close': 'ui_close',
    'buy': 'buy',
    'purchase_success': 'buy',
    'unlock': 'buy',
    'hire': 'crew_hello',
    'milestone': 'rung_sign',
    'offline_collect': 'coin_big',
    'mission_complete': 'goal_tick',
    'story_open': 'ui_open',
    'deal_popup': 'ui_open',
}


def file_stems(key):
    n = FILES.get(key, 1)
    return [key] if n == 1 else ['%s_%d' % (key, i) for i in range(1, n + 1)]


def key_of(stem):
    head, _, tail = stem.rpartition('_')
    return head if tail.isdigit() and head in FILES else stem


def ext_of(key):
    return 'm4a' if key_of(key) in M4A else 'wav'


# Sounds that repeat fast, with the interval they repeat at in play (render_yard.py --rows).
ROW_KEYS = {
    'step_concrete_1': 380, 'step_gravel_1': 380, 'piece_steel_1': 400, 'piece_copper_1': 400, 'piece_cast_1': 400,
    'pickup_1': 250, 'coin_1': 200, 'cut_spanner_1': 500, 'cut_sledge_1': 700, 'cut_grinder_1': 750, 'bench_knock_1': 600,
    'stripper_hand_1': 750, 'feed_1': 300,
}
