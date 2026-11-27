# Stage 2's economy, designed again as a whole (s2eco-synthesis, 27 November)

> THE LEAD HAS RULED ON THIS DESIGN: `yard-decisions.md` part 6 section 27. Where that ruling and this text
> differ, the ruling is right: cars stay inside the shredder line (D1 a); batteries and lead wait for stage 3
> (D2 a); the copper hall is built and measured after the core and the trailer is NOT built now (27.3 D3);
> tau 12 / 36 / 48 h; no pack while a Bank loan is open, with a line of its own (D7); levels read one
> function `levelGain` with both sources built from the start (27.4); the copper hall's first values are
> the ruling's (27.5); the numbers are set by 27.6; the fixtures by 27.7. It is merged into `yard-stage2.md`
> after the third measurement.

An amendment to `docs/design/yard-stage2.md`, for the lead to rule on (`yard-decisions.md` section 27). It is
built on the design the judges rated best ("Six that earn", s2eco-few: 6.5, 7 and 7). It takes in the parts they
said the final design must have: the heavy oversize pieces and the bank's honest sentence from s2eco-owner, and the
ratio test, the measured level ladder and the copper hall from s2eco-flows. It leaves out everything they said no
design may do. Each section below gives the rule as it will be. Where the
specification is not named, it stands as it is.

Every figure is REPORT9's (`docs/design/yard-bots2.md`) where it says "measured" or names a table (T8, T11, T12, the walk
of section 9, R1.txt section 2). Every other figure is an estimate marked "about". The bots' third measurement replaces
it. Nothing here changes the first yard below the works' opening. Every rule that is new is keyed on
`layer.ts worksOpened`. That is false at release.stage 1 by construction, and the first yard's rules already return
their own values at rung 3 and below (`ladder.ts levelCapMin`). This is pinned by same.ts and the 75-run comparison
(gate G13).

---

## 0. Why the stage is shaped this way (one inequality)

A purchase can cost more than the cash one sitting brings only if

    price / a sitting's cash = (tau_r / hours away) x (gain / G)  >  1.

At rung 3, with tau_3 12 h and about 4.2 h away from sitting 1 to sitting 2, an item must add about 35 % of G. Only the
three-axle hook-lift does (T8: +47 % of E0; walk +54.37 %). At rung 4, with tau_4 36 h and 8.2 h away, an item must add
about 23 % of G. Nothing in today's stage does: the best is the induction hall at +8.8 %, and one driver level adds
+6.2 %. So the stage has one purchase that is certainly bigger than a sitting: the hook-lift at rung 3. It has a second
at rung 4 only if the rung-4 bill as a whole is bigger than the rung-4 entry purse. That is the case once the copper
hall is in it (C2 below), or if the trailer measures above 23 % of G (C1). The bank, the packs and the "save up" line
are placed where this inequality puts them, and nowhere else. A price is never raised above what an item earns in order
to make a loan or a pack fit (judges' must-not: no toll, no price taken from the player's purse).

The builders run this check on every rung before any tuning round: `build-yard.py --check` prints, for each rung, the
rung's bill (every sold step with payback within 1.5 tau_r) against the normal hand's median cash on return at the
rung's entry. It refuses nothing; it is the lead's line.

---

## 1. The works (amends 1.1, 1.3, 1.4)

### 1.1 The stage in five sentences (replaces 1.1's sentences 2 to 5)

2. The player buys what earns, and only what earns. At the scale house, an analyser that names stainless and bronze.
   At the truck park, the three-axle hook-lift that crosses the bridge. In the tool rack, the plasma cutter. In the back
   field, the shredder line (a depollution bay and a shredder, one purchase), the induction hall and the rotary hall,
   each with its filter, and, if it passes its gate, a copper refining hall. A flatbed sets each machine down, and the
   boss starts it up by standing at it.
3. The three-axle hook-lift crosses the bridge on Cinder Lane to {partner.garage} and {partner.plumbing}. Their loads
   bring cars (only once the shredder line is owned; the hook-lift sets each car down on the bay's own apron), bronze
   bushings, bronze valves and stainless sinks. Oversize pieces come by low-loader from the works' opening: a boiler
   drum, a press frame, and once the plasma is owned the bronze and stainless kinds. The picking table keeps the boss's
   own hand worth more than a manager's taps.
4. From rung 3 [bank] lends on a machine or vehicle that earns, and takes a fifth of every sale until the loan is
   repaid, with no date. The first time this makes sense is the hook-lift, at the first works sitting. From rung 4 the
   shredder line makes shred, and the halls make ingots under bag-house filters.
5. Unchanged: the shop from the second session, packs from rung 4 behind the country, age and Settings switches, and ads.
   The packs listed are the 2- and 5-hour ones (2.15). The stage ends at rung 5, its tonnage supplied in eight metals.

### 1.3 The storyboard (replaces the table's rows 2 to 8 and the goal list)

| # | When (aim) | What arrives | The hand | What the player sees and decides |
|---|---|---|---|---|
| 1 | rung 3 (as built) | The third sign; the gateway's padlock drops; the canopy, the railed bay and the bath; the analyser's cradle at the scale house; the hook-lift's price on its card at the truck park | — | Goal "Put the bath on the Yard sale" |
| 2 | about 3 h after rung 3 | The first oversize piece on the pad by low-loader (a boiler drum or a press frame, tier 3, real mass) | cuts it (4 to 10 s) | "About §x once cut"; worth about a quarter-hour of I |
| 3 | S1 | Goal "Buy the three-axle truck" at about §206,000, more than the cash: the lender's letter when its card is opened | — | "Save up (about x)" and "Bank loan" side by side; a "Meanwhile" line names the second cutter |
| 4 | S1 or S2 | The hook-lift; the bridge partners' trial loads | — | Partners tab: two new cards |
| 5 | S2 to S3 | The plasma cutter; the analyser, started up by standing at its cradle; the bronze and stainless oversize kinds; the picking table | cuts, sorts | Stainless and bronze light; range 8 in reach |
| 6 | S4 to S6, day 2 to 3, rung 4 | The fourth sign; the back field's plots show their prices (they showed them from rung 3: "Opens at rung 4 · §339,000") | starts up each machine; pours each hall's first heat | The rung-4 bill is about one sitting's cash or more; the second loan moment where it is more |
| 7 | S5 to S8 | Driver levels, priced by what they earn ("+§x an hour on your yard's figures") | cuts 2 to 4 pieces a sitting | The truck is what binds; the advice line says so |
| 8 | S8 to S10, day 4 to 5, rung 5 | Rung 5's sign | — | The stage's top (see the list for the lead, D10) |

**The goal list** (`goals.json` list `stage2`, by id, at most 30 characters, 17 goals; the two in brackets only if their
candidate ships):
Put the bath on the Yard sale · Buy the three-axle truck · Fetch {partner.garage|short}'s first load ·
Fetch {partner.plumbing|short}'s first load · Buy the plasma cutter · Buy the analyser · Start up the analyser ·
Cut an oversize piece · Sort the picking table · Supply {t} ({r} metals) [rung 4] · Walk into the back field ·
Buy the induction furnace · Pour at the induction furnace · Buy the shredder line · Buy the rotary furnace ·
Pour at the rotary furnace · [Buy the copper furnace · Pour at the copper furnace] · [Buy the trailer] ·
Supply {t} ({r} metals) [rung 5].
Then the repeating goal "Level up: {item}", naming the level the advice line names. If nothing is named, it names
nothing: "Rung {n}: {t} to go".

Why this order: the hook-lift comes first because it is the largest gain (+54 %, best buy on 15 of 15 seeds). The plasma
cutter is a goal because the normal hand never bought it without one (lots cut 0 in every sitting of every run). It
comes before "Cut an oversize piece" only for the stainless and bronze kinds; the heavy ferrous kinds need no plasma. The
analyser follows the bridge because its stainless comes with the plumber's sinks. The start-up lesson the baler used to
teach moves to the analyser.

### 1.4 What each rung opens (replaces the table)

| Rung | Tonnes · range | Opens |
|---|---|---|
| 3 | as built · 5 | The analyser's cradle; the three-axle hook-lift and the bridge partners; the plasma cutter; the Yard sale; plant finance; oversize pieces; the picking table; the back field's gateway (its plots show their prices) |
| 4 | 1,000 t · 8, retuned by its band | The shredder line, the induction hall, the rotary hall, [the copper hall], [the trailer]; driver levels by their gain; scrip packs where the switch is on |
| 5 | retuned by its band (first value 3,600 t) · 8 | The stage's top: levels continue to the ceiling |

Rung 5's range falls from 9 to 8 (ruling 10.3's own move, since lead leaves; the leadCut bot's dead end of REPORT9 came
from a range of 9 with no lead line). Rung 5's tonnes are set by two aims: rung 5 on day 4 to 6, and rung 5 at most 3
sittings after the last goal purchase (aim 2). Rung 4's tonnes come down by its band if dearer levels slow rung 3.

---

## 2.3 Rated income, made right (amends 2.3.1 item 5 and 2.3.3)

I stays a pure function of the yard's assets. It is never read from sales. Three changes, from the works' opening only.

1. **The replay plays the driver the yard ships.** The calculated partner queue uses the first yard's rule (the skip full
   longest that fits the floor and can be paid for) with the fair count (`truck.fairAfter_trips` 12, 2.4.1), the same
   function `truck.ts driverDepart` uses. It no longer ranks by net per truck-second. The evidence: I/G is 0.91 at rung 3's
   entry, where only the first yard's partners are open and the two orders hardly differ. It jumps to 1.31 at rung 3's
   last purchase and to 1.46 at rung 4's entry, exactly as the bridge partners open (T2). The replay must also see the
   truck bind. T12 gives the driver level dI §0 against dG §6,658 at rung 4's entry and §7,152 at day 3. The replay's
   truck seconds must count the shipped round: the lane runs, the hook, the weighbridge, the tip, and the waits for floor
   room.
2. **The missing terms, now few because the stage is few.** The analyser's assay uplift on weigh-ins (T8 dI 0 against dE
   §3,649). The shredder line: cars drained at the bay's rate, the shell, appliances and light iron shredded (dI 0 against
   §3,782). The rotary hall (dI 0 against §2,959). The oversize pieces are not a term (they are the hand's). The van keeps
   its third (E3) only if the Yard sale's band needs it. The plasma (1.12), the hook-lift (1.15) and the induction
   (0.96) already read close to their measured gain. No term is written for anything the stage no longer sells.
3. **One bounded factor per rung.** kappa_r (content `rate.kappa`, rungs 3, 4, 5) = the median of G / I_replay over the
   reference seeds at the rung's named moments, written by the bots like `plates.json`. The build refuses a kappa outside
   0.85 to 1.15: outside that band a term is wrong, and the term is fixed, not hidden. The first yard's part is not
   scaled below the works' opening; from it, it is read times kappa_3.

**Gates** (2.3.3's, unchanged in form; numbers in G2): the band at the six moments on both boards, and the rule that no
purchase lowers I. One more: **the driver-level check** (G2 R). At rung 4's entry and at day 3, the driver level's dI
lies within 0.7 to 1.4 of its dG on at least 13 of 15 seeds. Levels are priced from dI (2.11), so this check decides
whether they can be.

**If the driver-level check fails after the first build of these changes** (the fallback, not a choice of taste),
levels from the works' opening are priced and advised from the gain book. That is the bots' measured g(L) = g1 x d^(L-1)
for each level ladder, with g1 and d measured on three steps at the level's planned moment, written to
`scripts/content/bots/plates.json` beside the plates. The rest of I stays as calibrated. Off the reference path the book
may drift from the player's own yard. The bots print I/G for the other habits, and a book entry that drifts outside
0.88 to 1.12 is measured again in that context.

---

## 2.6 Works plates: buying, levels and prices (amends 2.6.2, 2.6.4, 2.6.5)

**2.6.2 Buying.** As built, with one addition. A plot whose item opens at the next rung shows its gate and its price from
the rung below ("Opens at rung 4 · §339,000"), so the player can save for it. A plot whose item is not sold at stage 2 is
not drawn (3.1 below). The process board's greyed row names the material of what comes later, as it already does
(Lithium · Platinum group and iridium · Tungsten), with two more entries: "Batteries and lead" and "Cable". No date, no
promise of a build (1.3 beat 8's rule stands).

**2.6.4 The price rule.** ONE RULE FROM THE WORKS' OPENING:

    PRICE = roundPrice(max(works.floor, tau_r x g))

Here tau_r is the payback hours of the item's gate rung: `tau_h` [null, null, 12, 36, 48]. tau_4 stays over 20 h, and
pack20 leaves the list, so that bound no longer binds anything.

- **Machines, vehicles and tools have FIXED prices.** For these, g is the measured gain (ruling 21.1's measure, as built:
  an hour of play by the reference bot plus one capped absence, 15 seeds, sales less loads and reagents) at the item's
  planned moment in the NEW goal order, with every earlier goal item owned. It is written by `yard-bot.ts --plates write`
  into `plates.json`, and `build-yard.py --check` refuses a price off it.
- **Every level from the works' opening** (crew, open partners, the driver) costs tau_r x its calculated gain dI on the
  player's own state (2.3 made right; the gain book if G2 R fails). The level rule (2.11) applies it.
- **Hires keep the first yard's prices.**
- **Below the works' opening**, the first yard's prices and level rule stand byte for byte (pinned).

**The entry rule** (it replaces "a plate that only makes a later plate possible costs the floor"). An item is sold at
stage 2 only if its measured gain at its planned moment is at least 2 % of the yard's G there (mean over 15 seeds) and
no seed is below -1 %. A chain whose parts cannot work alone is sold as ONE item and measured as one (the shredder line).
Nothing costs the floor and does nothing. The walk's noise is a mean |noise| of 0.02 to 0.33 % (worst -1.86 % at r3s1),
so 2 % stands several noise widths clear.

**Levels of plates**: `works.maxLevel` 1 at stage 2. T12 gives every plate level at day 3 dG §0, and walk steps of
-0.06 % to +0.14 %: each plate's rate is set to its feed (E13), so a level adds capacity that nothing fills. Plate levels
come back with stage 3's flows.

**2.6.5 The process board.** Rows: **Yard** (Analyser); **Shredder line** (Depollution bay → Shredder); **Melt**
(Crucible [first yard] → its recipes; Induction furnace with its filter; Rotary furnace with its filter; [Copper furnace
with its filter]). The greyed row as in 2.6.2.

---

## 2.7, 2.8, 2.9 Every machine, vehicle and tool: its fate, its job, and the number its gain stands on

Gains are T8's dE (§ an hour, mean of 15 seeds, s.e. in brackets) against the yard's E0 at the item's planned moment,
and the walk of section 9 (mean, worst). Prices use the new tau_h and are first values. The bots write the real ones at
the new planned moments.

### Sold at stage 2

| Item | Gate | Job | Gain it stands on (measured) | Price (about) | Financeable |
|---|---|---|---|---|---|
| **Three-axle hook-lift** (`truckBridge`, vehicle) | rung 3 | Crosses the 10 t axle-limit bridge; opens {partner.garage} and {partner.plumbing}, whose bronze and stainless are rung 4's 7th and 8th metals | dE §17,145 (528) on E0 §36,530, +47 %; walk r3s1 +54.37 % (worst +44.40 %), best buy on 15 of 15; rated/measured 1.15 | 12 x 17,145 = **§206,000**: 1.8 x the median sitting-1 purse (§115k; §52k to §137k) | yes (new: a vehicle that earns) |
| **Plasma cutter** (tool, tier 4, P 60) | rung 3 | Gives the boss and every cutter P 60 on every material; opens the stainless and bronze oversize kinds | dE §7,210 (903) on §55,975, +12.9 %; walk r3s1 +29.69 % (worst +15.86 %), best buy 15 of 15; rated/measured 1.12. At rung 4's entry the same step is +0.16 % (truck-bound), so it is a rung-3 purchase | 12 x 7,210 = **§86,500** | no (a tool) |
| **Analyser** (assay, at the scale house) | rung 3 | Every weigh-in assayed: mixed stainless to Stainless 304 (§4.80 against §2.90), valves to bronze solids; the plumber's sinks come only once it is owned. The first machine started up | dE §3,649 (331) on §50,832, +7.2 %; walk r3s1 +10.29 % (worst +8.01 %); dI 0 today (a term is missing, 2.3) | 12 x 3,649 = **§43,800** | yes (it earns; above 0.5 h of I) |
| **Induction hall with its filter** | rung 4 | Brass and bronze to ingot (bronze solids §29 a kg to ingot §42). Bronze and copper are the yard's largest flows | dE §9,407 (345) on §114,254, +8.2 %; walk r4entry +8.79 % (worst +5.43 %), best buy on 11; rated/measured 0.96 | 36 x 9,407 = **§339,000** | yes |
| **The shredder line** (depollution bay and shredder, ONE item, two plots, one card) | rung 4 | The bay drains each car on its own apron (the hook-lift sets the car there; no forklift); the shredder takes the drained shell, appliances and light iron to shred. Cars come in the garage's rotation only once the line is owned. A car is drained before anything comes off it (as built) | Shredder dE §3,782 (409) on §107,553, +3.5 %; walk r4entry +3.84 % (worst +3.33 %), measured WITH the bay owned and cars arriving. Bay alone §41 (234): nil, because its cars waited for the boss's forklift and nothing downstream took them before the shredder. Measured again as one item | 36 x about 3,800 = **about §137,000** | yes |
| **Rotary hall with its salt-flux filter** | rung 4 | Alloy wheels and cast aluminium to aluminium alloy ingot | dE §2,959 (433) on §111,488, +2.65 %; walk r4entry +2.12 % (worst +1.53 %). The narrowest margin over the entry rule: if it falls under 2 % of G at its new moment, it moves to stage 3 | 36 x 2,959 = **§107,000** | yes |
| **Driver levels** from the works' opening | rung 3 (sold only when their calculated gain is at least 1 % of I) | The truck is what binds at rung 4; a level shortens the round (E31a). Inside the fence `truck.yardV` (4 m/s) stays: no level makes a truck speed through the yard (the owner's review) | Walk r4entry +6.21 % (dG §6,658, worst +5.68 %, best buy on 15 of 15); day 3 +5.46 % (§7,152); r3s1 -0.23 % (worst -1.53 %): not the limit at rung 3. Probe (owner, 2 seeds, gross): +1 level +5.8 / +6.2 %, +3 levels +17.4 / +16.3 %, +8 levels +34.5 / +37.8 %, +20 levels +46.2 / +45.8 %: the gain falls level by level | tau_4 x dI: **about §240,000** for the first rung-4 level, falling with its gain (about §215k, §190k ...); the card prints the gain | no (a level) |
| **Partner levels**: {partner.plumbing} | from its opening | One more skip in rotation | Walk r4entry +1.28 % (worst +0.68 %); day 3 +0.77 % (worst +0.17 %) | tau_r x dI (22 E3 as built, tau from the new tau_h) | no |
| **Partner levels**: {partner.garage}, {partnerFarm}, {partnerDemolition} from the works' opening | — | Sold only while their calculated gain is at least 1 % of I; otherwise the card reads "Not the limit now: the truck is full" with no Buy | Walk r4entry: garage -1.82 % (worst -2.69 %), farm -3.47 % (worst -4.37 %), demolition -2.51 %; day 3 farm -2.65 %, demolition -2.20 %. These are the walk's five failing steps | as above when sold | no |
| **Crew levels** (cutter, hand, stripper, bench, crucible) from the works' opening | — | As the first yard's, sold while dI is at least 1 % of I | Cutter level r3s1 +10.89 % (worst +3.94 %, best buy on 13); at r4entry +0.00 %; hand r4entry +0.02 % | tau_r x dI: a rung-3 cutter level about 12 x 3,500 = §42,000 | no |
| **Hires** | as built | As built | Cutter hire r3s1 +31.57 % (worst +15.76 %) | the first yard's (§3,600) | no |

Why 1 % for levels and 2 % for machines: a level is one step on a ladder of many, and the walk's noise is at most a third
of a per cent on its mean. A machine is a whole line, and the 2 % keeps every plot the player can see worth its ground.

### Candidates: built and measured after the core, each in its own working copy; they ship only by their gates

| Item | Gate | Job | What its gain stands on today | Price if it ships | Ships if |
|---|---|---|---|---|---|
| **C2. Copper refining hall with bag-house filter** (new; the granulator merges into it) | rung 4 | A tilting furnace fire-refines No. 2 copper and granulated cable to fire-refined copper ingot (new grade `cui`, first value §38.50 a kg against No. 2 at §34.30); slag to a licensed carrier. Looms are chopped to granules as its feed (the granulator's job, which has no gain alone: T8 -§17) | NOT MEASURED. Arithmetic on one seed's flows (s2eco-flows, Na against P1 seed 1, 27 h of rung 4): copper is 4.36 t/h, §149k/h gross, 51 % of the value supplied, and nothing improves it; 0.97 x 38.5 - 34.3 - 0.3 = +§2.75 a kg, about +§12,000/h, about 9 % of G | 36 x g (about §430,000 at §12k/h) | measured g at least 2 % of G (entry rule) and the price grid of `cui` checked against the trade's spread (No. 2 to fire-refined), so real physics and real money hold |
| **C1. Drawbar trailer for the three-axle hook-lift** (new) | rung 4 | The one truck hooks two full skips a trip and tips both. The trailer has its own axles, so the bridge's 10 t limit holds. It is one vehicle with a trailer behind it, not a second truck | NOT MEASURED. The truck binds at rung 4 (driver level +6.2 %, 15 of 15). The probe above is GROSS, from one state a seed, and measures a faster truck, not two skips | 36 x g | measured g at least 2 % of G net; the swept-path check (3.6) passes for the truck and trailer on every drive line (no person, building or plot touched, `truck.yardV` inside the fence, reversing never needed at a tip); tick equals jump. It is a loan moment only if g is at least 23 % of G (section 0) |

The core stage is complete without either. Section 0 says what each adds: C2 makes the rung-4 bill bigger than the
rung-4 entry purse (the second loan moment), and C1 would be a third if it measures large.

### Not sold at stage 2 (their rules and tests stay in the code, dark behind a gate past the ladder)

| Item | Fate | Why (measured) | Where it comes back |
|---|---|---|---|
| Baler | later | dE §205 (184, 10 seeds) on §34,612, 0.6 %; walk +0.56 %. Light iron is 0.8 t/h at stage 2 (flows), so there is no flow to bale; at rung 4 the shredder pays more for it | stage 3, where rail freight pays for density |
| Shear | later | dE §576 (211), 1.05 %; walk +0.06 % (worst -0.69 %). Cutters already cut beams and tanks; the plasma gains 12.5 times as much from the same binding step | stage 4, at a second yard's heavy steel |
| Granulator | merged into C2, else later | dE -§17 (143); walk +0.04 % (worst -0.50 %) | inside the copper hall, else stage 3 with a cable buyer |
| Magnet crane | later | dE §328 (298), median §19, dI 0; pair noCrane +0.0 % at day 1 and day 3 (worst -0.1 %): inert. Hands never bind (hand level +0.02 % at r4entry) | stage 4, with a bay target and a stand by the shredder (s2c-fix-works2.md options 1 and 2), measured first |
| Forklift | cut | dE -§72 (125); its only job was car pad to apron, which the hook-lift now does | stage 3 only if a car lane needs one; the cab rules of 18.3 come with it |
| Pallet truck | cut | dE §323 (187), noise; bought on 0 of 15; oversize pieces are weighed where cut (22 X3) | — |
| Eddy current | later | dE -§469 (415); bought on 0 of 15 | stage 3, with a car lane's volume |
| Sensor sorter | later | dE exactly §0 on 15 of 15 (no zorba without the eddy current) | after the eddy current |
| Battery breaker | later | dE -§4,476 (173), negative on 15 of 15: it makes the yard poorer (ruling 17). The garage's battery loads take the one truck's trips from richer loads, and 1,000 kg of batteries wait in the bay | stage 3's battery hall with lithium, fed by a battery collector's own dated lorry, never the garage's truck time |
| Lead smelter | later | dE §805 (83), 0.66 % of E0; with the breaker the chain is -§3,671 | with the breaker |
| Yard sale rack levels | cut | The take is set by the value ceiling (`reuse.shareI` x I0), not by slots, so more slots add nothing | — |
| Plate levels | cut at stage 2 | above | stage 3 |

With no breaker, the garage brings no batteries, because its condition is never met (2.9 as built). A drained car's
battery goes, whole and closed, to the battery box and is sold as it is (`pbb` at its label price). Nothing waits for a
machine that is not sold.

**3.1 The map** (amends 3.1 and 3.3, map owner): the works layer at stage 2 drops the south-yard plots (baler, shear,
granulator, crane), the forklift's stand, the car pad and the lead area. The depollution bay's plot moves beside the
shredder in the back field, its apron serving as the car's landing (one plot pair for the line). The analyser's cradle
and the back field's plots of the line and the two halls stay; C2's plot is drawn only if C2 ships. The checker passes
on the merged map, the swept-path check covers the hook-lift's route to the apron, and the first yard's map is unchanged.

---

## 2.10 Oversize pieces (amends 2.10.1)

The pieces come from the works' opening, and the boss's cutting is worth his time at every rung of the stage.

- **The three heavy kinds are built now**, rules and masses (names through the register, art in Phase C):
  - a boiler drum: HMS, certified empty (the plate prints "Certified empty"), tier 3, 2 to 12 t;
  - a press frame: HMS, tier 3, 4 to 20 t;
  - a transformer core: HMS 0.70, No. 1 copper 0.25, waste 0.05, tier 4, 1.5 to 6 t.
  `lots.lorry_kg` 20,000 (a low-loader), for the content check's third clause. The two tier-3 kinds need only the torch,
  so pieces come at rung 3 before the plasma. The REPORT9 kinds stay: the bronze propeller and the crate of bushings
  (tier 4, from the plasma; the bushings also need a bronze line), the casing and the catering table.
- **The rules are as built** (22 X1, X3): one piece every `lots.period_s` (3 h) after the works' opening; at most 4
  waiting; a new one a period after the cut that freed the pad; never expire; weighed where cut; only the boss cuts
  (4 to 10 s). The heaviest kind whose worth at usual prices is at most mu x I comes. `lots.ts` already dates nextAt at
  the works' opening and waits for a kind of the right tier and line. No lots.ts change is needed: the goal "Buy the
  plasma cutter" and the heavy kinds are what make pieces come.
- **mu x I reads the CALIBRATED I.** At rung 3, mu x I is about 15 min x §30k to §60k = §7.5k to §15k: a boiler drum of
  about 6 to 10 t of HMS at about §1.20 a kg fits. At rung 4, I falls about 30 % from today's §152k to about §110k, so
  mu x I is about 18 min x §110k = §33k: a propeller of about 1 to 1.5 t, or a transformer core. `lots.mu_min` at rung 4
  may rise toward 25 minutes (its band's top) if E19 (G10) needs it.
- **What they give (estimate).** About 2 to 3 pieces waiting at each twice-a-day return, worth about 15 to 18 minutes of
  I each, cut in about 20 to 30 s in all. That is about half an hour to three quarters of an hour of I a sitting for the
  boss's own hand (D4), and the cut pieces count as earnings played, which lowers E19.

---

## 2.11 Rungs, tau, levels, ceilings (amends 2.11)

- `ladder.rungs[4]` {t 1,000 (retuned by its band), range 8}; `ladder.rungs[5]` {t from 3,600 retuned by its band and by
  the aim "rung 5 at most 3 sittings after the last goal purchase", range 8}.
- `tau_h` [null, null, 12, 36, 48]. The rung spans on the reference hand set these numbers: rung 3 runs from about h 1 to
  h 18 to 22, rung 4 from about h 22 to h 55 to 60 (R1). Anything bought at its first chance on its rung pays for itself
  before the next rung. That is the promise behind the owner's word "investments" (the player text never uses
  "invest", decisions 1.5).
- **Levels from the works' opening** (`ladder.ts levelPrice`, extending 22 E3 from partners to every level):
  price = roundPrice(max(`levels.floor` x floorGrowth^(L-1), tau_r x dI)), with dI the level's calculated gain on the
  player's own state. A level is SOLD only while dI is at least `levels.minShareI` 0.01 x I. Otherwise its card reads
  "Not the limit now" with no Buy, and it is never sold at the floor. Its card always prints its gain: "+§x an hour on
  your yard's figures" (the calculated number, exactly as applied). So a later level that costs less than the one before
  is shown with the smaller gain that makes it so. The level cap (`levelCapMin`) from rung 4 stays 60 x tau_r.
- The ceiling is tested before the money (22 M10), and now also in the plate checks of `actionsWorks.ts` (headroom never
  depends on cash).
- Away caps, the Night watch and the rivals: as built.

---

## 2.12 The Yard sale and the van (amends 2.12's numbers)

REPORT9 T5: the Yard sale and the van take 6.9 % of day 1 (the van alone 6.1 %; max 7.5 %) and 1.8 to 1.9 % of days 2
to 5, against a band of 2 to 5 %. One number moves both ends the same way (`reuse.batchFactor`). The rule as it will be:
`reuse.shareI` becomes a list by rung (`reuse.shareI_r`, rungs 3 to 5), each set by the bots so that the median share of
each day 1 to 5 lies in 2 to 5 %. The first values come from scaling REPORT9 by the calibrated I0 (which falls about 30 %
at rung 4): about 0.5 x today's at rung 3, and about 2.5 x today's at rungs 4 and 5. Never over 8 % on any seed-day. The
rack keeps its slots and has no levels.

---

## 2.13 The advice line (amends 2.13's paragraph "FROM THE WORKS' OPENING")

From the works' opening, price and advice read ONE measure: the calculated gain dI of 2.3 made right (the gain book for
levels if G2 R fails). In order:

(a) **The best buy.** Among everything for sale within the budget, the line names the item with the shortest payback,
price / dI, within 1.25 tau_r. The extra quarter is the band's own error, so an item priced at exactly tau_r times its
measured gain is always named. Ties go to the larger gain. The line prints the gain on the player's own yard: "Buy the
plasma cutter · +§7,240 an hour on your yard's figures". It is the calculated number on this state, never T8's mean.
T8's plasma runs from §1,386 to §13,889 an hour by seed, so a printed mean would not be true for a single player.

(b) **The target, when it costs more than the cash.** If the best buy, or the current goal's item, costs more than the
cash less the driver's reserve, the line reads "Save up for {item} (about {x})", x = (P - cash) / I (2.14.5 as built).
Under it, where the item is financeable and the letter has been seen, the card's "Bank loan" stands. **"A loan suits a
machine that earns." is said only when the card's own numbers favour borrowing**: dI x the save-up time > the charge
(s2eco-owner). For the hook-lift at S1: about 17,000 x 3 h = §51k against §13,200, so it is said. Second line,
"Meanwhile: {item}": the largest-gain item the cash can buy that still leaves the target affordable on return:
cash - p + I x (the yard's away cap) >= P_target. At S1 that is the second cutter (§3,600, +31.6 % at r3s1). It is not
"nothing", which was s2eco-few's arithmetic slip: 115 - p + 4 x 30 >= 206 holds for p up to about §29k.

(c) **Waiting.** When nothing pays back within 1.25 tau_r: the waiting line of 21.5 ("Rung {n} waits for {grade}" /
"Rung {n}: {t} to go"), and on its second line the next rung's main purchase and its price ("Next: the induction furnace
· §339,000").

**One thing asks at a time** (lesson 3 of the first games). The away card comes first. The lender's letter shows only when
the player opens a works or vehicle card (as built), never on return. The goal card and the advice line are lines on the
screen, not dialogs. No centred card follows another without a player's action between them. Gate G15 measures this at a
person's pace.

---

## 2.14 Plant finance (amends 2.14.2, 2.14.3, 2.14.5 and its aims)

Ruling 11's form stands: a fifth of every lot payment until T is taken; no date; nothing grows; no repay button; cash
never below zero; one agreement at a time; the charge fixed at signing; money only by lot payments.

**2.14.2 What may be financed**: every sold machine or vehicle with a measured gain (the hook-lift, the analyser, the
induction hall, the shredder line, the rotary hall, [the copper hall], [the trailer]), from rung 3, priced at least
`bank.minPrice_h` (0.5) h x I. Never a tool, a level, a hire, a look or a pack. Asset finance on a truck is ordinary in
the trade. Ruling 11.3's "a works plate that earns" is widened to "a machine or vehicle that earns".

**2.14.3 How much**: F_max = min(`bank.maxF_h` 6, `bank.maxF_tau` 0.5 x tau_r) x I, which is 6 h of I at rungs 3 and 4.
Today's min(2 h, 0.15 tau) x I caps a loan at about §40k at rung 3, under every purchase that a sitting cannot pay.
F = min(0.8 x P, F_max); d = P - F; charge 8 % of F; T = F + charge. The share stays 0.2 and the reserve stays.

**2.14.5 What the card shows**, added: "While it is repaid you keep about §y an hour", with
y = I - `bank.share` x G_r (the same closed form 2.14.5 already uses for the save-up time with a loan open). A fifth of
gross is about half of net when loads cost 60 to 70 % of gross, and the player must see that before signing. This is the
second and last "about" beside the save-up time. The letter and the finance row stand on the hook-lift's card at the
truck park as on a plot's card.

**The two or three moments a loan is a real choice**:

- **L1, certain: the hook-lift at rung 3's first works sitting.** Worked example (I about §30,000 after calibration):
  P §206,000; F_max 6 h x §30,000 = §180,000; F = min(§164,800, §180,000) = **§164,800**; deposit **§41,200**; charge
  **§13,184**; T **§177,984**. It is offered on every seed: the median purse of §115k (lowest §52k) covers the deposit
  and the reserve, and is below P. Borrowing brings the truck about one sitting sooner: about 4 h x §17,000 = §68k of
  gain against §13,184 of charge. T is taken in about 8 to 9 h of the yard's running (a fifth of about §100k/h gross
  once the bridge runs), so it is repaid during the S2 to S3 or S3 to S4 absence, before rung 4 on every seed (L5).
- **L2, if C2 ships: the last of the rung-4 entry bill.** At rung 4's entry return the purse is about §0.55M to §0.75M.
  The bill is induction §339k + shredder line §137k + rotary §107k + copper hall about §430k = about §1.01M. The advice
  names them by payback, ties by gain, so the copper hall or the induction comes last and costs more than what is left:
  the letter's row. F = min(0.8 x 430k, 6 h x §110k) = about §344k; d about §86k. The gain over the saved sitting is about
  8 h x §12k = §96k against a charge of about §27.5k. Without C2, the bill (§583k) is under the purse on most seeds, and
  the bank speaks at rung 4 only to a yard that spent its purse at rung 3. That is honest, and the stage then has one
  sure loan moment and one sometimes.
- **L3, if C1 ships and measures at least 23 % of G: the trailer** at about S5 to S6. One agreement at a time: if L2 is
  still open (T about §371k, taken in about 15 to 17 h of running), L3 waits until it is repaid. That cost is real and
  printed in the bots' table, not hidden.

**Aims become gates** (G5): L1 at sitting 1 or 2 of rung 3; L5 repaid before rung 4; the always-finance bot at most 10 %
sooner to rung 5; the never-finance bot inside every band; and FELT cash: the number of sittings at which the
always-finance bot's purse after buying is lower than the never-finance bot's, printed per seed. The 2.14.7 tests stand,
with one more: the hook-lift financed (a vehicle) moves through `signFinance` as a plate does, and is never taken back.

---

## 2.15 The shop and the packs (amends 2.15.1 and 2.15.4)

**The list.** pack2 ($1.99) and pack5 ($4.99), kind `hoursOfIncome`, S = H x I (calibrated), from rung 4, behind the
country, age and Settings switches, as built. pack10 and pack20 come off ruling 9.1's list by ruling 23.5's own test
(T11: 0 of 150 rung-4 moments and 0 of 30 rung-5 moments fit, with own cash and with an empty purse). They return only if
the third measurement shows them fitting the player's own cash at an ordinary moment on 10 of 15 seeds. Looks and No ad
videos are unchanged. That makes fourteen products.

**The headroom rule, changed.** U = the sum of the price of every step buyable now, ceiling first, whose payback on the
calculated gain is within 1.5 tau_r. That counts every worthwhile level up the ladder while each step pays, not only each
card's next step. A level with dI under 1 % of I counts nothing, and no item counts above what it earns. A pack is
offered while cash + every standing quote's S + S <= U. Otherwise the row reads "Nothing to spend it on yet" with no Buy.
The rule is honest because S can be spent at once on purchases that pay back within the rung.

**Packs while a loan is open: hidden.** While an agreement is open, the pack rows read "Nothing to spend it on yet"
(proposed; list for the lead, D7). Bought scrip never repays a loan (money repays only by lot payments). A pack must never
look like a way out from under a debt. A shop button never stands beside a debt (2.5, as built).

**Where each pack fits (estimate).**
- **Rung 4's entry return.** Without C2: U is about §583k (the three items) + about §645k (the first three driver
  levels) + late plumbing levels, about §1.3M, against a purse of about §0.65M. The room is about §0.6M, about 5.5 h of
  I. pack2 (about §220k) fits; pack5 (about §550k) fits on about half the seeds. With C2: U is about §1.7M, and both fit
  before and after the player's buying.
- **The return after that (S5 or S6)** while driver levels or the trailer are still unbought: pack2.
- **Never once the list is bought**, and rarely at rung 5. Both say "Nothing to spend it on yet", which is true.

What a pack says stays fixed: "§S · about H hours of your yard's earnings". It is true once I passes its band (ruling 25.1:
no store build offers a pack before that). A pack is never needed: the same purchase comes about one sitting later from
the yard's own income, and every aim is measured with packs off.

---

## 2.16 Ads (amends nothing but the figures)

Unchanged rules. The caps read calibrated I, which falls about 30 % from rung 3's last purchase on, so the minutes stay
the same and the money falls. The gate stays at most 4 % of a day (REPORT9: 1.8 % on day 1, under 1 % after).

---

## 2.17 Time away: the stage-2 away card (rules side; screens Phase C)

The owner wrote: "UI of while I was away looks too simple, plain text no design". At stage 2 the away report the rules hand
the screen carries, besides the first yard's lines:
- gross earned;
- to the bank (y) and to you (z);
- left to repay, or "Repaid · [bank]" once, on the absence in which T was reached;
- each hall's pours;
- oversize pieces waiting (n of 4) and things on the picking table;
- the material that grew most.
Every number is the one applied (the payments were made when they were computed, lesson 5). The screen designs it as a
made card (lesson 12); that is Phase C's, and judged at phone size.

---

## Planning ahead (amends 2.1.11 and 2.1's group rule)

From the works' opening, crews go trip by trip in sight and out of sight (`group.ahead` false, read only when
`worksOpened`, a new content key `group.aheadWorks` false). Runs stay the rule (14.1 (a)): the same kind, place and
destination up to `handRun_s` or `cutRun_s`. Only the planning of a run's rest out of sight goes. Evidence (T3, 5 seeds):
trip by trip keeps +4.5 % lifetime at day 1 (s.e. 0.9 %), +9.9 % at day 3 (s.e. 1.8 %) and +15.5 % tonnes at day 3
(s.e. 2.1 %), against a noise floor of -0.3 to -0.1 %, and brings rung 5 one sitting sooner (8 against 9). The probes
(cutRun 60 s: -2.8 %; handRun 15 s: +0.7 %) show that the planning costs, not the run lengths. CPU in the bots: about 17
to 18 s a sitting either way. At release.stage 1, and below the works' opening, `group.ahead` stays true byte for byte
(the owner's phone; same.ts). Gate G9 sets the bench. If it fails, the loop's owner keeps planned runs only while nobody
watches, under the same tick-equals-jump test, and the gap of 14.9 is measured again.

---

## The sittings, rung 3 to rung 5, on the normal hand (estimate)

Twice a day, the goal habit, route A, packs off, about 15 minutes a sitting. The cash figures start from R1.txt section 2
(seeds 1 to 6) with T8's measured gains added to G; everything after the first sitting is an estimate that the third
measurement replaces.

**Rung 3**
- **S1** (h 5.3; purse §115k median, §52k to §137k; G about §30k; one heavy oversize piece waiting where rung 3 came at least 3 h earlier, as on 11 of the 15 R1 seeds). The boss cuts the
  piece (about §7k to §12k). Goal: the three-axle truck at §206k, more than the cash: the letter. The advice reads
  "Save up for the three-axle truck (about 3 h)", "A loan suits a machine that earns.", and "Meanwhile: hire a second
  cutter".
  - SAVER: hires the cutter (§3,600) and keeps about §120k.
  - BORROWER: deposit §41,200 and the cutter; the truck arrives this sitting; about §75k left, so the analyser (§43,800);
    about §30k left.
- **S2** (h 9.5, 4.2 h away).
  - SAVER: about §120k + 4.2 h x about §39k = about §285k. Buys the truck (§206k); about §80k left; the analyser
    (§43,800) as "Meanwhile" (the plasma at §86.5k is the next target); about §35k left.
  - BORROWER: G about §60k, the bank taking about §18k of each hour's gross. Purse about §30k + 4.2 h x §45k = about
    §220k. Buys the plasma (§86,500) and two cutter levels (about §42k each); about §50k left. About §76k of T is taken
    so far.
- **S3** (h 13.8 to 15.8, 4.3 to 6.3 h away; G about §60k to §75k).
  - SAVER: purse about §300k to §450k. Buys the plasma (§86,500; the bronze and stainless kinds start coming), the Night
    watch (first-yard item, §36,000), two or three cutter levels, a plumbing level. About §50k left.
  - BORROWER: T is repaid during this absence or the next. Buys the same list one sitting earlier, and from here is
    about a level ahead.
- **S4** (h 20 to 22). On most seeds rung 4 comes during this absence (REPORT9: S4 on 11 of 15; trip by trip +15 %
  tonnes; dearer levels slower). Where it has not come: cutter and plumbing levels while they pay, and the two-line
  advice "Rung 4: x t to go" / "Next: the induction furnace · §339,000".

**Rung 4**
- **Entry return (S4 or S5)**: purse about §0.55M to §0.75M; G about §90k to §105k. Buys the induction (§339k) and the
  shredder line (about §137k); then the rotary (§107k) where the purse holds it, else at the next return. Each hall's
  first heat waits for the boss; he pours. Cutting 2 to 3 pieces. With C2: the copper hall comes last and costs more than
  what is left, which is L2. Packs fit here (2.15).
- **S5 or S6** (8.2 h away; G about §110k to §125k): purse about §0.9M to §1.0M. The advice names driver levels:
  "+§6,6xx an hour on your yard's figures", about §240k, §215k, §190k. Three or four of them, a plumbing level, the
  copper hall if it was saved for. About §0.1M to §0.2M left.
- **S6 to S7**: more driver levels while each pays back within 1.25 x 36 h (their gain falls level by level); the
  trailer if C1 ships (saved for, or L3). When the truck stops binding, a cutter or hand level gets a gain and is named.
- **S7 to S8**: the first sitting that may hold nothing worth buying. The advice says what the yard waits for: "Rung 5:
  x t to go".

**Rung 5** at S8 to S9 (day 4 to 4.5), one sitting sooner than REPORT9's 9 to 10 through trip by trip, with rung 5's
tonnes retuned to keep it at least on day 4 and within 3 sittings of the last goal purchase. After it, the stage's top:
levels to the ceiling at tau_5 48 h, oversize pieces, the picking table, the Yard sale. Packs mostly read "Nothing to spend
it on yet". What those evenings are while stage 3 is not built is the lead's (D10).

**Count (estimate)**: a purchase in every sitting to S6 or S7, and at most 2 sittings a seed with none before rung 5
(REPORT9: 63 of 139, 4 to 5 a seed). Cash at a sitting's end stays under 1 tau_r of income except while saving for a
named target. The arithmetic behind it: rung 4 earns about §4M to §5M over its 4 to 5 sittings. Its bill is about §0.6M
for the line and halls, about §1.4M for driver levels (eight levels with falling gains, about §39k/h in all x 36 h),
[about §0.43M for the copper hall] and [about §1M for the trailer]. The back half of rung 4 still holds about one empty
sitting without the candidates. That is stated, not hidden (risk 5).

---

## THE BUILD: work packages by owner and file, the smallest first

Each package ends with its own tests green (frozen test content; no tuned number pinned) and the first yard unchanged
(same.ts on 4 hands, both routes). Bot runs on the shared machine stay small: one or two seeds, one rung, never two heavy
commands at once.

1. **The lead** (`docs/design/yard-decisions.md` section 27; then `yard-stage2.md` brought into step, sections 1.1, 1.3,
   1.4, 2.3, 2.6 to 2.17, 3.1, 8.2): rule on this design and on the list below.
2. **Content only** (owner: content; `src/config/salvage.content.ts`, `scripts/content/build-yard.py`,
   `scripts/content/yard/goals.json`, `scripts/content/bots/plates.json`): the stage-2 shop sells only the hook-lift,
   plasma, analyser, induction, shredder line, rotary (the line as one shop item covering two plots). The other items get
   a gate past the ladder: defined, dark, their rules and tests untouched. `works.maxLevel` 1; `tau_h` [null, null, 12,
   36, 48]; rung 5 range 8; `bank.maxF_h` 6, `bank.maxF_tau` 0.5; `financeable` on the hook-lift and the five machines;
   pack10 and pack20 off the mirror; rack levels off; the new goal list (17); `levels.minShareI` 0.01;
   `group.aheadWorks` false; first prices from T8 x the new tau. The build check gains the entry rule (an item whose
   `plates.json` gain is under 2 % of G at its moment is refused) and the rung-bill line of section 0. Measure: content
   check, same.ts, one seed of the stage-2 bot to rung 4 (smoke).
3. **Oversize pieces** (owner: content and lots; content `lots.kinds`, `lots.lorry_kg`; `scripts/content/yard/names.json`
   placeholders): the three heavy kinds with their masses; the check's clauses. No `lots.ts` change. Tests: every arrival's
   mass inside its kind's range; a tier-3 kind comes before the plasma; tick equals jump.
4. **Rated income** (owner: `src/engine/salvage/rate.ts`, `rate.test.ts`): the replay plays the shipped driver through
   the same function as `truck.ts driverDepart` (the fair count); the truck's round counted as shipped; terms for the
   analyser, the shredder line and the rotary; `rate.kappa` per rung read from content, refused outside 0.85 to 1.15.
   Tests: monotone over every purchase step on the frozen and the bots' states; the first yard bit for bit below the
   works' opening. Measure: I/G on two seeds at r3s1, r4entry and day 3, and the driver-level check (dI/dG). This is the
   package the rest waits on: if the driver-level check fails here, the gain-book fallback goes into package 6.
5. **The shredder line** (owners: works, truck and map; `src/engine/salvage/works.ts`, `truck.ts`, content `map.works`,
   `scripts/content/yard_map.py`): one shop item for two plots; the garage's car is set on the bay's apron by the
   hook-lift (its landing is the apron, not the pad); the forklift's leg is no longer needed; the south-yard plots,
   forklift stand and lead area leave the stage-2 layer; the swept path to the apron is checked. Tests: a car drained
   before anything comes off it; the line's cars come only once it is owned; tick equals jump. Measure: the line's gain,
   two seeds.
6. **Levels and headroom** (owner: `src/engine/salvage/ladder.ts levelPrice`, `shop.ts headroomU`, `actionsWorks.ts`):
   from the works' opening every level is tau_r x dI (or the gain book), sold only at dI >= 1 % of I, refused
   "notLimit" otherwise; U by 1.5 tau_r up the ladders, ceiling first; ceilings in the plate checks. Below the works'
   opening, prices are pinned at today's values. Tests on frozen states.
7. **The advice line** (owner: `src/engine/salvage/advice.ts`; words in `src/ui/salvage/strings.ts`,
   `src/engine/salvage/textKeys.ts`, `scripts/content/yard/text.json`, `check.ts --all` at 0 findings): 1.25 tau_r, ties
   to the larger gain, the gain printed "on your yard's figures", save-up, the loan sentence only when dI x save time >
   charge, the "Meanwhile" line, the waiting line with the next rung's main purchase.
8. **The bank** (owner: `src/engine/salvage/bank.ts`, `actionsMoney.ts`): a financeable vehicle; F_max; the "you keep
   about §y an hour" line; packs read "Nothing to spend it on yet" while an agreement is open (if D7 is ruled so). Tests:
   2.14.7's, plus the vehicle, plus tick equals jump with an agreement open.
9. **Planning ahead** (owner: crews, `src/engine/salvage/crew.ts` / group): `group.aheadWorks` read only when
   `worksOpened`; at stage 1, byte for byte. The bench (G9) measured alone.
10. **The Yard sale** (owner: `src/engine/salvage/reuse.ts`, content): `reuse.shareI_r` by rung.
11. **The away report** (owner: `src/engine/salvage/away.ts` or wherever the away card's report is built; contract
    field names agreed with the screens first, lesson 10 and 13): the fields of 2.17.
12. **The bots** (owner: `src/engine/salvage/bot.ts`, `scripts/content/yard-bot.ts`): the new goal order; `--plates
    write` at the new moments; the gain book's three steps per level ladder (whether or not it is used); T11 on the new U;
    the rung-bill line; felt cash for always against never; the slow hand to rung 5; a person-paced rung-4 sitting script
    (G15); the gates table below.
13. **The store-review pass** (owner: policy desk; `docs/design/research/policy.md` read against the purchase list):
    Apple and Google rules on pay-to-skip and loot-like patterns, and the EU consumer guidance on artificial obstacles,
    against the whole stage-2 list (prices, the bank, packs, headroom, "Nothing to spend it on yet"), BEFORE the third
    measurement.
14. **The third measurement** (15 seeds on both routes, 5 unseen, the habits; small shards on the shared machine), then
    confirmation by engineers who wrote none of it.
15. **The candidates**, each in its own working copy after 14, measured, shipped only by their gates: C2 the copper hall
    (works, content, grades, rate term, map plot), then C1 the trailer (truck.ts two-skip trips, rate term, swept path,
    tick equals jump). If one ships, rung 5's tonnes and the packs' table are measured again (two seeds first, then 15).
16. **Phase C** (screens, art, names; after the gates): plots drawn only for what is sold; "Opens at rung 4 · §x" on the
    back field's plots; finance on the hook-lift's card; the away card of 2.17; the process board's greyed row; the heavy
    pieces' drawn objects and registered names; the forklift's cab rules carried into stage 3's notes.

---

## THE GATES: what the third measurement must show

Baselines are REPORT9's. "Seeds" means 15 seeds of each route unless named.

- **G1 Entry.** Each sold item's measured gain at its planned moment is at least 2 % of G (mean), with no seed below
  -1 %. Every walk step offered is at least -1 % on its mean, with no seed below -4 %: 0 failing steps (REPORT9: 5 of 74,
  all partner levels). No hidden best buy (over 5 %, payback under tau_r) that neither the advice nor a goal names, at r3s1,
  r4entry and day 3 (REPORT9: the driver level on 15 of 15, the plasma on 15 of 15).
- **G2 Rated income.** At the six moments on both boards: median I/G 0.95 to 1.05; at least 13 of 15 in 0.88 to 1.12;
  none outside 0.80 to 1.25 (REPORT9: 0.91, 1.31, 1.46, 1.44, 1.38, 1.44). I never falls at any purchase step of any bot
  run. kappa_r within 0.85 to 1.15. **G2 R**: the driver level's dI / dG within 0.7 to 1.4 on 13 of 15 at r4entry and day 3
  (REPORT9: dI 0).
- **G3 Pace.** Rung 4 at sittings 4 to 6 (day 2 to 3) and rung 5 at sittings 8 to 12 (day 4 to 6) on at least 13 of 15
  of each route and 5 of 5 unseen. The slow hand inside both bands on 3 of 3 (REPORT9: rung 5 at sitting 12, the edge).
  Packs off and never financing.
- **G4 Sittings.** At most 2 sittings a seed without a purchase that pays back within 1.25 tau_r before rung 5, and none
  before rung 4's last machine (REPORT9: 63 of 139). The last goal purchase and rung 5 at most 3 sittings apart (REPORT9:
  4 to 5).
- **G5 Bank.** The first offer at sitting 1 or 2 of rung 3 on at least 13 of 15 (REPORT9: 0 of 15). Every first loan
  repaid before rung 4 (15 of 15). The always-finance bot reaches rung 5 at most 10 % sooner than the never-finance bot
  (median and max printed). Felt cash printed per seed. Total taken equals T exactly on every loan. No bought load nets a
  loss with an agreement open. Where C2 ships: a second offer at rung 4's entry return on at least 10 of 15.
- **G6 Packs.** Each listed pack fits the player's own cash at at least one ordinary moment of rung 4 on at least 10 of
  15 seeds (T11 on the new U; REPORT9: 0 of 150). A pack that fails is unlisted. The packs bot reaches every aim, and
  its lead at rung 5 is at most one sitting.
- **G7 The hand.** The card manager reaches rung 4 by day 3.5 and rung 5 by day 7 on 3 of 3 (REPORT9: never). The hand's
  lifetime earnings at least 1.2 times the manager's at sittings 4 and 8, with no mechanism over three fifths of the gain
  (REPORT9: not measured).
- **G8 Oversize pieces.** At least 1 piece cut a sitting from sitting 2 of rung 3 on 13 of 15 (at sitting 1 only where rung 3 came at least 3 h before it) (REPORT9: 0 in every
  sitting). Every piece's mass inside its kind's range on 5 seeds at rungs 3, 4 and 5.
- **G9 Planning.** Trip by trip from the works' opening: one 8-hour away pass at rung 4 (bench state) under 1,000 ms in
  node, measured alone, and at most 1.5 times the planned-runs figure. A tick equals a jump at 120 checks. An absence in 2
  and in 11 passes equals one.
- **G10 Time away.** E19 median 0.3 to 0.8 at rungs 3 and 4 (REPORT9: 0.70 and 0.89).
- **G11 The Yard sale and the van.** 2 to 5 % median on each of days 1 to 5, never over 8 % on a seed-day (REPORT9: 6.9,
  1.9, 1.8, 1.9, 1.8).
- **G12 Hard promises** on every run: shown equals applied, money only by lot payments, ads and grants, cash never below
  zero, the away card's sum, nothing about money before the second session, no dead end. Ads at most 4 % of a day.
- **G13 The first yard.** At release.stage 1, 75 of 75 runs identical below rung 3 to the millisecond; same.ts bit for bit
  on 4 hands and both routes. `group.ahead`, prices, advice and I unchanged at stage 1.
- **G14 Candidates.** C2 ships only at measured g >= 2 % of G (and its new grade's price checked). C1 ships only at
  g >= 2 % of G net and with the swept-path check passing; it is a loan moment only at g >= 23 % of G.
- **G15 A person's sitting.** Three people-like playthroughs at a person's pace (8.4) of the rung-4 entry sitting fit 15
  minutes: buy the line and the halls, read the letter where due, pour the first heats, cut 2 to 4 pieces. Not one sitting
  opens two centred cards without a player's action between them.
- **G16 The store-review pass** (package 13) is done and its findings ruled on before the third measurement.

---

## Risks (what could make it fail, and the fallback)

1. **The gains were measured on round-0 states in the old goal order.** The rotary (2.65 % of E0) is the item most likely
   to fall under 2 % at its new moment. It then moves to stage 3.
2. **rate.ts may stay blind to the truck** after it plays the shipped driver (G2 R). Fallback: the gain book for levels.
3. **Dearer levels will slow rung 3's tonnes.** Today about 20 cheap levels at sitting 2 drive G from about §40k to about
   §100k. Rung 4 may slip toward day 3. Fallback: rung 4's tonnes by its band.
4. **The once-a-day player under dearer prices** (the slow hand already at the band's edge). Fallback: rung 5's tonnes.
5. **Rung 4's back half without the candidates** still earns more than there is to buy, so about one empty sitting
   remains.
6. **The copper hall's §12k/h is arithmetic on one seed's flows.** If it measures low, L2 becomes "sometimes" and the
   stage has one sure loan moment.
7. **The trailer's estimate rests on a gross, faster-truck probe**, and driver levels compete for the same haul gain. It
   is measured in both orders (trailer first, levels first).
8. **A loan takes about half of net for about two absences**: players may feel poorer. The card says so, and felt cash is
   printed.
9. **"An entire scrapyard business"**: the crane, the baler, the shear, batteries and lead leave stage 2. The owner may
   miss them (D1, D2, D9).

---

## A LIST FOR THE LEAD: decisions of taste or of the owner's wishes

**D1. Cars at stage 2.**
- (a) Keep them, inside the shredder line (bay and shredder as one item, the hook-lift setting each car on the bay's apron,
  no forklift). Cost: a small truck and map change (package 5). The shredder's measured gain stands on cars. The owner's
  "entire scrapyard" keeps its most recognisable job.
- (b) Cars to stage 3 with a car lane, and the shredder alone at stage 2. Cost: smaller build, but the shredder's gain
  must be measured again without cars, and light iron is only 0.8 t/h, so it will likely fail 2 % and leave too.
- (c) Both to stage 3. Cost: rung 4 has only two halls.
- **Recommend (a).**

**D2. Batteries, lead and rung 5's ninth metal.**
- (a) Stage 3's battery hall with lithium, fed by a battery collector's own lorry; rung 5 asks for 8 metals and its
  tonnes. Cost: rung 5 brings no new metal.
- (b) A lead line now on the collector's lorry. Cost: new engine work, and the smelter's measured 0.66 % of E0 says it
  will likely fail the entry rule.
- **Recommend (a).**

**D3. The candidates C2 (copper hall) and C1 (trailer).**
- (a) Measure both now, after the core.
- (b) Only C2 now, C1 with stage 3's road transport.
- (c) Neither.
- Cost: C2 is the stage's likely second loan moment and the owner's "furnaces ... ingots" on his first-named metal; C1 is
  new vehicle risk after the owner's review of trucks.
- **Recommend (b), with C1 measured only if C2 fails its gate.**

**D4. tau.**
- tau_3: 9 h (today) or 12 h. tau_4: 28, 36 or 40 h.
- Cost: higher tau means dearer, fewer purchases: the hook-lift at 12 h costs §206k against §154k and comes a sitting
  later to a saver; at 9 h a loan is still offered (§154k is above every sitting-1 purse), but less of rung 3's cash is
  used.
- **Recommend 12 / 36 / 48.**

**D5. Levels priced at what they earn.**
- (a) From the works' opening, every level at tau_r x its gain, with the gain printed.
- (b) Only driver and partner levels, the crew's first-yard rule kept.
- Cost of (a): a later level can cost less than the one before (shown with its gain); it is unusual in the genre and
  slows rung 3. Cost of (b): cheap crew levels make cash pile up again.
- **Recommend (a).**

**D6. Plots of what is not sold.**
- (a) Not drawn; the process board's greyed row names the materials (Batteries and lead, Cable).
- (b) Padlocked plots with "Comes later".
- Cost of (b): a sign of a later build, which 1.3 beat 8 forbids.
- **Recommend (a).**

**D7. Packs while a loan is open.**
- (a) Hidden ("Nothing to spend it on yet").
- (b) Shown with "Bought scrip does not repay the loan".
- **Recommend (a): kinder, and simpler to review.**

**D8. The pack list.**
- (a) pack2 and pack5.
- (b) All four, delisted by G6.
- **Recommend (a)**: T11's 0 of 180 already decides pack10 and pack20.

**D9. What the owner is told.** One line in the next update: the crane, the baler, the shear, batteries and lead come in
a later stage with the material that makes them earn, and why. **Recommend telling him** (he asked for an "entire
scrapyard business").

**D10. After rung 5 while stage 3 is not built.**
- (a) Stage 2 goes to store players only together with stage 3. On the owner's phone, stage 2 alone (the top as built:
  levels to the ceiling, pieces, the picking table, the Yard sale).
- (b) Ship stage 2 alone to the store with that plateau.
- Cost of (b): days of evenings with nothing new.
- **Recommend (a).**

**D11. The 1.25 tau_r advice window and the 1.5 tau_r headroom window** are set from the band's own error. Widening them
names more and lets packs fit more. **Recommend as written.**

**D12. The boiler drum as an oversize piece.**
- A pressure vessel shown "Certified empty", cut by the boss: L3 allows a hazard the yard handles properly.
- **Recommend yes, with the plate's line and Help's page** (no method shown).
