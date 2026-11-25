#!/usr/bin/env python3
"""Render Scrap to Ingot's sound pack (game scrap-yard, mode "salvage") from yard_recipes.py and yard_music.py.

  python3 scripts/audio/yard/render_yard.py --check          every key of yard-stage1.md 7 has a yard recipe, none falls
                                                              back, the catalogue and the segment table agree
  python3 scripts/audio/yard/render_yard.py                  render every effect and the music, then QA them
  python3 scripts/audio/yard/render_yard.py --only 'piece_*' --no-music
  python3 scripts/audio/yard/render_yard.py --qa             measure the rendered folder only (no rendering)
  python3 scripts/audio/yard/render_yard.py --rows           rows of the sounds that repeat fast, measured
  python3 scripts/audio/yard/render_yard.py --tell           the families against each other: copper vs iron vs steel ...
  python3 scripts/audio/yard/render_yard.py --catalog        write src/services/fx/catalog.salvage.ts from EVENTS
  python3 scripts/audio/yard/render_yard.py --hash           sha256 of every rendered file (two renders must match)
  python3 scripts/audio/yard/render_yard.py --out DIR        render somewhere else (a scratch folder)

The output folder is games/scrap-yard/assets/sfx. The game has no shared pack (game.json "soundPack": null),
so nothing can fall back: a key without a yard recipe is an error, and no other game's recipes (recipes.py,
recipes_haul.py, recipes_night.py, recipes_office.py, packs.py) are imported; --check proves it from
sys.modules.

Mastering is the other packs' chain, unchanged: dsp.master with the pack loudness target plus the recipe's
tier (BIG +2, LOUD +1, FREQUENT -2, QUIET -4, AMBIENT -8 dB), the -1 dBFS soft limiter, trim, fades. QA uses
qa.py's measurements and checks with this pack's tiers, plus the house's phone rule (at least half of the
energy above 500 Hz). Long effects are mono AAC (.m4a, yard_recipes.M4A) and are measured decoded.
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

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.normpath(os.path.join(HERE, '..'))
for p in (HERE, AUDIO):
    if p not in sys.path:
        sys.path.insert(0, p)

import numpy as np  # noqa: E402

import dsp  # noqa: E402
import yard_recipes as YR  # noqa: E402

ROOT = os.path.normpath(os.path.join(AUDIO, '..', '..'))
GAME = os.path.join(ROOT, 'games', 'scrap-yard')
GAME_OUT = os.path.join(GAME, 'assets', 'sfx')
CATALOG = os.path.join(ROOT, 'src', 'services', 'fx', 'catalog.salvage.ts')
SOUNDKEYS = os.path.join(ROOT, 'src', 'modes', 'salvage', 'soundKeys.ts')
PACK_BUDGET_BYTES = 3_000_000
FOREIGN = ('recipes', 'recipes_haul', 'recipes_night', 'recipes_office', 'packs', 'office_music', 'night_music', 'haul_music')
PHONE_SHARE_MIN = 0.5


# ---------------------------------------------------------------------------
# coverage
# ---------------------------------------------------------------------------

def effect_keys():
    return [s for k in YR.EVENTS if k not in YR.MUSIC_KEYS for s in YR.file_stems(k)]


def event(stem):
    return YR.EVENTS[YR.key_of(stem)]


def node_json(js):
    run = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True)
    if run.returncode != 0:
        raise RuntimeError(run.stderr.strip()[-300:])
    return json.loads(run.stdout)


def catalogue_entries():
    js = ("process.stdout.write(JSON.stringify(require('./scripts/lib/fxCatalog.js').parseCatalog(%s)))" % json.dumps(CATALOG))
    return node_json(js)


def segment_table_ts():
    """SEGMENT_MS as soundKeys.ts writes it (read with a regular expression: plain `key: number` pairs)."""
    import re
    if not os.path.exists(SOUNDKEYS):
        return None
    src = open(SOUNDKEYS).read()
    m = re.search(r'export const SALVAGE_SEGMENT_MS\s*=\s*\{([^}]*)\}', src)
    if not m:
        return None
    return {k: int(v) for k, v in re.findall(r'(\w+)\s*:\s*(\d+)', m.group(1))}


def check():
    problems = []
    for k in effect_keys():
        fn = YR.YARD_RECIPES.get(YR.key_of(k))
        if fn is None:
            problems.append('%s: no yard recipe' % k)
        elif fn.__module__ != YR.__name__ or not getattr(fn, 'yard', False):
            problems.append('%s: recipe comes from %s, not from yard_recipes' % (k, fn.__module__))
    for k in YR.YARD_RECIPES:
        if k not in YR.EVENTS:
            problems.append('%s: yard recipe without a key in the event table' % k)
    for k in YR.FILES:
        if k not in YR.EVENTS:
            problems.append('%s: FILES names a key the event table lacks' % k)
    for k in YR.SEGMENT_MS:
        if k not in YR.EVENTS:
            problems.append('%s: SEGMENT_MS names a key the event table lacks' % k)
    for mod in FOREIGN:
        if mod in sys.modules:
            problems.append('%s.py was imported: another game\'s sounds could leak in' % mod)
    for mk in YR.SHARED_SOUNDS.values():
        if mk not in YR.EVENTS:
            problems.append('shared key maps onto %s, which is not in the event table' % mk)
    gj = os.path.join(GAME, 'game.json')
    if os.path.exists(gj):
        sp = json.load(open(gj)).get('soundPack', 'absent')
        if sp is not None:
            problems.append('games/scrap-yard/game.json soundPack is %r: it must be null' % sp)
    try:
        cat = catalogue_entries()
    except RuntimeError as e:
        problems.append('could not read catalog.salvage.ts: %s' % e)
        cat = []
    keys = [e['key'] for e in cat]
    if set(keys) != set(YR.EVENTS):
        problems.append('catalog.salvage.ts keys differ from yard_recipes.EVENTS (run --catalog): %s' % sorted(set(keys) ^ set(YR.EVENTS)))
    elif keys != list(YR.EVENTS):
        problems.append('catalog.salvage.ts: key order differs from yard_recipes.EVENTS (run --catalog)')
    for e in cat:
        if e['key'] not in YR.EVENTS:
            continue
        want = catalogue_def(e['key'])
        for field in ('volume', 'minIntervalMs', 'haptic', 'voices', 'files', 'pick', 'preload', 'loop'):
            if e.get(field) != want.get(field):
                problems.append('%s: %s %r in catalog.salvage.ts, %r in yard_recipes (run --catalog)' % (e['key'], field, e.get(field), want.get(field)))
    seg = segment_table_ts()
    if seg is None:
        problems.append('src/modes/salvage/soundKeys.ts has no SALVAGE_SEGMENT_MS table')
    elif seg != YR.SEGMENT_MS:
        problems.append('SALVAGE_SEGMENT_MS in soundKeys.ts %r differs from yard_recipes.SEGMENT_MS %r' % (seg, YR.SEGMENT_MS))
    for k, every in YR.SEGMENT_MS.items():
        gap = YR.EVENTS[k][1]
        if gap is None or gap >= every:
            problems.append('%s: minimum interval %r must be under its segment period %d (else a chained play is dropped)' % (k, gap, every))
    return problems


# ---------------------------------------------------------------------------
# the catalogue (src/services/fx/catalog.salvage.ts), written from EVENTS
# ---------------------------------------------------------------------------

def catalogue_def(key):
    vol, gap, hap, brief, voices, preload = YR.EVENTS[key]
    d = {'volume': vol}
    n = YR.FILES.get(key, 1)
    if n > 1:
        d['files'] = n
        d['pick'] = 'ladder' if key in YR.LADDERS else 'random'
    if gap is not None:
        d['minIntervalMs'] = gap
    if hap:
        d['haptic'] = list(hap)
    if key in YR.MUSIC_KEYS:
        d['loop'] = True
    if preload is not None:
        d['preload'] = preload
    if voices and voices > 1:
        d['voices'] = voices
    return d


CATALOG_HEAD = '''/**
 * The fx events of the salvage mode (the scrapyard, game "scrap-yard"): docs/design/yard-stage1.md section 7.
 * The same format as ./catalog.ts, read by scripts/lib/fxCatalog.js for a game of mode "salvage" INSTEAD of
 * ./catalog.ts, so no key of another game can ever sound in it (`soundPack: null`, every file in
 * games/scrap-yard/assets/sfx/).
 *
 * WRITTEN BY scripts/audio/yard/render_yard.py --catalog from scripts/audio/yard/yard_recipes.py EVENTS and FILES
 * (the table the files are rendered from; `render_yard.py --check` fails when the two disagree): change the
 * table there and write this file again, never by hand. Owner: the sound package (yard-stage1.md 9, package 6).
 * Node only like ./catalog.ts (scripts/lib/modes.js NODE_ONLY): the app imports its types only.
 *
 * - Segments: the shared fx service has no looping effect (one music player only), so the "loops" of
 *   section 7 (the four tools, the strippers, the bench, the burner, the diesel, the loading's calm loop, the
 *   yard's surroundings) are segments with faded ends that the screen plays again every
 *   `SALVAGE_SEGMENT_MS[key]` ms while the work lasts (src/modes/salvage/soundKeys.ts); two voices let the
 *   tail of one overlap the head of the next. Each segment's minimum interval sits a little under its period.
 * - Ladders: `furnace_roar` (0 lit, 1 half way, 2 pouring heat) and `truck_diesel` (0 idle, 1 driving, 2
 *   pulling hard) take `step` (the "pitch by speed" of section 7, in three files).
 * - Haptics (section 7): light on a finished piece (the piece_* keys and thud_waste), medium on a collection
 *   (coin, coin_big) and on a purchase (buy), success on a rung (rung_sign), light on a refusal (denied).
 *   Pieces cut by a crew member and collections nobody's finger caused play with `{ haptic: false }`
 *   where the caller can tell (soundKeys.ts says which).
 * - Keys this file adds to section 7's list: `goal_tick` (a goal done) and `load_cool` (the loading
 *   animation's bar cooled, asked for by the loading engineer).
 * - Variants (`pick: 'random'`) for every sound that can repeat within a second.
 *
 * Keys may be added, never renamed or removed once files exist (the sound files are named by them).
 */
import type { FxDef } from './catalog';

export const FX = {
'''

CATALOG_TAIL = '''} as const satisfies Record<string, FxDef>;

export type SalvageFxName = keyof typeof FX;
'''


def ts_value(v):
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, str):
        return "'%s'" % v.replace('\\', '\\\\').replace("'", "\\'")
    if isinstance(v, list):
        return '[%s]' % ', '.join(ts_value(x) for x in v)
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return repr(v)


def write_catalog():
    lines = [CATALOG_HEAD]
    for key in YR.EVENTS:
        d = catalogue_def(key)
        brief = YR.EVENTS[key][3]
        fields = ['brief: %s' % ts_value(brief)]
        for f in ('files', 'pick', 'volume', 'preload', 'voices', 'minIntervalMs', 'haptic', 'loop'):
            if f in d:
                fields.append('%s: %s' % (f, ts_value(d[f])))
        lines.append('  %s: { %s },\n' % (key, ', '.join(fields)))
    lines.append(CATALOG_TAIL)
    with open(CATALOG, 'w') as f:
        f.write(''.join(lines))
    print('wrote %s (%d keys)' % (os.path.relpath(CATALOG, ROOT), len(YR.EVENTS)))


# ---------------------------------------------------------------------------
# rendering
# ---------------------------------------------------------------------------

def target_db(stem):
    return dsp.LOUDNESS_TARGET_DB + YR.YARD_RECIPES[YR.key_of(stem)].loud_db


def render_effect(stem):
    fn = YR.YARD_RECIPES[YR.key_of(stem)]
    c = YR.YardCtx(stem)
    c.length = fn.length
    raw = fn(c)
    if not np.all(np.isfinite(raw)):
        raise ValueError('%s: the recipe returned NaN or inf' % stem)
    y, info = dsp.master(raw, floor_db=c.floor_db, length=c.length, stream_ms=fn.stream_ms, target_db=target_db(stem))
    return y, info, sorted(c.accents)


def ffmpeg(cmd, data=None):
    run = subprocess.run(cmd, input=data, capture_output=True)
    if run.returncode != 0:
        raise RuntimeError('ffmpeg failed: %s' % run.stderr.decode(errors='replace')[-300:])
    return run.stdout


def encode_mono_m4a(y, path, kbps=YR.M4A_KBPS):
    """Mono float -> AAC-LC .m4a, bit-exact flags (same input, same file), sample-exact edit list."""
    tmp = path + '.part.m4a'
    ffmpeg(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(dsp.SR), '-ac', '1', '-i', 'pipe:0', '-c:a', 'aac',
            '-b:a', '%dk' % kbps, '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact',
            '-movie_timescale', str(dsp.SR), '-movflags', '+faststart', tmp], np.asarray(y, '<f4').tobytes())
    os.replace(tmp, path)


def decode_mono(path):
    raw = ffmpeg(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '1', '-ar', str(dsp.SR), '-'])
    return np.frombuffer(raw, '<f4').astype(float)


def write_effect(stem, out_dir):
    y, info, _ = render_effect(stem)
    ext = YR.ext_of(stem)
    path = os.path.join(out_dir, '%s.%s' % (stem, ext))
    if ext == 'wav':
        dsp.write_wav(path, y)
    else:
        trim = 0.0
        for _ in range(4):
            encode_mono_m4a(y * dsp.undb(-trim), path)
            z = decode_mono(path)
            over = dsp.peak_db(z) - dsp.PEAK_CEILING_DB + 0.05
            if over <= 0:
                break
            trim += over + 0.1
    return path


def low_share(y, split):
    S = np.abs(np.fft.rfft(y, dsp.pow2(max(len(y), 2048)))) ** 2
    f = np.fft.rfftfreq(dsp.pow2(max(len(y), 2048)), 1.0 / dsp.SR)
    return float(S[f < split].sum() / (S.sum() + 1e-30))


def bands(y):
    """Share of energy in four bands: <500, 500-2k, 2k-5k, >5k Hz, and the strongest partial."""
    N = dsp.pow2(max(len(y), 4096))
    S = np.abs(np.fft.rfft(y, N)) ** 2
    f = np.fft.rfftfreq(N, 1.0 / dsp.SR)
    tot = S.sum() + 1e-30
    edges = (0, 500, 2000, 5000, 1e9)
    sh = [float(S[(f >= a) & (f < b)].sum() / tot) for a, b in zip(edges, edges[1:])]
    k = int(np.argmax(np.where(f > 60, S, 0)))
    return sh, float(f[k])


def load_file(out_dir, stem):
    ext = YR.ext_of(stem)
    path = os.path.join(out_dir, '%s.%s' % (stem, ext))
    if not os.path.exists(path):
        return None, path, None
    if ext == 'wav':
        x, sr, ch, bits = dsp.read_wav(path)
        y = x if x.ndim == 1 else x.mean(axis=1)
        fmt = (sr, ch, bits)
    else:
        y = decode_mono(path)
        fmt = (dsp.SR, 1, 16)
    return y, path, fmt


HEADER = '%-17s %4s %5s %6s %6s %6s %5s %6s %5s %5s %5s %5s %6s %6s  %s' % (
    'file', 'ext', 'ms', 'peak', 'rms', 'loud', 'tier', 'phone', '<500', '.5-2k', '2-5k', '>5k', 'strong', 'KB', 'notes')


def qa_folder(out_dir, stems=None, quiet=False):
    import qa
    full = stems is None
    stems = stems or effect_keys()
    fails, total, rows = 0, 0, []
    if not quiet:
        print(HEADER)
    for s in stems:
        y, path, fmt = load_file(out_dir, s)
        if y is None:
            print('%-17s MISSING' % s)
            fails += 1
            continue
        a = qa.analyse(y)
        fn = YR.YARD_RECIPES[YR.key_of(s)]
        if fn.stream_ms:
            a['loud_db'] = dsp.stream_loudness_db(y, fn.stream_ms)
        err, warn = qa.check_effect(a, fmt, bool(event(s)[2]), target_db(s))
        if YR.ext_of(s) == 'm4a':
            # AAC's edges are the codec's: the file's first and last samples are not the master's.
            err = [e for e in err if not e.startswith('no fade')]
        sh, strong = bands(y)
        if 1.0 - sh[0] < PHONE_SHARE_MIN:
            err.append('only %.0f %% of its energy above 500 Hz (a phone keeps little else)' % (100 * (1 - sh[0])))
        if YR.key_of(s) in YR.SEGMENT_MS and YR.key_of(s) not in YR.GAPPED and a['duration'] * 1000 < YR.SEGMENT_MS[YR.key_of(s)] * 0.98:
            err.append('segment %.0f ms is shorter than its period %d ms (a gap between plays)' % (a['duration'] * 1000, YR.SEGMENT_MS[YR.key_of(s)]))
        size = os.path.getsize(path)
        total += size
        fails += bool(err)
        rows.append((s, a, sh, strong, size, err, warn))
        if not quiet:
            print('%-17s %4s %5.0f %6.1f %6.1f %6.1f %+5.0f %+6.1f %4.0f%% %4.0f%% %4.0f%% %4.0f%% %6.0f %6.1f  %s'
                  % (s, YR.ext_of(s), a['duration'] * 1000, a['peak_db'], a['rms_db'], a['loud_db'], fn.loud_db, a['phone_db'],
                     100 * sh[0], 100 * sh[1], 100 * sh[2], 100 * sh[3], strong, size / 1000.0,
                     '; '.join(['FAIL ' + e for e in err] + warn)))
    music_bytes = 0
    if full:
        for mk in YR.MUSIC_KEYS:
            mpath = os.path.join(out_dir, mk + '.m4a')
            if not os.path.exists(mpath):
                print('%-17s MISSING' % mk)
                fails += 1
                continue
            err, warn, a, seam, size = qa_music(mpath)
            music_bytes += size
            total += size
            fails += bool(err)
            print('%-17s m4a %6.0f %6.1f peak, %6.1f K-RMS, phone %+.1f, %.0f KB; seam level %+.1f dB (inside p99 %.1f), '
                  'step %.4f (inside p99.9 %.4f)  %s'
                  % (mk, a['duration'] * 1000, a['peak_db'], a['loud_db'], a['phone_db'], size / 1000.0, seam['level_db'],
                     seam['level_p99'], seam['jump'], seam['jump_p999'], '; '.join(['FAIL ' + e for e in err] + warn)))
        known = set(effect_keys()) | set(YR.MUSIC_KEYS)
        strays = sorted(f for f in os.listdir(out_dir) if f.lower().endswith(('.wav', '.m4a', '.mp3'))
                        and os.path.splitext(f)[0] not in known)
        if strays:
            print('FAIL not a key of this game: %s' % ', '.join(strays))
            fails += 1
        print('folder: %.2f MB (effects %.2f MB, music %.2f MB; budget %.1f MB); %d files'
              % (total / 1e6, (total - music_bytes) / 1e6, music_bytes / 1e6, PACK_BUDGET_BYTES / 1e6, len(stems) + len(YR.MUSIC_KEYS)))
        if total > PACK_BUDGET_BYTES:
            print('FAIL over the pack budget')
            fails += 1
    print('%d failing' % fails)
    return fails, rows


def qa_music(path):
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
    err = [e for e in err if '(want' not in e]
    import yard_music as YM
    lo, hi = YM.LENGTH_S
    if not lo <= a['duration'] <= hi:
        err.append('%.2f s, want %g..%g' % (a['duration'], lo, hi))
    return err, warn, a, seam, size


# ---------------------------------------------------------------------------
# rows and telling apart
# ---------------------------------------------------------------------------

def row_of(ys, every_ms, count=20, voices=2, rng=None):
    step = every_ms / 1000.0
    starts = [int(round((i * step + (rng.uniform(-0.004, 0.004) if rng is not None else 0.0)) * dsp.SR)) for i in range(count)]
    starts = [max(s, 0) for s in starts]
    buf = np.zeros(starts[-1] + max(len(y) for y in ys))
    last = -1
    for i, s in enumerate(starts):
        k = (i * 7 + (rng.randint(len(ys)) if rng is not None else 0)) % len(ys)
        if len(ys) > 1 and k == last:
            k = (k + 1) % len(ys)
        last = k
        seg = ys[k].copy()
        if i + voices < len(starts):
            cut = starts[i + voices] - s
            if cut < len(seg):
                seg = seg[:cut] * dsp.rcos_out(cut, 3.0)
        buf[s:s + len(seg)] += seg
    return buf


def rows_report(out_dir):
    print('%-17s %5s %7s %7s %7s %7s' % ('key', 'files', 'every', 'peak', 'row', 'single'))
    bad = 0
    for stem, every in YR.ROW_KEYS.items():
        k = YR.key_of(stem)
        vol = YR.EVENTS[k][0]
        ys = [load_file(out_dir, s)[0] * vol for s in YR.file_stems(k)]
        voices = max(YR.EVENTS[k][4], 1)
        buf = row_of(ys, every, 20, voices, np.random.RandomState(7))
        pk = dsp.peak_db(buf)
        bad += pk > -0.1
        print('%-17s %5d %4d ms %7.1f %7.1f %7.1f%s' % (k, len(ys), every, pk, dsp.loudness_db(buf), dsp.loudness_db(ys[0]),
                                                      '  CLIPS' if pk > -0.1 else ''))
    # the segments chained for twenty seconds: is the join audible as a level dip?
    print('\nsegments chained at their period (10 ms RMS envelope inside the middle, dB from max to min):')
    for k, every in YR.SEGMENT_MS.items():
        ys = [load_file(out_dir, s)[0] for s in YR.file_stems(k)]
        if k in YR.LADDERS:
            ys = ys[1:2]
        buf = row_of(ys, every, 10, 2, None)
        w = int(0.05 * dsp.SR)
        e = np.sqrt(np.convolve(buf * buf, np.ones(w) / w, 'same') + 1e-12)
        mid = e[len(e) // 4: 3 * len(e) // 4]
        print('  %-15s every %5d ms: 50 ms RMS range %.1f dB, peak %.1f dBFS' % (k, every, 20 * np.log10(mid.max() / (mid.min() + 1e-9)),
                                                                             dsp.peak_db(buf)))
    return bad


def spectral_vec(y):
    """A sound's long-term spectrum on 24 log bands 150 Hz to 7 kHz (dB, loudest band 0)."""
    N = dsp.pow2(max(len(y), 4096))
    S = np.abs(np.fft.rfft(y, N)) ** 2
    f = np.fft.rfftfreq(N, 1.0 / dsp.SR)
    edges = np.geomspace(150, 7000, 25)
    v = np.array([S[(f >= a) & (f < b)].sum() + 1e-20 for a, b in zip(edges, edges[1:])])
    v = 10 * np.log10(v / v.max())
    return np.maximum(v, -50.0)


def tell(out_dir):
    """The families against each other on the long-term spectrum (dB distance, mean over bands), the
    decay time to -30 dB, and the strongest partial: the grade must be heard as well as seen."""
    fam = ['piece_steel', 'piece_cast', 'piece_alu', 'piece_copper', 'piece_brass', 'thud_waste']
    vecs, info = {}, {}
    for k in fam:
        y = load_file(out_dir, YR.file_stems(k)[0])[0]
        vecs[k] = spectral_vec(y)
        env = np.abs(y)
        pk = env.max()
        t30 = np.nonzero(env > pk * dsp.undb(-30))[0]
        info[k] = (1000.0 * t30[-1] / dsp.SR if len(t30) else 0.0, bands(y)[1], bands(y)[0])
    print('%-14s %8s %8s  %s' % ('family', 'to -30dB', 'strongest', 'bands <500/.5-2k/2-5k/>5k'))
    for k in fam:
        d, s, sh = info[k]
        print('%-14s %6.0f ms %7.0f Hz  %s' % (k, d, s, ' '.join('%3.0f%%' % (100 * x) for x in sh)))
    print('\nlong-term spectrum distance (mean |dB| over 24 bands; within a key between its files in brackets)')
    print(' ' * 14 + ''.join('%12s' % k.replace('piece_', '') for k in fam))
    for a in fam:
        row = ''
        for b in fam:
            if a == b:
                ys = [spectral_vec(load_file(out_dir, s)[0]) for s in YR.file_stems(a)]
                w = np.mean([np.mean(np.abs(ys[i] - ys[j])) for i in range(len(ys)) for j in range(i + 1, len(ys))]) if len(ys) > 1 else 0.0
                row += '%12s' % ('(%.1f)' % w)
            else:
                row += '%12.1f' % np.mean(np.abs(vecs[a] - vecs[b]))
        print('%-14s%s' % (a.replace('piece_', ''), row))


def hashes(out_dir):
    out = []
    for f in sorted(os.listdir(out_dir)):
        if f.lower().endswith(('.wav', '.m4a')):
            out.append((f, hashlib.sha256(open(os.path.join(out_dir, f), 'rb').read()).hexdigest()))
    return out


# ---------------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--qa', action='store_true')
    ap.add_argument('--rows', action='store_true')
    ap.add_argument('--tell', action='store_true')
    ap.add_argument('--catalog', action='store_true')
    ap.add_argument('--hash', action='store_true')
    ap.add_argument('--only', help='comma-separated file stem patterns')
    ap.add_argument('--no-music', action='store_true')
    ap.add_argument('--out', default=GAME_OUT)
    args = ap.parse_args(argv)

    if args.catalog:
        write_catalog()
        return 0
    if args.check:
        probs = check()
        for p in probs:
            print('FAIL', p)
        if not probs:
            print('ok: %d keys, %d effect files (%d .m4a), %d loop; nothing falls back; no foreign module loaded; '
                  'catalog.salvage.ts = EVENTS; SALVAGE_SEGMENT_MS = SEGMENT_MS'
                  % (len(YR.EVENTS), len(effect_keys()), sum(YR.ext_of(s) == 'm4a' for s in effect_keys()), len(YR.MUSIC_KEYS)))
        return 1 if probs else 0
    out = args.out
    os.makedirs(out, exist_ok=True)
    if args.hash:
        for f, h in hashes(out):
            print(h, f)
        return 0
    if args.rows:
        return 1 if rows_report(out) else 0
    if args.tell:
        tell(out)
        return 0
    if args.qa:
        return 1 if qa_folder(out)[0] else 0

    stems = effect_keys()
    if args.only:
        pats = args.only.split(',')
        stems = [s for s in stems if any(fnmatch.fnmatch(s, p) for p in pats)]
    for s in stems:
        # a key that changed format leaves its other file behind: remove it
        for ext in ('wav', 'm4a'):
            other = os.path.join(out, '%s.%s' % (s, ext))
            if ext != YR.ext_of(s) and os.path.exists(other):
                os.remove(other)
        write_effect(s, out)
    if not args.no_music and not args.only:
        import yard_music as YM
        for mk in YR.MUSIC_KEYS:
            info = YM.build(mk, os.path.join(out, mk + '.m4a'))
            print('%s: %.2f s, %d bytes, peak %.2f dBFS, %.1f K-RMS' % (mk, info['duration'], info['bytes'], info['peak_db'], info['loudness_db']))
    fails, _ = qa_folder(out, None if not args.only else stems)
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
