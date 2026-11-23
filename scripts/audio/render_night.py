#!/usr/bin/env python3
"""Render Lantern Row's sound pack (night-market, mode "merge") from recipes_night.py.

  python3 scripts/audio/render_night.py --check       every key of spec 6.2 has a night recipe, none falls back
  python3 scripts/audio/render_night.py               render every effect + both music loops, then QA them
  python3 scripts/audio/render_night.py --only 'merge_*,drop' --no-music
  python3 scripts/audio/render_night.py --qa          measure the rendered folder only (no rendering)
  python3 scripts/audio/render_night.py --accents     sound accents next to the haptic patterns
  python3 scripts/audio/render_night.py --rows DIR    rows of twenty of the sounds that repeat fast, measured, plus a picture
  python3 scripts/audio/render_night.py --sheets DIR  one contact sheet (waveform + spectrogram) per group of sounds
  python3 scripts/audio/render_night.py --hash        sha256 of every rendered file (two renders must match)

The output folder is games/night-market/assets/sfx once games/night-market/game.json exists
(--out overrides). The game has no shared pack (game.json "soundPack": null), so nothing can fall
back: a key without a night recipe is an error, and no other game's recipes or instruments
(recipes.py, recipes_haul.py, packs.py) are imported; --check proves it from sys.modules.

Mastering is the other two packs' chain, unchanged: dsp.master with the pack loudness target
plus the recipe's tier (BIG +2, LOUD +1, FREQUENT -2, QUIET -4 dB), the -1 dBFS soft limiter,
trim at -50 dB, fades. QA uses qa.py's own measurements and checks with this pack's tiers; the
music loops are judged against spec 6.2 (about 90 s) instead of qa.py's 30 to 45 s window.
"""
from __future__ import annotations

import sys

sys.dont_write_bytecode = True

import argparse
import fnmatch
import hashlib
import json
import os
import subprocess
import time

import numpy as np

import dsp
import recipes_night as RN

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
GAME = os.path.join(ROOT, 'games', 'night-market')
GAME_OUT = os.path.join(GAME, 'assets', 'sfx')
SCRATCH_OUT = os.environ.get('NIGHT_SFX_SCRATCH', '')
CATALOG = os.path.join(ROOT, 'src', 'services', 'fx', 'catalog.merge.ts')
PACK_BUDGET_BYTES = 3_000_000           # the budget of both other packs, music included
MUSIC_LEN_S = (88.0, 92.0)              # spec 6.2: "90 s loops"
FOREIGN = ('recipes', 'recipes_haul', 'packs')


def default_out():
    if os.path.exists(os.path.join(GAME, 'game.json')) or not SCRATCH_OUT:
        return GAME_OUT
    return SCRATCH_OUT


# ---------------------------------------------------------------------------
# coverage
# ---------------------------------------------------------------------------

def catalogue_entries():
    """Entries of catalog.merge.ts (read by scripts/lib/fxCatalog.js, as the app's table is), or None."""
    if not os.path.exists(CATALOG):
        return None
    js = ("process.stdout.write(JSON.stringify(require('./scripts/lib/fxCatalog.js').parseCatalog(%s)))"
          % json.dumps(CATALOG))
    run = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True)
    if run.returncode != 0:
        print('render_night: could not read catalog.merge.ts (%s); using the spec table' % run.stderr.strip()[-200:], file=sys.stderr)
        return None
    return json.loads(run.stdout)


def game_sound_pack():
    """game.json soundPack, or the string 'absent' when there is no game.json yet."""
    p = os.path.join(GAME, 'game.json')
    if not os.path.exists(p):
        return 'absent'
    with open(p) as f:
        return json.load(f).get('soundPack', 'absent')


def check():
    """-> (problems, catalogue entries or None)."""
    problems = []
    music = set(RN.MUSIC_KEYS)
    for k in effect_keys():
        fn = RN.NIGHT_RECIPES.get(k)
        if fn is None:
            problems.append('%s: no night recipe' % k)
        elif fn.__module__ != RN.__name__ or not getattr(fn, 'night', False):
            problems.append('%s: recipe comes from %s, not from recipes_night' % (k, fn.__module__))
    for k in RN.NIGHT_RECIPES:
        if k not in effect_keys():
            problems.append('%s: night recipe without a key in the event table' % k)
    for mod in FOREIGN:
        if mod in sys.modules:
            problems.append('%s.py was imported: another game\'s sounds could leak in' % mod)
    sp = game_sound_pack()
    if sp not in (None, 'absent'):
        problems.append('games/night-market/game.json soundPack is %r: it must be null (no shared pack to fall back on)' % sp)
    cat = catalogue_entries()
    if cat is not None:
        keys = [e['key'] for e in cat]
        for k in keys:
            if k not in RN.EVENTS:
                problems.append('%s: in catalog.merge.ts but not in recipes_night.EVENTS' % k)
        for k in RN.EVENTS:
            if k not in keys:
                problems.append('%s: in recipes_night.EVENTS but not in catalog.merge.ts' % k)
        for e in cat:
            if e['key'] not in RN.EVENTS:
                continue
            vol, gap, hap, _, voices = RN.EVENTS[e['key']]
            for field, mine in (('volume', vol), ('minIntervalMs', gap), ('haptic', hap), ('voices', voices if voices > 1 else None)):
                if e.get(field) != mine:
                    problems.append('%s: %s %r in catalog.merge.ts, %r in recipes_night.EVENTS' % (e['key'], field, e.get(field), mine))
            if e.get('files', 1) != RN.FILES.get(e['key'], 1):
                problems.append('%s: %s file(s) in catalog.merge.ts, %d in recipes_night.FILES'
                                % (e['key'], e.get('files', 1), RN.FILES.get(e['key'], 1)))
    return problems, cat


# ---------------------------------------------------------------------------
# rendering
# ---------------------------------------------------------------------------

def target_db(key):
    return dsp.LOUDNESS_TARGET_DB + RN.NIGHT_RECIPES[key].loud_db


def render_effect(key):
    """-> (mastered samples, master info, accents)."""
    fn = RN.NIGHT_RECIPES[key]
    c = RN.NightCtx(key)
    c.length = fn.length
    raw = fn(c)
    if not np.all(np.isfinite(raw)):
        raise ValueError('%s: the recipe returned NaN or inf' % key)
    y, info = dsp.master(raw, floor_db=c.floor_db, length=c.length, stream_ms=fn.stream_ms, target_db=target_db(key))
    return y, info, sorted(c.accents)


def haptic_times(pattern):
    t, out = 0.0, []
    for step in pattern or []:
        if isinstance(step, (int, float)):
            t += step / 1000.0
        else:
            out.append((step, t))
    return out


def low_share(y, split=400.0):
    S = np.abs(np.fft.rfft(y, dsp.pow2(max(len(y), 2048)))) ** 2
    f = np.fft.rfftfreq(dsp.pow2(max(len(y), 2048)), 1.0 / dsp.SR)
    return float(S[f < split].sum() / (S.sum() + 1e-30))


def qa_effect(key, y):
    """qa.py's measurements and checks with this pack's tier -> (analysis, errors, warnings)."""
    import qa
    a = qa.analyse(y)
    every = RN.NIGHT_RECIPES[key].stream_ms
    if every:
        a['loud_db'] = dsp.stream_loudness_db(y, every)
    err, warn = qa.check_effect(a, (dsp.SR, 1, 16), bool(event(key)[2]), target_db(key))
    a['low_share'] = low_share(y)
    return a, err, warn


def read_mono(path):
    x, sr, ch, bits = dsp.read_wav(path)
    return (x if x.ndim == 1 else x.mean(axis=1)), (sr, ch, bits)


def effect_keys():
    """File stems of every effect (merge_1 .. merge_8 for the key merge)."""
    return [s for k in RN.EVENTS if k not in RN.MUSIC_KEYS for s in RN.file_stems(k)]


def event(stem):
    return RN.EVENTS[RN.key_of(stem)]


HEADER = '%-15s %5s %6s %6s %4s %6s %6s %5s %6s %6s %6s  %s' % ('key', 'ms', 'peak', 'loud', 'tier', 'phone', 'cent', '<400', '>8k', 'onset', 'tail', 'notes')


def print_row(key, a, err, warn):
    notes = '; '.join(['FAIL ' + e for e in err] + warn)
    print('%-15s %5.0f %6.1f %6.1f %+4.0f %+6.1f %6.0f %4.0f%% %6.1f %6.1f %6.2f  %s'
          % (key, a['duration'] * 1000, a['peak_db'], a['loud_db'], RN.NIGHT_RECIPES[key].loud_db, a['phone_db'], a['centroid'],
             100 * a['low_share'], a['hf_db'], a['onset_ms'], a['dead_tail_ms'], notes))


def qa_music(path):
    """-> (errors, warnings, analysis, seam, meta, size) of one loop."""
    import qa
    x, meta = qa.decode(path)
    mono = x.mean(axis=1)
    a = qa.analyse(mono)
    a['loud_db'] = dsp.krms_db(x)
    a['peak_db'] = dsp.peak_db(x)
    a['clipped'] = int(np.sum(np.abs(x) >= 0.9999))
    seam = qa.seam_report(x)
    size = os.path.getsize(path)
    err, warn = qa.check_music(a, seam, meta, size)
    err = [e for e in err if not e.endswith('(want %g..%g)' % (qa.MUSIC_MIN_S, qa.MUSIC_MAX_S))]
    if not MUSIC_LEN_S[0] <= a['duration'] <= MUSIC_LEN_S[1]:
        err.append('%.2f s, spec 6.2 wants about 90 s' % a['duration'])
    return err, warn, a, seam, meta, size, x


def qa_folder(out_dir, keys=None):
    """Measure what is in the folder. -> number of failing files."""
    full = keys is None
    keys = keys or effect_keys()
    fails = 0
    print(HEADER)
    total = 0
    for k in keys:
        path = os.path.join(out_dir, k + '.wav')
        if not os.path.exists(path):
            print('%-15s MISSING' % k)
            fails += 1
            continue
        y, fmt = read_mono(path)
        a, err, warn = qa_effect(k, y)
        if fmt != (dsp.SR, 1, 16):
            err.append('format %s' % (fmt,))
        fails += bool(err)
        total += os.path.getsize(path)
        print_row(k, a, err, warn)
    fx_bytes = total
    if full:
        for mk in RN.MUSIC_KEYS:
            mpath = os.path.join(out_dir, mk + '.m4a')
            if not os.path.exists(mpath):
                print('%-15s MISSING' % mk)
                fails += 1
                continue
            err, warn, a, seam, meta, size, _ = qa_music(mpath)
            total += size
            fails += bool(err)
            print('%-15s %5.0f %6.1f %6.1f K-RMS, phone %+.1f, %s Hz %s ch %.0f kb/s %.0f KB; seam level %+.1f dB (inside p99 %.1f, max %.1f), '
                  'spectrum %.1f dB (p%.0f), step %.4f (inside p99.9 %.4f)  %s'
                  % (mk, a['duration'] * 1000, a['peak_db'], a['loud_db'], a['phone_db'], meta.get('sample_rate'), meta.get('channels'),
                     size * 8 / 1000.0 / a['duration'], size / 1000.0, seam['level_db'], seam['level_p99'], seam['level_max'],
                     seam['spec_db'], seam['spec_pct'], seam['jump'], seam['jump_p999'], '; '.join(['FAIL ' + e for e in err] + warn)))
    strays = sorted(f for f in os.listdir(out_dir) if f.lower().endswith(('.wav', '.m4a', '.mp3', '.ogg'))
                    and os.path.splitext(f)[0] not in set(effect_keys()) | set(RN.MUSIC_KEYS))
    if strays:
        print('FAIL not a key of this game: %s' % ', '.join(strays))
        fails += 1
    if full:
        print('folder: %.2f MB (effects %.2f MB, music %.2f MB; budget %.1f MB)'
              % (total / 1e6, fx_bytes / 1e6, (total - fx_bytes) / 1e6, PACK_BUDGET_BYTES / 1e6))
        if total > PACK_BUDGET_BYTES:
            print('FAIL over the pack budget')
            fails += 1
    return fails


def hashes(out_dir):
    rows = []
    for f in sorted(os.listdir(out_dir)):
        if f.lower().endswith(('.wav', '.m4a')):
            with open(os.path.join(out_dir, f), 'rb') as fh:
                rows.append((f, hashlib.sha256(fh.read()).hexdigest()))
    return rows


# ---------------------------------------------------------------------------
# accents, rows, sheets
# ---------------------------------------------------------------------------

def accents_report():
    print('%-15s %-34s %-22s %s' % ('key', 'haptic (catalogue)', 'sound accents (ms)', 'pulses/s'))
    for k in effect_keys():
        _, _, acc = render_effect(k)
        hap = event(k)[2]
        ht = haptic_times(hap)
        hs = ' '.join('%s@%d' % (s, round(t * 1000)) for s, t in ht) or '-'
        gaps = [b[1] - a[1] for a, b in zip(ht, ht[1:])]
        rate = (1.0 / min(gaps)) if gaps else 0.0
        print('%-15s %-34s %-22s %s' % (k, hs, ' '.join('%d' % round(a * 1000) for a in acc) or '-',
                                         '%.1f' % rate if gaps else '-'))


def row_of(y, every_ms, count=20, jitter_ms=0.0, rng=None, voices=3):
    """`count` copies every `every_ms`, at most `voices` sounding at once (a new one cuts the oldest,
    as the fx service does)."""
    step = every_ms / 1000.0
    starts = [int(round((i * step + (rng.uniform(-jitter_ms, jitter_ms) / 1000.0 if rng is not None and jitter_ms else 0.0)) * dsp.SR))
              for i in range(count)]
    starts = [max(s, 0) for s in starts]
    buf = np.zeros(starts[-1] + len(y))
    for i, s in enumerate(starts):
        seg = y.copy()
        if i + voices < len(starts):
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
    step = max(int(every_ms / 5.0), 1)
    mid = e[len(e) // 4: 3 * len(e) // 4]
    dips = []
    for i in range(0, len(mid) - step, step):
        seg = mid[i:i + step]
        dips.append(20 * np.log10(seg.max() / (seg.min() + 1e-9)))
    return {'peak_db': dsp.peak_db(buf), 'loud_db': dsp.loudness_db(buf), 'single_db': dsp.loudness_db(y),
            'dip_db': float(np.median(dips)) if dips else 0.0}


def rows_report(sheet_dir):
    """Rows of twenty at catalogue volume and voices, at the key's floor and at 100 ms; prints the
    numbers, returns the number of rows that clip, and draws one picture."""
    import qa
    items = []
    bad = 0
    print('%-13s %6s %7s %7s %7s %8s %7s' % ('key', 'every', 'peak', 'row', 'single', 'dip', 'build'))
    for k, every in RN.ROW_KEYS.items():
        y, _, _ = render_effect(k)
        vol, _, _, _, voices = event(k)
        y = y * vol
        for ms in sorted({every, max(every, 100)}):
            buf = row_of(y, ms, 20, jitter_ms=4.0 if ms > 60 else 0.0, rng=np.random.RandomState(7), voices=voices)
            s = row_stats(buf, y, ms)
            clip = s['peak_db'] > -0.1
            bad += clip
            print('%-13s %4d ms %7.1f %7.1f %7.1f %6.1f dB %+6.1f%s' % (k, ms, s['peak_db'], s['loud_db'], s['single_db'], s['dip_db'],
                                                                       s['loud_db'] - s['single_db'], '  CLIPS' if clip else ''))
            a = qa.analyse(buf)
            items.append({'name': '%s x20 @%d ms' % (k, ms), 'mono': buf, 'a': a, 'err': [], 'warn': [], 'music': False})
    if sheet_dir:
        path = os.path.join(sheet_dir, 'rows.png')
        qa.contact_sheet(path, items, 'Lantern Row: rows of twenty at catalogue volume', cols=4)
        print('picture: %s' % path)
    return bad


GROUPS = [
    ('merges', RN.file_stems('merge') + ['lucky']),
    ('hand', ['move', 'swap', 'return', 'drop', 'line_fill', 'ticket_filled', 'coins', 'basket_sell', 'undo']),
    ('purchases', ['shutter_open', 'stall_open', 'upgrade', 'minder_hire', 'discovery', 'lantern_lit']),
    ('events', ['parade_arrive', 'giftbox_open', 'slot_reveal', 'festival_line', 'festival_done', 'season_close']),
    ('interface', ['ui_open', 'ui_close', 'ui_denied']),
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
        qa.contact_sheet(path, items, 'Lantern Row: %s' % name, cols=3)
        print('picture: %s' % path)
    items = []
    for mk in RN.MUSIC_KEYS:
        mpath = os.path.join(out_dir, mk + '.m4a')
        if os.path.exists(mpath):
            err, warn, a, seam, meta, size, x = qa_music(mpath)
            items.append({'name': mk + '.m4a', 'mono': x.mean(axis=1), 'a': a, 'err': err, 'warn': warn, 'music': True,
                          'seam': seam, 'meta': meta, 'size': size})
    if items:
        path = os.path.join(sheet_dir, 'sheet_music.png')
        qa.contact_sheet(path, items, 'Lantern Row: music', cols=1)
        print('picture: %s' % path)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=None)
    ap.add_argument('--only', help='comma-separated keys or globs')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--qa', action='store_true', help='measure the folder only')
    ap.add_argument('--accents', action='store_true')
    ap.add_argument('--rows', metavar='DIR', help='rows of twenty; picture into DIR')
    ap.add_argument('--sheets', metavar='DIR', help='contact sheets per group into DIR')
    ap.add_argument('--hash', action='store_true', help='print the sha256 of every file in the folder')
    ap.add_argument('--no-music', action='store_true')
    args = ap.parse_args(argv)
    out = args.out or default_out()

    problems, cat = check()
    if problems:
        print('render_night: %d problem(s):\n  %s' % (len(problems), '\n  '.join(problems)), file=sys.stderr)
        return 2
    if args.check:
        print('night pack ok: %d keys of spec 6.2 (%d effect files from recipes_night, %d music loops); no key falls back '
              '(soundPack %s; recipes.py, recipes_haul.py, packs.py not imported); keys checked against %s'
              % (len(RN.EVENTS), len(effect_keys()), len(RN.MUSIC_KEYS),
                 'null' if game_sound_pack() is None else 'not set yet (no game.json)' if game_sound_pack() == 'absent' else game_sound_pack(),
                 'catalog.merge.ts' if cat is not None else 'the spec 6.2 table (catalog.merge.ts does not exist yet)'))
        return 0
    if args.accents:
        accents_report()
        return 0
    if args.rows:
        os.makedirs(args.rows, exist_ok=True)
        return 1 if rows_report(args.rows) else 0
    if args.sheets:
        sheets(out, args.sheets)
        return 0
    if args.hash:
        for f, h in hashes(out):
            print('%s  %s' % (h, f))
        return 0
    if args.qa:
        return 1 if qa_folder(out) else 0

    keys = effect_keys()
    music = list(RN.MUSIC_KEYS)
    if args.only:
        pats = [p.strip() for p in args.only.split(',') if p.strip()]
        keys = [k for k in keys if any(fnmatch.fnmatchcase(k, p) for p in pats)]
        music = [k for k in music if any(fnmatch.fnmatchcase(k, p) for p in pats)]
    if args.no_music:
        music = []
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    for k in keys:
        y, info, _ = render_effect(k)
        dsp.write_wav(os.path.join(out, k + '.wav'), y)
    if music:
        import night_music
        for mk in music:
            info = night_music.build(mk, os.path.join(out, mk + '.m4a'))
            print('%s.m4a: %s, %.2f s, K-RMS %.1f dB, peak %.1f dBFS, %.0f KB (%.0f kb/s)%s'
                  % (mk, info['title'], info['duration'], info['loudness_db'], info['peak_db'], info['bytes'] / 1000.0, info['kbps'],
                     '' if info['decoded_samples'] == info['samples'] else '; WARNING: decodes to %d samples, not %d'
                     % (info['decoded_samples'], info['samples'])))
    print('rendered %d effect(s)%s in %.1f s -> %s\n' % (len(keys), ' + %d loop(s)' % len(music) if music else '', time.time() - t0, out))
    full = not args.only and not args.no_music
    fails = qa_folder(out, None if full else keys)
    print('\nQA %s: %d failing' % ('FAILED' if fails else 'passed', fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
