# Scrapyard stage 1: the first yard, buildable

Status: version 2, part one, 25 November 2026 (step `spec-stage1`); it replaces version 1. Authority: `ECONOMY.md` (E1 to E10) and `STAGE1-RULING.md` (S1 to S24), then section 14 of `docs/design/yard-design.md` (the master, D1 to D17), then the master's text, then `RULING.md`; where this document differs from them, it is wrong.

**Part one and part two.** A numbers prototype under the same decision files owns the rate engine (with the state, the tick, the actions' arithmetic and time away, 2.12 to 2.16), the map's coordinates, every number and the measured tables (2.18, section 1's minutes); part two lifts them in without changing the other sections. So a number is named by its content key (`tools.grinder.price`); "(example 300)" is version 1's or the master's value, for scale only; a minute is written only as E9's or S18's band; invented names are register ids in braces (5.1).

Conventions: § the currency symbol; m a metre on the ground plane (x east, y south); integer grams and hundredths in the rules, one rounding function `roundMoney`; p̄ a grade's usual price from content; "the boss" the player's worker.

---

## 1. The first yard

### 1.1 In five sentences

1. You take over {homeYard}, a small licensed yard full of old stock, and steer your worker with one thumb: stop beside a washing machine and it comes apart, piece by piece, onto the frame on your back.
2. The platform scale weighs each grade into its bay at today's posted price, and {merchant}'s flatbed collects every bay you have not held and pays by transfer.
3. A cable bundle on the yard's old hand stripper becomes bare bright copper worth tens of times the iron, and inside the first half hour a small crucible pours your first brass ingot.
4. You buy better tools and carriers and a truck that fetches loads from {partnerFarm} and {partnerDemolition}, and hire a yard hand, a cutter and a driver who keep the yard earning while you are away.
5. From the first second the industry table ranks 25 rival firms by tonnes supplied under "the largest full metal recycling and resource supplier", and you pass the first inside five minutes.

### 1.2 The first five minutes (storyboard; ruling 5 and E9 give the order)

0:00 is the moment the loading animation's gate parts (6.4). Bands are E9's for the normal hand on every seed (the slow hand within half as long again); the measured column is part two's.

| # | Band | On screen | Thumb | Sound |
|---|---|---|---|---|
| 0 | before 0:00 | The loading animation (6.4): plates spelling {title}, the display counting, a pour cooling to brass, the picture parting like gate leaves. | a tap skips it from the second launch | `load_*`, `gate_open` |
| 1 | 0:00 | Morning yard. The boss stands inside the gate at the public drop-off by a washing machine with a pulsing ring. Two steps west: the platform scale and weighbridge, the scale house and its board; beyond, the stripper pad (hand stripper, cable bundle) and the crucible pad with padlock chip, price and sample ingot; {merchant}'s flatbed at the stillages. Top bar "§0", "26th of 26 · next {rival.1} {t}", "0 / {kg} kg". Goal "Take the washer apart"; a ghost thumb drags lower left. | — | `amb_yard`, music |
| 2 | to about 0:15 | He stops beside it; the ring fills. The motor arcs onto his frame, then the top panel and a side; the drum and the other side drop beside him; the counterweight thuds into the rubble skip. "Load full". | drag, release | `cut_spanner`, `piece_steel`, `thud_waste` |
| 3 | within about 25 s (the first collection ticket) | Goal "Weigh it on the scale". The display counts; the weigh-in ticket rises out of its post with the muted "today's value", which slides onto the bay chip; the flatbed loads the bay for 3 s; the collection ticket prints at its cab ("Lot sold to {merchant}"); a coin arcs to the cash counter; the flatbed leaves on its round. | step on | `scale_beeps`, `scale_print`, `flatbed_load`, `coin` |
| 4 | to about 0:45 | Goal "Strip the cable". On the way he picks up the drum and side and weighs them in; their lot waits for the flatbed's return. | steer | `pickup` |
| 5 | by about 1:30 (the copper jump) | In the hopper zone the bundle feeds the hand stripper: PVC curls into its bin, copper spools into the tray. On the scale: "Bare bright copper", a short No.2 line, a muted "today's value" far larger than anything before, the lesson "Bare bright: {n} times iron's price today"; the flatbed returns, loads, pays; the cash counter jumps. | stand, step on | `stripper_hand`, `coin_big`, `lesson` |
| 6 | 60 s or more after the last prompt | Goal "Buy the sack truck" (the first prompt, S8): at the tool rack, "Open", its card ("Moves a washer in one trip"), Buy; a van sets it down; the boss pushes it. The next washer goes in one trip. | Open, Buy | `buy`, `van` |
| 7 | by 5:00 (slow 7:30) | Goal "Hire a yard hand": the rota card, Hire; a green vest walks out of the portacabin; two chalk circles appear. "Work the drop-off": what the boss cuts and cannot carry, the yard hand carries to the scale. | Open, Hire | `door` |
| 8 | first rival by 5:00 | On a collection the chip slides: "25th of 26 · passed {rival.1}". | — | `chip_slide` |

That is ruling 5's list in its order, at most one purchase prompt a minute. The opening does not depend on the route (S10): the first thing to work is where the boss stands, the bundle is by the stripper, the scales between; the prototype plays two opening routes (stripper first; heaps first) and reports both.

### 1.3 Minutes 5 to 60 (ordered; minutes are part two's)

The order of goals, purchases and arrivals; a band is given only where E7, E9 or S18 sets one. Every purchase is priced by the payback rule (E2), so the next useful purchase is never more than three minutes of play away for the normal hand, and at most one prompt comes a minute.

1. Buy the sledgehammer and angle grinder: zone 2 opens; the yard hand carries radiator sections from a chalk circle.
2. Buy the hook-lift truck; {partnerFarm}'s trial load is ready down the lane, its label readable from the gate.
3. **First drive out, 8 to 10 minutes** (S18): hook the trial load, back over the weighbridge (gross, tare, net), tip; cut and sort it while the yard hand carries the floor.
4. Buy the motor bench; break a motor. Pass {rival.2}.
5. **Rung 2 at 12 to 18 minutes** (E7): "Supply 2 t (3 metals)"; the crane hangs the sign; a radiation portal at the gate and the ID desk window ("Every load checked. Every seller identified. Payment by transfer only.").
6. Hire a cutter ("The yard now earns while you are away."); {foundry}'s supply deal appears (optional).
7. Buy the flat trolley, then the powered stripper.
8. Buy the crucible; "Charge the crucible" (Take from bays).
9. **First small pour, 18 to 25 minutes** (E9), waiting at "Ready to pour" for the boss (S11). Pass {rival.3}.
10. Hire a driver, who fetches the farm's loads when one is full, cash covers it and the floor has room.
11. Buy the cutting torch: zone 3 and {partnerDemolition} open; cut up the car (its converter sells on assay); fetch the demolition trial load.
12. Buy the Night watch: the away cap rises (`away.capH` → `away.capNightH`).
13. Named level goals, one at a time, each widening the current bottleneck (E2). Pass {rival.4}: four in the hour.
14. **Rung 3 at 55 to 65 minutes** (E7; slow by 90): "Supply {t} t (5 metals)"; second yard-hand and cutter places.

### 1.4 Days 1 to 3 (E8)

The owner may keep the concept test open, so the twice-a-day habit (two short sittings a day after a first hour) always has a useful purchase within two sittings for three days:
- Crew levels on the rota and machine levels on the process board, each priced by the payback rule (2.11); the second yard hand and the second cutter.
- {foundry}'s supply-deal series (2.9): each completed deal offers the next, larger one.
- Rivals passed up to {rival.8} (about 800 t in the master's list); the chip names the next one with the tonnes still needed.
- The capacity ceiling of rung 3 is a guard the normal player meets late, if at all (S16).
- The last goal walks the boss to the fenced back field. Its gate has a plain padlock and a sign: "Back field · the works are being built here". No text promises a date (E8, S20).

---

## 2. The rules

Pure TypeScript in `src/engine/salvage/`, deterministic: no `Date.now`, no `Math.random` (counter hashes `hash01(worldSeed, …)`, `worldSeed` a content constant). The screen never decides: it shows the rules' frame and events (2.14) and calls actions (2.15).

### 2.1 The hand

**Controls** are the ground work's: one full-screen responder; the stick where the thumb lands in the left 45 % of the safe area below its top 28 %; a second finger ignored; motion, collision and camera on the UI thread; a presence sample at most ten times a second (`{x, y, driving, moving, standingFor}`); the rules decide nearness from content positions.

**Work needs no button.** Within `reach.work` (example 1.4 m) of a workable thing, the stick released for `feel.workDelay`, the boss works the nearest one with his best tool; a ring shows the piece's progress; moving stops it and keeps the progress. Two tests bind (D12): walking past never works a thing; stopping beside it always starts work within half a second. The delay, speeds and camera lead are the world engineer's feel values, read from content. The pieces go onto the load in cut order while they fit, else drop beside the thing; waste goes to the rubble skip.

**Pickup** (S9): automatic within `reach.pickup` (example 1.0 m), moving or still, `pickup.secondsPerPiece` a piece, while capacity allows; highest p̄ per kilogram first (never the day's price), ties heavier first. **The swap**: load full, the boss still for the work delay, a piece of higher p̄ per kilogram in reach: the lowest-valued carried piece is put down and the better one taken; never while moving or inside a chalk circle; a test proves a swap never lowers the load's value. **Piece positions** are one pure function `piecePos(zone, thing, k)` of content, used by the rules, the frame, the screen and the bots.

**Chalk circles** appear and work only once a yard hand is hired: standing in one for the work delay puts the load down for the crew. **Feeding**: standing in a hopper zone feeds accepted pieces, highest p̄ per kilogram first, while the buffer has room. On the scale, in a hopper zone or in a circle the boss does only that; elsewhere pickup and work run together.

**Carriers** (S8, `carry.*`): tier 1 the carry frame, a hand load of at most `carry.frame.kg` (example 30 kg, tune 25 to 30); every larger carrier has wheels: the sack truck, then the flat trolley (names and capacities the prototype's). Nobody is drawn bearing more than the hand load; loads are pieces strapped on, never a tower.

**The one button** (60 pt, lower right): "Open" at a place, "Step out" while driving, blank elsewhere; pressed only with the stick released. Vehicles are entered by walking into them.

### 2.2 The two scales, weighing in, tickets

**Two scales** side by side in the hero frame (S2): the **platform scale** for loads on foot (0.1 kg, up to `scale.platform.maxKg`, example 300 kg) and the **weighbridge** for the truck (20 kg steps). Standing on the platform with a load for `scale.dwellS` weighs it in: every carried piece goes into its grade's bay, a whole thing at its unprepared grade, and a **weigh-in ticket** prints with no payment on it. Driving onto the weighbridge with a loaded skip weighs the skip in (2.7). A crew's flow is weighed in where it ends; the screen shows it as a chip (4.4).

**One rounding rule.** A printed mass is the grams rounded half up to the scale's step (0.1 kg on the platform and on lots, 20 kg on the weighbridge); a line's amount is `roundMoney(resolved kg × price)`; a total is the sum of its lines. A lot takes the resolved grams and leaves the remainder in the bay. **One mass format**: one decimal below 100 kg ("28.6 kg"), whole kilograms from 100 kg ("1,020 kg"), tonnes with two decimals from 10 t, from 1 t for ferrous ("12.34 t"). Money to the hundredth below §1,000, whole from §1,000 ("§3,148"), three figures with k or M from §100,000.

**Tickets and their wording** (S1, S3, D8):

| Ticket | Prints | Legal line |
|---|---|---|
| Weigh-in (platform) | "{homeYard} · scale · No. {n}", the date; up to three grade lines (grade, kg, "§{p}/kg today"), "+ {n} more"; muted "today's value §{x}"; at most one lesson | "Weighed into bays · not yet sold" |
| Drop-off slip | "{thing} · signed in · gate drop-off" | the line itself |
| Skip weigh-in (weighbridge) | "{partner} · {load}"; "Gross {a} kg · Tare {b} kg · Net {c} kg" (tare: the truck's stored tare plus the empty skip, no second pass); the price paid | "Seller ID checked · paid by transfer" |
| Collection | "{homeYard} · ticket {n}"; up to three grade lines (grade, kg, amount), "+ {n} more"; "Paid §{x}" | "Lot sold to {merchant}" / "weighed out · paid by transfer" |
| Deal delivery | "{foundry} · {kg} cast iron · §{x}" | "weighed out · paid by transfer" |

The site licence hangs on the portacabin wall from the first second. Closed vessels read "certified empty" on the thing, its card and its ticket line.

### 2.3 Bays, Hold, the merchant's round, what "supplied" counts

**Bays**: one per grade (lock-block ferrous bays, stillages, the converter cage), holding up to `bays.{grade}.kg` (the master's two hours of flow). Its chip: "{grade} {kg} · today §{x}", the day word when not usual, "held" when held.

**Hold** (the bay's card, the board's row) keeps a bay off the round, free; a full held bay still takes weigh-ins and the round takes only the grams above its capacity. **Sell** on a held bay sells its stock at the price on the card (shown equals applied, 2.8): set aside, it goes on the next load; Hold stays on. **Reservations are not Hold**: the crucible's "Take from bays" reserves one charge of its grade from incoming weigh-ins (2.5), the deal reserves cast iron up to the next delivery (2.9); the round never takes reserved grams.

**The merchant's round** (S1; one rule live and away, an event of the rate engine): {merchant}'s flatbed waits at its stand when idle. When any bay not held, or stock set aside by Sell, has collectable grams, it loads for `round.loadS` (example 3 s) what was collectable when loading began, pays, prints one collection ticket, and is away for `round.awayS` (example 20 s, tune 15 to 30); stock arriving meanwhile waits for its return. So the first paid ticket comes one load after the first weigh-in, later ones at most `round.awayS + round.loadS` after theirs, and several grades come as one ticket. A lot is paid at the posted price of the day the flatbed pays; Sell's stock at its shown price.

**Supplied** counts collected lots only (collection tickets and deal deliveries), lifetime, never falling; never weigh-ins, stock in bays, reserves, waste. The first-ticket beat is measured on the first collection ticket.

### 2.4 Things, tools and how each thing comes apart

**Things** are content (`objects.{id}`): a name, a tool tier, pieces in cut order (grade, mass, hardness), waste ("to a licensed waste carrier", through the rubble skip or the stripper's bin), an unprepared grade if it may be carried whole, a source (2.7), and a "certified empty" flag for closed vessels. **Cut time per piece** t = max(`cut.minS`, m × h / P): m kilograms, h hardness, P the tool's power in kg/s. A thing needing a higher tier shows its padlock chip "Needs a sledgehammer" or "Needs a cutting torch".

**Tools** (one rack; each tier one purchase; `tools.{id}.price`, `tools.{id}.power`): tier 1 **spanners and bolt cutters** (owned: appliances, bicycles, crates, cable); tier 2 **sledgehammer and angle grinder** (S6: the sledge breaks cast iron, the grinder cuts thin steel); tier 3 **cutting torch** (oxy-propane: beams, the car's body, the tank; opens {partnerDemolition}). The work animation follows the piece's family.

**The yard is full** (E1): old stock in heaps by zone, several tonnes in all (`stock.{zone}`), enough that a normal player is still working through it at minute 30, the better material in the later zones. **Zone 1** (spanners): washing machines, bicycles, heavy cable offcut bundles, crates of brass taps and fittings. **Zone 2** (sledge and grinder): cast-iron radiators, copper cylinders "certified empty", a cast-iron bath, field gates and railings. **Zone 3** (torch): the car, steel beams, a steel tank "certified empty".

**The public drop-off** (E1's trickle that never stops; the no-dead-end source): a car with a trailer leaves one thing every `dropoff.everyS` while fewer than `dropoff.slots` wait, each signed in with its slip (2.2). The first arrivals are fixed in content (`dropoff.first[]`, the same for every player, so the opening does not depend on the seed); later ones are drawn by counter hash from `dropoff.mix` (washers, bicycles, radiators, heavy cable offcuts, brass taps, copper cylinders certified empty: copper and brass come back every few minutes). Never a converter or a sealed vessel.

**How things come apart** (S6, held against `yard-metals.md`; masses and shares are content):
- **Washing machine**: a whole motor, a top panel of about 4 kg and two cabinet sides (light iron), a stainless drum (sold as light iron in this stage, with the lesson that it pays more once stainless is sorted), the concrete counterweight (waste).
- **Bicycle**: frame and wheels, light iron (an old bicycle's rims are steel).
- **Heavy cable offcuts**: stripped (2.5), or sold whole as "Insulated cable" priced from its yield (S4: `grades.cab.yieldShare`, example 0.85, of the value of the copper it holds).
- **Taps, fittings**: yellow brass. **Radiator, bath, stove**: broken into cast-iron sections, or carried whole on wheels at "cast iron". **Copper cylinder**: shell (No.2 copper) and brass fittings. **Gates, railings**: light iron.
- **Electric motor**: on the motor bench, windings (No.2 copper), steel (light iron) and cast-aluminium end caps, in the trade's shares (`machines.bench.shares`; a small motor is about a tenth copper, never a quarter).
- **Beam, tank**: cut by the torch to "HMS 1&2 (80:20)"; uncut, "Heavy steel, unprepared".
- **The car** (S7, D11): labelled "End-of-life car from {partnerDemolition} · depolluted · treatment record ref. 0012", in zone 3 from the first second. Depollution has taken out its fluids, battery and tyres. It gives four aluminium wheels, the wiring loom (sold whole as "Thin cable" at its lower yield), the catalytic converter (sold whole on assay; ticket line "from car ref. 0012"), the body ("Car body (shredder feed)") and waste to a licensed waste carrier. Its content source id is `{type: 'partner', partner: 'partnerDemolition', ref: '0012'}`; a test refuses a converter without one.

**Grades** (content `grades.{id}`; p̄ from the master's 4.2 in true proportion, S5: brass at least 0.55 of copper, the ingot's margin from the crucible). Short names (≤ 18 characters) on tickets and chips; long names on cards and in Help.

| id | Short name | Material | Family | Kind | p̄ (example §/kg) |
|---|---|---|---|---|---|
| li | Light iron | light iron | ferrous | product | 0.50 |
| ci | Cast iron | cast iron | ferrous | product | 0.95 |
| hms | HMS 1&2 (80:20) | steel | ferrous | product | 1.20 |
| hmsu | Steel, unprepared | steel | ferrous | product | 0.85 |
| body | Car body | steel | ferrous | product | 0.70 |
| alw | Aluminium wheels | aluminium | non-ferrous | product | 5.60 |
| alc | Cast aluminium | aluminium | non-ferrous | product | (prototype) |
| ali | Alu alloy ingot | aluminium | non-ferrous | product | 8.70 |
| ald | Aluminium dross | aluminium | non-ferrous | product | 0.80 |
| brs | Yellow brass | brass | non-ferrous | product | 19.50 |
| bri | Brass ingot | brass | non-ferrous | product | 25.00 |
| brd | Brass dross | brass | non-ferrous | product | 2.00 |
| no2 | No.2 copper | copper | non-ferrous | product | 34.30 |
| bb | Bare bright copper | copper | non-ferrous | product | 35.50 |
| mot | Electric motor | — | non-ferrous | intermediate | (prototype) |
| cab, cabt | Insulated cable, Thin cable | — | non-ferrous | intermediate | from yield |
| cat | Converter, whole | — | precious | intermediate | a piece, on assay |

Intermediates count tonnes but no range. The converter is paid by the master's payables (4.3), printed on its cage card: "Paid on assay: platinum 75 %, palladium 75 %, rhodium 65 %, less ceramic and assay fee" (`grades.cat.*`); if it floods the hour's last quarter its payables fall (E10).

### 2.5 Machines as the player meets them, and the process board

Machines stand on fixed pads with an input buffer, a rate (the crucible a heat), an out tray and levels bought on their process-board plate. Nothing costs by the clock; a full tray stops a machine and nothing is lost; outputs keep mass exactly. Rates, buffers and level effects are content, their arithmetic the rate engine's.

- **Hand stripper** (inherited, S4): on the stripper pad from the first second, lit on the board, its card "Came with the yard"; the bundle of heavy cable offcuts beside it (`stock.bundle.kg`, example 12 kg). Cable → `machines.strip.copperShare` (example 0.70) copper, `machines.strip.tinnedShare` of it tinned (No.2), the rest bare bright; PVC to its bin. Rate `machines.handStripper.kgS` (example 1 kg/s).
- **Powered stripper**: a purchase on the same pad, same inputs, `machines.powerStripper.kgS` (example 6 kg/s); fed first.
- **Motor bench**: whole motors → No.2 copper, light iron, cast aluminium.
- **Crucible** (S11), under its extraction hood, padlocked with price and sample ingot from 0:00. Recipes **brass** (yellow brass → brass ingot + dross) and **aluminium** (aluminium wheels only → aluminium alloy ingot + dross). The charge is taken by mass: "Take from bays" (on by default) reserves the recipe's grade from incoming weigh-ins up to one charge; carriers may also feed the hopper. The charge is new metal plus the heel, capped at `machines.crucible.potKg`; heat time and dross count the new metal only; metal is cast in ingots of `machines.crucible.ingotKg` (example 5 kg) and less than one ingot stays as the heel. A heat starts when the pot is full, or at `machines.crucible.minFill` after `machines.crucible.waitS` without feed. A recipe change with a heel first asks "Pour the heel as a short ingot?", pours it as one short ingot of its grade, and switches; refused during a heat. **The first heat ever** waits at "Ready to pour" until the boss is within 6 m, then pours with a camera nudge; later heats pour when they end. A person in face shield and aluminised apron is drawn at every pour (the boss within 6 m, else the nearest crew member: a picture). Ingots cool to their metal's colour in 3 s.

**The process board** (D16, S15), the progression screen (an office tab and a clipboard row): enamel plates joined as a tree; a plate opens its machine's card; machine levels are bought on the plates.

| Row | Plates |
|---|---|
| Cable | Hand stripper (lit from the start) → Powered stripper |
| Motors | Motor bench |
| Melt | Crucible → Brass recipe, Aluminium recipe |
| Greyed, a plain padlock | Bronze · Lead · Lithium · Platinum group and iridium · Tungsten |

A greyed plate names its material and nothing else: no price, no machine, no promise (S15, the lead's note 2). It is where the owner's list of metals first shows.

### 2.6 Crew

Three roles, hired and levelled on the office's **rota** (S15); each hire walks out of the portacabin door. Vests: yard hand green, cutter blue, driver teal (the style sheet); the boss hi-vis with a white hat. Crew work is a rate from the rate engine, live and away (E5); a crew member walking with a load is a picture of the flow. First names from `crew-names.json`.
- **Yard hand** carries. **One priority** (S12), by place and inside each place by p̄ per kilogram: (1) machine hoppers with room whose input is waiting, (2) chalk circles, (3) out trays, (4) the drop-off's front, (5) the tipping floor; to a hopper that takes the grade, else to the platform scale. He also carries a whole uncut thing of at most his load from the drop-off or the tipping floor to the scale at its unprepared grade (E4), so the yard earns, slowly, without the boss. Never from the old-stock heaps: the chalk circles are how the boss hands them over.
- **Cutter** cuts uncut things at the drop-off, then on the tipping floor, with the yard's best tool, never what the boss works and never the heaps.
- **Driver** takes the truck when the boss is not in it, to the partner whose load has been full longest, only if cash covers its price and the tipping floor has room for all of it (S12); hooks, returns, weighs in, tips, parks.
- **Slots**: one of each; a second yard hand and cutter at rung 3.
- **The foreman** (master 3.4): crews and machines run faster by `foreman.boost` while the boss has worked in the last `foreman.windowS`, for at most `foreman.minutesPerDay` (example 45) of each market day, shown by a meter on his vest; never away.

### 2.7 Partners, labels, trial loads, skips, the truck, the tipping floor

**Partners** (`partners.{id}`): {partnerFarm} opens with the truck; {partnerDemolition} opens with the torch and stands on the lane before the weight-limited bridge (S18). Each has a site with a skip zone, a sign and a business card ({farmContact}, {demolitionContact}) on its office card.

**Loads are honest** (E3, master 5.3). A load's **contents are fixed when its skip fills** (a counter hash over `partners.{id}.mix`) and printed on its label by thing and grade with kilograms, with its price, before anyone hooks it; the weigh-in equals the label; nothing is drawn after paying. Price = `roundMoney(partners.k × as-found value at the day's prices)`, `partners.k` example 0.70; as found prices motors, cable, uncut steel and whole cast iron as they are, so the margin is the yard's preparing. Mixes are material the yard's tools and machines improve, in the trade's proportions. **The first load from each partner is a small trial load** at a fixed price a new yard can pay (`partners.{id}.trial.*`). After a hook the next skip fills in `partners.{id}.fillS`.

**The label** (a world plate and the skip card): "{partner} · full" or "trial load", net mass, up to three thing lines and "+ n more", the price, and why it cannot be hooked ("Filling · full in {m} m {s} s", "Needs §{x} more", "The tipping floor needs {n} places: {m} free"). The card lists every thing.

**The truck** (hook-lift, one purchase) drives in and parks; entered by walking into it, left with "Step out"; carries one skip, never pieces; swaps, never crushes or tows. Its last stopped position is rules state (the driver walks to it). Speeds are feel values (`truck.speed.*`).

**Hook**: still in the skip zone for `truck.hookDwellS`, the load full, cash covering its price and the tipping floor with room for all of it: a swap ring of `truck.swapS` (moving restarts it), then the price is paid by transfer and the next skip starts filling. A load that cannot be tipped is never paid for (test). **Weigh-in** over the weighbridge (2.2), then **tip** at the tipping floor's zone: each cuttable thing takes a place on its grid (`floor.places`), loose material goes to its pile at `piecePos`; the boss and the cutter cut it, the yard hand carries it.

### 2.8 The posted price board, the market clock, Hold's signal

**The market clock** (S14, master 5.2): t_m = max(device now, clockHigh + live monotonic time since the last resume), saved, never backwards, advancing in live play after a clock-back; live time from `performance.now`, passed in. Day D = floor((t_m − `board.epoch`) / 86,400 s), the epoch a Monday 00:00 UTC. A gap over `away.gapS` (example 2 s) goes to the away pass, the same engine (E5). The rules keep running under an open overlay (the boss stands); the ground work's "the yard stops under them" changes to match.

**One posted price a day per family** (ferrous, non-ferrous; precious for the converter only): x_f(D) = Σ_{k=0..29} 0.5^k × `board.a` × w_f(D − 1 − k), w_f(n) = 2 × hash01(worldSeed, f, n) − 1 (`board.a` example 0.03, tune 0.02 to 0.05); p_g(D) = round(p̄_g × (1 + x_f(D))) in hundredths. A pure function of D: every phone shows the same board, nothing is saved.

**The day word**, Hold's signal: **low day** (x < −`board.wordBand`, example 1.5 %), **usual**, **high day**; on the board, each row and each bay chip when not usual. The board's first opening shows the fictional line and points at a day word ("Cast iron: a low day. Holding is free.").

**Shown equals applied**: every Sell carries the step it showed (`sell(grade, shown)`, shown = {D, price, grams}); if D has changed when the tap lands, "Price updated: §{a} → §{b}" asks again.

### 2.9 The supply deal

{foundry} appears on the office's partner wall at rung 2 with "{q} kg of cast iron a day for {d} days at §{p} a kilo, locked at signing" (S21: "supply deal", never "contract"); p = round(A_ci(D) × (1 + `deal.premium`)), A_ci the mean of the last seven days' cast-iron prices. After signing, cast iron weighed in first fills a reserve of q in its bay ("Reserved for {foundry} {a} / {q} kg"). At each 00:00 UTC, before anything else: delivered = min(q, reserve), paid and supplied on a delivery ticket; trust (0 to 100, `deal.trust.*`) rises for a full day and falls for a short one; **nothing is ever charged for a miss**. After d deliveries the next deal of the series is offered (`deal.series[]`: q, d, premium per step). Trust gates nothing in stage 1; it is shown on the card.

### 2.10 Goals and the advice line

**Goals** (`goals[]`: text ≤ 30 characters, the chevron's target, a done condition read from the rules' state, an optional purchase; the card shows the first unfinished). A purchase goal shows no sooner than `goals.promptGapS` (example 60 s) after the previous prompt: at most one prompt a minute. No goal is met by doing nothing.

**The advice line** (the expanded card's third line, the only line after the last goal; no label): the cheapest useful purchase priced at most cash plus `advice.minutes` (example 3) minutes of income. Useful means it widens the current bottleneck (E2): it raises the rate engine's income rate now, or it is a hire that makes a later hire raise it. A purchase that changes nothing is never offered, and is refused with its reason. Income is the steady rate plus the boss's collected sales of the last five minutes.

### 2.11 Rungs, range, ceilings, the industry table and rivals

**Rungs are positions, never titles** (S15, D8, D16). Rung r is entered at `ladder.rung{r}.t` lifetime supplied (rung 2 example 2 t; rung 3 from the tuned hour) and range `ladder.rung{r}.range` (3, then 5). The crane hangs "{homeYard} · {t} supplied"; goals read "Supply 2 t (3 metals)"; refusals "Opens at 2 t supplied". Rung 2's portal and ID desk are equipment, never the yard becoming licensed. Rungs 4 to 9 show on the table with their gates and a padlock.

**Range**: a material counts once its lifetime supplied products are worth `ladder.theta` (example §300) at p̄. Stage 1 offers six (light iron, cast iron, steel, aluminium, brass, copper) and rung 3 asks five, so a hand that skips the torch still gets there. Intermediates count tonnes only.

**Prices come from the payback rule** (E2, S16): anything that raises income costs `shop.{item}.paybackMin` minutes of the income it adds (one to three for the first five purchases, rising through the hour; from rung 3 `shop.tauRung3`, example 9 h), derived by the prototype from the rate engine and marked as tuned in the content. **Rated capacity R** (t/h) is the rate engine's throughput of the current assets with full feed and no boss. **Ceilings** are a guard (D5): `ladder.ceiling.r1/r2/r3` (example 6, 20, 160 t/h); a purchase lifting R over its rung's ceiling is refused ("Yard capacity {c} t/h · grows at {t} supplied").

**The industry table** (notice board and chip): the top line "the largest full metal recycling and resource supplier", nine rungs (current lit, next with its gates), range chips, 26 rows (rank, 24 pt plate logo, chip name, tonnes, "simulated"), the player pinned, "Rival firms (simulated)".

**Rivals** (S17): {rival.1} to {rival.25} from the register (chip names ≤ 14 characters) with the master's pass points; T_i(d) = `rivals.{i}.t0` × (1 + g × min(d, 40)), d market days since the player's start. A passed rival never passes back: growth and start are chosen so that it rarely would, and as a guard the k-th rival below the player shows at most (1 − 0.03 k) of the player's tonnes, so no two rows print the same figure (test). Position never falls while away; "Passed {rival}" fires once.

### 2.12 The rate engine (part two)

Must settle the stocks (things and pieces by place, buffers, trays, bays, reserves, skips, cash), the rates between them, how a carrier shares its time under 2.6's priority, piece-size limits and the drop-off's slots, and the events at which rates change (a stock empties or fills, a slot frees, a heat ends, a load fills, the day's price, cash reaching a gated price, the round's load and return, a delivery). Live and away advance this one model from one function, event to event; the 10 Hz tick is the same function with a small step (E5).
The rest relies on: R(assets) and the income rate (2.10, 2.11); the round as an event (2.3); the heel and the first-pour wait (2.5); the driver's and the hook's gates (2.6, 2.7); E4's earning without the hand; exact agreement of ticking and jumping on every bot run.

### 2.13 The state and the derived values (part two)

Must settle `SalvageState` field by field (save tag `salvage1`) and the pure derived values the screens call.
The cards read: cash; supplied; range per material; rung; bays (grams, held, reserved, set aside); the market day; machines (owned, level, status, buffer, tray, heat phase, heel, recipe, Take from bays); crew (role, level, job and phase); partners (filling or full, contents, price, trial used); the truck (owned, place, skip); the deal; the goal and last prompt; the foreman meter; a waiting away report; the last 50 tickets; rivals passed; the clock's high mark. Derived: `priceOf`, `boardRows`, `ticketLines`, `cardOf(place)` (each row with its exact price and refusal key), `skipLabel`, `rankRows`, `rangeChips`, `nextGoal`, `advice`, `processBoard`, `piecePos`, `frame(state)`.

### 2.14 What a tick does (part two)

Must settle the order of one tick and what it returns: `tick(content, state, dt, now) → {state, events}`, every event with a typed payload in `types.ts`.
The screens and the sound consume these events: `workStart`, `pieceOff {thing, grade, g, to: load | ground | waste}`, `pickup`, `swap`, `loadFull`, `feed`, `weighIn {ticket}`, `dropOffSlip {thing}`, `collected {ticket}`, `machineOut`, `heatStart`, `readyToPour`, `pour {ingots}`, `skipFull {partner}`, `hook`, `bridgeWeighIn {ticket}`, `tip`, `arrival {kind: drop-off | flatbed | van | truck | crew}`, `owned {item}`, `hired {role}`, `refused {key, args}`, `rung {n}`, `passed {rival}`, `dealDelivered {ticket}`, `goal {n}`, `lesson {grade}`, `awayReport`.

### 2.15 Every player action (part two)

Must settle each action's checks, refusals and arithmetic.
The cards rely on these actions and refusal keys (5.4): `presence(sample)`, `buy(item, shownPrice)`, `hire(role, shownPrice)`, `level(target, shownPrice)`, `setHold(grade, on)`, `sell(grade, shown)`, `setRecipe(recipe, confirmHeel)`, `setFromBays(on)`, `signDeal(shownTerms)`, `stepOut()`, `ackAway()`. Every purchase checks that the shown price is the price; a changed price re-asks.

### 2.16 Time away (part two)

Must settle the away pass as the same engine (E5): its cap A = min(t_m − max(lastSaved, clockHigh), Cap), Cap `away.capH` or `away.capNightH`; payment when computed and recorded under clockHigh so a jump never pays twice (`paysOnCompute: true`, `catchUpSeconds: 0`); no boss, no foreman.
The rest relies on: E4 (without the hand the yard still earns enough, slowly, for the next purchase) and S13 (the first away card after a first sitting of five minutes or more shows earnings above zero); the away card's lines (4.4); position never falling while away.

### 2.17 The content data (part two)

Must list every key of the prototype's content file (`proto/content2.json` in the shared notes folder) as it lands in `src/config/salvage.content.ts`, with meaning and unit: every key this document names (`reach.*`, `feel.*`, `pickup.*`, `carry.*`, `scale.*`, `round.*`, `bays.*`, `cut.*`, `tools.*`, `stock.*`, `objects.*`, `grades.*`, `machines.*`, `crew.*`, `foreman.*`, `partners.*`, `truck.*`, `floor.*`, `board.*`, `deal.*`, `goals.*`, `advice.*`, `shop.*`, `ladder.*`, `rivals.*`, `away.*`, `dropoff.*`, the map) and the frozen test content's differences.

### 2.18 The first hour as measured (part two)

Must give, for the normal, fast and slow hands on at least fifteen seeds and both opening routes (S24): each beat of 1.2 and 1.3 as a range and as the share of runs inside its band; a minute-by-minute table (sales, spend, cash, supplied, rank, event) for the normal hand on one seed, each row adding up; purchase gaps over three minutes; the away share at minute 60 (S13).

---

## 3. The yard as a map

The ground work's yard as it is: fenced, 64 × 40 m, three screens wide at 844 × 390, split north to south by the container wall with its wide gap (the truck passes) and its 1.4 m gap (people only); the lane runs east from the gate. Coordinates are the prototype's (S19: the routes are its distances), lifted here in part two; positions flow content → game.json → the rules and the screen (S23). What stands near what, and why:

- **The gate side.** The boss starts just inside the east gate at the **public drop-off**, where the first washer stands (S10). The **portacabin office** (the site licence on its wall; crews walk out of its door), the **tool rack** and the **notice board** (the industry table) stand beside it. The rung-2 portal spans the drive-in line.
- **The working core, the hero frame** (S19): one frame of 21 × 9 m west of the gate holds the **platform scale** and **weighbridge** side by side, the **scale house** with the posted board facing the yard, the **stripper pad** (hand stripper and bundle; later the powered stripper), the **crucible pad** (hood, padlock chip, sample ingot) and the **copper and brass stillages** with {merchant}'s flatbed stand in front. The scales lie between the drop-off and the stripper, so the opening walk is drop-off → scale → stripper → scale from either route. A test puts the camera at the hero spot and checks they all lie between the top bar and the bottom row at 844 × 390; `?view=hero` shows it (the first store screenshot: copper, a ticket and a pour in one real frame).
- **Beside the core**: the **ferrous bays** next to the scales on the far side from the stillages (the flatbed loads both from one stand); the other stillages and the converter cage; the rubble skip and PVC bin; the **motor bench pad** by the stripper pad; the **tipping floor** within 12 m of the scales, with the **truck park** beside it on the truck's line from the weighbridge.
- **The old stock** in heaps, farther from the core as the tier rises (E1): zone 1 between the core and the container wall (the first chalk circle beside it once a yard hand is hired); zone 2 along the wall by its wide gap, its padlock chips readable from zone 1; zone 3 through the wide gap: the car, the beams, the tank.
- **The back field**: the west fence's gate, a plain padlock and its sign (1.4).
- **The lane** (length part two): {partnerFarm}'s site first, its load and label in view from the gate; {partnerDemolition}'s site farther, its gate shut with "Needs a cutting torch"; the **weight-limited bridge** ("Weight limit 7.5 t", a padlock) to stage 2's partners, who are not named; a plain barrier at the lane's end.

**Solid**: fences, the container wall, buildings, the tool rack, machine bodies, the crucible and hood, stillages, lock-block walls, the rubble skip, uncut things, the car, the notice board, the bridge's rails, partner sheds; not solid: decals (scale plates, pads, the tipping floor, chalk circles, lines) and pieces on the ground. The truck (`truck.radius`) cannot pass between stillages or into the heaps.

**Where purchases arrive**: a machine on a flatbed whose crane sets it on its pad (it works from the set-down, timed by the rules from content); tools and carriers by van at the rack; the truck drives to its park; crews walk out of the office; the Night watch is a sheet on the rota board.

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

Nothing from the market sits in the top bar; there is no spare slot. Bar text is sized by hand from min(fontScale, 1.3) with `allowFontScaling={false}` in rows whose heights add up. At 667 at most four HUD lines. The goal card sits left under the bar (400 pt at 844, 340 at 667), one 12 pt line with progress at its right; a tap opens three lines (goal, next, the advice line, 84 pt tall), closed after 6 s or a tap. The one button is a 60 pt hi-vis disc, label 13 pt; the stick is the ground work's.

### 4.2 World labels

Plates of 11 pt on paper chips: place names on first sight; padlock chips over locked things and pads (padlock, the condition, the exact price where there is one); bay chips (4.4); skip labels (2.7); the chevron (hi-vis, over the goal's target; an edge arrow when it is off screen). Every place label is at most 18 characters.

### 4.3 Overlays

The mode's own views registered with `useOverlay`, one at a time, closed by the scrim or Android back; never the kit Sheet or a `Modal`; the rules keep running beneath (2.8).
- **Right panel**: min(520, 0.58 W) at 844 (489 pt), 0.62 W at 667 (413 pt), from the bar to the bottom inset, the place dimmed at the left. Title 15 pt; rows 44 pt (name 13 pt, effect line 11 pt of at most 38 characters; 31 pt of text at 1.3); Buy 96 × 36, its price 13 pt bold.
- **Wide card** (the process board): the safe width less 12 pt a side (726 at 844, 611 at 667), bar to bottom inset.
- **Centred card** (away card, rung sign, confirmations): at most 520 × 300.

| Overlay | Kind | Prints |
|---|---|---|
| Tool rack | panel | per tool and carrier: name, effect ("Breaks cast iron; cuts sheet faster", "Moves a washer in one trip"), Owned or Buy with price, or padlock and condition |
| Office: Rota | panel tab | first line "Site licence · metal dealer"; per role: first name, level, rate in words and number ("Carries 2.3 kg a second"), Hire or Level with price, or "Opens at {t} supplied"; the Night watch "Away cap {a} h → {b} h" |
| Office: Partners | panel tab | per partner its business card, the load's state, its condition; the supply deal from rung 2 |
| Office: Process board | wide card | 4.5 |
| Machine | panel | before: what it does, in → out, rate, Buy; after: input, tray, status ("Working", "Tray full", "Waiting for cable"), rate, "Level on the process board"; crucible: recipe, Take from bays, "{a} / {b} kg", "Pours in {m} m {s} s" or "Ready to pour", heel |
| Price board; Bay | panel | 4.4 (a bay opens the board at its row) |
| Skip | panel | 2.7 |
| Supply deal | centred | terms, Sign, Not now; then days left, reserve, trust, last delivery |
| Industry table | panel | 2.11 |
| Away card; Rung sign | centred | 4.4; the crane hanging "{homeYard} · {t} supplied", what it opens |
| Clipboard | panel | goals (done ticked), places visited (each opens its card), ticket history (50), Settings |
| Settings and Help | panel | Sound, Music, Haptics; Help (every lesson in full, a glossary, the shortened-time line); the fictional line; privacy; version; "Start the yard again" with a confirming card |

### 4.4 Tickets, the bay chip, the board, the away card

**The eye path of a sale** (the lead's note 1): scale display → bay chip → flatbed → cash counter, all in the hero frame and the top bar.
1. **Weigh-in ticket**: rises out of the display post (world-anchored, clamped inside the free world), ticket paper (yard-style 8), 280 pt wide at 844 and 260 at 667, at most 150 pt tall at font scale 1.3: a hi-vis header; up to three grade rows in three columns (short name, kilograms, "§{p}/kg today") and "+ {n} more"; the muted row "today's value §{x}"; the 11 pt legal line; at most one 11 pt lesson. After `ui.weighInS` it folds and the muted value slides down to the bay chip.
2. **Bay chip** (at the bay by the flatbed's stand): "{grade} {kg} · today §{x}" in the same muted grey; when the flatbed loads, the value slides into its bed.
3. **Collection ticket**: prints at the flatbed's cab, same paper and size, amounts in ink, "Paid §{x}" bold, the two-line legal line; a coin arcs from the cab to the cash counter, which rolls. A tap opens the history.
4. Once crews work, a crew weigh-in is a one-line chip at the scale ("Yard hand · 58.2 kg in") and a collection without the boss's weigh-in or a grade's first lot a one-line chip at the cab ("Lot sold · §29.00"); one ticket of each kind at a time.
5. In the first five minutes lessons show only on the value jumps (copper, brass, the converter); others wait for the grade's next weigh-in.

**The price board** (panel): "Market day {date} (UTC) · next prices in {h} h {m} m"; per grade seen a two-line row of 56 pt: pictogram, name, today's price, day word, Hold; five bars with the usual-price tick, the bay's stock, Sell with its total.

**The away card** (centred): "Away {h} h {m} m (cap {c} h)"; up to five grade lines and "+ {n} more"; "{t} supplied · §{x} (already in your account)"; loads fetched; deal deliveries; "You passed {rival}."; OK. With little to show it says what would have earned more ("A cutter keeps the yard working while you are away (Office)"). No ad button in stage 1.

### 4.5 The process board (wide card)

Title "Process board" 15 pt; four rows of plates of 2.5. Plates are enamel: 132 × 60 at 844, 120 × 60 at 667, a name of up to two lines of 12 characters (12 pt) and a state line (11 pt: "Owned · level 2", "§{price}", "Level {n} · §{price}", a padlock); joined by riveted bars of 24 pt (20 at 667). Rows 60 pt with 12 pt between: 4 × 60 + 3 × 12 + a 32 pt title = 308 pt, inside 333 (844) and 325 (667). Row 4's five greyed plates are 108 pt wide at 844 and 112 at 667 with 12 and 10 pt between; a greyed plate has no state line, so its name may take three lines of 11 characters ("Platinum / group and / iridium") beside the padlock. A lit plate's tap opens its machine card; a greyed plate's tap shows only its padlock.

### 4.6 Text limits (S20, checked by `scripts/content/yard/check.ts` at 667 pt wide and font scale 1.3)

Goal text ≤ 30 characters; a panel's effect line ≤ 38; a grade's short name ≤ 18; a place label ≤ 18; a rival's chip name ≤ 14; a ticket ≤ three grade lines and "+ n more", one lesson line ≤ 48, total height ≤ 150 pt; board rows two lines; the legal line 11 pt; nothing under 11 pt. No text promises a future update; locked things show a padlock and a plain condition.

---

## 5. Content

### 5.1 Invented names by register id

Every invented name comes from `scripts/content/yard/names.json` by id and is never written as a literal in a document or in code (D13, S21). The ids this document uses:

| Id | What |
|---|---|
| `{title}` | the game's title (three words, one plate each in the loading animation) |
| `{currency}` | the currency's name; its symbol is § |
| `{homeYard}` | the player's yard |
| `{homeLane}` | the lane outside the gate |
| `{merchant}` | the stage-1 buyer whose flatbed collects the bays (not a rival) |
| `{partnerFarm}`, `{farmContact}` | the farm-clearance partner and its contact |
| `{partnerDemolition}`, `{demolitionContact}` | the demolition partner and its contact |
| `{foundry}` | the supply-deal partner |
| `{rival.1}` to `{rival.25}` | the rival firms in pass order |
| crew first names | `crew-names.json` |

### 5.2 Labels and lines (`src/ui/salvage/strings.ts`; names of things from game.json)

HUD: "§{n}"; "{rank} of {n} · next {rival} {t}" (short "{rank} · next {rival}", "{rank} · {t} to next"); "{a} / {b} kg"; "Load full"; "Open"; "Step out"; "Trial load {kg}".
Places (≤ 18): Tool rack, Office, Scale house, Platform scale, Weighbridge, Notice board, Public drop-off, Rubble skip, Tipping floor, Truck park, Stripper pad, Motor bench, Crucible, Old stock, Back field.
Chips: "{grade} {kg} · today §{x}", "held", "low day", "high day", "Reserved for {foundry} {a} / {b} kg", "For the crucible {a} / {b} kg".
Cards: "Buy §{x}", "Hire §{x}", "Level {n} → {m} · §{x}", "Owned", "Came with the yard", "Sell {kg} · §{x}", "Hold", "Sign", "Not now", "Take from bays", "Pours in {m} m {s} s", "Ready to pour", "Pour the heel as a short ingot?", "Working", "Tray full", "Waiting for {grade}"; machine lines "Strips heavy cable to copper", "Breaks motors into copper, steel, aluminium", "Melts brass or wheels into ingots".
Lines: "Every load checked. Every seller identified. Payment by transfer only." · "The yard now earns while you are away." · "Back field · the works are being built here" · "All prices, exchanges and shares are fictional and have no real-world value. Nothing in this game is financial advice." (the board's first opening, the table, Help) · "Rival firms (simulated)" · "Building costs and times are shortened so the business grows in days, not decades; metal prices keep their true proportions." (Help).
Away: 4.4's lines.

### 5.3 Goals (≤ 30 characters; 1.3's order)

Take the washer apart · Weigh it on the scale · Strip the cable · Weigh the copper · Buy the sack truck · Take a washer apart · Hire a yard hand · Work the drop-off · Buy the sledge and grinder · Break up the radiators · Buy the hook-lift truck · Fetch the farm's trial load · Buy the motor bench · Break a motor on the bench · Supply 2 t (3 metals) · Hire a cutter · Sign the foundry deal · Buy the flat trolley · Buy the powered stripper · Buy the crucible · Charge the crucible · Pour your first ingot · Hire a driver · Buy the cutting torch · Cut up the car · Fetch the demolition load · Buy the Night watch · Level the yard hand · Level the stripper · Level the cutter · Supply {t} t (5 metals) · then the days-1-to-3 list: Hire a second yard hand · Hire a second cutter · Finish the foundry deal · Pass {rival} · Visit the back field. "Sign the foundry deal" may be skipped (the card's Not now).

### 5.4 Refusals (key → text)

`cash` "Not enough cash: §{x} more" · `owned` "Owned" · `rung` "Opens at {t} supplied" · `ceiling` "Yard capacity {c} t/h · grows at {t} supplied" · `tool2` "Needs a sledgehammer" · `tool3` "Needs a cutting torch" · `tooHeavy` "Too heavy to lift: {kg}" · `topLevel` "Top level. A better tool cuts faster." · `noPlace` "No free place on the rota" · `filling` "Filling · full in {m} m {s} s" · `loadCash` "Needs §{x} more for this load" · `floor` "The tipping floor needs {n} places: {m} free" · `weighFirst` "Weigh it in first" · `heatRunning` "Wait for the heat to pour" · `noTruck` "Opens with the hook-lift truck" · `noTorch` "Opens with the cutting torch" · `nothing` "This would change nothing" · `priceUpdated` "Price updated: §{a} → §{b}".

### 5.5 Lessons (one line ≤ 48 characters on the weigh-in ticket; the full sentence in Help and the history; no fixed multiples, S5)

One line of at most 48 characters on a grade's first weigh-in ticket; Help and the ticket history hold each lesson with a second sentence (`text.json`, by the strings package); no fixed multiples (S5).

| Grade | Ticket line |
|---|---|
| Light iron | Light iron: thin steel from appliances. |
| (the stainless drum) | The drum is stainless: worth more once sorted. |
| Electric motor | A whole motor: copper inside steel. |
| Insulated, thin cable | Cable is paid on the copper it yields. |
| Bare bright copper | Bare bright: {n} times iron's price today ({n} = round(p_bb(D) / p_li(D))) |
| No.2 copper | No.2: unalloyed copper, not clean. |
| Yellow brass | Brass is copper and zinc. |
| Aluminium wheels | Cast alloy wheels, tyres and weights off. |
| Cast aluminium | Motor end caps are cast aluminium. |
| Cast iron | Cast iron breaks. Foundries remelt it. |
| HMS 1&2 | HMS: thick steel cut to furnace size. |
| Steel, unprepared | Cut to size, it pays as HMS. |
| Car body | Car bodies go to a shredder. |
| Brass ingot | Melted, skimmed, cast: worth more than scrap. |
| Dross (both) | Dross: the skimmed crust, still holding metal. |
| Alu alloy ingot | Wheels remelted and cast as alloy ingot. |
| Converter | From depolluted car ref. 0012. Paid on assay. |

### 5.6 Voice and banned words

The master's `weighbridge-plain`: short plain sentences in the trade's words; no puns, no exclamation marks, no green claims, no future promises. `check.ts` fails any player text containing: bet, stake, odds, invest, tips, returns, jackpot, win, prizes, ticker, share price, order book, order, shift, freight, cargo, contract, salvage, haul, ore, fleet, logistics, eco, green, save the planet, learn to trade, District, and any name of the four games (the bundle's string denylist). "Night watch", "rota", "supply deal" and "licensed waste carrier" are the words.

### 5.7 Where content lives

Every number in `src/config/salvage.content.ts` (S23), the map included; player words in `src/ui/salvage/strings.ts` (interface) and `scripts/content/yard/text.json` (names of things, grades, lessons, goal texts, partner card lines); goal structure in `scripts/content/yard/goals.json` (ids, targets, done conditions, text keys, no words); `scripts/content/build-yard.py` writes `games/scrap-yard/game.json` (never edited by hand).

---

## 6. Art

On the art director's style sheet (`docs/design/yard-style.md`, whose rules stand): flat vector, three-quarter oblique (40 pt a metre, tilt 0.7), drawn in code in `src/ui/salvage/art/` (the kit exists) and baked into atlases during the loading animation; palette `YARD`; anchors at footprint centres; people in four directions (west mirrors east), vehicles by heading.

### 6.1 Sprites and animations

People in 4 directions (west mirrored), vehicles by heading; frames per direction.

| Group | Sprites and frames |
|---|---|
| Boss and crews | stand; walk 6; work 4 per tool (spanners, sledge, grinder, torch with face shield); feed 2; push sack truck and trolley 6; carry 6; the pour pose in face shield and aluminised apron 4; the driver in the cab; vests: boss hi-vis with white hat, yard hand green, cutter blue, driver teal; loads drawn as pieces on the frame or strapped on the carrier |
| Things, whole and in stages | washer 4; bicycle 2; cable bundle on a drum; tap crate; fittings box; radiator 3; cylinder with tag 2; bath 3; gate 2; railings 2; the car 5 with its record tag; beam 4; tank with tag 3; the prototype's partner things |
| Pieces (ground and carried) | panel, stainless drum, motor, cast section, copper shell, taps, cable, bare-bright bundle, No.2 copper, windings, end cap, wheel, body section, HMS piece, converter, brass ingot, alloy ingot, dross |
| Machines, weighing, stock | strippers and bench (idle, working 3, tray full); crucible under its hood (idle, heating 3, ready glow, pour 4, cooling by `coolingColour`); pads with padlock chips; sample pallet; platform plate, weighbridge deck, display posts, printer flash, scale house and board, portal arch, ID desk window; lock-block bays with stencilled codes, ferrous piles 5 sizes × 5 grades, stillages in 4 fill levels, converter cage, a held bay's flag |
| Vehicles | hook-lift truck × {no skip, empty, trial, full} + hook 3 + tip 3; {merchant}'s flatbed with crane + load 3 (mark on the door); the machine flatbed + set-down 4; delivery van; the public's car and trailer |
| Yard and lane | fence, gate, portacabin with licence plaque and rota board, tool rack, notice board, rubble skip, PVC bin, chalk circles, park markings, extinguisher, back-field gate and sign, rung signs on the crane; lane, hedges, the bridge with weight sign and padlock, the farm's shed, the demolition hoarding, gate and excavator, the barrier |
| Effects and interface | sparks, sledge dust, torch flame, piece arc, coin arc, the value slide, work ring, chevron; ticket paper, chips, padlock chip, goal card, 10 pt pictograms of materials and intermediates, tools, roles, §, ladder, clipboard, settings, lock, clock; process-board plates (lit, buyable, greyed); 25 rival plates from a generated kit; business cards; {merchant}'s mark |

Never drawn (yard-style 11): a real brand or one shaped like it; a tow truck or crusher; a magnet lifting copper; anyone hurt, without gear or near sparks without a face shield; fire or smoke made fun; a lone gold bar; anyone bearing more than the hand load.

### 6.2 Atlas budget

Sheet A (people, things, pieces) and sheet B (vehicles, machines, props, interface plates) of at most 2048 × 2048 px at device density, and a 1024 × 1024 ground sheet; at 3× density the ground work's single atlas dropped to density 2, so the split is required. At most three atlas draws a frame, 40 actors and 300 sprites; bakes on a CPU raster surface (the haul path), surfaces disposed after the copy; every bake finishes behind the loading animation's calm loop.

### 6.3 Icon

The style sheet's candidates (a ladle pouring with a copper coil; a gloved hand with copper against a ticket; the display printing a ticket over copper), on hi-vis yellow or daylight blue, judged at 60 px beside the four games' icons before anything is built on one. Never a lone gold bar or a truck.

### 6.4 The loading animation (S22; `src/ui/salvage/Loading.tsx`, drawn by `art/loading.draw.ts`)

About 3.5 s on first launch, one plate per word of {title}, 0.6 s each; a tap skips it from the second launch. The art kit's 2.75 s timeline is stretched to this one.

| t (s) | Frame |
|---|---|
| 0.0 to 0.4 | Daylight sky and the hazy far yard fade in from the splash; the overhead crane's trolley runs in with its electromagnet; the display reads 0. |
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
| `cut_spanner`, `cut_sledge`, `cut_grinder`, `cut_torch` (loops) | `workStart` to the piece's end, by tool |
| `piece_steel`, `piece_cast`, `piece_alu`, `piece_copper`, `piece_brass`, `thud_waste` | `pieceOff` by family; to waste |
| `pickup`, `swap`, `load_full`, `feed` | the events of those names |
| `scale_beeps`, `scale_print`, `slip` | `weighIn`, `bridgeWeighIn`, `dropOffSlip` |
| `flatbed_arrive`, `flatbed_load`, `coin`, `coin_big` | the round; `collected` (big with copper or a first grade) |
| `lesson` (a soft bell), `deal_stamp` | `lesson`, `dealDelivered` |
| `ui_open`, `ui_close`, `buy`, `denied` | overlays, `owned`, `refused` |
| `van`, `set_down`, `crane_set`, `door`, `crew_hello` (a hum) | `arrival` by kind, `hired` |
| `stripper_hand`, `stripper_power`, `bench_knock` (loops) | machines working |
| `furnace_roar` (loop), `ready_chime`, `pour_glug`, `cool_ticks` | `heatStart`, `readyToPour`, `pour` |
| `truck_diesel` (loop, pitch by speed), `truck_reverse`, `hook_swap`, `skip_tip` | driving, `hook`, `tip` |
| `chip_slide`, `rung_sign` | `passed`, `rung` |
| `load_crane`, `load_clank`, `load_beeps`, `load_pour`, `load_loop`, `gate_open` | the loading animation |
| `amb_yard` | always: birds, distant traffic, a far reverse beeper |

Music: "yard radio", an original 92 bpm loop of mellow electric guitar and bass over the game's own metal hits, two variants crossfaded, ducked under tickets; no melody shared with the four games.

## 8. Tests, bots and people

### 8.1 Rules tests (vitest, frozen test content `src/engine/fixtures/salvage.ts`; no tuned number pinned)

Mass kept per thing, machine and heel; cut times; tool tiers; pickup order, capacity and the swap (never lowering value, never while moving); one `piecePos` for rules, frame and bot; chalk circles inert before a yard hand; tickets (resolution, `roundMoney`, totals equal lines, every collection names its buyer, every partner weigh-in prints gross, tare, net); the round (one load after the first weigh-in, waiting stock, one ticket for several grades, Hold, Sell at its shown price, a full held bay); reservations never collected; supplied only on collection and delivery; the crucible as S11; a converter without a source id refused; loads (fixed at fill, label equals weigh-in, k × as-found, trial loads, never paid when it cannot be tipped); the board pure in D; the clock (a clock-back still advances live play; a jump never pays twice); a short deal day charges nothing; goals never met by doing nothing; the advice line never offering what changes nothing; rungs, range, rivals (never passing back, no two equal rows), payback prices, ceilings; every refusal key; save and reload; ticking equals jumping.

### 8.2 Bots (`src/engine/salvage/bot.ts`; the same actions as the screen, a path graph from the content map at the boss's speed; follows the goal card and the advice line)

People-like (S24, master 12.4): a reaction before every leg, path waste, time at each card; at least fifteen seeds and two opening routes; every beat as a range and as the share of runs inside its band.

| Bot | Behaviour | Measures |
|---|---|---|
| Normal, fast, slow hands | reaction 0.8 / 0.4 / 1.2 s, path waste 25 / 10 / 40 %, 6 to 15 / 4 / 15 s at a card; the slow hand leaves optional goals | every beat of 1.2 and 1.3; purchase gaps; prompts a minute; income, tonnes, rank |
| Card manager | normal to the second hire, then cards only | the hand's worth (E4) |
| Stop-and-return | stops at 5, 10 or 30 minutes, returns after 1, 4, 12 h | the first away card above zero (S13); the next purchase without the hand (E4) |
| Twice a day | a first hour, then two 8-minute sittings a day for 3 days | a useful purchase within two sittings (E8); the away share at minute 60 |
| Day-word holder | holds on low days | Hold's gain |
| No hand | twenty random states, the stick never touched | the next purchase reached (E4) |

### 8.3 Hard promises (gates on every bot run and in the rules tests)

Shown equals applied; a changed step re-asks. Money comes only from collected lots, Sell, deal deliveries and their away pass, and goes only to purchases, levels, hires and partner loads. Nothing costs by the clock, nothing built is lost, no rank falls while away, nothing bought has unknown contents. No dead end: with §0 and empty bays the drop-off and the round pay within 60 s; every amount asked for is reachable and never met by doing nothing; without the hand the yard still reaches the next purchase (E4). One monotonic clock; a jump never pays twice; ticking equals jumping (E5). Mass kept.

### 8.4 Aims (bands from E7, E9, S13, S16, S18; met on 13 of 15 seeds and checked on 5 unseen; the lead sets any band not given here from part two's table)

Met on 13 of 15 seeds, checked on 5 unseen; a band not given here the lead sets from part two's table. The beats of 1.2 and 1.3 with their bands (E7, E9, S18), the slow hand within half as long again · four rivals in the hour · at most one purchase prompt a minute and the next useful purchase never more than 3 minutes away in hour 1 (E2) · a ceiling refusal at most once in the hour (S16) · on the first partner's loads a minute of hand work earns at least 1.5 × a minute at the drop-off (S18) · every machine bought in hour 1 busy at least 30 % of the minutes after its purchase · the hand at least a fifth more than the card manager (E4) · an hour away pays at least 0.3 of an hour played, measured at minute 60 (S13; part two says what it takes) · Hold ≤ +3 % · a tick < 1 ms and 6 h away < 50 ms in node; `?yardStress=1` read on the iPhone.

### 8.5 People before tuning

Three people-like players (not the engineers) play the built stage on an iPhone at both sizes before any number is tuned, 20 minutes each, reading what it deals in its order. They note, with the minute: where they did not know what to do, where a card hid what they wanted to see, each text they did not read, each wish for a second thumb, whether the eye followed the scale display to the flatbed and the cash counter, and whether they found the truck and the crucible without the chevron. The notes go to the lead before the content script tunes anything.

---

## 9. Work packages for about ten people at once (S23)

**Rules of the folder.** Every file has one owner and is named once below; a change to another's file is one line in `requests.md` and a local stand-in. Numbers live only in `src/config/salvage.content.ts`. Positions flow one way: content → game.json → the rules and the screen. The ground work's files are kept and extended by their new owners.

**Hour 0, before anyone starts** (the rules owner writes it, the content, screens and wiring owners agree it, the lead commits it):
1. `src/engine/salvage/types.ts`: the content types (every key family of 2.17 as a type, with frozen test values), the state (2.13), `Presence`, `SalvageEvent` with payloads (2.14), the action signatures and refusal keys (2.15, 5.4), `Ticket`, `CardData`, `ProcessBoardRows`, `FrameTable` (what the world draws: things with their stage, pieces by place with `piecePos`, the load, machines' looks, crew with job and phase, the truck and its skip, the flatbed, labels).
2. `src/engine/salvage.ts` with every public function's signature and a body that throws `notBuilt`.
3. `src/ui/salvage/strings.ts` with every key of section 5, grouped by the package that shows it; package 9 owns the file, and a new key is a request to it.
4. The file list for the bundle check: every new file below is inside `MODE_FOLDERS.salvage` (`scripts/lib/modes.js` already lists `src/modes/salvage`, `src/ui/salvage`, `src/engine/salvage`, `src/engine/salvage.ts`, `src/engine/salvageMode.ts`, `src/engine/fixtures/salvage.ts`, `src/config/schema.salvage.ts`, `src/config/salvage.content.ts`); the wiring owner adds `src/engine/salvage/bot.ts` and `src/engine/fixtures/salvage.ts` to `WEB_ONLY` and the event-to-sound table's keys to the catalogue stub, so `npm run check:bundle` passes for everyone from the first file.
After hour 2 these change only through `requests.md` with the rules owner and every package that reads the changed part.

**What can start before the numbers exist**: art, sound, the loading animation, the screens and the hints against the types with the frozen test content, the strings and the text check, the store placeholder. **What cannot**: tuning, the measured tables, the aims' verdicts, the hero-frame test and the store screenshot (they need the map), goal minutes. The normal-hand bot plays the joined rules, the three people play (8.5), and only then the content package tunes.

| # | Package | Owns (every file once) | Needs first | Shows it works |
|---|---|---|---|---|
| 1 | **Rules engine** (two engineers: hand and things; business and rate engine) | `src/engine/salvage/{types,content,money,clock,board,hand,positions,things,scales,bays,round,machines,crucible,crew,partners,truck,rate,away,ladder,rivals,goals,advice,deal,cards,frame,create,save,tick,notBuilt}.ts` and a `.test.ts` beside each; `src/engine/salvage.ts`; `src/engine/salvageMode.ts`, `src/engine/salvageMode.test.ts`; `src/config/schema.salvage.ts`; `src/engine/fixtures/salvage.ts`; `src/modes/salvage/actions.ts` | hour 0; part two's 2.12 to 2.16 | `NODE_OPTIONS=--max-old-space-size=3000 npx vitest run src/engine/salvage src/engine/salvageMode.test.ts` |
| 2 | **Content, build script and bots** (the prototype engineer) | `src/config/salvage.content.ts`; `scripts/content/build-yard.py`; `games/scrap-yard/game.json` (generated); `src/engine/salvage/bot.ts`, `bot.test.ts`; `scripts/content/yard-bot.ts` | content2.json; package 1's engine for the bots | `python3 scripts/content/build-yard.py --check`; `npx tsx scripts/content/yard-bot.ts --seeds 15 --routes 2 --report` |
| 3 | **The yard view and actors** (on the ground work) | `src/ui/salvage/world/{frameLoop,camera,collide,stick,yard,useRulesTable,useYard,YardView,AtlasView,actors,labels,chevron,heroFrame}.ts(x)`, `world.test.ts`, `input.test.ts` | the types; the art kit's functions | `npx vitest run src/ui/salvage/world`; `npm run lint:worklets`; screenshots at 844 × 390 and 667 × 375; `?view=hero` |
| 4 | **Bars, cards and overlays** | `src/ui/salvage/{SalvageShell.tsx,uiState.ts,palette.ts}`, `src/ui/salvage/hud/*`, `src/ui/salvage/overlays/*`, `src/ui/salvage/dev/*` | the types; `CardData`; strings keys | `npx vitest run src/ui/salvage/hud src/ui/salvage/overlays`; every overlay at both sizes and `fontScale=1.3` |
| 5 | **Art** (the art director's kit) | `src/ui/salvage/art/*` except `loading.draw.ts`; `src/ui/salvage/world/{atlas,draw,ground}.ts`; `scripts/art/{yard-sheets,yard-icons,yard-text}.ts`, `scripts/art/scrap-yard-placeholder.py`; `games/scrap-yard/{icon,adaptive-icon,splash}.png` | section 6; the frame table's sprite ids | `npx vitest run src/ui/salvage/art`; `npx tsx scripts/art/yard-sheets.ts <dir>`; the 60 px icon board |
| 6 | **Sound** | `src/services/fx/catalog.salvage.ts`; `src/modes/salvage/soundKeys.ts`; `scripts/audio/yard/*`; `games/scrap-yard/assets/sfx/*` | the event list | `npm run check:bundle`; `?dev=sounds` in the preview |
| 7 | **Loading animation** | `src/ui/salvage/Loading.tsx`; `src/ui/salvage/art/loading.draw.ts`; `src/ui/salvage/loading/*` (the calm loop, the bake-progress hook reading package 5's `atlasProgress()`) | 6.4 | `?view=loading` at 0.3, 1.2, 2.4, 3.2 s and in the calm loop |
| 8 | **Goals, hints and first-minutes teaching** | `scripts/content/yard/goals.json`; `src/ui/salvage/hints/*` (ghost thumb, the chevron's target rule, first-Open hint through `useTarget`, the lesson pacing of 4.4 item 5) | the types; package 1's `nextGoal` | `npx vitest run src/ui/salvage/hints`; `?preset=fresh&autoplay=opening` for both routes |
| 9 | **Strings and the text check** | `src/ui/salvage/strings.ts`; `scripts/content/yard/text.json`; `scripts/content/yard/check.ts` | names by id from the names desk's `names.json` (read only) | `npx tsx scripts/content/yard/check.ts --all` (fit at 667 and 1.3, banned words, ids, the four games' names) |
| 10 | **Store placeholder, fingerprint and wiring** (the lead or whom the lead names) | `games/scrap-yard/store/*`; `scripts/content/yard-store.json`; `src/modes/salvage/{index.tsx,presets.ts,presets.web.ts,devViews.ts,devViews.web.ts}`; `src/modes/entries.test.ts`; `scripts/lib/*`; `src/ui/hints/targets.ts`; every shared file | hour 0 | `npm run check:bundle`; `npm run typecheck`; `npm test`; `npx tsx scripts/validate.ts scrap-yard` |

`scripts/content/yard/names.json`, `crew-names.json`, `name-filter.json` and `check-words.py` stay the names desk's; no package edits them.

**Order**: the hour-0 agreement → packages 1, 3 to 10 against the frozen test content while package 2 delivers content2.json and the map → part two of this document → package 2 writes the content file and the bots play the joined rules → the three people (8.5) → tuning.

---

## 10. What this stage leaves out, and the hooks stage 2 needs

**Left out** (ruling 5, master 9): the baler, magnet crane, forklift and larger carriers; the partners across the bridge; further crew roles; delivered lots, the boss's crate, commissioning; the Trade Book; stainless, lead, bronze and every later material (greyed plates only); live purchases and ads (stubs, no ad button); exchanges, dealers, transport, sell notes; a second skip slot; dusk and night; real players.

**Must not be precluded**: grades, things, machines, partners, crew roles and plates are content (stainless, lead ingot and bronze are data); the map's extent is content (the back field opens west); the rate engine takes a list of sites and lines, and R(assets) feeds stage 5's server bound; the board's families and step length are content and `sell(grade, shown)` survives 10-minute steps; the truck's skip is a list; the foreman takes a site id; the round's buyer is content (dealers replace it); table rows are `{id, name, tonnes(d), simulated}` so followed players can be pinned; the save reconciles forward and positions are never rules.
