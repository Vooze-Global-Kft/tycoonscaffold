#!/usr/bin/env python3
"""Finds venue opening costs that make the simulator's bot open each venue at a target time.

    python3 scripts/content/calibrate-venues.py

Income growth depends on everything else in the economy, so opening costs cannot be derived by
hand. This script searches for them one venue at a time (bisection on the cost), then prints the
list to paste into VENUE_UNLOCKS in build-pizza.py. Re-run it after any economy change.
The targets are for an attentive player who never stops; real players take longer.
"""
import json, os, subprocess, sys, math

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
GAME = 'pizza-empire'
# Minutes of play at which each venue (2nd, 3rd, ...) should open.
TARGET_MIN = [35, 75, 135, 240, 420, 720, 1200]
VENUE_IDS = [v['id'] for v in json.load(open(os.path.join(ROOT, 'docs/design/pizza-sim-content.json')))['venues']][1:]

def run(costs, hours):
    env = dict(os.environ, UNLOCKS=','.join(f'{c:.6g}' for c in costs))
    subprocess.run([sys.executable, os.path.join(ROOT, 'scripts/content/build-pizza.py')], env=env, check=True, stdout=subprocess.DEVNULL)
    out = subprocess.run(['npx', 'tsx', 'scripts/simulate.ts', GAME, '--hours', f'{hours:.3f}', '--json'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out.strip().splitlines()[-1])

costs = []
guess = 3e8
for k, target in enumerate(TARGET_MIN):
    vid = VENUE_IDS[k]
    lo, hi = None, None
    cost = guess
    best = None
    for it in range(14):
        marks = run(costs + [cost], target * 1.6 / 60 + 0.2)['marks']
        t = marks.get(f'OPEN VENUE {vid}')
        minutes = t / 60 if t is not None else None
        print(f'  venue {k + 2} ({vid}): cost {cost:.3g} -> {"%.1f min" % minutes if minutes is not None else "not opened"} (target {target})', flush=True)
        if minutes is not None and (best is None or abs(minutes - target) < abs(best[1] - target)):
            best = (cost, minutes)
        if minutes is not None and abs(minutes - target) / target < 0.03:
            break
        if minutes is None or minutes > target:
            hi = cost
        else:
            lo = cost
        if lo is not None and hi is not None:
            cost = math.sqrt(lo * hi)
        elif hi is None:
            cost *= 6
        else:
            cost /= 6
    costs.append(best[0] if best else cost)
    guess = costs[-1] * 100

print('\nVENUE_UNLOCKS = [' + ', '.join(f'{c:.2g}' for c in costs) + ']')
