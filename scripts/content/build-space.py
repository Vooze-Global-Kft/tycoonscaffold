#!/usr/bin/env python3
"""Builds games/space-miner/game.json (a CLASSIC game) from the content and formulas in this file.

    python3 scripts/content/build-space.py && npx tsx scripts/simulate.ts space-miner --hours 12

Every business number is derived from the formulas below, not copied from any other game, so
the table can be re-tuned in one place. Fields this script does not own (app ids, monetization
ad units, firebase, assets) are kept from the existing game.json.

Pacing targets (checked with the simulator's bot, an attentive player who never stops):
  first automation hire within 2 min, last business unlocked at 60 to 90 min,
  first prestige available at 2 to 5 h, no gap over 25 min between notable purchases in the first 3 h.
Measured (npx tsx scripts/simulate.ts space-miner --hours 12): first hire 0:49, last business
(Sun Collector Array) 1:07, first Warp Core 2:13, longest gap 23:40 (ending 2:28), last purchase
2:28; from there the next move is the reset (with --prestige the bot jumps at 2:49).
Knobs are environment variables, e.g. `PB=2.6 python3 scripts/content/build-space.py`; a random
search over them is how the defaults below were found.
"""
import json, os
from math import floor, log10

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
PATH = os.path.join(ROOT, 'games/space-miner/game.json')
g = json.load(open(PATH)) if os.path.exists(PATH) else {}
# OUT writes somewhere else (used by tuning runs, e.g. OUT=games/_tune/game.json).
PATH = os.environ.get('OUT', PATH)
E = lambda k, d: float(os.environ.get(k, d))


def tidy(x):
    """Round to 2 significant digits so numbers in the UI look hand-picked."""
    if x == 0:
        return 0
    d = floor(log10(abs(x)))
    f = 10 ** (d - 1)
    v = round(x / f) * f
    return int(v) if v >= 10 else round(v, 2)


# ---------------------------------------------------------------- businesses
# Tier i (0-based), all derived from the constants below:
#   first unit cost   C_i = C0 * prod_{k<i} (K0 + DK*k)     the step between tiers widens with i
#   payback seconds   P_i = P0 * PB^i                       first unit's cost / its output per second,
#                     before milestones: each tier pays back PB times more slowly than the one before,
#                     so early tiers give quick wins and later ones are long goals, without a wall
#   output per cycle  C_i / P_i * cycle_i
#   cycle seconds     T0 * TS^i, rounded to 0.1 s
#   cost growth       G0 + DG*i per unit bought (later tiers get steeper)
#   automation hire   C_i * H0 * HS^i
C0, K0, DK = E('C0', 6), E('K0', 19), E('DK', 7)
P0, PB = E('P0', 5.4), E('PB', 2.5)
T0, TS = E('T0', 1.1), E('TS', 2.09)
G0, DG = E('G0', 1.105), E('DG', 0.0075)
H0, HS = E('H0', 32), E('HS', 1.25)

BUSINESSES = [
    # id, name, icon, flavor, manager name, manager icon
    ('drill', 'Hand Drill', '⛏️', 'Point at rock. Pull trigger.', 'Unit D-1', '🤖'),
    ('rover', 'Mining Rover', '🚙', 'Six wheels, one scoop, no brakes.', 'Rover Pilot Ixa', '🤖'),
    ('refinery', 'Ore Refinery', '🏭', 'Rock goes in. Shiny comes out.', 'Smelt-O-Tron', '🧠'),
    ('freighter', 'Ore Freighter', '🚀', 'Hauls a mountain to market every trip.', 'Captain Byte', '👩‍✈️'),
    ('moon_base', 'Moon Base', '🌑', 'A quarry with a view.', 'Commander Vega', '🧑‍🚀'),
    ('ring_yard', 'Ring Shipyard', '🪐', 'Builds the haulers that build the haulers.', 'Yardmaster Oku', '👷'),
    ('sun_array', 'Sun Collector Array', '☀️', 'A billion mirrors turning starlight into credits.', 'The Array Mind', '🛰️'),
]

businesses = []
cost = C0
for i, (bid, name, icon, flavor, mname, micon) in enumerate(BUSINESSES):
    if i > 0:
        cost *= K0 + DK * (i - 1)
    cycle = round(T0 * TS ** i, 1)
    payback = P0 * PB ** i
    businesses.append({
        'id': bid, 'name': name, 'icon': icon, 'flavor': flavor,
        'baseCost': tidy(cost), 'costGrowth': round(G0 + DG * i, 3),
        'baseRevenue': tidy(cost / payback * cycle), 'cycleSeconds': cycle,
        'managerCost': tidy(cost * H0 * HS ** i), 'managerName': mname, 'managerIcon': micon,
    })
g['businesses'] = businesses
g['mode'] = 'classic'
g.pop('sim', None)

# ---------------------------------------------------------------- economy
eco = g.setdefault('economy', {})
eco['startingCash'] = 6
eco['tapBase'] = 1
eco['tapPercentOfIncome'] = 0.03
# Our own milestone ladder: speed x2 at 15 and 40, value x2 at 25, 60 and 100, then value x REP_MULT
# every REP_EVERY units. REP_MULT^(1/REP_EVERY) sits just under the cost growth, so a business's
# payback time drifts up slowly instead of hitting a wall: the run stays alive until prestige.
REP_EVERY, REP_MULT = int(E('REP_EVERY', 25)), E('REP_MULT', 1.75)
eco['milestones'] = [
    {'owned': 15, 'speedMult': 2}, {'owned': 25, 'revenueMult': 2}, {'owned': 40, 'speedMult': 2},
    {'owned': 60, 'revenueMult': 2}, {'owned': 100, 'revenueMult': 2},
]
eco['milestoneRepeat'] = {'every': REP_EVERY, 'revenueMult': REP_MULT}
# First Warp Core when lifetime earnings reach the threshold: the bot gets there at 2 h 13 m
# (lifetime 6.6e14 at 2 h 15 m), shortly before the run slows to a crawl (about 2 h 30 m: nothing
# then pays back within 25 minutes). Cores grow with the square root of lifetime earnings, so the
# first jump the bot takes (3 cores at 2 h 49 m) is worth x1.75 at 25 % each, and later runs keep
# going: with --prestige, 5 resets and 48 cores in 24 h, each run longer than the last.
BONUS = E('BONUS', 0.25)
eco['prestige'] = {'threshold': E('PRESTIGE', 6e14), 'scale': 1, 'bonusPerPoint': BONUS}
eco['offline'] = {'maxHours': 6, 'efficiency': 0.4, 'minSecondsToShow': 60}
eco['boost'] = {'multiplier': 2, 'minutesPerAd': 20, 'maxMinutes': 180}
eco['daily'] = {'gems': [5, 10, 10, 15, 20, 25, 60]}
eco['timeWarp'] = {'hours': 2, 'gemCost': 40}
eco['bonus'] = {'name': 'Comet Shard', 'minSec': 50, 'maxSec': 120, 'incomeSeconds': 100, 'minTaps': 40}
eco['combo'] = {'tapsPerLevel': 14, 'maxMultiplier': 4, 'decayMs': 1500, 'name': 'OVERDRIVE'}

# ---------------------------------------------------------------- upgrades
# Each business has one x3 upgrade at UF times its first unit's cost. The fleet-wide x2 upgrades
# (they multiply all income) sit on a geometric ladder that starts at ALLF times the last tier's
# first-unit cost and grows ALLSTEP per step, to fill the hours after the last business opens.
UF, ALLF, ALLSTEP = E('UF', 2750), E('ALLF', 0.078), E('ALLSTEP', 10.5)
ALL0 = businesses[-1]['baseCost'] * ALLF
UPGRADES = {
    'drill': ('Laser Bits', '🔦'), 'rover': ('Fusion Wheels', '⚙️'), 'refinery': ('Plasma Crucible', '🔥'),
    'freighter': ('Cargo Folding', '📦'), 'moon_base': ('Low-G Conveyors', '🛤️'), 'ring_yard': ('Autowelders', '🔧'),
    'sun_array': ('Mirror Polish', '🪞'),
}
SHARED = [('Fleet Telemetry', '📡'), ('Quantum Logistics', '🧬'), ('Gravity Slingshots', '🌌'), ('Hyperlane Charter', '🛸'),
          ('Dyson Lattice', '🕸️'), ('Pocket Wormholes', '🕳️'), ('Star Forge', '🌟')][:int(E('NALL', 7))]
ups = []
for b in businesses:
    name, icon = UPGRADES[b['id']]
    ups.append({'id': 't_' + b['id'], 'name': name, 'icon': icon, 'cost': tidy(b['baseCost'] * UF), 'target': b['id'], 'revenueMult': 3})
for k, (name, icon) in enumerate(SHARED):
    ups.append({'id': f't_all_{k + 1}', 'name': name, 'icon': icon, 'cost': tidy(ALL0 * ALLSTEP ** k), 'target': 'all', 'revenueMult': 2})
ups.append({'id': 't_premium', 'name': 'Antimatter Core', 'icon': '⚛️', 'cost': 120, 'target': 'all', 'revenueMult': 2, 'premium': True})
ups.sort(key=lambda u: (u.get('premium', False), u['cost']))
g['upgrades'] = ups

# ---------------------------------------------------------------- strings, characters, story
g['strings'] = {
    'currencyName': 'Credits', 'currencySymbol': '₵', 'currencyIcon': '🪙',
    'gemName': 'Dark Matter', 'gemIcon': '🔮',
    'prestigeName': 'Warp Cores', 'prestigeIcon': '🌀', 'prestigeVerb': 'Jump Galaxy',
    'prestigeDescription': f'Warp to a new galaxy. Your fleet stays behind, but each Warp Core adds {BONUS * 100:g}% to all output for good.',
    'managerTab': 'AI Pilots', 'upgradeTab': 'Tech', 'tapHint': 'Tap the asteroid!',
}
g['cast'] = {
    'aria': {'kind': 'manager', 'species': 'robot', 'skin': '#9FB4D9', 'eyes': '#00E5FF', 'outfit': '#2B3A78', 'accent': '#00E5FF', 'outfitStyle': 'spacesuit'},
    'vega': {'kind': 'manager', 'skin': '#C68B59', 'hair': '#1E1A2E', 'hairStyle': 'ponytail', 'outfit': '#E8ECF8', 'accent': '#7B5CFF', 'outfitStyle': 'spacesuit', 'hat': 'helmet'},
    'grub': {'kind': 'customer', 'species': 'alien', 'body': 'small', 'outfit': '#3DDC97', 'accent': '#FFD166', 'outfitStyle': 'overalls', 'glasses': 'goggles'},
    # A built-in preset as the base, recoloured so it is this game's own person.
    'kelvin': {'preset': 'freeze', 'hair': '#F2F2F2', 'outfit': '#7FD1AE', 'accent': '#2B3A78', 'glasses': 'goggles'},
    'rook': {'kind': 'manager', 'skin': '#F1C7A5', 'hair': '#B0B6C8', 'hairStyle': 'slick', 'outfit': '#3A2F5C', 'accent': '#FF4D6D', 'outfitStyle': 'suit', 'neck': 'tie', 'brows': 'smug'},
}
g['characters'] = [
    {'id': 'ai', 'name': 'ARIA', 'portrait': 'char:aria', 'color': '#00E5FF'},
    {'id': 'rival', 'name': 'Director Rook', 'portrait': 'char:rook', 'color': '#FF4D6D'},
]
g['story'] = [
    {'id': 'intro', 'characterId': 'ai', 'title': 'Boot Sequence', 'trigger': {'type': 'start'},
     'lines': ['Good morning, Miner. Your company owns one drill and a lot of debt.', 'Tap the drill to dig out ore. I will handle the paperwork.']},
    {'id': 'first_pilot', 'characterId': 'ai', 'trigger': {'type': 'hired', 'businessId': 'drill'},
     'lines': ['Unit D-1 is online. The drill now runs without you.', 'Every machine can have a pilot. Pilots never take a lunch break.'], 'rewardGems': 5},
    {'id': 'refinery', 'characterId': 'ai', 'trigger': {'type': 'owned', 'businessId': 'refinery', 'count': 1},
     'lines': ['A refinery! Raw rock is cheap. Shiny metal is not.', 'Every machine runs twice as fast at 15 and 40 units. Keep building.'], 'rewardGems': 5},
    {'id': 'rival', 'characterId': 'rival', 'title': 'A Visitor', 'trigger': {'type': 'lifetimeEarnings', 'amount': 2e6},
     'lines': ['Director Rook, Consolidated Rocks. We own this sector. Mostly.', 'Sell me your little operation now, while it is still little.'], 'rewardGems': 10},
    {'id': 'moon', 'characterId': 'ai', 'title': 'Base Camp', 'trigger': {'type': 'owned', 'businessId': 'moon_base', 'count': 1},
     'lines': ['We have a base on the Moon. Commander Vega sends her regards.', 'Director Rook sends a strongly worded memo.'], 'rewardGems': 10},
    {'id': 'array', 'characterId': 'rival', 'title': 'Show-off', 'trigger': {'type': 'owned', 'businessId': 'sun_array', 'count': 1},
     'lines': ['Mirrors around a star? That is... actually rather clever.', 'This is not over, Miner.'], 'rewardGems': 15},
    {'id': 'first_jump', 'characterId': 'ai', 'title': 'New Galaxy', 'trigger': {'type': 'prestige', 'count': 1},
     'lines': ['Jump complete. New galaxy, same debt-free you.', f'Every Warp Core adds {BONUS * 100:g}% to everything we make.'], 'rewardGems': 20},
]

# ---------------------------------------------------------------- meta: a little, so classic mode exercises it
# Cards: classic games have no transport, sales or rush, so only station, tap, offline, bonus and
# global stats are used. Every card is a code-drawn person: icon "char:<id>" with a look in g['cast']. One earn-only chest on a free timer (never sold), three mission templates.
g['meta'] = {
    'cards': [
        {'id': 'grub', 'name': 'Grub', 'title': 'Rock Sniffer', 'icon': 'char:grub', 'rarity': 'common', 'stat': 'stationValue', 'flavor': 'Can smell iron through a kilometre of rock.'},
        {'id': 'kelvin', 'name': 'Professor Kelvin', 'title': 'Drill Scientist', 'icon': 'char:kelvin', 'rarity': 'common', 'stat': 'tapValue', 'flavor': 'Swears the asteroid hums back if you tap it right.'},
        {'id': 'vega', 'name': 'Commander Vega', 'title': 'Base Commander', 'icon': 'char:vega', 'rarity': 'rare', 'stat': 'offlineEarnings', 'flavor': 'Keeps the night shift honest.'},
        {'id': 'aria', 'name': 'ARIA Prime', 'title': 'Fleet Mind', 'icon': 'char:aria', 'rarity': 'epic', 'stat': 'globalIncome', 'flavor': 'Runs a thousand ships and still says please.'},
    ],
    'cardEffect': {
        'common': {'base': 5, 'perLevel': 3}, 'rare': {'base': 10, 'perLevel': 5},
        'epic': {'base': 6, 'perLevel': 3}, 'legendary': {'base': 10, 'perLevel': 5},
    },
    'cardCopies': {'base': 2, 'growth': 1.5},
    'chests': [{
        'id': 'ore_crate', 'name': 'Supply Pod', 'icon': 'art:chest-silver', 'blurb': 'Dropped from orbit every few hours. Free.',
        'tier': 'silver', 'slots': 3,
        'slotWeights': {'card': 80, 'gems': 10, 'cash': 10},
        'rarityWeights': {'common': 78, 'rare': 18, 'epic': 4, 'legendary': 0},
        'cardCopies': {'common': [1, 3], 'rare': [1, 2], 'epic': [1, 1], 'legendary': [1, 1]},
        'gems': [1, 3], 'cashSeconds': [60, 240],
    }],
    'freeChest': {'chestId': 'ore_crate', 'everyHours': 4, 'stored': 2, 'firstMinutes': [15, 60]},
    'pity': {'epic': 12},
    'chestGrowthPerVenue': 0,
    'chestsForSale': False,
    'missions': {
        'slots': 3, 'perDay': 8,
        'templates': [
            {'id': 'earn', 'type': 'earn', 'text': 'Earn {n}', 'targets': [30, 120, 300, 600, 1200, 1800], 'reward': {'type': 'gems', 'amount': 3}},
            {'id': 'levels', 'type': 'levels', 'text': 'Build {n} machines', 'targets': [5, 15, 30, 50, 80, 120], 'reward': {'type': 'gems', 'amount': 2}},
            {'id': 'taps', 'type': 'taps', 'text': 'Tap the asteroid {n} times', 'targets': [20, 60, 120, 200], 'reward': {'type': 'gems', 'amount': 2}},
        ],
        'milestones': [{'every': 6, 'reward': {'type': 'chest', 'chestId': 'ore_crate', 'count': 1}}],
    },
    'deals': [],
    'dailyShop': {'slots': 3, 'offers': []},
}

# ---------------------------------------------------------------- monetization products, store
mon = g.setdefault('monetization', {})
mon.setdefault('ads', {'forceTestAds': True})
mon['iap'] = {**mon.get('iap', {}), 'products': [
    {'id': 'space_no_ads', 'title': 'No Ads', 'kind': 'noAds', 'fallbackPrice': '$5.99'},
    {'id': 'space_x2', 'title': 'Overclock x2', 'description': 'Permanent 2x output.', 'kind': 'multiplier', 'value': 2, 'fallbackPrice': '$6.99', 'highlight': True},
    {'id': 'space_gems_100', 'title': 'Dark Matter Cell', 'kind': 'gems', 'value': 100, 'fallbackPrice': '$1.99'},
    {'id': 'space_gems_550', 'title': 'Dark Matter Tank', 'kind': 'gems', 'value': 550, 'fallbackPrice': '$9.99'},
]}

store = g.setdefault('store', {})
store['title'] = 'Asteroid Haul: Ore Empire'   # meta.md 1: no "Idle ... Tycoon" titles
store['subtitle'] = 'Drill rocks, run a star fleet'
store['keywords'] = ['space', 'mining', 'asteroid', 'clicker', 'galaxy', 'incremental', 'sci-fi', 'planet', 'robots', 'fleet', 'ore']
store['shortDescription'] = 'Start with one drill and grow a mining fleet that spans the galaxy.'
store['description'] = (
    'Start with a single hand drill on a lonely asteroid and grow a mining company that spans the galaxy.\n\n'
    '• Build seven kinds of machines, from rovers to mirrors around a star\n'
    '• Give every machine an AI pilot so it runs without you\n'
    '• Collect a small crew of specialists and level them up\n'
    '• A free supply pod drops every few hours, and daily missions pay in Dark Matter\n'
    '• Earn credits while the app is closed\n'
    '• Jump to a new galaxy to earn Warp Cores and grow faster every run\n'
    '• Keep one step ahead of Director Rook and his rock monopoly\n\n'
    'Asteroid Haul is a calm space incremental game for short breaks.'
)

json.dump(g, open(PATH, 'w'), indent=2, ensure_ascii=False)
open(PATH, 'a').write('\n')
print('wrote', PATH)
for b in businesses:
    print(' ', b['id'].ljust(10), 'cost', b['baseCost'], 'x', b['costGrowth'], 'rev', b['baseRevenue'], 'cycle', b['cycleSeconds'], 'hire', b['managerCost'])
print('  upgrades', [(u['id'], u['cost']) for u in ups])
