#!/usr/bin/env python3
"""Render Orbit Haulers' sound pack (space-miner, mode "haul") from recipes_haul.py.

  python3 scripts/audio/render_haul.py --check     every key of spec 6.2 has a haul recipe, none falls back
  python3 scripts/audio/render_haul.py             render all 55 effects + music_main.m4a, then QA them
  python3 scripts/audio/render_haul.py --only 'ui_*,hold_tick' --no-music
  python3 scripts/audio/render_haul.py --qa        measure the rendered folder only (no rendering)
  python3 scripts/audio/render_haul.py --accents   sound accents next to the haptic patterns
  python3 scripts/audio/render_haul.py --rows DIR  rows of twenty of the sounds that repeat fast, measured, plus a picture
  python3 scripts/audio/render_haul.py --sheets DIR one contact sheet (waveform + spectrogram) per group of sounds

This is the stand-in for `make_sfx.py --pack synth --recipes haul` (spec 6.1),
which does not exist yet. It never falls back: a key without a haul recipe is
an error, and the warm recipes (recipes.py) are never imported.

Mastering is the first pack's, unchanged: dsp.master with the pack loudness
target plus the recipe's tier (BIG +2 dB, FREQUENT -2 dB), the -1 dBFS soft
limiter, trim at -50 dB, fades. QA uses qa.py's own measurements and checks,
with this pack's tiers (qa.py on its own reads the first pack's tiers).
"""
from __future__ import annotations

import sys

sys.dont_write_bytecode = True

import argparse
import fnmatch
import hashlib
import os
import time

import numpy as np

import dsp
from packs import PACKS

import recipes_haul as RH

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'games', 'space-miner', 'assets', 'sfx')
FX = os.path.join(ROOT, 'src', 'services', 'fx')
PACK_NAME = 'synth'
PACK_BUDGET_BYTES = 3_000_000           # same budget as the first pack, music included


# ---------------------------------------------------------------------------
# coverage
# ---------------------------------------------------------------------------

def catalogue_keys():
    """Keys of catalog.core.ts + catalog.haul.ts when the tech lead has written them, else None."""
    paths = [os.path.join(FX, 'catalog.core.ts'), os.path.join(FX, 'catalog.haul.ts')]
    if not all(os.path.exists(p) for p in paths):
        return None
    try:
        import make_sfx
        keys = []
        for p in paths:
            keys += [e['key'] for e in make_sfx.parse_catalog(p)]
        return keys
    except Exception as e:                       # a catalogue that does not parse yet is reported, not fatal
        print('render_haul: could not read the haul catalogue (%s); using the spec table' % e, file=sys.stderr)
        return None


def check():
    """-> list of problems (empty when every key has its own haul recipe)."""
    problems = []
    keys = list(RH.EVENTS)
    music = set(RH.MUSIC_KEYS)
    for k in keys:
        if k in music:
            continue
        fn = RH.HAUL_RECIPES.get(k)
        if fn is None:
            problems.append('%s: no haul recipe' % k)
        elif fn.__module__ != RH.__name__ or not getattr(fn, 'haul', False):
            problems.append('%s: recipe comes from %s, not from recipes_haul' % (k, fn.__module__))
    for k in RH.HAUL_RECIPES:
        if k not in RH.EVENTS:
            problems.append('%s: haul recipe without a key in the event table' % k)
    missing_core = [k for k in RH.CORE_KEYS if k not in RH.EVENTS]
    if missing_core:
        problems.append('core keys missing from the table: %s' % ', '.join(missing_core))
    if 'recipes' in sys.modules:
        problems.append('the first game\'s recipes.py was imported: a fallback is possible')
    cat = catalogue_keys()
    if cat is not None:
        for k in cat:
            if k not in RH.EVENTS:
                problems.append('%s: in catalog.core/haul.ts but not in recipes_haul.EVENTS' % k)
        for k in RH.EVENTS:
            if k not in cat:
                problems.append('%s: in recipes_haul.EVENTS but not in catalog.core/haul.ts' % k)
    return problems, cat is not None


# ---------------------------------------------------------------------------
# rendering
# ---------------------------------------------------------------------------

def target_db(key):
    return dsp.LOUDNESS_TARGET_DB + RH.HAUL_RECIPES[key].loud_db


def render_effect(pack, key):
    """-> (mastered samples, master info, accents, notes used)."""
    fn = RH.HAUL_RECIPES[key]
    c = RH.HaulCtx(pack, key)
    c.length = fn.length
    raw = fn(c)
    y, info = dsp.master(raw, floor_db=c.floor_db, length=c.length, stream_ms=fn.stream_ms, target_db=target_db(key))
    return y, info, sorted(c.accents), c.notes


def haptic_times(pattern):
    t, out = 0.0, []
    for step in pattern:
        if isinstance(step, (int, float)):
            t += step / 1000.0
        else:
            out.append((step, t))
    return out


def qa_effect(key, y):
    """qa.py's measurements and checks with this pack's tier -> (analysis, errors, warnings)."""
    import qa
    a = qa.analyse(y)
    every = RH.HAUL_RECIPES[key].stream_ms
    if every:
        a['loud_db'] = dsp.stream_loudness_db(y, every)
    err, warn = qa.check_effect(a, (dsp.SR, 1, 16), bool(RH.EVENTS[key][2]), target_db(key))
    a['low_share'] = low_share(y)
    return a, err, warn


def low_share(y, split=400.0):
    S = np.abs(np.fft.rfft(y, dsp.pow2(max(len(y), 2048)))) ** 2
    f = np.fft.rfftfreq(dsp.pow2(max(len(y), 2048)), 1.0 / dsp.SR)
    return float(S[f < split].sum() / (S.sum() + 1e-30))


def read_mono(path):
    x, sr, ch, bits = dsp.read_wav(path)
    return (x if x.ndim == 1 else x.mean(axis=1)), (sr, ch, bits)


def effect_keys():
    return [k for k in RH.EVENTS if k not in RH.MUSIC_KEYS]


def print_row(key, a, err, warn, extra=''):
    notes = '; '.join(['FAIL ' + e for e in err] + warn)
    tier = RH.HAUL_RECIPES[key].loud_db
    print('%-18s %5.0f %6.1f %6.1f %+4.0f %+6.1f %6.0f %4.0f%% %6.1f %6.1f %6.2f  %s%s'
          % (key, a['duration'] * 1000, a['peak_db'], a['loud_db'], tier, a['phone_db'], a['centroid'], 100 * a['low_share'],
             a['hf_db'], a['onset_ms'], a['dead_tail_ms'], notes, extra))


HEADER = '%-18s %5s %6s %6s %4s %6s %6s %5s %6s %6s %6s  %s' % ('key', 'ms', 'peak', 'loud', 'tier', 'phone', 'cent', '<400', '>8k', 'onset', 'tail', 'notes')


def qa_folder(out_dir, keys=None):
    """Measure what is in the folder. -> number of failing files."""
    import qa
    keys = keys or effect_keys()
    fails = 0
    print(HEADER)
    total = 0
    for k in keys:
        path = os.path.join(out_dir, k + '.wav')
        if not os.path.exists(path):
            print('%-18s MISSING' % k)
            fails += 1
            continue
        y, fmt = read_mono(path)
        a, err, warn = qa_effect(k, y)
        if fmt != (dsp.SR, 1, 16):
            err.append('format %s' % (fmt,))
        fails += bool(err)
        total += os.path.getsize(path)
        print_row(k, a, err, warn)
    mpath = os.path.join(out_dir, 'music_main.m4a')
    if os.path.exists(mpath) and (not keys or keys == effect_keys()):
        x, meta = qa.decode(mpath)
        mono = x.mean(axis=1)
        a = qa.analyse(mono)
        a['loud_db'] = dsp.krms_db(x)
        a['peak_db'] = dsp.peak_db(x)
        a['clipped'] = int(np.sum(np.abs(x) >= 0.9999))
        seam = qa.seam_report(x)
        size = os.path.getsize(mpath)
        err, warn = qa.check_music(a, seam, meta, size)
        # spec 6.1 asks for a 60 s loop; qa.py's window is 30..45 s (the first pack's). Judge the length against the spec.
        err = [e for e in err if not e.endswith('(want %g..%g)' % (qa.MUSIC_MIN_S, qa.MUSIC_MAX_S))]
        if abs(a['duration'] - 60.0) > 0.1:
            err.append('%.2f s, spec 6.1 wants 60 s' % a['duration'])
        total += size
        fails += bool(err)
        print('%-18s %5.0f %6.1f %6.1f K-RMS, phone %+.1f, %s Hz %s ch %.0f kb/s %.0f KB; seam level %+.1f dB (inside p99 %.1f, max %.1f), '
              'spectrum %.1f dB (p%.0f), step %.4f (inside p99.9 %.4f)  %s'
              % ('music_main.m4a', a['duration'] * 1000, a['peak_db'], a['loud_db'], a['phone_db'], meta.get('sample_rate'),
                 meta.get('channels'), size * 8 / 1000.0 / a['duration'], size / 1000.0, seam['level_db'], seam['level_p99'],
                 seam['level_max'], seam['spec_db'], seam['spec_pct'], seam['jump'], seam['jump_p999'],
                 '; '.join(['FAIL ' + e for e in err] + warn)))
    strays = sorted(f for f in os.listdir(out_dir) if f.lower().endswith(('.wav', '.m4a', '.mp3', '.ogg'))
                    and os.path.splitext(f)[0] not in RH.EVENTS)
    if strays:
        print('FAIL not a key of this game: %s' % ', '.join(strays))
        fails += 1
    print('folder: %.2f MB (budget %.1f MB)' % (total / 1e6, PACK_BUDGET_BYTES / 1e6))
    if keys == effect_keys() and total > PACK_BUDGET_BYTES:
        print('FAIL over the pack budget')
        fails += 1
    return fails


# ---------------------------------------------------------------------------
# accents, rows, sheets
# ---------------------------------------------------------------------------

def accents_report(pack):
    print('%-18s %-36s %-26s %s' % ('key', 'haptic (spec 6.2)', 'sound accents (ms)', 'proposed pattern'))
    for k in effect_keys():
        _, _, acc, _ = render_effect(pack, k)
        hap = RH.EVENTS[k][2]
        hs = ' '.join('%s@%d' % (s, round(t * 1000)) for s, t in haptic_times(hap)) or '-'
        prop = RH.PROPOSED_HAPTICS.get(k)
        print('%-18s %-36s %-26s %s' % (k, hs, ' '.join('%d' % round(a * 1000) for a in acc) or '-',
                                        ' '.join(str(s) for s in prop) if prop else ''))


ROW_KEYS = {               # key -> repeat interval (ms) heard in play: the catalogue floor, or faster where the game can go faster
    'credit_tick': 60, 'hold_tick': 120, 'rig_upgrade': 50, 'fleet_upgrade': 50, 'route_snap': 80, 'ui_tap': 40,
    'contract_select': 120,
}


def row_of(y, every_ms, count=20, jitter_ms=0.0, rng=None, voices=3):
    """`count` copies every `every_ms`, at most `voices` sounding at once (a new one cuts the oldest, as the fx service does)."""
    step = every_ms / 1000.0
    starts = [int(round((i * step + (rng.uniform(-jitter_ms, jitter_ms) / 1000.0 if rng is not None and jitter_ms else 0.0)) * dsp.SR))
              for i in range(count)]
    starts = [max(s, 0) for s in starts]
    buf = np.zeros(starts[-1] + len(y))
    for i, s in enumerate(starts):
        seg = y.copy()
        if i + voices < len(starts):                      # cut by the voice that replaces it
            k = starts[i + voices] - s
            if k < len(seg):
                seg = seg[:k] * dsp.rcos_out(k, 3.0)
        buf[s:s + len(seg)] += seg
    return buf


def row_stats(buf, y, every_ms):
    """Peak, loudness, build-up against one shot, and the dip between hits (10 ms RMS envelope)."""
    hop = int(0.005 * dsp.SR)
    w = int(0.01 * dsp.SR)
    e = np.sqrt(np.convolve(buf * buf, np.ones(w) / w, 'same')[::hop] + 1e-12)
    step = int(every_ms / 5.0)
    mid = e[len(e) // 4: 3 * len(e) // 4]
    dips = []
    for i in range(0, len(mid) - step, step):
        seg = mid[i:i + step]
        dips.append(20 * np.log10(seg.max() / (seg.min() + 1e-9)))
    return {'peak_db': dsp.peak_db(buf), 'loud_db': dsp.loudness_db(buf), 'single_db': dsp.loudness_db(y),
            'dip_db': float(np.median(dips)) if dips else 0.0, 'env': e}


def rows_report(pack, out_dir, sheet_dir):
    import qa
    items = []
    print('%-16s %6s %7s %7s %7s %8s' % ('key', 'every', 'peak', 'row', 'single', 'dip'))
    for k, every in ROW_KEYS.items():
        y, _, _, _ = render_effect(pack, k)
        y = y * RH.EVENTS[k][0]                            # at its catalogue volume, as heard
        for ms in sorted({every, max(every, 100)}):
            buf = row_of(y, ms, 20, jitter_ms=4.0 if ms > 60 else 0.0, rng=np.random.RandomState(7))
            s = row_stats(buf, y, ms)
            print('%-16s %4d ms %7.1f %7.1f %7.1f %6.1f dB' % (k, ms, s['peak_db'], s['loud_db'], s['single_db'], s['dip_db']))
            a = qa.analyse(buf)
            items.append({'name': '%s x20 @%d ms' % (k, ms), 'mono': buf, 'a': a, 'err': [], 'warn': [], 'music': False})
    if sheet_dir:
        path = os.path.join(sheet_dir, 'rows.png')
        qa.contact_sheet(path, items, 'Orbit Haulers: rows of twenty at catalogue volume', cols=3)
        print('picture: %s' % path)


GROUPS = [
    ('core', list(RH.CORE_KEYS[:-1])),
    ('route_hold', ['route_grab', 'route_snap', 'route_set', 'route_cancel', 'hold_tick', 'hold_full', 'launch_arm']),
    ('launch_warp', ['launch_charge', 'launch_abort', 'warp_out', 'payout', 'credit_tick', 'freighter_land']),
    ('contracts_comms', ['contract_new', 'contract_select', 'contract_met', 'contract_lapse', 'comms_in', 'comms_ack', 'shift_log', 'daily_relay']),
    ('rocks', ['rock_dry', 'rock_crumble', 'rock_arrive', 'bonanza', 'vein_start', 'vein_end', 'flare_launch']),
    ('upgrades', ['rig_upgrade', 'rig_tier', 'claim_slot', 'drone_buy', 'fleet_upgrade', 'freighter_tier', 'system_online']),
    ('fitting_salvage', ['module_fit', 'module_remove', 'module_levelup', 'pod_arrive', 'salvage_cut', 'salvage_common', 'salvage_rare', 'salvage_epic']),
    ('map_jump', ['starmap_node', 'trait_pick', 'jump_warp']),
]


def sheets(out_dir, sheet_dir):
    import qa
    os.makedirs(sheet_dir, exist_ok=True)
    for name, keys in GROUPS:
        items = []
        for k in keys:
            y, _ = read_mono(os.path.join(out_dir, k + '.wav'))
            a, err, warn = qa_effect(k, y)
            items.append({'name': k, 'mono': y, 'a': a, 'err': err, 'warn': warn, 'music': False})
        path = os.path.join(sheet_dir, 'sheet_%s.png' % name)
        qa.contact_sheet(path, items, 'Orbit Haulers: %s' % name, cols=3)
        print('picture: %s' % path)
    mpath = os.path.join(out_dir, 'music_main.m4a')
    if os.path.exists(mpath):
        x, meta = qa.decode(mpath)
        mono = x.mean(axis=1)
        a = qa.analyse(mono)
        a['loud_db'] = dsp.krms_db(x)
        it = {'name': 'music_main.m4a', 'mono': mono, 'a': a, 'err': [], 'warn': [], 'music': True,
              'seam': qa.seam_report(x), 'meta': meta, 'size': os.path.getsize(mpath)}
        path = os.path.join(sheet_dir, 'sheet_music.png')
        qa.contact_sheet(path, [it], 'Orbit Haulers: Slow Orbit', cols=1)
        print('picture: %s' % path)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--only', help='comma-separated keys or globs')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--qa', action='store_true', help='measure the folder only')
    ap.add_argument('--accents', action='store_true')
    ap.add_argument('--rows', metavar='DIR', help='rows of twenty; picture into DIR')
    ap.add_argument('--sheets', metavar='DIR', help='contact sheets per group into DIR')
    ap.add_argument('--no-music', action='store_true')
    args = ap.parse_args(argv)

    problems, from_catalogue = check()
    if problems:
        print('render_haul: %d problem(s):\n  %s' % (len(problems), '\n  '.join(problems)), file=sys.stderr)
        return 2
    if args.check:
        n_fx = len(effect_keys())
        print('haul pack ok: %d keys (%d core, %d haul), %d effect recipes from recipes_haul, %d music loop; no key falls back; '
              'keys checked against %s'
              % (len(RH.EVENTS), len(RH.CORE_KEYS), len(RH.EVENTS) - len(RH.CORE_KEYS), n_fx, len(RH.MUSIC_KEYS),
                 'catalog.core.ts + catalog.haul.ts' if from_catalogue else 'the spec 6.2 table (the haul catalogue does not exist yet)'))
        return 0
    pack = PACKS[PACK_NAME]()
    if args.accents:
        accents_report(pack)
        return 0
    if args.rows:
        os.makedirs(args.rows, exist_ok=True)
        rows_report(pack, args.out, args.rows)
        return 0
    if args.sheets:
        sheets(args.out, args.sheets)
        return 0
    if args.qa:
        return 1 if qa_folder(args.out) else 0

    keys = effect_keys()
    if args.only:
        pats = [p.strip() for p in args.only.split(',') if p.strip()]
        keys = [k for k in keys if any(fnmatch.fnmatchcase(k, p) for p in pats)]
        render_music = any(fnmatch.fnmatchcase('music_main', p) for p in pats) and not args.no_music
    else:
        render_music = not args.no_music
    os.makedirs(args.out, exist_ok=True)
    print('pack %s timbres, haul recipes, %s' % (pack.name, RH.SCALE_NAME))
    t0 = time.time()
    for k in keys:
        y, info, _, _ = render_effect(pack, k)
        dsp.write_wav(os.path.join(args.out, k + '.wav'), y)
    if render_music:
        import haul_music
        info = haul_music.build(os.path.join(args.out, 'music_main.m4a'))
        print('music_main.m4a: %s, %.2f s, K-RMS %.1f dB, %.0f KB' % (info['title'], info['duration'], info['loudness_db'], info['bytes'] / 1000.0))
    print('rendered %d effect(s)%s in %.1f s -> %s\n' % (len(keys), ' + music' if render_music else '', time.time() - t0, args.out))
    fails = qa_folder(args.out, keys if args.only else None)
    print('\nQA %s: %d failing' % ('FAILED' if fails else 'passed', fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
