# Scrapyard: the bots' measurement of the first yard (REPORT6, 25 November)

This is the balance bot's report on the game as it went to the owner: 15 seeds on two opening routes and five
seeds never used before, on the real rules and the real content after the review's fixes and the map's move.
The lead's rulings on what it misses are E36 in `yard-decisions.md`. The commands at its head reproduce it.
Paths that begin "(working folder)" or "scratchpad" name the build's working notes, which are not in the
repository.

```text
REPORT6: THE BOTS ON THE NEW MAP AND THE FIXED RULES OF THE FIRST YARD (measure, 25 November, 20:35-22:10)
==========================================================================================================
Program: src/engine/salvage/bot.ts (bot.test.ts), scripts/content/yard-bot.ts. Content: src/config/salvage.content.ts ->
games/scrap-yard/game.json (build-yard.py). Section F is yard-bot.ts's output as printed, nothing hand-edited
(scratchpad yard/bots/full6g.txt and unseen6g.txt, every run's summary in full6g.json / unseen6g.json; the game
snapshot bots/snap6g.json = game.json of 22:00, with join2's office and join3's advice line).

Commands: npx tsx scripts/content/yard-bot.ts --seeds 15 --routes 2 --report          (99 runs)
          npx tsx scripts/content/yard-bot.ts --seeds 5 --first 201 --routes 2 --only beats,gate   (5 seeds never used before)
          (--handFirst: the what-if of section C3; bots/bind.ts: what binds in minutes 40-60)

VERDICT. On the new map and the fixed rules the opening is quick and true: all eight storyboard beats are in their
bands for the normal hand on 14-15 seeds of 15 (beat 4, "at the stripper", 0:34 median, is a few seconds past its
"about 0:30"); the first drive (8:16), the torch (14:17), rung 2 (12:42), the first pour (22:54) and rung 3 (57:18)
are in band on 12 to 15 of 15 and on the five new seeds; no hard promise breaks on 124 runs; tick = jump every
minute. The walk to buy is short now (median 9 s from deciding to the press, at most 13 s). What MISSES: E31c
(sales at 55-60 are a median §1,757 a minute, not §2,000; two windows after minute 30 fall below the one before
on a median run); E33's burst at 15 min + 12 h (the yard runs two hours on rung 2 and the card buys the four goal
purchases left at once); the slow hand's first drive (within 1.5 x on 11/15, E24 asks 9 of 10); Hold (the
day-word holder -4 % to -39 %: dead absences, section C5).

A. WHAT CHANGED IN THE BOTS (the new map and the new rules)
   A1 the back wall (map.north) is one solid across the yard in the path graph; the parked truck is kept clear on
      foot (walking within truck.enter got the boss in); a door (join2's map.places.office.door) is the only side
      a card opens from; nothing a person cannot reach (a floor slot outside the yard) is a source, and a thumb
      that gets nowhere lets go (one leg once walked 20,000 s at a point outside the yard).
   A2 the truck: the boss drives at truck.bossV (9 m/s, P10); in the yard along map.driveLine.stops (gate,
      weighbridge, floor, turn, park); a boss who finds himself in the truck (he walked into it as it arrived,
      beside the scale) drives it to the park and steps out (the slow hand sat 70 minutes in it before).
   A3 W9: a thing's tier is its NEXT piece's (tierOf: the car's wheels and loom by hand, the converter with the
      torch); a stripped shell is nobody's work. Zones are worked only once seen on screen (a 21 x 14 m view
      round the boss) or named by the goal card: the bots used to know where every washer was.
   A4 the cable bundle stands 1.9 m from the platform scale since the map moved: a spot beside it on the
      scale's ground only weighs (hand.ts), so the bots step past it, as a person would. The first bot run on the
      new map stood there for an hour (§207 earned).
   A5 the drop-off's opening list, the yard hand's new duties (P11), E33 and E34 are the rules' own: the bots
      play through them unchanged; the report adds the storyboard's beats 2, 4 and 8, cash at the card and the
      walk to buy (P20), the E31c lines, the E33 burst and the Night watch's worth, minutes 5-10 at a person's hand.

B. WHAT CHANGED IN THE CONTENT (three rounds; salvage.content.ts "$changes", first line)
   round 1: ladder.rungs n 2 2.2 -> 2.4 t (E31d's 2.4 had been written to ladder.rung2 only, and the engine reads
     ladder.rungs: rung 2 was still at 2.2; build-yard.py now refuses the two disagreeing); levels.floor 1500 ->
     1100; partners fill_s 120 -> 100 and 180 -> 150 again (bots5's measured values had not reached the file).
   round 2: the Night watch §2,800 -> §24,000 (E33 with E13); rung 3 -> 23.5 t.
   round 3 (after join3's advice line lifted the late hour): rung 3 -> 27.5 t (29.4 t were supplied by minute 60,
     rung 3 came at 51:40); the Night watch -> §36,000 (one twelve-hour absence from minute 60 gains a median
     §106k from it, min §64k: it pays back in its first night and is still saved for).
   guard (E30, not a tuning round): ceilings_t_h rung 2 90 -> 110 t/h (1.3 x the 82 t/h the normal hand now
     reaches on rung 2; 90 refused a partner level near minute 55 on 10 of 75 runs; after: 0 of 15).
   Not changed: the goal prices (each purchase is held at its card 1.1 to 3.7 x its price, walk-to-buy 7-10 s),
     rival.1's tonnes (beat 8 lands at a median 3:34, all seeds by 3:48: no change needed), the away caps (E33's
     ruled [0.5, 2, 4]).

C. THE AIMS, MET OR MISSED (normal hand, goal habit, route A, 15 seeds; "new" = seeds 201-205)
   C1 MET  the storyboard: beat 2 the washer apart 0:12 (15/15 within 0:15), 3 first ticket 0:20 (14/15 <= 0:25),
          4 at the stripper 0:34 (9/15 within 0:35, aim "about 0:30"), 5 copper 0:52 (15/15 <= 1:30), 6 the sack
          truck arriving 1:11 (15/15 <= 2:00), 7 yard hand carrying 1:52 (15/15 <= 5:00), 8 first rival 3:34 (15/15
          <= 5:00); new seeds the same. Route B's first ticket is its copper ticket at 0:26 (15/15 <= 0:35).
   C2 MET  first drive 8:16 (14/15; new 5/5), torch 14:17 (12/15; new 4/5), rung 2 12:42 (14/15; new 5/5), first
          pour 22:54 (13/15; new 5/5; the buy-everything habit 24:04, 10/15: R5's ruling gives the band to the goal
          habit), rung 3 57:18 (15/15; new 4/5), four to five rivals in the hour, no hard promise broken, the
          buy-everything habit at most one goal purchase ahead by minute 10, the hand 11.5 x the card manager,
          the no-hand yard reaches the next goal purchase from every state after the first hire, an hour away
          0.53 of an hour played (S13 >= 0.3, E19 <= 0.8), three days with a purchase at 16 of 18 sittings.
   C3 MISSED E31c: sales a minute by window 201 256 472 753 814 1162 1350 1516 1544 1638 1549 1757 (aim >= 2,000 at
          55-60; 0/15 reach it, median §1,757; a window after minute 30 below the one before on 14/15 runs, median
          two). History: on this map with the old advice line the late hour stayed at §1,346: the advice named the
          cutter's level while 2.2 t of cut pieces waited on the floor for the yard hands (measured what-if
          --handFirst: 55-60 rose to §1,779); join3 put the carry backlog into binding() at 21:31, and the hour
          rose to §1,757. Now (bots/bind.ts, minutes 40-60, seed 1) the cutter is busy 100 % and the driver 84 %
          with a full skip waiting at a site most of the time: the one truck and the cutting bind. What it would
          take: crew.driver.lev 0.15 -> 0.25 (as E31b gave the cutter and the hand; with E31a a level shortens the
          whole round) and cutter levels priced to be bought (floor 1100), measured; or the second truck (stage 2
          by E31c). The dips are lumpy: one load more or less in a window.
   C4 MISSED E33 at 15 minutes: 5 min + 4 h pays §2,175 (the yard ran 30 min) and buys 2 of the 8 goal purchases
          left: saved for, as E33 wants. But 15 min + 4 h or + 12 h (rung 2 reached at about 12:40, so the cap is
          two hours) pays §12,227 and buys all four goal purchases left (§3,400) with §9k to spare; 10 min + 4 h
          buys 4 of 6. What it would take: rung 2's cap at about 35 minutes (§3,400 at the rung-2 away rate of
          about §100 a minute), or the goal list's last four priced for it: the ruling's [0.5, 2, 4] is kept.
   C5 MISSED Hold (R5): the day-word holder against the same days without Hold: -38.8 %, -4.4 %, -10.0 % (aim
          <= +3 %). Why (bots/days2.ts, seed 1, on the 21:44 game): at the end of sitting 2 the holder has held all
          14 bays (a low day for each) and spent to §524; the next 11.75 h away pays §0 (every bay held, so the
          merchant takes nothing; §524 buys no load; li 938 -> 10,894 kg into a held bay) and the one after
          §1,163. E32's release (the first high day, or two market days) comes only in sitting 4: the market day
          did not turn during the first dead absence, so a one-day limit alone would not save it. What would: the
          away pass lets held bays go when the cash is below the next load's price, or Hold holds one grade at a
          time. The lead's call (requests.md 22:00).
   C6 NEAR  the slow hand within 1.5 x the normal hand on the same seed after 2:00: helperCarrying 13/15, pass1
          15/15, drive 11/15, torch 13/15, rung 2 13/15, pour 15/15, rung 3 15/15 (E24: nine pairs of ten per
          beat: the first drive misses, median 10:46 against 8:16; the slow hand fetches the trial load when its
          own reactions let it). The brisk hand is early everywhere (rung 3 at 53:18), as R5's ruling allows.
   C7 READ  P20, minutes 5 to 10 at a person's hand: a minute of the boss's own work pays a median §227 (normal;
          brisk §282, slow §192), a quarter of the five minutes is on foot; the longest walk is a median 41 m
          (about 14 s): to zone 2's radiators (the goal "Break up the radiators") and, once zone 3 is in view from
          there, to the car, whose wheels and loom are hand work since W9 (four alloy wheels, §200). The walk to
          buy anything is 7-10 s (rack and office at 9.8 and about 16 m of the scale). The rack and the office are
          no longer the long walks; zones 2 and 3 are.
   C8 READ  E13e cash: at minute 60 §3,001 (under two minutes of income); after three days §115k-355k against a
          day's income of §1.2-1.3M; two sittings of 18 (day 3's last) bought nothing with §309k: the shop is
          bought out by then (levels' prices outrun the day's income), not locked.
   C9 READ  the Night watch's worth (what it adds to one twelve-hour absence): from minute 15 §10k, from minute 30
          §43k (28k-100k), from minute 60 §106k (64k-151k) on the 22:00 game; §132k on the 22:03 game (ceiling
          110). Price §36,000.

D. ENGINE AND MAP FINDINGS THE BOTS MADE (requests.md, each with its smallest case)
   D1 (rules-book -> join3, FIXED by join3 21:31) the advice line named the cutter while cut pieces waited for the
      yard hands.
   D2 (rules-sim-b, open, 21:30) away, the tipping floor fills with tier-0 whole things nobody moves (136 motors, 67
      cable coils, 67 brass fittings after 11.75 h on seed 3) and its slots run on to y 127 m, outside the 40 m
      yard; the next absence pays §155. The bots skip what lies outside the yard; the rule is not mine.
   D3 (content, map) the cable bundle stands 1.9 m from the platform scale, so a boss who steps up to it from the
      east stands on the scale's ground and only weighs: a person must come at it from the north, south or west.
   D4 (rules) the truck delivered as a purchase takes the boss in when he walks within 2 m of it on his way to the
      scale (the slow hand did, at 9:40); a person steps out with the button: the bots now do.

F. THE TABLES
   REPORT6 tables (the real rules, 15 seeds: 1..15), generated by scripts/content/yard-bot.ts
   
   0. HARD PROMISES (8.3) on 99 runs: none broken; tick = jump minute by minute on 15 runs: equal
      presses refused (all runs): {}
      cards locked by the capacity ceiling in the hour (8.4: at most once): max 2 items on a run; runs with more than one: 2/75; in three days: lev:partnerDemolition@1.0h  -  -
   
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
      normal goal B  12:43 to 15:43, med 14:44, 11/15 in band
      brisk goal A   10:35 to 13:56, med 11:29, 12/15 in band
      slow goal A    15:57 to 21:24, med 18:11, 0/15 in band
    rung 2 [12:00-18:00]
      normal goal A  11:53 to 14:20, med 12:42, 14/15 in band
      normal all A   11:35 to 13:27, med 12:45, 13/15 in band
      normal goal B  11:34 to 14:40, med 12:30, 12/15 in band
      brisk goal A   10:10 to 11:31, med 10:44, 0/15 in band
      slow goal A    14:16 to 20:35, med 16:51, 11/15 in band
    first pour [18:00-25:00]
      normal goal A  19:20 to 27:18, med 22:54, 13/15 in band
      normal all A   18:35 to 27:50, med 24:04, 10/15 in band
      normal goal B  19:51 to 25:51, med 22:34, 14/15 in band
      brisk goal A   18:10 to 22:00, med 20:12, 15/15 in band
      slow goal A    23:46 to 30:34, med 27:15, 3/15 in band
    rung 3 [55:00-65:00]
      normal goal A  55:25 to 59:19, med 57:18, 15/15 in band
      normal all A   56:03 to 60:01, med 57:47, 15/15 in band
      normal goal B  55:11 to 58:41, med 57:19, 15/15 in band
      brisk goal A   50:43 to 55:30, med 53:18, 2/15 in band
      slow goal A    60:15 to 66:09, med 62:58, 11/15 in band
    slow within 1.5 x normal on the same seed (after 2:00): helperCarrying 13/15, pass1 15/15, drive 11/15, owned:torch 13/15, rung2 13/15, pour 15/15, rung3 15/15
    rivals passed in the hour (normal goal A): min 4, med 5, max 5; first pass med 3:34
   
   2. SALES AND NET A MINUTE BY FIVE-MINUTE WINDOW (median of seeds)
      window             0-5  5-10 10-15 15-20 20-25 25-30 30-35 35-40 40-45 45-50 50-55 55-60
      E28 aim            120   250   450   800  1300  1800  1980  2178  2396  2635  2899  3189
      normal goal A sales   201   256   472   753   814  1162  1350  1516  1544  1638  1549  1757
      normal goal A net   201   226   282   341   178   473   460   584   528   593   376   700
      normal all A sales   200   266   587   467   612  1163  1537  1460  1453  1402  1481  1495
      normal all A net   200   236   587   387   245   252   500   589   561   494   600   688
      normal goal B sales   205   250   487   737   803  1034  1335  1560  1543  1643  1620  1634
      normal goal B net   205   220   298   312   352   220   539   565   515   496   664   528
      brisk goal A sales   244   314   573   805  1038  1371  1498  1441  1656  1723  1758  1825
      brisk goal A net   244   284   326   248   321   574   654   372   649   679   494   801
      slow goal A sales   157   219   224   777   661   826  1156  1478  1499  1539  1445  1491
      slow goal A net    157   219   168   526   261   274   444   587   643   677   755   615
      normal goal A: windows under the one before (after minute 5): med 3, max 6
      E31c normal goal A : sales 55-60 >= §2,000 a minute on 0/15 (med §1757); a window after minute 30 under the one before: 1/15 runs have none (med 2, max 3)
      E31c normal all A  : sales 55-60 >= §2,000 a minute on 0/15 (med §1495); a window after minute 30 under the one before: 0/15 runs have none (med 2, max 4)
      E31c normal goal B : sales 55-60 >= §2,000 a minute on 0/15 (med §1634); a window after minute 30 under the one before: 3/15 runs have none (med 2, max 3)
      E31c brisk goal A  : sales 55-60 >= §2,000 a minute on 1/15 (med §1825); a window after minute 30 under the one before: 0/15 runs have none (med 2, max 3)
      E31c slow goal A   : sales 55-60 >= §2,000 a minute on 1/15 (med §1491); a window after minute 30 under the one before: 0/15 runs have none (med 2, max 4)
   
   3. THROUGH THE HOUR (normal goal A, median): supplied t, rank, cash §, rated capacity t/h, reserve §
      min  5    0.61 t  rank 25  cash     305  R    3.1  reserve      0
      min 10    1.50 t  rank 25  cash     503  R    3.1  reserve      0
      min 15    3.32 t  rank 24  cash    1093  R    3.1  reserve      0
      min 20    4.73 t  rank 24  cash    1480  R    3.1  reserve      0
      min 25    6.64 t  rank 24  cash    1065  R   34.3  reserve      0
      min 30    8.89 t  rank 23  cash    1881  R   40.4  reserve      0
      min 40   15.40 t  rank 23  cash    1318  R   56.8  reserve      0
      min 50   22.35 t  rank 22  cash    1543  R   82.1  reserve    949
      min 60   29.86 t  rank 21  cash    3001  R   82.1  reserve    938
      normal goal A: highest rated capacity reached on rung 1 / 2 / 3: 3.1 / 82.1 / 82.1 t/h
      normal all A: highest rated capacity reached on rung 1 / 2 / 3: 3.1 / 56.8 / 56.8 t/h
   
   4. THE GOAL PURCHASES (normal goal A): price, median minute bought, held at its card (cash after the purchase before / price), wait over 3 min
      sack      §    60  1:04  held 0.00  cash at card 7.54 x  walk-to-buy med 7 s max 8 s  waits>3min 0/15 (max 70 s)  bought 15/15
      hand1     §   300  1:43  held 1.31  cash at card 1.36 x  walk-to-buy med 9 s max 13 s  waits>3min 0/15 (max 48 s)  bought 15/15
      sledge    §   340  3:37  held 0.44  cash at card 1.20 x  walk-to-buy med 7 s max 8 s  waits>3min 0/15 (max 138 s)  bought 15/15
      trolley   §   380  5:48  held 0.18  cash at card 1.12 x  walk-to-buy med 7 s max 8 s  waits>3min 0/15 (max 157 s)  bought 15/15
      truck     §   430  7:09  held 0.26  cash at card 1.13 x  walk-to-buy med 9 s max 11 s  waits>3min 0/15 (max 94 s)  bought 15/15
      cutter    §   540  10:13  held 0.21  cash at card 1.18 x  walk-to-buy med 9 s max 12 s  waits>3min 6/15 (max 235 s)  bought 15/15
      torch     §   480  14:11  held 0.20  cash at card 1.96 x  walk-to-buy med 7 s max 8 s  waits>3min 10/15 (max 342 s)  bought 15/15
      stripper  §   700  17:04  held 0.72  cash at card 3.66 x  walk-to-buy med 9 s max 11 s  waits>3min 7/15 (max 242 s)  bought 15/15
      crucible  §   800  18:30  held 2.33  cash at card 1.74 x  walk-to-buy med 10 s max 12 s  waits>3min 0/15 (max 137 s)  bought 15/15
      bench     §   900  23:03  held 0.72  cash at card 2.01 x  walk-to-buy med 7 s max 11 s  waits>3min 12/15 (max 386 s)  bought 15/15
      driver    §  1000  24:31  held 1.08  cash at card 2.00 x  walk-to-buy med 10 s max 10 s  waits>3min 0/15 (max 156 s)  bought 15/15
      cutter2   §  3600  59:42  held 0.33  cash at card 1.30 x  walk-to-buy med 10 s max 11 s  waits>3min 2/2 (max 2355 s)  bought 2/15
      alu       §  1300  59:54  held 0.45  cash at card 2.01 x  walk-to-buy med 6 s max 6 s  waits>3min 1/1 (max 1938 s)  bought 1/15
      walk-to-buy at normal goal A  (every purchase of the hour): med 9 s, max 13 s over 341 purchases
      walk-to-buy at normal all A   (every purchase of the hour): med 9 s, max 19 s over 401 purchases
      walk-to-buy at normal goal B  (every purchase of the hour): med 9 s, max 14 s over 346 purchases
      walk-to-buy at brisk goal A   (every purchase of the hour): med 6 s, max 8 s over 369 purchases
      walk-to-buy at slow goal A    (every purchase of the hour): med 15 s, max 24 s over 353 purchases
      purchase prompts a minute (most in any minute): med 2, max 2
      burst (8.4: at most two ahead by minute 10): habit all ahead of habit goal in goal purchases owned, minutes 1-10: max 1 (seeds over 2: 0/15); minutes 1-30: max 4
   
   5. THE HAND AGAINST THE CARD MANAGER (earned by minute 60, normal / manager): med 11.48, min 10.28 (E4 aim >= 1.20)
      an hour away from minute 60 against an hour played at minute 60's pace (minutes 50-60 x 6): med 0.53, min 0.37 (S13 aim >= 0.3; E19 asks played >= 1.25 x away, i.e. this <= 0.8)
      stop and return (earned on the away card, median; S13: above zero): 5m+1h §2175 (zero on 0), 5m+4h §2175 (zero on 0), 5m+12h §2175 (zero on 0), 10m+1h §2613 (zero on 0), 10m+4h §2613 (zero on 0), 10m+12h §2613 (zero on 0), 15m+1h §6742 (zero on 0), 15m+4h §12227 (zero on 0), 15m+12h §12227 (zero on 0), 30m+1h §18281 (zero on 0), 30m+4h §34646 (zero on 0), 30m+12h §34646 (zero on 0)
   
      E33 THE BURST (normal goal A, median): the away card, how long the yard ran, cash after it, and how much of the goal list that buys at once
      5m+1h    away §  2175  ran   30 min  cash §  2586  buys 2 of 8 goal purchases left (§810 of §5230; max 5)  deal deliveries 0
      5m+4h    away §  2175  ran   30 min  cash §  2586  buys 2 of 8 goal purchases left (§810 of §5230; max 5)  deal deliveries 0
      5m+12h   away §  2175  ran   30 min  cash §  2586  buys 2 of 8 goal purchases left (§810 of §5230; max 5)  deal deliveries 0
      10m+4h   away §  2613  ran   30 min  cash §  3161  buys 4 of 6 goal purchases left (§2520 of §4420; max 5)  deal deliveries 0
      15m+1h   away §  6742  ran   60 min  cash §  8537  buys 4 of 4 goal purchases left (§3400 of §3400; max 5)  deal deliveries 0
      15m+4h   away § 12227  ran  120 min  cash § 12837  buys 4 of 4 goal purchases left (§3400 of §3400; max 5)  deal deliveries 0
      15m+12h  away § 12227  ran  120 min  cash § 12837  buys 4 of 4 goal purchases left (§3400 of §3400; max 5)  deal deliveries 0
      30m+4h   away § 34646  ran  120 min  cash §  7491  buys 0 of 0 goal purchases left (§0 of §0; max 0)  deal deliveries 0
      30m+12h  away § 34646  ran  120 min  cash §  7491  buys 0 of 0 goal purchases left (§0 of §0; max 0)  deal deliveries 0
      the Night watch's worth: what it adds to one 12 h absence (median, min-max): 15m+12h §10288 (9408-12456), 30m+12h §43440 (28022-100123), 60m+12h §106366 (64247-151499)
   
   P20. MINUTES 5 TO 10 AT A PERSON'S HAND: what a minute of the boss's own work pays (today's value weighed by him / 5), the walks on foot
      normal goal A  § a minute of his work: med 227 (range 164-295); longest walk med 41.0 m / 10 s (max 51.9 m); share of the five minutes on foot med 26 %
      normal all A   § a minute of his work: med 224 (range 175-259); longest walk med 41.0 m / 10 s (max 51.9 m); share of the five minutes on foot med 26 %
      normal goal B  § a minute of his work: med 224 (range 169-250); longest walk med 41.0 m / 10 s (max 41.6 m); share of the five minutes on foot med 25 %
      brisk goal A   § a minute of his work: med 282 (range 200-327); longest walk med 37.3 m / 9 s (max 37.4 m); share of the five minutes on foot med 23 %
      slow goal A    § a minute of his work: med 192 (range 134-265); longest walk med 46.6 m / 12 s (max 59.0 m); share of the five minutes on foot med 28 %
   
   6. THREE DAYS, TWICE A DAY (a first hour, then 15 minutes every 11.75 h): per sitting, purchases, cash before / after, the away pass
      seed 1: h5.3: +21 (§85k -> §3k, away §200k, rank 18); h11.5: +15 (§162k -> §13k, away §452k, rank 16); h17.8: +9 (§194k -> §23k, away §513k, rank 15); h24: +8 (§224k -> §21k, away §562k, rank 14); h30.3: +5 (§235k -> §31k, away §602k, rank 14); h36.5: +3 (§259k -> §115k, away §635k, rank 14)
         a sitting without a purchase: 0/6; cash at the end §115k against a day's income §1236k
      seed 2: h5.3: +20 (§72k -> §3k, away §249k, rank 18); h11.5: +12 (§185k -> §13k, away §544k, rank 16); h17.8: +10 (§223k -> §19k, away §605k, rank 15); h24: +7 (§257k -> §28k, away §650k, rank 14); h30.3: +5 (§285k -> §48k, away §671k, rank 14); h36.5: +0 (§309k -> §355k, away §671k, rank 13)
         a sitting without a purchase: 1/6; cash at the end §355k against a day's income §1341k
      seed 3: h5.3: +19 (§76k -> §6k, away §263k, rank 18); h11.5: +12 (§179k -> §9k, away §540k, rank 16); h17.8: +9 (§213k -> §28k, away §603k, rank 15); h24: +7 (§271k -> §23k, away §650k, rank 14); h30.3: +6 (§280k -> §51k, away §666k, rank 14); h36.5: +0 (§312k -> §348k, away §669k, rank 13)
         a sitting without a purchase: 1/6; cash at the end §348k against a day's income §1335k
      the day-word holder against the same days without Hold: -38.8 %, -4.4 %, -10.0 % (aim <= +3 %)
   7. NO HAND (E4, E24): states of a normal run, the stick never touched; the next goal purchase reached within 30 min
      seed 1: reached on 9/9 states from the first hire; m3 sledge:0:40 m5 trolley:3:50 m7 truck:0:10 m9 cutter:4:00 m11 -:n/a m13 -:n/a m15 torch:0:10 m17 stripper:0:10 m19 crucible:0:10 m21 -:n/a m23 -:n/a m25 bench:0:10 m27 driver:0:10 m29 -:n/a m31 -:n/a m33 -:n/a m35 -:n/a m37 -:n/a m39 -:n/a m41 -:n/a
      seed 2: reached on 7/7 states from the first hire; m3 sledge:0:50 m5 trolley:2:20 m7 truck:0:10 m9 cutter:1:20 m11 -:n/a m13 torch:0:10 m15 stripper:0:10 m17 crucible:0:50 m19 -:n/a m21 -:n/a m23 -:n/a m25 -:n/a m27 -:n/a m29 -:n/a m31 -:n/a m33 -:n/a m35 -:n/a m37 -:n/a m39 -:n/a m41 -:n/a
      seed 3: reached on 5/5 states from the first hire; m3 sledge:0:40 m5 trolley:0:50 m7 truck:n/a m9 -:n/a m11 -:n/a m13 -:n/a m15 -:n/a m17 crucible:0:10 m19 -:n/a m21 -:n/a m23 -:n/a m25 -:n/a m27 driver:0:10 m29 driver:0:10 m31 -:n/a m33 -:n/a m35 -:n/a m37 -:n/a m39 -:n/a m41 -:n/a
   
   run time: 1687 s of CPU over 99 runs

   --- the 5 new seeds (201-205), beats and gate ---
   REPORT6 tables (the real rules, 5 seeds: 201..205), generated by scripts/content/yard-bot.ts
   
   0. HARD PROMISES (8.3) on 25 runs: none broken; tick = jump minute by minute on 5 runs: equal
      presses refused (all runs): {}
      cards locked by the capacity ceiling in the hour (8.4: at most once): max 1 items on a run; runs with more than one: 0/25; in three days: 
   
   1. BEATS (1.2, 1.3): range, median, share in band
    beat 2 the washer apart (aim about 0:12; band shown 0:15) [0:00-0:15]
      normal goal A  0:11 to 0:13, med 0:12, 5/5 in band
      normal all A   0:11 to 0:13, med 0:12, 5/5 in band
      normal goal B  0:34 to 0:40, med 0:36, 0/5 in band
      brisk goal A   0:10 to 0:10, med 0:10, 5/5 in band
      slow goal A    0:13 to 0:19, med 0:14, 3/5 in band
    beat 3 first collection ticket [0:00-0:25]
      normal goal A  0:19 to 0:22, med 0:20, 5/5 in band
      normal all A   0:19 to 0:22, med 0:20, 5/5 in band
      normal goal B  0:24 to 0:27, med 0:25, 5/5 in band
      brisk goal A   0:16 to 0:17, med 0:17, 5/5 in band
      slow goal A    0:25 to 0:28, med 0:25, 0/5 in band
    beat 4 at the stripper (aim about 0:30; band shown 0:35) [0:00-0:35]
      normal goal A  0:31 to 0:43, med 0:33, 4/5 in band
      normal all A   0:31 to 0:43, med 0:33, 4/5 in band
      normal goal B  0:07 to 0:10, med 0:08, 5/5 in band
      brisk goal A   0:24 to 0:26, med 0:25, 5/5 in band
      slow goal A    0:57 to 1:03, med 0:59, 0/5 in band
    beat 5 copper jump [0:00-1:30]
      normal goal A  0:48 to 1:07, med 0:51, 5/5 in band
      normal all A   0:48 to 1:07, med 0:51, 5/5 in band
      normal goal B  0:24 to 0:27, med 0:25, 5/5 in band
      brisk goal A   0:40 to 0:42, med 0:41, 5/5 in band
      slow goal A    1:16 to 1:24, med 1:20, 5/5 in band
    beat 6 first purchase arriving [0:00-2:00]
      normal goal A  1:08 to 1:15, med 1:11, 5/5 in band
      normal all A   1:08 to 1:15, med 1:11, 5/5 in band
      normal goal B  0:52 to 0:57, med 0:55, 5/5 in band
      brisk goal A   0:54 to 0:56, med 0:55, 5/5 in band
      slow goal A    1:30 to 1:40, med 1:35, 5/5 in band
    beat 7 yard hand carrying [0:00-5:00]
      normal goal A  1:43 to 3:05, med 1:51, 5/5 in band
      normal all A   1:15 to 1:52, med 1:49, 5/5 in band
      normal goal B  1:34 to 2:04, med 1:38, 5/5 in band
      brisk goal A   1:29 to 1:57, med 1:30, 5/5 in band
      slow goal A    2:08 to 3:04, med 2:36, 5/5 in band
    beat 8 first rival passed [0:00-5:00]
      normal goal A  3:12 to 3:48, med 3:29, 5/5 in band
      normal all A   3:17 to 3:32, med 3:25, 5/5 in band
      normal goal B  3:29 to 3:40, med 3:31, 5/5 in band
      brisk goal A   2:35 to 3:00, med 2:59, 5/5 in band
      slow goal A    3:55 to 4:36, med 4:21, 5/5 in band
    first drive out (hook) [8:00-10:00]
      normal goal A  8:12 to 8:30, med 8:23, 5/5 in band
      normal all A   8:02 to 8:28, med 8:14, 5/5 in band
      normal goal B  7:50 to 8:26, med 8:16, 4/5 in band
      brisk goal A   6:57 to 7:20, med 7:13, 0/5 in band
      slow goal A    9:58 to 14:13, med 13:21, 1/5 in band
    torch [11:00-15:00]
      normal goal A  12:46 to 15:04, med 13:56, 4/5 in band
      normal all A   12:38 to 13:54, med 13:22, 5/5 in band
      normal goal B  12:13 to 14:29, med 13:00, 5/5 in band
      brisk goal A   10:27 to 13:15, med 11:20, 3/5 in band
      slow goal A    15:05 to 18:11, med 17:43, 0/5 in band
    rung 2 [12:00-18:00]
      normal goal A  12:07 to 13:34, med 12:41, 5/5 in band
      normal all A   11:58 to 12:51, med 12:37, 4/5 in band
      normal goal B  11:25 to 12:38, med 12:31, 3/5 in band
      brisk goal A   10:00 to 11:26, med 11:02, 0/5 in band
      slow goal A    14:26 to 16:53, med 16:35, 5/5 in band
    first pour [18:00-25:00]
      normal goal A  19:24 to 24:15, med 20:49, 5/5 in band
      normal all A   20:51 to 26:13, med 21:24, 4/5 in band
      normal goal B  18:57 to 23:23, med 20:08, 5/5 in band
      brisk goal A   17:09 to 21:27, med 19:50, 3/5 in band
      slow goal A    24:14 to 27:05, med 26:04, 1/5 in band
    rung 3 [55:00-65:00]
      normal goal A  53:56 to 57:06, med 56:45, 4/5 in band
      normal all A   57:10 to 57:57, med 57:36, 5/5 in band
      normal goal B  54:19 to 56:53, med 56:04, 4/5 in band
      brisk goal A   51:36 to 53:21, med 52:23, 0/5 in band
      slow goal A    60:36 to 70:47, med 63:52, 4/5 in band
    slow within 1.5 x normal on the same seed (after 2:00): helperCarrying 3/5, pass1 5/5, drive 2/5, owned:torch 5/5, rung2 5/5, pour 5/5, rung3 5/5
    rivals passed in the hour (normal goal A): min 5, med 5, max 5; first pass med 3:29
   
   2. SALES AND NET A MINUTE BY FIVE-MINUTE WINDOW (median of seeds)
      window             0-5  5-10 10-15 15-20 20-25 25-30 30-35 35-40 40-45 45-50 50-55 55-60
      E28 aim            120   250   450   800  1300  1800  1980  2178  2396  2635  2899  3189
      normal goal A sales   196   247   582   761   856  1265  1416  1583  1542  1782  1576  1724
      normal goal A net   196   217   473   301   231   487   655   440   681   622   286   592
      normal all A sales   210   238   531   574   560  1127  1400  1459  1466  1359  1531  1464
      normal all A net   210   208   531   574   248   384   649   635   349   500   545   711
      normal goal B sales   209   252   545   822   799  1176  1497  1508  1469  1602  1631  1761
      normal goal B net   209   222   465   326   357   202   716   649   584   411   571   629
      brisk goal A sales   243   285   538   778  1130  1457  1520  1458  1647  1816  1875  1882
      brisk goal A net   243   255   263   217   369   598   771   415   492   605   690   654
      slow goal A sales   161   203   252   919   687  1176  1549  1331  1787  1753  1709  1665
      slow goal A net    161   188   210   691   126   629   735  1151  1294  1071  1600  1298
      normal goal A: windows under the one before (after minute 5): med 3, max 5
      E31c normal goal A : sales 55-60 >= §2,000 a minute on 1/5 (med §1724); a window after minute 30 under the one before: 0/5 runs have none (med 2, max 3)
      E31c normal all A  : sales 55-60 >= §2,000 a minute on 0/5 (med §1464); a window after minute 30 under the one before: 0/5 runs have none (med 3, max 3)
      E31c normal goal B : sales 55-60 >= §2,000 a minute on 0/5 (med §1761); a window after minute 30 under the one before: 0/5 runs have none (med 2, max 4)
      E31c brisk goal A  : sales 55-60 >= §2,000 a minute on 1/5 (med §1882); a window after minute 30 under the one before: 0/5 runs have none (med 2, max 2)
      E31c slow goal A   : sales 55-60 >= §2,000 a minute on 0/5 (med §1665); a window after minute 30 under the one before: 0/5 runs have none (med 3, max 3)
   
   3. THROUGH THE HOUR (normal goal A, median): supplied t, rank, cash §, rated capacity t/h, reserve §
      min  5    0.61 t  rank 25  cash     280  R    3.1  reserve      0
      min 10    1.49 t  rank 25  cash     194  R    3.1  reserve      0
      min 15    3.41 t  rank 24  cash    1507  R    3.1  reserve      0
      min 20    4.93 t  rank 24  cash    2057  R    3.1  reserve      0
      min 25    6.66 t  rank 24  cash    1173  R   34.3  reserve      0
      min 30    9.31 t  rank 23  cash    1705  R   56.8  reserve      0
      min 40   16.29 t  rank 23  cash    1466  R   80.9  reserve      0
      min 50   23.15 t  rank 22  cash    1814  R   82.1  reserve    959
      min 60   30.27 t  rank 21  cash    3640  R   82.1  reserve    959
      normal goal A: highest rated capacity reached on rung 1 / 2 / 3: 3.1 / 82.1 / 82.1 t/h
      normal all A: highest rated capacity reached on rung 1 / 2 / 3: 3.1 / 56.8 / 56.8 t/h
   
   4. THE GOAL PURCHASES (normal goal A): price, median minute bought, held at its card (cash after the purchase before / price), wait over 3 min
      sack      §    60  1:05  held 0.00  cash at card 7.67 x  walk-to-buy med 7 s max 9 s  waits>3min 0/5 (max 69 s)  bought 5/5
      hand1     §   300  1:42  held 1.33  cash at card 1.37 x  walk-to-buy med 9 s max 10 s  waits>3min 0/5 (max 43 s)  bought 5/5
      sledge    §   340  3:41  held 0.44  cash at card 1.04 x  walk-to-buy med 7 s max 7 s  waits>3min 0/5 (max 133 s)  bought 5/5
      trolley   §   380  5:52  held 0.03  cash at card 1.13 x  walk-to-buy med 7 s max 8 s  waits>3min 0/5 (max 149 s)  bought 5/5
      truck     §   430  7:20  held 0.19  cash at card 1.21 x  walk-to-buy med 9 s max 10 s  waits>3min 0/5 (max 104 s)  bought 5/5
      cutter    §   540  9:48  held 0.18  cash at card 1.13 x  walk-to-buy med 9 s max 12 s  waits>3min 3/5 (max 233 s)  bought 5/5
      torch     §   480  13:50  held 0.15  cash at card 2.48 x  walk-to-buy med 8 s max 10 s  waits>3min 2/5 (max 349 s)  bought 5/5
      stripper  §   700  16:50  held 1.02  cash at card 3.86 x  walk-to-buy med 9 s max 11 s  waits>3min 3/5 (max 240 s)  bought 5/5
      crucible  §   800  18:16  held 2.55  cash at card 1.81 x  walk-to-buy med 10 s max 11 s  waits>3min 0/5 (max 87 s)  bought 5/5
      bench     §   900  20:57  held 0.72  cash at card 1.65 x  walk-to-buy med 8 s max 9 s  waits>3min 2/5 (max 276 s)  bought 5/5
      driver    §  1000  23:08  held 0.65  cash at card 1.81 x  walk-to-buy med 9 s max 10 s  waits>3min 0/5 (max 153 s)  bought 5/5
      alu       §  1300  54:31  held 0.62  cash at card 1.90 x  walk-to-buy med 7 s max 7 s  waits>3min 1/1 (max 2038 s)  bought 1/5
      cutter2   §  3600  59:25  held 0.02  cash at card 1.35 x  walk-to-buy med 9 s max 9 s  waits>3min 1/1 (max 2264 s)  bought 1/5
      walk-to-buy at normal goal A  (every purchase of the hour): med 9 s, max 13 s over 116 purchases
      walk-to-buy at normal all A   (every purchase of the hour): med 9 s, max 13 s over 134 purchases
      walk-to-buy at normal goal B  (every purchase of the hour): med 9 s, max 13 s over 115 purchases
      walk-to-buy at brisk goal A   (every purchase of the hour): med 6 s, max 8 s over 122 purchases
      walk-to-buy at slow goal A    (every purchase of the hour): med 14 s, max 22 s over 130 purchases
      purchase prompts a minute (most in any minute): med 2, max 2
      burst (8.4: at most two ahead by minute 10): habit all ahead of habit goal in goal purchases owned, minutes 1-10: max 1 (seeds over 2: 0/5); minutes 1-30: max 4
   
      an hour away from minute 60 against an hour played at minute 60's pace (minutes 50-60 x 6): med 0.55, min 0.51 (S13 aim >= 0.3; E19 asks played >= 1.25 x away, i.e. this <= 0.8)
      stop and return (earned on the away card, median; S13: above zero): 5m+1h §2339 (zero on 0), 5m+4h §2339 (zero on 0), 5m+12h §2339 (zero on 0), 10m+1h §2964 (zero on 0), 10m+4h §2964 (zero on 0), 10m+12h §2964 (zero on 0), 15m+1h §6670 (zero on 0), 15m+4h §12066 (zero on 0), 15m+12h §12066 (zero on 0), 30m+1h §50426 (zero on 0), 30m+4h §105573 (zero on 0), 30m+12h §105573 (zero on 0)
   
      E33 THE BURST (normal goal A, median): the away card, how long the yard ran, cash after it, and how much of the goal list that buys at once
      5m+1h    away §  2339  ran   30 min  cash §  2421  buys 4 of 8 goal purchases left (§1830 of §5230; max 5)  deal deliveries 0
      5m+4h    away §  2339  ran   30 min  cash §  2421  buys 4 of 8 goal purchases left (§1830 of §5230; max 5)  deal deliveries 0
      5m+12h   away §  2339  ran   30 min  cash §  2421  buys 4 of 8 goal purchases left (§1830 of §5230; max 5)  deal deliveries 0
      10m+4h   away §  2964  ran   30 min  cash §  3319  buys 4 of 5 goal purchases left (§2880 of §3880; max 5)  deal deliveries 0
      15m+1h   away §  6670  ran   60 min  cash §  8587  buys 4 of 4 goal purchases left (§3400 of §3400; max 4)  deal deliveries 0
      15m+4h   away § 12066  ran  120 min  cash § 13993  buys 4 of 4 goal purchases left (§3400 of §3400; max 4)  deal deliveries 0
      15m+12h  away § 12066  ran  120 min  cash § 13993  buys 4 of 4 goal purchases left (§3400 of §3400; max 4)  deal deliveries 0
      30m+4h   away §105573  ran  120 min  cash § 35859  buys 0 of 0 goal purchases left (§0 of §0; max 0)  deal deliveries 0
      30m+12h  away §105573  ran  120 min  cash § 35859  buys 0 of 0 goal purchases left (§0 of §0; max 0)  deal deliveries 0
      the Night watch's worth: what it adds to one 12 h absence (median, min-max): 15m+12h §10278 (9267-11436), 30m+12h §107786 (66003-112527), 60m+12h §130054 (122441-140076)
   
   P20. MINUTES 5 TO 10 AT A PERSON'S HAND: what a minute of the boss's own work pays (today's value weighed by him / 5), the walks on foot
      normal goal A  § a minute of his work: med 220 (range 200-299); longest walk med 41.6 m / 10 s (max 48.6 m); share of the five minutes on foot med 24 %
      normal all A   § a minute of his work: med 213 (range 159-267); longest walk med 41.0 m / 10 s (max 41.6 m); share of the five minutes on foot med 25 %
      normal goal B  § a minute of his work: med 218 (range 189-273); longest walk med 41.6 m / 10 s (max 52.5 m); share of the five minutes on foot med 24 %
      brisk goal A   § a minute of his work: med 271 (range 217-313); longest walk med 37.3 m / 9 s (max 47.7 m); share of the five minutes on foot med 23 %
      slow goal A    § a minute of his work: med 180 (range 147-225); longest walk med 46.6 m / 12 s (max 59.6 m); share of the five minutes on foot med 21 %
   
   
   run time: 746 s of CPU over 25 runs

   --- the E30 ceiling check on the final game (ceiling 110 t/h), normal goal A, 15 seeds ---
   REPORT6 tables (the real rules, 15 seeds: 1..15), generated by scripts/content/yard-bot.ts
   
   0. HARD PROMISES (8.3) on 15 runs: none broken; tick = jump minute by minute on 15 runs: equal
      presses refused (all runs): {}
      cards locked by the capacity ceiling in the hour (8.4: at most once): max 0 items on a run; runs with more than one: 0/15; in three days: 
   
    rung 3 [55:00-65:00]
      normal goal A  54:50 to 59:21, med 57:08, 14/15 in band
      E31c normal goal A : sales 55-60 >= §2,000 a minute on 0/15 (med §1720); a window after minute 30 under the one before: 1/15 runs have none (med 2, max 3)
      the Night watch's worth: what it adds to one 12 h absence (median, min-max): 15m+12h §10288 (9408-12456), 30m+12h §66380 (54114-111877), 60m+12h §132492 (120385-175820)

G. AFTER E35 (the lead, 22:55): the hour once more on the game as it goes to the owner
   The rules desk's E35 (the tipping floor never silts up; yard hands clear the floor before the drop-off while
   it is over half full, live as well as away) came after the tables above. The same command
   (npx tsx scripts/content/yard-bot.ts --seeds 15 --routes 2 --report, output in bots/after-desk1.txt) gives,
   normal hand, goal habit, route A, medians: beats 2 to 8 at 0:12, 0:20, 0:34, 0:52, 1:11, 1:52, 3:34 (the same);
   first drive 8:16 (14/15), torch 14:17 (12/15), rung 2 12:42 (14/15), first pour 22:54 (14/15), rung 3 57:08
   (14/15; was 57:18); rivals passed 5; walk to buy 9 s; sales at 55-60 a median §1,720 a minute (was §1,757;
   brisk hand §1,900). The away bench: six hours away from the played minute 60 on seed 257: 646 ms of node CPU,
   sales §444,734, 232 loads. Nothing in sections C1 and C2 moves; E31c stays missed as ruled (E36).
```
