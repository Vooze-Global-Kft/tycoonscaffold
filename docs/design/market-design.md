# Night Market: final design of the merge game

Status: final, revision 2, the version the team builds. Date: 23 November 2026. Revision 2 answers the builder's and the store reviewer's findings in place; the points decided differently from a reviewer's suggestion are argued in 1.3.
Game folder: `games/night-market` (working name; the store title is "Lantern Row", 7.1). Mode (new): `merge`. Save key: `save:night-market:merge1`.

Conventions:
- "pt" is a layout point, "s" is seconds of the game clock, "c" is coins.
- The game clock is the shared `stats.playSeconds`. It moves only while the game runs (never while the app is closed). The season clock is `playSeconds − seasonStartedAt`.
- A number marked (tune) is a starting value that only `scripts/content/build-night.py` may move, inside its range, to meet section 8. A number without (tune) is a rule. A range is never widened silently: the bot reports its best result and the lead decides.
- Every time and income in sections 2.12, 3.2 and 3.3 is a placeholder target (as Decision 16 of the second game): no test reads them, and `build-night.py --table` replaces them. Section 8 is the only gate. Every price is exact by the rules.
- Chains are indexed 0 to 5 in data (Grill 0 … Puffs 5); tiers 1 to 8; seasons 1-based on screen, 0-based in state.
- "Pizza" means Pizza Empire, "Orbit" means Orbit Haulers.

---

## 1. The game and its fingerprint

### 1.1 The game in five sentences

1. You run the stalls of Lantern Row, a street market at dusk, where fox, hedgehog, badger, otter, bat and owl customers step up to your counters holding paper order tickets.
2. Each stall's gear (an Ember Grill, a Copper Urn, a Bamboo Steamer) drops a basic snack onto the 7 by 8 board every 4 seconds, and you drag two identical snacks together to make a better one, eight steps up (a Pepper Skewer ends as a Dragon Grill Board).
3. You are paid only when the exact snacks a ticket lists are dragged onto it: it is stamped, folds into a paper lantern and floats its coins to your purse, so who is waiting sets what you merge.
4. Coins buy finer (never faster) gear, board space, new stalls and minders, who put a house snack's price into the till, also while you are away.
5. Each season ends with a Festival ticket; when it is filled you may close the season, and the next one changes the street (a new character of the place, and from the third season a new board shape), while board space, lanterns, the Ladder Book and seasoned gear carry over (no reset currency, no multiplier).

### 1.2 Fingerprint along the 19 dimensions

Declared in `games/night-market/store/fingerprint.json`, from the closed vocabulary of `scripts/lib/fingerprint.ts`; P3 adds `grid-board` to `VOCABULARY.main_screen_layout` (9.2, 10.2).

| # | Dimension | Night Market | Pizza Empire | Orbit Haulers | vs P | vs O |
|---|---|---|---|---|---|---|
| 1 | core_verb [M] | place/arrange: drag a good onto an identical good, or onto a ticket, where it is consumed | tap-target | drag/route | differs | differs |
| 2 | production_topology [M] | spatial-grid: goods occupy limited cells | linear-chain-with-transport | network-routes | differs | differs |
| 3 | money_moment [M] | contract-complete: a ticket pays only when its last line lands; no single good, merge or discovery pays | customer-pays | sale-at-depot | differs | differs |
| 4 | main_screen_layout [M] | grid-board: a fixed 7 × 8 board under a street frieze, no camera | side-cross-section | top-down-map | differs | differs |
| 5 | art_asset_overlap [M] | 0 %: all drawn in code in `src/ui/merge/art` | measured | measured | differs | differs |
| 6 | store_text_overlap [M] | under 10 %: all store text new | measured | measured | differs | differs |
| 7 | icon_and_screenshot_template [M] | own (7.4) | human | human | pending | pending |
| 8 | bundle_foreign_content [M] | none: mode `merge`, own folders, own fx catalogue | bundle report | bundle report | pending | pending |
| 9 | progression_structure | seasons: one street that changes shape each season | location-levels | sector-map | differs | differs |
| 10 | prestige_model | seasonal: closed by the player; no calendar, currency, multiplier or choice | reset-for-currency | reset-for-currency | differs | differs |
| 11 | active_skills_events | {parade-order, lucky-merge, ticket-gift-box} | 6 ids, Jaccard 0 | 4 ids, Jaccard 0 | differs | differs |
| 12 | meta_systems | {contracts, ladder-book, lantern-gate, minders, chests, prestige} | literal 2/12 = 0.17; 3/11 = 0.27 counting minders as Pizza's station managers | 3/11 = 0.27 (contracts, chests, prestige) | differs | differs |
| 13 | meta_screen_layouts | different: bamboo ladders, a lantern arch, a paper bag, a scroll | human | human | pending | pending |
| 14 | art_style | flat-vector, palette lantern-night (4.6) | warm-cream | deep-space-cold | differs | differs |
| 15 | character_kind | animals | humans | robots | differs | differs |
| 16 | audio_overlap | 0 %: soundPack null, own instruments, compare.py cross-key mode | measured | measured | differs | differs |
| 17 | tone_and_string_overlap | voice lantern-calm; under 5 % shared strings | warm-playful | dry-radio-chatter | differs | differs |
| 18 | keyword_overlap | market, board, skewer, tea, dumpling, noodle, sweets, food, stall, street, puzzle, cozy: Jaccard 0 with both | | | differs | differs |
| 19 | release_gap | first submission at least 14 days after Orbit's last | log | log | pending | pending |

Count: against each game, 8 of 8 must and 19 of 19 planned differ. Verifiable at design time: 15 (1 to 6, 9 to 12, 14 to 18). Pending until release: 7, 8, 13 (a person or the build) and 19 (the log). If dimension 13 were ruled "restyled", the floor is 18 of 19 against each.

Other validate checks: no "Empire", "X: Y" shape or "Night Market" in the title; no "Idle … Tycoon" pattern, and idle and tycoon only in the description; product kinds {cosmetic, unlock, skipAds} as a multiset, against Pizza's {noAds, skipAds, multiplier ×2, gems ×4, timeWarp, deal ×2} and Orbit's {clearance, unlock, starterPack, gems ×2} (the sequence check stays, a multiset check is added); ids prefixed `night_`; product text under the trigram threshold against both games' product text.

Weakest claims, argued in `REVIEW-NOTES.md` with the tap path:
- 3 against Pizza: customers are visible, but none pays on arrival or per item; only a complete ticket pays.
- 3 against Orbit: Orbit's buyers post contracts too, but here there is no route, depot or vehicle; goods are made by hand on the board, two into one, and each line is filled by a drag. The description leads with the merge, not the contract.
- 4: the street sits above the board; the board is the whole play surface.
- 9 and 10 against Orbit: Orbit's player chooses a galaxy with printed conditions and buys a tree with a currency; a season here is not chosen and has no currency, tree or conditions list.
- 12: minders correspond to Pizza's per-station managers; we declare them openly and compute the Jaccard both ways.

### 1.3 Review points decided differently, with the reason

- Hit test (builder: under the floating good; store: the finger). The finger point, with the target under it outlined (4.3): with the good's point, the bottom-row Basket at 375 × 667 is reachable only in the last 8 pt of the screen. The outline keeps what is shown equal to what happens.
- Deliver-only bot "fills no ticket" (builder). Lines start one tier above the gear's base tier (the store reviewer's fix for the first upgrade making every order harder), so a ripe drop can match a line, delivered by the player's drag. The gate: the deliver-only bot earns at most 20 % of the active bot in hour 1, and the idle and check-in bots fill nothing (gate 4).
- The away ad's +50 % (store: Orbit's offer). Kept: it is the shared offline popup's ad in all three games (Pizza ×2, Orbit ×1.5). The ticket ×2 ad, which was Orbit's, is replaced by "fill one line".
- Lost drops (builder's choice a or b): b, a gear with a full shelf waits.

---

## 2. Rules

The rules are pure TypeScript in `src/engine/merge.ts` (the interface) and `src/engine/merge/`, installed by `src/engine/mergeMode.ts` as an `EngineMode`. The game.json `merge` block stays opaque in the shared schema (as `haul`) and is parsed by `src/config/schema.merge.ts` in `EngineMode.config`. No `Math.random`, no `Date.now`: random numbers come from derived streams (2.3), time as `now`.

### 2.1 The rules in ten lines (what the player is told, and the whole engine)

1. Each open stall's gear drops one good onto the board every 4 s. If there is no room (the board is full, or 4 of that chain's drop-tier goods are already loose), the drop goes onto the stall's shelf (up to 6); with the shelf full, the gear waits. Nothing is lost.
2. Drag a good onto an identical good below tier 8: they become one good of the next tier. 1 in 25 merges is Lucky and goes two tiers up.
3. Each counter has one customer with a ticket of 1 to 3 lines; drag the exact good onto the ticket to fill a line.
4. Only a full ticket pays, and it pays the price printed on it: Σ value(lines) × (1 + 0.15 × (lines − 1)).
5. value(c, k) = v_c × 2.4^(k−1) × stall bonus. A tier-k good holds 2^(k−1) basic goods, so each tier up pays 1.2 times more per basic good.
6. Gear levels make drops finer (a ripe chance of one tier more, and a higher base tier every 10 levels), never faster.
7. A hired minder puts one house good's price into the stall's till every 15 s, also while you are away (up to 4 h). The till joins the purse every minute and with every paid ticket.
8. Every line asks for at least one tier more than the gear's base drop; a ticket never asks for more than two of your best goods make, more than about 3 minutes of your gear (counting the tickets already waiting on it), or more cells than the board can spare.
9. Every 10 minutes of play the Paper Dragon Parade brings a gold ticket that pays double.
10. Fill the season's Festival to close the season when you choose: coins, goods, levels, stalls and minders reset; board space, lanterns, the Ladder Book, seasoned gear and cheaper stalls stay.

### 2.2 Content data (starting values)

Chains (v1: 6 chains of 8 tiers; names original):

| c | Chain, gear | v_c | r_c = v_c / 5 | Tiers 1 to 8 |
|---|---|---|---|---|
| 0 | Grill: Ember Grill | 5 | 1 | Pepper Skewer, Twin Skewer, Glazed Skewer, Skewer Bundle, Skewer Fan, Ember Plate, Smoke Platter, Dragon Grill Board |
| 1 | Tea: Copper Urn | 20 | 4 | Tea Leaf, Cup of Tea, Milk Tea, Pearl Tea, Tea Flight, Tea Tray, Moon Teapot, Midnight Tea Set |
| 2 | Steamer: Bamboo Steamer | 80 | 16 | Dough Ball, Dumpling, Dumpling Pair, Steamer Basket, Double Basket, Steamer Stack, Lantern Stack, Jade Pagoda |
| 3 | Sweets: Sugar Pan | 320 | 64 | Sugar Drop, Candied Berry, Berry Stick, Candy Posy, Honey Cake, Cake Stack, Lantern Cake, Festival Cake |
| 4 | Noodles: Noodle Wok | 1,280 | 256 | Noodle Nest, Noodle Cup, Broth Bowl, Topped Bowl, Big Bowl, Family Bowl, Long-Life Bowl, Thousand-Thread Pot |
| 5 | Puffs: Lantern Pan (season 2 on) | 5,120 | 1,024 | Puff Drop, Twin Puffs, Sesame Puff, Puff Cone, Puff Basket, Golden Heap, Sun Platter, Paper Moon Tower |

- Chain value step ×4 (tune 3 to 5); tier growth g = 2.4 (tune 2.2 to 2.6, above 2). Grill values, shown rounded (decision M19): 5, 12, 29, 69, 166, 398, 956, 2,290.
- `check:bundle` checks the names against both games' denylists; "Festival" appears only inside longer phrases.

Board: 7 × 8 = 56 cells, i = row × 7 + col, row 0 next to the street. Open at the first start: columns 0 to 5, rows 2 to 6 (30 cells). The other 26 are shutters in four groups; shutter n costs 30 × 1.45^n (tune 1.40 to 1.50), and its group's condition is printed on it:

| Shutters n | Cells | Condition | Costs |
|---|---|---|---|
| 0 to 5 | row 7, columns 0 to 5 | "Grill 3": a Glazed Skewer ever made | 30, 44, 63, 91, 133, 192 |
| 6 to 13 | column 6, rows 0 to 7, top first | "Steamer open" | 279 to 3.76K |
| 14 to 19 | row 1, columns 0 to 5 | "Sweets open" | 5.45K to 34.9K |
| 20 to 25 | row 0, columns 0 to 5 | "Noodles open" | 50.6K to 325K |

Shutters open in index order within a group and stay open across seasons. Every third (n = 2, 5, 8, …) holds a good: tier b + 1 or b + 2 (60/40) of the open chain with the lowest best tier.

Costs (below 1,000 rounded half up to a whole coin, above to 3 significant digits; shown = paid):
- Open stall i (i ≥ 1): a table of five tuned costs (decision M23; starting values Tea 120, Steamer 3,200, Sweets 51.2K, Noodles 819K, Puffs 13.1M), each × F_s, the familiar-faces factor of 2.11 (1 in the first season).
- Gear level L → L+1 (L from 1 to 39; level 40 is the top, decision M28): 20 × r_c × 1.45^(L−1) (tune 1.40 to 1.55). Grill: 20, 29, 42, 61, 88 …; Grill L1 → L11 costs 1,782 in all, L1 → L21 75.0K, L1 → L31 3.08M.
- Stall level M → M+1 (M from 1 to 30): 50 × r_c × 1.35^(M−1) (tune 1.30 to 1.40).
- Minder hire: 150 × r_c. Minder level K → K+1 (K from 1 to 3): 150 × r_c × 3^K (tune 2.5 to 3.5).

Gear (per chain, level L), with step s = 10 (tune 8 to 12):
- Interval T = 4 s, a rule (decision M3), never changed by level.
- Base tier b = min(4, 1 + floor((L − 1)/s)); ripe chance p = 0.05 × ((L − 1) mod s) (tune 0.04 to 0.06), at most 0.6 with all bonuses: a drop is tier b + 1 with probability p, else b. maxPop = b + (p > 0 ? 1 : 0).
- The sheet says what a base step does to orders: "From level 11: drops Twin Skewers; orders ask for Glazed Skewers and up."

Stall bonus S_c = 1 + 0.1 × (M − 1), at most ×3.9; levels 5 and 10 redraw the awning (looks only; three looks, decision M29).

Minders, one per stall: Old Brindle (badger, Grill), Pim (owl, Tea), Nettle (hedgehog, Steamer), Juniper (otter, Sweets), Tansy (raccoon, Noodles), Marlo (bat, Puffs).
- House tier h_c = min(K + 1, b_c + 1), tied to the gear; sale interval Q = 15 s (tune 10 to 25). The sheet names the limit: "held back by: minder level" when K < b_c, else "held back by: gear level".
- The share in closed form: a minder earns v_c × 2.4^(h−1) × S_c/Q per s; a gear whose drops are all delivered at tier k̄ earns (1 + p)/T × 2^(b−1) × v_c × 1.2^(k̄−1) × S_c. With h = b + 1 the ratio is ρ = (2T/Q) × 1.2^(b+1−k̄)/(1 + p). Delivered tiers run 2 to 5 above b, so with Q = 15 and T = 5, ρ = 0.32 to 0.55 at p = 0: a minder share ρ/(1 + ρ) of about 20 to 35 % on a chain with a minder, where tying h to the best tier made swung it 60-fold. Q = 15 comes from this; the bot confirms it.

### 2.3 State

`MergeState` sits on the shared `GameState` under `merge` (as haul's `haul`). Coins are the shared `cash`, changed only through a clamp like haul's `commit()`. The lifetime clock is the shared `stats.playSeconds`, which `tick` adds itself.
- `seed`; `draws` (one counter per random site); `season` (0-based); `seasonStartedAt`; `till` (minder coins not yet in the purse).
- `board`: 56 entries `null | {c, k} | 'shutter' | 'block'` (a block is a cell the season's shape removes); `shuttersOpened` per group.
- `chains[c]`: `open`, `gear` L, `stall` M, `minder` K (0 = none), `charges`, `waiting`, `nextPopAt`, `releaseAt`, `nextSaleAt` (game-clock times), `best`, `seasoned` (steps, 2.11).
- `counters`: 2 to 4 × `{ticket | null, refillAt, notTonightAt}`; a ticket is `{id, lines: [{c, k, filled}], gold}`, and only `filled` ever changes.
- `festival` (lines, `filledAt`); `paradeAt` (season clock).
- `gift`: `boxes` (each `{coins, slots}`, fixed when earned), `ticketsToBox`, `pendingGoods` (in order).
- `luckySparks`, `basketUndo` (`{cell, good, refund, until} | null`).
- `book` (discovered (c, k) of all time); `lanterns` and `feats`.
- `ads` (`readyAt` per kind, game clock); `recent` (60 five-second buckets of ticket coins); `freedAt`, `changedAt` (2.4); `mstats`.

Purchases are the shared `entitlements.products`.

Random streams: every draw is `rngMix4(seed, site, n, x)` (`src/engine/rng.ts`) with the site's own counter n: drop tier (x = chain, n = its drops), ticket draw, Lucky (n = lifetime merges, x = c × 8 + k), gift box (n = box index), shutter good, Parade. The order of events cannot change results. Lucky by merge count accepts a little predictability.

Derived values (`mergeParams(cfg, state)`):
- value(c, k) = v_c × g^(k−1) × S_c × lanternPay (1, or 1.05 with lantern 20).
- Ticket price P = Σ value(lines) × (1 + β × (lines − 1)), β = 0.15 (tune 0.10 to 0.25; +0.1 with lantern 13 or the Harvest season, not both). A Parade ticket ×2 (×2.5 with lantern 10).
- best_c: the highest tier of chain c made this season; when a chain opens or a season starts with it open, best_c = maxPop_c (its own drops count as made).
- Pace unit U = Σ over open chains of value(c, max(2, best_c − 1)), pure. A gift box's coin slot = 3 × U when the box is earned (tune 2 to 5); the Festival purse = 30 × U when its last line lands (tune 20 to 50; ×2 with lantern 18).
- Minder rate = Σ over hired minders of value(c, h_c)/Q.
- O = cells neither shutter nor block; F = open cells empty and not reserved by an undo chip.
- Loose_c = chain-c goods on the board with b_c ≤ k ≤ b_c + 1 (the tiers its gear drops; older lower tiers left after a base step are not loose). λ = 4 (tune 3 to 6).
- Precedence: when a season character and a lantern change the same number, the better one applies; they never stack.

Coins enter only through paid tickets, gift-box coin slots, the till, Basket sales and the away report (five sources, decision M37). No merge, discovery, lantern or level pays coins; `build-night.py` asserts this on every bot trace.

### 2.4 What one tick does

`EngineMode.tick(cfg, state, dt, now)` is called by the store about 10 times a second; dt is cut to MAX_TICK = 3,600 s (as haul). The tick runs one event queue over (clock, clock + dt]. Events run strictly in time order, ties broken by (time, kind, index) in this kind order, and each follow-up time is computed from the event's own time, never from the end of the tick:

1. Gear drop of chain c at `nextPopAt`: draw the tier (b + 1 with probability p, else b). If F > 0 and Loose_c < λ, place it in the drop cell; else if charges < cap (6; 8 with lantern 3), charges += 1; else the gear waits (`waiting`, no next drop). Not waiting: `nextPopAt` = this time + T.
2. Shelf release of chain c: place one charge, `releaseAt` = this time + 0.5. A waiting gear restarts: `nextPopAt` = this time + T. When several shelves wait for the same freed cell, the highest open chain releases first (decision M22), whatever the order of their times.
3. Gift-good placement: the first pending good; the next is due 0.5 s later.
4. Minder sale of chain c at `nextSaleAt`: `till` += value(c, h_c); `nextSaleAt` = this time + Q.
5. Till roll at each whole minute of the season clock: `cash` += `till`, `till` = 0 (a paid ticket also rolls it).
6. Counter refill i: draw a ticket (2.7); if a Parade is due and none is out, this counter draws the Parade.
7. Parade due at `paradeAt`.
8. Expiries: an expired undo chip frees its reserved cell (the sale stands); Not tonight and ad cooldowns.

Eligible times: a release or gift placement that found no room (F = 0, or the loose cap) is retried at the first `freedAt` after the failure; an empty counter that found no ticket, at the first `changedAt` after it. Every placed good sets `changedAt`; an expiry that frees a cell sets `freedAt`; player actions happen between ticks, at the current clock, and set both when they change the board (a merge, a delivery or a sale also lowers Loose_c). So `tick(a + b)` equals `tick(a)` then `tick(b)` exactly for any split, and the bot steps from event to event with one call.

The drop cell for chain c: its anchor column a_c = round(index × 6 / (open stalls − 1)) (one stall: column 3); among free cells, the smallest (row, |col − a_c|, col).

### 2.5 Player actions and the drop table

Every action is a store action in `src/modes/merge/actions.ts`, which calls the rules' interface in `src/engine/merge.ts` (signatures fixed in the hour-0 commit, 9.2). A refused action returns the same object and plays `ui_denied`.

A drag starts on a good. `dropAt(fromCell, target)` resolves at the finger point (4.3):

| Target | Result |
|---|---|
| An identical good below tier 8 | Merge into the target cell: tier k + 1, or k + 2 on a Lucky roll (1 in 25; 1 in 20 with lantern 7; capped at 8). A held Lucky Spark adds +1 and is spent first. A first-ever (c, k) stamps the Ladder Book (no coins); a tier skipped by Lucky is stamped too. best_c updates. |
| An empty open cell | Move. |
| A different good | Swap. |
| A ticket (the whole counter column) with an unfilled line of exactly (c, k) | Fills the first such line; the good is consumed. The last line pays at once (2.7). |
| A ticket with no matching line | Returns; the ticket shakes, its lines highlighted. |
| The Festival banner with an unfilled line of exactly (c, k) | Fills that line; the good is consumed. |
| The Basket | Sold for 25 % of value (40 % with lantern 2). A 4 s undo chip appears and the source cell is reserved until it expires. |
| A tier 8 on a tier 8, a shutter, a block, the street background, a stall front, a bar, outside | Returns; nothing changes. |
| A second finger touches | The drag is cancelled; the good returns. |

Basket undo: `undoBasket()` returns the good to its reserved cell and takes back the refund. It is refused, and the chip disappears, as soon as cash < refund or after any purchase. `basketUndo` is cleared on the season close and on reconcile.

Tap-tap, the second path for every drop: tap a good to arm it (a ring; matches glow), then tap a target, and the same `dropAt` runs (an empty cell is a target: a move). Tapping the armed good or any point that is not a drop target, or Android back, disarms. With nothing armed, taps do what 4.2 lists.

Purchases, each checked against cash and conditions: `openStall(c)` (only the next chain), `levelGear(c)`, `levelStall(c)`, `hireMinder(c)`, `levelMinder(c)`, `openShutter(group)`, `notTonight(counter)`, `openGiftBox()`, `closeSeason()`, `watchAd(kind)`, `undoBasket()`.

No auto-merge and no auto-delivery exist.

### 2.6 Automation and the hand

- Automated: gear drops and minders' tills. By hand: every merge, delivery, purchase and the season close.
- The board cannot flood: drops never speed up, and each chain holds at most λ = 4 loose goods plus 6 on its shelf before its gear waits.
- The arithmetic. Each gear drops 15 goods a minute: 45 with three stalls, 60 with four, 75 with five. The active bot acts 40 times a minute, and absorbing n drops needs about n − 1 merges plus deliveries and purchases. From the fourth stall on, the hand cannot take every drop. That is the design: lower chains fill their shelves and wait, and the player puts the hand where the value is. Nothing is lost; the stall shows a red pip, and its sheet says "Gear waiting: the shelf is full".
- Gate 5 (8.3) holds the two highest open chains flowing; gate 7 (value per action) watches that the hand's work grows in worth.

### 2.7 Tickets: the draw, the bounds, the fallback

A ticket is drawn when a counter has been empty for 4 s (tune 2 to 8). Customers have no timer and never leave.

Scripted start (a new game's first season only): the fox at counter 1 asks for a Twin Skewer. Counter 2's hedgehog steps up at the first merge, when best_grill = 2, and asks for a Glazed Skewer, which (a) allows; the two tickets need 6 Pepper Skewers in all (2 and 4), and the opening board holds exactly those 6 (decision M18). The two are exempt from (d) only.

Draw, from the ticket stream:
- Lines: 1, 2 or 3 at 60/35/5 % while the season clock < 1,800 s, then 45/40/15 % (tune ±10 points each).
- Chain per line: weight 3 for the two highest open chains, 1 for the others (tune 2 to 4); lines may repeat a chain.
- Tier per line: k from kmin_c = b_c + 1 to best_c, P(k) ∝ γ^(k − kmin), γ = 1.0 (tune 0.7 to 1.4). With 15 % probability (tune 10 to 25) a stretch line at best_c + 1, marked NEW (the Ladder Book shows its name and silhouette).
- If kmin_c > best_c, the only candidate is best_c + 1 (the H+1 rule: always possible, no deadlock).

`missing(lines, goods)` is pure and exported. Lines are taken highest tier first; each takes its chain's goods of tier ≤ k from the board, the shelves and the pending goods, greedily from the highest tier while they fit in 2^(k−1) basic units (exact with powers of two), removes them, and returns the units still needed. Pops needed = ceil(units / 2^(b_c − 1)).

Bounds, in this order, on every draw and after every fallback step:
- (a) Possible: every line has k ≤ min(8, best_c + 1); two of your best goods make it.
- (b) Output and hand: per chain on the ticket, (its pops + the pops still needed by every open ticket's and the Parade's unfilled lines on that chain) × T/(1 + p_c) ≤ W = 180 s (tune 120 to 300); hand actions Σ (goods used + pops − 1 merges + 1 delivery) ≤ H = 60 (tune 40 to 90).
- (c) Space, over the whole board: Σ over the unfilled lines of every open ticket, this one included, of cells(k) = k − b_c + 1 (a binary carry from drops of tier b needs at most that many cells at once), + Σ_c min(λ, Loose_c), + R = 6 (tune 4 to 8; room for a Festival build and the hand), ≤ O. Conservative on purpose: loose goods are counted and also used.
- (d) Never met by doing nothing: every line has k ≥ b_c + 1, so no base drop is a line. Gear and minders never deliver; every line is filled by a drag. (Revision 2's second half, "no line can be filled from what is already on the board", is removed by decision M4: measured, it clogged the board. Most tickets can then be paid from what the player holds; every line still needs a merge or a drag.)

Fallback, re-checking (a) to (d) after each step: (1) if (a), (b) or (c) fails, lower the highest line by one tier, never below kmin; (2) still failing, drop the last line and repeat (1); (3) redraw with the next open chain as the only chain; (4) no chain passes: the counter shows "Setting up…" and redraws at the next board change (counted by gate 4).

The exact solver (test only, `src/engine/merge/solver.test.ts`) searches all merge sequences on small boards: `missing()` is optimal and every accepted ticket is fillable from the board plus drops within (b) and (c).

Paying: when the last line lands, cash += P (computed then), the till rolls in, feats count and the gift box counter ticks. The ticket stamps FILLED and folds into a lantern that flies to the purse. The shown price is always the current P (a stall level raises it live); nothing on a ticket ever falls.

"Not tonight": free, 30 s cooldown per counter (tune 15 to 120); filled lines return to the board as goods. `roomFor(n)` = F ≥ n is the one function the draw, the swap and gift goods use; when false the button says "No room on the board for 2 goods".

The Parade: due every 600 s of season clock (tune 480 to 840), the first at 360 s. A paper dragon holds a gold ticket of 3 lines from 3 different open chains (2 if only 2 are open), tiers best_c − 1 to best_c, clamped by (a) to (d) with W = 360 s and H = 100. It pays ×2 and has no timer. No second Parade is drawn while one is out; the clock restarts when it is filled or sent off.

### 2.8 The Festival ticket

One per season, on the street banner and in the Season scroll. Goods are dragged or tap-tapped onto the banner.

Season 1 lines: Dragon Grill Board (grill 8), Midnight Tea Set (tea 8), Steamer Stack (steamer 6), Big Bowl (noodles 5). Steamer 6 is within reach at about the first hour (3.3).

Later seasons come from a table that `build-night.py` writes (`festival[s]` in game.json), tuned inside these ranges:
- season 2: season 1's lines plus Puff Cone (puffs 4), the Puffs line at tier 3 to 5;
- season s ≥ 3: 4 to 6 lines; each line between the season-2 tier of its chain and 8; the sum of tiers never falls from one season to the next; it never asks for a chain that cannot be opened that season.
- Each line obeys cells(k) = k − b_start + 1 ≤ O_start − R on the season's opening board, where b_start is the chain's starting base tier.
- A test builds every season's Festival, seasons 1 to 10, line by line from its opening board (10.2).

Filling the last line gives 3 Lucky Sparks (decision M37: no coins), lights the banner and enables "Close the season". Play continues until the player closes.

### 2.9 Offline, as a closed form

`EngineMode.offline(cfg, state, now)` returns `{seconds, earnings, game, report}` and adds nothing to cash: the store grants `earnings` with `E.grantCash`, × `offlineAdMultiplier` = 1.5 with the ad.
- Away time t = (now − max(lastSavedAt, stats.clockHigh))/1000 (the shared guard: time already paid is never paid again); t′ = min(t, cap), the cap 4 h, +2 h with lantern 6, +4 h with Late Hours.
- The game clock does not move; refills, the Parade, ad cooldowns, `releaseAt` and the undo chip keep their times. Only the two clocks below are re-phased, to a time within one interval of the clock.
- Minders: d = nextSaleAt − clock; sales_c = t′ ≥ d ? 1 + floor((t′ − d)/Q) : 0; earnings = Σ sales_c × value(c, h_c); and in every case nextSaleAt = clock + (d + sales_c × Q − t′), so that time away adds up (two absences of 5 s count as one of 10 s).
- Gear (open, not waiting): n_c the same with nextPopAt and T; charges = min(cap, charges + n_c); the gear waits if more were due than the shelf holds, else nextPopAt = clock + (d + n_c × T − t′). The board never changes while away; on return the shelf releases at the 0.5 s cadence.
- The report: "While you were away (3 h 10 m): Old Brindle and Pim sold 1,520 house goods, +18.2K. Your gear filled its shelves." `reportAlone` is true when charges were made with no minder hired.
- `income()` = the minder rate; `activeIncome()` = the `recent` ticket rate + the minder rate; no `pricingFloor` is needed.
- Cross-check (10.2): event stepping over t′ with no player gives exactly the same charges, sales and next-event offsets.

### 2.10 Advice and the goal line

`advice(cfg, state)` is pure and returns the single next goal, for the bot and the goal line. Rate R = R_t + R_m: the `recent` ticket coins ÷ min(300, season clock), plus the minder rate.

Income gained per s by a candidate:
- Gear L → L+1: Δu × vb_c, with u = (1 + p)/T × 2^(b−1) basic goods per s and vb_c = v_c × 1.2^(k*−1) × S_c at k* = max(b + 1, best_c − 1).
- Stall M → M+1: (0.1/S_c) × (the chain's ticket coins in `recent` per s + its minder rate).
- Minder hire or level: (value(c, h′) − value(c, h))/Q.
- New stall: ΔU/Φ, Φ = 40 s (tune 20 to 60).
- Shutter: κ × R/O per cell; `build-night.py` iterates the constant κ until it moves under 1 % and prints it.

Score = max(0, cost − cash)/R + cost/gain; the lowest wins. Also offered: the next lantern feat within reach, "Fill the Festival" once its chains are open, "Sell spare goods in the Basket" when F = 0 and no merge exists. The goal line shows the words, the price and max(0, cost − cash)/R rounded to "about 20 s", "about 2 min" or "about 1 h" (none when R = 0); a tap opens the sheet that buys it.

### 2.11 Seasons: the reset

Closing (`EngineMode.prestige`) is refused until the Festival is filled and is always the player's choice; nothing closes a season by time, and the next season is not chosen. The Season scroll says before confirming:
- "Resets: coins, goods on the board, gear, stall and minder levels, stalls, best tiers, shelves, tickets, the till."
- "Stays: board space, lanterns, the Ladder Book, unopened gift boxes, goods waiting for room, Lucky Sparks, purchases, seasoned gear."
- "Next: Summer Fireflies. The Lantern Pan opens on the street. Fireflies make lucky merges more common."

`basketUndo` is cleared; pending goods of a chain not yet open wait for it. The opening board holds 6 grill goods of the grill's starting base tier. No currency is paid and no multiplier grows. What carries over and grows:
- Seasoned gear: a chain earns one step per closed season in which it reached tier 6, up to 3 (tune 2 to 4; +1 with lantern 9), and starts each season at gear level 1 + N × steps, N = 10 (tune 5 to 10). Its sheet derives the words ("Starts at gear level 11, dropping Twin Skewers").
- Familiar faces: stall-opening costs × F_s = 0.85^min(seasons closed, 4) (tune base 0.75 to 0.90).
- Lantern 8: Tea starts open. Lantern 11: minders start hired.

Shapes: rectangle; moon gate (cells (3, 2) and (3, 3), always open, become a stone gate); hearth (braziers on the open cell nearest each board corner, never on a shutter). Characters, told as part of the place, never as a list of conditions: Fireflies (Lucky 1 in 12); Harvest (3-line tickets 25 % of draws, β + 0.1); Warm gear (every p + 0.15); Late crowd (Q × 0.67); Market day (a Parade every 300 s).

| Season | Shape | Character |
|---|---|---|
| 1 Spring Lanterns | rectangle | none (the teaching season) |
| 2 Summer Fireflies | rectangle | Fireflies; the Puffs chain opens |
| 3 Autumn Moon | moon gate | Harvest |
| 4 Winter Embers | hearth | Warm gear |
| 5, 6, 7, 8 | rectangle, moon gate, hearth, rectangle | Late crowd, Market day, Fireflies, Harvest |
| 9, 10, 11, 12 | moon gate, hearth, rectangle, moon gate | Warm gear, Late crowd, Market day, Fireflies |
| 13, 14, 15, 16 | hearth, rectangle, moon gate, hearth | Harvest, Warm gear, Late crowd, Market day |

Seasons 5 to 16 are Second, Third and Fourth Spring to Winter; seasons 2 to 16 use each of the 15 pairs once, and season 17 on repeats from season 2. Decorations cycle (petals, fireflies, moon motes, embers); each closed season leaves a street piece. Length targets are gate 10; the bot's season-time table goes into 8.5 before any screen.

### 2.12 Worked table: the first ten minutes (placeholder)

Prices exact; times and incomes from a rate model (80 % of the gear's output delivered, at a tier rising with time since the stall opened; minders as 2.2).

| Time | What happens | Spent | Cells | c/s |
|---|---|---|---|---|
| 0:00 | 30 cells, 4 Pepper Skewers. Fox: Twin Skewer, +12. | | 30 | 0 |
| 0:05 | First merge (a Ladder Book stamp, no coins). Hedgehog: Glazed Skewer, +29. | | 30 | |
| 0:08 | Ticket 1 paid: the first coins (hard ≤ 15 s). | | 30 | |
| 0:30 | Ticket 2 paid; purse 41. Grill gear L2. | 20 | 30 | 1.1 |
| 0:40 to 1:40 | Shutter 0 (30); lantern 1 at ticket 3 (0:55, a third counter); Grill gear L3 (29); shutter 1 (44). | 103 | 32 | 1.3 |
| 2:55 | Tea opens; its first line is a Cup of Tea (tier 2, 48). | 100 | 32 | 1.3 → 5.5 |
| 3:05 to 3:30 | Grill stall L2 (50); Old Brindle hired (150); about ticket 10, the first gift box. | 200 | 32 | 6.8 |
| 3:40 to 4:45 | Tea gear L2 (80), shutter 2 (63, holds a good), Tea stall L2 (200), Tea gear L3 (116), shutter 3 (91). | 550 | 34 | 8.3 |
| 5:00 to 6:00 | First stretch line (NEW); Pim hired (600, 5:55); Parade 1 (2 lines, ×2). | 600 | 34 | 12.5 |
| 7:25 | Steamer opens: the third stall front. | 1,200 | 34 | 12.5 → 30 |
| 7:30 to 8:40 | Shutters 4 (133), 5 (192, holds a good), 6 (279), 7 (404); Steamer gear L2 (320), L3 (464); Tea gear L4 (168); Tea stall L3 (270); Grill gear L4 (42), L5 (61). | 2,333 | 38 | 35 |
| 9:00 to 9:05 | Steamer stall L2 (800); Tea gear L5 (244). | 1,044 | 38 | 39 |
| 10:00 | 3 stalls, 2 minders, 3 counters, 38 cells, about 30 tickets, 2 lanterns (25 tickets at about 8 to 9 min), about 3 gift boxes. | | 38 | 39 ± 8 |

Twenty-six purchases (gate: 12). At 10:00 the minder share is 4.7 of 39 = 12 %: the Steamer, the largest chain, has no minder yet, so the minute-10 minder band is lower (gate 8). The throughput ceiling with every drop delivered is C = Σ_c (1 + p_c)/T × 2^(b_c−1) × v_c × 1.2^(k̄_c−1) × S_c × (1 + β(ℓ̄ − 1)), about 43 c/s here; the active bot's band is a share of C (gate 8).

---

## 3. The first three minutes, then the goals to hour three

### 3.1 Timed script (the tutorial)

The hint pointer is our own firefly (Pizza has a glove, Orbit a reticle); drag hints draw a glowing trail, which may end at a ticket's edge. The goal line always names one goal with price and estimate (2.10).

| Time | Screen | Player |
|---|---|---|
| 0:00 | Lanterns flicker on along the wire (1.2 s, skippable). The fox holds a Twin Skewer ticket (+12); the firefly traces skewer onto skewer. Goal: "Fill the fox's ticket". | |
| 0:05 | The hedgehog steps up: Glazed Skewer (+29). | Merges: a soft steam puff; "Twin Skewer" stamps into the Ladder Book corner. |
| 0:08 | The firefly traces the Twin Skewer to the fox's ticket edge. | Delivers: FILLED stamp, the ticket folds into a lantern, 12 coins float to the purse. |
| 0:12 | The grill drops a skewer every 4 s from the gear rail. | Merges as they arrive. |
| 0:30 | Goal: "Grill gear level 2 · 20 · 1 in 20 drops is a Twin Skewer". The firefly points at the goal line. | Upgrades. |
| 0:55 | Lantern 1, "Three tickets": a paper toast on the street (input never blocked). A third counter slides in. The Gate opens only on tap. | |
| 1:10 | Goal: "Open a shutter · 30". The firefly points at shutter 0. | Taps, confirms. |
| 1:40 | Tickets every 15 to 25 s at tiers 2 to 4. First 2-line ticket ("+15 % for two"). | |
| 2:55 | Goal: "Open the Tea stall · 100". The awning lights and the next customers ask for tea. Income rises from about 1.3 to about 5 c/s. | Opens. |
| 3:00 | Guided steps end. A firefly appears only after 20 s idle, never over a price or the purse or while a sheet is open. | |

No spoke or sheet ever opens by itself while a finger is down or a good is armed.

### 3.2 Goals of minutes 3 to 30

Something to do every 30 s (gate 1), something new every 3 minutes (gate 6):
- 3:30: Old Brindle, who teaches the idle half; the first gift box (a paper bag, 3 slots, odds on its sheet).
- 5:00: the first stretch line (NEW).
- 6:00: the first Parade.
- 7 to 9 min: Steamer; lantern 2 ("25 tickets": the Basket pays 40 %).
- 12 to 18 min: Grill gear L11 (1,782 in all): it now drops Twin Skewers and orders start at Glazed Skewers; "my grill grew up".
- 12 to 16 min: Nettle hired (2,400); the column-6 shutters; first Ember Plate (tier 6) and lantern 3.
- 16 min: Parade 2.
- 20 to 35 min: Sweets stall (14,400): the fourth stall front. Tea gear L11 (7.1K in all) at about 25 to 35 min.
- 25 to 30 min: lantern 4 ("100 tickets"): the fourth counter, the last in v1.
- 26 min: Parade 3.

### 3.3 Hours one to three

Something new at least every 20 minutes through hour 3 (gate 6). "New" is a stall, a minder, a shutter group, a gear base step (it changes drops and orders), a first-time tier, a Festival line reachable or filled, a season piece, a Parade, or a lantern marked "new" in 5.3; awning redraws and small-effect lanterns do not count.

| Window | New things |
|---|---|
| 0:30 to 0:50 | 3-line tickets begin (15 % of draws from season minute 30). Row-1 shutters (Sweets open); Juniper hired; first tier 7 (Smoke Platter, a lantern halo). |
| 0:50 to 1:10 | The first Festival line within reach: Steamer Stack (steamer 6) at 55 to 65 min, and the banner's first lantern lights when it lands. Steamer gear L11 (28.5K in all). Lantern 5 ("Discover 30 goods": a Parade every 8 min). |
| 1:10 to 1:40 | Noodles at 70 to 100 min (172,800): a new art set, the Festival's Big Bowl line becomes possible. Tansy. Row-0 shutters. Grill gear L21 (75.0K in all): drops Glazed Skewers. |
| 1:40 to 2:00 | First tier 8 at about 1:45, Dragon Grill Board: a full-board lantern burst, a Festival line, lantern 6. Sweets gear L11. |
| 2:00 to 2:30 | Midnight Tea Set; Tea gear L21 (300K in all); lantern 12 ("500 tickets"); shutters finish (56 cells) at 2:15 to 2:45, lantern 14 (gift boxes hold a fourth slot). |
| 2:30 to 3:30 | Big Bowl; the Festival is filled (active bot 2:30 to 3:30). The Season scroll shows what resets and what stays. Close Spring. Summer Fireflies: the Lantern Pan, fireflies on the street, seasoned gear on the chains that reached tier 6, lantern 8. |

Week three (the passive bot reports 4 to 8 seasons closed by day 21, soft): a new shape and character each season, harder Festivals, the Ladder Book, 20 lanterns, a street piece per season.

Honest gap: v1 has no new chain after season 2. Chain 7 and tiers 9 and 10 are the first content update (9.3).

---

## 4. Screens

### 4.1 Fixed zones

Portrait, one screen, no tab bar; every zone comes from the pure `mergeLayout(width, height, insets, fontScale)` in `src/ui/merge/layout.ts`.

| Zone, top to bottom | 375 × 667 (insets 20 / 0) | 390 × 844 (insets 47 / 34) |
|---|---|---|
| Top inset | 20 | 47 |
| Top bar | 40 | 40 |
| Goal line | 20 | 20 |
| Street | 156 | 190 |
| Spare above the board | 0 | 28 |
| Board | 8 × 47 = 376 (329 wide) | 8 × 51 = 408 (357 wide) |
| Spare below the board | 7 | 29 |
| Bottom row | 48 | 48 |
| Bottom inset | 0 | 34 |
| Total | 667 | 844 |

The layout rule:
- bars = 40 + 20 + 48 = 108;
- cell = min(64, floor((W − 32)/7), floor((H − insets − 108 − 156)/8)): at 375 × 667, min(64, 49, floor(383/8) = 47) = 47; at 390 × 844, min(64, 51, 62) = 51;
- a spare of 34 or more grows the street to 190 and the rest is split around the board (above gets the floor half); a smaller spare stays below the board;
- overflow: shrink cells first, to a 44 pt floor; then the street to 140; then (never expected) scale the play canvas.

Street width at 375: gutter 10 + Festival banner 52 + gap 4 + 4 counters of 68 with 3 gaps of 4 + gutter 10 = 360 ≤ 375. At 390 the counters grow to 72 (376 ≤ 390). Two or three counters centre at the same width.

Text: the bars are sized by hand from `fontScale` (`allowFontScaling={false}`) in rows whose heights add up (`barMetrics.ts`, like haul's `bayMetrics.ts`; no negative margins); the purse is a `RollingNumber` with no `lineHeight`; the goal line is truncated by a computed width, never wrapped; ticket text is Skia in fixed boxes sized by hand; all checked at fontScale 1.3 on 375 × 667.

### 4.2 The main screen: what is drawn, what responds

Top bar (40): the purse; a season chip "Spring · Festival 0/4"; the menu button (Settings).

Goal line (20): one goal, price, estimate; a tap opens its sheet.

Street (156), drawn in the one play canvas with the board:
- Backdrop band (0 to 40): the stall fronts, each at least 52 pt wide (6 × 52 + 5 gaps of 4 + gutters 20 = 352 ≤ 375), with awning, sign, gear, a "+n" shelf badge, a red pip when the gear waits, and the minder beside a till whose fill rises silently. No coin flies per sale; the till joins the purse's own roll. A tap (hit slop 44 pt) opens the stall's sheet.
- The Festival banner (52 wide, left): until the Steamer opens, one lantern icon and "0/4"; its lines open on tap. From then, up to 6 line icons of 22 pt in a 2 × 3 grid (48 × 74) with ticks. It is always a drop target.
- Counters (68 wide): an animal bust (the paper dragon for the Parade) above a paper ticket 96 pt tall with up to 3 line rows (a 24 pt icon, a tier pip, a tick) and the price in a fixed box. The whole column is the drop rectangle; a tap opens the ticket detail.

Board (376): 7 × 8 cells drawn from the item atlas in the play canvas, never one canvas per cell.
- Goods carry a tier pip (1 to 8 dots); tier never relies on colour. Drops rise from a thin gear rail along the board's top edge at the anchor column, not through the customers.
- A next shutter shows condition and price ("Grill 3 · 30"; a tap opens its confirm), others a plain shutter; blocks show the season piece.
- While dragging or armed, matches glow, the dragged good floats 40 pt above the finger as a preview, and the cell or target under the finger is outlined. A long press (0.4 s) shows a good's name and value in a chip.

Bottom row (48): Basket (68, a drop target; the undo chip floats above it) and Book, Lanterns, Season, Shop (64 each), gaps 4, gutters 10: 356 at 375.

### 4.3 Gestures and the UI thread

- One Pan gesture on the play canvas (`maxPointers(1)`, `minDistance(4)`, the first pointer id); a second pointer cancels the drag. Fling and multi-touch are ignored.
- The drag position lives in Reanimated shared values; the JS thread never reads one. `hitTest(x, y, layout)`, a worklet, uses the finger point and the rectangles from `mergeLayout` (plain numbers), outlines the target, and on release calls `runOnJS(dropAt)(fromCell, targetCode)` once.
- Tap and long press are separate gestures under `Gesture.Exclusive`. Tap-tap state lives in `src/ui/merge/uiState.ts` (armed cell, long-press chip, undo chip), not in a shared value.

### 4.4 Sheets and spokes

Every dialog is the kit `Sheet` or registers with `useOverlay`; one at a time.

Sheets:
- Stall, opened only from its front or the goal line (no arrows to other stalls): gear ("Drops a Pepper Skewer every 4 s · 1 in 20 is a Twin Skewer → 2 in 20", the cost, and what a base step does to orders); stall ("Pays ×1.1 → ×1.2"); minder ("Puts a Twin Skewer, 12, in the till every 15 s · held back by: gear level", and its away rate); "Gear waiting: the shelf is full" when it is; "Open the Tea stall" when closed.
- Shutter confirm: condition, price, "holds a good" when it does.
- Ticket detail: names and values, the multi-line bonus, Not tonight (with the `roomFor` text when disabled), "Watch ad: fill one line" on tickets with 2 or more unfilled lines.
- Gift box: the 3-slot paper bag with its odds and its coin amount printed before opening.
- Away report. Season close confirm. Shop. Settings: sound, music, haptics, restore purchases, privacy.

Spokes (full screen, `useOverlay`, opened only by a tap; the play canvas stops its clocks beneath): the Ladder Book, the Lantern Gate, the Season scroll.

### 4.5 Phone rules

- Android back closes the top layer in this order: armed tap-tap, long-press chip, undo chip (it does not undo), sheet, spoke. It leaves the app only from the bare board.
- The play canvas runs at 60 fps while a finger is down or a flight runs, else 30. One clock per animated thing (a bob per customer, one per flying lantern, one per drop rise, one shared shimmer for tiers 7 and 8); nothing invisible animates.
- Atlases under 2,048 px, baked once from code (`bakeAtlas`), never freed while a canvas may draw: items (48 goods, 6 gear icons, shutter, Basket, Lucky Spark, gift bag, blocks: 64 at 144 px, 1,152 px square); animals (18 customers, 6 minders, the dragon: 25 at 160 px, 800 px square); stall fronts (6 × 3 awnings at 288 × 192, drawn 52 to 60 pt wide: 1,728 × 576).
- `npm run lint:worklets` passes; the hit test and the drag are worklets calling only worklets.
- Hints never cover a price, the purse or a ticket's lines.
- Selectors use `useShallow`; the play canvas reads the board through one selector returning a stable array version.

### 4.6 Palette and loading screen

Palette `lantern-night` (tokens in `src/ui/merge/art/palette.ts`): base indigo #1C2140 and deep teal #123A40 for the sky and board; lantern amber #F2A541 for glow; rice-paper blue-grey #DCE3EA for tickets; brass #C9A45C for rims; red #C8423B for small accents only, under 10 % of the screen area (measured on the contact sheet). No cream backgrounds. Tier 8 goods sit on an indigo lacquer board with a brass rim.

Loading (`ModeEntry.Loading`): the street at dusk; the wire's lanterns light one by one as loading proceeds, with the name in paper-cut letters.

---

## 5. Meta systems

Six systems and no others, built from the level (a) kit (`Sheet`, `Panel`, overlays); none uses `src/ui/meta`, the tabs family, the header, the missions sheet or the chest overlay.

### 5.1 Order tickets (the core, on the street)

As 2.7: a paper ticket held by an animal at a counter. There is no list screen.

### 5.2 Ladder Book (a spoke: six bamboo ladders of 8 rungs)

- A discovered good shows its name and value; the next undiscovered good on each ladder shows its name and silhouette; later ones show "?".
- A discovery pays no coins. It stamps the ladder and counts toward lanterns 5 and 17.
- The season's best tiers are marked.
- Completing a ladder (all 8 of a chain) lights lantern 9.
- The help page prints the Lucky odds (1 in 25, and the season's or the lantern's when changed) and the gift box odds.

### 5.3 Lantern Gate (a spoke: an arch with 20 hooks)

Each lantern is earned once by a named feat, lit forever, never bought, never random. The gate shows the next three unlit feats with progress bars (these feed `advice`). "New" marks the lanterns that count for gate 6.

| # | Feat | Effect | New |
|---|---|---|---|
| 1 | Fill 3 tickets | a 3rd counter | yes |
| 2 | Fill 25 tickets | the Basket pays 40 % | |
| 3 | Make any tier 6 | shelves hold 8 | |
| 4 | Fill 100 tickets | a 4th counter | yes |
| 5 | Discover 30 goods | a Parade every 8 min | yes |
| 6 | Make a tier 8 | away cap +2 h | |
| 7 | 1,000 merges | Lucky 1 in 20 | |
| 8 | Close a season | Tea starts each season open | yes |
| 9 | Complete one ladder | seasoned gear holds one more step | |
| 10 | Fill 50 Parades | Parades pay ×2.5 | |
| 11 | Hire every minder in one season | minders start each season hired | yes |
| 12 | Fill 500 tickets | every gear p + 0.05 | |
| 13 | Fill 50 three-line tickets | β + 0.1 | |
| 14 | Open all 26 shutters | gift boxes hold a fourth slot | yes |
| 15 | Close 3 seasons | minders' Q × 0.8 | |
| 16 | Fill 2,000 tickets | Lucky 1 in 16 (the better of this and lantern 7) | |
| 17 | Discover all 48 | Lucky Sparks add two tiers | |
| 18 | Close 8 seasons | the Festival gives 5 Lucky Sparks | |
| 19 | Fill 100 Parades | gift boxes come a fifth sooner | |
| 20 | Make 10 tier 8s in one season | +5 % on all ticket pay | |

### 5.4 Minders (in the stall sheet, drawn at the stall front)

One per stall, hired and levelled in the stall sheet. The minder sits in the stall front beside a till whose fill rises quietly. No buyer is drawn and no coin flies per sale. The readout is in plain numbers and names what holds it back (2.2).

### 5.5 Gift boxes (chests, earned only)

- Earned: one every N filled tickets (N tuned, starting at 25; lantern 19 lowers it by a fifth, decision M24). Never sold, no premium currency, no timers.
- Contents are fixed when the box is earned, from the gift stream: three slots, each independently 50 % coins (3 × U at the earning), 35 % a good of an open chain at tier b + 2, b + 3 or b + 4 (60/30/10) capped at that chain's best, 15 % a Lucky Spark. So a box opened later is worth the same, and reloading a save cannot reroll it. The sheet prints the odds and the coin amount before the tap.
- The game saves at once after `openGiftBox`, as the shared `openChestNow` does.
- Boxes wait unopened without limit. Their goods wait in `pendingGoods` until there is room (event 3).

### 5.6 Seasons (the Season scroll spoke)

A paper scroll showing the Festival's lines with ticks, the resets and stays lists of 2.11, the next season's shape drawn as a small board with its decoration and one sentence about the place, and "Close the season", enabled only after the Festival. The street pieces of past seasons are listed at its foot.

### 5.7 Shop and rewarded ads (a sheet, not a system)

| id | Kind | Price | Title and description |
|---|---|---|---|
| `night_awnings` | cosmetic | $2.99 | Blue Silk Awnings: every stall gets blue silk awnings and moon lanterns, for good. Looks only. |
| `night_late_hours` | unlock | $3.99 | Late Hours: your minders keep the stalls 4 more hours while you are away (`entitle` applies it now). |
| `night_quiet_evening` | skipAds | $4.99 | Quiet Evening: every "Watch ad" button gives its reward at once, with no video. |

`cosmetic` is added to the shared product-kind enum (P3, additive); `skipAds` is the shared kind the first game also uses, and the shared store already honours it (decision M13: the ad skip is sold under its own name, not inside another product). Restore purchases is included; nothing else is sold, and nothing random.

Rewarded ads, optional, each labelled "Watch ad" with what it gives. Cooldowns run on the game clock and say so ("ready after 4 min of play"), so moving the device clock does nothing:
- Fill one line: fills the cheapest unfilled line of a ticket that has 2 or more unfilled lines (never the last), once per 5 min. The ticket still ends with a drag.
- Gear rush: each open gear drops up to 6 goods of its base tier into free cells now (ignoring the loose cap, never beyond F); 15 min cooldown.
- Call the dragon: brings the Paper Dragon Parade now when none is out (the Parade clock restarts as after any Parade); 20 min cooldown (decision M14).
- The away report's +50 % (the mode's own sheet, decision M8).

No interstitials and no banners (`monetization.ads.interstitials: false`, `showBanner: false`).

Cut on purpose: cards, missions, premium currency, energy, daily gifts and shops, timed offers, starter packs, clubs, leaderboards, push notifications, story beyond one line per minder.

---

## 6. Sound and haptics

### 6.1 Character

Steam, paper, cloth, clay and charcoal: a street at dusk, not a restaurant or a radio.
- No pitched pentatonic ladder, plucked strings, wood knocks, register, marimba or blips, and no bell on any money moment; the one bell is the Festival's.
- New instruments in `scripts/audio/recipes_night.py` (filtered-noise steam, paper crinkle and fold, felt stamp, clay rattle, a low reed drone) on `dsp.py` primitives, never the warm pack's pluck, bell or knock. `soundPack: null`; files in `games/night-market/assets/sfx/` from `render_night.py`, music from `night_music.py`.
- `compare.py` gains a cross-key mode (every night key against every Pizza and Orbit key, not only same-named keys); that mode at the 0.6 joint threshold is the gate, run on the recipes before the full render. A person does the listening check.

### 6.2 Keys (`src/services/fx/catalog.merge.ts`, Node only; `scripts/lib/fxCatalog.js` picks it for mode merge)

| Key | Sound | Haptic |
|---|---|---|
| `merge_1` … `merge_8` | a steam puff growing in size and brightness with the tier (60 ms apart at most) | light |
| `lucky` | a second, brighter puff with a paper flutter | light |
| `move`, `swap`, `return` | a cloth slide; a dull paper tap | none |
| `drop` | a tiny charcoal crackle, quiet, 300 ms apart at most | none |
| `line_fill`, `ticket_filled` | a paper tick; a felt stamp and a paper fold | light; medium |
| `coins` | clay coins into a cloth pouch | none |
| `basket_sell`, `undo` | a basket rustle and its reverse | light |
| `shutter_open`, `stall_open`, `upgrade`, `minder_hire` | a shutter rolling up, an awning flap, a rising steam hiss, a cloth bow | light or medium |
| `discovery`, `lantern_lit` | a brush stroke and a stamp; a paper rustle and a flame catching | success |
| `parade_arrive` | a small hand drum roll | none |
| `giftbox_open`, `slot_reveal` | paper unfolding, a crinkle per slot | light per slot |
| `festival_line`, `festival_done`, `season_close` | a low reed note; the one bell and a lantern swell; a reed swell and wind | medium; success; success (≤ 4 pulses) |
| `ui_open`, `ui_close`, `ui_denied` | paper slides; a soft crumple | none; light |
| `music_spring`, `music_summer` | 90 s loops at 72 bpm: low reed drone, bowed pad, hand drum, a distant crowd; tinted for autumn and winter in v1 | |

P5 sets volumes and minimum intervals in the catalogue, as the second game's does. `soundKeys` maps the shared keys the store plays (`offline_collect` → `coins`, `purchase` → `upgrade`, and any other) onto these. The till is silent. Haptics follow only what the finger did (none for drops, till rolls, coins or a Parade), at most 8 pulses a second.

---

## 7. Names, cast, voice, store page

### 7.1 Names

- Store title "Lantern Row" (11 characters) with the subtitle "Merge snacks, fill each order"; alternatives "Paper Lantern Row" and "Lantern Row Snacks". "Night Market" is not in any title.
- P3 searches the stores with generic terms only ("lantern row merge", "merge snacks orders"), never the project's or owner's name, and records verdicts on "Animal Night Market", "Merge Feast", "Market Merge", "Merge Market: Food Town" and any other find in `games/night-market/store/NAME-SEARCH.md`, in the format of Orbit's file.
- App slug `lantern-row`; bundle ids wait for the studio's real domain (the other games' release blocker).

### 7.2 Cast (drawn in code; no `cast` block, no `char:` icons; the mode's `parts.Icon` draws `beast:` names from its atlas)

- Customers: fox, hedgehog, badger, otter, bat and owl, each in 3 coat colours, unnamed. Owls are not in the icon or the first two screenshots, and the tutorial's customers are a fox and a hedgehog.
- Minders: Old Brindle, Pim, Nettle, Juniper, Tansy, Marlo (2.2), each with one intro line from game.json `characters`.
- The Paper Dragon of the Parade; the firefly (the hint pointer).
- Rounded silhouettes with a scarf or apron, modelled on no existing game. The food world is invented and mixed (no real city, national dress or religious symbol); a sensitivity read happens before release.

### 7.3 Voice: lantern-calm

- Unhurried, sensory, present tense, short. No exclamation runs, no puns, no pressure words ("hurry", "last chance", "don't miss", "limited"). Figures as figures.
- Examples: "Steam rises from the steamer." "A hedgehog waits for a Pearl Tea." "No room on the board for 2 goods." "Old Brindle sold 212 Twin Skewers while you were away."
- Every word a player reads lives in `src/ui/merge/strings.ts`, or in game.json for names; the fingerprint and the voice check read them. The voice check's watch list adds Recipes, Chef's Crate, Tip Jar, Contract Keeper, Rig Limit, Express Pass, Clearance and Manager.

### 7.4 Store page (written from scratch; `scripts/content/night-store.json`, copied into game.json by `build-night.py`)

- Subtitle: "Merge snacks, fill each order" (29).
- Keywords: market, board, skewer, tea, dumpling, noodle, sweets, food, stall, street, puzzle, cozy (none repeats a word of the title or subtitle, which the stores index anyway).
- Promotional text: "Lantern Row opens at dusk. Merge street snacks on the board and fill paper orders, one by one."
- Description outline:
  1. The board and the verb: two of the same snack become one better snack, eight steps up.
  2. The orders: customers hold paper tickets; drag each snack onto its line; a full ticket is stamped and paid.
  3. The idle part, exactly: "Minders you hire put a house snack's price in the till every 15 seconds, while you play and while the app is closed, for up to 4 hours; your gear fills its shelf with up to 6 snacks while you are away." The words idle and tycoon appear only here.
  4. Seasons: "Seasons change the street: a moon gate one season, braziers in the corners another, fireflies over the stalls." In the listing this paragraph and the lanterns come before the idle part (the order that does not echo the second game's description).
  5. Honesty: "No energy. Orders never time out. Ads are optional, and gift box odds are shown before you open one."
- Screenshots, board first: a merge with the fox's ticket glowing; a ticket stamped and folding into a lantern; the Ladder Book; the Lantern Gate; the Autumn Moon board. A person compares them with the top merge and market titles, Animal Night Market and Merge Feast by name.
- Icon: a glowing ticket lantern over two merging skewers on indigo.
- `games/night-market/store/releases.json` holds release notes and log. `REVIEW-NOTES.md` argues 1.2's weakest claims with the tap path: "Drag one Pepper Skewer onto another; drag the Twin Skewer onto the fox's ticket; the ticket pays when complete."

---

## 8. The balance bot, its targets, and the order of work

### 8.1 Order of work: rules and bot before any screen

1. Hour 0 (30 minutes): the shared interface commit (9.2).
2. Hours 0 to 3: P2 runs an abstract multiset prototype of these rules and the bot against fixtures; findings go to the lead as decisions, never silently into the rules. The prototype is not committed.
3. Hours 0 to 4: the rules package with its tests. From hour 3 the real bot `src/engine/merge/bot.ts` runs against the real engine, event to event.
4. `scripts/content/merge-bot.ts` (CLI) and `scripts/content/build-night.py`, which writes `games/night-market/game.json` only after every hard target passes on the seeds 12345, 4, 99, 7 and 2026, and prints the tables of 2.12 and 3.3, the season times to season 10, and κ.
5. Screens build in parallel against typed interfaces and fixtures (`src/engine/fixtures/merge.ts`) with no number of their own; they are wired to tuned data only after step 4.
6. `scripts/validate.ts` runs the merge bot for a merge game (12 h with season closes, and a 10-season run) and fails on every missed hard target.

The bot has no Node imports (the web presets are built from its states) and is in `WEB_ONLY`.

### 8.2 Bots

- Active: one action per 1.5 s (tune 1.0 to 2.0 after the first playtest), 2.5 s reaction after a sheet opens. Priorities: deliver any good matching an open line (Parade and Festival included); merge the lowest pair on the path to the line nearest completion; merge any lowest pair; Basket the lowest unwanted good only if F = 0 and no merge exists. It buys by `advice()`, opens gift boxes at once and closes the season as soon as the Festival is filled.
- Lazy: merges lowest pairs and delivers matches without planning; buys the cheapest thing.
- Deliver-only: drags any matching good, never merges.
- Passive: 5 sessions a day of 8 minutes with the active policy; takes the away ad.
- Check-in: opens every 4 h, collects, buys by advice for 2 minutes, never drags.
- Idle: never acts.
- Hint-follower: does only what the goal line and firefly say, 2.5 s reactions.
- Tutorial: plays 3.1 to its timings.
- Adversarial, the active bot plus one habit each: Not tonight whenever ready; gift boxes hoarded until just before closing; Basket sell, buy, undo; the device clock moved 15 min forward between ad uses, and 4 h forward, back and forward again.

### 8.3 Hard targets (every seed; the build fails on a miss)

1. Opening: first ticket paid ≤ 15 s; in minutes 0 to 10 the gap between paying moments (a ticket or a purchase) has median ≤ 30 s, 90th percentile ≤ 50 s, maximum ≤ 60 s; at least 12 purchases.
2. Stall openings (active bot): Tea 1:30 to 3:00, Steamer 7 to 11 min, Sweets 20 to 35 min, Noodles 70 to 100 min.
3. Ticket fill time, hour 1: median 20 to 60 s, 90th percentile ≤ 120 s; Parade median ≤ 4 min. After every gear purchase, the median fill time of the next 10 tickets ≤ 1.2 × that of the previous 10.
4. Feasibility and honesty: 0 tickets breaking (a) to (d) (`missing()` and the solver's fast check on every draw); 0 tickets the active bot needed a Basket sale to finish; 0 tickets whose shown price differs from the paid one, or changed after the draw; "Setting up…" ≤ 1 % of counter-seconds; the idle and check-in bots fill 0 tickets (the engine delivers nothing itself); the deliver-only bot earns ≤ 20 % of the active bot over hour 1.
5. Board: F = 0 for ≤ 15 % of active minutes over hours 0 to 3 and ≤ 3 % in minutes 0 to 10; deadlock (F = 0, no merge, no delivery) ≤ 2 %; Basket sales ≤ 5 % of goods made; the gears of the two highest open chains wait ≤ 20 % of active time (other chains reported).
6. Novelty (3.3's definition): something new every 3 min or less in minutes 0 to 30 and every 20 min in hours 0 to 3; a first-time tier every 6 min in hour 1 and every 15 min in hours 1 to 3.
7. Value per bot action rises at least ×3 per hour over hours 1 to 3.
8. Income: coins only from the six sources of 2.3 on every trace; tickets ≥ 60 % of all coins over minutes 0 to 10 (the placeholder model gives about 70 %, the rest the till and gift boxes) and of the active bot's income at minutes 10, 60 and 180; the minder share 8 to 25 % at minute 10 and 20 to 35 % at minutes 30, 60 and 180; ticket income 60 to 90 % of the ceiling C (2.12) at minutes 10, 60 and 180.
9. Offline: 1 h away with the ad pays 0.25 to 0.6 of 1 h of active play at minutes 30, 60, 120 and every 2 h after (also with Late Hours); the closed form matches event stepping exactly.
10. Seasons (run to season 10 with the starting values before any screen): season 1's Festival at 2:30 to 3:30 (active), day 2 or 3 (passive); in season 2, Noodles in ≤ 60 % of season 1's time to Noodles, and Puffs opened and the Festival filled in 80 to 110 % of season 1's time; seasons 3 to 10 each 50 to 90 % of season 1's time, none more than 10 % longer than the one before.
11. Passive player: Steamer on day 1, Sweets on day 1 or 2, Noodles on day 2, the Festival on day 2 or 3; the advised purchase affordable but unbought ≤ 30 % of session time. On a miss the away share or cap moves, not the active economy.
12. Adversaries: each within 5 % of the active bot's income, or its habit refused by a rule.
13. Odds: observed Lucky, ripe-drop and gift-box rates within ±0.5 points of the printed odds over 100k draws.
14. Determinism: the same seed gives a byte-identical trace, at 10 Hz or event to event.
15. The lazy bot earns 0.4 to 0.7 of the active bot over hour 1.

### 8.4 Soft targets (reported) and knobs

Reported: board-full share per 10 minutes; shelves and waiting per chain; Not tonight use (≤ 10 % of tickets); gift boxes per hour (2 to 6); lanterns per hour (≥ 1 in hours 1 to 3); the hint-follower at Steamer by 15 min; check-in coins per day as a share of the passive bot's (0.15 to 0.4); c/s at 10, 30, 60, 120, 180 min; passive seasons closed at days 7 and 21.

Knobs `build-night.py` may move, inside the ranges of section 2: the cost growths (gear, stall, shutter); the stall ratio; the chain step and tier growth; T, W, H, R, λ; the tier weight γ and the stretch chance; Q and the minder growth; the Parade interval; β; the Not tonight cooldown; the Festival table; the seasoned step N and the step limit; the familiar-faces base; the pace-unit multiples; Φ.

Knob order per failing gate: opening, shutter and gear costs; stall windows, the stall ratio; minder share, Q then minder growth; board-full, λ then T; fill time, γ then W; seasons, the Festival table, N, the familiar-faces base; rerolling, the Not tonight cooldown. No rule is re-specified after screens exist without the lead.

### 8.5 Season times (filled by the numbers step from the tuned game, 23 November 2026)

Measured on the real engine with the tuned content of `games/night-market/game.json` (written by `build-night.py` after every hard gate passed), by the active bot of 8.2 with M6, M22, M31, M34 and M41 at 1.5, 2.0 (the reference hand of M30) and 2.5 s an action, 16 h of play or ten season closes. Tuning seeds 101 to 115; the five named seeds (12345, 4, 99, 7, 2026) were never seen by the tuning and are shown apart. The whole gate table with pass counts and proposed guards is the numbers step's TABLE.md; the rows here are the season clock in minutes.

**Active bot, 1.5 s an action** (15 seeds; season clock in minutes, median (range); "n/N" = seeds that reached it within 16 h of play):

| Season | Tea | Steamer | Sweets | Noodles | Puffs | Festival | Festival / season 1 | reached |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 (1-2) | 7 (6-7) | 21 (19-23) | 72 (66-86) | - | 98 (77-120) | - | 15/15 |
| 2 | 0 (0-0) | 2 (2-3) | 8 (7-9) | 39 (32-43) | 96 (86-107) | 99 (90-111) | 1.06 (0.81-1.23) | 15/15 |
| 3 | 0 (0-0) | 1 (1-1) | 4 (3-4) | 13 (12-15) | 43 (36-48) | 49 (46-73) | 0.52 (0.40-0.75) | 15/15 |
| 4 | 0 (0-0) | 1 (0-1) | 3 (2-3) | 10 (9-11) | 32 (28-36) | 47 (40-71) | 0.51 (0.36-0.70) | 15/15 |
| 5 | 0 (0-0) | 1 (0-1) | 2 (2-2) | 8 (7-10) | 24 (18-29) | 56 (35-71) | 0.56 (0.31-0.92) | 15/15 |
| 6 | 0 (0-0) | 0 (0-1) | 2 (2-2) | 9 (8-10) | 20 (18-22) | 43 (34-70) | 0.49 (0.34-0.68) | 15/15 |
| 7 | 0 (0-0) | 0 (0-1) | 2 (2-2) | 9 (7-10) | 19 (17-21) | 46 (35-65) | 0.50 (0.33-0.69) | 15/15 |
| 8 | 0 (0-0) | 1 (0-1) | 2 (1-2) | 9 (8-10) | 19 (17-21) | 56 (41-107) | 0.54 (0.41-1.15) | 15/15 |
| 9 | 0 (0-0) | 0 (0-1) | 2 (2-2) | 8 (7-9) | 19 (17-21) | 44 (26-71) | 0.44 (0.29-0.73) | 15/15 |
| 10 | 0 (0-0) | 1 (0-1) | 2 (2-3) | 9 (8-10) | 19 (17-22) | 53 (42-81) | 0.53 (0.47-0.82) | 15/15 |

Passive bot (5 sessions of 8 min a day, the away ad), per seed: Steamer day 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1; Sweets day 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1; Noodles day 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1; season 1 Festival day 2 2 2 2 2 2 2 2 1 1 1 2 2 1 2; seasons closed by day 7: 7 5 7 6 7 6 6 7 6 6 6 6 6 6 6; by day 21: 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10.

**Active bot, 2.0 s an action** (15 seeds; season clock in minutes, median (range); "n/N" = seeds that reached it within 16 h of play):

| Season | Tea | Steamer | Sweets | Noodles | Puffs | Festival | Festival / season 1 | reached |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 (1-2) | 8 (7-9) | 26 (23-28) | 86 (82-93) | - | 118 (103-156) | - | 15/15 |
| 2 | 0 (0-0) | 3 (2-3) | 10 (8-10) | 45 (40-50) | 112 (104-124) | 115 (106-130) | 0.98 (0.71-1.13) | 15/15 |
| 3 | 0 (0-0) | 1 (1-2) | 4 (4-5) | 16 (15-17) | 49 (44-54) | 70 (59-132) | 0.62 (0.41-1.12) | 15/15 |
| 4 | 0 (0-0) | 1 (0-1) | 3 (2-3) | 12 (10-13) | 36 (30-42) | 62 (51-105) | 0.53 (0.38-0.95) | 15/15 |
| 5 | 0 (0-0) | 1 (0-1) | 2 (2-3) | 10 (9-11) | 28 (20-31) | 64 (35-99) | 0.52 (0.32-0.95) | 15/15 |
| 6 | 0 (0-0) | 1 (0-1) | 2 (2-3) | 11 (9-12) | 23 (19-25) | 62 (47-112) | 0.49 (0.39-1.01) | 15/15 |
| 7 | 0 (0-0) | 1 (0-1) | 2 (2-3) | 10 (8-11) | 22 (20-24) | 64 (43-127) | 0.53 (0.30-1.11) | 15/15 |
| 8 | 0 (0-0) | 1 (0-1) | 2 (2-3) | 10 (9-13) | 23 (21-26) | 66 (53-121) | 0.54 (0.37-1.03) | 15/15 |
| 9 | 0 (0-0) | 1 (0-1) | 2 (2-3) | 10 (8-11) | 21 (19-24) | 66 (50-95) | 0.57 (0.40-0.71) | 15/15 |
| 10 | 0 (0-0) | 1 (0-1) | 3 (2-3) | 10 (8-11) | 22 (19-24) | 76 (55-212) | 0.64 (0.47-1.46) | 15/15 |

Passive bot (5 sessions of 8 min a day, the away ad), per seed: Steamer day 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1; Sweets day 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1; Noodles day 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1; season 1 Festival day 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2; seasons closed by day 7: 5 5 5 4 5 4 5 5 6 4 5 5 6 5 5; by day 21: 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10.

**Active bot, 2.5 s an action** (15 seeds; season clock in minutes, median (range); "n/N" = seeds that reached it within 16 h of play):

| Season | Tea | Steamer | Sweets | Noodles | Puffs | Festival | Festival / season 1 | reached |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 (1-2) | 10 (8-11) | 30 (26-32) | 98 (88-111) | - | 142 (127-195) | - | 15/15 |
| 2 | 0 (0-0) | 3 (2-3) | 10 (9-12) | 53 (39-60) | 130 (117-143) | 133 (122-149) | 0.93 (0.66-1.14) | 15/15 |
| 3 | 0 (0-0) | 1 (1-2) | 5 (4-6) | 18 (16-21) | 56 (49-61) | 72 (61-168) | 0.52 (0.37-1.25) | 15/15 |
| 4 | 0 (0-0) | 1 (1-1) | 3 (2-5) | 13 (11-16) | 43 (33-49) | 87 (55-264) | 0.56 (0.35-2.03) | 15/15 |
| 5 | 0 (0-0) | 1 (0-1) | 3 (2-3) | 11 (10-12) | 31 (23-35) | 81 (46-112) | 0.56 (0.34-0.85) | 15/15 |
| 6 | 0 (0-0) | 1 (0-1) | 2 (2-3) | 11 (9-13) | 24 (23-27) | 81 (54-138) | 0.54 (0.36-1.04) | 15/15 |
| 7 | 0 (0-0) | 1 (1-1) | 3 (2-4) | 11 (10-14) | 24 (23-27) | 85 (60-142) | 0.60 (0.41-0.99) | 15/15 |
| 8 | 0 (0-0) | 1 (0-1) | 2 (2-4) | 11 (10-12) | 25 (22-27) | 113 (61-185) | 0.73 (0.43-1.46) | 13/15 |
| 9 | 0 (0-0) | 1 (0-1) | 2 (2-3) | 11 (9-12) | 24 (21-26) | 71 (47-117) | 0.53 (0.30-0.76) | 12/15 |
| 10 | 0 (0-0) | 1 (0-1) | 3 (2-3) | 12 (10-13) | 23 (22-25) | 71 (62-98) | 0.54 (0.43-0.67) | 5/15 |

Passive bot (5 sessions of 8 min a day, the away ad), per seed: Steamer day 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1; Sweets day 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1; Noodles day 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1; season 1 Festival day 3 3 2 2 2 3 2 3 2 2 2 3 2 3 2; seasons closed by day 7: 4 4 4 4 4 4 4 3 5 5 4 4 5 4 5; by day 21: 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10.

**Active bot, 2.0 s, the five named seeds an action** (5 seeds; season clock in minutes, median (range); "n/N" = seeds that reached it within 16 h of play):

| Season | Tea | Steamer | Sweets | Noodles | Puffs | Festival | Festival / season 1 | reached |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 (1-1) | 8 (8-9) | 26 (23-27) | 86 (78-90) | - | 122 (96-150) | - | 5/5 |
| 2 | 0 (0-0) | 2 (2-3) | 9 (9-11) | 46 (43-50) | 112 (105-127) | 114 (108-132) | 0.89 (0.83-1.37) | 5/5 |
| 3 | 0 (0-0) | 1 (1-1) | 5 (4-5) | 17 (15-19) | 49 (45-53) | 62 (58-67) | 0.51 (0.43-0.64) | 5/5 |
| 4 | 0 (0-0) | 1 (1-1) | 3 (2-3) | 12 (10-13) | 38 (37-41) | 65 (44-75) | 0.54 (0.43-0.70) | 5/5 |
| 5 | 0 (0-0) | 1 (1-1) | 2 (2-3) | 10 (10-11) | 28 (27-35) | 114 (52-150) | 0.83 (0.54-1.43) | 5/5 |
| 6 | 0 (0-0) | 0 (0-1) | 2 (2-3) | 10 (9-10) | 21 (19-24) | 89 (51-108) | 0.73 (0.34-1.13) | 5/5 |
| 7 | 0 (0-0) | 0 (0-1) | 2 (2-2) | 9 (8-11) | 21 (20-23) | 81 (60-96) | 0.69 (0.40-0.99) | 5/5 |
| 8 | 0 (0-0) | 1 (1-1) | 2 (2-3) | 11 (10-11) | 22 (21-23) | 77 (64-97) | 0.78 (0.43-0.80) | 5/5 |
| 9 | 0 (0-0) | 0 (0-1) | 2 (2-3) | 9 (8-11) | 21 (19-23) | 61 (53-117) | 0.50 (0.39-1.22) | 5/5 |
| 10 | 0 (0-0) | 1 (0-1) | 2 (2-3) | 10 (9-12) | 21 (19-24) | 71 (50-104) | 0.66 (0.33-0.99) | 4/5 |

Passive bot (5 sessions of 8 min a day, the away ad), per seed: Steamer day 1 1 1 1 1; Sweets day 1 1 1 1 1; Noodles day 1 1 1 1 1; season 1 Festival day 2 2 2 2 2; seasons closed by day 7: 5 5 5 5 5; by day 21: 10 10 10 10 10.

Reading it:
- Season 1 at 2.0 s: Tea about 1 min, Steamer 8, Sweets 26, Noodles 86, the Festival 118 (103 to 156 over 15 seeds; 96 to 150 on the five named seeds). At 1.5 s everything comes about a fifth sooner (Festival 77 to 120); at 2.5 s Steamer, Sweets and Noodles open 1 to 20 min after gate 2's windows (which M30 states at 2.0 s) and the Festival takes 127 to 195 min.
- Season 2 (Puffs at its range floor, the Puffs line at tier 3) takes about as long as season 1 (0.98 at 2.0 s); seasons 3 to 10 take about half to two thirds of season 1 on the median seed (0.49 to 0.64 at 2.0 s), with single seeds from 0.3 to 1.5 times, as M40 foresaw.
- The passive bot opens every stall of season 1 on day 1 (gate 11 asked Noodles on day 2; M41 sets that band from this measurement), fills the first Festival on day 1 to 3 and closes 3 to 7 seasons by day 7. "10 by day 21" is the run's cap of ten seasons, not a measurement of more.
- Measured with M50's fill flow (`gear.spare` 2) as the engine ran it at 14:30 on 23 November; M51 (only merges and drops raise best_c) was not in the engine yet, so these rows are to be re-run once it lands (`python3 scripts/content/build-night.py --table`).

The first ten minutes of the tuned game (M47; seed 12345, 2.0 s an action, the active bot; "c.k" is chain c's tier k, chains 0 Grill, 1 Tea, 2 Steamer):

| Time | What the player does and gets | Spent | c/s |
|---|---|---|---|
| 0:00 to 0:30 | The six opening skewers make the fox's Twin Skewer (+12) and the hedgehog's Glazed Skewer (+29); three more one-line Grill tickets (+12 each); lantern 1 lights at the third ticket: a third counter. | 0 | 2.6 |
| 0:30 to 1:00 | One Glazed Skewer ticket (+29); the purse reaches the Tea stall's 120. | 0 | 1.0 |
| 1:00 to 2:00 | Tea stall (120, at 1:18), Grill gear L2 (20) and L3 (30), Tea gear L2 (80), Grill stall L2 (50), the first shutter (30); the first two-line tickets (+47, +103, +110). | 330 | 4.8 |
| 2:00 to 3:00 | Old Brindle hired (250, at 2:26); Grill stall L3 (68); shutters 2 and 3 (44, 63); a three-line ticket (+170). | 425 | 7.5 |
| 3:00 to 4:00 | Grill stall L4 and L5 (91, 123), gear levels (45, 120); seven tickets, the largest two Milk Teas (+265). | 379 | 12.3 |
| 4:00 to 5:00 | Only merges and deliveries: five tickets (+48 to +158) while the purse saves for Pim. | 0 | 11.0 |
| 5:00 to 6:00 | Pim hired (1,000, at 5:01); Tea stall L2 and L3 (200, 270), Tea gear (180), shutters (91, 133); the first Pearl Tea, at once on a ticket (+364). | 1,874 | 14.5 |
| 6:00 to 7:00 | Stall and gear levels (68 to 365), the last row-7 shutter (192); the first Parade (6:24) and its gold ticket; a Milk Tea + Skewer Bundle ticket (+556). | 791 | 20.0 |
| 7:00 to 8:00 | The Parade paid (+599), a Pearl Tea ticket (+359); the first Skewer Fan. | 0 | 23.0 |
| 8:00 to 9:00 | Tea stall and gear levels (492, 270); the Steamer stall (2,200, at 8:31), Steamer gear L2 and L3 (320, 480); a Tea Flight + Pearl Tea ticket (+1,410); the first Tea Flight, Dough Ball and Dumpling. | 3,762 | 33.9 |
| 9:00 to 10:00 | The first column-6 shutter (279); the Steamer's first lines (+192, +666). | 279 | 37.2 |

At minute 10: 3 stalls, 2 minders, 3 counters, 37 open cells (goods on about nine in ten of them, M50), 30 purchases, 43 paid tickets. Gate 1 on 15 seeds at 2.0 s: first ticket at 4 s; gap between paying moments median 4 to 6 s, at most 31 to 62 s; longest gap without a paid ticket in minutes 0 to 5 at most 24 to 51 s.

---

## 9. First version and later

### 9.1 In the first version

- 6 chains × 8 tiers; 4 seasons drawn, the shapes and characters of 2.11; 20 lanterns; 6 minders.
- Tickets, Parade, Festival, gift boxes, Ladder Book, Lantern Gate, Season scroll, Shop.
- 3 purchases, 3 rewarded ads plus the away ad.
- Tap-tap, undo, tier pips.
- Own sounds and two music loops.
- Web preview presets `?preset=fresh|early|mid|late` from bot states; dev views `merge-art` (contact sheet, greyscale, red share) and `merge-layout`.

### 9.2 Work packages for about eight engineers, with files owned and order

Hour 0: one 30-minute commit by P1, P3 and P7 together, before anything else: `src/engine/merge.ts` (types and every public signature: state, `dropAt`, purchases, `missing`, `advice`, `mergeParams`, event kinds); `src/ui/merge/uiState.ts` (armed cell, long-press chip, undo chip, through its own actions only); `src/ui/merge/strings.ts` with every key in one section per package (afterwards each package adds keys only in its own section); the hint target keys in `src/ui/hints/targets.ts`.

Morning (no screen uses a number before P2's gate):
- P1 Rules (2 engineers): `src/engine/merge/` (`types`, `params`, `create`, `board`, `events`, `drop`, `missing`, `draw`, `tick`, `actions`, `offline`, `season`, `lanterns`, `gift`, `advice`, `hints`), `src/engine/mergeMode.ts`, `src/config/schema.merge.ts`, `src/engine/fixtures/merge.ts`, the engine tests of 10.2; `src/engine/merge.ts` after hour 0.
- P2 Bot and content (1, from hour 0): the prototype; `src/engine/merge/bot.ts` (fixtures, then the real engine from hour 3); `scripts/content/merge-bot.ts`, `build-night.py`; the merge hook in `scripts/validate.ts` (additive: `g.mode === 'merge'`); `games/night-market/game.json` (generated only); 8.5.
- P3 Wiring, tooling, store (1), every shared change additive:
  - `ModeId` (`src/modes/contract.ts`), `MODES` (`scripts/lib/games.js`), the `mode` enum, the opaque `merge` block and the `cosmetic` kind (`src/config/schema.ts`), `FxMode` (`src/services/fx/catalog.ts`), the merge catalogue in `scripts/lib/fxCatalog.js`;
  - `scripts/lib/modes.js`: `MODE_FOLDERS.merge` (`src/modes/merge`, `src/ui/merge`, `src/engine/merge`, `src/engine/merge.ts`, `src/engine/mergeMode.ts`, `src/engine/fixtures/merge.ts`, `src/config/schema.merge.ts`); `NODE_ONLY` + `catalog.merge.ts`; `WEB_ONLY` + the bot, the fixtures, `presets.web.ts`, `devViews.web.ts`; `THEME_WORDS.merge` (merge, stall, lantern, skewer, dumpling, noodle, steamer, minder, parade, festival, ticket, each only if `--words` finds no literal in shared or family files);
  - `scripts/lib/fingerprint.ts`: `grid-board` and the kind multiset check, with spam.md's row updated;
  - owner of `src/ui/hints/targets.ts` and of `src/ui/merge/MergeShell.tsx`, whose named slots P6, P7 and P8 mount into;
  - `src/modes/merge/` (`index.tsx`, `actions.ts`, `fx.ts`, `presets*.ts`, `devViews*.ts`), `src/modes/entries.test.ts`;
  - `games/night-market/store/` (`fingerprint.json`, `REVIEW-NOTES.md`, `RATING-NOTES.md`, `NAME-SEARCH.md`, `releases.json`, `store.config.json`), `scripts/content/night-store.json`, the name search, `check:bundle` for all three games.
- P4 Art kit (1): `src/ui/merge/art/` (palette, goods, gear and rail, stall fronts in 3 awning states, animals, minders, the dragon, the firefly, shutters, blocks, season particles, Basket, gift bag), `bakeAtlas`, its README. Goods are one base glyph per chain plus a dressing per tier: the glyph; a pair; a glaze; a ribbon; on a plate; plate and garnish; a lantern halo; an indigo lacquer board with a brass rim.
- P5 Sound (1): `scripts/audio/recipes_night.py`, `render_night.py`, `night_music.py`, the cross-key mode of `scripts/audio/compare.py` (same-key results unchanged), `games/night-market/assets/sfx/`, `src/services/fx/catalog.merge.ts`.

From hour 2, against fixtures:
- P6 Play canvas: `src/ui/merge/layout.ts` (+ test), `src/ui/merge/play/` (canvas, board and street, drag layer, `hitTest`, pans, tap-tap).
- P7 Bars, sheets, spokes: `src/ui/merge/hud/` (top bar, `barMetrics.ts`, goal line, bottom row, undo chip), `sheets/`, `spokes/`; steward of `strings.ts`'s structure.
- P8 Hints, platform, QA: `src/ui/merge/hints.ts` (the firefly as `parts.HintPointer`, the trail), Android back over `uiState`, the loading screen, overlay registration, the device checks of 10.1.

After P2's gate: numbers into screens, reviews, fixes.

The first two games do not change: no file of `src/modes/sim`, `src/modes/haul`, `src/ui/sim`, `src/ui/haul`, `src/engine/haul*` or their game.json is edited; `modeRegression.test.ts` stays green with its recordings; the Pizza-to-Orbit fingerprint report and compare.py's same-key results stay byte-identical.

### 9.3 Later

- Chain 7 and tiers 9 and 10, with the bot run to season 15.
- Two more drawn seasons, and own music loops for autumn and winter.
- More than 4 counters on tablets.
- The Pocket: one or two slots beside the Basket where a good can be parked (decision M5).

Never: energy, paid random items, auto-merge as a purchase, countdown offers.

---

## 10. Acceptance checks and tests

### 10.1 What anyone can see (web preview, `GAME=night-market`; then a phone)

1. The first three minutes play as 3.1; the first coins come from the first ticket, under 15 s.
2. Every drop target of 2.5 behaves as listed, by drag and by tap-tap; the outlined target is where the good lands; a second finger cancels.
3. No line asks for a gear's base drop; prices equal payments; a disabled "Not tonight" shows the room text.
4. The goal line shows one goal; its estimate is within ×2 of the time taken.
5. Both sizes at fontScale 1.0 and 1.3: nothing clipped, overlapped or wrapped; 4 counters, the 6-line banner and 6 stall fronts fit at 375.
6. Android back closes layers in 4.5's order and leaves only from the bare board.
7. Away for 1 h: the report shows minder coins and shelf goods; the ad adds half; moving the device clock forward and back pays once.
8. Season 2 has the Lantern Pan, fireflies and seasoned gear where tier 6 was reached.
9. Gift box odds and coins show before opening; the Ladder Book help prints the Lucky odds.
10. A person fills `fingerprint.json` `human` against both games and does the listening check.
11. The greyscale contact sheet tells every tier apart at 47 pt; red stays under 10 % of a screenshot (dev view `merge-art`).

### 10.2 Tests that must exist (vitest)

Engine (`src/engine/merge*.test.ts`):
- `drop.test.ts`: every row of 2.5's table; undo refused after a purchase or when cash < refund; a Lucky skip stamps the skipped tier. `missing.test.ts`: against the exact solver on 10⁴ small boards.
- `draw.property.test.ts` (10⁵ random states, re-checked after every fallback step): 0 breaches of (a) to (d) as written (the queue in (b), the whole board in (c)); the H+1 candidate; best_c of a newly opened chain; scripted tickets exempt only from (d); one `roomFor`.
- `ticket.test.ts`: lines never change; shown price = paid price, live with stall level; Parade timing; the fill-one-line ad never fills the last line.
- `tick.split.test.ts`: tick(a + b) = tick(a) then tick(b) exactly over random splits, covering every event kind of 2.4, the waiting gear's restart and the MAX_TICK cut.
- `offline.test.ts`: closed form = event stepping on charges, sales and next-event offsets; earnings returned, cash unchanged, no time more than one interval ahead of the clock; the caps; clock forward 4 h, back, forward again pays once; ad cooldowns unmoved; `reportAlone`.
- `festival.test.ts`: seasons 1 to 10 buildable line by line from the opening board. `season.test.ts`: the lists of 2.11 exactly (pending goods kept, `basketUndo` cleared); refused before the Festival; the 16 shapes and characters; braziers only on open cells; precedence; seasoned gear; familiar faces.
- `lanterns.test.ts`, `gift.test.ts` (odds ±0.5 points over 100k; contents fixed at earning, so a later or reloaded opening gives the same), `advice.test.ts` (the bot and the goal line agree; each gain formula; no estimate at R = 0), `coins.test.ts` (cash moves only through the six sources), `determinism.test.ts` (byte-identical 1 h trace at 10 Hz and event to event).
- `mergeMode.test.ts`: create; reconcile from a broken save; save tag `merge1`; `config` rejects an invalid block; `offlineAdMultiplier` 1.5; `entitle` for Late Hours; `income` and `activeIncome` as 2.9.

Shared and tooling:
- `modeRegression.test.ts` unchanged and green; `entries.test.ts` pins the merge entry (`Shell`, `Loading`, `parts` with `Icon`, `beast:` and `HintPointer`, `hints`, `engine`, `presets`, `soundKeys`).
- `fingerprint.test.ts`: `grid-board` accepted; the Pizza-to-Orbit report byte-identical (a recorded fixture); the kind multiset check; night-market against each game: 8 of 8 must differ or pending, at least 15 known or pending.
- `bundleRules.test.ts`: a merge file imported by a shared file fails; no merge folder in a sim or haul bundle, and no sim, haul or tabs-family file in the merge bundle.
- `layout.test.ts`: zones add up at both sizes; street ≤ W; cells ≥ 44; 6 stall fronts ≥ 52 pt; the 6-line banner; the bottom row; every bottom-row target and top-row cell reachable by the finger at 375 × 667; fontScale 1.3 fits.
- compare.py: the cross-key mode passes against both games; Pizza-against-Orbit same-key results unchanged.
- Store: title, subtitle, keyword, `night_` prefix and kind multiset checks.

### 10.3 Before declaring done

Run `npm run typecheck`, `npm test`, `npm run validate` (with the merge bot gates), `npm run lint:worklets`, `npm run check:bundle` for all three games, and `npm run check:bundle -- --export` before a release. Look at the game in the web preview at both phone sizes.

---

## 11. Lead decisions

Decisions taken after revision 2. A decision here overrides the text above where they differ; the engineer who touches that text brings it in step.

- **M1. The hour-0 commit is a skeleton by one engineer.** It holds the engine interface (`src/engine/merge.ts`, types and every public signature, bodies that throw "not built yet"), the mode wiring (9.2, P3's shared changes), the merge schema with the starting values of 2.2, and a placeholder `games/night-market/` folder so the web preview starts. The placeholder game.json carries the starting values and the word PLACEHOLDER in its description; `build-night.py` replaces it whole after the numbers gate. Until the bot exists, `validate` runs for night-market without a bot.
- **M2. Which targets fail a build, and when.** Hard from the first run, because they are promises and not tastes: gate 4 (feasibility and honesty), the "six sources" part of gate 8, the "closed form equals event stepping" part of gate 9, and gates 12, 13 and 14. Every pacing band (gates 1, 2, 3, 5, 6, 7, the shares of gate 8, the band of gate 9, and gates 10, 11 and 15) is an aim: `build-night.py` tunes toward it inside the ranges of section 2. After the first full run the lead sets each band once from what the tuned game measures, writes it here, and from then on it is a hard guard. A band is not moved a second time without a rule change.
- **M3. The hand must have work.** A new measure, reported per minute for minutes 0 to 10: useful actions the active bot had available (a merge, a delivery or an affordable advised purchase), and the longest wait with none. Aim: at least 20 a minute from minute 1 on, and no wait longer than 8 s in minutes 0 to 10. With one stall dropping 12 goods a minute this is likely missed by the starting values; the prototype measures it and proposes the smallest change (more goods on the opening board, goods behind the first shutters, T at its lower bound for the first stall only). The lead picks one before the rules are built.
- **M4. Bound (d2) is on trial.** The prototype reports, with and without (d2): the share of tickets filled within 2 s of the draw, the fill-time distribution, the "Setting up…" share, and what a hoarder and a "Not tonight whenever ready" player gain. As specified unless the numbers say it costs more than it protects; the lead decides before the rules are built.
- **M5. Cut from the first version: the Pocket.** No Pocket slots, no `pocket` state, no Pocket drop target, no second bottom-row layout. Lantern 14 (open all 26 shutters) gives "gift boxes hold a fourth slot" (new: yes). Lantern 16 (fill 2,000 tickets) gives "Lucky 1 in 16" (the better of this and lantern 7 applies). The Pocket moves to 9.3 Later.
- **M6. Bots in the rules phase:** active, lazy, deliver-only, passive, check-in, idle, and the four adversarial habits as switches on the active bot. The hint-follower and tutorial bots are not built; the tutorial script is tested with the hints in the screens phase, and "first ticket paid within 15 s" is measured by the active bot playing the scripted opening.
- **M7. `cosmetic` joins the shared product-kind enum** (additive; the first two games' data and tests do not change). The products are those of M13.
- **M8. The away report is the mode's own sheet** (as the second game's Shift Log is its own), with `offlineAdMultiplier` 1.5 and the label "Watch ad: +50 %". No shared popup text changes.
- **M9. The hit test resolves at the finger point** (1.3), with the dragged good drawn 40 pt above it. To be looked at again after the owner's first phone test.
- **M10. Ad cooldowns run on the play clock** and say so ("ready after 4 min of play").
- **M11. The title "Lantern Row" stands unless the store search finds a live game it would be confused with**; the search uses generic terms only and its verdicts go to `games/night-market/store/NAME-SEARCH.md`.
- **M12. Review rounds are capped:** one audit of the rules with one pass of fixes, one review of the screens with one pass of fixes. What is still open after that is listed for the owner as a known limit, not chased.
- **M13. Three products, and the ad skip is sold under its own name.** `night_awnings` (cosmetic, "Blue Silk Awnings", $2.99), `night_late_hours` (unlock, "Late Hours": 4 more hours away, $3.99), `night_quiet_evening` (skipAds, "Quiet Evening": every "Watch ad" reward at once with no video, $4.99). The store reviewer was right that an ad skip folded into an `unlock` hid from our own check what all three apps sell; the fingerprint notes and REVIEW-NOTES say openly that each of the three apps sells an ad skip, as most free games do. The kind multiset {cosmetic, unlock, skipAds} still differs from both games'. No product title uses "Lamplighter" (a live merge game's hero).
- **M14. A third rewarded ad, "Call the dragon":** brings the Parade now when none is out; 20 min cooldown on the play clock. The owner wants ad income, and this one gives the player a goal instead of a number.
- **M15. Noodles tier 6 is "Family Bowl"** (not "Noodle Feast": a live merge game about a night food bazaar has "Feast" in its title).
- **M16. The listing is `scripts/content/night-store.json` as revised after the store review** (title "Lantern Row", subtitle "Merge snacks, fill each order", the keyword list of 7.4, seasons and lanterns before the idle paragraph); its products follow M13. Prices are ordinary store tiers and need not differ from the other games'.
- **M17. Audience:** Play target 13+ and Apple 13+, as for the first two games. Play's question "could the app unintentionally appeal to children" and the age band of `docs/design/research/policy.md` (checklist 7 and 8) concern all three apps and are the owner's to answer before a submission; nothing in the build depends on the answer. It goes in the final report.
- **M18. The opening board holds 6 Pepper Skewers** (see M3 below): the fox's Twin Skewer and the hedgehog's Glazed Skewer need exactly 6, so the first 20 seconds are all merges and two paid tickets.
- **M19. One rounding rule for every amount of coins.** `roundCoins(x)`: below 1,000, half up to a whole coin; from 1,000, to 3 significant digits. It is applied once, at the end, to every amount that is shown or paid: each cost (so the Noodles stall costs 173K), each ticket's price (computed from exact values, then rounded), a Basket sale, a minder's sale, a gift box's coin slot, the Festival purse, the away earnings. A single good's value in a chip is rounded the same way for display only. Shown always equals paid because one function gives both.
- **M20. The first two games' generated bundle reports** (`games/*/store/bundle-report.json`) go stale whenever a shared file changes, and fingerprint dimension 8 then reads "pending" for them. They are regenerated by `npm run check:bundle -- --export` in the final gates; that is a generated record, not a change to those games. What must stay byte-identical during the build is the recorded Pizza-to-Orbit comparison (`scripts/lib/fingerprint.pizzaOrbit.fixture.json`, replayed by `fingerprint.test.ts`).
- **M21. The shared store asks the mode whether a reset is allowed** (`EngineMode.canPrestige?`, additive; the first two games do not define it and keep their points gate), so "Close the season" depends only on the Festival, never on a prestige-points threshold.
- **M3, decided from the prototype.** With one stall dropping every 5 s the hand waits; slowing the drops to delay the Tea stall made it worse. So: **T = 4 s for every gear, as a rule** (no longer a knob); **the opening board holds 6 Pepper Skewers** (exactly what the two scripted tickets need); **the Tea stall is cheap and opens within the first 45 to 90 seconds**. Measured in the prototype at 1.5 s per action: 20 useful actions in minute 0, 27 in minute 1, 34 to 37 from minute 2, longest wait 9 s; at 2.5 s per action the hand is never idle. The aim that replaces M3's first wording: at least 20 useful actions a minute from minute 1 at the median seed and at least 16 on the worst, and no wait over 10 s in minutes 0 to 10.
- **M4, decided from the prototype: bound (d) is (d1) only.** With (d2) the board was full 18 to 61 % of the first three hours and the top gears waited two thirds of the time; without it, under 1 %, and neither a hoarder nor a "Not tonight" player gains. `missing()` stays: bound (b), the advice and the hints use it.
- **M22. Shelf releases go to the highest open chain first** when several shelves wait for a freed cell. With the lowest first, later seasons deadlocked on low-chain goods in the prototype. The bot's Basket rule and the hint follow: an unwanted tier-8 good is sold first.
- **M23. Stall-opening costs are a table of five tuned numbers**, not a ratio. New aims for gate 2 (active bot, 1.5 s per action): Tea 0:45 to 1:30, Steamer 5 to 9 min, Sweets 18 to 30 min, Noodles 60 to 90 min.
- **M24. Gift boxes: one every N filled tickets** (N tuned 15 to 40, start 25) and a coin slot of m × U (m tuned 0.25 to 1.5, start 0.5). At the specification's values gift coins were up to half of all income. Aims: gift coins at most 15 % of the coins of hours 0 to 3; 6 to 12 boxes an hour.
- **M25. Season 1's Festival is a tuned row like the later ones** (4 to 6 lines). At the specified lines the season ended minutes after the Noodles stall opened. Aims (gate 10 reworded): the active bot fills season 1's Festival at 100 to 160 min, the slowest seed at most 1.6 times the fastest; seasons 3 to 10 each take 50 to 90 % of season 1; the seasoned-gear step N always equals the gear step s.
- **M26. Gate wording, from the prototype.** Gate 4: a ticket's price never falls after the draw (a stall level may raise it). Gate 3's gear check compares 30 tickets each side with a 1.3 threshold. Gate 8's ceiling band is dropped (sources and shares stay). Gate 9's cross-check steps events with the board frozen (while away, drops go only to the shelf). The deliver-only bot starts from the active bot's state at minute 3. Gate 1's "something worth doing" is M3's measure.
- **M27. Prices slow the game, not slower hands.** The prototype pushed seven knobs to the ends of their ranges because nothing could get dearer. Tunable from now on, with the ranges in `RANGES`: the four base costs (gear 20, stall level 50, minder 150, shutter 30, each × 0.5 to × 4), gear growth 1.40 to 1.70, stall growth 1.30 to 1.50, and the stall table of M23. T is not a knob.
- **M28. Gear level 40 is the top.** At a level 41 the ripe chance would fall back to 0 with the base tier capped at 4, so the last upgrade would make drops worse. The base tier is min(4, 1 + floor((L − 1)/s)) and the ripe chance 0.05 × ((L − 1) mod s) for L from 1 to 40; a seasoned start level above 40 is 40.
- **M29. A stall front has three awning looks:** stall levels 1 to 4 plain, 5 to 9 scalloped, 10 and up double. (The body named three redraws; the atlas holds three looks.)
- **M30. How pacing is measured, after the prototype's audit.** The runs are chaotic: changing the bot's action time by a thousandth of a second moved three-hour income by half or double, and a season that takes 82 minutes at 1.5 s per action takes 225 at 2.0 s. So: (1) every pacing aim is stated for the active bot at **2.0 s per action** (a casual thumb) and reported beside 1.5 s and 2.5 s; (2) numbers are tuned on 15 seeds and checked on 5 more that the tuner never saw; (3) an aim is met when at least 13 of the 15 seeds meet it, and results are reported as pass counts, never as one median; (4) a comparison between two bots (an adversary, the lazy bot, a habit) is a paired difference over at least 30 seeds with the noise band beside it (the same bot at ±0.001 s); (5) the validate gate still runs the five named seeds, against bands the lead sets from the 15-seed table (M2). The owner's first phone test recalibrates the action time.
- **M31. The Festival must not need a rescue.** At a slower hand the last lines to land were the lowest chains' tier 8s, which a player who works where the value is has long stopped making. So: the advice names the Festival's missing good and, when a gear level would halve the work for it, that level ("Grill gear 11: Twin Skewers drop"), as soon as the Festival's chains are open and whenever no purchase is within reach; the bot follows it as a player follows the goal line. The Festival rows are tuned (M25) toward: season 1 filled at a median of 110 to 190 min at 2.0 s per action, not under 75 min at 1.5 s, not over 280 min at 2.5 s. If no row reaches that with tier-8 lines on the low chains, the row asks for high tiers of the high chains instead.
- **M32. The fallback of 2.7, read exactly** (four steps, each followed by a re-check of (a) to (d)): (1) while a bound fails and some line is above its kmin, lower by one tier the highest line that is above its kmin; (2) with every line at its kmin and a bound still failing, drop the last line and go back to (1); (3) with one line at its kmin still failing, try a single line at kmin of each other open chain in turn, upward from the failed chain and wrapping round; (4) none passes: "Setting up…", redrawn at the next board change. `best_c` rises only when a good is placed or merged (and is set to maxPop when a chain opens or a season starts): buying a gear level does not raise it.
- **M33. Aims changed by the audit.** Gate 3: the hour-1 median fill time is aimed at 8 to 45 s (with bound (d1) only, four tickets in ten can be made from stock, which is the game working). Gate 5's board-full share is reported for every bot but is an aim only for the active one; what must hold for every bot, the lazy one included, is deadlock (no free cell, no merge, no delivery) at most 3 % of play time, with the goal line naming the Basket when it happens. Gate 8's shares are set after M30's table exists.
- **M34. A line that a gear upgrade leaves behind.** After one base step an open line can sit exactly at the new base tier (a base drop then fills it by a drag); after two base steps while the same ticket still waits, its good can no longer be made from new drops. Lines never change, so nothing is redrawn: the ticket's detail says "No longer made at this stall" on that line and offers "Not tonight"; the hint points there, the advice never counts that line as within reach, and the bot sends the ticket off. Goods at hand can still fill it.
- **M35. Where the gift bag lives.** The specification gave the gift box a sheet but no way to reach it. A paper bag with its count sits in the top bar between the season chip and the menu button, shown only while boxes wait; a tap opens the gift box sheet. On a 375 pt screen at font scale 1.3 the season chip shortens to the Festival count before anything wraps.
- **M36. Closing the season opens every waiting gift box first.** A box's coin slot is fixed when the box is earned, so a box earned late in a season and kept would pay late-season coins on the first minute of the next one (enough to open three stalls at once). So at the close each waiting box is opened: its coins join the purse and reset with it, its goods wait for room in the new season (a good of a stall not yet open waits for that stall), its Lucky Sparks are kept. The close confirm says how many boxes will be opened. 2.11's "Stays" list reads "goods from gift boxes, Lucky Sparks" instead of "unopened gift boxes".
- **M37. The Festival pays no coins.** The bot showed the Festival purse (30 × U) as 57 % of a season's coins, paid one tap before coins reset: a reward the player loses at once. Filling the Festival now gives 3 Lucky Sparks (5 with lantern 18, which no longer doubles a purse), the season's street piece, and the right to close the season. `festivalPace` is 0 and leaves the knobs; coins enter through five sources: paid tickets, gift-box coin slots, the till, Basket sales and the away report. The Season scroll says what the Festival gives.
- **M38. Tansy, the Noodles minder, is a hare** (not a raccoon). A raccoon shopkeeper in an apron beside a hedgehog and an owl echoed the cast of a very well-known cosy game; no single drawing copied it, but the set did. The six minders are a badger, an owl, a hedgehog, an otter, a hare and a bat, each in different work clothes.
- **M39. A good's name says what its picture shows.** The art kit gives every chain the same eight dressings (the glyph; a pair; a glaze; a ribbon; on a plate; plate and garnish; a lantern halo; a lacquer board), and a few names of 2.2 describe something else (a "Tea Leaf" drawn as a cup, a "Dough Ball" drawn as a dumpling). Before release the names are brought in step with the pictures, renaming where that is cheaper and redrawing only the goods a Festival names; the store text follows.
- **M40. Seasoned gear holds one step** (two with lantern 9), tuned 1 to 2. With three steps the prototype's later seasons took a quarter to a third of the first one, at every setting of the other knobs; with one, about half to two thirds. Seasons 3 to 10 are aimed at 45 to 90 % of season 1 on the median seed; "none more than 10 % longer than the one before" is reported, not required (later seasons differ two- to five-fold between seeds).
- **M41. Aims and bots changed by the prototype's final report** (all subject to M2 and M30). Gate 3: the hour-1 median fill time is aimed at 5 to 25 s and the 90th percentile at 120 s or less; its gear check is dropped (it measured noise at any sample size). Gate 6 keeps "something new every 3 min in minutes 0 to 30 and every 20 min in hours 0 to 3" and drops the first-time-tier clause (tiers arrive in bursts when a stall opens). Gate 7 is measured inside season 1, by thirds of the season. Gate 8's minder band at minute 10 is 8 to 30 %. Gate 11 is set from the measurement. The lazy bot buys the cheapest thing only when it could not afford the advised one within a minute; the check-in bot starts from the active bot's state at minute 10. Texts: 2.7 (d) says "most tickets can be paid from what you hold; every line still needs a merge or a drag"; acceptance check 10.1 item 3 reads "no line asks for a gear's base drop; prices equal payments".
- **M42. The opening script is kept deterministic.** While the scripted tickets of the first season wait (the fox's, then the hedgehog's), no merge is Lucky and no counter draws an ordinary ticket; the first ordinary ticket is drawn 4 s after the hedgehog's is paid. (One first merge in 25 was Lucky and changed the tutorial; and a new ticket on the fox's counter could ask for the skewers the hedgehog's ticket needs.) A line filled by the "Fill one line" ad comes back as a good when its ticket is sent off with "Not tonight", like any filled line: a small gift of the ad, accepted.
- **M43. A fuller board (flow control).** Measured on the joined engine with the active bot at 2.0 s per action and λ = 4: goods lay on a fifth to a half of the open cells for the whole first hour (7 of 32 cells at minute 3, 14 of 44 at minute 30) while 5 to 30 goods waited on shelves and the first three gears stood waiting 30 to 55 % of the time. A merge board that is mostly empty beside stalls that say "waiting" reads as broken. Raising λ alone made bound (c) refuse tickets ("Setting up…" 5 to 22 %), because (c) counted loose goods as space lost. So:
  1. **λ, the loose cap per chain, is 8** (tuned 6 to 12).
  2. **Bound (c) counts the board as it would be after every possible merge.** K = for each chain, carry pairs upward from tier 1 to tier 7 (two of a tier make one of the next) and count what is left: at most one good per tier below 8, and every tier-8 good. Shelves and pending gift goods are not on the board and do not count. (c) reads: K + Σ over the unfilled lines of every open ticket, this one included, of cells(k) = k − b_c + 1, + R ≤ O. The promise is unchanged and now exact: by merging what already lies there the player can always free the cells a ticket's goods need, without selling anything.
  3. Aims for the tuning: goods on 45 to 85 % of the open cells (the median of minutes 3 to 60, active bot at 2.0 s); the two highest gears waiting at most 25 % of the time; "Setting up…" under 1 % of counter-seconds (hard, as before); deadlock at most 3 % for every bot.
- **M44. The firefly follows the goal line.** After the two scripted tickets, the firefly points at whatever the goal line names (the rules' advice), for the first three purchases; then it appears only after 20 s without a touch. 3.1's fixed order (gear level, shutter, Tea) is dropped: with M3 the Tea stall comes first, and a pointer that disagrees with the goal line teaches nothing.
- **M45. A purchase that changes nothing is refused.** A minder level is not sold while the gear holds the house tier back (the button says "Raise the gear first"); the same holds for any level at its top. The rules refuse it and the sheet shows the reason from the rules.
- **M46. "Call the dragon" always delivers.** The ad was offered only while a counter stood empty, and a counter refills in 4 s: a player could watch the video and get nothing. Now the reward is "the Parade is due from this moment": it takes an empty counter at once when there is one, otherwise the next counter that frees. The button says so ("the paper dragon comes to the next free counter"), and it is offered whenever its cooldown is over and no Parade is out or already due.
- **M47. Section 3.1's goal column is superseded.** The tutorial's order after the two scripted tickets is whatever the goal line names (M44); with the starting values that is the Tea stall first (M3, M23), then gear levels and shutters. The timed list of the first ten minutes is section 8.5's, written from the tuned game by the numbers engineer.
- **M48. The idle side is not small, and the store text must not say so.** The attacker measured it: a player who looks in six times a day and never touches a good collects more coins from day 2 on than one who plays 40 minutes a day, and nine tenths of a casual player's coins are away coins. That is what an idle game is, and the game is sold as one; the numbers stay. What changes is the wording: the listing says plainly that the till will bring most of the coins of a player who looks in a few times a day, and that only the hand merges, fills tickets, lights lanterns and closes seasons. REVIEW-NOTES describes the two sources of coins in the same words. The tuning keeps gate 9 (an hour away with the ad pays 0.25 to 0.6 of an hour of play), so playing always beats waiting hour for hour.
- **M49. Known limits of time away, the same in all three games** (the shared store's path; not changed in this build): moving the device clock forward pays the away cap again; closing the app while the away report is on screen loses that report's coins. Both go to the owner as known limits with a suggested separate fix for all three games. Within this game: away coins waiting to be collected are paid into the purse before a season closes, so they reset with it (the attacker's first finding).
- **M50. Flow control, final: a gear rests only when the board is full.** M43's loose cap of 8 still left a stall "waiting" beside 24 empty cells in the first minutes (one stall may put only 8 loose goods on a 30-cell board), and both the player's and the phone engineer's reviews read that as broken. Measured by the lead on the joined engine (active bot, 2.0 s per action): with the cap, goods lay on 14 to 17 of 34 cells at minute 5 and 25 to 29 of 44 at minute 30; with the rule below, 26 to 29 of 34 and 42 of 44, with no deadlock, "Setting up…" at 0.00 %, and the hour's coins the same or a little higher. The rule:
  1. **There is no loose cap.** A gear's drop, and a good released from a shelf, go to the board while more than `spare` cells are free (`gear.spare` = 2, tuned 1 to 4), whatever the chain. Otherwise the drop goes to the shelf, and with the shelf full the gear waits. So a "waiting" pip always stands beside a full board.
  2. **A freed cell goes to the shelf of the stall with the fewest loose goods on the board** (tiers b and b + 1); ties go to the higher chain. This replaces M22's "highest chain first": the stall whose goods the player uses up is the one that is refilled.
  3. Gift goods and goods returned by "Not tonight" may take any free cell: the spare cells are the hand's.
  4. Bound (c) stays as M43 wrote it (the board counted after every possible merge). "The board is full" means free cells ≤ `spare` wherever a measure or a screen says so. The aim "the two highest gears wait at most 25 %" is dropped: with three or more stalls the gears drop more than a hand can merge, so they must wait; what is promised instead is point 1.
  5. The advice names a shutter only while some shelf holds goods (the board is short of room); a shutter is never the goal while cells stand empty.
- **M51. Only the player's own merges and the gears' drops raise a chain's best tier.** A good that arrives from a gift box, a shutter or the season's opening board stamps the Ladder Book but does not raise `best_c`. (Gift goods carried over a season close, M36, were raising the new season's best tier to 6 or 7 on its first minute, so the first tickets of Summer asked for goods worth thirty drops each.)
