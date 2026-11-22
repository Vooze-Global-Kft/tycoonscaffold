# Sim mode: plan and state of work

Written by the lead so the work can continue from the repository alone. Update it when a step lands.

## What the owner asked for

Turn Pizza Empire into a living restaurant in the style of production-chain idle sims (visible chefs, waiters,
customers), with custom sounds, haptics, chest-opening shows, deals, much more animation, and progression that
is almost infinite with the prestige reset kept. Everything must stay data-driven so other games reuse it.

## Where things are

Two checkouts, two branches (both pushed):

| Checkout | Branch | Holds |
|---|---|---|
| `/home/user/idle-tycoon-factory` | `sim-mode` | the app, sound service (`src/services/fx`), sound synth (`scripts/audio`), code-drawn art (`src/ui/sim/art`), scene layout maths (`src/ui/sim/layout.ts`), research (`docs/design/research`) |
| `/home/user/itf-engine` | `sim-mode-engine` | the reworked engine (`src/engine`), config schema, store, simulator, Pizza Empire sim content, UI kit (`src/ui/kit`), dev presets (`src/dev`) |

`main` is the last version the owner tested on a phone. Nothing lands on `main` until the new version is verified.

## Decisions (do not reopen without a reason)

- Two modes per game, `mode: classic | sim`. Classic must keep working (games/space-miner).
- Sim chain: stations (the game's `businesses`) -> buffer -> transport workers -> served -> seats -> paid.
  Value moves as numbers; cash appears only when a guest pays, and global multipliers apply there.
  Kernel: `src/engine/chain.ts`. Only the venue on screen is simulated worker by worker.
- Venues scale costs and values; opening costs are calibrated by `scripts/content/calibrate-venues.py`
  (about 35 min, 1h15, 2h15, 4h, 7h, 12h, 20h of continuous play). Prestige resets venues, keeps cards.
- Upgrades that target "all" are global income multipliers.
- Chests are EARNED, never sold, unless a game sets `meta.chestsForSale` (age ratings and law: see
  research/policy.md). Deals are consumable and time limits are real. Odds are shown on every chest.
- Haptics only for what the finger just did and for rare peaks; never for simulation events or offers.
- No interstitial on tab change or after declining a rewarded ad. No banner on the gameplay screen.
- In-scene characters and props are drawn in code (Skia), looks are data (`cast` in game.json,
  `char:<id>` icons). Painted images can replace pieces later (image generation was blocked by the
  Higgsfield daily limit when this was written).
- Our own economy tables everywhere (the first scaffold copied a known game's table: being replaced).

## Done

- Chain kernel + tests; economy v2 (venues, transport, sales, rush, offline, prestige) + tests; store v2;
  simulator bot; calibrated Pizza Empire economy (`scripts/content/build-pizza.py`).
- Meta contract in `src/engine/meta.ts` (cards, rewards, purchases implemented; chests, missions, deals,
  daily shop, sessions, hints specified with `todo()` stubs).
- Sound and haptics service (`fx.play(name)`), 177 tests. Catalogue: `src/services/fx/catalog.ts`.
- Research: genre, meta systems, store policy.
- Characters: the cast and ten poses. Stations props.

## In progress (agent teams; each keeps a handover note in the session scratchpad)

1. Audio: finish `scripts/audio` (music composer written, untested), render `shared/sfx`, QA sheet, review, fix.
   Plus `docs/design/critique-fun.md`: first-session script, home screen spec, juice list, chest sequence.
2. Art: CharacterBust, gallery, `index.ts`; props (pass, table, door, room, small items, chest, card frames);
   art-director review from screenshots; fix pass.
3. Engine (in `/home/user/itf-engine`): implement the meta contract + tests + Pizza Empire meta content;
   adversarial review of chain/economy/store with fixes (incl. a proper `resume()` instead of re-running
   `boot()` on foreground, ads policy changes); then an exploit / odds / meta-economy audit, and tooling
   (validate, sync, AI generator, second game's own economy, README).

## Next (in order)

1. Merge `sim-mode-engine` into `sim-mode` (`git fetch origin sim-mode-engine && git merge`). Expected
   conflicts: take THIS checkout's `src/services/fx/**` and `scripts/lib/games.js` (sound discovery; port any
   tooling changes by hand), take the engine checkout's `src/engine/**`, `src/state/**`, `src/config/schema*.ts`.
   Delete nothing from `src/ui/sim/art`.
2. Wire: `GameIcon` supports `char:<id>` (CharacterBust + `resolveLook(cfg.cast[id])`); App calls
   `applyDevParams()` after boot and multiplies the loop's dt by `devSpeed()`; `iap.priceInfo` for the
   real-money hint beside gem prices; `fx.suspend/resume` around full-screen ads.
3. Screens (four agents, disjoint files, placeholders created first so they compile independently):
   - scene: `src/ui/sim/VenueScene.tsx` (+ `scene/`): one Skia canvas, actors driven by shared values from an
     imperative store subscription (no React re-render per tick), `layout.ts` for positions, effects from
     `simEvents`, bell, rush button, bottleneck read-out, hint pointer.
   - home and panels: App layout per critique-fun.md, upgrade rows for the three stages, staff tab, empire
     tab (venues + prestige), tab bar, header, banner placement.
   - chests and cards: opening sequence, odds sheet, collection grid, card detail, HUD chest button.
   - shop: earned chests, daily shop, deals with real end times, missions sheet, settings (sound, music,
     haptics), deal popup.
4. Visual QA from web screenshots (`?preset=early|mid|late&speed=N&tab=...`, see `src/dev/devtools.ts`),
   fix loops; classic mode regression check (space-miner).
5. Final adversarial review (correctness and races, performance, policy), fixes, then merge to `main` and
   give the owner the phone steps.

## Rules for agents

- Never change git state; the lead commits. Stay inside your file list. Keep a handover note.
- One codebase, many games: no game ids in code. Engine stays pure and deterministic.
- Web exports are serialised: `flock /tmp/expo-export.lock env GAME=pizza-empire npx expo export --platform web ...`.
- The Fable model allowance ran out on 22 Nov (resets 24 Nov 17:00 UTC): agents run on Opus.
