# Critique: will the living restaurant be fun? (UI build sheet)

Senior game design review, 22 Nov 2026. Based on the itf-engine code (schema.sim, chain, economy, meta, store), `games/pizza-empire/game.json`, `simulate.ts` runs of 3, 12 and 24 h, `catalog.ts` and `src/ui/sim/layout.ts`. **bot** = simulator time; **human** = bot time plus about 25 %.

## 1. Verdict

| When | Verdict | Sag | Cheapest fix |
|---|---|---|---|
| Min 1 | Good: juggle oven, bell and buy for about 60 s, then relief when the first hire comes. | Floor tips ($1 a tap) earn more than the oven ($2.50 per 2 s). Three story dialogs within 21 s. | `economy.tapBase` 1 → 0.25. Story edits in §2. |
| Min 10 | Good until about 13 min: an unlock or a hire every 2 to 4 min. | The room stops growing: 8 tables at 5 min, 6 waiters at 10 min. No unlock or hire from 12:51 to 25:37. Before the Maître d' the read-out would say "Waiters 0/s". | Decor tiers (§3). Gelato `managerCost` 33M → 12M. Engine gap 3. |
| Day 2 | The return loop is fine: offline earnings, a stored free chest, the daily gift, one deal popup. | The first Franchise (bot 3 h 18 m) gives +3 Chef Stars, only +6 %. Gaps of 44 min (from 1 h 31) and 2 h 52 m (ending 6 h 55). Roma is maxed within 1 s of opening. | `prestige.scale` 1 → about 20 (first Franchise worth ×2 or more; rerun `--prestige`). An "all ×2" upgrade at about 5e13. Grand Opening (§4 #12). `palette` per venue. |
| Day 14 | Weakest: every run replays the same 30 min in Napoli. 12 cards. | No new mechanic after week 1. | NICE: a weekend event venue; a named card for each venue opened. |

For a balanced buyer, production is the bottleneck 99 % of the time. Waiters and tables take 22 % of spending. The chain only becomes a decision when the player buys oven levels with max, so the pile on the pass and the read-out have to make that moment obvious.

## 2. First session

The hint is `M.nextHint(cfg, game, now)`, polled each second; the hand appears with fx `hint`.

| t (human) | Player sees → ONE ask | Hint | Reward | fx |
|---|---|---|---|---|
| 0 s | Napoli room: an idle oven, a waiter asleep at the pass, 2 tables. Nonna's intro (3 lines). A guest enters at about 2 s. | none | none | `story_open`, `blip_mid`, `door` |
| 8 s | Tap the oven | `tapStation margherita` | Cook pose, 2 s ring | `ui_tap` |
| 10 s | A dish arcs to the pass → ring the bell | `bell` | Waiter wakes with "!" | `cook_done`, `toss`, `bell` |
| 11 to 14 s | Waiter carries (6 s round trip) → tap the oven again | `tapStation` | Plate lands | `pickup`, `serve` |
| 17.5 s | Guest finishes eating (3.5 s) | none | **First coin flies to the header** | `cash`, `coin` |
| 22 s | Buy oven level 2 ($5.60) | `buyBusiness margherita` | Oven bounces | `buy` |
| 25 to 50 s | Rotate: oven, bell, buy | rotates | Level 10 at about 45 s: "×2 speed" | `milestone` |
| 65 s | Hire Pizzaiolo ($140), inline on the oven row | `hireBusiness margherita` | Chef walks in from the door and starts tossing | `hire` |
| 65 to 95 s | Ring the bell; save $400 | `bell` | Guests pay | `bell`, `cash` |
| 95 s | Hire the Maître d' | `hireTransport` | Waiters stand up; "+$45/s" counts up in the header; Pepe's beat | `hire`, `blip_high`, `gems` |
| 100 s | The Rush button appears → try it | gap `startRush` | Everything runs ×3 for 30 s | `rush_start` |
| 2:00 | Unlock the Antipasti Counter ($110) | `buyBusiness bruschetta` | Station drops in | `unlock` |
| 2:10 | Hire the Prep Cook | `hireBusiness bruschetta` | Hire walk-in | `hire` |
| 2:30 | Fresh Basil (Recipes tab) | gap `buyUpgrade` | Margherita ×3 | `upgrade` |
| 3:00 | First mission done → claim it | `claimMission 0` | Gems fly to the gem pill | `mission_complete`, `gems` |

**To minute 30:**
- 4:45 Carl appears.
- 5:00 the free chest is ready (`openChest`; §5).
- 5:30 Pasta Chef.
- 6:00 Fry Station.
- About 8:00 the 5th mission: a milestone Pizza Box.
- 11:00 Fry Cook.
- 15:00 Gelato Cart and Nonna's "Dolce!".
- 17:00 Gelataio (after the price fix).
- 27:00 Espresso Bar.
- 34 to 40 min Roma.

**game.json edits**
- Delete `first_chef` (the hire banner covers it) and give its 5 gems to `meet_pepe`.
- `second_station`: count 1 → 10. Its text is about milestones, and today it lands 4 s after Pepe.
- `billionaire` urges a Franchise about 2 h before one is possible: trigger it at the first Chef Star (lifetime = threshold / scale²).
- Prices: `tapBase` 0.25; Gelato `managerCost` 12M; the 5e13 upgrade; `meta.freeChest.firstMinutes` [5, 60].

**UI rules:** at least 45 s between story popups, and none during a chest or a banner. No Golden Slice before `meet_pepe`.

## 3. Home screen (390 × 844)

| Zone | Height | Contents |
|---|---|---|
| Safe area | 47 | |
| Header | 56 | Cash (28 pt) with "+$/s" under it, ×2 boost pill, gem pill (→ Shop), gear |
| Scene | 300 | `computeLayout(390, 300)` |
| Stage strip | 36 | Three chips (read-out and list selector) |
| Buy amount | 32 | ×1 / ×10 / ×100 / MAX |
| List | 283 | Rows of 76 |
| Tab bar | 56 | Home, Staff, Recipes, Empire, Shop |
| Home indicator | 34 | |

No banner and no hero on Home.

**Scene, y on the 300 px canvas**
- Wall 0 to 45: venue chip top-left (8, 8), with a caret once there are 2+ venues (→ `setVenue` sheet). Top-right, 44 px each: chest button (286, 8) and missions button (338, 8).
- Stations on the floor line at y 115; cooks at y 135.
- The pass at y 150 to 172, x 20 to 300: a capped pile of 8 dishes plus a "×N" count. The bell at (282, 155), hit area 56 px.
- Rush: a 56 px circle at (340, 176) with a cooldown ring.
- Waiters wait at y 187. Tables in a 4 × 2 grid at y 220 and 274. Door at (359, 240).

**Tap targets**
- Idle unmanaged station → `startBusiness`. Any other station → its row.
- Bell → `ringBell`. Waiter or table → that stage's chip.
- Empty floor → `tapHero(x, y)`.
- Chest button → `claimFreeChest`, else `openChest`, else a sheet with odds and the real recharge time.
- Missions button → `openModal({type:'missions'})`.

**Stage colours**, always with the icon as well:

| Stage | Name | Colour | Where it shows in the scene |
|---|---|---|---|
| Production | Kitchen | ember #EF7D22 | Wall plaque, cooks' bandanas |
| Transport | Waiters | teal #2A9D8F | Edge of the pass, bell base, aprons |
| Sales | Dining Room | aubergine #7B5EA7 | Rug |

The strip reads "🍕 Kitchen 1.6K/s · 🤵 Waiters 2.4K/s · 🍽️ Dining 2.1K/s" (`venueRates` × `globalMultiplier`). The lowest chip is filled and marked "▼ limits income": no red, no sound.

The selected chip picks the list:
- Kitchen: station rows with milestone pips and an inline Hire.
- Waiters: the transport row (workers, capacity, next worker at level N) and the Maître d' card.
- Dining: tables, spend per guest, next table at level N.

A transport or sales hint switches the chip.

**Decor tiers** (UI only): every 25 transport levels changes the uniform; every 25 sales levels adds tablecloth, then candles, then plants.

**375 × 667:** safe area 20, header 48, scene 220, strip 32, buy amount 28, list 269 (rows of 64), tab bar 50.

## 4. Juice, ranked

| # | Trigger | Animation | fx |
|---|---|---|---|
| 1 | `ringBell` | Bell swings 620 ms with a shock ring; sleeping waiters pop "!" | `bell` |
| 2 | `pay` | Coins arc to the header and the counter rolls; above 4 a second, merged every 250 ms | `cash`, `coin` |
| 3 | `cycle` | Dish arcs to the pass (350 ms), squashes, the pile grows | `cook_done`, `toss` |
| 4 | `buy` | Station bounces to 1.15 for 160 ms; at a milestone, a gold ring and "×2 speed" | `buy` / `milestone` |
| 5 | `hire`, `hireTransportManager` | The hire walks in from the door and cheers (or wakes all waiters) | `hire` |
| 6 | First `buy` of a station | Drops from the ceiling, padlock pops | `unlock` |
| 7 | `startRush` | Warm vignette, speed lines, everything ×3 | `rush_start` / `rush_end` |
| 8 | `arrive` | Door swings; order bubble over the guest | `door` |
| 9 | `unload` → `served` | Plate bounces, steam rises, guest eats | `serve` |
| 10 | `tapHero` | "+$" float, combo meter | `tap` (ladder), `combo_up` |
| 11 | `spawnBonus` / `collectBonus` | Golden Slice flies on a sine path; coin burst | `bonus_appear` / `bonus_collect` |
| 12 | `unlockVenue` | Grand Opening: the buy-max cascade as a 3 s montage, then one banner | `unlock_venue` |

Celebrations: at most one banner per 1.5 s, and bursts merge into one ("+12 upgrades").

## 5. Chest opening (at most 10 haptic pulses)

| ms | What happens | fx (pulses) |
|---|---|---|
| 0 | Scene dims to 70 % | none |
| 250 to 600 | Chest drops, squashes, dust | `chest_appear` (1) |
| 600+ | Bob. The lid glows in the colour of the best rarity **really** inside. "Tap to open"; opens on its own at 2500. | none |
| tap | 3 wobbles in 450 ms | `chest_shake`, sound only |
| +450 | Burst and rays | `chest_open` (2) |
| +900 | Slots fan out face-down, 80 ms apart, best last | none |
| +1300 | Reveal on tap or every 700 ms. Cash and gem slots play `coin` / `gems` with `{haptic:false}`. | see the ladder |
| end +400 | Summary → Collect → `closeChest()` | `ui_close` |

Skip is always visible. A card vibrates only if its pattern fits the remaining budget; the worst case (an epic and a legendary) uses 3 + 2 + 4 = 9 pulses.

| Rarity | Before the flip | Flip | After | fx (pulses) |
|---|---|---|---|---|
| Common | none | 220 ms | Cream frame | `reveal_common` (1 only when it is the best card) |
| Rare | 250 ms blue shimmer | 260 ms | Sparkle | `reveal_rare` (1) |
| Epic | 500 ms lift, purple rays | 300 ms | Particle burst | `reveal_epic` (2) |
| Legendary | 900 ms dim, card to centre, 3 gold heartbeats | 360 ms | Gold flash, confetti, 2 s hold | `reveal_legendary` (4) |

After each card: a "NEW" stamp, the copies count and a level bar. Levelling up is never automatic.

## 6. Priorities

**MUST**
1. Layout, stage strip and colours (§3).
2. Hints, script and game.json edits (§2).
3. A manual-phase read-out ("Ring the bell").
4. Juice #1 to #6 and coalesced banners.
5. The chest sequence and haptic budget, with an odds link on every chest (before the ad for the ad chest).
6. Decor tiers and a palette for each venue.
7. Remove the interstitials on `tab_change`, `offline_collect` and `chest_close` (still in the store).

**SHOULD**
- `prestige.scale` about 20; the 5e13 upgrade; Grand Opening; juice #7 to #12.
- Hide Rush, chest and missions until the Maître d' is hired.

**NICE**
- An event venue; a card for each venue.

**CUT**
- The hero on Home.
- The `first_chef` dialog.
- Drawing more than 6 waiters or 8 tables.
- Red or alarm styling on bottlenecks and timers.

## 7. Honest-engagement check

| Problem | Replacement |
|---|---|
| The daily streak resets after one missed day | Count days claimed |
| "One time only!" on the permanent starter pack | "Can be bought once." |
| `billionaire` promises a Franchise early | Retrigger it (§2) |
| An interstitial after a chest or after declining ×2 | Remove it |
| A rarity tease that does not match the result | The tell always equals the real result |
| Offline copy that makes the player feel guilty | "Earned while away (up to 4 h)" |

Already right: real deal end times of 48 h or more, no haptic on offers, earned-only chests.

## Engine gaps

1. The `meta.ts` `todo()`s, and **`games/pizza-empire/game.json` has no `meta` block**. This blocks the chest and mission UI.
2. Add to `Hint`: `startRush`, `buyUpgrade{upgradeId}`, `unlockVenue{venueId}`, `claimFreeChest`, `levelUpCard{cardId}`.
3. `VenueRates.manualTransport` and `transportPotential`: today transport reads 0/s before the hire.
4. `refreshMissions`: skip `rush` until a transport hire exists, and `chests` until a chest is owned.
5. `daily.daysClaimed`, with `dailyReward` indexed by it.
6. Schema: `theme.colors.stages {production, transport, sales}`.
7. `prestigePreview(cfg, state)`.
8. `GrantedReward` card: add `rarity`.
