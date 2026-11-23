# Lantern Row art kit (`src/ui/merge/art`)

Everything a player of the merge mode sees that is not text, drawn in code with Skia (spec 4.2,
4.5, 4.6, 7.2, 9.2 P4). Palette "lantern-night": indigo and deep teal for sky and board, lantern
amber for light, rice-paper blue-grey for tickets, brass for rims, red only as a small accent
(measured: 0.12 % of the mock screen at 375 x 667, 0.10 % at 390 x 844). Flat vector with soft
dark-indigo ink outlines (`INK`, 1.25 pt), one flat light per shape (`lit`), lantern glow as radial
gradients. No blur or mask filters, no image files, nothing from another mode's folders.

- Pure Skia (no React; run in the app and in Node): `palette.ts`, `pen.ts`, `letters.ts`,
  `*.draw.ts`, `atlas.ts`, `icons.ts`, `measure.ts`, `gallery.draw.ts`, `mock.draw.ts`.
- React: `MergeIcon.tsx` (parts.Icon), `Gallery.tsx` (dev view `merge-art`, via `devViews.ts`).
- `index.ts` re-exports the pure parts. Import the components by path.

Look at it: `npx tsx scripts/art/merge-sheets.ts <outDir>` (contact sheets, mock screens, atlases,
the red share and the greyscale distances, about 20 s); `?view=merge-art` in the preview (port 8302).
App icons: `npx tsx scripts/art/icons/night.build.ts preview <outDir>` / `final`.

**Conventions.** Sizes are points. "Centred" pieces draw round the origin; pieces that take a
width and height draw from their top-left corner at the origin. Anchors in the atlases are the
design origin (the centre of the sprite's box).

## palette.ts
`NIGHT` (tokens: indigo, indigoDeep, indigoLift, indigoMid, dusk, teal, tealDeep, tealLift, tealCell,
amber, amberSoft, amberPale, amberDeep, flame, paper, paperLight, paperShade, paperEdge, brass,
brassLight, brassDeep, red, redDeep, ink, inkSoft, white, wood…, bamboo…, stone…, leaf, leafDeep,
silk, silkLight, silkDeep, moon), `CHAIN_IDS` (grill, tea, steamer, sweets, noodles, puffs = data
order), `CHAIN` (per chain: main, shade, light, accent, awning, awningShade), `CUSTOMER_SPECIES`,
`SPECIES` (+ raccoon), `COATS` (3), `COAT`, `alpha`, `mix`, `shade`, `luma`, `GREY_MATRIX`.

## pen.ts
`INK`, `INK_W`, `fill`, `stroke`, `dashed`, `light`, `glowPaint`, `linearPaint`, `clip`, `glow`,
`shape`, `lit`, `gloss`, `sparkle`, `builder`, `poly`, `ngon`, `union`, `flat` (draw in one colour),
`grey` (draw in greyscale), `circle`, `oval`, `rrect`, `line`, `arc`, `blob`, `curve`, `scallops`,
`picture`, `around`, `at`, `seeded`, `TAU`, `DEG`.

## letters.ts (paper-cut letters, no font file)
`drawLetters(c, text, x, y, {size, color, style: 'paper' | 'plain', weight, align, edge, seed})`
(cap top at y, returns the width), `lettersWidth`, `lettersCover`. A to Z, 0 to 9, `+ - / · . , : % ( ) = < > ? ! × '`.
Words come from the caller (game.json or strings.ts); the kit holds shapes only.

## goods.draw.ts (48 pt square, centred)
- `GOOD_BOX` (24, half size), `TIERS`, `DRESSINGS` (glyph, pair, glaze, ribbon, plate, garnish, halo, lacquer).
- `drawGood(c, chain, tier, {pip = true, silhouette?: colour})`: chain id or index; tier 1..8. The
  drawing fills about 44 pt; the tier pip sits at `PIP_Y` (20.2) below the centre.
- `drawGlyph(c, chain, s)`: the chain's base glyph (about 20 pt at s = 1): diagonal skewer, cup with
  handle and leaf, pleated bun on a mat, berry with leaf cap, wide bowl with chopsticks, three-lobed puff.
- `drawTierPip(c, tier, x, y, scale)`: 1..8 paper dots grouped by four on a dark plate, about
  5 x 7..32 pt; `tierPipWidth(tier)`.
- `allGoods()`: every [chain, tier].

## gear.draw.ts
- `drawGear(c, chain, s)`: Ember Grill, Copper Urn, Bamboo Steamer, Sugar Pan, Noodle Wok, Lantern
  Pan; centred in the 48 pt square (about 36 pt).
- `RAIL_H` (7), `drawGearRail(c, w, slots[], lit[])` (left end at the origin, centre line y = 0; a
  slot notch at each anchor x, amber while a drop rises), `drawRailSlot(c, x, on)`.
- `drawShelfBadge(c, n)` ("+n", centred, 9 pt tall), `drawWaitingPip(c, r = 4.2)` (red dot, centred),
  `drawTill(c, level 0..4)` (centred, about 12 x 14 pt), `TILL_LEVELS`, `drawFinial`.

## lantern.draw.ts
`drawLantern(c, r, {look: 'lit' | 'unlit' | 'moon' | 'gold', glow, cord, tassel})` (body centred,
r = half width, 1.15 r half height), `drawLanternWire(c, x0, x1, y, n, lit, r, sag)`.

## stalls.draw.ts (60 x 40 pt box, centred; drawn 52 to 60 pt wide)
`STALL_W`, `STALL_H`, `AWNINGS`, `awningFor(stallLevel)` (1 to 4 plain, 5 to 9 scalloped, 10 and up double: see notes),
`drawStallFront(c, chain, {awning: 0 | 1 | 2, silk?, closed?})`. Where the play canvas draws the
rest, from the centre: `STALL_MINDER` {13, 7, size 18}, `STALL_TILL` {24.5, 11.5}, `STALL_BADGE`
{-21, -1}, `STALL_PIP` {-24.5, -9}.

## animals.draw.ts (square of half size `BEAST_BOX` = 26.67 pt, centred; head centre at `HEAD_Y` -5)
`drawCustomer(c, species, coat 0..2)` (fox, hedgehog, badger, otter, bat, owl; scarf),
`drawMinder(c, chainIndex)` (`MINDERS`: Old Brindle badger with spectacles, Pim owl with a tea sprig,
Nettle hedgehog with a headband, Juniper otter with a flower, Tansy raccoon with a headscarf, Marlo
bat with a lantern pin; aprons in the stall colour), `drawDragon(c)`, `drawFirefly(c, k, wing)`
(centred on its glowing tail, about 34 pt with glow), `drawTrailPiece(c, k)` (12 pt), `FIREFLY_GLOW`.
On a counter the bust is drawn at about 0.82 behind the ticket's top.

## street.draw.ts
- Street (top-left): `drawStreet(c, w, h, {band = 40, lanterns, lit, seed})`, `drawWire(c, x0, x1, y, n, lit, r)`,
  `drawCounter(c, w)` (10 pt tall).
- Ticket (top-left): `drawTicket(c, w, h, {gold?, rows?})` (64 x 96 on a 68 pt counter, brass clip
  above y = 0, torn hem), `ticketLayout(w, h)` → `rows[3]` (24 pt rows) and `price` box,
  `drawTick(c, s)` (centred), `drawFilledStamp(c, r, label?, k)` (centred; pass the play strings'
  word as `label`; `k` 0..1 stamps it down).
- Fold (centred): `FOLD_FRAMES` (6), `drawTicketFold(c, f, w, h)`, `drawFlyingLantern(c, r = 7)`.
- Festival (top-left): `drawFestivalBanner(c, w, h, {lit?})` (52 x 116), `bannerGrid(w, h)` (6 slots of 22 pt),
  `drawFestivalLantern(c, lit, r)` (centred).
- Board: `drawBoardBase(c, cols, rows, cell)` (top-left), `drawCellTile(c, s)`, `drawShutter(c, s, {next?})`,
  `shutterTag(s)` (the next shutter's text box, centred coordinates), `drawStoneGate(c, s)`,
  `drawBrazier(c, s)` (all centred, side s).
- Props (centred): `drawBasket(c, s = 48)`, `drawUndoChip(c, w = 56, h = 22)`, `drawGiftBag(c, 3 | 4, s = 48)`,
  `drawLuckySpark(c, r = 14)`, `drawCoin(c, r = 6)`, `drawPurse(c, s = 24)`.
- Drag marks (centred on a cell of side s): `drawMatchGlow(c, s, k)`, `drawTargetOutline(c, w, h)`, `drawArmedRing(c, s, k)`.

## spokes.draw.ts
- Ladder Book: `drawBambooPole(c, h, w, node)` (from (0,0) down), `drawRung(c, w, 'found' | 'next' | 'unknown', {r, best})`
  (centred; the good or its silhouette goes in the window of radius r, drawn by the spoke),
  `drawLadder(c, w, h, states[])` (top-left; tier 1 at the bottom), `ladderRungY(h, i)`.
- Lantern Gate: `GATE_HOOKS` (20), `archHooks(w, h)` (hook points, top-left coordinates),
  `drawLanternArch(c, w, h)`, `drawGateLantern(c, lit, r)` (hangs below its hook point).
- Season scroll: `drawScroll(c, w, h)` (top-left), `drawSeasonBoard(c, 'rectangle' | 'moongate' | 'hearth', cell)`.
- `SEASON_PIECES`, `drawSeasonPiece(c, season 0..3, s = 48)` (blossom pot, firefly jar, moon kite,
  snow lantern; centred), `PARTICLES`, `drawParticle(c, 'petal' | 'firefly' | 'moon' | 'ember', k)` (about 6 to 10 pt).

## loading.draw.ts
`LOADING_LANTERNS` (7), `drawLoadingScreen(c, w, h, progress 0..1, name)`, `drawLoadingWire(c, w, y, lit, flicker)`,
`drawPaperName(c, text, x, y, size, maxW)` (the name in paper-cut letters, centred on x).

## atlas.ts (baked once; never free while a canvas may draw)
| Atlas | Grid | Size at spec density | Sprites (ids) |
|---|---|---|---|
| `items` | 8 x 8 of 48 pt | 1,152 x 1,152 px at 3 | `good-<chain>-<1..8>` (48, with pip), `gear-<chain>` (6), `cell`, `shutter`, `shutter-next`, `block-gate`, `block-brazier`, `basket`, `spark`, `giftbag-3`, `giftbag-4` (63 of 64) |
| `animals` | 5 x 5 of 53.3 pt | 800 x 800 px at 3 | `customer-<species>-<0..2>` (18), `minder-<chain>` (6), `dragon` |
| `stalls` | 6 x 7 of 60 x 40 pt | 1,728 x 1,344 px at 4.8 | `stall-<chain>-<0..2>`, `stall-<chain>-<0..2>-silk`, `stall-<chain>-closed` (42) |
| `fx` | shelf-packed | 2,046 x 392 px at 3 | `coin`, `lantern-fly`, `fold-0..5`, `firefly`, `trail`, `pip-1..8`, `particle-<kind>`, `waiting`, `till-0..4`, `match`, `armed`, `target` (48 pt), `festival-lit`, `festival-unlit` |

`ATLAS_KINDS`, `SPEC_DENSITY`, `bakeAtlas(kind, density?)` → `{kind, image, density, sprites: {rect, ax, ay}, width, height}`
(density capped at the spec's, lowered by 0.25 until it fits 2,048), `atlasSize(kind, density?)`,
`spriteIds(kind)`, `goodSprite(c, k)`, `gearSprite(c)`, `customerSprite(species, coat)`,
`minderSprite(c)`, `stallSprite(c, awning, silk?, closed?)`, `ITEM_PROPS`,
`spriteXform(sprite, density, x, y, angle, size)` (a worklet: [scos, ssin, tx, ty] for RSXform;
`size` = drawn points / design points, e.g. cell / 48 for a good).

## icons.ts and MergeIcon.tsx
`mergeIcons()` (name → `(c, size) => void`, centred), `mergeIconNames()`, `hasMergeIcon(name)`.
`<MergeIcon icon size fallback? />`, `mergeIconUri(name, size)`: cached PNG images, no canvas per row.
- `beast:<species>` (fox: customer coat 0; badger, owl, hedgehog, otter, raccoon, bat: that species'
  minder, as game.json's portraits use them), `beast:<species>-<0..2>`, `beast:minder-<chain>`,
  `beast:oldbrindle|pim|nettle|juniper|tansy|marlo`, `beast:dragon`, `beast:firefly`.
- `art:good-<chain>-<1..8>`, `art:gear-<chain>`, `art:stall-<chain>`, `art:coin`, `art:purse`,
  `art:basket`, `art:spark`, `art:giftbag-3|4`, `art:lantern-lit|unlit|moon`, `art:ticket`,
  `art:shutter`, `art:season-<0..3>`, `art:undo`, `art:book`, `art:gate`, `art:scroll`, `art:shop`,
  `art:awnings`, `art:late-hours`, `art:quiet-evening`.

## measure.ts, gallery.draw.ts, mock.draw.ts
`isRed`, `redShare(rgba)`, `lumaOf`, `greyDistance` (mean and share of pixels changed > 24 levels),
`GREY_MIN_CHANGED` (0.08); `sectionPicture`, `drawGoodsBoard(c, cell, {greyscale, pip})`,
`gallerySections()`; `drawMainMock(c, w, h, insets)`.
