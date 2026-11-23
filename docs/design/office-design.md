# High Office: design of the desk game (mode `decree`)

Status: revision 1, 23 November 2026, from three designs ("desk", "state", "election"), three judges and the lead's ruling: the "election" design as base, with "desk"'s decision mechanics and the judges' grafts and must-fixes; the ruling holds where a judge differs. Points decided differently, with the reason: 1.3. **Section 11 (the lead's decisions) will override the body wherever they differ.**

Game folder: `games/high-office`. Mode (new): `decree`. Save key: `save:high-office:decree1`. Store title (proposed, 7.9): "Flick of the Pen".

Conventions:
- "pt" is a layout point, "s" a second of the play clock (the shared `stats.playSeconds`, which never moves while the app is closed). "Dibs" is the currency, held in the shared `cash`.
- A **day** is one decided paper of the term (campaign papers excepted). Strike and scandal counters count decided papers, never seconds.
- B is the **base income** (2.4); paper prices are stated in seconds of B.
- (tune) marks a starting value only `scripts/content/build-office.py` may move, inside its range, to meet section 8; anything else is a rule.
- Times and incomes in 2.13 and 3 are placeholders that `build-office.py --table` replaces; section 8 is the only gate. Prices are exact.
- Every amount of dibs shown or paid goes through `roundDibs` (merge M19: below 1,000 half up to a whole dib, from 1,000 three significant figures).
- "P" means Pizza Empire, "O" Orbit Haulers, "L" Lantern Row.

---

## 1. The game and its fingerprint

### 1.1 The game in five sentences

1. You are the newly elected mayor of Little Dithering, a town in the invented Republic of Middling ("Proudly Adequate"), and every twelve seconds a visitor lays a paper on your desk: a gardener, a bus enthusiast, a lobbyist with a suspicious fruit basket.
2. Each paper prints both outcomes in exact numbers ("Allotment 61 → 65 · −540"); flick it up into the out-tray to sign it, or down into the drawer marked FOR FURTHER STUDY to refuse it.
3. Your ministries (the Town Clock Office, the Potholes Office, Benches & Bandstands) collect taxes every second, also while you are away, and the approval of named clubs of voters (the Early Bus Club, the Chamber of Shops, the Allotment Society and later four more) multiplies every dib.
4. A term is a fixed number of papers; from 60 % of it you may call the election, and the poll board on your wall shows, ward by ward, exactly how the count would go today; on election night the wards are announced safest first and closest last.
5. A win carries your Name Recognition and your cabinet to a bigger office (Governor of Upper Fudge, then President), and every further presidential term brings one new thing; a loss costs nothing you built: your rival resigns by morning over something absurd, and you try again with the voters' sympathy behind you.

### 1.2 Fingerprint along the 19 dimensions

Declared in `games/high-office/store/fingerprint.json` from the vocabulary of `scripts/lib/fingerprint.ts`. P3 adds one word to `VOCABULARY.progression_structure`: **`office-ladder`**, defined as "a short fixed ladder of offices, each entered only by winning a vote at the end of a term of decisions; a lost vote repeats the term in place; the top office continues as repeated terms". The honest alternatives fail: `location-levels` is Pizza's and our offices are never bought; `endless-single` is false (three offices); `seasons` is Lantern Row's and false. P3 updates spam.md's table row in the same change.

| # | Dimension | High Office | Pizza Empire | Orbit Haulers | Lantern Row | vs P / O / L |
|---|---|---|---|---|---|---|
| 1 | core_verb [M] | swipe/aim: a document on the desk is flicked vertically, up into the out-tray (sign) or down into the drawer (refuse); direction and distance decide | tap-target | drag/route | place/arrange | differs ×3 |
| 2 | production_topology [M] | parallel-generators: 4, 6 or 8 (+5) independent ministries | linear-chain-with-transport | network-routes | spatial-grid | differs ×3 |
| 3 | money_moment [M] | auto-tick: taxes flow in every second | customer-pays | sale-at-depot | contract-complete | differs ×3 |
| 4 | main_screen_layout [M] | single-object-focus: one paper on one desk fills the screen | side-cross-section | top-down-map | grid-board | differs ×3 |
| 5 | art_asset_overlap [M] | 0 %: all drawn in code in `src/ui/decree/art` | | | | differs ×3 |
| 6 | store_text_overlap [M] | under 10 %: all store text new (`scripts/content/office-store.json`) | | | | differs ×3 |
| 7 | icon_and_screenshot_template [M] | own: the "blotter" template (7.9) | | | | pending ×3 (person) |
| 8 | bundle_foreign_content [M] | none: mode `decree`, own folders, own fx catalogue `catalog.decree.ts` | | | | pending ×3 (bundle report) |
| 9 | progression_structure | office-ladder (new word) | location-levels | sector-map | seasons | differs ×3 |
| 10 | prestige_model | new-location-carryover: a bigger office, Name Recognition and the cabinet carried | reset-for-currency | reset-for-currency | seasonal | differs ×3 |
| 11 | active_skills_events | {strike, scandal, follow-up-return, ribbon-cutting, campaign-week, election-night} | 6 ids, Jaccard 0 | 4 ids, Jaccard 0 | 3 ids, Jaccard 0 | differs ×3 |
| 12 | meta_systems | {in-tray, ministers, follow-ups, gossip, elections, scrapbook, vanity-shelf, prestige} | literal 1/15 = 0.07; 3/13 = 0.23 counting ministers as cards and offices as locations | 1/15 = 0.07 | 1/13 = 0.08; 3/11 = 0.27 counting ministers as minders and the scrapbook as the Ladder Book | differs ×3 ("elections" unique) |
| 13 | meta_screen_layouts | different: a clothbound ledger, a framed cabinet photograph, a pinned ward map, a chalk tally board, an office wall with a shelf and a scrapbook | | | | pending ×3 (person) |
| 14 | art_style | flat-vector, palette "baize-and-ink" (4.6) | warm-cream | deep-space-cold | lantern-night | differs ×3 |
| 15 | character_kind | humans | humans | robots | animals | SAME / differs / differs |
| 16 | audio_overlap | 0 %: soundPack null, own recipes, compare.py cross-key gate | | | | differs ×3 |
| 17 | tone_and_string_overlap | voice "deadpan-memo"; under 5 % shared strings (`src/ui/decree/strings.ts`) | warm-playful | dry-radio-chatter | lantern-calm | differs ×3 |
| 18 | keyword_overlap | desk, mayor, governor, president, papers, sign, office, town hall, funny, satire, decisions, cartoon | | | | differs ×3 (tool computes) |
| 19 | release_gap | first submission at least 14 days after Lantern Row's last | | | | pending ×3 (log) |

Count:
- Against Pizza Empire: 8 of 8 must, 18 of 19 planned (only 15 is the same). Known at design time: 14 (1 to 6, 9 to 12, 14, 16 to 18); pending: 7, 8, 13, 19.
- Against Orbit Haulers and against Lantern Row: 8 of 8 must, 19 of 19 planned; known at design time 15.
- Floors if a person rules 13 "restyled": Pizza 17, the others 18. All stay at or above 15.

The one shared "should" (humans, against Pizza only). Pizza draws round chibi heads with big eyes on full small bodies in a kitchen cross-section, with a thick dark outline. Ours: editorial-cartoon busts, long oval heads (1.4 × taller than wide), dot eyes under heavy brows, button, straight or round noses, adults only; framed as head and shoulders in an oval photo clipped to the paper (full figures only on election night, as tall paper cut-outs with heads 1/6 of the body); a thin warm-brown ink line of varying width with one-direction hatching over two flat washes. Nobody walks, carries or serves.

Validate's other checks: no "Empire" and no "X: Y" shape in the title; "idle" and "tycoon" only in the description; product ids start with `office_`; the product kind multiset {unlock, unlock, cosmetic, skipAds} differs from P's, O's and L's (the multiset check counts duplicates).

Weakest claims, argued in `REVIEW-NOTES.md` with the tap path ("Read the paper; flick it up to sign"):
- 1 against Orbit's secondary freighter swipe: ours is the decision on every paper and the only main verb. Against drag (O, L): nothing is carried to a chosen place; one axis, two fixed destinations, a short flick counts.
- 1 against well-known card games: a document, not a portrait card; vertical only, no tilt; both outcomes printed in full; 3, 5 or 7 clubs, never four meters; nothing ends a run.
- 9 and 10 against Pizza: Pizza buys venues with cash; an office is entered only by a vote computed from decisions.

### 1.3 Points decided differently, with the reason

1. **Refuse goes into the drawer FOR FURTHER STUDY, not a shredder:** the funnier joke about office, a running gag (5.1), and the store judge read shredding government papers as a cover-up. Title and sounds agree: "Flick of the Pen" (7.9); a wooden drawer, no motor.
2. **The rally is a paper** (the last campaign paper, paid from the treasury), not a button: effects freeze when a paper lands (ruling 7), so nothing may move a mood while a paper sits on the desk, and every mood change is a decided paper.
3. **No paper carries a day cost:** moving the calendar forward brings the call day nearer, which helps a leader (ruling 9). Committees cost money and return with a bigger study instead.
4. **A rival's pull R** (6 / 8 / 10 off every share, printed on the poll) is added to the count: without it, every club at 50 holds every district and there is nothing to win.
5. **"One new thing per presidential term"** holds for 61 terms: 5 Grand Projects and 10 twists, then 45 pairs of twists never combined before. A short list alone runs out in a passive player's second week.
6. **Cut from v1:** the manifesto (its level promises let ad money reach the count), Name Recognition perks, minister perks, Who's Who.
7. **Westminster words softened** (store judge): no "seats", "Returning Officer", "Polling Day", "Independents".
8. **The treasury ad is "Check the Sofa"**, not "Bake Sale" ("Friends of the Mayor" reads as fundraising, Apple 3.2.2(iv), Ads 3.15). No "campaign funds" anywhere.
9. **Sympathy guarantees a win within 9 losses** in the worst case (2.11); the measured target is far shorter (H6).

---

## 2. Rules

Pure TypeScript in `src/engine/decree.ts` (the interface) and `src/engine/decree/`, installed by `src/engine/decreeMode.ts` as an `EngineMode`. The game.json `decree` block stays opaque in the shared schema and is parsed by `src/config/schema.decree.ts` in `EngineMode.config`. Starting numbers live in `src/config/decree.content.ts`, tuned and written by `build-office.py`. No `Math.random`, no `Date.now`: time comes as `now`, randomness from `rngMix4(seed, site, counter, x)` with one forward-only counter per site (`pick`, `petitioner`, `jitter`, `template`, `followDelay`, `campaign`, `rival`).

### 2.1 The rules in twelve lines (what the player is told; the whole engine)

1. Ministries collect taxes every second. Approval multiplies them.
2. While you play, a visitor brings a paper every 12 s, until 10 are waiting. Away, one comes every 6 minutes.
3. A paper prints exactly what signing and refusing do. Those numbers are applied.
4. Flick it up to sign, down to refuse. You can sign only what the treasury can pay. Refusing never costs money.
5. Each club of voters has a mood from 0 to 100. Approval is their weighted average.
6. A club whose mood falls below 20 strikes: its ministries collect nothing until you settle, or until 8 more papers are decided.
7. Some papers add gossip. At the limit the newspaper prints a scandal: apologise, or say nothing and lose a fifth of your taxes for 10 papers.
8. Some choices come back later. A tag on the paper tells you which.
9. A term is a fixed number of papers. From 60 % of it you may call the election.
10. Each district votes by the moods of its clubs. The poll board shows the result exactly as it would be today.
11. Win, and you gain Name Recognition; with enough, you move up. Lose, and you serve again with the voters' sympathy. Nothing you built is lost either way.
12. While you are away, ministries collect for up to 4 h and the in-tray fills. Nothing else changes.

### 2.2 Content data (starting values)

Offices:

| | Mayor | Governor | President |
|---|---|---|---|
| Place | Little Dithering | the Province of Upper Fudge | the Republic (capital Middlingham) |
| Ministries | 4 | 6 | 8, + 1 Grand Project at each of terms 2, 4, 6, 8, 10 |
| Clubs | 3 | 5 | 7 |
| Districts | 5 wards | 7 counties | 9 provinces |
| Majority | 3 | 4 | 5 |
| Term length D (days) | 80 | 110 | 160 (tune ±20 %) |
| Call from day C = 0.6 × D | 48 | 66 | 96 (fraction tune 0.5 to 0.7) |
| Campaign papers K (+ the rally) | 3 | 4 | 5 |
| Gossip limit G_max | 5 | 6 | 7 |
| Rival's pull R | 6 | 8 | 10 (tune 3 to 12) |
| Scale S | 1 | 1,000 | 1,000,000 (tune ×0.3 to ×3 each) |
| Name Recognition to stand | — | 14 | 60 (tune ±30 %) |
| Weight O of a win | 1 | 2 | 3 |

Clubs (icon): Early Bus Club (bus), Chamber of Shops (shop bell), Allotment Society (marrow); the governor adds the Brass Band Guild (tuba) and the Anglers' Circle (float); the president adds the Kite Flyers' League (kite) and the Tidy Hedge Committee (clippers). The counts are 3, 5 and 7, never 4.

District mixes w_{d,g} (hundredths summing to 1.00, data). Each district has 2 or 3 strong clubs; every club is strongest in at least one district and in no more than half. The mayor's wards:

| Ward | Bus | Shops | Allotment |
|---|---|---|---|
| Market Ward | 0.20 | 0.60 | 0.20 |
| Mill Ward | 0.55 | 0.25 | 0.20 |
| Hilltop | 0.20 | 0.20 | 0.60 |
| Riverside | 0.45 | 0.15 | 0.40 |
| Old Town | 0.30 | 0.40 | 0.30 |

Population weights W_g = mean over districts of w_{d,g}: mayor Bus 0.34, Shops 0.32, Allotment 0.34. Governor and president tables are data in the same form (the writers name the counties and provinces, 7.1; P2 sets the mixes with the rule above).

Ministries. Ministry 0 of each office serves no club, so it never strikes and income is never zero. Ministry i (0-based) of an office of scale S:
- base value v_i = S × 8^i (step tune 6 to 10);
- open cost O_i = S × {0, 150, 6,000, 400,000, 26M, 1.7B, 110B, 7T}[i] (each tune ×0.5 to ×3);
- level cost L → L+1 = 15 × v_i × 1.25^(L−1) (growth tune 1.15 to 1.30);
- milestones at levels 10, 25, 50, 100, 150, 200, 250, each ×2; m(L) counts those reached. A milestone brings a ribbon-cutting paper (2.7).
- level cap: 100 in the mayor's and governor's offices; the president's ministries 100 + 10 × (presidential terms won − 1), at most 250. A purchase that would change nothing is refused (merge M45).

| Office | Ministries (club served) |
|---|---|
| Mayor | Town Clock Office (none), Potholes Office (Bus), Benches & Bandstands (Allotment), Bins & Lampposts (Shops) |
| Governor | Provincial Clock Office (none), Turnpike Trust (Bus), Market Weights Board (Shops), Glasshouse Office (Allotment), Bandstand Board (Brass Band), Canals & Jetties (Anglers) |
| President | National Clock Office (none), Motorway Board (Bus), Lamplight Authority (Shops), Parks & Benches (Allotment), Office of Marches & Tubas (Brass Band), Harbour Board (Anglers), Kite & Weather Office (Kite Flyers), Hedgerow Bureau (Tidy Hedge) |
| Grand Projects (president, no club) | The Very Long Bridge, The National Ribbon Mill, The Weather Promise, The Tallest Bandstand, The Ministry of Ministries; project j (1 to 5) has v = v_7 × 2^j and opens at level 1 for free |

Roads and ports from the promise are here; schools are not (politics-policy.md 4 keeps schools and children out). No ministry reads as state media, policing, the army or real policy.

Money tiers of papers (seconds of B, frozen at the draw, 2.7): S 15, M 30, L 60 (tune ×0.5 to ×2), times a jitter j drawn from 0.85 to 1.15; minimum 5 dibs.

Archetypes (the writer picks one; the table fixes the base effects Δ; each tune ±1):

| Archetype | Share of comic papers | Sign | Refuse |
|---|---|---|---|
| Project | 28 % | cost M · petitioner +5 · other −3 | petitioner −3 · other +1 |
| Swap | 18 % | petitioner +4 · other −4 | petitioner −3 · other +2 |
| Fee | 14 % | gain M · petitioner +1 · other −4 | other +1 |
| Treat | 14 % | cost S · petitioner +3 | petitioner −2 · gossip +1 |
| Vanity (a trap) | 10 % | cost L · every club −1 | No change |
| Basket (lobby farce) | 8 % | flattered club +2 · gossip +2 · ↩ favour | flattered club −1 |
| Committee | 8 % | cost S · petitioner +2 · ↩ bigger study | petitioner −2 |

"Petitioner" is the visitor's club, "other" the club the writer names as the other side (the standing feuds of 7.2). A basket never pays money in any branch. Traps whose refuse is "No change" are at most 15 % of each office's deck.

Routine papers (expected to recur; not jokes): ministry request (sign: the exact price of the next level, that ministry +1 level, its club +1; refuse: its club −1), ribbon-cutting (cost S, served club +3 | served club −1), minister application (2.9), strike settlement (2.8), scandal (2.8), campaign papers and the rally (2.10).

Ministers: 12 named, 4 per office (7.3). A minister of rank r multiplies the ministry they run by μ = 1 + 0.25 × r (ranks 1 to 5).

Other values: starting treasury 30; tray cap 10 (+6 with Bigger In-Tray); arrival interval τ = 12 s (tune 10 to 14); away arrival every 360 s (tune 240 to 600); away rate a = 0.35 (tune 0.25 to 0.45); away cap 4 h (+4 h with Long Lunch); Name Recognition factor m_N = 1 + 0.02 × NR (tune 0.01 to 0.04); sympathy Y = 8 per consecutive loss (tune 6 to 10); vanity factor 1.02 per monument (tune 1.01 to 1.04); transition fund 30 s of the old B (tune 15 to 90).

### 2.3 State

`DecreeState` sits on the shared `GameState` under `decree`. Cash is the shared `cash`, changed only through one `commit()`. The play clock is the shared `stats.playSeconds`, which `tick` adds itself.
- `seed`; `draws` (one counter per site).
- `office` (0 mayor, 1 governor, 2 president); `term` (1-based in this office); `presTerms` (presidential terms won); `day` (papers decided this term); `phase` (`governing` | `campaign` | `count` | `result`); `losses` (consecutive at this seat).
- `ministries[i]`: `{open, level, minister: id | null}`.
- `moods[g]`: integers 0 to 100 for the office's clubs. `gossip`: integer ≥ 0. `quiet`: decisions since the last gossip gain.
- `strikes[g]`: `{papersLeft}` or null; `armed[g]` (false after a strike until the mood has been 30 or more).
- `scandal`: `{papersLeft}` or null (only while "Say nothing" runs).
- `tray`: up to cap papers, each fixed at its draw (2.7); `desk`: the paper on top with `shown`, its effects frozen when it landed; `asideTray` (ordinary papers set aside by a call).
- `nextArrivalAt` (play clock); `awayCarry` (seconds toward the next away arrival).
- `followUps`: `[{chainId, step, choice, dueAt}]`, dueAt in decisions ever; `seen`: hand-written text id → last decision index; `templateLast`: frame id → last decision index.
- `campaign`: `{C[d]}` campaign points this term.
- `nr` (Name Recognition, never falls); `cabinet[id]`: `{rank, assignedTo}`; `vanity` (monuments bought); `twistsUsed`; `clippings`; `wall` (offices held, portraits, photographs, Grand Projects); `drawerCount` (papers sent FOR FURTHER STUDY, cosmetic); `adsUsed` (per term: `sofa`); `cooldowns` (play clock); `standingOrder` (on or off, 5.8); `stats` (decisions, signs, refusals, strikes, scandals, wins, losses, per-district history).

### 2.4 Derived values

- Approval A = Σ_g W_g × m_g, shown as a whole percent. Revenue multiplier M(A) = 0.4 + 1.2 × A/100: ×0.4 at 0, ×1.0 at 50, ×1.3 at 75, ×1.6 at 100 (slope tune 0.8 to 1.4). The top bar shows "62 % ×1.14".
- rate_i = v_i × L_i × 2^m(L_i) × μ_i (μ_i = 1 without a minister).
- Vanity V = 1.02^vanity.
- **B = m_N × V × Σ_i open_i × rate_i.** It sizes papers and the transition fund.
- **I = M(A) × m_N × V × Σ_i open_i × s_i × rate_i × (0.8 while "Say nothing" runs)**, s_i = 0 while ministry i's club strikes, else 1. I is constant between player actions and arrivals.
- District share: share_d = min(100, max(0, Σ_g w_{d,g} × m_g + C_d + Y − R)), with Y = 8 × losses. It is computed in hundredths and shown to one decimal. You hold d when share_d ≥ 50.0. The poll is the number of districts held.

### 2.5 What a tick does (`EngineMode.tick`)

- cash += I × dt, exactly (cash at the last change + I × elapsed).
- Arrivals due in (clock, clock + dt] are drawn at their exact times while the tray has room (2.7). With a full tray the arrival clock stops; the next paper comes τ after a place frees. Arrivals stop during `campaign`, `count` and `result`.
- Nothing else moves with time: no mood, gossip, strike, scandal or day.
- tick(a + b) = tick(a) then tick(b) exactly (tested). The bot steps from event to event.

### 2.6 Player actions

`decide(choice)` (sign or refuse the desk paper), `buyLevel(i, n)`, `openMinistry(i)`, `assign(minister, i)`, `buyVanity()`, `callElection()`, `countVotes()`, `chooseAfterWin(moveUp | stay)`, `setStandingOrder(on)`, and the ad and product grants of 5.9. Each is a store action that calls the rules; each refuses and returns the same object when not allowed.

### 2.7 The paper

**Fields** (fixed at the draw, stored whole): id; kind (comic, template, followup, request, ribbon, application, strike, scandal, campaign, rally, scripted); visitor (face, name ≤ 24 characters, role ≤ 28, club); text ≤ 90 characters; archetype; subject and butt tags; two outcomes of at most 4 effects each from a closed set (money, club mood as base Δ, gossip, ministry +1 level, appoint a minister, end the strike, end the scandal, district points), and an optional follow-up `{chainId, step, delay}`.

**The draw** (at each arrival, in this order):
1. A strike or scandal paper due now goes on top (it may exceed the cap by 1).
2. A scripted paper (the first four of a new game, the first paper of each office).
3. A follow-up whose dueAt has passed, earliest first; never one whose set-up was not seen and decided.
4. A routine paper due: an application at days 9 and 30 of the office's first two terms; a ribbon paper when a ministry reached a milestone; a ministry request every 10th draw (tune 7 to 14), for the open ministry with the best payback.
5. Otherwise a template with probability q (mayor 0.16, governor 0.22, president 0.28; tune ±0.08), never a frame used within the last 20 papers; else a hand-written comic paper.

The comic draw picks the petitioner's club with weight max(0.5, min(3, 1 + (50 − m_g)/25)) (unhappy clubs knock more), the archetype by its share, then an unseen text from this office's deck, the any-office deck and lower offices' papers tagged `portable`. With none unseen it takes the one seen longest ago, in the compact form ("Again: the marrow. You know the drill.") with full numbers.

**Sizing, part 1 (at the draw):** money = roundDibs(tier seconds × B_draw × j), with B at the moment of the draw. It is stored and never recomputed.

**Sizing, part 2 (when the paper lands on the desk):** mood effects are computed once against the moods now and frozen into `shown`. For a base Δ on club g with mood m:
- gain: f+ = min(1.4, (100 − m)/50); loss: f− = min(1.4, m/50);
- shown = sign(Δ) × max(1, round(|Δ| × f)), rounded half away from zero, and 0 when the headroom (100 − m for a gain, m for a loss) is 0.
- So the same paper moves an unhappy club more by a yes and less by a no: its value depends on the town.

**Lemma (tested):** with |Δ| ≤ 10, m + shown stays in 0 to 100. For a gain, |Δ| × f+ ≤ (100 − m)/5 ≤ 100 − m and rounding cannot pass that integer; under the cap (m < 30), 14 < 70; the minimum of 1 needs headroom ≥ 1. A loss is symmetric. Fixed effects keep it: a settlement's +10 starts below 20, a strike's closing +6 below 25. So no clamp ever bites and printed equals applied; the engine asserts `clamps = 0` (H1).

**What a strip prints:** icons with resulting values ("[marrow] 61 → 65", "[coin] −540", "[gossip] 2 → 4"); deferred effects in words ("then Allotment +6"); "↩ This comes back" exactly when that outcome schedules a follow-up; "No change" when empty; a warning when it would start a strike ("Allotment below 20: STRIKE") or a scandal ("Gossip 5/5: SCANDAL").

**Decide(choice):**
- Sign is refused while cash < cost ("Short by 240 · about 9 s"); the paper can wait while taxes come in. Refuse is always possible and never costs money.
- Apply `shown` exactly; schedule any follow-up at decisions ever + delay. Then: strike check, gossip and scandal check, quiet counter, strike and scandal counters −1, day += 1, end-of-term check (2.10). The next paper lands.
- The sticky note announces a follow-up one paper ahead: "Next: the marrow is back."

### 2.8 Strikes and scandals (counted in papers; nothing moves while away)

**Strike.** After a decision, any club with m_g < 20 whose strike is armed strikes: its ministries' s_i = 0, a picket (MORE BISCUITS) appears on its ledger row, and a settlement paper goes on top of the tray.
- Sign "Biscuits for everyone": cost 20 s of B, the club +10 (fixed, not scaled), the strike ends.
- Refuse "Let them picket": the strike runs for the next 8 decided papers, then ends by itself with the club +6.
- It also ends at once when the club reaches 25 or more through any paper.
- It re-arms when the club's mood reaches 30.
- Optional ad "Send the Biscuit Van": ends it now, no mood change (5.9).

**Gossip and scandal.** Gossip rises only by effects printed on papers. Low approval never adds gossip, so there is no spiral (player judge's must-fix 1). After 8 consecutive decisions without a gossip gain, gossip falls by 1 (to 0 at least). When a decision brings gossip to G_max or more and no scandal runs, the newspaper's front page goes on top of the tray:
- Sign "Apologise on the steps": every club −3 (scaled by f−, shown), gossip to 0.
- Refuse "Say nothing": I × 0.8 for the next 10 decided papers and no call meanwhile, then gossip to 0.
- Optional ad "Call the Spin Doctor": ends it now, gossip to 0, no mood change.
- A scandal still running at the term's last day ends ("old news by voting day").

Both always have a free way out that costs no real money and needs no ad. Neither closes a ministry, lowers a level or touches Name Recognition.

### 2.9 Ministers (the cabinet)

- Twelve named ministers arrive as application papers, four per office (days 9 and 30 of the office's first two terms). Sign appoints the minister; refuse sends them away, and the same application returns 30 papers later, in whatever office, so none is lost.
- An appointed minister runs one ministry. The first assignment is automatic (the open ministry with the highest rate and no minister); the cabinet sheet reassigns by tap at no cost.
- Rank starts at 1 and rises by 1 at every election the minister serves through, won or lost, up to 5. Never bought, never random.
- Ministers and their ranks travel to every new office; at a move each is unassigned and placed again for free (automatic as above).

### 2.10 The term, the campaign and the count

- The term ribbon reads "Day 41/80 · call from 48 · Governor: NR 9/14"; from day C it becomes the button "Call the election (poll 4 of 5)".
- **Calling** needs day ≥ C, no "Say nothing" scandal and phase `governing`; the confirmation prints the count as it stands ("If you call it now: 4 of 5 wards. 3 needed."). At day D the campaign starts by itself.
- **The campaign:** waiting ordinary papers are set aside (`asideTray`); arrivals stop; K campaign papers, then the rally, arrive. A campaign paper names a district (seeded, among those within 6 points of 50, else the closest): sign costs 45 s of B, that district +4, another −1 (campaign points, not moods); refuse "No change". The rally: sign costs 60 s of B, the lowest club +4 (scaled, frozen); refuse "No change". Campaign papers are not days.
- **No ad and no product is offered from the call to the end of election night** ("Closed during the campaign").
- **The count:** the poll is the result, number for number. Districts are announced in order of |share_d − 50|, largest first, ties by index, 2.5 s each; a tap skips.
- **After a win:** NR += O × (3 + districts held), + 2 × O if every district was held; losses = 0; each minister's rank +1. If NR meets the next office's requirement, the result sheet offers "Stand for Governor" (the move, 2.12) or "Another term here"; otherwise "Another term here" only, and it says what is missing ("Governor needs Name Recognition 14: you have 8").
- **After a loss:** NR += O; losses += 1 (so Y rises by 8); ranks +1; the rival resigns by morning (one of 16 written lines: "Councillor Plumb has resigned, citing 'the stairs'. You are asked to carry on.").
- **A new term in the same seat** (after either): day = 0; every mood moves halfway back to 50, rounded toward 50 ("voters' memories are short"); gossip to 0; campaign points to 0; `asideTray` returns to the tray (its money as drawn); a vanity monument is offered (5.7). As president, the term's one new thing arrives (2.14).

### 2.11 Why repeated losses must end in a win

For any district d at the count: Σ_g w_{d,g} × m_g ≥ 0 and C_d ≥ −K (each campaign paper takes at most 1 point from one other district). So share_d ≥ 8 × losses − R − K. Every district is held as soon as 8 × losses − R − K ≥ 50, that is, losses ≥ (50 + R + K)/8: mayor (50 + 6 + 3)/8 = 7.4, governor (50 + 8 + 4)/8 = 7.75, president (50 + 10 + 5)/8 = 8.1. So the 8th consecutive loss as mayor or governor, and the 9th as president, is followed by a certain win, whatever the player does, with every mood at 0. The validator recomputes ceil((50 + R + K)/Y) from the tuned values and fails when it exceeds 9. In practice the halfway reset lifts every club to at least 25 at each new term, so the measured bound is far shorter (H6).

### 2.12 The bigger office: what resets and what carries (`EngineMode.prestige`)

`canPrestige` is true only on the result sheet after a win with NR at the requirement. The move:
- **Resets:** treasury to the transition fund (30 s of the old B); the new office's ministries (ministry 0 at level 1); clubs at 50 + min(5, floor(NR/20)); gossip, strikes, scandal, day, campaign; waiting ordinary papers go back to the deck unseen; losses.
- **Carries:** Name Recognition; ministers and ranks; monuments; the scrapbook and every seen text; follow-ups still due (sized at their own draw); purchases; the Office wall, with the old town's photograph and its ministries' levels on record.
- The move sheet lists Resets, Stays and Next, and "In Upper Fudge your income passes today's in about 5 min" (2.16).

### 2.13 Worked table: the first ten minutes (placeholder)

Reference hand 6 s per paper, τ = 12 s. Prices exact by the rules; times and incomes from a rough rate model (`scratchpad/office/proto/spec-sketch/sk.py`, not the prototype) until `build-office.py --table` prints the real one.

| Time | What happens | Dibs spent | Income (dibs/s) |
|---|---|---|---|
| 0:00 | Face picked. Treasury 30; Town Clock Office level 1. | | 1 |
| 0:02 | Paper 1 (scripted, Rodney Spinwell) lands; signed at 0:06: every club 50 → 51. The poll reads "0 of 5 · Plumb's hat −6". | | 1 |
| 0:08 | Goal line "Raise the Town Clock Office · 15": bought. | 15 | 2 |
| 0:14 | Paper 2 (scripted swap: Desmond Kerb's bus lane). | | 2 |
| 0:20 to 0:40 | Town Clock levels 3 and 4 (19, 23). | 42 | 4 |
| 0:26 | Paper 3 (scripted fee: Till's Teas, +60 fixed). | | 4 |
| 0:38 | Paper 4 (scripted basket: Lionel Sash; first gossip choice). | | 4 |
| 0:45 to 1:00 | Town Clock level 5 (29); Potholes Office opens (150). | 179 | 13 |
| 1:00 to 2:00 | Potholes levels 2 to 6 (120, 150, 188, 234, 293); Town Clock 6 to 9 (37, 46, 57, 72). | 1,197 | about 60 to 100 |
| about 1:50 | Day 9: the first application (Dorothy Quayle); signed, she runs the Potholes Office (×1.25). | | |
| about 2:00 | Benches & Bandstands opens (6,000); Town Clock level 10 (89), the first ×2 and its ribbon paper. | 6,089 | about 600 |
| 2:00 to 6:00 | Levels into the high teens on three ministries; the first ministry request; the marrow follow-up, if signed (sticky note first). | | about 2,500 to 3,500 |
| about 6:00 | Day 30: the second application. Saving for Bins & Lampposts (400,000). | | |
| about 6:40 | Bins & Lampposts opens. | 400,000 | about 18,000 |
| 10:00 | Day 48: the ribbon becomes "Call the election (poll 3 of 5)". About 48 papers, 1 or 2 ministers, 4 ministries, about 100 purchases, gossip 0 to 2, approval about 58 to 62 %. | | about 30,000 to 40,000 |

The reader calls at about day 56 (11:30, poll 4 of 5); three campaign papers, the rally and election night take about 1 min; the first election ends at about 12:30. Usual result: 4 of 5 wards, NR 1 × (3 + 4) = 7. The rough model buys every 2 to 10 s until minute 6 and every 20 to 40 s after: P2 checks the gap aims (8.4) on the real rules.

### 2.14 The top: further presidential terms

Every presidential re-election (won or lost) opens exactly one new thing for the coming term, told as part of the place on the result sheet:
- Terms 2, 4, 6, 8, 10: a Grand Project ministry (2.2), opened at level 1.
- Terms 3, 5, 7, 9 and 11 to 16: one twist for that term, from a hand-written list of 10, each one parameter override, never new code: Bandstand Summer (Brass Band Guild +0.10 in every mix, the others scaled down), Committee Week (committees twice as common), Quiet Press (gossip limit +2), Ribbon Shortage (ribbon papers cost and please ×2), Kite Weather (Kite Flyers +0.10), Market Fortnight (fees ×1.5), Early Doors (visitors every 10 s), Hedge Inspection (Tidy Hedge +0.10), A Gentle Week ("Say nothing" lasts 6 papers), Biscuit Surplus (settlements cost half).
- From term 17: each term a pair of twists never combined before, in a fixed hand-written order of the 45 pairs (through term 61). The validator checks that each pair composes (two mix twists add; no two touch the same other parameter).
- Each presidential term won also raises the level cap of the president's ministries by 10 (to 250).
- Each presidential term brings a new rival from a hand-written list of 12 (then they return, "back for another go").
- No world office, no other planet.

**Largest number.** With the caps (level 250, every factor at its 30-day high: m_N ≈ 32 at NR 1,550, vanity 1.02^24 = 1.6, ranks 5, A = 100), B ≤ 2e22 dibs/s and the treasury ≤ 1e27 after the longest absence with the ad. Under the level-cost growth a steady player stalls far below the caps; the expected 30-day high is about 1e20 to 1e23. The formatter's last suffix (Dc) covers 1e33 to 1e36, so the bound is 6 orders inside it, and far inside double precision. A gate checks it (H11).

### 2.15 Time away, as a closed form (`EngineMode.offline`)

Returns `{seconds, earnings, game, report}` and adds nothing to cash; the store grants `earnings`, × `offlineAdMultiplier` = 1.5 with the ad, rounded by `roundPayout` = roundDibs.
- t = (now − max(lastSavedAt, stats.clockHigh))/1000 (the shared guard: time already paid is never paid again); t′ = min(t, cap).
- I_away = a × M(A) × B, with strikes and the scandal ignored: they pause, and nothing bad runs while away. earnings = roundDibs(I_away × t′), paid when computed (lesson 5).
- Papers: n = min(free places, floor((t′ + awayCarry)/360)); awayCarry = (t′ + awayCarry) − 360 × n when n is limited by time, else 0. The n papers are drawn in order on return through the normal draw with the unchanged state, so a reload re-rolls nothing; no arrival during a campaign. nextArrivalAt is re-phased to within one τ of the clock.
- Unchanged while away: moods, approval, gossip, every strike and scandal counter, the day, the poll, cooldowns (play clock).
- The report: "While you were out (2 h 10 m): the ministries collected 14.2K dibs. 10 visitors are waiting."
- `income()` = I_away; `activeIncome()` = I; `reportAlone` is true when papers arrived and nothing was earned.
- Cross-check (10.2): event stepping over t′ with no player gives exactly the same earnings, papers and offsets.

### 2.16 Advice and the goal line

`advice(cfg, state)` is pure and returns one goal, for the bot and the goal line. Score = max(0, cost − cash)/I + cost/Δincome over ministry levels, openings and the vanity monument (Δincome of a monument: 0.02 × I); the lowest wins. Also offered: "Call the election (poll 4 of 5)" when the reader's rule would call (8.2); during a strike or scandal, the free exit and the ad. The goal line shows the words, the price and "about 20 s / 2 min / 1 h" (none at I = 0); a tap opens the sheet that buys it.

---

## 3. The first three minutes, then the goals to hour three

### 3.1 Timed script (the tutorial)

- **0:00** Loading card with the emblem, "The Republic of Middling. Proudly Adequate."; the player taps one of 6 faces ("Pick for me" too; no name field). "Elected Mayor of Little Dithering by 3 votes. Two were your mother's."
- **0:02** Paper 1 (sample 1, 7.5). A drawn hand pushes it up once; the out-tray glows at 40 pt; pen scratch, tray clink.
- **0:08** Goal line "Raise the Town Clock Office · 15"; the paperclip pointer moves to the Ledger; the first purchase.
- **0:14** Paper 2: Desmond Kerb's bus lane (a swap). The hand shows both directions once, then only after 15 s without a touch.
- **0:26** Paper 3: Till's Teas (a fee, +60 fixed): papers can pay; pleasing one club annoys another.
- **0:38** Paper 4: Lionel Sash's basket; "Gossip 0/5" appears. No lecture; the follow-up tells the rest.
- **0:50** The general draw; the door glass shows "Next visitor 0:07"; the goal line names the next purchase.
- **about 1:00** the Potholes Office opens; **about 1:50** the first application and the cabinet's first face; **about 2:40** the first sticky note.

### 3.2 Goals of minutes 3 to 30

- Minutes 3 to 10: three more ministries opening, the first ribbon, the first follow-up, the second minister; the ribbon becomes "Call the election" at day 48 (about 10:00).
- Minutes 10 to 13: the first call, campaign and election night (2.13). Usual result: 4 of 5 wards, NR 7, "Another term here" (Governor needs 14).
- Minutes 13 to 26: mayor term 2. The halfway reset makes it contested again. The first strike comes to a player who neglects a club, the first scandal to one who takes baskets. The first vanity monument is offered (a bust of yourself, about 10 min of taxes). The second win usually brings NR to 14: "Stand for Governor".
- Minutes 26 to 30: Governor of Upper Fudge. The desk becomes mahogany with a green lamp; the Brass Band Guild and the Anglers' Circle join; 7 counties; Sir Barnaby Waft ("Waft: Gently Onwards") pulls 8. The transition fund buys the first levels at once.

### 3.3 Hours one to three, and week three

- 0:26 to about 1:25: three governor terms of about 18 to 20 minutes. Something new every 10 minutes or less: a ministry, ministers 5 to 8, the first strike settlement, a county lost by 0.4, chain endings in the scrapbook. NR reaches about 60.
- About 1:25: President. The long walnut desk with three telephones; 7 clubs, 9 provinces; Professor Ignatius Crumb ("Crumb: Abolish Wednesdays") pulls 10. Presidential terms of about 25 to 28 minutes.
- About 1:55: presidential term 2 opens The Very Long Bridge; about 2:25, term 3 brings Bandstand Summer.
- At hour 3, typically: president term 3 or 4; about 850 papers decided; 8 to 10 ministers; 3 to 5 monuments; 15 to 25 clippings; 0 hand-written texts seen twice in hour 1 and at most a few in hours 2 and 3.
- **Week three** (passive: 5 sessions of 8 minutes a day, each finding up to 10 papers and 4 h of taxes; about 250 papers a day): governor on day 1, president on day 2 or 3, about presidential term 15 to 25 by day 21. Still new: each term's twist or new pair, its rival, the next of 24 monuments, ministers reaching rank 5, missing clippings, the level cap rising 10 a term, the Grand Projects' milestones.
- **Honest limit:** the president's hand-written pool is used up at about hour 4 of active play; after that, comic texts return in the compact "Again:" form with fresh numbers, and templates carry a larger share. Content updates are the answer (9.3).

---

## 4. Screens

### 4.1 Fixed zones

Portrait, one screen, no tab bar. Every zone comes from the pure `deskLayout(width, height, insets, fontScale)` in `src/ui/decree/layout.ts`.

| Zone, top to bottom | 375 × 667 (insets 20 / 0) | 390 × 844 (insets 47 / 34) |
|---|---|---|
| Top inset | 20 | 47 |
| Top bar | 40 | 44 |
| Club strip | 32 | 40 |
| Term ribbon | 18 | 20 |
| Desk: out-tray band | 36 | 56 |
| Desk: paper area | 405 | 461 |
| Desk: drawer band | 36 | 56 |
| Goal line | 20 | 22 |
| Bottom row | 60 | 64 |
| Bottom inset | 0 | 34 |
| Total | 667 | 844 |

Widths at 375 (gutters 16):
- Top bar: treasury and rate 120, approval chip "62 % ×1.14" 86, gossip chip 56, menu 40, gaps 3 × 6, gutters 2 × 10: 340 ≤ 375.
- Club strip: 7 icons of 32 with gaps of 6: 260. Icons only, each with a thin mood ring; the number appears for 2 s when it changes and on a tap (lead ruling 11). With 3 clubs the numbers are always shown.
- Term ribbon: one line, cut at a computed width, never wrapped.
- Bottom row: in-tray stack 72 (count badge; a tap shows the next 3 visitors' faces), Ledger, Cabinet, Poll, Office 64 each, gaps 4 × 4, gutters 2 × 8: 360 ≤ 375.

### 4.2 The paper, row by row

Width at 375: 343 (16 gutters); at 390: 358. Text sizes at font scale s = min(fontScale, 1.3), all `allowFontScaling={false}`, in rows whose heights add up (`src/ui/decree/paperMetrics.ts`, as `headerMetrics.ts`; no negative margins). Heights at s = 1.3:

| Row | Content | Height |
|---|---|---|
| Outer padding | | 6 |
| SIGN strip | 4 + title "IF SIGNED ↑" (13 × s → 17, row 22) + 2 chip rows (15 × s → 20, row 28 each) + note row (12 × s → 16, row 20) + 4 | 106 |
| Divider | | 2 |
| Header | oval photo 44 × 54 with paperclip; name (15 × s), role and club badge (13 × s): 25 + 21; max(54, 46) + 8 | 62 |
| Proposal | fixed 4 lines at 16 × s = 20.8, line 26: 104, + 8 | 112 |
| Divider | | 2 |
| REFUSE strip | the same rows, title "FOR FURTHER STUDY ↓" | 106 |
| Outer padding | | 6 |
| Total | | 402 ≤ 405 |

- Chips are an icon (18) plus a resulting value in tabular digits ("61 → 65"), at most 2 per row (each ≤ 151 at 1.3; two plus a gap of 6 fit the 315 inner width), at most 4 per strip. A district chip carries a two-letter district badge ("HT 48.6 → 52.6").
- The note row holds "↩ This comes back", "No change", "Short by 240 · about 9 s", or the strike or scandal warning.
- The validator measures every proposal, every template filled with every word-list entry, every name and role, and every chip and note at s = 1.3 against these boxes with a glyph-width table of the system font (10 % safety margin until the table is calibrated against a phone screenshot once).
- The SIGN strip sits at the paper's top edge next to the out-tray, the REFUSE strip at its bottom edge next to the drawer: the half you push toward is the effect you get.
- Approve and refuse are never red and green: the SIGN strip is violet ink, the REFUSE strip slate grey.

### 4.3 The flick (React Native responder; no gesture library)

- `onStartShouldSetResponder` is true only for touches inside the paper's rectangle (plain numbers from `deskLayout`), so a drag starting at a screen edge never takes the iOS home or Android back gesture.
- `onResponderMove`: JavaScript keeps its own dy and velocity from `pageY` and timestamps, and writes one shared value, `paperY`. The UI thread draws the paper at `paperY`. JavaScript never reads a shared value.
- The paper moves only vertically: no x movement, no rotation, no tilt.
- At 40 pt of travel the target lights: going up, the out-tray glows and the SIGN chips grow to 110 % while the REFUSE strip dims to 50 %; going down, the drawer opens a little. A light haptic tick at 40.
- Release commits at 90 pt of travel, or at 24 pt or more with a velocity of 0.5 pt/ms or more in the same direction. Otherwise the paper springs back (one spring clock on the UI thread).
- Signing while short: the paper springs back, the strip shakes, "Short by 240".
- A second finger cancels the drag.
- **Second path** (accessibility and precision, never taught): tap a strip to arm it (it lifts: "Tap again to sign"), tap it again to commit; a tap elsewhere or Android back disarms. Screen readers get `accessibilityActions` Sign and Refuse.
- After a decision: signed papers slide up into the wire tray, whose stack grows by one sheet per paper until the term ends; refused papers slide down into the drawer, whose label counts "FOR FURTHER STUDY (312)". The next paper slides in from the in-tray after 300 ms.

Why it is ours and fits one thumb: the cheaper "no" is a short pull toward the resting thumb, signing a deliberate push away; 90 pt mid-screen along the thumb's arc, never at an edge; both outcomes always printed in full, nothing revealed by tilting, nothing stamped (the border-inspection game's mark); the destinations are desk objects that visibly fill.

### 4.4 Sheets and full-screen views

Every dialog is the kit `Sheet` or registers with `useOverlay`; one at a time.
- **Ledger:** one inked row per ministry (level, rate, club, a picket when on strike: "On strike: Allotment 18, ends at 25 or in 5 papers", the next price); tap buys one, a long press buys to the next milestone (price shown first); the milestone in the margin ("Level 25: ×2 and a ribbon"); closed ministries with their opening price.
- **Cabinet:** the framed photograph, dotted silhouettes for empty places; a face opens the minister card (bio, rank, ×1.25 to ×2.25, assignment).
- **Poll:** the pinned district map with each exact share, the clubs it weighs, the rival's pull and the sympathy ("Plumb's hat −6 · Sympathy +8"); the call button.
- Away report, the move sheet (Resets / Stays / Next), the result sheet, Shop, Settings (sound, music, haptics, "Buttons instead of flicks", restore purchases, privacy).
- **Full-screen views** (`useOverlay`; the desk stops its clocks beneath): Election Night; the Office (the wall of portraits and photographs, the vanity shelf and the scrapbook as objects on it); the face picker.

**Election night:** a chalk tally board, one row per district, a bar with the majority line; the Counting Clerk, Agatha Tallow (a paper cut-out), opens an envelope every 2.5 s; rows fill with chalk marks and a rosette if held; at the majority, bunting and the band in silhouette, then the rival's line ("Plumb: I still own the hat"). A tap speeds the rest ×4.

**Android back** closes the top layer in this order: an armed strip, the in-tray peek, a sheet, a full-screen view (Election Night jumps to its result first, never quits mid-count). It leaves the app only from the bare desk.

### 4.5 Phone rules

- One Skia canvas for the desk (papers, trays, drawer, door), never one canvas per row; portraits elsewhere through `GameIcon`.
- The canvas runs at 60 fps while a finger is down or a paper moves, else 30. One clock per animated thing: `paperY` with its spring, the paper's entrance, the drawer, the sticky note's one wobble, the treasury roll, the election-night calls. Visitors do not idle-animate. Nothing invisible animates.
- Paper text is Skia paragraphs in fixed boxes sized by hand as 4.2. The treasury is a `RollingNumber` with no `lineHeight`.
- Atlases under 2,048 px, drawn in code, baked once (`bakeAtlas`), never freed while a canvas may draw: faces (48 busts at 128 × 160 in 8 × 6: 1,024 × 960; the player's 6 faces again as one-colour portraits for the Office Wall, with 3 ageing steps as a drawing parameter); props (1,024 × 1,024). District maps are Skia paths with no atlas.
- `npm run lint:worklets` passes; the only worklets are the drawing of `paperY` and the spring.
- Selectors use `useShallow`; the desk reads the desk paper through one selector returning a stable version.
- Hints never cover a number on the paper.

### 4.6 Palette "baize-and-ink"

Desk baize #2E4A3E with a darker felt pattern; walnut rim #6B4A33; paper a cool pale blue-grey #ECEFEA (not cream, not manila); violet ink #5B3E8C (signature, headings, the SIGN strip); slate #6C7A89 (the REFUSE strip); brass #C9A45C (tray, paperclip, lamp); mustard #D9A53A (money); soft brick #B0563F only for strike and scandal words, under 8 % of any screenshot; chalk slate #2D3436 for election night. Club colours (mustard, teal, sage, slate blue, apple green, copper, plum) never map onto a real party's and always come with their icon. Loading screen: the goose emblem on pale paper over baize, "The Republic of Middling. Proudly Adequate."

---

## 5. Meta systems (each in a container none of the three games uses)

All built from the shared kit (Sheet, overlays); none uses the tabs family, a missions sheet, a chest overlay, ladders, an arch, a scroll, a contract board or a star map.

1. **The in-tray, the desk and the drawer** (the core): the stack with its count, the door glass with the next visitor's shadow, the sticky note, the wire out-tray that fills over a term, the drawer FOR FURTHER STUDY whose count grows (at 100, 1,000 and 10,000 refusals the drawer is drawn bigger: a second drawer, a filing cabinet, a photograph of a warehouse; looks only).
2. **Ministries in the Ledger**: a clothbound accounts book from the desk drawer (4.4).
3. **The Cabinet**: a framed group photograph; 12 ministers from application papers only; never sold, never random; they travel.
4. **Follow-ups and chains**: 40 chains of 2 to 3 steps; the sticky note one paper ahead; both branches end in a clipping.
5. **The Gazette corner** (gossip): a folded newspaper at the top bar's gossip chip showing "2/5" and the last headline; at the limit, the front page slides onto the desk.
6. **Elections**: the pinned ward map on the Poll sheet, the term ribbon's call button, the campaign papers, the chalk tally board of election night, the result sheet.
7. **The Office** (a full-screen wall): your portraits as mayor, governor and president, greying a little each term; photographs of the towns you left; Grand Projects; terms served, stated as plain facts, never a score.
8. **The vanity shelf** (on the Office wall; state's graft): one monument offered at the start of every term from mayor term 2, costing 600 s of B (tune 300 to 1,200), giving ×1.02 income for good in every office, from 24 hand-written monuments (a bust of yourself; a bust of the bust; a portrait of you cutting a ribbon; a statue of you pointing at a smaller statue of you; a fountain shaped like your signature). Refusing costs nothing; the offer moves to the next term.
9. **The scrapbook** (on the Office wall): 80 clippings from the endings of the 40 chains plus a headline per election; the first time a clipping is glued in, +1 Name Recognition; unfound ones show the chain's first line, a reason to choose the other side next time.
10. **The Standing Order** (state's graft, from governor term 2, on or off in the Ledger): Cuthbert Pell, the intern, buys the advised level while you play when cash ≥ 3 × its price and the purchase leaves the desk paper's sign cost. Never while away, which keeps time away a closed form.
11. **Shop and rewarded ads** (a sheet, not a system):
   - Products (none random, none a currency, none a multiplier; none touches a mood, the poll or the count): `office_long_lunch` "Long Lunch" (unlock, $3.99): +4 h on the away cap; `office_bigger_tray` "Bigger In-Tray" (unlock, $2.99): 6 more places, while playing and away; `office_walnut_desk` "Walnut & Brass Desk Set" (cosmetic, $2.99): desk, lamp and gold pen, looks only; `office_do_not_disturb` "Do Not Disturb Sign" (skipAds, $4.99): every Watch-ad reward at once without the video, sold openly under its own name as each of the other three apps sells one, and REVIEW-NOTES says so.
   - Rewarded ads (optional, labelled "Watch ad", each offered only from a button the player taps; cooldowns on the play clock and stated so; a failed load loses nothing and says "Not available right now"): away report +50 %; **Check the Sofa** (Rodney finds dibs down the back of the office sofa): +40 s of B, once per term, not during the campaign. 40 s is less than one campaign paper's 45 s, so it cannot fund a campaign action by itself (lead ruling 6); **Call the Spin Doctor**: ends a running scandal now; **Send the Biscuit Van**: ends a running strike now; **Open the Doors**: the in-tray fills to its cap now, cooldown 15 min of play.
   - From the call of an election to the end of election night, no ad and no product is offered.
   - No interstitials, no banners; the AdMob sensitive category "Politics" is blocked.

Cut on purpose: chests and any random reward (so there are no odds to show), missions, a manifesto, daily gifts, energy, premium currency, timed offers, starter packs, leaderboards (rivals are computer characters, so no "Contests"), push notifications in v1.

---

## 6. Sound and haptics

Character: wood, brass, pen nib, pneumatic air, a distant bandstand. No pluck, marimba, bell ladder, steam, felt or chiptune (the best-known swipe card game's score); paper rustle kept short, because Lantern Row's world is paper. `soundPack` null; files rendered into `games/high-office/assets/sfx` by `scripts/audio/recipes_office.py`, `render_office.py` and `office_music.py` on the `dsp.py` primitives; the catalogue `src/services/fx/catalog.decree.ts` (Node only); `compare.py` in cross-key mode against all three games at the 0.6 joint threshold is the gate; a person does the listening check.

| Key | Sound | Haptic |
|---|---|---|
| paper_arrive | a soft door knock and a card-stock slap (at most every 5 s) | none |
| flick_threshold | a dry pen-cap click at 40 pt | light |
| sign | a fountain-pen scratch, then the clink of the wire tray | medium |
| study | a wooden drawer slide and a muffled thunk | medium |
| denied | a dull desk tap | light |
| buy_level / open_ministry | a ledger nib tick and a coin / a brass latch and a tuba blat | light / light |
| appoint | a camera shutter as the photograph fills | light |
| milestone | a small hand bell | light |
| ribbon | scissors snip and a clarinet flourish | light |
| strike_start / strike_end | a wordless kazoo picket chant / a biscuit-tin lid | none / light |
| scandal | a newspaper slapped on the desk and a muted trombone | light |
| clipping | scissors and glue | none |
| call_election | a big wooden gavel knock | medium |
| env_open / tally | a snare roll (1.2 s) / chalk taps | none |
| district_held / district_lost | a tuba-and-snare sting up / a trombone slide | success (≥ 300 ms apart) / none |
| majority / defeat | 8 bars of "The Middling March", full band / one tuba playing the march slowly | heavy + success / none |
| ui_open, ui_close | a book cover, a drawer push | none |
| music_desk, music_campaign | 90 s loops: bassoon, pizzicato and brushes at 90 bpm, quiet under reading; the campaign loop a brass march at 112 bpm | |

Haptics follow only what the thumb did and the rare peaks, at most 8 pulses a second; none for taxes, arrivals or the away payout. The shared keys the store plays are mapped in `src/modes/decree/soundKeys.ts`.

---

## 7. The invented country, cast, voice, papers, writing and store page

### 7.1 The country

The Republic of Middling, motto "Proudly Adequate"; founding law written on a napkin; emblem a goose holding giant scissors on a beige field (no stripes, stars, eagles, seals or real buildings); an original brass tune, "The Middling March", and no anthem; currency the dib. No parties exist anywhere.
- Little Dithering (mayor), wards Market Ward, Mill Ward, Hilltop, Riverside, Old Town; newspaper the Dithering Daily Drizzle.
- The Province of Upper Fudge (governor), 7 counties named by writer 2; newspaper the Upper Fudge Evening Fuss.
- The Republic, capital Middlingham; provinces Middlingham, Fogmoor, Brassby, Teacup Downs, Gusting Heights, Muchmarsh, Saltpenny Bay, Kitewell, Upper Fudge; newspaper the Middling Morning Murmur.
Every proper noun goes into `scripts/content/office/names.json` with the date of its web check for a real match and who checked it (generic terms only, never the project's name).

### 7.2 Clubs of voters and their feuds

Hobby and errand clubs only, never a people, faith, age, class or region: Early Bus Club, Chamber of Shops, Allotment Society, Brass Band Guild, Anglers' Circle, Kite Flyers' League, Tidy Hedge Committee. No trait is pinned on any club; the joke is on the office and on you. Standing feuds, each mild and silly: buses against shop awnings over the pavement; allotments against bus lanes; brass bands against anglers (noise at the pond); kites against hedges (tangled strings).

### 7.3 The cast (about 48 drawn busts, built from parts in code)

- **You**: one of 6 faces with its name (Hettie Bramble, Osgood Fennel, Ada Quill, Rupert Marchpane, Winifred Tuttle, Cosmo Larkspur): "Mayor Bramble", later "Governor", "President" (never "Mr President"). The main butt of the joke: vain, fond of ribbons.
- **Advisors**: Rodney Spinwell, Chief of Staff (vanity and spin); Gwendolyn Abacus, Treasury Clerk (ministry requests); Cuthbert Pell, the intern (committees, the Standing Order); Deputy Pruella Marsh (governor; dry, hungry); Secretary Ottilie Fenn (president; has seen three presidents and liked one).
- **Spokespeople**: Desmond Kerb (Bus), Pauline Till (Shops), Hilda Marrowby (Allotment), Horace Bellows (Brass Band), Marigold Hake (Anglers), Wendell Loft (Kites), Agnes Privet (Hedges); Bert Trowel, shop steward of every strike.
- **Lobbyists, farce only**: Lionel Sash (Ribbon Makers' Guild), Crispin Vane (Consolidated Umbrellas), Lavinia Goss (Ornamental Fountain Council), Tobias Slake (Novelty Hats & Sons). Gifts are fruit baskets, a fountain shaped like you, a hat with a smaller hat on it; they never pay money and always bring gossip and a favour back.
- **Others**: Ambrose Minute (Committee on Committees), Agatha Tallow (the Counting Clerk).
- **Ministers (12)**: Dorothy Quayle ("References: 'She found one.'"), Dorrit Pellow, Barnaby Ferrule, Wendeline Hush, Ignatia Bole, Percy Gimlet, Marjorie Wren, Oswald Tamp, Florence Dibble, Humphrey Lathe, Clemency Ash, Neville Spoke.
- **Rivals**, individuals with a hobby and a slogan, never a party or a colour: Councillor Prudence Plumb ("Plumb: She Owns A Hat"), Sir Barnaby Waft ("Waft: Gently Onwards"), Professor Ignatius Crumb ("Crumb: Abolish Wednesdays"), then 12 hand-written presidential rivals (for example Dame Ottoline Strop, "Strop: Firmly Seated").
- No children, school, soldier, police, clergy or uniform anywhere; no religious or uniform headwear.

### 7.4 Voice: deadpan-memo

Dry official language describing something silly. A fixed frame with an absurd payload; the joke on the office or on you; no puns as the main joke, no pop-culture references, no catchphrases, at most 1 exclamation mark per 50 papers. A proposal is never a policy opinion.

### 7.5 The paper format, and twelve finished papers

Each paper shows: an oval photo with a paperclip, the name, the role and the club badge; the proposal; the SIGN strip at the top, the FOR FURTHER STUDY strip at the bottom. Shown below in the mayor's office at B = 18 dibs/s (about the first minute and a half), every mood 50 unless stated, so f = 1. Money is tier × B × j, with j as drawn (S 270, M 540, L 1,080 at j = 1). Groups are written by name here; on the paper they are icons.

1. **Rodney Spinwell · Chief of Staff** (scripted). "Welcome, Mayor. Please sign this to say you have read it. You haven't. Sign it." (79)
   SIGN: Bus 50 → 51 · Shops 50 → 51 · Allotment 50 → 51. STUDY: ↩ He brings another copy.
2. **Hilda Marrowby · Allotment Society** (project, other: Shops). "Grant the prize marrow the freedom of the town. It has asked very politely." (75)
   SIGN: −556 (j 1.03) · Allotment 50 → 55 · Shops 50 → 47 · ↩. STUDY: Allotment 50 → 47 · Shops 50 → 51.
3. **Desmond Kerb · Early Bus Club** (swap, other: Shops). "Paint a faster lane inside the bus lane, for buses in a particular hurry." (73)
   SIGN: Bus 50 → 54 · Shops 50 → 46. STUDY: Bus 50 → 47 · Shops 50 → 52.
   The same paper when the Bus Club is at 30 (f+ = 1.4, f− = 0.6): SIGN Bus 30 → 36 · Shops 50 → 46; STUDY Bus 30 → 28 · Shops 50 → 52. Unhappy clubs are moved more by a yes and less by a no.
4. **Lionel Sash · Ribbon Makers' Guild** (basket, flatters Shops). "A small fruit basket for you. No reason. Perhaps more ribbon-cuttings? No reason." (81)
   SIGN: Shops 50 → 52 · Gossip 0 → 2 · ↩. STUDY: Shops 50 → 49.
5. **Ambrose Minute · Committee on Committees** (committee, Shops). "We request a sub-committee to choose the committee's biscuits." (62)
   SIGN: −251 (j 0.93) · Shops 50 → 52 · ↩. STUDY: Shops 50 → 48.
6. **Pauline Till · Chamber of Shops** (fee, other: Allotment). "Let Till's Teas sponsor the clock tower. It would chime TILL'S TEAS on the hour." (80)
   SIGN: +605 (j 1.12) · Shops 50 → 51 · Allotment 50 → 46. STUDY: Allotment 50 → 51. (As scripted paper 3 it pays a fixed +60.)
7. **Rodney Spinwell · Chief of Staff** (vanity, a trap). "A bronze statue of you, Mayor, pointing at something important. Anything at all." (80)
   SIGN: −1,050 (j 0.97) · Bus 50 → 49 · Shops 50 → 49 · Allotment 50 → 49. STUDY: No change.
8. **Gwendolyn Abacus · Treasury Clerk** (ministry request). "The Potholes Office asks for a second shovel. The first one is tired." (69)
   SIGN: −458 (the exact price of level 7 → 8) · Potholes Office 7 → 8 (+8/s before multipliers) · Bus 50 → 51. STUDY: Bus 50 → 49.
9. **Hilda Marrowby · Allotment Society** (ribbon). "The new bandstand is finished. It needs a ribbon cut by somebody important. You'll do." (86)
   SIGN: −270 · Allotment 50 → 53. STUDY: Allotment 50 → 49.
10. **Dorothy Quayle · applicant** (application). "I apply to be Minister for Potholes. References: 'She found one.'" (65)
   SIGN: Appoint Dorothy (Potholes Office ×1.25) · Bus 50 → 51. STUDY: She applies again in 30 papers.
11. **Bert Trowel · shop steward, Allotment Society** (strike; Allotment at 18). "MORE BISCUITS. Also fewer committees. Mostly biscuits." (54)
   SIGN "Biscuits for everyone": −360 · Allotment 18 → 28 · the strike ends. STUDY "Let them picket": the strike runs 8 more papers, then Allotment +6.
   Below the paper, in the goal line: "Watch ad: Send the Biscuit Van (ends it now)".
12. **The Dithering Daily Drizzle** (scandal; gossip 5/5). "MAYOR'S GOOSE GIVEN OWN PARKING SPACE. Goose declines to comment." (65)
   SIGN "Apologise on the steps": Bus 50 → 47 · Shops 52 → 49 · Allotment 46 → 43 · Gossip 5 → 0. STUDY "Say nothing": taxes ×0.8 for 10 papers, no call meanwhile, then Gossip 0.

A campaign paper, for the format: **Rodney Spinwell** "Judge the Hilltop Prize Hedge Show. Say nothing about the leaning one." (70) SIGN: −810 · HT 48.6 → 52.6 · MW 51.2 → 50.2. STUDY: No change. The rally: "Hold a rally at the bandstand. Bring the big scissors. Cut something." (69) SIGN: −1,080 · Shops 44 → 48 (the lowest club; 4 × f+ 1.12 = 4.48, rounded to 4). STUDY: No change.

### 7.6 Two follow-up chains

Effects come from archetypes like any paper; shown here at mood 50. Each ending becomes a clipping.

**A. "The Basket"** (set-up: paper 4).
- Signed, then 10 to 14 papers later, Lionel Sash: "About the basket: the goose at the bottom was not fruit. It would like an office." (81) Basket: SIGN Shops +2 · Gossip +2 · ↩; STUDY Shops −1. Clipping on STUDY: "GOOSE RETURNED TO SENDER, WHO DENIES OWNING A GOOSE".
  - Signed, then 12 to 16 later, Rodney Spinwell: "The goose now chairs your Tuesday meetings. Staff say it is decisive." (69) Swap (Bus, other Shops): SIGN Bus +4 · Shops −4. Clipping "GOOSE NAMED DEPUTY; 'HONK,' SAYS DEPUTY". STUDY Bus −3 · Shops +2. Clipping "GOOSE RETIRES TO DUCK POND, CITES DIFFERENCES".
- Studied, then 10 to 14 later, Lionel Sash: "No hard feelings. Please accept this smaller basket. It is one grape." (69) Basket: SIGN Shops +2 · Gossip +2. Clipping "MAYOR ACCEPTS GRAPE". STUDY Shops −1. Clipping "MAYOR REFUSES GRAPE. GRAPE DEVASTATED".
The bribe never pays: no branch holds money.

**B. "The Marrow"** (set-up: paper 2).
- Signed, then 8 to 12 later, Hilda Marrowby: "The marrow, now a Freeman of the town, wishes to address the council. At length." (80) Committee: SIGN −S · Allotment +2 · ↩; STUDY Allotment −2. Clipping "MARROW'S SPEECH CANCELLED; MARROW SILENT".
  - Signed, then 15 to 20 later: "The marrow has been elected chair of the Allotment Society. I am fine about it." (79) Treat: SIGN "Send it a sash" −S · Allotment +3. Clipping "MARROW TAKES THE CHAIR (IT WAS ALREADY ON IT)". STUDY Allotment −2 · Gossip +1. Clipping "SOCIETY SPLITS OVER VEGETABLE".
- Studied, then 12 to 16 later: "The marrow took your refusal badly and has gone soft. Will you visit it?" (72) Treat: SIGN −S · Allotment +3. Clipping "MAYOR VISITS SOFT MARROW". STUDY Allotment −2 · Gossip +1. Clipping "MARROW: NO COMMENT".

### 7.7 What to write for version 1, and why it is enough

**Demand.** Arrivals set the pace at every hand from 4 to 9 s: 5 papers a minute, about 285 in hour 1, 570 in hours 2 and 3. While papers wait, the desk is idle about 6 s of every 12 at 6 s (8 s at 4 s, 3 s at 9 s): the time for the Ledger. When none waits, the player buys, assigns, reads the poll or the scrapbook, or closes the app. The draw is about 6 % events, 10 % requests, 4 % campaign, 10 % follow-ups, 16 to 28 % templates, the rest comic (about 54 % as mayor, 48 % governor, 42 % president).

| Kind | Count | Who |
|---|---|---|
| Hand-written comic papers | 480: mayor 120, governor 160, president 160, any office 40; about 30 % of mayor and governor papers tagged `portable` | writers 1, 2, 3 |
| Follow-up chains | 40 (12 / 14 / 14), about 100 follow-up texts, 80 clippings | writers by office |
| Routine papers | ministry requests 24 frames with a {ministry} slot; ribbons 23 (one per ministry and Grand Project) + 6 generic; applications 12 + 12 returns; settlements 14 (2 per club) + 7 strike-end lines; scandals 20 front pages + 3 apologies; campaign 42 (14 per office with a {district} slot); rallies 9; scripted 6 | writer 3 and the editor |
| Templates | 30 frames ("The {club} asks for a {adjective} {object} outside the {place}") over 24 word lists of 30 entries | editor |
| Lines | 16 resignations, 15 rivals, 30 election-night lines, 60 headlines, 10 away-report lines, 24 monuments, 5 Grand Projects, 10 twists and 45 pair names, 6 opening captions | editor |

**Hour 1 (gate H7):** mayor stint about 130 decisions, about 70 comic, from 120 + 40 = 160; governor stint to minute 60 about 160 decisions, about 77 comic, from 160 + the unused any-office and portable papers. No hand-written text twice, with a margin of about 2 to 1, at 4, 6 and 9 s alike (the pace is arrival-bound).

**Hours 2 and 3:** governor to about 1:25 needs about 70 more from the 83 left; president to 3:00 needs about 180 from 160 + about 15 any-office + about 25 portable. At most a few repeats, shown in the compact form (aim ≤ 2 % of hand-written draws).

**Who writes:** package W (9.2), 3 writers and 1 satire editor from hour 0. Writers choose only words, visitor, archetype, clubs, subject and butt; the engine supplies every number. The editor reads every line, owns the lists and rewrites texts the bot flags as dead decisions (H8). Data: `scripts/content/office/*.json`, merged by `build-office.py`. If writing falls short at the numbers gate, templates rise to 35 % and τ toward 14 s, and the lead reports the shortfall rather than shipping weak jokes.

### 7.8 The automatic safety check

`scripts/content/office/satireLint.ts` runs in `npm run validate` for mode decree and fails the build, over every paper, every template filled with every word-list combination, every name, slogan, headline and line, the UI strings and the store text, on:
1. A word from the deny lists in `scripts/content/office/` (whole word and stem, case-insensitive): `deny-places.txt` (countries, demonyms, capitals, regions and states, about 600); `deny-people.txt` (surnames of heads of state and government since 1900 and famous current politicians, about 1,500, compiled offline from a public list using generic terms only); `deny-movements.txt` (real parties, movements, ideology words and colour labels used as party names: republican, democrat, labour, tory, liberal, conservative, socialist, communist, fascist, left-wing, right-wing, and so on); `deny-subjects.txt` (BRIEF.md's hot-button subjects and their stems: religion and faith words, ethnicity, nationality, migration, border, gender and sexuality words, abortion, guns and weapons, war, army, soldier, terror, police, prison, drugs and alcohol, disease and epidemic words, disability words, disaster); `deny-tone.txt` (profanity, violence, "bribe", "corrupt", "rigged", "dictator", "coup", "official", "fake news", "vote now", "ballot", "Mr President", "El Presidente", "lobbies", "Oval Office", "White House"); `deny-brands.txt` (real currencies and news brands); `deny-games.txt` (other games' cast and place names: Reigns, Arstotzka, Sordland, and so on).
2. A capitalised token not at a sentence start and not in `names.json` or the common-word list.
3. A 4-digit year, a URL, "#", or "election" followed by a number.
4. Lengths and fit as 4.2; at most 4 effects per outcome.
5. A subject tag outside the closed list (ribbons, signage, statues, ducks, geese, weather, committees, food-shows, clocks, potholes, hats, fountains, bandstands, gardens, buses, kites, hedges, harbours, inventions, ceremonies, portraits, paperwork, vanity); a missing butt tag or butt = club (the butt is self, office or object).
6. Shape: both outcomes identical; a refuse that costs money; a basket with money; traps above 15 % per office; a follow-up whose set-up is missing or does not name the choice it follows; clubs that do not exist in the paper's office.
`allow.json` takes exact phrases only, each with the editor's reason. A person reads every paper once and signs `RATING-NOTES.md`: the lint catches words, not tone.

### 7.9 Store page

- **Title: "Flick of the Pen"** (16 characters). It names the verb (a flick) and the object that signs; no civic word; no "X: Y" shape; no word shared with the three other titles; reads as comedy beside the subtitle. Risk: a common idiom, so a book or an app may hold it; the name-search step checks it first.
- Alternative 1: **"Sign & Shred"**: the clearest verb pair, but the refusal now goes into a drawer, not a shredder, so the title would promise a destination the game lacks, and it crowds into e-signature and shredder utilities. It stays a candidate only if the lead turns the drawer into a shredder.
- Alternative 2: **"Rubber Stamp Republic"**: the satirical phrase aims the joke at the player's office, but no stamp exists in the game and the phrase evokes the border-inspection game's stamping; "Republic" leans civic.
- The search uses generic terms only ("flick of the pen game", "sign and shred game", "rubber stamp republic game") and records results in `games/high-office/store/NAME-SEARCH.md`.
- Subtitle (30): "Funny desk, mayor to president". Category Games/Simulation.
- Description, first line: "An invented country and a comedy desk: flick each paper up to sign it, or down into the drawer marked FOR FURTHER STUDY." "Idle" and "tycoon" appear only further down; the listing says plainly that ministries earn while you are away and that terms move only when you read.
- Keywords: desk, mayor, governor, president, papers, sign, office, town hall, funny, satire, decisions, cartoon.
- Icon: a pale paper flying up off green baize toward a brass wire tray with a violet pen flourish; a tiny goose with scissors in a corner. No flag, seal, eagle, ballot box or building.
- Screenshot template "blotter": the shot of the game sits inside a green-baize desk blotter with leather corners; the caption is typed on a small slip under a brass paperclip at the top left. (Pizza: framed card with a sauce wave below; Orbit: monospace band on top; Lantern Row: hanging paper tag below.)
- Review note: "All countries, parties, politicians, companies and newspapers are fictional. No real people, parties, flags or current events; no user-written text is shared. Elections are computed from visible numbers; no ad or purchase is offered during a campaign, and no product changes a vote."
- Rating: answer honestly (comic choices without moral weight; no gambling; no contests), expected 4+ or 9+, raised by hand to 13+ under policy.md's house rule. Play: Government apps declaration "not a government app". Territories: all except mainland China and Vietnam.

---

## 8. The balance bots, their targets, and the order of work

### 8.1 Order of work: rules and bot before any screen

1. Hour 0: the skeleton commit (9.2).
2. Hours 0 to 3: P2's numbers prototype in `scratchpad/office/proto/` (not committed): the archetype table with f± sizing, the count, sympathy, strikes, gossip, offline, on one office, then three, with every bot of 8.2, on a frozen content of 60 papers. **Finding one to settle first:** the election design's own sketch had always-sign winning 63 % of terms; the target is 45 % or less. Fix it inside the archetype table first (the nets per paper and the money costs of signing), then the vanity share, then the rival's pull; if it still misses, the rule change goes to the lead before any engine code. Every finding goes to the lead as a decision, never quietly into the rules.
3. Hours 0 to 4: the rules and their tests on frozen fixtures (`src/engine/fixtures/decree.ts`), so tuning never turns a rules test red.
4. From hour 3: `src/engine/decree/bot.ts` on the real engine, event to event (no Node imports; in `WEB_ONLY`).
5. `scripts/content/decree-bot.ts` (CLI) and `build-office.py`, which writes game.json only after every hard target passes on the named seeds 12345, 4, 99, 7 and 2026; tuning uses seeds 101 to 115; results are pass counts, never one median (merge M30).
6. Screens build in parallel against fixtures with no number of their own, and are wired to tuned data only after step 5.

### 8.2 Bots

Hand model: one decision 6 s after the paper lands (also 4 s and 9 s); a purchase 1.5 s; a sheet 3 s; election night 12 s (3 s skipped). No bot sees a hidden number.

1. **Reader** (the reference) scores each outcome o in seconds of B:
   V(o) = money/B + 0.012 × ΔA/M(A) × H × (I/B) + Σ_d 60 × Δshare_d × max(0, 1 − |share_d − 50|/8) × (day/D) − 10 × Δgossip − 120 × [starts a scandal] − 120 × [starts a strike] + 60 × [ends a strike] + Δrate × H/B + 300 × [appoints a minister],
   with ΔA = Σ_g W_g × shown_g, Δshare_d = Σ_g w_{d,g} × shown_g (+ campaign points), H = min(600, 12 × (D − day)) s. It takes the higher V; when sign is unaffordable it waits if the shortfall is ≤ 20 s of I and V_sign − V_refuse ≥ 15, else refuses. It buys by `advice()`, calls at majority + 1 (or at day ≥ 0.85 D with a majority), moves up when allowed. Its constants are reported, never tuned to targets.
2. **Always-sign**: signs when affordable, else waits up to 20 s, then refuses.
3. **Always-refuse** (always FOR FURTHER STUDY).
4. **Random**: a seeded coin per paper; refuses when sign is unaffordable.
5. **Money-only**: maximises the money effect. **Mood-only**: maximises ΔA.
   Bots 2 to 5 buy, call and move exactly as the reader does: only the paper choice differs.
6. **Passive**: 5 sessions a day of 8 minutes as the reader; takes the away ad.
7. **Check-in**: opens every 4 h, decides the waiting tray as the reader, buys for 2 minutes.
8. **Idle**: never acts.
9. **Ad-everything**: the passive bot with every product and every ad taken as soon as offered.
10. **Adversaries** (the reader plus one habit): device clock +4 h, −4 h, +4 h; reload after every draw and after every decision; hoard the tray until full; quit during election night and reload; close the app during every strike and scandal; flick at 1 s without reading.

### 8.3 Hard targets (every seed; the build fails on a miss)

- **H1 Printed equals applied.** 0 differences between shown and applied effects over every decision of every run; 0 clamps (the lemma of 2.7); no stored paper field changes after its draw.
- **H2 The poll is the count.** 0 differences at every election; the announcement order is 2.10's.
- **H3 Determinism.** The same seed gives a byte-identical trace at 10 Hz and event to event; the reload adversaries' traces equal the reader's.
- **H4 Offline.** The closed form equals event stepping; away time changes no mood, gossip, strike, scandal, day or poll; the clock forward, back and forward again pays once.
- **H5 Coins.** Dibs enter only through the tick, paper money gains, the away report, Check the Sofa and the transition fund; cash ≥ 0 always; refusing never costs money.
- **H6 No dead end.** Refuse is always available; every strike and scandal ends within its paper count; ministry 0 always earns. The 2.11 bound ≤ 9 holds for the tuned values. Every bot that decides papers wins an election within 6 terms of its first loss at a seat (measured, 15 seeds). From the always-sign, always-refuse and random bots' states at 2 h, the reader wins the next election in at least 13 of 15 seeds.
- **H7 Text.** 0 hand-written texts seen twice in hour 1 at 4, 6 and 9 s (15 seeds); repeats in hours 2 and 3 at most 2 % of hand-written draws; no template frame within 20 papers of itself; the satire lint passes.
- **H8 It is a real choice** (the "hundredth paper" test). For each paper the reader decides in hours 2 and 3, its choice is re-evaluated for the same text in the states of its 10 previous decisions (re-sized by 2.7); at least 30 % of texts get both choices. The reader signs 40 to 65 % of papers and differs from both money-only and mood-only on at least 25 %. The per-text report lists texts with one side best in every state.
- **H9 Reading beats habits** (paired over 30 seeds, with the noise band of the reader against itself at ±0.01 s shown): election wins: reader ≥ 85 %, always-sign ≤ 45 %, random ≤ 35 %, always-refuse ≤ 25 %; time to president at least 1.5 × the reader's for each of the three habits and 1.2 × for money-only and mood-only; Name Recognition at 3 h at most 0.6 × the reader's for the three habits.
- **H10 Money cannot reach the vote.** Ad-everything against the passive bot, 30 paired seeds: the share of elections won differs by 3 points or less, and the time to president by 15 % or less. The reader finds sign unaffordable on at most 5 % of papers (so ad money rarely changes a decision).
- **H11 Number range.** The largest number over a 30-day run of the passive bot (and a 60 h continuous reader) stays below 1e27.
- **H12 No gossip spiral.** Reader from the always-refuse state at 2 h: approval from below 35 back to 50 within 80 papers in at least 13 of 15 seeds (the lead sets the band after the first run).

### 8.4 Aims (reported; the lead sets each band once after the first tuned run, as merge M2 and M54)

- Opening: first paper decided by 10 s; first purchase by 0:15; in minutes 0 to 10 a paying moment (a purchase or a money effect) at least every 30 s at the median and the longest wait with nothing to do 20 s or less; at least 20 purchases.
- Pace at 6 s: first election 11 to 15 min; governor 24 to 34 min; president 75 to 110 min. At 4 s and 9 s within ±10 % (arrival-bound by design).
- Desk: decisions a minute about 5 at all three hands; tray empty 35 to 55 % of governing time at 6 s; tray full at most 10 % at 9 s.
- Tension: the reader's median winning margin 1 district; at least 2 districts within 5 points of 50 in half its elections; first-election win in at least 13 of 15 seeds.
- Strikes and scandals: the reader at most 1 strike an hour and 1 scandal every 2 h; always-refuse at least 2 strikes an hour; always-sign at least 1 scandal a term.
- Money: paper money gains 10 to 25 % of all dibs in hours 0 to 3; the reader spends 20 to 35 % of its income on papers, always-sign 45 to 70 %.
- A new office's income passes the old one's final income within 4 to 8 minutes.
- Offline: 1 h away with the ad pays 0.3 to 0.6 of 1 h of active income at 30, 60, 120 and 180 min (also with Long Lunch). Passive: governor on day 1, president on day 2 or 3, presidential term 15 to 25 by day 21.
- Novelty: something new every 3 min in minutes 0 to 30 and every 15 min in hours 1 to 3 (a ministry, a minister, an office, a chain ending, a monument, a Grand Project, a twist).

Knobs `build-office.py` may move, inside the ranges of section 2: S per office, the ministry step, open costs, cost growth; τ, the away interval and rate; D and the call fraction; R; the archetype shares and ±1 on each base effect; the money tier seconds; the template shares; the request interval; G_max; m_N; Y; the vanity price and factor; the transition fund. Knob order per failing target: habits (archetype nets, then money tiers, then vanity share, then R); pace (NR requirements, then D, then costs); elections (R, starting moods, campaign stakes); text (template share, then τ). Mood bases beyond ±1 are content: the editor changes them from the bot's per-text report, never the tuner. No rule is changed after screens exist without the lead.

---

## 9. First version and later

### 9.1 In the first version

Three offices with 4, 6 and 8 ministries plus 5 Grand Projects; 7 clubs; 5, 7 and 9 districts; 12 ministers; 480 comic papers, 40 chains, the routine papers, 30 templates; strikes, scandals, follow-ups, the campaign with the rally, election night; 10 twists and their 45 pairs; 24 monuments; the Office wall and the scrapbook; the Standing Order; 4 products and 5 rewarded ads; the tap-tap path; own sounds and two music loops; web presets `?preset=fresh|early|mid|late` from bot states; dev views `decree-art` (the contact sheet in greyscale, every face distinct at 44 pt, the brick share) and `decree-layout`.

### 9.2 Work packages for about eight engineers, with files owned and order

**Hour 0 (P0, one engineer, 30 to 60 minutes, before anything else):** `src/engine/decree.ts` (types and every public signature, bodies that throw "not built yet"); the mode wiring (P3's shared changes below); `src/config/schema.decree.ts` with the starting values of 2.2; a placeholder `games/high-office/` (PLACEHOLDER in its description) so the web preview starts; `src/ui/decree/strings.ts` with one section per package; the hint target keys in `src/ui/hints/targets.ts`; `docs/design/office-build-plan.md`.

Morning (no screen uses a number before P2's gate):
- **P1 Rules (2 engineers):** `src/engine/decree/` (`types`, `params`, `create`, `draw`, `size`, `decide`, `tick`, `strike`, `scandal`, `followup`, `term`, `count`, `move`, `offline`, `advice`, `twists`, `hints`), `src/engine/decreeMode.ts`, `src/engine/fixtures/decree.ts`, the engine tests of 10.2; `src/engine/decree.ts` and `schema.decree.ts` after hour 0.
- **P2 Prototype, bot and tuning (1, from hour 0):** the prototype; `src/engine/decree/bot.ts`; `scripts/content/decree-bot.ts`; `scripts/content/build-office.py`; `src/config/decree.content.ts` (generated); `games/high-office/game.json` (generated only); the decree hook in `scripts/validate.ts` (additive: `g.mode === 'decree'`), running the gates of 8.3.
- **P3 Wiring, tooling, store (1), every shared change additive:** `ModeId` (`src/modes/contract.ts`); `MODES` (`scripts/lib/games.js`); the `mode` enum and the opaque `decree` block (`src/config/schema.ts`); `FxMode` (`src/services/fx/catalog.ts`) and the decree catalogue in `scripts/lib/fxCatalog.js`; `scripts/lib/modes.js` (`MODE_FOLDERS.decree`: `src/modes/decree`, `src/ui/decree`, `src/engine/decree`, `src/engine/decree.ts`, `src/engine/decreeMode.ts`, `src/engine/fixtures/decree.ts`, `src/config/schema.decree.ts`, `src/config/decree.content.ts`; `NODE_ONLY` + `catalog.decree.ts`; `WEB_ONLY` + the bot, the fixtures, `presets.web.ts`, `devViews.web.ts`; `THEME_WORDS.decree`: mayor, governor, ministry, ward, gossip, scandal, allotment, dibs, each only if `--words` finds no literal in shared or family files); `scripts/lib/fingerprint.ts` (`office-ladder`) and spam.md's row; `src/modes/decree/` (`index.tsx`, `actions.ts`, `fx.ts`, `soundKeys.ts`, `presets*.ts`, `devViews*.ts`); `src/modes/entries.test.ts`; `scripts/content/office/satireLint.ts` (the code; the lists are W's); owner of `src/ui/hints/targets.ts` and of `src/ui/decree/DecreeShell.tsx`, whose named slots P6 to P8 mount into; `games/high-office/store/` (`fingerprint.json`, `REVIEW-NOTES.md`, `RATING-NOTES.md`, `NAME-SEARCH.md`, `releases.json`, `store.config.json`), `scripts/content/office-store.json`, the name search, `check:bundle` for all four games.
- **P4 Art (1):** `src/ui/decree/art/` (palette, the bust part system and its 48 faces, the player's portraits with ageing, desk props, the wire tray stack, the drawer and its growth stages, the door, the sticky note, the paperclip pointer, club and effect icons, district maps as paths, election-night cut-outs, monuments, the Office wall), `bakeAtlas`, its README, the icon.
- **P5 Sound (1):** `scripts/audio/recipes_office.py`, `render_office.py`, `office_music.py`, `games/high-office/assets/sfx/`, `src/services/fx/catalog.decree.ts`; the cross-key `compare.py` run (same-key results unchanged).

From hour 2, against fixtures:
- **P6 Desk and flick (1):** `src/ui/decree/layout.ts` (+ test), `src/ui/decree/paperMetrics.ts` (+ test), `src/ui/decree/desk/` (canvas, paper drawing, the responder, tap-tap, trays, drawer, door).
- **P7 Bars, sheets, views (1):** `src/ui/decree/hud/` (top bar, club strip, term ribbon, goal line, bottom row, their metrics), `sheets/` (Ledger, Cabinet, Poll, away report, move, result, shop, settings), `views/` (Election Night, Office, face picker); steward of `strings.ts`'s structure.
- **P8 Hints, platform, QA (1):** `src/ui/decree/hints.ts` (the paperclip as `parts.HintPointer`), `src/ui/decree/back.ts` (Android back over `uiState.ts`), the loading screen, overlay registration, the device checks of 10.1.
- **W Writing (3 writers and 1 editor, its own package, from hour 0):** `docs/design/office-style.md` (the style sheet, first), `scripts/content/office/papers.mayor.json`, `papers.governor.json`, `papers.president.json`, `papers.any.json`, `chains.json`, `routine.json`, `templates.json`, `wordlists.json`, `lines.json`, `names.json`, `deny-*.txt`, `allow.json`; the sensitivity read signed in `RATING-NOTES.md`. Writer 1: mayor and any-office; writer 2: governor and the county names; writer 3: president, chains, routine papers; the editor: templates, lines, lists, every read.

After P2's gate: numbers into screens, reviews, fixes. The first three games do not change: no file of `games/pizza-empire`, `games/space-miner`, `games/night-market`, `src/modes/sim|haul|merge`, `src/ui/sim|haul|merge`, `src/engine/haul*`, `src/engine/merge*` is edited; `modeRegression.test.ts` stays green with its recordings untouched; the earlier fingerprint reports and compare.py's same-key results stay byte-identical (their generated bundle reports excepted, BRIEF.md).

### 9.3 Later

More papers per office and chains of 4 steps (content updates); a second rival per office; the manifesto, if a version is found that ad money cannot reach; minister perks; tablet layout; translations, each with a local read first. Never: energy, paid random items, a sold minister, a purchase or ad that moves a mood or a vote, countdown offers.

---

## 10. Acceptance checks and tests

### 10.1 What anyone can see (web preview, `GAME=high-office`; then a phone)

1. The first three minutes play as 3.1; the first paper is decided within 10 s.
2. Flicking up past 90 pt signs, down refuses; a short fast flick of 24 pt counts; a slow short drag springs back; a second finger cancels; tap-tap works; the paper never moves sideways or tilts.
3. On 30 consecutive papers, every number printed on a strip is the value applied (the treasury, the club numbers on tap, the gossip chip).
4. A strike and a scandal each show their warning on the outcome before the choice, and each ends by its free exit within its paper count.
5. The poll before a call equals the count; districts are announced safest first; a loss keeps every ministry, level and minister.
6. No ad button or shop is reachable from the call to the end of election night.
7. Both sizes at font scale 1.0 and 1.3: nothing clipped, overlapped or wrapped on the paper, the bars or the bottom row.
8. Android back closes layers in 4.4's order and leaves only from the bare desk.
9. Away for 1 h: the report shows earnings and waiting papers; the ad adds half; the device clock forward and back pays once; no mood or counter changed.
10. A person fills `fingerprint.json` `human` against all three games and does the listening check; the greyscale contact sheet tells every face apart.

### 10.2 Tests that must exist (vitest)

Engine (`src/engine/decree*.test.ts`, on fixtures only):
- `size.test.ts`: the no-clamp lemma over every m from 0 to 100 and every Δ from −10 to 10 (and the fixed +10 and +6); money frozen at the draw; moods frozen at landing.
- `decide.test.ts`: applied equals shown on 10⁵ random states; sign refused when short; refuse never costs money; the order of per-decision rules.
- `draw.property.test.ts`: the draw order; no follow-up without its set-up; no hand-written repeat while an unseen eligible one exists; template spacing; petitioner weights; reload re-rolls nothing.
- `strike.test.ts`, `scandal.test.ts`: triggers, warnings, free exits within their counts, re-arming, no gossip from approval, no second scandal, the term-end rule.
- `term.test.ts`: call conditions; campaign set-aside; campaign papers not days; halfway reset; asideTray returned.
- `count.test.ts`: share formula, ties at 50.0, the announcement order; the poll equals the count; the sympathy bound of 2.11 from the params.
- `move.test.ts`: the resets and carries of 2.12 exactly; `canPrestige` only after a win with NR.
- `twists.test.ts`: each twist and each of the 45 pairs composes; exactly one new thing per presidential term to term 61.
- `tick.split.test.ts`: tick(a + b) = tick(a) then tick(b) over random splits with arrivals and a full tray.
- `offline.test.ts`: closed form equals stepping; cash unchanged until granted; caps; clock jumps pay once; carry adds two short absences.
- `coins.test.ts` (the five sources), `advice.test.ts` (the bot and the goal line agree), `determinism.test.ts` (byte-identical 1 h trace).
- `decreeMode.test.ts`: create; reconcile from a broken save; save tag `decree1`; `config` rejects an invalid block; `offlineAdMultiplier` 1.5; `roundPayout`; `entitle` for the tray and Long Lunch.

Shared and tooling:
- `modeRegression.test.ts` unchanged and green; `entries.test.ts` pins the decree entry (`Shell`, `Loading`, `parts` with `Icon` and `HintPointer`, `hints`, `engine`, `presets`, `soundKeys`).
- `fingerprint.test.ts`: `office-ladder` accepted; earlier reports byte-identical; high-office against each game 8 of 8 must differ or pending and at least 15 known or pending.
- `bundleRules.test.ts`: no decree file in another game's bundle and no other mode's file in the decree bundle.
- `layout.test.ts` and `paperMetrics.test.ts`: zones add up at both sizes; the paper's rows at s = 1.0 and 1.3 fit 405 and 461; chips fit two per row; every bottom-row target is at least 44 × 44.
- `satireLint.test.ts`: a planted real country, surname, party word, year, URL and banned subject each fail; an allowlisted exact phrase passes.
- compare.py cross-key against all three games; store checks (title, subtitle, keywords, `office_` prefix, kind multiset).

### 10.3 Before declaring done

`npm run typecheck`, `npm test`, `npm run validate` (with the decree gates and the satire lint), `npm run lint:worklets`, `npm run check:bundle` for all four games, `npm run check:bundle -- --export` before a release; look at the game in the web preview at both phone sizes.

---

## 11. Lead decisions

(Empty: the lead fills this section. A decision here overrides the text above where they differ.)
