# Scrapyard stage 2: the works, buildable

Status: version 1, 26 November 2026 (step `s2-unify`: the two writers' parts made one document; every place where they differed from each other or from the ruling is decided here and listed in section 11). Not yet built, except the engine step's start (`notes/engine2-group.md`, `src/engine/salvage/group.ts`).

**Authority**, highest first: `RULING2.md` sections 1 to 11 (also `yard-decisions.md` part 6; its later sections change its earlier ones, and section 11 replaces 9.8, 10.1 and 10.2); the economy E1 to E41 (`yard-decisions.md`; E40 and E41 are the ruling's); section 14 of `yard-design.md` (D1 to D104); the first yard's document `yard-stage1.md` with its section 12; then this text. Where this text differs from one of them, this text is wrong: say so in `requests.md` with the smallest example, and build what outranks it. Names of types, fields, events, actions, refusal keys and card kinds become the contract's **version 3** (`src/engine/salvage/types.ts`): on a NAME the contract is right once it is frozen (9.1), on BEHAVIOUR this text.

**Numbers** live in `src/config/salvage.content.ts`, are written into `games/scrap-yard/game.json` by `scripts/content/build-yard.py`, and are named here by key with a first value marked (tune), or (fixed) where the ruling fixes it. The bots set every tuned value on the real rules (8.2); the content file is right where it has moved. A figure marked (estimate) is arithmetic for scale, not a value.

**Conventions** (as the first yard's): § scrip, the currency (register id `currency`); m a metre on the ground plane (x east, y south); integer grams and hundredths in the rules, one rounding function `roundMoney`; p̄ a grade's usual price (`grades.<id>.pbar`); "the boss" the player's worker; "yard seconds" the rules' clock `salvage.t`; τ_r the payback time of rung r in production hours; I the rated income (2.3); "a day's income" I × the twice-a-day habit's production hours (12.3 h at rung 3, 16.3 at 4, 20.3 at 5; ruling 10.6). Invented names are register ids in braces ({partner.garage} is Parfitt's Garage; `scripts/content/yard/names.json`), or placeholders in square brackets until the names desk registers them (5.4); code reads ids, never a literal name. The game's store title is the register's `title`.

**The owner has not yet said whether stage 1's look is right.** Sections 1, 2, 5 (except the words' layout) and 8.1 to 8.3 do not depend on the look and are built first; sections 3 (positions only), 4, 6 and 7 wait for the stop of 9.3.

---

## 1. The works

### 1.1 The stage in five sentences

1. At 27.5 t supplied the crane hangs the third sign, the padlock on the back field's gateway drops, works plots appear in the south yard by the tipping floor, and a canopy goes up by the gate with an old cast-iron bath beside it: the "Yard sale", where the public buys single things fit for reuse.
2. The player buys works plates that a flatbed sets down and the boss commissions by standing at them: by the tipping floor a baler, a shear, a granulator, a depollution bay and a magnet crane, an analyser at the scale house that names stainless and bronze, and in the back field the shredder line, two furnace halls and the lead line.
3. A three-axle hook-lift crosses the bridge on Cinder Lane to {partner.garage} and {partner.plumbing}, whose loads bring cars to depollute, car batteries, bronze bushings and stainless sinks; delivered lots and the boss's crate keep his own hand worth more than a manager's taps.
4. From rung 3 [bank]'s plant-finance desk lends on a plate that earns and takes a fifth of every sale until it is repaid, with no date; from rung 4 the shredder line, the rotary and induction halls and the lead line make shred, sorted non-ferrous and ingots under bag-house filters.
5. From the second session a shop on the office's first tab sells looks and No ad videos and, from rung 4 where the store account's country allows, scrip packs worth some hours of the yard's own rated income; rewarded ads pay what their buttons show; the stage ends at rung 5, 10,000 t supplied in nine materials.

### 1.2 What the player has at the start

Two players start stage 2. **A new player** plays the first hour as built and measured (stage 1 unchanged; grouping starts at rung 3, 2.1.1) and reaches rung 3 at about minute 57 (REPORT6: median 57:08, 14 of 15 seeds in 55 to 65). **A first-yard save** (the owner's phone) is carried forward by 2.20 and starts stage 2 at its next sitting with everything it owns.

REPORT6 at the hour's end (normal hand, goal habit, medians): 29.9 t supplied, rank 21 of 26, cash §3,001, R 82.1 t/h, six materials (light iron, cast iron, steel, aluminium, brass, copper). Owned: the three tools and three carriers, yard hands, a cutter, a driver, the hook-lift truck, both strippers, the motor bench, the crucible. Sales at minutes 55 to 60: §1,757 a minute. After three days twice a day: rank 13 to 14, cash §115k to §355k, levels 13 to 17 of 20. Six hours away from minute 60 (seed 257): §444,734 of sales, 232 loads bought, 646 ms of node CPU (727 ms in the engine step's own measurement). Of stage 2 the yard holds only the padlocked gateway to the back field.

### 1.3 The storyboard, rung 3 to rung 5

The habit is the bots' twice a day (a first hour, then 15 minutes every 11.75 h; `yard-bots.md` F6); "S2" is the second sitting, about 12 h in. Times are aims until the bots measure them (8.2).

| # | When (aim) | What arrives | The hand | What the player first sees and decides |
|---|---|---|---|---|
| 1 | 0:57, rung 3 | The third sign; the gateway's padlock drops; the works plots by the tipping floor; the canopy and the bath by the gate | — | Goal "Walk into the back field"; the plots show their plates and prices |
| 2 | 0:58 to 1:02 | The bath's tag "Reusable · §261 at the gate · §105 as scrap" | lifts it whole on the trolley (110 kg) into the Yard sale's chalk zone | Goal "Put the bath on the Yard sale"; the first visitor within one period (240 s); chip "Sold at the gate · §261" |
| 3 | S2, day 0.5 | The away card's new lines; then the shop's row on the office's first tab; rung 3's sign style | — | The shop exists, nothing presses for it; "Buy the baler" |
| 4 | S2 | The baler on a flatbed | stands 5 s at it: "Commissioned · Baler" | The process board's Yard row lights; bales at §0.62 against §0.50 loose |
| 5 | S2 to S4 | The lender's letter, once, at the first financeable plate dearer than the cash in hand (2.14.5) | — | "Bank loan" beside "Save up (about x)": the player chooses |
| 6 | S2 to S4 | The analyser; the three-axle truck; the bridge partners' trial loads; the first delivered lot; the crate | opens the lot (4 to 10 s); stands 45 s at the crate | Stainless and bronze light; range 8 within reach |
| 7 | S4 to S6, day 2 to 3, rung 4 | The fourth sign; the shredder line, two halls, the lead line; scrip packs where the switch is on (the age question first) | commissions each plate | The rotary hall's first pour waits for the boss; route light iron to the baler or the shredder |
| 8 | S9 to S12, day 4 to 6, rung 5 | "{homeYard} · 10,000 t supplied"; lead ingot is the ninth material | — | The repeating goal; a plain "Next build" sign at the key board's place, no date |

The baler is priced by the payback rule (2.6.4), about §9,000 (estimate), which is under the finance floor of half an hour of I; so beat 5 comes with the first financeable plate whose price exceeds the cash in hand (the shear, the granulator or the depollution bay at rung 3, else the first hall at rung 4). See 11, point L1.

**The goal list** (`goals.json` list `stage2`, by id, ≤ 30 characters; the first yard's done grammar plus `at:`, `plate:`, `commissioned:`, `racked:`, `rackSold:`, `lot:`, `crate:`, `analysed:`, `poured:`, `range:`; partner names by register id): Walk into the back field · Put the bath on the Yard sale · Buy the baler · Commission the baler · Buy the analyser · Buy the shear · Buy the three-axle truck · Fetch {partner.garage|short}'s first load · Fetch {partner.plumbing|short}'s first load · Open a delivered lot · Clear the crate · Buy the depollution bay · Supply 1,000 t (8 materials) · Buy the magnet crane · Buy the shredder · Buy the rotary furnace · Pour aluminium alloy ingot · Buy the induction furnace · Buy the battery breaker · Buy the lead smelter · Pour a lead ingot · Supply 10,000 t (9 materials): 22 goals; then the repeating goal "Buy next: {item}" or "Level up: {item}". No goal names a real-money product or a loan; a goal to buy is done by owning, however it was paid.

### 1.4 What each rung opens

| Rung | Tonnes · range (tune) | Opens |
|---|---|---|
| 3 | 27.5 t · 5 (as built) | The works plots (baler, shear, granulator, depollution bay, magnet crane) and the analyser; the back field's gateway; the Yard sale and its sale; plant finance; delivered lots; the crate; the three-axle truck and the bridge partners; the forklift, pallet truck and plasma cutter; plate levels; the Trade Book |
| 4 | 1,000 t · 8 | The shredder line, the rotary hall, the induction hall, the lead line; scrip packs where the switch is on; the next away step |
| 5 | 10,000 t · 9 | The last away step; the stage's top: nothing new is sold, levels and plates continue to the ceiling |

---

## 2. The rules

Pure TypeScript in `src/engine/salvage/`, deterministic, one `advance` for a tick, a jump and time away. The order below is the order of building. 2.1 to 2.4 are the engine step that opens the stage (ruling 10.4; E36(a)): built, benched and measured before any later rule, and nothing in them depends on the look.

### 2.1 The engine step: crew trips grouped out of sight (ruling 10.4, D87)

**2.1.1 The rule.** From rung `group.fromRung` (3), a crew member whose next work starts with NO BOSS WITHIN SIGHT does a RUN: the legs he would walk are planned at that departure, all that the run takes is claimed then, and the run has ONE dated end (`CrewMember.run`, `CrewRun {t0, end, start, k, legS, dest?, loads?, cuts?}`). "Within sight": the boss is fresh (`bossFresh`) and within `reach.sight` (10 m) of the work's start point, its source or its destination. The decision is made at the departure, as the cutter's whole-thing rule already is (E17). Away no boss is fresh, so all work is grouped; live play out of sight is grouped the same way; a tick and a jump call the same function. So a tick equals a jump, and live play out of sight equals time away, by construction. Below rung 3 nothing changes (the hour the owner played stays as measured; 11, decision 1).

**Opening a run.** A run is opened when a fresh boss comes within sight of its start, source or destination (checked at every instant of live play and at every presence sample, `hand.ts bossStep`), and the truck's planned trip and the merchant's long round likewise: the loads, cuts or phases whose planned end is at or before that second land then, in order; the leg under way continues as one ordinary leg with its planned times; the rest of the plan is released and its claims cleared. Presence is the only opener: no action touches what a run has claimed.

**2.1.2 What is grouped.** A run lasts at most `group.maxRun_s` (300 s, tune 120 to 600); the first trip always goes, however long.
- **Yard hand**: the first trip is chosen exactly as today (S12's order, E35, E4); more trips of the same kind, from the same source to the same destination, are added by the same in-place choice while the run stays within `maxRun_s` and a next load waits. Each load keeps its own pick and drop times (`RunLoad {claims, spot, grade, pickAt, dropAt}`); at the run's end each load is picked and delivered in order: one weigh-in per load, each rounded as its own and its ticket dated at its own drop time, or one feed (a feed run fills at most the hopper's room at departure).
- **Cutter**: the first thing as today; more things at the same place in the same score order while walks and whole cuts stay within `maxRun_s` (`RunCut {thing, walkEnd, cutEnd}`); at the end every thing is cut whole, its pieces on the place's pile in cut order.
- **Driver** (each truck's): the seven phases of a trip are planned at departure; one dated end; at it the phases land at their planned times in order: the hook is paid (earmarked since departure) and the empty skip set down dated at the hook's time, the bridge ticket dated at the weigh's end, the load tipped, the truck parked.
- **The merchant**: a round that leaves with no boss within sight of its stand is away max(`merchant.round_s`, `group.roundAway_s` 120 s, tune 60 to 300).
- **Rate machines** (the first yard's and 2.7 to 2.8's): a piece started with no boss in sight takes every hopper piece of its input grade into one segment, credited by the cumulative rule over their summed grams; a back-field plate drawing from a bay (2.8.1) runs in segments that end only at the events of 2.8.1.
- **The magnet crane** (2.7): moves started out of sight are one run of moves.
- Not grouped: the drop-off, skips filling, visitors, the van, lots and the crate (each one event already).

What is not exact against the first yard's leg-by-leg engine, and is the rule: a run's work becomes visible to others at its end (cash, supplied and the bays move in steps of a run); a run takes what waits at its departure (pieces cut during it, a level bought during it, apply from the next run); a skip a grouped hook sets down is dated at the hook's planned time.

**2.1.3 The bench.** `npx tsx scripts/content/yard-bot.ts --bench away` prints node CPU and the count of events by kind for six hours away from the played minute-60 yard of seed 257 (`yard-bots.md` G) and from a played rung-5 yard. **Gate**: the minute-60 yard ≤ 150 ms. The rung-5 yard: reported, aim ≤ 400 ms; a tick ≤ 1 ms at rung 5. For scale: 232 loads were about 1,600 driver phases; grouped they are 232 ends. If the gate misses, the engineer reports the largest remaining kind with its count; no other grouping is added without the lead.

**2.1.4 Tests.** Tick equals jump minute by minute across grouped runs (`tickjump.test.ts`, `grouping.test.ts`); a live advance with a fresh boss standing out of sight of every station equals the away pass over the same span in cash, supplied and every stock; a run opened by the boss's approach lands what its plan had landed by then and nothing more; no run exceeds `maxRun_s` unless it is one trip; a claimed piece is delivered once; at rung 2 the frozen states advance exactly as before.

### 2.2 Hold never stops the yard (E40, ruling 10.5, D88)

At a driver's departure check (2.14 of the first yard, step 5), when the boss is not fresh, a driver is idle with a full skip waiting, cash above the earmarks is below that skip's price, and the merchant waits with nothing collectable, the held bay worth most at today's price leaves Hold and the round loads it at once: one bay a check. The away card names it ("Sold from hold to keep the yard running: {grade}"); event `holdReleased {grade}`. Grams set aside by Sell are already sold and are not touched; a bay reserved by a route (2.7.1) is not held and is not released.

Worked example (`yard-bots.md` C5, seed 1): at the end of sitting 2 every one of 14 bays was held and cash was §524; the next 11.75 h away paid §0. Under E40 the first check releases the bay worth most, the round pays it, and while cash stays under the farm's §958 skip the next check releases the next. Test: from that state (`held14`) an absence pays more than §0 and lists the bays released, one a check, the most valuable first.

### 2.3 Rated income, I, from assets (ruling 2.1, 10.6; D27)

**2.3.1 The measure** (fixed in form). `ratedIncome(c, s)`, § an hour, NET: what the present assets earn in an hour with no boss, full feed from what the yard owns, at p̄, less what the feed costs. It is the steady state of 2.1's grouped engine in closed form over the same rate functions:
1. **Sources**, kg/s by thing: the drop-off's mix over its period; each open partner's L skips over max(`fill_s`, the trip time ÷ the trucks that serve it); their reusable batches.
2. **Steps**, each a capacity over the share of source mass that needs it: cutting (cutters' power over the mix's hardness, plus the shear); carrying (yard hands, plus the magnet crane on ferrous within its reach); each plate's rate on its input; the trucks.
3. **R_bind** = min over steps of capacity ÷ that share.
4. **m̄** = the value at p̄ of what a kilogram of source becomes with the plates owned (each up to its rate; a plate with several recipes, or a shared input with several routes, at its LOWEST margin, ruling 10.6), less the label price of bought feed a kilogram.
5. **I** = 3,600 × R_bind × m̄, plus the Yard sale's min(the reusable flow's gate value, `reuse.refPrice` ÷ `reuse.period_s`) and the van's, each an hour.

It never reads sales, cash, holds, routes as set or the market step; it is 0 before the first yard hand. `ratedOf` stays as R for the ceilings.

**2.3.2 Frozen where used.** A pack's quote, a loan's terms, an ad reward's cap, a lot's mass and the "Save up" time read I when their card opens or their thing is made, and keep it.

**2.3.3 Gate** (fixed): at the entry and the last purchase of rungs 3, 4 and 5, I is within 0.9 to 1.1 of the measured away net income an hour (`AwayCard.net` ÷ the hours the yard ran) on 13 of 15 seeds. I is net, as ruling 2.1 defines it (a margin is net of the feed's price); see 11, point L2.

**2.3.4 The figure to check first.** The design's §54,500 an hour at rung 3's entry is the Night watch's worth (C9: §106k for two hours), which is sales. The bench's six hours (§444,734 of sales, 232 loads) give about §74,000 of sales an hour; at label prices of §958 and §1,842 the loads cost roughly §250k to §330k, so net may be §20k to §30k an hour (estimate). Every hour-priced number scales with I: the bots measure I before any of them is tuned. The worked examples of this document keep the ruling's figure (§54,500) so that they can be checked against it.

### 2.4 The driver's level, or a second truck (E36(a))

Measured on the first hour and three days with 2.1 in place, (a) first:
- **(a)** `crew.driver.lev` 0.15 → 0.25 (tune), with E31a (a level shortens the whole round, hooking and tipping too) as built.
- **(b)** if (a) misses: a second hook-lift (shop item `truck2`, vehicle, gate rung 3, payback-priced) and a second driver (role slot `driver.1`). `SalvageState.truck2: TruckState | null`; each driver claims the skip full longest that the other has not; both earmarks hold together; the weighbridge and the tipping floor serve one truck at a time (the second waits, dated by the first's end); the second truck parks at stop `park2`.

Aim (E31c): sales at minutes 55 to 60 ≥ §2,000 a minute for the normal hand (today §1,757), with rung 3 still at 55 to 65 minutes and every first-yard beat in band. A change of (a) alters the first hour; it is measured on all of REPORT6's beats before it is accepted.

### 2.5 Materials and grades added; plates as data

**2.5.1 Grades** (`grades.<id>`; p̄ § a kilogram, tune; names in `text.json`; "inference" where the research gives no figure):

| Id | Name | p̄ | Family · material · kind | Bay drawn in |
|---|---|---|---|---|
| `lib` | Baled light iron | 0.62 | fe · lightiron · grade | works bunker |
| `ss` | Stainless 304 solids | 4.80 | nf · stainless · grade | works bunker |
| `ssu` | Stainless, unsorted | 2.90 (inference) | nf · stainless · grade | works bunker |
| `bzs` | Bronze solids | 29.00 | nf · bronze · grade | works bunker |
| `bzi` | Bronze ingot | 42.00 | nf · bronze · product | works stillage |
| `bzd` | Bronze dross | 3.00 (inference) | nf · bronze · grade | works stillage |
| `pbb` | Lead batteries, whole | 1.80 | nf · null · intermediate | battery box |
| `pbp` | Lead paste and grids | 2.20 (inference) | nf · null · intermediate | works bunker |
| `pbi` | Lead ingot | 5.40 | nf · lead · product | works stillage |
| `pp` | Polypropylene chips | 0.90 | nf · null · grade | works bunker |
| `shred` | Shredded steel | 1.26 | fe · steel · grade | works bunker |
| `zorba` | Zorba (shredded non-ferrous) | 6.50 (inference) | nf · null · intermediate | works bunker |
| `twitch` | Twitch (shredded aluminium) | 4.40 (inference) | nf · aluminium · grade | works bunker |
| `znh` | Zinc-rich heavies | 1.50 (inference) | nf · null · grade | works bunker |
| `cug` | Copper granules | 34.80 (inference) | nf · copper · grade | works bunker |
| `dust` | Filter dust, zinc-rich | 0.40 | nf · null · grade | works bunker |

Sixteen grades. The end-of-life car `elv` is an object (a whole thing), not a grade. Nine materials by the stage's end: the first yard's six and stainless, bronze, lead. Lead counts only as `pbi` (batteries and paste are intermediates: they count as tonnes supplied when sold, and give no range). Each new grade has a bay (`bays.<id>`, capacity in kg) drawn at a place of `map.works` (3.3); `pbb` stands in the closed battery box, never a heap.

**2.5.2 The analyser's grades.** A piece spec may carry an assay grade: `[grade, g, n, sprite, assay?]`. With the analyser owned and commissioned, a piece weighs in at its `assay` grade, else at `grade`: the washer's stainless drum (`li` → `ss`), a sink (`ssu` → `ss`), a bronze valve (`brs` → `bzs`). The weigh-in line carries the note "Analysed".

**2.5.3 Plates as data** (`works.plates.<id>`, validated by `schema.salvage.ts`):
`{ row, slot, plot, gate, needs, price, deliver_s, kind: 'rate' | 'batch' | 'station' | 'assay' | 'handling', in: GradeId[] | ObjectId[], feedBy: 'hands' | 'bays' | 'stream', out: [GradeId, share][], waste: [to, share][], reagents: [id, kg_per_kg, price_kg][], rate_kg_s | batch {kg, s, start_share, start_idle}, recipes?, feeds?, lev, maxLevel, inbuf, tray, financeable }`.
`feedBy` says how input arrives (2.7, 2.8.1); `feeds` names the plate a share goes to directly (a line's conveyor); `financeable` is derived (true when `out` holds a sellable grade). **Mass is conserved**: Σ out + Σ waste = 1 + Σ reagents, as shares of input mass; tonnes supplied are product mass capped at the input's scrap mass, so reagents never mint tonnes. `build-yard.py --check` refuses a plate that breaks it, one whose input no source of its gate brings, and a `feeds` chain out of order (5.2).

### 2.6 Works plates and commissioning; the back field and the process board

**2.6.1 Where plates stand.** From rung 3 the works layer of the map opens (event `backFieldOpen`; 3.1): the yard plates' plots by the tipping floor in the south yard, the analyser's cradle at the scale house, and the back field west of the old fence with the plots of the shredder line, the halls and the lead line, each row in its processes' real order (3.3). Each plate stands on its own fixed plot (`map.works.places.<id>`).

**2.6.2 Buying.** A plate is a scrip shop item (`shop[] {key, kind: 'works', place: plot, price, gate, needsItem, deliver_s}`) bought on its plot's card or its process-board plate with `buy(item, shownPrice)`, cash only, unless financed (2.14). Its card shows the price, what it takes and makes ("Light iron → Baled light iron · +24 % on light iron"; no absolute tonnes an hour, first yard 12.13), its gate, and after the letter, on a financeable plate, "Bank loan" beside "Save up (about x)". A locked plate shows its gate and nothing else.

**2.6.3 Delivered, installed, commissioned.** Bought, it is `arriving` by the machine flatbed until purchase + `deliver_s`; arrived, it is `installed` and works nothing. It is **commissioned** when the boss stands within `reach.place` of its plot for `works.commission_s` (5 s), or by itself at arrival + `works.selfCommission_s` (1,200 s), whichever is first (design 3.4: the boss is worth 20 minutes of its output); away, at that date. A hall's first heat waits at "Ready to pour" for the boss (S11) and pours by itself at `works.selfCommission_s` after it became ready.

**2.6.4 Levels and prices.** Levels 1 to `works.maxLevel` (10), each +`works.lev` (0.15) of the level-1 rate, priced by the first yard's level rule with its τ capped at τ_r. A plate's price is set by `build-yard.py` by the payback rule: τ_r × the ΔI it adds on the bots' reference yard at its planned moment (`bots/plates.json`, written by the script), at least `works.floor` (§3,000).

**2.6.5 The process board** (D16). New rows of enamel plates, joined as a tree, each a tap from its card: **Yard** (Magnet crane · Shear · Baler; Analyser · Depollution bay · Granulator); **Shredder** (Shredder → Eddy current → Sensor sorter); **Melt** (Crucible [first yard] → its recipes; Rotary furnace with its filter; Induction furnace with its filter); **Lead** (Battery breaker → Lead smelter with its filter). Each hall is bought with its filter (one price, one plot), so no furnace runs without one (L3). The greyed row keeps Lithium · Platinum group and iridium · Tungsten, naming the material only. The board's pages are 4.4.

### 2.7 The yard's plates (south yard; gate rung 3)

Level-1 numbers, all (tune). These plates are fed by yard hands, the magnet crane or the forklift (`feedBy: 'hands'`), and their trays are carried to the platform scale by yard hands, as the first yard's machines.
- **Baler** (rate): `li` → `lib` 1.00; 20 kg/s; inbuf 500 kg, tray 2,000 kg; fed by route (2.7.1).
- **Shear** (rate): whole things of the torch's tier made of steel (beams, tanks) and `hmsu` pieces → `hms` 1.00; `shear.P` 15 ÷ hardness kg/s (a beam: 6 kg/s); whole things come by the magnet crane or the forklift, pieces by yard hands. It widens cutting, which binds late in the first yard (C3).
- **Analyser** (assay; its cradle at the scale house, commissioned by standing there): every weigh-in uses 2.5.2; no rate, no tray; not financeable.
- **Granulator** (rate): `tcab` → `cug` 0.35, waste 0.65 plastic fluff to the licensed contractor; 0.14 kg/s.
- **Depollution bay** (station): one `elv` at a time on its apron (by the forklift, the magnet crane, or tipped within the crane's reach); 600 s a car (`depollution.s`); out whole: a `pbb` battery, four `alw` wheels, a `tcab` loom, the converter (source `{type: 'partner', partner: 'partner.garage', ref}`; a test refuses any other), the `cbody` shell weighed whole where it stands (W9); fluids and tyres to the licensed contractor in sealed drums ("Fluids drained · to licensed contractor"). A car is drained before anything comes off it; nothing is shown of how.
- **Magnet crane** (handling; stand by the tipping floor): moves whole ferrous things and ferrous pieces from the tipping floor and the depollution bay's apron into the hoppers of the shear and the baler and onto the apron, within `crane.reach_m` (9 m) of its stand, at `crane.rate` 50 kg/s, one dated move at a time, a move of at most `crane.load_kg` (1,500 kg) (a run of moves out of sight, 2.1.2). It has no travel: it serves only what its reach holds (3.6 checks it). No output grade: not financeable.

**2.7.1 Routes for a shared input.** Light iron can go to the baler (by yard hands) or, from rung 4, to the shredder (from its bay, 2.8.1); zorba to its bay or the sensor sorter; `tcab` to its bay or the granulator. A route is set on the input's bay card (`setRoute(grade, to)`, to a plate id or `'bay'`; default the plate bought last) and stored in `SalvageState.routes`; yard hands read it at departure, a bay-fed plate reads it at each segment. I counts the lower-margin route (2.3.1).

### 2.8 The shredder line and the melt lines (back field; gate rung 4)

**2.8.1 How the back field is fed and emptied** (a decision of this document; 11, decision 3). The back field is 40 to 110 m from the platform scale; no yard hand carries to or from it. Instead:
- **In**: a back-field plate draws its input from the bays (`feedBy: 'bays'`). A rate plate draws from every bay whose route names it, by the cumulative rule at its rate; a hall is charged by "Take from bays" by mass, as the crucible is (E6, S11), and refills itself from the bays after each pour while its recipe's grades hold enough. A bay routed to a plate keeps up to the plate's `inbuf` for it: the round collects only the stock above that, and Sell on the reserved part is refused (`routed`).
- **Out**: a back-field plate's output goes into its grades' bays as it is made, through the plate's own belt weigher (a rate plate by the cumulative rule; a hall at the pour; drawn as the works bunkers and stillages of 3.3). It has no tray and no ticket; a chip "Weighed at the works · {grade}" rises only while the boss can see it.
- **Within a line** (`feedBy: 'stream'`): the eddy current takes the shredder's non-magnetic stream on its conveyor; it has no hopper of its own.
- A segment of a bay-fed plate ends only when a routed bay empties or refills from empty, a route changes, the plate's level changes or a heat starts or ends: so time away costs a few events an hour.

**The shredder line** (a row of three plots in order):
- **Shredder** (hammer mill and drum magnet, rate): takes `cbody`, `appl` and `li` from their bays by route; 8.33 kg/s (30 t/h); out `shred` 0.72; the non-magnetic stream 0.28 goes to the eddy current when owned, else to the licensed contractor as shredder residue (waste).
- **Eddy current** (rate; needs the shredder; `feedBy: 'stream'`): out `zorba` 0.286 of the stream (8 % of mill input), the rest residue (waste).
- **Sensor sorter** (rate; needs the eddy current): takes `zorba` by route; out `twitch` 0.60, `no2` 0.15, `brs` 0.12, `znh` 0.08, `ss` 0.05; 1 kg/s.

**The rotary hall** (batch; furnace and filter): 2,000 kg, 2,400 s; recipe `alu` (`alw`, `alcast`, `twitch`) under salt flux (reagent 0.05 kg a kg at §0.30, paid at the heat's start, never by the clock): out `ali` 0.88, `ald` 0.055, `dust` 0.015, salt slag 0.10 to the licensed contractor. A heat starts when full, or at 40 % after `start_idle` 60 s without feed.

**The induction hall** (batch; furnace and filter): 500 kg, 480 s; recipes `brass` (`brs` → `bri` 0.97, `brd` 0.015, `dust` 0.015) and `bronze` (`bzs` → `bzi` 0.97, `bzd` 0.015, `dust` 0.015); `setRecipe(plate, recipe, confirmHeel)` as the crucible's (a change pours the heel without refilling, S8 of the first yard's 12). For I: the lower-margin recipe.

**The lead line** (if the stage runs over it moves to stage 3, `ladder.rungs[5].range` falls to 8 in the cut content, and the no-dead-end test and the bots run again on it, ruling 10.3, D86):
- **Battery breaker** (rate): `pbb` from its bay → `pp` 0.06, paste and grids `pbp` 0.64; electrolyte 0.30, neutralised with soda ash (reagent 0.05 kg a kg at §0.40), leaves with the soda as 0.35 to the licensed contractor; 0.28 kg/s (1 t/h).
- **Lead smelter and kettle** (batch; needs the breaker; with its filter): 1,000 kg of `pbp` by "Take from bays", 1,800 s: `pbi` 0.92, `dust` 0.02, slag 0.06 to the contractor. A battery's lead ends as about 0.59 of its mass in ingot.

No card shows a recipe's concentration or a temperature (L3); every pour is under a hood with a person in face shield and aluminised apron (the boss, else a hall hand drawn with the hall, not a crew role).

### 2.9 The bridge partners and the stage's vehicles

**The bridge.** {partner.garage} and {partner.plumbing} stand past the bridge on Cinder Lane (`map.lane.garage_m`, `plumbing_m`, 3.3.3). The **three-axle hook-lift** (`truckBridge`, vehicle, gate rung 3), whose axle loads the bridge allows, opens both; it is an upgrade of the yard's one truck (the same `TruckState`, now three-axle, serving every partner; 11, decision 8), so one driver keeps one truck unless 2.4(b) adds `truck2`. Each partner has a trial load at a fixed price, then skips in rotation with labels fixed at fill (E3, E20, E26).
- **{partner.garage}** ([garage contact] on the business card): batteries (`pbb` whole, 15 kg each), alloy wheels, bronze bushings (`bzs` pieces), looms (`tcab`), converters with their source; once the depollution bay is owned, `elv` cars ("End-of-life car · to be depolluted at your bay"); never a car before.
- **{partner.plumbing}** ([plumbing contact]): copper pipe (`no2`), brass fittings, bronze valves (`brs`, assay `bzs`), stainless sinks (`ssu`, assay `ss`), cast-iron baths and radiators (reusable by tag, 2.12).

Label prices k × as found (k 0.85, tune); three fifths of a margin from the yard's work (E20).

**Vehicles and tools** (scrip shop items, gate rung 3, payback-priced):
- **Pallet truck** (carrier, 300 kg; the boss's).
- **Forklift** (vehicle): entered by walking into it, left with "Step out"; carries whole things and pieces up to `forklift.load` 1,500 kg at `forklift.v` 3.5 m/s; puts a load into a south-yard hopper or onto the depollution apron by standing in its zone; the boss only (no hired forklift driver in this stage).
- **Plasma cutter** (tool, tier 3, P 60): the boss's and every cutter's power on steel.
- The **second truck** if 2.4(b) is taken.

### 2.10 Delivered lots and the crate (the hand's worth; design 3.4, D4)

**2.10.1 Delivered lots.** From rung 3, at `lots.nextAt` (every `lots.period_s` 10,800 s, tune 7,200 to 14,400), if fewer than `lots.max` (4) wait, a named partner's lorry sets a lot on the oversize pad (`ThingAt {at: 'lot', k}`) and nextAt += period; with four waiting, the next comes the instant one is opened. Its kind is drawn by `hash01(worldSeed, 'lot', n)` among `lots.kinds` whose material has a line the player owns (the analyser counts as stainless's line; 11, decision 9): a bronze ship's bell, an aluminium engine casing, a crate of bronze bushings, a stainless catering table; else an intermediate sold whole. Its mass is fixed on arrival so that its prepared value at p̄ is μ × I then, μ = `lots.mu_min` (15 minutes at rung 3, 18 from rung 4; tune 10 to 25); its label prints partner, thing, mass and "about §x prepared". Only the boss opens one: it cuts in `lots.cut_s` 4 to 10 s whatever its mass (each piece stands for a batch, its mass printed). A lot never expires; away, at most four wait. Worked example: at I = §54,500 an hour a lot at rung 3 is worth §13,625 prepared.

**2.10.2 The crate.** From rung 3, when a load is tipped, each thing goes to the crate at the oversize pad (`ThingAt {at: 'crate'}`) instead of the floor when `hash01(worldSeed, 'crate', uid)` < `crate.share` (0.15, tune 0.10 to 0.20) and the crate holds fewer than `crate.max` (12) things. The boss standing `crate.clear_s` 45 s at the pad clears it at any size: everything in it is sorted and paid on one ticket, "Sorted by hand · {n} things", at `crate.u` 1.6 (tune 1.4 to 1.8) × its prepared value at the step's prices, its mass supplied at its prepared grades. Not cleared within `crate.hold_s` (43,200 s) of its oldest thing, it goes to the floor's crews as ordinary things (`crateToCrew`): nothing is lost. Worked example: the farm's skip (§1,320 prepared) puts about §198 in the crate; cleared, it pays §317, so the boss's 45 s gain about §119 a farm load over what crews would make.

Aims (D4), from rung 3: the 45-minutes-a-day habit working the hand earns at least a fifth more than one managing from cards; no mechanism gives over three fifths of the gain.

### 2.11 Rungs 4 and 5, ranges, ceilings, away caps, rivals

- `ladder.topRung` 5 (the first yard's `STAGE_TOP_RUNG` 3 becomes content). `ladder.rungs[4]` {t 1,000, range 8}, `ladder.rungs[5]` {t 10,000, range 9} (tune; the design's values replace the content's placeholders 150 t · 6 and 800 t · 7). Rungs 6 to 9 show a padlock and their tonnage only.
- **Range per rung**: a material counts toward the range when its supplied value at p̄ reaches θ_r. θ_r = `ladder.theta` (§300) for rungs 1 to 3, as built (the first hour unchanged); from rung 4 θ_r = max(`ladder.theta`, `ladder.thetaShare` 0.01 × T_r × §1,200 a tonne): rung 4 §12,000 (2.5 t of stainless solids, 414 kg of bronze solids), rung 5 §120,000 (22 t of lead ingot, about 37 t of batteries). The content script checks each metal's θ_r against the stage's sources at a person's pace and lowers that metal's share where needed (D14; 11, point L6).
- **Ceilings**: `ceilings_t_h` [6, 110, 400, 800, 3,500] (tune; E30's guard, about 1.3 × an always-on full spender's capacity on the rung).
- **τ_r**: `tau_h` [—, —, 9, 22, 45] (tune ± 30 %), for plate prices and level caps.
- **Away caps**: `awayCapByRung_h` [0.5, 2, 4, 6, 8]; the Night watch adds `nightWatch_h` 2: 8 h at rung 4 and 10 h at rung 5.
- **Rivals** up to the one passed at rung 5 keep the first yard's formula and guard (E27, S17, D19), their T0 set by the bots: one passed every one or two sittings, no gap over three days.

### 2.12 The reuse rack and its sale ("Yard sale"; rulings 5.1 to 5.6, 10.10; D48 to D53, D93 to D95)

Content `reuse.*`; place id `reuseRack`; in player text "Yard sale", never "the rack" (the tool rack's word).
- **Where**: under a canopy by the gate, new at rung 3; `reuse.slots` 6, +`reuse.levelSlots` 2 a level, `reuse.levels` 3 (the last thing cut). `ThingAt {at: 'rack', slot}`.
- **What**: single things of `reuse.kinds` (bath, radiator, bicycle, crate of brass taps, stove, gate), reusable when `hash01(worldSeed, 'reuse', uid)` < `reuse.share` (0.25, tune 0.15 to 0.35): fixed when made, a pure function of the uid, so no field is saved. Never: anything electrical or sealed, cylinders, batteries, converters, car parts (`reuse.never`, a content check). Its plate shows the green tag before any choice: "Reusable · §{q} at the gate · §{v} as scrap", at the present step.
- **The boss**: standing by a tagged thing lifts it whole instead of cutting it, if his carrier holds it; walking into the Yard sale's chalk zone sets it on the first free slot (`racked`). While he is in the yard a tagged thing is his: he racks it or cuts it.
- **Away**: yard hands rack tagged things within `crew.hand.load` (80 kg) from the drop-off and the floor, first in S12's order while a slot is free. A tagged thing nobody present can lift (the 110 kg bath with only yard hands), and every tagged thing while the rack is full, is cut as any other, and its tag says so.
- **The sale**: one dated field, `reuse.nextAt`. At it, if the rack holds anything, a member of the public (drawn on foot off the drive line: wicket, rack, gatehouse window, wicket; the walk is the frame's) takes the oldest thing and pays q = roundMoney(`reuse.factor` 2.5 × v), v its prepared scrap value at the posted price of that step; ticket `rackSale` "Sold at the gate · {thing} · §q"; its mass is supplied at its prepared grades. The next visitor is dated nextAt + `reuse.period_s` (240 s) × q ÷ `reuse.refPrice` (§162.88, a radiator at p̄); when an empty rack gets a thing at t, nextAt = t + period. So the public pays at most refPrice ÷ period, §2,443 an hour at the first values, whatever stands there, present or away; the bots tune `reuse.period_s` so that the aim holds against the measured I (11, point L2).
- **Batches and the van**: partner loads may carry a reusable batch (radiators in {partnerFarm}'s, gates and railings in {partnerDemolition}'s; the second kind is cut first), printed on the label by thing and kilogram before paying. At the tip it is set down whole at the Yard sale's trade corner (`ThingAt {at: 'corner'}`). When a batch reaches an empty corner and no van is dated, [reclamation dealer]'s van is dated t + `reuse.vanPeriod_s` (1,800 s); it takes every batch waiting and pays `reuse.batchFactor` 1.5 × each batch's prepared value at the collection's step; ticket `vanCollection`.
- **The first moment**: at rung 3, `reuse.firstThing` (a bath, tagged by content) stands beside the canopy.

Worked example (first-yard content): the bath (four 27.5 kg pieces of cast iron solids at §0.95) is §104.50 as scrap and §261.25 at the gate; its visitor dates the next at 240 × 261.25 ÷ 162.88 = 385 s. A radiator: §65.15 and §162.88 (240 s); a crate of taps: §179.20 and §448 (660 s). Aims: Yard sale and van 2 to 5 % of a day's income at rungs 3 to 5, never over 8 %; a minute of the boss's racking ≥ 1.2 × a minute of his cutting; the same present or away.

### 2.13 Goals, the advice line and the Trade Book

**Goals**: 1.3's list, by id, with the first yard's grammar and rules (its 2.10); after the list, the repeating goal.

**The advice line**'s binding rule (first yard 12.17) adds the new stations: uncut tier-3 steel on the floor over `advice.shearKg` (1,500 kg, tune) with the shear owned names a shear level; a plate's hopper (or a routed bay's reserve) 80 % full names its level; a full skip waiting while every driver is busy names the truck's step (2.4); otherwise as built. **The bank's one sentence**: when the advice line's purchase is a financeable plate whose price is above the cash in hand, the letter has been seen and no agreement is open, the line adds "A loan suits a machine that earns." It says nothing else about the bank and never names a real-money product.

**The Trade Book** (design stage 2's table; 11, decision 10): a completion record, never a goal and never a reward. `SalvageState.book {grades: GradeId[], objects: ObjectId[]}` gains an id at the first weigh-in of a grade and the first time a kind of object is weighed or cut; it holds nothing else. Its page (4.11) lists every grade and object of the stage's content, the ones not yet met as silhouettes, each met one with its lesson line (the first yard's 5.5). It changes no number.

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

Metres on the built map's coordinates (x east, y south; back wall `map.north` 15.2, solid to 15.6; south fence 40; east fence 64, the gate on the drive line at y 23.6 to 27.6). Every number is a content key in `map.works.*` (tune); `yard_map.py` is right where a position moves to pass it, and the positions below are first values to be fitted with the checker and LOOKED at (the first yard's map ruling).

### 3.1 Two layers, one checker

3.1.1 **Two layers.** `map` is the first yard's, unchanged, and the whole map below rung 3 (ruling 5.1). `map.works` is merged over it from the tick of `backFieldOpen`: it adds places, plots, openings and drive-line rects and changes three things of the first layer (3.2). `positions.ts` reads the merged map through one function `mapAt(rung)`; no screen reads a layer.

3.1.2 **The extent.** From rung 3 the yard runs from `map.works.x0` (−56) to 64: the back field is the 56 × 24.4 m west of the old west fence. The back wall runs the whole new width. The camera's clamp takes its west edge from `mapAt(rung)`.

3.1.3 **The checker runs twice**: on the rung-2 map (printing exactly today's table: a test) and on the merged map, where M1 to M7 hold and 3.6 is added.

### 3.2 What changes in the first yard's ground at rung 3

- **The wall gate.** Section 2 of the dividing wall (x 24, y 24.4 to 28.4) is `map.works.wallGate`: solid below rung 3, lifted out at rung 3 (the machine flatbed's crane sets its blocks along the wall's foot at x 25.6, y 30 to 34 as dressing). The opening at x 24 then runs y 22.4 to 28.4 (6 m: the people's 2 m opening merges into it).
- **The field fence.** The old west fence at x 0 stays, with two openings: the works road's (y 23.6 to 27.6) and the field gateway (y 34 to 40). The first yard's padlocked gate (`backfield`, centre 6, 37, solid) becomes the gateway: centre (0, 37), 1 × 6, not solid, sprite `plant.gate.field` frame `open`, its sign on the north post. Walking through it does goal 1 (`at:backfield`).
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
| Its apron (`depollution.apron`) | 38.75, 34.75 | 5.5 × 1.5 | no | one `elv` (`ThingAt {at: 'apron', plate: 'depollution'}`) |
| Forklift bay (`forklift`) | 43.75, 38.35 | 2.5 × 3 | no | where the forklift parks and is entered |
| Oversize pad (`oversize`) | 47, 35 | 6 × 3 | no | lots on four 1.5 m squares (x 44.75 and 46.25, y 34.25 and 35.75, `k` 0 to 3); the crate at 48.9, 35 (2 × 2) |

The analyser has no plot: it is a hand-held analyser in a cradle at the scale house's window (place `scalehouse`), commissioned by standing at the scale house; its work package draws it as the scale house sprite's frame `analyser`.

**The Yard sale** (by the gate, south of the gatehouse; `reuseRack` is the place id, "Yard sale" its label):

| Place (id) | Centre | Size | Solid | Note |
|---|---|---|---|---|
| The rack (`reuseRack`) | 56, 39.6 | 4 × 0.8 | yes | its back on the south fence; canopy roof drawn over x 53.6 to 58.4, y 36.9 to 40, posts at the rack's ends |
| Chalk zone (`reuseRack.zone`) | 56, 38.3 | 4 × 1.6 | no | walking into it with a tagged thing racks it |
| Slots (`reuseRack.slots`) | along the rack | 6 + 2 a level | — | `positions.ts rackSlot(k)`, 0.5 m apart, front row then back |
| Trade corner (`corner`) | 59, 39 | 2 × 2 | no | pallets; batches stand on it, touching the rack |
| The first bath (`reuse.firstThing`) | 51.6, 38.6 | the bath's | thing | beside the canopy, 1.55 m off the rack |
| Wicket (`wicket`) | 64, 37.4 | 1.2 opening | — | in the east fence, for the public and the van's crew |
| Gatehouse window (`window`) | 58.3, 29.35 | point | — | on the office's east face |

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
| Battery box (`batteryBox`) | −45.3, 20.3 | 2.4 × 1.4 | yes | the `pbb` bay: a closed acid-proof box, never a heap; touches breaker and smelter |
| Lead smelter hall (`smelter`) | −50, 18.6 | 7 × 6 | yes | smelter and kettle; apron `smelter.apron` (−50, 22.6), 3 × 2 |
| Its filter (`smelter.filter`) | −54.75, 17.1 | 2.5 × 3 | yes | touches the hall, the wall and the west fence |
| Works bunkers (`worksBays`) | −20, 30.6 | 36 × 3 | yes | x −38 to −2: twelve lock-block bunkers of 3 m, 1.4 m high, from the east: shred, lib, zorba, twitch, znh, ss, ssu, cug, pp, pbp, dust, bzs |
| Works stillages (`worksStillages`) | −41.2, 30.6 | 6.4 × 3 | yes | touch the bunkers: bzi, bzd, pbi, ali, ald (the first yard's `ali` and `ald` stillages keep the crucible's) |
| Field sign (`backfield.sign`) | 0.6, 33.4 | 1.6 × 0.4 | yes | "Back field" on the gateway's north post |

3.3.1 **Where stage-2 grades are drawn.** A bay is a grade's stock, drawn at its bay's place (`bays.<id>.place`, `slot`): every grade added by 2.5.1 in the works bunkers or stillages above, `pbb` in the battery box, whatever made it; the first yard's grades stay in the first yard's bays and stillages, and a back-field plate that draws one of them (`li`, `cbody`, `appl`, `alw`, `alcast`, `brs`) draws from those bays (2.8.1: the belt is drawn, nobody carries). When a round's lot holds a grade drawn in the back field the merchant's flatbed stops at stand `works` after `merchant`; the round's duration is the rule's (`merchant.round_s`, 2.1.2), and the frame fits the drive into it.

3.3.2 **The public and the van.** A visitor walks `map.works.visitorPath`: wicket (64.6, 37.4) → before the rack (56, 37.0) → between gatehouse and truck park (58.6, 33) → the window → the wicket, off every drive-line rect and solid. [reclamation dealer]'s van stops on the lane's south kerb outside the fence (`stops.van`, 67.5, 28.6); its two people walk `map.works.vanPath` through the wicket to the corner.

3.3.3 **Lorries, the flatbed, the lane.** A lot's crane lorry stops at `floor` (48, 27.2) and swings the lot onto its square (frame only). The machine flatbed reaches south-yard plots from `southYard`, back-field plots from the nearest of `works` and `breaker`. `map.lane` gains `garage_m` 430 and `plumbing_m` 480 past the bridge at 360; the barrier moves to 520.

### 3.4 The walks (`yard_map.py --routes` on the merged map)

New `map.routes` (first values, metres): `scale-crate` 18, `dropoff-reuseRack` 22, `floor-reuseRack` 13, `floor-crane` 10, `crane-shear` 7, `crane-baler` 9, `crane-apron` 4, `floor-shear` 16, `floor-baler` 16, `shear-scale` 16, `scale-shredder` 66, `scale-rotary` 82, `scale-smelter` 110. Yard hands walk only the south yard's routes; the back-field routes are the boss's (to commission, and to a hall's first pour, which waits for him and pours by itself at its date, S11, so 110 m costs time, not money).

### 3.5 What the camera shows

The first yard's camera rules stand (follow with lead and ease, zoom out while driving the truck, never move without the thumb); no new moment pans it. At rung 3 the rung sign closes where the boss is, the goal card reads "Walk into the back field" and the chevron (or an edge arrow) points at the gateway; plots, bath and canopy appear at the tick, the wall gate is lifted by the flatbed's crane in 10 s (walkable from the tick). The forklift does not zoom out. The first view at a sitting is unchanged (M7). A second hero frame `map.heroWorks` (x0 −31, y0 15.2, 16.7 × 9.7) holds the rotary hall, its filter and apron whole: the store's stage-2 picture.

### 3.6 What the checker must newly enforce (merged map)

1. Everything of `map.works` inside the new box, south of the back wall's face.
2. The works road and turning place ≥ 4 m wide, holding only their stops; the openings where the road passes at least its width.
3. M6 between every pair of solids of both layers.
4. Each hall touches its filter; shredder, eddy current and sorter touch in that order; `works.plates.*.slot` along x in the order of the `feeds` chain.
5. `scale-crate` ≤ 20, `dropoff-reuseRack` ≤ 24, `floor-crane` ≤ 10; the crane's reach (to the nearest edge) covers the floor, the apron and each hopper it serves (2.7).
6. `visitorPath` and `vanPath` cross no drive-line rect and no solid; `stops.van` outside the east fence.
7. M7's first view unchanged at rung 3; `map.heroWorks` holds its places whole at both sizes; `--png` draws both layers, the paths and both frames.

---

## 4. The screens

The first yard's zones, overlays and text limits stand (`yard-stage1.md` 4.1 to 4.6, 12.11 to 12.13). Every card is `CardData` from `cardOf`, re-read every 500 ms and after every press; the screen formats numbers only; what a card shows is what its action applies, and a changed number re-asks. Every screen is checked at 844 × 390, 667 × 375 and font scale 1.3 (`check.ts --all` and screenshots). Nothing in this section is drawn before the stop of 9.3.

### 4.1 Three rulings every new screen obeys

1. **One plate per thing** (first yard 12.12): a plot, the Yard sale, the oversize pad, the crate and a lot each have one world plate; a financed machine's tag and ring are part of its plate.
2. **No real-money button on a working card.** Real-money prices appear only on the shop card and the pack sheet; no plate, card, row, ticket, goal, advice line or refusal names a product.
3. **No shop and no ad on a debt.** A card or ticket SHOWS A DEBT when it prints the finance card's lines, "to the bank", "To [bank]", the tag and ring, or the Agreements page (`CardData.showsDebt`). On it no shop entry and no ad button, and the bottom bar's ad button hides while one is up (the hud reads `frame.debtOnScreen`, set by the rules from the open card and the tickets up). The lender's letter names no amount owed and does not show a debt.

### 4.2 New card kinds and refs

`CARD_KINDS` adds `works`, `finance`, `letter`, `yardSale`, `lot`, `crate`, `shop`, `packSheet`, `ageQuestion`, `packCode`, `awayBonus`. `CardRef` adds `{kind: 'works', plate}`, `{kind: 'finance', plate}`, `{kind: 'letter'}`, `{kind: 'yardSale'}`, `{kind: 'lot', k}`, `{kind: 'crate'}`, `{kind: 'shop'}`, `{kind: 'packSheet', product}`, `{kind: 'ageQuestion'}`, `{kind: 'packCode', mode: 'set' | 'confirm' | 'enter'}`, `{kind: 'awayBonus'}`; the office's tabs become `'rota' | 'partners' | 'processBoard' | 'agreements' | 'book'`, and `{kind: 'office', tab: 'processBoard', page?: 'first' | 'yard' | 'melt'}`. A plot routes through `map.works.places.<id>.card` (`works`); the Yard sale's place opens `yardSale`; the oversize pad opens the nearest lot, or the crate.

`CardData` adds `works?: WorksCard`, `finance?: FinanceTerms`, `agreements?: AgreementRow[]`, `yardSale?: YardSaleCard`, `shop?: ShopCard`, `book?: BookPage`, `bonus?: {amount, kind}`, and `showsDebt: boolean`.

### 4.3 The works plate and its card

**The world plate** (11 pt paper chip, one per plot): gate not met: padlock · name · "Opens at 1,000 t supplied" and nothing else; buyable: "Baler · §9,000"; `arriving`: "On its way"; `installed`: "Stand here to start · 5 s" (`plate.works.commission`) over "Starts by itself in {t}" (`plate.works.selfStart`); running: the name on first sight and within 4 m, and a state chip only when not working ("Hopper full", "Tray full", "Waiting for {grade|short}", "Ready to pour · it waits for you"); financed: the [bank] tag (`chip.works.bankTag`) and an 18 pt ink ring filled taken ÷ T beside the name, nothing else about the loan in the world. Commissioning draws the first yard's work ring over 5 s; at `commissioned` a chip "Commissioned · {plate}" rises for 2.6 s.

**The works card** (right panel, `works`; one per plate, a hall's filter in its hall's card):
- title `title.works.<id>`; lead lines "Light iron → Baled light iron" (`card.works.inOut`) and "+24 % on light iron" (`card.works.gain`: what a kilogram of input gains at p̄, never tonnes an hour); a hall's recipe as the crucible's;
- status as the first yard's keys, plus "Installed · stand here 5 s";
- rows: Level ("Level 3 → 4", "+15 % on this machine", Level up §x); a hall's recipes; a bay-fed plate's inputs and their routes ("Takes from: Light iron · Car body"); the depollution bay's "Fluids drained · to licensed contractor" and its car ("End-of-life car · ref. {ref}");
- foot: `Buy §{P}`, greyed with "Not enough cash: §x more" when short. After the letter, on a financeable plate, `Bank loan` beside it and "Save up (about {h} h {m} m)" (`card.works.saveUp`, (P − cash) ÷ I, I frozen at opening; only the time is "about"). At 844 and font scale 1.0 the three share a row (136 + 112 + 160 pt); at 667 or above 1.15 the line goes under the buttons;
- financed and open: an info row "Bank loan · §{left} left of §{T}" (`card.works.bankLeft`) opening Agreements; the card `showsDebt`.

**Worked example** (the baler at rung 3; first values): "Baler · §9,000" on the plot; card: "Light iron → Baled light iron" · "+24 % on light iron" (bales at §0.62 against §0.50 loose) · `Buy §9,000`. The baler is priced under the finance floor (2.6.4, 11 point L1), so its card has no Bank loan; the first card with one is the first financeable plate whose price passes the floor and the cash in hand.

### 4.4 The process board's pages

The wide card cannot hold seven rows: 4 × 60 + 3 × 12 + 32 = 308 pt already fills the 333 pt at 844. It gets three pages, tabs in its title row, the page of the newest purchase open by default:

| Page | Rows (D16; joined by riveted bars) | Height |
|---|---|---|
| First yard (`first`) | Cable, Motors, Melt (the crucible), as built | 308 |
| Yard and shredder (`yard`) | Yard (two lines of three: Magnet crane · Shear · Baler; Analyser · Depollution bay · Granulator); Shredder (Shredder → Eddy current → Sensor sorter) | 3 × 60 + 2 × 12 + 32 = 236 |
| Melt and lead (`melt`) | Melt (Crucible → Rotary furnace with filter; Induction furnace with filter); Lead (Battery breaker → Lead smelter with filter); greyed (Lithium · Platinum group and iridium · Tungsten) | 236 |

A filter is a sub-plate of 60 pt riveted to its hall's plate, never bought alone. Five plates fit a row at 844 (132 + 4 × 24 = 624 with sub-plates); at 667 plates are 108 with 16 pt bars (a row of five: 604 of 611). Plate lines: "§{price}", "Level 2", "Next §{price}", a padlock and "Opens at 1,000 t" (`plate.opens`). A plate with Buy is selected first; a second tap opens its works card. No plate shows Bank loan (the works card does).

### 4.5 The bank's screens

- **The lender's letter** (centred card, `letter`, once, at 2.14.5's moment): title "[bank] · plant finance" (`title.letter`); three lines: "We lend on machines that earn." · "You pay some of the price now. The bank pays the rest." · "A fifth of each sale goes to the bank until it is repaid. No date." (the share from `bank.shareWords`); foot `OK`. It shows no price.
- **The finance card** (centred, `finance {plate}`, from Bank loan): title "Bank loan · {plate}" (`title.finance`); five lines, label left, amount right: Price · You pay now · The bank pays · Charge · You repay (`card.finance.price`, `.deposit`, `.lent`, `.charge`, `.total`); then "{share} of each sale goes to the bank until §{T} is repaid. No date." (`card.finance.rule`, ≤ two lines); foot `Sign` and `Not now`. Refusals as notes under the foot: `bankOne`, `bankReserve`, `cash`, `ceiling`, `bankTerms`, the gate keys. Height at 667 and font scale 1.3: title 40 + 5 × 28 + 2 × 22 + foot 48 = 272 pt, inside 300.
  Worked example: "Price §80,000 · You pay now §16,000 · The bank pays §64,000 · Charge §5,120 · You repay §69,120" and "A fifth of each sale goes to the bank until §69,120 is repaid. No date."
- **The ticket line.** While an agreement is open every lot ticket replaces its "Paid §x" with "Paid §{x}" in bold over "to the bank §{y} · to you §{z}" (`ticket.bankSplit`, ≤ 38 characters at five-figure amounts; ruling 11.4's words on two lines). Above font scale 1.15 the collection ticket then shows one grade row and "+ n more". Crew chips become "Lot sold · §{x} · bank §{y}" (`chip.lotSoldBank`). The ticket `showsDebt`. Worked example: "Paid §620" / "to the bank §124 · to you §496".
- **The Agreements page** (the office's fourth tab, `agreements`): one row per open agreement: "[bank] · {plate}" / "You repay §69,120 · repaid §12,400" / "§56,720 left · a fifth of each sale"; then the history ("{plate} · §69,120 · repaid {date}"). No shop entry and no ad on it. In stage 2 it never has more than one open row.
- **The away card** adds "To [bank]: §{y}" and "Repaid in full: {plate}" (2.17): it `showsDebt` while an agreement is open, and carries no ad and no shop as before.

### 4.6 The Yard sale, the visitors, the tag, the batch

- **The tag** (the thing's plate, `plate.reuse.tag`): green, "Reusable" / "§{q} at the gate · §{v} as scrap" at the present step, before any choice; a third line "Too heavy to lift: {kg}" when nobody present can lift it, or "Yard sale full · cut as scrap" (`plate.reuse.full`).
- **The Yard sale's card** (`yardSale`, titled "Yard sale"): a row per thing ("§{q} at the gate"), "{n} free places", "Next visitor in {t}", "Sold today: {n} · §{x}", a Level row "More room · {a} → {b} places", the corner's row "[reclamation dealer] · {n} batches · van in {t}". No sale time, no price choice, no looks.
- **Visitors** are drawn on foot (a civilian body, four tints), with no plate; at a sale a chip at the window "Sold at the gate · §{q}" (`chip.rackSold`, money without hundredths from §100) and a `rackSale` ticket in the history ("Sold at the gate · cast-iron bath · §261.25"). The van: chip "[reclamation dealer] · §{x}" and a `vanCollection` ticket by thing and kilogram.
- **The batch on a load's label**: a green line "Reusable: {n} {thing} · {kg} kg" (`skip.reuseBatch`) on the skip plate and card, before Buy.

### 4.7 Lots, the crate, the forklift, the analyser

- **A lot's plate**: "{partner|short} · {thing}" / "{kg} kg · about §{x} prepared" (`plate.lot`); the work ring when the boss stands at it; the lot card (`lot`) repeats the label and "Only you can open it · {s} s".
- **The crate's plate**: "Crate · {n} things" / "Stand here 45 s · goes to the crews in {t}" (`plate.crate`); the work ring fills over 45 s; the ticket `crateLot`: "Sorted by hand · {n} things", grade rows, "Paid §{x}" (and the bank lines while open). At `crateToCrew` a chip "The crate went to the crews".
- **The forklift**: entered by walking into it; the one button reads "Step out"; the carry chip "{kg} / 1,500 kg" (forklift pictogram); refusal toast `forkliftLoad` "Too heavy for the forklift: {kg}".
- **The analyser**: a weigh-in line whose grade came from its assay carries the note "Analysed" (`ticket.note.analysed`); a car's shell line "Fluids drained" (`ticket.note.drained`).
- **A routed bay** (the bay card): a route row "Goes to: Baler · Shredder · Sell from the bay" (`card.bay.route`); a Sell on the reserved part is refused with `routed` "This feeds the {plate}. Send it to the bay to sell it."

### 4.8 The shop and everything around it

**Where**: a row "Shop" at the foot of the office's first tab (Rota), and a row "Shop" in Settings, both from the second session on (after the first away card is closed). Never in the yard, on a working card, on Agreements or on a card that shows a debt.

**The shop card** (right panel, `shop`), sections in this order, each a header row:
1. **Looks**: "Yard colours" ([colour 1] to [colour 6], "Trucks, vests and skips"), "Yard dressing" ([set 1] to [set 4]), "Founder's plaque" ("Poured in your crucible, set by the gate"); each with the store's own price string (`iap.priceOrNull`, "Unavailable" when none, never a made-up price); owned: `Use` / "In use".
2. **Earned**: sign styles of rungs reached and {foundry}'s plate, `Use` / "In use", no price; one not yet earned shows its padlock and "Reach rung 4".
3. **No ad videos**: "Get every ad reward without watching" and its price.
4. **Scrip packs**, only when 2.15.3's four conditions hold (else no header and no word): name line "§{S}", effect line "about {H} hours of your yard's earnings" (`card.shop.packLine`, ≤ 38), the store price. Above headroom the effect line is "Nothing to spend it on yet" with no button; after a purchase landed, the note "Updated: §{a} → §{b}" and Buy asks again.
5. **Restore**, for looks and No ad videos, over "Scrip bought here lives in this device's save."

Worked example (a figure for scale until I is measured: I = §97,000 an hour, the design's late-rung-3 figure): "§194,000 · about 2 hours of your yard's earnings · $1.99". At 667 × 375 and font scale 1.3 the name and effect lines wrap to two lines each and the row grows to 64 pt; the price button stays right (96 to 136 pt).

**The pack sheet** (centred, `packSheet`, before the store's own sheet): "§{S} for this yard" / "Bought scrip lives in this device's save. It is not restored on another device or a new install." / the store price / `Buy` · `Not now`. Buy calls `quotePack` and then the store.

**The age question** (centred, `ageQuestion`, once, the first time a pack row would show): "What year were you born?" Four empty digit boxes and a ten-key pad (60 × 44 keys; no default, no wheel); `OK` greyed until four digits form a year between 1900 and this year. After it: no message about packs; the shop opens with or without the section.

**The code pad** (centred, `packCode`): "Choose a four-digit code" then "Enter it again" when hiding; "Enter the code" when showing again; a wrong code: "That code does not match" (`packCode`). No "forgot" button; Help says "A forgotten code clears only when the game is installed again, which starts a new yard."

**Settings** adds, in this order: "Shop" (from the second session); "Scrip packs: shown / hidden" (a switch row, from the second session wherever the country's switch is on, whatever the rung; absent where packs cannot exist, so a player there never reads of them); in development builds only (`__DEV__`), a grey section "Development": "Store country: Auto · US · DE · Unknown" and "Start at rung 4".

Never on these screens: a crossed price, a timer, a count left, a "most popular" badge, "best value", "ahead".

### 4.9 Ads

- **The spot buyer**: on a held bay's Sell on the price board, a second button beside Sell: "Video · +§{x}" (`card.ad.spot`), x the figure 2.16 computes; with No ad videos owned it reads "Bonus · +§{x}" and grants at once. Hidden on an output grade of a plate with an open agreement, after the day's count, and while a debt shows.
- **The away bonus card** (centred, `awayBonus`, small: 360 × 160): opens after the away card is closed when 2.16 offers it: "For your time away" / "+§{x}" / `Watch a video` (or `Take +§{x}` with No ad videos) · `Not now`. While a deferred offer stands, the bottom bar shows a 40 pt button left of the one button, "+§{x}" with a play mark, which reopens the card; it shows no time. Hidden while a card or ticket that shows a debt is open.
- **When an ad cannot load**: the button shows "Video not ready" greyed (`card.ad.notReady`); nothing is granted, nothing is lost, the offer stands.

### 4.10 The rung signs 4 and 5

Centred card as the first yard's rung sign: "Rung 4 · 1,000 t supplied" and up to three lines of what opens ("The shredder line" · "Two furnace halls" · "The lead line"); rung 5 "{homeYard} · 10,000 t supplied" and "Every machine can still level up". A line "New sign style: rung {n}" with `Use it` (free). The yard's sign over the gate is repainted with the style in use. Where scrip packs open at rung 4 nothing on the rung sign says so.

### 4.11 The Trade Book

The office's fifth tab (`book`): a grid of plates, one per grade and object of the stage's content, by family; a met one shows its name, its pictogram and its lesson line (≤ 48); one not yet met a grey silhouette and "Not yet weighed". A header "{n} of {m}". No reward, no price, no goal.

**Text limits**: plate names ≤ 18 characters, the tag's second line ≤ 31, effect and ticket lines ≤ 38, finance labels ≤ 14, buttons 96 to 136 pt; `check.ts --all` checks every new key at 667 pt and 1.3.

---

## 5. Content

### 5.1 The new content keys (first values; tune unless marked fixed)

Every number is in `src/config/salvage.content.ts` and validated by `schema.salvage.ts`; the list follows the file's order.

| Block | Keys and first values |
|---|---|
| `group` | `fromRung` 3, `maxRun_s` 300, `roundAway_s` 120 |
| `crew.driver` | `lev` 0.25 (E36(a)); if (b): shop item `truck2`, slot `driver.1` |
| `ladder` | `topRung` 5; `rungs[4]` {t 1,000, range 8}, `rungs[5]` {t 10,000, range 9}; `theta` 300 (as built; θ_r's floor and rungs 1 to 3's value); `thetaShare` 0.01 (from rung 4); rungs 6 to 9 tonnage only |
| ceilings, τ, away | `ceilings_t_h` [6, 110, 400, 800, 3,500]; `tau_h` [—, —, 9, 22, 45]; `awayCapByRung_h` [0.5, 2, 4, 6, 8]; `nightWatch_h` 2 |
| `works` | `commission_s` 5, `selfCommission_s` 1,200, `lev` 0.15, `maxLevel` 10, `floor` 3,000; `plates.<id>` per 2.5.3 for baler, shear, analyser, granulator, depollution, crane, shredder, eddy, sorter, rotary, induction, breaker, smelter |
| `crane`, `shear`, `forklift`, `depollution` | `crane.rate` 50, `crane.reach_m` 9, `crane.load_kg` 1,500; `shear.P` 15; `forklift.load` 1,500, `forklift.v` 3.5; `depollution.s` 600 |
| `grades` | the sixteen ids of 2.5.1 with `pbar`, `family`, `material`, `kind`, `sprite`, `picto`, `bay {kind, sprite, place, slot}` |
| `objects` | new things: `elv`, `pbb` battery (15 kg), `bushing`, `sink`, `bronzeValve`, `bath2` ({partner.plumbing}'s), `radiatorCI`, `bell`, `casing`, `cateringTable`, `bushingCrate`, `stove`, `ironGate`, `bicycle2`; piece specs with `assay` (2.5.2) |
| `partners` | `partner.garage`, `partner.plumbing` as the first yard's partners (trial, skip, `fill_s`, `k` 0.85, `opens: 'truckBridge'`, `lane`); batches `reuseBatch: {obj, n}` on {partnerFarm} and {partnerDemolition} skips |
| `shop[]` (scrip items) | `truckBridge`, `pallet`, `forklift`, `plasma`, the plates, `truck2`; each `{key, kind, place, price, gate, needsItem, deliver_s, arrive}` |
| `lots` | `period_s` 10,800, `max` 4, `mu_min` [—, —, 15, 18, 18] by rung, `cut_s` [4, 10], `kinds` |
| `crate` | `share` 0.15, `max` 12, `clear_s` 45, `u` 1.6, `hold_s` 43,200 |
| `reuse` | `slots` 6, `levelSlots` 2, `levels` 3, `share` 0.25, `kinds`, `never` (the content check's list), `factor` 2.5, `period_s` 240, `refPrice` 162.88, `batchFactor` 1.5, `vanPeriod_s` 1,800, `firstThing` 'bath' |
| `bank` | `share` 0.2, `shareWords` ("A fifth" at 0.2, else the percentage), `charge` 0.08, `maxShare` 0.8, `maxF_h` 2, `maxF_tau` 0.15, `minPrice_h` 0.5, `maxAgreements` 1 (fixed in stage 2) |
| `iap` (real money) | `products[]` (ids with the game's prefix: `colour1`..`colour6`, `dressing1`..`dressing4`, `plaque`, `skipAds`, `pack2`, `pack5`, `pack10`, `pack20`; `hoursOfIncome` H 2, 5, 10, 20, fixed), `packsFromRung` 4 (fixed), `packsOff` EEA + CH (fixed at launch), `looks` slots `{colour, dressing, plaque, sign}` |
| `ads` | `awayPerDay` 1, `awayMinAbsence_min` 30, `awayShare` 0.5, `awayCap_min` 15, `spotShare` 0.1, `spotCap_min` [—, —, 4.8, 5.5, 6] by rung, `spotPerDay` 3, `maxDayShare` 0.04 (fixed) |
| `advice` | `shearKg` 1,500 |
| `goals` (`goals.json`) | list `stage2` of 1.3, the new done grammar |
| `map.works` | section 3 |

The real-money catalogue is `iap`, not `shop`, because `shop` is already the scrip shop's list (11, decision 6).

### 5.2 Where the build script's checks grow (`build-yard.py --check`)

It refuses, naming the key and the smallest failing case: (1) mass not kept (Σ out + Σ waste = 1 + Σ reagents, to 1e-9); (2) a plate input no source of its gate brings, a `feeds` chain out of order, a `needsItem` cycle, a `feedBy: 'hands'` plate outside the south yard; (3) a plate price not max(`works.floor`, τ_r × ΔI) from `bots/plates.json`; (4) a θ_r beyond a metal's sources at a person's pace (D14; also on the cut content, ruling 10.3); (5) a `reuse.kinds` object tagged `electrical`, `sealed`, `vessel`, `battery` or `carPart`; (6) a rung where `awayCap_min` × `awayPerDay` + `spotCap_min` × `spotPerDay` > `maxDayShare` × 60 × the habit's hours (rung 3: 15 + 3 × 4.8 = 29.4 ≤ 29.52); (7) a pack's H ≥ τ_4; (8) a partner skip with prepared × (1 − `bank.share`) below its price (farm +§98, demolition +§309 today); (9) the map (3.6); (10) a text key missing from `text.json` or failing `check.ts`.

### 5.3 The words

New text keys by kind (`textKeys.ts`, owner `strings2`): `place.*` (Back field, Shredder, Rotary hall, Induction hall, Lead line, Yard sale, Oversize pad, Works bunkers, Forklift); `title.*` (thirteen plates, finance, letter, agreements, shop, yardSale, book); `card.works.*`, `card.finance.*`, `card.shop.*`, `card.ad.*`, `card.yardSale.*`, `card.bay.route`; `plate.works.*`, `plate.reuse.*`, `plate.lot`, `plate.crate`; `chip.*`; `ticket.*` (rackSale, vanCollection, crateLot, bankSplit, notes); `away.*` (bank, repaid, rack, van, holdReleased, lots, crateToCrew); `goal.*` (1.3's 22); `refusal.*` (2.19); `item.*` and `effect.*` (truckBridge "Crosses the bridge to {partner.garage}", pallet, forklift, plasma, truck2); `lesson.*` (≤ 48: "Stainless: an analyser tells it from steel.", "Bronze is copper and tin.", "A battery's lead is melted, its acid treated.", "Zorba: what the eddy current throws out.", "Bales pay more than loose light iron."); `book.*`; `help.*` (the bank, the Yard sale, scrip packs, the code, ruling 9.14's fictional line). The bridge's chip `chip.bridgeLimit` becomes "Axle limit 7.5 t" (11, point L13; `check.ts`'s number allowance follows).

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
| `look.set1` to `.set4` | [set 1] to [set 4] | the four yard-dressing sets |
| `look.plaque` | (role name) | "Founder's plaque" unless the desk finds a clash |
| `product.*` | (role names) | store product titles: "Yard colours: [colour 1]", "No ad videos", "Scrip pack: 2 hours" (H is fixed by ruling 9.1, so the title names no number that tuning moves; the store page states none) |

`partner.garage` and `partner.plumbing` are in the register already (Parfitt's Garage, Tap Street Plumbing), as are `homeYard` and `foundry`. A hall hand drawn at a pour takes a name from `crew-names.json`.

---

## 6. Art

The look is the art director's (`yard-style.md`), drawn in code in `src/ui/salvage/art/` through the manifest, baked behind the loading animation. Nothing in this section is drawn before the lead's go at the stop of 9.3; if the owner's answer changes the look, `yard-style.md` changes first and this section is drawn to it.

### 6.1 New sprites

| Group | Sprites and frames |
|---|---|
| Yard plates | baler (idle, pressing 3, ejecting a bale 2, tray full); shear (idle, biting 3, a beam fed); magnet crane, tracked (idle, swing 8 headings, magnet on and off, carrying a body or a beam: the magnet never lifts copper, brass or aluminium); granulator in its housing (idle, running 2); depollution bay (roof, drip trays, drums sealed and labelled; a car on the apron in three stages: whole, drained, stripped shell) |
| Shredder line | shredder house with its infeed conveyor and stacker (idle, running 2); drum magnet as part of the house; eddy current and sensor sorter with conveyors (idle, running 2; the sorter's air jets as a live effect) |
| Halls | rotary hall, induction hall, lead smelter hall: portal-frame sheds with the south wall open, the furnace inside in the crucible's phases (empty, filling, heating, ready, pour, cooling); each filter: housing, ducts and a slim stack; breaker under its roof (idle, running); the battery box (closed, open) |
| Bunkers and stillages | twelve bunkers by fill (empty, part, full) per grade look; works stillages per ingot; bales stacked; the belt weighers (a short conveyor with a display) |
| Analyser | a hand-held analyser in a cradle at the scale house window (frame `analyser` of the scale house); the boss holding it at a weigh-in (people sheet) |
| Vehicles | three-axle hook-lift (eight headings, by skip state); forklift (eight headings, forks up and down, a load); pallet truck (a carrier in the hand); the partner's crane lorry with a lot; [reclamation dealer]'s van; the second hook-lift if taken (a tint of the first) |
| Yard sale | canopy, rack, slots with things set on it, the trade corner's pallets, the wicket, the tag (live), visitors (a civilian body, four tints, walk 6 and stand) |
| Lots and crate | the four lot kinds whole and opened; the crate empty, part, full |
| Bank | the [bank] tag (live) and the ring (live, ink on paper, never red); the letter's head mark (ui) |
| Lane | the two bridge partners' sites; the bridge's new sign face |
| Looks sold | six yard colours as TINTS of existing layers (vest, truck cab, skip body): no new sprites; four dressing sets of four to five props each (planters, flags, benches, painted kerbs: sheet D); the founder's plaque in bronze on a post by the gate |
| Looks earned | the gate's sign in five styles (one sprite, five baked faces); {foundry}'s plate |
| Trade Book | a silhouette tint of each pictogram (live) |

Never drawn (`yard-style.md` 11, and for this stage): a furnace without its hood and filter; anyone at a pour without face shield and aluminised apron; open acid, a leaking battery, smoke from a stack (a stack shows a faint heat shimmer only); a battery or a converter on the Yard sale; a bank vault, coins pouring or a price chart near the bank's screens.

### 6.2 Sheets, budget and draws

Sheets A (people and things) and B (plant and vehicles) are full: they pack at 2.75 and 2.5. Stage 2 adds:
- **Sheet C** (2048 × 2048, works plant at density 2.5): the halls, the shredder line, the yard plates, bunkers; statics away from the second hero frame are baked small and drawn up (0.6: halls' far walls, filters, bunkers; 0.75: shear, baler, crane), the rotary hall and its pour at full density.
- **Sheet D** (1024 × 1024 at 2.5): forklift, three-axle truck, crane lorry, van, visitors, the dressing sets.
- Ground: the back field uses sheet G's existing tiles (concrete and gravel); bunker floors are decals in G's spare frames, else drawn live.

**Draw budget**: at most twenty atlas draws a frame (AGENTS.md, which outranks the first yard's "twelve" of its 15:00 ruling). A frame of the back field draws ground, shadows, then runs of A, C and D; a frame by the gate draws A, B and D. The world's draw counter (`world/atlas.ts`) is a test on three views: `?preset=r4&view=works`, `?preset=r3&view=gate`, `?preset=r4&view=south`; each ≤ 20 draws, ≤ 40 actors and ≤ 300 sprites. If a view needs more, sprites that alternate move sheet (the first yard's rule). `atlasProgress()` keeps the calm loop until all sheets are baked; the bake of C and D starts only once the save's rung is 3 or more (a new player bakes nothing new).

---

## 7. Sound

Keys in `src/services/fx/catalog.salvage.ts` (written by `render_yard.py --catalog`), events mapped in `src/modes/salvage/soundKeys.ts`, played only through `fx.play` by the hud's event pump; pitched sounds in E major; segments, not loops (`SALVAGE_SEGMENT_MS`); sound only for what is on screen or the player's own act. Haptics: light on a commissioning and a racked thing, medium on a sale at the gate, a lot opened, a pack granted and a purchase, success on a rung; none for what is not the player's own. Nothing here is recorded before the stop of 9.3.

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
| `gate_bell`, `till` | `visitor` at the window; `rackSold` |
| `van` (as built), `set_down` (as built) | `vanDated` arrival, `vanCollected`; `lotArrived` |
| `crate_sort` (segment 700) | the boss clearing the crate; `crateCleared` plays `coin_big` (as built) |
| `letter_paper`, `deal_stamp` (as built), `repaid_stamp` | `letter`, `financed`, `repaid` |
| `shop_open`, `buy` (as built), `coin_big` (as built) | the shop card; a look; `granted` |
| `ad_reward` | `adPaid` |
| `rung_sign` (as built) | rungs 4 and 5 |

Ducking (`SALVAGE_DUCK`): a pour 0.35 for 2.6 s as built, the sale at the gate 0.7 for 1 s. **The budget**: the pack is 2.87 MB of 3.0 (effects 2.22, music 0.64); about 22 new files at 56 kb/s mono make about 0.45 MB, so the limit must rise to 3.4 MB or the music be encoded smaller (11, point L11). Nothing new is music. A person listens on an iPhone speaker before any sound counts as done.

---

## 8. Tests, bots and people

### 8.1 Rules tests (vitest, frozen test content `src/engine/fixtures/salvage.ts`; no tuned number pinned)

New frozen states, each with its `FIXTURE_EVENTS`: `r3` (seed 257's minute-60 yard at rung 3, the works layer open), `r3fin` (an agreement open), `r4` (shredder line and both halls), `rackFull`, `lots4` (four lots, a crate of eleven), `held14` (C5: fourteen bays held, §524) and `l2save` (the first yard's five states as layout 2). Test plates have round numbers, checkable by hand.

| Rule | Tests (each a file beside its module) |
|---|---|
| 2.1 grouping | 2.1.4 (`grouping.test.ts`, `tickjump.test.ts`) |
| 2.2 Hold | from `held14` an absence pays more than §0 and lists the bays released, one a check, the most valuable first; Sell's set-aside and routed reserves untouched |
| 2.3 I | 0 before the first yard hand; never reads sales, cash, holds, routes or the step (a test changes each and I stays); the lowest-margin recipe and route; frozen where used |
| 2.4 | the driver's level shortens the whole round; if `truck2`: two drivers never claim one skip, earmarks add, the weighbridge serves one at a time |
| 2.5 | mass kept for every plate and recipe of the test content; assay grades only with the analyser commissioned; "Analysed" on the line |
| 2.6 to 2.8 | a plate works nothing until commissioned; commissioned by the boss at 5 s or by itself at its date, present or away the same; a hall's first pour waits; filters bought with their halls; routes read at departure and at each segment; a routed bay keeps the plate's `inbuf` from the round and refuses Sell on it (`routed`); a bay-fed plate's output lands in its bays, tick equal to jump; a full tray stops a south-yard plate and loses nothing; reagents paid at a heat's start only; the crane serves only what its reach holds |
| 2.9 | no car before the depollution bay; a converter's source is a partner's ref; the bridge partners only with `truckBridge` |
| 2.10 | a lot arrives at its date and at most four wait; its printed value equals its value paid at p̄ with arrival's I; kinds only of owned lines (the analyser for stainless); the crate's share by hash; cleared pays u × prepared; at `hold_s` it goes to the crews and nothing is lost |
| 2.11 | rungs, θ per rung from rung 4 (rungs 1 to 3 at `ladder.theta`), ceilings and caps to rung 5; rivals to the one passed at rung 5, from the player's start |
| 2.12 | a sale pays its printed price once; tick equals jump across racking, the restart, the value-dated visitor and the van; nothing on the never list is tagged; each racked kilogram supplied once; the bath dates the next visitor at 385 s on the test content's first-yard prices |
| 2.13 | the bank's sentence only under its four conditions; a Trade Book entry at a first weigh-in and never twice; the book changes no number |
| 2.14 | 2.14.7's list |
| 2.15 | 2.15.7's list; "no real-money button on a working card" walks every `CardData` of every frozen state |
| 2.16 | caps and counts by rung; never on a financed plate's output grade; the away bonus after the bank's share; a deferred offer kept until taken or replaced; no ad button when `showsDebt` on any card or ticket up (a screen test in `hud.test.ts`) |
| 2.17 | the away card's new lines equal what the absence applied |
| 2.20 | the first test written: each `l2save` loads into layout 3 with cash, supplied, every stock and every crew member equal; a layout-3 save round-trips; an open agreement and a pending quote survive |
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
