# Scrapyard: specification of the whole game

Status: revision 2, 25 November 2026 (`spec-master`, after the builder, store and trade reviews): the "hand" design with the judges' grafts, under the lead's ruling (`RULING.md`). **[26 Nov]** Amended on 26 November 2026 (`design2-write`) to the owner's decisions of that day (wishes 13 to 17: purchases limited to looks and scrip, bank loans, investments, yard sales, companies in the manner of neighbourhoods) and the lead's ruling on them (`yard-decisions.md` part 6; D20 to D68 in section 14). Every changed passage starts with **[26 Nov]**. **Section 14 (the lead's decisions) overrides the body wherever they differ.** The first yard's own document **owns every stage-1 number**; stage-1 figures here are its inputs. **[26 Nov]** Revised once the same day (`design2-revise`) to the lead's rulings on what the writer and the critics found (`RULING2.md` section 9, copied into `yard-decisions.md` part 6 as its section 9; D69 to D83 in section 14) and to the two critics' further findings (D84 to D101). Game folder `games/scrap-yard`; mode `salvage`; landscape; save key `save:scrap-yard:salvage1` (replaces the ground work's `salvage0`).

Conventions:
- **[26 Nov]** "§" is scrip, the one currency (the names register's `currency`; earned in play and, from rung 4 where a country's switch allows, sold in packs of hours of the buyer's own rated income, 8.3); "m" a metre of the ground plane; "pace" a person's hand (the normal bot, 12.4).
- **(tune)**: a starting number only the content script may move, inside its range, to meet section 12; a range is never widened silently. **(proto)**: the numbers prototype confirms it before rules are built on it. Rules tests run on frozen test content.
- The only home of numbers is `src/config/salvage.content.ts`, written into game.json by `scripts/content/build-yard.py` with the balance bot.
- Rules: pure TypeScript in `src/engine/salvage/`, 10 ticks a second, no `Date.now` or `Math.random`, mass in integer grams, money in integer hundredths of §, one rounding function `roundMoney`. Amounts from §100,000 show with three significant figures and k, M or bn.

---

## 1. The game and its fingerprint

### 1.1 The game in five sentences

1. You take over a run-down, licensed scrapyard on Kettle Lane and steer your worker with one thumb: stop beside a washing machine or a cable drum and it comes apart, piece by piece, onto the stack on your back.
2. The weighbridge prints a ticket by grade and net weight at the day's posted price (light iron at half a scrip a kilo (§0.50), bare bright copper at seventy times that), each grade goes into its bay, and the merchant's flatbed collects every bay you have not held for a better day.
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

Planned: 8 of 8 musts against each game; 18 of 19 against Pizza Empire and Proudly Adequate, 19 against the others; **nothing counts until measured**. **Kinships, written openly in REVIEW-NOTES**: rows 11 and 12 reach Jaccard 0 by their ids, while crews are the others' managers and ministers and the company order week is near Proudly Adequate's campaign week. A person must see: a delivered lot on a named partner's lorry with a business card, never a glowing object (Orbit's bonanza rock); the rung as a sign the crane hangs, no promotion words; the process board, not a title ladder or star map, as the progression screen. Dimension 17 is measured against Orbit (strings name grades, never bare metals) and Proudly Adequate (dry and plain sits near deadpan-memo); 2, 4 and 13 again on stage-4 screens. **[26 Nov]** Three kinships with the neighbourhood model the owner named are written there too (yard-social.md 6.2, D82): classes of companies of like size (its groups number fifteen; ours about twelve, formed afresh each week, never ranked); a monthly easier week (ours is "Inspection week" in player text, the order at 60 %); members of the public buying from a yard (its sale event sells decorations; our "Yard sale" sells only single things fit for reuse, with no sale event and no sale time).

**What stage 1 shows for each must word** (within ten minutes): *steer*: the stick walks the worker across a yard three screens wide; walking into the truck drives it out of the gate. *separation-tree*: the first washing machine splits into light-iron panels, a whole motor and a concrete counterweight (to the rubble skip, worth nothing); the stripper splits cable into copper and PVC, the crucible a charge into ingot and dross. *three-quarter-world*: the oblique yard, the camera leading, the lane beyond the gate. *graded-lot-sale*: ticket lines by grade, net mass and posted price; bays by grade, each showing Hold from the first lot; Tamberlow Metal Merchants' flatbed collecting every bay not held every 30 s (tune 20 to 60), "Lot sold to Tamberlow"; the board with its date, five days of history and a day word.

**[26 Nov] Purchases and currencies** (the IAP product-kind check of `scripts/lib/fingerprint.ts`; section 8). One currency, scrip (§), earned in play and sold only as hours of the buyer's own yard's rated income: no second, paid currency, unlike Pizza Empire's and Orbit Haulers' gems. Product kinds, from stage 2: `cosmetic` × 11 (six fleet colours, four yard-dressing sets, the founder's plaque), `skipAds` × 1 (No ad videos) and a new shared consumable kind `hoursOfIncome` × 4 (the scrip packs, granted through the mode's own money rules by the contract hook `grantProduct`, D96; never the shared `timeWarp`, which pays a moving average, D29). No bundle in stage 2 (D70). No `multiplier`, `gems`, `timeWarp`, `deal`, `unlock`, `clearance` or `starterPack`: the sequence differs from all four games' (Pizza: noAds, skipAds, multiplier, gems, timeWarp, deal; Orbit: clearance, unlock, starterPack, gems; Lantern Row: cosmetic, unlock, skipAds; Proudly Adequate: unlock, cosmetic, skipAds). The new systems of stage 2 and 3 (plant finance, the reuse rack, a partnership) join row 12 as new meta words (`plant-finance`, `reuse-rack`, `partnership`), keeping Jaccard 0; measured when game.json carries them.

---

## 2. The world

Invented world, real trade (L2): two countries across an ocean stand for the owner's "London" and "Shanghai" without naming or imitating either.
- **[26 Nov] Westholm** (the West; register names, D13): capital **Bellmarch** with the **Bellmarch Metal Exchange** and the listing venue [listing venue] (7.4); home district **Oakbridge Vale**, home yard **Cinder Lane Yard** outside **Oakbridge**; **Saltreach** (deep-water port, 220 km west), **Flint Ridge** (uplands 380 km north, aerospace and toolmaking).
- **The Sennath Union** (the East), 9,000 km by sea: port city **Kaymor** with the **Kaymor Metal Exchange**; **Ambrel Coast** (battery and electronics makers), **Kaymor Point** (refinery headland and airport).
- **[26 Nov] Scrip (§)** (the register's `currency`), one currency, at about §3 to the US dollar in the trade's proportions (yard-metals.md 3); no number is presented as a real quote. The ratio of about §3 to the dollar is internal to the content script and is never shown to a player (a pack's scrip per dollar differs by yard and by hour, 8.3). Help says once: "Building costs and times are shortened so the business grows in days, not decades; metal prices keep their true proportions."
- **Lanes.** Kettle Lane runs past Hob's and Ruddock's to a weight-limited bridge that the second hook-lift tier (stage 2) crosses to Larkin's and Pell Street. Every later site has its own lane, the rarer material further out (5.5).
- **People.** The boss is unnamed; crew have first names and role vest colours; partners appear on business cards (Hob Garnett, Rosa Ruddock); rivals are firms, never people.

**Every invented name, to the names register** (ruling 14: searched in trademark and scrap-trade company registers, both stores and the four games' content before art or text is built on it; no near-miss of a real company, exchange, port or town):

| Kind | Names (first choices) |
|---|---|
| Title | **Scrap to Ingot**, subtitle "Scrapyard & Metal Tycoon"; fallback **Heavy Melt** |
| Places | Calvany, Bellmarch, Quillon Vale, Quillon, Kettle Lane, Saltreach, Varn Ridge, Sennath Union, Kaymor, Ambrel Coast, Kaymor Point |
| Markets | Bellmarch Metal Exchange, Sandport Metal Exchange, **[26 Nov]** the listing venue [listing venue] (player text never says "shares", D24) (no abbreviation anywhere: screens, keywords, screenshots) |
| Currency | **[26 Nov]** scrip, § (register) |
| **[26 Nov]** Money and finance (placeholders until the names desk) | the plant-finance lender [bank]; six fleet colours [colour 1] to [colour 6]; four yard-dressing sets [set 1] to [set 4]; the reclamation dealer [reclamation dealer]; the merchant's advance and the site loan are named by their role. The shop, the scrip packs and the weekly order are named by their role; the monthly easier week is "Inspection week", the reuse rack's card "Yard sale" and the company's requests "Requests" in player text (D76, D80, D82). |
| Local partners and buyer | Hob's Farm Clearance, Ruddock Demolition, Larkin's Garage, Pell Street Plumbing, Quillon Foundry Co-op; Tamberlow Metal Merchants (short form Tollbridge; stage-1 buyer, not a rival) |
| Regional firms | Durnav Steel (an electric-arc mill), Ostro Cable Works |
| Corporations (logos drawn) | Vantorra Electronics, Veyra Motors, Aldane Aerospace, Brannick Tooling, Quenwick Electrolysers, Meridane Glass |
| Rival firms (25) | 6.2: invented compounds, not surnames |

**[26 Nov]** Every name in this document is the register's current name (`byId` in `scripts/content/yard/names.json`, D13, ruling 9.15) or a placeholder in square brackets; where the two ever differ, `byId` is right. Orbit Haulers' names and the words "salvage" and "haul" never appear in player text.

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

In stage 1 the hand is the main producer. From stage 2 its rewards scale with **I**, **[26 Nov]** the rated income in § an hour defined once in 8.1 (from assets, the binding step counted, never from recent sales; "μ minutes of I" is μ ÷ 60 × I), fixed when a reward is created so its card shows what is paid. Capacity is bought with money (6.3), so a hand that earns more also climbs faster.

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
- **The board shows** price, 24 h change, 14-day history, stocks, a word for cash against forward (**shortage now**, **balanced**, **plenty**), bulletins and the gap as a sentence ("Kaymor pays 3.2 % more after carriage and duty"); no future chart. **[26 Nov]** Help carries one sentence for everything pretend (ruling 9.14), which also shows on first opening the board and the listing: "Prices, exchanges, loans, partnerships and listings in this game are fictional and use scrip only. Nothing can be paid out, and nothing here is financial advice."
- **The player can**: sell to a dealer, or registered lots on an exchange from its warehouse; ship (5.4); sign deals (5.3); write a **sell note on a bay** ("Sell this bay when the board reaches §X", filled at the first step at or above X at that step's price, also away; never listed as open orders); store **prepaid** for 7 or 28 days (then stock waits). No buying, bets, leverage, shorts, futures or options.
- **Shown equals applied**: every card carries its step (`sell(lotId, n)`); a changed step re-asks "Price updated: a → b".
- **Signals**: stocks lead the pattern by about a day (right about 70 %), the word, bulletins, the gap. **Bot gates**: a pattern reader beats selling at once by 3 to 7 %, nothing by more than 8 %, foresight by at most 25 %; on one device, peeking ahead gains nothing (clockHigh moves for good). A second device or a fan page shows tomorrow's shared prices: that is the 25 % bound, on money only, never on rank.

Better selling buys capacity sooner (6.3): the pattern reader reaches rung 7 at least half a day sooner (12.3).

### 5.3 Partners and deals

**The gate tip** rules out a dead end: an item every 40 s while fewer than 8 wait, the first at 0:40 (washer 45 %, bicycle 20 %, radiator 15 %, heavy cable offcuts 8 %, brass taps 7 %, copper cylinder 5 %; never a converter or sealed vessel), each signed in. **Opening stock** (the first-yard document owns it; proposed): a 12 kg bundle of heavy cable offcuts by the inherited stripper, four washers, two radiators, a cast-iron bath, six brass taps, a copper cylinder "certified empty", the old car behind the torch rack; cash §0.

**Supplier skips**: **contents are fixed when a skip fills** (a counter hash) and printed on its label by grade and kilogram, with the price, before anyone hooks it; the weigh-in equals the label. **[26 Nov] Nothing bought, with scrip or money, has contents unknown at purchase.** Price: k = 0.70 (tune 0.60 to 0.80) of its as-found value at the day's prices, so the margin is honest sorting, cutting and stripping; the driver hooks it only if cash covers it. **Supply deals**: "q t a day of grade g for D days at §p, locked at signing", p = 7-day average × (1 + local 2 %, regional 3 %, corporate 4 %; tune), drawn at 00:00 UTC from reserved stock; a short day is paid for what was delivered and trust (0 to 100) falls by 10, a full day adds 5; **nothing is charged for a miss**; trust gates regional deals at 60, corporate at 80.

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

`paysOnCompute: true`, `catchUpSeconds: 0`. A = min(t_m − max(lastSaved, clockHigh), Cap), one A for all sites. **Cap**: 4 h; 6 h with the **Night watch** (office, §3,000, stage 1); earned 8 h at rung 4, 10 at rung 5, 12 at rung 6. **The closed form**: each site is a graph, sources (gate tip; skips gated by cash; take-backs) → cutting → carrying → machines (rate × level or a batch's mean) → bays → collection, delivery or consignment; between events each flow runs at its bottleneck, split by the priority rule (3.3). A segment ends at a buffer full or empty, a cash threshold for a skip, a batch's doneAt, an arrival, a deal delivery, a sell note's fill, a dealer posting and **every price step**. Within a segment revenue is mass × price per grade exactly; money and tonnes are added in time order; the live tick uses the same rate functions. The boss's rewards never happen away. A negative-margin line pauses; full buffers stop feeders. The result is paid when computed and recorded under clockHigh, so a jump never pays twice. **Known local limit**: moving the clock forward pays the cap at once, again if repeated; online, ranked tonnes are bounded by server time (7.5). **What the player finds**: the yard moved on, and the away card as a ticket roll ("Away 3 h 12 m (cap 4 h)"; a line per grade; "41.2 t supplied · §148,200 (already in your account)"; "You passed Kolbeck Recycling."). **[26 Nov]** The away card carries no ad button and no shop button; it lists what plant finance took from the absence's lots ("To [bank]: §y") and what the rack sold. The away bonus (8.6) is offered on its own small card after the away card is closed and is half of the away cash that reached the player after the bank's share (ruling 9.9).

### 5.7 **[26 Nov]** The bank: plant finance (stage 2, from rung 3), the merchant's advance (3), the site loan (4)

The owner's "bank loans" (wish 14), in the form of D23 and D37 to D42. **Every loan is repaid only out of sales, never by the clock**: no due date, nothing that grows, no "repay now" button, cash never below zero, no shop or ad on any card that shows a debt, and no ad button on screen while such a card is open (D77). ECONOMY E11 is amended by name: "No credit in the first hour's shop: tools, carriers, crew and the first machines are bought with cash. From rung 3 the bank's plant finance exists, on works plates only."

**Plant finance, the rules** (content `bank.*`; (tune) as marked; the form is fixed):
- **Lender**: one invented lender, the plant-finance desk of [bank].
- **What**: a works plate p that earns, that is a machine with its own output grades out(p), priced P ≥ `bank.minPrice_h` (0.5) h × I. **[26 Nov, D84]** In stage 2 a plate is financeable only if none of its output grades is an input of any machine in the stage's content (`bank.financeable`, a content check of `build-yard.py`): a plate whose output another machine takes would never make a lot of its own grades, and its debt would never fall (the smallest case: the battery breaker, whose lead goes on to the rotary smelter; with one agreement allowed, Finance would then be shut for the rest of stage 2). The content keeps the baler's bales a sold grade (the rotary furnace takes loose cans and twitch, never bales; a decision of this revision). Nothing else is ever financed: no tool, carrier, crew, level, skip, site or look.
- **How much**: the card offers one figure, F = min(`bank.maxShare` (0.8) × P, F_max), F_max = min(`bank.maxF_h` (2) h, `bank.maxF_tau` (0.15) × τ_r) × I. The player pays the deposit d = P − F ≥ 0.2 × P now, and the deposit never takes the reserve kept for the driver's next load (E19, E29): if cash − d < reserve, Finance is refused with that reason ("Kept for the next load: §x").
- **What it costs**: a flat charge c = `bank.charge` 0.08 (tune 0.05 to 0.12) of F, fixed at signing. Total owed T = roundMoney(F × (1 + c)), printed on the card.
- **How it is repaid**: on every payment V for a lot of a grade in out(p) while O (owed, from T down) > 0, the bank takes min(roundMoney(s_p × V), O) before the rest reaches cash. **[26 Nov, D84] A payment** is every channel that pays for a lot of that grade: the round's collection, a held bay's Sell, a sell note's fill and a deal delivery in stage 2; from later stages an exchange lot, a consignment's arrival, a delivery to the company order and help paid by the game to a helper (the closed list of 12.1.2). A sale at the gate and the reclamation van sell things, not grades, and are never shared. **[26 Nov] The share is set per plate** (ruling 9.8, D76): s_p = min(`bank.share`, u_p), u_p = 1 − (the value at p̄ of the input a kilogram of output takes) ÷ (the value at p̄ of that kilogram of output), computed by `build-yard.py`, so that a financed kilogram never nets less than the same kilogram unprocessed; `bank.share` starts at 0.18 (tune 0.15 to 0.30) and the bots raise it only while that holds. The baler's u is 1 − 0.50 ÷ 0.62 = 0.194, so its s is 0.18. The card prints the share that applies. The sum taken equals T exactly (the last take is what is left). Nothing is taken from the yard's other trade, from ad rewards, from bought scrip or from rack sales. A plate that stands idle pays nothing, and its debt stays as it was.
- **How many**: one agreement at a time in stage 2 (`bank.maxAgreements` 1); in later stages the shares of all open agreements together never take more than `bank.maxTake` 0.4 of any one payment.
- **Time away**: the same function (E5, E17): lots collected while away repay by the same share; the away card lists it.
- **Save**: the agreement `{plate, P, F, c, T, taken}` is in the save and changes the contract's version; the review notes carry one line: "Loans in the game are fictional, in scrip, and pay nothing out."

**Worked example** **[26 Nov]** (rung 3 at its entry, I about §54,500 an hour, 8.1; τ_3 = 9 h): a baler at P = §80,000 (above 0.5 h × I = §27,250). F_max = min(2, 0.15 × 9 = 1.35) h × I = §73,575; F = min(0.8 × 80,000, 73,575) = §64,000; deposit §16,000; c = 0.08, charge §5,120, T = §69,120; the baler's share s = 0.18. A lot of 1 t of baled light iron at §0.62 a kilogram pays §620: "Paid §620 · to the bank §111.60 · to you §508.40": a kilogram through the financed baler nets §0.508, more than §0.50 loose. T is paid after §384,000 of bale lots (about 619 t of bales). At rungs 4 and 5 (τ 22 h and 45 h) the 2-hour bound binds: F_max = 2 × I.

**What the player sees first**: the lender's letter (a centred card, once) the first time a works card costs more than the cash in hand while the deposit is in hand. On the works card from then on **[26 Nov]** (ruling 9.7, the owner's words): the button "Bank loan" beside "Save up (about x)", x = (P − cash) ÷ I in hours and minutes (only the time is "about": every other number is applied as shown). The card's lines, for the worked example with §18,000 in hand: "Price §80,000 · You pay now §16,000 · The bank pays §64,000 · Charge §5,120 · You repay §69,120", then "18 % of each bale lot goes to the bank until it is repaid. No date.", beside "Save up (about 1 h 8 m)". After signing: a tag and a ring that fills on the machine; on every ticket for its lots "Paid §x · to the bank §y · to you §z"; the office's "Agreements" page. **A debt never shows in the top bar, the goal card or the advice line**; "A loan suits a machine that earns." is the only sentence the advice line ever says about it.

**[26 Nov] Ads and the bank never meet** (ruling 9.9, D77): the spot buyer is never offered on a grade in out(p) of an open agreement; the away bonus is half of the away cash that reached the player after the bank's share, paid as its own line and never part of a payment V; no ad button stands on screen while a card or ticket that shows a debt is open (the bottom bar's ad button hides); the shop's entry sits on the office's first tab, never on its Agreements page.

**Tests** (frozen content): the sum taken equals T exactly; cash never below zero; tick equals jump with an agreement open; time away repays by the same share; an idle plate's debt unchanged; a second agreement refused in stage 2; the deposit refused when it would take the reserve; ticket lines equal what is applied; no ad and no shop button on any card or ticket showing a debt, and no ad button on screen while one is open (screen tests); the save migrates an open agreement; **[26 Nov]** the content check refuses a financeable plate whose output another machine takes; every channel of the payment list shares and no other does; s_p ≤ u_p for every financeable plate (a content check); the spot buyer is never offered on a financed plate's grade.

**Aims** (bots, before the screens; 13 of 15 seeds): (1) the sum taken equals T exactly; (2) cash never below zero; (3) tick equals jump with an agreement open; (4) with an agreement open no bought load loses money at any rung, else s falls; (5) a bot that always finances reaches rung 5 at most a tenth sooner than one that never does; (6) by the card's own numbers (finance is better when the plate's ΔI × the "Save up" time exceeds c × F) finance is the better choice on a quarter to a half of the purchases where it is offered; (7) added at writing, as the worked example's reading of (4): while financed, a kilogram through the financed plate nets at least what it nets without the plate (**[26 Nov]** ruling 9.8 makes it hold by construction, s_p ≤ u_p).

**Later forms.** Stage 3, **the merchant's advance**: a sum A from a named buyer, a charge fixed at signing (total printed), repaid from every lot of the advanced grade whoever buys it, by the same share rule; no delivery date and no penalty. **[26 Nov] For stage 3's specification** (D84): the advance has the intermediate plate's hole; the smallest case is an advance against No.2 copper whose grade the player then runs into the anode furnace, so that no No.2 lot is ever sold and nothing is repaid while the advanced scrip is already spent. Stage 3 closes it by refusing an advance on a grade that any machine the player owns or can buy takes; taking the share instead when the grade's mass leaves its bay (at the step's posted price, held as owed and taken from the next payments so that cash never goes below zero) would change a point the ruling fixed in form and is for the lead. Stage 4, **the site loan**: repaid from that site's payments by the same share rule; and a **grant** with conditions the player can see and meet (a certificate, a tonnage), never by a date. **The server** (stage 5, 7.5) bounds a client's claims by: assets + cash ≤ gross earnings + verified pack grants + financed − repaid (repaid = shares taken, charge included).

### 5.8 **[26 Nov]** Partnerships (stage 3), a passed rival's yard (stage 4)

The owner's "investments" (wish 15), in the form of D24 and D43 to D47 as amended by D76 and D78. **Words** (ruling 9.7, the owner's own "partnerships"): "Partnership with [partner] · step 1 of 3", "terms", the ticket line "Partner terms: −§x"; the office's page for loans and partnerships is "Agreements"; Help's one sentence for everything pretend (5.2). Player text never says invest, returns, shares, stock (for a holding), dividend or stake, and never "part" for a holding (in a scrapyard a part is a car or machine part) (11).

**A partnership, the rules** (content `holdings.*`; stage 3, offered on the partner wall from rung 4). **[26 Nov]** Its form is chosen by stage 3's specification and numbers prototype among the three of ruling 9.10 (better terms within E20; first pick of the partner's loads; a share of the foundry co-op's premium on what the player delivers), each step paying back in 0.8 to 1.5 τ by the card's own numbers; nothing of it is built in stage 2 (D78). The rules below are the first candidate:
- One partnership per partner, in up to three steps k = 1, 2, 3. It returns only as **better terms on real trade with that partner**: for the lane partners (Hob's Farm Clearance, Cottle Demolition, Parfitt's Garage, Tap Street Plumbing) δ_j ÷ 3 off the label price of that partner's loads per step; for Oakbridge Foundry Co-op (a **membership**) m = `holdings.coop_m` (0.01, tune) more per step on the deliveries of its supply deals.
- δ_j = min(`holdings.maxOff` 0.10, δ_E20(j)), where δ_E20(j) is the largest discount at which E20 (restated, D44) still holds for partner j's load at p̄: (prepared − as found) ≥ 0.6 × (prepared − (1 − δ) × label price). `build-yard.py` computes it from the loads' contents; **[26 Nov]** where it is below zero it is clamped to zero and no partnership with that partner is offered (the refusal would have refused the shipped first-yard content: Hob's load gives δ_E20 = −0.042).
- **Capped to the trade when bought**: step k fixes Q_k, the loads of j bought (for the co-op: the kilograms delivered) in the market day before the step is bought, at least one. Each market day, step k's terms apply to at most Q_k loads (kilograms). Raising the flow later never raises the benefit; only the next step does.
- **Priced by the payback rule on that trade**: price_k = τ_r × (δ_j ÷ 3) × P̄_j × Q_k ÷ h_d, P̄_j the mean label price of j's loads that market day and **[26 Nov]** h_d the yard's production hours in that market day (τ_r is counted in production hours, so dividing by 24 market hours made a step pay back 1.5 to 2 times too fast for a twice-a-day player) (the co-op: τ_r × m × p_deal × Q_k ÷ h_d).
- It is never resold and never lost; it pays only on loads actually bought (deliveries actually made); it never adds tonnes; nothing bought with money touches it except through scrip at play's prices. The weighbridge ticket prints "Partner terms: −§x".

**Worked example** (first-yard content, rung 3, τ_3 = 9 h): Cottle Demolition's skip, label §1,842, prepared §2,689, as found §2,167 (k = 0.85). Without a partnership, the margin is §847 and §522 of it (0.62) comes from work. δ_E20 = 1 − (2,689 − 522 ÷ 0.6) ÷ 1,842 = 0.0125: **the restated E20 allows 1.25 % off this load, not 10 %** (Hob's Farm Clearance's skip, §958 against §1,320 prepared and §1,127 as found, gets 0.53 from work already and so no partnership at all with today's content). With δ = 0.0125 and Q_1 = 48 loads a market day: a step takes §7.68 off a load ("Partner terms: −§7.68") and costs 9 × 0.00417 × 1,842 × 48 ÷ 12.3 = §270 for a twice-a-day yard at rung 3 (12.3 production hours a day). The prototype settles it before stage 3 is specified (risk 13.8). The co-op at the first yard's deal (200 kg a day of cast iron at §0.969) gains §1.94 a day a step: holdings matter only at stage 3's deal sizes.

**A passed rival's yard** (stage 4, on the key board from 30 kt): a simulated firm the player has passed may offer one of its yards, priced as a site (5.5: about `sites.price_h` 6 h of I where it opens; at the first yard's I that would be §327,000), with its old stock in heaps (hand work at once); its tonnes count for the player from the day bought; the rival's row stays on the table and never passes back (D19). Simulated firms only, never players.

**Not built**: a resale of anything; a price or a return set by chance; a deposit that pays by the clock; leverage; anything in another player's company; a company pot or project paid in scrip. If a company build comes in stage 5 it is paid in delivered tonnes and gives a look only; it is the first thing cut.

**What the player sees first**: at rung 4, on the partner wall, a "Partnership with [partner] · step 1 of 3" row on each partner's card with its step price, the terms it gives and the loads a day they cover ("1.25 % off up to 48 loads a day"); the office's "Agreements" page lists the partnerships and the bank's agreements.

**Tests**: the benefit applies only to loads bought and at most Q_k a market day; a step's price equals the formula at its frozen inputs; E20 holds with every partnership step owned (content check); tick equals jump. **Aims**: each holding pays back in 0.8 to 1.5 τ_r; all holdings together add at most a tenth of a day's income at day 14 (prototype); no holding changes tonnes.

### 5.9 **[26 Nov]** Yard sales: the reuse rack and the sale at the gate (stage 2, from rung 3)

The owner's "yard sales" (wish 16), in the form of D25 and D48 to D54. Between players nothing is ever sold at a price a player sets. **[26 Nov] Words** (ruling 9.7, D76, D94): the place's card is titled "Yard sale" (the owner's word, for our own thing: the public buys things fit for reuse from a scrapyard); it never sells looks or decorations and has no sale event and no sale time. In player text the place is never "the rack", which is the first yard's tool rack; its place id is `reuseRack` and its content keys are `reuse.*`.

**The rules** (content `reuse.*`):
- **Where**: a rack under a canopy by the gate, new at rung 3; the first yard's map before rung 3 does not change. `reuse.slots` 6 (tune), levels of the rack +2 each, three levels (the last thing cut, 9).
- **What is reusable**: single real things of the kinds `reuse.kinds` lists: the cast-iron bath, the cast-iron radiator, the bicycle, the crate of brass taps, the stove, gates. A thing is reusable when h(worldSeed, 'reuse', thingId) < f_kind (`reuse.share`, 0.25, tune 0.15 to 0.35), fixed when the thing is made; a green tag shows it before any choice ("Reusable · §261 at the gate · §105 as scrap"). Never racked: anything electrical or sealed, cylinders, batteries, converters, car parts.
- **The hand**: standing beside a tagged thing lifts it whole onto the carrier instead of cutting it (if the carrier can hold it); walking into the rack's chalk zone sets it on the first free slot. **[26 Nov, D95]** Yard hands carry tagged things within their load (`crew.hand.load`) to the rack while it has room, whether the boss is in the yard or away (for tagged things this replaces the first yard's rule that yard hands carry whole things only while the drop-off is full or the boss is away, stage-1 12.6; untagged things keep it). A tagged thing that no carrier present can lift (the 110 kg bath while only yard hands are there), and every tagged thing while the rack is full, is cut as any other, and its tag says so; so tagged things never block the drop-off while the player is away.
- **The sale**: a member of the public comes on foot, an agent on dated legs off the drive line (gate, rack, gatehouse window, gate), while the rack holds anything, the same whether the player is there or away. The visitor takes the oldest thing and pays one price q = roundMoney(`reuse.factor` 2.5 × v), v the thing's prepared scrap value at the posted price of the sale's step (no timing edge from racking on a high day). **[26 Nov, D93] Visitors are dated by value**: after a sale of price q at t, the next visitor is dated t + `reuse.period_s` 240 s (tune 120 to 480) × q ÷ `reuse.refPrice` (a radiator's gate price at p̄, §162.88), so the rack earns at most `reuse.refPrice` ÷ period a second (§2,443 an hour at the starting numbers) whatever stands on it. When an empty rack gets a thing at t, the next visitor is dated t + period (the defined restart: a tick equals a jump). Ticket: "Sold at the gate · cast-iron bath · §261". A choice of price tags is the first thing cut and comes back only if the rack fills in play.
- **Felt at rung 5**: partner loads may carry a **reusable batch**, printed on the load's label by thing and kilogram before paying (two kinds in stage 2: radiators in the farm's loads, gates and railings in the demolition loads; the second kind is cut first); set aside whole at the rack's trade corner, it is collected by [reclamation dealer]'s van (not carried out by the public). **[26 Nov, D95]** When a batch reaches an empty trade corner with no van dated, the van is dated t + `reuse.vanPeriod_s` (1,800 s, tune); it takes every batch waiting and pays `reuse.batchFactor` 1.5 × each batch's prepared value at the collection's step (the value its pieces would sell for, prepared, at that step's posted prices); the next batch to reach the empty corner dates the next van.
- **The ladder**: mass sold from the rack or collected by the van counts as supplied tonnes at its prepared grades (one ladder, range included), with its term in the server's bound (7.5): **[26 Nov]** rack mass due ≤ (Δt × `reuse.refPrice` ÷ period) ÷ the lowest gate price a kilogram of any reusable kind (the bicycle's) + batches booked.

**Worked example** (first-yard content): the bath (110 kg, four 27.5 kg pieces of cast iron solids at §0.95) is §104.50 as scrap and §261.25 at the gate on a usual day; a radiator (46 kg) §65.15 and §162.88; the crate of brass taps (8 kg) §179.20 and §448; a bicycle §6 and §15. **[26 Nov]** The public's ceiling is `reuse.refPrice` ÷ period: §2,443 an hour whatever the mix (a crate of taps at §448 makes the next visitor wait 2.75 periods, so dear things cannot break the ceiling), 4.5 % of I at rung 3's entry (§54,500) and about 2.5 % of I late in rung 3 (about §97,000, 8.1); the share is per production hour, so it is the same for every habit. The drop-off alone (one thing every 50 s; radiators 15 %, bicycles 20 %, taps 7 %; f = 0.25) brings about 7.6 reusable things an hour worth about §1,060 an hour at the gate, 1.9 % of I at rung 3's entry; partner loads add the rest. At rung 5, with I several times larger, the public's ceiling is a smaller share: the van's batches keep the rack felt.

**What the player sees first**: at rung 3 one reusable bath stands beside the new rack under its canopy; the goal "Put the bath on the rack"; the first visitor comes within four minutes (one period); the rack's chip shows what stands there and what sold today.

**Tests**: a sale pays its printed price once, present or away; a tick equals a jump across racking, an empty rack's restart, the value-dated visitor and the van's dating; nothing on the never-racked list is ever tagged (content check over every kind); supplied tonnes count each racked kilogram once. **Aims**: the rack and the van earn 2 to 5 % of a day's income at rungs 3 to 5, never above 8 %; a minute of the boss's racking earns at least 1.2 times a minute of his cutting at the same moment; the same result present or away.

**Between players** (stage 5): a member's rack is read-only on a tour (an emote may be left). No stand, no price a player sets, no "send a buyer", and no scrip passes between players, **[26 Nov]** except that the game pays for goods given as help at the board's price of the moment each part arrives, within help's caps, and the requester pays the game the same (7.2, D79).

---

## 6. The one ladder

### 6.1 Rungs, days and what each rung opens

The industry table ranks **lifetime tonnes supplied**, counted when a lot leaves (collected, sold, delivered or arrived; **[26 Nov]** a thing sold from the reuse rack and a batch the reclamation van collects count too, 5.9; mass received as help from a company member is booked so that it counts once, at the helper, 7.2; weighed-in skips, reagents and waste excluded); a position **never falls while away** (ruling 3). A rung is entered when tonnes, range and sites are met; the crane hangs a sign with the yard's name and tonnes ("Kettle Lane Yard · 1,000 t supplied"), no title, no promotion words; the chip shows rank and the next rival.

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
| 3 | the works and the process board (2); **[26 Nov]** plant finance and the reuse rack (2) | the baler, and the lender's letter if it costs more than the cash in hand; the bath beside the new rack and the first visitor; then the rotary furnace |
| 4 | dealers, road and rail (3); companies (5); **[26 Nov]** scrip packs where the country's switch is on (2); a partnership and the merchant's advance (3) | a wagon of shred to Garrowfield Steel |
| 5 | the exchanges and corporations (3); at 30 kt the key board (4), **[26 Nov]** with the site loan, a grant and a passed rival's yard (4) | a 20 t cathode lot; Tolvan Motors' tolling |
| 6 | vessel and plane (4) | the first sailing to Kaymor |
| 7 | Varn Ridge and stage 6's lines | a carbide sort |
| 8 | iridium tolling (6) | Quenwick's first stack |

### 6.2 Rival firms as pure functions

Twenty-five invented firms (**[26 Nov]** the register's `rival.1` to `rival.25` in this order, current names; its `passTonnes` and the first yard's content outrank this sketch's T_i0), each with a drawn logo, a chip name of at most 14 characters and a "simulated" tag. T_i(d) = T_i0 × (1 + g × min(d, 40)), g = 0.5 % a day below 1 kt, 1 % above (Orrin 0.5 %); d from the player's start locally and from the calendar epoch online (ruling 16). T_i0 = the twice-a-day curve at the planned pass day ÷ (1 + g × day), recomputed by the content script from the prototype.

| Rival (pass) | T_i0 | Rival (pass) | T_i0 | Rival (pass) | T_i0 |
|---|---|---|---|---|---|
| Marchford & Daughters Scrap (min 5) | 0.15 t | Larkmoor Non-Ferrous (day 3) | 2.5 kt | Hazelford Metallurgy (17) | 930 kt |
| Pennick Scrap (min 15) | 1.5 t | Stonebeck Reclaim (4) | 6.0 kt | Crayle International (19) | 1.33 Mt |
| Brookmill Metals (min 30) | 5 t | Highfold Metals (5) | 12 kt | Tarnmoor Resources (21) | 1.80 Mt |
| Tenterby Lane Metals (min 55) | 15 t | Aldermoss Ferrous (6) | 24 kt | Teodor Metals (23) | 2.34 Mt |
| Kolbeck Recycling (day 0.5) | 90 t | Nordal Metals (7) | 41 kt | Wrenhill Global (25) | 2.98 Mt |
| Tunney & Sons (1) | 210 t | Gannetby Recycling (9) | 100 kt | Pearlbay Steel & Alloys (27) | 3.68 Mt |
| Redport Metal Recovery (1.5) | 420 t | Rookhill Resource Recovery (11) | 215 kt | Oakfold Metals Holding (29) | 4.43 Mt |
| Millbeck Ferrous (2.2) | 800 t | Saltreach Metals (13) | 375 kt | **Elmfield Global Metals** (31) | **6.0 Mt** (≤ 7.2) |
| | | Kilnfield Steel & Alloys (15) | 605 kt | | |

The chip starts "26th of 26 · next Marchford 0.15 t". Up to five followed players appear as pinned rows; **real rows never gate a rung**. Sketch: a rival every one or two sittings in week one, then every 2 to 2.5 days (largest gap 2.5; 3 h a day 2.0; 45 min a day 2.3). Rivals' moves are optional (second in the cut order).

### 6.3 Capacity, its price and the closed form

**Rated capacity R** (t/h) is a pure function of assets: Σ over sites of the bottleneck throughput with full feed; feed sources (skip routes, take-backs, deal allocations) are stations too. **The payback rule is the money sink**: from rung 3, anything that raises R by ΔR costs τ_r hours of the income ΔR earns at p̄ (the first hour's shop is the first-yard document's list, about 2 h): τ = 9 h at rung 3, 22 at 4, 45 at 5, 110 at 6, 230 at 7, 420 from 8 (tune ± 30 %). Spending all income grows R at 1/τ_r per production hour, so money from selling well, the hand and deals becomes tonnes, and cash never piles up while anything is left to buy; steps of +5 to +25 % keep the next one within two sittings. **The rung ceiling** (ruling 15) is a guard at about 1.3 × an always-on full spender's exit capacity: 6 · 20 · 160 · 800 · 3,500 · 14,000 · 28,000 · 40,000 t/h for rungs 1 to 8+ (tune ± 30 %); stage 1's shop tops out near 40 t/h by content. A year at 40,000 t/h is 3.5 × 10^14 g, inside a double.

### 6.4 After the top

A finishing ceremony (the crane hangs the title, the crews line up, a ticket prints the whole run). **Completion goals exist from day 1 and stay open**: the Trade Book (every object and grade), every process node at level 10, every corporation's certificate. The weekly bracket and the company order are the standing loop; locally, simulated players stand above on the all-time board, labelled simulated. The store says so without numbers.

---

## 7. Other players (stage 5)

### 7.1 Words (ruling 2)

A **company** is what a player founds or joins, at most 30 members, and it is what is listed. The player's operation is "your yard", "your business" from a second site, with a composed trading name. A founder alone has a company of one. "Group" is not used. **[26 Nov]** The owner's "30 players could join a company like ... neighborhoods" (wish 17) is this section as it stood: every player keeps their own yard; members help each other a little every day and share a weekly order. The groups, the help and the weekly order are our own in theme, words, rules and numbers; nothing of another game is copied (its words "neighbourhood" and "derby" are not used).

### 7.2 The company

- Founding and joining open at rung 4, rate-limited per uid and IP. Name from three lists (40 × 40 × 8, curated); emblem from 8 shapes × 12 glyphs × 10 colour pairs; nothing typed.
- Leader, up to three co-leaders, members; open, by request or closed; leaders remove members. Leadership passes after 14 days without a logged rules action (opening the app does not count) to the most active co-leader, else the longest-standing active member; with none, dormant and joinable.
- 24 fixed phrases and 8 emotes ("Good week.", "I can send copper."). Invitations can be declined and switched off. **[26 Nov]** No free chat and no typed names.
- **[26 Nov] The company's place** is a flagpole at every member's gate, flying the emblem from the day of joining; Open there shows the week's order by line, the class, members and phrases; on a tour a visitor sees the company there and may ask to join. It takes no working ground.
- **[26 Nov] The weekly company order** (ruling 12, D56, amended by D97 to D99): each member sets "in" or "out" before the week (content `company.*`); a member who sets neither counts "in" only with an accepted rules action in the last 7 days; the roster freezes at the week's start. An invented corporation's order is sized at the freeze from h_o = `company.order_h` and R_i, each in-member's rated capacity at the freeze (6.3). **Lines**: line_g = h_o × the sum of the in-members' rated flow of grade g, for every grade that at least two in-members can supply, plus one **"any grade" line** of h_o × the in-members' remaining rated flow, so that a company of one, or members whose grades do not overlap, still has an order to fill; O = the sum of the lines = h_o × Σ R_i. A member's counted deliveries are at most `company.memberCap` 1.25 × their own frozen share (h_o × R_i), so capacity bought in mid-week cannot lift the company. **The size h_o**: the ruling's 25 h is its starting value. 25 h is about a fifth of a twice-a-day member's production week at rung 4 (16.3 h a day, 6.1), so every active company would reach 125 % and the aim of 12.3 could not be met; the local stand-in therefore starts from h_o = `company.order_share` 0.5 × 7 × min(24, 2 Cap_r + 2 h) per member, the brackets' habit-free day (7.3; 63 h at rung 4), and tunes it to the aim (for the lead, D98). A member **claims a line** with one tap (the phrase "I can send copper." is the claim, shown with their emblem; it lapses quietly after `company.claimLapse_h` 24 h at no cost) and routes lots from a bay ("Send 2 t to the company order at §p"), priced like a deal (D6: the 7-day average at the delivery's step plus the corporate premium, never locked across the week): a normal delivery. A delivery beyond the member's cap, or after the order has reached 125 %, is refused with its reason ("This order counts no more from you this week."). Tiers at 50, 80, 100 and 125 % are counted automatically at the week's close. Rewards only for contributors (1 % of the order or 5 h of their capacity), looks only and kept for good: a pennant in each contributor's yard, and earned emblem parts (never sold, 8.2); a member removed in mid-week keeps what they had earned. Once a month an easier week, **"Inspection week"** in player text: the order at `company.calmShare` 0.6. Simulated firms claim lines too. Worked example (at the starting 25 h): three in-members at the freeze with R of 20, 30 and 50 t/h: O = 25 × 100 = 2,500 t; the third member's frozen share is 1,250 t and at most 1,562.5 t of their deliveries are counted; a fourth member who switches "in" on Wednesday counts from next week.
- **[26 Nov] Classes, not leagues** (ruling 9.12, D82). A class is formed afresh each week from that week's frozen roster size (in-members) and capacity (Σ R at the freeze) only, never from results: about `company.classSize` 12 companies (tune 10 to 14). Classes have no order and no names that rank (shown as "12 companies of your size"), and a company is never shown as moving up or down. Within its class a company is ranked by the share of its order completed, ties broken by the time the share was reached; pennants for the top three, kept for good; nothing is ever lost for a quiet week; no relegation (losing status for not returning is what the European rating calls pressure, PEGI 12).
- **[26 Nov] Help** (player text "Requests": "Ask for feed", "Send feed"; never "daily", "every day" or "missed", ruling 9.14). (a) **A request for feed**: a member posts one request a market day for a grade one of their own machines takes, at most `help.maxRequest_hI` 2 h of their own I; **each part of its mass is priced at the posted price of the step at which it arrives, the same for both sides** (ruling 9.11, D79): the requester pays the game that price as the mass arrives and the game pays the helper exactly the same; the price at posting is shown only as a guide; what the requester's set-aside and cash cannot pay is not sent; a helper gives at most `help.maxGive_hI` 1 h of their own flow a day; the received mass is booked (`received_g`) so that no tonne is counted twice (it counts once, as the helper's supply); a delivery applies at the first event after the client receives it, live or away, never back-dated into an away pass already computed; the server writes it; an unfilled request stays open and withdrawing it returns what was set aside (no merchant's fallback at a premium); an unused request is simply not shown. (b) **Send for a short delivery** of a member's supply deal (the cover): it moves neither goods nor scrip, prevents that day's loss of trust and never adds trust; **[26 Nov, D99]** a member's deals are covered at most once a week, and only for a shortfall of at most a quarter of that day's quantity, so that "sign the largest deal and deliver what you have" never pays. If stage 5 runs over, (a) is kept and its lorry animation is cut first.
- **[26 Nov] Nothing bought and no ad** ever buys a claim, a request, points, an allowance, a deadline, a class or a second draw of rewards.
- **[26 Nov] Removal and finding.** A removed member keeps what they earned; the wait before joining another company grows with each removal (`company.rejoinWait_h`, a list rising per removal). A list for finding a company shows its emblem, its members, an activity word (quiet, steady, busy, from accepted rules actions) and a mark where its average rung matches the player's. Without a network, and for a player whose age band is under 13 (the age question, 7.6), simulated firms play the whole company in the local mode.
- Company row and tours show the order's progress by line, the class and the valuation rank. Not in version 1: a shared ship, divestments, takeovers, **[26 Nov]** a company pot or project paid in scrip (5.8).

### 7.3 Boards and tours

- **Weekly brackets** of 30, placed at the week's start by floor(log2 D), D = R × min(24, 2 × Cap + 2 h) derived by the server from accepted assets (bought included); a newcomers' bracket for the first seven days. Score: tonnes that week, each submission split across Monday in proportion to server time. **[26 Nov] Counting ceiling**: every day of the week counts at most min(D frozen at placement, the band's upper edge), so capacity bought on Tuesday, with scrip from a pack or not, moves nothing until next week's placement. **[26 Nov, D92] Rank inside a bracket** is counted tonnes ÷ (7 × D frozen) ("how fully you ran your yard this week"): packs bought on Sunday night double a player's capacity inside the same log2 band, and ranking by tonnes would put them above every band-mate; by this measure capacity, bought or earned, ranks nobody above a band-mate. An always-on player is counted at most 1.21 × a twice-a-day player of equal capacity at rung 3 (**[26 Nov]** corrected: under E33's caps of 0.5, 2 and 4 h it is 2.36 × at rung 1 and 1.41 × at rung 2, rungs that sit in the newcomers' bracket of the first seven days; 1.0 from rung 6): the **fairness gate** (≤ 1.25 ×); the private ladder keeps every tonne. Pennants for the top three and best growth (only if last week was at least R × 20 h), cosmetic.
- **All-time boards**: lifetime tonnes, calendar-anchored, in **cohorts by start month**, **[26 Nov]** counted on the shared credit curve: a player is counted at most C(d), the tonnes an always-on player who never pays would have reached by day d (content `boards.creditCurve`, from the prototype; **d and the cohort start at the server's first sight of the player**, never at a save's own start date, which a client can forge, D100; ties at C(d) are broken by the date C(d) was reached); the figure is labelled "Counted on this board: 41.2 t", and the private ladder and the chip keep every real tonne; shown beside "days to each rung"; the rival rows; companies by valuation once listed, counting members with 7 days of accepted play and 1 % of the company's tonnes, by sum and by top-10 median. No trailing-week position.
- **Tours**, read-only: a diorama of their main yard, sign, range chips, pennants, emblem, this and best week. Actions: **follow** (up to five, invisible to the followed), **invite** (leaders), **report**, **block**; invitations off by default for the 13 to 17 age band (7.6); no likes, views or counts.

### 7.4 The listing (ruling 12)

A company may list at 2 Mt of combined accepted lifetime tonnes with 12 materials counted at rung 7's θ and seven daily results (a company of one near rung 7). The leader rings the bell at **[26 Nov]** the listing venue, [listing venue]; every member's yard shows the crew lined up and confetti of offcuts. **Valuation (simulated, published formula)**, weekly from accepted results: V = 26 × W × (1 + 0.02 × (range − 13)), half a year's supply, W = last week's Σ accepted mass × p̄: immune to timing, checkable on the server; whole scrip, asserted under 2^53 (about 10^13 at most). **[26 Nov]** The card carries its own line, beside Help's one sentence (5.2): "Nothing in a listing can be bought, sold or owned by players. No money is paid out." (player text never says "shares" or "part" for a holding, D24, D76).

### 7.5 One interface, two implementations

`OnlineService`: `acceptTerms`, `me`, `board`, `tour`, `follow`, `unfollow`, `myCompany`, `companies`, `found`, `join`, `leave`, `invite`, `respond`, `setInvites`, `setRole`, `remove`, `say`, `claimLine`, `submit`, `report`, `block`, `unblock`, `deleteMe`; **[26 Nov]** `setInOut`, `classes`, `postRequest`, `withdrawRequest`, `give`, `cover`, `emote` (7.2, 5.9).
- **LocalOnline** (default; no network or account): about 200 simulated players and companies, weekly tonnes a pure function of (seed, week, t), rows labelled "Rival yards (simulated)" with no promise of a future feature; simulated firms join the player's company under the same cap of 30.
- **FirebaseOnline** (yard-tech.md D), switched on only in a binary submitted for review with notes, test account and seeded server, never by an over-the-air update or remote flag (`validate:release` checks it): anonymous sign-in; `players/{uid}` owner-only; `publicPlayers/{uid}` by functions only (handle parts, emblem, rung, tonnes, range, band, company, a site summary under 2 KB, pennants); `companies/{cid}/members/{uid}`; one document per bracket and board, rebuilt every 10 min; `reports/{id}` create-only. Functions mirror the calls, with `joinCompany` a transaction (members + 1 ≤ 30), `rebuildBoards` and `weeklyClose`. `server/` bundles a copy of `src/engine/salvage` made at deploy (outside the `modes.js` check) with a content hash; each submission carries its hash and assets are valued with the content they were bought under.
- **The server checks** (it re-runs the rules and assumes a hostile client; tonnes are submitted per grade): ΔT ≤ R_prev × Δt + 0.25 × R_prev × foreman time due (≤ 45 min a day) + H × min(Δt, 3 h) + lot mass due + arrivals booked before the last accept + **[26 Nov]** rack mass due (5.9) − help mass received (7.2), where R_prev is the capacity accepted at the previous submit and H a hand rate per best tool and carry tier (content, 1.2 × the measured fast-hand bot). Excess stays **pending** and is accepted as slack allows (at most 24 h banked); the chip marks it "not yet verified". **[26 Nov, D101]** Earnings are bounded by the sum over channels of mass × the interval's highest posted price × the channel's factor (lots, Sells and sell notes 1; the gate's sales `reuse.factor` 2.5 on their things' prepared value; the van `reuse.batchFactor` 1.5; deals and the company order 1 + their premium) + verified ad grants (at most the day's ad cap) + fees booked (tolling, take-back) (the earlier form, tonnes × price alone, flagged an honest seller at the gate: a day of radiators pays §58,600 against tonnes × price of §23,440); **[26 Nov]** claimed assets and cash are bounded by assets + cash ≤ gross earnings + verified pack grants + financed − repaid (5.7; a pack grant counts only with the store's verified receipt); range grows only by materials whose line exists. **First submit**: accepted up to the always-on curve from max(the save's start, stage-5 release − 60 days), for placing the player; **[26 Nov]** the all-time board's d and cohort start at the server's first sight of the player (7.3), so a forged start date places a player but never lifts them on a board (a legacy save's earlier tonnes stay on its private ladder). A hostile client gains at most what an always-on honest player with the same assets could. Only functions write ranked fields; writes are rate-capped; purchases and ads never touch them. Tests: the fast-hand bot at rungs 1, 3, 8 accepted in full; a 3-hour-submit client and any claim beyond the always-on curve at its assets clamped; a legacy save's first submit. Within that curve an inflating client cannot be told from an always-on player: a known limit.

### 7.6 Accounts, deletion and the policy duties

Handles are generated ("Steady Anvil of Quillon"); nothing typed is shown to others. **[26 Nov] The age question** (ruling 9.3, D71): asked once, the first time something needs it (the scrip packs' rows where the country's switch is on, from stage 2; before the terms, in stage 5): a neutral question for the year of birth, no default, kept on the device as a band only (under 13, 13 to 17, 18 or over) and sent online only as that band. Under 18: scrip packs hidden. Under 13: the local mode only. 13 to 17: invitations off by default. A platform's age signal may replace the question in a store build (the owner's decision). A self-declared year is a courtesy, not age assurance. Terms come before a handle is shown, founding and joining. Report on every handle, emblem, company row and tour (a reported name shows "Company #48213" until reviewed); blocking hides the handle and stops invitations. A player in the under-13 band gets the local mode only. Deletion in the app (stating its time; removing handle, scores, company data) and on a web page.

### 7.7 What the owner must create and decide, and the ratings

Create before stage 5 goes online: a Firebase project (web app, anonymous sign-in, Firestore, Blaze with a budget alert, a restricted key, deployed rules and functions); privacy policy (yard-policy.md 4), terms, support URL and email, the deletion page, a data processing agreement, the UK Online Safety Act assessments, a moderator acting within 24 hours, review notes with a test account and seeded server, privacy label and Data safety form, trademark and company-register searches. **[26 Nov]** Create before the first store build (stage 2's purchases): the 16 products of 8.2 in both stores (the four scrip packs as consumables, everything else non-consumable and restorable); terms of sale (withdrawal, no devaluing of scrip, no removal of bought looks, an appeal against a ban, no trading for real money outside the game); the pre-contract text one tap from every Buy (what it is, who sells it, the price, withdrawal, and that bought scrip lives in this device's save until stage 5's account, 8.3); the review-notes line "Loans in the game are fictional, in scrip, and pay nothing out"; Google's financial-features declaration "My app doesn't provide any financial features"; Apple's In-App Controls (**[26 Nov]** Parental Controls not declared: the locked Settings switch is a courtesy to parents, not a parental control, and the review notes name the platforms' own purchase approval, ruling 9.4; Age Assurance only if the age signal ships); the line "In-game purchases" in every ad for the game, never "cosmetic only" in an ad or on the store page while packs are sold anywhere (ruling 9.6). Decide: `firebase` 13.1.0 as a direct dependency limited to this mode; the prices of each look (8.2; the packs' and No ad videos' prices are the ruling's); **[26 Nov]** before the first store build, whether it carries the platform's age signal in place of the age question (a native module, so not in Expo Go; 7.6, 8.4); and, with a lawyer, whether scrip packs may switch on in the EEA and Switzerland (every scrip price might then have to show its real-money value), given that a pack's scrip per dollar differs by player and by hour (S = H × I), so that no fixed rate exists.

| Rating | Expected | Answers that keep it |
|---|---|---|
| Apple | 13+ (contests; A12 in Brazil, for advertising) | Contests frequent; Simulated Gambling none; Loot Boxes none (labels, 5.3); UGC yes, conservatively; Messaging none; Social Media none; **[26 Nov]** Parental Controls no (the locked switch is not declared, ruling 9.4) |
| IARC | **[26 Nov]** the European rating 3 to 7 (nothing timed, nothing random, no relegation, the weekly order's rewards kept for good; 7 if the weekly order, or a help request each market day, counts as pressure to play); ESRB E; **the German rating very likely 12 for the whole app, even though packs are off in Germany at launch: the rating is of the app, not of a country's switch** (INFERENCE; the questionnaire answers for the binary; "increased incentives to buy"): accepted | "In-Game Purchases", "Users Interact"; random no, time-limited no, chat no |
| Google | 13+, never Families | **[26 Nov]** financial features: none |

Forbidden because they raise it: typed names, any cash-out (18+), timed or limited offers (PEGI 12), free chat, random paid items; **[26 Nov]** losing status or rewards for not returning in time, relegation included (PEGI 12); a repayment date or a debt that grows while the player is away (PEGI 12); a return or price set by chance on anything a player pays for (simulated gambling).

---

## 8. Money (ruling 13; **[26 Nov]** rewritten to the owner's decision of 26 November, D20 to D36)

**[26 Nov]** The owner decided: "Purchases should be limited to cosmetics, currency etc." This replaces lists A and B, and currency packs, which this section had ruled out, are in. Read narrowly (D20 to D22): LOOKS (things that change how a yard looks and nothing else), SCRIP sold only as hours of the buyer's own yard's rated income, and NO AD VIDEOS; **[26 Nov]** no bundle in stage 2 (ruling 9.2, D70). One currency, scrip: no second, paid currency (the EU consumer authorities warn against mixing currencies and against exchanges before a purchase). No pass, nothing random, no timer on any offer, nothing that adds tonnes or rank directly. Stubs in stage 1; live from stage 2.

### 8.1 Rated income, I (fixed in form)

Everything priced in hours uses one measure. **I** (§ an hour) = Σ over sites of R_bind × m̄: R_bind (t/h) the throughput the site's present assets reach at the step that binds (sources, cutting, carrying, the trucks, the machines, the merchant's round), with no boss and full feed from what the yard owns; m̄ the margin a tonne of what that step's output sells for at p̄, less the price of bought feed a tonne; **[26 Nov, D90]** where a machine can run more than one recipe (which input a shared furnace takes), m̄ counts the lowest-margin recipe it can run, so that switching a furnace when a card opens never raises I. It is computed from ASSETS, never from the moving average of recent sales: a player can pump that (hold every bay through a low day, sell all, open the card). The built `ratedOf` returns 0 before the first yard hand and counts carrying and arrivals only; stage 2 rewrites it to count the step that binds (the bots found cutting and the one truck binding late, `yard-bots.md` C3). A reward, a pack, a loan cap or a price that uses I fixes I when its card opens; a market step never changes I (it is at usual prices). **Gate**: I is within 0.9 to 1.1 of the measured away income an hour at the entry and at the last purchase of rungs 3, 4 and 5 (13 of 15 seeds). **[26 Nov, D85] I at named moments, and a day's income**: I is stated at two moments of each rung, its entry and its last purchase, because it roughly doubles inside a rung. At rung 3 it is about §54,500 an hour at entry (the Night watch's two hours were worth §106k there, `yard-bots.md` C9) and about §97,000 an hour late in rung 3 (day 3 earned §1.2 M to §1.3 M over the twice-a-day habit's 12.3 production hours, C8); τ_3 = 9 h. **A day's income**, in this document's aims, is I × the production hours a day of the habit measured (6.1: twice a day 8.3 h at rungs 1 to 2, 12.3 at 3, 16.3 at 4, 20.3 at 5, 24 from 6); a figure against 24 × I says "an always-on day".

### 8.2 The catalogue (stage 2)

All real-money prices are on ONE card, **the shop**, opened from the office and from Settings; it is not a new place on the first yard's map. No working card (truck, crane, gate, machine, rack, partner wall) ever carries a real-money button; the shop's entry in the office sits on its first tab, never on the Agreements page (D77).

| Product | Kind | Price (US $) | Notes |
|---|---|---|---|
| Six fleet colours, [colour 1] to [colour 6] (trucks, vests, skips) | cosmetic, non-consumable | 1.99 to 2.99 each | bought once, restored on reinstall |
| Four yard-dressing sets, [set 1] to [set 4] | cosmetic, non-consumable | 1.99 to 2.99 each | restored |
| The founder's plaque, poured in the yard's own crucible | cosmetic, non-consumable | 1.99 to 2.99 | restored; seen on tours from stage 5 |
| No ad videos: get every ad reward without watching (same limits) | skipAds, non-consumable | 4.99 | restored |
| Scrip packs: **[26 Nov]** 2, 5, 10 and 20 hours of I (one flat rate, no discount for size, ruling 9.1) | `hoursOfIncome`, a new shared consumable kind (D96) | 1.99, 4.99, 9.99, 19.99 | from rung 4 where the country's switch is on and the age band is 18 or over (8.3, 8.4) |

**Earned looks, never sold**: a sign style at each rung, and the foundry's plate (Oakbridge Foundry Co-op's), so that a player who never pays has looks to show. Emblem parts and company looks go on sale only in stage 5, when others can see them. **[26 Nov, D81]** Emblem parts on sale and emblem parts earned are separate sets; nothing the weekly order gives is ever sold. A look bought by a member shows on that member's own flagpole and yard only; a company's shared emblem uses earned parts only, so that buying for the company never becomes a duty. **No bundle in stage 2** (ruling 9.2, D70): a store product has one fixed price, so a bundle would either charge for parts already owned or be a one-chance offer. Content `shop.*`; product ids carry the game's prefix (the fingerprint's id check).

### 8.3 How a scrip pack works (fixed)

- **Opens at rung 4, never before** (`shop.packsFromRung` 4): the measured first day is the same for everyone.
- **The amount**: S = roundMoney(H × I), H from `shop.packs` (**[26 Nov]** 2, 5, 10, 20, ruling 9.1), fixed when the shop card opens. If I changes before the store's sheet opens (a purchase arrives, a machine is commissioned; a market step never changes I, 8.1), the card shows the new S again ("Updated: §a → §b") before the sheet. Once the sheet opens, S is frozen and granted exactly as shown however late the approval comes (a parent's approval can take hours).
- **Never lost, never paid twice**: a ledger of granted transaction ids in the save, a listener for pending purchases, and a reconcile at start. **[26 Nov, D91]** The reconcile grants only transactions dated after the save was created and missing from the ledger, at the S stored with the pending quote; without that, a reinstall or a second device on the same store account would pay every past pack again, at an S the wiped save no longer holds. Bought scrip survives a save migration. **For the lead**: the ruling's "survives a restore" (2.3) cannot be built before stage 5's account, because the stores do not restore consumables and a fresh save has no ledger to tell an old pack from a new one; until then the pre-contract text says that bought scrip lives in this device's save.
- **Headroom**: a pack is offered only while the yard can spend it now: cash + S ≤ U, U = the sum over every card of the price of what it would sell next (one item or the next level), under the rung's ceiling. Otherwise its row reads "Nothing to spend it on yet" and has no Buy button.
- **The largest pack is at most the payback time of the rung where packs open**: H_max ≤ τ_4; `build-yard.py` refuses content that breaks it (**[26 Nov]** the 20 h pack is under τ_4 = 22 h, ruling 9.1).
- **What the card prints**: the scrip and "about H hours of your yard's earnings". It never says "H hours ahead" (the real lead of a pack spent on capacity is τ_r × ln(1 + H ÷ τ_r), less than H) and never promises success. No "best value" on totals, no "buy now", no guilt text.
- **The grant** goes through this mode's own money rules (a salvage consumable kind), never the shared `timeWarp` kind, which pays a moving average.
- **Worked example** **[26 Nov]** (rung 4, τ_4 = 22 h; for scale the first yard's I of §54,500 an hour, rung 4's own I being measured by stage 2's bots): the packs are §109,000, §272,500, §545,000 and §1,090,000; spent at once on capacity they move the yard about 1.9, 4.5, 8.2 and 14.2 hours ahead. If the cards' next purchases sum to U = §400,000 and cash is §40,000, the 2 h and 5 h packs are offered and the two larger rows read "Nothing to spend it on yet". Packs bought back to back multiply R by about (1 + H ÷ τ_r) each until the rung's ceiling: the ceiling and the headroom are the only bounds, and the owner is told so (D65).

### 8.4 The switch (fixed)

Scrip packs are switched by country in the game's data (`shop.packsByCountry`): OFF in the EEA and Switzerland at launch (until the owner has a lawyer's answer on showing a real-money figure beside every scrip price), OFF where the country is unknown, ON elsewhere. **[26 Nov] The country** (ruling 9.5, D73) is the store account's storefront country as the platform's purchase module reports it, read each time the shop opens; never the device's language or region and never an address on the network (a traveller or a network tunnel would land on the wrong side of the EEA line). Before the module answers, or if it fails, the country is unknown and packs are off. In Expo Go the development switch (8.9) stands in for it. **[26 Nov] The age band** (ruling 9.3, D71): the first time a pack row would show, the neutral age question of 7.6 is asked once; under 18, packs are hidden. A platform's age signal may replace the question in a store build (the owner's decision before the first store build). **[26 Nov] The Settings switch is locked** (ruling 9.4, D72): "Scrip packs: shown / hidden"; whoever sets "hidden" chooses a four-digit code (pure JavaScript, kept in the save), and setting "shown" again asks for it; a forgotten code is cleared only by reinstalling, which starts a new save and asks the age question again (a decision of this revision). It is a courtesy to parents, never declared to a store as parental controls (7.7). **The game is whole with packs off**: a player without packs lacks only time, never anything play does not give, and every aim is measured in both modes.

### 8.5 Never

No goal, advice line, away card, refusal, ticket or debt card ever names a real-money product. No real-money prompt in the first session. No ad and no shop button on any card or ticket that shows a debt, and no ad button on screen while one is open. Nothing sold adds tonnes, range, rank or a place on a board directly.

### 8.6 Rewarded ads

Rewarded videos only, behind labelled buttons that show what they pay; no interstitials or banners. Together at most 4 % of an always-on day's rated income (D7, ruling 2.6: 24 × I): the **away bonus**, half (tune) of the away cash that reached the player after the bank's share, up to 15 min of I, on an absence of 30 min or more, twice a day, paid as its own line and never part of a payment the bank shares in (ruling 9.9), offered on its own small card after the away card is closed, never on the away card; the **spot buyer**, **[26 Nov, D89]** on a held bay's Sell, whose amount is known before the ad: it pays min(0.1 (tune) × the Sell's amount, 8 min of I), three a day, and is never offered on a grade in out(p) of a plate with an open agreement (ruling 9.9); at most 54 minutes of I a day (3.75 % of 24 h × I; at rung 3's entry §49,050 of an always-on day's §1.31 M). **[26 Nov] For the lead** (D85): against the twice-a-day habit's own day (12.3 production hours at rung 3) the 54 minutes are 7.3 %; holding 4 % of that day would allow about 30 minutes of I a day at rung 3 (one 15-minute away bonus and the spot buyers). Scrip only; ad rewards never count on a board and never repay anything; the count left is shown; no ad button stands on screen while a card or ticket that shows a debt is open. **Must be true**: an ad watcher's lifetime tonnes at day 14 ≤ 1.15 × a non-watcher's (prototype).

### 8.7 Boards stay worth playing for someone who buys nothing (stage 5)

Three rules, each written where it acts: the weekly brackets count at most min(D frozen at placement, the band's top) for the whole week and rank by counted tonnes ÷ (7 × D frozen) (7.3); a member's counted deliveries to the company order are at most 1.25 × their own frozen share (7.2); the all-time board counts on the shared credit curve, labelled "Counted on this board", while the private ladder keeps every real tonne (7.3).

### 8.8 The store sentence

**[26 Nov]** One sentence, true in every country (ruling 9.6, D74; a store listing is written per language, not per country): "Purchases change how your yard looks or remove ad videos; in some countries they can also add scrip worth some hours of your own yard's income in the game. Nothing sold adds tonnes directly, and shared boards count no more than play can reach." Never "cosmetic only". The store page and ads never say invest, returns, trading or earn money. The ratings expected are in 7.7.

### 8.9 On the owner's phone

In Expo Go purchases are simulated: Buy gives the look or the scrip and no money is taken. A development switch in Settings, **[26 Nov]** compiled only under `__DEV__`, sets the store country (8.4) so that the owner can see the shop with packs on and off, and a "Start at rung 4" in the same section lets him see the packs without two days of play; `check:bundle` verifies that neither is in the release export. This is an exception to the project rule that development tools live in `.web.ts` files; it is asked of the lead for AGENTS.md (requests.md, D101). Real charges begin with the first store build.

---

## 9. The stages (ruling 15)

Each stage is playable on the owner's phone. Wishes are BRIEF's numbers. Lines against yard-tech.md F (55 to 70 k), as rules + tests / UI / art / bot and script.

| Stage | Contains | Wishes | At its end the player can | Lines |
|---|---|---|---|---|
| **1 The first yard** | crane loading screen; Kettle Lane, Hob's, Ruddock's; stick, cut, carry, weigh in, bays, the round; tools and carry 1 to 3; strippers, motor bench, crucible; three crew roles; posted board, Hold; the foundry series; table and chip; time away; local save; stubs for ads and purchases; content script and bots | 1, 2, 8; part of 3, 4, 6, 7, 11 | the hour to rung 3, then a goal list for days 1 to 3 (levels, the foundry series, rivals to Millbeck at 800 t) ending at a fenced back field with a "next build" board | 13 to 16 k (4 + 3 / 5 / 2 / 2) |
| **2 The works** | back field; stage-2 machines and vehicles; the bridge partners; the crate; stainless, lead, bronze; lots; commissioning; process board; Trade Book; **[26 Nov]** the shop live (looks, No ad videos; scrip packs from rung 4 where the country's switch is on; simulated in Expo Go), the age question and the locked switch, the earned sign styles, rewarded ads live; plant finance (5.7); the reuse rack and its sale (5.9); the aggregation of crew legs so that time away is cheap; the tuning step of E36 (the driver's level or a second truck); rungs 4, 5 | 3, 7 (pyro), **[26 Nov]** 13, 14, 16 | run a processing yard with three melt lines and a shredder, **[26 Nov]** finance a plate, sell reusable things at the gate, and buy looks and (where on) scrip | **[26 Nov]** 13 to 15 k (9 to 11 k, plus the designers' estimate of about 3.8 k for the shop, plant finance and the rack) |
| **3 The market** | 5.2; warehouses; **[26 Nov]** Garrowfield Steel, Rowkirk Cable Works, Tolvan Motors, Telano Electronics; trust; siding, road, rail, booking cards, clip rail; assay lab and brands; **[26 Nov]** the merchant's advance (5.7); a partnership (5.8) | 4, 5 (road, rail), 6, **[26 Nov]** 14, 15 | choose where, when and in what form to sell; ship by road and rail | 9 to 11 k (3.5 + 2 / 3.5 / 1 / 0.5); **[26 Nov]** the advance and the partnerships not yet estimated |
| **4 Territories** | key board; **[26 Nov]** Saltreach, Clay Coast, Crane Point with lanes, stations and lines; vessel, plane; export consent; pack take-back; **[26 Nov]** the site loan, a grant, a passed rival's yard as a site (5.7, 5.8), a rack at each site; rungs 6 and 7 | 3, 5, 7 (hydro), 9, **[26 Nov]** 14, 15, 16 | run four sites and ship between continents | 13 to 15 k (4 + 2 / 3 / 4 / 0.5); **[26 Nov]** the loan, the grant, the rival's yard and the racks not yet estimated |
| **5 Other players** | `OnlineService` both ways; `server/`; brackets, cohorts, tours; companies, claimed lines, the order; the listing; terms, report, block, deletion; **[26 Nov]** the company's flagpole, the in and out roster, help (requests and sends for short deliveries), classes, Inspection week, the finder; the credit curve and the frozen brackets; emblem parts and company looks on sale; the age signal if the owner chose it | 10, 11, 12, **[26 Nov]** 17 | everything, simulated offline and real with the owner's keys | 8 to 10 k (3 + 2.5 / 3 / 0.5 / 0.5); **[26 Nov]** the help, classes and credit curve not yet estimated |
| **6 The top** | Varn Ridge; carbide; PGM refinery; iridium; the last corporations; rungs 8, 9; after the top; store package | 3, 4, 8 complete | reach the top | 7 to 9 k (2.5 + 1.5 / 2 / 2 / 0.5) |

Sum 59 to 72 k, the top of the estimate; **[26 Nov]** 63 to 76 k with stage 2's money, bank and rack, the later stages' new parts not yet estimated. **Cut order** (ruling 15): the simulated social extras, rivals' moves, the buy-ratio lever; in stage 1 the foundry series and the sack truck may slip. **[26 Nov]** In stage 2, if it runs over, one melt line (the battery breaker and lead) moves to stage 3 **[26 Nov]** and `ladder.rungs[5].range` falls to 8 in stage 2's content (lead is the ninth material, so rung 5 would otherwise be locked; the no-dead-end test and the steel-max bot, which must still stall at rung 4 or 5, run again on the cut content, D86), and then, first cut first: the second kind of reusable batch, the 10 h and 20 h packs, two of the four dressing sets, the levels of the rack. **Never cut** from stage 2: the country switch and its unknown-country default; the rung-4 gate on packs; the refusal above headroom; the frozen quote and the ledger; the share and the total printed on finance and their tests; no shop and no ad on a debt card; **[26 Nov]** the locked Settings switch and the age question; the storefront country and its unknown default. In stage 5 a company build (if any) is cut first, then the help lorry's animation (help itself is kept).

**[26 Nov] The next build** is stage 2, the works, as the table has it. In the order a player meets it: (1) the first hour as built (stage 1 unchanged, its measured beats kept); (2) **[26 Nov, D87] an engine step before stage 2's specification is frozen**: crew trips are grouped into rates whenever no boss is within sight, in the tick, the jump and the away pass alike (as the cutter's whole-thing rule already works), never as a separate away function beside a live engine of trips, so that a tick equals a jump and present equals away stay exact and time away is cheap; it is built and measured together with I's rewrite (8.1) and the Hold fix of `yard-bots.md` C5 (while cash is below the next load's price, the away pass lets held bays go on the round; Hold's rework with the exchanges stays in stage 3, E36(c); carrying the fix now is for the lead, D88), before any stage-2 rule that promises "the same function away" is built on it; then the days to rung 3 as built, with E36's tuning step (the driver's level adding a quarter, or a second truck) measured; (3) at rung 3 the back field opens with the first works plate, the baler, and the lender's letter the first time a works card costs more than the cash in hand while the deposit is in hand; (4) the reuse rack under its canopy by the gate with its bath beside it, and the first visitor within four minutes; (5) from the second session the shop (looks, No ad videos; rewarded ads live, the away bonus on its own card), and the earned sign style of each rung; (6) at rung 4 the scrip packs where the country's switch is on (the age question the first time a pack row would show), the shredder line and the melt lines; (7) rung 5. **First**, before any shop screen is built, the shared store files (`src/services/iap.ts`, the shared schema's product kinds) change, by one owner, with the four other games' tests green: **[26 Nov, D96]** a new shared kind `hoursOfIncome` (consumable; no game word in the shared enum) and an `EngineMode` hook `grantProduct(id, txId, quote)` in `src/modes/contract.ts` through which the mode grants a pack under its own money rules; `src/modes/entries.test.ts` and `modeRegression` stay green. Each stage's aims are measured only up to that stage's top rung (stage 2: rung 5); the buyer-against-non-buyer aims at days 7, 14 and 30 stay in the numbers prototype until the stages they need exist.

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
| Bottom: stick zone left; the one button (60) right, the ad button (40 high) to its left while it applies (hidden while a card or ticket that shows a debt is open) | 89 (8 + 60 + 21) | 76 (60 + 16) |
| **Total** | **390** | **375** |

| Top bar | 844 (safe 750) | 667 (635) |
|---|---|---|
| Cash (15 pt bold, rolling, abbreviated) | 136 | 116 |
| Ladder chip ("19th of 26 · next Hazelford 930 kt"; tap: the table) | 408 | 340 |
| Carry ("52/60 kg", the truck's "0.8/1 t") | 90 | 90 |
| Clipboard | 44 | 44 |
| Gaps | 3 × 24 = 72 | 3 × 15 = 45 |
| **Total** | **750** | **635** |

Nothing from the market sits in the top bar; **[26 Nov]** nor a debt, a shop button or a price in real money. Bar text is sized from fontScale with `allowFontScaling={false}`; at 667 at most four HUD lines. At 40 pt per metre the worker is 46 pt tall and the view about 21 × 9 m.

**Places** (Open there, or from the clipboard once visited): tool rack; office (rota, Night watch, partner wall, the **process board**, later the dealing desk and key board); scale house (boards, tickets, Hold, sell notes); machine pads (buy, level, refine-or-sell); gate notice board (the table, later boards and tours); flagpole (the company); siding, quay, airside shed (booking cards, clip rail); plant halls; the bell (the listing). **[26 Nov]** New cards and where they live: **the shop** (right panel) opens from the office and from Settings, never from a place in the yard or a working card; **Bank loan** is a button on the works card of a plate (machine pad), beside "Save up (about x)"; **the lender's letter** is a centred card, once; the financed machine carries a tag and a ring (a world label); **Agreements** (the bank's agreements; from stage 3 the partnerships) is a page of the office, and the shop's entry sits on the office's first tab, never on Agreements; **a partnership** is a row on that partner's card on the partner wall; **the reuse rack** is a place under a canopy by the gate, place id `reuseRack` (Open: its right panel titled "Yard sale" with the slots, what sold today and the period; never "the rack" in player text, which is the tool rack), with its chip; the green "Reusable" tag is the thing's plate; **the away bonus** is a small centred card after the away card is closed; **the age question** is a centred card, once (7.6); **Settings** carries "Scrip packs: shown / hidden" (locked by a code, 8.4) and, in development builds only, the country switch and "Start at rung 4"; **the flagpole** at every member's gate opens the company (the order by line, the class, the roster's in and out, Requests and sends for short deliveries, members, phrases). **The process board** is the progression screen: unit processes as enamel plates joined as a tree, bought ones lit, each a tap from its machine card; stripper, motor bench and crucible are its first branch.

**Overlays** are the mode's own views registered with `useOverlay` (never the kit Sheet or a `Modal`), one at a time, closed by the scrim or Android back: the **right panel** (min(520, 0.58 W) at 844, 0.62 W at 667, rows 44 pt, text 12 to 13 pt, never under 11), the place dimmed at left; the **wide card** for the dealing desk (side by side at 844, tabs at 667); the **centred card** (≤ 520 × 300) for the away roll and the rung sign.

---

## 11. Art and sound

**Look**: flat vector, three-quarter oblique, drawn in code and baked into atlases while the crane screen runs; at most three atlas draws, 40 actors, 300 sprites a frame; daylight, clean, a yard someone is proud of. **Palette `hi-vis-and-rust`**: sky #EAF1F4, concrete #C9C4B8, galvanised #9AA5AE, asphalt #4B4F54, hi-vis #F4C20D, rust #9A4B2B, ink #2B2E33; orange only for heat (#FF8A2A; ingots cool to their metal colour in 3 s), so never Lantern Row's dusk; each material a colour and a 10 pt pictogram (copper #C8743A coil, brass #D4AF37 tap, lithium #3A6EA5 cell, iridium #A9B6C9 crucible).

**People, vehicles, logos**: the worker in vest, hard hat, gloves, boots, a face shield when cutting, shield and aluminised apron at every pour; crews alike in role colours; nobody hurt or unsafe; vehicles in eight headings, never a crusher on wheels or a tow truck. Logos in two colours, checked against known brands' shape-and-colour pairs: Vantorra a teal stacked-square glyph, Veyra a coral open ring with a notch, Aldane a swept navy triangle, Brannick a notched orange hexagon, Quenwick a split indigo droplet, Orrin a slate square cut by one arc; no chevrons for vehicle makers, no four-point sparkles, no striped or ringed globes; rivals' plates from a separate generated kit.

**Loading animation** (about 3.5 s on first launch; tap to skip from the second): 0.0 s pale sky, a crawler crane swings in an electromagnet; 0.4 to 2.2 s three steel plates, one per word, clank into place (0.6 s each, a 2 pt shake) while the weighbridge display counts kilograms with the load; 2.2 to 2.9 s a small crucible under its hood pours a glowing bar beneath the title; 2.9 to 3.5 s the bar cools to brass in 0.8 s (faster than the game's 3 s, drawn so), the display shows the final weight, the gate opens. While atlases still bake, a calm loop holds (the magnet swaying, the display ticking), never a freeze.

**Icon and store set** (ruling 14): copper and the pour, never a lone gold bar or a truck, judged at 60 px beside the four icons: (a) a gloved hand with a copper coil against a ticket stripe; (b) a crucible pouring, a coil behind; (c) a magnet lifting a coil over rust. Screenshots, the house's first landscape set: the game full-bleed, the caption on a short ticket stub torn at the lower left, proportional type, at most five words, judged at tile size beside the four sets before it is coded. The first shot shows stripped copper, the ticket and the pour in one real frame: the first-yard document places stripper, weighbridge and crucible pad within 21 m, bays and dated board in view.

**Voice `weighbridge-plain`**: short plain sentences in the trade's words with the foreman's dry warmth; no puns, no exclamation marks, no green claims. Never: bet, stake, odds, invest, tips, returns, jackpot, win, prizes, ticker, share price, order book, "order" for sell notes, shift, freight, cargo; **[26 Nov]** shares, stock (in the sense of a holding: "old stock" in heaps and an exchange's warehouse stocks are the trade's words and stay), dividend, cash out, "get rich", "best value", "buy now", "cosmetic only", "daily", "missed", "calm week", "credited" (it is "counted"), and "part" for a holding (a part is a car or machine part). In the game "bank loan", "loan", "charge", "repay", "partnership", "partner terms", "terms", "agreements", "Yard sale" and "Requests" are used (ruling 9.7, 9.14).

**Sound**: a new pack in `games/scrap-yard/assets/sfx` (`soundPack: null`): a drop per material (steel clunk, copper dink, brass ring), grinder, torch, the weighbridge's beeps and printer, the pour, a ship's horn; haptics on each lot. Music: "yard radio", an original 92 bpm guitar-and-bass loop over the game's own metal hits.

---

## 12. Promises, tests and aims

### 12.1 Hard promises (gates from the first run)

1. **Shown equals applied**: every sale, deal, booking, label and purchase applies what its card showed; a changed step re-asks; one rounding function. **[26 Nov]** A scrip pack grants exactly the S its card froze, however late the approval; a finance card's F, deposit, charge and T are what is applied, and every ticket's "to the bank" line is what was taken; a partnership's "Partner terms: −§x" is the discount applied; a rack sale pays the price its tag shows at the sale's step.
2. **Where money comes from**, a closed tested list: lot collections and sales, deliveries, exchange and consignment sales, tolling and take-back fees, ad rewards, **[26 Nov]** rack sales and the reclamation van's collections, verified scrip-pack grants, help paid by the game to a helper, and the away pass of these (plant finance pays the seller of the plate, never the player's cash). It goes only to purchases and levels, feed, reagents, carriage and insurance, prepaid storage, the exchange fee and the duty, **[26 Nov]** deposits and the bank's share of a financed plate's lots (on the payment channels of 5.7), partnership steps, and the price of help received.
3. **Nothing lost, nothing taken**: no cost by the clock; full buffers stop feeders; built things never vanish; no rank falls while away; nothing bought has unknown contents. **[26 Nov]** A debt has no date and never grows; an idle plate's debt stays as it was; nothing financed is ever taken back; a racked thing never vanishes; a partnership is never lost; a member removed from a company keeps what they earned; a quiet week loses nothing.
4. **No dead end**: with §0 and empty bays the gate tip pays within 60 s; every amount asked for is reachable and never met by doing nothing; a purchase that changes nothing is refused with its reason. **[26 Nov]** Cash never goes below zero by a repayment; a deposit never takes the driver's reserve; a scrip pack the yard cannot spend now is not offered; the game is whole with packs off.
5. **The clock**: live time monotonic, the market clock never backwards; a jump never pays twice; looking ahead gains nothing on one device and at most the foresight bound anywhere, on money only; the away pass equals a 10 Hz replay within 0.5 % on frozen content (**[26 Nov]** from stage 2, with crew trips grouped in the tick and the away pass alike, it equals the tick exactly, D87). **[26 Nov]** With an agreement open, a rack selling and help arriving, a tick equals a jump; help applies at the first event after it is received, never back-dated.
6. **[26 Nov] Money's limits**: no working card carries a real-money button; no goal, advice line, away card, refusal, ticket or debt card names a real-money product; no ad and no shop button on any card showing a debt, and no ad button on screen while one is open; nothing sold adds tonnes, range or rank directly; ad rewards and bought scrip never repay a debt and never count on a board.

### 12.2 Tests (vitest, frozen test content)

Mass with reagents (contained metal for hydro); tonnes capped at input mass; cut times; pickup order; the priority split; Hold, reservation, the round; the away pass against the replay across steps, batches and cash-gated skips; `sell(lotId, n)` at boundaries; two clocks and a clock-back; shortfalls charging nothing; range per rung; rivals; payback and ceilings; a skip-to-plate bot gains zero; converter source ids; labels equal weigh-ins; the server bound (7.5); the weekly split and ceiling; 30 members under parallel joins; deletion; content-hash valuation; V under 2^53. **[26 Nov]** Plant finance, partnerships and the rack as 5.7 to 5.9 list them; the pack's frozen quote, a late grant, the ledger's no-twice rule and the reconcile's after-creation rule, the headroom refusal, the rung-4 gate, the switch's defaults, the storefront country unknown until the module answers, the locked switch and its code, the age band's effects (8.3, 8.4, 7.6); I from assets, its lowest-margin recipe and its two moments (8.1); the frozen roster, the default "in", the lines with the "any grade" line, the member's 1.25 cap and the refusal beyond it, the lapsing claim, the weekly limit on covers, help priced at each part's arrival and its tonnes counted once (7.2); the classes formed afresh; the frozen bracket count, the rank by counted ÷ 7 D, the credit curve from first sight (7.3); the server's money and earnings bounds (7.5).

### 12.3 Measured aims (bands set by the lead from the measured table)

| Aim | Measured by |
|---|---|
| First ticket ≤ 25 s; copper jump ≤ 1:30; first helper ≤ 5 min (slow ≤ 9); truck 8 to 10; first pour 18 to 25; rung 3 at 55 to 65 (slow ≤ 90); income ≥ spend every minute of the first 15; ≤ one purchase prompt a minute; the next purchase ≤ 3 min away in hour 1 | prototype, bots at three hands |
| The hand's worth and its three-fifths limit; hand work per sitting (3.4) | bots at rungs 3, 6, 8 |
| Rung days (6.1); rival gaps ≤ 3 days after week one; next capacity purchase ≤ 2 sittings away (twice a day); cash on hand ≤ 2 τ_r of income except when saving for a site | prototype, bots |
| Steel-max bot stalls at rung 4 or 5; skip-only bot supplies zero | bots |
| Market: reader +3 to 7 %, nothing above +8 %, foresight ≤ +25 %, peeks ≤ 0 on one device, the gap open 2 to 4 times a week, stage-1 Hold (day-word bot) ≤ +3 %, reader at rung 7 ≥ 0.5 day sooner | market bot |
| Transport gates (5.4) | stage-4 bot, people-like players |
| Fairness: counted always-on (16 h open, hand used) ≤ 1.25 × twice a day; ad watcher ≤ 1.15 × at day 14; **[26 Nov]** pack buyers' weekly ranks match non-buyers' in the band (frozen D, ranked by counted ÷ 7 D); buyer against non-buyer at days 7, 14 and 30 | bots; the day-14 and day-30 aims in the prototype until their stages exist |
| **[26 Nov]** I within 0.9 to 1.1 of the measured away income an hour at the entry and the last purchase of rungs 3, 4, 5 (8.1); ads at most 54 min of I a day (8.6; 4 % of an always-on day); every aim met with packs on and with packs off | bots |
| **[26 Nov]** Plant finance (5.7: the total exact, cash ≥ 0, tick = jump, no bought load losing money, always-finance at most a tenth sooner to rung 5, finance better on a quarter to a half of offers by the card's numbers, a kilogram through the financed plate netting at least what it nets without it) | bots, before the screens |
| **[26 Nov]** The rack (5.9: 2 to 5 % of a day at rungs 3 to 5, never above 8 %; racking ≥ 1.2 × cutting a minute; present equals away); partnerships (5.8: payback 0.8 to 1.5 τ_r; all at most a tenth of a day at day 14; no tonnes) | bots; partnerships in the prototype |
| Company order at 100 % for 60 to 75 % of simulated active companies **[26 Nov]** (in-members only, Inspection weeks at 60 %; h_o tuned to it, 7.2) | local stand-in |
| Stage-1 tick < 1 ms; 12 h away on five sites < 50 ms; `?yardStress=1` read on the iPhone | the owner's phone |

### 12.4 Who measures, in what order

A numbers prototype (scratchpad `proto/`, starting from `ladder3.py`) runs sections 3 to 6 first and reports every (proto) number with the smallest failing example; then the rules on frozen content, the bots, the screens. **Bots play at a person's pace**: the normal hand reacts in 0.8 s, wastes 25 % of its path, looks 6 to 15 s at a card and spends 85 % of income on capacity; the fast hand 1.3 × (0.4 s, 10 %); the slow 0.7 × (1.2 s, 40 %, leaves goals unfinished). Habits: twice a day (two 8-minute sittings after a first day of an hour), 45 minutes a day (three sittings), three hours a day (three of an hour), always on. Pacing is chaotic (market-design.md M30): an aim is met when 13 of 15 seeds meet it, checked on 5 unseen seeds. **Three people-like players play stage 1 on a phone before any tuning.**

---

## 13. Risks and open questions

1. **An exponential economy** under the payback rule is sensitive (rung 9 moves 2 days between 80 and 85 % spending): τ_r is the lever, the ceilings only guard.
2. **The hand's worth** stays the least certain number; if it fails, raise lots and crate before cutting crew rates.
3. **[26 Nov] Scrip packs** (8.3): a pack spent at once on capacity compounds, about (1 + H ÷ τ_r) per pack, and only the rung's ceiling and the headroom rule bound it; a buyer climbs their own ladder faster and the shared boards are protected only by the frozen brackets, the member's cap and the credit curve. The pack sizes are 2, 5, 10 and 20 h (ruling 9.1), all under τ_4 = 22 h. Germany's rating is very likely 12 for the whole app, although packs are off there at launch; in the EEA and Switzerland packs wait for a lawyer's answer.
4. **Fingerprint**: the weighbridge must read as lots a merchant collects, not a sell pad; stage-4 places against Orbit's routes.
5. **Crowded theme** (Junkyard Keeper, Salvage Empire): copper, ticket and pour first; never a tow truck or crusher.
6. **Phone-only failures** (`Modal`s, the stick at edges, worklets, atlas memory): checked on the iPhone in stage 1. **Scope** 59 to 72 k lines (**[26 Nov]** 63 to 76 k with stage 2's money, bank and rack, 9).
7. **[26 Nov] I, the rated income**, scales packs, loan caps, parts, ads and the company order; the built `ratedOf` is not yet the measure 8.1 defines (it returns 0 before the first yard hand and misses cutting). If the gate (0.9 to 1.1 of the away income) fails, every hour-priced number moves with it.
8. **[26 Nov] Partnerships are nearly nothing under the restated E20** (5.8): with the first yard's loads (k = 0.85) a part may take about 1.25 % off a demolition load and nothing off a farm load, against the ruling's "at most a tenth"; and the co-op's membership is worth about §2 a day at the first yard's deal. The prototype decides before stage 3 is specified: loads' contents and k, or the share from work; ruling 9.10 lets stage 3 choose the partnership's form among three.
9. **[26 Nov] The rack too small to be felt, or a chore**: the public's ceiling is about 4.5 % of a rung-3 day and the drop-off alone gives about 1.9 %; at rung 5 the van's batches must carry it. Levers: f, the period, the factor, the batches.
10. **[26 Nov] Plant finance's share against the plate's own value added**: closed by ruling 9.8 (s_p ≤ u_p, the baler at 0.18). What remains: a plate whose output another machine takes would never repay (5.7, D84); stage 2 refuses to finance such a plate, and stage 3's advance must close the same hole.
11. **[26 Nov] The age question** (7.6) is self-declared: a minor who gives an adult's year sees packs outside the EEA and Switzerland unless a parent hides them with the locked switch or through the platform's own controls; a platform's age signal in the first store build is the owner's decision.
12. **[26 Nov] The ad cap against a habit's day** (8.6, D85): 54 minutes of I is 4 % of an always-on day but 7.3 % of a twice-a-day player's day at rung 3.
13. **[26 Nov] The engine step owed from stage 1** (9, D87): every stage-2 rule that promises "the same function away" rests on grouping crew trips in one engine; if it is not built and measured first, those promises are written against an away function about to be replaced.

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

**D15. Money.** **[26 Nov]** Until the owner chose, the game was built to list A (no ad videos, looks, a plaque), and nothing in the economy was tuned to need list B, whose "Early cover" would have left a buyer far ahead on the all-time board for weeks. On 26 November the owner chose neither list: "Purchases should be limited to cosmetics, currency etc." D20 to D36 replace this decision; nothing in the economy is tuned to need a purchase (D30: the game is whole with scrip packs off).

**D16. The process board** (the tree of unit processes, with bought nodes lit) is the game's progression screen from stage 1, where its first branch is the stripper, the motor bench and the crucible. The rungs are positions on the industry table, shown on the chip and the notice board, never a screen of titles.

**D17. Length.** The document may stay at about 11,000 words; each later stage gets its own document, as the first yard has.


**D18. The first yard has its own rulings**, kept in `docs/design/yard-decisions.md`: E1 to E10 (its economy, after the first numbers prototype) and S1 to S24 (after its review). Where they differ from this document they are right, here as well. In short: the yard starts full of old stock in zones by tool tier, so that in the first hour the hand is the limit and not the supply (E1, replacing the short opening stock of 5.3); the first hour's shop is priced by payback in minutes (E2, replacing "about two hours" in 6.3 and the purchase order of section 9, which the prototype sets); each partner's first load is a small trial load at a fixed price, and the per-kilogram figures of 5.3 are computed from the mixes, not the ones printed there (E3); crew work and time away advance one event-driven engine of stocks and rates (E5); the merchant's round is event-driven with one period, not "every 30 s" (S1); loads on foot go on a platform scale and the truck over the weighbridge with gross, tare and net (S2); the hand load is at most 30 kg and every larger carrier has wheels, replacing "gloves 60" in 3.2 (S8); tool tier 2 is "Sledgehammer and angle grinder" (S6); pickup gains the swap for a better piece (S9); the crucible takes its charge by mass through "Take from bays", and the first pour waits for the boss (S11).

**D19. A rival the player has passed never passes back**, in every stage and on stage 5's shared boards as well: growth and starting tonnes are chosen so that it rarely would, and as a guard the k-th firm below the player shows at most (1 − 0.03 k) of the player's tonnes, so no two rows print the same figure (S17).

**[26 Nov] Decisions of 26 November, on the owner's decisions of that day** (the lead's ruling, `yard-decisions.md` part 6; one decision per point of the ruling, in its order: D20 to D26 are its section 1, D27 to D36 section 2, D37 to D42 section 3, D43 to D47 section 4, D48 to D54 section 5, D55 to D60 section 6, D61 to D64 section 7, D65 to D68 section 8). The ruling stands above the three proposals and the four judges (`design2/`, `notes/judge2-*.md`); its numbers are starting values for the numbers prototype unless a point says "fixed". Where a point could not be written as ruled, the decision says so and names its smallest example.

**D20. "Cosmetics" are looks**: things that change how a yard looks and nothing else (8.2). The reason: anything that changes play is not a cosmetic, and the owner limited purchases to cosmetics and currency.

**D21. "Currency" is scrip**, the one currency the first yard has, sold only as hours of the buyer's own yard's rated income (8.3). There is no second, paid currency: the EU consumer authorities warn against mixing currencies and against exchanges before a purchase. The policy research recommended the other way (an earned currency never sold, and a paid one for looks); the lead chose one currency, and pays for it with the country switch (D30) and the board rules (D33).

**D22. "Etc." is read narrowly**: a No ad videos purchase, and one bundle of looks with it. No pass, nothing random, no timer on any offer, nothing that adds tonnes or rank directly (8). The reason: every wider reading (passes, time-savers, boosts) is what the owner's limit excludes.

**D23. "Bank loans" are three products, each repaid only out of sales**: the bank's plant finance (stage 2), a merchant's advance (stage 3) and a site loan (stage 4) (5.7). A loan repaid by the clock would be a cost by the clock (ruling 9) and pressure to return (PEGI 12).

**D24. "Investments" are a part in a partner** that comes back as better terms on real trade with that partner (stage 3), **and a passed rival's yard** bought as a site (stage 4) (5.8). Player text never says invest, returns, shares, stock, dividend or stake (11); for that reason the listing's disclaimer no longer says "shares" and the listing venue "Calvany Share Market" becomes the placeholder [listing venue] (2, 7.4). "Stock" is banned in the sense of a holding only: the first yard's "old stock" and an exchange's warehouse stocks are the trade's own words (a point the ruling did not settle; the word check needs a person, not a word list, here).

**D25. "Yard sales" are a reuse rack at the gate** from which the public buys (stage 2) (5.9). Between players nothing is ever sold at a price a player sets: a player-set price is the channel through which games are traded for real money.

**D26. "A company like a neighbourhood"**: every player keeps their own yard; a company is founded and joined, at most 30 members (section 7 stands); members help each other a little every day and share a weekly order (7.2). The groups, the rack and the weekly order are our own in theme, words, rules and numbers; nothing of another game is copied.

**D27. Rated income I is fixed in form** (8.1): the scrip an hour the yard would earn with its present assets, no boss, at usual prices, counting the step that binds; computed from assets, never from recent sales, because recent sales can be pumped. Gate: within 0.9 to 1.1 of the measured away income an hour at rungs 3, 4 and 5.

**D28. The catalogue of stage 2 is one card, the shop** (8.2), opened from the office and Settings, not a place on the map: looks at $1.99 to $2.99, earned looks never sold, No ad videos at $4.99, one bundle at one fixed price never holding scrip, and four scrip packs (2, 5.5, 11.5 and 24 hours of I at $1.99, $4.99, $9.99 and $19.99). No working card carries a real-money button. The largest pack is at most the payback time of the rung where packs open: as 6.3 stands (τ_4 = 22 h) the 24 h pack breaks that rule by two hours; the document keeps the ruled packs and a content check that refuses the build until τ_4 is tuned to at least 24 h inside its range or the lead rules on the pack (risk 13.3).

**D29. How a pack works is fixed** (8.3): packs open at rung 4; S = H × I is frozen when the card opens (shown again if the step changed before the store's sheet) and granted as shown however late the approval; a ledger, a pending listener and a reconcile at start; headroom (offered only while the yard can spend it now, read as cash + S ≤ the sum of every card's next purchase under the ceiling); the card says "about H hours of your yard's earnings", never "ahead"; the grant goes through this mode's own consumable kind, never the shared time warp, which pays a moving average.

**D30. The switch is fixed** (8.4): packs OFF in the EEA and Switzerland at launch and where the country is unknown, ON elsewhere, and "Scrip packs: shown / hidden" in Settings. The frame's "off for players the platform reports as under 18" cannot fire today: the smallest example is any player in Expo Go, where no age signal exists without a native module; it becomes real only if the owner puts the platform's age signal into the first store build, and nothing claims it before. The game is whole with packs off, and every aim is measured in both modes.

**D31. Never** (8.5): no goal, advice line, away card, refusal, ticket or debt card names a real-money product; no real-money prompt in the first session; no ad and no shop button on any card or ticket showing a debt.

**D32. Ads** (8.6): rewarded videos only, labelled with what they pay, together at most 4 % of a day's rated income: two away bonuses of up to 15 minutes of I, three spot buyers of up to 8 minutes, 54 minutes a day. The away bonus is on its own small card after the away card is closed (5.6). Ad rewards never count on a board and never repay anything. This replaces the earlier 20 and 10 minutes, which made 70 minutes, over D7's 4 %.

**D33. Boards stay worth playing for someone who buys nothing** (stage 5; 8.7, 7.2, 7.3): weekly brackets credit at most min(D frozen at placement, the band's top) for the whole week; a member's credited deliveries to the company order are at most 1.25 × their frozen share; the all-time board credits on the shared credit curve, labelled "credited", while the private ladder keeps every tonne.

**D34. The store sentence** has two forms (8.8), with packs on and with packs off; neither names a number that tuning can move, and the store page never says invest, returns, trading or earn money.

**D35. Ratings expected** (7.7): Apple 13+ (contests); the European rating 3 to 7 (nothing timed, nothing random, no relegation; "in-game purchases" shown); the German rating very likely 12 where packs are on ("increased incentives to buy"), accepted.

**D36. On the owner's phone** (8.9): in Expo Go purchases are simulated (Buy gives the look or the scrip, no money is taken); a development switch sets the region so that the owner sees the shop with packs on and off; real charges begin with the first store build. The switch lives in Settings in development builds only, because the owner tests on the phone and the preview's dev tools are web-only (a decision of this writing).

**D37. ECONOMY E11 is amended by name** (5.7): "No credit in the first hour's shop: tools, carriers, crew and the first machines are bought with cash. From rung 3 the bank's plant finance exists, on works plates only."

**D38. Plant finance is fixed in form** (5.7): one invented lender, [bank]; a works plate with its own output grades priced at least half an hour of I; F at most 80 % of the price and at most min(2 h, 0.15 τ_r) × I; a deposit of at least 20 % that never takes the driver's reserve; a flat charge of 8 % of F fixed at signing, T printed; repaid by a quarter of each payment for lots of the financed plate's own output grades, so that nothing is taken from the yard's other trade; no due date, nothing that grows, no "repay now", cash never below zero; one agreement at a time in stage 2, never more than 40 % of a payment in all later; the same function away. The card offers one figure of F (the largest allowed), a decision of this writing. Its worked example (the baler at §80,000, F §64,000, T §69,120) shows a point the ruling did not settle: a quarter of a bale lot is more than the baler adds to light iron (19 %), so until T is paid a kilogram through it nets §0.465 against §0.50 loose; D39's aim 7 measures it and s falls inside its range if it misses.

**D39. Finance's aims are measured by the bots before the screens exist** (5.7): the total exact, cash never below zero, a tick equal to a jump with an agreement open, no bought load losing money at any rung (else s falls), an always-financing bot at most a tenth sooner to rung 5, finance the better choice by the card's own numbers on a quarter to a half of the purchases where it is offered. Added at writing, as a reading of "no bought load loses money": a kilogram through the financed plate nets at least what it nets without it.

**D40. Later loans** (5.7): stage 3's merchant's advance (a charge fixed at signing; repaid from every lot of the advanced grade whoever buys it; no delivery date and no penalty) and stage 4's site loan (repaid from that site's payments) with a grant whose conditions the player can see and meet.

**D41. The server's bound** (stage 5; 7.5) becomes: assets + cash ≤ gross earnings + verified pack grants + financed − repaid. The earlier form flagged an honest borrower (earnings §20,000 and a financed baler of §80,000 gave a bound of §14,880).

**D42. The agreement is in the save** and changes the contract's version; the review notes carry one line: loans in the game are fictional, in scrip, and pay nothing out (5.7, 7.7).

**D43. Holdings' words** (5.8): "a part in [partner]", "your part", "terms"; the office's ledger page is "Holdings"; Help says fictional, scrip only, nothing is paid out, not financial advice.

**D44. A part in a partner** (stage 3; 5.8): one per partner, in three steps; it returns only as better terms on real trade with that partner (at most a tenth off a lane partner's load price; a fixed percentage more on deliveries for the foundry co-op, a membership); priced by the payback rule on the trade done with that partner when bought and capped to that trade; never resold, never lost, paid only on loads actually bought, never adding tonnes; the ticket prints "Your part: −§x". ECONOMY E20 is restated: with every holding owned, three fifths of a load's margin still come from the yard's work. **Not writable as ruled together**: the smallest example is Cottle Demolition's first-yard load (label §1,842, prepared §2,689, as found §2,167), where the restated E20 allows 1.25 % off, not 10 %, and Hob's Farm Clearance's load (0.53 from work already) allows nothing. The document keeps both rules and makes the discount min(a tenth, what E20 allows), computed by the content script; the prototype must settle it before stage 3 is specified (risk 13.8). The step rule (a third of the discount per step, each step capped to the flow when it was bought) is a decision of this writing.

**D45. A passed rival's yard** (stage 4; 5.8): a simulated firm the player has passed may offer one of its yards on the key board, bought as a site, with its old stock in heaps (hand work at once); its tonnes count from the day bought; simulated firms only, never players. The rival's row stays on the table and never passes back (D19), a decision of this writing.

**D46. Not built** (5.8): a resale of anything; a price or a return set by chance; a deposit that pays by the clock; anything in another player's company; a company pot or project paid in scrip (bought scrip would reach every member's yard, and paying in would become a social duty). A company build in stage 5, if any, is paid in delivered tonnes, gives a look only, and is the first thing cut.

**D47. Holdings' aims** (5.8): each pays back in 0.8 to 1.5 τ; all together add at most a tenth of a day's income at day 14; none changes tonnes.

**D48. The reuse rack** (stage 2, from rung 3; 5.9): a rack under a canopy by the gate, new at rung 3 (the map before rung 3 does not change); a thing fit for reuse is fixed as such when it is made and tagged before any choice; single real things (a bath, a radiator, a bicycle, brass taps, a stove, gates); never anything electrical or sealed, cylinders, batteries, converters, car parts; the hand lifts a tagged thing whole and carries it to the rack, yard hands too. With the rack full a tagged thing is cut as any other (a decision of this writing).

**D49. The sale** (5.9): members of the public on foot, agents on dated legs off the drive line, one every period while the rack holds anything, the same present or away, with a defined restart (a tick equals a jump); one price in stage 2, 2.5 × the thing's scrap value at the sale's step, so that racking on a high day gives no edge. A choice of price tags is the first thing cut and comes back only if the rack fills in play: with sales going on while away and nothing costing by the clock, the dearest tag always wins unless the rack is full.

**D50. So that it is still felt at rung 5** (5.9): partner loads may carry a reusable batch printed on the label before paying, set aside whole at the rack's trade corner and collected by [reclamation dealer]'s van (not carried out by the public) at 1.5 × its cut value. Two kinds in stage 2 (radiators in the farm's loads; gates and railings in the demolition loads) is a decision of this writing, to give "the second kind of reusable batch" in the cut order its meaning.

**D51. The first moment** (5.9): at rung 3 one reusable bath stands beside the new rack; the first visitor comes within four minutes (one period of 240 s).

**D52. The ladder** (5.9, 6.1): mass sold from the rack counts as supplied tonnes (one ladder), with its term in the server's bound. That it counts toward the range at its prepared grades, as a lot of them would, is a decision of this writing.

**D53. The rack's aims** (5.9): 2 to 5 % of a day's income at rungs 3 to 5, never above 8 %; a minute of the boss's racking earns at least 1.2 times a minute of his cutting; the same result present or away.

**D54. Between players** (stage 5; 5.9): a member's rack is read-only on a tour (an emote may be left). No stand, no price a player sets, no scrip from one player to another, no "send a buyer".

**D55. Section 7 stands**, and the company's place is a flagpole at every member's gate (7.2, 10).

**D56. The weekly order** (7.2): members set "in" or "out" before the week; the roster freezes at the week's start; the order is 25 h × the in-members' rated capacity at the freeze; a member's credited deliveries are at most 1.25 × their frozen share; lines by grade only where at least two members can supply; a claim stays the visible marker it was and lapses quietly after 24 hours at no cost; tiers at 50, 80, 100 and 125 % credited automatically at the close; rewards are looks kept for good, kept by a member removed in mid-week; once a month a calm week (an inspection week) at 60 % with no class moves. It replaces "members with 7 days of accepted play" as the order's base.

**D57. Classes, not leagues** (7.2): companies are ranked within classes of about fifteen of like size and capacity by the share of their order completed; pennants for the top three, kept for good; nothing is lost for a quiet week; no relegation, because losing status for not returning is what the European rating calls pressure, and rates 12.

**D58. Help, every day** (7.2): (a) a request for feed, one a market day, at most two hours of the requester's I, its price locked at posting for both sides, the requester paying the game and the helper paid the same by the game, a helper giving at most an hour of their own flow a day, the received mass booked so that no tonne counts twice, applied at the first event after it is received and never back-dated, written by the server, an unfilled request open until withdrawn with what was set aside returned; (b) covering a short delivery of a member's supply deal, which moves neither goods nor scrip, prevents a loss of trust and never adds trust. If stage 5 runs over, (a) is kept and its lorry animation is cut first.

**D59. Nothing bought and no ad** ever buys a claim, a request, points, an allowance, a deadline, a class or a second draw of rewards (7.2).

**D60. Removal, finding, words, the local mode** (7.2): a removed member keeps what they earned and waits longer before joining another company with each removal; the finder shows emblem, members, an activity word and a mark where the average rung matches; fixed phrases and emotes, no free chat, no typed names; without a network, and for a player under 13, simulated firms play the whole company in the local mode.

**D61. Stage 2, the works, is the next build** (9): the design's stage 2 with the shop (looks, No ad videos, the bundle; scrip packs from rung 4 where the switch is on; simulated in Expo Go), the earned sign styles, rewarded ads, plant finance, the reuse rack and its sale, and two things owed from the first yard (the aggregation of crew legs so that time away is cheap; E36's tuning step). The order a player meets it in, and the rule that the shared store files change first, by one owner, with the four other games' tests green, are in "The next build" (9).

**D62. If stage 2 runs over** (9): one melt line (the battery breaker and lead) moves to stage 3; the never-cut list and the cut-first order are as 9 has them.

**D63. The later stages** (9): stage 3 the merchant's advance and a part in a partner; stage 4 the site loan, a grant, a passed rival's yard, a rack at each site; stage 5 the flagpole, the in and out roster, help, classes, the calm week, the finder, the credit curve and the frozen brackets, emblem parts and company looks on sale, and the age signal if the owner chose it; stage 6 as designed.

**D64. Each stage's aims are measured only up to that stage's top rung** (9); the buyer-against-non-buyer aims at days 7, 14 and 30 stay in the numbers prototype until the stages they need exist (12.3), because at stage 2's top both a buyer and a non-buyer sit at its ceiling and the ratio would pass and say nothing.

**D65. The owner is told** that scrip packs are in, as hours of the player's own yard's earnings; that they are off in the EU and Switzerland at launch until a lawyer has answered one question (there, every scrip price might have to show its real-money value), while looks and No ad videos sell everywhere; and, from this writing, that packs bought back to back are bounded only by the rung's ceiling and the headroom rule (8.3).

**D66. The owner is told** that with packs on Germany's rating will very likely be 12; that a buyer climbs their own ladder faster, while the shared boards credit no more than play can reach.

**D67. The owner is told** that companies compete in classes of like companies for pennants, and that no company is ever dropped down for a quiet week (that would raise the European age rating).

**D68. The owner is told** that hiding packs from under-18s needs the phone to report an age, which needs a native module in the first store build (the owner's decision then), and that on the phone in Expo Go all purchases are pretend.
