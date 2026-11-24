#!/usr/bin/env python3
"""Render High Office's sound pack (high-office, mode "decree") from recipes_office.py.

  python3 scripts/audio/render_office.py --check       every key of spec 6 has an office recipe, none falls back
  python3 scripts/audio/render_office.py               render every effect, both stings and both loops, then QA them
  python3 scripts/audio/render_office.py --only 'sign_*,study_*' --no-music
  python3 scripts/audio/render_office.py --qa          measure the rendered folder only (no rendering)
  python3 scripts/audio/render_office.py --accents     sound accents next to the haptic patterns
  python3 scripts/audio/render_office.py --rows DIR    rows of the sounds that repeat fast (twenty at the floor, fifty at a
                                                       reading hand's pace, variants taking turns), measured, plus a picture
  python3 scripts/audio/render_office.py --tell        signing against the drawer: can they be told apart with the screen off?
  python3 scripts/audio/render_office.py --sheets DIR  one contact sheet (waveform + spectrogram) per group of sounds
  python3 scripts/audio/render_office.py --hash        sha256 of every rendered file (two renders must match)

The output folder is games/high-office/assets/sfx once games/high-office/game.json exists (--out
overrides; before that, $OFFICE_SFX_SCRATCH). The game has no shared pack (game.json "soundPack":
null), so nothing can fall back: a key without an office recipe is an error, and no other game's
recipes or instruments (recipes.py, recipes_haul.py, recipes_night.py, packs.py) are imported;
--check proves it from sys.modules.

Mastering is the other packs' chain, unchanged: dsp.master with the pack loudness target plus the
recipe's tier (BIG +2, LOUD +1, FREQUENT -2, QUIET -4 dB), the -1 dBFS soft limiter, trim at -50 dB,
fades. QA uses qa.py's own measurements and checks with this pack's tiers; the loops are judged
against spec 6 (about 90 s) instead of qa.py's 30 to 45 s window; the two stings (majority,
defeat: eight bars of the march and its slow tuba) are .m4a and judged on their own lengths.
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
import recipes_office as RO

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
GAME = os.path.join(ROOT, 'games', 'high-office')
GAME_OUT = os.path.join(GAME, 'assets', 'sfx')
SCRATCH_OUT = os.environ.get('OFFICE_SFX_SCRATCH', '')
CATALOG = os.path.join(ROOT, 'src', 'services', 'fx', 'catalog.decree.ts')
PACK_BUDGET_BYTES = 3_000_000           # the budget the other packs used, music included
MUSIC_LEN_S = (88.0, 92.0)              # spec 6: "90 s loops"
STING_LEN_S = {'majority': (6.0, 11.0), 'defeat': (4.0, 10.0)}
FOREIGN = ('recipes', 'recipes_haul', 'recipes_night', 'packs')


def default_out():
    if os.path.exists(os.path.join(GAME, 'game.json')) or not SCRATCH_OUT:
        return GAME_OUT
    return SCRATCH_OUT


# ---------------------------------------------------------------------------
# coverage
# ---------------------------------------------------------------------------

def catalogue_entries():
    """Entries of catalog.decree.ts (read by scripts/lib/fxCatalog.js, as the app's table is), or None."""
    if not os.path.exists(CATALOG):
        return None
    js = ("process.stdout.write(JSON.stringify(require('./scripts/lib/fxCatalog.js').parseCatalog(%s)))"
          % json.dumps(CATALOG))
    run = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True)
    if run.returncode != 0:
        print('render_office: could not read catalog.decree.ts (%s); using the spec table' % run.stderr.strip()[-200:], file=sys.stderr)
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
    for k in effect_keys():
        fn = RO.OFFICE_RECIPES.get(k)
        if fn is None:
            problems.append('%s: no office recipe' % k)
        elif fn.__module__ != RO.__name__ or not getattr(fn, 'office', False):
            problems.append('%s: recipe comes from %s, not from recipes_office' % (k, fn.__module__))
    for k in RO.OFFICE_RECIPES:
        if k not in effect_keys():
            problems.append('%s: office recipe without a key in the event table' % k)
    for k in RO.STING_KEYS + RO.MUSIC_KEYS:
        if k not in RO.EVENTS:
            problems.append('%s: no entry in the event table' % k)
    for mod in FOREIGN:
        if mod in sys.modules:
            problems.append('%s.py was imported: another game\'s sounds could leak in' % mod)
    for mk in RO.SHARED_SOUNDS.values():
        if mk not in RO.EVENTS:
            problems.append('shared key maps onto %s, which is not in the event table' % mk)
    sp = game_sound_pack()
    if sp not in (None, 'absent'):
        problems.append('games/high-office/game.json soundPack is %r: it must be null (no shared pack to fall back on)' % sp)
    cat = catalogue_entries()
    if cat is not None:
        keys = [e['key'] for e in cat]
        for k in keys:
            if k not in RO.EVENTS:
                problems.append('%s: in catalog.decree.ts but not in recipes_office.EVENTS' % k)
        for k in RO.EVENTS:
            if k not in keys:
                problems.append('%s: in recipes_office.EVENTS but not in catalog.decree.ts' % k)
        for e in cat:
            if e['key'] not in RO.EVENTS:
                continue
            vol, gap, hap, _, voices = RO.EVENTS[e['key']]
            for field, mine in (('volume', vol), ('minIntervalMs', gap), ('haptic', hap), ('voices', voices if voices > 1 else None)):
                if e.get(field) != mine:
                    problems.append('%s: %s %r in catalog.decree.ts, %r in recipes_office.EVENTS' % (e['key'], field, e.get(field), mine))
            if e.get('files', 1) != RO.FILES.get(e['key'], 1):
                problems.append('%s: %s file(s) in catalog.decree.ts, %d in recipes_office.FILES'
                                % (e['key'], e.get('files', 1), RO.FILES.get(e['key'], 1)))
            if RO.FILES.get(e['key'], 1) > 1 and e.get('pick') != 'random':
                problems.append('%s: several files need pick: random in catalog.decree.ts' % e['key'])
    return problems, cat


# ---------------------------------------------------------------------------
# rendering
# ---------------------------------------------------------------------------

def target_db(key):
    return dsp.LOUDNESS_TARGET_DB + RO.OFFICE_RECIPES[key].loud_db


def render_effect(key):
    """-> (mastered samples, master info, accents)."""
    fn = RO.OFFICE_RECIPES[key]
    c = RO.OfficeCtx(key)
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


def above_500(y):
    S = np.abs(np.fft.rfft(y, dsp.pow2(max(len(y), 2048)))) ** 2
    f = np.fft.rfftfreq(dsp.pow2(max(len(y), 2048)), 1.0 / dsp.SR)
    return float(S[f > 500.0].sum() / (S.sum() + 1e-30))


def qa_effect(key, y):
    """qa.py's measurements and checks with this pack's tier -> (analysis, errors, warnings)."""
    import qa
    a = qa.analyse(y)
    every = RO.OFFICE_RECIPES[key].stream_ms
    if every:
        a['loud_db'] = dsp.stream_loudness_db(y, every)
    err, warn = qa.check_effect(a, (dsp.SR, 1, 16), bool(event(key)[2]), target_db(key))
    a['low_share'] = low_share(y)
    a['a500'] = above_500(y)
    return a, err, warn


def read_mono(path):
    x, sr, ch, bits = dsp.read_wav(path)
    return (x if x.ndim == 1 else x.mean(axis=1)), (sr, ch, bits)


def effect_keys():
    """File stems of every effect (sign_1 .. sign_3 for the key sign)."""
    return [s for k in RO.EVENTS if k not in RO.MUSIC_KEYS and k not in RO.STING_KEYS for s in RO.file_stems(k)]


def event(stem):
    return RO.EVENTS[RO.key_of(stem)]


HEADER = '%-15s %5s %6s %6s %4s %6s %6s %5s %5s %6s %6s %6s  %s' % ('key', 'ms', 'peak', 'loud', 'tier', 'phone', 'cent', '<400',
                                                                  '>500', '>8k', 'onset', 'tail', 'notes')


def print_row(key, a, err, warn):
    notes = '; '.join(['FAIL ' + e for e in err] + warn)
    print('%-15s %5.0f %6.1f %6.1f %+4.0f %+6.1f %6.0f %4.0f%% %4.0f%% %6.1f %6.1f %6.2f  %s'
          % (key, a['duration'] * 1000, a['peak_db'], a['loud_db'], RO.OFFICE_RECIPES[key].loud_db, a['phone_db'], a['centroid'],
             100 * a['low_share'], 100 * a['a500'], a['hf_db'], a['onset_ms'], a['dead_tail_ms'], notes))


def qa_music(path):
    """-> (errors, warnings, analysis, seam, meta, size, decoded) of one loop."""
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
        err.append('%.2f s, spec 6 wants about 90 s' % a['duration'])
    return err, warn, a, seam, meta, size, x


def qa_sting(key, path):
    """A one-shot .m4a (the march's eight bars, the slow tuba): no clipping, peak under -1 dBFS
    decoded, its length, the phone. -> (errors, warnings, analysis, size, decoded)."""
    import qa
    x, meta = qa.decode(path)
    mono = x.mean(axis=1)
    a = qa.analyse(mono)
    a['peak_db'] = dsp.peak_db(x)
    a['clipped'] = int(np.sum(np.abs(x) >= 0.9999))
    a['krms'] = dsp.krms_db(x)
    size = os.path.getsize(path)
    err, warn = [], []
    if a['peak_db'] > dsp.PEAK_CEILING_DB + 0.05 or a['clipped']:
        err.append('peak %.2f dBFS, %d clipped' % (a['peak_db'], a['clipped']))
    lo, hi = STING_LEN_S[key]
    if not lo <= a['duration'] <= hi:
        err.append('%.2f s (want %g..%g)' % (a['duration'], lo, hi))
    a['a500'] = above_500(mono)
    if a['a500'] < 0.5:
        err.append('only %.0f %% of its energy above 500 Hz (a phone keeps little else)' % (100 * a['a500']))
    if a['phone_db'] < qa.PHONE_FAIL_DB:
        err.append('phone speaker loses %.1f dB' % -a['phone_db'])
    elif a['phone_db'] < qa.PHONE_WARN_DB:
        warn.append('phone speaker loses %.1f dB' % -a['phone_db'])
    if a['head'] > 0.01:
        warn.append('starts at %.3f' % a['head'])
    return err, warn, a, size, x


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
        if a['a500'] < 0.5:
            err.append('only %.0f %% of its energy above 500 Hz (a phone keeps little else)' % (100 * a['a500']))
        fails += bool(err)
        total += os.path.getsize(path)
        print_row(k, a, err, warn)
    fx_bytes = total
    if full:
        for sk in RO.STING_KEYS:
            spath = os.path.join(out_dir, sk + '.m4a')
            if not os.path.exists(spath):
                print('%-15s MISSING' % sk)
                fails += 1
                continue
            err, warn, a, size, _ = qa_sting(sk, spath)
            total += size
            fails += bool(err)
            print('%-15s %5.0f %6.1f %6.1f K-RMS, phone %+.1f, >500 Hz %.0f %%, centroid %.0f Hz, %.0f KB  %s'
                  % (sk, a['duration'] * 1000, a['peak_db'], a['krms'], a['phone_db'], 100 * a['a500'], a['centroid'], size / 1000.0,
                     '; '.join(['FAIL ' + e for e in err] + warn)))
        sting_bytes = total - fx_bytes
        for mk in RO.MUSIC_KEYS:
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
    known = set(effect_keys()) | set(RO.MUSIC_KEYS) | set(RO.STING_KEYS)
    strays = sorted(f for f in os.listdir(out_dir) if f.lower().endswith(('.wav', '.m4a', '.mp3', '.ogg'))
                    and os.path.splitext(f)[0] not in known)
    if strays:
        print('FAIL not a key of this game: %s' % ', '.join(strays))
        fails += 1
    if full:
        print('folder: %.2f MB (effects %.2f MB, stings %.2f MB, music %.2f MB; budget %.1f MB)'
              % (total / 1e6, fx_bytes / 1e6, sting_bytes / 1e6, (total - fx_bytes - sting_bytes) / 1e6, PACK_BUDGET_BYTES / 1e6))
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
# accents, rows, telling apart, sheets
# ---------------------------------------------------------------------------

def accents_report():
    print('%-15s %-34s %-22s %s' % ('key', 'haptic (catalogue)', 'sound accents (ms)', 'pulses/s'))
    worst = 0.0
    for k in effect_keys():
        _, _, acc = render_effect(k)
        hap = event(k)[2]
        ht = haptic_times(hap)
        hs = ' '.join('%s@%d' % (s, round(t * 1000)) for s, t in ht) or '-'
        gaps = [b[1] - a[1] for a, b in zip(ht, ht[1:])]
        rate = (1.0 / min(gaps)) if gaps else 0.0
        floor = event(k)[1]
        across = 1000.0 / max(floor, 120) if (hap and floor) else 0.0           # the haptics service's own floor is 120 ms
        worst = max(worst, rate, across)
        print('%-15s %-34s %-22s %s%s' % (k, hs, ' '.join('%d' % round(a * 1000) for a in acc) or '-',
                                          '%.1f' % rate if gaps else '-', ('   across plays at most %.1f/s' % across) if across else ''))
    print('fastest haptic rate: %.1f pulses a second (spec 6: at most 8)' % worst)
    return worst


def row_of(ys, every_ms, count=20, jitter_ms=0.0, rng=None, voices=3):
    """`count` sounds every `every_ms`, taking turns through the files ys, at most `voices`
    sounding at once (a new one cuts the oldest, as the fx service does)."""
    step = every_ms / 1000.0
    starts = [int(round((i * step + (rng.uniform(-jitter_ms, jitter_ms) / 1000.0 if rng is not None and jitter_ms else 0.0)) * dsp.SR))
              for i in range(count)]
    starts = [max(s, 0) for s in starts]
    picks = [ys[(i * 7 + (rng.randint(len(ys)) if rng is not None else 0)) % len(ys)] for i in range(count)]
    buf = np.zeros(starts[-1] + max(len(y) for y in ys))
    for i, s in enumerate(starts):
        seg = picks[i].copy()
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


def key_files(stem):
    """Every mastered file of the key a stem belongs to, at catalogue volume."""
    k = RO.key_of(stem)
    vol = RO.EVENTS[k][0]
    return [render_effect(s)[0] * vol for s in RO.file_stems(k)]


def rows_report(sheet_dir):
    """Rows of twenty at the key's floor and at 100 ms (files taking turns, catalogue volume and
    voices), and rows of fifty at a reading hand's pace (one decision every 1.2 s, the fast hand
    of spec 8), printed; returns the number of rows that clip, and draws one picture."""
    import qa
    items = []
    bad = 0
    print('%-13s %5s %6s %7s %7s %7s %8s %7s' % ('key', 'files', 'every', 'peak', 'row', 'single', 'dip', 'build'))
    for k, every in RO.ROW_KEYS.items():
        ys = key_files(k)
        voices = event(k)[4]
        for ms, count in sorted({(every, 20), (max(every, 100), 20)}) + ([(1200, 50)] if RO.key_of(k) in ('sign', 'study', 'sign_ink') else []):
            buf = row_of(ys, ms, count, jitter_ms=4.0 if ms > 60 else 0.0, rng=np.random.RandomState(7), voices=voices)
            s = row_stats(buf, ys[0], ms)
            clip = s['peak_db'] > -0.1
            bad += clip
            print('%-13s %5d %4d ms %7.1f %7.1f %7.1f %6.1f dB %+6.1f%s  (x%d)' % (RO.key_of(k), len(ys), ms, s['peak_db'], s['loud_db'], s['single_db'],
                                                                         s['dip_db'], s['loud_db'] - s['single_db'], '  CLIPS' if clip else '', count))
            if count == 20:
                items.append({'name': '%s x%d @%d ms' % (RO.key_of(k), count, ms), 'mono': buf, 'a': qa.analyse(buf), 'err': [], 'warn': [], 'music': False})
    # the whole signing gesture fifty times: the nib from 40 pt, the clink 300 ms later
    ink, clink = key_files('sign_ink_1'), key_files('sign_1')
    st = key_files('study_1')
    rng = np.random.RandomState(11)
    g = []
    for i in range(50):
        if i % 3 == 2:
            g.append(st[rng.randint(3)])
        else:
            m = dsp.Mix()
            m.add(ink[rng.randint(3)])
            m.add(clink[rng.randint(3)], 0.3)
            g.append(m.out())
    buf = np.zeros(dsp.ns(50 * 1.2) + dsp.ns(1.0))
    for i, y in enumerate(g):
        s = dsp.ns(i * 1.2 + rng.uniform(-0.15, 0.15) + 0.2)
        buf[s:s + len(y)] += y
    clip = dsp.peak_db(buf) > -0.1
    bad += clip
    print('desk gesture  fifty decisions at 1.2 s (two signed: nib + clink at 300 ms; one studied): peak %.1f dBFS, loudness %.1f dB%s'
          % (dsp.peak_db(buf), dsp.loudness_db(buf), '  CLIPS' if clip else ''))
    first = buf[:dsp.ns(8.0)]
    items.append({'name': 'desk x50 @1.2 s (first 8 s)', 'mono': first, 'a': qa.analyse(first), 'err': [], 'warn': [], 'music': False})
    if sheet_dir:
        path = os.path.join(sheet_dir, 'rows.png')
        qa.contact_sheet(path, items, 'High Office: rows at catalogue volume', cols=4)
        print('picture: %s' % path)
    return bad


def band_profile(y):
    """Energy per octave band (125 Hz .. 8 kHz), as fractions."""
    S = np.abs(np.fft.rfft(y, 1 << 15)) ** 2
    f = np.fft.rfftfreq(1 << 15, 1.0 / dsp.SR)
    edges = [0, 250, 500, 1000, 2000, 4000, 8000, 30000]
    v = np.array([S[(f >= a) & (f < b)].sum() for a, b in zip(edges, edges[1:])])
    return v / v.sum()


def tell_report():
    """Signing (nib + clink) against studying (the drawer): the measures a person tells them by
    with the screen off: length, centroid, energy under 1 kHz, the onset's brightness; and the
    timbre leg of compare.py between every pair of their files (the gate's own measure: 0.93 is
    'a copy'). Returns 1 when the two families are not clearly apart."""
    import compare
    rows = []
    for stem in RO.file_stems('sign') + RO.file_stems('study') + RO.file_stems('sign_ink'):
        y, _, _ = render_effect(stem)
        import qa
        a = qa.analyse(y)
        bp = band_profile(y)
        rows.append((stem, y, a, bp))
    print('%-11s %6s %7s %9s %8s %8s' % ('file', 'ms', 'cent', '<1 kHz', '1-4 kHz', '>4 kHz'))
    for stem, y, a, bp in rows:
        print('%-11s %6.0f %7.0f %8.0f%% %7.0f%% %7.0f%%' % (stem, a['duration'] * 1000, a['centroid'], 100 * bp[:3].sum(),
                                                            100 * bp[3:5].sum(), 100 * bp[5:].sum()))
    T = {stem: compare.timbre_features(y) for stem, y, _, _ in rows}
    Y = {stem: y for stem, y, _, _ in rows}
    for a_ in RO.file_stems('sign'):                          # the whole gesture: the nib from 40 pt, the clink 300 ms later
        m = dsp.Mix()
        m.add(Y['sign_ink_' + a_[-1]])
        m.add(Y[a_], 0.3)
        T['ink+' + a_] = compare.timbre_features(m.out())
    worst = 0.0
    print('timbre score (compare.py --cross timbre leg; 0.93 is "a copy"), signing against the drawer:')
    for a_ in RO.file_stems('sign') + ['ink+' + x for x in RO.file_stems('sign')] + RO.file_stems('sign_ink'):
        line = []
        for b_ in RO.file_stems('study'):
            sc = compare.timbre_score(T[a_], T[b_])
            if not a_.startswith('sign_ink'):
                worst = max(worst, sc)
            line.append('%s %.2f' % (b_, sc))
        print('  %-11s %s' % (a_, '  '.join(line)))
    within = [compare.timbre_score(T[a_], T[b_]) for i, a_ in enumerate(RO.file_stems('sign')) for b_ in RO.file_stems('sign')[i + 1:]]
    within += [compare.timbre_score(T[a_], T[b_]) for i, a_ in enumerate(RO.file_stems('study')) for b_ in RO.file_stems('study')[i + 1:]]
    print('signing (the clink, and nib + clink) against the drawer at most %.2f; variants within one sound %.2f to %.2f'
          % (worst, min(within), max(within)))
    ok = worst < 0.6
    print('tell: %s (signing against the drawer under 0.60; the nib alone is listed, it only ever sounds before a clink)'
          % ('apart' if ok else 'TOO CLOSE'))
    return 0 if ok else 1


GROUPS = [
    ('desk', RO.file_stems('sign_ink') + RO.file_stems('sign') + RO.file_stems('study') + ['take_back', 'denied']),
    ('arrivals', RO.file_stems('paper_arrive') + ['slip_arrive', 'buy_level', 'open_ministry', 'appoint', 'storey', 'ribbon']),
    ('events', ['boycott_start', 'boycott_end', 'scandal', 'clipping', 'ui_open', 'ui_close']),
    ('election', ['call_election', 'env_open'] + RO.file_stems('tally') + ['district_held', 'district_lost']),
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
        qa.contact_sheet(path, items, 'High Office: %s' % name, cols=3)
        print('picture: %s' % path)
    items = []
    for mk in RO.STING_KEYS + RO.MUSIC_KEYS:
        mpath = os.path.join(out_dir, mk + '.m4a')
        if os.path.exists(mpath):
            if mk in RO.MUSIC_KEYS:
                err, warn, a, seam, meta, size, x = qa_music(mpath)
                items.append({'name': mk + '.m4a', 'mono': x.mean(axis=1), 'a': a, 'err': err, 'warn': warn, 'music': True,
                              'seam': seam, 'meta': meta, 'size': size})
            else:
                err, warn, a, size, x = qa_sting(mk, mpath)
                items.append({'name': mk + '.m4a', 'mono': x.mean(axis=1), 'a': a, 'err': err, 'warn': warn, 'music': False})
    if items:
        path = os.path.join(sheet_dir, 'sheet_music.png')
        qa.contact_sheet(path, items, 'High Office: stings and music', cols=1)
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
    ap.add_argument('--rows', metavar='DIR', help='rows of the fast sounds; picture into DIR')
    ap.add_argument('--tell', action='store_true', help='signing against the drawer, measured')
    ap.add_argument('--sheets', metavar='DIR', help='contact sheets per group into DIR')
    ap.add_argument('--hash', action='store_true', help='print the sha256 of every file in the folder')
    ap.add_argument('--no-music', action='store_true')
    args = ap.parse_args(argv)
    out = args.out or default_out()

    problems, cat = check()
    if problems:
        print('render_office: %d problem(s):\n  %s' % (len(problems), '\n  '.join(problems)), file=sys.stderr)
        return 2
    if args.check:
        print('office pack ok: %d keys of spec 6 (%d effect files from recipes_office, %d stings, %d music loops); no key falls back '
              '(soundPack %s; recipes.py, recipes_haul.py, recipes_night.py, packs.py not imported); keys checked against %s'
              % (len(RO.EVENTS), len(effect_keys()), len(RO.STING_KEYS), len(RO.MUSIC_KEYS),
                 'null' if game_sound_pack() is None else 'not set yet (no game.json)' if game_sound_pack() == 'absent' else game_sound_pack(),
                 'catalog.decree.ts' if cat is not None else 'the spec 6 table (catalog.decree.ts does not exist yet)'))
        return 0
    if args.accents:
        return 1 if accents_report() > 8.0 else 0
    if args.rows:
        os.makedirs(args.rows, exist_ok=True)
        return 1 if rows_report(args.rows) else 0
    if args.tell:
        return tell_report()
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
    music = list(RO.STING_KEYS + RO.MUSIC_KEYS)
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
        import office_music
        for mk in music:
            info = office_music.build(mk, os.path.join(out, mk + '.m4a'))
            print('%s.m4a: %s, %.2f s, K-RMS %.1f dB, peak %.1f dBFS, %.0f KB (%.0f kb/s)%s'
                  % (mk, info['title'], info['duration'], info['loudness_db'], info['peak_db'], info['bytes'] / 1000.0, info['kbps'],
                     '' if info['decoded_samples'] == info['samples'] else '; decodes to %d samples, rendered %d'
                     % (info['decoded_samples'], info['samples'])))
    print('rendered %d effect(s)%s in %.1f s -> %s\n' % (len(keys), ' + %d music file(s)' % len(music) if music else '', time.time() - t0, out))
    full = not args.only and not args.no_music
    fails = qa_folder(out, None if full else keys)
    print('\nQA %s: %d failing' % ('FAILED' if fails else 'passed', fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
