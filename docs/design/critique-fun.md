# Critique: will the living restaurant be fun? (UI build sheet)

Senior game design review, 22 Nov 2026. Sources: engine `itf-engine` (schema.sim, chain, economy, meta, store), `games/pizza-empire/game.json`, `simulate.ts --hours 3/12/24`, fx `catalog.ts`, art `src/ui/sim`. Timings marked **bot** come from the simulator; **human** = bot plus about 25 % for reaction time and dialogs.

## 1. Verdict

| When | Fun? | Sag | Cheapest fix |
|---|---|---|---|
| Minute 1 | Yes, if hint-driven: three targets (oven, bell, buy) juggled for about 60 s, then relief when the first hire arrives. | Floor tips ($1 a tap) out-earn the oven ($2.50 per 2 s) until the hire, so the player learns "tap the floor", not the chain. Three story dialogs in 21 s (bot 30 s, 47 s, 51 s). | `economy.tapBase` 1 → 0.25. Story edits in §2. |
| Minute 10 | Yes until about 13 min (an unlock or hire every 2 to 4 min). | The room stops growing: 8 tables at 5 min, 6 waiters at 10 min. 12:51 → 25:37 has no unlock or hire (income flat at 161K/s). Before the Maître d' the bottleneck read-out would say "Waiters 0/s". | Decor tiers by level (§3). Gelato Cart `managerCost` 33M → 12M. Manual-phase read-out (engine gap 3). |
| Day 2 | Return loop is fine: offline earnings (4 h at 50 %), a stored free chest, the daily gift, one deal popup from session 2. | The first Franchise (bot 3 h 18 m) gives +3 Chef Stars = +6 %: resetting four restaurants for 6 % feels like a trap. Gaps of 44 min (1 h 31 → 2 h 15) and 2 h 52 m (ending 6 h 55). Roma is maxed within one second of opening. | `prestige.scale` 1 → about 20, so the first Franchise is worth ×2 or more (rerun `--prestige`). Add one "all ×2" upgrade at about 5e13. A "Grand Opening" montage for new venues (§4 #12). A palette for each venue. |
| Day 14 | Weakest. Each run replays the same 30 min in Napoli. 12 cards, 8 venues. | No new mechanic after week 1 (research: days 7 to 30 lose players). | NICE: a weekend event venue that reuses the chain; one named card granted per venue opened. |

The chain is honest but rarely a decision: for a balanced buyer, production is the bottleneck 99 % of the time. Waiters and tables take 22 % of spending, at the low end of the 20 to 35 % target. The read-out and the pile on the pass have to make the moments when it does bind (buy-max on the oven) visible.

## 2. First session script

Hints come from `M.nextHint(cfg, game, now)` (computed in the UI each second). Show the hand with fx `hint`.

| t (human) | Player sees | The ONE ask | Hint | Reward moment | fx |
|---|---|---|---|---|---|
| 0 s | Room in Napoli: an oven with no cook, one waiter asleep at the pass, 2 tables, the door. A guest walks in at about 2 s. | Read Nonna (3 lines, tap to advance). | none | none | `story_open`, `blip_mid`, `door` |
| 8 s | Oven glows. | Tap the oven. | `tapStation margherita` | Cook pose, 2 s progress ring | `ui_tap` |
| 10 s | A dish arcs to the pass. The bell wobbles. | Ring the bell. | `bell` | The waiter wakes with a "!" | `cook_done`, `toss`, `bell` |
| 11 to 14 s | Waiter loads (0.6 s) and walks (2.4 s). Order bubble over the guest. | Tap the oven again. | `tapStation` | Plate lands on the table | `pickup`, `serve` |
| 17.5 s | Guest eats 3.5 s and pays. A coin flies to the header. | none | none | **First $2.50** | `cash`, `coin` |
| 20 to 25 s | Oven row button turns live. | Buy oven level 2 ($5.60). | `buyBusiness margherita` | Oven bounces, value ×2 | `buy` |
| 25 to 50 s | The juggle: oven, bell, buy. | Same three in rotation. | rotates | Oven level 10 at about 45 s: "×2 speed" (1 s cycle) | `milestone` |
| about 65 s | "Hire Pizzaiolo $140" turns live on the oven row. | Hire. | `hireBusiness margherita` | Chef walks in from the door (1.8 s), cheers, starts tossing | `hire` |
| 65 to 95 s | Only the bell is manual now. | Keep ringing; save $400. | `bell` | Each guest pays | `bell`, `cash` |
| about 95 s | Maître d' button lit. | Hire. | `hireTransport` | Waiters stand up; "+$45/s" counts up in the header for the first time | `hire`, then `story_open` (Pepe, `blip_high`), `gems` |
| 100 s | Rush button fades in (shown once the transport hire exists). | Try Rush. | gap: `startRush` | Everyone moves ×3 for 30 s | `rush_start` / `rush_end` |
| 110 to 130 s | Antipasti Counter padlock ($110). | Unlock it. | `buyBusiness bruschetta` | Station drops in, padlock pops | `unlock` |
| 2:10 | Prep Cook ($3.1K). | Hire. | `hireBusiness bruschetta` | Same as the first hire | `hire` |
| 2:30 | Fresh Basil (Recipes tab, $6K). | Buy the upgrade. | gap: `buyUpgrade` | Margherita ×3 | `upgrade` |
| 3:00 | Pasta Pot unlocked. First mission done. | Claim it. | `claimMission 0` | Gems fly to the gem pill | `mission_complete`, `gems` |

Beats to minute 30: 4:45 Carl's first appearance (rival, `blip_low`). 5:00 first free chest ready (§5). 5:30 Pasta Chef. 6:00 Fry Station. 7 to 8 min 5th mission: milestone Pizza Box. 11 min Fry Cook. 15 min Bronze-Cut Pasta, Gelato Cart, Nonna's "Dolce!". 17 min Gelataio (after the price fix; today 25:37). 20 to 25 min decor tier 2, card level-ups. 27 min Espresso Bar. 30 min Saffron Rice. 34 to 40 min Roma.

**Data edits (game.json)**
- Delete `first_chef` (the hire banner covers it). Move its 5 gems to `meet_pepe` (10).
- `second_station`: trigger count 1 → 10. Its text is about levels 10/25/50, and today it fires 4 s after Pepe.
- `billionaire` tells the player to franchise about 2 h before it is possible. Trigger it when the first Chef Star becomes available (lifetime = threshold / scale²).
- `tapBase` 0.25. Gelato `managerCost` 12M. Add an "all ×2" upgrade at 5e13. `meta.freeChest.firstMinutes: [5, 60]`.
- UI rules: never two story popups within 45 s, and none during a chest opening or a celebration. The first Golden Slice spawns only after `meet_pepe` (store `spawnBonus` is driven by the UI).

## 3. Home screen (390 × 844)

| Zone | Height | Contents |
|---|---|---|
| Safe area | 47 | |
| Header | 56 | Cash (28 pt) and "+$/s" under it. A ×2 boost pill (real countdown while active). Gem pill → Shop. Gear → settings. |
| Scene | 300 | Skia canvas, `computeLayout(390, 300)` |
| Stage strip | 36 | Three chips: read-out and list selector |
| List header | 32 | ×1 / ×10 / ×100 / MAX |
| Upgrade list | 283 | 3.5 rows of 76 |
| Tab bar | 56 | Home · Staff · Recipes · Empire · Shop. Dot badges only for something actionable. |
| Home indicator | 34 | |

No banner on Home (policy). On the other tabs the banner sits under the header. The hero mascot and the "Watch ad ×2" bar from v2 are cut.

**Inside the scene** (positions from `layout.ts`, at height 300)
- Wall 0 to 45: venue chip top-left (8, 8): icon and name, with a caret once two or more venues exist; tap → venue sheet (`setVenue`). Top-right: chest button (286, 8) and missions button (338, 8), 44 × 44 each.
- Stations on the floor line at y 115 (up to 6, 86 px slots). Cooks stand at y 135.
- The pass at y 150 to 172, x 20 to 300. The pile of dishes is capped at 8 drawn, with a "×23" count. The bell at (282, 155), hit area 56 × 56.
- Rush button: a 56 px circle at (340, 176), right of the pass. Its ring drains while Rush runs and refills during the cooldown.
- Walkway y 172 to 205 (waiters wait at y 187). Tables in a 4 × 2 grid at y 220 / 274. Door at (359, 240).

**Tap targets**
- Idle unmanaged station → `startBusiness`. Managed station → strip to Kitchen, list scrolls to its row. Locked station → its row.
- Bell → `ringBell`. Waiter → Waiters chip. Table or guest → Dining chip.
- Empty floor → `tapHero(x, y)` (a tip, with combo).
- Chest button: `claimFreeChest()` when one is ready, else `openChest(id)` when one is owned, else a chest sheet with odds and a real recharge time.
- Missions → `openModal({type:'missions'})`. Golden Slice → `collectBonus`.

**Three stages, one colour each** (icon plus colour, never colour alone)

| Stage | Name in scene, strip and rows | Colour | In the scene |
|---|---|---|---|
| production | Kitchen | ember #EF7D22 | Plaque on the wall, cooks' bandanas |
| transport | Waiters (The Pass) | teal #2A9D8F | Edge of the pass, bell base, waiter aprons |
| sales | Dining Room | aubergine #7B5EA7 | Rug under the tables |

The strip chips show "🍕 Kitchen 1.6K/s · 🤵 Waiters 2.4K/s · 🍽️ Dining 2.1K/s", from `venueRates` × `globalMultiplier`. The lowest chip is filled and marked "▼ limits income". This is information, not an alarm: no red, no sound. The selected chip picks the list:
- Kitchen: station rows (level badge, cycle bar, milestone pips 10/25/50, Buy, and an inline "Hire …" until managed).
- Waiters: transport row (workers, capacity per trip, next worker at level N) and the Maître d' card.
- Dining: sales row (tables, spend per guest, next table at level N).

A hint for transport or sales switches the chip itself.

**Decor tiers after the caps.** Pure UI, from the levels: every 25 transport levels changes the waiters' uniform; every 25 sales levels adds tablecloth, then candles, then plants. The room keeps changing after 6 waiters and 8 tables.

**375 × 667:** safe area 20, header 48 (cash 24 pt), scene 220 (layout scales, character height about 42), strip 32, list header 28, list 269 (rows of 64, about 4 rows), tab bar 50.

## 4. Juice, ranked

| # | Trigger | Animation | fx |
|---|---|---|---|
| 1 | `ringBell` | Bell swings (620 ms) with a shock ring; sleeping waiters pop "!" | `bell` |
| 2 | event `pay` | 1 to 3 coins arc into the header; the cash counter rolls. Above 4 pays a second, merge into one burst every 250 ms. | `cash`, `coin` |
| 3 | event `cycle` | Dish arcs from station to pass (350 ms), squashes, the pile grows | `cook_done`, `toss` |
| 4 | `buy` / milestone | Station bounces to 1.15 (160 ms), level ticks up; at a milestone, a gold ring and a floating "×2 speed" | `buy` / `milestone` |
| 5 | `hire` / `hireTransportManager` | Hire walks in from the door, cheers, starts working (or wakes every waiter) | `hire` |
| 6 | first `buy` of a station | Drops from the ceiling, dust puff, padlock pops | `unlock` |
| 7 | `startRush` | Warm edge vignette, speed lines on walkers, the room runs ×3 | `rush_start` / `rush_end` |
| 8 | event `arrive` | Door swings; guest walks in; order bubble with the dish icon | `door` |
| 9 | event `unload` → `served` | Tray set down, plate bounces, steam, guest switches to sit-eat | `serve` |
| 10 | `tapHero` | "+$" float; combo meter climbs; note rises in pitch | `tap` (ladder), `combo_up` / `combo_max` |
| 11 | `spawnBonus` / `collectBonus` | Golden Slice flies on a sine path; burst and a coin shower | `bonus_appear` / `bonus_collect` |
| 12 | `unlockVenue` | Grand Opening: the buy-max cascade plays as a 3 s montage (stations drop 300 ms apart). One banner: "Trattoria Roma open: 6 stations". | `unlock_venue` |

Also: every third event `leave` → a cheer and a heart (`happy`). Celebrations are coalesced: at most one banner per 1.5 s, and bursts are merged ("+12 upgrades").

## 5. Chest opening (at most 10 haptic pulses)

| ms | What moves | fx (pulses) |
|---|---|---|
| 0 | Scene dims to 70 %, blurs | none |
| 250 to 600 | Chest drops and lands with a squash and dust | `chest_appear` (1) |
| 600+ | Bob; lid glows in the colour of the **best rarity actually inside** (an honest tell); "Tap to open"; auto-opens at 2500 | none |
| tap +0 | Three wobbles in 450 ms | `chest_shake`, sound only |
| +450 | Lid bursts, light rays | `chest_open` (2) |
| +900 | Slots fly out face-down into a fan, 80 ms apart, in `openChest` reveal order (best last) | none |
| +1300 | Reveal on tap, or every 700 ms. Cash and gem slots use `coin` / `gems` (sound only). | see ladder |
| last +400 | Summary grid; "Collect" → `closeChest()` | `ui_close` |

"Skip" is always visible and jumps to the summary.

**Haptic budget:** 3 pulses are used before the cards. Cards vibrate only when rare or better, and only if their pattern fits the remaining budget; otherwise they play with `{haptic:false}`. Worst case: epic plus legendary = 3 + 2 + 4 = 9.

**Reveal ladder**

| Rarity | Pre-flip | Flip | After | fx (pulses) |
|---|---|---|---|---|
| Common | none | 220 ms | Cream frame | `reveal_common` (0, or 1 when it is the best card) |
| Rare | 250 ms blue edge shimmer | 260 ms | Blue frame, sparkle | `reveal_rare` (1) |
| Epic | 500 ms lift and purple rays | 300 ms | Particle burst | `reveal_epic` (2) |
| Legendary | 900 ms: darker, card to centre, 3 gold heartbeats | 360 ms | Gold flash, confetti, name types in, 2 s hold | `reveal_legendary` (4) |

After each card: a "NEW" stamp (`isNew`), "×3" copies, and the bar to the next level fills. A "Level up" pill links to the card; levelling up is never automatic.

## 6. Changes

**MUST**
1. Home layout, stage strip and colours as in §3. No hero, no banner on Home.
2. Hints from `nextHint` and the script in §2. Story spacing rules. The game.json edits in §2.
3. A bottleneck read-out that says "Ring the bell" before the Maître d'.
4. Juice #1 to #6, and coalesced celebrations.
5. The chest sequence and haptic budget in §5. An odds link on every chest, including the ad chest before its ad.
6. Decor tiers, and a palette for each venue (`venues[].palette`).
7. Remove the interstitials on `tab_change`, `offline_collect` and `chest_close` (all three are still in the itf-engine store).

**SHOULD**
- `prestige.scale` about 20; the 5e13 upgrade; Grand Opening; juice #7 to #12.
- Hide the missions, chest and Rush buttons until relevant (after the Maître d' hire).

**NICE**
- Weekend event venue; a card per venue; guest variety per venue (cast looks).

**CUT**
- The hero and "Toss the dough!" from the sim Home screen.
- `first_chef` dialog.
- Drawing more than 6 waiters or 8 tables (show the count instead).
- Any red or alarm treatment on bottlenecks or timers.

## 7. Honest-engagement check

| Issue | Replacement |
|---|---|
| Daily gift streak resets to day 1 after one missed day (`dailyReward`): loss aversion | Count days claimed; missing a day loses nothing |
| Starter pack copy "One time only!" on a permanent item | "Can be bought once." |
| `billionaire` beat promises a Franchise about 2 h early | Retrigger (§2) |
| Interstitial right after the chest peak or after declining ×2 | Remove (MUST 7) |
| A legendary-looking tease that turns out common (near miss) | The tell always equals the real best rarity |
| Wording such as "your restaurant stopped earning" after the offline cap | "Earned while away (up to 4 h)" |
| Mission daily cap | "New missions tomorrow". Nothing that pushes. |

Already right: real deal end times (48 h or more), no haptic on offers, earned-only chests, honest free-chest timer.

## Engine gaps

1. `meta.ts` contract `todo()`s, and **the `meta` block (cards, chests, freeChest, missions, deals, dailyShop) is missing from `games/pizza-empire/game.json`**. This blocks the chest and mission UI; use dev presets until then.
2. Add these kinds to `Hint`: `{kind:'startRush'}`, `{kind:'buyUpgrade';upgradeId}`, `{kind:'unlockVenue';venueId}`, `{kind:'claimFreeChest'}`, `{kind:'levelUpCard';cardId}`.
3. `VenueRates.manualTransport: boolean` plus `transportPotential` (the rate if the bell is rung on time). Today the transport rate is 0 before the hire.
4. `refreshMissions`: skip `rush` templates until a transport hire exists, and `chests` until the first chest is owned.
5. `GameState.daily.daysClaimed`, with `dailyReward` indexed by it (no streak loss).
6. Schema: `theme.colors.stages {production, transport, sales}`.
7. `prestigePreview(cfg, state) → {points, multNow, multAfter}`.
8. `GrantedReward` card: add `rarity` (a convenience).
