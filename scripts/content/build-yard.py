#!/usr/bin/env python3
"""Builds games/scrap-yard/game.json: the scrapyard ("salvage" mode; docs/design/yard-stage1.md 2.17
and 5.7; ECONOMY.md E1 to E29). Owner: the content engineer (label content).

    python3 scripts/content/build-yard.py            writes games/scrap-yard/game.json
    python3 scripts/content/build-yard.py --check    regenerates it in memory and compares it with the file
                                                     (exit 1 and the differing keys when they differ); writes nothing
    python3 scripts/content/build-yard.py --lint     the checks alone, on the content as it would be written
    options: --quiet (no table)   --json (the lint's findings as JSON on stdout)

THE ONE SOURCE OF THE GAME'S NUMBERS is src/config/salvage.content.ts (SALVAGE_CONTENT, the contract's
content types; its first numbers are the fourth numbers pass, scratchpad yard/proto/content4.json). This
script reads it through tsx and lays over it, in this order:
  1. the names register (scripts/content/yard/names.json, by id through strings.ts namesFromRegister,
     the crew's first names from crew-names.json as crew.<n>) -> salvage.names;
  2. the words that live in data (scripts/content/yard/text.json, the strings engineer's):
     grades.<id>.{name, short, long} onto salvage.grades, objects.<id>.{name, long} onto salvage.objects,
     lessons, partners and glossary as salvage.text (keys beginning with $ dropped);
  3. the goals (scripts/content/yard/goals.json, the hints engineer's): goals, dayOne, teach, verbatim
     (keys beginning with $ dropped; the ORDER is the content pass's and lives in that file);
  4. the keys the contract has no field for yet (SALVAGE_PENDING: levels.floor, levels.floorGrowth);
  5. the wiring engineer's top-level block (scripts/content/yard_top.py: app, soundPack, theme, strings,
     store; monetization.iap.products).
Every other top-level key of the existing game.json (economy, businesses, characters, story,
monetization, schemaVersion, id, mode) is kept as it is. game.json is never edited by hand.

Then two checks, and nothing is written unless both pass:
  * the contract's: SalvageSchema.parse and lintSalvage (src/config/schema.salvage.ts), through tsx;
  * this script's own lint: every thing's pieces and waste add up to its mass; every grade, sprite id and
    place a thing names exists (sprite ids against src/ui/salvage/art/manifest, places' sprites also
    against the world's aliases, src/ui/salvage/world/actors.ts PLACE_ART); every goal price is payable by
    the cash a normal player has then (the prototype's measure in content: heldAtCard and wait); prices
    rise along the goal list; a load's price equals k times its as-found value; trial loads are payable
    (at most the price of the purchase that opens their partner); the map lies inside the yard, no two
    footprints overlap, the hero frame holds its places on footprints, the tipping floor is within 12 m
    of the scales; no two rivals share a chip name; nothing is negative, zero where it divides, or
    unbounded.
The frozen TEST content (src/engine/fixtures/salvage.ts) is what the rules tests run on; this is what
the game ships.

STAGE 2 (yard-stage2.md 5.1, 5.2; content2, 26 November): the content carries stage 2's keys (the works,
the bank, the Yard sale, lots, the crate, ads, the mode's part of real money, the works layer of the
families and of the map). The checks of 5.2 that read the content alone are lintSalvage's (schema.salvage.ts
lintStage2: (1), (2), (5), (6), (7), (8), (11) without ΔI, (12), (13), (14) and B4's tool part of (4));
the map's (9: 3.6, the merged map) are yard_map.py's check_works; the build itself derives each plate's
`financeable` (true when its out holds a sellable grade). The checks that need what does not exist yet are
WARNINGS here, listed for Phase B (they never refuse until their inputs exist):
  (3)  a plate's price against max(works.floor, tau_r x ΔI) from bots/plates.json (the payback rule's table);
  (4)  a theta_r beyond a metal's sources at a person's pace (the bots);
  (7)  a pack's H against tau_4 from the shared products' list (monetization.iap.products, Phase B);
  (10) a text key the content names (a place's label, a plate's permit) missing from textKeys.ts, and a
       works-layer grade or thing without its words in text.json (strings2's, Phase B);
  (11) a plate's ΔI at its planned moment (the bots).
    python3 scripts/content/build-yard.py --selftest   the tests of these checks (the map's: yard_map.py --selftest)
"""
import json
import math
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yard_top  # noqa: E402  (the wiring engineer's top-level block)
import yard_map  # noqa: E402  (the content step's map checker, MAP.md M1 to M7)

GAME = os.path.join(ROOT, 'games', 'scrap-yard', 'game.json')
YARD = os.path.join(ROOT, 'scripts', 'content', 'yard')
TEXT = os.path.join(YARD, 'text.json')
GOALS = os.path.join(YARD, 'goals.json')
ACTORS = os.path.join(ROOT, 'src', 'ui', 'salvage', 'world', 'actors.ts')

READ = r"""
import fs from 'node:fs';
import { SALVAGE_CONTENT, SALVAGE_PENDING } from './src/config/salvage.content';
import { namesFromRegister } from './src/ui/salvage/strings';
const reg = JSON.parse(fs.readFileSync('scripts/content/yard/names.json', 'utf8'));
const crew = JSON.parse(fs.readFileSync('scripts/content/yard/crew-names.json', 'utf8'));
const names: Record<string, string> = { ...namesFromRegister(reg) };
(crew.names as string[]).forEach((n, i) => (names[`crew.${i}`] = n));
console.log(JSON.stringify({ content: SALVAGE_CONTENT, pending: SALVAGE_PENDING, names }));
"""

SCHEMA = r"""
import fs from 'node:fs';
import { SalvageSchema, lintSalvage } from './src/config/schema.salvage';
const raw = JSON.parse(fs.readFileSync(0, 'utf8'));
const r = SalvageSchema.safeParse(raw);
if (!r.success) { console.log(JSON.stringify({ errors: r.error.issues.map((i) => i.path.join('.') + ': ' + i.message) })); }
else { console.log(JSON.stringify({ errors: lintSalvage(r.data) })); }
"""


def tsx(code, stdin=None):
    r = subprocess.run(['npx', 'tsx', '-e', code], cwd=ROOT, input=stdin, capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        raise SystemExit('tsx failed:\n' + (r.stderr or r.stdout)[-3000:])
    return json.loads(r.stdout.strip().splitlines()[-1])


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def nodollar(v):
    if isinstance(v, dict):
        return {k: nodollar(x) for k, x in v.items() if not k.startswith('$')}
    if isinstance(v, list):
        return [nodollar(x) for x in v]
    return v


# ------------------------------------------------------------------------------------------ the merge
def build():
    src = tsx(READ)
    s = json.loads(json.dumps(src['content']))
    s['skeletonPlaceholder'] = False
    s['names'] = src['names']
    text = load(TEXT) if os.path.exists(TEXT) else {}
    for g, w in (text.get('grades') or {}).items():
        if g in s['grades']:
            for k in ('name', 'short', 'long'):
                if k in w:
                    s['grades'][g][k] = w[k]
    for o, w in (text.get('objects') or {}).items():
        if o in s['objects']:
            for k in ('name', 'long'):
                if k in w:
                    s['objects'][o][k] = w[k]
    blk = {k: nodollar(text[k]) for k in ('lessons', 'partners', 'glossary') if k in text}
    if blk:
        s['text'] = blk
    goals = nodollar(load(GOALS)) if os.path.exists(GOALS) else {}
    for k in ('goals', 'dayOne', 'teach'):
        if k in goals:
            s[k] = goals[k]
    for fam, extra in (src['pending'] or {}).items():
        s.setdefault(fam, {}).update(extra)
    # STAGE 2 (2.5.3): a plate's `financeable` is derived, never written by hand: its out holds a sellable grade
    grades = {**s['grades'], **(s.get('worksLayer') or {}).get('grades', {})}
    for p in ((s.get('works') or {}).get('plates') or {}).values():
        outs = [x for sh in (p.get('out') or {}).values() for x in sh] + [x for r in (p.get('recipes') or {}).values() for x in r['out']]
        p['financeable'] = any(g in grades for g, _ in outs)
    old = load(GAME)
    game = dict(old)
    game['salvage'] = s
    game = yard_top.apply(game)
    return game, manifest_ids()


MANIFEST_DIR = os.path.join(ROOT, 'src', 'ui', 'salvage', 'art', 'manifest')


def manifest_ids():
    """The art manifest's entry ids, read as TEXT from src/ui/salvage/art/manifest/*.ts (every quoted dotted id
    of the sprite families; the manifest imports Skia, which node cannot load). A test of the manifest
    (art/manifest/manifest.test.ts) holds the entries themselves."""
    ids = set()
    pat = re.compile(r"'((?:thing|piece|plant|prop|ui|lane|ground|person|carrier|vehicle|bay|stillage)(?:\.[a-z0-9]+)+)'")
    for fn in os.listdir(MANIFEST_DIR):
        if fn.endswith('.ts') and not fn.endswith('.test.ts'):
            ids |= set(pat.findall(open(os.path.join(MANIFEST_DIR, fn), encoding='utf-8').read()))
    return ids


# ------------------------------------------------------------------------------------------ own lint
def place_aliases():
    try:
        t = open(ACTORS, encoding='utf-8').read()
    except OSError:
        return set()
    m = re.search(r'PLACE_ART[^=]*=\s*\{(.*?)\n\};', t, re.S)
    return set(re.findall(r"'([a-z0-9.]+)':", m.group(1))) if m else set()


def lint(s, sprites):
    out = []
    S = set(sprites)
    G = s['grades']
    O = s['objects']
    M = s['map']
    P = M['points']
    alias = place_aliases()

    def bad(msg):
        out.append(msg)

    def num(path, v, pos=False):
        if not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v):
            bad(f'{path}: {v!r} is not a finite number')
        elif v < 0 or (pos and v == 0):
            bad(f'{path}: {v} must be {"positive" if pos else "non-negative"}')

    # things: mass kept, grades and sprites exist
    for oid, o in O.items():
        tot = sum(p[1] * p[2] for p in o['pieces']) + o['waste_g'] + (o.get('shell') or {}).get('g', 0)  # W9: a stripped shell weighed whole
        if tot != o['gross_g']:
            bad(f'objects.{oid}: pieces, shell and waste weigh {tot} g, gross_g {o["gross_g"]} g')
        for i, p in enumerate(o['pieces']):
            if p[0] not in G:
                bad(f'objects.{oid}.pieces[{i}]: grade {p[0]} does not exist')
            num(f'objects.{oid}.pieces[{i}].g', p[1], True)
            num(f'objects.{oid}.pieces[{i}].n', p[2], True)
            if len(p) > 3 and p[3] not in S:
                bad(f'objects.{oid}.pieces[{i}]: sprite {p[3]} is not in the art manifest')
        if o.get('whole') and o['whole'] not in G:
            bad(f'objects.{oid}.whole: grade {o["whole"]} does not exist')
        if o.get('sprite', 'thing.' + oid) not in S:
            bad(f'objects.{oid}.sprite {o.get("sprite")} is not in the art manifest')
        if o['tier'] > 0 and o['h'] <= 0:
            bad(f'objects.{oid}: tier {o["tier"]} with hardness {o["h"]} (cut time divides by nothing)')
        for k in ('w', 'd', 'h'):
            num(f'objects.{oid}.size.{k}', o['size'][k], True)
    for g, d in G.items():
        num(f'grades.{g}.pbar', d['pbar'], d['family'] != 'pm')
        for k in ('sprite', 'picto'):
            if d.get(k) and d[k] not in S:
                bad(f'grades.{g}.{k} {d[k]} is not in the art manifest')
        if d.get('bay'):
            if d['bay']['sprite'] not in S:
                bad(f'grades.{g}.bay.sprite {d["bay"]["sprite"]} is not in the art manifest')
            if d['bay'].get('place') and d['bay']['place'] not in P:
                bad(f'grades.{g}.bay.place {d["bay"]["place"]} is not a map point')
    for zid, z in s['zones'].items():
        for o in z['things']:
            if o not in O:
                bad(f'zones.{zid}: thing {o} does not exist')
        if z['tier'] > max(t['tier'] for t in s['tools'].values()):
            bad(f'zones.{zid}: tier {z["tier"]} needs a tool nobody can own')
    for o, _ in s['dropoff']['mix']:
        if o not in O:
            bad(f'dropoff.mix: thing {o} does not exist')
    num('dropoff.period', s['dropoff']['period'], True)
    for pid, pl in M['places'].items():
        if pid not in P:
            bad(f'map.places.{pid} is not a map point')
        if pl.get('sprite') and pl['sprite'] not in S and pl['sprite'] not in alias:
            bad(f'map.places.{pid}.sprite {pl["sprite"]} is neither a manifest entry nor a place alias of the world')
    for pid, p in s['partners'].items():
        if p.get('sprite') and p['sprite'] not in S:
            bad(f'partners.{pid}.sprite {p["sprite"]} is not in the art manifest')
        num(f'partners.{pid}.fill_s', p['fill_s'], True)
    for i in s['shop'] + s.get('dayOneList', []):
        if i['place'] not in P:
            bad(f'shop.{i["key"]}.place {i["place"]} is not a map point')
        num(f'shop.{i["key"]}.price', i['price'], True)

    # prices: payable and rising along the goal list
    order = s.get('goalOrder') or [i['key'] for i in s['shop']]
    byk = {i['key']: i for i in s['shop']}
    prev = 0
    for k in order:
        it = byk.get(k)
        if it is None:
            bad(f'goalOrder: {k} is not in shop')
            continue
        if it['price'] < prev:
            bad(f'shop.{k}: §{it["price"]} is below the goal before it (§{prev}); prices rise along the list (E25)')
        prev = it['price']
        w = it.get('wait')
        if w:
            sec = float(w.split()[0])
            if sec > 300:
                bad(f'shop.{k}: the normal player waits {sec:.0f} s for it (more than five minutes of play: not payable by then)')
    # loads: price = k x as-found value at usual prices; trial loads payable
    def found(contents):
        v = 0.0
        for o, n in contents.items():
            for p in O[o]['pieces']:
                g = p[0]
                if G[g]['family'] == 'pm':
                    continue
                v += n * p[1] / 1000 * p[2] * G[g]['pbar'] * G[g]['asFound']
        return v
    for pid, p in s['partners'].items():
        want = round(p['k'] * found(p['skip']))
        if abs(want - p['skipPrice']) > max(2, 0.01 * want):
            bad(f'partners.{pid}.skipPrice §{p["skipPrice"]} is not k x its as-found value (§{want})')
        opener = byk.get(p['opens'])
        if opener is None:
            bad(f'partners.{pid}.opens {p["opens"]} is not a goal purchase')
        elif p['trialPrice'] > max(opener['price'], 1):
            bad(f'partners.{pid}: trial load §{p["trialPrice"]} dearer than the purchase that opens it (§{opener["price"]})')
        if not 0 < p['k'] <= 1:
            bad(f'partners.{pid}.k {p["k"]} out of (0, 1]')
        # E20: nothing in a partner's load needs a tool the player cannot own when that partner opens
        upto = order[:order.index(p['opens']) + 1] if p['opens'] in order else order
        tiers = [1] + [s['tools'][k]['tier'] for k in upto if k in s['tools']]
        for o in list(p['trial']) + list(p['skip']):
            if o in O and O[o]['tier'] > max(tiers):
                bad(f'partners.{pid}: {o} needs tool tier {O[o]["tier"]}, the player owns at most {max(tiers)} when the partner opens (E20)')

    # the map: inside the yard, no overlaps, hero frame, tipping floor near the scales
    W, D = s['yard']['width'], s['yard']['depth']
    F = M['footprints']
    for k, f in F.items():
        x0, x1, y0, y1 = f['x'] - f['w'] / 2, f['x'] + f['w'] / 2, f['y'] - f['d'] / 2, f['y'] + f['d'] / 2
        if x0 < 0 or y0 < 0 or x1 > W or y1 > D:
            bad(f'map.footprints.{k} lies outside the yard ({x0:.1f}..{x1:.1f} x {y0:.1f}..{y1:.1f})')
    boxes = [(k, f['x'] - f['w'] / 2, f['x'] + f['w'] / 2, f['y'] - f['d'] / 2, f['y'] + f['d'] / 2) for k, f in F.items() if k not in ('start',)]
    boxes += [('wall@%g' % w['y'], w['x'] - w['w'] / 2, w['x'] + w['w'] / 2, w['y'] - w['d'] / 2, w['y'] + w['d'] / 2) for w in M['walls']]
    for p in s['props']:
        if p['kind'] == 'wall':
            continue
        r = p['r'] if p['shape'] == 'circle' else None
        hw, hd = (r, r) if r else (p['w'] / 2, p['d'] / 2)
        boxes.append(('prop ' + p['id'], p['x'] - hw, p['x'] + hw, p['y'] - hd, p['y'] + hd))
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            a, b = boxes[i], boxes[j]
            if {a[0], b[0]} == {'car', 'Z3'}:
                continue  # the car's spot is zone 3's car, inside its bed
            if a[1] < b[2] - 1e-9 and b[1] < a[2] - 1e-9 and a[3] < b[4] - 1e-9 and b[3] < a[4] - 1e-9:
                bad(f'map: {a[0]} overlaps {b[0]}')
    for k, (x, y) in P.items():
        if not (0 <= x <= W and 0 <= y <= D):
            bad(f'map.points.{k} ({x}, {y}) lies outside the yard')
    h = M.get('hero')
    if h:
        for k in h['places']:
            f = F.get(k)
            if f is None:
                bad(f'map.hero names {k}, which has no footprint')
                continue
            if f['x'] - f['w'] / 2 < h['x0'] - 1e-9 or f['x'] + f['w'] / 2 > h['x0'] + h['w'] + 1e-9 or f['y'] - f['d'] / 2 < h['y0'] - 1e-9 or f['y'] + f['d'] / 2 > h['y0'] + h['d'] + 1e-9:
                bad(f'map.hero: {k} stands outside the hero frame (S19)')
    if 'floor' in P:
        dmin = min(math.dist(P['floor'], P[q]) for q in ('scale', 'weighbridge') if q in P)
        if dmin > 12 + 1e-9:
            bad(f'map: the tipping floor is {dmin:.1f} m from the scales (at most 12)')
    # MAP.md M1 to M7 (the fix pass): scripts/content/yard_map.py
    for e in yard_map.check(s)[0]:
        bad(e)
    # stage 2 (yard-stage2.md 3.1.3, 3.6, 5.2 (9)): the merged map, the works layer over the first yard's
    for e in yard_map.check_works(s)[0]:
        bad(e)
    for k, v in M['lane'].items():
        num(f'map.lane.{k}', v, True)
    num('map.detour', M['detour'], True)

    # rivals: no two share a chip name; bounded growth
    names = s.get('names', {})
    chips = {}
    for r in s['rivals']['list']:
        chip = names.get(r['id'] + '.chip') or names.get(r['id'])
        if chip in chips:
            bad(f'rivals: {r["id"]} and {chips[chip]} share the chip name "{chip}"')
        chips[chip] = r['id']
        num(f'rivals.{r["id"]}.T0_t', r['T0_t'])
        g = r.get('g_day', r.get('g', 0))
        if not 0 <= g <= 1:
            bad(f'rivals.{r["id"]}: growth {g} a day is unbounded')

    # nothing that divides is zero; levels bounded
    for path, v in [('walk', s['walk']), ('truck.v', s['truck']['v']), ('crew.hand.v', s['crew']['hand']['v']), ('crew.hand.load', s['crew']['hand']['load']),
                    ('machines.crucible.pot', s['machines']['crucible']['pot']), ('machines.crucible.s_per_kg', s['machines']['crucible']['s_per_kg']),
                    ('merchant.round_s', s['merchant']['round_s']), ('floorRoom_kg', s['floorRoom_kg']), ('ladder.theta', s['ladder']['theta'])]:
        num(path, v, True)
    for t, d in s['tools'].items():
        num(f'tools.{t}.P', d['P'], True)
    for k, v in s['carriers'].items():
        num(f'carriers.{k}', v, True)
    for k in ('hand_stripper', 'stripper', 'bench'):
        num(f'machines.{k}.rate', s['machines'][k]['rate'], True)
    lv = s['levels']
    if lv.get('maxLevel', 20) > 50:
        bad('levels.maxLevel is over 50 (unbounded)')
    if lv['tau']['cap'] <= 0 or lv['tau']['growth'] < 1:
        bad('levels.tau: cap must be positive and growth at least 1')
    if s['ladder']['rung3']['t'] <= s['ladder']['rung2']['t']:
        bad('ladder: rung 3 must need more tonnes than rung 2')
    # The engine reads ladder.rungs when it is given (ladder.ts rungsOf); rung2/rung3 must say the same.
    for r in s['ladder'].get('rungs', []):
        for n, k in ((2, 'rung2'), (3, 'rung3')):
            if r['n'] == n and (r['t'] != s['ladder'][k]['t'] or r['range'] != s['ladder'][k]['range']):
                bad('ladder.rungs n %d (%s t, range %s) disagrees with ladder.%s (%s t, range %s)' % (n, r['t'], r['range'], k, s['ladder'][k]['t'], s['ladder'][k]['range']))
    return out


TEXT_KEYS = os.path.join(ROOT, 'src', 'engine', 'salvage', 'textKeys.ts')
PLATES_TABLE = os.path.join(ROOT, 'scripts', 'content', 'bots', 'plates.json')


def warnings(s, game):
    """5.2's checks whose inputs do not exist yet (see the head of this file): findings, never refusals."""
    out = []
    W = s.get('works') or {}
    plates = W.get('plates') or {}
    if not plates:
        return out
    tau = s.get('tau_h') or []
    # (3) the payback rule's prices
    if os.path.exists(PLATES_TABLE):
        tab = load(PLATES_TABLE)
        for pid, p in plates.items():
            row = (tab.get('plates') or tab).get(pid)
            r = int(str(p['gate']).replace('rung', '') or 3)
            if not row or 'dI' not in row:
                out.append('(3) bots/plates.json has no ΔI for plate %s' % pid)
                continue
            want = max(W['floor'], (tau[r - 1] or 0) * row['dI'])
            if abs(p['price'] - want) > max(1, 0.01 * want):
                out.append('(3) works.plates.%s.price §%s is not max(works.floor, tau_%d x ΔI) = §%.0f' % (pid, p['price'], r, want))
    else:
        out.append('(3) plate prices not checked: bots/plates.json (the payback rule\'s table, 2.6.4) does not exist yet: %d plates at first values' % len(plates))
    # (14) for the away caps: held at the first yard's length in Phase A (away.ts runLongerOf reads the next rung's cap at rung 3)
    top = (s.get('ladder') or {}).get('topRung')
    if top and len(s['awayCapByRung_h']) != top:
        out.append('(14) awayCapByRung_h has %d entries, ladder.topRung %d: stage 2 wants [0.5, 2, 4, 6, 8] once the away card stops at the top rung (away.ts runLongerOf, requests.md)' % (len(s['awayCapByRung_h']), top))
    # (4) and (11): what the bots measure
    out.append('(4) theta_r against each metal\'s sources at a person\'s pace: not measured (the bots, Phase B); the tool part of B4 is lintStage2\'s')
    out.append('(11) each plate\'s ΔI at its planned moment above 0: not measured (the bots, Phase B); the +5 % at p̄ is lintStage2\'s')
    # (7) the shared products' H
    prods = ((game.get('monetization') or {}).get('iap') or {}).get('products') or []
    packs = [p for p in prods if p.get('kind') == 'hoursOfIncome']
    if not packs:
        out.append('(7) no hoursOfIncome product in monetization.iap.products yet (Phase B, the shared schema): checked against ruling 9.1\'s fixed 2, 5, 10, 20 h')
    elif len(tau) >= 4 and tau[3]:
        for p in packs:
            if (p.get('value') or 0) >= tau[3]:
                out.append('(7) product %s gives %s h of I, not under tau_4 %s h' % (p.get('id'), p.get('value'), tau[3]))
    # (10) the words the content names
    keys = set(re.findall(r"'([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)'", open(TEXT_KEYS, encoding='utf-8').read())) if os.path.exists(TEXT_KEYS) else set()
    text = load(TEXT) if os.path.exists(TEXT) else {}
    named = set()
    for pl in ((s['map'].get('works') or {}).get('places') or {}).values():
        if pl.get('label'):
            named.add(pl['label'])
    for p in plates.values():
        if p.get('permit'):
            named.add(p['permit'])
    miss = sorted(k for k in named if k not in keys)
    if miss:
        out.append('(10) %d text key(s) the content names are not in textKeys.ts yet (strings2, Phase B): %s' % (len(miss), ', '.join(miss)))
    L = s.get('worksLayer') or {}
    for fam in ('grades', 'objects'):
        m = sorted(k for k in (L.get(fam) or {}) if k not in (text.get(fam) or {}))
        if m:
            out.append('(10) %d works-layer %s without words in text.json yet: %s' % (len(m), fam, ', '.join(m)))
    return out


def summary(s):
    rows = ['goal order and prices: ' + ', '.join('%s §%s' % (i['key'], f'{i["price"]:,}') for i in s['shop'])]
    rows.append('partners: ' + '; '.join('%s load %.0f kg §%s every %ds, trial §%s' % (p, d['skipMass_kg'], f'{d["skipPrice"]:,}', d['fill_s'], d['trialPrice']) for p, d in s['partners'].items()))
    rows.append('ladder: rung 2 at %s t, rung 3 at %s t; rivals %d; goals %d (+%d day one); names %d' % (
        s['ladder']['rung2']['t'], s['ladder']['rung3']['t'], len(s['rivals']['list']), len(s.get('goals', [])), len(s.get('dayOne', [])), len(s.get('names', {}))))
    return '\n'.join('  ' + r for r in rows)


def selftest():
    """Tests of this script's stage-2 checks: the derived `financeable`, and each Phase-B warning fires on the content
    that should raise it (lintSalvage's are tested in src/engine/salvage/contentChecks.test.ts, the map's by yard_map.py)."""
    import copy
    game, _ = build()
    s = game['salvage']
    fails = 0

    def expect(name, ok):
        nonlocal fails
        print('%s %s' % ('ok  ' if ok else 'FAIL', name))
        fails += 0 if ok else 1
    pl = s['works']['plates']
    expect('the baler is financeable (its out holds lib)', pl['baler']['financeable'] is True)
    expect('the analyser and the crane are not', pl['analyser']['financeable'] is False and pl['crane']['financeable'] is False)
    ws = warnings(s, game)
    expect('(3) warns while bots/plates.json is missing', os.path.exists(PLATES_TABLE) or any(w.startswith('(3)') for w in ws))
    c = copy.deepcopy(s)
    c['map']['works']['places']['shear']['label'] = 'place.noSuchKey'
    expect('(10) warns on a label textKeys.ts lacks', any('place.noSuchKey' in w for w in warnings(c, game)))
    c = copy.deepcopy(s)
    c['worksLayer']['grades']['zzz'] = dict(c['worksLayer']['grades']['ss'])
    expect('(10) warns on a works-layer grade without words', any('zzz' in w for w in warnings(c, game)))
    g2 = copy.deepcopy(game)
    g2.setdefault('monetization', {}).setdefault('iap', {})['products'] = [{'id': 'pack30', 'kind': 'hoursOfIncome', 'value': 30}]
    expect('(7) warns on a pack of 30 h against tau_4 22 h', any('pack30' in w for w in warnings(s, g2)))
    print('selftest: %d failed' % fails)
    return 1 if fails else 0


def main(argv):
    if '--selftest' in argv:
        return selftest()
    game, sprites = build()
    s = game['salvage']
    errs = tsx(SCHEMA, stdin=json.dumps(s))['errors']
    own = lint(s, sprites)
    if '--json' in argv:
        print(json.dumps({'schema': errs, 'lint': own}, indent=1))
    if errs or own:
        print('REFUSED: %d schema/lintSalvage finding(s), %d of this script\'s lint:' % (len(errs), len(own)))
        for e in errs:
            print('  [schema] ' + e)
        for e in own:
            print('  [lint] ' + e)
        return 1
    if '--quiet' not in argv:
        print(summary(s))
        for w in warnings(s, game):
            print('  [warning, Phase B] ' + w)
    if '--lint' in argv:
        print('lint: clean (SalvageSchema, lintSalvage and this script\'s own checks)')
        return 0
    text = json.dumps(game, indent=2, ensure_ascii=False) + '\n'
    if '--check' in argv:
        cur = open(GAME, encoding='utf-8').read()
        if cur == text:
            print('games/scrap-yard/game.json is what build-yard.py writes (schema, lintSalvage and lint clean)')
            return 0
        old = json.loads(cur)
        diff = [k for k in sorted(set(old) | set(game)) if old.get(k) != game.get(k)]
        sd = [k for k in sorted(set(old.get('salvage', {})) | set(s)) if old.get('salvage', {}).get(k) != s.get(k)]
        print('games/scrap-yard/game.json differs from what build-yard.py writes: top-level %s; salvage keys %s' % (', '.join(diff) or '(formatting)', ', '.join(sd) or '-'))
        return 1
    with open(GAME, 'w', encoding='utf-8') as f:
        f.write(text)
    print('wrote games/scrap-yard/game.json (salvage: the real content; schema, lintSalvage and lint clean)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
