# High Office: build plan (work packages)

Status: written by the skeleton step (spec 9.2 "Hour 0", decisions D7 and D8), 23 November 2026, and
revised in its one pass of fixes after the independent check (the same day; decisions D15 to D24 are
in the interface: disarray Y(n) = 2^(n+1) − 2, the slip and run-up reserves, slips between papers,
the bigger study and the favour written with their paper, ribbons at club-less ministries, and every
number of a paper fixed when it lands). The
specification is `docs/design/office-design.md` (its section 11, the lead's decisions, overrides the
text above it). How a game's bundle is decided and how a mode is added: `docs/design/space-bundle.md`.
Project rules: `AGENTS.md`. Briefing for every engineer: the lead's `BRIEF.md` in the shared notes.

The skeleton leaves the app running in the decree mode: `GAME=high-office` starts in the web preview
(the shared server on port 8303) on a placeholder screen: the bars at their final zones of 4.1 as plain
text, the desk paper as plain text (visitor, proposal, both strips' printed effects from the rules'
`stripOf`) and two plain buttons "Sign" and "Study". Every file named below exists at its final path
with its final exported names and props (or is named as "to create" by its owner). Replace a body or a
box; keep the path, the names and the signatures. A signature of `src/engine/decree.ts` or a seam type
of `src/engine/decree/types.ts` changes only with the other rules package's agreement and the lead's.

## How to work

- One package per engineer. **Edit only the files your package owns** (the table below names every file
  under `src/engine/decree*`, `src/ui/decree`, `src/modes/decree`, `scripts/` (the decree ones) and
  `games/high-office` once). A file you need changed: one line in the shared `requests.md`
  (`[label] file: what and why`) and carry on with a local stand-in in your own files.
- Never branch on a game id; the engine stays pure (`src/engine/`: no React, no `Math.random`, no
  `Date.now`; randomness only from `rand(g, site)` of params.ts); state changes only through
  `decreeActions` (`src/modes/decree/actions.ts`); sound and haptics only through `fx.play` with keys of
  `src/services/fx/catalog.decree.ts`; every dialog is the kit `Sheet` or registers with `useOverlay`;
  worklets call only worklets; **a screen never computes a price, a rate, a share or a time**: it asks
  `src/engine/decree.ts` (the list is in that file's header) and only formats.
- The decree mode never imports the `tabs` family (`src/ui/shell`, `src/ui/home`, `src/ui/meta`,
  `src/ui/play`, the header group, `src/ui/art/{draw,kit,raster,clock,types,props}`) or another mode's
  folders. A new file under `src/` outside the decree folders must be listed in `scripts/lib/modes.js`
  (ask the wiring owner); a new file inside them needs nothing.
- The first three games do not change: no file of `games/pizza-empire|space-miner|night-market`,
  `src/modes/{sim,haul,merge,classic}`, `src/ui/{sim,haul,merge,scene}`, `src/engine/haul*`,
  `src/engine/merge*` is edited, and `src/engine/modeRegression.test.ts` stays green with its
  recordings untouched.
- Selecting a game rewrites `src/generated/*` for everyone: wrap it in `flock /tmp/itf-select.lock ...`
  and select only `high-office`. The web preview is SHARED (port 8303): start it with
  `bash <scratchpad>/ui/serve-office.sh` (never a second server), screenshot with
  `node <scratchpad>/ui/shot.js "preset=mid" out.png --port 8303 --w 375 --h 667`; stop every browser
  you started (`pgrep -fa "chrome-headless|drv.js"`).
- Before you hand in: `npm run typecheck`, the test files you touched
  (`NODE_OPTIONS=--max-old-space-size=3000 npx vitest run <files>`), `npm test` once,
  `npm run lint:worklets`, `npm run check:bundle`, `npx tsx scripts/validate.ts high-office`, and look
  at your screens in the preview. Switches: `preset=fresh|early|mid|late` (the fixtures until the bot
  exists: early = `mayorMidTerm`, mid = `governorAtCall`, late = `presidentTerm3`), `view=loading`.

## Three shared rules files, in sections

`src/engine/decree/types.ts`, `src/engine/decree.ts` and `src/config/schema.decree.ts` are read and
extended by both rules packages. Each is split into marked sections, and **a package edits only its
own section**; a change in the other's section, or in a SEAM section, goes through `requests.md` and
the other package's agreement (at hour-2 freeze speed: one line, answered within the hour).
- `types.ts`: **SEAM** (Paper, Effect, Outcome, FollowUpRef, Shown, ShownEffect, Slip, Purchase,
  DeskItem, Pending, the state and its parts, Factors, FactorValue, DecreeParams, CashSource, the
  event union `DecreeEvent = PaperEvent | TermEvent`): agreed by both, edited by P1a; **P1a** (Chip,
  Strip, StripNote, LedgerRow, Ledger, TopBar, `PaperEvent`); **P1b** (PollRow, Poll, TermRibbon,
  About, Goal, AdviceResult, MoveChoice, ResultSheet, MoveSheet, AwayReport, DecreeAdKind, `TermEvent`).
- `decree.ts` (the index): **BLOCK P1a** (the exports of params, create, draw, size, decide, slips,
  followup, strike, scandal) and **BLOCK P1b** (tick, offline, term, count, move, advice, twists,
  ministers, hints, grants). Each package adds its own files' exports in its own block.
- `schema.decree.ts`: **SECTION P1a** = the runtime deck (`DeckSchema` and its record schemas), the
  effects of 2.7 (`BaseEffectSchema`) and the archetype table, with the content desk's agreement on
  every field name (D7); **SECTION P1b** = everything else (offices, clubs, ministries, money, forms,
  ministers, twists, the other values, `RANGES`, `lintDecree`).

## Packages and the files they own

Decision D8 arranges 9.2's packages as below. Every rules body that is not built yet throws
`notBuilt('<name>')` (`src/engine/decree/notBuilt.ts`): its doc comment says "Skeleton: throws
notBuilt" or "Built"; the store actions catch it and play `denied`; the placeholder screens print "not
built yet".

| Package | Owns (after the skeleton) | Shows it works |
|---|---|---|
| **P1a Rules, paper core** (1) | `src/engine/decree/types.ts` (its SEAM section with P1b's agreement, its P1a section; frozen at hour 2), `params.ts`, `create.ts`, `draw.ts`, `size.ts`, `decide.ts`, `slips.ts`, `followup.ts`, `strike.ts`, `scandal.ts`, `notBuilt.ts` (delete when unused), BLOCK P1a of `src/engine/decree.ts`, SECTION P1a of `src/config/schema.decree.ts`, `src/engine/fixtures/decree.ts` and its frozen numbers `src/engine/fixtures/decree.numbers.json`, their tests (`src/engine/decree/*.test.ts` on these files: `size`, `decide`, `draw.property`, `slips`, `strike`, `scandal`, `coins`, `determinism` of 10.2) | `npx vitest run src/engine/decree` |
| **P1b Rules, time, term and wiring** (1) | `src/engine/decree/tick.ts`, `offline.ts`, `term.ts`, `count.ts`, `move.ts`, `advice.ts`, `twists.ts`, `ministers.ts`, `hints.ts`, `grants.ts` (the skeleton added it: 2.6's grants of 5.11, the Standing Order, the face, and whether an ad or the Shop may be offered have no other home), the P1b section of `types.ts`, `src/engine/decree.ts` (the index: BLOCK P1b, and the file's structure), `src/engine/decreeMode.ts`, `src/engine/decreeMode.test.ts`, SECTION P1b of `src/config/schema.decree.ts` (fields, defaults that are rules, `RANGES`, `lintDecree`), `src/modes/decree/actions.ts`, their tests (`tick.split`, `offline`, `term`, `count`, `move`, `twists`, `advice` of 10.2) | `npx vitest run src/engine/decree src/engine/decreeMode.test.ts` |
| **Bot and numbers** (P2, 1; D8: the bot beside P1a and P1b, against the public interface) | `src/engine/decree/bot.ts` (the bots of 8.2; typed stubs now), `scripts/content/decree-bot.ts` (to create), `scripts/content/build-office.py` (to create; maps the authoring files onto the runtime deck, D7, and writes game.json only when every hard target of 8.3 passes on seeds 12345, 4, 99, 7, 2026; it copies `scripts/content/office-store.json` into game.json and never writes `decree.skeletonPlaceholder`), `src/config/decree.content.ts` (to create, generated; its ONE reader is build-office.py, which writes its numbers into game.json, as merge.content.ts and build-night.py; the schema's defaults never import it and the rules tests never read it), `games/high-office/game.json` (generated only, replaced whole; until build-office.py exists it is regenerated by `scripts/content/office-placeholder.ts`, which P2 owns and deletes then: `npx tsx scripts/content/office-placeholder.ts && npm run sync`; it reads the listing from `office-store.json` and sets `decree.skeletonPlaceholder: true`), the decree hook of `scripts/validate.ts` (the function `decreeChecks`: it replaces the "no decree bot yet" warning with the bot's run), `src/modes/decree/presets.web.ts` (bot states, the fixtures as fallback), section 8.4's bands reported to the lead. The numbers prototype is its own step (`scratchpad/office/proto/`, not committed). | `npx tsx scripts/content/decree-bot.ts --seed 12345`; `python3 scripts/content/build-office.py`; `npx tsx scripts/validate.ts high-office` |
| **P4 Art** (1) | `src/ui/decree/art/**` (palette; the bust parts with tone independent of features, 48 faces; ageing portraits; desk props, tray, drawer stages, door, sticky note, the pen hint's drawing; club and effect icons with two-tone patterns; storeys; district paths; election-night cut-outs; monuments; the wall; `bakeAtlas`; its `devViews.ts` with `decree-art`), the light icon and the "signature" template (`scripts/art/icons/office.*`, `games/high-office/{icon,adaptive-icon,splash}.png`, replacing the skeleton's placeholders), the entry's `parts.Icon` line (asks the wiring owner) | `?view=decree-art` in the preview; `npx vitest run src/ui/decree/art` |
| **P5 Sound** (1) | `scripts/audio/recipes_office.py`, `render_office.py`, `office_music.py`, `games/high-office/assets/sfx/**`, `src/services/fx/catalog.decree.ts` (from the skeleton's first version on), `src/modes/decree/fx.ts`, `src/modes/decree/soundKeys.ts`; the cross-key run of `scripts/audio/compare.py` | `python3 scripts/audio/compare.py high-office night-market --cross`; `npx tsx scripts/validate.ts high-office` (a missing key is an error once the first sound file exists) |
| **P6 Desk and flick** (1, from hour 2) | `src/ui/decree/layout.ts`, `layout.test.ts`, `src/ui/decree/paperMetrics.ts`, `paperMetrics.test.ts`, `src/ui/decree/desk/**` (`DeskCanvas.tsx` keeps its name and props: the canvas, paper and slip, the responder, ink, take-back, tap-tap, trays, drawer, door; its review screen `desk/devViews.ts` with `decree-layout`), its section `desk` of `strings.ts` | `npx vitest run src/ui/decree/layout.test.ts src/ui/decree/paperMetrics.test.ts src/ui/decree/desk`; `npm run lint:worklets`; the preview at both sizes, font scale 1.0 and 1.3 |
| **P7 Bars, sheets and views** (1, from hour 2) | `src/ui/decree/hud/**` (`TopBar.tsx`, `ClubStrip.tsx`, `TermRibbon.tsx`, `GoalLine.tsx`, `BottomRow.tsx`, their metrics), `src/ui/decree/sheets/**` (Ledger, Cabinet, Poll, away report, move, result, call confirm, Shop, Settings), `src/ui/decree/views/**` (Election Night, the Office, the face picker), `src/ui/decree/overlays/Overlays.tsx` (its P7 block; it mounts every sheet and view), `src/ui/decree/useDecree.ts`, `src/ui/decree/placeholder.ts` (delete when unused); steward of `src/ui/decree/strings.ts` (its structure; its own sections `shell`, `hud`, `sheets`) | the preview at 375 × 667 and 390 × 844, fontScale 1.3 |
| **P8 Hints, platform, QA** (1, from hour 2) | `src/ui/decree/hints.ts` (to create: the pen as `parts.HintPointer` over the rules' `hintsFor`), `src/ui/decree/back.ts` (to create: Android back over uiState, and the AppState listener that calls `decreeActions.commitPending()` when the app goes to the background, 2.7), `src/ui/decree/prefs.ts` (to create: the player's "Buttons instead of flicks" switch of 4.4 Settings, saved in AsyncStorage under `decree:prefs:v1`, observable like the fx SettingsStore; P7's Settings sheet shows it, P6's desk reads it), `src/ui/decree/uiState.ts`, `src/ui/decree/overlays/Loading.tsx`, the P8 block of `Overlays.tsx`, the overlay registration, its section `platform` of `strings.ts`, the device checks of 10.1; the entry's `parts.HintPointer` and `hints` lines (asks the wiring owner) | the preview; `?view=loading`; a phone |
| **Store** (the listing step, label `listing`) | `scripts/content/office-store.json` (the listing; `office-placeholder.ts` and then build-office.py copy it into game.json), `games/high-office/store/REVIEW-NOTES.md`, `NAME-SEARCH.md`, `SCREENSHOTS.md`, `releases.json` (release notes; the skeleton's is a placeholder), the human checks of `store/fingerprint.json` are a person's (D9) | `npx tsx scripts/validate.ts high-office` after build-office.py; `npm run sync` |
| **W Writing, with its content desk** (5 writers, a comedy editor, a sensitivity editor) | `docs/design/office-style.md`; `scripts/content/office/` (the content desk first, D7: `format.ts`, `check.ts`, `fit.ts`, `satireLint.ts` and its tests, `deny-*.txt`, `allow.json`, `names.json`, `plan.json`; then the writers' `papers.mayor|governor|president|any.json`, `chains.json`, `forms.json`, `events.json`, `campaign.json`, `templates.json`, `phrases.json`, `lines.json`, `batches/`); the sensitivity editor's signed read in `games/high-office/store/SENSITIVITY-READ.md` (hand-written, to create; D9; `RATING-NOTES.md` is generated by sync and only links to it) | `npx tsx scripts/content/office/check.ts scripts/content/office/batches/<batch>.json`; `npx tsx scripts/content/office/satireLint.ts --game high-office` |
| **Wiring owner** (the skeleton, then the lead or whom the lead names) | `src/modes/decree/index.tsx`, `presets.ts`, `devViews.ts`, `devViews.web.ts`, `src/ui/decree/DecreeShell.tsx` (its named slots), `src/modes/entries.test.ts`, `scripts/lib/{games.js,fxCatalog.js,modes.js,fingerprint.ts,fingerprint.test.ts,bundleRules.test.ts,fingerprint.pairs.fixture.json}`, `src/ui/hints/targets.ts`, `games/high-office/store/fingerprint.json` (declared values; the human checks are a person's), `npm run check:bundle` for all four games, and every SHARED file the skeleton changed (the list at the end); a package that needs one of them changed asks here | `npm run check:bundle`; `npx vitest run scripts/lib src/modes/entries.test.ts src/state/store.seams.test.ts`; `npm run sync` |

`src/ui/decree/strings.ts` sections: `shell` (P7), `desk` (P6), `hud` (P7), `sheets` (P7), `platform` (P8).

Files `npm run sync` generates (nobody edits them by hand): `games/high-office/store/store.config.json`,
`games/high-office/store/play/en-US/*.txt`, `games/high-office/store/RATING-NOTES.md` (with a decree
branch in `scripts/sync.ts`: busts of adults drawn in code, no chests, missions or daily reward, the
basket and the money promise worded as D13, a link to `SENSITIVITY-READ.md`), `eas.json`.

## The two content formats (D7)

- The **authoring format** is the content desk's: `scripts/content/office/format.ts` (zod schemas of
  every authoring file and of a writer's batch). A writer types words, a cast id, the club, the
  archetype, the other club, the tags and a follow-up's delay range; never a number of 2.2.
- The **runtime format** is the skeleton's: the deck inside game.json's `decree` block
  (`src/config/schema.decree.ts` `DeckSchema`, `src/engine/decree/types.ts`), with 2.7's field names.
  It keeps the authoring format's names for the same things (the skeleton finished second and read
  format.ts): the sections `papers`, `scripted`, `chains`, `notes`, `applications`, `grievances`,
  `frontPages`, `apologies`, `runUp`, `rallies`, `frames`, `lists`, `night`, `returning`, `away`,
  `monuments`, `captions`; `club` (the petitioner and the draw cell), `other`, `setsUp`, `afterSign` /
  `afterRefuse`, `frame`, `phrases`, `delay`, `clippings {sign, refuse}`, `subject`, `butt`, `shape` with
  the same values (`photo-op`, the eight butts). What differs is only what the runtime needs resolved:
  a `visitor` is the printed person `{face, name, role, club}` where the authoring file has a cast id
  of `names.json`; a scripted paper carries its effects (3.1, 7.5: the rules' numbers, never typed);
  rivals, places, Grand Project and twist lines go into the tables (`offices[o].rivals`, `districts`,
  `grandProjects[].text`, `twists.list[].text`, `twists.pairNames`).
- **A Committee's bigger study and a Basket's favour (D20)**: authoring `papers[].biggerStudy` (a text)
  maps to runtime `papers[].biggerStudy` (the same text), authoring `papers[].favour` `{text, clippings}`
  to runtime `papers[].favour` `{text, clippings}` (frames likewise). Nothing else is typed: the runtime
  follow-up inherits the set-up's visitor, co-signer, club, other and tags; its archetype is the
  rules' (`biggerStudy`: a Committee at the next money tier, nothing after it, no clipping; `favour`:
  2.2's "a club −3 · gossip +1", the club that pays being the favour's own `club`, its petitioner); its
  delay is `decree.followUps.biggerStudyDelay` / `favourDelay` (tune, with RANGES). A chain's favour
  (7.6 A) is written in `chains[]` as before, with `club` = the club that pays and no `other`.
- Every archetype whose effects name the other club (project, swap, fee, treat, committee,
  biggerStudy) needs `other` on every record that uses it; `lintDecree` fails one without it.
- `scripts/content/build-office.py` (the bot and numbers package) maps the authoring files onto the
  runtime deck and fails loudly on a field it cannot map.

## The seam between the rule files

P1a and P1b wrote the bodies at the same time, each against the other's stubs; since the join
(rules-lead, 24 November) every rules file has one owner, every stand-in and test mock of the other
package is gone, and the table below is the code as it is (rules-lead keeps it in step). Everything a
screen or the bot reads goes through `src/engine/decree.ts`; `src/engine/decree/play.test.ts` plays
the whole engine through that index only.

**One cash commit, one rounding, one Factors object, one order.**

| Seam | Owner (file) | Who calls it |
|---|---|---|
| `decreeParams(cfg, g, factors?)`: every derived value of 2.4 (A, M(A) = 1 + slope × (A − 50)/100, m_N, V, rates, s_i, B, I, the "Say nothing" factor, τ, G_max, Y and R, the record) | P1a (params.ts) | tick, offline, advice, count, move, the strips, the bots: B and I are read from here only |
| `disarrayOf(rule, losses)`: Y(n) = first × (ratio^n − 1)/(ratio − 1), the ONE formula (D15 at `decree.paperRules.disarray` {first 2, ratio 2}: 2^(n+1) − 2); `disarray(losses, rule?)` the same with D15 when no rule is passed | P1a (params.ts) | `decreeParams` (so count.ts `shares` and the poll), count.ts `certainWinBound` (the validator) |
| `moodUtility(c, m)`: D25's count utility, the ONE function of the count (parameters `decree.count`: `huffBelow` 30, `huffSlope` 3, and `topAbove` 100 / `topSlope` 1, which change nothing until the lead decides the prototype's top-of-the-scale proposal) | P1b (count.ts) | `shares`, the poll's huffs, `certainWinBound` |
| `commitCash(g, delta, source)`: the ONE way **the rules** change cash (`paper`, `checkSofa`, `transition`, `spend`, and `reset`: the old treasury set aside at a move, never a gain); it books the delta itself in `stats.book` (not cash − cash) unless the 0 floor bit. The tick pays I × dt from its anchor and books it under `tick` exactly as commitCash would (tick.ts `payTo`) | P1a (params.ts) | every rules cash change on both sides. **Not** the away payout: the store pays `away` and `awayAd` through the shared `E.grantCash` (src/state/store.ts, the `paysOnCompute` seam); the bot, coins.test and play.test book those two in their own harness |
| `roundDibs(cfg, x)`: every amount shown or paid | P1a (params.ts) | both; `EngineMode.roundPayout` |
| `rand(g, site, x?)`: one value of a random site of 2.3 (`pick`, `petitioner`, `jitter`, `template`, `followDelay`, `campaign`, `rival`, `note`), its counter advanced | P1a (params.ts) | draw.ts (pick, petitioner, jitter, template, note, campaign), followup.ts (followDelay), term.ts (rival) |
| `levelCost`, `openCost`, `vanityPrice` (2.2, 5.8) | P1a (params.ts) | advice.ts, grants.ts (the Standing Order), slips.ts, the Ledger |
| `freshDecree(cfg, seed, office)`: the decree fields of an office before its first paper (ministries, moods, strikes, armed) | P1a (create.ts) | move.ts (the new office's resets) |
| `deskFactors(cfg, g)`: the ONE Factors object (2.14, 2.17 "before sizing, never after"): `combineFactors(twistFactors, ministerFactors)` (neutral with no twist and no minister); `factorFor(f, target, club)` reads one target (params.ts `factorOn` is the same function; a twist may carry two factors: Ribbon Shortage) | P1b (twists.ts; ministers.ts `ministerFactors`) | params.ts (mixes, τ, G_max, the "Say nothing" cut), size.ts (every base effect at landing), draw.ts (shares of the draw), the strip's initials |
| `freezeShown(cfg, g, paper, factors)`: the only producer of `Shown`; D23: money and moods are sized here, at landing (`sizeMoney`, `sizeMood`; a `fixed` mood copied unsized) | P1a (size.ts) | draw.ts `landPaper` / `landNext`, create.ts |
| `stripOf(cfg, g, side)`: what a strip prints, as data | P1a (size.ts) | the desk (P6), the reader bot |
| `shares(cfg, g, over?)`: share_d in hundredths | P1b (count.ts) | size.ts `stripOf` (a district chip's from/to, "HT 48.6 → 52.6"), draw.ts `drawCampaignPaper` (a district within 6 points of 50, else the closest) |
| `heldAfter(cfg, g, moodDeltas, points)`, `closeDistricts(cfg, g)`: the poll title row and the club flags of a strip | P1b (count.ts) | size.ts `stripOf` |
| `about(seconds)`: "about 9 s" | P1b (advice.ts) | size.ts `stripOf` (the note "Short by 240 · about 9 s", `StripNote` `{kind: 'short', by, about}`), slips, the goal line |
| `commitItem(cfg, g, item, choice, clock, events)`: **2.17 as one function**, calling in order: (1) `applyShown` (decide.ts, P1a; it calls ministers.ts `appoint` / `sendAway` and copies a follow-up's `Paper.clipping`), `scheduleFollowUp` (followup.ts, P1a: chains, and D20's own bigger study and favour); (2) for a day paper only: `countDay` (term.ts, P1b: day += 1, decisions ever += 1), `countDownStrikes` (strike.ts, P1a), `countDownScandal` (scandal.ts, P1a: the "Say nothing" counter, quiet and gossip decay); (3) `checkStrikes`, then `checkScandal` (P1a); (4) `checkTermEnd` (term.ts, P1b: at day D the run-up starts); (5) `landNext` (draw.ts, P1a), or a slip first (slips.ts `slipFor`, D18), never ahead of a settlement or front page waiting on top (draw.ts `isEventPaper`) | P1a (decide.ts; written by the skeleton as the order) | `decide`, `commitPending`, the slip's commit |
| `commitPending(cfg, g, clock, events)`: a pending take-back commits | P1a (decide.ts) | tick.ts (its 2 s passed), offline.ts (a take-back left pending in a killed app commits before the away rules), `decreeActions.commitPending` (a tap elsewhere, Android back, the app to the background: P8's AppState listener) |
| What the draw needs from the term: `nextApplication(cfg, g)` (ministers.ts: the minister due at days 9, 30, 60 or returning 30 papers after a refusal; D21: only one whose club the office has); the phase and day from state; the campaign papers are the term's call | P1b | draw.ts step (4) |
| What the term needs from the draw: arrivals `drawNext(cfg, g, clock, events)` and `landNext(cfg, g, clock, events)`; at a call `setAside(cfg, g)`, then `drawCampaignPaper(cfg, g, k, events)` × K τ apart (the first at once) and `drawRally(cfg, g, events)`; at a new term `restoreAside(cfg, g)`; at a move `returnToDeck(cfg, g)`, then `scriptedPaper(cfg, g, office, 1)` and `landPaper(cfg, g, paper, clock)` (the first paper of each office); time away and Open the Doors `fillTray(cfg, g, n, clock, events)` | P1a (draw.ts) | tick.ts (drawNext, landNext), offline.ts (fillTray, landNext), term.ts, move.ts, grants.ts |
| `slipFor(cfg, g)`: the slip that would land now (advice's purchase, above the reserve and D16's 15 s on an empty desk) | P1a (slips.ts) | tick.ts (1.0 s after desk and tray empty), decide.ts `commitItem` step 5 (D18) |
| `slipYields(cfg, g, events)`: an arrival meets a slip on the desk: the ONE place of 2.7's "a visitor's arrival returns an undragged slip" (`desk.slipStays` false); with `slipStays` true the slip stays and the visitor waits (the prototype's proposal, for the lead) | P1a (slips.ts) | draw.ts `arrive` (every arrival), tick.ts `arriveRunUp` (campaign papers, the rally) |
| `callDay(cfg, g)` / `callDayOf(row)`: C = the first whole day ≥ callFraction × D, the ONE formula | P1b (count.ts) | term.ts `canCall`, the ribbon and the poll, slips.ts `callFrom` (the run-up's reserve), schema.decree.ts `lintDecree` |
| The exits: `endStrike(cfg, g, club, how, events)` (strike.ts), `endScandal(cfg, g, how, events)` (scandal.ts), `sayNothingFactor` (scandal.ts) | P1a | grants.ts (Courier, Spin Doctor), term.ts (the new term's reset: boycotts at 25 end; a scandal at the term's last day), params.ts |
| `appoint(cfg, g, minister, events)`, `sendAway(cfg, g, minister)`, `cabinet(cfg, g)` | P1b (ministers.ts) | decide.ts `applyShown` (an application's sign and refuse), slips.ts `ledger` (each row's minister) |
| `advice(cfg, g)` (`.slip`, `.goal`, `.next`, `.call`) | P1b (advice.ts) | slips.ts `slipFor`, the goal line, the bot |
| `reserve(cfg, g, {everyPaper?})`, `reserveParts(cfg, g, {everyPaper?})` (`{desk, runUp}`, D16; `everyPaper`: the desk paper and EVERY waiting paper, what the Standing Order keeps back, D33, advice.ts `standingOrderReserve`; the Ledger shows it as "Kept for the desk" while the Standing Order is on), `buy(cfg, g, purchase, price, events, {auto?, free?})` (the one purchase path; `auto`, the Standing Order, is refused while a paper rests in its take-back window instead of committing it) | P1a (slips.ts) | advice.ts, grants.ts (the Standing Order), the Ledger |
| `canWatchAd(cfg, g, kind)` (with `awayBonus`, the away report's +50 %), `canShop(cfg, g)`: nothing offered from the call to the end of election night | P1b (grants.ts) | the away report sheet and the Shop (P7), `decreeActions.collectAway` / `watchAd` |
| `nextStop(cfg, g)` (event stepping), `nextVisitorIn(cfg, g)` (the door glass "Next visitor 0:07") | P1b (tick.ts) | the bot; the desk (P6) |
| A save: `reconcileDecree(cfg, base, raw)` then `reconcileTerm(cfg, g, raw)` (decreeMode `reconcile`): `result`, `appSlotsUsed` and `cashAnchor` are fields of `freshDecree`, so a saved `result: null` comes back null and a save round trip is byte for byte (play.test checks it after every action); reconcileTerm checks those three fields | P1a (create.ts), P1b (term.ts) | the store's load (decreeMode.ts) |

Shared types of the seam (types.ts): `Paper`, `Effect`, `Outcome`, `FollowUpRef`, `Shown`, `ShownEffect`,
`Slip`, `Purchase`, `DeskItem`, `Pending`, `DecreeState` and its parts (`Strike`, `Scandal`,
`FollowUp`, `Campaign`, `CountResult`, `CabinetSeat`), `Factors`, `FactorValue`, `DecreeParams`,
`DecreeEvent` (= `PaperEvent` | `TermEvent`), `CashSource`, `SITE` (the SEAM section); the screens'
types are in the P1a section (`Chip`, `Strip`, `StripNote`, `Ledger`, `LedgerRow`, `TopBar`) and the P1b
section (`Poll`, `PollRow`, `TermRibbon`, `About`, `Goal`, `AdviceResult`, `ResultSheet`, `MoveSheet`,
`AwayReport`, `DecreeAdKind`).

**The fixtures' numbers are frozen** (lesson 4): `decreeTestConfig()` reads
`src/engine/fixtures/decree.numbers.json` (the starting values with D15 to D24, written once by the
skeleton) and the frozen deck, never the schema's defaults or game.json. A rules change that needs a
new number edits that file and the tests that pin it in the same commit.

**The engine mode (decreeMode.ts)**: `id` "decree", `saveTag` "decree1", `config` (throws on an invalid
block), `create`, `reconcile` (never throws), `tick`, `income` (I_away), `activeIncome` (I), `offline`
(the closed form of 2.15; zero on the skeleton), `prestige` (`moveUp`) and `canPrestige` (`canMoveUp`),
`entitle`, `mergeReport`, `reportAlone`, `offlineAdMultiplier` 1.5, `roundPayout` (roundDibs), and the
two seams of 2.15: `paysOnCompute: true` (the store grants the earnings in the update that computes
them, resume and boot; the report only informs; its ad grants earnings × 0.5 when it completes) and
`catchUpSeconds: 0` (every absence follows the away rules).

**What screens and the bot call** (all through `src/engine/decree.ts`): `stripOf`, `topBar`,
`clubStrip`, `termRibbon`, `goalLine`, `about`, `poll`, `ledger`, `reserve`, `reserveParts`, `cabinet`,
`resultSheet`, `moveSheet`, `stickyNote`, `nextVisitorIn`, `canCall`, `canWatchAd`, `canShop`,
`decreeParams`, `roundDibs`, `hintsFor`; and through
`decreeActions` (src/modes/decree/actions.ts) one action per player action of 2.6: `decide`,
`takeBack`, `commitPending`, `raise`, `openMinistry`, `buyVanity`, `callElection`, `countVotes`,
`chooseAfterResult` (the move goes through the shared `prestige()`; the action collects the move's
events from the same pure `moveUp` and emits them once the store moved), `setStandingOrder`,
`pickFace`, `watchAd`, `collectAway` (the +50 % only while `canWatchAd(…, 'awayBonus')`).

## Order of work

1. Now: P1a and P1b against each other's stubs and the fixtures (`decreeTestConfig`, `freshState`,
   `decreeFixtures`); the numbers prototype (P2's own step) confirms 2.2's last two columns, the habit
   win rates and 2.13's opening times first and sends every finding to the lead before engine code
   depends on it. Art, sound and writing start now (no number needed).
2. From hour 2: desk and flick (P6), bars, sheets and views (P7), hints and platform (P8) build against
   `deskLayout`, `paperMetrics`, the types and the fixtures (`?preset=early|mid|late`), with **no number
   of their own**: every price, rate, share and time a screen shows comes from the rules.
3. From hour 3: the bot (`src/engine/decree/bot.ts`) on the real engine, event to event;
   `build-office.py` writes game.json only after every hard target of 8.3 passes on the five seeds.
4. **Rules and numbers before any screen reads a number**: no screen shows a price, an estimate or a
   time from a constant; until step 3's gate passes a screen shows what the fixtures hold.
5. Then numbers into screens, the reviews, fixes. No rule changes after screens exist without the lead.

## Shared files the skeleton changed (all additive)

`src/modes/contract.ts` (`ModeId` + `'decree'`), `scripts/lib/games.js` (`MODES`), `src/config/schema.ts`
(the mode enum + `'decree'`, the opaque `decree` block), `src/config/lint.ts` (the decree branch: the
block parsed and `lintDecree`, no businesses, upgrades, cast or missions), `src/services/fx/catalog.ts`
(`FxMode`), `src/services/fx/index.ts` (`FxName` includes the decree keys),
`scripts/lib/fxCatalog.js` (the decree catalogue), `scripts/sync.ts` (the decree branch of the rating
notes), `scripts/lib/modes.js` (`MODE_FOLDERS.decree` with `src/engine/fixtures/decree.numbers.json`,
`NODE_ONLY` + `catalog.decree.ts`, `WEB_ONLY` + the bot, the fixtures, `presets.web.ts`,
`devViews.web.ts`, `WEB_ONLY_STRINGS` + `decreeFixtures`, `THEME_WORDS.decree`: mayor, governor,
ministry, ward, gossip, scandal, boycott, dibs; `--words` finds none of them in shared or family
files), `scripts/lib/fingerprint.ts` (`office-ladder`), `docs/design/research/spam.md` (its row),
`scripts/validate.ts` (the decree hook: placeholder sounds, the bot and, only while
`decree.skeletonPlaceholder` is true, the satire lint as warnings; `--release` fails on any
PLACEHOLDER left in a decree game.json), `src/ui/hints/targets.ts` (the decree target keys, in its comment),
`src/engine/mode.ts` and `src/state/store.ts` (the two seams of 2.15, the only change that touches
behaviour: a mode that leaves them unset pays and catches up exactly as before, proven by
`src/state/store.seams.test.ts`, boot included, and `src/engine/modeRegression.test.ts`, unchanged and green), `eas.json`
(written by `npm run sync`).

Known consequence (BRIEF): every shared edit makes the three games' `store/bundle-report.json` stale
(dimension 8 reads "pending" until `npm run check:bundle -- --export` runs again before a release). The
three recorded pair reports are replayed byte for byte in `scripts/lib/fingerprint.test.ts`
(`fingerprint.pizzaOrbit.fixture.json`, `fingerprint.pairs.fixture.json`).
