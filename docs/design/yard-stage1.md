# Scrapyard stage 1: the first yard, buildable

Status: revision 0, 25 November 2026 (step `spec-stage1`). It details stage 1 of `docs/design/yard-design.md` (the master) under the lead's ruling (`RULING.md`, point 5 first). A number this file sets that the master left open is a starting value: **(tune)** the content build script may move it inside the stated range; **(proto)** the numbers prototype must confirm it before rules are built on it. Every name marked **†** goes to the names register (`scripts/content/yard/names.json`) and may change; nothing is drawn or written on it until the register clears it. Rules tests never read these numbers: they run on the frozen fixture (8.1).

Units: § the scrip; m metres on the ground plane (x east, y south, as the ground work); kg in prose, integer grams in the rules; money in integer hundredths; seconds of the market clock unless marked.

---

## 1. The first yard

### 1.1 In five sentences

1. You arrive at Kettle Lane Yard †, a run-down back-lane yard 64 by 40 m, and steer your worker with one thumb; stop beside a washing machine and it comes apart piece by piece onto the frame on your back.
2. Everything you carry onto the weighbridge prints a ticket by grade and net weight at the day's posted price (light iron §0.50 a kilo, stripped bare bright copper §35), and any grade can be held in its bay for a better day.
3. You buy tools (spanners, angle grinder, cutting torch), carrying gear (frame, gloves and harness, sack truck), a cable stripper, a motor bench and a small crucible furnace that pours your first brass ingot inside the first half hour.
4. You hire a yard hand, a cutter and a driver who carry, cut and fetch skips from Hob's Farm Clearance † and Ruddock Demolition † down the lane, so the yard earns while you are away.
5. The industry table is one tap away from the first second: 25 simulated rival firms ranked by lifetime tonnes supplied under the top rung "The largest full metal recycling and resource supplier", and you pass the first rival inside five minutes.

### 1.2 The first five minutes (normal hand of master 12.4; 0:00 = the gate opening that ends the loading animation)

| Time | On screen | Thumb | Sound |
|---|---|---|---|
| −2.4 to 0:00 | Loading (6.4): crane, five plates spelling the title, the display counting, a crucible pours a bar that cools to brass; the gate swings open. | (tap skips from the 2nd launch) | crane, clanks, beeps, glug, ticks, gate |
| 0:00 | Morning yard. Worker at the office door (45.5, 17.8). 5 m right, the public weigh-in bay: a washing machine with a pulsing yellow ring, a bicycle, a washing machine. Left: the furnace pad, sign "Crucible furnace §1,500", a cooled brass ingot on a pallet. Bar: "§0" · "26th of 26 · next: Dobbin & Daughters Scrap † 0.15 t" · "0 / 40 kg" · clipboard. Goal: "Take the washing machine apart". Ghost thumb drags lower left. | — | yard radio starts, birds, traffic |
| 0:01 to 0:02.5 | Ghost thumb fades; he walks right and stops. | drag right, release | boots |
| 0:02.5 to 0:12.5 | After 0.25 s still, spanners: lid 12 kg (0:05), sides 12 + 12 (0:07.3, 0:09.7) arc onto his back: 36 / 40 kg. The drum (8 kg) does not fit and drops beside him; the counterweight thuds into the waste skip; chip "Stack full". The motor (6 kg) drops beside the drum. | released | clanks, thud |
| 0:12.5 | Goal "Weigh it out on the weighbridge"; chevron over the plate. | — | tick |
| 0:16 to 0:16.8 | On the plate (7 m), the display counts to 36.0 kg; the ticket slides in upper right: "Light iron 36.0 kg × §0.50 = §18.00 · ID checked · paid by transfer" and "Light iron: thin steel from appliances. The cheapest metal in the yard." Cash §18.00. | drag, release | beeps, printer, stamp, coin, haptic |
| 0:17 | Goal "Bring something worth more than iron"; the old-stock corner glints 25 m north-west. | — | — |
| 0:20 | Walking past, he picks up the motor (§2.50 a kilo, first) and the drum: 14 / 40. | drag | pickups |
| 0:26 to 0:30 | Old stock: crate of brass taps 8 kg, two aluminium wheels 9 kg: 40 / 40. Three cable coils stay. The old car shows "Needs a cutting torch". | steer | brass ring, aluminium tonk |
| 0:38.8 | Ticket 2: Yellow brass 8.0 kg × §16.00 = §128.00 · Aluminium wheels 18.0 kg × §5.60 = §100.80 · Electric motor 6.0 kg × §2.50 = §15.00 · Light iron 8.0 kg × §0.50 = §4.00 · §247.80; lessons for brass and wheels. Cash §265.80. | — | ticket |
| 0:39 | Goal "Buy the cable stripper (§150)"; chevron on its pad. | — | — |
| 0:46 to 0:57 | At the pad the button reads "Open"; the stripper card (price, what it does, Buy §150); Buy. Cash §115.80. | right thumb: Open, Buy | open, buy |
| 0:57 to 1:05 | A flatbed rolls in, its crane sets the stripper down (3 s), it leaves. He picks up two coils (40 kg). | steer | diesel, crane, clank |
| 1:05 to 1:13 | In the hopper zone the coils fly in; bright copper spools out, the PVC drops in a bin; he takes two coils of bare bright (8.4 kg each) from the tray. | stand, step | zip, dink |
| 1:22.3 | Ticket 3: Bare bright copper 16.8 kg × §35.00 = §588.00; "Bare bright: clean, stripped, unalloyed copper. Seventy times the iron price." Cash §703.80. | — | ticket, bigger coin flourish |
| 1:30 to 1:50 | Goal "Buy gloves and harness (§60)"; bought at the tool rack; a van drops a box; "0 / 60 kg". Cash §643.80. | — | buy, van |
| 1:50 to 2:20 | Goal "Carry out the cast-iron radiator (45 kg)". He strips the third coil, then carries its copper and the radiator (53.4 kg). Ticket 4: Bare bright copper 8.4 kg = §294.00 · Cast iron 45.0 kg × §0.95 = §42.75. Cash §980.55. | — | ticket |
| 2:30 to 2:50 | Goal "Hire a yard hand (§300)"; hired at the office's shift board; an orange vest walks out of the portacabin to the weigh-in bay. Cash §680.55. Goal "Cut at the weigh-in bay: the yard hand carries what you leave". | — | door, boots |
| 2:50 to 3:10 | He cuts the bicycle and the second washing machine; what does not fit lies at the bay; the yard hand carries it to the plate beside him; a small crew ticket. Lifetime passes 0.15 t: the chip slides "25th of 26 · passed Dobbin & Daughters Scrap". | — | chip slide |
| 3:10 to 4:00 | A public van sets down an appliance every 40 s. | — | van |
| 4:00 to 4:11 | Goal "Buy the angle grinder (§300)"; bought; sparks: a washing machine now takes 4.3 s instead of 10. | — | grinder |
| 4:30 to 5:00 | Goal "Cut up the cast-iron bath" (110 kg, four sections); ticket §104.50. | — | — |

Ruling 5's list, in its order: the poured bar; a wreck apart onto the back (0:02.5 to 0:12.5); a ticket by weight and grade (0:16.8); the value jump the player causes (1:22, 70 × iron); a purchase arriving in the world (the stripper at 0:57, and after the jump the gloves at 1:50); a helper carrying beside the player (2:50); the furnace pad with price and sample in view at 0:00 (both phone sizes); the chip passing a named rival (about 3:00). Purchase prompts at 0:39, 1:30, 2:30, 4:00: at most one a minute.

### 1.3 Minutes 5 to 60 (normal hand; the sketch of 2.18 to minute 30, then projected; all (proto))

| Min | Goal / purchase / arrival |
|---|---|
| 6:50 to 7:08 | Buy the hook-lift truck (§700); it drives in and parks. Hob's skip has stood full since 5:00. |
| 7:15 to 7:55 | Fetch Hob's skip: first drive out, swap, weigh-in ticket, tip. |
| 8 to 10 | Cut and sort the skip; the yard hand carries the floor. |
| 10:30 to 10:49 | Buy the motor bench (§500); a washer's motor now pays §53.91 instead of §15. |
| 11:30 to 11:55 | Buy the sack truck (§400, 120 kg). Passed Pennick Scrap † (1.5 t). |
| 15:30 | Reach Licensed dealer (2 t, 3 metals): the radiation portal and ID desk appear. |
| 16:00 to 16:34 | Hire a cutter (§1,200): "The yard now earns while you are away." |
| 17:30 | Sign the Fennick Foundry deal (optional). |
| 18:30 | Hold yellow brass for the crucible. |
| 19:15 to 19:28 | Buy the crucible furnace (§1,500); the sample pallet goes. |
| 19:45 to 22:40 | Charge the crucible (25 kg held brass, carried by the yard hand); heat 160 s; **first pour**: four 5 kg brass ingots glow and cool in 3 s. |
| 23:45 | Passed Wrenfield Metals † (5 t). |
| 24:00 to 24:19 | Hire a driver (§2,000); a blue vest takes the truck. |
| 31 | Buy the cutting torch (§2,500): Ruddock's gate opens. |
| 33 | Cut up the old car: "Catalytic converter, whole · 1 by assay · §884.25". |
| 35 | Fetch Ruddock's skip (3 t). |
| 40 | Night shift (§3,000): away cap 6 h. |
| 45 to 50 | Passed Cobbet Lane Metals † (18 t): four rivals in the hour. |
| 55 to 65 | Reach District merchant (25 t, 6 metals): second yard hand and cutter slots. |

The sketch misses the master's "next purchase never more than 3 min away" three times (7:08 to 10:49, 11:55 to 16:34, 19:28 to 24:19). The fix is the advice line of 2.11 (a level offered when the next planned purchase is over 3 min away); the prototype measures it.

---

## 2. The rules

Pure TypeScript in `src/engine/salvage/`, 10 ticks a second, deterministic: no `Date.now`, no `Math.random` (randomness is `hash01(worldSeed, …)` counter hashes, `worldSeed` a content constant).

### 2.1 Money and weight on paper

- `roundScrip(x)`: below §1,000 half up to the hundredth; from §1,000 half up to the whole scrip. Every amount shown or paid goes through it once.
- **Weighbridge resolution**: a ticket line's mass is the grade's grams rounded half up to 0.1 kg below 100 kg, 1 kg from 100 kg, 10 kg from 10 t. Line amount = roundScrip(resolved kg × price per kg); total = Σ lines. So the printed arithmetic is exact. **Supplied** counts the resolved masses; the world conserves exact grams.
- Mass shows at that resolution ("8.0 kg", "340 kg", "12.34 t"; ferrous from 1 t in t). Prices are integer hundredths per kg; the converter is priced per piece.

### 2.2 Grades (content `salvage.grades`)

| id | Name | Material (range) | Family | p̄ §/kg | Kind | Bay |
|---|---|---|---|---|---|---|
| li | Light iron | light iron | ferrous | 0.50 | product | ferrous bay (5 t) |
| ci | Cast iron | cast iron | ferrous | 0.95 | product | ferrous bay |
| hms | HMS 1&2 (80:20) | steel | ferrous | 1.20 | product | ferrous bay |
| hmsu | Heavy steel, unprepared | steel | ferrous | 0.85 | product | ferrous bay |
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
| cat | Catalytic converter, whole (by assay) | — | precious | §884.25 a piece | intermediate | cage (10 pieces) |

Waste has no grade, value or fee: the concrete counterweight and car waste (tyres, glass, seats) go to the waste skip, PVC to the stripper's bin, both "to a licensed contractor". True ratios kept (yard-metals.md 3): bare bright 70 × light iron; copper about 29 × steel; aluminium ingot 1.7 × wheels; brass 0.46 × copper (held low; the ingot lifts it). Converter at p̄: 0.55 × (5 g Pt × §126 + 5 g Pd × §86 + 1.5 g Rh × §850) − §400 = §884.25. "Precious" is a fourth price family the master's list did not name.

### 2.3 Objects and their pieces (content `salvage.objects`)

Cut time per piece t = max(0.6, kg × h / P) s, P the tool power in kg/s (2.4), h per piece; pieces in the listed order; "loose" = one piece, no cut; "Whole" = the grade an uncut object may be weighed out as, if a carrier can lift it.

| id | Name | Tool | Pieces in order (kg × n grade h) | Waste | Whole | Where |
|---|---|---|---|---|---|---|
| washer | Washing machine | 1 | 12 li 1.0 (lid); 12 × 2 li 1.0; 8 li 1.0 (drum); 6 mot 1.0 | 20, with the drum | — | weigh-in bay |
| bike | Bicycle | 1 | 11 li 1.0; 3 alc 0.8 | — | — | weigh-in bay |
| radiator | Cast-iron radiator | 2 | 15 × 3 ci 1.5 | — | ci 45 | bay; old stock |
| cylinder | Copper hot-water cylinder | 1 | 7.5 no2 1.0; 1.5 brs 1.2 | — | — | weigh-in bay |
| taps | Crate of brass taps | loose | 8 brs | — | — | old stock |
| coil | Coil of insulated cable | loose | 20 cab | — | — | old stock (3); Ruddock's |
| wheel | Aluminium wheel | loose | 9 alw | — | — | old stock (2) |
| bath | Cast-iron bath | 2 | 27.5 × 4 ci 1.5 | — | ci 110 | old stock |
| car | Old car, fluids drained | 3 | 14 batt 1.0; 9 × 4 alw 0.8; 4 cab 1.0; 6 cat 2.0; 100 × 8 li 2.0 | 200, with the last | — | old stock |
| sheet | Bundle of corrugated sheet | 1 | 20 × 2 li 1.0 | — | — | Hob's |
| gate | Field gate | 1 | 20 × 2 li 1.0 | — | — | Hob's |
| stove | Cast-iron stove | 2 | 30 × 3 ci 1.5 | — | ci 90 | Hob's |
| trough | Cast-iron trough section | loose | 30 ci | — | — | Hob's |
| plough | Old plough frame | 3 | 15 × 4 hms 2.5 | — | hmsu 60 | Hob's |
| fittings | Box of brass fittings | loose | 15 brs | — | — | Hob's |
| offcuts | Copper pipe offcuts | loose | 10 no2 | — | — | Hob's |
| beam | Steel beam | 3 | 30 × 10 hms 2.5 | — | — (300 kg) | Ruddock's |
| cladding | Sheet steel cladding | loose | 30 li | — | — | Ruddock's |
| pipe | Bundle of copper pipe | loose | 20 no2 | — | — | Ruddock's |
| valves | Crate of brass valves | loose | 15 brs | — | — | Ruddock's |

A thing too tough for the current tool shows "Needs an angle grinder" / "Needs a cutting torch". The car's 100 kg body sections are carried only by the boss with the sack truck (the yard hand's card: "Too heavy for a yard hand: 100 kg").

**The public weigh-in bay** (never "drop-off"): eight slots; at 0:00 washer, bike, washer in slots 0 to 2. Arrival k (k ≥ 1) is due at 40·k s and takes the lowest free slot; while eight wait the due arrival waits, arrives when a slot frees, and the next is due 40 s later. Kind by u = hash01(worldSeed, 'tip', k): washer below 0.55, bike below 0.80, radiator below 0.95, else cylinder. Never a converter, a gas cylinder or a closed tank (ruling 10).

### 2.4 Tools and carrying (the tool rack)

| Item | Price | Effect |
|---|---|---|
| Spanners and bolt cutters | owned | tool 1, P 5 kg/s |
| Angle grinder | §300 (tune 200 to 400) | tool 2, P 12 |
| Cutting torch (oxy-propane) | §2,500 (tune 1,800 to 3,500) | tool 3, P 30; opens Ruddock's |
| Carry frame | owned | 40 kg |
| Gloves and harness | §60 (tune 40 to 100) | 60 kg |
| Sack truck | §400 (tune 300 to 600) | 120 kg, pushed while carrying |

The boss walks 4.0 m/s with any load. Pickup is automatic within 1.0 m, moving or still, 0.15 s a piece, highest § per kg first (ties: heavier first); a piece heavier than the free capacity is not lifted; a carried piece is never displaced; pieces in a chalk circle are the crew's and the boss does not pick them up.

### 2.5 Machines

Fixed pads; an input buffer; a rate or a batch; an out tray; levels 1 to 10 (rate × 1.15^(L−1); L → L+1 costs price × 1.55^(L−1), tune 1.4 to 1.7). No running cost. A full tray stops the machine; nothing is lost. Outputs are floor(grams × share); the waste, or the last output, takes the remainder, so mass is exact.

| Machine | Price | In → out | Rate | Buffers |
|---|---|---|---|---|
| Cable stripper | §150 (tune 100 to 250) | cab → 42 % bb (one piece per input piece) + 58 % PVC | 6 kg/s | in 200 kg, tray 200 |
| Motor bench | §500 (tune 400 to 800) | mot → 25 % no2, 67 % li, 8 % alc (three pieces a motor) | 2 kg/s | in 120, tray 200 |
| Crucible furnace (small) | §1,500 (tune 1,200 to 2,000) | brass recipe: brs → 97 % metal + 3 % brd; aluminium recipe: alc or alw → 94 % + 6 % ald; metal cast in 5 kg ingots (bri, ali); the remainder below 5 kg stays as heel for the next heat of the same recipe | charge 25 kg; heat (60 + 4 × charge kg) s, 160 s full, ÷ 1.15^(L−1) | 50 kg waiting; tray 100 |

- A heat starts when the charge is full, or with at least 40 % (10 kg) after 60 s without feed. Recipe on the card (default brass); a change is refused while a heat runs or the other recipe's heel remains ("Pour the heel first"). Card switch "Take from bays" (default on): held stock of its inputs is the yard hand's to bring.
- Example: 25 kg brs (§400) → 24.25 kg metal → four 5 kg ingots (§420) + 4.25 kg heel + 0.75 kg dross (§1.50).
- **Foreman** (master 3.4): machines and crews run × 1.25 (tune 1.15 to 1.40) while the boss has *worked* in the last 20 s (finished a piece, fed, picked up, dropped, weighed out, hooked, tipped). Never while away.

### 2.6 Crews (the office's shift board)

| Role | Hire | Slots | Work | Rate at level L (f = 1.25 foreman, else 1) |
|---|---|---|---|---|
| Yard hand (orange) | §300; second §600 | 1; +1 at rung 3 | Carries pieces from chalk circles, trays, the weigh-in bay front and the tipping floor: to a machine whose buffer has room and takes the grade, else to the plate; highest § per kg first; brings held stock to a machine that takes from bays. | one trip per T = 2·L_route / v + 2.0 s, up to 60 kg; v = 3.0 × 1.12^(L−1) × f m/s; levels 1 to 10 |
| Cutter (yellow) | §1,200; second §2,400 | 1; +1 at rung 3 | Cuts the oldest uncut thing at the weigh-in bay, then the tipping floor (never old stock), with the yard's best tool, skipping what the boss cuts; pieces stay where they fall. | power = min(0.95, 0.60 × 1.12^(L−1)) × P × f; levels 1 to 5 (6 refused: "At 95 % of the tool: buy a better tool") |
| Driver (blue) | §2,000 | 1 | Takes the truck from the truck park when the boss is not in it, to the open partner whose skip has been full longest, if cash ≥ its price, its contents at today's prices are worth more, and the floor holds under 1.5 t. Swap, back, weigh in, tip, park. | 0.8 × the boss's speeds; no levels in stage 1 |

A yard hand serves the first route with work in this order: a machine hopper with room and a source, chalk circles, trays, the bay front, the tipping floor. Route length = 1.15 × the straight distance between anchors (3.2):

| Route | L m | T s (L1, f 1) | kg/s |
|---|---|---|---|
| bay front → plate | 6.5 | 6.4 | 9.44 |
| tipping floor → plate | 35.6 | 25.7 | 2.33 |
| old stock → plate | 29.0 | 21.3 | 2.81 |
| stripper tray → plate | 28.0 | 20.7 | 2.90 |
| bench tray → plate | 34.7 | 25.2 | 2.39 |
| crucible tray → plate | 19.9 | 15.3 | 3.92 |
| bay front → stripper hopper | 19.5 | 15.0 | 4.01 |
| bay front → bench hopper | 26.4 | 19.6 | 3.07 |
| brass stillage → crucible hopper | 25.3 | 18.9 | 3.18 |

The walk on screen is interpolated from the trip's phase and decides nothing. Hires walk out of the office door after its card closes.

### 2.7 The lane's two partners

| Partner | Opens | Skip (nominal) | Fill | Buy price | Contents (count × object) | Value at p̄ |
|---|---|---|---|---|---|---|
| Hob's Farm Clearance † (Hob Garnett †) | with the truck | 1,000 kg | 300 s | §0.30/kg | 10 sheet, 5 gate, 2 stove, 4 trough, 1 plough, 2 fittings, 1 offcuts | §1,446 |
| Ruddock Demolition † (Rosa Ruddock †) | with the torch | 3,000 kg | 480 s | §0.60/kg | 7 beam, 15 cladding, 12 coil, 6 pipe, 6 valves | §9,585 (cable whole), §11,673 stripped |

- Count of object i in skip s: max(1, round(n × (1 + 0.15 × (2·hash01(worldSeed, partner, s, i) − 1)))). Mass = Σ; price = roundScrip(mass kg × buy price).
- Both skips fill from the game's start (visible from the lane at once). A skip is hooked only when full; its world label and card: "Full · 1,012 kg · §0.30/kg · §303.60 · worth §1,446 at today's prices", or "Filling 64 % · full in 1 m 48 s".
- **Hook**: the truck with its empty skip still 0.25 s in the skip zone (r 2.5 m); partner open, skip full, cash ≥ price; a 4 s swap ring (moving restarts it); at its end the price is paid and the next skip starts filling.
- **Weigh-in**: still 0.5 s on the plate with an unweighed full skip prints "Weighed in · Hob's Farm Clearance · skip 1,012 kg · §303.60 paid at the skip · ID checked". It counts nothing.
- **Tip**: still 0.5 s in the tip zone with a weighed-in skip: 3 s; cuttable things take places in a 1.6 m grid on the floor (7 × 4 = 28 places, rows west to east from its north-west corner); loose objects go to the floor's pile as pieces. Too few places: "The tipping floor is full". Hob's needs 18 places, Ruddock's 7.

### 2.8 The truck

Hook-lift truck §700 (tune 500 to 900): drives in and parks. Entered by walking into it; left by the one button's "Step out". 6 m/s in the yard, 12 m/s on the lane (x > 63.5); collision circle r 1.3 m. It carries one skip (empty at purchase), never pieces. Carry readout: "Empty skip" / "Hob's skip 1.01 t". If the boss steps out away from the park with a driver hired, the driver walks to the truck and brings it back (path time), then works.

### 2.9 The price board and Hold

- **Market clock** t_m = max(now, clockHigh) UTC ms, saved; clockHigh = t_m each tick. Day D = floor((t_m − EPOCH) / 86,400,000); EPOCH Monday 5 January 2026 00:00 UTC.
- **Price** per kg in hundredths: p_g(D) = round(p̄_g × 100 × (1 + a × w_f(D))), a = 0.05 (tune 0.03 to 0.07), w_f(D) = 2·hash01(worldSeed, f, D) − 1; the converter roundScrip(0.55 × contained × (1 + a × w_precious(D)) − 400). Every phone shows the same board.
- **History**: days D−5 to D as six bars per grade, with the date ("Wed 25 Nov · next prices in 6 h 12 m"). **7-day average** A_g(D) = round(mean p_g(D−6 … D)).
- **Weigh-out**, per grade in ticket order: (1) cast iron first fills the deal's reserve (2.10); (2) if held and its bay has room, to the bay ("Held: to bay", no money, not yet supplied); (3) the rest is sold on the ticket. A full held bay lets the rest pass as sold. Bays never charge.
- **Sell** (bay card or board row): `sell(grade, shown)`, shown = {D, price, grams}: the whole stock at the shown step; if D changed when the tap lands, "Price updated: §0.95 → §0.97" asks again. It prints a ticket and counts as supplied.

### 2.10 The supply deal

Fennick Foundry Co-op † (office partner wall), offered from rung 2: "200 kg of cast iron a day for 5 days at §x a kilo, locked at signing", x = round(A_ci(D) × 1.02). After signing, cast iron weighed out first fills a 200 kg reserve in its bay ("Reserved for Fennick Foundry 140 / 200 kg"). At each 00:00 UTC, before anything else that tick: delivered = min(200 kg, reserve), paid roundScrip(kg × x), supplied; trust (0 to 100, starts 50, gates nothing in stage 1) +5 for a full day, −10 for a short one. **Nothing is ever charged for a miss.** After five deliveries the card offers the same deal again.

### 2.11 Goals, advice, ladder

**Goals** (content; text, a target for the chevron, a done condition, an optional purchase; the card shows the first unfinished; a purchase goal appears no sooner than 60 s after the previous one): 1 Take the washing machine apart · 2 Weigh it out on the weighbridge · 3 Bring something worth more than iron · 4 Buy the cable stripper · 5 Strip the cable and weigh the copper · 6 Buy gloves and harness · 7 Carry out the cast-iron radiator · 8 Hire a yard hand · 9 Cut at the weigh-in bay: the yard hand carries what you leave · 10 Buy the angle grinder · 11 Cut up the cast-iron bath · 12 Buy the hook-lift truck · 13 Fetch Hob's skip · 14 Buy the motor bench · 15 Break a motor · 16 Buy the sack truck · 17 Reach Licensed dealer · 18 Hire a cutter · 19 Sign the Fennick Foundry deal (skippable) · 20 Hold yellow brass for the crucible · 21 Buy the crucible furnace · 22 Charge the crucible · 23 Pour your first ingot · 24 Hire a driver · 25 Buy the cutting torch · 26 Cut up the old car · 27 Fetch Ruddock's skip · 28 Buy the Night shift · 29 Reach District merchant · then "Level your crew and machines".

**Advice line** (the expanded card's third line; the only line after goal 29): the cheapest useful purchase with price ≤ cash + 3 min of income, income = the crews' and machines' steady § a minute plus the boss's sales a minute over the last 5 minutes. A purchase that changes nothing is never offered and is refused (master 12.1.4).

**Rungs** (master 6.1): 1 Back-lane yard (painted plank sign); 2 Licensed dealer (2 t, range 3; steel sign; radiation portal and ID desk window with "Every load checked. Every seller identified. Payment by transfer only."; the deal offered); 3 District merchant (25 t, range 6; lit sign; second slots). Rungs 4 to 9 show greyed with their gates; from rung 3: "Needs the works: more lines arrive in an update".

**Range**: a material counts once its products supplied are worth §300 at p̄ (tune 150 to 600): 600 kg light iron, 316 kg cast iron, 250 kg HMS or 353 kg unprepared, 167 kg batteries (not reachable in stage 1), 54 kg wheels, 18.75 kg brass, 8.6 kg bare bright. Intermediates count tonnes only.

**Rated capacity** R (t/h, master 6.3) = the away pass's steady throughput with the current assets, full feed and no boss; a pure function of assets. Caps 3.9 t/h at rung 1 (the master's 3 + 30 %, so the cutter fits before rung 2 for a slow hand), 12 at rung 2, 40 at rung 3. A purchase lifting R over the cap is refused: "Reach District merchant to grow past 12 t/h". In the sketch R is 0 until the cutter, about 3.4 t/h after it, about 10 with the driver, at most 38 in stage 1 (the lane's and the bay's supply).

**Rivals** (master 6.2, all †): T_r(d) = T_r0 × (1 + g_r × min(d, 40)), g_r 0.005 below 1 kt and 0.01 from 1 kt, d = (t_m − startT_m) / 86,400,000 days. **A rival the player has passed never passes back**: from the first tick with T_player ≥ T_r(d) the row shows min(T_r(d), 0.98 × T_player). Without it, a rival growing 0.5 % a day overtakes a crewless player while away (ruling 3). Rank = 1 + rows above; "Passed X" fires once per rival.

### 2.12 The state (`SalvageState`, `v: 2`, save tag `salvage1`)

```ts
type G = number; type C = number; type Ms = number;                  // grams, hundredths, market ms
interface Piece { id: number; grade: GradeId; g: G }
interface Thing { id: number; obj: ObjectId; next: number; doneGH: number } // next piece; g·h done on it (kept when the boss walks off)
interface Zone { pieces: Piece[]; things: (Thing | null)[] }           // tipBay (8 slots), oldStock, floor (28), chalkA, chalkB, tray:<machine>
interface Bay { g: G; n?: number; hold: boolean }                     // n: converter pieces
interface MachineS { owned: boolean; level: number; inG: Partial<Record<GradeId, G>>; doneG: G; recipe?: 'brass' | 'aluminium'; heatEndsAt?: Ms; heelG?: G; lastFeedAt: Ms; fromBays: boolean }
interface CrewS { role: 'hand' | 'cutter' | 'driver'; level: number; route?: RouteId; tripAt?: Ms; creditGH: number; load: Piece[] }
interface PartnerS { open: boolean; skipNo: number; fillStartAt: Ms }
interface TruckS { owned: boolean; at: 'park' | 'free' | 'run'; skip: null | { partner: PartnerId; skipNo: number; things: Thing[]; pieces: Piece[]; g: G; weighed: boolean }; run?: { startAt: Ms; partner: PartnerId } }
interface SalvageState {
  v: 2; startAt: Ms; clockHigh: Ms; day: number;
  presence: Presence; presenceAt: Ms; stillSince: Ms; workedAt: Ms;
  stack: Piece[]; owned: Record<ItemId, boolean>; zones: Record<ZoneId, Zone>; tipNext: number; tipDueAt: Ms;
  bays: Record<GradeId, Bay>; machines: Record<MachineId, MachineS>; crew: CrewS[];
  partners: Record<PartnerId, PartnerS>; truck: TruckS;
  deal: null | { priceC: C; left: number; reserveG: G; trust: number };
  suppliedG: G; rangeC: Record<MaterialId, C>; rung: 1 | 2 | 3; passed: string[];
  tickets: Ticket[]; ticketNo: number; seen: GradeId[]; goal: number; lastPromptAt: Ms;
  visited: PlaceId[]; awayCapH: 4 | 6; nextId: number;
  lastPos: { wx: number; wy: number; tx: number; ty: number };   // redraw only; the rules never read it
}
```

Presence (the ground work's sample, extended, 3.6): `{ x, y, driving, moving, tx, ty }`; the rules compute nearness from content positions.

### 2.13 Derived values (the screens call these; a screen never computes a price, rate, time or rank)

`priceOf(g, D)`, `boardRows`, `ticketLines`, `cutTime`, `routeRate`, `R(assets)`, `incomeRate`, `rankRows`, `rangeChips`, `cardOf(place)` (each row with its exact price and refusal key or null), `skipLabel`, `nextGoal`, `advice`, `frame(state)` (the world's frame table: things with cut stage, pieces per zone, the stack, machine looks, crew jobs with phase 0 to 1, the truck and its skip, labels).

### 2.14 A tick (dt 0.1 s), in order

1. Clock; on a new D: the deal delivery first, then the board's day.
2. Presence older than 0.6 s → nobody; `stillSince` resets while `moving`.
3. Arrivals: the weigh-in bay; skips turning full.
4. The boss. Driving: hook, weigh-in, tip. On foot, first that applies: on the plate still 0.5 s → weigh out and print; in a hopper zone → feed one accepted piece per 0.12 s; in a chalk circle still 0.25 s → drop the stack; then pickup within 1.0 m (0.15 s a piece); within 1.4 m of a cuttable thing, still 0.25 s → cut the nearest (g·h at P). Each sets `workedAt`.
5. Crews: cutters (a piece finishes when credit ≥ g × h), yard hands (a load lands at each trip's end; the next is taken at its start), the driver's run.
6. Machines: stripper and bench by rate (one input piece at a time); crucible heats.
7. Crew weigh-outs: one collapsed crew ticket per carrier per 10 s at most.
8. Ledger: supplied, range, rung, rivals passed, goals, prompts.
9. Events (8.2).

### 2.15 Actions (`src/modes/salvage/actions.ts`, one rule each)

| Action | Checks (refusal keys of 5.3) |
|---|---|
| `presence(p)` | stale ignored |
| `buy(item, shownC)` | exists, not owned; at its place or visited; shownC = price; cash; R cap; rung gate |
| `hire(role, shownC)` | free slot; shownC; cash; R cap |
| `level(target, shownC)` | below max; shownC; cash; R cap; changes something |
| `setHold(grade, on)` | has a bay |
| `sell(grade, shown)` | stock; shown.D = D else `priceUpdated {from, to}`; shown.g = stock |
| `setRecipe`, `setFromBays` | no heat running; no other heel; owned |
| `signDeal(shownTerms)` | offered; terms equal |
| `stepOut()` | driving |
| `ackAway()` | a report waits (the money was paid when computed) |

### 2.16 Time away

`paysOnCompute: true`, `catchUpSeconds: 0`. A = min(t_m − max(lastSavedAt, clockHigh), Cap); Cap 4 h, 6 h with the Night shift (office, §3,000, tune 2,000 to 4,000). The boss does nothing; no foreman.

**Closed form.** A graph: sources (bay arrivals; skips through the driver, gated by cash and value) → cutting (Σ cutter power) → carrying (Σ yard-hand flows, each 60 kg / T on its route) → machines → bays or sale. Between events every flow runs at its bottleneck rate, highest § per kg first. A segment ends at the first of: a grade's pile or a buffer empty or full; a tray full; an arrival or a freed slot; a skip full; cash reaching a skip's price; a run's end; a heat's end; 00:00 UTC (price step, deal). Within a segment revenue is exactly Σ mass × that day's price; money and tonnes are added in time order, so cash-gated skips are exact. One away line per grade per day. Paid in the update that computes it and recorded under clockHigh: a clock moved back pays nothing; forward, at most Cap once. **Gate**: equal to a 10 Hz replay of the same assets with no boss within 0.5 % of money and tonnes on frozen content, over 1, 4 and 6 h, across a day boundary, a cash-gated skip, a full tray and a crucible heel.

### 2.17 What "supplied" counts

Resolved masses on sale tickets (the boss's, crews', away), held lots when sold, deal deliveries. Never weigh-ins, waste, stock in bays, anything unsold. Lifetime; never falls.

### 2.18 The first thirty minutes at a person's hand (sketch; (proto))

From `scratchpad/yard/stage1/sketch6.py`: a rate sketch at mean prices, the opening scripted as 1.2, the boss 80 % productive, foreman on. Not the prototype. Each row adds up: cash = previous cash + sales − spend (purchases and skips).

| Min | Sales § | Spend § | Cash § | Supplied kg | Rank | What |
|---|---|---|---|---|---|---|
| 0 | 265.80 | 150 | 115.80 | 76 | 26 | tickets 1, 2; stripper |
| 1 | 588.00 | 60 | 643.80 | 93 | 26 | copper; gloves |
| 2 | 336.75 | 300 | 680.55 | 146 | 26 | coil 3, radiator; yard hand |
| 3 | 227.31 | 0 | 907.86 | 337 | 25 | passed Dobbin & Daughters |
| 4 | 104.50 | 300 | 712.36 | 447 | 25 | grinder; bath |
| 5 | 227.31 | 0 | 939.67 | 638 | 25 | |
| 6 | 90.93 | 0 | 1,030.60 | 715 | 25 | |
| 7 | 45.46 | 1,000 | 76.06 | 753 | 25 | truck §700 + Hob's skip §300 |
| 8 | 90.93 | 0 | 166.99 | 829 | 25 | |
| 9 | 92.64 | 0 | 259.63 | 900 | 25 | |
| 10 | 600.35 | 500 | 359.98 | 1,314 | 25 | motor bench |
| 11 | 380.30 | 687 | 53.28 | 1,577 | 24 | sack truck, skip 2; passed Pennick |
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

Sales §10,831.47, spend §8,537. Income is lumpy (a skip sells over about five minutes); over five minutes it averages §139 a minute at minutes 3 to 8, §283 at 10 to 15, §639 at 15 to 20, §356 at 25 to 30. The sketch leaves out the crucible's gain (+§131 on a Hob's skip's brass), Hold and the daily price step.

---

## 3. The yard as a map

### 3.1 The world

x 0 to 300 m, y 0 to 40 m: the yard x 0 to 64 (fenced), the lane x 64 to 300. At 40 pt a metre and tilt 0.7 the screen shows 21.1 × 13.9 m at 844 × 390 and 16.7 × 13.4 m at 667 × 375; the free world about 21 × 8.5 m. The camera keeps the body at the free world's centre with the ground work's 0.35 s lead and runs past the edge by the inset plus 1.2 m. **Ground** is a tile map of 2 m cells (concrete, asphalt, gravel, grass, road, pad edges, markings) from a ground atlas, visible cells only (at most 126 sprites at 844): one baked picture cannot cover 300 m.

### 3.2 Where everything stands (centre x, y; box w × d or circle r; S = solid)

| Thing | Centre | Footprint and notes |
|---|---|---|
| Fences | north y 0.5, west x 0.5, south y 39.5, east x 63.5 | 0.3 deep, sections ≤ 5 m, S; gate opening y 19 to 27 |
| Weighbridge plate | (55.0, 23.0) | 7 × 3.2 decal; "on the plate" = body centre inside |
| Display post | (55.0, 21.1) | r 0.2 S; digits face south |
| Scale house (price board) | (60.5, 17.6) | 3.6 × 2.4 S; Open (58.2, 18.4) r 1.4 |
| Radiation portal (rung 2) | (61.5, 23.0) | posts r 0.25 S at y 19.4 and 26.6; arch over the road |
| Public weigh-in bay | slots (50.5 + i, 16.3), i 0 to 7 | appliances 0.7 × 0.7 S; back wall (54.0, 15.0) 8.4 × 0.4 S; open south; bay-front anchor (52.5, 17.9) |
| Waste skip | (48.6, 16.3) | 2.2 × 1.4 S |
| Chalk circle A | (50.0, 20.2) | r 0.9 decal |
| Office (portacabin) | (45.0, 13.6) | 6 × 2.6 S; Open (45.0, 15.6); crews walk out at (45.0, 15.2) |
| Worker start | (45.5, 17.8) | |
| Tool rack | (39.5, 15.2) | 2.4 × 0.8 S; Open (39.5, 16.4) |
| Furnace pad | (40.5, 19.6) | 4 × 3.2 decal; sign post (38.9, 18.3) r 0.15 S; sample pallet (42.0, 20.5) 0.8 × 0.6 S; crucible 1.6 × 1.6 S at centre; hopper (43.0, 19.6) r 0.8; tray (38.0, 19.6) 1.0 × 0.8; Open (40.5, 21.8) |
| Stripper pad | (33.5, 17.0) | 3 × 2.5; machine 2.2 × 1.4 S; hopper (35.6, 17.0); tray (31.4, 17.0); Open (33.5, 18.9) |
| Motor bench pad | (27.5, 17.0) | 3 × 2.5; bench 2.0 × 1.2 S; hopper (29.6, 17.0); tray (25.4, 17.0); Open (27.5, 18.9) |
| Old stock | x 28 to 40, y 3 to 11; anchor (34.0, 9.0) | coils (31.0, 8.0), (32.2, 8.0), (33.4, 8.0) r 0.45; taps (35.0, 7.6) 0.7 × 0.5; wheels (36.4, 8.2), (37.4, 8.2) r 0.35; radiator (38.8, 7.8) 1.0 × 0.3 S; bath (35.0, 10.2) 1.7 × 0.8 S; car (30.5, 4.8) 4.2 × 1.8 S, nose east |
| Tipping floor | (25.0, 30.5) | 12 × 7 decal; 28 places from (19.8, 27.8) at 1.6 m; tip zone (32.8, 30.5) r 2.2 |
| Chalk circle B | (32.0, 26.4) | r 0.9 |
| Truck park | (47.0, 31.0) | 4 × 2.6 decal; deliveries park here |
| Ferrous bays | li (58.5, 36.8), ci (53.0, 36.8), hms (47.5, 36.8), hmsu (42.0, 36.8) | 5 × 4.4; lock-block walls 0.6 × 4.4 S between; Open at y 34.2 |
| Non-ferrous stillages | x 24.0 + 1.2 j, y 37.4, j 0 to 12: alw, alc, ali, ald, brs, bri, brd, no2, bb, mot, cab, battery box, converter cage | 1.0 × 1.0 S; Open at y 36.4; brass anchor (28.8, 36.4) |
| Notice board (industry table) | (62.6, 28.4) | 1.6 × 0.4 S; Open (61.6, 29.4) |
| Back-field gate (stage 2) | (0.5, 20.0) | 4 m leaf S; "Back field: the works · opens in an update" |

The truck (r 1.3) cannot pass between stillages or into the old stock.

### 3.3 The lane

| Thing | Where |
|---|---|
| Road | x 63.5 to 296, y 19.5 to 26.5; hedges S at y 17.0 and 29.5 with gaps at the entrances |
| Hob's Farm Clearance † | entrance x 146 to 154 (north); site x 138 to 162, y 4 to 16.5; shed, sign, skip zone (150, 12.5) r 2.5 |
| Bridge | x 196 to 212, rails S at y 20.0 and 26.0; "Weight limit 7.5 t" |
| Ruddock Demolition † | entrance x 258 to 266 (south); site x 250 to 275, y 30 to 39.5; hoarding, parked excavator (S), skip zone (262, 33.5) r 2.5; gate S until the torch |
| District road barrier | x 296, S: "To the district road · opens with the market" |

Boss's Hob's run: park → gate 19 m at 6, lane 86.5 m at 12, entry 10 m at 6: 12.1 s out, 4 s swap, 12.1 s back, 1.3 s weigh-in, 3.9 s to the tip zone, 3 s tip, 2.3 s to park = **38.7 s**; Ruddock's **57.3 s**. Driver: 44.8 s and 68.1 s.

### 3.4 Arrivals

A machine: a flatbed with a crane (unbranded) enters, drives to the pad's Open point, sets it down (3 s), leaves; it works from the set-down, whose time the rules compute from content (path at 6 m/s + 3 s), so the bot agrees. Tools and gloves: a van leaves a box at the rack (owned at Buy). The truck drives in and parks. Crews walk out of the office. The Night shift: a new rota sheet on the shift board.

### 3.5 Visible but locked from the first minute

The furnace pad with "Crucible furnace §1,500" and a 5 kg brass sample ingot (x 38.5 to 42.5, inside both first views: x 35 to 56 at 844, 37 to 54 at 667); the old car's "Needs a cutting torch" (seen at 0:26); both partners' skips from the lane; Ruddock's "Opens with the cutting torch"; the back-field gate; the industry table's top rung.

### 3.6 Changes the ground work needs

1. Reach split: work 1.4 m, pickup 1.0 m. 2. Presence carries x, y, driving, moving and the truck's place; the rules compute nearness. 3. Truck speeds by zone; driver 0.8 ×. 4. World 300 × 40 m, tile-map ground, camera centred in the free world. 5. Decals, places with Open points, slots, zones as content in `scripts/content/yard/map.json`. 6. Helpers become crews drawn from the frame table (job, route, phase); `helpers.via` goes. 7. The one button: Step out / Open / blank. 8. Overlays of section 4; a card over the panel dims it (ground check 8). 9. Save tag `salvage1`; positions saved for redraw only. 10. The worker shows as an outline behind taller sprites (ground check 10). 11. `?yardStress=1` and the frame meter on phones (ground check 2).

---

## 4. The screens

### 4.1 Zones (points; insets on all four sides; both landscape directions)

| Row | 844 × 390 (L 47, R 47, B 21) | 667 × 375 (16 margins) |
|---|---|---|
| Top bar | y 0 to 36 | y 0 to 34 |
| Goal card (left) | y 36 to 64, x 59 to 459 | y 34 to 60, x 16 to 356 |
| Free world | y 64 to 301 | y 60 to 299 |
| Bottom (stick left, one button right) | y 301 to 390 (8 + 60 + 21) | y 299 to 375 (60 + 16) |

| Top bar item | 844 (safe 750) | 667 (635) | Text |
|---|---|---|---|
| Cash | 120 | 104 | 15 pt bold, rolling, whole scrip |
| Ladder chip (tap: industry table) | 300 | 240 | 11 pt; the longest form that fits: "26th of 26 · next: Dobbin & Daughters Scrap 0.15 t" / "26th · next Dobbin & Daughters 0.15 t" / "26th · 0.15 t to next" |
| Spare (stage 3) | 150 | 120 | empty |
| Carry readout | 80 | 76 | 11 pt "36 / 40 kg"; driving "Hob's skip 1.01 t" |
| Clipboard | 44 | 44 | icon |
| Gaps | 4 × 14 | 4 × 12.75 | |

Bar text is sized by hand from min(fontScale, 1.3) with `allowFontScaling={false}` (cash 19.5 pt in 36 at 1.3; chip 14.3 in a 26 pt chip). At 667 at most four HUD lines. The stick zone is the ground work's; the one button is a 60 pt circle centred (751, 339) at 844, (621, 329) at 667, label 11 pt ("Open", "Step out"), blank elsewhere, pressed only with the stick released.

### 4.2 HUD parts

- **Goal card**: one line, 12 pt, progress at the right ("12 / 25 kg"); tap: three lines (goal, next, advice), 84 pt, closes after 6 s or a tap.
- **Ticket**: slides in at the upper right under the bar, 240 pt wide (220 at 667), 18 pt lines, at most 7 (header, four grade lines and "+ 2 more", total, the legal line at 9 pt) plus two lesson lines at 11 pt; 4 s (6 s with a lesson) or until the next. Crew tickets are one line ("Yard hand · 58.0 kg · §29.00"). Tap: ticket history.
- **World labels**: 10 pt plates: place names, prices on locked pads, bay chips ("Cast iron 340 kg · held"), skip labels, chips. **Chevron**: hi-vis, 1.2 m over the goal's target; an edge arrow when off screen.

### 4.3 Overlays (the mode's own views with `useOverlay`; one at a time; scrim or Android back closes)

**Right panel**: min(520, 0.58 W) = 489 pt at 844 (x 308 to 797), 0.62 W = 413 at 667; from the bar to the bottom; the place dimmed at the left. Rows 44 pt: name 13 pt, effect 11 pt (31 pt of 44 at 1.3); title 15 pt; Buy 96 × 36 with the price in 13 pt bold. **Centred card**: at most 520 × 300.

| Overlay | Kind | Prints |
|---|---|---|
| Tool rack | panel | Spanners (owned); Angle grinder §300 "cuts 2.4 × faster; cast iron, stoves, the bath"; Cutting torch §2,500 "steel beams, the old car; opens Ruddock's"; Carry frame 40 kg (owned); Gloves and harness 60 kg §60; Sack truck 120 kg §400 |
| Office | panel, tabs Crew · Partners | per role: name †, level, rate in words and number ("carries 2.3 kg a second from the tipping floor"), Hire or Level up with price; Night shift §3,000 "away cap 4 h → 6 h"; partner cards (Hob's, Ruddock's or its condition, the deal from rung 2) |
| Machine | panel | before: price, what it does, in → out, rate, Buy; after: input, tray, status ("Working", "Tray full", "Waiting for cable"), rate, Level up; crucible: recipe, Take from bays, charge / 25 kg, "Pours in 1 m 12 s", heel |
| Price board | panel | date and "next prices in …"; per grade seen: pictogram, name, today's price, six bars, change since yesterday, stock, Hold, Sell with its total; the fictional line on first opening |
| Bay | panel (board at that row) | grade, stock, price, value, Hold, "Sell 340 kg × §0.95 = §323.00", the re-ask |
| Skip | panel | partner, contact, fill or full, mass, price, total, worth today, counts by object, why it cannot be hooked |
| Supply deal | card | the terms of 2.10; Sign / Not now; then days left, reserve, trust, last delivery |
| Industry table | panel | the nine rungs (current lit, next gates), seven range chips, 26 rows (rank, plate logo 24 pt, name, tonnes, "simulated"), the player's row pinned; "Rival firms (simulated). Online play arrives in an update." |
| Away report | card | "Away 3 h 12 m (cap 4 h)"; a line per grade; "4.21 t supplied · §3,148.00 (already in your account)"; "Hob's skip fetched 9 times"; "Fennick Foundry: 200 kg delivered, §194.00"; "You passed Corvay Recycling."; OK. No ad button (10). |
| Rung | card | the sign, the rung, what it opens |
| Clipboard | panel | goals (done ticked), visited places (each opens its card), ticket history (50), Settings |
| Settings | panel | Sound, Music, Haptics, Help (a glossary of the stage's grades), the fictional line, privacy, version, "Start the yard again" with a confirming card |

---

## 5. Content

### 5.1 Names (†, to the names register)

Scrap to Ingot †; Kettle Lane Yard †, Kettle Lane †, Fennick †; Hob's Farm Clearance †, Hob Garnett †; Ruddock Demolition †, Rosa Ruddock †; Fennick Foundry Co-op †; the 25 rivals of master 6.2 †; the scrip †; 60 crew first names †; rung names (generic, still checked). The trade's words (grades, machines, tools, processes) are not registered.

### 5.2 Labels (`src/ui/salvage/strings.ts`; names from game.json)

HUD: "§{n}", "{rank} of {n} · next: {rival} {t}", "{a} / {b} kg", "Stack full", "Open", "Step out", "Needs an angle grinder", "Needs a cutting torch", "Too heavy to lift: {kg}". Places: Tool rack, Office, Scale house, Notice board, Public weigh-in, Waste skip, Tipping floor, Truck park, Old stock. Ticket: "{YARD} · WEIGHBRIDGE TICKET No. {n}", "{grade} {kg} × §{p} = §{x}", "Total net {kg} · §{x}", "ID checked · paid by transfer", "Held: to bay", "Reserved for {deal} {a} / {b} kg", "Weighed in · {partner} · skip {kg} · §{x} paid at the skip". Cards: "Buy §{x}", "Hire §{x}", "Level {n} → {m} · §{x}", "Owned", "Sell {kg} × §{p} = §{x}", "Price updated: §{a} → §{b}", "Hold", "Sign", "Not now", "Pours in {m} m {s} s", "Tray full", "Waiting for {grade}". Market: "Market day {date} (UTC) · next prices in {h} h {m} m"; "All prices, exchanges and shares are fictional and have no real-world value. Nothing in this game is financial advice." Away: "Away {h} h {m} m (cap {c} h)", "{t} supplied · §{x} (already in your account)", "You passed {rival}." Lines: "Every load checked. Every seller identified. Payment by transfer only."; "The yard now earns while you are away."

### 5.3 Refusals (key → text)

"Not enough cash: §{x} more"; "Owned"; "Opens at Licensed dealer"; "Reach District merchant to grow past {c} t/h"; "At 95 % of the tool: buy a better tool"; "No free slot until District merchant"; "Filling {p} % · full in {m} m {s} s"; "Needs §{x} for this skip"; "Weigh it in first"; "The tipping floor is full"; "Pour the heel first"; "Opens with the hook-lift truck"; "Opens with the cutting torch".

### 5.4 Lessons (on a grade's first ticket line; two a ticket at most, a third waits for that grade's next ticket)

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

Voice (master 11): short plain sentences, the trade's words; no exclamation marks, puns or green claims; never bet, stake, invest, win, prizes, order.

### 5.5 Where content lives

Authoring files `scripts/content/yard/{grades,objects,partners,goals,lessons,lines}.json` (words and ids, never a tuned number), the map `scripts/content/yard/map.json`, numbers in `src/config/salvage.content.ts`; `scripts/content/build-yard.py` writes `games/scrap-yard/game.json` (never edited by hand). `npx tsx scripts/content/yard/check.ts --all` checks format, ids, the voice list, the four games' names and Orbit Haulers' words (salvage, haul, ore, cargo, fleet, logistics, contracts), and every text's fit in its box at fontScale 1.3 at 667.

---

## 6. Art

Flat vector, three-quarter oblique (tilt 0.7), drawn in code (`src/ui/salvage/art/`), baked at device density during the loading animation, palette `hi-vis-and-rust` (master 11) under the style sheet `docs/design/yard-style.md`. Everyone in hi-vis, hard hat, gloves, boots, a face shield when cutting; nobody hurt or unsafe.

### 6.1 Sprites (S, N, E drawn, W mirrored; anchored at footprint centres)

| Group | Sprites |
|---|---|
| Boss | idle 1 × 3 directions; walk 6 × 3; cut 4 × 3 per tool (spanners, grinder, torch); feed 2 × 3; sack-truck walk 6 × 3; the stack drawn from stack icons (up to 6) |
| Crews | yard hand walk and carry 6 × 3; cutter walk 6 × 3, cut 4 × 3; driver walk 6 × 3 and in the cab; vests orange, yellow, blue |
| Objects (whole and stages) | washer 4; bicycle 2; radiator 3; cylinder 2; coil; taps crate; wheel; bath 3; old car 5 (whole, battery out, wheels off, interior out, body cut); sheet bundle; field gate; stove 3; trough; plough 2; fittings box; pipe offcuts; beam 4; cladding; pipe bundle; valve crate |
| Pieces (ground sprite + stack icon per kind) | light-iron panel, drum, motor, rim, cast-iron section, copper cylinder, fittings, cable coil, bare-bright coil, windings, end cap, battery, converter, body section, HMS piece, brass ingot, aluminium ingot, dross |
| Machines | stripper and bench: idle, working 3, tray full; crucible: idle, heating 3, pour 4, ingots cooling (tint over 3 s); pegged pads with signs; the furnace pad's sample pallet |
| Vehicles (8 headings) | hook-lift truck × {no skip, empty, Hob's full, Ruddock's full} + hook 3 + tip 3; flatbed with crane + set-down 4; public van and delivery van (4 headings) |
| Weighbridge | plate, post with 7-segment digits and "kg", printer flash, scale house, portal arch, ID desk |
| Stock | lock-block walls, ferrous piles in 5 sizes × 4 grades, stillages in 4 fill levels (tinted), battery box, converter cage |
| Yard and lane | fence panels, gate leaves, portacabin, tool rack (tools shown as owned), notice board, waste skip, PVC bin, chalk circles, park markings, back-field gate, three rung signs; road and verge tiles, hedges, bridge and sign, Hob's shed and sign, Ruddock's hoarding, excavator, barrier, three trees, field tiles |
| Effects | grinder sparks, torch flame, dust puff, piece arc (the piece on a 0.35 s parabola), coin fly, the ground work's ring, chevron |
| HUD icons (GameIcon cache) | 17 grade pictograms readable at 10 pt; tools, carry, crews, machines (3 each); §, ladder, clipboard, settings, lock, clock |
| Logos | 25 rival plates from a generated kit (shape × glyph × two colours, distinct from the stage-5 emblems); cards for Hob's, Ruddock's, Fennick Foundry |

### 6.2 Atlas budget

Sheet A (people, objects, pieces) and sheet B (vehicles, machines, props) of at most 2048 × 2048 px at device density; a 1024 × 1024 ground sheet. At most three atlas draws a frame, 40 actors, 300 sprites; 60 fps while anything moves fast, 30 otherwise. Bake through `Skia.Surface.Make` first (the haul path; ground check 3), dispose surfaces after the copy.

### 6.3 Icon

Three candidates judged at 60 px beside the four icons before anything is built on one: a gloved hand with a bright coil of stripped copper on a ticket stripe; a crucible pouring into a mould, a copper coil behind; a magnet lifting a copper coil over rust. Never a lone gold bar or a truck.

### 6.4 The loading animation (`src/ui/salvage/Loading.tsx`; at least 2.4 s, longer only while bakes run, 6 s at most; a tap skips from the second launch)

| Time | Frame |
|---|---|
| 0.00 to 0.40 | Pale sky #EAF1F4 fades in from the splash; a crawler crane's jib swings in from the left (30° to 0°, ease-out), an electromagnet on its cable; the display shows "0 kg". |
| 0.40 to 1.60 | Five steel plates, 0.24 s each: lowered (0.14 s), landing with a 2 pt shake (0.06 s), the magnet rising (0.04 s). The plates carry the title's letters cut out, split by words and the longest split until five ("SCR", "AP", "TO", "IN", "GOT"). The display counts with the bake's progress to 1,000 kg; while bakes run past 1.6 s the fifth plate waits on the magnet. |
| 1.60 to 2.20 | A small crucible tips (0.2 s); an orange stream (#FF8A2A) pours (0.3 s) into a mould under the title. |
| 2.20 to 2.40 | The bar cools to brass (#D4AF37); "1,000 kg"; the gate leaves open onto the yard (0.25 s cross-fade). |

---

## 7. Sound

A new pack in `games/scrap-yard/assets/sfx` (`soundPack: null`), keys in `src/services/fx/catalog.salvage.ts`, played only through `fx.play`. Haptics: light on a finished piece, medium on a sale ticket, success on a rung.

Steps `step_concrete`, `step_gravel` (walk cycle, by tile) · cutting loops `cut_spanner`, `cut_grinder`, `cut_torch` (hiss then roar) · landings `piece_steel`, `piece_cast`, `piece_alu`, `piece_copper`, `piece_brass`, `piece_lead` (by family) · `thud_waste` · `pickup` · `stack_full` · weigh-out `scale_beeps`, `scale_print`, `scale_stamp`, `coin` · `lesson` (soft bell) · `buy`, `denied` · arrivals `flatbed_arrive`, `crane_set`, `van` · machines `stripper_zip`, `bench_hammer`, `furnace_roar` (loop), `pour_glug`, `cool_ticks` · truck `truck_diesel` (loop, pitch by speed), `truck_reverse`, `hook_swap`, `skip_tip` · crews `door`, `crew_hello` (a hum, no words) · ladder `chip_slide`, `rung_sign` · overlays `ui_open`, `ui_close` · loading `loading_crane`, `loading_clank`, `loading_beeps`, `loading_pour`, `gate_open` · `amb_yard` (birds, traffic, a far reverse beeper).

Music: "yard radio", an original 92 bpm loop of mellow electric guitar and bass over a bed of the game's own metal hits (two 64-bar variants, crossfaded), ducked under tickets; no melody shared with the four games.

---

## 8. Tests, bots and people

### 8.1 Rules tests (vitest, the frozen fixture `src/engine/fixtures/salvage.ts`)

Mass conservation per object, machine and crucible heel; cut times and the 0.6 s floor; tool tiers and Whole; pickup order, capacity, no displacement; chalk drop; feeding; ticket lines, resolution, roundScrip; Hold, full bay, Sell at the shown step and the re-ask at 00:00; equal prices on two devices; a clock moved back pays nothing, forward at most Cap once; the deal (reserve, delivery before spot sales, a short day charges nothing); bay arrivals and the eight-slot wait; skips by seed, fill, hook checks, weigh-in, tip, a full floor; driver gating; crew trips and the cutter's refusal; foreman on and off; rungs and range; rival rows (pure, start-anchored, never passing back); R and caps; every refusal key; the away pass against the 10 Hz replay (2.16); save, reload and reconcile; a tick under 1 ms and 6 h away under 50 ms in node.

### 8.2 Events (the screen's and the sound's contract)

`SalvageEvent` = `cutStart | piece {thing, grade, g, to: 'stack' | 'ground' | 'waste'} | pickup | stackFull | drop | feed | machineOut | heatStart | pour {ingots} | ticket {ticket} | crewTicket | weighIn | hook | tip | arrival {kind: 'tip' | 'flatbed' | 'van' | 'truck' | 'crew'} | owned {item} | refused {key} | rung {n} | passed {rival} | deal {kind} | goal {n} | lesson {grade}`.

### 8.3 Bots (`src/engine/salvage/bot.ts`: the same actions as the screen, a path graph of 3.2 and 3.3 at the boss's speed; follows the goal card and the advice line)

| Bot | Behaviour | Measures |
|---|---|---|
| Normal hand | reaction 0.8 s, path waste 25 %, 6 to 15 s at a card | the minutes of 1.2 and 1.3, prompts, purchase gaps, income, tonnes, rank |
| Fast hand | 0.4 s, 10 %, 4 s | the same (±40 %) |
| Slow hand | 1.2 s, 40 %, 15 s; skips goals 11, 19, 20 | first helper ≤ 9 min; rung 3 ≤ 90 min |
| Idle | 10 min as normal, then opens every 4 h for 2 days | away income, R, rank never falling, rivals never passing back |
| Twice a day | a first hour, then two 8-minute sittings a day for 3 days | rivals passed per sitting, rung 3, the away share |

### 8.4 Hard promises (gates from the first run)

Shown equals applied (every card's number is what is applied; a changed step re-asks). Money comes only from tickets, held-lot sales, deal deliveries and the away pass of the same, and goes only to purchases, levels, hires and skips. Nothing taken while away, nothing built lost, no rank falling while away. No dead end (with §0 and empty bays the weigh-in bay pays within 60 s; every goal reachable, none met by doing nothing). One monotonic clock; a jump never pays twice. Mass conserved.

### 8.5 Aims of this stage (13 of 15 seeds, 5 unseen; bands set by the lead from the measured table; sketch values in brackets)

First ticket ≤ 25 s (16.8 s) · copper jump ≤ 1:30 (1:22) · first helper ≤ 5 min (2:50), slow ≤ 9 · first drive out 7 to 10 min (7:15) · first pour 18 to 25 (22:40) · first rival ≤ 5 min (3:00), four in hour 1 · rung 2 at 12 to 18 (15:30), rung 3 at 55 to 65 (slow ≤ 90) · at most one purchase prompt a minute · next purchase never more than 3 min away in hour 1 (missed three times) · Hold: a patient holder gains ≤ +3 % on the same tonnage · the hand at rung 3: the normal hand earns ≥ 1.2 × the same purchases managed from cards, no mechanism over 3/5 of the gain · an hour away pays ≥ 0.3 of an hour played at minute 60 · tick < 1 ms, 6 h away < 50 ms, `?yardStress=1` read on the iPhone.

### 8.6 People before tuning

Three people-like players (not the engineers) play the built stage on an iPhone at both sizes before any number is tuned, 20 minutes each, reading what it deals in its order; they note with the minute where they did not know what to do, where a card hid what they wanted to see, each text they did not read, each wish for a second thumb, and whether they found the truck and the furnace without the chevron. The notes go to the lead before the content script runs.

---

## 9. Work packages

Every file has one owner; a change to another's file is a line in `requests.md` and a local stand-in. **Hour 0**: P1 commits the contract with P2's agreement: `src/engine/salvage/types.ts` (the state of 2.12, content types with every field of 2.2 to 2.10, `Presence`, `SalvageEvent` of 8.2, `FrameTable`, card data, refusal keys), the signatures of 2.13 and 2.15 with bodies throwing `notBuilt`, `src/config/schema.salvage.ts` with the starting values, the map format and the event-to-sound table. After hour 2 the contract changes only through `requests.md` with both rules owners.

| Package | Owns | Shows it works |
|---|---|---|
| **P1 Rules, the hand** | `src/engine/salvage/{types,content,money,hand,things,machines,truck,create,notBuilt}.ts` and their tests; BLOCK P1 of `src/engine/salvage.ts` and of `src/modes/salvage/actions.ts`; SECTION P1 of the schema (grades, objects, machines, tools, partners, positions); `src/engine/fixtures/salvage.ts` | `NODE_OPTIONS=--max-old-space-size=3000 npx vitest run src/engine/salvage/{money,hand,things,machines,truck}.test.ts` |
| **P2 Rules, the business** | `src/engine/salvage/{board,deal,crew,flow,offline,ladder,goals,tick,cards,frame}.ts` and tests; BLOCK P2 of `salvage.ts` and `actions.ts`; SECTION P2 of the schema (board, deal, crews, ladder, goals, away); `src/engine/salvageMode.ts` and its test | `npx vitest run src/engine/salvage/{board,deal,crew,offline,ladder,goals,tick}.test.ts src/engine/salvageMode.test.ts` |
| **P3 Numbers prototype, bot, content build** | scratchpad `proto/yard/` (sections 2 and 3 as a standalone script reporting every (proto) number with its smallest failing example, by hour 6); `src/engine/salvage/bot.ts`, `bot.test.ts`, `scripts/content/yard-bot.ts`, `scripts/content/build-yard.py`, `src/config/salvage.content.ts`; generated `games/scrap-yard/game.json` | `python3 scripts/content/build-yard.py --check`; `npx tsx scripts/content/yard-bot.ts --seeds 15 --report` |
| **P4 The world** | `src/ui/salvage/world/{frameLoop,camera,collide,stick,yard,useRulesTable,useYard,YardView,AtlasView,actors,crewPaths,labels,chevron}.ts(x)`, `world.test.ts`, `input.test.ts`; `scripts/content/yard/map.json` | `npx vitest run src/ui/salvage/world`; `npm run lint:worklets`; screenshots at 844 × 390 and 667 × 375 |
| **P5 Bars and cards** | `src/ui/salvage/{SalvageShell.tsx,uiState.ts,palette.ts}`, `src/ui/salvage/hud/*`, `src/ui/salvage/overlays/*`, `src/ui/salvage/dev/*`, `strings.ts` sections hud, cards, settings | `npx vitest run src/ui/salvage/hud src/ui/salvage/overlays`; every overlay at both sizes and at `fontScale=1.3` |
| **P6 Art** | `src/ui/salvage/world/{draw,atlas,ground}.ts`, `src/ui/salvage/art/*`, `scripts/art/scrap-yard-icons.py`, `games/scrap-yard/{icon,adaptive-icon,splash}.png` | `npx vitest run src/ui/salvage/art`; `?dev=atlas`; the 60 px icon board |
| **P7 Sound** | `src/services/fx/catalog.salvage.ts`, `src/modes/salvage/soundKeys.ts`, `scripts/audio/yard/*`, `games/scrap-yard/assets/sfx/*` | `npm run check:bundle`; `?dev=sounds` in the preview |
| **P8 Loading animation** | `src/ui/salvage/Loading.tsx`, `src/ui/salvage/loading/*` (bake progress from P6's `atlasProgress()`) | `?view=loading` at 0.2, 1.0, 1.8, 2.3 s |
| **P9 Hints, first minutes** | `src/ui/salvage/hints/*` (ghost thumb, chevron rules, first-Open hint via `useTarget`), `strings.ts` section hints | `npx vitest run src/ui/salvage/hints`; `?preset=fresh&autoplay=opening` |
| **P10 Content and names** | `scripts/content/yard/{grades,objects,partners,goals,lessons,lines,format}.json/ts`, `scripts/content/yard/check.ts`; with the names desk on its `names.json` | `npx tsx scripts/content/yard/check.ts --all` |
| **P11 Store placeholder** | `games/scrap-yard/store/{fingerprint.json,releases.json,REVIEW-NOTES.md}`, `scripts/content/yard-store.json` | `npx tsx scripts/validate.ts scrap-yard --no-sim` |
| **Wiring owner** (the lead or whom the lead names) | `src/modes/salvage/{index.tsx,presets.ts,presets.web.ts,devViews.ts,devViews.web.ts}`, `src/modes/entries.test.ts`, `scripts/lib/*` (with the four new vocabulary words), `src/ui/hints/targets.ts`, every shared file | `npm run check:bundle`; `npm run typecheck`; `npm test` |

**Order**: the contract (hour 0); P3's prototype from hour 0 on this document alone; P1 and P2 on the fixture; P4, P5, P8, P9 on presets and the stubs' frame table; P6 and P7 from the lists here; join when P1 and P2 pass; the normal-hand bot plays the joined rules; the three people play (8.6); only then P3 tunes.

---

## 10. Left out, and the hooks stage 2 needs

**Left out** (ruling 5; master 9): baler, magnet crane, forklift, pallet truck; Larkin's Garage and Pell Street Plumbing; bench hand, torch cutter, furnace hand; feature lots, the boss's pile, commissioning; the Trade Book; purchases and live ads (the ad button exists, hidden; `monetization` stubs); exchanges, dealers, shipping, standing sales; a second skip slot; dusk and night; real players.

**Must not be precluded**: grades, objects, machines, partners and crew roles are content (stainless, lead ingot and bronze are data); the world's x range is content (the back-field gate opens onto x −60 to 0); a line of machines reuses `flow.ts`; feature lots arrive at an open zone list (the weigh-in apron, (60, 13)); `R(assets)` and the caps feed the server bound and the away pass takes a list of sites; the board's families and step length are content and `sell(grade, shown)` survives 10-minute steps; the truck's skip is a list; the foreman rule takes a site id; the industry table's rows are `{id, name, tonnes(d), simulated}` so followed players can be pinned later; save `v: 2` reconciles forward and positions are never rules.
