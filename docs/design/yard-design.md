# Scrapyard: specification of the whole game

Status: revision 1, 25 November 2026 (step `spec-master`): the "hand" design with the judges' grafts and must-fixes, under the lead's ruling (`RULING.md`). **Section 14 (the lead's decisions) overrides the body wherever they differ.** The first yard gets its own detailed document after this one; this file fixes what every stage must respect.
Game folder `games/scrap-yard`; mode `salvage`; landscape; save key `save:scrap-yard:salvage1` (the ground work's `salvage0` is replaced).

Conventions:
- "§" is the scrip, the one currency; "m" a metre of the ground plane; "pace" a person's hand (the normal bot, 12.4).
- **(tune)**: a starting number only the content build script may move, inside its range, to meet section 12; a number without it is a rule; a range is never widened silently. **(proto)**: a number the numbers prototype must confirm before rules are built on it. Every minute, day and income here is a target; rules tests run on frozen test content.
- Rules: pure TypeScript in `src/engine/salvage/`, 10 ticks a second, no `Date.now` or `Math.random`, mass in integer grams, money in integer hundredths of §, one rounding function `roundScrip` for every amount shown or paid.

---

## 1. The game and its fingerprint

### 1.1 The game in five sentences

1. You take over a run-down scrapyard on Kettle Lane and steer your hard-hatted worker with one thumb: stop beside a washing machine, a radiator or an old car and it comes apart in your hands, piece by piece, onto the stack on your back.
2. Every load you carry or drive onto the weighbridge is graded and paid by weight at the day's posted price, light iron at half a scrip a kilo and stripped bare bright copper at seventy times that, and any grade can be held in its bay for a better day.
3. You hire a yard hand, a cutter and a driver who take over each step and keep the yard earning while you are away, and you buy the cable stripper, the cutting torch, the hook-lift truck and, inside the first half hour, a crucible that pours your first brass ingot.
4. Then the business grows around the hand: melt shops and leaching plants built as real chains of unit processes, two invented metal exchanges and their dealers, partners from the farm down the lane to invented electronics and car makers, freight by road, rail, sea and air, and yards and plants in new regions.
5. One table is on screen from the first minute, the industry ranked by tonnes supplied with a range gate that makes "full metal" mean full, and you climb it past named rival firms to the top, the largest full metal recycling and resource supplier, alone or in a company of up to 30 players that can be listed on an exchange.

### 1.2 Fingerprint along the 19 dimensions

Four new words join the closed vocabularies of `scripts/lib/fingerprint.ts` and `spam.md` section 4 (ruling 11), each defined so that none of the four games could honestly claim it:

- **core_verb `steer`**: one thumb moves an avatar or a vehicle continuously through a world with a floating stick; work happens by stopping next to things; nothing is tapped, dragged onto or swiped at as a target.
- **production_topology `separation-tree`**: one input object splits into graded outputs and by-products that go to different places (bays, hoppers, a waste skip), and machines split them further: the reverse of an assembly chain (Pizza), not a network of routes (Orbit).
- **main_screen_layout `three-quarter-world`**: a scrolling world several screens wide, drawn in three-quarter oblique view, followed by a camera, in landscape; not a cross-section, a top-down map, a grid board or a single object.
- **money_moment `graded-lot-sale`**: material leaves as lots of one grade, paid by net mass at a posted price that changes once a market day; the player may hold any grade in its bay for a better day; no customer, departure, completed ticket or timer pays.

Existing words: progression `tech-tree` (the lines unlock as a tree of unit processes, gated by the ladder), prestige `none` (nothing ever resets), character `humans` (shared with Pizza and Proudly Adequate and accepted, ruling 11).

| # | Dimension | Scrap to Ingot | Pizza Empire | Orbit Haulers | Lantern Row | Proudly Adequate |
|---|---|---|---|---|---|---|
| 1 | core_verb [M] | steer | tap-target | drag/route | place/arrange | swipe/aim |
| 2 | production_topology [M] | separation-tree | linear-chain-with-transport | network-routes | spatial-grid | parallel-generators |
| 3 | money_moment [M] | graded-lot-sale | customer-pays | sale-at-depot | contract-complete | auto-tick |
| 4 | main_screen_layout [M] | three-quarter-world | side-cross-section | top-down-map | grid-board | single-object-focus |
| 5 | art_asset_overlap [M] | 0 % planned (all drawn in code in `src/ui/salvage`) | measured at build | | | |
| 6 | store_text_overlap [M] | under 10 % planned (new text; no "salvage", "haul", "ore", "cargo", "fleet", "logistics", "contracts") | measured | | | |
| 7 | icon_and_screenshot_template [M] | own (the house's first landscape set, 11) | human check per game | | | |
| 8 | bundle_foreign_content [M] | none (salvage folders only) | bundle report | | | |
| 9 | progression | tech-tree | location-levels | sector-map | seasons | office-ladder |
| 10 | prestige | none | reset-for-currency | reset-for-currency | seasonal | new-location-carryover |
| 11 | events | {feature-lot, posted-price-step, rung-ceremony, price-window, shipment-arrival, company-order-week} | Jaccard 0 with each | | | |
| 12 | meta | {crews, partners, price-board, exchanges, freight, territories, listing, industry-table, companies} | Jaccard 0 with each (the ids `contracts` and `chests` are avoided on purpose) | | | |
| 13 | meta screens | different (places drawn as places: shift board, posted board, dealing desk, chalk freight board, map room) | human check | | | |
| 14 | art | flat-vector, palette `hi-vis-and-rust` | warm-cream | deep-space-cold | lantern-night | baize-and-ink |
| 15 | character | humans | **same** | differs | differs | **same** |
| 16 | audio | new pack, `soundPack: null`, new music | measured | | | |
| 17 | voice | `weighbridge-plain` (11) | warm-playful | dry-radio-chatter | lantern-calm | deadpan-memo |
| 18 | keywords | scrapyard, scrap metal, smelter, foundry, ingot, copper, furnace, weighbridge, metal recycling | measured (Jaccard < 0.3) | | | |
| 19 | release gap | at least 14 days after Proudly Adequate's last submission | log | | | |

Planned: 8 of 8 musts against each game; 18 of 19 against Pizza Empire and Proudly Adequate (15 same), 19 of 19 against the others. **Nothing counts as differing until measured**: 5, 6, 8, 16 to 18 by the tools, 7 and 13 by a person, 19 from the log. Dimension 17 against Orbit (whose ores are iron, copper, platinum) is the known risk: strings name grades, never bare metals, and are measured after their first version.

**What stage 1 shows that proves each must word** (each within ten minutes):
- *steer*: the floating stick walks the worker across a yard about three screens wide; walking into the truck drives it out of the gate; no target is ever tapped.
- *separation-tree*: the first washing machine splits into light-iron panels (to the scale), a motor (to the bench) and a concrete counterweight (to the rubble skip, worth nothing); the stripper splits cable into copper and PVC; the bench splits a motor into copper, steel and aluminium; the crucible a charge into ingots and dross.
- *three-quarter-world*: the oblique yard, the camera leading the worker, the lane beyond the gate.
- *graded-lot-sale*: every ticket line is a grade, a net mass and the day's posted price; the board shows its date and five days of history; each bay has a Hold flag, and held stock sells later at that day's price.

---

## 2. The world

The world is invented; the trade is real (L2). Two countries face each other across an ocean, standing for the owner's "London" and "Shanghai" without naming or imitating either.

- **Calvany** (the West), a temperate industrial country. Its capital and market city **Bellmarch** holds the **Bellmarch Metal Exchange**. The home district is **Fennick Vale**, an old manufacturing valley; the home yard is **Kettle Lane Yard** on the lane out of the town of **Fennick**. Further sites: **Saltreach** (a deep-water port 220 km west), **Varn Ridge** (uplands 380 km north, aerospace and toolmaking).
- **The Sennath Union** (the East), a fast-growing manufacturing coast 9,000 km by sea. Its port city **Kaymor** holds the **Kaymor Metal Exchange**. Sites: **Ambrel Coast** (battery and electronics makers), **Kaymor Point** (the refinery headland beside the exchange and the air-cargo terminal).
- **The scrip (§)** is the one currency of both countries; prices in the East include the Union's import duty, named on the board. Proportions follow the real trade at about §3 to one US dollar (yard-metals.md section 3); no number is ever presented as a real quote.
- **Kettle Lane** runs east out of the yard gate past the first partners' sites, over a weight-limited bridge, to the district road.
- **The people.** The player is the boss, unnamed, in hi-vis, hard hat, gloves and boots. Crew get first names from a curated list and their role's vest colour. Partners appear on business cards with a contact (Hob Garnett, Rosa Ruddock). No villain, no story cast; rivals are firms, never people.

**Every invented name, to the names register** (ruling 14: a search for clashes in trademark registers, both stores and the four games' content runs before any art or text is built on a name; no name from the fourth game, no near-miss of a real company, exchange, port or town):

| Kind | Names (first choices) |
|---|---|
| Title | **Scrap to Ingot**; fallbacks **Heavy Melt**, then a new search |
| Countries, cities, regions | Calvany, Bellmarch, Fennick Vale, Fennick, Kettle Lane, Saltreach, Varn Ridge, Sennath Union, Kaymor, Ambrel Coast, Kaymor Point |
| Exchanges | Bellmarch Metal Exchange, Kaymor Metal Exchange (no abbreviations shown anywhere) |
| Currency | scrip, § |
| Local partners | Hob's Farm Clearance, Ruddock Demolition, Larkin's Garage, Pell Street Plumbing, Fennick Foundry Co-op |
| Regional firms | Durnav Steel (an electric-arc mill), Ostro Cable Works |
| Corporations (logos drawn) | Vantorra Electronics, Veyra Motors, Aldane Aerospace, Corrin Tooling, Quenwick Electrolysers, Meridane Glass |
| Rival firms (25) | listed in 6.2 |
| Generated parts | crew first names (60), handle words (40 adjectives × 60 nouns × 30 place tags), company name parts (40 × 40 × 8), emblem shapes and glyphs |

"Kettle" occurs in Proudly Adequate's text as a common noun; if the register or the bundle check objects, the lane is renamed before art. Orbit Haulers' names (Halden Yards, Brightwater Foundry, Scrap Pod, Salvage Bay) and the words "salvage" and "haul" never appear in player text.

---

## 3. The hand

### 3.1 Controls (one rule in every stage)

The ground work (`docs/design/yard-ground.md`) stays: one full-screen responder; the stick appears where the thumb lands in the left 45 % of the safe area below its top 28 %, at least 24 pt inside; the knob travels 52 pt and drags the base past that; a second finger is ignored; motion, collision and camera run on the UI thread; the rules receive a presence sample at most ten times a second and decide.

- **Work needs no button.** Within 1.4 m of a workable thing, with the stick released (or centred) for 0.25 s, the worker works it; a ring shows progress; moving stops the work and keeps progress per piece.
- **The one button** (60 pt, lower right, pressed with the stick released) does the one thing the spot offers: **Step out** while driving, **Open** at a place (tool rack, office, scale house, a machine's pad, notice board); blank elsewhere. **Vehicles are entered by walking into them** (ruling 16).
- **Buying is a card, never a tile** (ruling 6): Open shows the place's card at the right, each item with its exact price and one Buy; what was bought arrives in the world (a flatbed's crane sets a machine down in 3 s; new vests walk out of the office).
- **Pickup** is automatic within 1.0 m while capacity allows, 0.15 s a piece, **highest § per kg first**; a piece never displaces one already carried. A chalk circle drops the stack for the crew. **Feeding**: standing in a hopper zone feeds the pieces the machine accepts, one per 0.12 s, highest § per kg first. **Weighing out**: any carrier that stops on the weighbridge plate for 0.5 s hands over everything it carries (5.2).

### 3.2 Cutting, carrying, vehicles

- **Cut time per piece** t = m × h / P, at least 0.6 s. Tool power P (kg/s, the boss): spanners 5 · grinder 12 · torch 30 (stage 1); plasma 60 · excavator shear 250 (stage 2). Hardness h: aluminium 0.8 · light iron, copper, cable 1.0 · brass, bronze 1.2 · cast iron 1.5 · car body 2.0 · heavy steel 2.5. Pieces weigh 3 to 40 kg (1 to 4 s each). A wreck too tough for the tool shows a chip ("Needs a cutting torch") and can be weighed out whole at its unprepared grade.
- **Carry tiers**: frame 40 kg → gloves and harness 60 → sack truck 120 (stage 1) → pallet truck 300 → forklift 1.5 t (stage 2). Walking 4.0 m/s with any stack; a piece heavier than the free capacity cannot be lifted (the cast-iron bath teaches the sack truck).
- **Vehicles**: the hook-lift truck (stage 1; one skip, a second slot as an upgrade; 6 m/s in the yard, 12 on the lane; it swaps skips, never crushes or tows); forklift, magnet-crane cab and excavator shear (stage 2); a site truck at each later site. The boss drives 25 % faster than a hired driver.

### 3.3 Crews (rates, live and away)

A crew member works one station at 60 % of its tool rate, +12 % per level (cost × 1.6 a level, 10 levels), at most 95 %. **Crew work is a rate, live and away, from one function** (ruling 16): a carrier's rate is load × speed ÷ trip length, the trip fixed by the layout; the walk on screen is interpolated from it and decides nothing. Stage 1: yard hand (to the scale or a hopper, 60 kg a trip, 3 m/s), cutter (gate tip, then tipping floor), driver (the skip route in partner order). Later roles come with their machines (bench hand, torch cutter, furnace hand, crane driver, freight clerk, a crew per line).

### 3.4 What the hand is for at every size (ruling 7)

In stage 1 the hand is the main producer (the boss cuts at 100 %, crews at 60 to 95 %). From stage 2 its rewards scale with **I**, the rated income in § per minute (Σ over sites of rated capacity, 6.3, × the site's value per tonne at mean prices p̄, ÷ 60), fixed when a reward is created so that its card shows what is paid.

| Mechanism (stage) | Rule | Reward |
|---|---|---|
| **Feature lots** (2) | One arrives at the gate every 3 h of market time from the player's start (tune 2 to 4); at most 4 wait; never expire; only the boss opens one (4 to 10 s of cutting). One named object allowed at the rung: a bronze ship's bell, a pallet of carbide inserts, a crate of iridium-tipped spark plugs, an engine casing; never a catalytic converter or a pressure vessel. | material worth V = μ × I at p̄, fixed at arrival: μ = 40 min at rungs 2 to 3, 30 at rung 4, 16 from rung 5 (tune 10 to 25); tonnes count when weighed out |
| **The boss's pile and each site's hand station** (2; every site in 4) | Crews set aside f = 15 % (tune 10 to 20) of a site's incoming mass "for the boss" (oversize, mixed alloys); the pile holds 6 h of it. Only the boss works it, at the site's station: the oversize pad at home, the fittings bench at Saltreach, the alloy grading table at Varn Ridge, the module bench at Ambrel Coast, the sample station at Kaymor Point. A full pile sends new set-aside mass out as "mixed". | worked mass sells sorted at u = 1.6 × the mixed price (tune 1.4 to 1.8): about f × (u − 1) of a site's value per day when kept worked |
| **Foreman on site** (1) | Crews and machines at the site where the boss has worked in the last 20 s run faster. | +25 % (tune 15 to 40) |
| **Commissioning** (2) | A new machine starts when the boss stands at it 5 s, else its crew commissions it 20 min after delivery. | 20 min of its output |

**Aim, at rungs 3, 6 and 8:** over 24 h of game, the 45-minutes-a-day habit (12.4) working the hand earns at least a fifth more than the same player managing from overlays with the same purchases; no mechanism gives more than three fifths of the gain. Planned at rung 6: feature lots about 9 %, the pile about 9 %, foreman and commissioning 1 to 2 % (proto: the most doubtful aim of the game). For the twice-a-day habit the gain is reported (planned about 13 %, nearly all from lots and the pile).

---

## 4. Material and value

### 4.1 Units and grades

Every grade is priced per kilogram, except silver, the platinum group, gold and iridium, priced per gram; a grade's unit never changes. Masses show in t from 10 t (ferrous from 1 t), else in kg; precious masses in g below 1 kg; every amount carries its unit. Rules hold integer grams; precious inputs always come in lots of at least a few grams (a crate of spent spark plugs, a drum of anode slime).

A **grade** is what a lot is sold as ("Bare bright copper", "Heavy melting steel, unprepared"). Intermediates (insulated cable, whole motors, e-scrap, whole converters, black mass, anode slime) count tonnes when weighed out but no material in the range gate.

### 4.2 The ladder of 16 materials

True order of value per kilogram of the main product (yard-metals.md 3 and 10; mean prices p̄ at about §3 to the dollar); ratios true from steel to iridium, about one to two million; balance from quantities (ruling 4).

| # | Material | Source objects | Route | Products, p̄ | Stage |
|---|---|---|---|---|---|
| 1 | Light iron | washing machines, bicycles, sheet | spanners or grinder → baler | loose §0.50/kg, baled §0.62 | 1 |
| 2 | Cast iron | radiators, baths, engine blocks | grinder, sorted | solids §0.95/kg | 1 |
| 3 | Heavy melting steel | beams, rail, plate, car bodies | torch, shear; shredder → drum magnet; EAF → caster | HMS 80:20 §1.20/kg (unprepared §0.85), shred §1.26, billet §1.90 | 1, 2, 4 |
| 4 | Stainless 304 | sinks, catering steel | analyser grading | sorted solids §4.80/kg | 2 |
| 5 | Lead | car batteries | battery breaker → rotary smelter → refining kettle | whole battery §1.80/kg; ingot 99.97 % §5.40; polypropylene chips §0.90 | 1 (whole), 2 |
| 6 | Aluminium | wheels, cans, extrusions, shredder twitch | baler; eddy current; crucible or rotary furnace under salt flux | wheels §5.60/kg, clean sheet §5.00, cans §3.40; ingot or T-bar §9.40; dross §0.80 | 1, 2 |
| 7 | Brass | taps, valves, fittings | sorted → crucible or induction furnace | solids §16/kg; ingot §21; dross §2 | 1 |
| 8 | Bronze | bushings, bearings, bells, propellers | sorted → induction furnace | ingot §30/kg | 2 |
| 9 | Copper | cable, pipe, motors | stripper, granulator, motor bench; anode furnace → anode casting → electrorefining | No.2 §33/kg, bare bright §35, Grade A cathode §36; anode slime onward | 1, 4 |
| 10 | Lithium battery materials | EV and e-bike packs | discharge → module bench → inert shredder → sieve → leach → filter press → solvent extraction → precipitation | black mass by payable; lithium carbonate §38/kg; nickel sulphate §11 and cobalt sulphate §30 (inference) | 4 |
| 11 | Nickel superalloy | engine blades, turnings | analyser sort at the grading table | alloy packages §45/kg | 4 |
| 12 | Tungsten carbide | drill bits, inserts, saw tips | sort → zinc-process furnace (zinc distilled and reused) | sorted carbide §330/kg; reclaimed powder §460 (inference); APT only as the dealer's reference | 6 |
| 13 | Silver | contacts, boards, anode slime | e-scrap smelter (copper collector) → tankhouse → slime refinery | bar §4.08/g | 4 |
| 14 | Platinum group | catalytic converters | decanning → milling, sampling → assay → collector smelt → PGM refinery | Pd sponge §86/g, Pt §126/g, rhodium §850/g (a by-product dearer than gold, shown so) | 1 (whole by assay), 6 |
| 15 | Gold | boards, phones, connectors | e-scrap smelter → slime → leach → precipitation | bar §350/g | 4 |
| 16 | Iridium | spark-plug tips, crystal crucibles, electrolyser stacks | PGM refinery | sponge §985/g | 6 |

Not separate materials in version 1: zinc and tin (inside brass, bronze, dross and furnace dust), titanium, cobalt (with 10), ruthenium (a trace in 14). Trade code words (Barley, Zorba, Twitch) appear only in the glossary.

### 4.3 The separation tree as data

Objects and machines are content (`salvage.objects`, `salvage.machines` in game.json, validated by `src/config/schema.salvage.ts`); outputs plus waste equal the input. From the frozen fixture:

```json
{ "objects": [ { "id": "washer", "tool": 1, "kg": 70,
    "pieces": [ { "grade": "light_iron", "kg": 12, "n": 3 }, { "grade": "light_iron", "kg": 8, "n": 1 },
                { "grade": "motor_whole", "kg": 6, "n": 1 } ],
    "waste": [ { "to": "rubble_skip", "kg": 20 } ] } ],
  "machines": [ { "id": "motor_bench", "in": ["motor_whole"], "kg_s": 2,
    "out": [ { "grade": "cu_no2", "share": 0.25 }, { "grade": "light_iron", "share": 0.67 },
             { "grade": "al_clean", "share": 0.08 } ] },
  { "id": "crucible", "charge_kg": 25, "heat_s": 60, "heat_s_per_kg": 4,
    "recipes": [ { "in": "brass_solids", "out": [ { "grade": "brass_ingot", "share": 0.97 },
                                                   { "grade": "brass_dross", "share": 0.03 } ] } ] } ] }
```

The old car (1,060 kg, "fluids drained", torch) gives a battery 14 kg, four aluminium wheels of 9 kg, a 4 kg wiring loom, one catalytic converter (sold whole by assay at 0.55 × contained value − §400, about §880) and a body of eight 100 kg pieces, with 200 kg to the licensed contractor. Cylinders, extinguishers and closed tanks arrive only tagged "certified empty"; a converter comes only from the yard's own depolluted cars and named garages, never from the gate tip or as a feature lot (ruling 10). Waste has a destination and no value, never a fee by the clock. Chemistry stays inside a machine: no recipe, concentration or temperature is shown (L3).

### 4.4 The range gate

A material counts toward the **range** once the player has supplied products of it worth §300 at p̄ (tune 150 to 600): about 600 kg of light iron, 9 kg of bare bright copper, 1 g of gold, 0.3 g of iridium. Intermediates count toward nothing, so range needs lines, not one lucky lot. The range chips on the industry table show each material's progress.

---

## 5. The systems

### 5.1 Machines and production lines (pyro from stage 1, hydro from stage 4)

A **line** is a row of unit-process machines in fixed slots on a plant pad, in their real order (no free layout in version 1). Each machine has inputs, output shares, by-products, waste, and a rate (t/h) or a batch (charge and time); levels 1 to 10 add 15 % rate each at cost × 1.55. **No machine has a running cost** (no power bill, wage or wear by the clock, ruling 9). A batch starts when its charge is full, or at 40 % after 60 s without feed; a full output bay stops a machine and nothing is lost.

| Line (stage) | Unit processes and level-1 numbers (tune) |
|---|---|
| Hand machines (1) | cable stripper §150, 6 kg/s, 42 % bare bright + 58 % PVC; motor bench §800 (4.3); crucible §1,500 (4.3; clean aluminium 94 %; the remainder below a 10 kg ingot stays as heel) |
| Yard (2) | baler 20 kg/s (+24 % on light iron and cans); magnet crane 3 t/min; cable granulator 0.5 t/h (35 % copper granules); depollution bay; analyser |
| Shredder (2) | hammer mill 30 t/h → drum magnet (72 % shred) → eddy current (8 % zorba) → 20 % residue to the licensed contractor; the sensor sorter splits zorba into twitch 60 %, copper 15 %, brass 12 %, zinc-rich heavies 8 %, stainless 5 % |
| Aluminium, lead, brass and bronze (2) | rotary furnace under salt flux, 2 t, 40 min, 88 % ingot or T-bar + dross + salt slag; battery breaker 1 t/h (sodium sulphate 10 %, polypropylene 6 %) → rotary smelter → refining kettle, lead ingot 60 % of battery mass; induction furnace 500 kg, 8 min, 97 % |
| Off-gas filters (2) | every furnace hall beyond the crucible needs a bag-house filter: 1.5 % of the charge as zinc-rich dust, sold at §0.40/kg (the owner's "filters", pyro side) |
| Steel (4, Saltreach) | electric arc furnace → ladle → continuous caster: 90 % billet, 10 % slag sold as aggregate, 1.5 % EAF dust |
| Copper and e-scrap (4, Kaymor Point) | anode furnace → anode casting → electrorefining: 98 % Grade A cathode + 0.5 % anode slime; e-scrap smelter with a copper collector: per tonne of boards and phones 130 kg copper, 3.5 kg silver, 340 g gold, 140 g palladium (yard-metals.md 1) → slime refinery: leach → precipitation → silver and gold bars |
| Batteries (4, Ambrel Coast, hydro) | the route of 4.2; sieve: 40 % black mass, 8 % copper foil, 5 % aluminium foil, 20 % steel; the filter press takes out graphite cake ("filters", hydro side); per tonne of black mass about 167 kg lithium carbonate, 800 kg nickel sulphate, 280 kg cobalt sulphate (inference) |
| PGM, iridium, tungsten (6) | decanning → milling and sampling → assay → collector smelt → refinery (a converter gives about 5 g Pt, 5 g Pd, 1.5 g Rh; plug crates and electrolyser stacks give iridium); carbide sort → zinc-process furnace, 95 % powder |

**Decisions:** which line next; which input a shared furnace takes; sell an intermediate or refine it, on one **refine-or-sell card** with both nets ("Sell black mass now §17,700/t · Refine §23,500/t in 3 h 10 m"). **Costs:** a machine costs about 20 to 40 minutes of the income it adds at its rung (tune; anchors: shredder line §180,000 at rung 4, tankhouse §40 M at rung 6). Build times are real (5 to 60 min) and halve with the crane yard at rung 5. **Ranking:** products weighed out add tonnes; higher rungs need materials only lines make (4.4).

### 5.2 The price board, the two exchanges and the dealers (ruling 8)

**One market clock**: t_m = max(device now, clockHigh), UTC, saved, never running backwards. Steps n = floor((t_m − EPOCH) / 600 s), EPOCH a Monday 00:00 UTC; market days start at 00:00 UTC, weeks on Monday. No session hours. Every random number is a counter hash h(worldSeed, metal, venue, n), so every phone shows the same prices.

**Stage 1, the posted board**: each grade's price once a market day, p_g = p̄_g × (1 + 0.05 × w_f(day)), w_f uniform in [−1, 1] per family (ferrous, non-ferrous, lead; tune 0.03 to 0.07), with its date and five days of history. **Hold**: each grade's bay has a Hold flag. A grade not held is sold at once as a lot when it reaches the weighbridge, and the ticket prints ("Light iron 36 kg × §0.50 = §18.00 · ID checked · paid by transfer", the legal line small on the ticket, never a toast). A held grade goes to its bay; the bay card's Sell sells the whole lot at that moment's price. A full held bay lets further pieces pass as sold. Bays never charge rent.

**Stage 3, exchanges and dealers** (the scale house's board becomes the local dealer's):
- **Exchange metals** (aluminium, copper, lead, nickel, tin, zinc on both exchanges): P(m, e, n) = p̄_m × exp(c_m + s_{m,e} + φ_m + d_e). c: common factor, exact discrete Ornstein-Uhlenbeck step (yard-tech.md E), half-life 2 days, stationary deviation 1.5 % (copper, aluminium), 2 % (lead, zinc), 3 % (nickel, tin). s: each exchange's own OU, half-life 8 h, deviation 1 % (the spread). d: Kaymor +1.5 %, its import duty, named on the board and charged on every delivered sale into Kaymor, so the premium itself never pays. φ: the week's pattern per metal by h(worldSeed, metal, week): Steady 40 %; Squeeze 20 % (a line to +7 % by day 3, a day held, back to 0 by day 7); Glut 20 % (to −6 % by day 3, slow recovery); Shock 20 % (a +9 % or −8 % step on one exchange at a hashed time, 1.5-day half-life, a bulletin with its cause 12 h before: "Kaymor: power curbs at smelters from Thu 09:00"). Values come from the weekly anchor floor(t/W)·W − W, W = 7 days (seam under 1 %). (tune all)
- **Dealers** post everything else (ferrous, stainless, carbide, lithium and the black-mass payable, sulphates, the precious metals) once a market day at 00:00 UTC: P(d+1) = P(d) × exp(−0.15 × ln(P/p̄) + a draw: 0 with 55 %, ±1 to 3 % with 40 %, ±8 to 20 % with 5 %), a large step announced the day before.
- **Scrap grades** sell to dealers at a payable share of the West cash price (No.2 copper 95 %, bare bright 98.5 %, brass and bronze by content). A **registered brand** (cathode, ingot; registered by running a line 24 h with the assay lab) in 25 t lots sells on an exchange at cash less 0.15 %, at most 40 lots per metal per exchange per market day.
- **The board shows** price, 24 h change, 14-day history, stocks, one word for cash against forward (**shortage now**, **balanced**, **plenty**; never a number), bulletins, and the gap as a sentence ("Kaymor pays 3.2 % more after freight and duty; arrives in 11 h"). No future chart. "All prices, exchanges and shares are fictional and have no real-world value. Nothing in this game is financial advice." shows on first opening the board and the listing, and in Help.
- **The player can**, physically only: sell to the dealer or, for registered lots in a warehouse there, on the exchange; ship (5.4); sign deals (5.3); set a **standing sale** ("sell up to N lots of aluminium ingot at Bellmarch when the price is at least X": filled at the first step at or above X, at that step's price, also while away; never called an order); store in exchange warehouses **prepaid** for 7 or 28 days at a shown price, after which the stock waits and nothing is charged. No buying from an exchange, no bets, leverage, shorts, futures or options.
- **Shown equals applied by mechanism**: every sale and booking card carries the step it showed (`sell(lotId, n)`); a changed step re-asks "Price updated: a → b".
- **Signals**: stocks lead the pattern by about a day, right about 70 % of the time; the word; bulletins; dealer notices; the gap sentence. **Bot gates**: a pattern reader beats selling at once by 3 to 7 % on the same tonnage; no strategy by more than 8 %; perfect foresight by at most 25 %; changing the clock gains nothing.

**Ranking:** price never counts, only tonnes. **Stages:** the posted board, history and Hold in 1; the rest in 3.

### 5.3 Partners and contracts

**The gate tip** is the free source that rules out a dead end: the public leaves appliances at the gate, one every 40 s while fewer than 8 wait (washing machine 55 %, bicycle 25 %, cast-iron radiator 15 %, copper hot-water cylinder 5 %; never a converter, never a sealed vessel). **Supplier partners** fill a skip or container at a rate and sell it at the buy price on its label; the driver hooks it only if cash covers it and its value at today's prices exceeds its price. **Customer partners** sign supply deals: "q t a day of grade g for D days at §p, locked at signing", p = the 7-day average × (1 + premium: local 2 %, regional 3 %, corporate 4 %; tune). A day's delivery is taken at 00:00 UTC from stock before any spot sale; a short day is paid for what was delivered and trust (0 to 100) falls by 10; a full day raises it by 5. **Nothing is ever charged for a miss.** Trust gates bigger deals (regional at 60, corporate at 80).

| Tier (stage) | Partners |
|---|---|
| Local contractors (1, 2) | **Hob's Farm Clearance** (with the truck: 1 t every 5 min at §0.30/kg; light iron 60 %, cast iron 30 %, unprepared steel 6 %, brass 3 %, copper 1 %). **Ruddock Demolition** (with the torch: 3 t every 8 min at §0.60/kg; beams 70 %, light iron 15 %, insulated cable 8 %, copper pipe 4 %, brass valves 3 %). **Fennick Foundry Co-op** (stage 1's small deal: 200 kg of cast iron a day for 5 days at the 7-day average + 2 %). Stage 2: **Larkin's Garage** (depolluted cars with their converters, batteries, wheels; bronze bushings), **Pell Street Plumbing** (copper pipe, brass, bronze valves). Contents vary by up to 15 % by seed. |
| Regional firms (3) | **Durnav Steel** (an arc-furnace mill buying HMS and shred by monthly deal), **Ostro Cable Works** (copper granules and cathode) |
| Corporations (3, 4, 6) | **Veyra Motors** (closed loop: sends clean aluminium offcuts, buys the ingots back at the exchange average + 4 %; stage 4: EV pack take-back); **Vantorra Electronics** (phones and boards take-back, sold by assay until the e-scrap line exists); **Aldane Aerospace** (superalloy offtake); **Corrin Tooling** (carbide take-back); **Quenwick Electrolysers** (iridium tolling); **Meridane Glass** (rhodium and platinum tolling) |

Deal kinds: **supply**; **take-back** (feed free or at a shown fee); **offtake** (a line's output for 28 days at the exchange average + 3 %, no advance); **tolling** (the partner keeps the metal and pays a fee per kilogram refined). Corporations ask for certificates the player builds (radiation portal, depollution bay, assay lab with chain-of-custody records, battery bay) and a minimum tonnage. Logos hang framed on the office wall beside the business cards. **Decisions:** which deals to sign against capacity and the market. **Ranking:** delivered tonnes count. The buy-ratio lever (pay more, get more) is optional in stage 2.

### 5.4 Transport (road and rail in stage 3; vessel and plane in stage 4)

Each shipment is one **booking card** with a row per possible mode (capacity, freight, transit, arrival clock time, net per tonne), the best net preselected. Cost ratios are the research's (vessel 1 : rail 6.5 : road 28 : plane 210):

| Mode | § per t·km | Capacity | Transit (compressed, true order) | Needs |
|---|---|---|---|---|
| Road | 0.342 | own trucks of 25 t | 4 min + 1.5 min per 100 km | — |
| Rail | 0.078 | 80 t wagons, trains to 20 | 20 min + 50 min per 1,000 km | sidings at both ends |
| Vessel | 0.012 | 2,000 to 30,000 t | 2 h + 60 min per 1,000 km (Saltreach to Kaymor about 11 h) | quays at both ends |
| Plane | 2.53 | 50 t | 30 min + 5 min per 1,000 km (about 75 min across) | an air-cargo shed at the sending site |

- **Batteries and black mass never fly** (the plane row greyed: "Lithium batteries are not flown (dangerous goods rules)"). Precious metals go by plane or armoured road (× 4, 2 t).
- **Insurance** 0.2 % of value a day under way, paid at booking with the freight (why gold flies). A warning when freight exceeds half the cargo's value teaches "steel by ship, iridium by plane".
- **Pricing** (ruling 8): sold on arrival at the price then (by the standing rule while away, logged with its time), or at a **fixed quote at dispatch** q = P_dest(t_m) × (1 − 0.01 × transit hours ÷ 24).
- Distances: Kettle Lane to Bellmarch 120 km, Saltreach 220, Varn Ridge 380; Saltreach to Kaymor 9,000 km by sea; Kaymor to Ambrel Coast 600 km. A **freight clerk** runs standing routes ("every 6 h, rail the shred to Saltreach"), also while away.
- **Decisions:** time against cost against capacity, with cash tied up under way. **Ranking:** tonnes count when weighed out at the destination. **Bot gates:** each mode is the best choice in at least 10 % of a stage-4 bot's shipments; no battery can be booked by air.

### 5.5 Territories (stage 4; the PGM and carbide plants in stage 6)

Sites are bought outright in the office's map room, never seized; each costs 4 to 8 hours of rated income at the rung that opens it (tune; anchors Saltreach §4 M, Kaymor Point §60 M). Each is a walkable yard with its own crews, hand station, goals and away pass; the worker is at one site at a time, and choosing one on the map moves camera and worker there at once.

| Site | Opens at | What only it does | Hand station |
|---|---|---|---|
| Kettle Lane | start | the hand, the lane, the works (back field, shredder, melt shops) | the oversize pad |
| Saltreach | rung 5 | the quay and vessels; a licensed ship-recycling berth (the excavator shear cuts plate; asbestos leaves with a licensed contractor in sealed bags; the boss never torches a hull); propellers and fittings; the EAF and caster | the fittings bench; the magnet-crane cab loads a vessel at twice the crew rate |
| Varn Ridge | rung 5 | aerospace turnings and solids, superalloy for Aldane; stage 6: the carbide plant | the alloy grading table |
| Ambrel Coast (East) | rung 6 | the battery bay (thermal cameras, isolation drums), the hydro line, e-scrap dismantling | the module bench (packs arrive "discharged, checked") |
| Kaymor Point (East) | rung 6 | the tankhouse, the slime and e-scrap refinery, the air-cargo terminal; stage 6: the PGM refinery and iridium | the sample station |

Hazards appear only as things a good yard handles properly: procedural and calm, never a spectacle, minigame or reward (L3).

### 5.6 Time away (rulings 9 and 16)

`paysOnCompute: true`, `catchUpSeconds: 0`. Away time A = min(t_m − max(lastSaved, clockHigh), Cap). **Cap**: 4 h; 6 h with the Night shift (office, §3,000, stage 1); 8 h at rung 4, 10 h at rung 5, 12 h at rung 6, earned (12 h is the maximum). One A for every site.

**The closed form**: each site is a directed graph: sources (gate tip; partner skips, gated by cash and margin; take-backs) → cutting (Σ crew cut rate) → carrying (Σ carrier rate) → machines (rate × level, or batches) → bays → sale, delivery or shipment. Between events each flow runs at its bottleneck rate. A segment ends at: a buffer full or empty; a cash threshold that lets a skip be bought; a batch's doneAt; a shipment's arrivesAt; a deal's daily delivery; a standing sale's fill; a dealer posting; **every price step** (daily in stage 1, 10 minutes from stage 3). Within a segment revenue is exactly mass × price per grade; money and tonnes are added in time order. The boss's rewards never happen while away (feature lots wait at the gate). A line whose margin would be negative pauses. Full buffers stop their feeders; nothing is lost; no cost runs by the clock. The result is paid in the update that computes it and recorded under clockHigh, so a clock jump never pays twice. The 10 Hz live tick uses the same rate functions.

**What the player finds**: the yard moved on (bays fuller, ingots stacked, the truck back with a fresh skip, feature lots at the gate) and the away card as a weighbridge ticket roll: "Away 3 h 12 m (cap 4 h)"; a line per grade; "41.2 t supplied · §148,200 (already in your account)"; arrivals; "You passed Corvay Recycling."; one optional ad button with its exact sum.

---

## 6. The one ladder

### 6.1 Rungs

The industry table ranks **lifetime tonnes supplied** (net mass of products weighed out, delivered or arrived; skips weighed in and waste do not count); a position on it **never falls while the player is away** (ruling 3). A rung is entered when its tonnes, range and site count are all met; the crane hangs the new sign over the gate. Each rung caps the capacity the shop sells (6.3). Days are at pace (12.4).

| Rung | Name | Tonnes | Range | Sites | Twice a day (proto) | Three hours a day (proto) |
|---|---|---|---|---|---|---|
| 1 | Back-lane yard | 0 | — | 1 | start | start |
| 2 | Licensed dealer (the radiation portal and ID desk appear: "Every load checked. Every seller identified. Payment by transfer only.") | 2 t | 3 | 1 | 12 to 18 min | 12 to 18 min |
| 3 | District merchant | 25 t | 6 | 1 | 55 to 65 min | 55 to 65 min |
| 4 | Regional processor | 1,000 t | 8 | 1 | day 2 to 3 | day 1 to 2 |
| 5 | Metals producer | 10 kt | 9 | 1 | day 4 to 6 | day 2.5 to 3.5 |
| 6 | National recycler | 100 kt | 10 | 3 | day 8 to 10 | day 5 to 6 |
| 7 | Continental supplier | 1 Mt | 13 | 4 | day 16 to 19 | day 11 to 13 |
| 8 | Global resource supplier | 4 Mt | 15 | 5 | day 24 to 28 | day 19 to 22 |
| 9 | **The largest full metal recycling and resource supplier** | first in the table | 16 | 5 | day 32 to 38 | day 27 to 31 |

Materials by stage make the gates reachable in order: stage 1 gives 7 (lead only as whole batteries, so rung 3 needs 6), stage 2 adds stainless, lead ingot and bronze (9), Saltreach and Varn Ridge add superalloy (10), Ambrel Coast and Kaymor Point add lithium, silver and gold (13), stage 6 adds carbide, the platinum group and iridium (16). The title stays while the player stays first. The days come from the spec step's sketch (`/tmp/claude-0/-home-user/f22d4cbe-c353-58da-a893-27d84a9b8342/scratchpad/spec-master/ladder.py`: capacity growing with lifetime tonnes, the away caps of 5.6), not from a prototype.

### 6.2 Rival firms as pure functions

Twenty-five invented firms, each with a drawn logo and a "simulated" tag. Lifetime tonnes T_r(d) = T_r0 × (1 + g_r × min(d, 40)), g_r 0.5 % a day below 1 kt and 1 % from 1 kt; d counts days from the player's start on the local table and from the calendar epoch on the online all-time board (ruling 16). The largest starts at 7 Mt and never exceeds 9.8 Mt.

Dobbin & Daughters Scrap 0.15 t · Pennick Scrap 1.5 t · Wrenfield Metals 5 t · Cobbet Lane Metals 18 t · Corvay Recycling 45 t · Mardle & Sons 120 t · Fennick Metal Recovery 300 t · Stannard Ferrous 800 t · Lowmoor Non-Ferrous 2 kt · Harkwood Reclaim 4.5 kt · Tallis-Merrow Metals 10 kt · Ashgrove Ferrous 22 kt · Lindqvist-Barr Metals 45 kt · Pollard Recycling 90 kt · Saxby Resource Recovery 170 kt · Kestrel Bay Metals 320 kt · Haverin Steel & Alloys 550 kt · Ondine Metallurgy 850 kt · Crayle International 1.25 Mt · Hemsted-Pryce Resources 1.8 Mt · Teodor Metals 2.5 Mt · Marenko Global 3.4 Mt · Halvard Steel & Alloys 4.5 Mt · Sunmere Metals Holding 5.6 Mt · **Orrin Global Metals 7 Mt**.

The chip starts "26th of 26 · next: Dobbin & Daughters 0.15 t", the giants greyed far above. Up to five followed real players (7.3) appear as extra pinned rows. **Targets** (sketch, proto): the first rival passed by minute 5, four in the first hour; a twice-a-day player passes one at least every two sittings in week one and at least every 3 days after (sketch: largest gap 3.0 days); the largest is passed at about 9 Mt. Rivals' scheduled moves are optional (second in the cut order).

### 6.3 The late game in closed form

Rated capacity R (t/h) is a pure function of assets: Σ over sites of the site's bottleneck throughput with full feed. The shop never sells a station that would lift R above the rung's cap: 3 · 12 · 40 · 200 · 800 · 3,000 · 9,000 · 20,000 · 30,000 t/h for rungs 1 to 9 (tune ± 30 %). The server's bound, the bracket bands and the largest numbers are therefore computable: a year at 30,000 t/h is 2.6 × 10^14 g, well inside a double, and money stays below 10^15 hundredths.

---

## 7. Other players (stage 5)

### 7.1 Words (ruling 2)

A **company** is what a player founds or joins, at most 30 members; it is the company that is listed. The player's own operation is "your yard", and "your business" once it has more than one site, with a trading name composed from our lists. A founder who never invites anyone has a company of one. The word "group" is not used for it.

### 7.2 The company

- Founding and joining open at rung 4. Name composed from three lists (about 40 × 40 × 8, curated against bad pairs and the other games' names); emblem from 8 shapes × 12 glyphs × 10 colour pairs. Nothing is typed.
- A leader, up to three co-leaders, members; open, by request or closed; leaders and co-leaders remove members. Leadership passes after 14 days without a logged rules action (cut, sale, build, booking; opening the app does not count) to the most active co-leader, else the longest-standing active member; with none, the company is dormant and joinable.
- Talk: 24 fixed phrases and 8 emotes ("Good shift.", "I can cover copper.", "Back tonight."). Invitations can be declined and switched off.
- **The weekly company order** (ruling 12): one invented corporation's order sized at the week's start to 25 h × Σ members' rated capacity, split over the material families its members can supply (a member with a rare line is wanted), fed only by normal deliveries; tiers at 50, 80, 100 and 125 %. Rewards go only to contributors (at least 1 % of the order or 5 h of their own capacity) and are cosmetic: a pennant on the company flag in each contributor's yard and standing that unlocks emblem parts.
- Not in version 1: a shared company ship, rival firms' divestments, any takeover.

### 7.3 Boards and tours

- **Weekly brackets** of 30, placed at the week's start by capacity band floor(log2 R) derived by the server from assets; a newcomers' bracket for a player's first seven days; ranked by tonnes supplied that week (Monday to Monday UTC); pennants for the top three and for best growth (this week ÷ last week); cosmetic only. **Fairness gate**: an always-on player supplies at most 1.25 times a twice-a-day player of equal capacity.
- **All-time boards**: lifetime tonnes, anchored on the calendar so everyone sees the same rows (with the rival rows of 6.2); market value once companies list. No trailing-week position anywhere.
- **Tours**, read-only: a diorama of their main yard from its slot summary, rung sign, range chips, territory pins, pennants, emblem, this and best week. Only **follow** (pin up to five on your table), **invite** (if you lead), **report**, **block**. No likes, views or counts.

### 7.4 The listing (ruling 12)

A company may list when its members' combined lifetime tonnes reach 2 Mt with a combined range of 13 and seven daily results exist (a company of one reaches this near rung 7). The leader rings the bell; every member's yard shows the crew lined up and confetti of offcuts. **Published formula**, recomputed weekly from accepted results: market value V = 520 × W × (1 + 0.02 × (range − 13)), W = last complete week's supply value at mean prices (Σ accepted mass × p̄); share price = V ÷ 10,000,000 shares, on the share price board at the gate. Mean prices make it immune to market timing and checkable on the server. No share is traded, issued to players or sold; no dividends, no cash.

### 7.5 One interface, two implementations

`OnlineService`: `acceptTerms(version)`, `me()`, `board(kind, period)`, `tour(id)`, `follow(id)`, `unfollow(id)`, `myCompany()`, `companies(filter)`, `found(nameParts, emblem)`, `join(id)`, `leave()`, `invite(id)`, `respond(inviteId, yes)`, `setInvites(on)`, `setRole(id, role)`, `remove(id)`, `say(phraseId)`, `submit(snapshot)`, `report(target, reason)`, `block(id)`, `unblock(id)`, `deleteMe()`.
- **LocalOnline** (the default, and whenever there is no network or account): about 200 simulated players and companies, each a seed and a temperament, weekly tonnes a pure function of (seed, week, t); every row labelled "simulated" ("Rival yards (simulated). Online play arrives in an update."). Simulated firms take the player in and join the player's company, whose order runs on the server's code with the same cap of 30.
- **FirebaseOnline** (Firebase JS SDK, only when game.json holds the owner's web config; yard-tech.md D): anonymous sign-in; `players/{uid}` owner-only (accepted assets and tonnes); `publicPlayers/{uid}` written by functions only (handle parts, emblem, rung, lifetime and week tonnes, range, band, company, a site summary under 2 KB, pennants); `companies/{cid}` with `members/{uid}`; one document per bracket and per all-time board, rebuilt every 10 minutes; `reports/{id}` create-only. Functions: `submitProgress`, `foundCompany`, `joinCompany` (a transaction: members + 1 ≤ 30), `leaveCompany`, `setRole`, `removeMember`, `invite`, `respond`, `report`, `deleteMe`, `rebuildBoards`, `weeklyClose`.
- **The server checks** (it re-runs the pure rules and assumes a hostile client): claimed assets cost no more than accepted earnings; Δtonnes ≤ 1.1 × R(assets) × Δ server time + the hand allowance 0.5 × R × min(Δt, 3 h) + feature lots due by the calendar + shipments that left before the last accepted submit; range grows only by materials whose line exists; the rung is recomputed. Only functions write ranked fields; writes are rate-capped per uid; purchases and ad rewards never touch a ranked field. An honest fast-hand bot is always accepted; a 1.1 × inflater is clamped.

### 7.6 Accounts, deletion and the policy duties

Handles are generated (adjective, noun, place: "Steady Anvil of Fennick"); nothing a player types is ever shown to another. Terms are accepted before a handle is first shown, before founding and before joining. Report sits on every handle, emblem, company row and tour; a reported name falls back to "Company #48213" until reviewed; blocking hides the other's handle and stops their invitations and joins. The under-13 age band gets the local mode only. Deletion is in the app (it states how long it takes, removes handle, scores and company data, passes a company to its longest-standing member or dissolves it) and on a public web page.

### 7.7 What the owner must create and decide (before stage 5 goes online)

Create: a Firebase project with a web app, anonymous sign-in, Firestore, the Blaze plan with a budget alert, a restricted API key, deployed rules and functions (a `server/` folder outside `src/`); a privacy policy (yard-policy.md 4), terms with zero tolerance, a support URL and email, the deletion web page, a data processing agreement, the UK Online Safety Act assessments, a moderator acting within 24 hours, review notes with a demo mode or test account and a seeded live server; the rating forms (Simulated Gambling none, Contests frequent, UGC yes, Messaging none, Social Media none, 13+ by hand), privacy label and Data safety form; trademark searches. Decide: money list A or B; `firebase` 13.1.0 as a direct dependency limited to this mode; prices.

---

## 8. Money (ruling 13)

Nothing in stages 1 to 4 depends on the choice; ads and purchases are stubs in stage 1 and live from stage 2.

| Product (kind, suggested price) | List A (fair first) | List B (house style) |
|---|---|---|
| No ad videos: every ad reward at once, same daily limits (skipAds, $4.99) | yes | yes |
| Yard livery: six paint schemes; looks only (cosmetic, $2.99) | yes | yes |
| Company emblem set: twelve more shapes and glyphs (cosmetic, $1.99) | yes | yes |
| Founder's plaque at the gate, seen on tours (cosmetic, $2.99) | yes | yes |
| Night shift contract: the 12 h away cap that play earns at rung 6, at once (unlock, $3.99) | — | yes |
| Second crew slot early: the slot the next rung opens, at once (unlock, $2.99) | — | yes |
| Express builds: halved build times, as the crane yard gives at rung 5 (unlock, $4.99) | — | yes |

In neither list: anything random, anything limited in time or quantity, away hours beyond what play earns, a consumable that adds tonnes or score, currency packs. Kinds A {skipAds, cosmetic × 3}, B adds unlock × 3; both differ from the four games' multisets. Each product has one plain sentence of what it does and does not do; store wording: "Purchases remove the need to watch ads or change how your yard looks. They do not buy rank." (B adds "or bring forward what play unlocks later").

**Rewarded ads** (opened only from a labelled button; no interstitials, no banners): **away bonus**, +50 % of the away cash, exact sum on the button, on an away card of at least 30 min, at most twice a day; **spot buyer**, +10 % on the next ticket of one grade up to 15 minutes of I, the amount shown, at most three a day. Scrip only: never tonnes, time or build speed, never counted on a board; the count left today is shown.

**What must be true for either list:** brackets band by server-derived capacity (in B including the bought cap and slot); an ad-watching bot's lifetime tonnes at day 14 at most 1.15 times a non-watcher's (aim); in B, a buyer's lifetime tonnes at day 30 at most 1.15 times a non-buyer's of the same habit (aim); the weekly bracket stays the money-proof board.

---

## 9. The stages (ruling 15)

Each stage is a playable game on the owner's phone. Wish numbers are BRIEF's. Lines include tests and art, against yard-tech.md F's 55 to 70 thousand.

| Stage | Contains | Wishes | At its end the player can | Lines |
|---|---|---|---|---|
| **1 The first yard** (concept test) | crane loading screen ending in a poured bar; landscape shell; Kettle Lane Yard and the lane with Hob's and Ruddock's sites; stick, cut, carry, weigh; tools 1 to 3; carry tiers 1 to 3; stripper, motor bench, small crucible; yard hand, cutter, driver; posted board with history and Hold; the Fennick Foundry deal; the industry table and chip; time away (4 h, the Night shift 6 h); local save; `?yardStress=1`; ads and purchases as stubs | 1, 2, 8; part of 3, 4, 6, 7, 11 | play the hour to rung 3, then level crews and machines and pass rivals for two or three days at a capped 40 t/h | 12 to 15 k |
| **2 The works** | back field; the stage-2 machines and vehicles of 3.2 and 5.1; Larkin's and Pell Street; analyser and the boss's pile; stainless, lead ingot, bronze; feature lots; commissioning; more crew roles; build timers; the Trade Book (every object and grade met); purchases and ads live; rungs 4 and 5 | 3, 7 (pyro) | run a processing yard with three melt lines and shredder tonnage | 9 to 11 k |
| **3 The market** | all of 5.2; prepaid warehouses; Durnav, Ostro, Veyra, Vantorra with supply, take-back, offtake; trust; siding, road, rail, booking cards, freight clerk; assay lab and brand audit | 4, 5 (road, rail), 6 | choose where, when and in what form to sell; ship by road and rail | 9 to 11 k |
| **4 Territories** | map room; the four sites of 5.5 with their hand stations and stage-4 lines; vessel and plane; Aldane; Veyra's pack take-back; rungs 6 and 7 | 3, 5 (vessel, plane), 7 (hydro), 9 | run five sites and ship between continents | 11 to 13 k |
| **5 Other players** | `OnlineService` both ways; brackets, all-time boards, tours, follow; companies of 30 and the weekly order; the listing and share price board; terms, report, block, deletion | 10, 11, 12 | everything other players offer, simulated offline and real with the owner's keys | 8 to 10 k |
| **6 The top** | carbide plant; PGM refinery; iridium; Corrin, Quenwick, Meridane tolling; rungs 8 and 9; the store package (text, landscape screenshots, icon, review notes) | 3, 4, 8 complete | reach the top of the industry | 5 to 7 k |

Sum 54 to 67 thousand. Stage 3 adds no rung (rung 6 needs territories): a stage-3 player sits at rung 5 with new decisions. **Cut order** (ruling 15): the simulated social layer's extras, then rivals' moves, then the buy-ratio lever; inside stage 1 the Fennick Foundry deal and the sack truck may slip without failing the hour.

**The first yard's beats** are ruling 5's, in its order (the first-yard document sets the screens); the crucible pad stands in view from the first minute with its price and a cooled sample ingot. Planned purchases (minute): stripper §150 (1:00), gloves §60 (1:30), yard hand §300 (by 4:30), grinder §300 (5), sack truck §400 (7), hook-lift truck §900 (8 to 10), motor bench §800 (12), cutter §1,200 (13: "the yard now earns while you are away"), crucible §1,500 (18), driver §2,000 (24), torch §2,500 (28 to 32: the old car and its converter; Ruddock opens), Night shift §3,000 (40). The prototype sets these minutes.

---

## 10. The screens in landscape

The world is full-bleed; insets are read on all four sides; both landscape directions work; a taller-than-wide window shows the ground work's "Turn your phone sideways" card.

| Row (pt) | 844 × 390 (47 left and right, 21 bottom) | 667 × 375 (no insets, 16 margins) |
|---|---|---|
| Top bar | 36 | 34 |
| Goal card (one line; tap for three) | 28 | 26 |
| Free world | 237 | 239 |
| Bottom: stick zone left; the one button (60) and, above it while it applies, the ad button (40) right | 89 (8 + 60 + 21) | 76 (60 + 16) |
| **Total** | **390** | **375** |

| Top bar, left to right | 844 (safe width 750) | 667 (635 inside margins) |
|---|---|---|
| Cash (15 pt bold, rolling) | 120 | 104 |
| Ladder chip ("25th of 26 · next Pennick Scrap 1.5 t"; tap: the industry table) | 300 | 240 |
| Ticker chip (stage 3) | 150 | 120 |
| Carry readout ("52/60 kg", the truck's "0.8/1 t") | 80 | 76 |
| Clipboard button | 44 | 44 |
| Gaps | 4 × 14 = 56 | 4 × 12.75 = 51 |
| **Total** | **750** | **635** |

Bar text is sized from fontScale with `allowFontScaling={false}`; at 667 × 375 at most four HUD lines show. At the ground work's 40 pt per metre the worker stands 46 pt tall and the world shows about 21 × 9 m at 844.

**Where each system lives** (a place in the world, opened with Open there or from the clipboard once visited): tool rack (tools, carry); office, a portacabin then brick (crew shift board, Night shift, partner wall and deals; stage 3 the dealing desk; stage 4 the map room); scale house (posted board, then dealer and exchange boards, ticket history, Hold flags); a machine's pad (buy, level, recipe, refine-or-sell); gate notice board (industry table; stage 5 boards, tours, follows); flagpole (the company); siding, quay and air-cargo shed (booking cards, a chalk freight board with a moving token per shipment); plant halls (a control panel per line); share price board and bell (the listing).

**Overlays** are the mode's own absolute views registered with `useOverlay` (never the kit Sheet or a `Modal`), one at a time, closed by the scrim or Android back: the **right panel** (min(520, 0.58 W) at 844, 0.62 W at 667, full height under the top bar, rows 44 pt, text 12 to 13 pt, never under 11), with the place visible and dimmed at the left; the **wide card** for the dealing desk (both exchanges side by side at 844, tabs at 667); the **centred card** (520 × 300 at most) for the away ticket roll and the rung ceremony. Cards: purchase (exact price, one Buy), sale and booking (price, mass, total, step, arrival), refine-or-sell, deal, tour.

---

## 11. Art and sound

**Look.** Flat vector in three-quarter oblique view, drawn in code and baked into atlases while the crane screen runs (no image generator, no downloaded art); at most three atlas draws, 40 actors and 300 sprites a frame; 60 fps while anything moves fast, 30 otherwise. Daylight, clean and well run: a yard someone is proud of.

**Palette `hi-vis-and-rust`** (unlike warm-cream, deep-space-cold, lantern-night and baize-and-ink): sky #EAF1F4, concrete #C9C4B8, galvanised #9AA5AE, asphalt #4B4F54, hi-vis yellow #F4C20D, rust #9A4B2B, ink #2B2E33. Orange is kept for heat (furnace glow #FF8A2A; ingots cool from it to their metal colour in 3 s), so the yard never reads as Lantern Row's dusk. Each material has a colour and a pictogram readable at 10 pt (copper #C8743A coil, brass #D4AF37 tap, lithium #3A6EA5 cell with a yellow border, iridium #A9B6C9 crucible). The placeholder dark theme is replaced.

**People, vehicles, machines.** The worker: hi-vis vest, hard hat, gloves, boots, a face shield when cutting; four directions with mirroring, six walk frames, four per tool; crews in the same gear and their role's vest colour; nobody hurt or shown unsafe. Vehicles in eight headings, loaded and empty (hook-lift truck, forklift, magnet crane, shear, wagons, vessel, plane, armoured van); never a crusher on wheels or a tow truck. Machines in three or four working frames plus "bay full". Logos: two colours, simple shapes, each checked against known brands' shape-and-colour pairs (Vantorra a teal four-point star; Veyra two coral chevrons; Aldane a swept navy triangle; Corrin a notched orange hexagon; Quenwick a split indigo droplet; Orrin a globe of rings); smaller rivals' plates come from a generated kit distinct from company emblems.

**The loading animation** (at least 2.4 s, longer only while atlases bake; a tap skips it from the second launch): 0.0 s pale sky, a crawler crane's jib swings in with an electromagnet; 0.4 to 1.6 s five steel plates are lowered and clank into place as the title's letters (a 2 pt shake each) while the weighbridge display under them counts kilograms as the load progresses; 1.6 to 2.2 s a small crucible tips and pours a glowing bar beneath the title; 2.2 to 2.4 s the bar cools from orange to brass, the display reads the final weight, the gate opens into the yard.

**Icon and store set** (ruling 14). The icon leads with copper and the pour; never a lone gold bar or a truck. Candidates for the 60 px judgement beside the four games' icons, before anything is built on one: (a) a gloved hand holding a bright coil of stripped copper against a ticket stripe; (b) a crucible pouring into a mould, a copper coil behind; (c) a magnet lifting a copper coil over a rust ground. The screenshot template is the house's first landscape set: the game full-bleed with a narrow ticket-paper strip down the left edge carrying the caption in stamped type (not Pizza's framed card, Orbit's top panel, Lantern Row's hanging tag or Proudly Adequate's foot band); the first shot shows the stripped copper, the ticket and the pour.

**Voice `weighbridge-plain`**: short plain sentences in the trade's words (weights, grades, prices) with the foreman's dry warmth; no puns, no exclamation marks, no green claims ("eco", "green", "save the planet" appear nowhere: game, store, ads, loading). Words: market, price board, deal, valuation; never bet, stake, odds, invest, tips, returns, jackpot, win, prizes, nor "order" for standing sales.

**Sound.** A new pack in `games/scrap-yard/assets/sfx` (`soundPack: null`), new recipes: a drop per material (steel a low clunk, aluminium a hollow tonk, copper a warm dink, brass a bright ring); the grinder's whine, the torch's roar; the weighbridge's rising beeps, printer and stamp; the stripper's zip; the furnace's roar, the pour's glug, cooling ticks; the magnet's hum; reverse beepers; a ship's horn. Haptics on each sale and finished piece. Music: "yard radio", an original 92 bpm loop of mellow electric guitar and bass over a percussion bed made of the game's own metal hits, slower in plant halls, no melody shared with the other games.

---

## 12. Promises, tests and aims

### 12.1 Hard promises (gates from the first run)
1. **Shown equals applied**: every sale, deal, booking and purchase applies exactly what its card showed; a changed price step re-asks; one rounding function.
2. **Where money comes from**, a closed tested list: tickets and lot sales, deal deliveries, exchange sales, shipped sales, tolling fees, ad rewards, and the away pass of the same. It goes only to purchases and levels, feed (skips, take-back fees), freight and insurance, prepaid storage, the exchange fee and the Kaymor duty.
3. **Nothing lost, nothing taken**: no cost by the clock; full buffers stop their feeders; built things never vanish; no rank falls while away.
4. **No dead end**: with §0 and empty bays the gate tip pays within 60 s; every amount asked for is reachable and never met by doing nothing; a purchase that changes nothing is refused with its reason.
5. **The clock**: one monotonic market clock; a jump never pays twice; looking ahead gains nothing; the away pass equals a 10 Hz replay within 0.5 % on frozen content.

### 12.2 Tests (vitest, frozen test content)
Mass conservation for every object and machine; cut times; pickup order; Hold; the away pass against the replay across price steps and cash-gated skips; `sell(lotId, n)` at step boundaries; prices agreeing across two clocks; shortfalls charging nothing; the range gate; rival rows; the capacity cap; the server bound; the 30-member cap under parallel joins; deletion of every public document.

### 12.3 Measured aims (bands set by the lead from the measured table, then guards)
| Aim | Measured by |
|---|---|
| First ticket ≤ 25 s; copper jump ≤ 1:30; first helper ≤ 5 min (slow ≤ 9); truck by 8 to 10 min; first pour 18 to 25; rung 3 at 55 to 65 (slow ≤ 90); at most one purchase prompt a minute; the next purchase never more than 3 min away in hour 1 | prototype, then bots at three hands |
| The hand's worth (3.4) | bots, at rungs 3, 6, 8 |
| Rung days (6.1), rival passes (6.2) | prototype, bots |
| Market: pattern reader +3 to 7 %, nothing above +8 %, foresight ≤ +25 %, clock peeks ≤ 0, the gap open 2 to 4 times a week per metal, stage-1 Hold ≤ +3 % | market bot |
| Transport: each mode best in ≥ 10 % of shipments; plane never best under §1,000/kg; vessel never above §300/g | stage-4 bot |
| Fairness: always-on ≤ 1.25 × twice-a-day; ad watcher ≤ 1.15 × at day 14 | bots |
| Company order at 100 % for 60 to 75 % of simulated active companies | local stand-in |
| A stage-1 tick under 1 ms; 12 h away on five sites under 50 ms; `?yardStress=1` read on the iPhone | the owner's phone |

### 12.4 Who measures, in what order
A numbers prototype (scratchpad `proto/`) runs sections 3 to 6 first and reports every (proto) number with the smallest failing example; then the rules on frozen content, the bots, the screens. **Bots play at a person's pace**: the normal hand reacts in 0.8 s, wastes 25 % of its path and looks 6 to 15 s at a card before buying; the fast hand 1.3 × its rate (0.4 s, 10 %); the slow 0.7 × (1.2 s, 40 %, leaves goals unfinished). Habits: twice a day (two 8-minute sittings after a first day of an hour); 45 minutes a day (three sittings); three hours a day (three of an hour). Pacing is chaotic (market-design.md M30): an aim is met when 13 of 15 seeds meet it, checked on 5 unseen seeds. **Three people-like players play stage 1 on a phone before any tuning**, reading what it deals in the order it deals it.

---

## 13. Risks and open questions

1. **The hand's worth** (3.4) is the least certain number. If it fails, raise the pile and the feature lots before cutting crew rates: what is earned away must never fall.
2. **Two games for one minute**: each layer opens only after crews can run what came before; every business decision fits one overlay in under a minute.
3. **Fingerprint**: if a reviewer reads the weighbridge as Orbit's sale at a depot, Hold and the dated board are the defence and belong in the first screenshots; the voice is measured early against Orbit's metal words.
4. **Crowded theme** (Junkyard Keeper, Salvage Empire, Stone Miner): the store leads with copper, ticket and pour; a skip truck, never a tow truck or crusher; no auctions; buying, never seizing.
5. **Phone-only failures** (landscape `Modal`s, the stick at the edges, worklet crashes, atlas memory at 3×): every overlay and `?yardStress=1` are checked on the iPhone in stage 1.
6. **Six orders of magnitude of units and true prices**: every amount shows its unit; slow cheap rungs are tuned by quantities, never by the value order.
7. **Stage 3 adds no rung**; if the owner minds, rung 6 could ask for two sites.
8. **Names** wait for the register; "Kettle Lane" is flagged. **Online**: composed names can still combine badly (curated lists, report, block); nothing goes online before 7.7 is done. **Scope**: 54 to 67 thousand lines, each stage cut to its list.

---

## 14. Lead decisions

(Empty: the lead writes this section.)
