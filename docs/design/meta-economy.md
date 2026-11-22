# Pizza Empire: meta economy of a free player

From the real engine and the generated `games/pizza-empire/game.json`, averaged over 20 seeds by a
throwaway script (`meta-economy.ts` in the engine scratchpad: `npx tsx meta-economy.ts 90 20
[noads]`). Rerun it after changing `scripts/content/build-pizza.py`.

**Modelled player:** never pays; 5 sessions a day; claims every free chest, watches all 3 ad
chests, finishes 10 missions, takes the daily gift and free daily item, spends every gem on named
card copies (rarest first), levels cards at once. Most venues ever open: 3 on day 1, 5 by day 3,
7 by day 7, 8 from day 14 (chest copies up to x2.4).

| Day | Gems in / day | Chests / day (Box, Crate, Golden) | Level C / R / E / L | Stages (station, transport, sales) | Global | Income from cards |
|---|---|---|---|---|---|---|
| 1 | 37 | 9.4, 1, 0 | 4.4 / 2.1 / 0.5 / 0.1 | x1.26, x1.18, x1.12 | x1.02 | **x1.2** |
| 7 | 50 | 10.2, 1, 0.3 | 10.1 / 7.7 / 3.8 / 1.3 | x1.63, x1.60, x1.27 | x1.18 | **x1.75** |
| 30 | 76 | 10.3, 1, 0.33 | 14.3 / 11.7 / 7.8 / 4.3 | x1.97, x2.00, x1.37 | x1.47 | **x2.6** |
| 90 | 82 | 10.3, 1, 0.33 | 17.1 / 14.6 / 10.6 / 7.0 | x2.21, x2.31, x1.44 | x1.74 | **x3.4** |

Levels are averages per rarity. "Income from cards" = global x the geometric mean of the three
stage multipliers (a stage card lifts one stage; the player rebalances spending). Tap cards add a
further x1.6 (day 7) to x2.5 (day 90).

## Gems

- **In:** missions about 29 a day, chest gem slots about 5, the daily gift 16 a day in week one.
  After week one the gift pays 50 every day, because `dailyReward` stays on the last entry of
  `economy.daily.gems` instead of cycling the week; hence 76 to 82 a day against the research's
  45. **Open item for the economy owner:** cycle the table weekly (115 a week) and free gems settle
  near 45 a day.
- **Out:** named copies in the daily shop (common x8 for 30, rare x3 for 40, epic x1 for 60,
  legendary x1 for 250) and hours of income (20 or 70). Real players also buy time warps and the
  Golden Pizza Cutter. Chests are never sold.

## Collection

All 12 cards are owned by day 7 (median; every seed by day 30), faster than the research's two
weeks: an engaged player opens about 11 chests a day, so legendary protection (one within 40
chests) fires every 3 to 4 days. Without ad chests (about 8 a day) it is day 8, with x2.5 income
on day 30. Then the long game is levels: each needs 1.5 times the copies of the last, about one
level per rarity every three weeks by day 90.

## Why cards cannot wreck pacing

Small steps (common 4 % then +2.5 % a level, rare 6 % +3.5 %, epic 12 % +5 %, legendary global
income 8 % +4 %) on levels that grow with the logarithm of copies: x3.4 after 90 days. Each venue
costs hundreds of times the last, so cards bring a venue a little closer and never skip one.
