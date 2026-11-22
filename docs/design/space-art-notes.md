# Orbit Haulers art kit: notes for the tech lead

Package: the art kit (`src/ui/haul/art/**`, `scripts/art/haul-sheets.ts`). It touches no
existing file. Exports are listed in `src/ui/haul/art/README.md`.

## Shared-file changes the kit needs (not made; apply in the wiring step)

1. **`src/modes/haul/index.tsx` (mode entry)**
   - `devViews: { 'haul-art': Gallery }` with `import Gallery from '../../ui/haul/art/Gallery'`.
   - The hint pointer: once `HintOverlay` takes a registered pointer (spec 1.3 R1,
     `registerHintMode({Pointer, source})`), register `Reticle` from `src/ui/haul/art/Reticle.tsx`.
     It takes `{hint: {kind: 'point' | 'drag' | 'swipe', from, to?}}` in the coordinates of the
     canvas it is drawn in (`Reticle` = Skia elements for an existing Canvas, `ReticleLayer` = own
     canvas). HintOverlay's current pointer is drawn in a `BOX`-sized canvas round one point;
     drag and swipe need a canvas that covers both ends (the whole screen is simplest).
2. **Icons ("art:" and "mach:")**
   - `src/modes/contract.ts` imports `registerArtIcons` from `src/ui/art/props.tsx`, which
     `scripts/lib/modes.js` puts in the "tabs" family that haul must never bundle. So the haul
     entry should **not** pass `artIcons` through that cache. Instead GameIcon needs a mode
     registry lookup (spec 1.3: "GameIcon becomes a cache plus a registry lookup"): for haul, map
     any `art:` / `mach:` name to `<HaulIcon name={icon} size={size} />` from
     `src/ui/haul/art/HaulIcon.tsx` (its own cache of PNG data URIs, no canvas per row). A
     `ModeParts` field such as `Icon?: ComponentType<{name, size}>` used by GameIcon before its
     own branches does it without GameIcon importing haul code.
   - If you keep the shared cache instead, `haulArtIconDefs()` (icons.ts) returns entries of the
     `ArtIconDef` shape (`{draw(pen), box}`), keyed `ore-iron` ... and `mach-tally` ...; GameIcon
     would then have to route `mach:<id>` to `art:mach-<id>`.
   - Validation (`src/config/artIcons.ts` style, the schema cannot import Skia): a haul copy of
     the names in `HAUL_ICON_NAMES` plus a test that the two lists match (like
     `src/config/artIcons.test.ts`). game.json icons for haul use exactly these names:
     `art:ore-<ore>`, `art:pod-scrap`, `art:pod-derelict`, `art:dark-matter`, `art:warp-core`,
     `art:credits`, `art:drone`, `art:freighter`, `art:rig`, `art:flare`, `art:rail-<comms|salvage|fitting|starmap|trade|menu>`,
     `mach:tally`, `mach:ops2`, `mach:dispatch`, `mach:buyer-<halden|corvo|tessaly|brightwater|kade|oriel>`.
     The six buyer ids are the short forms of the spec 7.1 names; if the content script uses
     other buyer ids, map them or tell me.
3. **`scripts/lib/modes.js`**: nothing new: `src/ui/haul` is already a haul folder. The kit
   imports only `@shopify/react-native-skia`, `react`, `react-native`, `react-native-reanimated`
   and its own files (checked with a grep: no `src/ui/sim`, `src/ui/art`, `src/ui/home`,
   `src/ui/meta`, `src/engine` import).
4. **Optional**: `package.json` script `"art:haul": "tsx scripts/art/haul-sheets.ts"`.

## Readings chosen where the specification was unclear

- 4.3 says the art lives in `src/ui/haul/art/*.tsx` "drawn with the shared Pen/rec() helpers";
  those helpers (`src/ui/art/draw.ts`) are the first game's warm brown-outline kit and in the
  "tabs" family. The kit has its own small helpers (`pen.ts`) and pure `.draw.ts` files, as the
  work package asked. Same for 7.3's `portraits.tsx`: it is `portraits.draw.ts`.
- "One shape per rock (seeded)": 8 silhouettes, picked by `rockShapeIndex(slot, rockN)`, so the
  atlas stays bounded (8 shapes x 5 ores plus overlays).
- Rocks spin; the rig does not spin with them (it is drawn static on top, legs within the rock's
  smallest radius); only its drill heads turn.
- Station parts: 7 node parts (`prospect`, `veinsense`, `assay`, `brokerseat`, `seedcredits`,
  `sparedrones`, `afterburner`). Systems Preload's "lit beacon from the start" is the same
  autopilot beacon (`drawBeacon`), so there is no eighth part.
- Call-sign plates at the comms slot's 20 pt: "OPS-2" is barely legible and "DISPATCH" is not;
  colour (amber / green) and the waveform carry the identity there, and the comms line itself
  starts with the call sign in text. At 40 pt and up both read.
- Pile labels "62/80": the scene draws them; `drawText` (stroke font) needs no font file, so it
  can redraw on change cheaply. The real HUD text should stay React Native text.
- Atlas size with the biggest freighter: 2036 x 2366 px at 3x (fine for any 4096 texture limit;
  over 2048 in height).
- Titanium ore (#C7A6FF), the epic frame (#C77BFF) and Dark Matter (#A879FF) are all violet; they
  never share a context (ore on the map, frames in the Fitting Bay, DM in the Trade Post), so I
  kept the spec's ore colour.
- Ring labels sit at the left end of each arc; with a narrow sweep they can fall off screen. The
  scene should pick the sweep so each label lands inside the 16 pt gutter.

## Not in the kit (other packages)
- Route chips' placement (`chipPositions`), the hold-tank band easing, the dock counter text,
  the bay panel (the mock draws a sketch only), the Star Map node map, the contract card layout.
