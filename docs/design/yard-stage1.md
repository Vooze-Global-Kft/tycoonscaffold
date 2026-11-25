# Scrapyard stage 1: the first yard, buildable

Status: version 2, complete (part one and part two), 25 November 2026 (step `spec-stage1`); it replaces version 1. Authority: `ECONOMY.md` (E1 to E24) and `STAGE1-RULING.md` (S1 to S24), then section 14 of `docs/design/yard-design.md` (the master, D1 to D19), then the master's text, then `RULING.md`; where this document differs from them, it is wrong. Where `src/engine/salvage/types.ts` and this text differ on a NAME, the types are right; on BEHAVIOUR, this text is right (the rules lead changes the types to match, 2.13).

**Numbers** live in the content (the second pass's `proto/content2.json` in the shared notes folder, replaced within the hour by the third pass's `content3.json`, then `src/config/salvage.content.ts`) and are named here by key (`machines.stripper.rate`). A value marked **(p2)** is the second prototype's, for scale only: the third pass re-measures it. Bands are E7's, E9's, E14's and S18's. Invented names are register ids in braces (5.1).

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
| 1 | 0:00 | Morning yard. The boss inside the gate by the drop-off's washer with a pulsing ring; west of him the scales, the price board, the stripper pad with its bundle, the crucible pad (padlock chip, price, sample ingot), {merchant}'s flatbed. Top bar "§0", "26th of 26 · next {rival.1} {t}", "0 / {kg} kg". Goal "Take the washer apart"; a ghost thumb drags lower left. | — | `amb_yard`, music |
| 2 | to about 0:12 | He stops beside it; the ring fills. The motor arcs onto his frame, then the top panel and a side; the drum and the other side drop beside him; the counterweight thuds into the rubble skip. "Load full". | drag, release | `cut_spanner`, `piece_steel`, `thud_waste` |
| 3 | first collection ticket within about 25 s (0:16 to 0:22, p2) | Goal "Weigh it on the scale". The weigh-in ticket rises with the muted "today's value", which slides onto the bay chip; the flatbed loads; the collection ticket prints at its cab ("Lot sold to {merchant}"); a coin arcs to the cash counter. | step on | `scale_beeps`, `scale_print`, `flatbed_load`, `coin` |
| 4 | to about 0:30 | Goal "Strip the cable". On the way he picks up the drum and side and weighs them in; their lot waits for the flatbed's return. | steer | `pickup` |
| 5 | the copper jump by about 1:30 (0:39 to 0:46, p2) | He stands at the hand stripper (it turns only while he does, R1): PVC curls into its bin, copper spools into the tray. On the scale "Bare bright copper", a short No.2 line, a value far larger than anything before, the lesson; the flatbed pays; the cash counter jumps. | stand, step on | `stripper_hand`, `coin_big`, `lesson` |
| 6 | a purchase arriving in the world, after the copper jump | Goal "Buy the sack truck" (the first prompt, S8): at the tool rack, "Open", its card ("Moves a washer in one trip"), Buy; a van sets it down; the boss pushes it. | Open, Buy | `buy`, `van` |
| 7 | by 5:00 (2:18 to 2:30, p2) | Goal "Hire a yard hand": the rota, Hire; a green vest walks out of the portacabin; chalk circles appear. "Work the drop-off": what the boss cuts and cannot carry, the yard hand carries to the scale. | Open, Hire | `door` |
| 8 | first rival by 5:00 (minute 4 to 5, p2) | On a collection the chip slides: "25th of 26 · passed {rival.1}". | — | `chip_slide` |

That is ruling 5's list in its order. Goals are SHOWN at most one purchase prompt a minute; the economy is paced by cash alone (E18). The opening does not depend on the route (S10): the bots play route A and route B (the cable bundle first); on route B the first paid ticket is the copper ticket and its band is 35 s (E14; 0:25 to 0:32, p2).

### 1.3 Minutes 5 to 60 (the goal order; R8 as amended by E22)

Every purchase is cash-gated, with no waiting rule (E18). The aims of E12, E13e, E15 and E19 (8.4) hold for both buying habits; the second prototype's rhythm came from its test player, so the third pass measures them (2.18).

1. Buy the sledgehammer and angle grinder: zone 2's cast iron and steel open.
2. Hire a cutter ("The yard now earns while you are away."): he cuts at the drop-off, then on the tipping floor.
3. Buy the flat trolley, then the powered stripper.
4. Buy the hook-lift truck; {partnerFarm}'s trial load waits down the lane, its label readable from the gate.
5. **First drive out, 8 to 10 minutes** (S18, an aim on both habits): hook, back over the weighbridge (gross, tare, net), tip, cut and sort.
6. Buy the motor bench; break a motor. Hire a driver.
7. **Rung 2 at 12 to 18 minutes** (E7; about 14, p2): "Supply {t} t (3 metals)"; the crane hangs the sign; a radiation portal at the gate and the ID desk window. {foundry}'s supply deal appears (optional).
8. Buy the cutting torch (opens at rung 2): zone 3 and {partnerDemolition} open; cut up the car (its converter sells on assay); fetch the demolition trial load.
9. Buy the crucible; "Charge the crucible" (Take from bays). **First small pour, 18 to 25 minutes** (E9; about 22, p2), waiting at "Ready to pour" for the boss (S11).
10. To the hour's end the goal card names what widens the bottleneck now (E13c, E19): another skip in rotation, or the crew or machine level that binds, supply and work in turn. {rival.2} to {rival.4} are passed on the way (E7).
11. **Rung 3 at 55 to 65 minutes** (E7; 28 t, E14): "Supply 28 t (5 metals)".

Held to E22's test, in the order only if the third pass shows they change something, else on the day-1 list: the second yard hand (after the driver), the aluminium recipe (after the first pour), the second cutter. The Night watch is "a longer away cap", offered once the player has been away (E22), never in the hour's order.

### 1.4 Days 1 to 3 (E8, E13e, E19)

Under the twice-a-day habit every sitting to the end of day 3 has a useful purchase, and cash stays under about a day's income:
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

**Controls** are the ground work's (`yard-ground.md`): the stick where the thumb lands, motion and camera on the UI thread, a `Presence` sample at most ten times a second; the rules decide nearness from content positions.

**Work needs no button.** Within `reach.work` of a workable thing (its object's `tier` at most the best tool owned), the stick released for `feel.workDelay`, the boss works the nearest one with his best tool; a ring shows the piece's progress; moving stops it and keeps the progress on that thing. Two tests bind (D12): walking past never works a thing; stopping beside it always starts work within half a second. Pieces go onto the load in cut order while they fit, else drop beside the thing; waste goes to the rubble skip.

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

**The merchant's round** (S1, 2.12): {merchant}'s flatbed loads what is collectable, pays on one collection ticket and is away for `merchant.round_s` (tune 15 to 30 s); so several grades come as one ticket, at most `round_s + load_s` after their weigh-in.

**Supplied** counts collected lots only (collection tickets and deal deliveries), lifetime, never falling; never weigh-ins, stock in bays, reserves, waste.

### 2.4 Things, tools and how each thing comes apart

**Things** are content (`objects.{id}`): `tier` (0 loose, 1 spanners, 2 sledge and grinder, 3 torch), hardness `h`, `pieces` in cut order as `[grade, g, n]`, `waste_g` (to a licensed waste carrier, through the rubble skip or the stripper's bin), `whole` (the grade it is carried at uncut, or null), `gross_g`, and the added `sprite`, `stages`, `size`, `source` and `certifiedEmpty`. **Cut time per piece** t = max(`cut.minS`, kg × `h` / P), P the tool's `tools.{id}.P` in kg/s. A thing needing a higher tier shows its padlock chip "Needs a sledgehammer" or "Needs a cutting torch".

**Tools** (one rack; each tier one purchase in `shop`): tier 1 **spanners and bolt cutters** (owned); tier 2 **sledgehammer and angle grinder** (S6: the sledge breaks cast iron, the grinder cuts thin steel); tier 3 **cutting torch** (oxy-propane: beams, the car, the tank; opens at rung 2 and opens {partnerDemolition}). The work animation follows the piece's family.

**The yard is full** (E1): old stock in heaps by zone (`zones.{id}`), several tonnes, the better material farther out; a zone's `tier` is its sign, each thing's own tier decides. **Z1**: washing machines, bicycles, heavy cable offcut bundles, crates of brass taps and fittings. **Z2**: cast-iron radiators, a bath, stoves, gate and railing sections, copper cylinders "certified empty", alloy wheels. **Z3**: the car, steel beams, steel tanks "certified empty". **bundle1**: the cable bundle by the stripper (S4). The third pass makes Z1's and Z2's copper and brass less and smaller (E15); E1's minute-30 aim is measured on Z1 and Z2.

**The public drop-off** (E1's trickle that never stops): a car with a trailer leaves one thing at a time (2.12), each signed in with its slip; the first are `dropoff.initial`, the rest drawn from `dropoff.mix` (washers, bicycles, radiators, cable offcuts, brass taps, copper cylinders certified empty). Never a converter or a sealed vessel.

**How things come apart** (S6, held against `yard-metals.md`; masses are content):
- **Washing machine**: a whole motor, a top panel and two cabinet sides (light iron), a stainless drum (light iron in this stage; its lesson says it pays more once stainless is sorted), the counterweight and plastics (waste).
- **Bicycle, gates, railings, farm sheet, cladding**: light iron. **Taps, fittings**: brass solids. **Alloy wheel**: alloy wheels.
- **Heavy cable offcuts, coils**: stripped (2.5), or sold whole priced from the copper they hold (S4, `cable.k`).
- **Radiator, bath, stove, trough**: broken by the sledge into cast-iron solids, or carried whole as "Cast iron, whole". **Copper cylinder**: No.2 shell and brass fittings, or whole.
- **Electric motor**: on the bench, No.2 windings, light iron, cast-aluminium end caps in the trade's shares (never a quarter copper).
- **Beam, tank, plough**: cut by the torch to HMS 80:20; uncut, "Steel, unprepared".
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

Machines stand on fixed pads with a hopper, a rate, an out tray and levels bought on their plate (arithmetic in 2.12); nothing costs by the clock, nothing is lost.

- **Hand stripper** (inherited, S4; `machines.hand_stripper`): on the stripper pad from the first second, lit on the board, its card "Came with the yard"; the bundle beside it. It turns only while the boss stands at it (R1). Cable → `cable.yield_` copper, `cable.tinned` of it No.2, the rest bare bright; PVC to its bin.
- **Powered stripper** (`machines.stripper`): a purchase on the same pad, same inputs, runs alone; fed first.
- **Motor bench** (`machines.bench`): whole motors → its `out` shares and `waste`.
- **Crucible** (S11, E22; `machines.crucible`), under its extraction hood, padlocked with price and sample ingot from 0:00. Recipes **brass** (brass solids → brass ingot + dross) and **aluminium** (cast aluminium only: alloy wheels and the cast aluminium of motors and loads → "Aluminium alloy ingot" + dross; content2's recipe takes wheels only, the third pass widens it). "Take from bays" (on by default) charges it by mass; the heel stays between heats; a recipe change asks "Pour the heel as a short ingot?"; **the first heat ever** waits at "Ready to pour" until the boss comes, then pours with a camera nudge (2.12). A person in face shield and aluminised apron is drawn at every pour (the boss, else the nearest crew member); ingots cool to their metal's colour in about 3 s (pictures).

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
- **Yard hand** carries on a sack truck (R2) by S12's priority, and whole light things at their unprepared grade (E4), so the yard earns, slowly, without the boss; never from the heaps (the chalk circles hand them over).
- **Cutter** cuts at the drop-off, then on the tipping floor, never what the boss works, never the heaps.
- **Driver** fetches full loads when cash and the tipping floor allow (S12); the rota shows "kept for the next load: §x" (E19).
- **Places**: the crew keys of `shop` (`hand1`, `cutter`, `driver`; `hand2` and `cutter2` under E22's test).
- **The foreman** (master 3.4): crew and machines run faster by `foreman.boost` while the boss has worked in the last `foreman.windowS`, for at most `foreman.minutesPerDay` of each market day, shown by a meter on his vest; never away.

### 2.7 Partners, labels, trial loads, skips, the truck, the tipping floor

**Partners** (`partners.{id}`): {partnerFarm} opens with the truck (`opens`); {partnerDemolition} opens with the torch and stands on the lane before the weight-limited bridge (S18). Each has a site with a skip zone, a sign and a business card ({farmContact}, {demolitionContact}) on its office card.

**Loads are honest** (E3, E20, master 5.3). A skip's contents (whole things by object) are fixed when it fills and printed on its label, with its price, before anyone hooks it; the weigh-in equals the label; nothing is drawn after paying. Price = `roundMoney(k × as-found value at the day's prices)`, as found being each grade's `asFound` share of its prepared price; E20 sets k nearer 0.85 and contents of whole cast iron, cable, motors, uncut steel and appliances, so at least three fifths of a load's margin is the yard's preparing; nothing in a load needs a tool the player cannot own when the partner opens (content2's farm plough needs the torch: the third pass removes it). **The first load from each partner is a small trial load** at a fixed price a new yard can pay (`trial`, `trialPrice`). **Skips in rotation** (E13b): a partner has as many skips as its level, each filling in `fill_s`; another skip is a level bought on the partner wall.

**The label** (a world plate and the skip card): "{partner} · full" or "trial load", net mass, up to three thing lines and "+ n more", the price, and why it cannot be hooked ("Filling · full in {m} m {s} s", "Needs §{x} more", "The tipping floor needs room for {kg}"). The card lists every thing.

**The truck** (hook-lift, one purchase): entered by walking into it, left with "Step out"; carries one skip, never pieces; swaps, never crushes or tows; its last stopped position is rules state.

**Hook**: still in the skip zone with the skip full, cash for its price and room on the floor for all of it (`floorRoom_kg`): a ring of `truck.handle_s` (moving restarts it), then the price is paid and an empty skip goes down; a load that cannot be tipped is never paid for (test). **Weigh-in** over the weighbridge (2.2), then **tip** (still on the floor for `truck.handle_s`): things and loose pieces onto the floor, cut by the boss and the cutter, carried by the yard hand.

### 2.8 The posted price board, the market clock, Hold's signal

**The market clock** (S14): t_m = max(device now, `clock.highMs` + live time since the last resume, from `performance.now`, passed in): never backwards, advancing in live play after a clock-back. Day D = floor((t_m − `board.epochMs`) / 86,400,000), the epoch a Monday 00:00 UTC. A gap over `away.gapS` goes to the away pass, the same engine (2.16). The rules keep running under an open overlay; the boss stands (the world engineer changes the ground work's "the yard stops under them" to match).

**One posted price a day per family** (`fe`, `nf`; `pm` for the converter's daily step only): x_f(D) = Σ_{k=0..29} 0.5^k × `board.a` × w_f(D − 1 − k), w_f(n) = 2 × hash01(worldSeed, f, n) − 1 (tune `a` 0.02 to 0.05); p_g(D) = round(p̄_g × (1 + x_f(D))) in hundredths; the converter's metal prices step by x_pm. A pure function of D: every phone shows the same board, nothing is saved.

**The day word**, Hold's signal: **low day** (x < −`board.wordBand`), **usual**, **high day**; on the board, each row and each bay chip when not usual. The board's first opening points at a day word ("Cast iron: a low day. Holding is free.").

**Shown equals applied**: every Sell carries the step it showed (`sell(grade, shown)`, `SellShown {day, price, grams}`); if the day has changed when the tap lands, "Price updated: §{a} → §{b}" asks again.

### 2.9 The supply deal

{foundry} appears on the office's partner wall at rung 2 (`deal.gate`) with "{q} kg of cast iron a day for {d} days at §{p} a kilo, locked at signing" (S21: "supply deal", never "contract"); p = round(A_ci(D) × (1 + premium)), A_ci the mean of the last seven days' cast-iron prices, q, d and premium from `deal.series[]`. After signing, cast iron weighed in first fills a reserve of q in its bay ("Reserved for {foundry} {a} / {q} kg"). At each 00:00 UTC, before anything else: delivered = min(q, reserve), paid and supplied on a delivery ticket; trust (`deal.trust`) rises for a full day and falls for a short one; **nothing is ever charged for a miss**. After d deliveries the series offers the next deal. Trust gates nothing in stage 1.

### 2.10 Goals and the advice line

**Goals** (`goals[]`: `id`, `text` key ≤ 30 characters, `target` for the chevron, `done` condition read from the state, an optional `buy`, `optional`; written in `goals.json`): the card shows the first unfinished. A purchase goal is SHOWN no sooner than `advice.promptGapS` after the previous prompt (how goals are shown, never what paces the economy, E18). No goal is met by doing nothing. After the first pour the goal "Widen the yard: {item}" names the advice line's purchase (1.3 item 10).

**The advice line** (the expanded card's third line; the only line after the last goal): the cheapest purchase that widens the bottleneck now, priced at most cash plus `advice.minutes` minutes of `incomeRate`, never leaving cash below E19's reserve (2.12). A level that would change nothing now shows what it would add and "not the bottleneck now" on its card; the advice line never names it (E19).

### 2.11 Rungs, range, prices, ceilings, the industry table and rivals

**Rungs are positions, never titles** (S15, D8, D16). Rung r is entered at `ladder.rung{r}.t` lifetime supplied and range `ladder.rung{r}.range` (3, then 5; rung 3 at 28 t, E14). The crane hangs "{homeYard} · {t} supplied"; goals read "Supply {t} t (3 metals)"; refusals "Opens at {t} supplied". Rung 2's portal and ID desk are equipment, never the yard becoming licensed. Rungs 4 to 9 show on the table with their gates and a padlock.

**Range**: a material counts once its lifetime supplied products are worth `ladder.theta` at p̄. Stage 1 offers six (light iron, cast iron, steel, aluminium, brass, copper) and rung 3 asks five, so a hand that skips the torch still gets there. Intermediates count tonnes only.

**Prices** (E12, E13, E18) are derived by the content pass: a purchase from its worth over the next twenty to thirty minutes with every later purchase still made (leave-one-out), floored at three fifths to one of the income then; a level at tau(L) × the capacity it adds × the mean margin per tonne (E13a, tau about 20 minutes rising to nine hours). **Ceilings** are a guard (D5, S16): `ceilings_t_h` at rungs 1 to 3; a purchase lifting R over its rung's ceiling is refused ("Yard capacity {c} t/h · grows at {t} supplied").

**The industry table** (notice board and chip): the top line "the largest full metal recycling and resource supplier", nine rungs (current lit, next with its gates), range chips, 26 rows (rank, 24 pt plate logo, chip name, tonnes, "simulated"), the player pinned, "Rival firms (simulated)".

**Rivals** (S17, D19, E24): `rivals[]` (`id` rival01 = register `rival.1`, `T0_t`, `passMin` the plan, `g`), chip names from the register; each a growing pure function of the market day, T_i(d) = T0 × (1 + g × min(d, 40)) (content3 gives all 25, starting tonnes placed from the tuned hour). A passed rival never passes back: as a guard the k-th rival below the player shows at most (1 − 0.03 k) of the player's tonnes, so no two rows print the same figure (test). Position never falls while away; "Passed {rival}" fires once.

### 2.12 The engine: whole items, mass, agents on legs, one event queue (E17)

**Two kinds of stock.** (a) **Whole items**: a *thing* (`ThingState`: in a zone heap, a drop-off slot, on the tipping floor) and a *piece* (`Piece {id, grade, g, from}`: in a pile on the ground, on a load, in a hopper), each with its mass from content (`objects.{id}.pieces` as `[grade, g, n]`, `gross_g`). A piece exists from the moment its cut completes; carriers move whole pieces and whole things; a whole thing is weighed in whole at its `whole` grade; the converter is one piece. (b) **Mass** in integer grams by grade: bays, out trays, the PVC bin, the crucible's pot and heel, a machine's work in progress. No ticket prints part of a thing.

**Time** is play seconds; two times within 1e-6 s are one instant (R12). A leg's distance is `map.routes["a-b"]` (either order) if listed, else `map.detour` × the straight distance; the lane adds `map.lane[partner.lane]` each way from the gate.

**Agents on legs.** Each agent holds at most one pending dated event (`endsAt`), computed when its leg starts; the foreman's boost and a level apply from the next leg.
- **The boss** (live only, from presence, 2.1): `work` (the current piece ends at start + t − progress, t = max(`cut.minS`, kg × `h` / P); moving cancels it and keeps `progress` on that thing), `pickup` and `feed` (one piece every `pick_s`), `weigh` (`weigh_s`), `circle`, `strip` (the hand stripper runs only while he stands at it, R1), `hook`, `drive`. A presence sample may cancel the act in progress.
- **Cutter**: when idle he takes the free thing of highest prepared value per cutting second, at the drop-off first, then on the tipping floor. Power: `tools[best].P` × `crew.cutter.share` × (1 + `lev` × (L−1)), at most `cap` × P; he walks at `crew.hand.v`. **When he starts a thing**: if the boss is present within `reach.sight` of it, each piece is its own event and drops to the place's pile; otherwise the whole thing is one event at the sum of its piece times and its pieces appear together (E17). Waste goes to the rubble skip.
- **Yard hand** (R2: `crew.hand.load` kg on a sack truck, speed `v` × (1 + `lev` × (L−1)), `handle_s` at each end). **At each departure** he takes the first place with work in S12's order: (1) *feed*: an owned machine whose hopper has room for a piece of its input lying in a chalk circle, at the drop-off or on the floor; (2) chalk circles; (3) out trays (mass, up to his load); (4) the drop-off's pieces; (5) a whole thing at the drop-off of at most his load, at its `whole` grade, when no cutter is hired or every drop-off place is taken (E4); (6) the tipping floor's pieces, then such a whole thing. Inside a place: highest p̄ per kilogram (cable at its copper, R7), ties heavier first, whole items while they fit. He **claims** them at departure (nobody else takes a claimed item); *pick* moves them to his load, *drop* feeds the hopper or weighs them in on the platform (a crew chip). **When nothing waits** he stands at his stand by the scale house and is offered work again at every later event.
- **Driver** (hired; the truck owned, parked in the yard, empty, the boss not in it): he may depart for the partner whose skip has been full longest if cash covers its price and floor mass + the skip's ≤ `floorRoom_kg`. The price and the floor room are **earmarked** at departure (no purchase takes cash below the earmark), so the hook always pays. Legs: walk to the truck; drive out at `truck.v` × `driverFactor` × (1 + `crew.driver.lev` × (L−1)); hook (`truck.handle_s`; paid; an empty skip goes down); back over the weighbridge (skip ticket); tip (`handle_s`); park. **E19's reserve**: the price of a skip full within `advice.reserveS` that the driver can fetch is shown on the rota as "kept for the next load: §x"; the advice line and the bots never spend below it; it refuses nothing.
- **The merchant's round** (S1, R5): *waiting*; at the first event at which a bay has collectable grams (not held, not reserved, or set aside by Sell) it starts *loading* (`merchant.load_s`) and fixes the lot then, each line resolved down to 0.1 kg; at the end it pays (`collected`) and is *away* (`merchant.round_s`); on return it waits or loads again. A lot pays the day's posted price, set-aside grams their `asidePrice`, a converter its assay (2.4).
- **The drop-off**: the first arrival at `dropoff.first`, then one every `dropoff.period` while fewer than `dropoff.places` things wait; when all are taken the next comes the instant a place frees. The object is `dropoff.initial[n]` within that list, else drawn from `dropoff.mix` by `hash01(worldSeed, 'dropoff', n)`.
- **Machines** work mass at a rate. A hopper holds whole pieces up to `inbuf` kg (a piece enters only whole). An idle machine takes the next piece into work; its outputs are credited to the tray by the cumulative rule out_g(t) = floor(share × rate × (t − startAt)) per output grade, the piece's last credit giving the exact remainder, so ticking and jumping credit the same grams; its event is the piece's end. A full tray (`tray` kg, content3) stops it, nothing lost. Rate: `rate` × (1 + `lev` × (L−1)) × the foreman's boost; at an event that changes the rate, the work is credited to that instant and restarted from it. The strippers give `cable.yield_` copper (`cable.tinned` of it No.2, the rest bare bright), the rest PVC; the bench its `out` shares and `waste`.
- **The crucible** (S11; mass only). *Take from bays* reserves the recipe's input grade (`forCrucible_g`) from weigh-ins and unreserved stock, up to the room left in the pot; while no heat runs, reserved grams move into the pot at once. A carrier's piece of the input grade melts in whole if it fits. Pot: `pot` × (1 + `lev` × (L−1)) kg, heel included. A heat starts when the pot is full, or at lastFeedAt + `start_idle` with charge + heel ≥ `start_share` × pot; it lasts `s_per_kg` × the new metal's kg. At its end: dross = round((1 − yield) × charge_g), metal = charge_g − dross + heel_g, n = floor(metal / `ingot_kg`) (content3), the heel keeps the rest; ingots and dross go to the tray. **The first heat ever** waits at *ready* until the boss is within `first_wait_m`; later heats pour at their end.
- **Partners' skips** (E3, E13b): as many skips in rotation as the partner's level, each full `fill_s` after it is set down, its contents fixed then (`hash01(worldSeed, partner, n)` over the mix); the trial skip is `trial`, full when the partner opens. The label shows the oldest full skip.

**Events**: every agent's `endsAt`; a machine's piece end or full tray; a heat's end; the drop-off's arrival; a skip full; the round's load, payment and return; the foreman's boost ending; the day boundary (00:00 UTC: the board's step, the deal's delivery, the rivals' day). **The queue is derived from the state** (the minimum over its dated fields), so saving the state saves the queue.

**Order at one instant**: (1) the day boundary; (2) completions: machines and the crucible, the boss's act, cutters, yard hands (pick before drop), the driver; (3) arrivals: drop-off, skips; (4) the round; (5) departures of idle agents: cutters, yard hands, the driver, each in id order; (6) checks: rung, rivals passed, the deal offer, goals, lessons.

**A leg in flight whose source or destination changes**: claimed items cannot change; a hopper full on arrival takes what fits and the rest goes on to the platform (a new leg); a machine bought meanwhile is offered at the next departure; the driver's price and room are earmarked; the boss never works a thing a cutter holds (he works the next nearest).

**R(assets)**, rated capacity in t/h, is the throughput of the current crew and machines with full feed and no boss, from the same rates; it feeds the ceilings (2.11) and the level cards' "+x t an hour" (E13d).

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

One content source feeds the rules, the screen and the bots (S23): content → `src/config/salvage.content.ts` → `games/scrap-yard/game.json` (`salvage`, parsed by `src/config/schema.salvage.ts`). Units: grams for `_g`, kilograms for `_kg`, `load`, `inbuf`, `pot`, `tray` and `carriers`; seconds `_s`; minutes `_m`, `passMin`, `tauMin`; hours `_h`; prices § a kilogram at the usual price; positions metres. **The third pass's `content3.json` replaces every number and adds footprints (`map.places`), rated level prices, skips in rotation, rival functions and the keys marked content3; its `$changes` list says what moved.**

| Family | Meaning |
|---|---|
| `version`, `$keys`, `worldSeed`, `names` | provenance; the counter-hash seed; names by register id (the build script) |
| `grades.{id}` | `name`, `pbar`, `family` (`fe`, `nf`, `pm`), `material` (null for intermediates), `kind`, `asFound` (E3), `sprite` |
| `cable`, `converter` | `yield_`, `tinned`, `k` (2.4); the converter's metal grams, §/g, payables, ceramic and assay fees, `source`, `paid` |
| `objects.{id}` | `tier`, `h`, `pieces`, `waste_g`, `whole`, `gross_g`, `preparedValue` and `asFoundValue` (checks), `text` (a note, never shown), `sprite`, `stages`, `size`, `source`, `certifiedEmpty` |
| `zones.{id}`, `map` | `tier`, `things`, `centre`, `r`; `points`, `detour`, `lane`, `routes`, `places` (content3) |
| `tools`, `carriers`, `walk`, `pick_s`, `weigh_s`, `truck` | `tier`, `P` (kg/s at hardness 1); kg per carrier; the boss's m/s; seconds a piece, seconds on the platform; `v`, `handle_s`, `driverFactor`, `radius`, `enter` |
| `machines`, `crew` | 2.12's rates, buffers, `lev` (share a level), `maxlev`, the bench's `out`, the crucible's `recipes` ([in, out, yield, dross]); content3 adds `tray`, `ingot_kg` |
| `dropoff`, `partners.{id}`, `floorRoom_kg`, `merchant`, `scale`, `bays` | 2.12, 2.7 (`opens`, `lane`, `trial`, `skip`, `fill_s`, `k`, and the checks' masses and prices), 2.3, 2.2 |
| `shop[]`, `levels` | in goal order `key`, `kind`, `place`, `price`, `gate`, `addsPerMin`, `incomeNow`, `tauMin` (content3 adds delivery seconds); `tau`, `bases` (content3: E13a's rated table, partner levels as skips) |
| `ladder`, `ceilings_t_h`, `awayCap_h`, `rivals[]` | 2.11, 2.16 |
| `reach`, `feel`, `cut`, `board`, `deal`, `foreman`, `away`, `advice`, `goals`, `lessons` | 2.1 to 2.10; content3 adds `reach.sight`, `advice.reserveS` |
| `yard`, `worker`, `helpers`, `props` | the ground work's world block |

The frozen test content (`src/engine/fixtures/salvage.ts`) has the same keys with round test values, never the tuned ones.

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

Against the normal hand on the same seed (E24) the slow hand's helper beat missed half as long again on 11 of 40 seed-route pairs (audit 14). The third pass also delivers a minute-by-minute table for the normal hand on one seed (sales, spend, cash, supplied, rank, event; each row adding up), purchase gaps over three minutes, the slow hand against the normal on the same seed (E24), the away share at minute 60 (S13), the hands-off test from states with little cash, and the bench time of six hours away.

---

## 3. The yard as a map

The ground work's yard: fenced, 64 × 40 m, three screens wide at 844 × 390, split by the container wall (x about 24) with its wide gap for the truck and its 1.4 m gap for people; the gate in the east fence, the lane running east from it. Every place is a point of `map.points` (positions flow content → game.json → the rules and the screen, S23); routes are `map.routes` or `detour` × straight. From east to west (p2 coordinates as examples):

- **The gate side**: the boss starts inside the gate (`start`, 59, 24) by the **public drop-off** (`dropoff`) and its first washer (S10); the **truck park** (`park`) south-east by the fence.
- **The hero frame** (S19, 21 × 9 m): the **platform scale** (`scale`, 53.5, 23) and **weighbridge** side by side, the **scale house** north of them, the **bays** with {merchant}'s stand, the **stripper pad** with `bundle1`, the **copper and brass stillages**, the **price board** (`board`) and at the west end the **crucible pad** (`crucible`, 37, 25). The scales lie between the drop-off and the stripper on either route. `?view=hero` shows it; a test checks it between the top bar and the bottom row at 844 × 390 (the first store screenshot: copper, a ticket and a pour in one frame).
- **South of the core**: the **tipping floor** (`floor`) within 12 m of the scales, on the truck's line from the weighbridge.
- **The middle**: the **motor bench** (`bench`); north of it the **portacabin office** (`office`, the licence on its wall, crews walk out of its door) and the **tool rack** (`rack`).
- **The old stock** (E1): `Z1` at the container wall, `Z2` south-west through the gap, `Z3` north-west with the `car`; the **back field** (`backfield`) in the south-west corner, padlocked, with its sign.
- **The lane** (`map.lane`): {partnerFarm}'s site first, its load in view from the gate; {partnerDemolition}'s farther, shut with "Needs a cutting torch"; the **weight-limited bridge** (a padlock) to stage 2's unnamed partners; a barrier at the lane's end.

**What the third pass delivers (E23)**: a footprint in metres for every place (`map.places`); nothing overlaps (in content2 the weighbridge overlaps the platform scale and runs out of the hero frame, and the stripper overlaps the copper stillage: the scales are moved apart and the stripper clear); zone 1 stands clear of the container wall and its gaps (content2's zone 1 sits on the wall and fills its 1.4 m gap); the hero frame is tested on footprints at the game's scale (vehicles at two thirds of true length, so the weighbridge deck fits the game's truck); and the notice board gets its point (content2 has none; it stands by the office).

**Solid**: fences, the wall, buildings, the rack, machines, the crucible and hood, stillages, lock-block walls, the rubble skip, uncut things, the car, the notice board, the bridge's rails, partner sheds; decals (scale plates, pads, the floor, chalk circles) and pieces are not. The truck (`truck.radius`) cannot pass between stillages, into the heaps or through the 1.4 m gap.

**Where purchases arrive**: a machine by flatbed crane onto its pad (working from its arrival event, 2.15); tools and carriers by van at the rack; the truck to its park; crews out of the office; the Night watch a sheet on the rota board.

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

No spare slot; nothing from the market in the bar. Bar text is sized by hand from min(fontScale, 1.3), `allowFontScaling={false}`, in rows that add up. The goal card (400 pt at 844, 340 at 667) is one 12 pt line with progress; a tap opens three lines (goal, next, advice; 84 pt), closed after 6 s. The one button is a 60 pt hi-vis disc.

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
1. **Weigh-in ticket**: rises out of the display's printer slot (clamped inside the free world), ticket paper with its stamp by kind, 280 pt wide at 844 and 260 at 667, at most 150 pt tall at 1.3: a hi-vis header; up to three grade rows (short name, kg, "§{p}/kg today") and "+ {n} more"; the muted "today's value §{x}"; the 11 pt legal line; at most one lesson. Then it folds and the value slides to the bay chip.
2. **Bay chip** (at the bay by the flatbed's stand): "{grade} {kg} · today §{x}" in the same muted grey; when the flatbed loads, the value slides into its bed.
3. **Collection ticket**: at the flatbed's cab, same paper, amounts in ink, "Paid §{x}" bold, the two-line legal line; a coin arcs to the cash counter. A tap opens the history.
4. Once crews work, a crew weigh-in is a one-line chip at the scale ("Yard hand · 58.2 kg in") and a collection without the boss's weigh-in a one-line chip at the cab ("Lot sold · §29.00"); one ticket of each kind at a time.
5. In the first five minutes lessons show only on the value jumps (copper, brass, the converter); others wait for the grade's next weigh-in.

**The price board** (panel): "Market day {date} (UTC) · next prices in {h} h {m} m"; per grade seen a two-line row of 56 pt: pictogram, name, today's price, day word, Hold; five bars with the usual-price tick, the bay's stock, Sell with its total.

**The away card** (centred): "Away {h} h {m} m (cap {c} h)"; up to five grade lines and "+ {n} more"; "{t} supplied · §{x} (already in your account)"; loads fetched; deal deliveries; "You passed {rival}."; OK. With little to show it says what would have earned more ("A cutter keeps the yard working while you are away (Office)"). No ad button in stage 1.

### 4.5 The process board (wide card)

Title 15 pt; four rows of enamel plates (2.5), 132 × 60 at 844 and 120 × 60 at 667: a name of up to two lines of 12 characters (12 pt) and a state line (11 pt: "Owned · level 2", "§{price}", "Level {n} · §{price}", a padlock), joined by riveted bars of 24 pt (20 at 667). 4 × 60 + 3 × 12 + a 32 pt title = 308 pt, inside 333 (844) and 325 (667). Row 4's five greyed plates are 108 pt (112 at 667) with no state line, so a name may take three lines of 11 characters ("Platinum / group and / iridium"). A lit plate opens its machine card; a greyed one shows only its padlock.

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
Places (≤ 18): Tool rack, Office, Scale house, Platform scale, Weighbridge, Notice board, Public drop-off, Rubble skip, Tipping floor, Truck park, Stripper pad, Motor bench, Crucible, Old stock, Back field, Bays, Price board, Lane, Bridge.
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

The art director's style sheet (`docs/design/yard-style.md`) decides the look: flat vector, three-quarter oblique (40 pt a metre, tilt 0.7), drawn in code in `src/ui/salvage/art/` through its manifest (sheets A, B, G), baked behind the loading animation; anchors at footprint centres; people in four directions (west mirrored, shadows drawn by the world), vehicles by heading; layered actors (carrier, load, the vest tinted per role).

### 6.1 Sprites and animations

| Group | Sprites and frames |
|---|---|
| Boss and crews | stand; walk 6; work 4 per tool (the torch with face shield); feed 2; push sack truck and trolley 6; carry 6; pour 4 in face shield and aluminised apron; the driver in the cab; vests boss hi-vis with white hat, yard hand green, cutter blue, driver teal; loads as pieces strapped on |
| Things, whole and in stages | every object of content (`sprite`, `stages`); closed vessels and the car with their tags |
| Pieces (ground and carried) | panel, stainless drum, motor, cast section, copper shell, taps, cable, bare-bright bundle, No.2 copper, windings, end cap, wheel, body section, HMS piece, converter, brass ingot, alloy ingot, dross |
| Machines, weighing, stock | strippers and bench (idle, working 3, tray full); crucible under its hood (idle, heating 3, ready, pour 4, cooling); pads with padlock chips; sample pallet; platform plate, weighbridge deck, display posts, scale house, price board, portal, ID desk; lock-block bays, ferrous piles in 5 sizes, stillages in 4 fill levels, converter cage, a held bay's flag |
| Vehicles | hook-lift truck × {no skip, empty, trial, full} + hook + tip (east-facing frames); {merchant}'s flatbed with crane + load 3; the machine flatbed + set-down; delivery van; the public's car and trailer |
| Yard and lane | fence, gate, portacabin with licence plaque and rota board, tool rack, notice board, rubble skip, PVC bin, chalk circles, park markings, back-field gate and sign, rung signs; lane, the bridge with weight sign and padlock, the farm's shed, the demolition hoarding and excavator, the barrier |
| Effects and interface | sparks, dust, flame, piece and coin arcs, the value slide, work ring, chevron; ticket paper with its stamp by kind, chips, goal card, 10 pt pictograms; process-board plates (lit, buyable, greyed); 25 rival plates from a generated kit; business cards; {merchant}'s mark |

Never drawn (yard-style 11): a real brand or one shaped like it; a tow truck or crusher; a magnet lifting copper; anyone hurt, without gear or near sparks without a face shield; fire or smoke made fun; a lone gold bar; anyone bearing more than the hand load.

### 6.2 Atlas budget

Sheets A and B of at most 2048 × 2048 px at device density 3, and a 1024 × 1024 ground sheet G; statics away from the hero frame are baked small and drawn up (yard-style 12). Draw calls: the depth-sorted list is drawn in runs, one Atlas call per change of sheet (the art director's proposal in `requests.md`, for the lead to confirm: "three a frame" cannot sort a person behind a machine). At most 40 actors and 300 sprites; bakes on a CPU raster surface, sliced, surfaces disposed after the copy; every bake finishes behind the loading animation's calm loop (`atlasProgress()`).

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

Mass kept (things, machines, the heel, the scale's rounding); whole items stay whole and the converter is paid as one piece; cut times and tiers; pickup and the swap (never lowering value, never while moving); one `piecePos`; chalk circles inert before a yard hand; the yard hand's priority, claims, a full hopper; the cutter's whole-thing event with the same piece times; the driver's gates, earmark and E19's reserve; tickets (totals equal lines, the buyer named, gross, tare, net); the round, Hold and Sell; reservations never collected; supplied only on collection and delivery; the crucible (heel, first pour, recipe change); a converter without a source refused; loads (fixed at fill, label equals weigh-in, trial loads, skips in rotation, never paid when it cannot be tipped); the board pure in D; the clock (a jump never pays twice); a short deal day charges nothing; goals never met by doing nothing; the advice line never naming what does not bind; rungs, range, rivals, ceilings; every refusal; save and reload; 2.12's order at one instant; ticking equals jumping minute by minute.

### 8.2 Bots (`src/engine/salvage/bot.ts`; the same actions as the screen, a path graph from the content map at the boss's speed; follows the goal card and the advice line)

People-like (S24): a reaction before every leg, path waste, time at each card; fifteen seeds, two routes; each beat as a range and a share in band. Two buying habits on every run (E18), no purchase gap; a branch without an item cannot buy it.

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

Three people-like players (not the engineers) play the built stage on an iPhone at both sizes before any tuning, 20 minutes each, and note with the minute: where they did not know what to do, a card that hid what they wanted, texts unread, a wish for a second thumb, whether the eye followed display → flatbed → cash, whether they found the truck and the crucible without the chevron. The notes reach the lead before anything is tuned.

---

## 9. Work packages (S23; the lead's `BUILD.md` split, copied here; `BUILD.md` is right where the two differ)

**Rules of the folder** (BUILD.md): every file has one owner, named once below; a change to another's file is one line in `requests.md` and a local stand-in; numbers live only in the content file and a screen formats them with the facade's formatters; positions flow one way; names by register id; the contract (`types.ts`, the facade, events, string keys) changes only through the rules lead.

**Hour 0** (done before the packages start): `src/engine/salvage/types.ts` (content types, state, `Presence`, `SalvageEvent`, actions and refusal keys, `Ticket`, `CardData`, `ProcessBoardRows`, `FrameTable`); `src/engine/salvage.ts` with every public signature and stub bodies (`notBuilt`); `strings.ts` with every key; every new file inside a listed mode folder so `npm run check:bundle` passes from the first file; four frozen states (`?preset=fresh`, `m5`, `m30`, `back`). E17's changes to the types (2.13) are the rules lead's first request.

| Label | Owns (every file once) | Needs first | Shows it works |
|---|---|---|---|
| `rules-sim` (the rules lead: everything that changes state) | `src/engine/salvage/{types,content,clock,hand,positions,things,scales,bays,round,machines,crucible,crew,partners,truck,rate,away,deal,create,tick,notBuilt}.ts` and a test beside each, `contract.test.ts`; `src/engine/salvage.ts`; `src/engine/salvageMode.ts` and its test; `src/config/schema.salvage.ts`; `src/engine/fixtures/salvage.ts`; `src/modes/salvage/actions.ts` | hour 0; 2.12 to 2.16 | `NODE_OPTIONS=--max-old-space-size=3000 npx vitest run src/engine/salvage src/engine/salvageMode.test.ts` |
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
| `art-plant`, `art-people`, `art-things` (the art director and two artists) | `src/ui/salvage/art/*` as they divided it, except `art/loading.draw.ts`; `src/ui/salvage/world/{atlas,draw,ground}.ts`; `scripts/art/yard-*.ts`, `scripts/art/icons/yard.icon.ts`; `scripts/art/scrap-yard-placeholder.py`; `docs/design/yard-style.md` | section 6; the frame table's sprite ids | `npx vitest run src/ui/salvage/art`; `npx tsx scripts/art/yard-sheets.ts <dir> budget`; the 60 px icon board |
| `sound` | `src/services/fx/catalog.salvage.ts`; `src/modes/salvage/soundKeys.ts` and its test; `scripts/audio/yard/*`; `games/scrap-yard/assets/sfx/*` | the event list | `npm run check:bundle`; `?dev=sounds` |
| `loading` | `src/ui/salvage/Loading.tsx`; `src/ui/salvage/loading/*`; `src/ui/salvage/art/loading.draw.ts` | 6.4; `atlasProgress()` | `?view=loading` at 0.3, 1.2, 2.4, 3.2 s and in the calm loop |
| `names` (the names desk) | `scripts/content/yard/{names,crew-names,name-filter,handle-words,company-words}.json`, `check-words.py`, `build-ids.py` | — | `python3 -I scripts/content/yard/build-ids.py --check` |

**What can start before the numbers exist**: art, sound, the loading animation, the screens and the hints against the types and the frozen states, the strings and the text check, the store placeholder. **What cannot**: tuning, the measured tables, the aims' verdicts, the hero-frame test and the store screenshot (they need content3's footprints), goal minutes.

**Order**: hour 0 → everyone against the contract and the frozen states (the preview on the stub engine until the simulation replaces it function by function) → the simulation and the book joined in the facade; content3 into the content file; the bots play the joined rules → the integrator joins world, bars, overlays, hints and sounds; the three people play (8.5); an engineer attacks the rules; a judge looks at the screens → one pass of fixes → tuning, gates, the merge.

---

## 10. What this stage leaves out, and the hooks stage 2 needs

**Left out** (ruling 5, master 9): the baler, magnet crane, forklift and larger carriers; the partners across the bridge; further roles; delivered lots, the Trade Book; stainless, lead, bronze and later materials (greyed plates); purchases and ads (stubs); exchanges, dealers, transport; dusk and night; real players.

**Must not be precluded**: grades, things, machines, partners, crew roles and plates are content (stainless, lead ingot and bronze are data); the map's extent is content (the back field opens west); the engine takes a list of sites, each with its own agents and queue, and R(assets) feeds stage 5's server bound; the board's families and step length are content and `sell(grade, shown)` survives 10-minute steps; the truck's skip and a partner's skips are lists; the foreman takes a site id; the round's buyer is content (dealers replace it); table rows are `{id, name, tonnes(d), simulated}` so followed players can be pinned; the save reconciles forward and positions are never rules.
