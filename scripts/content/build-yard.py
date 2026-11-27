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
     store), then the shop's products (salvage.iap.products, mirrored into monetization.iap.products at stage 2 only).
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
  (7)  a pack's H against tau_4 from the mode's product list (salvage.iap.products; the shared list holds it at stage 2 only);
  (10) a text key the content names (a place's label, a plate's permit) missing from textKeys.ts, and a
       works-layer grade or thing without its words in text.json (strings2's, Phase B);
  (11) a plate's ΔI at its planned moment (the bots).
    python3 scripts/content/build-yard.py --selftest   the tests of these checks (the map's: yard_map.py --selftest)

s2e-content (27 November; yard-stage2-economy.md, RULING2.md 27): (3) covers every SOLD plate, vehicle and tool (a gate within the
stage's top; a gate past the ladder is dark: defined, never sold) and adds THE ENTRY RULE, a refusal: a sold item whose plates.json
gain (dE) is under 2 % of the yard's income E0 at its moment (plates.json `E0`) is refused (2.6.4; ruling 27.2 b). The summary
prints each sold item's share, what is dark, and THE RUNG'S BILL for rungs 3 and 4 (the sold items' prices against REPORT9's
median purse at the rung's entry return, plates.json `purse`; section 0, ruling 27.8): a line for the lead that refuses nothing.
`financeable` is the content's mark (no longer derived); the products are fourteen (10- and 20-hour packs off, ruling 27.3 D8); the
supply check reads the stage's own rungs (works.rungs: rung 5's range 8, lead waits for stage 3).
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
// owner1 S1: the content as a build of its release plays it, AND the whole content (release.stage 2), so that stage 2's
// blocks are checked while a release keeps them dark.
const r = SalvageSchema.safeParse(raw);
const all = SalvageSchema.safeParse({ ...raw, release: { stage: 2 } });
if (!r.success || !all.success) { console.log(JSON.stringify({ errors: [...(r.success ? [] : r.error.issues), ...(all.success ? [] : all.error.issues)].map((i) => i.path.join('.') + ': ' + i.message) })); }
else { console.log(JSON.stringify({ errors: [...new Set([...lintSalvage(r.data), ...lintSalvage(all.data)])] })); }
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
    layer = s.get('worksLayer') or {}
    for g, w in (text.get('grades') or {}).items():
        for fam in (s['grades'], layer.get('grades') or {}):  # stage 2: the works layer's grades take their words too
            if g in fam:
                for k in ('name', 'short', 'long'):
                    if k in w:
                        fam[g][k] = w[k]
    for o, w in (text.get('objects') or {}).items():
        for fam in (s['objects'], layer.get('objects') or {}):
            if o in fam:
                for k in ('name', 'long'):
                    if k in w:
                        fam[o][k] = w[k]
    blk = {k: nodollar(text[k]) for k in ('lessons', 'partners', 'glossary') if k in text}
    if blk:
        s['text'] = blk
    goals = nodollar(load(GOALS)) if os.path.exists(GOALS) else {}
    for k in ('goals', 'dayOne', 'teach', 'stage2'):  # stage2: the stage's goal list (goals2, rules-money, 26 Nov)
        if k in goals:
            s[k] = goals[k]
    # s2f-copper (RULING2.md 27.2 b, 28.7 c): a stage-2 goal that names a plate or works item NOT SOLD at this stage (its gate past
    # the stage's top: dark) is not written, so a hall shipped only by its gate (the copper hall) needs one switch, its gate
    if 'stage2' in s:
        top = s['ladder'].get('topRung') or 3
        dark = {k for k, p in ((s.get('works') or {}).get('plates') or {}).items() if gate_n(p.get('gate')) > top}
        dark |= {i['key'] for i in ((s.get('worksLayer') or {}).get('shop') or []) if gate_n(i.get('gate')) > top}

        def names_dark(d):
            kind, _, a = (d.get('done') or '').partition(':')
            return d.get('buy') in dark or (kind in ('plate', 'commissioned', 'poured', 'owned') and a in dark)
        s['stage2'] = [d for d in s['stage2'] if not names_dark(d)]
    for fam, extra in (src['pending'] or {}).items():
        s.setdefault(fam, {}).update(extra)
    # s2e-content (yard-stage2-economy.md 2.14.2): a plate's or a vehicle's `financeable` is a MARK of the content (a machine or
    # vehicle that earns: the hook-lift and the five machines of the line and the halls), no longer derived from its out (the
    # analyser earns with no out of its own); lintStage2 refuses a mark on a tool or on what the stage does not sell.
    old = load(GAME)
    game = dict(old)
    game['salvage'] = s
    game = yard_top.apply(game)
    game = with_products(game)
    with_gains(game["salvage"])
    return game, manifest_ids()


# s2e-fix1 (RULING2.md 28.5 b, "one measure for machines too"): THE MEASURED GAIN each SOLD plate's, vehicle's and tool's price is
# made of is written into the content BESIDE ITS PRICE, as `gain_h` (§ an hour): bots/plates.json `plates.<id>.dE` onto
# works.plates.<id>, `items.<key>.dE` onto the worksLayer.shop item (never a works-kind shop item: a plate's lives on its plate).
# Both blocks are stage 2's (stageView strips works and worksLayer at release.stage 1). The engine's advice line and headroom read
# it (ladder.ts measuredGain); check (3) refuses a price that is not max(works.floor, tau_r x gain_h) to its rounding. A dark item
# gets none. Without bots/plates.json nothing is written (the replay's gain stands in the engine).
def with_gains(s):
    if not os.path.exists(PLATES_TABLE) or not (s.get('works') or {}).get('plates'):
        return
    tab = load(PLATES_TABLE)
    for kind, key, item, row in sold_items(s, tab):
        gain = None if not row else row.get('dE')
        if gain is not None:
            item['gain_h'] = gain


# STAGE 2 (2.15.1, B5, P9; content2-bots; s2-fix-content M1, rulings 19.9, 21.8 and 22 M1): the sixteen products are
# DEFINED in the mode's own content (salvage.iap.products in salvage.content.ts: ids, kinds, H by ruling 9.1, the owner's
# fallback prices); their titles and descriptions come from the names register (product.<id without the prefix>). The
# list is MIRRORED, entry for entry, into the shared monetization.iap.products ONLY when the content's release.stage is
# 2 or more: at release.stage 1 the shared list is EMPTY, so a stage-1 build asks the store for nothing, reads no
# listing and subscribes no purchase listener (grantsHoursOfIncome is false). monetization.ads.initOn is 'firstOffer'
# at both stages (ruling 13.7; the first yard makes no offer, so the ad SDK never starts). Everything else of
# monetization (ad unit ids, banner switches) is kept as it is. Tests and bots that need stage 2 build their
# configuration with src/engine/fixtures/stage2.ts, which mirrors the same block the same way.
PRODUCTS_N = 14
PACKS_LISTED_H = (2, 5)


def with_products(game):
    reg = load(os.path.join(ROOT, 'scripts', 'content', 'yard', 'names.json'))
    by = {e.get('productId'): e for e in reg.get('names', []) if isinstance(e, dict) and str(e.get('id', '')).startswith('product.')}
    s = game['salvage']
    iap = s.get('iap') or {}
    items = iap.get('products') or []
    # s2e-content (RULING2.md 27.3 D8): fourteen products: the looks, No ad videos, and the 2- and 5-hour packs (10 and 20 h off the list)
    if len(items) != PRODUCTS_N:
        raise SystemExit('salvage.iap.products holds %d products; the list has %d (2.15.1 less the 10- and 20-hour packs, ruling 27.3 D8)' % (len(items), PRODUCTS_N))
    hours = sorted(it.get('value') for it in items if it.get('kind') == 'hoursOfIncome')
    if hours != list(PACKS_LISTED_H):
        raise SystemExit('salvage.iap.products lists packs of %s hours; ruling 27.3 D8 lists %s' % (hours, list(PACKS_LISTED_H)))
    out = []
    for it in items:
        pid = it['id'].split('_', 1)[1]
        e = by.get(pid)
        if not e:
            raise SystemExit('names.json has no product.%s (2.15.1\'s sixteen products)' % pid)
        p = {'id': it['id'], 'kind': it['kind'], 'title': e['title'], 'description': e.get('descriptionApple') or e['title'], 'fallbackPrice': it['fallbackPrice']}
        if it.get('value') is not None:
            p['value'] = it['value']
        out.append(p)
    s = dict(s)
    s['iap'] = {**iap, 'products': out}
    game = dict(game)
    game['salvage'] = s
    stage = (s.get('release') or {}).get('stage', 2)
    mon = dict(game.get('monetization') or {})
    mon['iap'] = {**(mon.get('iap') or {}), 'products': [dict(p) for p in out] if stage >= 2 else []}
    mon['ads'] = {**(mon.get('ads') or {}), 'initOn': 'firstOffer'}
    game['monetization'] = mon
    return game


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
    # RULING2.md 21.6, 22 L2 and E4 (c): every rung's materials can be supplied, at a rate that reaches theta_r in its band
    out.extend(supply_check(s)[0])

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
    # s2-fix-works2 (RULING2 24, R2; L2 real physics): a lot kind's mass range is what such a real object weighs:
    # min <= max, min at least a tenth of the object's own gross mass, max at most what its partner's lorry can bring
    # (lots.lorry_kg when the content gives it; checked against it then).
    lots = s.get('lots') or {}
    objs = dict(O)
    objs.update(((s.get('worksLayer') or {}).get('objects')) or {})
    lorry = lots.get('lorry_kg')
    for i, kd in enumerate(lots.get('kinds') or []):
        mk = kd.get('mass_kg')
        if mk is None:
            continue
        o = objs.get(kd.get('obj'))
        if not o:
            bad('lots.kinds[%d].obj %r is not an object' % (i, kd.get('obj')))
            continue
        lo, hi = mk
        if lo > hi:
            bad('lots.kinds[%d] (%s).mass_kg: min %s > max %s' % (i, kd['obj'], lo, hi))
        if lo * 1000 < o['gross_g'] / 10:
            bad('lots.kinds[%d] (%s).mass_kg: min %s kg is under a tenth of the object\'s own %s kg' % (i, kd['obj'], lo, o['gross_g'] / 1000))
        if lorry is not None and hi > lorry:
            bad('lots.kinds[%d] (%s).mass_kg: max %s kg is over what its partner\'s lorry brings (lots.lorry_kg %s)' % (i, kd['obj'], hi, lorry))
    # s2e-rate (yard-stage2-economy.md 2.3 item 3; RULING2.md 27.4): rated income's one bounded factor a rung. A kappa outside
    # 0.85 to 1.15 means a term of I is wrong: the term is fixed in rate.ts, never hidden by the factor (refused here as in
    # the schema's superRefine, so that the script's own check names it even where the schema is not run).
    for i, k in enumerate(((s.get('rate') or {}).get('kappa')) or []):
        if i >= 2 and (not isinstance(k, (int, float)) or isinstance(k, bool) or not (0.85 <= k <= 1.15)):
            bad('rate.kappa[%d] (rung %d): %r is outside 0.85 to 1.15: a term of rated income is wrong; fix the term (rate.ts), not the factor (ruling 27.4)' % (i, i + 1, k))
    return out


# ------------------------------------------------------------------------------------------ the supply check
# RULING2.md 21.6 and 22 L2 with E4 (c) (s2-fix-content): NO RUNG ASKS FOR WHAT THE YARD CANNOT SUPPLY. For each rung r
# from 2 to the stage's top, the sources a yard working toward r has open (every shop item, plate and partner gated at
# r - 1 or below; the works layer from rung 4, as the works open at rung 3) are walked to the materials they can end as:
# a thing cut into its pieces (an assay grade once the analyser is open), sold whole, or fed whole to a plate; a grade
# sold as it is (not an intermediate) or through every plate, recipe and first-yard machine that takes it (the bench,
# the crucible, the strippers' cable yield), each material taking the routing that favours it (an upper bound on the
# routing). Rates: each open partner's skips (its `grows` loads averaged in as the rotation takes them, every plate
# owned) at the FAIR DRIVER'S guaranteed share, min(3600 / fill_s, ladder.supply.trips_h / (truck.fairAfter_trips + 1))
# skips an hour (a lower bound on the driver), and the drop-off's mix every period. Zones, lots and the rack (the
# boss's and the hands' stock) are not counted. REFUSED: (a) fewer materials with any supply than the rung's range
# (the lead cut: eight against rung 5's nine); (b) where ladder.supply.hours_h names the rung, fewer materials whose
# rate x hours reaches theta_r than its range (each short one named with its hours to theta).
def gate_n(gt):
    if gt is None: return 1
    return int(str(gt).replace('rung', '') or 1)

def supply_rates(s, r, trips_h, fair):  # noqa: C901
    """§ at p̄ an hour, by material, that the sources open to a yard working toward rung r can supply at most."""
    L = s.get('worksLayer') or {}
    layer = r >= 4 and bool(L)
    G = dict(s['grades']); O = dict(s['objects']); P = dict(s['partners'])
    if layer:
        G.update(L.get('grades') or {}); O.update(L.get('objects') or {}); P.update(L.get('partners') or {})
    shop = {i['key']: i for i in s['shop'] + ((L.get('shop') or []) if layer else [])}
    openk = {k for k, i in shop.items() if gate_n(i.get('gate')) <= r - 1}
    plates = {k: p for k, p in ((s.get('works') or {}).get('plates') or {}).items() if layer and gate_n(p.get('gate')) <= r - 1}
    edges = {}  # input id (grade or object) -> list of out lists [(grade, frac)]
    def add(i, outs): edges.setdefault(i, []).append(outs)
    for pid, p in plates.items():
        for i, outs in (p.get('out') or {}).items(): add(i, [(g, f) for g, f in outs])
        for rc in (p.get('recipes') or {}).values():
            for i in rc['in']: add(i, [(g, f) for g, f in rc['out']])
    M = s['machines']
    if 'bench' in openk and M.get('bench', {}).get('out'): add('mot', [(g, f) for g, f in M['bench']['out']])
    for rc in (M.get('crucible', {}).get('recipes') or {}).values():
        ins = rc[0] if isinstance(rc[0], list) else [rc[0]]
        for i in ins: add(i, [(rc[1], rc[2])])
    add('cab', [('no2', s['cable']['yield_'])])  # the strippers (the hand stripper needs no purchase)
    assay = 'analyser' in plates
    memo = {}
    def best(i, m, d=0):
        """§ at p̄ per gram of i (grade or object) that can end as material m."""
        k = (i, m)
        if k in memo: return memo[k]
        if d > 8: return 0.0
        v = 0.0
        gr = G.get(i)
        if gr and gr.get('material') == m and gr.get('kind') != 'intermediate':
            v = gr['pbar'] / 1000
        for outs in edges.get(i, []):
            v = max(v, sum(f * best(g, m, d + 1) for g, f in outs))
        memo[k] = v
        return v
    def thing(o, m):
        ob = O[o]
        cut = 0.0
        for pc in ob['pieces']:
            b = best(pc[0], m)
            if assay and len(pc) > 4 and pc[4]: b = max(b, best(pc[4], m))
            cut += pc[1] * pc[2] * b
        sh = ob.get('shell')
        if sh and sh.get('grade'): cut += sh['g'] * best(sh['grade'], m)
        whole = ob['gross_g'] * best(ob['whole'], m) if ob.get('whole') else 0.0
        plate = ob['gross_g'] * best(o, m) if o in edges else 0.0
        return max(cut, whole, plate)
    mats = []
    for g in G.values():
        if g.get('material') and g['material'] not in mats: mats.append(g['material'])
    R = {m: 0.0 for m in mats}
    for pid, p in P.items():
        if p.get('opens') not in openk: continue
        rate = min(3600 / p['fill_s'], trips_h / (fair + 1)) if trips_h else 3600 / p['fill_s']
        bodies = [gr for gr in (p.get('grows') or []) if gr['body'] != 'skip' and gr['needs'] in plates]
        skip = dict(p['skip'])
        for gr in p.get('grows') or []:
            if gr['body'] == 'skip' and gr['needs'] in plates:
                for o, n in gr['contents'].items(): skip[o] = skip.get(o, 0) + n
        loads = [skip] + [gr['contents'] for gr in bodies]
        for m in mats:
            R[m] += rate / len(loads) * sum(n * thing(o, m) for ld in loads for o, n in ld.items() if o in O)
    d = s['dropoff']
    for m in mats:
        R[m] += 3600 / d['period'] * sum(sh * thing(o, m) for o, sh in d['mix'] if o in O)
    return R, mats

def stage_rungs(s):
    """The rungs a yard at stage 2 plays, by number: ladder.rungs (and rung2/rung3) with the stage's own (works.rungs, read
    from the works' opening, schema.salvage.ts withWorksLayer) in place of the same numbers (s2e-content)."""
    L = s['ladder']
    rungs = {x['n']: dict(x) for x in L.get('rungs') or []}
    rungs.setdefault(2, {'n': 2, **L['rung2']})
    rungs.setdefault(3, {'n': 3, **L['rung3']})
    for x in ((s.get('works') or {}).get('rungs') or []):
        rungs[x['n']] = {**rungs.get(x['n'], {}), **x}
    return rungs


def theta_of(s, r):
    L = s['ladder']
    if r <= 3 or not L.get('thetaShare'):
        return L['theta']
    T = stage_rungs(s).get(r, {}).get('t', 0)
    return max(L['theta'], L['thetaShare'] * T * L.get('thetaPerT', 1200))


def supply_check(s):
    """The refusals of the supply check (above), and a table row a rung for the summary."""
    out, rows = [], []
    L = s['ladder']
    sup = L.get('supply') or {}
    trips = sup.get('trips_h')
    fair = (s.get('truck') or {}).get('fairAfter_trips')
    hours = sup.get('hours_h') or []
    rungs = stage_rungs(s)  # s2e-content: the stage's own rungs 4 and 5 (works.rungs: rung 5's range 8, lead waits for stage 3)
    for r in range(2, (L.get('topRung') or 3) + 1):
        want = rungs.get(r, {}).get('range', 0)
        R, mats = supply_rates(s, r, trips if fair else None, fair or 0)
        have = [m for m in mats if R[m] > 0]
        if len(have) < want:
            out.append('supply: rung %d asks for %d materials; the plates and partners open below it supply only %d (%s; none: %s) (RULING2.md 21.6, 22 L2)' % (
                r, want, len(have), ', '.join(have), ', '.join(m for m in mats if R[m] <= 0) or '-'))
            continue
        h = hours[r - 1] if r - 1 < len(hours) else None
        th = theta_of(s, r)
        if h:
            reach = [m for m in mats if R[m] * h >= th]
            rows.append('rung %d: %d of %d materials reach theta %s within %s h (slowest %s)' % (r, len(reach), want, f'{th:,.0f}', h, ', '.join('%s %.1f h' % (m, th / R[m]) for m in sorted(have, key=lambda m: -th / R[m])[:2])))
            if len(reach) < want:
                short = sorted((m for m in mats if m not in reach), key=lambda m: R[m], reverse=True)
                out.append('supply: rung %d asks for %d materials at theta §%s each within %s h of its band; at the fair driver\'s rate only %d reach it (short: %s) (RULING2.md 22 E4 (c))' % (
                    r, want, f'{th:,.0f}', h, len(reach), ', '.join('%s §%.0f/h, %.0f h to theta' % (m, R[m], th / R[m] if R[m] else float('inf')) for m in short)))
        else:
            rows.append('rung %d: %d materials supplied, %d asked (rate not checked)' % (r, len(have), want))
    return out, rows


TEXT_KEYS = os.path.join(ROOT, 'src', 'engine', 'salvage', 'textKeys.ts')
PLATES_TABLE = os.path.join(ROOT, 'scripts', 'content', 'bots', 'plates.json')


ENTRY_SHARE = 0.02   # yard-stage2-economy.md 2.6.4, RULING2.md 27.2 (b): a sold item's measured gain is at least 2 % of the yard's income
ENTRY_SEED = -0.01   # ... and no seed below -1 % (printed by entry_rows: plates.json holds the yard's E0 as a mean only)
DARK_PAST = 9        # a gate past the ladder's nine rungs: not sold at this stage (salvage.content.ts DARK)


def sold_items(s, tab):
    """(kind, key, the content's item, its plates.json row) of every plate and works-layer shop item SOLD at this stage: its gate
    a rung within the stage's top (a gate past the ladder is dark: defined, never sold; s2e-content)."""
    top = s['ladder'].get('topRung') or 3
    out = []
    for pid, p in ((s.get('works') or {}).get('plates') or {}).items():
        if gate_n(p.get('gate')) <= top:
            out.append(('plate', pid, p, (tab.get('plates') or {}).get(pid)))
    for it in ((s.get('worksLayer') or {}).get('shop') or []):
        if it.get('kind') != 'works' and gate_n(it.get('gate')) <= top:
            out.append((it['kind'], it['key'], it, (tab.get('items') or {}).get(it['key'])))
    return out


def entry_rows(s):
    """What the build check prints for the lead (s2e-content): each sold item's gain against its E0 (the entry rule; the seed clause
    is printed, not refused, as plates.json holds E0 as a mean), what is dark, and THE RUNG'S BILL (yard-stage2-economy.md section 0;
    ruling 27.8): for rungs 3 and 4 the sum of the sold machines', vehicles' and tools' prices against REPORT9's median purse at the
    rung's entry return (plates.json `purse`). It refuses nothing: it is the lead's line. Levels are not in the bill (they are priced
    on the player's own state, not by the content)."""
    if not os.path.exists(PLATES_TABLE):
        return []
    tab = load(PLATES_TABLE)
    rows = []
    sold = sold_items(s, tab)
    for kind, key, item, row in sold:
        if not row or not row.get('E0'):
            continue
        per = row.get('perSeed') or []
        low = min(per) if per else None
        flag = '' if low is None or low >= ENTRY_SEED * row['E0'] else '  (a seed at %.2f %%: under the design\'s -1 %% seed clause, for the lead)' % (100 * low / row['E0'])
        rows.append('entry %s %s: dE §%s = %.2f %% of E0 §%s (at least 2 %%); price §%s%s' % (kind, key, f'{row["dE"]:,}', 100 * row['dE'] / row['E0'], f'{row["E0"]:,}', f'{item["price"]:,}', flag))
    top = s['ladder'].get('topRung') or 3
    dark = [k for k, p in ((s.get('works') or {}).get('plates') or {}).items() if gate_n(p.get('gate')) > top]
    dark += [i['key'] for i in ((s.get('worksLayer') or {}).get('shop') or []) if i.get('kind') != 'works' and gate_n(i.get('gate')) > top]
    rows.append('dark (defined, gated past the ladder, never sold): ' + (', '.join(dark) or '-'))
    purse = tab.get('purse') or {}
    for r in (3, 4):
        its = [(key, item['price']) for kind, key, item, row in sold if gate_n(item.get('gate')) == r]
        bill = sum(p for _, p in its)
        pr = (purse.get('r%d' % r) or {}).get('median')
        rows.append('the rung-%d bill: §%s (%s) against REPORT9\'s median purse at the rung\'s entry return §%s: %s' % (
            r, f'{bill:,}', ' + '.join('%s §%s' % (k, f'{p:,}') for k, p in its) or '-', f'{pr:,}' if pr else '?',
            ('%.2f x the purse' % (bill / pr)) if pr else 'no purse in plates.json'))
    return rows


def warnings(s, game):
    """5.2's checks whose inputs do not exist yet (see the head of this file): findings, never refusals."""
    out = []
    W = s.get('works') or {}
    plates = W.get('plates') or {}
    if not plates:
        return out
    tau = s.get('tau_h') or []
    # (3) the payback rule's prices; s2e-content: of every SOLD plate, vehicle and tool (a sold machine, vehicle or tool),
    # and (ENTRY) its measured gain against 2 % of the yard's income at its moment (yard-stage2-economy.md 2.6.4; ruling 27.2 b)
    if os.path.exists(PLATES_TABLE):
        tab = load(PLATES_TABLE)
        for kind, key, item, row in sold_items(s, tab):
            r = gate_n(item.get('gate'))
            # RULING2.md 19.1: the measured gain dE (what the yard earns more an hour), else the old ΔI
            gain = None if not row else row.get('dE', row.get('dI'))
            if gain is None:
                out.append('(3) bots/plates.json has no dE for %s %s' % (kind, key))
                continue
            # s2e-fix1 (ruling 28.5 b): the gain the price is made of is IN THE CONTENT beside it (gain_h, with_gains), and is
            # plates.json's; the price is checked against THAT gain
            if item.get('gain_h') != gain:
                out.append('(3) %s %s: the content\'s measured gain gain_h %s is not bots/plates.json\'s dE %s (build-yard.py writes it)' % (kind, key, item.get('gain_h'), gain))
            t_r = tau[r - 1] if r - 1 < len(tau) else None
            want = max(W['floor'], (t_r or 0) * item.get('gain_h', gain))
            if abs(item['price'] - want) > max(1, 0.01 * want):
                out.append('(3) %s %s: price §%s is not max(works.floor, tau_%d x gain_h) = §%.0f' % (kind, key, item['price'], r, want))
            e0 = row.get('E0')
            if not e0:
                out.append('(3) ENTRY: bots/plates.json has no E0 (the yard\'s income at its moment) for %s %s' % (kind, key))
            elif gain < ENTRY_SHARE * e0:
                out.append('(3) ENTRY: %s %s is sold, but its measured gain §%s an hour is %.2f %% of the yard\'s E0 §%s at its moment (at least %d %%, yard-stage2-economy.md 2.6.4, ruling 27.2 b)' % (kind, key, gain, 100 * gain / e0, e0, round(100 * ENTRY_SHARE)))
    else:
        out.append('(3) plate prices not checked: bots/plates.json (the payback rule\'s table, 2.6.4) does not exist yet: %d plates at first values' % len(plates))
    # (14) for the away caps: now a refusal of the schema (s2a-fix: away.ts runLongerOf stops at the stage's top rung)
    # 2.10.1's fallback lot: none (the lead's ruling 6 of 26 Nov 09:50: lots wait for a kind the yard can open)
    # (4) and (11): what the bots measure
    out.append('(4) theta_r against each metal\'s sources at a person\'s pace: not measured (the bots, Phase B); the tool part of B4 is lintStage2\'s')
    out.append('(11) each plate\'s ΔI at its planned moment above 0: not measured (the bots, Phase B); the +5 % at p̄ is lintStage2\'s')
    # (7) the packs' H (M1: the mode's own list, salvage.iap.products; the shared list holds it at stage 2 only)
    prods = (s.get('iap') or {}).get('products') or []
    packs = [p for p in prods if p.get('kind') == 'hoursOfIncome']
    if not packs:
        out.append('(7) no hoursOfIncome product in salvage.iap.products: checked against ruling 9.1\'s fixed 2, 5, 10, 20 h')
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
    rows += ['supply ' + r for r in supply_check(s)[1]]
    rows += entry_rows(s)
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
    # s2e-content (2.14.2): financeable is the content's mark: the hook-lift and the machines sold that earn; never a tool, never a dark plate
    sold = {k for k, p in pl.items() if gate_n(p['gate']) <= (s['ladder'].get('topRung') or 3)}
    copper = {'copper'} & sold  # s2f-copper: the copper refining hall, sold while its gate sells it (RULING2.md 27.5, 28.7 c)
    expect('the analyser, the shredder and the halls are marked financeable', all(pl[k].get('financeable') is True for k in ('analyser', 'shredder', 'induction', 'rotary', *copper)))
    expect('no dark plate is marked financeable', not any(p.get('financeable') for k, p in pl.items() if k not in sold))
    shop = {i['key']: i for i in s['worksLayer']['shop']}
    expect('the three-axle hook-lift is financeable, the plasma cutter (a tool) is not', shop['truckBridge'].get('financeable') is True and not shop['plasma'].get('financeable'))
    # s2e-content (2.6.4, 2.7 to 2.9; ruling 27.2 b, 27.3 D1, D2): what is sold, and what is dark
    expect('sold at stage 2: the analyser, shredder, induction and rotary; the hook-lift and the plasma',
           sold == {'analyser', 'shredder', 'induction', 'rotary'} | copper and {k for k, i in shop.items() if i['kind'] != 'works' and gate_n(i['gate']) <= 5} == {'truckBridge', 'plasma'})
    # s2e-rate (ruling 27.4): a rung's kappa outside 0.85 to 1.15 is refused by this script's lint; the shipped kappas pass
    k = copy.deepcopy(s)
    expect('rate.kappa: the shipped factors pass', not any(e.startswith('rate.kappa') for e in lint(k, [])))
    k['rate']['kappa'][3] = 1.2
    expect('rate.kappa: a rung-4 kappa of 1.2 is refused', any(e.startswith('rate.kappa[3]') for e in lint(k, [])))
    k['rate']['kappa'][3] = 0.84
    expect('rate.kappa: a rung-4 kappa of 0.84 is refused', any(e.startswith('rate.kappa[3]') for e in lint(k, [])))
    tab = load(PLATES_TABLE)
    c = copy.deepcopy(s)
    c['works']['plates']['baler']['gate'] = 'rung3'
    c['works']['plates']['baler']['price'] = 3000
    expect('ENTRY: the baler sold (gain 0.6 % of E0) is refused', any(w.startswith('(3) ENTRY') and 'baler' in w for w in warnings(c, game)))
    c = copy.deepcopy(s)
    c['worksLayer']['shop'] = [dict(i, gate='rung3', price=3000) if i['key'] == 'forklift' else i for i in c['worksLayer']['shop']]
    expect('ENTRY: the forklift sold (a negative gain) is refused', any(w.startswith('(3) ENTRY') and 'forklift' in w for w in warnings(c, game)))
    expect('ENTRY: the shipped content passes', not any(w.startswith('(3)') for w in warnings(s, game)))
    # s2e-fix1 (ruling 28.5 b): every sold item carries the measured gain its price is made of; nothing dark carries one
    rows = {key: (item, row) for kind, key, item, row in sold_items(s, tab)}
    expect('28.5 b: every sold plate, vehicle and tool carries gain_h = plates.json dE', bool(rows) and all(item.get('gain_h') == row['dE'] for item, row in rows.values()))
    expect('28.5 b: no dark plate or item carries gain_h', not any('gain_h' in p for k, p in pl.items() if k not in sold) and not any('gain_h' in i for k, i in shop.items() if k not in rows))
    c = copy.deepcopy(s)
    c['works']['plates']['induction']['price'] = round(c['works']['plates']['induction']['price'] * 1.05)
    expect('28.5 b: a price 5 % off tau_r x gain_h is refused', any(w.startswith('(3) plate induction: price') for w in warnings(c, game)))
    c = copy.deepcopy(s)
    c['worksLayer']['shop'] = [dict(i, gain_h=i['gain_h'] + 1) if i['key'] == 'plasma' else i for i in c['worksLayer']['shop']]
    expect('28.5 b: a gain_h that is not plates.json\'s is refused', any(w.startswith('(3) tool plasma: the content') for w in warnings(c, game)))
    expect('the rung bill is printed for rungs 3 and 4 (it refuses nothing)', sum(1 for r in entry_rows(s) if r.startswith('the rung-')) == 2 and bool(tab.get('purse')))
    ws = warnings(s, game)
    expect('(3) warns while bots/plates.json is missing', os.path.exists(PLATES_TABLE) or any(w.startswith('(3)') for w in ws))
    c = copy.deepcopy(s)
    c['map']['works']['places']['shredder']['label'] = 'place.noSuchKey'  # s2e-join: the shear's plot is not drawn at stage 2 (D6)
    expect('(10) warns on a label textKeys.ts lacks', any('place.noSuchKey' in w for w in warnings(c, game)))
    c = copy.deepcopy(s)
    c['worksLayer']['grades']['zzz'] = dict(c['worksLayer']['grades']['ss'])
    expect('(10) warns on a works-layer grade without words', any('zzz' in w for w in warnings(c, game)))
    c = copy.deepcopy(s)
    c['iap']['products'] = [{'id': 'yard_pack40', 'kind': 'hoursOfIncome', 'value': 40, 'fallbackPrice': '$9.99'}]
    expect('(7) warns on a pack of 40 h against tau_4 36 h', any('pack40' in w for w in warnings(c, game)))
    # M1 (rulings 19.9, 21.8, 22 M1): the shared list is empty at release.stage 1 and mirrors the mode's block at stage 2
    mon = (game.get('monetization') or {}).get('iap') or {}
    stage = (s.get('release') or {}).get('stage', 2)
    expect('M1: the shared product list is empty at release.stage 1 (it holds the mode\'s %d at stage 2)' % len(s['iap']['products']),
           (mon.get('products') == []) if stage < 2 else (mon.get('products') == s['iap']['products']))
    g1 = copy.deepcopy(game)
    g1['salvage']['release'] = {'stage': 2}
    g1['monetization']['iap']['products'] = []
    expect('M1: at release.stage 2 the build mirrors the fourteen products', with_products(g1)['monetization']['iap']['products'] == s['iap']['products'])
    expect('D8: the 2- and 5-hour packs are listed, the 10- and 20-hour ones are not', sorted(p.get('value') for p in s['iap']['products'] if p['kind'] == 'hoursOfIncome') == [2, 5])
    g1['salvage']['release'] = {'stage': 1}
    expect('M1: at release.stage 1 the build mirrors none; ads.initOn stays firstOffer',
           with_products(g1)['monetization']['iap']['products'] == [] and with_products(g1)['monetization']['ads']['initOn'] == 'firstOffer')
    # L2 (RULING2.md 21.6, 22 L2 with E4 (c)): the supply check passes the shipped content and refuses the two dead ends
    expect('L2: the shipped content passes the supply check', supply_check(s)[0] == [])
    # s2e-content: the breaker and the smelter are dark (lead waits for stage 3), and the stage's own rung 5 asks for 8 (works.rungs);
    # with the first yard's ladder range 9 read in its place, the lead cut is refused as before
    c = copy.deepcopy(s)
    c['works']['rungs'] = [r for r in c['works']['rungs'] if r['n'] != 5]
    errs = supply_check(c)[0]
    expect('L2: rung 5 at the ladder\'s range 9 with lead dark is refused: 8 supplied, lead none',
           any('rung 5 asks for 9 materials' in e and 'supply only 8' in e and 'lead' in e for e in errs))
    expect('the stage\'s rung 5 asks for 8 (works.rungs), the first yard\'s ladder keeps 9', stage_rungs(s)[5]['range'] == 8 and next(r for r in s['ladder']['rungs'] if r['n'] == 5)['range'] == 9)
    c = copy.deepcopy(s)
    c['ladder']['thetaShare'] = 0.1
    errs = supply_check(c)[0]
    expect('L2: theta_5 ten times higher is refused at the fair driver\'s rate (E4 (c))', any('rung 5 asks for 8 materials at theta' in e for e in errs))
    c = copy.deepcopy(s)
    c['truck']['fairAfter_trips'] = 1000
    expect('L2: a driver who serves a partner once in a thousand trips cannot bring rung 5 in its band', any('rung 5' in e and 'E4 (c)' in e for e in supply_check(c)[0]))
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
    # 5.2 (3) (content2-bots): once bots/plates.json exists, a plate's price off the payback rule is a refusal, not a warning.
    ws = warnings(s, game)
    priced = [w for w in ws if w.startswith('(3) ')] if os.path.exists(PLATES_TABLE) else []
    if priced:
        print('REFUSED: %d price(s) off the payback rule or sold under the entry rule (5.2 (3), bots/plates.json; yard-stage2-economy.md 2.6.4):' % len(priced))
        for w in priced:
            print('  [lint] ' + w)
        return 1
    if '--quiet' not in argv:
        print(summary(s))
        for w in ws:
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
