#!/usr/bin/env python3
"""Builds games/space-miner/game.json: Orbit Haulers, a HAUL game (docs/design/space-design.md).

    python3 scripts/content/build-space.py && npx tsx scripts/validate.ts space-miner --no-sim

This script is the only source of the game's numbers and words (AGENTS.md: never hand-edit the
table). Fields it does not own (app ids, ad units, firebase, assets, store URLs) are kept from the
existing game.json.

CALIBRATED. Every number starts from the specification's starting value (sections 2.1 to 2.10,
5.1 to 5.4, with the Decisions applied); the (tune) numbers are knobs (TUNE below) moved inside
their stated ranges against section 8's targets by the balance bot (scripts/content/haul-bot.ts,
`npm run simulate -- space-miner --hours 12 --prestige`). Rules never move.

    python3 scripts/content/build-space.py --table    also prints the knob table and the worked
                                                      tables of section 2.12 (Decision 16)

Old saves: the game was never published. Its classic content (businesses, upgrades, the cast)
is gone, and the haul engine keeps its save under a new key (save:space-miner:haul1), so an old
classic save in a developer's browser is simply not read (specification, Decisions).
"""
import json, os, re, subprocess, sys

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
PATH = os.path.join(ROOT, 'games/space-miner/game.json')
g = json.load(open(PATH)) if os.path.exists(PATH) else {}
# OUT writes somewhere else (used by tuning runs, e.g. OUT=games/_tune/game.json).
PATH = os.environ.get('OUT', PATH)

# ---------------------------------------------------------------- the tuning knobs (section 8)
# Every number the specification marks (tune), with its stated range, and the value this script
# ships. A calibration run overrides one with the environment, TUNE_<name>=<value> (refused outside
# the range), writes to OUT=..., and plays it with `npm run simulate -- space-miner --file ...`.
# `--table` prints this table and the bot's worked tables (section 2.12, Decision 16).
TUNE = {}


def K(name, value, lo, hi, what, ship=None):
    """A (tune) number: the specification's starting `value`, its range, and the calibrated value shipped."""
    v = float(os.environ.get('TUNE_' + name, value if ship is None else ship))
    if not (lo - 1e-12 <= v <= hi + 1e-12):
        raise SystemExit(f'TUNE_{name}={v} is outside its range {lo} to {hi} ({what})')
    v = int(v) if v == int(v) else v
    TUNE[name] = {'spec': value, 'value': v, 'range': [lo, hi], 'what': what}
    return v

# ---------------------------------------------------------------- mode and what goes away
g['mode'] = 'haul'
# No shared sound pack: every sound is this game's own, in games/space-miner/assets/sfx (decision a).
g['soundPack'] = None
for gone in ('businesses', 'upgrades', 'cast', 'sim'):
    g.pop(gone, None)

app = g.setdefault('app', {})
app['displayName'] = 'Orbit Haulers'
app['slug'] = 'orbit-haulers'
# Bundle ids stay placeholders until the studio domain is known (specification open question 1,
# Decision 27): `com.example.orbithaulers`, named after the title, so only the prefix changes when the
# owner gives the studio's domain. validate --release refuses `example` (store-1). An id that is not a
# placeholder any more is kept.
for _k in ('iosBundleId', 'androidPackage'):
    if not app.get(_k) or app[_k].startswith('com.example.'):
        app[_k] = 'com.example.orbithaulers'
# The tracking-permission sentence (iOS NSUserTrackingUsageDescription; Decision 55): this game's own
# words, and honest about what the permission is for. app.config.ts reads app.trackingText.
app['trackingText'] = ('Orbit Haulers uses this to match the optional ads you can watch for a flare charge or a '
                       'Shift Log boost to your interests. Say no and the ads still play, only less matched.')

# ---------------------------------------------------------------- theme: deep-space-cold
theme = g.setdefault('theme', {})
theme['colors'] = {
    'background': '#060A16', 'backgroundAlt': '#0B1226', 'surface': '#121B33', 'primary': '#3FD8FF', 'primaryText': '#04111C',
    'accent': '#E07A3F', 'text': '#E6F1FF', 'textMuted': '#7F93B5', 'success': '#4BE58E', 'danger': '#FF6B6B', 'progress': '#3FD8FF',
    'gradient': ['#060A16', '#0B1226', '#12305A'],
}
theme['radius'] = 12
theme['scene'] = 'skia'
theme['heroIcon'] = 'art:freighter'
theme['particleIcon'] = 'art:credits'
theme['darkStatusBar'] = False
theme.pop('icons', None)

# ---------------------------------------------------------------- strings (7.1)
g['strings'] = {
    'currencyName': 'Credits', 'currencySymbol': '₵', 'currencyIcon': 'art:credits',
    'gemName': 'Dark Matter', 'gemIcon': 'art:dark-matter',
    'prestigeName': 'Warp Cores', 'prestigeIcon': 'art:warp-core', 'prestigeVerb': 'Jump',
    'prestigeDescription': 'Jump to a new galaxy. Spend Warp Cores on the Star Map. Pick the galaxy\'s conditions.',
}

# ---------------------------------------------------------------- economy (shared engine numbers)
g['economy'] = {
    'startingCash': 0,
    # No tapping in this game (9.2): taps earn nothing.
    'tapBase': 0, 'tapPercentOfIncome': 0,
    'milestones': [],
    # Cores = floor(scale x (lifetime / threshold)^0.5) (tune: first Jump at 2 h 15 to 2 h 45 with 20 to 30 cores).
    'prestige': {'threshold': K('prestigeThreshold', 2e6, 1e5, 1e10, 'lifetime credits per core squared (Decision 63: median seed\'s first Jump about 2 h 30)', 2.2e8),
                 'scale': K('coreScale', 5, 1, 20, 'cores scale'), 'exponent': 0.5, 'bonusPerPoint': 0},
    # Offline: 6 h at most, efficiency 0.45 at most (2.11).
    # (tune: maxHours 6); the efficiency is capped at 0.45 by the rules. The bot's gate is "offline per hour
    # at most 0.45 of active play from the same state", and active play from a state swings about 10 %
    # around activeRate (rock lives, seams), so the shipped efficiency sits under the cap.
    'offline': {'maxHours': K('offlineHours', 6, 4, 8, 'offline cap, hours'), 'efficiency': K('offlineEfficiency', 0.45, 0.3, 0.45, 'offline efficiency (at most 0.45)'), 'minSecondsToShow': 60},
    'boost': {'multiplier': 2, 'minutesPerAd': 30, 'maxMinutes': 240},
    # No daily ladder (Decision 53): an empty table means no daily gift (economy.dailyOffered); the day
    # shift on contracts (haul.shift) takes its place.
    'daily': {'gems': []},
    # Time Warp 2 h for 40 DM, priced with activeRate (4.6 Trade Post).
    'timeWarp': {'hours': 2, 'gemCost': 40},
}

# ---------------------------------------------------------------- the haul block (2.1 to 2.10)
# Ore values: iron 1, then each ring's ore worth `oreRatio<n>` times the last (tune: ratio per ring 4 to 6).
_R = [K('oreRatio2', 5, 4, 6, 'copper / iron'), K('oreRatio3', 5, 4, 6, 'ice / copper'), K('oreRatio4', 4.8, 4, 6, 'titanium / ice'),
      K('oreRatio5', 5, 4, 6, 'platinum / titanium')]
_V = [1]
for _r in _R:
    _V.append(round(_V[-1] * _r, 3))
    _V[-1] = int(_V[-1]) if _V[-1] == int(_V[-1]) else _V[-1]
ORES = [('iron', 'Iron', '#E07A3F', _V[0]), ('copper', 'Copper', '#3FC7A0', _V[1]), ('ice', 'Ice', '#7FD4FF', _V[2]),
        ('titanium', 'Titanium', '#C7A6FF', _V[3]), ('platinum', 'Platinum', '#F2E6B8', _V[4])]
# The share of a ring's own ore in its rock stream (the rest is the ring before's ore). Spec 70; a
# higher share narrows the ore lottery that makes one seed's first Jump an hour earlier than another's
# (Decision 45: the first Jump must land in its window on every seed).
_W = K('ringOreShare', 70, 60, 90, "share of a ring's own ore in its rock stream (rings 2 to 5)", 85)
_w = lambda own, prev: {own: _W, prev: 100 - _W}
RINGS = [
    ('Near Belt', 1.00, [-53, 53], 0.60, [150, 240], {'iron': 100}),
    ('Verdigris Reach', 1.73, [-36, 0, 36], 0.50, [240, 400], _w('copper', 'iron')),
    ('Frost Line', 2.45, [-26, -10, 26], 0.45, [360, 600], _w('ice', 'copper')),
    ('Lilac Drift', 3.18, [-18, 18], 0.40, [480, 800], _w('titanium', 'ice')),
    ('Pale Edge', 3.91, [-14, 14], 0.35, [600, 1100], _w('platinum', 'titanium')),
]
BUYERS = [('halden', 'Halden Yards'), ('corvo', 'Corvo Metals'), ('tessaly', 'Tessaly Ice Co.'),
          ('brightwater', 'Brightwater Foundry'), ('kade', 'Kade Refinery'), ('oriel', 'Oriel Labs')]
# One line each when a buyer's contract arrives and when it closes (7.3, 7.5). The screen fills {ore},
# {units} in the short format ("8.4K") and {mult} as "x1.8" (Decision 46: figures as figures).
BUYER_LINES = {
    'halden': ('Halden Yards, buying {ore}. {units} units. We pay {mult}.', 'Halden. Received in full. Call us again.'),
    'corvo': ('Corvo Metals. {units} {ore}, {mult} on the unit. Standing by.', 'Corvo Metals. Contract closed. Pleasure.'),
    # play:new:11: the slot names the speaker and drops a leading name, so the line must not lead with
    # the buyer's trade ('ICE COMPANY. 72 IRON.' read as a mistake when the order is iron).
    'tessaly': ('Tessaly. {units} {ore} wanted. Paying {mult}. Keep the hold sealed.', 'Tessaly. Manifest checks out. Logged.'),
    'brightwater': ('Brightwater Foundry. The furnace wants {ore}. {units} units at {mult}.', 'Brightwater. Furnace is fed. Out.'),
    'kade': ('Kade Refinery, line two. {units} {ore}. {mult}, no haggling.', 'Kade. Paid. We will call again.'),
    'oriel': ('Oriel Labs requesting {ore}. {units} units, any grade. Rate {mult}.', 'Oriel Labs. Samples received. Rate honoured.'),
}
GALAXIES = ['Cygnus Drift', 'Halden Reach', 'Morrow Belt', 'Tessaly Gap', 'Corvo Expanse', 'Brightwater Ring', "Kade's Shelf",
            'Oriel Spur', 'Vantor Deep', 'Selk Cluster', 'Ambry Field', 'Nolan Verge']

g['haul'] = {
    'names': {'station': 'Tamsin Station', 'ai': 'TALLY', 'drone': 'Drone', 'freighter': 'Freighter', 'rig': 'Rig', 'pod': 'Pod',
              'hold': 'Hold', 'flare': 'Survey Flare', 'contract': 'Contract', 'buyer': 'Buyer', 'galaxy': 'Galaxy', 'rockPrefix': 'T-'},
    'ores': [{'id': i, 'name': n, 'color': c, 'value': v} for i, n, c, v in ORES],
    'rings': [{'name': n, 'distance': d, 'slots': s, 'drill': r, 'life': l, 'weights': w} for n, d, s, r, l, w in RINGS],
    # Decision 58: the first rock of each ring-1 slot in galaxy 1 lasts at least ten minutes of drilling,
    # so the tutorial's rig level is not spent on a rock about to dry.
    'start': {'pile': K('startPile', 8, 5, 10, 'units on slot 0 at the start'), 'drones': 1, 'firstLife': 600},
    'rig': {
        'levelGrowth': K('rigLevel', 1.35, 1.25, 1.45, 'drill per rig level', 1.4),
        'tiers': [
            {'level': 4, 'name': 'Dual Bit', 'drill': 2},
            {'level': 10, 'name': 'Deep Bore', 'drill': 2, 'life': 1.5},
            {'level': 20, 'name': 'Seam Detector', 'drill': 2, 'seamWeight': 3},
            {'level': 35, 'name': 'Twin Rig', 'drill': 2, 'pileCap': 2},
        ],
        'stripeEvery': 15, 'stripeMult': 1.5,
        'cost': {'base': 3, 'ringFactor': 40, 'growth': K('rigGrowth', 1.6, 1.45, 1.8, 'rig cost growth', 1.6)},
    },
    'claim': {'base': K('claimBase', 13, 10, 40, 'claim cost of ring 1 slot 0 (tune, no range stated: 10 to 40 assumed)', 14), 'ringFactor': K('claimRing', 20, 15, 30, 'claim cost per ring', 15), 'jFactor': K('claimJ', 1.6, 1.4, 2.5, 'claim cost per slot within a ring', 1.5)},
    'pile': {'min': 10, 'seconds': 25},
    'drone': {
        # Decision 44: a drone must carry more than a level-2 ring-1 rig drills, or the tutorial's rig step pays nothing.
        'speed': 0.5, 'speedPerLevel': 0.08, 'speedMax': 4, 'capacity': K('droneCapacity', 4, 4, 6, 'units a drone carries at capacity level 1 (Decision 44)', 5),
        # Section 8's knob for haul-bound routes (raise capacity growth); not marked (tune) in 2.3, kept near it.
        'capacityGrowth': K('capacityGrowth', 1.25, 1.2, 1.35, 'drone capacity per level (knob: haul binds)'), 'loadSeconds': 0.6, 'unloadSeconds': 0.6,
        'cost': {'base': 10, 'growth': K('droneGrowth', 1.45, 1.35, 1.6, 'drone cost growth (knob: fleet taps)')},
        'capacityCost': {'base': 30, 'growth': K('capacityCostGrowth', 1.55, 1.45, 1.8, 'capacity cost growth (knob: fleet taps)')},
        'engineCost': {'base': 60, 'growth': 2.0},
        'capBase': 24, 'capPerGalaxy': 4,
    },
    'freighter': {
        # Decision 44: two worked ring-1 rocks must not fill the first freighter (12 units every 12.5 s left
        # step 6's rig upgrade worth nothing), so level 1 carries more than the specification's 12.
        'capacity': K('freighterCap', 12, 12, 24, 'freighter capacity at level 1 (Decision 44: the tutorial rig step must pay)', 20), 'growth': 1.45, 'cost': {'base': 15, 'growth': K('freighterGrowth', 1.6, 1.45, 1.8, 'freighter cost growth (knob: freighter binds)', 1.5)},
        'away': [{'from': 1, 'seconds': 8}, {'from': 10, 'seconds': 12}, {'from': 25, 'seconds': 16}],
        'climb': 2.5, 'land': 2, 'fullBonus': 1.1, 'hulls': [1, 10, 25, 50], 'segmentEvery': 25, 'segmentMax': 8,
    },
    'autopilot': {'cost': K('autopilot', 90, 80, 110, 'Dock Autopilot price')},
    'respawnSeconds': 6,
    'bonanza': {'chance': K('bonanza', 0.04, 0.03, 0.06, 'bonanza chance of a new rock', 0.06), 'drill': K('bonanzaDrill', 2, 2, 3, 'bonanza drill (knob: run 2)', 3), 'life': 1.5},
    # The first rich seam of the first galaxy comes at 150 s (Decision 44); every later galaxy's run as before.
    'seam': {'first': 150, 'firstLater': 360, 'interval': [K('seamMin', 90, 60, 90, 'seam interval, low end (knob: drags)'), K('seamMax', 150, 100, 150, 'seam interval, high end (knob: drags)')], 'duration': 40, 'drill': 3, 'pileCap': 2, 'senseInterval': 10, 'senseDuration': 5, 'minInterval': 30},
    'flare': {'refillSeconds': 1800, 'firstAt': 600, 'maxStored': 1, 'adsPerDay': 3, 'adGapMinutes': 20},
    'contracts': {
        'unlockLaunches': 4, 'unlockClock': 90, 'board': 3,
        # Decisions 40 and 56: a taken contract is delivered over `launches` warp-outs (6: the play-test used
        # three of four just reading the board); an offer ages one launch of `offerLaunches` per warp-out.
        # Offers are drawn from what the station has really shipped (`recent`, over `recentLaunches`):
        # "raise it" asks L x recent x (1 + g), g in `raise`; the second ore of a two-ore contract "holds it"
        # at L x recent x U(holdShare). Difficulty is tuned with the raise, never with the count.
        'launches': int(K('contractLaunches', 6, 4, 8, 'warp-outs a taken contract has to deliver everything (Decision 56: 6)', 6)),
        'offerLaunches': int(K('offerLaunches', 12, 8, 16, 'warp-outs an offer stays on the board')),
        'raise': [K('raiseLo', 0.25, 0.1, 0.5, 'contract raise over what the station ships, low end (Decision 56)'), K('raiseHi', 0.6, 0.3, 1.0, 'contract raise, high end (Decision 56)')],
        'holdShare': [0.85, 0.95],
        'raiseMult': K('raiseMult', 1, 0, 2, 'contract multiplier added per unit of raise (a harder contract pays more)', 0.1),
        'maxShare': 0.9, 'minValueShare': 0.1, 'minBonusSeconds': 10, 'recentLaunches': 6,
        'fee': K('fee', 0.1, 0.05, 0.15, 'delivery fee on the rest of a met cargo'),
        # Read only by the legacy contractStation helper (Decision 63: the bot routes without a budget). `margin` and `reach` are gone
        # with Decision 56 (the schema still parses them from old data).
        'fleetShare': K('fleetShare', 0.5, 0.3, 0.7, 'legacy: share of the fleet contractStation sends (the bot no longer reads it)'),
        'minUnits': 3, 'twoOreChance': 0.4,
        'mult': [round(1 + (m - 1) * K('contractMultScale', 1, 0.1, 1, 'contract multipliers: share of the specification\'s mark-up over x1 (Decision 63)', 0.2), 2) for m in (1.6, 1.9, 2.2, 2.6, 3.0)],
        # Decision 63: with the mark-ups this low, a jitter of 0.1 would draw "x1.0" in ring 1.
        'jitter': K('contractJitter', 0.1, 0, 0.2, 'contract multiplier jitter (each side)', 0.05),
        'first': {'buyer': 0, 'ore': 'iron', 'units': 10, 'mult': 1.5},
        # `calls` and `closed` wait for the rules' buyer schema to carry them (balance report, "For other owners").
        'buyers': [{'id': i, 'name': n, 'calls': BUYER_LINES[i][0], 'closed': BUYER_LINES[i][1]} for i, n in BUYERS],
    },
    # Decision 53: the first `contracts` contracts met in each shift pay their bonus `mult` times.
    'shift': {'contracts': 3, 'minHours': 16, 'mult': 2},
    # rules-3: re-tuned against section 8's pods-per-hour target after Decision 40 (a contract met is no longer rare).
    'pods': {'scrap': 'scrap', 'derelict': 'derelict', 'depletedEvery': int(K('podsDepleted', 6, 4, 16, 'a Scrap Pod every n-th dry rock (pods per hour)', 8)),
             'contractsEvery': int(K('podsContracts', 4, 4, 16, 'a Scrap Pod every n-th contract met (pods per hour)', 8)), 'transmissionsEvery': 4},
    # Decision 59: every condition's lines put the upside first (cards and the arrival line read them in order).
    'conditions': [
        # Frost Surplus: rings 3 and 4 (ring 2 has no ice; Decisions).
        {'id': 'frost', 'name': 'Frost Surplus', 'lines': ['Ice value x2', 'Ice weight x3 on rings 3 and 4'], 'oreValue': {'ice': 2},
         'oreWeight': [{'ore': 'ice', 'rings': [3, 4], 'mult': 3}]},
        {'id': 'solar', 'name': 'Solar Wind', 'lines': ['Drone speed x1.4', 'Rock life x0.5'], 'speed': 1.4, 'life': 0.5},
        {'id': 'storms', 'name': 'Seam Storms', 'lines': ['Rich seams twice as often'], 'interval': 0.5},
        {'id': 'longhaul', 'name': 'Long Haul', 'lines': ['Contract multipliers +0.3', 'Distances x1.3'], 'distance': 1.3, 'contractAdd': 0.3},
        {'id': 'heavy', 'name': 'Heavy Ore', 'lines': ['All ore values x2', 'Drone capacity x0.75'], 'capacity': 0.75, 'oreValue': {'*': 2}},
        {'id': 'hotcore', 'name': 'Hot Cores', 'lines': ['Drill x1.5', 'Pile cap x0.6'], 'drill': 1.5, 'pileCap': 0.6},
    ],
    'starMap': {
        'nodes': [
            {'id': 'prospect', 'name': 'Prospect Survey', 'arm': 'survey', 'effect': 'bonanza', 'per': 0.94, 'base': 2, 'growth': 1.25, 'cap': 11, 'part': 'surveyArray', 'lines': ['More bonanza rocks in the stream.', 'Half of all rocks at most.']},
            {'id': 'veinsense', 'name': 'Seam Sense', 'arm': 'survey', 'effect': 'seamSense', 'base': 2, 'growth': 1.4, 'cap': 5, 'part': 'scannerDish', 'lines': ['Rich seams come 10 s sooner.', 'Each one lasts 5 s longer.']},
            {'id': 'assay', 'name': 'Assay Rights', 'arm': 'survey', 'effect': 'orePrice', 'per': 0.1, 'base': 1, 'growth': 1.3, 'cap': 5, 'part': 'assayLab', 'lines': ['+10 % on every unit sold.']},
            {'id': 'brokerseat', 'name': 'Broker Seat', 'arm': 'trade', 'effect': 'contractMult', 'per': 0.1, 'base': 2, 'growth': 1.35, 'cap': 5, 'part': 'antennaMast', 'lines': ['+0.1 on every met contract.']},
            {'id': 'seedcredits', 'name': 'Seed Credits', 'arm': 'trade', 'effect': 'seedCredits', 'per': 10, 'base': 1, 'growth': 1.4, 'cap': 6, 'part': 'vaultBlock', 'lines': ['Each run opens with credits in the vault.']},
            {'id': 'preload', 'name': 'Systems Preload', 'arm': 'fleet', 'effect': 'preload', 'base': 5, 'growth': 1, 'cap': 1, 'part': 'beacon', 'lines': ['The Dock Autopilot is online from the first second.']},
            {'id': 'sparedrones', 'name': 'Spare Drones', 'arm': 'fleet', 'effect': 'spareDrones', 'per': 1, 'base': 2, 'growth': 1.4, 'cap': 6, 'part': 'hangar', 'lines': ['+1 idle drone on the rack at every run start.']},
            {'id': 'afterburner', 'name': 'Afterburner', 'arm': 'fleet', 'effect': 'headStart', 'base': 2, 'growth': 1.5, 'cap': 6, 'part': 'boosterRing', 'lines': ['Runs open with near slots claimed.', 'Head-start rigs come fitted with a Dual Bit.']},
        ],
        'headStart': [[0, 1], [0, 1, 2], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 4, 5, 6, 7, 8]],
        # Section 8's knob for run 2 (raise the Afterburner head start): the head-start rig level.
        'headStartRig': int(K('headStartRig', 4, 4, 10, 'rig level of head-start slots (knob: run 2)', 6)),
    },
    'galaxies': {'names': GALAXIES},
    'modules': [
        {'card': 'diamondbit', 'socket': 'rig', 'stat': 'drillRate'},
        {'card': 'bayracks', 'socket': 'fleet', 'stat': 'haulerCapacity'},
        {'card': 'thrusters', 'socket': 'fleet', 'stat': 'haulerSpeed'},
        {'card': 'clamps', 'socket': 'dock', 'stat': 'freighterCapacity'},
        {'card': 'chute', 'socket': 'rig', 'stat': 'overflowSpill'},
        {'card': 'keeper', 'socket': 'dock', 'stat': 'metCarryover'},
        {'card': 'sorter', 'socket': 'fleet', 'stat': 'contractOreCapacity'},
        {'card': 'quickclamp', 'socket': 'dock', 'stat': 'metReturn', 'cap': 0.5},
    ],
    'hangar': {'product': 'space_hangar', 'droneCap': 6, 'startDrones': 2},
    # Decision 42: the Shift Log's ad adds `adBonus` (not a double), and the gate counts it; the cap sits
    # under 0.45 so the gate holds with margin on every seed (Decision 45).
    'offline': {'efficiencyCap': K('efficiencyCap', 0.45, 0.25, 0.45, 'offline efficiency cap of the haul rules (gate measured with the ad bonus)'),
                'rockLoopMax': 2000, 'adBonus': 0.5},
}

# ---------------------------------------------------------------- cast: call signs, no people drawn (7.3)
g['characters'] = [
    {'id': 'tally', 'name': 'TALLY', 'portrait': 'mach:tally', 'color': '#3FD8FF'},
    {'id': 'ops2', 'name': 'OPS-2', 'portrait': 'mach:ops2', 'color': '#FFB23F'},
    {'id': 'dispatch', 'name': 'DISPATCH', 'portrait': 'mach:dispatch', 'color': '#4BE58E'},
] + [{'id': i, 'name': n, 'portrait': f'mach:buyer-{i}'} for i, n in BUYERS]

# Story beats (7.4): comms-slot lines, each once ever.
g['story'] = [
    # No `start` beat: guided step 1 voices that line itself (play-1, store-9: it played a second time).
    {'id': 'first_launch', 'characterId': 'ops2', 'trigger': {'type': 'launches', 'count': 1}, 'lines': ['Freighter away. Credits in. That is the job.']},
    {'id': 'contracts', 'characterId': 'dispatch', 'trigger': {'type': 'contracts'}, 'lines': ['Buyers are calling. Their contracts go on the strip.']},
    {'id': 'autopilot', 'characterId': 'ops2', 'trigger': {'type': 'system'}, 'lines': ['Autopilot has the pad. It ships the way you set it.']},
    {'id': 'ring2', 'characterId': 'dispatch', 'trigger': {'type': 'ring', 'ring': 2}, 'lines': ['Copper buyers on the board. Ring 2 is in range.']},
    {'id': 'ring3', 'characterId': 'tally', 'trigger': {'type': 'ring', 'ring': 3}, 'lines': ['Frost Line. Ice sells. Bring capacity.']},
    {'id': 'ring4', 'characterId': 'ops2', 'trigger': {'type': 'ring', 'ring': 4}, 'lines': ['Lilac Drift in range. Titanium, long trips. Engines earn their keep out there.']},
    {'id': 'ring5', 'characterId': 'dispatch', 'trigger': {'type': 'ring', 'ring': 5}, 'lines': ['Pale Edge. Platinum. Halden says they will take all of it.']},
    {'id': 'jump_ready', 'characterId': 'tally', 'trigger': {'type': 'jumpReady', 'cores': 20}, 'lines': ['Long-range scan done. Three galaxies in reach. Your call.']},
    {'id': 'galaxy1', 'characterId': 'ops2', 'trigger': {'type': 'galaxy', 'index': 1}, 'lines': ['New sky, same pad. Station is yours.']},
]

# ---------------------------------------------------------------- meta: modules, pods, missions (5.1 to 5.3)
SOCKET_ICON = {'rig': 'art:rig', 'fleet': 'art:drone', 'dock': 'art:freighter'}
MODULES = [
    ('diamondbit', 'Diamond Bit', 'Drill head', 'common', 'rig', 'Cuts faster. Wears out never.'),
    ('bayracks', 'Bay Racks', 'Cargo rack', 'common', 'fleet', 'Two more bins per drone.'),
    ('thrusters', 'Tuned Thrusters', 'Thruster pack', 'common', 'fleet', 'Same fuel, shorter trips.'),
    ('clamps', 'Cargo Clamps', 'Dock clamp', 'common', 'dock', 'Holds the manifest steady.'),
    ('chute', 'Overflow Chute', 'Rig chute', 'rare', 'rig', 'Nothing waits at a full pile.'),
    ('keeper', 'Contract Keeper', 'Dock ledger', 'rare', 'dock', 'Good buyers talk to each other.'),
    ('sorter', 'Ore Sorter', 'Fleet sorter', 'epic', 'fleet', 'Packs the ore the buyer asked for.'),
    ('quickclamp', 'Quick Clamp', 'Dock clamp', 'epic', 'dock', 'Paid in full, cleared at once.'),
]


def pod(pid, name, tier, slots, weights, rarity):
    return {'id': pid, 'name': name, 'icon': f'art:pod-{pid}', 'tier': tier, 'slots': slots,
            'slotWeights': {'card': weights[0], 'gems': weights[1], 'cash': weights[2]},
            'rarityWeights': {'common': rarity[0], 'rare': rarity[1], 'epic': rarity[2], 'legendary': 0},
            'cardCopies': {'common': [1, 3], 'rare': [1, 2], 'epic': [1, 1], 'legendary': [1, 1]},
            'gems': [2, 5], 'cashSeconds': [120, 120]}


MISSIONS = [
    ('move', 'hauled', 'DISPATCH: Move {n} units. Any ore.', [40, 150, 400, 1000, 2500, 6000], 2),
    ('ship', 'launches', 'OPS-2: Clear the pad {n} times.', [3, 8, 15, 25, 40], 2),
    # Plural-free where a target can be 1 (play-16): the shared mission code only fills {n}.
    ('close', 'contracts', 'DISPATCH: Contracts to close: {n}.', [1, 3, 6, 10, 16], 3),
    ('dry', 'depleted', 'TALLY: Work {n} rocks dry.', [2, 5, 10, 18, 30], 3),
    ('seam', 'seamDrags', 'TALLY: Put {n} drones on rich seams.', [2, 4, 8, 12], 4),
    ('claim', 'claims', 'DISPATCH: New slots to claim: {n}.', [1, 2, 3, 5], 3),
    ('earn', 'earn', 'OPS-2: Bank {n} seconds of income.', [30, 120, 300, 600, 1200], 2),
    ('rigs', 'levels', 'TALLY: Add {n} rig levels.', [2, 5, 10, 20, 35], 2),
    ('salvage', 'chests', 'OPS-2: Pods to open: {n}.', [1, 2, 4, 6], 3),
]

g['meta'] = {
    'cards': [{'id': i, 'name': n, 'title': t, 'icon': SOCKET_ICON[s], 'rarity': r, 'stat': 'stationValue', 'flavor': f} for i, n, t, r, s, f in MODULES],
    'cardEffect': {'common': {'base': 5, 'perLevel': 3}, 'rare': {'base': 10, 'perLevel': 5}, 'epic': {'base': 15, 'perLevel': 6}, 'legendary': {'base': 20, 'perLevel': 8}},
    # Parts per module level: this game's own curve (Decision 54), not the first game's 2 x 1.5^n.
    'cardCopies': {'base': K('partsBase', 3, 2, 4, 'module parts for level 2'), 'growth': K('partsGrowth', 1.35, 1.25, 1.45, 'module parts growth per level')},
    'chests': [pod('scrap', 'Scrap Pod', 'wood', 2, (80, 10, 10), (80, 18, 2)), pod('derelict', 'Derelict Cache', 'silver', 3, (85, 15, 0), (62, 30, 8))],
    'freeChest': {'chestId': 'scrap', 'everyHours': 3, 'stored': 3, 'firstMinutes': [15, 45]},
    'pity': {'epic': 8},
    'chestGrowthPerVenue': 0,  # a shared schema key (no venues in this game); 0 keeps pod contents flat
    'chestsForSale': False,
    'missions': {
        'slots': 2, 'perDay': 6,
        'templates': [{'id': i, 'type': t, 'text': x, 'targets': ts, 'reward': {'type': 'gems', 'amount': dm}} for i, t, x, ts, dm in MISSIONS],
        'milestones': [],
    },
    'deals': [],
    'dailyShop': {'slots': 3, 'offers': []},
}

# ---------------------------------------------------------------- purchases (5.4): a different kind sequence from Pizza's
# Fallback prices (what the screens show before the store answers; the real prices are set in the two
# consoles) use none of the first game's price points (Decision 54): $6.49, $4.49, $3.49, $2.49, $8.49.
mon = g.setdefault('monetization', {})
mon.setdefault('ads', {'forceTestAds': True})
mon['ads']['showBanner'] = False
# No interstitial ads in the first version (5.4; lead's integration decision 4): no path may show one.
mon['ads']['interstitials'] = False
mon['iap'] = {**mon.get('iap', {}), 'products': [
    {'id': 'space_clearance', 'title': 'Clearance', 'description': 'Every ad reward without watching the ad.', 'kind': 'clearance', 'icon': 'art:rail-trade', 'fallbackPrice': '$6.49'},
    {'id': 'space_hangar', 'title': 'Hangar Expansion', 'description': '+6 drone cap and 2 idle drones at every run start.', 'kind': 'unlock', 'icon': 'art:drone', 'fallbackPrice': '$4.49'},
    {'id': 'space_charter', 'title': 'Prospector Charter', 'description': '150 Dark Matter and 5 Ore Sorter parts. Once.', 'kind': 'starterPack', 'value': 150, 'icon': 'art:warp-core',
     'contents': [{'type': 'gems', 'amount': 150}, {'type': 'card', 'cardId': 'sorter', 'copies': 5}], 'fallbackPrice': '$3.49'},
    {'id': 'space_dm_150', 'title': 'Fuel Cell', 'kind': 'gems', 'value': 150, 'icon': 'art:dark-matter', 'fallbackPrice': '$2.49'},
    {'id': 'space_dm_700', 'title': 'Fuel Tank', 'kind': 'gems', 'value': 700, 'icon': 'art:dark-matter', 'fallbackPrice': '$8.49'},
]}

# ---------------------------------------------------------------- store page (7.6)
# The listing text lives in scripts/content/space-store.json (owned by the tooling-and-store package,
# docs/design/space-build-plan.md); this script copies it in. Fields it does not list are kept.
listing = json.load(open(os.path.join(ROOT, 'scripts/content/space-store.json')))
store = g.setdefault('store', {})
store.update({k: v for k, v in listing.items() if not k.startswith('_')})
# Both stores need a privacy policy link on the listing and in the app (Apple 5.1.1, Google's Data
# safety form). A placeholder until the owner gives the real page (play-13, store-0): validate warns
# about example.com, and --release fails on it.
if not store.get('privacyPolicyUrl'):
    store['privacyPolicyUrl'] = 'https://example.com/privacy'

# ---------------------------------------------------------------- the voice check (7.5)
# Every text a player reads from this file and from the mode's string table: no exclamation marks,
# no praise, no puns on the other game's food words, a radio line short enough for two rows.
BANNED = re.compile(r"!|\b(amazing|awesome|great job|well done|yummy|tasty|delicious|pizza|slice|chef|restaurant|customer|order up)\b", re.I)


def texts(x, out):
    if isinstance(x, str):
        out.append(x)
    elif isinstance(x, dict):
        for k, v in x.items():
            if k not in ('id', 'icon', 'portrait', 'color', 'part', 'effect', 'socket', 'stat', 'card', 'tier', 'kind', 'ore', 'chestId', 'heroIcon', 'particleIcon',
                         'currencyIcon', 'gemIcon', 'prestigeIcon', 'type', 'characterId', 'arm', 'product', 'scene', 'rockPrefix'):
                texts(v, out)
    elif isinstance(x, list):
        for v in x:
            texts(v, out)
    return out


voice = texts({k: g[k] for k in ('strings', 'haul', 'characters', 'story', 'meta')}, [])
voice += re.findall(r":\s*'([^']+)'", open(os.path.join(ROOT, 'src/ui/haul/strings.ts')).read())
bad = [t for t in voice if BANNED.search(t)]
long = [b['lines'] for b in g['story'] if sum(len(l) for l in b['lines']) > 96]
if bad or long:
    raise SystemExit('voice check (spec 7.5) failed:\n  ' + '\n  '.join([f'banned word or "!": {t}' for t in bad] + [f'story line over two rows: {t}' for t in long]))

json.dump(g, open(PATH, 'w'), indent=2, ensure_ascii=False)
open(PATH, 'a').write('\n')
print('wrote', PATH, '(mode haul)')

# ---------------------------------------------------------------- --table: the worked numbers (2.12, Decision 16)
if '--table' in sys.argv:
    print('\n**Tuning knobs (section 8; "spec" is the specification\'s starting value):**\n')
    print('| Knob | What | Range | Spec | Shipped |')
    print('|---|---|---|---|---|')
    for k, v in TUNE.items():
        print(f"| {k} | {v['what']} | {v['range'][0]} to {v['range'][1]} | {v['spec']} | {v['value']}{'' if v['value'] == v['spec'] else ' *'} |")
    print()
    env = dict(os.environ, NODE_OPTIONS='--max-old-space-size=3000')
    r = subprocess.run(['npx', 'tsx', 'scripts/simulate.ts', 'space-miner', '--file', PATH, '--hours', '4', '--prestige', '--table'], cwd=ROOT, env=env, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(r.stderr[-2000:])
    print(r.stdout)
