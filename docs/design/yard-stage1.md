# Scrapyard stage 1: the first yard, buildable

Status: revision 0, 25 November 2026 (step `spec-stage1`). It details stage 1 of `docs/design/yard-design.md` (the master) under the lead's ruling (`RULING.md`, point 5 above all). Where this file sets a number the master left open, it is a starting value: **(tune)** may be moved by the content build script inside the stated range, **(proto)** must be confirmed by the numbers prototype before rules are built on it. Every name marked **†** goes to the names register (`scripts/content/yard/names.json`) and may change; nothing is drawn or written on it until the register clears it. Rules tests never read these numbers: they run on the frozen fixture (8.1).

Units: § the scrip; m metres on the ground plane (x east, y south, the ground work's convention); kg in prose, integer grams in the rules; money in integer hundredths; times in seconds of the market clock unless marked.

---

## 1. The first yard

### 1.1 In five sentences

1. You arrive at Kettle Lane Yard †, a run-down back-lane yard 64 by 40 m, and steer your worker with one thumb; stop beside a washing machine and it comes apart piece by piece onto the frame on your back.
2. Everything you carry onto the weighbridge prints a ticket by grade and net weight at the day's posted price (light iron at §0.50 a kilo, stripped bare bright copper at §35), and any grade can be held in its bay for a better day.
3. You buy tools (spanners, angle grinder, cutting torch), carrying gear (frame, gloves and harness, sack truck), a cable stripper, a motor bench and a small crucible furnace that pours your first brass ingot inside the first half hour.
4. You hire a yard hand, a cutter and a driver who carry, cut and fetch the partners' skips from Hob's Farm Clearance † and Ruddock Demolition † down the lane, so the yard keeps earning while you are away.
5. The industry table is one tap from the top bar from the first second: twenty-five simulated rival firms ranked by lifetime tonnes supplied, the top rung named "The largest full metal recycling and resource supplier", and you pass the first rival inside five minutes.

### 1.2 The first five minutes, second by second (normal hand, 12.4 of the master; 0:00 = the gate opening at the end of the loading animation)

| Time | On screen | Thumb | Sound |
|---|---|---|---|
| −2.4 to 0:00 | The loading animation (6.4): crane, five plates spelling the title, weighbridge display counting, a small crucible pours a bar that cools to brass; the gate leaves swing open. | — (a tap skips from the second launch) | crane whine, five clanks, display beeps, pour glug, cooling ticks, gate creak |
| 0:00 | The yard in morning light. The worker stands at the office door (45.5, 17.8). Five m to his right the public weigh-in bay holds a washing machine with a pulsing yellow ring, a bicycle, a second washing machine. Left: the furnace pad with its sign "Crucible furnace §1,500" and a cooled brass ingot on a pallet. Top bar: "§0", "26th of 26 · next: Dobbin & Daughters Scrap † 0.15 t", "0 / 40 kg", clipboard. Goal card: "Take the washing machine apart". A ghost thumb drags in the lower left. | — | music starts (yard radio, 92 bpm), birds, distant traffic |
| 0:01 to 0:02 | Ghost thumb fades on the first touch. The worker walks right. | thumb down lower left, drag right | boots on concrete |
| 0:02.5 | He stops at the machine; after 0.25 s still, the spanners come out. Ring fills per piece. | released | spanner clanks |
| 0:05 | Lid panel (12 kg) pops and arcs onto his back; the stack shows 12 / 40 kg. | — | light-iron clunk, tick |
| 0:07.3, 0:09.7 | Two side panels (12 kg each): 36 / 40 kg. | — | clunks |
| 0:11.3 | The drum (8 kg) comes out; it no longer fits, it drops beside the machine; the concrete counterweight thuds into the waste skip. A small chip: "Stack full". | — | thud, scrape |
| 0:12.5 | The motor (6 kg) drops beside the drum. Goal ticks: "Weigh it out on the weighbridge"; a chevron over the plate. | — | goal tick |
| 0:13 to 0:16 | He walks 7 m to the plate and stops. | drag down right, release | — |
| 0:16 to 0:16.8 | Display counts 0 → 36.0 kg; printer zips; the ticket slides in at the upper right: "Light iron 36.0 kg × §0.50 = §18.00 · ID checked · paid by transfer" and the lesson "Light iron: thin steel from appliances. The cheapest metal in the yard." Cash rolls to §18.00. | — | rising beeps, printer, stamp, coin tick, haptic |
| 0:17 | Goal: "Bring something worth more than iron". The old-stock corner glints (north, 25 m). | — | — |
| 0:20 | Walking back past the washing machine he picks up the motor (§2.50 a kilo, first) and the drum: 14 / 40 kg. | drag up left | two pickups |
| 0:26 to 0:30 | Old-stock corner: he picks up the crate of brass taps (8 kg) and two aluminium wheels (9 kg each): 40 / 40. Three coils of insulated cable stay ("Stack full"). The old car shows a chip: "Needs a cutting torch". | steer between items | brass ring, aluminium tonk |
| 0:38.8 | Ticket 2: Yellow brass 8.0 kg × §16.00 = §128.00 · Aluminium wheels 18.0 kg × §5.60 = §100.80 · Electric motor 6.0 kg × §2.50 = §15.00 · Light iron 8.0 kg × §0.50 = §4.00 · total §247.80; two lessons (brass, wheels). Cash §265.80. | — | beeps, printer, stamp |
| 0:39 | Goal: "Buy the cable stripper (§150)"; chevron on its pad sign west of the office. | — | — |
| 0:46 | At the pad the one button reads "Open". | released | — |
| 0:47 to 0:57 | The stripper card at the right (6.4 of the master's panel): price, what it does, "Buy §150". He taps Buy. The card closes; cash §115.80. | right thumb taps Open, Buy | buy chime |
| 0:57 to 1:05 | A flatbed lorry rolls in through the gate, its crane sets the stripper on the pad (3 s), it drives out. Meanwhile he picks up two coils (40 kg). | steering | diesel, crane hydraulic, set-down clank |
| 1:05 to 1:12 | Standing in the hopper zone the coils fly in (0.12 s each); bright copper spools out of the far side, the PVC sheath drops into a bin. | released | stripper zip, rising |
| 1:13 | He steps to the out tray and picks up two coils of bare bright copper (8.4 kg each). | — | copper dink ×2 |
| 1:22.3 | Ticket 3: Bare bright copper 16.8 kg × §35.00 = §588.00; lesson "Bare bright: clean, stripped, unalloyed copper. Seventy times the iron price." Cash §703.80. | — | beeps, printer, stamp, a bigger coin flourish |
| 1:30 | Goal: "Buy gloves and harness (§60)" at the tool rack (60 kg). | — | — |
| 1:50 | Bought; a delivery van drops a box at the rack; the worker's harness appears. Stack shows "0 / 60 kg". | — | buy chime, van |
| 2:00 to 2:20 | Goal "Carry out the cast-iron radiator (45 kg)". He strips the third coil and carries the radiator whole. | — | — |
| 2:20 | Ticket 4: Bare bright copper 8.4 kg = §294.00 · Cast iron 45.0 kg × §0.95 = §42.75. Cash §680.55 after the gloves. | — | — |
| 2:30 | Goal: "Hire a yard hand (§300)" at the office. | — | — |
| 2:50 | Hired at the office's shift board. A yard hand in an orange vest walks out of the portacabin and goes to the weigh-in bay. Goal: "Cut at the weigh-in bay: the yard hand carries what you leave". | — | door, boots |
| 3:00 to 3:10 | He cuts the bicycle and the second washing machine; pieces that do not fit lie at the bay; the yard hand carries them to the plate beside him. A ticket for the hand's load prints (small, "Yard hand"). The ladder chip slides: "25th of 26 · passed Dobbin & Daughters Scrap" (150 kg; lifetime 0.15 t reached at about 3:00). | — | chip slide, stamp |
| 3:10 to 4:00 | A public van brings an appliance every 40 s. | — | van, set-down |
| 4:00 | Goal: "Buy the angle grinder (§300)". | — | — |
| 4:11 | Bought at the rack; sparks shower on the next washing machine (4.3 s instead of 10 s). | — | grinder whine and crackle |
| 4:30 to 5:00 | Goal "Cut up the cast-iron bath" (110 kg, four sections). | — | — |

What ruling 5 asked for, in its order: the poured bar (−0:20); a wreck apart onto the back (0:02 to 0:12); a ticket by weight and grade (0:16.8); the value jump the player causes (1:22, 70× iron); a purchase arriving in the world (the stripper at 0:57, and after the jump the gloves at 1:50); a helper carrying beside the player (2:50, inside 5:00); the furnace pad with its price and sample ingot in view from 0:00 (at 844 and at 667 wide); the chip passing a named rival (about 3:00). At most one purchase prompt a minute: prompts at 0:39, 1:30, 2:30, 4:00.

### 1.3 Minutes 5 to 60 (normal hand; from the sketch of 2.13 to minute 30, then projected; (proto) throughout)

| Min | Goal shown | Purchase / arrival | Note |
|---|---|---|---|
| 5 | Cut up the cast-iron bath | — | ticket §104.50 |
| 6:50 | Buy the hook-lift truck (§700) | truck arrives at 7:08 through the gate, parks | Hob's skip has stood full since 5:00 |
| 7:10 | Fetch Hob's skip: drive out, weigh in, tip | first drive out 7:15 to 7:55 | first weigh-in ticket |
| 8 to 10 | Cut and sort the skip | yard hand carries the floor | |
| 10:30 | Buy the motor bench (§500) | 10:49 flatbed | washer motors now pay §53.91 instead of §15 |
| 11:30 | Buy the sack truck (§400) | 11:55, carry 120 kg | ladder: passed Pennick Scrap † (1.5 t) at 11:30 |
| 15:30 | Reach Licensed dealer | ceremony (2.11) | 2 t and 3 metals; radiation portal and ID desk appear |
| 16:00 | Hire a cutter (§1,200) | 16:34 a yellow vest walks out | "The yard now earns while you are away." |
| 17:30 | Sign the Fennick Foundry deal (optional) | deal card at the office | |
| 18:30 | Hold yellow brass for the crucible | Hold flag at the brass stillage | |
| 19:15 | Buy the crucible furnace (§1,500) | 19:28 flatbed; the sample pallet is removed | |
| 19:45 | Charge the crucible (25 kg brass) | yard hand brings held brass | heat 160 s |
| 22:40 | Pour your first ingot | four 5 kg brass ingots glow, cool in 3 s | first pour (aim 18 to 25) |
| 24:00 | Hire a driver (§2,000) | 24:19 blue vest takes the truck | ladder: passed Wrenfield Metals † (5 t) at about 23:45 |
| 31 | Buy the cutting torch (§2,500) | Ruddock's gate opens | |
| 33 | Cut up the old car | converter ticket "1 by assay §884.25" | |
| 35 | Fetch Ruddock's skip (3 t) | | |
| 40 | Night shift (§3,000): away cap 6 h | | |
| 45 to 50 | — | ladder: passed Cobbet Lane Metals † (18 t) | four rivals in the hour |
| 55 to 65 | Reach District merchant | ceremony; second yard hand and second cutter slots open | 25 t and 6 metals |

The sketch misses one aim of the master: the next purchase is more than 3 min away three times (7:08 to 10:49, 11:55 to 16:34, 19:28 to 24:19). The planned fix is the advice line of 2.11 (a level offered when the next planned purchase is over 3 min away at the current income); the prototype measures it.

---

## 2. The rules

All rules are pure TypeScript in `src/engine/salvage/` at 10 ticks a second, deterministic, no `Date.now` or `Math.random` (randomness is `hash32(worldSeed, ...)` counter hashes). Mass in integer grams, money in integer hundredths.

### 2.1 Money and weight on paper

- `roundScrip(x)`: below §1,000 half up to the hundredth; from §1,000 half up to the whole scrip. Every amount shown or paid goes through it once.
- **Weighbridge resolution**: a ticket line's net mass is the grade's grams rounded half up to 0.1 kg below 100 kg, to 1 kg from 100 kg, to 10 kg from 10 t. Line amount = roundScrip(resolved kg × price per kg); the ticket's total is the sum of its lines. **Supplied** counts the ticket's resolved masses (what the trade counts); the world conserves exact grams.
- Mass display = the resolution: "8.0 kg", "340 kg", "12.34 t"; ferrous from 1 t shown in t with two decimals.
- Prices per kg are integer hundredths per kg; the converter is priced per piece.

### 2.2 Grades (content `salvage.grades`)

| id | Name on tickets | Material (range) | Family | p̄ §/kg | Kind | Bay |
|---|---|---|---|---|---|---|
| li | Light iron | light iron | ferrous | 0.50 | product | ferrous bay 1 (5 t) |
| ci | Cast iron | cast iron | ferrous | 0.95 | product | ferrous bay 2 (5 t) |
| hms | HMS 1&2 (80:20) | steel | ferrous | 1.20 | product | ferrous bay 3 (5 t) |
| hmsu | Heavy steel, unprepared | steel | ferrous | 0.85 | product | ferrous bay 4 (5 t) |
| batt | Lead-acid battery, whole | lead | lead | 1.80 | product | battery box (300 kg) |
| alw | Aluminium wheels | aluminium | non-ferrous | 5.60 | product | stillage (500 kg) |
| alc | Clean aluminium | aluminium | non-ferrous | 5.00 | product | stillage |
| ali | Aluminium ingot | aluminium | non-ferrous | 9.40 | product | stillage |
| ald | Aluminium dross | aluminium | non-ferrous | 0.80 | product | stillage |
| brs | Yellow brass | brass | non-ferrous | 16.00 | product | stillage |
| bri | Brass ingot | brass | non-ferrous | 21.00 | product | stillage |
| brd | Brass dross | brass | non-ferrous | 2.00 | product | stillage |
| no2 | No.2 copper | copper | non-ferrous | 33.00 | product | stillage |
| bb | Bare bright copper | copper | non-ferrous | 35.00 | product | stillage |
| mot | Electric motor, whole | — | non-ferrous | 2.50 | intermediate | stillage (300 kg) |
| cab | Insulated cable | — | non-ferrous | 6.00 | intermediate | stillage (300 kg) |
| cat | Catalytic converter, whole (by assay) | — | precious | §884.25 a piece | intermediate | stillage (10 pieces) |

Waste (no grade, no value, no fee): concrete counterweight, PVC sheath, car waste (tyres, glass, seats). It leaves in the waste skip and the PVC bin ("to a licensed contractor").

Ratios to keep true (yard-metals.md 3): bare bright to light iron 70; copper to steel about 29; aluminium ingot to wheels 1.7; brass to copper 0.46 (held low; the ingot lifts it). The converter's assay: 0.55 × (5 g Pt × §126 + 5 g Pd × §86 + 1.5 g Rh × §850) − §400 = §884.25 at p̄. The family "precious" is a fourth family the master's list (ferrous, non-ferrous, lead) did not name.

### 2.3 Objects and their pieces (content `salvage.objects`)

Cut time per piece t = max(0.6, kg × h / P) seconds; P the tool power in kg/s (2.4); h per piece. Pieces are cut in the listed order; waste leaves with the piece named. "Loose" objects are one piece and need no cut. "Whole" is the grade and mass an object may be weighed out as uncut, if a carrier can lift it.

| id | Name | Tool | Pieces in cut order (kg × n, grade, h) | Waste | Whole | Where |
|---|---|---|---|---|---|---|
| washer | Washing machine | 1 | lid 12 li 1.0; side 12 × 2 li 1.0; drum 8 li 1.0; motor 6 mot 1.0 | 20 counterweight, with the drum | — | weigh-in bay |
| bike | Bicycle | 1 | frame 11 li 1.0; rims 3 alc 0.8 | — | — | weigh-in bay |
| radiator | Cast-iron radiator | 2 | section 15 × 3 ci 1.5 | — | ci 45 | bay; old stock |
| cylinder | Copper hot-water cylinder | 1 | cylinder 7.5 no2 1.0; fittings 1.5 brs 1.2 | — | — | weigh-in bay |
| taps | Crate of brass taps | loose | 8 brs | — | — | old stock |
| coil | Coil of insulated cable | loose | 20 cab | — | — | old stock (3); Ruddock |
| wheel | Aluminium wheel | loose | 9 alw | — | — | old stock (2) |
| bath | Cast-iron bath | 2 | section 27.5 × 4 ci 1.5 | — | ci 110 | old stock |
| car | Old car, fluids drained | 3 | battery 14 batt 1.0; wheel 9 × 4 alw 0.8; loom 4 cab 1.0; converter 6 cat 2.0; body 100 × 8 li 2.0 | 200 car waste, with the last body piece | — | old stock |
| sheet | Bundle of corrugated sheet | 1 | 20 × 2 li 1.0 | — | — | Hob's |
| gate | Field gate | 1 | 20 × 2 li 1.0 | — | — | Hob's |
| stove | Cast-iron stove | 2 | 30 × 3 ci 1.5 | — | ci 90 | Hob's |
| trough | Cast-iron trough section | loose | 30 ci | — | — | Hob's |
| plough | Old plough frame | 3 | 15 × 4 hms 2.5 | — | hmsu 60 | Hob's |
| fittings | Box of brass fittings | loose | 15 brs | — | — | Hob's |
| offcuts | Copper pipe offcuts | loose | 10 no2 | — | — | Hob's |
| beam | Steel beam | 3 | 30 × 10 hms 2.5 | — | — (300 kg: no carrier lifts it) | Ruddock's |
| cladding | Sheet steel cladding | loose | 30 li | — | — | Ruddock's |
| pipe | Bundle of copper pipe | loose | 20 no2 | — | — | Ruddock's |
| valves | Crate of brass valves | loose | 15 brs | — | — | Ruddock's |

Mass is conserved per object (pieces + waste = whole) and tested. A thing that the current tool cannot cut shows the chip "Needs an angle grinder" or "Needs a cutting torch"; one with a Whole entry can be carried as it is. Car body pieces of 100 kg are carried only by the boss with the sack truck (the yard hand's limit is 60 kg; its card says "Too heavy for a yard hand: 100 kg").

**The weigh-in bay** (the public's drop-off, called "Public weigh-in" on screen; never "drop-off"): eight slots. At 0:00 it holds washer, bike, washer in slots 0 to 2. Then arrival k (k = 1, 2, ...) is due at 40·k s after the start and placed in the lowest free slot; while eight wait, the due arrival waits and arrives the moment a slot frees, the next one 40 s later. Kind of arrival k by u = hash01(worldSeed, 'tip', k): washer below 0.55, bike below 0.80, radiator below 0.95, else cylinder. Never a converter, a cylinder of gas or a closed tank (ruling 10).

### 2.4 Tools and carrying (the tool rack)

| Item | Price | Effect |
|---|---|---|
| Spanners and bolt cutters | owned | tool 1, P 5 kg/s |
| Angle grinder | §300 (tune 200 to 400) | tool 2, P 12 |
| Cutting torch (oxy-propane) | §2,500 (tune 1,800 to 3,500) | tool 3, P 30; opens Ruddock's gate |
| Carry frame | owned | 40 kg |
| Gloves and harness | §60 (tune 40 to 100) | 60 kg |
| Sack truck | §400 (tune 300 to 600) | 120 kg (pushed while carrying) |

The boss walks 4.0 m/s with any load. Pickup is automatic within 1.0 m of a piece, moving or still, 0.15 s a piece, highest § per kg first (ties: heavier first); a piece heavier than the free capacity is not lifted; a carried piece is never displaced. Pieces lying in a chalk circle are not picked up by the boss (they are the crew's).

### 2.5 Machines

A machine stands on a fixed pad, has an input buffer, a rate or a batch, an out tray and levels 1 to 10 (rate × 1.15^(L−1); level L→L+1 costs price × 1.55^(L−1); tune 1.4 to 1.7). No running cost. A full out tray stops it; nothing is lost. Outputs are computed in grams with floor per share; the waste (or the last output if none) takes the remainder, so mass is exact.

| Machine | Price | In | Out | Rate | Buffers |
|---|---|---|---|---|---|
| Cable stripper | §150 (tune 100 to 250) | cab | 42 % bb (one bb piece per input piece), 58 % PVC to the bin | 6 kg/s | in 200 kg, tray 200 kg |
| Motor bench | §500 (tune 400 to 800) | mot | 25 % no2, 67 % li, 8 % alc (three pieces per motor) | 2 kg/s | in 120 kg, tray 200 kg |
| Crucible furnace (small) | §1,500 (tune 1,200 to 2,000) | brass recipe: brs; aluminium recipe: alc, alw | brass: 97 % metal, 3 % brd; aluminium: 94 % metal, 6 % ald; metal cast in 5 kg ingots (bri, ali); the remainder below 5 kg stays in the crucible as heel and joins the next heat of the same recipe | charge 25 kg; heat 60 + 4 × charge kg seconds (160 s full), ÷ 1.15^(L−1) | in 50 kg waiting beyond the charge; tray 100 kg |

- A batch starts when the charge is full, or with at least 40 % (10 kg) after 60 s without feed. The recipe is set on its card (default brass); changing it is refused while a heat runs or heel of the other recipe remains ("Pour the heel first": the next heat of the old recipe runs with 40 % or more).
- The crucible takes held stock from bays of its input grades (card switch "Take from bays", default on).
- Example heat: 25 kg brs (§400 at p̄) → 24.25 kg metal → four ingots of 5 kg (§420) and 4.25 kg heel, 0.75 kg brd (§1.50).
- **Foreman** (master 3.4): every machine and crew member runs × 1.25 (tune 1.15 to 1.40) while the boss has *worked* in the last 20 s (finished a piece, fed, picked up, dropped, weighed out, hooked or tipped). Never while away.

### 2.6 Crews (the office's shift board)

| Role | Hire | Slots | What it does | Rate (level L, f = foreman 1.25 or 1) |
|---|---|---|---|---|
| Yard hand (orange vest) | §300; second §600 | 1; +1 at rung 3 | Carries pieces lying in chalk circles, out trays, the weigh-in bay front and the tipping floor; first to a machine whose buffer has room and accepts the grade, else to the plate; highest § per kg first. Takes held stock to a machine that takes from bays. | One trip per period T = 2·L_route / v + 2.0 s, up to 60 kg; v = 3.0 × 1.12^(L−1) × f m/s; levels 1 to 10 |
| Cutter (yellow vest) | §1,200; second §2,400 | 1; +1 at rung 3 | Cuts the oldest uncut thing at the weigh-in bay, then on the tipping floor (never the old-stock corner), with the yard's best tool; pieces stay where they fall. Skips the thing the boss is cutting. | cut power = min(0.95, 0.60 × 1.12^(L−1)) × P × f kg/s; levels 1 to 5 (level 6 refused: "At 95 % of the tool: buy a better tool") |
| Driver (blue vest) | §2,000 | 1 | Runs the truck from the truck park when the boss is not in it: to the open partner whose skip has been full longest, if cash ≥ its price, its contents at today's prices are worth more than its price, and the tipping floor holds under 1.5 t. Swap, back, weigh in, tip, park. | travels at 0.8 × the boss's speeds; no levels in stage 1 |

Routes (route length L_route = 1.15 × the straight distance between anchors of 3.3):

| Route | L_route m | T at L1, no foreman | kg/s |
|---|---|---|---|
| weigh-in bay front → plate | 7.1 | 6.7 s | 9.0 |
| tipping floor → plate | 35.5 | 25.7 s | 2.33 |
| old stock → plate | 29.7 | 21.8 s | 2.75 |
| stripper tray → plate | 27.9 | 20.6 s | 2.91 |
| bench tray → plate | 34.7 | 25.1 s | 2.39 |
| crucible tray → plate | 19.2 | 14.8 s | 4.05 |
| weigh-in bay → stripper hopper | 23.5 | 17.7 s | 3.39 |
| weigh-in bay → bench hopper | 30.6 | 22.4 s | 2.68 |
| brass stillage → crucible hopper | 23.6 | 17.7 s | 3.39 |

A yard hand serves one route at a time: the first in this order with work: (1) a machine hopper that has room and a source of its grade, (2) chalk circles, (3) out trays, (4) weigh-in bay front, (5) tipping floor. Walking on screen is interpolated from the trip's phase; it decides nothing. Hired crew walk out of the office door (the office card closes first).

### 2.7 The lane and its two partners

| Partner | Opens | Skip K (nominal) | Fill time | Buy price | Contents per skip (counts × object) | Value at p̄ |
|---|---|---|---|---|---|---|
| Hob's Farm Clearance † (contact Hob Garnett †) | with the truck | 1,000 kg | 300 s | §0.30/kg | 10 sheet, 5 gate, 2 stove, 4 trough, 1 plough, 2 fittings, 1 offcuts (light iron 60 %, cast iron 30 %, steel 6 %, brass 3 %, copper 1 %) | §1,446 (plough whole) |
| Ruddock Demolition † (contact Rosa Ruddock †) | with the torch | 3,000 kg | 480 s | §0.60/kg | 7 beam, 15 cladding, 12 coil, 6 pipe, 6 valves (beams 70 %, light iron 15 %, cable 8 %, copper pipe 4 %, brass 3 %) | §9,585 (cable whole), §11,673 (stripped) |

- Count of each object in skip number s: round(n × (1 + 0.15 × (2·hash01(worldSeed, partner, s, i) − 1))), at least 1. Mass = Σ; price = roundScrip(mass kg × buy price).
- A skip fills from the game's start (both are visible full or filling from minute 1); it can be hooked only when full ("Filling 64 % · full in 1 m 48 s"). Its label in the world and its card show "Full · 1,012 kg · §0.30/kg · §303.60 · worth §1,446 at today's prices".
- **Hooking**: the truck, carrying the empty skip, stops in the skip zone (radius 2.5 m) still for 0.25 s; checks: partner open, skip full, cash ≥ price; then a 4 s swap ring (moving cancels and restarts it); at completion the price is paid ("paid by transfer" line on the weigh-in ticket) and the partner's next skip starts filling.
- **Weigh-in**: the truck still 0.5 s on the plate with an unweighed full skip prints a weigh-in ticket: "Weighed in · Hob's Farm Clearance † · skip 1,012 kg · §303.60 paid at the skip · ID checked". It counts nothing.
- **Tipping**: the truck still 0.5 s in the tip zone with a weighed-in full skip tips it (3 s); its objects are laid out on the tipping floor in a 1.6 m grid from its north-west corner, filling rows west to east; a full floor (60 places) refuses the tip ("The tipping floor is full").
- Hooking at a partner whose gate is closed shows "Opens with the hook-lift truck" or "Opens with the cutting torch" on its gate.

### 2.8 The truck

Hook-lift truck §700 (tune 500 to 900): arrives through the gate and parks. Entered by walking into it (the ground work's rule); left by the one button's "Step out". Speeds: 6 m/s in the yard (x < 63.5), 12 m/s on the lane; collision circle radius 1.3 m. It carries one skip (the empty one at purchase) and never pieces. The carry readout while driving: "Empty skip", "Hob's skip 1.01 t", "Ruddock's skip 3.08 t". If the boss steps out away from the truck park and a driver is hired, the driver walks to the truck and drives it back to the park (time = path ÷ speeds), then works.

### 2.9 The daily price board and the Hold flag

- **Market clock**: t_m = max(now, clockHigh), UTC milliseconds, saved; clockHigh = t_m every tick. Market day D = floor((t_m − EPOCH) / 86,400,000), EPOCH = Monday 5 January 2026 00:00 UTC.
- **Price** of grade g on day D, per kg in hundredths: p_g(D) = round(p̄_g × 100 × (1 + a × w_f(D))), a = 0.05 (tune 0.03 to 0.07), w_f(D) = 2 × hash01(worldSeed, family f, D) − 1; the converter p_cat(D) = roundScrip(0.55 × contained value × (1 + a × w_precious(D)) − 400). worldSeed is a content constant, so every phone shows the same board.
- **History**: the board shows days D−5 to D (five days and today) as six bars per grade, with the date ("Wed 25 Nov · next prices in 6 h 12 m").
- **7-day average** (for the deal): A_g(D) = round(mean of p_g(D−6 … D)).
- **Hold**: every product and intermediate grade has a bay with a Hold flag (default off). At a weigh-out each grade's mass, in ticket order: (1) cast iron first fills the deal's reserve (2.10); (2) if held and the bay has room, it goes to the bay (ticket line "Held: to bay"; no money; not supplied yet); (3) the rest is sold on the ticket. A full held bay lets the rest pass as sold. Bays never charge anything.
- **Sell** (bay card, or the board's row): `sell(grade, shown)` sells the bay's whole stock at the price of the step it showed, shown = {D, price, grams}; if D has changed when the tap lands, the card re-asks "Price updated: §0.95 → §0.97". A held lot prints its own ticket and counts as supplied then.

### 2.10 The one fixed-price supply deal

Fennick Foundry Co-op † (contact card at the office's partner wall), offered from rung 2: "200 kg of cast iron a day for 5 days at §x/kg, locked at signing", x = round(A_ci(D_sign) × 1.02). After signing, while deliveries remain, cast iron weighed out first fills the cast-iron bay's reserve up to 200 kg (ticket line "Reserved for Fennick Foundry 140 / 200 kg"). At each 00:00 UTC after signing, before anything else that tick: delivered = min(200 kg, reserve); paid roundScrip(delivered kg × x); supplied += delivered; trust +5 for a full day, −10 for a short one (0 to 100, starts at 50; shown on the card; it gates nothing in stage 1). **Nothing is ever charged for a miss.** Five deliveries, then the card offers the next deal of the same size (stage 3 replaces this).

### 2.11 Goals, advice and the ladder of stage 1

**Goals** (content `salvage.goals`; each: text, a target the chevron points at, a done condition from state, an optional purchase; the card shows the first unfinished one; a purchase goal is shown no sooner than 60 s after the previous purchase goal appeared):
1 Take the washing machine apart · 2 Weigh it out on the weighbridge · 3 Bring something worth more than iron · 4 Buy the cable stripper · 5 Strip the cable and weigh the copper · 6 Buy gloves and harness · 7 Carry out the cast-iron radiator · 8 Hire a yard hand · 9 Cut at the weigh-in bay: the yard hand carries what you leave · 10 Buy the angle grinder · 11 Cut up the cast-iron bath · 12 Buy the hook-lift truck · 13 Fetch Hob's skip · 14 Buy the motor bench · 15 Break a motor · 16 Buy the sack truck · 17 Reach Licensed dealer · 18 Hire a cutter · 19 Sign the Fennick Foundry deal (skippable) · 20 Hold yellow brass for the crucible · 21 Buy the crucible furnace · 22 Charge the crucible · 23 Pour your first ingot · 24 Hire a driver · 25 Buy the cutting torch · 26 Cut up the old car · 27 Fetch Ruddock's skip · 28 Buy the Night shift · 29 Reach District merchant · then "Level your crew and machines" with the advice line.

**Advice line** (second line of the goal card when tapped open, and the first line once the list is done): the cheapest useful purchase whose price ≤ cash + 3 min of the current income rate, where the income rate is the rules' rated income at the moment (I1 = crews' and machines' steady § per minute plus the boss's last-5-minutes sales per minute). A purchase that changes nothing is never offered and is refused (master 12.1.4).

**Rungs in stage 1** (master 6.1): 1 Back-lane yard (start; painted plank sign); 2 Licensed dealer (2 t, range 3; steel sign; the radiation portal arch and the ID desk window appear at the gate with "Every load checked. Every seller identified. Payment by transfer only."; the deal is offered); 3 District merchant (25 t, range 6; lit sign; second slots). Rungs 4 to 9 show greyed with their gates and "Needs the works: more lines arrive in an update" from rung 3.

**Range** (master 4.4): a material counts once products of it supplied are worth §300 at p̄ (tune 150 to 600): light iron 600 kg, cast iron 316 kg, steel 250 kg HMS or 353 kg unprepared, lead 167 kg of batteries (not reachable in stage 1: one car battery), aluminium 54 kg wheels, brass 18.75 kg, copper 8.6 kg bare bright. Intermediates count tonnes, not range.

**Rated capacity** R (t/h, master 6.3) in stage 1 = the steady throughput of the away pass with the current assets and full feed and no boss (2.16), a pure function of assets. Caps: 3 t/h at rung 1, 12 at rung 2, 40 at rung 3 (tune ± 30 %). A purchase that would lift R above the cap is refused with "Reach District merchant to grow past 12 t/h". With the sketch's assets R is 0 until the cutter, about 3.4 t/h after it, about 10 t/h with the driver, and at most 38 t/h (the lane's and the weigh-in bay's supply) in stage 1.

**Rival rows** (master 6.2; the 25 firms there, all †): T_r(d) = T_r0 × (1 + g_r × min(d, 40)), g_r = 0.005 below 1 kt and 0.01 from 1 kt, d = (t_m − startT_m) / 86,400,000 (days, real). **A rival the player has passed never passes back**: once T_player ≥ T_r(d) has held at any tick, the row shows min(T_r(d), 0.98 × T_player). Without this rule a rival growing 0.5 % a day overtakes a player with no crew while away, which ruling 3 forbids. Rank = 1 + the number of rows above T_player. "Passed X" fires once per rival.

### 2.12 The state (`SalvageState`, `v: 2`, save tag `salvage1`)

```ts
type G = number; type C = number; type Ms = number;          // grams, hundredths, market ms
interface Piece { id: number; grade: GradeId; g: G }
interface Thing { id: number; obj: ObjectId; next: number; doneG: G }   // next piece index; progress in g·h of the current piece, kept when the boss walks off
interface Zone { pieces: Piece[]; things: Thing[] }                     // per ZoneId: tipBay (8 slots), oldStock, floor, chalkA, chalkB, tray:<machine>
interface Bay { g: G; pieces?: number; hold: boolean }                  // per grade (cat counts pieces)
interface MachineS { owned: boolean; level: number; inG: Partial<Record<GradeId, G>>; doneG: G; recipe?: 'brass' | 'aluminium'; heatEndsAt?: Ms; heelG?: G; lastFeedAt: Ms; fromBays: boolean }
interface CrewS { role: 'hand' | 'cutter' | 'driver'; level: number; route?: RouteId; tripStartAt?: Ms; credit: number; load: Piece[] }
interface PartnerS { open: boolean; skipNo: number; fillStartAt: Ms }
interface TruckS { owned: boolean; at: 'park' | 'free' | 'run'; skip: null | { partner: PartnerId; skipNo: number; things: Thing[]; massG: G; weighed: boolean }; run?: { startAt: Ms; partner: PartnerId; phase: number } }
interface SalvageState {
  v: 2; startAt: Ms; clockHigh: Ms; day: number;
  presence: Presence; presenceAt: Ms; stillSince: Ms; driving: boolean; workedAt: Ms;
  stack: Piece[]; tool: 1 | 2 | 3; carry: 40 | 60 | 120; owned: Record<ItemId, boolean>;
  zones: Record<ZoneId, Zone>; tipNext: number; tipDueAt: Ms;
  bays: Record<GradeId, Bay>; machines: Record<MachineId, MachineS>; crew: CrewS[];
  partners: Record<PartnerId, PartnerS>; truck: TruckS;
  deal: null | { priceC: C; left: number; reserveG: G; trust: number; signedDay: number };
  suppliedG: G; rangeC: Record<MaterialId, C>; rung: 1 | 2 | 3; passed: string[];
  tickets: Ticket[];            // last 50
  ticketNo: number; seenGrades: GradeId[]; goal: number; lastPromptAt: Ms;
  visited: PlaceId[]; awayCapH: 4 | 6; nextId: number; lastPos: { wx: number; wy: number; tx: number; ty: number } // positions for redraw only
}
```

Presence (the ground work's sample, extended, 3.6): `{ x, y, driving, moving, tx, ty }`. The rules ignore `near` and compute nearness themselves from content positions.

### 2.13 Derived values (pure functions the screens call; a screen never computes a price, rate, time or rank)

`priceOf(g, D)`, `boardRows(state)`, `ticketLines(stack, state)`, `cutTime(piece, tool)`, `routeRate(role, level, route, foreman)`, `R(assets)`, `incomeRate(state)`, `rankRows(state)`, `rangeChips(state)`, `cardOf(place, state)` (every row with its exact price and a refusal reason or null), `skipLabel(partner, state)`, `awayCapNow(state)`, `nextGoal(state)`, `advice(state)`, `frame(state)` (the frame table for the world: things with cut stage, pieces per zone, stack, machine looks, crew jobs with phase 0 to 1, truck place and skip, labels).

### 2.14 What a tick does, in order (dt = 0.1 s)

1. Clock: t_m = max(now, clockHigh); clockHigh = t_m. If D changed: deal delivery first (2.10), then the board day.
2. Presence: older than 0.6 s → nobody; `stillSince` resets when `moving`.
3. Arrivals: weigh-in bay (2.3); partner skips that reach full.
4. The boss (from presence): driving → hook (2.7), weigh-in, tip; on foot, in this order → on the plate still 0.5 s: weigh out the stack (2.9) and print a ticket; in a hopper zone: feed one accepted piece per 0.12 s; in a chalk circle still 0.25 s: drop the stack there; pickup within 1.0 m (0.15 s a piece); within 1.4 m of a cuttable thing and still 0.25 s: cut (the nearest thing; progress in g·h at P g/s). Each of these sets `workedAt`.
5. Crews: cutters (credit in g·h; a piece finishes when credit ≥ its g × h), yard hands (a trip completes each T: its load lands; the next load is taken at trip start), the driver (run phases).
6. Machines: stripper and bench by rate on their buffers (one input piece at a time; outputs at its completion); crucible batches.
7. Weigh-outs by crew at the plate print a crew ticket (small, collapsed; one per 10 s per carrier at most, lines merged).
8. Ledger: supplied, range, rung (ceremony event), rivals passed, goals done, prompts.
9. Events for the screen and sound (8.2 lists them).

### 2.15 Player actions and their checks (`src/modes/salvage/actions.ts`, each calling one rule)

| Action | Checks (refusal text in 5.3) |
|---|---|
| `presence(p)` | none; stale samples ignored |
| `buy(item, shownC)` | item exists and not owned; at its place now or the place visited (clipboard); shownC = current price; cash ≥ price; R after ≤ rung cap; rung gate met |
| `hire(role, shownC)` | a free slot; shownC; cash; R cap |
| `level(target, shownC)` | below max level; shownC; cash; R cap; changes something (cutter at 95 % refused) |
| `setHold(grade, on)` | grade has a bay |
| `sell(grade, shown)` | bay has stock; shown.D = D else `{ priceUpdated: { from, to } }`; shown.g = stock |
| `setRecipe(machine, r)` | no heat running; no heel of the other recipe |
| `setFromBays(machine, on)` | owned |
| `signDeal(shownTerms)` | offered; terms equal |
| `stepOut()` | driving (the screen places the worker beside the truck) |
| `ackAway()` | an away report is waiting (the money was paid when computed) |

### 2.16 Time away

`paysOnCompute: true`, `catchUpSeconds: 0`. A = min(t_m − max(lastSavedAt, clockHigh_saved), Cap), Cap = 4 h, 6 h with the Night shift (office, §3,000, tune 2,000 to 4,000). The boss does nothing; no foreman.

**The closed form.** The yard is a graph: sources (weigh-in bay arrivals; partner skips through the driver, gated by cash and value) → cutting (Σ cutter power) → carrying (Σ yard-hand rates on their routes) → machines → bays or sale. Between events every flow runs at its bottleneck rate: a carrier as a continuous flow 60 kg / T, a cutter as power / (mean g·h per g of what lies there), a machine at its rate, taking the highest § per kg first. A segment ends at the first of: a buffer or pile of a grade running empty or full; a tray full; a weigh-in arrival or a slot freeing; a skip turning full; cash reaching a skip's price; a driver run's end; a crucible heat's end; 00:00 UTC (price step and deal delivery). Within a segment revenue is exactly Σ grade mass × that day's price; money and tonnes are added in time order (so cash-gated skips are exact). One away ticket line per grade per market day. The result is paid in the update that computes it and recorded under clockHigh: a clock moved back pays nothing, a clock moved forward pays at most Cap once. **Gate**: the away pass equals a 10 Hz replay of the same assets with no boss within 0.5 % of money and tonnes on frozen content, over 1, 4 and 6 h, across a day boundary and a cash-gated skip.

**What the player finds**: crews where the pass left them, bays and the floor as computed, the truck parked with an empty skip, and the away card (4.4).

### 2.17 What "supplied" counts

Resolved net mass of products and intermediates on sale tickets (the boss's, the crew's and away), held lots when sold, and deal deliveries. Never weigh-ins, waste, held stock still in bays, or anything not sold. Lifetime only; it never falls.

### 2.18 The first thirty minutes at a person's hand (sketch, (proto))

From `scratchpad/yard/stage1/sketch6.py` (not the prototype: a rate sketch at mean prices with the opening scripted as 1.2; boss 80 % productive; foreman on). Sales are what tickets paid in the minute; spend is purchases and skips; cash is at the minute's end; each row adds up (cash = previous + sales − spend).

| Min | Sales § | Spend § | Cash § | Supplied kg | Rank | What |
|---|---|---|---|---|---|---|
| 0 | 265.80 | 150 | 115.80 | 76 | 26 | tickets 1, 2; stripper |
| 1 | 588.00 | 60 | 643.80 | 93 | 26 | copper; gloves |
| 2 | 336.75 | 300 | 680.55 | 146 | 26 | coil 3, radiator; yard hand |
| 3 | 227.31 | 0 | 907.86 | 337 | 25 | passed Dobbin & Daughters |
| 4 | 104.50 | 300 | 712.36 | 447 | 25 | grinder; bath |
| 5 | 227.31 | 0 | 939.67 | 638 | 25 | |
| 6 | 90.93 | 0 | 1,030.60 | 715 | 25 | |
| 7 | 45.46 | 1,000 | 76.06 | 753 | 25 | truck §700, Hob skip §300 |
| 8 | 90.93 | 0 | 166.99 | 829 | 25 | |
| 9 | 92.64 | 0 | 259.63 | 900 | 25 | |
| 10 | 600.35 | 500 | 359.98 | 1,314 | 25 | motor bench |
| 11 | 380.30 | 687 | 53.28 | 1,577 | 24 | sack truck; skip 2; passed Pennick |
| 12 | 200.59 | 0 | 253.87 | 1,692 | 24 | |
| 13 | 66.86 | 0 | 320.73 | 1,730 | 24 | |
| 14 | 165.18 | 0 | 485.91 | 1,828 | 24 | |
| 15 | 901.93 | 0 | 1,387.84 | 2,444 | 24 | rung 2 |
| 16 | 734.15 | 1,200 | 921.99 | 2,943 | 24 | cutter |
| 17 | 161.72 | 300 | 783.71 | 3,046 | 24 | skip 3 |
| 18 | 661.19 | 0 | 1,444.90 | 3,487 | 24 | |
| 19 | 734.15 | 1,500 | 679.05 | 3,986 | 24 | crucible |
| 20 | 681.32 | 0 | 1,360.37 | 4,442 | 24 | |
| 21 | 58.09 | 270 | 1,148.46 | 4,475 | 24 | skip 4 |
| 22 | 208.12 | 0 | 1,356.58 | 4,601 | 24 | first pour |
| 23 | 893.15 | 0 | 2,249.73 | 5,212 | 23 | passed Wrenfield |
| 24 | 534.13 | 2,000 | 783.86 | 5,566 | 23 | driver |
| 25 | 72.61 | 0 | 856.47 | 5,607 | 23 | |
| 26 | 135.93 | 270 | 722.40 | 5,685 | 23 | skip 5 |
| 27 | 907.67 | 0 | 1,630.07 | 6,304 | 23 | |
| 28 | 591.79 | 0 | 2,221.86 | 6,698 | 23 | |
| 29 | 72.61 | 0 | 2,294.47 | 6,739 | 23 | torch at about 31 |

Total sales §11,067; spend §8,773. The income per minute is lumpy (a skip is sold over about five minutes): averaged over 5 minutes it is about §140 at minutes 3 to 8, §330 at 10 to 15, §470 at 15 to 20, §510 at 25 to 30. The sketch omits the crucible's gain (+§131 per Hob skip's brass), crew tickets' grouping and the daily price step; the prototype replaces it.

---

## 3. The yard as a map

### 3.1 The world

World x 0 to 300 m, y 0 to 40 m. The yard is x 0 to 64 (fenced); the lane x 64 to 300. At 40 pt a metre and tilt 0.7 the screen shows 21.1 × 13.9 m at 844 × 390 and 16.7 × 13.4 m at 667 × 375; the free world (between the goal card and the bottom zone) about 21 × 8.5 m. The camera holds the body at the free world's centre with the ground work's 0.35 s lead, and runs past the world's edge by the safe-area inset plus 1.2 m (the ground check's fix).

**Ground**: a tile map in 2 m cells (concrete, asphalt, gravel, grass, road, pad edges, markings) drawn from the ground atlas, visible cells only (at most 14 × 9 = 126 sprites at 844): the ground work's one baked ground picture cannot cover 300 m (change for the world package).

### 3.2 Where everything stands (centre x, y; box w × d or circle r; S = solid)

| Thing | Centre | Footprint | Notes |
|---|---|---|---|
| Fences | north y 0.5, west x 0.5, south y 39.5, east x 63.5 | 0.3 deep, in sections ≤ 5 m, S | gate opening in the east fence y 19 to 27 |
| Gate leaves | (63.5, 19.2), (63.5, 26.8) | drawn open | |
| Weighbridge plate | (55.0, 23.0) | 7 × 3.2, decal | "on the plate" = body centre inside |
| Weighbridge display post | (55.0, 21.1) | r 0.2 S | digits face south |
| Scale house (price board) | (60.5, 17.6) | 3.6 × 2.4 S | Open zone (58.2, 18.4) r 1.4 |
| Radiation portal (rung 2) | (61.5, 23.0) | two posts r 0.25 S at y 19.4 and 26.6 | arch drawn over the road |
| Public weigh-in bay | slots (50.5 + i, 16.3), i 0 to 7 | appliances 0.7 × 0.7 S; back wall (54, 15.0) 8.4 × 0.4 S | open to the south; bay front anchor (52.5, 17.9) |
| Waste skip | (48.6, 16.3) | 2.2 × 1.4 S | concrete, car waste |
| Chalk circle A | (50.0, 20.2) | r 0.9 decal | |
| Office (portacabin) | (45.0, 13.6) | 6 × 2.6 S | Open zone (45.0, 15.6) r 1.4; crews walk out at (45.0, 15.2) |
| Worker start | (45.5, 17.8) | | |
| Tool rack | (39.5, 15.2) | 2.4 × 0.8 S | Open zone (39.5, 16.4) |
| Furnace pad | (40.5, 19.6) | 4 × 3.2 decal; sign post (38.9, 18.3) r 0.15 S; sample pallet (42.0, 20.5) 0.8 × 0.6 S | crucible 1.6 × 1.6 S at the centre once bought; hopper zone (43.0, 19.6) r 0.8; tray (38.0, 19.6) 1.0 × 0.8; Open (40.5, 21.8) |
| Stripper pad | (33.5, 17.0) | 3 × 2.5 decal; machine 2.2 × 1.4 S | hopper (35.6, 17.0) r 0.8; tray (31.4, 17.0); Open (33.5, 18.9) |
| Motor bench pad | (27.5, 17.0) | 3 × 2.5 decal; bench 2.0 × 1.2 S | hopper (29.6, 17.0); tray (25.4, 17.0); Open (27.5, 18.9) |
| Old-stock corner | area x 28 to 40, y 3 to 11 | | anchor (34.0, 9.0) |
| · coils ×3 | (31.0, 8.0), (32.2, 8.0), (33.4, 8.0) | r 0.45 | |
| · taps crate | (35.0, 7.6) | 0.7 × 0.5 | |
| · wheels ×2 | (36.4, 8.2), (37.4, 8.2) | r 0.35 | |
| · radiator | (38.8, 7.8) | 1.0 × 0.3 S | |
| · bath | (35.0, 10.2) | 1.7 × 0.8 S | |
| · old car | (30.5, 4.8) | 4.2 × 1.8 S | nose east |
| Tipping floor | (25.0, 30.5) | 12 × 7 decal (x 19 to 31, y 27 to 34) | 60 places, 1.6 m grid from (19.8, 27.8); tip zone (32.8, 30.5) r 2.2; anchor (25.0, 30.5) |
| Chalk circle B | (32.0, 26.4) | r 0.9 | |
| Truck park | (47.0, 31.0) | 4 × 2.6 decal | arrivals park here |
| Ferrous bays | (58.5, 36.8) li, (53.0, 36.8) ci, (47.5, 36.8) hms, (42.0, 36.8) hmsu | 5 × 4.4 each; lock-block walls 0.6 × 4.4 S between | Open in front (y 34.2) |
| Non-ferrous stillages | 13 at x 25.0 + 1.2 j, y 37.4, j 0 to 12 (alw, alc, ali, ald, brs, bri, brd, no2, bb, mot, cab, batt box, cat) | 1.0 × 1.0 S | Open in front (y 36.4); brass stillage anchor (29.8, 36.4) |
| Notice board (industry table) | (62.6, 28.4) | 1.6 × 0.4 S | Open (61.6, 29.4) |
| Back-field gate (locked, stage 2) | (0.5, 20.0) | 4 m leaf S | sign "Back field: the works · opens in an update" |

What is solid for the truck: everything solid plus the bay fronts' kerbs; its circle (r 1.3) cannot pass between the stillages or into the old-stock corner.

### 3.3 The lane

| Thing | Where | Notes |
|---|---|---|
| Road | x 63.5 to 296, y 19.5 to 26.5 | asphalt tiles, centre line |
| Hedges | y 17.0 and y 29.5, x 64 to 296, S | gaps at the partner entrances |
| Hob's Farm Clearance † | entrance gap x 146 to 154 (north hedge); site x 138 to 162, y 4 to 16.5 | farm shed, sign, skip spot (150, 12.5) r 2.5 |
| Bridge | x 196 to 212; rails y 20.0 and 26.0, S | sign "Weight limit 7.5 t" |
| Ruddock Demolition † | entrance gap x 258 to 266 (south hedge); site x 250 to 275, y 30 to 39.5 | hoarding, a parked excavator (decor, S), skip spot (262, 33.5) r 2.5; gate closed and S until the torch |
| District road barrier | x 296, y 19 to 27, S | "To the district road · opens with the market" (stage 3) |

Drive times (boss): park → plate → gate 19 m at 6 m/s; Hob's lane run 86.5 m at 12 m/s; entry 10 m at 6 m/s: 12.1 s out, 4 s swap, 12.1 s back, 1.3 s weigh-in, 3.9 s to the tip zone, 3 s tip, 2.3 s to park: **38.7 s**. Ruddock's: 21.4 s out, cycle **57.3 s**. The driver at 0.8 × speeds: 44.8 s and 68.1 s.

### 3.4 Arrivals

Machines: a flatbed lorry with a crane (generic, unbranded) enters at the gate, drives to the pad's Open point, sets the machine down in 3 s, leaves; the machine works from the set-down (8 s after Buy for the stripper; the time is the path at 6 m/s plus 3 s, computed by the rules from content so the bot agrees). Tools and gloves: a small van leaves a box at the rack (drawn only; owned at Buy). Sack truck: the worker takes it from the rack. Truck: drives in and parks. Crew: walk out of the office door. Night shift: a new rota sheet on the office's shift board.

### 3.5 Visible but locked from the first minute

The furnace pad with "Crucible furnace §1,500" and a 5 kg brass sample ingot (in view at 0:00 at both phone sizes: x 38.5 to 42.5 against views of x 35 to 56 and 37 to 54); the old car with "Needs a cutting torch" (seen at 0:26); Hob's skip filling beyond the gate (from the gate at 0:16); Ruddock's gate with "Opens with the cutting torch"; the back-field gate; the industry table's top rung.

### 3.6 Changes the ground work needs

1. Reach split: work 1.4 m, pickup 1.0 m (`worker.reach` → `reachWork`, `reachPickup`).
2. Presence carries x, y, driving, moving and the truck's place; the rules compute nearness; `near` stays advisory.
3. Truck speeds by zone (6 yard, 12 lane), driver 0.8 ×; truck place sampled while driving.
4. World 300 × 40 m with the tile-map ground (3.1); camera centre in the free world.
5. Prop kinds: decals (plate, pads, floor, chalk circles, zones), places with Open points, slots; content in `scripts/content/yard/map.json`.
6. Helpers become crew from the frame table (job, route, phase); `helpers.via` goes.
7. The one button (lower right): Step out / Open / blank (ground work's Step-out button absorbed).
8. Overlay kinds and sizes of section 4; one scrim per overlay; the card over the panel dims the panel (ground check finding 8).
9. Save tag `salvage1` (positions saved for redraw only).
10. The worker shows as an outline when hidden behind a taller sprite (ground check finding 10).

---

## 4. The screens

### 4.1 Zones (points; insets read on all four sides; both landscape directions)

| Row | 844 × 390 (insets L 47, R 47, B 21) | 667 × 375 (no insets; 16 margins) |
|---|---|---|
| Top bar | y 0 to 36 | y 0 to 34 |
| Goal card (left, one line; tap for three) | y 36 to 64, x 59 to 459 | y 34 to 60, x 16 to 356 |
| Free world | y 64 to 301 | y 60 to 299 |
| Bottom: stick zone left; one button right | y 301 to 390 (8 + 60 + 21) | y 299 to 375 (60 + 16) |

Top bar, left to right (gaps 14 at 844, 12.75 at 667):

| Item | 844 (safe width 750) | 667 (635) | Text |
|---|---|---|---|
| Cash | 120 | 104 | 15 pt bold, rolling, whole scrip floored |
| Ladder chip (tap: industry table) | 300 | 240 | 11 pt; the longest of three forms that fits: "26th of 26 · next: Dobbin & Daughters Scrap 0.15 t" / "26th · next Dobbin & Daughters 0.15 t" / "26th · 0.15 t to next" |
| Spare (stage 3 ticker) | 150 | 120 | empty in stage 1 |
| Carry readout | 80 | 76 | 11 pt "36 / 40 kg"; driving "Hob's skip 1.01 t" |
| Clipboard button | 44 | 44 | icon |

Bar text is sized by hand from min(fontScale, 1.3) with `allowFontScaling={false}`; at 1.3 the cash is 19.5 pt in the 36 pt bar and the chip 14.3 pt in a 26 pt chip. At 667 at most four HUD lines show (bar, goal, ticket, button label).

The stick zone: the ground work's (left 45 % of the safe area below its top 28 %, at least 24 pt inside). The one button: 60 pt circle, centre (751, 339) at 844 and (621, 329) at 667; label 11 pt under the icon ("Open", "Step out"); blank and transparent elsewhere; pressed only with the stick released.

### 4.2 The HUD's moving parts

- **Goal card**: 28 pt (26 at 667), text 12 pt, a small progress number at the right ("12 / 25 kg"); tap: three lines (current goal, the next, the advice line), 84 pt tall, closes after 6 s or on a tap.
- **Ticket**: slides in at the upper right under the top bar (x from W − R − 12 − 240 at 844, width 240; 220 at 667), 18 pt per line, at most 7 lines (header, up to 4 grade lines with "+ 2 more", total, legal line 9 pt), plus at most two lesson lines in 11 pt italic. It stays 4 s (6 s with a lesson) or until the next; crew tickets show one collapsed line ("Yard hand · 58.0 kg · §29.00"). Tap: ticket history (clipboard).
- **World labels** (drawn in the world, 10 pt plates): place names, prices on locked pads, a bay's grade chip with mass ("Cast iron 340 kg · held"), the skip label, chips ("Needs a cutting torch", "Stack full").
- **Chevron**: a hi-vis chevron 1.2 m above the goal's target, bobbing; at the screen edge it becomes an edge arrow.

### 4.3 Overlays (the mode's own absolute views registered with `useOverlay`; one at a time; scrim or Android back closes)

**Right panel**: width min(520, 0.58 W) = 489 at 844 (x 308 to 797, inside the right inset), 0.62 W = 413 at 667 (x 254 to 667); y from the top bar to the screen's bottom; the place stays visible, dimmed, at the left. Rows 44 pt; title 15 pt; row name 13 pt, one effect line 11 pt; price on the Buy button 13 pt bold (button 96 × 36). At 1.3 a row's two lines take 31 pt of 44. **Centred card**: at most 520 × 300 (both sizes).

| Overlay | Kind | What it prints |
|---|---|---|
| Tool rack | panel | Tools: Spanners (owned), Angle grinder §300 "cuts 2.4 × faster; cast iron, stoves, the bath", Cutting torch §2,500 "steel beams, the old car; opens Ruddock's"; Carrying: Carry frame 40 kg (owned), Gloves and harness 60 kg §60, Sack truck 120 kg §400. Refusals in place of Buy. |
| Office | panel, tabs Crew · Partners | Crew: one card per role (name of the hire from the crew list †, vest colour, level, its rate in words and number "carries 2.3 kg a second from the tipping floor", Hire or Level up with price, refusals); Night shift §3,000 "away cap 4 h → 6 h". Partners: business cards of Hob's, Ruddock's (open or its condition), the Fennick Foundry deal (from rung 2). |
| Machine card | panel | Before: name, price, one line of what it does, in → out shares, rate; Buy. After: input kg, tray kg, status ("Working", "Tray full", "Waiting for cable"), rate, Level up; crucible: recipe (Brass / Aluminium), Take from bays, charge kg / 25, "Pours in 1 m 12 s", heel kg. |
| Price board (scale house) | panel | Date, "next prices in …"; one row per grade with stock or ever seen: pictogram, name, today's price, six history bars (D−5 to D) and the change since yesterday, bay stock, Hold switch, Sell with its total. The fictional line on first opening. |
| Bay card | panel (the board scrolled to the grade) | grade, stock, today's price, value, Hold, "Sell 340 kg × §0.95 = §323.00"; "Price updated: §0.95 → §0.97" re-ask. |
| Skip card (at a partner or from the clipboard) | panel | partner, contact, fill or full with mass, buy price, total, worth at today's prices, what it holds (counts by object), why it cannot be hooked. |
| Supply deal | centred card | the terms of 2.10 word for word; Sign / Not now; after signing, days left, reserve, trust, last delivery. |
| Industry table | panel | rungs strip (nine rungs, the current one lit, gates of the next), seven range chips with progress, 26 rows (rank, plate logo 24 pt, name, tonnes, "simulated"), the player's row pinned; "Rival firms (simulated). Online play arrives in an update." |
| Away report | centred card | the ticket roll of 4.4 |
| Rung ceremony | centred card | the new sign, the rung name, what it opens, OK |
| Clipboard | panel | the goal list (done ticked), places visited (each opens its card), ticket history (last 50), Settings |
| Settings | panel | Sound, Music, Haptics, Help (glossary of the stage's grades), the fictional line, privacy, version, "Start the yard again" with a confirming card |

### 4.4 The away report

Centred card 520 × 300 drawn as a weighbridge ticket roll: "Away 3 h 12 m (cap 4 h)"; one line per grade (mass, §); "4.21 t supplied · §3,148.00 (already in your account)"; "Hob's skip fetched 9 times · Ruddock's 3 times"; "Fennick Foundry: 200 kg delivered, §194.00"; "You passed Corvay Recycling."; OK. The ad button stays hidden (stage 1 stub, 10).

---

## 5. Content

### 5.1 Names († to the names register)

Title Scrap to Ingot †; Kettle Lane Yard †; Kettle Lane †; Fennick † (town); Hob's Farm Clearance †, Hob Garnett †; Ruddock Demolition †, Rosa Ruddock †; Fennick Foundry Co-op †; the 25 rival firms of master 6.2 †; the scrip † and §; crew first names (a list of 60 †, curated with the names desk); rung names (Back-lane yard, Licensed dealer, District merchant: generic, still checked). Grade, machine, tool and process names are the trade's and are not registered.

### 5.2 Labels (in `src/ui/salvage/strings.ts`; names come from game.json)

Bar and HUD: "§{n}"; "{rank} of {n} · next: {rival} {t}"; "{a} / {b} kg"; "Stack full"; "Open"; "Step out"; "Needs an angle grinder"; "Needs a cutting torch"; "Too heavy to lift: {kg}". Places: "Tool rack", "Office", "Scale house", "Notice board", "Public weigh-in", "Waste skip", "Tipping floor", "Truck park", "Old stock". Ticket: "KETTLE LANE YARD · WEIGHBRIDGE TICKET No. {n}"; "{grade} {kg} × §{p} = §{x}"; "Total net {kg} · §{x}"; "ID checked · paid by transfer"; "Held: to bay"; "Reserved for Fennick Foundry {a} / {b} kg"; "Weighed in · {partner} · skip {kg} · §{x} paid at the skip". Cards: "Buy §{x}"; "Hire §{x}"; "Level {n} → {n+1} · §{x}"; "Owned"; "Sell {kg} × §{p} = §{x}"; "Price updated: §{a} → §{b}"; "Hold"; "Sign"; "Not now"; "Pours in {m} m {s} s"; "Tray full"; "Waiting for {grade}". Market: "Market day {Ddd d Mmm} (UTC) · next prices in {h} h {m} m"; "All prices, exchanges and shares are fictional and have no real-world value. Nothing in this game is financial advice." Away: "Away {h} h {m} m (cap {c} h)"; "{t} supplied · §{x} (already in your account)"; "You passed {rival}." Rungs: "Every load checked. Every seller identified. Payment by transfer only."; "The yard now earns while you are away." Portrait card: the ground work's.

### 5.3 Refusals (the rules return the key; the card prints)

"Not enough cash: §{x} more"; "Bought"; "Opens at Licensed dealer"; "Reach District merchant to grow past 12 t/h"; "At 95 % of the tool: buy a better tool"; "No free slot until District merchant"; "Filling {p} % · full in {m} m {s} s"; "Needs §{x} for this skip"; "Weigh it in first"; "The tipping floor is full"; "Pour the heel first"; "Opens with the hook-lift truck"; "Opens with the cutting torch".

### 5.4 One-line lessons (each on the first ticket line of its grade; at most two a ticket; a third waits for that grade's next ticket)

| Grade | Lesson |
|---|---|
| Light iron | Light iron: thin steel from appliances. The cheapest metal in the yard. |
| Electric motor | A whole motor: copper windings inside steel. A motor bench gets them out. |
| Yellow brass | Yellow brass is copper and zinc: thirty times the iron price. |
| Aluminium wheels | Cast alloy wheels: clean aluminium, eleven times the iron price. |
| Insulated cable | Copper inside plastic, paid on what it will yield. Strip it and sell the copper bare. |
| Bare bright copper | Bare bright: clean, stripped, unalloyed copper. Seventy times the iron price. |
| Cast iron | Cast iron: heavy and brittle, from radiators, baths and stoves. Foundries remelt it. |
| Clean aluminium | Clean aluminium: no steel, no plastic attached. |
| No.2 copper | No.2 copper: unalloyed but not clean, from pipe and windings. |
| HMS 1&2 | HMS 1&2 80:20: thick steel cut to furnace size, the world's benchmark grade. |
| Heavy steel, unprepared | Too big for a furnace as it is. Cut to size, it pays as HMS. |
| Lead-acid battery | Whole lead-acid batteries travel upright in an acid-proof box. |
| Catalytic converter | Converters come only from cars we depollute ourselves, with their papers. Sold whole by assay. |
| Brass ingot | Melted, skimmed and cast: an ingot is worth more than the scrap it came from. |
| Brass dross | Dross is the crust skimmed off the melt. It still holds metal. |
| Aluminium ingot | Remelted under flux and cast: secondary aluminium ingot. |
| Aluminium dross | Aluminium dross goes back to a refiner for the metal in it. |

Voice (master 11): short plain sentences, the trade's words, no exclamation marks, no puns, no green claims; never bet, stake, invest, win, prizes, order. Every text passes a fit check at 1.3 at 667 wide (5.5).

### 5.5 Where content lives and how it is checked

Authoring files `scripts/content/yard/{grades,objects,partners,goals,lessons,lines}.json` (prose and ids, never a tuned number), the map `scripts/content/yard/map.json`, numbers in `src/config/salvage.content.ts`; `scripts/content/build-yard.py` merges them into `games/scrap-yard/game.json` (nobody edits game.json by hand). `npx tsx scripts/content/yard/check.ts --all` checks format, ids, the voice list, the denylist of the four games' names and Orbit Haulers' words (salvage, haul, ore, cargo, fleet, logistics, contracts), and fit (each text against its box at fontScale 1.3 at 667).

---

## 6. Art

Flat vector, three-quarter oblique (tilt 0.7), drawn in code (`src/ui/salvage/art/`), baked at device density while the loading animation runs; palette `hi-vis-and-rust` of master 11; the style sheet `docs/design/yard-style.md` (art director) governs looks. Nobody hurt or shown unsafe; every person in hi-vis, hard hat, gloves and boots, face shield when cutting.

### 6.1 Sprites (frames; S, N, E drawn, W mirrored; all anchored at footprint centres)

| Group | Sprites |
|---|---|
| Boss | idle 1 × 3 dirs; walk 6 × 3; cut 4 per tool (spanners, grinder, torch) × 3; feed 2 × 3; push sack truck walk 6 × 3; stack overlay (pieces drawn from their stack icons, up to 6 visible) |
| Yard hand, cutter, driver | walk 6 × 3 each with their vest colour; yard hand carry 6 × 3; cutter cut 4 × 3 (best tool); driver in cab (part of the truck) |
| Weigh-in bay objects | washing machine whole, lid off, sides off, drum out; bicycle whole, frame only; radiator whole, two sections; copper cylinder whole, fittings off |
| Old stock | coil, taps crate, wheel, bath whole + 2 stages, old car whole + 4 stages (battery out, wheels off, interior out, body cut) |
| Hob's objects | sheet bundle, field gate, stove + 2, trough, plough frame + 1, fittings box, pipe offcuts |
| Ruddock's objects | beam whole + 3 cut stages, cladding, pipe bundle, valve crate (coil shared) |
| Pieces (ground sprite and small stack icon per grade) | light-iron panel, drum, motor, rim, cast-iron section, copper cylinder, fittings, cable coil, bare bright coil, No.2 windings, end cap, battery, converter, body section, HMS piece, brass ingot, aluminium ingot, dross lump |
| Machines | stripper idle, working 3, tray full; motor bench idle, working 3, tray full; crucible idle, heating 3 (glow), tilting pour 4, ingots cooling (tint over 3 s); each pad pegged out with its sign; furnace pad sample pallet |
| Vehicles | hook-lift truck 8 headings × {no skip, empty skip, Hob's full, Ruddock's full} + tip 3 frames + hook 3 frames; flatbed with crane 8 headings + set-down 4; public van 4 headings; delivery van 4 headings |
| Weighbridge | plate decal, display post with 7-segment digits 0 to 9 and "kg", printer flash, scale house, radiation portal arch, ID desk window |
| Bays | lock-block walls, ferrous piles 5 sizes × 4 grades, stillages 4 fill levels (tinted per grade), battery box, converter cage |
| Yard props | fence panels, gate leaves, portacabin office, tool rack (tools shown as owned), notice board, waste skip, PVC bin, chalk circles, truck park markings, back-field gate with sign, rung signs (plank, steel, lit) |
| Lane | road and verge tiles, hedges, bridge with rails and limit sign, Hob's shed and sign, Ruddock's hoarding, parked excavator, district barrier, trees ×3, field tiles |
| Effects | sparks (grinder), torch flame and glow, dust puff, piece arc (the piece sprite on a parabola, 0.35 s), coin fly to the cash, ring progress (ground work), chevron |
| HUD icons (GameIcon cache) | 17 grade pictograms readable at 10 pt; tools 3; carry 3; crew 3; machines 3; §, ladder, clipboard, settings, lock, clock |
| Logos | 25 rival plates from a generated kit (shape × glyph × two colours, distinct from stage-5 emblems); business cards for Hob's, Ruddock's, Fennick Foundry |

### 6.2 Atlas budget

Two sheets of at most 2048 × 2048 px at the device's density (the ground work's single sheet falls to density 2 at 3 ×): actors and objects in sheet A, vehicles, machines and props in sheet B; ground tiles in a third 1024 × 1024 sheet. At most three atlas draws a frame (ground, under, actors and over), 40 actors, 300 sprites; 60 fps while anything moves fast, 30 otherwise. Bakes through `Skia.Surface.Make` first (the haul path, ground check finding 3); surfaces disposed after copy. `?yardStress=1` draws 40 actors and 300 sprites and shows fps and the worst frame on the phone (the ground check's finding 2: the switch must exist on phones, not only on the web).

### 6.3 Icon (ruling 14)

Three candidates drawn for the 60 px judgement beside the four icons before anything is built on one (master 11): a gloved hand holding a bright coil of stripped copper against a ticket stripe; a crucible pouring into a mould with a copper coil behind; a magnet lifting a copper coil over a rust ground. Never a lone gold bar or a truck.

### 6.4 The loading animation (`src/ui/salvage/Loading.tsx`; 2.4 s at least, longer only while bakes run; a tap skips it from the second launch)

| Time | Frame |
|---|---|
| 0.00 to 0.40 | Pale sky #EAF1F4 fades in from the splash colour; a crawler crane's jib swings in from the left (30° to 0°, ease-out) with an electromagnet on its cable; the weighbridge display below the title area shows "0 kg". |
| 0.40 to 1.60 | Five steel plates, one each 0.24 s: the magnet lowers a plate (0.14 s), it lands with a 2 pt shake (0.06 s), the magnet rises (0.04 s). The plates carry the title's letters cut out (split by words, the longest split until there are five: "SCR", "AP", "TO", "IN", "GOT"). The display counts in steps to the bake's progress × 1,000 kg. While bakes run past 1.6 s, the fifth plate waits on the magnet and the display holds; at most 6 s in all. |
| 1.60 to 2.20 | A small crucible at the right tips (0.2 s); an orange stream (#FF8A2A) pours (0.3 s) into a mould under the title; the bar fills. |
| 2.20 to 2.40 | The bar cools from orange to brass (#D4AF37); the display reads "1,000 kg"; the two gate leaves swing open onto the yard (0.25 s cross-fade into the first frame of the yard). |

---

## 7. Sound

A new pack in `games/scrap-yard/assets/sfx` (`soundPack: null`), recipes new; keys in `src/services/fx/catalog.salvage.ts`; played only through `fx.play`. Haptics: light on each finished piece, medium on each sale ticket, success on a rung.

| Key | Trigger |
|---|---|
| `step_concrete`, `step_gravel` | the boss's walk cycle (every second frame), by ground tile |
| `cut_spanner`, `cut_grinder` (loop), `cut_torch` (pre-heat hiss then roar, loop) | cut in progress, by tool |
| `piece_steel`, `piece_cast`, `piece_alu`, `piece_copper`, `piece_brass`, `piece_lead` | a piece lands on the stack or the ground, by grade family |
| `thud_waste` | waste into the waste skip |
| `pickup` | a piece picked up (soft) |
| `stack_full` | a piece that does not fit |
| `scale_beeps`, `scale_print`, `scale_stamp` | weigh-out: count, printer, stamp |
| `coin` | cash rises (one per ticket) |
| `lesson` | a lesson line (soft bell) |
| `buy` | Buy accepted |
| `denied` | a refusal |
| `flatbed_arrive`, `crane_set` | machine delivery |
| `van` | public van, delivery van |
| `stripper_zip` | stripper working (per piece) |
| `bench_hammer` | motor bench working |
| `furnace_roar` (loop), `pour_glug`, `cool_ticks` | crucible heat, pour, cooling |
| `truck_diesel` (loop, pitch by speed), `truck_reverse`, `hook_swap`, `skip_tip` | the truck |
| `door`, `crew_hello` (a short hum, no words) | a hire walks out |
| `chip_slide` | the ladder chip moves |
| `rung_sign` | crane hangs a sign; short brass phrase |
| `ui_open`, `ui_close` | overlays |
| `loading_crane`, `loading_clank`, `loading_beeps`, `loading_pour`, `gate_open` | the loading animation |
| `amb_yard` (loop) | birds, distant traffic, a far reverse beeper |

Music: "yard radio", an original 92 bpm loop of mellow electric guitar and bass over a percussion bed made of the game's own metal hits (two variants of 64 bars, crossfaded), ducked under tickets; no melody shared with the four games.

---

## 8. Tests, bots and people

### 8.1 Rules tests (vitest, the frozen fixture `src/engine/fixtures/salvage.ts`; never the tuned content)

Mass conservation for every object, machine and the crucible with heel; cut times and the 0.6 s floor; tool tiers and Whole; pickup order (highest § per kg, never displacing, capacity); chalk-circle drop and the boss not re-picking; feeding at 0.12 s; weigh-out lines, resolution and roundScrip; Hold to bay, full bay passes, Sell at the shown step and "Price updated" at the 00:00 boundary; prices equal across two clocks and two devices (same seed); the clock moved back pays nothing, forward pays at most Cap once; the deal: reserve, delivery at 00:00 before spot sales, a short day charges nothing; the weigh-in bay arrivals and the eight-slot wait; skip contents by seed, fill, hook checks, weigh-in, tip, floor full; driver gating by cash and value; crew trip periods and the cutter's 95 % refusal; foreman on and off; rung gates and the range chips; rival rows (pure, anchored on the start, never passing back); R and the rung caps; every refusal returns its key; the away pass against the 10 Hz replay within 0.5 % (1, 4, 6 h; a day boundary; a cash-gated skip; a full tray; a crucible heel); save, reload and reconcile of every state field; a tick under 1 ms and 6 h away under 50 ms in node.

### 8.2 The events (the screen's and the sound's contract)

`SalvageEvent` = `cutStart | piece {thing, grade, g, to: 'stack' | 'ground' | 'waste'} | pickup | stackFull | drop | feed | machineOut | heatStart | pour {ingots} | ticket {ticket} | crewTicket | weighIn | hook | tip | arrival {kind: 'tip' | 'flatbed' | 'van' | 'truck' | 'crew'} | owned {item} | refused {key} | rung {n} | passed {rival} | deal {kind} | goal {n} | lesson {grade}`.

### 8.3 Bots

`src/engine/salvage/bot.ts` plays the rules through the same actions as the screen, with a path graph of the map (3.2 to 3.3) walked at the boss's speed; it follows the goal card and the advice line.

| Bot | Behaviour | Measures |
|---|---|---|
| Normal hand | reaction 0.8 s, path waste 25 %, looks 6 to 15 s at a card | every minute of 1.2 and 1.3; prompts; gaps between purchases; income per minute; tonnes; rank |
| Fast hand | 0.4 s, 10 %, 4 s at a card | the same, ±40 % |
| Slow hand | 1.2 s, 40 %, 15 s at a card, leaves goals 11, 19, 20 undone | the same; first helper ≤ 9 min; rung 3 ≤ 90 min |
| Idle player | plays 10 min as the normal hand, then only opens the app every 4 h for 2 days | away income, R, rank never falling, rivals not passing back |
| Twice a day | a first hour, then two 8-minute sittings a day for 3 days (the master's habit) | rivals passed per sitting; rung 3; away share of income |

### 8.4 Hard promises (gates from the first run)

Shown equals applied (every card's number equals what is applied; a changed step re-asks); money comes only from tickets, held-lot sales, deal deliveries and the away pass of the same, and goes only to purchases, levels, hires and skips; nothing is taken while away and nothing built is lost; no rank falls while away; no dead end (with §0 and empty bays the weigh-in bay pays within 60 s; every goal's amount is reachable and none is met by doing nothing); the clock (one monotonic market clock, a jump never pays twice); mass conservation.

### 8.5 Aims of this stage (bands set by the lead from the measured table; 13 of 15 seeds; 5 unseen)

| Aim | Target |
|---|---|
| First ticket | ≤ 25 s (sketch 16.8 s) |
| Copper value jump | ≤ 1:30 (1:22) |
| First helper carrying | ≤ 5 min (2:50); slow hand ≤ 9 |
| Truck's first drive out | 7 to 10 min (7:15) |
| First pour | 18 to 25 min (22:40) |
| Rival passed | first ≤ 5 min (3:00); four in the first hour |
| Rung 2 / rung 3 | 12 to 18 min / 55 to 65 (slow ≤ 90) |
| Purchase prompts | at most one a minute |
| Next purchase in reach | never more than 3 min away in hour 1 (the sketch misses it three times: 1.3) |
| Hold | a patient holder gains ≤ +3 % on the same tonnage |
| The hand's worth at rung 3 | the normal hand earns ≥ 1.2 × the same purchases managed from cards only (foreman, the boss's cutting and the truck); reported, no single mechanism > 3/5 of the gain |
| Away | an hour away pays at least 0.3 of an hour played at minute 60 |
| Performance | tick < 1 ms; 6 h away < 50 ms; `?yardStress=1` read on the iPhone |

### 8.6 People before tuning

Three people-like players (not the engineers) play the built stage on an iPhone at both sizes before any number is tuned, each for 20 minutes, reading what it deals in the order it deals it; each notes (with the minute) where they did not know what to do, where a card covered what they wanted to see, every text they did not read, every time they wished for a second thumb, and whether they found the truck and the furnace without the chevron. Their notes go to the lead before the content build script is run.

---

## 9. Work packages

Ten people at once. Every file has one owner; a file another package needs changed is a line in `requests.md` and a local stand-in. Hour 0 (before anyone else starts): the **contract** commit by P1 with P2's agreement: `src/engine/salvage/types.ts` (state of 2.12, content types with every field name of 2.2 to 2.10, `Presence`, `SalvageEvent` of 8.2, `FrameTable`, card data types, refusal keys), the signatures of 2.13 and 2.15 with bodies that throw `notBuilt`, `src/config/schema.salvage.ts` with the starting values, the map format and the event-to-sound table. After hour 2 the contract changes only through `requests.md` with both rules owners' agreement.

| Package | Owns | Contract it keeps | Shows it works |
|---|---|---|---|
| **P1 Rules, the hand** | `src/engine/salvage/types.ts`, `content.ts`, `money.ts` (roundScrip, resolution, ticket lines), `hand.ts` (presence, cut, pickup, feed, drop, weigh), `things.ts` (objects, pieces, zones, weigh-in bay), `machines.ts`, `truck.ts` (skips, hook, weigh-in, tip), `create.ts` (fresh, reconcile), `notBuilt.ts`; BLOCK P1 of `src/engine/salvage.ts`; SECTION P1 of `src/config/schema.salvage.ts`; `src/engine/fixtures/salvage.ts`; the tests beside its files; BLOCK P1 of `src/modes/salvage/actions.ts` | types first; events of 8.2 | `NODE_OPTIONS=--max-old-space-size=3000 npx vitest run src/engine/salvage/{hand,things,machines,truck,money}.test.ts` |
| **P2 Rules, the business** | `board.ts`, `deal.ts`, `crew.ts`, `flow.ts` (the rate functions shared by tick and away), `offline.ts`, `ladder.ts` (supplied, range, rungs, rivals, R), `goals.ts` (goals, prompts, advice), `tick.ts`, `cards.ts` (`cardOf`), `frame.ts`; BLOCK P2 of `salvage.ts` and of `actions.ts`; SECTION P2 of the schema; `src/engine/salvageMode.ts`; their tests | the replay gate (2.16) | `npx vitest run src/engine/salvage/{board,deal,crew,offline,ladder,goals,tick}.test.ts src/engine/salvageMode.test.ts` |
| **P3 Numbers prototype, bot and content build** | scratchpad `proto/yard/` (the prototype: sections 2 and 3 in a standalone script, every (proto) number with its smallest failing example, before P1/P2 bodies are final); `src/engine/salvage/bot.ts`, `bot.test.ts`, `scripts/content/yard-bot.ts`, `scripts/content/build-yard.py`, `src/config/salvage.content.ts`; `games/scrap-yard/game.json` (generated) | content field names of the contract | `python3 scripts/content/build-yard.py --check`; `npx tsx scripts/content/yard-bot.ts --seeds 15 --report` |
| **P4 The world** | `src/ui/salvage/world/{frameLoop,camera,collide,stick,yard,useRulesTable,useYard,YardView,AtlasView,actors,crewPaths,labels,chevron}.ts(x)`, `world.test.ts`, `input.test.ts`; `scripts/content/yard/map.json` | the frame table; presence of 3.6 | `npx vitest run src/ui/salvage/world`; `npm run lint:worklets`; screenshot `node …/shot.js 'dev=1' w.png --port 8304 --w 844 --h 390` and at 667 × 375 |
| **P5 Bars and cards** | `src/ui/salvage/{SalvageShell.tsx,uiState.ts,palette.ts}`, `src/ui/salvage/hud/*`, `src/ui/salvage/overlays/*`, `src/ui/salvage/dev/*`, `src/ui/salvage/strings.ts` (sections hud, cards, settings) | card data types; refusal keys; sizes of 4 | `npx vitest run src/ui/salvage/hud src/ui/salvage/overlays`; screenshots of every overlay at both sizes and at fontScale 1.3 (`fontScale=1.3` switch) |
| **P6 Art** | `src/ui/salvage/world/{draw,atlas,ground}.ts`, `src/ui/salvage/art/*`, `scripts/art/scrap-yard-icons.py` (replaces the placeholder), `games/scrap-yard/{icon,adaptive-icon,splash}.png` | sprite ids and anchors of the ground work; the style sheet | `npx vitest run src/ui/salvage/art`; the atlas sheet dump `?dev=atlas`; the icon board at 60 px |
| **P7 Sound** | `src/services/fx/catalog.salvage.ts`, `src/modes/salvage/soundKeys.ts`, `scripts/audio/yard/*`, `games/scrap-yard/assets/sfx/*` | keys of 7; event-to-key table | `npm run check:bundle`; `npx vitest run scripts/lib/fxCatalog.test.ts`; listen in the preview with `?dev=sounds` |
| **P8 Loading animation** | `src/ui/salvage/Loading.tsx`, `src/ui/salvage/loading/*` | bake progress from P6 (`atlasProgress()`) | `?view=loading` screenshots at 0.2, 1.0, 1.8, 2.3 s |
| **P9 Hints and the first minutes** | `src/ui/salvage/hints/*` (ghost thumb, chevron rules, first-Open hint hand via `useTarget`), `src/ui/salvage/strings.ts` section hints | `nextGoal`, target ids | `npx vitest run src/ui/salvage/hints`; the bot's opening replayed in the preview `?preset=fresh&autoplay=opening` |
| **P10 Content and names** | `scripts/content/yard/{grades,objects,partners,goals,lessons,lines}.json`, `scripts/content/yard/check.ts`, `scripts/content/yard/format.ts`; with the names desk on `names.json` (theirs) | ids of the contract | `npx tsx scripts/content/yard/check.ts --all` |
| **P11 Store placeholder** | `games/scrap-yard/store/{fingerprint.json,releases.json,REVIEW-NOTES.md}`, `scripts/content/yard-store.json` | the four new vocabulary words (master 1.2) once the lead adds them | `npx tsx scripts/validate.ts scrap-yard --no-sim` |
| **Wiring owner** (the lead or whom the lead names) | `src/modes/salvage/{index.tsx,presets.ts,presets.web.ts,devViews.ts,devViews.web.ts}`, `src/modes/entries.test.ts`, `scripts/lib/*`, `src/ui/hints/targets.ts`, every shared file | layering | `npm run check:bundle`; `npm run typecheck`; `npm test` |

`src/engine/salvage.ts` and `src/modes/salvage/actions.ts` are split into BLOCK P1 and BLOCK P2; `strings.ts` into sections; `schema.salvage.ts` into SECTION P1 (grades, objects, machines, tools, partners, map positions read by the rules) and SECTION P2 (board, deal, crew, ladder, goals, away).

**Order**: hour 0 contract; P3's prototype runs from hour 0 on the specification alone and reports by hour 6; P1 and P2 build on the fixture; P4, P5, P8, P9 build on presets and the stubs' frame table; P6 and P7 from the lists here; join when P1 and P2 pass their tests; the normal-hand bot then plays the joined rules; the three people play (8.6); only then P3 tunes.

---

## 10. Left out, and what must not be precluded

**Left out of stage 1** (ruling 5; master 9): the baler, the magnet crane, the forklift, the pallet truck; Larkin's Garage and Pell Street Plumbing; bench hand, torch cutter, furnace hand; feature lots, the boss's pile, commissioning; the Trade Book; purchases and live ads (the away card's ad button exists but is hidden; `monetization` stubs only); the two exchanges, dealers, shipping, standing sales; a second skip slot on the truck; night and dusk lighting; real players.

**Hooks stage 2 needs** (build nothing more, preclude nothing):
- Content-driven grades, objects, machines and partners: adding stainless, lead ingot and bronze is data, not code.
- The back-field gate at (0.5, 20) opens onto a second walkable area west (x −60 to 0): the world's x range must not be hard-coded.
- A machine is any content entry with in, out, rate or batch; lines (several machines in fixed slots) reuse `flow.ts`.
- Feature lots arrive at the weigh-in bay's apron (60, 13): the zone list is open.
- `R(assets)` and the rung caps are the server bound's inputs; the away pass already takes a site list of one.
- The price board's family list and day step; stage 3 adds 10-minute steps without changing `sell(grade, shown)`.
- The truck's skip list allows a second slot; the driver's partner order takes any number of partners.
- Crew slots and roles are content; the foreman rule takes a site id.
- The industry table's rows are a list of `{id, name, tonnes(d), simulated}`, so followed players can be pinned rows later.
- Save `v: 2` reconciles forward; positions are never part of the rules.
