# Scrapyard: specification of the whole game

Status: revision 2, 25 November 2026 (`spec-master`, after the builder, store and trade reviews): the "hand" design with the judges' grafts, under the lead's ruling (`RULING.md`). **Section 14 (the lead's decisions) overrides the body wherever they differ.** The first yard's own document **owns every stage-1 number**; stage-1 figures here are its inputs. Game folder `games/scrap-yard`; mode `salvage`; landscape; save key `save:scrap-yard:salvage1` (replaces the ground work's `salvage0`).

Conventions:
- "§" is the calvan, the one currency; "m" a metre of the ground plane; "pace" a person's hand (the normal bot, 12.4).
- **(tune)**: a starting number only the content script may move, inside its range, to meet section 12; a range is never widened silently. **(proto)**: the numbers prototype confirms it before rules are built on it. Rules tests run on frozen test content.
- The only home of numbers is `src/config/salvage.content.ts`, written into game.json by `scripts/content/build-yard.py` with the balance bot.
- Rules: pure TypeScript in `src/engine/salvage/`, 10 ticks a second, no `Date.now` or `Math.random`, mass in integer grams, money in integer hundredths of §, one rounding function `roundMoney`. Amounts from §100,000 show with three significant figures and k, M or bn.

---

## 1. The game and its fingerprint

### 1.1 The game in five sentences

1. You take over a run-down, licensed scrapyard on Kettle Lane and steer your worker with one thumb: stop beside a washing machine or a cable drum and it comes apart, piece by piece, onto the stack on your back.
2. The weighbridge prints a ticket by grade and net weight at the day's posted price (light iron at half a calvan a kilo, bare bright copper at seventy times that), each grade goes into its bay, and the merchant's flatbed collects every bay you have not held for a better day.
3. You hire a yard hand, a cutter and a driver who take over each step and keep the yard earning while you are away, and inside the first half hour a small crucible pours your first brass ingot.
4. The business grows around the hand: melt shops and leaching plants as real chains of unit processes, two invented metal exchanges, partners from the farm down the lane to invented corporations, consignments by road, rail, sea and air, yards in new regions.
5. One table is on screen from the first minute, the industry ranked by tonnes supplied with a range gate that makes "full metal" mean full, and you climb it past named rivals to the top, alone or in a company of up to 30 players whose valuation is listed.

### 1.2 Fingerprint along the 19 dimensions

Four new words join the closed vocabularies of `scripts/lib/fingerprint.ts` and `spam.md` section 4 (ruling 11):
- **core_verb `steer`**: one thumb moves an avatar or vehicle continuously through a world with a floating stick; work happens by stopping next to things; nothing is tapped, dragged onto or swiped at.
- **production_topology `separation-tree`**: one input object splits into graded outputs and by-products that go to different places, and machines split them further: the reverse of an assembly chain (Pizza), not a network of routes (Orbit).
- **main_screen_layout `three-quarter-world`**: a scrolling world several screens wide in three-quarter oblique view, followed by a camera, in landscape.
- **money_moment `graded-lot-sale`**: material is weighed in by grade into bays and leaves as lots of one grade, collected by a named merchant or dealer at a price posted once a market day; any bay may be held for a better day; no customer, departure, completed order or timer pays.

Existing words: progression `tech-tree` (unit processes unlock as a tree on the process board, 10), prestige `none`, character `humans` (shared with Pizza and Proudly Adequate, accepted by ruling 11).

| # | Dimension | Scrap to Ingot | Pizza Empire | Orbit Haulers | Lantern Row | Proudly Adequate |
|---|---|---|---|---|---|---|
| 1 | core_verb [M] | steer | tap-target | drag/route | place/arrange | swipe/aim |
| 2 | production_topology [M] | separation-tree | linear-chain-with-transport | network-routes | spatial-grid | parallel-generators |
| 3 | money_moment [M] | graded-lot-sale | customer-pays | sale-at-depot | contract-complete | auto-tick |
| 4 | main_screen_layout [M] | three-quarter-world | side-cross-section | top-down-map | grid-board | single-object-focus |
| 5 | art_asset_overlap [M] | 0 % (all drawn in code) | measured | | | |
| 6 | store_text_overlap [M] | < 10 % (no "salvage", "haul", "ore", "cargo", "fleet", "freight", "contracts", "shift") | measured | | | |
| 7 | icon_and_screenshot_template [M] | own (first landscape set, 11) | human check | | | |
| 8 | bundle_foreign_content [M] | none | bundle report | | | |
| 9 | progression | tech-tree | location-levels | sector-map | seasons | office-ladder |
| 10 | prestige | none | reset-for-currency | reset-for-currency | seasonal | new-location-carryover |
| 11 | events | {delivered-lot, posted-price-step, rung-sign, pattern-week, consignment-arrival, company-order-week} | Jaccard 0 with each | | | |
| 12 | meta | {crews, partners, price-board, exchanges, dispatch, territories, valuation, industry-table, companies, process-board} | Jaccard 0 with each (`contracts`, `chests` avoided) | | | |
| 13 | meta screens | places: rota, posted board, dealing desk, process board, clip rail, key board | human check | | | |
| 14 | art | flat-vector, `hi-vis-and-rust` | warm-cream | deep-space-cold | lantern-night | baize-and-ink |
| 15 | character | humans | **same** | differs | differs | **same** |
| 16 | audio | new pack, `soundPack: null` | measured | | | |
| 17 | voice | `weighbridge-plain` (11) | warm-playful | dry-radio-chatter | lantern-calm | deadpan-memo |
| 18 | keywords | scrapyard, scrap metal, smelter, foundry, ingot, copper, furnace, weighbridge, metal recycling | Jaccard < 0.3 | | | |
| 19 | release gap | ≥ 14 days after Proudly Adequate | log | | | |

Planned: 8 of 8 musts against each game; 18 of 19 against Pizza Empire and Proudly Adequate, 19 against the others; **nothing counts until measured**. **Kinships, written openly in REVIEW-NOTES**: rows 11 and 12 reach Jaccard 0 by their ids, while crews are the others' managers and ministers and the company order week is near Proudly Adequate's campaign week. A person must see: a delivered lot on a named partner's lorry with a business card, never a glowing object (Orbit's bonanza rock); the rung as a sign the crane hangs, no promotion words; the process board, not a title ladder or star map, as the progression screen. Dimension 17 is measured against Orbit (strings name grades, never bare metals) and Proudly Adequate (dry and plain sits near deadpan-memo); 2, 4 and 13 again on stage-4 screens.

**What stage 1 shows for each must word** (within ten minutes): *steer*: the stick walks the worker across a yard three screens wide; walking into the truck drives it out of the gate. *separation-tree*: the first washing machine splits into light-iron panels, a whole motor and a concrete counterweight (to the rubble skip, worth nothing); the stripper splits cable into copper and PVC, the crucible a charge into ingot and dross. *three-quarter-world*: the oblique yard, the camera leading, the lane beyond the gate. *graded-lot-sale*: ticket lines by grade, net mass and posted price; bays by grade, each showing Hold from the first lot; Tamberlow Metal Merchants' flatbed collecting every bay not held every 30 s (tune 20 to 60), "Lot sold to Tamberlow"; the board with its date, five days of history and a day word.

---

## 2. The world

Invented world, real trade (L2): two countries across an ocean stand for the owner's "London" and "Shanghai" without naming or imitating either.
- **Calvany** (the West): capital **Bellmarch** with the **Bellmarch Metal Exchange** and the **Calvany Share Market** (7.4); home district **Quillon Vale**, home yard **Kettle Lane Yard** outside **Quillon**; **Saltreach** (deep-water port, 220 km west), **Varn Ridge** (uplands 380 km north, aerospace and toolmaking).
- **The Sennath Union** (the East), 9,000 km by sea: port city **Kaymor** with the **Kaymor Metal Exchange**; **Ambrel Coast** (battery and electronics makers), **Kaymor Point** (refinery headland and airport).
- **The calvan (§)**, one currency, at about §3 to the US dollar in the trade's proportions (yard-metals.md 3); no number is presented as a real quote. Help says once: "Building costs and times are shortened so the business grows in days, not decades; metal prices keep their true proportions."
- **Lanes.** Kettle Lane runs past Hob's and Ruddock's to a weight-limited bridge that the second hook-lift tier (stage 2) crosses to Larkin's and Pell Street. Every later site has its own lane, the rarer material further out (5.5).
- **People.** The boss is unnamed; crew have first names and role vest colours; partners appear on business cards (Hob Garnett, Rosa Ruddock); rivals are firms, never people.

**Every invented name, to the names register** (ruling 14: searched in trademark and scrap-trade company registers, both stores and the four games' content before art or text is built on it; no near-miss of a real company, exchange, port or town):

| Kind | Names (first choices) |
|---|---|
| Title | **Scrap to Ingot**, subtitle "Scrapyard & Metal Tycoon"; fallback **Heavy Melt** |
| Places | Calvany, Bellmarch, Quillon Vale, Quillon, Kettle Lane, Saltreach, Varn Ridge, Sennath Union, Kaymor, Ambrel Coast, Kaymor Point |
| Markets | Bellmarch Metal Exchange, Kaymor Metal Exchange, Calvany Share Market (no abbreviation anywhere: screens, keywords, screenshots) |
| Currency | calvan, § |
| Local partners and buyer | Hob's Farm Clearance, Ruddock Demolition, Larkin's Garage, Pell Street Plumbing, Quillon Foundry Co-op; Tamberlow Metal Merchants (stage-1 buyer, not a rival) |
| Regional firms | Durnav Steel (an electric-arc mill), Ostro Cable Works |
| Corporations (logos drawn) | Vantorra Electronics, Veyra Motors, Aldane Aerospace, Brannick Tooling, Quenwick Electrolysers, Meridane Glass |
| Rival firms (25) | 6.2: invented compounds, not surnames |

Flagged: "Kettle" (a noun in Proudly Adequate); "Quillon" (replaces "Fennick", one letter from a real town). Orbit Haulers' names and the words "salvage" and "haul" never appear in player text.

---

## 3. The hand

### 3.1 Controls (one rule in every stage)

The ground work (`docs/design/yard-ground.md`) stays: one full-screen responder; the stick where the thumb lands in the left 45 % of the safe area below its top 28 %, knob travel 52 pt; a second finger ignored; motion, collision and camera on the UI thread; the rules get a presence sample at most ten times a second and decide.
- **Work needs no button.** Within 1.4 m of a workable thing, with the stick released for a short delay, the worker works it; a ring shows progress; moving stops it and keeps progress per piece. The ground work waits 2 s, this document suggests 0.25 s; the first-yard document sets it and measures that walking past never cuts.
- **The one button** (60 pt, lower right): **Step out** while driving, **Open** at a place, blank elsewhere. **Vehicles are entered by walking into them** (ruling 16).
- **Buying is a card, never a tile** (ruling 6): Open shows the place's card at the right, exact prices, one Buy; what was bought arrives in the world (a flatbed's crane sets a machine down; new vests walk out of the office).
- **Pickup** is automatic within 1.0 m while capacity allows, 0.15 s a piece, **highest § per kg first**; a painted drop circle takes the stack for the crew. **Feeding**: standing in a hopper zone feeds accepted pieces, highest § per kg first.
- **Weighing in**: cut or sorted pieces on the plate for 0.5 s are weighed by grade into their bays (5.2). **A loaded partner skip on the plate is a weigh-in** of what was bought (its ticket shows what was paid), then tipped: never a sale, never supplied tonnes. Only cut or sorted material and lots sell.

### 3.2 Cutting, carrying, vehicles

- **Cut time per piece** t = m × h / P, at least 0.6 s. Tool power P (kg/s, the boss): spanners 5 · grinder 12 · torch 30 (stage 1); plasma 60 · shear 250 (stage 2). Hardness h: aluminium 0.8 · light iron, copper, cable 1.0 · brass, bronze 1.2 · cast iron 1.5 · car body 2.0 · heavy steel 2.5. Pieces weigh 3 to 40 kg; a wreck too tough shows "Needs a cutting torch".
- **Carry tiers**: frame 40 kg → gloves 60 → sack truck 120 (stage 1) → pallet truck 300 → forklift 1.5 t (stage 2); walking 4.0 m/s; a piece heavier than the free capacity cannot be lifted (the cast-iron bath teaches the sack truck).
- **Vehicles**: the hook-lift truck (stage 1; swaps skips, never crushes or tows; speeds set by the first-yard document, the ground work's 9 m/s meanwhile); forklift, magnet-crane cab, shear (stage 2); a site truck at each later site. The boss drives 25 % faster than a hired driver.

### 3.3 Crews (rates, live and away)

A crew member works one station at 60 % of its tool rate, +12 % a level (10 levels, at most 95 %; payback-priced, 6.3). **Crew work is a rate, live and away, from one function** (ruling 16): a carrier's rate is load × speed ÷ trip length; the walk on screen is interpolated and decides nothing. **Shared stations split by strict priority by § per kg**, water-filled, each flow at or under its source rate, live and away alike. Stage 1: yard hand (60 kg a trip, 3 m/s), cutter (gate tip, then tipping floor), driver (the skip route). Later roles come with their machines, shown on the office **rota**.

### 3.4 What the hand is for at every size (ruling 7)

In stage 1 the hand is the main producer. From stage 2 its rewards scale with **I**, the rated income in § per minute (R of 6.3 × mean margin per tonne at p̄ ÷ 60), fixed when a reward is created so its card shows what is paid. Capacity is bought with money (6.3), so a hand that earns more also climbs faster.

| Mechanism (stage) | Rule | Reward |
|---|---|---|
| **Delivered lots** (2) | One every 3 h of market time (tune 2 to 4), on a named partner's lorry with a business card, **at the site where the boss is**; at most 4 wait; never expire; only the boss opens one (4 to 10 s of cutting). Its material belongs to a line the player has (a bronze ship's bell, an engine casing), else it is an intermediate sold by assay (tonnes, no range). Never a converter or a pressure vessel. | μ × I at p̄: μ = 15 min at rungs 2 to 3, 18 from rung 4 (tune 10 to 25): 8 lots a day ≈ a tenth of a day's income |
| **The boss's crate** (2) | Crews set aside f = 15 % (tune 10 to 20) of every site's incoming mass (oversize, mixed alloys); site trucks send it to the hand station where the boss is. It holds 12 h; **45 s of standing clears it at any scale** (each piece stands for a batch, size printed). Unworked set-aside leaves at the crews' price, so nothing is lost. | sold sorted at u = 1.6 × the mixed price (tune 1.4 to 1.8): f × (u − 1) ≈ 9 % of income |
| **Foreman** (1) | Crews and machines where the boss worked in the last 20 s run faster, at most 45 min a market day (a meter on the vest). | +25 % (tune 15 to 40), ≈ 0.8 % of a day |
| **Commissioning** (2) | A new machine starts when the boss stands at it 5 s, else after 20 min. | 20 min of its output |

**Aims at rungs 3, 6 and 8** (proto, the most doubtful in the game): over 24 h the 45-minutes-a-day habit (12.4) working the hand earns at least a fifth more than the same player managing from overlays (ruling 7) and reaches the next rung at least 10 % sooner; no mechanism gives more than three fifths of the gain. Planned: lots 10 %, crate 9 %, foreman and commissioning 2 %; the twice-a-day habit about the same. A sitting's hand work stays under 3 min across all sites (under 4 min for all rewards at rung 7).

---

## 4. Material and value

### 4.1 Units and grades

Grades are priced per kilogram, except silver, the platinum group, gold and iridium, per gram; a grade's unit never changes. Masses show in t from 10 t (ferrous from 1 t), else kg; precious in g below 1 kg; every amount carries its unit. A **grade** is what a lot is sold as ("Bare bright copper"). **Intermediates** count tonnes but no range: insulated cable, whole motors, whole lead batteries, e-scrap, whole converters, black mass, anode slime, spent spark plugs.

### 4.2 The ladder of 16 materials

Sorted by the main product's price (yard-metals.md 3 and 10; p̄ at about §3 to the dollar); ratios true from steel to iridium; balance from quantities (ruling 4). The build script derives scrap payables as share × exchange p̄.

| # | Material | Sources | Route | Products, p̄ | Stage |
|---|---|---|---|---|---|
| 1 | Light iron | washers, bicycles, sheet | cut → baler | loose §0.50/kg, baled §0.62 | 1 |
| 2 | Cast iron | radiators, baths, blocks | grinder | solids §0.95/kg | 1 |
| 3 | Steel | beams, rail, plate; car bodies | torch, shear; shredder; EAF → caster | HMS 80:20 §1.20/kg (unprepared §0.85); car body (shredder feed) §0.70; shred §1.26; billet §1.90 | 1, 2, 4 |
| 4 | Stainless 304 | sinks, catering steel | analyser | solids §4.80/kg | 2 |
| 5 | Lead | car batteries | breaker → rotary smelter → kettle | whole battery §1.80/kg (intermediate); ingot §5.40; polypropylene §0.90 | 2 |
| 6 | Aluminium | wheels, cans, extrusions, twitch | baler; eddy current; crucible or rotary furnace | wheels §5.60/kg, sheet §5.00, cans §3.40; secondary alloy ingot §8.70 (inference); dross §0.80 | 1, 2 |
| 7 | Brass | taps, valves, fittings | crucible or induction furnace | solids §19.50/kg; ingot §25; dross §2 | 1 |
| 8 | Nickel superalloy | blades, turnings | analyser at the alloy table | solids §32/kg, turnings §20 (inference) | 6 |
| 9 | Copper | cable, pipe, motors | stripper, granulator, motor bench; anode furnace → electrorefining | No.2 §34.30/kg, bare bright §35.50, Grade A cathode §36.10 | 1, 4 |
| 10 | Lithium battery materials | EV and e-bike packs | discharge → module bench → inert shredder → sieve → leach → filter press → solvent extraction → precipitation | black mass by payable; lithium carbonate §38/kg; nickel sulphate §11, cobalt sulphate §31 (inference) | 4 |
| 11 | Bronze | bushings, bells, propellers | induction furnace | solids §29/kg; ingot §42 | 2 |
| 12 | Tungsten carbide | drill bits, inserts | zinc-process furnace (zinc reused) | sorted §330/kg; reclaimed powder §460 (inference) | 6 |
| 13 | Silver | contacts, boards, slime | e-scrap smelter → tankhouse → slime refinery | bar §4.08/g | 4 |
| 14 | Platinum group | catalytic converters | decanning → sampling → assay → collector smelt → refinery | Pd §86/g, Pt §126/g, rhodium §850/g (a by-product dearer than gold) | 1 (whole), 6 |
| 15 | Gold | boards, phones, connectors | e-scrap smelter → slime → leach → precipitation | bar §350/g | 4 |
| 16 | Iridium | plug tips, crucibles, electrolyser stacks | PGM refinery | sponge §985/g | 6 |

Not separate materials in version 1: zinc and tin (inside brass, bronze, dross, dust), titanium, cobalt (with 10), ruthenium (a trace in 14). Trade code words (Barley, Zorba, Twitch) only in the glossary.

### 4.3 The separation tree as data

Objects and machines are content (`salvage.objects`, `salvage.machines`, validated by `src/config/schema.salvage.ts`). **Mass is conserved: outputs + waste = inputs + declared reagents** (sulphuric acid, soda ash, salt flux, lime: each with a mass and a price per tonne, paid per batch, never by the clock). **Ranked tonnes are product mass capped at the input scrap mass**, so reagents never mint tonnes; hydro machines are also checked on contained metal. From the frozen fixture:

```json
{ "objects": [ { "id": "washer", "tool": 1, "kg": 70,
    "pieces": [ { "grade": "light_iron", "kg": 12, "n": 3 }, { "grade": "light_iron", "kg": 8, "n": 1 },
                { "grade": "motor_whole", "kg": 6, "n": 1 } ],
    "waste": [ { "to": "rubble_skip", "kg": 20 } ] } ],
  "machines": [ { "id": "motor_bench", "in": ["motor_whole"], "kg_s": 2,
    "out": [ { "grade": "cu_no2", "share": 0.25 }, { "grade": "light_iron", "share": 0.67 },
             { "grade": "al_clean", "share": 0.08 } ] } ] }
```

**The stage-1 car** (1,060 kg, torch), delivered by Ruddock Demolition as "depolluted end-of-life car · certificate of destruction attached", gives a battery, four aluminium wheels, a loom, 800 kg of car body (shredder feed), 200 kg to the licensed contractor, and a converter sold whole by assay ("from depolluted car ref. 0012"): 0.75 × Pt + 0.75 × Pd + 0.65 × Rh of contained value, less §6 per kg of ceramic (1.5 kg) and a §30 assay fee; at 3 g Pt, 3 g Pd and 0.8 g Rh about §880 (after the stage-6 refinery, 0.98, 0.97, 0.90). **A converter exists only with a source id of type own-depolluted-car or named-garage** (a test). Closed vessels arrive only "certified empty". No recipe, concentration or temperature is shown (L3).

### 4.4 The range gate

A material counts toward the range needed to enter rung r once its lifetime supplied products are worth θ_r = max(§300, k × T_r × §1,200/t) at p̄, k = 1 % (tune 0.5 to 2), T_r the rung's tonnes (6.1; rung 9 uses 7 Mt). Lifetime supply never falls; an entered rung is never lost; the chips show progress toward the next θ.

| Rung entered | 2 to 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|
| θ | §300 | §12 k | §120 k | §1.2 M | §12 M | §42 M | §84 M |
| as bare bright copper | 9 kg | 340 kg | 3.4 t | 34 t | 340 t | 1,180 t | 2,370 t |
| as gold | 0.9 g | 34 g | 343 g | 3.4 kg | 34 kg | 120 kg | 240 kg |

Iridium needs 0.31 g at rung 2 and 85 kg at rung 9. Range needs running lines, not token lots: a **steel-max bot** ticking each material with the cheapest lots stalls at rung 4 or 5 (12.3).

---

## 5. The systems

### 5.1 Machines and production lines (pyro from stage 1, hydro from stage 4)

A **line** is a row of unit-process machines in fixed slots, in their real order, each with inputs, reagents, output shares, by-products, waste, and a rate or a batch; levels 1 to 10 add 15 % (payback-priced, 6.3). **Nothing costs by the clock** (ruling 9). A batch starts when full, or at 40 % after 60 s without feed (the away pass uses its mean rate when feed is below capacity). A full output bay stops a machine; nothing is lost.

| Line (stage) | Unit processes and level-1 numbers (tune) |
|---|---|
| Hand machines (1) | inherited hand stripper (1 kg/s) and powered stripper (6 kg/s) for heavy cable: 70 % copper + 30 % PVC, clean cable to bare bright, a shown tinned share to No.2, thin cable to the granulator later; motor bench; small crucible under an extraction hood (brass 97 % + dross; clean aluminium 94 %) |
| Yard (2) | baler 20 kg/s (+24 % on light iron and cans); magnet crane 3 t/min; granulator 0.5 t/h (thin cable, 35 % copper); depollution bay; analyser |
| Shredder (2) | hammer mill 30 t/h → drum magnet (72 % shred) → eddy current (8 % zorba) → 20 % residue to the licensed contractor; sensor sorter: zorba into twitch 60 %, copper 15 %, brass 12 %, zinc-rich heavies 8 %, stainless 5 % |
| Melt (2) | rotary furnace under salt flux, 2 t, 40 min: 88 % alloy ingot, 7 % dross, 5 % salt slag; battery breaker 1 t/h (soda) → rotary smelter → kettle: lead ingot 60 %, polypropylene 6 %; induction furnace 500 kg, 8 min, 97 %; a bag-house filter on every hall: 1.5 % zinc-rich dust, §0.40/kg (the owner's "filters", pyro side) |
| Steel (4, Saltreach) | arc furnace (lime) → ladle → caster: 88.5 % billet, 10 % slag as aggregate, 1.5 % dust |
| Copper, e-scrap (4, Kaymor Point) | anode furnace → casting → electrorefining: from No.2, 94.5 % cathode, 0.3 % slime, 5.2 % slag to the contractor; from No.1 or granules 98 %. E-scrap smelter with a copper collector, per tonne of boards: 130 kg copper, 3.5 kg silver, 340 g gold, 140 g palladium (yard-metals.md 1) → slime refinery → bars |
| Batteries (4, Ambrel Coast, hydro) | sieve: 40 % black mass, 8 % copper foil, 5 % aluminium foil, 20 % steel, 27 % plastics and residue to the contractor; the filter press takes out graphite ("filters", hydro side). Black mass: Li 3.4 %, Ni 17.8 %, Co 5.9 %, graphite 35 %, recoveries 90 to 95 %: per tonne about 167 kg lithium carbonate, 758 kg nickel sulphate, 267 kg cobalt sulphate (inference; hydrate water from reagents) |
| PGM, iridium, tungsten (6) | decanning → milling and sampling → assay → collector smelt → refinery; plug crates and stacks give iridium; carbide → zinc-process furnace, 95 % powder |

**Decisions**: which line or level next; which input a shared furnace takes; sell or refine, on one **refine-or-sell card** ("Sell black mass now §17,400/t · Refine §21,500/t net of reagents, in 3 h 10 m"). Anchors (tune): shredder line about §0.9 M at rung 4, tankhouse about §60 M at rung 6; builds 5 to 60 min, halved by the crane yard at rung 5.

### 5.2 The posted board, the two exchanges and the dealers (ruling 8)

**Two clocks.** Live dt comes from monotonic elapsed time (`performance.now`, passed to the rules). The **market clock** t_m = max(device now, clockHigh + live time since the last resume), UTC, saved, never backwards, advancing in live play after a clock-back. Steps n = floor((t_m − EPOCH) / 600 s), EPOCH a Monday 00:00 UTC; no session hours; randomness is a counter hash h(worldSeed, metal, venue, n), the same on every phone.

**Stage 1, the posted board** (Tamberlow's): per family (ferrous, non-ferrous) one price a day, mean-reverting: x(d+1) = 0.5 x(d) + 0.03 w(d), w uniform in [−1, 1] (about 2 %; tune 0.02 to 0.05), p = p̄ (1 + x). It shows its date, five days, a tick at the usual price and a word: **low day** (x < −1.5 %), **usual**, **high day**. **Hold**: each bay holds 2 h of its grade's flow; a bay not held goes on the flatbed's round at that moment's price; a held bay waits and its Sell sells at once; a full held bay lets pieces go on the round; no rent. **A grade under a deal is reserved** up to the next delivery ("Reserved for Quillon Foundry: 140/200 kg"). **Tickets**: incoming "Seller ID checked · paid by transfer" or "Signed in · gate drop-off"; outgoing "Lot sold to Tamberlow · weighed out · paid by transfer"; the site licence hangs on the portacabin wall from minute 0.

**Stage 3, exchanges and dealers:**
- **Exchange metals** (aluminium, copper, lead, nickel, tin, zinc): P = p̄_m × exp(c_m + s_{m,e} + φ_m + d_e). c: common exact discrete OU (yard-tech.md E), half-life 2 days, deviation 1.5 % (copper, aluminium), 2 % (lead, zinc), 3 % (nickel, tin); s: each exchange's own OU, half-life 8 h, 1 % (the gap); d: the Union's import duty +1.5 %, named, charged only on goods arriving from the West (Eastern sites sell at the Kaymor price less d); φ: the week's pattern by h(worldSeed, metal, week): **Steady** 40 %, **Tight week** 20 % (to +7 % by day 3, back by day 7), **Glut** 20 % (to −6 %, slow recovery), **Shock** 20 % (+9 % or −8 % on one exchange, 1.5-day half-life, a bulletin with its cause 12 h before). Weekly anchor floor(t/W)·W − W, W = 7 days. (tune all)
- **Dealers** post everything else once a day at 00:00 UTC, one price per grade worldwide plus a fixed regional premium: P(d+1) = P(d) × exp(−0.15 ln(P/p̄) + a draw: 0 with 55 %, ±1 to 3 % with 40 %, ±8 to 20 % with 5 %, a large step announced the day before), anchored at p̄ every 28 days (0.85^28 ≈ 1 %) with cached checkpoints.
- **Scrap grades** sell to dealers at a payable share of the West cash price (No.2 copper 95 %, bare bright 98.5 %, brass and bronze by content). Only copper cathode and lead ingot become **registered brands** (24 h with the assay lab), sold on an exchange in invented lots (Bellmarch 20 t, Kaymor 10 t) at cash less 0.15 %, at most 40 lots per metal per exchange a day.
- **The board shows** price, 24 h change, 14-day history, stocks, a word for cash against forward (**shortage now**, **balanced**, **plenty**), bulletins and the gap as a sentence ("Kaymor pays 3.2 % more after carriage and duty"); no future chart. "All prices, exchanges and shares are fictional and have no real-world value. Nothing in this game is financial advice." shows on first opening the board and the listing, and in Help.
- **The player can**: sell to a dealer, or registered lots on an exchange from its warehouse; ship (5.4); sign deals (5.3); write a **sell note on a bay** ("Sell this bay when the board reaches §X", filled at the first step at or above X at that step's price, also away; never listed as open orders); store **prepaid** for 7 or 28 days (then stock waits). No buying, bets, leverage, shorts, futures or options.
- **Shown equals applied**: every card carries its step (`sell(lotId, n)`); a changed step re-asks "Price updated: a → b".
- **Signals**: stocks lead the pattern by about a day (right about 70 %), the word, bulletins, the gap. **Bot gates**: a pattern reader beats selling at once by 3 to 7 %, nothing by more than 8 %, foresight by at most 25 %; on one device, peeking ahead gains nothing (clockHigh moves for good). A second device or a fan page shows tomorrow's shared prices: that is the 25 % bound, on money only, never on rank.

Better selling buys capacity sooner (6.3): the pattern reader reaches rung 7 at least half a day sooner (12.3).

### 5.3 Partners and deals

**The gate tip** rules out a dead end: an item every 40 s while fewer than 8 wait, the first at 0:40 (washer 45 %, bicycle 20 %, radiator 15 %, heavy cable offcuts 8 %, brass taps 7 %, copper cylinder 5 %; never a converter or sealed vessel), each signed in. **Opening stock** (the first-yard document owns it; proposed): a 12 kg bundle of heavy cable offcuts by the inherited stripper, four washers, two radiators, a cast-iron bath, six brass taps, a copper cylinder "certified empty", the old car behind the torch rack; cash §0.

**Supplier skips**: **contents are fixed when a skip fills** (a counter hash) and printed on its label by grade and kilogram, with the price, before anyone hooks it; the weigh-in equals the label. **Nothing bought, with calvans or money, has contents unknown at purchase.** Price: k = 0.70 (tune 0.60 to 0.80) of its as-found value at the day's prices, so the margin is honest sorting, cutting and stripping; the driver hooks it only if cash covers it. **Supply deals**: "q t a day of grade g for D days at §p, locked at signing", p = 7-day average × (1 + local 2 %, regional 3 %, corporate 4 %; tune), drawn at 00:00 UTC from reserved stock; a short day is paid for what was delivered and trust (0 to 100) falls by 10, a full day adds 5; **nothing is charged for a miss**; trust gates regional deals at 60, corporate at 80.

| Tier (stage) | Partners |
|---|---|
| Local (1, 2) | **Hob's Farm Clearance** (with the truck): 1 t every 5 min, light iron 60 %, cast iron 30 %, unprepared steel 6 %, brass 3 %, copper 1 %, about §1.10/kg. **Ruddock Demolition** (with the torch): 3 t every 8 min, beams 70 %, light iron 15 %, heavy cable 8 %, copper pipe 4 %, brass valves 3 %, about §2.95/kg; the depolluted car. **Quillon Foundry Co-op**: a deal series, first 200 kg of cast iron a day for 5 days at the average + 2 %. Stage 2, across the bridge: **Larkin's Garage** (depolluted cars and converters, batteries, wheels, bushings), **Pell Street Plumbing** (pipe, brass, bronze valves) |
| Regional (3) | **Durnav Steel** (arc-furnace mill: HMS and shred by monthly deal), **Ostro Cable Works** (granules, cathode) |
| Corporations (3, 4, 6) | **Veyra Motors**: closed loop as tolling (keeps the aluminium, pays §1.0 per kg of ingot); EV pack take-back with a fee to the yard (4). **Vantorra Electronics**: boards and phones at 80 % of the dealer price. **Aldane Aerospace**: superalloy offtake. **Brannick Tooling**: carbide at 80 %. **Quenwick Electrolysers**: iridium tolling. **Meridane Glass**: rhodium and platinum tolling |

Deal kinds: **supply**; **take-back** (the yard pays a payable, and is paid a fee only for material worth less than its handling); **offtake** (28 days at the exchange average + 3 %); **tolling** (the partner keeps the metal, pays per kilogram). Corporations ask for certificates (radiation portal, depollution bay, assay lab with chain of custody, battery bay, export consent) and a minimum tonnage.

### 5.4 Transport (road and rail in stage 3; vessel and plane in stage 4)

**Sale venues force routes**: bullion and PGM sponge only at the Bellmarch bullion dealer, battery salts only to Union buyers, billet, cathode and offtakes at named sites. A **booking card** has a row per mode (capacity, carriage, transit, next departure, arrival, net per tonne), the best preselected, the fixed quote the default; a booking is never cancelled or re-routed. Ratios are the research's (vessel 1 : rail 6.5 : road 28 : plane 210):

| Mode | § per t·km | Capacity | Departures; transit (compressed) | Needs |
|---|---|---|---|---|
| Road | 0.342 | trucks of 25 t | within the hour; 4 min + 1.5 min per 100 km | — |
| Rail | 0.078 | 80 t wagons, trains to 20 | every 6 h; 20 min + 50 min per 1,000 km | sidings |
| Vessel | 0.012 | 2,000 to 30,000 t | every 12 h; 2 h + 60 min per 1,000 km (Saltreach to Kaymor about 11 h) | quays |
| Plane | 2.53 | 50 t | every 3 h; 30 min + 5 min per 1,000 km | an airside shed |

- **Batteries and black mass never fly** ("Lithium batteries are not flown (dangerous goods rules)"); precious metals by plane or armoured road (× 4, 2 t). **Export consent** (a certificate from stage 4): e-scrap, black-mass and battery cards read "Consignment note · consent on file · to licensed plant" and go only to the player's licensed plants or named licensed refiners; procedural, never a fee by the clock.
- **Insurance** 0.2 % of value a day under way. With the fixed quote's 1 % a day, the plane is the best net above about §5 to §30 a gram and for urgent lots (a deal deadline, a Shock bulletin). A warning when carriage exceeds half the value teaches "steel by ship, iridium by air".
- **Pricing** (ruling 8): on arrival at the price then (the card shows "likely between a and b" from the last 14 days' moves over that transit; repeat notes use it while away), or a **fixed quote at dispatch** q = P_dest(t_m) × (1 − 0.01 × transit hours ÷ 24).
- Distances: Kettle Lane to Bellmarch 120 km, Saltreach 220, Varn Ridge 380; Saltreach to Kaymor 9,000; Kaymor to Ambrel 600. A **dispatch clerk** runs repeat notes written on a bay ("send shred to Saltreach every 6 h"), never drawn as a route.
- **Physical events at places only**: wagons filling at the siding, the magnet-crane cab loading the vessel (the boss at twice the crew rate), the boss signing the armoured van, the plane at the shed, arrivals unloading. The dispatch office has a **clip rail** of printed consignment notes: no map, tokens or lines.
- **Bot gates** (a scripted stage-4 mix): each mode the best net in ≥ 10 % of shipments by count or value; a person-like player leaves the preselected row in ≥ 15 % of bookings; no battery by air. Tonnes count when the consignment is sold or delivered at the destination.

### 5.5 Territories (stage 4; Varn Ridge, PGM and carbide in stage 6)

Sites are bought outright for about 6 h of income where they open (tune; Saltreach about §5 M, Kaymor Point about §80 M), from the office **key board** (a key tag and photo-card per site); moving plays the site truck pulling in. Each is a walkable yard with its own lane, crews, hand station, goals and away pass; the worker is at one site at a time.

| Site | Opens | What only it does | Its lane | Hand station |
|---|---|---|---|---|
| Kettle Lane | start | the hand, the lane, the works | Hob's, Ruddock's; Larkin's, Pell Street | oversize pad |
| Saltreach | 30 kt (rung 5) | quay and vessels; a licensed ship-recycling berth (the shear cuts plate; asbestos leaves in sealed bags with a licensed contractor); propellers; arc furnace and caster | breakers' quay, chandlers | fittings bench |
| Ambrel Coast (East) | 30 kt (rung 5) | battery bay (thermal cameras, isolation drums), hydro line, e-scrap dismantling | pack makers, phone repairers | module bench ("discharged, checked") |
| Kaymor Point (East) | rung 6 | tankhouse, slime and e-scrap refinery, airside shed; stage 6 PGM and iridium | electrolyser plant, glassworks | sample station |
| Varn Ridge (6) | rung 7 | aerospace alloys for Aldane; the carbide plant | machine shops up the hill road | alloy table |

Hazards appear only as things a good yard handles properly, never a spectacle, minigame or reward (L3); every pour is under a hood, the worker in face shield and aluminised apron, moulds on dry sand; no pour is player-timed.

### 5.6 Time away (rulings 9 and 16)

`paysOnCompute: true`, `catchUpSeconds: 0`. A = min(t_m − max(lastSaved, clockHigh), Cap), one A for all sites. **Cap**: 4 h; 6 h with the **Night watch** (office, §3,000, stage 1); earned 8 h at rung 4, 10 at rung 5, 12 at rung 6. **The closed form**: each site is a graph, sources (gate tip; skips gated by cash; take-backs) → cutting → carrying → machines (rate × level or a batch's mean) → bays → collection, delivery or consignment; between events each flow runs at its bottleneck, split by the priority rule (3.3). A segment ends at a buffer full or empty, a cash threshold for a skip, a batch's doneAt, an arrival, a deal delivery, a sell note's fill, a dealer posting and **every price step**. Within a segment revenue is mass × price per grade exactly; money and tonnes are added in time order; the live tick uses the same rate functions. The boss's rewards never happen away. A negative-margin line pauses; full buffers stop feeders. The result is paid when computed and recorded under clockHigh, so a jump never pays twice. **Known local limit**: moving the clock forward pays the cap at once, again if repeated; online, ranked tonnes are bounded by server time (7.5). **What the player finds**: the yard moved on, and the away card as a ticket roll ("Away 3 h 12 m (cap 4 h)"; a line per grade; "41.2 t supplied · §148,200 (already in your account)"; "You passed Kelderby Recycling."), with one optional ad button and its sum.

---

## 6. The one ladder

### 6.1 Rungs, days and what each rung opens

The industry table ranks **lifetime tonnes supplied**, counted when a lot leaves (collected, sold, delivered or arrived; weighed-in skips, reagents and waste excluded); a position **never falls while away** (ruling 3). A rung is entered when tonnes, range and sites are met; the crane hangs a sign with the yard's name and tonnes ("Kettle Lane Yard · 1,000 t supplied"), no title, no promotion words; the chip shows rank and the next rival.

**How the days are computed** (`/tmp/claude-0/-home-user/f22d4cbe-c353-58da-a893-27d84a9b8342/scratchpad/spec-master/ladder3.py`, a sketch): production hours a day = Σ over gaps of min(gap, Cap(r)) + live hours (twice a day 8.3 h at rungs 1 to 2, 12.3 at 3, 16.3 at 4, 20.3 at 5, 24 from 6, where all habits converge); R grows only by purchases at 1/τ_r per production hour when all income is spent (6.3), the pace bot spending 85 %; L = ∫ R dt.

| Rung | Tonnes | Range | Sites | Twice a day (sketch; band) | 3 h a day | Always on |
|---|---|---|---|---|---|---|
| 1 | 0 | — | 1 | start | start | start |
| 2: radiation portal and ID desk ("Every load checked. Every seller identified. Payment by transfer only.") | 2 t | 3 | 1 | 12 to 18 min | 12 to 18 min | — |
| 3 | 25 t | 5 | 1 | 55 to 65 min | 55 to 65 min | — |
| 4 | 1 kt | 8 | 1 | day 2.3 (2 to 3) | 1.3 | 1.1 |
| 5 | 10 kt | 9 | 1 | 4.8 (4 to 6) | 3.3 | 2.8 |
| 6 | 100 kt | 10 | 3 | 8.8 (8 to 10) | 6.6 | 6.2 |
| 7 | 1 Mt | 12 | 4 | 16.8 (15 to 19) | 14.3 | 14.0 |
| 8 | 3.5 Mt | 15 | 5 | 24.8 (23 to 27) | 22.3 | 21.9 |
| 9: **the largest full metal recycling and resource supplier** (Orrin passed on the player's own table) | | 16 | 5 | 31.3 (29 to 34), at 6.9 Mt | 28.6 | 28.4 |

Sensitivity at rung 9, twice a day: the hand's +20 % gives day 25.8, a pattern reader's +8 % day 28.8, spending 80 % day 33.3. Materials: stage 1 gives 6 (rung 3 needs 5, so a hand that skips the torch still gets there), stage 2 9, stage 4 12, stage 6 16.

**What each rung opens** (one new decision system, its first instance worth doing):

| Rung | Opens (stage) | First instance |
|---|---|---|
| 1 | hand, crews, posted board, Hold (1) | hold a bay over a low day |
| 2 | supply deals (1) | Quillon Foundry's 200 kg a day |
| 3 | the works and the process board (2) | the baler, then the rotary furnace |
| 4 | dealers, road and rail (3); companies (5) | a wagon of shred to Durnav Steel |
| 5 | the exchanges and corporations (3); at 30 kt the key board (4) | a 20 t cathode lot; Veyra's tolling |
| 6 | vessel and plane (4) | the first sailing to Kaymor |
| 7 | Varn Ridge and stage 6's lines | a carbide sort |
| 8 | iridium tolling (6) | Quenwick's first stack |

### 6.2 Rival firms as pure functions

Twenty-five invented firms, each with a drawn logo, a chip name of at most 14 characters and a "simulated" tag. T_i(d) = T_i0 × (1 + g × min(d, 40)), g = 0.5 % a day below 1 kt, 1 % above (Orrin 0.5 %); d from the player's start locally and from the calendar epoch online (ruling 16). T_i0 = the twice-a-day curve at the planned pass day ÷ (1 + g × day), recomputed by the content script from the prototype.

| Rival (pass) | T_i0 | Rival (pass) | T_i0 | Rival (pass) | T_i0 |
|---|---|---|---|---|---|
| Tinwhistle Scrap (min 5) | 0.15 t | Lowmarsh Non-Ferrous (day 3) | 2.5 kt | Hemmerstead Resources (17) | 930 kt |
| Copperstile Metals (min 15) | 1.5 t | Thornquay Metals (4) | 6.0 kt | Teodric Metals (19) | 1.33 Mt |
| Ashbarrow Reclaim (min 30) | 5 t | Tallowmere Metals (5) | 12 kt | Marenko Global (21) | 1.80 Mt |
| Wrenmoor Metals (min 55) | 15 t | Cindral Ferrous (6) | 24 kt | Halvard Steel & Alloys (23) | 2.34 Mt |
| Kelderby Recycling (day 0.5) | 90 t | Duskwater Metals (7) | 41 kt | Sunmere Metals Holding (25) | 2.98 Mt |
| Saltgrove Ferrous (1) | 210 t | Vossbury Resource Recovery (9) | 100 kt | Corvane Industries (27) | 3.68 Mt |
| Brindlecote Metals (1.5) | 420 t | Gullreach Metals (11) | 215 kt | Estmark Metals (29) | 4.43 Mt |
| Ironvale Reclaim (2.2) | 800 t | Ondine Metallurgy (13) | 375 kt | **Orrin Global Metals** (31) | **6.0 Mt** (≤ 7.2) |
| | | Crayle International (15) | 605 kt | | |

The chip starts "26th of 26 · next Tinwhistle 0.15 t". Up to five followed players appear as pinned rows; **real rows never gate a rung**. Sketch: a rival every one or two sittings in week one, then every 2 to 2.5 days (largest gap 2.5; 3 h a day 2.0; 45 min a day 2.3). Rivals' moves are optional (second in the cut order).

### 6.3 Capacity, its price and the closed form

**Rated capacity R** (t/h) is a pure function of assets: Σ over sites of the bottleneck throughput with full feed; feed sources (skip routes, take-backs, deal allocations) are stations too. **The payback rule is the money sink**: from rung 3, anything that raises R by ΔR costs τ_r hours of the income ΔR earns at p̄ (the first hour's shop is the first-yard document's list, about 2 h): τ = 9 h at rung 3, 22 at 4, 45 at 5, 110 at 6, 230 at 7, 420 from 8 (tune ± 30 %). Spending all income grows R at 1/τ_r per production hour, so money from selling well, the hand and deals becomes tonnes, and cash never piles up while anything is left to buy; steps of +5 to +25 % keep the next one within two sittings. **The rung ceiling** (ruling 15) is a guard at about 1.3 × an always-on full spender's exit capacity: 6 · 20 · 160 · 800 · 3,500 · 14,000 · 28,000 · 40,000 t/h for rungs 1 to 8+ (tune ± 30 %); stage 1's shop tops out near 40 t/h by content. A year at 40,000 t/h is 3.5 × 10^14 g, inside a double.

### 6.4 After the top

A finishing ceremony (the crane hangs the title, the crews line up, a ticket prints the whole run). **Completion goals exist from day 1 and stay open**: the Trade Book (every object and grade), every process node at level 10, every corporation's certificate. The weekly bracket and the company order are the standing loop; locally, simulated players stand above on the all-time board, labelled simulated. The store says so without numbers.

---

## 7. Other players (stage 5)

### 7.1 Words (ruling 2)

A **company** is what a player founds or joins, at most 30 members, and it is what is listed. The player's operation is "your yard", "your business" from a second site, with a composed trading name. A founder alone has a company of one. "Group" is not used.

### 7.2 The company

- Founding and joining open at rung 4, rate-limited per uid and IP. Name from three lists (40 × 40 × 8, curated); emblem from 8 shapes × 12 glyphs × 10 colour pairs; nothing typed.
- Leader, up to three co-leaders, members; open, by request or closed; leaders remove members. Leadership passes after 14 days without a logged rules action (opening the app does not count) to the most active co-leader, else the longest-standing active member; with none, dormant and joinable.
- 24 fixed phrases and 8 emotes ("Good week.", "I can cover copper."). Invitations can be declined and switched off.
- **The weekly company order** (ruling 12): an invented corporation's order sized at the week's start to 25 h × Σ R of members with 7 days of accepted play, split into **lines by grade** over what members supply. A member **claims a line** with one tap (the phrase "I can cover copper." is the claim, shown with their emblem) and routes lots from a bay ("Send 2 t to the company order at §p"), priced like a deal: a normal delivery. Tiers 50, 80, 100, 125 %. Rewards only for contributors (1 % of the order or 5 h of their capacity), cosmetic: a pennant in each contributor's yard, emblem parts. Simulated firms claim lines too.
- Company row and tours show the order's progress by line and the valuation rank. Not in version 1: a shared ship, divestments, takeovers.

### 7.3 Boards and tours

- **Weekly brackets** of 30, placed at the week's start by floor(log2 D), D = R × min(24, 2 × Cap + 2 h) derived by the server from accepted assets (bought included); a newcomers' bracket for the first seven days. Score: tonnes that week, each submission split across Monday in proportion to server time. **Daily credit ceiling**: a day credits at most min(the player's current D, the band's upper edge), so an always-on player is credited at most 1.21 × a twice-a-day player of equal capacity (rung 1; 1.0 from rung 6): the **fairness gate** (≤ 1.25 ×); buying on Monday 00:01 gains at most the band's top; the private ladder keeps every tonne. Pennants for the top three and best growth (only if last week was at least R × 20 h), cosmetic.
- **All-time boards**: lifetime tonnes, calendar-anchored, in **cohorts by start month**, beside "days to each rung"; the rival rows; companies by valuation once listed, counting members with 7 days of accepted play and 1 % of the company's tonnes, by sum and by top-10 median. No trailing-week position.
- **Tours**, read-only: a diorama of their main yard, sign, range chips, pennants, emblem, this and best week. Actions: **follow** (up to five, invisible to the followed), **invite** (leaders), **report**, **block**; invitations off by default for 13 to 17 where known; no likes, views or counts.

### 7.4 The listing (ruling 12)

A company may list at 2 Mt of combined accepted lifetime tonnes with 12 materials counted at rung 7's θ and seven daily results (a company of one near rung 7). The leader rings the bell at the **Calvany Share Market**; every member's yard shows the crew lined up and confetti of offcuts. **Valuation (simulated, published formula)**, weekly from accepted results: V = 26 × W × (1 + 0.02 × (range − 13)), half a year's supply, W = last week's Σ accepted mass × p̄: immune to timing, checkable on the server; whole calvans, asserted under 2^53 (about 10^13 at most). No per-share price or share count; the card and Help say "No shares can be bought, sold or owned by players. No money is paid out."

### 7.5 One interface, two implementations

`OnlineService`: `acceptTerms`, `me`, `board`, `tour`, `follow`, `unfollow`, `myCompany`, `companies`, `found`, `join`, `leave`, `invite`, `respond`, `setInvites`, `setRole`, `remove`, `say`, `claimLine`, `submit`, `report`, `block`, `unblock`, `deleteMe`.
- **LocalOnline** (default; no network or account): about 200 simulated players and companies, weekly tonnes a pure function of (seed, week, t), rows labelled "Rival yards (simulated)" with no promise of a future feature; simulated firms join the player's company under the same cap of 30.
- **FirebaseOnline** (yard-tech.md D), switched on only in a binary submitted for review with notes, test account and seeded server, never by an over-the-air update or remote flag (`validate:release` checks it): anonymous sign-in; `players/{uid}` owner-only; `publicPlayers/{uid}` by functions only (handle parts, emblem, rung, tonnes, range, band, company, a site summary under 2 KB, pennants); `companies/{cid}/members/{uid}`; one document per bracket and board, rebuilt every 10 min; `reports/{id}` create-only. Functions mirror the calls, with `joinCompany` a transaction (members + 1 ≤ 30), `rebuildBoards` and `weeklyClose`. `server/` bundles a copy of `src/engine/salvage` made at deploy (outside the `modes.js` check) with a content hash; each submission carries its hash and assets are valued with the content they were bought under.
- **The server checks** (it re-runs the rules and assumes a hostile client; tonnes are submitted per grade): ΔT ≤ R_prev × Δt + 0.25 × R_prev × foreman time due (≤ 45 min a day) + H × min(Δt, 3 h) + lot mass due + arrivals booked before the last accept, where R_prev is the capacity accepted at the previous submit and H a hand rate per best tool and carry tier (content, 1.2 × the measured fast-hand bot). Excess stays **pending** and is accepted as slack allows (at most 24 h banked); the chip marks it "not yet verified". Earnings are derived as at most Σ tonnes per grade × the interval's highest posted price; claimed assets must cost no more than accepted earnings; range grows only by materials whose line exists. **First submit**: accepted up to the always-on curve from max(the save's start, stage-5 release − 60 days). A hostile client gains at most what an always-on honest player with the same assets could. Only functions write ranked fields; writes are rate-capped; purchases and ads never touch them. Tests: the fast-hand bot at rungs 1, 3, 8 accepted in full; a 3-hour-submit client and any claim beyond the always-on curve at its assets clamped; a legacy save's first submit. Within that curve an inflating client cannot be told from an always-on player: a known limit.

### 7.6 Accounts, deletion and the policy duties

Handles are generated ("Steady Anvil of Quillon"); nothing typed is shown to others. Terms come before a handle is shown, founding and joining. Report on every handle, emblem, company row and tour (a reported name shows "Company #48213" until reviewed); blocking hides the handle and stops invitations. Under-13s get the local mode only. Deletion in the app (stating its time; removing handle, scores, company data) and on a web page.

### 7.7 What the owner must create and decide, and the ratings

Create before stage 5 goes online: a Firebase project (web app, anonymous sign-in, Firestore, Blaze with a budget alert, a restricted key, deployed rules and functions); privacy policy (yard-policy.md 4), terms, support URL and email, the deletion page, a data processing agreement, the UK Online Safety Act assessments, a moderator acting within 24 hours, review notes with a test account and seeded server, privacy label and Data safety form, trademark and company-register searches. Decide: list A or B; `firebase` 13.1.0 as a direct dependency limited to this mode; prices.

| Rating | Expected | Answers that keep it |
|---|---|---|
| Apple | 13+ (A12 in Brazil, for advertising) | Contests frequent; Simulated Gambling none; Loot Boxes none (labels, 5.3); UGC yes, conservatively; Messaging none; Social Media none |
| IARC | PEGI 3 (7 if pennants count as return rewards); ESRB E | "In-Game Purchases", "Users Interact" |
| Google | 13+, never Families | |

Forbidden because they raise it: typed names, any cash-out (18+), timed or limited offers (PEGI 12), free chat, random paid items.

---

## 8. Money (ruling 13)

Nothing in stages 1 to 4 depends on the choice; stubs in stage 1, live from stage 2.

| Product (kind, price) | A (fair first) | B (house style) |
|---|---|---|
| No ad videos: every ad reward at once, same limits (skipAds, $4.99) | yes | yes |
| Yard livery, six schemes (cosmetic, $2.99) | yes | yes |
| Company emblem set (cosmetic, $1.99) | yes | yes |
| Founder's plaque, seen on tours (cosmetic, $2.99) | yes | yes |
| Early cover: the 12 h away cap play earns at rung 6, now (unlock, $3.99) | — | yes |
| Second crew slot early (unlock, $2.99) | — | yes |
| Express builds, as the crane yard gives at rung 5 (unlock, $4.99) | — | yes |

Never: anything random, limited in time or quantity, away hours beyond play, a consumable that adds tonnes, currency packs. Kinds A {skipAds, cosmetic × 3}, B adds unlock × 3, both unlike the four games'. Store wording: A "Purchases remove ads or change how your yard looks. They never add tonnes."; B adds "Some purchases bring forward what play unlocks later, which can speed up your climb on the all-time table. The weekly boards are banded by capacity, so purchases do not help there. Nothing sold adds tonnes directly."

**Rewarded ads** (labelled buttons only; no interstitials or banners): **away bonus** +50 % of away cash up to 20 min of I, on an away card of 30 min or more, twice a day; **spot buyer** +10 % on one grade's next lot up to 10 min of I, three a day; together at most 4 % of a day's rated income (tune 2 to 6); calvans only, never on a board; the count left is shown. **Must be true**: bands by server-derived D (in B including bought items); an ad-watcher's lifetime tonnes at day 14 ≤ 1.15 × a non-watcher's; the weekly bracket stays money-proof. In B the sketch's Early-cover buyer has 1.76 × a non-buyer's lifetime tonnes at day 14 and 1.24 × at day 30: the owner decides knowing it.

---

## 9. The stages (ruling 15)

Each stage is playable on the owner's phone. Wishes are BRIEF's numbers. Lines against yard-tech.md F (55 to 70 k), as rules + tests / UI / art / bot and script.

| Stage | Contains | Wishes | At its end the player can | Lines |
|---|---|---|---|---|
| **1 The first yard** | crane loading screen; Kettle Lane, Hob's, Ruddock's; stick, cut, carry, weigh in, bays, the round; tools and carry 1 to 3; strippers, motor bench, crucible; three crew roles; posted board, Hold; the foundry series; table and chip; time away; local save; stubs for ads and purchases; content script and bots | 1, 2, 8; part of 3, 4, 6, 7, 11 | the hour to rung 3, then a goal list for days 1 to 3 (levels, the foundry series, rivals to Ironvale at 800 t) ending at a fenced back field with a "next build" board | 13 to 16 k (4 + 3 / 5 / 2 / 2) |
| **2 The works** | back field; stage-2 machines and vehicles; the bridge partners; the crate; stainless, lead, bronze; lots; commissioning; process board; Trade Book; purchases and ads live; rungs 4, 5 | 3, 7 (pyro) | run a processing yard with three melt lines and a shredder | 9 to 11 k (3 + 2 / 3 / 2 / 0.5) |
| **3 The market** | 5.2; warehouses; Durnav, Ostro, Veyra, Vantorra; trust; siding, road, rail, booking cards, clip rail; assay lab and brands | 4, 5 (road, rail), 6 | choose where, when and in what form to sell; ship by road and rail | 9 to 11 k (3.5 + 2 / 3.5 / 1 / 0.5) |
| **4 Territories** | key board; Saltreach, Ambrel Coast, Kaymor Point with lanes, stations and lines; vessel, plane; export consent; pack take-back; rungs 6 and 7 | 3, 5, 7 (hydro), 9 | run four sites and ship between continents | 13 to 15 k (4 + 2 / 3 / 4 / 0.5) |
| **5 Other players** | `OnlineService` both ways; `server/`; brackets, cohorts, tours; companies, claimed lines, the order; the listing; terms, report, block, deletion | 10, 11, 12 | everything, simulated offline and real with the owner's keys | 8 to 10 k (3 + 2.5 / 3 / 0.5 / 0.5) |
| **6 The top** | Varn Ridge; carbide; PGM refinery; iridium; the last corporations; rungs 8, 9; after the top; store package | 3, 4, 8 complete | reach the top | 7 to 9 k (2.5 + 1.5 / 2 / 2 / 0.5) |

Sum 59 to 72 k, the top of the estimate. **Cut order** (ruling 15): the simulated social extras, rivals' moves, the buy-ratio lever; in stage 1 the foundry series and the sack truck may slip.

**The first yard** follows ruling 5's beats in order, and the owner is told in one line what to judge it on: the hand and the first hour. Its document owns every stage-1 number, and ground-work values that change go to their owners (truck speed and the work delay to the world engineer, save key `salvage1` to the rules engineers). The copper jump comes from the inherited hand stripper and the offcut bundle, with no purchase; the crucible pad is in view from the first minute with its price and a sample ingot. **Planned spend against income** (proto; income must cover spend at every minute of the first 15):

| By | Event or purchase | Income | Spend |
|---|---|---|---|
| 0:25 | first ticket (light iron, a whole motor) | §33 | 0 |
| 1:30 | bare bright from the bundle, 8.4 kg × §35.50 | §330 | 0 |
| 2:00 | gloves §60 | §380 | 60 |
| 4:30 | yard hand §300 | §800 | 360 |
| 7:00 | grinder §300 | §1,150 | 660 |
| 9:30 | hook-lift truck §500 (Hob's skips) | §1,500 | 1,160 |
| 11 | sack truck §400 | §1,900 | 1,560 |
| 14 | motor bench §800 | §2,800 | 2,360 |

Then cutter §1,200 (15: "the yard now earns while you are away"), powered stripper §600 (17), crucible §1,500 (20), driver §2,000 (25), torch §2,500 (30: the car; Ruddock opens), Night watch §3,000 (40), then payback-priced levels.

---

## 10. The screens in landscape

Full-bleed world; insets read on all sides; both landscape directions; a taller-than-wide window shows "Turn your phone sideways".

| Row (pt) | 844 × 390 (47 left and right, 21 bottom) | 667 × 375 (16 margins) |
|---|---|---|
| Top bar | 36 | 34 |
| Goal card (one line; tap for three) | 28 | 26 |
| Free world | 237 | 239 |
| Bottom: stick zone left; the one button (60) right, the ad button (40 high) to its left while it applies | 89 (8 + 60 + 21) | 76 (60 + 16) |
| **Total** | **390** | **375** |

| Top bar | 844 (safe 750) | 667 (635) |
|---|---|---|
| Cash (15 pt bold, rolling, abbreviated) | 136 | 116 |
| Ladder chip ("19th of 26 · next Hemmerstead 930 kt"; tap: the table) | 408 | 340 |
| Carry ("52/60 kg", the truck's "0.8/1 t") | 90 | 90 |
| Clipboard | 44 | 44 |
| Gaps | 3 × 24 = 72 | 3 × 15 = 45 |
| **Total** | **750** | **635** |

Nothing from the market sits in the top bar. Bar text is sized from fontScale with `allowFontScaling={false}`; at 667 at most four HUD lines. At 40 pt per metre the worker is 46 pt tall and the view about 21 × 9 m.

**Places** (Open there, or from the clipboard once visited): tool rack; office (rota, Night watch, partner wall, the **process board**, later the dealing desk and key board); scale house (boards, tickets, Hold, sell notes); machine pads (buy, level, refine-or-sell); gate notice board (the table, later boards and tours); flagpole (the company); siding, quay, airside shed (booking cards, clip rail); plant halls; the bell (the listing). **The process board** is the progression screen: unit processes as enamel plates joined as a tree, bought ones lit, each a tap from its machine card; stripper, motor bench and crucible are its first branch.

**Overlays** are the mode's own views registered with `useOverlay` (never the kit Sheet or a `Modal`), one at a time, closed by the scrim or Android back: the **right panel** (min(520, 0.58 W) at 844, 0.62 W at 667, rows 44 pt, text 12 to 13 pt, never under 11), the place dimmed at left; the **wide card** for the dealing desk (side by side at 844, tabs at 667); the **centred card** (≤ 520 × 300) for the away roll and the rung sign.

---

## 11. Art and sound

**Look**: flat vector, three-quarter oblique, drawn in code and baked into atlases while the crane screen runs; at most three atlas draws, 40 actors, 300 sprites a frame; daylight, clean, a yard someone is proud of. **Palette `hi-vis-and-rust`**: sky #EAF1F4, concrete #C9C4B8, galvanised #9AA5AE, asphalt #4B4F54, hi-vis #F4C20D, rust #9A4B2B, ink #2B2E33; orange only for heat (#FF8A2A; ingots cool to their metal colour in 3 s), so never Lantern Row's dusk; each material a colour and a 10 pt pictogram (copper #C8743A coil, brass #D4AF37 tap, lithium #3A6EA5 cell, iridium #A9B6C9 crucible).

**People, vehicles, logos**: the worker in vest, hard hat, gloves, boots, a face shield when cutting, shield and aluminised apron at every pour; crews alike in role colours; nobody hurt or unsafe; vehicles in eight headings, never a crusher on wheels or a tow truck. Logos in two colours, checked against known brands' shape-and-colour pairs: Vantorra a teal stacked-square glyph, Veyra a coral open ring with a notch, Aldane a swept navy triangle, Brannick a notched orange hexagon, Quenwick a split indigo droplet, Orrin a slate square cut by one arc; no chevrons for vehicle makers, no four-point sparkles, no striped or ringed globes; rivals' plates from a separate generated kit.

**Loading animation** (about 3.5 s on first launch; tap to skip from the second): 0.0 s pale sky, a crawler crane swings in an electromagnet; 0.4 to 2.2 s three steel plates, one per word, clank into place (0.6 s each, a 2 pt shake) while the weighbridge display counts kilograms with the load; 2.2 to 2.9 s a small crucible under its hood pours a glowing bar beneath the title; 2.9 to 3.5 s the bar cools to brass in 0.8 s (faster than the game's 3 s, drawn so), the display shows the final weight, the gate opens. While atlases still bake, a calm loop holds (the magnet swaying, the display ticking), never a freeze.

**Icon and store set** (ruling 14): copper and the pour, never a lone gold bar or a truck, judged at 60 px beside the four icons: (a) a gloved hand with a copper coil against a ticket stripe; (b) a crucible pouring, a coil behind; (c) a magnet lifting a coil over rust. Screenshots, the house's first landscape set: the game full-bleed, the caption on a short ticket stub torn at the lower left, proportional type, at most five words, judged at tile size beside the four sets before it is coded. The first shot shows stripped copper, the ticket and the pour in one real frame: the first-yard document places stripper, weighbridge and crucible pad within 21 m, bays and dated board in view.

**Voice `weighbridge-plain`**: short plain sentences in the trade's words with the foreman's dry warmth; no puns, no exclamation marks, no green claims. Never: bet, stake, odds, invest, tips, returns, jackpot, win, prizes, ticker, share price, order book, "order" for sell notes, shift, freight, cargo.

**Sound**: a new pack in `games/scrap-yard/assets/sfx` (`soundPack: null`): a drop per material (steel clunk, copper dink, brass ring), grinder, torch, the weighbridge's beeps and printer, the pour, a ship's horn; haptics on each lot. Music: "yard radio", an original 92 bpm guitar-and-bass loop over the game's own metal hits.

---

## 12. Promises, tests and aims

### 12.1 Hard promises (gates from the first run)

1. **Shown equals applied**: every sale, deal, booking, label and purchase applies what its card showed; a changed step re-asks; one rounding function.
2. **Where money comes from**, a closed tested list: lot collections and sales, deliveries, exchange and consignment sales, tolling and take-back fees, ad rewards, and the away pass of these. It goes only to purchases and levels, feed, reagents, carriage and insurance, prepaid storage, the exchange fee and the duty.
3. **Nothing lost, nothing taken**: no cost by the clock; full buffers stop feeders; built things never vanish; no rank falls while away; nothing bought has unknown contents.
4. **No dead end**: with §0 and empty bays the gate tip pays within 60 s; every amount asked for is reachable and never met by doing nothing; a purchase that changes nothing is refused with its reason.
5. **The clock**: live time monotonic, the market clock never backwards; a jump never pays twice; looking ahead gains nothing on one device and at most the foresight bound anywhere, on money only; the away pass equals a 10 Hz replay within 0.5 % on frozen content.

### 12.2 Tests (vitest, frozen test content)

Mass with reagents (contained metal for hydro); tonnes capped at input mass; cut times; pickup order; the priority split; Hold, reservation, the round; the away pass against the replay across steps, batches and cash-gated skips; `sell(lotId, n)` at boundaries; two clocks and a clock-back; shortfalls charging nothing; range per rung; rivals; payback and ceilings; a skip-to-plate bot gains zero; converter source ids; labels equal weigh-ins; the server bound (7.5); the weekly split and ceiling; 30 members under parallel joins; deletion; content-hash valuation; V under 2^53.

### 12.3 Measured aims (bands set by the lead from the measured table)

| Aim | Measured by |
|---|---|
| First ticket ≤ 25 s; copper jump ≤ 1:30; first helper ≤ 5 min (slow ≤ 9); truck 8 to 10; first pour 18 to 25; rung 3 at 55 to 65 (slow ≤ 90); income ≥ spend every minute of the first 15; ≤ one purchase prompt a minute; the next purchase ≤ 3 min away in hour 1 | prototype, bots at three hands |
| The hand's worth and its three-fifths limit; hand work per sitting (3.4) | bots at rungs 3, 6, 8 |
| Rung days (6.1); rival gaps ≤ 3 days after week one; next capacity purchase ≤ 2 sittings away (twice a day); cash on hand ≤ 2 τ_r of income except when saving for a site | prototype, bots |
| Steel-max bot stalls at rung 4 or 5; skip-only bot supplies zero | bots |
| Market: reader +3 to 7 %, nothing above +8 %, foresight ≤ +25 %, peeks ≤ 0 on one device, the gap open 2 to 4 times a week, stage-1 Hold (day-word bot) ≤ +3 %, reader at rung 7 ≥ 0.5 day sooner | market bot |
| Transport gates (5.4) | stage-4 bot, people-like players |
| Fairness: credited always-on (16 h open, hand used) ≤ 1.25 × twice a day; ad watcher ≤ 1.15 × at day 14; B buyers' weekly ranks match non-buyers' in the band | bots |
| Company order at 100 % for 60 to 75 % of simulated active companies | local stand-in |
| Stage-1 tick < 1 ms; 12 h away on five sites < 50 ms; `?yardStress=1` read on the iPhone | the owner's phone |

### 12.4 Who measures, in what order

A numbers prototype (scratchpad `proto/`, starting from `ladder3.py`) runs sections 3 to 6 first and reports every (proto) number with the smallest failing example; then the rules on frozen content, the bots, the screens. **Bots play at a person's pace**: the normal hand reacts in 0.8 s, wastes 25 % of its path, looks 6 to 15 s at a card and spends 85 % of income on capacity; the fast hand 1.3 × (0.4 s, 10 %); the slow 0.7 × (1.2 s, 40 %, leaves goals unfinished). Habits: twice a day (two 8-minute sittings after a first day of an hour), 45 minutes a day (three sittings), three hours a day (three of an hour), always on. Pacing is chaotic (market-design.md M30): an aim is met when 13 of 15 seeds meet it, checked on 5 unseen seeds. **Three people-like players play stage 1 on a phone before any tuning.**

---

## 13. Risks and open questions

1. **An exponential economy** under the payback rule is sensitive (rung 9 moves 2 days between 80 and 85 % spending): τ_r is the lever, the ceilings only guard.
2. **The hand's worth** stays the least certain number; if it fails, raise lots and crate before cutting crew rates.
3. **List B's Early cover** (8): the all-time board is not protected.
4. **Fingerprint**: the weighbridge must read as lots a merchant collects, not a sell pad; stage-4 places against Orbit's routes.
5. **Crowded theme** (Junkyard Keeper, Salvage Empire): copper, ticket and pour first; never a tow truck or crusher.
6. **Phone-only failures** (`Modal`s, the stick at edges, worklets, atlas memory): checked on the iPhone in stage 1. **Scope** 59 to 72 k lines.

---

## 14. Lead decisions

These override the text above where they differ. Decisions are numbered and dated; the reason is given so that a later engineer can tell a decision from an accident.

**Decisions of 25 November, on the revised specification and its open questions.**

**D1. The ruling stands in the text.** `RULING.md` (16 points, written after three designs and three judges) is part of this specification. Where a critic argued against a point, the outcome is below.

**D2. Weekly brackets** are placed at the week's start by daily capacity and bounded by a daily credit ceiling (7.3), as the revision has it. Re-banding during a week is not built.

**D3. The clock.** Ruling 8's sentence becomes: on one device, looking ahead by changing the clock gains nothing; a player who learns tomorrow's board from elsewhere (a second device, a fan page: the prices are the same for everyone and can be computed) gains at most about a quarter more money and never rank. This is a measured aim, not a promise.

**D4. The hand's worth** has two aims at rungs 3, 6 and 8: at least a fifth more income for the player who uses the worker, and each rung reached at least a tenth sooner. No mechanism gives more than three fifths of the gain.

**D5. The capacity ceiling per rung is a guard**, not the pace: the pace comes from the payback rule (what adds capacity costs a number of hours of the income it earns). A normal player should rarely meet the ceiling, and the next purchase of capacity is always within two sittings.

**D6. A company's weekly order** is fed by lots that members send to lines they have claimed, priced like a deal. This counts as "normal deliveries" in the ruling's sense: nothing is asked that a member would not sell anyway, and the choice of line is the member's decision.

**D7. Ad rewards** are capped at 4 % of a day's income and give currency only.

**D8. Tickets.** Metal coming in carries "Seller ID checked · paid by transfer"; a lot going out names its buyer, "weighed out · paid by transfer". The site licence hangs in the cabin from the first minute; rungs carry no job titles that imply the yard was unlicensed before.

**D9. Stages.** The uplands site and the carbide plant move to stage 6, as the revision has it, to keep stage 4 in hand.

**D10. The copper jump** in the first ninety seconds comes from stock the yard starts with (a bundle of cable and a hand stripper that came with the yard), needing no purchase. The first-yard document owns the minutes; the prototype decides them.

**D11. The stage-1 car keeps its catalytic converter**, sourced as the revision has it (a papered, depolluted end-of-life car from a named partner; the ticket says so; a test refuses a converter with any other source). It is the hour's last beat and the first sight of the precious metals. If the first-yard prototype shows it floods the hour with cash, its payable falls, not its paperwork.

**D12. Feel is measured, not specified.** The delay before work starts, the truck's speed and turning, the camera's lead: the world engineer sets them with people-like players, under two tests that do bind: walking past a thing never works it, and stopping beside it always does within half a second.

**D13. Names.** The names register (`scripts/content/yard/names.json`) is the one source of every invented name, the currency's included. A name in this document that the register has changed is wrong here, not there. Names a player sees must be short and plain enough for a reader of English as a second language to say right the first time.

**D14. The range gate** scales with the rung, and its share may be smaller for the precious metals than for the base metals: the prototype sets it so that a steel-only climb stalls by rung 4 or 5 and no gate asks for more of a metal than the game's own sources can give at a person's pace.

**D15. Money.** Until the owner chooses, the game is built to list A (no ad videos, looks, a plaque), and nothing in the economy is tuned to need list B. If the owner chooses list B it ships without "Early cover" (the away hours that play earns later), because that one product leaves a buyer far ahead on the all-time board for weeks; the store sentence is then rewritten to say plainly what a purchase brings forward.

**D16. The process board** (the tree of unit processes, with bought nodes lit) is the game's progression screen from stage 1, where its first branch is the stripper, the motor bench and the crucible. The rungs are positions on the industry table, shown on the chip and the notice board, never a screen of titles.

**D17. Length.** The document may stay at about 11,000 words; each later stage gets its own document, as the first yard has.

