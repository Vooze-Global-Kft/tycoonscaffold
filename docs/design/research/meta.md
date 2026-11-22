# Research: meta systems and restaurant sims

Web search worked; sources are numbered at the end. **(own)** marks my reasoning, with no source. Games are named as evidence only: we take mechanics, never names, cast, art, layout or UI.

## 1. Restaurant idle sims on a phone

- **Start tiny.** Eatventure starts with a single street stand [1]. Copy the scale, not the stand: 3 to 5 actors in minute one, not 40 (own).
- **State sits above heads** (own): order icon over a waiting customer, dish on the tray, ring on a busy station, arrow badge on anything affordable. Queues and the pile on the pass show the bottleneck: draw a capped pile plus a count.
- **Zones must match panel names.** Idle Bank Tycoon players could not tell which floor area belonged to which upgrade track [2].
- **Pitfalls.** An analyst who reviewed 25+ Eatventure-likes concludes that decor-only reskins do not become hits [1]: each of our games needs one mechanic of its own. Cat Snack Bar has far more offers yet half the US revenue per download [1]. Long timers become walls and frequent checkers find nothing to do [3], so tap, bell and Rush must always pay. Days 7 to 30 without a new mechanic lose players [2]. Never present bots as other players, as Eatventure's helpers do [1].
- **Naming.** Kolibri registered "Idle Miner Tycoon" in the US and filed "Idle Cooking Tycoon" and "Idle Cafe Tycoon" [4] (registry not checked). Avoid "Idle ... Tycoon" store titles.

## 2. Chests and cards

- Clash Royale's chest cycle (4 slots; unlock timers of 3, 8 and 12 h; a free chest every 4 h) was **removed in spring 2025**: timers delayed rewards and full slots made wins feel worthless [5]. Keep one appointment chest; build no slots or unlock timers.
- Its copies per level (Supercell, Nov 2025): common 2, 4, 10, 20, 50, 100, then doubling to 800; legendary 2, 4, 6, 9, 12; +10 % stats per level [6]. The ratio is about 2 early and 1.5 late, and chest contents grow with progression [7].
- Top-rarity odds sit near 1 % per pull: 1.01 % [7]; 1.1 % per Hearthstone card, which also guarantees a rare per pack, an epic within 10 packs and a legendary within 40 [8].
- **Compliance.** Apple 3.1.1 and Google Play require the odds of each item type before purchase [9][10]. The UK ASA wants a line such as "includes random-item purchases" near the top of the store listing (monitored since 26 May 2026) [11]. Brazil bans loot boxes for under-18s from March 2026 [12]; a Belgian court held paid loot boxes unlawful in 2025 [13]. Treat gem-bought chests as paid. Needed: a per-region flag that makes chests earn-only, and a `store` field that `npm run sync` writes into the listing.

## 3. Missions

Rules that hold across games [14]: limited opportunities (never grindable), mixed difficulty, goals built on the game's own mechanics. Purely passive goals feel unrewarding; a single daily goal is weak.

## 4. Deals

- Starter pack: show at session 3 to 5, keep 3 to 5 days; over half of BattleHand players chose it over plain gems. An $8 pack out-earned its $4 twin at equal retention [15]. Surveyed developers (n=54) mostly price under $5, which the author calls too low [16].
- One ad-led hybrid-casual game earned 40 % from IAP: of that, no-ads 17 %, timed offers 17 %, currency packs 3 % [17]. Sell No Ads, multipliers and bundles first.
- EU CPC principles (2025, non-binding): show the real-money price beside gem prices; let players buy the exact amount [18]. UK CMA: "Countdowns that are untrue because the sale price rolls on beyond the advertised end point are misleading" [19].
- Generous but sustainable, as a yardstick (own): free play earns the top chest about every 12 days, $9.99 buys it today, and no card or chest is paid-only.

## 5. Honest day 1 and day 7 hooks

Idle D1: 39 % top quarter, 46 % top tenth; 5 sessions a day of 6 to 8 min [20]. All-genre D7: median under 4 %, top quarter 6 to 7 % [21].

- **Day 1:** real offline earnings on return; a free chest ready for session 2; tomorrow's gift shown today; notification permission asked after the first win, and only literal messages ("Free box ready"). Promotional pushes need opt-in (Apple 4.5.4) [9].
- **Day 7:** a calendar counted in days played (no streak loss) ending in a guaranteed legendary; a weekend event that reuses the core loop and is mostly completable free [3].
- All twelve cards are found in about two weeks (own estimate); the long game is levels and new cards.

## 6. Haptics (owner's addition)

`genre.md` section 7 covers platform rules and the Android mapping; I agree. Additions for the meta layer:

- A CHI 2021 study found haptic embellishments raise enjoyment and immersion [22]; I found no retention data. Android: a click lasts 10 to 20 ms and rings 20 to 50 ms more; "choose no haptics" over buzzy ones [23].
- `expo-haptics` 58.0.8 has no pattern API [24], so catalogue patterns are JS-timed pulses that will drift while a chest animation is busy (own): fire each step from the animation timeline.
- In `src/services/fx/catalog.ts`: `tap` (`light`, 30 ms interval) is a continuous buzz on Android at 10 taps a second, because each pulse lasts 50 ms; `card_flip` plus `reveal_*` pulse twice per card, so a six-card chest gives 20+ pulses; `chest_shake` can repeat every 200 ms; `ui_denied` can fire 6 times a second; one `minIntervalMs` serves both sound and haptic.

## Recommended parameters

| Area | Parameter | Value | Source or reasoning |
|---|---|---|---|
| Chest | Free Box | 4 h recharge, 2 stored (first two: 15 min, 1 h) | 5 sessions a day [20]; no slots [5] |
| Chest | Ad Box | 2 h cooldown, 3 a day; no ad-skip of the free timer | [2]; the timer is why players return (own) |
| Chest | Slots, copies | Box 3, ~5; Crate 4, 15 to 20; Golden 6, 60 to 80; +20 to 25 % per highest venue ever | supply must grow [7] and survive prestige (own) |
| Chest | Odds per slot, C/R/E/L | Box 74/20/5/1 %; Golden up to 5 % legendary | [7][8] |
| Chest | Guarantees | Crate 1 rare; Golden 1 epic; first Golden 1 legendary; epic within 10 Boxes, legendary within 40 | [8]; shown with the odds [9] |
| Chest | Gem price | Crate 100; Golden 500 to 600 | the $1.99 and $9.99 packs, exact amounts [18] |
| Cards | Copies to next level | 2 × 1.5^(L−1), ratio 1.4 to 1.6; no cash cost | at 25 to 70 free copies a day, ratio 2 doubles the wait each level (own) |
| Cards | Effect per level | +8 to 12 % stage stats; +3 to 5 % global income | +10 % in [6] |
| Missions | Slots | 3 at a time (one action, one spending, one flow); 10 a day | limited and mixed [14] |
| Missions | Length | first 5: 30 to 90 s; next 15: 3 to 8 min; then 15 to 40 min, under the offline cap | 6 to 8 min sessions [20] |
| Missions | Targets | flow = current rate × T; action counts 10, 25, 50, 100 | absolute numbers inflate (own) |
| Missions | Rewards | 2 to 5 gems each; 5th a Box; 10th a Crate; 30 gems a day at most | bar-to-milestone quests [2]; with the 115-a-week gift, free gems total about 45 a day (own) |
| Deals | Starter | from session 3, 72 h, once; test $4.99 against $7.99; 3× shop value (add a Golden) | [15][16]; today's pack is 2× |
| Deals | Triggered | once per trigger, 24 to 48 h, no twin for 30 days | [19] |
| Deals | Pop-ups | 1 a session, none in session 1 | [1] |
| Deals | Daily row | 1 free + 3 gem items incl. fixed card copies; local-midnight reset; real price shown | [2][18]; a non-random route to cards |
| Haptics | Rate | player-caused: 8 pulses a second at most, on its own interval; sim-caused: none | [23] |
| Haptics | Chest opening | 10 pulses a chest at most; none on flip; 1 for common or rare, 2 epic, 4 legendary; gaps of 80 ms or more | strength follows importance [23] |

If No Ads is repriced (`genre.md` section 5), rebuild the starter around the Golden chest.

## Sources

1. https://www.pocketgamer.biz/eatventure-vs-cat-snack-bar-an-analysis-of-both-games/
2. https://www.pocketgamer.biz/game-analysis-deconstructing-idle-bank-tycoon-by-kolibri-games/
3. https://www.pocketgamer.biz/deconstructing-a-100m-idle-game-what-5-years-of-gold-and-goblins-reveals-about-live-ops-and-retention/
4. https://trademarks.justia.com/owners/kolibri-games-gmbh-4363938 (search extract; page refused fetch)
5. https://royaleapi.com/blog/rip-chests-2025-q1-update and https://mobilematters.gg/clash-royale/chests-clash-royale-rewards-unlock-times-how-to-get (search extracts)
6. https://alviran.net/blog/clash-royale-upgrade-costs-gold-cards-level-16-2026/ (reproduces Supercell's tables); https://cr-ds.github.io/html/level.html
7. https://supercell.com/en/games/clashroyale/blog/news/clash-royale-chest-info-2
8. https://hearthstone.wiki.gg/wiki/Card_pack_statistics (fan wiki quoting Blizzard)
9. https://developer.apple.com/app-store/review/guidelines/
10. https://support.google.com/googleplay/android-developer/answer/9858738
11. https://www.asa.org.uk/resource/enforcement-notice-disclosure-of-loot-boxes-in-app-stores.html
12. https://www.pocketgamer.biz/brazil-bans-loot-boxes-for-under-18s-in-online-child-safety-measure (search extract)
13. https://www.taylorwessing.com/en/insights-and-events/insights/2025/03/an-iphone-a-gambling-problem-and-the-loot-box-debate (search extract)
14. https://deconstructoroffun.com/blog//2016/07/the-making-of-mechanic-daily-goals.html
15. https://android-developers.googleblog.com/2016/08/5-tips-to-help-you-improve-game-as-a-service-monetization.html
16. https://www.deconstructoroffun.com/blog/2024/4/8/free-to-play-starter-pack-pricing-when-conversion-is-king-we-may-price-too-low
17. https://hackernoon.com/from-hypercasual-to-hybrid-casual-analysis-of-monetization-solutions-for-idle-games
18. https://connectontech.bakermckenzie.com/european-consumer-protection-network-issues-new-key-principles-on-in-game-virtual-currencies-impact-for-gaming-and-gambling-entities-in-belgium-the-eu-and-beyond/
19. https://competitionandmarkets.blog.gov.uk/2023/03/31/urgency-and-price-reduction-claims-are-your-online-tactics-legal
20. https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game
21. https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game
22. https://doi.org/10.1145/3411764.3445463
23. https://developer.android.com/develop/ui/views/haptics/haptics-principles
24. https://docs.expo.dev/versions/v58.0.0/sdk/haptics/ and `node_modules/expo-haptics/android/src/main/java/expo/modules/haptics/arguments/HapticsTypes.kt`
