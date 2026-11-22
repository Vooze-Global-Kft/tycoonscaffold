# Pizza Empire: meta economy of a free player

From the real engine and the generated `games/pizza-empire/game.json`, averaged over 3 seeds by
`npx tsx scripts/content/meta-sim.ts pizza-empire --days 90 --seeds 3` (real play, real mission
progress, offline earnings, resets). Rerun it after changing `scripts/content/build-pizza.py`.
The full table and the before/after are in `audit.md` section 5.

**Modelled player:** never pays; 5 sessions a day of 7 minutes; claims every free chest, watches
all 3 ad chests, finishes every mission it can, takes the daily gift and the free daily item,
spends every gem on named card copies (rarest first), levels cards at once, resets when that
doubles its prestige multiplier.

| Day | Gems in / day | Chests / day (Box, Crate, Golden) | Level C / R / E / L | Income from cards |
|---|---|---|---|---|
| 1 | 138 (102 of it story) | 11, 1, 0 | 4.3 / 2.6 / 0.8 / 0.2 | **x1.18** |
| 7 | 76 | 10.2, 0.86, 0.29 | 10.8 / 8.1 / 4.2 / 1.2 | **x1.96** |
| 30 | 49 | 9.8, 0.74, 0.23 | 14.0 / 11.3 / 7.7 / 4.3 | **x2.83** |
| 90 | 43 | 9.7, 0.68, 0.22 | 17.0 / 14.0 / 9.9 / 6.7 | **x3.72** |

"Income from cards" is measured: income with the cards divided by income without them.

## Gems

- **In:** missions 20 to 29 a day, chest gem slots about 4, the daily gift 16 a day (it counts
  days claimed and cycles the 7-entry table, 115 a week), story beats early on. Free gems settle
  at 43 to 49 a day after week one, the research's 45. (Before the cycle: 76 to 82.)
- **Out:** named copies in the daily shop (common x8 for 30, rare x3 for 40, epic x1 for 60,
  legendary x1 for 250) and hours of income (20 or 70). Real players also buy time warps and the
  Golden Pizza Cutter. Chests are never sold.

## Collection

All 12 cards are owned on day 6 to 10, faster than the research's two weeks: an engaged player
opens about 11 chests a day, so legendary protection fires every few days (see audit.md section 5). Then the long game is levels: each needs 1.5 times the copies of the last, about one
level per rarity every three weeks by day 90.

## Why cards cannot wreck pacing

Small steps (common 4 % then +2.5 % a level, rare 6 % +3.5 %, epic 12 % +5 %, legendary global
income 8 % +4 %) on levels that grow with the logarithm of copies: x3.4 after 90 days. Each venue
costs hundreds of times the last, so cards bring a venue a little closer and never skip one.
