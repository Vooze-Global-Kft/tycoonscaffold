# Sim mode: draft design (v0, for review)

Status: DRAFT by the lead. Researchers and critics review this; the lead then writes the final spec and the
TypeScript contract. Nothing here is implemented yet.

## Goal

The scaffold today is a "classic" idle tycoon (a list of businesses with progress bars; see `src/engine/economy.ts`,
`games/pizza-empire/game.json`). The owner wants Pizza Empire to become a **living restaurant**: you see chefs cook,
waiters carry food and customers eat and pay. He also wants chests/packs with opening animations, deals, a full
sound and haptics layer, and progression that is "almost infinite", keeping the prestige reset.

Reference genre: production-chain idle sims with visible workers (the owner named Idle Miner Tycoon). We take
**genre mechanics only**: a multi-stage production chain with bottlenecks, automation hires, multiple locations,
prestige. We must NOT copy that game's look, layout (mine shafts / elevator / warehouse), names, characters or
UI. Our fiction, layout, cast and terms are our own.

Hard requirement of this repo: **one codebase, many games**. Everything game-specific is data in
`games/<id>/game.json`, validated by `src/config/schema.ts`. Code never branches on a game id. The classic mode
must keep working (games/space-miner stays classic).

## Modes

`mode: "classic" | "sim"` in game.json (default classic). Sim adds a `sim` config block.

## The production chain (generic terms; pizza names in brackets)

Three stages. Value flows as plain numbers ("base value units"); actors on screen only visualise it.

1. **Stations** [kitchen stations, one dish each]. These are the existing `businesses` entries. `owned` is the
   station **level**. A station runs a production cycle (existing `cycleSeconds`, milestone speed/revenue
   multipliers, upgrades). When a cycle completes, its value goes into the **buffer** [the pass] instead of
   straight to cash. A station needs a tap per cycle until its **automation hire** [a chef; the existing
   `managed` flag, `managerCost`, `managerName`] is bought. Hiring is visible: the chef walks in from the door
   to the station and from then on works by themself.
2. **Transport** [waiters]. Workers do round trips: walk to the buffer, load up to `capacity`, walk to the sales
   area, unload into the **served** buffer, return. One upgrade track (transport level): capacity grows
   multiplicatively per level; extra workers join at set levels (they walk in from the door). Until the
   transport automation hire [maître d'] is bought, idle workers wait for the player to ring the service bell.
3. **Sales** [dining room]. Seats [tables]. A customer walks in when a seat is free, waits until the served buffer
   has something, takes up to `spend`, eats for `serveSeconds`, pays, leaves. Payment is the only moment cash is
   created: `cash += amount * globalMultiplier(now)`. One upgrade track (sales level): spend grows
   multiplicatively; more seats open at set levels. Sales is always automatic.

Steady-state income of a venue = `min(productionRate, transportRate, salesRate) * globalMultiplier`. Buffers are
unbounded, so nothing is lost when a stage is slow; fixing the bottleneck flushes the backlog.

Global multipliers (prestige, ad boost, IAP multipliers, card bonuses to global income) are applied **at the
moment of payment**, not at production, so a boost always raises income no matter which stage is the bottleneck.

Engine state per worker is a phase plus progress (0..1), never positions. The UI maps phase/progress to screen
positions. The engine stays pure and deterministic (`tick(cfg, state, dt, now, events?)`), with an analytic path
for long gaps (offline earnings = steady-state rate x seconds x efficiency).

## Venues [restaurants in new cities]: the "almost infinite" axis

`sim.venues: [{ id, name, icon, unlockCost, scale }]`. Each venue is a full copy of the chain (same station
list) whose costs and base values are multiplied by `scale` (e.g. x1, x60, x4e3, ...). All unlocked venues run
at once into one cash pool; the player switches which one is on screen. Station chefs are generic roles with a
procedurally varied look per venue.

Other infinite axes: unbounded station/transport/sales levels (milestones repeat past the configured list),
prestige (global, existing sqrt formula; resets all venues and levels, keeps gems, cards, entitlements, story),
and staff cards.

## Active play

- Tap an un-automated idle station: runs one cycle. Tap the bell: sends idle waiters.
- Tap anywhere else in the scene: a tip (existing tap value) with the existing combo ("Dough Frenzy") multiplier.
- The flying bonus pickup stays.
- **Rush Hour**: a free skill on a cooldown (e.g. x3 sim speed for 30 s, 5 min cooldown). Implemented as a time
  scale on the venue sim, so every actor visibly speeds up.
- Rewarded-ad boost (x2 for 30 min) and doubled offline earnings stay.

## Meta systems

- **Staff cards**: named characters with a rarity (common, rare, epic, legendary). Each gives a passive bonus to
  one stat (station value, transport capacity, sales spend, global income, tap value, offline, bonus value).
  Levels up by collecting copies; copies needed grow per level; no hard cap. Survive prestige.
- **Chests**: contain cards, gems and cash (as seconds of income). Sources: a free timed chest, mission rewards,
  gem purchase, deal bundles, a capped rewarded-ad chest. Opened with a full-screen sequence (shake, burst,
  cards flip one by one, rarity stingers). Deterministic seeded RNG in state. **Drop rates are shown to the
  player** (store rules for randomised items). Optional guarantee (e.g. at least one rare).
- **Missions**: three rolling goals (serve N customers, reach level N, open a chest, ...) with scaling targets
  and gem/chest rewards.
- **Deals**: real time-limited offers. A deal starts on a trigger (first session, first prestige, ...) and truly
  expires. Plus a daily rotating row of gem-priced offers and one free daily item. No fake timers, no invented
  discounts.
- **Daily gift** stays.

## Presentation

- **Scene**: one Skia canvas showing the venue: wall with stations along the top, the pass (counter + bell),
  a walkway, tables, a door. Characters and props are **drawn in code** (procedural vector art with thick
  outlines to sit next to the painted icons): walk cycles, dough tossing, tray carrying, eating, cheering. A
  character's look (skin, hair, hat, outfit, accessories) is data, so every reskin gets a cast for free. Painted
  images can replace any piece later.
- Any `icon` field accepts an emoji, `asset:<key>` (image) or `char:<castId>` (procedural character bust).
- **Juice**: dishes arc from station to pass, coins pop from paying customers and fly to the cash counter,
  celebration banners, bottleneck warning chips, hint pointer for the first minutes.
- **Sound + haptics**: every event has a sound and a haptic pattern from one catalogue
  (`src/services/fx/catalog.ts`). Sounds are synthesised by a script in this repo (no licensing questions),
  shipped as a default pack every game gets, overridable per game. Music loop per game. Settings: sound, music,
  haptics toggles.

## Tabs (both modes)

Home (scene + upgrade list) | Staff (automation hires + card collection) | Upgrades | Empire (venues + prestige) |
Shop (deals, chests, gems, daily). Missions and settings are buttons on the home screen.

## Monetization placements (unchanged principles)

Rewarded ads are opt-in and generous: boost, double offline, open the free chest sooner, one extra ad chest a
day, reset the Rush cooldown. Interstitials stay rare and only at natural breaks. IAP: no-ads, permanent
multipliers, gems, bundles (deals). Everything bought must be restorable or consumable-safe.

## Open questions for reviewers

1. Concrete numbers: station table for a 6-station venue (cycle 2 to 8 s so cooking is watchable), transport and
   sales cost/capacity growth, worker and seat thresholds, venue scales and unlock costs, prestige threshold,
   so that (a) the first automation comes within 1 to 2 minutes, (b) a new unlock roughly every few minutes in
   the first half hour, (c) venue 2 at 20 to 40 minutes, (d) first prestige at 2 to 5 hours, (e) transport and
   sales are real decisions (roughly 20 to 35 % of spend) but never a wall.
2. Is the chain fun in the first 10 minutes? What is missing compared with the best games in the genre?
3. Card effects, chest contents and odds, mission templates and deal definitions that are generous enough to be
   fun without breaking the economy.
4. Engineering risks: state shape, save migration, determinism, performance with ~40 animated actors, testability.
