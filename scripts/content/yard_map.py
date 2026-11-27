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
import copy
import heapq
import json
import math
import re
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


def west(s):
    """The yard's west edge: 0 on the first yard's map, map.works.x0 on the merged map (3.1.2)."""
    return s['yard'].get('x0', 0)


def yard_box(s):
    W, D = s['yard']['width'], s['yard']['depth']
    return rect(west(s), south_face(s), W, D, 'yard', 'yard')


def solids(s):
    M = s['map']
    W, D = s['yard']['width'], s['yard']['depth']
    north = M.get('north')
    out = []
    if north is not None:
        out.append(rect(west(s) - 1, north - 0.4, W + 1, north + 0.4, 'back wall', 'wall'))
    gy = [r for r in M.get('driveLine', {}).get('rects', []) if r['x0'] + r['w'] >= W - 1e-6]
    g0, g1 = (gy[0]['y0'], gy[0]['y0'] + gy[0]['d']) if gy else (D, D)
    top = south_face(s)
    x0 = west(s)
    WK = M.get('_works')
    if WK:
        # the merged map (3.1): the wicket in the east fence south of the gate; the old west fence with its openings
        w0, w1 = WK['publicBay']['wicket']
        out += [rect(W, top, W + 1, g0, 'east fence (north of the gate)', 'fence'), rect(W, g1, W + 1, w0, 'east fence (gate to wicket)', 'fence'),
                rect(W, w1, W + 1, D, 'east fence (south of the wicket)', 'fence'), rect(x0 - 1, top, x0, D, 'west fence', 'fence'), rect(x0 - 1, D, W + 1, D + 1, 'south fence', 'fence')]
        fx = WK['fence']['x']
        y = top
        for (a, b) in sorted(WK['fence']['openings']) + [(D, D)]:
            if a > y + 1e-9:
                out.append(rect(fx - 0.1, y, fx + 0.1, a, 'field fence y %.1f..%.1f' % (y, a), 'fence'))
            y = max(y, b)
        for i, r in enumerate(WK['publicBay']['rail']):
            out.append(rect(r['x0'], r['y0'], r['x0'] + r['w'], r['y0'] + r['d'], 'public bay rail %d' % i, 'wall'))
    else:
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
    cx = min(max(bx, west(s) + half), Wd - half)
    top = by - (BOSS_AT * H - BAR) / (PPM * TILT)
    bottom = by + (H - BOSS_AT * H) / (PPM * TILT)
    return rect(cx - half, top, cx + half, bottom, 'first view %dx%d' % (W, H), 'frame'), (cx, by)


def screen_y(by, H, y, z=0.0):
    return BOSS_AT * H + (y - by) * PPM * TILT - z * PPM * LIFT


# --------------------------------------------------------------------------- the checks

def check(s, walks=True):
    """Errors (a list of strings) and a report (a list of strings). walks=False skips recomputing map.routes (the
    selftest's cases that move nothing a walk passes)."""
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
        if r['y0'] < top - 1e-6 or r['x0'] < west(s) - 1e-6 or r['x1'] > W + 1e-6 or r['y1'] > D + 1e-6:
            bad('M1: %s (%.2f..%.2f x %.2f..%.2f) is not inside the yard south of the back wall (y %.2f)' % (k, r['x0'], r['x1'], r['y0'], r['y1'], top))
    for w in M['walls']:
        if w['y'] - w['d'] / 2 < top - 1e-6:
            bad('M1: a dividing wall section starts north of the back wall')
    for k, (x, y) in P.items():
        if y < top - 1e-6 or not west(s) <= x <= W or y > D:
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
    # owner1 H5: the waiting places (map.points wait1, wait2, ...): clear of every solid, the scale, the bays' fronts, the
    # drive line, the chalk circles and the drop-off's places (a worker's 0.8 m square)
    waits = sorted((k, v) for k, v in P.items() if re.match(r'^wait\d+$', k))
    if waits:
        keep = [(r['name'], r) for r in sol if r['kind'] != 'fence']
        for k in ('scale', 'dropoff', 'weighbridge', 'office', 'rack'):
            if k in fps:
                keep.append((k, fps[k]))
        if 'bays' in fps:
            b = fps['bays']
            keep.append(("the bays' front", rect(b['x0'], b['y1'], b['x1'], b['y1'] + 1.0, 'bf', 'bf')))
        for r in (dl or {}).get('rects', []):
            keep.append(('the drive line', rect(r['x0'], r['y0'], r['x0'] + r['w'], r['y0'] + r['d'], 'dl', 'dl')))
        keep += [('circle %d' % i, rect(c[0] - c[2], c[1] - c[2], c[0] + c[2], c[1] + c[2], 'c', 'c')) for i, c in enumerate(M.get('circles', []))]
        keep += [('drop-off place %d' % i, rect(x - 0.45, y - 0.45, x + 0.45, y + 0.45, 'w', 'w')) for i, (x, y) in enumerate(dropoff_slots(s))]
        for k, (x, y) in waits:
            q = rect(x - 0.4, y - 0.4, x + 0.4, y + 0.4, k, 'wait')
            for n, r in keep:
                if overlaps(q, r):
                    bad('owner1 H5: the waiting place %s (%s, %s) stands in %s' % (k, x, y, n))
    # owner1 V4: an arrival drives the drive line to the stop nearest its place and sets down there: that stop must lie
    # on the line inside the fence, and the line from the gate to it must stay in the corridor (nothing solid stands in it, M4)
    stops_in = {k: v for k, v in (dl or {}).get('stops', {}).items() if k != 'turn' and v[0] <= W}
    if stops_in and dl and dl.get('rects'):
        R2 = [rect(r['x0'], r['y0'], r['x0'] + r['w'], r['y0'] + r['d'], 'drive line', 'line') for r in dl['rects']]
        def in_line(px, py):
            return any(L['x0'] - 1e-6 <= px <= L['x1'] + 1e-6 and L['y0'] - 1e-6 <= py <= L['y1'] + 1e-6 for L in R2)
        for it in s.get('shop', []) + s.get('dayOneList', []):
            arrive = it.get('arrive') or {'tool': 'van', 'carrier': 'van', 'machine': 'machineFlatbed', 'truck': 'truck'}.get(it.get('kind'))
            if arrive not in ('van', 'machineFlatbed', 'truck') or it.get('place') not in P:
                continue
            px, py = P[it['place']]
            k, (sx, sy) = min(stops_in.items(), key=lambda kv: math.dist(kv[1], (px, py)))
            g = P['gate']
            n = max(1, int(math.dist(g, (sx, sy)) / 0.25))
            if not all(in_line(g[0] + (sx - g[0]) * i / n, g[1] + (sy - g[1]) * i / n) for i in range(n + 1)) and not in_line(sx, g[1]):
                bad('owner1 V4: %s arrives at the stop %s off the drive line' % (it['key'], k))
            for r in sol:
                if r['kind'] in ('wall', 'fence', 'prop', 'place', 'stillage') and r['x0'] < sx < r['x1'] and r['y0'] < sy < r['y1']:
                    bad('owner1 V4: %s sets down at the stop %s inside %s' % (it['key'], k, r['name']))
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
    fresh = routes(s) if walks else {}
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


# --------------------------------------------------------------------------- the merged map (stage 2, section 3)

# The walks of 3.4 (`--routes --works`), and the ids their names stand for.
WORKS_WALKS = ['scale-crate', 'dropoff-reuseRack', 'floor-reuseRack', 'floor-crane', 'crane-shear', 'crane-baler', 'forklift-elvPad',
               'elvPad-apron', 'floor-shear', 'floor-baler', 'shear-scale', 'baler-scale', 'scale-shredder', 'scale-rotary', 'scale-smelter']
# s2a-fix: baler-scale beside 3.4's walks (the critic's minor 18: a bale is carried to the scale by hand); not capped: a point for the lead
WALK_ALIAS = {'apron': 'depollution.apron'}
# 3.6 (5): the walks with a limit (metres)
WORKS_LIMITS = {'scale-crate': 20, 'dropoff-reuseRack': 24, 'floor-crane': 10}
HALLS = [('rotary', 'rotary.filter'), ('induction', 'induction.filter'), ('smelter', 'smelter.filter')]
LINE = ['shredder', 'eddy', 'sorter']


def merged(s):
    """The map from rung 3 (3.1): map.works laid over map. None when the content has no works layer."""
    W = s['map'].get('works')
    if not W:
        return None
    m = copy.deepcopy(s)
    M = m['map']
    M.pop('works')
    m['yard'] = dict(m['yard'], x0=W['x0'])
    for k in ('points', 'footprints', 'places'):
        M[k] = {**M.get(k, {}), **W.get(k, {})}
    drop = W.get('drop', {})
    gone = set(drop.get('props', []))
    m['props'] = [p for p in m.get('props', []) if p['id'] not in gone]
    walls = set(drop.get('walls', []))
    M['walls'] = [w for i, w in enumerate(M['walls']) if i not in walls]
    dl = M.setdefault('driveLine', {})
    dl['rects'] = list(dl.get('rects', [])) + list(W.get('driveLine', {}).get('rects', []))
    dl['stops'] = {**dl.get('stops', {}), **W.get('driveLine', {}).get('stops', {})}
    M['routes'] = {**M['routes'], **W.get('routes', {})}
    M['lane'] = {**M['lane'], **W.get('lane', {})}
    M['_works'] = W
    return m


def works_routes(s):
    """The walks of 3.4 on the merged map (on foot, as routes())."""
    P = s['map']['points']
    det = s['map'].get('detour', 1.15)
    out = {}
    for key in WORKS_WALKS:
        a, b = key.split('-')
        a, b = WALK_ALIAS.get(a, a), WALK_ALIAS.get(b, b)
        if a not in P or b not in P:
            continue
        L, _ = walk_path(s, P[a], P[b])
        out[key] = round(max(det * math.dist(P[a], P[b]), L) + 1e-9, 1)
    return out


def _r(d, name='', kind=''):
    return rect(d['x0'], d['y0'], d['x0'] + d['w'], d['y0'] + d['d'], name, kind)


def _seg_gap(a, b, r):
    """The least distance from segment a-b to rect r (0 when it enters it)."""
    if _seg_hits(a, b, r) or any(r['x0'] <= p[0] <= r['x1'] and r['y0'] <= p[1] <= r['y1'] for p in (a, b)):
        return 0.0
    best = math.inf
    for k in range(101):
        t = k / 100
        x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        best = min(best, math.hypot(max(0.0, r['x0'] - x, x - r['x1']), max(0.0, r['y0'] - y, y - r['y1'])))
    return best


def bay_slot_pos(s, grade):
    """A works-layer bay's position: its place's width shared by its slots, slot 0 at the west end (3 m bunkers)."""
    G = {**s['grades'], **(s.get('worksLayer') or {}).get('grades', {})}
    gr = G.get(grade) or {}
    bay = gr.get('bay') or {}
    pl = bay.get('place')
    F = s['map']['footprints']
    if not pl or pl not in F:
        return None
    n = max(1, max(((g.get('bay') or {}).get('slot', 0) + 1 for g in G.values() if (g.get('bay') or {}).get('place') == pl), default=1))
    f = F[pl]
    x = f['x'] - f['w'] / 2 + (bay.get('slot', 0) + 0.5) * f['w'] / n
    return (x, f['y'])


def check_works(s0, walks=True):
    """The merged map's checks (3.1.3: M1 to M7 again, and 3.6). Errors and a report; ([], []) without a works layer.
    walks=False skips recomputing the walks (the selftest's cases that move nothing a walk passes)."""
    s = merged(s0)
    if s is None:
        return [], []
    errs, rep = check(s, walks)
    errs = ['merged map: ' + e for e in errs]
    bad = errs.append
    M = s['map']
    WK = M['_works']
    F, P = M['footprints'], M['points']
    fps = {k: fp_rect(f, k, 'fp') for k, f in F.items()}
    top = south_face(s)
    W, D, x0 = s['yard']['width'], s['yard']['depth'], west(s)
    sol = solids(s)
    plates = (s.get('works') or {}).get('plates', {})
    # (1) everything of map.works inside the new box, south of the back wall's face
    boxes = [(k, fps[k]) for k in WK.get('footprints', {})] + [('roof ' + k, _r(r)) for k, r in WK.get('roofs', {}).items()]
    boxes += [('publicBay', _r(WK['publicBay']['rect']))] + [('rail %d' % i, _r(r)) for i, r in enumerate(WK['publicBay']['rail'])]
    boxes += [('driveLine rect %d' % i, _r(r)) for i, r in enumerate(WK['driveLine']['rects'])] + [('forkliftZone %d' % i, _r(r)) for i, r in enumerate(WK.get('forkliftZone', []))]
    for k, r in boxes:
        if r['y0'] < top - 1e-6 or r['x0'] < x0 - 1e-6 or r['x1'] > W + 1e-6 or r['y1'] > D + 1e-6:
            bad('3.6 (1): %s (%.2f..%.2f x %.2f..%.2f) is not inside the yard x %s..%s south of the back wall (y %.2f)' % (k, r['x0'], r['x1'], r['y0'], r['y1'], x0, W, top))
    # (2) the works road and the turning place at least 4 m wide; the openings at least the road's width
    road = [_r(r) for r in WK['driveLine']['rects']]
    for i, r in enumerate(road):
        if min(r['x1'] - r['x0'], r['y1'] - r['y0']) < 4 - 1e-6:
            bad('3.6 (2): works drive-line rect %d is %.1f x %.1f m (at least 4 m wide)' % (i, r['x1'] - r['x0'], r['y1'] - r['y0']))
    rd = road[0] if road else None
    if rd:
        if not any(a <= rd['y0'] + 1e-6 and rd['y1'] <= b + 1e-6 for a, b in WK['fence']['openings']):
            bad('3.6 (2): the field fence at x %s has no opening the works road (y %.1f..%.1f) passes' % (WK['fence']['x'], rd['y0'], rd['y1']))
        wall_x = [w for w in M['walls']]
        if wall_x:
            wx0 = min(w['x'] - w['w'] / 2 for w in wall_x)
            wx1 = max(w['x'] + w['w'] / 2 for w in wall_x)
            if rd['x0'] < wx0 and rd['x1'] > wx1:
                blocking = [w for w in wall_x if (w['y'] - w['d'] / 2) < rd['y1'] - 1e-6 and (w['y'] + w['d'] / 2) > rd['y0'] + 1e-6]
                if blocking:
                    bad('3.6 (2): a dividing wall section stands across the works road (y %.1f..%.1f)' % (rd['y0'], rd['y1']))
    # (4) each hall touches its filter; the shredder line touches in order; plates' slots along x in the order of their feeds chain
    for h, f in HALLS:
        if h in fps and f in fps and gap(fps[h], fps[f]) > 1e-6:
            bad('3.6 (4): %s does not touch its filter %s (%.2f m)' % (h, f, gap(fps[h], fps[f])))
    for a, b in zip(LINE, LINE[1:]):
        if a in fps and b in fps and (gap(fps[a], fps[b]) > 1e-6 or not P[b][0] < P[a][0]):
            bad('3.6 (4): %s and %s do not touch in the line\'s order (westwards)' % (a, b))
    for pid, p in plates.items():
        for q in (p.get('feeds') or {}).values():
            if q in plates and plates[q]['plot'] in P and p['plot'] in P:
                if not (P[plates[q]['plot']][0] < P[p['plot']][0] and plates[q]['slot'] > p['slot']):
                    bad('3.6 (4): %s feeds %s, but their plots or slots are not in the chain\'s order along x' % (pid, q))
    # (5) the walks, the crane's reach, the car pad, the battery box
    fresh = works_routes(s) if walks else dict(WK.get('routes', {}))
    for k, lim in WORKS_LIMITS.items():
        # s2e-line (D6): a walk whose end is not drawn at this stage (the crane's stand) has no limit to keep
        a_, b_ = k.split('-')
        if WALK_ALIAS.get(a_, a_) not in P or WALK_ALIAS.get(b_, b_) not in P:
            continue
        v = fresh.get(k)
        if v is None or v > lim + 1e-6:
            bad('3.6 (5): the walk %s is %s m (at most %s)' % (k, v, lim))
    for k, v in fresh.items():
        have = WK.get('routes', {}).get(k)
        if have is None or abs(have - v) > 0.05:
            bad('map.works.routes.%s is %s, the merged map gives %s (python3 -I scripts/content/yard_map.py --routes --works)' % (k, have, v))
    for k in WK.get('routes', {}):
        if k not in fresh and walks:
            bad('map.works.routes.%s names a walk the merged map does not have (an end not drawn): drop it' % k)
    rep.append('walks of 3.4 (merged map): ' + ', '.join('%s %s m' % kv for kv in fresh.items()))
    first = routes(s) if walks else {}
    for k, v in first.items():
        if k in M['routes'] and abs(M['routes'][k] - v) > 0.05:
            bad('merged map: the first yard’s walk %s is %s on the merged map, map.routes has %s (put the merged value in map.works.routes)' % (k, v, M['routes'][k]))
    crane = s.get('crane') or {}
    if 'crane' in P:
        cx, cy = P['crane']
        for k in ('floor', 'depollution.apron', 'shear', 'baler'):
            if k in fps:
                r = fps[k]
                dd = math.hypot(max(0.0, r['x0'] - cx, cx - r['x1']), max(0.0, r['y0'] - cy, cy - r['y1']))
                rep.append('crane reach to %s: %.1f m (at most %s)' % (k, dd, crane.get('reach_m', 9)))
                if dd > crane.get('reach_m', 9) + 1e-6:
                    bad('3.6 (5): the crane at (%s, %s) does not reach %s (%.1f m, reach %s)' % (cx, cy, k, dd, crane.get('reach_m')))
    if 'elvPad' in fps:
        pad = fps['elvPad']
        if 'depollution.apron' in fps and (gap(pad, fps['depollution.apron']) > 1e-6 or overlaps(pad, fps['depollution.apron'])):
            bad('3.6 (5): the car pad does not touch the depollution apron')
        if 'floor' in fps and overlaps(pad, fps['floor']):
            bad('3.6 (5): the car pad lies on the tipping floor (the crane’s tip zone)')
        zone = [_r(r) for r in WK.get('forkliftZone', [])]
        if not any(pad['x0'] >= z['x0'] - 1e-6 and pad['x1'] <= z['x1'] + 1e-6 and pad['y0'] >= z['y0'] - 1e-6 and pad['y1'] <= z['y1'] + 1e-6 for z in zone):
            bad('3.6 (5): the car pad is not within the forklift’s reach (map.works.forkliftZone)')
        if 'forklift' in fps and gap(pad, fps['forklift']) > 1.0:
            bad('3.6 (5): the car pad is %.1f m from the forklift bay (at most 1)' % gap(pad, fps['forklift']))
    if 'batteryBox' in fps:
        for k in ('breaker', 'smelter'):
            if k in fps and gap(fps['batteryBox'], fps[k]) > 1e-6:
                bad('3.6 (5): the battery box does not touch the %s' % k)
    # (9) s2e-line: the hook-lift's swept path to a car's landing and away
    sw_errs, sw_rep = swept_path(s)
    errs += sw_errs
    rep += sw_rep
    # (6) the public and the van
    pb = WK['publicBay']
    bay = _r(pb['rect'], 'publicBay')
    lines = [_r(r) for r in M['driveLine']['rects']]
    keep = lines + [_r(r) for r in WK.get('forkliftZone', [])]
    gapm = WK.get('publicGap_m', 3)
    blockers = [r for r in sol if r['kind'] != 'fence']
    for name, path, inside_from in (('visitorPath', WK['visitorPath'], 0), ('vanPath', WK['vanPath'], None)):
        if inside_from is None:
            inside_from = next((i for i, p in enumerate(path) if abs(p[0] - W) < 1e-6), 0)
        for i in range(len(path) - 1):
            a, b = path[i], path[i + 1]
            for r in lines:
                if _seg_hits(a, b, r):
                    bad('3.6 (6): %s segment %d crosses the drive line' % (name, i))
            for r in blockers:
                if _seg_hits(a, b, r):
                    bad('3.6 (6): %s segment %d crosses %s' % (name, i, r['name']))
            for r in keep:
                g_ = _seg_gap(a, b, r)
                if g_ < gapm - 1e-6:
                    bad('3.6 (6): %s segment %d is %.1f m from a drive-line or forklift rect (at least %s)' % (name, i, g_, gapm))
            if i >= inside_from and not all(bay['x0'] - 1e-6 <= p[0] <= bay['x1'] + 1e-6 and bay['y0'] - 1e-6 <= p[1] <= bay['y1'] + 1e-6 for p in (a, b)):
                bad('3.6 (6): %s segment %d leaves the public bay' % (name, i))
    rails = [_r(r) for r in pb['rail']]
    nx = sorted((r['x0'], r['x1']) for r in rails if abs(r['y0'] - bay['y0']) < 1e-6 and r['x1'] - r['x0'] > r['y1'] - r['y0'])
    cover, x = [], bay['x0']
    for a, b in nx:
        if a > x + 1e-6:
            cover.append((x, a))
        x = max(x, b)
    if x < bay['x1'] - 1e-6:
        cover.append((x, bay['x1']))
    if [tuple(round(v, 6) for v in c) for c in cover] != [tuple(round(v, 6) for v in pb['staff'])]:
        bad('3.6 (6): the north rail is open at %s, only the staff gap %s may be' % (cover, pb['staff']))
    if pb['staff'][1] - pb['staff'][0] < GAP_MIN - 1e-6:
        bad('3.6 (6): the staff gap is %.1f m (M6: at least %.1f)' % (pb['staff'][1] - pb['staff'][0], GAP_MIN))
    wy = [r for r in rails if abs(r['x0'] - bay['x0']) < 1e-6 and r['y1'] - r['y0'] > r['x1'] - r['x0']]
    if not wy or min(r['y0'] for r in wy) > bay['y0'] + 1e-6 or max(r['y1'] for r in wy) < bay['y1'] - 1e-6:
        bad('3.6 (6): the west rail does not close the public bay')
    if not (bay['y0'] <= pb['wicket'][0] and pb['wicket'][1] <= bay['y1'] and abs(bay['x1'] - W) < 1e-6):
        bad('3.6 (6): the wicket is not in the east fence inside the public bay')
    van = WK.get('laneStops', {}).get('van')
    if not van or van[0] <= W:
        bad('3.6 (6): stops.van must stand outside the east fence (x > %s)' % W)
    # (7) M7's first view unchanged; the second hero frame
    for (Wp, Hp) in SIZES:
        if first_view(s, Wp, Hp)[0] != first_view(s0, Wp, Hp)[0]:
            bad('3.6 (7): the first view at %dx%d moves at rung 3' % (Wp, Hp))
    h = WK.get('heroWorks')
    if not h:
        bad('3.6 (7): map.works.heroWorks missing')
    else:
        hr = rect(h['x0'], h['y0'], h['x0'] + h['w'], h['y0'] + h['d'], 'heroWorks', 'frame')
        if h['w'] > 16.7 + 1e-6 or h['d'] > 9.7 + 1e-6:
            bad('3.6 (7): heroWorks is %s x %s m (at most 16.7 x 9.7: it holds at 667 x 375 and widens at 844 x 390)' % (h['w'], h['d']))
        if abs(h['y0'] - M['north']) > 1e-6:
            bad('3.6 (7): heroWorks does not start at the back wall')
        for k in h['places']:
            f = fps.get(k)
            if not f or f['x0'] < hr['x0'] - 1e-6 or f['x1'] > hr['x1'] + 1e-6 or f['y0'] < hr['y0'] - 1e-6 or f['y1'] > hr['y1'] + 1e-6:
                bad('3.6 (7): %s is not wholly inside heroWorks' % k)
        rep.append('heroWorks x %.1f..%.1f, y %.1f..%.1f holds %s' % (hr['x0'], hr['x1'], hr['y0'], hr['y1'], ', '.join(h['places'])))
    # (8) every bay a hall is charged from stands under a roof; the filter dust is in bags
    roofs = [_r(r, k) for k, r in WK.get('roofs', {}).items()]
    G = {**s['grades'], **(s.get('worksLayer') or {}).get('grades', {})}
    hall_in = sorted({g for p in plates.values() if p.get('kind') == 'batch' for r in (p.get('recipes') or {}).values() for g in r['in']})
    block = stillage_block(s)
    under = lambda x, y: any(r['x0'] - 1e-6 <= x <= r['x1'] + 1e-6 and r['y0'] - 1e-6 <= y <= r['y1'] + 1e-6 for r in roofs)
    for g in hall_in:
        bay_ = (G.get(g) or {}).get('bay') or {}
        if bay_.get('kind') == 'stillage' and str(bay_.get('place', '')).startswith('stillage'):
            if not all(under(r['x0'], r['y0']) and under(r['x1'], r['y1']) for r in block):
                bad('3.6 (8): %s feeds a hall from the first yard’s stillage block, which is not wholly under a roof' % g)
            continue
        pos = bay_slot_pos(s, g)
        if pos is None or not under(*pos):
            bad('3.6 (8): the bay of %s (%s) feeds a hall but stands under no roof' % (g, pos))
    if 'dust' in G and ((G['dust'].get('bay') or {}).get('kind') != 'bags'):
        bad('3.6 (8): the zinc filter dust is a bay of kind bags, never a bunker (T3)')
    return errs, rep


def car_path(s):
    """s2e-line (yard-stage2-economy.md 3.1; positions.ts tripPhasePath with a car's landing): the hook-lift's path with a car
    on the flatrack, inside the fence: the weighbridge's stop, the works road west to the turning loop (map.works.turnLoop),
    round it, east to the landing's stop beside the apron (stop `<plate>.apron`), and on to the park. Each leg as the rules'
    drivePath draws it inside the fence (along the first yard's polyline to its west end at the works road, then straight).
    None when the content sets no car down from the road. Returns (plate, landing stop, [legs of points])."""
    M = s['map']
    WK = M.get('_works') or {}
    plates = (s.get('works') or {}).get('plates', {})
    st = M.get('driveLine', {}).get('stops', {})
    for pid, p in plates.items():
        if p.get('kind') != 'station' or p.get('feedBy') != 'truck':
            continue
        L = st.get('%s.apron' % pid)
        if not L or 'weighbridge' not in st or 'park' not in st:
            return pid, None, []
        poly = [tuple(q) for q in M.get('driveLine', {}).get('points', [])]
        west_end = min(poly, key=lambda q: q[0]) if poly else None

        def drive(a, b):
            # positions.ts yardPath: a point off the polyline's corridor is reached from the polyline's nearest point
            pts = [a]
            if west_end and (a[0] > west_end[0] + 1e-9) != (b[0] > west_end[0] + 1e-9):
                pts.append(west_end)
            if west_end and b[0] > west_end[0] + 1e-9 and abs(b[1] - west_end[1]) > 2 + 1e-9:
                pts.append((b[0], west_end[1]))
            pts.append(b)
            return pts
        way = [tuple(st['weighbridge'])] + [tuple(q) for q in WK.get('turnLoop', [])] + [tuple(L)]
        legs = [drive(way[i - 1], way[i]) for i in range(1, len(way))]
        legs.append(drive(tuple(L), tuple(st['park'])))
        return pid, tuple(L), legs
    return None, None, []


def swept_path(s):
    """s2e-line, 3.6's swept path (yard-stage2-economy.md 3.1; the owner's review: no truck through people or buildings): the
    hook-lift with a flatrack (half-width truck.radius) on car_path: (a) every point of its swept band lies on the drive line
    (map.driveLine.rects of both layers); (b) it touches no solid, no place's footprint (but the drive line's own: the gate,
    the weighbridge, the merchant's stand, the park; and the landing's apron, which the car is set down on), no chalk circle
    and no waiting place (a person's place); (c) the whole path is inside the fence (truck.yardV applies: the rules' speed
    inside the fence); (d) no reversing: the path never turns back on itself (no two consecutive moves pointing against
    each other), so the car is set down driving forward and the truck leaves forward. Errors and a report."""
    errs, rep = [], []
    pid, L, legs = car_path(s)
    if pid is None:
        return errs, rep
    if L is None:
        return ['3.6 (9): the station %s is fed by the truck but map.works.driveLine.stops has no "%s.apron" (or no weighbridge or park stop)' % (pid, pid)], rep
    M = s['map']
    r = (s.get('truck') or {}).get('radius', 1.3)
    W = s['yard']['width']
    R = [rect(q['x0'], q['y0'], q['x0'] + q['w'], q['y0'] + q['d'], 'drive line', 'line') for q in M['driveLine']['rects']]
    inside = lambda x, y: any(q['x0'] - 1e-6 <= x <= q['x1'] + 1e-6 and q['y0'] - 1e-6 <= y <= q['y1'] + 1e-6 for q in R)
    F = M['footprints']
    allowed = {'gate', 'weighbridge', 'merchant', 'park', '%s.apron' % pid}
    keep = [(k, fp_rect(f, k, 'fp')) for k, f in F.items() if k not in allowed]
    keep += [(q['name'], q) for q in solids(s) if q['kind'] != 'fence']
    keep += [('circle %d' % i, rect(c[0] - c[2], c[1] - c[2], c[0] + c[2], c[1] + c[2], 'c', 'c')) for i, c in enumerate(M.get('circles', []))]
    keep += [('waiting place %s' % k, rect(x - 0.4, y - 0.4, x + 0.4, y + 0.4, k, 'wait')) for k, (x, y) in M['points'].items() if re.match(r'^wait\d+$', k)]
    pts = [p for leg in legs for p in leg]
    n_bad_band = 0
    hit = set()
    length = 0.0
    for leg in legs:
        for a, b in zip(leg, leg[1:]):
            d = math.dist(a, b)
            length += d
            n = max(1, int(math.ceil(d / 0.25)))
            for i in range(n + 1):
                x, y = a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n
                band = rect(x - r, y - r, x + r, y + r, 'band', 'band')
                if not all(inside(cx, cy) for cx, cy in ((x - r, y - r), (x + r, y - r), (x - r, y + r), (x + r, y + r), (x, y))):
                    n_bad_band += 1
                    if n_bad_band <= 3:
                        errs.append('3.6 (9): the hook-lift (half-width %.1f m) at (%.2f, %.2f) leaves the drive line' % (r, x, y))
                for k, q in keep:
                    if k not in hit and overlaps(band, q):
                        hit.add(k)
                        errs.append('3.6 (9): the hook-lift with a car at (%.2f, %.2f) touches %s' % (x, y, k))
    if n_bad_band > 3:
        errs.append('3.6 (9): ... %d more points of the swept path off the drive line' % (n_bad_band - 3))
    out = [p for p in pts if p[0] > W + 1e-6]
    if out:
        errs.append('3.6 (9): the car\'s path leaves the fence at %s (truck.yardV applies inside the fence only)' % (out[0],))
    if 'yardV' not in (s.get('truck') or {}):
        errs.append('3.6 (9): truck.yardV is missing: the car\'s drive inside the fence has no yard speed')
    moves = []
    for leg in legs:
        for a, b in zip(leg, leg[1:]):
            if math.dist(a, b) > 1e-6:
                moves.append(((b[0] - a[0]) / math.dist(a, b), (b[1] - a[1]) / math.dist(a, b), b))
    for (ux, uy, _), (vx, vy, at) in zip(moves, moves[1:]):
        if ux * vx + uy * vy < -1e-6:
            errs.append('3.6 (9): the hook-lift turns back on itself at (%.2f, %.2f): reversing (a loop is needed)' % at)
    land_in = [m for m in moves if abs(m[2][0] - L[0]) < 1e-6 and abs(m[2][1] - L[1]) < 1e-6]
    rep.append('swept path of the hook-lift with a car (half-width %.1f m): %.1f m from the weighbridge round the turning loop to %s.apron (stop %s) and to the park; %s' % (r, length, pid, L, 'clear' if not errs else '%d finding(s)' % len(errs)))
    if not land_in:
        errs.append('3.6 (9): the car\'s path never reaches the landing stop %s' % (L,))
    ap = F.get('%s.apron' % pid)
    if ap:
        a = fp_rect(ap, 'apron', 'fp')
        g_ = math.hypot(max(0.0, a['x0'] - L[0], L[0] - a['x1']), max(0.0, a['y0'] - L[1], L[1] - a['y1']))
        reach = (s.get('reach') or {}).get('place', 1.5) + r
        rep.append('the landing stop is %.1f m from the apron (the boss sets the car down within %.1f m)' % (g_, reach))
        if g_ > reach + 1e-6:
            errs.append('3.6 (9): the landing stop %s is %.1f m from %s.apron (more than reach.place + truck.radius %.1f)' % (L, g_, pid, reach))
    return errs, rep


# --------------------------------------------------------------------------- the picture

def picture(s, out):
    from PIL import Image, ImageDraw
    M = s['map']
    W, D = s['yard']['width'], s['yard']['depth']
    k = 22 if west(s) >= 0 else 14
    y_from = M.get('north', 0) - 2
    x0 = west(s)
    ox, oy = 30 - x0 * k, 30
    img = Image.new('RGB', (int((W - x0) * k + 60 + 40), int((D - y_from) * k + 2 * oy + 40)), (235, 232, 222))
    g = ImageDraw.Draw(img)

    def R(r):
        return [ox + r['x0'] * k, oy + (r['y0'] - y_from) * k, ox + r['x1'] * k, oy + (r['y1'] - y_from) * k]
    g.rectangle(R(rect(x0, south_face(s), W, D, '', '')), fill=(212, 208, 196))
    WK = M.get('_works')
    if WK:
        g.rectangle(R(_r(WK['publicBay']['rect'])), fill=(214, 232, 214))
        for r in WK.get('forkliftZone', []):
            g.rectangle(R(_r(r)), outline=(160, 120, 200), width=1)
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
    if WK:
        for kk, r in WK.get('roofs', {}).items():
            g.rectangle(R(_r(r)), outline=(40, 120, 200), width=2)
            g.text((ox + r['x0'] * k + 2, oy + (r['y0'] + r['d'] - y_from) * k - 11), 'roof', fill=(40, 120, 200))
        # s2e-line: the hook-lift's path with a car (3.6 (9)), and its swept band's edges
        _, _, legs = car_path(s)
        rr = (s.get('truck') or {}).get('radius', 1.3)
        for leg in legs:
            g.line([(ox + x * k, oy + (y - y_from) * k) for x, y in leg], fill=(230, 120, 0), width=2)
            for a, b in zip(leg, leg[1:]):
                g.rectangle([ox + (min(a[0], b[0]) - rr) * k, oy + (min(a[1], b[1]) - rr - y_from) * k, ox + (max(a[0], b[0]) + rr) * k, oy + (max(a[1], b[1]) + rr - y_from) * k], outline=(230, 160, 60), width=1)
        for name, path, colr in (('visitors', WK['visitorPath'], (0, 140, 0)), ('van', WK['vanPath'], (200, 0, 160))):
            g.line([(ox + x * k, oy + (y - y_from) * k) for x, y in path], fill=colr, width=3)
        vx, vy = WK.get('laneStops', {}).get('van', (W, D))
        g.ellipse([ox + vx * k - 5, oy + (vy - y_from) * k - 5, ox + vx * k + 5, oy + (vy - y_from) * k + 5], fill=(200, 0, 160))
        h2 = WK.get('heroWorks')
        if h2:
            hr2 = rect(h2['x0'], h2['y0'], h2['x0'] + h2['w'], h2['y0'] + h2['d'], '', '')
            g.rectangle(R(hr2), outline=(20, 150, 60), width=3)
            g.text((ox + hr2['x0'] * k + 4, oy + (hr2['y0'] - y_from) * k + 4), 'heroWorks', fill=(20, 150, 60))
        for kk, (x, y) in M['driveLine'].get('stops', {}).items():
            g.text((ox + x * k + 5, oy + (y - y_from) * k - 5), kk, fill=(150, 30, 20))
    for x in range(int(math.floor(x0 / 4) * 4), int(W) + 1, 4):
        g.text((ox + x * k - 4, oy + (D - y_from) * k + 6), str(x), fill=(0, 0, 0))
    for y in range(int(math.ceil(y_from)), int(D) + 1, 2):
        g.text((4, oy + (y - y_from) * k - 5), str(y), fill=(0, 0, 0))
    img.save(out)


def selftest():
    """Tests of the checks themselves: each broken content below must be refused (see the bottom of this file)."""
    return _selftest()


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
    if '--selftest' in argv:
        return selftest()
    works = '--works' in argv
    if works and merged(s) is None:
        print('map: the content has no map.works')
        return 1
    if '--routes' in argv:
        if works:
            m = merged(s)
            for kk, v in works_routes(m).items():
                print('      "%s": %s,' % (kk, v))
            for kk, v in routes(m).items():
                if abs(s['map']['routes'].get(kk, -99) - v) > 0.05:
                    print('      "%s": %s, // a first-yard walk the merged map changes' % (kk, v))
            return 0
        for kk, v in routes(s).items():
            print('      "%s": %s,' % (kk, v))
        return 0
    if '--png' in argv:
        picture(merged(s) if works else s, argv[argv.index('--png') + 1])
    errs, rep = check_works(s) if works else check(s)
    for r in rep:
        print(r)
    for e in errs:
        print('  [map] ' + e)
    print('map: %d finding(s)' % len(errs))
    return 1 if errs else 0


def _selftest(s=None):
    """Each case breaks the built content in one way; the checker must refuse it with the named finding."""
    base = s or _built()
    if not base['map'].get('works'):
        print('selftest: the built content has no map.works (run python3 scripts/content/build-yard.py)')
        return 1

    def place(c, k, x=None, y=None, w=None, d=None):
        W = c['map']['works']
        f = W['footprints'][k]
        if x is not None:
            f['x'] = x
        if y is not None:
            f['y'] = y
        if w is not None:
            f['w'] = W['places'][k]['w'] = w
        if d is not None:
            f['d'] = W['places'][k]['d'] = d
        W['points'][k] = [f['x'], f['y']]

    def staff12(c):
        pb = c['map']['works']['publicBay']
        pb['staff'] = [53.1, 54.3]
        pb['rail'][1]['x0'], pb['rail'][1]['w'] = 54.3, 9.7

    walked = {'floor-crane', 'stale walk'}
    def stop(c, k, xy):
        c['map']['works']['driveLine']['stops'][k] = xy

    def loop(c, pts):
        c['map']['works']['turnLoop'] = pts
    cases = [
        ('the staff gap 1.2 m (3.3)', staff12, 'staff gap is 1.2 m'),
        ('the rack back at x 56: 1.3 m to the west rail', lambda c: place(c, 'reuseRack', x=56), 'M6: 1.30 m between'),
        ('the depollution bay on the works road', lambda c: place(c, 'depollution', y=25), 'M4: depollution stands in the drive line'),
        ('the rotary filter a metre off its hall', lambda c: place(c, 'rotary.filter', x=-29.75), 'rotary does not touch its filter'),
        # s2e-line: the hook-lift's swept path (3.6 (9))
        ('the car landing\'s stop on the road\'s kerb (the truck brushes the apron\'s neighbour)', lambda c: stop(c, 'depollution.apron', [-10.75, 24.0]), 'leaves the drive line'),
        ('the battery box on the works road', lambda c: place(c, 'batteryBox', y=24.5), 'touches batteryBox'),
        ('no turning loop: the hook-lift turns back on itself', lambda c: loop(c, [[-50, 25.6], [-54, 25.6], [-50, 25.6]]), 'turns back on itself'),
        ('a loop out of the turning place', lambda c: loop(c, [[-50, 24.9], [-54.5, 24.9], [-54.5, 30.2], [-45, 30.2], [-45, 26.3]]), 'leaves the drive line'),
        ('the landing stop far from the apron', lambda c: stop(c, 'depollution.apron', [-30, 25.6]), 'from depollution.apron'),
        ('the visitors paying by the truck park', lambda c: c['map']['works'].__setitem__('visitorPath', [[64, 37.9], [61, 36.0], [64, 37.9]]), 'visitorPath segment 0 is'),
        ('the van walking through the yard', lambda c: c['map']['works'].__setitem__('vanPath', [[67.5, 28.6], [64, 30], [59.2, 39]]), 'vanPath segment'),
        ('bronze solids in an open bunker', lambda c: c['worksLayer']['grades']['bzs']['bay'].__setitem__('slot', 5), 'bay of bzs'),
        ('the zinc dust in a bunker', lambda c: c['worksLayer']['grades']['dust']['bay'].__setitem__('kind', 'bunker'), 'kind bags'),
        ('a hero frame of 20 m', lambda c: c['map']['works']['heroWorks'].__setitem__('w', 20), 'heroWorks is 20'),
        ('no opening for the works road in the field fence', lambda c: c['map']['works']['fence'].__setitem__('openings', [[34, 40]]), 'no opening the works road'),
        ('the rubble pile left on the works road', lambda c: c['map']['works']['drop'].__setitem__('props', ['wall-2', 'pile-1', 'pile-3']), 'prop pile-2 stands in the drive line'),
        ('a plant north of the back wall', lambda c: place(c, 'induction', y=15), 'induction'),
        ('a stale walk in map.works.routes', lambda c: c['map']['works']['routes'].__setitem__('scale-shredder', 50), 'map.works.routes.scale-shredder is 50'),
        ('the van stop inside the fence', lambda c: c['map']['works']['laneStops'].__setitem__('van', [62, 28.6]), 'stops.van must stand outside'),
    ]
    fails = 0
    e0, _ = check_works(base)
    if e0:
        print('selftest: the built content itself is refused:', e0[:3])
        fails += 1
    for name, mutate, want in cases:
        c = copy.deepcopy(base)
        mutate(c)
        errs, _ = check_works(c, walks=any(w in name or w in want for w in walked))
        ok = any(want in e for e in errs)
        print('%s refuses %s' % ('ok  ' if ok else 'FAIL', name) + ('' if ok else ' (wanted "%s"; got %s)' % (want, errs[:4])))
        fails += 0 if ok else 1
    print('selftest: %d case(s), %d failed' % (len(cases), fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
