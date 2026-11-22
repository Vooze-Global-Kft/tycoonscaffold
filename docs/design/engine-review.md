# Engine review (adversarial)

Scope: `src/engine/chain.ts`, `economy.ts`, `cards.ts`, `rng.ts`, `format.ts`, `src/state/store.ts`,
`src/state/events.ts`, `src/services/ads.ts`, `iap.ts`, `region.ts`, `scripts/simulate.ts`.
Baseline: the code at commit `cdd7aa1`. Part of this work was committed by the orchestrator in
`011a90c`; the rest is in the working tree.

Method: engine bugs were proven by a unit test that failed first, then fixed. Those tests are kept
in the `review:` blocks of `chain.test.ts` and `economy.test.ts`. Store and service code cannot be
unit-tested in this checkout (no React Native runtime), so for those files I reasoned through each
case, fixed it, and explain the reasoning below. Numbers marked "measured" come from scratch probes
run against the `cdd7aa1` code.

Verify: `npx vitest run` (192 tests pass) and `npx tsc --noEmit` (clean).

## Findings

| ID | Sev | Area | Finding | Status |
|---|---|---|---|---|
| S1 | Critical | store / App.tsx | Every return to the foreground called `boot()`, which re-read the save from disk and replaced the in-memory game. A payment sheet or a full-screen ad sends the app to inactive or background, so a purchase or ad reward granted while boot was still awaiting Remote Config (up to 2.5 s) was overwritten. Real-money gems and ad rewards could be lost. | Fixed in the store; App.tsx change needed |
| S2 | High | store | `boot()` called meta functions that still threw `todo()`. Boot never set `hydrated`, so the game never started; housekeeping threw every 2 s from inside `tick`. | Fixed (`safe()` with `crash.record`) |
| S3 | High | store | `collectOffline` read `offline` before awaiting the ad and cleared it afterwards, so a double tap paid offline earnings twice. | Fixed |
| C1 | High | chain | Time was silently dropped. Each worker or seat got 16 loop passes per sub-step, and a tick was split into at most 24 sub-steps. Measured: 0.01 s trips reached 39 % of the advertised transport rate on 0.1 s ticks and 16 % on 1 s ticks. A 600 s tick ran at 95 %, a 3,600 s tick at 13 to 16 %. | Fixed |
| C4 | High | chain | The dust threshold was `1e-6 × spend`. When a portion is much bigger than a tray, guests ignored real food: measured at 91.7 % of the rate on every tick size. | Fixed |
| E1 | High | economy | NaN cash passed every `cost > cash` check, so everything was free. Infinity cash turned into NaN at the first purchase (`Infinity - Infinity`), and "max" bought `Infinity` levels. Overflow at about 1.8e308 led there. | Fixed |
| E3 | High | economy | `reconcileState` threw on wrong types (`upgrades: "x"`, `cards: {id: null}`) and kept NaN and negative numbers. It treated any version other than 2 as version 1, so a save from a newer build wiped a sim run. It called `Date.now()` inside the engine. | Fixed |
| S4 | Medium | store | On Android the JS loop can keep running in the background, and offline time was measured from the last save, so the same time could be paid twice. | Fixed (offline measured from the last tick) |
| S5 | Medium | store | `watchAdChest` opened a chest even when `grantAdChest` refused the grant, which opened a chest the player owned from another source. | Fixed |
| S6 | Medium | store | `save()` before boot finished wrote a blank game over the real save. | Fixed |
| A1 | Medium | ads | `setRequestConfiguration` was never called (policy checklist item 9). | Fixed: `maxAdContentRating` from config, default PG, set before `initialize()` |
| A2 | Medium | ads/store | Interstitials on `tab_change` and `offline_collect` (item 11). | Removed |
| A3 | Medium | ads/store | The prestige interstitial appeared at the same moment as the reset (item 11). | Delayed 1 s; all conditions are checked again when the delay ends |
| A4 | Medium | ads | Sound kept playing under full-screen ads. Two full-screen ads could open at once. An interstitial could follow a rewarded ad immediately (ad chest, then `chest_close`). | Fixed: `fx.suspend`/`fx.resume`, one ad at a time, 30 s of quiet after any full-screen ad |
| C2 | Medium | chain | A NaN, infinite or negative `inflow`, `dt` or param poisoned the buffers for good, and `dt = Infinity` invented 25 guests. | Fixed (`saneParams`, input guards; the rate functions use the same sane params) |
| C3 | Medium | chain | Saves were never trimmed: a save with 1,000 workers kept them, and a broken worker or seat crashed or leaked value. | Fixed: new `fitChain` repairs and trims without losing value; used by `reconcileState` |
| E4 | Medium | economy | A clock moved backwards stretched the boost, the rush and its cooldown by the same amount. A save "from the future" was handled only by the `Math.max`, and a NaN `lastSavedAt` made offline earnings NaN. | Fixed: new `clampClock()` runs on boot and resume; `computeOffline` guards |
| E5 | Medium | economy | `stats.served` differed depending on whether the caller passed an events array (whole guests versus `paid / spend`), so the app and the balance bot disagreed about missions. | Fixed: `advanceChain` returns `guestsPaid` |
| E2 | Medium | economy | Buying a negative, fractional or NaN amount was allowed. `-5` cost 0 and lowered `owned`. | Fixed (`wholeAmount`) |
| S7 | Medium | store | No in-flight guard on async actions (boost ad, ad chest, rush reset, deal, IAP, restore). A double tap opened two ads or two sheets. | Fixed (`once()`), plus a per-product guard in `iap.ts` |
| I1 | Low | iap | If the product fetch failed at startup (offline), every purchase failed until the app restarted. | Fixed: products are fetched again at purchase time |
| R1 | Low | region | An Apple storefront code missing from the 7-entry alpha-3 table fell back to the device locale. A Belgian account on an en-US phone counted as US. The file's comment also said unknown means unrestricted, which contradicts the meta contract. | Fixed: full ISO table; an unreadable storefront returns `null` (unknown) |
| C5 | Low | chain | Capacity 0 made empty trips with zero-amount events. Spend 0 seated guests at empty plates. | Fixed: they wait |
| C6 | Low | chain | The seat gap used `Math.sin`, which is not bit-identical across JS engines, and the shared guest counter, which changed mid-wait. | Fixed: integer hash of the seat's own last guest |
| E6 | Low | economy | `hireManager` worked in a venue that was not open. | Fixed |
| E7 | Low | economy | Rush was tested at `now` only, so a tick that straddled the end of a rush got all of it or none of it. | Fixed (`simSeconds`) |
| S8 | Low | store | One throwing `simEvents` listener stopped the others and the tick. The reused event array was handed to listeners. | Fixed: each listener is isolated; listeners get a copy |
| S9 | Low | store | `deal_popup` buzzed (policy item 6). | The store passes `haptic: false`; the catalogue entry should drop it too (fx owner) |
| P1 | Perf | economy | Off-screen venues recomputed stations × cards × upgrades × milestones on every tick and every income display. | Fixed: per-venue-object rate cache. Measured in V8 with 8 venues: a tick went from 17.4 to 3.7 µs, `incomePerSecond` from 14.5 to 1.4 µs |
| X1 | Info | economy | Classic parity: `tapBase` is now also multiplied by "all" upgrades, because they moved into the global multiplier. This is a third, small consequence of the two intended changes. | Kept, documented |

## How each was proven or reasoned

- **C1, C4, C2, C5, C6, C3**: `chain.test.ts` → `review:` blocks. They check throughput against
  `transportRate` for ticks from 1 ms to 3,600 s and for 0.01 s trips, hostile inputs table by table,
  zero stages, event pairing and order per seat across irregular ticks, and `fitChain` on oversized
  and corrupted saves. The loop guard now scales with the slice length
  (`8 + 6·ceil(h / shortest cycle)`). Up to 4,096 slices of at most 0.25 s are used (full
  resolution up to about 17 minutes of simulated time). Trips shorter than `MIN_TRIP_SECONDS = 0.05`
  run at 0.05 s, and the rate functions apply the same clamp. The dust threshold is now
  `1e-9 × min(tray, portion)`.
- **E1, E2, E6**: `economy.test.ts` → `review: money at the edges`. Includes a 3,000-case property
  test: "max" is maximal and never overspends for cash up to 1e300, venue scale up to 1e11 and up
  to 2,000 levels owned. Earnings saturate at `MAX_CASH = Number.MAX_VALUE`, and every price check
  goes through `canAfford` (finite cost, cash ≥ cost, false for NaN).
- **E3**: `review: hostile saves` covers 12 named cases (null, number, string, array, NaN or
  negative money, wrong types everywhere, unknown venues and ids, broken businesses, first venue
  locked, bad multipliers), a 150-round fuzz over every field, newer versions, and "never reads the
  device clock" (a `Date.now` spy that throws). Fields this file does not know (meta systems) load
  through `mergeShape`, which checks types against the fresh state. A field the meta owner adds
  later still loads that way.
- **E4, E7**: `review: clock`.
- **E5, venue switching**: `review: venues on and off screen`. Switching the venue on screen every
  tick for 2,000 s earns under 1 % more than staying put. The only difference is the few plates on
  the tables at the start and end of the window. Over 6,000 s, on-screen income measured 99.96 to
  100 % of the steady-state rate in every bottleneck. So switching cannot double-count a full
  buffer: an off-screen chain is frozen and earns `min(production, transport, sales)`, and its
  backlog is real value made earlier.
- **P1**: `review: idle path` checks that the cache is reused on the idle tick and is invalidated
  by station, transport and sales levels, upgrades and cards.
- **Classic parity**: a scratch probe ran the previous engine
  (`origin/main:src/engine/economy.ts`) and this one side by side for 4,000 s of a scripted
  space-miner session with purchases, "max" buys, hires, upgrades including an "all" one, and a
  boost. Cash, income and offline earnings agreed to a relative 3e-8. The drift comes from
  `geometricCost` now dividing before multiplying, which keeps huge costs finite. Taps differ only
  as intended, plus X1.
- **S1 (reasoned)**: the old App.tsx treated every non-active state as background and called
  `boot()` on `active`. A store sheet (iOS) and an ad activity (Android) both trigger that cycle,
  and the purchase or reward resolves while `boot()` awaits. Then
  `set({ game: <copy read from disk before the purchase> })`. Now `boot()` runs once; a second call
  waits for the first and then calls `resume()`, so the current App.tsx is already safe. `resume()`
  is synchronous and works on the in-memory state:
  1. It repairs the clock and counts a session only after 30 minutes away (`registerSession`
     measured from the later of the last save and the last tick).
  2. It resets the one-deal-popup-per-session flag on a new session, refreshes meta timers, and
     pays the time away. Under the popup threshold (and at most 300 s), the time away is simulated
     as one long tick at full speed, so an ad on Android costs nothing. Above it, the time joins
     any popup still open, so nothing is dropped or paid twice.
  3. It resets the combo and the rush-end detector so no stale `rush_end` sound plays.
  4. It never re-inits ads, IAP or region and never re-reads the disk.

  `pause()` stops the loop and saves.
- **S2**: every meta call in the store goes through `safe(where, fn, fallback)`, which reports
  through `crash.record` and keeps going. Each of the three refreshes is isolated. A paid deal whose
  grant fails is reported explicitly.
- **S3, S5, S7**: `once(key, fn)` drops a second call while the first is in flight.
  `collectOffline` pays only what is still pending, including time merged in by a `resume()`
  during the ad.
- **Rush end**: detected from the state after the tick. It is re-armed on boot and resume, so the
  sound plays only when a rush really ends while the player watches.
- **Saving while a chest is open**: the chest's rewards are already in the state when the reveal
  starts, and `openChestNow` saves at once. Killing the app mid-reveal loses the animation, never
  the rewards. Correct as is.
- **Double taps on buy buttons**: the synchronous buys (`buy`, `buyTransport`, ...) re-read the
  latest state on each call, so a double tap buys twice only when both purchases are affordable.
  That is the intended behaviour, and nothing is ever overspent.

## Checked and found correct

- Conservation in the chain: every test (old and new) checks `valueInChain + paid = produced`.
- Event order per seat: arrive > served > pay > leave. Every load is unloaded; every serving is paid.
- `ringBell` without a manager arms idle workers once. A worker waiting at an empty buffer keeps
  waiting. Ringing with nobody idle returns the same object.
- `resizeChain` only grows (by design); new workers walk in.
- Milestone repeat maths: `milestoneMults`, `nextMilestone` and `previousMilestone` agree at and
  between thresholds. `every` is a positive integer by schema.
- Prestige: points are `floor(scale·√(lifetime/threshold))`, and lifetime can no longer be
  Infinity. Prestige keeps the boost, gems, premium upgrades, entitlements, cards, chests, missions,
  deals, story and stats, and resets the rush (a fresh skill after a reset is acceptable).
- `unlockVenue` enforces config order. A save with venue c open and b closed offers b next.
- Rush timings: `until`, `readyAt` and the ad reset (`resetRushCooldown` refuses during a rush).
- `cards.ts` and `rng.ts` (mulberry32; `rngWeighted` returns 0 when all weights are 0).
  `format.ts`: exact powers of ten from 1e3 to 1e308 format correctly. `999,999` reads `999.99K`
  by design (never overstated).
- `scripts/simulate.ts` needed no change. It runs `pizza-empire --hours 3` in 3.4 s. Because it
  uses `NOW = 0`, it exposed a bug in my own first version of `simSeconds` (a rush that never
  started counted as one at time 0). That is fixed and covered by a test.

## App.tsx change the app team must make

In `useGameLoop` (src/ui/App.tsx), replace the AppState handler:

```ts
const sub = AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    useGame.getState().resume();      // was: boot(); never re-read the save while running
    last.current = Date.now();
  } else if (state === 'background') {
    void useGame.getState().pause();  // stops the loop and saves
  }
  // 'inactive' (iOS: Control Centre, a call banner, the purchase sheet): keep running, do nothing.
});
```

Keep the single `boot()` in `Root`. Until this lands, the old handler is safe: a second `boot()`
now becomes `resume()`, and `resume()` measures from the last tick, so time is never paid twice.
The old handler still saves on every `inactive`, which is harmless.

Also from policy.md item 11 (UI, not reviewed here): move `<Banner />` off the tap scene and away
from `<TabBar />`.

## For the meta owner (src/engine/meta.ts)

1. `reconcileState` shape-checks `missions`, `dailyShop` and unknown future fields only shallowly
   (`mergeShape`): `missions.slots` entries, `dailyShop.offerIds` and deal entries are not
   validated per item. Please validate them where you read them, or export a `reconcileMeta` that
   `reconcileState` can call. Deals with ids no longer in the config, chests with unknown ids and
   chest counts that are not positive integers are dropped.
2. `clampClock` repairs only the boost, the rush and `lastSavedAt`. A clock moved backwards also
   leaves `chests.freeAnchor` and `chests.adNextAt` in the future: the free chest and the ad chest
   would wait for as long as the clock moved. Please add a `clampMetaClock(cfg, state, now)`. Deal
   `endsAt` must stay as it is: policy forbids extending or resetting an offer. Once it exists, the
   store should call it next to `clampClock` in `boot()` and `resume()`.
3. The store now also calls `registerSession` and `startFreeChestTimer` from `resume()`. Both must
   be idempotent; `registerSession` receives `lastSavedAt` set to the moment play stopped.
4. `refreshDeals`, `refreshDailyShop` and `refreshMissions` run every 2 s. Please return the same
   object when nothing changed, so the store does not re-render.
5. `stats.served` counts guests on screen and estimated portions off screen (fractional).
   Mission targets on `served` should expect fractions.
6. The `region.ts` comment now matches your contract (unknown = restricted).
7. `advanceChain` also returns `guestsPaid`. The rate functions apply `saneParams`, with the same
   signatures as before.

## Remaining risks

- The store and services are reasoned, not tested. The first device test should cover these
  cycles on iOS and Android: payment sheet, rewarded ad, app switcher, 10 minutes away.
- The performance numbers are from V8. Hermes is slower, though the idle tick is now about 4 µs of
  V8 time. Allocation per on-screen tick is about 20 to 60 small objects: the new state, venue and
  chain objects, changed workers and seats, and event objects.
- A clock moved forwards still pays offline time (capped by `offline.maxHours`) and the daily gift.
  Fixing that needs server time.
- Rush also speeds up off-screen venues (so it acts as a global ×3). That is a design question,
  left as it was.
- Values saturate at about 1.8e308: past that, costs become Infinity and progress stops cleanly.
  Swap in a big-number type if a game ever gets there.
- `MIN_TRIP_SECONDS` silently speeds up configs below 0.05 s. `validate` could warn (schema owner).
- The `chest_close` interstitial still exists. It is now kept 30 s away from any full-screen ad, but
  product may want it gone after ad chests entirely.
- Each `safe()` fallback hides a meta failure from the player. It is recorded in Crashlytics, which
  should be watched after release.
