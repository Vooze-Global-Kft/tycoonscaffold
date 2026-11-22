This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

This app is a single game screen with in-app tabs (`src/ui/App.tsx`), so it does not use Expo Router. Add Expo Router only if real multi-screen navigation is needed.

## Project rules

- One codebase, many games. Never branch on a game id in code: everything game-specific belongs in `games/<id>/game.json` and the schema in `src/config/schema.ts` / `schema.sim.ts` (with cross-field checks in `lintGameConfig`, `src/config/lint.ts`).
- One game per bundle, three levels of code (`scripts/lib/modes.js`, table in `docs/design/space-bundle.md`): (a) shared by every game (`SHARED_UI` under `src/ui`, `SHARED_SRC` for the rest of `src/`): no drawn art of any game, no screens of any game, no game words; (b) a family (`FAMILIES.tabs`: the tab shell, header, list homes, meta screens and the first game's drawn kit, for sim and classic only); (c) a mode's folders (`src/modes/<mode>/`, `src/ui/sim/`, `src/ui/scene/`, `src/ui/haul/`), reached only through the generated entry `src/generated/mode.ts`. A shared file imports only shared files; a family file only its family and shared files; a mode only itself, its families and shared files. What a shared piece needs from a mode (portraits, the tutorial pointer, "art:" icons, the hint script) the entry hands over at install (`src/modes/contract.ts`). A new file or folder anywhere in `src/` must be listed in `modes.js` or the check fails; imports are relative paths or installed packages (an import the check cannot resolve fails). `src/modes/entries.test.ts` pins what the sim, classic and haul entries hand over: keep it in step. Node-only files (`NODE_ONLY`: the fx catalogues, `src/config/artIcons.ts`, `src/config/lint.ts`) are never imported by the app (so they may read any mode's files). A mode's own game.json block that needs its own schema stays opaque in the shared schema and is parsed by the mode's engine at install (`EngineMode.config`; haul: `src/config/schema.haul.ts` is a haul file). A game gets only its own sound pack (`shared/sfx/<pack>/`, game.json `soundPack`, required). Another mode's theme words in a shared or family string fail the check unless listed in `scripts/lib/themeWords.allowed.json` (the known remainder: never add text a player reads). Run `npm run check:bundle` (`-- --words` lists every such word; `-- --export` before a release).
- `src/engine/` stays pure TypeScript: no React, no native imports, deterministic. Never call `Math.random` or `Date.now` there; time comes in as `now`, randomness from the seed in state (`rng.ts`). Every engine change comes with tests (`npm test`).
- All game state changes go through actions in `src/state/store.ts`; UI components never mutate state or call engine functions that change it on their own.
- Sound and haptics only through the fx service (`src/services/fx`, `fx.play('<key>')` with keys from `catalog.ts`); never import expo-audio or expo-haptics elsewhere. The app never imports `catalog.ts` at run time (only its types): it plays the generated per-mode table.
- Characters are drawn in code: use `"char:<id>"` icons with a look in the game's top-level `cast`, not new image assets, unless the game has its own art.
- Native SDKs are only required from `src/services/sdks.ts` (web uses `sdks.web.ts`).
- zustand selectors that return new objects or arrays must use `useShallow`. The store's `game` changes ten times a second: select the few values a component shows, never the whole object in lists or animated components.
- Animation runs on the UI thread (Reanimated shared values, Skia). Code there ("worklets") may only call other worklets: this crashes on phones but never in the web preview, so run `npm run lint:worklets`. Never free a Skia picture or image a mounted canvas may still draw; nothing invisible may keep animating.
- Never one Skia canvas per list row: portraits and `art:` icons go through `GameIcon`, which shows cached images.
- Every dialog is the kit `Sheet` (or registers with `useOverlay`): one dialog at a time, and popups, the tutorial hand and story dialogs wait for it (`src/state/overlays.ts`).
- Controls a hint can point at register with `useTarget(key)` (`src/ui/hints/targets.ts` lists the keys).
- Text on a coloured fill uses `textOn(fill)`; a stage or rarity colour used as text goes through `inkOf` (`src/ui/theme.ts`).
- Text in a bar of fixed height (the header) is sized by hand from `useWindowDimensions().fontScale` with `allowFontScaling={false}`, in rows whose heights add up (`src/ui/components/headerMetrics.ts`), never with negative margins. Never give a `TextInput` (so `RollingNumber`) a `lineHeight`: an iPhone draws the text at the bottom of the line, on top of whatever is under it, and the web preview does not show it.
- Shipped games' numbers come from `scripts/content/build-*.py`; change the script and regenerate, never hand-edit those tables. Each game needs its own economy table (`validate` rejects copies).
- Chests are earned, not sold, unless a game sets `meta.chestsForSale`; deals never contain permanent items; offer timers are real.
- Before declaring done: `npm run typecheck`, `npm test`, `npm run validate`, `npm run lint:worklets`, `npm run check:bundle`, and look at what you changed in the web preview (`src/dev/devtools.ts` lists the switches).

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
