# High Office: design of the desk game (mode `decree`)

Status: revision 2, 23 November 2026: the "election" design with the decision mechanics of "desk" and the judges' grafts, under the lead's ruling, revised once against three reviews (builder, store reviewer and player, satire editor). Points decided differently, with the reason: 1.3. **Section 11 (the lead's decisions) overrides the body wherever they differ.**

Game folder `games/high-office`; mode (new) `decree`; save key `save:high-office:decree1`; store title (proposed, 7.9) "Proudly Adequate".

Conventions:
- "pt" is a layout point; "s" a second of the play clock (the shared `stats.playSeconds`, which never moves while the app is closed); "dibs" the currency, in the shared `cash`.
- A **day** is one decided paper of the term; campaign papers and budget slips are not days.
- B is the **base income** (2.4); paper prices are in seconds of B.
- (tune) marks a starting value only `scripts/content/build-office.py` may move, inside its range, to meet section 8; anything else is a rule.
- Times and incomes in 2.13 and 3 come from a rate model (`scratchpad/office/proto/rev2/econ.py`), not the prototype; `build-office.py --table` replaces them. Section 8 is the only gate. Prices are exact.
- Every amount of dibs shown or paid goes through `roundDibs` (merge M19: below 1,000 half up to a whole dib, from 1,000 three significant figures).
- P, O, L: Pizza Empire, Orbit Haulers, Lantern Row.

---

## 1. The game and its fingerprint

### 1.1 The game in five sentences

1. You are the new mayor of Dithering-on-the-Dawdle in the invented Republic of Middling ("Proudly Adequate"), and every twelve seconds a visitor lays a paper on your desk: a bus spotter, a pumpkin grower, a lobbyist with a suspicious fruit basket.
2. Each paper prints both outcomes in exact numbers ("Vegetables 50 → 54 · −946"); push it up into the out-tray to sign, or pull it down into the drawer marked FOR FURTHER STUDY to refuse.
3. Ministries (the Town Clock Office, the Potholes Office, Benches & Bandstands) collect taxes every second, also while you are away; when the desk is empty the Treasury Clerk slides a budget slip onto it, and a flick up raises a ministry; the approval of named hobby clubs multiplies every dib.
4. A term is a fixed number of papers; from 60 % of it you may call the election, the poll board shows exactly how each ward would vote today, and election night announces the wards safest first.
5. A win carries your Name Recognition and cabinet to a bigger office (Governor of Upper Wobbling, then President) once your ministries also hold that office's record; a loss costs nothing built: you serve on as Acting Mayor, and the winner resigns over a hobby.

### 1.2 Fingerprint along the 19 dimensions

Declared in `games/high-office/store/fingerprint.json`. P3 adds **`office-ladder`** to `VOCABULARY.progression_structure`: "a short fixed ladder of offices, each entered only by winning a vote at the end of a term of decisions; a lost vote repeats the term in place; the top office continues as repeated terms" (`location-levels` is false, offices are never bought; `endless-single` and `seasons` are false), and updates spam.md's row.

| # | Dimension | High Office | P | O | L | vs P / O / L |
|---|---|---|---|---|---|---|
| 1 | core_verb [M] | swipe/aim: a paper pushed up into the out-tray or pulled down into the drawer | tap-target | drag/route | place/arrange | differs ×3 |
| 2 | production_topology [M] | parallel-generators (4, 6, 8 + 5 ministries) | linear-chain-with-transport | network-routes | spatial-grid | differs ×3 |
| 3 | money_moment [M] | auto-tick | customer-pays | sale-at-depot | contract-complete | differs ×3 |
| 4 | main_screen_layout [M] | single-object-focus (one paper, one desk) | side-cross-section | top-down-map | grid-board | differs ×3 |
| 5, 6 | art, store text [M] | 0 % art (drawn in code); under 10 % text | | | | differs ×3 |
| 7 | icon_and_screenshot_template [M] | "signature" template, light icon (7.9) | | | | pending ×3 (person) |
| 8 | bundle_foreign_content [M] | none | | | | pending ×3 (report) |
| 9 | progression_structure | office-ladder | location-levels | sector-map | seasons | differs ×3 |
| 10 | prestige_model | new-location-carryover | reset-for-currency | reset-for-currency | seasonal | differs ×3 |
| 11 | active_skills_events | {strike, scandal, follow-up-return, ribbon-cutting, campaign-week, election-night} | Jaccard 0 | 0 | 0 | differs ×3 |
| 12 | meta_systems | {in-tray, ministers, follow-ups, gossip, elections, scrapbook, vanity-shelf, prestige} | 1/15 (3/13 loosely) | 1/15 | 1/13 (3/11) | differs ×3 |
| 13 | meta_screen_layouts | clothbound ledger, framed cabinet photograph, pinned ward map, chalk tally board, office wall | | | | pending ×3 (person) |
| 14 | art_style | flat-vector, "baize-and-ink" | warm-cream | deep-space-cold | lantern-night | differs ×3 |
| 15 | character_kind | humans | humans | robots | animals | SAME / differs / differs |
| 16, 17 | audio, tone | 0 % audio (own recipes, cross-key gate); "deadpan-memo", under 5 % shared strings | warm-playful | dry-radio-chatter | lantern-calm | differs ×3 |
| 18 | keyword_overlap | desk, mayor, governor, president, papers, sign, town hall, funny, satire, decisions, cartoon, clerk | | | | differs ×3 |
| 19 | release_gap | ≥ 14 days after Lantern Row's last | | | | pending ×3 |

**Count after this revision.** Against P: 8 of 8 must; 18 of 19 planned (only 15 the same; 14 known now, 7, 8, 13 and 19 pending); planning figure **17**, because a person may read 9 as "probably same"; floor 16 if 13 is also ruled "restyled". Against O and L: 8 of 8, 19 of 19 planned, 15 known, floor 18. Every pair stays at or above 15.

**The shared "should" (humans, P only).** P draws round chibi heads with big eyes on small full bodies, thick dark outline, in a kitchen. Ours are editorial-cartoon busts of adults: long oval heads (1.4 × taller than wide), dot eyes under heavy brows, head and shoulders in an oval photo clipped to the paper (full figures only on election night, paper cut-outs with heads 1/6 of the body), a thin warm-brown line of varying width, one-direction hatching over two flat washes. Nobody walks, carries or serves.

**The idle layer is ours** (store review): growth happens on the desk through slips flicked like papers; the Ledger is a read-only book with one untaught "Raise" per row; milestones are storeys every 12 levels, not 10/25/50/100; opening costs step ×16; ministers bring a printed desk rule, not a multiplier card; aim (8.4): at least 70 % of thumb actions in minutes 0 to 10 are flicks.

Validate's other checks: no "Empire", no "X: Y" title; "idle" and "tycoon" only in the description; ids start `office_`; kind multiset {unlock, cosmetic, cosmetic, skipAds} differs from P's, O's and L's (duplicates counted; argued in REVIEW-NOTES).

Weakest claims, argued in `REVIEW-NOTES.md`:
- 1 against Orbit's freighter swipe (its money step): ours teaches refusal first, by a pull; no arming click; from 40 pt a signature writes itself or the drawer creaks open; the tutorial hand is a pen. Against drag (O, L): nothing is carried to a chosen place.
- 1 against the well-known card game: a document, not a portrait card; vertical, no tilt; both outcomes printed; 3, 5 or 7 clubs, never four meters; nothing ends a run.
- Against Paperwork Inc (papers approved or denied in a growing office, bribes punished in an audit): no printer, conveyor, audit or bribe slider; a basket never pays and always costs; growth comes from taxes. "Audit", "office empire", "processing" and "document" stay out of store text and strings (7.8).
- 9 and 10 against P: P buys venues; an office is entered by a vote, with a level record as a second condition.

### 1.3 Points decided differently, with the reason

1. **Refuse goes into the drawer FOR FURTHER STUDY**, not a shredder: funnier, a running gag, and shredding read as a cover-up.
2. **The rally is a campaign paper** paid from the treasury, so every mood change is a decided paper (ruling 7). **No paper has a day cost** (it would help a leader, ruling 9).
3. **A rival's pull R** (7 / 9 / 11) is in the count; without it every club at 50 holds every district.
4. **Money has a job on the ladder** (builder, blocking): standing needs Name Recognition *and* a record of ministry levels; ad and product money then only saves time.
5. **Budget slips** (store, blocking) put the advised purchase on the empty desk; not days, no text, no counter.
6. **Ministers are a desk rule** (store): 9, three per office, each running a named ministry.
7. **A boycott ends with no mood change** (was +6) and **"Say nothing" no longer blocks the call** (builder), so the two ads save money and time only.
8. **"Bigger In-Tray" is cut** (it broke H10 and is not among ruling 6's products); a second cosmetic replaces it.
9. **After a loss you are "Acting"** (satire); the ruling's term in the same seat stands.
10. **One new thing per term** for 181 presidential terms; the level cap no longer rises (it never bound).
11. **Campaign papers only add points**: a win is certain after at most 8 consecutive losses (2.11), and each paper fits 3 chip slots.
12. **Cut from v1:** the manifesto, Name Recognition perks, Who's Who, the compact "Again:" form.

## 2. Rules

Pure TypeScript in `src/engine/decree.ts` (interface) and `src/engine/decree/`, installed by `src/engine/decreeMode.ts` as an `EngineMode`. The game.json `decree` block is opaque in the shared schema and parsed by `src/config/schema.decree.ts` in `EngineMode.config`; numbers live in `src/config/decree.content.ts`, written by `build-office.py`. No `Math.random`, no `Date.now`: time comes as `now`, randomness from `rngMix4(seed, site, counter, x)` with one forward-only counter per site (`pick`, `petitioner`, `jitter`, `template`, `followDelay`, `campaign`, `rival`, `note`).

### 2.1 The rules in twelve lines (what the player is told; the whole engine)

1. Ministries collect taxes every second. Approval multiplies them.
2. While you play, a visitor brings a paper every 12 s (15 s as President), until 10 wait. Away, one comes every 6 minutes.
3. A paper prints exactly what signing and refusing do. Those numbers are applied.
4. Push it up to sign, pull it down to refuse. You can sign only what the treasury can pay; refusing never costs money.
5. When no visitor waits, the Treasury Clerk brings a budget slip: up buys it, down puts it back.
6. Each club has a mood from 0 to 100; approval is their weighted average. A club below 20 boycotts its ministry until you settle or 8 more papers are decided.
7. Some papers add gossip. At the limit a scandal breaks: apologise, or say nothing and lose a fifth of your taxes for 10 papers.
8. A ↩ on a paper means that choice comes back later.
9. A term is a fixed number of papers. From 60 % of it you may call the election.
10. Each district votes by the moods of its clubs; the poll shows the result exactly as it would be today.
11. Win and gain Name Recognition; with enough, and your ministries' record, move up. Lose and serve on as Acting. Nothing built is lost.
12. Away, ministries collect for up to 4 h and the in-tray fills. Nothing else changes.

### 2.2 Content data (starting values)

| | Mayor | Governor | President |
|---|---|---|---|
| Place | Dithering-on-the-Dawdle | Province of Upper Wobbling | the Republic (capital Middlingham) |
| Ministries | 4 | 6 | 8, + a Grand Project at terms 2, 4, 6, 8, 10 |
| Clubs / districts / majority | 3 / 5 wards / 3 | 5 / 7 counties / 4 | 7 / 9 provinces / 5 |
| Arrival interval τ (tune 10 to 18) | 12 s | 12 s | 15 s |
| Term D in days (tune ±20 %) | 80 | 110 | 120 |
| Call from C = 0.6 D (tune 0.5 to 0.7) | 48 | 66 | 72 |
| Campaign papers K (+ the rally) | 3 | 4 | 5 |
| Gossip limit G_max | 5 | 6 | 7 |
| Rival's pull R (tune 3 to 12) | 7 | 9 | 11 |
| Scale S (tune ×0.3 to ×3) | 1 | 1,000 | 1,000,000 |
| To stand: Name Recognition (tune ±30 %) | — | 10 | 50 |
| To stand: record, levels in all (tune ±30 %) | — | 80 (Town Record) | 170 (Province Record) |
| Weight O of a win | 1 | 2 | 3 |
| Requisition every n-th draw (tune ±2) | 10 | 8 | 4 |
| Template share q (tune 0 to 0.25) | 0 | 0.15 | 0.20 |

Clubs (icon; short name on papers): Bus Spotters' Society (bus; "Bus"), Shop Window Guild (shop bell; "Shops"), Giant Vegetable Society (pumpkin; "Vegetables"); the governor adds the Brass Band Guild (tuba) and the Anglers' Circle (float); the president the Kite Flyers' League (kite) and the Tidy Hedge Committee (clippers). Never 4 clubs.

District mixes w_{d,g} (hundredths summing to 1.00): each district has 2 or 3 strong clubs; every club is strongest in at least one district and in no more than half. Mayor's wards (Bus / Shops / Vegetables): Market Ward 0.20 / 0.60 / 0.20; Mill Ward 0.55 / 0.25 / 0.20; Hilltop 0.20 / 0.20 / 0.60; Riverside 0.45 / 0.15 / 0.40; Old Town 0.30 / 0.40 / 0.30. Population weights W_g (mean over districts): 0.34 / 0.32 / 0.34. Governor and president mixes are data in the same form (P2, by this rule).

**Ministries.** Ministry 0 serves no club, so income is never zero. Ministry i of an office of scale S:
- base value v_i = S × 8^i (step tune 6 to 10);
- open cost O_0 = 0, O_i = S × 150 × r^(i−1), r = 16 (tune 13 to 30, one step for the whole table): mayor 150, 2,400, 38,400;
- level cost L → L+1 = 15 × v_i × 1.25^(L−1) (growth tune 1.15 to 1.30);
- a **storey** every 12 levels doubles the rate (st(L) = floor(L/12)), is drawn in the Ledger's margin and brings a ribbon form; cap 96 (8 storeys) everywhere; a purchase that would change nothing is refused (merge M45).

| Office | Ministries (club served) |
|---|---|
| Mayor | Town Clock Office (none), Potholes Office (Bus), Benches & Bandstands (Vegetables), Signposts & Lampposts (Shops) |
| Governor | Provincial Clock Office (none), Bus Shelter Trust (Bus), Market Weights Board (Shops), Glasshouse Office (Vegetables), Bandstand Board (Brass), Canals & Jetties (Anglers) |
| President | National Clock Office (none), Motorway Board (Bus), Lamplight Authority (Shops), Parks & Benches (Vegetables), Office of Brass & Bunting (Brass), Harbour Board (Anglers), Kite & Breeze Office (Kites), Hedgerow Bureau (Hedges) |
| Grand Projects (no club) | The Very Long Bridge, The National Ribbon Mill, The National Umbrella, The Tallest Bandstand, The Ministry of Ministries: project j continues the ladder as ministry 7 + j (v = S × 8^(7+j), open S × 150 × r^(6+j)) |

Roads and ports from the promise are here; schools are not (politics-policy.md 4). No ministry reads as state media, policing, the army or real policy.

**What money is for.** It buys levels and openings, which raise income and fill the record that standing needs; signing spends money that would buy levels. Prices scale with B, so papers stay affordable, but the record counts levels: a richer player reaches it sooner, nobody without buying. No mood, poll or count reads money.

**Money tiers** (seconds of B, frozen at the draw): S 15, M 30, L 60 (tune ×0.5 to ×2), × a jitter j from 0.85 to 1.15; minimum 5 dibs.

**Archetypes** (the writer picks one; the table fixes base effects Δ, each tune ±1; it replaces the first table, under which signing won on moods on about 76 % of papers):

| Archetype | Share | Sign | Refuse | Mood net (sign − refuse) | Reader signs (model) |
|---|---|---|---|---|---|
| Project | 24 % | cost S · petitioner +4 · other −3 | petitioner −3 · other +2 | +2 | 50 % |
| Swap | 20 % | petitioner +4 · other −4 | petitioner −4 · other +4 | 0 | 42 % |
| Fee | 14 % | gain M · petitioner +2 · other −4 | petitioner −1 · other +1 | −2 | 38 % |
| Treat | 12 % | petitioner +3 · other −1 · gossip +1 | petitioner −2 | +4 | 87 % |
| Committee | 15 % | cost S · petitioner +1 · other −2 · ↩ bigger study | petitioner −2 · other +1 | 0 | 25 % |
| Vanity (trap) | 8 % | cost L · every club −1 | No change | −3 | 0 % |
| Basket (trap) | 7 % | gossip +2 · ↩ favour | No change | 0 (+2 gossip) | 0 % |

"Petitioner" is the visitor's club, "other" the side the writer names (7.2), strong in other districts, so districts decide Swaps, Projects and Committees. Nets (equal weights, mood 50): refuse strictly better on 22 % of comic papers, tied on 42 % (districts, money and gossip decide), sign better on 36 %. The last column is a rough model (`proto/rev2/term.py`, mayor, 300 runs of 6 terms, forms included): the reader signs 46 % of all papers; wins: reader 97 %, always-sign 42 %, random 34 %, always-refuse 21 %; always-sign meets 1.7 scandals a term. The prototype confirms it first (8.1).

A **basket** never pays money or pleases a club (lobbyists speak only for their absurd trade). Its follow-up, the favour, costs on the sign side (a club −3 · gossip +1), nothing on the refuse side, and its clipping mocks the mayor. Traps (Vanity + Basket) are at most 15 % of each deck.

**Routine papers** (expected to recur; printed forms, not jokes): requisition (sign: the printed price, that ministry +1 level, its club +1 | its club −1); ribbon at a storey (cost S, served club +3 | served club −1); application (2.9); boycott settlement and scandal (2.8); campaign papers and the rally (2.10).

**Other values:** treasury 30 at start; tray cap 10; away arrival every 360 s (tune 240 to 600); away rate a = 0.35 (tune 0.25 to 0.45); away cap 4 h (+4 h with Long Lunch); m_N = 1 + 0.02 × NR (tune 0.01 to 0.04); disarray Y = 8 per consecutive loss (tune 8 to 10, integer); vanity 1.02 per monument (tune 1.01 to 1.04); transition fund 30 s of the old B (tune 15 to 90); petitioner weight max(0.5, min(1.5, 1 + (50 − m_g)/50)).

### 2.3 State

`DecreeState` sits on the shared `GameState` under `decree`; cash is the shared `cash`, changed only through one `commit()`; `tick` advances `stats.playSeconds` itself.
- `seed`, `draws`; `office`, `term`, `presTerms`, `day`, `phase` (`governing` | `campaign` | `count` | `result`), `losses`.
- `ministries[i]` `{open, level}`; `moods[g]` (integers 0 to 100); `gossip`, `quiet`; `strikes[g]` `{papersLeft}` | null, `armed[g]`; `scandal` `{papersLeft}` | null.
- `tray` (each paper fixed at its draw); `desk` (paper or slip, with `shown` frozen at landing and `drawnLevel` for forms); `pending` (a signed paper in its take-back window); `asideTray`; `nextArrivalAt`; `awayCarry`.
- `followUps` `[{chainId, step, choice, dueAt}]` (dueAt in decisions ever); `seen` (text → last decision); `frameBag`; `notesSeen`; `campaign` `{C[d]}`.
- `nr` (never falls); `cabinet[id]` `{club, termsServed}`; `applicationsDelivered`; `vanity`; `twistIndex`; `rivalIndex[office]`; `clippings`; `wall`; `drawerCount`; `adsUsed`; `cooldowns`; `standingOrder`; `stats`.

### 2.4 Derived values

- Approval A = Σ_g W_g × m_g (whole percent). M(A) = 0.4 + 1.2 × A/100: ×1.0 at 50, ×1.6 at 100 (slope tune 0.8 to 1.4). Top bar: "62 % ×1.14".
- rate_i = v_i × L_i × 2^st(L_i); V = 1.02^vanity.
- **B = m_N × V × Σ open_i × rate_i** (sizes papers and the transition fund).
- **I = M(A) × m_N × V × Σ open_i × s_i × rate_i × (0.8 while "Say nothing" runs)**, s_i = 0 while ministry i's club boycotts. I is constant between actions and arrivals.
- share_d = min(100, max(0, Σ_g w_{d,g} × m_g + C_d + Y − R)), Y = 8 × losses, in hundredths, shown to one decimal; held when ≥ 50.0; the poll is the number held.
- Record = Σ levels of the office's ministries (Grand Projects excluded).

### 2.5 What a tick does (`EngineMode.tick`)

- cash += I × dt exactly. Arrivals due in (clock, clock + dt] are drawn at their exact times while the tray has room; with a full tray the arrival clock stops and the next paper comes τ after a place frees; no arrivals during `campaign`, `count`, `result`.
- A slip lands 1.0 s after desk and tray become empty, if advice() names an affordable purchase.
- Nothing else moves with time. tick(a + b) = tick(a) then tick(b) exactly (tested); the bot steps from event to event.

### 2.6 Player actions

`decide(choice)`, `takeBack()`, `raise(i)` (the Ledger's untaught button), `openMinistry(i)`, `buyVanity()`, `callElection()`, `countVotes()`, `chooseAfterWin(moveUp | stay)`, `setStandingOrder(on)`, and the grants of 5.11; each refuses and returns the same object when not allowed. Every purchase other than a paper keeps back **the reserve**, the sign cost of the desk paper plus the next waiting one ("Kept for the desk: 540"), and is refused with that sentence if it would cut into it.

### 2.7 The paper

**Fields** (fixed at the draw): id; kind (comic, template, followup, requisition, ribbon, application, strike, scandal, campaign, rally, scripted, slip); visitor (face, name ≤ 24 characters, role ≤ 28, club); text ≤ 90 characters (deck median ≤ 65); archetype, subject, butt and joke-shape tags; two outcomes of at most 4 effects (money, a club's base Δ, every club as one effect, gossip, ministry +1 level, appoint, end the boycott, end the scandal, district points); an optional follow-up `{chainId, step, delay}`; for forms, the ministry and `drawnLevel`.

**The draw**, in order: (1) a boycott or scandal paper due now, on top (it may exceed the cap by 1); (2) a scripted paper (the first four of a game, the first of each office); (3) a follow-up past its dueAt, earliest first, never without its decided set-up; (4) a form due: the next undelivered application at days 9, 30 and 60 of any term, a ribbon at a new storey, a requisition every n-th draw for the open ministry with the best payback; (5) a template with probability q, dealt from the shuffled frame bag (none twice before it empties); else a comic paper.

**The comic draw.** Each eligible unseen text t (this office's deck, the any-office deck, lower offices' `portable` texts) has weight clubWeight(club_t) × share(archetype_t) / (unseen texts in t's club-and-archetype cell): the table's shares hold while cells have texts, and an empty cell's weight passes to the rest. With no unseen text left: a template, then the text seen longest ago, whole, with one of 60 returning-visitor last lines ("Back again, with the same pumpkin and a firmer tone.").

**Sizing.** At the draw, money = roundDibs(tier × B_draw × j), never recomputed. At landing, twist and minister factors multiply the base Δ (validator: every effective |Δ| ≤ 10), then each mood effect is frozen into `shown`: f+ = min(1.4, (100 − m)/50) for a gain, f− = min(1.4, m/50) for a loss, shown = sign(Δ) × max(1, round(|Δ| × f)) (half away from zero), 0 with no headroom. A yes moves an unhappy club more, a no less.

**Lemma (tested):** with |Δ| ≤ 10, m + shown stays in 0 to 100: |Δ| × f+ ≤ (100 − m)/5 and rounding cannot pass that integer; under the cap (m < 30) 14 < 70; the minimum of 1 needs headroom ≥ 1; losses are symmetric; a settlement's fixed +10 starts below 20. No clamp bites; the engine asserts `clamps = 0` (H1).

**Forms are checked at commit.** A requisition or slip prints "Potholes Office +1 level · −458" beside the live level. If the level is no longer `drawnLevel` (the Ledger or the Standing Order bought it), it leaves as "Already done: the Clerk takes it back", with no effect; at the cap, "No longer needed". The printed price always buys the printed level.

**A strip prints** a title row ("IF SIGNED ↑" / "IF STUDIED ↓", then "Poll 3 → 4 of 5" when the districts held change, else the approval icon and "62 → 63 %", and ↩ when that outcome schedules a follow-up); chips with resulting values ("[pumpkin] 50 → 54", "[coin] −946", "[gossip] 2 → 4"), a flag on a club chip when the club is strong (w ≥ 0.4) in a district within 3 points of 50, "every club" as one wide chip ("[all] −1 each · [approval] 50 → 49", each value on a tap); and a note row: the boycott or scandal warning ("Vegetables below 20: BOYCOTT", "Gossip 5/5: SCANDAL") before "Short by 240 · about 9 s". All of it derives from `shown`.

**Decide.** Sign is refused while cash < cost; refuse is always possible and free. A signed day paper rests 2 s on the out-tray, where a tap takes it back unchanged; it commits after 2 s, at a tap elsewhere or when the app goes to the background. Refusals and slips commit at once. Commit applies `shown` exactly and runs 2.17; the next paper lands after it. A sticky note announces a follow-up one paper ahead ("Next: the pumpkin is back.").

**Budget slips.** 1.0 s after desk and tray empty, Gwendolyn Abacus slides advice()'s purchase onto the desk if it is affordable above the reserve: "Benches & Bandstands +1 level · −120 · +8/s". Up buys it at the printed price, down puts it back; a visitor's arrival returns an undragged slip. With nothing affordable the sticky note says "Next: Benches opens · 2,400 · about 40 s".

### 2.8 Boycotts (strikes) and scandals (counted in papers; nothing moves while away)

**Boycott** (the strike, named for what it is). After a commit, any club below 20 whose strike is armed boycotts its ministries (s_i = 0) over something the mayor did; its own picket slogan (none twice a term) hangs on its Ledger row, and its spokesperson's grievance (14 hand-written, 2 per club: the ribbon scissors kept, the prize rosette worn, the pond renamed after you) goes on top.
- Sign ("Return the scissors"): 20 s of B, the club +10 (fixed), the boycott ends.
- Refuse ("Keep the scissors"; never "Let them…"): it runs 8 more decided papers, then ends with no mood change.
- It ends at once when the club reaches 25 by any means; it re-arms at 30. The ad "Send a Courier" ends it now with no mood change.

**Gossip and scandal.** Gossip rises only by printed effects; low approval never adds any (no spiral). After 8 decisions without a gain it falls by 1. When a commit brings it to G_max with no scandal running, the front page goes on top:
- Sign "Apologise on the steps": every club −3 (one chip, f− per club), gossip to 0.
- Refuse "Say nothing": I × 0.8 for 10 decided papers, then gossip 0; the call stays open.
- The ad "Call the Spin Doctor" ends "Say nothing" now, gossip 0, no mood change. A scandal running at the term's last day ends.

Both have a free way out without money or an ad; neither closes a ministry, lowers a level or touches Name Recognition.

### 2.9 Ministers

- 9 ministers arrive as applications in a fixed order, the next undelivered one at days 9, 30 and 60 of any term until all have come. Sign appoints; refuse sends them away and the same application returns 30 papers later, in any office.
- Each application names the minister's ministry by club ("Minister for Potholes", the Bus ministry), frozen at the draw. The minister runs that club's ministry in every office and brings one desk rule (7.3), a factor on one parameter printed as their initials on every paper it touches ("DP ×0.9").
- Terms served are shown as a plain fact. Never bought, never random, never ranked.

### 2.10 The term, the run-up and the count

- Ribbon "Day 41/80 · NR 9/10 · Lv 52/80"; from day C the button "Call the election · poll 4 of 5". Calling needs day ≥ C and phase `governing`; the confirmation prints the count as it stands ("If you call it now: 4 of 5 wards. 3 needed."). At day D the run-up starts by itself.
- **The run-up** (campaign) is shown as public appearances (judging a hedge show, opening a fête), paid from the treasury as town business. A campaign paper names a district (seeded, within 6 points of 50, else the closest): sign 45 s of B, that district +4 campaign points | No change. The rally: 60 s of B, the lowest club +4 (scaled) | No change. **No ad and no product is offered from the call to the end of election night.**
- **The count** is the poll, number for number; districts are announced by |share_d − 50|, largest first, 2.5 s each; a tap skips.
- **After a win:** NR += O × (3 + held), + 2 × O for a sweep; losses = 0; terms served +1. With NR and the record met: "Stand for Governor" (2.12) or "Another term here"; else "Another term here" and what is missing ("Governor needs Name Recognition 10 and a Town Record of 80: you have 8 and 71"). The same rival returns ("back for another go").
- **After a loss:** NR += O; losses += 1; terms served +1. The winner resigns over a hobby ("Councillor Plumb won, then resigned to spend more time with her hat."); you are "Acting Mayor" (Governor, President) on ribbon and portrait until the next win; the office's next rival (lists of 3, 3, 12) stands and the old one joins "Former opponents"; the poll labels Y "Opponents in disarray +8". No text counts or celebrates terms held.
- **A new term in the seat:** day 0; moods halfway back to 50 (rounded toward 50); gossip and campaign points 0; `asideTray` back to the tray; a monument offered (5.8); the office's next twist (2.14).

### 2.11 Why repeated losses must end in a win

At any count Σ_g w_{d,g} × m_g ≥ 0 and C_d ≥ 0, so share_d ≥ 8 × losses − R, and every district is held once losses ≥ (50 + R)/8: mayor 57/8 = 7.1, governor 59/8 = 7.4, president 61/8 = 7.6; at the tuning extreme (R 12, Y 8) 7.75. So after at most 8 consecutive losses at any seat the next count is a certain win, whatever the player does, even with every mood at 0. The validator recomputes ceil((50 + R)/Y) and fails above 8. The halfway reset lifts every club to at least 25 each term, so the measured bound is far shorter (H6).

### 2.12 The bigger office (`EngineMode.prestige`)

`canPrestige` is true only on the result sheet after a win meeting both requirements.
- **Resets:** treasury to the transition fund; the new office's ministries (ministry 0 at level 1); clubs at 50 + min(5, floor(NR/20)); gossip, boycotts, scandal, day, campaign, losses; tray and `asideTray` go back to the deck unseen.
- **Carries:** Name Recognition; ministers (each runs the new office's ministry of their club); monuments; scrapbook and seen texts; due follow-ups (sized at their own draw); purchases; the Office wall with the old town's photograph and levels.
- The move sheet lists Resets, Stays and Next, and when the new income passes the old ("about 5 min", from advice).

### 2.13 The first ten minutes (rate model)

Hand 6 s, τ 12 s; prices exact; times and incomes from `econ.py` (greedy best-payback buyer, 25 % of income on papers, M = 1).

| Time | What happens | Spent | Income /s |
|---|---|---|---|
| 0:00–0:10 | Treasury 30, Town Clock level 1. Paper 1 refused (every club 50 → 51; poll "0 of 5 · Plumb's hat −7"); paper 2 signed | | 1 |
| 0:16–0:50 | First slip "Town Clock Office +1 level · −15"; papers 3 (Till's Teas, +60 fixed) and 4 (the basket); levels 3 to 5 (19, 23, 29) | 86 | 5 |
| ~1:05 | Potholes Office opens | 150 | 13 |
| 1:05–3:00 | Potholes 2 to 9 (120, 150, 188, 234, 293, 366, 458, 572), Town Clock to 10; day 9, Dorothy Pockle applies | ~2,600 | 55 at 2:00 |
| ~3:00 / ~5:30 | Benches & Bandstands / Signposts & Lampposts open (all four by 48 % of the term) | 2,400 / 38,400 | 150 / 2,000 |
| ~9:00 | Town Record 80 | | ~23,000 |
| 10:00 | Day 48: "Call the election · poll 3 of 5"; about 48 papers and 90 slips | | ~25,000 |

The reader calls at about day 56 (11:30, 4 of 5, NR 7, "Another term here"); a sweep (NR 10) moves up. A player spending 60 % on papers reaches the Town Record at about 20 min: money matters to the ladder. Openings at r = 16: mayor 1.1 / 3.0 / 5.5 min; governor up to 9.1; president up to 12.4.

### 2.14 New things each term, and the top

Every new term in a seat, won or lost, opens one new thing, told on the result sheet:
- Mayor terms 2 to 4: Committee Week, Market Fortnight, Quiet Press; governor terms 2 to 5: Bandstand Summer, Ribbon Shortage, A Gentle Week, Early Doors (then repeating).
- President: a Grand Project at terms 2, 4, 6, 8, 10; one of 10 twists at terms 3, 5, 7, 9, 11 to 16, each one factor on one parameter: Bandstand Summer (Brass +0.10 in every mix, others scaled down), Committee Week (committees ×2), Quiet Press (G_max +2), Ribbon Shortage (ribbons cost and please ×2), Kite Weather (Kites +0.10), Market Fortnight (fees ×1.5), Early Doors (τ ×0.8), Hedge Inspection (Hedges +0.10), A Gentle Week ("Say nothing" ×0.6), Grievance Amnesty (settlements ×0.5); the 45 pairs at terms 17 to 61 and the 120 triples at 62 to 181, in fixed orders. The validator checks composition (mix twists add, other factors multiply, also with minister factors; every base |Δ| ≤ 10). From term 182, "A Quiet Term", honestly labelled: past day 70 for the passive bot, about 70 h of active play.
- No world office, no other planet.

**Largest number in 30 days.** Grand Project 5 (v = 1e6 × 8^12 = 6.9e16) earns 1.7e21 at level 96 (×256); all 13 at most 1.93e21. After 30 passive days NR ≈ 1,900 (about 70 terms of about 27), m_N ≈ 39; with V 1.6 and M 1.6, I ≤ 1.9e23 /s, and 30 days of it unspent ≈ 5e29. A steady player stalls near levels 35 to 45 (expected high 1e21 to 1e24). The formatter's last suffix (Dc) reaches 1e36: 6 orders of room (H11).

### 2.15 Time away, as a closed form (`EngineMode.offline`)

Two additive seams on `EngineMode`, handled in `src/state/store.ts` by P3:
- `paysOnCompute: true`: the store grants `earnings` in the same update that computes them (resume and boot); the report only informs, and its ad grants the extra 50 % (× `offlineAdMultiplier` − 1) when the ad completes. Killing the app with the report open loses nothing (lesson 5).
- `catchUpSeconds: 0`: every absence, however short, follows the away rules; the store's 300 s full-speed catch-up never runs for decree.

The form: t = (now − max(lastSavedAt, stats.clockHigh))/1000, t′ = min(t, cap). I_away = a × (I with the boycott and "Say nothing" factors frozen as they stand): their counters do not move, but the income they cut stays cut, so closing the app is never the better play. earnings = roundDibs(I_away × t′). Papers: n = min(free places, floor((t′ + awayCarry)/360)), awayCarry keeps the remainder when time limits n, else 0; they are drawn in order on return with the unchanged state (a reload re-rolls nothing), none during a run-up; nextArrivalAt is re-phased within one τ. Unchanged while away: moods, gossip, every counter, the day, the poll, cooldowns; a pending take-back committed when the app went to the background. Report: "While you were out (2 h 10 m): the ministries collected 14.2K dibs. 10 visitors are waiting." `income()` = I_away, `activeIncome()` = I. Cross-check (10.2): event stepping equals the form at 30 s, 299 s, 301 s and 4 h.

### 2.16 Advice and the goal line

`advice(cfg, state)` (pure) picks one goal for the bot, the slip and the goal line: score = max(0, cost − cash + reserve)/I + cost/Δincome over levels, openings and the monument (Δincome 0.02 × I); while the record is short, a level's score is divided by 1.5. It also offers the call when the reader would call (8.2), and during a boycott or scandal the free exit and the ad. The goal line shows words, price and "about 20 s / 2 min / 1 h" in at most 34 characters (lint).

### 2.17 Order of operations

After each commit: (1) apply `shown`, schedule any follow-up; (2) for a day paper only (not a campaign paper, rally or slip): day += 1, boycott and scandal counters −1, quiet and gossip decay, decisions ever += 1 (what follow-ups count); (3) boycott check, then gossip and scandal check; (4) at day D the run-up starts; (5) the next paper lands, or a slip after 1.0 s.
- At a call: the desk paper, if ordinary, and the waiting ordinary papers go to `asideTray` in order; a settlement or front page stays on top and is decided first; due follow-ups wait; the K campaign papers arrive τ apart (the first at once), then the rally.
- At a new term: the halfway reset, then any boycott whose club is now 25 or more ends.
- At a move: tray and `asideTray` return to the deck unseen (their money was sized at the old B).
- Twist and minister factors apply to the base Δ before sizing, never after.

---

## 3. The first three minutes, then the goals to hour three

### 3.1 Timed script (the tutorial)

- **0:00** Loading card: the emblem, "The Republic of Middling. Proudly Adequate."; the player taps one of 6 faces ("Pick for me"; no name field). Caption: "Elected Mayor of Dithering-on-the-Dawdle, unopposed. The other candidate went to the wrong hall."
- **0:02** Paper 1 teaches refusal: a drawn pen draws it down once; the drawer creaks open with the distance.
- **0:10** Paper 2 teaches signing (Rodney: "Welcome, Mayor. Please sign this to say you have read it. You haven't. Sign it." SIGN every club +1 · STUDY ↩ another copy): the pen pushes it up, the signature writes itself from 40 pt, the tray clinks; "Tap to take it back (2 s)".
- **0:16** The first slip; the pen points at it once. **0:20** Paper 3, Till's Teas (+60 fixed): papers can pay, and pleasing one club annoys another. **0:38** Paper 4, Lionel Sash's basket; "Gossip 0/5" appears, no lecture.
- **0:50** The general draw; the door glass shows "Next visitor 0:07"; slips fill the gaps. **~1:05** Potholes opens; **~1:50** the first application; **~2:40** the first sticky note.

### 3.2 Goals of minutes 3 to 30

- Minutes 3 to 12: more ministries and the first storey, a follow-up, a second minister, the Town Record, the first call, run-up and election night. A sweep moves up (NR 10); 4 of 5 gives NR 7.
- Minutes 12 to 24 (after a non-sweep): mayor term 2 with Committee Week and Plumb "back for another go"; the first boycott for a player who neglects a club, the first scandal for one who takes baskets; the first monument.
- From minute 12 or 24: Governor of Upper Wobbling (a mahogany desk, a green lamp), the Brass Band Guild and the Anglers' Circle, 7 counties, Barnaby Waft, Keeper of the Ceremonial Spoon ("Waft: Gently Onwards"), pulling 9.

### 3.3 Hours one to three, and week three

- Governor to about 1:05–1:15: two or three terms of about 17 min; something new every 10 min or less (the sixth ministry at about 9 min, ministers 4 to 6, a county lost by 0.4, chain endings, a twist a term); NR 50 to 60.
- President: a long walnut desk with three telephones, 9 provinces, Professor Ignatius Crumb ("Crumb: Abolish Wednesdays") pulling 11; terms of about 22 min; the eighth ministry at about 12 min; term 2 brings The Very Long Bridge.
- At hour 3: president term 3 or 4, about 800 papers, 7 to 9 ministers, 3 to 5 monuments, 20 to 30 clippings; no text, frame or note seen twice in hour 1.
- **Week three, from the paper rate.** The passive bot (5 sessions of 8 minutes a day) finds 10 waiting papers and decides about 40 arrivals a session (32 as president): about 250 papers a day, 210 as president. Governor day 1, president day 2; a presidential term is about 85 papers, so 2.5 terms a day: term 45 to 50 by day 21, about 70 by day 30, inside the 181 terms of one new thing. Also new: rivals, the next of 24 monuments, Grand Projects' storeys, missing clippings.
- **Honest limit.** The passive bot uses up the president's hand-written pool around day 5; then texts return whole with a returning-visitor line. The day repeats pass 20 % is reported (8.4); content updates are the answer.

## 4. Screens

### 4.1 Fixed zones

Portrait, one screen; zones from the pure `deskLayout(width, height, insets, fontScale)` (`src/ui/decree/layout.ts`); text `allowFontScaling={false}` at s = min(fontScale, 1.3).

| Zone | Text at s | 375 × 667 (20/0) | 390 × 844 (47/34) |
|---|---|---|---|
| Top inset | | 20 | 47 |
| Top bar | treasury 15 (line 24), rate and chips 12 | 40 | 44 |
| Club strip | 11 | 32 | 40 |
| Term ribbon | 11, line 18 | 18 | 20 |
| Out-tray band / paper / drawer band | 4.2; label 11 | 36 / 405 / 36 | 56 / 461 / 56 |
| Goal line | 12, line 20 | 20 | 22 |
| Bottom row | 11 | 60 | 64 |
| Bottom inset | | 0 | 34 |
| Total | | 667 | 844 |

Widths at 375, s = 1.3: top bar "999.9M · +999.9K/s" 156 + approval "62 % ×1.14" 86 + gossip 48 + menu 40 + gaps 18 + gutters 20 = 368. Club strip 7 × 32 + 6 × 6 = 260: icons with a mood ring, numbers for 2 s on a change or a tap (always with 3 clubs); while a drag is armed, rings and the approval chip preview its values (never under the thumb). Term ribbon in two fixed forms: the long one ("Acting Governor · Day 41/110 · NR 9/50 · Lv 152/170", about 400 pt) only where it fits, else "Day 41/110 · NR 9/50" with the record as the Poll badge; never wrapped or cut. Bottom row: in-tray 72 (a tap shows the next 3 faces), Ledger, Cabinet, Poll, Office 64 each, gaps 16, gutters 16 = 360. The validator measures every ribbon, goal-line, top-bar and bottom-row string in every office and state.

### 4.2 The paper, row by row

Width 343 (inner 315); rows add up in `paperMetrics.ts` (as `headerMetrics.ts`). At s = 1.3: padding 6; SIGN strip 106 (4 + title row 22 at 12 × s, "IF SIGNED ↑ · Poll 3 → 4 of 5 ↩" ≤ 304 pt, + 2 chip rows of 28 at 15 × s + note row 20 at 12 × s + 4); divider 2; header 62 (oval photo 44 × 54 with paperclip, name 15 × s, role and badge 13 × s); proposal 112 (4 lines at 16 × s, line 26, + 8); divider 2; REFUSE strip 106 ("IF STUDIED ↓"); padding 6: **402 ≤ 405**.
- A chip is an icon and a resulting value in tabular digits, ≤ 151 pt: two fit 315. A wide chip (a district, "HT 48.6 → 52.6" with an 11 × s badge, about 170 pt, or "every club") fills a row. A strip has 4 slots, a wide chip takes 2; mayor strips hold at most 3 chips.
- SIGN at the top edge by the out-tray, REFUSE at the bottom by the drawer; the armed strip grows to 110 % in either direction; violet for SIGN, slate for REFUSE, never red and green.
- The validator measures every proposal, frame-with-phrase, name, role, chip, note and the 4.1 strings at s = 1.3 with a glyph-width table (10 % margin until calibrated once on a phone).

### 4.3 The flick (React Native responder; no gesture library)

- `onStartShouldSetResponder` only inside the paper's rectangle (numbers from `deskLayout`), so edge drags stay with the system. JavaScript keeps dy and velocity from `pageY` and timestamps and writes one shared value, `paperY`, drawn on the UI thread; JavaScript never reads a shared value. Vertical only: no x, no rotation, no tilt.
- From 40 pt: up, the signature writes itself across the SIGN strip with distance (a growing nib scratch); down, the drawer creaks open by the distance; a light haptic; no click.
- Release commits **up** at 90 pt, or 48 pt at 0.8 pt/ms; **down** at 90 pt, or 24 pt at 0.5 pt/ms (signing asks more: the up-swipe is the commonest habit and it spends money). Otherwise one spring clock brings it back; signing while short shakes the strip ("Short by 240").
- **Take-back:** a signed day paper rests 2 s on the out-tray ("Tap to take it back"); a tap restores it as frozen (H3). A second finger cancels.
- **Second path** (never taught): tap a strip to arm ("Tap again to sign"), tap to commit; elsewhere or Android back disarms; screen readers get `accessibilityActions` Sign and Refuse.
- Signed papers stack in the wire tray until the term ends; refused ones go into the drawer ("FOR FURTHER STUDY (312)"); the next paper slides in after 300 ms.

Why ours and one-thumbed: the free "no" is a short pull toward the resting thumb, signing a deliberate push away, 90 pt mid-screen along the thumb's arc; both outcomes always printed, nothing revealed by tilting, nothing stamped; the destinations are desk objects that visibly fill.

### 4.4 Sheets and full-screen views

Every dialog is the kit `Sheet` or uses `useOverlay`; one at a time.
- **Ledger** (read-only): per ministry level, storeys in the margin, rate, club, minister, a picket when boycotted ("Boycott: Vegetables 18, ends at 25 or in 5 papers"), one untaught "Raise"; the record ("Town Record 71/80"); "Kept for the desk: 540"; closed ministries with their price.
- **Cabinet:** the framed photograph with dotted places; a face shows ministry, desk rule, terms served. **Poll:** the pinned map, held districts in violet hatching, others slate (never club colour); shares, clubs, the rival's pull, the disarray; the call button.
- Away report, move sheet (Resets / Stays / Next), result sheet, Shop, Settings (sound, music, haptics, "Buttons instead of flicks", restore, privacy). Full-screen (`useOverlay`, the desk's clocks stopped): Election Night, the Office (portraits, photographs, "Former opponents", shelf, scrapbook), the face picker.

**Election night:** a chalk tally board, a row per district and a majority line; the Counting Clerk, Agatha Tallow (a paper cut-out), opens an envelope every 2.5 s; chalk marks, a rosette if held; at the majority bunting and the band in silhouette, then the rival's line ("Plumb: I still own the hat"); a tap speeds the rest ×4. The count is played straight.

**Android back** closes an armed strip, the in-tray peek, a sheet, a full-screen view (Election Night jumps to its result first), in that order; it leaves the app only from the bare desk, committing a pending take-back.

### 4.5 Phone rules

- One Skia canvas for the desk (portraits elsewhere through `GameIcon`); 60 fps while a finger is down or a paper moves, else 30. One clock per animated thing (`paperY` and its spring, the entrance, the drawer, the ink, the take-back rest, the sticky note, the treasury roll, the election-night calls); visitors do not idle-animate; nothing invisible animates.
- Paper text is Skia paragraphs in the 4.2 boxes; the treasury a `RollingNumber` with no `lineHeight`.
- Atlases under 2,048 px, drawn in code, baked once (`bakeAtlas`), never freed while a canvas may draw: faces (48 busts at 128 × 160 in 8 × 6, 1,024 × 960, plus the 6 player faces as one-colour portraits with 3 ageing steps), props (1,024 × 1,024). District maps are Skia paths.
- `npm run lint:worklets` passes; the only worklets draw `paperY`, the spring and the ink. Selectors use `useShallow`; the desk reads its paper through one stable selector. Hints never cover a number.

### 4.6 Palette "baize-and-ink"

Baize #2E4A3E with a felt pattern; walnut #6B4A33; paper a cool pale blue-grey #ECEFEA; violet ink #5B3E8C (signature, headings, SIGN); slate #6C7A89 (REFUSE); brass #C9A45C (tray, paperclip, lamp); mustard #D9A53A (money only); soft brick #B0563F only for boycott and scandal words, under 8 % of any screenshot; chalk slate #2D3436 for election night. Clubs appear by icon and a two-tone pattern (terracotta, sage, slate blue, copper, plum, ochre, dove grey), never as a flat map fill or by colour alone.

---

## 5. Meta systems (each in a container none of the three games uses)

From the shared kit; no tabs family, missions sheet, chest overlay, ladder, arch, scroll, contract board or star map.
1. **In-tray, desk and drawer**: the stack, the door glass, the sticky note, the out-tray filling over a term, the drawer drawn bigger at 100, 1,000 and 10,000 refusals (a second drawer, a filing cabinet, a photograph of a warehouse; looks only).
2. **Slips and the Ledger** (2.7, 4.4). 3. **The Cabinet**: 9 ministers from applications only, never sold or random. 4. **Follow-ups**: 36 chains of 2 steps, every ending a clipping. 5. **The Gazette corner**: the last headline at the gossip chip. 6. **Elections**: map, call button, run-up, tally board, result sheet.
7. **The Office wall**: portraits greying each term, photographs of towns left, Grand Projects, former opponents; terms served as plain facts.
8. **The vanity shelf**: one monument offered a term from mayor term 2 for 600 s of B (tune 300 to 1,200), ×1.02 income for good, from 24 written ones (a bust of yourself; a bust of the bust); declining is free. Statues live here, not on papers.
9. **The scrapbook**: 144 clippings and a headline per election; a collection only, giving no Name Recognition.
10. **The Standing Order** (governor term 2, a Ledger switch): Cuthbert Wimble buys the advised level while you play when cash ≥ 3 × its price plus the reserve; never while away.
11. **Shop and rewarded ads.** Products (none random, a currency or a multiplier; none touches a mood, the poll or the count): `office_long_lunch` "Long Lunch" (unlock, $3.99, +4 h away cap); `office_walnut_desk` "Walnut & Brass Desk Set" (cosmetic, $2.99); `office_portrait_frames` "Gilt Portrait Frames" (cosmetic, $1.99, the wall's frames and wallpaper); `office_private_secretary` "Skip the Ad Videos (Private Secretary)" (skipAds, $4.99, described as "Get every Watch-ad reward without watching a video."). Rewarded ads (optional, from a button, play-clock cooldowns, a failed load loses nothing): away report +50 %; **Check the Sofa** (+40 s of B once a term, less than one 45 s campaign paper); **Call the Spin Doctor** (ends "Say nothing"); **Send a Courier** (ends a boycott); **Open the Doors** (fills the in-tray; 15 min play cooldown). Nothing is offered from the call to the end of election night; no interstitials or banners; AdMob's "Politics" category blocked.

Cut on purpose: chests and random rewards, missions, a manifesto, daily gifts, energy, premium currency, timed offers, starter packs, leaderboards, push notifications, Bigger In-Tray.

## 6. Sound and haptics

Wood, brass, pen nib, pneumatic air, a distant bandstand; no pluck, marimba, bell ladder, steam, felt or chiptune (the best-known swipe card game's score); paper rustle short (Lantern Row's world is paper). `soundPack` null; files from `scripts/audio/recipes_office.py`, `render_office.py`, `office_music.py` into `games/high-office/assets/sfx`; catalogue `src/services/fx/catalog.decree.ts` (Node only); gate `compare.py` cross-key at 0.6 against all three; a person listens. Keys: paper_arrive (door knock, card-stock slap, at most every 5 s), slip_arrive (a ledger page slid on baize), sign_ink (a nib scratch growing from 40 pt, light haptic), sign (the wire tray's clink, medium), study (the drawer creaking with distance, a wooden slide, medium), take_back, denied (a dull desk tap), buy_level and open_ministry (nib tick and coin; brass latch and tuba blat), appoint (camera shutter), storey (hand bell), ribbon (scissors, clarinet), boycott_start and end (a wordless kazoo chant; a door unlatched), scandal (a newspaper slapped down, muted trombone), clipping, call_election (gavel, medium), env_open and tally (snare roll, chalk), district_held and lost (tuba-and-snare sting with success haptics ≥ 300 ms apart; trombone slide), majority and defeat (8 bars of "The Middling March", heavy; one tuba playing it slowly), ui_open and ui_close, and 90 s loops music_desk (bassoon, pizzicato, brushes at 90 bpm) and music_campaign (a brass march at 112 bpm). Haptics follow the thumb and rare peaks, at most 8 a second, none for taxes, arrivals or payouts. Shared keys map in `src/modes/decree/soundKeys.ts`.

## 7. The invented country, cast, voice, papers, writing and store page

### 7.1 The country

The Republic of Middling, motto "Proudly Adequate"; its founding law written on a napkin; emblem a goose with giant scissors on a beige field (no stripes, stars, eagles, seals or real buildings); "The Middling March", no anthem; currency the dib. No parties exist. Honours are invented (Keeper of the Ceremonial Spoon, Grand Goose (Second Class)): no knights, dames or crowns.
- Dithering-on-the-Dawdle (mayor): Market Ward, Mill Ward, Hilltop, Riverside, Old Town; the Dithering Daily Drizzle.
- The Province of Upper Wobbling (governor): 7 counties named by writer 2; the Upper Wobbling Evening Fuss.
- The Republic, capital Middlingham: Middlingham, Fogmoor, Brassby, Teacup Downs, Gusting Heights, Muchpuddle, Saltpenny Bay, Kitewell, Upper Wobbling; the Middling Morning Murmur.

Every proper noun goes into `scripts/content/office/names.json` with a check against four lists (politicians of any rank; notorious public figures; famous fictional politicians and civil servants; places and characters of children's fiction), its date and checker, by generic web searches only, never the project's name; the sensitivity editor signs it.

### 7.2 Clubs and feuds

Hobby clubs only, by name and feud; never a people, faith, age, class, trade, region or commuters; no trait pinned on a club. Feuds, all hobby against hobby: spotters against the window guild (noses on the glass); giant vegetables against spotters (who stand on the pumpkin patch to see the 7:02); brass bands against anglers (noise at the pond); kites against hedges (tangled strings). No paper is about traffic restriction, lanes, residents' parking, road charges or tolls; the mayor's own parking space stays (vanity).

### 7.3 The cast (about 48 busts, built from parts in code)

- **You**: one of 6 faces (Hettie Bramble, Osgood Fennel, Ada Quill, Rupert Marchpane, Winifred Tuttle, Cosmo Larkspur): "Mayor Bramble", then "Governor", "President" (never "Mr President"), "Acting" after a loss. The main butt: vain, fond of ribbons.
- **Advisors**: Rodney Spinwell, Chief of Staff (vanity, spin); Gwendolyn Abacus, Treasury Clerk (requisitions, slips); Cuthbert Wimble, the junior clerk (committees, the Standing Order); Deputy Pruella Dimity (governor; dry, hungry); Secretary Mildred Fenn (president; has seen three presidents and liked one).
- **Spokespeople**, each bringing their own club's grievances: Desmond Kerb (Bus), Pauline Till (Shops; Till's Teas), Hilda Gourdley (Vegetables), Horace Bellows (Brass), Marigold Hake (Anglers), Wendell Loft (Kites), Agnes Topiary (Hedges).
- **Lobbyists**, farce only, for their own absurd trade: Lionel Sash (Ribbon Makers' Guild), Crispin Vane (Consolidated Umbrellas), Lavinia Goss (Ornamental Fountain Council), Tobias Slake (Novelty Hats & Sons); gifts are fruit baskets, a fountain shaped like you, a hat with a smaller hat on it.
- **Others**: Ambrose Minute (Committee on Committees; a co-signer, never a club's voice), Agatha Tallow (Counting Clerk).
- **Ministers** (club ministry; desk rule): Dorothy Pockle ("References: 'She found one.'"; Bus; its requisitions ×0.9), Dorrit Pellow (Vegetables; its settlements ×0.5), Basil Ferrule (Shops; its fees ×1.2); Wendeline Hush (Shops; gossip decays after 6 quiet papers), Ermintrude Bole (Brass; its ribbons please +4), Percy Gusset (Anglers; campaign papers ×0.67); Marjorie Wren (Kites; its fees ×1.2), Osric Tamp (Hedges; "Say nothing" ×0.7), Florence Nibley (Anglers; its requisitions ×0.9). Three apply in each office.
- **Rivals**, individuals with a hobby and a slogan, never a party or colour: Councillor Prudence Plumb ("Plumb: She Owns A Hat") and 2 more (mayor); Barnaby Waft, Keeper of the Ceremonial Spoon ("Waft: Gently Onwards") and 2 more (governor); Professor Ignatius Crumb ("Crumb: Abolish Wednesdays"), Ottoline Strop, Grand Goose (Second Class) ("Strop: Firmly Seated") and 10 more (president). Each has a "back for another go" line and a resignation line about their hobby, never pressure, health or scandal.
- **Drawing:** skin tone is a palette parameter independent of every feature part; no feature exaggerated with tone; the 6 player faces cover at least 4 tones and both sexes; the contact sheet is in the sensitivity read. Names invented and English-voiced; any origin that passes the checks.
- No children, school, soldier, police, clergy or uniform; no religious or uniform headwear.

### 7.4 Voice: deadpan-memo

Dry official language about something silly; the joke on the office or on you; no puns as the main joke, no pop-culture, no catchphrases, at most 1 exclamation mark per 50 papers; never a policy opinion. `docs/design/office-style.md` adds:
- **Eight joke shapes**, each at most 20 % of a deck, tagged, no two in a row (linted): undercut, escalation, literalism, the official form misapplied, the statistic, the slogan, the photo opportunity, the callback payoff.
- **Rations:** the goose at most 1 in 40 papers, biscuits 1 in 60, one statue per office deck. **Length:** median ≤ 65 characters; 90 for at most 20 % of a deck.
- **No innuendo:** no vegetable, fruit or object is ever soft, hard, long, big or "at length". **No joke about how votes are cast or counted.**

### 7.5 Twelve finished papers

Mayor's office at B = 65 (Town Clock level 9 + Potholes level 7 = 9 + 56, about minute 2), moods 50 unless stated (f = 1); money tier × B × j (S 975, M 1,950, L 3,900 at j = 1); clubs by name here, icons on the paper; title lines left out where the poll does not change.

1. **Rodney Spinwell · Chief of Staff** (scripted, refusal): "Practise on this one. It is a form about forms. File it FOR FURTHER STUDY." (74) SIGN: No change · ↩. STUDY: every club +1 · approval 50 → 51.
2. **Hilda Gourdley · Giant Vegetable Society** (project, other Shops): "Grant the prize pumpkin the freedom of the town. It has asked very politely." (76) SIGN: −946 (j 0.97) · Vegetables 50 → 54 · Shops 50 → 47 · ↩. STUDY: Vegetables 50 → 47 · Shops 50 → 52.
3. **Desmond Kerb · Bus Spotters' Society** (swap, other Shops; butt self): "Name the 7:02 bus after you, Mayor. It is late too, and also waves." (67) SIGN: Bus 50 → 54 · Shops 50 → 46. STUDY: Bus 50 → 46 · Shops 50 → 54. With Bus at 30 (f+ 1.4, f− 0.6): SIGN Bus 30 → 36; STUDY Bus 30 → 28.
4. **Lionel Sash · Ribbon Makers' Guild** (basket): "A small fruit basket for you. No reason. Perhaps more ribbon-cuttings? No reason." (81) SIGN: Gossip 0 → 2 · ↩. STUDY: No change.
5. **Pauline Till · Shop Window Guild, with Ambrose Minute** (committee, other Vegetables; escalation): "We propose a study of why our last study took nine years. It should take about ten." (83) SIGN: −907 (j 0.93) · Shops 50 → 51 · Vegetables 50 → 48 · ↩ (a study of the study of the study). STUDY: Shops 50 → 48 · Vegetables 50 → 51.
6. **Pauline Till** (fee, other Vegetables): "Let Till's Teas sponsor the clock tower. It would chime TILL'S TEAS on the hour." (80) SIGN: +2,180 (j 1.12) · Shops 50 → 52 · Vegetables 50 → 46. STUDY: Shops 50 → 49 · Vegetables 50 → 51. (As scripted paper 3: a fixed +60.)
7. **Rodney** (vanity): "A portrait of you, Mayor, for the portrait of you in the hall. For scale." (73) SIGN: −3,780 (j 0.97) · every club −1 · approval 50 → 49. STUDY: No change.
8. **REQUISITION** (form): "Potholes Office · +1 level (now 7)"; Clerk's note "The first shovel is tired." SIGN: −458 (level 7 → 8 exactly) · Potholes +1 level · Bus 50 → 51. STUDY: Bus 50 → 49.
9. **Dorothy Pockle · applicant**: "I apply to be Minister for Potholes. References: 'She found one.'" (65) SIGN: Appoint Dorothy (Bus requisitions ×0.9) · Bus 50 → 51. STUDY: she applies again in 30 papers.
10. **Hilda Gourdley** (boycott; Vegetables 18; picket "GIVE THEM BACK"): "No more pumpkins until the Mayor returns our ribbon scissors. You know which scissors." (86) SIGN "Return the scissors": −1,300 · Vegetables 18 → 28 · boycott ends. STUDY "Keep the scissors": it runs 8 more papers. Goal line "Ad: Send a Courier (ends it now)" (32).
11. **The Dithering Daily Drizzle** (scandal; gossip 5/5; Shops 52, Vegetables 46): "MAYOR'S GOOSE GIVEN OWN PARKING SPACE. Goose declines to comment." (65) SIGN "Apologise on the steps": every club −3 · approval 49 → 46 · Gossip 5 → 0. STUDY "Say nothing": taxes ×0.8 for 10 papers, then Gossip 0.
12. **Rodney** (run-up): "Judge the Hilltop Prize Hedge Show. Say nothing about the leaning one." (70) SIGN: −2,930 · HT 48.6 → 52.6. STUDY: No change. Rally: "Hold a rally at the bandstand. Bring the big scissors. Cut something." (69) SIGN: −3,900 · Shops 44 → 48 (lowest club; 4 × 1.12 = 4.48 → 4). STUDY: No change. (In play, sized at election-time B.)

### 7.6 Two follow-up chains

A chain is a set-up (a comic paper in a deck) and one follow-up per branch; each follow-up's two choices end it in a clipping: 2 follow-ups and 4 clippings. Effects come from archetypes (shown at mood 50).

**A. "The Basket"** (set-up paper 4). Signed, 10 to 14 papers later, Lionel Sash: "About the basket: the goose at the bottom was not fruit. It would like an office." (81) Favour: SIGN Shops −3 · Gossip +1, "GOOSE GIVEN OFFICE; MAYOR GIVEN GOOSE"; STUDY No change, "GOOSE RETURNED TO SENDER, WHO DENIES OWNING A GOOSE". Studied, 10 to 14 later: "No hard feelings. Please accept this smaller basket. It is one grape." (69) Favour: SIGN Vegetables −3 · Gossip +1, "MAYOR ACCEPTS GRAPE"; STUDY No change, "MAYOR REFUSES GRAPE. GRAPE DEVASTATED". The sign branch always ends worse; no branch holds money.

**B. "The Pumpkin"** (set-up paper 2). Signed, 8 to 12 later, Hilda Gourdley: "The pumpkin, now a Freeman of the town, wishes to address the council. It has slides." (85) Committee: SIGN −S · Vegetables +1 · Shops −2, "PUMPKIN'S SPEECH CANCELLED; SLIDES LOST"; STUDY Vegetables −2 · Shops +1, "PUMPKIN ADDRESSES EMPTY HALL". Studied, 12 to 16 later: "The pumpkin has not left its crate since your refusal. It faces the wall." (73) Treat: SIGN Vegetables +3 · Shops −1 · Gossip +1, "MAYOR APOLOGISES TO VEGETABLE"; STUDY Vegetables −2, "PUMPKIN: NO COMMENT".

### 7.7 What to write for version 1, and why it is enough

**Demand.** Arrivals set the pace at every hand from 4 to 9 s: 5 a minute (4 as president). Reference timeline without nights and run-ups: mayor to 0:25 (the worst case, two terms), governor to 1:15, president to 3:00. Draw mix (events / requisitions / ribbons / applications / follow-ups / templates; the rest comic): mayor 3 / 10 / 8 / 3 / 4 / 0, comic 72 %; governor 3 / 12.5 / 8 / 2 / 4 / 15, comic 55 %; president 3 / 25 / 8 / 1 / 4 / 20, comic 39 %. With no paper waiting a slip comes; with nothing affordable either, the player reads the poll or scrapbook, or closes the app (8.4 bounds it).

| Office | Days to 3:00 | Comic draws | Supply (own + unused any-office + unseen portable) | Margin |
|---|---|---|---|---|
| Mayor | 110 | 79 | 110 + 30 = 140 | 1.8 |
| Governor | 228 (hour 1: 160) | 127 (hour 1: 89) | 150 + 13 + 15 = 178 | 1.4 (hour 1: 2.0) |
| President | 392 | 153 | 200 + 13 + 4 = 217 | 1.4 |

Cells: at least 4 texts per (club, archetype) cell as mayor (21 cells, 84 of 110) and 3 as governor and president (105 of 150; 147 of 200); the bot reports each cell's use under the reader's, always-refuse's and random's club weights. Templates: 112 draws by 3:00 from a bag of 120 frames, so none repeats. Clerk's notes on half the forms: about 30 in hour 1, 100 by 3:00, from 160.

**What to write** (`scripts/content/office/*.json`; writers choose words, visitor, archetype, clubs, subject, butt and shape, never a number): 490 comic papers (mayor 110, governor 150, president 200, any office 30; about 30 % of mayor and governor papers `portable`, with no office word); 36 chains (12 per office: 72 follow-ups, 144 clippings); forms and 160 Clerk's notes; 14 grievances with picket slogans; 20 front pages and 3 apologies; 9 applications and 9 returns; 50 campaign papers (10 / 16 / 24) and 12 rallies; 6 scripted papers; 120 one-slot frames over 10 lists of 24 phrases; lines (18 rivals with hobby, slogan, back-again and resignation lines; 30 election-night lines; 60 returning-visitor lines; 10 away lines; 24 monuments; 5 Grand Projects; 10 twists and 45 pair names; 6 captions; 16 place names).

| Person (package W, from hour 0) | Writes | Strings |
|---|---|---|
| Writer 1 | mayor deck 110, any-office 30, mayor chains 72, mayor run-up 14, scripted 6 | 232 |
| Writer 2 | governor deck 150, chains 72, run-up 20, 16 place names | 258 |
| Writer 3 | president deck 200, chains 72 | 272 |
| Writer 4 | notes 160, grievances and slogans 28, front pages 23, applications 18, president run-up 28 | 257 |
| Writer 5 | rivals 90, night 30, returning 60, away 10, monuments 24, projects 5, twists 55, captions 6 | 280 |
| Comedy editor | 120 frames, 240 phrases; edits every comic paper and chain; rewrites dead decisions flagged by H8 | 360; reads 634 |
| Sensitivity editor | `names.json` checks, deny and exception lists, every string (about 1,700) and the contact sheet; signs `RATING-NOTES.md` | reads 1,700 |

**Staging.** Hour 4: the mayor deck, its chains and forms, names and lists, and the frozen bot content from them; hour 7: the governor deck. The president deck ships only if it passes H7 and both reads; otherwise the lead reports the shortfall and the president runs on portable papers, templates and the returning-visitor form until an update. Weak jokes never make up a count.

### 7.8 The automatic safety check

`scripts/content/office/satireLint.ts` runs in `npm run validate` for decree and fails the build, over every paper, frame, phrase and frame-with-phrase (about 2,900 strings), every name, slogan, headline and line, the UI strings and the store text. Runs of all-caps tokens are lower-cased first.
- **Tier 1, always fails** (`deny-phrases.txt`, `deny-hard.txt`, any case): real slogans (drain the swamp and "drain the {swamp, marsh, bog}", build the wall, stop the boats, take back control, get it done, make … great again, yes we can, strong and stable, levelling up, four more years, lock her up, president for life, about 200 more compiled offline), trump*, bush, goose-step*, for life, third term, term limit, voted twice, extra votes, rigged.
- **Tier 2, names**: only tokens capitalised mid-sentence or in a name field, by edit distance 1 and a sound-alike code, against `deny-people.txt` (presidents, vice-presidents, prime ministers, deputies, cabinet ministers and opposition leaders of the US, UK, Canada, Australia, New Zealand, Ireland and South Africa since 1900; royals; notorious figures) and `deny-fiction.txt` (fictional politicians, civil servants and places of TV satire and children's fiction). Lower-case words never match ("May I…", "a major ribbon"); a sentence-initial "Grant" passes.
- **Tier 3, subjects**: whole words with explicit inflections ("war, wars, wartime, warring, warfare"), never prefixes: BRIEF's subjects (faith, ethnicity, nationality, migration, border, gender, sexuality, abortion, weapons, war, terror, police, prison, drugs, alcohol, disease, disability, disaster), plus economic and civic words (tax cut and rise, union, wages, pension, rent, housing, healthcare, privatisation, inflation, cost of living, climate, net zero, flood, wildfire, cycle lane, low-traffic, congestion charge, toll), election integrity (voter fraud, voter ID, postal vote, recount, gerrymander, referendum, independence), protest (riot, curfew, march) and monarchy (king, queen, crown, royal, knight, Sir, Dame); also places (about 600), real movements and party colour labels, tone (profanity, violence, bribe, corrupt, dictator, coup, fake news, vote now, ballot, Mr President, Oval Office, White House, intern), brands and other games' names. Store text also denies audit, office empire, processing, document.
- `allow.json`: exact phrases only, each with the editor's reason (flower border, herbaceous border, hedge border).
- Rules 2 to 6: a capitalised token not at a sentence start and not in `names.json` or the common-word list; a 4-digit year, URL, "#" or "election" plus a number; lengths and fit (4.1, 4.2; 4 effect slots, wide chips 2; 3 chips per mayor strip; goal line ≤ 34 characters); a subject outside the closed list (ribbons, signage, statues, ducks, geese, picnic-weather, committees, vegetable-shows, clocks, potholes, hats, fountains, bandstands, gardens, buses, kites, hedges, harbours, inventions, ceremonies, portraits, paperwork, vanity), a missing butt or butt = club (picnic-weather excludes climate, flood, drought, heat; harbour papers are never about arriving or keeping out; hedges carry no barrier jokes); shape faults (identical outcomes, a refuse that costs, a basket with money or a club gain, traps above 15 %, an orphan follow-up, an absent club, a portable paper with an office word, a joke shape above 20 %, rations broken).
- Tests: "Grant the prize", "Market Ward", "Republic of Middling", "herbaceous border" pass; "a louder trumpet", "drain the marsh", "Quail" as a surname, "Sir", "war", "warfare", "Republicans", a real country, a year and a URL fail.

A person reads every string and signs `RATING-NOTES.md`: the lint catches words, not tone.

### 7.9 Store page

- **Title: "Proudly Adequate"** (16 characters): the game's motto and running joke; no civic word, no "X: Y", no word shared with the other three titles; generic searches found no app or game of that name. The subtitle carries the genre.
- **Alternative 1: "Flick of the Pen"**, only with the genre subtitle: it names the flick, and the signature does write itself as the paper goes up; risks: a pun on "stroke of the pen", and pen-flip games in its results. **Alternative 2: "Signed, Not Read"**: the verb and the joke of the scripted second paper; untested.
- Dropped: "Rubber Stamp Republic" (a stamp the game lacks and the border-inspection game's mark, the stock insult for a real legislature, civic, near a Steam game whose president fights with a stamp) and "Sign & Shred" (the refusal is a drawer; a game-jam trope).
- The name search uses generic terms only, also tries "pen flick" and whether the title echoes slogans such as "Proudly South African", and goes into `games/high-office/store/NAME-SEARCH.md`.
- Subtitle "Funny desk, mayor to president"; Games/Simulation; keywords as row 18. First line: "An invented country and a comedy desk: push each paper up to sign it, or pull it down into the drawer marked FOR FURTHER STUDY." "Idle" and "tycoon" only further down; it says ministries earn while you are away and terms move only when you read.
- Icon (light, unlike O's navy and L's dusk): the pale paper fills the tile, a violet signature stroke flying upward, the goose with scissors; no flag, seal, eagle, ballot box or building.
- Screenshot template "signature": the game full-bleed, no frame, no paper caption; the caption handwritten in violet bottom left with a nib flourish on a translucent baize band (P: a framed card; O: a monospace band on top; L: a hanging paper tag). The front page never appears in store images or the preview video; in the game it is an obvious comic tabloid (a goose photo, a crooked masthead, no columns). Both go into `SIDE-BY-SIDE.png` before a person signs dimension 7.
- Review note: "All countries, parties, politicians, companies and newspapers are fictional. No real people, parties, flags or current events; no user-written text is shared. Elections are computed from visible numbers; no ad or purchase is offered during a campaign, and no product changes a vote."
- Rating: answered honestly (comic choices, no gambling, no contests), expected 4+ or 9+, raised to 13+ by policy.md's house rule; Play: "not a government app"; all territories except mainland China and Vietnam.

## 8. The balance bots, their targets, and the order of work

### 8.1 Order of work: rules and bot before any screen

1. Hour 0: the skeleton (9.2). 2. Hours 0 to 3: P2's prototype in `scratchpad/office/proto/` (archetypes with f± sizing, slips, count, disarray, boycotts, gossip, offline; one office, then three; every bot of 8.2; a frozen content of 60 papers). **First:** confirm 2.2's last two columns and habit win rates against `term.py`, 2.13's opening times, and that no-buy misses the Town Record; a column off by more than 10 points goes to the lead before engine code, as does every finding. 3. Hours 0 to 4: rules and tests on frozen fixtures (`src/engine/fixtures/decree.ts`). 4. From hour 3: `src/engine/decree/bot.ts` on the real engine, event to event (`WEB_ONLY`). 5. `scripts/content/decree-bot.ts` and `build-office.py`, which writes game.json only when every hard target passes on seeds 12345, 4, 99, 7, 2026 (tuning on 101 to 115; pass counts, never one median). 6. Screens build against fixtures and are wired to tuned data after step 5.

### 8.2 Bots

Hand model: a decision 6 s after landing (also 4 and 9 s), plus the 2 s rest after a sign; a slip 1.5 s; a sheet 3 s; election night 12 s. No bot sees a hidden number.
1. **Reader** (reference) sees only what the strips print and scores each outcome in seconds of B:
   V(o) = money/B + 0.012 × ΔA/M(A) × H × (I/B) + Σ_d 60 × Δshare_d × max(0, 1 − |share_d − 50|/8) × (day/D) − 10 × Δgossip − 120 × [starts a scandal] − 120 × [starts a boycott] + 60 × [ends a boycott] + Δrate × H/B + 300 × [appoints],
   ΔA = Σ_g W_g × shown_g, Δshare_d = Σ_g w_{d,g} × shown_g (+ campaign points), H = min(600, τ × (D − day)). It takes the higher V; when short it waits if the shortfall is ≤ 20 s of I and V_sign − V_refuse ≥ 15, else refuses; it takes slips by `advice()`, calls at majority + 1 (or at day ≥ 0.85 D with a majority), moves up when allowed. Its constants are reported, never tuned.
2. **Always-sign** (waits up to 20 s when short), **always-refuse**, **random** (a seeded coin), **money-only**, **mood-only**: they handle slips, buy, call and move as the reader; only day-paper choices differ.
3. **No-buy** (reader choices; never takes a slip or raises; signs requisitions as the reader); **goal-follower** (buys what the goal line names the moment it is affordable).
4. **Passive** (5 sessions of 8 minutes a day, takes the away ad); **check-in** (every 4 h, decides the tray, buys for 2 minutes); **idle**; **ad-everything** (passive with every product and ad).
5. **Adversaries** (reader plus one habit): clock +4 h, −4 h, +4 h; reload after every draw, every decision and inside the take-back window; hoard the tray; quit during election night; close the app during every boycott and scandal; absences of 299 s and 301 s; flick at 1 s without reading.

### 8.3 Hard targets (every seed; the build fails on a miss)

- **H1 Printed equals applied:** 0 differences over every decision and slip (each club of an "every club" chip included); 0 clamps; no stored paper field changes; stale forms leave with no effect.
- **H2 The poll is the count:** 0 differences; announcement order as 2.10.
- **H3 Determinism:** byte-identical traces at 10 Hz and event to event; reload adversaries equal the reader; a take-back restores the paper byte for byte.
- **H4 Offline:** the closed form equals stepping under and over 300 s; away time moves no mood, gossip, counter, day or poll; clock forward, back, forward pays once; earnings are in cash before the report closes.
- **H5 Coins:** dibs enter only through the tick, paper gains, the away payout and its ad top-up, Check the Sofa, the transition fund; cash ≥ 0; refusing never costs.
- **H6 No dead end:** refuse always available; every boycott and scandal ends within its count; ministry 0 always earns; the 2.11 bound ≤ 8; every deciding bot wins within 6 terms of its first loss at a seat (15 seeds); from the three habit bots' states at the start of their first term after 2 h, the reader wins within 2 elections in at least 13 of 15 seeds.
- **H7 Text:** at 4, 6 and 9 s, for the reader, always-refuse, random and ad-everything bots (15 seeds): no hand-written text, frame, Clerk's note or picket slogan twice in hour 1; hand-written repeats in hours 2 and 3 ≤ 2 % of comic draws; no cell empty while its club is drawn in hour 1; the satire lint passes.
- **H8 A real choice:** each paper the reader decides in hours 2 and 3, re-evaluated in the states of its 10 previous decisions, gets both choices for at least 30 % of texts; the reader signs 40 to 65 % of day papers, differs from money-only and mood-only on ≥ 25 %, and from "the side whose printed title line looks better" on ≤ 30 %.
- **H9 Reading beats habits** (30 paired seeds, noise band shown): wins reader ≥ 85 %, always-sign ≤ 45 %, random ≤ 35 %, always-refuse ≤ 25 %; time to president ≥ 1.5 × the reader's for the three habits and no-buy, ≥ 1.2 × for money-only and mood-only; NR at 3 h ≤ 0.6 × for the habits.
- **H10 Money cannot reach the vote** (ad-everything against passive, 30 paired seeds, per term): election share, poll margin and NR per term within 3 points. Time to president within the computed bound plus 3 points: Open the Doors adds at most 2.5 uses × 9 papers a day, about 9 % of 250; ad and product money only reaches the record, which does not bind the reader; bound 9 %. The reader finds sign unaffordable on ≤ 5 % of papers.
- **H11 Number range:** below 1e30 over 30 passive days and a 60 h reader.
- **H12 No gossip spiral:** the reader from the always-refuse state at its first term start after 2 h lifts approval from below 35 to 50 within 80 papers in at least 13 of 15 seeds.

### 8.4 Aims (reported; the lead sets each band once after the first tuned run, as merge M2 and M54)

- Opening: first paper by 10 s, first purchase by 0:20; minutes 0 to 10: a paying moment every 30 s at the median, ≥ 70 % of thumb actions flicks, ≥ 20 purchases.
- Idle desk (4, 6, 9 s; minutes 0 to 30 and hours 1 to 3): empty desk ≤ 10 % of governing time at 6 s; nothing on the desk and nothing affordable for at most 8 s at a stretch.
- Pace at 6 s: first election 11 to 15 min, governor 12 to 30, president 55 to 95; 4 and 9 s within ±10 %; every ministry opens by half of its office's first term.
- Tension: median margin 1 district; 2 districts within 5 points in half the elections; first election won in 13 of 15 seeds.
- Per bot: reader ≤ 1 boycott an hour and ≤ 1 scandal per 2 h; always-refuse ≥ 2 boycotts an hour; always-sign ≥ 1 scandal a term (model 1.7); the reader refuses ≥ 80 % of baskets.
- Money: paper gains 10 to 25 % of dibs in hours 0 to 3; papers take 20 to 35 % of the reader's income, 45 to 70 % of always-sign's; the goal-follower finds ≤ 10 % of papers unaffordable on landing; a new office passes the old income in 4 to 8 min.
- Offline: 1 h away with the ad pays 0.3 to 0.6 of 1 h active; the close-during-a-boycott adversary gains ≤ 0. Passive: governor day 1, president day 2, term 45 to 50 by day 21; the day its comic repeats pass 20 % is reported.
- Novelty: something new every 3 min in minutes 0 to 30, every 15 min in hours 1 to 3.

Knobs (section 2's ranges): S, the ministry step, r, cost growth; τ, the away interval and rate; D and the call fraction; R; NR and record requirements; archetype shares and ±1 per base effect; money tiers; q; the request interval; G_max; m_N; Y; the vanity price and factor; the transition fund. Order: habits (archetype nets, tiers, vanity share, R); pace (requirements, D, r and costs); elections (R, starting moods, campaign stakes); text (q, then τ). Mood bases beyond ±1 are content (the editor). No rule changes after screens exist without the lead.

## 9. First version and later

### 9.1 In the first version

Everything in sections 2 to 7, plus web presets `?preset=fresh|early|mid|late` from bot states and dev views `decree-art` (the contact sheet in greyscale and tone variants, faces distinct at 44 pt, the brick share) and `decree-layout`.

### 9.2 Work packages for about eight engineers, with files owned and order

**Hour 0 (P0, by P3's engineer, 30 to 60 min):** `src/engine/decree.ts` (types and signatures, bodies throwing "not built yet"); the wiring below; `src/config/schema.decree.ts` with 2.2's values; a placeholder `games/high-office/` so the web preview starts; `src/ui/decree/strings.ts` with one section per package, each edited only by its package; hint keys in `src/ui/hints/targets.ts`; `docs/design/office-build-plan.md`.

**First, rules, prototype and bot** (no screen uses a number before P2's gate):
- **P1a Rules, paper core (1):** `src/engine/decree/` `types`, `params`, `create`, `draw`, `size`, `decide`, `slips`, `followup`, `strike`, `scandal` and tests; `src/engine/fixtures/decree.ts`. `types` freezes at hour 2.
- **P1b Rules, time and term (1):** `tick`, `offline`, `term`, `count`, `move`, `advice`, `twists`, `ministers`, `hints` and tests; `src/engine/decreeMode.ts`; `decree.ts` and `schema.decree.ts` after hour 0.
- **P2 Prototype, bot, tuning (1, from hour 0):** the prototype (from `proto/rev2/econ.py`, `term.py`); `src/engine/decree/bot.ts`; `scripts/content/decree-bot.ts`; `build-office.py`; generated `src/config/decree.content.ts` and `games/high-office/game.json`; the decree hook in `scripts/validate.ts` (additive) running 8.3.
- **P3 Wiring, tooling, store (1), all shared changes additive:** `ModeId` (`src/modes/contract.ts`), `MODES` (`scripts/lib/games.js`), the `mode` enum and opaque block (`src/config/schema.ts`), `FxMode` and the catalogue (`src/services/fx/catalog.ts`, `scripts/lib/fxCatalog.js`); **the 2.15 seams** (`paysOnCompute`, `catchUpSeconds` on `EngineMode` in `src/engine/mode.ts`, handled in `src/state/store.ts`; unset for the other modes, which behave exactly as before); `scripts/lib/modes.js` (`MODE_FOLDERS.decree`: `src/modes/decree`, `src/ui/decree`, `src/engine/decree`, `src/engine/decree.ts`, `src/engine/decreeMode.ts`, `src/engine/fixtures/decree.ts`, `src/config/schema.decree.ts`, `src/config/decree.content.ts`; `NODE_ONLY` + `catalog.decree.ts`; `WEB_ONLY` + bot, fixtures, `presets.web.ts`, `devViews.web.ts`; `THEME_WORDS.decree` mayor, governor, ministry, ward, gossip, scandal, boycott, dibs if `--words` allows); `scripts/lib/fingerprint.ts` and spam.md's row; `src/modes/decree/` (`index.tsx`, `actions.ts`, `fx.ts`, `soundKeys.ts`, `presets*.ts`, `devViews*.ts`); `src/modes/entries.test.ts`; `satireLint.ts` (code; lists are W's); `src/ui/hints/targets.ts` and `src/ui/decree/DecreeShell.tsx` (slots for P6 to P8); the store package (`games/high-office/store/`: `fingerprint.json`, `REVIEW-NOTES.md` with the Orbit and Paperwork Inc arguments, `RATING-NOTES.md`, `NAME-SEARCH.md`, `releases.json`, `store.config.json`; `scripts/content/office-store.json`); `check:bundle` for all four games.
- **P4 Art (1):** `src/ui/decree/art/` (palette; the bust parts with tone independent of features, 48 faces; ageing portraits; desk props, tray, drawer stages, door, sticky note, the pen hint; club and effect icons with two-tone patterns; storeys; district paths; election-night cut-outs; monuments; the wall), `bakeAtlas`, the light icon, the "signature" template.
- **P5 Sound (1):** `scripts/audio/recipes_office.py`, `render_office.py`, `office_music.py`, `games/high-office/assets/sfx/`, `catalog.decree.ts`; the cross-key run.

**From hour 2, against fixtures:** **P6 Desk and flick (1):** `layout.ts`, `paperMetrics.ts` (+ tests), `src/ui/decree/desk/` (canvas, paper and slip, the responder, ink, take-back, tap-tap, trays, drawer, door). **P7 Bars, sheets, views (1):** `src/ui/decree/hud/`, `sheets/`, `views/`; steward of `strings.ts`. **P8 Hints, platform, QA (1):** `hints.ts` (the pen as `parts.HintPointer`), `back.ts`, the loading screen, overlay registration, the device checks of 10.1.

**W Writing (its own package: 5 writers, a comedy editor, a sensitivity editor, from hour 0):** `docs/design/office-style.md` first (voice, joke shapes, rations, lengths, the cell matrix); `scripts/content/office/` (`papers.mayor|governor|president|any.json`, `chains.json`, `forms.json`, `events.json`, `campaign.json`, `templates.json`, `phrases.json`, `lines.json`, `names.json`, `deny-*.txt`, `allow.json`); the read in `RATING-NOTES.md`. Split and stages: 7.7.

After P2's gate: numbers into screens, reviews, fixes. The first three games do not change: no file of `games/pizza-empire|space-miner|night-market`, `src/modes/sim|haul|merge`, `src/ui/sim|haul|merge`, `src/engine/haul*`, `src/engine/merge*`; `modeRegression.test.ts` green with recordings untouched; earlier fingerprint reports and same-key compare results byte-identical (bundle reports excepted, BRIEF.md).

### 9.3 Later

More papers per office and 3-step chains (content updates); more rivals; the manifesto, if a version ad money cannot reach is found; tablet layout; translations, each with a local read. Never: energy, paid random items, a sold minister, a purchase or ad that moves a mood or a vote, countdown offers.

---

## 10. Acceptance checks and tests

### 10.1 What anyone can see (web preview, `GAME=high-office`; then a phone)

1. The first three minutes play as 3.1. 2. Thresholds as 4.3 (90 pt both ways, fast flicks at 48 up and 24 down, spring-back, second finger, tap-tap, take-back); never sideways or tilted. 3. On 30 papers and 30 slips every printed number is applied; warnings show first; free exits work; a stale requisition leaves with no effect. 4. Poll equals count, safest first; a loss keeps everything and shows "Acting"; no ad or shop during the run-up and night. 5. Both sizes at font scale 1.0 and 1.3: nothing clipped, overlapped or wrapped; Android back as 4.4. 6. Away 1 h and 4 minutes: earnings in the treasury before the report closes, the ad adds half, clock jumps pay once, nothing else moved. 7. A person fills `fingerprint.json` `human` and listens.

### 10.2 Tests that must exist (vitest)

Engine (`src/engine/decree*.test.ts`, fixtures only): `size` (the lemma for every m and Δ −10 to 10, the fixed +10, every factor; money at the draw, moods at landing); `decide` (applied equals shown on 10⁵ states; short sign refused; refuse free; take-back; stale and capped forms void); `draw.property` (order, set-ups, no repeat while unseen texts remain, cells and fallback, frame bag, reloads); `slips`; `strike` and `scandal` (triggers, warnings, exits, re-arming, no gossip from approval, the call open); `term` (call, set-aside, campaign papers moving no counter, the reset ending boycotts at 25, 2.17's order); `count` (shares, 50.0 ties, order, the 2.11 bound); `move` (resets, carries, both requirements, ministers following their club); `twists` (composition to term 181); `tick.split`; `offline` (30 s, 299 s, 301 s, 4 h; caps; clock jumps; carry; frozen boycott factor); `coins`; `advice`; `determinism`; `decreeMode` (create, reconcile, `decree1`, invalid block, `offlineAdMultiplier` 1.5, `roundPayout`, the two seams, `entitle`).

Shared and tooling: `modeRegression.test.ts` unchanged and green, plus a store test that a mode without the seams pays and catches up as before; `entries.test.ts` pins the decree entry; `fingerprint.test.ts` (`office-ladder`; earlier reports byte-identical; 8 of 8 and ≥ 15 per game); `bundleRules.test.ts`; `layout.test.ts` and `paperMetrics.test.ts` (zones and rows add up at both sizes and scales; chips; the longest bar strings; targets ≥ 44 × 44); `satireLint.test.ts` (7.8's cases); compare.py cross-key; store checks (title, subtitle, keywords, `office_`, kind multiset).

### 10.3 Before declaring done

`npm run typecheck`, `npm test`, `npm run validate` (decree gates and the satire lint), `npm run lint:worklets`, `npm run check:bundle` for all four games, `-- --export` before a release; look at the game in the web preview at both phone sizes.

---

## 11. Lead decisions

A decision here overrides the text above where they differ. Decisions are numbered D1, D2, … in the order taken.

**D1. Title.** "Proudly Adequate" leads; the name search decides (it also checks the echo of buy-local campaigns). Runners-up: "Signed, Not Read", "Flick of the Pen".

**D2. "Open the Doors" stays** as 5.11 and H10 have it: it is a time-saver (ruling 6 allowed filling the in-tray), every mood still moves only by a paper the player decides, and H10's two gates (votes per term within 3 points; time within the computed bound) guard it. If the prototype or the bot shows the vote gate failing, the ad is cut, not the gate.

**D3. Products.** The four of 5.11 stand ({unlock, cosmetic, cosmetic, skipAds}). The store reviewer of the listing step rules on whether the shop reads as Lantern Row's; if it does, the second cosmetic changes, never the principle (nothing random, nothing that reaches a mood, the poll or the count).

**D4. The idle layer is accepted as revised** (budget slips on the desk, storeys every 12 levels, a read-only Ledger with one untaught "Raise", ministers as desk rules). The planning count against Pizza Empire is 17 of 19.

**D5. Writing: all three decks are written for version 1**, in parallel, to the counts of 7.7. 7.7's staging rule stays as the fallback: a deck that fails H7 or either read does not ship, the lead reports the shortfall, and weak jokes are never shipped to make up a count.

**D6. Confirmed as revised:** a boycott's natural end brings no mood change; "Say nothing" does not block calling the election; a campaign paper takes nothing from another district; after a loss the seat is held as "Acting"; the winner resigns over a hobby.

**D7. Who owns the safety check and the two content formats.**
- The writing package's first step (the "content desk") owns `scripts/content/office/satireLint.ts`, its tests, every deny and allow list, `names.json`, and the **authoring format**: `scripts/content/office/format.ts` (zod schemas and types of every authoring file of 9.2 W) with `scripts/content/office/check.ts` (a command a writer runs on one file: format, lengths, fit, tags, lint). It exists before any writer starts. P3 does not write the lint; it only calls it from `scripts/validate.ts`.
- The skeleton owns the **runtime format**: the deck inside the game.json `decree` block (`src/engine/decree/types.ts`, `src/config/schema.decree.ts`), with the field names of 2.7.
- `scripts/content/build-office.py` (P2) maps the authoring files onto the runtime deck and fails loudly on a field it cannot map. Whoever of the content desk and the skeleton finishes second reads the other's file and keeps the same names for the same things.

**D8. Packages as built.** One skeleton engineer does P0 and every shared change of P3 (9.2), checked by an independent engineer, with one pass of fixes, before any rules engineer starts. The store texts and the name search are a separate listing step. The numbers prototype is its own step (not committed); `bot.ts` is written by a third engineer beside P1a and P1b, against the public interface.

**D9. The reads that 7.7 and 7.8 give to "a person".** In this build the comedy editor and the sensitivity editor are engineers; their reads are recorded as theirs in `RATING-NOTES.md` and `names.json`. A read by the owner (or someone the owner names) before a store submission stays required and is listed among what the owner must do; nothing in the repository may say a person signed what no person signed.

**D10. What changed from what the owner was told, to be reported to the owner:** the campaign rally is an in-game paper paid from the treasury, not an ad, and no ad or purchase can move a mood or a vote (ruling 6); a strike is shown as a club's boycott; schools are not among the ministries (policy research 4); the age rating is to be raised by hand to 13+ and two territories left out at submission (7.9), which are the owner's choices.

**D11. The shop must not read as Lantern Row's** (the store reviewer's ruling under D3). Five products, none random, none reaching a mood, the poll or the count:
- `office_standing_order` "Junior Clerk on Duty" (unlock, $3.99): the Standing Order of 5.10 is available from the first day in office instead of from governor term 2. It only buys levels the player could buy, while the app is open.
- `office_long_lunch` "Long Lunch" (unlock, $1.99): the away cap is 6 h instead of 4 h (+2 h, not +4 h).
- `office_walnut_desk` "Walnut & Brass Desk Set" (cosmetic, $2.99) and `office_portrait_frames` "Gilt Portrait Frames" (cosmetic, $1.99), as 5.11.
- `office_private_secretary` (skipAds, $4.99): display name "Skip the Ad Videos" (Apple allows 30 characters), description within 45 characters, in the game's own words.
The kind multiset is {unlock, unlock, cosmetic, cosmetic, skipAds}. H10 runs with all five held.

**D12. The goose is written, not drawn as a mascot** (store review: a goose making off with an object is the signature image of a very well-known comic game, and goose characters front another live mobile game). The emblem of the Republic is a pair of giant ribbon-cutting scissors over a folded napkin on a beige field. The goose stays in the writing under its ration (7.4), may appear as a small photograph on the comic front page, is never drawn holding an object, and never appears on the icon, the splash, the loading card or a store screenshot. The icon is the pale paper with the violet signature flying upward and the ribbon scissors as the only prop. This replaces the goose in 5, 7.1 and 7.9.

**D13. Store wording.** Subtitle "Sign silly papers, run a town" (29) unless the listing's revision finds a better one within 30. The promise about money is always stated as the mechanism, which is true: "No ad or purchase moves a mood or a poll point: those move only by papers you decide, and none is offered from the call until election night ends." The rating notes describe the basket exactly (a gift can be accepted; it never pays the mayor or pleases a club, it adds gossip, and its favour costs the mayor), never as "no bribe pays off". The category pair Simulation and Strategy is shared with Orbit Haulers and accepted.

**D14. Renames from the name search:** the first presidential rival is no longer Professor Ignatius Crumb (a candidate of that surname stands in a well-known children's novel), and Councillor Prudence Plumb is renamed too (a real president of a parliament bore the surname). The sensitivity editor chooses the new names in `names.json`; the names in 7.3 and 7.5 are superseded by the register wherever they differ.
