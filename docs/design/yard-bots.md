# Scrapyard: the bots' measurement of the first yard on the new engine (REPORT7, 26 November)

This is the balance bot's report on the first yard's content as it runs on the engine step that opens stage 2
(the run as the rule from rung 3, the merchant's round never lengthened, the checks following the state, rated
income I from assets, Hold that never stops the yard; `RULING2.md` sections 12 to 14 of the build's notes, E40 to
E43 in `yard-decisions.md`): 15 seeds on two opening routes and five seeds never used before (401 to 405), on the
real rules and the real content, which this step did not change. It replaces REPORT6 (25 November), whose figures
it compares against. The commands at its head reproduce it. Paths that begin "scratchpad" or name the build's
notes (`notes/`, `fixA/`, `bots7/`) are working notes, not in the repository.

```text
REPORT7: THE BOTS MEASURE THE FIRST YARD ON THE NEW ENGINE (engine2-measure, 26 November, 06:05-07:20)
=====================================================================================================
Program: src/engine/salvage/bot.ts (unchanged), scripts/content/yard-bot.ts (REPORT7's additions: hour runs to
minute 90, windows to 90, I at rung 2's entry and on the normal board at all five moments, Hold at day 1 and day 3
with the stock counted, --daysSeeds, --cache), scratchpad yard/bots7/g2days7.mts (part G: ahead / trip by trip /
no runs / noise). Content: src/config/salvage.content.ts -> games/scrap-yard/game.json, NOT CHANGED by this step.
Engine: branch scrap-yard as the two fixers left it (engine2-fixA, engine2-fixB); every file of
src/engine/salvage, the content and game.json had the same md5 at the start and at the end of every run below
(scratchpad yard/bots7/code-at-start.md5). The tables are deterministic; only the CPU figures depend on load.

Commands: npx tsx scripts/content/yard-bot.ts --seeds 15 --routes 2 --report --daysSeeds 5 --jobs 3   (130 runs, F1)
          npx tsx scripts/content/yard-bot.ts --seeds 5 --first 401 --routes 2 --only beats,gate     (seeds 401-405,
              never used by any bot or test before, F2)
          npx tsx scripts/content/yard-bot.ts --seeds 15 --only x --game <game.json with group.fromRung 99>
              (the normal hand's 90 minutes with no runs at all, F3)
          npx tsx <scratchpad>/yard/bots7/g2days7.mts 1                                        (part G, F4)
          npx tsx <scratchpad>/yard/fixA/bench.ts                                               (the bench, E1)

VERDICT. Below rung 3 the new engine plays the first yard EXACTLY as before: the normal hand's windows 0-55 and
every beat of the opening reproduce the game that went to the owner (REPORT6 G, after E35) to the scrip, and the
yard with no runs (fromRung 99) reproduces it to minute 60 and its three days to the scrip on seeds 2 and 3. From
rung 3 the runs lift the yard: sales at 55-60 §1,781 a minute (was §1,720), minutes 60-90 a mean §2,020 against
§1,930 with no runs, the Night watch's worth §146k (was §132k), three days' lifetime earnings +12.6 % and supplied
tonnes +15.6 % against no runs (E42's accepted baseline). No hard promise broke on 155 runs; tick = jump every
minute on 20 runs. Planning runs ahead against making them trip by trip: means +0.5 % and +1.0 % (earnings, day 1
and day 3) and +1.4 % and +3.6 % (tonnes) on 15 seeds, noise floor -0.6 to -0.7 %: the gate of RULING2.md 14.9
is MET. What MISSES: rated income I against G (RULING2.md 14.5): 7 of 20 moments within 0.9-1.1, 2 outside
0.85-1.15 (NOT MET, as engine2-fixB measured; I5's flat table 10/14 at rung 3 and 9/15 at day 3); Hold (E40 after
14.6, with the fixer's two skips a lot): the day-word holder loses 9.8 to 14.8 % of lifetime earnings by day 3 on
4 of 5 seeds (median -10.8 %; -8.7 % with the stock it still holds counted at usual prices): MORE than a tenth;
E31c at 55-60 (§1,781, 1 of 15 over §2,000; it is reached in minutes 85-90 on 11 of 15). No content number was
tuned: no band that held in REPORT6 misses now.

A. WHAT THE ENGINE CHANGED UNDER THE CONTENT (the accounts: notes/engine2-*.md; the rule: RULING2.md 14.1-14.9)
   A1 From rung group.fromRung (3) the crew works in runs, watched or not: a yard hand keeps at one kind of trip
      from one place to one destination while the trip ends by t0 + 30 s, a cutter at one place while the cut ends
      by t0 + 120 s; out of sight the rest of the run is planned with one dated end, in sight it is made trip by
      trip. Below rung 3 nothing changes (F3 against REPORT6 G: identical to minute 60).
   A2 The merchant's round is never lengthened (14.3); a rate machine takes one hopper piece at a time always.
   A3 The checks follow the state (14.4): partners, rung, rivals and the deal at every changed instant away; goals
      when the yard clock enters a new minute since counts.goalsAt.
   A4 Rated income I is net, from assets, the truck counted once, bounded by the feed, with the driver's own
      queue (engine2-income, engine2-fixB).
   A5 Hold (14.6): with the boss away, the merchant idle, the driver idle and the cheapest full skip dearer than
      the cash, the yard sets aside from one held bay just enough for the skip; engine2-fixB took the ruling's
      fallback (bays.ts HOLD_SKIPS = 2: the lot covers two skips), so Hold as measured here is the two-skip rule.
   A6 The driver's level: engine2-income tried crew.driver.lev 0.15 -> 0.25 and put it back (55-60 fell to
      §1,698); the content has 0.15, as REPORT6.

B. WHAT CHANGED IN THE CONTENT: nothing. The step's rule ("tune only where a band that held in REPORT6 now misses")
   found no such band: every beat, the first drive, the torch, rung 2, the first pour and rung 3 are in band on
   the same seeds as on the game that went to the owner (rung 3 14/15, seed 4 at 54:50, as in REPORT6 G).

C. THE AIMS, MET OR MISSED (normal hand, goal habit, route A, 15 seeds; "new" = seeds 401-405)
   C1 MET  the storyboard, as REPORT6: beat 2 0:12 (15/15), 3 0:20 (14/15), 4 0:34 (9/15; "about 0:30"), 5 0:52,
          6 1:11, 7 1:52, 8 3:34 (all 15/15); new seeds 5/5 on every beat.
   C2 MET  first drive 8:16 (14/15; new 4/5), torch 14:17 (12/15; new 5/5), rung 2 12:42 (14/15; new 5/5), first
          pour 22:54 (14/15; new 5/5), rung 3 57:08 (14/15; new 5/5); four to five rivals in the hour; the hand
          11.69 x the card manager (E4 >= 1.2); the no-hand yard reaches the next goal purchase from every state
          after the first hire on 5 of 5 seeds; an hour away from minute 60 is 0.61 of an hour played (S13 >= 0.3,
          E19 <= 0.8; was 0.55: the away hour now runs in runs at rung 3); no hard promise broken (130 + 25 runs);
          tick = jump minute by minute to minute 60 on 20 runs.
   C3 MISSED E31c, as ruled in E36(a): sales a minute by window, normal hand (F1 section 2):
          0-5 .. 55-60:   201 256 488 729 822 1108 1367 1538 1548 1619 1660 1781   (REPORT6 G: the same to 50-55, then 1720)
          60-65 .. 85-90: 1940 1870 1962 1962 2246 2147
          with no runs (F3), 60-65 .. 85-90: 1801 1967 1937 1971 1972 2080 (55-60: 1720)
          55-60 >= §2,000 on 1/15 (med §1,781); 85-90 >= §2,000 on 11/15 (med §2,147); minutes 60-90 a median mean
          §2,020 a minute with runs against §1,930 without (+4.7 %); supplied by minute 90 57.5 t against 56.3 t.
          A window after minute 30 under the one before: still on 14/15 runs (median two), and in 60-90 a median
          two: one load more or less in a window. The first half hour after rung 3 (about 57:00 to 87:00) is where
          the runs act: the windows climb about §90 a minute higher than without them; the late hour is still
          bound by the one truck and the cutting (engine2-income measured the driver's level and found the truck
          not binding alone).
   C4 READ  E33's burst, unchanged (rung 2's two hours bind it): 5 min + 4 h pays §2,175 (ran 30 min) and buys 2 of 8
          goal purchases left; 15 min + 12 h pays §12,227 (ran 120 min) and buys the 4 left (§3,400) with §9k to
          spare, as in REPORT6 G (E36(b) accepted it). 30 min + 4 h or 12 h: §52,106 (REPORT6 G: §47,822): the
          absence runs rung 2's two hours, crosses 27.5 t inside them, and works its last part on rung 3 in runs.
   C5 MISSED Hold (E40 after RULING2.md 14.6; the fixer's two skips a lot): the day-word holder against the same
          three days without Hold, seeds 1-5:
            lifetime earnings  day 1: -4.0 -3.0 -1.7 -3.0 +0.0 %  (5/5 within a tenth)
                               day 3: -9.8 -11.0 -14.8 -10.7 -10.8 %  (1/5 within a tenth; median -10.8 %)
            earnings + the stock still held, at usual prices, day 3: -8.7 -10.2 -7.0 -10.2 -3.4 % (median -8.7 %)
            supplied tonnes, day 3: -9.1 -11.8 -8.2 -11.7 -5.0 %
          Hold no longer stops the yard (no dead absence: every sitting's away card pays), but the holder still
          loses more than a tenth by day 3: the lot of two skips keeps the truck running at the farm's light skip
          while held bays fill, and what the yard does not sell it does not count as supplied. The ruling names
          no further step after two skips; that number is the fixer's (bays.ts HOLD_SKIPS, a rule constant), so
          it is REPORTED here and not changed. For the lead: (a) count held stock at usual prices in this aim (then
          4 of 5 within a tenth, median -8.7 %), (b) three skips a lot, or (c) accept for stage 1's content and
          rework Hold with the exchanges (stage 3).
   C6 NEAR  the slow hand within 1.5 x the normal hand after 2:00: as REPORT6 (drive 11/15; E24 asks 9 of 10).
   C7 READ  three days, twice a day: a day's income (the last two away cards) §1.50-1.54M on seeds 1-5 (REPORT6 G:
          §1.32-1.34M on seeds 1-3); cash at the end §262k-411k; at most one sitting of six without a purchase.
   C8 READ  the Night watch's worth (one 12 h absence): from minute 15 §10,288 (unchanged, rung 2), from minute 30
          §69,109 (was §66,380), from minute 60 §145,653 (106,688-175,426; was §132,492). Price §36,000.

D. RATED INCOME I AGAINST WHAT THE YARD GAINS AN HOUR (RULING2.md I5, 14.5; F1 sections 8 and 8b)
   G = (net cash gained + the value at usual prices of the stock left - at the start) / hours the yard ran, one
   capped absence at usual prices (board.a 0) from the played state; I from the same state's assets.
                  flat board (15 seeds)                     normal board (10 seeds; G at usual prices)
                  I/G within 0.9-1.1   median  min-max       within 0.9-1.1   median  min-max
   rung 2 entry   12/15                0.964   0.909-1.177   8/10             0.951   0.926-1.177   (binds feed)
   rung 3 entry   10/14                1.051   0.995-1.127   4/10             1.109   1.034-1.133
   minute 60       9/15                1.063   0.962-1.124   3/10 (gated)     1.104   1.021-1.145
   day 1           4/15                0.858   0.845-0.987   4/10 (gated)     0.867   0.830-0.984
   day 3           9/15                0.906   0.881-0.923   9/10             0.912   0.898-0.956
   GATE 14.5 (normal board, minute 60 and day 1): 7/20 within 0.9-1.1 (aim 17/20), 2 outside 0.85-1.15 (aim none):
   NOT MET. I5's flat aim (13 of 15 at rung 3's entry and at day 3): 10/14 and 9/15: NOT MET. These figures are
   identical to engine2-fixB's "AFTER" table (the engine did not move since). The term that is off, by moment:
   at rung 3's entry and minute 60 I runs about 5 to 10 % HIGH (the hour's yards are carry-bound with level-3/4
   hands, and the material I counts there is not what the real hour sold: seed 1's hour sold 2.4 t of HMS an
   hour that I's units do not produce, fixB); at day 1 I runs about 13 % LOW (the real yard fetches demolition
   loads that the queue's floor, cleared linearly, does not let through; the real floor frees room in lumps of
   about 70 kg a hand trip). At rung 2's entry I binds on the feed (the drop-off and the farm) and is within the
   band on 12/15 (the two high seeds sold stock bought before the entry, G's stock term -747 and -1,000).

E. TIME AWAY
   E1 THE BENCH (awaybench.test.ts's state: seed 257 played to minute 60, six hours away, caps lifted; node CPU,
      best of 5; fixA/bench.ts), 07:14, load average 1.38 to 1.45 (started when it fell under 1.5):
        as shipped (ahead true)          201.8 ms   sales §444,357   222 loads
        every run trip by trip            269.5 ms   sales §448,680   224 loads
        no runs (fromRung 99)             306.1 ms   sales §447,222   233 loads
      awaybench.test.ts inside the full salvage suite at 07:15 (load 0.9 to 2.0): 237.2 ms.
      REPORT6 G: 646 ms (the stage-1 engine). The gate stays 250 ms (13.9, 14.8); the lead measures it alone.
   E2 THE BURST: section C4 (5 min + 4 h: §2,175, the yard ran 30 min, 2 of 8 goal purchases; 15 min + 12 h:
      §12,227, 120 min, 4 of 4).
   E3 THREE DAYS WITH AND WITHOUT THE DAY-WORD HOLD: section C5.

G. THE RULE'S EFFECT (RULING2.md 14.2 (ii)/(iii) as restated in 14.9): the bots' three days at the twice-a-day habit
   (an hour, then six times 11.75 h away and 15 minutes played), seeds 1-15, normal hand, goal habit, route A:
   group.ahead true (as shipped), ahead false (every run trip by trip), no runs at all (fromRung 99), and the
   noise floor (ahead true with the cutters' share x (1 + 1e-9)). Per seed in F4.
                                      day 1 tonnes   day 1 earnings   day 3 tonnes   day 3 earnings   (mean, se)
   ahead true vs trip by trip           +1.38 (0.84)    +0.49 (0.93)     +3.56 (0.75)    +1.03 (0.76)
   noise floor (ahead vs itself+1e-9)   -0.70 (0.60)    -0.72 (0.63)     -0.59 (0.38)    -0.56 (0.55)
   ahead true vs no runs                +11.98 (1.77)  +10.14 (1.80)    +15.57 (0.82)   +12.63 (0.95)
   Means of the three columns (day 3): supplied 1,913 t / 1,848 t / 1,656 t; lifetime earnings §4.28M / §4.24M /
   §3.80M. Gate 14.9 (mean within 2 % for earnings, within 5 % for tonnes): MET at day 1 and day 3. No broken
   promise on 60 three-day runs. The no-runs column reproduces REPORT6's three days exactly where REPORT6 had them
   on the final game (seeds 2 and 3: §3,756,626 and §3,760,436 lifetime): from rung 3 the run as the rule adds
   about a sixth of tonnes and an eighth of earnings by day 3 (E42's accepted baseline); on seed 6 alone the runs'
   day 1 is lower (-6.7 % t) and day 3 higher (+9.6 %). The single-absence form of the gate (ten states) was
   measured by engine2-fixA on this engine (mean -1.0 %, noise -0.7 %) and not run again.

H. WHAT MOVED AGAINST REPORT6, AND WHY
   - Nothing below rung 3 (the first 55 minutes, every beat, the burst from minutes 5 to 15, rung 2's away caps):
     the runs start at rung 3 and the other changes (A2, A3) act only where they act: proven by F3.
   - 55-60 §1,720 -> §1,781 and minutes 60-90 +4.7 %: the runs after rung 3 (about 57:00).
   - An hour away from minute 60: 0.55 -> 0.61 of an hour played; the Night watch from minute 60 §132k -> §146k;
     a day's income §1.33M -> §1.51M; three days' earnings +12.6 %, tonnes +15.6 %: the runs (G).
   - The hand against the card manager 11.81 -> 11.69 (still ten times E4's 1.2): earned by minute 60, which the
     runs touch from rung 3 (about 57:00) on; not traced further.
   - 30 min + 4 h away §47,822 -> §52,106: the absence crosses rung 3 inside its two hours and runs after it.
   - Hold: REPORT6 G's holder -4.4, -4.4, -10.0 % (seeds 1-3, the old release rule of E32) -> -9.8, -11.0, -14.8 %
     with the 14.6 rule and two skips a lot: the new rule never stops the yard, but it sells less than E32's
     release did over three days (E32 let a whole bay go at a high day or after two market days; 14.6 sets aside
     only what two skips need and keeps the bay held).
   - I (D): first measured in this form by engine2-fixB; nothing to compare in REPORT6.
   - The bench (E1): 646 ms -> the figure above (grouping, runs).

I. WHAT STILL MISSES, AND WHAT I WOULD DO NEXT
   1. I against G (D): the gate 14.5 is NOT MET. Next (engine2-fixB's plan, which I share): clear the queue's floor
      by the hands' trips (lumps) rather than linearly (day 1 low), and value the hour's material by grade as the
      real hour sells it (minute 60 high). Until then nothing of stage 2 should be priced on I where I binds 'carry'.
   2. Hold (C5): over a tenth by day 3 on 4 of 5 seeds; the lead's call (a), (b) or (c).
   3. E31c at 55-60 (E36(a), accepted): §1,781; the late hour reaches §2,000 only after minute 80. The second truck
      or the cutter's levels remain stage 2's first tuning step; stage 2's numbers start from this table.
   4. The bench: measured on a shared machine (load printed); the lead's own figure decides.

F. THE TABLES (yard-bot.ts's and g2days7.mts's output as printed, nothing hand-edited)

--- F1: npx tsx scripts/content/yard-bot.ts --seeds 15 --routes 2 --report --daysSeeds 5 --jobs 3 (130 runs) ---
REPORT7 tables (the real rules, 15 seeds: 1..15), generated by scripts/content/yard-bot.ts

0. HARD PROMISES (8.3) on 130 runs: none broken; tick = jump minute by minute on 15 runs: equal
   presses refused (all runs): {}
   cards locked by the capacity ceiling in the hour (8.4: at most once): max 0 items on a run; runs with more than one: 0/75; in three days: -  -  -  -  -

1. BEATS (1.2, 1.3): range, median, share in band
 beat 2 the washer apart (aim about 0:12; band shown 0:15) [0:00-0:15]
   normal goal A  0:11 to 0:14, med 0:12, 15/15 in band
   normal all A   0:11 to 0:14, med 0:12, 15/15 in band
   normal goal B  0:35 to 0:41, med 0:36, 0/15 in band
   brisk goal A   0:10 to 0:11, med 0:10, 15/15 in band
   slow goal A    0:13 to 0:17, med 0:14, 10/15 in band
 beat 3 first collection ticket [0:00-0:25]
   normal goal A  0:19 to 0:25, med 0:20, 14/15 in band
   normal all A   0:19 to 0:25, med 0:20, 14/15 in band
   normal goal B  0:25 to 0:30, med 0:26, 15/15 in band
   brisk goal A   0:16 to 0:17, med 0:16, 15/15 in band
   slow goal A    0:22 to 0:30, med 0:25, 6/15 in band
 beat 4 at the stripper (aim about 0:30; band shown 0:35) [0:00-0:35]
   normal goal A  0:31 to 0:42, med 0:34, 9/15 in band
   normal all A   0:31 to 0:42, med 0:34, 9/15 in band
   normal goal B  0:07 to 0:13, med 0:08, 15/15 in band
   brisk goal A   0:24 to 0:25, med 0:24, 15/15 in band
   slow goal A    0:51 to 1:10, med 0:58, 0/15 in band
 beat 5 copper jump [0:00-1:30]
   normal goal A  0:48 to 1:08, med 0:52, 15/15 in band
   normal all A   0:48 to 1:08, med 0:52, 15/15 in band
   normal goal B  0:25 to 0:30, med 0:26, 15/15 in band
   brisk goal A   0:40 to 0:42, med 0:40, 15/15 in band
   slow goal A    1:11 to 1:32, med 1:18, 14/15 in band
 beat 6 first purchase arriving [0:00-2:00]
   normal goal A  1:08 to 1:15, med 1:11, 15/15 in band
   normal all A   1:08 to 1:15, med 1:11, 15/15 in band
   normal goal B  0:52 to 0:59, med 0:55, 15/15 in band
   brisk goal A   0:54 to 0:56, med 0:55, 15/15 in band
   slow goal A    1:26 to 1:47, med 1:35, 15/15 in band
 beat 7 yard hand carrying [0:00-5:00]
   normal goal A  1:43 to 1:59, med 1:52, 15/15 in band
   normal all A   1:15 to 2:03, med 1:51, 15/15 in band
   normal goal B  1:36 to 2:12, med 1:49, 15/15 in band
   brisk goal A   1:28 to 1:30, med 1:30, 15/15 in band
   slow goal A    2:07 to 3:00, med 2:20, 15/15 in band
 beat 8 first rival passed [0:00-5:00]
   normal goal A  3:12 to 3:43, med 3:34, 15/15 in band
   normal all A   3:14 to 3:43, med 3:20, 15/15 in band
   normal goal B  3:08 to 3:54, med 3:12, 15/15 in band
   brisk goal A   2:35 to 3:00, med 2:36, 15/15 in band
   slow goal A    3:59 to 4:33, med 4:19, 15/15 in band
 first drive out (hook) [8:00-10:00]
   normal goal A  7:45 to 8:44, med 8:16, 14/15 in band
   normal all A   7:51 to 9:20, med 8:17, 10/15 in band
   normal goal B  7:40 to 8:49, med 8:12, 13/15 in band
   brisk goal A   6:45 to 7:36, med 6:57, 0/15 in band
   slow goal A    9:45 to 14:27, med 10:46, 1/15 in band
 torch [11:00-15:00]
   normal goal A  12:21 to 16:02, med 14:17, 12/15 in band
   normal all A   12:19 to 15:04, med 13:30, 14/15 in band
   normal goal B  12:43 to 15:43, med 14:40, 11/15 in band
   brisk goal A   10:35 to 13:56, med 11:29, 12/15 in band
   slow goal A    15:57 to 21:24, med 18:11, 0/15 in band
 rung 2 [12:00-18:00]
   normal goal A  11:53 to 14:20, med 12:42, 14/15 in band
   normal all A   11:35 to 13:27, med 12:45, 13/15 in band
   normal goal B  11:34 to 14:40, med 12:30, 12/15 in band
   brisk goal A   10:10 to 11:31, med 10:44, 0/15 in band
   slow goal A    14:16 to 20:35, med 16:51, 11/15 in band
 first pour [18:00-25:00]
   normal goal A  19:20 to 26:41, med 22:54, 14/15 in band
   normal all A   18:35 to 27:50, med 23:58, 10/15 in band
   normal goal B  19:51 to 25:51, med 22:29, 14/15 in band
   brisk goal A   18:10 to 22:00, med 20:07, 15/15 in band
   slow goal A    23:46 to 30:34, med 27:15, 2/15 in band
 rung 3 [55:00-65:00]
   normal goal A  54:50 to 59:21, med 57:08, 14/15 in band
   normal all A   56:03 to 60:01, med 58:03, 15/15 in band
   normal goal B  55:23 to 59:21, med 57:18, 15/15 in band
   brisk goal A   50:43 to 55:33, med 52:52, 2/15 in band
   slow goal A    60:22 to 66:42, med 63:37, 12/15 in band
 slow within 1.5 x normal on the same seed (after 2:00): helperCarrying 13/15, pass1 15/15, drive 11/15, owned:torch 13/15, rung2 13/15, pour 15/15, rung3 15/15
 rivals passed in the hour (normal goal A): min 4, med 5, max 5; first pass med 3:34

2. SALES AND NET A MINUTE BY FIVE-MINUTE WINDOW (median of seeds)
   window             0-5  5-10 10-15 15-20 20-25 25-30 30-35 35-40 40-45 45-50 50-55 55-60 60-65 65-70 70-75 75-80 80-85 85-90
   E28 aim            120   250   450   800  1300  1800  1980  2178  2396  2635  2899  3189
   normal goal A sales   201   256   488   729   822  1108  1367  1538  1548  1619  1660  1781  1940  1870  1962  1962  2246  2147
   normal goal A net   201   226   293   341   233   410   494   594   428   589   441   676   801   713   705   616   892   675
   normal all A sales   200   266   587   467   612  1156  1537  1460  1447  1419  1543  1525  1495  1627  1532  1561  1441  1574
   normal all A net   200   236   587   387   245   252   480   589   510   494   638   688   606   682   514   616   480   679
   normal goal B sales   205   250   487   705   803  1034  1335  1525  1551  1633  1613  1792  1863  1875  1914  1940  2057  2196
   normal goal B net   205   220   298   312   354   220   558   543   515   496   628   687   743   663   717   802   585   795
   brisk goal A sales   244   314   573   815  1035  1383  1483  1441  1686  1704  1722  1883  1861  2036  2037  2132  2083  2318
   brisk goal A net   244   284   326   222   379   574   577   556   625   724   491   731   672   789   845   853   660   707
   slow goal A sales   157   219   224   777   690   800  1162  1389  1538  1575  1527  1532  1663  1704  1866  1903  1892  1954
   slow goal A net    157   219   168   526   246   178   464   598   548   839   565   671   607   521   740   752   698   765
   normal goal A: windows under the one before (after minute 5): med 2, max 4
   E31c normal goal A : sales 55-60 >= §2,000 a minute on 1/15 (med §1781); a window in minutes 30-60 under the one before: 1/15 runs have none (med 2, max 3)
                        minutes 60-90 (runs played to 90): sales 85-90 med §2147, >= §2,000 on 11/15; windows 60-90 mean §2020 against 55-60 §1781; a window in 60-90 under the one before: med 2, max 3
   E31c normal all A  : sales 55-60 >= §2,000 a minute on 0/15 (med §1525); a window in minutes 30-60 under the one before: 0/15 runs have none (med 2, max 4)
                        minutes 60-90 (runs played to 90): sales 85-90 med §1574, >= §2,000 on 1/15; windows 60-90 mean §1529 against 55-60 §1525; a window in 60-90 under the one before: med 2, max 3
   E31c normal goal B : sales 55-60 >= §2,000 a minute on 1/15 (med §1792); a window in minutes 30-60 under the one before: 1/15 runs have none (med 2, max 3)
                        minutes 60-90 (runs played to 90): sales 85-90 med §2196, >= §2,000 on 11/15; windows 60-90 mean §1995 against 55-60 §1792; a window in 60-90 under the one before: med 2, max 3
   E31c brisk goal A  : sales 55-60 >= §2,000 a minute on 4/15 (med §1883); a window in minutes 30-60 under the one before: 0/15 runs have none (med 2, max 3)
                        minutes 60-90 (runs played to 90): sales 85-90 med §2318, >= §2,000 on 13/15; windows 60-90 mean §2090 against 55-60 §1883; a window in 60-90 under the one before: med 2, max 3
   E31c slow goal A   : sales 55-60 >= §2,000 a minute on 0/15 (med §1532); a window in minutes 30-60 under the one before: 0/15 runs have none (med 2, max 3)
                        minutes 60-90 (runs played to 90): sales 85-90 med §1954, >= §2,000 on 7/15; windows 60-90 mean §1825 against 55-60 §1532; a window in 60-90 under the one before: med 2, max 3

3. THROUGH THE HOUR (normal goal A, median): supplied t, rank, cash §, rated capacity t/h, reserve §
   min  5    0.61 t  rank 25  cash     305  R    3.1  reserve      0
   min 10    1.50 t  rank 25  cash     503  R    3.1  reserve      0
   min 15    3.32 t  rank 24  cash    1093  R    3.1  reserve      0
   min 20    4.71 t  rank 24  cash    1480  R    3.1  reserve      0
   min 25    6.63 t  rank 24  cash    1206  R   34.3  reserve      0
   min 30    8.89 t  rank 23  cash    1817  R   40.4  reserve    960
   min 40   15.40 t  rank 23  cash    1994  R   56.8  reserve      0
   min 50   22.39 t  rank 22  cash    1358  R   82.1  reserve    949
   min 60   30.00 t  rank 21  cash    3117  R   82.1  reserve      0
   min 70   38.98 t  rank 21  cash    1633  R   82.1  reserve    946
   min 80   47.94 t  rank 20  cash    2154  R   82.1  reserve    946
   min 90   57.50 t  rank 20  cash    2612  R  110.5  reserve    952
   normal goal A: highest rated capacity reached on rung 1 / 2 / 3: 3.1 / 82.1 / 110.5 t/h
   normal all A: highest rated capacity reached on rung 1 / 2 / 3: 3.1 / 56.8 / 56.8 t/h

4. THE GOAL PURCHASES (normal goal A): price, median minute bought, held at its card (cash after the purchase before / price), wait over 3 min
   sack      §    60  1:04  held 0.00  cash at card 7.54 x  walk-to-buy med 7 s max 8 s  waits>3min 0/15 (max 70 s)  bought 15/15
   hand1     §   300  1:43  held 1.31  cash at card 1.36 x  walk-to-buy med 9 s max 13 s  waits>3min 0/15 (max 48 s)  bought 15/15
   sledge    §   340  3:37  held 0.44  cash at card 1.20 x  walk-to-buy med 7 s max 8 s  waits>3min 0/15 (max 138 s)  bought 15/15
   trolley   §   380  5:48  held 0.18  cash at card 1.12 x  walk-to-buy med 7 s max 8 s  waits>3min 0/15 (max 157 s)  bought 15/15
   truck     §   430  7:09  held 0.26  cash at card 1.13 x  walk-to-buy med 9 s max 11 s  waits>3min 0/15 (max 94 s)  bought 15/15
   cutter    §   540  10:13  held 0.21  cash at card 1.18 x  walk-to-buy med 9 s max 12 s  waits>3min 6/15 (max 235 s)  bought 15/15
   torch     §   480  14:11  held 0.20  cash at card 1.96 x  walk-to-buy med 7 s max 8 s  waits>3min 10/15 (max 342 s)  bought 15/15
   stripper  §   700  17:04  held 0.72  cash at card 3.66 x  walk-to-buy med 9 s max 11 s  waits>3min 7/15 (max 236 s)  bought 15/15
   crucible  §   800  18:30  held 2.33  cash at card 1.74 x  walk-to-buy med 10 s max 13 s  waits>3min 0/15 (max 137 s)  bought 15/15
   bench     §   900  23:03  held 0.72  cash at card 2.01 x  walk-to-buy med 7 s max 11 s  waits>3min 12/15 (max 369 s)  bought 15/15
   driver    §  1000  24:31  held 1.08  cash at card 1.75 x  walk-to-buy med 9 s max 10 s  waits>3min 2/15 (max 343 s)  bought 15/15
   cutter2   §  3600  61:38  held 0.24  cash at card 1.35 x  walk-to-buy med 9 s max 11 s  waits>3min 15/15 (max 2455 s)  bought 15/15
   alu       §  1300  59:26  held 0.84  cash at card 1.85 x  walk-to-buy med 8 s max 8 s  waits>3min 1/1 (max 2095 s)  bought 1/15
   walk-to-buy at normal goal A  (every purchase of the hour): med 9 s, max 13 s over 344 purchases
   walk-to-buy at normal all A   (every purchase of the hour): med 9 s, max 19 s over 399 purchases
   walk-to-buy at normal goal B  (every purchase of the hour): med 9 s, max 14 s over 350 purchases
   walk-to-buy at brisk goal A   (every purchase of the hour): med 6 s, max 8 s over 371 purchases
   walk-to-buy at slow goal A    (every purchase of the hour): med 14 s, max 24 s over 348 purchases
   purchase gaps over three minutes (any purchase): s1:10:02+5m,15:24+3m,20:02+5m,25:23+3m,29:53+3m,33:14+3m,40:21+6m,46:57+4m  s2:10:09+3m,13:11+3m,18:09+3m,22:55+7m,29:25+4m,37:50+4m,41:43+5m,50:24+4m  s3:8:58+5m,13:48+3m,18:21+5m,23:27+6m,36:20+3m,40:14+3m,49:34+3m,53:02+4m  s4:9:57+5m,14:29+4m,19:39+4m,24:48+4m,39:06+4m,42:44+3m,49:31+3m,52:48+7m  s5:17:10+6m,23:44+6m,33:59+3m,41:12+3m,45:25+4m,49:43+3m,53:43+6m  s6:7:04+4m,20:42+5m,25:29+5m,30:33+3m,34:40+3m,38:21+4m,45:51+4m,51:30+4m  s7:7:20+3m,10:33+5m,19:15+5m,25:23+5m,30:06+7m,36:52+4m,47:25+5m  s8:7:13+3m,17:26+3m,23:15+6m,36:20+4m,44:01+4m,48:02+3m,51:24+4m  s9:6:56+3m,10:21+4m,22:03+4m,26:38+4m,31:28+4m,35:55+4m,40:09+4m,43:48+4m,48:41+4m,52:56+6m  s10:10:04+5m,14:45+4m,20:07+5m,25:07+5m,30:13+4m,37:42+6m  s11:6:37+4m,16:54+5m,22:19+4m,45:00+3m,48:19+4m  s12:7:22+3m,18:03+5m,24:47+5m,30:10+4m,33:47+5m,38:46+4m,46:46+6m,52:17+4m  s13:9:41+5m,14:35+3m,19:03+5m,24:31+5m,29:23+4m,39:58+4m,44:14+8m,51:54+4m,55:41+4m  s14:10:13+6m,15:56+3m,20:41+6m,27:36+4m,31:39+4m,36:54+6m,42:31+3m,45:52+5m,53:53+5m  s15:9:41+4m,22:10+5m,27:05+5m,32:29+4m,36:28+4m,45:04+4m,49:13+4m
   purchase prompts a minute (most in any minute): med 2, max 2
   burst (8.4: at most two ahead by minute 10): habit all ahead of habit goal in goal purchases owned, minutes 1-10: max 1 (seeds over 2: 0/15); minutes 1-30: max 4

5. THE HAND AGAINST THE CARD MANAGER (earned by minute 60, normal / manager): med 11.69, min 10.43 (E4 aim >= 1.20)
   an hour away from minute 60 against an hour played at minute 60's pace (minutes 50-60 x 6): med 0.61, min 0.53 (S13 aim >= 0.3; E19 asks played >= 1.25 x away, i.e. this <= 0.8)
   stop and return (earned on the away card, median; S13: above zero): 5m+1h §2175 (zero on 0), 5m+4h §2175 (zero on 0), 5m+12h §2175 (zero on 0), 10m+1h §2613 (zero on 0), 10m+4h §2613 (zero on 0), 10m+12h §2613 (zero on 0), 15m+1h §6742 (zero on 0), 15m+4h §12227 (zero on 0), 15m+12h §12227 (zero on 0), 30m+1h §19248 (zero on 0), 30m+4h §52106 (zero on 0), 30m+12h §52106 (zero on 0)

   E33 THE BURST (normal goal A, median): the away card, how long the yard ran, cash after it, and how much of the goal list that buys at once
   5m+1h    away §  2175  ran   30 min  cash §  2586  buys 2 of 8 goal purchases left (§810 of §5230; max 5)  deal deliveries 0
   5m+4h    away §  2175  ran   30 min  cash §  2586  buys 2 of 8 goal purchases left (§810 of §5230; max 5)  deal deliveries 0
   5m+12h   away §  2175  ran   30 min  cash §  2586  buys 2 of 8 goal purchases left (§810 of §5230; max 5)  deal deliveries 0
   10m+4h   away §  2613  ran   30 min  cash §  3161  buys 4 of 6 goal purchases left (§2520 of §4420; max 5)  deal deliveries 0
   15m+1h   away §  6742  ran   60 min  cash §  8503  buys 4 of 4 goal purchases left (§3400 of §3400; max 5)  deal deliveries 0
   15m+4h   away § 12227  ran  120 min  cash § 12837  buys 4 of 4 goal purchases left (§3400 of §3400; max 5)  deal deliveries 0
   15m+12h  away § 12227  ran  120 min  cash § 12837  buys 4 of 4 goal purchases left (§3400 of §3400; max 5)  deal deliveries 0
   30m+4h   away § 52106  ran  120 min  cash §  8595  buys 0 of 0 goal purchases left (§0 of §0; max 0)  deal deliveries 0
   30m+12h  away § 52106  ran  120 min  cash §  8595  buys 0 of 0 goal purchases left (§0 of §0; max 0)  deal deliveries 0
   the Night watch's worth: what it adds to one 12 h absence (median, min-max): 15m+12h §10288 (9408-12456), 30m+12h §69109 (59305-111400), 60m+12h §145653 (106688-175426)

P20. MINUTES 5 TO 10 AT A PERSON'S HAND: what a minute of the boss's own work pays (today's value weighed by him / 5), the walks on foot
   normal goal A  § a minute of his work: med 227 (range 164-295); longest walk med 41.0 m / 10 s (max 51.9 m); share of the five minutes on foot med 26 %
   normal all A   § a minute of his work: med 224 (range 175-259); longest walk med 41.0 m / 10 s (max 51.9 m); share of the five minutes on foot med 26 %
   normal goal B  § a minute of his work: med 224 (range 169-250); longest walk med 41.0 m / 10 s (max 41.6 m); share of the five minutes on foot med 25 %
   brisk goal A   § a minute of his work: med 282 (range 200-327); longest walk med 37.3 m / 9 s (max 37.4 m); share of the five minutes on foot med 23 %
   slow goal A    § a minute of his work: med 192 (range 134-265); longest walk med 46.6 m / 12 s (max 59.0 m); share of the five minutes on foot med 28 %

6. THREE DAYS, TWICE A DAY (a first hour, then 15 minutes every 11.75 h): per sitting, purchases, cash before / after, the away pass
   seed 1: h5.3: +20 (§84k -> §7k, away §270k, rank 18); h11.5: +16 (§229k -> §3k, away §611k, rank 15); h17.8: +15 (§227k -> §11k, away §682k, rank 14); h24: +11 (§256k -> §7k, away §728k, rank 14); h30.3: +6 (§256k -> §18k, away §755k, rank 14); h36.5: +1 (§272k -> §301k, away §763k, rank 13)
      a sitting without a purchase: 0/6; cash at the end §301k against a day's income §1517k
   seed 2: h5.3: +20 (§87k -> §10k, away §285k, rank 17); h11.5: +16 (§234k -> §5k, away §622k, rank 15); h17.8: +17 (§257k -> §8k, away §701k, rank 14); h24: +7 (§251k -> §25k, away §736k, rank 14); h30.3: +5 (§276k -> §62k, away §755k, rank 13); h36.5: +0 (§313k -> §338k, away §753k, rank 13)
      a sitting without a purchase: 1/6; cash at the end §338k against a day's income §1508k
   seed 3: h5.3: +22 (§104k -> §2k, away §289k, rank 18); h11.5: +13 (§189k -> §3k, away §594k, rank 15); h17.8: +15 (§222k -> §7k, away §668k, rank 14); h24: +7 (§241k -> §13k, away §712k, rank 14); h30.3: +7 (§266k -> §45k, away §753k, rank 14); h36.5: +1 (§293k -> §262k, away §753k, rank 13)
      a sitting without a purchase: 0/6; cash at the end §262k against a day's income §1506k
   seed 4: h5.3: +19 (§87k -> §1k, away §289k, rank 17); h11.5: +16 (§225k -> §5k, away §648k, rank 15); h17.8: +16 (§249k -> §3k, away §711k, rank 14); h24: +7 (§271k -> §5k, away §758k, rank 14); h30.3: +10 (§282k -> §79k, away §791k, rank 13); h36.5: +0 (§326k -> §357k, away §745k, rank 13)
      a sitting without a purchase: 1/6; cash at the end §357k against a day's income §1536k
   seed 5: h5.3: +23 (§124k -> §4k, away §343k, rank 17); h11.5: +17 (§227k -> §6k, away §656k, rank 15); h17.8: +11 (§256k -> §19k, away §726k, rank 14); h24: +8 (§292k -> §10k, away §782k, rank 14); h30.3: +8 (§289k -> §142k, away §784k, rank 13); h36.5: +0 (§375k -> §411k, away §715k, rank 13)
      a sitting without a purchase: 1/6; cash at the end §411k against a day's income §1498k
   the day-word holder against the same days without Hold, lifetime earnings at day 3: -9.8 %, -11.0 %, -14.8 %, -10.7 %, -10.8 % (E40 after RULING2.md 14.6: lose at most a tenth)
   day1: holder / without Hold, earnings -4.0 % -3.0 % -1.7 % -3.0 % +0.0 % (med -3.0 %; within a tenth on 5/5); earnings + stock at usual prices -2.5 % -1.2 % -0.1 % -1.4 % +0.0 % (med -1.2 %); supplied t -3.8 % -1.2 % -3.9 % -1.2 % +0.0 %; stock held §23k/8k 26k/7k 27k/10k 24k/7k 7k/7k
   day3: holder / without Hold, earnings -9.8 % -11.0 % -14.8 % -10.7 % -10.8 % (med -10.8 %; within a tenth on 1/5); earnings + stock at usual prices -8.7 % -10.2 % -7.0 % -10.2 % -3.4 % (med -8.7 %); supplied t -9.1 % -11.8 % -8.2 % -11.7 % -5.0 %; stock held §57k/12k 39k/8k 338k/13k 34k/13k 340k/12k
7. NO HAND (E4, E24): states of a normal run, the stick never touched; the next goal purchase reached within 30 min
   seed 1: reached on 9/9 states from the first hire; m3 sledge:0:40 m5 trolley:3:50 m7 truck:0:10 m9 cutter:4:00 m11 -:n/a m13 -:n/a m15 torch:0:10 m17 stripper:0:10 m19 crucible:0:10 m21 -:n/a m23 -:n/a m25 bench:0:10 m27 driver:0:10 m29 -:n/a m31 -:n/a m33 -:n/a m35 -:n/a m37 -:n/a m39 -:n/a m41 -:n/a
   seed 2: reached on 7/7 states from the first hire; m3 sledge:0:50 m5 trolley:2:20 m7 truck:0:10 m9 cutter:1:20 m11 -:n/a m13 torch:0:10 m15 stripper:0:10 m17 crucible:0:50 m19 -:n/a m21 -:n/a m23 -:n/a m25 -:n/a m27 -:n/a m29 -:n/a m31 -:n/a m33 -:n/a m35 -:n/a m37 -:n/a m39 -:n/a m41 -:n/a
   seed 3: reached on 5/5 states from the first hire; m3 sledge:0:40 m5 trolley:0:50 m7 truck:n/a m9 -:n/a m11 -:n/a m13 -:n/a m15 -:n/a m17 crucible:0:10 m19 -:n/a m21 -:n/a m23 -:n/a m25 -:n/a m27 driver:0:10 m29 driver:0:10 m31 -:n/a m33 -:n/a m35 -:n/a m37 -:n/a m39 -:n/a m41 -:n/a
   seed 4: reached on 5/5 states from the first hire; m3 sledge:0:20 m5 trolley:1:40 m7 truck:n/a m9 cutter:1:40 m11 -:n/a m13 -:n/a m15 -:n/a m17 stripper:0:10 m19 crucible:0:10 m21 -:n/a m23 -:n/a m25 -:n/a m27 -:n/a m29 -:n/a m31 -:n/a m33 -:n/a m35 -:n/a m37 -:n/a m39 -:n/a m41 -:n/a
   seed 5: reached on 6/6 states from the first hire; m3 sledge:0:30 m5 trolley:1:30 m7 truck:0:30 m9 cutter:0:40 m11 -:n/a m13 -:n/a m15 crucible:1:10 m17 crucible:0:10 m19 -:n/a m21 -:n/a m23 bench:n/a m25 -:n/a m27 -:n/a m29 -:n/a m31 -:n/a m33 -:n/a m35 -:n/a m37 -:n/a m39 -:n/a m41 -:n/a

8. RATED INCOME I AGAINST THE AWAY INCOME G (stage 2 2.3.3, I5; PLAYED WITH PRICES FLAT, board.a 0; normal hand, goal habit, route A; G = (net cash + stock left at p̄ − at the start) / hours the yard ran, a capped absence at usual prices)
   rung2 I/G in 0.9-1.1 on 12/15 seeds (aim 13 of 15 at rung3 and day3); I/G med 0.964, min 0.909, max 1.177
      s  1 t 13:42 rung 2 ran 2.0 h: G §  4469 (sales 5216 − loads 0 + stock -747)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 1.177
      s  2 t 13:02 rung 2 ran 2.0 h: G §  5667 (sales 5816 − loads 0 + stock -149)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.929
      s  3 t 12:45 rung 2 ran 2.0 h: G §  5466 (sales 6107 − loads 0 + stock -641)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.963
      s  4 t 14:07 rung 2 ran 2.0 h: G §  5435 (sales 5545 − loads 0 + stock -110)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.968
      s  5 t 13:05 rung 2 ran 2.0 h: G §  5568 (sales 5548 − loads 0 + stock 20)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.945
      s  6 t 13:12 rung 2 ran 2.0 h: G §  5621 (sales 6007 − loads 0 + stock -387)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.936
      s  7 t 13:40 rung 2 ran 2.0 h: G §  5685 (sales 6415 − loads 0 + stock -730)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.926
      s  8 t 13:34 rung 2 ran 2.0 h: G §  4604 (sales 5245 − loads 0 + stock -641)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 1.143
      s  9 t 15:41 rung 2 ran 2.0 h: G §  5456 (sales 6231 − loads 0 + stock -776)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.964
      s 10 t 16:06 rung 2 ran 2.0 h: G §  5482 (sales 6209 − loads 0 + stock -727)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.960
      s 11 t 12:08 rung 2 ran 2.0 h: G §  5789 (sales 5818 − loads 0 + stock -30)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.909
      s 12 t 13:06 rung 2 ran 2.0 h: G §  5377 (sales 5377 − loads 0 + stock 0)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.979
      s 13 t 13:24 rung 2 ran 2.0 h: G §  5273 (sales 5914 − loads 0 + stock -641)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.998
      s 14 t 13:57 rung 2 ran 2.0 h: G §  4730 (sales 5457 − loads 0 + stock -727)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 1.112
      s 15 t 13:59 rung 2 ran 2.0 h: G §  5441 (sales 6083 − loads 0 + stock -641)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.967
   rung3 I/G in 0.9-1.1 on 10/14 seeds (aim 13 of 15 at rung3 and day3); I/G med 1.051, min 0.995, max 1.127
      s  1 t 59:01 rung 3 ran 4.0 h: G § 23235 (sales 56793 − loads 33764 + stock 206)  I § 23744 (sales 58245 − loads 34501, binds cut)  I/G 1.022
      s  2 t 56:00 rung 3 ran 4.0 h: G § 26975 (sales 80293 − loads 53828 + stock 511)  I § 28474 (sales 72080 − loads 43606, binds carry)  I/G 1.056
      s  3 t 59:02 rung 3 ran 4.0 h: G § 25605 (sales 70436 − loads 45264 + stock 433)  I § 28225 (sales 71352 − loads 43127, binds cut)  I/G 1.102
      s  4 t 58:26 rung 3 ran 4.0 h: G § 26014 (sales 69768 − loads 44085 + stock 330)  I § 28225 (sales 71352 − loads 43127, binds cut)  I/G 1.085
      s  6 t 56:01 rung 3 ran 4.0 h: G § 22830 (sales 56558 − loads 34022 + stock 294)  I § 23744 (sales 58245 − loads 34501, binds cut)  I/G 1.040
      s  7 t 57:01 rung 3 ran 4.0 h: G § 24667 (sales 72534 − loads 51254 + stock 3387)  I § 27478 (sales 69167 − loads 41689, binds carry)  I/G 1.114
      s  8 t 58:02 rung 3 ran 4.0 h: G § 23721 (sales 71027 − loads 47439 + stock 133)  I § 26731 (sales 66983 − loads 40252, binds carry)  I/G 1.127
      s  9 t 56:00 rung 3 ran 4.0 h: G § 27489 (sales 75010 − loads 48101 + stock 581)  I § 27360 (sales 68701 − loads 41341, binds cut)  I/G 0.995
      s 10 t 57:08 rung 3 ran 4.0 h: G § 24868 (sales 72206 − loads 50737 + stock 3399)  I § 27478 (sales 69167 − loads 41689, binds carry)  I/G 1.105
      s 11 t 57:00 rung 3 ran 4.0 h: G § 26002 (sales 64181 − loads 38598 + stock 419)  I § 26165 (sales 65223 − loads 39058, binds cut)  I/G 1.006
      s 12 t 58:31 rung 3 ran 4.0 h: G § 25574 (sales 63672 − loads 38635 + stock 537)  I § 26165 (sales 65223 − loads 39058, binds cut)  I/G 1.023
      s 13 t 57:03 rung 3 ran 4.0 h: G § 24303 (sales 69831 − loads 47181 + stock 1653)  I § 26731 (sales 66983 − loads 40252, binds carry)  I/G 1.100
      s 14 t 60:09 rung 3 ran 4.0 h: G § 22585 (sales 56392 − loads 33543 + stock -264)  I § 23744 (sales 58245 − loads 34501, binds cut)  I/G 1.051
      s 15 t 57:04 rung 3 ran 4.0 h: G § 22961 (sales 56568 − loads 33543 + stock -64)  I § 23744 (sales 58245 − loads 34501, binds cut)  I/G 1.034
   hour  I/G in 0.9-1.1 on 9/15 seeds (aim 13 of 15 at rung3 and day3); I/G med 1.063, min 0.962, max 1.124
      s  1 t 60:34 rung 3 ran 4.0 h: G § 24677 (sales 71138 − loads 50056 + stock 3595)  I § 27727 (sales 69895 − loads 42168, binds carry)  I/G 1.124
      s  2 t 60:01 rung 3 ran 4.0 h: G § 26795 (sales 79797 − loads 53810 + stock 807)  I § 28474 (sales 72080 − loads 43606, binds carry)  I/G 1.063
      s  3 t 60:33 rung 3 ran 4.0 h: G § 25471 (sales 70941 − loads 46223 + stock 753)  I § 28225 (sales 71352 − loads 43127, binds cut)  I/G 1.108
      s  4 t 60:00 rung 3 ran 4.0 h: G § 25875 (sales 70914 − loads 45025 + stock -14)  I § 28225 (sales 71352 − loads 43127, binds cut)  I/G 1.091
      s  5 t 60:00 rung 2 ran 2.0 h: G § 28956 (sales 72915 − loads 45503 + stock 1545)  I § 27858 (sales 70157 − loads 42300, binds cut)  I/G 0.962
      s  6 t 60:04 rung 3 ran 4.0 h: G § 27495 (sales 82269 − loads 56685 + stock 1910)  I § 29221 (sales 74264 − loads 45043, binds carry)  I/G 1.063
      s  7 t 60:02 rung 3 ran 4.0 h: G § 24953 (sales 73538 − loads 51860 + stock 3275)  I § 27478 (sales 69167 − loads 41689, binds carry)  I/G 1.101
      s  8 t 60:04 rung 3 ran 4.0 h: G § 23856 (sales 70981 − loads 47900 + stock 775)  I § 26731 (sales 66983 − loads 40252, binds carry)  I/G 1.121
      s  9 t 60:08 rung 3 ran 4.0 h: G § 29919 (sales 82675 − loads 55284 + stock 2528)  I § 31027 (sales 79406 − loads 48379, binds carry)  I/G 1.037
      s 10 t 60:02 rung 3 ran 4.0 h: G § 24613 (sales 71476 − loads 50516 + stock 3654)  I § 27478 (sales 69167 − loads 41689, binds carry)  I/G 1.116
      s 11 t 60:02 rung 3 ran 4.0 h: G § 33382 (sales 86974 − loads 55059 + stock 1467)  I § 34296 (sales 88894 − loads 54598, binds carry)  I/G 1.027
      s 12 t 60:26 rung 3 ran 4.0 h: G § 32645 (sales 84672 − loads 54598 + stock 2572)  I § 33565 (sales 86764 − loads 53198, binds carry)  I/G 1.028
      s 13 t 60:04 rung 3 ran 4.0 h: G § 24207 (sales 70299 − loads 46941 + stock 850)  I § 26731 (sales 66983 − loads 40252, binds carry)  I/G 1.104
      s 14 t 60:09 rung 3 ran 4.0 h: G § 22585 (sales 56392 − loads 33543 + stock -264)  I § 23744 (sales 58245 − loads 34501, binds cut)  I/G 1.051
      s 15 t 60:17 rung 3 ran 4.0 h: G § 23190 (sales 57185 − loads 33783 + stock -212)  I § 23744 (sales 58245 − loads 34501, binds cut)  I/G 1.024
   day1  I/G in 0.9-1.1 on 4/15 seeds (aim 13 of 15 at rung3 and day3); I/G med 0.858, min 0.845, max 0.987
      s  1 t 690:39 rung 3 ran 6.0 h: G § 42629 (sales 118855 − loads 77972 + stock 1746)  I § 36441 (sales 95380 − loads 58940, binds carry)  I/G 0.855
      s  2 t 690:22 rung 3 ran 6.0 h: G § 43060 (sales 121510 − loads 79028 + stock 578)  I § 36441 (sales 95380 − loads 58940, binds carry)  I/G 0.846
      s  3 t 690:34 rung 3 ran 6.0 h: G § 41139 (sales 117351 − loads 76685 + stock 473)  I § 36690 (sales 96108 − loads 59419, binds carry)  I/G 0.892
      s  4 t 690:34 rung 3 ran 6.0 h: G § 37232 (sales 111426 − loads 75191 + stock 997)  I § 36441 (sales 95380 − loads 58940, binds carry)  I/G 0.979
      s  5 t 570:18 rung 3 ran 6.0 h: G § 41952 (sales 117352 − loads 76203 + stock 803)  I § 35943 (sales 93924 − loads 57981, binds carry)  I/G 0.857
      s  6 t 690:11 rung 3 ran 6.0 h: G § 43407 (sales 119625 − loads 77111 + stock 894)  I § 36673 (sales 96054 − loads 59381, binds carry)  I/G 0.845
      s  7 t 690:30 rung 3 ran 6.0 h: G § 38114 (sales 112586 − loads 75977 + stock 1505)  I § 36690 (sales 96108 − loads 59419, binds carry)  I/G 0.963
      s  8 t 690:10 rung 3 ran 6.0 h: G § 42577 (sales 121484 − loads 79692 + stock 784)  I § 36192 (sales 94652 − loads 58461, binds carry)  I/G 0.850
      s  9 t 690:15 rung 3 ran 6.0 h: G § 37419 (sales 110728 − loads 75182 + stock 1872)  I § 36938 (sales 96837 − loads 59898, binds carry)  I/G 0.987
      s 10 t 690:06 rung 3 ran 6.0 h: G § 42203 (sales 117589 − loads 76131 + stock 745)  I § 36441 (sales 95380 − loads 58940, binds carry)  I/G 0.863
      s 11 t 690:21 rung 3 ran 6.0 h: G § 43644 (sales 120036 − loads 77715 + stock 1324)  I § 36938 (sales 96837 − loads 59898, binds carry)  I/G 0.846
      s 12 t 690:34 rung 3 ran 6.0 h: G § 42745 (sales 121985 − loads 80562 + stock 1322)  I § 36690 (sales 96108 − loads 59419, binds carry)  I/G 0.858
      s 13 t 690:24 rung 3 ran 6.0 h: G § 41745 (sales 117122 − loads 75492 + stock 115)  I § 36192 (sales 94652 − loads 58461, binds carry)  I/G 0.867
      s 14 t 690:20 rung 3 ran 6.0 h: G § 42629 (sales 117374 − loads 75849 + stock 1104)  I § 36441 (sales 95380 − loads 58940, binds carry)  I/G 0.855
      s 15 t 691:17 rung 3 ran 6.0 h: G § 37271 (sales 110388 − loads 74678 + stock 1561)  I § 36441 (sales 95380 − loads 58940, binds carry)  I/G 0.978
   day3  I/G in 0.9-1.1 on 9/15 seeds (aim 13 of 15 at rung3 and day3); I/G med 0.906, min 0.881, max 0.923
      s  1 t 2190:57 rung 3 ran 6.0 h: G § 42742 (sales 125251 − loads 83776 + stock 1267)  I § 38930 (sales 102662 − loads 63732, binds carry)  I/G 0.911
      s  2 t 2190:29 rung 3 ran 6.0 h: G § 43595 (sales 126546 − loads 84458 + stock 1507)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.899
      s  3 t 2190:58 rung 3 ran 6.0 h: G § 44495 (sales 128066 − loads 85589 + stock 2018)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.881
      s  4 t 2190:58 rung 3 ran 6.0 h: G § 44164 (sales 128299 − loads 85627 + stock 1492)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.887
      s  5 t 2070:47 rung 3 ran 6.0 h: G § 43153 (sales 126120 − loads 84252 + stock 1285)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.908
      s  6 t 2190:25 rung 3 ran 6.0 h: G § 43935 (sales 129594 − loads 86707 + stock 1048)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.892
      s  7 t 2190:45 rung 3 ran 6.0 h: G § 46091 (sales 132602 − loads 87027 + stock 515)  I § 40922 (sales 108487 − loads 67565, binds carry)  I/G 0.888
      s  8 t 2190:24 rung 3 ran 6.0 h: G § 43202 (sales 127098 − loads 85382 + stock 1486)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.907
      s  9 t 2190:50 rung 3 ran 6.0 h: G § 43632 (sales 127084 − loads 84609 + stock 1157)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.898
      s 10 t 2190:15 rung 3 ran 6.0 h: G § 43232 (sales 127223 − loads 85185 + stock 1195)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.906
      s 11 t 2190:27 rung 3 ran 6.0 h: G § 43053 (sales 127737 − loads 85248 + stock 564)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.910
      s 12 t 2190:44 rung 3 ran 6.0 h: G § 42904 (sales 126278 − loads 84377 + stock 1003)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.913
      s 13 t 2190:46 rung 3 ran 6.0 h: G § 43320 (sales 125520 − loads 84033 + stock 1833)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.904
      s 14 t 2190:29 rung 3 ran 6.0 h: G § 42465 (sales 125607 − loads 83813 + stock 672)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.923
      s 15 t 2191:29 rung 3 ran 6.0 h: G § 48490 (sales 140708 − loads 92761 + stock 543)  I § 44158 (sales 117953 − loads 73794, binds carry)  I/G 0.911

8b. THE SAME ON YARDS PLAYED WITH THE NORMAL PRICE BOARD (RULING2.md 14.5; G still at usual prices, board.a 0; gate: 17 of 20 moments within 0.9-1.1, none outside 0.85-1.15)
   rung2 I/G in 0.9-1.1 on 8/10 seeds (printed, not gated); I/G med 0.951, min 0.926, max 1.177
      s  1 t 13:42 rung 2 ran 2.0 h: G §  4469 (sales 5216 − loads 0 + stock -747)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 1.177
      s  2 t 13:04 rung 2 ran 2.0 h: G §  5667 (sales 5816 − loads 0 + stock -149)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.929
      s  3 t 13:08 rung 2 ran 2.0 h: G §  5496 (sales 5717 − loads 0 + stock -222)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.957
      s  4 t 14:07 rung 2 ran 2.0 h: G §  5435 (sales 5545 − loads 0 + stock -110)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.968
      s  5 t 12:07 rung 2 ran 2.0 h: G §  5652 (sales 5652 − loads 0 + stock 0)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.931
      s  6 t 13:07 rung 2 ran 2.0 h: G §  5621 (sales 5639 − loads 0 + stock -17)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.936
      s  7 t 13:59 rung 2 ran 2.0 h: G §  5685 (sales 6412 − loads 0 + stock -727)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.926
      s  8 t 13:14 rung 2 ran 2.0 h: G §  4609 (sales 4658 − loads 0 + stock -49)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 1.142
      s  9 t 13:34 rung 2 ran 2.0 h: G §  5531 (sales 6278 − loads 0 + stock -747)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.951
      s 10 t 15:58 rung 2 ran 2.0 h: G §  5482 (sales 6236 − loads 0 + stock -753)  I §  5262 (sales 5262 − loads 0, binds feed)  I/G 0.960
   rung3 I/G in 0.9-1.1 on 4/10 seeds (printed, not gated); I/G med 1.109, min 1.034, max 1.133
      s  1 t 57:09 rung 3 ran 4.0 h: G § 24059 (sales 68075 − loads 47909 + stock 3894)  I § 26731 (sales 66983 − loads 40252, binds carry)  I/G 1.111
      s  2 t 58:04 rung 3 ran 4.0 h: G § 24479 (sales 72015 − loads 50769 + stock 3232)  I § 27478 (sales 69167 − loads 41689, binds carry)  I/G 1.123
      s  3 t 58:04 rung 3 ran 4.0 h: G § 24908 (sales 71436 − loads 46960 + stock 432)  I § 28225 (sales 71352 − loads 43127, binds cut)  I/G 1.133
      s  4 t 57:01 rung 3 ran 4.0 h: G § 24526 (sales 70057 − loads 46702 + stock 1170)  I § 27478 (sales 69167 − loads 41689, binds carry)  I/G 1.120
      s  5 t 58:02 rung 3 ran 4.0 h: G § 25536 (sales 64009 − loads 39110 + stock 637)  I § 26414 (sales 65951 − loads 39537, binds cut)  I/G 1.034
      s  6 t 57:05 rung 3 ran 4.0 h: G § 22123 (sales 54113 − loads 32235 + stock 245)  I § 22880 (sales 55681 − loads 32801, binds cut)  I/G 1.034
      s  7 t 58:00 rung 3 ran 4.0 h: G § 25442 (sales 69589 − loads 44263 + stock 116)  I § 28225 (sales 71352 − loads 43127, binds cut)  I/G 1.109
      s  8 t 57:03 rung 3 ran 4.0 h: G § 24801 (sales 73675 − loads 51412 + stock 2538)  I § 27727 (sales 69895 − loads 42168, binds carry)  I/G 1.118
      s  9 t 57:07 rung 3 ran 4.0 h: G § 24389 (sales 71213 − loads 47439 + stock 616)  I § 26731 (sales 66983 − loads 40252, binds carry)  I/G 1.096
      s 10 t 57:04 rung 3 ran 4.0 h: G § 26186 (sales 69521 − loads 44281 + stock 947)  I § 28225 (sales 71352 − loads 43127, binds cut)  I/G 1.078
   hour  I/G in 0.9-1.1 on 3/10 seeds (gated); I/G med 1.104, min 1.021, max 1.145
      s  1 t 60:26 rung 3 ran 4.0 h: G § 24203 (sales 68884 − loads 48374 + stock 3694)  I § 26731 (sales 66983 − loads 40252, binds carry)  I/G 1.104
      s  2 t 60:05 rung 3 ran 4.0 h: G § 24608 (sales 72159 − loads 50737 + stock 3186)  I § 27478 (sales 69167 − loads 41689, binds carry)  I/G 1.117
      s  3 t 60:00 rung 3 ran 4.0 h: G § 25341 (sales 70875 − loads 46233 + stock 699)  I § 28225 (sales 71352 − loads 43127, binds cut)  I/G 1.114
      s  4 t 60:00 rung 3 ran 4.0 h: G § 24428 (sales 73013 − loads 51254 + stock 2669)  I § 27478 (sales 69167 − loads 41689, binds carry)  I/G 1.125
      s  5 t 60:05 rung 3 ran 4.0 h: G § 32709 (sales 86711 − loads 55538 + stock 1536)  I § 34545 (sales 89622 − loads 55078, binds carry)  I/G 1.056
      s  6 t 60:05 rung 3 ran 4.0 h: G § 22405 (sales 54738 − loads 32752 + stock 419)  I § 22880 (sales 55681 − loads 32801, binds cut)  I/G 1.021
      s  7 t 60:03 rung 3 ran 4.0 h: G § 24646 (sales 70910 − loads 46457 + stock 193)  I § 28225 (sales 71352 − loads 43127, binds cut)  I/G 1.145
      s  8 t 60:30 rung 3 ran 4.0 h: G § 24769 (sales 73290 − loads 51400 + stock 2879)  I § 27727 (sales 69895 − loads 42168, binds carry)  I/G 1.119
      s  9 t 60:01 rung 3 ran 4.0 h: G § 25204 (sales 73282 − loads 51235 + stock 3157)  I § 27727 (sales 69895 − loads 42168, binds carry)  I/G 1.100
      s 10 t 60:03 rung 3 ran 4.0 h: G § 25953 (sales 70770 − loads 45479 + stock 663)  I § 28225 (sales 71352 − loads 43127, binds cut)  I/G 1.088
   day1  I/G in 0.9-1.1 on 4/10 seeds (gated); I/G med 0.867, min 0.830, max 0.984
      s  1 t 690:32 rung 3 ran 6.0 h: G § 39082 (sales 116036 − loads 78076 + stock 1123)  I § 36690 (sales 96108 − loads 59419, binds carry)  I/G 0.939
      s  2 t 690:20 rung 3 ran 6.0 h: G § 43052 (sales 118962 − loads 76143 + stock 233)  I § 36441 (sales 95380 − loads 58940, binds carry)  I/G 0.846
      s  3 t 690:08 rung 3 ran 6.0 h: G § 37503 (sales 112326 − loads 75581 + stock 758)  I § 36441 (sales 95380 − loads 58940, binds carry)  I/G 0.972
      s  4 t 690:06 rung 3 ran 6.0 h: G § 41664 (sales 118254 − loads 77618 + stock 1028)  I § 36441 (sales 95380 − loads 58940, binds carry)  I/G 0.875
      s  5 t 690:58 rung 3 ran 6.0 h: G § 42593 (sales 120069 − loads 78700 + stock 1223)  I § 36938 (sales 96837 − loads 59898, binds carry)  I/G 0.867
      s  6 t 690:10 rung 3 ran 6.0 h: G § 37298 (sales 111019 − loads 74739 + stock 1018)  I § 36690 (sales 96108 − loads 59419, binds carry)  I/G 0.984
      s  7 t 690:15 rung 3 ran 6.0 h: G § 42014 (sales 115602 − loads 75259 + stock 1671)  I § 36441 (sales 95380 − loads 58940, binds carry)  I/G 0.867
      s  8 t 690:53 rung 3 ran 6.0 h: G § 44190 (sales 123023 − loads 79617 + stock 784)  I § 36690 (sales 96108 − loads 59419, binds carry)  I/G 0.830
      s  9 t 690:04 rung 3 ran 6.0 h: G § 42799 (sales 121706 − loads 79482 + stock 574)  I § 36441 (sales 95380 − loads 58940, binds carry)  I/G 0.851
      s 10 t 690:13 rung 3 ran 6.0 h: G § 37581 (sales 111846 − loads 76002 + stock 1737)  I § 36690 (sales 96108 − loads 59419, binds carry)  I/G 0.976
   day3  I/G in 0.9-1.1 on 9/10 seeds (printed, not gated); I/G med 0.912, min 0.898, max 0.956
      s  1 t 2190:48 rung 3 ran 6.0 h: G § 44441 (sales 131104 − loads 87790 + stock 1127)  I § 40922 (sales 108487 − loads 67565, binds carry)  I/G 0.921
      s  2 t 2190:58 rung 3 ran 6.0 h: G § 43206 (sales 126989 − loads 85370 + stock 1586)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.907
      s  3 t 2191:02 rung 3 ran 6.0 h: G § 42692 (sales 125347 − loads 83646 + stock 991)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.918
      s  4 t 2190:17 rung 3 ran 6.0 h: G § 43625 (sales 128064 − loads 85301 + stock 862)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.898
      s  5 t 2191:15 rung 3 ran 6.0 h: G § 41954 (sales 121947 − loads 82379 + stock 2386)  I § 38930 (sales 102662 − loads 63732, binds carry)  I/G 0.928
      s  6 t 2190:21 rung 3 ran 6.0 h: G § 42981 (sales 125739 − loads 84016 + stock 1259)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.912
      s  7 t 2190:24 rung 3 ran 6.0 h: G § 41682 (sales 123237 − loads 82954 + stock 1399)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.940
      s  8 t 2191:32 rung 3 ran 6.0 h: G § 43036 (sales 126429 − loads 84951 + stock 1558)  I § 39179 (sales 103390 − loads 64211, binds carry)  I/G 0.910
      s  9 t 2190:19 rung 3 ran 6.0 h: G § 45415 (sales 132182 − loads 87995 + stock 1228)  I § 40922 (sales 108487 − loads 67565, binds carry)  I/G 0.901
      s 10 t 2190:25 rung 3 ran 6.0 h: G § 44605 (sales 131764 − loads 89114 + stock 1955)  I § 42664 (sales 113584 − loads 70919, binds carry)  I/G 0.956
   GATE (14.5): 7/20 moments within 0.9-1.1 (aim at least 17 of 20), 2 outside 0.85-1.15 (aim none): NOT MET

run time: 4427 s of CPU over 130 runs

--- F2: seeds 401-405, never used before: --seeds 5 --first 401 --routes 2 --only beats,gate (25 runs) ---
REPORT7 tables (the real rules, 5 seeds: 401..405), generated by scripts/content/yard-bot.ts

0. HARD PROMISES (8.3) on 25 runs: none broken; tick = jump minute by minute on 5 runs: equal
   presses refused (all runs): {}
   cards locked by the capacity ceiling in the hour (8.4: at most once): max 0 items on a run; runs with more than one: 0/25; in three days: 

1. BEATS (1.2, 1.3): range, median, share in band
 beat 2 the washer apart (aim about 0:12; band shown 0:15) [0:00-0:15]
   normal goal A  0:11 to 0:13, med 0:11, 5/5 in band
   normal all A   0:11 to 0:13, med 0:11, 5/5 in band
   normal goal B  0:34 to 0:38, med 0:36, 0/5 in band
   brisk goal A   0:10 to 0:11, med 0:10, 5/5 in band
   slow goal A    0:13 to 0:18, med 0:14, 3/5 in band
 beat 3 first collection ticket [0:00-0:25]
   normal goal A  0:19 to 0:22, med 0:20, 5/5 in band
   normal all A   0:19 to 0:22, med 0:20, 5/5 in band
   normal goal B  0:24 to 0:27, med 0:26, 5/5 in band
   brisk goal A   0:17 to 0:18, med 0:17, 5/5 in band
   slow goal A    0:24 to 0:27, med 0:25, 1/5 in band
 beat 4 at the stripper (aim about 0:30; band shown 0:35) [0:00-0:35]
   normal goal A  0:30 to 0:34, med 0:33, 5/5 in band
   normal all A   0:30 to 0:34, med 0:33, 5/5 in band
   normal goal B  0:07 to 0:10, med 0:08, 5/5 in band
   brisk goal A   0:25 to 0:27, med 0:25, 5/5 in band
   slow goal A    0:56 to 1:05, med 1:00, 0/5 in band
 beat 5 copper jump [0:00-1:30]
   normal goal A  0:47 to 0:51, med 0:51, 5/5 in band
   normal all A   0:47 to 0:51, med 0:51, 5/5 in band
   normal goal B  0:24 to 0:27, med 0:26, 5/5 in band
   brisk goal A   0:41 to 0:43, med 0:41, 5/5 in band
   slow goal A    1:16 to 1:25, med 1:22, 5/5 in band
 beat 6 first purchase arriving [0:00-2:00]
   normal goal A  1:09 to 1:14, med 1:12, 5/5 in band
   normal all A   1:09 to 1:14, med 1:12, 5/5 in band
   normal goal B  0:51 to 0:55, med 0:54, 5/5 in band
   brisk goal A   0:55 to 0:57, med 0:56, 5/5 in band
   slow goal A    1:31 to 1:43, med 1:37, 5/5 in band
 beat 7 yard hand carrying [0:00-5:00]
   normal goal A  1:41 to 1:54, med 1:46, 5/5 in band
   normal all A   1:14 to 1:50, med 1:18, 5/5 in band
   normal goal B  1:32 to 2:05, med 1:35, 5/5 in band
   brisk goal A   1:29 to 1:32, med 1:31, 5/5 in band
   slow goal A    2:12 to 3:17, med 2:16, 5/5 in band
 beat 8 first rival passed [0:00-5:00]
   normal goal A  3:32 to 3:39, med 3:34, 5/5 in band
   normal all A   3:09 to 3:57, med 3:18, 5/5 in band
   normal goal B  3:05 to 4:01, med 3:08, 5/5 in band
   brisk goal A   2:36 to 2:59, med 2:38, 5/5 in band
   slow goal A    3:59 to 4:42, med 4:04, 5/5 in band
 first drive out (hook) [8:00-10:00]
   normal goal A  7:58 to 9:04, med 8:24, 4/5 in band
   normal all A   7:54 to 8:34, med 8:11, 4/5 in band
   normal goal B  7:47 to 8:36, med 8:04, 3/5 in band
   brisk goal A   6:30 to 7:05, med 6:52, 0/5 in band
   slow goal A    10:08 to 13:14, med 10:37, 0/5 in band
 torch [11:00-15:00]
   normal goal A  13:47 to 14:58, med 14:21, 5/5 in band
   normal all A   13:18 to 14:51, med 14:11, 5/5 in band
   normal goal B  13:38 to 14:47, med 14:28, 5/5 in band
   brisk goal A   12:35 to 13:18, med 12:44, 5/5 in band
   slow goal A    16:32 to 21:15, med 17:35, 0/5 in band
 rung 2 [12:00-18:00]
   normal goal A  12:41 to 14:35, med 13:09, 5/5 in band
   normal all A   12:36 to 13:46, med 13:39, 5/5 in band
   normal goal B  12:46 to 14:23, med 13:57, 5/5 in band
   brisk goal A   11:23 to 12:17, med 12:06, 3/5 in band
   slow goal A    15:45 to 20:22, med 16:29, 3/5 in band
 first pour [18:00-25:00]
   normal goal A  21:26 to 24:30, med 23:07, 5/5 in band
   normal all A   20:20 to 24:55, med 23:40, 5/5 in band
   normal goal B  20:52 to 23:22, med 22:41, 5/5 in band
   brisk goal A   18:33 to 21:17, med 19:41, 5/5 in band
   slow goal A    24:44 to 29:11, med 27:03, 1/5 in band
 rung 3 [55:00-65:00]
   normal goal A  55:19 to 57:49, med 56:42, 5/5 in band
   normal all A   56:38 to 61:10, med 58:41, 5/5 in band
   normal goal B  56:23 to 59:32, med 57:09, 5/5 in band
   brisk goal A   51:50 to 55:10, med 53:52, 1/5 in band
   slow goal A    60:58 to 66:08, med 63:06, 4/5 in band
 slow within 1.5 x normal on the same seed (after 2:00): helperCarrying 4/5, pass1 5/5, drive 3/5, owned:torch 5/5, rung2 4/5, pour 5/5, rung3 5/5
 rivals passed in the hour (normal goal A): min 5, med 5, max 5; first pass med 3:34

2. SALES AND NET A MINUTE BY FIVE-MINUTE WINDOW (median of seeds)
   window             0-5  5-10 10-15 15-20 20-25 25-30 30-35 35-40 40-45 45-50 50-55 55-60 60-65 65-70 70-75 75-80 80-85 85-90
   E28 aim            120   250   450   800  1300  1800  1980  2178  2396  2635  2899  3189
   normal goal A sales   193   278   483   766   743  1033  1508  1405  1559  1698  1604  1957  1800  1714  1999  1961  2060  2108
   normal goal A net   193   248   303   479   115   317   760   291   600   835   410   735   679   579   503   744   757   541
   normal all A sales   206   289   363   666   572  1081  1445  1623  1418  1345  1437  1595  1547  1334  1402  1466  1711  1513
   normal all A net   206   259   363   568   201   248   392   872   599   504   694   674   446   586   470   536   936   399
   normal goal B sales   200   282   485   850   758  1149  1374  1523  1563  1689  1666  1714  1735  1859  2074  1848  2167  2088
   normal goal B net   200   252   293   532   147   406   402   707   616   439   731   600   790   562   813   527  1032   632
   brisk goal A sales   264   337   715   677  1028  1218  1514  1534  1597  1710  1639  2046  2038  2021  2120  1957  2234  2214
   brisk goal A net   264   307   446   298   110   466   700   588   541   663   454   743   901   813   776   789   949   486
   slow goal A sales   165   188   228   580   594   715  1153  1453  1359  1413  1477  1656  1630  1748  1810  1891  1912  1888
   slow goal A net    165   188    77   419   215   158    44   701   460   615   644   484   418   606   564   688   819   577
   normal goal A: windows under the one before (after minute 5): med 2, max 3
   E31c normal goal A : sales 55-60 >= §2,000 a minute on 1/5 (med §1957); a window in minutes 30-60 under the one before: 0/5 runs have none (med 2, max 2)
                        minutes 60-90 (runs played to 90): sales 85-90 med §2108, >= §2,000 on 4/5; windows 60-90 mean §1997 against 55-60 §1957; a window in 60-90 under the one before: med 2, max 3
   E31c normal all A  : sales 55-60 >= §2,000 a minute on 0/5 (med §1595); a window in minutes 30-60 under the one before: 0/5 runs have none (med 3, max 3)
                        minutes 60-90 (runs played to 90): sales 85-90 med §1513, >= §2,000 on 0/5; windows 60-90 mean §1512 against 55-60 §1595; a window in 60-90 under the one before: med 2, max 3
   E31c normal goal B : sales 55-60 >= §2,000 a minute on 0/5 (med §1714); a window in minutes 30-60 under the one before: 0/5 runs have none (med 1, max 3)
                        minutes 60-90 (runs played to 90): sales 85-90 med §2088, >= §2,000 on 3/5; windows 60-90 mean §1980 against 55-60 §1714; a window in 60-90 under the one before: med 2, max 3
   E31c brisk goal A  : sales 55-60 >= §2,000 a minute on 3/5 (med §2046); a window in minutes 30-60 under the one before: 0/5 runs have none (med 2, max 3)
                        minutes 60-90 (runs played to 90): sales 85-90 med §2214, >= §2,000 on 4/5; windows 60-90 mean §2097 against 55-60 §2046; a window in 60-90 under the one before: med 2, max 4
   E31c slow goal A   : sales 55-60 >= §2,000 a minute on 0/5 (med §1656); a window in minutes 30-60 under the one before: 0/5 runs have none (med 1, max 2)
                        minutes 60-90 (runs played to 90): sales 85-90 med §1888, >= §2,000 on 1/5; windows 60-90 mean §1806 against 55-60 §1656; a window in 60-90 under the one before: med 2, max 3

3. THROUGH THE HOUR (normal goal A, median): supplied t, rank, cash §, rated capacity t/h, reserve §
   min  5    0.63 t  rank 25  cash     265  R    3.1  reserve      0
   min 10    1.38 t  rank 25  cash     353  R    3.1  reserve      0
   min 15    3.30 t  rank 24  cash    1286  R    3.1  reserve      0
   min 20    4.56 t  rank 24  cash    1892  R    3.1  reserve      0
   min 25    6.44 t  rank 24  cash     921  R   34.3  reserve   1817
   min 30    8.42 t  rank 23  cash    1407  R   40.4  reserve      0
   min 40   15.52 t  rank 23  cash     764  R   56.8  reserve      0
   min 50   22.81 t  rank 22  cash    2014  R   82.1  reserve    958
   min 60   30.21 t  rank 21  cash    2204  R   82.1  reserve      0
   min 70   38.91 t  rank 21  cash    1538  R   82.1  reserve      0
   min 80   48.81 t  rank 20  cash     563  R   82.1  reserve      0
   min 90   58.33 t  rank 20  cash    1667  R  110.5  reserve    947
   normal goal A: highest rated capacity reached on rung 1 / 2 / 3: 3.1 / 82.1 / 110.5 t/h
   normal all A: highest rated capacity reached on rung 1 / 2 / 3: 3.1 / 56.8 / 56.8 t/h

4. THE GOAL PURCHASES (normal goal A): price, median minute bought, held at its card (cash after the purchase before / price), wait over 3 min
   sack      §    60  1:05  held 0.00  cash at card 7.60 x  walk-to-buy med 8 s max 11 s  waits>3min 0/5 (max 68 s)  bought 5/5
   hand1     §   300  1:42  held 1.32  cash at card 1.36 x  walk-to-buy med 9 s max 10 s  waits>3min 0/5 (max 39 s)  bought 5/5
   sledge    §   340  3:49  held 0.45  cash at card 1.29 x  walk-to-buy med 7 s max 8 s  waits>3min 0/5 (max 151 s)  bought 5/5
   trolley   §   380  6:09  held 0.26  cash at card 1.13 x  walk-to-buy med 8 s max 10 s  waits>3min 0/5 (max 147 s)  bought 5/5
   truck     §   430  7:18  held 0.65  cash at card 1.32 x  walk-to-buy med 9 s max 10 s  waits>3min 0/5 (max 106 s)  bought 5/5
   cutter    §   540  10:07  held 0.39  cash at card 1.28 x  walk-to-buy med 8 s max 9 s  waits>3min 2/5 (max 213 s)  bought 5/5
   torch     §   480  14:15  held 0.31  cash at card 2.13 x  walk-to-buy med 7 s max 7 s  waits>3min 5/5 (max 306 s)  bought 5/5
   stripper  §   700  17:20  held 0.85  cash at card 3.83 x  walk-to-buy med 10 s max 11 s  waits>3min 4/5 (max 195 s)  bought 5/5
   crucible  §   800  18:48  held 2.48  cash at card 1.71 x  walk-to-buy med 11 s max 12 s  waits>3min 0/5 (max 88 s)  bought 5/5
   bench     §   900  23:16  held 0.63  cash at card 2.05 x  walk-to-buy med 8 s max 9 s  waits>3min 5/5 (max 371 s)  bought 5/5
   driver    §  1000  24:28  held 0.94  cash at card 1.65 x  walk-to-buy med 9 s max 10 s  waits>3min 0/5 (max 128 s)  bought 5/5
   cutter2   §  3600  63:03  held 0.18  cash at card 1.23 x  walk-to-buy med 9 s max 10 s  waits>3min 5/5 (max 2314 s)  bought 5/5
   alu       §  1300  56:23  held 0.50  cash at card 1.10 x  walk-to-buy med 7 s max 8 s  waits>3min 2/2 (max 2068 s)  bought 2/5
   walk-to-buy at normal goal A  (every purchase of the hour): med 9 s, max 12 s over 116 purchases
   walk-to-buy at normal all A   (every purchase of the hour): med 9 s, max 14 s over 134 purchases
   walk-to-buy at normal goal B  (every purchase of the hour): med 9 s, max 12 s over 114 purchases
   walk-to-buy at brisk goal A   (every purchase of the hour): med 6 s, max 8 s over 121 purchases
   walk-to-buy at slow goal A    (every purchase of the hour): med 15 s, max 22 s over 108 purchases
   purchase gaps over three minutes (any purchase): s401:7:18+3m,10:34+3m,13:41+3m,18:22+3m,23:33+8m,33:13+4m,37:37+4m,45:57+3m,49:14+3m  s402:9:11+5m,14:15+3m,18:48+4m,24:20+5m,29:21+3m,32:49+3m,37:18+3m,41:28+4m,48:14+6m,53:45+4m  s403:9:46+5m,14:52+3m,19:20+4m,24:28+4m,38:11+3m,42:51+6m,48:36+4m,53:23+3m  s404:7:13+4m,10:46+3m,18:19+5m,25:06+3m,28:16+4m,32:36+4m,37:38+4m,41:41+5m,49:47+3m,53:10+5m  s405:10:07+5m,14:42+3m,19:13+6m,26:51+3m,30:13+4m,40:37+6m,46:44+4m,51:29+4m
   purchase prompts a minute (most in any minute): med 2, max 2
   burst (8.4: at most two ahead by minute 10): habit all ahead of habit goal in goal purchases owned, minutes 1-10: max 1 (seeds over 2: 0/5); minutes 1-30: max 3

   an hour away from minute 60 against an hour played at minute 60's pace (minutes 50-60 x 6): med 0.65, min 0.50 (S13 aim >= 0.3; E19 asks played >= 1.25 x away, i.e. this <= 0.8)
   stop and return (earned on the away card, median; S13: above zero): 5m+1h §2186 (zero on 0), 5m+4h §2186 (zero on 0), 5m+12h §2186 (zero on 0), 10m+1h §2377 (zero on 0), 10m+4h §2377 (zero on 0), 10m+12h §2377 (zero on 0), 15m+1h §5747 (zero on 0), 15m+4h §10995 (zero on 0), 15m+12h §10995 (zero on 0), 30m+1h §17477 (zero on 0), 30m+4h §48428 (zero on 0), 30m+12h §48428 (zero on 0)

   E33 THE BURST (normal goal A, median): the away card, how long the yard ran, cash after it, and how much of the goal list that buys at once
   5m+1h    away §  2186  ran   30 min  cash §  2423  buys 2 of 8 goal purchases left (§810 of §5230; max 2)  deal deliveries 0
   5m+4h    away §  2186  ran   30 min  cash §  2423  buys 2 of 8 goal purchases left (§810 of §5230; max 2)  deal deliveries 0
   5m+12h   away §  2186  ran   30 min  cash §  2423  buys 2 of 8 goal purchases left (§810 of §5230; max 2)  deal deliveries 0
   10m+4h   away §  2377  ran   30 min  cash §  2703  buys 3 of 6 goal purchases left (§1980 of §4420; max 4)  deal deliveries 0
   15m+1h   away §  5747  ran   60 min  cash §  7048  buys 4 of 4 goal purchases left (§3400 of §3400; max 4)  deal deliveries 0
   15m+4h   away § 10995  ran  120 min  cash § 12281  buys 4 of 4 goal purchases left (§3400 of §3400; max 4)  deal deliveries 0
   15m+12h  away § 10995  ran  120 min  cash § 12281  buys 4 of 4 goal purchases left (§3400 of §3400; max 4)  deal deliveries 0
   30m+4h   away § 48428  ran  120 min  cash §  7460  buys 0 of 0 goal purchases left (§0 of §0; max 0)  deal deliveries 0
   30m+12h  away § 48428  ran  120 min  cash §  7460  buys 0 of 0 goal purchases left (§0 of §0; max 0)  deal deliveries 0
   the Night watch's worth: what it adds to one 12 h absence (median, min-max): 15m+12h §11435 (10351-12769), 30m+12h §68335 (60401-69599), 60m+12h §148500 (115061-169324)

P20. MINUTES 5 TO 10 AT A PERSON'S HAND: what a minute of the boss's own work pays (today's value weighed by him / 5), the walks on foot
   normal goal A  § a minute of his work: med 236 (range 214-309); longest walk med 40.6 m / 10 s (max 41.7 m); share of the five minutes on foot med 25 %
   normal all A   § a minute of his work: med 231 (range 173-295); longest walk med 40.6 m / 10 s (max 41.7 m); share of the five minutes on foot med 25 %
   normal goal B  § a minute of his work: med 238 (range 228-299); longest walk med 40.6 m / 10 s (max 41.7 m); share of the five minutes on foot med 24 %
   brisk goal A   § a minute of his work: med 302 (range 238-379); longest walk med 15.5 m / 4 s (max 34.9 m); share of the five minutes on foot med 22 %
   slow goal A    § a minute of his work: med 197 (range 131-292); longest walk med 46.2 m / 12 s (max 47.3 m); share of the five minutes on foot med 31 %


run time: 430 s of CPU over 25 runs

--- F3: the normal hand to minute 90 with no runs at all (group.fromRung 99), 15 seeds ---
REPORT7 tables (the real rules, 15 seeds: 1..15), generated by scripts/content/yard-bot.ts

0. HARD PROMISES (8.3) on 15 runs: none broken; tick = jump minute by minute on 0 runs: equal
   presses refused (all runs): {}
   cards locked by the capacity ceiling in the hour (8.4: at most once): max 0 items on a run; runs with more than one: 0/15; in three days: 

1. BEATS (1.2, 1.3): range, median, share in band
 beat 2 the washer apart (aim about 0:12; band shown 0:15) [0:00-0:15]
   normal goal A  0:11 to 0:14, med 0:12, 15/15 in band
 beat 3 first collection ticket [0:00-0:25]
   normal goal A  0:19 to 0:25, med 0:20, 14/15 in band
 beat 4 at the stripper (aim about 0:30; band shown 0:35) [0:00-0:35]
   normal goal A  0:31 to 0:42, med 0:34, 9/15 in band
 beat 5 copper jump [0:00-1:30]
   normal goal A  0:48 to 1:08, med 0:52, 15/15 in band
 beat 6 first purchase arriving [0:00-2:00]
   normal goal A  1:08 to 1:15, med 1:11, 15/15 in band
 beat 7 yard hand carrying [0:00-5:00]
   normal goal A  1:43 to 1:59, med 1:52, 15/15 in band
 beat 8 first rival passed [0:00-5:00]
   normal goal A  3:12 to 3:43, med 3:34, 15/15 in band
 first drive out (hook) [8:00-10:00]
   normal goal A  7:45 to 8:44, med 8:16, 14/15 in band
 torch [11:00-15:00]
   normal goal A  12:21 to 16:02, med 14:17, 12/15 in band
 rung 2 [12:00-18:00]
   normal goal A  11:53 to 14:20, med 12:42, 14/15 in band
 first pour [18:00-25:00]
   normal goal A  19:20 to 26:41, med 22:54, 14/15 in band
 rung 3 [55:00-65:00]
   normal goal A  54:50 to 59:21, med 57:08, 14/15 in band
 rivals passed in the hour (normal goal A): min 4, med 5, max 5; first pass med 3:34

2. SALES AND NET A MINUTE BY FIVE-MINUTE WINDOW (median of seeds)
   window             0-5  5-10 10-15 15-20 20-25 25-30 30-35 35-40 40-45 45-50 50-55 55-60 60-65 65-70 70-75 75-80 80-85 85-90
   E28 aim            120   250   450   800  1300  1800  1980  2178  2396  2635  2899  3189
   normal goal A sales   201   256   488   729   822  1108  1367  1538  1548  1619  1660  1720  1801  1967  1937  1971  1972  2080
   normal goal A net   201   226   293   341   233   410   494   594   428   589   441   582   667   809   800   743   696   765
   normal goal A: windows under the one before (after minute 5): med 2, max 4
   E31c normal goal A : sales 55-60 >= §2,000 a minute on 0/15 (med §1720); a window in minutes 30-60 under the one before: 1/15 runs have none (med 2, max 3)
                        minutes 60-90 (runs played to 90): sales 85-90 med §2080, >= §2,000 on 10/15; windows 60-90 mean §1930 against 55-60 §1720; a window in 60-90 under the one before: med 2, max 4

3. THROUGH THE HOUR (normal goal A, median): supplied t, rank, cash §, rated capacity t/h, reserve §
   min  5    0.61 t  rank 25  cash     305  R    3.1  reserve      0
   min 10    1.50 t  rank 25  cash     503  R    3.1  reserve      0
   min 15    3.32 t  rank 24  cash    1093  R    3.1  reserve      0
   min 20    4.71 t  rank 24  cash    1480  R    3.1  reserve      0
   min 25    6.63 t  rank 24  cash    1206  R   34.3  reserve      0
   min 30    8.89 t  rank 23  cash    1817  R   40.4  reserve    960
   min 40   15.40 t  rank 23  cash    1994  R   56.8  reserve      0
   min 50   22.39 t  rank 22  cash    1358  R   82.1  reserve    949
   min 60   29.65 t  rank 21  cash    3001  R   82.1  reserve    940
   min 70   37.78 t  rank 21  cash    1914  R   82.1  reserve      0
   min 80   47.27 t  rank 20  cash    2508  R   82.1  reserve      0
   min 90   56.33 t  rank 20  cash    1882  R   82.1  reserve    938
   normal goal A: highest rated capacity reached on rung 1 / 2 / 3: 3.1 / 82.1 / 110.5 t/h

4. THE GOAL PURCHASES (normal goal A): price, median minute bought, held at its card (cash after the purchase before / price), wait over 3 min
   sack      §    60  1:04  held 0.00  cash at card 7.54 x  walk-to-buy med 7 s max 8 s  waits>3min 0/15 (max 70 s)  bought 15/15
   hand1     §   300  1:43  held 1.31  cash at card 1.36 x  walk-to-buy med 9 s max 13 s  waits>3min 0/15 (max 48 s)  bought 15/15
   sledge    §   340  3:37  held 0.44  cash at card 1.20 x  walk-to-buy med 7 s max 8 s  waits>3min 0/15 (max 138 s)  bought 15/15
   trolley   §   380  5:48  held 0.18  cash at card 1.12 x  walk-to-buy med 7 s max 8 s  waits>3min 0/15 (max 157 s)  bought 15/15
   truck     §   430  7:09  held 0.26  cash at card 1.13 x  walk-to-buy med 9 s max 11 s  waits>3min 0/15 (max 94 s)  bought 15/15
   cutter    §   540  10:13  held 0.21  cash at card 1.18 x  walk-to-buy med 9 s max 12 s  waits>3min 6/15 (max 235 s)  bought 15/15
   torch     §   480  14:11  held 0.20  cash at card 1.96 x  walk-to-buy med 7 s max 8 s  waits>3min 10/15 (max 342 s)  bought 15/15
   stripper  §   700  17:04  held 0.72  cash at card 3.66 x  walk-to-buy med 9 s max 11 s  waits>3min 7/15 (max 236 s)  bought 15/15
   crucible  §   800  18:30  held 2.33  cash at card 1.74 x  walk-to-buy med 10 s max 13 s  waits>3min 0/15 (max 137 s)  bought 15/15
   bench     §   900  23:03  held 0.72  cash at card 2.01 x  walk-to-buy med 7 s max 11 s  waits>3min 12/15 (max 369 s)  bought 15/15
   driver    §  1000  24:31  held 1.08  cash at card 1.75 x  walk-to-buy med 9 s max 10 s  waits>3min 2/15 (max 343 s)  bought 15/15
   cutter2   §  3600  60:35  held 0.24  cash at card 1.21 x  walk-to-buy med 9 s max 11 s  waits>3min 15/15 (max 2383 s)  bought 15/15
   alu       §  1300  60:10  held 0.84  cash at card 2.52 x  walk-to-buy med 8 s max 8 s  waits>3min 1/1 (max 2139 s)  bought 1/15
   walk-to-buy at normal goal A  (every purchase of the hour): med 9 s, max 13 s over 342 purchases
   purchase gaps over three minutes (any purchase): s1:10:02+5m,15:24+3m,20:02+5m,25:23+3m,29:53+3m,33:14+3m,40:21+6m,46:57+4m  s2:10:09+3m,13:11+3m,18:09+3m,22:55+7m,29:25+4m,37:50+4m,41:43+5m,50:24+4m  s3:8:58+5m,13:48+3m,18:21+5m,23:27+6m,36:20+3m,40:14+3m,49:34+3m,53:02+4m  s4:9:57+5m,14:29+4m,19:39+4m,24:48+4m,39:06+4m,42:44+3m,49:31+3m  s5:17:10+6m,23:44+6m,33:59+3m,41:12+3m,45:25+4m,49:43+3m  s6:7:04+4m,20:42+5m,25:29+5m,30:33+3m,34:40+3m,38:21+4m,45:51+4m,51:30+4m,55:38+4m  s7:7:20+3m,10:33+5m,19:15+5m,25:23+5m,30:06+7m,36:52+4m,47:25+5m  s8:7:13+3m,17:26+3m,23:15+6m,36:20+4m,44:01+4m,48:02+3m,51:24+4m  s9:6:56+3m,10:21+4m,22:03+4m,26:38+4m,31:28+4m,35:55+4m,40:09+4m,43:48+4m,48:41+4m,52:56+7m  s10:10:04+5m,14:45+4m,20:07+5m,25:07+5m,30:13+4m,37:42+6m  s11:6:37+4m,16:54+5m,22:19+4m,45:00+3m,48:19+4m  s12:7:22+3m,18:03+5m,24:47+5m,30:10+4m,33:47+5m,38:46+4m,46:46+6m,52:17+4m  s13:9:41+5m,14:35+3m,19:03+5m,24:31+5m,29:23+4m,39:58+4m,44:14+8m,51:54+4m  s14:10:13+6m,15:56+3m,20:41+6m,27:36+4m,31:39+4m,36:54+6m,42:31+3m,45:52+5m,53:53+5m  s15:9:41+4m,22:10+5m,27:05+5m,32:29+4m,36:28+4m,45:04+4m,49:13+4m,53:44+5m
   purchase prompts a minute (most in any minute): med 2, max 2

   an hour away from minute 60 against an hour played at minute 60's pace (minutes 50-60 x 6): med 0.55, min 0.43 (S13 aim >= 0.3; E19 asks played >= 1.25 x away, i.e. this <= 0.8)
   stop and return (earned on the away card, median; S13: above zero): 5m+1h §2175 (zero on 0), 5m+4h §2175 (zero on 0), 5m+12h §2175 (zero on 0), 10m+1h §2613 (zero on 0), 10m+4h §2613 (zero on 0), 10m+12h §2613 (zero on 0), 15m+1h §6742 (zero on 0), 15m+4h §12227 (zero on 0), 15m+12h §12227 (zero on 0), 30m+1h §19248 (zero on 0), 30m+4h §47822 (zero on 0), 30m+12h §47822 (zero on 0)

   E33 THE BURST (normal goal A, median): the away card, how long the yard ran, cash after it, and how much of the goal list that buys at once
   5m+1h    away §  2175  ran   30 min  cash §  2586  buys 2 of 8 goal purchases left (§810 of §5230; max 5)  deal deliveries 0
   5m+4h    away §  2175  ran   30 min  cash §  2586  buys 2 of 8 goal purchases left (§810 of §5230; max 5)  deal deliveries 0
   5m+12h   away §  2175  ran   30 min  cash §  2586  buys 2 of 8 goal purchases left (§810 of §5230; max 5)  deal deliveries 0
   10m+4h   away §  2613  ran   30 min  cash §  3161  buys 4 of 6 goal purchases left (§2520 of §4420; max 5)  deal deliveries 0
   15m+1h   away §  6742  ran   60 min  cash §  8503  buys 4 of 4 goal purchases left (§3400 of §3400; max 5)  deal deliveries 0
   15m+4h   away § 12227  ran  120 min  cash § 12837  buys 4 of 4 goal purchases left (§3400 of §3400; max 5)  deal deliveries 0
   15m+12h  away § 12227  ran  120 min  cash § 12837  buys 4 of 4 goal purchases left (§3400 of §3400; max 5)  deal deliveries 0
   30m+4h   away § 47822  ran  120 min  cash §  5257  buys 0 of 0 goal purchases left (§0 of §0; max 0)  deal deliveries 0
   30m+12h  away § 47822  ran  120 min  cash §  5257  buys 0 of 0 goal purchases left (§0 of §0; max 0)  deal deliveries 0
   the Night watch's worth: what it adds to one 12 h absence (median, min-max): 15m+12h §10288 (9408-12456), 30m+12h §66380 (54114-111877), 60m+12h §132492 (120385-175820)

P20. MINUTES 5 TO 10 AT A PERSON'S HAND: what a minute of the boss's own work pays (today's value weighed by him / 5), the walks on foot
   normal goal A  § a minute of his work: med 227 (range 164-295); longest walk med 41.0 m / 10 s (max 51.9 m); share of the five minutes on foot med 26 %


run time: 298 s of CPU over 15 runs

--- F4: part G per seed (g2days7.mts; ahead / trip by trip / no runs; percentages are ahead against the named column) ---
| seed | d1 t ahead/trip/none | d1 earned ahead/trip/none | d3 t ahead/trip/none | d3 earned ahead/trip/none | ahead vs trip d1 t, d1 e, d3 t, d3 e | noise (ahead vs ahead x(1+1e-9)) same four | ahead vs none d1 t, d1 e, d3 t, d3 e |
| 1 | 472.8 / 471.8 / 422.1 | 1036437 / 1044947 / 937895 | 1899.7 / 1842.3 / 1638.5 | 4198993 / 4189956 / 3716770 | +0.23 %, -0.81 %, +3.12 %, +0.22 % | -3.79 %, -3.65 %, -2.08 %, -2.09 % | +12.03 %, +10.51 %, +15.94 %, +12.97 % |
| 2 | 482.9 / 480.2 / 427.1 | 1066104 / 1064498 / 953217 | 1917.9 / 1853.5 / 1660.7 | 4249190 / 4212234 / 3756626 | +0.56 %, +0.15 %, +3.48 %, +0.88 % | +0.39 %, +0.53 %, -0.68 %, -1.19 % | +13.06 %, +11.84 %, +15.49 %, +13.11 % |
| 3 | 467.2 / 474.9 / 424.5 | 1037173 / 1079624 / 969608 | 1894.5 / 1854.2 / 1663.7 | 4161805 / 4206410 / 3760436 | -1.62 %, -3.93 %, +2.18 %, -1.06 % | -3.06 %, -4.71 %, -1.79 %, -3.41 % | +10.05 %, +6.97 %, +13.87 %, +10.67 % |
| 4 | 494.7 / 475.5 / 410.2 | 1095271 / 1058598 / 916008 | 1940.4 / 1873.0 / 1669.4 | 4329557 / 4221348 / 3747996 | +4.03 %, +3.46 %, +3.60 %, +2.56 % | +0.99 %, +0.71 %, +1.18 %, +2.81 % | +20.59 %, +19.57 %, +16.23 %, +15.52 % |
| 5 | 515.2 / 465.5 / 424.8 | 1162941 / 1050054 / 1001474 | 1961.8 / 1930.0 / 1647.0 | 4406521 / 4375283 / 3862582 | +10.68 %, +10.75 %, +1.65 %, +0.71 % | +0.25 %, +0.16 %, -0.19 %, +0.97 % | +21.29 %, +16.12 %, +19.11 %, +14.08 % |
| 6 | 440.3 / 448.4 / 471.8 | 1004009 / 1030042 / 1114652 | 1859.7 / 1963.5 / 1697.1 | 4150668 / 4491168 / 3985187 | -1.82 %, -2.53 %, -5.28 %, -7.58 % | -1.48 %, -1.50 %, -0.08 %, +0.31 % | -6.68 %, -9.93 %, +9.58 %, +4.15 % |
| 7 | 478.5 / 458.9 / 426.1 | 1055854 / 1029650 / 955775 | 1873.8 / 1793.3 / 1619.8 | 4181218 / 4169798 / 3754273 | +4.27 %, +2.54 %, +4.49 %, +0.27 % | -1.29 %, -0.93 %, -3.35 %, -4.06 % | +12.31 %, +10.47 %, +15.68 %, +11.37 % |
| 8 | 493.2 / 483.9 / 427.7 | 1102492 / 1085570 / 962428 | 1945.9 / 1845.0 / 1643.0 | 4395205 / 4274304 / 3794350 | +1.92 %, +1.56 %, +5.46 %, +2.83 % | -0.13 %, +0.08 %, -0.65 %, -0.73 % | +15.32 %, +14.55 %, +18.43 %, +15.84 % |
| 9 | 484.0 / 472.8 / 416.0 | 1066321 / 1050225 / 933013 | 1934.5 / 1832.6 / 1656.7 | 4326321 / 4214311 / 3795163 | +2.35 %, +1.53 %, +5.56 %, +2.66 % | +1.96 %, +1.64 %, +0.59 %, +0.06 % | +16.33 %, +14.29 %, +16.77 %, +14.00 % |
| 10 | 475.7 / 472.2 / 428.2 | 1068931 / 1067627 / 961276 | 1953.6 / 1832.1 / 1642.0 | 4365736 / 4206508 / 3764473 | +0.73 %, +0.12 %, +6.63 %, +3.79 % | -0.37 %, +0.18 %, +2.12 %, +2.12 % | +11.10 %, +11.20 %, +18.98 %, +15.97 % |
| 11 | 481.7 / 482.1 / 412.5 | 1090356 / 1097722 / 950045 | 1914.2 / 1849.4 / 1653.3 | 4284316 / 4241456 / 3778427 | -0.10 %, -0.67 %, +3.51 %, +1.01 % | -0.03 %, +0.13 %, -1.18 %, -2.25 % | +16.77 %, +14.77 %, +15.78 %, +13.39 % |
| 12 | 446.4 / 449.7 / 417.0 | 990668 / 1011220 / 939301 | 1892.2 / 1790.0 / 1628.6 | 4246633 / 4098392 / 3713578 | -0.72 %, -2.03 %, +5.71 %, +3.62 % | +1.03 %, +0.90 %, +1.57 %, +2.87 % | +7.06 %, +5.47 %, +16.19 %, +14.35 % |
| 13 | 440.4 / 450.9 / 419.9 | 999795 / 1041080 / 968918 | 1854.1 / 1805.9 / 1723.0 | 4194037 / 4202503 / 3997623 | -2.34 %, -3.97 %, +2.67 %, -0.20 % | -1.52 %, -1.26 %, -1.50 %, -2.06 % | +4.88 %, +3.19 %, +7.60 %, +4.91 % |
| 14 | 467.9 / 468.9 / 426.0 | 1049461 / 1056887 / 960639 | 1940.7 / 1817.6 / 1648.7 | 4402860 / 4181574 / 3772959 | -0.21 %, -0.70 %, +6.77 %, +5.29 % | -6.26 %, -6.11 %, -1.19 %, -0.41 % | +9.85 %, +9.25 %, +17.71 %, +16.70 % |
| 15 | 490.8 / 478.0 / 424.1 | 1107662 / 1086601 / 973671 | 1914.6 / 1842.4 / 1648.7 | 4300535 / 4282879 / 3825276 | +2.70 %, +1.94 %, +3.92 %, +0.41 % | +2.87 %, +3.00 %, -1.54 %, -1.37 % | +15.75 %, +13.76 %, +16.13 %, +12.42 % |
MEAN ahead vs trip by trip (gate 14.9: mean within 2 % for earnings, 5 % for tonnes): d1_t +1.38 % (se 0.84); d1_e +0.49 % (se 0.93); d3_t +3.56 % (se 0.75); d3_e +1.03 % (se 0.76)
MEAN noise floor (ahead vs itself with cutters x(1+1e-9)): d1_t -0.70 % (se 0.60); d1_e -0.72 % (se 0.63); d3_t -0.59 % (se 0.38); d3_e -0.56 % (se 0.55)
MEAN ahead vs no runs (the rule itself, reported): d1_t +11.98 % (se 1.77); d1_e +10.14 % (se 1.80); d3_t +15.57 % (se 0.82); d3_e +12.63 % (se 0.95)
broken promises: 0
```
