#!/usr/bin/env python3
"""Similarity check between two games' sound packs (spec 6.1, fingerprint dimension 16).

  python3 scripts/audio/compare.py space-miner pizza-empire
  python3 scripts/audio/compare.py space-miner pizza-empire --calibrate     also print what the scores mean
  python3 scripts/audio/compare.py space-miner pizza-empire --json out.json

For every key both games have (their files are whatever scripts/lib/games.js
listSounds(id) returns), two scores in 0..1:

  onset   the peak normalised cross-correlation of the onset envelopes:
          spectral flux of the log magnitude, 10 ms hops, mean removed,
          maximised over every time lag. It hears rhythm: where the events are.
  chroma  the peak normalised cross-correlation of the 12-bin chroma
          sequences (numpy FFT folded to pitch classes, 100 Hz to 5 kHz,
          10 ms hops; each frame centred and unit length, weighted by its
          level and by how tonal it is), maximised over every time lag AND
          over the 12 transpositions. It hears melody and harmony; the
          transposition search matters because the two packs are in
          different keys (C and A), and a tune moved down three semitones is
          still the same tune.

The check fails when either score of a key is above the threshold (default
0.6, spec 6.1; printed with the scores). With --calibrate it also renders
the first pack's own recipes on the other pack's instruments (the same
recipe on different instruments: what "too close" looks like) and scores
every pair of the first pack's unrelated sounds against each other (what
"unrelated" looks like), so the threshold can be judged, not assumed.

Music keys (.m4a) are compared on 50 ms hops. Python 3 + numpy; ffmpeg for .m4a.
Exit code 1 when a key fails.

Cross-key mode (the third game's gate, spec market-design 6.1; additive: without these flags the
output is what it always was):

  python3 scripts/audio/compare.py night-market pizza-empire --cross [--top 20] [--json out.json]
  python3 scripts/audio/compare.py night-market pizza-empire --cross --calibrate-cross

  --cross            scores EVERY sound of the first game against EVERY sound of the second, not
                     only same-named keys (effects against effects, music against music), lists
                     the nearest pairs and each sound's nearest neighbour, and fails (exit 1)
                     when any pair's joint score is above the threshold.
  --calibrate-cross  what the scores mean for this mode: every pair of the first game's own
                     unrelated sounds (what "different" scores), and every sound against copies of
                     itself pitch-shifted by resampling (+-1, +-2, +-4 semitones; what "the same
                     sound moved" scores).
  GAME or OTHER may also be a folder of .wav/.m4a files (a pack not yet wired to a game).
"""
from __future__ import annotations

import sys

sys.dont_write_bytecode = True

import argparse
import json
import math
import os
import subprocess

import numpy as np

import dsp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
SR = dsp.SR
THRESHOLD = 0.6
N_FFT = 2048
CHROMA_LO, CHROMA_HI = 100.0, 5000.0
FLUX_LO, FLUX_HI = 100.0, 8000.0


# ---------------------------------------------------------------------------
# files
# ---------------------------------------------------------------------------

def list_sounds(game):
    """{key: absolute path} from scripts/lib/games.js listSounds(id) (or, for a folder, its sound files)."""
    if os.path.isdir(game):
        return {os.path.splitext(f)[0]: os.path.abspath(os.path.join(game, f)) for f in sorted(os.listdir(game))
                if f.lower().endswith(('.wav', '.m4a'))}
    js = "process.stdout.write(JSON.stringify(require('./scripts/lib/games.js').listSounds(%s)))" % json.dumps(game)
    run = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True)
    if run.returncode != 0:
        raise RuntimeError('listSounds(%r) failed: %s' % (game, run.stderr.strip()[-300:]))
    return {k: os.path.join(ROOT, v) for k, v in json.loads(run.stdout).items()}


def load(path):
    """-> mono float array at 44.1 kHz."""
    if path.lower().endswith('.wav'):
        x, sr, ch, bits = dsp.read_wav(path)
        if sr != SR:
            raise ValueError('%s: %d Hz' % (path, sr))
        return x if x.ndim == 1 else x.mean(axis=1)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True)
    if raw.returncode != 0:
        raise RuntimeError('ffmpeg cannot decode %s' % path)
    return np.frombuffer(raw.stdout, '<f4').astype(float)


# ---------------------------------------------------------------------------
# features
# ---------------------------------------------------------------------------

_PC = None


def _pitch_classes(nfft):
    f = np.fft.rfftfreq(nfft, 1.0 / SR)
    keep = (f >= CHROMA_LO) & (f <= CHROMA_HI)
    pc = np.zeros(len(f), int)
    pc[keep] = (np.round(12.0 * np.log2(f[keep] / 440.0)).astype(int) + 69) % 12
    return keep, pc, (f >= FLUX_LO) & (f <= FLUX_HI)


def features(x, hop_s=0.010):
    """-> dict(onset envelope, chroma (T, 12) unit frames, chroma weights, onset count, tonal share)."""
    global _PC
    hop = int(round(hop_s * SR))
    x = np.concatenate([np.zeros(N_FFT // 2), np.asarray(x, float), np.zeros(N_FFT)])
    T = max((len(x) - N_FFT) // hop + 1, 1)
    if _PC is None:
        _PC = _pitch_classes(N_FFT)
    keep, pc, fband = _PC
    win = np.hanning(N_FFT)
    idx = np.arange(N_FFT)[None, :] + hop * np.arange(T)[:, None]
    frames = x[idx] * win
    S = np.abs(np.fft.rfft(frames, axis=1))
    peak = S.max() + 1e-12
    L = np.log1p(100.0 * S[:, fband] / peak)
    flux = np.concatenate([[0.0], np.maximum(np.diff(L, axis=0), 0.0).sum(axis=1)])
    C = np.zeros((T, 12))
    Sk = S[:, keep]
    for k in range(12):
        C[:, k] = Sk[:, pc[keep] == k].sum(axis=1)
    energy = (S[:, keep] ** 2).sum(axis=1)
    level = np.sqrt(energy / (energy.max() + 1e-30))
    mean = C.mean(axis=1, keepdims=True) + 1e-12
    tonal = np.clip((C.max(axis=1) / mean[:, 0] - 1.6) / 2.4, 0.0, 1.0)      # flat (noise) chroma -> 0, one clear pitch class -> 1
    Cc = C - mean
    Cc /= np.linalg.norm(Cc, axis=1, keepdims=True) + 1e-12
    w = level * tonal
    w[level < 0.03] = 0.0                                                      # quieter than -30 dB: not a frame worth comparing
    return {'onset': flux, 'chroma': Cc, 'w': w, 'onsets': count_onsets(flux, hop_s),
            'tonal': float((level * tonal).sum() / (level.sum() + 1e-12)), 'hop': hop_s}


def count_onsets(flux, hop_s, rel=0.3, gap_s=0.04):
    th = rel * flux.max() if len(flux) else 0.0
    gap = max(int(gap_s / hop_s), 1)
    n, last = 0, -10 ** 9
    for i in range(1, len(flux) - 1):
        if flux[i] >= th and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1] and i - last >= gap:
            n += 1
            last = i
    return n


def xcorr_full(a, b):
    """Full cross-correlation sum_t a[t] b[t + l] for every lag, by FFT."""
    n = len(a) + len(b) - 1
    nfft = dsp.pow2(n)
    return np.fft.irfft(np.fft.rfft(a[::-1], nfft) * np.fft.rfft(b, nfft), nfft)[:n]


def onset_curve(fa, fb):
    """Normalised cross-correlation of the onset envelopes at every lag."""
    a = fa['onset'] - fa['onset'].mean()
    b = fb['onset'] - fb['onset'].mean()
    den = np.linalg.norm(a) * np.linalg.norm(b)
    r = xcorr_full(a, b)
    return r / den if den > 0 else np.zeros_like(r)


def chroma_curves(fa, fb):
    """Normalised cross-correlation of the weighted chroma sequences at every lag, one curve per transposition."""
    A = fa['chroma'] * fa['w'][:, None]
    B = fb['chroma'] * fb['w'][:, None]
    den = math.sqrt(float((fa['w'] ** 2).sum()) * float((fb['w'] ** 2).sum()))
    out = []
    for k in range(12):
        Bk = np.roll(B, -k, axis=1)
        acc = sum(xcorr_full(A[:, p], Bk[:, p]) for p in range(12))
        out.append(acc / den if den > 1e-9 else np.zeros_like(acc))
    return out


def score(fa, fb):
    """onset and chroma (spec 6.1: each maximised on its own over the lags), and joint: the
    best lag and transposition at which rhythm AND pitch agree (the smaller of the two there)."""
    ro = onset_curve(fa, fb)
    rcs = chroma_curves(fa, fb)
    peaks = [float(r.max()) for r in rcs]
    k = int(np.argmax(peaks))
    joints = [float(np.minimum(ro, r).max()) for r in rcs]
    kj = int(np.argmax(joints))
    clip = lambda v: float(np.clip(v, -1.0, 1.0))
    return {'onset': clip(ro.max()), 'chroma': clip(peaks[k]), 'shift': k, 'joint': clip(joints[kj]), 'joint_shift': kj,
            'onsets': (fa['onsets'], fb['onsets']), 'tonal': (fa['tonal'], fb['tonal'])}


def feats_of(path, cache):
    if path not in cache:
        x = load(path)
        cache[path] = features(x, 0.05 if len(x) > 8 * SR else 0.010)
    return cache[path]


# ---------------------------------------------------------------------------
# calibration
# ---------------------------------------------------------------------------

def same_recipe_other_instruments(pizza, cache):
    """The first pack's own recipes rendered on the synth instruments, scored against its files."""
    from packs import PACKS
    from recipes import RECIPES, Ctx
    pack = PACKS['synth']()
    rows = []
    for key, path in sorted(pizza.items()):
        if not path.endswith('.wav'):
            continue
        rk, i = key, 1
        head, _, tail = key.rpartition('_')
        if key not in RECIPES and tail.isdigit() and head in RECIPES:
            rk, i = head, int(tail)
        fn = RECIPES.get(rk)
        if fn is None:
            continue
        c = Ctx(pack, rk, i, max(i, 1))
        c.length = getattr(fn, 'length', None)
        y, _ = dsp.master(fn(c), floor_db=c.floor_db, length=c.length, stream_ms=getattr(fn, 'stream_ms', None),
                          target_db=dsp.LOUDNESS_TARGET_DB + getattr(fn, 'loud_db', 0.0))
        rows.append((key, score(feats_of(path, cache), features(y))))
    return rows


def unrelated_pairs(pizza, cache):
    """Every pair of the first pack's one-shots with different recipes (variants of one key are skipped)."""
    keys = sorted(k for k, p in pizza.items() if p.endswith('.wav'))

    def stem(k):
        h, _, t = k.rpartition('_')
        return h if t.isdigit() else k

    rows = []
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            if stem(a) == stem(b):
                continue
            rows.append(((a, b), score(feats_of(pizza[a], cache), feats_of(pizza[b], cache))))
    return rows


def dist(vals):
    v = np.sort(np.asarray(vals, float))
    q = lambda p: float(np.percentile(v, p))
    return 'n %4d  min %.2f  median %.2f  p90 %.2f  p95 %.2f  p99 %.2f  max %.2f' % (len(v), v[0], q(50), q(90), q(95), q(99), v[-1])


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def verdict(s, T, rule):
    """True when the pair is too close. rule 'joint' (default): rhythm and pitch agree at one alignment
    above T. rule 'spec': the literal reading of spec 6.1, onset or chroma above T."""
    if rule == 'spec':
        return s['onset'] > T or s['chroma'] > T
    return s['joint'] > T


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('game')
    ap.add_argument('other')
    ap.add_argument('--threshold', type=float, default=THRESHOLD)
    ap.add_argument('--rule', choices=('joint', 'spec'), default='joint',
                    help="joint (default): fail when rhythm and pitch agree above the threshold at the same alignment; "
                         "spec: fail when onset or chroma alone is above it (flags a third of unrelated pairs, see --calibrate)")
    ap.add_argument('--calibrate', action='store_true')
    ap.add_argument('--nearest', action='store_true', help='also score each sound of GAME against every sound of OTHER')
    ap.add_argument('--json', help='write all scores to this file')
    ap.add_argument('--cross', action='store_true', help='score EVERY sound of GAME against EVERY sound of OTHER (any key)')
    ap.add_argument('--top', type=int, default=20, help='with --cross: how many nearest pairs to list')
    ap.add_argument('--calibrate-cross', action='store_true', help='with --cross: unrelated pairs and pitch-shifted copies of GAME')
    args = ap.parse_args(argv)
    if args.cross or args.calibrate_cross:
        return cross_main(args)

    A, B = list_sounds(args.game), list_sounds(args.other)
    common = sorted(k for k in A if k in B)
    cache = {}
    T = args.threshold
    out = {'threshold': T, 'rule': args.rule, 'game': args.game, 'other': args.other, 'keys': {}}
    print('%s vs %s: %d key(s) in both; threshold %.2f, rule %s' % (args.game, args.other, len(common), T,
          'joint (rhythm and pitch at one alignment)' if args.rule == 'joint' else 'spec (onset or chroma)'))
    print('%-18s %6s %6s %6s %5s %9s %11s  %-7s %s' % ('key', 'onset', 'chroma', 'joint', 'shift', 'onsets', 'tonal', 'verdict', 'spec rule'))
    fails = 0
    for k in common:
        s = score(feats_of(A[k], cache), feats_of(B[k], cache))
        bad = verdict(s, T, args.rule)
        fails += bad
        out['keys'][k] = s
        sh = s['joint_shift'] if s['joint_shift'] <= 6 else s['joint_shift'] - 12
        print('%-18s %6.2f %6.2f %6.2f %+5d %4d/%-4d %4.2f/%-4.2f  %-7s %s'
              % (k, s['onset'], s['chroma'], s['joint'], sh, s['onsets'][0], s['onsets'][1], s['tonal'][0], s['tonal'][1],
                 'FAIL' if bad else 'ok', 'over' if verdict(s, T, 'spec') else 'under'))
    if args.nearest:
        print('\nnearest %s sound to each %s sound (any key, by joint):' % (args.other, args.game))
        bw = {k: p for k, p in B.items() if p.endswith('.wav')}
        near = {}
        for k in sorted(A):
            if not A[k].endswith('.wav'):
                continue
            fa = feats_of(A[k], cache)
            best = max(((score(fa, feats_of(p, cache)), kb) for kb, p in bw.items()), key=lambda r: r[0]['joint'])
            near[k] = (best[1], best[0])
            print('  %-18s %-18s joint %.2f  (onset %.2f chroma %.2f)%s' % (k, best[1], best[0]['joint'], best[0]['onset'], best[0]['chroma'],
                                                                         '  above %.2f' % T if best[0]['joint'] > T else ''))
        out['nearest'] = near
    if args.calibrate:
        print('\ncalibration (what the numbers mean):')
        same = same_recipe_other_instruments(B, cache)
        unrel = unrelated_pairs(B, cache)
        out['calibration'] = {'same_recipe': {k: s for k, s in same}, 'unrelated': {'%s|%s' % ab: s for ab, s in unrel}}
        print('  A = %d sounds of %s re-rendered from their own recipes on the synth instruments, scored against the originals'
              % (len(same), args.other))
        print('  B = %d pairs of different sounds of %s' % (len(unrel), args.other))
        for name in ('onset', 'chroma', 'joint'):
            sv = [s[name] for _, s in same]
            uv = [s[name] for _, s in unrel]
            print('  %-6s A same recipe  %s' % (name, dist(sv)))
            print('  %-6s B unrelated    %s' % (name, dist(uv)))
            print('  %-6s at %.2f: A caught %d of %d, B flagged %d of %d (%.0f %%)'
                  % (name, T, sum(v > T for v in sv), len(sv), sum(v > T for v in uv), len(uv), 100.0 * sum(v > T for v in uv) / len(uv)))
        for rule in ('spec', 'joint'):
            a_ = sum(verdict(s, T, rule) for _, s in same)
            b_ = sum(verdict(s, T, rule) for _, s in unrel)
            print('  rule %-5s at %.2f: A caught %d of %d, B flagged %d of %d (%.0f %%)' % (rule, T, a_, len(same), b_, len(unrel), 100.0 * b_ / len(unrel)))
        low = sorted(same, key=lambda r: r[1]['joint'])[:6]
        print('  A, lowest joint (re-renders the check misses): %s' % ', '.join('%s %.2f' % (k, s['joint']) for k, s in low))
        high = sorted(unrel, key=lambda r: -r[1]['joint'])[:6]
        print('  B, highest joint (unrelated pairs it flags): %s' % ', '.join('%s~%s %.2f' % (a, b, s['joint']) for (a, b), s in high))
    if args.json:
        with open(args.json, 'w') as f:
            json.dump(out, f, indent=1, default=lambda o: list(o) if isinstance(o, tuple) else o)
    print('\ncompare %s: %d of %d key(s) above %.2f (rule %s)' % ('FAILED' if fails else 'passed', fails, len(common), T, args.rule))
    return 1 if fails else 0


# ---------------------------------------------------------------------------
# cross-key mode (every sound of one game against every sound of the other)
# ---------------------------------------------------------------------------

def stem_of(k):
    h, _, t = k.rpartition('_')
    return h if t.isdigit() else k


def resample(x, r):
    """Read x r times faster (pitch up by r, length / r), linear interpolation."""
    n = max(int(len(x) / r), 2)
    return np.interp(np.arange(n) * r, np.arange(len(x)), x)


def time_stretch(x, factor, n_fft=1024, hop=256):
    """Phase-vocoder time stretch: the length times `factor`, the pitch kept."""
    x = np.concatenate([np.zeros(n_fft), np.asarray(x, float), np.zeros(n_fft)])
    win = np.hanning(n_fft)
    frames = range(0, len(x) - n_fft, hop)
    S = np.array([np.fft.rfft(win * x[i:i + n_fft]) for i in frames])
    steps = np.arange(0, len(S) - 1, 1.0 / factor)
    omega = 2 * np.pi * hop * np.arange(n_fft // 2 + 1) / n_fft
    phase = np.angle(S[0])
    out = np.zeros(int(len(steps) * hop + n_fft))
    for j, st in enumerate(steps):
        i = int(st)
        frac = st - i
        mag = (1 - frac) * np.abs(S[i]) + frac * np.abs(S[i + 1])
        y = np.fft.irfft(mag * np.exp(1j * phase), n_fft)
        out[j * hop:j * hop + n_fft] += win * y
        dphi = np.angle(S[i + 1]) - np.angle(S[i]) - omega
        dphi -= 2 * np.pi * np.round(dphi / (2 * np.pi))
        phase = phase + omega + dphi
    out *= hop / (win ** 2).sum()
    k = int(round(n_fft * factor))
    return out[k:k + int(round((len(x) - 2 * n_fft) * factor))]


def pitch_shift(x, semitones):
    """The same sound `semitones` higher at the same length and timing (phase vocoder, then resampled)."""
    r = 2.0 ** (semitones / 12.0)
    return resample(time_stretch(x, r), r)


def cross_scores(A, B, cache):
    """[(a, b, score)] for every effect of A against every effect of B, and music against music."""
    rows = []
    for ka in sorted(A):
        ma = A[ka].endswith('.m4a')
        fa = feats_of(A[ka], cache)
        for kb in sorted(B):
            if B[kb].endswith('.m4a') != ma:
                continue
            rows.append((ka, kb, score(fa, feats_of(B[kb], cache))))
    return rows


def cross_calibration(A, cache, shifts=(-4, -2, -1, 1, 2, 4)):
    """(unrelated pairs of A's effects, pitch-shifted copies of each of A's effects against the original)."""
    keys = sorted(k for k, p in A.items() if p.endswith('.wav'))
    unrel = []
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            if stem_of(a) == stem_of(b):
                continue
            unrel.append(((a, b), score(feats_of(A[a], cache), feats_of(A[b], cache))))
    same = []
    for k in keys:
        x = load(A[k])
        fa = feats_of(A[k], cache)
        for st in shifts:
            same.append(((k, st), score(fa, features(pitch_shift(x, st)))))
    return unrel, same


def cross_main(args):
    A, B = list_sounds(args.game), list_sounds(args.other)
    cache = {}
    T = args.threshold
    name = lambda g: os.path.basename(os.path.normpath(g)) if os.path.isdir(g) else g
    out = {'threshold': T, 'rule': 'joint', 'mode': 'cross', 'game': name(args.game), 'other': name(args.other)}
    fails = 0
    if args.cross:
        rows = cross_scores(A, B, cache)
        out['pairs'] = {'%s|%s' % (a, b): s for a, b, s in rows}
        bad = [(a, b, s) for a, b, s in rows if s['joint'] > T]
        fails = len(bad)
        print('%s vs %s, cross-key: %d x %d sound(s), %d pair(s) (effects against effects, music against music); '
              'threshold %.2f on joint (rhythm and pitch at one alignment)'
              % (name(args.game), name(args.other), len(A), len(B), len(rows), T))
        print('\nnearest pairs (by joint):')
        print('  %-16s %-18s %6s %6s %6s %5s %11s' % (name(args.game), name(args.other), 'joint', 'onset', 'chroma', 'shift', 'tonal'))
        for a, b, s in sorted(rows, key=lambda r: -r[2]['joint'])[:args.top]:
            sh = s['joint_shift'] if s['joint_shift'] <= 6 else s['joint_shift'] - 12
            print('  %-16s %-18s %6.2f %6.2f %6.2f %+5d %4.2f/%-4.2f%s' % (a, b, s['joint'], s['onset'], s['chroma'], sh, s['tonal'][0],
                                                                          s['tonal'][1], '  ABOVE %.2f' % T if s['joint'] > T else ''))
        print('\nnearest %s sound to each %s sound:' % (name(args.other), name(args.game)))
        near = {}
        for ka in sorted(A):
            mine = [r for r in rows if r[0] == ka]
            if not mine:
                continue
            a, b, s = max(mine, key=lambda r: (r[2]['joint'], r[2]['onset']))
            near[ka] = (b, s['joint'])
            print('  %-16s %-18s joint %.2f  (onset %.2f chroma %.2f)' % (ka, b, s['joint'], s['onset'], s['chroma']))
        out['nearest'] = near
        j = np.array([s['joint'] for _, _, s in rows])
        print('\nall pairs, joint: %s' % dist(j))
    if args.calibrate_cross:
        unrel, same = cross_calibration(A, cache)
        out['calibration'] = {'unrelated': {'%s|%s' % ab: s for ab, s in unrel},
                              'pitch_shifted': {'%s|%+d' % ks: s for ks, s in same}}
        print('\ncalibration of the cross-key mode on %s (what the numbers mean):' % name(args.game))
        print('  U = %d pairs of different sounds of %s (unrelated)' % (len(unrel), name(args.game)))
        print('  P = %d copies of each sound pitch-shifted by -4, -2, -1, +1, +2, +4 semitones (phase vocoder: same length and timing), against the original'
              % len(same))
        for nm in ('onset', 'chroma', 'joint'):
            uv = [s[nm] for _, s in unrel]
            pv = [s[nm] for _, s in same]
            print('  %-6s U unrelated      %s' % (nm, dist(uv)))
            print('  %-6s P pitch-shifted  %s' % (nm, dist(pv)))
        uv = np.array([s['joint'] for _, s in unrel])
        pv = np.array([s['joint'] for _, s in same])
        for th in (0.4, 0.5, 0.6, 0.7):
            print('  joint at %.2f: U flagged %d of %d (%.0f %%), P caught %d of %d (%.0f %%)'
                  % (th, int((uv > th).sum()), len(uv), 100.0 * (uv > th).mean(), int((pv > th).sum()), len(pv), 100.0 * (pv > th).mean()))
        tonal = sorted({k for (k, _), s in same if min(s['tonal']) >= 0.15})
        pt = np.array([s['joint'] for (k, _), s in same if k in tonal])
        if len(pt):
            print('  P, tonal sounds only (tonal share >= 0.15: %s): %s' % (', '.join(tonal), dist(pt)))
            print('  P, tonal sounds only, caught at %.2f: %d of %d' % (T, int((pt > T).sum()), len(pt)))
        lowp = sorted(same, key=lambda r: r[1]['joint'])[:6]
        print('  P, lowest joint (copies the check misses): %s' % ', '.join('%s%+d %.2f' % (k, st, s['joint']) for (k, st), s in lowp))
        hiu = sorted(unrel, key=lambda r: -r[1]['joint'])[:6]
        print('  U, highest joint (unrelated pairs it flags): %s' % ', '.join('%s~%s %.2f' % (a, b, s['joint']) for (a, b), s in hiu))
    if args.json:
        with open(args.json, 'w') as f:
            json.dump(out, f, indent=1, default=lambda o: list(o) if isinstance(o, tuple) else o)
    if args.cross:
        print('\ncross-key compare %s: %d pair(s) above %.2f (rule joint)' % ('FAILED' if fails else 'passed', fails, T))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
