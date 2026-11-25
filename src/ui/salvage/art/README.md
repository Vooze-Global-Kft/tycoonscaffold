# Scrapyard art kit (`src/ui/salvage/art`)

The look of the fifth game ("hi-vis-and-rust", docs/design/yard-style.md), drawn in code with Skia. Pure
Skia files (no React, no Reanimated): they run in the app (baked into the world's atlas) and in Node.

Look at it: `npx tsx scripts/art/yard-sheets.ts <outDir> [palette type people things pieces plant ground ui proof loading]`
(about 6 s); the icon: `npx tsx scripts/art/yard-icons.ts <outDir>` (icon-final-1024.png, icon-final-60.png, lineup.png). Tests: `npx vitest run src/ui/salvage/art`.

**Conventions.** Sizes are points. World drawings take a `View3q` (`pen.VIEW` = the ground work's 40 pt a
metre, tilt 0.7) and draw round their ANCHOR: the centre of the footprint on the ground (the world sorts
sprites by footprint y). Interface pieces draw from their top-left. Words are the caller's.

| File | What |
|---|---|
| `pieces.draw.ts` | `pieceGlyph(metal)` (each grade's own shape: copper wire bundles and tubes, brass taps/valves/elbows, iron plate and angle, HMS beams, cast-iron sections, aluminium cans/profiles, enamel panels), `pieceHeap` |
| `palette.ts` | `YARD` tokens, `METAL` (colour, sheen mark, pictogram, code per material), `LADDER_ORDER`, `shade`, `mix`, `contrast`, `coolingColour(metal, t)` |
| `pen.ts` | paints, paths, `proj`, `box` (with `onFace`/`onTop` to decorate visible faces), `cylinder`, `discPath`, `groundShadow`/`boxShadow` (swept east by the low sun, `SUN`), `lit` (warm light on a drawing), `rgba`, sheen marks (`ticks`, `glint`, `freckles`), `hazard`, `hash01` |
| `letters.ts` | `stencil` capitals, `dotMatrix` (5 x 7, the ticket), `sevenSeg` (the display) |
| `people.draw.ts` | `drawPerson(c, v, {dir s/e/n/w, pose stand/walk/cut/carry, frame, look, stack, shield})`, `BOSS`, `crewLook(vest)`, `carriedPiece`; anchor the feet, 47 pt tall |
| `scrap.draw.ts` | `drawWasher(whole/stripped/pieces)`, `drawCableDrum`, `drawCoil(cable/bright)`, `drawBrightCopper`, `drawTapCrate`, `tapGlyph`, `drawRadiator`, `drawIngot(metal, t)`, `drawHeap` |
| `plant.draw.ts` | `drawStripper`, `drawWeighbridgeDeck` + `drawWeighDisplay(text)` (returns its printer slot), `drawCrucible` (tilting, returns its lip), `drawMould` (cavities on dry sand), `drawFurnaceSet(cold/pouring/cooling)` (the furnace under its hood; anchor the furnace; at FURNACE_SCALE 1.2 it reaches 2.1 m east and 3.3 m up), `drawTruck(heading, {skip, load})`, `drawContainer`, `drawContainerWall`, `drawPad(w, d, locked)`, `drawBay` |
| `ground.draw.ts` | `drawConcrete` (weeds optional), `drawAsphalt`, `drawPaintLine`, `drawOilStain`, `drawPuddle`, `drawWeeds`, `drawSkyline` (the far plane past the north wall), `drawGroundPatch` |
| `ui.draw.ts` | `chip`, `cashChip`, `ladderChip`, `carryChip`, `clipboardButton`, `goalCard`, `stick`, `oneButton`, `padlockChip`, `priceTag`, `drawTicket(t, print)` (+ `ticketHeight`, `ticketWidth`), `ticketFromSlot` (the ticket feeding out of the display's slot), `scripCoin`, `TYPE`; words through a `TextFn` |
| `proof.draw.ts` | the first screenshot composed from the kit: `drawProof(c, PROOF_844 or PROOF_667, T)` |
| `loading.draw.ts` | `loadingPose(t)` (worklet), `drawLoading(c, w, h, pose, title)`, `LOADING_T`, `PLATE_KG` |

Not wired into the world yet: `src/ui/salvage/world/draw.ts` (placeholders) is the world engineer's;
the atlas keeps its sprite names and anchors and calls these functions instead (requests.md).
