"""Orbit Haulers (space-miner, mode "haul"): one recipe per sound key.

Written for this game from the briefs in docs/design/space-design.md 6.2.
Nothing here calls, copies or imports a recipe of the first game
(scripts/audio/recipes.py): this module has its own registry (HAUL_RECIPES),
its own context and its own gestures. It uses only the DSP toolbox (dsp.py)
and the timbres of the synth instruments (packs.SynthPack: FM glass and
tines, pulse blips, resonant sweeps, the station room with its 110 ms echo),
which are instruments, not tunes.

Character (spec 6.1):
  - key: A major / F# minor pentatonic. Notes are written as REAL pitch names
    (not in C like recipes.py), and c.hz() refuses any note outside
    A B C# E F#, so the scale is enforced, not hoped for. Glides and noise are
    unpitched and pass.
  - radio: band-passed noise squelches (300 to 3,000 Hz) on comms events, the
    carrier and teletype through the same radio band;
  - machines: filtered noise for drills and thrusters, low sine thumps for
    docking, always with a metal "clank" layer above 500 Hz so a phone
    speaker still plays them (the lesson of audio-review.md items 2, 9, 17);
  - space: the synth pack's room plus a short station echo at 110 ms.

How the first game's sounds were avoided (R3): the purchase is a latch and
one rising fifth (not a till and a do-mi-sol fanfare), Dark Matter is a hum
under a grain cloud (not a four-note glass run), the boost is a hiss that
rises into one pop (not a scale run into a chord). scripts/audio/compare.py
measures it.

A recipe returns a mono float array; render_haul.py masters it with
dsp.master (trim, fades, DC, EQ guard, loudness, limiter) exactly as the
first pack is mastered.
"""
from __future__ import annotations

import math

import numpy as np

from dsp import (SR, TAU, Mix, bandpass, blosc, butter, filt, fm, glide, glide_exp, lowpass, midi, mtof, ns, perc,
                 phase, points, rcos_in, rcos_out, rng_for, svf, white)

HAUL_RECIPES = {}

BIG = 2.0          # loudness tiers, dB on the mastering target (same convention as the first pack)
FREQUENT = -2.0

SCALE_PCS = (9, 11, 1, 4, 6)      # A B C# E F#
SCALE_NAME = 'A major / F# minor pentatonic'


def haul_recipe(name, length=None, stream_ms=None, loud_db=0.0):
    """Register a haul recipe. Same meaning as recipes.recipe(), own registry:
    length (s) caps the file with a long fade; stream_ms measures loudness on
    the sound repeated at that interval; loud_db is the tier."""
    def deco(fn):
        fn.length = length
        fn.stream_ms = stream_ms
        fn.loud_db = float(loud_db)
        fn.haul = True
        if name in HAUL_RECIPES:
            raise ValueError('two haul recipes for %r' % name)
        HAUL_RECIPES[name] = fn
        return fn
    return deco


class OffScale(ValueError):
    pass


class HaulCtx:
    """What a recipe gets: the pack (timbres), a private random stream, the accents list."""

    def __init__(self, pack, key, i=1, n=1):
        self.p, self.key, self.i, self.n = pack, key, i, n
        self.rng = rng_for('haul', pack.name, key, i)
        self.accents = []
        self.notes = []
        self.floor_db = -50.0
        self.length = None

    def accent(self, *times):
        self.accents.extend(float(t) for t in times)

    def sub(self, tag):
        return rng_for('haul', self.p.name, self.key, self.i, tag)

    def hz(self, name, detune_cents=0.0):
        """Real pitch of a note name ('F#4' is 370 Hz). Off-scale notes raise OffScale."""
        m = midi(name)
        if int(round(m)) % 12 not in SCALE_PCS:
            raise OffScale('%s: %s is not in %s' % (self.key, name, SCALE_NAME))
        self.notes.append(name)
        return mtof(m) * 2.0 ** (detune_cents / 1200.0)

    def scale(self, lo, hi):
        return [mtof(m) for m in range(int(midi(lo)), int(midi(hi)) + 1) if m % 12 in SCALE_PCS]


# ===========================================================================
# textures of this game (built from dsp primitives, used only here)
# ===========================================================================

RADIO = butter('hp', 300.0, 4) + butter('lp', 3000.0, 4)


def radio(x):
    """The comms band: 300 to 3,000 Hz, steep both sides."""
    return filt(x, RADIO)


def squelch(rng, dur, kind='open', vel=1.0):
    """Radio squelch: band-passed noise with a ragged gate.
    'open'  hits at once, holds, and is cut short (the carrier takes over);
    'close' the 'kshh' at the end of a transmission: loud start, quick fall, cut."""
    n = ns(dur)
    x = radio(white(n, rng))
    grit = 1.0 + 0.55 * lowpass(white(n, rng), 140.0, 2) * 9.0       # the gate chattering
    if kind == 'open':
        env = points([(0, 0), (0.002, 1.0), (dur * 0.7, 0.8), (dur, 0.55)], n) * rcos_out(n, 3.0)
    else:
        env = points([(0, 0), (0.0015, 1.0), (dur * 0.25, 0.7), (dur, 0.0)], n) ** 1.4
    return vel * 1.6 * x * np.clip(grit, 0.25, 1.8) * env


def carrier(f, dur, rng, vel=1.0, wobble=0.12):
    """Radio carrier: a sine with a little 3rd harmonic and a slow AM, through the radio band."""
    n = ns(dur)
    t = np.arange(n) / SR
    ph = phase(f * (1.0 + 0.0015 * np.sin(TAU * 5.3 * t)), n)
    y = np.sin(ph) + 0.18 * np.sin(3 * ph)
    y *= 1.0 - wobble * (0.5 + 0.5 * np.sin(TAU * 31.0 * t + rng.uniform(0, TAU)))
    return vel * radio(y * rcos_in(n, 4.0) * rcos_out(n, 12.0))


def key_blip(f, dur=0.022, pw=0.18, vel=1.0, rng=None, tick=0.25):
    """Teletype / console key: a narrow pulse blip with a dry noise tick on top."""
    n = ns(dur)
    y = blosc(f, n, 'pulse', fmax=5600.0, pw=pw) * rcos_in(n, 0.6) * np.exp(-np.arange(n) / SR / (dur * 0.45))
    if rng is not None and tick:
        nt = min(ns(0.006), n)
        y[:nt] += tick * bandpass(white(nt, rng), 2600.0, 1.2) * perc(nt, 0.3, 0.0015)
    return vel * lowpass(y, 5000.0, 2)


def pulse_blip(f0, f1, dur, vel=1.0, pw=0.3, tau=None, lp=4200.0):
    """A short pulse-wave blip whose pitch moves from f0 to f1 (flat if equal)."""
    n = ns(dur)
    fr = f0 if f0 == f1 else glide(f0, f1, n, 0.8)
    y = blosc(fr, n, 'pulse', fmax=5800.0, pw=pw)
    env = rcos_in(n, 0.8) * (np.exp(-np.arange(n) / SR / tau) if tau else 1.0) * rcos_out(n, min(8.0, dur * 300.0))
    return vel * lowpass(y * env, lp, 2)


def tone(f, dur, vel=1.0, attack_ms=6.0, tau=None, h2=0.35, h3=0.15, release_ms=20.0):
    """A sine with 2nd and 3rd harmonics (a 'low' tone a phone can still play)."""
    n = ns(dur)
    ph = phase(f, n)
    y = np.sin(ph) + h2 * np.sin(2 * ph) + h3 * np.sin(3 * ph)
    env = rcos_in(n, attack_ms) * rcos_out(n, release_ms)
    if tau:
        env = env * np.exp(-np.arange(n) / SR / tau)
    return vel * y * env


def clank(p, f, rng, vel=1.0, tau=0.03):
    """Metal: the pack's digital knock plus a band of noise and an FM clink a tritave up.
    This is the layer that carries a dock thump on a phone."""
    m = Mix()
    m.add(p.knock(f, 1.0, tau=tau, tone=1.0, rng=rng))
    m.add(p.clink(f * 3.0, 0.35, tau=tau * 0.5, rng=rng))
    nt = ns(0.03)
    m.add(0.5 * bandpass(white(nt, rng), min(max(f * 2.2, 700.0), 2600.0), 1.6) * perc(nt, 0.4, 0.006))
    return vel * m.out()


def dock_thump(p, rng, vel=1.0, f0=170.0, f1=52.0, tau=0.1, metal=440.0, metal_vel=0.55):
    """Low sine thump for docking, with a metal clank on top for small speakers."""
    m = Mix()
    m.add(p.thump(1.0, f0=f0, f1=f1, tau=tau, rng=rng))
    m.add(clank(p, metal, rng, metal_vel, tau=min(0.04, tau * 0.4)))
    return vel * m.out()


def hiss(rng, dur, fc_path, q=0.9, env=None, vel=1.0):
    """Filtered noise whose band follows `fc_path` [(s, Hz), ...]: thrusters, flares, lasers."""
    n = ns(dur)
    fc = np.exp(points([(t, math.log(f)) for t, f in fc_path], n))
    y = svf(white(n, rng), fc, q, 'bp')
    y = lowpass(y, 6500.0, 4)
    if env is None:
        env = np.sin(np.pi * np.arange(n) / n) ** 2
    return vel * 2.2 * y * env


def rumble(rng, dur, fc_path, vel=1.0, env=None):
    """Low-passed noise for engines and burns (the body of a thruster)."""
    n = ns(dur)
    fc = np.exp(points([(t, math.log(f)) for t, f in fc_path], n))
    y = svf(white(n, rng), fc, 0.8, 'lp')
    if env is None:
        env = np.ones(n)
    return vel * 1.4 * y * env


def flicker(rng, n, rate=35.0, depth=0.5):
    """Random amplitude flutter (a burning flame, a ragged motor)."""
    w = lowpass(white(n + ns(0.05), rng), rate, 2)[:n]
    w = w / (np.max(np.abs(w)) + 1e-9)
    return 1.0 - depth * 0.5 * (1.0 + w)


def echo(x, delay=0.110, gain=0.35, taps=2, lp=2600.0):
    """The station echo: `taps` repeats `delay` apart, each darker and quieter."""
    d = ns(delay)
    out = np.concatenate([np.asarray(x, float), np.zeros(d * taps)])
    y = np.asarray(x, float)
    for k in range(1, taps + 1):
        y = lowpass(y, lp, 2)[:len(x)]
        out[k * d:k * d + len(x)] += (gain ** k) * y
    return out


def glints(c, dur, lo, hi, density=30.0, shape='flat', vel=1.0, tau=(0.05, 0.12), tag='glints'):
    """A cloud of tiny FM glass grains on scale tones (this game's 'shimmer')."""
    rng = c.sub(tag)
    notes = c.scale(lo, hi)
    count = max(int(density * dur), 1)
    u = (np.arange(count) + rng.uniform(0.1, 0.9, count)) / count
    if shape == 'rise':
        times, levels = dur * u, 0.2 + 0.8 * u ** 1.5
    elif shape == 'fall':
        times, levels = dur * u ** 1.3, (1.0 - 0.85 * u)
    elif shape == 'arch':
        times, levels = dur * u, np.sin(np.pi * u) ** 1.2 + 0.1
    else:
        times, levels = dur * u, np.ones(count)
    m = Mix(dur)
    for t0, lv in zip(times, levels):
        f = notes[rng.randint(len(notes))]
        tk = rng.uniform(*tau)
        g = c.p.bell(f, 1.0, kind='glass', bright=0.7, rng=rng, tau=tk, dur=tk * 6.0)
        m.add(g, at=t0, gain=lv * rng.uniform(0.4, 1.0))
    return vel * 0.45 * m.out()


def descend(c, dur, hi, lo, count, vel=1.0, tag='descend'):
    """Glass grains walking down the scale from `hi` to `lo`, fading."""
    rng = c.sub(tag)
    notes = c.scale(lo, hi)[::-1]
    m = Mix(dur)
    for j in range(count):
        u = j / max(count - 1, 1)
        f = notes[min(int(u * (len(notes) - 1)), len(notes) - 1)]
        tk = 0.09 - 0.04 * u
        m.add(c.p.bell(f, 1.0, kind='glass', bright=0.6, rng=rng, tau=tk, dur=tk * 6.0), at=dur * u ** 0.9,
              gain=(1.0 - 0.8 * u) * rng.uniform(0.7, 1.0))
    return vel * 0.5 * m.out()


# ===========================================================================
# the event table of spec 6.2 (data for the tech lead's catalog.haul.ts and
# for render_haul.py's checks): key -> (volume, min interval ms, haptic, brief)
# ===========================================================================

CORE_KEYS = ('ui_tap', 'ui_tab', 'ui_open', 'ui_close', 'ui_denied', 'hint', 'purchase_success', 'gems',
             'boost_start', 'music_main')

EVENTS = {
    'ui_tap': (0.45, 40, ['select'], 'dry 30 ms pulse blip'),
    'ui_tab': (0.4, 60, ['select'], 'two-tone sine tick'),
    'ui_open': (0.45, None, ['soft'], 'short upward filter sweep, 120 ms'),
    'ui_close': (0.35, None, [], 'downward twin of ui_open'),
    'ui_denied': (0.5, 300, ['warning'], 'low square double blip, muted'),
    'hint': (0.35, 800, [], 'one soft sine ping with echo'),
    'purchase_success': (0.7, None, ['success'], 'rising FM fifth with a filtered noise latch, 0.8 s'),
    'gems': (0.55, 150, [], 'Dark Matter: glassy shimmer over a low hum'),
    'boost_start': (0.65, None, ['medium'], 'flare ignition: hiss rising into a bright pop, 0.9 s'),
    'music_main': (0.35, None, [], '"Slow Orbit", 60 s loop (see 6.1)'),
    'route_grab': (0.45, None, ['select'], 'small magnetic click and hum start'),
    'route_snap': (0.5, 80, ['light'], 'quick rising blip when the line locks onto a rock'),
    'route_set': (0.55, None, ['rigid'], 'two-note confirm, pulse wave'),
    'route_cancel': (0.4, None, [], 'falling blip'),
    'hold_tick': (0.25, 120, [], 'soft metallic thunk of ore into the tank'),
    'hold_full': (0.5, 4000, ['warning'], 'two low sine tones, polite'),
    'launch_arm': (0.5, None, ['select'], 'latch click when the swipe passes 30 pt'),
    'launch_charge': (0.65, None, ['light', 300, 'medium', 300, 'heavy'], 'rising engine whine, 2.5 s, matched to the climb'),
    'launch_abort': (0.4, None, [], 'spool-down when the swipe is released short'),
    'warp_out': (0.8, None, ['heavy'], 'compressed whoomp plus a bright tail, 0.7 s'),
    'payout': (0.7, None, [], 'credit chime'),
    'credit_tick': (0.25, 60, [], 'tiny sine tick per falling credit glyph'),
    'freighter_land': (0.45, None, ['soft'], 'low thump and hiss'),
    'contract_new': (0.5, None, [], 'radio squelch plus a three-note teletype'),
    'contract_select': (0.45, None, ['select'], 'a pulse double tick'),
    'contract_met': (0.75, None, ['success'], 'stamp: noise burst plus a major-sixth FM stab'),
    'contract_lapse': (0.35, 500, [], 'short burn-out crackle'),
    'rock_dry': (0.4, 500, [], 'descending creak, filtered noise'),
    'rock_crumble': (0.55, 200, ['medium'], 'granular break, 0.6 s'),
    'rock_arrive': (0.4, 300, [], 'doppler swoosh ending in a soft bump'),
    'bonanza': (0.55, None, ['light'], 'bright double ping over the arrival'),
    'vein_start': (0.6, None, ['light'], 'gold shimmer rising, 1 s'),
    'vein_end': (0.35, None, [], 'shimmer fading down'),
    'flare_launch': (0.6, None, ['medium'], 'canister thump and a trail hiss'),
    'rig_upgrade': (0.55, 50, ['medium'], 'ratchet click plus a rising blip; pleasant on repeat'),
    'rig_tier': (0.7, None, ['success'], 'drill rev-up plus a chord (new bit)'),
    'claim_slot': (0.6, None, ['medium'], 'beacon ping, twice'),
    'drone_buy': (0.55, None, ['medium'], 'bay door, servo, puff'),
    'fleet_upgrade': (0.55, 50, ['medium'], 'servo sweep for capacity, engines and freighter'),
    'freighter_tier': (0.7, None, ['success'], 'bigger servo plus a low horn'),
    'system_online': (0.7, None, ['success'], 'power-up: three ascending hums and a click'),
    'module_fit': (0.55, None, ['rigid'], 'cartridge seat: slide and latch'),
    'module_remove': (0.4, None, ['light'], 'latch release'),
    'module_levelup': (0.65, None, ['success'], 'rising FM arpeggio'),
    'pod_arrive': (0.55, None, ['medium'], 'short retro-burn'),
    'salvage_cut': (0.55, None, ['light', 200, 'light'], 'laser hiss and a split, 1.2 s'),
    'salvage_common': (0.6, None, ['light'], 'reveal tone, short (0.3 s)'),
    'salvage_rare': (0.7, None, ['medium'], 'reveal tones, longer and brighter'),
    'salvage_epic': (0.8, None, ['success'], 'reveal tones, longest and brightest (1.2 s)'),
    'comms_in': (0.45, 1500, [], 'radio squelch open plus a short carrier tone'),
    'comms_ack': (0.4, None, ['select'], 'squelch close'),
    'shift_log': (0.35, None, [], 'one teleprinter burst when the log prints'),
    'daily_relay': (0.6, None, ['success'], 'allotment received: carrier chord'),
    'starmap_node': (0.6, None, ['medium'], 'node lights: crystalline ping and hum'),
    'trait_pick': (0.55, None, ['select'], 'selection chord'),
    'jump_warp': (0.85, None, ['heavy', 400, 'heavy'], 'the long jump: 2.5 s rising, cut, tail'),
}

MUSIC_KEYS = ('music_main',)

# Haptic patterns this pack proposes where the spec's pattern misses the
# sound's own hit (see docs/design/space-audio-notes.md). Same format.
PROPOSED_HAPTICS = {
    'boost_start': ['light', 580, 'medium'],
    'purchase_success': ['light', 190, 'success'],
    'rig_tier': ['medium', 400, 'success'],
    'freighter_tier': ['medium', 360, 'success'],
    'system_online': ['light', 160, 'light', 160, 'light', 180, 'success'],
    'module_fit': ['light', 120, 'rigid'],
    'module_levelup': ['light', 210, 'success'],
    'salvage_cut': ['light', 200, 'light', 800, 'medium'],
    'salvage_epic': ['medium', 260, 'success'],
    'daily_relay': ['light', 260, 'success'],
    'jump_warp': ['heavy', 400, 'heavy', 1100, 'heavy'],
}


# ===========================================================================
# core keys (the ten every mode plays), written new for this game
# ===========================================================================

@haul_recipe('ui_tap', length=0.05, loud_db=FREQUENT)
def ui_tap(c):
    """A dry 30 ms console key: a narrow pulse blip on C#6, level in pitch, with a dry noise tick on its front. Not a bubble."""
    c.accent(0.0)
    return key_blip(c.hz('C#6'), 0.03, pw=0.2, rng=c.rng, tick=0.6)


@haul_recipe('ui_tab', length=0.06)
def ui_tab(c):
    """One dual-tone tick (F#5 + C#6 sounding together, like a console's tone pair): one onset, no interval to climb."""
    p, m = c.p, Mix()
    for f, v in ((c.hz('F#5'), 1.0), (c.hz('C#6'), 0.75)):
        m.add(tone(f, 0.045, v, attack_ms=0.8, tau=0.015, h2=0.08, h3=0.0, release_ms=6.0))
    c.accent(0.0)
    return m.out()


@haul_recipe('ui_open', length=0.13)
def ui_open(c):
    """A resonant filter sweep up (600 to 3,200 Hz in 120 ms) on a quiet pulse that rises an octave; a tick at t = 0."""
    p, m = c.p, Mix()
    dur = 0.12
    env = points([(0, 0.45), (0.09, 1.0), (dur, 0.0)], ns(dur))
    m.add(p.whoosh(dur, [(0, 600.0), (dur, 3200.0)], q=1.0, env=env, rng=c.rng), 0.0, 0.8)
    n = ns(dur)
    m.add(0.18 * blosc(glide(c.hz('E5'), c.hz('E6'), n, 0.9), n, 'pulse', fmax=5000.0, pw=0.3) * env, 0.0)
    m.add(key_blip(c.hz('E6'), 0.012, vel=0.35, rng=c.rng, tick=0.1), 0.0)
    c.accent(0.0)
    return m.out()


@haul_recipe('ui_close', length=0.12)
def ui_close(c):
    """The downward twin: the tick, then the sweep falls 3,000 to 550 Hz and the pulse drops an octave."""
    p, m = c.p, Mix()
    dur = 0.11
    env = points([(0, 0.9), (0.015, 1.0), (dur, 0.0)], ns(dur)) ** 1.3
    m.add(p.whoosh(dur, [(0, 3000.0), (dur, 550.0)], q=1.0, env=env, rng=c.rng), 0.0, 0.8)
    n = ns(dur)
    m.add(0.18 * blosc(glide(c.hz('E6'), c.hz('E5'), n, 0.9), n, 'pulse', fmax=5000.0, pw=0.3) * env, 0.0)
    m.add(key_blip(c.hz('E6'), 0.012, vel=0.35, rng=c.rng, tick=0.1), 0.0)
    c.accent(0.0)
    return m.out()


@haul_recipe('ui_denied', length=0.2)
def ui_denied(c):
    """Two muted square blips on the same low F#4, 85 ms apart: a flat 'nuh-nuh' (a square an octave up rides on it, so a phone keeps it)."""
    m = Mix()
    for t0, v in ((0.0, 1.0), (0.085, 0.9)):
        n = ns(0.06)
        f = c.hz('F#4')
        sq = blosc(f, n, 'square', fmax=3000.0) + 0.7 * blosc(2.0 * f, n, 'square', fmax=3000.0)
        env = rcos_in(n, 1.5) * points([(0, 1.0), (0.035, 0.85), (0.06, 0.0)], n)
        y = lowpass(sq * env, 2400.0, 2)
        m.add(v * y, t0)
    c.accent(0.0, 0.085)
    return m.out()


@haul_recipe('hint', length=0.34)
def hint(c):
    """One soft sine ping on F#6 and its station echo (110 and 220 ms, darker each time)."""
    p = c.p
    f = c.hz('F#6')
    n = ns(0.16)
    y = (np.sin(phase(f, n)) + 0.06 * np.sin(phase(2 * f, n))) * perc(n, 5.0, 0.045)
    c.accent(0.0)
    return echo(y, 0.110, 0.42, taps=2, lp=3000.0)


@haul_recipe('purchase_success', length=0.8, loud_db=BIG)
def purchase_success(c):
    """A cargo latch (filtered noise 'ka-chk' over a metal clank), then one rising
    fifth on FM tines, F#4 to C#5, the C#5 left ringing in the station room with
    a glass overtone. One leap, no fanfare, no chord run."""
    p, m = c.p, Mix()
    rng = c.rng
    for t0, fc, v in ((0.0, 1500.0, 1.0), (0.032, 2300.0, 0.8)):          # ka-chk
        nt = ns(0.03)
        m.add(v * 0.9 * bandpass(white(nt, rng), fc, 1.4) * perc(nt, 0.4, 0.006), t0)
    m.add(clank(p, c.hz('A4'), rng, 0.55, tau=0.025), 0.0)
    lo, hi = c.hz('F#4'), c.hz('C#5')
    m.add(p.pluck(lo, 0.8, ring=0.35, bright=1.1, rng=rng), 0.07)
    m.add(p.bell(lo * 2.0, 0.22, kind='glass', ring=0.4, rng=rng), 0.07)
    m.add(p.thump(0.45, f0=150.0, f1=70.0, tau=0.05, rng=rng), 0.19)
    m.add(p.pluck(hi, 1.0, ring=0.9, bright=1.2, rng=rng), 0.19)
    m.add(p.bell(hi * 2.0, 0.35, kind='glass', ring=0.8, rng=rng), 0.19)
    m.add(p.choir([hi, hi * 1.5], 0.55, attack=0.05, release=0.35, rng=rng), 0.19, 0.22)
    c.accent(0.0, 0.19)
    return p.verb(m.out(), 0.14, tail=0.3)


@haul_recipe('gems', length=0.6)
def gems(c):
    """Dark Matter: a low detuned hum (F#2 + C#3 saws, closed filter) swelling under an
    arch-shaped cloud of glass grains from C#6 to F#7. No melody line to follow."""
    p, m = c.p, Mix()
    hum = p.pad([c.hz('F#2'), c.hz('C#3'), c.hz('F#3')], 0.7, attack=0.02, release=0.35, bright=0.25, rng=c.rng)
    n = len(hum)
    hum = hum * points([(0, 0.0), (0.02, 0.8), (0.16, 1.0), (0.7, 0.4)], n)
    t = np.arange(n) / SR
    m.add(hum * (1.0 - 0.25 * (0.5 + 0.5 * np.sin(TAU * 6.0 * t))), 0.0, 1.1)
    m.add(glints(c, 0.55, 'C#6', 'F#7', density=40.0, shape='arch', vel=1.0, tau=(0.04, 0.1)), 0.0)
    m.add(p.bell(c.hz('F#6'), 0.45, kind='glass', ring=0.5, rng=c.rng), 0.0)
    c.accent(0.0)
    return p.verb(m.out(), 0.18, tail=0.3, space='hall')


@haul_recipe('boost_start', length=0.85)
def boost_start(c):
    """Flare ignition: a spark at t = 0, a hiss whose band climbs 500 to 5,000 Hz for
    0.58 s, then one bright pop (falling pulse-sine onto A6 with an FM glint a third above) and
    a short burning flicker. No notes before the pop."""
    p, m = c.p, Mix()
    rng = c.rng
    nt = ns(0.012)
    m.add(1.6 * bandpass(white(nt, rng), 3200.0, 1.5) * perc(nt, 0.3, 0.003), 0.0)          # spark
    m.add(key_blip(c.hz('A6'), 0.02, vel=0.5, rng=rng, tick=0.0), 0.0)
    rise = 0.58
    n = ns(rise)
    env = (0.08 + 0.92 * (np.arange(n) / n) ** 2.2) * rcos_out(n, 6.0)
    m.add(hiss(rng, rise, [(0, 500.0), (rise, 5000.0)], q=1.4, env=env), 0.0, 1.3)
    m.add(p.pop(c.hz('A6'), c.hz('A5'), vel=1.0, tau=0.03, drop=0.02, rng=rng), rise)
    m.add(p.bell(c.hz('C#7'), 0.5, kind='hand', ring=0.35, rng=rng), rise)       # a third over the pop, not an open fifth
    m.add(p.bell(c.hz('A6'), 0.5, kind='glass', ring=0.5, rng=rng), rise)
    nc = ns(0.02)
    m.add(0.8 * bandpass(white(nc, rng), 2600.0, 0.9) * perc(nc, 0.3, 0.004), rise)
    m.add(p.thump(0.4, f0=180.0, f1=80.0, tau=0.04, rng=rng), rise)
    nb = ns(0.3)
    burn = hiss(rng, 0.3, [(0, 2500.0), (0.3, 1500.0)], q=0.7, env=np.exp(-np.arange(nb) / SR / 0.09)) * flicker(rng, nb, 40.0, 0.7)
    m.add(burn, rise + 0.01, 0.45)
    c.accent(0.0, rise)
    return p.verb(m.out(), 0.12, tail=0.22)


# ===========================================================================
# routing
# ===========================================================================

@haul_recipe('route_grab', length=0.3)
def route_grab(c):
    """A small magnetic click (clink and tick) and a hum that starts under the finger (B4, buzzing at 62 Hz)."""
    p, m = c.p, Mix()
    m.add(p.knock(c.hz('E5'), 0.7, tau=0.006, tone=0.8, rng=c.rng), 0.0)
    m.add(p.clink(c.hz('B6'), 0.35, tau=0.01, rng=c.rng), 0.0)
    dur = 0.28
    n = ns(dur)
    t = np.arange(n) / SR
    f = c.hz('B4')
    hum = tone(f, dur, 1.0, attack_ms=25.0, h2=0.4, h3=0.3, release_ms=120.0)
    hum += 0.25 * lowpass(blosc(f, n, 'pulse', fmax=3000.0, pw=0.2), 1600.0, 2) * rcos_in(n, 25.0) * rcos_out(n, 120.0)
    hum *= 1.0 - 0.3 * (0.5 + 0.5 * np.sin(TAU * 62.0 * t))
    m.add(hum, 0.01, 0.3)
    c.accent(0.0)
    return m.out()


@haul_recipe('route_snap', length=0.07, loud_db=FREQUENT)
def route_snap(c):
    """Quick rising pulse blip, E5 to B5 in 35 ms: the line locks."""
    c.accent(0.0)
    return pulse_blip(c.hz('E5'), c.hz('B5'), 0.05, pw=0.25, tau=0.022)


@haul_recipe('route_set', length=0.3)
def route_set(c):
    """Two-note confirm on a pulse wave, A5 then E6 (a fifth), 75 ms apart, doubled softly by an FM tine."""
    p, m = c.p, Mix()
    for t0, nt, v in ((0.0, 'A5', 0.85), (0.075, 'E6', 1.0)):
        f = c.hz(nt)
        m.add(pulse_blip(f, f, 0.07, vel=v, pw=0.3, tau=0.035, lp=4000.0), t0)
        m.add(p.tine(f, 0.3 * v, ring=0.25, rng=c.rng), t0)
    c.accent(0.0, 0.075)
    return p.verb(m.out(), 0.08, tail=0.15)


@haul_recipe('route_cancel', length=0.1)
def route_cancel(c):
    """Falling pulse blip, E6 down to A5 in 60 ms."""
    c.accent(0.0)
    return pulse_blip(c.hz('E6'), c.hz('A5'), 0.07, pw=0.3, tau=0.03)


# ===========================================================================
# hold, launch, warp, payout
# ===========================================================================

@haul_recipe('hold_tick', length=0.09, loud_db=FREQUENT)
def hold_tick(c):
    """Soft metallic thunk of ore into the tank: a dull E5 knock with a small body thump and a pinch of rattle, low-passed."""
    p, m = c.p, Mix()
    m.add(p.knock(c.hz('E5'), 0.8, tau=0.012, tone=0.7, rng=c.rng), 0.0)
    m.add(p.thump(0.22, f0=240.0, f1=130.0, tau=0.018, rng=c.rng), 0.0)
    nt = ns(0.03)
    m.add(0.25 * bandpass(white(nt, c.rng), 1300.0, 1.2) * perc(nt, 0.8, 0.008), 0.002)
    m.add(p.clink(c.hz('A6'), 0.12, tau=0.008, rng=c.rng), 0.003)
    c.accent(0.0)
    return lowpass(m.out(), 3400.0, 2)


@haul_recipe('hold_full', length=0.45)
def hold_full(c):
    """Two polite low tones, C#5 then F#4 (a fifth down), 200 ms apart, with their harmonics so a phone keeps them."""
    m = Mix()
    for t0, nt, v in ((0.0, 'C#5', 0.9), (0.2, 'F#4', 1.0)):
        m.add(tone(c.hz(nt), 0.3, v, attack_ms=8.0, tau=0.11, h2=0.45, h3=0.2, release_ms=40.0), t0)
    c.accent(0.0, 0.2)
    return c.p.verb(m.out(), 0.08, tail=0.12)


@haul_recipe('launch_arm', length=0.07)
def launch_arm(c):
    """Latch click: a dry tick at 2 kHz over a short metal knock."""
    p, m = c.p, Mix()
    nt = ns(0.008)
    m.add(0.8 * bandpass(white(nt, c.rng), 2400.0, 1.5) * perc(nt, 0.2, 0.0015), 0.0)
    m.add(key_blip(2100.0, 0.01, pw=0.12, vel=0.4, rng=None), 0.0)
    m.add(p.knock(c.hz('E5'), 0.6, tau=0.009, tone=1.0, rng=c.rng), 0.002)
    c.accent(0.0)
    return m.out()


@haul_recipe('launch_charge', length=2.5)
def launch_charge(c):
    """Rising engine whine for the 2.5 s climb: two detuned saws gliding A3 to A5
    behind a tracking low-pass, a thruster rumble opening up, and three ignition
    stages (0, 0.3, 0.6 s) where the whine and the burn step up, matched to the
    light-medium-heavy haptic ramp."""
    p, m = c.p, Mix()
    rng = c.rng
    dur = 2.5
    n = ns(dur)
    u = np.arange(n) / n
    fr = glide(c.hz('A3'), c.hz('A5'), n, 0.85)
    whine = blosc(fr, n, 'saw', fmax=5500.0) + 0.7 * blosc(fr * 1.006, n, 'saw', fmax=5500.0)
    whine = svf(whine, np.minimum(fr * 3.5, 5500.0), 1.8, 'lp')
    t = np.arange(n) / SR
    steps = 0.35 + 0.15 * (t >= 0.3) + 0.15 * (t >= 0.6)
    steps = lowpass(steps, 30.0, 2)
    m.add(whine * steps * (0.25 + 0.75 * u ** 1.4) * rcos_in(n, 15.0), 0.0, 0.4)
    burn = rumble(rng, dur, [(0, 380.0), (0.6, 900.0), (dur, 2600.0)], env=steps * (0.5 + 0.5 * u)) * flicker(rng, n, 30.0, 0.35)
    m.add(burn, 0.0, 0.55)
    for t0, v in ((0.0, 0.7), (0.3, 0.85), (0.6, 1.0)):
        m.add(dock_thump(p, rng, 0.5 * v, f0=150.0, f1=60.0, tau=0.06, metal=c.hz('E4'), metal_vel=0.4), t0)
        nb = ns(0.06)
        m.add(0.6 * v * bandpass(white(nb, rng), 1400.0, 0.8) * perc(nb, 0.5, 0.015), t0)
    c.accent(0.0, 0.3, 0.6)
    return m.out()


@haul_recipe('launch_abort', length=0.5)
def launch_abort(c):
    """Spool-down: a release clunk, then the whine falls from 560 to 170 Hz and the burn closes and dies."""
    p, m = c.p, Mix()
    rng = c.rng
    m.add(clank(p, c.hz('E4'), rng, 0.6, tau=0.02), 0.0)
    dur = 0.65
    n = ns(dur)
    fr = glide(560.0, 170.0, n, 0.55)
    env = points([(0, 0.0), (0.01, 1.0), (dur, 0.0)], n) ** 1.6
    whine = blosc(fr, n, 'saw', fmax=5000.0) + 0.7 * blosc(fr * 0.994, n, 'saw', fmax=5000.0)
    m.add(svf(whine, np.minimum(fr * 3.0, 4000.0), 1.5, 'lp') * env, 0.0, 0.32)
    m.add(rumble(rng, dur, [(0, 1500.0), (dur, 300.0)], env=env), 0.0, 0.3)
    c.accent(0.0)
    return m.out()


@haul_recipe('warp_out', length=0.7, loud_db=BIG)
def warp_out(c):
    """Compressed whoomp (sub drop, a burst of noise slammed shut by a closing filter,
    a heavy clank, all driven into a soft saturator) plus a bright tail: a quick
    'zing' up and glass grains ringing out in the station echo."""
    p, m = c.p, Mix()
    rng = c.rng
    body = Mix()
    body.add(p.thump(1.0, f0=210.0, f1=42.0, tau=0.12, rng=rng), 0.0)
    body_gain = 1.4
    nb = ns(0.18)
    burst = svf(white(nb, rng), glide(4000.0, 180.0, nb, 0.6), 0.9, 'lp') * perc(nb, 1.0, 0.05)
    body.add(1.2 * burst, 0.0)
    body.add(clank(p, c.hz('F#4'), rng, 0.7, tau=0.04), 0.0)
    y = body.out()
    y = np.tanh(2.2 * y / (np.max(np.abs(y)) + 1e-9)) * 0.9                       # compressed
    m.add(y, 0.0, body_gain)
    nz = ns(0.09)
    m.add(hiss(rng, 0.09, [(0, 2000.0), (0.09, 6000.0)], q=2.0, env=perc(nz, 2.0, 0.04)), 0.02, 0.35)
    m.add(p.bell(c.hz('F#6'), 0.55, kind='glass', ring=0.8, rng=rng), 0.03)
    m.add(p.bell(c.hz('C#7'), 0.35, kind='hand', ring=0.6, rng=rng), 0.035)
    m.add(glints(c, 0.4, 'E6', 'F#7', density=30.0, shape='fall', vel=0.8), 0.06)
    c.accent(0.0)
    return p.verb(m.out(), 0.16, tail=0.25)


@haul_recipe('payout', length=0.5)
def payout(c):
    """Credit chime: a console chord struck at once (C#6 + F#6, FM 1:1.4) over a soft
    E5 tine, then the readout counting up: four tiny pulse digits climbing to E7."""
    p, m = c.p, Mix()
    m.add(p.bell(c.hz('C#6'), 0.9, kind='desk', ring=0.6, rng=c.rng), 0.0)
    m.add(p.bell(c.hz('F#6'), 0.75, kind='desk', ring=0.6, rng=c.rng), 0.0)
    m.add(p.tine(c.hz('E5'), 0.4, ring=0.5, rng=c.rng), 0.0)
    for j, nt in enumerate(('A6', 'B6', 'C#7', 'E7')):
        m.add(key_blip(c.hz(nt), 0.018, pw=0.2, vel=0.22 + 0.04 * j, rng=c.rng, tick=0.0), 0.12 + 0.035 * j)
    c.accent(0.0)
    return p.verb(m.out(), 0.12, tail=0.2)


@haul_recipe('credit_tick', length=0.04, stream_ms=60.0, loud_db=FREQUENT)
def credit_tick(c):
    """A tiny sine tick on A6 per falling credit glyph (normalised as a stream, one every 60 ms)."""
    f = c.hz('A6')
    n = ns(0.035)
    y = (np.sin(phase(f, n)) + 0.08 * np.sin(phase(2 * f, n))) * perc(n, 0.8, 0.006)
    c.accent(0.0)
    return y


@haul_recipe('freighter_land', length=0.5)
def freighter_land(c):
    """Low thump of the pads (with the clank that a phone plays) and a pneumatic hiss settling."""
    p, m = c.p, Mix()
    rng = c.rng
    m.add(dock_thump(p, rng, 0.7, f0=160.0, f1=48.0, tau=0.12, metal=c.hz('C#5'), metal_vel=1.0), 0.0)
    nh = ns(0.55)
    env = rcos_in(nh, 20.0) * np.exp(-np.arange(nh) / SR / 0.16)
    m.add(hiss(rng, 0.55, [(0, 3800.0), (0.55, 2600.0)], q=0.8, env=env), 0.04, 0.5)
    c.accent(0.0)
    return m.out()


# ===========================================================================
# contracts
# ===========================================================================

@haul_recipe('contract_new', length=0.42)
def contract_new(c):
    """A radio squelch opens, a three-note teletype prints (E6, B5, F#6) and the squelch closes."""
    p, m = c.p, Mix()
    rng = c.rng
    m.add(squelch(rng, 0.07, 'open', 0.8), 0.0)
    for t0, nt in ((0.09, 'E6'), (0.14, 'B5'), (0.19, 'F#6')):
        m.add(key_blip(c.hz(nt), 0.03, pw=0.15, vel=1.0, rng=rng, tick=0.4), t0)
    m.add(squelch(rng, 0.05, 'close', 0.55), 0.27)
    c.accent(0.0, 0.09)
    return radio(m.out())


@haul_recipe('contract_select', length=0.08, loud_db=FREQUENT)
def contract_select(c):
    """A pulse double tick on C#6, 40 ms apart."""
    m = Mix()
    f = c.hz('C#6')
    m.add(pulse_blip(f, f, 0.018, pw=0.2, tau=0.006), 0.0)
    m.add(pulse_blip(f, f, 0.018, vel=0.8, pw=0.2, tau=0.006), 0.04)
    c.accent(0.0, 0.04)
    return m.out()


@haul_recipe('contract_met', length=0.65, loud_db=BIG)
def contract_met(c):
    """The stamp: a thud and a dry noise burst, then a major-sixth FM stab (A4 + F#5,
    doubled an octave up on glass) held in the room."""
    p, m = c.p, Mix()
    rng = c.rng
    m.add(p.thump(0.9, f0=190.0, f1=60.0, tau=0.06, rng=rng), 0.0)
    nb = ns(0.05)
    m.add(1.1 * bandpass(white(nb, rng), 1200.0, 0.7) * perc(nb, 0.4, 0.012), 0.0)
    m.add(clank(p, c.hz('A4'), rng, 0.5, tau=0.02), 0.0)
    for nt, v in (('A4', 0.8), ('F#5', 1.0)):
        f = c.hz(nt)
        m.add(p.bell(f, v, kind='desk', ring=0.7, rng=rng), 0.025)
        m.add(p.pluck(f, 0.6 * v, ring=0.6, bright=1.1, rng=rng), 0.025)
        m.add(p.bell(f * 2.0, 0.3 * v, kind='glass', ring=0.7, rng=rng), 0.03)
    m.add(p.choir([c.hz('A4'), c.hz('F#5')], 0.55, attack=0.03, release=0.35, rng=rng), 0.025, 0.25)
    c.accent(0.0)
    return p.verb(m.out(), 0.15, tail=0.3)


@haul_recipe('contract_lapse', length=0.35)
def contract_lapse(c):
    """Burn-out crackle: sparse electrical crackles thinning out over a falling fizzle."""
    p, m = c.p, Mix()
    rng = c.rng
    count = 26
    u = (np.arange(count) + rng.uniform(0.1, 0.9, count)) / count
    for j, t0 in enumerate(0.38 * u ** 1.6):
        nt = ns(rng.uniform(0.002, 0.006))
        g = (1.0 - 0.8 * u[j]) * rng.uniform(0.4, 1.0)
        m.add(g * bandpass(white(nt, rng), rng.uniform(1200.0, 4200.0), 2.5) * perc(nt, 0.2, 0.0015), t0)
    dur = 0.42
    n = ns(dur)
    env = points([(0, 0.0), (0.01, 1.0), (dur, 0.0)], n) ** 2
    m.add(0.2 * lowpass(blosc(glide(660.0, 220.0, n, 0.7), n, 'saw', fmax=3000.0), 1600.0, 2) * env, 0.0)
    m.add(0.25 * bandpass(white(n, rng), 1800.0, 0.7) * env * flicker(rng, n, 60.0, 0.8), 0.0)
    c.accent(0.0)
    return m.out()


# ===========================================================================
# rocks
# ===========================================================================

@haul_recipe('rock_dry', length=0.45)
def rock_dry(c):
    """A descending creak: stick-slip pulses slowing from 110 to 32 Hz through three
    falling resonances, over a dull band of filtered noise."""
    p, m = c.p, Mix()
    rng = c.rng
    dur = 0.52
    n = ns(dur)
    rate = glide(110.0, 32.0, n, 1.1) * (1.0 + 0.08 * lowpass(white(n, rng), 50.0, 2) * 8.0)
    src = blosc(rate, n, 'pulse', fmax=3200.0, pw=0.08)
    y = svf(src, glide(950.0, 520.0, n), 6.0, 'bp') + 0.7 * svf(src, glide(1750.0, 1000.0, n), 6.0, 'bp')
    y += 0.3 * svf(src, glide(2600.0, 1500.0, n), 5.0, 'bp')
    env = points([(0, 0.0), (0.015, 0.7), (dur * 0.3, 1.0), (dur, 0.0)], n)
    m.add(1.4 * y * env, 0.0)
    m.add(0.35 * bandpass(white(n, rng), 650.0, 1.0) * env, 0.0)
    c.accent(0.0)
    return m.out()


@haul_recipe('rock_crumble', length=0.5)
def rock_crumble(c):
    """Granular break: a crack and a thump, then sixty grit grains and a few stone knocks falling apart."""
    p, m = c.p, Mix()
    rng = c.rng
    m.add(dock_thump(p, rng, 0.35, f0=140.0, f1=55.0, tau=0.06, metal=c.hz('E5'), metal_vel=0.6), 0.0)
    nc = ns(0.012)
    m.add(1.4 * bandpass(white(nc, rng), 2100.0, 1.0) * perc(nc, 0.2, 0.003), 0.0)
    count = 60
    u = (np.arange(count) + rng.uniform(0.1, 0.9, count)) / count
    for j, t0 in enumerate(0.55 * u ** 1.8):
        nt = ns(rng.uniform(0.003, 0.016))
        g = (1.0 - 0.85 * u[j]) * rng.uniform(0.3, 1.0)
        m.add(1.6 * g * bandpass(white(nt, rng), rng.uniform(600.0, 3400.0), 1.8) * perc(nt, 0.4, nt / SR * 0.35), t0)
    for t0, nt in ((0.03, 'E5'), (0.08, 'B4'), (0.15, 'F#5'), (0.24, 'C#5')):
        m.add(p.knock(c.hz(nt), 0.35, tau=0.014, tone=0.9, rng=rng), t0 + rng.uniform(0, 0.01))
    c.accent(0.0)
    return m.out()


@haul_recipe('rock_arrive', length=0.55)
def rock_arrive(c):
    """Doppler swoosh: a noise band and a hum that rise as the rock closes in and drop as it passes, ending in a soft bump."""
    p, m = c.p, Mix()
    rng = c.rng
    dur = 0.44
    n = ns(dur)
    u = np.arange(n) / n
    env = np.exp(-((u - 0.68) / 0.26) ** 2) * rcos_in(n, 10.0) * rcos_out(n, 30.0)
    m.add(hiss(rng, dur, [(0, 900.0), (0.30, 2300.0), (dur, 800.0)], q=1.2, env=env), 0.0)
    f = c.hz('B4')
    dop = f * (1.0 + 0.06 * -np.tanh((u - 0.68) * 9.0))
    m.add(0.22 * (np.sin(phase(dop, n)) + 0.3 * np.sin(2 * phase(dop, n))) * env, 0.0)
    m.add(p.thump(0.5, f0=150.0, f1=70.0, tau=0.04, rng=rng), dur - 0.02)
    m.add(p.knock(c.hz('E4'), 0.45, tau=0.02, tone=0.5, rng=rng), dur - 0.02)
    c.accent(0.0, dur - 0.02)
    return m.out()


@haul_recipe('bonanza', length=0.6)
def bonanza(c):
    """A bright double ping, C#7 twice 90 ms apart (the second louder), with its octave below and the station echo."""
    p, m = c.p, Mix()
    for t0, v in ((0.0, 0.75), (0.09, 1.0)):
        m.add(p.bell(c.hz('C#7'), v, kind='hand', ring=0.5, rng=c.rng), t0)
        m.add(p.tine(c.hz('C#6'), 0.35 * v, ring=0.4, rng=c.rng), t0)
    c.accent(0.0, 0.09)
    return echo(p.verb(m.out(), 0.1, tail=0.15), 0.110, 0.3, taps=1)


@haul_recipe('vein_start', length=0.85)
def vein_start(c):
    """Gold shimmer rising: a soft F#5 ping, a glass pad swelling (F#4 C#5 A5) and a grain cloud that thickens and climbs for 1 s."""
    p, m = c.p, Mix()
    m.add(p.tine(c.hz('F#5'), 0.4, ring=0.5, rng=c.rng), 0.0)
    pad = p.choir([c.hz('F#4'), c.hz('C#5'), c.hz('A5')], 0.95, attack=0.6, release=0.2, rng=c.rng)
    m.add(pad, 0.0, 0.5)
    m.add(p.riser(0.9, c.hz('F#4'), c.hz('F#6'), rng=c.rng), 0.0, 0.18)
    m.add(glints(c, 0.85, 'C#6', 'F#7', density=40.0, shape='rise', vel=1.4), 0.03)
    c.accent(0.0)
    return p.verb(m.out(), 0.16, tail=0.2, space='hall')


@haul_recipe('vein_end', length=0.55)
def vein_end(c):
    """Shimmer fading down: glass grains walking down from F#7 to C#6 while the pad closes and lets go."""
    p, m = c.p, Mix()
    pad = p.choir([c.hz('F#4'), c.hz('C#5')], 0.6, attack=0.01, release=0.5, rng=c.rng)
    pad = pad * np.exp(-np.arange(len(pad)) / SR / 0.25)
    m.add(pad, 0.0, 0.45)
    m.add(descend(c, 0.5, 'F#7', 'C#6', 10, vel=1.0), 0.0)
    c.accent(0.0)
    return p.verb(m.out(), 0.15, tail=0.2, space='hall')


@haul_recipe('flare_launch', length=0.55)
def flare_launch(c):
    """Canister thump (a low pop, a clank and a puff) and a trail hiss climbing away with a flicker."""
    p, m = c.p, Mix()
    rng = c.rng
    m.add(dock_thump(p, rng, 0.8, f0=180.0, f1=65.0, tau=0.05, metal=c.hz('E4'), metal_vel=0.55), 0.0)
    m.add(p.pop(c.hz('E5'), c.hz('B4'), vel=0.5, tau=0.02, drop=0.015, rng=rng), 0.0)
    nb = ns(0.04)
    m.add(0.9 * bandpass(white(nb, rng), 900.0, 0.8) * perc(nb, 0.5, 0.012), 0.0)
    dur = 0.66
    n = ns(dur)
    env = points([(0, 0.0), (0.03, 0.6), (0.12, 1.0), (dur, 0.0)], n) ** 1.3
    m.add(hiss(rng, dur, [(0, 1500.0), (dur, 4600.0)], q=1.0, env=env) * flicker(rng, n, 45.0, 0.6), 0.02, 0.6)
    c.accent(0.0)
    return m.out()


# ===========================================================================
# station upgrades
# ===========================================================================

@haul_recipe('rig_upgrade', length=0.14, loud_db=FREQUENT)
def rig_upgrade(c):
    """A three-tooth ratchet (16 ms apart) and a small rising pulse blip, B5 to E6. Short, so twenty in a row stay a purr."""
    m = Mix()
    for j, t0 in enumerate((0.0, 0.016, 0.032)):
        nt = ns(0.006)
        m.add((0.55 + 0.15 * j) * bandpass(white(nt, c.rng), 2800.0, 1.6) * perc(nt, 0.2, 0.0012), t0)
        m.add(key_blip(2200.0 + 150.0 * j, 0.007, pw=0.1, vel=0.25, rng=None), t0)
    m.add(pulse_blip(c.hz('B5'), c.hz('E6'), 0.06, vel=0.8, pw=0.3, tau=0.03), 0.045)
    c.accent(0.0)
    return m.out()


@haul_recipe('rig_tier', length=0.75)
def rig_tier(c):
    """Drill rev-up (a rotating noise band and a whine spinning up for 0.4 s), then the new bit's chord: F#m on FM tines with glass on top."""
    p, m = c.p, Mix()
    rng = c.rng
    dur = 0.42
    n = ns(dur)
    rot = glide(12.0, 55.0, n, 0.9)
    am = 0.55 + 0.45 * np.sin(phase(rot, n))
    env = points([(0, 0.65), (0.3, 1.0), (dur, 0.6)], n) * rcos_in(n, 3.0) * rcos_out(n, 40.0)
    m.add(bandpass(white(n, rng), 1000.0, 1.4) * am * env, 0.0, 1.2)
    wh = glide(300.0, 980.0, n, 0.8)
    m.add(0.3 * lowpass(blosc(wh, n, 'saw', fmax=4500.0), 2500.0, 2) * am * env, 0.0)
    m.add(clank(p, c.hz('E5'), rng, 0.5, tau=0.015), 0.0)                   # the bit engages
    hit = 0.4
    m.add(dock_thump(p, rng, 0.55, f0=150.0, f1=60.0, tau=0.06, metal=c.hz('A4'), metal_vel=0.35), hit)
    for j, nt in enumerate(('F#4', 'A4', 'C#5', 'F#5')):
        m.add(p.pluck(c.hz(nt), 0.75, ring=0.7, bright=1.1, rng=rng), hit + 0.006 * j)
    m.add(p.bell(c.hz('E6'), 0.4, kind='glass', ring=0.7, rng=rng), hit)
    m.add(p.bell(c.hz('C#6'), 0.3, kind='glass', ring=0.6, rng=rng), hit + 0.01)
    c.accent(0.0, hit)
    return p.verb(m.out(), 0.13, tail=0.25)


@haul_recipe('claim_slot', length=0.55)
def claim_slot(c):
    """Beacon ping, twice: an FM beacon on B5, 220 ms apart, each with its station echo."""
    p, m = c.p, Mix()
    for t0 in (0.0, 0.22):
        m.add(p.bell(c.hz('B5'), 0.9, kind='hand', ring=0.35, rng=c.rng), t0)
        m.add(p.tine(c.hz('B4'), 0.35, ring=0.35, rng=c.rng), t0)
    c.accent(0.0, 0.22)
    return echo(m.out(), 0.110, 0.3, taps=1)


@haul_recipe('drone_buy', length=0.5)
def drone_buy(c):
    """Bay door (a clack and a heavy slide), a servo winding up, and the drone's puff as it leaves."""
    p, m = c.p, Mix()
    rng = c.rng
    m.add(clank(p, c.hz('A4'), rng, 1.0, tau=0.03), 0.0)
    nd = ns(0.16)
    door = svf(white(nd, rng), glide(700.0, 2000.0, nd, 0.8), 1.2, 'bp') * points([(0, 0.0), (0.01, 1.0), (0.16, 0.0)], nd)
    m.add(1.4 * door, 0.0)
    m.add(p.creak(0.24, 0.6, rng=rng), 0.12)
    np_ = ns(0.14)
    m.add(1.2 * svf(white(np_, rng), glide(1400.0, 600.0, np_), 1.0, 'bp') * perc(np_, 2.0, 0.04), 0.4)
    m.add(p.thump(0.2, f0=170.0, f1=90.0, tau=0.03, rng=rng), 0.4)
    c.accent(0.0, 0.4)
    return m.out()


@haul_recipe('fleet_upgrade', length=0.09, loud_db=FREQUENT)
def fleet_upgrade(c):
    """A small click and a quick servo sweep (FM, 320 to 640 Hz in 60 ms, dying away), short
    enough that twenty at the 50 ms floor still pulse instead of smearing into a drone."""
    p, m = c.p, Mix()
    m.add(key_blip(1900.0, 0.008, pw=0.12, vel=0.35, rng=c.rng, tick=0.3), 0.0)
    dur = 0.07
    n = ns(dur)
    fr = glide(320.0, 640.0, n, 0.8)
    y = fm(fr, 3.0, 1.0, n) + 0.35 * blosc(fr * 0.5, n, 'pulse', fmax=3000.0, pw=0.2)
    m.add(0.75 * lowpass(y, 3000.0, 2) * points([(0, 0.0), (0.006, 1.0), (0.03, 0.8), (dur, 0.0)], n) ** 1.3, 0.004)
    c.accent(0.0)
    return m.out()


@haul_recipe('freighter_tier', length=0.8)
def freighter_tier(c):
    """A bigger servo (180 to 540 Hz over 0.35 s) after a clank, then a low two-note horn (F#3 + C#4) settling in the hall."""
    p, m = c.p, Mix()
    rng = c.rng
    m.add(clank(p, c.hz('C#4'), rng, 0.7, tau=0.03), 0.0)
    dur = 0.36
    n = ns(dur)
    fr = glide(180.0, 540.0, n, 0.9)
    y = fm(fr, 3.0, 1.4, n) + 0.5 * blosc(fr, n, 'pulse', fmax=3500.0, pw=0.25)
    m.add(0.7 * lowpass(y, 2600.0, 2) * points([(0, 0.0), (0.02, 0.7), (0.3, 1.0), (dur, 0.0)], n), 0.01)
    hit = 0.36
    m.add(dock_thump(p, rng, 0.35, f0=140.0, f1=50.0, tau=0.08, metal=c.hz('F#4'), metal_vel=0.5), hit)
    for nt, v in (('F#3', 0.5), ('C#4', 0.7), ('F#4', 0.7)):
        m.add(p.brass(c.hz(nt), 0.62, v, bright=1.0, rng=rng, release=0.25, fall=0.6), hit)
    c.accent(0.0, hit)
    return p.verb(m.out(), 0.14, tail=0.3, space='hall')


@haul_recipe('system_online', length=0.75, loud_db=BIG)
def system_online(c):
    """Power-up: three ascending hums stacking up (C#4, F#4, C#5, 160 ms apart) and a relay click when the system is live."""
    p, m = c.p, Mix()
    rng = c.rng
    for j, (t0, nt) in enumerate(((0.0, 'C#4'), (0.16, 'F#4'), (0.32, 'C#5'))):
        dur = 0.78 - t0
        f = c.hz(nt)
        h = p.pad([f], dur, attack=0.04, release=0.3, bright=0.9, rng=rng)
        h += 0.5 * tone(f, dur, 1.0, attack_ms=40.0, h2=0.4, h3=0.2, release_ms=300.0)
        m.add(h, t0, 0.55 + 0.1 * j)
        m.add(p.knock(f * 2.0, 0.3, tau=0.01, tone=0.6, rng=rng), t0)
    m.add(clank(p, c.hz('A5'), rng, 0.6, tau=0.012), 0.5)
    m.add(key_blip(2400.0, 0.01, pw=0.12, vel=0.5, rng=rng, tick=0.4), 0.5)
    m.add(p.bell(c.hz('F#6'), 0.3, kind='glass', ring=0.6, rng=rng), 0.5)
    c.accent(0.0, 0.16, 0.32, 0.5)
    return p.verb(m.out(), 0.12, tail=0.25)


# ===========================================================================
# fitting bay, salvage
# ===========================================================================

@haul_recipe('module_fit', length=0.3)
def module_fit(c):
    """Cartridge seat: a short slide (a rising band of noise) and a firm latch at 120 ms."""
    p, m = c.p, Mix()
    rng = c.rng
    dur = 0.12
    n = ns(dur)
    m.add(1.2 * svf(white(n, rng), glide(1100.0, 2500.0, n), 1.5, 'bp') * points([(0, 0.0), (0.005, 0.6), (dur, 1.0)], n) * rcos_out(n, 5.0), 0.0)
    hit = 0.12
    m.add(clank(p, c.hz('E4'), rng, 0.9, tau=0.02), hit)
    m.add(p.thump(0.4, f0=180.0, f1=90.0, tau=0.03, rng=rng), hit)
    m.add(key_blip(2200.0, 0.008, pw=0.1, vel=0.5, rng=rng, tick=0.4), hit)
    c.accent(0.0, hit)
    return m.out()


@haul_recipe('module_remove', length=0.2)
def module_remove(c):
    """Latch release: a click, then the cartridge slides out (falling band of noise)."""
    p, m = c.p, Mix()
    rng = c.rng
    m.add(clank(p, c.hz('B4'), rng, 0.6, tau=0.012), 0.0)
    m.add(key_blip(2000.0, 0.008, pw=0.1, vel=0.4, rng=rng, tick=0.4), 0.0)
    dur = 0.12
    n = ns(dur)
    m.add(1.0 * svf(white(n, rng), glide(2400.0, 1000.0, n), 1.5, 'bp') * points([(0, 0.0), (0.01, 1.0), (dur, 0.0)], n), 0.025)
    c.accent(0.0)
    return m.out()


@haul_recipe('module_levelup', length=0.6)
def module_levelup(c):
    """Rising FM arpeggio, F#4 C#5 F#5 A5 (70 ms apart), the A5 ringing with a glass overtone."""
    p, m = c.p, Mix()
    notes = ('F#4', 'C#5', 'F#5', 'A5')
    for j, nt in enumerate(notes):
        last = j == len(notes) - 1
        m.add(p.pluck(c.hz(nt), 0.7 + 0.1 * j, ring=0.8 if last else 0.3, bright=1.1, rng=c.rng), 0.07 * j)
    top = 0.07 * (len(notes) - 1)
    m.add(p.bell(c.hz('A6'), 0.4, kind='glass', ring=0.8, rng=c.rng), top)
    m.add(p.bell(c.hz('E6'), 0.25, kind='glass', ring=0.7, rng=c.rng), top + 0.01)
    c.accent(0.0, top)
    return p.verb(m.out(), 0.13, tail=0.25)


@haul_recipe('pod_arrive', length=0.6)
def pod_arrive(c):
    """Short retro-burn: a thruster burst that opens hard and closes, with a rumble, and a clunk as the pod settles."""
    p, m = c.p, Mix()
    rng = c.rng
    dur = 0.36
    n = ns(dur)
    env = points([(0, 0.0), (0.006, 1.0), (0.25, 0.75), (dur, 0.0)], n)
    m.add(hiss(rng, dur, [(0, 2600.0), (dur, 700.0)], q=0.7, env=env) * flicker(rng, n, 50.0, 0.4), 0.0, 0.8)
    m.add(rumble(rng, dur, [(0, 900.0), (dur, 300.0)], env=env), 0.0, 0.6)
    m.add(dock_thump(p, rng, 0.75, f0=150.0, f1=55.0, tau=0.06, metal=c.hz('C#4'), metal_vel=0.55), 0.38)
    c.accent(0.0, 0.38)
    return m.out()


@haul_recipe('salvage_cut', length=1.2)
def salvage_cut(c):
    """Laser hiss and a split: two cutting beams (F#5, then C#6 from 0.2 s) buzzing over a
    hot hiss, then the shell cracks open at 1.0 s (crack, thump, a breath of air)."""
    p, m = c.p, Mix()
    rng = c.rng
    for t0, dur, nt, v in ((0.0, 0.95, 'F#5', 0.7), (0.2, 0.75, 'C#6', 0.6)):
        n = ns(dur)
        t = np.arange(n) / SR
        f = c.hz(nt) * (1.0 + 0.004 * np.sin(TAU * 27.0 * t))
        beam = fm(f, 1.5, 0.9 + 0.3 * np.sin(TAU * 3.0 * t), n)
        env = rcos_in(n, 3.0) * rcos_out(n, 40.0) * (0.75 + 0.25 * np.sin(TAU * 7.0 * t + v))
        m.add(v * 0.5 * lowpass(beam, 4500.0, 2) * env, t0)
        nh = ns(0.02)
        m.add(0.5 * bandpass(white(nh, rng), 3500.0, 1.5) * perc(nh, 0.3, 0.004), t0)        # the beam bites
    nh = ns(0.95)
    m.add(hiss(rng, 0.95, [(0, 3800.0), (0.5, 4400.0), (0.95, 3600.0)], q=1.6,
               env=rcos_in(nh, 8.0) * rcos_out(nh, 40.0) * 0.6) * flicker(rng, nh, 80.0, 0.5), 0.0, 0.5)
    hit = 1.0
    nc = ns(0.02)
    m.add(2.6 * bandpass(white(nc, rng), 1800.0, 0.8) * perc(nc, 0.2, 0.006), hit)
    m.add(dock_thump(p, rng, 1.3, f0=160.0, f1=55.0, tau=0.07, metal=c.hz('E5'), metal_vel=0.7), hit)
    na = ns(0.15)
    m.add(0.6 * hiss(rng, 0.15, [(0, 1200.0), (0.15, 500.0)], q=0.7, env=perc(na, 3.0, 0.05)), hit + 0.01)
    c.accent(0.0, 0.2, hit)
    return m.out()


@haul_recipe('salvage_common', length=0.32)
def salvage_common(c):
    """Common: one short FM ping on C#6 over its octave."""
    p, m = c.p, Mix()
    m.add(p.bell(c.hz('C#6'), 0.9, kind='hand', ring=0.3, rng=c.rng), 0.0)
    m.add(p.tine(c.hz('C#5'), 0.35, ring=0.3, rng=c.rng), 0.0)
    c.accent(0.0)
    return p.verb(m.out(), 0.1, tail=0.12)


@haul_recipe('salvage_rare', length=0.5)
def salvage_rare(c):
    """Rare: one brighter struck dyad (C#6 + A6 at once, FM) over its octave, and a
    short cloud of glass grains rising out of it. One strike, then the cloud."""
    p, m = c.p, Mix()
    for nt, v in (('C#6', 0.85), ('A6', 0.7)):
        m.add(p.bell(c.hz(nt), v, kind='hand', ring=0.5, bright=1.2, rng=c.rng), 0.0)
    m.add(p.tine(c.hz('A5'), 0.35, ring=0.4, rng=c.rng), 0.0)
    m.add(glints(c, 0.32, 'E6', 'F#7', density=34.0, shape='rise', vel=0.8), 0.04)
    c.accent(0.0)
    return p.verb(m.out(), 0.13, tail=0.2, space='hall')


@haul_recipe('salvage_epic', length=0.95, loud_db=BIG)
def salvage_epic(c):
    """Epic: a swell (glass pad and a rising noise band, 0.26 s) pulled into one big
    bright chord (B5 E6 F#6 C#7 on FM bells, a struck sus chord, no arpeggio) with a
    soft thump under it and a grain cloud pouring out. The brightest of the three."""
    p, m = c.p, Mix()
    rng = c.rng
    hit = 0.26
    m.add(p.tine(c.hz('F#5'), 0.5, ring=0.3, rng=rng), 0.0)
    sw = p.choir([c.hz('B4'), c.hz('F#5')], hit + 0.05, attack=hit * 0.9, release=0.04, rng=rng)
    m.add(sw, 0.0, 0.6)
    nh = ns(hit)
    m.add(hiss(rng, hit, [(0, 900.0), (hit, 5000.0)], q=1.6, env=(np.arange(nh) / nh) ** 2 * rcos_out(nh, 5.0)), 0.0, 0.5)
    m.add(dock_thump(p, rng, 0.35, f0=150.0, f1=60.0, tau=0.06, metal=c.hz('F#5'), metal_vel=0.35), hit)
    for j, (nt, v) in enumerate((('B5', 0.6), ('E6', 0.75), ('F#6', 0.85), ('C#7', 0.6))):
        m.add(p.bell(c.hz(nt), v, kind='hand', ring=0.9, bright=1.2, rng=rng), hit + 0.003 * j)
    m.add(p.choir([c.hz('E5'), c.hz('B5'), c.hz('F#6')], 0.6, attack=0.02, release=0.45, rng=rng), hit, 0.3)
    m.add(glints(c, 0.6, 'E6', 'F#7', density=44.0, shape='fall', vel=1.0), hit + 0.02)
    c.accent(0.0, hit)
    return p.verb(m.out(), 0.15, tail=0.25, space='hall')


# ===========================================================================
# comms
# ===========================================================================

@haul_recipe('comms_in', length=0.32)
def comms_in(c):
    """The squelch opens (70 ms of band-passed noise, cut), then a short carrier on F#5."""
    m = Mix()
    m.add(squelch(c.rng, 0.07, 'open', 1.0), 0.0)
    m.add(carrier(c.hz('F#5'), 0.2, c.rng, 0.9), 0.068)
    c.accent(0.0)
    return m.out()


@haul_recipe('comms_ack', length=0.1)
def comms_ack(c):
    """Squelch close: the push-to-talk click and a short 'kshh' that drops away."""
    m = Mix()
    m.add(key_blip(1800.0, 0.006, pw=0.1, vel=0.4, rng=c.rng, tick=0.3), 0.0)
    m.add(squelch(c.rng, 0.075, 'close', 1.0), 0.004)
    c.accent(0.0)
    return radio(m.out())


@haul_recipe('shift_log', length=0.45)
def shift_log(c):
    """One teleprinter burst: fourteen clacks at about 32 ms over a motor hum, through the radio band."""
    p, m = c.p, Mix()
    rng = c.rng
    t0 = 0.0
    for j in range(14):
        f = (2200.0, 2900.0, 2500.0)[j % 3] * rng.uniform(0.97, 1.03)
        nt = ns(0.008)
        m.add((0.6 + 0.4 * rng.uniform()) * bandpass(white(nt, rng), f, 2.0) * perc(nt, 0.2, 0.0018), t0)
        m.add(p.knock(c.hz('E6') if j % 2 else c.hz('B5'), 0.18, tau=0.005, tone=0.8, rng=rng), t0)
        t0 += rng.uniform(0.027, 0.037)
    dur = t0 + 0.06
    m.add(tone(c.hz('A3'), dur, 0.07, attack_ms=15.0, h2=0.7, h3=0.5, release_ms=50.0), 0.0)
    c.accent(0.0)
    return radio(m.out())


@haul_recipe('daily_relay', length=0.75)
def daily_relay(c):
    """Allotment received: a brief squelch, then three carriers arrive (F#4, C#5, A5) and hold as one chord."""
    p, m = c.p, Mix()
    rng = c.rng
    m.add(squelch(rng, 0.05, 'open', 0.7), 0.0)
    for t0, nt, v in ((0.05, 'F#4', 0.8), (0.15, 'C#5', 0.75), (0.26, 'A5', 0.7)):
        m.add(carrier(c.hz(nt), 0.85 - t0, rng, v, wobble=0.2), t0)
    m.add(p.bell(c.hz('E6'), 0.35, kind='glass', ring=0.6, rng=rng), 0.26)
    m.add(p.tine(c.hz('A5'), 0.3, ring=0.5, rng=rng), 0.26)
    c.accent(0.0, 0.26)
    return p.verb(m.out(), 0.12, tail=0.2)


# ===========================================================================
# star map, jump
# ===========================================================================

@haul_recipe('starmap_node', length=0.6)
def starmap_node(c):
    """A node lights: a crystalline ping (E6 with B6 on glass) over a hum that swells and fades (F#2, F#3)."""
    p, m = c.p, Mix()
    m.add(p.bell(c.hz('E6'), 0.9, kind='glass', ring=0.9, rng=c.rng), 0.0)
    m.add(p.bell(c.hz('B6'), 0.45, kind='glass', ring=0.7, rng=c.rng), 0.004)
    hum = p.pad([c.hz('F#3')], 0.75, attack=0.12, release=0.4, bright=0.3, rng=c.rng)
    hum += 0.5 * tone(c.hz('F#2'), 0.75, 1.0, attack_ms=120.0, h2=0.6, h3=0.4, release_ms=400.0)
    m.add(hum, 0.0, 0.55)
    c.accent(0.0)
    return p.verb(m.out(), 0.15, tail=0.2, space='hall')


@haul_recipe('trait_pick', length=0.45)
def trait_pick(c):
    """Selection chord: one struck open chord (B4 E5 F#5) on FM, with a key tick at its front."""
    p, m = c.p, Mix()
    m.add(key_blip(c.hz('F#6'), 0.012, pw=0.15, vel=0.35, rng=c.rng, tick=0.3), 0.0)
    for j, nt in enumerate(('B4', 'E5', 'F#5')):
        m.add(p.pluck(c.hz(nt), 0.75, ring=0.5, bright=1.0, rng=c.rng), 0.004 * j)
        m.add(p.bell(c.hz(nt) * 2.0, 0.18, kind='desk', ring=0.4, rng=c.rng), 0.004 * j)
    c.accent(0.0)
    return p.verb(m.out(), 0.12, tail=0.2)


@haul_recipe('jump_warp', length=2.25, loud_db=BIG)
def jump_warp(c):
    """The long jump, cut to the Jump sequence: two engage clunks (0, 0.4 s); a riser
    of saws and a noise band climbing for 1.5 s while the stars streak; the cut at
    1.5 s (everything stops at once into a compressed whoomp as the station
    shudders); then a glass tail and a low hum ringing through the station
    echo while the new galaxy's name types out."""
    p, m = c.p, Mix()
    rng = c.rng
    for t0, v in ((0.0, 0.8), (0.4, 1.0)):
        m.add(dock_thump(p, rng, v, f0=160.0, f1=50.0, tau=0.08, metal=c.hz('C#4'), metal_vel=0.6), t0)
    cut = 1.5
    n = ns(cut)
    u = np.arange(n) / n
    env = (0.1 + 0.9 * u ** 1.8) * rcos_in(n, 30.0) * rcos_out(n, 4.0)
    rise = Mix()
    rise.add(p.riser(cut, c.hz('F#2'), c.hz('F#5'), rng=rng), 0.0, 1.0)
    rise.add(p.riser(cut, c.hz('C#3'), c.hz('C#6'), rng=rng), 0.0, 0.6)
    rise.add(hiss(rng, cut, [(0, 300.0), (cut, 5500.0)], q=1.2, env=np.ones(n)), 0.0, 0.9)
    r = rise.out()[:n] * env
    m.add(r, 0.0)
    body = Mix()
    body.add(p.thump(1.0, f0=220.0, f1=38.0, tau=0.18, rng=rng), 0.0)
    nb = ns(0.25)
    body.add(1.3 * svf(white(nb, rng), glide(5000.0, 160.0, nb, 0.5), 0.9, 'lp') * perc(nb, 1.0, 0.07), 0.0)
    body.add(clank(p, c.hz('F#4'), rng, 0.8, tau=0.05), 0.0)
    y = body.out()
    m.add(np.tanh(2.0 * y / (np.max(np.abs(y)) + 1e-9)) * 0.95, cut)
    tail = Mix()
    tail.add(p.bell(c.hz('F#6'), 0.6, kind='glass', ring=1.2, rng=rng), 0.02)
    tail.add(p.bell(c.hz('C#7'), 0.4, kind='glass', ring=1.0, rng=rng), 0.03)
    tail.add(glints(c, 0.9, 'C#6', 'F#7', density=24.0, shape='fall', vel=0.9), 0.05)
    tail.add(p.choir([c.hz('F#3'), c.hz('C#4'), c.hz('F#4')], 1.1, attack=0.05, release=0.8, rng=rng), 0.0, 0.35)
    m.add(echo(tail.out(), 0.110, 0.3, taps=2), cut)
    c.accent(0.0, 0.4, cut)
    return p.verb(m.out(), 0.14, tail=0.3, space='hall')
