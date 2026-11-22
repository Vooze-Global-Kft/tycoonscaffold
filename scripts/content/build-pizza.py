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
# The fifth station's hire at the default factor (33M) left no unlock or hire from 12:51 to 25:37
# (critique-fun.md section 1): about 12M closes that gap.
# The first hire dearer (250 instead of 140) so the tutorial keeps about a minute of
# manual play (oven, bell, buy) before the first automation: the bot hired at 44 s at 140, 51 s at 250.
HIRE_ADJUST = {'gelato': 12e6 / (COST0 * COST_STEP ** 4 * HIRE_FACTOR), 'margherita': 250 / (COST0 * HIRE_FACTOR)}
stations = []
for i, st in enumerate(content['stations']):
    cost = COST0 * COST_STEP ** i
    rate = RATE0 * RATE_STEP ** i
    stations.append({
        'id': st['id'], 'name': st['name'], 'icon': st['icon'], 'flavor': st['flavor'],
        'baseCost': tidy(cost), 'costGrowth': GROWTH,
        'baseRevenue': tidy(rate * CYCLES[i]), 'cycleSeconds': CYCLES[i],
        'managerCost': tidy(cost * HIRE_FACTOR * HIRE_ADJUST.get(st['id'], 1)), 'managerName': st['role'],
        'stationKind': st['kind'], 'productName': st['dish'], 'productIcon': st['icon'],
    })
g['businesses'] = stations
g['mode'] = 'sim'

eco = g['economy']
eco['startingCash'] = 0
# Floor tips must not beat the first oven ($2.50 per 2 s): critique-fun.md section 1.
eco['tapBase'] = E('TAP_BASE', 0.25)
eco['tapPercentOfIncome'] = 0.04
eco['milestones'] = [
    {'owned': 10, 'speedMult': 2}, {'owned': 25, 'revenueMult': 2}, {'owned': 50, 'speedMult': 2},
    {'owned': 100, 'revenueMult': 3}, {'owned': 150, 'revenueMult': 2}, {'owned': 200, 'revenueMult': 3},
]
eco['milestoneRepeat'] = {'every': 100, 'revenueMult': 2}
eco['prestige'] = {'threshold': E('PRESTIGE', 3e15), 'scale': E('PRESTIGE_SCALE', 20), 'exponent': E('PRESTIGE_EXP', 0.5), 'bonusPerPoint': E('PRESTIGE_BONUS', 0.02)}
P = eco['prestige']
FIRST_STAR = tidy(P['threshold'] * (1 / P['scale']) ** (1 / P['exponent']) * 1.0000001)   # lifetime earnings at which the first point exists
while int(P['scale'] * (FIRST_STAR / P['threshold']) ** P['exponent'] + 1e-9) < 1: FIRST_STAR = tidy(FIRST_STAR * 1.1)
BONUS_PCT = ('%g' % (P['bonusPerPoint'] * 100))
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
VENUE_UNLOCKS = [1.2e8, 4.4e11, 4.1e14, 1.1e17, 3.5e19, 2.2e21, 1.6e23]
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
    'production': {'name': 'Kitchen', 'icon': '🍕'},
    'buffer': {'name': content['buffer']['name'], 'icon': content['buffer']['icon']},
    'transport': {
        'name': t['name'], 'workerName': t['worker'], 'icon': 'char:waiter',
        'baseCost': T_COST, 'costGrowth': STAGE_COST_GROWTH, 'baseCapacity': T_CAPACITY, 'capacityGrowth': STAGE_GROWTH, 'tripSeconds': 6,
        'workersAt': [1, 5, 12, 25, 45, 70],
        'managerCost': 400, 'managerName': t['manager'], 'managerIcon': 'char:maitre', 'managerFlavor': t['managerFlavor'], 'bellName': t['bell'],
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
# The 5e13 one fills the gap of nearly 3 hours between 5e11 and 5e14 (critique-fun.md section 1, day 2).
shared_costs = [5e8, 6e10, 5e13, 5e14, 5e17]
# Past the last venue (it opens near 1.6e23) a ladder of "all" upgrades, x10,000 apart, keeps a next
# goal in every run once resets have made the venues quick (audit.md, "How long the content lasts").
shared_costs += [float('%.3g' % (5e25 * 1e4 ** k)) for k in range(12)]
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
st['prestigeDescription'] = 'Sell the whole empire to a franchise group and start again from Nonna\'s Corner. Every Chef Star boosts all profits by %s%% forever.' % BONUS_PCT
g['story'] = [
 {'id':'intro','characterId':'nonna','title':'A Family Recipe','trigger':{'type':'start'},'lines':["Bambino! This little kitchen is all we have left.","But my sauce? Mamma mia. It could feed the world.","Tap the oven to bake. Then ring the bell so the waiter serves it!"]},
 {'id':'meet_pepe','characterId':'pepe','title':'Pepe!','trigger':{'type':'transportHired'},'lines':["Ciao! I'm Pepe. Yes, I'm a pizza. No, you can't eat me.","Your maître d' runs the floor now. Watch the counter: if dishes pile up, hire more waiters!","And if a Golden Slice flies by, grab it. Fortune favours the fast."],'rewardGems':10},
 {'id':'second_station','characterId':'pepe','trigger':{'type':'owned','businessId':'bruschetta','count':10},'lines':["Two dishes on the menu! Fancy.","Every station gets faster at level 10, 25 and 50. Keep feeding them."],'rewardGems':5},
 {'id':'rival_appears','characterId':'rival','title':'Competition','trigger':{'type':'lifetimeEarnings','amount':250000},'lines':["So you're the little kitchen everyone's talking about.","Cute. I sell ten thousand frozen discs a day. FROZEN.","Enjoy it while it lasts. Big Cheese Carl owns this town."],'rewardGems':10},
 {'id':'gelato','characterId':'nonna','title':'Dolce!','trigger':{'type':'owned','businessId':'gelato','count':1},'lines':["Gelato! Now they stay for dessert.","Two scoops. Always two. This is the law."],'rewardGems':10},
 {'id':'roma','characterId':'nonna','title':'Roma!','trigger':{'type':'venue','venueId':'roma'},'lines':["A second restaurant. In ROMA!","Nonna's Corner keeps earning while you build here. An empire, bambino!"],'rewardGems':15},
 {'id':'frozen_war','characterId':'rival','title':'Cold War','trigger':{'type':'venue','venueId':'venezia'},'lines':["Venezia too? You're everywhere I look!","This means war. Cheese war."],'rewardGems':15},
 # Fires the moment the first Chef Star can be earned (points = floor(scale * sqrt(lifetime / threshold))),
 # and says only what is true then: one star now, more the longer the empire grows.
 {'id':'billionaire','characterId':'nonna','title':'A Franchise Offer','trigger':{'type':'lifetimeEarnings','amount':FIRST_STAR},'lines':["Bambino, a franchise group wants to buy the empire!","Today they would pay one Chef Star. Each star adds %s%% to all profits, forever." % BONUS_PCT,"No hurry: the bigger the empire grows, the more stars they offer."],'rewardGems':20},
 {'id':'first_franchise','characterId':'rival','title':'Round Two','trigger':{'type':'prestige','count':1},'lines':["You sold it all... and came back STRONGER?","Fine. Round two, pizza kid."],'rewardGems':25},
 {'id':'moon','characterId':'pepe','title':'One Small Slice','trigger':{'type':'venue','venueId':'moon'},'lines':["We put an oven. On the MOON.","The crust is out of this world. I'll see myself out."],'rewardGems':30},
 {'id':'planet','characterId':'rival','title':'Checkmate','trigger':{'type':'venue','venueId':'planet'},'lines':["A planet. You bought a PLANET.","...Is it hiring?"],'rewardGems':50},
]

# ---------------------------------------------------------------- meta: cards, chests, missions, shop, deals
# Sources: docs/design/research/meta.md "Recommended parameters" and policy.md. Chests are EARNED,
# never sold (no gemCost, chestsForSale off, no chest in a paid offer or deal): selling random
# items raises the age rating and is unlawful in some countries. Gems buy named cards instead.
# docs/design/meta-economy.md checks the totals below with the real engine.

# Card effects, in percent: base at level 1, plus perLevel for each further level. Commons level
# far faster than the rest (most copies are common), so they get the smallest steps. Global income
# is only on the two legendaries, +4 % a level (the research's 3 to 5 %). Stage cards (station,
# transport, sales) stay well under the research's +8 to 12 % a level: with ~70 free copies a day a
# common reaches level 12 or so in a month, and three stages compound. Target: a free player has
# roughly x2 to x3 income from cards after 30 days, not x100 (see meta-economy.md).
CARD_EFFECT = {
    'common':    {'base': 4,  'perLevel': 2.5},
    'rare':      {'base': 6,  'perLevel': 3.5},
    'epic':      {'base': 12, 'perLevel': 5},
    'legendary': {'base': 8,  'perLevel': 4},
}
CARD_COPIES = {'base': 2, 'growth': 1.5}   # copies to go from level L to L+1: round(2 * 1.5^(L-1))

cast = {}
cards = []
for cd in content['cards']:
    card = {k: cd[k] for k in ('id', 'name', 'title', 'icon', 'rarity', 'stat', 'flavor') if k in cd}
    cards.append(card)
    if card['icon'].startswith('char:'): cast[card['icon'][5:]] = {'preset': card['icon'][5:]}

def chest(cid, slots, weights, odds, copies, gems, cash, guaranteed=None):
    c = next(x for x in content['chests'] if x['id'] == cid)
    out = {'id': cid, 'name': c['name'], 'icon': c['icon'], 'blurb': c['blurb'], 'tier': c['tier'], 'slots': slots,
           'slotWeights': dict(zip(('card', 'gems', 'cash'), weights)),
           'rarityWeights': dict(zip(('common', 'rare', 'epic', 'legendary'), odds)),
           'cardCopies': dict(zip(('common', 'rare', 'epic', 'legendary'), copies)),
           'gems': gems, 'cashSeconds': cash}
    if guaranteed: out['guaranteed'] = guaranteed
    return out

# Slots and copies: Box 3 slots ~4 copies, Crate 4 slots ~15, Golden 6 slots ~60 (research: 5,
# 15 to 20, 60 to 80; the Box is a little leaner because it is also the free and ad chest).
# Odds per card slot, common/rare/epic/legendary: Box 74/20/5/1 (research), Golden 5 % legendary.
CHESTS = [
    chest('box',    3, (85, 5, 10),  (74, 20, 5, 1),  ([1, 3], [1, 2], [1, 1], [1, 1]),     [1, 3],   [60, 180]),
    chest('crate',  4, (85, 5, 10),  (60, 30, 8, 2),  ([5, 8], [2, 4], [1, 2], [1, 1]),     [3, 6],   [300, 600], 'rare'),
    chest('golden', 6, (90, 5, 5),   (50, 32, 13, 5), ([14, 20], [8, 12], [3, 5], [1, 2]),  [10, 20], [1200, 2400], 'epic'),
]

# Missions. Each template's ladder advances when it is completed; the first five missions of the
# game (one per template, in this order) take 30 to 90 s, the next ones minutes. "earn" targets
# are SECONDS of income at hand-out time. Rewards: 2 to 5 gems (about 30 a day at 10 a day).
LADDERS = {
    'serve':  ([5, 25, 60, 150, 300, 600, 1200],        3),
    'earn':   ([30, 120, 300, 600, 900, 1500, 2400],    3),
    'levels': ([3, 10, 25, 40, 60, 100, 150],           2),
    'taps':   ([15, 40, 80, 150, 250],                  2),
    'bonus':  ([1, 3, 5, 8, 12],                        3),
    'chests': ([1, 2, 3, 4],                            3),
    'rush':   ([1, 2, 3, 5],                            3),
    'hires':  ([1, 2, 3, 4],                            4),
}
missions = [{'id': m['id'], 'type': m['type'], 'text': m['text'], 'targets': LADDERS[m['type']][0],
             'reward': {'type': 'gems', 'amount': LADDERS[m['type']][1]}} for m in content['missions']]

# Daily shop: one free item first, then three priced ones. Paid offers are NAMED card copies (the
# non-random route to every card, legendaries included) and hours of income; never a chest.
# Price per copy is a little above what the same copies cost inside a random chest.
# Legendary offers rarer (weight 0.5 -> 0.2): with 0.5 the free player owned all 12 cards on day 6
# to 10; the research wants about two weeks (audit.md, meta-economy table).
CARD_OFFER = {'common': (8, 30, 3), 'rare': (3, 40, 2), 'epic': (1, 60, 1.5), 'legendary': (1, 250, 0.2)}  # copies, gems, weight
daily = [
    {'id': 'free_truffles', 'title': 'Free Truffles',   'icon': '🍄', 'reward': {'type': 'gems', 'amount': 5},              'gemCost': 0, 'weight': 2},
    {'id': 'free_box',      'title': 'Free Pizza Box',  'icon': '📦', 'reward': {'type': 'chest', 'chestId': 'box', 'count': 1}, 'gemCost': 0, 'weight': 2},
    {'id': 'free_tips',     'title': 'Free Tip Jar',    'icon': '🫙', 'reward': {'type': 'cash', 'seconds': 900},          'gemCost': 0, 'weight': 2},
    {'id': 'free_recruit',  'title': 'Free Recruit',    'icon': '🎟️', 'reward': {'type': 'randomCard', 'rarity': 'common', 'copies': 3}, 'gemCost': 0, 'weight': 1},
    {'id': 'tips_1h',       'title': '1 h of Income', 'icon': '💰', 'reward': {'type': 'cash', 'seconds': 3600},    'gemCost': 20, 'weight': 2},
    {'id': 'tips_4h',       'title': '4 h of Income', 'icon': '💰', 'reward': {'type': 'cash', 'seconds': 14400}, 'gemCost': 70, 'weight': 1},
]
for card in cards:
    n, gems, w = CARD_OFFER[card['rarity']]
    daily.append({'id': 'card_' + card['id'], 'title': f"{card['name']} ×{n}", 'icon': card['icon'],
                  'reward': {'type': 'card', 'cardId': card['id'], 'copies': n}, 'gemCost': gems, 'weight': w})

# Deals: consumable bundles with listed contents (no chests, no permanent items), real timers.
dmap = {d['id']: d for d in content['deals']}
deals = [
    {**{k: dmap['welcome'][k] for k in ('id', 'title', 'badge', 'blurb', 'icon')},
     'productId': 'pizza_welcome_feast', 'trigger': {'type': 'sessions', 'count': 3}, 'durationHours': 72, 'maxPurchases': 1,
     'contents': [{'type': 'gems', 'amount': 300}, {'type': 'card', 'cardId': 'nonna', 'copies': 1},
                  {'type': 'card', 'cardId': 'marco', 'copies': 6}, {'type': 'card', 'cardId': 'tony', 'copies': 20},
                  {'type': 'cash', 'seconds': 4 * 3600}]},
    {**{k: dmap['franchise'][k] for k in ('id', 'title', 'badge', 'blurb', 'icon')},
     'productId': 'pizza_franchise_kit', 'trigger': {'type': 'prestige', 'count': 1}, 'durationHours': 48, 'maxPurchases': 1,
     'contents': [{'type': 'gems', 'amount': 200}, {'type': 'card', 'cardId': 'al', 'copies': 3},
                  {'type': 'card', 'cardId': 'carl', 'copies': 3}, {'type': 'card', 'cardId': 'sal', 'copies': 15},
                  {'type': 'cash', 'seconds': 8 * 3600}]},
]

g['meta'] = {
    'cards': cards, 'cardEffect': CARD_EFFECT, 'cardCopies': CARD_COPIES,
    'chests': CHESTS,
    # The first free chest at 5 min, inside the first session (critique-fun.md section 2).
    'freeChest': {'chestId': 'box', 'everyHours': 4, 'stored': 2, 'firstMinutes': [5, 60]},
    'adChest': {'chestId': 'box', 'perDay': 3, 'cooldownMinutes': 120},
    'pity': {'epic': 10, 'legendary': int(E('PITY_L', 40))},
    'chestGrowthPerVenue': 0.2,
    'chestsForSale': False,
    'missions': {'slots': 3, 'perDay': 10, 'templates': missions, 'milestones': [
        {'every': 5, 'reward': {'type': 'chest', 'chestId': 'box', 'count': 1}},
        {'every': 10, 'reward': {'type': 'chest', 'chestId': 'crate', 'count': 1}},
        {'every': 30, 'reward': {'type': 'chest', 'chestId': 'golden', 'count': 1}},
    ]},
    'deals': deals,
    'dailyShop': {'slots': 4, 'offers': daily},
}

# Stage colours, set explicitly (the schema defaults) so a reskin sees where they live.
g['theme']['colors']['stages'] = {'production': '#EF7D22', 'transport': '#2A9D8F', 'sales': '#7B5EA7'}

# ---------------------------------------------------------------- characters, cast, products, store
portraits = {'nonna': 'char:nonna', 'rival': 'char:carl', 'pepe': 'asset:hero'}
for ch in g['characters']:
    ch['portrait'] = portraits.get(ch['id'], ch['portrait'])
    if ch['portrait'].startswith('char:'): cast[ch['portrait'][5:]] = {'preset': ch['portrait'][5:]}
# Drawn portraits for the staff the lists show (look-A1): the transport stage is a waiter in the
# scene's uniform (stage colour on the apron), its hire a maître d' in a suit, and each station's
# hire the cook the scene draws there (workerLook), so the row, the banner and the room agree.
ORANGE, TEAL = g['theme']['colors']['stages']['production'], g['theme']['colors']['stages']['transport']
cast['waiter'] = {'kind': 'waiter', 'hair': '#2E2428', 'hairStyle': 'slick', 'skin': '#E8B48A', 'apron': TEAL}
cast['maitre'] = {'kind': 'manager', 'outfitStyle': 'suit', 'outfit': '#23262F', 'accent': '#E5484D', 'neck': 'bowtie',
                  'hair': '#9AA0A6', 'hairStyle': 'slick', 'moustache': 'curled', 'skin': '#F2C9A0', 'brows': 'smug'}
COOKS = {
    'margherita': ('pizzaiolo', {'kind': 'chef', 'hair': '#2E2428', 'hairStyle': 'short', 'moustache': 'curled', 'skin': '#E8B48A'}),
    'bruschetta': ('prepcook',  {'kind': 'chef', 'body': 'slim', 'hair': '#B5562B', 'hairStyle': 'ponytail', 'hat': 'bandana', 'hatColor': ORANGE, 'skin': '#F2C9A0', 'lashes': True}),
    'pasta':      ('pastachef', {'kind': 'chef', 'hair': '#6B4A2E', 'hairStyle': 'curly', 'beard': 'goatee', 'skin': '#C98A5E'}),
    'arancini':   ('frycook',   {'kind': 'chef', 'hat': 'cap', 'hatColor': ORANGE, 'hair': '#1F1A17', 'hairStyle': 'spiky', 'skin': '#8D5A3B'}),
    'gelato':     ('gelataio',  {'kind': 'chef', 'hat': 'minitoque', 'hair': '#E8C36A', 'hairStyle': 'bob', 'skin': '#F5D3B5', 'lashes': True}),
    'espresso':   ('barista',   {'kind': 'chef', 'hat': 'none', 'outfitStyle': 'tee', 'apron': '#6B3E26', 'hair': '#3B2A22', 'hairStyle': 'bun', 'glasses': 'round', 'skin': '#D9A77C'}),
}
for b in g['businesses']:
    cid, look = COOKS[b['id']]
    cast[cid] = {**look, 'accent': ORANGE}
    b['workerLook'] = cid
g['cast'] = dict(sorted(cast.items()))

# Drawn icons from the art kit ("art:<name>", src/config/artIcons.ts) where the emoji looked like
# placeholders (look-A1 to A3): chests by tier, the premium currency, the home tab, gem packs by size.
CHEST_ART = {'wood': 'art:chest-wood', 'silver': 'art:chest-silver', 'gold': 'art:chest-gold'}
for c in CHESTS: c['icon'] = CHEST_ART[c['tier']]
for o in daily:
    if o['reward']['type'] == 'chest': o['icon'] = next(c['icon'] for c in CHESTS if c['id'] == o['reward']['chestId'])
    if o['reward']['type'] == 'gems': o['icon'] = 'art:truffle'
g['strings']['gemIcon'] = 'art:truffle'
g['theme']['icons']['tabBuild'] = 'art:storefront'
# The deals show the character they feature.
for d in deals: d['icon'] = {'welcome': 'char:nonna', 'franchise': 'char:al'}[d['id']]

# Prices (US, fallback only; the store shows the real one). genre.md section 5: No Ads at $3.99
# that also skips rewarded ads undersold it, so the two are split. Gem packs give exact amounts
# (Crate-sized 100 and Golden-sized 600, policy.md / EU CPC). Deals are their own consumables.
pr = content['products']
g['monetization']['iap']['products'] = [
    {'id': 'pizza_no_ads', 'kind': 'noAds', 'fallbackPrice': '$5.99', **pr['noAds']},
    {'id': 'pizza_express_pass', 'kind': 'skipAds', 'fallbackPrice': '$7.99', **pr['skipAds']},
    {'id': 'pizza_x2', 'kind': 'multiplier', 'value': 2, 'fallbackPrice': '$6.99', 'highlight': True, **pr['x2']},
    {'id': 'pizza_x3', 'kind': 'multiplier', 'value': 3, 'fallbackPrice': '$12.99', **pr['x3']},
    {'id': 'pizza_gems_100', 'kind': 'gems', 'value': 100, 'fallbackPrice': '$1.99', 'title': pr['gems'][0], 'icon': 'art:truffle'},
    {'id': 'pizza_gems_280', 'kind': 'gems', 'value': 280, 'fallbackPrice': '$4.99', 'title': pr['gems'][1], 'icon': 'art:truffle-pile'},
    {'id': 'pizza_gems_600', 'kind': 'gems', 'value': 600, 'fallbackPrice': '$9.99', 'title': pr['gems'][2], 'icon': 'art:truffle-basket'},
    {'id': 'pizza_gems_1300', 'kind': 'gems', 'value': 1300, 'fallbackPrice': '$19.99', 'title': pr['gems'][3], 'icon': 'art:truffle-crate'},
    {'id': 'pizza_warp_24', 'kind': 'timeWarp', 'value': 24, 'fallbackPrice': '$2.99', **pr['warp']},
    {'id': 'pizza_welcome_feast', 'kind': 'deal', 'fallbackPrice': '$4.99', 'title': dmap['welcome']['title'], 'description': dmap['welcome']['blurb']},
    {'id': 'pizza_franchise_kit', 'kind': 'deal', 'fallbackPrice': '$4.99', 'title': dmap['franchise']['title'], 'description': dmap['franchise']['blurb']},
]

store = g['store']
store['title'] = 'Pizza Empire: Restaurant Sim'   # meta.md 1: avoid "Idle ... Tycoon" titles
store['subtitle'] = 'Bake, serve & grow an empire'   # policy P16: nothing that reads as earning real money
store['keywords'] = ['pizza', 'idle', 'tycoon', 'clicker', 'restaurant', 'cooking', 'chef', 'business', 'simulator', 'incremental']
store['shortDescription'] = "Bake, serve and grow Nonna's tiny kitchen into a pizza empire across the world."
store['description'] = (
    "Turn Nonna's tiny corner kitchen into the biggest pizza empire in the universe!\n\n"
    "• Bake at the oven, ring the bell and watch your waiters serve hungry guests\n"
    "• Fix the bottleneck: more stations, more waiters, more tables\n"
    "• Open eight restaurants, each one bigger and busier than the last\n"
    "• Collect a staff of twelve characters and level them up\n"
    "• Boxes to earn, daily missions and Rush Hour keep every visit rewarding\n"
    "• Your restaurants keep earning Dough while you're away\n"
    "• Franchise your empire to earn Chef Stars and grow faster every run\n"
    "• Outsmart your rival, Big Cheese Carl\n\n"
    "Pizza Empire is a relaxing restaurant sim you can play in short bursts all day."
)

# OUT=<file> writes a variant elsewhere (for experiments) instead of the game.
path = os.environ.get('OUT', path)
json.dump(g, open(path, 'w'), indent=2, ensure_ascii=False)
open(path, 'a').write('\n')
print('wrote', path)
for b in stations: print(' ', b['id'].ljust(11), 'cost', b['baseCost'], 'rev', b['baseRevenue'], 'cycle', b['cycleSeconds'], 'hire', b['managerCost'])
print('  venues', [(v['id'], v['unlockCost'], v['scale']) for v in venues])
print('  meta', len(cards), 'cards,', len(CHESTS), 'chests,', len(missions), 'missions,', len(daily), 'daily offers,', len(deals), 'deals; cast', sorted(cast))
