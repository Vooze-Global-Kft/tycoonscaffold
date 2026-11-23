#!/usr/bin/env python3
"""Builds games/night-market/game.json: Lantern Row, a MERGE game (docs/design/market-design.md).

    python3 scripts/content/build-night.py            every gate of 8.3 on the five seeds; writes game.json
                                                     ONLY when every hard gate (M2) passes on every seed
    python3 scripts/content/build-night.py --check    the same, writes nothing (and skips the paired comparison; the
                                                     writer runs it: gates 4 and 12 as M30 (4) judges them)
    python3 scripts/content/build-night.py --tune [--budget 40] [--save] [--act 2.0]
                                                     the tuner: a search inside RANGES, knob by knob in the
                                                     order of 8.4 (with M27), toward the aims; --save writes
                                                     the result into TUNED below
    python3 scripts/content/build-night.py --placeholder
                                                     refreshes ONLY the merge block of the skeleton's placeholder
                                                     game.json (Decision M1: its texts keep the word PLACEHOLDER)
                                                     from the starting content and TUNED, with no gate, so the
                                                     placeholder follows the schema while the rules are built
    python3 scripts/content/build-night.py --listing  copies ONLY the words (the store listing, the products' texts,
                                                     the leaderboards) into game.json; no bot runs and the merge
                                                     block keeps the numbers of the last gated run
    python3 scripts/content/build-night.py --table    the worked tables of 2.12 and 3.3 and the season times
                                                     of 8.5 (seasons 1 to 10, active and passive, five seeds)
    python3 scripts/content/build-night.py --paired [--n 30]
                                                     M30 (4): the adversaries, the lazy and the deliver-only bot
                                                     against the active bot as paired differences over 30 seeds,
                                                     with the noise band (the active bot at act + 0.001 s)
    options: --act 2.0 (seconds per bot action: M30's reference; run 1.5 and 2.5 beside it)
             --procs 3 (parallel bot processes; at most 3 on the shared machine)   --set path=value (an extra override, repeatable)
             --hours 16 --seasons 10 --days 21 (the full run's length: ten seasons close in 16 h)
             --acts 1.5,2,2.5 (with --check: the check at each action time, M30 (1))

This script is the only source of the game's numbers (AGENTS.md: never hand-edit the table). The
names and starting values are src/config/merge.content.ts (MERGE_STARTING_CONTENT, read through
`npx tsx`); the tuned numbers are TUNED below (RANGES paths of src/config/schema.merge.ts); the
listing is scripts/content/night-store.json (every field not starting with "_"; its "products"
go to monetization.iap.products). Fields it does not own (app ids, ad units, assets, strings,
characters) are kept from the existing game.json, except each minder's portrait, which follows the content's beast (M38).

The bot is scripts/content/merge-bot.ts (src/engine/merge/bot.ts): every bot of 8.2 with M6 playing
the real rules. Coins enter only through the named sources on every trace (2.3; asserted here on
every trace of every seed before anything is written).
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GAME = os.path.join(ROOT, 'games/night-market/game.json')
STORE = os.path.join(ROOT, 'scripts/content/night-store.json')
BOT = os.path.join(ROOT, 'scripts/content/merge-bot.ts')
# Decision M30: the five named seeds are the CHECK (validate runs them); the tuner works on 15 others
# and never sees these; an aim is met when at least 13 of the 15 tuning seeds meet it (pass counts,
# never one median); a comparison between two bots is a paired difference over 30 seeds with the
# noise band beside it (`--paired`).
SEEDS = [12345, 4, 99, 7, 2026]
TUNE_SEEDS = list(range(101, 116))
PAIRED_SEEDS = list(range(201, 231))
PASS_NEEDED = 13
# Decision M37: five sources of coins (tickets, gift-box coin slots, the till, Basket sales, the away
# report); 'undo' and 'spend' are the Basket undo's take-back and purchases, never a gain.
SOURCES = {'ticket', 'gift', 'till', 'basket', 'away', 'undo', 'spend'}

# ---------------------------------------------------------------- the tuned numbers
# RANGES path -> value. Empty means the starting content as it is. `--tune --save` rewrites this block.
# TUNED-BEGIN
# The tuned numbers live in src/config/merge.content.ts as MERGE_TUNED (each with its starting value and the aim
# it serves); TUNED here is laid over them (empty: `--tune --save` writes a search's result here for review).
TUNED = {}
# TUNED-END

# ---------------------------------------------------------------- the knobs, in the order of 8.4 (with M27)
# Each group: the gates (row-name prefixes) that call for it, and its knobs (RANGES paths). A knob is
# moved only when RANGES has its path (the ranges are the rules package's: a missing one is reported,
# never invented). T is not a knob (M3); N equals s (M25).
KNOB_ORDER = [
    ('opening: shutter and gear costs', ('1 ', 'M3'), ['board.shutterBase', 'board.shutterGrowth', 'costs.gearBase', 'costs.gearGrowth']),
    ('stall windows: the stall table (M23)', ('2 ',), ['costs.stallOpen[0]', 'costs.stallOpen[1]', 'costs.stallOpen[2]', 'costs.stallOpen[3]', 'costs.stallOpen[4]']),
    ('minder share: Q, then the minder growth', ('8 minder', '9 '), ['minders.interval', 'costs.minderGrowth', 'costs.minderBase']),
    ('board full: the spare cells (M50)', ('5 ',), ['gear.spare']),
    ('fill time: gamma, then W', ('3 ',), ['tickets.gamma', 'tickets.outputWindow']),
    ('gift boxes (M24)', ('8 gift', '8 tickets'), ['gift.every', 'gift.coinPace']),
    ('stall levels and value per action (M27)', ('7 ', '15 ', '6 '), ['costs.stallLevelBase', 'costs.stallLevelGrowth', 'tickets.stretch']),
    ('seasons: the familiar-faces base and the step limit (M37: no purse; M40)', ('10 ',), ['seasons.familiarBase', 'seasons.maxSteps', 'costs.stallOpen[4]']),
    ('rerolling: the Not tonight cooldown', ('report: Not tonight',), ['tickets.notTonightCooldown']),
]


def arg(name, default=None):
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv) and not sys.argv[i + 1].startswith('--'):
            return sys.argv[i + 1]
        return 'true'
    return default


def sets():
    out = {}
    for i, a in enumerate(sys.argv):
        if a == '--set' and i + 1 < len(sys.argv):
            k, v = sys.argv[i + 1].split('=', 1)
            out[k] = json.loads(v)
    return out


def tsx(code):
    """Runs a TypeScript snippet with tsx and returns its stdout (JSON)."""
    r = subprocess.run(['npx', 'tsx', '-e', code], cwd=ROOT, capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        raise SystemExit('tsx failed:\n' + r.stderr[-2000:])
    return json.loads(r.stdout.strip().splitlines()[-1])


def starting_block():
    return tsx("import { MERGE_STARTING_CONTENT } from './src/config/merge.content'; import { MergeSchema } from './src/config/schema.merge';"
               "console.log(JSON.stringify(MergeSchema.parse(JSON.parse(JSON.stringify(MERGE_STARTING_CONTENT)))))")


def ranges():
    return {r['path']: r for r in tsx("import { RANGES } from './src/config/schema.merge'; console.log(JSON.stringify(RANGES))")}


def path_parts(p):
    return [int(x) if x.isdigit() else x for x in re.sub(r'\[(\d+)\]', r'.\1', p).split('.') if x != '']


def get_at(obj, p):
    for k in path_parts(p):
        obj = obj[k]
    return obj


def set_at(obj, p, v):
    parts = path_parts(p)
    for k in parts[:-1]:
        obj = obj[k]
    obj[parts[-1]] = v


_CONTENT_TUNED = None


def content_tuned():
    """MERGE_TUNED of src/config/merge.content.ts: the tuned numbers (RANGES path -> value)."""
    global _CONTENT_TUNED
    if _CONTENT_TUNED is None:
        _CONTENT_TUNED = tsx("import { MERGE_TUNED } from './src/config/merge.content'; console.log(JSON.stringify(MERGE_TUNED))")
    return _CONTENT_TUNED


def block_with(overrides):
    b = starting_block()
    for p, v in {**content_tuned(), **TUNED, **overrides}.items():
        set_at(b, p, v)
    return b


# ---------------------------------------------------------------- running the bot

def run_seed(seed, cfg_path, flags):
    cmd = ['npx', 'tsx', BOT, '--seed', str(seed), '--json', '--config', cfg_path] + flags
    env = dict(os.environ, NODE_OPTIONS=(os.environ.get('NODE_OPTIONS', '') + ' --max-old-space-size=2000').strip())
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, env=env, timeout=3600)
    line = (r.stdout.strip().splitlines() or [''])[-1]
    try:
        out = json.loads(line)
    except json.JSONDecodeError:
        out = {'crashed': True, 'error': (r.stderr or r.stdout)[-1500:]}
    out['seed'] = seed
    return out


def run_seeds(block, flags, procs, seeds=None):
    """The bot on the seeds (the five named ones by default) in parallel processes; returns their JSON lines in seed order."""
    seeds = SEEDS if seeds is None else seeds
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, dir=tempfile.gettempdir()) as f:
        json.dump(block, f)
        path = f.name
    try:
        with ThreadPoolExecutor(max_workers=procs) as ex:
            return list(ex.map(lambda s: run_seed(s, path, flags), seeds))
    finally:
        os.unlink(path)


def stopped(results):
    """Seeds whose run did not finish (a rule not built yet, or a crash), as messages."""
    out = []
    for r in results:
        if 'notBuilt' in r:
            out.append('seed %d: %s' % (r['seed'], r['error']))
        elif r.get('crashed') or 'rows' not in r:
            out.append('seed %d: the bot crashed: %s' % (r['seed'], str(r.get('error', '?'))[-600:]))
    return out


def coin_assertion(results):
    """2.3: coins enter only through the named sources, on every trace of every seed."""
    bad = []
    for r in results:
        for t in r.get('traces', []):
            if t is None:
                continue
            if t['unbooked']['count']:
                bad.append('seed %d, %s bot: %d cash change(s) booked under no source (%.0f c)' % (r['seed'], t['kind'], t['unbooked']['count'], t['unbooked']['amount']))
            extra = set(t['sources']) - SOURCES
            if extra:
                bad.append('seed %d, %s bot: coins from %s' % (r['seed'], t['kind'], ', '.join(sorted(extra))))
    return bad


def median(xs):
    s = sorted(xs)
    if not s:
        return float('nan')
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def across(results, act=None):
    """The across-seed aims: M3 at the median seed, M25's slowest / fastest season 1, M31's median season 1
    at 2.0 s, and M40's seasons 3 to 10 at 45 to 90 % of season 1 on the median seed."""
    rows = []
    ok = [r for r in results if 'summary' in r]
    if not ok:
        return rows
    mins = [median([r['summary']['useful'][i] for r in ok]) for i in range(1, 10)]
    rows.append(('M3 useful actions a minute at the median seed, minutes 1-9 (lowest)', '>= 20', min(mins), min(mins) >= 20))
    s1 = [r['summary']['season1'] for r in ok]
    if all(x is not None for x in s1):
        ratio = max(s1) / min(s1)
        rows.append(('10 season 1 Festival: slowest seed / fastest seed (M25)', '<= 1.6', round(ratio, 3), ratio <= 1.6))
    else:
        rows.append(('10 season 1 Festival: slowest seed / fastest seed (M25)', '<= 1.6', 'a seed never filled it', False))
    act = act if act is not None else ok[0].get('act')
    med = median([x / 60 if x is not None else float('inf') for x in s1])
    if act is None or abs(float(act) - 2.0) < 0.05:
        rows.append(('10 season 1 Festival at the median seed, 2.0 s an action (M31, min)', '110 to 190', round(med, 1), 110 <= med <= 190))
    # M40: each of seasons 3 to 10, on the median seed (the median across seeds of that season's ratio to season 1).
    later = []
    for i in range(2, 10):
        xs = []
        for r in ok:
            ss = r['summary'].get('seasons') or []
            if len(ss) > i and ss[0].get('festival'):
                f = ss[i].get('festival')
                xs.append(f / ss[0]['festival'] if f is not None else float('inf'))
        if len(xs) == len(ok):
            later.append(median(xs))
    if later:
        rows.append(('10 seasons 3-10 / season 1 at the median seed (M40)', '0.45 to 0.9 each', ' '.join('%.2f' % x for x in later), len(later) == 8 and all(0.45 <= x <= 0.9 for x in later)))
    return rows


# Rows the tuner's short run (4 h, no passive bot) cannot reach: left out of its loss (the check runs them).
QUICK_SKIP = ('10 season 2', '10 seasons 3-10', '10/11', '11 ')


def pass_counts(results, skip=()):
    """Per aim row: how many seeds meet it, and the mean relative distance of those that miss."""
    out = {}
    for r in results:
        for row in r.get('rows', []):
            if row['kind'] != 'aim' or row['name'].startswith(tuple(skip)):
                continue
            c = out.setdefault(row['name'], {'pass': 0, 'n': 0, 'dist': 0.0})
            c['n'] += 1
            if row['ok']:
                c['pass'] += 1
                continue
            num, lo, hi = row.get('num'), row.get('lo'), row.get('hi')
            d = 1.0
            if num is not None and lo is not None and num < lo:
                d = min(5.0, (lo - num) / ((hi - lo) if hi is not None and hi > lo else max(abs(lo), 1e-9)))
            elif num is not None and hi is not None and num > hi:
                d = min(5.0, (num - hi) / ((hi - lo) if lo is not None and hi > lo else max(abs(hi), 1e-9)))
            c['dist'] += d
    return out


def loss(results, skip=QUICK_SKIP):
    """M30 (3): for every aim, the seeds still missing to reach 13 of 15 (scaled to the seed count),
    plus a small pull from how far the missing seeds are; every hard miss weighs 10."""
    if any('rows' not in r for r in results):
        return float('inf')
    n = len(results)
    need = PASS_NEEDED * n / len(TUNE_SEEDS)
    tot = 0.0
    for name, c in pass_counts(results, skip).items():
        tot += max(0.0, need - c['pass']) + 0.1 * c['dist'] / max(1, n)
    for r in results:
        tot += 10.0 * sum(1 for row in r['rows'] if row['kind'] == 'hard' and not row['ok'])
    for name, aim, value, ok in across(results):
        if not ok and not name.startswith('10 seasons 3-10'):
            tot += 1.0
    return tot


def failing_prefixes(results):
    names = set()
    for r in results:
        for row in r.get('rows', []):
            if row['kind'] == 'aim' and not row['ok']:
                names.add(row['name'])
    return names


# ---------------------------------------------------------------- the tuner

def tune(act, procs, budget, extra):
    R = ranges()
    flags = ['--bot', 'all', '--hours', '4', '--days', '0', '--no-adversaries', '--determinism', '0', '--act', str(act)]
    current = dict(extra)
    base = block_with(current)
    t0 = time.time()
    res = run_seeds(base, flags, procs, TUNE_SEEDS)
    st = stopped(res)
    if st:
        raise SystemExit('the tuner cannot run: the bot did not finish\n  ' + '\n  '.join(st))
    best = loss(res)
    evals = 1
    print('start: loss %.3f (%.0f s)' % (best, time.time() - t0))
    missing = sorted({k for _, _, ks in KNOB_ORDER for k in ks if k not in R})
    if missing:
        print('knobs without a RANGES entry (not moved; requests.md asks MECHANICS for them): ' + ', '.join(missing))
    step = {p: 0.25 for p in R}
    improved = True
    while improved and evals < budget:
        improved = False
        fails = failing_prefixes(res)
        for group, gates, knobs in KNOB_ORDER:
            if not any(any(n.startswith(g) for g in gates) for n in fails):
                continue
            for p in knobs:
                if p not in R or evals >= budget:
                    continue
                lo, hi = R[p]['low'], R[p]['high']
                cur = current.get(p, get_at(base, p))
                for direction in (1, -1):
                    v = cur + direction * step[p] * (hi - lo)
                    v = min(hi, max(lo, v))
                    if isinstance(get_at(base, p), int) and float(get_at(base, p)).is_integer() and p in ('gear.spare', 'gift.every', 'tickets.spareCells', 'seasons.maxSteps'):
                        v = int(round(v))
                    if abs(v - cur) < 1e-12:
                        continue
                    trial = dict(current)
                    trial[p] = v
                    r2 = run_seeds(block_with(trial), flags, procs, TUNE_SEEDS)
                    evals += 1
                    l2 = loss(r2) if not stopped(r2) else float('inf')
                    print('  [%s] %s = %s: loss %.3f (best %.3f)' % (group, p, round(v, 6), l2, best))
                    if l2 < best - 1e-9:
                        best, current, res, base = l2, trial, r2, block_with(trial)
                        improved = True
                        break
                else:
                    step[p] /= 2
                if evals >= budget:
                    break
    print('\nbest loss %.3f after %d evaluations (%.0f s); pass counts on the %d tuning seeds:' % (best, evals, time.time() - t0, len(TUNE_SEEDS)))
    for name, c in sorted(pass_counts(res).items()):
        print('  %2d/%d %s%s' % (c['pass'], c['n'], name, '' if c['pass'] >= PASS_NEEDED * c['n'] / len(TUNE_SEEDS) else '   (open aim, M2/M30)'))
    print('TUNED = ' + json.dumps({**TUNED, **current}, indent=1, sort_keys=True))
    return {**TUNED, **current}, res


def save_tuned(tuned):
    src = open(__file__).read()
    body = 'TUNED = ' + json.dumps(tuned, indent=4, sort_keys=True) + '\n'
    src = re.sub(r'(# TUNED-BEGIN\n)(.*?)(# TUNED-END)', lambda m: m.group(1) + body + m.group(3), src, flags=re.S)
    open(__file__, 'w').write(src)
    print('saved TUNED into', os.path.relpath(__file__, ROOT))


# ---------------------------------------------------------------- the writer

def write_game(block):
    g = json.load(open(GAME)) if os.path.exists(GAME) else {}
    g['mode'] = 'merge'
    g['soundPack'] = None
    if block is not None:
        g['merge'] = block
        # M38 (lead's order 7): a minder's portrait follows the content's beast, whatever the old file said.
        beasts = {re.sub(r'[^a-z0-9]', '', ch['minder']['name'].lower()): ch['minder']['beast'] for ch in block.get('chains', []) if ch.get('minder')}
        for c in g.get('characters', []):
            if c.get('id') in beasts:
                c['portrait'] = 'beast:' + beasts[c['id']]
    else:
        print('  copying only the listing (the merge block keeps its numbers)')
    listing = json.load(open(STORE))
    store = g.setdefault('store', {})
    products = listing.get('products')
    store.update({k: v for k, v in listing.items() if not k.startswith('_') and k != 'products'})
    if not store.get('privacyPolicyUrl'):
        store['privacyPolicyUrl'] = 'https://example.com/privacy'
    mon = g.setdefault('monetization', {})
    mon.setdefault('ads', {'forceTestAds': True})
    mon['ads']['showBanner'] = False
    mon['ads']['interstitials'] = False
    if products is not None:
        mon['iap'] = {**mon.get('iap', {}), 'products': products}
    # Leaderboards on Game Center and Play Games (src/services/boards.ts): which lifetime counter each
    # ranks (src/engine/mergeMode.ts `scores`) and its Game Center id, created under the same id in App
    # Store Connect. The Play ids (`androidId`) and `playGamesProjectId` are given by the Play Console when
    # the boards are created there: the owner pastes them here, and until then Android has no board.
    g['leaderboards'] = {
        'boards': [
            {'key': 'tickets', 'metric': 'tickets', 'title': 'Tickets filled', 'iosId': 'lanternrow.tickets'},
            {'key': 'gold', 'metric': 'parades', 'title': 'Gold tickets', 'iosId': 'lanternrow.goldtickets'},
        ],
    }
    # Decision M1: the written file is no longer the placeholder. A kept text that the skeleton marked
    # "PLACEHOLDER: " loses the mark (its words stay for the lead to review); anything else still marked refuses.
    def unmark(x):
        if isinstance(x, dict):
            return {k: unmark(v) for k, v in x.items()}
        if isinstance(x, list):
            return [unmark(v) for v in x]
        if isinstance(x, str) and x.startswith('PLACEHOLDER: '):
            print('  kept text unmarked: ' + x[len('PLACEHOLDER: '):][:70])
            return x[len('PLACEHOLDER: '):]
        return x
    g = unmark(g)
    if 'PLACEHOLDER' in json.dumps(g):
        raise SystemExit('REFUSED: a text still says PLACEHOLDER after the listing was copied: ' + re.search(r'.{0,60}PLACEHOLDER.{0,60}', json.dumps(g)).group(0))
    json.dump(g, open(GAME, 'w'), indent=2, ensure_ascii=False)
    open(GAME, 'a').write('\n')
    print('wrote', os.path.relpath(GAME, ROOT), '(mode merge)')


def print_gates(results, act=None):
    hard, aims = [], []
    for r in results:
        for row in r.get('rows', []):
            if not row['ok'] and row['kind'] == 'hard':
                hard.append('seed %d: %s: %s (aim %s)' % (r['seed'], row['name'], row['value'], row['aim']))
            elif not row['ok'] and row['kind'] == 'aim':
                aims.append('seed %d: %s: %s (aim %s)' % (r['seed'], row['name'], row['value'], row['aim']))
    for name, aim, value, ok in across(results, act):
        if not ok:
            aims.append('all seeds: %s: %s (aim %s)' % (name, value, aim))
    return hard, aims


def gates(act, procs, extra, write):
    hours, seasons, days = arg('--hours', '16'), arg('--seasons', '10'), arg('--days', '21')
    block = block_with(extra)
    t0 = time.time()
    res = run_seeds(block, ['--bot', 'all', '--hours', hours, '--seasons', seasons, '--days', days, '--act', str(act)], procs)
    print('bot on seeds %s at %s s an action: %.0f s' % (', '.join(map(str, SEEDS)), act, time.time() - t0))
    st = stopped(res)
    if st:
        print('REFUSED: the bot did not finish on every seed, so no gate is known:\n  ' + '\n  '.join(st))
        return 1
    coin = coin_assertion(res)
    hard, aims = print_gates(res, act)
    print('aims on the %d check seeds (pass counts):' % len(res))
    for name, c in sorted(pass_counts(res).items()):
        print('  %d/%d %s' % (c['pass'], c['n'], name))
    for a in aims:
        print('  aim missed:  ' + a)
    for h in coin + hard:
        print('  HARD MISSED: ' + h)
    if write and '--no-paired' not in sys.argv:
        code, ph = paired(act, procs, extra, int(arg('--n', '30')))
        hard += ph
        for h in ph:
            print('  HARD MISSED: ' + h)
    if coin or hard:
        print('REFUSED: %d hard gate(s) missed (M2); the numbers of games/night-market/game.json are not written' % (len(coin) + len(hard)))
        if write:
            # The lead's order of 23 Nov: the listing (words, not numbers) is copied on every run whatever the gates say.
            write_game(None)
        return 1
    print('every hard gate passes on every seed (%d aims missed: warnings until the lead turns them into guards, M2)' % len(aims))
    if write:
        write_game(block)
    return 0


# ---------------------------------------------------------------- --paired (M30 (4))

def paired(act, procs, extra, n, quiet=False):
    """Returns (exit code, hard misses). Hard (M2 gates 4 and 12, judged as M30 (4) says): a habit's
    mean paired gain is not above +5 % beyond two standard errors; the deliver-only bot's mean ratio
    is at most 0.20."""
    block = block_with(extra)
    seeds = PAIRED_SEEDS[:n]
    res = run_seeds(block, ['--bot', 'compare', '--act', str(act)], procs, seeds)
    st = stopped([r for r in res if 'incomes' not in r])
    if st:
        print('the comparison did not finish:\n  ' + '\n  '.join(st))
        return 1, ['the paired comparison did not finish']
    hard = []

    def stat(xs):
        m = sum(xs) / len(xs)
        sd = (sum((x - m) ** 2 for x in xs) / max(1, len(xs) - 1)) ** 0.5
        return m, sd

    noise3 = [r['incomes']['noise3h'] / r['incomes']['active3h'] - 1 for r in res if r['incomes']['active3h'] > 0]
    noise1 = [r['incomes']['noise1h'] / r['incomes']['active1h'] - 1 for r in res if r['incomes']['active1h'] > 0]
    nm3, ns3 = stat(noise3)
    nm1, ns1 = stat(noise1)
    print('M30 (4): paired differences over %d seeds at %s s an action (mean of other / active - 1, sd; the noise band is the active bot at +0.001 s)\n' % (len(res), act))
    print('| Comparison | mean | sd | noise mean | noise sd | aim |\n|---|---|---|---|---|---|')
    for key, base_, noise, aim in (('lazy1h', 'active1h', (nm1, ns1), 'lazy 0.4 to 0.7 of active (gate 15)'), ('deliverFrom3', 'activeFrom3', (nm1, ns1), 'deliver-only <= 0.2 (gate 4)'),
                                   ('notTonight', 'active3h', (nm3, ns3), 'within 5 % (gate 12)'), ('hoardBoxes', 'active3h', (nm3, ns3), 'within 5 % (gate 12)'), ('sellBuyUndo', 'active3h', (nm3, ns3), 'within 5 % (gate 12)')):
        xs = [r['incomes'][key] / r['incomes'][base_] - 1 for r in res if r['incomes'].get(base_) and key in r['incomes']]
        if not xs:
            continue
        m, sd = stat(xs)
        se = sd / max(1, len(xs)) ** 0.5
        print('| %s / %s | %+.3f | %.3f | %+.3f | %.3f | %s |' % (key, base_, m, sd, noise[0], noise[1], aim))
        if key in ('notTonight', 'hoardBoxes', 'sellBuyUndo') and m - 2 * se > 0.05:
            hard.append('gate 12, habit %s: mean paired gain %+.3f (2 SE %.3f) over %d seeds is above +5 %%' % (key, m, 2 * se, len(xs)))
        if key == 'deliverFrom3' and 1 + m > 0.2:
            hard.append('gate 4, deliver-only bot: mean %.3f of the active bot from minute 3 to hour 1, over %d seeds (aim at most 0.20)' % (1 + m, len(xs)))
    return 0, hard


# ---------------------------------------------------------------- --table

def tables(act, procs, extra):
    block = block_with(extra)
    R = ranges()
    print('**Knobs (RANGES of src/config/schema.merge.ts; "start" is the starting content):**\n')
    print('| Knob | Range | Start | Shipped |\n|---|---|---|---|')
    start = starting_block()
    for p, r in R.items():
        try:
            s, v = get_at(start, p), get_at(block, p)
        except (KeyError, IndexError, TypeError):
            s, v = '-', '-'
        print('| %s | %s to %s | %s | %s%s |' % (p, r['low'], r['high'], s, v, '' if s == v else ' *'))
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump(block, f)
        path = f.name
    try:
        r = subprocess.run(['npx', 'tsx', BOT, '--seed', '12345', '--bot', 'active', '--hours', '4', '--table', '--quiet', '--act', str(act), '--config', path], cwd=ROOT, capture_output=True, text=True)
        out = r.stdout
        print(out[out.find('\n2.12'):] if '\n2.12' in out else (out + r.stderr)[-3000:])
    finally:
        os.unlink(path)
    res = run_seeds(block, ['--bot', 'all', '--hours', '40', '--seasons', '10', '--days', '21', '--no-adversaries', '--no-others', '--determinism', '0', '--act', str(act)], procs)
    st = stopped(res)
    if st:
        print('8.5: the bot did not finish:\n  ' + '\n  '.join(st))
        return 1
    print('\n**8.5 Season times (active bot, %s s an action; season clock in minutes: Tea / Steamer / Sweets / Noodles / Puffs | Festival), five seeds:**\n' % act)
    print('| Season | ' + ' | '.join('seed %d' % s for s in SEEDS) + ' |\n|---|' + '---|' * len(SEEDS))
    for i in range(10):
        cells = []
        for r in res:
            ss = r['summary']['seasons']
            if i < len(ss):
                s = ss[i]
                st_ = '/'.join('-' if x is None else '%.0f' % x for x in s['stalls'][1:])
                cells.append('%s \\| %s' % (st_, '-' if s['festival'] is None else '%.0f' % s['festival']))
            else:
                cells.append('-')
        print('| %d | %s |' % (i + 1, ' | '.join(cells)))
    print('\n**Passive bot (5 sessions of 8 min a day, the away ad):**\n')
    print('| Seed | Steamer day | Sweets day | Noodles day | Festival day | seasons by day 7 | by day 21 |\n|---|---|---|---|---|---|---|')
    for r in res:
        p = r['summary'].get('passive') or {}
        print('| %d | %s | %s | %s | %s | %s | %s |' % (r['seed'], p.get('steamer'), p.get('sweets'), p.get('noodles'), p.get('festival'), p.get('seasons7'), p.get('seasons21')))
    return 0


if __name__ == '__main__':
    if '--help' in sys.argv or '-h' in sys.argv:
        print(__doc__)
        sys.exit(0)
    act = float(arg('--act', '2.0'))
    procs = int(arg('--procs', '3'))  # the brief: at most 3 bot processes at a time on this shared machine
    extra = sets()
    if '--tune' in sys.argv:
        tuned, _ = tune(act, procs, int(arg('--budget', '40')), extra)
        if '--save' in sys.argv:
            save_tuned(tuned)
        sys.exit(0)
    if '--table' in sys.argv:
        sys.exit(tables(act, procs, extra))
    if '--paired' in sys.argv:
        code, hard = paired(act, procs, extra, int(arg('--n', '30')))
        for h in hard:
            print('  HARD MISSED: ' + h)
        sys.exit(code or (1 if hard else 0))
    if '--listing' in sys.argv:
        # Words only (the store listing, the products' texts, the leaderboards): the merge block and its
        # tuned numbers are left exactly as the last gated run wrote them.
        write_game(None)
        sys.exit(0)
    if '--placeholder' in sys.argv:
        g = json.load(open(GAME))
        if 'PLACEHOLDER' not in json.dumps(g):
            raise SystemExit('REFUSED: games/night-market/game.json is no longer the placeholder (build-night.py wrote it after the gate); run without --placeholder')
        g['merge'] = block_with(extra)
        json.dump(g, open(GAME, 'w'), indent=2, ensure_ascii=False)
        open(GAME, 'a').write('\n')
        print('refreshed the merge block of the placeholder', os.path.relpath(GAME, ROOT), '(no gate: it stays PLACEHOLDER)')
        sys.exit(0)
    if arg('--acts'):
        # M30 (1): the same check at several action times side by side; only 2.0 s may write.
        codes = {}
        for a in [float(x) for x in arg('--acts').split(',')]:
            print('\n==== %s s an action ====' % a)
            codes[a] = gates(a, procs, extra, write=False)
        sys.exit(codes.get(2.0, max(codes.values())))
    sys.exit(gates(act, procs, extra, write='--check' not in sys.argv))
