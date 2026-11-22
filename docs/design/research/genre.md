# Genre teardown: production-chain idle sims with visible workers

Web search worked. Fandom wikis refused direct fetch (HTTP 402), so wiki numbers are search extracts. Sources [1]–[4] and [12] are first-party; [11] is an industry article plus a fan wiki. **[5]–[10] are fan or secondary: unverified.** `(?)` marks my inference or memory.

Cases: **Idle Miner Tycoon** (Kolibri; "the reference"), **Eatventure** (Lessmore; nearest to our fiction), **Idle Supermarket Tycoon** (Codigames). Mechanics are named generically. The reference's own terms appear only in list B.

## 1. Core loop

- **Chain:** extract → lift → sell, in series; cash appears only after the last stage. The whole loop is on one screen. The developer calls the hand-offs "choke points" that "become the basis of your monetization" [1].
- **Before automation:** tap each stage's worker per cycle. Play stays manual until the first site is level 5, then the first hire is offered [7].
- **Levels:** each raises that stage's capacity and speed; buy ×1/×10/×50/max [5]. Thresholds at 10, 25, 50, 100, 200, then every 100 to 800 give a jump (about ×2 in older guides) plus premium currency. Extra workers at 10/50/100/200/400, maximum 6 [6]. Caps: 800 per site, 2,400 for the shared lift and sell stages; 30 sites per location [2]. Sources conflict on the value step between sites (about ×2 or "≈500×" [3][6]): do not calibrate on it.
- **Bottlenecks:** no explicit warning. Backlog counters pile up at each hand-off, apparently without loss, and each stage's upgrade panel shows its own rate (?). The player has to compare them, and guides have to explain it [5]. Codigames marks the limiting stage red on a stats page; there, a full car park loses customers [10].
- **Eatventure:** tap a station to level it; each star doubles that dish; premium currency at 10/25/50/75/100/150/200/250 [9]. No transport decision.
- **Draft:** lossless buffers match the reference. Add the readout it lacks: made / carried / sold per minute side by side, lowest highlighted.

## 2. Automation hires

- **Reference:** one slot per site and stage; price rises per hire; each hire is a random tier (three) and ability (move speed, work speed, upgrade discount) [5]. Wiki values: move ×3/×5/×7, work ×3/×5/×8, discount 40/70/80 %, cooldown 5/15/50 min; durations not found [6]. Abilities are manual. Sell-back is 50 %, or 100 % after an ad [5].
- **Premium heroes:** named hires with an active (60–120 s, cooldown 15–30 min), passives and equipment, bought with a side-mode currency or 30 fragments [2][3][6].
- **Draft:** Rush (×3, 30 s per 5 min) is mild. Hires have no tier or active; staff cards could carry both.

## 3. Progression

- **Locations:** the second costs 7.6e19 soft cash; each new region has its own soft currency, restarting the numbers [5].
- **Timed gates:** every 5 sites, pay and wait (about 1 h early on), or skip with an ad or premium currency [6][8]. The developer's stated thesis is "pay or wait": nobody can lose [1].
- **Prestige:** per location, up to 6 times; each step costs soft cash from a fixed table for a larger fixed multiplier (one location: 17/38/57/84/105/127× [6]). It resets that location only [2].
- **Contrast:** global prestige, points = 150·√(lifetime/1e15), +2 % each [11]: the shape in `economy.ts`. Eatventure has none: 60 cities, each a fresh economy with meta kept [9]. Codigames: sell the venue, restart at ×50, ×100 … ×2,200 [10].
- **Events:** a separate location for about 5 days with a throwaway economy and milestone rewards [2]; they "often doubled revenue for a weekend" [1].
- **Draft:** a global reset of every venue is the harsher model. The reference keeps the other locations earning while one is rebuilt.

## 4. Meta

| | Reference | Eatventure |
|---|---|---|
| Collectibles | worker cards, 4 rarities, duplicates level up [7] | gear, 6 rarities, merge duplicates [9] |
| Chests | from timer missions, events, shop [2][3][4] | 40 or 200 gems; odds listings conflict (epic about 3 %, legendary 2–5 %) [9] |
| Permanent | research tree; points from events, dailies, or 200 premium [5][6] | gem upgrades: ad boost to ×6, longer offline cap [9] |
| Timers, social | pick 1 of 3 missions, 6 h or more, 5 a day [3][5] | clubs, 2-week seasons [9] |
| Pass | free and paid track from event points, $9.99 [2][4] | event pass $10.99 [4] |

## 5. Monetization

| Rewarded ad | Reference | Eatventure |
|---|---|---|
| Income ×2 | 4 h per ad, stacks to 32 h (wiki, older guides); 1 h in a recent teardown [6][7][8] | 5 min per ad, stacks to 1 h [9] |
| Offline ×2 | yes [7] | yes; cap 3 h [9] |
| Random visitor, lump sum | yes; ad-gating unclear [8] | ad-gated, about 15 s on screen [9] |
| Other | skip a gate, full refund on a hire, double a claimed reward [5][8] | |

- Codigames: ×2 for 1 h per ad, stacks to 6 h; 6 ads a day for gems [10].
- Developer figures, about 2019: roughly 60 % of revenue from ads, 52 % of players watch, about 8 ads per player per day (wording ambiguous), sessions about 10 min [1].
- US App Store [4]. Reference: currency $1.99/4.99/9.99/19.99, starter $4.99, permanent ×2 $6.99, pass $9.99, event offers $2.99–19.99; no-ads about $15 (a 2020 review). Eatventure: daily $0.99, gems $2.19/5.39/10.99, permanent boost $5.39, largest offer $26.99.
- **Repo:** no-ads at $3.99 that also makes boosts free is about a quarter of the reference's price, while ads are the main income. Reprice or split it.

## 6. Pacing (reference)

- **0–3 min:** forced manual loop, levels to 5, first hire, then the other two stages, second site [7].
- **3–30 min:** sites 2–5; thresholds 10/25/50 drip premium currency; first ×2 ad; the gate at site 5 teaches the ad skip and opens the event location [6][7].
- **Day 1:** offline payout with ×2 ad, boost stacking, hour-scale gates, timer missions. The second location is a multi-day goal (?).
- Prototype D1: 63–81 % [1]. The draft's targets (hire at 1–2 min, venue 2 at 20–40 min) are as fast or faster.

## 7. Haptics (owner request)

- **Genre:** a vibration toggle in settings (Eatventure [9]); nothing public for the reference. I found no credible evidence that haptics move retention: treat as polish.
- **Platform rules [12]:** causal, consistent, optional; stronger for important events, weaker for frequent ones. Android prefers no haptics over buzzy ones.
- **Rule here:** vibrate for what the finger just did and for rare peaks, never for simulation events. In `src/services/fx/catalog.ts`, `cash` (a customer pays; 180 ms limit) could buzz several times a second once automated, and `deal_popup` buzzes for a sales prompt. Remove both haptics. `bonus_appear` is borderline: unprompted but rare.
- **Android** (read from `node_modules/expo-haptics` 58.0.8): `impactAsync` and `notificationAsync` are `Vibrator` waveforms (impacts 43–60 ms). `light` equals `soft` and `medium` equals `rigid`. The 7-step `prestige` pattern is 0.8 s with five buzzes. Map each key to one `performAndroidHapticsAsync` constant. `Confirm`/`Reject` need Android 11, `Segment_*`/`Toggle_*` Android 14, and throw below that: fall back to `Context_Click`.
- **iOS:** silent in Low Power Mode, with camera or dictation active, or with system haptics off. Never the only signal.

## A. Generic mechanics: safe to build on

Serial chain with income = slowest stage and visible backlog · tap-to-run until a one-time automation hire · exponential level costs (`base × growth^level`, 1.07–1.15 [11]) with threshold jumps · tiered hires with cooldown actives · scaled locations · permanent-multiplier resets · pay-or-wait timers · opt-in rewarded ads (stackable ×2, offline ×2, timer skip) · capped offline earnings · time-limited event location · free and paid pass · rarity cards with duplicate levelling · chests with disclosed odds · research tree · missions, daily gifts.

## B. Their own expression: do NOT reproduce

- **Look and layout** (from memory; check screenshots): the mining fiction and cross-section (stacked shafts, one elevator column, a surface warehouse with a carrier); the row UI (manager portrait and ability button left, level button right, boost slot above the warehouse); the island map; the bearded miner mascot, the mole visitor, the named hero cast.
- **Terms:** Super Cash, Super Managers, Idle Cash, Instant Cash, Event Mine, Expeditions, Mainland, Impossible Island, Prestige Stars, the Junior/Senior/Executive ladder.
- **Level structure:** 30 shafts with a barrier every 5, the 800/2,400 caps, six prestiges and their table, the coal → gold → ruby ladder, exact boost timings.
- **Other games too:** Eatventure's lemonade-stand start, crate-delivered staff, "investor", "vault". Its top-down restaurant (?) is the nearest look-alike to the draft's scene.
- **Already in the repo:** `businesses` in `games/pizza-empire/game.json` equals AdVenture Capitalist's Earth table: all ten rows of cost, growth, cycle time and revenue, plus the manager prices, match its fan wiki [11]. `scripts/generate-game.ts` copies those numbers into every generated game. Derive our own table for sim and classic. Two `flavor` lines also echo brand slogans ("The happiest crust on Earth", "30 minutes or it's free").

## Sources

[1] GameAnalytics, "Making a hit idle game: eight lessons from Kolibri Games". [2] Kolibri help centre: FAQ 48, FAQ 53, section 74, hero FAQs 364/366/509/528. [3] Kolibri blog: "Let's dig in", "Economy in free-to-play mobile games, part 2". [4] US App Store: id1116645064, id1600871388. [5] BlueStacks guides. [6] idleminertycoon.fandom.com. [7] LDPlayer, WriterParty, AppGamer guides. [8] Gamigion, "The stackable ad economy". [9] LevelWinner, eatventuretools.app, eatventure-games.fandom.com, SimpleGameGuide. [10] LevelWinner, AppGamer (Idle Supermarket Tycoon). [11] Pecorella, "The Math of Idle Games" I and III; adventure-capitalist.fandom.com/wiki/Businesses. [12] Apple HIG "Playing haptics"; Android haptics principles; Expo SDK 58 haptics docs.
