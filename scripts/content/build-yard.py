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
    return out


def summary(s):
    rows = ['goal order and prices: ' + ', '.join('%s §%s' % (i['key'], f'{i["price"]:,}') for i in s['shop'])]
    rows.append('partners: ' + '; '.join('%s load %.0f kg §%s every %ds, trial §%s' % (p, d['skipMass_kg'], f'{d["skipPrice"]:,}', d['fill_s'], d['trialPrice']) for p, d in s['partners'].items()))
    rows.append('ladder: rung 2 at %s t, rung 3 at %s t; rivals %d; goals %d (+%d day one); names %d' % (
        s['ladder']['rung2']['t'], s['ladder']['rung3']['t'], len(s['rivals']['list']), len(s.get('goals', [])), len(s.get('dayOne', [])), len(s.get('names', {}))))
    return '\n'.join('  ' + r for r in rows)


def main(argv):
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
