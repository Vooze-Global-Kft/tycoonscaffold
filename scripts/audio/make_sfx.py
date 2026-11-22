#!/usr/bin/env python3
"""Synthesise every sound in src/services/fx/catalog.ts. Python 3 + numpy only.

  python3 scripts/audio/make_sfx.py --pack warm --out shared/sfx
        the default pack every game gets (58 effects + the neutral music loop)

  python3 scripts/audio/make_sfx.py --pack warm --out games/pizza-empire/assets/sfx \\
        --only music_main --music trattoria
        one game's own music (any `--only` subset works as a per-game override)

  python3 scripts/audio/make_sfx.py --pack synth --out games/space-miner/assets/sfx
        a whole different pack for a game

  python3 scripts/audio/make_sfx.py --check       coverage only (CI friendly)
  python3 scripts/audio/make_sfx.py --list        keys, file counts, recipes
  python3 scripts/audio/make_sfx.py --accents     sound accents next to the haptic patterns

The keys and `files` counts are read from the catalogue itself, so a key
without a recipe (or a recipe without a key) is caught here, loudly, and not
in the game. Output is deterministic: same seed, same bytes.

Files: <key>.wav, or <key>_1.wav ... <key>_<n>.wav when the catalogue says
`files: n`; 44.1 kHz mono 16-bit, trimmed, faded, normalised to one loudness
(see dsp.py: master). Keys with `loop: true` are music and become <key>.m4a.
"""
from __future__ import annotations

import sys

sys.dont_write_bytecode = True      # keep __pycache__ out of the repo

import argparse
import fnmatch
import os
import re
import time

import dsp
from packs import PACKS
from recipes import RECIPES, Ctx

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
CATALOG = os.path.join(ROOT, 'src', 'services', 'fx', 'catalog.ts')
PACK_BUDGET_BYTES = 3_000_000       # a whole pack, music included
MUSIC_BUDGET_BYTES = 700_000


# ---------------------------------------------------------------------------
# catalogue
# ---------------------------------------------------------------------------

class CatalogError(Exception):
    pass


def _mask_ts(src: str) -> str:
    """Same length as src, with comments and the insides of strings blanked,
    so braces and property names can be found without tripping over text."""
    out = list(src)
    i, n = 0, len(src)
    while i < n:
        ch = src[i]
        if ch == '/' and src[i + 1:i + 2] == '/':
            j = src.find('\n', i)
            j = n if j < 0 else j
            out[i:j] = ' ' * (j - i)
            i = j
        elif ch == '/' and src[i + 1:i + 2] == '*':
            j = src.find('*/', i + 2)
            j = n if j < 0 else j + 2
            out[i:j] = [c if c == '\n' else ' ' for c in src[i:j]]
            i = j
        elif ch in '\'"`':
            j = i + 1
            while j < n and src[j] != ch:
                j += 2 if src[j] == '\\' else 1
            out[i + 1:j] = [c if c == '\n' else ' ' for c in src[i + 1:j]]
            i = j + 1
        else:
            i += 1
    return ''.join(out)


def _match_brace(masked: str, open_at: int) -> int:
    depth = 0
    for i in range(open_at, len(masked)):
        if masked[i] == '{':
            depth += 1
        elif masked[i] == '}':
            depth -= 1
            if depth == 0:
                return i
    raise CatalogError('unbalanced braces in the catalogue')


def parse_catalog(path: str = CATALOG):
    """-> ordered list of dicts: key, files, loop, volume, haptic, brief, pick, min_interval."""
    try:
        src = open(path, encoding='utf-8').read()
    except OSError as e:
        raise CatalogError('cannot read the catalogue: %s' % e)
    masked = _mask_ts(src)
    m = re.search(r'export\s+const\s+FX\b[^=]*=\s*\{', masked)
    if not m:
        raise CatalogError('no `export const FX = {` in %s' % path)
    start = m.end() - 1
    end = _match_brace(masked, start)
    entries, i = [], start + 1
    prop = re.compile(r'\s*,?\s*([A-Za-z_$][\w$]*)\s*:\s*\{')
    while True:
        pm = prop.match(masked, i)
        if not pm:
            break
        o = pm.end() - 1
        c = _match_brace(masked, o)
        body_m, body = masked[o + 1:c], src[o + 1:c]

        def num(name, default=None):
            r = re.search(r'\b%s\s*:\s*([0-9.]+)' % name, body_m)
            return float(r.group(1)) if r else default

        def text(name):
            r = re.search(r'\b%s\s*:\s*([\'"`])' % name, body_m)
            if not r:
                return ''
            q, a = r.group(1), r.end()
            b = body_m.index(q, a)
            return re.sub(r'\\(.)', r'\1', body[a:b])

        haptic = []
        hm = re.search(r'\bhaptic\s*:\s*\[', body_m)
        if hm:
            close = body_m.index(']', hm.end())
            for tok in body[hm.end():close].split(','):
                tok = tok.strip().strip('\'"`')
                if tok:
                    haptic.append(float(tok) if re.fullmatch(r'[0-9.]+', tok) else tok)
        entries.append({
            'key': pm.group(1),
            'files': int(num('files', 1)),
            'loop': bool(re.search(r'\bloop\s*:\s*true\b', body_m)),
            'volume': num('volume'),
            'min_interval': num('minIntervalMs'),
            'pick': text('pick'),
            'brief': text('brief'),
            'haptic': haptic,
        })
        i = c + 1
    rest = masked[i:end].strip(' \t\r\n,')
    if rest or not entries:
        raise CatalogError('could not parse the catalogue near: %r' % src[i:i + 80].strip())
    keys = [e['key'] for e in entries]
    if len(set(keys)) != len(keys):
        raise CatalogError('duplicate keys in the catalogue')
    return entries


def file_names(entry):
    """The file base names an entry stands for (without extension)."""
    if entry['files'] <= 1:
        return [entry['key']]
    return ['%s_%d' % (entry['key'], i) for i in range(1, entry['files'] + 1)]


def haptic_times(pattern):
    """[('heavy', 0.0), ('success', 0.08)] from ['heavy', 80, 'success']."""
    t, out = 0.0, []
    for step in pattern:
        if isinstance(step, float):
            t += step / 1000.0
        else:
            out.append((step, t))
    return out


def coverage(entries):
    """-> (keys without a recipe, recipes without a key). Music keys need a tune, not a recipe."""
    keys = {e['key'] for e in entries}
    missing = [e['key'] for e in entries if not e['loop'] and e['key'] not in RECIPES]
    stale = sorted(k for k in RECIPES if k not in keys)
    return missing, stale


# ---------------------------------------------------------------------------
# rendering
# ---------------------------------------------------------------------------

def render_effect(pack, entry, i):
    """One mastered effect -> (samples, info, accents)."""
    fn = RECIPES[entry['key']]
    ctx = Ctx(pack, entry['key'], i, entry['files'])
    ctx.length = getattr(fn, 'length', None)
    raw = fn(ctx)
    y, info = dsp.master(raw, floor_db=ctx.floor_db, length=ctx.length, stream_ms=getattr(fn, 'stream_ms', None))
    return y, info, sorted(ctx.accents)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', default='warm', choices=sorted(PACKS), help='instrument set and key (default: warm)')
    ap.add_argument('--out', help='folder to write into')
    ap.add_argument('--only', help='comma-separated keys or globs, e.g. "tap,coin,reveal_*"')
    ap.add_argument('--music', default=None, help='tune for music keys: neutral (default), trattoria, or none')
    ap.add_argument('--catalog', default=CATALOG)
    ap.add_argument('--list', action='store_true', help='show the catalogue and stop')
    ap.add_argument('--check', action='store_true', help='check recipe coverage and stop')
    ap.add_argument('--accents', action='store_true', help='print sound accents next to the haptic patterns')
    ap.add_argument('--quiet', action='store_true')
    args = ap.parse_args(argv)

    try:
        entries = parse_catalog(args.catalog)
    except CatalogError as e:
        print('make_sfx: %s' % e, file=sys.stderr)
        return 2
    missing, stale = coverage(entries)
    if stale:
        print('make_sfx: warning: recipes without a catalogue key: %s' % ', '.join(stale), file=sys.stderr)
    if missing:
        print('\nmake_sfx: NO RECIPE for %d catalogue key(s): %s' % (len(missing), ', '.join(missing)), file=sys.stderr)
        print('Add an @recipe to scripts/audio/recipes.py for each (see docs/design/audio-notes.md).\n', file=sys.stderr)
        return 2

    n_files = sum(e['files'] for e in entries if not e['loop'])
    if args.check or args.list:
        if args.list:
            for e in entries:
                kind = 'music' if e['loop'] else 'recipe'
                print('%-18s %d file(s)  %-6s  vol %.2f  %s' % (e['key'], e['files'], kind, e['volume'] or 0, e['brief']))
        print('catalogue ok: %d keys, %d effect files, %d music loop(s); every key has a recipe'
              % (len(entries), n_files, sum(1 for e in entries if e['loop'])))
        return 0

    pack = PACKS[args.pack]()
    selected = entries
    if args.only:
        pats = [p.strip() for p in args.only.split(',') if p.strip()]
        selected = [e for e in entries if any(fnmatch.fnmatchcase(e['key'], p) for p in pats)]
        unknown = [p for p in pats if not any(fnmatch.fnmatchcase(e['key'], p) for e in entries)]
        if unknown:
            print('make_sfx: --only matches no catalogue key: %s' % ', '.join(unknown), file=sys.stderr)
            return 2

    if args.accents:
        print('%-18s %-34s %s' % ('key', 'haptic steps (ms)', 'sound accents (ms)'))
        for e in selected:
            if e['loop']:
                continue
            _, _, acc = render_effect(pack, e, 1)
            hs = ' '.join('%s@%d' % (k, round(t * 1000)) for k, t in haptic_times(e['haptic'])) or '-'
            print('%-18s %-34s %s' % (e['key'], hs, ' '.join('%d' % round(a * 1000) for a in acc) or '-'))
        return 0

    if not args.out:
        ap.error('--out is required (or use --list / --check / --accents)')
    out_dir = os.path.abspath(args.out)
    os.makedirs(out_dir, exist_ok=True)
    say = (lambda *a: None) if args.quiet else print
    say('pack %s (%s): %s' % (pack.name, pack.key, pack.blurb))
    say('%-22s %7s %7s %7s %6s' % ('file', 'ms', 'peak', 'loud', 'limit'))

    t_start, written, total_bytes, notes = time.time(), [], 0, []
    for e in selected:
        if e['loop']:
            tune = args.music or 'neutral'
            if tune == 'none':
                continue
            import music                      # only needed (and ffmpeg only needed) for music keys
            path = os.path.join(out_dir, e['key'] + '.m4a')
            info = music.build(tune, pack, path)
            size = os.path.getsize(path)
            total_bytes += size
            written.append(os.path.basename(path))
            say('%-22s %7.0f %7.1f %7.1f %6s  %s, %d bars at %g bpm, %.0f KB'
                % (os.path.basename(path), info['duration'] * 1000, info['peak_db'], info['loudness_db'], '',
                   tune, info['bars'], info['bpm'], size / 1000.0))
            if size > MUSIC_BUDGET_BYTES:
                notes.append('%s is %.0f KB, over the %.0f KB music budget' % (os.path.basename(path), size / 1000.0, MUSIC_BUDGET_BYTES / 1000.0))
            continue
        for i, base in enumerate(file_names(e), start=1):
            y, info, _ = render_effect(pack, e, i)
            path = os.path.join(out_dir, base + '.wav')
            dsp.write_wav(path, y)
            total_bytes += os.path.getsize(path)
            written.append(base + '.wav')
            flag = ''
            if info['peak_limited']:
                flag = '  peak-limited: %.1f dB under the loudness target' % (dsp.LOUDNESS_TARGET_DB - info['loudness_db'])
                notes.append('%s.wav is peak-limited (%.1f dB under target)' % (base, dsp.LOUDNESS_TARGET_DB - info['loudness_db']))
            say('%-22s %7.0f %7.1f %7.1f %6.1f%s' % (base + '.wav', info['duration'] * 1000, info['peak_db'],
                                                    info['loudness_db'], info['limit_db'], flag))

    # anything in the folder that the catalogue does not know about
    expected = set()
    for e in entries:
        expected.update(b + ('.m4a' if e['loop'] else '.wav') for b in file_names(e))
    strays = sorted(f for f in os.listdir(out_dir) if f.lower().endswith(('.wav', '.m4a', '.mp3', '.ogg')) and f not in expected)
    if strays:
        notes.append('not in the catalogue (delete or rename): %s' % ', '.join(strays))

    full = not args.only
    say('\n%d file(s), %.2f MB, %.1f s -> %s' % (len(written), total_bytes / 1e6, time.time() - t_start, out_dir))
    code = 0
    if full and total_bytes > PACK_BUDGET_BYTES:
        notes.append('pack is %.2f MB, over the %.1f MB budget' % (total_bytes / 1e6, PACK_BUDGET_BYTES / 1e6))
        code = 1
    for nline in notes:
        print('note: ' + nline)
    return code


if __name__ == '__main__':
    sys.exit(main())
