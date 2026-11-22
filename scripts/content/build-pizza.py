#!/usr/bin/env python3
"""Builds games/pizza-empire/game.json for sim mode from the creative layer
(docs/design/pizza-sim-content.json) and the economy numbers in this file.

Every number here comes from our own formulas (see the comments), so the
economy can be re-tuned in one place and regenerated:

    python3 scripts/content/build-pizza.py && npm run simulate -- pizza-empire
"""
import json, os, sys

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
content = json.load(open(os.path.join(ROOT, 'docs/design/pizza-sim-content.json')))
path = os.path.join(ROOT, 'games/pizza-empire/game.json')
g = json.load(open(path))

def tidy(x):
    """Round to 2 significant digits so numbers in the UI look hand-picked."""
    if x == 0: return 0
    from math import log10, floor
    d = floor(log10(abs(x)))
    f = 10 ** (d - 1)
    v = round(x / f) * f
    return int(v) if v >= 10 else round(v, 2)

# ---------------------------------------------------------------- stations
# Tier i costs COST0 * COST_STEP^i for its first level. Its output per second at level 1 is
# RATE0 * RATE_STEP^i, so each tier pays back more slowly than the last (RATE_STEP < COST_STEP):
# cheap early wins, long-term goals later. Cycles lengthen with the tier but stay watchable.
E = lambda k, d: float(os.environ.get(k, d))
COST0, COST_STEP = E('COST0', 5), E('COST_STEP', 22)
RATE0, RATE_STEP = E('RATE0', 1.25), E('RATE_STEP', 7)
CYCLES = [2, 2.5, 3.5, 4.5, 6, 8]
GROWTH = E('GROWTH', 1.12)
HIRE_FACTOR = E('HIRE_FACTOR', 28)          # an automation hire costs this many first levels of its station
stations = []
for i, st in enumerate(content['stations']):
    cost = COST0 * COST_STEP ** i
    rate = RATE0 * RATE_STEP ** i
    stations.append({
        'id': st['id'], 'name': st['name'], 'icon': st['icon'], 'flavor': st['flavor'],
        'baseCost': tidy(cost), 'costGrowth': GROWTH,
        'baseRevenue': tidy(rate * CYCLES[i]), 'cycleSeconds': CYCLES[i],
        'managerCost': tidy(cost * HIRE_FACTOR), 'managerName': st['role'],
        'stationKind': st['kind'], 'productName': st['dish'], 'productIcon': st['icon'],
    })
g['businesses'] = stations
g['mode'] = 'sim'

eco = g['economy']
eco['startingCash'] = 0
eco['tapBase'] = 1
eco['tapPercentOfIncome'] = 0.04
eco['milestones'] = [
    {'owned': 10, 'speedMult': 2}, {'owned': 25, 'revenueMult': 2}, {'owned': 50, 'speedMult': 2},
    {'owned': 100, 'revenueMult': 3}, {'owned': 150, 'revenueMult': 2}, {'owned': 200, 'revenueMult': 3},
]
eco['milestoneRepeat'] = {'every': 100, 'revenueMult': 2}
eco['prestige'] = {'threshold': float(os.environ.get('PRESTIGE', 3e15)), 'scale': 1, 'bonusPerPoint': 0.02}
eco['offline'] = {'maxHours': 4, 'efficiency': 0.5, 'minSecondsToShow': 60}
eco['boost'] = {'multiplier': 2, 'minutesPerAd': 30, 'maxMinutes': 240}
eco['bonus'] = {'name': content['strings']['bonusName'], 'minSec': 40, 'maxSec': 95, 'incomeSeconds': 120, 'minTaps': 40}
eco['combo'] = {'tapsPerLevel': 12, 'maxMultiplier': 5, 'decayMs': 1400, 'name': content['strings']['comboName']}

# ---------------------------------------------------------------- transport, sales, venues
t, s = content['transport'], content['sales']
VENUE_STEP = float(os.environ.get('VENUE_STEP', 40))      # each venue's costs and values are this many times the previous one's
UNLOCK_STEP = float(os.environ.get('UNLOCK_STEP', 80))   # ...but opening it costs this many times more, so venues arrive further and further apart
# Opening cost of venue 2, 3, ... (calibrated: about 35 min, 1h15, 2h15, 4h, 7h, 12h and 20h of
# continuous play). Any further venues multiply by UNLOCK_STEP.
VENUE_UNLOCKS = [5e7, 2.8e11, 1.7e14, 4.6e16, 3.7e18, 5.8e20, 3.7e22]
# Transport and sales. Station spending follows cost ~ throughput^1.43 while new tiers are being
# unlocked (COST_STEP vs RATE_STEP above). These two stages get the same exponent
# (ln STAGE_COST_GROWTH / ln STAGE_GROWTH = 1.56, against ln COST_STEP / ln RATE_STEP = 1.59), so their share of spending stays steady
# instead of drifting to 0% or 100% as the numbers grow. Their base costs set that share.
STAGE_COST_GROWTH, STAGE_GROWTH = float(os.environ.get('STAGE_COST_GROWTH', 1.16)), float(os.environ.get('STAGE_GROWTH', 1.10))
T_COST, T_CAPACITY = float(os.environ.get('T_COST', 5)), float(os.environ.get('T_CAPACITY', 130))
S_COST, S_SPEND = float(os.environ.get('S_COST', 3.5)), float(os.environ.get('S_SPEND', 75))
# Opening costs are calibrated against a target schedule with scripts/content/calibrate-venues.py
# (they depend on how fast income really grows, which only the simulator knows).
UNLOCKS = [float(x) for x in os.environ['UNLOCKS'].split(',')] if os.environ.get('UNLOCKS') else VENUE_UNLOCKS
venues = []
for i, v in enumerate(content['venues']):
    cost = 0 if i == 0 else (UNLOCKS[i - 1] if i - 1 < len(UNLOCKS) else UNLOCKS[-1] * UNLOCK_STEP ** (i - len(UNLOCKS)))
    venues.append({'id': v['id'], 'name': v['name'], 'place': v['place'], 'icon': v['icon'], 'blurb': v['blurb'],
                   'unlockCost': tidy(cost), 'scale': tidy(VENUE_STEP ** i)})
g['sim'] = {
    'buffer': {'name': content['buffer']['name'], 'icon': content['buffer']['icon']},
    'transport': {
        'name': t['name'], 'workerName': t['worker'], 'icon': t['icon'],
        'baseCost': T_COST, 'costGrowth': STAGE_COST_GROWTH, 'baseCapacity': T_CAPACITY, 'capacityGrowth': STAGE_GROWTH, 'tripSeconds': 6,
        'workersAt': [1, 5, 12, 25, 45, 70],
        'managerCost': 400, 'managerName': t['manager'], 'managerIcon': '🤵', 'managerFlavor': t['managerFlavor'], 'bellName': t['bell'],
    },
    'sales': {
        'name': s['name'], 'seatName': s['seat'], 'icon': s['icon'],
        'baseCost': S_COST, 'costGrowth': STAGE_COST_GROWTH, 'baseSpend': S_SPEND, 'spendGrowth': STAGE_GROWTH, 'serveSeconds': 3.5,
        'seatsAt': [1, 1, 4, 9, 16, 26, 40, 58],
    },
    'venues': venues,
    'rush': {'name': content['rush']['name'], 'icon': content['rush']['icon'], 'multiplier': 3, 'seconds': 30, 'cooldownSeconds': 300},
}

# ---------------------------------------------------------------- upgrades
# A station's own upgrade costs UPGRADE_FACTOR first levels; shared ones come later and cost more.
UPGRADE_FACTOR = 1200
ups = []
shared_costs = [5e8, 5e11, 5e14, 5e17]
si = 0
for u in content['upgrades']:
    if u.get('premium'):
        ups.append({'id': u['id'], 'name': u['name'], 'icon': u['icon'], 'cost': 120, 'target': 'all', 'revenueMult': 2, 'premium': True})
    elif u['target'] == 'all':
        ups.append({'id': u['id'], 'name': u['name'], 'icon': u['icon'], 'cost': shared_costs[si], 'target': 'all', 'revenueMult': 2}); si += 1
    else:
        base = next(b for b in stations if b['id'] == u['target'])['baseCost']
        ups.append({'id': u['id'], 'name': u['name'], 'icon': u['icon'], 'cost': tidy(base * UPGRADE_FACTOR), 'target': u['target'], 'revenueMult': 3})
g['upgrades'] = ups

# ---------------------------------------------------------------- strings, story
st = g['strings']
st['prestigeName'] = content['strings']['prestigeName']; st['prestigeVerb'] = content['strings']['prestigeVerb']
st['managerTab'] = 'Staff'; st['upgradeTab'] = 'Recipes'; st['tapHint'] = 'Tap for tips!'
st['prestigeDescription'] = 'Sell the whole empire to a franchise group and start again from Nonna\'s Corner. Every Chef Star boosts all profits by 2% forever.'
g['story'] = [
 {'id':'intro','characterId':'nonna','title':'A Family Recipe','trigger':{'type':'start'},'lines':["Bambino! This little kitchen is all we have left.","But my sauce? Mamma mia. It could feed the world.","Tap the oven to bake. Then ring the bell so the waiter serves it!"]},
 {'id':'first_chef','characterId':'nonna','title':'Many Hands','trigger':{'type':'hired','businessId':'margherita'},'lines':["A real pizzaiolo! Look at them go.","Now the oven never sleeps. And neither does the money."],'rewardGems':5},
 {'id':'meet_pepe','characterId':'pepe','title':'Pepe!','trigger':{'type':'transportHired'},'lines':["Ciao! I'm Pepe. Yes, I'm a pizza. No, you can't eat me.","Your maître d' runs the floor now. Watch the counter: if dishes pile up, hire more waiters!","And if a Golden Slice flies by, grab it. Fortune favours the fast."],'rewardGems':5},
 {'id':'second_station','characterId':'pepe','trigger':{'type':'owned','businessId':'bruschetta','count':1},'lines':["Two dishes on the menu! Fancy.","Every station gets faster at level 10, 25 and 50. Keep feeding them."],'rewardGems':5},
 {'id':'rival_appears','characterId':'rival','title':'Competition','trigger':{'type':'lifetimeEarnings','amount':250000},'lines':["So you're the little kitchen everyone's talking about.","Cute. I sell ten thousand frozen discs a day. FROZEN.","Enjoy it while it lasts. Big Cheese Carl owns this town."],'rewardGems':10},
 {'id':'gelato','characterId':'nonna','title':'Dolce!','trigger':{'type':'owned','businessId':'gelato','count':1},'lines':["Gelato! Now they stay for dessert.","Two scoops. Always two. This is the law."],'rewardGems':10},
 {'id':'roma','characterId':'nonna','title':'Roma!','trigger':{'type':'venue','venueId':'roma'},'lines':["A second restaurant. In ROMA!","Nonna's Corner keeps earning while you build here. An empire, bambino!"],'rewardGems':15},
 {'id':'frozen_war','characterId':'rival','title':'Cold War','trigger':{'type':'venue','venueId':'venezia'},'lines':["Venezia too? You're everywhere I look!","This means war. Cheese war."],'rewardGems':15},
 {'id':'billionaire','characterId':'nonna','trigger':{'type':'lifetimeEarnings','amount':1000000000},'lines':["A billion?! Your nonno would be so proud.","When you're ready, franchise the empire and earn Chef Stars."],'rewardGems':20},
 {'id':'first_franchise','characterId':'rival','title':'Round Two','trigger':{'type':'prestige','count':1},'lines':["You sold it all... and came back STRONGER?","Fine. Round two, pizza kid."],'rewardGems':25},
 {'id':'moon','characterId':'pepe','title':'One Small Slice','trigger':{'type':'venue','venueId':'moon'},'lines':["We put an oven. On the MOON.","The crust is out of this world. I'll see myself out."],'rewardGems':30},
 {'id':'planet','characterId':'rival','title':'Checkmate','trigger':{'type':'venue','venueId':'planet'},'lines':["A planet. You bought a PLANET.","...Is it hiring?"],'rewardGems':50},
]

json.dump(g, open(path, 'w'), indent=2, ensure_ascii=False)
open(path, 'a').write('\n')
print('wrote', path)
for b in stations: print(' ', b['id'].ljust(11), 'cost', b['baseCost'], 'rev', b['baseRevenue'], 'cycle', b['cycleSeconds'], 'hire', b['managerCost'])
print('  venues', [(v['id'], v['unlockCost'], v['scale']) for v in venues])
