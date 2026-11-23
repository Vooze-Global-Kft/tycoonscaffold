"""High Office ("Proudly Adequate", mode "decree"): one recipe per sound key, and the instruments.

Written for this game from docs/design/office-design.md section 6. Character: wood, brass, a pen
nib, pneumatic air, a wire tray, a creaking drawer and a distant bandstand: a small-town office,
dry and a little pompous.

This module imports dsp.py and nothing else of scripts/audio: never recipes.py (Pizza Empire),
recipes_haul.py (Orbit Haulers), recipes_night.py (Lantern Row) or packs.py (the timbres the
first two are rendered on). Every instrument below is built here from dsp primitives (noise,
impulse trains, biquads, modal banks, additive voices):

  nib()            a steel pen nib on paper: impulses of the paper's tooth at a rate that follows
                   the pen's speed, each ringing the two tines of the nib and the sheet: for the
                   signature low, soft tines (1.46 to 1.95 kHz, Q 6) kept to 0.9 to 3.4 kHz; for the
                   Ledger's tick the original bright tines (2.65 and 3.9 kHz): a scratch, not a grain cloud
  wire_clink()     the wire out-tray: a few thin brass rods struck (free-free bar modes 1, 2.76,
                   5.40), damped by the paper landing on them
  card_slap()      card stock laid on a hard surface: one fat broadband transient
  creak()          wood creaking: a stick-slip pulse train (40 to 110 a second) ringing three wood
                   resonances: a buzz with a pitch, not a rub
  wood_body()      a wooden box or desk top struck: damped plate modes and a knock click
  desk_tap()       a knuckle on the desk; door_knock() a knuckle on a door with a glass panel
  brass()          tuba, euphonium, trombone, cornet: additive, the upper harmonics growing with the
                   level (a brass bell gets brighter as it gets louder), a lip scoop into pitch,
                   a buzz at the attack; optional cup mute and slide
  clarinet()       odd harmonics, a little breath
  bassoon()        two nasal formants (440 Hz, 1.15 kHz), a reed buzz
  kazoo()          a hummed voice through a buzzing membrane (soft clipping + membrane formants)
  pizz()           a string stopped and plucked by a finger: a modal string (harmonic partials,
                   the higher ones dying faster) through a wooden body; music only (the spec asks
                   for pizzicato in the desk loop; no Karplus-Strong, nothing of the first game)
  snare(), snare_roll(), bass_drum(), clash(), brush_tap(), brush_sweep()   the bandstand
  hand_bell()      a brass hand bell swung twice (tuned to its fundamental and twelfth)
  gavel()          a hardwood gavel on its block
  shutter()        a press camera: release, leaf shutter, spring, film-advance ratchet
  scissors()       two blades sliding and closing
  chalk()          chalk on a slate: a tap and a gritty stroke
  tube_air()       pneumatic tube air: noise through the tube's own resonances (a comb, fixed),
                   never a swept filter; at high Q (ui_open) the tube's hollow note
  latch()          a brass latch or bolt
  brass_coin()     a heavy coin set down on wood (two contacts, a short brass ring)
  newspaper_slap() a folded newspaper slapped on the desk

What is not in this pack (spec 6 and the other three games): no plucked-string instrument in the
effects, no marimba, no bell ladder, no cash register or till, no pulse blips, no radio squelch,
no FM glass, no steam, no felt, no clay, no hand drum, no free reed, no swept band-pass whoosh, no
chiptune. Paper is present only as short transients (spec 6: Lantern Row's world is paper).

Pitched sounds are in B-flat major, the brass band's key (c.hz() refuses a note outside it; glides
and noise are unpitched). Pizza Empire is in C pentatonic, Orbit Haulers in A pentatonic, Lantern
Row in D dorian and G lydian.

A recipe returns a mono float array; render_office.py masters it with dsp.master exactly as the
other three packs are mastered (EQ guard, trim, fades, DC, loudness target plus the tier, limiter).
"""
from __future__ import annotations

import math

import numpy as np

from dsp import (SR, TAU, Mix, bandpass, bq, butter, filt, harmonics, highpass, lowpass, midi, modal, mtof, ns, perc, phase,
                 points, rcos_in, rcos_out, rng_for, white, colored)

OFFICE_RECIPES = {}

BIG = 2.0          # loudness tiers, dB on the mastering target (the convention of the other three packs)
LOUD = 1.0
FREQUENT = -2.0
QUIET = -4.0

SCALE_PCS = (10, 0, 2, 3, 5, 7, 9)       # B-flat major: Bb C D Eb F G A
SCALE_NAME = 'B-flat major'


def office_recipe(name, length=None, stream_ms=None, loud_db=0.0):
    """Register a recipe of this game. length (s) caps the file with a long fade; stream_ms
    measures loudness on the sound repeated at that interval; loud_db is the tier."""
    def deco(fn):
        fn.length = length
        fn.stream_ms = stream_ms
        fn.loud_db = float(loud_db)
        fn.office = True
        if name in OFFICE_RECIPES:
            raise ValueError('two office recipes for %r' % name)
        OFFICE_RECIPES[name] = fn
        return fn
    return deco


def hz(name, strict=True):
    """A note name -> Hz; with strict, a note outside B-flat major is refused."""
    m = midi(name)
    if strict and int(round(m)) % 12 not in SCALE_PCS:
        raise ValueError('%s is not in %s' % (name, SCALE_NAME))
    return mtof(m)


class OfficeCtx:
    """What a recipe gets: its key, a private random stream named after it, the accents list."""

    def __init__(self, key):
        self.key = key
        self.rng = rng_for('office', key)
        self.accents = []
        self.notes = []
        self.floor_db = -50.0
        self.length = None

    def accent(self, *times):
        self.accents.extend(float(t) for t in times)

    def sub(self, tag):
        return rng_for('office', self.key, tag)

    def hz(self, name):
        self.notes.append(name)
        return hz(name)


# ===========================================================================
# small helpers
# ===========================================================================

def band(x, lo, hi, order=2):
    """Band-limit: a high-pass at lo (order), a 4th-order low-pass at hi."""
    return filt(x, butter('hp', lo, order) + butter('lp', hi, 4))


def reso(x, parts):
    """x through parallel resonators [(fc, q, gain), ...] (RBJ band-pass, 0 dB peak each)."""
    out = np.zeros(len(x))
    for fc, q, g in parts:
        out += g * filt(x, bq('bp', fc, q))
    return out


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


def soft(x, drive=2.0):
    """A gentle tanh saturation of x scaled to unit peak; back at unit peak."""
    pk = np.max(np.abs(x)) + 1e-12
    return np.tanh(drive * x / pk) / math.tanh(drive)


def wobble(rng, n, rate_hz, depth):
    """Slow random movement 1 +- depth, smooth at about rate_hz."""
    m = lowpass(rng.standard_normal(n + ns(0.2)), rate_hz, 2)[:n]
    m /= (np.std(m) + 1e-12)
    return np.clip(1.0 + depth * m, 0.0, None)


def impulses(n, times, amps, width=1):
    """A sparse impulse train: unit-ish clicks (width samples, alternating sign inside) at times."""
    y = np.zeros(n)
    for t, a in zip(times, amps):
        i = int(t * SR)
        if 0 <= i < n - width:
            y[i] += a
            if width > 1:
                y[i + 1:i + width] -= a / (width - 1)
    return y


def rate_times(rng, rate_fn, dur, jitter=0.25):
    """Onsets of an event stream whose rate (per second) follows rate_fn(t); gaps jittered."""
    t, out = 0.0, []
    while t < dur:
        r = max(rate_fn(t), 1.0)
        out.append(t)
        t += (1.0 / r) * rng.uniform(1.0 - jitter, 1.0 + jitter)
    return out


# ===========================================================================
# instruments: desk, pen, tray, drawer
# ===========================================================================

NIB_TINES = ((2650.0, 12.0, 1.0), (3900.0, 10.0, 0.5), (1250.0, 2.2, 0.8), (1900.0, 4.0, 0.35))


def nib(rng, dur, strokes=7.0, press=None, tooth=1800.0, squeak=1.0, lift=None, tines=NIB_TINES, width=2,
        scratch_band=(2400.0, 4800.0), lp=4800.0, keep=None):
    """A steel nib writing: the pen's speed rises and falls with each letter stroke (`strokes` a
    second); the paper's tooth gives impulses at tooth x speed a second, each ringing the nib's
    two tines and the sheet (`tines`, default NIB_TINES), with a little dry scratch noise riding the
    speed. press [(s, v)] shapes the pressure; lift [(s0, s1)] lifts the pen off the paper between
    letters. width 1 gives flat-spectrum impulses (2, the default, tilts them up); keep (lo, hi)
    band-limits the result steeply (a 4th-order high-pass, an 8th-order low-pass)."""
    n = ns(dur)
    t = np.arange(n) / SR
    ph0 = rng.uniform(0, TAU)
    speed = 0.25 + 0.75 * np.abs(np.sin(np.pi * strokes * t + ph0)) ** 1.4
    speed *= wobble(rng, n, 9.0, 0.18)
    if press is None:
        press = [(0, 0.6), (dur * 0.3, 1.0), (dur, 0.8)]
    pr = points(press, n)
    if lift:
        for a, b in lift:
            pr *= 1.0 - points([(0, 0), (max(a - 0.004, 0), 0), (a, 1), (b, 1), (b + 0.004, 0), (dur + 1, 0)], n)
    sp_at = lambda tt: float(np.interp(tt, t, speed * (pr > 0.05)))
    times = rate_times(rng, lambda tt: tooth * max(sp_at(tt), 0.02), dur, 0.45)
    amps = [float(np.interp(tt, t, pr * speed)) * math.exp(rng.normal(0.0, 0.5)) * (1 if rng.uniform() < 0.5 else -1) for tt in times]
    imp = impulses(n, times, amps, width)
    tines = list(tines)
    tines[0] = (tines[0][0], tines[0][1], tines[0][2] * squeak)
    y = filt(reso(imp, tines), butter('lp', lp, 4))
    scratch = band(white(n, rng), scratch_band[0], scratch_band[1], 2) * (pr * speed) ** 1.5
    out = norm(y) + 0.1 * scratch
    if keep:
        out = filt(out, butter('hp', keep[0], 4) + butter('lp', keep[1], 8))
    return out


def wire_clink(rng, vel=1.0, rods=3, f0=(1150.0, 1650.0), spread=0.016, damp=1.0, settle=0.0):
    """The wire out-tray: `rods` thin brass rods struck within `spread` seconds; each a free-free
    bar (modes 1, 2.756, 5.404) damped by the paper resting on it (damp > 1 shortens them).
    settle > 0: the tray settles that many seconds later and half the rods touch again, softer."""
    n = ns(0.22)
    m = np.zeros(n)
    times = np.sort(rng.uniform(0.0, spread, rods))
    times[0] = 0.0
    if settle:
        times = np.concatenate([times, settle + np.sort(rng.uniform(0.0, spread * 0.6, max(rods // 2, 1)))])
    for j, tt in enumerate(times):
        f = rng.uniform(*f0)
        a = rng.uniform(0.6, 1.0) * (0.55 if tt >= settle > 0 else 1.0)
        parts = [(f, 1.0, 0.055 / damp, 0.3, rng.uniform(0, TAU)),
                 (f * 2.756, 0.75, 0.03 / damp, 0.2, rng.uniform(0, TAU)),
                 (f * 5.404, 0.4, 0.014 / damp, 0.1, rng.uniform(0, TAU))]
        i = int(tt * SR)
        seg = modal(parts, n - i)
        m[i:] += a * seg
    tick = band(white(n, rng), 3000.0, 6000.0, 2) * perc(n, 0.05, 0.0009)
    return vel * (m + 0.5 * tick)


def card_slap(rng, vel=1.0, weight=1.0, bright=1.0):
    """Card stock laid flat on a hard surface: a fat, short broadband slap (the air pressed out
    from under it) with a low push and a crisp edge. 30 ms, no rustle."""
    n = ns(0.05)
    body = band(colored(n, rng, -1.0), 350.0, 2600.0 * bright, 2) * perc(n, 0.3, 0.006 * weight)
    push = lowpass(white(n, rng), 300.0, 2) * perc(n, 1.0, 0.012 * weight)
    edge = band(white(n, rng), 2800.0, 5600.0, 2) * perc(n, 0.05, 0.0012)
    return vel * (1.6 * body + 1.2 * push + 0.5 * edge)


WOOD_DESK = ((145.0, 0.8, 0.03), (330.0, 1.0, 0.02), (470.0, 0.7, 0.016), (610.0, 0.8, 0.013), (790.0, 0.6, 0.011),
             (1050.0, 0.55, 0.009), (1310.0, 0.45, 0.007), (1720.0, 0.35, 0.006), (2150.0, 0.25, 0.004), (2650.0, 0.2, 0.003))


def wood_body(rng, modes=WOOD_DESK, vel=1.0, scale=1.0, damp=1.0, click=0.5):
    """A wooden board struck: damped plate modes (scaled by `scale`) and a knock click."""
    n = ns(0.18)
    parts = [(f * scale * rng.uniform(0.98, 1.02), a, tau / damp, 0.6, rng.uniform(0, TAU)) for f, a, tau in modes]
    y = modal(parts, n)
    k = band(white(n, rng), 1800.0, 4200.0, 2) * perc(n, 0.1, 0.0012)
    return vel * (y + click * k)


def desk_tap(rng, vel=1.0):
    """A knuckle on the desk: the desk top's many damped modes (the lowest thinned: a phone
    keeps nothing under 300 Hz), a dull flesh-on-wood thud of noise through the top."""
    n = ns(0.06)
    thud = reso(colored(n, rng, -1.0) * perc(n, 0.6, 0.01), ((700.0, 1.5, 1.0), (1500.0, 1.5, 0.6)))
    return highpass(wood_body(rng, WOOD_DESK, vel, 1.7, 1.3, 0.9), 480.0, 2) + 1.2 * vel * np.concatenate([norm(thud), np.zeros(ns(0.18) - n)])


DOOR = ((95.0, 0.6, 0.06), (180.0, 1.0, 0.045), (290.0, 0.8, 0.03), (520.0, 0.7, 0.018), (880.0, 0.45, 0.01), (1400.0, 0.3, 0.007))


def door_knock(rng, vel=1.0):
    """A knuckle on a panelled door with a glass pane: the door's low modes, a knock click, and
    the pane rattling in its frame (a few high damped modes, 2 to 3.5 kHz)."""
    n = ns(0.2)
    y = highpass(wood_body(rng, DOOR, 1.0, 1.8, 1.0, 1.2), 480.0, 2)
    glass = modal([(rng.uniform(2100, 2300), 0.5, 0.02, 1.0, 0.0), (rng.uniform(3200, 3500), 0.35, 0.012, 1.0, 0.0),
                   (rng.uniform(2700, 2900), 0.3, 0.015, 1.0, 0.0)], n)
    out = np.zeros(n)
    out[:len(y)] += y[:n]
    i = ns(0.004)
    out[i:] += 0.6 * glass[:n - i]
    return vel * out


def creak(rng, dur, rate_pts, res=((640.0, 7.0, 1.0), (1380.0, 6.0, 0.7), (2450.0, 5.0, 0.35)), env=None, jitter=0.18):
    """Wood creaking: a stick-slip pulse train whose rate follows rate_pts [(s, per second)],
    each slip a click that rings three wood resonances. It has a pitch (the slip rate) and a
    colour (the resonances): what a drawer runner or a door hinge does."""
    n = ns(dur)
    tt = np.arange(n) / SR
    rp = np.interp(tt, [p[0] for p in rate_pts], [p[1] for p in rate_pts])
    times = rate_times(rng, lambda x: float(np.interp(x, tt, rp)), dur, jitter)
    amps = [rng.uniform(0.6, 1.0) for _ in times]
    y = reso(impulses(n, times, amps, 3), res)
    if env is None:
        env = np.sin(np.pi * np.arange(n) / n) ** 0.8
    return norm(y) * env


def runner(rng, dur, env=None):
    """A wooden drawer's runners sliding: dry low-mid friction, fixed band (no sweep)."""
    n = ns(dur)
    y = band(colored(n, rng, -1.5), 250.0, 1600.0, 2)
    y = norm(y) * wobble(rng, n, 40.0, 0.35)
    if env is None:
        env = np.sin(np.pi * np.arange(n) / n) ** 1.2
    return y * env


DRAWER = ((120.0, 0.7, 0.05), (230.0, 1.0, 0.04), (410.0, 0.8, 0.025), (760.0, 0.6, 0.015), (1300.0, 0.45, 0.009),
          (2100.0, 0.25, 0.005))


def drawer_thunk(rng, vel=1.0, tune=1.0):
    """The drawer meeting its stop: a hollow wooden box struck from inside (tune scales the box)."""
    return highpass(wood_body(rng, DRAWER, vel, 1.9 * tune, 1.1, 1.0), 480.0, 2)


# ===========================================================================
# instruments: brass band and woodwinds
# ===========================================================================

def _formant(kf, forms):
    g = 0.0
    for fc, a, bw in forms:
        g = g + a / (1.0 + ((kf - fc) / bw) ** 2)
    return g


BRASS = {
    #           formants (Hz, gain, width)                     slope bright scoop vib   buzz
    'tuba': dict(forms=((300.0, 1.0, 180.0), (780.0, 0.6, 380.0)), slope=0.6, bright=0.6, scoop=-40.0, vib=0.0, buzz=0.06, floor=0.18),
    'euph': dict(forms=((420.0, 1.0, 220.0), (1000.0, 0.4, 420.0)), slope=0.8, bright=0.6, scoop=-30.0, vib=0.002, buzz=0.05, floor=0.15),
    'bone': dict(forms=((520.0, 1.0, 260.0), (1250.0, 0.6, 520.0)), slope=0.7, bright=0.75, scoop=-28.0, vib=0.003, buzz=0.06, floor=0.12),
    'cornet': dict(forms=((1050.0, 1.0, 500.0), (2300.0, 0.45, 800.0)), slope=0.75, bright=0.7, scoop=-22.0, vib=0.004, buzz=0.04, floor=0.12),
}

CUP_MUTE = [bq('hp', 420.0, 0.8), bq('peak', 1500.0, 2.2, 7.0), bq('peak', 2900.0, 3.0, 4.0), bq('lp', 4200.0, 0.7)]


def brass(f, dur, rng, kind='tuba', dyn=0.8, attack=0.035, release=0.09, env=None, fpath=None, mute=False, fmax=5200.0,
          legato=False, phone=None):
    """One brass note. f in Hz (or fpath, a per-sample path, for a slide); dyn 0..1 is how hard
    it is blown: harmonic k grows as level ** (1 + bright * (k - 1) / 4), so a loud note is a
    bright 'blat' and a soft one round. A lip scoop into pitch (cents, 30 ms) and a buzz of
    breath at the attack (none with legato)."""
    P = BRASS[kind]
    n = ns(dur)
    t = np.arange(n) / SR
    if env is None:
        env = rcos_in(n, attack * 1000.0) * rcos_out(n, release * 1000.0) * points([(0, 1.0), (min(0.08, dur), 0.92), (dur, 0.82)], n)
    e = np.clip(env * dyn, 0.0, 1.0)
    fr = np.full(n, float(f)) if fpath is None else np.asarray(fpath, float)[:n]
    if not legato:
        fr = fr * 2.0 ** (P['scoop'] / 1200.0 * np.exp(-t / 0.03))
    if P['vib']:
        fr = fr * (1.0 + P['vib'] * np.sin(TAU * 5.2 * t + rng.uniform(0, TAU)) * np.clip((t - 0.15) / 0.3, 0, 1))
    fmax = min(fmax, 34.0 * float(np.min(fr)))
    forms, slope, bright, floor = P['forms'], P['slope'], P['bright'], P['floor']

    def amp(k, kf):
        return (floor + _formant(kf, forms)) / k ** slope * e ** (1.0 + bright * (k - 1) / 4.0)
    y = harmonics(fr, n, amp, fmax=fmax, ph_rng=rng)
    if not legato:
        fc = forms[0][0] * 1.6
        y += P['buzz'] * 6.0 * bandpass(white(n, rng), fc, 1.5) * perc(n, 1.0, 0.018) * dyn
    if mute:
        y = filt(y, CUP_MUTE)
    if phone:
        y = highpass(y, phone, 2)
    return y


def clarinet(f, dur, rng, dyn=0.7, attack=0.03, release=0.08, env=None):
    """A clarinet: odd harmonics strong (a closed cylinder), even ones weak, breath."""
    n = ns(dur)
    t = np.arange(n) / SR
    if env is None:
        env = rcos_in(n, attack * 1000.0) * rcos_out(n, release * 1000.0)
    fr = f * (1.0 + 0.003 * np.sin(TAU * 5.0 * t) * np.clip((t - 0.2) / 0.3, 0, 1))

    def amp(k, kf):
        return (1.0 if k % 2 else 0.16) / k ** 0.9 / (1.0 + (kf / 2400.0) ** 2)
    y = harmonics(fr, n, amp, fmax=5000.0, ph_rng=rng)
    y = norm(y) * env * dyn
    breath = band(white(n, rng), 1500.0, 4000.0, 2) * env * 0.04
    return y + breath


def bassoon(f, dur, rng, dyn=0.7, attack=0.03, release=0.09, env=None, stacc=False):
    """A bassoon: a reedy spectrum under two nasal formants (440 Hz and 1.15 kHz), a little
    buzz at the attack. stacc: short and dry, the pompous 'bup'."""
    n = ns(dur)
    t = np.arange(n) / SR
    if env is None:
        rel = 0.03 if stacc else release
        env = rcos_in(n, attack * 1000.0) * rcos_out(n, rel * 1000.0)
        if stacc:
            env = env * np.exp(-t / 0.12)
    fr = f * (1.0 + 0.0025 * np.sin(TAU * 4.8 * t + rng.uniform(0, TAU)) * np.clip((t - 0.25) / 0.3, 0, 1))
    forms = ((440.0, 1.0, 140.0), (1150.0, 0.55, 260.0), (2500.0, 0.12, 500.0))

    def amp(k, kf):
        return (0.12 + _formant(kf, forms)) / k ** 0.45
    y = norm(harmonics(fr, n, amp, fmax=4800.0, ph_rng=rng))
    reedy = band(white(n, rng), 900.0, 2600.0, 2) * perc(n, 0.5, 0.02)
    return (y * env + 0.08 * reedy) * dyn


def kazoo(fpath, dur, rng, env=None):
    """A kazoo: a hummed voice (harmonics 1/k^0.7 under 'oo' formants) through a buzzing paper
    membrane (soft clipping, then the membrane's own broad formants at 1.1, 2.6 and 3.6 kHz)."""
    n = ns(dur)
    fr = np.asarray(fpath, float)[:n] if not np.isscalar(fpath) else np.full(n, float(fpath))
    t = np.arange(n) / SR
    fr = fr * (1.0 + 0.006 * np.sin(TAU * 5.6 * t + rng.uniform(0, TAU)))
    voice = norm(harmonics(fr, n, lambda k, kf: (0.3 + 1.0 / (1.0 + ((kf - 320.0) / 160.0) ** 2)
                                               + 0.5 / (1.0 + ((kf - 870.0) / 260.0) ** 2)) / k ** 0.7, fmax=4000.0, ph_rng=rng))
    buzz = np.tanh(4.0 * voice)
    y = reso(buzz, ((1100.0, 2.0, 1.0), (2600.0, 2.5, 0.9), (3600.0, 3.0, 0.5))) + 0.25 * buzz
    if env is None:
        env = rcos_in(n, 15.0) * rcos_out(n, 40.0)
    return norm(y) * env


def pizz(f, rng, vel=1.0, dur=0.9, bright=1.0):
    """A string plucked by a finger (pizzicato), music only: harmonic partials (a little stiff)
    with the plucking point at 1/5 of the string, the upper partials dying faster, through a
    wooden body (110, 230 and 480 Hz) and a finger thump. Not Karplus-Strong."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    k = 1
    while k * f < min(3800.0 * bright, 7000.0) and k <= 24:
        fk = k * f * math.sqrt(1.0 + 0.0002 * k * k)
        a = abs(math.sin(math.pi * k * 0.2)) / k ** 1.1
        tau = 0.45 / (1.0 + 0.55 * (k - 1))
        y += a * np.sin(TAU * fk * t + rng.uniform(0, TAU)) * np.exp(-t / tau)
        k += 1
    y *= rcos_in(n, 2.0)
    body = filt(y, [bq('peak', 110.0, 2.0, 4.0), bq('peak', 230.0, 2.5, 5.0), bq('peak', 480.0, 2.0, 3.0), bq('lp', 2600.0 * bright, 0.7)])
    thump = band(white(n, rng), 200.0, 1200.0, 2) * perc(n, 0.5, 0.008)
    return vel * (norm(body) + 0.25 * thump) * rcos_out(n, 30.0)


# ===========================================================================
# instruments: the bandstand's percussion
# ===========================================================================

def snare(rng, vel=1.0, wires=1.0, f0=233.0, rim=0.0, dur=0.3):
    """A snare drum: the batter head (three damped modes), the stick's click, and the snare wires
    under the bottom head (noise 1.8 to 6 kHz, rattling as the head moves). rim > 0 adds a rim."""
    n = ns(dur)
    t = np.arange(n) / SR
    head = modal([(f0, 1.0, 0.045, 0.4, 0.0), (f0 * 1.52, 0.55, 0.03, 0.4, 1.0), (f0 * 2.3, 0.35, 0.02, 0.4, 2.0)], n)
    wire = band(white(n, rng), 1800.0, 6000.0, 2) * perc(n, 0.4, 0.075 * wires + 0.01) * (1.0 + 0.4 * np.sin(TAU * f0 * t))
    stick = band(white(n, rng), 2500.0, 6000.0, 2) * perc(n, 0.05, 0.0012)
    y = 0.6 * head + 1.5 * wires * wire + 0.8 * stick
    if rim:
        y += rim * modal([(910.0, 1.0, 0.012, 0.1, 0.0), (1630.0, 0.6, 0.008, 0.1, 0.0)], n)
    return vel * y


def snare_roll(rng, dur, cresc=((0, 0.3), (1.0, 1.0)), rate=26.0, end_tap=True):
    """A buzz roll: strokes about `rate` a second (jittered), level following cresc [(fraction,
    level)], wires singing between them; an accent stroke at the end."""
    m = Mix()
    t = 0.0
    while t < dur:
        v = float(np.interp(t / dur, [c[0] for c in cresc], [c[1] for c in cresc])) * rng.uniform(0.8, 1.0)
        m.add(snare(rng, v * 0.55, wires=1.2, dur=0.12), t)
        t += (1.0 / rate) * rng.uniform(0.85, 1.15)
    if end_tap:
        m.add(snare(rng, 1.0, wires=1.0, rim=0.3, dur=0.25), dur)
    return m.out()


def bass_drum(rng, vel=1.0, f0=58.0, dur=0.45):
    """A marching bass drum: a low head (pitch dropping 6 % in 30 ms), a felt beater's thud and
    a knock (600 to 1,800 Hz) so a phone speaker still plays the beat."""
    n = ns(dur)
    t = np.arange(n) / SR
    fr = f0 * (1.0 + 0.06 * np.exp(-t / 0.03))
    head = np.sin(phase(fr, n)) * np.exp(-t / 0.16) + 0.5 * np.sin(phase(fr * 1.6, n)) * np.exp(-t / 0.08)
    thud = lowpass(white(n, rng), 500.0, 2) * perc(n, 1.0, 0.02)
    knock = band(white(n, rng), 600.0, 1800.0, 2) * perc(n, 0.4, 0.008)
    return vel * (head * rcos_in(n, 1.5) + 1.2 * thud + 1.0 * knock)


def clash(rng, vel=1.0, dur=0.9):
    """A pair of clash cymbals: dense inharmonic modes 2.4 to 7 kHz with random decays, and a
    noise wash, damped against the coat after `dur`."""
    n = ns(dur)
    parts = [(rng.uniform(2400.0, 7000.0), rng.uniform(0.3, 1.0), rng.uniform(0.15, 0.5), 0.3, rng.uniform(0, TAU)) for _ in range(40)]
    y = norm(modal(parts, n))
    wash = band(white(n, rng), 3000.0, 6500.0, 2) * perc(n, 0.3, 0.18)
    return vel * (0.6 * y + 0.8 * wash) * rcos_out(n, 120.0)


def brush_tap(rng, vel=1.0):
    """A wire brush tapped on the snare: a soft spray of wire contacts, the head barely moving."""
    n = ns(0.12)
    times = np.sort(rng.uniform(0.0, 0.012, 14))
    imp = impulses(n, times, [rng.uniform(0.4, 1.0) * (1 if rng.uniform() < 0.5 else -1) for _ in times], 1)
    spray = band(imp, 1500.0, 6000.0, 2)
    wire = band(white(n, rng), 1800.0, 5500.0, 2) * perc(n, 2.0, 0.035)
    head = modal([(205.0, 0.5, 0.03, 2.0, 0.0), (320.0, 0.3, 0.02, 2.0, 0.0)], n)
    return vel * (norm(spray) * 0.8 + 0.5 * wire + 0.4 * head)


def brush_sweep(rng, dur, circles=2.0, vel=1.0):
    """A wire brush stirred in circles on the snare head: wire noise in a fixed band whose level
    follows the brush's speed (|sin| at `circles` a second), with a fine grit of wire contacts."""
    n = ns(dur)
    t = np.arange(n) / SR
    speed = 0.35 + 0.65 * np.abs(np.sin(np.pi * circles * t))
    y = band(white(n, rng), 1600.0, 5200.0, 2) * speed ** 1.5
    grit = band(impulses(n, rate_times(rng, lambda x: 600.0, dur, 0.6), [rng.uniform(-1, 1) for _ in range(int(dur * 700) + 10)], 1),
                2000.0, 5500.0, 2)
    return vel * (norm(y) * 0.8 + 0.25 * norm(grit) * speed)


# ===========================================================================
# instruments: objects of the office
# ===========================================================================

HANDBELL = ((1.0, 1.0, 1.4), (3.0, 0.45, 0.6), (2.01, 0.12, 0.9), (4.32, 0.25, 0.3), (5.95, 0.15, 0.18), (8.1, 0.08, 0.1))


def hand_bell(f, rng, vel=1.0, dur=1.6):
    """A brass hand bell, tuned (as hand bells are) to its fundamental and the twelfth above,
    with a few untuned upper modes; a leather-faced clapper (1.5 ms)."""
    n = ns(dur)
    parts = [(f * r, a, tau, 1.5, rng.uniform(0, TAU)) for r, a, tau in HANDBELL]
    parts += [(f * 1.0018, 0.3, 1.2, 1.5, rng.uniform(0, TAU))]          # a slow beat
    y = norm(modal(parts, n))
    strike = band(white(n, rng), 1500.0, 4500.0, 2) * perc(n, 0.1, 0.002)
    return vel * (y + 0.4 * strike)


GAVEL = ((980.0, 1.0, 0.024), (1730.0, 0.7, 0.016), (2840.0, 0.5, 0.01), (4150.0, 0.25, 0.006))


def gavel(rng, vel=1.0):
    """A hardwood gavel on its sound block: the block's few bright modes, a crack, and the bench
    under it (a low thump, 130 Hz)."""
    n = ns(0.2)
    blk = modal([(f * rng.uniform(0.98, 1.02), a, tau, 0.2, rng.uniform(0, TAU)) for f, a, tau in GAVEL], n)
    bench = modal([(130.0, 0.8, 0.05, 0.8, 0.0), (240.0, 0.5, 0.03, 0.8, 0.0)], n)
    crack = band(white(n, rng), 2000.0, 5500.0, 2) * perc(n, 0.05, 0.0015)
    return vel * (blk + 0.35 * bench + 0.35 * crack)


def metal_click(rng, f=(2300.0, 4100.0, 5300.0), vel=1.0, tau=0.006):
    """A small steel part snapping: three short modes."""
    n = ns(0.06)
    parts = [(fx * rng.uniform(0.97, 1.03), a, tau * s, 0.05, rng.uniform(0, TAU)) for fx, a, s in zip(f, (1.0, 0.7, 0.45), (1.0, 0.7, 0.5))]
    return vel * (modal(parts, n) + 0.4 * band(white(n, rng), 3000.0, 6000.0, 2) * perc(n, 0.03, 0.0007))


def shutter(rng, vel=1.0):
    """A press camera: the release lever (a click), the leaf shutter's blades (a 6 ms 'tsk'), its
    spring (a short ring at 2.2 kHz) and, 180 ms later, the film-advance lever's ratchet (six
    ticks in 120 ms) and its stop."""
    m = Mix()
    m.add(metal_click(rng, (1900.0, 3300.0, 4700.0), 0.8, 0.008))
    n = ns(0.03)
    m.add(1.0 * band(white(n, rng), 2500.0, 5600.0, 2) * perc(n, 0.1, 0.0025), 0.012)
    ns_ = ns(0.08)
    m.add(0.35 * modal([(2210.0, 1.0, 0.03, 0.2, 0.0), (3390.0, 0.4, 0.02, 0.2, 0.0)], ns_), 0.014)
    for j in range(6):
        m.add(metal_click(rng, (3000.0, 4400.0, 5500.0), 0.35 + 0.05 * j, 0.004), 0.18 + j * 0.021 * rng.uniform(0.9, 1.1))
    m.add(metal_click(rng, (1500.0, 2700.0, 3900.0), 0.6, 0.008), 0.31)
    return vel * m.out()


def scissors(rng, vel=1.0, glide=0.05):
    """Scissors closing: the blades sliding along each other (a fast stick-slip of steel on steel
    ringing at 3.4 and 5.2 kHz) for `glide` seconds, then the snip (two short steel clicks)."""
    m = Mix()
    n = ns(glide)
    times = rate_times(rng, lambda x: 260.0, glide, 0.3)
    imp = impulses(n, times, [rng.uniform(0.4, 1.0) for _ in times], 2)
    slide = reso(imp, ((3400.0, 8.0, 1.0), (5200.0, 7.0, 0.6), (1900.0, 3.0, 0.3))) * points([(0, 0.3), (glide, 1.0)], n)
    m.add(0.6 * norm(slide))
    m.add(metal_click(rng, (2600.0, 3900.0, 5100.0), 1.0, 0.007), glide)
    m.add(metal_click(rng, (2100.0, 3500.0, 4800.0), 0.6, 0.006), glide + 0.009)
    return vel * m.out()


def chalk(rng, dur=0.12, vel=1.0, grit=1.0):
    """A chalk tally mark on a slate: the tap of the chalk landing (slate is stone: a few high,
    very damped modes and a low tick) and the stroke: dusty grains ringing the slate's board (720
    Hz, 1.5 kHz), the chalk chattering (skipping about 34 times a second: a dotted line)."""
    m = Mix()
    n0 = ns(0.04)
    m.add(0.9 * modal([(2600.0, 0.6, 0.004, 0.05, 0.0), (3900.0, 0.4, 0.003, 0.05, 0.0), (560.0, 1.0, 0.02, 0.3, 0.0), (940.0, 0.7, 0.012, 0.3, 0.0)], n0))
    n = ns(dur)
    tt = np.arange(n) / SR
    sp = points([(0, 0.6), (dur * 0.25, 1.0), (dur * 0.8, 0.8), (dur, 0.0)], n)
    times = rate_times(rng, lambda x: 900.0 * max(float(np.interp(x, tt, sp)), 0.05), dur, 0.6)
    imp = impulses(n, times, [rng.uniform(0.2, 1.0) * (1 if rng.uniform() < 0.5 else -1) for _ in times], 3)
    stroke = reso(imp, ((720.0, 3.0, 0.8), (1500.0, 3.0, 1.0), (2600.0, 2.5, 0.5)))
    dust = band(white(n, rng), 1200.0, 4500.0, 2) * sp
    skip = np.zeros(n)
    for t0 in rate_times(rng, lambda x: 34.0, dur, 0.15):
        i = int(t0 * SR)
        k = min(ns(0.016), n - i)
        skip[i:i + k] = np.maximum(skip[i:i + k], np.sin(np.pi * np.arange(k) / k) ** 0.5)
    m.add(grit * (norm(stroke) + 0.25 * dust) * sp * (0.12 + 0.88 * skip), 0.006)
    return vel * filt(m.out(), butter('lp', 4000.0, 4))


def tube_air(rng, dur, L_hz=310.0, env=None, q=6.0, modes=6, vel=1.0):
    """Pneumatic tube air: noise through the brass tube's own resonances (a fixed comb: harmonics
    of L_hz, which fall off above 2 kHz) and its open-end hiss. The tube's length fixes the
    colour: nothing sweeps."""
    n = ns(dur)
    src = colored(n, rng, -2.0)
    parts = [(L_hz * k, q + k, 1.0 / k ** 0.5) for k in range(1, modes + 1)]
    y = norm(reso(src, parts))
    hissy = band(white(n, rng), 1800.0, 4500.0, 2)
    if env is None:
        env = np.sin(np.pi * np.arange(n) / n)
    return vel * (y + 0.15 * norm(hissy)) * env


def latch(rng, vel=1.0, heavy=1.0):
    """A brass latch: the bolt rasping in its keeper (a short stick-slip ring, 30 ms), then the
    clack of the bolt home (brass modes 0.9 to 3.6 kHz and the door's wood behind it)."""
    m = Mix()
    n = ns(0.035)
    times = rate_times(rng, lambda x: 320.0, 0.03, 0.3)
    rasp = reso(impulses(n, times, [rng.uniform(0.5, 1.0) for _ in times], 2), ((1800.0, 6.0, 1.0), (3100.0, 6.0, 0.7)))
    m.add(0.6 * norm(rasp) * points([(0, 1.0), (0.03, 0.7), (0.035, 0.0)], n))
    nb = ns(0.15)
    clack = modal([(900.0 * heavy, 0.8, 0.03, 0.1, 0.0), (1650.0, 1.0, 0.02, 0.1, 0.5), (2550.0, 0.6, 0.014, 0.1, 1.0),
                   (3600.0, 0.35, 0.008, 0.1, 2.0)], nb)
    m.add(clack, 0.035)
    m.add(0.8 * wood_body(rng, DOOR, 1.0, 1.4, 1.2, 0.3), 0.035)
    return vel * m.out()


def brass_coin(rng, vel=1.0):
    """A heavy brass token set down flat on the leather blotter: a dull contact (the blotter
    damps the metal: its modes, 1.4 to 4 kHz and inharmonic, die in 5 to 9 ms, so it has a
    colour and no note), then the token settling on its rim (a short wobble of six contacts
    speeding up, the 'Euler's disc' of a coin laid down)."""
    m = Mix()
    n = ns(0.05)
    f = rng.uniform(1350.0, 1480.0)
    parts = [(f, 1.0, 0.009, 0.1, 0.0), (f * 1.83, 0.8, 0.007, 0.1, 1.0), (f * 2.31, 0.6, 0.006, 0.1, 2.0), (f * 2.77, 0.5, 0.005, 0.1, 3.0)]
    m.add(modal(parts, n) + 0.5 * band(white(n, rng), 1200.0, 3500.0, 2) * perc(n, 0.1, 0.004))
    m.add(0.5 * highpass(wood_body(rng, WOOD_DESK, 1.0, 1.4, 1.6, 0.3), 400.0, 2))
    t, gap = 0.035, 0.022
    for j in range(6):
        nn = ns(0.02)
        ff = f * rng.uniform(1.05, 1.25)
        m.add((0.42 - 0.05 * j) * modal([(ff, 1.0, 0.004, 0.1, 0.0), (ff * 1.9, 0.6, 0.003, 0.1, 1.0)], nn), t)
        t += gap
        gap *= 0.78
    return vel * m.out()


def newspaper_slap(rng, vel=1.0):
    """A folded newspaper slapped down on the desk: a fat, low slap of many sheets (the air
    pushed out: 150 to 600 Hz), the crack of its edge, the desk answering, and a few sheets
    settling (a short rustle, 60 ms)."""
    m = Mix()
    n = ns(0.12)
    whump = lowpass(colored(n, rng, -2.0), 600.0, 2) * perc(n, 0.4, 0.02)
    crack = band(white(n, rng), 900.0, 4500.0, 2) * perc(n, 0.05, 0.006)
    m.add(1.5 * norm(whump) + 1.2 * norm(crack) * 0.8)
    m.add(0.8 * desk_tap(rng, 1.0))
    nr = ns(0.07)
    times = rate_times(rng, lambda x: 500.0, 0.07, 0.6)
    rust = band(impulses(nr, times, [rng.uniform(-1, 1) for _ in times], 4), 1200.0, 4200.0, 2) * points([(0, 1.0), (0.07, 0.0)], nr)
    m.add(0.35 * norm(rust), 0.04)
    return vel * m.out()


# ===========================================================================
# the sounds of section 6
# ===========================================================================

# --- the desk: what the thumb does hundreds of times an hour ---------------------------------------

# (letter strokes a second, pen lifts, the main tine in Hz). The three variants differ in the
# nib's own pitch (1460, 1640 and 1950 Hz: -2 and +3 semitones around 1640), not only in the
# rhythm of the letters, so fifty signatures are not fifty copies of one squeak. The tines sit
# low (1.5 to 2 kHz, Q 6, the second tine 1.42 x higher and soft) and the whole nib is kept to
# 900 Hz .. 3.4 kHz: under half of its energy is in 2 to 5 kHz, the band where a sustained
# scratch grates (the first version rang 2.65 and 3.9 kHz at Q 10 to 12, 83 % in that band).
SIGN_INK = (
    (7.0, ((0.08, 0.095),), 1640.0),
    (8.5, ((0.05, 0.065), (0.12, 0.13)), 1950.0),
    (6.0, ((0.1, 0.115),), 1460.0),
)
SIGN_INK_S = 0.18                 # seconds: the flourish (the first version's 280 ms was a long scratch)


def _sign_ink(k):
    strokes, lifts, f1 = SIGN_INK[k - 1]

    @office_recipe('sign_ink_%d' % k, length=0.22, loud_db=FREQUENT)
    def fn(c):
        """The nib signing from 40 pt: a 180 ms flourish of the steel nib whose pressure grows
        (the signature writes itself across the strip with the distance). A soft, mid scratch
        (the tines at f1 and 1.42 f1, the sheet at 1.1 kHz), not a squeak."""
        c.accent(0.0)
        d = SIGN_INK_S
        tines = ((f1, 6.0, 1.0), (f1 * 1.42, 5.0, 0.35), (1100.0, 2.2, 0.35), (f1 * 0.62, 3.0, 0.3))
        y = nib(c.rng, d, strokes, press=[(0, 0.6), (0.04, 0.75), (0.13, 1.0), (d, 0.9)], lift=lifts, tines=tines, width=1,
                scratch_band=(1300.0, 2800.0), lp=3200.0, keep=(900.0, 3400.0))
        return y * points([(0, 0.0), (0.006, 1.0), (d - 0.03, 1.0), (d, 0.0)], ns(d))
    fn.__name__ = 'sign_ink_%d' % k
    return fn


for _k in (1, 2, 3):
    globals()['sign_ink_%d' % _k] = _sign_ink(_k)


SIGN = ((7, (880.0, 2050.0), 0.026, 1.0, 0.048), (6, (950.0, 2100.0), 0.02, 1.1, 0.044), (7, (850.0, 1900.0), 0.028, 0.9, 0.056))


def _sign(k):
    rods, f0, spread, bright, settle = SIGN[k - 1]

    @office_recipe('sign_%d' % k, length=0.24, loud_db=FREQUENT)
    def fn(c):
        """Signed: the paper laid in the wire out-tray. Card stock meeting the wires (a short slap),
        the wires' clink (six or seven thin brass rods, damped by the paper) and the tray settling
        45 to 55 ms later (half of them again, softer): 'chk-ching'. Bright, short, light."""
        m = Mix()
        m.add(1.0 * card_slap(c.sub('slap'), 1.0, 0.8, bright))
        m.add(0.8 * wire_clink(c.sub('wire'), 1.0, rods, f0, spread, 1.9, settle), 0.004)
        c.accent(0.0)
        return m.out()
    fn.__name__ = 'sign_%d' % k
    return fn


for _k in (1, 2, 3):
    globals()['sign_%d' % _k] = _sign(_k)


STUDY = (                         # (creak rate start, peak, end; creak length; slide length; tuning in semitones)
    ((55.0, 95.0, 70.0), 0.13, 0.12, 0.0),
    ((45.0, 80.0, 60.0), 0.15, 0.11, -2.0),
    ((65.0, 110.0, 80.0), 0.11, 0.13, 2.0),
)
CREAK_RES = ((640.0, 7.0, 1.0), (1380.0, 6.0, 0.7), (2450.0, 5.0, 0.35))


def _study(k):
    rates, dc, ds, st = STUDY[k - 1]
    tune = 2.0 ** (st / 12.0)         # the three drawers are three drawers: creak rate, runner wood and box +-2 semitones

    @office_recipe('study_%d' % k, length=0.42, loud_db=FREQUENT)
    def fn(c):
        """For further study: the wooden drawer. It creaks (a slip-pulse train through the
        runner's resonances, its rate rising and falling), slides on its runners (dry low
        friction), and meets its stop with a hollow wooden thunk. Low, woody, longer than the
        clink: told apart from signing by ear with the screen off."""
        m = Mix()
        m.add(0.9 * creak(c.sub('creak'), dc, [(0, rates[0] * tune), (dc * 0.6, rates[1] * tune), (dc, rates[2] * tune)],
                          res=tuple((f * tune, q, g) for f, q, g in CREAK_RES)))
        m.add(0.45 * highpass(runner(c.sub('run'), ds), 550.0, 2), dc * 0.6)
        m.add(0.8 * drawer_thunk(c.sub('thunk'), 1.0, tune), dc * 0.6 + ds)
        c.accent(0.0, dc * 0.6 + ds)
        return m.out()
    fn.__name__ = 'study_%d' % k
    return fn


for _k in (1, 2, 3):
    globals()['study_%d' % _k] = _study(_k)


@office_recipe('take_back', length=0.2, loud_db=FREQUENT)
def take_back(c):
    """Taken back from the tray: one wire rod lifted off (a small, high clink) and the paper laid
    back on the desk (a soft card tap) 70 ms later."""
    m = Mix()
    m.add(0.6 * wire_clink(c.sub('w'), 1.0, 1, (1700.0, 1900.0), 0.0, 1.6))
    m.add(0.8 * card_slap(c.sub('c'), 1.0, 0.6, 0.8), 0.07)
    c.accent(0.0)
    return m.out()


@office_recipe('denied', length=0.24, loud_db=FREQUENT)
def denied(c):
    """Not enough in the treasury: one dull knuckle tap on the desk and the pen jumping on it (a
    small rattle of three ticks, 45 to 95 ms after). No buzzer, no 'uh-uh'."""
    m = Mix()
    m.add(desk_tap(c.sub('a'), 1.0))
    for t, v in ((0.045, 0.45), (0.075, 0.3), (0.095, 0.2)):
        m.add(v * metal_click(c.sub('pen%d' % int(t * 1000)), (2900.0, 4300.0, 5200.0), 1.0, 0.003), t)
    c.accent(0.0)
    return m.out()


# --- arrivals --------------------------------------------------------------------------------------

def _paper_arrive(k):
    gap = (0.13, 0.16)[k - 1]

    @office_recipe('paper_arrive_%d' % k, length=0.5, loud_db=FREQUENT)
    def fn(c):
        """A visitor: two knocks on the panelled door (the glass pane answering), then their paper
        laid on the desk (a card-stock slap) 200 ms later."""
        m = Mix()
        m.add(door_knock(c.sub('k1'), 1.0))
        m.add(door_knock(c.sub('k2'), 0.8), gap)
        m.add(0.7 * card_slap(c.sub('s'), 1.0, 1.0, 0.9), gap + 0.2)
        c.accent(0.0)
        return m.out()
    fn.__name__ = 'paper_arrive_%d' % k
    return fn


for _k in (1, 2):
    globals()['paper_arrive_%d' % _k] = _paper_arrive(_k)


@office_recipe('slip_arrive', length=0.45, loud_db=FREQUENT)
def slip_arrive(c):
    """The Treasury Clerk's budget slip slid slowly across the baize under a fingertip: ONE
    continuous push of 340 ms, no gaps (the cloth's soft friction: noise kept steeply to 550 Hz ..
    1.2 kHz, an 8th-order band, its level swelling to the middle of the push and fading as the
    finger slows), then the slip laid flat (the air under it pressed out: a low, soft 'thup',
    kept under 1.8 kHz). No whoosh, no sweep, nothing rings, no bursts. (The first version was
    two or three short noise bursts in 180 ms: the shape of Lantern Row's steam chuffs.)"""
    m = Mix()
    d = 0.34
    n = ns(d)
    fric = filt(colored(n, c.sub('n'), -1.0), butter('hp', 550.0, 4) + butter('lp', 1200.0, 8))
    fric = norm(fric) * wobble(c.sub('w'), n, 25.0, 0.25)
    m.add(0.7 * norm(fric) * points([(0, 0.0), (d * 0.6, 1.0), (d, 0.3)], n, 1.5))
    nt = ns(0.07)
    thup = reso(colored(nt, c.sub('thup'), -2.0) * perc(nt, 2.0, 0.014), ((520.0, 1.6, 1.0), (1000.0, 1.6, 0.5)))
    m.add(1.0 * norm(filt(thup, butter('lp', 1800.0, 8))), d - 0.01)
    c.accent(0.0, d - 0.01)
    return m.out()


# --- the Ledger: levels and ministries --------------------------------------------------------------

@office_recipe('buy_level', length=0.2, loud_db=FREQUENT)
def buy_level(c):
    """A level bought: the nib ticks the Ledger (a check mark: a short down-stroke and a longer up-stroke) and a heavy brass token is
    set down on the blotter 85 ms later and settles on its rim (no till, no bell)."""
    m = Mix()
    d = 0.045
    for j, (t0, dd) in enumerate(((0.0, 0.018), (0.03, d))):            # a check mark: down, then up and away
        m.add((0.8 if j else 0.6) * nib(c.sub('tick%d' % j), dd, 30.0, press=[(0, 1.0), (dd, 0.4)], squeak=0.25)
              * points([(0, 0), (0.002, 1), (dd, 0)], ns(dd)), t0)
    m.add(brass_coin(c.sub('coin'), 1.0), 0.085)
    c.accent(0.0, 0.085)
    return m.out()


@office_recipe('open_ministry', length=0.9)
def open_ministry(c):
    """A new ministry opens: a heavy brass latch thrown on its door, then a tuba's comic blat
    (a short forte B-flat, F2 to Bb2 scooped) from the corridor."""
    m = Mix()
    m.add(latch(c.sub('latch'), 1.0, 1.0))
    m.add(0.9 * brass(c.hz('Bb2'), 0.5, c.sub('tuba'), 'tuba', dyn=1.0, attack=0.02, release=0.12, phone=420.0), 0.16)
    m.add(0.35 * brass(c.hz('F3'), 0.42, c.sub('tuba2'), 'euph', dyn=0.8, attack=0.03, release=0.12), 0.2)
    c.accent(0.0, 0.16)
    return m.out()


@office_recipe('appoint', length=0.45)
def appoint(c):
    """A minister appointed: the cabinet photograph taken (a press camera's shutter and its
    film-advance ratchet)."""
    c.accent(0.0)
    return shutter(c.rng, 1.0)


@office_recipe('storey', length=1.9, loud_db=LOUD)
def storey(c):
    """A new storey on a ministry: a brass hand bell swung twice (F5, the second stroke softer),
    and a tuba under the first stroke."""
    m = Mix()
    m.add(hand_bell(c.hz('F5'), c.sub('b1'), 1.0, 1.4))
    m.add(hand_bell(c.hz('F5'), c.sub('b2'), 0.65, 1.4), 0.36)
    m.add(0.3 * brass(c.hz('Bb2'), 0.45, c.sub('t'), 'tuba', dyn=0.6, release=0.2, phone=420.0), 0.0)
    c.accent(0.0, 0.36)
    return m.out()


@office_recipe('ribbon', length=1.0)
def ribbon(c):
    """A ribbon cut: the scissors close on it (blades sliding, the snip), the ribbon parts (a
    soft cloth snap of tension let go), and a clarinet's little flourish (G5 A5 Bb5, down to F5)."""
    m = Mix()
    m.add(scissors(c.sub('sc'), 1.0, 0.06))
    nr = ns(0.05)
    m.add(0.6 * band(colored(nr, c.sub('rib'), -1.0), 400.0, 2400.0, 2) * perc(nr, 0.3, 0.012), 0.075)
    for j, (nt, t, d) in enumerate((('G5', 0.14, 0.07), ('A5', 0.2, 0.07), ('Bb5', 0.26, 0.07), ('F5', 0.34, 0.4))):
        m.add(0.55 * clarinet(c.hz(nt), d, c.sub('cl%d' % j), 0.8, 0.015, 0.06 if j < 2 else 0.2), t)
    c.accent(0.0, 0.065)
    return m.out()


# --- boycotts, scandals, the scrapbook ---------------------------------------------------------------

def _glide_path(n, notes, times, port=0.03):
    """A per-sample frequency path through notes [(Hz)] starting at times [s], gliding `port` s."""
    t = np.arange(n) / SR
    lf = np.zeros(n)
    for f, t0 in zip(notes, times):
        lf = np.where(t >= t0, math.log(f), lf)
    lf[t < times[0]] = math.log(notes[0])
    k = max(ns(port), 1)
    lf = np.convolve(np.concatenate([np.full(k, lf[0]), lf]), np.ones(k) / k, 'valid')[:n]
    return np.exp(lf)


@office_recipe('boycott_start', length=1.25)
def boycott_start(c):
    """A club walks out: a wordless kazoo chant from the picket line, three kazoos a little out
    of step (doo-doo DOOO doo, D4 D4 F4 C4), and a bass drum under the long note."""
    m = Mix()
    seq = ((0.0, 'D4', 0.13), (0.17, 'D4', 0.13), (0.34, 'F4', 0.36), (0.75, 'C4', 0.3))
    for v in range(3):
        rng = c.sub('kz%d' % v)
        det = 2.0 ** (rng.uniform(-14, 14) / 1200.0)
        lag = rng.uniform(0.0, 0.025)
        for j, (t, nt, d) in enumerate(seq):
            n = ns(d)
            f = c.hz(nt) * det
            path = f * 2.0 ** (-35.0 / 1200.0 * np.exp(-np.arange(n) / SR / 0.04))
            env = rcos_in(n, 12.0) * rcos_out(n, 40.0) * (1.0 if j != 2 else points([(0, 0.8), (0.1, 1.0), (d, 0.85)], n))
            m.add((0.5 if v else 0.6) * kazoo(path, d, rng, env), t + lag)
    m.add(0.35 * highpass(bass_drum(c.sub('bd'), 1.0), 380.0, 2), 0.34)
    c.accent(0.0, 0.34)
    return m.out()


@office_recipe('boycott_end', length=0.7)
def boycott_end(c):
    """The boycott ends: a door unlatched (the latch lifted: a click and the bolt drawn) and the
    door swinging open on its hinge (a slow creak)."""
    m = Mix()
    m.add(metal_click(c.sub('c'), (1500.0, 2600.0, 3700.0), 0.8, 0.01))
    m.add(0.9 * latch(c.sub('l'), 0.8, 0.85), 0.05)
    m.add(0.5 * creak(c.sub('cr'), 0.42, [(0, 35.0), (0.2, 60.0), (0.42, 40.0)],
                      res=((520.0, 8.0, 1.0), (1150.0, 6.0, 0.7), (2300.0, 5.0, 0.4))), 0.17)
    c.accent(0.0, 0.085)
    return m.out()


@office_recipe('scandal', length=1.3, loud_db=LOUD)
def scandal(c):
    """The front page: a folded newspaper slapped down on the desk, then a muted trombone's 'oh
    dear': two notes, the second sliding down from D4 to Bb3 and sagging."""
    m = Mix()
    m.add(newspaper_slap(c.sub('np'), 1.0))
    d1, d2 = 0.22, 0.62
    m.add(0.75 * brass(c.hz('F4'), d1, c.sub('t1'), 'bone', dyn=0.8, attack=0.02, release=0.05, mute=True), 0.18)
    n = ns(d2)
    path = _glide_path(n, [c.hz('D4'), c.hz('Bb3')], [0.0, 0.18], port=0.2) * points([(0, 1.0), (0.45, 1.0), (d2, 0.985)], n)
    m.add(0.8 * brass(0.0, d2, c.sub('t2'), 'bone', dyn=0.8, attack=0.03, release=0.18, fpath=path, mute=True), 0.42)
    c.accent(0.0, 0.18)
    return m.out()


@office_recipe('clipping', length=0.32)
def clipping(c):
    """A clipping for the scrapbook: two quick snips of the scissors and the clipping pressed onto
    the page (a soft card tap)."""
    m = Mix()
    m.add(scissors(c.sub('a'), 0.8, 0.03))
    m.add(scissors(c.sub('b'), 0.7, 0.03), 0.09)
    m.add(0.6 * card_slap(c.sub('p'), 1.0, 0.8, 0.8), 0.22)
    c.accent(0.0)
    return m.out()


# --- the election -----------------------------------------------------------------------------------

@office_recipe('call_election', length=0.75, loud_db=LOUD)
def call_election(c):
    """The election called: the gavel, twice ('order!'), the second the harder."""
    m = Mix()
    m.add(gavel(c.sub('g1'), 0.75))
    m.add(gavel(c.sub('g2'), 1.0), 0.24)
    c.accent(0.0, 0.24)
    return m.out()


@office_recipe('env_open', length=0.95)
def env_open(c):
    """An envelope opened on election night: a snare roll swelling from nothing (0.7 s) into one
    accented stroke as the clerk reads it."""
    m = Mix()
    m.add(highpass(snare_roll(c.rng, 0.7, ((0, 0.2), (0.6, 0.55), (1.0, 0.9)), 27.0, True), 300.0, 2))
    c.accent(0.0, 0.7)
    return m.out()


TALLY = ((0.14, 1.0), (0.12, 0.9), (0.16, 1.1))


def _tally(k):
    d, g = TALLY[k - 1]

    @office_recipe('tally_%d' % k, length=0.24)
    def fn(c):
        """A chalk tally mark on the board: the chalk's tap and a gritty stroke."""
        c.accent(0.0)
        return chalk(c.rng, d, 1.0, g)
    fn.__name__ = 'tally_%d' % k
    return fn


for _k in (1, 2, 3):
    globals()['tally_%d' % _k] = _tally(_k)


@office_recipe('district_held', length=0.75)
def district_held(c):
    """A district held: the bandstand's sting, back to front: a snare rimshot and the band's
    'PAH' at once (tuba Bb2, euphonium F3 and D4, a short bright chord), then the tuba's low
    'oom' answering on F2 a beat later, and a bass drum under it."""
    m = Mix()
    m.add(0.6 * highpass(snare(c.sub('s1'), 1.0, rim=0.5), 400.0, 2))
    m.add(0.9 * brass(c.hz('Bb2'), 0.22, c.sub('t1'), 'tuba', dyn=1.0, attack=0.012, release=0.06, phone=420.0))
    m.add(0.45 * brass(c.hz('F3'), 0.22, c.sub('e1'), 'euph', dyn=0.95, attack=0.012, release=0.06, phone=420.0))
    m.add(0.4 * brass(c.hz('D4'), 0.22, c.sub('e2'), 'euph', dyn=0.9, attack=0.012, release=0.06, phone=420.0))
    m.add(0.85 * brass(c.hz('F2'), 0.34, c.sub('t2'), 'tuba', dyn=0.85, attack=0.02, release=0.15, phone=420.0), 0.27)
    m.add(0.35 * highpass(bass_drum(c.sub('bd'), 1.0), 380.0, 2), 0.27)
    c.accent(0.0, 0.27)
    return m.out()


@office_recipe('district_lost', length=1.0)
def district_lost(c):
    """A district lost: a trombone sliding down a fourth (F4 to C4) and fading, soft."""
    m = Mix()
    d = 0.9
    n = ns(d)
    path = _glide_path(n, [hz('F4'), hz('C4')], [0.0, 0.12], port=0.55)
    env = rcos_in(n, 40.0) * points([(0, 0.9), (0.3, 1.0), (d, 0.0)], n)
    m.add(brass(0.0, d, c.sub('b'), 'bone', dyn=0.8, env=env, fpath=path, phone=420.0))
    c.accent(0.0)
    return m.out()


# --- the interface: pneumatic tubes -------------------------------------------------------------------

@office_recipe('ui_open', length=0.25, loud_db=FREQUENT)
def ui_open(c):
    """A sheet opened: a capsule arriving by pneumatic tube, the tube's own note sounding for 110
    ms as the air pushes it (the tube's first three resonances at Q 40: a hollow 'hoo' near 415
    Hz, not a hiss), the capsule dropping into the brass receiver (a 620 Hz clunk) and the desk
    under it; the whole kept to 450 Hz .. 3 kHz. (The first version's 100 ms of broadband tube
    hiss was a whoosh, close to Pizza Empire's toss.) The tube's note is a resonance of a length
    of pipe, so it is not held to the scale (about A-flat 4)."""
    m = Mix()
    ad = 0.11
    m.add(0.6 * tube_air(c.sub('air'), ad, 415.3, env=points([(0, 0.2), (ad * 0.8, 1.0), (ad, 0.0)], ns(ad)), q=40.0, modes=3))
    nb = ns(0.1)
    clunk = modal([(620.0, 1.0, 0.018, 0.2, 0.0), (620.0 * 1.82, 0.7, 0.012, 0.2, 1.0), (620.0 * 3.05, 0.4, 0.008, 0.2, 2.0)], nb)
    m.add(0.9 * clunk, ad - 0.005)
    m.add(0.2 * desk_tap(c.sub('d'), 1.0), ad - 0.005)
    c.accent(0.0)
    return filt(m.out(), butter('hp', 450.0, 4) + butter('lp', 3000.0, 8))


@office_recipe('ui_close', length=0.2, loud_db=FREQUENT)
def ui_close(c):
    """The sheet closed: the receiver's brass lid falling shut (it hits its rim, a click, and its
    catch snaps 35 ms later, a clack) and the capsule's air let out under it (a short, low puff
    of a long tube, 60 ms)."""
    m = Mix()
    m.add(0.8 * metal_click(c.sub('lid'), (1600.0, 2900.0, 4200.0), 0.9, 0.01))
    m.add(0.9 * latch(c.sub('catch'), 0.7, 1.1))
    m.add(0.45 * tube_air(c.sub('air'), 0.06, 190.0, env=points([(0, 0.0), (0.008, 1.0), (0.06, 0.0)], ns(0.06))), 0.05)
    c.accent(0.0)
    return m.out()


# ===========================================================================
# the event table (spec section 6, in the shape of src/services/fx/catalog.decree.ts)
# key: (volume, minimum interval ms, haptic, brief, voices)
# ===========================================================================

MUSIC_KEYS = ('music_main', 'music_campaign')         # music_main is spec 6's music_desk (the one the shared player starts)
STING_KEYS = ('majority', 'defeat')                   # rendered by office_music.py from the march's score (.m4a)

EVENTS = {
    # the desk: what the thumb does hundreds of times an hour
    'sign_ink': (0.35, 250, ['light'], 'the steel nib signing from 40 pt: a 180 ms soft mid scratch whose pressure grows; three files (three nib pitches), random', 1),
    'sign': (0.5, 150, ['medium'], 'signed: card stock into the wire out-tray, the brass wires clinking (bright, short); three files, random', 2),
    'study': (0.5, 150, ['medium'], 'for further study: the wooden drawer creaking, sliding on its runners, a hollow thunk at its stop (low, woody); three files (three drawers, +-2 semitones), random', 2),
    'take_back': (0.45, 150, ['light'], 'taken back: one wire lifted, the paper laid back on the desk', 1),
    'denied': (0.5, 300, ['light'], 'not enough in the treasury: one dull knuckle tap on the desk, the pen rattling on it', 1),
    'paper_arrive': (0.3, 5000, None, 'a visitor: two knocks on the panelled door, the glass pane answering, their paper laid on the desk; two files, random', 1),
    'slip_arrive': (0.35, 800, None, "the Treasury Clerk's slip slid slowly across the baize in one push and laid flat", 1),
    # the Ledger
    'buy_level': (0.45, 125, ['light'], 'a level: the nib ticks the Ledger, a heavy brass token set down on the blotter and settling (no till, no bell)', 2),
    'open_ministry': (0.6, None, ['medium'], 'a ministry opens: a brass latch thrown, a tuba blat from the corridor', 1),
    'appoint': (0.6, None, ['light'], 'a minister appointed: a press camera, shutter and film-advance ratchet', 1),
    'storey': (0.65, None, ['success'], 'a new storey: a brass hand bell swung twice (F5), a tuba under it', 1),
    'ribbon': (0.6, None, ['light'], 'a ribbon cut: scissors, the ribbon parting, a clarinet flourish', 1),
    # boycotts, scandals, the scrapbook
    'boycott_start': (0.6, None, ['medium'], 'a club walks out: a wordless kazoo chant of three kazoos, a bass drum', 1),
    'boycott_end': (0.55, None, None, 'the boycott ends: a door unlatched and swinging open on its hinge', 1),
    'scandal': (0.65, None, ['heavy'], 'the front page: a newspaper slapped down, a muted trombone\'s "oh dear"', 1),
    'clipping': (0.45, 300, None, 'a clipping: two snips and the clipping pressed onto the page', 1),
    # the election
    'call_election': (0.65, None, ['medium'], 'the election called: the gavel, twice', 1),
    'env_open': (0.5, None, None, 'an envelope opened: a snare roll swelling into one stroke', 1),
    'tally': (0.5, 120, None, 'a chalk tally mark on the board; three files, random', 2),
    'district_held': (0.6, 300, ['success'], 'a district held: the band\'s PAH (rimshot, tuba and euphoniums) and the tuba\'s oom answering', 1),
    'district_lost': (0.5, 300, None, 'a district lost: a trombone sliding down a fourth', 1),
    'majority': (0.8, None, ['heavy'], 'the majority: eight bars of "The Middling March", the full bandstand (B-flat, 2/4 at 112)', 1),
    'defeat': (0.7, None, ['soft'], 'defeat: one tuba, high in its register, playing the first four bars of "The Middling March" slowly', 1),
    # interface
    'ui_open': (0.4, None, None, 'a sheet opened: a capsule arriving by pneumatic tube (the tube\'s hollow note) into its brass receiver', 1),
    'ui_close': (0.35, None, None, 'the sheet closed: the capsule sent off with a suck of air, the receiver lid falling shut', 1),
    # music
    'music_main': (0.25, None, None, 'the desk loop "Minutes of the Previous Meeting" (spec 6 music_desk): 90 s at 90 bpm in F, bassoon, pizzicato, brushes; sparse, no tune', 1),
    'music_campaign': (0.35, None, None, 'the campaign loop: "The Middling March" for the bandstand, 90 s at 112 bpm in B-flat', 1),
}

FILES = {'sign_ink': 3, 'sign': 3, 'study': 3, 'paper_arrive': 2, 'tally': 3}        # pick: random

# The shared keys the store, the feedback service and the shared modals play, mapped onto this
# table (for src/modes/decree/soundKeys.ts; a key left out is silent in this game by design:
# ui_tap and ui_tab are silent, a reading game needs no click per button).
SHARED_SOUNDS = {
    'ui_denied': 'denied',
    'ui_open': 'ui_open',
    'ui_close': 'ui_close',
    'offline_collect': 'slip_arrive',
    'purchase_success': 'open_ministry',
    'unlock': 'open_ministry',
    'prestige': 'storey',
    'milestone': 'storey',
    'buy': 'buy_level',
    'story_open': 'ui_open',
    'deal_popup': 'ui_open',
}


def file_stems(key):
    n = FILES.get(key, 1)
    return [key] if n == 1 else ['%s_%d' % (key, i) for i in range(1, n + 1)]


def key_of(stem):
    """The catalogue key a file belongs to (sign_2 -> sign)."""
    head, _, tail = stem.rpartition('_')
    return head if tail.isdigit() and head in FILES else stem


# The sounds that repeat fast, with the interval they can repeat at in play (the catalogue's
# minimum interval, or the fastest a reading hand reaches), measured by render_office.py --rows.
ROW_KEYS = {
    'sign_ink_1': 250, 'sign_1': 150, 'study_1': 150, 'take_back': 150, 'denied': 300, 'buy_level': 125,
    'slip_arrive': 800, 'tally_1': 120, 'clipping': 300, 'district_held': 300,
}
