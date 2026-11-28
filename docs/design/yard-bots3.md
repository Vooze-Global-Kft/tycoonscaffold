# Scrapyard: the bots' third measurement of stage 2, on the new economy as merged (REPORT10, 27 November)

This is the balance bots' one full measurement of stage 2 ("the works", rungs 3 to 5) on the stage as it now stands in the
main line (a13a006 and the measurement's own commits): the economy designed again (`yard-stage2-economy.md`, ruled in
`RULING2.md` 26 to 28), the fixes after the join, engine steps 5 and 6, and the three changes of ruling 28.7 (the copper hall
sold behind its one switch, the plasma cutter as the boss's own tool, the shredder line's cars brought by the garage's own
recovery truck). IT REPLACES REPORT9 (`yard-bots2.md`) for the stage as built now; REPORT9 stays as the record of the old
economy, and `yard-bots.md` stays the first yard's report. The content keeps `release.stage` 1 and an empty shared product list:
every run reads it at stage 2 in memory. Paths that begin "scratchpad" or name `notes/` are working notes, not in the
repository.

```text
REPORT10: THE BOTS MEASURE THE NEW STAGE 2 ONCE (s2e-measure; 27 November 17:50 to 20:30)
====================================================================================================================
Program: scripts/content/yard-bot.ts (this step: every sold item written unless it misses the entry rule; the plasma priced
from its third moment by the hand's measure, --plasmaOnly; the entry rule on the mean only, with each seed, the mean in
standard errors and the seeds below zero printed; --dump <item> for a lasting gain's branch states; the three moments of
28.4 b behind --plasma3); src/engine/salvage/bot.ts unchanged (the stopped measurement's manager fix, 28.4 f, stands).
Content: ONE price round and ONE round of the other numbers (section 2), src/config/salvage.content.ts -> game.json.
Seeds: price round 1 to 15 (normal hand, 12 sittings, --plates --book); table 1 to 15 route A (normal) and B (routeB),
101 to 105 unseen; always and flat 5; the drop-off's old rule (freeDrop) 5 beside the same 5 of the normal hand; the card
manager, the slow hand (once a day), brisk, planned 3; packs, packs with always-finance, ads 3.
DROPPED THIS TIME (the lead's note): the holder, the racker, the cutter, noise and steel-max.
Commands (scratchpad yard/s2e-measure/full/: run.sh, price.sh, pl.sh, table.sh; log.txt has every shard, its arguments and
its seconds; --cache full/cache):
  npx tsx scripts/content/yard-bot.ts --stage 2 --jobs 2 --sittings 12 --bots normal --seeds 2 --first 2i-1 --plates --book   (P1..P8; 15-18 min each)
  npx tsx scripts/content/yard-bot.ts --stage 2 --jobs 2 --sittings 4 --bots normal --seeds 2|6 --first 1|3 --plates --plasmaOnly (PL1, PL2: seeds 1-8)
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --from P1..P8,PL1,PL2 --plates write    (plates.json; R1-all.txt)
  python3 scripts/content/build-yard.py
  npx tsx scripts/content/yard-bot.ts --stage 2 --jobs 2 --sittings 12 --bots <habit> --seeds n --first f [--walk2 --person --bench] (T1..T10; 7-11 min each)
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --from T1..T10                          (TABLE.txt: the table below)
  npx tsx scripts/content/yard-bot.ts --stage 2 --jobs 1 --game <a13a006's game.json> --sittings 12 --bots normal --seeds 1 --first 4|12 --plates --dump rotary|copper (D4, D12)
Every shard under 30 minutes; at most two shards of two jobs at once; nothing run twice.
```

## THE VERDICT

The new stage hangs together where REPORT9's did not. On every one of 71 table runs no promise broke; rung 4 comes at
sittings 4 to 5 and rung 5 at sittings 8 to 9 on 20 of 20 normal seeds and 15 of 15 on route B (G3 met for the twice-a-day
hands); the loan is offered at sitting 1 and repaid before rung 4; both packs fit the player's own cash at rung 4 on 15 of 15;
oversize pieces are cut every sitting; an hour away is 0.40 and 0.53 of an hour played; the last machine and rung 5 are at
most 3 sittings apart (G4 met). The price round put every sold item's price on its lasting gain over fifteen seeds: the
hook-lift +16,883 an hour (31 % of the yard's income), the shredder line +10,504 (9 %), the analyser +3,162 (7 %), the
induction hall +6,555 (6 %), the plasma +2,120 (2.5 %, by the hand's measure with the analyser owned). TWO HALLS FAIL THE
ENTRY RULE: the rotary (+363, 0.3 %) and the copper hall (+2,051, 1.6 %); both stand as they are for the lead. Five gates
miss: G1 (two walk steps fail; hidden best buys flagged), G2 (rated income reads 1.22 to 1.27 times the yard from day 3: the
halls' term), G3 for the once-a-day hand (rung 4 on day 5, rung 5 on days 9 to 10), G11 (the van makes day 1 6.7 %), and G15
(a person's rung-4 entry sitting cannot buy the line and the three halls: the bill is 2.5 times the purse, as ruled in 28.8 b).
The halls' large negative seeds are not the halls: in both seeds taken apart, the induction hall sat on its brass recipe for
the whole absence in the branch with the new hall and on bronze in the branch without it (a bot's once-a-sitting choice made
at a different moment in each branch), and that one setting cost 136,000 and 145,000 over six hours.

## The aims one by one (the step's list)

0. 28.4 f, EXPLAINED (section 5, items 1 and 2): the card manager's goal card stood on a first-yard goal because the goal
   list ticks in order and stops at the first goal not met. "Sign the deal" (optional) is answered now by the bot (the
   stopped measurement's fix: he signs at the office or presses Not now). Behind it stands "cut a car", which a hand who
   only taps cards never does, so his card shows "cut a car" from hour 3 to hour 60 (manager seed 1); his purchases still
   come through the advice line (goals.ts goalBuyNow reads past it). The always-finance bot and the manager buying nothing
   with a headroom of zero: on those sittings every level reads "not the limit" (its gain under 1 % of rated income) and
   every sold machine is owned, so the headroom counts nothing and the advice names nothing; the normal hand bought levels at
   the same sittings because its yard was a sitting behind (its ladders still had gain). Not a fault of the bots. On the
   always-finance bot it is a gap between rung 3's bill and rung 4's tonnes (seed 1, sittings 3 and 4: cash 293k -> 715k);
   on both it is rung 4's back half (sittings 7 to 9 and 9 to 11).
1. THE PRICE ROUND: written (section 2). The plasma at the third moment (the lead's line of 18:30). The rotary and the copper
   hall: entry missed, reported, stand. The second round of ruling 27.6 is flagged for the analyser, the line, the induction
   hall and the plasma and was NOT run (the lead's budget: one price round).
2. kappa by rung: NOT written (rung 3 needs none at 1.00; rung 4 would be 0.84, outside 0.85 to 1.15: the term is the halls',
   rate.ts plateTerms). levels.book: NOT written (every ladder passes, 0.89 to 1.12). The over-reading from day 3: 1.22 to 1.27.
3. The other numbers: works.rungs n 5 3,600 -> 2,900 t; rung 4's tonnes, reuse.shareI_r and lots' mu unchanged (bands met, or
   not reachable by that number: G11's day 1 is the van's).
4. The table and the gates: below.
5. This report.

## The numbers changed (one round each)

| key | before | after | why (15 seeds) |
|---|---|---|---|
| worksLayer.shop truckBridge.price | 206,000 | 203,000 | 12 h x 16,883 |
| worksLayer.shop plasma.price | 86,500 | 25,400 | 12 h x 2,120 (third moment, the hand's measure) |
| works.plates analyser.price | 43,800 | 37,900 | 12 h x 3,162 |
| works.plates shredder.price (the line) | 667,000 | 378,000 | 36 h x 10,504 |
| works.plates induction.price | 339,000 | 236,000 | 36 h x 6,555 |
| works.plates rotary.price | 107,000 | 107,000 | entry MISSED (0.3 %): stands (the lead's line (3)) |
| works.plates copper.price | 202,000 | 202,000 | entry MISSED (1.6 %): stands; 28.8 b's switch is the lead's |
| works.rungs n 5 t | 3,600 | 2,900 | rung 5 came at sittings 9 to 11; now 8 to 9 on 20/20 |
| levels.book | {} | {} | every ladder within 0.7 to 1.4 |
| rate.kappa | 1 / 1 / 1 | 1 / 1 / 1 | rung 4's factor would be 0.84 (refused band): a term |
| reuse.shareI_r, lots.mu_min | - | unchanged | inside their bands, or not the term |

scripts/content/bots/plates.json carries each item's 15 seeds, s.e., E0, the hour-and-absence figure (dT), tonnes, the
ladders' book table and the plasma's third-moment rows. build-yard.py writes gain_h from it; `--check` passes.

## Before and after (REPORT9 against this)

| | REPORT9 (old economy) | REPORT10 (now) |
|---|---|---|
| rung 4 / rung 5 (normal, 15 seeds) | day 2.0-2.5 / sittings 9-10 | sittings 4-5 / 8-9 (20/20) |
| sittings without a useful purchase before rung 5 | 63 of 139 | 0 to 2 a seed; none before rung 4's last machine |
| last goal purchase to rung 5 | 4 to 5 sittings | 2 to 3 |
| first bank offer at rung 3's sitting 1-2 | 0 of 15 | 15 of 15 (normal sees it), 5/5 always signs, repaid before rung 4 |
| packs fitting own cash at rung 4 | 0 of 150 moments | 106 of 162 (2 h), 90 of 162 (5 h); 15/15 seeds |
| oversize pieces cut a sitting | 0 | 1 to 3 every sitting from sitting 2 |
| E19 rung 3 / rung 4 | 0.70 / 0.89 | 0.40 / 0.53 |
| I/G medians at the six moments | 0.91 1.31 1.46 1.44 1.38 1.44 | 1.00 1.00 0.99 1.22 1.27 1.09 |
| driver level G2 R | dI 0 | calculated / measured 0.89 (price round) |
| hand / manager at sittings 4 and 8 | 3.67, 5.34; manager never rung 4 | 2.59, 2.28; manager rung 4 at 6-7, rung 5 at 11-12 |
| Yard sale + van, days 1-5 | 6.9 1.9 1.8 1.9 1.8 % | 6.7 5.0 4.8 4.0 % (day 5 not reached) |
| hard promises | none broken on 198 runs | none broken on 71 runs |

## WHAT NO NUMBER FIXES (for the lead; each with its smallest example and what I would do)

1. THE HALLS' LARGE NEGATIVE SEEDS (the lead's line of 19:25) are (b) THE MEASURE, through a player's choice the two branches
   make at different moments, with a rule beneath it. Rotary, seed 4 (h 22.0, the sitting's induction hall owned in both
   branches; replayed on a13a006's content with `--dump rotary`: -22,473 reproduced): over the 6-hour capped absence the yard
   with the rotary kept 684,649 and without it 821,133. Tonnes the same (378.0 against 373.3 t); the truck's loads the same
   (761 and 761); the yard hands and cutters cut MORE with the rotary (beams 165 against 154, cladding 328 against 308). What
   differed: the INDUCTION HALL'S RECIPE. In the branch without the rotary the reference bot's recipe habit (once a sitting:
   the recipe whose inputs the bays hold most worth of, if twice the current one's) switched the induction hall to bronze in
   the run-up (the bays held 154 kg of bronze solids); in the branch with it, the same check came while the boss was busy
   with the new hall and found too little bronze, so the induction hall stayed on BRASS for the whole absence. With brass:
   11 induction heats, 430 bronze solids sold as they are (no bronze ingot), and the first yard's crucible poured 0 heats
   (the hall took its brass); without: 36 bronze heats sold as ingots, and the crucible poured 176 brass heats. Copper seed 12
   (-22,762 an hour; reproduced to the unit with `--dump copper`, h 32.5): the same, to the heat: with the copper hall the
   induction stayed on brass (16 heats; 530 bronze solids sold as they are; crucible 0), without it bronze (35 heats; crucible
   194); 868,649 against 1,013,787 over 6 h. The lead's guess (hands taken from richer work by charging) is REFUTED: the halls
   are charged from the bays (fromBays) and the hands cut more, not less. The walk's jump measure (REPORT8's, no play) reads
   both halls positive on 15 of 15 at rung 4's entry (copper +4.84 %, rotary +2,278 an hour): the lasting gain's negatives
   come from the played run-up. The rule beneath it, for ruling 17: a hall's recipe is the player's single tap and holds
   through a 12-hour absence, and the induction hall's FIRST recipe is brass, the crucible's own input: a yard that buys the
   induction hall and leaves it on its first recipe earns less from its brass than without the hall while its bronze waits
   unrefined (the induction hall reads at or below zero on 5 of 15 seeds; this is the likeliest cause, not taken apart).
   What I would do: (measure) set every hall's recipe in both branches before the run-up, by the same rule at the same
   instant, so the branches part only by the item; (rule, the lead's) a hall charges the recipe whose inputs its bays hold
   most worth of (its own loader choosing), or the induction hall's first recipe is bronze, so that no tap left undone costs
   the yard money. After either, the halls' prices should be measured again.
2. THE ROTARY AND THE COPPER HALL MISS THE ENTRY RULE on the lasting gain (0.3 % and 1.6 % of E0; s.e. 1,855 and 3,284, larger
   than their means). Both read positive on the walk's measure (above). Their verdicts should wait for item 1's measure fix;
   until then they stand at 107,000 and 202,000, sold.
3. RATED INCOME OVER-READS FROM DAY 3 (I/G 1.22 at day 3, 1.27 at rung 4's last purchase, 1.09 at rung 5; 1.00 to rung 4's
   entry), on every board and habit (route B 1.27/1.30, unseen 1.33/1.38, flat 1.23/1.18). The term: the halls' (rate.ts
   plateTerms). The jump comes at the return after the induction hall's first heats (seed 1: 0.98 at sitting 4, 1.35 at
   sitting 5); the induction hall's rated gain is 4.6 times its measured lasting gain at its moment (dI median 31,927 against
   6,555), the copper hall's 1.35; the walk's dI for the partner levels at day 3 is 2.2 to 4.2 times their measured step. A
   kappa cannot carry it (0.84 at rung 4, outside the band, and it would push rung 4's entry to 0.84). What I would do: the
   plate term counts what the halls can charge from what the replay's bays actually receive by grade (including the
   crucible's claim on brass), not their capacity at the margin.
4. THE ONCE-A-DAY HAND MISSES G3's day bands: rung 4 at its 5th day, rung 5 at its 9th to 10th day (3 seeds). Its sittings are
   days, so the stage's 4 to 5 sittings to rung 4 are 4 to 5 days for it. No tonnes value fixes both hands: rung 4 at 1,000 t
   is reached after 4 to 5 absences of either. For the lead: the slow hand's bands in sittings (as the twice-a-day hands meet
   them), or a stage whose tonnes come more from absences than from sittings.
5. G15: a person's first rung-4 sitting cannot hold "buy the line and the halls": the rung-4 bill is 961,000 (line 378,000,
   induction 236,000, copper 202,000, rotary 107,000) against a purse at rung 4's entry of 342,000 to 534,000 (2.5 x the
   median). 28.8 b rules this the point ("a rung where not everything can be had at once"); G15 as written contradicts it.
   On the five seeds the person-paced sitting bought the induction hall at 104 to 145 s and started it at 185 to 283 s,
   cut 1 to 2 pieces, and on three seeds bought and started the rotary or copper too, all inside 6 minutes; the first heats
   pour at the next return (28.4 d). No two centred cards without an action between them. For the lead: G15 reads "the
   goal's purchase and what the purse allows", or the bill is the point and G15 is restated.
6. THE VAN MAKES DAY 1 6.7 % of the day's earnings (the Yard sale and the van; the van alone 6.2 %); days 2 to 4 are 3.9 to
   5.0 %; never over 8 % on a seed-day. reuse.shareI_r drives the Yard sale only (0.4 % of day 1): no value of it brings
   day 1 under 5 %. The term is reuse's van (vanPeriod_s), not a number of this step.
7. THE ALWAYS-FINANCE BOT IS SLOWER, not faster: rung 5 a median 14.6 % LATER than never-financing (max 0.0 %): the loan
   buys rung 3's bill at sitting 1, after which nothing more sells at rung 3 (every level under 1 % of I) and the cash waits
   two sittings for rung 4's tonnes (seed 1: U 0 at sittings 3 and 4, cash 293k -> 715k), while the never-financing hand
   spends the same sittings on levels that raise its tonnes. G5 is met; the design's fear (finance as a shortcut) does not
   arise. Not verified: whether every level is really under 1 % on that state (the replay's gain) or the replay misreads a
   yard that owns everything of rung 3 early; I would measure one step (the plumbing level) on always seed 1 sitting 3.
8. THE CARD MANAGER'S GOAL CARD reads "cut a car" from hour 3 to the end (all three seeds): the goal list stops at a first-yard
   goal the habit never does. A person who taps only cards would be told one thing for three days. For the lead: whether a
   stage's goals show past a first-yard goal not met (as the day-one goals already do past a repeating goal).
9. THE PLASMA'S GOAL ORDER: at its planned moment (sitting 1 to 2, before the analyser) the plasma opens nothing (the crate of
   bronze bushings needs the analyser): the hand's measure read 0 to 3,698 there; with the analyser owned 2,120. I would put
   the analyser before the plasma in the goal order (not changed: the lead's line). At its new price (25,400) the walk at
   r3s1 reads the plasma +31.6 % on its cutters' use of tier 4 (the 28.4 b effect: 14 of 15 seeds a hidden best buy), so the
   hand buys it at sitting 1 to 2 as "For now" in every run.
10. THE CUTTERS ARE IDLE 39 to 47 % of rung 4 and 5 ("nothing" to cut), the yard hands never (0 to 1 %), the driver almost
   never at rungs 4 and 5 (1 to 2 %); 44 to 57 things of the first yard's old stock stand in its zones to rung 5. Under the
   old drop-off rule (freeDrop) the cutters are idle as much (42 % at rung 4 away) and the old stock is never touched.

## The gates (G1 to G16 with ruling 27.8's additions and 28.1 b; REPORT9's figure beside each)

| gate | REPORT9 | now | verdict |
|---|---|---|---|
| G1 entry | walk 5 of 74 failing; hidden: driver level 15/15, plasma 15/15 | items: 5 of 7 met (rotary 0.3 %, copper 1.6 % MISSED; s.e. printed for each, section 2); walk 2 of 30 steps failing (r3s1 driver level -2.8 %, 1 seed; day 3 demolition level -1.7 %, 1 seed); hidden best buys: the plasma at r3s1 14/15, the analyser 9/15, copper at r4entry 6/15, and single seeds | MISSED |
| G2 rated income | medians 0.91 1.31 1.46 1.44 1.38 1.44 | fitted board 1.00 1.00 0.99 1.22 1.27 1.09; off the fitted board (route B, flat, unseen, every habit) the same shape (day 3 1.20 to 1.33); I never fell at a purchase (no promise broken); kappa 1 (rung 4 would be 0.84, refused); G2 R driver 0.89 on 15 seeds (price round) | MISSED |
| G3 pace | rung 4 day 2.0-2.5, rung 5 sittings 9-10 | normal 20/20 (rung 4 s4-5, rung 5 s8-9), route B 15/15 (rung 5 s8-10), unseen 5/5; slow once a day 0/3 (day 5 / days 9-10) | MISSED (the slow hand) |
| G4 sittings | 63 of 139 dry; gap 4-5 | 0 to 2 dry a seed, none before rung 4's last machine; gap 2 to 3 on 15/15 | met |
| G5 bank | first offer s1-2: 0/15; no loan | first offer at sitting 1 on 15/15 (normal) and 5/5 (always); every first loan repaid before rung 4 (5/5); always rung 5 -14.6 % (median) to 0.0 % (max) sooner; felt cash: always lower at 1 to 4 sittings of 8 to 9 (M4) | met (on 5 seeds of always; the gate names 15) |
| G6 packs | 0 of 150 | 2 h and 5 h packs fit own cash at a rung-4 moment on 15/15; packs bot's lead at rung 5 0 sittings; packs with always-finance -2 to 0 | met |
| G7 the hand | manager never rung 4 | manager rung 4 at sittings 6-7 (day 3-3.5), rung 5 at 11-12; hand/manager 2.59 at s4, 2.28 at s8 (min 1.48); "no mechanism over three fifths" not measured | met (but for the unmeasured clause) |
| G8 oversize pieces | 0 | a piece cut in every sitting from sitting 2 on 15/15; every mass in its kind's range | met |
| G9 planning | +9.9 %; tick = jump 120 | trip by trip against planned at day 3: -0.2, -7.6, -1.0 %; tick = jump 0 of 120 differ; the bench's ratio on a rung-4 state of the new content 1.14 to 1.38 (5 seeds; at most 1.5); trip-by-trip pass 927 to 1,081 ms (measured beside a second shard, not alone: the absolute figure is engine step 5's) | met (ratio) |
| G10 time away | 0.70 / 0.89 | 0.40 / 0.53 | met |
| G11 Yard sale and van | 6.9 1.9 1.8 1.9 1.8 | 6.7 5.0 4.8 4.0 % (day 5 not reached in 12 sittings); 0 seed-days over 8 % | MISSED (day 1: the van) |
| G12 hard promises | none on 198 | none broken on 71 runs; ads 2.0 % of day 1 (max 2.3) | met |
| G13 first yard | 75 of 75; same.ts 4/4 | first-yard.sh --full: 75 of 75 identical; same.ts 4 of 4; 30 states 0 differences | met |
| G14 candidates | - | the copper hall built and measured (section 2: entry missed); the trailer not built | - |
| G15 a person's sitting | not measured | does NOT fit "buy the line and the halls" (the bill is 2.5 x the purse); the induction hall bought and started in under 5 min on 5/5; 0 centred cards twice | MISSED (see item 5) |
| G16 store-review pass | - | done, ruled (28.2) | met |
| 27.8: each item's s.e. | - | printed (section 2) | - |
| 27.8: the rung's bill against the purse | - | rung 3: 266,300 against 52k-156k (normal median 114k); rung 4: 961,000 against 342k-534k | printed |
| 28.1 b: the bench's ratio | 1.42 (old content) | 1.14 to 1.38 | met |

## The tables

### Section 2: the price round (15 seeds, normal hand, at each item's planned moment; scratchpad full/R1-all.txt)

The lasting gain (28.4 a: one capped absence once the item works, with and without, nobody at the yard), each seed, the mean,
its standard error, the mean in standard errors above zero, the seeds below zero. The clause "no seed below -1 %" cannot be read
on this measure (item 1 above); the entry rule reads the mean.

```text
item         moment     mean §/h (s.e.)   of E0              t     <0    tonnes/h (of the yard's)   price
hook-lift    h13.5 r3   16,883 (2,527)    31.1 % of 54,224   6.7   0/15  +0.24 (63.4)               206,000 -> 203,000
  per seed  9775 22997 10420 12094 15483 16416 14445 8586 19275 12381 49068 17409 14211 19683 10998
plasma (m3)  h17.8      2,120 (268)       2.5 % of 84,453    7.9   0/15  -0.59                      86,500 -> 25,400
  per seed  1492 3008 2291 1316 2454 303 2427 3698 1185 1752 3803 1014 2708 1222 3132   (together 4,255: the cutters' use)
analyser     h7.3 r3    3,162 (283)       6.7 % of 47,245    11.2  0/15  +0.01 (51.3)               43,800 -> 37,900
  per seed  2865 3498 3979 2842 4043 1177 3643 4039 2722 3423 3284 566 4863 2959 3524
line         h28.3 r4   10,504 (1,664)    9.1 % of 115,111   6.3   0/15  +3.50 (67.9; 5.1 %)        667,000 -> 378,000
  per seed  4371 10894 5603 32484 9838 10343 9227 8910 7187 9913 10477 8485 8729 7986 13115
induction    h20.0 r4   6,555 (2,245)     6.2 % of 106,327   2.9   5/15  +0.62 (66.9)               339,000 -> 236,000
  per seed  -972 20904 -583 23196 -3262 -2018 19443 -1229 5356 4811 5657 7532 8340 11072 84
rotary       h26.3 r4   363 (1,855)       0.3 % of 119,816   0.2   3/15  -0.11 (69.6)               107,000 STANDS (entry MISSED)
  per seed  2702 -7656 -3109 -22473 1153 2241 2332 2656 2882 1109 4604 6121 4873 4713 3302
copper       h30.3 r4   2,051 (3,284)     1.6 % of 127,761   0.6   3/15  -0.05 (70.5)               202,000 STANDS (entry MISSED)
  per seed  9433 2545 25827 -15238 5425 6262 5857 9566 9608 3629 3641 -22762 4618 -21560 3909
```

The hour and the absence together (dT) beside the lasting gain: within a third for every item but the plasma (4,255: everything
kept over the hand's two sittings, mostly the cutters' use of tier 4; the price reads the pieces, as ruled) and the rotary (13
against 363: both about nothing). No one-off sale of stock found. The two-absence figure is not in these runs (each branch plays
one absence): to cut the noise I would (a) set the halls' recipes alike in both branches (item 1), (b) run two absences, or (c)
read the item's own ledger from the run (what it made at usual prices less what it took in, its reagents and its carrier).

The ladders (gain book, 15 seeds; calculated rate.ts levelGain against the measured first step): driver 4,249 / 4,793 = 0.89;
cutter 2,745 / 2,444 = 1.12; plumbing 4,248 / 4,298 = 0.99; hand 443 / 493 = 0.90; garage 3,021 / 2,879 = 1.05. All pass.

rate.kappa, G/I by rung over every return of the price round: rung 3 1.002 (53), rung 4 0.844 (90), rung 5 0.915 (15).

### Section 3: the table (scratchpad full/TABLE.txt, 71 runs)

```text
T1. rung 4 / rung 5 sittings (band 4-6 / 8-12)
   normal   n 20  rung 4  4 4 5 5 4 4 4 4 4 4 5 5 4 5 4 | 5 4 5 4 4 (unseen)   rung 5  8 8 9 9 8 8 8 8 8 8 9 8 8 9 8 | 9 9 9 8 9
   routeB   n 15  rung 4  4 4 4 4 4 4 5 5 4 4 4 5 4 5 4                        rung 5  8 8 8 9 8 8 9 9 9 8 8 9 8 10 8
   always 5: 5 4 5 5 4 / 10 9 9 10 9    flat 5: 4 4 5 5 4 / 9 8 9 9 8    freeDrop 5: 4 4 4 4 4 / 8 8 8 8 9
   manager 3: 7 6 6 / 12 11 12    slow (days) 3: 5 5 5 / 9 10 9    brisk 3: 4 4 4 / 8 8 8    planned 3: 4 4 5 / 8 8 9
   packs 3: 4 4 5 / 8 8 9    packsAlways 3: 5 4 5 / 10 9 9    ads 3: 4 4 5 / 8 8 10
T2. I/G medians: r3 entry, r3 last, r4 entry, day 3, r4 last, r5 entry
   normal (fitted) 1.00 1.00 0.99 1.22 1.27 1.09   routeB 0.99 1.00 1.00 1.27 1.30 1.16   unseen 1.04 1.02 0.98 1.33 1.38 1.13
   flat 0.99 0.94 1.03 1.23 1.18 1.09   always 1.00 0.98 1.00 1.20 1.20 1.04   manager 0.90 1.03 1.05 1.04 1.33 1.33
   slow 0.94 1.03 0.95 1.29 1.24 1.02   brisk 0.97 0.94 1.01 1.29 1.25 1.08   packs 0.97 0.98 1.03 1.28 1.31 1.27
T4. bank: normal letter and first offer (the hook-lift, 203,000) at sitting 1 on 19/20; always signs it at sitting 1 on 5/5
   (P 203,000, F 162,400, T 175,392), repaid at sitting 2-3 (0.3-0.5 h played, 4.3-8.5 h running); seed 5 also financed the
   induction hall at sitting 4 (repaid at 5, after rung 4); bank's largest share of an absence 20 %
T5. ads 2.0 1.1 0.9 0.9 0.8 % of days 1-5 (ads bot); Yard sale + van 6.6 3.9 4.3 3.9 (van 6.2 3.1 2.0 1.4); E19 0.38 / 0.53
T6. sittings without a purchase: normal 11 of 168, routeB 13 of 127, always 17 of 47, manager 11 of 35, slow 7 of 28,
   packsAlways 10 of 28, freeDrop 7 of 41, planned 4 of 25, packs 3 of 25, ads 3 of 26, flat 2 of 43, brisk 1 of 24
T7. normal / manager lifetime: 2.59 (min 2.32) at sitting 4, 2.28 (min 1.48) at sitting 8; packs: 1-2 packs, lead 0 sittings
T11. packs against headroom, rung 4: 162 moments; U median 8.7 h of I; 2 h fits own cash 106/162, 5 h 90/162;
   rung 5: U median 0 (the plateau): 6/40 and 1/40
M3. the bill against the purse at rung 4's entry (normal): purse 342k to 534k, U 1.15M to 2.73M, machines 961k
M9. idle by rung (normal, 20 seeds; away / played): cutter r3 26/40 %, r4 39/47 %, r5 43/46 % (nothing to cut);
   driver r3 15/8 %, r4 1/0 %, r5 2/0 %; yard hands 0-1 %. Old stock in the first yard's zones 44 to 57 things to rung 5.
M10 (price round, 15 seeds): rung 3's purchases: the analyser and the plasma at sittings 1-2 ("For now"), the hook-lift at
   sittings 2-4 (the goal); the induction hall at rung 4's first sitting on 15/15.
```

THE DROP-OFF'S PAIR (28.3 d; five seeds of the normal hand on the old rule, freeDrop, beside the same five as built):

| seed | lifetime at sitting 6 old / built | tonnes at the end old / built | rung 4, rung 5 old / built | arrivals an hour by sitting, old / built | walk failing old / built | levels' gains (built) r3s1 / r4entry / day 3 |
|---|---|---|---|---|---|---|
| 1 | 9.31M / 6.96M | 3,118 / 2,977 | 4, 8 / 4, 8 | 51 20 14 9 18 25 23 / 22 28 72 72 72 6 16 | - / none | cutter +9.5 % / driver +3.4 % / driver +1.1 % |
| 2 | 9.68M / 8.36M | 3,002 / 2,941 | 4, 8 / 4, 8 | 222 40 259 151 200 187 194 / 20 23 15 13 13 17 12 | - / none | cutter +6.4 % / hand +0.9, driver +3.0 % / driver +3.9 % |
| 3 | 9.49M / 7.77M | 3,041 / 3,242 | 4, 8 / 5, 9 | 292 490 730 587 459 215 223 / 72 72 72 29 23 0 6 0 | - / none | cutter +11.3 % / - / hand +1.1, driver +3.0 % |
| 4 | 8.50M / 7.44M | 3,161 / 2,990 | 4, 8 / 5, 9 | 41 141 20 47 30 22 10 / 72 72 72 72 59 44 48 44 | - / induction | cutter +9.9 % / driver +4.6 % / driver +1.6 % |
| 5 | 8.44M / 6.70M | 3,176 / 3,035 | 4, 9 / 4, 8 | 94 231 448 463 440 448 433 481 / 27 24 68 72 72 8 6 | - / induction | cutter +9.5 % / hand -0.2, driver +3.1 % / driver +3.5 % |

The old rule earns 13 to 26 % more by sitting 6 at the same pace of rungs (the free supply of washers); under the rule as built
the drop-off brings at most 72 an hour (one every 50 s) and often far fewer (the first yard's zones are where it comes from).
The walk (levels' steps on the old rule) was not run on freeDrop: its columns read "-".

### Section 4: seed 1, sitting by sitting (normal, always-finance, card manager)

Columns: sitting, hour, rung, tonnes | purse on return -> at the end | G and I at the return | U and the machines' bill | bank |
pieces cut / came | packs that fit (return / end) | bought [why, payback h] | the goal after | the advice at the end.

```text
normal seed 1 (rung 4 at sitting 4, rung 5 at 8)
 1 h5.3  r3  190 t | 114k -> 7k   | G 31k I 30k  | U 445k bill 266k | offer 1 | 1/1 | -/-     | cutter2, analyser 38k, plasma 25k, 5 levels [For now] | buyTruckBridge | save truckBridge 203k
 2 h9.5  r3  471 t | 185k -> 178k | G 52k I 53k  | U 315k bill 241k | offer 1 | 1/1 | -/-     | 4 hand levels [For now] | buyTruckBridge | save truckBridge 203k
 3 h13.8 r3  779 t | 379k -> 8k   | G 56k I 58k  | U 203k bill 241k | -       | 2/2 | -/-     | TRUCKBRIDGE 203k [goal], 7 levels | supplyRung4 | save plumbing level 69k
 4 h18.0 r4 1084 t | 360k -> 47k  | G 102k I 101k| U 1.68M bill 961k| -       | 1/1 | 2+5/2+5 | INDUCTION 236k [goal], garage level 140k | pourInduction | save shredder 378k
 5 h24.3 r4 1520 t | 635k -> 59k  | G 102k I 138k| U 2.98M bill 961k| -       | 2/2 | 2+5/2+5 | LINE 378k, ROTARY 107k [goal], COPPER 202k [advice] | pourRotary | save driver level 113k
 6 h30.5 r4 1976 t | 697k -> 51k  | G 130k I 158k| U 2.31M          | -       | 2/2 | 2+5/2+5 | driver x2, garage levels 745k | supplyRung5 | save plumbing level 139k
 7 h36.8 r4 2470 t | 973k -> 647k | G 151k I 181k| U 2.11M          | -       | 2/2 | 2+5/-   | plumbing x2, demolition levels 434k | supplyRung5 | none
 8 h43.0 r5 2977 t | 1.61M -> 1.74M| G 162k I 193k| U 0             | -       | 3/3 | -/-     | night 36k [goal] | - | none
always-finance seed 1 (rung 4 at 5, rung 5 at 10)
 1 h5.3  r3  188 t | 114k -> 23k  | G 31k I 30k  | U 445k | SIGNED truckBridge P203,000 F162,400 T175,392 | 1/1 | -/- | deposit 41k, plasma, cutter2, analyser | supplyRung4 | save plumbing level
 2 h9.5  r3  422 t | 107k -> 16k  | G 65k I 64k  | U 423k | repaid (left 0) | 1/1 | -/- | 6 levels | supplyRung4 | none
 3 h13.8 r3  674 t | 293k -> 372k | G 81k I 83k  | U 0    | - | 2/2 | -/- | NOTHING (12 levels "not the limit") | supplyRung4 | none
 4 h18.0 r3  924 t | 656k -> 715k | G 81k I 83k  | U 0    | - | 1/1 | -/- | NOTHING | supplyRung4 | none
 5 h22.3 r4 1178 t | 1.00M -> 92k | G 85k I 84k  | U 1.41M bill 961k | - | 2/2 | 2/- | induction, line, rotary, copper, hand level | pourInduction | none
 6 h28.5 r4 1570 t | 658k -> 492k | G 112k I 134k| U 263k | - | 2/2 | -/- | plumbing level 263k | supplyRung5 | none
 7-9 r4 1958-2741 t | 1.13M -> 2.68M | I/G 1.20-1.30 | U 0 | - | 2/2 | -/- | NOTHING | supplyRung5 | none
10 h53.5 r5 3132 t | 3.46M -> 3.54M | G 126k I 141k | U 0 | - | 2/2 | -/- | night | - | none
card manager seed 1 (rung 3 at h 3.0, rung 4 at 7, rung 5 at 12; the goal card "cutCar" at every sitting)
 1 h3.3  r3   37 t | 3k -> 4k     | G 11k I 11k  | U 54k  | - | 0/0 | hand2 [For now] | save truckBridge
 2 h7.5  r3  152 t | 105k -> 97k  | G 22k I 21k  | U 349k | - | 0/1 | cutter2, driver level | save truckBridge
 3 h11.8 r3  322 t | 195k -> 122k | G 31k I 28k  | U 369k | - | 0/1 (2 waiting) | analyser, plasma, hand level [For now] | save truckBridge
 4 h16.0 r3  497 t | 251k -> 3k   | G 33k I 31k  | U 218k | - | 0/2 (4 waiting) | TRUCKBRIDGE [advice], 4 levels | save plumbing level
 5 h20.3 r3  711 t | 214k -> 1k   | G 52k I 51k  | U 770k | - | 0/0 (4 waiting) | 5 levels | save hand level
 6 h24.5 r3  924 t | 290k -> 226k | G 72k I 75k  | U 225k | - | 0/0 | 2 levels | none
 7 h28.8 r4 1157 t | 503k -> 10k  | G 73k I 81k  | U 923k | - | 0/0 | induction, copper, hand level | save shredder
 8 h35.0 r4 1508 t | 430k -> 6k   | G 89k I 118k | U 485k | - | 0/0 | line, rotary | none
 9-11 r4          | 551k -> 1.84M | I/G 1.25-1.26 | U 0 | - | 0/0 | NOTHING | none
12 h60.0 r5 3002 t | 2.40M -> 2.45M | U 0 | nothing
```

The card manager cuts no piece (cards only: 4 wait from sitting 4 to the end) and never buys the Night watch (its goal is not
reached on his card). Neither the bank's offer nor a pack is taken by the normal hand or the manager (never-finance; no packs).

## Gates at my end (the real outcomes; scratchpad full/gate-*.txt)

- `npx tsc --noEmit -p .`: clean.
- `NODE_OPTIONS=--max-old-space-size=3000 npx vitest run src/engine/salvage src/engine/salvageMode.test.ts src/engine/fixtures src/modes src/config` (once, alone): 99 files passed, 1,137 tests passed, 4 todo.
- `npm run check:bundle`: layering clean.
- `python3 scripts/content/build-yard.py --check`: game.json is what build-yard.py writes.
- `npx tsx scripts/content/yard/check.ts --all`: 1,011 texts, 0 findings.
- `npx tsx scripts/validate.ts scrap-yard`: exit 0. game.json: release.stage 1, shared product list empty.
- `bash scratchpad yard/s2e/first-yard.sh` (after the content change, alone): FIRST YARD: PASS (30 cases, 295 ops, 0 differences).
- `bash scratchpad yard/s2e/first-yard.sh --full` (alone, at the end): content 4 PASS; engine 30 cases, 295 ops, 0 differences; same.ts 4 of 4 (same state, same record); the 75-run comparison 75 of 75 identical below rung 3; FIRST YARD: PASS (G13 met).

## Addendum: after ruling 29 (s2g-measure, 27 to 28 November)

What was measured again, on the main line after ruling 29's pass (a hall chooses its own recipe at each heat's start; the
analyser before the plasma and the stage's goals past an unmet first-yard goal; rated income's halls term read from what the
bays receive): ONE price round of the three halls (normal hand, seeds 1 to 15, 12 sittings, the lasting gain of 28.4 a, the
entry rule as 29.3 reads it: the mean at least 2 % of the yard's income AND two standard errors above zero); the ladders'
three steps from the same runs; ONE small table on the content as priced (normal 15, route B 5, unseen 5, flat 5,
always-finance 5, the card manager 3); the borrower's numbers (29.7); the lead's pair of 21:15 (the driver takes the richest
load first). Working notes: scratchpad `yard/s2g-measure/` and `notes/s2g-measure.md`. The tool: scripts/content/yard-bot.ts
(`--items`, `--borrower`, `--forceLevels`, `--probe`; the entry rule's form; each hall's recipe and heats per seed). One fault
of the tool found and fixed on the way: its children were not passed `--items`, so the price round measured every sold item
(the extra rows are printed below as information and were not written).

```text
ADDENDUM: THE HALLS AGAIN, THE BANDS, THE BORROWER (s2g-measure; 27 Nov 21:10 to 28 Nov 00:30; 15 + 38 + 23 + 2 runs)
  price round  P1..P5   --bots normal --seeds 3 --first 3i-2 --jobs 3 --sittings 12 --plates --book --items induction,rotary,copper   (1,026-1,132 s each)
  table        TN normal 15 | TB always 5 --borrower --probe | TR routeB,flat 5 | TU normal --unseen | TM manager 3          (123-1,242 s)
  pairs        K1 normal 5, K2 always 3 --probe: --game (truck.pickFromRung 3) | M1 always,normal 5: --game (levels.minShareI 0.005)
               FL always 5 --forceLevels (sitting 3's three levels adding the most tonnes) | KAPPA normal,always 1 (the refused factors)
  every run: 0 hard promises broken; tick = jump 0 differences
```

### The three halls' fifteen seeds (the lasting gain; § an hour)

```text
hall       moment    mean (s.e.)      of E0              s.e.>0  <0     t an hour (yard's)   price               verdict
induction  h17.8 r4  23,982 (3,478)   21.2 % of 113,017  6.9     0/15   +0.16 (71.7)         236,000 -> 863,000  entry met, written
  per seed 9689 36481 40574 22878 9291 20848 22110 9484 13266 17055 35854 26373 53124 33428 9276
rotary     h24.0 r4  3,395 (603)      2.33 % of 145,491  5.6     1/15   -0.09 (73.6)         107,000 -> 122,000  entry met, written
  per seed 3396 -1756 6053 2605 2006 3604 977 4181 2782 2883 5530 4008 5454 7833 1363
copper     h24.0 r4  5,496 (906)      3.67 % of 149,830  6.1     2/15   -0.13 (74.6)         202,000 -> 198,000  entry met, written
  per seed 6120 5898 9381 8499 1409 7359 1381 4801 4799 -515 9049 7934 -333 9878 6785
REPORT10's two absences: rotary seed 4 -22,473 -> +2,605; copper seed 12 -22,762 -> +7,934. On every seed of every hall both
branches end the absence with the induction hall on bronze by its own choice, with as many heats (seed 4: 36 / 36; seed 12:
35 / 36). The worst seed of any hall is -1.2 % of E0.
NOT WRITTEN (the budget), from the same runs: hook-lift 15,231 (854; 27.5 %; 183,000 by the rule), analyser 4,332 (340; 10.2 %;
52,000), shredder line 9,263 (646; 6.5 %; 333,000), THE PLASMA at its third moment 1,739 (291; 1.98 % of 87,951: UNDER 2 %).
```

COPPER_GATE stays rung4 and the rotary keeps its gate: all three halls pass. The induction hall's price nearly quadruples:
the hall that chose brass for whole absences earned 6,555; choosing for itself it earns 23,982 (its bronze, and the crucible
keeps its brass). The rung-4 machines now cost 1,561,000 against a purse at rung 4's entry of 356k to 518k (normal): the hand
buys the rotary first ("for now") and the induction hall at the next sitting; rung 5 still comes at sittings 8 to 9.

### The bands (I/G medians [range]; r3 entry, r3 last, r4 entry, day 3, r4 last, r5 entry)

```text
normal 15   1.00 [0.94-1.05]  1.00 [0.91-1.13]  1.00 [0.93-1.03]  1.07 [0.91-1.18]  1.10 [1.00-1.21]  1.15 [1.04-1.23]
always 5    1.00  0.99  0.99  1.08  1.09  1.10        routeB 5  0.96  0.97  0.98  1.02  1.01  1.13
flat 5      0.99  0.94  1.03  1.07  1.10  1.12        unseen 5  1.04  1.02  0.98  1.08  1.10  1.12
manager 3   0.90  1.05  1.05  1.05  1.14  1.15        (REPORT10 normal: 1.00 1.00 0.99 1.22 1.27 1.09)
G/I by rung over every return (normal): rung 3 1.008 (50), rung 4 0.972 (60), rung 5 0.869 (15)
ladders, calculated / measured first step (15 seeds): driver 1.02, cutter 1.06, plumbing 0.87, hand 1.29, GARAGE 0.64 (fails)
```

The over-reading from day 3 is halved (1.22 -> 1.07 at day 3, 1.27 -> 1.10 at rung 4's last purchase) and rung 5's entry is
worse (1.09 -> 1.15). KAPPA IS NOT WRITTEN although both factors are inside 0.85 to 1.15: written as [1, 0.97, 0.87] and run on
seed 1, the factors moved the run (the hand bought more levels; the always bot had two more dry sittings), the normal hand's
I/G at rung 5's entry became 0.88, and on the always bot I stepped down 11 % at rung 5's entry (137,426 -> 121,810), after
which it bought twenty levels in one sitting. A rung-5 factor below rung 4's hides the term and makes the plateau's first
return a spree; the remaining term from day 3 is the farm's levels (s2g-rate's (a)), which the next section meets again. No
purchase lowered I on any run. The garage ladder fails its check (0.64): levels.book was not this step's to write.

### The small table (on the content as priced)

```text
normal 15   rung 4 s4 x10, s5 x5; rung 5 s8 x10, s9 x5 (band 8-9: rung 5's tonnes STAND); without a purchase 0-1 a seed (s8, 4 seeds);
            bank offers 1-4 a run, no loan; packs fit own cash at a rung-4 return 15/15; pieces cut 1-3 every sitting from s2
always 5    rung 4 s4-5, rung 5 s9 9 9 9 10; loan 1 the hook-lift (P 203,000 F 162,400 T 175,392) at s1, repaid by s2-3 (5/5);
            loan 2 the induction hall at rung 4 (P 863,000, F 680-690k) on 4/5, repaid within two sittings; dry: seed 1 s3 s4, others 1-2
manager 3   rung 4 s6 7 6, rung 5 s12 x3; cuts no piece (cards only); 1-3 dry
routeB 5    rung 4 s4 x5, rung 5 s8 x5    flat 5  4 4 5 5 4 / 9 8 9 9 8    unseen 5  5 4 5 4 4 / 9 8 9 8 9
hard promises 0 broken on 38 runs; tick = jump 0 of every check; E19 0.38 (rung 3), 0.53 (rung 4); Yard sale + van 6.6 3.8 4.0 3.8 %
```

### The borrower's numbers (29.7; always-finance seeds 1 to 5, the returns of sittings 3 and 4)

Each level the cards show: its calculated gain (§ an hour, share of rated income I, sold or not the limit at the 1 % bar); the
same level measured as the price round measures a step (an hour played, one capped absence, with it and without it): money
and TONNES an hour, the latter as a share of the yard's own; ratedCapacity's calculated tonnes beside. Sorted by tonnes.

```text
s1 sitting 3 (h 13.51, rung 3; I 83,305; the yard 57.55 t an hour; cash 290,935)
   driver     L3  calc      0 ( 0.0 %) not the limit | measured    -155 ( -0.2 %) |  +4.44 t ( +7.7 %) | calc t +0.0
   demolition L1  calc      0 ( 0.0 %) not the limit | measured  -3,383 ( -4.1 %) |  +2.18 t ( +3.8 %) | calc t +0.0
   farm       L3  calc      0 ( 0.0 %) not the limit | measured  -2,756 ( -3.3 %) |  +0.60 t ( +1.0 %) | calc t +0.0
   cutter.1   L1  calc      0 ( 0.0 %) not the limit | measured     -56 ( -0.1 %) |  +0.10 t ( +0.2 %) | calc t +0.0
   hand.1     L5  calc      0 ( 0.0 %) not the limit | measured     -70 ( -0.1 %) |  +0.08 t ( +0.1 %) | calc t +4.1
   hand.0     L6  calc      0 ( 0.0 %) not the limit | measured      55 ( +0.1 %) |  +0.08 t ( +0.1 %) | calc t +3.7
   cutter.0   L2  calc      0 ( 0.0 %) not the limit | measured      20 ( +0.0 %) |  -0.01 t ( -0.0 %) | calc t +0.0
   plumbing   L2  calc    825 ( 1.0 %) not the limit | measured   5,250 ( +6.3 %) |  -0.84 t ( -1.5 %) | calc t +0.0
   garage     L2  calc      0 ( 0.0 %) not the limit | measured    -523 ( -0.6 %) |  -2.26 t ( -3.9 %) | calc t +0.0
s1 sitting 4 (h 17.76, rung 3; I 83,305; the yard 56.98 t an hour; cash 651,187)
   driver     L3  calc      0 ( 0.0 %) not the limit | measured      61 ( +0.1 %) |  +5.14 t ( +9.0 %) | calc t +0.0
   demolition L1  calc      0 ( 0.0 %) not the limit | measured  -3,359 ( -4.0 %) |  +2.81 t ( +4.9 %) | calc t +0.0
   farm       L3  calc      0 ( 0.0 %) not the limit | measured  -2,685 ( -3.2 %) |  +1.20 t ( +2.1 %) | calc t +0.0
   hand.1     L5  calc      0 ( 0.0 %) not the limit | measured     441 ( +0.5 %) |  +0.55 t ( +1.0 %) | calc t +4.1
   cutter.1   L1  calc      0 ( 0.0 %) not the limit | measured     395 ( +0.5 %) |  +0.53 t ( +0.9 %) | calc t +0.0
   hand.0     L6  calc      0 ( 0.0 %) not the limit | measured     217 ( +0.3 %) |  +0.48 t ( +0.8 %) | calc t +3.7
   cutter.0   L2  calc      0 ( 0.0 %) not the limit | measured     367 ( +0.4 %) |  +0.48 t ( +0.8 %) | calc t +0.0
   plumbing   L2  calc    825 ( 1.0 %) not the limit | measured   5,249 ( +6.3 %) |  +0.38 t ( +0.7 %) | calc t +0.0
   garage     L2  calc      0 ( 0.0 %) not the limit | measured    -455 ( -0.5 %) |  -1.30 t ( -2.3 %) | calc t +0.0
s2 sitting 3 (h 13.5, rung 3; I 75,196; the yard 65.45 t an hour; cash 294,361)
   driver     L6  calc    412 ( 0.5 %) not the limit | measured     711 ( +0.9 %) |  +0.65 t ( +1.0 %) | calc t +0.0
   cutter.0   L2  calc      0 ( 0.0 %) not the limit | measured      -7 ( -0.0 %) |  +0.64 t ( +1.0 %) | calc t +0.0
   farm       L2  calc    412 ( 0.5 %) not the limit | measured  -1,213 ( -1.6 %) |  +0.63 t ( +1.0 %) | calc t +18.3
   hand.1     L5  calc    704 ( 0.9 %) not the limit | measured     650 ( +0.9 %) |  +0.53 t ( +0.8 %) | calc t +0.0
   hand.0     L7  calc    450 ( 0.6 %) not the limit | measured     514 ( +0.7 %) |  +0.49 t ( +0.7 %) | calc t +0.0
   garage     L2  calc  2,642 ( 3.5 %) sold          | measured   3,731 ( +5.0 %) |  +0.29 t ( +0.4 %) | calc t +5.8
   plumbing   L1  calc  8,285 (11.0 %) sold          | measured  10,103 (+13.4 %) |  +0.05 t ( +0.1 %) | calc t +6.6
   demolition L1  calc      0 ( 0.0 %) not the limit | measured  -1,269 ( -1.7 %) |  -0.46 t ( -0.7 %) | calc t +18.3
s2 sitting 4 (h 17.76, rung 4; I 113,323; the yard 65.85 t an hour; cash 448,489)
   driver     L6  calc  1,718 ( 1.5 %) sold          | measured   1,793 ( +1.6 %) |  +3.20 t ( +4.9 %) | calc t +0.0
   demolition L1  calc      0 ( 0.0 %) not the limit | measured  -6,010 ( -5.3 %) |  +3.03 t ( +4.6 %) | calc t +1.6
   farm       L2  calc      0 ( 0.0 %) not the limit | measured  -4,475 ( -3.9 %) |  +1.70 t ( +2.6 %) | calc t +1.6
   hand.0     L8  calc  1,225 ( 1.1 %) sold          | measured     310 ( +0.3 %) |  +0.09 t ( +0.1 %) | calc t +0.0
   hand.1     L8  calc  1,225 ( 1.1 %) sold          | measured     -27 ( -0.0 %) |  +0.05 t ( +0.1 %) | calc t +0.0
   cutter.0   L2  calc      0 ( 0.0 %) not the limit | measured     -70 ( -0.1 %) |  +0.04 t ( +0.1 %) | calc t +0.0
   cutter.1   L1  calc      0 ( 0.0 %) not the limit | measured      17 ( +0.0 %) |  -0.05 t ( -0.1 %) | calc t +0.0
   plumbing   L4  calc  4,703 ( 4.2 %) sold          | measured   4,964 ( +4.4 %) |  -0.33 t ( -0.5 %) | calc t +1.6
   garage     L4  calc      0 ( 0.0 %) not the limit | measured    -918 ( -0.8 %) |  -1.73 t ( -2.6 %) | calc t +1.6
s3 sitting 3 (h 11.51, rung 3; I 69,320; the yard 59.99 t an hour; cash 274,810)
   driver     L3  calc      0 ( 0.0 %) not the limit | measured  -1,469 ( -2.1 %) |  +4.35 t ( +7.2 %) | calc t +0.0
   demolition L1  calc      0 ( 0.0 %) not the limit | measured  -3,043 ( -4.4 %) |  +0.96 t ( +1.6 %) | calc t +24.1
   farm       L2  calc      0 ( 0.0 %) not the limit | measured  -2,644 ( -3.8 %) |  +0.37 t ( +0.6 %) | calc t +24.1
   hand.1     L5  calc  1,731 ( 2.5 %) sold          | measured   1,224 ( +1.8 %) |  +0.29 t ( +0.5 %) | calc t +0.0
   cutter.0   L3  calc      0 ( 0.0 %) not the limit | measured     690 ( +1.0 %) |  +0.21 t ( +0.3 %) | calc t +0.0
   cutter.1   L1  calc      0 ( 0.0 %) not the limit | measured   1,518 ( +2.2 %) |  +0.17 t ( +0.3 %) | calc t +0.0
   hand.0     L7  calc  1,119 ( 1.6 %) sold          | measured     666 ( +1.0 %) |  +0.15 t ( +0.3 %) | calc t +0.0
   plumbing   L1  calc  8,829 (12.7 %) sold          | measured   8,957 (+12.9 %) |  -1.00 t ( -1.7 %) | calc t +6.6
   garage     L1  calc      0 ( 0.0 %) not the limit | measured   1,455 ( +2.1 %) |  -2.61 t ( -4.4 %) | calc t +5.8
s3 sitting 4 (h 15.76, rung 3; I 106,289; the yard 63.5 t an hour; cash 386,787)
   driver     L5  calc  6,779 ( 6.4 %) sold          | measured   5,990 ( +5.6 %) |  +4.50 t ( +7.1 %) | calc t +0.0
   demolition L1  calc      0 ( 0.0 %) not the limit | measured  -2,519 ( -2.4 %) |  +4.00 t ( +6.3 %) | calc t +13.6
   farm       L2  calc      0 ( 0.0 %) not the limit | measured  -3,980 ( -3.7 %) |  +1.73 t ( +2.7 %) | calc t +13.6
   cutter.0   L3  calc      0 ( 0.0 %) not the limit | measured     -71 ( -0.1 %) |  +0.10 t ( +0.2 %) | calc t +0.0
   hand.0     L9  calc  1,067 ( 1.0 %) sold          | measured     230 ( +0.2 %) |  +0.08 t ( +0.1 %) | calc t +0.0
   cutter.1   L1  calc      0 ( 0.0 %) not the limit | measured     -58 ( -0.1 %) |  +0.06 t ( +0.1 %) | calc t +0.0
   hand.1     L9  calc  1,067 ( 1.0 %) sold          | measured      39 ( +0.0 %) |  +0.06 t ( +0.1 %) | calc t +0.0
   plumbing   L4  calc  5,214 ( 4.9 %) sold          | measured   4,484 ( +4.2 %) |  -0.45 t ( -0.7 %) | calc t +6.6
   garage     L3  calc    525 ( 0.5 %) not the limit | measured  -1,041 ( -1.0 %) |  -1.61 t ( -2.5 %) | calc t +5.8
s4 sitting 3 (h 13.5, rung 3; I 78,669; the yard 53.4 t an hour; cash 299,716)
   driver     L2  calc  6,414 ( 8.2 %) sold          | measured   6,584 ( +8.4 %) |  +5.56 t (+10.4 %) | calc t +0.0
   demolition L1  calc      0 ( 0.0 %) not the limit | measured  -3,165 ( -4.0 %) |  +2.45 t ( +4.6 %) | calc t +21.6
   farm       L2  calc      0 ( 0.0 %) not the limit | measured  -3,906 ( -5.0 %) |  +0.25 t ( +0.5 %) | calc t +21.6
   hand.1     L6  calc    714 ( 0.9 %) not the limit | measured      67 ( +0.1 %) |  +0.15 t ( +0.3 %) | calc t +0.0
   hand.0     L7  calc    714 ( 0.9 %) not the limit | measured     109 ( +0.1 %) |  +0.12 t ( +0.2 %) | calc t +0.0
   cutter.0   L3  calc      0 ( 0.0 %) not the limit | measured     137 ( +0.2 %) |  +0.11 t ( +0.2 %) | calc t +0.0
   plumbing   L2  calc  5,942 ( 7.6 %) sold          | measured   5,792 ( +7.4 %) |  -0.58 t ( -1.1 %) | calc t +6.6
   garage     L1  calc      0 ( 0.0 %) not the limit | measured    -277 ( -0.4 %) |  -2.01 t ( -3.8 %) | calc t +5.8
s4 sitting 4 (h 17.75, rung 3; I 115,285; the yard 59.99 t an hour; cash 402,609)
   driver     L4  calc  5,750 ( 5.0 %) sold          | measured   6,476 ( +5.6 %) |  +4.52 t ( +7.5 %) | calc t +0.0
   demolition L1  calc      0 ( 0.0 %) not the limit | measured  -4,054 ( -3.5 %) |  +2.74 t ( +4.6 %) | calc t +3.2
   farm       L2  calc      0 ( 0.0 %) not the limit | measured  -4,868 ( -4.2 %) |  +0.92 t ( +1.5 %) | calc t +3.2
   hand.0     L9  calc     22 ( 0.0 %) not the limit | measured      64 ( +0.1 %) |  +0.10 t ( +0.2 %) | calc t +0.0
   hand.1     L8  calc     22 ( 0.0 %) not the limit | measured     -75 ( -0.1 %) |  +0.04 t ( +0.1 %) | calc t +0.0
   cutter.0   L3  calc      0 ( 0.0 %) not the limit | measured    -122 ( -0.1 %) |  -0.02 t ( -0.0 %) | calc t +0.0
   plumbing   L6  calc  3,930 ( 3.4 %) sold          | measured   3,160 ( +2.7 %) |  -0.59 t ( -1.0 %) | calc t +3.2
   garage     L2  calc      0 ( 0.0 %) not the limit | measured  -1,764 ( -1.5 %) |  -1.62 t ( -2.7 %) | calc t +3.2
s5 sitting 3 (h 13.5, rung 3; I 75,165; the yard 64.45 t an hour; cash 285,871)
   garage     L2  calc  1,564 ( 2.1 %) sold          | measured   4,164 ( +5.5 %) |  +1.11 t ( +1.7 %) | calc t +5.8
   cutter.0   L2  calc      0 ( 0.0 %) not the limit | measured     215 ( +0.3 %) |  +1.09 t ( +1.7 %) | calc t +0.0
   driver     L6  calc     68 ( 0.1 %) not the limit | measured     689 ( +0.9 %) |  +0.99 t ( +1.5 %) | calc t +0.0
   hand.1     L4  calc    481 ( 0.6 %) not the limit | measured     661 ( +0.9 %) |  +0.92 t ( +1.4 %) | calc t +0.0
   farm       L2  calc      0 ( 0.0 %) not the limit | measured  -1,465 ( -1.9 %) |  +0.84 t ( +1.3 %) | calc t +17.2
   hand.0     L8  calc     31 ( 0.0 %) not the limit | measured     384 ( +0.5 %) |  +0.65 t ( +1.0 %) | calc t +0.0
   plumbing   L1  calc  7,681 (10.2 %) sold          | measured  10,202 (+13.6 %) |  +0.32 t ( +0.5 %) | calc t +6.6
   demolition L1  calc      0 ( 0.0 %) not the limit | measured     -70 ( -0.1 %) |  -0.03 t ( -0.0 %) | calc t +17.2
s5 sitting 4 (h 17.75, rung 4; I 114,240; the yard 69.63 t an hour; cash 411,650)
   hand.1     L4  calc  2,883 ( 2.5 %) sold          | measured   2,102 ( +1.8 %) |  +2.24 t ( +3.2 %) | calc t +0.0
   hand.0     L12 calc      0 ( 0.0 %) not the limit | measured     500 ( +0.4 %) |  +0.97 t ( +1.4 %) | calc t +0.0
   farm       L2  calc    363 ( 0.3 %) not the limit | measured  -2,980 ( -2.6 %) |  +0.26 t ( +0.4 %) | calc t +2.9
   demolition L1  calc      0 ( 0.0 %) not the limit | measured  -3,374 ( -3.0 %) |  +0.19 t ( +0.3 %) | calc t +2.9
   garage     L3  calc  1,250 ( 1.1 %) sold          | measured      33 ( +0.0 %) |  +0.10 t ( +0.2 %) | calc t +2.9
   cutter.1   L1  calc      0 ( 0.0 %) not the limit | measured     376 ( +0.3 %) |  -0.02 t ( -0.0 %) | calc t +0.0
   driver     L9  calc    624 ( 0.5 %) not the limit | measured   3,236 ( +2.8 %) |  -0.05 t ( -0.1 %) | calc t +0.0
   cutter.0   L2  calc      0 ( 0.0 %) not the limit | measured    -128 ( -0.1 %) |  -0.21 t ( -0.3 %) | calc t +0.0
   plumbing   L4  calc  9,059 ( 7.9 %) sold          | measured   4,819 ( +4.2 %) |  -0.29 t ( -0.4 %) | calc t +2.9
```

```text
                              rung 4 at sitting       rung 5 at sitting       lifetime at sitting 8 (M)          levels bought
always, as built              5 4 5 5 4               10 9 9 9 9              10.07 15.55 14.47 13.84 15.63      20-33
(c) always, bar 0.5 %         5 4 5 5 4               9 8 9 9 8               16.49 15.98 15.59 14.47 15.02      32-47
    normal, as built          4 4 5 5 4               8 9 9 9 8               11.61 14.28 15.20 13.04 11.69      23-32
    normal, bar 0.5 %         4 4 4 4 4               9 8 8 8 8               11.29 14.66 14.73 12.83 11.97      43-51
(d) always, three tonnage     5 4 5 5 4               9 9 9 9 9               12.20 14.77 13.25 12.32 15.62      19-25
    levels forced at s3       (seed 1-4: driver, demolition or cutter, farm; seed 5: garage, cutter, driver; floor prices but seed 4's driver 77,000)
```

What the numbers say: the levels that add tonnes are the driver's (+4.3 to +5.6 t an hour, 7 to 10 % of the yard's, on seeds 1,
3 and 4) and the two small partners' (demolition +1 to +4 t, the farm +0.25 to +1.7 t), and the small partners' LOSE money
(-1.2 to -6.0 % of I measured: the same breach of ruling 17 that rated income's engineer found on the farm); the bridge
partners' levels add money (the plumber +4 to +13 %) and cost tonnes (-0.3 to -1.0 t; the garage -1.3 to -2.6 t).
ratedCapacity does not follow the measured tonnes (the driver's level 0 calculated against +4 to +5.6 measured). The bored
borrower of REPORT10 is now seed 1 alone (sittings 3 and 4; seeds 2 to 5 buy 8 to 14 levels at sitting 3), and it is a
calculated gain under the bar: the plumber's level reads 825 an hour, 0.99 % of I, and MEASURES 5,250, 6.3 %.
WHAT I WOULD RULE: no price by tonnes (forcing the tonnage levels brings rung 5 one sitting sooner on one seed of five and
leaves the yard 5 to 11 % poorer by sitting 8 on three, because they are the money-losing small partners' levels); keep the
bar at 1 % and make the partner levels' calculated gain read what they measure (rated income's term: on seed 1 the plumber's
reads a sixth of it), and stop a level from being sold where it lowers what the yard keeps (the farm, the demolition). If the
lead prefers a bar, 0.5 % helps the borrower (rung 5 a sitting sooner on 3 of 5, never later) and leaves the never-borrowing
hand where it was (rung 5 sooner on 3, later on 1; lifetime within 3 %), at about twice the level presses per run.

### The lead's pair of 21:15: the driver takes the richest load first (truck.pickFromRung 3)

```text
normal 5 (as built -> ranked)  lifetime s4 / s6 / s8 means 3.08M / 7.36M / 13.16M -> 3.18M / 7.98M / 14.52M (+3, +8, +10 %)
                               kept an hour: r4 entry 116.8k -> 117.6k; day 3 136.6k -> 152.3k; r5 entry 180.0k -> 209.8k
                               TONNES at sitting 7: 2,360 -> 2,088 (-11.5 %; seed 1 -26 %); rung 4 4 4 5 5 4 -> 5 4 5 5 4; rung 5 8 9 9 9 8 -> 10 9 9 10 9
                               loads an hour away: farm 27-55 -> 15-21, plumbing 30-70 -> 59-85, garage 15-42 -> 19-47, demolition 8-14 -> 9-16
                               every open partner served; materials 8 of 8 by sitting 4 on all; floor fill away at rung 4 0.55-0.72 -> 0.44-0.59;
                               cutters idle away at rung 4 28-44 % -> 34-55 %, the driver and the hands as before; dry sittings 0-1 both; 0 promises broken
always 3                       lifetime at s8 10.07 / 15.55 / 14.47 -> 14.11 / 16.82 / 13.60; tonnes at s7 2,156 -> 2,000 (-7 %); rung 5 10 9 9 -> 10 9 10
```

It pays in money (+10 % by sitting 8) and costs tonnes (-7 to -12 %) and two thirds of a sitting to rung 5 on the median. I
would not switch it on as the answer to the farm's case: the stage's purpose is tonnes, and the fault is that the farm's levels
are sold where they lower what the yard keeps (the borrower's table above shows the same on the demolition yard).

### The gates G1 and G2 as they now stand

| gate | REPORT10 | now | verdict |
|---|---|---|---|
| G1 entry | items 5 of 7 met (rotary 0.3 %, copper 1.6 % missed); walk 2 of 30 failing | the three halls met on 29.3's form (21.2 %, 2.33 %, 3.67 %; 6.9, 5.6, 6.1 s.e.); the plasma at 1.98 % (third moment; its price stands, 28.8 c is the lead's); the walk and the hidden best buys not run again | MISSED (the plasma), walk not re-measured |
| G2 rated income | 1.00 1.00 0.99 1.22 1.27 1.09; kappa 1 | 1.00 1.00 1.00 1.07 1.10 1.15 (normal 15); every value within 0.8 to 1.25 but the medians from day 3 outside 0.95 to 1.05; kappa 1 (0.97 / 0.87 refused, above); ladders 0.87 to 1.29 but the garage 0.64 | MISSED |

Gates at the end of this step: tsc clean; the salvage suite once, alone: 101 files, 1,159 tests passed, 4 todo; check:bundle
clean; build-yard.py --check passes; check.ts --all 1,014 texts, 0 findings; validate scrap-yard exit 0 (release.stage 1, the
shared product list empty); first-yard.sh after the price change PASS (30 cases, 295 ops, 0 differences).
first-yard.sh --full at the end (alone): content PASS; engine 30 cases, 295 ops, 0 differences; same.ts 4 of 4; the 75-run comparison 75 of 75 identical below rung 3; FIRST YARD: PASS (G13 met).
