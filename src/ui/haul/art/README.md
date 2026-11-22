# Orbit Haulers art kit (`src/ui/haul/art`)

Every machine and space object of the haul mode, drawn in code with Skia (spec section 4.3).
Style: line-lit flat vector, dark fills, 1.5 pt bright outlines (`LINE`), glow baked as faint wide
strokes or radial gradients. No blur or mask filters, no image files, nothing from `src/ui/sim` or
`src/ui/art` (the first game's kit).

- `*.draw.ts` (also `ore.draw.ts`, `spokes.draw.ts`, `meta.icons.draw.ts`), `pen.ts`, `glyphs.ts`, `palette.ts`, `atlas.ts`, `pictures.ts`, `icons.ts`,
  `gallery.*.ts`, `mock.draw.ts`: pure Skia, no React / Reanimated / react-native. They run in the
  app and in Node.
- `Reticle.tsx`, `Gallery.tsx`, `HaulIcon.tsx`, `Spokes.tsx`: React components.
- `index.ts` re-exports the pure parts (not the components).

## Changed in the second pass (read this first)

Exports that changed shape or meaning (the scene, shell and spoke engineers build on them):
- **Ores have a silhouette each** (`ore.draw.ts`): iron block, copper nugget, ice spike, titanium hex prism, platinum diamond. Chunks, piles, the drone's cargo core, `art:ore-*` icons and hold-tank band markers use it. Routes have a per-ore dash rhythm: `ROUTE_DASH` / `routeDash(ore)` / `routeDashPeriod(ore)`; animate the phase modulo that period.
- **Rigs are smaller and in steel** (about 26 pt, was 34): `rigHeads(look)` and `rigLamp(look)` return new (scaled) positions; Seam Detector (look 3) is now a triangular frame with a mast, a fan antenna and a gold lamp, its head at y +1.2 and its lamp at (8.6, 4.7). `drawDrillHead` is a three-tooth Y bit. Lamp states read by shape: `run` green dot, `full` amber ring (blink 1 Hz), `dry` red x. Stripes are 1 to 3 white bars on the lamp mast.
- **Station silhouette**: the rack arms are a drooping crescent with open U-brackets on top; the left arm ends in a whip antenna (red nav light), the right one has a radiator and a green nav light; the hub is an octagon with two long flats. **`RACK_CRADLES` values changed** (y 7.9 / 12.1 / 19.6 instead of 24; x unchanged) and **`RACK_OVERFLOW` is now (113, 40)**. New `rackArmY(x)`. `pictures.stationArms()` box grew to x -120..120, y -10..64.
- **Station parts** assay (round pod with a beaker window), hangar (slanted roll-up doors with drone noses), booster ring (2 pt ring with four flares) redrawn. New for errata 39: `STAR_NODES` (8 ids), `NODE_ARM`, `STATION_PART_NAMES` (the errata's names; `preload` = 'beacon'), `FIRST_FOUR_PARTS` (preload, assay, afterburner, seedcredits), `drawNodePart(c, node, level, on)` (preload draws the one autopilot beacon at BEACON_POS), `drawNodePartShape`, `drawRackOverflow(c, n)`.
- **Pile labels** go on the rock's outward side, on a plate, above drones: `pileSpot(rx, ry, sx, sy, r, avoid?)` → `{pile, label}`, `drawPileLabel(c, text, full)` (full = amber with an up-arrow), `PILE_LABEL_SIZE`. `PILE_CHUNKS` is now [3, 6, 9, 14]; step 3 is wider (two heaps and a spill, about 28 pt).
- **Drone**: pale hull outline, ore-shaped core (hollow when empty), left flame 10 % longer. Same box and sprite names.
- **`drawRingGuides(c, cx, cy, radii, sweep, {gutter, rocks, rockR, clear}?)`**: labels at the arc point nearest x = 24, inside the gutter, skipped near rocks. Pass screen coordinates.
- **Routes**: `routePaints(ore)` (shared paints, made once per ore); in the frame loop use a `<Path>` per route built once per layout and one `<DashPathEffect intervals={routeDash(ore)} phase={…}/>` per ore. `pictures.routeChip(count, ore)`.
- **Rail glyphs** salvage, fitting, starmap, trade redrawn. `drawRailButton(c, size, id, badge?, badgeKind?)`: badge `''` = dot, `'2'` = count, kind `'dm'` = the Dark Matter balance plate. New `drawRailBadge`.
- **Portraits**: TALLY is three arcs round a dot. `drawCallSign(..., shape)`: OPS-2 round plate with a headset, DISPATCH square plate with a clipboard; no text below `CALL_SIGN_TEXT_MIN` (28 pt). Buyer emblems redrawn (Halden chevrons in a hexagon, Corvo split circle, Tessaly three rings, Brightwater dot over a wave bar, Kade stepped triangle, Oriel three moons). `art:warp-core` is a gold-and-violet torus.
- **Freighter** outlines pale cyan with the station's glow. New: `LOADED_FREIGHTER_SCALE` (1.3), `FREIGHTER_TIER_LEVELS`, `drawPad(c, lit?)`, `drawChevronStack(c, k, ready?)` (one stack above the freighter), `drawAwayArc(c, k, label)`, `drawPolicyChip(c, policy, on?)`.
- **Flare** is a tilted tube with fins, a striped cap and a spark (about 14 x 20 pt; `pictures.flare()` box 16). `drawChargePlate(c, n)`.
- **Cartridges**: epic has notched corners, a double frame and a filled tab; rare has corner gems; common neither. `locked` shows a padlock over hatching and no face (`drawPadlock`). Keeper, Bayracks and Sorter faces redrawn.
- **Hint pointer**: the reticle is four corner brackets round a dot (`RETICLE_R` unchanged); the guide is white dots with an arrowhead (`GUIDE_DOTS`, `GUIDE_COLOR`, `guideArrowPath`, `drawGuide`). `Reticle.tsx` props unchanged.
- **Hold tank**: ore silhouette marker on each band, frost line when full.
- **Pods**: derelict markings are dot-and-bar clusters; `drawRarityLight(c, color, k)` for the reveal.
- **New drawings for the spokes** (errata 38): `spokes.draw.ts` and the components in `Spokes.tsx` (below).
- **New icons** (errata 42): `art:cond-<frost|solar|storms|longhaul|heavy|hotcore>`, `art:node-<8 node ids>`, `art:time-warp`, `art:fuel-cell`, `art:fuel-tank`, `art:clearance`, `art:hangar-expansion`, `art:prospector-charter`, and the aliases `art:chest-wood` / `art:chest-silver` (= the two pods, since game.json names chests so).
- **Atlas**: `haulSheet(pixelRatio)` (errata 37) and `sheetIds()`; new sprites `chunk-<ore>-<0..3>`; 165 sprites, 2044 x 2418 px at 3x with the biggest freighter.

Look at it: `npx tsx scripts/art/haul-sheets.ts <outDir> [section ids...]` writes one PNG per
gallery section (real size and 4x), `field.png` / `field-small.png` (main-screen mocks at
390 x 844 and 375 x 667) and `atlas.png`. Keep the PNGs out of the repository.

Conventions: every `draw*` takes the canvas first and draws centred on the origin in points,
unless it says otherwise. Sprites that turn are drawn facing their direction of travel: drones
nose to +x (rotation = heading), freighter nose up.

## palette.ts
- `SPACE`: bg, panel, panelEdge, hull0..hull3, line, lineDim, white, steel, steelDim, green, amber, red, gold, goldDeep, dm, dmDeep, core, flameHot, flame, flameOuter.
- `ORE` (spec 2.1 colours), `ORE_IDS`, `type OreId`, `oreColor(ore)` (steel for unknown ids).
- `VOICE` {tally, ops, dispatch}, `RARITY` {common, rare, epic}, `type Rarity`.
- `mix(a, b, t)`, `alpha(hex, a)`, `shade(hex, t)`, `hueShift(hex, deg)`, `galaxyHue(index)` (+47° per galaxy).

## pen.ts (helpers)
`LINE`, `fill`, `stroke(color, width, round)`, `dashed(color, width, on, off, phase)`, `light` (additive), `glowPaint`, `linearPaint`, `clip`, `glow(c, x, y, r, color, a)`, `litStroke(c, path, color, width, g)`, `part(c, path, fill, line, width, g)`, `lamp(c, x, y, r, color)`, `builder`, `poly`, `ngon`, `circle`, `rrect`, `line`, `arc`, `blob`, `picture(box, draw)`, `around(r)`, `seeded(seed)`, `TAU`, `DEG`.

## glyphs.ts (stroke font, no font file needed)
- `drawText(c, text, x, y, {size, color, weight?, align?, glow?})` (cap top at y; returns width), `textWidth(text, size)`.
- Capitals, digits, `- + / . , : · ! ? % # < > ₵ ×`; lower case draws as capitals except `x` (small ×). Use it for pile counts ("62/80"), ring labels, chips, price tags.

## ore.draw.ts
`type OreShape`, `oreShape(ore)`, `oreShapePath(ore, s)`, `drawOreShape(c, ore, s, {glow?, line?, hollow?})`, `ROUTE_DASH`, `routeDash(ore)`, `routeDashPeriod(ore)`.

## rock.draw.ts
- `ROCK_SHAPES` (8), `rockShapeIndex(slot, n)`, `rockBox(r)` (half box with glow).
- `drawRockBody(c, {shape, ore, r = 26, bonanza?})`, `drawRockCracks(c, shape, 1 | 2, r)` (overlay at 50 % / 15 % life), `drawDryRock(c, shape, r)`, `drawDryGlow(c, shape, r)` (pulse its opacity 0.5 Hz), `drawBonanzaOverlay(c, shape, r)`, `rockPicture({...RockOptions, crack?, dry?})`.
- `drawChunk(c, ore, s = 3.4, seed)` (the ore's silhouette), `PILE_CHUNKS`, `drawPile(c, ore, step 0..3)` (about 22 x 18 pt, step 3 about 28), `drawShard(c, ore, i 0..7)`, `pileLabelPlate(c, w, h)`, `pileSpot(...)`, `drawPileLabel(c, text, full?)`, `PILE_LABEL_SIZE`.

## rig.draw.ts (origin at the rock centre, about 26 pt across, steel)
- `type RigLook` 0..4, `RIG_LOOKS` (Tripod, Dual Bit, Deep Bore, Seam Detector, Twin Rig), `rigLookFor(level)`, `rigStripesFor(level)` (0..3, past L35).
- `drawRigBase(c, {look, stripes?})` (static), `rigHeads(look)` → [{x, y, r}], `drawDrillHead(c, r)` (spin 4 turns/s), `rigLamp(look)` → {x, y}, `type LampState` 'run' | 'full' | 'dry' | 'off', `drawRigLamp(c, state)`, `drawRig(c, {look, stripes?, lamp?})` (all in one, for sheets).

## drone.draw.ts (about 18 x 16 pt, nose +x)
`DRONE_BOX` (11), `drawDrone(c, {ore | null, loaded = true})` (null = idle cyan), `drawThrusterFlame(c, k 0..1)`, `drawIdleBadge(c)` (the bobbing "!").

## station.draw.ts (radius 40; scale by r / 40)
- `STATION_R`, `rackArmY(x)`, `RACK_CRADLES` (6 cradle centres, where an idle drone sits nose up), `RACK_OVERFLOW` ("+n" spot), `BEACON_POS`, `drawRackOverflow(c, n)`.
- Nodes: `STAR_NODES`, `type StarNode`, `NODE_ARM`, `STATION_PART_NAMES`, `FIRST_FOUR_PARTS`, `drawNodePart(c, node, level, on)`, `drawNodePartShape(c, node, level)`.
- `drawDockArm`, `drawRackArm(c, -1 | 1)`, `drawStationRing(c)` (rotate once per 40 s), `drawStationHub(c)`, `drawStation(c, ringTurnDeg)`.
- `STATION_PARTS` (prospect, veinsense, assay, brokerseat, seedcredits, sparedrones, afterburner), `stationPartPos(id)`, `drawPartShape(c, id, level)` (prospect: one petal per 5 levels up to 8; sparedrones: one door per level up to 6), `drawStationPart(c, id, level)` (in place, with strut), `drawScannerDish(c)` (sweep ±30° over 6 s), `drawBeacon(c, on)` (autopilot / Systems Preload beacon, blink 1 Hz).

## freighter.draw.ts (nose up)
`type HullId` 0..3, `HULL_NAMES`, `hullFor(level)` (1, 10, 25, 50), `segmentsFor(level)` (one per 25 levels past 50, up to 8), `freighterSize(hull, segments)`, `freighterEngines(hull, segments)`, `drawFreighter(c, {hull, segments?, cargo?: ore[]})`, `drawFreighterFlame(c, hull, segments, k)`, `drawWarpFlash(c, k 0..1)` (0.5 s), `drawPad(c, lit?)` (64 x 40), `drawChevron(c, alpha)`, `drawChevronStack(c, k, ready?)`, `drawAwayArc(c, k, label)`, `drawPolicyChip(c, policy, on?)`, `LOADED_FREIGHTER_SCALE`, `FREIGHTER_TIER_LEVELS`.

## fx.draw.ts
`starfieldPicture(w, h, galaxy, seed)`, `drawStarfield(...)` (tiles vertically; drift 3 pt/s), `drawRingGuides(c, cx, cy, radii, sweepDeg, opts?)`, `ROUTE_WIDTH`, `routePaints(ore)`, `drawRoute(c, x0, y0, x1, y1, ore, phase)`, `drawRouteChip(c, count, ore)`, `drawDragLine(c, x0, y0, x1, y1, color?)`, `drawGhostSlot(c, r, price)`, `drawSeamRim(c, r)`, `drawSparkle(c, x, y, s, color)`, `drawSeamGuide(c, x0, y0, x1, y1, phase)`, `drawFlare(c, beaconOn)`, `drawChargePlate(c, n)`, `drawFlareTrail(c, x0, y0, x1, y1, k)`, `drawCreditGlyph(c, s = 12)`, `drawHoldTank(c, w, h, bands: [ore, fraction][], full)`.

## pods.draw.ts
`type PodTier` 'scrap' | 'derelict', `POD_TIERS`, `POD_FOR_CHEST_TIER` {wood: scrap, silver: derelict}, `drawPod(c, tier, {cut?: 0..1, split?: 0..1, inner?: colour})`, `drawRarityLight(c, color, k)` (draw over the split pod).

## modules.draw.ts (cartridge 96 x 120)
`CARTRIDGE_W`, `CARTRIDGE_H`, `type ModuleId`, `type SocketType` 'rig' | 'fleet' | 'dock', `MODULES` (id, rarity, socket, spec 5.1), `drawSocketGlyph(c, socket, r, color)` (rig triangle, fleet hex, dock square), `drawCartridge(c, {module, rarity, socket, mark?, locked?})`, `drawModuleFace(c, id)`, `drawPadlock(c, r, color)`.

## portraits.draw.ts (into a square of `size`)
`drawTally(c, size, turnDeg)`, `waveBars(phase | null)`, `type CallPlate`, `CALL_SIGN_TEXT_MIN`, `drawCallSign(c, size, sign, color, phase, shape)`, `drawOps(c, size, phase)`, `drawDispatch(c, size, phase)`, `OPS_SIGN`, `DISPATCH_SIGN`, `type BuyerId`, `BUYERS` (id, name, colour), `drawBuyer(c, size, id)`.

## icons.draw.ts / icons.ts
- `drawOreIcon`, `drawPodIcon`, `drawDarkMatterIcon`, `drawWarpCoreIcon`, `drawCreditsIcon`, `drawDroneIcon`, `drawFreighterIcon`, `drawRigIcon`, `drawFlareIcon`, `type RailGlyph`, `RAIL_GLYPHS`, `drawRailGlyph(c, size, id, color?)`, `drawRailBadge(c, text, kind)`, `drawRailButton(c, size, id, badge?, badgeKind?)`.
- `meta.icons.draw.ts`: `drawConditionIcon(c, size, id)`, `ARM_COLOR`, `drawNodeIcon(c, size, node)`, `drawTimeWarpIcon`, `drawFuelCellIcon`, `drawFuelTankIcon`, `drawClearanceIcon`, `drawHangarIcon`, `drawCharterIcon`.
- `HAUL_ICONS`: name → `(canvas, size) => void`. Names: `art:ore-iron|copper|ice|titanium|platinum`, `art:pod-scrap`, `art:pod-derelict`, `art:dark-matter`, `art:warp-core`, `art:credits`, `art:drone`, `art:freighter`, `art:rig`, `art:flare`, `art:rail-comms|salvage|fitting|starmap|trade|menu`, `art:cond-frost|solar|storms|longhaul|heavy|hotcore`, `art:node-prospect|veinsense|assay|brokerseat|seedcredits|preload|sparedrones|afterburner`, `art:time-warp`, `art:fuel-cell`, `art:fuel-tank`, `art:clearance`, `art:hangar-expansion`, `art:prospector-charter`, `art:chest-wood`, `art:chest-silver`, `mach:tally`, `mach:ops2`, `mach:dispatch`, `mach:buyer-halden|corvo|tessaly|brightwater|kade|oriel`.
- `HAUL_ICON_NAMES`, `haulArtIconDefs()` (the same as `{draw(pen), box}` entries keyed "x" / "mach-y", for a cache that takes the first game's `ArtIconDef` shape).
- `HaulIcon.tsx`: `<HaulIcon name size fallback? />` and `haulIconUri(name, size)`: this mode's own cached-image icon (no canvas per row).

## atlas.ts (the frame loop's sprites: errata 37)
- **`haulSheet(pixelRatio)`** → `{image, pixelRatio, rect: Record<id, {x, y, w, h}>, anchor: Record<id, {x, y}>}` or null: ONE image baked once at start-up (rects and anchors in pixels; anchor from the rect's top left). No freighter in it. `sheetIds()` lists the ids. 165 sprites with a freighter, 161 without.
- `bakeAtlas({density, freighter?})` → `{image, density, sprites, width, height}`: the same, plus an optional freighter (`freighter`, `freighter-flame-0..2`) for mocks.
- `spriteXform(sprite, density, x, y, angle, size)` → [scos, ssin, tx, ty] for `Skia.RSXform` (a worklet); `ATLAS_ROCK_R` (26: scale by r / 26 for 22 to 24 pt rocks), `ATLAS_HEAD_R` (5.6).
- `atlasDefs(opts)`: the list (name, half extents, draw).

**Sprite ids** (the kit's names; the errata's name beside each where it differs):

| Kit id | Errata 37 name | Notes |
|---|---|---|
| `drone-<ore>`, `drone-<ore>-empty`, `drone-idle` | `drone_<ore>` | loaded, flying out empty, idle on the rack |
| `flame-0..2` | (not named) | drone thruster flicker, same origin as the drone |
| `rock-<shape>-<ore>` | `rock_<shape>_<ore>` | shape 0..7 (`rockShapeIndex`) |
| `rock-<shape>-<ore>` + `bonanza-<shape>` | `rock_<shape>_<ore>_bonanza` | the bonanza overlay is drawn on top of the rock, same transform |
| `crack1-<shape>`, `crack2-<shape>` | (not named) | overlays at 50 % and 15 % life |
| `dry-<shape>`, `dryglow-<shape>` | (not named) | dry rock and its pulsing glow (opacity) |
| `drill` | `drill_<look>` | one head for every look: place at `rigHeads(look)`, size `r / ATLAS_HEAD_R` |
| `chunk-<ore>-<0..3>` (and `chunk-<ore>`) | `chunk_<ore>_<0..3>` | |
| `shard-<ore>-<0..7>` | `debris_<0..7>` | per ore, so debris carries the ore's tint |
| `credit` | `glyph_credit` | |

**Pictures, not sprites**: the scene draws rigs (`rigBase`, `rigLamp`), piles and pile labels, the station (hub, ring, arms, parts, dish, beacon), the freighter on its pad, ghost slots, seam rims, route chips, the flare and the bay pieces as pictures from `pictures.ts`, at their positions. The drill heads on the rigs are sprites (`drill`).

**Budget** (errata 41): at most 4 drones drawn per route and 6 on the rack (`drawRackOverflow` shows the rest as "+n"; the route chip shows the true count), 48 + 6 drones, 12 rocks (+ overlays), 30 chunks, 16 debris, 12 credit glyphs: one atlas draw. Rocks at 22 to 26 pt: scale the 26 pt sprites (`ATLAS_ROCK_R`); rigs scale with them (the gallery shows R22, R24, R26).

## pictures.ts
`pictures.stationHub()`, `.stationRing()`, `.stationArms()`, `.stationPart(id, level)`, `.nodePart(node, level)`, `.rackOverflow(n)`, `.scannerDish()`, `.beacon(on)`, `.rigBase(look, stripes)`, `.rigLamp(state)`, `.drillHead(r)`, `.pileLabel(text, full)`, `.pile(ore, step)`, `.ghostSlot(r, price)`, `.seamRim(r)`, `.flare()`, `.idleBadge()`, `.pad(lit?)`, `.chevron()`, `.routeChip(count, ore)`, `.policyChip(policy, on)`, `.chargePlate(n)`, `.freighter(hull, segments)`, `.starfield(w, h, galaxy)`: memoised, never freed.

## spokes.draw.ts and Spokes.tsx (errata 38)
- `drawStationSchematic(c, size, {fitted?, state?})` (340 or 320, centred), `SCHEMATIC_SIZES`, `SCHEMATIC_SOCKETS` (rig upper left, fleet upper right, dock bottom), **`schematicSockets(size)`** → `{rig, fleet, dock}: {x, y, r}` from the centre (add size / 2 for top-left coordinates; the hex of radius r is the tap target, 80 pt across at 340). Socket state `'normal' | 'glow' | 'dim'`; fitted shows the module face in its rarity colour.
- `drawDishRelay(c, w, lit 0..5, ready?, pulse?)`, `relayDishes(w)`, `RELAY_DISHES`.
- `CONDITIONS` (id, name, favoured rings, colour), `type ConditionId`, `drawConditionPreview(c, w, id)` (w x 0.62 w).
- `drawStarCore(c, size, turn?)`; `drawNodeRing(c, size, level, cap | null, node?, state?)` (`'normal' | 'buyable' | 'locked'`; uncapped nodes fill 5 per lap with a "×laps" plate).
- `drawReceiptStamp(c, w, amount?, k?)` ("CONTRACT MET", k 0..1 stamps it down).
- `Spokes.tsx`: `<StationSchematic size fitted? state? />`, `<DishRelay width lit ready? />`, `<ConditionPreview id width />`, `<StarCore size />`, `<NodeRing size level cap node? state? />`, `<ReceiptStamp width amount? />` (one canvas each, static), and `spokePictures.*` for drawing them inside another canvas (the Star Map's eight nodes belong in the map's one canvas).

## Reticle.tsx (hint pointer)
`type ReticleHint` = `{kind: 'point', from}` | `{kind: 'drag', from, to}` | `{kind: 'swipe', from, to?}` (to defaults to 80 pt up). `<Reticle hint color? />` (Skia elements, inside an existing Canvas), `<ReticleLayer hint width height color? />` (own canvas, touches pass through). `RETICLE_TRAVEL_MS` 1200, `RETICLE_PAUSE_MS` 600, `RETICLE_PULSE_MS` 1200. Unmounting cancels the animation. `reticle.draw.ts`: `drawReticle(c, color?)`, `RETICLE_R`, `GUIDE_DOTS`, `GUIDE_COLOR`, `guideArrowPath(fx, fy, tx, ty)`, `drawGuide(c, fx, fy, tx, ty)`.

## Gallery.tsx
`<Gallery />` (default export too): all sections, the live reticle and the 390 x 844 mock, in a ScrollView.
