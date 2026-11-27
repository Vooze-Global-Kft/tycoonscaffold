# Scrapyard: the bots' measurement of stage 2 after the fixes (REPORT9, 27 November)

This is the balance bots' last report on stage 2 (`yard-stage2.md`) before the calibration of rated income: the bots of
its 8.2 on the real content read at `release.stage` 2 in memory (the shipped content keeps the key at 1 and an empty
shared product list: stage 2 stays dark on the owner's phone), after both rounds of fixes of `RULING2.md` 22 to 24. It
replaces REPORT8. Fifteen seeds on both opening routes for the normal hand, five unseen (101 to 105), five for the money
and planning variants and the two strategy pairs of the attacks (the crane, the bridge partners), three for the other
habits; the prices of every plate, vehicle and tool set once more from their gain over an hour of play and a capped
absence (ruling 21.1). The tables T8 and T12 put every measured gain beside its rated gain: they are the calibration's
input. `yard-bots.md` stays the first yard's report (REPORT7); the first yard's hour is shown unchanged here. Paths that
begin "scratchpad" or name the build's notes (`notes/`, `bots/s4/`, `c4/`) are working notes, not in the repository.

```text
REPORT9: THE BOTS MEASURE STAGE 2 AGAIN, AFTER THE FIXES (content2-bots, the last measurement; 27 November 04:10 to 07:30)
========================================================================================================================
Program: src/engine/salvage/bot.ts (this step: BotOptions.noBuy for the measured branches; the boss drives the forklift,
car pad to the depollution apron, forkliftLeg; two tests in bot.test.ts), scripts/content/yard-bot.ts (this step: ruling
21.1's measure of every plate, vehicle and tool over an hour of play and one capped absence; the rated gain beside every
measured gain, T8 and T12; the crane pair noCrane; the bridge-partner play bridgeLevels; the opening's route B on the normal
hand, routeB; packs against headroom, T11; the bridge partners' levels by sitting; two probe variants of planning ahead,
cut60 and hand15). Content: src/config/salvage.content.ts -> games/scrap-yard/game.json, ONE round of numbers (section 2);
release.stage STILL 1 and the shared product list empty in the real file (every run reads it at stage 2 through
src/engine/fixtures/shipped2.ts). Engine: branch scrap-yard after both rounds of fixes (RULING2.md 22 to 24), not edited
while these runs went.
Seeds: 1 to 15 on BOTH routes for the normal hand (route A "normal", route B "routeB"), 101 to 105 unseen; 5 seeds for
always, flat, behind and noise, noCrane, bridgeLevels; 3 for the other habits and old. The prices' measure (ruling 21.1)
and the purchase walk (17.1) on 15 seeds, on the states of the prices before round 1 ("round 0"). Every command under 30
minutes, at most three jobs once '[lead] gates done 3' stood (one before).

Commands (scratchpad yard/bots/s4/run.sh, queue.sh, jobs.sh wrap them; --cache yard/bots/s4/cache; JSON beside each):
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 6 --bots normal --seeds 1 --first N --plates --walk2 --json PN.json   (N = 1..15)
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 6 --from P1.json,...,P15.json --plates write        (bots/plates.json, R0.txt)
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --bots normal|routeB --seeds 3 --first 1|4|7|10|13 (Na..Ne, Ba..Be)
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --bots normal --unseen                            (U, UNSEEN.txt)
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --bots noCrane | bridgeLevels | always | flat --seeds 5
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --bots behind,noise --seeds 5 (two shards)
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --bots manager,slow,steelMax | leadCut,brisk,packs | ads,racker,cutter,holder --seeds 3
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 6 --bots old --seeds 3 ; --bots cut60,hand15 --seeds 5
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --from Na.json,...,V2.json                        (R1.txt: the table below)
  npx tsx scripts/content/yard-bot.ts --seeds 15 --routes 2 --only beats,gate                                   (the first yard, st1a/st1b)
  python3 <scratchpad>/yard/c4/cmp1.py st1a.json st1b.json        (the first yard's hour against the last stage-1 report's runs)
  npx tsx <scratchpad>/yard/c4/same.ts <game.json before this step>   (the first yard bit for bit: this bot.ts and content
                                                                        against HEAD's bot.ts on the content before)

VERDICT. On the shipped rules after both rounds of fixes, rung 4 comes on day 2.0 to 2.5 and rung 5 on day 4.5 to 5.0 on
every normal seed of both routes and on the five unseen (15/15, 15/15, 5/5 in band); no hard promise broke on 198 runs; a
minute of ticks equals one jump at 120 checks; the first yard's hour below rung 3 at release.stage 1 is UNCHANGED to the
millisecond against the last stage-1 report (75 of 75 runs). One round of numbers: every plate, vehicle and tool priced
from its gain over an hour of play and a capped absence (ruling 21.1): the hook-lift §12,000 -> §154,000 and the plasma
§8,000 -> §64,900 (the stage's two best buys), the shredder §419,000 -> §83,200, the induction hall §171,000 -> §207,000,
the breaker §38,100 -> §3,000. No second round: no aim that held in REPORT8 and misses now has a content number that
fixes it (section 4). What numbers cannot fix, for the lead: (1) the BATTERY BREAKER makes the yard poorer (-§4,476 an
hour, 15 of 15 seeds; ruling 17, blocking); (2) the magnet crane is inert (the pair within 0.1 %, the crane's mean exactly
0.0 %: gate R1 (a)'s "above zero" missed by nothing); (3) planning ahead now COSTS: trip by trip keeps +9.9 % lifetime and
+15.5 % tonnes at day 3 (REPORT8: met), and the planned runs' lengths are not why; (4) the normal hand never buys the
plasma, so no oversize piece ever comes (lots cut 0 in every sitting of every run) while 'cutLot' stands in the goal list;
(5) the card manager stalls at rung 3 for good (the advice line names nothing once the hook-lift's rated payback is over
tau_3: the price rule sets payback to exactly tau on the MEASURED gain and rated income under-reads it); (6) no Bank loan
is ever offered (no plate costs more than the cash a sitting holds): L1 0 of 20, L5 not measurable; (7) packs: no pack
ever fits the headroom with the player's own cash at rungs 4 and 5 (U about 1.1 h of I); (8) rated income over-reads by
37 to 46 % from rung 3's last purchase on (the calibration is the next step: T8 and T12 are its table).

1. THE AIMS, ONE BY ONE ("moved" = since REPORT8; normal = route A 1 to 15, routeB = route B 1 to 15, unseen = 101 to 105)
   rung 4 at day 2 to 3 ............. met: sitting 4 on 11 and 5 on 4 of 15 (normal), 14 + 1 (routeB), 5 of 5 unseen at 4;
                                     slow 2.5, brisk 2.0 to 2.5; every habit in band but the card manager and steel-max (T1).
                                     Moved: 4 of 15 seeds half a day later than REPORT8's day 2.0 (the hook-lift now costs
                                     §154,000 and waits a sitting where the first rung-3 sitting holds less).
   rung 5 at day 4 to 6 (item f) .... met: sitting 9 on 11 and 10 on 4 (normal), 14 + 1 (routeB), 5 of 5 unseen at 9; slow at 12
                                     (day 6.0, the band's edge), brisk 9 to 10, the holder 9 to 11. Moved: half a day to a day
                                     later than REPORT8's 8; still in band: rung 5's 3,600 t NOT retuned.
   last goal purchase and rung 5 within about two sittings (19.3) ... MISSED: the last goal purchase comes at sitting 5 and
                                     rung 5 at 9 or 10 (four or five sittings apart).
   a useful purchase every sitting .. MISSED: 63 of 139 sittings (normal), 60 of 136 (routeB) buy nothing; 4 to 5 a seed, all
                                     after the goal list is done (REPORT8: 9 of 40). The advice line now says what the yard
                                     waits for (21.5, R3) instead; it names no purchase.
   cash at most 2 tau_r of income ... met on the normal hand (no sitting over; cash ends at §5.6M to §6.5M).
   I against G, 14.10 (item e) ...... MISSED at every moment but rung 3's entry: medians 0.91, 1.31, 1.46, 1.44, 1.38, 1.44 on
                                     the normal board (15 seeds), 0.89, 1.05, 1.48, 1.44, 1.37, 1.44 flat (5); unseen 0.90, 1.04,
                                     1.46, 1.44, 1.39, 1.44. Moved: from 0.88 to 1.33 (REPORT8) to 0.89 to 1.48: the over-reading
                                     now holds from rung 4's entry to rung 5. Measured gains beside rated gains: T8 (plates,
                                     vehicles, tools) and T12 (every level and hire): the calibration's input.
   planning ahead, 14.9 ............. MISSED (REPORT8: met): ahead false (trip by trip) against true: +4.5 % lifetime at day 1,
                                     +9.9 % at day 3, +15.5 % tonnes at day 3 (s.e. 0.9 to 2.1 %; 5 seeds), noise floor -0.3 to
                                     -0.1 %; and rung 5 a sitting sooner (8 against 9). Probe: the planned runs shorter does not
                                     close it (cutRun_s 60: -2.8 % at day 3; handRun_s 15: +0.7 %). Not a number: the loop's.
   new order of work against old .... met: old -15.6 % lifetime, -13.6 % tonnes at day 3 (3 seeds).
   the bank: first offer within two sittings of rung 3 (L1, a measure) ... 0 of 5 (always), 0 of 15 (normal): the lender's
                                     letter never falls due (no works card shows a plate dearer than the cash: rung 3's dearest
                                     plate is the analyser at §32,800 against §100k+ in hand at rung 3's first return; the
                                     shredder §83,200 against about §1.8M at rung 4's). Moved: REPORT8 had the shredder offered
                                     at rung 4 on 4 of 5.
   the first loan repaid before rung 4 (L5, a gate) ... NOT MEASURABLE: no loan on any run.
   rung 5 at most a tenth sooner with every loan ... met trivially (0.0 %).
   ad rewards at most 4 % of a day .. met: 1.8 % on day 1 (max 2.1), under 1 % after (T5).
   the Yard sale and the van 2 to 5 %, never over 8 % ... MISSED both ends, never over 8 %: day 1 6.9 % (max 7.5), days 2 to 5
                                     1.8 to 1.9 % (REPORT8: 5.2, 4.7, 4.5 %). Moved: the van's day-1 share (6.1 %) and the
                                     yard's own income since the fixes (the van and the rack stay; everything else grew).
   the plates' payback 0.8 to 1.5 tau  met by construction on the measured mean (price = tau_r x dE); per seed the spread is
                                     the hour's noise (T8: s.e. of dE §66 to §1,233 an hour).
   which plate first meets the finance floor ... none is ever offered (above).
   the hand's worth >= 1.2 x the card manager ... met: 3.67 at sitting 4, 5.34 at sitting 8 (the manager stalls).
   no mechanism over three fifths ... NOT MEASURED.
   E19, an hour away 0.3 to 0.8 of an hour played ... MISSED at rung 4: 0.89 (0.74 to 1.05, 75 sittings); rung 3 0.70 (REPORT8
                                     0.46 at both). Moved: the hand earns less in play since the oversize loop is closed and the
                                     yard plates weigh where they make (no tray trips); no content key scales time away.
   packs on against off ............. the packs bot bought NO pack in 3 runs (the headroom refuses every one); item (b): T11.
   the day-word holder (14.11) ...... MISSED: -25 %, -10 %, -12 % lifetime at day 3 (stock it holds not counted).
   racker against cutter ............ racker +17.9 / -0.1 / -8.4 %, cutter +17.3 / +0.1 / -0.4 % at day 3 (3 seeds; seed 1's
                                     +18 % is the normal hand's own slow rung 4 on that seed).
   steel-max ........................ stalls at rung 3 with 6 materials on 3 of 3 (19.4: the design).
   the lead cut ..................... rung 4 in band; DEAD END at rung 5 (8 materials) on 3 of 3 (21.6: the build's check
                                     refuses such a content; the shipped content keeps the lead line).
   the card manager ................. NEVER reaches rung 4 (12 sittings, 6 materials, §1.7M to §2.0M idle; REPORT8: day 3.5 to
                                     4.0). Smallest example (scratchpad yard/c4/adv.ts, seed 1, sitting 3, cash §225,222):
                                     advice() null; the hook-lift's rated gain §14,892 an hour against its §154,000 = 10.3 h >
                                     tau_3 9 h; adviceLine is the wait "waits for alu: the depollution bay makes it", which has
                                     no button. A card-only player can never open the bridge.
   no hand .......................... not run this time (--nohand false).
   the purchase walk, 17.1 (item d) . 5 of 74 steps FAIL, all partner levels (section 9 below, round-0 states, 15 seeds):
                                     day 3: partnerFarm -2.65 % (worst -3.17 %), partnerDemolition -2.20 % (-3.13 %); rung 4's
                                     entry: partnerFarm -3.47 % (-4.37 %, the one seed under -4 %), partnerDemolition -2.51 %
                                     (-3.10 %), partner.garage -1.82 % (-2.69 %). REPORT8's crane, baler, driver (r3) and farm
                                     (r3) failures now pass (+1.26, +0.56, -0.23, +0.50 %). The breaker at rung 4's entry
                                     -0.57 % (inside the bound; at its planned moment, sitting 5, -3.5 %: T8).
   hidden best buys (E8, item c) .... the hook-lift and the plasma at r3s1 on 15 of 15 seeds (+54 %, +30 % of G), a cutter's
                                     level (13), the driver's level at r4entry (15) and day 3 (13: +5.5 to 6.2 %, payback 0.3 to
                                     0.4 h, rated gain 0), the induction hall at r4entry (11), the analyser at r3s1 (8).
   lots cut per sitting (item c) .... 0 in every sitting of every run (and 0 came): the plasma is never bought (verdict 4).
   the crane pair (item a; 24 R1 (a)) ... the crane loses nothing (noCrane against normal: +0.0 % at day 1, +0.0 % at day 3,
                                     worst -0.1 %, best +0.1 %, 5 seeds) and gains nothing (mean 0.0 %): "above zero" MISSED by
                                     a hair; rung 5 in band 5/5 either way. Its played gain at its planned moment §328 an hour
                                     (s.e. 298): the floor's worth.
   the bridge-partner play (item a; E4) ... met: rung 5 at sitting 9 or 10 on 5 of 5 (in band), both partners at level 20 by
                                     sitting 3 or 4, +2.3 % lifetime at day 3 (worst -2.6 %); the dead end is gone.
   packs against headroom (item b) .. T11: rung 4, 200 moments on 20 seeds: U a median 1.09 h of I (0.83 to 3.29), cash 15.5 h;
                                     with own cash NO pack fits (0 of 200 for 2, 5, 10, 20 h); with an empty purse only the 2 h
                                     pack, at the rung-4 entry's return (19 of 200); rung 5 (40 moments): none fits, either way.
   tick against jump ................ met: 120 checks (a minute of ticks against one jump at sittings 1 to 5, 8, 12) on 20 runs.
   the hard promises ................ met on 198 runs (103 table + 5 unseen + 15 prices + 75 first yard): shown = applied,
                                     money only by lot payments, ads and grants, cash never negative, the away card's sum,
                                     nothing of money before the second session. Refusals are the bot's own (guard 177: legs
                                     that came to nothing twice set aside; commissionSide 97; earmark 9).
   the bench ........................ NOT MEASURED (the machine was shared throughout).
   THE FIRST YARD (lead's note 5) ... its hour below rung 3 at release.stage 1 has NOT moved: 75 of 75 runs (15 seeds x normal
                                     goal A, normal all A, normal goal B, brisk, slow) give every first-time mark, every purchase
                                     (second and price), rung 2 and rung 3 to the millisecond of owner1fix/after-b.txt's runs
                                     (the table of notes/owner1-fix-rules.md); and this step's bot.ts and content play the first
                                     yard bit for bit as HEAD's bot.ts on the content before (4 hands, both routes, to rung 3,
                                     two absences and sittings). No first-yard number changed.

2. THE NUMBERS CHANGED (one round; src/config/salvage.content.ts, a $changes line; scripts/content/bots/plates.json)
   round 1  prices = max(works.floor, tau_r x dE), dE the mean over seeds 1 to 15 of the played gain (21.1), three figures:
              shear 3,000 -> 5,180   analyser 29,100 -> 32,800   shredder 419,000 -> 83,200   rotary 77,600 -> 65,100
              induction 171,000 -> 207,000   breaker 38,100 -> 3,000   smelter 27,500 -> 17,700
              truckBridge 12,000 -> 154,000   plasma 8,000 -> 64,900   pallet 2,500 -> 3,000   forklift 15,000 -> 3,000
              at the floor 3,000 as before: crane, baler, depollution, granulator, eddy, sorter
   Not changed: rung 5's 3,600 t (in band), reuse.batchFactor, group.*, every number of the first yard.

3. BEFORE AND AFTER (normal hand)          REPORT8 (5 seeds)      round 0 (15 seeds, 6 sittings)   round 1 (15 + 15 B + 5 unseen)
   rung 4 sitting                           4 on 5/5               4 on 15/15                       4 on 11, 5 on 4 (A); 4 on 14 (B)
   rung 5 sitting                           8 on 5/5               -                                9 on 11, 10 on 4 (A); 9 on 14 (B)
   sittings without a purchase              9 of 40                (6 sittings)                     63 of 139 (A), 60 of 136 (B)
   I/G medians (6 moments)                  0.94 1.31 1.30 0.92 0.92 0.88   0.91 1.37 1.44 1.44 1.38 -   0.91 1.31 1.46 1.44 1.38 1.44
   Yard sale + van, days 1/2/3             5.2 / 4.7 / 4.5 %      -                                6.9 / 1.9 / 1.8 %
   walk failing steps                       5 of 64                5 of 74 (partner levels)         (walked on round 0)
   planning ahead, day 3 lifetime           -0.7 % (met)           -                                +9.9 % for trip by trip (MISSED)

4. WHY NO SECOND ROUND
   The aims that held in REPORT8 and miss now: planning ahead (the rule: no content number found; the probe of run lengths
   says so), E19 at rung 4 (no content key scales time away against play), the Yard sale and the van (day 1 over, days 2 to
   5 under: reuse.batchFactor moves both the same way), the bank's first offer (a price rule result: L1 is a measure by 19.6),
   the card manager (the advice's window against the price rule: a rule). Rung 4 and rung 5 stayed in band, so rung 5's
   tonnage stays. A second round of prices would move the measured gains by less than their standard errors.

5. WHAT THE LEAD MUST DECIDE
   a. The breaker (17, blocking): it is a goal purchase and loses §4.5k an hour; its feed and the garage's battery loads
      (requests.md, with the smallest example).
   b. The crane (24 R1 (a)): it does nothing now (inert, not poorer): its gate "the pair's mean above zero" is missed by 0.0 %;
      what it would need is in notes/s2c-fix-works2.md.
   c. Planning ahead (14.9): trip by trip wins 10 % at day 3; the loop's owner (group.ahead, the runs' plans).
   d. The plasma and the oversize pieces: a goal 'buyPlasma' before 'cutLot', or the advice seeing the plasma; until then the
      hand's worth of 2.10 (D4) is unmeasured: no piece ever comes on the normal hand.
   e. The advice against the price rule: an item priced at exactly tau_r x its measured gain is named by the advice only where
      rated income reads its gain at least as high; until the calibration, the card manager cannot open the bridge.
   f. Packs (23.5): the 5, 10 and 20 h packs never fit an ordinary moment; the 2 h only with an empty purse at rung 4's entry.
   g. The bank (L1, L5): with 21.1's prices no plate is ever dearer than the cash in hand, so the bank never speaks.
   h. The gates' numbers of 9.2 from this table.

THE TABLE (round 1): yard-bot.ts --stage 2 --from Na..Ne, Ba..Be, Ca, Ka, Fa, La, Ha, Hb, Ma, Mb, Mc, O, V1, V2
------------------------------------------------------------------------------------------------------------------------
REPORT9 TABLE (yard-stage2.md 9.2; 103 stage-2 runs; bots normal, routeB, noCrane, bridgeLevels, always, flat, behind, noise, manager, slow, steelMax, leadCut, brisk, packs, ads, racker, cutter, holder, old, cut60, hand15)

T1. RUNG 4 AT DAY 2 TO 3 (sittings 4 to 6), RUNG 5 AT DAY 4 TO 6 (sittings 8 to 12): per bot, the sitting of each per seed and the count in band
   normal    n 15  rung 4 at 5 4 4 4 4 4 4 4 4 4 5 5 4 5 4  (15/15 in band, median day 2.00)   rung 5 at 10 9 9 9 9 9 9 9 9 9 10 10 9 10 9  (15/15 in band)
   routeB    n 15  rung 4 at 4 4 4 4 4 4 4 4 4 4 4 4 4 5 4  (15/15 in band, median day 2.00)   rung 5 at 9 9 9 9 9 9 9 9 9 9 9 9 9 10 9  (15/15 in band)
   noCrane   n  5  rung 4 at 5 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at 10 9 9 9 9  (5/5 in band)
   bridgeLevels n  5  rung 4 at 5 4 5 4 4  (5/5 in band, median day 2.00)   rung 5 at 10 9 10 9 9  (5/5 in band)
   always    n  5  rung 4 at 5 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at 10 9 9 9 9  (5/5 in band)
   flat      n  5  rung 4 at 4 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at 9 9 9 9 9  (5/5 in band)
   behind    n  5  rung 4 at 5 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at 9 8 8 8 8  (5/5 in band)
   noise     n  5  rung 4 at 5 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at 10 9 9 9 9  (5/5 in band)
   manager   n  3  rung 4 at - - -  (0/3 in band, median day -)   rung 5 at - - -  (0/3 in band; not reached on 3, end 2254.4 t 6 mat, 2381.5 t 6 mat, 2558.8 t 6 mat)
   slow      n  3  rung 4 at 5 5 5  (3/3 in band, median day 2.50)   rung 5 at 12 12 12  (3/3 in band)
   steelMax  n  3  rung 4 at - - -  (0/3 in band, median day -)   rung 5 at - - -  (0/3 in band; not reached on 3, end 2781.5 t 6 mat, 3455.3 t 6 mat, 3054.7 t 6 mat)
   leadCut   n  3  rung 4 at 5 4 4  (3/3 in band, median day 2.00)   rung 5 at - - -  (0/3 in band; not reached on 3, end 4702.3 t 8 mat, 5357.3 t 8 mat, 5184.7 t 8 mat)
   brisk     n  3  rung 4 at 4 4 5  (3/3 in band, median day 2.00)   rung 5 at 9 9 10  (3/3 in band)
   packs     n  3  rung 4 at 5 4 4  (3/3 in band, median day 2.00)   rung 5 at 10 9 9  (3/3 in band)
   ads       n  3  rung 4 at 4 4 4  (3/3 in band, median day 2.00)   rung 5 at 9 9 9  (3/3 in band)
   racker    n  3  rung 4 at 4 4 5  (3/3 in band, median day 2.00)   rung 5 at 9 9 10  (3/3 in band)
   cutter    n  3  rung 4 at 4 4 4  (3/3 in band, median day 2.00)   rung 5 at 10 9 9  (3/3 in band)
   holder    n  3  rung 4 at 5 4 5  (3/3 in band, median day 2.50)   rung 5 at 11 9 10  (3/3 in band)
   old       n  3  rung 4 at 5 5 5  (3/3 in band, median day 2.50)   rung 5 at - - -  (0/3 in band; not reached on 3, end 1730.7 t 8 mat, 1667.5 t 8 mat, 1749.5 t 8 mat)
   cut60     n  5  rung 4 at 5 4 4 4 5  (5/5 in band, median day 2.00)   rung 5 at - - - - -  (0/5 in band; not reached on 5, end 1706.4 t 8 mat, 2285.8 t 8 mat, 2046.5 t 8 mat, 2238.6 t 8 mat, 1810.4 t 8 mat)
   hand15    n  5  rung 4 at 5 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at - - - - -  (0/5 in band; not reached on 5, end 1739.2 t 8 mat, 2284.8 t 8 mat, 2167.2 t 8 mat, 2238.3 t 8 mat, 2000.2 t 8 mat)

T2. RATED INCOME I AGAINST G (14.10; G a capped absence at usual prices from the sitting's return, I at the same state; gate per moment: median 0.95-1.05, 13 of 15 in 0.88-1.12, none outside 0.80-1.25)
   PLAYED WITH THE NORMAL BOARD, 15 seeds
     r3 entry (sitting 1) n 15  I/G median 0.91  11/15 in 0.88-1.12  min 0.85 max 0.97  0 outside: MISSED   [0.89 0.86 0.88 0.89 0.96 0.97 0.93 0.89 0.92 0.92 0.96 0.86 0.85 0.92 0.91]
     r3 last purchase     n 15  I/G median 1.31  5/15 in 0.88-1.12  min 0.91 max 1.48  10 outside: MISSED   [1.41 1.43 1.39 1.07 1.31 1.48 1.30 1.41 1.00 0.91 1.27 1.48 0.96 1.32 1.04]
     r4 entry             n 15  I/G median 1.46  0/15 in 0.88-1.12  min 1.41 max 1.57  15 outside: MISSED   [1.44 1.46 1.46 1.46 1.44 1.50 1.44 1.44 1.46 1.41 1.41 1.48 1.48 1.43 1.57]
     day 3 (sitting 6)    n 15  I/G median 1.44  0/15 in 0.88-1.12  min 1.35 max 1.46  15 outside: MISSED   [1.35 1.46 1.44 1.44 1.44 1.42 1.44 1.42 1.46 1.40 1.40 1.38 1.44 1.35 1.46]
     r4 last purchase     n 15  I/G median 1.38  0/15 in 0.88-1.12  min 1.34 max 1.42  15 outside: MISSED   [1.35 1.42 1.38 1.38 1.38 1.35 1.39 1.34 1.39 1.34 1.40 1.38 1.39 1.35 1.38]
     r5 entry (run end)   n 15  I/G median 1.44  0/15 in 0.88-1.12  min 1.40 max 1.48  15 outside: MISSED   [1.42 1.48 1.44 1.44 1.45 1.41 1.44 1.42 1.47 1.40 1.47 1.48 1.44 1.45 1.47]
   PLAYED WITH PRICES FLAT (board.a 0), 5 seeds
     r3 entry (sitting 1) n  5  I/G median 0.89  3/5 in 0.88-1.12  min 0.87 max 0.91  0 outside: MISSED   [0.88 0.89 0.91 0.89 0.87]
     r3 last purchase     n  5  I/G median 1.05  3/5 in 0.88-1.12  min 0.98 max 1.40  2 outside: MISSED   [1.03 1.35 1.40 1.05 0.98]
     r4 entry             n  5  I/G median 1.48  0/5 in 0.88-1.12  min 1.44 max 1.56  5 outside: MISSED   [1.56 1.44 1.48 1.48 1.48]
     day 3 (sitting 6)    n  5  I/G median 1.44  0/5 in 0.88-1.12  min 1.44 max 1.47  5 outside: MISSED   [1.44 1.44 1.44 1.46 1.47]
     r4 last purchase     n  5  I/G median 1.37  0/5 in 0.88-1.12  min 1.37 max 1.49  5 outside: MISSED   [1.49 1.39 1.37 1.37 1.37]
     r5 entry (run end)   n  5  I/G median 1.44  0/5 in 0.88-1.12  min 1.44 max 1.49  5 outside: MISSED   [1.44 1.44 1.44 1.48 1.49]

T3b. THE YARD HANDS' ORDER OF WORK, NEW AGAINST OLD (RULING2.md 16.7, 16.3 (ii)): crew.orderFromRung beyond the ladder (old) against the shipped rule (normal), the mean over seeds of old / new - 1; aim: new keeps at least what old kept
   day 1 lifetime earnings  n  3  old vs new mean -11.1 % (worst -34.9 %, best +1.2 %): met
   day 1 supplied t         n  3  old vs new mean -8.8 % (worst -32.4 %, best +3.4 %): met
   day 3 lifetime earnings  n  3  old vs new mean -15.6 % (worst -27.2 %, best -7.1 %): met
   day 3 supplied t         n  3  old vs new mean -13.6 % (worst -26.9 %, best +0.6 %): met

T3. PLANNING AHEAD (14.9): ahead true (normal) against false (behind), the MEAN over seeds of (true / false - 1) ... printed as false against true; the noise floor (cutters x (1 + 1e-9)) beside; gate: within 2 % for lifetime earnings and 5 % for supplied
   day 1 lifetime earnings  n  5  false vs true mean +4.5 % (s.e. 0.9 %; worst +1.8 %, best +6.4 %)  noise mean -0.3 % (n 5): MISSED
   day 1 supplied t         n  5  false vs true mean +3.9 % (s.e. 0.9 %; worst +1.6 %, best +6.3 %)  noise mean -0.1 % (n 5): met
   day 3 lifetime earnings  n  5  false vs true mean +9.9 % (s.e. 1.8 %; worst +5.1 %, best +15.3 %)  noise mean -0.1 % (n 5): MISSED
   day 3 supplied t         n  5  false vs true mean +15.5 % (s.e. 2.1 %; worst +10.1 %, best +20.8 %)  noise mean -0.1 % (n 5): MISSED

T4. THE BANK (2.14; LEAD L1, L5): first offer within the first two sittings of rung 3 (12 of 15); every loan; the first repaid before rung 4 on every seed, with the hours PLAYED (aim about 4) and of the yard RUNNING (about 7); rung 5 at most a tenth sooner than never-financing
   normal  s  1: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 67.3 h
   normal  s  2: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   normal  s  3: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 59.0 h
   normal  s  4: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   normal  s  5: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   normal  s  6: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   normal  s  7: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   normal  s  8: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   normal  s  9: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   normal  s 10: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   normal  s 11: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 65.3 h
   normal  s 12: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 65.3 h
   normal  s 13: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   normal  s 14: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 65.3 h
   normal  s 15: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   always  s  1: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 67.3 h
   always  s  2: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   always  s  3: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 59.0 h
   always  s  4: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   always  s  5: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 63.0 h
   first offer within two sittings of rung 3 (always bot): 0/5 (aim 12 of 15)
   rung 5 sooner with every loan than never: median +0.0 %, max +0.0 % (aim at most +10 %)
   first loan NOT repaid before rung 4: 0 of 0 runs with a loan (gate: none)

T5. SHARES OF A DAY'S EARNINGS (lifetime earnings over two sittings): ad rewards (aim at most 4 %, ads bot); the Yard sale and the van (2 to 5 %, never over 8 %, normal bot): per day 1..7, median over seeds [max]
   ads (ads bot)          d1 1.8 [2.1]  d2 0.9 [0.9]  d3 0.0 [0.7]  d4 0.7 [0.7]   (0 seed-days over 4 %)
   Yard sale + van (normal) d1 6.9 [7.5]  d2 1.9 [2.0]  d3 1.8 [1.9]  d4 1.9 [2.1]  d5 1.8 [1.9]   (0 seed-days over 8 %)
     of it the van        d1 6.1 [6.7]  d2 0.9 [1.0]  d3 0.7 [0.8]  d4 0.7 [0.8]  d5 0.7 [0.7]   (0 seed-days over 8 %)
   Yard sale + van (racker) d1 6.9 [7.1]  d2 1.9 [2.0]  d3 1.8 [1.9]  d4 1.9 [1.9]  d5 1.9 [1.9]   (0 seed-days over 8 %)
   E19 rung 3: an hour away / an hour played (earnings), median 0.70 over 34 sittings, min 0.27 max 0.89 (aim 0.3 to 0.8)
   E19 rung 4: an hour away / an hour played (earnings), median 0.89 over 75 sittings, min 0.74 max 1.05 (aim 0.3 to 0.8)

T6. A USEFUL PURCHASE EVERY SITTING; CASH AT A SITTING'S END AT MOST 2 TAU_r OF INCOME (tau_h by rung; income = G at that return)
   normal    sittings without a purchase: 63 of 139 (per seed 5 3 4 5 4 4 4 4 4 5 4 4 5 4 4)
   routeB    sittings without a purchase: 60 of 136 (per seed 4 3 3 4 5 5 3 4 4 4 5 3 4 4 5)
   noCrane   sittings without a purchase: 21 of 46 (per seed 5 3 4 5 4)
   bridgeLevels sittings without a purchase: 20 of 47 (per seed 4 4 4 4 4)
   always    sittings without a purchase: 21 of 46 (per seed 5 3 4 5 4)
   flat      sittings without a purchase: 21 of 45 (per seed 5 4 4 4 4)
   behind    sittings without a purchase: 15 of 41 (per seed 4 2 3 4 2)
   noise     sittings without a purchase: 21 of 46 (per seed 5 3 4 5 4)
   manager   sittings without a purchase: 31 of 36 (per seed 11 10 10)
   slow      sittings without a purchase: 21 of 36 (per seed 7 7 7)
   steelMax  sittings without a purchase: 33 of 36 (per seed 11 11 11)
   leadCut   sittings without a purchase: 21 of 36 (per seed 7 7 7)
   brisk     sittings without a purchase: 13 of 28 (per seed 4 4 5)
   packs     sittings without a purchase: 12 of 28 (per seed 5 3 4)
   ads       sittings without a purchase: 10 of 27 (per seed 3 3 4)
   racker    sittings without a purchase: 12 of 28 (per seed 4 3 5)
   cutter    sittings without a purchase: 12 of 28 (per seed 5 3 4)
   holder    sittings without a purchase: 14 of 30 (per seed 6 3 5)
   old       sittings without a purchase: 3 of 18 (per seed 1 1 1)
   cut60     sittings without a purchase: 6 of 30 (per seed 1 1 1 2 1)
   hand15    sittings without a purchase: 6 of 30 (per seed 1 1 1 2 1)

T7. THE HAND'S WORTH (normal against the card manager, lifetime earnings at sittings 4 and 8: aim at least 1.2); PACKS (rung times against off, the buyer's lead); STEEL-MAX; THE LEAD CUT
   normal / manager at sitting 4: median 3.67, min 2.84 (3 seeds)
   normal / manager at sitting 8: median 5.34, min 4.65 (3 seeds)
   packs s1: 0 packs §0; lead at rung 5 0.0 h of the yard's clock (0 days)
   packs s2: 0 packs §0; lead at rung 5 0.0 h of the yard's clock (0 days)
   packs s3: 0 packs §0; lead at rung 5 0.0 h of the yard's clock (0 days)
   steelMax s1: ends rung 3 at 2781.5 t, 6 materials, goal buyAnalyser, 12 sittings
   steelMax s2: ends rung 3 at 3455.3 t, 6 materials, goal buyAnalyser, 12 sittings
   steelMax s3: ends rung 3 at 3054.7 t, 6 materials, goal buyAnalyser, 12 sittings
   leadCut s1: ends rung 4 at 4702.3 t, 8 materials, goal supplyRung5, 12 sittings
   leadCut s2: ends rung 4 at 5357.3 t, 8 materials, goal supplyRung5, 12 sittings
   leadCut s3: ends rung 4 at 5184.7 t, 8 materials, goal supplyRung5, 12 sittings
   slow s1: ends rung 5 at 3863.8 t, 9 materials, goal widenTop, 12 sittings
   slow s2: ends rung 5 at 3888.6 t, 9 materials, goal widenTop, 12 sittings
   slow s3: ends rung 5 at 3876.9 t, 9 materials, goal widenTop, 12 sittings
   brisk s1: ends rung 5 at 3691.8 t, 9 materials, goal widenTop, 9 sittings
   brisk s2: ends rung 5 at 3742.7 t, 9 materials, goal widenTop, 9 sittings
   brisk s3: ends rung 5 at 3974.9 t, 9 materials, goal widenTop, 10 sittings

T10. THE CRANE PAIR (never buys the magnet crane, against the normal hand; gate 24 R1 (a): the crane loses at most 2 % at day 3 and the pair's mean is above zero for the crane) AND THE BRIDGE-PARTNER PLAY (E4: the garage and the plumber levelled whenever the cash covers it; gate: rung 5 in its band)
   noCrane      sitting  2 (day 1): lifetime earnings noCrane against normal, mean +0.0 % (worst +0.0 %, best +0.0 %; n 5)
   noCrane      sitting  6 (day 3): lifetime earnings noCrane against normal, mean +0.0 % (worst -0.1 %, best +0.1 %; n 5)
   noCrane      rung 5 at sitting 10 9 9 9 9 (5/5 in band 8 to 12)
   the crane at day 3 (normal against noCrane, mean of normal / noCrane - 1): -0.0 %: MISSED
   bridgeLevels sitting  2 (day 1): lifetime earnings bridgeLevels against normal, mean +0.0 % (worst +0.0 %, best +0.0 %; n 5)
   bridgeLevels sitting  6 (day 3): lifetime earnings bridgeLevels against normal, mean +2.3 % (worst -2.6 %, best +6.6 %; n 5)
   bridgeLevels rung 5 at sitting 10 9 10 9 9 (5/5 in band 8 to 12)
     bridgeLevels s  1: levels (garage/plumbing) by sitting 0/0 8/9 17/18 20/20 20/20 20/20 20/20 20/20 20/20 20/20; both at 20 by sitting 4; materials at the end 9, worth {"lightiron":82894,"brass":1099740,"copper":7879598,"castiron":1637497,"alu":1042334,"steel":941783,"stainless":608019,"bronze":3518773,"lead":105905}
     bridgeLevels s  2: levels (garage/plumbing) by sitting 0/0 7/9 20/20 20/20 20/20 20/20 20/20 20/20 20/20; both at 20 by sitting 3; materials at the end 9, worth {"lightiron":90026,"brass":1172391,"copper":7498886,"castiron":1588339,"alu":934305,"steel":1117245,"stainless":566210,"bronze":3271635,"lead":105905}
     bridgeLevels s  3: levels (garage/plumbing) by sitting 0/0 9/10 18/19 20/20 20/20 20/20 20/20 20/20 20/20 20/20; both at 20 by sitting 4; materials at the end 9, worth {"lightiron":96297,"brass":1170523,"copper":7881262,"castiron":1608540,"alu":1010780,"steel":1180332,"stainless":586056,"bronze":3377848,"lead":105905}
     bridgeLevels s  4: levels (garage/plumbing) by sitting 0/0 6/12 20/20 20/20 20/20 20/20 20/20 20/20 20/20; both at 20 by sitting 3; materials at the end 9, worth {"lightiron":90993,"brass":1156884,"copper":7568594,"castiron":1560220,"alu":908397,"steel":1121414,"stainless":562073,"bronze":3290021,"lead":105905}
     bridgeLevels s  5: levels (garage/plumbing) by sitting 0/0 5/6 19/20 20/20 20/20 20/20 20/20 20/20 20/20; both at 20 by sitting 4; materials at the end 9, worth {"lightiron":76746,"brass":1088621,"copper":7493388,"castiron":1592256,"alu":967536,"steel":896502,"stainless":587970,"bronze":3415954,"lead":105905}

T11. PACKS AGAINST HEADROOM (RULING2.md 23.5, M5): at the ordinary moments of rungs 4 and 5 on the normal hand (every return and every sitting's end), does a pack of H hours fit: cash + H x I <= U (shop.ts quoteCheck), with the cash in hand and with an empty purse; U and cash in hours of I
   rung 4: 150 moments on 15 seeds; U median 1.19 h of I (min 0.84, max 3.29), cash median 15.71 h of I
      2 h pack: fits with own cash at 0/150 (never); with an empty purse at 14/150 (s5r s4r)
      5 h pack: fits with own cash at 0/150 (never); with an empty purse at 0/150 (never)
     10 h pack: fits with own cash at 0/150 (never); with an empty purse at 0/150 (never)
     20 h pack: fits with own cash at 0/150 (never); with an empty purse at 0/150 (never)
   rung 5: 30 moments on 15 seeds; U median 1.31 h of I (min 1.07, max 1.49), cash median 33.03 h of I
      2 h pack: fits with own cash at 0/30 (never); with an empty purse at 0/30 (never)
      5 h pack: fits with own cash at 0/30 (never); with an empty purse at 0/30 (never)
     10 h pack: fits with own cash at 0/30 (never); with an empty purse at 0/30 (never)
     20 h pack: fits with own cash at 0/30 (never); with an empty purse at 0/30 (never)

T9. A TICK AGAINST A JUMP (a minute of 0.1 s ticks against one jump, at sittings 1 to 5, 8 and 12 of the normal bot): 15 runs, 90 checks, 0 differ


THE PRICES' MEASURE AND THE WALK (round 0: the states the normal hand played with the prices before round 1; seeds 1 to 15, 6 sittings)
------------------------------------------------------------------------------------------------------------------------
T8. THE PAYBACK OF PLATES, VEHICLES AND TOOLS (2.6.4, 2.9; RULING2.md 21.1; aim 0.8 to 1.5 tau_r) AND THEIR MEASURED GAIN BESIDE THE RATED GAIN (for the calibration of rated income, 23.4): at each item's planned moment (the return of the sitting the normal hand bought it, the sitting's earlier purchases owned in both branches) dE = what the yard earns more an hour of yard time over AN HOUR OF PLAY (the reference bot, buying nothing) and one capped absence; dGaway = the gain over the capped absence alone (REPORT8's measure); dI = the rated gain (I after a jump past delivery, start-up and a heat, less without); payback = price / dE in tau of its rung
   crane        n 15  price §3000  at h 23.80 r4 (bought by the hand on 15)  dE mean §328 (s.e. 298) median §19 of E0 §107770  dGaway mean §-49  dI median §0  rated/measured 0.00  payback median 0.55 tau (2 of 15 in 0.8-1.5)
                per seed dE -208 394 -179 103 4436 283 145 19 212 247 -13 -19 -145 -322 -34 | dI 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
   shear        n 15  price §3000  at h 5.00 r3 (bought by the hand on 15)  dE mean §576 (s.e. 211) median §574 of E0 §54810  dGaway mean §116  dI median §2710  rated/measured 4.71  payback median 0.33 tau (0 of 15 in 0.8-1.5)
                per seed dE 26 1079 1062 2036 1019 -187 -570 1183 27 652 -503 574 127 99 2015 | dI 5114 0 5143 2710 3572 3735 7 2887 0 0 5684 0 2069 168 3324
   analyser     n 15  price §29100  at h 5.00 r3 (bought by the hand on 15)  dE mean §3649 (s.e. 331) median §3792 of E0 §50832  dGaway mean §3925  dI median §0  rated/measured 0.00  payback median 0.85 tau (6 of 15 in 0.8-1.5)
                per seed dE 2463 5249 3485 4158 4348 1791 6027 4379 5085 4076 2198 3132 1908 2646 3792 | dI 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
   depollution  n 15  price §3000  at h 5.00 r3 (bought by the hand on 15)  dE mean §41 (s.e. 234) median §322 of E0 §56947  dGaway mean §-131  dI median §0  rated/measured 0.00  payback median 0.36 tau (2 of 15 in 0.8-1.5)
                per seed dE 502 -528 -103 -1401 -930 -54 427 -1067 407 322 916 1248 1247 951 -1316 | dI 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
   granulator   n 15  price §3000  at h 5.00 r4 (bought by the hand on 9)  dE mean §-17 (s.e. 143) median §-143 of E0 §58806  dGaway mean §53  dI median §130  rated/measured -7.68  payback median 0.24 tau (0 of 15 in 0.8-1.5)
                per seed dE 221 -1034 -225 1025 564 -239 -450 912 -539 356 -210 -135 -143 -378 21 | dI 89 89 133 133 126 130 147 130 89 89 130 150 147 89 89
   shredder     n 15  price §419000  at h 23.80 r4 (bought by the hand on 15)  dE mean §3782 (s.e. 409) median §4207 of E0 §107553  dGaway mean §4390  dI median §0  rated/measured 0.00  payback median 4.36 tau (0 of 15 in 0.8-1.5)
                per seed dE 3591 2956 4553 4806 4207 3854 3905 -1686 4498 4366 4148 4026 4649 4484 4378 | dI 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
   eddy         n 15  price §3000  at h 23.80 r4 (bought by the hand on 0)  dE mean §-469 (s.e. 415) median §-83 of E0 §124638  dGaway mean §0  dI median §0  rated/measured 0.00  payback median 0.97 tau (2 of 15 in 0.8-1.5)
                per seed dE 107 -262 -428 -100 455 -11 140 -150 -83 71 -628 -433 394 72 -6176 | dI 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
   sorter       n 15  price §3000  at h 23.80 r4 (bought by the hand on 0)  dE mean §0 (s.e. 0) median §0 of E0 §124638  dGaway mean §0  dI median §0  rated/measured -  payback median - tau (0 of 15 in 0.8-1.5)
                per seed dE 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 | dI 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
   rotary       n 15  price §77600  at h 23.80 r4 (bought by the hand on 15)  dE mean §2959 (s.e. 433) median §2702 of E0 §111488  dGaway mean §3852  dI median §0  rated/measured 0.00  payback median 1.31 tau (10 of 15 in 0.8-1.5)
                per seed dE 3134 2810 2350 2453 2769 2364 2702 8829 2125 1681 3279 2765 2702 2546 1881 | dI 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
   induction    n 15  price §171000  at h 23.80 r4 (bought by the hand on 15)  dE mean §9407 (s.e. 345) median §9727 of E0 §114254  dGaway mean §10271  dI median §9042  rated/measured 0.96  payback median 0.80 tau (7 of 15 in 0.8-1.5)
                per seed dE 10417 11151 8880 9487 9831 9855 9263 8992 7987 6144 10780 10650 9727 10292 7648 | dI 9042 9042 11097 9042 9042 9042 9042 11097 9042 9042 9668 10695 14410 9042 9042
   breaker      n 15  price §38100  at h 32.00 r4 (bought by the hand on 15)  dE mean §-4476 (s.e. 173) median §-4617 of E0 §126689  dGaway mean §-4864  dI median §0  rated/measured 0.00  payback median - tau (0 of 15 in 0.8-1.5)
                per seed dE -5079 -4640 -4617 -5003 -5223 -4563 -4103 -4446 -3963 -2982 -4474 -4653 -5142 -5049 -3208 | dI 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
   smelter      n 15  price §27500  at h 32.00 r4 (bought by the hand on 15)  dE mean §805 (s.e. 83) median §710 of E0 §121967  dGaway mean §1496  dI median §0  rated/measured 0.00  payback median 1.76 tau (4 of 15 in 0.8-1.5)
                per seed dE 688 873 791 1062 1316 521 663 400 433 655 1598 658 823 880 710 | dI 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
   truckBridge  n 15  price §12000  at h 5.00 r3 (bought by the hand on 15)  dE mean §17145 (s.e. 528) median §16426 of E0 §36530  dGaway mean §17689  dI median §19785  rated/measured 1.15  payback median 0.08 tau (0 of 15 in 0.8-1.5)
                per seed dE 17166 16051 16341 16600 16372 23498 15708 16809 16043 15017 18797 17960 18535 15857 16426 | dI 18407 20436 19642 20779 20755 20187 19947 21035 20401 19720 15931 18761 17885 19785 18291
   pallet       n 15  price §2500  at h 5.00 r3 (bought by the hand on 0)  dE mean §323 (s.e. 187) median §201 of E0 §55975  dGaway mean §0  dI median §0  rated/measured 0.00  payback median 0.52 tau (2 of 15 in 0.8-1.5)
                per seed dE 364 567 154 2365 969 201 -104 847 28 -62 531 -86 -506 -696 272 | dI 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
   forklift     n 15  price §15000  at h 5.00 r3 (bought by the hand on 0)  dE mean §-72 (s.e. 125) median §-75 of E0 §55975  dGaway mean §0  dI median §0  rated/measured 0.00  payback median 5.16 tau (0 of 15 in 0.8-1.5)
                per seed dE 36 262 -839 429 901 323 -190 273 -75 -349 -133 -931 -557 -173 -64 | dI 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
   plasma       n 15  price §8000  at h 5.00 r3 (bought by the hand on 0)  dE mean §7210 (s.e. 903) median §6657 of E0 §55975  dGaway mean §7798  dI median §8097  rated/measured 1.12  payback median 0.13 tau (0 of 15 in 0.8-1.5)
                per seed dE 6657 4745 13889 9037 11415 8760 5233 11367 4888 4557 9294 1386 5148 2946 8823 | dI 9956 4456 4948 6712 9146 8097 6034 8097 8859 9502 8097 5053 6017 7852 8097
   baler        n 10  price §3000  at h 5.00 r3 (bought by the hand on 10)  dE mean §205 (s.e. 184) median §130 of E0 §34612  dGaway mean §68  dI median §657  rated/measured 3.20  payback median 0.82 tau (1 of 10 in 0.8-1.5)
                per seed dE 99 1131 501 423 130 -1163 450 68 408 7 | dI 657 875 585 585 585 697 585 697 697 1010

T12. EVERY STEP OF THE WALK: MEASURED GAIN (dG: one capped absence at usual prices, § an hour) BESIDE THE RATED GAIN (dI, I after less I before on the same state), medians over the seeds, per moment (the calibration's table; plates' and vehicles' played gains are T8)
   r3s1 (15 states; G median §30087, I median §28520)
     buy alu                    n  1  price §1300  dG §      0  dI §      0  rated/measured -
     buy analyser               n 15  price §29100  dG §   3294  dI §      0  rated/measured 0.00
     buy baler                  n 10  price §3000  dG §    130  dI §      0  rated/measured 0.00
     buy crane                  n 15  price §3000  dG §      0  dI §      0  rated/measured -
     buy depollution            n 15  price §3000  dG §      0  dI §      0  rated/measured -
     buy forklift               n 15  price §15000  dG §      0  dI §      0  rated/measured -
     buy granulator             n 15  price §3000  dG §      0  dI §      0  rated/measured -
     buy night                  n 15  price §36000  dG §      0  dI §      0  rated/measured -
     buy pallet                 n 15  price §2500  dG §      0  dI §      0  rated/measured -
     buy plasma                 n 15  price §8000  dG §   9253  dI §  11602  rated/measured 1.25
     buy shear                  n 15  price §3000  dG §      8  dI §      0  rated/measured 0.00
     buy truckBridge            n 15  price §12000  dG §  16533  dI §  20102  rated/measured 1.22
     hire cutter                n 15  price §3600  dG §   9882  dI §  11661  rated/measured 1.18
     level bench                n 15  price §1100  dG §     16  dI §      0  rated/measured 0.00
     level crucible             n 15  price §1400  dG §     -4  dI §      0  rated/measured -
     level cutter               n 15  price §1400  dG §   3501  dI §   3890  rated/measured 1.11
     level driver               n 15  price §1700  dG §    -33  dI §      0  rated/measured -
     level hand                 n 15  price §2100  dG §     73  dI §      0  rated/measured 0.00
     level partnerDemolition    n 15  price §1100  dG §   -141  dI §      0  rated/measured -
     level partnerFarm          n 15  price §1400  dG §      6  dI §      0  rated/measured 0.00
     level plate baler          n  5  price §1100  dG §      0  dI §      0  rated/measured -
     level stripper             n 15  price §1100  dG §     50  dI §      0  rated/measured 0.00
   r4entry (15 states; G median §105858, I median §152259)
     buy breaker                n 15  price §38100  dG §   -629  dI §      0  rated/measured -
     buy crane                  n 15  price §3000  dG §     -4  dI §      0  rated/measured -
     buy eddy                   n 15  price §3000  dG §     -2  dI §      0  rated/measured -
     buy forklift               n 15  price §15000  dG §     -2  dI §      0  rated/measured -
     buy granulator             n 12  price §3000  dG §     13  dI §      0  rated/measured 0.00
     buy induction              n 15  price §171000  dG §   9848  dI §      0  rated/measured 0.00
     buy pallet                 n 15  price §2500  dG §     -2  dI §      0  rated/measured -
     buy plasma                 n 15  price §8000  dG §    167  dI §      0  rated/measured 0.00
     buy rotary                 n 15  price §77600  dG §   2329  dI §      0  rated/measured 0.00
     buy shredder               n 15  price §419000  dG §   4139  dI §      0  rated/measured 0.00
     buy smelter                n 15  price §27500  dG §     -2  dI §      0  rated/measured -
     buy sorter                 n 15  price §3000  dG §     -2  dI §      0  rated/measured -
     level bench                n 15  price §1100  dG §      9  dI §      0  rated/measured 0.00
     level crucible             n 15  price §1400  dG §     23  dI §      0  rated/measured 0.00
     level cutter               n 15  price §2000  dG §     18  dI §      0  rated/measured 0.00
     level driver               n 15  price §2100  dG §   6658  dI §      0  rated/measured 0.00
     level hand                 n 15  price §11400  dG §     18  dI §   1897  rated/measured 105.51
     level partner.garage       n 15  price §2700  dG §  -2001  dI §      0  rated/measured -
     level partner.plumbing     n 15  price §15100  dG §   1358  dI §   1652  rated/measured 1.22
     level partnerDemolition    n 15  price §1100  dG §  -2750  dI §      0  rated/measured -
     level partnerFarm          n 15  price §1400  dG §  -3747  dI §      0  rated/measured -
     level plate baler          n 15  price §1100  dG §      0  dI §      0  rated/measured -
     level plate depollution    n 15  price §1100  dG §     -2  dI §      0  rated/measured -
     level plate granulator     n  3  price §1100  dG §     -2  dI §      0  rated/measured -
     level plate shear          n 15  price §1100  dG §     -2  dI §      0  rated/measured -
     level stripper             n 15  price §1100  dG §     -7  dI §      0  rated/measured -
   day3 (15 states; G median §129216, I median §187794)
     buy eddy                   n 15  price §3000  dG §      0  dI §      0  rated/measured -
     buy forklift               n 15  price §15000  dG §      0  dI §      0  rated/measured -
     buy granulator             n  6  price §3000  dG §     55  dI §      0  rated/measured 0.00
     buy pallet                 n 15  price §2500  dG §      0  dI §      0  rated/measured -
     buy plasma                 n 15  price §8000  dG §    642  dI §      0  rated/measured 0.00
     buy sorter                 n 15  price §3000  dG §      0  dI §      0  rated/measured -
     level bench                n 15  price §1100  dG §    113  dI §      0  rated/measured 0.00
     level crucible             n 15  price §1400  dG §      0  dI §      0  rated/measured -
     level cutter               n 15  price §2000  dG §     34  dI §      0  rated/measured 0.00
     level driver               n 15  price §2700  dG §   7152  dI §      0  rated/measured 0.00
     level hand                 n 15  price §61800  dG §   -135  dI §      0  rated/measured -
     level partner.garage       n 15  price §2700  dG §   -544  dI §      0  rated/measured -
     level partner.plumbing     n 15  price §12800  dG §   1015  dI §    263  rated/measured 0.26
     level partnerDemolition    n 15  price §1100  dG §  -2715  dI §      0  rated/measured -
     level partnerFarm          n 15  price §1400  dG §  -3440  dI §      0  rated/measured -
     level plate baler          n 15  price §1100  dG §      0  dI §      0  rated/measured -
     level plate breaker        n 15  price §1100  dG §    184  dI §      0  rated/measured 0.00
     level plate crane          n 15  price §1100  dG §      0  dI §      0  rated/measured -
     level plate depollution    n 15  price §1100  dG §      0  dI §      0  rated/measured -
     level plate granulator     n  9  price §1100  dG §      0  dI §      0  rated/measured -
     level plate induction      n 15  price §1100  dG §      0  dI §      0  rated/measured -
     level plate rotary         n 15  price §1100  dG §      0  dI §      0  rated/measured -
     level plate shear          n 15  price §1100  dG §      0  dI §      0  rated/measured -
     level plate shredder       n 15  price §1100  dG §      0  dI §      0  rated/measured -
     level plate smelter        n 15  price §1100  dG §      0  dI §      0  rated/measured -
     level stripper             n 15  price §1100  dG §    -15  dI §      0  rated/measured -

9. THE PURCHASE WALK (RULING2.md 17.1; 15 seeds): every purchase, hire and level one step up by hand; the change in G (a capped absence at usual prices, stock counted); gate: mean not below -1 %, no seed below -4 %
 day3 (15 states; rungs 4; median G §129216 an hour): noise mean -0.09 %, mean |noise| +0.15 %, worst -0.69 %
   advice / goal name: nothing; HIDDEN BEST BUYS (gain > 5 %, payback < tau 22 h, named by neither): level driver s1 +5.53 % payback 0.4 h; level driver s10 +5.77 % payback 0.4 h; level driver s11 +5.77 % payback 0.4 h; level driver s12 +5.14 % payback 0.4 h; level driver s13 +5.02 % payback 0.4 h; level driver s14 +5.45 % payback 0.4 h; level driver s15 +5.48 % payback 0.4 h; level driver s2 +5.58 % payback 0.4 h; level driver s3 +5.74 % payback 0.4 h; level driver s4 +5.75 % payback 0.4 h; level driver s5 +5.50 % payback 0.4 h; level driver s8 +5.53 % payback 0.4 h; level driver s9 +5.74 % payback 0.4 h
   buy eddy                   n 15  mean   +0.00 %  worst   +0.00 % (s1)
   buy forklift               n 15  mean   +0.00 %  worst   +0.00 % (s1)
   buy granulator             n  6  mean   +0.04 %  worst   -0.50 % (s12)
   buy pallet                 n 15  mean   +0.00 %  worst   +0.00 % (s1)
   buy plasma                 n 15  mean   +0.50 %  worst   -0.04 % (s14)
   buy sorter                 n 15  mean   +0.00 %  worst   +0.00 % (s1)
   level bench                n 15  mean   -0.02 %  worst   -0.41 % (s6)
   level crucible             n 15  mean   +0.00 %  worst   +0.00 % (s1)
   level cutter               n 15  mean   -0.09 %  worst   -0.62 % (s8)
   level driver               n 15  mean   +5.46 %  worst   +4.89 % (s7)  HIDDEN BEST BUY (13 seeds)
   level hand                 n 15  mean   -0.12 %  worst   -0.60 % (s15)
   level partner.garage       n 15  mean   -0.40 %  worst   -0.69 % (s1)
   level partner.plumbing     n 15  mean   +0.77 %  worst   +0.17 % (s6)
   level partnerDemolition    n 15  mean   -2.20 %  worst   -3.13 % (s14)  FAILS
   level partnerFarm          n 15  mean   -2.65 %  worst   -3.17 % (s6)  FAILS
   level plate baler          n 15  mean   +0.00 %  worst   +0.00 % (s1)
   level plate breaker        n 15  mean   +0.14 %  worst   +0.06 % (s9)
   level plate crane          n 15  mean   -0.01 %  worst   -0.08 % (s9)
   level plate depollution    n 15  mean   +0.00 %  worst   +0.00 % (s1)
   level plate granulator     n  9  mean   +0.00 %  worst   +0.00 % (s1)
   level plate induction      n 15  mean   -0.06 %  worst   -0.43 % (s12)
   level plate rotary         n 15  mean   -0.03 %  worst   -0.28 % (s12)
   level plate shear          n 15  mean   +0.00 %  worst   +0.00 % (s1)
   level plate shredder       n 15  mean   -0.02 %  worst   -0.32 % (s4)
   level plate smelter        n 15  mean   +0.00 %  worst   +0.00 % (s1)
   level stripper             n 15  mean   -0.05 %  worst   -0.52 % (s12)
 r3s1 (15 states; rungs 3; median G §30087 an hour): noise mean -0.09 %, mean |noise| +0.33 %, worst -1.86 %
   advice / goal name: hire cutter, buy analyser, level cutter, buy baler; HIDDEN BEST BUYS (gain > 5 %, payback < tau 9 h, named by neither): level cutter s1 +14.83 % payback 0.3 h; buy truckBridge s1 +54.26 % payback 0.7 h; buy plasma s1 +41.26 % payback 0.7 h; hire cutter s10 +17.03 % payback 0.7 h; buy truckBridge s10 +51.72 % payback 0.7 h; buy plasma s10 +17.39 % payback 1.4 h; buy analyser s10 +10.26 % payback 8.9 h; level cutter s11 +17.88 % payback 0.2 h; buy truckBridge s11 +67.82 % payback 0.7 h; buy plasma s11 +43.93 % payback 0.7 h; level cutter s12 +9.48 % payback 0.5 h; buy truckBridge s12 +58.05 % payback 0.7 h; buy plasma s12 +31.09 % payback 0.9 h; buy analyser s12 +11.36 % payback 8.6 h; level cutter s13 +14.19 % payback 0.3 h; buy truckBridge s13 +57.20 % payback 0.7 h; buy plasma s13 +36.94 % payback 0.7 h; buy analyser s13 +11.38 % payback 8.5 h; level cutter s14 +12.58 % payback 0.4 h; buy truckBridge s14 +70.27 % payback 0.6 h; buy plasma s14 +40.34 % payback 0.7 h; level cutter s15 +8.67 % payback 0.7 h; buy truckBridge s15 +49.99 % payback 0.7 h; buy plasma s15 +21.52 % payback 1.1 h; buy analyser s15 +10.68 % payback 8.4 h; level cutter s2 +13.83 % payback 0.3 h; buy truckBridge s2 +60.28 % payback 0.7 h; buy plasma s2 +36.68 % payback 0.7 h; buy analyser s2 +11.25 % payback 8.7 h; level cutter s3 +6.88 % payback 0.9 h; buy truckBridge s3 +49.03 % payback 0.7 h; buy plasma s3 +23.01 % payback 1.0 h; buy analyser s3 +11.59 % payback 7.4 h; level cutter s4 +9.02 % payback 0.7 h; buy truckBridge s4 +45.95 % payback 0.8 h; buy plasma s4 +25.61 % payback 0.9 h; buy analyser s4 +11.65 % payback 7.5 h; level cutter s5 +14.22 % payback 0.3 h; buy truckBridge s5 +56.82 % payback 0.7 h; buy plasma s5 +37.10 % payback 0.7 h; level cutter s6 +5.88 % payback 1.5 h; buy truckBridge s6 +45.51 % payback 0.7 h; buy plasma s6 +15.86 % payback 1.4 h; buy crane s6 +6.64 % payback 1.3 h; level cutter s7 +7.45 % payback 0.8 h; buy truckBridge s7 +48.90 % payback 0.8 h; buy plasma s7 +19.94 % payback 1.2 h; buy crane s7 +7.49 % payback 1.2 h; buy truckBridge s8 +44.40 % payback 0.8 h; buy plasma s8 +18.57 % payback 1.3 h; level cutter s9 +13.45 % payback 0.3 h; buy truckBridge s9 +55.29 % payback 0.7 h; buy plasma s9 +36.16 % payback 0.7 h; buy analyser s9 +11.47 % payback 8.5 h
   buy alu                    n  1  mean   +0.00 %  worst   +0.00 % (s6)
   buy analyser               n 15  mean  +10.29 %  worst   +8.01 % (s5)  HIDDEN BEST BUY (8 seeds)
   buy baler                  n 10  mean   +0.56 %  worst   +0.02 % (s9)
   buy crane                  n 15  mean   +1.26 %  worst   +0.00 % (s10)  HIDDEN BEST BUY (2 seeds)
   buy depollution            n 15  mean   +0.00 %  worst   +0.00 % (s1)
   buy forklift               n 15  mean   +0.00 %  worst   +0.00 % (s1)
   buy granulator             n 15  mean   +0.00 %  worst   +0.00 % (s1)
   buy night                  n 15  mean   +0.00 %  worst   +0.00 % (s1)
   buy pallet                 n 15  mean   +0.00 %  worst   +0.00 % (s1)
   buy plasma                 n 15  mean  +29.69 %  worst  +15.86 % (s6)  HIDDEN BEST BUY (15 seeds)
   buy shear                  n 15  mean   +0.06 %  worst   -0.69 % (s7)
   buy truckBridge            n 15  mean  +54.37 %  worst  +44.40 % (s8)  HIDDEN BEST BUY (15 seeds)
   hire cutter                n 15  mean  +31.57 %  worst  +15.76 % (s6)  HIDDEN BEST BUY (1 seed)
   level bench                n 15  mean   +0.19 %  worst   -0.69 % (s5)
   level crucible             n 15  mean   +0.03 %  worst   -2.24 % (s15)
   level cutter               n 15  mean  +10.89 %  worst   +3.94 % (s8)  HIDDEN BEST BUY (13 seeds)
   level driver               n 15  mean   -0.23 %  worst   -1.53 % (s7)
   level hand                 n 15  mean   +0.73 %  worst   -0.48 % (s9)
   level partnerDemolition    n 15  mean   -0.37 %  worst   -1.48 % (s6)
   level partnerFarm          n 15  mean   +0.50 %  worst   -0.63 % (s8)
   level plate baler          n  5  mean   -0.07 %  worst   -0.36 % (s8)
   level stripper             n 15  mean   +0.33 %  worst   -0.56 % (s9)
 r4entry (15 states; rungs 4; median G §105858 an hour): noise mean +0.01 %, mean |noise| +0.02 %, worst -0.11 %
   advice / goal name: level partner.plumbing, buy crane, buy induction; HIDDEN BEST BUYS (gain > 5 %, payback < tau 22 h, named by neither): level driver s1 +5.90 % payback 0.3 h; buy induction s1 +9.84 % payback 16.4 h; level driver s10 +5.79 % payback 0.3 h; buy induction s10 +9.96 % payback 16.1 h; level driver s11 +5.93 % payback 0.4 h; buy induction s11 +7.52 % payback 19.6 h; level driver s12 +6.71 % payback 0.3 h; buy induction s12 +8.89 % payback 18.7 h; level driver s13 +5.68 % payback 0.4 h; buy induction s13 +9.69 % payback 16.8 h; level driver s14 +6.37 % payback 0.3 h; buy induction s14 +9.22 % payback 17.4 h; level driver s15 +7.04 % payback 0.3 h; buy induction s15 +8.98 % payback 18.5 h; level driver s2 +5.98 % payback 0.4 h; buy induction s2 +8.64 % payback 17.8 h; level driver s3 +7.35 % payback 0.3 h; level driver s4 +6.53 % payback 0.3 h; level driver s5 +5.75 % payback 0.4 h; buy induction s5 +9.89 % payback 15.3 h; level driver s6 +5.99 % payback 0.3 h; level driver s7 +5.76 % payback 0.4 h; buy induction s7 +10.11 % payback 15.1 h; level driver s8 +5.77 % payback 0.3 h; buy induction s8 +9.36 % payback 17.3 h; level driver s9 +6.68 % payback 0.3 h
   buy breaker                n 15  mean   -0.57 %  worst   -0.72 % (s5)
   buy crane                  n 15  mean   -0.03 %  worst   -0.22 % (s4)
   buy eddy                   n 15  mean   -0.00 %  worst   -0.00 % (s13)
   buy forklift               n 15  mean   -0.00 %  worst   -0.00 % (s13)
   buy granulator             n 12  mean   +0.00 %  worst   -0.08 % (s15)
   buy induction              n 15  mean   +8.79 %  worst   +5.43 % (s4)  HIDDEN BEST BUY (11 seeds)
   buy pallet                 n 15  mean   -0.00 %  worst   -0.00 % (s13)
   buy plasma                 n 15  mean   +0.16 %  worst   +0.05 % (s5)
   buy rotary                 n 15  mean   +2.12 %  worst   +1.53 % (s4)
   buy shredder               n 15  mean   +3.84 %  worst   +3.33 % (s14)
   buy smelter                n 15  mean   -0.00 %  worst   -0.00 % (s13)
   buy sorter                 n 15  mean   -0.00 %  worst   -0.00 % (s13)
   level bench                n 15  mean   +0.01 %  worst   -0.08 % (s5)
   level crucible             n 15  mean   +0.03 %  worst   -0.05 % (s15)
   level cutter               n 15  mean   +0.00 %  worst   -0.08 % (s5)
   level driver               n 15  mean   +6.21 %  worst   +5.68 % (s13)  HIDDEN BEST BUY (15 seeds)
   level hand                 n 15  mean   +0.02 %  worst   -0.04 % (s3)
   level partner.garage       n 15  mean   -1.82 %  worst   -2.69 % (s13)  FAILS
   level partner.plumbing     n 15  mean   +1.28 %  worst   +0.68 % (s13)
   level partnerDemolition    n 15  mean   -2.51 %  worst   -3.10 % (s14)  FAILS
   level partnerFarm          n 15  mean   -3.47 %  worst   -4.37 % (s13)  FAILS
   level plate baler          n 15  mean   +0.00 %  worst   -0.05 % (s15)
   level plate depollution    n 15  mean   -0.00 %  worst   -0.00 % (s13)
   level plate granulator     n  3  mean   -0.00 %  worst   -0.00 % (s6)
   level plate shear          n 15  mean   -0.00 %  worst   -0.00 % (s13)
   level stripper             n 15  mean   -0.01 %  worst   -0.07 % (s9)
 GATE (17.1): 5 of 74 steps FAIL

THE UNSEEN SEEDS (101 to 105, normal hand, round 1)
------------------------------------------------------------------------------------------------------------------------
0. HARD PROMISES (8.3) on 5 runs: none broken
T1. RUNG 4 AT DAY 2 TO 3 (sittings 4 to 6), RUNG 5 AT DAY 4 TO 6 (sittings 8 to 12): per bot, the sitting of each per seed and the count in band
   normal    n  5  rung 4 at 4 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at 9 9 9 9 9  (5/5 in band)

T2. RATED INCOME I AGAINST G (14.10; G a capped absence at usual prices from the sitting's return, I at the same state; gate per moment: median 0.95-1.05, 13 of 15 in 0.88-1.12, none outside 0.80-1.25)
   PLAYED WITH THE NORMAL BOARD, 5 seeds
     r3 entry (sitting 1) n  5  I/G median 0.90  4/5 in 0.88-1.12  min 0.86 max 0.94  0 outside: MISSED   [0.94 0.91 0.86 0.90 0.89]
     r3 last purchase     n  5  I/G median 1.04  4/5 in 0.88-1.12  min 0.97 max 1.34  1 outside: MISSED   [1.34 1.04 0.97 1.04 1.04]
     r4 entry             n  5  I/G median 1.46  0/5 in 0.88-1.12  min 1.42 max 1.46  5 outside: MISSED   [1.43 1.46 1.42 1.46 1.46]
     day 3 (sitting 6)    n  5  I/G median 1.44  0/5 in 0.88-1.12  min 1.43 max 1.44  5 outside: MISSED   [1.44 1.43 1.43 1.44 1.44]
     r4 last purchase     n  5  I/G median 1.39  0/5 in 0.88-1.12  min 1.34 max 1.39  5 outside: MISSED   [1.34 1.39 1.35 1.39 1.39]
     r5 entry (run end)   n  5  I/G median 1.44  0/5 in 0.88-1.12  min 1.44 max 1.46  5 outside: MISSED   [1.45 1.44 1.46 1.44 1.44]

T5. SHARES OF A DAY'S EARNINGS (lifetime earnings over two sittings): ad rewards (aim at most 4 %, ads bot); the Yard sale and the van (2 to 5 %, never over 8 %, normal bot): per day 1..7, median over seeds [max]
   Yard sale + van (normal) d1 6.4 [6.5]  d2 2.0 [2.0]  d3 1.9 [2.0]  d4 1.9 [2.0]   (0 seed-days over 8 %)
     of it the van        d1 5.6 [5.8]  d2 0.9 [0.9]  d3 0.8 [0.8]  d4 0.8 [0.8]   (0 seed-days over 8 %)
   E19 rung 3: an hour away / an hour played (earnings), median 0.38 over 10 sittings, min 0.34 max 0.83 (aim 0.3 to 0.8)
   E19 rung 4: an hour away / an hour played (earnings), median 0.88 over 25 sittings, min 0.77 max 0.95 (aim 0.3 to 0.8)

T6. A USEFUL PURCHASE EVERY SITTING; CASH AT A SITTING'S END AT MOST 2 TAU_r OF INCOME (tau_h by rung; income = G at that return)
   normal    sittings without a purchase: 22 of 45 (per seed 3 5 4 5 5)

T7. THE HAND'S WORTH (normal against the card manager, lifetime earnings at sittings 4 and 8: aim at least 1.2); PACKS (rung times against off, the buyer's lead); STEEL-MAX; THE LEAD CUT

T11. PACKS AGAINST HEADROOM (RULING2.md 23.5, M5): at the ordinary moments of rungs 4 and 5 on the normal hand (every return and every sitting's end), does a pack of H hours fit: cash + H x I <= U (shop.ts quoteCheck), with the cash in hand and with an empty purse; U and cash in hours of I
   rung 4: 50 moments on 5 seeds; U median 1.08 h of I (min 0.83, max 3.23), cash median 15.36 h of I
      2 h pack: fits with own cash at 0/50 (never); with an empty purse at 5/50 (s4r)
      5 h pack: fits with own cash at 0/50 (never); with an empty purse at 0/50 (never)
     10 h pack: fits with own cash at 0/50 (never); with an empty purse at 0/50 (never)
     20 h pack: fits with own cash at 0/50 (never); with an empty purse at 0/50 (never)
   rung 5: 10 moments on 5 seeds; U median 1.08 h of I (min 1.08, max 1.49), cash median 32.40 h of I
      2 h pack: fits with own cash at 0/10 (never); with an empty purse at 0/10 (never)
      5 h pack: fits with own cash at 0/10 (never); with an empty purse at 0/10 (never)
     10 h pack: fits with own cash at 0/10 (never); with an empty purse at 0/10 (never)
     20 h pack: fits with own cash at 0/10 (never); with an empty purse at 0/10 (never)

T9. A TICK AGAINST A JUMP (a minute of 0.1 s ticks against one jump, at sittings 1 to 5, 8 and 12 of the normal bot): 5 runs, 30 checks, 0 differ


THE FIRST YARD AT release.stage 1 (lead's note 5)
------------------------------------------------------------------------------------------------------------------------
yard-bot.ts --seeds 15 --routes 2 --only beats,gate (st1a: seeds 1-8, st1b: 9-15): 0. HARD PROMISES (8.3) on 40 runs: none broken; tick = jump minute by minute on 8 runs: equal 0. HARD PROMISES (8.3) on 35 runs: none broken; tick = jump minute by minute on 7 runs: equal 
runs compared 75: identical below rung 3 (every first mark, every purchase with its second and price, rung 2 and rung 3 to the millisecond): 75
same.ts (this step's bot.ts and content against HEAD's bot.ts on the content before this step):
  1 normal A same state: true same record: true; 2 slow A: true, true; 3 brisk B: true, true; 4 normal B: true, true (rung 3, two absences and sittings, 0 broken)

THE PER-RUN LINES (round 1; report2 sections 0 to 3 of the same runs)
------------------------------------------------------------------------------------------------------------------------
STAGE-2 BOTS (yard-stage2.md 8.2; the real content read with release.stage 2; 15 seeds 1..15; twice a day to rung 5, at most 12 sittings), generated by scripts/content/yard-bot.ts --stage 2
0. HARD PROMISES (8.3) on 103 runs: none broken
   presses refused (and the bot's own notes, commission/commissionSide): {"commissionSide":97,"guard":177,"earmark":9}

1. RUNGS (hours of the yard's clock: rung 3 / 4 / 5; aims rung 4 day 2 to 3 = 48-72 h, rung 5 day 4 to 6 = 96-144 h), where a run stopped, CPU
   normal    s 1  r3   1.0h r4  26.0h r5  67.3h  10 sittings, 5 without a purchase (longest run 4); end 3834 t 9 materials, cash §6451272, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 158 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   normal    s 2  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 3 without a purchase (longest run 3); end 3909.7 t 9 materials, cash §5892985, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 163 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   normal    s 3  r3   3.0h r4  17.9h r5  59.0h  9 sittings, 4 without a purchase (longest run 4); end 3693.8 t 9 materials, cash §5606520, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 153 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   normal    s 4  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 5 without a purchase (longest run 4); end 3881.1 t 9 materials, cash §5939256, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 154 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   normal    s 5  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3686.1 t 9 materials, cash §5907785, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 166 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   normal    s 6  r3   0.9h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3710.3 t 9 materials, cash §6060041, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 162 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   normal    s 7  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3748.6 t 9 materials, cash §6242445, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 162 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   normal    s 8  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3663.6 t 9 materials, cash §6275714, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 165 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   normal    s 9  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 3); end 3844.9 t 9 materials, cash §5933068, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 151 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   normal    s10  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 5 without a purchase (longest run 4); end 3735.7 t 9 materials, cash §6092343, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 162 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   normal    s11  r3   3.0h r4  24.0h r5  65.3h  10 sittings, 4 without a purchase (longest run 3); end 3965.8 t 9 materials, cash §6439847, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 169 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   normal    s12  r3   3.0h r4  24.0h r5  65.3h  10 sittings, 4 without a purchase (longest run 3); end 3973 t 9 materials, cash §6278544, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 159 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   normal    s13  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 5 without a purchase (longest run 4); end 3837.8 t 9 materials, cash §6122592, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 158 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   normal    s14  r3   3.0h r4  24.0h r5  65.3h  10 sittings, 4 without a purchase (longest run 3); end 3930.8 t 9 materials, cash §6332839, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 172 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   normal    s15  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 3); end 3828.7 t 9 materials, cash §5876328, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 153 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s 1  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 3); end 3838.2 t 9 materials, cash §5845221, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 142 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s 2  r3   1.0h r4  21.8h r5  63.1h  9 sittings, 3 without a purchase (longest run 3); end 3608.2 t 9 materials, cash §5773128, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 152 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s 3  r3   3.0h r4  18.0h r5  59.0h  9 sittings, 3 without a purchase (longest run 3); end 3657.6 t 9 materials, cash §5441401, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 144 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s 4  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 3); end 3819.1 t 9 materials, cash §5794677, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 136 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s 5  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 5 without a purchase (longest run 4); end 3830.9 t 9 materials, cash §5840531, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 132 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s 6  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 5 without a purchase (longest run 4); end 3886.9 t 9 materials, cash §5988109, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 136 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s 7  r3   3.0h r4  19.8h r5  61.0h  9 sittings, 3 without a purchase (longest run 3); end 3763.3 t 9 materials, cash §5801352, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 141 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s 8  r3   3.0h r4  19.8h r5  61.0h  9 sittings, 4 without a purchase (longest run 4); end 3629.1 t 9 materials, cash §6136899, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 139 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s 9  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 3); end 3842.5 t 9 materials, cash §5927694, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 140 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s10  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3713.8 t 9 materials, cash §6041309, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 138 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s11  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 5 without a purchase (longest run 4); end 3830.6 t 9 materials, cash §5964868, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 132 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s12  r3   3.0h r4  18.0h r5  59.0h  9 sittings, 3 without a purchase (longest run 3); end 3629.2 t 9 materials, cash §5622659, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 129 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s13  r3   1.0h r4  21.8h r5  63.1h  9 sittings, 4 without a purchase (longest run 4); end 3742.3 t 9 materials, cash §6325920, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 139 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   routeB    s14  r3   3.0h r4  24.0h r5  65.3h  10 sittings, 4 without a purchase (longest run 3); end 3949.1 t 9 materials, cash §6340478, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 135 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   routeB    s15  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 5 without a purchase (longest run 4); end 3806.7 t 9 materials, cash §6249601, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 139 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   noCrane   s 1  r3   1.0h r4  26.0h r5  67.3h  10 sittings, 5 without a purchase (longest run 4); end 3833.2 t 9 materials, cash §6448968, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 120 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   noCrane   s 2  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 3 without a purchase (longest run 3); end 3910.8 t 9 materials, cash §5891827, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 118 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   noCrane   s 3  r3   3.0h r4  17.9h r5  59.0h  9 sittings, 4 without a purchase (longest run 4); end 3692 t 9 materials, cash §5600245, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 113 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   noCrane   s 4  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 5 without a purchase (longest run 4); end 3881.1 t 9 materials, cash §5947231, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 119 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   noCrane   s 5  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3686.8 t 9 materials, cash §5910499, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 123 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   bridgeLevels s 1  r3   1.0h r4  26.0h r5  67.3h  10 sittings, 4 without a purchase (longest run 4); end 3732 t 9 materials, cash §5555932, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 136 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   bridgeLevels s 2  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3779.6 t 9 materials, cash §5198809, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 130 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   bridgeLevels s 3  r3   3.0h r4  24.0h r5  65.3h  10 sittings, 4 without a purchase (longest run 4); end 3895.8 t 9 materials, cash §5492665, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 129 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   bridgeLevels s 4  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3748.5 t 9 materials, cash §5253421, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 116 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   bridgeLevels s 5  r3   1.0h r4  21.8h r5  63.2h  9 sittings, 4 without a purchase (longest run 4); end 3604.4 t 9 materials, cash §5164724, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 126 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   always    s 1  r3   1.0h r4  26.0h r5  67.3h  10 sittings, 5 without a purchase (longest run 4); end 3834 t 9 materials, cash §6451272, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 127 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   always    s 2  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 3 without a purchase (longest run 3); end 3909.7 t 9 materials, cash §5892985, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 119 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   always    s 3  r3   3.0h r4  17.9h r5  59.0h  9 sittings, 4 without a purchase (longest run 4); end 3693.8 t 9 materials, cash §5606520, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 115 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   always    s 4  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 5 without a purchase (longest run 4); end 3881.1 t 9 materials, cash §5939256, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 117 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   always    s 5  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3686.1 t 9 materials, cash §5907785, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 130 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   flat      s 1  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 5 without a purchase (longest run 4); end 3850.4 t 9 materials, cash §5948718, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 144 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   flat      s 2  r3   0.9h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3737.7 t 9 materials, cash §6194672, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 146 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   flat      s 3  r3   3.0h r4  19.8h r5  61.0h  9 sittings, 4 without a purchase (longest run 4); end 3751.1 t 9 materials, cash §5881275, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 157 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   flat      s 4  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 3); end 3842.9 t 9 materials, cash §5896196, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 152 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   flat      s 5  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 3); end 3822.1 t 9 materials, cash §5872402, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 157 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   behind    s 1  r3   1.0h r4  26.0h r5  59.0h  9 sittings, 4 without a purchase (longest run 3); end 3879.3 t 9 materials, cash §7297498, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 9  cpu 149 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   behind    s 2  r3   1.0h r4  21.8h r5  54.8h  8 sittings, 2 without a purchase (longest run 2); end 3925.8 t 9 materials, cash §6753503, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 147 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0)
   behind    s 3  r3   3.0h r4  19.8h r5  52.8h  8 sittings, 3 without a purchase (longest run 3); end 3955.1 t 9 materials, cash §6988499, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 132 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0)
   behind    s 4  r3   1.0h r4  21.8h r5  54.8h  8 sittings, 4 without a purchase (longest run 3); end 4199.5 t 9 materials, cash §7548824, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 137 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0)
   behind    s 5  r3   1.0h r4  21.8h r5  54.8h  8 sittings, 2 without a purchase (longest run 2); end 3625.9 t 9 materials, cash §6497624, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 137 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0)
   noise     s 1  r3   1.0h r4  26.0h r5  67.3h  10 sittings, 5 without a purchase (longest run 4); end 3834.6 t 9 materials, cash §6439428, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 131 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   noise     s 2  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 3 without a purchase (longest run 3); end 3905.8 t 9 materials, cash §5878462, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 130 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   noise     s 3  r3   3.0h r4  17.9h r5  59.0h  9 sittings, 4 without a purchase (longest run 4); end 3673.2 t 9 materials, cash §5534988, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 117 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   noise     s 4  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 5 without a purchase (longest run 4); end 3882.3 t 9 materials, cash §5947839, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 128 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   noise     s 5  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3682.4 t 9 materials, cash §5901398, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 128 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   manager   s 1  r3   3.0h r4    -   r5    -    12 sittings, 11 without a purchase (longest run 10); end 2254.4 t 6 materials, cash §1726859, goal signDeal; rung 4 at sitting - (day NaN), rung 5 at sitting -  cpu 54 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   manager   s 2  r3   3.0h r4    -   r5    -    12 sittings, 10 without a purchase (longest run 10); end 2381.5 t 6 materials, cash §1841916, goal signDeal; rung 4 at sitting - (day NaN), rung 5 at sitting -  cpu 54 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   manager   s 3  r3   3.0h r4    -   r5    -    12 sittings, 10 without a purchase (longest run 10); end 2558.8 t 6 materials, cash §1987850, goal signDeal; rung 4 at sitting - (day NaN), rung 5 at sitting -  cpu 56 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   slow      s 1  r3   3.0h r4  20.0h r5  63.8h  12 sittings, 7 without a purchase (longest run 6); end 3863.8 t 9 materials, cash §6416228, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 12  cpu 179 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   slow      s 2  r3   3.0h r4  20.0h r5  63.8h  12 sittings, 7 without a purchase (longest run 6); end 3888.6 t 9 materials, cash §6333195, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 12  cpu 174 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   slow      s 3  r3   3.0h r4  20.0h r5  63.8h  12 sittings, 7 without a purchase (longest run 6); end 3876.9 t 9 materials, cash §5905177, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 12  cpu 198 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   steelMax  s 1  r3   1.0h r4    -   r5    -    12 sittings, 11 without a purchase (longest run 11); end 2781.5 t 6 materials, cash §2242681, goal buyAnalyser; rung 4 at sitting - (day NaN), rung 5 at sitting -  cpu 65 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   steelMax  s 2  r3   1.0h r4    -   r5    -    12 sittings, 11 without a purchase (longest run 11); end 3455.3 t 6 materials, cash §2565191, goal buyAnalyser; rung 4 at sitting - (day NaN), rung 5 at sitting -  cpu 86 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   steelMax  s 3  r3   3.0h r4    -   r5    -    12 sittings, 11 without a purchase (longest run 11); end 3054.7 t 6 materials, cash §2339466, goal buyAnalyser; rung 4 at sitting - (day NaN), rung 5 at sitting -  cpu 89 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   leadCut   s 1  r3   1.0h r4  26.0h r5    -    12 sittings, 7 without a purchase (longest run 6); end 4702.3 t 8 materials, cash §8818870, goal supplyRung5; rung 4 at sitting 5 (day 2.5), rung 5 at sitting -  cpu 166 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   leadCut   s 2  r3   1.0h r4  21.8h r5    -    12 sittings, 7 without a purchase (longest run 7); end 5357.3 t 8 materials, cash §9352182, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 194 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   leadCut   s 3  r3   3.0h r4  17.9h r5    -    12 sittings, 7 without a purchase (longest run 7); end 5184.7 t 8 materials, cash §8890065, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 167 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0 0)
   brisk     s 1  r3   0.9h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3691.8 t 9 materials, cash §6070966, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 151 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   brisk     s 2  r3   0.9h r4  21.8h r5  63.0h  9 sittings, 4 without a purchase (longest run 4); end 3742.7 t 9 materials, cash §6059747, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 161 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   brisk     s 3  r3   0.9h r4  28.0h r5  69.3h  10 sittings, 5 without a purchase (longest run 4); end 3974.9 t 9 materials, cash §6503623, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 145 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   packs     s 1  r3   1.0h r4  26.0h r5  67.3h  10 sittings, 5 without a purchase (longest run 4); end 3834 t 9 materials, cash §6451272, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 134 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   packs     s 2  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 3 without a purchase (longest run 3); end 3909.7 t 9 materials, cash §5892985, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 124 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   packs     s 3  r3   3.0h r4  17.9h r5  59.0h  9 sittings, 4 without a purchase (longest run 4); end 3693.8 t 9 materials, cash §5606520, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 116 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   ads       s 1  r3   1.0h r4  21.8h r5  63.2h  9 sittings, 3 without a purchase (longest run 3); end 3606.8 t 9 materials, cash §6010180, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 124 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   ads       s 2  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 3 without a purchase (longest run 3); end 3907.7 t 9 materials, cash §6034738, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 136 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   ads       s 3  r3   3.0h r4  19.8h r5  61.0h  9 sittings, 4 without a purchase (longest run 4); end 3810.8 t 9 materials, cash §5957717, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 121 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   racker    s 1  r3   1.0h r4  21.8h r5  63.1h  9 sittings, 4 without a purchase (longest run 4); end 3617.1 t 9 materials, cash §5988813, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 123 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   racker    s 2  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 3 without a purchase (longest run 3); end 3908.8 t 9 materials, cash §5888808, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 131 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   racker    s 3  r3   3.0h r4  24.0h r5  65.3h  10 sittings, 5 without a purchase (longest run 4); end 3769.1 t 9 materials, cash §6166174, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 118 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   cutter    s 1  r3   1.0h r4  21.8h r5  71.3h  10 sittings, 5 without a purchase (longest run 5); end 4111.4 t 9 materials, cash §7033368, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 10  cpu 146 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   cutter    s 2  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 3 without a purchase (longest run 3); end 3921.6 t 9 materials, cash §5901172, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 125 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   cutter    s 3  r3   3.0h r4  18.0h r5  59.0h  9 sittings, 4 without a purchase (longest run 4); end 3685.2 t 9 materials, cash §5580138, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 111 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   holder    s 1  r3   1.0h r4  24.0h r5  73.5h  11 sittings, 6 without a purchase (longest run 5); end 4084.8 t 9 materials, cash §6817887, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 11  cpu 180 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0 0)
   holder    s 2  r3   1.0h r4  21.8h r5  63.0h  9 sittings, 3 without a purchase (longest run 3); end 3809.4 t 9 materials, cash §5094391, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 141 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0)
   holder    s 3  r3   3.0h r4  24.0h r5  65.3h  10 sittings, 5 without a purchase (longest run 4); end 4053 t 9 materials, cash §5947433, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 147 s
               lots cut a sitting: 0 0 0 0 0 0 0 0 0 0 (came: 0 0 0 0 0 0 0 0 0 0)
   old       s 1  r3   1.0h r4  26.0h r5    -    6 sittings, 1 without a purchase (longest run 1); end 1730.7 t 8 materials, cash §2031126, goal pourLead; rung 4 at sitting 5 (day 2.5), rung 5 at sitting -  cpu 78 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   old       s 2  r3   3.0h r4  24.0h r5    -    6 sittings, 1 without a purchase (longest run 1); end 1667.5 t 8 materials, cash §1824685, goal pourLead; rung 4 at sitting 5 (day 2.5), rung 5 at sitting -  cpu 78 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   old       s 3  r3   1.0h r4  26.0h r5    -    6 sittings, 1 without a purchase (longest run 1); end 1749.5 t 8 materials, cash §2007277, goal pourLead; rung 4 at sitting 5 (day 2.5), rung 5 at sitting -  cpu 82 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   cut60     s 1  r3   1.0h r4  26.0h r5    -    6 sittings, 1 without a purchase (longest run 1); end 1706.4 t 8 materials, cash §2159669, goal pourLead; rung 4 at sitting 5 (day 2.5), rung 5 at sitting -  cpu 56 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   cut60     s 2  r3   1.0h r4  21.8h r5    -    6 sittings, 1 without a purchase (longest run 1); end 2285.8 t 8 materials, cash §2852131, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 74 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   cut60     s 3  r3   3.0h r4  17.9h r5    -    6 sittings, 1 without a purchase (longest run 1); end 2046.5 t 8 materials, cash §2535609, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 65 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   cut60     s 4  r3   1.0h r4  21.8h r5    -    6 sittings, 2 without a purchase (longest run 1); end 2238.6 t 8 materials, cash §2814827, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 65 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   cut60     s 5  r3   1.0h r4  28.0h r5    -    6 sittings, 1 without a purchase (longest run 1); end 1810.4 t 8 materials, cash §2196221, goal pourLead; rung 4 at sitting 5 (day 2.5), rung 5 at sitting -  cpu 64 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   hand15    s 1  r3   1.0h r4  26.0h r5    -    6 sittings, 1 without a purchase (longest run 1); end 1739.2 t 8 materials, cash §2196537, goal pourLead; rung 4 at sitting 5 (day 2.5), rung 5 at sitting -  cpu 63 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   hand15    s 2  r3   1.0h r4  21.8h r5    -    6 sittings, 1 without a purchase (longest run 1); end 2284.8 t 8 materials, cash §2862645, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 71 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   hand15    s 3  r3   3.0h r4  19.8h r5    -    6 sittings, 1 without a purchase (longest run 1); end 2167.2 t 8 materials, cash §2736506, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 73 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   hand15    s 4  r3   1.0h r4  21.8h r5    -    6 sittings, 2 without a purchase (longest run 1); end 2238.3 t 8 materials, cash §2743405, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 65 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)
   hand15    s 5  r3   1.0h r4  21.8h r5    -    6 sittings, 1 without a purchase (longest run 1); end 2000.2 t 8 materials, cash §2648430, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 73 s
               lots cut a sitting: 0 0 0 0 0 0 (came: 0 0 0 0 0 0)

2. THE SITTINGS (normal bot): left out here (60 KB); scratchpad yard/bots/s4/R1.txt section 2 holds every sitting of every seed.

3. THE MONEY'S HABITS AND THE WORKS' OWN LEGS
   (normal, routeB, noise and the probes: seed 1 only here; every run in scratchpad yard/bots/s4/R1.txt)
   normal    s 1: racked 59, gate sales seen live 60 (§9812), rackSold count 1470; lots 0; crate 562; first pours seen live -, heats poured induction 106, rotary 57, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   routeB    s 1: racked 45, gate sales seen live 53 (§8981), rackSold count 1421; lots 0; crate 555; first pours seen live -, heats poured induction 120, rotary 50, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   noCrane   s 1: racked 60, gate sales seen live 60 (§9812), rackSold count 1478; lots 0; crate 571; first pours seen live -, heats poured induction 107, rotary 56, smelter 32; started up baler,analyser,shear,depollution,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   noCrane   s 2: racked 49, gate sales seen live 51 (§8562), rackSold count 1455; lots 0; crate 302; first pours seen live -, heats poured induction 114, rotary 57, smelter 32; started up baler,analyser,shear,depollution,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   noCrane   s 3: racked 56, gate sales seen live 51 (§8751), rackSold count 1332; lots 0; crate 295; first pours seen live -, heats poured induction 120, rotary 52, smelter 32; started up baler,analyser,shear,depollution,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   noCrane   s 4: racked 57, gate sales seen live 53 (§8792), rackSold count 1435; lots 0; crate 347; first pours seen live -, heats poured induction 125, rotary 51, smelter 32; started up baler,analyser,shear,depollution,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   noCrane   s 5: racked 60, gate sales seen live 51 (§8236), rackSold count 1446; lots 0; crate 382; first pours seen live -, heats poured induction 107, rotary 55, smelter 32; started up baler,analyser,shear,granulator,depollution,shredder,rotary,induction,breaker,smelter; put aside cutLot,walkBackfield
   bridgeLevels s 1: racked 64, gate sales seen live 60 (§9862), rackSold count 1559; lots 0; crate 156; first pours seen live -, heats poured induction 91, rotary 57, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter; put aside cutLot,walkBackfield
   bridgeLevels s 2: racked 52, gate sales seen live 53 (§8624), rackSold count 1487; lots 0; crate 263; first pours seen live -, heats poured induction 100, rotary 56, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter; put aside rackBath,cutLot,walkBackfield
   bridgeLevels s 3: racked 70, gate sales seen live 58 (§9600), rackSold count 1556; lots 0; crate 321; first pours seen live -, heats poured induction 101, rotary 55, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter; put aside cutLot,walkBackfield
   bridgeLevels s 4: racked 60, gate sales seen live 57 (§9289), rackSold count 1514; lots 0; crate 498; first pours seen live -, heats poured induction 97, rotary 56, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter; put aside cutLot,walkBackfield
   bridgeLevels s 5: racked 61, gate sales seen live 53 (§8555), rackSold count 1482; lots 0; crate 295; first pours seen live -, heats poured induction 93, rotary 56, smelter 32; started up baler,analyser,shear,granulator,depollution,crane,shredder,rotary,induction,breaker,smelter; put aside cutLot,walkBackfield
   always    s 1: racked 59, gate sales seen live 60 (§9812), rackSold count 1470; lots 0; crate 562; first pours seen live -, heats poured induction 106, rotary 57, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   always    s 2: racked 49, gate sales seen live 52 (§8724), rackSold count 1440; lots 0; crate 311; first pours seen live -, heats poured induction 114, rotary 57, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   always    s 3: racked 61, gate sales seen live 49 (§8701), rackSold count 1341; lots 0; crate 350; first pours seen live -, heats poured induction 125, rotary 52, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   always    s 4: racked 55, gate sales seen live 53 (§8647), rackSold count 1437; lots 0; crate 390; first pours seen live -, heats poured induction 123, rotary 52, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   always    s 5: racked 60, gate sales seen live 50 (§8075), rackSold count 1438; lots 0; crate 299; first pours seen live -, heats poured induction 104, rotary 55, smelter 32; started up baler,analyser,shear,granulator,depollution,crane,shredder,rotary,induction,breaker,smelter; put aside cutLot,walkBackfield
   flat      s 1: racked 50, gate sales seen live 51 (§8307), rackSold count 1409; lots 0; crate 448; first pours seen live -, heats poured induction 122, rotary 52, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   flat      s 2: racked 53, gate sales seen live 50 (§8527), rackSold count 1438; lots 0; crate 281; first pours seen live -, heats poured induction 101, rotary 56, smelter 32; started up baler,analyser,shear,granulator,depollution,crane,shredder,rotary,induction,breaker,smelter; put aside cutLot,walkBackfield
   flat      s 3: racked 61, gate sales seen live 52 (§8568), rackSold count 1330; lots 0; crate 393; first pours seen live -, heats poured induction 122, rotary 57, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   flat      s 4: racked 56, gate sales seen live 54 (§8796), rackSold count 1445; lots 0; crate 434; first pours seen live -, heats poured induction 117, rotary 56, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   flat      s 5: racked 55, gate sales seen live 53 (§8633), rackSold count 1425; lots 0; crate 345; first pours seen live -, heats poured induction 118, rotary 56, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   behind    s 1: racked 34, gate sales seen live 30 (§7498), rackSold count 781; lots 0; crate 70; first pours seen live -, heats poured induction 103, rotary 46, smelter 23; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   noise     s 1: racked 57, gate sales seen live 57 (§9608), rackSold count 1466; lots 0; crate 492; first pours seen live -, heats poured induction 105, rotary 56, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   behind    s 2: racked 28, gate sales seen live 30 (§7075), rackSold count 797; lots 0; crate 47; first pours seen live -, heats poured induction 111, rotary 46, smelter 23; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   behind    s 3: racked 38, gate sales seen live 33 (§7596), rackSold count 731; lots 0; crate 41; first pours seen live -, heats poured induction 98, rotary 40, smelter 23; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   behind    s 4: racked 29, gate sales seen live 29 (§7034), rackSold count 737; lots 0; crate 127; first pours seen live -, heats poured induction 94, rotary 39, smelter 23; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   behind    s 5: racked 38, gate sales seen live 34 (§6587), rackSold count 778; lots 0; crate 181; first pours seen live -, heats poured induction 102, rotary 46, smelter 23; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   manager   s 1: racked 10, gate sales seen live 8 (§2137), rackSold count 188; lots 0; crate 0; first pours seen live -, heats poured -; started up -; put aside -
   slow      s 1: racked 80, gate sales seen live 63 (§10762), rackSold count 1433; lots 0; crate 140; first pours seen live -, heats poured induction 122, rotary 57, smelter 36; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   steelMax  s 1: racked 34, gate sales seen live 13 (§2768), rackSold count 282; lots 0; crate 350; first pours seen live -, heats poured -; started up baler; put aside -
   manager   s 2: racked 13, gate sales seen live 14 (§3106), rackSold count 199; lots 0; crate 0; first pours seen live -, heats poured -; started up -; put aside -
   slow      s 2: racked 78, gate sales seen live 67 (§10919), rackSold count 1467; lots 0; crate 481; first pours seen live -, heats poured induction 122, rotary 57, smelter 36; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   steelMax  s 2: racked 23, gate sales seen live 23 (§3749), rackSold count 370; lots 0; crate 410; first pours seen live -, heats poured -; started up baler; put aside rackBath
   manager   s 3: racked 18, gate sales seen live 17 (§3301), rackSold count 266; lots 0; crate 0; first pours seen live -, heats poured -; started up -; put aside -
   slow      s 3: racked 77, gate sales seen live 69 (§11941), rackSold count 1477; lots 0; crate 223; first pours seen live -, heats poured induction 132, rotary 54, smelter 36; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   steelMax  s 3: racked 27, gate sales seen live 22 (§4103), rackSold count 322; lots 0; crate 471; first pours seen live -, heats poured -; started up baler; put aside -
   leadCut   s 1: racked 71, gate sales seen live 73 (§11943), rackSold count 1908; lots 0; crate 287; first pours seen live -, heats poured induction 145, rotary 78; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,granulator; put aside cutLot,walkBackfield
   brisk     s 1: racked 60, gate sales seen live 54 (§8858), rackSold count 1433; lots 0; crate 620; first pours seen live -, heats poured induction 104, rotary 56, smelter 32; started up baler,analyser,shear,granulator,depollution,crane,shredder,rotary,induction,breaker,smelter; put aside cutLot,walkBackfield
   packs     s 1: racked 59, gate sales seen live 60 (§9812), rackSold count 1470; lots 0; crate 562; first pours seen live -, heats poured induction 106, rotary 57, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   leadCut   s 2: racked 67, gate sales seen live 73 (§12159), rackSold count 2129; lots 0; crate 313; first pours seen live -, heats poured induction 185, rotary 92; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction; put aside rackBath,cutLot,walkBackfield
   brisk     s 2: racked 62, gate sales seen live 54 (§8939), rackSold count 1456; lots 0; crate 569; first pours seen live -, heats poured induction 109, rotary 56, smelter 32; started up baler,analyser,shear,granulator,depollution,crane,shredder,rotary,induction,breaker,smelter; put aside cutLot,walkBackfield
   packs     s 2: racked 49, gate sales seen live 52 (§8724), rackSold count 1440; lots 0; crate 311; first pours seen live -, heats poured induction 114, rotary 57, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   leadCut   s 3: racked 70, gate sales seen live 67 (§11605), rackSold count 1994; lots 0; crate 626; first pours seen live -, heats poured induction 190, rotary 92; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,granulator; put aside cutLot,walkBackfield
   brisk     s 3: racked 72, gate sales seen live 59 (§9867), rackSold count 1582; lots 0; crate 665; first pours seen live -, heats poured induction 109, rotary 55, smelter 32; started up baler,analyser,shear,granulator,depollution,crane,shredder,rotary,induction,breaker,smelter; put aside cutLot,walkBackfield
   packs     s 3: racked 61, gate sales seen live 49 (§8701), rackSold count 1341; lots 0; crate 350; first pours seen live -, heats poured induction 125, rotary 52, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   ads       s 1: ads 5 (§146346); racked 55, gate sales seen live 52 (§8533), rackSold count 1401; lots 0; crate 273; first pours seen live -, heats poured induction 103, rotary 56, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   racker    s 1: racked 54, gate sales seen live 49 (§8382), rackSold count 1354; lots 0; crate 462; first pours seen live -, heats poured induction 105, rotary 56, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   cutter    s 1: racked 58, gate sales seen live 57 (§9229), rackSold count 1583; lots 0; crate 489; first pours seen live -, heats poured induction 128, rotary 67, smelter 40; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   holder    s 1: racked 77, gate sales seen live 65 (§10601), rackSold count 1635; lots 0; crate 415; first pours seen live -, heats poured induction 129, rotary 68, smelter 40; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   ads       s 2: ads 5 (§151867); racked 51, gate sales seen live 51 (§8567), rackSold count 1465; lots 0; crate 413; first pours seen live -, heats poured induction 115, rotary 55, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   racker    s 2: racked 55, gate sales seen live 54 (§8786), rackSold count 1463; lots 0; crate 195; first pours seen live -, heats poured induction 119, rotary 56, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   cutter    s 2: racked 51, gate sales seen live 48 (§8356), rackSold count 1451; lots 0; crate 337; first pours seen live -, heats poured induction 115, rotary 56, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   holder    s 2: racked 58, gate sales seen live 51 (§8619), rackSold count 1466; lots 0; crate 333; first pours seen live -, heats poured induction 123, rotary 53, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   ads       s 3: ads 5 (§148489); racked 63, gate sales seen live 51 (§8472), rackSold count 1389; lots 0; crate 386; first pours seen live -, heats poured induction 121, rotary 52, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   racker    s 3: racked 59, gate sales seen live 55 (§9442), rackSold count 1483; lots 0; crate 436; first pours seen live -, heats poured induction 104, rotary 56, smelter 32; started up baler,analyser,shear,granulator,depollution,crane,shredder,rotary,induction,breaker,smelter; put aside cutLot,walkBackfield
   cutter    s 3: racked 59, gate sales seen live 53 (§8791), rackSold count 1355; lots 0; crate 452; first pours seen live -, heats poured induction 120, rotary 51, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   holder    s 3: racked 64, gate sales seen live 54 (§9241), rackSold count 1477; lots 0; crate 339; first pours seen live -, heats poured induction 125, rotary 52, smelter 32; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   old       s 1: racked 34, gate sales seen live 25 (§4314), rackSold count 582; lots 0; crate 291; first pours seen live -, heats poured induction 24, rotary 10; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   old       s 2: racked 32, gate sales seen live 26 (§4255), rackSold count 527; lots 0; crate 253; first pours seen live -, heats poured induction 24, rotary 10; started up baler,analyser,shear,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside rackBath,cutLot,walkBackfield
   old       s 3: racked 24, gate sales seen live 21 (§4211), rackSold count 582; lots 0; crate 195; first pours seen live -, heats poured induction 25, rotary 10; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   cut60     s 1: racked 30, gate sales seen live 29 (§4778), rackSold count 590; lots 0; crate 293; first pours seen live -, heats poured induction 21, rotary 11; started up baler,analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield
   hand15    s 1: racked 33, gate sales seen live 29 (§5062), rackSold count 596; lots 0; crate 137; first pours seen live -, heats poured induction 19, rotary 10; started up analyser,shear,depollution,crane,shredder,rotary,induction,breaker,smelter,granulator; put aside cutLot,walkBackfield

run time: 13238 s of CPU over 103 runs (first parts played in this call: 50)
```
