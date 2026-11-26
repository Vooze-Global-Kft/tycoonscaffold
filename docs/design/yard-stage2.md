# Scrapyard stage 2: the works, buildable

Status: version 2, 26 November 2026. Version 1 (step `s2-unify`) made the two writers' parts one document. Version 2 (steps `s2-revise-rules` for sections 1, 2 and 11, and its twin for sections 3 to 10) writes in the lead's rulings on the four critics' 78 findings (`stage2/critics-ruled.json`, cited here by finding id: B builder, E economy, P player and store, T trade and words), the lead's answers to version 1's seventeen points (`stage2/LEAD.md`, cited L1 to L17) and the engine step's rulings (`notes/engine2-LEAD.md`, cited G1 to G3, I1 to I6, H1, D1; `RULING2.md` section 12). Not yet built, except the engine step, which is at work (`src/engine/salvage/group.ts`; its account of the rule as built is not yet written: 11.3, point N1).

**Authority**, highest first: `RULING2.md` sections 1 to 13 (also `yard-decisions.md` part 6; its later sections change its earlier ones: section 11 replaces 9.8, 10.1 and 10.2; section 12 is `notes/engine2-LEAD.md`; section 13 sums up the rulings on this document's critics, whose full rulings are `stage2/critics-ruled.json`, with `stage2/LEAD.md` beside them); the economy E1 to E41 (`yard-decisions.md`; E40 and E41 are the ruling's); section 14 of `yard-design.md` (D1 to D104); the first yard's document `yard-stage1.md` with its section 12; then this text. Where this text differs from one of them, this text is wrong: say so in `requests.md` with the smallest example, and build what outranks it. Names of types, fields, events, actions, refusal keys and card kinds become the contract's **version 3** (`src/engine/salvage/types.ts`): on a NAME the contract is right once it is frozen (9.1), on BEHAVIOUR this text.

**Numbers** live in `src/config/salvage.content.ts`, are written into `games/scrap-yard/game.json` by `scripts/content/build-yard.py`, and are named here by key with a first value marked (tune), or (fixed) where the ruling fixes it. The bots set every tuned value on the real rules (8.2); the content file is right where it has moved. A figure marked (estimate) is arithmetic for scale, not a value.

**Conventions** (as the first yard's): § scrip, the currency (register id `currency`); m a metre on the ground plane (x east, y south); integer grams and hundredths in the rules, one rounding function `roundMoney`; p̄ a grade's usual price (`grades.<id>.pbar`); "the boss" the player's worker; "yard seconds" the rules' clock `salvage.t`; τ_r the payback time of rung r in production hours; I the rated income (2.3); "a day's income" I × the twice-a-day habit's production hours (12.3 h at rung 3, 16.3 at 4, 20.3 at 5; ruling 10.6). Invented names are register ids in braces ({partner.garage} is Parfitt's Garage; `scripts/content/yard/names.json`), or placeholders in square brackets until the names desk registers them (5.4); code reads ids, never a literal name. The game's store title is the register's `title`.

**The owner has not yet said whether stage 1's look is right.** Sections 1, 2, 5 (except the words' layout) and 8.1 to 8.3 do not depend on the look and are built first. Section 3's positions are built in Phase B too, because they set the walks, the grouped runs and I; only their drawing waits. Sections 4, 6 and 7 wait for the stop of 9.3 (P19).

---

## 1. The works

### 1.1 The stage in five sentences

1. At 27.5 t supplied the crane hangs the third sign, the padlock on the back field's gateway drops, works plots appear in the south yard by the tipping floor, and a canopy goes up by the gate with an old cast-iron bath beside it: the "Yard sale", where the public, kept inside a railed bay by the gate, buys single things fit for reuse and pays at the rack.
2. The player buys works plates that a flatbed sets down and the boss starts up by standing at them: by the tipping floor a baler, a shear, a granulator, a depollution bay and a magnet crane, an analyser at the scale house that names stainless and bronze, and in the back field the shredder line, two furnace halls and the lead line.
3. A three-axle hook-lift crosses the bridge on Cinder Lane to {partner.garage} and {partner.plumbing}, whose loads bring cars to depollute (never tipped: a car comes on the hook-lift's flatrack to its own pad), car batteries in a closed battery box, bronze bushings and stainless sinks; delivered lots ("oversize pieces" in player text) and the crate ("the picking table") keep the boss's own hand worth more than a manager's taps.
4. From rung 3 [bank]'s plant-finance desk lends on a plate that earns and takes a fifth of every sale until it is repaid, with no date; from rung 4 the shredder line, the rotary and induction halls and the lead line make shred, sorted non-ferrous and ingots under bag-house filters.
5. From the second session (the first away card from an absence of at least 30 minutes has been closed: one stored moment, 2.15.2) a shop on the office's first tab sells looks and No ad videos (never to a player who gave an age under 13) and, from rung 4 where the store account's country allows and the player is 18 or over, scrip packs worth some hours of the yard's own rated income; rewarded ads, from the same moment, pay what their buttons show; the stage ends at rung 5, 10,000 t supplied in nine metals.

### 1.2 What the player has at the start

Two players start stage 2. **A new player** plays the first hour as built and measured (stage 1 unchanged; grouping starts at rung 3, 2.1.1; no shop, ad or money prompt can appear in it, 2.15.2) and reaches rung 3 at about minute 57 (REPORT6: median 57:08, 14 of 15 seeds in 55 to 65). **A first-yard save** (the owner's phone) is carried forward by 2.20 and starts stage 2 at its next sitting with everything it owns. After three days twice a day it may hold §115k to §355k, more than most rung-3 plates cost, so the lender's letter (a plate dearer than the cash in hand, 2.14.5) may not come to it soon: the development rows "Start at rung 3" (REPORT6's entry: §3,001 in hand, the bath standing) and "Start at rung 4", each in its own save slot, and "Back to my yard" (2.15.6) let the owner see the stage without touching his yard, and he is told in one line that "Start at rung 3" is the row that shows the bank loan (P3).

REPORT6 at the hour's end (normal hand, goal habit, medians): 29.9 t supplied, rank 21 of 26, cash §3,001, R 82.1 t/h, six materials (light iron, cast iron, steel, aluminium, brass, copper). Owned: the three tools and three carriers, yard hands, a cutter, a driver, the hook-lift truck, both strippers, the motor bench, the crucible. Sales at minutes 55 to 60: §1,757 a minute. After three days twice a day: rank 13 to 14, cash §115k to §355k, levels 13 to 17 of 20. Six hours away from minute 60 (seed 257): §444,734 of sales, 232 loads bought, 646 ms of node CPU (727 ms in the engine step's own measurement). Of stage 2 the yard holds only the padlocked gateway to the back field.

### 1.3 The storyboard, rung 3 to rung 5

The habit is the bots' twice a day (a first hour, then 15 minutes every 11.75 h; `yard-bots.md` F6); "S2" is the second sitting, about 12 h in, and the first after an absence of at least 30 minutes, so the second session of 2.15.2 begins when its away card is closed. Times are aims until the bots measure them (8.2).

| # | When (aim) | What arrives | The hand | What the player first sees and decides |
|---|---|---|---|---|
| 1 | 0:57, rung 3 | The third sign; the gateway's padlock drops; the works plots by the tipping floor; the canopy, the railed public bay and the bath by the gate | — | Goal "Put the bath on the Yard sale"; the bath's tag "Reusable · §261 at the gate · §105 as scrap"; the plots show their plates and prices |
| 2 | 0:58 to 1:02 | The first visitor, `reuse.firstVisitor_s` (30 s) after the bath is racked (2.12) | lifts the bath whole on the trolley (110 kg) into the Yard sale's chalk zone | Chip "Sold at the gate · §261"; goal "Buy the baler" |
| 3 | S2, day 0.5 | The away card's new lines; when it is closed, the shop's row on the office's first tab; rung 3's sign style | — | The shop exists, nothing presses for it; "Buy the baler" |
| 4 | S2 | The baler on a flatbed | stands 5 s at it: "Commissioned · Baler" | Goal "Start up the baler"; the process board's Yard row lights; bales at §0.62 against §0.50 loose |
| 5 | S2 to S3 | The lender's letter, once, at the first financeable plate whose price exceeds the cash in hand (2.14.5; L1) | — | "Bank loan" beside "Save up (about x)": the player chooses |
| 6 | S2 to S4 | The analyser; the three-axle truck; the bridge partners' trial loads; the first oversize piece (a delivered lot); the picking table (the crate) | cuts the oversize piece (4 to 10 s); sorts the picking table one thing at a time (3 s a thing) | Stainless and bronze light; range 8 within reach |
| 7 | S4 to S6, day 2 to 3, rung 4 | The fourth sign; the shredder line, two halls, the lead line; scrip packs where the switch is on (the age question first) | starts up each plate; walks into the back field | The rotary hall's first pour waits for the boss; light iron goes to the baler or the shredder |
| 8 | S9 to S12, day 4 to 6, rung 5 | "{homeYard} · 10,000 t supplied"; lead ingot is the ninth metal | — | The repeating goal "Level up: {item}" is the whole message: no sign of a later build |

**Beat 5, the first loan** (L1): the baler is priced by the payback rule (2.6.4), about §9,000 (estimate), under the bank's floor of half an hour of I, and is bought with cash. The lender's letter comes with the first plate dearer than the cash in hand that can be financed; the bots' prices decide which (the shear or the depollution bay are expected). Aim: the first "Bank loan" is offered within the first two sittings of rung 3 on at least 12 seeds of 15 (measured as 2.14.7 defines an offer). If no rung-3 plate carries it, `bank.minPrice_h` falls until one does; the letter never waits for rung 4.

**The goal list** (`goals.json` list `stage2`, by id, ≤ 30 characters; the first yard's done grammar plus `at:`, `plate:`, `commissioned:`, `racked:`, `rackSold:`, `lot:`, `crate:`, `analysed:`, `poured:` (by plate: `poured:rotary`, `poured:smelter`), `range:`; partner names by register id; ids stay `lot` and `crate`, player text says "oversize piece" and "picking table", T11): Put the bath on the Yard sale · Buy the baler · Start up the baler · Buy the analyser · Buy the shear · Buy the three-axle truck · Fetch {partner.garage|short}'s first load · Fetch {partner.plumbing|short}'s first load · Cut an oversize piece · Clear the picking table · Buy the depollution bay · Supply 1,000 t (8 metals) · Buy the magnet crane · Walk into the back field · Buy the shredder · Buy the rotary furnace · Pour at the rotary furnace · Buy the induction furnace · Buy the battery breaker · Buy the lead smelter · Pour a lead ingot · Supply 10,000 t (9 metals): 22 goals (P10: the bath first, the back field just before the shredder; T12, P14: the rotary goal by plate, since the first yard's crucible already pours aluminium alloy ingot; T25: "Start up", with "Commissioned" kept on the chip). Then the repeating goal "Buy next: {item}" or "Level up: {item}". No goal names a real-money product or a loan; a goal to buy is done by owning, however it was paid.

### 1.4 What each rung opens

| Rung | Tonnes · range (tune) | Opens |
|---|---|---|
| 3 | 27.5 t · 5 (as built) | The works plots (baler, shear, granulator, depollution bay with its car pad, magnet crane) and the analyser; the back field's gateway; the Yard sale and its sale; plant finance; delivered lots; the crate; the three-axle truck and the bridge partners; the forklift, pallet truck and plasma cutter; plate levels |
| 4 | 1,000 t · 8 | The shredder line, the rotary hall, the induction hall, the lead line; scrip packs where the switch is on; the next away step |
| 5 | 10,000 t · 9 | The last away step; the stage's top: nothing new is sold, levels and plates continue to the ceiling |

---

## 2. The rules

Pure TypeScript in `src/engine/salvage/`, deterministic, one `advance` for a tick, a jump and time away. The order below is the order of building. 2.1 to 2.4 are the engine step that opens the stage (ruling 10.4; E36(a)): built, benched and measured before any later rule, and nothing in them depends on the look.

### 2.1 The engine step: crew trips grouped out of sight (ruling 10.4, D87; as ruled in G1 to G3)

The engine step is at work (`src/engine/salvage/group.ts`, `crew.ts`, `truck.ts`, `round.ts`, `hand.ts`; its design `notes/engine2-group.md`). Its account of the rule as built (`notes/engine2-engine2-group.md`) is not yet written: this section is written to the lead's G1 to G3 and to what the step has already reported (`requests.md`, `[engine2-group]` lines), and is replaced by the builder's sentences where the built rule differs and keeps G1 to G3 (11.3, point N1).

**2.1.1 The rule.** From rung `group.fromRung` (3), a crew member whose next work starts with NO BOSS WITHIN SIGHT does a RUN: the legs he would walk are planned at that departure, all that the run takes is claimed then, and the run has ONE dated end (`CrewMember.run`, `CrewRun {t0, end, start, k, legS, dest?, loads?, cuts?}`). "Within sight": the boss is fresh (`bossFresh`) and within `reach.sight` (10 m) of the work's start point, its source or its destination (`group.ts bossSees`). The decision is made at the departure, as the cutter's whole-thing rule already is (E17). A tick, a jump and time away call the same function. Below rung 3 nothing changes: the hour the owner played stays as measured (L16: the bots try grouping from rung 1 the next time the first hour is measured, and the lead decides).

**What is promised** (G1): (a) a tick equals a jump, exactly, with grouping on: for the SAME presence state (the same presence samples, or none), ticking, one jump and many jumps give the same state; (b) the same function runs present and away. It is NOT promised that a yard with the boss present but out of sight equals the same yard with the boss away: the first yard's rules make them differ on purpose, and these differences are the rule (B3):
1. While the boss is in the yard, yard hands carry pieces only; whole things that need no cutting (tier 0) are cleared from the tipping floor only when he is away or the floor is over half full (E35, `crew.ts FLOOR_CLEAR_SHARE`).
2. The foreman's boost runs only live (`clock.ts boostOn`); the hand stripper works only with the boss (`machines.ts`).
3. Hold's release (2.2) fires only when the boss is not fresh.
A tagged thing is no longer a difference: its owner is decided by sight, present and away alike (2.12, E4, B15).

**Opening a run** (G3; the step built opening, `hand.ts bossStep`, and its tests show it exact, so it is kept). A run is opened when a fresh boss comes within sight of its start, source or destination (checked at every instant of live play and at every presence sample), and the truck's planned trip and the merchant's long round likewise: the loads, cuts or phases whose planned end is at or before that second land then, in order; the leg under way continues as one ordinary leg with its planned times; the rest of the plan is released and its claims cleared. Presence is the only opener: no action touches what a run has claimed. G3 allowed the other way (the frame shows a pure function of the run's dates and the rules leave the run closed); it is not built.

**What the frame sees.** At the end of every advance a running member's shown fields (`phase`, `from`, `to`, `t0`, `t1`) are set to the leg of his plan under way at that second, a pure function of the plan and the clock; nothing decides from them, and the queue reads the run's end. Two things the frame cannot read from those fields (`requests.md`, `[engine2-group]` to the screens): a yard hand walking back on a run has `load` empty (his pieces stay claimed on their pile until the run lands), so the barrow is drawn loaded when `run && phase === 'walkBack'` (grade in `carries`); the truck on a planned trip (`truck.trip.plan`) has `skip` null until it lands, so a full skip is drawn from phase `back` on.

**2.1.2 What is grouped.** A yard hand's run lasts at most `group.handRun_s` (30 s, tune) and a cutter's at most `group.cutRun_s` (120 s, tune); the first trip or thing always goes, however long; a content `group.maxRun_s`, if given, caps both. (The draft's one `maxRun_s` of 300 s cost about a tenth of six hours' sales on five played minute-60 yards, because the floor's room binds and a long run holds a hand's pieces and his trips' order; 30 s and 120 s kept the five yards within 1 % on average: the step's measurement, `group.ts GROUP_DEFAULT`, to be confirmed by its account.)
- **Yard hand**: the first trip is chosen exactly as today (S12's order, E35, E4); more trips of the same kind, from the same source to the same destination, are added by the same in-place choice while the run stays within `handRun_s` and a next load waits. Each load keeps its own pick and drop times (`RunLoad {claims, spot, grade, pickAt, dropAt}`); at the run's end each load is picked and delivered in order: one weigh-in per load, each rounded as its own and its ticket dated at its own drop time, or one feed (a feed run fills at most the hopper's room at departure).
- **Cutter**: the first thing as today; more things at the same place in the same score order while walks and whole cuts stay within `cutRun_s` (`RunCut {thing, walkEnd, cutEnd}`); at the end every thing is cut whole, its pieces on the place's pile in cut order.
- **Driver** (the truck's): the seven phases of a trip are planned at departure (`truck.trip.plan`, `TripPlan {t0, ends, x, y}`); one dated end; at it the phases land at their planned times in order: the hook is paid (earmarked since departure) and the empty skip set down dated at the hook's time, the bridge ticket dated at the weigh's end, the load tipped, the truck parked.
- **The merchant**: a round that leaves with no boss within sight of its stand is away max(`merchant.round_s`, `group.roundAway_s` 120 s, tune 60 to 300).
- **Rate machines** (the first yard's and 2.7 to 2.8's): a piece started with no boss in sight takes every hopper piece of its input grade into one segment, credited by the cumulative rule over their summed grams; a back-field plate drawing from a bay (2.8.1) runs in segments that end only at the events of 2.8.1 (L8).
- **The magnet crane** (2.7): moves started out of sight are one run of moves (`WorksState.move`, 2.18).
- Not grouped: the drop-off, skips filling, visitors, the van, lots and the crate (each one event already).

What grouping changes against the first yard's leg-by-leg engine, and is the rule: a run's work becomes visible to others at its end (cash, supplied and the bays move in steps of a run); a run takes what waits at its departure (pieces cut during it, a level bought during it, apply from the next run); a skip a grouped hook sets down is dated at the hook's planned time, and if it would already be full when the trip lands it is full at the landing; a feed run whose hopper is fuller on landing than planned weighs the rest in at once.

**The bound on what grouping may change** (G2): with grouping switched off in the content (`group.fromRung` above the top rung) and on, the bots' three days at the twice-a-day habit give supplied tonnes and cash within 2 % of each other at day 1 and at day 3 on at least 13 of 15 seeds, and no crew trip is lost (mass delivered by crew over a day equal within one run). Below `group.fromRung` nothing changes at all: the first hour's tables reproduce exactly.

**2.1.3 The bench.** `npx tsx scripts/content/yard-bot.ts --bench away` prints node CPU and the count of events by kind for six hours away from the played minute-60 yard of seed 257 (`yard-bots.md` G) and from a played rung-5 yard, each twice: grouping on, and grouping off (`group.fromRung` 99), with the sales, supplied tonnes and loads of both (B13). **Gate**: the minute-60 yard, grouping on, ≤ 150 ms. The rung-5 yard: reported, aim ≤ 400 ms; a tick ≤ 1 ms at rung 5. For scale: 232 loads were about 1,600 driver phases; grouped they are 232 ends. If the gate misses, the engineer reports the largest remaining kind of event with its count; no other grouping is added without the lead (L8).

**2.1.4 Tests** (`tickjump.test.ts`, `group.test.ts`, frozen content). Tick equals jump minute by minute across grouped runs; for one presence state (the same samples, or none) ticking, one jump and many jumps give the same state, with runs open and runs opened by the boss's approach (G1); a run opened by the boss's approach lands what its plan had landed by then and nothing more; no run exceeds its limit unless it is one trip; a claimed piece is delivered once; mass is kept; a save taken mid-run reloads and goes on as the unsaved yard; a broken saved run is dropped, its member idle and its claims released; at rung 2 the frozen states advance exactly as before. **Grouping against legs** (B13): `r3` is advanced six hours away twice, with `group.fromRung` 3 and 99: sales, supplied and loads within 3 % of each other, and every gram conserved in both. The version-1 test "a live advance with a fresh boss out of sight equals the away pass" is withdrawn (G1; `group.test.ts` holds it today: engine2 removes it).

### 2.2 Hold never stops the yard (E40, ruling 10.5, D88; H1)

At a driver's departure check (2.14 of the first yard, step 5), when the boss is not fresh, a driver is idle with a full skip waiting, cash above the earmarks is below that skip's price, and the merchant waits with nothing collectable, the held bay worth most at today's price leaves Hold and the round loads it at once: one bay a check. Event `holdReleased {grade}`; the away card's line "Sold from hold to keep the yard running: {grade}" is printed only when a bay was sold from hold (H1). Grams set aside by Sell are already sold and are not touched; a bay's reserve for a station (2.8.1) is not held and is not released.

Worked example (`yard-bots.md` C5, seed 1): at the end of sitting 2 every one of 14 bays was held and cash was §524; the next 11.75 h away paid §0. Under E40 the first check releases the bay worth most, the round pays it, and while cash stays under the farm's §958 skip the next check releases the next. Test: from that state (`held14`) an absence pays more than §0 and lists the bays released, one a check, the most valuable first.

### 2.3 Rated income, I, from assets (rulings 2.1, 10.6, 12; I1 to I6; D27)

**2.3.1 The measure** (fixed in form). `ratedIncome(c, s)`, § an hour, NET (I1, L2): what the yard keeps in an hour with its present assets, no boss, at usual prices (p̄): lot payments less what the driver pays for loads. It is the steady state of 2.1's grouped engine in closed form over the same rate functions:
1. **Feed**, kg/s by thing (I3): the drop-off's arrivals over its period, and the partners' loads by I2: **loads an hour = min(Σ over open partners of 3,600 × L_p ÷ `fill_s`_p, 3,600 × trucks ÷ t̄_trip)**, where t̄_trip is the planned round trip weighted by the mix of partners served, the same planned time the driver's run uses (2.1.2: walk, out, hook, back, weigh, tip, park), and the trucks' loads are given to partners by net margin a load, best first (E1, I2). Each load brings its things and its reusable batch.
2. **Steps**, each a capacity over the share of feed mass that needs it: cutting (the cutters' power over the mix's hardness, plus the shear); carrying (yard hands, plus the magnet crane on ferrous within its reach); each plate's rate on what it takes.
3. **R_bind** = min(Σ feed kg/s, min over steps of capacity ÷ that share) (B12): capacity of hands, cutters and machines beyond the feed adds nothing to I (I3).
4. **m̄** = the value at p̄ of what a kilogram of feed becomes with the plates owned, less the label price of bought feed a kilogram, less reagents a kilogram (E3). I never reads a switch the player can flip (I4, E2, T26; it replaces ruling 10.6's "lowest margin"): not routes, recipes, Hold or "Take from bays" as set. It assigns each flow of material to the owned plates' capacity by margin a kilogram, best first, in one greedy pass, and sells the rest as weighed.
5. **I** = I₀ + the Yard sale's premium + the van's premium, where I₀ = 3,600 × R_bind × m̄, the Yard sale's premium is 0.6 of what the rack's ceiling lets it pay an hour (min(the reusable flow's gate value, `reuse.shareI` × I₀); the other 0.4 is the scrap value already in m̄) and the van's is a third of what it pays an hour (E3). Both read I₀, never I, so nothing is circular.

It is 0 before the first yard hand. The built `ratedOf` counts the whole truck once per partner: it keeps its form for the capacity ceilings only, and is not I (I2). The built `incomeRate` (a moving average of sales) stays for what reads it today; nothing new reads it (I6). **Who writes what** (E12): engine2 writes `ratedIncome` in `rate.ts` with the first yard's terms (Phase A); rules-works writes the plates' terms (each plate's capacity and margin a kilogram, from 2.5.3's data) and asks engine2 for their call in `rate.ts` (a line in `requests.md`).

**2.3.2 Read at each read; frozen only where stored** (B11). A card's numbers (a plate's terms, "Save up", a loan's terms, a pack's quote before Buy) are computed from the state at each read: I moves only when assets do. An action that acts on a number the player was shown carries it and is refused when it differs (`signFinance(plate, shown)` with `bankTerms`, as `buy` with `priceUpdated`). Frozen are only the values stored: a pending quote (`iap.pending`), a lot's mass (fixed on arrival), an agreement's `I`, and the away bonus offer (`ads.awayOffer {amount, I}`).

**2.3.3 Gate** (fixed in form; I5, E3). The value I is held against is measured by the bots with usual prices every day (`board.a` 0 for the gate runs): G = (net cash gained + what the bank took + the value at p̄ of unsold stock at the end − at the start) ÷ hours the yard ran. I is within 0.9 to 1.1 of G on 13 of 15 seeds: in Phase A at rung 3's entry and at the end of three days of the first yard's content (I5); after Phase B also at the last purchase of rung 3 and at the entry and last purchase of rungs 4 and 5 (ruling 10.6, E12). The table is printed; a miss names which term is off and by how much.

**2.3.4 The figure to check first** (L2). The design's §54,500 an hour at rung 3's entry is the Night watch's worth (C9: §106k for two hours), which is sales. The bench's six hours (§444,734 of sales, 232 loads) give about §74,000 of sales an hour; at label prices of §958 and §1,842 the loads cost roughly §250k to §330k, so net I may be §20k to §30k an hour (estimate). Every hour-priced number follows I (packs, the bank's limit, ads, lots, the Yard sale's ceiling): the bots measure I before any of them is tuned, and the worked examples are recomputed when they have. Until then the worked examples of this document keep the ruling's figure (§54,500) so that they can be checked against it (L17).

### 2.4 The driver's level (E36(a); D1)

Measured on the first hour and three days with 2.1 in place: `crew.driver.lev` 0.15 → 0.25 (tune), with E31a (a level shortens the whole round, hooking and tipping too) as built. Aim (E31c): sales at minutes 55 to 60 ≥ §2,000 a minute for the normal hand (today §1,757), with rung 3 still at 55 to 65 minutes and every first-yard beat in band. A change of the level alters the first hour; it is measured on all of REPORT6's beats before it is accepted.

A second truck is not built in this stage (D1): if the level misses the aim, the engine step reports what a second truck would need (its price by the payback rule, a second driver's slot, the weighbridge and tipping floor serving one truck at a time, a second parking stop, and the minute-55-to-60 sales it would give), and the lead decides. Nothing in this document's state, map or screens carries `truck2` until then.

### 2.5 Materials and grades added; plates as data

**2.5.1 Grades** (`grades.<id>`; p̄ § a kilogram, tune; `asFound` the share of the prepared value a grade fetches in an unprepared mixed load (E3, E5), tune, set by check 5.2 (8) per load; "—" where the grade is only ever made in the yard; names in `text.json` as name ≤ 18 / short ≤ 15 / long, T10; "inference" where the research gives no figure):

| Id | Name · short | p̄ | asFound | Family · material · kind | Bay drawn in |
|---|---|---|---|---|---|
| `lib` | Baled light iron · Iron bales | 0.62 | — | fe · lightiron · grade | works bunker |
| `ss` | Stainless 304 · 304 solids | 4.80 | — | nf · stainless · grade | works bunker, covered |
| `ssu` | Mixed stainless · Mixed stainless | 2.90 (inference) | 0.70 | nf · stainless · grade | works bunker |
| `bzs` | Bronze solids · Bronze | 29.00 | 0.75 | nf · bronze · grade | works bunker, covered |
| `bzi` | Bronze ingot · Bronze ingot | 42.00 | — | nf · bronze · product | works stillage |
| `bzd` | Bronze dross · Bronze dross | 3.00 (inference) | — | nf · bronze · grade | works stillage |
| `pbb` | Lead batteries · Batteries | 1.80 | 0.75 | nf · null · intermediate | battery box (closed) |
| `pbp` | Paste and grids · Paste, grids | 3.10 (inference; T2) | — | nf · null · intermediate | works bunker, covered |
| `pbi` | Lead ingot · Lead ingot | 5.40 | — | nf · lead · product | works stillage |
| `pp` | Plastic chips · PP chips | 0.90 | — | nf · null · grade | works bunker |
| `shred` | Shredded steel · Shred | 1.26 | — | fe · steel · grade | works bunker |
| `zorba` | Zorba · Zorba | 4.10 (inference; T4) | — | nf · null · intermediate | works bunker |
| `twitch` | Twitch · Twitch | 4.70 (inference; T4) | — | nf · aluminium · grade | works bunker, covered |
| `znh` | Mixed heavies · Heavies | 1.50 (inference) | — | nf · null · grade | works bunker |
| `cug` | Copper granules · Granules | 34.80 (inference) | — | nf · copper · grade | works bunker |
| `dust` | Zinc filter dust · Zinc dust | 0.40 | — | nf · null · grade | big bags on a pallet in the stillage row, under a roof (`bays.dust.kind` `bags`; T3) |

Sixteen grades. The end-of-life car `elv` is an object (a whole thing), not a grade. Nine metals by the stage's end: the first yard's six materials and stainless, bronze, lead. Lead counts only as `pbi` (batteries and paste are intermediates: they count as tonnes supplied when sold, and give no range). Each new grade has a bay (`bays.<id>`, capacity in kg) drawn at a place of `map.works` (3.3); `pbb` stands in the closed battery box, never a heap and never on the floor; "covered" marks the bays a hall is charged from (2.8, T5). The order wheels > twitch > zorba holds (`alw` 5.60 > 4.70 > 4.10), a content check (5.2). The long names (T10): `ss` "304 stainless solids (18 % chromium, 8 % nickel), sorted by analyser"; `ssu` "Stainless not yet sorted by grade"; `pbb` "Whole lead-acid batteries, in a closed box"; `pbp` "Lead paste and grids from broken batteries"; `pp` "Polypropylene chips from battery cases"; `zorba` "Shredded mixed non-ferrous metal"; `twitch` "Shredded aluminium from the sorter"; `dust` "Zinc oxide dust from the brass filter".

**2.5.2 The analyser's grades.** A piece spec may carry an assay grade: `[grade, g, n, sprite, assay?]`. With the analyser owned and commissioned, a piece weighs in at its `assay` grade, else at `grade`, whatever its age (a piece cut before the analyser arrived is assayed at its weigh-in too; B16): the washer's stainless drum (`li` → `ss`), a sink (`ssu` → `ss`), a bronze valve (`brs` → `bzs`). The weigh-in line carries the note "Analysed".

**2.5.3 Plates as data** (`works.plates.<id>`, validated by `schema.salvage.ts`):
`{ row, slot, plot, gate, needs, price, deliver_s, kind: 'rate' | 'batch' | 'station' | 'assay' | 'handling', in: GradeId[] | ObjectId[], feedBy: 'hands' | 'bays' | 'stream', out: Record<GradeId | ObjectId, [GradeId, share][]>, waste: Record<GradeId | ObjectId, [to, share][]>, reagents: [id, kg_per_kg, price_kg][], rate_kg_s | batch {kg, s, start_share, start_idle}, recipes?, feeds?, lev, maxLevel, inbuf, tray, financeable }`.
`out` and `waste` are given **per input** (E7: the shredder makes no non-ferrous out of light iron); a plate with one input gives one entry. `feedBy` says how input arrives (2.7, 2.8.1); `feeds` names the plate a share goes to directly (a line's conveyor); `financeable` is derived (true when `out` holds a sellable grade). **Mass is conserved**: for each input, Σ out + Σ waste = 1 + Σ reagents, as shares of input mass. Reagents never mint tonnes: a content check refuses a plate whose sellable `out` exceeds 1 for any input (B16; it replaces version 1's runtime cap). **Every plate and every recipe pays** (ruling 13.5, E7, T2): at p̄, after reagents, each input's out is worth at least 1.05 × the input, and each plate's ΔI is above 0 at its planned moment. `build-yard.py --check` refuses a plate that breaks any of these, one whose input no source of its gate brings, a shear or shredder input object with a closed vessel that lacks `certifiedEmpty` (T23), and a `feeds` chain out of order (5.2), naming the plate.

**Stations** (B7). Crew and machine code address the first yard's machines and the plates through one id, `StationId = MachineId | PlateId`, and one accessor `station(s, id): MachineState` over `machines` and `works`; `feed`, `machineState`, `machineOut` and the queue's `machine` kind take a `StationId`; a plate's level is the level target `{kind: 'plate', plate}`. S12's order (which tray and which feed a yard hand serves first) gains the plates: the trays of every station, fullest first; then feeds, the first yard's machines as built, then the plates in `works.plates.*.slot` order after the bench.

### 2.6 Works plates and commissioning; the back field and the process board

**2.6.1 Where plates stand.** From rung 3 the works layer of the map opens (event `backFieldOpen`; 3.1): the yard plates' plots by the tipping floor in the south yard, the analyser's cradle at the scale house, the car pad beside the depollution bay (2.7), and the back field west of the old fence with the plots of the shredder line, the halls and the lead line, each row in its processes' real order (3.3; L9: ruling 7.1's "the back field with the first works plate" reads: the back field opens, and the first works plate stands by the tipping floor). Each plate stands on its own fixed plot (`map.works.places.<id>`).

**2.6.2 Buying.** A plate is a scrip shop item (`shop[] {key, kind: 'works', place: plot, price, gate, needsItem, deliver_s}`) bought on its plot's card or its process-board plate with `buy(item, shownPrice)`, cash only, unless financed (2.14). Its card shows the price, what it takes and makes ("Light iron → Baled light iron · +24 % on light iron"; no absolute tonnes an hour, first yard 12.13), its gate, and on a financeable plate "Bank loan" beside "Save up (about x)" under 2.14.5's conditions. A locked plate shows its gate and nothing else.

**2.6.3 Delivered, installed, commissioned.** Bought, it is `arriving` by the machine flatbed until purchase + `deliver_s`; arrived, it is `installed` and works nothing. It is **commissioned** (player text: started up; the chip keeps "Commissioned · {plate}", T25) when the boss stands within `reach.place` of its plot for `works.commission_s` (5 s), or by itself at arrival + `works.selfCommission_s` (1,200 s), whichever is first (design 3.4: the boss is worth 20 minutes of its output); away, at that date. A hall's first heat waits at "Ready to pour" for the boss (S11) and pours by itself `works.selfCommission_s` after it became ready. A plate that brings a permit adds its line to the rota's licence row when it is commissioned, with no price and no step (T21): the depollution bay "Treatment permit · end-of-life cars", the battery breaker "Permit · lead smelting".

**2.6.4 Levels and prices.** Levels 1 to `works.maxLevel` (10), each +`works.lev` (0.15) of the level-1 rate, priced by the first yard's level rule with its τ capped at τ_r. A plate's price is set by `build-yard.py` by the payback rule: τ_r × the ΔI it adds on the bots' reference yard at its planned moment (`bots/plates.json`, written by the script), at least `works.floor` (§3,000). A plate's level-1 rate is tied to the feed at its planned moment (E13: about the feed it will get there, so that its levels add capacity that binds; version 1's baler had 72 t/h against about 8 t/h of light iron, and its ten levels added nothing yet were priced at full feed).

**2.6.5 The process board** (D16). New rows of enamel plates, joined as a tree, each a tap from its card: **Yard** (Magnet crane · Shear · Baler; Analyser · Depollution bay · Granulator); **Shredder** (Shredder → Eddy current → Sensor sorter); **Melt** (Crucible [first yard] → its recipes; Rotary furnace with its filter; Induction furnace with its filter); **Lead** (Battery breaker → Lead smelter with its filter). Each hall is bought with its filter (one price, one plot), so no furnace runs without one (L3); the first yard's crucible hood is drawn ducted to a small filter housing (art only, T22). The greyed row keeps Lithium · Platinum group and iridium · Tungsten, naming the material only. The board's pages are 4.4.

### 2.7 The yard's plates (south yard; gate rung 3)

Level-1 numbers, all (tune). These plates are fed by yard hands, the magnet crane or the forklift (`feedBy: 'hands'`), and their trays are carried to the platform scale by yard hands, as the first yard's machines (through `station`, 2.5.3).
- **Baler** (rate): `li` → `lib` 1.00; rate set by 2.6.4 against the light iron the yard makes (version 1: 20 kg/s, estimate); inbuf 500 kg, tray 2,000 kg.
- **Shear** (rate): whole things of the torch's tier made of steel (beams, tanks certified empty) and `hmsu` pieces → `hms` 1.00; `shear.P` 15 ÷ hardness kg/s (a beam: 6 kg/s); whole things come by the magnet crane or the forklift, pieces by yard hands. It widens cutting, which binds late in the first yard (C3).
- **Analyser** (assay; its cradle at the scale house, commissioned by standing there): every weigh-in uses 2.5.2; no rate, no tray; not financeable. Drawn, it is never pointed at a person (T6).
- **Granulator** (rate): `tcab` → `cug` 0.35, waste 0.65 plastic fluff to a licensed waste carrier; 0.14 kg/s.
- **Depollution bay** (station; T1, T13): one `elv` at a time on its apron, set there by the forklift from the car pad (2.9); a car is never tipped and never lifted by the magnet before it is drained. 600 s a car (`depollution.s`); out whole: a `pbb` battery (into the battery box), four `alw` wheels, a `tcab` loom, the converter (source `{type: 'partner', partner: 'partner.garage', ref}`; a test refuses any other), the drained shell `cbody` weighed whole where it stands (W9); fluids and tyres to a licensed waste carrier in sealed drums; the card row reads "Fluids and gas out · airbags made safe"; the car's ticket note is "Depolluted" and its completion raises the chip "Certificate of destruction issued". A car is drained before anything comes off it; nothing is shown of how.
- **Magnet crane** (handling; stand by the tipping floor): moves whole ferrous things and ferrous pieces from the tipping floor into the hoppers of the shear and the baler, and a drained shell (`cbody`) off the apron, within `crane.reach_m` (9 m) of its stand, at `crane.rate` 50 kg/s, one dated move at a time (`WorksState.move`), a move of at most `crane.load_kg` (1,500 kg) (a run of moves out of sight, 2.1.2). It never lifts a car before depollution, a battery, or anything of copper, brass, bronze, aluminium, lead or stainless (T1, T24). It has no travel: it serves only what its reach holds (3.6 checks it). No output grade: not financeable.

**2.7.1 Routes for a shared input.** Light iron can go to the baler (by yard hands) or, from rung 4, to the shredder (from its bay, 2.8.1); zorba to its bay or the sensor sorter; `tcab` to its bay or the granulator. A route is set on the input's bay card (`setRoute(grade, to)`, to a station id or `'bay'`) and stored in `SalvageState.routes`; yard hands read it at departure, a bay-fed plate reads it at each segment. A bay's default route is I's own allocation (2.3.1 step 4: the owned plate with the best margin a kilogram that has capacity, else `'bay'`; E2), not the plate bought last. I never reads a route as set (I4).

### 2.8 The shredder line and the melt lines (back field; gate rung 4)

**2.8.1 How the back field is fed and emptied** (11.1, decision 3; L10). The back field is 40 to 110 m from the platform scale; no yard hand carries to or from it. Instead:
- **In**: a back-field plate draws its input from the bays (`feedBy: 'bays'`). A rate plate draws from every bay whose route names it, by the cumulative rule at its rate, in the order of its `in` list (B8); a bay's grams are debited eagerly: a bay-fed plate's draw is credited at every instant that reads or writes that bay, as `machines.credit` does. A hall is charged by "Take from bays" by mass, as the crucible is (E6, S11), and refills itself from the bays after each pour while its recipe's grades hold enough; a hall is charged only from covered bays (T5). A bay keeps a reserve for each station that draws from it (`BayState.reserved: Record<StationId, g>`, which replaces the first yard's `forCrucible_g`; the migration maps it to `reserved.crucible`), up to the station's `inbuf`: the round collects only the stock above the reserves, and Sell on the reserved part is refused (`routed`). A grade is reserved by one station at a time: the crucible's "Take from bays" and a hall's recipe refuse a grade routed to another station (`routed`).
- **Out**: a back-field plate's output goes into its grades' bays as it is made, through the plate's own belt weigher (a rate plate by the cumulative rule; a hall at the pour; drawn as the works bunkers and stillages of 3.3). It has no tray and no ticket; a chip "Weighed at the works · {grade}" rises only while the boss can see it.
- **Within a line** (`feedBy: 'stream'`): the eddy current takes the shredder's non-magnetic stream on its conveyor; it has no hopper and no level of its own, and runs at the shredder's stream (B16).
- A segment of a bay-fed plate ends only when a routed bay empties or refills from empty, a route changes, the plate's level changes or a heat starts or ends: so time away costs a few events an hour.

**The shredder line** (a row of three plots in order):
- **Shredder** (hammer mill and drum magnet, rate): takes `cbody`, `appl` and `li` from their bays by route; 8.33 kg/s (30 t/h, set by 2.6.4 against its feed); out per input (E7): `li` → `shred` 0.95, residue 0.05 to a licensed waste carrier; `cbody` and `appl` → `shred` 0.72, the non-magnetic stream 0.28 to the eddy current when owned, else to a licensed waste carrier as shredder residue.
- **Eddy current** (rate; needs the shredder; `feedBy: 'stream'`): out `zorba` 0.286 of the stream (8 % of a car's or appliance's mill input), the rest residue to a licensed waste carrier.
- **Sensor sorter** (rate; needs the eddy current): takes `zorba` by route; out `twitch` 0.70, `no2` 0.03, `brs` 0.04, `znh` 0.08, `ss` 0.05, residue 0.10 to a licensed waste carrier (T4); 1 kg/s. Its sorted value at p̄ is §5.58 a kilogram, +36 % on zorba (a sorter's sorted value is at most 1.5 × its input, a content check).

**The rotary hall** (batch; furnace and filter): 2,000 kg, 2,400 s; recipe `alu` (`alw`, `alcast`, `twitch`) under salt flux (reagent 0.05 kg a kg at §0.30, paid at the heat's start, never by the clock): out `ali` 0.88, `ald` 0.055; salt slag 0.10 and filter dust 0.015 to a licensed waste carrier (the salt-flux filter's dust is never sold; T3). A heat starts when full, or at 40 % after `start_idle` 60 s without feed.

**The induction hall** (batch; furnace and filter): 500 kg, 480 s; recipes `brass` (`brs` → `bri` 0.97, `brd` 0.015, `dust` 0.015) and `bronze` (`bzs` → `bzi` 0.97, `bzd` 0.015, `dust` 0.015): its filter's zinc oxide dust is the one sellable dust (T3); `setRecipe(plate, recipe, confirmHeel)` as the crucible's (a change pours the heel without refilling, S8 of the first yard's 12). For I: the recipes by margin, best first (I4).

**The lead line** (a separate area, marked by a painted line and the sign "Lead area · masks on" at the breaker's door; if the stage runs over it moves to stage 3, `ladder.rungs[5].range` falls to 8 in the cut content, and the no-dead-end test and the bots run again on it, ruling 10.3, D86):
- **Battery breaker** (rate): `pbb` from the battery box → `pp` 0.06, paste and grids `pbp` 0.64; electrolyte 0.30, neutralised with soda ash (reagent 0.05 kg a kg at §0.40), leaves as a salt solution, 0.35, to a licensed waste carrier (T20); 0.28 kg/s (1 t/h). At p̄: §2.02 from §1.80, +12 % (T2).
- **Lead smelter and kettle** (batch; needs the breaker; with its filter): 1,000 kg of `pbp` by "Take from bays", 1,800 s, with coke and iron (reagent 0.06 kg a kg at §0.30, T20): `pbi` 0.94, slag 0.12 to a licensed waste carrier; the filter's lead dust goes back into the next heat (no grade; T3). At p̄: §5.06 from §3.10, +63 %. A battery's lead ends as about 0.60 of its mass in ingot.

No card shows a recipe's concentration, a temperature or the chemistry (L3); every pour is under a hood with a person in face shield and aluminised apron (the boss, else a hall hand drawn with the hall, not a crew role), and in the breaker and the lead smelter hall also a respirator (a half mask; T6).

### 2.9 The bridge partners and the stage's vehicles

**The bridge.** {partner.garage} and {partner.plumbing} stand past the bridge on Cinder Lane (`map.lane.garage_m`, `plumbing_m`, 3.3.3). The bridge's sign reads "Axle limit 10 t" (T9; it answers L13): the yard's two-axle hook-lift puts about 11.5 t on its rear axle and may not cross; the **three-axle hook-lift** (`truckBridge`, vehicle, gate rung 3; about 9 to 9.5 t a rear axle) may, and opens both. It is an upgrade of the yard's one truck (the same `TruckState`, now three-axle, serving every partner; 11.1, decision 8). Each partner has a trial load at a fixed price, then loads in rotation with labels fixed at fill (E3, E20, E26).

**What their loads carry** (E5: built from what the yard's owned plates and tools improve, so that three fifths of a load's margin come from the yard's work, E20, and no load nets a loss with an agreement open, 2.14.7):
- **{partner.garage}** ([garage contact] on the business card): alloy wheels, looms (`tcab`), converters with their source; once the depollution bay is owned, cars (`elv`, "End-of-life car · to be depolluted at your bay"), never a car before; once the battery breaker is owned, whole batteries (`pbb`, 15 kg each); once the induction hall is owned, bronze bushings (`bzs` pieces).
- **{partner.plumbing}** ([plumbing contact]): copper pipe (`no2`), brass fittings, bronze valves (`brs`, assay `bzs`), cast-iron baths and radiators (reusable by tag, 2.12); once the analyser is owned, stainless sinks (`ssu`, assay `ss`).

**How cars and batteries arrive** (T1, ruling 13.4). A car is a load of its own in the garage's rotation (one `elv`, its label fixed at fill), carried on the hook-lift's flatrack body (the yard's car transporter) and set down on the **car pad** (`map.works.places.elvPad`: impermeable concrete with a drain, 3 × 5 m, touching the depollution bay's apron, within the forklift's reach and outside the crane's tip zone; 3.6) instead of being tipped; the forklift then sets it on the apron. Batteries ride in a closed battery box, set down unopened at the battery box, weighed as one weigh-in and put whole into the `pbb` bay. Neither a car nor a battery ever goes to the tipping floor or to the crate.

Label prices k × as found (k 0.85, tune), with 2.5.1's `asFound`; three fifths of a margin from the yard's work (E20).

**Vehicles and tools** (scrip shop items, gate rung 3, payback-priced):
- **Pallet truck** (carrier, 300 kg; the boss's).
- **Forklift** (vehicle; car forks): entered by walking into it, left with "Step out"; carries whole things and pieces up to `forklift.load` 1,500 kg at `forklift.v` 3.5 m/s; puts a load into a south-yard hopper or a car from the car pad onto the depollution apron by standing in its zone; the boss only (no hired forklift driver in this stage). State: `presence.vehicle`, the forklift's parked place and its load (2.18).
- **Plasma cutter** (tool, tier 4, P 60, on every material; B4, T8): it cuts stainless and non-ferrous metal, which the torch cannot. The boss's and every cutter's power is, as built, the highest P among content tools of tier ≤ the yard's tool tier, so at tier 4 the plasma's P 60 comes only by buying it (at tier 3 it would have come free with the torch). No first-yard object needs tier 4; the stage's oversize pieces (2.10.1) of stainless and non-ferrous metal need it. The save clamps the tool tier to the content's highest tier (2.20). A content check: nothing the rung-4 range needs depends on a tool the player cannot own by then.

### 2.10 Delivered lots and the crate (the hand's worth; design 3.4, D4)

In player text a delivered lot is an **oversize piece** and the crate is the **picking table** (T11; the first yard's "lot" is the merchant's weight of one grade); the ids, events and keys stay `lot` and `crate`.

**2.10.1 Delivered lots.** From rung 3, lots are dated in yard seconds, so they ride the away cap as everything else does (E6). `lots.nextAt: number | null` is first set at `backFieldOpen` (never at creation or migration): nextAt = t + `lots.period_s` (10,800 s, tune 7,200 to 14,400). At nextAt, if fewer than `lots.max` (4) wait, a named partner's lorry sets a lot on the oversize pad (`ThingAt {at: 'lot', k}`) and nextAt = max(nextAt, t) + period; when the arrival makes four, nextAt = null (B9). Opening a lot while nextAt is null sets nextAt = t, so one lot comes at that instant and the next is dated t + period: a long absence brings at most four, never a backlog. Its kind is drawn by `hash01(worldSeed, 'lot', n)` among `lots.kinds` whose material has a line the player owns (the analyser counts as stainless's line; 11.1, decision 9) and whose tool tier the yard owns (B4: an oversize piece of stainless or non-ferrous metal needs the plasma cutter, 2.9): a bronze propeller from a named boatyard partner ([boatyard], a placeholder for the names desk; it replaces version 1's ship's bell, a heritage item a yard does not cut, T15), an aluminium engine casing, a crate of bronze bushings, a stainless catering table; else an intermediate sold whole. Its mass is fixed on arrival (`ThingState.g`, B10) so that its value at p̄ once cut is μ × I then, μ = `lots.mu_min` (15 minutes at rung 3, 18 from rung 4; tune 10 to 25); its plate prints partner, thing, mass and "about §x once cut" (T18). Only the boss cuts one ("Only you can cut this · {s} s"): it cuts in `lots.cut_s` 4 to 10 s whatever its mass (each piece stands for a batch, its mass printed). A lot never expires. Worked example: at I = §54,500 an hour a lot at rung 3 is worth §13,625 once cut. At the twice-a-day habit E6's dating gives about half of the design's "8 lots a day": the D4 aim is measured with it.

**2.10.2 The crate** (the picking table). From rung 3, when a load is tipped, each thing goes to the crate at the oversize pad (`ThingAt {at: 'crate'}`) instead of the floor when `hash01(worldSeed, 'crate', uid)` < `crate.share` (0.15, tune 0.10 to 0.20) and the crate holds fewer than `crate.max` (12) things; when it is full, the next things go to the floor as usual. A car and a battery never go to it (2.9). **The boss sorts it one thing at a time** (P11): standing at the pad, he sorts the oldest thing every `crate.sort_s` (3 s, tune; at most 36 s for twelve); each thing is paid as it is sorted, at `crate.u` 1.6 (tune 1.4 to 1.8) × its prepared value at that step's prices (a lot payment, 2.14.4), its mass supplied at its prepared grades, and each adds its line to one ticket "Sorted by hand · {n} things" that closes when he walks off or the crate is empty. What he leaves waits. **Nothing in the crate expires** (P2, ruling 13.3): no hold time, no countdown, no hand-over to the crews; the crate waits for the boss for ever, as lots do. Worked example: the farm's skip (§1,320 prepared) puts about §198 in the crate; sorted, it pays §317, so a few seconds of the boss's sorting gain about §119 a farm load over what crews would make.

Aims (D4), from rung 3: the 45-minutes-a-day habit working the hand earns at least a fifth more than one managing from cards; no mechanism gives over three fifths of the gain.

### 2.11 Rungs 4 and 5, ranges, ceilings, away caps, rivals

- `ladder.topRung` 5 (the first yard's `STAGE_TOP_RUNG` 3 becomes content). `ladder.rungs[4]` {t 1,000, range 8}, `ladder.rungs[5]` {t 10,000, range 9} (first values, L7; the bots reset the ladder, the thresholds and the ceilings; the design's values replace the content's placeholders 150 t · 6 and 800 t · 7). Rungs 6 to 9 show a padlock and their tonnage only.
- **Range per rung**: a material counts toward the range when its supplied value at p̄ reaches θ_r. θ_r = `ladder.theta` (§300) for rungs 1 to 3, as built (the first hour unchanged); from rung 4 θ_r = max(`ladder.theta`, `ladder.thetaShare` 0.01 × T_r × §1,200 a tonne): rung 4 §12,000 (2.5 t of stainless solids, 414 kg of bronze solids), rung 5 §120,000 (22 t of lead ingot, about 37 t of batteries). The content check sets each metal's share of θ_r to what its sources reach inside the rung's span at a person's pace (D14; L6: lead's share of rung 5's threshold is set to what the battery supply reaches).
- **Ceilings**: `ceilings_t_h` [6, 110, 400, 800, 3,500] (tune; E30's guard, about 1.3 × an always-on full spender's capacity on the rung); the schema takes a list of length `ladder.topRung` (B18).
- **τ_r**: `tau_h` [null, null, 9, 22, 45] (tune ± 30 %, with τ_4 > 20 h a fixed lower bound, because pack20's H is fixed at 20 h and check (7) refuses H ≥ τ_4; E11), for plate prices and level caps; the schema takes `(number | null)[]` of length `ladder.topRung`, null for rungs 1 and 2 (B18). From rung 4 the level cap of crew, partner and first-yard machine levels (`levels.tau.cap`, 540 minutes in the first yard) becomes 60 × τ_r minutes, so that those levels do not pay back in 9 h beside plates at 22 to 45 h (E11).
- **Away caps**: `awayCapByRung_h` [0.5, 2, 4, 6, 8]; the Night watch adds `nightWatch_h` 2: 8 h at rung 4 and 10 h at rung 5.
- **Rivals** up to the one passed at rung 5 keep the first yard's formula and guard (E27, S17, D19), their T0 set by the bots: one passed every one or two sittings, no gap over three days.

### 2.12 The reuse rack and its sale ("Yard sale"; rulings 5.1 to 5.6, 10.10 as changed by 13.1; D48 to D53, D93 to D95)

Content `reuse.*`; place id `reuseRack`; in player text "Yard sale", never "the rack" (the tool rack's word).
- **Where**: under a canopy by the gate, new at rung 3; `reuse.slots` 6, +`reuse.levelSlots` 2 a level, `reuse.levels` 3 (the last thing cut). `ThingAt {at: 'rack', slot}`. The public stays in a **railed public bay** at the rack with its own wicket, and pays at a card reader on the canopy post ("Pay here"); the visitors' path runs inside the rail only, never through the working yard, and the map checker keeps it clear of the drive line and the truck's park (T7, ruling 13.4; 3.3, 3.6).
- **What**: single things of `reuse.kinds` (bath, radiator, bicycle, crate of brass taps, stove, gate), reusable when the yard is at rung 3 or above and `hash01(worldSeed, 'reuse', uid)` < `reuse.share` (0.25, tune 0.15 to 0.35): a pure function of the uid and the rung, so no field is saved and nothing below rung 3 is tagged (E4: the measured first hour is unchanged). A bicycle is tagged only when its thing came from a named partner's load (`reuse.kinds.bicycle.fromPartnerOnly`), and its tag adds "Checked" (T15). Never: anything electrical or sealed, cylinders, batteries, converters, car parts, anything with fuel, child safety goods (`reuse.never`, with the tags `fuel` and `childSafety`; a content check, T23). Its plate shows the tag before any choice: "Reusable · §{q} at the gate · §{v} as scrap", at the present step.
- **Who racks it** (one rule, present and away; E4, B15, ruling 13.1, which replaces 10.10's "while the boss is in the yard a tagged thing is his"): a tagged thing is the boss's only while he is within `reach.sight` of it and a slot is free; he lifts it whole instead of cutting it, if his carrier holds it, and walking into the Yard sale's chalk zone sets it on the first free slot (`racked`). Otherwise yard hands rack it, within `crew.hand.load` (80 kg), from the drop-off and the floor, first in S12's order, while a slot is free; when no slot is free, crews cut it as any other, and its tag says so. A tagged thing too heavy for a yard hand (the 110 kg bath) and out of the boss's sight is cut as any other when it stands on the floor; `reuse.firstThing` (the first bath, 2.12 below) stands by the canopy, not on the floor, and waits for the boss.
- **The sale**: one dated field, `reuse.nextAt: number | null`, null until the first thing is ever racked; the queue reads it only while the rack holds a thing (B9). The first thing ever racked dates the first visitor at t + `reuse.firstVisitor_s` (30 s, tune; P10). At nextAt, if the rack holds anything, a member of the public (drawn on foot inside the railed bay: wicket, rack, wicket; the walk is the frame's) takes the oldest thing and pays q = roundMoney(`reuse.factor` 2.5 × v), v its prepared scrap value at the posted price of that step; ticket `rackSale` "Sold at the gate · {thing} · §q"; its mass is supplied at its prepared grades. **The ceiling follows I** (L2, E4): the next visitor is dated nextAt + 3,600 × q ÷ (`reuse.shareI` × I₀), I₀ the rated income before the Yard sale's and the van's terms (2.3.1 step 5) read at that sale, never below `reuse.floorI` (§2,000 an hour, tune) so that a yard without crew still has visitors; `reuse.shareI` by rung, first value 0.025 at rungs 3 to 5, tuned with the van to the 2 to 5 % band. When a thing is racked at t onto an empty rack, nextAt = max(nextAt, t + `reuse.period_s` (240 s)), so emptying and refilling the rack never brings a visitor sooner than its value allows. So the public pays at most `reuse.shareI` × I₀ an hour, whatever stands there, present or away. I is a pure function of assets, so a tick still equals a jump.
- **Batches and the van**: partner loads may carry a reusable batch (radiators in {partnerFarm}'s, gates and railings in {partnerDemolition}'s; the second kind is cut first), printed on the label by thing and kilogram before paying. At the tip it is set down whole at the Yard sale's trade corner (`ThingAt {at: 'corner'}`). `reuse.vanAt: number | null` is null while no van is dated (B9); when a batch reaches an empty corner and no van is dated, [reclamation dealer]'s van is dated t + `reuse.vanPeriod_s` (1,800 s); it takes every batch waiting and pays `reuse.batchFactor` 1.5 × each batch's prepared value at the collection's step; ticket `vanCollection`; then vanAt = null. Both dates are in yard seconds (E6).
- **The first moment**: at rung 3, `reuse.firstThing` (a bath, tagged by content) stands beside the canopy; goal 1 of `stage2` is "Put the bath on the Yard sale" (1.3).

Worked example (first-yard content; I₀ the ruling's §54,500 an hour, so the ceiling is 0.025 × 54,500 = §1,362.50 an hour): the bath (four 27.5 kg pieces of cast iron solids at §0.95) is §104.50 as scrap and §261.25 at the gate; racked as the first thing ever, its visitor comes 30 s later and dates the next at 3,600 × 261.25 ÷ 1,362.50 = 690 s. A radiator: §65.15 and §162.88 (430 s); a crate of taps: §179.20 and §448 (1,184 s). Aims (ruling 5.6): Yard sale and van 2 to 5 % of a day's income at rungs 3 to 5, never over 8 %; a minute of the boss's racking ≥ 1.2 × a minute of his cutting; the same present or away.

### 2.13 Goals and the advice line

**Goals**: 1.3's list, by id, with the first yard's grammar and rules (its 2.10); after the list, the repeating goal.

**The advice line**'s binding rule (first yard 12.17) adds the new stations: uncut tier-3 steel on the floor over `advice.shearKg` (1,500 kg, tune) with the shear owned names a shear level; a plate's hopper (or a bay's reserve for a station) 80 % full names its level; a full skip waiting while the driver is busy names the driver's level (2.4); otherwise as built. **The bank's one sentence**: when the advice line's purchase is a financeable plate that the finance card would offer (2.14.5: P above the cash in hand less the reserve), the letter has been seen and no agreement is open, the line adds "A loan suits a machine that earns." It says nothing else about the bank and never names a real-money product.

**The Trade Book moves to stage 3** (L15: it belongs with the dealers). Nothing of it is built in stage 2: no state, no tab, no event.

### 2.14 Plant finance (ruling 3 as corrected by ruling 11; E37, E41; D38, D104)

**2.14.1 The state.** `SalvageState.bank = {agreement: Agreement | null, letterSeen: boolean, done: {plate, T, signedAt, repaidAt}[]}`; `Agreement = {plate, P, F, c, T, taken, signedAt, I}` (§ in hundredths; `taken` rises from 0 to T).

**2.14.2 What may be financed** (ruling 11.3): a plate with `financeable` true (2.5.3), from rung 3, priced P ≥ `bank.minPrice_h` (0.5) h × I. Nothing else: no tool, carrier, vehicle, crew, level, skip, magnet crane, analyser or look.

**2.14.3 The terms**, computed when the card opens, I frozen there: F_max = min(`bank.maxF_h` 2, `bank.maxF_tau` 0.15 × τ_r) × I; F = min(`bank.maxShare` 0.8 × P, F_max) (the card offers this one figure, D38); deposit d = P − F; charge = roundMoney(`bank.charge` 0.08 × F); T = F + charge. `signFinance(plate, shown)` refuses, in order: `bankOne` (an agreement is open: "One loan at a time. This one is repaid as you sell."); the plate's gate (`rung`, `needsItem`); `bankReserve` (cash − d below the driver's reserve, E19, E29: "Kept for the next load: §x"); `cash`; `ceiling`; `bankTerms` (the terms shown differ from the terms now: "The terms changed. Look again."). Then cash −= d, the plate goes to `arriving`, the agreement is stored, event `financed {plate, F, T}`. Nothing financed is ever taken back.

**2.14.4 Repayment** (ruling 11.1, fixed). From signing, every **lot payment** x the yard receives is split by one function, `bankSplit(x, agreements)`: y = min(roundMoney(`bank.share` 0.2 × x), T − taken); the player is paid x − y through the one `earn`; `taken` += y; event `bankTaken {y, taken, T}`. Lot payments in this stage, a closed list: the round's collection (Sell's set-aside lots included), a supply deal's delivery, the crate's sorted lot, a sale at the gate, the van's collection. Nothing else repays: not cash in hand, ad rewards, bought scrip or the away bonus. No date, nothing grows, no repay button; y comes out of a payment, never out of cash, so cash never goes below zero. At taken = T the agreement closes (`repaid {plate}`, into `done`). A yard that sells nothing repays nothing and owes nothing more. One agreement at a time (`bank.maxAgreements` 1, fixed in stage 2, ruling 11.2); `bankSplit` takes a list oldest first and never more than `bank.share` of a payment in all, so stage 3 adds kinds, not a path.

**2.14.5 What the player sees.** **The lender's letter** (a centred card, once; `letter`): the first time a financeable plate's card opens with P > cash in hand and cash − reserve ≥ d. From then on every financeable works card carries "Bank loan" beside "Save up (about x)", x = (P − cash) ÷ I in hours and minutes (only the time is "about"; every other number is applied as shown). The finance card's lines (rulings 9.7, 11.4): "Price §80,000 · You pay now §16,000 · The bank pays §64,000 · Charge §5,120 · You repay §69,120", then "A fifth of each sale goes to the bank until §69,120 is repaid. No date." (the share in content's words, `bank.shareWords`: "A fifth" at 0.2, its percentage at another value). After signing: a tag and a ring on the plate filling as taken ÷ T; every lot ticket while it is open prints "Paid §x · to the bank §y · to you §z"; the away card "To [bank]: §y"; the office's "Agreements" page (lender, plate, T, repaid, left, the share; the history). A debt never shows in the top bar, the goal card or the advice line; no ad and no shop entry on a card or ticket that shows a debt, and the bottom bar's ad button hides while one is open (D77; 4.1).

**2.14.6 Worked example** (the ruling's figures: rung 3's entry, I §54,500 an hour, τ_3 9 h; the plate stands for any financeable plate at §80,000): P = §80,000 (above 0.5 h × I = §27,250). F_max = min(2, 1.35) × §54,500 = §73,575; F = min(§64,000, §73,575) = §64,000; d = §16,000; charge §5,120; T = §69,120. With §18,000 in hand the card reads "Save up (about 1 h 8 m)". A collection of §620 prints "Paid §620 · to the bank §124 · to you §496". T is repaid after §345,600 of lot payments: about 3 h 17 m at the first yard's played pace (§1,757 a minute), 4.7 h at the bench's away sales (about §74,000 an hour). With it open, {partnerFarm}'s skip (§958, prepared §1,320) nets 1,320 × 0.8 − 958 = +§98, {partnerDemolition}'s (§1,842, §2,689) +§309 (ruling 11.5).

**2.14.7 Tests and aims.** Tests (frozen content): the sum taken equals T exactly; cash never below zero; tick equals jump with an agreement open, across grouped runs and time away; every lot payment of 2.14.4's list is split and nothing else is; a lot of a grade the financed plate never touched is split the same; a second agreement refused; the reserve refusal; `bankTerms` when I or the price moved; ticket lines equal what was applied; with `bank.maxAgreements` raised in test content two agreements together take exactly s, oldest first; an open agreement survives the save. Aims (bots, before the screens, ruling 11.5): with an agreement open no bought load nets a loss at any rung (this sets `bank.share`'s ceiling; content check 5.2 (8)); the first loan repaid within about four hours of the yard's running; a bot that always finances reaches rung 5 at most a tenth sooner than one that never does; by the card's own numbers (finance is better when the plate's ΔI × the "Save up" time exceeds the charge) finance is the better choice on a quarter to a half of the offers.

### 2.15 The shop, products and grants (rulings 2.2 to 2.5, 2.10, 9.1 to 9.6, 10.8, 10.9, 10.13; D28 to D36, D69 to D74, D91, D96, D102)

**2.15.1 The catalogue** (content `iap.products[]`, ids with the game's prefix; prices are the store's, never computed): LOOKS, non-consumable and restored: six yard colours `colour1` to `colour6` ([colour 1] to [colour 6]: trucks, vests, skips), four yard-dressing sets `dressing1` to `dressing4` ([set 1] to [set 4]), the founder's plaque `plaque` (poured in the yard's own crucible, set by the gate), $1.99 to $2.99 each (the owner's); NO AD VIDEOS `skipAds`, $4.99; SCRIP PACKS `pack2`, `pack5`, `pack10`, `pack20`, of the shared consumable kind `hoursOfIncome`, H = 2, 5, 10, 20 hours of I at $1.99, $4.99, $9.99, $19.99 (fixed, ruling 9.1). Sixteen products; no bundle (ruling 9.2). EARNED LOOKS, never sold: the sign style of each rung reached and {foundry}'s plate after its series, chosen free on the same card. Looks change only what the frame draws (`iap.looks` slots `{colour, dressing, plaque, sign}`); no rule reads them.

**2.15.2 Where.** One card, the shop: from a row on the office's first tab (Rota) and a row in Settings; never from the yard, a working card, the Agreements page or a card showing a debt. Both rows appear from the second session (after the first away card is closed), so the first session has no real-money prompt.

**2.15.3 Who sees packs.** A pack's rows show only when all hold: rung ≥ `iap.packsFromRung` 4 (fixed); the country's switch on; the age band 18 or over; packs not hidden in Settings. Otherwise the shop has no row, header or word of packs.
- **The country** is the store account's storefront country as the purchase module reports it, read at every opening of the shop; never the device's language or region or a network address; unknown until it answers, and unknown means off. `iap.packsOff` lists the EEA and Switzerland (fixed at launch).
- **The age question** (a centred card, once): the first time a pack row would show, "What year were you born?", no default, kept as a band only (`ageBand` 'u13' | 't13' | 'a18'); under 18, packs stay hidden on this save.
- **The Settings switch** "Scrip packs: shown / hidden" stands in Settings from the second session wherever the country's switch is on, whatever the rung (so a parent can hide packs before they first show; 11, decision 11). Hiding asks for a four-digit code (kept hashed in the save); showing again asks for it; a forgotten code clears only with a reinstall (a new save, the question again). It is not declared to a store as parental controls.

**2.15.4 The quote** (fixed). When the shop opens, each offered pack's S = roundMoney(H × I), I read then; the row prints "§{S} · about {H} hours of your yard's earnings" (never "ahead", never "best value"). **Headroom**: a pack is offered only while cash + S ≤ U, U the sum over every card of the price of what it sells next (plate, level, hire, vehicle) whose gate is met and that the ceiling allows; otherwise the row reads "Nothing to spend it on yet" with no Buy. If a purchase lands while the shop is open, the row shows "Updated: §a → §b" and asks again (`quoteUpdated`). Buy calls `quotePack(product)`, which stores `pending {product, S, I, at}` (one per product); the pack sheet then says that bought scrip lives in this device's save.

**2.15.5 The grant.** The store's approval reaches the mode through the shared hook `grantProduct(id, txId, quote)`: for a pack whose `txId` is not in the ledger, cash += the pending S exactly, however late the approval (a parent's can take hours), through `money.ts` under its own kind, never the shared time warp; `ledger` += {txId, product, S, at}; event `granted`. A look or No ad videos goes to `iap.owned`. **The reconcile at start** grants only transactions dated after `iap.createdMs` and missing from the ledger, at the S of their pending quote; one without a quote belongs to another save and is not granted. Bought scrip never repays a loan and never counts on a board; nothing sold adds tonnes, range or rank.

**2.15.6 Expo Go.** Buy is simulated: the grant runs with a made-up transaction id and no money is taken. A development row in Settings, compiled only under `__DEV__` and checked absent from every release export, sets the store country (Auto · US · DE · Unknown) and offers "Start at rung 4".

**2.15.7 Built first.** Before any shop screen, the shared files change by one owner (9.1, `store-shared`) with the four other games' tests green: `hoursOfIncome` in the shared product kinds, `grantProduct` in `src/modes/contract.ts`, the pending listener and the reconcile hand-off in `src/services/iap.ts` and `src/state/store.ts`, and a store-only `storefrontCountry()` (no device fallback) beside the shared `detectRegion`, which keeps its fallback for the other games' chest rule (11, decision 12). Tests: the rung-4 gate; the switch's defaults; the country read at every opening and unknown when the module fails; the age band; the code; S granted as frozen after a late approval; no grant twice; the reconcile's after-creation rule; headroom; no real-money button on any working card; every aim met with packs on and off.

### 2.16 Rewarded ads (rulings 2.6, 9.9, 10.7; D32, D77, D85, D89)

Rewarded videos only, through the shared ad service, behind buttons that show what they pay (simulated in Expo Go). State `ads {day, awayUsed, spotUsed, awayOffer: {amount, I} | null}`.
- **The away bonus**: at most `ads.awayPerDay` (1) a market day, after an absence of at least `ads.awayMinAbsence_min` (30), offered on its own small card after the away card is closed, never on it: pays min(`ads.awayShare` 0.5 × the away cash that reached the player after the bank's share, `ads.awayCap_min` 15 minutes of I), as its own line, never a lot payment. "Not now" keeps the offer (`awayOffer`) until it is taken or the next away bonus replaces it; it never shows a time.
- **The spot buyer**: on a held bay's Sell, whose amount is known before the ad: pays min(`ads.spotShare` 0.1 × the Sell's amount, `ads.spotCap_min` minutes of I), the button shows the figure; at most `ads.spotPerDay` (3) a market day. Never offered on an output grade of a plate with an open agreement (ruling 9.9).
- **The day's cap** (fixed): the counts and caps of each rung sum to at most `ads.maxDayShare` 0.04 × a day's income. At rung 3: 0.04 × 12.3 h = 29.52 minutes of I; the ruled 15 + 3 × 5 = 30 would pass it, so `ads.spotCap_min` is 4.8 at rung 3 (15 + 14.4 = 29.4), 5.5 at rung 4 and 6 at rung 5 (11, point L3).
- No ad button on screen while a card or ticket showing a debt is open; rewards never repay and never count on a board; No ad videos grants each reward without the video, same limits. When a video cannot load, nothing is granted and nothing is lost: the offer stands.

### 2.17 Time away in stage 2

The same `advance` with no boss (first yard 2.16), grouped by 2.1; caps by 2.11; Hold by 2.2. Inside it plates work, halls pour after their first pour, the Yard sale and the van sell by their dates, the bank takes its share, lots arrive up to four, the crate goes to the crews at its date, plates commission at their dates. Money once, inside the state. **The away card** adds lines: sales at the gate and by the van; "To [bank]: §y" (and "Repaid in full: {plate}" if it closed); "Sold from hold to keep the yard running: {grade}"; lots waiting ("{n} lots wait for you"); "The crate went to the crews" when it did. It carries no ad and no shop button.

### 2.18 The state, field by field (contract version 3)

`SalvageState.v: 3`. Added:
- `works: Record<PlateId, WorksState>`: `WorksState` = `MachineState` + `phase: 'arriving' | 'installed' | 'running'`, `commissionAt`; batch plates add the crucible's heat fields (`recipe, fromBays, charge_g, chargeBy, heel_g, phase, phaseSince, endsAt, lastFeedAt, firstPoured, cooling`); bay-fed plates add `segStart` and `drawn_g` (the cumulative rule's base). The first yard's `machines` record stays as it is (four machines); every new machine is in `works`.
- `routes: Record<GradeId, PlateId | 'bay'>`.
- `truck2: TruckState | null`.
- `lots {nextAt, n}`, `crate {since}`, `reuse {nextAt, vanAt, level, sold: {day, n, money}}` (lots, the crate's things, racked things and batches are in `things`).
- `bank` (2.14.1); `iap {owned, looks, ledger, pending, hidden: {codeHash} | null, ageBand, createdMs}`; `ads` (2.16); `book` (2.13).
- `CrewMember.run?: CrewRun` (2.1).
- `ThingAt` adds `{at: 'rack', slot}`, `{at: 'corner'}`, `{at: 'crate'}`, `{at: 'lot', k}`, `{at: 'apron', plate}`.

Not in the state: a queue (derived: `nextEvent` adds runs' ends, `works`' dated ends and segment ends, `lots.nextAt`, `reuse.nextAt`, `reuse.vanAt`, the crate's hold date, commissioning dates), a reusable flag (derived from the uid), a debt anywhere but `bank.agreement`.

### 2.19 Events, tickets, refusals and actions the screens need

**Events** (new `SalvageEvent` types): `backFieldOpen`; `plateArrived`, `commissioned {plate, by}`, `plateState`, `plateOut`; `heatStart`, `readyToPour`, `pour` gain a `plate` field; `analysed {grade, from}`; `routeSet`; `lotArrived`, `lotOpened`; `crateIn`, `crateCleared`, `crateToCrew`; `racked`, `rackSold`, `visitor {t0, t1}`, `vanDated`, `vanCollected`; `letter`, `financed`, `bankTaken {y, taken, T}`, `repaid`; `holdReleased {grade}`; `granted`, `quoteUpdated`, `ageAsked`; `adOffered`, `adPaid`; `forklift`; `bookEntry`. The away pass emits only `awayReport`, `passed`, `rung` and `repaid`.

**Tickets**: kinds `rackSale`, `vanCollection`, `crateLot`; every lot ticket gains `bank?: {y}`; weigh-in lines gain the notes `analysed` and `drained`.

**Refusals** (new keys): `bankOne`, `bankReserve`, `bankTerms`, `quoteUpdated`, `packCode`, `rackFull`, `notReusable`, `forkliftLoad`, `noRoute`, `routed`; gates reuse `rung` and `needsItem`; money reuses `cash` and `ceiling`.

**Actions** (new): `signFinance(plate, shown)`, `setRoute(grade, to)`, `setRecipe(plate, recipe, confirmHeel)`, `quotePack(product)`, `grantProduct(id, txId, quote)` (through the mode's hook), `setPacksHidden(on, code)`, `setAgeBand(year)`, `adPaid(kind, ref)`, `chooseLook(slot, id)`. Plates are bought with `buy(item, shownPrice)`. Racking, opening a lot, clearing the crate, commissioning and entering the forklift go through `presence`.

### 2.20 The save and the migration from a first-yard save

Save tag `salvage1`, layout `v: 3`. `reconcileSalvage` accepts layouts 2 and 3 (today it starts afresh on anything but 2, which would wipe the owner's first yard: this is the first test written). A layout-2 save gets `works`, `routes`, `lots`, `crate`, `reuse`, `bank`, `iap`, `ads`, `book` fresh, `truck2` null, empty bays for new grades; things keep their uids (their tags follow from the hash); `iap.createdMs` = the migration's time; `lots.nextAt` = now + period; `book` is filled from `lessonsSeen`. At rung 3 the works layer opens with the bath at the first tick and the `stage2` goals begin. Supplied, worth and rung are kept: a save already past 1,000 t reaches rung 4 the moment its range reaches 8. Tests: the five frozen states of the first yard, saved as layout 2, load into layout 3 with cash, supplied, every stock and every crew member equal; a layout-3 save round-trips; an open agreement and a pending quote survive a save and a reload.

### 2.21 What each rule changes in a first-yard rule (`yard-stage1.md`)

2.1 (the hand): the boss lifts a tagged thing whole (2.12); the forklift is entered by walking. 2.2 (tickets): new kinds, the bank line, analysed grades. 2.3 (Hold, the round): E40 (2.2 here); the round's time away out of sight (2.1.2); routed bays (2.8.1). 2.4 (things): `assay` on piece specs, new objects, tags. 2.5 (machines, board): plates in `works`, new rows and pages. 2.6 (crew): yard hands rack first while away, feed by route, run grouped; cutters grouped; the driver's level (2.4). 2.7 (partners): the bridge partners, the crate's share of a tip, batches on labels. 2.10: the `stage2` goals, new bindings, the bank's one sentence, the Trade Book. 2.11: the top rung in content, θ per rung from rung 4, ceilings and τ to rung 5, plate levels. 2.12 (engine): grouping from rung 3, new dated fields, the bank's split inside `earn`. 2.13: layout 3. 2.15: new actions and refusals. 2.16: caps to 10 h, new lines. E11: amended by E37 and E41. E36 (a) and (c): answered by 2.4 and 2.2.

### 2.22 The numbers the bots set first

The bots set every number below on the real rules, the first three before any other; the lead sets the gates' values from their table (9.2).

| Key | First value | Aim |
|---|---|---|
| `group.maxRun_s`, `group.roundAway_s` | 300 s, 120 s | six hours away from the minute-60 yard ≤ 150 ms; the first hour unchanged |
| I (measured) | the design's §54,500 an hour at rung 3's entry (sales, 2.3.4) | within 0.9 to 1.1 of away net income at the entry and last purchase of rungs 3 to 5 |
| `crew.driver.lev`, or `truck2` | 0.25 | E31c: §2,000 a minute at minutes 55 to 60 |
| plate prices | τ_r × ΔI on the reference yard, ≥ `works.floor` | the next purchase within two sittings; cash ≤ 2 τ_r of income |
| plate rates, shares, reagents (2.7, 2.8) | as written | mass kept; each plate pays back in 0.8 to 1.5 τ_r |
| `works.lev`, `works.maxLevel` | 0.15, 10 | a useful purchase at every sitting to rung 5 |
| `ladder.rungs[4..5]`, `ladder.thetaShare` | 1,000 t · 8; 10,000 t · 9; 0.01 | rung 4 at day 2 to 3, rung 5 at day 4 to 6; no θ beyond the sources at a person's pace; the steel-max bot stalls at rung 4 or 5 |
| `ceilings_t_h[3..4]`, `tau_h[3..4]` | 800, 3,500 t/h; 22 h, 45 h | a ceiling met late if at all; the 20 h pack under τ_4 |
| `awayCapByRung_h[3..4]` | 6, 8 h (+2 Night watch) | 16.3 and 20.3 production hours a day |
| `lots.*`, `crate.*` | 10,800 s, 15 and 18 min; 0.15, 12, 1.6, 43,200 s | the hand earns a fifth more; no mechanism over three fifths |
| `reuse.*` | 0.25, 240 s, §162.88, 2.5, 1.5, 1,800 s | 2 to 5 % of a day at rungs 3 to 5, never over 8 %; racking ≥ 1.2 × cutting a minute |
| `bank.share`, `bank.charge` | 0.20 (0.15 to 0.25), 0.08 (0.05 to 0.12) | 2.14.7 |
| `ads.*` by rung | 15 min; 3 × 4.8, 5.5, 6 min | the sum ≤ 4 % of a day's income |
| the bridge partners' loads, k | 0.85 | E20; enough bronze and lead for θ_4 and θ_5 |

---

## 3. The yard as a map

Metres on the built map's coordinates (x east, y south; back wall `map.north` 15.2, solid to 15.6; south fence 40; east fence 64, the gate on the drive line at y 23.6 to 27.6). Every number is a content key in `map.works.*` (tune); `yard_map.py` is right where a position moves to pass it, and the positions below are first values to be fitted with the checker and LOOKED at (the first yard's map ruling). The positions are built in Phase B (9.2), because they set the walks, the grouped runs and I; only their drawing waits for the stop of 9.3 (P19).

### 3.1 Two layers, one checker

3.1.1 **Two layers.** `map` is the first yard's, unchanged, and the whole map below rung 3 (ruling 5.1). `map.works` is merged over it from the tick of `backFieldOpen`: it adds places, plots, openings and drive-line rects and changes three things of the first layer (3.2). `positions.ts` reads the merged map through one function `mapAt(rung)`; no screen reads a layer.

3.1.2 **The extent.** From rung 3 the yard runs from `map.works.x0` (−56) to 64: the back field is the 56 × 24.4 m west of the old west fence. The back wall runs the whole new width. The camera's clamp takes its west edge from `mapAt(rung)`.

3.1.3 **The checker runs twice**: on the rung-2 map (printing exactly today's table: a test) and on the merged map, where M1 to M7 hold and 3.6 is added.

### 3.2 What changes in the first yard's ground at rung 3

- **The wall gate.** Section 2 of the dividing wall (x 24, y 24.4 to 28.4) is `map.works.wallGate`: solid below rung 3, lifted out at rung 3 (the machine flatbed's crane sets its blocks along the wall's foot at x 25.6, y 30 to 34 as dressing). The opening at x 24 then runs y 22.4 to 28.4 (6 m: the people's 2 m opening merges into it).
- **The field fence.** The old west fence at x 0 stays, with two openings: the works road's (y 23.6 to 27.6) and the field gateway (y 34 to 40). The first yard's padlocked gate (`backfield`, centre 6, 37, solid) becomes the gateway: centre (0, 37), 1 × 6, not solid, sprite `plant.gate.field` frame `open`, its sign on the north post. Walking through it does the goal "Walk into the back field" (`at:backfield`; P10 moves it to just before "Buy the shredder").
- **The works road.** `map.driveLine` gains the rect x −56 to 39.5, y 23.6 to 27.6 (it meets the first yard's corridor at 39.5), the turning place x −56 to −48, y 23.6 to 31.6, and the lay-by x 8 to 16, y 27.6 to 31.6. New stops: `works` (−20, 25.6), the merchant's second stand (3.3.1); `breaker` (−44.5, 25.6), the machine flatbed's stop for the lead line; `turnWest` (−52, 27.6); `southYard` (33, 25.6), the flatbed's stop for the south-yard plots; `park2` (12, 29.6), the second truck's park if 2.4(b) is taken (drawn as a painted bay otherwise).

### 3.3 The places (centre x, y · w × d · solid)

**The south yard** (inside the first fence, south of the drive line, by the tipping floor; the yard plates of 2.7 stand here because carrying is in every grouped run's length and in I: 11, decision 2):

| Place (id) | Centre | Size | Solid | Note |
|---|---|---|---|---|
| Granulator pad (`granulator`) | 26.95, 30.25 | 2.5 × 2.5 | pad | hopper on its east side |
| Shear pad (`shear`) | 32, 31 | 6 × 4 | pad | infeed table east, out chute west |
| Magnet crane stand (`crane`) | 38, 31.5 | 4 × 4 | pad | reach `crane.reach_m` 9 to the nearest edge of the floor, the apron, the shear's and the baler's hoppers |
| Baler pad (`baler`) | 31.5, 36.75 | 5 × 3.5 | pad | hopper north |
| Depollution bay (`depollution`) | 38.75, 37.75 | 5.5 × 4.5 | yes | roofed, against the south fence; drip trays, sealed drums |
| Its apron (`depollution.apron`) | 38.75, 34.75 | 5.5 × 1.5 | no | one `elv` (`ThingAt {at: 'apron', plate: 'depollution'}`), set there by the forklift only |
| ELV pad (`elvPad`) | 42.75, 34.7 | 2.5 × 4.2 (x 41.5 to 44, y 32.6 to 36.8; the trade's 3 × 5 m where the fitted map allows) | no | impermeable concrete with a drain, touching the apron's east end, between the tipping floor and the forklift bay; one car at a time (a second waits on the transporter's next call); an end-of-life car arrives on its wheels or on the partner's car transporter and is set down here (`ThingAt {at: 'elvPad', k}`), never tipped; outside the magnet crane's tip zone, inside the forklift's reach (T1) |
| Forklift bay (`forklift`) | 43.75, 38.35 | 2.5 × 3 | no | where the forklift parks and is entered |
| Oversize pad (`oversize`) | 47, 35 | 6 × 3 | no | oversize pieces (id `lot`) on four 1.5 m squares (x 44.75 and 46.25, y 34.25 and 35.75, `k` 0 to 3); the picking table (id `crate`) at 48.9, 35 (2 × 2) |

The analyser has no plot: it is a hand-held analyser in a cradle at the scale house's window (place `scalehouse`), commissioned by standing at the scale house; its work package draws it as the scale house sprite's frame `analyser`.

**The Yard sale** (by the gate, south of the gatehouse; `reuseRack` is the place id, "Yard sale" its label):

| Place (id) | Centre | Size | Solid | Note |
|---|---|---|---|---|
| The rack (`reuseRack`) | 56, 39.6 | 4 × 0.8 | yes | its back on the south fence; canopy roof drawn over x 53.6 to 58.4, y 36.9 to 40, posts at the rack's ends |
| Chalk zone (`reuseRack.zone`) | 56, 38.3 | 4 × 1.6 | no | walking into it with a tagged thing racks it |
| Slots (`reuseRack.slots`) | along the rack | 6 + 2 a level | — | `positions.ts rackSlot(k)`, 0.5 m apart, front row then back |
| Trade corner (`corner`) | 59, 39 | 2 × 1.6 | no | pallets; batches stand on it, touching the rack (y 38.2 to 39.8) |
| The first bath (`reuse.firstThing`) | 51.6, 38.6 | the bath's | thing | beside the canopy, 1.55 m off the rack, outside the public bay |
| Public bay (`publicBay`) | 58.3, 38.25 | 11.4 × 3.5 | no | x 52.6 to 64, y 36.5 to 40: the only ground the public walks (T7, ruling 13.4); railed on its north and west sides (`publicBay.rail`, solid, 0.1 m), with a sign "Visitors: keep to this area" on the rail; a staff gap of 1.2 m in the north rail at x 53.2 to 54.4 (`publicBay.staff`) by which the boss and yard hands reach the chalk zone |
| Card reader (`reuseRack.pay`) | 58.4, 38.0 | point | — | on the canopy's east post, "Pay here": where a visitor pays and the sale's chip rises |
| Wicket (`wicket`) | 64, 37.9 | 1.2 opening | — | in the east fence, inside the public bay, for the public and the van's crew |

**The back field** (x −56 to 0). North of the works road the plants stand with their backs on the back wall (M2 for the works), in the processes' real order from the field fence westwards: what is shredded first, what is melted next, the lead line last (so that its cut leaves no gap in the middle, ruling 7.2).

| Place (id) | Centre | Size | Solid | Note |
|---|---|---|---|---|
| Shredder house (`shredder`) | −5, 18.6 | 6 × 6 | yes | hammer mill and drum magnet; infeed apron `shredder.apron` (−5, 22.6), 4 × 2, not solid (drawn: the infeed conveyor from the bunkers) |
| Eddy current (`eddy`) | −10, 17.6 | 4 × 4 | yes | touches the shredder (conveyor) |
| Sensor sorter (`sorter`) | −14.5, 17.6 | 5 × 4 | yes | touches the eddy current |
| Rotary hall (`rotary`) | −22.75, 19.1 | 8.5 × 7 | yes | south wall open over its pour apron `rotary.apron` (−22.75, 23.1), 4 × 1 |
| Its filter (`rotary.filter`) | −28.75, 17.6 | 3.5 × 4 | yes | touches the hall |
| Induction hall (`induction`) | −35, 18.6 | 6 × 6 | yes | apron `induction.apron` (−35, 22.6), 3 × 2 |
| Its filter (`induction.filter`) | −39.5, 17.1 | 3 × 3 | yes | touches the hall |
| Battery breaker (`breaker`) | −44.5, 17.6 | 4 × 4 | yes | under a roof, bunded floor |
| Battery box (`batteryBox`) | −45.3, 20.3 | 2.4 × 1.4 | yes | the `pbb` bay: a closed acid-proof box on a bunded floor, never a heap; touches breaker and smelter. Batteries arrive in {partner.garage}'s closed battery box (T1), set down unopened at the platform scale, weighed as one weigh-in and emptied whole into this box: never on the floor, never in a skip's tip, never on the picking table |
| Lead smelter hall (`smelter`) | −50, 18.6 | 7 × 6 | yes | smelter and kettle; apron `smelter.apron` (−50, 22.6), 3 × 2 |
| Its filter (`smelter.filter`) | −54.75, 17.1 | 2.5 × 3 | yes | touches the hall, the wall and the west fence |
| Works bunkers (`worksBays`) | −18.5, 30.6 | 33 × 3 | yes | x −35 to −2: eleven lock-block bunkers of 3 m, 1.4 m high, from the east: shred, lib, zorba, znh, ssu, cug, pp, then under the lean-to pbp, ss, twitch, bzs |
| Lean-to roof (`worksBays.roof`) | −29, 30.6 | 12 × 3.4 | no (a roof) | over x −35 to −23: the covered bunkers that feed a hall (pbp for the smelter, twitch for the rotary, bzs for the induction hall; ss beside them). A hall is charged only from covered bays (T5, ruling 13.4): the works stillages and the first yard's stillage block (x 34.1 to 43.1, by the back wall; `alw`, `alcast`, `brs`) are drawn roofed from rung 3, art only |
| Works stillages (`worksStillages`) | −39.2, 30.6 | 8.4 × 3 | yes | touch the bunkers, under the same roof: bzi, bzd, pbi, ali, ald (the first yard's `ali` and `ald` stillages keep the crucible's), and the zinc filter dust in big bags on a pallet (`dust`, bay kind `bags`, T3); no filter dust lies in an open bunker |
| Lead area line (`leadArea`) | −49.6, 23.5 | 12.8 × 0.1 | no | a painted line on the ground from x −56 to −43.2 at y 23.5, the works road's north kerb (the lead line's frontage) with the sign "Lead area · masks on" at the breaker's door (T6): the breaker and the smelter hall are one area kept apart from the rest of the yard |
| Field sign (`backfield.sign`) | 0.6, 33.4 | 1.6 × 0.4 | yes | "Back field" on the gateway's north post |

3.3.1 **Where stage-2 grades are drawn.** A bay is a grade's stock, drawn at its bay's place (`bays.<id>.place`, `slot`): every grade added by 2.5.1 in the works bunkers or stillages above, `pbb` in the battery box, whatever made it; the first yard's grades stay in the first yard's bays and stillages, and a back-field plate that draws one of them (`li`, `cbody`, `appl`, `alw`, `alcast`, `brs`) draws from those bays (2.8.1: the belt is drawn, nobody carries). When a round's lot holds a grade drawn in the back field the merchant's flatbed stops at stand `works` after `merchant`; the round's duration is the rule's (`merchant.round_s`, 2.1.2), and the frame fits the drive into it.

3.3.2 **The public and the van.** The public never walks in the working yard (T7, ruling 13.4). A visitor walks `map.works.visitorPath` inside the public bay only: wicket (64.6, 37.9) → the card reader at the canopy's east post (58.4, 38.0), where he takes the oldest thing from the rack and pays ("Pay here") → the wicket; the path is at least 3 m from every drive-line rect, the truck park (x 60 to 64, y 27.6 to 34.6) and the forklift's zone (3.6). The gatehouse window is not on the path. [reclamation dealer]'s van stops on the lane's south kerb outside the fence (`stops.van`, 67.5, 28.6); its two people walk `map.works.vanPath` through the wicket to the corner.

3.3.3 **Lorries, the flatbed, the lane.** A lot's crane lorry stops at `floor` (48, 27.2) and swings the oversize piece onto its square (frame only). {partner.garage}'s end-of-life cars come on the hook-lift's flat body (or the partner's car transporter, drawn) to stop `floor` and are set down on the ELV pad, never tipped (T1); from there only the forklift moves one onto the apron. The machine flatbed reaches south-yard plots from `southYard`, back-field plots from the nearest of `works` and `breaker`. `map.lane` gains `garage_m` 430 and `plumbing_m` 480 past the bridge at 360; the barrier moves to 520.

### 3.4 The walks (`yard_map.py --routes` on the merged map)

New `map.routes` (first values, metres): `scale-crate` 18, `dropoff-reuseRack` 22, `floor-reuseRack` 13, `floor-crane` 10, `crane-shear` 7, `crane-baler` 9, `forklift-elvPad` 4, `elvPad-apron` 2, `floor-shear` 16, `floor-baler` 16, `shear-scale` 16, `scale-shredder` 66, `scale-rotary` 82, `scale-smelter` 110 (the magnet crane serves no apron route: it never lifts a car that still holds its fluids, T1). Yard hands walk only the south yard's routes, and reach the Yard sale's chalk zone through the public bay's staff gap; the back-field routes are the boss's (to commission, and to a hall's first pour, which waits for him and pours by itself at its date, S11, so 110 m costs time, not money).

### 3.5 What the camera shows

The first yard's camera rules stand (follow with lead and ease, zoom out while driving the truck, never move without the thumb); no new moment pans it. At rung 3 the rung sign closes where the boss is, the goal card reads "Put the bath on the Yard sale" (P10; "Walk into the back field" comes later, just before the shredder) and the chevron (or an edge arrow) points at the bath by the canopy; plots, bath, canopy and the public bay's rail appear at the tick, the wall gate is lifted by the flatbed's crane in 10 s (walkable from the tick). The forklift does not zoom out. The first view at a sitting is unchanged (M7). A second hero frame `map.heroWorks` (x0 −31, y0 15.2, 16.7 × 9.7) holds the rotary hall, its filter and apron whole: the store's stage-2 picture.

### 3.6 What the checker must newly enforce (merged map)

1. Everything of `map.works` inside the new box, south of the back wall's face.
2. The works road and turning place ≥ 4 m wide, holding only their stops; the openings where the road passes at least its width.
3. M6 between every pair of solids of both layers.
4. Each hall touches its filter; shredder, eddy current and sorter touch in that order; `works.plates.*.slot` along x in the order of the `feeds` chain.
5. `scale-crate` ≤ 20, `dropoff-reuseRack` ≤ 24, `floor-crane` ≤ 10; the crane's reach (to the nearest edge) covers the floor and each hopper it serves (2.7); the ELV pad touches the apron, lies within the forklift's reach of its bay and outside the tipping floor (the crane's tip zone); the battery box touches breaker and smelter.
6. `visitorPath` and `vanPath` cross no drive-line rect and no solid, stay inside `publicBay` (the van's people from the wicket to the corner) and keep at least `map.works.publicGap_m` (3 m) from every drive-line rect, the truck park and the forklift's zone (the forklift bay and the south-yard rects it drives); `publicBay.rail` closes the bay but for the wicket and the staff gap; `stops.van` outside the east fence.
7. M7's first view unchanged at rung 3; `map.heroWorks` holds its places whole at both sizes; `--png` draws both layers, the paths and both frames.
8. Every bay that feeds a hall (`pbp`, `ss`, `twitch`, `bzs`, the first yard's `alw`, `alcast`, `brs`) is under a roof (`worksBays.roof`, the stillages' roofs); `dust` is a bay of kind `bags`, never a bunker.

---

## 4. The screens

The first yard's zones, overlays and text limits stand (`yard-stage1.md` 4.1 to 4.6, 12.11 to 12.13). Every card is `CardData` from `cardOf`, re-read every 500 ms and after every press; the screen formats numbers only; what a card shows is what its action applies, and a changed number re-asks. Every screen is checked at 844 × 390, 667 × 375 and font scale 1.3 (`check.ts --all` and screenshots). Nothing in this section is drawn before the stop of 9.3.

### 4.1 Four rulings every new screen obeys

1. **One plate per thing** (first yard 12.12): a plot, the Yard sale, the oversize pad, the picking table and an oversize piece each have one world plate; a financed machine's tag and ring are part of its plate.
2. **No real-money button on a working card.** Real-money prices appear only on the shop card and the pack sheet; no plate, card, row, ticket, goal, advice line or refusal names a product.
3. **No shop and no ad on a debt.** A card or ticket SHOWS A DEBT when it prints the finance card's lines, "to the bank", "To [bank]", the works card's `bankLeft` row, or the Agreements page (`CardData.showsDebt`). On it no shop entry and no ad button, and the bottom bar's ad button hides while one is up (the hud reads `frame.debtOnScreen`, set by the rules from the open card and the tickets up). The world's tag and ring print no amount and are not a debt display (P7): the ad button does not hide because a financed plate is in view. The lender's letter names no amount owed and does not show a debt.
4. **Nothing of money or ads before the second session** (P1, ruling 13.2). "The second session" is one stored moment, `sessions2At`: set when the first away card from an absence of at least `ads.awayMinAbsence_min` (30) minutes is closed. Until it is set no shop row (Rota or Settings), no Settings row of packs, no spot buyer, no away bonus and no ad button exist on any screen; a player whose age band is `u13` never gets a shop row at all (P8, ruling 13.7).

### 4.2 New card kinds and refs

`CARD_KINDS` adds `works`, `finance`, `letter`, `yardSale`, `lot`, `crate`, `shop`, `packSheet`, `ageQuestion`, `packCode`, `awayBonus`. `CardRef` adds `{kind: 'works', plate}`, `{kind: 'finance', plate}`, `{kind: 'letter'}`, `{kind: 'yardSale'}`, `{kind: 'lot', k}`, `{kind: 'crate'}`, `{kind: 'shop'}`, `{kind: 'packSheet', product}`, `{kind: 'ageQuestion'}`, `{kind: 'packCode', mode: 'set' | 'confirm' | 'enter'}`, `{kind: 'awayBonus'}`; the office's tabs become `'rota' | 'partners' | 'processBoard' | 'agreements'` (the Trade Book moves to stage 3, LEAD L15: no `book` tab, card or data in this stage), and `{kind: 'office', tab: 'processBoard', page?: 'first' | 'yard' | 'melt'}`; the price board's ref `board {focus}` gains `tab?: 'ferrous' | 'nonFerrous' | 'works' | 'intermediate'` (4.11). A plot routes through `map.works.places.<id>.card` (`works`); the Yard sale's place opens `yardSale`; the oversize pad opens the nearest oversize piece (`lot`), or the picking table (`crate`); the ELV pad opens the depollution bay's card.

`CardData` adds `works?: WorksCard`, `finance?: FinanceTerms`, `agreements?: AgreementRow[]`, `yardSale?: YardSaleCard`, `shop?: ShopCard`, `bonus?: {amount, kind}`, and `showsDebt: boolean`. The process board's data (B19): `ProcessBoardRows.page: 'first' | 'yard' | 'melt'`; new row ids `yard`, `shredder`, `lead` (the first yard's `melt` row gains the halls); `PlateState` adds `'arriving' | 'installed'`; `Plate.ring?: number` (taken ÷ T, 0 to 1, for a financed plate).

### 4.3 The works plate and its card

**The world plate** (11 pt paper chip, one per plot): gate not met: padlock · name · "Opens at 1,000 t" (`plate.opens`, as on the process board; T19) and nothing else; buyable: "Baler · §9,000"; `arriving`: "On its way"; `installed`: "Stand here to start · 5 s" (`plate.works.commission`) over "Starts by itself in {t}" (`plate.works.selfStart`); running: the name on first sight and within 4 m, and a state chip only when not working ("Hopper full", "Tray full", "Waiting for {grade|short}", "Ready to pour · it waits for you"); financed: the [bank] tag (`chip.works.bankTag`) and an 18 pt ink ring filled taken ÷ T beside the name, nothing else about the loan in the world. Every second line of a works plate is in the box `worksPlateLine` (11 pt, one line, at most 31 characters, as the tag's second line; T19), which `check.ts` tests for every `plate.works.*` key. The ring prints no amount and is not a debt display (4.1.3). Commissioning draws the first yard's work ring over 5 s; at `commissioned` a chip "Commissioned · {plate}" rises for 2.6 s (the trade's word stays on the chip; the goal says "Start up the baler", T25).

**The works card** (right panel, `works`; one per plate, a hall's filter in its hall's card):
- title `title.works.<id>`; lead lines "Light iron → Baled light iron" (`card.works.inOut`) and "+24 % on light iron" (`card.works.gain`: what a kilogram of input gains at p̄, never tonnes an hour); a hall's recipe as the crucible's;
- status as the first yard's keys, plus "Installed · stand here 5 s";
- rows: Level ("Level 3 → 4", "+15 % on this machine", Level up §x); a hall's recipes; a bay-fed plate's inputs and their routes ("Takes from: Light iron · Car body"); the depollution bay's "Fluids and gas out · airbags made safe" (`card.works.depollution`, 38; T13), "Waste to a licensed waste carrier" and its car ("End-of-life car · ref. {ref}"); at a car's completion a chip "Certificate of destruction issued" (`chip.cod`, 33) and the same line on the shell's ticket;
- foot: `Buy §{P}`, greyed with "Not enough cash: §x more" when short. After the letter, on a financeable plate whose price is above what the cash can spare (P > cash − reserve; P12), `Bank loan` beside it and "Save up (about {h} h {m} m)" (`card.works.saveUp`; only the time is "about"); with the cash at or above P + reserve the card shows `Buy` alone. `Bank loan` is greyed with "You pay now §{d} · §{x} more" (`card.works.loanShort`) while cash − reserve < d. The time is x = (P − cash) ÷ I, or, while an agreement is open, (P − cash) ÷ (I − `bank.share` × G), G the rated gross an hour (sales before feed) from the same closed form as I (E9). Every number of the card is computed from the state at each read (B11): I moves only when assets do, and Sign refuses with `bankTerms` when the terms shown are no longer the terms (as `buy` refuses with `priceUpdated`). At 844 and font scale 1.0 the three share a row (136 + 112 + 160 pt); at 667 or above 1.15 the line goes under the buttons;
- financed and open: an info row "Bank loan · §{left} left of §{T}" (`card.works.bankLeft`) opening Agreements; the card `showsDebt`.

**Worked example** (the baler at rung 3; first values): "Baler · §9,000" on the plot; card: "Light iron → Baled light iron" · "+24 % on light iron" (bales at §0.62 against §0.50 loose) · `Buy §9,000`. The baler is priced under the finance floor (2.6.4; LEAD L1, accepted), so it is bought with cash and its card has no Bank loan; the first card with one is the first financeable plate dearer than the cash in hand (the bots' prices name it; until then "a plate at §80,000", LEAD L17): with §18,000 in hand and a reserve of §1,842 its foot reads `Buy §80,000` (greyed, "Not enough cash: §62,000 more") · `Bank loan` · "Save up (about 1 h 8 m)" at the ruling's I of §54,500 an hour; with §15,000 in hand `Bank loan` is greyed: "You pay now §16,000 · §2,842 more".

**The rota's licence row** (T21) gains, with no price and no step, "Treatment permit · end-of-life cars" (`card.rota.permitElv`) from the depollution bay's commissioning and "Permit · lead smelting" (`card.rota.permitLead`) from the breaker's: each comes with its plate, never as a purchase or a goal, so a locked thing promises nothing.

### 4.4 The process board's pages

The wide card cannot hold seven rows: 4 × 60 + 3 × 12 + 32 = 308 pt already fills the 333 pt at 844. It gets three pages, tabs in its title row, the page of the newest purchase open by default:

| Page | Rows (D16; joined by riveted bars) | Height |
|---|---|---|
| First yard (`first`) | Cable, Motors, Melt (the crucible), as built | 308 |
| Yard and shredder (`yard`) | Yard (two lines of three: Magnet crane · Shear · Baler; Analyser · Depollution bay · Granulator); Shredder (Shredder → Eddy current → Sensor sorter) | 3 × 60 + 2 × 12 + 32 = 236 |
| Melt and lead (`melt`) | Melt (Crucible → Rotary furnace with filter; Induction furnace with filter); Lead (Battery breaker → Lead smelter with filter); greyed (Lithium · Platinum group and iridium · Tungsten) | 236 |

A filter is a sub-plate of 60 pt riveted to its hall's plate, never bought alone. Five plates fit a row at 844 (132 + 4 × 24 = 624 with sub-plates); at 667 plates are 108 with 16 pt bars (a row of five: 604 of 611). Plate lines: "§{price}", "Level 2", "Next §{price}", a padlock and "Opens at 1,000 t" (`plate.opens`). A plate with Buy is selected first; a second tap opens its works card. No plate shows Bank loan (the works card does).

### 4.5 The bank's screens

- **The lender's letter** (centred card, `letter`, once, at 2.14.5's moment: a works card of the first financeable plate dearer than the cash in hand is read while the deposit is in hand; the screen reports it with `noteSeen({card: 'works'})`, and the rule that shows the letter sets `bank.letterSeen`, B11): title "[bank] · loans for machines" (`title.letter`, T16; "plant finance" stays in the rules and Help's body); three lines: "We lend on machines that earn." · "You pay some of the price now. The bank pays the rest." · "A fifth of each sale goes to the bank until it is repaid. No date." (the share from `bank.shareWords`); foot `OK`. It shows no price.
- **The finance card** (centred, `finance {plate}`, from Bank loan): title "Bank loan · {plate}" (`title.finance`); five lines, label left, amount right: Price · You pay now · The bank pays · Charge · You repay (`card.finance.price`, `.deposit`, `.lent`, `.charge`, `.total`); then "{share} of each sale goes to the bank until §{T} is repaid. No date." (`card.finance.rule`, ≤ two lines); foot `Sign` and `Not now`. Refusals as notes under the foot: `bankOne`, `bankReserve`, `cash`, `ceiling`, `bankTerms`, the gate keys. Height at 667 and font scale 1.3: title 40 + 5 × 28 + 2 × 22 + foot 48 = 272 pt, inside 300.
  Worked example: "Price §80,000 · You pay now §16,000 · The bank pays §64,000 · Charge §5,120 · You repay §69,120" and "A fifth of each sale goes to the bank until §69,120 is repaid. No date."
- **The ticket line.** While an agreement is open every lot ticket replaces its "Paid §x" with "Paid §{x}" in bold over "to the bank §{y} · to you §{z}" (`ticket.bankSplit`, ≤ 38 characters at five-figure amounts; ruling 11.4's words on two lines). Above font scale 1.15 the collection ticket then shows one grade row and "+ n more". Crew chips become "Lot sold · §{x} · bank §{y}" (`chip.lotSoldBank`). The ticket `showsDebt`. The ticket prints what `bank.ts payLot` applied: the split is made before the ticket is printed and the ticket carries its `bank.y` (B2). An ad reward or granted scrip is never a line of a lot ticket: it is its own line, credited apart from any payment (LEAD L4). Worked example: "Paid §620" / "to the bank §124 · to you §496".
- **The Agreements page** (the office's fourth tab, `agreements`): one row per open agreement: "[bank] · {plate}" / "You repay §69,120 · repaid §12,400" / "§56,720 left · a fifth of each sale"; then the history ("{plate} · §69,120 · repaid {date}"). No shop entry and no ad on it. In stage 2 it never has more than one open row.
- **The away card** adds "To [bank]: §{y}" (`AwayCard.bank`, B2) and "Repaid in full: {plate}" (2.17): it `showsDebt` while an agreement is open or when it prints the bank's take, and carries no ad and no shop as before. When the away card just closed showed a debt, no away bonus card opens after it: the offer goes straight to the bottom bar's deferred button (4.9), which stays hidden while any debt shows (P6).

### 4.6 The Yard sale, the visitors, the tag, the batch

- **The tag** (the thing's plate, `plate.reuse.tag`): green, "Reusable" / "§{q} at the gate · §{v} as scrap" at the present step, before any choice; a third line "Too heavy to lift: {kg}" when nobody present can lift it, or "Yard sale full · cut as scrap" (`plate.reuse.full`). A bicycle (tagged only when it came in a named partner's load, T15) adds "Checked" to its first line ("Reusable · Checked"). Tags exist only from rung 3. Whose a tagged thing is follows sight (ruling 13.1, E4): the boss's while he is within sight of it and a place on the Yard sale is free, so the tag is his to act on; otherwise yard hands rack it within their load while a place is free, and crews cut it when none is; the tag's third line says which ("Yard hands will set it out" `plate.reuse.hands`, or the "full" line).
- **The Yard sale's card** (`yardSale`, titled "Yard sale"): a row per thing ("§{q} at the gate"), "{n} free places", "Next visitor in {t}", "Sold today: {n} · §{x}", a Level row "More room · {a} → {b} places", the corner's row "[reclamation dealer] · {n} batches · van in {t}". No sale time, no price choice, no looks.
- **Visitors** are drawn on foot (a civilian body, four tints), with no plate, inside the railed public bay only (3.3.2); at a sale a chip at the card reader on the canopy post ("Pay here", T7) "Sold at the gate · §{q}" (`chip.rackSold`, money without hundredths from §100) and a `rackSale` ticket in the history ("Sold at the gate · cast-iron bath · §261.25"). The van: chip "[reclamation dealer] · §{x}" and a `vanCollection` ticket by thing and kilogram.
- **The batch on a load's label**: a green line "Reusable: {n} {thing} · {kg} kg" (`skip.reuseBatch`) on the skip plate and card, before Buy.

### 4.7 Oversize pieces, the picking table, the forklift, the analyser

In player text a delivered lot is an **oversize piece** and the crate is the **picking table** (T11; "lot" keeps the first yard's meaning, the weight of one grade the merchant collects); the ids, refs and events stay `lot` and `crate`.
- **An oversize piece's plate**: "{partner|short} · {thing}" / "{kg} kg · about §{x} once cut" (`plate.lot`, T18); the work ring when the boss stands at it; its card (`lot`) repeats the label and "Only you can cut this · {s} s" (`card.lot.cut`). It never expires (ruling 13.3).
- **The picking table's plate**: "Picking table · {n} things" / "Stand here · 3 s a thing" (`plate.crate`; P11): standing at it the boss sorts one thing every `crate.sort_s` (3 s), each going to its bin or bay as he goes, and the ticket `crateLot` grows a line at each: "Sorted by hand · {n} things", grade rows, "Paid §{x}" (and the bank lines while open); stepping away keeps what is left for later. Nothing on it expires and it shows no time (P2, ruling 13.3): when it holds `crate.max` things the next things go to the floor as usual. No battery and no car ever reaches it (T1).
- **The forklift**: entered by walking into it; the one button reads "Step out"; the carry chip "{kg} / 1,500 kg" (forklift pictogram); with car forks it lifts an end-of-life car from the ELV pad onto the depollution bay's apron (the only way a car reaches the apron, T1); refusal toast `forkliftLoad` "Too heavy for the forklift: {kg}".
- **The analyser**: a weigh-in line whose grade came from its assay carries the note "Analysed" (`ticket.note.analysed`); a car's shell line "Depolluted" (`ticket.note.drained`, the glossary's word, T13), with "Certificate of destruction issued" on the car's ticket.
- **A routed bay** (the bay card): a route row "Goes to: Baler · Shredder · Sell from the bay" (`card.bay.route`); a Sell on the reserved part is refused with `routed` "This feeds the {plate}. Choose Sell from the bay first." (T17; a toast of two lines).

### 4.8 The shop and everything around it

**Where**: a row "Shop" at the foot of the office's first tab (Rota), and a row "Shop" in Settings, both only once `sessions2At` is set (4.1.4: the first away card from an absence of at least 30 minutes has been closed) and never for the age band `u13` (P8). Never in the yard, on a working card, on Agreements or on a card that shows a debt.

**The shop card** (right panel, `shop`), sections in this order, each a header row:
1. **Looks**: "Yard colours" ([colour 1] to [colour 6], "Trucks, vests and skips"), "Yard decorations" ([set 1] to [set 4]; T18, the ids stay `dressing1` to `dressing4`), "Founder's plaque" ("Poured in your crucible, set by the gate"); each with the store's own price string (`iap.priceOrNull`, "Unavailable" when none, never a made-up price); owned: `Use` / "In use".
2. **Earned**: sign styles of rungs reached and {foundry}'s plate, `Use` / "In use", no price; one not yet earned shows its padlock and "Reach rung 4".
3. **No ad videos**: "Get every ad reward without watching" and its price.
4. **Scrip packs**, only when 2.15.3's four conditions hold (else no header and no word): name line "§{S}", effect line "about {H} hours of your yard's earnings" (`card.shop.packLine`, ≤ 38), the store price. S is computed from the state at each read (B11), so it moves only when assets do; it is stored only by Buy, in the pending quote. Headroom counts packs still waiting: a row is offered only while cash + Σ pending S + S ≤ U (E10); above it the effect line is "Nothing to spend it on yet" with no button. While a pack's purchase waits for the store's approval its row reads "Waiting for approval" with no Buy (`packPending`, E10), so one product never has two quotes. When the S shown is no longer the S now (a purchase landed between read and press), Buy is refused with `quoteUpdated`, the row notes "Updated: §{a} → §{b}" and Buy asks again.
5. **Restore**, for looks and No ad videos, over "Scrip bought here lives in this device's save."

Worked example (for scale, at the ruling's I of §54,500 an hour; every pack's S follows the measured, net I, LEAD L2): "§109,000 · about 2 hours of your yard's earnings · $1.99". At 667 × 375 and font scale 1.3 the name and effect lines wrap to two lines each and the row grows to 64 pt; the price button stays right (96 to 136 pt).

**The pack sheet** (centred, `packSheet`, before the store's own sheet): "§{S} for this yard" / "Bought scrip lives in this device's save. It is not restored on another device or a new install." / the store price / `Buy` · `Not now`. Buy calls `quotePack` (which appends `{product, S, I, atMs}` to the list `iap.pending`), the store action flushes the save, and only then the store's own sheet opens (B6): a kill between the two loses no paid pack. The store's title and description for a pack (5.4): "Scrip: 2 hours' earnings" / "Scrip worth about 2 hours of your yard's earnings in the game." (P15).

**The age question** (centred, `ageQuestion`, once, the first time a pack row would show): "What year were you born?" Four empty digit boxes and a ten-key pad (60 × 44 keys; no default, no wheel); `OK` greyed until four digits form a year between 1900 and this year. After it: no message about packs; the shop opens with or without the section. The band also sets how ads are asked for (P8, ruling 13.7): `u13` gets child-directed, non-personalised requests and no shop row anywhere (the shop card cannot be reached; from a `u13` state no `CardData` has a shop entry); `t13` teen treatment and no packs; `a18` as today.

**The code pad** (centred, `packCode`): "Choose a four-digit code" then "Enter it again" when hiding; "Enter the code" when showing again; a wrong code: "That code does not match" (`packCode`). No "forgot" button; Help says "A forgotten code clears only when the game is installed again, which starts a new yard." Help and the confirming card of the first yard's "Start the yard again" both say: "Bought scrip, and any purchase still waiting for approval, stay with this yard and are lost if it starts again." (`help.packLost`, `card.restart.packLost`; P16).

**Settings** adds, in this order: "Shop" (once `sessions2At` is set; never for `u13`); "Scrip packs: shown / hidden" (a switch row, once `sessions2At` is set wherever the country's switch is on, whatever the rung, LEAD L14; absent where packs cannot exist, so a player there never reads of them, and hidden once the age band is `u13` or `t13`, where it would do nothing, P17); in development builds only (`__DEV__`), a grey section "Development": "Store country: Auto · US · DE · Unknown", "Start at rung 3" (the `r3` preset with the measured entry cash, REPORT6's §3,001, and the bath standing), "Start at rung 4", and "Back to my yard" (P3). Each "Start at" row writes its own save slot and never touches the real save; "Back to my yard" loads the real one again. Settings reads `storefrontCountry()` each time it opens, as the shop does, and unknown means the packs row is absent (P13). Help's pages on scrip packs and on the code show only where the country's switch is on (P13). The owner's one line (wiring2's phone steps) names the row that shows the bank loan: the row whose preset meets 2.14.5's moment (a financeable plate dearer than the cash in hand, with the deposit and the reserve in hand), checked by a preset test that opens that plate's works card and finds the letter. At REPORT6's entry cash (§3,001) the `r3` preset cannot meet it (the deposit of any plate above the finance floor is larger), so the line reads, until the bots' table says otherwise: "To see the bank loan: Settings · Development · Start at rung 4, then open the card of the plate the goal card names."

Never on these screens: a crossed price, a timer, a count left, a "most popular" badge, "best value", "ahead".

### 4.9 Ads

Every ad button exists only once `sessions2At` is set (4.1.4). Ad consent and the tracking question are asked the first time an ad button would show, never at launch (P9, ruling 13.7: the game's data sets `monetization.ads.initOn: 'firstOffer'`, read by the shared ad service, whose default `'boot'` keeps the four other games as they are); a `u13` band's requests are child-directed and non-personalised, with no tracking question (P8).
- **The spot buyer**: on a held bay's Sell on the price board (4.11), a second button beside Sell: "Video · +§{x}" (`card.ad.spot`), x the figure 2.16 computes (at most `ads.spotCap_min` 4 minutes of I, LEAD L3); with No ad videos owned it reads "Bonus · +§{x}" and grants at once. Hidden after the day's count and while a card or ticket that shows a debt is open; its reward is its own line, credited apart from the Sell's payment, so the bank never shares in it (LEAD L4: the rule tied to a financed plate's output grades is gone).
- **The away bonus card** (centred, `awayBonus`, small: 360 × 160): opens after the away card is closed when 2.16 offers it and that away card showed no debt (P6; else the offer goes straight to the deferred button): "For your time away" / "+§{x}" (half of what reached the player after the bank's share, at most 15 minutes of I) / `Watch a video` (or `Take +§{x}` with No ad videos) · `Not now`. While a deferred offer stands, the bottom bar shows a 40 pt button left of the one button, "+§{x}" with a play mark, which reopens the card; it shows no time. Hidden while a card or ticket that shows a debt is open.
- **When an ad cannot load**: the button shows "Video not ready" greyed (`card.ad.notReady`); nothing is granted, nothing is lost, the offer stands.

### 4.10 The rung signs 4 and 5

Centred card as the first yard's rung sign: "Rung 4 · 1,000 t supplied" and up to three lines of what opens ("The shredder line" · "Two furnace halls" · "The lead line"); rung 5 "{homeYard} · 10,000 t supplied" and "Every machine can still level up". A line "New sign style: rung {n}" with `Use it` (free). The yard's sign over the gate is repainted with the style in use. Where scrip packs open at rung 4 nothing on the rung sign says so. At the stage's top no sign or plate promises a later build (P20): the repeating goal "Level up: {item}" is the whole message.

### 4.11 The price board in stage 2 (P4; owner `overlays-b`)

The board grows from about 14 grade rows to about 30, and the stage's market decisions (Hold, Sell, the spot buyer) live on it. It gets tabs by family in its title row, in the manner of the process board's pages: **Ferrous** · **Non-ferrous** · **Works products** (bales, shred, ingots, granules) · **Intermediates** (zorba, paste and grids, batteries, mixed heavies) (`board {focus, tab}`; the family of each grade is content, `grades.<id>.boardTab`). A tab shows only the rows with stock, a Hold or a set-aside (an empty grade has no row; a tab with none reads "Nothing in stock" and stays); it opens on the tab of the bay that opened it, else on the tab last used. A row is as built (grade, kg, today's price, Hold, Sell) with the spot buyer's button beside Sell (4.9). Checked at 667 × 375 and font scale 1.3: the tab row 32 pt, rows 44 pt, a scroll for more than five rows (the first yard's stand-in is replaced by the kit's scroll).

**Text limits**: plate names ≤ 18 characters, grade names ≤ 18 and short names ≤ 15 (5.3), the tag's second line and a works plate's second line ≤ 31 (`worksPlateLine`), effect and ticket lines ≤ 38, finance labels ≤ 14, buttons 96 to 136 pt; `check.ts --all` checks every new key at 667 pt and 1.3.

---

## 5. Content

### 5.1 The new content keys (first values; tune unless marked fixed)

Every number is in `src/config/salvage.content.ts` and validated by `schema.salvage.ts`; the list follows the file's order.

| Block | Keys and first values |
|---|---|
| `group` | `fromRung` 3, `maxRun_s` 300, `roundAway_s` 120 |
| `crew.driver` | `lev` 0.25 (E36(a)); if (b): shop item `truck2`, slot `driver.1` |
| `ladder` | `topRung` 5; `rungs[4]` {t 1,000, range 8}, `rungs[5]` {t 10,000, range 9}; `theta` 300 (as built; θ_r's floor and rungs 1 to 3's value); `thetaShare` 0.01 (from rung 4); rungs 6 to 9 tonnage only |
| ceilings, τ, away | `ceilings_t_h` [6, 110, 400, 800, 3,500] (length `topRung`, B18); `tau_h` [null, null, 9, 22, 45] (`(number \| null)[]` of length `topRung`, null for rungs 1 and 2, B18; τ_4 > 20 h is a fixed lower bound, E11, so that the 20 h pack stays under it); `awayCapByRung_h` [0.5, 2, 4, 6, 8]; `nightWatch_h` 2 |
| `levels` | `tau.cap` 540 minutes for rungs 1 to 3 as built; from rung 4 the cap for crew, partner and first-yard machine levels is 60 × τ_r minutes (E11) |
| `works` | `commission_s` 5, `selfCommission_s` 1,200, `lev` 0.15, `maxLevel` 10, `floor` 3,000; `plates.<id>` per 2.5.3 for baler, shear, analyser, granulator, depollution, crane, shredder, eddy, sorter, rotary, induction, breaker, smelter (or `leadLine` for breaker and smelter as one plate, if that is how content check (11) passes with the truer trade, T2; first values below assume two plates and `pbp` at §3.10); `out` is given per input where a plate takes several (`out: Record<GradeId \| ObjectId, [GradeId, share][]>`; the shredder's `li` → `shred` 0.95, residue 0.05, E7); waste goes "to a licensed waste carrier" (T13, P18); the rotary's filter dust is waste (T3); the smelter has reagents `["coke and iron", 0.06, 0.30]`, out `pbi` 0.94, slag 0.12, and its filter's dust returns to the next heat (T3, T20) |
| `crane`, `shear`, `forklift`, `depollution` | `crane.rate` 50, `crane.reach_m` 9, `crane.load_kg` 1,500, `crane.never` (the materials it never lifts: copper, brass, bronze, aluminium, lead, stainless; T24); `shear.P` 15; `forklift.load` 1,500, `forklift.v` 3.5; `depollution.s` 600 |
| `grades` | the sixteen ids of 2.5.1 with `pbar`, `asFound` (E5), `family`, `material`, `kind`, `boardTab` (4.11), `sprite`, `picto`, `bay {kind: … \| 'bags', sprite, place, slot}` (`dust` is `bags`, T3) |
| `objects` | new things: `elv` (never tipped, never lifted by the magnet: `arrives: 'pad'`), `pbb` battery (15 kg; arrives only in the closed `batteryBox` carrier, T1), `bushing`, `sink`, `bronzeValve`, `bath2` ({partner.plumbing}'s), `radiatorCI`, `propeller` (a bronze propeller, the boatyard's lot kind; it replaces the ship's bell, T15), `casing`, `cateringTable`, `bushingCrate`, `stove`, `ironGate`, `bicycle2`; piece specs with `assay` (2.5.2); every closed vessel an input of the shear or the shredder carries `certifiedEmpty` (T23) |
| `partners` | `partner.garage`, `partner.plumbing` as the first yard's partners (trial, skip, `fill_s`, `k` 0.85, `opens: 'truckBridge'`, `lane`; the garage's cars on the flat body to the ELV pad and its batteries in the closed battery box, never in a skip's tip, T1); `partner.boatyard` ([boatyard], 5.4) as a lot sender only (T15); batches `reuseBatch: {obj, n}` on {partnerFarm} and {partnerDemolition} skips |
| `shop[]` (scrip items) | `truckBridge`, `pallet`, `forklift`, `plasma` (tool, `tier` 4, `P` 60, on every material: it cuts stainless and non-ferrous metal, which the torch cannot; B4, T8), the plates, `truck2`; each `{key, kind, place, price, gate, needsItem, deliver_s, arrive}` |
| `lots` | `period_s` 10,800 yard seconds (E6: lots ride the away cap), `max` 4, `mu_min` [null, null, 15, 18, 18] by rung, `cut_s` [4, 10], `kinds` (an aluminium engine casing, a crate of bronze bushings, a stainless catering table, a bronze propeller from {partner.boatyard}) |
| `crate` | `share` 0.15, `max` 12, `sort_s` 3 (a thing; P11), `u` 1.6; no hold time (P2, ruling 13.3: `hold_s` and `clear_s` are gone) |
| `reuse` | `slots` 6, `levelSlots` 2, `levels` 3, `share` 0.25, `kinds` (bicycle with `fromPartnerOnly` true, T15), `never` (the content check's list), `factor` 2.5, `shareI` [null, null, 0.025, 0.025, 0.025] by rung (the next visitor at t + 3,600 × q ÷ (`shareI` × I), E4: the Yard sale's ceiling follows I), `firstVisitor_s` 30 (only for the first thing ever racked, P10), `batchFactor` 1.5, `vanPeriod_s` 1,800, `firstThing` 'bath' |
| `bank` | `share` 0.2, `shareWords` ("A fifth" at 0.2, else the percentage), `charge` 0.08, `maxShare` 0.8, `maxF_h` 2, `maxF_tau` 0.15, `minPrice_h` 0.5, `maxAgreements` 1 (fixed in stage 2) |
| `iap` (the mode's part of real money) | `packsFromRung` 4 (fixed), `packsOff` EEA + CH (fixed at launch), `lookOf` (product id → look slot and value: `colour1`..`colour6` → `colour`, `dressing1`..`dressing4` → `dressing`, `plaque` → `plaque`), `looks` slots `{colour, dressing, plaque, sign}`. The sixteen PRODUCTS are not here (B5): they sit in the game's shared list `games/scrap-yard/game.json` `monetization.iap.products` (written by `build-yard.py`), with the existing shared kinds for the looks (cosmetic) and No ad videos (`skipAds`), and the ONE new shared kind `hoursOfIncome` (consumable, `value` H 2, 5, 10, 20, fixed) for `pack2`, `pack5`, `pack10`, `pack20`; what is owned is read from the shared entitlements, never from the mode's state |
| `ads` | `awayPerDay` 1, `awayMinAbsence_min` 30 (also the absence that sets `sessions2At`, P1), `awayShare` 0.5, `awayCap_min` 15, `spotShare` 0.1, `spotCap_min` 4 at every rung (LEAD L3: 15 + 3 × 4 = 27 minutes a day at most), `spotPerDay` 3, `maxDayShare` 0.04 (fixed) |
| `monetization` (game.json, shared) | `ads.initOn` 'firstOffer' (P9; the shared default 'boot' keeps the four games) |
| `advice` | `shearKg` 1,500 |
| `goals` (`goals.json`) | list `stage2` of 1.3, the new done grammar |
| `map.works` | section 3 |

The mode's real-money block is `iap`, not `shop`, because `shop` is already the scrip shop's list (11, decision 6); the products themselves are the shared list's (B5).

### 5.2 Where the build script's checks grow (`build-yard.py --check`)

It refuses, naming the key and the smallest failing case: (1) mass not kept (Σ out + Σ waste = 1 + Σ reagents, to 1e-9, per input where `out` is per input); (2) a plate input no source of its gate brings, a `feeds` chain out of order, a `needsItem` cycle, a `feedBy: 'hands'` plate outside the south yard, a shear or shredder input object with a closed vessel that lacks `certifiedEmpty` (T23), a plate whose sellable output exceeds 1 kg a kilogram of input (this check replaces a cap at run time, B16); (3) a plate price not max(`works.floor`, τ_r × ΔI) from `bots/plates.json`; (4) a θ_r beyond a metal's sources at a person's pace (D14; also on the cut content, ruling 10.3), and anything the rung-4 range needs that depends on a tool the player cannot own by then (B4); (5) a `reuse.kinds` object tagged `electrical`, `sealed`, `vessel`, `battery`, `carPart`, `fuel` or `childSafety` (T23), and a bicycle without `fromPartnerOnly` (T15); (6) a rung where `awayCap_min` × `awayPerDay` + `spotCap_min` × `spotPerDay` > `maxDayShare` × 60 × the habit's hours (rung 3: 15 + 3 × 4 = 27 ≤ 29.52); (7) a pack's H ≥ τ_4, and τ_4 ≤ 20 h (E11); (8) per partner LOAD (not per skip at its best), valued at the plates the partner's gate guarantees and after a one-day fall of the board (prices move at most 5.7 % a day): prepared × (1 − `bank.share`) × 0.943 < its price (E5; the farm's load passes: §1,320 × 0.8 × 0.943 = §996 ≥ §958); (9) the map (3.6); (10) a text key missing from `text.json` or failing `check.ts`; (11) a plate or recipe that nets less than +5 % on its input at p̄ after reagents (out and sellable waste, less reagents, against the input's value: ruling 13.5, E7, T2), or whose ΔI at its planned moment is not above 0, naming the plate; (12) price order a trader would read as backwards (T4): `twitch` not below `alw`, `zorba` not below `twitch`, or a sorter's sorted value above 1.5 × its input's.

### 5.3 The words

New text keys by kind (`textKeys.ts`, owner `strings2`): `place.*` (Back field, Shredder, Rotary hall, Induction hall, Lead line, Yard sale, Oversize pad, Picking table, ELV pad, Works bunkers, Forklift); `title.*` (thirteen plates, finance, letter, agreements, shop, yardSale); `card.works.*` (with `depollution` "Fluids and gas out · airbags made safe", `loanShort`), `card.finance.*`, `card.shop.*`, `card.ad.*`, `card.yardSale.*`, `card.lot.cut`, `card.bay.route`, `card.rota.permitElv`, `card.rota.permitLead` (4.3), `card.restart.packLost` (4.8); `plate.works.*`, `plate.opens`, `plate.reuse.*`, `plate.lot`, `plate.crate`; `chip.*` (with `chip.cod` "Certificate of destruction issued"); `ticket.*` (rackSale, vanCollection, crateLot, bankSplit, notes: `analysed` "Analysed", `drained` "Depolluted"); `away.*` (bank, repaid, rack, van, holdReleased, lots "{n} oversize pieces wait for you"); `goal.*` (1.3's list, in the wording of T12, T25, P14: "Start up the baler", "Cut an oversize piece", "Sort the picking table", "Pour at the rotary furnace" with done `poured:rotary`, "Pour a lead ingot" with done `poured:smelter`, "Supply 1,000 t (8 metals)", "Supply 10,000 t (9 metals)"); `refusal.*` (2.19, with `routed` "This feeds the {plate}. Choose Sell from the bay first." and `packPending` "Waiting for approval"); `item.*` and `effect.*` (truckBridge "Three axles: crosses the bridge" (30, T9), pallet, forklift, plasma "Cuts stainless and aluminium too" (32, T8), truck2); `lesson.*` (≤ 48; T14): "A magnet hardly holds 304 stainless." (`lesson.ss`), "An analyser tells bronze from brass." (`lesson.bzs`), "Bronze is copper and tin.", "A battery is broken first, then its lead smelted." (`lesson.pb`), "Zorba: mixed metals from the eddy current." (`lesson.zorba`), "Bales pay more than loose light iron."; `help.*` (the bank, with "plant finance" in its body (T16); the Yard sale; scrip packs and the code, shown only where the country's switch is on (P13); `help.packLost` (P16); the breaker's "The acid is neutralised and leaves as a salt solution." (T20); ruling 9.14's fictional line). Help's glossary (the first yard's 31 entries) adds one plain line each (T14, T11, T25): Bale, Commissioning ("Starting a new machine for the first time."), Depollution bay, Eddy current, Shred, Sensor sorter, Twitch, Zorba, Analyser, Bag-house filter, Salt flux, Picking table ("Where a person sorts by hand what a machine would sort less well."), Oversize piece. The bridge's chip `chip.bridgeLimit` becomes "Axle limit 10 t" (T9, LEAD L13: a loaded three-axle hook-lift puts about 9 to 9.5 t on each rear axle, a two-axle about 11.5 t on its one); `check.ts`'s `NUMBER_ALLOWED` replaces `/Weight limit 7\.5 t/` with `/Axle limit 10 t/`. Every waste line says "to a licensed waste carrier" (the first yard's words and glossary; T13, P18); `contractor` may stay as an internal id.

**Grade names** (`text.json grades.<id>`: name ≤ 18 `gradeName`, short ≤ 15 `gradeShort`, long as the first yard's; T10):

| Id | Name | Short | Long |
|---|---|---|---|
| `ss` | Stainless 304 | 304 solids | 304 stainless solids (18 % chromium, 8 % nickel), sorted by analyser |
| `ssu` | Mixed stainless | Mixed stainless | Stainless not yet sorted by grade |
| `pbb` | Lead batteries | Batteries | Whole lead-acid batteries, in a closed box |
| `pbp` | Paste and grids | Paste, grids | Lead paste and grids from broken batteries |
| `pp` | Plastic chips | PP chips | Polypropylene chips from battery cases |
| `zorba` | Zorba | Zorba | Shredded mixed non-ferrous metal |
| `twitch` | Twitch | Twitch | Shredded aluminium from the sorter |
| `dust` | Zinc filter dust | Zinc dust | Zinc oxide dust from the brass filter |
| `znh` | Mixed heavies | Heavies | Heavy non-ferrous pieces left by the sorter |
| `lib` | Baled light iron | Iron bales | Light iron pressed into bales |
| `shred` | Shredded steel | Shred | Steel from the shredder, cleaned by its magnet |
| `cug` | Copper granules | Granules | Copper chopped from cable by the granulator |
| `bzs`, `bzi`, `bzd`, `pbi` | Bronze solids, Bronze ingot, Bronze dross, Lead ingot | Bronze, Bronze ingot, Dross, Lead ingot | as the first yard's manner |

**The voice** stays `weighbridge-plain`: short plain sentences, the trade's words, no exclamation marks, no puns, no promises of later builds.

**What may never be said** (the check fails player text containing it; added to the first yard's 5.6 list): invest, returns, shares, dividend, cash out, get rich, best value, buy now, cosmetic only, daily, missed, calm week, credited, ahead, loan shark, interest, APR, overdue, due date, late fee, debt (the screens say "Bank loan", "You repay", "left"), lucky, chance. "Stock" and "part" are banned only as words for a holding and so are not on the word list (D24: a person reads for them; "old stock" stays, and the letter avoids "part"). The first yard's list stays, so "fleet", "order", "contract", "salvage", "haul" and "green" stay banned in player text: the shop says "Yard colours", the tag's colour is drawn and never named, the sheet before a purchase has no "contract", and no shop line says "order".

**The player's words** (rulings 9.7, 9.14, 11.4): "Bank loan", "Save up (about x)", "Charge", "You repay", "A fifth of each sale goes to the bank until §x is repaid. No date.", "Agreements", "Yard sale", "No ad videos: get every ad reward without watching", "Scrip packs: shown / hidden", "about H hours of your yard's earnings". Help carries once: "Prices, exchanges, loans, partnerships and listings in this game are fictional and use scrip only. Nothing can be paid out, and nothing here is financial advice."

### 5.4 Names the names desk must choose and search

Each is a placeholder until the register (`scripts/content/yard/names.json`, `byId`) holds it; code reads the id; the desk searches trademark and trade registers, both stores and the four games, as for the first yard.

| Id (new) | Placeholder | Role |
|---|---|---|
| `bank` | [bank] | the plant-finance lender; a two-colour mark (no bank-like crest, no real bank's colours) |
| `reclaimer` | [reclamation dealer] | buys reusable batches by van; its van's livery |
| `garageContact` | [garage contact] | the person on {partner.garage}'s business card |
| `plumbingContact` | [plumbing contact] | the person on {partner.plumbing}'s card |
| `look.colour1` to `.colour6` | [colour 1] to [colour 6] | the six yard colours (paint names, not brands) |
| `look.set1` to `.set4` | [set 1] to [set 4] | the four sets of yard decorations (T18) |
| `look.plaque` | (role name) | "Founder's plaque" unless the desk finds a clash |
| `partner.boatyard` | [boatyard] | the named boatyard that sends a bronze propeller as an oversize piece (T15); its lorry's livery |
| `product.*` | (role names) | store product titles and descriptions: "Yard colours: [colour 1]", "Yard decorations: [set 1]" (T18), "No ad videos", "Scrip: 2 hours' earnings" with "Scrip worth about 2 hours of your yard's earnings in the game." (and 5, 10, 20; P15: never a title that reads as selling time). H is fixed by ruling 9.1, so a title names no number that tuning moves; the store page states none |

`partner.garage` and `partner.plumbing` are in the register already (Parfitt's Garage, Tap Street Plumbing), as are `homeYard` and `foundry`. A hall hand drawn at a pour takes a name from `crew-names.json`.

---

## 6. Art

The look is the art director's (`yard-style.md`), drawn in code in `src/ui/salvage/art/` through the manifest, baked behind the loading animation. Nothing in this section is drawn before the lead's go at the stop of 9.3; if the owner's answer changes the look, `yard-style.md` changes first and this section is drawn to it.

### 6.1 New sprites

| Group | Sprites and frames |
|---|---|
| Yard plates | baler (idle, pressing 3, ejecting a bale 2, tray full); shear (idle, biting 3, a beam fed); magnet crane, tracked (idle, swing 8 headings, magnet on and off, carrying a drained shell (`cbody`) or a beam: the magnet never lifts copper, brass, bronze, aluminium, lead or 304 stainless (T24), and never a car that still holds its fluids (T1)); granulator in its housing (idle, running 2); depollution bay (roof, drip trays, drums sealed and labelled; a car on the apron in three stages: whole, drained, stripped shell); the ELV pad (impermeable concrete with its drain; a car standing on its wheels); the car transporter or the hook-lift's flat body with a car |
| Shredder line | shredder house with its infeed conveyor and stacker (idle, running 2); drum magnet as part of the house; eddy current and sensor sorter with conveyors (idle, running 2; the sorter's air jets as a live effect) |
| Halls | rotary hall, induction hall, lead smelter hall: portal-frame sheds with the south wall open, the furnace inside in the crucible's phases (empty, filling, heating, ready, pour, cooling); each filter: housing, ducts and a slim stack; breaker under its roof (idle, running); the battery box (closed, open) on its bunded floor; {partner.garage}'s closed battery box as it arrives; the lead area's painted line and its sign "Lead area · masks on" at the breaker's door (T6); the smelter's filter dust drawn as a hopper back to its hall (no grade, T3); the first yard's crucible hood drawn ducted to a small filter housing (art only, no rule, no price; T22) |
| Bunkers and stillages | eleven bunkers by fill (empty, part, full) per grade look; the lean-to roof over the four that feed a hall and over the works stillages, and the first yard's stillage block drawn roofed from rung 3 (T5); works stillages per ingot; the zinc filter dust in big bags on a pallet in the stillage row (T3); bales stacked; the belt weighers (a short conveyor with a display) |
| Analyser | a hand-held analyser in a cradle at the scale house window (frame `analyser` of the scale house); the boss holding it at a weigh-in (people sheet) |
| Vehicles | three-axle hook-lift (eight headings, by skip state); forklift (eight headings, forks up and down, a load); pallet truck (a carrier in the hand); the partner's crane lorry with an oversize piece; [reclamation dealer]'s van; the second hook-lift if taken (a tint of the first) |
| Yard sale | canopy, rack, slots with things set on it, the trade corner's pallets, the wicket, the public bay's rail with its sign "Visitors: keep to this area" and its staff gap, the card reader "Pay here" on the canopy's east post (T7), the tag (live), visitors (a civilian body, four tints, walk 6 and stand) |
| Oversize pieces and the picking table | the four kinds (an aluminium engine casing, a crate of bronze bushings, a stainless catering table, a bronze propeller; T15) whole and cut; the picking table empty, part, full, with its bins |
| Bank | the [bank] tag (live) and the ring (live, ink on paper, never red); the letter's head mark (ui) |
| Lane | the two bridge partners' sites; the bridge's new sign face: the axle-weight pictogram with "10 t" (T9) |
| People | the respirator layer (a half mask) on the people sheet, worn in the breaker and the lead smelter hall (T6; `yard-style.md` gains it); the boss and the hall hand at a pour in face shield and aluminised apron |
| Looks sold | six yard colours as TINTS of existing layers (vest, truck cab, skip body): no new sprites; four sets of yard decorations of four to five props each (planters, flags, benches, painted kerbs: sheet D); the founder's plaque in bronze on a post by the gate |
| Looks earned | the gate's sign in five styles (one sprite, five baked faces); {foundry}'s plate |

Never drawn (`yard-style.md` 11, and for this stage): a furnace without its hood and filter; anyone at a pour without face shield and aluminised apron; anyone in the lead area without a mask (T6); the analyser pointed at a person (it is an X-ray device; T6); a hose, a puddle or rain near a furnace's charge, or a wet charge (T5); an end-of-life car tipped from a skip or hanging from the magnet (T1); loose batteries on a floor, in a skip or on the picking table (T1); filter dust in an open heap (T3); a member of the public outside the railed public bay (T7); open acid, a leaking battery, smoke from a stack (a stack shows a faint heat shimmer only); a battery or a converter on the Yard sale; a bank vault, coins pouring or a price chart near the bank's screens.

### 6.2 Sheets, budget and draws

Sheets A (people and things) and B (plant and vehicles) are full: they pack at 2.75 and 2.5. Stage 2 adds:
- **Sheet C** (2048 × 2048, works plant at density 2.5): the halls, the shredder line, the yard plates, bunkers; statics away from the second hero frame are baked small and drawn up (0.6: halls' far walls, filters, bunkers; 0.75: shear, baler, crane), the rotary hall and its pour at full density.
- **Sheet D** (1024 × 1024 at 2.5): forklift, three-axle truck, crane lorry, car transporter, van, visitors, the decoration sets.
- Ground: the back field uses sheet G's existing tiles (concrete and gravel); bunker floors are decals in G's spare frames, else drawn live.

**Draw budget**: at most twenty atlas draws a frame (AGENTS.md, which outranks the first yard's "twelve" of its 15:00 ruling). A frame of the back field draws ground, shadows, then runs of A, C and D; a frame by the gate draws A, B and D. The world's draw counter (`world/atlas.ts`) is a test on three views: `?preset=r4&view=works`, `?preset=r3&view=gate`, `?preset=r4&view=south`; each ≤ 20 draws, ≤ 40 actors and ≤ 300 sprites. If a view needs more, sprites that alternate move sheet (the first yard's rule). `atlasProgress()` keeps the calm loop until all sheets are baked; the bake of C and D starts only once the save's rung is 3 or more (a new player bakes nothing new).

---

## 7. Sound

Keys in `src/services/fx/catalog.salvage.ts` (written by `render_yard.py --catalog`), events mapped in `src/modes/salvage/soundKeys.ts`, played only through `fx.play` by the hud's event pump; pitched sounds in E major; segments, not loops (`SALVAGE_SEGMENT_MS`); sound only for what is on screen or the player's own act. Haptics: light on a commissioning, a racked thing and a thing sorted, medium on a sale at the gate, an oversize piece cut, a pack granted and a purchase, success on a rung; none for what is not the player's own. Nothing here is recorded before the stop of 9.3.

| Keys (new unless noted) | Trigger (2.19's events) |
|---|---|
| `commission_spin` (rising whine), `commission_done` | `commissioned` by the boss (by itself: `commission_done` only, if on screen) |
| `baler_press`, `baler_eject` | `plateState` working on the baler; a bale to the tray |
| `shear_bite` (segment 900) | the shear working |
| `crane_track`, `magnet_on`, `magnet_off` | the crane's dated move's start and end |
| `shredder_run` (segment 1,200), `conveyor_run` (segment 1,000), `sorter_puffs` | the shredder line working, when on screen |
| `furnace_roar` (as built, pitched for each hall), `ready_chime`, `pour_glug`, `cool_ticks` (as built) | `heatStart`, `readyToPour`, `pour` with `plate` |
| `induction_hum` (segment 1,400) | the induction hall heating |
| `breaker_crunch` | the breaker working |
| `forklift_engine` (segment 800), `forklift_beep` | the boss in the forklift; reversing |
| `rack_set`, `tag_show` (soft paper) | `racked`; a tag first seen |
| `gate_bell`, `till` | `visitor` at the wicket; `rackSold` at the card reader |
| `van` (as built), `set_down` (as built) | `vanDated` arrival, `vanCollected`; `lotArrived`, a car set down on the ELV pad |
| `crate_sort` (segment 700) | each thing the boss sorts at the picking table (`crateSorted`, one every `crate.sort_s`); the last of a sitting's sort (`crateCleared`) plays `coin_big` (as built) |
| `cod_stamp` (`deal_stamp` pitched down) | `chip.cod`, a car's certificate of destruction |
| `letter_paper`, `deal_stamp` (as built), `repaid_stamp` | `letter`, `financed`, `repaid` |
| `shop_open`, `buy` (as built), `coin_big` (as built) | the shop card; a look; `granted` |
| `ad_reward` | `adPaid` |
| `rung_sign` (as built) | rungs 4 and 5 |

Ducking (`SALVAGE_DUCK`): a pour 0.35 for 2.6 s as built, the sale at the gate 0.7 for 1 s. **The budget**: the pack is 2.87 MB of 3.0 (effects 2.22, music 0.64); about 23 new files at 56 kb/s mono make about 0.46 MB. As LEAD L11 rules: FIRST the music is encoded again at a lower rate that a listener cannot tell apart (an A/B on an iPhone speaker and earphones, by a person, before it is accepted); only if that does not make room does this game's limit rise to 3.4 MB (`render_yard.py --check` reports the pack's size against 3.0 MB either way). Nothing new is music. A person listens on an iPhone speaker before any sound counts as done.

---

## 8. Tests, bots and people

### 8.1 Rules tests (vitest, frozen test content in three files; no tuned number pinned)

The frozen test content is split by owner (B1): `src/engine/fixtures/salvage.ts` (`engine2`: the first yard's content and states, `r3`, `r3plain`, `held14`), `src/engine/fixtures/salvage2works.ts` (`rules-works`: the test plates, `r4`, `rackFull`, `lots4`) and `src/engine/fixtures/salvage2money.ts` (`rules-money`: `r3fin`, `l2save`, `u13`, `firstHour2min`); both new files are listed in `scripts/lib/modes.js` as the mode's (level c). New frozen states, each with its `FIXTURE_EVENTS`: `r3` (seed 257's minute-60 yard at rung 3, the works layer open), `r3plain` (`r3` with no boost, no hand-stripper work, no tagged thing and no E40 condition, for the grouping tests, B3), `r3fin` (an agreement open), `r4` (shredder line and both halls), `rackFull`, `lots4` (four oversize pieces, a picking table of eleven), `held14` (C5: fourteen bays held, §524), `l2save` (the first yard's five states as layout 2), `u13` (an `r4` yard whose age band is `u13`) and `firstHour2min` (a first-hour state after a 2-minute absence). Test plates have round numbers, checkable by hand.

| Rule | Tests (each a file beside its module) |
|---|---|
| 2.1 grouping | 2.1.4 (`grouping.test.ts`, `tickjump.test.ts`), by the lead's G1: for the SAME presence state (the same samples, or none), ticking, one jump and many jumps give the same state, on `r3plain` and `r3`; the test that compared present out of sight with away is withdrawn (the rules make them differ on purpose). The bound (B13, G2): `grouping.test.ts` runs `r3` six hours away twice, with `group.fromRung` 3 and 99 (above the top rung): sales, supplied and loads within 3 % and every gram conserved, and the mass crews delivered equal within one run; below `group.fromRung` the first hour's frozen states advance exactly as before |
| 2.2 Hold | from `held14` an absence pays more than §0 and lists the bays released, one a check, the most valuable first; Sell's set-aside and routed reserves untouched |
| 2.3 I | 0 before the first yard hand; never reads sales, cash, holds, routes, recipes, Hold, "Take from bays" or the step (a test flips each and I stays; I4); material assigned to the owned machines by margin a kilogram, best first, the rest sold as weighed (I4, T26: it replaces "the lowest-margin recipe and route"); the trucks counted once as a time budget shared by the partners, best net margin a load first (I2); I bounded by the feed: hands and machines beyond it add nothing (I3, B12); I net of feed (I1); card numbers recomputed at each read, frozen only in the pending quote, a lot's mass and `Agreement.I` (B11) |
| 2.4 | the driver's level shortens the whole round; if `truck2`: two drivers never claim one skip, earmarks add, the weighbridge serves one at a time |
| 2.5 | mass kept for every plate and recipe of the test content, per input where `out` is per input; assay grades only with the analyser commissioned, at weigh-in, on any piece whatever its age (B16); "Analysed" on the line |
| 2.6 to 2.8 | a plate works nothing until commissioned; commissioned by the boss at 5 s or by itself at its date, present or away the same; a hall's first pour waits; filters bought with their halls; routes read at departure and at each segment; a routed bay keeps the plate's `inbuf` from the round and refuses Sell on it (`routed`); a bay-fed plate's output lands in its bays, tick equal to jump; a full tray stops a south-yard plate and loses nothing; reagents paid at a heat's start only; the crane serves only what its reach holds and never lifts a grade of `crane.never`'s materials; a hall draws only from covered bays (a content check, 3.6 (8)); a bay-fed plate draws in its `in` order, debited at every instant that reads or writes the bay, and a grade is reserved by one station at a time (`routed`, B8); plates addressed as `StationId` by crew and machines alike (B7) |
| 2.9 | no car before the depollution bay; no `elv` is ever tipped or moved by the crane before depollution, and a car reaches the apron only by the forklift from the ELV pad (T1); no `pbb` is ever on the floor, in a skip's tip or on the picking table (T1); a converter's source is a partner's ref; the bridge partners only with `truckBridge`; the plasma cutter is tier 4 and cuts every material, the torch no stainless or non-ferrous oversize piece, and a save's tool tier is clamped to the content's highest (B4) |
| 2.10 | an oversize piece arrives at its date in yard seconds, `nextAt` first set at `backFieldOpen` (never at migration), at every arrival nextAt = max(nextAt, t) + period, and an opening that leaves three with nextAt ≤ t brings one at t (E6): at most four wait, and a save below rung 3 reaching rung 3 has no backlog; its printed value equals its value paid at p̄ with arrival's I; kinds only of owned lines (the analyser for stainless); the picking table's share by hash; each thing sorted every `crate.sort_s` pays u × its prepared value and lands in its bay; nothing on the picking table ever expires or moves to the crews (P2), and when it holds `crate.max` the next things go to the floor |
| 2.11 | rungs, θ per rung from rung 4 (rungs 1 to 3 at `ladder.theta`), ceilings and caps to rung 5; rivals to the one passed at rung 5, from the player's start |
| 2.12 | a sale pays its printed price once; tick equals jump across racking, the restart, the value-dated visitor (t + 3,600 × q ÷ (`shareI` × I)) and the van; no tag below rung 3 (the first hour's states unchanged); a tagged thing is the boss's only while he is within sight of it and a place is free, else yard hands rack it within their load while a place is free, else crews cut it (ruling 13.1, E4, B15): from `rackFull` with the boss in the yard the tipping floor never fills with tagged things; a bicycle tagged only from a named partner's load; nothing on the never list is tagged; each racked kilogram supplied once; the first thing ever racked brings its visitor at `reuse.firstVisitor_s`; the bath's visitor dates the next on the test content's numbers (a hand-checkable figure in the fixture) |
| 2.13 | the bank's sentence only under its four conditions; no Trade Book state, tab or event exists (LEAD L15) |
| 2.14 | 2.14.7's list; `bank.ts payLot` runs at every lot payment before its ticket prints and the ticket's `bank.y` equals what was taken; an ad reward or granted scrip goes through `credit()` (cash and earned only, never the income buckets, never a payment the bank shares in; B2); the Bank loan button only when P > cash − reserve, greyed with the deposit's shortfall (P12); "Save up" with an agreement open uses I − `bank.share` × G (E9); the letter at `noteSeen({card: 'works'})` under 2.14.5's condition (B11) |
| 2.15 | 2.15.7's list; "no real-money button on a working card" walks every `CardData` of every frozen state; pending is a list and a grant takes the oldest pending quote of its product; Buy refused while that product's quote waits (`packPending`), and headroom counts pending S (E10); the grant hook `grantProduct(cfg, g, productId, txId, purchasedMs)` on `EngineMode` (B6); owned looks and No ad videos read from the shared entitlements (B5); from `u13` no `CardData` has a shop entry (P8); from `firstHour2min` no Shop row, no packs row and no ad button exist (P1); Help's pack and code pages and the Settings packs row absent where the country is off or unknown (P13), and the row absent for `u13` and `t13` (P17) |
| 2.16 | caps and counts by rung (15 + 3 × 4 minutes of I at most, LEAD L3); the away bonus is half of what reached the player after the bank's share, its own line (`AwayCard.bank`, B2); a deferred offer kept until taken or replaced; no away bonus card after an away card that showed a debt (P6, in `hud.test.ts`); no ad button when `showsDebt` on any card or ticket up, and the bottom-bar button not hidden by a financed plate in view (P7) (screen tests in `hud.test.ts`); ad consent asked at the first ad button, never at boot (P9, in the shared ad service's test) |
| 2.17 | the away card's new lines equal what the absence applied |
| 2.20 | the first test written: each `l2save` loads into layout 3 with cash, supplied, every stock and every crew member equal; a layout-2 rung-3 save gets the bath at its first tick, the works layer derived from the rung and an absent `counts.bathSet`, not from a rung event (B14); a tool tier above the content's highest is clamped; a crew run whose claims name a missing thing is dropped and its claims released; a layout-3 save round-trips; an open agreement and a pending quote survive |
| words | every key has text; no banned word; each text fits at 667 and 1.3 |

### 8.2 The bots (`src/engine/salvage/bot.ts`, `scripts/content/yard-bot.ts`)

The first yard's hands and habits stay; the twice-a-day habit runs to rung 5 (a first hour, then 15 minutes every 11.75 h, up to 8 days); every run is on fifteen seeds and two routes and checked on five unseen; each aim is "on 13 of 15 seeds". New bots:

| Bot | Behaviour | Measures |
|---|---|---|
| Normal, brisk, slow hands, twice a day | goal card and advice line; commissions what is near | rung 4 day 2 to 3, rung 5 day 4 to 6; a useful purchase every sitting; cash ≤ 2 τ_r of income; I against away net income at the six named moments |
| Card manager | cards only after the second hire | the working hand ≥ 1.2 × it; no mechanism over three fifths of the gain |
| Always / never finances | one takes every Bank loan | rung 5 at most a tenth sooner; first loan repaid within about 4 h of running; no bought load a net loss; finance better on a quarter to a half of offers |
| Packs on / off | buys the largest pack offered at each rung-4 sitting | every aim in both modes; the buyer's lead reported in days; the headroom row on at most a fifth of shop openings |
| Ad watcher / not | watches every offer | rewards ≤ 4 % of a day; tonnes at day 6 ≤ 1.15 × (day 14 stays in the prototype, D64) |
| Racker / cutter | racks every tagged thing it can lift / cuts them | Yard sale and van 2 to 5 % of a day, never over 8 %; racking ≥ 1.2 × cutting a minute; present equals away |
| Day-word holder | holds every low day | E40: no absence pays §0 |
| Steel-max | ferrous plates and levels only | stalls at rung 4 or 5 |
| No hand | twenty stage-2 states, stick untouched | the next goal purchase reached |
| Lead cut | the lead line moved to stage 3 | no dead end; every aim (ruling 10.3) |

**The bench**: `yard-bot.ts --bench away` (2.1.3).

### 8.3 The measured aims as bands, and the hard promises

The bands (13 of 15 seeds; checked on 5 unseen) are the measures column of 8.2 and 2.22, plus: the first hour's beats in band and rung 3 at 55 to 65 min; each plate paying back in 0.8 to 1.5 τ_r; an hour away ≥ 0.3 of an hour played and an hour played ≥ 1.25 × away (E19).

**The hard promises** are gates on every run and in the tests: shown equals applied (cards, tickets, the finance card, the pack's quote); money comes only from lot payments (2.14.4's list), ad rewards and granted packs, and goes only to purchases, levels, hires, loads, deposits, reagents at a heat's start and the bank's share; nothing costs by the clock; time away is paid once inside the state; a tick equals a jump; no dead end; every amount asked for is possible with what the player has (the deposit leaves the reserve; a pack is offered only within headroom); a locked thing promises nothing; numbers only in content; names by id.

### 8.4 People before tuning

Three people-like players (not the engineers) play the joined stage on an iPhone in Expo Go, both sizes, before any number is tuned for feel (only the gates' numbers are set before, 9.2): 20 minutes from `r3` (the works plots, the bath, the first plate, the letter), 20 minutes from `r4` (the shredder line, the halls, the shop with packs on and off by the development row, the age question, the code), and one person two sittings a day for two days on their own phone. They note with the minute: where they did not know what to do; whether they found the back field, the Yard sale and the crate without the chevron; whether the finance card's numbers read as what happens; whether the shop felt pressed on them; where a walk to a far hall felt long; texts unread. The notes reach the lead before tuning.

### 8.5 The gates

`npm run typecheck`, `npm test`, `npm run validate`, `npm run lint:worklets`, `npm run check:bundle` (the four other games' bundles unchanged, `modeRegression` green, `entries.test.ts` in step), `python3 scripts/content/build-yard.py --check`, `npx tsx scripts/content/yard/check.ts --all`, `python3 -I scripts/content/yard/build-ids.py --check`, `python3 scripts/audio/yard/render_yard.py --check`, `npx tsx scripts/content/yard-bot.ts --seeds 15 --routes 2 --report --stage 2`, the bench, and a release export with the `__DEV__` row absent.

### 8.6 Every rule: where it is shown, where it is tested

| Rule (section 2) | Shown (sections 3 to 7) | Tested (8.1 to 8.5) |
|---|---|---|
| 2.1 grouped runs | the frame's legs from the plan (`CrewRun.k`, `legS`); no new screen | `grouping`, `tickjump`; the bench |
| 2.2 Hold never stops the yard | away card line `away.holdReleased` (2.17, 4) | `held14`; day-word holder bot |
| 2.3 I | the pack row (4.8), Save up (4.3), lots' "about §x" (4.7), the away bonus (4.9) | 8.1 2.3; I against away net (8.2) |
| 2.4 driver's level, truck2 | the truck's level row; `park2` (3.2); sheet D's tint (6.1) | 8.1 2.4; E31c in the normal-hand bot |
| 2.5 grades, assay, plates as data | bunkers and stillages (3.3, 6.1); "Analysed" (4.7); Trade Book (4.11) | 8.1 2.5; content checks 5.2 (1), (2) |
| 2.6 buying, commissioning, levels, board | the works plate and card (4.3); the board's pages (4.4); `commission_*` (7) | 8.1 2.6; content check 5.2 (3) |
| 2.7 yard plates, crane, routes | south-yard plots (3.3); route row (4.7); crane sprites and sounds (6.1, 7) | 8.1 2.6 to 2.8; checker 3.6 (5) |
| 2.8 back field, lines, halls | back-field plots (3.3); "Weighed at the works" chip; hall phases (6.1); furnace sounds (7) | 8.1 2.6 to 2.8; lead-cut bot |
| 2.9 bridge partners, vehicles | lane sites (3.3.3, 6.1); the forklift (4.7); `chip.bridgeLimit` (5.3) | 8.1 2.9 |
| 2.10 lots and the crate | the oversize pad (3.3); lot and crate plates and cards (4.7); `crate_sort` (7) | 8.1 2.10; card-manager bot |
| 2.11 rungs, θ, ceilings, caps, rivals | the rung signs (4.10); the chip | 8.1 2.11; steel-max, normal-hand bots; content check 5.2 (4) |
| 2.12 Yard sale and van | the Yard sale's places and paths (3.3, 3.3.2); tag, card, visitors (4.6); `gate_bell`, `till` (7) | 8.1 2.12; racker bot; content check 5.2 (5) |
| 2.13 goals, advice, Trade Book | the goal card; the advice line; the book (4.11) | 8.1 2.13; no-hand bot |
| 2.14 plant finance | letter, finance card, ticket line, Agreements, away line, tag and ring (4.3, 4.5) | 8.1 2.14; always/never-finance bots; content check 5.2 (8) |
| 2.15 shop, packs, grants | shop, pack sheet, age question, code pad, Settings (4.8) | 8.1 2.15; packs-on/off bot; `entries.test.ts`; the release export |
| 2.16 ads | spot button, away bonus card, bottom-bar button (4.9) | 8.1 2.16; `hud.test.ts`; ad-watcher bot; content check 5.2 (6) |
| 2.17 time away | the away card (4.5, first yard 4.4) | 8.1 2.17; the bench; present-equals-away tests |
| 2.18 to 2.19 state and contract | every card (4.2) | `contract.test.ts`; `cards.test.ts` |
| 2.20 the save | — | 8.1 2.20 (first test written) |

---

## 9. Work packages

One file, one owner; a new key or field is one line in `requests.md` to its owner; nobody edits a file they do not own; the lead commits. The order puts everything that does not depend on the look first (the engine step, the shared store files, the rules, the content, the bots and their measured table), then a stop where the lead asks the owner about stage 1's look, then the screens, art and sound.

### 9.1 Phase A: the contract, the engine step, the shared files (in parallel)

| Label | Owns | May assume | Delivers |
|---|---|---|---|
| `contract2` (the rules lead) | `src/engine/salvage/types.ts` (v3: 2.18, 2.19 and 4.2's fields, events, refusals, actions, `CardData` additions, `showsDebt`), `refusals.ts` | this document | the contract frozen in one sitting and announced in `requests.md`; stub selectors returning sample `CardData` for every new card |
| `engine2` (rules-sim; at work, `notes/engine2-group.md`) | `crew.ts`, `rate.ts`, `tick.ts`, `away.ts`, `truck.ts`, `round.ts`, `hand.ts` (opening runs), `group.ts`, `fixtures/salvage.ts` | the first yard as merged | 2.1 to 2.4 with their tests; the bench under 150 ms or the largest remaining kind reported; `held14` and `r3` frozen |
| `store-shared` (one owner; nobody else touches these files in the stage) | `src/config/schema.ts` (kind `hoursOfIncome`), `src/modes/contract.ts` and `src/engine/mode.ts` (`grantProduct` hook), `src/services/iap.ts` (pending listener, ledger hand-off), `src/services/region.ts` (adds `storefrontCountry()`, store only; `detectRegion` unchanged), `src/state/store.ts` (the reconcile at start, routing a `hoursOfIncome` grant to the mode), `src/modes/entries.test.ts` | the four games sell as today | the four games' tests green, `modeRegression` untouched; a mode-agnostic test that a `hoursOfIncome` product is granted once by txId |

### 9.2 Phase B: the rules and their numbers (no screen exists yet)

| Label | Owns | Delivers |
|---|---|---|
| `rules-works` (rules-sim) | new `works.ts`, `halls.ts` (the crucible's heat generalised; `crucible.ts` keeps the first yard's), `shredder.ts`, `assay.ts`, `lots.ts`, `crate.ts`, `reuse.ts`, `forklift.ts`, `book.ts`; changes to `machines.ts`, `bays.ts` (routes, reserves), `partners.ts`, `things.ts`, `positions.ts` (`mapAt`), `content.ts`, `create.ts`, `actions.ts` | 2.5 to 2.12 and the Trade Book with tests on frozen content; `r4`, `rackFull`, `lots4` frozen |
| `rules-money` (rules-book) | new `bank.ts`, `shop.ts` (quote, headroom, grant, ledger, reconcile, age band, code hash), `ads.ts`; changes to `money.ts` (`bankSplit` inside `earn`), `save.ts` (layout 3; the migration test first), `cards.ts` (every new `CardData`), `frame.ts`, `tickets.ts`, `goals.ts`, `advice.ts`, `ladder.ts`, `rivals.ts`, `src/engine/salvage.ts` (the facade), `src/engine/salvageMode.ts` (the mode's `grantProduct`) | 2.13 to 2.17, 2.20, with tests; `r3fin`, `l2save` |
| `content2` (content) | `salvage.content.ts`, `schema.salvage.ts`, `build-yard.py`, `yard_map.py`, `game.json` (generated); later `bot.ts`, `yard-bot.ts` | the keys of 5.1; the checks of 5.2 and 3.6; the bots of 8.2 on the joined rules; `bots/plates.json`; a report in the manner of `yard-bots.md` |
| `strings2` (strings) | `textKeys.ts`, `strings.ts`, `text.json`, `check.ts` | 5.3's keys and words, checked at 667 and 1.3 |
| `names2` (names desk) | `names.json` and its checks | 5.4's names searched, or the placeholders kept with the reason |
| `goals2` (hints) | `goals.json` | the `stage2` list and its done grammar |

**What Phase B must deliver before anything else starts**: the bench's gate; I measured at the six named moments; the bank's share ceiling and the first loan's hours; the ad caps by rung; the Yard sale's share of a day; the plates' payback prices (and so which plate first meets the finance floor). The lead sets the gates' numbers from that table. Numbers for feel wait for 8.4.

### 9.3 The stop

The lead shows the owner the first yard on the phone and asks whether the look and the feel are right, with Phase B's table in hand. Nothing of 9.4 starts before the answer. If the answer changes the look, `yard-style.md` changes first and 9.4's art is drawn to it; the rules and numbers of Phase B stand.

### 9.4 Phase C: art, world, screens, sound

| Label | Owns | Delivers |
|---|---|---|
| `art-works`, `art-looks` | `art/*` as they divide it, `scripts/art/yard-*.ts`, `yard-style.md` | 6.1; sheets C and D in budget; 6.2's draw counts |
| `world-a` | `world/{frameLoop,camera,collide,yard,useRulesTable,useYard,actors,lane}.ts`, `YardView.tsx` | the merged map, clamp, forklift, crane moves, pours, visitors and van from dated legs, the bake from rung 3 |
| `world-b` | `world/{labels,chevron,heroFrame,effects,dressing}.ts` | plates, tag and ring, commissioning's ring, the belt chip, the second hero frame |
| `hud` | `hud/*`, `SalvageShell.tsx`, `uiState.ts` | ticket kinds, bank lines, chips, the ad button hidden on `showsDebt` |
| `overlays-a` | the frames, Office, Rota, ProcessBoard, Machine, Crucible; new `Works`, `Finance`, `Letter`, `Agreements`, `TradeBook` | 4.3 to 4.5, 4.11 |
| `overlays-b` | PriceBoard, Bay, Skip, AwayCard, RungSign, Clipboard, Settings, Help; new `YardSale`, `Shop`, `PackSheet`, `AgeQuestion`, `CodePad`, `AwayBonus`, `Lot`; `dev/*` | 4.6 to 4.10 |
| `sound2` | catalogue, `soundKeys.ts`, `scripts/audio/yard/*`, `assets/sfx/*` | section 7 |
| `wiring2` | `src/modes/salvage/*`, `games/scrap-yard/store/*`, `yard-store.json`, `REVIEW-NOTES.md` | presets `r3`, `r4`, `r3fin`; ruling 9.6's store sentence; review notes (the platforms' purchase approval, the fictional loans line, the three kinships of D94) |

### 9.5 Then

The join (the integrator, against the frozen states and the real rules), the three people (8.4), one review by six reviewers (a casual player, the look, a store reviewer, a phone engineer, a rules attacker, the trade and words desk), one pass of fixes by the files' owners, the lead's tuning from the bots' table and the people's notes, and a confirmation: the bots' report again, every gate of 8.5 for all five games, the owner's phone.

---

## 10. What this stage leaves out, and the hooks stage 3 needs

**Left out**: dealers, road and rail, the exchanges, registered brands, corporations, partnerships, the merchant's advance (stage 3); territories, vessel and plane, the site loan, a grant, a rival's yard, a Yard sale at each site (stage 4); other players, the company, boards, company looks, the platform's age signal (stage 5); a bundle; price tags at the Yard sale; hydro lines; lithium, platinum group and iridium, tungsten; a hired forklift driver; dusk and night.

**If the stage runs over** (rulings 7.2, 10.3; D62, D86): the lead line moves to stage 3 first (rung 5's range 8 in the cut content, the no-dead-end test and the bots again), then, first cut first: the second kind of reusable batch, the 10 h and 20 h packs, two dressing sets, the Yard sale's levels; then the Trade Book. **Never cut**: the country switch and its unknown-country default; the storefront country; the rung-4 gate on packs; the refusal above headroom; the frozen quote and the ledger; the share and the total printed on finance and their tests; no shop and no ad on a debt card; the locked Settings switch and the age question.

**Hooks stage 3 needs, which stage 2 must not preclude**:
1. **The split is one function.** `money.ts earn` calls `bankSplit(payment, agreements)` with a LIST oldest first that never takes more than `bank.share` of a payment in all (ruling 11.2); stage 2 passes at most one. The merchant's advance adds an agreement kind, not a second path.
2. **Agreements is a page of kinds.** Rows carry `{kind: 'bank' | 'advance' | 'partnership', ...}`; a partnership row will stand on the partner's card too.
3. **The round's buyer is content** and the works stand is a stop: dealers replace the merchant without moving a bay.
4. **Lanes are a list** (`map.lane`): road and rail add lanes; the bridge partners' sites are lane entries, not code.
5. **Board families and the step** stay content; `pbi` is marked `brandable` for registered brands.
6. **Sites**: every plate, lot, crate and the Yard sale carry a site id (`'home'` in stage 2); I is a sum over sites; the away pass loops sites.
7. **The shop's catalogue is content** (`iap.products`), with `hoursOfIncome` in the shared kinds, so stage 5's emblem parts are rows, not code.
8. **The server's bound** has its terms in the state already: Yard sale and van mass, verified pack grants (the ledger), financed less repaid.
9. **The save reconciles forward**: layout 3 accepts 2, and its fields leave room for lists (agreements, sites).
10. **Routes are content and state** (`routes`): a dealer's lot or a rail wagon is one more destination of a bay.

---

## 11. Decisions made in writing, and points for the lead

The two writers' parts (`stage2/part-a.md`, sections 1 and 2; `stage2/part-b.md`, sections 3 to 10) were read against each other, against `RULING2.md` and against the design's "The next build". Where they disagreed with the ruling, the ruling was written; where the ruling is silent, this document decided. Each decision below names what it replaced; each point for the lead names its smallest example and what is written until the lead answers.

### 11.1 Decisions

1. **Grouping starts at rung 3** (`group.fromRung` 3; part-a's choice, kept). Ruling 10.4 says "whenever no boss is within sight"; below rung 3 the leg-by-leg engine is already exact, and grouping it would change the first hour the owner played and REPORT6 measured. See point L16.
2. **The yard plates stand in the south yard by the tipping floor, not in the back field** (part-b's map; part-a's 1.1 and 2.6.1 put every plate in the back field). Grouped runs count their walks and I counts carrying: a baler at x −8 is 66 m from the drop-off, so a yard hand's trip of 80 kg takes 2 × 2 s + 2 × 66 m ÷ 3 m/s = 48 s (1.7 kg/s), against 10.4 s to the scale (7.7 kg/s); in the south yard it is 16 m from the floor. The back field holds the shredder line, the halls and the lead line. See point L9.
3. **The back field is fed from the bays and empties into them** (2.8.1; neither part had a rule: part-a sent the shredder's shred "to its bay" and gave yard plates trays, part-b asked). The shredder makes 6 kg/s of shred; a yard hand carries 80 kg a trip over 66 m. So a back-field plate draws its input from bays by route (a hall by "Take from bays", as the crucible), its output lands in its grades' bays through its own belt weigher with no ticket, and a bay routed to a plate keeps up to the plate's `inbuf` from the round (new refusal `routed`). Batteries reach the `pbb` bay as whole things weighed at the platform scale (E35), and the breaker draws from it. See point L10.
4. **The magnet crane has no travel and serves only its reach** (part-a sent its moves to the shredder; part-b asked for a travel time). A 300 kg move takes 6 s at 50 kg/s, but the shredder is 43 m from its stand. With 3 the shredder draws from bays and needs no crane, so the crane serves the floor, the apron and the shear's and baler's hoppers within `crane.reach_m`, and the shredder's `needs` loses the crane. New key `crane.load_kg` 1,500.
5. **Runs follow the engine step's design** (`notes/engine2-group.md`), which part-a's 2.1 had in outline: one weigh-in per load, each rounded as its own and dated at its own drop time (part-a: "one rounding per grade line"), and a run opened when a fresh boss comes within sight (part-a: "never recomputed"). The decision is still taken at departure; opening is the one way it ends early, and presence samples are in the state, so a tick still equals a jump.
6. **The real-money catalogue is content and state `iap`, not `shop`**: `shop` is already the scrip shop's list in `salvage.content.ts` (both parts wrote `shop[]` and `shop.products[]` side by side). The card kind stays `shop` and the player reads "Shop". The look slot is `colour`, not `fleet` ("fleet" is a banned word, and an id that no player reads is still easier to keep clean).
7. **θ per rung applies from rung 4**; rungs 1 to 3 keep `ladder.theta` §300 as built. Part-a's θ_r = max(§300, 0.01 × T_r × §1,200) gives rung 3 §330 (27.5 t × 0.01 × 1,200), which would change the first hour. Part-b's new key `ladder.thetaFloor` is dropped: the existing `ladder.theta` is the floor.
8. **The three-axle hook-lift is an upgrade of the yard's one truck** (neither part said whether it was a second vehicle; with one driver a second truck would stand idle). `truck2` stays the separate answer of 2.4(b).
9. **The analyser counts as stainless's line for lots** (part-b's question 11): `lots.kinds` takes materials with a line the player owns, and stainless has no plate of its own, so without this the catering-table lot could never come.
10. **The Trade Book is in the stage**, at its smallest (2.13, 4.11): the design's stage-2 table lists it, ruling 7.1 builds "the design's stage 2 with" its additions, and both parts left it out without a rule. It is a record of first weigh-ins, changes no number, and is the last thing cut. See point L15.
11. **The Settings switch "Scrip packs: shown / hidden" stands from the second session wherever the country's switch is on, whatever the rung** (part-a: "no row and no word of packs" until they could show; part-b asked). Ruling 2.4 gives the switch "so that a parent can hide them"; under part-a's reading a parent could not hide packs before rung 4. Where the country is off or unknown the row is absent. See point L14.
12. **The store country is read by a new store-only `storefrontCountry()`** beside the shared `detectRegion` in `src/services/region.ts`, which keeps its device-locale fallback for the other four games' chest rule (part-b put the store-only reader in place of the fallback, which would change four shipped games). See point L12.
13. **A deferred away bonus is kept until it is taken or the next away bonus replaces it** (part-b: "until the market day ends"). Ruling 1.3 allows no timer on any offer, and 9.14 bans "missed"; an offer that silently ends at a day's turn is a timer. The bottom bar's 40 pt button reopens it (part-b's reading of the design's button, kept).
14. **The goal list has 22 goals** (part-a had 21): "Walk into the back field" (`at:backfield`) replaces "Open the back field", which nothing does now that the gateway opens by itself, and "Buy the lead smelter" is added before "Pour a lead ingot", which the breaker alone cannot do.
15. **The closed list of lot payments** (2.14.4) is the round's collection (Sell's set-aside included), a deal delivery, the crate's sorted lot, a sale at the gate and the van's collection (part-a's list, which follows ruling 11.1's "every sale counts"; the design's 5.7 had the gate and the van, not the crate).
16. **The spot buyer's cap is 4.8, 5.5 and 6 minutes of I at rungs 3, 4 and 5** (part-a's 4.8 at rung 3, part-b's shape by rung), so that 15 + 3 × cap stays within 4 % of a day: 29.4 of 29.52 minutes at rung 3, 31.5 of 39.1 at rung 4, 33 of 48.7 at rung 5. See point L3.
17. **Office tabs**: Rota (with the shop's row), Partners, Process board (three pages, part-b's), Agreements, Trade Book. The process board's page is a field of the office ref, not a new card kind (part-b made it one).
18. **At most twenty atlas draws a frame** (AGENTS.md outranks the first yard's 15:00 "twelve"; part-b's question 7).
19. **Words**: "part" and "stock" are not put on the word list (part-b added "part"; it would fail "spare part" and the letter's own line); the letter says "You pay some of the price now." "Green" stays banned in player text, so the tag's colour is drawn and never named. "Yard colours" replaces part-a's "fleet colours".
20. **Sixteen grades**, and `elv` is an object (part-b's "seventeen ids" counted the car).
21. **The ad watcher's tonnes aim is measured at day 6 in stage 2** (part-b), and day 14 stays in the numbers prototype (part-a; D64: stage 2's top is about day 6).
22. **A hall's first pour pours by itself** `works.selfCommission_s` after it became ready, if the boss has not come (part-a's "at the same date" left the date unstated).
23. **The worked examples keep the ruling's I (§54,500 an hour)** so that a reader can check them against ruling 3.2 and 11.4, though 2.3.4 shows I is probably smaller; every such figure is marked as the ruling's or "for scale".

### 11.2 Points for the lead

**L1. The baler cannot carry the lender's letter.** By the payback rule the baler is worth τ_3 × its added margin on the light iron the yard makes: about 8 t/h × §0.12 × 9 h, roughly §9,000 (estimate), under the finance floor of half an hour of I (§27,250 at the ruling's I). The ruling's §80,000 equals its capacity's worth (72 t/h × §0.12 × 9 h = §77,760), which the yard cannot feed. Written: the baler is priced by payback and bought with cash; the letter first shows on the first financeable plate whose price passes the floor and the cash in hand (the shear, the granulator or the depollution bay, if any of them does; else the first hall at rung 4, which would move ruling 7.1's beat "at rung 3 ... the lender's letter" to rung 4). The bots' plate prices (9.2) say which. Do you accept that, or do you want a plate priced to carry the letter at rung 3?

**L2. Is I net?** Ruling 2.1 defines I as rated capacity times a margin, which is net of the feed's price; the design's §54,500 at rung 3's entry is the Night watch's worth, which is sales (C9). The bench's six hours gave §444,734 of sales (about §74,000 an hour) with 232 loads bought at §958 and §1,842 labels, so net may be §20,000 to §30,000 an hour. Written: I is net and its gate is against away NET income. If so every hour-priced number (packs, F_max, the finance floor, ads, lots) is half or less of the design's examples, and the Yard sale's ceiling of §2,443 an hour may be 8 to 12 % of a rung-3 day, over its 8 % cap; written for that case: `reuse.period_s` is tuned until the aim holds. Please confirm.

**L3. The ad cap at rung 3.** Ruling 10.7's one away bonus of 15 minutes and three spot buyers of 5 make 30 minutes of I; 4 % of a rung-3 day is 0.04 × 12.3 h = 29.52 minutes. Written: the spot cap is 4.8 minutes at rung 3 (decision 16). The other way is an away bonus of 14.5 minutes. Which?

**L4. Ruling 9.9 guards nothing now.** "The spot buyer is never offered on an output grade of a plate with an open agreement" was written when only that plate's output repaid; under ruling 11 every sale repays at the same share, and the spot buyer's reward never repays. Written as ruled. Should it go, or apply to every held bay's Sell while an agreement is open?

**L5. The first loan in "about four hours".** T = §69,120 needs §345,600 of lot payments: 3 h 17 m at the first yard's played pace (§1,757 a minute), 4.7 h at the bench's away sales (about §74,000 an hour), about 6 h for a yard left alone at rung 3's entry, nearer 3.5 h late in rung 3. Ruling 11.5's aim holds for a played yard; written as an aim the bots measure. Is "of the yard's running" meant to include time away?

**L6. Lead at rung 5.** θ_5 = §120,000 is about 22 t of lead ingot, about 37 t of batteries from {partner.garage} (15 kg each: about 2,500 batteries). The garage's loads must supply that inside rung 5's span at a person's pace, or lead's θ share falls (D14). Written: the content check 5.2 (4) lowers the share; the bots report which.

**L7. The content's ladder is a placeholder.** Today's `ladder.rungs` has rung 4 at 150 t · range 6 and rung 5 at 800 t · range 7 with one flat θ of §300, and `ceilings_t_h` at rung 3 is 400 t/h against the design's 160, so the design's 800 for rung 4 is only twice rung 3. Written: the design's 1,000 t · 8 and 10,000 t · 9, θ per rung from rung 4, ceilings [6, 110, 400, 800, 3,500]; the bots reset all of them.

**L8. The 150 ms gate may need more than crew runs.** The engine step's profile (727 ms before any change) puts 56 % in crew departures, but drop-off arrivals, the round every 23 s, machine pieces (about 2,200 in six hours) and the rung and goal checks every 5 s away (12 %) remain. Written: the round and the machines are grouped too (2.1.2); if the gate still misses, the engineer reports the largest remaining kind rather than grouping more without you.

**L9. Ruling 7.1 says "at rung 3 the back field with the first works plate (a baler)".** Decision 2 puts the baler by the tipping floor, so the player's first plate is in the south yard and the back field holds the lines from rung 4; at rung 3 the back field is a walk with plots (and goal 1 sends the player there). Do you accept the reading?

**L10. Back-field plates need no hands** (decision 3). It keeps the back field out of I's carrying step and keeps time away cheap, but nobody carries there, so the hand's worth (D4) in the back field is only commissioning and the first pours. The alternative is a works conveyor from the tipping floor (drawn, rated, a plate of its own). Do you accept the bays-as-hub rule?

**L11. Sound budget.** The pack is 2.87 MB of 3.0 and about 22 new files add about 0.45 MB. Raise the limit to 3.4 MB, or encode the music smaller?

**L12. The other games' country fallback.** `src/services/region.ts detectRegion` falls back to the device's locale when the purchase module answers nothing, which ruling 9.5 forbids for packs. Written: a store-only reader for this game beside it (decision 12). May the other games' chest rule keep its fallback, or should it move to the store-only reader too (a change to four shipped games)?

**L13. The bridge's sign** reads "Weight limit 7.5 t" (`chip.bridgeLimit`), yet the three-axle hook-lift that crosses it is heavier than the two-axle truck that may not: only an axle limit explains why. Written: "Axle limit 7.5 t". For the trade desk to confirm.

**L14. The packs' switch before rung 4** (decision 11): a player in a country where packs are on reads "Scrip packs: shown / hidden" in Settings from the second session, days before any pack shows. Intended?

**L15. The Trade Book** (decision 10) was in the design's stage 2 and in neither part. Built small and cut last; drop it to stage 3 if you prefer.

**L16. Grouping only from rung 3** (decision 1) departs from ruling 10.4's "whenever". The bench's yard is at rung 3, so the gate is unaffected. Confirm, or group from rung 1 and re-measure the first hour.

**L17. The baler and the ruling's worked example.** The finance card's worked example (2.14.6, 4.5) uses the ruling's §80,000 plate; with L1 it is no longer the baler. Written as "a plate at §80,000"; the bots' first financeable plate replaces it in the examples once measured.
