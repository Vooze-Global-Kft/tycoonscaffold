# Scrapyard: specification of the whole game

Status: revision 2, 25 November 2026 (step `spec-master`, after the builder's, the player-and-store and the trade-and-policy reviews): the "hand" design with the judges' grafts and must-fixes, under the lead's ruling (`RULING.md`). **Section 14 (the lead's decisions) overrides the body wherever they differ.** The first yard gets its own detailed document, which **owns every stage-1 number**; the stage-1 figures here are its inputs. Game folder `games/scrap-yard`; mode `salvage`; landscape; save key `save:scrap-yard:salvage1` (replaces the ground work's `salvage0`).

Conventions:
- "§" is the calvan, the one currency; "m" a metre of the ground plane; "pace" a person's hand (the normal bot, 12.4).
- **(tune)**: a starting number only the content build script may move, inside its range, to meet section 12. A number without it is a rule. A range is never widened silently. **(proto)**: a number the numbers prototype must confirm before rules are built on it. Every minute, day and income here is a target; rules tests run on frozen test content.
- The only home of numbers is `src/config/salvage.content.ts`, written into game.json by `scripts/content/build-yard.py` with the balance bot.
- Rules: pure TypeScript in `src/engine/salvage/`, 10 ticks a second, no `Date.now` or `Math.random`. Mass is held in integer grams and money in integer hundredths of §. One rounding function, `roundMoney`, serves every amount shown or paid. Amounts above §100,000 are shown with one abbreviation rule: three significant figures with k, M or bn ("§1.23 bn").

---

## 1. The game and its fingerprint

### 1.1 The game in five sentences

1. You take over a run-down, licensed scrapyard on Kettle Lane and steer your hard-hatted worker with one thumb: stop beside a washing machine, a radiator or a cable drum and it comes apart in your hands, piece by piece, onto the stack on your back.
2. Every load you carry onto the weighbridge prints a ticket by grade and net weight at the day's posted price: light iron at half a calvan a kilo, stripped bare bright copper at seventy times that. The grade then goes into its bay, and the merchant's flatbed collects every bay you have not held for a better day.
3. You hire a yard hand, a cutter and a driver who take over each step and keep the yard earning while you are away. You buy the grinder, the cutting torch, the hook-lift truck and, inside the first half hour, a small crucible that pours your first brass ingot.
4. The business then grows around the hand:
   - melt shops and leaching plants built as real chains of unit processes, on a process board;
   - two invented metal exchanges and their dealers;
   - partners, from the farm down the lane to invented electronics and car makers;
   - consignments by road, rail, sea and air;
   - yards and plants in new regions, each with its own lane of partners.
5. One table is on screen from the first minute: the industry, ranked by tonnes supplied, with a range gate that makes "full metal" mean full. You climb it past named rival firms to the top, the largest full metal recycling and resource supplier, alone or in a company of up to 30 players whose valuation is listed on a share market.

### 1.2 Fingerprint along the 19 dimensions

Four new words join the closed vocabularies of `scripts/lib/fingerprint.ts` and `spam.md` section 4 (ruling 11). Each is defined so that none of the four games could honestly claim it:

- **core_verb `steer`**: one thumb moves an avatar or vehicle continuously through a world with a floating stick, and work happens by stopping next to things. Nothing is tapped, dragged onto or swiped at as a target.
- **production_topology `separation-tree`**: one input object splits into graded outputs and by-products that go to different places (bays, hoppers, a waste skip), and machines split them further. It is the reverse of an assembly chain (Pizza), not a network of routes (Orbit).
- **main_screen_layout `three-quarter-world`**: a scrolling world several screens wide, drawn in three-quarter oblique view, followed by a camera, in landscape. Not a cross-section, a top-down map, a grid board or a single object.
- **money_moment `graded-lot-sale`**: material is weighed in by grade into bays and leaves as lots of one grade, collected by a named merchant or dealer at a posted price that changes once a market day. The player may hold any bay for a better day. No customer, departure, completed ticket or timer pays.

Existing words:
- progression `tech-tree`: the unit processes unlock as a tree on the process board (10), gated by the ladder;
- prestige `none`: nothing ever resets;
- character `humans`: shared with Pizza and Proudly Adequate, accepted under ruling 11.

| # | Dimension | Scrap to Ingot | Pizza Empire | Orbit Haulers | Lantern Row | Proudly Adequate |
|---|---|---|---|---|---|---|
| 1 | core_verb [M] | steer | tap-target | drag/route | place/arrange | swipe/aim |
| 2 | production_topology [M] | separation-tree | linear-chain-with-transport | network-routes | spatial-grid | parallel-generators |
| 3 | money_moment [M] | graded-lot-sale | customer-pays | sale-at-depot | contract-complete | auto-tick |
| 4 | main_screen_layout [M] | three-quarter-world | side-cross-section | top-down-map | grid-board | single-object-focus |
| 5 | art_asset_overlap [M] | 0 % planned (all drawn in code in `src/ui/salvage`) | measured at build | | | |
| 6 | store_text_overlap [M] | under 10 % planned (no "salvage", "haul", "ore", "cargo", "fleet", "freight", "logistics", "contracts", "shift") | measured | | | |
| 7 | icon_and_screenshot_template [M] | own (the house's first landscape set, 11) | human check per game | | | |
| 8 | bundle_foreign_content [M] | none (salvage folders only) | bundle report | | | |
| 9 | progression | tech-tree | location-levels | sector-map | seasons | office-ladder |
| 10 | prestige | none | reset-for-currency | reset-for-currency | seasonal | new-location-carryover |
| 11 | events | {delivered-lot, posted-price-step, rung-sign, pattern-week, consignment-arrival, company-order-week} | Jaccard 0 with each | | | |
| 12 | meta | {crews, partners, price-board, exchanges, dispatch, territories, valuation, industry-table, companies, process-board} | Jaccard 0 with each (`contracts` and `chests` avoided) | | | |
| 13 | meta screens | different (places drawn as places: the rota, the posted board, the dealing desk, the process board, the clip rail, the key board) | human check | | | |
| 14 | art | flat-vector, palette `hi-vis-and-rust` | warm-cream | deep-space-cold | lantern-night | baize-and-ink |
| 15 | character | humans | **same** | differs | differs | **same** |
| 16 | audio | new pack, `soundPack: null`, new music | measured | | | |
| 17 | voice | `weighbridge-plain` (11) | warm-playful | dry-radio-chatter | lantern-calm | deadpan-memo |
| 18 | keywords | scrapyard, scrap metal, smelter, foundry, ingot, copper, furnace, weighbridge, metal recycling | measured (Jaccard < 0.3) | | | |
| 19 | release gap | at least 14 days after Proudly Adequate's last submission | log | | | |

Planned: 8 of 8 musts against each game; 18 of 19 against Pizza Empire and Proudly Adequate (15 is the same), 19 of 19 against the other two. **Nothing counts as differing until it is measured**: 5, 6, 8 and 16 to 18 by the tools, 7 and 13 by a person, 19 from the log.

Known kinships, written openly in REVIEW-NOTES as Proudly Adequate's notes do:
- Dimensions 11 and 12 reach Jaccard 0 by their ids. In substance, crews are the managers, minders and ministers of the other games, and the company order week is close to Proudly Adequate's campaign week.
- What a person must see as different:
  - a delivered lot arrives on a named partner's lorry with a business card, at its scheduled time; it is never a glowing object (not Orbit's bonanza rock);
  - the rung is a sign hung by the crane, with no promotion words (not a ribbon-cutting);
  - the process board is the progression screen (not an office ladder, not a star map).
- Dimension 17 is measured against Orbit (metal words: strings name grades, never bare metals) and against Proudly Adequate (dry, plain, no exclamation marks sits near deadpan-memo).
- Dimensions 2, 4 and 13 are checked again on stage-4 screens (5.4, 5.5).

**What stage 1 shows that proves each "must" word**, each within ten minutes:
- *steer*: the floating stick walks the worker across a yard about three screens wide. Walking into the truck drives it out of the gate. No target is ever tapped.
- *separation-tree*: the first washing machine splits into light-iron panels (to the weighbridge), a whole motor (later to the motor bench) and a concrete counterweight (to the rubble skip, worth nothing). The hand stripper splits cable into copper and PVC; the crucible splits a charge into ingot and dross.
- *three-quarter-world*: the oblique yard, the camera leading the worker, the lane beyond the gate.
- *graded-lot-sale*: every ticket line is a grade, a net mass and the day's posted price, and the material goes into its grade bay. Tamberlow Metal Merchants' flatbed collects every bay not held, every 30 s (tune 20 to 60), and prints "Lot sold to Tamberlow". The board shows its date and five days of history, with a "low day / usual / high day" word per grade. Every bay shows Hold from the first lot.

---

## 2. The world

The world is invented; the trade is real (L2). Two countries face each other across an ocean. They stand for the owner's "London" and "Shanghai" without naming or imitating either.

- **Calvany** (the West) is a temperate industrial country.
  - Its capital and market city, **Bellmarch**, holds the **Bellmarch Metal Exchange** and the **Calvany Share Market**, where company valuations are listed (7.4).
  - The home district is **Quillon Vale**, an old manufacturing valley. The home yard is **Kettle Lane Yard**, on the lane out of the town of **Quillon**.
  - Further sites: **Saltreach**, a deep-water port 220 km west; **Varn Ridge**, uplands 380 km north (aerospace and toolmaking).
- **The Sennath Union** (the East) is a fast-growing manufacturing coast, 9,000 km away by sea.
  - Its port city, **Kaymor**, holds the **Kaymor Metal Exchange**.
  - Sites: **Ambrel Coast** (battery and electronics makers) and **Kaymor Point** (the refinery headland beside the exchange and the airport).
- **The calvan (§)** is the one currency of this simplified world. Proportions follow the real trade at about §3 to one US dollar (yard-metals.md section 3). No number is ever presented as a real quote.
- **Lanes.** Kettle Lane runs east from the gate past Hob's and Ruddock's sites to a weight-limited bridge. The second hook-lift tier (stage 2) crosses the bridge to the district road and its partners, Larkin's and Pell Street. Every later site has its own lane with two or three partner sites, the rarer material further out (5.5).
- **The people.** The player is the boss, unnamed, in hi-vis, hard hat, gloves and boots. Crew get first names from a curated list and their role's vest colour. Partners appear on business cards with a contact (Hob Garnett, Rosa Ruddock). There is no villain and no story cast; rivals are firms, never people.
- **What is shortened.** One line in Help says so: "Building costs and times are shortened so the business grows in days, not decades; metal prices keep their true proportions." No real-world equivalent is ever shown.

**Every invented name, to the names register** (ruling 14). Before any art or text is built on a name, it is searched in the trademark registers, the company registers of the scrap trade, both stores and the four games' content. Two further rules: no name from the fourth game, and no near-miss of a real company, exchange, port or town.

| Kind | Names (first choices) |
|---|---|
| Title | **Scrap to Ingot**, subtitle "Scrapyard & Metal Tycoon"; fallbacks **Heavy Melt**, then a new search |
| Places | Calvany, Bellmarch, Quillon Vale, Quillon, Kettle Lane, Saltreach, Varn Ridge, Sennath Union, Kaymor, Ambrel Coast, Kaymor Point |
| Markets | Bellmarch Metal Exchange, Kaymor Metal Exchange, Calvany Share Market (no abbreviation shown anywhere: screens, store keywords, screenshots) |
| Currency | calvan, § |
| Local partners | Hob's Farm Clearance, Ruddock Demolition, Larkin's Garage, Pell Street Plumbing, Quillon Foundry Co-op |
| Buyers | Tamberlow Metal Merchants (the stage-1 buyer; not a rival) |
| Regional firms | Durnav Steel (an electric-arc mill), Ostro Cable Works |
| Corporations (logos drawn) | Vantorra Electronics, Veyra Motors, Aldane Aerospace, Brannick Tooling, Quenwick Electrolysers, Meridane Glass |
| Rival firms (25) | listed in 6.2; invented compounds, not surnames |
| Generated parts | crew first names (60); handle words (40 adjectives × 60 nouns × 30 place tags); company name parts (40 × 40 × 8); emblem shapes and glyphs |

Flagged:
- "Kettle" occurs in Proudly Adequate's text as a common noun.
- "Quillon" replaces the first choice "Fennick", which was one letter from a real town and store.
- Orbit Haulers' names (Halden Yards, Brightwater Foundry, Scrap Pod, Salvage Bay) and the words "salvage" and "haul" never appear in player text.

---

## 3. The hand

### 3.1 Controls (one rule in every stage)

The ground work (`docs/design/yard-ground.md`) stays:
- one full-screen responder;
- the stick appears where the thumb lands, in the left 45 % of the safe area below its top 28 %, at least 24 pt inside; the knob travels 52 pt and drags the base past that;
- a second finger is ignored;
- motion, collision and camera run on the UI thread, and the rules receive a presence sample at most ten times a second and decide.

The rules of work:
- **Work needs no button.** Within 1.4 m of a workable thing, with the stick released or centred for a short delay, the worker works it. A ring shows progress; moving stops the work and keeps the progress per piece. The ground work uses a 2 s delay; this document suggests 0.25 s. The first-yard document sets it and measures that walking past never cuts.
- **The one button** (60 pt, lower right, pressed with the stick released) does the one thing the spot offers: **Step out** while driving, **Open** at a place (tool rack, office, scale house, a machine's pad, notice board). It is blank elsewhere. **Vehicles are entered by walking into them** (ruling 16).
- **Buying is a card, never a tile** (ruling 6). Open shows the place's card at the right, each item with its exact price and one Buy. What was bought arrives in the world: a flatbed's crane sets a machine down in 3 s, and new vests walk out of the office.
- **Pickup** is automatic within 1.0 m while capacity allows, 0.15 s a piece, **highest § per kg first**. A piece never displaces one already carried. A painted drop circle takes the stack for the crew.
- **Feeding**: standing in a hopper zone feeds the pieces the machine accepts, one per 0.12 s, highest § per kg first.
- **Weighing in**: cut or sorted pieces on the weighbridge plate for 0.5 s are weighed by grade and go to their bays (5.2).
  - A **loaded partner skip on the plate is a weigh-in** of what was bought. Its ticket shows what was paid, and the skip is tipped on the tipping floor. It never counts as a sale or as supplied tonnes.
  - Only cut or sorted material and lots sell.

### 3.2 Cutting, carrying, vehicles

- **Cut time per piece** is t = m × h / P, at least 0.6 s.
  - Tool power P (kg/s, the boss): spanners 5, grinder 12, torch 30 (stage 1); plasma 60, excavator shear 250 (stage 2).
  - Hardness h: aluminium 0.8; light iron, copper and cable 1.0; brass and bronze 1.2; cast iron 1.5; car body 2.0; heavy steel 2.5.
  - Pieces weigh 3 to 40 kg (1 to 4 s each).
  - A wreck too tough for the tool shows a chip ("Needs a cutting torch").
- **Carry tiers**: frame 40 kg, gloves and harness 60 kg, sack truck 120 kg (stage 1); pallet truck 300 kg, forklift 1.5 t (stage 2). Walking is 4.0 m/s with any stack. A piece heavier than the free capacity cannot be lifted; the cast-iron bath teaches the sack truck.
- **Vehicles**:
  - the hook-lift truck (stage 1): one skip, with a second slot as an upgrade; it swaps skips and never crushes or tows. Speeds are set by the first-yard document; the ground work drives at 9 m/s;
  - the forklift, the magnet-crane cab and the excavator shear (stage 2);
  - a site truck at each later site.
  - The boss drives 25 % faster than a hired driver.

### 3.3 Crews (rates, live and away)

- A crew member works one station at 60 % of its tool rate, +12 % per level (10 levels, at most 95 %). Levels are priced by the payback rule (6.3).
- **Crew work is a rate, live and away, from one function** (ruling 16). A carrier's rate is load × speed ÷ trip length, with the trip fixed by the layout. The walk on screen is interpolated from it and decides nothing.
- **Shared stations split by strict priority by § per kg**, water-filled: the highest grade takes what it can, each flow at or under its source rate. The same function runs live and away.
- Stage 1 roles: yard hand (to the weighbridge or a hopper, 60 kg a trip, 3 m/s), cutter (gate tip, then tipping floor), driver (the skip route, in partner order).
- Later roles come with their machines: bench hand, torch cutter, furnace hand, crane driver, dispatch clerk, a crew per line. The office shows them on the **rota**.

### 3.4 What the hand is for at every size (ruling 7)

In stage 1 the hand is the main producer: the boss cuts at 100 %, crews at 60 to 95 %. From stage 2 its rewards scale with **I**, the rated income in § per minute: R (6.3) × the business's mean value margin per tonne at p̄, ÷ 60. I is fixed when a reward is created, so the card shows what is paid. Because capacity is bought with money (6.3), more money means more tonnes, and a hand that earns more also climbs faster.

| Mechanism (stage) | Rule | Reward |
|---|---|---|
| **Delivered lots** (2) | One arrives every 3 h of market time from the player's start (tune 2 to 4), on a named partner's lorry with a business card, **at the site where the boss is**. At most 4 wait; they never expire; only the boss opens one (4 to 10 s of cutting). Its material belongs to a line the player already has (a bronze ship's bell, an engine casing, a crate of spent spark plugs once the PGM refinery stands). Otherwise it yields an intermediate sold by assay, which counts tonnes but no range. Never a catalytic converter or a pressure vessel. | material worth μ × I at p̄, fixed at arrival: μ = 15 min at rungs 2 to 3 and 18 min from rung 4 (tune 10 to 25), so that 8 lots a day give about a tenth of a day's income. Tonnes count when weighed in |
| **The boss's crate** (2; every site in 4) | Crews set aside f = 15 % (tune 10 to 20) of every site's incoming mass for the boss: oversize, mixed alloys. Site trucks send it as sample crates to the hand station of the site where the boss is (the oversize pad, the fittings bench, the module bench, the sample station, the alloy table). The crate holds 12 h of set-aside. **45 s of standing clears it at any scale**: each piece worked stands for a batch, with its size printed on it. Set-aside that is never worked leaves at the price crews get, so nothing is lost. A full crate lets new set-aside pass as usual. | worked mass sells sorted at u = 1.6 × the mixed price (tune 1.4 to 1.8): about f × (u − 1) = 9 % of the business's income when kept worked |
| **Foreman on site** (1) | Crews and machines at the site where the boss has worked in the last 20 s run faster, for at most 45 min of foreman time per market day (a meter on the vest). | +25 % (tune 15 to 40), worth about 0.8 % of a day |
| **Commissioning** (2) | A new machine starts when the boss stands at it for 5 s; otherwise its crew commissions it 20 min after delivery. | 20 min of its output |

**Aims, at rungs 3, 6 and 8** (proto; the most doubtful in the game):
- Over 24 h, the 45-minutes-a-day habit (12.4) working the hand earns at least a fifth more than the same player managing from overlays with the same purchases (ruling 7). It also reaches the next rung at least 10 % sooner.
- No mechanism gives more than three fifths of the gain. Planned: lots about 10 %, the crate about 9 %, foreman and commissioning about 2 %, about 21 % in all. The twice-a-day habit gets about the same (8 lots a day, the crate fully worked in 12 h).
- The hand work one sitting needs stays under 3 minutes across all sites. All hand rewards of a twice-a-day sitting at rung 7 are collected in under 4 minutes at the normal hand.

---

## 4. Material and value

### 4.1 Units and grades

- Every grade is priced per kilogram, except silver, the platinum group, gold and iridium, which are priced per gram. A grade's unit never changes.
- Masses show in t from 10 t (ferrous from 1 t), otherwise in kg; precious masses show in g below 1 kg. Every amount carries its unit.
- Rules hold integer grams. Precious inputs always come in lots of at least a few grams (a crate of spent spark plugs, a drum of anode slime).
- A **grade** is what a lot is sold as ("Bare bright copper", "Car body (shredder feed)").
- **Intermediates** count tonnes when weighed in but count toward no material's range: insulated cable, whole motors, whole lead batteries, e-scrap, whole converters, black mass, anode slime, spent spark plugs.

### 4.2 The ladder of 16 materials

The ladder is sorted by the price of each material's main product (yard-metals.md 3 and 10; mean prices p̄ at about §3 to the dollar). Ratios are true from steel to iridium, about one to two million. Balance comes from quantities (ruling 4). Scrap payables are derived by the build script from payable share × exchange p̄, so the two cannot drift apart.

| # | Material | Source objects | Route | Products, p̄ | Stage |
|---|---|---|---|---|---|
| 1 | Light iron | washing machines, bicycles, sheet | spanners or grinder → baler | loose §0.50/kg, baled §0.62 | 1 |
| 2 | Cast iron | radiators, baths, engine blocks | grinder, sorted | solids §0.95/kg | 1 |
| 3 | Steel | beams, rail, plate; car bodies | torch, shear; shredder → drum magnet; EAF → caster | HMS 80:20 §1.20/kg (unprepared §0.85); car body (shredder feed) §0.70; shred §1.26; billet §1.90 | 1, 2, 4 |
| 4 | Stainless 304 | sinks, catering steel | analyser grading | sorted solids §4.80/kg | 2 |
| 5 | Lead | car batteries | battery breaker → rotary smelter → refining kettle | whole battery §1.80/kg (intermediate); ingot 99.97 % §5.40; polypropylene chips §0.90 | 2 |
| 6 | Aluminium | wheels, cans, extrusions, shredder twitch | baler; eddy current; crucible or rotary furnace under salt flux | wheels §5.60/kg, clean sheet §5.00, cans §3.40; **secondary alloy ingot** §8.70 (inference); dross §0.80 | 1, 2 |
| 7 | Brass | taps, valves, fittings | sorted → crucible or induction furnace | solids §19.50/kg; ingot §25; dross §2 | 1 |
| 8 | Nickel superalloy | engine blades, turnings | analyser sort at the alloy table | solids §32/kg, turnings §20 (inference) | 6 |
| 9 | Copper | cable, pipe, motors | stripper, granulator, motor bench; anode furnace → anode casting → electrorefining | No.2 §34.30/kg, bare bright §35.50, Grade A cathode §36.10; anode slime onward | 1, 4 |
| 10 | Lithium battery materials | EV and e-bike packs | discharge → module bench → inert shredder → sieve → leach → filter press → solvent extraction → precipitation | black mass by payable; lithium carbonate §38/kg; nickel sulphate §11, cobalt sulphate §31 (inference) | 4 |
| 11 | Bronze | bushings, bearings, bells, propellers | sorted → induction furnace | bronze solids §29/kg (scrap); ingot §42 | 2 |
| 12 | Tungsten carbide | drill bits, inserts, saw tips | sort → zinc-process furnace (zinc distilled and reused) | sorted carbide §330/kg; reclaimed powder §460 (inference); APT only as the dealer's reference | 6 |
| 13 | Silver | contacts, boards, anode slime | e-scrap smelter (copper collector) → tankhouse → slime refinery | bar §4.08/g | 4 |
| 14 | Platinum group | catalytic converters | decanning → milling, sampling → assay → collector smelt → PGM refinery | Pd sponge §86/g, Pt §126/g, rhodium §850/g (a by-product dearer than gold, shown so) | 1 (whole, by assay), 6 |
| 15 | Gold | boards, phones, connectors | e-scrap smelter → slime → leach → precipitation | bar §350/g | 4 |
| 16 | Iridium | spark-plug tips, crystal crucibles, electrolyser stacks | PGM refinery | sponge §985/g | 6 |

Not separate materials in version 1: zinc and tin (inside brass, bronze, dross and furnace dust), titanium, cobalt (with 10), ruthenium (a trace in 14). Trade code words (Barley, Zorba, Twitch) appear only in the glossary.

### 4.3 The separation tree as data

Objects and machines are content (`salvage.objects` and `salvage.machines` in game.json, validated by `src/config/schema.salvage.ts`).

**Mass is conserved**: outputs + waste = inputs + declared reagents. Each reagent (sulphuric acid, soda ash, salt flux, lime) is an input stream with a mass per tonne and a price per tonne, bought per batch like feed and never by the clock. **Ranked tonnes are product mass capped at the input scrap mass**, so reagents never mint tonnes. Hydro machines are also checked on contained metal.

From the frozen fixture:

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

**The old car of stage 1** (1,060 kg, torch) is delivered by Ruddock Demolition as "depolluted end-of-life car · certificate of destruction attached". It gives:
- a battery of 14 kg;
- four aluminium wheels of 9 kg;
- a 4 kg wiring loom (low-grade cable);
- one catalytic converter;
- a body of eight 100 kg pieces of car body (shredder feed);
- 200 kg to the licensed contractor.

The converter is sold whole by assay. Its ticket reads "Catalytic converter · from depolluted car ref. 0012 · sold by assay". The formula is 0.75 × Pt + 0.75 × Pd + 0.65 × Rh of contained value, less §6 per kg of ceramic (1.5 kg) and a §30 assay fee per lot. At 3 g Pt, 3 g Pd and 0.8 g Rh that is about §880. After the stage-6 refinery the player is paid 0.98, 0.97 and 0.90.

Further rules:
- **A converter exists only with a source id of type own-depolluted-car or named-garage** (a test).
- Cylinders, extinguishers and closed tanks arrive only tagged "certified empty".
- Waste has a destination and no value, and is never charged by the clock.
- Chemistry stays inside a machine: no recipe, concentration or temperature is shown (L3).

### 4.4 The range gate

A material counts toward the range needed for rung r when its lifetime supplied products are worth at least

θ_r = max(§300, k × T_r × §1,200 per t), with k = 1 % (tune 0.5 to 2) and T_r the rung's tonnes (6.1; §8.4 M at rung 9 uses 7 Mt).

Lifetime supply never falls, and an entered rung is never lost. The range chips on the industry table show each material's progress toward the next rung's θ.

| Rung entered | 2 to 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|
| θ (value) | §300 | §12 k | §120 k | §1.2 M | §12 M | §42 M | §84 M |
| as bare bright copper | 9 kg | 340 kg | 3.4 t | 34 t | 340 t | 1,180 t | 2,370 t |
| as gold / iridium | 0.9 g / 0.31 g | 34 g | 343 g | 3.4 kg | 34 kg | 120 kg / 43 kg | 85 kg iridium |

Range needs running lines, not token lots. A **steel-max bot** that ticks every material with the cheapest lots stalls at rung 4 or 5 (a bot gate, 12.3).

---

## 5. The systems

### 5.1 Machines and production lines (pyro from stage 1, hydro from stage 4)

- A **line** is a row of unit-process machines in fixed slots on a plant pad, in their real order. Version 1 has no free layout.
- Each machine has inputs, reagents, output shares, by-products, waste, and either a rate (t/h) or a batch (charge and time). Levels 1 to 10 add 15 % rate each, priced by the payback rule (6.3).
- **No machine has a running cost by the clock**: no power bill, wage or wear (ruling 9). Reagents are paid per batch.
- A batch starts when its charge is full, or at 40 % after 60 s without feed. The away pass uses the batch's mean rate whenever the feed is below its capacity, tested against the replay.
- A full output bay stops a machine, and nothing is lost.

| Line (stage) | Unit processes and level-1 numbers (tune) |
|---|---|
| Hand machines (1) | old hand stripper (inherited, 1 kg/s); powered cable stripper, 6 kg/s; motor bench (4.3); small crucible under an extraction hood (4.3; clean aluminium 94 %; what remains below a 10 kg ingot stays as heel). The stripper takes heavy cable: 70 % copper + 30 % PVC. Clean cable gives bare bright; a tinned share, seeded and shown on the piece, gives No.2. Thin cable waits for the granulator |
| Yard (2) | baler 20 kg/s (+24 % on light iron and cans); magnet crane 3 t/min; cable granulator 0.5 t/h (thin cable: 35 % copper granules); depollution bay; analyser |
| Shredder (2) | hammer mill 30 t/h → drum magnet (72 % shred) → eddy current (8 % zorba) → 20 % residue to the licensed contractor; the sensor sorter splits zorba into twitch 60 %, copper 15 %, brass 12 %, zinc-rich heavies 8 %, stainless 5 % |
| Aluminium, lead, brass, bronze (2) | rotary furnace under salt flux (reagent), 2 t, 40 min: 88 % alloy ingot or T-bar, 7 % dross, 5 % salt slag to the contractor; battery breaker 1 t/h (soda reagent) → rotary smelter → refining kettle: lead ingot 60 %, polypropylene 6 %, sodium sulphate from the reagent; induction furnace 500 kg, 8 min, 97 % |
| Off-gas filters (2) | every furnace hall, the crucible's hood included, needs a bag-house filter: 1.5 % of the charge as zinc-rich dust, §0.40/kg (the owner's "filters", pyro side) |
| Steel (4, Saltreach) | electric arc furnace (lime reagent) → ladle → continuous caster: 88.5 % billet, 10 % slag sold as aggregate, 1.5 % EAF dust |
| Copper and e-scrap (4, Kaymor Point) | anode furnace → anode casting → electrorefining. From No.2: 94.5 % Grade A cathode, 0.3 % anode slime, 5.2 % fire-refining slag to the contractor. From granules or No.1: 98 %. E-scrap smelter with a copper collector, per tonne of boards and phones: 130 kg copper, 3.5 kg silver, 340 g gold, 140 g palladium (yard-metals.md 1) → slime refinery: leach → precipitation → silver and gold bars |
| Batteries (4, Ambrel Coast, hydro) | the route of 4.2. Sieve: 40 % black mass, 8 % copper foil, 5 % aluminium foil, 20 % steel, 27 % plastics, separator and electrolyte residue to the licensed contractor. The filter press takes out the graphite cake ("filters", hydro side). Black mass in the data: Li 3.4 %, Ni 17.8 %, Co 5.9 %, graphite 35 %; recoveries 90 to 95 %. Per tonne, about 167 kg lithium carbonate, 758 kg nickel sulphate and 267 kg cobalt sulphate (inference; the hydrate water comes from the declared reagents) |
| PGM, iridium, tungsten (6) | decanning → milling and sampling → assay → collector smelt → refinery; plug crates and electrolyser stacks give iridium; carbide sort → zinc-process furnace, 95 % powder |

**Decisions:**
- which line or level next;
- which input a shared furnace takes;
- whether to sell an intermediate or refine it, on one **refine-or-sell card** with both nets ("Sell black mass now §17,400/t · Refine §21,500/t net of reagents, in 3 h 10 m").

**Costs:** every machine and level follows the payback rule of 6.3. Anchors: the shredder line about §0.9 M at rung 4, the tankhouse about §60 M at rung 6 (tune). Build times are 5 to 60 min and halve with the crane yard at rung 5.

**Ranking:** products weighed in add tonnes, and the range needs materials only lines make (4.4).

### 5.2 The posted board, the two exchanges and the dealers (ruling 8)

**Two clocks:**
- The **live dt** comes from monotonic elapsed time (`performance.now` in the shell, passed to the rules), always.
- The **market clock** is t_m = max(device now, clockHigh + live time elapsed since the last resume), in UTC. It is saved and never runs backwards, and it advances during live play even after the device clock was set back.
- Price steps: n = floor((t_m − EPOCH) / 600 s), with EPOCH a Monday 00:00 UTC. Market days start at 00:00 UTC and weeks on Monday. There are no session hours.
- Every random number is a counter hash h(worldSeed, metal, venue, n), so every phone shows the same prices.

**Stage 1, the posted board** (Tamberlow's prices). Each grade family (ferrous, non-ferrous) gets one price a market day, mean-reverting:

x(d+1) = 0.5 × x(d) + 0.03 × w(d), with w uniform in [−1, 1] (stationary deviation about 2 %; tune 0.02 to 0.05); p_g = p̄_g × (1 + x).

- The board shows its date, five days of history, a tick for the usual price and one word: **low day** (x < −1.5 %), **usual**, or **high day** (x > 1.5 %). Holding on a low day is then a reading, not a guess.
- **Hold**: each bay holds 2 h of its grade's flow (content). A bay that is not held is collected on the flatbed's round at the moment's price. A held bay waits, and its card's Sell sells it at once. A full held bay lets further pieces go out on the round. Bays never charge rent.
- **Tickets**:
  - Incoming tickets (skips, gate drop-offs) read "Seller ID checked · paid by transfer" or "Signed in · gate drop-off".
  - Outgoing lots read "Lot sold to Tamberlow · weighed out · paid by transfer".
  - The site licence hangs framed on the portacabin wall from minute 0. The legal lines are small on the ticket, never a toast.
- **A grade under a supply deal is reserved automatically**, up to the next delivery's quantity, before the round collects it ("Reserved for Quillon Foundry: 140/200 kg").

**Stage 3, exchanges and dealers.** The posted board becomes the dealer's board, and the dealing desk opens.
- **Exchange metals** (aluminium, copper, lead, nickel, tin, zinc on both exchanges): P(m, e, n) = p̄_m × exp(c_m + s_{m,e} + φ_m + d_e).
  - c is the common factor: an exact discrete Ornstein-Uhlenbeck step (yard-tech.md E), half-life 2 days, stationary deviation 1.5 % (copper, aluminium), 2 % (lead, zinc), 3 % (nickel, tin).
  - s is each exchange's own OU step: half-life 8 h, deviation 1 % (the gap).
  - d is the Union's import duty, +1.5 % at Kaymor, named on the board. It is charged only on goods arriving from the West; Eastern sites sell at the Kaymor price less d.
  - φ is the week's pattern per metal, h(worldSeed, metal, week):
    - **Steady** 40 %;
    - **Tight week** 20 % (a line to +7 % by day 3, a day held, back to 0 by day 7);
    - **Glut** 20 % (to −6 % by day 3, slow recovery);
    - **Shock** 20 % (a +9 % or −8 % step on one exchange at a hashed time, 1.5-day half-life, with a bulletin naming its cause 12 h before: "Kaymor: power curbs at smelters from Thu 09:00").
  - Values come from the weekly anchor floor(t/W)·W − W, W = 7 days (seam under 1 %).
- **Dealers** post everything else (ferrous, stainless, carbide, lithium and the black-mass payable, sulphates, the precious metals): one price per grade worldwide plus a fixed regional premium, once a market day at 00:00 UTC.
  - The step is P(d+1) = P(d) × exp(−0.15 × ln(P/p̄) + a draw). The draw is 0 with 55 %, ±1 to 3 % with 40 %, and ±8 to 20 % with 5 %; a large step is announced the day before.
  - The recursion is anchored every 28 days at p̄ (0.85^28 ≈ 1 % of a deviation survives a seam), with cached checkpoints.
- **Scrap grades** sell to dealers at a payable share of the West cash price: No.2 copper 95 %, bare bright 98.5 %, brass and bronze by content.
  - Only **copper cathode and lead ingot** can become **registered brands**, by running a line 24 h with the assay lab.
  - Registered brands sell on an exchange in the game's own lots (Bellmarch 20 t, Kaymor 10 t, both invented) at cash less 0.15 %, at most 40 lots per metal per exchange per market day.
  - Secondary aluminium alloy sells to dealers and die-casters.
- **The board shows**: price, 24 h change, 14-day history, stocks, and one word for cash against forward (**shortage now**, **balanced**, **plenty**; never a number). It also shows bulletins and the gap as a sentence ("Kaymor pays 3.2 % more after carriage and duty; arrives in 11 h"). There is no future chart.
- **The fictional line**: "All prices, exchanges and shares are fictional and have no real-world value. Nothing in this game is financial advice." It shows on first opening the board and the listing, and in Help.
- **The player can**, physically only:
  - sell to a dealer or, for registered lots in a warehouse there, on an exchange;
  - ship (5.4);
  - sign deals (5.3);
  - write a **sell note on a bay** ("Sell this bay when the board reaches §X"), filled at the first step at or above X, at that step's price, also while away, and shown in the bay's history. It is never listed as open orders;
  - store in exchange warehouses, **prepaid** for 7 or 28 days at a shown price. When that runs out the stock waits and nothing is charged.
  - There is no buying from an exchange, and no bets, leverage, shorts, futures or options.
- **Shown equals applied by mechanism**: every sale and booking card carries the step it showed (`sell(lotId, n)`). A changed step asks again: "Price updated: a → b".
- **Signals**: stocks lead the pattern by about a day and are right about 70 % of the time; the cash-forward word; bulletins; dealer notices; the gap sentence.
- **Bot gates** (one device):
  - a pattern reader beats selling at once by 3 to 7 % on the same tonnage;
  - no strategy beats it by more than 8 %; perfect foresight by at most 25 %;
  - peeking forward by changing the clock gains nothing, because clockHigh moves forward for good.
  - Prices are shared and computable, so a second device or a fan page shows tomorrow's board. That foresight is bounded by the 25 % above, acts on money only, and never acts on rank.

**Ranking:** price never counts directly. Better selling buys capacity sooner (6.3), so a pattern reader reaches rung 7 at least half a day sooner (aim, 12.3).

### 5.3 Partners and deals

**The gate tip** is the free source that rules out a dead end.
- The public leaves items at the gate, one every 40 s while fewer than 8 wait. The yard starts with none waiting, the first arriving at 0:40.
- The mix: washing machine 45 %, bicycle 20 %, cast-iron radiator 15 %, a coil of heavy cable offcuts 8 %, box of brass taps 7 %, copper hot-water cylinder 5 %. Never a converter, never a sealed vessel.
- Every drop-off is signed in.

**The yard's opening stock** is finite and needs nothing beyond spanners and the inherited hand stripper. The first-yard document owns its numbers. Proposed:
- a 12 kg bundle of heavy cable offcuts by the hand stripper;
- four washing machines, two radiators, a cast-iron bath and a box of six brass taps;
- one copper hot-water cylinder, "certified empty";
- the old car behind the torch rack.
- Starting cash is §0.

**Supplier partners** fill a skip or container. **Its contents are fixed when it fills** (a counter hash) and printed on its label by grade and kilogram, with the price, before anyone hooks it. The weighed-in mix equals the label exactly. **Nothing bought, with calvans or real money, has contents unknown at purchase.**
- A skip's price is a shown share of its as-found value at the day's prices: k = 0.70 (tune 0.60 to 0.80). The yard's honest margin is sorting, cutting and stripping.
- The driver hooks a skip only if cash covers it.

**Customer partners** sign supply deals: "q t a day of grade g for D days at §p, locked at signing".
- p = the 7-day average × (1 + premium): local 2 %, regional 3 %, corporate 4 % (tune).
- A day's delivery is drawn at 00:00 UTC from the reserved stock.
- A short day is paid for what was delivered, and trust (0 to 100) falls by 10; a full day raises it by 5. **Nothing is ever charged for a miss.**
- Trust gates bigger deals: regional at 60, corporate at 80.

| Tier (stage) | Partners |
|---|---|
| Local (1, 2) | **Hob's Farm Clearance** (opens with the truck): 1 t every 5 min; light iron 60 %, cast iron 30 %, unprepared steel 6 %, brass 3 %, copper 1 %; about §1.10/kg at k. **Ruddock Demolition** (with the torch): 3 t every 8 min; beams 70 %, light iron 15 %, heavy cable 8 %, copper pipe 4 %, brass valves 3 %; about §2.95/kg; delivers the depolluted car. **Quillon Foundry Co-op**: stage 1's deal series, 200 kg of cast iron a day for 5 days at the 7-day average + 2 %, then larger. Stage 2, across the bridge: **Larkin's Garage** (depolluted cars with converters, batteries, wheels; bronze bushings) and **Pell Street Plumbing** (copper pipe, brass, bronze valves) |
| Regional (3) | **Durnav Steel** (an arc-furnace mill buying HMS and shred by monthly deal); **Ostro Cable Works** (copper granules and cathode) |
| Corporations (3, 4, 6) | **Veyra Motors**: closed loop as tolling (Veyra keeps the aluminium and pays §1.0 per kg of ingot); stage 4, EV pack take-back, with a fee paid to the yard. **Vantorra Electronics**: phones and boards, paid to Vantorra at a shown payable of 80 % of the day's dealer price for the grade. **Aldane Aerospace**: superalloy offtake. **Brannick Tooling**: carbide, paid at 80 % payable. **Quenwick Electrolysers**: iridium tolling. **Meridane Glass**: rhodium and platinum tolling |

Deal kinds:
- **supply**;
- **take-back**: the yard pays a payable for valuable material, and is paid a fee only for material worth less than its handling;
- **offtake**: a line's output for 28 days at the exchange average + 3 %, with no advance;
- **tolling**: the partner keeps the metal and pays a fee per kilogram.

Corporations ask for certificates the player builds (radiation portal, depollution bay, assay lab with chain-of-custody records, battery bay, export consent) and a minimum tonnage. Logos hang framed on the office wall beside the business cards.

**Decisions:** which deals to sign against capacity and the market. **Ranking:** delivered tonnes count. The buy-ratio lever (pay more, get more) is optional in stage 2.

### 5.4 Transport (road and rail in stage 3; vessel and plane in stage 4)

**Sale venues force routes.** Bullion and PGM sponge sell only at the Bellmarch bullion dealer. Battery salts sell only to buyers in the Union. Billet, cathode and offtakes are delivered to named sites. Each consignment is one **booking card** with a row per possible mode: capacity, carriage, transit, the next departure, arrival clock time and net per tonne. The row with the best net is preselected; the fixed quote is the default for live bookings. A booked consignment is never cancelled or re-routed.

| Mode | § per t·km | Capacity | Departures, transit (compressed, true order) | Needs |
|---|---|---|---|---|
| Road | 0.342 | own trucks of 25 t | within the hour; 4 min + 1.5 min per 100 km | — |
| Rail | 0.078 | 80 t wagons, trains up to 20 | every 6 h; 20 min + 50 min per 1,000 km | sidings at both ends |
| Vessel | 0.012 | 2,000 to 30,000 t | every 12 h; 2 h + 60 min per 1,000 km (Saltreach to Kaymor about 11 h) | quays at both ends |
| Plane | 2.53 | 50 t | every 3 h; 30 min + 5 min per 1,000 km (about 75 min across) | an airside shed at the sending site |

Cost ratios are the research's: vessel 1, rail 6.5, road 28, plane 210.

- **Batteries and black mass never fly**. The plane row is greyed: "Lithium batteries are not flown (dangerous goods rules)". Precious metals go by plane or by armoured road (× 4, 2 t).
- **Export consent** is a certificate built at the office from stage 4. Booking cards for e-scrap, black mass and battery loads show "Consignment note · consent on file · to licensed plant", and go only to the player's own licensed plants or to named licensed refiners. Without the certificate those rows are greyed with the reason. It is procedural only and never adds a fee by the clock.
- **Insurance** is 0.2 % of value a day under way, paid at booking with the carriage. With the fixed quote's 1 % a day, the plane is the best net above about §5 to §30 per gram of value (gold, PGM, iridium) and for urgent lots: a deal deadline, or a Shock with its bulletin. A warning when carriage exceeds half the load's value teaches "steel by ship, iridium by air".
- **Pricing** (ruling 8): sold on arrival at the price then, or at a **fixed quote at dispatch**, q = P_dest(t_m) × (1 − 0.01 × transit hours ÷ 24). For arrival pricing the card shows the range that the last 14 days' moves over that transit would give ("likely between a and b"). Repeat notes use arrival pricing while the player is away.
- **Distances**: Kettle Lane to Bellmarch 120 km, to Saltreach 220 km, to Varn Ridge 380 km; Saltreach to Kaymor 9,000 km by sea; Kaymor to Ambrel Coast 600 km.
- **Repeat notes**: a **dispatch clerk** runs a note written on a bay ("send shred to Saltreach every 6 h"), also while away. It is never drawn as a route.
- **Shown only as physical events at places**: wagons filling at the siding, the magnet-crane cab loading the vessel at the quay (the boss loads at twice the crew rate), the boss signing the armoured van, the plane at the airside shed, arrivals unloading at the destination yard. The dispatch office has a **clip rail** of printed consignment notes: a list, with no map, no tokens and no lines.
- **Decisions**: time against cost against capacity and departure times, with cash tied up under way. **Ranking**: tonnes count when weighed in at the destination.
- **Bot gates** (on a scripted stage-4 mix):
  - each mode is the best net in at least 10 % of shipments by count, or 10 % by value;
  - a person-like player picks a row other than the preselected one in at least 15 % of bookings;
  - no battery can be booked by air.

### 5.5 Territories (stage 4; Varn Ridge, the PGM and carbide plants in stage 6)

- Sites are bought outright, never seized. Each costs about 6 h of income at the rung that opens it (tune; anchors: Saltreach about §5 M, Kaymor Point about §80 M).
- They are chosen on the office's **key board**: one key tag per site, with a photo-card of the yard. Moving to a site plays a short arrival (the site truck pulling in), never a cut.
- Each site is a walkable yard with its own lane of two or three partner sites, its own crews, hand station, goals and away pass. The worker is at one site at a time.
- Sites open at tonnage goals inside rungs, so that each rung opens one new decision system (6.1).

| Site | Opens | What only it does | Its lane | Hand station |
|---|---|---|---|---|
| Kettle Lane | start | the hand, the lane, the works (back field, shredder, melt shops) | Hob's, Ruddock's; across the bridge Larkin's, Pell Street | the oversize pad |
| Saltreach | 30 kt (inside rung 5) | the quay and vessels; a licensed ship-recycling berth (the excavator shear cuts plate; asbestos leaves with a licensed contractor in sealed bags; the boss never torches a hull); propellers and fittings; the EAF and caster | the breakers' quay beyond the harbour wall; the marine chandlers | the fittings bench |
| Ambrel Coast (East) | 30 kt (inside rung 5) | the battery bay (thermal cameras, isolation drums), the hydro line, e-scrap dismantling | the pack makers' estate; the phone repairers' arcade | the module bench (packs arrive "discharged, checked") |
| Kaymor Point (East) | rung 6 | the tankhouse, the slime and e-scrap refinery, the airport shed; stage 6: the PGM refinery and iridium | the electrolyser plant; the glassworks | the sample station |
| Varn Ridge (stage 6) | rung 7 | aerospace turnings and solids, superalloy for Aldane; the carbide plant | the machine shops up the hill road | the alloy table |

Hazards appear only as things a good yard handles properly: procedural and calm, never a spectacle, a minigame or a reward (L3). Every pour is drawn under an extraction hood, with the worker in a face shield and an aluminised apron and the moulds on a dry sand bed. No pour is ever timed by the player.

### 5.6 Time away (rulings 9 and 16)

- `paysOnCompute: true`, `catchUpSeconds: 0`.
- Away time A = min(t_m − max(lastSaved, clockHigh), Cap).
- **Cap**: 4 h at the start; 6 h with the **Night watch** (an office upgrade, §3,000, stage 1); then, earned, 8 h at rung 4, 10 h at rung 5 and 12 h at rung 6 (the maximum).
- One A applies to every site.

**The closed form.** Each site is a directed graph:
- sources (gate tip; partner skips, gated by cash; take-backs) → cutting (Σ crew cut rate) → carrying (Σ carrier rate) → machines (rate × level, or a batch's mean rate) → bays → collection, delivery or consignment.
- Between events each flow runs at its bottleneck rate, split by the priority rule of 3.3.
- A segment ends at:
  - a buffer full or empty;
  - a cash threshold that lets a skip be bought;
  - a batch's doneAt;
  - a consignment's arrivesAt;
  - a deal's daily delivery;
  - a sell note's fill;
  - a dealer posting;
  - **every price step** (daily in stage 1, every 10 minutes from stage 3).
- Within a segment, revenue is exactly mass × price per grade; money and tonnes are added in time order. The 10 Hz live tick uses the same rate functions.
- Further rules:
  - The boss's rewards never happen while away; delivered lots wait.
  - A line whose margin would be negative pauses.
  - Full buffers stop their feeders; nothing is lost; no cost runs by the clock.
  - The result is paid in the update that computes it and recorded under clockHigh, so a clock jump never pays twice.
  - **Known limit of the local game**: moving the clock forward pays the away cap at once, and repeating it pays again. Online, ranked tonnes are bounded by server time (7.5).

**What the player finds:**
- the yard moved on: bays fuller, ingots stacked, the truck back with a fresh skip, lots waiting;
- the away card as a weighbridge ticket roll: "Away 3 h 12 m (cap 4 h)"; a line per grade; "41.2 t supplied · §148,200 (already in your account)"; arrivals; "You passed Kelderby Recycling.";
- one optional ad button with its exact sum.

---

## 6. The one ladder

### 6.1 Rungs, days and what each rung opens

- The industry table ranks **lifetime tonnes supplied**: the net mass of products weighed in, delivered or arrived. Weighed-in skips, reagents and waste do not count.
- A position on it **never falls while the player is away** (ruling 3).
- A rung is entered when its tonnes, range and site count are all met. The crane hangs a sign over the gate: the yard's name and the tonnes ("Kettle Lane Yard · 1,000 t supplied"). There is no job title and no promotion wording. The HUD chip shows rank and the next rival, not the rung.

**How the days are computed** (`/tmp/claude-0/-home-user/f22d4cbe-c353-58da-a893-27d84a9b8342/scratchpad/spec-master/ladder3.py`; a sketch, not a prototype):

- Production hours per day: h(habit, r) = Σ over the gaps between sittings of min(gap, Cap(r)), plus live hours. Twice a day this gives 8.3 h at rungs 1 to 2, 12.3 at rung 3, 16.3 at rung 4, 20.3 at rung 5 and 24 from rung 6. From rung 6 every habit produces about 24 h a day, so the columns converge.
- Capacity R grows only by purchases, at 1/τ_r per production hour while all income is spent (6.3). The pace bot spends 85 %; the rest goes to sites, certificates and feed.
- L = ∫ R dt, and day_r is the first sitting with L ≥ T_r and the gates met.

| Rung | Tonnes T | Range | Sites | Twice a day (sketch, target band) | Three hours a day | Always on |
|---|---|---|---|---|---|---|
| 1 | 0 | — | 1 | start | start | start |
| 2 (the radiation portal and ID desk: "Every load checked. Every seller identified. Payment by transfer only.") | 2 t | 3 | 1 | 12 to 18 min | 12 to 18 min | — |
| 3 | 25 t | 5 | 1 | 55 to 65 min | 55 to 65 min | — |
| 4 | 1 kt | 8 | 1 | day 2.3 (2 to 3) | 1.3 | 1.1 |
| 5 | 10 kt | 9 | 1 | day 4.8 (4 to 6) | 3.3 | 2.8 |
| 6 | 100 kt | 10 | 3 | day 8.8 (8 to 10) | 6.6 | 6.2 |
| 7 | 1 Mt | 12 | 4 | day 16.8 (15 to 19) | 14.3 | 14.0 |
| 8 | 3.5 Mt | 15 | 5 | day 24.8 (23 to 27) | 22.3 | 21.9 |
| 9 | **The largest full metal recycling and resource supplier**: Orrin Global Metals passed on the player's own table | 16 | 5 | day 31.3 (29 to 34), at 6.9 Mt | 28.6 | 28.4 |

Sensitivities (sketch):
- the hand's +20 % income reaches rung 9 on day 25.8;
- a pattern reader's +8 % on day 28.8;
- spending only 80 % on capacity, day 33.3.

Materials by stage make the gates reachable in order:
- stage 1: 6 (light iron, cast iron, steel, aluminium, brass, copper). Whole batteries, cable, motors and the converter are intermediates. Rung 3 needs 5, so a slow hand who skips the torch still reaches it;
- stage 2: adds stainless, lead ingot and bronze (9);
- stage 4: Ambrel Coast and Kaymor Point add lithium, silver and gold (12);
- stage 6: adds superalloy, carbide, the platinum group and iridium (16).

**What each rung opens**: at most one new decision system, each with a first instance worth doing.

| Rung | Opens (stage) | First instance | Goal card's next goal |
|---|---|---|---|
| 1 | hand, crews, posted board and Hold (1) | hold one bay over a low day | hire the yard hand |
| 2 | supply deals (1) | Quillon Foundry, 200 kg cast iron a day | the crucible's first pour |
| 3 | the works and the process board (2) | the baler, then the rotary furnace | Larkin's across the bridge |
| 4 | dealers and road and rail dispatch (3); companies (5) | one wagon of shred to Durnav Steel | a registered brand |
| 5 | the two exchanges and the corporations (3); at 30 kt the key board (4) | one 20 t cathode lot at Bellmarch; Veyra's tolling | Saltreach or Ambrel Coast |
| 6 | vessel and plane (4) | the first sailing to Kaymor | Kaymor Point's tankhouse |
| 7 | Varn Ridge and stage 6's lines | a carbide sort | the PGM refinery |
| 8 | iridium tolling (6) | Quenwick's first stack | pass Orrin |

### 6.2 Rival firms as pure functions

- There are 25 invented firms, each with a drawn logo, a short name of at most 14 characters for the chip, and a "simulated" tag.
- Lifetime tonnes: T_i(d) = T_i0 × (1 + g × min(d, 40)), with g = 0.5 % a day below 1 kt and 1 % from 1 kt. Orrin's g is 0.5 %.
- d counts days from the player's start on the local table, and from the calendar epoch on the online all-time board (ruling 16).
- Each T_i0 is the twice-a-day sketch's position at the rival's planned pass day ÷ (1 + g × day). The content script recomputes them from the prototype's curve.

| Rival (pass day) | T_i0 | Rival (pass day) | T_i0 |
|---|---|---|---|
| Tinwhistle Scrap (min 5) | 0.15 t | Cindral Ferrous (day 6) | 24 kt |
| Copperstile Metals (min 15) | 1.5 t | Duskwater Metals (day 7) | 41 kt |
| Ashbarrow Reclaim (min 30) | 5 t | Vossbury Resource Recovery (day 9) | 100 kt |
| Wrenmoor Metals (min 55) | 15 t | Gullreach Metals (day 11) | 215 kt |
| Kelderby Recycling (day 0.5) | 90 t | Ondine Metallurgy (day 13) | 375 kt |
| Saltgrove Ferrous (day 1) | 210 t | Crayle International (day 15) | 605 kt |
| Brindlecote Metals (day 1.5) | 420 t | Hemmerstead Resources (day 17) | 930 kt |
| Ironvale Reclaim (day 2.2) | 800 t | Teodric Metals (day 19) | 1.33 Mt |
| Lowmarsh Non-Ferrous (day 3) | 2.5 kt | Marenko Global (day 21) | 1.80 Mt |
| Thornquay Metals (day 4) | 6.0 kt | Halvard Steel & Alloys (day 23) | 2.34 Mt |
| Tallowmere Metals (day 5) | 12 kt | Sunmere Metals Holding (day 25) | 2.98 Mt |
| | | Corvane Industries (day 27) | 3.68 Mt |
| | | Estmark Metals (day 29) | 4.43 Mt |
| | | **Orrin Global Metals** (day 31) | **6.0 Mt** (at most 7.2 Mt) |

- The chip starts at "26th of 26 · next Tinwhistle 0.15 t".
- Up to five followed real players (7.3) appear as extra pinned rows. **Real rows never gate a rung.**
- Sketch results:
  - twice a day: a rival passed at every sitting or every second sitting in week one, and every 2.0 to 2.5 days after (largest gap 2.5 days);
  - three hours a day: largest gap 2.0 days;
  - 45 minutes a day: largest gap 2.3 days.
- Rivals' scheduled moves are optional (second in the cut order).

### 6.3 Capacity, its price and the closed form

- **Rated capacity R** (t/h) is a pure function of assets: the sum over sites of each site's bottleneck throughput with full feed. Feed sources (skip routes, take-back agreements, deal allocations) are stations like any other.
- **The payback rule, the money sink**: every station, machine level, crew level and hall that raises R by ΔR is priced at τ_r hours of the income that ΔR earns at p̄.
  - τ: rungs 1 to 2, 2 h; rung 3, 9 h; rung 4, 22 h; rung 5, 45 h; rung 6, 110 h; rung 7, 230 h; rung 8 and later, 420 h (tune ± 30 %).
  - A player who spends all income grows R at 1/τ_r per production hour. Money from selling well, the hand and deals therefore turns into tonnes. Cash never piles up while anything is still to buy.
  - Purchases come in small steps (+5 % to +25 % of R), so the next one is at most two sittings away.
- **The rung ceiling** (ruling 15) is a guard, about 1.3 × what an always-on player at full spending reaches at the rung's exit: 6, 20, 160, 800, 3,500, 14,000, 28,000 and 40,000 t/h for rungs 1 to 8 and later (tune ± 30 %). The shop never sells a step above it.
  - Stage 1's shop tops out near 40 t/h by content.
  - At the guard values, a year at 40,000 t/h is 3.5 × 10^14 g, and every amount stays inside a double.
- The server's bound, the bracket bands and the largest numbers are therefore computable.

### 6.4 After the top

- **The finishing ceremony**: the crane hangs the title over the gate, the crews line up, and a ticket prints the whole run.
- **Completion goals exist from day 1 and stay open after rung 9**: the Trade Book (every object and grade met), every process node at level 10, every corporation's certificate.
- The weekly bracket and the company order (7) are the standing loop.
- On the local stand-in, simulated players stand above the player on the all-time board, labelled simulated.
- The store text says so without numbers.

---

## 7. Other players (stage 5)

### 7.1 Words (ruling 2)

- A **company** is what a player founds or joins, at most 30 members, and it is the company that is listed.
- The player's own operation is "your yard", and "your business" once it has more than one site. It has a trading name composed from our lists.
- A founder who never invites anyone has a company of one.
- The word "group" is not used for it.

### 7.2 The company

- Founding and joining open at rung 4.
  - The name is composed from three lists (about 40 × 40 × 8, curated against bad pairs and the other games' names). The emblem comes from 8 shapes × 12 glyphs × 10 colour pairs. Nothing is typed.
  - Founding and joining are rate-limited per uid and per IP in the functions.
- Roles: a leader, up to three co-leaders and members. A company is open, by request or closed; leaders and co-leaders remove members.
- **Leadership passes** after 14 days without a logged rules action (a cut, sale, build or booking; opening the app does not count). It goes to the most active co-leader, else to the longest-standing active member. With none, the company is dormant and joinable.
- **Talk**: 24 fixed phrases and 8 emotes ("Good week.", "I can cover copper.", "Back tonight."). Invitations can be declined and switched off.
- **The weekly company order** (ruling 12):
  - It is one invented corporation's order, sized at the week's start to 25 h × Σ R of members with at least 7 days of accepted play. It is split into **lines by grade** over the families the members can supply, so a member with a rare line is wanted.
  - A member **claims a line** with one tap. The phrase "I can cover copper." is that claim, shown beside the line with the member's emblem.
  - The member then routes lots to the line from a bay's card ("Send 2 t to the company order at §p"), priced by the order like a deal: a normal delivery.
  - Tiers at 50, 80, 100 and 125 %. Simulated firms claim lines too.
  - Rewards go only to contributors (at least 1 % of the order or 5 h of their own capacity) and are cosmetic: a pennant on the company flag in each contributor's yard, and standing that unlocks emblem parts.
- **The company row and tours** show the order's progress by line and the company's valuation rank among listed companies.
- Not in version 1: a shared company ship, rival firms' divestments, any takeover.

### 7.3 Boards and tours

**Weekly brackets** of 30:
- **Placement** is at the week's start (Monday 00:00 UTC). The band is floor(log2 D) of the daily capacity D = R × min(24, 2 × Cap + 2 h), where R and Cap are derived by the server from accepted assets, bought ones included. A newcomers' bracket covers a player's first seven days.
- **Score**: tonnes supplied that week. Each submission's tonnes are split across the Monday boundary in proportion to server time.
- **Daily credit ceiling**: each market day credits at most min(the player's current D, the band's upper edge). By construction an always-on player is credited at most 1.21 × a twice-a-day player at equal capacity (rung 1; 1.0 from rung 6). This is the **fairness gate**: at most 1.25 ×.
  - A player who saves cash and buys on Monday at 00:01 gains at most the top of their own band.
  - The private ladder keeps every tonne.
- **Pennants** go to the top three, and for best growth (this week ÷ last week) only if last week was at least R × 20 h. They are cosmetic only.

**All-time boards**:
- lifetime tonnes, anchored on the calendar so everyone sees the same rows, split into **cohorts by start month**, beside "days from start to each rung";
- the rival rows of 6.2;
- companies by valuation once listed. Company boards count only members with at least 7 days of accepted play and at least 1 % of the company's tonnes, ranked by the sum and by the top-10 median.
- No trailing-week position anywhere.

**Tours** are read-only: a diorama of their main yard from its slot summary, their sign, range chips, their sites' key tags, pennants, emblem, this week and best week.
- The only actions: **follow** (pin up to five on your table; invisible to the one followed), **invite** (if you lead), **report**, **block**.
- Invitations are off by default for the 13 to 17 age band where the band is known, and can be switched on.
- No likes, views or counts.

### 7.4 The listing (ruling 12)

- A company may list when its members' combined accepted lifetime tonnes reach 2 Mt, with at least 12 materials counted at rung 7's θ, and seven daily results exist. A company of one reaches this at about rung 7.
- The leader rings the bell at the **Calvany Share Market**. Every member's yard shows the crew lined up and confetti of offcuts.
- **Published formula**, recomputed weekly from accepted results: **Valuation (simulated, published formula)** V = 26 × W × (1 + 0.02 × (range − 13)), half a year's supply. W is the last complete week's supply value at mean prices (Σ accepted mass × p̄).
- The formula uses mean prices, so it is immune to market timing and checkable on the server.
- V is held in whole calvans and asserted under 2^53 in the tests; a 30-member company at the guard caps reaches about 10^13.
- No per-share price and no share count are shown. A fixed line sits on the listing card and in Help: "No shares can be bought, sold or owned by players. No money is paid out." There are no dividends and no cash.

### 7.5 One interface, two implementations

`OnlineService`: `acceptTerms(version)`, `me()`, `board(kind, period)`, `tour(id)`, `follow(id)`, `unfollow(id)`, `myCompany()`, `companies(filter)`, `found(nameParts, emblem)`, `join(id)`, `leave()`, `invite(id)`, `respond(inviteId, yes)`, `setInvites(on)`, `setRole(id, role)`, `remove(id)`, `say(phraseId)`, `claimLine(lineId)`, `submit(snapshot)`, `report(target, reason)`, `block(id)`, `unblock(id)`, `deleteMe()`.

**LocalOnline** is the default, and whenever there is no network or account.
- About 200 simulated players and companies, each a seed and a temperament; weekly tonnes are a pure function of (seed, week, t).
- Every row is labelled "Rival yards (simulated)", with no promise of a future feature.
- Simulated firms take the player in and join the player's company, whose order runs on the server's code with the same cap of 30.

**FirebaseOnline** (Firebase JS SDK; yard-tech.md D).
- It is switched on only in a binary submitted for review with the review notes, test account and seeded server. It is never switched on by an over-the-air update or a remote flag; `validate:release` checks this.
- Data:
  - anonymous sign-in;
  - `players/{uid}`, owner-only (accepted assets and tonnes);
  - `publicPlayers/{uid}`, written by functions only (handle parts, emblem, rung, lifetime and week tonnes, range, band, company, a site summary under 2 KB, pennants);
  - `companies/{cid}` with `members/{uid}`;
  - one document per bracket and per all-time board, rebuilt every 10 minutes;
  - `reports/{id}`, create-only.
- Functions: `submitProgress`, `foundCompany`, `joinCompany` (a transaction: members + 1 ≤ 30), `leaveCompany`, `setRole`, `removeMember`, `invite`, `respond`, `claimLine`, `report`, `deleteMe`, `rebuildBoards`, `weeklyClose`.
- **The rules on the server**: `server/` bundles a copy of `src/engine/salvage` made at deploy by its own build script, outside the `modes.js` check, with a content hash. Every submission carries its content hash, and assets are valued with the content they were bought under, so a tuning change never revalues old assets.

**The server checks.** It re-runs the pure rules and assumes a hostile client. The client submits tonnes per grade.
- Per interval, the bound is

  ΔT ≤ R_prev × Δt + 0.25 × R_prev × (foreman time due, at most 45 min per market day) + H × min(Δt, 3 h) + lot mass due by the calendar + arrivals booked before the last accept.

  - R_prev is the capacity accepted at the previous submit, never the newly claimed one.
  - H is a constant hand rate per best tool and carry tier, a content table set at 1.2 × the measured fast-hand bot.
- Excess is kept as **pending**. It is accepted later as slack allows, with at most 24 h of slack banked. The local chip shows accepted tonnes and marks any excess "not yet verified".
- Earnings are derived on the server as at most Σ tonnes per grade × the highest posted price in the interval. Claimed assets must cost no more than accepted earnings.
- Range grows only by materials whose line exists, and the rung is recomputed.
- **First submit**: accepted up to the always-on curve of 6.1, measured from max(the save's start, the stage-5 release − 60 days). The rest is pending.
- A hostile client therefore gains at most what an always-on honest player with the same assets could.
- Only functions write ranked fields. Writes are rate-capped per uid. Purchases and ad rewards never touch a ranked field.
- Tests: the honest fast-hand bot at rungs 1, 3 and 8 is accepted in full; a 3-hour-submit inflater and a 1.1 × inflater are clamped; a legacy save is checked on its first submit.

### 7.6 Accounts, deletion and the policy duties

- Handles are generated (adjective, noun, place: "Steady Anvil of Quillon"). Nothing a player types is ever shown to another.
- Terms are accepted before a handle is first shown, before founding and before joining.
- **Report** sits on every handle, emblem, company row and tour. A reported name falls back to "Company #48213" until it is reviewed.
- **Blocking** hides the other player's handle and stops their invitations and joins.
- The under-13 age band gets the local mode only.
- **Deletion** is in the app and on a public web page. It states how long it takes, removes handle, scores and company data, and passes a company to its longest-standing member or dissolves it.

### 7.7 What the owner must create and decide (before stage 5 goes online), and the ratings

**Create:**
- a Firebase project with a web app, anonymous sign-in, Firestore, the Blaze plan with a budget alert, a restricted API key, and deployed rules and functions;
- a privacy policy (yard-policy.md 4), terms with zero tolerance, a support URL and email, the deletion web page and a data processing agreement;
- the UK Online Safety Act assessments and a moderator acting within 24 hours;
- review notes with a test account and a seeded live server;
- the privacy label and the Data safety form;
- trademark and company-register searches.

**Decide:** money list A or B; `firebase` 13.1.0 as a direct dependency limited to this mode; the product prices.

| Rating | Expected | Answers that keep it |
|---|---|---|
| Apple | 13+ (A12 in Brazil because of advertising) | Contests frequent; Simulated Gambling none; Loot Boxes none (skip labels, 5.3); UGC yes, conservatively (composed names); Messaging none (fixed phrases); Social Media none (no feed, no likes) |
| IARC | PEGI 3, or 7 if pennants and the order count as return rewards; ESRB E | notices "In-Game Purchases" and "Users Interact" |
| Google | target audience 13+, never Families | — |

**Forbidden, because each would raise the rating**: typed names (they would need the full filter kit), any cash-out (gambling, 18+), timed or limited offers (PEGI 12), free chat (PEGI 18 without block and report), random paid items.

---

## 8. Money (ruling 13)

Nothing in stages 1 to 4 depends on the choice. Ads and purchases are stubs in stage 1 and go live from stage 2.

| Product (kind, suggested price) | List A (fair first) | List B (house style) |
|---|---|---|
| No ad videos: every ad reward at once, same daily limits (skipAds, $4.99) | yes | yes |
| Yard livery: six paint schemes; looks only (cosmetic, $2.99) | yes | yes |
| Company emblem set: twelve more shapes and glyphs (cosmetic, $1.99) | yes | yes |
| Founder's plaque at the gate, seen on tours (cosmetic, $2.99) | yes | yes |
| Early cover: the 12 h away cap that play earns at rung 6, now (unlock, $3.99) | — | yes |
| Second crew slot early: the slot the next rung opens, now (unlock, $2.99) | — | yes |
| Express builds: halved build times, as the crane yard gives at rung 5 (unlock, $4.99) | — | yes |

**In neither list**: anything random, anything limited in time or quantity, away hours beyond what play earns, a consumable that adds tonnes or score, currency packs. Kinds: A is {skipAds, cosmetic × 3}; B adds unlock × 3. Both differ from the four games' multisets.

**Store wording**, the same truth in every product's one line:
- List A: "Purchases remove ads or change how your yard looks. They never add tonnes."
- List B adds: "Some purchases bring forward what play unlocks later, which can speed up your climb on the all-time table. The weekly boards are banded by capacity, so purchases do not help there. Nothing sold adds tonnes directly."

**Rewarded ads** are opened only from a labelled button; there are no interstitials and no banners.
- **Away bonus**: +50 % of the away cash up to 20 min of I, with the exact sum on the button, on an away card of at least 30 min, at most twice a day.
- **Spot buyer**: +10 % on the next lot of one grade, up to 10 min of I, with the amount shown, at most three a day.
- Total ad calvans per market day are at most 4 % of a day's rated income (tune 2 to 6).
- Calvans only: never tonnes, time or build speed, and never counted on a board. The count left today is shown.

**What must be true for either list** (aims, sketch values in brackets):
- brackets band by server-derived D, which in B includes the bought cap and slot;
- an ad-watching bot's lifetime tonnes at day 14 are at most 1.15 × a non-watcher's;
- in B, the sketch's Early-cover buyer has 1.76 × a non-buyer's lifetime tonnes at day 14 and 1.24 × at day 30, which misses the earlier 1.15 aim. The owner decides knowing this (13);
- the weekly bracket stays the money-proof board.

---

## 9. The stages (ruling 15)

Each stage is a playable game on the owner's phone. Wish numbers are BRIEF's. Lines are against yard-tech.md F's 55 to 70 thousand (rules + tests / UI / art / bot and script).

| Stage | Contains | Wishes | At its end the player can | Lines |
|---|---|---|---|---|
| **1 The first yard** (concept test) | crane loading screen ending in a poured bar; landscape shell; Kettle Lane Yard and the lane with Hob's and Ruddock's sites; stick, cut, carry, weigh in, bays and the flatbed's round; tools 1 to 3; carry tiers 1 to 3; hand and powered strippers, motor bench, small crucible; yard hand, cutter, driver; posted board with history, the day word and Hold; the Quillon Foundry series; the industry table and chip; time away (4 h; Night watch 6 h); local save; `?yardStress=1`; ads and purchases as stubs; the content script and bots at three hands | 1, 2, 8; part of 3, 4, 6, 7, 11 | play the hour to rung 3, then follow a goal list for days 1 to 3 (crew and machine levels, the foundry series, rivals up to Ironvale at 800 t) to a fenced back field with a "next build" board | 13 to 16 k (4 + 3 / 5 / 2 / 2) |
| **2 The works** | back field; the stage-2 machines and vehicles of 3.2 and 5.1; the bridge, Larkin's and Pell Street; the analyser and the boss's crate; stainless, lead ingot, bronze; delivered lots; commissioning; more crew roles; build timers; the process board; the Trade Book; purchases and ads live; rungs 4 and 5 | 3, 7 (pyro) | run a processing yard with three melt lines and shredder tonnage | 9 to 11 k (3 + 2 / 3 / 2 / 0.5) |
| **3 The market** | all of 5.2; prepaid warehouses; Durnav, Ostro, Veyra, Vantorra with supply, take-back, offtake, tolling; trust; siding, road, rail, booking cards, the clip rail, the dispatch clerk; assay lab and brand audit | 4, 5 (road, rail), 6 | choose where, when and in what form to sell; ship by road and rail | 9 to 11 k (3.5 + 2 / 3.5 / 1 / 0.5) |
| **4 Territories** | the key board; Saltreach, Ambrel Coast and Kaymor Point with their lanes, hand stations and lines; vessel and plane; export consent; Veyra's pack take-back; rungs 6 and 7 | 3, 5 (vessel, plane), 7 (hydro), 9 | run four sites and ship between continents | 13 to 15 k (4 + 2 / 3 / 4 / 0.5) |
| **5 Other players** | `OnlineService` both ways; `server/`; brackets, all-time cohorts, tours, follow; companies of 30, claimed lines and the weekly order; the listing; terms, report, block, deletion | 10, 11, 12 | everything other players offer, simulated offline and real with the owner's keys | 8 to 10 k (3 + 2.5 / 3 / 0.5 / 0.5) |
| **6 The top** | Varn Ridge; carbide plant; PGM refinery; iridium; Aldane, Brannick, Quenwick, Meridane; rungs 8 and 9; after the top; the store package (text, landscape screenshots, icon, review notes) | 3, 4, 8 complete | reach the top of the industry | 7 to 9 k |

- The sum is 59 to 72 thousand, at the top of the research's estimate.
- **Cut order** (ruling 15): the simulated social layer's extras, then rivals' moves, then the buy-ratio lever. Inside stage 1, the foundry series and the sack truck may slip without failing the hour.

**The first yard's beats** follow ruling 5's order. The first-yard document owns every stage-1 number: prices, speeds, purchase minutes, opening stock. The ground-work values that change go to their owners: the truck's speed and the work delay to the world engineer, the save key `salvage1` to the rules engineers.
- The copper jump comes from the inherited hand stripper and the opening cable bundle, with no purchase needed.
- The crucible pad stands in view from the first minute with its price and a cooled sample ingot.

**Planned spend against income** (proto; the prototype must reproduce it, and cumulative income must stay at or above cumulative spend at every minute of the first 15):

| By | Event or purchase | Cumulative income | Cumulative spend |
|---|---|---|---|
| 0:25 | first ticket (light iron, a whole motor) | §33 | 0 |
| 1:30 | bare bright from the offcut bundle: 8.4 kg × §35.50 | §330 | 0 |
| 2:00 | gloves §60 | §380 | 60 |
| 4:30 | yard hand §300 | §800 | 360 |
| 7:00 | grinder §300 | §1,150 | 660 |
| 9:30 | hook-lift truck §500 (Hob's skips) | §1,500 | 1,160 |
| 11 | sack truck §400 | §1,900 | 1,560 |
| 14 | motor bench §800 | §2,800 | 2,360 |

Later in the hour:
- cutter §1,200 (15: "the yard now earns while you are away");
- powered stripper §600 (17);
- crucible §1,500 (20);
- driver §2,000 (25);
- torch §2,500 (30: the old car; Ruddock opens);
- Night watch §3,000 (40);
- then levels priced by the payback rule.

---

## 10. The screens in landscape

The world is full-bleed. Insets are read on all four sides, and both landscape directions work. A window taller than it is wide shows the ground work's "Turn your phone sideways" card.

| Row (pt) | 844 × 390 (47 left and right, 21 bottom) | 667 × 375 (no insets, 16 margins) |
|---|---|---|
| Top bar | 36 | 34 |
| Goal card (one line; tap for three) | 28 | 26 |
| Free world | 237 | 239 |
| Bottom: the stick zone left; the one button (60) right, the ad button (40 high) beside it to its left while it applies | 89 (8 + 60 + 21) | 76 (60 + 16) |
| **Total** | **390** | **375** |

| Top bar, left to right | 844 (safe width 750) | 667 (635 inside margins) |
|---|---|---|
| Cash (15 pt bold, rolling, abbreviation rule) | 136 | 116 |
| Ladder chip ("19th of 26 · next Hemmerstead 1.8 Mt"; tap: the industry table) | 408 | 340 |
| Carry readout ("52/60 kg", the truck's "0.8/1 t") | 90 | 90 |
| Clipboard button | 44 | 44 |
| Gaps | 3 × 24 = 72 | 3 × 15 = 45 |
| **Total** | **750** | **635** |

- Nothing from the market sits in the top bar.
- Bar text is sized from fontScale with `allowFontScaling={false}`. At 667 × 375 at most four HUD lines show.
- At the ground work's 40 pt per metre, the worker stands 46 pt tall and the world shows about 21 × 9 m at 844.

**Where each system lives** (a place in the world, opened with Open there, or from the clipboard once visited):
- the tool rack: tools, carry;
- the office (a portacabin, then brick): the rota, Night watch, the partner wall and deals, the **process board**; from stage 3 the dealing desk; from stage 4 the key board;
- the scale house: the posted board, then the dealer and exchange boards, ticket history, Hold and sell notes;
- a machine's pad: buy, level, recipe, refine-or-sell;
- the gate notice board: the industry table; from stage 5 boards, tours, follows;
- the flagpole: the company;
- the siding, the quay and the airside shed: booking cards and the clip rail;
- the plant halls: a control panel per line;
- the bell: the listing card.

**The process board** is the progression screen. The unit processes are enamel plates joined as a tree, the bought ones lit, each plate's machine card one tap away. In stage 1 the stripper, motor bench and crucible form its first branch.

**Overlays** are the mode's own absolute views registered with `useOverlay` (never the kit Sheet or a `Modal`). One shows at a time, closed by the scrim or Android back.
- **The right panel**: min(520, 0.58 W) at 844, 0.62 W at 667, full height under the top bar; rows 44 pt, text 12 to 13 pt, never under 11. The place stays visible and dimmed at the left.
- **The wide card** for the dealing desk: both exchanges side by side at 844, tabs at 667.
- **The centred card** (520 × 300 at most) for the away ticket roll and the rung sign.

Cards: purchase (exact price, one Buy), sale and booking (price, mass, total, step, departure, arrival), refine-or-sell, deal, company line, tour.

---

## 11. Art and sound

**Look.**
- Flat vector in three-quarter oblique view, drawn in code and baked into atlases while the crane screen runs. No image generator and no downloaded art.
- At most three atlas draws, 40 actors and 300 sprites a frame; 60 fps while anything moves fast, 30 otherwise.
- Daylight, clean and well run: a yard someone is proud of.

**Palette `hi-vis-and-rust`** (unlike warm-cream, deep-space-cold, lantern-night and baize-and-ink): sky #EAF1F4, concrete #C9C4B8, galvanised #9AA5AE, asphalt #4B4F54, hi-vis yellow #F4C20D, rust #9A4B2B, ink #2B2E33.
- Orange is kept for heat: furnace glow #FF8A2A, with ingots cooling from it to their metal colour in 3 s. The yard therefore never reads as Lantern Row's dusk.
- Each material has a colour and a pictogram readable at 10 pt: copper #C8743A coil, brass #D4AF37 tap, lithium #3A6EA5 cell with a yellow border, iridium #A9B6C9 crucible.

**People, vehicles, machines, logos.**
- The worker wears a hi-vis vest, hard hat, gloves and boots, a face shield when cutting, and a face shield and aluminised apron at every pour. Four directions with mirroring, six walk frames, four per tool.
- Crews wear the same gear in their role's vest colour. Nobody is hurt or shown unsafe.
- Vehicles in eight headings, loaded and empty: hook-lift truck, forklift, magnet crane, shear, wagons, vessel, plane, armoured van. Never a crusher on wheels or a tow truck.
- Machines in three or four working frames plus "bay full".
- Logos: two colours, simple shapes, each checked against known brands' shape-and-colour pairs:
  - Vantorra, a teal stacked-square glyph;
  - Veyra, a coral open ring with a notch;
  - Aldane, a swept navy triangle;
  - Brannick, a notched orange hexagon;
  - Quenwick, a split indigo droplet;
  - Orrin, a slate square cut by one arc.
- The check list forbids chevrons for vehicle makers, four-point sparkles, and striped or ringed globes. Smaller rivals' plates come from a generated kit distinct from company emblems.

**The loading animation**: about 3.5 s on first launch; a tap skips it from the second launch.

| Time | What happens |
|---|---|
| 0.0 s | Pale sky; a crawler crane's jib swings in with an electromagnet. |
| 0.4 to 2.2 s | Three steel plates, one per word ("Scrap", "to", "Ingot"; two for "Heavy Melt"), are lowered and clank into place, 0.6 s each with a 2 pt shake. The weighbridge display under them counts kilograms as loading progresses. |
| 2.2 to 2.9 s | A small crucible under its hood tips and pours a glowing bar beneath the title. |
| 2.9 to 3.5 s | The bar cools from orange to brass over 0.8 s, faster than the game's 3 s and drawn as such; the display reads the final weight; the gate opens into the yard. |
| while atlases still bake | The frame holds a calm loop (the magnet swaying, the display ticking), never a freeze. |

**Icon and store set** (ruling 14).
- The icon leads with copper and the pour; never a lone gold bar or a truck.
- Candidates for the 60 px judgement beside the four games' icons, before anything is built on one:
  - (a) a gloved hand holding a bright coil of stripped copper against a ticket stripe;
  - (b) a crucible pouring into a mould, a copper coil behind;
  - (c) a magnet lifting a copper coil over a rust ground.
- The screenshot template is the house's first landscape set: the game full-bleed, with the caption on a short horizontal ticket stub torn at the lower left, in a proportional typeface, at most five words. It is judged at search-tile size beside the four sets before it is coded.
- The first shot shows the stripped copper, the ticket and the pour in one real frame. The first-yard document places the stripper, the weighbridge and the crucible pad within one 21 m frame, with the bays and the dated board in view.

**Voice `weighbridge-plain`.**
- Short plain sentences in the trade's words (weights, grades, prices), with the foreman's dry warmth. No puns and no exclamation marks.
- No green claims: "eco", "green" and "save the planet" appear nowhere (game, store, ads, loading).
- Words used: market, price board, deal, valuation, consignment, dispatch.
- Never used: bet, stake, odds, invest, tips, returns, jackpot, win, prizes, ticker, share price, order book, "order" for sell notes, shift, freight, cargo.

**Sound.** A new pack in `games/scrap-yard/assets/sfx` (`soundPack: null`), with new recipes:
- a drop per material: steel a low clunk, aluminium a hollow tonk, copper a warm dink, brass a bright ring;
- the grinder's whine and the torch's roar;
- the weighbridge's rising beeps, the printer and the stamp;
- the stripper's zip;
- the furnace's roar, the pour's glug, cooling ticks;
- the magnet's hum, reverse beepers and a ship's horn.

Haptics mark each lot sold and each finished piece. Music is "yard radio": an original 92 bpm loop of mellow electric guitar and bass over a percussion bed made of the game's own metal hits. It plays slower in plant halls and shares no melody with the other games.

---

## 12. Promises, tests and aims

### 12.1 Hard promises (gates from the first run)

1. **Shown equals applied**: every sale, deal, booking, label and purchase applies exactly what its card showed. A changed price step asks again. One rounding function.
2. **Where money comes from**, a closed and tested list: lot collections and sales, deal deliveries, exchange sales, consignment sales, tolling and take-back fees, ad rewards, and the away pass of the same. It goes only to purchases and levels, feed (skips, payables), reagents, carriage and insurance, prepaid storage, the exchange fee and the Kaymor duty.
3. **Nothing lost, nothing taken**: no cost by the clock; full buffers stop their feeders; built things never vanish; no rank falls while away. Nothing bought has contents unknown at purchase.
4. **No dead end**: with §0 and empty bays the gate tip pays within 60 s. Every amount asked for is reachable and is never met by doing nothing. A purchase that changes nothing is refused with its reason.
5. **The clock**: live time is monotonic, and the market clock never runs backwards. A jump never pays twice. Looking ahead on one device gains nothing; anywhere, it gains at most the foresight bound, on money only, never on rank. The away pass equals a 10 Hz replay within 0.5 % on frozen content.

### 12.2 Tests (vitest, frozen test content)

- mass conservation with reagents for every object and machine, and contained metal for hydro machines;
- ranked tonnes capped at input mass;
- cut times; pickup order; the priority split;
- Hold, reservation for deals, the flatbed's round;
- the away pass against the replay across price steps, batches and cash-gated skips;
- `sell(lotId, n)` at step boundaries; prices agreeing across two clocks; clock-back live play;
- shortfalls charging nothing;
- the range gate per rung; rival rows; the payback rule and the ceilings;
- a skip-to-plate bot gains zero tonnes; no converter without a source id; skip labels equal the weigh-in;
- the server bound (the cases in 7.5); the weekly split and the credit ceiling;
- the 30-member cap under parallel joins;
- deletion of every public document;
- content-hash valuation;
- V under 2^53.

### 12.3 Measured aims (bands set by the lead from the measured table, then guards)

| Aim | Measured by |
|---|---|
| First ticket ≤ 25 s; copper jump ≤ 1:30; first helper ≤ 5 min (slow ≤ 9); truck by 8 to 10 min; first pour 18 to 25; rung 3 at 55 to 65 (slow ≤ 90); cumulative income ≥ cumulative spend at every minute of the first 15; at most one purchase prompt a minute; the next purchase never more than 3 min away in hour 1 | prototype, then bots at three hands |
| The hand's worth and its three-fifths limit (3.4); hand work per sitting ≤ 3 min | bots, at rungs 3, 6, 8 |
| Rung days (6.1); rival gaps ≤ 3 days after week one; the next capacity purchase ≤ 2 sittings away at every rung for twice a day; cash on hand ≤ 2 τ_r of income except while saving for a site | prototype, bots |
| A steel-max bot stalls at rung 4 or 5; a skip-only bot supplies zero | bots |
| Market: pattern reader +3 to 7 %, nothing above +8 %, foresight ≤ +25 %, clock peeks ≤ 0 on one device; the gap open 2 to 4 times a week per metal; stage-1 Hold (threshold bot on the day word) ≤ +3 %; the pattern reader reaches rung 7 ≥ 0.5 day sooner | market bot |
| Transport: the gates of 5.4 | stage-4 bot, people-like players |
| Fairness: credited always-on ≤ 1.25 × twice-a-day (the always-on bot: app open 16 h, the hand used throughout); ad watcher ≤ 1.15 × at day 14; a B buyer's weekly rank distribution matches a non-buyer's within the band | bots |
| Company order at 100 % for 60 to 75 % of simulated active companies | local stand-in |
| A stage-1 tick under 1 ms; 12 h away on five sites under 50 ms; `?yardStress=1` read on the iPhone | the owner's phone |

### 12.4 Who measures, in what order

1. A numbers prototype (scratchpad `proto/`) runs sections 3 to 6 first. It reports every (proto) number with the smallest failing example, starting from `ladder3.py`.
2. Then the rules on frozen content, the bots, and the screens.
3. **Three people-like players play stage 1 on a phone before any tuning**, reading what it deals in the order it deals it.

**Bots play at a person's pace:**

| Hand | Reacts in | Wasted path | Rate | Other |
|---|---|---|---|---|
| Normal | 0.8 s | 25 % | 1.0 × | looks 6 to 15 s at a card before buying; spends 85 % of income on capacity |
| Fast | 0.4 s | 10 % | 1.3 × | — |
| Slow | 1.2 s | 40 % | 0.7 × | leaves goals unfinished |

Habits:
- twice a day: two 8-minute sittings, after a first day of an hour;
- 45 minutes a day: three sittings;
- three hours a day: three of an hour;
- always on.

Pacing is chaotic (market-design.md M30): an aim is met when 13 of 15 seeds meet it, checked on 5 unseen seeds.

---

## 13. Risks and open questions

1. **The economy is now an exponential under the payback rule.** It is sensitive by nature: the sketch moves rung 9 by 5 days between 85 % and 100 % spending. τ_r is the main tuning lever; the ceilings only guard.
2. **The hand's worth** is still the least certain number. If it fails, raise the lots and the crate before cutting crew rates: what is earned away must never fall.
3. **List B's Early cover** gives a buyer 1.76 × a non-buyer's lifetime tonnes at day 14 in the sketch. The weekly board is protected by bands and the credit ceiling; the all-time board is not.
4. **Fingerprint**: the weighbridge must read as lots collected by a merchant, not a sell pad, so the bays, the flatbed and Hold belong in the first screenshots. The stage-4 places are checked against Orbit's network routes.
5. **Crowded theme** (Junkyard Keeper, Salvage Empire, Stone Miner): the store leads with copper, ticket and pour; a skip truck, never a tow truck or crusher; no auctions; buying, never seizing.
6. **Phone-only failures** (landscape `Modal`s, the stick at the edges, worklet crashes, atlas memory at 3×): every overlay and `?yardStress=1` are checked on the iPhone in stage 1.
7. **Names** wait for the register; "Kettle Lane" and "Quillon" are flagged. **Online**: composed names can still combine badly (curated lists, report, block). Nothing goes online before 7.7 is done.
8. **Scope** is 59 to 72 thousand lines, each stage cut to its list.

---

## 14. Lead decisions

(Empty: the lead writes this section.)
