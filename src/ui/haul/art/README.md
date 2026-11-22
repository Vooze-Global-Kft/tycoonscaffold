# Orbit Haulers art kit (`src/ui/haul/art`)

Every machine and space object of the haul mode, drawn in code with Skia (spec section 4.3).
Style: line-lit flat vector, dark fills, 1.5 pt bright outlines (`LINE`), glow baked as faint wide
strokes or radial gradients. No blur or mask filters, no image files, nothing from `src/ui/sim` or
`src/ui/art` (the first game's kit).

- `*.draw.ts`, `pen.ts`, `glyphs.ts`, `palette.ts`, `atlas.ts`, `pictures.ts`, `icons.ts`,
  `gallery.*.ts`, `mock.draw.ts`: pure Skia, no React / Reanimated / react-native. They run in the
  app and in Node.
- `Reticle.tsx`, `Gallery.tsx`, `HaulIcon.tsx`: React components.
- `index.ts` re-exports the pure parts (not the components).

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

## rock.draw.ts
- `ROCK_SHAPES` (8), `rockShapeIndex(slot, n)`, `rockBox(r)` (half box with glow).
- `drawRockBody(c, {shape, ore, r = 26, bonanza?})`, `drawRockCracks(c, shape, 1 | 2, r)` (overlay at 50 % / 15 % life), `drawDryRock(c, shape, r)`, `drawDryGlow(c, shape, r)` (pulse its opacity 0.5 Hz), `drawBonanzaOverlay(c, shape, r)`, `rockPicture({...RockOptions, crack?, dry?})`.
- `drawChunk(c, ore, s = 3.4, seed)`, `PILE_CHUNKS`, `drawPile(c, ore, step 0..3)` (about 22 x 18 pt), `drawShard(c, ore, i 0..7)`, `pileLabelPlate(c, w, h)`.

## rig.draw.ts (origin at the rock centre, about 34 pt across)
- `type RigLook` 0..4, `RIG_LOOKS` (Tripod, Dual Bit, Deep Bore, Seam Detector, Twin Rig), `rigLookFor(level)`, `rigStripesFor(level)` (0..3, past L35).
- `drawRigBase(c, {look, stripes?})` (static), `rigHeads(look)` → [{x, y, r}], `drawDrillHead(c, r)` (spin 4 turns/s), `rigLamp(look)` → {x, y}, `type LampState` 'run' | 'full' | 'dry' | 'off', `drawRigLamp(c, state)`, `drawRig(c, {look, stripes?, lamp?})` (all in one, for sheets).

## drone.draw.ts (about 18 x 16 pt, nose +x)
`DRONE_BOX` (11), `drawDrone(c, {ore | null, loaded = true})` (null = idle cyan), `drawThrusterFlame(c, k 0..1)`, `drawIdleBadge(c)` (the bobbing "!").

## station.draw.ts (radius 40; scale by r / 40)
- `STATION_R`, `RACK_CRADLES` (6 cradle centres), `RACK_OVERFLOW` ("+n" spot), `BEACON_POS`.
- `drawDockArm`, `drawRackArm(c, -1 | 1)`, `drawStationRing(c)` (rotate once per 40 s), `drawStationHub(c)`, `drawStation(c, ringTurnDeg)`.
- `STATION_PARTS` (prospect, veinsense, assay, brokerseat, seedcredits, sparedrones, afterburner), `stationPartPos(id)`, `drawPartShape(c, id, level)` (prospect: one petal per 5 levels up to 8; sparedrones: one door per level up to 6), `drawStationPart(c, id, level)` (in place, with strut), `drawScannerDish(c)` (sweep ±30° over 6 s), `drawBeacon(c, on)` (autopilot / Systems Preload beacon, blink 1 Hz).

## freighter.draw.ts (nose up)
`type HullId` 0..3, `HULL_NAMES`, `hullFor(level)` (1, 10, 25, 50), `segmentsFor(level)` (one per 25 levels past 50, up to 8), `freighterSize(hull, segments)`, `freighterEngines(hull, segments)`, `drawFreighter(c, {hull, segments?, cargo?: ore[]})`, `drawFreighterFlame(c, hull, segments, k)`, `drawWarpFlash(c, k 0..1)` (0.5 s), `drawPad(c)` (64 x 40), `drawChevron(c, alpha)`.

## fx.draw.ts
`starfieldPicture(w, h, galaxy, seed)`, `drawStarfield(...)` (tiles vertically; drift 3 pt/s), `drawRingGuides(c, cx, cy, radii, sweepDeg)`, `ROUTE_WIDTH`, `drawRoute(c, x0, y0, x1, y1, ore, phase)`, `drawRouteChip(c, count, ore)`, `drawDragLine(c, x0, y0, x1, y1, color?)`, `drawGhostSlot(c, r, price)`, `drawSeamRim(c, r)`, `drawSparkle(c, x, y, s, color)`, `drawSeamGuide(c, x0, y0, x1, y1, phase)`, `drawFlare(c, beaconOn)`, `drawFlareTrail(c, x0, y0, x1, y1, k)`, `drawCreditGlyph(c, s = 12)`, `drawHoldTank(c, w, h, bands: [ore, fraction][], full)`.

## pods.draw.ts
`type PodTier` 'scrap' | 'derelict', `POD_TIERS`, `POD_FOR_CHEST_TIER` {wood: scrap, silver: derelict}, `drawPod(c, tier, {cut?: 0..1, split?: 0..1, inner?: colour})`.

## modules.draw.ts (cartridge 96 x 120)
`CARTRIDGE_W`, `CARTRIDGE_H`, `type ModuleId`, `type SocketType` 'rig' | 'fleet' | 'dock', `MODULES` (id, rarity, socket, spec 5.1), `drawSocketGlyph(c, socket, r, color)` (rig triangle, fleet hex, dock square), `drawCartridge(c, {module, rarity, socket, mark?, locked?})`, `drawModuleFace(c, id)`.

## portraits.draw.ts (into a square of `size`)
`drawTally(c, size, turnDeg)`, `waveBars(phase | null)`, `drawCallSign(c, size, sign, color, phase)`, `drawOps(c, size, phase)`, `drawDispatch(c, size, phase)`, `OPS_SIGN`, `DISPATCH_SIGN`, `type BuyerId`, `BUYERS` (id, name, colour), `drawBuyer(c, size, id)`.

## icons.draw.ts / icons.ts
- `drawOreIcon`, `drawPodIcon`, `drawDarkMatterIcon`, `drawWarpCoreIcon`, `drawCreditsIcon`, `drawDroneIcon`, `drawFreighterIcon`, `drawRigIcon`, `drawFlareIcon`, `type RailGlyph`, `RAIL_GLYPHS`, `drawRailGlyph(c, size, id, color?)`, `drawRailButton(c, size, id)`.
- `HAUL_ICONS`: name → `(canvas, size) => void`. Names: `art:ore-iron|copper|ice|titanium|platinum`, `art:pod-scrap`, `art:pod-derelict`, `art:dark-matter`, `art:warp-core`, `art:credits`, `art:drone`, `art:freighter`, `art:rig`, `art:flare`, `art:rail-comms|salvage|fitting|starmap|trade|menu`, `mach:tally`, `mach:ops2`, `mach:dispatch`, `mach:buyer-halden|corvo|tessaly|brightwater|kade|oriel`.
- `HAUL_ICON_NAMES`, `haulArtIconDefs()` (the same as `{draw(pen), box}` entries keyed "x" / "mach-y", for a cache that takes the first game's `ArtIconDef` shape).
- `HaulIcon.tsx`: `<HaulIcon name size fallback? />` and `haulIconUri(name, size)`: this mode's own cached-image icon (no canvas per row).

## atlas.ts (the frame loop's sprites)
- `bakeAtlas({density, freighter?: {hull, segments}})` → `{image, density, sprites, width, height}` or null. 145 sprites, 2036 x 2366 px at 3x (with a freighter), baked in about 0.4 s in Node.
- Sprite names: `drone-<ore>`, `drone-<ore>-empty`, `drone-idle`, `flame-0..2`, `rock-<shape>-<ore>`, `bonanza-<shape>`, `crack1-<shape>`, `crack2-<shape>`, `dry-<shape>`, `dryglow-<shape>`, `drill`, `chunk-<ore>`, `shard-<ore>-<0..7>`, `credit`, and with a freighter `freighter`, `freighter-flame-0..2` (same origin as the freighter).
- `Sprite` {rect (pixels), ax, ay (anchor, pixels)}; `ATLAS_ROCK_R` (26), `ATLAS_HEAD_R` (5.6); `spriteXform(sprite, density, x, y, angle, size)` → [scos, ssin, tx, ty] for `Skia.RSXform` (a worklet).
- `atlasDefs(opts)`: the list (name, half extents, draw).

## pictures.ts
`pictures.stationHub()`, `.stationRing()`, `.stationArms()`, `.stationPart(id, level)`, `.scannerDish()`, `.beacon(on)`, `.rigBase(look, stripes)`, `.rigLamp(state)`, `.drillHead(r)`, `.pile(ore, step)`, `.ghostSlot(r, price)`, `.seamRim(r)`, `.flare()`, `.idleBadge()`, `.pad()`, `.chevron()`, `.freighter(hull, segments)`, `.starfield(w, h, galaxy)`: memoised, never freed.

## Reticle.tsx (hint pointer)
`type ReticleHint` = `{kind: 'point', from}` | `{kind: 'drag', from, to}` | `{kind: 'swipe', from, to?}` (to defaults to 80 pt up). `<Reticle hint color? />` (Skia elements, inside an existing Canvas), `<ReticleLayer hint width height color? />` (own canvas, touches pass through). `RETICLE_TRAVEL_MS` 1200, `RETICLE_PAUSE_MS` 600, `RETICLE_PULSE_MS` 1200. Unmounting cancels the animation. `reticle.draw.ts`: `drawReticle(c, color?)`, `RETICLE_R`.

## Gallery.tsx
`<Gallery />` (default export too): all sections, the live reticle and the 390 x 844 mock, in a ScrollView.
