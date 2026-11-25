# Scrapyard stage 1: the first yard, buildable

Status: version 3, 25 November 2026, evening (step `spec-stage1`); it replaces version 2. The rules engineers began at 16:20 from version 2's sections 2.1 to 2.16: every change of BEHAVIOUR in section 2 since then is marked **[v3]** where it stands and listed in section 11. Authority: `ECONOMY.md` (E1 to E29) and `STAGE1-RULING.md` (S1 to S24); then the lead's later rulings (lines marked [lead] in `requests.md`; `notes/lead-world.md`); then section 14 of `docs/design/yard-design.md` (D1 to D19); then the master's text; then `RULING.md`. Where this document differs from them, it is wrong. Names of types, fields, events, actions, refusal keys and card kinds are the contract's version 2 (`notes/contract.md`; `src/engine/salvage/types.ts`, `refusals.ts`, `textKeys.ts`): on a NAME the contract is right, on BEHAVIOUR this text. Where the game as built and a ruling disagree, the ruling is written here and the difference is listed for the lead (section 11).

**Numbers** live in `src/config/salvage.content.ts` (the content engineer's; from the fourth numbers pass, `proto/content4.json` and `proto/REPORT4.txt` in the shared notes folder), written into `games/scrap-yard/game.json` by `scripts/content/build-yard.py`, and are named here by key. A value marked **(p4)** is the content's at 16:20 or the fourth pass's measurement, for scale: the bots on the real rules continue the tuning and the content file is right where it has moved. Invented names are register ids in braces (5.1).

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

0:00 is the moment the loading animation's gate parts (6.4). Bands are E9's for the normal hand on every seed; the slow hand is held within half as long again on the same seed after 2:00 (E24, E29). Measured: the fourth pass (p4), normal hand, goal habit, route A (the washer first), fifteen seeds: range, median, share in band. Route B (the bundle first; E14's 35 s for its first, copper, ticket) was not run by it; unmeasured beats print their aim.

| # | Band; measured (p4) | On screen | Thumb | Sound |
|---|---|---|---|---|
| 0 | before 0:00 | The loading animation (6.4). | a tap skips it from the second launch | `load_*`, `gate_open` |
| 1 | 0:00 | Morning yard. The boss inside the gate by the drop-off's washer, a pulsing ring; west of him the scales, the price board, the stripper pad with its bundle, the crucible pad (padlock chip, price, sample ingot), {merchant}'s flatbed. Top bar "§0", "26th of 26 · next {rival.1} 0.39 t", "0.0 / 25.0 kg". Goal "Take the washer apart"; a ghost thumb drags. | — | `amb_yard`, music |
| 2 | aim: to about 0:12 | He stops beside it; the ring fills. The motor arcs onto his frame, then the top panel and a side; the drum and the other side drop beside him; the counterweight thuds into the rubble skip. "Load full". | drag, release | `cut_spanner`, `piece_steel`, `thud_waste` |
| 3 | first collection ticket ≤ 0:25; 0:15 to 0:21, med 0:16, 15/15 | "Weigh it on the scale". The weigh-in ticket rises with the muted "today's value", which slides onto the bay chip; the flatbed loads; the collection ticket prints at its cab ("Lot sold to {merchant}"); a coin arcs to the cash counter. | step on | `scale_beeps`, `scale_print`, `flatbed_load`, `coin` |
| 4 | aim: to about 0:30 | "Strip the cable". On the way he picks up the drum and side and weighs them in; their lot waits for the flatbed's return. | steer | `pickup` |
| 5 | copper jump ≤ 1:30; 0:38 to 1:01, med 0:39, 15/15 | At the hand stripper (it turns only while he stands there, R1) PVC curls into its bin, copper spools into the tray. On the scale "Bare bright", a short No.2 line, a value far larger than anything before, the lesson; the flatbed pays; the cash counter jumps. | stand, step on | `stripper_hand`, `coin_big`, `lesson` |
| 6 | a purchase arriving after the jump, ≤ 2:00; the sack truck 0:51 to 1:13, med 0:54, 15/15 | "Buy the sack truck" (the first prompt, S8): the rack, "Open", its card ("Moves a washer in one trip"), "Buy §60"; a van sets it down; the boss pushes it. | Open, Buy | `buy`, `van` |
| 7 | yard hand carrying ≤ 5:00; 1:47 to 3:02, med 2:34, 15/15 | "Hire a yard hand": the rota, "Hire §400"; a green vest walks out of the portacabin; chalk circles appear. "Work the drop-off": what the boss cuts and cannot carry, the yard hand carries to the scale. | Open, Hire | `door` |
| 8 | first rival ≤ 5:00; planned at about 4:00 (`passMin`), not measured as a share | On a collection the chip slides: "25th of 26 · passed {rival.1}". | — | `chip_slide` |

That is ruling 5's list in its order. Goals are SHOWN at most one purchase prompt a minute; only cash and a named gate pace a purchase (E18, E25). The opening does not depend on the route (S10). The slow hand (p4): first ticket 0:19 to 0:25; before 2:00 its own reactions decide (E29); every beat after 2:00 within half as long again on 13 to 15 seeds of 15.

### 1.3 Minutes 5 to 60 (the goal order of `content4.json`, E28)

Every purchase is gated by cash and at most one gate content names (E25; only the torch has one); prices rise along the list (2.11). After the sack truck (§60, bought at 0:54) and the yard hand (§400, 2:20), with price and median minute bought (p4):

1. Buy the sledge and grinder (§480, 4:25); break up the radiators (zone 2's cast iron, two brass valves on each).
2. Buy the flat trolley (§540, 7:39): the boss's own 150 kg carrier.
3. Buy the hook-lift truck (§600, 10:29); fetch {partnerFarm}'s trial load, its label readable from the gate.
4. **First drive out**, band 8 to 10 minutes on both habits (S18): hook, back over the weighbridge (gross, tare, net), tip, cut and sort. Measured 8:24 to 13:26, median 10:40, 5/15: **missed**.
5. **Rung 2**, band 12 to 18 minutes (E7): "Supply 2 t (3 metals)"; the crane hangs the sign; a radiation portal and the ID desk window; {foundry}'s supply deal (optional); levels open (E25). Measured 12:09 to 14:49, median 13:18, 15/15.
6. Buy the cutting torch (§670, gate rung 2; median 14:07, 10/15 in 11 to 15 minutes): zone 3 and {partnerDemolition} open; cut up the car; fetch the demolition load.
7. Hire a cutter (§750, 18:29; "The yard now earns while you are away."): the drop-off, then the partners' loads on the tipping floor.
8. Buy the powered stripper (§890, 19:11).
9. Buy the crucible (§1,200, 21:32); "Charge the crucible". **First small pour**, band 18 to 25 minutes (E9), waiting at "Ready to pour" for the boss (S11). Measured 24:13 to 32:50, median 27:06, 2/15: **missed by about two minutes** (the cutter and the stripper now come first).
10. Buy the motor bench (§1,300, 24:23); break a motor.
11. Hire a driver (§1,500, 28:43).
12. To the hour's end one repeating goal names the advice line's purchase: "Buy next: {item}" or "Level up: {item}" (2.10); {rival.2} to {rival.4} are passed on the way (planned at about 15, 30, 50 minutes).
13. **Rung 3**, band 55 to 65 minutes: "Supply 23 t (5 metals)" (set for the buy-when-affordable habit, E29). Measured 55:04 to 59:46, median 57:00, 15/15; the buy-everything habit 14/15.

As built, `goals.json` hires the cutter after the farm's trial load, before rung 2; content4 has him after the torch (+2 % over five minutes before the truck's loads, +58 % after): for the lead (section 11).

The rhythm (p4): prices are 1.2 to 2.7 minutes of net income (E28: 1 to 2.5); cash held when a goal arrives is 0.12 to 0.88 of its price (E12: 0.5 to 1.25); waits over three minutes for the torch, cutter, bench and driver on 4 to 6 seeds (E12: none); each goal purchase before the torch lifts the next five minutes' income by 24 to 58 % but the truck, −15 % (+45 % over fifteen; section 11). The buy-everything habit is at most two goal purchases ahead, only in minutes 12 to 28. The day-1 list (E22; not measured): the second yard hand (§1,200), the aluminium recipe (§1,300), the second cutter (§3,600), the Night watch (§2,800, offered once the player has been away).

### 1.4 Days 1 to 3 (E8, E13e, E19)

Under the twice-a-day habit every sitting to the end of day 3 has a useful purchase and cash stays under about a day's income. Measured (p4, one seed, fifteen minutes every 11.8 h): an away pass earns about §383k to §437k; 6 to 11 purchases each sitting, 71 still to buy after day 3; cash after day 3 §166k; levels reach 13 to 17 of 20. To buy:
- Crew levels on the rota, machine levels on the process board, "Another skip" (one more skip in rotation) on the partner wall, all from rung 2 (E25), priced by the capacity they add with a floor (2.11); the advice line names only the one that binds (E19).
- The day-1 list and {foundry}'s supply-deal series (2.9). Rivals up to {rival.8}; the chip names the next with the tonnes still needed.
- The capacity ceiling of rung 3 is a guard met late, if at all (S16).
- The last goal walks the boss to the fenced back field: a plain padlock and "Back field · the works are being built here". No text promises a date (E8, S20).

---

## 2. The rules

Pure TypeScript in `src/engine/salvage/`, deterministic: no `Date.now`, no `Math.random` (counter hashes `hash01(worldSeed, …)`). The screen never decides: it shows the rules' frame and events (2.14) and calls actions (2.15). 2.1 to 2.11 say what the player meets; 2.12 to 2.16 how the engine does it.

### 2.1 The hand

**Controls** are the ground work's (`yard-ground.md`): the stick where the thumb lands, motion and camera on the UI thread, a `Presence` sample at most ten times a second; the rules decide nearness from content positions.

**Work needs no button.** Within `reach.work` of a workable thing (its `tier` at most the best tool owned), the stick released for `feel.workDelay`, the boss works the nearest one with his best tool; a ring shows the piece's progress; moving stops it and keeps the progress on that thing. Two tests bind (D12): walking past never works a thing; stopping beside it always starts work within half a second. Pieces go onto the load in cut order while they fit, else drop beside the thing; waste goes to the rubble skip.

**Pickup** (S9): automatic within `reach.pickup`, moving or still, a piece every `pick_s` while capacity allows; highest p̄ per kilogram first (cable at its copper, R7; never the day's price), ties heavier first. **The swap**: load full, the boss still for `feel.workDelay`, a better piece in reach: the lowest-valued carried piece is put down and the better one taken; never while moving or in a chalk circle; a test proves a swap never lowers the load's value. **Piece positions** are one pure function `piecePos(pile, k)` of content, for rules, frame, screen and bots.

**Chalk circles** appear and work only once a yard hand is hired: standing in one for `feel.workDelay` puts the load down for the crew. **Feeding**: standing in a hopper zone feeds accepted pieces, best first, while there is room (any hopper). On the scale, in a hopper zone or a circle the boss does only that; elsewhere pickup and work run together. **Carriers** (S8): the carry frame, a hand load of at most `carriers.frame` kg (25, p4); every larger carrier has wheels: the sack truck (60), then the flat trolley (150). Nobody is drawn bearing more than the hand load; loads are pieces strapped on. **The one button** (60 pt, lower right): "Open" at a place, "Step out" while driving, blank elsewhere; pressed only with the stick released. Vehicles are entered by walking into them (`truck.enter`).

### 2.2 The two scales, weighing in, tickets

**Two scales** side by side in the hero frame (S2): the **platform scale** for loads on foot (0.1 kg steps, up to `scale.platformMaxKg`) and the **weighbridge** for the truck (`scale.bridgeStepKg`, 20 kg). Standing on the platform with a load for `weigh_s` weighs it in: each piece into its grade's bay, a whole thing at its `whole` grade, and a **weigh-in ticket** prints with no payment on it; a crew member's weigh-in is a chip (4.4); the weighbridge weighs a skip in (2.7).

**One rounding rule** (E17): each grade line is rounded half up to the platform step once and the bay receives exactly those grams (the difference kept in `scaleRound_g`). A lot takes whole 0.1 kg steps; a line's amount is `roundMoney(kg × price)`; a total is the sum of its lines; on the weighbridge gross and tare are each rounded to the bridge step and net is their difference. **Mass**: one decimal below 100 kg ("28.6 kg"), whole kilograms from 100 kg ("1,020 kg"), tonnes with two decimals from 10 t, from 1 t for ferrous. **Money**: hundredths below §1,000, whole from §1,000 ("§3,148"), three figures with k or M from §100,000. No ticket prints part of a whole thing.

| Ticket (`kind`) | Prints | Legal line |
|---|---|---|
| Weigh-in (`weighIn`) | "{homeYard} · No. {n}", the date; grade lines (short name, kg, "§{p}/kg"), "+ {n} more"; muted "today's value §{x}"; at most one lesson | "Weighed into bays · not yet sold" |
| Drop-off slip (`dropOffSlip`) | "{thing} · signed in · gate drop-off" | the line itself |
| Skip weigh-in (`skipWeighIn`) | "{partner} · {load}"; "Gross {a} · Tare {b} · Net {c}" (tare: the truck's stored tare plus the empty skip); the price paid | "Seller ID checked · paid by transfer" |
| Collection (`collection`) | "{homeYard} · ticket {n}"; grade lines (grade, kg, amount), "+ {n} more"; "Paid §{x}" | "Lot sold to {merchant}" / "weighed out · paid by transfer" |
| Deal delivery (`dealDelivery`) | "{foundry} · {kg} cast iron · §{x}" | "weighed out · paid by transfer" |

The site licence hangs on the portacabin wall from the first second (S3, D8). Closed vessels read "certified empty" on the thing, its card and its ticket line.

### 2.3 Bays, Hold, the merchant's round, what "supplied" counts

**Bays**: one per grade (lock-block ferrous bays, stillages, the converter cage), holding up to `bays.{grade}` kg. Its chip: "{grade} {kg} · today §{x}", the day word when not usual, "held" when held.

**Hold** (the bay's card, the board's row) keeps a bay off the round, free; a full held bay still takes weigh-ins and the round takes only the grams above its capacity. **Sell** on a held bay sets its stock aside at the price on the card (shown equals applied, 2.8) for the next load; Hold stays on. **Reservations are not Hold**: the crucible's "Take from bays" reserves one charge of its grade (2.5), the deal reserves cast iron up to the next delivery (2.9); the round never takes reserved grams.

**The merchant's round** (S1, 2.12): {merchant}'s flatbed loads what is collectable (`merchant.load_s`, 3 s), pays on one collection ticket and is away for `merchant.round_s` (20 s, p4; tune 15 to 30); so several grades come as one ticket, at most `round_s + load_s` after their weigh-in. A lot never takes part of a whole unit (2.12).

**Supplied** counts collected lots only (collection tickets and deal deliveries), lifetime, never falling; never weigh-ins, stock in bays, reserves, waste.

### 2.4 Things, tools and how each thing comes apart

**Things** are content (`objects.{id}`): `tier` (0 loose, 1 spanners, 2 sledge and grinder, 3 torch), hardness `h`, `pieces` in cut order as `[grade, g, n, sprite]`, `waste_g` (to a licensed waste carrier, through the rubble skip or the stripper's bin), `whole` (the grade carried uncut, or null), `gross_g`, `sprite`, `stages`, `size`, `source`, `certifiedEmpty`. **Cut time per piece** t = max(`cut.minS`, kg × `h` / P), P the tool's `tools.{id}.P` in kg/s. A thing needing a higher tier shows "Needs a sledgehammer" or "Needs a cutting torch".

**Tools** (one rack, one purchase a tier): 1 **spanners and bolt cutters** (owned); 2 **sledgehammer and angle grinder** (S6; "Sledge and grinder" on cards); 3 **cutting torch** (oxy-propane: beams, the car, the tank; gated at rung 2; opens {partnerDemolition}). The work animation follows the piece's family.

**The yard is full** (E1), the better material farther out; a zone's `tier` is its sign, each thing's own tier decides. In content (p4): **Z1** 30 washing machines, 10 bicycles, a crate of brass taps; **Z2** 24 cast-iron radiators, 6 stoves, 4 gate sections, 2 sets of alloy wheels, a bath; **Z3** 18 steel beams, 4 steel tanks "certified empty", the car; **bundle1** the cable bundle by the stripper (S4). Zone 2 fetches about §1.22 a kilogram of metal against zone 1's §0.96 (E28). **The public drop-off** (the trickle that never stops): a car with a trailer leaves one thing at a time (2.12), each signed in with its slip; the first `dropoff.initial` (a washer), then `dropoff.mix` (washers, bicycles, radiators, cable offcuts, brass taps, copper cylinders certified empty); never a converter or a sealed vessel.

**How things come apart** (S6, held against `yard-metals.md`): a **washing machine** gives a whole motor, a top panel and two sides (light iron), a stainless drum (light iron in this stage; its lesson says so), the counterweight and plastics (waste); **bicycles, gates, railings, farm sheet, cladding** light iron; **taps, fittings** brass solids; **alloy wheels**; **heavy cable, coils** stripped (2.5) or sold whole priced from their copper (S4, `cable.k`); **radiator, bath, stove, trough** broken by the sledge into cast-iron solids (a radiator's two valves are brass solids), or carried whole as "Cast iron, whole"; **copper cylinder** a No.2 shell and brass fittings, or whole; **electric motor** on the bench, No.2 windings, light iron and cast-aluminium end caps in the trade's shares (`machines.bench.out`); **beam, tank** cut by the torch to HMS 80:20, uncut "Steel, unprepared". **The car** (S7, D11, E16): "End-of-life car from {partnerDemolition} · depolluted · treatment record ref. 0012", in zone 3 from the first second, its fluids, battery and tyres already out; it gives four alloy wheels, the loom ("Thin cable", `tcab`, its own low yield, E21), the converter (one whole piece, sold on assay; "from car ref. 0012"), the body ("Car body"; the long name says shredder feed) and waste. Its `source` is `{type: 'partner', partner: 'partnerDemolition', ref: '0012'}`, `converter.source` names the car, and a test refuses a converter without one.

**Grades** (`grades.{id}`: `name` ≤ 18, `short` ≤ 15 on tickets and chips, `long` on cards and Help, `pbar`, `family` fe / nf / pm, `material`, `kind`, `asFound`): p̄ in true proportion (S5, E21: brass solids about §22.40, at least three fifths of copper; the brass ingot about §27; whole motors at two thirds to three quarters of what the bench gets out).

| Kind | Ids |
|---|---|
| ferrous grades | `li` light iron, `appl` appliances whole, `ci` cast iron solids, `ciu` cast iron whole, `hms` HMS 80:20, `hmsu` steel unprepared, `cbody` car body |
| non-ferrous grades | `alw` alloy wheels, `alcast` cast aluminium, `ald` aluminium dross, `brs` brass solids, `brd` brass dross, `no2` No.2 copper, `bb` bare bright, `cyl` copper cylinders, `tcab` thin cable |
| products | `bri` brass ingot, `ali` aluminium alloy ingot |
| intermediates (tonnes, no range) | `cab` heavy cable, `mot` electric motors, `conv` the converter (`pm`) |

Lead is no grade in stage 1: a greyed plate only (E16). The converter is paid by the master's payables (4.3; `converter.*`), printed on its cage card ("Paid on assay: platinum {pt}, palladium {pd}, rhodium {rh}, less fees"), with one gram of rhodium (E21); if it floods the hour's last quarter its payables fall (E10).

### 2.5 Machines as the player meets them, and the process board

Machines stand on fixed pads with a hopper, a rate, an out tray and levels bought on their plate (2.12); nothing costs by the clock, nothing is lost.

- **Hand stripper** (inherited, S4): on the stripper pad from the first second, lit on the board, its card "Came with the yard"; the bundle beside it. It turns only while the boss stands at it (R1). Cable → `cable.yield_` copper, `cable.tinned` of it No.2, the rest bare bright; PVC to its bin.
- **Powered stripper** (`machines.stripper`): a purchase on the same pad, same inputs, runs alone; fed first.
- **Motor bench** (`machines.bench`): whole motors → its `out` shares and `waste`.
- **Crucible** (S11, E22; `machines.crucible`), under its extraction hood, padlocked with price and sample ingot from 0:00. Recipes **brass** (brass solids → brass ingot + dross) and **aluminium** (`alw` and `alcast` only → "Aluminium alloy ingot" + dross; on the day-1 list). "Take from bays" (on by default) charges it by mass; the heel stays between heats; a recipe change asks "Pour the heel as a short ingot?"; **the first heat ever** waits at "Ready to pour" until the boss comes, then pours with a camera nudge. A person in face shield and aluminised apron is drawn at every pour (the boss, else the nearest crew member); ingots cool to their metal's colour in about 3 s.

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
- **Cutter** cuts at the drop-off, then on the tipping floor (the partners' loads), never what the boss works, never the heaps.
- **Driver** fetches the skip full longest (E26 **[v3]**) when cash and the tipping floor allow (S12); the rota shows "Kept for the next load: §x", the reserve of a load full now or within 60 s (E29 **[v3]**).
- **Places**: `hand1`, `cutter`, `driver` in the hour's order; `hand2`, `cutter2` on `dayOneList` (E22). A level multiplies a member's rate by (1 + `lev` × (L − 1)) (linear), up to `maxlev` 20.
- **The foreman** (master 3.4): crew and machines run faster by `foreman.boost` while the boss has worked in the last `foreman.windowS`, for at most `foreman.minutesPerDay` of each market day, shown by a meter on his vest; never away.

### 2.7 Partners, labels, trial loads, skips, the truck, the tipping floor

**Partners** (`partners.{id}`): {partnerFarm} opens with the truck (`opens`); {partnerDemolition} opens with the torch and stands on the lane before the weight-limited bridge (S18). Each has a site with a skip zone, a sign and a business card ({farmContact}, {demolitionContact}) on the office's Partners tab.

**Loads are honest** (E3, E20). A skip's contents (whole things by object) are fixed when it fills and printed on its label with its price before anyone hooks it; the weigh-in equals the label; nothing is drawn after paying. Price = `roundMoney(k × as-found value at the day's prices)`, as found being each grade's `asFound` share of its prepared price; `k` 0.85 (p4) and loads of whole cast iron, cable, motors, uncut steel and appliances, so at least three fifths of a load's margin is the yard's preparing (E20; E29 allows k up to 0.88 or truer as-found shares); nothing in a load needs a tool the player cannot own when its partner opens. **The first load from each partner is a small trial load** at a fixed price (`trialPrice`: §150 and §400, p4; R17). Regular skips (p4): the farm's 703 kg for §958, the demolition's 1,183 kg for §1,842.

**Skips in rotation are skips** (E26 **[v3]**): a partner at level L has L skips at its site, slot 0 the trial skip, full when the partner opens; each fills `fill_s` after it was hooked and an empty one set down (120 s and 180 s, p4); the driver and the boss hook the one full longest; the lane shows every skip with its label. Supply is L loads per fill time. "Another skip" is a partner level on the partner wall, from rung 2 (E25).

**The label** (a world plate and the skip card): "{partner} · full" or "trial load", net mass, up to three thing lines and "+ n more", the price, and why it cannot be hooked ("Filling · full in {t}", "Needs §{x} more for this load", "Tipping floor needs {kg} free"); the card lists every thing. **The truck** (hook-lift, one purchase): entered by walking into it, left with "Step out"; carries one skip, never pieces; swaps, never crushes or tows; its last stopped position is rules state. **Hook**: still in a skip zone by a full skip, cash for its price above any earmark, and floor room for all of its mass (`floorRoom_kg`, 4 t, p4): a ring of `truck.handle_s` (moving restarts it), then the price is paid and an empty skip goes down; a load that cannot be tipped is never paid for (test). **Weigh-in** over the weighbridge (2.2), then **tip** (still on the floor for `truck.handle_s`): things and loose pieces onto the floor, cut by the boss and the cutter, carried by the yard hand.

### 2.8 The posted price board, the market clock, Hold's signal

**The market clock** (S14): t_m = max(device now, `clock.highMs` + live time since the last resume, from `performance.now`, passed in): never backwards, advancing in live play after a clock-back. Day D = floor((t_m − `board.epochMs`) / 86,400,000), the epoch a Monday 00:00 UTC. A gap of more than 2 s (S14, 2.14; **[v3]**) goes to the away pass, the same engine (2.16). The rules keep running under an open overlay; the boss stands.

**One posted price a day per family** (`fe`, `nf`; `pm` for the converter's daily step only): x_f(D) = Σ_{k=0..29} 0.5^k × `board.a` × w_f(D − 1 − k), w_f(n) = 2 × hash01(worldSeed, f, n) − 1; p_g(D) = round(p̄_g × (1 + x_f(D))) in hundredths; the converter's metal prices step by x_pm. A pure function of D: every phone shows the same board, nothing is saved.

**The day word**, Hold's signal: **low day** (x < −`board.wordBand`), **usual**, **high day**; on the board, each row and each bay chip when not usual. The board's first opening points at a day word ("Cast iron: a low day. Holding is free.").

**Shown equals applied**: every Sell carries the step it showed (`sell(grade, shown)`, `SellShown {day, price, grams}`); if the day has changed when the tap lands, "Price updated: §{a} → §{b}" asks again.

### 2.9 The supply deal

{foundry} appears on the office's partner wall at rung 2 (`deal.gate`) with "{q} kg of cast iron a day for {d} days at §{p} a kilo, locked at signing" (S21: "supply deal", never "contract"); p = round(A_ci(D) × (1 + premium)), A_ci the mean of the last seven days' cast-iron prices, q, d and premium from `deal.series[]`. After signing, cast iron weighed in first fills a reserve of q in its bay ("For the foundry {a} / {q}"). At each 00:00 UTC, before anything else: delivered = min(q, reserve), paid and supplied on a delivery ticket; trust (`deal.trust`) rises for a full day and falls for a short one; **nothing is ever charged for a miss**. After d deliveries the series offers the next deal. "Not now" declines it until the next market day, when it is offered again **[v3]**. Trust gates nothing in stage 1.

### 2.10 Goals and the advice line

**Goals** are content by id (`goals[]`, `dayOne[]` in `scripts/content/yard/goals.json`): `id`, `text` key (≤ 30 characters), `target` for the chevron, `via` (a target shown first, e.g. the truck before a fetch), `done` in the goals' grammar (lifetime counts: `cut:<obj>:<n>`, `weighIns:<n>`, `made:<grade>`, `owned:<key>`, `hired:<role>:<n>`, `fetched:<partner>:<n>`, `rung:<n>`, `poured:<n>`, `passed:<n>`, `away:<n>`, `visited:<point>`, `repeat`, ...), optional `buy`, `optional`, `after`, `stall`; no words. The state keeps `goals {done[], skipped[], lastPromptAt, repeats}` **[v3]**. The current goal is the first of `goals` neither done nor skipped, then `dayOne` in order, each waiting for its `after` (the Night watch for the first time away). A goal whose `buy` is owned counts done; an optional one is put aside with "Not now" (`skipGoal`); none is met by doing nothing. A purchase goal is SHOWN no sooner than `advice.promptGapS` after the last prompt: how goals show, never what paces buying (E18, E25). After the fixed list one goal repeats, "Buy next: {item}" or "Level up: {item}" (the lead's ruling **[v3]**), naming the advice line's purchase; never met by itself, passed over once rung 3 is reached.

**The advice line** (the expanded card's third line; the only line after the last goal): the cheapest purchase that widens the bottleneck now, priced at most cash plus `advice.minutes` minutes of `incomeRate`, never leaving cash below the reserve: the price of a load full now or within `advice.reserveS` (60 s) that the driver can fetch (E19, E29 **[v3]**). What binds (R16): a tipping floor over 1.5 t names a cutter level; loose stock over 200 kg, a yard hand level; a hopper 80 % full, its machine's level; otherwise another skip and the driver. A level that would change nothing now shows what it would add and "Not the bottleneck now"; the advice line never names it (E19).

### 2.11 Rungs, range, gates, prices, ceilings, the industry table and rivals

**Rungs are positions, never titles** (S15, D8, D16): rung r at `ladder.rung{r}.t` lifetime supplied and range `ladder.rung{r}.range` (rung 2: 2 t, range 3; rung 3: 23 t, range 5; p4); rungs 4 to 9 (`ladder.rungs`) show with their gates and a padlock. The crane hangs "{homeYard} · {t} supplied"; goals read "Supply 2 t (3 metals)"; refusals "Opens at 2 t supplied"; rung 2's portal and ID desk are equipment, never the yard becoming licensed. **Range**: a material counts once its lifetime supplied products are worth `ladder.theta` at p̄; stage 1 offers six (light iron, cast iron, steel, aluminium, brass, copper) and rung 3 asks five; intermediates count tonnes only.

**Gates** (E25 **[v3]**): a shop item carries at most one gate content names (`shop[].gate`), shown with a padlock: a rung ("Opens at 2 t supplied") or another item owned ("Opens with: {item}"). Only the torch has one (rung 2). Crew, machine and partner levels open at rung 2 (`levels.opens`). Nothing else holds a purchase back (no one-at-a-time, no card delay: R13 refused).

**Prices** (E12, E18, E25, E28) are content: goal k costs 1.6 × the normal player's net income a minute (sales less loads bought, the last two minutes) when goal k − 1 is bought, at least 1.12 × goal k − 1, so a later item is always dearer and buying it first delays the rest. A level costs max(tau(L) × the kg a minute it adds at full feed × the mean margin a kg, `levels.floor` × `levels.floorGrowth`^(L−1)), tau(L) = min(540, 20 × 1.6^(L−1)) minutes; the floor (§1,800, × 1.25 a level, p4; R21) keeps the buy-everything habit from starving the list **[v3]**; levels to 20 (R15). **Ceilings** are a guard (D5, S16): `ceilings_t_h` 6, 20, 160 at rungs 1 to 3; a purchase lifting R over its rung's ceiling is refused ("Capacity {c} t/h · grows at {t}").

**The industry table** (notice board and chip): the top line "the largest full metal recycling and resource supplier", nine rungs (current lit, next with its gates), range chips, 26 rows (rank, 24 pt plate logo, chip name, tonnes, "simulated"), the player pinned, "Rival firms (simulated)". **Rivals** (S17, D19, E27 **[v3]**): `rivals.list[]` (`id` = register id `rival.N`, `T0_t`, `g_day`, `passMin` the plan); T_i(d) = T0 × (1 + g_day × min(d, 40)), d = D − `clock.startDay`, the market days since this player's first second, so every player meets the same race whenever they begin (d = 0 in the first hour). In content (p4) rival.1 to rival.4 start at 0.39, 2.35, 7.09 and 18.28 t (passed at about 4, 15, 30, 50 minutes). A passed rival never passes back: as a guard the k-th rival below the player shows at most (1 − 0.03 k) of the player's tonnes (test). Position never falls while away; "Passed {rival}" fires once.

### 2.12 The engine: whole items, mass, agents on legs, events read from the state (E17; contract version 2)

**Two kinds of stock.** (a) **Whole items**: a *thing* (`ThingState`: in a heap, a drop-off slot, on the tipping floor) and a *piece* (`Piece {uid, grade, g, from, spec, whole?}`; on the ground a `GroundPiece` with `pile`, `k`, `claim`; one uid from the ground to the load to the hopper), each with its mass from content. A piece exists from the moment its cut completes; carriers move whole pieces and things; a whole thing is weighed in at its `whole` grade; the converter is one piece. (b) **Mass** in integer grams by grade: bays, trays, the PVC bin, pot and heel, a machine's work in progress. No ticket prints part of a thing, and no lot takes part of a whole unit: `wholeUnits_kg` grades (converter, motors, cylinders, alloy wheels) are counted in units in the bay (`BayState.n`) and collected whole (R19, E29 **[v3]**).

**Time** is yard seconds `salvage.t`, live ticks plus away passes; every dated field counts it and every action takes `clock = salvage.t` **[v3]**. Two times within 1e-6 s are one instant (R12). A leg's distance is `map.routes["a-b"]` (either order) if listed, else `map.detour` × straight; the lane adds `map.lane` each way from the gate.

**Agents on legs.** Each agent holds at most ONE dated end, computed when its leg starts; a level and the foreman's boost apply from the next leg; while `truck.trip` runs the driver holds no leg of his own **[v3]**.
- **The boss** (live only, from presence, 2.1): `work` (the piece ends at start + t − progress; moving cancels it and keeps `progress`), `pickup` and `feed` (a piece every `pick_s`), `weigh` (`weigh_s`), `circle`, `strip` (R1), `hook`, `tip`, `drive`. A sample may cancel the act; an open overlay does not stop samples.
- **Cutter**: when idle he takes the free thing of highest prepared value per cutting second, the drop-off first, then the tipping floor; power `tools[best].P` × `crew.cutter.share` × (1 + `lev` × (L−1)), at most `cap` × P; he walks at `crew.hand.v`. **When he starts a thing he decides once** (`cut {thing, whole}`, never recomputed **[v3]**): with the boss within `reach.sight` (about 10 m, the lead's answer) each piece is its own event and drops to the place's pile; otherwise the whole thing is one event at the sum of its piece times (E17). The decision is state, so tick and jump agree.
- **Yard hand** (R2: `crew.hand.load` kg on a sack truck, speed `v` × (1 + `lev` × (L−1)), `handle_s` at each end). **At each departure** he takes the first place with work in S12's order: (1) *feed* an owned machine whose hopper has room for a piece of its input lying in a chalk circle, at the drop-off or on the floor; (2) chalk circles; (3) out trays (mass, up to his load); (4) the drop-off's pieces; (5) a whole thing at the drop-off within his load, at its `whole` grade, when no cutter is hired or every drop-off place is taken (E4); (6) the floor's pieces, then such a whole thing. Inside a place: highest p̄ per kilogram, ties heavier first. He **claims** what he takes **[v3]** (`GroundPiece.claim`, `ThingState.by`, `trayClaim_g`, all in `claims`), so nobody else takes it; *pick* loads it, *drop* feeds the hopper or weighs it in (a crew chip). Idle, he stands by the scale house and is offered work at every later event.
- **Driver** (hired; the truck owned, parked, empty, the boss not in it): he departs for the partner skip full longest (E26 **[v3]**) if cash above the earmarks covers its price and floor mass + the skip's ≤ `floorRoom_kg`; both are **earmarked** at departure (`truck.earmark {money, floor_g}`), so the hook always pays. The trip (`truck.trip {partner, slot, phase, t0, endsAt}`): walk to the truck; drive at `truck.v` × `driverFactor` × (1 + `crew.driver.lev` × (L−1)); hook (`truck.handle_s`, paid); weighbridge (skip ticket); tip; park. **The reserve** (E19, E29 **[v3]**): the price of a skip full now or within `advice.reserveS` (60 s), shown as "Kept for the next load: §x"; the advice line and the bots never spend below it; it refuses nothing.
- **The merchant's round** (S1, R5): *waiting*; at the first event with collectable grams (not held, not reserved, or set aside) it starts *loading* (`merchant.load_s`) and fixes the lot, each line resolved down to 0.1 kg and to whole units **[v3]**; then it pays (`collected`) and is *away* (`merchant.round_s`). A lot pays the day's price, each set-aside lot its own (`aside[]`), a converter its assay.
- **The drop-off**: the first arrival at `dropoff.first`, then one every `dropoff.period` while fewer than `dropoff.places` wait, else the instant a place frees; the object is `dropoff.initial[n]`, then drawn from `dropoff.mix` by `hash01(worldSeed, 'dropoff', n)`.
- **Machines** work mass at a rate. A hopper holds whole pieces up to `inbuf` kg. An idle machine takes the next piece (`work {piece, startAt, rate_kg_s, credited}`); outputs are credited by the cumulative rule out_g(t) = floor(share × rate × (t − startAt)) per grade, the last credit giving the exact remainder, so ticking and jumping credit the same grams. A full tray (`tray` kg) stops it, nothing lost. Rate: `rate` × (1 + `lev` × (L−1)) × the foreman's boost; when the rate changes, work is credited to that instant and restarted. The strippers give `cable.yield_` copper (`cable.tinned` of it No.2, the rest bare bright), the rest PVC; the bench its `out` shares and `waste`.
- **The crucible** (S11; mass only). *Take from bays* reserves the input grade (`forCrucible_g`) from weigh-ins and unreserved stock up to the room left in the pot; while no heat runs, reserved grams move in at once; a carried piece of the input grade melts in whole if it fits. Pot `pot` × (1 + `lev` × (L−1)) kg, heel included. A heat starts when the pot is full, or at lastFeedAt + `start_idle` with charge + heel ≥ `start_share` × pot, and lasts `s_per_kg` × the new metal's kg. At its end dross = round((1 − yield) × charge_g), metal = charge_g − dross + heel_g, n = floor(metal / `ingot_kg`), the heel keeps the rest. **The first heat ever** waits at *ready* until the boss is within `first_wait_m`.
- **Partners' skips** (E26 **[v3]**): one `SkipState` per slot, full at `fullAt` = `setAt` + `fill_s`, its contents fixed then (`hash01(worldSeed, partner, n)` over the mix); when hooked, an empty skip goes down in its slot.
- **Purchases on their way** (`arriving[]` **[v3]**): owned from `at` = the purchase + `shop[].deliver_s`; a machine works from its arrival.

**Events**: every dated end above, the day boundary (00:00 UTC: the board's step, the deal's delivery, the rivals' day) and the foreman's boost ending. **The queue is derived** **[v3]**: nothing of it is saved; `nextEvent(cfg, g)` is the minimum over the dated fields. **Order at one instant**: (1) the day boundary; (2) completions: machines and the crucible, the boss, cutters, yard hands (pick before drop), the driver; (3) arrivals: purchases, drop-off, skips; (4) the round; (5) departures of idle agents in id order; (6) checks: rung, rivals, the deal offer, goals, lessons. **A leg in flight**: claimed items cannot change; a hopper full on arrival takes what fits and the rest goes on to the platform; a machine bought meanwhile is offered at the next departure; the boss never works a thing a cutter holds. **R(assets)**, rated capacity in t/h, is the throughput of crew and machines at full feed with no boss; it feeds the ceilings and the cards' "+1.2 t an hour" (E13d).

### 2.13 The state, field by field, and the derived values

`SalvageGame = GameState & {salvage: SalvageState}`; cash is the shared `GameState.cash`, changed only through `money.ts`; `stats.playSeconds` counts time played; save tag `salvage1`, layout `v: 2`. `SalvageState`, by the contract's names **[v3]**: `v`, `t`, `epoch` (bumped by every away pass, reconcile and preset: the world snaps across it), `clock {highMs, day, startDay}`; `owned`, `arriving[] {item, by, place, since, at}`, `tier`, `carrier`, `load`, `presence`, `presenceAt` (older than `feel.staleS` is no boss), `act {kind, target, since, endsAt}`; `things[] {uid, obj, at, cut, progress, by}`, `pieces[]`, `waste_g`, `scaleRound_g`; `bays[grade] {g, n, held, aside[], forCrucible_g, forDeal_g}`; `machines` (`owned, level, hopper, work, tray_g, trayClaim_g, status, since`; the crucible adds `recipe, fromBays, charge_g, heel_g, phase, phaseSince, endsAt, lastFeedAt, firstPoured, cooling`); `crew[] {id, role, slot, name, level, job, phase, from, to, t0, t1, carries, load, claims, cut}`; `partners[id] {open, trialUsed, level, skips[] {slot, phase, setAt, fullAt, contents, mass_g, price, priceDay, trial, n}}`; `truck {owned, x, y, heading, skip, by, trip, hookSince, earmark}`; `merchant {phase, since, endsAt, lot[]}`; `dropoff`; `deal`; `foreman`; `ladder {supplied_g, worth, rung, passed}`; `goals {done[], skipped[], lastPromptAt, repeats}`; `lessonsSeen` (shown); `seen {places, cards}` (written only by `noteSeen`); `tickets` (last 50), `ticketNo`; `away`; `draws`; `beenAway`; `income {minute, buckets[5]}`. Not in the state: a queue, flows, `debt` (E11), `keptFor`, `hookRing`.

**Derived** (pure; `rules-book` and the facade): `priceOf`, `priceBoard`, `tickets`, `cardOf(ref)` (rows with exact price, state and refusal), `skipLabel(s)`, `industryTable`, `nextGoal`, `goalList`, `advice`, `processBoard`, `awayCard`, `topBar`, `frame` (crew, truck and flatbed as legs the world interpolates), the positions (`piecePos`, `thingPos`, `spotPos`, `bayPos`, `skipZone`, `lanePath`), `ratedCapacity`, `shopPrice`, `levelPrice`, `reserve`, `nextEvent`, `incomeRate` (§ of the last five minutes ÷ 5).

### 2.14 What a tick does, in order, and what it returns

`tick(cfg, g, dt, now) → {g, events}` advances at most `MAX_TICK` of live play and adds it to `salvage.t` and `stats.playSeconds` **[v3]**:
1. **The clock**: t_m = max(now, `highMs` + live time since the last resume); a gap of more than 2 s (S14; `away.gapS`) goes to 2.16 first **[v3]** (the game as built holds 10 s: section 11).
2. **Presence** already applied by its action (2.15).
3. **Advance**: repeatedly take the earliest event ≤ the horizon, credit every machine's mass to its instant, apply it and the others at that instant in 2.12's order, re-offer idle agents; then credit machines to the horizon.
4. **Checks**: rung, rivals passed, the deal offer, the goal, lessons (paced inside the weigh-in: in the first five minutes only a value jump shows its lesson, so a ticket's `lessonText` is already paced).
5. **Return** the new state and the typed `SalvageEvent`s in the order they happened, nothing in them a word: among them `workStart {grade, ring}`; piece uids on `pickup`, `feed`, `swap`, `pieceOff`, `weighIn`; `collected {first}`; `lesson {grade, text}`; `refused {key, args, retry}`; skip events with `slot`; `crewLeg` with Spots; `pour {by}`; `arrival` of kind `dropoff`, `van`, `machineFlatbed`, `truck` or `crew`; `roundLoad`, `roundBack`.

A jump is `advance(g, nextEvent)`; the gate compares ticking at 0.1 s and jumping minute by minute (cash, supplied, every stock) on every bot run.

### 2.15 Every player action, with its checks and refusals

Every action is pure `(cfg, g, …, clock, events)` with `clock = salvage.t`, and `now` where the market day matters **[v3]**. A refusal returns the SAME state and pushes `refused {key, args, retry}` (`retry` the action to press again); an action that changes nothing returns the same state and pushes nothing. Every purchase compares the shown price with the price now (`priceUpdated`).
- `presence(p, events)`: stores the sample; starts, continues or cancels the boss's act (work after `feel.workDelay` within `reach.work`; pickup within `reach.pickup`; weigh, feed, circle, strip within `reach.place`; the truck within `truck.enter`); refusals `tool2`, `tool3`, `tooHeavy`, `weighFirst`, `filling`, `loadCash`, `floor`, `noTruck`.
- `buy(item, shownPrice)`: `owned` (owned or on its way), `rung`, `needsItem` (an item gate, E25 **[v3]**), `earmark` (within cash but not above the driver's earmark), `cash`, `ceiling`, `priceUpdated`; then cash −= price and the item goes to `arriving`.
- `hire(role, shownPrice)`: the next unbought key of that role (`hand1, cutter, driver`, then `hand2, cutter2`); `noPlace`, then as buy.
- `level(target, shownPrice)` (a crew member, a machine, a partner's "Another skip"): `notOwned`, `rung` before `levels.opens` (E25 **[v3]**), `topLevel`, `earmark`, `cash`, `ceiling`, `priceUpdated`. A level that would not widen the bottleneck is sold, shown "Not the bottleneck now"; it is never refused `nothing` (E19).
- `setHold(grade, on)`; `sell(grade, shown, now)`: a held bay only; `nothing` with no unreserved grams; shown.day today, shown.price `priceOf`, shown.grams the unreserved, not set-aside grams (whole units for `wholeUnits_kg`), else `priceUpdated`; then one `aside[]` entry {grams, price, day} **[v3]**.
- `setRecipe(recipe, confirmHeel)`: `notOwned`, `heatRunning`, `confirmHeel` (retry with true); then the heel pours as one short ingot.
- `setFromBays(on)` (`notOwned`); `signDeal(terms, now)` (`nothing`, `priceUpdated`); `declineDeal()` (offered again next day **[v3]**); `stepOut(at | null)` (`stopFirst` while moving, `nothing` when not driving); `skipGoal(id)` (`nothing` unless current and optional); `noteSeen({place?, card?})`; `ackAway()` (closes the card; pays nothing).

### 2.16 Time away

The same `advance` with **no boss**: no boss acts, no foreman, the hand stripper idle (R1), cutters on whole-thing events. A = min(t_m − max(`lastSavedAt`, `clock.highMs`), cap), cap `awayCap_h[0]` (4 h, p4) or `[1]` (6 h) with the Night watch; A is added to `salvage.t`, never to `stats.playSeconds`. Day boundaries inside A happen at their market time; the time beyond A passes with no work. If the boss left the truck loaded, the driver (when hired) finishes the weigh-in and the tip. **Money once** **[v3]**: the pass pays into cash through money.ts inside the state; `salvageOffline` always returns `earnings: 0` and no report, so the shared store pays nothing twice; the one away card is `salvage.away`, shown until `ackAway`. The pass emits only `awayReport`, `passed` and `rung`, bumps `epoch` and sets `beenAway`. `highMs` rises to t_m, so a clock that jumps forward and back never pays a stretch twice. The **away card** lists the lots collected by grade, supplied, loads fetched, deliveries, rivals passed, and a hint when little was earned (S13). No rank is lost. The bench prints how long six hours away take (aim < 50 ms in node).

### 2.17 The content data

`src/config/salvage.content.ts` (`SALVAGE_CONTENT`, the schema's input; `SALVAGE_PENDING` holds `levels.floor` and `levels.floorGrowth`, not yet in the schema) → `scripts/content/build-yard.py`, which lays over it the names register (`names`), `text.json` (`text`; grade and object words), `goals.json` (`goals`, `dayOne`, `teach`) and the wiring engineer's top-level block, checks `SalvageSchema`, `lintSalvage` and its own lint (mass kept, prices rising and payable, footprints apart, the hero frame, sprites against the manifest), and writes `games/scrap-yard/game.json` (`salvage`, parsed by `src/config/schema.salvage.ts`; `MapSchema` is strict). Units: grams for pieces and `_g`; kilograms for `_kg`, `load`, `inbuf`, `pot`, `tray`, `carriers`, `bays`; kg/s for rates and `P`; seconds `_s`; minutes `passMin` and tau; hours `_h`; § a kilogram at the usual price; metres. Key families, each described where its rule is: provenance (`version`, `units`, `$changes`, `$keys`, `worldSeed`); the ground work (`yard`, `worker`, `helpers`, `props`); `grades`, `cable`, `converter`, `objects`, `zones` (2.4); `map` (`points`, `footprints`, `walls`, `gaps`, `hero`, `detour`, `lane`, `laneWidth`, `routes`, `places {w, d, h, solid, sprite, card}`; 3); `tools`, `carriers`, `walk`, `pick_s`, `weigh_s`, `truck`, `reach`, `feel`, `cut` (2.1, 2.7); `machines`, `crew` (2.5, 2.6, 2.12); `dropoff`, `partners`, `floorRoom_kg`, `merchant`, `scale`, `bays`, `wholeUnits_kg` (2.2, 2.3, 2.7); `shop[] {key, kind, place, price, gate, deliver_s, arrive}`, `dayOneList`, `goalOrder`, `shopRules` (provenance, never a rule), `levels`, `ladder`, `ceilings_t_h`, `awayCap_h`, `rivals {rule, list}` (2.11); `board`, `deal`, `foreman`, `away`, `advice`, `lessons` (2.8 to 2.10, 2.16). The frozen test content (`src/engine/fixtures/salvage.ts`) has the same keys with round values and the five frozen states; the rules tests never read the tuned file.

### 2.18 The first hour as measured

The fourth numbers pass (`proto/yard4.py`; `final4_out.txt`, `days4_out.txt`, `REPORT4.txt`): fifteen seeds, route A, three hands, two habits (goal: a goal's purchase the moment it is affordable; all: everything affordable at once), no waiting rule. Its verdict: part of the way.

| Beat | Band | Normal, goal habit | Normal, all | Slow within 1.5 × |
|---|---|---|---|---|
| First collection ticket | ≤ 0:25 | 0:15 to 0:21, med 0:16, 15/15 | same | 13/15 |
| Copper jump | ≤ 1:30 | 0:38 to 1:01, med 0:39, 15/15 | same | 2/15 (not held) |
| First purchase | ≤ 2:00 | 0:51 to 1:13, med 0:54, 15/15 | same | 1/15 (not held) |
| Yard hand carrying | ≤ 5:00 | 1:47 to 3:02, med 2:34, 15/15 | same | 15/15 |
| First drive out | 8 to 10 min | 8:24 to 13:26, med 10:40, **5/15** | 5/15 | 15/15 |
| Torch | 11 to 15 min | 13:16 to 17:01, med 14:07, 10/15 | 11/15 | 14/15 |
| Rung 2 (2 t) | 12 to 18 min | 12:09 to 14:49, med 13:18, 15/15 | 15/15 | 15/15 |
| First pour | 18 to 25 min | 24:13 to 32:50, med 27:06, **2/15** | 3/15 | 15/15 |
| Rung 3 (23 t) | 55 to 65 min | 55:04 to 59:46, med 57:00, 15/15 | 14/15 | 15/15 |

Sales § a minute by five-minute window (normal, goal habit, median) against E28:

| Minutes | 0-5 | 5-10 | 10-15 | 15-20 | 20-25 | 25-30 | 30-35 | 35-40 | 40-45 | 45-50 | 50-55 | 55-60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E28's aim | 120 | 250 | 450 | 800 | 1,300 | 1,800 | 1,980 | 2,178 | 2,396 | 2,635 | 2,899 | 3,189 |
| Fourth pass | 242 | 226 | 258 | 468 | 668 | 655 | 828 | 1,320 | 1,448 | 1,417 | 1,478 | 1,514 |

**Missed**: the first drive and the first pour; windows 2 and 3 flat (the boss's own cycle in zones 1 and 2 earns §90 to §230 a minute, the trickle's order); windows 5 and 6 dip while three new machines hold material back; **from minute 35 flat at about §1,450 against §3,500**: supply binds (one farm skip every 120 s, one demolition skip every 180 s) and the levels bought after the list do not widen it (the pass's smallest change: the advice line names "Another skip" when the floor is empty and the driver idle); two windows below the one before (25-30, 45-50). **Not run by it**, so the bots on the real rules measure them first: route B; live against away (E19) and the away share at minute 60 (S13); the hands-off test (E4, E24); the day-1 list's worth; a minute-by-minute table on one seed; six hours away on the bench. The bots (`src/engine/salvage/bot.ts`, `scripts/content/yard-bot.ts`) play the joined rules with the prototype's hands (8.2) and continue the tuning in the content file.

---

## 3. The yard as a map

The ground work's yard: fenced, 64 × 40 m, three screens wide at 844 × 390, 40 pt a metre, tilt 0.7. The container wall runs north to south at x 24 (`map.walls`) with two gaps (`map.gaps`): the truck's, 4 m at y 10 to 14, and the people's, 1.4 m at y 22.6 to 24. The gate is in the east fence, the lane runs east from it. Positions flow one way, content → game.json → rules and screen (S23); routes are `map.routes` or `map.detour` (1.15) × straight. The places (p4; metres; "pad": the machine on it is solid):

| Place (id) | Centre x, y | w × d | Solid |
|---|---|---|---|
| Gate (`gate`); the boss's start (`start`) | 63.5, 24; 59.5, 23.5 | 1 × 8; — | fence |
| Public drop-off (`dropoff`); rubble skip (`rubble`) | 58.5, 26.5; 58, 19 | 8 × 2; 2.4 × 1.4 | no; yes |
| Platform scale (`scale`); weighbridge (`weighbridge`) | 54, 22.5; 50.5, 25.5 | 1.5 × 1.5; 6 × 3 | no |
| Scale house (`scalehouse`) | 54.5, 19.5 | 3 × 2.5 | yes |
| Bays (`bays`); {merchant}'s stand (`merchant`) | 48.5, 19.5; 48.5, 17.5 | 8 × 2; 6 × 2 | yes; no |
| Stripper pad (`stripper`); the bundle (`bundle1`) | 47.5, 22.5; 49.6, 22.5 | 2.5 × 1.5; 1.6 × 1.6 | pad; yes |
| Copper and brass stillages (`stillage_cu`, `stillage_br`) | 43, 22; 43, 23.8 | 1.2 × 1.2 | yes |
| Price board (`board`) | 45, 26.5 | 2 × 0.4 | yes |
| Crucible pad (`crucible`); motor bench (`bench`) | 38.5, 23; 33, 22 | 3 × 3; 2.5 × 1.5 | pad |
| Tool rack (`rack`); office (`office`); notice board (`noticeboard`) | 34.5, 16.5; 30, 16; 30, 18.6 | 2 × 0.8; 6 × 2.5; 1.6 × 0.6 | yes |
| Old stock Z1, Z2, Z3 | 29.5, 27; 16, 31; 12, 12 | 6, 8, 10 square | the things |
| The car (`car`) | 19.5, 8 | 2.8 × 1.2 | yes |
| Tipping floor (`floor`); truck park (`park`) | 50, 33; 58.5, 34 | 8 × 5; 4 × 7 | no |
| Back field (`backfield`) | 6, 36 | 8 × 6 | padlocked gate |

The boss starts by the drop-off's washer (S10); the scales lie between it and the stripper on either route, the bays and the stand beside them, so a sale's eye path stays in one view; the floor is within 12 m of the scales (11 m straight) on the truck's line from the weighbridge; the old stock lies farther out and richer the farther (E1, E28); nothing overlaps (the build's lint).

**The hero frame** (S19; `map.hero`): x 35.5 to 56.5, y 18 to 27 (21 × 9 m): both scales, the stripper pad, the crucible pad, both stillages, the price board, the bays and the scale house's edge; 840 × 252 pt, inside the 265 pt between the top bar and the bottom row at 844 × 390. Vehicles are drawn at two thirds of true length, so the truck fits the 6 m deck. `?view=hero` and `?view=hero-store` show it; a test checks it on footprints (the first store screenshot: copper, a ticket and a pour in one frame).

**The lane, as the rules measure it**: from the gate east, {partnerFarm}'s site at 180 m (`map.lane.farm_m`), its load in view from the gate; {partnerDemolition}'s at 300 m, shut with "Needs a cutting torch"; the **weight-limited bridge** (a padlock, "Weight limit 7.5 t") at 360 m to stage 2's partners; a barrier at the end; 6 m wide, drawn at the rule distances (the contract's ruling), skip zones from `positions.skipZone`. At `truck.v` 9 m/s the farm is 20 s away for the boss, 25 s for the driver.

**Solid**: fences, the wall, buildings, the rack, machines, crucible and hood, stillages, lock-block walls, the rubble skip, uncut things, the car, the notice board, the bridge's rails, partner sheds; decals and pieces are not; the truck (`truck.radius`) cannot pass between stillages, into the heaps or through the 1.4 m gap. **Arrivals** (`arrive`, `deliver_s`): tools and carriers by van at the rack (6 s), machines by the machine flatbed's crane onto their pad (10 s), the truck to its park (6 s), crews out of the office door (4 s), the Night watch a sheet on the rota board. **Visible but locked from the first second**: the crucible pad (in the first view at both sizes), zone 2's padlock chips, the car, {partnerFarm}'s load, {partnerDemolition}'s shut gate, the bridge, the back field's sign, the greyed plates, the table's top line.

## 4. The screens

### 4.1 Zones (points; insets read on all four sides; both landscape directions; a taller-than-wide window shows "Turn your phone sideways")

| Row | 844 × 390 (insets L 47, R 47, B 21) | 667 × 375 (insets 0; 16 margins) |
|---|---|---|
| Top bar | 36 | 34 |
| Goal card (one line; tap for three) | 28 | 26 |
| Free world | 237 | 239 |
| Bottom: stick zone left; the one button right | 89 (60 + 21 + 8) | 76 (60 + 16) |
| **Total** | **390** | **375** |

As built: the bottom row is 60 + max(16, the bottom inset) + 8 when there is a bottom inset; side margins max(inset, 16).

| Top bar (left to right) | 844 (safe width 750) | 667 (635) |
|---|---|---|
| Cash (15 pt heavy, rolling, the § coin) | 136 | 116 |
| Ladder chip ("26th of 26 · next {rival} 0.39 t", shorter forms when it does not fit; tap: the table) | 394 | 326 |
| Carry chip (on foot "0.0 / 25.0 kg"; driving a skip pictogram and the mass alone, "1,020 kg") | 104 | 104 |
| Clipboard | 44 | 44 |
| Gaps | 3 × 24 = 72 | 3 × 15 = 45 |
| **Total** | **750** | **635** |

The carry chip's 104 pt are taken from the ladder chip (the lead's ruling 2). No spare slot; nothing from the market in the bar. Bar text is sized by hand from min(fontScale, 1.3), `allowFontScaling={false}`, in rows that add up (`hud/metrics.ts`). The goal card (400 pt at 844, 340 at 667) is one 12 pt line with the goal's meter and a thin share bar; a tap opens three lines (goal, the next goal, the advice line; 84 pt) for 6 s; above font scale 1.15 a weigh-in's lesson is its second line for 6 s. The one button is a 60 pt hi-vis disc, blank and dimmed away from a place. Toasts ("Load full", a refusal) show 1.8 s, only while no card is open.

### 4.2 World labels

Plates of 11 pt on paper chips: place names for 6 s on first sight in a sitting and whenever the boss is within 4 m; padlock chips over locked things and pads (padlock, the condition, the exact price of the card's button); bay chips (4.4); skip labels (2.7) at the skip's point; the chevron (hi-vis, over the goal's target; an edge arrow when off screen; when it shows is the hints' rule). Every place label is at most 18 characters; plates keep their text size while the view zooms out for driving.

### 4.3 Overlays

The mode's own views registered with `useOverlay`, one at a time (`overlays/cardStack.ts openCard(ref)`), closed by the scrim (starting under the top bar, so cash stays readable) or Android back; never the kit Sheet or a `Modal`; the rules keep running beneath. Every card is `CardData` from `cardOf`, re-read every 500 ms and after every press; the screen formats numbers and nothing else; a refusal returns as a note under its row; opening a card calls `noteSeen`.
- **Right panel**: `W ≥ 736 ? min(520, floor(0.58 W)) : floor(0.62 W)` (489 pt at 844, 413 at 667), bar to bottom inset; title 15 pt; rows 44 pt (name 13 pt, effect line 11 pt, ≤ 38 characters), each of the two lines may wrap at font scale 1.3.
- **Buttons** (the lead's ruling 3): at least 96 × 36, growing with their text to 136; a verb and a price ("Buy §3,148", "Hire §750", "Level up §420", "Sell §1,115"); what a level changes ("Level 3 → 4", "+1.2 t an hour") in the row's effect line.
- **Wide card** (the process board): the safe width less 12 pt a side (726, 611), the office's tabs in its title row. **Centred card** (away card, rung sign, confirmations): at most 520 × 300.

`CardRef`s: `office {tab: rota | partners | processBoard}`, `machine`, `rack`, `board {focus}` (a bay opens the board at its row), `skip`, `deal`, `table`, `away`, `rung`, `clipboard`, `settings`, `help`; a place routes by `map.places.{id}.card` (scale, weighbridge, rubble skip, back field and stand open nothing; the park the truck's row; bays, stillages and scale house the board). What they print: **tool rack** per tool and carrier its name, effect line, Owned or Buy, or a padlock and its condition; **rota** "Site licence · metal dealer", per member "{name} · level {n}", "Carries 1.2 t an hour" (E13d), Hire or Level up, "Not the bottleneck now · +{rate} an hour" or "Opens at {t} supplied", "Kept for the next load: §x", the Night watch "Away cap 4 h → 6 h"; **partners** business cards, skips and their state, "Another skip", the supply deal; **machine** in → out, rate, Buy; once owned the hopper, the tray, status ("Working", "Tray full", "Waiting for {grade}"), "Level on the process board" (the stripper pad shows both strippers; the crucible its recipe, Take from bays, "{a} / {b}", "Pours in {t}" or "Ready to pour · it waits for you", the heel); **supply deal** (centred) terms, Sign, Not now, then days left, reserve, trust, last delivery; **clipboard** goals, places visited, ticket history (50), Settings; **settings and Help** Sound, Music, Haptics, Help (every lesson, a glossary, the shortened-time line), the fictional line, privacy, version, "Start the yard again" with a confirming card. The board, bay, skip, table, away card and rung sign: 2.7, 2.11, 4.4.

As built, process-board plates are drawn from views in the art kit's colours and business cards are text rows, until `ui.draw.ts` has functions that hold 4.5's words (the lead's ruling: drawn live from those functions).

### 4.4 Tickets, the bay chip, the board, the away card

**The eye path of a sale**: scale display → bay chip → flatbed → cash counter, in the hero frame and the top bar.
1. **Weigh-in ticket**: rises at the scale (2.2 m up), clamped in the free world, 280 pt wide at 844 and 260 at 667, at most 150 pt tall: header, grade rows (short name, kg, "§{p}/kg") and "+ {n} more", the muted "today's value §{x}", the 11 pt legal line, at most one lesson. **Above font scale 1.15** (the lead's ruling 1): at most two rows, no lesson (it goes to the goal card); a row too long prints on two lines and only rows within 150 pt show, so at 667 and 1.3 one two-line row and "+ n more" (measured). It shows 4.2 s, then folds while the value slides to the bay chip (as built it fades; the slide starts at `weighInAnchor`).
2. **Bay chip**: "{grade} {kg} · today §{x}", muted, on two lines split at " · "; "held", the day word, "For the foundry {a} / {b}", "For the crucible {a} / {b}", "Set aside {kg} · §{x}" as separate chips; none on an empty unheld bay. When the flatbed loads, the grade's name slides into its bed.
3. **Collection ticket**: at the cab (2.6 m up), amounts in ink, "Paid §{x}" bold, the legal line; a coin arcs to the cash counter; moved aside when both clamp to one edge; a tap opens the history.
4. Crew weigh-ins are one-line chips at the scale ("Yard hand · 58.2 kg in"), lots without the boss (`withBoss` false) chips at the cab ("Lot sold · §29.00"), 2.6 s each; one of each kind at a time.
5. In the first five minutes lessons show only on the value jumps (copper, brass, the converter).
6. The skip weigh-in, drop-off slip and deal delivery (2.2) print in the world and the history (as built the hud does not draw them yet).

**The price board** (panel): "Market day {date} (UTC) · next prices in {t}"; per grade seen a two-line row of 56 pt: pictogram, name, today's price, day word, Hold; five bars with the usual-price tick, the bay's stock, "Sell §{x}"; its first opening points at a day word and shows the fictional line. **The away card** (centred): "Away {t} (cap {c})"; up to five grade lines and "+ {n} more"; "{t} supplied · §{x} (already in your account)"; loads fetched; deal deliveries; "You passed {rival}."; OK; with little to show, what would have earned more ("A cutter keeps the yard working while you are away (Office)"). No ad button in stage 1.

### 4.5 The process board (wide card)

Title 15 pt; four rows of enamel plates (2.5), 132 × 60 at 844 and 120 × 60 at 667: a name of up to two lines of 12 characters (12 pt) and a state line (11 pt: "Level 2", "§{price}", "Next §{price}", a padlock), joined by riveted bars of 24 pt (20 at 667). 4 × 60 + 3 × 12 + a 32 pt title = 308 pt, inside 333 (844) and 325 (667). Row 4's five greyed plates are 108 pt (112 at 667) with no state line, so a name may take three lines of 11 characters ("Platinum / group and / iridium"). A plate with a Buy or Level is selected first and its button appears at the end of its row; a second tap opens its card. A greyed plate shows only its padlock.

### 4.6 Text limits (S20 and the lead's rulings of 15:55; `scripts/content/yard/check.ts --all` at 667 pt and font scale 1.3)

Goal text ≤ 30 characters; an effect line ≤ 38; a grade's name ≤ 18, its short name ≤ 15; a place label ≤ 18; a rival's chip name ≤ 14; a ticket ≤ three grade rows and "+ n more" (two above font scale 1.15, no lesson), one lesson line ≤ 48, height ≤ 150 pt; board rows two lines; buttons 96 to 136 pt; the carry chip 104 pt; the legal line 11 pt; nothing under 11 pt. No text promises a future update; locked things show a padlock and a plain condition. The check lists fixed parts that cannot hold their widest text at 1.3 as layout notes.

---

## 5. Content

### 5.1 Invented names by register id

Every invented name comes from `scripts/content/yard/names.json` (version 3, `byId`) by id and is never written as a literal elsewhere in this document or in code (D13, S21). The current name is shown once, for reading; the register is right if it has changed.

| Id | What | Current name |
|---|---|---|
| `title`, `currency` | the title (one plate per word); the currency (symbol §) | Scrap to Ingot; scrip |
| `homeYard`, `homeLane`, `homeTown` | the player's yard, its lane, the town | Cinder Lane Yard, Cinder Lane, Oakbridge |
| `merchant` | the buyer whose flatbed collects the bays (not a rival; `short` on chips) | Tollbridge Metals |
| `partnerFarm`, `farmContact` | the farm-clearance partner and its contact | Hob's Farm Clearance, Hob Garnett |
| `partnerDemolition`, `demolitionContact` | the demolition partner and its contact | Cottle Demolition, Edie Cottle |
| `foundry` | the supply-deal partner | Oakbridge Foundry Co-op |
| `rival.1` to `rival.25` | rival firms in pass order; each `chip` ≤ 14 characters | rival.1 Bramley & Daughters Scrap, rival.2 Pennick Scrap, rival.3 Brookmill Metals, rival.4 Tenterby Lane Metals, rival.8 Millbeck Ferrous |
| crew first names | `crew-names.json` | |

### 5.2 Labels and lines (`src/ui/salvage/strings.ts`, keys in `textKeys.ts`)

The strings engineer's file holds every word, checked by `check.ts`; this section describes it and the file is right where a word has moved. Holes are typed arguments the facade's formatters fill (money prints its own §; `{grade|short}` a grade's short name). Its groups: the top bar (4.1; "25th of 26 · passed {rival}" after a pass); place names (≤ 18: Tool rack, Office, Scale house, Platform scale, Weighbridge, Notice board, Public drop-off, Rubble skip, Tipping floor, Truck park, Stripper pad, Motor bench, Crucible, Old stock, Back field, Bays, Price board, Stillages, {merchant}, {homeLane}, Bridge); chips and tickets (2.2, 4.4); buttons ("Buy {x}", "Hire {x}", "Level up {x}", "Sell {x}", "Hold", "Sign", "Not now"); card lines (4.3); items ("Sack truck", "Flat trolley", "Sledge and grinder", "Cutting torch", "Hook-lift truck", "Powered stripper", "Motor bench", "Crucible", "Brass recipe", "Aluminium recipe", "Night watch") with one effect line each ("Moves a washer in one trip", "Breaks cast iron; cuts sheet faster", "A longer away cap", ...); the advice line ("Next: {item} · {x}", "{item} level {n} · {x}").

Lines: "Every load checked. Every seller identified. Payment by transfer only." (the portal) · "The yard now earns while you are away." · "Back field · the works are being built here" · "All prices, exchanges and shares are fictional and have no real-world value. Nothing in this game is financial advice." (the board's first opening, the table, Help) · "Rival firms (simulated)" · "Building costs and times are shortened so the business grows in days, not decades; metal prices keep their true proportions." (Help) · "End-of-life car from {partnerDemolition} · depolluted · treatment record ref. {ref}".

### 5.3 Goals (≤ 30 characters; 1.3's order)

Take the washer apart · Weigh it on the scale · Strip the cable · Weigh the copper · Buy the sack truck · Take a washer apart · Hire a yard hand · Work the drop-off · Buy the sledge and grinder · Break up the radiators · Buy the flat trolley · Buy the hook-lift truck · Fetch the farm’s trial load · Supply {t} ({r} metals) · Sign the foundry deal (optional) · Buy the cutting torch · Cut up the car · Fetch the demolition load · Hire a cutter · Buy the powered stripper · Buy the crucible · Charge the crucible · Pour your first ingot · Buy the motor bench · Break a motor on the bench · Hire a driver · Buy next: {item} / Level up: {item} (repeating) · Supply {t} ({r} metals).
Day-1 list: Buy the Night watch (after the first time away) · Hire a second yard hand · Buy the aluminium recipe · Hire a second cutter · Finish the foundry deal (after signing) · Pass {rival} (the eighth) · Visit the back field.

### 5.4 Refusals (key → text)

`cash` "Not enough cash: {x} more" · `earmark` "{x} is kept for the load on its way" · `owned` "Owned" · `notOwned` "Buy it first" · `rung` "Opens at {t} supplied" · `needsItem` "Opens with: {item}" · `ceiling` "Capacity {c} t/h · grows at {t}" · `tool2` "Needs a sledgehammer" · `tool3` "Needs a cutting torch" · `tooHeavy` "Too heavy to lift: {kg}" · `topLevel` "Top level" · `noPlace` "No free place on the rota" · `filling` "Filling · full in {t}" · `loadCash` "Needs {x} more for this load" · `floor` "Tipping floor needs {kg} free" · `weighFirst` "Weigh it in first" · `heatRunning` "Wait for the heat to pour" · `noTruck` "Opens with the hook-lift truck" · `noTorch` "Opens with the cutting torch" · `stopFirst` "Stop the truck first" · `priceUpdated` "Price updated: {a} → {b}" · `confirmHeel` (the heel's question) · `nothing` "This would change nothing" (an act with nothing to act on; never a level, E19) · `notBuilt` "Not available" (stubs only).

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

Every number in `src/config/salvage.content.ts` (S23), the map included; player words in `src/ui/salvage/strings.ts` and `scripts/content/yard/text.json` (grades `{name, short, long}`, objects `{name, long}`, lessons `{ticket key, help}`, partners `{card, line}`, a glossary), copied into game.json by the build; goal structure in `scripts/content/yard/goals.json` (`{goals, dayOne, teach}`, no words); names in the register; `scripts/content/build-yard.py` writes `games/scrap-yard/game.json` (never by hand; `--check` shows it is current).

---

## 6. Art

The art director's style sheet (`docs/design/yard-style.md`) decides the look: flat vector, three-quarter oblique (40 pt a metre, tilt 0.7), drawn in code in `src/ui/salvage/art/` through its manifest (content names manifest entry ids: `objects.{id}.sprite`, a piece spec's fourth element, `grades.{id}.sprite`, `load`, `bay`, `picto`, `map.places.{id}.sprite`), baked behind the loading animation; anchors at footprint centres; people in four directions (west mirrored), vehicles by heading; layered actors (`personLayers`, `truckLayers`: carrier, load, the vest tinted per role).

### 6.1 Sprites and animations

| Group | Sprites and frames |
|---|---|
| Boss and crews | stand; walk 6; work 4 per tool (the torch with face shield); feed 2; push sack truck and trolley 6; carry 6; pour 4 in face shield and aluminised apron; the driver in the cab; vests boss hi-vis with white hat, yard hand green, cutter blue, driver teal; one crew body baked |
| Things, pieces | every object of content whole and in stages, closed vessels and the car with their tags; every piece on the ground and carried (panel, drum, motor, cast section, brass valve, copper shell, taps, cable, bare bright, No.2, windings, end cap, wheel, body section, HMS, converter, ingots, dross) |
| Machines, weighing, stock | strippers and bench (idle, working, tray full); crucible under its hood (idle, heating, ready, pour, cooling); pads, sample pallet, both scales, display posts, scale house, price board, portal, ID desk; ferrous bays and heaps, stillages by fill, converter cage, a held bay's flag |
| Vehicles | hook-lift truck by skip state with hook and tip; {merchant}'s flatbed with crane and load; the machine flatbed; delivery van; the public's car and trailer |
| Yard and lane | fence, gate, portacabin with licence plaque and rota board, tool rack, notice board, rubble skip, PVC bin, chalk circles, park markings, back-field gate and sign, rung signs; the lane, the bridge with its sign and padlock, the farm's shed, the demolition hoarding, the barrier |
| Drawn live | sparks, dust, flame, piece and coin arcs, the value slide, the work ring, the pour's glow; process-board plates, 25 rival plates, business cards, {merchant}'s mark |

Never drawn (yard-style 11): a real brand or one shaped like it; a tow truck or crusher; a magnet lifting copper; anyone hurt, without gear or near sparks without a face shield; fire or smoke made fun; a lone gold bar; anyone bearing more than the hand load.

### 6.2 Atlas budget and draw order (as built; the lead's rulings of 15:00 and 15:25)

Sheets of at most 2048 × 2048 px: **A** (people and things) at density 2.75, **B** (plant and vehicles) at 2.5 (accepted; nothing shrunk to win density), **G** (ground, 1024 square) at 3, and the world's shadow sheet **S** at 1 (shadows are the world's, never baked, so a mirrored sprite never throws its shadow west). Statics away from the hero frame are baked small and drawn up; the flatbed bakes at 0.75 or better (the lead's ruling). **Draw order** (`notes/lead-world.md`): ground and decals in one draw, shadows in one, then everything depth-sorted by footprint in RUNS of the same sheet (a mirrored run is its own draw), at most twelve atlas draws a frame; if a frame needs more, the sprites that alternate move sheet. At most 40 actors and 300 sprites. The yard view starts the bake (`useYard.ts startYardBake()`, sliced, on a CPU raster surface, surfaces disposed after the copy) behind the loading animation's calm loop (`atlasProgress()`).

### 6.3 Icon

The style sheet's candidates (a crucible in tongs pouring into a copper ingot with a bare bright bundle; a gloved hand with copper against a ticket; the display printing a ticket over copper), on hi-vis yellow or daylight blue, judged at 60 px beside the four games' icons before anything is built on one. Never a lone gold bar or a truck.

### 6.4 The loading animation (S22; `src/ui/salvage/Loading.tsx` and `src/ui/salvage/loading/`; `art/loading.draw.ts` re-exports it)

One plate per word of the title (`cfg.app.displayName` split on spaces, never a literal; at most four plates), 0.6 s each: three words give 3.6 s; a tap skips it from the second launch. One shared clock drives `loadingPose(t)` (`loading/timeline.ts`) on the UI thread, so the curtain takes over without a jump. As built:

| t (s) | Frame |
|---|---|
| 0.0 to 0.4 | Daylight sky and the hazy far yard fade in from the splash colour; the gantry crane's trolley runs in with its electromagnet and the first plate; the display reads 0. |
| 0.4 to 2.2 | Three plates, the words cut through the steel, each 0.6 s: over its place (0.12 s), lowered (0.27 s), landing with a 2 pt shake (0.1 s), the magnet rising (0.11 s); later plates fade in under the raised magnet; the display counts each plate's kilograms in 20 kg steps (1,300 kg for the title). |
| 2.2 to 2.8 | The trolley parks at its stand to the west (0.5 s; it stays for the calm loop); the crucible under its hood tips 95° (0.2 s) and pours along a launder into five cavities beneath the title (0.4 s). |
| 2.8 to 3.6 | The bars cool from orange to brass in 0.8 s and glint; the display prints a ticket (0.4 s); from 3.2 the picture parts like two gate leaves (0.4 s; a fade with reduced motion). |

If atlases still bake when the bars have cooled, a calm loop holds (the magnet swaying, the display's stable lamp ticking while its reading stays the ticket's, the furnace breathing, the ingots glinting every 2 s), never a frozen frame; the gate parts when the bakes finish.

---

## 7. Sound

A new pack in `games/scrap-yard/assets/sfx` (`soundPack: null`; 98 effect files and the music, 2.87 of 3.0 MB), keys in `src/services/fx/catalog.salvage.ts` (written by `render_yard.py --catalog`), events mapped to cues in `src/modes/salvage/soundKeys.ts`, played only through `fx.play` by the hud's event pump (`hud/pump.ts`, the one listener on `modeEvents`); pitched sounds in E major. Haptics: light on a finished piece and a refusal, medium on a collection and a purchase, success on a rung; none when the event is not the player's own.

| Keys | Trigger (2.14's events) |
|---|---|
| `step_concrete`, `step_gravel`, `step_asphalt` | a foot contact by ground |
| `cut_spanner`, `cut_sledge`, `cut_grinder`, `cut_torch` | `workStart` to `workStop` or `thingGone`, the newest tool |
| `piece_steel`, `piece_cast`, `piece_alu`, `piece_copper`, `piece_brass`, `thud_waste` | `pieceOff` by family; to waste |
| `pickup`, `swap`, `load_full`, `feed`, `lesson`, `deal_stamp`, `goal_tick` | those events; a goal done |
| `scale_beeps`, `scale_print` (420 ms later), `slip` | `weighIn`, `bridgeWeighIn`, `dropOffSlip` |
| `flatbed_arrive`, `flatbed_load`, `coin`, `coin_big` | `roundBack`, `roundLoad`; `collected` (big with copper, a first lot, an away report) |
| `ui_open`, `ui_close`, `buy`, `denied` | overlays, `owned`, `refused` |
| `van`, `set_down`, `crane_set`, `truck_reverse`, `door`, `crew_hello` | `arrival` by kind (`van`, `dropoff`, `machineFlatbed`, `truck`, `crew`); `hired` (600 ms later) |
| `stripper_hand`, `stripper_power`, `bench_knock` | `machineState` working |
| `furnace_roar`, `ready_chime`, `pour_glug`, `cool_ticks` (1.9 s later) | `heatStart`, `readyToPour`, `pour` |
| `truck_diesel`, `hook_swap`, `skip_tip`; `chip_slide`, `rung_sign` | driving, `hook`, `tip`; `passed`, `rung` |
| `load_crane`, `load_clank`, `load_beeps`, `load_pour`, `load_cool`, `load_loop`, `gate_open`; `amb_yard` | the loading animation; always while live |

**Segments, not loops** (as built): the shared service plays one-shots and one music player, so each "loop" is a segment with faded ends the screen replays every `SALVAGE_SEGMENT_MS` while its thing lasts (cut_spanner 500 ms, cut_sledge 700, cut_grinder 750, cut_torch 1,100, stripper_hand 750, stripper_power 950, bench_knock 600, furnace_roar 1,850, truck_diesel 930, load_loop 1,820, amb_yard 7,400); "pitch by speed" is the diesel's three-file ladder by `step`, the burner likewise by heat; sound stops when the app is not landscape and in front. **Ducking** (`SALVAGE_DUCK`, stepped by the screen): under a pour to 0.35 for 2.6 s, a ticket 0.6 for 1.4 s, the rung sign 0.4 for 2.6 s. Music: "yard radio" (`music_main`), an original loop of 34 bars at 92 bpm in E major (88.7 s), clean electric guitar, fingered bass and the yard's own metal hits, two variants crossfaded inside the one file; no melody shared with the four games. Nobody has listened yet: a person hears it on an iPhone speaker before it counts as done.

## 8. Tests, bots and people

### 8.1 Rules tests (vitest, frozen test content `src/engine/fixtures/salvage.ts`; no tuned number pinned)

Mass kept (things, machines, the heel, the scale's rounding); whole items and whole units stay whole, the converter paid as one piece; cut times and tiers; pickup and the swap; one `piecePos`; chalk circles inert before a yard hand; the yard hand's priority, claims, a full hopper; the cutter's decision fixed when he starts; the driver's gates, earmark, the skip full longest, the reserve; tickets (totals equal lines, the buyer named, gross, tare, net); the round, Hold and Sell; reservations never collected; supplied only on collection and delivery; the crucible (heel, first pour, recipe change); a converter without a source refused; loads (fixed at fill, label equals weigh-in, trial loads, L skips refilling after their hooks, never paid when untippable); a purchase owned only from its arrival; gates and levels refused before rung 2; the board pure in D; the clock (a jump never pays twice; the away pass pays inside the state, `earnings` 0); a short deal day charges nothing; goals never met by doing nothing; the advice line never naming what does not bind; rungs, range, rivals from the player's start, ceilings; every refusal; save and reload; 2.12's order at one instant; ticking equals jumping minute by minute.

### 8.2 Bots (`src/engine/salvage/bot.ts`; the screen's actions, a path graph from the content map at the boss's speed; they follow the goal card and the advice line)

People-like (S24): a reaction before every leg, path waste, time at each card; fifteen seeds, two routes; each beat as a range and a share in band; two buying habits on every run (E18), no purchase gap; a branch without an item cannot buy it. The hands are the prototype's (p4), so the real rules are held against 2.18.

| Bot | Behaviour | Measures |
|---|---|---|
| Normal, brisk, slow hands | reaction 1.5 / 0.5 / 3.0 s, at a card 3.0 / 1.5 / 6.0 s, hesitation 1.5 / 0.5 / 3.5 s, path × 1.10 / 1.00 / 1.25; the slow hand leaves optional goals and runs to 100 minutes | the beats of 1.2 and 1.3; cash at each goal (E12); purchase gaps; income windows (E15, E28); leave-one-out over 5, 10, 15 minutes; slow against normal on the same seed |
| Card manager | normal to the second hire, then cards only | the hand's worth (E4) |
| Live against away | an hour of play against the same hour away, from states of the hour | E19 (≥ 1.25) |
| Stop-and-return | stops at 5, 10 or 30 minutes, returns after 1, 4, 12 h | the first away card above zero (S13) |
| Twice a day | a first hour, then two fifteen-minute sittings a day for 3 days | a useful purchase every sitting (E8); cash under a day's income (E13e); the away share at minute 60 |
| Day-word holder | holds on low days | Hold's gain |
| No hand | twenty states, several with little cash, the stick never touched | the next goal purchase reached (E4, E24) |

### 8.3 Hard promises (gates on every bot run and in the rules tests)

Shown equals applied; a changed step re-asks. Money comes only from collected lots, Sell, deal deliveries and their away pass, and goes only to purchases, levels, hires and partner loads; nothing is bought on account (E11). Nothing costs by the clock, nothing built is lost, no rank falls while away, nothing bought has unknown contents. No dead end: with §0 and empty bays the drop-off and the round pay within 60 s; every amount asked for is reachable and never met by doing nothing; from the first hire, without the hand the yard still reaches the next purchase (E4). One monotonic clock; a jump never pays twice; ticking equals jumping minute by minute (cash, supplied, every stock; E17). Mass kept.

### 8.4 Aims (met on 13 of 15 seeds and checked on 5 unseen; a band not given here the lead sets from the bots' table)

The beats of 1.2 and 1.3 in their bands (E7, E9, E14, S18), the slow hand within half as long again on nine pairs of ten after 2:00 (E24, E29) · four rivals in the hour (E7) · E12's cash at each goal, no wait over three minutes, the buy-everything habit at most two ahead by minute 10 · income windows as E28 asks, none under the one before after minute 5, every goal purchase before the torch +20 % over its next five minutes · always a purchase that widens the bottleneck after the torch (E19) · cash at minute 60 at most about ten minutes of income (E13e) · a ceiling refusal at most once in the hour (S16) · on the first partner's loads a minute of hand work earns at least 1.5 × a minute at the drop-off, after the load's price (S18, E20) · at least three fifths of a load's margin from preparing (E20) · every machine bought in hour 1 busy at least 30 % of the minutes after · the hand at least a fifth more than the card manager (E4) · an hour away pays at least 0.3 of an hour played at minute 60 (S13), an hour played at least 1.25 of the same hour away (E19) · Hold ≤ +3 % · a tick < 1 ms and 6 h away < 50 ms in node; `?yardStress=1` read on the iPhone.

### 8.5 People before tuning

Three people-like players (not the engineers) play the built stage on an iPhone at both sizes before any tuning, 20 minutes each, and note with the minute: where they did not know what to do, a card that hid what they wanted, texts unread, a wish for a second thumb, whether the eye followed display → flatbed → cash, whether they found the truck and the crucible without the chevron. The notes reach the lead before anything is tuned.

---

## 9. Work packages as they ran (S23)

The lead's `BUILD.md` holds the packages, every file's one owner and the rules of the folder, and is right where the two differ; contract version 2 (16:05) and the seam (16:19) changed it as follows. `src/engine/salvage.ts` holds only re-exports; `rules-sim` owns `types`, `refusals`, `positions`, `create`, `tick`, `away`, `rate`, `actions`, `notBuilt` and the simulation modules it adds, with `salvageMode.ts`, `schema.salvage.ts`, the fixture (five frozen states: `?preset=fresh`, `m5`, `m15`, `m30`, `back`, each with `FIXTURE_EVENTS`) and `src/modes/salvage/actions.ts`; `rules-book` owns `money`, `board`, `ladder`, `rivals`, `goals`, `advice`, `cards`, `frame`, `tickets`, `save`; `strings` owns `src/engine/salvage/textKeys.ts`; `hud` owns the event pump (`hud/pump.ts`, the one listener on `modeEvents`); `overlays-a` owns `cardStack.ts`, `layout.ts` and the stand-in `sample.ts`; `world-b` owns `WorldLayer.tsx`; `world-a` starts the bake (`useYard.ts startYardBake()`); `loading` owns `loading/*` (`art/loading.draw.ts` re-exports it); `wiring` owns `scripts/art/icons/yard.build.ts`.

| Label | Shows it works |
|---|---|
| `rules-sim`, `rules-book` | `NODE_OPTIONS=--max-old-space-size=3000 npx vitest run src/engine/salvage src/engine/salvageMode.test.ts` |
| `content` (next: `bot.ts`, `yard-bot.ts`) | `python3 scripts/content/build-yard.py --check`; `npx tsx scripts/content/yard-bot.ts --seeds 15 --routes 2 --report` |
| `world-a`, `world-b` | `npx vitest run src/ui/salvage/world`; `npm run lint:worklets`; `?view=hero`; `?preset=m5&fxdemo=1` |
| `hud`, `overlays-a`, `overlays-b` | `npx vitest run src/ui/salvage/hud src/ui/salvage/overlays`; `?hudDemo=1`; `?card=rack` at both sizes and `fontScale=1.3` |
| `hints` | `npx vitest run src/ui/salvage/hints`; `?preset=fresh&autoplay=opening&route=1` and `2` |
| `strings` | `npx tsx scripts/content/yard/check.ts --all` |
| `wiring` | `npm run check:bundle`; `npm run typecheck`; `npx tsx scripts/validate.ts scrap-yard` |
| art | `npx vitest run src/ui/salvage/art scripts/art`; `npx tsx scripts/art/yard-sheets.ts <dir> budget` |
| `sound`, `loading`, `names` | `python3 scripts/audio/yard/render_yard.py --check`; `npx vitest run src/ui/salvage/loading`; `python3 -I scripts/content/yard/build-ids.py --check` |

**Order as it ran** (25 November): the artists from 14:15; everyone against the contract and the frozen states on the stub engine; the lead's world rulings at 15:00 and 15:25; E25 to E27 at 15:35, E28 and E29 at 15:45; the fourth numbers pass 15:36 to 15:58; the layout rulings at 15:55; contract version 2 at 16:05; the seam at 16:19; the rules engineers and the real content at 16:20. Next: simulation and book joined, the bots on them; the integrator joins world, bars, overlays, hints and sounds; three people play (8.5); an engineer attacks the rules; a judge looks at the screens; one pass of fixes; tuning, gates for all five games, the merge.

---

## 10. What this stage leaves out, and the hooks stage 2 needs

**Left out** (ruling 5, master 9): the baler, magnet crane, forklift and larger carriers; the partners across the bridge; further roles; delivered lots, the Trade Book; stainless, lead, bronze and later materials (greyed plates); purchases and ads (stubs); exchanges, dealers, transport; dusk and night; real players.

**Must not be precluded**: grades, things, machines, partners, crew roles and plates are content (stainless, lead ingot and bronze are data); the map's extent is content (the back field opens west); the engine takes a list of sites, each with its own agents and dated fields, and R(assets) feeds stage 5's server bound; the board's families and step length are content and `sell(grade, shown)` survives 10-minute steps; the truck's skip and a partner's skips are lists; the foreman takes a site id; the round's buyer is content (dealers replace it); table rows are `{id, name, tonnes(d), simulated}` so followed players can be pinned; the save reconciles forward and positions are never rules.

---

## 11. Decisions and changes since version 2

In date order (25 November); "behaviour" marks a change to what the rules do, marked **[v3]** in section 2.

1. 15:00 and 15:25, the lead: draw order in runs (at most twelve atlas draws), sheet B at 2.5, the bake started by the yard view, shadows the world's, crew as trips; effects, plates and marks drawn live; the flatbed at 0.75 or better; no battery in the car. → 2.4, 6.
2. 15:35, E25 (behaviour): only cash and one named gate (a rung, or an item: `needsItem`); levels open at rung 2. → 2.6, 2.11, 2.15.
3. 15:35, E26 (behaviour): L real skips per partner, each refilling after its hook; the one full longest is hooked. → 2.6, 2.7, 2.12.
4. 15:35, E27 (behaviour): rivals' d from the player's start. → 2.11.
5. 15:45, E28 (the hour's income aim, the goal order); E29 (behaviour): the reserve is a load full now or within 60 s; R15 to R19 accepted (no lot takes part of a whole unit). → 1.3, 2.3, 2.10 to 2.12, 8.4.
6. 15:36 to 15:58, the fourth numbers pass: order and prices, zones, carriers, loads, fill times, rungs at 2 and 23 t, the level floor (behaviour of `levelPrice`), rivals, footprints. → 1, 2.4, 2.7, 2.11, 2.18, 3.
7. 15:55, the lead's layout rulings: tickets above 1.15, the carry chip 104 pt, buttons as verb and price, "Buy next" and "Level up" (the repeating goal's text), short grade names. → 2.10, 4, 5.
8. 16:05, contract version 2 (behaviour where this document said otherwise or nothing): yard seconds; the queue derived; time away paid once in the state; purchases on their way; claims; `seen` through `noteSeen`; the cutter's sight decided once; an `aside` entry per Sell; `declineDeal` re-offers next day; keys `earmark`, `notOwned`, `stopFirst`, `nothing`. → 2.9, 2.12 to 2.16.
9. 16:08 to 16:20: `goals.json` by id with its done grammar; the real content file and its build. → 2.10, 2.17, 5.7.
10. The lead's answers: about 13,000 words; `reach.sight` about 10 m; rounding in `scaleRound_g`; the skip full longest; floor room by mass; levels linear; the Night watch after the first time away; one repeating goal. → 2.6, 2.7, 2.10, 2.12.
11. The builders' notes: the strings engineer's words (5), measured sizes (4), sound segments and ducking (7), the loading timeline (6.4), the packages (9).
12. This pass: S14's 2 s away gap in 2.8 and 2.14 (behaviour; the game holds 10 s); 8.2's hands are the prototype's; 8.1 and 8.4 carry the rulings above.

**For the lead**: `goals.json` hires the cutter before rung 2, content4 after the torch; the truck misses E28's fifth yet S18 needs it; `away.gapS` 10 s against S14's 2 s; `reach.sight` 8 m against the answered 10; E14's rung 3 at 28 t against 23 t (E7, E29); the contract lacks `needsItem` and `level`'s `rung` refusal, the schema `levels.floor`; plates drawn from views; the flatbed's bake density; the skip, slip and deal tickets not drawn yet.

---

## 12. After the review of the built game (25 November, late evening)

The joined game was reviewed once by six reviewers (a casual player, the look, a store reviewer, a
phone engineer, a rules attacker, the trade and words desk): 101 findings, each ruled on by the lead
and fixed in one pass by the owners of the files. The rulings are in `yard-decisions.md`, part 4
(the map, M1 to M7) and part 5 (by finding). Where they change what sections 1 to 10 say, this
section is right. Changes of BEHAVIOUR are marked so.

1. **The map (section 3; behaviour).** The first yard ends north at a lock-block back wall along
   `map.north` with the neighbour's far yard over it; the bays, the scale house and the stillage
   block stand against it and the pads within about five metres of it. Old stock lies in beds
   (`zones.<id>.bed`): zone 1 in the corner of the back wall and the east fence beside the platform
   scale, zone 2 against the back wall, zone 3 behind the dividing wall. The public drop-off is a
   bay of two rows of four by the gate. Vehicles drive only on `map.driveLine` (gate, weighbridge,
   the merchant's stand, the tipping floor, the truck's park). The office is the gatehouse; the tool
   rack stands at its door. The checker `scripts/content/yard_map.py` (run by `build-yard.py --check`)
   enforces overlaps, the drive line, the walks, the gaps and the two frames.
2. **The first view (1.2 beat 1, section 3).** The sentence that the crucible pad is in the first
   view at both sizes is withdrawn. The first view is the follow view at the start: the drop-off's
   first washer, zone 1's heap, the platform scale and the scale house's display. The hero frame
   (`map.hero`, the store's first picture) holds the wall with the far yard, the bays, the scale
   house, both scales' near edges, the hand stripper, the copper and brass stillages, the price
   board, the crucible pad and some old stock, at 844 x 390 and at 667 x 375.
3. **The look (section 6).** The running world draws what the art director's picture draws: the
   back wall, sky and far yard above it in screen space, a warm wash and one multiply rectangle over
   the world, shadows swept east, warm concrete with decals, dirt beds under heaps, verge and fields
   outside the fence and along the lane. Never a flat clear colour where the camera can look.
4. **The drop-off's opening (2.6; behaviour).** Until `dropoff.openingUntil_s` the public brings
   only what `dropoff.opening` lists (washers and bicycles); the mix starts after it.
5. **Lessons (4.4 item 5; behaviour).** The grades of `valueLessons` (bare bright copper, brass, the
   converter) ALWAYS show their lesson on the boss's first weigh-in of that grade, whatever was
   weighed before.
6. **The yard hand (2.8; behaviour).** He sets out the tick he is hired, from the office door. While
   the boss is in the yard he carries pieces only (cable only into a stripper that runs by itself);
   whole things he carries only when every waiting place of the drop-off is taken, or while the boss
   is away (E4 unchanged for time away). A piece he has claimed is not taken by the boss's pickup.
7. **The car (2.4, 5; behaviour).** Wheels and loom come off by hand, the torch frees the converter,
   and the stripped shell is weighed whole where it stands as one line 'Car body' and leaves with
   the merchant's next round. Nobody cuts a car body with a torch.
8. **The crucible (2.9; behaviour).** A recipe change pours the heel without refilling, sets the new
   recipe, and only then takes from the bays; unmelted charge returns to its own grades' bays.
9. **Time away (2.14, 2.16; behaviour).** E33: the time the yard runs while away grows with the rung
   (`awayCapByRung_h`), and the Night watch adds `nightWatch_h`. E34: the supply deal delivers at
   every market midnight that passed while away. The away card says what was applied: sales, loads
   bought and their cost, the net (already in the account), how long the yard ran and what makes it
   run longer, deliveries, rivals passed, the next step. Held stock is never listed as sold. The
   card shows only after a real absence.
10. **The truck (2.7; behaviour).** The boss drives at `truck.bossV`; `truck.v` is the hired
    driver's. A hired driver finishes a loaded truck the boss stepped out of. The camera zooms out
    while the boss drives. The truck is drawn with a skip only when it carries one.
11. **Tickets and money on screen (4.3, 4.4).** Weigh-ins and sales are numbered in two series, each
    from 1. A weigh-in over the weighbridge reads 'Bought for {x}' in a cost colour and a debit line
    shows under the cash counter. The weigh-in ticket feeds out of the scale's printer slot, away
    from the boss. Cash is never cut at any size or font scale; bars and cards print money without
    hundredths from §100, tickets keep them. Tonnes print with at most three figures.
12. **Plates (4.2).** One plate per thing, above its sprite, hidden while someone stands or works
    there or a ticket is up; a padlock and its place's name are one plate; identical plates of a
    zone are one plate with a count; plates are laid out against each other and against the bars.
13. **Words (5).** No absolute tonnes-an-hour on any row; 'materials' for the range's count;
    'Light iron, uncut' for whole light things; buttons are verbs and rows are states; no 'cap' in
    any player text.
14. **Shared save (all five games; behaviour).** `save()` never moves the start of the time away
    while the store is paused (`src/state/store.pause.test.ts`).
15. **Left for later, by ruling.** The away pass on the real content takes about a third of a second
    of node CPU for six hours (the limit of 150 ms is raised for this stage; aggregating crew legs
    is the next stage's first engineering item). Ads and purchases are designed in at the
    monetisation step: this stage shows none, and a store build waits for that step. The store's
    screenshots, the release date and a person's verdict (fingerprint dimensions 7, 8, 13, 19)
    belong to the store step. The light-iron price ladder is reviewed with the baler and shredder.
16. **The tipping floor (2.7, 2.8; behaviour; E35).** A whole thing that needs no cutting (motors,
    cable coils, fittings) is taken off the tipping floor by a yard hand whenever the boss is away,
    and while he is in the yard once more than half of the floor's room is used: motors to the
    bench's hopper, cable to the powered stripper's hopper when owned, otherwise to the platform
    scale at the thing's as-found grade. The floor's slots stay inside its footprint.
17. **The advice line (2.10; behaviour).** Pieces already cut that wait where a yard hand takes from
    are the carry's backlog: the advice names a yard hand (a level, or another hand); the cutter
    binds only when uncut things wait on the floor and no carry backlog stands.
18. **The away card's unsold line (4.5).** Under the net: 'In the bays, not yet sold: {x}', the
    value at today's price of what the absence put into the bays and the merchant has not collected.
19. **As measured (REPORT6; E36).** The opening's eight beats, the first drive, the torch, rung 2,
    the first pour and rung 3 are in their bands on 12 to 15 of 15 seeds. Accepted misses: sales of
    §1,757 a minute at the hour's end against §2,000; a long absence after rung 2 buys the rest of
    the goal list; Hold never beats selling at once (reworked with the exchanges in the next stage).
