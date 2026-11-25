# Scrapyard stage 1: the first yard, buildable

Status: version 2, complete (part one and part two), 25 November 2026 (step `spec-stage1`); it replaces version 1. Authority: `ECONOMY.md` (E1 to E24) and `STAGE1-RULING.md` (S1 to S24), then section 14 of `docs/design/yard-design.md` (the master, D1 to D19), then the master's text, then `RULING.md`; where this document differs from them, it is wrong. Where `src/engine/salvage/types.ts` and this text differ on a NAME, the types are right; on BEHAVIOUR, this text is right (the rules lead changes the types to match, 2.13).

**Numbers.** Every number lives in the content: today the second numbers pass's `proto/content2.json` (shared notes folder), within the hour the third pass's `proto/content3.json` (same keys, extended, with a `$changes` list), then `src/config/salvage.content.ts`. This document names a number by its key (`machines.stripper.rate`). A value marked **(p2)** is the second prototype's, printed for scale only: the third pass re-measures it. Bands are E7's, E9's, E14's and S18's. Invented names are register ids in braces (5.1).

Conventions: § the currency symbol; m a metre on the ground plane (x east, y south); integer grams and hundredths in the rules, one rounding function `roundMoney`; p̄ a grade's usual price (`grades.{id}.pbar`); "the boss" the player's worker.

---

## 1. The first yard

### 1.1 In five sentences

1. You take over {homeYard}, a small licensed yard full of old stock, and steer your worker with one thumb: stop beside a washing machine and it comes apart, piece by piece, onto the frame on your back.
2. The platform scale weighs each grade into its bay at today's posted price, and {merchant}'s flatbed collects every bay you have not held and pays by transfer.
3. A cable bundle on the yard's old hand stripper becomes bare bright copper worth many times the iron, and inside the first half hour a small crucible pours your first brass ingot.
4. You buy better tools and carriers and a truck that fetches loads from {partnerFarm} and {partnerDemolition}, and hire a yard hand, a cutter and a driver who keep the yard earning while you are away.
5. From the first second the industry table ranks 25 rival firms by tonnes supplied under "the largest full metal recycling and resource supplier", and you pass the first inside five minutes.

### 1.2 The first five minutes (storyboard; ruling 5 and E9 give the order)

0:00 is the moment the loading animation's gate parts (6.4). Bands are E9's for the normal hand on every seed, the slow hand within half as long again on the same seed (E24); measured times are the second prototype's on route A (the washer first) and are re-measured by the third pass (2.18).

| # | Band (measured, p2) | On screen | Thumb | Sound |
|---|---|---|---|---|
| 0 | before 0:00 | The loading animation (6.4): one plate per word of {title}, the display counting, a pour cooling to brass, the picture parting like gate leaves. | a tap skips it from the second launch | `load_*`, `gate_open` |
| 1 | 0:00 | Morning yard. The boss stands inside the gate by the public drop-off's washing machine with a pulsing ring. West of him the platform scale and weighbridge, the scale house, the price board; beyond, the stripper pad (hand stripper, cable bundle) and the crucible pad with padlock chip, price and sample ingot; {merchant}'s flatbed at its stand. Top bar "§0", "26th of 26 · next {rival.1} {t}", "0 / {kg} kg". Goal "Take the washer apart"; a ghost thumb drags lower left. | — | `amb_yard`, music |
| 2 | to about 0:12 | He stops beside it; the ring fills. The motor arcs onto his frame, then the top panel and a side; the drum and the other side drop beside him; the counterweight thuds into the rubble skip. "Load full". | drag, release | `cut_spanner`, `piece_steel`, `thud_waste` |
| 3 | first collection ticket within about 25 s (0:16 to 0:22, p2) | Goal "Weigh it on the scale". The display counts; the weigh-in ticket rises with the muted "today's value", which slides onto the bay chip; the flatbed loads for `merchant.load_s`; the collection ticket prints at its cab ("Lot sold to {merchant}"); a coin arcs to the cash counter; the flatbed leaves on its round. | step on | `scale_beeps`, `scale_print`, `flatbed_load`, `coin` |
| 4 | to about 0:30 | Goal "Strip the cable". On the way he picks up the drum and side and weighs them in; their lot waits for the flatbed's return. | steer | `pickup` |
| 5 | the copper jump by about 1:30 (0:39 to 0:46, p2) | He stands at the hand stripper and feeds the bundle: PVC curls into its bin, copper spools into the tray (R1: the hand stripper turns only while he stands at it). On the scale: "Bare bright copper", a short No.2 line, a muted value far larger than anything before, the lesson; the flatbed returns, loads, pays; the cash counter jumps. | stand, step on | `stripper_hand`, `coin_big`, `lesson` |
| 6 | a purchase arriving in the world, after the copper jump | Goal "Buy the sack truck" (the first prompt, S8): at the tool rack, "Open", its card ("Moves a washer in one trip"), Buy; a van sets it down; the boss pushes it. | Open, Buy | `buy`, `van` |
| 7 | by 5:00 (2:18 to 2:30, p2) | Goal "Hire a yard hand": the rota, Hire; a green vest walks out of the portacabin; chalk circles appear. "Work the drop-off": what the boss cuts and cannot carry, the yard hand carries to the scale. | Open, Hire | `door` |
| 8 | first rival by 5:00 (minute 4 to 5, p2) | On a collection the chip slides: "25th of 26 · passed {rival.1}". | — | `chip_slide` |

That is ruling 5's list in its order. Goals are SHOWN at most one purchase prompt a minute; the economy is paced by cash alone (E18). The opening does not depend on the route (S10): the bots play route A and route B (the cable bundle first); on route B the first paid ticket is the copper ticket and its band is 35 s (E14; 0:25 to 0:32, p2).

### 1.3 Minutes 5 to 60 (the goal order; R8 as amended by E22)

Every goal's purchase is cash-gated, with no waiting rule (E18). The AIMS for the normal hand, on both buying habits (a goal's purchase the moment it is affordable and its card read; everything affordable at once, which may run at most a minute early): when a purchase's goal arrives in the first thirty minutes he holds between half and one and a quarter times its price and never waits more than three minutes for it; the buy-everything habit is at most two purchases ahead of the goal list by minute 10 (E12); income over any five-minute window never falls below three fifths of the best earlier window (E15); after the torch there is always a purchase that widens the bottleneck (E19); cash at minute 60 is at most about ten minutes of income (E13e). The second prototype met none of these by its prices; the third pass measures them (2.18).

1. Buy the sledgehammer and angle grinder: zone 2's cast iron and steel open.
2. Hire a cutter ("The yard now earns while you are away."): he cuts at the drop-off, then on the tipping floor.
3. Buy the flat trolley, then the powered stripper.
4. Buy the hook-lift truck; {partnerFarm}'s trial load is ready down the lane, its label readable from the gate.
5. **First drive out, 8 to 10 minutes** (S18, an aim on both habits): hook the trial load, back over the weighbridge (gross, tare, net), tip; cut and sort it while the yard hand carries the floor.
6. Buy the motor bench; break a motor. Hire a driver, who fetches the farm's loads when one is full, cash covers it and the floor has room.
7. **Rung 2 at 12 to 18 minutes** (E7; about 14, p2): "Supply {t} t (3 metals)"; the crane hangs the sign; a radiation portal at the gate and the ID desk window. {foundry}'s supply deal appears (optional).
8. Buy the cutting torch (opens at rung 2): zone 3 and {partnerDemolition} open; cut up the car (its converter sells on assay); fetch the demolition trial load.
9. Buy the crucible; "Charge the crucible" (Take from bays). **First small pour, 18 to 25 minutes** (E9; about 22, p2), waiting at "Ready to pour" for the boss (S11).
10. From here to the hour's end the goal card names the purchase that widens the bottleneck now (E13c, E19): another skip in rotation at a partner, or the crew or machine level that binds; after a supply level a crew or machine level, and the other way round. Rivals {rival.2} to {rival.4} are passed on the way (four in the hour, E7).
11. **Rung 3 at 55 to 65 minutes** (E7; 28 t, E14): "Supply 28 t (5 metals)".

Held to E22's test, in the order only if the third pass shows they change something, else on the day-1 list: the second yard hand (after the driver), the aluminium recipe (after the first pour), the second cutter. The Night watch is "a longer away cap", offered once the player has been away (E22), never in the hour's order.

### 1.4 Days 1 to 3 (E8, E13e, E19)

The owner may keep the concept test open; under the twice-a-day habit (two short sittings a day after a first hour) every sitting to the end of day 3 has a useful purchase, and cash stays under about a day's income:
- Skips in rotation at each partner (E13b) and, if the third pass needs it, a third tier of load (E19), on the office's partner wall.
- Crew levels on the rota and machine levels on the process board, priced by what their capacity is worth (E13a), offered by the advice line only when they bind.
- {foundry}'s supply-deal series (2.9).
- Rivals up to {rival.8}; the chip names the next one with the tonnes still needed.
- The capacity ceiling of rung 3 is a guard met late, if at all (S16).
- The last goal walks the boss to the fenced back field: a plain padlock and a sign, "Back field · the works are being built here". No text promises a date (E8, S20).

---

## 2. The rules

Pure TypeScript in `src/engine/salvage/`, deterministic: no `Date.now`, no `Math.random` (counter hashes `hash01(worldSeed, …)`, `worldSeed` a content constant). The screen never decides: it shows the rules' frame and events (2.14) and calls actions (2.15). 2.1 to 2.11 say what the player meets; 2.12 to 2.16 say how the engine does it.

### 2.1 The hand

**Controls** are the ground work's: one full-screen responder; the stick where the thumb lands in the left 45 % of the safe area below its top 28 %; a second finger ignored; motion, collision and camera on the UI thread; a presence sample at most ten times a second (`Presence {x, y, driving, moving, standingFor}`); the rules decide nearness from content positions.

**Work needs no button.** Within `reach.work` of a workable thing (its object's `tier` at most the best tool owned), the stick released for `feel.workDelay`, the boss works the nearest one with his best tool; a ring shows the piece's progress; moving stops it and keeps the progress on that thing. Two tests bind (D12): walking past never works a thing; stopping beside it always starts work within half a second. Delay, speeds and camera lead are the world engineer's feel values, in content. Pieces go onto the load in cut order while they fit, else drop beside the thing; waste goes to the rubble skip.

**Pickup** (S9): automatic within `reach.pickup`, moving or still, one piece every `pick_s`, while capacity allows; highest p̄ per kilogram first (cable at its copper, R7; never the day's price), ties heavier first. **The swap**: load full, the boss still for `feel.workDelay`, a piece of higher p̄ per kilogram in reach: the lowest-valued carried piece is put down and the better one taken; never while moving or inside a chalk circle; a test proves a swap never lowers the load's value. **Piece positions** are one pure function `piecePos(pile, k)` of content, used by the rules, the frame, the screen and the bots.

**Chalk circles** appear and work only once a yard hand is hired: standing in one for `feel.workDelay` puts the load down for the crew. **Feeding**: standing in a hopper zone feeds accepted pieces, best first, while the hopper has room. On the scale, in a hopper zone or in a circle the boss does only that; elsewhere pickup and work run together.

**Carriers** (S8, `carriers`): the carry frame, a hand load of at most `carriers.frame` kg (tune 25 to 30); every larger carrier has wheels: the sack truck (`carriers.sack`), then the flat trolley (`carriers.trolley`). Nobody is drawn bearing more than the hand load; loads are pieces strapped on, never a tower.

**The one button** (60 pt, lower right): "Open" at a place, "Step out" while driving, blank elsewhere; pressed only with the stick released. Vehicles are entered by walking into them (`truck.enter`).

### 2.2 The two scales, weighing in, tickets

**Two scales** side by side in the hero frame (S2): the **platform scale** for loads on foot (0.1 kg steps, `scale.platformStepKg`, up to `scale.platformMaxKg`) and the **weighbridge** for the truck (`scale.bridgeStepKg`). Standing on the platform with a load for `weigh_s` weighs it in: every carried piece goes into its grade's bay, a whole thing at its `whole` grade, and a **weigh-in ticket** prints with no payment on it. A crew member weighs in the same way, shown as a chip (4.4). Driving onto the weighbridge with a skip weighs the skip in (2.7).

**One rounding rule** (E17): the scale turns pieces into a bay's grams once, each grade line rounded half up to the platform step, and the bay receives exactly the rounded grams (the difference is kept in `stats.scaleRound_g`, so the mass test balances). A lot takes whole 0.1 kg steps; a line's amount is `roundMoney(kg × price)`; a total is the sum of its lines. On the weighbridge gross and tare are each rounded to the bridge step and net is their difference. **Mass format**: one decimal below 100 kg ("28.6 kg"), whole kilograms from 100 kg ("1,020 kg"), tonnes with two decimals from 10 t, from 1 t for ferrous ("12.34 t"). **Money**: hundredths below §1,000, whole from §1,000 ("§3,148"), three figures with k or M from §100,000. No ticket prints part of a whole thing.

**Tickets and their wording** (S1, S3, D8; `Ticket` in the types):

| Ticket (`kind`) | Prints | Legal line |
|---|---|---|
| Weigh-in (`weighIn`) | "{homeYard} · scale · No. {n}", the date; up to three grade lines (grade, kg, "§{p}/kg today"), "+ {n} more"; muted "today's value §{x}"; at most one lesson | "Weighed into bays · not yet sold" |
| Drop-off slip (`dropOffSlip`) | "{thing} · signed in · gate drop-off" | the line itself |
| Skip weigh-in (`skipWeighIn`) | "{partner} · {load}"; "Gross {a} kg · Tare {b} kg · Net {c} kg" (tare: the truck's stored tare plus the empty skip, no second pass); the price paid | "Seller ID checked · paid by transfer" |
| Collection (`collection`) | "{homeYard} · ticket {n}"; up to three grade lines (grade, kg, amount), "+ {n} more"; "Paid §{x}" | "Lot sold to {merchant}" / "weighed out · paid by transfer" |
| Deal delivery (`dealDelivery`) | "{foundry} · {kg} cast iron · §{x}" | "weighed out · paid by transfer" |

The site licence hangs on the portacabin wall from the first second. Closed vessels read "certified empty" on the thing, its card and its ticket line.

### 2.3 Bays, Hold, the merchant's round, what "supplied" counts

**Bays**: one per grade (lock-block ferrous bays, stillages, the converter cage), holding up to `bays.{grade}` kg. Its chip: "{grade} {kg} · today §{x}", the day word when not usual, "held" when held.

**Hold** (the bay's card, the board's row) keeps a bay off the round, free; a full held bay still takes weigh-ins and the round takes only the grams above its capacity. **Sell** on a held bay sets its stock aside at the price on the card (shown equals applied, 2.8) for the next load; Hold stays on. **Reservations are not Hold**: the crucible's "Take from bays" reserves one charge of its grade (2.5), the deal reserves cast iron up to the next delivery (2.9); the round never takes reserved grams.

**The merchant's round** (S1, R5): {merchant}'s flatbed waits at its stand; when any bay has collectable grams it loads for `merchant.load_s` what was collectable when loading began, pays, prints one collection ticket, and is away for `merchant.round_s` (tune 15 to 30 s); stock arriving meanwhile waits for its return (2.12). So the first paid ticket comes one load after the first weigh-in, later ones at most `round_s + load_s` after theirs, and several grades come as one ticket.

**Supplied** counts collected lots only (collection tickets and deal deliveries), lifetime, never falling; never weigh-ins, stock in bays, reserves, waste.

### 2.4 Things, tools and how each thing comes apart

**Things** are content (`objects.{id}`): `tier` (0 loose, 1 spanners, 2 sledge and grinder, 3 torch), hardness `h`, `pieces` in cut order as `[grade, g, n]`, `waste_g` (to a licensed waste carrier, through the rubble skip or the stripper's bin), `whole` (the grade it is carried at uncut, or null), `gross_g`, and the added `sprite`, `stages`, `size`, `source` and `certifiedEmpty`. **Cut time per piece** t = max(`cut.minS`, kg × `h` / P), P the tool's `tools.{id}.P` in kg/s. A thing needing a higher tier shows its padlock chip "Needs a sledgehammer" or "Needs a cutting torch".

**Tools** (one rack; each tier one purchase in `shop`): tier 1 **spanners and bolt cutters** (owned); tier 2 **sledgehammer and angle grinder** (S6: the sledge breaks cast iron, the grinder cuts thin steel); tier 3 **cutting torch** (oxy-propane: beams, the car, the tank; opens at rung 2 and opens {partnerDemolition}). The work animation follows the piece's family.

**The yard is full** (E1): old stock in heaps by zone (`zones.{id}.things`, with `tier` the zone's sign, `centre`, `r`), several tonnes in all, the better material in the later zones; each thing's own tier decides whether it can be worked. **Z1**: washing machines, bicycles, heavy cable offcut bundles, crates of brass taps and fittings. **Z2**: cast-iron radiators, a bath, stoves, gate and railing sections, copper cylinders "certified empty", alloy wheels. **Z3**: the car, steel beams, steel tanks "certified empty". **bundle1**: the cable bundle by the stripper (S4). E15 makes the copper and brass of Z1 and Z2 less and smaller in the third pass; E1's aim (still working through the heaps at minute 30) is measured on Z1 and Z2, not on unworked Z3 steel.

**The public drop-off** (E1's trickle that never stops; the no-dead-end source): a car with a trailer leaves one thing every `dropoff.period` while fewer than `dropoff.places` wait (2.12), each signed in with its slip. The first arrivals are `dropoff.initial` (the same for every player); later ones are drawn from `dropoff.mix` (washers, bicycles, radiators, heavy cable offcuts, brass taps, copper cylinders certified empty: copper and brass come back every few minutes). Never a converter or a sealed vessel.

**How things come apart** (S6, held against `yard-metals.md`; masses are content):
- **Washing machine**: a whole motor, a top panel and two cabinet sides (light iron), a stainless drum (sold as light iron in this stage, with the lesson that it pays more once stainless is sorted), the concrete counterweight and plastics (waste); whole, "Appliances, whole".
- **Bicycle**: steel frame and wheels, light iron; tyres to waste.
- **Heavy cable offcuts** (and the demolition partner's coils): stripped (2.5), or sold whole as "Heavy cable" priced from its yield (S4: `cable.k` of the value of the copper it holds).
- **Taps, fittings**: brass solids. **Radiator, bath, stove, trough**: broken by the sledge into cast-iron solids, or carried whole on wheels as "Cast iron, whole". **Copper cylinder**: shell (No.2 copper) and brass fittings, or whole as "Copper cylinders". **Gates, railings, farm sheet, cladding**: light iron, whole as appliances' grade. **Alloy wheel**: whole, alloy wheels.
- **Electric motor**: on the motor bench, `machines.bench.out` (No.2 copper, light iron, cast aluminium end caps) in the trade's shares, never a quarter copper.
- **Beam, tank, plough**: cut by the torch to "HMS 80:20"; uncut, "Steel, unprepared".
- **The car** (S7, D11, E16): labelled "End-of-life car from {partnerDemolition} · depolluted · treatment record ref. 0012", in zone 3 from the first second. Depollution has taken out its fluids, battery and tyres: it carries no battery (E16; content2 still lists one, the third pass removes it). It gives four alloy wheels, the wiring loom ("Thin cable", its own low yield, E21; content3 adds the grade), the catalytic converter (one whole piece, sold on assay; ticket line "from car ref. 0012"), the body ("Car body (shredder)") and waste. Its `source` is `{type: 'partner', partner: 'partnerDemolition', ref: '0012'}`; a test refuses a converter without one.

**Grades** (`grades.{id}`: `name`, `pbar`, `family` fe / nf / pm, `material` for range, `kind`, `asFound`): p̄ in the trade's true proportion (S5, E21: brass solids at least three fifths of copper, about §22.40, the brass ingot about §27; whole motors at two thirds to three quarters of what the bench gets out of them). Names (≤ 18 characters) come from content.

| Kind | Ids |
|---|---|
| ferrous grades | `li` light iron, `appl` appliances whole, `ci` cast iron solids, `ciu` cast iron whole, `hms` HMS 80:20, `hmsu` steel unprepared, `cbody` car body |
| non-ferrous grades | `alw` alloy wheels, `alcast` cast aluminium, `ald` aluminium dross, `brs` brass solids, `brd` brass dross, `no2` No.2 copper, `bb` bare bright, `cyl` copper cylinders |
| products | `bri` brass ingot, `ali` aluminium alloy ingot |
| intermediates (tonnes, no range) | `cab` heavy cable, `cabt` thin cable (content3), `mot` electric motors, `conv` the converter (family `pm`) |

Lead (`batt`) is no grade in stage 1: a greyed plate only (E16). The converter is paid by the master's payables (4.3; `converter.*`: grams of each metal, their prices, the payable shares, the ceramic and assay fees), printed on its cage card ("Paid on assay: platinum {a} %, palladium {b} %, rhodium {c} %, less ceramic and assay fee"), with one gram of rhodium (E21); if it floods the hour's last quarter its payables fall (E10).

### 2.5 Machines as the player meets them, and the process board

Machines stand on fixed pads with a hopper, a rate, an out tray and levels bought on their process-board plate; 2.12 gives the arithmetic. Nothing costs by the clock; a full tray stops a machine and nothing is lost; outputs keep mass exactly.

- **Hand stripper** (inherited, S4; `machines.hand_stripper`): on the stripper pad from the first second, lit on the board, its card "Came with the yard"; the bundle beside it. It turns only while the boss stands at it (R1). Cable → `cable.yield_` copper, `cable.tinned` of it No.2, the rest bare bright; PVC to its bin.
- **Powered stripper** (`machines.stripper`): a purchase on the same pad, same inputs, runs alone; fed first.
- **Motor bench** (`machines.bench`): whole motors → its `out` shares and `waste`.
- **Crucible** (S11, E22; `machines.crucible`), under its extraction hood, padlocked with price and sample ingot from 0:00. Recipes **brass** (brass solids → brass ingot + dross) and **aluminium** (cast aluminium only: alloy wheels and the cast aluminium of motors and loads → "Aluminium alloy ingot" + dross; content2's recipe takes wheels only, the third pass widens it). The charge is taken by mass: "Take from bays" (on by default) reserves the recipe's grade up to one charge; carriers may also feed it. The charge is new metal plus the heel, capped at the pot; heat time and dross count the new metal only; less than one ingot stays as the heel. A recipe change with a heel first asks "Pour the heel as a short ingot?", pours it as one short ingot of its grade, and switches; refused during a heat. **The first heat ever** waits at "Ready to pour" until the boss is within `first_wait_m`, then pours with a camera nudge; later heats pour when they end. A person in face shield and aluminised apron is drawn at every pour (the boss within reach, else the nearest crew member: a picture). Ingots cool to their metal's colour in about 3 s (a picture).

**The process board** (D16, S15), the progression screen (an office tab and a clipboard row): enamel plates joined as a tree; a plate opens its machine's card; machine levels are bought on the plates.

| Row | Plates |
|---|---|
| Cable | Hand stripper (lit from the start) → Powered stripper |
| Motors | Motor bench |
| Melt | Crucible → Brass recipe, Aluminium recipe |
| Greyed, a plain padlock | Bronze · Lead · Lithium · Platinum group and iridium · Tungsten |

A greyed plate names its material and nothing else: no price, no machine, no promise. It is where the owner's list of metals first shows.

### 2.6 Crew

Three roles, hired and levelled on the office's **rota** (S15); each hire walks out of the portacabin door. Vests: yard hand green, cutter blue, driver teal; the boss hi-vis with a white hat. **Crew are agents on legs** (E17, 2.12): each trip is chosen when it starts and ends at a time computed then; the crew member the player sees walking IS that trip. First names from `crew-names.json`.
- **Yard hand** carries on a sack truck (R2, `crew.hand.load`): one priority by place (S12), whole items, and, with no cutter or a full drop-off, whole light things at their unprepared grade (E4), so the yard earns, slowly, without the boss. Never from the heaps: the chalk circles are how the boss hands them over.
- **Cutter** cuts at the drop-off, then on the tipping floor, with the yard's best tool, never what the boss works and never the heaps.
- **Driver** takes the truck when the boss is not in it, to the partner whose load has been full longest, only if cash covers its price and the tipping floor has room for all of it (S12); the rota shows "kept for the next load: §x" (E19).
- **Places**: the crew keys of `shop` (`hand1`, `cutter`, `driver`; `hand2` and `cutter2` under E22's test).
- **The foreman** (master 3.4): crew and machines run faster by `foreman.boost` while the boss has worked in the last `foreman.windowS`, for at most `foreman.minutesPerDay` of each market day, shown by a meter on his vest; never away.

### 2.7 Partners, labels, trial loads, skips, the truck, the tipping floor

**Partners** (`partners.{id}`): {partnerFarm} opens with the truck (`opens`); {partnerDemolition} opens with the torch and stands on the lane before the weight-limited bridge (S18). Each has a site with a skip zone, a sign and a business card ({farmContact}, {demolitionContact}) on its office card.

**Loads are honest** (E3, E20, master 5.3). A skip's contents (whole things by object) are fixed when it fills and printed on its label, with its price, before anyone hooks it; the weigh-in equals the label; nothing is drawn after paying. Price = `roundMoney(k × as-found value at the day's prices)`, as found being each grade's `asFound` share of its prepared price; E20 sets k nearer 0.85 and contents of whole cast iron, cable, motors, uncut steel and appliances, so at least three fifths of a load's margin is the yard's preparing; nothing in a load needs a tool the player cannot own when the partner opens (content2's farm plough needs the torch: the third pass removes it). **The first load from each partner is a small trial load** at a fixed price a new yard can pay (`trial`, `trialPrice`). **Skips in rotation** (E13b): a partner has as many skips as its level, each filling in `fill_s`; another skip is a level bought on the partner wall.

**The label** (a world plate and the skip card): "{partner} · full" or "trial load", net mass, up to three thing lines and "+ n more", the price, and why it cannot be hooked ("Filling · full in {m} m {s} s", "Needs §{x} more", "The tipping floor has room for {kg}: {kg} more needed"). The card lists every thing.

**The truck** (hook-lift, one purchase) drives in and parks; entered by walking into it, left with "Step out"; carries one skip, never pieces; swaps, never crushes or tows. Its last stopped position is rules state.

**Hook**: still in the skip zone with the skip full, cash covering its price and the floor with room for all of it (floor mass plus the skip's at most `floorRoom_kg`): a ring of `truck.handle_s` (moving restarts it), then the price is paid by transfer and an empty skip goes down. A load that cannot be tipped is never paid for (test). **Weigh-in** over the weighbridge (2.2), then **tip** at the tipping floor: each thing takes a place on the floor, loose material goes to its pile; the boss and the cutter cut it, the yard hand carries it.

### 2.8 The posted price board, the market clock, Hold's signal

**The market clock** (S14, master 5.2): t_m = max(device now, `clock.highMs` + live monotonic time since the last resume), saved, never backwards, advancing in live play after a clock-back; live time from `performance.now`, passed in. Day D = floor((t_m − `board.epochMs`) / 86,400,000), the epoch a Monday 00:00 UTC. A gap over `away.gapS` goes to the away pass, the same engine (2.16). The rules keep running under an open overlay; the boss stands (the world engineer changes the ground work's "the yard stops under them" to match).

**One posted price a day per family** (`fe`, `nf`; `pm` for the converter's daily step only): x_f(D) = Σ_{k=0..29} 0.5^k × `board.a` × w_f(D − 1 − k), w_f(n) = 2 × hash01(worldSeed, f, n) − 1 (tune `a` 0.02 to 0.05); p_g(D) = round(p̄_g × (1 + x_f(D))) in hundredths; the converter's metal prices step by x_pm. A pure function of D: every phone shows the same board, nothing is saved.

**The day word**, Hold's signal: **low day** (x < −`board.wordBand`), **usual**, **high day**; on the board, each row and each bay chip when not usual. The board's first opening points at a day word ("Cast iron: a low day. Holding is free.").

**Shown equals applied**: every Sell carries the step it showed (`sell(grade, shown)`, `SellShown {day, price, grams}`); if the day has changed when the tap lands, "Price updated: §{a} → §{b}" asks again.

### 2.9 The supply deal

{foundry} appears on the office's partner wall at rung 2 (`deal.gate`) with "{q} kg of cast iron a day for {d} days at §{p} a kilo, locked at signing" (S21: "supply deal", never "contract"); p = round(A_ci(D) × (1 + premium)), A_ci the mean of the last seven days' cast-iron prices, q, d and premium from `deal.series[]`. After signing, cast iron weighed in first fills a reserve of q in its bay ("Reserved for {foundry} {a} / {q} kg"). At each 00:00 UTC, before anything else: delivered = min(q, reserve), paid and supplied on a delivery ticket; trust (`deal.trust`) rises for a full day and falls for a short one; **nothing is ever charged for a miss**. After d deliveries the next deal of the series is offered. Trust gates nothing in stage 1; it is shown on the card.

### 2.10 Goals and the advice line

**Goals** (`goals[]`: `id`, `text` key ≤ 30 characters, `target` for the chevron, `done` condition read from the state, an optional `buy`, `optional`; written in `goals.json`): the card shows the first unfinished. A purchase goal is SHOWN no sooner than `advice.promptGapS` after the previous prompt (how goals are shown, never what paces the economy, E18). No goal is met by doing nothing. After the first pour the goal "Widen the yard: {item}" names the advice line's purchase (1.3 item 10).

**The advice line** (the expanded card's third line, the only line after the last goal; no label): the cheapest purchase that widens the bottleneck now, priced at most cash plus `advice.minutes` minutes of income, and never one that would leave cash below E19's reserve (2.12). A level that would change nothing now is shown on its card with what it would add and "not the bottleneck now", and the advice line never names it (E19). Income is `incomeRate` (2.13).

### 2.11 Rungs, range, prices, ceilings, the industry table and rivals

**Rungs are positions, never titles** (S15, D8, D16). Rung r is entered at `ladder.rung{r}.t` lifetime supplied and range `ladder.rung{r}.range` (3, then 5; rung 3 at 28 t, E14). The crane hangs "{homeYard} · {t} supplied"; goals read "Supply {t} t (3 metals)"; refusals "Opens at {t} supplied". Rung 2's portal and ID desk are equipment, never the yard becoming licensed. Rungs 4 to 9 show on the table with their gates and a padlock.

**Range**: a material counts once its lifetime supplied products are worth `ladder.theta` at p̄. Stage 1 offers six (light iron, cast iron, steel, aluminium, brass, copper) and rung 3 asks five, so a hand that skips the torch still gets there. Intermediates count tonnes only.

**Prices** (E12, E13, E18): a purchase in `shop` is priced from what it is worth over the following twenty to thirty minutes with every later purchase still made (leave-one-out), with a floor of three fifths to one of the income at that moment (`tauMin`, `addsPerMin` and `incomeNow` record the derivation); a level is priced at tau(L) × the capacity it adds × the mean margin per tonne at usual prices (E13a, tau from about 20 minutes to nine hours), from content3's rated table (`levelPrice`, 2.15). **Rated capacity R** (t/h): 2.12. **Ceilings** are a guard (D5, S16): `ceilings_t_h` at rungs 1 to 3; a purchase lifting R over its rung's ceiling is refused ("Yard capacity {c} t/h · grows at {t} supplied").

**The industry table** (notice board and chip): the top line "the largest full metal recycling and resource supplier", nine rungs (current lit, next with its gates), range chips, 26 rows (rank, 24 pt plate logo, chip name, tonnes, "simulated"), the player pinned, "Rival firms (simulated)".

**Rivals** (S17, D19, E24): `rivals[]` with `id` (rival01 = register `rival.1`), `T0_t`, `passMin` (the plan) and `g`; chip names from the register (≤ 14 characters). Each is a growing pure function of the market day: T_i(d) = T0 × (1 + g × min(d, 40)), d market days since the player's start (content3 delivers the functions for all 25 and places the starting tonnes from the tuned hour). A passed rival never passes back: as a guard the k-th rival below the player shows at most (1 − 0.03 k) of the player's tonnes, so no two rows print the same figure (test). Position never falls while away; "Passed {rival}" fires once.

### 2.12 The engine: whole items, mass, agents on legs, one event queue (E17)

**Two kinds of stock.** (a) **Whole items**: a *thing* (`ThingState`: in a zone heap, a drop-off slot, on the tipping floor) and a *piece* (`Piece {id, grade, g, from}`: on the ground in a pile, on a load, in a hopper). Each has its mass from content (`objects.{id}.pieces[]` as `[grade, g, n]`, `gross_g`); a piece exists from the moment its cut completes; carriers move whole pieces and whole things; a whole thing is weighed in whole at its `whole` grade; the converter is one piece. (b) **Mass** in integer grams by grade: bays, out trays, the PVC bin, the crucible's pot and heel, a machine's work in progress. Nothing else is fractional: no ticket prints part of a thing.

**Time** is play seconds (`stats.playSeconds`); two times within 1e-6 s are one instant (R12). Every distance a leg covers is `map.routes["a-b"]` (either order) if listed, else `map.detour` × the straight distance between the two points; the lane adds `map.lane[partner.lane]` each way from the gate.

**Agents and their legs.** Each agent holds at most one pending dated event (`endsAt`), computed when its leg starts and never moved by later rates (the foreman's boost and levels apply from the next leg).
- **The boss** (live only, from presence, 2.1; never an agent away): his acts are `work` (a piece of the nearest workable thing ends at start + t − progress, t = max(`cut.minS`, kg × `h` / P of his best tool); interrupted by moving, it keeps `progress` on that thing), `pickup` (one piece every `pick_s` within `reach.pickup`, the swap of S9), `weigh` (`weigh_s` on the platform), `feed` (one piece every `pick_s` into a hopper with room), `circle` (the load into a chalk circle after `feel.workDelay`), `strip` (R1: the hand stripper works only while he stands in its zone), `hook`, `drive`. Each act ends in a dated event; a new presence sample may cancel it (2.15).
- **Cutter**: when idle he takes the thing no one works with the highest prepared value per cutting second, at the drop-off first, then the tipping floor; never the heaps, never the boss's thing. His power is `tools[best].P` × `crew.cutter.share` × (1 + `lev` × (L−1)), at most `cap` × P. He walks there at the crew's speed (`crew.hand.v`) and cuts. **When he starts a thing**: if the boss is present and within `reach.sight` of it, each piece is its own event and drops to the place's pile as it completes; otherwise the whole thing is one event at the sum of its piece times, and its pieces appear together (E17). Waste goes to the rubble skip.
- **Yard hand** (R2: on a sack truck, `crew.hand.load` kg, speed `v` × (1 + `lev` × (L−1)), `handle_s` at each end). **At each departure** he chooses by S12's list the first place with work: (1) *feed*: an owned machine whose hopper has room for a piece of its input that lies in a chalk circle, at the drop-off front or on the tipping floor (in that order); (2) chalk circles; (3) out trays (loose mass, up to his load); (4) the drop-off's loose pieces; (5) a whole thing at the drop-off of at most his load, at its `whole` grade, when no cutter is hired or every drop-off place is taken (E4); (6) the tipping floor, loose pieces, then such a whole thing. Inside a place: highest p̄ per kilogram (R7: cable at its copper, `cable.yield_` × p̄ of bare bright), ties heavier first, whole pieces while they fit. He **claims** what he will take at departure; nobody else takes a claimed item. Events: *pick* (at the source after walking and `handle_s`: the claimed items move to his load) and *drop* (at the destination: into the hopper, or weighed in on the platform with a crew chip, 4.4). **When nothing waits** he walks to his stand by the scale house and stands; he is re-offered work at every later event.
- **Driver** (when hired, the truck owned, parked in the yard and empty, the boss not in it): at any event he may depart for the partner whose skip has been full longest, only if (a) cash covers its price, (b) the tipping floor has room: floor mass + the skip's mass ≤ `floorRoom_kg`. At departure the price is **earmarked**: no purchase may take cash below it (refusal `cash`), so the hook always pays. Legs: walk to the truck; drive out (speed `truck.v` × `driverFactor` × (1 + `crew.driver.lev` × (L−1))); hook (`truck.handle_s`: pay by transfer, the partner's next skip starts filling); drive back over the weighbridge (skip ticket); tip (`handle_s`); park and walk to his stand. **E19's reserve**: when a skip will be full within `advice.reserveS` and the driver can fetch it, its price is shown on the rota as "kept for the next load: §x"; the advice line and the bots never spend below it; it refuses nothing.
- **The merchant's round** (S1, R5): *waiting* at its stand; at the first event at which any bay has collectable grams (not held, not reserved; or set aside by Sell) it starts *loading* for `merchant.load_s` and fixes the lot then: every collectable line, resolved down to the lot step (0.1 kg); at the end of loading it pays (`collected`), and is *away* for `merchant.round_s`; on return it waits or loads again at once. A lot pays the posted price of the day it pays; set-aside grams pay their `asidePrice`; a converter is a whole piece paid on assay by the payables of `converter` (2.4).
- **The public drop-off**: the first arrival at `dropoff.first` s, then one every `dropoff.period` s while fewer than `dropoff.places` things wait; while all are taken the next arrival waits for a place to free and comes at that instant. The object is `dropoff.initial[n]` while n is inside that list, else drawn from `dropoff.mix` by `hash01(worldSeed, 'dropoff', n)`. Each arrival is a thing in a slot and a slip.
- **Machines** work mass at a rate. A hopper holds whole pieces up to `inbuf` kg (a piece enters only if it fits whole). When idle with a piece in its hopper, a machine takes it into work: its output is credited to the tray continuously by the cumulative rule out_g(t) = floor(share × rate × (t − startAt)) per output grade, the last credit of a piece giving the exact remainder, so ticking and jumping credit the same grams. Its event is the end of that piece (mass / rate). A full tray (`machines.{id}.tray` kg, content3) stops it at the instant the tray fills (an event); nothing is lost. Rate: `machines.{id}.rate` kg/s × (1 + `lev` × (L−1)) × the foreman's boost; at an event that changes the rate, the work is credited to that instant and restarted from it. Outputs: the strippers give `cable.yield_` copper (`cable.tinned` of it No.2, the rest bare bright) and the rest PVC to the bin; the bench gives `machines.bench.out` shares and `waste`.
- **The crucible** (S11; mass only). *Take from bays* (on by default) reserves the recipe's input grade in its bay (`forCrucible_g`) from incoming weigh-ins and from unreserved stock, up to the room left in the pot; while no heat runs, reserved grams move into the pot at once (`charge_g`). A carrier's piece of the input grade melts in whole if it fits. The pot is `pot` kg × (1 + `lev` × (L−1)) including the heel. A heat starts when charge + heel fills the pot, or at the event lastFeedAt + `start_idle` when charge + heel ≥ `start_share` × pot. It lasts `s_per_kg` × the new metal's kg (the heel is not counted). At its end: dross = round((1 − yield) × charge_g) of the recipe's dross grade, metal = charge_g − dross + heel_g, n = floor(metal / `ingot_kg`) (content3), the heel keeps the rest; ingots and dross go to the tray. **The first heat ever** stops at *ready* until the boss is within `first_wait_m`, then pours; later heats pour at their end. The cooling (`cooling`) is a picture; the tray holds the ingots from the pour.
- **Partners' skips** (E3, E13b). An open partner has as many skips in rotation as its level; each fills in `fill_s` from when it is set down; its contents are fixed when it fills (`hash01(worldSeed, partner, n)` over the mix in content3; the trial skip is the content's `trial` list, full from the moment the partner opens). The label shows the oldest full skip.

**What is an event**: every agent's `endsAt`; a machine's piece end or tray full; a heat's end and the first-pour wait; the drop-off's next arrival; a skip full; the merchant's load start, payment and return; the foreman's boost ending; the day boundary (00:00 UTC of the market clock: the board's step, the deal's delivery, the rivals' day). **The queue is derived from the state** (the minimum over every dated field), so saving the state saves it.

**Order at one instant**: (1) the day boundary; (2) completions in this order: machines and the crucible, the boss's act, the cutters, the yard hands (pick before drop), the driver's legs; (3) arrivals: drop-off, skips full; (4) the merchant's round; (5) departures of idle agents: cutters, yard hands, the driver, each in id order; (6) the derived checks: rung, rivals passed, the deal offer, goals, lessons. Each step sees the state the earlier steps left.

**A leg in flight whose source or destination changes**: claimed items cannot change; a hopper that has filled when a yard hand arrives takes what fits and he carries the rest on to the platform (a new leg from there); a machine bought while a hand is out is offered at his next departure; the driver's skip and cash are earmarked; a thing the boss starts that a cutter has claimed is refused silently (he works the next nearest).

**R(assets)**, rated capacity in t/h, is the throughput of the current crew and machines with full feed and no boss, computed from the same rates; it feeds the ceilings (2.11) and the level cards' "+x t an hour" (E13d).

### 2.13 The state, field by field, and the derived values

`SalvageGame = GameState & {salvage: SalvageState}`; cash is the shared `GameState.cash`, changed only through `money.ts`'s one commit; save tag `SAVE_TAG` = `salvage1`. `SalvageState`, as the types name it, with E17's changes (the rules lead makes them; the names stay):
- `v`; `clock {highMs, day, startDay}`; `owned` (shop keys); `tier`; `carrier`; `load` (pieces); `presence`, `presenceAt` (a sample older than `feel.staleS` is no boss); `act {kind, target, since}` plus its `endsAt`.
- `things[]` (`uid, obj, at, cut, progress, by`; `by` also a claim).
- `piles`: **whole pieces by pile key** (`beside.<uid>`, `zone.<id>`, `dropoff`, `floor`, `circle.<n>`), each `Piece {id, grade, g, from, claim}`; out trays are mass in their machine.
- `bays[grade] {g, held, aside_g, asidePrice, forCrucible_g, forDeal_g}`; the converter's bay also counts pieces.
- `machines {hand_stripper, stripper, bench, crucible}`: `owned, level, status, since`; the hopper as pieces; `tray_g` (mass); `work {piece, startAt, credited_g} | null`; the crucible adds `recipe, fromBays, charge_g, heel_g, phase, endsAt, lastFeedAt, firstPoured, cooling`.
- `crew[] {id, role, slot, name, level, job, phase, from, to, t0, t1, carries}` plus `load` (pieces), `claims`, `endsAt`.
- `partners[id] {open, trialUsed, level, skips[]}` (a list: one skip per level in rotation, E13b).
- `truck {owned, x, y, heading, skip, by, trip, hookRing}` plus `earmark` (§ and floor kg held for the driver's trip).
- `merchant {phase, endsAt, lot}`; `dropoff {nextAt, n}`; `deal`; `foreman {day, used_s, lastWorkAt}`; `ladder {supplied_g, worth, rung, passed}`; `goals {at, skipped, lastPromptAt}`; `lessonsSeen`; `tickets` (last 50), `ticketNo`; `away`; `draws`; `stats {playSeconds, lastSavedMs, scaleRound_g}`.
- **Removed**: `debt` (R3 is rejected, E11) and `engine.segmentAt` (no flows are saved).

**Derived** (pure, read-only, the `rules-book` package): `priceOf(grade, day)`, `boardRows`, `ticketLines`, `cardOf(ref)` (each row with its exact price and refusal), `skipLabel`, `rankRows`, `rangeChips`, `nextGoal`, `advice`, `processBoard`, `piecePos`, `rated` (R), `incomeRate` (collected § of the last five minutes ÷ 5), `reserve` (E19), `levelPrice`, `topBar`, `frame` (the `FrameTable`: crew and vehicles as legs `from, to, t0, t1`, which the world interpolates).

### 2.14 What a tick does, in order, and what it returns

`tick(cfg, g, dt, now) → {g, events}` is `advance(g, t + min(dt, MAX_TICK))` with the latest presence:
1. **The clock**: t_m = max(now, `highMs` + live time since the last resume); if t_m − the last tick's market time > `away.gapS`, the gap goes to 2.16 first.
2. **Presence** already applied by its action (2.15).
3. **Advance**: repeatedly take the earliest event ≤ the horizon, credit every machine's mass to its instant, apply it and the others at that instant in 2.12's order, re-offer idle agents; then credit machines to the horizon.
4. **Checks**: rung, rivals passed, the deal offer, the goal, lessons.
5. **Return** the new state and the typed `SalvageEvent`s of `types.ts` in the order they happened; nothing in them is a word.

A jump is `advance(g, nextEvent)`; the gate compares ticking at 0.1 s and jumping minute by minute (cash, supplied, every stock) on every bot run.

### 2.15 Every player action, with its checks and refusals

Every action is pure `(cfg, g, ..., clock, events)`; a refusal returns the same state and pushes `refused {key, args}`; every purchase compares the shown price with the price now and re-asks (`priceUpdated`) if they differ.
- `presence(p)`: stores the sample; starts, continues or cancels the boss's act (work after `feel.workDelay` within `reach.work`; pickup within `reach.pickup`; weigh, feed, circle, strip within `reach.place` of the point; entering the truck within `truck.enter` when `by` is null).
- `buy(item, shownPrice)`: refused `owned`, `rung` (the item's `gate` not reached), `cash` (price > cash − earmark), `ceiling` (R after the purchase above this rung's `ceilings_t_h`). Then cash −= price; owned; the arrival event (van, flatbed, truck) after the item's delivery seconds (content3; 0 until then); a machine works from its arrival.
- `hire(role, shownPrice)`: the next unbought crew key of that role in shop order (`hand1, hand2, cutter, cutter2, driver`); refused `noPlace` when none is left, then as buy; the hire walks out of the office.
- `level(target, shownPrice)`: price `levelPrice(target, L+1)` (content2: base × tau(L) × 1.12^(L−1); content3: E13a's rated table); refused `topLevel` at `maxlev`, `cash`, `ceiling`. A level that would not widen the bottleneck is sold, shown "not the bottleneck now" (E19); `nothing` is not used in stage 1.
- `setHold(grade, on)`; `sell(grade, shown)`: only on a held bay; shown.day must be today, shown.price `priceOf(grade, today)`, shown.grams the bay's unreserved, not set-aside grams resolved down to 0.1 kg, else `priceUpdated`; then `aside_g` += grams at that price.
- `setRecipe(recipe, confirmHeel)`: the recipe owned; `heatRunning` during a heat; `confirmHeel` asked when a heel exists; then the heel pours as one short ingot to the tray and old reservations are released.
- `setFromBays(on)`; `signDeal(terms)` (terms equal today's, else `priceUpdated`), `declineDeal`; `stepOut()` (the truck stopped; its place and heading become state); `ackAway()` (closes the card; pays nothing).

### 2.16 Time away

The same `advance` with **no boss**: no boss acts, no foreman, the hand stripper idle (R1), cutters on whole-thing events. A = min(t_m − max(`stats.lastSavedMs`, `clock.highMs`), cap), cap `awayCap_h[0]`, or `[1]` with the Night watch. Day boundaries inside A happen at their market time; the time beyond A passes with no work. If the boss left the truck loaded, the driver (when hired) finishes the weigh-in and the tip. Cash is in the state when the pass returns (paid when computed); `highMs` rises to t_m, so a clock that jumps forward and back never pays a stretch twice. The **away card** (`AwayCard`) lists the lots collected during the pass by grade, supplied, loads fetched, deliveries, rivals passed, and a hint when little was earned (S13). No rank is lost: rivals are pure functions of the day under the S17 guard. The bench prints how long six hours away take (aim < 50 ms in node).

### 2.17 The content data

The content file is one source for the rules, the screen and the bots (S23): content → `src/config/salvage.content.ts` → `games/scrap-yard/game.json` (`salvage` block, parsed by `src/config/schema.salvage.ts`). Masses are grams where a key ends `_g`, kilograms where it ends `_kg` and in `load`, `inbuf`, `pot` and `carriers`; seconds `_s`; minutes `_m`, `passMin`, `tauMin`; hours `_h`; prices § a kilogram at the usual price; positions metres. **The third pass's `content3.json` replaces every number below and adds footprints (`map.places`), rated level prices, skips in rotation, rival functions and the keys this document marks "content3"; its `$changes` list says what moved.**

| Family | Meaning and unit |
|---|---|
| `version`, `units`, `$keys`, `worldSeed`, `names` | provenance; the counter-hash seed; invented names by register id (written by the build script) |
| `grades.{id}` | `name`, `pbar` (§/kg), `family` (`fe`, `nf`, `pm`), `material` (range; null for intermediates), `kind` (`grade`, `product`, `intermediate`), `asFound` (share of the prepared value a grade fetches unprepared, E3), `sprite` |
| `cable` | `yield_` copper share, `tinned` share of it (No.2), `k` cable's price as a share of its copper's value |
| `converter` | `pt_g`, `pd_g`, `rh_g` grams; `pt`, `pd`, `rh` §/g; `pay_pt`, `pay_pd`, `pay_rh` payables; `ceramic_kg`, `ceramic_fee`, `assay_fee`; `source` (the car); `paid` (§ at usual prices) |
| `objects.{id}` | `tier`, `h`, `pieces` (`[grade, g, n]` in cut order), `waste_g`, `whole`, `gross_g`, `preparedValue` and `asFoundValue` (§, for checks), `text` (a note, never shown), `sprite`, `stages`, `size`, `source`, `certifiedEmpty` |
| `zones.{id}` | `tier` (the sign), `things` (counts by object), `centre`, `r` (m) |
| `map` | `points` (m), `detour` (route ÷ straight), `lane` (m from the gate to each partner and the bridge), `routes` ("a-b" m), `places` (footprints, content3) |
| `tools.{id}` | `tier`, `P` (kg/s at hardness 1) |
| `carriers` | kg per carrier (`frame`, `sack`, `trolley`) |
| `walk`, `pick_s`, `weigh_s` | the boss's speed (m/s); seconds a piece is picked up or fed; seconds on the platform |
| `truck` | `v` (m/s), `handle_s` (hook, tip), `driverFactor`, `radius`, `enter` (m) |
| `machines` | `hand_stripper` (`rate` kg/s, `needs_boss`, `inbuf` kg), `stripper` and `bench` (`rate`, `inbuf`, `lev` share a level; bench `out` shares, `waste`), `crucible` (`pot` kg, `s_per_kg`, `lev`, `start_share`, `start_idle` s, `recipes` [in, out, yield, dross], `first_wait_m`); content3 adds `tray` kg and `ingot_kg` |
| `crew` | `hand` (`load` kg, `v` m/s, `lev`, `handle_s`, `maxlev`), `cutter` (`share` of the tool's P, `lev`, `cap`, `maxlev`), `driver` (`lev`, `maxlev`) |
| `dropoff` | `period` s, `first` s, `places`, `mix` (object, weight), `initial` (objects) |
| `partners.{id}` | `opens` (shop key), `lane` (key of `map.lane`), `trial` and `skip` (things by object), `fill_s`, `k`; `trialMass_kg`, `trialPrice`, `trialPrepared`, `skipMass_kg`, `skipPrice`, `skipPrepared` (checks), `sprite` |
| `floorRoom_kg`, `merchant`, `scale`, `bays` | the tipping floor's room; the round (`id`, `load_s`, `round_s`); the scales' steps and maximum; bay capacity by grade (kg) |
| `shop[]` | in goal order: `key`, `kind`, `place`, `price` §, `gate`, `addsPerMin`, `incomeNow`, `tauMin`; content3 adds delivery seconds |
| `levels` | `tau` (`first`, `growth`, `cap` minutes), `bases` (§/min a level adds, by target); content3: the rated price table (E13a) and partner levels as skips in rotation |
| `ladder`, `ceilings_t_h`, `awayCap_h`, `rivals[]` | rungs (`t`, `range`) and `theta` §; guards (t/h); away caps (h, without and with the Night watch); `id`, `T0_t`, `passMin`, `g`, `sprite` |
| `reach`, `feel`, `cut`, `board`, `deal`, `foreman`, `away`, `advice`, `goals`, `lessons` | 2.1, 2.4, 2.8 to 2.10; content3 adds `reach.sight` (m) and `advice.reserveS` (s) |
| `yard`, `worker`, `helpers`, `props` | the ground work's world block (size, view, bodies, static solids) |

The frozen test content (`src/engine/fixtures/salvage.ts`) has the same keys with round values chosen for the tests, never the tuned ones (BRIEF lesson 4).

### 2.18 The first hour as measured

The second prototype (fifteen seeds, two routes, three hands) and its audit. Rows the audit confirmed are printed **(p2)**; rows the audit showed to be the test player's doing (a 60 s purchase gap that held affordable goals back, E18) print the AIM and wait for the third pass.

| Beat | Band | Normal, route A (p2) | Normal, route B (p2) | Slow, route A (p2) |
|---|---|---|---|---|
| First collection ticket | ≤ 25 s (route B: 35 s, E14) | 0:16 to 0:22, 15/15 | 0:25 to 0:32 | 0:19 to 0:26 |
| Copper jump | ≤ 1:30 | 0:39 to 0:46, 15/15 | 0:25 to 0:32 | 0:47 to 0:58 |
| Yard hand carrying | ≤ 5:00 | 2:18 to 2:30, 15/15 | 2:06 to 2:19 | 2:59 to 3:52 |
| Rung 2 | 12 to 18 min | 13:10 to 14:29, 15/15 | 13:10 to 14:19 | 15:06 to 17:52 |
| First pour | 18 to 25 min | 21:20 to 24:34, 15/15 | 21:06 to 24:03 | 24:00 to 29:13 |
| First drive out | 8 to 10 min, both habits | aim; third pass | | |
| Purchase rhythm | E12, E18 (1.3) | aim; third pass | | |
| Income windows, minutes 40 to 60 | E15; E19 (play ≥ 1.25 × away) | aim; third pass | | |
| Rung 3 | 55 to 65 min at 28 t | aim; third pass | | slow: to 100 min (E24) |
| Days 1 to 3 | E8, E13e | aim; third pass | | |

The audit's findings the third pass must answer: the converter as one piece (it was never paid as mass); the aluminium recipe wired; prices by leave-one-out (the cutter was priced at a tenth of its hour's worth); supply levels after the torch; play against away; skip margins from preparing (E20); ticket arithmetic. Its delivery adds: a minute-by-minute table for the normal hand on one seed (sales, spend, cash, supplied, rank, event; each row adding up), purchase gaps over three minutes, the slow hand against the normal on the same seed (E24), the away share at minute 60 (S13), the hands-off test from states with little cash, and the bench time of six hours away.

---

## 3. The yard as a map

The ground work's yard: fenced, 64 × 40 m, three screens wide at 844 × 390, split by the container wall (x about 24) with its wide gap for the truck and its 1.4 m gap for people; the gate in the east fence, the lane running east from it. Every place is a point of `map.points` (positions flow content → game.json → the rules and the screen, S23); routes are `map.routes` or `detour` × straight. From east to west (p2 coordinates as examples):

- **The gate side**: the boss starts just inside the gate (`start`, 59, 24) by the **public drop-off** (`dropoff`), where the first washer stands (S10). The **truck park** (`park`) lies south-east by the fence.
- **The working core, the hero frame** (S19: 21 × 9 m): the **platform scale** (`scale`, 53.5, 23) and the **weighbridge** (`weighbridge`) side by side, the **scale house** (`scalehouse`) north of them, the **bays** (`bays`) with {merchant}'s stand (`merchant`) north-west, the **stripper pad** (`stripper`) with the bundle (`bundle1`), the **copper and brass stillages** (`stillage_cu`, `stillage_br`), the **price board** (`board`) and, at the core's west end, the **crucible pad** (`crucible`, 37, 25). The scales lie between the drop-off and the stripper, so the opening walk is drop-off → scale → stripper → scale on either route. `?view=hero` shows it; a test checks it between the top bar and the bottom row at 844 × 390 (the first store screenshot: copper, a ticket and a pour in one real frame).
- **South of the core**: the **tipping floor** (`floor`) within 12 m of the scales, on the truck's line from the weighbridge.
- **The middle**: the **motor bench** pad (`bench`), the **portacabin office** (`office`: the site licence on its wall; crews walk out of its door) and the **tool rack** (`rack`) to its east, north of the bench.
- **The old stock** beyond (E1): zone 1 (`Z1`) at the container wall, zone 2 (`Z2`) south-west through the gap, zone 3 (`Z3`) north-west with the car (`car`).
- **The back field** (`backfield`): the south-west corner's gate, a plain padlock and its sign (1.4).
- **The lane** (`map.lane`): {partnerFarm}'s site first, its load and label in view from the gate; {partnerDemolition}'s farther, its gate shut with "Needs a cutting torch"; the **weight-limited bridge** ("Weight limit 7.5 t", a padlock) to stage 2's partners, who are not named; a plain barrier at the lane's end.

**What the third pass delivers (E23)**: a footprint in metres for every place (`map.places`); nothing overlaps (in content2 the weighbridge overlaps the platform scale and runs out of the hero frame, and the stripper overlaps the copper stillage: the scales are moved apart and the stripper clear); zone 1 stands clear of the container wall and its gaps (content2's zone 1 sits on the wall and fills its 1.4 m gap); the hero frame is tested on footprints at the game's scale (vehicles at two thirds of true length, so the weighbridge deck fits the game's truck); and the notice board gets its point (content2 has none; it stands by the office).

**Solid**: fences, the container wall, buildings, the tool rack, machine bodies, the crucible and hood, stillages, lock-block walls, the rubble skip, uncut things, the car, the notice board, the bridge's rails, partner sheds; not solid: decals (scale plates, pads, the tipping floor, chalk circles, lines) and pieces on the ground. The truck (`truck.radius`) cannot pass between stillages, into the heaps or through the 1.4 m gap.

**Where purchases arrive**: a machine on a flatbed whose crane sets it on its pad (it works from its arrival event, 2.15); tools and carriers by van at the rack; the truck drives to its park; crews walk out of the office; the Night watch is a sheet on the rota board.

**Visible but locked from the first second**: the crucible pad (in the first view at both sizes), zone 2's padlock chips, the car, {partnerFarm}'s load, {partnerDemolition}'s shut gate, the bridge, the back field's sign, the greyed plates, the table's top line.

## 4. The screens

### 4.1 Zones (points; insets read on all four sides; both landscape directions; a taller-than-wide window shows "Turn your phone sideways")

| Row | 844 × 390 (insets L 47, R 47, B 21) | 667 × 375 (insets 0; 16 margins) |
|---|---|---|
| Top bar | 36 | 34 |
| Goal card (one line; tap for three) | 28 | 26 |
| Free world | 237 | 239 |
| Bottom: stick zone left; the one button right | 89 (8 + 60 + 21) | 76 (60 + 16) |
| **Total** | **390** | **375** |

| Top bar (left to right) | 844 (safe width 750) | 667 (635) |
|---|---|---|
| Cash (15 pt heavy, rolling, the § coin) | 136 | 116 |
| Ladder chip ("26th of 26 · next {rival} 0.15 t"; tap: the table) | 408 | 340 |
| Carry ("28.6 / 30 kg"; driving "Trial load 400 kg") | 90 | 90 |
| Clipboard | 44 | 44 |
| Gaps | 3 × 24 = 72 | 3 × 15 = 45 |
| **Total** | **750** | **635** |

Nothing from the market sits in the top bar; there is no spare slot. Bar text is sized by hand from min(fontScale, 1.3) with `allowFontScaling={false}` in rows whose heights add up. At 667 at most four HUD lines. The goal card sits left under the bar (400 pt at 844, 340 at 667), one 12 pt line with progress at its right; a tap opens three lines (goal, next, the advice line, 84 pt tall), closed after 6 s or a tap. The one button is a 60 pt hi-vis disc, label 13 pt.

### 4.2 World labels

Plates of 11 pt on paper chips: place names on first sight; padlock chips over locked things and pads (padlock, the condition, the exact price where there is one); bay chips (4.4); skip labels (2.7); the chevron (hi-vis, over the goal's target; an edge arrow when it is off screen). Every place label is at most 18 characters.

### 4.3 Overlays

The mode's own views registered with `useOverlay`, one at a time, closed by the scrim or Android back; never the kit Sheet or a `Modal`; the rules keep running beneath (2.8). Every card is `CardData` from `cardOf` (2.13): the screen formats numbers and nothing else.
- **Right panel**: min(520, 0.58 W) at 844 (489 pt), 0.62 W at 667 (413 pt), from the bar to the bottom inset, the place dimmed at the left. Title 15 pt; rows 44 pt (name 13 pt, effect line 11 pt of at most 38 characters; 31 pt of text at 1.3); Buy 96 × 36, its price 13 pt bold.
- **Wide card** (the process board): the safe width less 12 pt a side (726 at 844, 611 at 667), bar to bottom inset.
- **Centred card** (away card, rung sign, confirmations): at most 520 × 300.

| Overlay | Kind | Prints |
|---|---|---|
| Tool rack | panel | per tool and carrier: name, effect ("Breaks cast iron; cuts sheet faster", "Moves a washer in one trip"), Owned or Buy with price, or padlock and condition |
| Office: Rota | panel tab | "Site licence · metal dealer"; per role: first name, level, rate in the yard's units ("Carries 1.2 t an hour", E13d), Hire or Level with price, or "not the bottleneck now" with what it would add, or "Opens at {t} supplied"; the driver's "kept for the next load: §x"; the Night watch "Away cap {a} h → {b} h" |
| Office: Partners | panel tab | per partner its business card, the skips in rotation and their state, "Another skip" with its price; the supply deal from rung 2 |
| Office: Process board | wide card | 4.5 |
| Machine | panel | before: what it does, in → out, rate, Buy; after: hopper, tray, status ("Working", "Tray full", "Waiting for cable"), rate, "Level on the process board"; crucible: recipe, Take from bays, "{a} / {b} kg", "Pours in {m} m {s} s" or "Ready to pour", heel |
| Price board; Bay | panel | 4.4 (a bay opens the board at its row) |
| Skip | panel | 2.7 |
| Supply deal | centred | terms, Sign, Not now; then days left, reserve, trust, last delivery |
| Industry table | panel | 2.11 |
| Away card; Rung sign | centred | 4.4; the crane hanging "{homeYard} · {t} supplied", what it opens |
| Clipboard | panel | goals (done ticked), places visited (each opens its card), ticket history (50), Settings |
| Settings and Help | panel | Sound, Music, Haptics; Help (every lesson in full, a glossary, the shortened-time line); the fictional line; privacy; version; "Start the yard again" with a confirming card |

### 4.4 Tickets, the bay chip, the board, the away card

**The eye path of a sale**: scale display → bay chip → flatbed → cash counter, all in the hero frame and the top bar.
1. **Weigh-in ticket**: rises out of the display's printer slot (world-anchored, clamped inside the free world), ticket paper with its stamp by kind (the art director's), 280 pt wide at 844 and 260 at 667, at most 150 pt tall at font scale 1.3: a hi-vis header; up to three grade rows in three columns (short name, kilograms, "§{p}/kg today") and "+ {n} more"; the muted row "today's value §{x}"; the 11 pt legal line; at most one 11 pt lesson. After a few seconds (a feel value) it folds and the muted value slides down to the bay chip.
2. **Bay chip** (at the bay by the flatbed's stand): "{grade} {kg} · today §{x}" in the same muted grey; when the flatbed loads, the value slides into its bed.
3. **Collection ticket**: prints at the flatbed's cab, same paper and size, amounts in ink, "Paid §{x}" bold, the two-line legal line; a coin arcs from the cab to the cash counter, which rolls. A tap opens the history.
4. Once crews work, a crew weigh-in is a one-line chip at the scale ("Yard hand · 58.2 kg in") and a collection without the boss's weigh-in a one-line chip at the cab ("Lot sold · §29.00"); one ticket of each kind at a time.
5. In the first five minutes lessons show only on the value jumps (copper, brass, the converter); others wait for the grade's next weigh-in.

**The price board** (panel): "Market day {date} (UTC) · next prices in {h} h {m} m"; per grade seen a two-line row of 56 pt: pictogram, name, today's price, day word, Hold; five bars with the usual-price tick, the bay's stock, Sell with its total.

**The away card** (centred): "Away {h} h {m} m (cap {c} h)"; up to five grade lines and "+ {n} more"; "{t} supplied · §{x} (already in your account)"; loads fetched; deal deliveries; "You passed {rival}."; OK. With little to show it says what would have earned more ("A cutter keeps the yard working while you are away (Office)"). No ad button in stage 1.

### 4.5 The process board (wide card)

Title "Process board" 15 pt; four rows of plates (2.5). Plates are enamel: 132 × 60 at 844, 120 × 60 at 667, a name of up to two lines of 12 characters (12 pt) and a state line (11 pt: "Owned · level 2", "§{price}", "Level {n} · §{price}", a padlock); joined by riveted bars of 24 pt (20 at 667). Rows 60 pt with 12 pt between: 4 × 60 + 3 × 12 + a 32 pt title = 308 pt, inside 333 (844) and 325 (667). Row 4's five greyed plates are 108 pt wide at 844 and 112 at 667 with 12 and 10 pt between; a greyed plate has no state line, so its name may take three lines of 11 characters ("Platinum / group and / iridium") beside the padlock. A lit plate's tap opens its machine card; a greyed plate's tap shows only its padlock.

### 4.6 Text limits (S20, checked by `scripts/content/yard/check.ts` at 667 pt wide and font scale 1.3)

Goal text ≤ 30 characters; a panel's effect line ≤ 38; a grade's short name ≤ 18; a place label ≤ 18; a rival's chip name ≤ 14; a ticket ≤ three grade lines and "+ n more", one lesson line ≤ 48, total height ≤ 150 pt; board rows two lines; the legal line 11 pt; nothing under 11 pt. No text promises a future update; locked things show a padlock and a plain condition.

---

## 5. Content

### 5.1 Invented names by register id

Every invented name comes from `scripts/content/yard/names.json` (version 3, `byId`) by id and is never written as a literal anywhere else in this document or in code (D13, S21). The current name is shown here once, for reading; the register is right if it has changed.

| Id | What | Current name |
|---|---|---|
| `title` | the game's title, one plate per word in the loading animation | Scrap to Ingot |
| `currency` | the currency's name; its symbol is § | scrip |
| `homeYard`, `homeLane`, `homeTown` | the player's yard, the lane outside its gate, the town | Cinder Lane Yard, Cinder Lane, Oakbridge |
| `merchant` | the stage-1 buyer whose flatbed collects the bays (not a rival; its `short` name on chips) | Tollbridge Metals |
| `partnerFarm`, `farmContact` | the farm-clearance partner and its contact | Hob's Farm Clearance, Hob Garnett |
| `partnerDemolition`, `demolitionContact` | the demolition partner and its contact | Cottle Demolition, Edie Cottle |
| `foundry` | the supply-deal partner | Oakbridge Foundry Co-op |
| `rival.1` to `rival.25` | the rival firms in pass order; each entry's `chip` (≤ 14 characters) on the chip and the table | rival.1 Bramley & Daughters Scrap, rival.2 Pennick Scrap, rival.3 Brookmill Metals, rival.4 Tenterby Lane Metals, rival.8 Millbeck Ferrous |
| crew first names | `crew-names.json` | |

### 5.2 Labels and lines (`src/ui/salvage/strings.ts`, keys as `TEXT_KEYS` in the types; names of things from game.json)

HUD: "§{n}"; "{rank} of {n} · next {rival} {t}" (short "{rank} · next {rival}", "{rank} · {t} to next"); "{a} / {b} kg"; "Load full"; "Open"; "Step out"; "Trial load {kg}".
Places (≤ 18): Tool rack, Office, Scale house, Platform scale, Weighbridge, Notice board, Public drop-off, Rubble skip, Tipping floor, Truck park, Stripper pad, Motor bench, Crucible, Old stock, Back field, Bays, Price board, the lane, the bridge.
Chips: "{grade} {kg} · today §{x}", "held", "low day", "high day", "Reserved for {foundry} {a} / {b} kg", "For the crucible {a} / {b} kg", "certified empty", "Weight limit 7.5 t".
Cards: "Buy §{x}", "Hire §{x}", "Level {n} → {m} · §{x}", "Owned", "Came with the yard", "Sell {kg} · §{x}", "Hold", "Sign", "Not now", "Take from bays", "Pours in {m} m {s} s", "Ready to pour", "Pour the heel as a short ingot?", "Working", "Tray full", "Waiting for {grade}", "Not the bottleneck now · +{x}", "Kept for the next load: §{x}", "Another skip · §{x}"; machine lines "Strips heavy cable to copper", "Breaks motors into copper, steel, aluminium", "Melts brass or cast aluminium into ingots".
Lines: "Every load checked. Every seller identified. Payment by transfer only." · "The yard now earns while you are away." · "Back field · the works are being built here" · "All prices, exchanges and shares are fictional and have no real-world value. Nothing in this game is financial advice." (the board's first opening, the table, Help) · "Rival firms (simulated)" · "Building costs and times are shortened so the business grows in days, not decades; metal prices keep their true proportions." (Help).

### 5.3 Goals (≤ 30 characters; 1.3's order, R8 as amended by E22)

Take the washer apart · Weigh it on the scale · Strip the cable · Weigh the copper · Buy the sack truck · Take a washer apart · Hire a yard hand · Work the drop-off · Buy the sledge and grinder · Break up the radiators · Hire a cutter · Buy the flat trolley · Buy the powered stripper · Buy the hook-lift truck · Fetch the farm's trial load · Buy the motor bench · Break a motor on the bench · Hire a driver · Supply {t} t (3 metals) · Sign the foundry deal (optional) · Buy the cutting torch · Cut up the car · Fetch the demolition load · Buy the crucible · Charge the crucible · Pour your first ingot · Widen the yard: {item} (repeating; the advice line's purchase) · Supply 28 t (5 metals).
Under E22's test (placed by the third pass, else on the day-1 list): Hire a second yard hand · Buy the aluminium recipe · Hire a second cutter. Days 1 to 3: Buy the Night watch (after the first time away) · Finish the foundry deal · Pass {rival} · Visit the back field. The types' `goal.*` keys keep their names; `goal.levelHand`, `goal.levelStripper` and `goal.levelCutter` give way to one `goal.widen` (a request to the rules lead and the strings owner).

### 5.4 Refusals (key → text)

`cash` "Not enough cash: §{x} more" (also when the driver's earmark holds it: "§{x} is kept for the load on its way") · `owned` "Owned" · `rung` "Opens at {t} supplied" · `ceiling` "Yard capacity {c} t/h · grows at {t} supplied" · `tool2` "Needs a sledgehammer" · `tool3` "Needs a cutting torch" · `tooHeavy` "Too heavy to lift: {kg}" · `topLevel` "Top level. A better tool cuts faster." · `noPlace` "No free place on the rota" · `filling` "Filling · full in {m} m {s} s" · `loadCash` "Needs §{x} more for this load" · `floor` "The tipping floor needs room for {kg}" · `weighFirst` "Weigh it in first" · `heatRunning` "Wait for the heat to pour" · `noTruck` "Opens with the hook-lift truck" · `noTorch` "Opens with the cutting torch" · `priceUpdated` "Price updated: §{a} → §{b}" · `confirmHeel` (the heel's question) · `nothing` is not used in stage 1 (E19).

### 5.5 Lessons (one line ≤ 48 characters on a grade's first weigh-in ticket; the full sentence in Help and the history, `text.json`; no fixed multiples, S5)

| Grade | Ticket line |
|---|---|
| Light iron | Light iron: thin steel from appliances. |
| (the stainless drum) | The drum is stainless: worth more once sorted. |
| Electric motor | A whole motor: copper inside steel. |
| Heavy, thin cable | Cable is paid on the copper it yields. |
| Bare bright copper | Bare bright: {n} times iron's price today ({n} = round(p_bb(D) / p_li(D))) |
| No.2 copper | No.2: unalloyed copper, not clean. |
| Brass solids | Brass is copper and zinc. |
| Alloy wheels | Cast alloy wheels, tyres and weights off. |
| Cast aluminium | Motor end caps are cast aluminium. |
| Cast iron | Cast iron breaks. Foundries remelt it. |
| HMS 80:20 | HMS: thick steel cut to furnace size. |
| Steel, unprepared | Cut to size, it pays as HMS. |
| Car body | Car bodies go to a shredder. |
| Brass ingot | Melted, skimmed, cast: worth more than scrap. |
| Dross (both) | Dross: the skimmed crust, still holding metal. |
| Alu alloy ingot | Cast aluminium remelted as alloy ingot. |
| Converter | From depolluted car ref. 0012. Paid on assay. |

### 5.6 Voice and banned words

The master's `weighbridge-plain`: short plain sentences in the trade's words; no puns, no exclamation marks, no green claims, no future promises. `check.ts` fails any player text containing: bet, stake, odds, invest, tips, returns, jackpot, win, prizes, ticker, share price, order book, order, shift, freight, cargo, contract, salvage, haul, ore, fleet, logistics, eco, green, save the planet, learn to trade, District, any withdrawn register name, and any name of the four games (the bundle's string denylist). "Night watch", "rota", "supply deal" and "licensed waste carrier" are the words.

### 5.7 Where content lives

Every number in `src/config/salvage.content.ts` (S23), the map included; player words in `src/ui/salvage/strings.ts` (interface) and `scripts/content/yard/text.json` (names of things, grades, lessons, goal texts, partner card lines); goal structure in `scripts/content/yard/goals.json` (ids, targets, done conditions, text keys, no words); `scripts/content/build-yard.py` writes `games/scrap-yard/game.json` (never edited by hand).

---

## 6. Art

On the art director's style sheet (`docs/design/yard-style.md`, whose rules stand): flat vector, three-quarter oblique (40 pt a metre, tilt 0.7), drawn in code in `src/ui/salvage/art/` through its manifest (sheets A people, things, pieces; B machines, props, vehicles, plates; G ground) and baked during the loading animation; palette `YARD`; anchors at footprint centres; people in four directions (west mirrored, so people and vehicles carry no baked shadow: the world draws `drawActorShadow` under them), vehicles by heading; layered actors (carrier, load, vest overlay tinted per role) drawn in the order `actorLayers` returns.

### 6.1 Sprites and animations

| Group | Sprites and frames |
|---|---|
| Boss and crews | stand; walk 6; work 4 per tool (spanners, sledge, grinder, torch with face shield); feed 2; push sack truck and trolley 6; carry 6; the pour pose in face shield and aluminised apron 4; the driver in the cab; vests: boss hi-vis with white hat, yard hand green, cutter blue, driver teal; loads drawn as pieces on the frame or strapped on the carrier |
| Things, whole and in stages | every object of content (`objects.{id}.sprite`, `stages`): washer, bicycle, cable bundle and coil, tap and fittings crates, radiator, stove, trough, bath, gate, sheet, cladding, cylinder with tag, wheel, pipe bundle, the car with its record tag, beam, tank with tag, plough |
| Pieces (ground and carried) | panel, stainless drum, motor, cast section, copper shell, taps, cable, bare-bright bundle, No.2 copper, windings, end cap, wheel, body section, HMS piece, converter, brass ingot, alloy ingot, dross |
| Machines, weighing, stock | strippers and bench (idle, working 3, tray full); crucible under its hood (idle, heating 3, ready glow, pour 4, cooling); pads with padlock chips; sample pallet; platform plate, weighbridge deck, display posts with printer slot, scale house, price board, portal arch, ID desk window; lock-block bays, ferrous piles 5 sizes × 5 grades, stillages in 4 fill levels, converter cage, a held bay's flag |
| Vehicles | hook-lift truck × {no skip, empty, trial, full} + hook + tip (east-facing frames); {merchant}'s flatbed with crane + load 3; the machine flatbed + set-down; delivery van; the public's car and trailer |
| Yard and lane | fence, gate, portacabin with licence plaque and rota board, tool rack, notice board, rubble skip, PVC bin, chalk circles, park markings, extinguisher, back-field gate and sign, rung signs on the crane; lane, hedges, the bridge with weight sign and padlock, the farm's shed, the demolition hoarding, gate and excavator, the barrier |
| Effects and interface | sparks, sledge dust, torch flame, piece arc, coin arc, the value slide, work ring, chevron; ticket paper with its stamp by kind, chips, padlock chip, goal card, 10 pt pictograms of materials and intermediates, tools, roles, §, ladder, clipboard, settings, lock, clock; process-board plates (lit, buyable, greyed); 25 rival plates from a generated kit; business cards; {merchant}'s mark |

Never drawn (yard-style 11): a real brand or one shaped like it; a tow truck or crusher; a magnet lifting copper; anyone hurt, without gear or near sparks without a face shield; fire or smoke made fun; a lone gold bar; anyone bearing more than the hand load.

### 6.2 Atlas budget

Sheets A and B of at most 2048 × 2048 px at device density 3, and a 1024 × 1024 ground sheet G; statics away from the hero frame are baked small and drawn up (yard-style 12). Draw calls: the depth-sorted list is drawn in runs, one Atlas call per change of sheet (an open question to the lead, below; "three a frame" cannot sort a person behind a machine). At most 40 actors and 300 sprites; bakes on a CPU raster surface, sliced, surfaces disposed after the copy; every bake finishes behind the loading animation's calm loop (`atlasProgress()`).

### 6.3 Icon

The style sheet's candidates (a crucible in tongs pouring into a copper ingot with a bare bright bundle; a gloved hand with copper against a ticket; the display printing a ticket over copper), on hi-vis yellow or daylight blue, judged at 60 px beside the four games' icons before anything is built on one. Never a lone gold bar or a truck.

### 6.4 The loading animation (S22; `src/ui/salvage/Loading.tsx` and `src/ui/salvage/loading/`, drawn by `art/loading.draw.ts`, all the loading engineer's)

About 3.5 s on first launch, one plate per word of {title}, 0.6 s each; a tap skips it from the second launch. The art kit's 2.75 s timeline is stretched to this one.

| t (s) | Frame |
|---|---|
| 0.0 to 0.4 | Daylight sky and the hazy far yard fade in from the splash; the gantry crane's trolley runs in with its electromagnet; the display reads 0. |
| 0.4 to 2.2 | Three plates, the words cut through the steel, each 0.6 s: lowered onto the weighbridge deck (0.35 s), landing with a 2 pt shake (0.1 s), the magnet rising (0.15 s); the display counts up; then the trolley runs off. |
| 2.2 to 2.8 | The crucible under its hood tips (0.2 s) and pours a glowing stream (0.4 s) into the mould beneath the title. |
| 2.8 to 3.6 | The bar cools from orange to brass in 0.8 s and glints; from 3.2 the picture parts like two gate leaves onto the yard. |

If atlases still bake when the bar has cooled, a calm loop holds (the magnet swaying, the display's last digit ticking, the ingot glinting every 2 s), never a frozen frame; the gate parts when the bakes finish. One Reanimated shared value drives `loadingPose(t)`.

---

## 7. Sound

A new pack in `games/scrap-yard/assets/sfx` (`soundPack: null`), keys in `src/services/fx/catalog.salvage.ts`, mapped in `src/modes/salvage/soundKeys.ts`, played only through `fx.play`. Haptics: light on a finished piece, medium on a collection, success on a rung.

| Keys | Trigger (2.14's events) |
|---|---|
| `step_concrete`, `step_gravel`, `step_asphalt` | the walk cycle by ground tile |
| `cut_spanner`, `cut_sledge`, `cut_grinder`, `cut_torch` (loops) | `workStart` to `workStop` or the piece's end, by tool |
| `piece_steel`, `piece_cast`, `piece_alu`, `piece_copper`, `piece_brass`, `thud_waste` | `pieceOff` by family; to waste |
| `pickup`, `swap`, `load_full`, `feed` | the events of those names |
| `scale_beeps`, `scale_print`, `slip` | `weighIn`, `bridgeWeighIn`, `dropOffSlip` |
| `flatbed_arrive`, `flatbed_load`, `coin`, `coin_big` | `roundBack`, `roundLoad`; `collected` (big with copper or a first grade) |
| `lesson` (a soft bell), `deal_stamp` | `lesson`, `dealDelivered` |
| `ui_open`, `ui_close`, `buy`, `denied` | overlays, `owned`, `refused` |
| `van`, `set_down`, `crane_set`, `door`, `crew_hello` (a hum) | `arrival` by kind, `hired` |
| `stripper_hand`, `stripper_power`, `bench_knock` (loops) | `machineState` working |
| `furnace_roar` (loop), `ready_chime`, `pour_glug`, `cool_ticks` | `heatStart`, `readyToPour`, `pour` |
| `truck_diesel` (loop, pitch by speed), `truck_reverse`, `hook_swap`, `skip_tip` | driving, `hook`, `tip` |
| `chip_slide`, `rung_sign` | `passed`, `rung` |
| `load_crane`, `load_clank`, `load_pour`, `load_cool`, `gate_open` | the loading animation (the loading engineer's list) |
| `amb_yard` | always: birds, distant traffic, a far reverse beeper |

Music: "yard radio", an original 92 bpm loop of mellow electric guitar and bass over the game's own metal hits, two variants crossfaded, ducked under tickets; no melody shared with the four games.

## 8. Tests, bots and people

### 8.1 Rules tests (vitest, frozen test content `src/engine/fixtures/salvage.ts`; no tuned number pinned)

Mass kept per thing, machine, heel and scale (with `scaleRound_g`); whole items stay whole (no ticket, load or pile holds part of a thing or piece; the converter is one piece and is paid); cut times; tool tiers; pickup order, capacity and the swap (never lowering value, never while moving); one `piecePos`; chalk circles inert before a yard hand; the yard hand's priority at each departure, claims never taken by another, a filled hopper sending the rest to the scale; the cutter's whole-thing event when the boss is out of sight, with the same piece times; the driver's gates and earmark, and E19's reserve; tickets (rounding once at the scale, totals equal lines, every collection names its buyer, every partner weigh-in prints gross, tare, net); the round (one load after the first weigh-in, waiting stock, one ticket for several grades, Hold, Sell at its shown price, a full held bay); reservations never collected; supplied only on collection and delivery; the crucible as S11 (the heel, the first pour's wait, a recipe change); a converter without a source refused; loads (fixed at fill, label equals weigh-in, k × as found, trial loads, skips in rotation, never paid when it cannot be tipped); the board pure in D; the clock (a clock-back still advances live play; a jump never pays twice); a short deal day charges nothing; goals never met by doing nothing; the advice line never naming what does not bind; rungs, range, rivals (never passing back, no two equal rows), ceilings; every refusal key; save and reload; events at one instant in 2.12's order; ticking equals jumping minute by minute.

### 8.2 Bots (`src/engine/salvage/bot.ts`; the same actions as the screen, a path graph from the content map at the boss's speed; follows the goal card and the advice line)

People-like (S24, master 12.4): a reaction before every leg, path waste, time at each card; at least fifteen seeds and two opening routes; every beat as a range and as the share of runs inside its band. Two buying habits on every run (E18): a goal's purchase the moment it is affordable and its card read; everything affordable at once. No bot waits on a purchase gap; the harness's branch without an item cannot buy it.

| Bot | Behaviour | Measures |
|---|---|---|
| Normal, fast, slow hands | reaction 0.8 / 0.4 / 1.2 s, path waste 25 / 10 / 40 %, 6 to 15 / 4 / 15 s at a card; the slow hand leaves optional goals and runs to 100 minutes | every beat of 1.2 and 1.3; E12's cash at each goal; purchase gaps; income by five-minute window (E15); the slow hand against the normal on the same seed (E24) |
| Card manager | normal to the second hire, then cards only | the hand's worth (E4) |
| Live against away | from states of the hour: an hour played against the same hour away | E19 (play ≥ 1.25 × away) |
| Stop-and-return | stops at 5, 10 or 30 minutes, returns after 1, 4, 12 h | the first away card above zero (S13) |
| Twice a day | a first hour, then two short sittings a day for 3 days, both habits | a useful purchase every sitting (E8); cash under a day's income (E13e); the away share at minute 60 |
| Day-word holder | holds on low days | Hold's gain |
| No hand | twenty states, several with little cash, the stick never touched | the next goal purchase reached (E4, E24) |

### 8.3 Hard promises (gates on every bot run and in the rules tests)

Shown equals applied; a changed step re-asks. Money comes only from collected lots, Sell, deal deliveries and their away pass, and goes only to purchases, levels, hires and partner loads; nothing is bought on account (E11). Nothing costs by the clock, nothing built is lost, no rank falls while away, nothing bought has unknown contents. No dead end: with §0 and empty bays the drop-off and the round pay within 60 s; every amount asked for is reachable and never met by doing nothing; from the first hire, without the hand the yard still reaches the next purchase (E4). One monotonic clock; a jump never pays twice; ticking equals jumping minute by minute (cash, supplied, every stock; E17). Mass kept.

### 8.4 Aims (met on 13 of 15 seeds and checked on 5 unseen; a band not given here the lead sets from the third pass's table)

The beats of 1.2 and 1.3 with their bands (E7, E9, E14, S18), the slow hand within half as long again on nine pairs of ten (E24) · four rivals in the hour (E7) · E12's cash at each goal, no wait over three minutes, the buy-everything habit at most two ahead by minute 10 · income windows (E15) · always a purchase that widens the bottleneck after the torch (E19) · cash at minute 60 at most about ten minutes of income (E13e) · a ceiling refusal at most once in the hour (S16) · on the first partner's loads a minute of hand work earns at least 1.5 × a minute at the drop-off, after the load's price (S18, E20) · at least three fifths of a load's margin from preparing (E20) · every machine bought in hour 1 busy at least 30 % of the minutes after its purchase · the hand at least a fifth more than the card manager (E4) · an hour away pays at least 0.3 of an hour played at minute 60 (S13), and an hour played at least 1.25 of the same hour away (E19) · Hold ≤ +3 % · a tick < 1 ms and 6 h away < 50 ms in node; `?yardStress=1` read on the iPhone.

### 8.5 People before tuning

Three people-like players (not the engineers) play the built stage on an iPhone at both sizes before any number is tuned, 20 minutes each, reading what it deals in its order. They note, with the minute: where they did not know what to do, where a card hid what they wanted to see, each text they did not read, each wish for a second thumb, whether the eye followed the scale display to the flatbed and the cash counter, and whether they found the truck and the crucible without the chevron. The notes go to the lead before the content script tunes anything.

---

## 9. Work packages (S23; the lead's `BUILD.md` split, copied here; `BUILD.md` is right where the two differ)

**Rules of the folder.** Every file has one owner and is named once below; a change to another's file is one line in `requests.md` and a local stand-in. Numbers live only in `src/config/salvage.content.ts`; a screen never computes a price, rate, mass, time or coordinate and formats numbers only with the facade's formatters. Positions flow one way: content → game.json → the rules and the screen. Invented names come from the register by id. The ground work's files are kept and extended by their new owners. The contract (`types.ts`, the facade's signatures, the event list, the string keys) changes only through `requests.md` to the rules lead (`notes/contract.md`).

**Hour 0** (done before the packages start): `src/engine/salvage/types.ts` (content types, state, `Presence`, `SalvageEvent`, actions and refusal keys, `Ticket`, `CardData`, `ProcessBoardRows`, `FrameTable`); `src/engine/salvage.ts` with every public signature and stub bodies (`notBuilt`); `strings.ts` with every key; every new file inside a listed mode folder so `npm run check:bundle` passes from the first file; four frozen states (`?preset=fresh`, `m5`, `m30`, `back`). E17's changes to the types (2.13) are the rules lead's first request.

| Label | Owns (every file once) | Needs first | Shows it works |
|---|---|---|---|
| `rules-sim` (the rules lead: everything that changes state) | `src/engine/salvage/{types,content,clock,hand,positions,things,scales,bays,round,machines,crucible,crew,partners,truck,rate,away,deal,create,tick,notBuilt}.ts` and a test beside each; `src/engine/salvage.ts`; `src/engine/salvageMode.ts` and its test; `src/config/schema.salvage.ts`; `src/engine/fixtures/salvage.ts`; `src/modes/salvage/actions.ts` | hour 0; 2.12 to 2.16 | `NODE_OPTIONS=--max-old-space-size=3000 npx vitest run src/engine/salvage src/engine/salvageMode.test.ts` |
| `rules-book` (everything that only reads state, and the pure tables) | `src/engine/salvage/{money,board,ladder,rivals,goals,advice,cards,frame,tickets,save}.ts` and a test beside each | hour 0; 2.13's derived values | the same command |
| `content` (the prototype engineer) | `src/config/salvage.content.ts`; `scripts/content/build-yard.py`; `games/scrap-yard/game.json` (generated); later `src/engine/salvage/bot.ts`, `bot.test.ts`, `scripts/content/yard-bot.ts` | content3.json; the joined rules for the bots | `python3 scripts/content/build-yard.py --check`; `npx tsx scripts/content/yard-bot.ts --seeds 15 --routes 2 --report` |
| `world-a` (everything that moves) | `src/ui/salvage/world/{frameLoop,camera,collide,stick,yard,useRulesTable,useYard,actors}.ts`, `YardView.tsx`, `AtlasView.tsx`, `world.test.ts`, `input.test.ts` | the types; the art kit; the rules running under overlays (2.8) | `npx vitest run src/ui/salvage/world`; `npm run lint:worklets`; screenshots at both sizes |
| `world-b` (labels, effects, the hero frame) | `src/ui/salvage/world/{labels,chevron,heroFrame,effects}.ts(x)` and their tests | `FrameTable`; content3's footprints | `?view=hero`; the hero-frame test |
| `hud` (bars, tickets, the shell) | `src/ui/salvage/{SalvageShell.tsx,uiState.ts,palette.ts}`; `src/ui/salvage/hud/*` | `TopBar`, `Ticket`, string keys | `npx vitest run src/ui/salvage/hud`; both sizes at font scale 1.3 |
| `overlays-a` (overlay frames and the yard's cards) | `src/ui/salvage/overlays/{OverlayHost,Panel,WideCard,CentredCard,parts}.tsx`; `overlays/{ToolRack,Office,Rota,Partners,ProcessBoard,Machine,Crucible}.tsx` | `CardData` | `npx vitest run src/ui/salvage/overlays`; every overlay at both sizes and 1.3 |
| `overlays-b` (the market's cards and the rest) | `src/ui/salvage/overlays/{PriceBoard,Bay,Skip,SupplyDeal,IndustryTable,AwayCard,RungSign,Clipboard,Settings,Help}.tsx`; `src/ui/salvage/dev/*` | `CardData`, `PriceBoard`, `IndustryTable`, `AwayCard` | the same |
| `hints` | `scripts/content/yard/goals.json`; `src/ui/salvage/hints/*` (ghost thumb, the chevron's target rule, first-Open hint through `useTarget`, the lesson pacing of 4.4 item 5) | `nextGoal`; 5.3's order | `npx vitest run src/ui/salvage/hints`; `?preset=fresh&autoplay=opening` for both routes |
| `strings` | `src/ui/salvage/strings.ts`; `scripts/content/yard/text.json`; `scripts/content/yard/check.ts` | the register (read only) | `npx tsx scripts/content/yard/check.ts --all` |
| `wiring` (store placeholder, fingerprint, presets, shared files) | `games/scrap-yard/store/*`; `games/scrap-yard/{icon,adaptive-icon,splash}.png`; `scripts/content/yard-store.json`; `src/modes/salvage/{index.tsx,presets.ts,presets.web.ts,devViews.ts,devViews.web.ts}`; `src/modes/entries.test.ts`; `scripts/lib/*`; `src/ui/hints/targets.ts`; every shared file | hour 0 | `npm run check:bundle`; `npm run typecheck`; `npx tsx scripts/validate.ts scrap-yard` |
| `art-plant`, `art-people`, `art-things` (the art director and two artists) | `src/ui/salvage/art/*` as they divided it, except `art/loading.draw.ts`; `src/ui/salvage/world/{atlas,draw,ground}.ts`; `scripts/art/yard-*.ts`; `scripts/art/scrap-yard-placeholder.py`; `docs/design/yard-style.md` | section 6; the frame table's sprite ids | `npx vitest run src/ui/salvage/art`; `npx tsx scripts/art/yard-sheets.ts <dir> budget`; the 60 px icon board |
| `sound` | `src/services/fx/catalog.salvage.ts`; `src/modes/salvage/soundKeys.ts`; `scripts/audio/yard/*`; `games/scrap-yard/assets/sfx/*` | the event list | `npm run check:bundle`; `?dev=sounds` |
| `loading` | `src/ui/salvage/Loading.tsx`; `src/ui/salvage/loading/*`; `src/ui/salvage/art/loading.draw.ts` | 6.4; `atlasProgress()` | `?view=loading` at 0.3, 1.2, 2.4, 3.2 s and in the calm loop |
| `names` (the names desk) | `scripts/content/yard/{names,crew-names,name-filter,handle-words,company-words}.json`, `check-words.py`, `build-ids.py` | — | `python3 -I scripts/content/yard/build-ids.py --check` |

**What can start before the numbers exist**: art, sound, the loading animation, the screens and the hints against the types and the frozen states, the strings and the text check, the store placeholder. **What cannot**: tuning, the measured tables, the aims' verdicts, the hero-frame test and the store screenshot (they need content3's footprints), goal minutes.

**Order**: the contract (hour 0) → everyone builds against it and the four frozen states, the preview on the stub engine until the simulation replaces it function by function → the simulation and the book joined in the facade; the content engineer writes content3 into the content file and the bots play the joined rules → the lead's integrator joins world, bars, overlays, hints and sounds; the three people play (8.5); an independent engineer attacks the rules; a judge looks at the real screens → one pass of fixes by the owners → tuning, gates, the merge.

---

## 10. What this stage leaves out, and the hooks stage 2 needs

**Left out** (ruling 5, master 9): the baler, magnet crane, forklift and larger carriers; the partners across the bridge; further crew roles; delivered lots, the boss's crate, commissioning; the Trade Book; stainless, lead, bronze and every later material (greyed plates only); live purchases and ads (stubs, no ad button); exchanges, dealers, transport, sell notes; dusk and night; real players.

**Must not be precluded**: grades, things, machines, partners, crew roles and plates are content (stainless, lead ingot and bronze are data); the map's extent is content (the back field opens west); the engine takes a list of sites, each with its own agents and queue, and R(assets) feeds stage 5's server bound; the board's families and step length are content and `sell(grade, shown)` survives 10-minute steps; the truck's skip and a partner's skips are lists; the foreman takes a site id; the round's buyer is content (dealers replace it); table rows are `{id, name, tonnes(d), simulated}` so followed players can be pinned; the save reconciles forward and positions are never rules.
