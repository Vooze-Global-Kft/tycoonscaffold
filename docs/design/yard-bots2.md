# Scrapyard: the bots' measurement of stage 2, the works (REPORT8, 26 to 27 November)

This is the balance bots' report on stage 2 (`yard-stage2.md`) as the joined rules play it: the bots of its 8.2 on the real
content read at `release.stage` 2 in memory (the shipped content keeps the key at 1: stage 2 stays dark on the owner's
phone, ruling 18.1 S1). It measures the table its 9.2 asks for and records the three rounds of content numbers this step
set (rung 5's tonnes, the plate prices from the measured gain of ruling 19.1, the van's factor). Five seeds for the normal
hand and its variants, three for the other habits, five unseen (101 to 105): ruling 19.8 keeps the fifteen-seed table for
after the engine's time away is fast. `yard-bots.md` stays the first yard's report (REPORT7). Paths that begin
"scratchpad" or name the build's notes (`notes/`, `bots/s3/`) are working notes, not in the repository.

```text
REPORT8: THE BOTS MEASURE STAGE 2 AND SET ITS NUMBERS (content2-bots, second half; 26 November 21:40 to 27 November 01:10)
=========================================================================================================================
Program: src/engine/salvage/bot.ts (unchanged by this half), scripts/content/yard-bot.ts (this half's additions: G at every
return, I/G at the named moments, content variants flat / behind / noise / old, the stage-2 purchase walk --walk2, the
plates measured on what the yard keeps, the REPORT8 table, --from). Content: src/config/salvage.content.ts ->
games/scrap-yard/game.json, release.stage STILL 1 (every run reads it at stage 2 in memory, `--stage 2`).
Engine: branch scrap-yard as engine steps 3 and 4 left it while these runs went (both promise results unchanged bit for
bit; step 4 was editing works.ts during the runs; no run broke a hard promise).
Seeds: 1 to 5 for the normal hand and its variants, 1 to 3 for the other habits, 101 to 105 unseen for the normal hand
(RULING2.md 19.8: three to five seeds until the engine's time away is fast; the fifteen-seed table waits for it).

Commands (each under 30 minutes; scratchpad yard/bots/s3/run.sh wraps them, --cache yard/bots/s3/cache):
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --bots normal --seeds 5 --plates --walk2 --shard i/3 --json N3x.json
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --bots always --seeds 5 --json F3a.json
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --bots flat,behind,noise --seeds 5 --shard i/2
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --bots manager,slow,steelMax,leadCut --seeds 3 --shard i/2
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --bots brisk,packs,ads,racker,cutter,holder --seeds 3 --shard i/2
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 6 --bots old --seeds 5
  npx tsx scripts/content/yard-bot.ts --stage 2 --sittings 12 --bots normal --unseen
  npx tsx scripts/content/yard-bot.ts --stage 2 --from a.json,b.json,...          (the table again, no play)
  npx tsx <scratchpad>/yard/bots/s3/bench2.ts 1                                    (six hours away at r3 and r4)
  npx tsx <scratchpad>/yard/bots/s3/same1.ts <game.json before this step>          (stage 1 unchanged)

VERDICT. Rung 4 comes at day 2.0 and rung 5 at day 4.0 on every normal seed (5 of 5, 5 of 5 unseen at rung 5 by day 4.5)
after three rounds of numbers: rung 5's tonnes 10,000 -> 5,000 -> 3,600 t (ruling 19.3), the thirteen plate prices from
the measured gain (ruling 19.1), the van's factor 1.5 -> 1.25. No hard promise broke on 65 runs; a minute of ticks equals
one jump at 30 checks; the first yard at release.stage 1 plays bit for bit as before (three hands, rung 3, two absences).
What numbers cannot fix, for the lead: (1) the magnet crane makes the yard POORER (G -14 to -29 % at its moment; the walk's
"buy crane" -5.6 % mean, -16 % worst) and the baler a little (-2.6 %): ruling 17.1 fails; (2) six plates (shear,
depollution, granulator, eddy, sorter, and the crane) earn nothing on a capped absence, so 19.1 prices them at the floor
§3,000: their worth, if any, is in play only; (3) rated income I is off at four of six moments (I/G 1.26 to 1.33 at the
return before rung 3's last purchases and at rung 4's entry; 0.88 to 0.94 elsewhere): rate.ts's fix pass (19.2);
(4) with 19.1's prices the first Bank loan is the shredder at rung 4 on every seed: L1 0 of 5, and the first loan cannot be
repaid before rung 4 (L5); (5) the lead cut is a DEAD END at rung 5 (8 materials, the rung asks 9); (6) the sittings
between the stage's last goal purchase (sitting 6) and rung 5 (sitting 8) offer nothing useful (the advice line names
only binding levels); (7) the demolition partner's level lowers what the yard keeps at day 3 (-4.8 % mean, -7.6 % worst).

1. THE AIMS, ONE BY ONE (the table's section in brackets; "met" on the seeds measured, never on fifteen)
   rung 4 at day 2 to 3 ............ met: day 2.0 on 5/5 normal, 3/3 brisk, slow 2.5, at the band's lower edge (T1).
                                     Card manager 3.5 to 4.0: MISSED by half a day to a day (it buys from the advice line).
   rung 5 at day 4 to 6 ............ met: day 4.0 on 5/5 (unseen: 4 at day 4.0, 1 at 4.5); slow 4.5 to 5.0; brisk 4.0;
                                     at the lower edge. Manager day 6 on 2 of 3, not in 6 days on 1 (T1).
   last goal purchase and rung 5 within about two sittings (19.3) ... met: last goal purchase at sitting 6, rung 5 at 8.
   a useful purchase every sitting .. MISSED at sitting 7 (and the rung-5 sitting 8) on 4 of 5 seeds: 9 of 40 sittings
                                     buy nothing; a rule (the advice line names nothing once the goal list is done) (T6).
   cash at most 2 tau_r of income ... met on the normal hand (cash/G at rung 4: 5 to 26 h against 44 h); flat board seed 3
                                     2.6 tau at sitting 8 (rung 5) (T6).
   I against G, 14.10 ............... MISSED at every moment on both boards (T2): medians 0.94, 1.31, 1.30, 0.92, 0.92,
                                     0.88 (normal board); 0.93, 1.33, 1.33, 0.91, 0.91, 0.95 (flat). Note: the moments are
                                     returns (before that sitting's purchases); "r3 last purchase" is the return of the
                                     sitting whose purchases were rung 3's last. The over-reading at rung 3's end and at
                                     rung 4's entry is I counting plates (shredder, induction) whose output the capped
                                     absence does not deliver yet. rate.ts is not this step's (19.2).
   planning ahead, 14.9 ............. met on 5 seeds (T3): false against true -0.8 % / +0.2 % at day 1, -0.7 % / -2.5 % at
                                     day 3 (lifetime / supplied), noise floor -0.2 / -0.3 and +1.8 / +3.5 %; standard error
                                     up to 4 %: five seeds cannot bound it closer.
   new order of work against old (16.7, 16.3 ii) ... met (T3b): the old order keeps 8 to 9 % less lifetime earnings and
                                     12 to 14 % fewer tonnes at days 1 and 3 on means (one seed +43 % at day 1, from a rung-3
                                     time two hours apart in the first hour).
   the bank: first offer within two sittings of rung 3 (L1, a measure by 19.6) ... 0 of 5: the first offer is the
                                     shredder §419,000 at sitting 4 (rung 4) on 4 of 5; seed 3 never sees the letter (T4).
   the first loan repaid before rung 4 (L5, a gate) ... NOT POSSIBLE as priced: the first loan IS at rung 4. Repaid in the
                                     next absence on every seed: 8.2 h of the yard running, 0.2 h played (T4).
   rung 5 at most a tenth sooner with every loan ... met: 0.0 % (T4).
   the bank's share ................ at most 7.0 to 7.2 % of an absence's earnings while a loan runs (bank.share 0.2 of
                                     lot payments) (T4).
   ad rewards at most 4 % of a day ... met: 1.6 % on day 1, under 1 % after (ads bot, 3 seeds) (T5).
   the Yard sale and the van 2 to 5 %, never over 8 % ... met after round 3 except day 1 at 5.2 % (0.2 over); never over
                                     8 % (T5). Before round 3: 5.9, 5.4, 5.2 %.
   the plates' payback 0.8 to 1.5 tau ... met for analyser 0.89-1.09, rotary 1.08-1.13, induction 1.11-1.34, smelter 0.84
                                     (one seed 0.47); shredder 0.65-0.87 and breaker 0.57-0.83 are SHORT of 0.8 (the
                                     price fell with the gain measured with fewer earlier plates owned: one more measuring
                                     round would raise both); never for the six floor plates and the crane (T8).
   which plate first meets the finance floor ... the shredder (§419,000 at rung 4); no rung-3 plate is offered finance.
   the hand's worth: the working hand at least 1.2 x the card manager ... met: 2.0 at sitting 4, 2.1 at sitting 8 (T7).
   no mechanism over three fifths of the gain ... NOT MEASURED (no per-mechanism split in the bots yet).
   E19, an hour away 0.3 to 0.8 of an hour played ... met at stage 2: median 0.46 at rungs 3 and 4 (single sittings range
                                     0.16 to 1.85: a 15-minute sitting is a noisy hour) (T5). The FIRST yard's 0.81 (ruling
                                     16.9) is not retuned here: see 4.
   packs on against off ............. one pack a run (§0.39M to §0.80M; the headroom refuses the rest); every aim holds with
                                     packs on; the buyer's lead at rung 5: 0 days (the tonnes come from the sources, not cash).
   the day-word holder (14.11) ...... MISSED by the measure available: lifetime earnings 11 to 29 % below the normal hand at
                                     day 3 (3 seeds); the stock it still holds is not counted in this table.
   racker against cutter ............ the racker keeps 3 to 7 % more lifetime at day 3 than the normal hand, the cutter -10
                                     to +5 %; racking a minute against cutting a minute is NOT MEASURED (19.5: the rules rack
                                     before they cut).
   steel-max ........................ stalls at rung 3 with 6 materials on 3 of 3 (19.4: the design).
   the lead cut ..................... rung 4 at day 2.0; DEAD END at rung 5 on 3 of 3 (8 materials, 6,300 to 6,450 t by day 6).
   no hand .......................... the next purchase within one absence at every state measured (report2 section 4).
   the purchase walk, 17.1 .......... 5 of 64 steps FAIL (section 9): buy crane (r3: -5.6 % mean, -16.2 % worst), buy baler
                                     (r3: -2.6 %), level driver (r3: worst -4.5 %), level farm (r3: -1.4 %), level demolition
                                     (day 3: -4.8 %, worst -7.6 %). Plates sold at the floor that earn nothing away show 0.
   the bench (six hours away, alone) ... NOT MET, and not measurable alone on this machine (load 6.7 to 7.0 on 4 cores):
                                     the first yard's bench 233 ms (gate 250); stage 2 from rung 3's first return 813 ms
                                     (4 h ran, the cap), from rung 4's first return 1,799 ms (6 h). Engine step 4 owns it.
   tick against jump ................ met: 30 checks (a minute of ticks against one jump at sittings 1 to 5, 8) on 5 runs
                                     to rung 4 and beyond; 0 differ. Not "minute by minute on fifteen runs".
   the hard promises ................ met on 65 runs (60 seeded + 5 unseen): shown = applied, money only by lot payments,
                                     ads and grants, cash never negative, the away card's sum, nothing of money before the
                                     second session; presses refused are the bot's own (earmark 27, cash 4, nothing 10 by
                                     the card manager; one start-up the bot could not make at the shear's plot, s4 behind).

2. THE NUMBERS CHANGED FROM THE SPECIFICATION'S FIRST VALUES (src/config/salvage.content.ts, each with a $changes line)
   round 1  ladder.rungs n 5 t      10,000 -> 5,000 t     aim rung 5 day 4 to 6 (none reached it in 8 days)
   round 2  works.plates prices (19.1, scripts/content/bots/plates.json, dE the mean of seeds 1 to 5):
              crane 30,000 -> 3,000   shear 40,000 -> 3,000   baler 9,000 -> 3,000   analyser 6,000 -> 29,100
              depollution 80,000 -> 3,000   granulator 24,000 -> 3,000   shredder 600,000 -> 419,000
              eddy 250,000 -> 3,000   sorter 300,000 -> 3,000   rotary 450,000 -> 77,600   induction 350,000 -> 171,000
              breaker 200,000 -> 38,100   smelter 400,000 -> 27,500
   round 3  ladder.rungs n 5 t      5,000 -> 3,600 t      aim 19.3 (rung 5 within two sittings of the last goal purchase)
            reuse.batchFactor       1.5 -> 1.25           aim the Yard sale and the van 2 to 5 % of a day
   Not changed: rung 4 (1,000 t: day 2.0, the band's edge, on every seed), bank.*, ads.*, tau_h, ceilings, caps, every
   number of the first yard (see 4).

3. TABLES BEFORE AND AFTER EACH ROUND (normal hand, seeds 1 to 5; full outputs yard/bots/s3/R1.txt, R2.txt, R3.txt)
                                 at first values   round 1 (5,000 t)   round 2 (prices)   round 3 (3,600 t, 1.25)
   rung 4 sitting                4 on 3/3 [3 seeds, 16 sittings]  4 on 5/5     4 on 5/5          4 on 5/5
   rung 5 sitting                none in 16        10 on 5/5           10 on 5/5          8 on 5/5
   sittings without a purchase   7-9 of 16 a seed  12 of 50            17 of 50           9 of 40
   cash over 2 tau               from sitting 9    2 sittings          6 sittings         0 (normal board)
   Yard sale + van, days 1/2/3   -                 6.2 / 5.2 / 5.3 %   5.9 / 5.4 / 5.2 %  5.2 / 4.7 / 4.5 %
   I/G medians (6 moments)       -                 0.87 0.86 1.09 0.94 0.84 0.84   0.90 1.27 1.29 0.89 0.86 0.86   0.94 1.31 1.30 0.92 0.92 0.88
   plate payback in tau          (dI-priced: 10 plates "never")    -    shredder 0.64-1.0, rotary 0.9-1.2, induction 0.9-1.1 ...  (T8 below)

4. WHAT THIS STEP DID NOT TUNE, AND WHY
   The first yard's open items the lead listed (the farm level's row at minute 90, the slow hand's rung 3, E19's 0.81)
   are numbers of the first yard on the owner's phone. The lead's note 2 asks that the stage-1 report come out as today;
   I read that as "do not move the first yard's numbers" and left them: the walk here shows the farm level at -1.4 % at
   rung 3's first return (stage 2 states); at stage 2, E19 is 0.46. The lead decides whether they are tuned (their
   numbers would move the owner's game).

5. WHAT THE LEAD MUST DECIDE
   a. The crane (blocking by 17.1): its rule or its content (which hoppers, rate, reach) makes the yard poorer; with its
      price now the floor, the goal card sells a trap for §3,000.
   b. Plates that earn only in play (shear, depollution, granulator, eddy, sorter): 19.1 prices them at the floor because a
      capped absence never feeds them (oversize pieces and cars need the boss; the eddy needs car bodies and appliances
      in the shredder's stream). Either measure their gain over played sittings, or accept the floor.
   c. The bank: with 19.1's prices L1 and L5 cannot both hold (no rung-3 plate is above cash). Lower bank.minPrice_h does
      not help (the offer needs P > cash - reserve). Options: L5 read as "repaid within the next absence" (true on 4 of 4),
      or a rung-3 plate priced over the cash a rung-3 sitting holds.
   d. The lead cut: rung 5's range (9) or a ninth material without lead.
   e. Sittings 7 to 8: something useful to buy after the goal list (the advice line names only binding levels).
   f. The gates' numbers of 9.2 from this table (rung bands, I's band, the walk's bound) are the lead's to set.
   g. The I gate is printed at returns; if the lead wants the moment after a sitting's purchases, the bots need one more
      G measurement a sitting (about 3 s at rung 4).

THE TABLE (yard-bot.ts --stage 2 --from N3a,N3b,N3c,F3a,F3b,F3c,H3a,H3b,H3c,H3d,O3; seeds 1 to 5 normal and variants,
1 to 3 the habits; content of round 3)
------------------------------------------------------------------------------------------------------------------------
REPORT8 TABLE (yard-stage2.md 9.2; 60 stage-2 runs; bots normal, always, flat, noise, behind, manager, steelMax, slow, leadCut, brisk, ads, cutter, packs, racker, holder, old)

T1. RUNG 4 AT DAY 2 TO 3 (sittings 4 to 6), RUNG 5 AT DAY 4 TO 6 (sittings 8 to 12): per bot, the sitting of each per seed and the count in band
   normal    n  5  rung 4 at 4 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at 8 8 8 8 8  (5/5 in band)
   always    n  5  rung 4 at 4 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at 8 8 8 8 8  (5/5 in band)
   flat      n  5  rung 4 at 4 4 5 4 4  (5/5 in band, median day 2.00)   rung 5 at 8 8 9 8 8  (5/5 in band)
   noise     n  5  rung 4 at 4 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at 8 8 8 8 8  (5/5 in band)
   behind    n  5  rung 4 at 4 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at 8 8 8 9 9  (5/5 in band)
   manager   n  3  rung 4 at 8 7 7  (0/3 in band, median day 3.50)   rung 5 at - 12 12  (2/3 in band; not reached on 1, end 3479.8 t 9 mat)
   steelMax  n  3  rung 4 at - - -  (0/3 in band, median day -)   rung 5 at - - -  (0/3 in band; not reached on 3, end 3278 t 6 mat, 3282.6 t 6 mat, 3153.6 t 6 mat)
   slow      n  3  rung 4 at 5 5 5  (3/3 in band, median day 2.50)   rung 5 at 10 10 9  (3/3 in band)
   leadCut   n  3  rung 4 at 4 4 4  (3/3 in band, median day 2.00)   rung 5 at - - -  (0/3 in band; not reached on 3, end 6452.7 t 8 mat, 6336.8 t 8 mat, 6320.2 t 8 mat)
   brisk     n  3  rung 4 at 4 4 4  (3/3 in band, median day 2.00)   rung 5 at 8 8 8  (3/3 in band)
   ads       n  3  rung 4 at 4 4 5  (3/3 in band, median day 2.00)   rung 5 at 8 8 9  (3/3 in band)
   cutter    n  3  rung 4 at 4 4 5  (3/3 in band, median day 2.00)   rung 5 at 8 8 9  (3/3 in band)
   packs     n  3  rung 4 at 4 4 4  (3/3 in band, median day 2.00)   rung 5 at 8 8 8  (3/3 in band)
   racker    n  3  rung 4 at 4 4 4  (3/3 in band, median day 2.00)   rung 5 at 8 8 8  (3/3 in band)
   holder    n  3  rung 4 at 4 5 5  (3/3 in band, median day 2.50)   rung 5 at 9 9 9  (3/3 in band)
   old       n  5  rung 4 at 4 5 4 4 4  (5/5 in band, median day 2.00)   rung 5 at - - - - -  (0/5 in band; not reached on 5, end 2123.2 t 9 mat, 1724.5 t 8 mat, 2320.5 t 9 mat, 2128.3 t 9 mat, 2093.3 t 9 mat)

T2. RATED INCOME I AGAINST G (14.10; G a capped absence at usual prices from the sitting's return, I at the same state; gate per moment: median 0.95-1.05, 13 of 15 in 0.88-1.12, none outside 0.80-1.25)
   PLAYED WITH THE NORMAL BOARD, 5 seeds
     r3 entry (sitting 1) n  5  I/G median 0.94  5/5 in 0.88-1.12  min 0.91 max 0.95  0 outside: MISSED   [0.94 0.91 0.94 0.93 0.95]
     r3 last purchase     n  5  I/G median 1.31  0/5 in 0.88-1.12  min 1.26 max 1.32  5 outside: MISSED   [1.32 1.31 1.31 1.26 1.32]
     r4 entry             n  5  I/G median 1.30  0/5 in 0.88-1.12  min 1.17 max 1.33  3 outside: MISSED   [1.33 1.30 1.17 1.24 1.33]
     day 3 (sitting 6)    n  5  I/G median 0.92  5/5 in 0.88-1.12  min 0.90 max 0.93  0 outside: MISSED   [0.92 0.92 0.93 0.90 0.92]
     r4 last purchase     n  5  I/G median 0.92  4/5 in 0.88-1.12  min 0.87 max 0.92  0 outside: MISSED   [0.92 0.92 0.87 0.90 0.92]
     r5 entry (run end)   n  5  I/G median 0.88  2/5 in 0.88-1.12  min 0.86 max 1.57  1 outside: MISSED   [0.89 0.88 0.88 0.86 1.57]
   PLAYED WITH PRICES FLAT (board.a 0), 5 seeds
     r3 entry (sitting 1) n  5  I/G median 0.93  5/5 in 0.88-1.12  min 0.92 max 0.99  0 outside: MISSED   [0.93 0.99 0.97 0.93 0.92]
     r3 last purchase     n  5  I/G median 1.33  0/5 in 0.88-1.12  min 1.31 max 1.38  5 outside: MISSED   [1.33 1.32 1.38 1.33 1.31]
     r4 entry             n  5  I/G median 1.33  1/5 in 0.88-1.12  min 1.12 max 1.39  4 outside: MISSED   [1.12 1.25 1.39 1.33 1.33]
     day 3 (sitting 6)    n  5  I/G median 0.91  4/5 in 0.88-1.12  min 0.87 max 1.09  0 outside: MISSED   [0.87 0.90 1.09 0.92 0.91]
     r4 last purchase     n  5  I/G median 0.91  3/5 in 0.88-1.12  min 0.87 max 1.09  0 outside: MISSED   [0.87 0.87 1.09 0.92 0.91]
     r5 entry (run end)   n  5  I/G median 0.95  2/5 in 0.88-1.12  min 0.87 max 3.12  1 outside: MISSED   [0.87 0.95 3.12 0.90 1.25]

T3b. THE YARD HANDS' ORDER OF WORK, NEW AGAINST OLD (RULING2.md 16.7, 16.3 (ii)): crew.orderFromRung beyond the ladder (old) against the shipped rule (normal), the mean over seeds of old / new - 1; aim: new keeps at least what old kept
   day 1 lifetime earnings  n  5  old vs new mean -8.3 % (worst -40.2 %, best +43.2 %): met
   day 1 supplied t         n  5  old vs new mean -11.6 % (worst -42.9 %, best +44.8 %): met
   day 3 lifetime earnings  n  5  old vs new mean -8.8 % (worst -25.4 %, best +3.3 %): met
   day 3 supplied t         n  5  old vs new mean -13.7 % (worst -29.2 %, best +3.2 %): met

T3. PLANNING AHEAD (14.9): ahead true (normal) against false (behind), the MEAN over seeds of (true / false - 1) ... printed as false against true; the noise floor (cutters x (1 + 1e-9)) beside; gate: within 2 % for lifetime earnings and 5 % for supplied
   day 1 lifetime earnings  n  5  false vs true mean -0.8 % (s.e. 0.9 %; worst -3.0 %, best +1.4 %)  noise mean -0.2 % (n 5): met
   day 1 supplied t         n  5  false vs true mean +0.2 % (s.e. 1.0 %; worst -2.6 %, best +3.0 %)  noise mean -0.3 % (n 5): met
   day 3 lifetime earnings  n  5  false vs true mean -0.7 % (s.e. 3.8 %; worst -10.4 %, best +10.8 %)  noise mean +1.8 % (n 5): met
   day 3 supplied t         n  5  false vs true mean -2.5 % (s.e. 4.3 %; worst -14.7 %, best +6.8 %)  noise mean +3.5 % (n 5): met

T4. THE BANK (2.14; LEAD L1, L5): first offer within the first two sittings of rung 3 (12 of 15); every loan; the first repaid before rung 4 on every seed, with the hours PLAYED (aim about 4) and of the yard RUNNING (about 7); rung 5 at most a tenth sooner than never-financing
   normal  s  1: letter s4; offers 2 (first shredder §419000 at sitting 4); no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 56.8 h
   normal  s  2: letter s4; offers 1 (first shredder §419000 at sitting 4); no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 56.8 h
   normal  s  3: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 52.8 h
   normal  s  4: letter s4; offers 2 (first shredder §419000 at sitting 4); no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 56.8 h
   normal  s  5: letter s4; offers 2 (first shredder §419000 at sitting 4); no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 56.8 h
   always  s  1: letter s4; offers 1 (first shredder §419000 at sitting 4); loans shredder §419000 (F 156125.68) s4 repaid s5: 0.2 h played, 8.2 h running, AFTER rung 4; bank's largest share of an absence's earnings 7.0 %; rung 5 at 56.8 h
   always  s  2: letter s4; offers 1 (first shredder §419000 at sitting 4); loans shredder §419000 (F 156401.66) s4 repaid s5: 0.2 h played, 8.2 h running, AFTER rung 4; bank's largest share of an absence's earnings 7.1 %; rung 5 at 56.8 h
   always  s  3: letter s-; offers 0; no loan; bank's largest share of an absence's earnings 0.0 %; rung 5 at 52.8 h
   always  s  4: letter s4; offers 1 (first shredder §419000 at sitting 4); loans shredder §419000 (F 157271.36) s4 repaid s5: 0.2 h played, 8.2 h running, AFTER rung 4; bank's largest share of an absence's earnings 7.2 %; rung 5 at 56.8 h
   always  s  5: letter s4; offers 1 (first shredder §419000 at sitting 4); loans shredder §419000 (F 155609.16) s4 repaid s5: 0.2 h played, 8.2 h running, AFTER rung 4; bank's largest share of an absence's earnings 7.1 %; rung 5 at 56.8 h
   first offer within two sittings of rung 3 (always bot): 0/5 (aim 12 of 15)
   rung 5 sooner with every loan than never: median -0.0 %, max +0.0 % (aim at most +10 %)
   first loan NOT repaid before rung 4: 4 of 4 runs with a loan (gate: none)

T5. SHARES OF A DAY'S EARNINGS (lifetime earnings over two sittings): ad rewards (aim at most 4 %, ads bot); the Yard sale and the van (2 to 5 %, never over 8 %, normal bot): per day 1..7, median over seeds [max]
   ads (ads bot)          d1 1.6 [2.0]  d2 0.8 [0.8]  d3 0.5 [0.6]  d4 0.4 [0.4]   (0 seed-days over 4 %)
   Yard sale + van (normal) d1 5.2 [5.2]  d2 4.7 [4.9]  d3 4.5 [4.6]  d4 3.8 [4.4]   (0 seed-days over 8 %)
     of it the van        d1 4.3 [4.4]  d2 3.7 [4.0]  d3 3.8 [3.8]  d4 3.1 [3.7]   (0 seed-days over 8 %)
   Yard sale + van (racker) d1 4.8 [5.1]  d2 4.7 [4.7]  d3 4.4 [4.7]  d4 2.6 [4.1]   (0 seed-days over 8 %)
   E19 rung 3: an hour away / an hour played (earnings), median 0.46 over 10 sittings, min 0.40 max 0.67 (aim 0.3 to 0.8)
   E19 rung 4: an hour away / an hour played (earnings), median 0.46 over 20 sittings, min 0.16 max 1.85 (aim 0.3 to 0.8)

T6. A USEFUL PURCHASE EVERY SITTING; CASH AT A SITTING'S END AT MOST 2 TAU_r OF INCOME (tau_h by rung; income = G at that return)
   normal    sittings without a purchase: 9 of 40 (per seed 2 2 1 2 2)
   always    sittings without a purchase: 8 of 40 (per seed 2 1 1 2 2)
   flat      sittings without a purchase: 10 of 41 (per seed 2 1 3 2 2)
   noise     sittings without a purchase: 10 of 40 (per seed 2 2 2 2 2)
   behind    sittings without a purchase: 10 of 42 (per seed 1 2 1 3 3)
   manager   sittings without a purchase: 4 of 36 (per seed 1 1 2)
   steelMax  sittings without a purchase: 0 of 36 (per seed 0 0 0)
   slow      sittings without a purchase: 5 of 29 (per seed 1 2 2)
   leadCut   sittings without a purchase: 14 of 36 (per seed 5 4 5)
   brisk     sittings without a purchase: 4 of 24 (per seed 2 1 1)
   ads       sittings without a purchase: 5 of 25 (per seed 2 1 2)
   cutter    sittings without a purchase: 3 of 25 (per seed 1 1 1)
   packs     sittings without a purchase: 6 of 24 (per seed 2 3 1)
   racker    sittings without a purchase: 4 of 24 (per seed 2 1 1)
   holder    sittings without a purchase: 7 of 27 (per seed 2 2 3)
   old       sittings without a purchase: 0 of 30 (per seed 0 0 0 0 0)
   flat/s3: cash over 2 tau at s8 2.6 tau

T7. THE HAND'S WORTH (normal against the card manager, lifetime earnings at sittings 4 and 8: aim at least 1.2); PACKS (rung times against off, the buyer's lead); STEEL-MAX; THE LEAD CUT
   normal / manager at sitting 4: median 2.00, min 1.64 (3 seeds)
   normal / manager at sitting 8: median 2.10, min 1.82 (3 seeds)
   packs s1: 1 packs §390314; lead at rung 5 -0.0 h of the yard's clock (0 days)
   packs s2: 1 packs §391004; lead at rung 5 0.0 h of the yard's clock (0 days)
   packs s3: 1 packs §796273; lead at rung 5 -0.1 h of the yard's clock (0 days)
   steelMax s1: ends rung 3 at 3278 t, 6 materials, goal buyAnalyser, 12 sittings
   steelMax s2: ends rung 3 at 3282.6 t, 6 materials, goal buyAnalyser, 12 sittings
   steelMax s3: ends rung 3 at 3153.6 t, 6 materials, goal buyAnalyser, 12 sittings
   leadCut s1: ends rung 4 at 6452.7 t, 8 materials, goal supplyRung5, 12 sittings
   leadCut s2: ends rung 4 at 6336.8 t, 8 materials, goal supplyRung5, 12 sittings
   leadCut s3: ends rung 4 at 6320.2 t, 8 materials, goal supplyRung5, 12 sittings
   slow s1: ends rung 5 at 4145.3 t, 9 materials, goal widenTop, 10 sittings
   slow s2: ends rung 5 at 4071.2 t, 9 materials, goal widenTop, 10 sittings
   slow s3: ends rung 5 at 3747.8 t, 9 materials, goal widenTop, 9 sittings
   brisk s1: ends rung 5 at 3854.7 t, 9 materials, goal widenTop, 8 sittings
   brisk s2: ends rung 5 at 4098.9 t, 9 materials, goal widenTop, 8 sittings
   brisk s3: ends rung 5 at 4047.6 t, 9 materials, goal widenTop, 8 sittings

T8. THE PLATES' PAYBACK (2.6.4; aim 0.8 to 1.5 tau_r): at each plate's planned moment, price / dG in hours (G at usual prices with the plate bought, set down, started and a heat poured, against without), in tau of its rung; dI beside
   crane        n 5  price §3000  dG -7415 -10356 -7823 -7892 -8429  (of G 32686 36067 32972 33162 58609)  dI 0 0 0 0 0  payback never never never never never tau
   shear        n 5  price §3000  dG 0 0 0 0 0  (of G 32686 36067 32972 33162 36814)  dI 0 0 0 0 0  payback never never never never never tau
   analyser     n 5  price §29100  dG 2976 3105 3294 3079 3638  (of G 29720 32718 29782 30052 33141)  dI 0 0 0 0 0  payback 1.09 1.04 0.98 1.05 0.89 tau
   depollution  n 5  price §3000  dG 0 0 0 0 0  (of G 25271 25710 25149 25270 36814)  dI 0 0 0 0 0  payback never never never never never tau
   granulator   n 5  price §3000  dG 0 0 0 0 -4152  (of G 25271 25710 25149 25270 50181)  dI 0 0 0 0 140  payback never never never never never tau
   shredder     n 5  price §419000  dG 29376 25409 26696 29479 21964  (of G 58025 62979 60381 57654 67684)  dI 5675 5687 5621 5791 5772  payback 0.65 0.75 0.71 0.65 0.87 tau
   eddy         n 5  price §3000  dG 0 0 0 0 0  (of G 90124 91404 90009 90911 92929)  dI 0 0 0 0 0  payback never never never never never tau
   sorter       n 5  price §3000  dG 0 0 0 0 0  (of G 90124 91404 90009 90911 92929)  dI 0 0 0 0 0  payback never never never never never tau
   rotary       n 5  price §77600  dG 3127 3131 3109 3247 3281  (of G 86997 88273 86900 87664 89648)  dI 0 0 0 0 0  payback 1.13 1.13 1.13 1.09 1.08 tau
   induction    n 5  price §171000  dG 6573 7031 6433 5779 6817  (of G 96983 98867 97497 97629 94913)  dI 1239 1292 1292 1275 1187  payback 1.18 1.11 1.21 1.34 1.14 tau
   breaker      n 5  price §38100  dG 3060 3000 2632 2077 2158  (of G 90124 91404 90009 90911 92929)  dI 0 0 0 0 0  payback 0.57 0.58 0.66 0.83 0.80 tau
   smelter      n 5  price §27500  dG 1496 1496 1496 1496 2661  (of G 93184 94404 92641 92988 101730)  dI 0 0 0 0 0  payback 0.84 0.84 0.84 0.84 0.47 tau
   baler        n 3  price §3000  dG -793 -913 -527  (of G 33755 30600 33686)  dI 835 740 841  payback never never never tau

T9. A TICK AGAINST A JUMP (a minute of 0.1 s ticks against one jump, at sittings 1 to 5, 8 and 12 of the normal bot): 5 runs, 30 checks, 0 differ

9. THE PURCHASE WALK (RULING2.md 17.1; 5 seeds): every purchase, hire and level one step up by hand; the change in G (a capped absence at usual prices, stock counted); gate: mean not below -1 %, no seed below -4 %
 day3 (5 states; rungs 4; median G §97540 an hour): noise mean -0.35 %, mean |noise| +0.98 %, worst -2.04 %
   buy induction              n  5  mean   +4.26 %  worst   +2.74 % (s2)
   buy smelter                n  1  mean   +2.06 %  worst   +2.06 % (s3)
   level bench                n  5  mean   -0.27 %  worst   -1.29 % (s2)
   level crucible             n  5  mean   -0.86 %  worst   -1.63 % (s1)
   level cutter               n  5  mean   +0.38 %  worst   -0.67 % (s1)
   level driver               n  2  mean   -0.86 %  worst   -1.33 % (s1)
   level hand                 n  2  mean   +0.22 %  worst   +0.18 % (s5)
   level partner.garage       n  5  mean   +2.90 %  worst   +1.53 % (s3)
   level partner.plumbing     n  5  mean  +12.97 %  worst  +12.54 % (s3)
   level partnerDemolition    n  5  mean   -4.84 %  worst   -7.60 % (s2)  FAILS
   level partnerFarm          n  5  mean   +2.02 %  worst   +1.61 % (s3)
   level plate baler          n  5  mean   +0.00 %  worst   +0.00 % (s1)
   level plate breaker        n  1  mean   -0.40 %  worst   -0.40 % (s3)
   level plate crane          n  5  mean   -0.37 %  worst   -0.95 % (s2)
   level plate depollution    n  5  mean   +0.00 %  worst   +0.00 % (s1)
   level plate granulator     n  5  mean   +0.41 %  worst   -0.66 % (s3)
   level plate rotary         n  1  mean   +0.45 %  worst   +0.45 % (s3)
   level plate shear          n  5  mean   +0.19 %  worst   -0.34 % (s1)
   level plate smelter        n  4  mean   +0.04 %  worst   +0.02 % (s1)
   level plate sorter         n  4  mean   +0.00 %  worst   +0.00 % (s1)
   level stripper             n  5  mean   -0.38 %  worst   -1.60 % (s2)
 r3s1 (5 states; rungs 3; median G §30748 an hour): noise mean -0.70 %, mean |noise| +0.87 %, worst -3.93 %
   buy analyser               n  5  mean  +11.09 %  worst   +8.97 % (s1)
   buy baler                  n  3  mean   -2.63 %  worst   -3.00 % (s3)  FAILS
   buy crane                  n  5  mean   -5.61 %  worst  -16.17 % (s1)  FAILS
   buy depollution            n  5  mean   +0.00 %  worst   +0.00 % (s1)
   buy forklift               n  5  mean   +0.00 %  worst   +0.00 % (s1)
   buy granulator             n  5  mean   +0.00 %  worst   +0.00 % (s1)
   buy night                  n  5  mean   +0.00 %  worst   +0.00 % (s1)
   buy pallet                 n  5  mean   +0.00 %  worst   +0.00 % (s1)
   buy plasma                 n  5  mean  +18.14 %  worst   +0.13 % (s1)
   buy shear                  n  5  mean   +0.00 %  worst   +0.00 % (s1)
   buy truckBridge            n  5  mean  +56.17 %  worst  +50.28 % (s4)
   hire cutter                n  5  mean  +19.76 %  worst   +3.41 % (s1)
   level bench                n  5  mean   +0.12 %  worst   -0.40 % (s2)
   level crucible             n  5  mean   +0.57 %  worst   +0.04 % (s2)
   level cutter               n  5  mean   +7.71 %  worst   +4.78 % (s3)
   level driver               n  5  mean   -0.97 %  worst   -4.52 % (s3)  FAILS
   level hand                 n  5  mean   +0.85 %  worst   -0.31 % (s2)
   level partnerDemolition    n  5  mean   -0.02 %  worst   -0.10 % (s1)
   level partnerFarm          n  5  mean   -1.39 %  worst   -2.86 % (s3)  FAILS
   level plate baler          n  2  mean   +0.93 %  worst   +0.65 % (s5)
   level stripper             n  5  mean   -0.46 %  worst   -2.12 % (s3)
 r4entry (5 states; rungs 4; median G §60041 an hour): noise mean -0.03 %, mean |noise| +0.17 %, worst -0.50 %
   buy breaker                n  5  mean   +1.87 %  worst   +0.64 % (s5)
   buy eddy                   n  5  mean   -0.00 %  worst   -0.00 % (s1)
   buy induction              n  5  mean  +10.73 %  worst   +9.74 % (s3)
   buy rotary                 n  5  mean   +2.55 %  worst   +2.04 % (s1)
   buy shredder               n  5  mean  +40.79 %  worst  +29.03 % (s3)
   buy smelter                n  5  mean   -0.00 %  worst   -0.00 % (s1)
   buy sorter                 n  5  mean   -0.00 %  worst   -0.00 % (s1)
   level bench                n  5  mean   -0.17 %  worst   -1.17 % (s1)
   level crucible             n  5  mean   -0.32 %  worst   -1.30 % (s1)
   level cutter               n  5  mean   +0.20 %  worst   -1.03 % (s1)
   level driver               n  5  mean   -0.05 %  worst   -1.19 % (s5)
   level hand                 n  5  mean   +0.26 %  worst   -0.30 % (s1)
   level partner.garage       n  5  mean   +2.96 %  worst   -0.96 % (s3)
   level partner.plumbing     n  5  mean  +22.99 %  worst  +19.97 % (s3)
   level partnerDemolition    n  5  mean   -0.25 %  worst   -1.05 % (s3)
   level partnerFarm          n  5  mean   -0.93 %  worst   -1.97 % (s1)
   level plate baler          n  5  mean   +2.80 %  worst   +0.58 % (s3)
   level plate crane          n  5  mean   -0.64 %  worst   -1.12 % (s4)
   level plate depollution    n  5  mean   -0.00 %  worst   -0.00 % (s1)
   level plate granulator     n  5  mean   +0.28 %  worst   -0.11 % (s3)
   level plate shear          n  5  mean   -0.18 %  worst   -0.76 % (s3)
   level stripper             n  5  mean   -0.36 %  worst   -0.95 % (s1)
 GATE (17.1): 5 of 64 steps FAIL

THE PER-RUN LINES (report2 sections 0, 1 and 3 of the same runs)
------------------------------------------------------------------------------------------------------------------------
0. HARD PROMISES (8.3) on 60 runs: none broken
   presses refused (and the bot's own notes, commission/commissionSide): {"commissionSide":54,"commission":1,"earmark":27,"cash":4,"nothing":10}
   behind/s4   5.1h shear: standing at {"x":32,"y":31} {"x":32,"y":31} {"x":32,"y":31} {"x":32,"y":31} {"x":32,"y":31} did not start it

1. RUNGS (hours of the yard's clock: rung 3 / 4 / 5; aims rung 4 day 2 to 3 = 48-72 h, rung 5 day 4 to 6 = 96-144 h), where a run stopped, CPU
   normal    s 1  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3827.3 t 9 materials, cash §2951588, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 360 s
   normal    s 4  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3951.8 t 9 materials, cash §2439567, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 344 s
   normal    s 2  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3829.6 t 9 materials, cash §2877646, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 302 s
   normal    s 5  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3783.8 t 9 materials, cash §5684204, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 499 s
   normal    s 3  r3   3.0h r4  19.8h r5  52.8h  8 sittings, 1 without a purchase (longest run 1); end 3631.4 t 9 materials, cash §3760788, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 292 s
   always    s 1  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3790.4 t 9 materials, cash §6055988, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 255 s
   always    s 2  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 1 without a purchase (longest run 1); end 3831.4 t 9 materials, cash §6775420, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 230 s
   always    s 3  r3   3.0h r4  19.8h r5  52.8h  8 sittings, 1 without a purchase (longest run 1); end 3631.4 t 9 materials, cash §3760788, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 128 s
   always    s 4  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3953.4 t 9 materials, cash §3175787, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 108 s
   always    s 5  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3733.4 t 9 materials, cash §7743453, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 322 s
   flat      s 1  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 4013.6 t 9 materials, cash §3009451, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 163 s
   flat      s 3  r3   3.0h r4  26.0h r5  59.1h  9 sittings, 3 without a purchase (longest run 3); end 3741.9 t 9 materials, cash §11912301, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 9  cpu 655 s
   flat      s 5  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3862.8 t 9 materials, cash §3752844, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 237 s
   flat      s 2  r3   0.9h r4  23.8h r5  56.8h  8 sittings, 1 without a purchase (longest run 1); end 3931.8 t 9 materials, cash §2988449, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 203 s
   flat      s 4  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3957.9 t 9 materials, cash §5718923, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 255 s
   noise     s 1  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3837.9 t 9 materials, cash §2528798, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 121 s
   noise     s 3  r3   3.0h r4  19.8h r5  52.8h  8 sittings, 2 without a purchase (longest run 2); end 3896 t 9 materials, cash §2834061, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 108 s
   noise     s 5  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3858.6 t 9 materials, cash §5090800, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 274 s
   noise     s 2  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3895.4 t 9 materials, cash §3814040, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 200 s
   noise     s 4  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 4022.2 t 9 materials, cash §3732573, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 180 s
   behind    s 2  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3768.2 t 9 materials, cash §5549637, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 269 s
   behind    s 4  r3   1.0h r4  23.8h r5  65.0h  9 sittings, 3 without a purchase (longest run 3); end 3835.9 t 9 materials, cash §3270745, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 316 s
   behind    s 1  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 1 without a purchase (longest run 1); end 3902.4 t 9 materials, cash §2104863, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 165 s
   behind    s 3  r3   3.0h r4  19.8h r5  52.8h  8 sittings, 1 without a purchase (longest run 1); end 3709.6 t 9 materials, cash §5903635, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 310 s
   behind    s 5  r3   1.0h r4  23.8h r5  65.1h  9 sittings, 3 without a purchase (longest run 3); end 3936.5 t 9 materials, cash §9150615, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 370 s
   manager   s 1  r3   3.0h r4  34.8h r5    -    12 sittings, 1 without a purchase (longest run 1); end 3479.8 t 9 materials, cash §1544549, goal signDeal; rung 4 at sitting 8 (day 4.0), rung 5 at sitting -  cpu 91 s
   manager   s 2  r3   3.0h r4  30.5h r5  71.8h  12 sittings, 1 without a purchase (longest run 1); end 4012.6 t 9 materials, cash §2378573, goal signDeal; rung 4 at sitting 7 (day 3.5), rung 5 at sitting 12  cpu 78 s
   manager   s 3  r3   3.0h r4  30.5h r5  71.8h  12 sittings, 2 without a purchase (longest run 2); end 4118.6 t 9 materials, cash §2804009, goal signDeal; rung 4 at sitting 7 (day 3.5), rung 5 at sitting 12  cpu 94 s
   steelMax  s 1  r3   1.0h r4    -   r5    -    12 sittings, 0 without a purchase (longest run 0); end 3278 t 6 materials, cash §18237, goal buyAnalyser; rung 4 at sitting - (day NaN), rung 5 at sitting -  cpu 102 s
   steelMax  s 2  r3   1.0h r4    -   r5    -    12 sittings, 0 without a purchase (longest run 0); end 3282.6 t 6 materials, cash §18470, goal buyAnalyser; rung 4 at sitting - (day NaN), rung 5 at sitting -  cpu 94 s
   steelMax  s 3  r3   3.0h r4    -   r5    -    12 sittings, 0 without a purchase (longest run 0); end 3153.6 t 6 materials, cash §27959, goal buyAnalyser; rung 4 at sitting - (day NaN), rung 5 at sitting -  cpu 101 s
   slow      s 1  r3   3.0h r4  22.0h r5  63.4h  10 sittings, 1 without a purchase (longest run 1); end 4145.3 t 9 materials, cash §10843737, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 402 s
   slow      s 2  r3   3.0h r4  22.0h r5  63.3h  10 sittings, 2 without a purchase (longest run 1); end 4071.2 t 9 materials, cash §8425918, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 10  cpu 281 s
   slow      s 3  r3   3.0h r4  22.0h r5  55.0h  9 sittings, 2 without a purchase (longest run 2); end 3747.8 t 9 materials, cash §4224131, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 9  cpu 230 s
   leadCut   s 1  r3   1.0h r4  23.8h r5    -    12 sittings, 5 without a purchase (longest run 4); end 6452.7 t 8 materials, cash §6067325, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 176 s
   leadCut   s 2  r3   1.0h r4  23.8h r5    -    12 sittings, 4 without a purchase (longest run 4); end 6336.8 t 8 materials, cash §13931430, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 422 s
   leadCut   s 3  r3   3.0h r4  19.8h r5    -    12 sittings, 5 without a purchase (longest run 5); end 6320.2 t 8 materials, cash §5733417, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 174 s
   brisk     s 1  r3   0.9h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3854.7 t 9 materials, cash §7558842, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 658 s
   brisk     s 2  r3   0.9h r4  23.8h r5  56.8h  8 sittings, 1 without a purchase (longest run 1); end 4098.9 t 9 materials, cash §6434137, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 491 s
   brisk     s 3  r3   0.9h r4  23.8h r5  56.8h  8 sittings, 1 without a purchase (longest run 1); end 4047.6 t 9 materials, cash §2496393, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 216 s
   ads       s 1  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3817.4 t 9 materials, cash §4851980, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 330 s
   ads       s 2  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 1 without a purchase (longest run 1); end 3844.6 t 9 materials, cash §2424511, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 236 s
   ads       s 3  r3   3.0h r4  26.0h r5  59.0h  9 sittings, 2 without a purchase (longest run 2); end 4158.2 t 9 materials, cash §3282203, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 9  cpu 214 s
   cutter    s 1  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 1 without a purchase (longest run 1); end 3873.2 t 9 materials, cash §4200981, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 300 s
   cutter    s 2  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 1 without a purchase (longest run 1); end 3865.4 t 9 materials, cash §2314326, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 196 s
   cutter    s 3  r3   3.0h r4  26.0h r5  59.0h  9 sittings, 1 without a purchase (longest run 1); end 4086 t 9 materials, cash §2998557, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 9  cpu 140 s
   packs     s 1  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 1); end 3783.9 t 9 materials, cash §8291964, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 493 s
   packs     s 2  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 3 without a purchase (longest run 3); end 3868 t 9 materials, cash §3376967, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 201 s
   packs     s 3  r3   3.0h r4  19.8h r5  52.8h  8 sittings, 1 without a purchase (longest run 1); end 3745.6 t 9 materials, cash §8598346, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 461 s
   racker    s 1  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3954.9 t 9 materials, cash §2993524, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 166 s
   racker    s 2  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 1 without a purchase (longest run 1); end 3960.1 t 9 materials, cash §5709924, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 431 s
   racker    s 3  r3   3.0h r4  19.8h r5  52.8h  8 sittings, 1 without a purchase (longest run 1); end 3875.3 t 9 materials, cash §4305344, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 321 s
   holder    s 1  r3   1.0h r4  23.9h r5  65.0h  9 sittings, 2 without a purchase (longest run 2); end 4237.2 t 9 materials, cash §2968819, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 9  cpu 191 s
   holder    s 2  r3   1.0h r4  30.0h r5  63.0h  9 sittings, 2 without a purchase (longest run 1); end 3790.8 t 9 materials, cash §1869924, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 9  cpu 210 s
   holder    s 3  r3   3.0h r4  26.0h r5  59.0h  9 sittings, 3 without a purchase (longest run 2); end 3790.1 t 9 materials, cash §2056723, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 9  cpu 227 s
   old       s 1  r3   1.0h r4  23.8h r5    -    6 sittings, 0 without a purchase (longest run 0); end 2123.2 t 9 materials, cash §471406, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 135 s
   old       s 2  r3   3.0h r4  26.0h r5    -    6 sittings, 0 without a purchase (longest run 0); end 1724.5 t 8 materials, cash §34111, goal pourRotary; rung 4 at sitting 5 (day 2.5), rung 5 at sitting -  cpu 98 s
   old       s 3  r3   1.0h r4  23.8h r5    -    6 sittings, 0 without a purchase (longest run 0); end 2320.5 t 9 materials, cash §511693, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 130 s
   old       s 4  r3   1.0h r4  23.8h r5    -    6 sittings, 0 without a purchase (longest run 0); end 2128.3 t 9 materials, cash §767954, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 117 s
   old       s 5  r3   1.0h r4  23.8h r5    -    6 sittings, 0 without a purchase (longest run 0); end 2093.3 t 9 materials, cash §389012, goal supplyRung5; rung 4 at sitting 4 (day 2.0), rung 5 at sitting -  cpu 105 s

3. THE MONEY'S HABITS AND THE WORKS' OWN LEGS
   normal    s 1: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 22, gate sales seen live 22 (§3663), rackSold count 636; lots 34; crate 118; first pours seen live -, heats poured smelter 33, rotary 14, induction 40; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   normal    s 4: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 23, gate sales seen live 22 (§4787), rackSold count 642; lots 10; crate 152; first pours seen live -, heats poured rotary 14, smelter 34, induction 41; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   normal    s 2: letter  23.8h (sitting 4); offers 1: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 17, gate sales seen live 23 (§3748), rackSold count 645; lots 33; crate 135; first pours seen live -, heats poured rotary 14, smelter 34, induction 40; started up baler,analyser,shear,crane,depollution,granulator,rotary,eddy,sorter,breaker,smelter,induction; put aside rackBath,cutLot,walkBackfield
   normal    s 5: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 20, gate sales seen live 23 (§3725), rackSold count 581; lots 240; crate 151; first pours seen live -, heats poured smelter 29, rotary 14, induction 28; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   normal    s 3: racked 23, gate sales seen live 22 (§3828), rackSold count 559; lots 95; crate 170; first pours seen live -, heats poured rotary 14, smelter 16, induction 32; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,induction,smelter; put aside cutLot,walkBackfield
   always    s 1: letter  23.8h (sitting 4); offers 1: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); loans shredder P419000 F156125.68 at  23.8h; repaid shredder at  32.0h (NOT before rung 4); racked 17, gate sales seen live 20 (§3608), rackSold count 575; lots 244; crate 111; first pours seen live -, heats poured rotary 22, induction 49, smelter 29; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,induction,breaker,smelter; put aside cutLot,walkBackfield
   always    s 2: letter  23.8h (sitting 4); offers 1: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); loans shredder P419000 F156401.66 at  23.8h; repaid shredder at  32.0h (NOT before rung 4); racked 18, gate sales seen live 24 (§3909), rackSold count 581; lots 255; crate 172; first pours seen live -, heats poured rotary 26, induction 47, smelter 27; started up baler,analyser,shear,crane,depollution,granulator,shredder,sorter,rotary,eddy,induction,breaker,smelter; put aside rackBath,cutLot,walkBackfield
   always    s 3: racked 23, gate sales seen live 22 (§3828), rackSold count 559; lots 95; crate 170; first pours seen live -, heats poured rotary 14, smelter 16, induction 32; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,induction,smelter; put aside cutLot,walkBackfield
   always    s 4: letter  23.8h (sitting 4); offers 1: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); loans shredder P419000 F157271.36 at  23.8h; repaid shredder at  32.0h (NOT before rung 4); racked 25, gate sales seen live 24 (§4256), rackSold count 639; lots 36; crate 121; first pours seen live -, heats poured rotary 19, induction 60, smelter 34; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,induction,breaker,smelter; put aside cutLot,walkBackfield
   always    s 5: letter  23.8h (sitting 4); offers 1: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); loans shredder P419000 F155609.16 at  23.8h; repaid shredder at  32.0h (NOT before rung 4); racked 17, gate sales seen live 25 (§4046), rackSold count 529; lots 324; crate 101; first pours seen live -, heats poured rotary 23, induction 38, smelter 24; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,induction,breaker,smelter,sorter; put aside cutLot,walkBackfield
   flat      s 1: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 25, gate sales seen live 22 (§3868), rackSold count 619; lots 29; crate 71; first pours seen live -, heats poured induction 60, smelter 33, rotary 14; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   noise     s 1: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 23, gate sales seen live 23 (§3822), rackSold count 658; lots 15; crate 117; first pours seen live -, heats poured rotary 14, smelter 34, induction 41; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   behind    s 2: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 20, gate sales seen live 24 (§3907), rackSold count 607; lots 231; crate 141; first pours seen live -, heats poured smelter 30, rotary 15, induction 35; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside rackBath,cutLot,walkBackfield
   flat      s 3: racked 26, gate sales seen live 40 (§6614), rackSold count 691; lots 322; crate 204; first pours seen live -, heats poured rotary 38, smelter 28, induction 15; started up baler,analyser,shear,depollution,crane,granulator,shredder,sorter,rotary,eddy,breaker,smelter,induction; put aside cutLot,walkBackfield
   noise     s 3: letter  19.8h (sitting 4); offers 1: first rotary §77600 at  19.8h (sitting 4, 16.8 h after rung 3); racked 29, gate sales seen live 22 (§3636), rackSold count 584; lots 30; crate 116; first pours seen live -, heats poured smelter 34, rotary 13, induction 42; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   behind    s 4: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 24, gate sales seen live 31 (§5105), rackSold count 763; lots 39; crate 124; first pours seen live -, heats poured rotary 17, smelter 42, induction 56; started up baler,analyser,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   flat      s 5: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 20, gate sales seen live 24 (§3909), rackSold count 640; lots 123; crate 156; first pours seen live -, heats poured smelter 33, rotary 14, induction 41; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   noise     s 5: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 21, gate sales seen live 21 (§3665), rackSold count 605; lots 212; crate 101; first pours seen live -, heats poured smelter 31, rotary 14, induction 33; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   behind    s 1: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 27, gate sales seen live 24 (§3985), rackSold count 659; lots 4; crate 66; first pours seen live -, heats poured rotary 19, induction 71, smelter 34; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,induction,breaker,smelter,eddy,sorter; put aside cutLot,walkBackfield
   flat      s 2: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 26, gate sales seen live 24 (§4007), rackSold count 640; lots 54; crate 244; first pours seen live -, heats poured rotary 15, smelter 34, induction 42; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   noise     s 2: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 20, gate sales seen live 23 (§4297), rackSold count 631; lots 141; crate 145; first pours seen live -, heats poured smelter 32, rotary 13, induction 37; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside rackBath,cutLot,walkBackfield
   behind    s 3: letter  19.8h (sitting 4); offers 2: first shredder §419000 at  19.8h (sitting 4, 16.8 h after rung 3); racked 21, gate sales seen live 22 (§3637), rackSold count 534; lots 191; crate 184; first pours seen live -, heats poured rotary 25, induction 49, smelter 21; started up baler,analyser,shear,depollution,crane,granulator,shredder,induction,breaker,smelter,eddy,sorter; put aside cutLot,walkBackfield
   flat      s 4: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 19, gate sales seen live 24 (§3909), rackSold count 610; lots 150; crate 159; first pours seen live -, heats poured rotary 16, smelter 30, induction 31; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   noise     s 4: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 21, gate sales seen live 26 (§4575), rackSold count 618; lots 65; crate 147; first pours seen live -, heats poured induction 56, smelter 33, rotary 14; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   behind    s 5: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 18, gate sales seen live 29 (§4686), rackSold count 612; lots 313; crate 169; first pours seen live -, heats poured rotary 21, smelter 32, induction 29; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   manager   s 1: racked 21, gate sales seen live 27 (§4368), rackSold count 599; lots 0; crate 0; first pours seen live -, heats poured smelter 36, induction 63, rotary 16; started up -; put aside -
   steelMax  s 1: racked 24, gate sales seen live 23 (§3812), rackSold count 319; lots 0; crate 282; first pours seen live -, heats poured -; started up baler,crane,shear; put aside -
   manager   s 2: racked 22, gate sales seen live 26 (§4795), rackSold count 672; lots 0; crate 0; first pours seen live -, heats poured smelter 45, induction 82, rotary 20; started up -; put aside -
   steelMax  s 2: racked 22, gate sales seen live 21 (§3973), rackSold count 329; lots 0; crate 194; first pours seen live -, heats poured -; started up baler,crane,shear; put aside rackBath
   manager   s 3: racked 30, gate sales seen live 32 (§5710), rackSold count 760; lots 0; crate 0; first pours seen live -, heats poured smelter 45, induction 78, rotary 32; started up -; put aside -
   steelMax  s 3: racked 28, gate sales seen live 21 (§3668), rackSold count 301; lots 0; crate 305; first pours seen live -, heats poured -; started up baler,crane,shear; put aside -
   slow      s 1: racked 32, gate sales seen live 33 (§5349), rackSold count 751; lots 292; crate 158; first pours seen live -, heats poured rotary 46, induction 39, smelter 32; started up baler,analyser,shear,depollution,crane,granulator,shredder,sorter,rotary,eddy,induction,breaker,smelter; put aside rackBath,cutLot,walkBackfield
   leadCut   s 1: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 37, gate sales seen live 36 (§5916), rackSold count 1104; lots 26; crate 433; first pours seen live -, heats poured rotary 46, induction 124; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,induction; put aside cutLot,walkBackfield
   slow      s 2: letter  22.0h (sitting 5); offers 2: first shredder §419000 at  22.0h (sitting 5, 19.0 h after rung 3); racked 27, gate sales seen live 27 (§4679), rackSold count 566; lots 338; crate 202; first pours seen live -, heats poured induction 74, smelter 36, rotary 21; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter; put aside rackBath,cutLot,sortCrate,walkBackfield
   leadCut   s 2: letter  23.8h (sitting 4); offers 1: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 25, gate sales seen live 39 (§6348), rackSold count 925; lots 441; crate 272; first pours seen live -, heats poured rotary 47, induction 86; started up baler,analyser,shear,crane,depollution,granulator,rotary,eddy,sorter,induction; put aside rackBath,cutLot,walkBackfield
   slow      s 3: letter  22.0h (sitting 5); offers 2: first shredder §419000 at  22.0h (sitting 5, 19.0 h after rung 3); racked 22, gate sales seen live 24 (§4436), rackSold count 551; lots 160; crate 132; first pours seen live -, heats poured smelter 31, rotary 13, induction 34; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside rackBath,cutLot,sortCrate,walkBackfield
   leadCut   s 3: racked 40, gate sales seen live 35 (§5916), rackSold count 1055; lots 26; crate 415; first pours seen live -, heats poured rotary 44, induction 128; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,induction; put aside cutLot,walkBackfield
   brisk     s 1: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 22, gate sales seen live 26 (§4857), rackSold count 529; lots 308; crate 252; first pours seen live -, heats poured rotary 29, induction 42, smelter 25; started up baler,analyser,shear,crane,depollution,granulator,shredder,induction,breaker,smelter,eddy,sorter; put aside cutLot,walkBackfield
   ads       s 1: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); ads 7 (§88175); racked 19, gate sales seen live 23 (§3822), rackSold count 590; lots 113; crate 136; first pours seen live -, heats poured rotary 16, smelter 31, induction 30; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   cutter    s 1: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 21, gate sales seen live 23 (§4010), rackSold count 600; lots 95; crate 143; first pours seen live -, heats poured rotary 17, smelter 32, induction 33; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside rackBath,cutLot,walkBackfield
   brisk     s 2: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 21, gate sales seen live 23 (§4124), rackSold count 569; lots 231; crate 222; first pours seen live -, heats poured induction 51, smelter 28, rotary 16; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   ads       s 2: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); ads 5 (§88002); racked 20, gate sales seen live 23 (§3748), rackSold count 654; lots 15; crate 241; first pours seen live -, heats poured rotary 15, smelter 34, induction 40; started up baler,crane,analyser,shear,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside rackBath,cutLot,walkBackfield
   cutter    s 2: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 23, gate sales seen live 24 (§4182), rackSold count 633; lots 15; crate 298; first pours seen live -, heats poured rotary 15, smelter 34, induction 41; started up baler,analyser,shear,depollution,crane,granulator,rotary,eddy,sorter,breaker,smelter,induction; put aside rackBath,cutLot,walkBackfield
   brisk     s 3: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 30, gate sales seen live 24 (§4504), rackSold count 614; lots 15; crate 331; first pours seen live -, heats poured rotary 15, smelter 34, induction 42; started up baler,analyser,shear,depollution,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   ads       s 3: letter  26.0h (sitting 5); offers 2: first shredder §419000 at  26.0h (sitting 5, 23.0 h after rung 3); ads 6 (§84279); racked 29, gate sales seen live 26 (§4465), rackSold count 679; lots 40; crate 200; first pours seen live -, heats poured induction 60, smelter 33, rotary 14; started up baler,crane,analyser,shear,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   cutter    s 3: letter  26.0h (sitting 5); offers 2: first shredder §419000 at  26.0h (sitting 5, 23.0 h after rung 3); racked 29, gate sales seen live 28 (§4782), rackSold count 682; lots 37; crate 318; first pours seen live -, heats poured induction 65, rotary 14, smelter 34; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside rackBath,cutLot,walkBackfield
   packs     s 1: packs 1 (§390314): yard_pack5; racked 15, gate sales seen live 23 (§3826), rackSold count 534; lots 332; crate 119; first pours seen live -, heats poured smelter 34, rotary 20, induction 37; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   racker    s 1: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 22, gate sales seen live 22 (§3663), rackSold count 620; lots 34; crate 138; first pours seen live -, heats poured rotary 14, smelter 34, induction 42; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   holder    s 1: letter  32.0h (sitting 5); offers 1: first rotary §77600 at  32.0h (sitting 5, 31.1 h after rung 3); racked 26, gate sales seen live 24 (§4272), rackSold count 726; lots 18; crate 352; first pours seen live -, heats poured rotary 23, induction 61, smelter 34; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,induction,breaker,smelter; put aside cutLot,walkBackfield
   packs     s 2: packs 1 (§391004): yard_pack5; racked 23, gate sales seen live 24 (§3914), rackSold count 652; lots 32; crate 105; first pours seen live -, heats poured rotary 18, smelter 43, induction 60; started up baler,analyser,shear,crane,depollution,granulator,shredder,sorter,rotary,eddy,breaker,smelter,induction; put aside rackBath,cutLot,walkBackfield
   racker    s 2: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 14, gate sales seen live 25 (§4070), rackSold count 599; lots 242; crate 149; first pours seen live -, heats poured smelter 30, rotary 15, induction 27; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside rackBath,cutLot,walkBackfield
   holder    s 2: letter  30.0h (sitting 5); offers 1: first shredder §419000 at  30.0h (sitting 5, 29.0 h after rung 3); racked 22, gate sales seen live 20 (§4071), rackSold count 690; lots 17; crate 366; first pours seen live -, heats poured rotary 15, smelter 33, induction 41; started up baler,analyser,shear,crane,depollution,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside rackBath,cutLot,walkBackfield
   packs     s 3: packs 1 (§796273): yard_pack10; racked 18, gate sales seen live 23 (§3992), rackSold count 485; lots 281; crate 162; first pours seen live -, heats poured smelter 34, rotary 21, induction 38; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   racker    s 3: racked 22, gate sales seen live 22 (§3825), rackSold count 548; lots 159; crate 185; first pours seen live -, heats poured smelter 31, rotary 14, induction 36; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   holder    s 3: racked 28, gate sales seen live 26 (§4465), rackSold count 655; lots 12; crate 209; first pours seen live -, heats poured rotary 15, induction 42, smelter 19; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,induction,smelter; put aside cutLot,walkBackfield
   old       s 1: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 16, gate sales seen live 12 (§2203), rackSold count 342; lots 38; crate 152; first pours seen live -, heats poured rotary 4, smelter 14; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   old       s 2: letter  26.0h (sitting 5); offers 2: first shredder §419000 at  26.0h (sitting 5, 23.0 h after rung 3); racked 19, gate sales seen live 15 (§2456), rackSold count 282; lots 8; crate 133; first pours seen live -, heats poured -; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter; put aside rackBath,cutLot,walkBackfield
   old       s 3: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 12, gate sales seen live 13 (§2086), rackSold count 365; lots 9; crate 135; first pours seen live -, heats poured rotary 4, smelter 14; started up baler,analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   old       s 4: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 19, gate sales seen live 16 (§2689), rackSold count 343; lots 68; crate 147; first pours seen live -, heats poured rotary 4, smelter 14; started up analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield
   old       s 5: letter  23.8h (sitting 4); offers 2: first shredder §419000 at  23.8h (sitting 4, 22.8 h after rung 3); racked 12, gate sales seen live 13 (§2208), rackSold count 337; lots 41; crate 178; first pours seen live -, heats poured smelter 14, rotary 3; started up analyser,shear,depollution,crane,granulator,shredder,rotary,eddy,sorter,breaker,smelter,induction; put aside cutLot,walkBackfield

run time: 14979 s of CPU over 60 runs (first parts played in this call: 27)


UNSEEN SEEDS 101 TO 105 (normal hand, round 3)
------------------------------------------------------------------------------------------------------------------------
0. HARD PROMISES (8.3) on 5 runs: none broken
   presses refused (and the bot's own notes, commission/commissionSide): {"commissionSide":5,"commission":1}
   normal/s101   3.1h shear: standing at {"x":32,"y":31} {"x":32,"y":31} {"x":32,"y":31} {"x":32,"y":31} {"x":32,"y":31} did not start it

1. RUNGS (hours of the yard's clock: rung 3 / 4 / 5; aims rung 4 day 2 to 3 = 48-72 h, rung 5 day 4 to 6 = 96-144 h), where a run stopped, CPU
   normal    s101  r3   3.0h r4  26.0h r5  59.0h  9 sittings, 3 without a purchase (longest run 3); end 3949 t 9 materials, cash §6383624, goal widenTop; rung 4 at sitting 5 (day 2.5), rung 5 at sitting 9  cpu 186 s
   normal    s102  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 1 without a purchase (longest run 1); end 4054.9 t 9 materials, cash §5761830, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 261 s
   normal    s103  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 3 without a purchase (longest run 2); end 3658.3 t 9 materials, cash §4592943, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 184 s
   normal    s104  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 2 without a purchase (longest run 2); end 3927.6 t 9 materials, cash §3491227, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 192 s
   normal    s105  r3   1.0h r4  23.8h r5  56.8h  8 sittings, 1 without a purchase (longest run 1); end 4013.3 t 9 materials, cash §2489805, goal widenTop; rung 4 at sitting 4 (day 2.0), rung 5 at sitting 8  cpu 153 s

T1. RUNG 4 AT DAY 2 TO 3 (sittings 4 to 6), RUNG 5 AT DAY 4 TO 6 (sittings 8 to 12): per bot, the sitting of each per seed and the count in band
   normal    n  5  rung 4 at 5 4 4 4 4  (5/5 in band, median day 2.00)   rung 5 at 9 8 8 8 8  (5/5 in band)

T5. SHARES OF A DAY'S EARNINGS (lifetime earnings over two sittings): ad rewards (aim at most 4 %, ads bot); the Yard sale and the van (2 to 5 %, never over 8 %, normal bot): per day 1..7, median over seeds [max]
   Yard sale + van (normal) d1 5.2 [5.5]  d2 4.7 [4.9]  d3 4.5 [4.7]  d4 2.6 [4.3]   (0 seed-days over 8 %)
     of it the van        d1 4.3 [4.8]  d2 3.8 [4.1]  d3 3.8 [3.9]  d4 2.2 [3.6]   (0 seed-days over 8 %)
   E19 rung 3: an hour away / an hour played (earnings), median 0.45 over 11 sittings, min 0.42 max 0.61 (aim 0.3 to 0.8)
   E19 rung 4: an hour away / an hour played (earnings), median 0.49 over 20 sittings, min 0.14 max 1.05 (aim 0.3 to 0.8)

T6. A USEFUL PURCHASE EVERY SITTING; CASH AT A SITTING'S END AT MOST 2 TAU_r OF INCOME (tau_h by rung; income = G at that return)
   normal    sittings without a purchase: 10 of 41 (per seed 3 1 3 2 1)


THE BENCH (bench2.ts, seed 1, load printed)
------------------------------------------------------------------------------------------------------------------------
first yard (awaybench.test.ts, minute 60, seed 257): six hours away 232.6 ms node CPU
r3 sitting 1 return: rung 3, plates 1, crew 4; six hours away (ran 4.0 h): median 813 ms (791, 813, 2475); load 6.70 6.99 6.93
r4 first return (sitting 4): rung 4, plates 6, crew 5; six hours away (ran 6.0 h): median 1799 ms (1629, 1799, 1837); load 7.02 7.01 6.94
```
