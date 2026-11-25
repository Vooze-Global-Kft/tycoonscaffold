# Scrapyard stage 1: the first yard, buildable

Status: version 3, 25 November 2026, evening (step `spec-stage1`); it replaces version 2. The rules engineers began at 16:20 from version 2's sections 2.1 to 2.16; every change of BEHAVIOUR in section 2 since then is marked **[v3]** where it stands and listed in section 11. Authority: `ECONOMY.md` (E1 to E29) and `STAGE1-RULING.md` (S1 to S24); then the lead's later rulings (the lines marked [lead] in `requests.md`, and `notes/lead-world.md`); then section 14 of `docs/design/yard-design.md` (D1 to D19); then the master's text; then `RULING.md`. Where this document differs from them, it is wrong. Names of types, fields, events, actions, refusal keys and card kinds are the contract's, version 2 (`notes/contract.md`; `src/engine/salvage/types.ts`, `refusals.ts`, `textKeys.ts`): on a NAME the contract is right, on BEHAVIOUR this text is. Where the game as built and a ruling disagree, the ruling is written here and the difference is the lead's to settle (section 11).

**Numbers** live in `src/config/salvage.content.ts` (the content engineer's file; the fourth numbers pass, `proto/content4.json` and `proto/REPORT4.txt` in the shared notes folder), written into `games/scrap-yard/game.json` by `scripts/content/build-yard.py`, and are named here by key (`machines.stripper.rate`). A value marked **(p4)** is the content file's at 16:20 or the fourth pass's measurement, for scale: the bots on the real rules continue the tuning, and the content file is right where it has moved since. Bands are E7's, E9's, E14's, E28's and S18's. Invented names are register ids in braces (5.1).

Conventions: § the currency symbol; m a metre on the ground plane (x east, y south); integer grams and hundredths in the rules, one rounding function `roundMoney`; p̄ a grade's usual price (`grades.{id}.pbar`); "the boss" the player's worker; "yard seconds" the rules' clock `salvage.t` (2.12).

---

## 1. The first yard

### 1.1 In five sentences

1. You take over {homeYard}, a small licensed yard full of old stock, and steer your worker with one thumb: stop beside a washing machine and it comes apart, piece by piece, onto the frame on your back.
2. The platform scale weighs each grade into its bay at today's posted price, and {merchant}'s flatbed collects every bay you have not held and pays by transfer.
3. A cable bundle on the yard's old hand stripper becomes bare bright copper worth many times the iron, and inside the first half hour a small crucible pours your first brass ingot.
4. You buy better tools and carriers and a truck that fetches loads from {partnerFarm} and {partnerDemolition}, and hire a yard hand, a cutter and a driver who keep the yard earning while you are away.
5. From the first second the industry table ranks 25 rival firms by tonnes supplied under "the largest full metal recycling and resource supplier", and you pass the first inside five minutes.

### 1.2 The first five minutes (storyboard; ruling 5 and E9 give the order)

0:00 is the moment the loading animation's gate parts (6.4). Bands are E9's for the normal hand on every seed; the slow hand is held within half as long again on the same seed for every beat after 2:00 (E24, E29). Where a time is printed it is the fourth pass's (p4): the normal hand, the goal habit, route A (the washer first), fifteen seeds, as range, median and share of seeds inside the band. Route B (the cable bundle first) was not run by the fourth pass; the second had its copper ticket, the first paid one on that route, at 0:25 to 0:32 against E14's 35 s. Unmeasured beats print their aim.

| # | Band; measured (p4) | On screen | Thumb | Sound |
|---|---|---|---|---|
| 0 | before 0:00 | The loading animation (6.4): one plate per word of {title}, the display counting, a pour cooling to brass, the picture parting like gate leaves. | a tap skips it from the second launch | `load_*`, `gate_open` |
| 1 | 0:00 | Morning yard. The boss inside the gate by the drop-off's washer with a pulsing ring; west of him the scales, the price board, the stripper pad with its bundle, the crucible pad (padlock chip, price, sample ingot), {merchant}'s flatbed. Top bar "§0", "26th of 26 · next {rival.1} 0.39 t", "0.0 / 25.0 kg". Goal "Take the washer apart"; a ghost thumb drags lower left. | — | `amb_yard`, music |
| 2 | aim: to about 0:12 | He stops beside it; the ring fills. The motor arcs onto his frame, then the top panel and a side; the drum and the other side drop beside him; the counterweight thuds into the rubble skip. "Load full". | drag, release | `cut_spanner`, `piece_steel`, `thud_waste` |
| 3 | first collection ticket ≤ 0:25; 0:15 to 0:21, median 0:16, 15/15 | Goal "Weigh it on the scale". The weigh-in ticket rises with the muted "today's value", which slides onto the bay chip; the flatbed loads; the collection ticket prints at its cab ("Lot sold to {merchant}"); a coin arcs to the cash counter. | step on | `scale_beeps`, `scale_print`, `flatbed_load`, `coin` |
| 4 | aim: to about 0:30 | Goal "Strip the cable". On the way he picks up the drum and side and weighs them in; their lot waits for the flatbed's return. | steer | `pickup` |
| 5 | copper jump ≤ 1:30; 0:38 to 1:01, median 0:39, 15/15 | He stands at the hand stripper (it turns only while he does, R1): PVC curls into its bin, copper spools into the tray. On the scale "Bare bright", a short No.2 line, a value far larger than anything before, the lesson; the flatbed pays; the cash counter jumps. | stand, step on | `stripper_hand`, `coin_big`, `lesson` |
| 6 | a purchase arriving in the world after the copper jump, ≤ 2:00; the sack truck bought 0:51 to 1:13, median 0:54, 15/15 | Goal "Buy the sack truck" (the first prompt, S8): at the tool rack, "Open", its card ("Moves a washer in one trip"), "Buy §60"; a van sets it down; the boss pushes it. | Open, Buy | `buy`, `van` |
| 7 | yard hand carrying ≤ 5:00; 1:47 to 3:02, median 2:34, 15/15 | Goal "Hire a yard hand": the rota, "Hire §400"; a green vest walks out of the portacabin; chalk circles appear. "Work the drop-off": what the boss cuts and cannot carry, the yard hand carries to the scale. | Open, Hire | `door` |
| 8 | first rival ≤ 5:00; planned at about 4:00 (`rivals.list[0].passMin`, T0 0.39 t), not measured as a share | On a collection the chip slides: "25th of 26 · passed {rival.1}". | — | `chip_slide` |

That is ruling 5's list in its order. Goals are SHOWN at most one purchase prompt a minute; nothing but cash and a gate content names paces a purchase (E18, E25). The opening does not depend on the route (S10). The slow hand (p4): its first ticket 0:19 to 0:25; before 2:00 its own reactions decide (E29: copper median 1:06, first purchase 1:50, not held to the same-seed comparison); every beat after 2:00 within half as long again on 13 to 15 seeds of 15.

### 1.3 Minutes 5 to 60 (the goal order of `content4.json`, E28)

Every purchase is gated by cash and at most one gate that content names (E25; only the torch has one, rung 2); prices rise along the list (2.11). After the opening's sack truck (§60, bought at 0:54) and yard hand (§400, 2:20), in order, with price and median minute bought (p4):

1. Buy the sledge and grinder (§480, 4:25); break up the radiators: zone 2's cast iron, two brass valves on each radiator.
2. Buy the flat trolley (§540, 7:39): the boss's own carrier, 150 kg.
3. Buy the hook-lift truck (§600, 10:29); fetch {partnerFarm}'s trial load, its label readable from the gate.
4. **First drive out**, band 8 to 10 minutes on both habits (S18): hook, back over the weighbridge (gross, tare, net), tip, cut and sort. Measured 8:24 to 13:26, median 10:40, 5/15 in band: **missed**.
5. **Rung 2**, band 12 to 18 minutes (E7): "Supply 2 t (3 metals)" (`ladder.rung2`); the crane hangs the sign; a radiation portal at the gate and the ID desk window; {foundry}'s supply deal appears (optional); crew, machine and partner levels open (E25). Measured 12:09 to 14:49, median 13:18, 15/15.
6. Buy the cutting torch (§670, gate rung 2; median 14:07, 10/15 in 11 to 15 minutes): zone 3 and {partnerDemolition} open; cut up the car (its converter sells on assay); fetch the demolition load.
7. Hire a cutter (§750, 18:29; "The yard now earns while you are away."): he cuts at the drop-off, then the partners' loads on the tipping floor.
8. Buy the powered stripper (§890, 19:11).
9. Buy the crucible (§1,200, 21:32); "Charge the crucible" (Take from bays). **First small pour**, band 18 to 25 minutes (E9), waiting at "Ready to pour" for the boss (S11). Measured 24:13 to 32:50, median 27:06, 2/15 in band: **missed by about two minutes** (the cutter and the stripper now come before the crucible).
10. Buy the motor bench (§1,300, 24:23); break a motor on the bench.
11. Hire a driver (§1,500, 28:43).
12. To the hour's end one repeating goal names the advice line's purchase, "Buy next: {item}" or "Level up: {item}" (2.10). {rival.2} to {rival.4} are passed on the way (planned at about 15, 30 and 50 minutes, E7).
13. **Rung 3**, band 55 to 65 minutes: "Supply 23 t (5 metals)" (`ladder.rung3`; set for the buy-when-affordable habit, E29). Measured 55:04 to 59:46, median 57:00, 15/15; the buy-everything habit 57:01, 14/15.

The goal list as built (`scripts/content/yard/goals.json`) puts "Hire a cutter" after the farm's trial load and before rung 2; content4's order, written here, has it after the torch (before the truck's loads he was worth +2 % over five minutes, after the torch +58 %). The lead decides (section 11).

What the fourth pass shows of the rhythm (2.18): each price is 1.2 to 2.7 minutes of net income at its moment (E28 asks 1 to 2.5); cash held when a goal arrives is 0.12 to 0.88 of its price (E12 asks 0.5 to 1.25: the list is saved for, not showered); a wait over three minutes for the torch, the cutter, the bench and the driver on 4 to 6 seeds of 15 (E12 asks none); every goal purchase before the torch except the truck raises the next five minutes' income by 24 to 58 %, while the truck is −15 % over five minutes and +45 % over fifteen (E28 asks a fifth within five, or the item leaves the hour's order; S18 needs the truck: section 11). The buy-everything habit is never ahead of the goal habit before minute 12, and at most two goal purchases ahead in minutes 12 to 28 (4 seeds).

The day-1 list (E22; not measured by the fourth pass): the second yard hand (§1,200), the aluminium recipe (§1,300), the second cutter (§3,600) and the Night watch (§2,800, "a longer away cap", offered once the player has been away).

### 1.4 Days 1 to 3 (E8, E13e, E19)

Under the twice-a-day habit every sitting to the end of day 3 has a useful purchase and cash stays under about a day's income. The fourth pass (one seed, fifteen minutes every 11.8 hours, p4): an away pass earns about §383k to §437k; 6 to 11 purchases at every sitting, 71 still to buy after day 3; cash after day 3 §166k, under a day's income; levels reach 13 to 17 of 20. What there is to buy:
- Crew levels on the rota, machine levels on the process board and "Another skip" (a partner level: one more skip in rotation) on the office's partner wall, all from rung 2 (E25), priced by what their capacity is worth with a floor (2.11); the advice line names only the one that binds (E19).
- The day-1 list (1.3) and {foundry}'s supply-deal series (2.9).
- Rivals up to {rival.8} ("Pass {rival}"); the chip names the next one with the tonnes still needed.
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

**Things** are content (`objects.{id}`): `tier` (0 loose, 1 spanners, 2 sledge and grinder, 3 torch), hardness `h`, `pieces` in cut order as `[grade, g, n, sprite]`, `waste_g` (to a licensed waste carrier, through the rubble skip or the stripper's bin), `whole` (the grade it is carried at uncut, or null), `gross_g`, `sprite`, `stages`, `size`, `source` and `certifiedEmpty`. **Cut time per piece** t = max(`cut.minS`, kg × `h` / P), P the tool's `tools.{id}.P` in kg/s. A thing needing a higher tier shows its padlock chip "Needs a sledgehammer" or "Needs a cutting torch".

**Tools** (one rack; each tier one purchase in `shop`): tier 1 **spanners and bolt cutters** (owned); tier 2 **sledgehammer and angle grinder** (S6: the sledge breaks cast iron, the grinder cuts thin steel; "Sledge and grinder" on cards); tier 3 **cutting torch** (oxy-propane: beams, the car, the tank; gated at rung 2; opens {partnerDemolition}). The work animation follows the piece's family.

**The yard is full** (E1): old stock in heaps by zone (`zones.{id}`), several tonnes, the better material farther out; a zone's `tier` is its sign, each thing's own tier decides. In content (p4): **Z1** 30 washing machines, 10 bicycles, a crate of brass taps; **Z2** 24 cast-iron radiators, 6 stoves, 4 gate sections, 2 sets of alloy wheels, a bath; **Z3** 18 steel beams, 4 steel tanks "certified empty", the car; **bundle1** the cable bundle by the stripper (S4). Zone 2 fetches about §1.22 a kilogram of metal against zone 1's §0.96 (E28).

**The public drop-off** (E1's trickle that never stops): a car with a trailer leaves one thing at a time (2.12), each signed in with its slip; the first are `dropoff.initial` (a washer), the rest drawn from `dropoff.mix` (washers, bicycles, radiators, cable offcuts, brass taps, copper cylinders certified empty). Never a converter or a sealed vessel.

**How things come apart** (S6, held against `yard-metals.md`; masses are content):
- **Washing machine**: a whole motor, a top panel and two cabinet sides (light iron), a stainless drum (light iron in this stage; its lesson says so), the counterweight and plastics (waste).
- **Bicycle, gates, railings, farm sheet, cladding**: light iron. **Taps, fittings**: brass solids. **Alloy wheel**: alloy wheels.
- **Heavy cable offcuts, coils**: stripped (2.5), or sold whole priced from the copper they hold (S4, `cable.k`).
- **Radiator, bath, stove, trough**: broken by the sledge into cast-iron solids (a radiator's two valves come off as brass solids, E28), or carried whole as "Cast iron, whole". **Copper cylinder**: No.2 shell and brass fittings, or whole.
- **Electric motor** (in drop-off washers and partner loads): on the bench, No.2 windings, light iron, cast-aluminium end caps in the trade's shares (`machines.bench.out`; never a quarter copper).
- **Beam, tank**: cut by the torch to HMS 80:20; uncut, "Steel, unprepared".
- **The car** (S7, D11, E16): labelled "End-of-life car from {partnerDemolition} · depolluted · treatment record ref. 0012", in zone 3 from the first second; depollution took out its fluids, battery and tyres. It gives four alloy wheels, the wiring loom ("Thin cable", `tcab`, its own low yield, E21), the catalytic converter (one whole piece, sold on assay; ticket line "from car ref. 0012"), the body ("Car body"; its long name says shredder feed) and waste. Its `source` is `{type: 'partner', partner: 'partnerDemolition', ref: '0012'}`; `converter.source` names the car; a test refuses a converter without one.

**Grades** (`grades.{id}`: `name` ≤ 18 characters, `short` ≤ 15 on tickets and chips, `long` on cards and Help, `pbar`, `family` fe / nf / pm, `material` for range, `kind`, `asFound`): p̄ in the trade's true proportion (S5, E21: brass solids about §22.40, at least three fifths of copper; the brass ingot about §27; whole motors at two thirds to three quarters of what the bench gets out of them).

| Kind | Ids |
|---|---|
| ferrous grades | `li` light iron, `appl` appliances whole, `ci` cast iron solids, `ciu` cast iron whole, `hms` HMS 80:20, `hmsu` steel unprepared, `cbody` car body |
| non-ferrous grades | `alw` alloy wheels, `alcast` cast aluminium, `ald` aluminium dross, `brs` brass solids, `brd` brass dross, `no2` No.2 copper, `bb` bare bright, `cyl` copper cylinders, `tcab` thin cable |
| products | `bri` brass ingot, `ali` aluminium alloy ingot |
| intermediates (tonnes, no range) | `cab` heavy cable, `mot` electric motors, `conv` the converter (family `pm`) |

Lead is no grade in stage 1: a greyed plate only (E16). The converter is paid by the master's payables (4.3; `converter.*`: grams of each metal, their prices, the payable shares, the ceramic and assay fees), printed on its cage card ("Paid on assay: platinum {pt}, palladium {pd}, rhodium {rh}, less fees"), with one gram of rhodium (E21); if it floods the hour's last quarter its payables fall (E10).

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

Three roles, hired on the office's **rota** and levelled there from rung 2 (S15, E25 **[v3]**); each hire walks out of the portacabin door. Vests: yard hand green, cutter blue, driver teal; the boss hi-vis with a white hat. **Crew are agents on legs** (E17, 2.12): each trip is chosen when it starts and ends at a time computed then; the crew member the player sees walking IS that trip. First names from `crew-names.json`.
- **Yard hand** carries on a sack truck (R2) by S12's priority, and whole light things at their unprepared grade (E4), so the yard earns, slowly, without the boss; never from the heaps (the chalk circles hand them over).
- **Cutter** cuts at the drop-off, then on the tipping floor (the partners' loads, where after the torch he is worth most, 1.3), never what the boss works, never the heaps.
- **Driver** fetches the skip full longest (E26 **[v3]**) when cash and the tipping floor allow (S12); the rota shows "Kept for the next load: §x", the reserve of a load full now or within 60 s (E29 **[v3]**, 2.10).
- **Places**: the crew keys of `shop` (`hand1`, `cutter`, `driver`) in the hour's order; `hand2` and `cutter2` on `dayOneList` (E22). A level multiplies the member's rate by (1 + `lev` × (L − 1)) (linear, the lead's answer), up to `maxlev` 20.
- **The foreman** (master 3.4): crew and machines run faster by `foreman.boost` while the boss has worked in the last `foreman.windowS`, for at most `foreman.minutesPerDay` of each market day, shown by a meter on his vest; never away.

### 2.7 Partners, labels, trial loads, skips, the truck, the tipping floor

**Partners** (`partners.{id}`): {partnerFarm} opens with the truck (`opens`); {partnerDemolition} opens with the torch and stands on the lane before the weight-limited bridge (S18). Each has a site with a skip zone, a sign and a business card ({farmContact}, {demolitionContact}) on the office's Partners tab.

**Loads are honest** (E3, E20, master 5.3). A skip's contents (whole things by object) are fixed when it fills and printed on its label, with its price, before anyone hooks it; the weigh-in equals the label; nothing is drawn after paying. Price = `roundMoney(k × as-found value at the day's prices)`, as found being each grade's `asFound` share of its prepared price; `k` 0.85 (p4) and loads of whole cast iron, cable, motors, uncut steel and appliances, so at least three fifths of a load's margin is the yard's preparing (E20; E29 allows k up to 0.88 or truer as-found shares to reach it); nothing in a load needs a tool the player cannot own when its partner opens. **The first load from each partner is a small trial load** at a fixed price a new yard can pay (`trial`, `trialPrice`: the farm's §150, the demolition's §400, p4; R17, accepted by E29). The regular skips (p4): the farm's radiators, stoves, a trough, washers, two motors, a cable offcut and fittings (703 kg, §958); the demolition's beams, cladding, cable coils, radiators, two motors, a tank and fittings (1,183 kg, §1,842).

**Skips in rotation are skips** (E26 **[v3]**). A partner at level L has L skips at its site, slot 0 being the trial skip, full when the partner opens. Each skip fills `fill_s` after it was hooked and an empty one set down in its slot (the farm 120 s, the demolition 180 s, p4). The driver and the boss hook a full one, the one full longest; the lane shows every skip, each with its own label. Supply is L loads per fill time. "Another skip" is a partner level bought on the partner wall from rung 2 (E25).

**The label** (a world plate and the skip card): "{partner} · full" or "trial load", net mass, up to three thing lines and "+ n more", the price, and why it cannot be hooked ("Filling · full in {t}", "Needs §{x} more for this load", "Tipping floor needs {kg} free"). The card lists every thing.

**The truck** (hook-lift, one purchase): entered by walking into it, left with "Step out"; carries one skip, never pieces; swaps, never crushes or tows; its last stopped position is rules state.

**Hook**: still in the skip zone by a full skip, cash for its price above any earmark, and room on the floor for all of its mass (`floorRoom_kg`, 4 t, p4; room by mass, the lead's answer): a ring of `truck.handle_s` (moving restarts it), then the price is paid and an empty skip goes down; a load that cannot be tipped is never paid for (test). **Weigh-in** over the weighbridge (2.2), then **tip** (still on the floor for `truck.handle_s`): things and loose pieces onto the floor, cut by the boss and the cutter, carried by the yard hand.

### 2.8 The posted price board, the market clock, Hold's signal

**The market clock** (S14): t_m = max(device now, `clock.highMs` + live time since the last resume, from `performance.now`, passed in): never backwards, advancing in live play after a clock-back. Day D = floor((t_m − `board.epochMs`) / 86,400,000), the epoch a Monday 00:00 UTC. A gap over `away.gapS` goes to the away pass, the same engine (2.16). The rules keep running under an open overlay; the boss stands (the world engineer changes the ground work's "the yard stops under them" to match).

**One posted price a day per family** (`fe`, `nf`; `pm` for the converter's daily step only): x_f(D) = Σ_{k=0..29} 0.5^k × `board.a` × w_f(D − 1 − k), w_f(n) = 2 × hash01(worldSeed, f, n) − 1 (tune `a` 0.02 to 0.05); p_g(D) = round(p̄_g × (1 + x_f(D))) in hundredths; the converter's metal prices step by x_pm. A pure function of D: every phone shows the same board, nothing is saved.

**The day word**, Hold's signal: **low day** (x < −`board.wordBand`), **usual**, **high day**; on the board, each row and each bay chip when not usual. The board's first opening points at a day word ("Cast iron: a low day. Holding is free.").

**Shown equals applied**: every Sell carries the step it showed (`sell(grade, shown)`, `SellShown {day, price, grams}`); if the day has changed when the tap lands, "Price updated: §{a} → §{b}" asks again.

### 2.9 The supply deal

{foundry} appears on the office's partner wall at rung 2 (`deal.gate`) with "{q} kg of cast iron a day for {d} days at §{p} a kilo, locked at signing" (S21: "supply deal", never "contract"); p = round(A_ci(D) × (1 + premium)), A_ci the mean of the last seven days' cast-iron prices, q, d and premium from `deal.series[]`. After signing, cast iron weighed in first fills a reserve of q in its bay ("Reserved for {foundry} {a} / {q} kg"). At each 00:00 UTC, before anything else: delivered = min(q, reserve), paid and supplied on a delivery ticket; trust (`deal.trust`) rises for a full day and falls for a short one; **nothing is ever charged for a miss**. After d deliveries the series offers the next deal. Trust gates nothing in stage 1.

### 2.10 Goals and the advice line

**Goals** are content by id (`goals[]` and `dayOne[]` in `scripts/content/yard/goals.json`, the hints engineer's, merged into game.json by the build): `id`, `text` key (≤ 30 characters), `target` for the chevron, `via` (a target shown first, e.g. the truck before a fetch), `done` in the goals' grammar (`cut:<obj>:<n>`, `weighIns:<n>`, `made:<grade>`, `owned:<key>`, `hired:<role>:<n>`, `fetched:<partner>:<n>`, `rung:<n>`, `poured:<n>`, `passed:<n>`, `away:<n>`, `visited:<point>`, `repeat` and the rest, read from the state as lifetime counts), an optional `buy`, `optional`, `after`, `stall` (the hints' escalation); no words. The state keeps `goals {done[], skipped[], lastPromptAt, repeats}` **[v3]**. The current goal is the first of `goals` neither done nor skipped, then `dayOne` in order once those are through; a `dayOne` goal waits for its `after` (the Night watch for the first time away, `away:1`, the lead's answer). A goal whose `buy` is owned counts done whatever its condition; an optional goal is put aside with "Not now" (`skipGoal`). No goal is met by doing nothing. A purchase goal is SHOWN no sooner than `advice.promptGapS` after the previous prompt (`lastPromptAt`): how goals are shown, never what paces buying (E18, E25). After the fixed list one goal repeats (`repeat`): "Buy next: {item}" or "Level up: {item}" (the lead's ruling, **[v3]**), naming the advice line's purchase; it is never met by itself, is passed over once the goal after it (rung 3) is done, and with no advice shows that goal instead.

**The advice line** (the expanded card's third line; the only line after the last goal): the cheapest purchase that widens the bottleneck now, priced at most cash plus `advice.minutes` minutes of `incomeRate`, never leaving cash below the reserve: the price of a load full now or within `advice.reserveS` (60 s) that the driver can fetch (E19, E29 **[v3]**). What binds (R16, accepted by E29): a tipping floor holding over 1.5 t names a cutter level; loose stock over 200 kg waiting, a yard hand level; a hopper 80 % full, its machine's level; otherwise another skip and the driver. A level that would change nothing now shows what it would add and "Not the bottleneck now"; the advice line never names it (E19).

### 2.11 Rungs, range, gates, prices, ceilings, the industry table and rivals

**Rungs are positions, never titles** (S15, D8, D16). Rung r is entered at `ladder.rung{r}.t` lifetime supplied and range `ladder.rung{r}.range` (rung 2: 2 t, range 3; rung 3: 23 t, range 5; p4); rungs 4 to 9 (`ladder.rungs`) show on the table with their gates and a padlock. The crane hangs "{homeYard} · {t} supplied"; goals read "Supply 2 t (3 metals)"; refusals "Opens at 2 t supplied". Rung 2's portal and ID desk are equipment, never the yard becoming licensed.

**Range**: a material counts once its lifetime supplied products are worth `ladder.theta` at p̄. Stage 1 offers six (light iron, cast iron, steel, aluminium, brass, copper) and rung 3 asks five, so a hand that skips the torch still gets there. Intermediates count tonnes only.

**Gates** (E25 **[v3]**): a shop item carries at most one gate that content names (`shop[].gate`) and its card shows with a padlock: a rung ("Opens at 2 t supplied") or another item owned ("Opens with: {item}"). In content only the torch has one (rung 2). Crew, machine and partner levels open at rung 2 (`levels.opens`). Nothing else holds a purchase back: no one-at-a-time, no card delay (the third pass's R13, refused).

**Prices** (E12, E18, E25, E28) are content, derived by the numbers pass: goal k costs 1.6 × the normal player's net income a minute (sales less loads bought, over the last two minutes) at the moment goal k − 1 is bought, and at least 1.12 × goal k − 1, so a later item is always dearer and buying it first delays the rest. A level costs max(tau(L) × the kilograms a minute it adds at full feed × the mean margin a kilogram, `levels.floor` × `levels.floorGrowth`^(L−1)), tau(L) = min(540, 20 × 1.6^(L−1)) minutes; the floor (§1,800, × 1.25 a level, p4; the fourth pass's R21) keeps the buy-everything habit from starving the list on cheap levels **[v3]**; levels go to `levels.maxLevel` 20 (R15, accepted). **Ceilings** are a guard (D5, S16): `ceilings_t_h` (6, 20, 160) at rungs 1 to 3; a purchase lifting R over its rung's ceiling is refused ("Capacity {c} t/h · grows at {t}").

**The industry table** (notice board and chip): the top line "the largest full metal recycling and resource supplier", nine rungs (current lit, next with its gates), range chips, 26 rows (rank, 24 pt plate logo, chip name, tonnes, "simulated"), the player pinned, "Rival firms (simulated)".

**Rivals** (S17, D19, E24, E27 **[v3]**): `rivals.list[]` (`id` the register id `rival.N`, `T0_t`, `g_day`, `passMin` the plan), chip names from the register. T_i(d) = T0 × (1 + g_day × min(d, 40)) with d = D − `clock.startDay`, the market days since this player's first second, so every player meets the same race whenever they begin (a formula on the calendar day is refused, E27); in the first hour d = 0. In content (p4) rival.1 to rival.4 start at 0.39, 2.35, 7.09 and 18.28 t (passed at about 4, 15, 30 and 50 minutes), g_day 0.05; later rivals rise to 0.155. A passed rival never passes back: as a guard the k-th rival below the player shows at most (1 − 0.03 k) of the player's tonnes, so no two rows print the same figure (test). Position never falls while away; "Passed {rival}" fires once.

### 2.12 The engine: whole items, mass, agents on legs, events read from the state (E17; contract version 2)

**Two kinds of stock.** (a) **Whole items**: a *thing* (`ThingState`: in a zone heap, a drop-off slot, on the tipping floor) and a *piece* (`Piece {uid, grade, g, from, spec, whole?}`: on the ground as a `GroundPiece` with its `pile`, `k` and `claim`, on a load, in a hopper; the same `uid` all the way), each with its mass from content (`objects.{id}.pieces`, `gross_g`). A piece exists from the moment its cut completes; carriers move whole pieces and whole things; a whole thing is weighed in whole at its `whole` grade; the converter is one piece. (b) **Mass** in integer grams by grade: bays, out trays, the PVC bin, the crucible's pot and heel, a machine's work in progress. No ticket prints part of a thing, and a lot never takes part of a whole unit: the grades of `wholeUnits_kg` (the converter, motors, cylinders, alloy wheels) are counted in whole units in their bay (`BayState.n`) and collected whole (R19, accepted by E29, **[v3]**).

**Time** is yard seconds `salvage.t`: live ticks plus away passes. Every dated field counts it and every action takes `clock = salvage.t` **[v3]**. Two times within 1e-6 s are one instant (R12). A leg's distance is `map.routes["a-b"]` (either order) if listed, else `map.detour` × the straight distance; the lane adds `map.lane` (farm 180 m, demolition 300 m, p4) each way from the gate.

**Agents on legs.** Each agent holds at most ONE dated end, computed when its leg starts; the foreman's boost and a level apply from the next leg; while `truck.trip` runs, the driver holds no leg of his own **[v3]**.
- **The boss** (live only, from presence, 2.1): `work` (the current piece ends at start + t − progress; moving cancels it and keeps `progress` on that thing), `pickup` and `feed` (one piece every `pick_s`), `weigh` (`weigh_s`), `circle`, `strip` (the hand stripper runs only while he stands at it, R1), `hook`, `tip`, `drive`. A presence sample may cancel the act in progress; an open overlay does not stop the samples (he stands).
- **Cutter**: when idle he takes the free thing of highest prepared value per cutting second, at the drop-off first, then on the tipping floor. Power: `tools[best].P` × `crew.cutter.share` × (1 + `lev` × (L−1)), at most `cap` × P; he walks at `crew.hand.v`. **When he starts a thing he decides once** (`cut {thing, whole}`, never recomputed **[v3]**): with the boss within `reach.sight` of it (about 10 m, the lead's answer) each piece is its own event and drops to the place's pile; otherwise the whole thing is one event at the sum of its piece times and its pieces appear together (E17). Because the decision is state, the tick and the jump agree. Waste goes to the rubble skip.
- **Yard hand** (R2: `crew.hand.load` kg on a sack truck, speed `v` × (1 + `lev` × (L−1)), `handle_s` at each end). **At each departure** he takes the first place with work in S12's order: (1) *feed*: an owned machine whose hopper has room for a piece of its input lying in a chalk circle, at the drop-off or on the floor; (2) chalk circles; (3) out trays (mass, up to his load); (4) the drop-off's pieces; (5) a whole thing at the drop-off of at most his load, at its `whole` grade, when no cutter is hired or every drop-off place is taken (E4); (6) the tipping floor's pieces, then such a whole thing. Inside a place: highest p̄ per kilogram (cable at its copper, R7), ties heavier first, whole items while they fit. **Claims** **[v3]**: at departure he claims what he will take (pieces by `GroundPiece.claim`, a thing by `ThingState.by`, tray grams by `trayClaim_g`, all listed in `claims`); nobody else takes a claimed item; *pick* moves them to his load, *drop* feeds the hopper or weighs them in on the platform (a crew chip). **When nothing waits** he stands at his stand by the scale house and is offered work again at every later event.
- **Driver** (hired; the truck owned, parked in the yard, empty, the boss not in it): he departs for the partner skip full longest (E26 **[v3]**) if cash above the earmarks covers its price and floor mass + the skip's ≤ `floorRoom_kg`. The price and the floor room are **earmarked** at departure (`truck.earmark {money, floor_g}`: no purchase takes cash below it), so the hook always pays. The trip (`truck.trip {partner, slot, phase, t0, endsAt}`): walk to the truck; drive out at `truck.v` × `driverFactor` × (1 + `crew.driver.lev` × (L−1)); hook (`truck.handle_s`; paid; an empty skip goes down); back over the weighbridge (skip ticket); tip (`handle_s`); park. **The reserve** (E19, E29 **[v3]**): the price of a skip full now or within `advice.reserveS` (60 s) that the driver can fetch is shown on the rota as "Kept for the next load: §x"; the advice line and the bots never spend below it; it refuses nothing.
- **The merchant's round** (S1, R5): *waiting*; at the first event at which a bay has collectable grams (not held, not reserved, or set aside by Sell) it starts *loading* (`merchant.load_s`) and fixes the lot then, each line resolved down to 0.1 kg and to whole units for `wholeUnits_kg` grades **[v3]**; at the end it pays (`collected`) and is *away* (`merchant.round_s`); on return it waits or loads again. A lot pays the day's posted price, each set-aside lot its own price (`aside[]`, 2.15), a converter its assay (2.4).
- **The drop-off**: the first arrival at `dropoff.first`, then one every `dropoff.period` while fewer than `dropoff.places` things wait; when all are taken the next comes the instant a place frees. The object is `dropoff.initial[n]` within that list, else drawn from `dropoff.mix` by `hash01(worldSeed, 'dropoff', n)`.
- **Machines** work mass at a rate. A hopper holds whole pieces up to `inbuf` kg (a piece enters only whole). An idle machine takes the next piece into work (`work {piece, startAt, rate_kg_s, credited}`); its outputs are credited to the tray by the cumulative rule out_g(t) = floor(share × rate × (t − startAt)) per output grade, the piece's last credit giving the exact remainder, so ticking and jumping credit the same grams; its event is the piece's end. A full tray (`tray` kg) stops it, nothing lost. Rate: `rate` × (1 + `lev` × (L−1)) × the foreman's boost (linear, the lead's answer); at an event that changes the rate, the work is credited to that instant and restarted from it. The strippers give `cable.yield_` copper (`cable.tinned` of it No.2, the rest bare bright), the rest PVC; the bench its `out` shares and `waste`.
- **The crucible** (S11; mass only). *Take from bays* reserves the recipe's input grade (`forCrucible_g`) from weigh-ins and unreserved stock, up to the room left in the pot; while no heat runs, reserved grams move into the pot at once. A carrier's piece of the input grade melts in whole if it fits. Pot: `pot` × (1 + `lev` × (L−1)) kg, heel included. A heat starts when the pot is full, or at lastFeedAt + `start_idle` with charge + heel ≥ `start_share` × pot; it lasts `s_per_kg` × the new metal's kg. At its end: dross = round((1 − yield) × charge_g), metal = charge_g − dross + heel_g, n = floor(metal / `ingot_kg`), the heel keeps the rest; ingots and dross go to the tray. **The first heat ever** waits at *ready* until the boss is within `first_wait_m`; later heats pour at their end.
- **Partners' skips** (E3, E26 **[v3]**): one `SkipState` per slot; a skip set down at `setAt` is full at `fullAt` = `setAt` + `fill_s`, its contents fixed then (`hash01(worldSeed, partner, n)` over the mix); when it is hooked an empty skip is set down in its slot at that instant.
- **Purchases on their way** (`arriving[]` **[v3]**): a bought item is owned from its arrival at `at` = the purchase + `shop[].deliver_s` (van, machine flatbed, truck; a hire walks out); a machine works from its arrival.

**Events**: every agent's dated end; a machine's piece end or full tray; a heat's end; the drop-off's arrival; a skip full; the round's load, payment and return; a purchase arriving; the foreman's boost ending; the day boundary (00:00 UTC: the board's step, the deal's delivery, the rivals' day). **The queue is derived** **[v3]**: no queue is saved; `nextEvent(cfg, g)` is the minimum over the dated fields (`act.endsAt`, crew `t1`, `truck.trip.endsAt`, the crucible's end and start condition, the round, the drop-off, skips' `fullAt`, `arriving[].at`, the next day).

**Order at one instant**: (1) the day boundary; (2) completions: machines and the crucible, the boss's act, cutters, yard hands (pick before drop), the driver; (3) arrivals: purchases, drop-off, skips; (4) the round; (5) departures of idle agents: cutters, yard hands, the driver, each in id order; (6) checks: rung, rivals passed, the deal offer, goals, lessons.

**A leg in flight whose source or destination changes**: claimed items cannot change; a hopper full on arrival takes what fits and the rest goes on to the platform (a new leg); a machine bought meanwhile is offered at the next departure; the driver's price and room are earmarked; the boss never works a thing a cutter holds (he works the next nearest).

**R(assets)**, rated capacity in t/h, is the throughput of the current crew and machines with full feed and no boss, from the same rates; it feeds the ceilings (2.11) and the cards' "+1.2 t an hour" (E13d).

### 2.13 The state, field by field, and the derived values

`SalvageGame = GameState & {salvage: SalvageState}`; cash is the shared `GameState.cash`, changed only through `money.ts`'s one commit; `stats.playSeconds` (shared) counts time played; save tag `salvage1`; layout `v: 2` (a save of another layout starts afresh). `SalvageState`, by the contract's names **[v3: contract version 2]**:
- `v`; `t` (yard seconds); `epoch` (bumped by every away pass, reconcile and preset: the world snaps across it, never tweens); `clock {highMs, day, startDay}`.
- `owned` (shop keys); `arriving[] {item, by, place, since, at}`; `tier`; `carrier`; `load` (pieces); `presence`, `presenceAt` (a sample older than `feel.staleS` is no boss); `act {kind, target, since, endsAt}`.
- `things[] {uid, obj, at, cut, progress, by}` (`by` is also the claim; uids `${zone}.${obj}.${k}`, `d<n>`, `f<n>`); `pieces[]` (ground pieces, uids `${thing}.p<n>`); `waste_g`; `scaleRound_g` (the scale's rounding kept, signed, so the mass test balances: the lead's answer).
- `bays[grade] {g, n, held, aside[] {g, price, day}, forCrucible_g, forDeal_g}`.
- `machines {hand_stripper, stripper, bench, crucible}`: `owned, level, hopper, work, tray_g, trayClaim_g, status, since`; the crucible adds `recipe, fromBays, charge_g, heel_g, phase, phaseSince, endsAt, lastFeedAt, firstPoured, cooling`.
- `crew[] {id, role, slot, name, level, job, phase, from, to, t0, t1, carries, load, claims, cut}` (`from`, `to` are Spots resolved by `positions.spotPos`).
- `partners[id] {open, trialUsed, level, skips[] {slot, phase, setAt, fullAt, contents, mass_g, price, priceDay, trial, n}}`.
- `truck {owned, x, y, heading, skip, by, trip, hookSince, earmark}`.
- `merchant {phase, since, endsAt, lot[] {grade, g, n, price, amount}}`; `dropoff {nextAt, n}`; `deal {step, phase, q_g, days, price, delivered, trust, last}`; `foreman {day, used_s, lastWorkAt}`; `ladder {supplied_g, worth, rung, passed}`; `goals {done[], skipped[], lastPromptAt, repeats}`; `lessonsSeen` (lessons SHOWN: the rules pace them inside the weigh-in, 4.4); `seen {places, cards}` (written only by `noteSeen`, which the screens call when a card opens or a label first shows); `tickets` (last 50), `ticketNo`; `away` (the one waiting away card); `draws`; `beenAway`; `income {minute, buckets[5]}` (§ collected per minute of yard time).
- **Not in the state**: a queue (derived, 2.12), flows, `debt` (E11), `keptFor` (the derived reserve), `hookRing`, `goals.at`.

**Derived** (pure, read-only, the `rules-book` package and the facade): `priceOf(grade, day)`, `priceBoard`, `tickets`, `cardOf(ref)` (each row with its exact price, state and refusal), `skipLabel`, `skipLabels`, `industryTable`, `rangeChips`, `nextGoal`, `goalList`, `advice`, `processBoard`, `awayCard`, `topBar`, `frame` (the `FrameTable`: crew, the truck and the flatbed as legs `from, to, t0, t1`, which the world interpolates), the positions (`piecePos`, `thingPos`, `spotPos`, `bayPos`, `skipZone`, `lanePath`, ...), `ratedCapacity` (R), `shopPrice`, `levelPrice`, `reserve`, `nextEvent`, `incomeRate` (§ collected in the last five minutes ÷ 5, from `income`).

### 2.14 What a tick does, in order, and what it returns

`tick(cfg, g, dt, now) → {g, events}` advances at most `MAX_TICK` of live play and adds it to `salvage.t` and `stats.playSeconds` **[v3]**:
1. **The clock**: t_m = max(now, `highMs` + live time since the last resume); a gap of more than 2 s (S14; `away.gapS`) goes to 2.16 first **[v3]** (the game as built holds 10 s: section 11).
2. **Presence** already applied by its action (2.15).
3. **Advance**: repeatedly take the earliest event ≤ the horizon, credit every machine's mass to its instant, apply it and the others at that instant in 2.12's order, re-offer idle agents; then credit machines to the horizon.
4. **Checks**: rung, rivals passed, the deal offer, the goal, lessons (paced inside the weigh-in: in the first five minutes only a value jump shows its lesson; a ticket's `lessonText` is already paced).
5. **Return** the new state and the typed `SalvageEvent`s of `types.ts` in the order they happened, nothing in them a word: among them `workStart {grade, ring}`, piece uids on `pickup`, `feed`, `swap`, `pieceOff` and `weighIn`, `collected {first}`, `lesson {grade, text}`, `refused {key, args, retry}`, skip events with their `slot`, `crewLeg` with Spots, `pour {by}`, `arrival` of kind `dropoff`, `van`, `machineFlatbed`, `truck` or `crew`, the round's `roundLoad` and `roundBack`.

A jump is `advance(g, nextEvent)`; the gate compares ticking at 0.1 s and jumping minute by minute (cash, supplied, every stock) on every bot run.

### 2.15 Every player action, with its checks and refusals

Every action is pure `(cfg, g, …, clock, events)` with `clock = salvage.t` (and `now` where the market day matters) **[v3]**. A refusal returns the SAME state and pushes `refused {key, args, retry}` (`retry` the action to press again, e.g. at the price now); an action that changes nothing returns the same state and pushes nothing. Every purchase compares the shown price with the price now.
- `presence(p, events)`: stores the sample; starts, continues or cancels the boss's act (work after `feel.workDelay` within `reach.work`; pickup within `reach.pickup`; weigh, feed, circle, strip within `reach.place` of the point; entering the truck within `truck.enter` when `by` is null); reports `workStart`, `pickup`, entering the truck and the refusals `tool2`, `tool3`, `tooHeavy`, `weighFirst`, `filling`, `loadCash`, `floor`, `noTruck`.
- `buy(item, shownPrice)`: refused `owned` (owned or on its way), `rung` (its rung gate not reached), `needsItem` (its item gate not owned; E25 **[v3]**), `earmark` (the price within cash but above cash less the driver's earmark), `cash`, `ceiling` (R after the purchase above this rung's `ceilings_t_h`), `priceUpdated`. Then cash −= price and the item goes into `arriving` (2.12).
- `hire(role, shownPrice)`: the next unbought crew key of that role in shop order (`hand1, cutter, driver`, then `hand2, cutter2`); refused `noPlace` when none is left, then as buy; the hire walks out of the office.
- `level(target, shownPrice)` (a crew member, a machine, or a partner's "Another skip"): refused `notOwned`, `rung` before `levels.opens` (rung 2; E25 **[v3]**), `topLevel` at `levels.maxLevel`, `earmark`, `cash`, `ceiling`, `priceUpdated`; price `levelPrice(target, L+1)` (2.11). A level that would not widen the bottleneck is sold, shown "Not the bottleneck now" (E19); it is never refused `nothing`.
- `setHold(grade, on)`; `sell(grade, shown, now)`: only on a held bay; refused `nothing` with no unreserved grams; shown.day must be today, shown.price `priceOf(grade, today)`, shown.grams the bay's unreserved, not set-aside grams resolved down to 0.1 kg (whole units for `wholeUnits_kg`), else `priceUpdated`; then one `aside[]` entry {grams, price, day} **[v3]**.
- `setRecipe(recipe, confirmHeel)`: refused `notOwned`, `heatRunning` during a heat, `confirmHeel` when a heel exists (retry with true); then the heel pours as one short ingot to the tray and old reservations are released.
- `setFromBays(on)` (refused `notOwned` without a crucible); `signDeal(terms, now)` (terms equal today's, else `priceUpdated`; `nothing` with no deal offered); `declineDeal()` ("Not now": offered again at the next market day; `nothing` with none) **[v3]**; `stepOut(at {x, y, heading} | null)` (refused `stopFirst` while the truck moves, `nothing` when not driving; the place and heading become state); `skipGoal(id)` (`nothing` unless it is the current goal and optional); `noteSeen({place?, card?})` (never refused); `ackAway()` (closes the away card; pays nothing).

### 2.16 Time away

The same `advance` with **no boss**: no boss acts, no foreman, the hand stripper idle (R1), cutters on whole-thing events. A = min(t_m − max(`lastSavedAt`, `clock.highMs`), cap), cap `awayCap_h[0]` (4 h, p4), or `[1]` (6 h) with the Night watch; A is added to `salvage.t`, never to `stats.playSeconds`. Day boundaries inside A happen at their market time; the time beyond A passes with no work. If the boss left the truck loaded, the driver (when hired) finishes the weigh-in and the tip. **Money once** **[v3]**: the pass pays into cash through money.ts inside the state; `salvageOffline` always returns `earnings: 0` and no report, so the shared store pays nothing twice; the one away card is `salvage.away`, shown until `ackAway`. The pass emits only `awayReport`, `passed` and `rung`, bumps `epoch` and sets `beenAway`. `highMs` rises to t_m, so a clock that jumps forward and back never pays a stretch twice. The **away card** (`AwayCard`) lists the lots collected during the pass by grade, supplied, loads fetched, deliveries, rivals passed, and a hint when little was earned (S13). No rank is lost: rivals are pure functions of the day under the S17 guard. The bench prints how long six hours away take (aim < 50 ms in node).

### 2.17 The content data

One source feeds the rules, the screen and the bots (S23): `src/config/salvage.content.ts` (`SALVAGE_CONTENT`, typed as the schema's input; `SALVAGE_PENDING` holds keys the schema does not take yet: `levels.floor`, `levels.floorGrowth`) → `scripts/content/build-yard.py`, which lays over it the names register, `text.json`, `goals.json` and the wiring engineer's top-level block, checks `SalvageSchema`, `lintSalvage` and its own lint (mass kept, prices rising and payable, footprints apart, the hero frame, sprites against the manifest), and writes `games/scrap-yard/game.json` (`salvage`, parsed at install by `src/config/schema.salvage.ts`; its `MapSchema` is strict). Units: grams for pieces and `_g`; kilograms for `_kg`, `load`, `inbuf`, `pot`, `tray`, `carriers`, `bays`; kg/s for rates and `P`; seconds `_s`; minutes `passMin` and tau; hours `_h`; § a kilogram at the usual price; metres.

| Family | Keys (meaning) |
|---|---|
| provenance | `version`, `units`, `$changes` (what the pass moved and why), `$keys`, `worldSeed` (the counter-hash seed) |
| the ground work | `yard {width, depth, ppm, tilt, tile}`, `worker {radius, reach}`, `helpers`, `props[]` (walls, piles, crates: shape, size, solid) |
| `grades.{id}` | `name`, `pbar`, `family`, `material`, `kind` (grade, product, intermediate), `asFound` (E3), `sprite`, `load` (the carried look), `picto`, `bay {kind, sprite, place, slot}`; `short`, `long` from text.json |
| `cable`, `converter` | `yield_`, `tinned`, `k`; `pt_g`, `pd_g`, `rh_g`, their § a gram, `pay_*`, `ceramic_kg`, `ceramic_fee`, `assay_fee`, `paid` (a check), `whole`, `source` (the car) |
| `objects.{id}` | `tier`, `h`, `pieces` [grade, g, n, sprite], `waste_g`, `whole`, `gross_g`, `preparedValue`, `asFoundValue` (checks), `sprite`, `stages`, `size {w, d, h}`, `source`, `certifiedEmpty`; `name`, `long` from text.json |
| `zones.{id}`, `map` | `tier`, `things`, `centre`, `r`, `footprint`; `points`, `footprints`, `walls`, `gaps`, `hero {x0, y0, w, d, places}`, `detour`, `lane {farm_m, demolition_m, bridge_m}`, `laneWidth`, `routes`, `places.{id} {w, d, h, solid, sprite, card}` |
| the hand and the truck | `tools.{id} {tier, P}`, `carriers {frame, sack, trolley}`, `walk`, `pick_s`, `weigh_s`, `truck {v, handle_s, driverFactor, radius, enter}`, `reach {work, pickup, place, sight}`, `feel {workDelay, staleS}`, `cut {minS}` |
| `machines`, `crew` | `rate`, `needs_boss`, `inbuf`, `tray`, `lev`, the bench's `out` and `waste`; the crucible's `pot`, `s_per_kg`, `start_share`, `start_idle`, `recipes` ([in, out, yield, dross]), `first_wait_m`, `ingot_kg`; `hand {load, v, lev, handle_s, maxlev}`, `cutter {share, lev, cap, maxlev}`, `driver {lev, maxlev}` |
| supply and selling | `dropoff {period, first, places, mix, initial}`, `partners.{id} {opens, lane, trial, skip, fill_s, k, trialPrice, sprite, skipLook}` with the checks' masses and prices, `floorRoom_kg`, `merchant {load_s, round_s}`, `scale`, `bays`, `wholeUnits_kg` |
| the shop | `shop[] {key, kind, place, price, gate, deliver_s, arrive}` (the pass's measures beside them as notes), `dayOneList[]`, `goalOrder`, `shopRules` (provenance, never a rule: E25) |
| levels, ladder, rivals | `levels {tau {first, growth, cap}, maxLevel, opens, margin_per_kg, rule, advice, skipsInRotation}` (+ pending `floor`, `floorGrowth`), `ladder {rung2, rung3, theta, rungs[]}`, `ceilings_t_h`, `awayCap_h`, `rivals {rule, list[] {id, T0_t, g_day, passMin}}` |
| time and the market | `board {a, wordBand, epochMs}`, `deal {partner, grade, gate, series[] {q_kg, days, premium}, trust {up, down, start}}`, `foreman {boost, windowS, minutesPerDay}`, `away {gapS}`, `advice {minutes, promptGapS, reserveS}`, `lessons` (grade → lesson key) |
| laid on by the build | `names` (by register id), `text {lessons, partners, glossary}` (text.json), `goals[]`, `dayOne[]`, `teach` (the hints' timings; goals.json), the app's top-level block |

The frozen test content (`src/engine/fixtures/salvage.ts`) has the same keys with round values, and the five frozen states; the rules tests never read the tuned file.

### 2.18 The first hour as measured

The fourth numbers pass (`proto/yard4.py`; tables `final4_out.txt`, `days4_out.txt`; `REPORT4.txt`): fifteen seeds, route A only, three hands (brisk, normal, slow), two habits (goal: a goal's purchase the moment it is affordable; all: everything affordable at once, levels included), no waiting rule. Its verdict: part of the way.

| Beat | Band | Normal, goal habit | Normal, all habit | Slow, within 1.5 × normal |
|---|---|---|---|---|
| First collection ticket | ≤ 0:25 | 0:15 to 0:21, med 0:16, 15/15 | the same | 13/15 |
| Copper jump | ≤ 1:30 | 0:38 to 1:01, med 0:39, 15/15 | the same | 2/15 (before 2:00, not held) |
| First purchase | ≤ 2:00 | 0:51 to 1:13, med 0:54, 15/15 | the same | 1/15 (not held) |
| Yard hand carrying | ≤ 5:00 | 1:47 to 3:02, med 2:34, 15/15 | the same | 15/15 |
| First drive out | 8 to 10 min | 8:24 to 13:26, med 10:40, **5/15** | 5/15 | 15/15 |
| Torch | 11 to 15 min | 13:16 to 17:01, med 14:07, 10/15 | med 13:55, 11/15 | 14/15 |
| Rung 2 (2 t) | 12 to 18 min | 12:09 to 14:49, med 13:18, 15/15 | 15/15 | 15/15 |
| First pour | 18 to 25 min | 24:13 to 32:50, med 27:06, **2/15** | med 26:30, 3/15 | 15/15 |
| Rung 3 (23 t) | 55 to 65 min | 55:04 to 59:46, med 57:00, 15/15 | med 57:01, 14/15 | 15/15 (med 63:35) |

Income by five-minute window (normal hand, goal habit, sales § a minute, median) against E28's aim:

| Window (min) | 0-5 | 5-10 | 10-15 | 15-20 | 20-25 | 25-30 | 30-35 | 35-40 | 40-45 | 45-50 | 50-55 | 55-60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Aim (E28) | 120 | 250 | 450 | 800 | 1,300 | 1,800 | 1,980 | 2,178 | 2,396 | 2,635 | 2,899 | 3,189 |
| Fourth pass | 242 | 226 | 258 | 468 | 668 | 655 | 828 | 1,320 | 1,448 | 1,417 | 1,478 | 1,514 |

**What it misses**: the first drive (median 10:40) and the first pour (median 27:06) fall outside their bands; windows 2 and 3 are flat (the boss's own cycle in zones 1 and 2 is worth §90 to §230 a minute, the trickle's order); windows 5 and 6 dip while three new machines hold material back from the next five minutes' sales; **from minute 35 income is flat at about §1,450 against E28's §3,500**, because supply binds (one farm skip every 120 s, one demolition skip every 180 s) and the levels bought after the list do not widen it (the pass's smallest change: the advice line names "Another skip" when the floor is empty and the driver idle); two windows fall below the one before (25-30, 45-50). The goal list's own measures are in 1.3, three days in 1.4.

**Not run by the fourth pass**, so the bots on the real rules measure them first: route B (E14's 35 s); live against away (E19: an hour played ≥ 1.25 × the same hour away; the third pass had 1.5) and the away share at minute 60 (S13); the hands-off test from states with little cash (E4, E24); the day-1 list's worth; the minute-by-minute table on one seed (sales, spend, cash, supplied, rank, event, each row adding up); the bench time of six hours away. The bots (`src/engine/salvage/bot.ts`, `scripts/content/yard-bot.ts`, the content engineer's) play the joined rules with the prototype's hands and habits (8.2) and continue the tuning in the content file.

---

## 3. The yard as a map

The ground work's yard: fenced, 64 × 40 m (`yard`), three screens wide at 844 × 390, drawn at 40 pt a metre with a tilt of 0.7. The container wall runs north to south at x 24 (sections 2.4 m thick, `map.walls`) with two gaps (`map.gaps`): the truck's, 4 m wide at y 10 to 14, and the people's, 1.4 m at y 22.6 to 24. The gate is in the east fence; the lane runs east from it. Positions flow one way: content → game.json → the rules and the screen (S23); routes are `map.routes` or `map.detour` (1.15) × the straight distance. The places, from the content's footprints (p4; centre and size in metres; "pad" means the machine standing on it is solid):

| Place (id) | Centre x, y | w × d | Solid |
|---|---|---|---|
| Gate (`gate`) | 63.5, 24 | 1 × 8 | the fence beside it |
| The boss's start (`start`) | 59.5, 23.5 | — | — |
| Public drop-off (`dropoff`) | 58.5, 26.5 | 8 × 2 | no |
| Rubble skip (`rubble`) | 58, 19 | 2.4 × 1.4 | yes |
| Platform scale (`scale`) | 54, 22.5 | 1.5 × 1.5 | no |
| Weighbridge (`weighbridge`) | 50.5, 25.5 | 6 × 3 | no |
| Scale house (`scalehouse`) | 54.5, 19.5 | 3 × 2.5 | yes |
| Bays (`bays`) | 48.5, 19.5 | 8 × 2 | yes |
| {merchant}'s stand (`merchant`) | 48.5, 17.5 | 6 × 2 | no |
| Stripper pad (`stripper`), the bundle (`bundle1`) | 47.5, 22.5; 49.6, 22.5 | 2.5 × 1.5; 1.6 × 1.6 | pad; the bundle |
| Copper and brass stillages (`stillage_cu`, `stillage_br`) | 43, 22; 43, 23.8 | 1.2 × 1.2 each | yes |
| Price board (`board`) | 45, 26.5 | 2 × 0.4 | yes |
| Crucible pad (`crucible`) | 38.5, 23 | 3 × 3 | pad and hood |
| Motor bench pad (`bench`) | 33, 22 | 2.5 × 1.5 | pad |
| Tool rack (`rack`) | 34.5, 16.5 | 2 × 0.8 | yes |
| Portacabin office (`office`), notice board (`noticeboard`) | 30, 16; 30, 18.6 | 6 × 2.5; 1.6 × 0.6 | yes |
| Old stock Z1, Z2, Z3 | 29.5, 27; 16, 31; 12, 12 | 6 × 6; 8 × 8; 10 × 10 | the uncut things |
| The car (`car`) | 19.5, 8 | 2.8 × 1.2 | yes |
| Tipping floor (`floor`) | 50, 33 | 8 × 5 | no |
| Truck park (`park`) | 58.5, 34 | 4 × 7 | no |
| Back field (`backfield`) | 6, 36 | 8 × 6 | yes (padlocked gate) |

**Why there**: the boss starts by the drop-off and its first washer (S10); the scales lie between the drop-off and the stripper on either route; the bays and the merchant's stand stand beside the scales, so a sale's eye path (display → bay chip → flatbed → cash) stays in one view; the tipping floor is within 12 m of the scales (11 m straight, 12.9 m by route) on the truck's line from the weighbridge; the office and the rack sit in the middle, reached by every route; the old stock lies farther out and richer the farther (E1, E28); zone 1 stands clear of the wall and its gaps; nothing overlaps (the build's lint checks every footprint, wall and prop).

**The hero frame** (S19; `map.hero`): x 35.5 to 56.5, y 18 to 27 (21 × 9 m), holding the platform scale, the weighbridge, the stripper pad, the crucible pad, both stillages, the price board and the bays (the scale house at its east edge). At 40 pt a metre and tilt 0.7 it is 840 × 252 pt, and at 844 × 390 it fits between the top bar and the bottom row (265 pt there). Vehicles are drawn at two thirds of true length, so the game's truck fits the 6 m deck. `?view=hero` and `?view=hero-store` show it; a test checks it on footprints (the first store screenshot: copper, a ticket and a pour in one frame).

**The lane, as the rules measure it**: from the gate east, {partnerFarm}'s site at 180 m (`map.lane.farm_m`), its load in view from the gate; {partnerDemolition}'s at 300 m, shut with "Needs a cutting torch"; the **weight-limited bridge** (a padlock, "Weight limit 7.5 t") at 360 m to stage 2's unnamed partners; a barrier at the lane's end. The lane is 6 m wide (`map.laneWidth`) and is drawn at the rule distances (the contract's ruling); skip zones come from `positions.skipZone`. At `truck.v` 9 m/s the farm is 20 s away for the boss and 25 s for the driver (`driverFactor` 0.8, p4).

**Solid**: fences, the wall, buildings, the rack, machines, the crucible and hood, stillages, lock-block walls, the rubble skip, uncut things, the car, the notice board, the bridge's rails, partner sheds; decals (scale plates, pads, the floor, chalk circles) and pieces are not. The truck (`truck.radius`) cannot pass between stillages, into the heaps or through the 1.4 m gap.

**Where purchases arrive** (`shop[].arrive`, `deliver_s`, p4): tools and carriers by van at the rack (6 s); a machine by the machine flatbed's crane onto its pad (10 s, working from its arrival); the truck to its park (6 s); crews out of the office door (4 s); the Night watch as a sheet on the rota board.

**Visible but locked from the first second**: the crucible pad (in the first view at both sizes), zone 2's padlock chips, the car, {partnerFarm}'s load, {partnerDemolition}'s shut gate, the bridge, the back field's sign, the greyed plates, the table's top line.

## 4. The screens

### 4.1 Zones (points; insets read on all four sides; both landscape directions; a taller-than-wide window shows "Turn your phone sideways")

| Row | 844 × 390 (insets L 47, R 47, B 21) | 667 × 375 (insets 0; 16 margins) |
|---|---|---|
| Top bar | 36 | 34 |
| Goal card (one line; tap for three) | 28 | 26 |
| Free world | 237 | 239 |
| Bottom: stick zone left; the one button right | 89 (60 + 21 + 8) | 76 (60 + 16) |
| **Total** | **390** | **375** |

The bottom row is 60 + max(16, the bottom inset) + 8 when there is a bottom inset (built); side margins max(inset, 16).

| Top bar (left to right) | 844 (safe width 750) | 667 (635) |
|---|---|---|
| Cash (15 pt heavy, rolling, the § coin) | 136 | 116 |
| Ladder chip ("26th of 26 · next {rival} 0.39 t"; shorter forms when it does not fit; tap: the table) | 394 | 326 |
| Carry chip (on foot "0.0 / 25.0 kg"; driving a skip pictogram and the mass alone, "1,020 kg") | 104 | 104 |
| Clipboard | 44 | 44 |
| Gaps | 3 × 24 = 72 | 3 × 15 = 45 |
| **Total** | **750** | **635** |

The carry chip is 104 pt, taken from the ladder chip (the lead's ruling 2). No spare slot; nothing from the market in the bar. Bar text is sized by hand from min(fontScale, 1.3), `allowFontScaling={false}`, in rows that add up (`hud/metrics.ts hudLayout`). The goal card (400 pt at 844, 340 at 667) is one 12 pt line with the goal's meter at its right and a thin share bar; a tap opens three lines (goal, the next goal, the advice line; 84 pt), closed after 6 s; above font scale 1.15 a weigh-in's lesson shows as its second line for 6 s (4.4). The one button is a 60 pt hi-vis disc: "Open" at a place, "Step out" while driving, blank and dimmed elsewhere, ignored while the stick is held. Short toasts ("Load full", a refusal) show for 1.8 s and only while no card is open (a card prints its own refusal).

### 4.2 World labels

Plates of 11 pt on paper chips: place names on first sight; padlock chips over locked things and pads (padlock, the condition, the exact price where there is one); bay chips (4.4); skip labels (2.7); the chevron (hi-vis, over the goal's target; an edge arrow when it is off screen). Every place label is at most 18 characters.

### 4.3 Overlays

The mode's own views registered with `useOverlay`, one at a time (`overlays/cardStack.ts openCard(ref)`), closed by the scrim (it starts under the top bar, so cash stays readable) or Android back; never the kit Sheet or a `Modal`; the rules keep running beneath (2.8). Every card is `CardData` from `cardOf` (re-read every 500 ms and after every press); the screen formats numbers and nothing else; a refusal returns as a note under its row; opening a card calls `noteSeen`.
- **Right panel**: `W ≥ 736 ? min(520, floor(0.58 W)) : floor(0.62 W)`, so 489 pt at 844 and 413 at 667, from the bar to the bottom inset, the place dimmed at the left. Title 15 pt; rows 44 pt (name 13 pt, effect line 11 pt of at most 38 characters); at font scale 1.3 a row's name and effect line may each take two lines and the row grows.
- **Buttons** (the lead's ruling 3): at least 96 × 36, growing with their text to at most 136; the text is a verb and a price ("Buy §3,148", "Hire §750", "Level up §420", "Sell §1,115"); what a level changes ("Level 3 → 4", "+1.2 t an hour") stands in the row's effect line, never on the button.
- **Wide card** (the process board): the safe width less 12 pt a side (726 at 844, 611 at 667), bar to bottom inset; the office's tabs sit in its title row.
- **Centred card** (away card, rung sign, confirmations): at most 520 × 300.

Cards are opened by `CardRef`: `office {tab: rota | partners | processBoard}`, `machine`, `rack`, `board {focus}` (a bay opens the board at its row), `skip`, `deal`, `table`, `away`, `rung`, `clipboard`, `settings`, `help`; a place routes by content (`map.places.{id}.card`): the scale, weighbridge, rubble skip, back field and merchant's stand open nothing, the park opens the truck's row, the drop-off and the floor their own cards, the bays, stillages and scale house the price board.

| Overlay | Kind | Prints |
|---|---|---|
| Tool rack | panel | per tool and carrier: name, effect ("Breaks cast iron; cuts sheet faster", "Moves a washer in one trip"), Owned or a Buy button, or a padlock and its condition |
| Office: Rota | panel tab | "Site licence · metal dealer"; per member "{name} · level {n}", rate in the yard's units ("Carries 1.2 t an hour", E13d), Hire or Level up, or "Not the bottleneck now · +{rate} an hour", or "Opens at {t} supplied"; the driver's "Kept for the next load: §x"; the Night watch "Away cap 4 h → 6 h" |
| Office: Partners | panel tab | per partner its business card, the skips in rotation and their state ("Filling", "Full · ready to hook", "On the truck"), "Another skip" with its Level up button; the supply deal from rung 2 |
| Office: Process board | wide card | 4.5 |
| Machine | panel | before: what it does, in → out, rate, Buy; after: hopper ("Hopper · {grade} × {n} · {kg}"), tray, status ("Working", "Tray full", "Waiting for {grade}"), rate, "Level on the process board"; the stripper pad shows both strippers, the hand stripper first ("Came with the yard", "Turns only while you stand at it"); crucible: recipe, Take from bays (On / Off), "{a} / {b}", "Pours in {t}", "Ready to pour · it waits for you" or "Heating", the heel |
| Price board; Bay | panel | 4.4 |
| Skip | panel | 2.7 |
| Supply deal | centred | terms, Sign, Not now; then days left, reserve, trust, last delivery, "A short day costs nothing. Trust falls a little." |
| Industry table | panel | 2.11 |
| Away card; Rung sign | centred | 4.4; the crane hanging "{homeYard} · {t} supplied", what it opens |
| Clipboard | panel | goals (done ticked), places visited (each opens its card), ticket history (50), Settings |
| Settings and Help | panel | Sound, Music, Haptics; Help (every lesson in full, a glossary, the shortened-time line); the fictional line; privacy; version; "Start the yard again" with a confirming card |

**As built** (overlays-a): the process board's plates are drawn from views in the art kit's colours while the art director's plate function cannot hold 4.5's words; the lead's ruling of 15:25 is that plates, rival plates, business cards and the merchant's mark are drawn live from `ui.draw.ts` functions (section 11). Business cards are text rows for the same reason.

### 4.4 Tickets, the bay chip, the board, the away card

**The eye path of a sale**: scale display → bay chip → flatbed → cash counter, all in the hero frame and the top bar.
1. **Weigh-in ticket**: rises at the scale (its world point 2.2 m up), clamped inside the free world, ticket paper with its stamp by kind, 280 pt wide at 844 and 260 at 667, at most 150 pt tall: a hi-vis header ("{homeYard} · No. {n}"); grade rows (short name, kg, "§{p}/kg") and "+ {n} more"; the muted "today's value §{x}"; the 11 pt legal line; at most one lesson line. **Above font scale 1.15** (the lead's ruling 1): at most two grade rows and "+ n more", and no lesson on the ticket (it shows as the goal card's second line for 6 s); a row that does not fit one line prints on two (name; mass and price), and only as many rows as keep the ticket within 150 pt are shown, so at 667 and 1.3 a weigh-in shows one two-line row and "+ n more" (measured by the hud). The ticket shows 4.2 s; specified, it then folds and the value slides to the bay chip (as built the ticket fades and world-b's value slide starts from `weighInAnchor`).
2. **Bay chip** (at the bay by the flatbed's stand): "{grade} {kg} · today §{x}" in the same muted grey, the short name, drawn on two lines split at " · " (side-by-side bays would overlap on one); "held", the day word, "For the foundry {a} / {b}", "For the crucible {a} / {b}" and "Set aside {kg} · §{x}" as separate chips; an empty bay that is not held shows none. When the flatbed loads, the grade's name slides into its bed (the money arrives on the ticket).
3. **Collection ticket**: at the flatbed's cab (2.6 m up), same paper, amounts in ink, "Paid §{x}" bold, the two-line legal line; a coin arcs to the cash counter; moved aside when both tickets clamp to one edge. A tap opens the history.
4. Once crews work, a crew weigh-in is a one-line chip at the scale ("Yard hand · 58.2 kg in") and a collection without the boss's weigh-in (`withBoss` false) a one-line chip at the cab ("Lot sold · §29.00"), each for 2.6 s; one ticket of each kind at a time.
5. In the first five minutes lessons show only on the value jumps (copper, brass, the converter); others wait for the grade's next weigh-in (paced by the rules, 2.14).
6. The skip weigh-in, the drop-off slip and the deal delivery (2.2) print in the world and the history; as built the hud does not draw them yet (section 11).

**The price board** (panel): "Market day {date} (UTC) · next prices in {t}"; per grade seen a two-line row of 56 pt: pictogram, name, today's price, day word, Hold; five bars with the usual-price tick, the bay's stock, "Sell §{x}". Its first opening points at a day word ("{grade}: a low day. Holding is free.") and shows the fictional line.

**The away card** (centred): "Away {t} (cap {c})"; up to five grade lines ("{grade} {kg} · §{x}") and "+ {n} more"; "{t} supplied · §{x} (already in your account)"; "{n} loads fetched"; "{n} deal deliveries"; "You passed {rival}."; OK. With little to show it says what would have earned more ("A cutter keeps the yard working while you are away (Office)"). No ad button in stage 1.

### 4.5 The process board (wide card)

Title 15 pt; four rows of enamel plates (2.5), 132 × 60 at 844 and 120 × 60 at 667: a name of up to two lines of 12 characters (12 pt) and a state line (11 pt: "Owned · level 2", "§{price}", "Level {n} · §{price}", a padlock), joined by riveted bars of 24 pt (20 at 667). 4 × 60 + 3 × 12 + a 32 pt title = 308 pt, inside 333 (844) and 325 (667). Row 4's five greyed plates are 108 pt (112 at 667) with no state line, so a name may take three lines of 11 characters ("Platinum / group and / iridium"). A lit plate opens its machine card; a greyed one shows only its padlock.

### 4.6 Text limits (S20 and the lead's rulings of 15:55, checked by `scripts/content/yard/check.ts --all` at 667 pt wide and font scale 1.3)

Goal text ≤ 30 characters; a panel's effect line ≤ 38; a grade's name ≤ 18, its short name ≤ 15 (tickets, chips, away lines); a place label ≤ 18; a rival's chip name ≤ 14; a ticket ≤ three grade rows and "+ n more" (two above font scale 1.15, with no lesson), one lesson line ≤ 48, total height ≤ 150 pt; board rows two lines; buttons 96 to 136 pt wide; the carry chip 104 pt; the legal line 11 pt; nothing under 11 pt. No text promises a future update; locked things show a padlock and a plain condition. The check also lists, as layout notes, fixed parts that cannot hold their widest text at 1.3.

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

### 5.2 Labels and lines (`src/ui/salvage/strings.ts`, keys as `textKeys.ts`; names of things from game.json)

The strings engineer's file holds the words; this section describes them, and the file is right where a word has moved since. Holes are typed arguments the caller passes and the facade's formatters fill (money prints its own §; `{grade|short}` prints a grade's short name).
- **HUD**: "{rank} of {n} · next {rival} {t}" (shorter: "{rank} · next {rival}", "{rank} · {t} to next"; after a pass "25th of 26 · passed {rival}"); "{a} / {b} kg"; driving "{kg}" after the skip pictogram; "Load full"; "Open"; "Step out"; "Turn your phone sideways".
- **Places** (≤ 18): Tool rack, Office, Scale house, Platform scale, Weighbridge, Notice board, Public drop-off, Rubble skip, Tipping floor, Truck park, Stripper pad, Motor bench, Crucible, Old stock, Back field, Bays, Price board, Stillages, {merchant}, {homeLane}, Bridge (its limit on a chip).
- **Chips**: "{grade} {kg} · today {x}", "held", "low day", "high day", "For the foundry {a} / {b}", "For the crucible {a} / {b}", "Set aside {kg} · {x}", "{role} · {kg} in", "Lot sold · {x}", "certified empty", "Weight limit 7.5 t".
- **Buttons**: "Buy {x}", "Hire {x}", "Level up {x}", "Sell {x}", "Hold", "Sign", "Not now", "OK".
- **Card lines**: "Owned", "Came with the yard", "On its way", "Level {n}", "Level {n} → {m}", "+{rate} an hour", "Not the bottleneck now · +{rate} an hour", "Kept for the next load: {x}", "Another skip · {x}", "Skips in rotation: {n}", "Full · ready to hook", "Carries {rate} an hour", "Cuts {rate} an hour", "Opens at {t} supplied", "Take from bays", "Pours in {t}", "Ready to pour · it waits for you", "Pour the heel as a short ingot?", "Working", "Tray full", "Waiting for {grade}", "Heating", "Cooling"; items "Sack truck", "Flat trolley", "Sledge and grinder", "Cutting torch", "Hook-lift truck", "Powered stripper", "Motor bench", "Crucible", "Brass recipe", "Aluminium recipe", "Night watch"; effects "Moves a washer in one trip", "Moves a radiator in one trip", "Breaks cast iron; cuts sheet faster", "Cuts beams, tanks and the car", "Fetches partners’ loads", "Strips heavy cable to copper", "Takes motors apart: copper, steel, alu", "Melts brass solids into ingots", "Melts cast aluminium into ingots", "A longer away cap", "Carries to the scale and the hoppers", "Cuts what waits at the drop-off", "Fetches full loads with the truck".
- **Lines**: "Every load checked. Every seller identified. Payment by transfer only." (the portal) · "The yard now earns while you are away." · "Back field · the works are being built here" · "All prices, exchanges and shares are fictional and have no real-world value. Nothing in this game is financial advice." (the board's first opening, the table, Help) · "Rival firms (simulated)" · "Building costs and times are shortened so the business grows in days, not decades; metal prices keep their true proportions." (Help) · "End-of-life car from {partnerDemolition} · depolluted · treatment record ref. {ref}".
- **Tickets**: "{homeYard} · No. {n}", "{p}/kg", "today’s value {x}", "Weighed into bays · not yet sold", "{thing} · signed in · gate drop-off", "{partner} · {load}", "Gross {a} · Tare {b} · Net {c}", "Seller ID checked · paid by transfer", "{homeYard} · ticket {n}", "Paid {x}", "Lot sold to {merchant}", "weighed out · paid by transfer", "{foundry} · {kg} cast iron · {x}", "+ {n} more", "from car ref. {ref}".
- **The advice line**: "Next: {item} · {x}", "{item} level {n} · {x}".

### 5.3 Goals (≤ 30 characters; 1.3's order)

Take the washer apart · Weigh it on the scale · Strip the cable · Weigh the copper · Buy the sack truck · Take a washer apart · Hire a yard hand · Work the drop-off · Buy the sledge and grinder · Break up the radiators · Buy the flat trolley · Buy the hook-lift truck · Fetch the farm’s trial load · Supply {t} ({r} metals) · Sign the foundry deal (optional) · Buy the cutting torch · Cut up the car · Fetch the demolition load · Hire a cutter · Buy the powered stripper · Buy the crucible · Charge the crucible · Pour your first ingot · Buy the motor bench · Break a motor on the bench · Hire a driver · Buy next: {item} / Level up: {item} (repeating; the advice line's purchase) · Supply {t} ({r} metals).
Day-1 list, after the fixed list: Buy the Night watch (after the first time away) · Hire a second yard hand · Buy the aluminium recipe · Hire a second cutter · Finish the foundry deal (after signing) · Pass {rival} (the eighth) · Visit the back field. As built, `goals.json` places "Hire a cutter" before "Supply {t}" (1.3, section 11).

### 5.4 Refusals (key → text)

`cash` "Not enough cash: {x} more" · `earmark` "{x} is kept for the load on its way" · `owned` "Owned" · `notOwned` "Buy it first" · `rung` "Opens at {t} supplied" · `needsItem` "Opens with: {item}" (E25) · `ceiling` "Capacity {c} t/h · grows at {t}" · `tool2` "Needs a sledgehammer" · `tool3` "Needs a cutting torch" · `tooHeavy` "Too heavy to lift: {kg}" · `topLevel` "Top level" · `noPlace` "No free place on the rota" · `filling` "Filling · full in {t}" · `loadCash` "Needs {x} more for this load" · `floor` "Tipping floor needs {kg} free" · `weighFirst` "Weigh it in first" · `heatRunning` "Wait for the heat to pour" · `noTruck` "Opens with the hook-lift truck" · `noTorch` "Opens with the cutting torch" · `stopFirst` "Stop the truck first" · `priceUpdated` "Price updated: {a} → {b}" · `confirmHeel` (the heel's question) · `nothing` "This would change nothing" (an act with nothing to act on; never a level, E19) · `notBuilt` "Not available" (stubs only).

### 5.5 Lessons (one line ≤ 48 characters on a grade's first weigh-in ticket; the full sentence in Help and the history, `text.json`; no fixed multiples, S5)

| Grade | Ticket line |
|---|---|
| Light iron | Light iron: thin steel from appliances. |
| (the stainless drum) | Stainless drum: sold here with light iron. |
| Electric motor | A whole motor: copper inside steel. |
| Heavy, thin cable | Cable is paid on the copper it yields. |
| Bare bright copper | Bare bright pays {n} times light iron today. ({n} = round(p_bb(D) / p_li(D)), filled by the rules) |
| No.2 copper | No.2: unalloyed copper, not clean. |
| Brass solids | Brass is copper and zinc. |
| Alloy wheels | Clean alloy wheels: tyres and weights off. |
| Cast aluminium | Motor end caps are cast aluminium. |
| Cast iron | Cast iron breaks. Foundries remelt it. |
| HMS 80:20 | HMS: thick steel cut to furnace size. |
| Steel, unprepared | Uncut steel pays less. Cut to size, it is HMS. |
| Car body | Car bodies go to a shredder. |
| Brass ingot | An ingot pays more than the scrap it came from. |
| Dross (both) | Dross: the skimmed crust, still holding metal. |
| Alu alloy ingot | Cast aluminium remelted as alloy ingot. |
| Converter | From depolluted car ref. {ref}. Paid on assay. |

### 5.6 Voice and banned words

The master's `weighbridge-plain`: short plain sentences in the trade's words; no puns, no exclamation marks, no green claims, no future promises. `check.ts` fails any player text containing: bet, stake, odds, invest, tips, returns, jackpot, win, prizes, ticker, share price, order book, order, shift, freight, cargo, contract, salvage, haul, ore, fleet, logistics, eco, green, save the planet, learn to trade, District, any withdrawn register name, and any name of the four games (the bundle's string denylist). "Night watch", "rota", "supply deal" and "licensed waste carrier" are the words.

### 5.7 Where content lives

Every number in `src/config/salvage.content.ts` (S23), the map included; player words in `src/ui/salvage/strings.ts` (interface) and `scripts/content/yard/text.json` (grades `{name, short, long}`, objects `{name, long}`, lessons `{ticket key, help sentence}`, partners `{card, line}`, a glossary of 31 entries), copied into game.json by the build; goal structure in `scripts/content/yard/goals.json` (`{goals, dayOne, teach}`: ids, targets, done conditions, text keys, the hints' timings, no words); invented names in the register; `scripts/content/build-yard.py` writes `games/scrap-yard/game.json` (never edited by hand; `--check` shows it is current).

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

### 6.2 Atlas budget and draw order (as built; the lead's rulings of 15:00 and 15:25)

Four sheets of at most 2048 × 2048 px: **A** (people and things) packs at density 2.75, **B** (plant and vehicles) at 2.5 (accepted by the lead; the art judge looks at it at 3× phone size; nothing is shrunk to win density), **G** (the ground, 1024 × 1024) at 3, and the world's small shadow sheet **S** at 1 (flat shapes drawn up; shadows are the world's, never baked into a sprite, so a mirrored sprite never throws its shadow west). Statics away from the hero frame are baked small and drawn up (yard-style 12); the flatbed bakes at 0.75 or better (the lead's ruling: a main sight of the first minute); one crew body is baked, its vest tinted per role (a second body is drawn but not baked, for room). **Baked**: everything that stands or walks. **Drawn live**: the effects that animate (sparks, sledge dust, the torch's flame, piece and coin arcs, the value slide, the work ring's fill, the pour's glow), by world-b from the art kit's functions in `marks.draw.ts` and `ui.draw.ts`; process-board plates, rival plates, business cards and the merchant's mark in their overlays from `ui.draw.ts`.

**Draw order** (`notes/lead-world.md`): the ground and decals first in one draw, the shadows in one, then everything depth-sorted (people, things, pieces, machines, stock, vehicles, buildings) sorted by footprint and drawn in RUNS of the same sheet (a mirrored run is its own draw), at most twelve atlas draws a frame; if a real frame needs more, the sprites that alternate move to the other sheet. At most 40 actors and 300 sprites. The yard view starts the bake (`useYard.ts startYardBake()`, sliced, on a CPU raster surface, surfaces disposed after the copy) behind the loading animation's calm loop (`atlasProgress()`); actors are drawn from the people artist's `personLayers` and `truckLayers`.

### 6.3 Icon

The style sheet's candidates (a crucible in tongs pouring into a copper ingot with a bare bright bundle; a gloved hand with copper against a ticket; the display printing a ticket over copper), on hi-vis yellow or daylight blue, judged at 60 px beside the four games' icons before anything is built on one. Never a lone gold bar or a truck.

### 6.4 The loading animation (S22; `src/ui/salvage/Loading.tsx` and `src/ui/salvage/loading/`, the loading engineer's; `art/loading.draw.ts` is now a re-export)

One plate per word of the title (`cfg.app.displayName` split on spaces, never a literal; at most four plates), 0.6 s each; three words give 3.6 s; a tap skips it from the second launch (a seen-once flag). One shared clock drives `loadingPose(t)` on the UI thread (`loading/timeline.ts`), so the curtain takes over without a jump. As built:

| t (s) | Frame |
|---|---|
| 0.0 to 0.4 | Daylight sky and the hazy far yard fade in from the splash colour; the gantry crane's trolley runs in with its electromagnet and the first plate; the display reads 0. |
| 0.4 to 2.2 | Three plates, the words cut through the steel, each 0.6 s: the trolley moves over its place (0.12 s), lowers it (0.27 s), it lands with a 2 pt shake (0.1 s), the magnet lets go and rises (0.11 s); later plates fade in under the raised magnet; the display counts each plate's kilograms in 20 kg steps (100 + 84 a letter: 1,300 kg for the title). |
| 2.2 to 2.7 | The trolley runs back to its stand at the west and parks (it stays in view for the calm loop). |
| 2.2 to 2.8 | The crucible under its hood tips 95° (0.2 s) and pours a glowing stream along a launder into five cavities beneath the title (0.4 s). |
| 2.8 to 3.6 | The bars cool from orange to brass in 0.8 s and glint; the display's printer feeds out a ticket (the first 0.4 s); from 3.2 the picture parts like two gate leaves onto the yard (0.4 s; with reduced motion, a fade). |

If atlases still bake when the bar has cooled, a calm loop holds (the parked magnet swaying, the display's stable lamp ticking while its reading stays the ticket's, the furnace breathing, the ingots glinting every 2 s), never a frozen frame; the gate parts when the bakes finish.

---

## 7. Sound

A new pack in `games/scrap-yard/assets/sfx` (`soundPack: null`; 98 effect files and the music, 2.87 MB of a 3.0 MB budget), keys in `src/services/fx/catalog.salvage.ts` (written by `scripts/audio/yard/render_yard.py --catalog`), events mapped to cues in `src/modes/salvage/soundKeys.ts` (`salvageSoundsFor(event)`), played only through `fx.play` by the hud's event pump (`hud/pump.ts`, the one listener on `modeEvents`). Pitched sounds are in E major. Haptics: light on a finished piece, medium on a collection and a purchase, success on a rung, light on a refusal; none when the event is not the player's own doing (`by` not the boss, an away report).

| Keys | Trigger (2.14's events) |
|---|---|
| `step_concrete`, `step_gravel`, `step_asphalt` | a foot contact by ground (world-a's `yardSound.step`) |
| `cut_spanner`, `cut_sledge`, `cut_grinder`, `cut_torch` (segments) | `workStart` to `workStop` or `thingGone`, the newest tool |
| `piece_steel`, `piece_cast`, `piece_alu`, `piece_copper`, `piece_brass`, `thud_waste` | `pieceOff` by family; to waste |
| `pickup`, `swap`, `load_full`, `feed` | the events of those names |
| `scale_beeps`, `scale_print` (420 ms later), `slip` | `weighIn`, `bridgeWeighIn`, `dropOffSlip` |
| `flatbed_arrive`, `flatbed_load`, `coin`, `coin_big` | `roundBack`, `roundLoad`; `collected` (big with copper, a grade's first lot, or an away report) |
| `lesson`, `deal_stamp`, `goal_tick` | `lesson`, `dealDelivered`, a goal done |
| `ui_open`, `ui_close`, `buy`, `denied` | overlays, `owned`, `refused` |
| `van`, `set_down`, `crane_set`, `truck_reverse`, `door`, `crew_hello` | `arrival` by kind (`van`, `dropoff`, `machineFlatbed`, `truck`, `crew`); `hired` (600 ms later) |
| `stripper_hand`, `stripper_power`, `bench_knock` (segments) | `machineState` working |
| `furnace_roar` (a ladder of heat), `ready_chime`, `pour_glug`, `cool_ticks` (1.9 s later) | `heatStart`, `readyToPour`, `pour` |
| `truck_diesel` (a ladder: idle, driving, pulling), `hook_swap`, `skip_tip` | driving (world-a's `yardSound.truck`), `hook`, `tip` |
| `chip_slide`, `rung_sign` | `passed`, `rung` |
| `load_crane`, `load_clank` (per plate), `load_beeps`, `load_pour`, `load_cool`, `load_loop`, `gate_open` | the loading animation |
| `amb_yard` | always while live: birds, distant traffic, a far reverse beeper |

**Segments, not loops** (as built): the shared fx service plays one-shots and one music player, so every "loop" is a segment with faded ends that the screen plays again every `SALVAGE_SEGMENT_MS` while its thing lasts: cut_spanner 500 ms, cut_sledge 700, cut_grinder 750, cut_torch 1,100, stripper_hand 750, stripper_power 950, bench_knock 600, furnace_roar 1,850, truck_diesel 930, load_loop 1,820, amb_yard 7,400. "Pitch by speed" is the diesel's three-file ladder (`step`); the burner likewise. Sound stops when the app is not landscape and in front.

**Ducking** (`SALVAGE_DUCK`; the shared player sets a level at once, so the screen steps it): under a pour to 0.35 for 2.6 s, under a ticket to 0.6 for 1.4 s, under the rung sign to 0.4 for 2.6 s.

Music: "yard radio" (`music_main`), an original loop of 34 bars at 92 bpm in E major (88.7 s): clean electric guitar, fingered bass and the yard's own metal hits as a soft kit, its two variants crossfaded inside the one file; no melody shared with the four games. Nobody has listened yet: a person hears it on an iPhone speaker before it counts as done, and the cross-compare of single struck sounds against the first two games is the listener's to judge (section 11).

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

## 9. Work packages as they ran (S23; the lead's `BUILD.md`, which is right where the two differ)

**Rules of the folder** (BUILD.md): every file has one owner, named once below; a change to another's file is one line in `requests.md` and a local stand-in; numbers live only in the content file and a screen formats them with the facade's formatters; positions flow one way; names by register id; the contract (types, the facade, events, text keys, refusal keys) changes only through the rules lead, announced with the packages that read the changed part; everyone looks at what they build at 844 × 390, 667 × 375 and font scale 1.3.

**Hour 0, then version 2**: the types, the facade with stub bodies (`notBuilt`), the string keys and four frozen states came first. Three engineers attacked them; the contract's version 2 (16:05) brought yard seconds, the derived queue, money once, the state of 2.13, `textKeys.ts` (from then the strings engineer's) and `refusals.ts` (the rules lead's), and a fifth frozen state: `?preset=fresh`, `m5`, `m15`, `m30`, `back`, each with its `FIXTURE_EVENTS`. At 16:19 the seam: `src/engine/salvage.ts` holds only re-exports and each function lives in its owner's module.

| Label | Owns (every file once) | Needs first | Shows it works |
|---|---|---|---|
| `rules-sim` (the rules lead: what changes state) | `src/engine/salvage/{types,refusals,positions,create,tick,away,rate,actions,notBuilt}.ts` and the simulation modules it adds (`clock, hand, things, scales, bays, round, machines, crucible, crew, partners, truck, deal`), a test beside each, `contract.test.ts`; `src/engine/salvage.ts`; `src/engine/salvageMode.ts` and its test; `src/config/schema.salvage.ts`; `src/engine/fixtures/salvage.ts`; `src/modes/salvage/actions.ts` | contract v2; 2.12 to 2.16 | `NODE_OPTIONS=--max-old-space-size=3000 npx vitest run src/engine/salvage src/engine/salvageMode.test.ts` |
| `rules-book` (what only reads state) | `src/engine/salvage/{money,board,ladder,rivals,goals,advice,cards,frame,tickets,save}.ts` and a test beside each | contract v2; 2.10, 2.11, 2.13's derived values | the same command |
| `content` | `src/config/salvage.content.ts`; `scripts/content/build-yard.py`; `games/scrap-yard/game.json` (generated); next `src/engine/salvage/bot.ts`, `bot.test.ts`, `scripts/content/yard-bot.ts` | content4.json; the joined rules for the bots | `python3 scripts/content/build-yard.py --check`; then `npx tsx scripts/content/yard-bot.ts --seeds 15 --routes 2 --report` |
| `world-a` (everything that moves) | `src/ui/salvage/world/{frameLoop,camera,collide,stick,yard,useRulesTable,useYard,actors}.ts`, `YardView.tsx`, `AtlasView.tsx`, `world.test.ts`, `input.test.ts` | the types; the art kit | `npx vitest run src/ui/salvage/world`; `npm run lint:worklets`; screenshots at both sizes |
| `world-b` (labels, effects, the hero frame) | `src/ui/salvage/world/{labels,chevron,heroFrame,effects}.ts(x)`, `WorldLayer.tsx` and their tests | `FrameTable`; the footprints | `?view=hero`; `?preset=m5&fxdemo=1` |
| `hud` (bars, tickets, the shell, the event pump) | `src/ui/salvage/{SalvageShell.tsx,uiState.ts,palette.ts}`; `src/ui/salvage/hud/*` | `TopBar`, `Ticket`, text keys, `soundKeys.ts` | `npx vitest run src/ui/salvage/hud`; `?hudDemo=1` at both sizes and 1.3 |
| `overlays-a` (frames and the yard's cards) | `src/ui/salvage/overlays/{OverlayHost,Panel,WideCard,CentredCard,parts}.tsx`, `cardStack.ts`, `layout.ts`, `sample.ts` (stand-in), `devOpen(.web).ts`, `overlays.test.ts`; `overlays/{ToolRack,Office,Rota,Partners,ProcessBoard,Machine,Crucible}.tsx` | `CardData`, `CardRef` | `npx vitest run src/ui/salvage/overlays`; `?card=rack` and the rest at both sizes and 1.3 |
| `overlays-b` (the market's cards and the rest) | `src/ui/salvage/overlays/{PriceBoard,Bay,Skip,SupplyDeal,IndustryTable,AwayCard,RungSign,Clipboard,Settings,Help}.tsx`; `src/ui/salvage/dev/*` | `CardData`, `PriceBoard`, `IndustryTable`, `AwayCard` | the same |
| `hints` | `scripts/content/yard/goals.json`; `src/ui/salvage/hints/*` | `nextGoal`, `goalList`; the goals' grammar | `npx vitest run src/ui/salvage/hints`; `?preset=fresh&autoplay=opening&route=1` and `route=2` |
| `strings` | `src/ui/salvage/strings.ts`; `src/engine/salvage/textKeys.ts`; `scripts/content/yard/{text.json,check.ts,check.test.ts}` | the register (read only) | `npx tsx scripts/content/yard/check.ts --all` |
| `wiring` | `games/scrap-yard/store/*`; `games/scrap-yard/{icon,adaptive-icon,splash}.png`; `scripts/content/yard-store.json`; `scripts/art/icons/yard.build.ts`; `src/modes/salvage/{index.tsx,presets.ts,presets.web.ts,devViews.ts,devViews.web.ts}`; `src/modes/entries.test.ts`; `scripts/lib/*`; `src/ui/hints/targets.ts`; every shared file | hour 0 | `npm run check:bundle`; `npm run typecheck`; `npx tsx scripts/validate.ts scrap-yard` |
| `art-plant`, `art-people`, `art-things` | `src/ui/salvage/art/*` as they divided it (`loading.draw.ts` re-exports the loading package); `src/ui/salvage/world/{atlas,draw,ground}.ts`; `scripts/art/yard-*.ts`; `scripts/art/scrap-yard-placeholder.py`; `docs/design/yard-style.md` | section 6; the frame's sprite ids (manifest entry ids, one table in content) | `npx vitest run src/ui/salvage/art scripts/art`; `npx tsx scripts/art/yard-sheets.ts <dir> budget`; the 60 px icon board |
| `sound` | `src/services/fx/catalog.salvage.ts` and its test; `src/modes/salvage/soundKeys.ts` and its test; `scripts/audio/yard/*`; `games/scrap-yard/assets/sfx/*` | the event list | `python3 scripts/audio/yard/render_yard.py --check`; `npx vitest run src/services/fx src/modes/salvage/soundKeys.test.ts` |
| `loading` | `src/ui/salvage/Loading.tsx`; `src/ui/salvage/loading/*` | 6.4; `atlasProgress()` | `npx vitest run src/ui/salvage/loading`; `?view=loading` at 0.3, 1.2, 2.4, 3.2 s and in the calm loop |
| `names` | `scripts/content/yard/{names,crew-names,name-filter,handle-words,company-words}.json`, `check-words.py`, `build-ids.py` | — | `python3 -I scripts/content/yard/build-ids.py --check` |

**Order as it ran** (25 November): the artists from 14:15; the lead's world rulings at 15:00 and 15:25; the contract and the frozen states, everyone building against them on the stub engine; E25 to E27 at 15:35, E28 and E29 at 15:45; the fourth numbers pass 15:36 to 15:58; the layout rulings at 15:55; the contract's version 2 at 16:05; the seam at 16:19; the rules engineers from 16:20 on version 2's sections 2.1 to 2.16; the real content in game.json at 16:20. Next: the simulation and the book joined in the facade and the bots on the joined rules; the integrator joins world, bars, overlays, hints and sounds; three people play (8.5); an engineer attacks the rules; a judge looks at the screens; one pass of fixes; then tuning, gates for all five games, the merge.

---

## 10. What this stage leaves out, and the hooks stage 2 needs

**Left out** (ruling 5, master 9): the baler, magnet crane, forklift and larger carriers; the partners across the bridge; further roles; delivered lots, the Trade Book; stainless, lead, bronze and later materials (greyed plates); purchases and ads (stubs); exchanges, dealers, transport; dusk and night; real players.

**Must not be precluded**: grades, things, machines, partners, crew roles and plates are content (stainless, lead ingot and bronze are data); the map's extent is content (the back field opens west); the engine takes a list of sites, each with its own agents and queue, and R(assets) feeds stage 5's server bound; the board's families and step length are content and `sell(grade, shown)` survives 10-minute steps; the truck's skip and a partner's skips are lists; the foreman takes a site id; the round's buyer is content (dealers replace it); table rows are `{id, name, tonnes(d), simulated}` so followed players can be pinned; the save reconciles forward and positions are never rules.

---

## 11. Decisions and changes since version 2

In date order (25 November). "Behaviour" marks a change to what the rules do, for the rules engineers; each is marked **[v3]** in section 2.

1. 15:00, the lead (`notes/lead-world.md`): draw order in runs of the same sheet, at most twelve atlas draws a frame; sheet B at 2.5; the yard view starts the bake; shadows are the world's; crew are trips. → 6.2.
2. 15:25, the lead: animated effects drawn live; plates, rival plates, business cards and the merchant's mark drawn live from `ui.draw.ts`; the flatbed baked at 0.75 or better; the car carries no battery. → 2.4, 6.2.
3. 15:35, E25 (behaviour): no shop rule beyond cash and one gate content names (a rung or an item owned, refusal `needsItem`); crew, machine and partner levels open at rung 2 (`level` refuses `rung` before). → 2.6, 2.11, 2.15 (`buy`, `level`).
4. 15:35, E26 (behaviour): L real skips per partner, each full `fill_s` after it was hooked; the one full longest is hooked; every skip labelled and shown. → 2.6, 2.7, 2.12 (driver, skips).
5. 15:35, E27 (behaviour): rivals' d counts market days from the player's start (`clock.startDay`). → 2.11.
6. 15:45, E28: the hour's income aim and the goal order's mechanisms; E29 (behaviour): the reserve is a load full now or within 60 s; R15 to R19 accepted (levels to 20, the advice line's binding rule, trial loads at fixed prices, whole things sold whole: lots never take part of a whole unit). → 1.3, 2.3 via 2.12 (merchant), 2.10, 2.11.
7. 15:36 to 15:58, the fourth numbers pass: the goal order, prices, zones, carriers (frame 25 kg, trolley 150), loads, fill times, rung 2 at 2 t and rung 3 at 23 t, the level floor (behaviour of `levelPrice`: max of the tau rule and §1,800 × 1.25^(L−1)), rivals' starting tonnes, the map's footprints. → 1.2 to 1.4, 2.4, 2.7, 2.11, 2.18, 3.
8. 15:55, the lead's layout rulings: tickets above font scale 1.15, the carry chip at 104 pt, buttons as verb and price, the goal lines "Buy next: {item}" and "Level up: {item}" (behaviour of the repeating goal's text), short grade names on tickets and chips. → 2.10, 4.1, 4.3, 4.4, 4.6, 5.
9. 16:05, the contract's version 2 (behaviour where version 2 of this document said otherwise or nothing): yard seconds `salvage.t` for every dated field and every action's clock; the queue derived, never saved; time away paid once inside the state (`earnings` 0, one away card, `beenAway`, `epoch`); purchases on their way (`arriving`); claims; `seen` written only by `noteSeen`; the cutter's sight decided once when he starts (`cut.whole`); each Sell its own `aside` entry; `declineDeal` re-offers the next day; the refusal keys `earmark`, `notOwned`, `stopFirst`, and `nothing` for an act with nothing to act on. → 2.12 to 2.16.
10. 16:08 to 16:20, the hints' `goals.json` shape (by id, `via`, `after`, `repeat`, the done grammar) and the real content file with its build. → 2.10, 2.17, 5.7.
11. The lead's answers to this document's open questions: about 13,000 words; draw order in runs; `reach.sight` about 10 m; rounding kept in `scaleRound_g`; the driver takes the skip full longest; floor room by mass; machine and crew levels linear; the Night watch after the first time away; one repeating goal after the fixed list. → 2.6, 2.7, 2.10, 2.12, 2.13.
12. The builders' notes: the strings engineer's words (5.2 to 5.5: short names, "Sledge and grinder", "For the foundry", shorter refusals); the hud's and overlays' measured sizes (4.1, 4.3, 4.4); sound as segments with a ducking table (7); the loading timeline as built (6.4); the work packages as they ran (9).
13. This pass: S14's 2 s away gap written in 2.14 (behaviour: the game holds 10 s; for the lead); 8.2's hands set to the prototype's profiles, so the bots on the real rules reproduce 2.18.

**For the lead** (where the game as built, or a measurement, and a ruling disagree): `goals.json` hires the cutter before rung 2, content4 after the torch; the truck misses E28's fifth in five minutes yet S18 needs it in the order; `away.gapS` is 10 s against S14's 2 s; `reach.sight` is 8 m in content against the answer's 10; E14's rung 3 at 28 t against the content's 23 t under E7 and E29; the contract lacks `needsItem` and the `rung` refusal of `level`, and the schema `levels.floor`; process-board plates are drawn from views, not from `ui.draw.ts`; the flatbed's bake density is to be checked against 0.75; the hud does not yet draw the skip, slip and deal tickets.
