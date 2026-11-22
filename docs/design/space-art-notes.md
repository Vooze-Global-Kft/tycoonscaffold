# Orbit Haulers art kit: notes for the tech lead

Package: the art kit (`src/ui/haul/art/**`, `scripts/art/haul-sheets.ts`). It touches no
file outside those folders. Exports are listed in `src/ui/haul/art/README.md`; what the second
pass changed is at the top of that guide ("Changed in the second pass").

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

## Second pass (art director's critique and errata 37 to 43)

### Shared-file changes the second pass needs (not made; apply in the wiring step)

1. **Icon validation list** (the haul copy of `HAUL_ICON_NAMES` and its test, item 2 above): the
   list grew from 32 to 51 names. Add `art:cond-frost|solar|storms|longhaul|heavy|hotcore`,
   `art:node-prospect|veinsense|assay|brokerseat|seedcredits|preload|sparedrones|afterburner`,
   `art:time-warp`, `art:fuel-cell`, `art:fuel-tank`, `art:clearance`, `art:hangar-expansion`,
   `art:prospector-charter`, `art:chest-wood`, `art:chest-silver`. The last two are aliases of the
   two pods because `games/space-miner/game.json` already uses `art:chest-silver`; keep them or
   change the content to `art:pod-*` and drop them.
2. **Hint pointer adapter** (errata 54: `ModeEntry.hintPointer?: ComponentType<{kind; from:
   TargetRect; to?; zone?; clock}>`). `Reticle` keeps its props (`{hint: {kind, from: Point, to?}}`)
   and runs its own Reanimated clock. The haul mode entry (or engineer 7's `src/ui/haul/hints`)
   needs a 10-line adapter: centre of `from` / `to` rects to points; for `swipe` with a `zone`, `to`
   = 80 pt above `from` clamped inside the zone; ignore `clock`. Nothing shared imports the kit.
3. **Hint targets inside spokes** (errata 47, 53): the Fitting Bay's `fitting:<socket>` targets can
   be set with `setTargetRect` from `schematicSockets(size)` (centre-relative; add the schematic
   view's top-left plus size / 2).
4. **Optional**, unchanged: `package.json` script `"art:haul": "tsx scripts/art/haul-sheets.ts"`.

No change to `scripts/lib/modes.js` (all new files are under `src/ui/haul`), no new dependency, no
import outside the kit's own files and `@shopify/react-native-skia`, `react`, `react-native`,
`react-native-reanimated`.

### Readings chosen (second pass)

- **Errata 37 sprite ids.** The kit keeps its names, which are equivalent, and `haulSheet()`
  returns exactly the ruling's shape (`image`, `rect`, `anchor`). The README has the table: the
  bonanza is an overlay sprite drawn on the rock (not 40 more baked rocks), one `drill` sprite
  serves every look (scaled by `rigHeads` r), debris are `shard-<ore>-<i>` (per ore), plus four
  chunk variants per ore. The freighter is left out of `haulSheet` (the scene draws it as a
  picture), but `bakeAtlas` can still add it for mocks.
- **Critique S13 (neutral rocks tinted by the Atlas colours): not done, on purpose.** Ore colour is
  the one thing that must stay constant across galaxies (M1 made ores readable by shape too, but
  colour is still the first cue), so a galaxy hue must not reach the rocks; the spec gives the hue
  shift to the nebula only. Per-ore rock sprites also look better (the body mixes the ore with a
  cold grey, which a modulate cannot do) and match ruling 37's per-ore ids. The atlas is 2040 x
  2102 px at 3x without the freighter, well inside any texture limit; 12 rock glow quads are no
  real overdraw on a phone.
- **C1 (per-slot veins): not done.** Veins are per silhouette so the atlas stays bounded; 8 shapes
  turning at different speeds and angles already avoid an obvious repeat on screen.
- **C6 (nebula halved near rings): not done.** The starfield is baked per screen and galaxy and does
  not know the ring layout; the rings' dashed guides and the rocks' own haze keep enough contrast
  at real size (field.png, galaxy 2, the most saturated).
- **Rig lamps.** Spec 4.3 gives green / amber / red; the kit adds shapes (dot, ring, x) so FULL and
  DRY read without colour. The scene should blink the FULL ring at 1 Hz and stop the drill head.
- **Rack.** The new crescent arms stay inside errata 45's rack hit area at their cradles (x 90 to
  160 at 390: cradle centres 101 to 145); the arm tips, the antenna and the "+n" plate reach a few
  points past it (x 83 and 308) and are not tap targets.
- **Pile labels.** `pileSpot` puts pile and label on the outward bearing and turns 35° or 70° when
  another rock or a ghost slot's tag is in the way (needed at 375 x 667 for ring 4 under a ring-5
  ghost slot). The scene passes the other slots as `avoid`.
- **Condition previews.** Solar Wind and Heavy Ore both favour all rings (errata 38), so their
  previews differ only in colour; the card's name and effect lines carry the difference.
- **Spec 4.3 / 7.3 wording is now out of date** in three places: the reticle is corner brackets,
  not "ring with ticks"; TALLY is three arc segments, not a "hex aperture"; the drone's cargo core
  is the ore's silhouette, not one hex. Worth one line in the spec so reviewers do not "fix" it back.
- **Station sheet "schematic strip" (4.5)**: not drawn separately; draw `drawStationSchematic` at
  strip scale or the station pictures. The Contract Board's "buyer manifest" cards are text-heavy
  and belong in React Native views with `mach:buyer-*` emblems and `drawReceiptStamp`.
