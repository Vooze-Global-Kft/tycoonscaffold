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
  `paysOnCompute: true`, `catchUpSeconds: 0`, away earns nothing). Stand still next to a wreck for 2 s
  (walking past does not cut): 3 pieces, carried up to 6. Next to the machine they unload one every 0.35 s at $5 each. A cut wreck is
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
  allowed past the yard by the safe-area insets plus 1.2 m, and at the top by the worker's height, so a
  body at an edge is never under the island or the thumb's corner: `camera.ts`), the nearest interactable, the depth sort into one `Atlas`. Positions are never saved.
- **The rules own the world.** At most ten times a second the loop sends a presence sample through
  `runOnJS` to `salvageActions.presence` (which prop, where, on foot or driving, `moving`: the stick past
  its dead zone). The rules check the
  distance again and decide what happens. After each store change, `useRulesTable.ts` pushes one shared
  value back: each wreck's cut progress and the carried stack. A screen never computes a rule.
- **Helpers are drawn only** (machine → gap → wreck and back); the rules engineers make them rules
  state (yard-tech.md B3) and keep the drawing path.

**Input:** one full-screen responder (`stick.ts`). A touch that begins in the stick zone (the left 45 %
of the safe area, below 28 % of its height) places the stick there. The knob travels 52 pt and drags the
base along. Moves write only a shared value. Releasing stops the worker. A second finger is ignored; a
thumb put back down while another finger rests steers again. **The truck:** walk into it to get in. While driving it moves at 9 m/s with radius 1.3 m, so it
cannot pass the 1.4 m gap in the container wall. A **"Step out"** button in the lower right (pressed with
the stick released) puts the worker beside it. Chosen over "stand still next to the machine": it never
fires by accident.

**Overlays** (`overlays/OverlayHost.tsx`): a right-hand panel and a centred card, absolute views with
`useOverlay`; a scrim under each, so only the top one takes touches; it or Android back closes the top one; no Sheet, no `Modal` (yard-tech.md A5). The
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

| Load (844 × 390, dpr 1, stick held) | fps (complete seconds) / worst frame (5 s) | sprites drawn |
|---|---|---|
| test yard (8 actors) | 60 / 16.8 ms | 23 |
| 40 actors, +100 crates | 60 / 16.8 ms | 127 |
| 80 actors, +300 crates | 59.8 / 33.3 ms | 280 |
| 150 actors, +600 crates | 56.3 / 33.5 ms | 371 |

dpr 3 runs (7 to 15 fps) measure this machine's software rasteriser, not the code; a second browser
running adds worst frames of 33 to 83 ms. Four draw calls a frame whatever the load
(fill, ground, fence, atlas). The atlas is 2032 × 561 at density 1 (61 sprites, 50 to 100 ms). At 3× it
**drops to density 2** (2012 × 1904): split it later. Bakes use a CPU raster surface (as Orbit
Haulers' atlas does); a GPU offscreen one only as a fallback, copied to the CPU or the bake fails.

## What only a phone can tell (for the owner, `GAME=scrap-yard npm run go`)

1. Rotation lock on, phone upright, launch: the app opens in **landscape**, not on the "Turn your phone
   sideways" card (does the card flash?). Turn the phone 180°: the money box, ≡ and "Step out" move away
   from the island.
2. After loading, the worker, truck and wrecks appear as drawings, not blank boxes.
3. Thumb low on the left, walk into the container wall at an angle: it slides, no crash. Walk to the far
   left and the top edge: the worker stays clear of the island and whole on screen.
4. Steer left-handed, tap ≡ with the right: nothing fires, steering continues. Lift the left, put it
   back: it steers.
5. Stop beside a wreck: the ring fills in 2 s. Walking past it does not cut.
6. **Frame time:** `EXPO_PUBLIC_YARD_DEV=1 GAME=scrap-yard npm run go` shows the panel (fps, worst
   frame). Then `EXPO_PUBLIC_YARD_STRESS=40,300` (yard-tech.md B6's budget). Report both lines.
7. Android: ≡, "Open the card", back twice: no rotation.

## Files and their owners-to-be

| Files | Owner-to-be |
|---|---|
| `src/engine/salvage.ts`, `salvage/types.ts`, `salvageMode.ts`, `config/schema.salvage.ts`, `modes/salvage/actions.ts`, `presets*.ts` | rules engineers (replace) |
| `src/ui/salvage/world/{frameLoop,camera,collide,stick,yard,useRulesTable,useYard,YardView}.ts*` | world engineer (keep, extend) |
| `src/ui/salvage/world/{draw,atlas,ground}.ts`, `scripts/art/scrap-yard-placeholder.py`, icons | art package (replace the drawings, keep names and anchors) |
| `src/ui/salvage/{SalvageShell,Loading,strings,palette,uiState}.ts*`, `overlays/`, `dev/` | screens package |
| `games/scrap-yard/**`, `store/fingerprint.json` | design / store (all placeholders) |
| `src/services/fx/catalog.salvage.ts` | sound package |

## The map after the review (fix pass, 25 November evening)

The six reviewers saw a first view two thirds empty, no old stock in sight, half-minute walks to the
tool rack and the office, and the truck's line over the public drop-off. The art director's picture
(`drawHero` in `src/ui/salvage/art/proof.draw.ts`, drawn on the map's own coordinates) was right and
the map moved to it (the lead's ruling: the scratchpad's `MAP.md`). Its principles, enforced by
`scripts/content/yard_map.py` (run by `python3 scripts/content/build-yard.py --check`; `--png out.png`
draws a schematic of every footprint with the two first views and the hero frame):

- **M1 the back wall.** A lock-block wall along y = 15.2 (`map.north`, solid to its south face 15.6)
  across the whole width; nothing of the yard, no walker and no vehicle north of it.
- **M2 the working row hugs the wall.** The bays, the scale house and the stillage block (two rows of
  seven, 1.3 m apart, growing west from the bays) stand with their backs on it; the pads in front
  (scale, cable bundle, hand stripper, price board, crucible, motor bench) within about 6 m of it.
- **M3 old stock in sight and near.** Zones are beds, rectangles `zones.<id>.bed` (the rules pack their
  things in them); zone 1 (washers, bicycles) in the corner of the wall and the east fence beside the
  scale house; zone 2 against the wall west of the stillages; zone 3 behind the dividing wall. Every
  bed is dense (0.9 to 1.7 times the ground its things need) and closed on one side.
- **M4 one drive line.** `map.driveLine` (rects, polyline, the vehicles' stops): a 4 m corridor from
  the gate past the weighbridge to the merchant's stand, plus the truck's park by the gate; nothing
  else stands in it.
- **M5 short walks.** Rack and office within 12 m of the scale; the drop-off's first place within 10;
  cable bundle to stripper within 3; stripper to scale within 8.
- **M6 no pockets.** Between solids (places, walls, fence, back wall, every stillage position, beds) a
  gap is 0 or at least 1.5 m.
- **M7 two frames.** The first view (the boss at start at 61 % of the height, the camera kept inside
  the east fence, 84 points under the bars) shows the drop-off's first washer, zone 1, the scale and the
  scale house's display at 844 x 390 and 667 x 375; the hero frame (`map.hero`, 16.7 x 9.7 m from the
  wall) holds the working row, the north edge of the weighbridge and 2.5 m of zone 1's bed.

The table (metres, x east, y south; centre and size):

| Place | Centre | Size | Note |
|---|---|---|---|
| back wall | y 15.2 | full width | `map.north`; solid y 14.8..15.6 |
| zone 3 bed | x 13.5..22.8, y 15.6..21.6 | 9.3 x 6 | beams, tanks, the car (spot 18.2, 20.6) |
| dividing wall | x 24 | 2.4 wide | sections y 15.6..22.4 and 24.4..40; opening at y 23.4 |
| zone 2 bed | x 25.2..32.6, y 15.6..21.2 | 7.4 x 5.6 | radiators, bath, stoves, gates |
| rubble skip | 35.3, 20.3 | 2.4 x 1.4 | waste |
| motor bench | 37.8, 21 | 2.5 x 1.5 | pad |
| stillage block | x 34.1..43.1, y 15.6..18.1 | 14 places | rows `stillage_br` 16.2, `stillage_cu` 17.5, from x 42.5 west |
| crucible pad | 42.5, 21.2 | 3 x 3 | |
| price board | 45.1, 20.4 | 2 x 0.4 | |
| bays | 47.1, 16.6 | 8 x 2 | |
| hand stripper pad | 47.5, 20 | 2.5 x 1.5 | |
| cable bundle | 49.9, 20 | 1.6 x 1.6 | |
| scale house | 52.6, 16.85 | 3 x 2.5 | |
| platform scale | 52.8, 20 | 1.5 x 1.5 | |
| zone 1 bed | x 54.1..64, y 15.6..19.6 | 9.9 x 4 | washers, bicycles |
| chalk circles | 54.3 / 52.3, 22.75 | r 0.8 | |
| start | 56.4, 21.6 | | |
| public drop-off | 61, 21.7 | 5.6 x 2.8 | two rows of four, first place 58.9, 21.0 |
| drive line | x 39.5..64, y 23.6..27.6 | 4 m | gate 63.5, 25.6; weighbridge 50.5, 25.6 (6 x 3); merchant's stand 42.5, 25.6 (6 x 2) |
| truck park | 62, 31.1 | 4 x 7 | on the drive line |
| notice board | 41.9, 28.4 | 1.6 x 0.6 | |
| tipping floor | 47, 30.1 | 8 x 5 | the truck tips from the line at 48, 27.2 |
| tool rack | 52.5, 28.5 | 2 x 0.8 | at the office's door |
| office (gatehouse) | 56.5, 29.35 | 6 x 2.5 | |
| back field gate | 6, 37 | 8 x 6 | |
