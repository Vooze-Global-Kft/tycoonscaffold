# Scrapyard: the ground work

The base under the fifth game (`scrap-yard`, mode `salvage`), built before `yard-design.md`. Everything
is a placeholder except the technology: landscape, the wiring, a wide yard steered with one thumb.

## What exists

- **Landscape for one game.** Optional `app.orientation` (`src/config/schema.ts`, `app.config.ts`). Not
  set means portrait, so the four games resolve to the same Expo configuration as before. No run-time
  lock module. When the window is taller than wide, a plain "Turn your phone sideways" card covers the
  game and the yard stops.
- **Mode `salvage`, game `scrap-yard`.** Wired like the fourth mode (yard-tech.md C), with an opaque
  `salvage` block (`src/config/schema.salvage.ts`), an empty fx catalogue and a validate warning that
  the game is a placeholder. The fingerprint check reads a `PLACEHOLDER` value as *pending*: everyday
  passes, release fails until the design fills it in.
- **Placeholder rules** (`src/engine/salvage.ts`, `salvageMode.ts`, save tag `salvage0`,
  `paysOnCompute: true`, `catchUpSeconds: 0`, away earns nothing). Stand next to a wreck for 2 s: 3
  pieces, carried up to 6. Next to the machine they unload one every 0.35 s at $5 each. A cut wreck is
  whole again after 20 s.
- **The walkable yard** (`src/ui/salvage/world/`): stick, worker, six helpers, truck, camera, one
  atlas, the mode's own overlays, a web development panel, a loading placeholder.

## Coordinates and units

World units are **metres on the ground plane**: x points east (right), y points south (towards the
viewer). A prop's `(x, y)` is the centre of its footprint (`shape` `circle` with `r`, or `box` with
`w` × `d`). The view turns world positions into screen points:

```
sx = x·ppm − camX      sy = y·ppm·tilt − camY − z·ppm·lift      lift = √(1 − tilt²)
```

Test yard: `ppm` 40, `tilt` 0.7, 64 × 40 m = 3.0 × 2.9 screens at 844 × 390 (3.8 × 3.0 at 667 × 375).
Sprites (anchored at footprint centres) sort by footprint y, lower in front; ground decals first.

## The world and the screen are kept apart

- **The UI thread owns motion** (`frameLoop.ts`, one `useFrameCallback`): stick, collision
  (`collide.ts`, push-out so bodies slide), walk cycles, helpers, the camera (0.35 s lead, 0.28 s ease,
  clamped), the nearest interactable, the depth sort into one `Atlas`. Positions are never saved.
- **The rules own the world.** At most ten times a second the loop sends a presence sample through
  `runOnJS` to `salvageActions.presence` (which prop, where, on foot or driving). The rules check the
  distance again and decide what happens. After each store change, `useRulesTable.ts` pushes one shared
  value back: each wreck's cut progress and the carried stack. A screen never computes a rule.
- **Helpers are drawn only** (machine → gap → wreck and back); the rules engineers make them rules
  state (yard-tech.md B3) and keep the drawing path.

**Input:** one full-screen responder (`stick.ts`). A touch that begins in the stick zone (the left 45 %
of the safe area, below 28 % of its height) places the stick there. The knob travels 52 pt and drags the
base along past that. Moves write only a shared value. Releasing stops the worker. A second finger is
ignored. **The truck:** walk into it to get in. While driving it moves at 9 m/s with radius 1.3 m, so it
cannot pass the 1.4 m gap in the container wall. A **"Step out"** button in the lower right (pressed with
the stick released) puts the worker beside it. Chosen over "stand still next to the machine": it never
fires by accident.

**Overlays** (`overlays/OverlayHost.tsx`): a right-hand panel and a centred card, absolute views with
`useOverlay`; the scrim or Android back closes the top one; no Sheet, no `Modal` (yard-tech.md A5). The
yard stops under them.

## How to add…

- **A prop:** an entry in game.json `salvage.props`; the atlas bakes one sprite per kind and size
  (`atlasDefs`, `draw.ts`). Keep footprints at most 5 m along y (walls in sections: correct sorting, atlas
  under 2048 px).
- **An actor:** add its frames to `atlasDefs`, its sprite ids to `spriteIds`, and one `addItem` call
  in the frame loop with its footprint y as the key. Anything that earns goes into the rules first, and
  the screen interpolates it.
- **An overlay:** add a kind to `uiState.ts` `OverlayKind` and a component in `OverlayHost` that
  calls `useOverlay(true)` while it is mounted.
- **A word:** `src/ui/salvage/strings.ts` only.

## What was measured (web preview, headless Chromium with software GL, 4 shared cores)

| Load (844 × 390) | dpr 1: fps / worst frame (5 s) | sprites drawn |
|---|---|---|
| test yard (8 actors) | 52 to 59 / 16.8 ms | 20 to 23 |
| 40 actors, +100 crates | 50 / 16.8 ms | 127 |
| 80 actors, +300 crates | 60 / 16.8 ms | 280 |
| 150 actors, +600 crates | 51 / 16.8 ms | 376 |
| 200 actors, +600 crates, dpr 3 | 6.8 / 150 ms | 426 |
| test yard, dpr 3 | 14.6 / 67 to 83 ms | 22 |

Four draw calls a frame whatever the load (fill, ground, fence, atlas). The dpr 3 rows measure this
machine's software rasteriser (2532 × 1170 pixels on a shared CPU), not the code. At dpr 1 the loop
holds the frame at yard-tech.md's budget (40 actors, 300 sprites) and well past it. The atlas is 2032 × 561 at density 1
(61 sprites, baked in 50 to 100 ms). At a 3× density it **drops to density 2** (2012 × 1904) to fit
2048: sprites are a little soft on an iPhone. The art package should split it into two sheets or bake
smaller pawns.

## What only a phone can tell (for the owner, `GAME=scrap-yard npm run go`)

1. Expo Go opens in **landscape** and stays there when the phone turns (with the rotation lock on and
   the phone upright: card or yard?).
2. Rest your left thumb low on the left and slide it. The worker walks the way the thumb points, with no
   lag, and stops the moment you lift. Put a second finger anywhere: nothing changes.
3. Walk into the container wall at an angle. The worker slides along it. Go through the narrow gap
   (lower middle of the wall). Then drive the truck at the same gap: it does not fit, and the wide gap
   higher up lets it through.
4. Turn the phone the other way round (island on the right). The money box, the ≡ button and "Step
   out" stay clear of the island and the home bar. The yard is drawn under them.
5. Open ≡, then "Open the card". On Android, press back twice. On both, the screen must not rotate.
6. Walk for a minute among the six helpers: any stutter or warmth is worth reporting.

## Files and their owners-to-be

| Files | Owner-to-be |
|---|---|
| `src/engine/salvage.ts`, `salvage/types.ts`, `salvageMode.ts`, `config/schema.salvage.ts`, `modes/salvage/actions.ts`, `presets*.ts` | rules engineers (replace) |
| `src/ui/salvage/world/{frameLoop,collide,stick,yard,useRulesTable,useYard,YardView}.ts*` | world engineer (keep, extend) |
| `src/ui/salvage/world/{draw,atlas,ground}.ts`, `scripts/art/scrap-yard-placeholder.py`, icons | art package (replace the drawings, keep names and anchors) |
| `src/ui/salvage/{SalvageShell,Loading,strings,palette,uiState}.ts*`, `overlays/`, `dev/` | screens package |
| `games/scrap-yard/**`, `store/fingerprint.json` | design / store (all placeholders) |
| `src/services/fx/catalog.salvage.ts` | sound package |
