# High Office: design of the desk game (mode `decree`)

Status: revision 2, 23 November 2026. It is built on the "election" design, with the decision mechanics of "desk" and the judges' grafts, under the lead's ruling. It was then revised once against three reviews (builder, store reviewer and player, satire editor). Points decided differently from the ruling or a review, with the reason, are in 1.3. **Section 11 (the lead's decisions) overrides the body wherever they differ.**

Game folder: `games/high-office`. Mode (new): `decree`. Save key: `save:high-office:decree1`. Store title (proposed, 7.9): "Proudly Adequate".

Conventions:
- "pt" is a layout point. "s" is a second of the play clock (the shared `stats.playSeconds`, which never moves while the app is closed). "Dibs" is the currency, held in the shared `cash`.
- A **day** is one decided paper of the term. Campaign papers and budget slips are not days.
- B is the **base income** (2.4). Paper prices are stated in seconds of B.
- (tune) marks a starting value that only `scripts/content/build-office.py` may move, inside its range, to meet section 8. Anything else is a rule.
- Times and incomes in 2.13 and 3 come from a rate model (`scratchpad/office/proto/rev2/econ.py`), not the prototype. `build-office.py --table` replaces them. Section 8 is the only gate. Prices are exact.
- Every amount of dibs shown or paid goes through `roundDibs` (merge M19: below 1,000 half up to a whole dib, from 1,000 three significant figures).
- "P" means Pizza Empire, "O" Orbit Haulers, "L" Lantern Row.

---

## 1. The game and its fingerprint

### 1.1 The game in five sentences

1. You are the newly elected mayor of Dithering-on-the-Dawdle, a town in the invented Republic of Middling ("Proudly Adequate"). Every twelve seconds a visitor lays a paper on your desk: a bus spotter, a pumpkin grower, a lobbyist with a suspicious fruit basket.
2. Each paper prints both outcomes in exact numbers ("Vegetables 50 → 54 · −946"). Flick it up into the out-tray to sign it, or pull it down into the drawer marked FOR FURTHER STUDY to refuse it.
3. Your ministries (the Town Clock Office, the Potholes Office, Benches & Bandstands) collect taxes every second, also while you are away. When the desk is empty, the Treasury Clerk slides a budget slip onto it, and a flick up raises a ministry. The approval of named hobby clubs (the Bus Spotters' Society, the Shop Window Guild, the Giant Vegetable Society, and later four more) multiplies every dib.
4. A term is a fixed number of papers. From 60 % of it you may call the election, and the poll board shows, ward by ward, exactly how the count would go today. On election night the wards are announced safest first and closest last.
5. A win carries your Name Recognition and your cabinet to a bigger office (Governor of Upper Wobbling, then President), once your ministries also have the record that office asks for. A loss costs nothing you built: you serve on as Acting Mayor, and the winner resigns over a hobby.

### 1.2 Fingerprint along the 19 dimensions

Declared in `games/high-office/store/fingerprint.json` from the vocabulary of `scripts/lib/fingerprint.ts`. P3 adds one word to `VOCABULARY.progression_structure`: **`office-ladder`**, defined as "a short fixed ladder of offices, each entered only by winning a vote at the end of a term of decisions; a lost vote repeats the term in place; the top office continues as repeated terms". The honest alternatives fail. `location-levels` is Pizza's, and our offices are never bought. `endless-single` is false (there are three offices). `seasons` is Lantern Row's, and it is false. P3 updates spam.md's table row in the same change.

| # | Dimension | High Office | P | O | L | vs P / O / L |
|---|---|---|---|---|---|---|
| 1 | core_verb [M] | swipe/aim: a document on the desk is pushed up into the out-tray (sign) or pulled down into the drawer (refuse); direction and distance decide; budget slips use the same flick | tap-target | drag/route | place/arrange | differs ×3 |
| 2 | production_topology [M] | parallel-generators: 4, 6 or 8 (+5) independent ministries | linear-chain-with-transport | network-routes | spatial-grid | differs ×3 |
| 3 | money_moment [M] | auto-tick: taxes flow in every second | customer-pays | sale-at-depot | contract-complete | differs ×3 |
| 4 | main_screen_layout [M] | single-object-focus: one paper on one desk fills the screen | side-cross-section | top-down-map | grid-board | differs ×3 |
| 5 | art_asset_overlap [M] | 0 %: all drawn in code in `src/ui/decree/art` | | | | differs ×3 |
| 6 | store_text_overlap [M] | under 10 %: all store text new (`scripts/content/office-store.json`) | | | | differs ×3 |
| 7 | icon_and_screenshot_template [M] | own: the "signature" template and a light icon (7.9) | | | | pending ×3 (person) |
| 8 | bundle_foreign_content [M] | none: mode `decree`, own folders, own fx catalogue `catalog.decree.ts` | | | | pending ×3 (bundle report) |
| 9 | progression_structure | office-ladder (new word) | location-levels | sector-map | seasons | differs ×3 (P: a person may read "probably same") |
| 10 | prestige_model | new-location-carryover: a bigger office, Name Recognition and the cabinet carried | reset-for-currency | reset-for-currency | seasonal | differs ×3 |
| 11 | active_skills_events | {strike, scandal, follow-up-return, ribbon-cutting, campaign-week, election-night} | 6 ids, Jaccard 0 | 4 ids, Jaccard 0 | 3 ids, Jaccard 0 | differs ×3 |
| 12 | meta_systems | {in-tray, ministers, follow-ups, gossip, elections, scrapbook, vanity-shelf, prestige} | 1/15 literal; 3/13 counting ministers as cards and offices as locations | 1/15 | 1/13; 3/11 counting ministers as minders and the scrapbook as the Ladder Book | differs ×3 ("elections" unique) |
| 13 | meta_screen_layouts | different: a clothbound ledger, a framed cabinet photograph, a pinned ward map, a chalk tally board, an office wall with a shelf and a scrapbook | | | | pending ×3 (person) |
| 14 | art_style | flat-vector, palette "baize-and-ink" (4.6) | warm-cream | deep-space-cold | lantern-night | differs ×3 |
| 15 | character_kind | humans | humans | robots | animals | SAME / differs / differs |
| 16 | audio_overlap | 0 %: soundPack null, own recipes, compare.py cross-key gate | | | | differs ×3 |
| 17 | tone_and_string_overlap | voice "deadpan-memo"; under 5 % shared strings (`src/ui/decree/strings.ts`) | warm-playful | dry-radio-chatter | lantern-calm | differs ×3 |
| 18 | keyword_overlap | desk, mayor, governor, president, papers, sign, town hall, funny, satire, decisions, cartoon, clerk | | | | differs ×3 (tool computes) |
| 19 | release_gap | first submission at least 14 days after Lantern Row's last | | | | pending ×3 (log) |

Count (recomputed after this revision):
- Against Pizza Empire: 8 of 8 must; 18 of 19 planned (only 15 is the same). Known at design time: 14 (1 to 6, 9 to 12, 14, 16 to 18); pending: 7, 8, 13, 19. The planning figure is **17**, because a person may count 9 as "probably same" (store review). If a person also rules 13 "restyled", the floor is 16.
- Against Orbit Haulers and against Lantern Row: 8 of 8 must, 19 of 19 planned, 15 known at design time; floor 18.
- All three stay at or above 15 with every must at 8 of 8.

**The one shared "should" (humans, against Pizza only).** Pizza draws round chibi heads with big eyes on small full bodies in a kitchen cross-section, with a thick dark outline. Ours are editorial-cartoon busts: long oval heads (1.4 times taller than wide), dot eyes under heavy brows, and adults only. They are framed as head and shoulders in an oval photo clipped to the paper; full figures appear only on election night, as tall paper cut-outs with heads 1/6 of the body. The line is a thin warm-brown ink of varying width, with one-direction hatching over two flat washes. Nobody walks, carries or serves.

**Making the idle layer ours** (store review): growth happens on the desk through budget slips flicked like papers (2.7), not on a list of buy buttons. The Ledger is a read-only book with one untaught "Raise" per row. Milestones are storeys every 12 levels, not 10/25/50/100. Opening costs step ×16. Ministers bring one printed desk rule each, not a multiplier card. The aim in 8.4 is that at least 70 % of thumb actions in minutes 0 to 10 are flicks.

Validate's other checks: no "Empire" and no "X: Y" shape in the title; "idle" and "tycoon" only in the description; product ids start with `office_`; the product kind multiset {unlock, cosmetic, cosmetic, skipAds} differs from P's, O's and L's (the check counts duplicates; see openQuestions in 11's intake).

Weakest claims, argued in `REVIEW-NOTES.md` with the tap path ("Read the paper; pull it down to refuse, push it up to sign"):
- 1 against Orbit's freighter swipe, which is Orbit's money-making step: ours is taught refusal first, by a pull down. There is no arming click. Past 40 pt a signature writes itself across the strip in violet ink (signing) or the drawer creaks open by the distance (refusing). The tutorial hand is a drawn pen, not a reticle. Against drag (O, L): nothing is carried to a chosen place; one axis, two fixed destinations.
- 1 against well-known card games: a document, not a portrait card; vertical only, no tilt; both outcomes printed in full; 3, 5 or 7 clubs, never four meters; nothing ends a run.
- Against Paperwork Inc (the nearest existing game: papers approved or denied in a growing office, bribes that cost later in an audit): ours has no printer, conveyor, audit or bribe slider. A basket never pays money and always costs later (2.2). Growth comes from ministries paying taxes, and consequences are printed numbers. The words "audit", "office empire", "processing" and "document" stay out of the store text and the UI strings (a store-text deny list, 7.8).
- 9 and 10 against Pizza: Pizza buys venues with cash. An office here is entered only by a vote computed from decisions, with a record of ministry levels as a second condition.

### 1.3 Points decided differently, with the reason

1. **Refuse goes into the drawer FOR FURTHER STUDY, not a shredder.** It is the funnier joke about office and a running gag (5.1), and a judge read shredding government papers as a cover-up. Sounds agree (a wooden drawer, no motor). The title moves to the coined motto (7.9).
2. **The rally is a campaign paper** paid from the treasury, not a button. Effects freeze when a paper lands (ruling 7), so every mood change is a decided paper.
3. **No paper carries a day cost.** Moving the calendar on brings the call day nearer, which would help a leader (ruling 9). Committees cost money and return with a bigger study instead.
4. **A rival's pull R** (7 / 9 / 11 off every share, printed on the poll) is part of the count. Without it, every club at 50 holds every district and there is nothing to win.
5. **Money has a job on the ladder** (builder, blocking). Standing for Governor or President needs Name Recognition *and* a record of ministry levels (2.2). Ads and products that give money therefore save time, which ruling 6 allows, and touch no mood, poll or count.
6. **Budget slips** (store, blocking): when the desk is empty, the advised purchase arrives as a slip flicked like a paper. Slips are not days, carry no text to write and move no counter. They fill the empty desk and make the flick the most frequent action.
7. **Ministers are a desk rule, not a multiplier** (store): 9 ministers, 3 per office. Each runs a named ministry and brings one printed rule.
8. **The strike's natural end brings no mood change** (it used to bring +6). The free wait and the "Send a Courier" ad then differ only in income, so the ad reaches no mood.
9. **"Say nothing" no longer blocks the call** (builder). Its only cost is taxes ×0.8 for 10 papers, so the Spin Doctor ad saves money and time only.
10. **"Bigger In-Tray" is cut** (store, builder: it broke H10's time bound and is not among ruling 6's products). A second cosmetic takes its place.
11. **After a loss you are "Acting"** (satire). The ruling's term in the same seat stands; only the framing and the label change (2.10).
12. **"One new thing per term"** holds for 181 presidential terms: 5 Grand Projects, 10 twists, 45 pairs, then 120 triples. The level cap no longer rises (it never bound).
13. **Disarray guarantees a win within 9 losses** in the worst case (2.11). The measured target is far shorter (H6).
14. **Cut from v1:** the manifesto (its promises let ad money reach the count), Name Recognition perks, Who's Who, Bigger In-Tray, the compact "Again:" form.

---

## 2. Rules

Pure TypeScript in `src/engine/decree.ts` (the interface) and `src/engine/decree/`, installed by `src/engine/decreeMode.ts` as an `EngineMode`. The game.json `decree` block stays opaque in the shared schema and is parsed by `src/config/schema.decree.ts` in `EngineMode.config`. Starting numbers live in `src/config/decree.content.ts`, tuned and written by `build-office.py`. There is no `Math.random` and no `Date.now`: time comes as `now`, and randomness from `rngMix4(seed, site, counter, x)` with one forward-only counter per site (`pick`, `petitioner`, `jitter`, `template`, `followDelay`, `campaign`, `rival`, `note`).

### 2.1 The rules in twelve lines (what the player is told; the whole engine)

1. Ministries collect taxes every second. Approval multiplies them.
2. While you play, a visitor brings a paper every 12 s (15 s as President), until 10 are waiting. Away, one comes every 6 minutes.
3. A paper prints exactly what signing and refusing do. Those numbers are applied.
4. Push it up to sign, pull it down to refuse. You can sign only what the treasury can pay. Refusing never costs money.
5. When no visitor waits, the Treasury Clerk brings a budget slip: push it up to buy, pull it down to put it back.
6. Each club has a mood from 0 to 100. Approval is their weighted average. A club below 20 boycotts its ministry until you settle or 8 more papers are decided.
7. Some papers add gossip. At the limit the newspaper prints a scandal: apologise, or say nothing and lose a fifth of your taxes for 10 papers.
8. Some choices come back later. A ↩ on the paper tells you which.
9. A term is a fixed number of papers. From 60 % of it you may call the election.
10. Each district votes by the moods of its clubs. The poll board shows the result exactly as it would be today.
11. Win, and you gain Name Recognition. With enough, and with your ministries' record, you move up. Lose, and you serve on as Acting. Nothing you built is lost either way.
12. While you are away, ministries collect for up to 4 h and the in-tray fills. Nothing else changes.

### 2.2 Content data (starting values)

Offices:

| | Mayor | Governor | President |
|---|---|---|---|
| Place | Dithering-on-the-Dawdle | the Province of Upper Wobbling | the Republic (capital Middlingham) |
| Ministries | 4 | 6 | 8, + 1 Grand Project at each of terms 2, 4, 6, 8, 10 |
| Clubs / districts / majority | 3 / 5 wards / 3 | 5 / 7 counties / 4 | 7 / 9 provinces / 5 |
| Arrival interval τ | 12 s | 12 s | 15 s (each tune 10 to 18) |
| Term length D (days) | 80 | 110 | 120 (tune ±20 %) |
| Call from day C = 0.6 × D | 48 | 66 | 72 (fraction tune 0.5 to 0.7) |
| Campaign papers K (+ the rally) | 3 | 4 | 5 |
| Gossip limit G_max | 5 | 6 | 7 |
| Rival's pull R | 7 | 9 | 11 (tune 3 to 12) |
| Scale S | 1 | 1,000 | 1,000,000 (tune ×0.3 to ×3 each) |
| Name Recognition to stand | — | 10 | 50 (tune ±30 %) |
| Record to stand (levels across the office's ministries) | — | 80 (the Town Record) | 170 (the Province Record) (tune ±30 %) |
| Weight O of a win | 1 | 2 | 3 |
| Request every n-th draw | 10 | 8 | 4 (tune ±2) |
| Template share q | 0 | 0.15 | 0.20 (tune 0 to 0.25) |

Clubs (icon): the Bus Spotters' Society (bus; enthusiasts with notebooks), the Shop Window Guild (shop bell; dressers of the annual window contest), the Giant Vegetable Society (pumpkin). The governor adds the Brass Band Guild (tuba) and the Anglers' Circle (float); the president adds the Kite Flyers' League (kite) and the Tidy Hedge Committee (clippers). On paper they are written "Bus", "Shops", "Vegetables", "Brass", "Anglers", "Kites", "Hedges". The counts are 3, 5 and 7, never 4.

District mixes w_{d,g} (hundredths summing to 1.00, data). Each district has 2 or 3 strong clubs; every club is strongest in at least one district and in no more than half. The mayor's wards:

| Ward | Bus | Shops | Vegetables |
|---|---|---|---|
| Market Ward | 0.20 | 0.60 | 0.20 |
| Mill Ward | 0.55 | 0.25 | 0.20 |
| Hilltop | 0.20 | 0.20 | 0.60 |
| Riverside | 0.45 | 0.15 | 0.40 |
| Old Town | 0.30 | 0.40 | 0.30 |

Population weights W_g = mean over districts of w_{d,g}: mayor Bus 0.34, Shops 0.32, Vegetables 0.34. Governor and president tables are data in the same form (writer 2 names the counties, 7.1; P2 sets the mixes by the rule above).

**Ministries.** Ministry 0 of each office serves no club, so it never strikes and income is never zero. Ministry i (0-based) of an office of scale S:
- base value v_i = S × 8^i (step tune 6 to 10);
- open cost O_0 = 0, O_i = S × 150 × r^(i−1) with r = 16 (tune 13 to 30, one step for the whole table, never per entry). Mayor: 150, 2,400, 38,400;
- level cost L → L+1 = 15 × v_i × 1.25^(L−1) (growth tune 1.15 to 1.30);
- **storeys:** every 12 levels (12, 24, … 96) the ministry gains a storey, drawn in the Ledger's margin, and its rate doubles. st(L) = floor(L/12). A storey brings a ribbon-cutting form (2.7);
- level cap 96 (8 storeys) in every office. A purchase that would change nothing is refused (merge M45).

| Office | Ministries (club served) |
|---|---|
| Mayor | Town Clock Office (none), Potholes Office (Bus), Benches & Bandstands (Vegetables), Signposts & Lampposts (Shops) |
| Governor | Provincial Clock Office (none), Bus Shelter Trust (Bus), Market Weights Board (Shops), Glasshouse Office (Vegetables), Bandstand Board (Brass), Canals & Jetties (Anglers) |
| President | National Clock Office (none), Motorway Board (Bus), Lamplight Authority (Shops), Parks & Benches (Vegetables), Office of Brass & Bunting (Brass), Harbour Board (Anglers), Kite & Breeze Office (Kites), Hedgerow Bureau (Hedges) |
| Grand Projects (president, no club) | The Very Long Bridge, The National Ribbon Mill, The National Umbrella, The Tallest Bandstand, The Ministry of Ministries. Project j (1 to 5) continues the ladder as ministry 7 + j: v = S × 8^(7+j), open cost S × 150 × r^(6+j) |

Roads and ports from the promise are here; schools are not (politics-policy.md 4 keeps schools and children out). No ministry reads as state media, policing, the army or real policy.

**What money is for.** Money buys levels and openings (through slips, the Ledger or requests), and levels raise income and fill the record that standing for the next office needs. Signing a paper spends money that would otherwise buy levels. Paper prices scale with B, so papers stay affordable. The record is counted in levels, not dibs, so a richer player reaches it sooner but nobody reaches it without buying. No mood, poll or count reads money.

**Money tiers of papers** (seconds of B, frozen at the draw, 2.7): S 15, M 30, L 60 (tune ×0.5 to ×2), times a jitter j drawn from 0.85 to 1.15; minimum 5 dibs.

**Archetypes** (the writer picks one; the table fixes the base effects Δ; each tune ±1). This table replaces the first one, under which signing won on moods for about three quarters of papers (builder):

| Archetype | Share of comic papers | Sign | Refuse | Mood net, sign − refuse | Reader signs (model) |
|---|---|---|---|---|---|
| Project | 24 % | cost S · petitioner +4 · other −3 | petitioner −3 · other +2 | +2 | 50 % |
| Swap | 20 % | petitioner +4 · other −4 | petitioner −4 · other +4 | 0 | 42 % |
| Fee | 14 % | gain M · petitioner +2 · other −4 | petitioner −1 · other +1 | −2 | 38 % |
| Treat | 12 % | petitioner +3 · other −1 · gossip +1 | petitioner −2 | +4 | 87 % |
| Committee | 15 % | cost S · petitioner +1 · other −2 · ↩ bigger study | petitioner −2 · other +1 | 0 | 25 % |
| Vanity (a trap) | 8 % | cost L · every club −1 | No change | −3 | 0 % |
| Basket (a trap) | 7 % | gossip +2 · ↩ favour | No change | 0, and +2 gossip | 0 % |

"Petitioner" is the visitor's club; "other" is the club the writer names as the other side (the feuds of 7.2), which lives mostly in other districts, so the district term decides Swaps, Projects and Committees. The net is the sum of base effects with equal weights at mood 50. Refuse is strictly better by moods on Fee and Vanity (22 %); Swap, Committee and Basket (42 %) tie on moods and are decided by districts, money and gossip; sign is better by moods on Project and Treat (36 %). The last column comes from a rough model (`scratchpad/office/proto/rev2/term.py`: the mayor's office, 300 runs of 6 terms, requests and ribbons included, campaign as K closest-district papers). Over all papers the reader signs 46 %. Election wins: reader 97 %, always-sign 42 %, random 34 %, always-refuse 21 %; always-sign meets 1.7 scandals a term. The prototype must confirm these before any bot target is tuned (8.1).

A **basket** never pays money in any branch and never pleases a club: lobbyists speak only for their absurd trade. Its follow-up, the favour, costs a club on the sign side (a club −3 · gossip +1) and nothing on the refuse side, and its clipping always mocks the mayor. Traps whose refuse is "No change" (Vanity 8 % + Basket 7 %) are at most 15 % of each office's deck.

**Routine papers** (expected to recur; printed forms, not jokes, 2.7): ministry requisition (sign: the printed price, that ministry +1 level, its club +1; refuse: its club −1), ribbon-cutting at a storey (cost S, served club +3 | served club −1), minister application (2.9), strike settlement (2.8), scandal (2.8), campaign papers and the rally (2.10). Budget slips (2.7) are not papers of the term.

**Ministers** (2.9): 9 named, 3 per office (7.3), each with one desk rule.

**Other values:** starting treasury 30; tray cap 10; away arrival every 360 s (tune 240 to 600); away rate a = 0.35 (tune 0.25 to 0.45); away cap 4 h (+4 h with Long Lunch); Name Recognition factor m_N = 1 + 0.02 × NR (tune 0.01 to 0.04); disarray Y = 8 per consecutive loss (tune 8 to 10, an integer); vanity factor 1.02 per monument (tune 1.01 to 1.04); transition fund 30 s of the old B (tune 15 to 90); petitioner weight max(0.5, min(1.5, 1 + (50 − m_g)/50)).

### 2.3 State

`DecreeState` sits on the shared `GameState` under `decree`. Cash is the shared `cash`, changed only through one `commit()`. The play clock is the shared `stats.playSeconds`, which `tick` adds itself.
- `seed`; `draws` (one counter per site).
- `office` (0 mayor, 1 governor, 2 president); `term` (1-based in this office); `presTerms`; `day`; `phase` (`governing` | `campaign` | `count` | `result`); `losses` (consecutive at this seat).
- `ministries[i]`: `{open, level}`.
- `moods[g]`: integers 0 to 100. `gossip`: integer ≥ 0. `quiet`: decisions since the last gossip gain.
- `strikes[g]`: `{papersLeft}` or null; `armed[g]`.
- `scandal`: `{papersLeft}` or null (only while "Say nothing" runs).
- `tray`: up to cap papers, each fixed at its draw; `desk`: the paper or slip on top with `shown` (effects frozen when it landed) and `drawnLevel` for forms; `pending`: a signed paper inside its take-back window (4.3); `asideTray` (ordinary papers set aside by a call).
- `nextArrivalAt` (play clock); `awayCarry` (seconds toward the next away arrival).
- `followUps`: `[{chainId, step, choice, dueAt}]`, dueAt in decisions ever; `seen`: text id → last decision index; `frameBag` (the shuffled template frames not yet dealt); `notesSeen`.
- `campaign`: `{C[d]}` campaign points this term.
- `nr` (Name Recognition, never falls); `cabinet[id]`: `{ministryClub, termsServed}`; `applicationsDelivered`; `vanity`; `twistIndex`; `rivalIndex[office]`; `clippings`; `wall`; `drawerCount`; `adsUsed` (per term: `sofa`); `cooldowns` (play clock); `standingOrder`; `stats`.

### 2.4 Derived values

- Approval A = Σ_g W_g × m_g, shown as a whole percent. Revenue multiplier M(A) = 0.4 + 1.2 × A/100: ×0.4 at 0, ×1.0 at 50, ×1.6 at 100 (slope tune 0.8 to 1.4). The top bar shows "62 % ×1.14".
- rate_i = v_i × L_i × 2^st(L_i). Vanity V = 1.02^vanity.
- **B = m_N × V × Σ_i open_i × rate_i.** It sizes papers and the transition fund.
- **I = M(A) × m_N × V × Σ_i open_i × s_i × rate_i × (0.8 while "Say nothing" runs)**, s_i = 0 while ministry i's club boycotts, else 1. I is constant between player actions and arrivals.
- District share: share_d = min(100, max(0, Σ_g w_{d,g} × m_g + C_d + Y − R)), Y = 8 × losses, computed in hundredths and shown to one decimal. You hold d when share_d ≥ 50.0. The poll is the number of districts held.
- Record = Σ_i level_i over the current office's ministries (Grand Projects excluded).

### 2.5 What a tick does (`EngineMode.tick`)

- cash += I × dt, exactly (cash at the last change + I × elapsed).
- Arrivals due in (clock, clock + dt] are drawn at their exact times while the tray has room (2.7). With a full tray the arrival clock stops; the next paper comes τ after a place frees. Arrivals stop during `campaign`, `count` and `result`.
- A budget slip lands 1.0 s after the desk and the tray become empty, if advice() names an affordable purchase (2.16).
- Nothing else moves with time: no mood, gossip, strike, scandal or day.
- tick(a + b) = tick(a) then tick(b) exactly (tested). The bot steps from event to event.

### 2.6 Player actions

`decide(choice)` (sign or refuse the desk paper or slip), `takeBack()`, `raise(i)` (the Ledger's untaught button), `openMinistry(i)`, `buyVanity()`, `callElection()`, `countVotes()`, `chooseAfterWin(moveUp | stay)`, `setStandingOrder(on)`, and the ad and product grants of 5.11. Each is a store action that calls the rules; each refuses and returns the same object when not allowed. Every purchase other than a paper keeps back **the reserve**: the sign cost of the desk paper plus the next waiting paper ("Kept for the desk: 540"). A purchase that would cut into it is refused with that sentence.

### 2.7 The paper

**Fields** (fixed at the draw, stored whole): id; kind (comic, template, followup, requisition, ribbon, application, strike, scandal, campaign, rally, scripted, slip); visitor (face, name ≤ 24 characters, role ≤ 28, club); text ≤ 90 characters (median ≤ 65 per deck); archetype, subject, butt and joke-shape tags; two outcomes of at most 4 effects each from a closed set (money, club mood as base Δ, every club as one effect, gossip, ministry +1 level, appoint a minister, end the strike, end the scandal, district points); an optional follow-up `{chainId, step, delay}`; for forms, the target ministry and `drawnLevel`.

**The draw** (at each arrival, in this order):
1. A strike or scandal paper due now goes on top (it may exceed the cap by 1).
2. A scripted paper (the first four of a new game, the first paper of each office).
3. A follow-up whose dueAt has passed, earliest first; never one whose set-up was not seen and decided.
4. A routine form due: the next undelivered application at days 9, 30 and 60 of any term until all 9 have come (fixed order); a ribbon form when a ministry gained a storey; a requisition every n-th draw for the open ministry with the best payback.
5. A template with probability q, dealt from the shuffled frame bag (none twice before the bag empties); else a hand-written comic paper.

**The comic draw.** Every eligible unseen text t (this office's deck, the any-office deck, and lower offices' texts tagged `portable`) gets the weight clubWeight(club_t) × share(archetype_t) / (unseen texts in t's club-and-archetype cell), and one is picked. While cells hold texts this keeps the club and archetype shares of the table; when a cell is empty its weight passes to the rest. Fallback, only when no unseen eligible text is left: a template; then the text seen longest ago, shown whole with a new last line from the 60 "returning visitor" lines ("Back again, with the same pumpkin and a firmer tone."), so the proposal is still read.

**Sizing, part 1 (at the draw):** money = roundDibs(tier seconds × B_draw × j). It is stored and never recomputed.

**Sizing, part 2 (when the paper lands on the desk):** twist and minister factors multiply the base Δ first (the validator checks every effective |Δ| ≤ 10). Mood effects are then computed once against the moods now and frozen into `shown`. For a base Δ on club g with mood m:
- gain: f+ = min(1.4, (100 − m)/50); loss: f− = min(1.4, m/50);
- shown = sign(Δ) × max(1, round(|Δ| × f)), rounded half away from zero, and 0 when the headroom (100 − m for a gain, m for a loss) is 0.
- The same paper therefore moves an unhappy club more by a yes and less by a no.

**Lemma (tested):** with |Δ| ≤ 10, m + shown stays in 0 to 100. For a gain, |Δ| × f+ ≤ (100 − m)/5 ≤ 100 − m, and rounding cannot pass that integer; under the cap (m < 30), 14 < 70; the minimum of 1 needs headroom ≥ 1. A loss is symmetric. The one fixed effect keeps it: a settlement's +10 starts below 20. No clamp ever bites, so printed equals applied; the engine asserts `clamps = 0` (H1).

**Forms are checked at commit.** A requisition or slip prints "Potholes Office +1 level · −458" with the current level shown live beside it. If that ministry's level is no longer `drawnLevel` when the paper is decided (the Ledger or the Standing Order bought it), the form leaves as "Already done: the Clerk takes it back", with no effect. At the cap it leaves as "No longer needed". So the printed price always buys the printed level.

**What a strip prints:**
- Its title row: "IF SIGNED ↑" or "IF STUDIED ↓", then one derived line. It shows "Poll 3 → 4 of 5" when that outcome changes the number of districts held; otherwise the approval icon and "62 → 63 %". A ↩ icon at its right end marks an outcome that schedules a follow-up.
- Chips: an icon with the resulting value ("[pumpkin] 50 → 54", "[coin] −946", "[gossip] 2 → 4"). A club chip carries a small flag when that club is strong (w ≥ 0.4) in a district within 3 points of 50. "Every club" is one wide chip ("[all] −1 each · [approval] 50 → 49"); a tap opens each club's exact value.
- The note row, in priority order: the strike or scandal warning ("Vegetables below 20: BOYCOTT", "Gossip 5/5: SCANDAL"), then "Short by 240 · about 9 s". "No change" sits in the chip area.
- All of it is exact and derived from `shown`, so printed still equals applied.

**Decide(choice):**
- Sign is refused while cash < cost ("Short by 240 · about 9 s"); the paper can wait while taxes come in. Refuse is always possible and never costs money.
- A signed day paper rests on the out-tray for 2 s, and a tap takes it back unchanged (4.3). It is committed when the 2 s pass, at a tap elsewhere, or when the app goes to the background. Refusals and slips commit at once.
- Commit applies `shown` exactly and runs 2.17. The next paper lands only after the commit.
- The sticky note announces a follow-up one paper ahead: "Next: the pumpkin is back."

**Budget slips.** When the desk and the tray are empty, Gwendolyn Abacus slides a slip onto the desk 1.0 s later, if advice() names a purchase that is affordable above the reserve: "Benches & Bandstands +1 level · −120 · +8/s". Up buys it at the printed price (H1 covers slips), down puts it back at no cost. A visitor's arrival returns an undragged slip to the pile, and the paper lands. Slips are not days, carry no written text and move no counter. If nothing is affordable, the desk shows the sticky note "Next: Benches opens · 2,400 · about 40 s".

### 2.8 Boycotts (strikes) and scandals (counted in papers; nothing moves while away)

**Strike, called a boycott on screen.** After a commit, any club with m_g < 20 whose strike is armed starts one, always over something the mayor did. Its ministries' s_i = 0, the club's picket sign (its own slogan, none twice in a term) appears on its Ledger row, and its spokesperson's grievance paper goes on top of the tray. The 14 grievances (2 per club) are hand-written, for example the ribbon scissors kept, the prize rosette worn, or the pond renamed after you.
- Sign (for example "Return the scissors"): cost 20 s of B, the club +10 (fixed, not scaled), the boycott ends.
- Refuse (for example "Keep the scissors"; never "Let them…"): the boycott runs for the next 8 decided papers, then ends with no mood change.
- It also ends at once when the club reaches 25 or more by any means. It re-arms when the club reaches 30.
- The optional ad "Send a Courier" ends it now, with no mood change (5.11). It differs from the free wait only in income.

**Gossip and scandal.** Gossip rises only by effects printed on papers. Low approval never adds gossip, so there is no spiral. After 8 consecutive decisions without a gossip gain, gossip falls by 1 (to 0 at least). When a commit brings gossip to G_max or more and no scandal runs, the newspaper's front page goes on top of the tray:
- Sign "Apologise on the steps": every club −3 (one chip, scaled by f− per club, shown), gossip to 0.
- Refuse "Say nothing": I × 0.8 for the next 10 decided papers, then gossip to 0. It does not block calling the election.
- The optional ad "Call the Spin Doctor" ends "Say nothing" now and sets gossip to 0, with no mood change.
- A scandal still running at the term's last day ends.

Both always have a free way out that costs no real money and needs no ad. Neither closes a ministry, lowers a level or touches Name Recognition.

### 2.9 Ministers (the cabinet)

- 9 ministers arrive as application papers in a fixed order: the next undelivered one at days 9, 30 and 60 of any term until all have come. Sign appoints; refuse sends them away, and the same application returns 30 papers later, in whatever office. None is lost.
- Each application names the minister's ministry by its club ("Minister for Potholes", the Bus ministry), frozen at the draw. The minister runs that club's ministry in every office (at a move, the new office's ministry of the same club), with one desk rule printed on every paper it touches as the minister's initials ("DP −10 %"). Every rule is a factor on one parameter (7.3).
- Each minister's terms served are shown as a plain fact on the cabinet photograph. Ministers are never bought, never random and never ranked.

### 2.10 The term, the run-up and the count

- The term ribbon reads "Day 41/80 · NR 9/10 · Lv 52/80". From day C it becomes the button "Call the election · poll 4 of 5".
- **Calling** needs day ≥ C and phase `governing`. The confirmation prints the count as it stands ("If you call it now: 4 of 5 wards. 3 needed."). At day D the run-up starts by itself.
- **The run-up** (the campaign) is shown on screen as public appearances (judging a hedge show, opening a fête), paid from the treasury as town business. It runs as 2.17 says. A campaign paper names a district (seeded, among those within 6 points of 50, else the closest). Sign costs 45 s of B, that district +4 and another −1 (campaign points, not moods); refuse is "No change". The rally costs 60 s of B on the sign side and gives the lowest club +4 (scaled, frozen); refuse is "No change".
- **No ad and no product is offered from the call to the end of election night** ("Closed during the run-up").
- **The count:** the poll is the result, number for number. Districts are announced in order of |share_d − 50|, largest first, ties by index, 2.5 s each; a tap skips.
- **After a win:** NR += O × (3 + districts held), + 2 × O if every district was held; losses = 0; each minister's terms served +1. If NR and the record meet the next office's requirement, the result sheet offers "Stand for Governor" (the move, 2.12) or "Another term here". Otherwise it offers "Another term here" and says what is missing ("Governor needs Name Recognition 10 and a Town Record of 80: you have 8 and 71"). The same rival stands again, with their "back for another go" line.
- **After a loss:** NR += O; losses += 1 (so Y rises by 8); terms served +1. The winner resigns over their hobby ("Councillor Plumb won, then resigned to spend more time with her hat."). You serve on: the ribbon and the wall portrait read "Acting Mayor" (Governor, President) until the next win. The next rival on the office's list (3 for mayor, 3 for governor, 12 for president) stands; the resigned one goes onto the Office wall's "Former opponents" card. On the poll Y is labelled "Opponents in disarray +8". No text counts or celebrates terms held.
- **A new term in the same seat** (after either): day = 0; every mood moves halfway back to 50, rounded toward 50; gossip to 0; campaign points to 0; `asideTray` returns to the tray (its money as drawn); a monument is offered (5.8). The term brings one new thing: the office's next twist (2.14).

### 2.11 Why repeated losses must end in a win

For any district d at the count, Σ_g w_{d,g} × m_g ≥ 0 and C_d ≥ −K (each campaign paper takes at most 1 point from one other district). So share_d ≥ 8 × losses − R − K. Every district is held as soon as 8 × losses − R − K ≥ 50, that is, losses ≥ (50 + R + K)/8: mayor (50 + 7 + 3)/8 = 7.5, governor (50 + 9 + 4)/8 = 7.9, president (50 + 11 + 5)/8 = 8.25. So the 8th consecutive loss as mayor or governor, and the 9th as president, is followed by a certain win, whatever the player does, even with every mood at 0. At the extremes of the tuning ranges (R 12, Y 8) the president's bound is (50 + 12 + 5)/8 = 8.4, so 9. The validator recomputes ceil((50 + R + K)/Y) from the tuned values and fails when it exceeds 9. In practice the halfway reset lifts every club to at least 25 at each new term, so the measured bound is far shorter (H6).

### 2.12 The bigger office: what resets and what carries (`EngineMode.prestige`)

`canPrestige` is true only on the result sheet after a win with NR and the record at the requirement. The move:
- **Resets:** treasury to the transition fund (30 s of the old B); the new office's ministries (ministry 0 at level 1); clubs at 50 + min(5, floor(NR/20)); gossip, strikes, scandal, day, campaign, losses. Waiting ordinary papers and `asideTray` go back to the deck unseen.
- **Carries:** Name Recognition; ministers and terms served (each runs the new office's ministry of their club); monuments; the scrapbook and every seen text; follow-ups still due (sized at their own draw); purchases; the Office wall, with the old town's photograph and its ministries' levels on record.
- The move sheet lists Resets, Stays and Next, and says when the new office's income passes the old one ("in about 5 min", from advice).

### 2.13 Worked table: the first ten minutes (rate model)

Reference hand 6 s per paper, τ = 12 s. Prices are exact by the rules. Times and incomes come from `econ.py` (greedy best-payback buyer, 25 % of income spent on papers, M(A) = 1), not the prototype.

| Time | What happens | Dibs spent | Income (dibs/s) |
|---|---|---|---|
| 0:00 | Face picked. Treasury 30; Town Clock Office level 1. | | 1 |
| 0:02 | Paper 1 (scripted, Rodney): pulled down into the drawer at 0:08. Every club 50 → 51. The poll reads "0 of 5 · Plumb's hat −7". | | 1 |
| 0:10 | Paper 2 (scripted): signed; it rests 2 s on the out-tray. | | 1 |
| 0:16 | The first slip: "Town Clock Office +1 level · −15": pushed up. | 15 | 2 |
| 0:20 to 0:50 | Paper 3 (scripted fee: Till's Teas, +60 fixed); slips for Town Clock levels 3 to 5 (19, 23, 29). Paper 4 (scripted basket: Lionel Sash; the first gossip choice). | 71 | 5 |
| about 1:05 | Potholes Office opens (150). | 150 | 13 |
| 1:05 to 3:00 | Potholes levels 2 to 9 (120, 150, 188, 234, 293, 366, 458, 572); Town Clock to 10. Day 9: the first application (Dorothy Pockle). | about 2,600 | about 55 at 2:00, 140 at 3:00 |
| about 3:00 | Benches & Bandstands opens (2,400). | 2,400 | about 150 |
| about 5:30 | Signposts & Lampposts opens (38,400): every mayor ministry open by 48 % of the first term (aim, 8.4). | 38,400 | about 2,000 |
| 8:00 | Levels about 71 in all. Day 30: the second application. | | about 20,000 |
| about 9:00 | The Town Record reaches 80. | | about 23,000 |
| 10:00 | Day 48: the ribbon becomes "Call the election · poll 3 of 5". About 48 papers and 90 slips, 4 ministries, gossip 0 to 2, approval about 55 to 60 %. | | about 25,000 |

The reader calls at about day 56 (11:30, poll 4 of 5); the run-up and election night take about 1 min. The usual result is 4 of 5 wards (NR 7, "Another term here"); a sweep (NR 10) moves up at once. In this model the slower player who spends 60 % on papers reaches the Town Record at about 20 minutes, so money matters to the ladder.

### 2.14 New things each term, and the top

Every new term in a seat, won or lost, opens exactly one new thing, told on the result sheet:
- Mayor terms 2 to 4: Committee Week, Market Fortnight, Quiet Press, then repeating. Governor terms 2 to 5: Bandstand Summer, Ribbon Shortage, A Gentle Week, Early Doors, then repeating.
- Presidential terms 2, 4, 6, 8, 10: a Grand Project (2.2). Terms 3, 5, 7, 9 and 11 to 16: one twist from a hand-written list of 10. Each twist is one factor on one parameter, never new code: Bandstand Summer (Brass +0.10 in every mix, the others scaled down), Committee Week (committees ×2 as common), Quiet Press (gossip limit +2), Ribbon Shortage (ribbon forms cost and please ×2, before sizing), Kite Weather (Kites +0.10), Market Fortnight (fees ×1.5), Early Doors (τ × 0.8), Hedge Inspection (Hedges +0.10), A Gentle Week ("Say nothing" × 0.6 in length), Grievance Amnesty (settlements cost half).
- Terms 17 to 61: each term a pair of twists never combined before, in a fixed hand-written order of the 45 pairs. Terms 62 to 181: the 120 triples, in a fixed order, named by joining the twist names. The validator checks that each composes: mix twists add, all other factors multiply with each other and with minister factors, and every resulting base |Δ| stays ≤ 10.
- From term 182 a term is honestly labelled "A Quiet Term". That is past day 70 for the passive bot and about 70 h of active play (3.3).
- Each presidential term after a loss brings the next of the 12 hand-written rivals; after a win the same rival returns.
- No world office, no other planet.

**Largest number reachable in 30 days.** The biggest ministry is Grand Project 5: v = 1e6 × 8^12 = 6.9e16. At the level cap (96, 8 storeys, ×256) it earns 1.7e21; all 13 together earn at most 1.93e21. NR after 30 days of the passive bot is about 1,900 (70 presidential terms of about 27), so m_N ≈ 39. With V = 1.02^24 = 1.6 and M = 1.6 at full approval, I ≤ 1.93e21 × 39 × 1.6 × 1.6 ≈ 1.9e23 dibs/s. Thirty days of that income with nothing spent is 1.9e23 × 2.6e6 s ≈ 5e29. Under the level-cost growth a steady player stalls far below the cap (levels about 35 to 45), so the expected 30-day high is about 1e21 to 1e24. The formatter's last suffix (Dc) covers 1e33 to 1e36, so the bound is 6 orders inside it, and far inside double precision. A gate checks it (H11).

### 2.15 Time away, as a closed form (`EngineMode.offline`)

Decree uses two additive seams in the shared store, which P3 adds to `src/engine/mode.ts` and `src/state/store.ts` (9.2):
- `paysOnCompute: true`. The store grants `earnings` in the same update that computes them, on resume and at boot. The away report is then information only. Its "Watch ad" button grants the extra 50 % (× `offlineAdMultiplier` − 1) when the ad completes. Killing the app with the report open loses nothing (lesson 5).
- `catchUpSeconds: 0`. Every absence follows the away rules, however short. The store's 300 s full-speed catch-up never runs for decree, so a 299 s and a 301 s trip pay by the same formula.

The closed form:
- t = (now − max(lastSavedAt, stats.clockHigh))/1000 (the shared guard: time already paid is never paid again); t′ = min(t, cap).
- I_away = a × M(A) × m_N × V × Σ_i open_i × s_i × rate_i × (0.8 while "Say nothing" runs). Boycotts and the scandal are frozen as they stand: their counters do not move, but the income they cut stays cut, so closing the app is never better than playing. earnings = roundDibs(I_away × t′).
- Papers: n = min(free places, floor((t′ + awayCarry)/360)); awayCarry = (t′ + awayCarry) − 360 × n when n is limited by time, else 0. The n papers are drawn in order on return through the normal draw with the unchanged state, so a reload re-rolls nothing. There are no arrivals during a run-up. nextArrivalAt is re-phased to within one τ of the clock.
- Unchanged while away: moods, approval, gossip, every boycott and scandal counter, the day, the poll, cooldowns (play clock), a pending take-back (committed when the app went to the background).
- The report: "While you were out (2 h 10 m): the ministries collected 14.2K dibs. 10 visitors are waiting."
- `income()` = I_away; `activeIncome()` = I; `reportAlone` is true when papers arrived and nothing was earned.
- Cross-check (10.2): event stepping over t′ with no player gives exactly the same earnings, papers and offsets, for absences of 30 s, 299 s, 301 s and 4 h.

### 2.16 Advice and the goal line

`advice(cfg, state)` is pure and returns one goal, for the bot, the slip and the goal line. Score = max(0, cost − cash + reserve)/I + cost/Δincome over ministry levels, openings and the monument (Δincome of a monument: 0.02 × I); the lowest wins. Until the record is met, a level's score is divided by 1.5, so advice fills the record. Also offered: "Call the election · poll 4 of 5" when the reader's rule would call (8.2), and during a boycott or scandal the free exit and the ad. The goal line shows the words, the price and "about 20 s / 2 min / 1 h" (none at I = 0) in at most 34 characters (lint).

### 2.17 Order of operations

After each commit, in this order:
1. Apply `shown`, and schedule any follow-up at decisions ever + delay.
2. If the paper was a day paper (not a campaign paper, rally or slip): day += 1; the boycott and scandal counters −1; quiet and gossip decay; decisions ever += 1, which is what follow-ups count.
3. Boycott check, then gossip and scandal check.
4. End-of-term check: at day D the run-up starts.
5. The next paper lands; or after 1.0 s a slip, if the desk and tray are empty.

At a call: the desk paper, if ordinary, and every waiting ordinary paper go to `asideTray`, in order. A boycott settlement or scandal front page stays on top and must be decided first. Due follow-ups wait, because campaign decisions do not count. The K campaign papers then arrive τ apart, the first at once, then the rally.

At a new term: the halfway reset of 2.10 runs, then any boycott whose club is now 25 or more ends. Strikes re-arm at 30 as usual.

At a move: `asideTray` and the tray return to the deck unseen (their money would be sized at the old B).

Twist and minister factors apply to the base Δ before sizing, never after.

---

## 3. The first three minutes, then the goals to hour three

### 3.1 Timed script (the tutorial)

- **0:00** The loading card shows the emblem and "The Republic of Middling. Proudly Adequate." The player taps one of 6 faces ("Pick for me" too; no name field). Caption: "Elected Mayor of Dithering-on-the-Dawdle, unopposed. The other candidate went to the wrong hall."
- **0:02** Paper 1 (sample 1, 7.5) teaches refusal. A drawn pen draws the paper down once; the drawer creaks open with the distance; a wooden slide.
- **0:10** Paper 2 teaches signing. The pen pushes it up, the signature writes itself across the SIGN strip from 40 pt, and the tray clinks. It rests on the out-tray: "Tap to take it back (2 s)".
- **0:16** The first budget slip; the pen points at it once.
- **0:20** Paper 3: Till's Teas (a fee, +60 fixed): papers can pay, and pleasing one club annoys another.
- **0:38** Paper 4: Lionel Sash's basket; "Gossip 0/5" appears. There is no lecture; the follow-up tells the rest.
- **0:50** The general draw. The door glass shows "Next visitor 0:07". Slips fill the gaps.
- **about 1:05** the Potholes Office opens; **about 1:50** the first application and the cabinet's first face; **about 2:40** the first sticky note.

### 3.2 Goals of minutes 3 to 30

- Minutes 3 to 12: more ministries and the first storey; the first follow-up and the second minister; the Town Record; the first call, run-up and election night. A sweep moves up (NR 10); the usual 4 of 5 gives NR 7 and "Another term here".
- Minutes 12 to 24 (only after a non-sweep): mayor term 2 with its twist (Committee Week) and the same rival, back for another go; the first boycott for a player who neglects a club, the first scandal for one who takes baskets; the first monument offered.
- From minute 12 or 24: Governor of Upper Wobbling, a mahogany desk with a green lamp. The Brass Band Guild and the Anglers' Circle join, with 7 counties and Barnaby Waft, Keeper of the Ceremonial Spoon ("Waft: Gently Onwards"), pulling 9.

### 3.3 Hours one to three, and week three

- Governor, about 0:12–0:24 to about 1:05–1:15: two or three terms of about 17 minutes. Something new every 10 minutes or less: a ministry (the sixth opens at about 9 minutes in), ministers 4 to 6, the first settlement, a county lost by 0.4, chain endings in the scrapbook, a twist per term. NR reaches about 50 to 60.
- About 1:05 to 1:15: President. A long walnut desk with three telephones; 7 clubs and 9 provinces; Professor Ignatius Crumb ("Crumb: Abolish Wednesdays") pulls 11. Presidential terms take about 22 minutes (visitors every 15 s). The eighth ministry opens about 12 minutes in.
- About 1:30, presidential term 2 opens The Very Long Bridge. About 1:55, term 3 brings its twist.
- At hour 3, typically: president term 3 or 4; about 800 papers decided; 7 to 9 ministers; 3 to 5 monuments; 20 to 30 clippings; no hand-written text, frame or Clerk's note seen twice in hour 1, and at most a few texts in hours 2 and 3.
- **Week three, recomputed from the paper rate.** The passive bot plays 5 sessions of 8 minutes a day. Each session finds 10 waiting papers and decides about 40 arrivals at 5 a minute (32 at 4 a minute as president), so about 250 papers a day, 210 as president. It is governor on day 1 and president on day 2. A presidential term is about 85 decided papers, so it plays about 2.5 terms a day: term 45 to 50 by day 21 and about 70 by day 30, inside the 181 terms of one new thing each. Still new in week three: each term's pair of twists and its rival, the next of 24 monuments, Grand Projects' storeys, missing clippings.
- **Honest limit.** The passive bot uses up the president's hand-written pool on about day 5. From then on, comic texts return whole with a returning-visitor line and fresh numbers. The day on which repeats pass 20 % of the passive bot's comic draws is reported (8.4); content updates are the answer (9.3).

---

## 4. Screens

### 4.1 Fixed zones

Portrait, one screen, no tab bar. Every zone comes from the pure `deskLayout(width, height, insets, fontScale)` in `src/ui/decree/layout.ts`. All text is `allowFontScaling={false}`, sized at s = min(fontScale, 1.3).

| Zone, top to bottom | Text | 375 × 667 (insets 20 / 0) | 390 × 844 (insets 47 / 34) |
|---|---|---|---|
| Top inset | | 20 | 47 |
| Top bar | treasury 15 × s (line 24) and rate 12 × s on one baseline; chips 12 × s | 40 | 44 |
| Club strip | numbers 11 × s | 32 | 40 |
| Term ribbon | 11 × s (line 18) | 18 | 20 |
| Desk: out-tray band | | 36 | 56 |
| Desk: paper area | 4.2 | 405 | 461 |
| Desk: drawer band | label 11 × s | 36 | 56 |
| Goal line | 12 × s (line 20) | 20 | 22 |
| Bottom row | labels 11 × s | 60 | 64 |
| Bottom inset | | 0 | 34 |
| Total | | 667 | 844 |

Widths at 375 (gutters 16), all at s = 1.3:
- Top bar: treasury and rate "999.9M · +999.9K/s" 156, approval chip "62 % ×1.14" 86, gossip chip 48, menu 40, gaps 3 × 6, gutters 2 × 10: 368 ≤ 375.
- Club strip: 7 icons of 32 with gaps of 6, 260. Icons only, each with a thin mood ring; the number appears for 2 s when it changes and on a tap (lead ruling 11). With 3 clubs the numbers are always shown. While a drag is armed, the rings and the approval chip preview the armed outcome's values. This area is never under the thumb.
- Term ribbon: "Acting Governor · Day 41/110 · NR 9/50 · Lv 152/170" is the longest form (51 characters, about 400 pt), so it has two fixed forms by width: the long one when it fits, else "Day 41/110 · NR 9/50" with the record shown in the Poll button's badge. Never wrapped, never cut.
- Bottom row: in-tray stack 72 (count badge; a tap shows the next 3 visitors' faces), Ledger, Cabinet, Poll, Office 64 each, gaps 4 × 4, gutters 2 × 8: 360 ≤ 375.
- The validator measures every term-ribbon, goal-line, top-bar and bottom-row string, in every office and state, against these widths (4.2).

### 4.2 The paper, row by row

Width at 375: 343; inner width 315. Rows add up (`src/ui/decree/paperMetrics.ts`, as `headerMetrics.ts`; no negative margins). Heights at s = 1.3:

| Row | Content | Height |
|---|---|---|
| Outer padding | | 6 |
| SIGN strip | 4 + title row (12 × s, row 22: "IF SIGNED ↑ · Poll 3 → 4 of 5 ↩", at most 304 pt) + 2 chip rows (15 × s, row 28 each) + note row (12 × s, row 20) + 4 | 106 |
| Divider | | 2 |
| Header | oval photo 44 × 54 with paperclip; name (15 × s), role and club badge (13 × s): 25 + 21; max(54, 46) + 8 | 62 |
| Proposal | fixed 4 lines at 16 × s = 20.8, line 26: 104, + 8 | 112 |
| Divider | | 2 |
| REFUSE strip | the same rows, title "IF STUDIED ↓" | 106 |
| Outer padding | | 6 |
| Total | | 402 ≤ 405 |

- A chip is an icon (18) plus a resulting value in tabular digits ("61 → 65"), at most 151 pt at 1.3. Two chips and a gap of 6 fit 315. A wide chip (a district, "HT 48.6 → 52.6" with an 11 × s badge, about 170 pt; or "every club") fills a row. So a strip holds 4 slots, a wide chip takes 2, and the lint checks that each outcome fits. In the mayor's office there are at most 3 chips per strip (satire style sheet).
- The SIGN strip sits at the paper's top edge next to the out-tray, the REFUSE strip at its bottom edge next to the drawer: the half you push toward is the effect you get. While armed, a strip grows to 110 % in either direction.
- Approve and refuse are never red and green: the SIGN strip is violet ink, the REFUSE strip slate grey.
- The validator measures every proposal, every filled template (each frame with every phrase of its one slot), every name and role, every chip and note, and the strings of 4.1 at s = 1.3, with a glyph-width table of the system font (10 % safety margin until the table is calibrated against a phone screenshot once).

### 4.3 The flick (React Native responder; no gesture library)

- `onStartShouldSetResponder` is true only for touches inside the paper's rectangle (plain numbers from `deskLayout`), so a drag starting at a screen edge never takes the iOS home or Android back gesture.
- `onResponderMove`: JavaScript keeps its own dy and velocity from `pageY` and timestamps, and writes one shared value, `paperY`. The UI thread draws the paper at `paperY`. JavaScript never reads a shared value.
- The paper moves only vertically: no x movement, no rotation, no tilt.
- From 40 pt: going up, the signature writes itself across the SIGN strip in violet ink, line by line with distance (a nib scratch that grows); going down, the drawer creaks open by the distance. A light haptic at 40 pt. There is no click.
- Release commits **up** at 90 pt of travel, or at 48 pt or more with 0.8 pt/ms or more upward. It commits **down** at 90 pt, or at 24 pt or more with 0.5 pt/ms or more downward. Signing asks more, because the up-swipe is the commonest habit gesture and signing spends money. Otherwise the paper springs back (one spring clock on the UI thread).
- Signing while short: the paper springs back, the strip shakes, "Short by 240".
- **Take-back:** a signed day paper rests on top of the out-tray stack for 2 s ("Tap to take it back"). A tap returns it to the desk exactly as frozen (H3 checks it byte for byte). Its effects are committed when the 2 s pass, at a tap elsewhere, or when the app goes to the background.
- A second finger cancels the drag.
- **Second path** (accessibility and precision, never taught): tap a strip to arm it ("Tap again to sign"), tap it again to commit; a tap elsewhere or Android back disarms. Screen readers get `accessibilityActions` Sign and Refuse.
- After a commit, signed papers slide into the wire tray, whose stack grows by one sheet per paper until the term ends. Refused papers slide into the drawer, whose label counts "FOR FURTHER STUDY (312)". The next paper slides in from the in-tray after 300 ms.

Why it is ours and fits one thumb: the cheaper "no" is a short pull toward the resting thumb, and signing is a deliberate push away. 90 pt is mid-screen along the thumb's arc, never at an edge. Both outcomes are always printed in full; nothing is revealed by tilting and nothing is stamped (the border-inspection game's mark). The destinations are desk objects that visibly fill.

### 4.4 Sheets and full-screen views

Every dialog is the kit `Sheet` or registers with `useOverlay`; one at a time.
- **Ledger** (read-only overview): one inked row per ministry with level, storeys drawn in the margin, rate, club, the minister's name, and a picket when boycotted ("Boycott: Vegetables 18, ends at 25 or in 5 papers"). It also shows the record ("Town Record 71/80") and "Kept for the desk: 540". Each row has one "Raise" button (price shown; never taught). Closed ministries show their opening price.
- **Cabinet:** the framed photograph, with dotted silhouettes for places still to come; a face shows the minister's name, ministry, desk rule and terms served.
- **Poll:** the pinned district map, held districts in violet hatching, the others slate (never filled by club colour). Each exact share, the clubs it weighs, the rival's pull and the disarray ("Plumb's hat −7 · Opponents in disarray +8"); the call button.
- Away report, the move sheet (Resets / Stays / Next), the result sheet, Shop, Settings (sound, music, haptics, "Buttons instead of flicks", restore purchases, privacy).
- **Full-screen views** (`useOverlay`; the desk stops its clocks beneath): Election Night; the Office (the wall of portraits and photographs, "Former opponents", the vanity shelf and the scrapbook as objects on it); the face picker.

**Election night:** a chalk tally board, one row per district, a bar with the majority line. The Counting Clerk, Agatha Tallow (a paper cut-out), opens an envelope every 2.5 s; rows fill with chalk marks and a rosette if held. At the majority come bunting and the band in silhouette, then the rival's line ("Plumb: I still own the hat"). A tap speeds the rest ×4. The count is the one thing in the game played straight.

**Android back** closes the top layer in this order: an armed strip, the in-tray peek, a sheet, a full-screen view (Election Night jumps to its result first, never quits mid-count). It leaves the app only from the bare desk, and commits a pending take-back first.

### 4.5 Phone rules

- One Skia canvas for the desk, never one per row (portraits elsewhere through `GameIcon`); 60 fps while a finger is down or a paper moves, else 30. One clock per animated thing (`paperY` and its spring, the entrance, the drawer, the signature ink, the take-back rest, the sticky note's wobble, the treasury roll, the election-night calls). Visitors do not idle-animate; nothing invisible animates.
- Paper text is Skia paragraphs in boxes sized as 4.2; the treasury is a `RollingNumber` with no `lineHeight`.
- Atlases under 2,048 px, drawn in code, baked once (`bakeAtlas`), never freed while a canvas may draw: faces (48 busts at 128 × 160 in 8 × 6: 1,024 × 960; the player's 6 faces again as one-colour portraits for the Office wall, with 3 ageing steps as a drawing parameter); props (1,024 × 1,024). District maps are Skia paths with no atlas.
- `npm run lint:worklets` passes; the only worklets draw `paperY`, the spring and the ink reveal.
- Selectors use `useShallow`; the desk reads the desk paper through one selector returning a stable version.
- Hints never cover a number on the paper.

### 4.6 Palette "baize-and-ink"

Desk baize #2E4A3E with a darker felt pattern; walnut rim #6B4A33; paper a cool pale blue-grey #ECEFEA (not cream, not manila); violet ink #5B3E8C (signature, headings, the SIGN strip); slate #6C7A89 (the REFUSE strip); brass #C9A45C (tray, paperclip, lamp); mustard #D9A53A (money only); soft brick #B0563F only for boycott and scandal words, under 8 % of any screenshot; chalk slate #2D3436 for election night. Clubs are shown by icon and a two-tone pattern (terracotta, sage, slate blue, copper, plum, ochre, dove grey), never as a flat fill on a map and never by colour alone. Loading screen: the goose emblem on pale paper over baize, "The Republic of Middling. Proudly Adequate."

---

## 5. Meta systems (each in a container none of the three games uses)

All are built from the shared kit (Sheet, overlays). None uses the tabs family, a missions sheet, a chest overlay, ladders, an arch, a scroll, a contract board or a star map.

1. **In-tray, desk and drawer** (the core): the stack and its count, the door glass, the sticky note, the wire out-tray that fills over a term, and the drawer FOR FURTHER STUDY, whose count grows. It is drawn bigger at 100, 1,000 and 10,000 refusals (a second drawer, a filing cabinet, a photograph of a warehouse; looks only).
2. **Budget slips and the Ledger** (ministries): slips on the desk (2.7); the clothbound book as an overview (4.4).
3. **The Cabinet**: a framed photograph; 9 ministers from application papers only, each with a desk rule; never sold, never random; they travel.
4. **Follow-ups**: 36 chains of 2 steps; the sticky note; every ending is a clipping.
5. **The Gazette corner** (gossip): a folded newspaper at the gossip chip with the last headline.
6. **Elections**: the pinned map, the call button, the run-up papers, the chalk tally board, the result sheet.
7. **The Office** (a full-screen wall): your portraits, greying a little each term; photographs of the towns you left; Grand Projects; former opponents; terms served as plain facts, never a score.
8. **The vanity shelf** (on the wall): one monument is offered each term from mayor term 2, for 600 s of B (tune 300 to 1,200), ×1.02 income for good, from 24 hand-written monuments (a bust of yourself; a bust of the bust; a statue of you pointing at a smaller statue of you). Declining costs nothing. Statues live here, not on papers.
9. **The scrapbook** (on the wall): 144 clippings plus a headline per election. Clippings are a collection only and give no Name Recognition, so elections alone fill it. Unfound ones show the chain's first line.
10. **The Standing Order** (from governor term 2, a switch in the Ledger): Cuthbert Wimble, the junior clerk, buys the advised level while you play when cash ≥ 3 × its price plus the reserve. Never while away.
11. **Shop and rewarded ads** (a sheet):
   - Products (none random, none a currency or a multiplier; none touches a mood, the poll or the count): `office_long_lunch` "Long Lunch" (unlock, $3.99): +4 h away cap; `office_walnut_desk` "Walnut & Brass Desk Set" (cosmetic, $2.99); `office_portrait_frames` "Gilt Portrait Frames" (cosmetic, $1.99): the Office wall's frames and wallpaper; `office_private_secretary` "Skip the Ad Videos (Private Secretary)" (skipAds, $4.99), whose description begins "Get every Watch-ad reward without watching a video." It is sold openly under its own name, as in the other three apps (REVIEW-NOTES says so).
   - Rewarded ads (optional, "Watch ad", from a button the player taps; play-clock cooldowns stated; a failed load loses nothing): away report +50 %; **Check the Sofa** (Rodney finds dibs down the back of the sofa): +40 s of B, once per term, less than one campaign paper's 45 s (ruling 6); **Call the Spin Doctor**: ends "Say nothing" now; **Send a Courier**: ends a boycott now; **Open the Doors**: fills the in-tray now, cooldown 15 min of play.
   - From the call of an election to the end of election night, no ad and no product is offered. No interstitials, no banners; AdMob's "Politics" category is blocked.

Cut on purpose: chests and every random reward (no odds to show), missions, a manifesto, daily gifts, energy, premium currency, timed offers, starter packs, leaderboards, push notifications, Bigger In-Tray.

---

## 6. Sound and haptics

Character: wood, brass, pen nib, pneumatic air, a distant bandstand. No pluck, marimba, bell ladder, steam, felt or chiptune (the best-known swipe card game's score); paper rustle is kept short, because Lantern Row's world is paper. `soundPack` is null. Files are rendered into `games/high-office/assets/sfx` by `scripts/audio/recipes_office.py`, `render_office.py` and `office_music.py` on the `dsp.py` primitives. The catalogue is `src/services/fx/catalog.decree.ts` (Node only). The gate is `compare.py` in cross-key mode against all three games at the 0.6 joint threshold; a person does the listening check.

| Key | Sound | Haptic |
|---|---|---|
| paper_arrive | a soft door knock and a card-stock slap (at most every 5 s) | none |
| slip_arrive | a ledger page slid across baize | none |
| sign_ink | a nib scratch that grows with the distance, from 40 pt (no click) | light at 40 |
| sign | the clink of the wire tray | medium |
| study | the drawer creaking open with distance, then a wooden slide and a muffled thunk | medium |
| take_back | a sheet lifted off the tray | light |
| denied | a dull desk tap | light |
| buy_level / open_ministry | a ledger nib tick and a coin / a brass latch and a tuba blat | light / light |
| appoint | a camera shutter as the photograph fills | light |
| storey / ribbon | a small hand bell / scissors snip and a clarinet flourish | light |
| boycott_start / boycott_end | a wordless kazoo picket chant / a door unlatched | none / light |
| scandal | a newspaper slapped on the desk and a muted trombone | light |
| clipping | scissors and glue | none |
| call_election | a big wooden gavel knock | medium |
| env_open / tally | a snare roll (1.2 s) / chalk taps | none |
| district_held / district_lost | a tuba-and-snare sting up / a trombone slide | success (≥ 300 ms apart) / none |
| majority / defeat | 8 bars of "The Middling March", full band / one tuba playing the march slowly | heavy + success / none |
| ui_open, ui_close | a book cover, a drawer push | none |
| music_desk, music_campaign | 90 s loops: bassoon, pizzicato and brushes at 90 bpm, quiet under reading; the run-up loop a brass march at 112 bpm | |

Haptics follow only what the thumb did and the rare peaks, at most 8 pulses a second; none for taxes, arrivals or the away payout. The shared keys the store plays are mapped in `src/modes/decree/soundKeys.ts`.

---

## 7. The invented country, cast, voice, papers, writing and store page

### 7.1 The country

The Republic of Middling, motto "Proudly Adequate". Its founding law was written on a napkin. The emblem is a goose holding giant scissors on a beige field (no stripes, stars, eagles, seals or real buildings). It has an original brass tune, "The Middling March", and no anthem; the currency is the dib. No parties exist anywhere. Honours are invented (Keeper of the Ceremonial Spoon, Grand Goose (Second Class)); there are no knights, dames or crowns.
- Dithering-on-the-Dawdle (mayor), with the wards Market Ward, Mill Ward, Hilltop, Riverside and Old Town; newspaper the Dithering Daily Drizzle.
- The Province of Upper Wobbling (governor), 7 counties named by writer 2; newspaper the Upper Wobbling Evening Fuss.
- The Republic, capital Middlingham; provinces Middlingham, Fogmoor, Brassby, Teacup Downs, Gusting Heights, Muchpuddle, Saltpenny Bay, Kitewell, Upper Wobbling; newspaper the Middling Morning Murmur.

Every proper noun goes into `scripts/content/office/names.json`. Each entry records a check against four lists: politicians of any rank, notorious public figures, famous fictional politicians and civil servants, and the place and character names of children's fiction. It also records the date and who checked it. The check uses generic web searches only, never the project's name. The second editor signs it.

### 7.2 Clubs of voters and their feuds

Hobby clubs only, by name and by feud: never a people, faith, age, class, trade, region or commuters. No trait is pinned on any club; the joke is on the office and on you. The standing feuds are all hobby against hobby:
- spotters against the window guild (noses pressed on the glass);
- giant vegetables against spotters (who stand on the pumpkin patch to see the 7:02);
- brass bands against anglers (noise at the pond);
- kites against hedges (tangled strings).

No paper's subject may be traffic restriction, lanes, residents' parking, road charges or tolls. The mayor's own parking space stays, because it is vanity.

### 7.3 The cast (about 48 drawn busts, built from parts in code)

- **You**: one of 6 faces with its name (Hettie Bramble, Osgood Fennel, Ada Quill, Rupert Marchpane, Winifred Tuttle, Cosmo Larkspur), titled "Mayor Bramble", later "Governor" and "President" (never "Mr President"), and "Acting" after a loss. You are the main butt of the joke: vain, and fond of ribbons.
- **Advisors**: Rodney Spinwell, Chief of Staff (vanity and spin); Gwendolyn Abacus, Treasury Clerk (requisitions, budget slips); Cuthbert Wimble, the junior clerk (committees, the Standing Order); Deputy Pruella Dimity (governor; dry, hungry); Secretary Mildred Fenn (president; has seen three presidents and liked one).
- **Spokespeople**: Desmond Kerb (Bus), Pauline Till (Shops; Till's Teas), Hilda Gourdley (Vegetables), Horace Bellows (Brass), Marigold Hake (Anglers), Wendell Loft (Kites), Agnes Topiary (Hedges). Each brings their own club's grievances; nobody else speaks for strikers.
- **Lobbyists, farce only, for their own absurd trade**: Lionel Sash (Ribbon Makers' Guild), Crispin Vane (Consolidated Umbrellas), Lavinia Goss (Ornamental Fountain Council), Tobias Slake (Novelty Hats & Sons). Gifts are fruit baskets, a fountain shaped like you, a hat with a smaller hat on it. They never pay money, never please a club, and always come back as a favour that costs.
- **Others**: Ambrose Minute (Committee on Committees; a recurring co-signer, never a club's voice), Agatha Tallow (the Counting Clerk).
- **Ministers (9)**, each with the club whose ministry they run and one desk rule:

| Office | Minister | Runs | Desk rule (one factor) |
|---|---|---|---|
| Mayor | Dorothy Pockle ("References: 'She found one.'") | Bus | requisitions for her ministry ×0.9 |
| Mayor | Dorrit Pellow | Vegetables | that club's settlements ×0.5 |
| Mayor | Basil Ferrule | Shops | that club's fees ×1.2 |
| Governor | Wendeline Hush | Shops | gossip decay after 6 quiet papers instead of 8 (×0.75) |
| Governor | Ermintrude Bole | Brass | ribbon forms at her ministry please ×1.33 (+3 → +4) |
| Governor | Percy Gusset | Anglers | campaign papers ×0.67 in cost |
| President | Marjorie Wren | Kites | that club's fees ×1.2 |
| President | Osric Tamp | Hedges | "Say nothing" ×0.7 in length |
| President | Florence Nibley | Anglers | requisitions for her ministry ×0.9 |

- **Rivals**, individuals with a hobby and a slogan, never a party or a colour: Councillor Prudence Plumb ("Plumb: She Owns A Hat") and 2 more for mayor; Barnaby Waft, Keeper of the Ceremonial Spoon ("Waft: Gently Onwards") and 2 more for governor; Professor Ignatius Crumb ("Crumb: Abolish Wednesdays"), Ottoline Strop, Grand Goose (Second Class) ("Strop: Firmly Seated") and 10 more for president. Each has a "back for another go" line and a resignation line about their hobby, never pressure, health or scandal.
- **Drawing rules:** skin tone is a palette parameter independent of every feature part, and no feature is exaggerated in step with tone. The 6 player faces cover at least 4 tones and both sexes. The contact sheet is part of the sensitivity read. Names are invented and English-voiced; the style sheet allows a name of any origin that passes the checks.
- No children, school, soldier, police, clergy or uniform anywhere; no religious or uniform headwear.

### 7.4 Voice: deadpan-memo

Dry official language describing something silly. The joke is on the office or on you. No puns as the main joke, no pop-culture references, no catchphrases, at most 1 exclamation mark per 50 papers. A proposal is never a policy opinion. `docs/design/office-style.md` adds:
- **Eight joke shapes**, each at most 20 % of a deck, tagged on every paper; no two papers in a row share one (the lint checks both): undercut, escalation (the same petitioner returns asking for more), literalism, the official form misapplied, the statistic, the slogan, the photo opportunity, the callback payoff.
- **Rations:** the goose at most 1 in 40 papers, biscuits at most 1 in 60, at most 1 statue per office deck.
- **Length:** median at most 65 characters (about 12 words); 90 is the hard cap, for at most 20 % of a deck.
- **Innuendo:** no vegetable, fruit or object is ever soft, hard, long, big or "at length". The editor reads each paper with this in mind.
- **Votes:** no joke anywhere about how votes are cast or counted.

### 7.5 The paper format, and fourteen finished papers

Each paper shows an oval photo with a paperclip, the name, the role and the club badge; the proposal; the SIGN strip at the top and the IF STUDIED strip at the bottom. Below they are shown in the mayor's office at B = 65 dibs/s (Town Clock level 9 and Potholes Office level 7: 9 + 56; about minute 2), every mood 50 unless stated, so f = 1. Money is tier × B × j with j as drawn (S 975, M 1,950, L 3,900 at j = 1). Clubs are written by name here; on the paper they are icons. The approval line is left out where the poll does not change.

1. **Rodney Spinwell · Chief of Staff** (scripted, teaches refusal). "Practise on this one. It is a form about forms. File it FOR FURTHER STUDY." (74)
   SIGN: No change · ↩ (he brings a longer one). STUDY: every club +1 · approval 50 → 51.
2. **Rodney Spinwell** (scripted, teaches signing). "Welcome, Mayor. Please sign this to say you have read it. You haven't. Sign it." (79)
   SIGN: every club +1 · approval 51 → 52. STUDY: ↩ (he brings another copy).
3. **Hilda Gourdley · Giant Vegetable Society** (project, other: Shops). "Grant the prize pumpkin the freedom of the town. It has asked very politely." (76)
   SIGN: −946 (j 0.97) · Vegetables 50 → 54 · Shops 50 → 47 · ↩. STUDY: Vegetables 50 → 47 · Shops 50 → 52.
4. **Desmond Kerb · Bus Spotters' Society** (swap, other: Shops; butt self, subject buses). "Name the 7:02 bus after you, Mayor. It is late too, and also waves." (67)
   SIGN: Bus 50 → 54 · Shops 50 → 46. STUDY: Bus 50 → 46 · Shops 50 → 54.
   The same paper with Bus at 30 (f+ 1.4, f− 0.6): SIGN Bus 30 → 36 · Shops 50 → 46; STUDY Bus 30 → 28 · Shops 50 → 54.
5. **Lionel Sash · Ribbon Makers' Guild** (basket). "A small fruit basket for you. No reason. Perhaps more ribbon-cuttings? No reason." (81)
   SIGN: Gossip 0 → 2 · ↩. STUDY: No change.
6. **Pauline Till · Shop Window Guild, with Ambrose Minute** (committee, other: Vegetables; shape escalation). "We propose a study of why our last study took nine years. It should take about ten." (83)
   SIGN: −907 (j 0.93) · Shops 50 → 51 · Vegetables 50 → 48 · ↩ (a study of the study of the study). STUDY: Shops 50 → 48 · Vegetables 50 → 51.
7. **Pauline Till · Shop Window Guild** (fee, other: Vegetables). "Let Till's Teas sponsor the clock tower. It would chime TILL'S TEAS on the hour." (80)
   SIGN: +2,180 (j 1.12) · Shops 50 → 52 · Vegetables 50 → 46. STUDY: Shops 50 → 49 · Vegetables 50 → 51. (As scripted paper 3 it pays a fixed +60.)
8. **Rodney Spinwell** (vanity, a trap). "A portrait of you, Mayor, for the portrait of you in the hall. For scale." (73)
   SIGN: −3,780 (j 0.97) · every club −1 · approval 50 → 49. STUDY: No change.
9. **REQUISITION, Gwendolyn Abacus** (form). "Potholes Office · +1 level (now 7)". Clerk's note: "The first shovel is tired."
   SIGN: −458 (the exact price of level 7 → 8) · Potholes Office +1 level · Bus 50 → 51. STUDY: Bus 50 → 49.
10. **RIBBON-CUTTING** (form). "Benches & Bandstands · storey 1". Clerk's note: "It needs cutting by somebody important. You will do."
   SIGN: −975 · Vegetables 50 → 53. STUDY: Vegetables 50 → 49.
11. **Dorothy Pockle · applicant** (application). "I apply to be Minister for Potholes. References: 'She found one.'" (65)
   SIGN: Appoint Dorothy (requisitions for Potholes ×0.9) · Bus 50 → 51. STUDY: She applies again in 30 papers.
12. **Hilda Gourdley · Giant Vegetable Society** (boycott; Vegetables 18; picket "GIVE THEM BACK"). "No more pumpkins until the Mayor returns our ribbon scissors. You know which scissors." (86)
   SIGN "Return the scissors": −1,300 · Vegetables 18 → 28 · the boycott ends. STUDY "Keep the scissors": the boycott runs 8 more papers.
   In the goal line: "Ad: Send a Courier (ends it now)" (32).
13. **The Dithering Daily Drizzle** (scandal; gossip 5/5; Shops 52, Vegetables 46). "MAYOR'S GOOSE GIVEN OWN PARKING SPACE. Goose declines to comment." (65)
   SIGN "Apologise on the steps": every club −3 · approval 49 → 46 · Gossip 5 → 0. STUDY "Say nothing": taxes ×0.8 for 10 papers, then Gossip 0.
14. **Rodney Spinwell** (run-up). "Judge the Hilltop Prize Hedge Show. Say nothing about the leaning one." (70)
   SIGN: −2,930 · HT 48.6 → 52.6 · MW 51.2 → 50.2. STUDY: No change. The rally: "Hold a rally at the bandstand. Bring the big scissors. Cut something." (69) SIGN: −3,900 · Shops 44 → 48 (the lowest club; 4 × f+ 1.12 = 4.48, rounded to 4). STUDY: No change. (In play these are sized at the B of election time; 65 is used here for comparison.)

### 7.6 Two follow-up chains

A chain is a set-up (a comic paper in a deck) and one follow-up for each branch; each follow-up's two choices end the chain in a clipping. So a chain has 2 follow-ups and 4 clippings. Effects come from archetypes like any paper; they are shown here at mood 50.

**A. "The Basket"** (set-up: paper 5).
- Signed, then 10 to 14 papers later, Lionel Sash: "About the basket: the goose at the bottom was not fruit. It would like an office." (81) Favour: SIGN Shops −3 · Gossip +1, clipping "GOOSE GIVEN OFFICE; MAYOR GIVEN GOOSE". STUDY No change, clipping "GOOSE RETURNED TO SENDER, WHO DENIES OWNING A GOOSE".
- Studied, then 10 to 14 later, Lionel Sash: "No hard feelings. Please accept this smaller basket. It is one grape." (69) Favour: SIGN Vegetables −3 · Gossip +1, clipping "MAYOR ACCEPTS GRAPE". STUDY No change, clipping "MAYOR REFUSES GRAPE. GRAPE DEVASTATED".

The sign branch always ends worse off, and no branch holds money.

**B. "The Pumpkin"** (set-up: paper 3).
- Signed, then 8 to 12 later, Hilda Gourdley: "The pumpkin, now a Freeman of the town, wishes to address the council. It has slides." (85) Committee: SIGN −S · Vegetables +1 · Shops −2, clipping "PUMPKIN'S SPEECH CANCELLED; SLIDES LOST". STUDY Vegetables −2 · Shops +1, clipping "PUMPKIN ADDRESSES EMPTY HALL".
- Studied, then 12 to 16 later: "The pumpkin has not left its crate since your refusal. It faces the wall." (73) Treat: SIGN Vegetables +3 · Shops −1 · Gossip +1, clipping "MAYOR APOLOGISES TO VEGETABLE". STUDY Vegetables −2, clipping "PUMPKIN: NO COMMENT".

### 7.7 What to write for version 1, and why it is enough

**Demand.** Arrivals set the pace at every hand from 4 to 9 s: 5 papers a minute (4 as president). With the time of nights and run-ups taken out, the reference timeline is mayor to 0:25 (the worst case of two terms), governor 0:25 to 1:15, president 1:15 to 3:00. The draw mix (events, requisitions, ribbons, applications, follow-ups, templates, then comic) is:
- mayor 3 / 10 / 8 / 3 / 4 / 0, comic 72 %;
- governor 3 / 12.5 / 8 / 2 / 4 / 15, comic 55 %;
- president 3 / 25 / 8 / 1 / 4 / 20, comic 39 %.

When no paper waits, a slip arrives (2.7); when nothing is affordable either, the player reads the poll, the cabinet or the scrapbook, or closes the app. The 8.4 aim bounds that time.

| Office | Days to 3:00 | Comic draws | Supply (own deck + unused any-office + unseen portable) | Margin |
|---|---|---|---|---|
| Mayor (0:00 to 0:25) | 110 | 79 | 110 + 30 = 140 | 1.8 |
| Governor (0:25 to 1:15) | 228 (hour 1: 160) | 127 (hour 1: 89) | 150 + 13 + 15 = 178 | 1.4 (hour 1: 2.0) |
| President (1:15 to 3:00) | 392 | 153 | 200 + 13 + 4 = 217 | 1.4 |

The club weighting puts a floor on cells. The writers get a matrix with a minimum per (club, archetype) cell: at least 4 texts in each mayor cell (21 cells, 84 of 110) and at least 3 in each governor and president cell (35 cells, 105 of 150; 49 cells, 147 of 200). The bot reports the use of every cell under the reader's, always-refuse's and random's club distributions. Templates: governor 34 draws and president 78 draws by 3:00, from a bag of 120 frames, so none repeats in 3 hours. Clerk's notes appear on half of the forms, about 30 in hour 1 and 100 by 3:00, from a pool of 160.

**What to write** (all in `scripts/content/office/*.json`, merged by `build-office.py`; writers choose words, visitor, archetype, clubs, subject, butt and shape, and never type a number):

| Kind | Count |
|---|---|
| Hand-written comic papers | 490: mayor 110, governor 150, president 200, any office 30; about 30 % of mayor and governor papers tagged `portable` (no office word: town, ward, county, Mayor, Governor) |
| Follow-up chains | 36 (12 per office): 72 follow-ups, 144 clippings |
| Forms | requisition, ribbon and application forms (fixed layouts, no joke) + 160 Clerk's notes |
| Event papers | 14 grievances with 14 picket slogans; 20 front pages + 3 apology lines; 9 applications + 9 return lines |
| Run-up | 50 campaign papers (mayor 10, governor 16, president 24) with a {district} slot; 12 rallies; 6 scripted papers |
| Templates | 120 one-slot frames (each with a butt tag) over 10 lists of 24 complete phrases |
| Lines | 18 rivals (name, hobby, slogan, back-again and resignation lines); 30 election-night lines; 60 returning-visitor lines; 10 away-report lines; 24 monuments; 5 Grand Projects; 10 twists and 45 pair names; 6 captions; 16 county and province names |

**Who writes** (package W, from hour 0; style sheet first):

| Person | Writes | Strings |
|---|---|---|
| Writer 1 | mayor deck 110, any-office 30, mayor chains (24 + 48), mayor run-up 10 + 4, scripted 6 | 232 |
| Writer 2 | governor deck 150, governor chains (72), governor run-up 16 + 4, the 16 place names | 258 |
| Writer 3 | president deck 200, president chains (72) | 272 |
| Writer 4 | Clerk's notes 160, grievances and slogans 28, front pages 23, applications 18, president run-up 24 + 4 | 257 |
| Writer 5 | the lines (rivals 90, night 30, returning 60, away 10, monuments 24, projects 5, twists 55, captions 6) | 280 |
| Comedy editor | 120 frames and 240 phrases; the edit of every comic paper and chain; rewrites of texts the bot flags as dead decisions (H8) | 360 + reading 634 |
| Sensitivity editor | `names.json` checks; the deny and exception lists; the read of every string, about 1,700, and the contact sheet; signs `RATING-NOTES.md` | reading 1,700 |

**Staging.** By hour 4: the mayor deck, its chains and forms, the names and lists final, and the frozen bot content taken from them. By hour 7: the governor deck. The president deck ships only if it passes H7 and both reads. Otherwise the lead reports the shortfall, and the president's office runs on the governor's portable papers, templates and the returning-visitor form until a content update. Weak jokes are never shipped to make up a count.

### 7.8 The automatic safety check

`scripts/content/office/satireLint.ts` runs in `npm run validate` for mode decree and fails the build. It runs over every paper, every frame, every phrase and every frame filled with each phrase of its one slot (about 2,900 strings), every name, slogan, headline and line, the UI strings and the store text. Before matching, runs of all-caps tokens are lower-cased.

- **Tier 1, always fails, any case, any field** (`deny-phrases.txt`, `deny-hard.txt`): real slogans and phrases (drain the swamp, and the pattern "drain the {swamp, marsh, bog}"; build the wall; stop the boats; take back control; get it done; make … great again; yes we can; strong and stable; levelling up; four more years; lock her up; president for life; plus about 200 more compiled offline), and trump*, bush, goose-step*, for life, third term, term limit, voted twice, extra votes, rigged.
- **Tier 2, people's names**: only tokens capitalised mid-sentence, or in a name field. They are matched by edit distance 1 and a sound-alike code against `deny-people.txt` and `deny-fiction.txt`. The people list holds presidents, vice-presidents, prime ministers, deputies, cabinet ministers and opposition leaders of the US, UK, Canada, Australia, New Zealand, Ireland and South Africa since 1900, royals, and notorious public figures. The fiction list holds fictional politicians, civil servants and places from TV satire and children's fiction. Lower-case words never match ("May I…", "a major ribbon"), and a sentence-initial "Grant" passes.
- **Tier 3, subjects**: whole words only, each deny word with its explicit inflections ("war, wars, wartime, warring, warfare"), never prefixes. `deny-subjects.txt` covers BRIEF's subjects (faith, ethnicity, nationality, migration, border, gender, sexuality, abortion, weapons, war, terror, police, prison, drugs, alcohol, disease, disability, disaster) plus four new groups:
  - economic and civic: tax cuts and rises, union, wages, pensions, rent, housing, healthcare, privatisation, inflation, cost of living, climate, net zero, flood, wildfire, cycle lane, low-traffic, congestion charge, toll;
  - election integrity: voter fraud, voter ID, postal vote, recount, gerrymander, referendum, independence;
  - protest: riot, curfew, march;
  - monarchy: king, queen, crown, royal, knight, Sir, Dame.
  `deny-places.txt` (about 600 countries, demonyms, capitals and regions), `deny-movements.txt` (real parties, movements, ideology words, colour labels used as party names), `deny-tone.txt` (profanity, violence, bribe, corrupt, dictator, coup, fake news, vote now, ballot, Mr President, Oval Office, White House, intern), `deny-brands.txt` and `deny-games.txt` (other games' cast and places) are matched the same way. The store-text list adds audit, office empire, processing and document.
- **Exceptions**: `allow.json` holds exact phrases only, each with the editor's reason (flower border, herbaceous border, hedge border).
- **Rule 2:** a capitalised token not at a sentence start and not in `names.json` or the common-word list fails.
- **Rule 3:** a 4-digit year, a URL, "#", or "election" followed by a number fails.
- **Rule 4:** lengths and fit as 4.1 and 4.2; at most 4 effects per outcome, wide chips counted as 2 slots; at most 3 chips per strip in the mayor's office; goal-line strings at most 34 characters.
- **Rule 5:** a subject tag outside the closed list (ribbons, signage, statues, ducks, geese, picnic-weather, committees, vegetable-shows, clocks, potholes, hats, fountains, bandstands, gardens, buses, kites, hedges, harbours, inventions, ceremonies, portraits, paperwork, vanity) fails, and so do a missing butt tag or butt = club. "Picnic-weather" means no climate, flood, drought or heat. For harbours, no paper is about anyone or anything arriving or being kept out. For hedges, no barrier jokes.
- **Rule 6, shape:** these fail: both outcomes identical; a refuse that costs money; a basket with money or a club gain; traps above 15 % per office; a follow-up whose set-up is missing; clubs absent from the paper's office; a portable paper with an office word; joke-shape shares above 20 %; and rations above 7.4's limits.
- **Tests** in `satireLint.test.ts`: "Grant the prize" passes; "Market Ward", "Republic of Middling" and "herbaceous border" pass. These fail: "a louder trumpet", "drain the marsh", "Quail" as a surname, "Sir", "war", "warfare", "Republicans", a planted real country, a year and a URL.

A person reads every string once and signs `RATING-NOTES.md`: the lint catches words, not tone.

### 7.9 Store page

- **Title: "Proudly Adequate"** (16 characters). It is the game's own motto and running joke. It contains no civic word, has no "X: Y" shape, shares no word with the other three titles, and needs nothing on the deny lists. Generic searches found no app or game with the name. The subtitle carries the genre.
- **Alternative 1: "Flick of the Pen"**, only with the genre subtitle. It names the flick, and the signature does write itself as the paper is pushed. Risks: a pun on "stroke of the pen", and search results full of pen-flip games (the name search also searches "pen flick").
- **Alternative 2: "Signed, Not Read"**: it matches the verb and paper 2's joke; untested.
- Dropped: "Rubber Stamp Republic". It names a stamp the game does not have (the border-inspection game's mark), is the stock insult for a real legislature, leans civic, and is near a Steam game whose president's only weapon is a stamp. Also dropped: "Sign & Shred", since the refusal goes into a drawer, and it is a game-jam trope.
- The search uses generic terms only and records results in `games/high-office/store/NAME-SEARCH.md`, including whether "Proudly Adequate" echoes buy-local campaigns such as "Proudly South African".
- Subtitle (30): "Funny desk, mayor to president". Category Games/Simulation.
- Description, first line: "An invented country and a comedy desk: push each paper up to sign it, or pull it down into the drawer marked FOR FURTHER STUDY." "Idle" and "tycoon" appear only further down. The listing says plainly that ministries earn while you are away and that terms move only when you read.
- Keywords: desk, mayor, governor, president, papers, sign, town hall, funny, satire, decisions, cartoon, clerk.
- Icon (a light ground, unlike O's navy and L's dusk): the pale blue-grey paper fills the tile, with a violet signature stroke flying upward and the goose with scissors. No flag, seal, eagle, ballot box or building.
- Screenshot template "signature": the game full-bleed with no frame and no paper caption. The caption is handwritten in violet over the bottom left, with a pen-nib flourish, on a translucent baize band. (P: a framed card with a sauce wave below; O: a monospace band on top; L: a hanging paper tag below.) The front page never appears in a store screenshot or the preview video; in the game it is an obvious comic tabloid (a goose photo, a crooked masthead, no columns of body text). Both are put in `SIDE-BY-SIDE.png` against all three games before a person signs dimension 7.
- Review note: "All countries, parties, politicians, companies and newspapers are fictional. No real people, parties, flags or current events; no user-written text is shared. Elections are computed from visible numbers; no ad or purchase is offered during a campaign, and no product changes a vote."
- Rating: answer honestly (comic choices without moral weight; no gambling; no contests), expected 4+ or 9+, raised by hand to 13+ under policy.md's house rule. Play: Government apps declaration "not a government app". Territories: all except mainland China and Vietnam.

---

## 8. The balance bots, their targets, and the order of work

### 8.1 Order of work: rules and bot before any screen

1. Hour 0: the skeleton commit (9.2).
2. Hours 0 to 3: P2's numbers prototype in `scratchpad/office/proto/` (not committed). It covers the archetype table with f± sizing, slips, the count, disarray, boycotts, gossip and offline, on one office, then three, with every bot of 8.2, on a frozen content of 60 papers. **First, before any bot target:** confirm the archetype table's net and sign-share columns and the habit win rates of 2.2 against `term.py`. Then confirm the opening times of 2.13 and that the no-buy bot misses the Town Record. If a column misses by more than 10 points, the table change goes to the lead before any engine code. Every finding goes to the lead as a decision, never quietly into the rules.
3. Hours 0 to 4: the rules and their tests on frozen fixtures (`src/engine/fixtures/decree.ts`), so tuning never turns a rules test red.
4. From hour 3: `src/engine/decree/bot.ts` on the real engine, event to event (no Node imports; in `WEB_ONLY`).
5. `scripts/content/decree-bot.ts` (CLI) and `build-office.py`, which writes game.json only after every hard target passes on the named seeds 12345, 4, 99, 7 and 2026. Tuning uses seeds 101 to 115; results are pass counts, never one median (merge M30).
6. Screens build in parallel against fixtures with no number of their own. They are wired to tuned data only after step 5.

### 8.2 Bots

Hand model: one decision 6 s after the paper lands (also 4 s and 9 s), plus the 2 s take-back rest after a sign; a slip 1.5 s; a sheet 3 s; election night 12 s (3 s skipped). No bot sees a hidden number.

1. **Reader** (the reference) sees only what the strips print and scores each outcome o in seconds of B:
   V(o) = money/B + 0.012 × ΔA/M(A) × H × (I/B) + Σ_d 60 × Δshare_d × max(0, 1 − |share_d − 50|/8) × (day/D) − 10 × Δgossip − 120 × [starts a scandal] − 120 × [starts a boycott] + 60 × [ends a boycott] + Δrate × H/B + 300 × [appoints a minister],
   with ΔA = Σ_g W_g × shown_g, Δshare_d = Σ_g w_{d,g} × shown_g (+ campaign points), H = min(600, 12 × (D − day)) s. It takes the higher V. When sign is unaffordable, it waits if the shortfall is ≤ 20 s of I and V_sign − V_refuse ≥ 15, else refuses. It takes slips and buys by `advice()`, calls at majority + 1 (or at day ≥ 0.85 D with a majority), and moves up when allowed. Its constants are reported, never tuned to targets.
2. **Always-sign**: signs when affordable, else waits up to 20 s, then refuses.
3. **Always-refuse** (always FOR FURTHER STUDY).
4. **Random**: a seeded coin per paper; refuses when sign is unaffordable.
5. **Money-only**: maximises the money effect. **Mood-only**: maximises ΔA.
   Bots 2 to 5 handle slips, buy, call and move exactly as the reader does: only the choice on day papers differs.
6. **No-buy**: the reader's paper choices; never takes a slip, never raises in the Ledger; signs requisitions as the reader.
7. **Goal-follower**: the reader's paper choices; buys whatever the goal line names the moment it is affordable.
8. **Passive**: 5 sessions a day of 8 minutes as the reader; takes the away ad.
9. **Check-in**: opens every 4 h, decides the waiting tray as the reader, buys for 2 minutes.
10. **Idle**: never acts.
11. **Ad-everything**: the passive bot with every product and every ad taken as soon as offered.
12. **Adversaries** (the reader plus one habit): device clock +4 h, −4 h, +4 h; reload after every draw, after every decision and inside the take-back window; hoard the tray until full; quit during election night and reload; close the app during every boycott and scandal; absences of 299 s and 301 s; flick at 1 s without reading.

### 8.3 Hard targets (every seed; the build fails on a miss)

- **H1 Printed equals applied.** 0 differences between shown and applied effects over every decision and slip of every run, each club's value of an "every club" chip included; 0 clamps (the lemma of 2.7); no stored paper field changes after its draw; every stale form leaves with no effect.
- **H2 The poll is the count.** 0 differences at every election; the announcement order is 2.10's.
- **H3 Determinism.** The same seed gives a byte-identical trace at 10 Hz and event to event. The reload adversaries' traces equal the reader's. A take-back restores the frozen paper byte for byte.
- **H4 Offline.** The closed form equals event stepping, for absences under and over 300 s. Away time changes no mood, gossip, boycott, scandal, day or poll. The clock forward, back and forward again pays once. Earnings are in cash before the report closes.
- **H5 Coins.** Dibs enter only through the tick, paper money gains, the away payout and its ad top-up, Check the Sofa and the transition fund. Cash ≥ 0 always; refusing never costs money.
- **H6 No dead end.** Refuse is always available. Every boycott and scandal ends within its paper count, and ministry 0 always earns. The 2.11 bound ≤ 9 holds for the tuned values. Every bot that decides papers wins an election within 6 terms of its first loss at a seat (measured, 15 seeds). Taken from the always-sign, always-refuse and random bots' states at the start of their first term after 2 h (after the halfway reset), the reader wins within the next 2 elections in at least 13 of 15 seeds.
- **H7 Text.** At 4, 6 and 9 s, for the reader, always-refuse, random and ad-everything bots over 15 seeds, none of these is seen twice in hour 1: a hand-written text, a template frame, a Clerk's note, a picket slogan. Repeats of hand-written texts in hours 2 and 3 are at most 2 % of comic draws. No cell runs empty while its club is drawn in hour 1. The satire lint passes.
- **H8 It is a real choice** (the "hundredth paper" test). For each paper the reader decides in hours 2 and 3, its choice is re-evaluated for the same text in the states of its 10 previous decisions (re-sized by 2.7), and at least 30 % of texts get both choices. The reader signs 40 to 65 % of day papers and differs from both money-only and mood-only on at least 25 %. It differs from "the side whose printed title line looks better" on at most 30 %, so the strip is enough to choose well. The per-text report lists texts with one side best in every state.
- **H9 Reading beats habits** (paired over 30 seeds, with the noise band of the reader against itself shown). Election wins: reader ≥ 85 %, always-sign ≤ 45 %, random ≤ 35 %, always-refuse ≤ 25 %. Time to president is at least 1.5 × the reader's for each of the three habits and for no-buy, and 1.2 × for money-only and mood-only. Name Recognition at 3 h is at most 0.6 × the reader's for the three habits.
- **H10 Money cannot reach the vote.** Ad-everything against the passive bot, 30 paired seeds, compared per term, not per day: the share of elections won, the poll margin and the NR gained per term differ by 3 points or less. Time: the measured speed-up to president is reported and must stay within the bound computed from the products plus 3 points. Open the Doors gives at most 2.5 uses a day × 9 papers, about 9 % of 250. Money from the away ad, the Sofa and Long Lunch only reaches the record, which does not bind the reader. So the bound is 9 %. The reader finds sign unaffordable on at most 5 % of papers.
- **H11 Number range.** The largest number over a 30-day run of the passive bot (and a 60 h continuous reader) stays below 1e30.
- **H12 No gossip spiral.** The reader, from the always-refuse state at the start of its first term after 2 h: approval from below 35 back to 50 within 80 papers in at least 13 of 15 seeds (the lead sets the band after the first run).

### 8.4 Aims (reported; the lead sets each band once after the first tuned run, as merge M2 and M54)

- Opening: first paper by 10 s, first purchase by 0:20. In minutes 0 to 10: a paying moment every 30 s at the median; at least 70 % of thumb actions are flicks (papers and slips); at least 20 purchases.
- Idle desk, at 4, 6 and 9 s in minutes 0 to 30 and in hours 1 to 3: the desk is empty (no paper, no slip) at most 10 % of governing time at 6 s, and the longest stretch with nothing on the desk and nothing affordable is at most 8 s.
- Pace at 6 s: first election 11 to 15 min, governor 12 to 30, president 55 to 95; 4 s and 9 s within ±10 %. Every ministry of an office opens by half of the office's first term.
- Tension: the reader's median margin is 1 district; 2 districts within 5 points of 50 in half its elections; the first election won in 13 of 15 seeds.
- Boycotts and scandals, per term per bot: reader ≤ 1 boycott an hour and ≤ 1 scandal per 2 h; always-refuse ≥ 2 boycotts an hour; always-sign ≥ 1 scandal a term (rough model: 1.7).
- Baskets and traps: the reader refuses at least 80 % of baskets.
- Money: paper gains are 10 to 25 % of all dibs in hours 0 to 3. The reader spends 20 to 35 % of income on papers, always-sign 45 to 70 %. The goal-follower finds at most 10 % of papers unaffordable when they land. A new office passes the old income within 4 to 8 minutes.
- Offline: 1 h away with the ad pays 0.3 to 0.6 of 1 h active at 30, 60, 120 and 180 min. The measured gain of the close-the-app-during-a-boycott adversary is reported and should be ≤ 0. Passive: governor day 1, president day 2, term 45 to 50 by day 21; the day the passive bot's comic repeats pass 20 % of comic draws is reported.
- Novelty: something new every 3 min in minutes 0 to 30, every 15 min in hours 1 to 3.

Knobs `build-office.py` may move, inside the ranges of section 2: S per office, the ministry step, r, cost growth; τ, the away interval and rate; D and the call fraction; R; the record and NR requirements; the archetype shares and ±1 on each base effect; the money tier seconds; q; the request interval; G_max; m_N; Y; the vanity price and factor; the transition fund. Knob order per failing target:
- habits: archetype nets, then money tiers, then the vanity share, then R;
- pace: the NR and record requirements, then D, then r and costs;
- elections: R, starting moods, campaign stakes;
- text: q, then τ.
Mood bases beyond ±1 are content: the editor changes them from the bot's per-text report, never the tuner. No rule is changed after screens exist without the lead.

---

## 9. First version and later

### 9.1 In the first version

Three offices with 4, 6 and 8 ministries plus 5 Grand Projects; 7 clubs; 5, 7 and 9 districts; 9 ministers; budget slips; 490 comic papers, 36 chains, the forms and their notes, 120 templates; boycotts, scandals, follow-ups, the run-up with the rally, election night; 7 office twists for mayor and governor, 10 presidential twists, their 45 pairs and 120 triples; 24 monuments; the Office wall and the scrapbook; the Standing Order; 4 products and 5 rewarded ads; the tap-tap path; the take-back; own sounds and two music loops; web presets `?preset=fresh|early|mid|late` from bot states; dev views `decree-art` (the contact sheet in greyscale and in tone variants, every face distinct at 44 pt, the brick share) and `decree-layout`.

### 9.2 Work packages for about eight engineers, with files owned and order

**Hour 0 (P0, done by P3's engineer, 30 to 60 minutes, before anything else):** `src/engine/decree.ts` (types and every public signature, bodies that throw "not built yet"); the mode wiring (P3's shared changes below); `src/config/schema.decree.ts` with the starting values of 2.2; a placeholder `games/high-office/` (PLACEHOLDER in its description) so the web preview starts; `src/ui/decree/strings.ts` with one section per package (each section edited only by its package); the hint target keys in `src/ui/hints/targets.ts`; `docs/design/office-build-plan.md`.

**First: rules, prototype and bot.** No screen uses a number before P2's gate.
- **P1a Rules: paper core (1):** `src/engine/decree/` `types`, `params`, `create`, `draw`, `size`, `decide`, `slips`, `followup`, `strike`, `scandal`, with their tests; `src/engine/fixtures/decree.ts`. `types` is frozen at hour 2, after which a change needs P1b's agreement.
- **P1b Rules: time, term and wiring (1):** `src/engine/decree/` `tick`, `offline`, `term`, `count`, `move`, `advice`, `twists`, `ministers`, `hints`, with their tests; `src/engine/decreeMode.ts`; `src/engine/decree.ts` and `schema.decree.ts` after hour 0.
- **P2 Prototype, bot and tuning (1, from hour 0):** the prototype (starting from `proto/rev2/econ.py` and `term.py`); `src/engine/decree/bot.ts`; `scripts/content/decree-bot.ts`; `scripts/content/build-office.py`; `src/config/decree.content.ts` (generated); `games/high-office/game.json` (generated only); the decree hook in `scripts/validate.ts` (additive: `g.mode === 'decree'`), running the gates of 8.3.
- **P3 Wiring, tooling, store (1); every shared change is additive:**
  - `ModeId` (`src/modes/contract.ts`); `MODES` (`scripts/lib/games.js`); the `mode` enum and the opaque `decree` block (`src/config/schema.ts`); `FxMode` (`src/services/fx/catalog.ts`) and the decree catalogue in `scripts/lib/fxCatalog.js`.
  - **The two seams of 2.15:** optional `paysOnCompute` and `catchUpSeconds` on `EngineMode` (`src/engine/mode.ts`), and their handling in `src/state/store.ts` (resume, boot, `collectOffline` granting only the ad's extra). Sim, classic, haul and merge leave them unset and behave exactly as before (`modeRegression.test.ts` proves it).
  - `scripts/lib/modes.js`: `MODE_FOLDERS.decree` (`src/modes/decree`, `src/ui/decree`, `src/engine/decree`, `src/engine/decree.ts`, `src/engine/decreeMode.ts`, `src/engine/fixtures/decree.ts`, `src/config/schema.decree.ts`, `src/config/decree.content.ts`); `NODE_ONLY` + `catalog.decree.ts`; `WEB_ONLY` + the bot, the fixtures, `presets.web.ts`, `devViews.web.ts`; `THEME_WORDS.decree` (mayor, governor, ministry, ward, gossip, scandal, boycott, dibs), each only if `--words` finds no literal in shared or family files.
  - `scripts/lib/fingerprint.ts` (`office-ladder`) and spam.md's row; `src/modes/decree/` (`index.tsx`, `actions.ts`, `fx.ts`, `soundKeys.ts`, `presets*.ts`, `devViews*.ts`); `src/modes/entries.test.ts`; `scripts/content/office/satireLint.ts` (the code; the lists are W's).
  - Owner of `src/ui/hints/targets.ts` and of `src/ui/decree/DecreeShell.tsx`, whose named slots P6 to P8 mount into.
  - The store package: `games/high-office/store/` (`fingerprint.json`, `REVIEW-NOTES.md` with the Orbit and Paperwork Inc arguments, `RATING-NOTES.md`, `NAME-SEARCH.md`, `releases.json`, `store.config.json`), `scripts/content/office-store.json`, the name search, `check:bundle` for all four games.
- **P4 Art (1):** `src/ui/decree/art/`: the palette; the bust part system with tone independent of features, and its 48 faces; the player's portraits with ageing; desk props; the wire tray stack; the drawer and its growth stages; the door; the sticky note; the pen hint; club and effect icons with two-tone patterns; storeys; district maps as paths; election-night cut-outs; monuments; the Office wall. Also `bakeAtlas`, its README, the light icon and the "signature" screenshot template.
- **P5 Sound (1):** `scripts/audio/recipes_office.py`, `render_office.py`, `office_music.py`, `games/high-office/assets/sfx/`, `src/services/fx/catalog.decree.ts`; the cross-key `compare.py` run (same-key results unchanged).

**From hour 2, against fixtures:**
- **P6 Desk and flick (1):** `src/ui/decree/layout.ts` (+ test), `src/ui/decree/paperMetrics.ts` (+ test), `src/ui/decree/desk/` (canvas, paper and slip drawing, the responder with its asymmetric thresholds, the ink reveal, the take-back, tap-tap, trays, drawer, door).
- **P7 Bars, sheets, views (1):** `src/ui/decree/hud/` (top bar, club strip with the armed preview, term ribbon with its two forms, goal line, bottom row, their metrics), `sheets/` (Ledger, Cabinet, Poll, away report, move, result, shop, settings), `views/` (Election Night, Office, face picker); steward of `strings.ts`'s structure.
- **P8 Hints, platform, QA (1):** `src/ui/decree/hints.ts` (the pen as `parts.HintPointer`), `src/ui/decree/back.ts` (Android back over `uiState.ts`), the loading screen, overlay registration, the device checks of 10.1.

**W Writing (its own package, 5 writers, a comedy editor and a sensitivity editor, from hour 0):** `docs/design/office-style.md` (the style sheet, first: voice, joke shapes, rations, lengths, the cell matrix); `scripts/content/office/papers.mayor.json`, `papers.governor.json`, `papers.president.json`, `papers.any.json`, `chains.json`, `forms.json` (notes), `events.json`, `campaign.json`, `templates.json`, `phrases.json`, `lines.json`, `names.json`, `deny-*.txt`, `allow.json`; `RATING-NOTES.md`'s sensitivity read. The split and the stages are in 7.7.

After P2's gate come numbers into screens, reviews and fixes. The first three games do not change: no file of `games/pizza-empire`, `games/space-miner`, `games/night-market`, `src/modes/sim|haul|merge`, `src/ui/sim|haul|merge`, `src/engine/haul*` or `src/engine/merge*` is edited. `modeRegression.test.ts` stays green with its recordings untouched. The earlier fingerprint reports and compare.py's same-key results stay byte-identical (their generated bundle reports excepted, BRIEF.md).

### 9.3 Later

More papers per office and chains of 3 steps (content updates); more rivals per office; the manifesto, if a version is found that ad money cannot reach; tablet layout; translations, each with a local read first. Never: energy, paid random items, a sold minister, a purchase or ad that moves a mood or a vote, countdown offers.

---

## 10. Acceptance checks and tests

### 10.1 What anyone can see (web preview, `GAME=high-office`; then a phone)

1. The first three minutes play as 3.1: refusal taught first, then signing, then the first slip.
2. Up past 90 pt signs, down past 90 refuses. A fast flick counts at 48 pt up and 24 pt down; a slow short drag springs back; a second finger cancels; tap-tap works; a signed paper can be taken back within 2 s. The paper never moves sideways or tilts.
3. On 30 papers and 30 slips in a row, every printed number is the value applied. Boycott and scandal warnings show before the choice, and both end by their free exits. A requisition made stale by the Ledger leaves with no effect.
4. The poll equals the count; the safest district comes first; a loss keeps everything built and shows "Acting"; no ad or shop from the call to the end of election night.
5. Both sizes at font scale 1.0 and 1.3: nothing clipped, overlapped or wrapped, the long term ribbon included. Android back follows 4.4.
6. Away 1 h and away 4 minutes: earnings are in the treasury before the report is closed; the ad adds half; clock jumps pay once; no mood or counter moved.
7. A person fills `fingerprint.json` `human` against all three games and does the listening check.

### 10.2 Tests that must exist (vitest)

Engine (`src/engine/decree*.test.ts`, fixtures only):
- `size`: the lemma over every m 0 to 100 and Δ −10 to 10, the fixed +10, and every twist and minister factor combination. Money is frozen at the draw and moods at landing.
- `decide`: applied equals shown on 10⁵ random states; sign refused when short; refuse never costs money; take-back and commit; a stale requisition or slip voided; a capped one "No longer needed".
- `draw.property`: draw order; no follow-up without its set-up; no repeat while an unseen eligible text exists; cell weighting and fallback order; frame bag; reload re-rolls nothing.
- `slips`: landing rule, reserve, return on arrival, not days.
- `strike`, `scandal`: triggers, warnings, free exits within their counts, re-arming, no gossip from approval, no second scandal, "Say nothing" does not block the call.
- `term`: call conditions, set-aside, campaign papers not days and moving no counter, the halfway reset ending boycotts at 25, the 2.17 order.
- `count`: shares, 50.0 ties, announcement order, poll equals count, the 2.11 bound from the params.
- `move`: 2.12's resets and carries; `canPrestige` only after a qualifying win with the record met; ministers follow their club.
- `twists`: each twist, pair and triple composes; one new thing per term to term 181.
- `tick.split` (tick(a + b) = tick(a) then tick(b), with arrivals, slips and a full tray); `offline` (closed form equals stepping at 30 s, 299 s, 301 s and 4 h, caps, clock jumps pay once, carry, frozen boycott factor); `coins` (the sources of H5); `advice` (reserve, record weighting); `determinism`.
- `decreeMode`: create, reconcile a broken save, tag `decree1`, invalid block rejected, `offlineAdMultiplier` 1.5, `roundPayout`, `paysOnCompute`, `catchUpSeconds`, `entitle`.

Shared and tooling:
- `modeRegression.test.ts` unchanged and green. A store test proves that a mode without the two seams pays and catches up exactly as before. `entries.test.ts` pins the decree entry (`Shell`, `Loading`, `parts` with `Icon` and `HintPointer`, `hints`, `engine`, `presets`, `soundKeys`).
- `fingerprint.test.ts`: `office-ladder` accepted; earlier reports byte-identical; high-office against each game at 8 of 8 must (differ or pending) and at least 15 known or pending.
- `bundleRules.test.ts`: no decree file in another game's bundle and no other mode's file in the decree bundle.
- `layout.test.ts` and `paperMetrics.test.ts`: zones add up at both sizes; the paper's rows at s = 1.0 and 1.3 fit 405 and 461; chips fit two per row and wide chips one; the longest top-bar, ribbon, goal-line and bottom-row strings fit; every bottom-row target is at least 44 × 44.
- `satireLint.test.ts`: the cases of 7.8.
- compare.py cross-key against all three games; store checks (title, subtitle, keywords, `office_` prefix, kind multiset).

### 10.3 Before declaring done

`npm run typecheck`, `npm test`, `npm run validate` (with the decree gates and the satire lint), `npm run lint:worklets`, `npm run check:bundle` for all four games, `npm run check:bundle -- --export` before a release; look at the game in the web preview at both phone sizes.

---

## 11. Lead decisions

(Empty: the lead fills this section. A decision here overrides the text above where they differ.)
