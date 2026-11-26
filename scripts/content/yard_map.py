"""The first yard's map checker and its schematic picture (MAP.md, the fix pass of 25 November).

Owner: the content step (label content). build-yard.py's lint calls check(s) on the content as it would be
written, so `python3 scripts/content/build-yard.py --check` (and --lint) refuse a map that breaks:

  M1  nothing south of nothing: every place, bed, wall, prop, circle and point lies south of the back wall's
      south face (map.north + 0.4) and inside the yard;
  M2  the bays, the scale house and the stillage block stand with their backs on the back wall; the pads'
      centres are within about five metres (6.0 m from the wall's line);
  M3  zone 1's bed in the corner of the back wall and the east fence, its near edge within 3 m of the platform
      scale; zone 2's bed on the back wall; zone 3's bed west of the dividing wall; every bed dense (between
      0.9 and 1.7 times the ground its things need) and closed on at least one side by a wall or a fence;
  M4  the drive line (map.driveLine.rects) at least 3.6 m wide with nothing in it but the gate, the
      weighbridge, the merchant's stand and the truck's park: no place, bed, circle, standing spot, stillage
      position, wall, prop, drop-off waiting place or the drop-off's pile;
  M5  walks (map.routes, metres): scale-rack and scale-office at most 12, the drop-off's first place to the
      scale at most 10, the cable bundle to the stripper at most 3, the stripper to the scale at most 8;
  M6  between any two solids (places with solid true, the dividing wall, the props, the back wall, the fence,
      every position of the stillage block at full size, the zones' beds) a gap is 0 or at least 1.5 m
      (the block's own 0.1 m pitch gaps are closed: narrower than the worker);
  M7  the first view (the boss at start, at 61 % of the height, the camera kept inside the east fence, the top
      84 points under the bars) holds the drop-off's first waiting place, the platform scale, the scale
      house's display and at least 1.5 x 1.5 m of zone 1's bed, at 844 x 390 and at 667 x 375; the hero frame
      (map.hero, at most 16.7 x 9.7 m, its north edge on the wall's line) holds its places whole, the north
      edge of the weighbridge and at least 1.5 m of a zone's bed.

routes(s) recomputes map.routes: on foot 1.15 x straight, or the real way round the solids (inflated by the
worker's radius) when one lies between, whichever is longer; vehicles along the drive line's stops.

    python3 -I scripts/content/yard_map.py            # the checks and the table, on the built content
    python3 -I scripts/content/yard_map.py --routes   # the routes as a TypeScript block to paste
    python3 -I scripts/content/yard_map.py --png out.png   # the schematic picture
"""
import heapq
import json
import math
import os
import sys

PPM, TILT = 40, 0.7
LIFT = math.sqrt(1 - TILT * TILT)
BAR = 84
BOSS_AT = 0.61
SIZES = [(844, 390), (667, 375)]
PITCH, ROW = 1.3, 7  # positions.ts stillageSlot: the lead's 17:10 ruling
GAP_MIN = 1.5
OPEN_THINGS = {'washer': 0.65, 'bike': 1.0, 'radiator': 1.0}

WALK_ROUTES = ['start-dropoff', 'dropoff-scale', 'start-bundle1', 'bundle1-stripper', 'stripper-scale', 'floor-scale',
               'dropoff-stripper', 'floor-stripper', 'Z1-scale', 'Z2-scale', 'Z3-scale', 'car-scale', 'dropoff-bench',
               'crucible-scale', 'scale-rack', 'scale-office', 'scale-bays', 'scale-crucible', 'Z1-dropoff']
DRIVE_ROUTES = {'gate-weighbridge': ['gate', 'weighbridge'], 'weighbridge-floor': ['weighbridge', 'floor'],
                'floor-park': ['floor', 'turn', 'park'], 'park-gate': ['park', 'turn', 'gate'],
                'scale-park': None, 'weighbridge-merchant': ['weighbridge', 'merchant']}


def rect(x0, y0, x1, y1, name, kind):
    return {'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'name': name, 'kind': kind}


def fp_rect(f, name, kind):
    return rect(f['x'] - f['w'] / 2, f['y'] - f['d'] / 2, f['x'] + f['w'] / 2, f['y'] + f['d'] / 2, name, kind)


def bed_rect(b, name):
    return rect(b['x0'], b['y0'], b['x0'] + b['w'], b['y0'] + b['d'], name, 'bed')


def gap(a, b):
    dx = max(0.0, a['x0'] - b['x1'], b['x0'] - a['x1'])
    dy = max(0.0, a['y0'] - b['y1'], b['y0'] - a['y1'])
    return math.hypot(dx, dy)


def overlaps(a, b, eps=1e-6):
    return a['x0'] < b['x1'] - eps and b['x0'] < a['x1'] - eps and a['y0'] < b['y1'] - eps and b['y0'] < a['y1'] - eps


def inter(a, b):
    w = min(a['x1'], b['x1']) - max(a['x0'], b['x0'])
    d = min(a['y1'], b['y1']) - max(a['y0'], b['y0'])
    return max(0.0, w), max(0.0, d)


def south_face(s):
    return s['map'].get('north', 0) + 0.4


def stillage_block(s):
    """Every position of the stillage block (positions.ts stillageSlot), full size."""
    P = s['map']['points']
    rows = sorted(k for k in P if k.startswith('stillage'))
    if not rows:
        return []
    r0 = P[rows[0]]
    merchant = P.get('merchant', r0)
    d = -1 if merchant[0] > r0[0] - (ROW * PITCH) / 2 else 1
    size = s['map']['places'].get(rows[0], {}).get('w', 1.2)
    out = []
    for k in range(2 * ROW):
        row, col = k // ROW, k % ROW
        ry = r0[1] if row == 0 else (P[rows[1]][1] if len(rows) > 1 else r0[1] + PITCH)
        x = r0[0] + d * col * PITCH
        out.append(rect(x - size / 2, ry - size / 2, x + size / 2, ry + size / 2, 'stillage#%d' % k, 'stillage'))
    return out


def dropoff_slots(s):
    """The drop-off's waiting places: two rows of four, 1.4 m apart, centred on the drop-off's point (the
    proposal to rules-sim-b; positions.ts lays them out); the first is the north-west one."""
    p = s['map']['points']['dropoff']
    n = s.get('dropoff', {}).get('places', 8)
    cols = (n + 1) // 2
    return [(p[0] - 1.4 * (cols - 1) / 2 + 1.4 * (k % cols), p[1] - 0.7 + 1.4 * (k // cols)) for k in range(n)]


def yard_box(s):
    W, D = s['yard']['width'], s['yard']['depth']
    return rect(0, south_face(s), W, D, 'yard', 'yard')


def solids(s):
    M = s['map']
    W, D = s['yard']['width'], s['yard']['depth']
    north = M.get('north')
    out = []
    if north is not None:
        out.append(rect(-1, north - 0.4, W + 1, north + 0.4, 'back wall', 'wall'))
    gy = [r for r in M.get('driveLine', {}).get('rects', []) if r['x0'] + r['w'] >= W - 1e-6]
    g0, g1 = (gy[0]['y0'], gy[0]['y0'] + gy[0]['d']) if gy else (D, D)
    top = south_face(s)
    out += [rect(W, top, W + 1, g0, 'east fence (north of the gate)', 'fence'), rect(W, g1, W + 1, D, 'east fence (south of the gate)', 'fence'),
            rect(-1, top, 0, D, 'west fence', 'fence'), rect(-1, D, W + 1, D + 1, 'south fence', 'fence')]
    for k, pl in M['places'].items():
        if pl.get('solid') and not k.startswith('stillage') and k in M['footprints']:
            out.append(fp_rect(M['footprints'][k], k, 'place'))
    out += stillage_block(s)
    for i, w in enumerate(M['walls']):
        out.append(fp_rect(w, 'dividing wall %d' % (i + 1), 'wall'))
    for p in s.get('props', []):
        if p['kind'] == 'wall' or not p.get('solid', True):
            continue
        if p['shape'] == 'circle':
            out.append(rect(p['x'] - p['r'], p['y'] - p['r'], p['x'] + p['r'], p['y'] + p['r'], 'prop ' + p['id'], 'prop'))
        else:
            out.append(fp_rect(p, 'prop ' + p['id'], 'prop'))
    for z, d in s['zones'].items():
        if d.get('bed') and z.startswith('Z'):
            out.append(bed_rect(d['bed'], 'bed ' + z))
    return out


# --------------------------------------------------------------------------- routes (a visibility graph)

def _seg_hits(a, b, r):
    """Does segment a-b pass through the open interior of rect r?"""
    x0, y0, x1, y1 = r['x0'] + 1e-6, r['y0'] + 1e-6, r['x1'] - 1e-6, r['y1'] - 1e-6
    t0, t1 = 0.0, 1.0
    dx, dy = b[0] - a[0], b[1] - a[1]
    for p, q in ((-dx, a[0] - x0), (dx, x1 - a[0]), (-dy, a[1] - y0), (dy, y1 - a[1])):
        if abs(p) < 1e-12:
            if q < 0:
                return False
        else:
            t = q / p
            if p < 0:
                t0 = max(t0, t)
            else:
                t1 = min(t1, t)
            if t0 > t1:
                return False
    return t1 - t0 > 1e-9


def walk_path(s, a, b):
    """Shortest walk from point a to point b round the solids (inflated by the worker's radius); obstacles that
    hold an end are left out (the walk ends at their edge). Returns (length, path)."""
    rad = s.get('worker', {}).get('radius', 0.35) + 0.05
    obs = []
    for r in solids(s):
        if r['kind'] == 'fence':
            continue
        g = rect(r['x0'] - rad, r['y0'] - rad, r['x1'] + rad, r['y1'] + rad, r['name'], r['kind'])
        if any(g['x0'] < p[0] < g['x1'] and g['y0'] < p[1] < g['y1'] for p in (a, b)):
            continue
        obs.append(g)
    nodes = [tuple(a), tuple(b)]
    for g in obs:
        for c in ((g['x0'] - 0.01, g['y0'] - 0.01), (g['x1'] + 0.01, g['y0'] - 0.01), (g['x0'] - 0.01, g['y1'] + 0.01), (g['x1'] + 0.01, g['y1'] + 0.01)):
            if not any(o['x0'] < c[0] < o['x1'] and o['y0'] < c[1] < o['y1'] for o in obs):
                nodes.append(c)
    dist = {0: 0.0}
    prev = {}
    pq = [(0.0, 0)]
    done = set()
    while pq:
        d, i = heapq.heappop(pq)
        if i in done:
            continue
        done.add(i)
        if i == 1:
            break
        for j in range(len(nodes)):
            if j in done:
                continue
            if any(_seg_hits(nodes[i], nodes[j], g) for g in obs):
                continue
            nd = d + math.dist(nodes[i], nodes[j])
            if nd < dist.get(j, math.inf):
                dist[j] = nd
                prev[j] = i
                heapq.heappush(pq, (nd, j))
    if 1 not in dist:
        return math.inf, []
    path, k = [nodes[1]], 1
    while k != 0:
        k = prev[k]
        path.append(nodes[k])
    return dist[1], path[::-1]


def routes(s):
    M = s['map']
    P = M['points']
    det = M.get('detour', 1.15)
    out = {}
    for key in WALK_ROUTES:
        a, b = key.split('-')
        if a not in P or b not in P:
            continue
        straight = math.dist(P[a], P[b])
        L, _ = walk_path(s, P[a], P[b])
        out[key] = round(max(det * straight, L) + 1e-9, 1)
    stops = M.get('driveLine', {}).get('stops', {})
    for key, via in DRIVE_ROUTES.items():
        if via is None:
            a, b = key.split('-')
            out[key] = round(det * math.dist(P[a], P[b]), 1)
            continue
        if not all(v in stops for v in via):
            continue
        out[key] = round(sum(math.dist(stops[via[i]], stops[via[i + 1]]) for i in range(len(via) - 1)), 1)
    return out


def _between_filled(a, b, sol):
    """Is the gap between a and b taken by a third solid that touches both (the stillage block fills in order:
    a position is there only with the ones before it, so a gap behind a nearer position is no pocket)?"""
    for c in sol:
        if c is a or c is b:
            continue
        if c['kind'] == 'stillage' or a['kind'] == 'stillage' or b['kind'] == 'stillage':
            if gap(a, c) < 0.11 and gap(b, c) < 0.11:
                return True
    return False


# --------------------------------------------------------------------------- the frames

def first_view(s, W, H):
    """The follow camera at the start: the ground rectangle in view below the bars (metres)."""
    P = s['map']['points']
    bx, by = P['start']
    half = W / 2 / PPM
    Wd = s['yard']['width']
    cx = min(max(bx, half), Wd - half)
    top = by - (BOSS_AT * H - BAR) / (PPM * TILT)
    bottom = by + (H - BOSS_AT * H) / (PPM * TILT)
    return rect(cx - half, top, cx + half, bottom, 'first view %dx%d' % (W, H), 'frame'), (cx, by)


def screen_y(by, H, y, z=0.0):
    return BOSS_AT * H + (y - by) * PPM * TILT - z * PPM * LIFT


# --------------------------------------------------------------------------- the checks

def check(s):
    """Errors (a list of strings) and a report (a list of strings)."""
    M = s['map']
    P, F = M['points'], M['footprints']
    errs, rep = [], []
    bad = errs.append
    if 'north' not in M:
        return ['map.north is missing (MAP.md M1)'], rep
    top = south_face(s)
    W, D = s['yard']['width'], s['yard']['depth']
    yard = yard_box(s)
    beds = {z: bed_rect(d['bed'], z) for z, d in s['zones'].items() if d.get('bed')}
    fps = {k: fp_rect(f, k, 'fp') for k, f in F.items()}
    block = stillage_block(s)
    sol = solids(s)
    # M1
    for k, r in list(fps.items()) + [('bed ' + z, b) for z, b in beds.items()] + [(r['name'], r) for r in sol if r['kind'] in ('prop', 'stillage', 'place')]:
        if r['y0'] < top - 1e-6 or r['x0'] < -1e-6 or r['x1'] > W + 1e-6 or r['y1'] > D + 1e-6:
            bad('M1: %s (%.2f..%.2f x %.2f..%.2f) is not inside the yard south of the back wall (y %.2f)' % (k, r['x0'], r['x1'], r['y0'], r['y1'], top))
    for w in M['walls']:
        if w['y'] - w['d'] / 2 < top - 1e-6:
            bad('M1: a dividing wall section starts north of the back wall')
    for k, (x, y) in P.items():
        if y < top - 1e-6 or not 0 <= x <= W or y > D:
            bad('M1: point %s (%s, %s) lies outside the yard south of the back wall' % (k, x, y))
    for c in M.get('circles', []):
        if c[1] - c[2] < top:
            bad('M1: a chalk circle lies north of the back wall')
    # M2
    for k in ('bays', 'scalehouse'):
        if k in fps and abs(fps[k]['y0'] - top) > 1e-6:
            bad('M2: %s does not stand with its back on the back wall (y0 %.2f, the wall %.2f)' % (k, fps[k]['y0'], top))
    if block and abs(min(b['y0'] for b in block) - top) > 1e-6:
        bad('M2: the stillage block does not stand on the back wall')
    for k in ('scale', 'stripper', 'bundle1', 'board', 'crucible', 'bench'):
        if k in P and P[k][1] - M['north'] > 6.0 + 1e-6:
            bad('M2: %s centre %.1f m from the back wall (about five)' % (k, P[k][1] - M['north']))
    # M3
    if 'Z1' in beds:
        b = beds['Z1']
        if abs(b['y0'] - top) > 1e-6 or abs(b['x1'] - W) > 1e-6:
            bad('M3: zone 1 bed is not in the corner of the back wall and the east fence')
        if 'scale' in fps and gap(b, fps['scale']) > 3 + 1e-6:
            bad('M3: zone 1 bed is %.1f m from the platform scale (about 3)' % gap(b, fps['scale']))
    if 'Z2' in beds and abs(beds['Z2']['y0'] - top) > 1e-6:
        bad('M3: zone 2 bed is not on the back wall')
    wx = min((w['x'] - w['w'] / 2 for w in M['walls']), default=None)
    if 'Z3' in beds and wx is not None and beds['Z3']['x1'] > wx + 1e-6:
        bad('M3: zone 3 bed is not west of the dividing wall')
    O = s['objects']
    walls_fence = [r for r in sol if r['kind'] in ('wall', 'fence')]
    for z, b in beds.items():
        if not z.startswith('Z'):
            continue
        need = sum(n * OPEN_THINGS.get(o, max(1.0, O[o]['size']['w'] * O[o]['size']['d'] * 1.4)) for o, n in s['zones'][z]['things'].items())
        area = (b['x1'] - b['x0']) * (b['y1'] - b['y0'])
        rep.append('bed %s: %.1f m2 for things needing %.1f m2 (%.2f)' % (z, area, need, area / need))
        if not 0.9 <= area / need <= 1.7:
            bad('M3: bed %s is %.1f m2 for things needing %.1f m2 (dense: 0.9 to 1.7 times)' % (z, area, need))
        if not any(gap(b, r) < 1e-6 for r in walls_fence):
            bad('M3: bed %s is not closed on any side by a wall or a fence' % z)
    # M4
    dl = M.get('driveLine')
    if not dl or not dl.get('rects'):
        bad('M4: map.driveLine.rects missing')
    else:
        R = [rect(r['x0'], r['y0'], r['x0'] + r['w'], r['y0'] + r['d'], 'drive line', 'line') for r in dl['rects']]
        if min(min(r['x1'] - r['x0'], r['y1'] - r['y0']) for r in R) < 3.6 - 1e-6:
            bad('M4: the drive line is narrower than 3.6 m')
        allowed = {'gate', 'weighbridge', 'merchant', 'park'}
        stuff = [(k, r) for k, r in fps.items() if k not in allowed]
        stuff += [('bed ' + z, b) for z, b in beds.items()]
        stuff += [(r['name'], r) for r in sol if r['kind'] in ('stillage', 'prop', 'wall', 'place')]
        stuff += [('circle %d' % i, rect(c[0] - c[2], c[1] - c[2], c[0] + c[2], c[1] + c[2], 'c', 'c')) for i, c in enumerate(M.get('circles', []))]
        stuff += [('drop-off waiting place %d' % i, rect(x - 0.45, y - 0.45, x + 0.45, y + 0.45, 'w', 'w')) for i, (x, y) in enumerate(dropoff_slots(s))]
        dp = P['dropoff']
        dd = M['places']['dropoff']['d']
        stuff.append(('the drop-off pile (positions.ts: 1.3 m south of the point, spiral to 0.8 m)', rect(dp[0] - 0.9, dp[1] + 1.3 - 0.1, dp[0] + 0.9, dp[1] + 1.3 + 0.6, 'p', 'p')))
        for k, r in stuff:
            for L in R:
                if overlaps(r, L):
                    bad('M4: %s stands in the drive line' % k)
                    break
        for k, (x, y) in dl.get('stops', {}).items():
            if not any(L['x0'] - 1e-6 <= x <= L['x1'] + 1e-6 and L['y0'] - 1e-6 <= y <= L['y1'] + 1e-6 for L in R):
                bad('M4: the stop %s (%s, %s) is off the drive line' % (k, x, y))
        for k in ('weighbridge', 'merchant', 'park'):
            if k in fps and not any(fps[k]['x0'] >= L['x0'] - 1e-6 and fps[k]['x1'] <= L['x1'] + 1e-6 and fps[k]['y0'] >= L['y0'] - 1e-6 and fps[k]['y1'] <= L['y1'] + 1e-6 for L in R):
                bad('M4: %s is not wholly on the drive line' % k)
    # M5
    rt = M['routes']

    def route(a, b):
        return rt.get('%s-%s' % (a, b), rt.get('%s-%s' % (b, a)))
    slot0 = dropoff_slots(s)[0]
    d0 = max(1.15 * math.dist(slot0, P['scale']), walk_path(s, slot0, P['scale'])[0])
    for (a, b, lim) in (('scale', 'rack', 12), ('scale', 'office', 12), ('bundle1', 'stripper', 3), ('stripper', 'scale', 8)):
        v = route(a, b)
        if v is None or v > lim + 1e-6:
            bad('M5: the walk %s-%s is %s m (at most %s)' % (a, b, v, lim))
        rep.append('walk %s-%s: %s m (at most %s)' % (a, b, v, lim))
    rep.append("walk drop-off's first place-scale: %.1f m (at most 10)" % d0)
    if d0 > 10:
        bad("M5: the walk from the drop-off's first place to the scale is %.1f m (at most 10)" % d0)
    fresh = routes(s)
    for k, v in fresh.items():
        if abs(rt.get(k, -99) - v) > 0.05:
            bad('map.routes.%s is %s, the map gives %s (python3 -I scripts/content/yard_map.py --routes)' % (k, rt.get(k), v))
    # M6
    for i in range(len(sol)):
        for j in range(i + 1, len(sol)):
            a, b = sol[i], sol[j]
            if a['kind'] == 'fence' and b['kind'] == 'fence':
                continue
            if a['kind'] == 'stillage' and b['kind'] == 'stillage':
                continue
            if a['kind'] == 'wall' and b['kind'] == 'wall' and 'back' not in a['name'] + b['name']:
                if gap(a, b) < 1e-6 or gap(a, b) >= GAP_MIN - 1e-6:
                    continue
            if overlaps(a, b) and not (a['kind'] in ('wall', 'fence') or b['kind'] in ('wall', 'fence')):
                bad('M6: %s overlaps %s' % (a['name'], b['name']))
                continue
            g = gap(a, b)
            if 1e-6 < g < GAP_MIN - 1e-6 and not _between_filled(a, b, sol):
                bad('M6: %.2f m between %s and %s (0 or at least %.1f)' % (g, a['name'], b['name'], GAP_MIN))
    # M7: the first view
    for (Wp, Hp) in SIZES:
        v, (cx, by) = first_view(s, Wp, Hp)
        rep.append('first view %dx%d: x %.1f..%.1f, y %.1f..%.1f (camera x %.1f)' % (Wp, Hp, v['x0'], v['x1'], v['y0'], v['y1'], cx))
        x, y = slot0
        if not (v['x0'] <= x - 0.4 and x + 0.4 <= v['x1'] and v['y0'] <= y - 0.4 - 1.0 * LIFT / TILT and y + 0.4 <= v['y1']):
            bad("M7: the drop-off's first washer is not in the first view at %dx%d" % (Wp, Hp))
        sc = fps['scale']
        if not (v['x0'] <= sc['x0'] and sc['x1'] <= v['x1'] and v['y0'] <= sc['y0'] and sc['y1'] <= v['y1']):
            bad('M7: the platform scale is not in the first view at %dx%d' % (Wp, Hp))
        sh = fps['scalehouse']
        dy = screen_y(by, Hp, sh['y1'], 1.2)
        rep.append('  the scale house display (front face, 1.2 m up) at %.0f pt (the bars end at %d)' % (dy, BAR))
        if dy < BAR + 4 or not (v['x0'] <= (sh['x0'] + sh['x1']) / 2 <= v['x1']):
            bad('M7: the scale house display is under the bars at %dx%d (%.0f pt)' % (Wp, Hp, dy))
        w, d = inter(beds['Z1'], v)
        rep.append('  zone 1 bed in view: %.1f x %.1f m' % (w, d))
        if w < 1.5 or d < 1.5:
            bad('M7: zone 1 bed shows %.1f x %.1f m in the first view at %dx%d (at least 1.5 x 1.5)' % (w, d, Wp, Hp))
    # M7: the hero frame
    h = M.get('hero')
    if not h:
        bad('M7: map.hero missing')
    else:
        hr = rect(h['x0'], h['y0'], h['x0'] + h['w'], h['y0'] + h['d'], 'hero', 'frame')
        if h['w'] > 16.7 + 1e-6 or h['d'] > 9.7 + 1e-6:
            bad('M7: the hero frame is %s x %s m (at most 16.7 x 9.7)' % (h['w'], h['d']))
        if abs(h['y0'] - M['north']) > 1e-6:
            bad('M7: the hero frame does not start at the back wall')
        members = list(h['places'])
        for k in members:
            if k not in fps:
                bad('M7: map.hero names %s, which has no footprint' % k)
                continue
            f = fps[k]
            if f['x0'] < hr['x0'] - 1e-6 or f['x1'] > hr['x1'] + 1e-6 or f['y0'] < hr['y0'] - 1e-6 or f['y1'] > hr['y1'] + 1e-6:
                bad('M7: %s is not wholly inside the hero frame' % k)
        if 'weighbridge' in fps and fps['weighbridge']['y0'] > hr['y1'] - 0.3:
            bad("M7: the weighbridge's north edge is not in the hero frame")
        best = max((inter(b, hr) for z, b in beds.items() if z.startswith('Z')), key=lambda t: min(t), default=(0, 0))
        rep.append('hero frame x %.1f..%.1f, y %.1f..%.1f; weighbridge %.1f m in; old stock in it %.1f x %.1f m' % (hr['x0'], hr['x1'], hr['y0'], hr['y1'], hr['y1'] - fps['weighbridge']['y0'], best[0], best[1]))
        if min(best) < 1.5:
            bad('M7: the hero frame holds %.1f x %.1f m of old stock (at least 1.5)' % best)
    return errs, rep


# --------------------------------------------------------------------------- the picture

def picture(s, out):
    from PIL import Image, ImageDraw
    M = s['map']
    W, D = s['yard']['width'], s['yard']['depth']
    k = 22
    y_from = M.get('north', 0) - 2
    ox, oy = 30, 30
    img = Image.new('RGB', (int(W * k + 2 * ox + 40), int((D - y_from) * k + 2 * oy + 40)), (235, 232, 222))
    g = ImageDraw.Draw(img)

    def R(r):
        return [ox + r['x0'] * k, oy + (r['y0'] - y_from) * k, ox + r['x1'] * k, oy + (r['y1'] - y_from) * k]
    g.rectangle(R(rect(0, south_face(s), W, D, '', '')), fill=(212, 208, 196))
    for r in M.get('driveLine', {}).get('rects', []):
        g.rectangle(R(rect(r['x0'], r['y0'], r['x0'] + r['w'], r['y0'] + r['d'], '', '')), fill=(250, 228, 140))
    for z, d in s['zones'].items():
        if d.get('bed'):
            g.rectangle(R(bed_rect(d['bed'], z)), fill=(176, 138, 100), outline=(110, 80, 50))
    sol = solids(s)
    labels = []
    for kk, f in M['footprints'].items():
        pl = M['places'].get(kk, {})
        if kk.startswith('Z') or kk == 'bundle1':
            continue
        r = fp_rect(f, kk, 'fp')
        col = (120, 120, 130) if pl.get('solid') else (190, 205, 225)
        if kk.startswith('stillage'):
            col = (200, 140, 90)
        g.rectangle(R(r), fill=col, outline=(40, 40, 50))
        labels.append((kk, r))
    for r in sol:
        if r['kind'] in ('wall', 'prop', 'fence'):
            g.rectangle(R(r), fill=(90, 90, 96))
        if r['kind'] == 'stillage':
            g.rectangle(R(r), outline=(160, 90, 40))
    for c in M.get('circles', []):
        g.ellipse([ox + (c[0] - c[2]) * k, oy + (c[1] - c[2] - y_from) * k, ox + (c[0] + c[2]) * k, oy + (c[1] + c[2] - y_from) * k], outline=(250, 250, 250), width=2)
    for i, (x, y) in enumerate(dropoff_slots(s)):
        g.rectangle([ox + (x - 0.4) * k, oy + (y - 0.4 - y_from) * k, ox + (x + 0.4) * k, oy + (y + 0.4 - y_from) * k], fill=(255, 255, 255) if i == 0 else (225, 225, 225), outline=(0, 0, 0))
    st = M.get('driveLine', {}).get('stops', {})
    for kk, (x, y) in st.items():
        g.ellipse([ox + x * k - 4, oy + (y - y_from) * k - 4, ox + x * k + 4, oy + (y - y_from) * k + 4], fill=(200, 60, 40))
    sx, sy = M['points']['start']
    g.ellipse([ox + sx * k - 6, oy + (sy - y_from) * k - 6, ox + sx * k + 6, oy + (sy - y_from) * k + 6], fill=(30, 110, 220))
    for z, d in s['zones'].items():
        if d.get('bed'):
            labels.append(('bed ' + z, bed_rect(d['bed'], z)))
    for name, r in labels:
        g.text((ox + r['x0'] * k + 2, oy + (r['y0'] - y_from) * k + 1), name, fill=(0, 0, 0))
    for (Wp, Hp), colr in zip(SIZES, [(30, 110, 220), (220, 40, 140)]):
        v, _ = first_view(s, Wp, Hp)
        g.rectangle(R(v), outline=colr, width=3)
        g.text((ox + v['x0'] * k + 4, oy + (v['y1'] - y_from) * k - 14), 'first view %dx%d' % (Wp, Hp), fill=colr)
    h = M.get('hero')
    if h:
        hr = rect(h['x0'], h['y0'], h['x0'] + h['w'], h['y0'] + h['d'], '', '')
        g.rectangle(R(hr), outline=(20, 150, 60), width=3)
        g.text((ox + hr['x0'] * k + 4, oy + (hr['y0'] - y_from) * k + 4), 'hero frame 16.7 x 9.7', fill=(20, 150, 60))
    for x in range(0, int(W) + 1, 4):
        g.text((ox + x * k - 4, oy + (D - y_from) * k + 6), str(x), fill=(0, 0, 0))
    for y in range(int(math.ceil(y_from)), int(D) + 1, 2):
        g.text((4, oy + (y - y_from) * k - 5), str(y), fill=(0, 0, 0))
    img.save(out)


def _built():
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, '..', '..', 'games', 'scrap-yard', 'game.json'), encoding='utf-8') as f:
        return json.load(f)['salvage']


def main(argv):
    s = None
    if '--content' in argv:
        s = json.load(sys.stdin)
    else:
        s = _built()
    if '--routes' in argv:
        for kk, v in routes(s).items():
            print('      "%s": %s,' % (kk, v))
        return 0
    if '--png' in argv:
        picture(s, argv[argv.index('--png') + 1])
    errs, rep = check(s)
    for r in rep:
        print(r)
    for e in errs:
        print('  [map] ' + e)
    print('map: %d finding(s)' % len(errs))
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
