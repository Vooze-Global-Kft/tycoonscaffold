# Lantern Row art kit (`src/ui/merge/art`)

Everything a player of the merge mode sees that is not text, drawn in code with Skia (spec 4.2,
4.5, 4.6, 7.2, 9.2 P4). Palette "lantern-night": indigo and deep teal for sky and board, lantern
amber for light, rice-paper blue-grey for tickets, brass for rims, red only as a small accent
(measured: 0.16 % of the mock screen at 375 x 667, 0.14 % at 390 x 844). Flat vector with soft
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
`SPECIES` (+ hare, a minder only; `BEAST_ALIASES` / `speciesOf`: the old name `raccoon` draws the hare, M38), `COATS` (3), `COAT`, `alpha`, `mix`, `shade`, `luma`, `GREY_MATRIX`.

## pen.ts
`INK`, `INK_W`, `fill`, `stroke`, `dashed`, `light`, `glowPaint`, `linearPaint`, `clip`, `glow`,
`shape`, `lit`, `coat` (paint a colour over a drawing only where it has paint: the tier-3 glaze), `gloss`, `sparkle`, `builder`, `poly`, `ngon`, `union`, `flat` (draw in one colour),
`grey` (draw in greyscale), `circle`, `oval`, `rrect`, `line`, `arc`, `blob`, `curve`, `scallops`,
`picture`, `around`, `at`, `seeded`, `TAU`, `DEG`.

## letters.ts (paper-cut letters, no font file)
`drawLetters(c, text, x, y, {size, color, style: 'paper' | 'plain', weight, align, edge, seed})`
(cap top at y, returns the width), `lettersWidth`, `lettersCover`. A to Z, 0 to 9, `+ - / · . , : % ( ) = < > ? ! × '`.
Words come from the caller (game.json or strings.ts); the kit holds shapes only.

## goods.draw.ts (48 pt square, centred)
- `GOOD_BOX` (24, half size), `TIERS`, `DRESSINGS` (glyph, pair, glaze, ribbon, plate, garnish, halo, lacquer).
- `drawGood(c, chain, tier, {pip = true, silhouette?: colour})`: chain id or index; tier 1..8. The
  drawing stays inside the 48 pt square (the atlas test checks it); the tier pip's bottom edge sits at
  `PIP_Y` + `PIP_H` / 2 (23.6) below the centre (`pipCentreY(tier)`; a two-plate pip grows upward). From tier 5 the three glyphs keep one large size (about 70 % of the
  cell) and each tier adds a frame round and behind them: plate (5), dark rimmed plate and a ring
  of leaves (6), a lantern halo behind (7), the indigo lacquer board round the cell (8). Tier 3 is
  the pair coated over its top half in the chain's `GLAZE` (honey, milk, soy, dark chocolate,
  golden broth, dark caramel), one drip and a gloss line. `silhouette` draws the glyph arrangement
  only (no plate, halo or board) in one colour: the Ladder Book's next good.
- `drawGlyph(c, chain, s)`: the chain's base glyph (about 20 pt at s = 1): diagonal skewer, cup with
  handle and leaf, pleated bun on a mat, berry with leaf cap, wide bowl with chopsticks, tall twisted
  puff knot (a cone: never round like the berry). `GLAZE` (tier-3 coat per chain).
- `drawTierPip(c, tier, x, y, scale)`: 1..8 paper dots of 3.5 pt on dark plates of up to four,
  centred on (x, y): tiers 1 to 4 one plate (6.4 x 8.9..21.5 pt), tiers 5 to 8 the plate of four with
  a plate of the rest under it, flush left (21.5 x 13.8 pt); the same plates a ticket line and the
  Festival banner draw (play/pictures.ts `drawSmallPip`), so a line and its good read alike.
  `tierPipWidth(tier)` (the widest plate), `tierPipHeight(tier)`, `PIP_H`, `PIP_GAP`.
- `allGoods()`: every [chain, tier].

## gear.draw.ts
- `drawGear(c, chain, s)`: Ember Grill, Copper Urn, Bamboo Steamer, Sugar Pan, Noodle Wok, Lantern
  Pan; centred in the 48 pt square (about 42 pt, steam as soft S-curls, all inside the square).
- `RAIL_H` (7), `drawGearRail(c, w, slots[], lit[])` (left end at the origin, centre line y = 0; a
  slot notch at each anchor x, amber while a drop rises), `drawRailSlot(c, x, on)`.
- `drawShelfBadge(c, n)` ("+n", centred, 9 pt tall), `drawWaitingPip(c, r = 4.2)` (red dot, centred),
  `drawTill(c, level 0..4)` (centred, about 12 x 16 pt; 0 shows an empty dark inside, then 2, 3, 5, 6 coins), `TILL_LEVELS`, `drawFinial`.

## lantern.draw.ts
`drawLantern(c, r, {look: 'lit' | 'unlit' | 'moon' | 'gold', glow, cord, tassel})` (body centred,
r = half width, 1.15 r half height), `drawLanternWire(c, x0, x1, y, n, lit, r, sag)`.

## stalls.draw.ts (60 x 40 pt box, centred; drawn 52 to 60 pt wide)
`STALL_W`, `STALL_H`, `AWNINGS`, `awningFor(stallLevel)` (1 to 4 plain, 5 to 9 scalloped, 10 and up double: see notes),
`drawStallFront(c, chain, {awning: 0 | 1 | 2, silk?, closed?})`. Silk (M13): a deep night-blue
silk (no chain uses it) with sheen and a moon crest, a string of three moon lanterns in every
awning state, the valance and the counter band in the stall's own colour. Closed: a cloth curtain
in a dark shade of the stall's colour with a paper tag of its glyph, the awning furled and tied.
Where the play canvas draws the rest, from the centre: `STALL_MINDER` {13.5, 3.6, size 20} (the fx
sprite `minder-head-<chain>`, a head only), `STALL_TILL` {24.5, 11.5}, `STALL_BADGE` {-21, -1},
`STALL_PIP` {-24.5, -9}.

## animals.draw.ts (square of half size `BEAST_BOX` = 26.67 pt, centred; head centre at `HEAD_Y` -7)
Every head sits into its shoulders: a neck (or the bat's and owl's folded wings) under it, the
scarf or collar over its base. Ears stay inside the box (the atlas test checks it); the busts are
cut at the bottom edge on purpose.
`drawCustomer(c, species, coat 0..2)` (fox with a white-tipped tail at the shoulder; hedgehog;
badger; otter with a long low head, a pale muzzle band and a sleek neck; bat with wings folded on
its shoulders, a pug nose and tiny fangs; owl with a feather facial disc and beak, no tufts; each
with a scarf), `drawMinder(c, chainIndex)` (`MINDERS`, each in different work clothes: Old Brindle
badger, waistcoat and spectacles; Pim owl, sash and a tea sprig; Nettle hedgehog, bib apron and a
headband; Juniper otter, cross-strap apron and a flower; Tansy hare (M38: long dark-tipped ears, one bent; no mask), a cook's neckerchief and a
ladle; Marlo bat, a short jacket with a lantern pin), `drawMinderHead(c, chain, size)` (head only,
centred, fitted to a size pt square: the stall front's minder), `drawDragon(c)` (an origami serpent
of folded facets, paper and amber, accordion body; no mane, whiskers, horns or mask),
`drawFirefly(c, k, wing)` (centred on its glowing tail, about 38 pt with glow), `FIREFLY_WINGS` (3),
`drawTrailPiece(c, k)` (12 pt), `FIREFLY_GLOW`.
On a counter the bust is drawn at about 0.82 behind the ticket's top.

## street.draw.ts
- Street (top-left): `drawStreet(c, w, h, {band = 40, lanterns, lit, seed})`, `drawWire(c, x0, x1, y, n, lit, r)`,
  `drawCounter(c, w)` (10 pt tall).
- Ticket (top-left): `drawTicket(c, w, h, {gold?, rows?})` (64 x 96 on a 68 pt counter, brass clip
  above y = 0, torn hem; gold = the Parade's: the same blue-grey paper with a brass-foil border and
  studs, never cream), `ticketLayout(w, h)` → `rows[3]` (24 pt rows) and `price` box,
  `drawTick(c, s)` (centred), `drawFilledStamp(c, r, label?, k)` (centred; the sheets only),
  `filledStampPicture(label, r)` (the stamp with its word recorded ONCE per word and kept: what
  the play canvas draws).
- Fold (centred): `FOLD_FRAMES` (6: flat, creased, pleated, paper lantern, lit, lifting off),
  `drawTicketFold(c, f, w, h)`, `foldExtent(f, w, h)` (half extents with glow), `drawFlyingLantern(c, r = 7)`.
- Moments (centred, within 26 pt): `EFFECTS` (puff, flash, burst, rise), `drawEffect(c, kind, k)`;
  `drawNewTag(c, w = 22, h = 10)` (the stretch line's NEW mark; the word comes from strings).
- Festival (top-left): `drawFestivalBanner(c, w, h, {lit?})` (52 x 116), `bannerGrid(w, h)` (6 slots of 22 pt),
  `drawFestivalLantern(c, lit, r)` (centred).
- Board: `drawBoardBase(c, cols, rows, cell)` (top-left), `drawCellTile(c, s)`, `drawShutter(c, s, {next?})`
  (plain: an indigo cloth blind with a tie and a brass tag; next: a bamboo blind with the paper
  tag), `shutterTag(s)` (the next shutter's text box, centred coordinates), `drawMoonGate(c, s)`
  (ONE warm-stone arch over both gate cells: s wide, 2s tall, centred on the line between them),
  `drawMoonGateHalf(c, s, 'top' | 'bottom')`, `drawBrazier(c, s)` (all centred, side s).
- Props (centred): `drawBasket(c, s = 48)`, `drawUndoChip(c, w = 56, h = 22)`, `drawGiftBag(c, 3 | 4, s = 48)`,
  `drawLuckySpark(c, r = 14)`, `drawCoin(c, r = 6)`, `drawPurse(c, s = 24)`.
- Drag marks (centred on a cell of side s): `drawMatchGlow(c, s, k)`, `drawTargetOutline(c, w, h)`,
  `drawArmedRing(c, s, k)` (a soft paper ring with six beads; no ticks, no cross).

## spokes.draw.ts
- Ladder Book: `drawBambooPole(c, h, w, node)` (from (0,0) down), `drawRung(c, w, 'found' | 'next' | 'unknown', {r, best})`
  (centred; the good or its silhouette goes in the window of radius r, drawn by the spoke),
  `drawLadder(c, w, h, states[])` (top-left; tier 1 at the bottom), `ladderRungY(h, i)`.
- Lantern Gate: `GATE_HOOKS` (20), `archHooks(w, h)` (hook points, top-left coordinates),
  `drawLanternArch(c, w, h)`, `drawGateLantern(c, lit, r)` (hangs below its hook point).
- Season scroll: `drawScroll(c, w, h)` (top-left), `drawSeasonBoard(c, 'rectangle' | 'moongate' | 'hearth', cell)`.
- `SEASON_PIECES`, `drawSeasonPiece(c, season 0..3, s = 48)` (blossom pot, firefly jar, a diamond
  paper kite with a moon, a lantern hung from a snowy branch; centred), `PARTICLES`, `drawParticle(c, 'petal' | 'firefly' | 'moon' | 'ember', k)` (about 6 to 10 pt).

## loading.draw.ts
`LOADING_LANTERNS` (7), `drawLoadingBackdrop(c, w, h, name)` (the static part: street, wire, name),
`loadingLanterns(w, h)` (each lantern's centre and radius), `drawLoadingScreen(c, w, h, progress 0..1, name)`
(one moment, for the sheets), `drawPaperName(c, text, x, y, size, maxW)` (paper-cut letters, centred on x).

## atlas.ts (baked once per app; never freed)
| Atlas | Grid | Size at spec density | Sprites (ids) |
|---|---|---|---|
| `items` | 8 x 8 of 48 pt (+2 px border) | 1,184 x 1,184 px at 3 | `good-<chain>-<1..8>` (48, with pip), `gear-<chain>` (6), `cell`, `shutter`, `shutter-next`, `block-gate-top`, `block-gate-bottom`, `block-brazier`, `basket`, `spark`, `giftbag-3`, `giftbag-4` (64) |
| `animals` | 5 x 5 of 53.3 pt (+2 px) | 820 x 820 px at 3 | `customer-<species>-<0..2>` (18), `minder-<chain>` (6), `dragon` |
| `stalls` | 6 x 7 of 60 x 40 pt (+2 px) | 1,752 x 1,372 px at 4.8 | `stall-<chain>-<0..2>`, `stall-<chain>-<0..2>-silk`, `stall-<chain>-closed` (42) |
| `fx` | shelf-packed (+2 px) | 2,008 x 595 px at 3 | `coin`, `lantern-fly`, `fold-0..5`, `firefly`, `firefly-0..2`, `trail`, `pip-1..8`, `particle-<kind>`, `waiting`, `till-0..4`, `match`, `armed`, `target` (48 pt), `festival-lit`, `festival-unlit`, `wire-lit`, `wire-unlit` (r = 12), `stamp` (no word), `fx-puff`, `fx-flash`, `fx-burst`, `fx-rise`, `new-tag`, `minder-head-<chain>` (20 pt) (50) |

Every sprite's rect holds its glow and a transparent 2 px border; the test "no sprite is clipped"
fails if any rect edge has alpha above 8 (the busts' bottom edge excepted), so nothing is cut flat
and linear sampling never bleeds a neighbour in. Anchor = the rect's centre = the design origin.

- `mergeAtlas(kind, density?)`: **what every consumer calls.** Baked on first call per (kind,
  density), cached in a module Map for the app's life, never evicted or freed: the play canvas,
  loading screen, spokes and firefly share one copy, and a remount bakes nothing. Call it in a
  `useMemo` or at module scope, never per frame. A bake costs about 0.3 to 1 s of JS thread per
  atlas (Node, CanvasKit: items 0.85 s, stalls 0.97 s), so warm them behind the loading screen.
- `bakeAtlas(kind, density?)` → `{kind, image, density, sprites: {rect, ax, ay}, width, height}`:
  bakes anew on every call (sheets and tests only); the surface is disposed after the snapshot.
- `ATLAS_KINDS`, `SPEC_DENSITY`, `atlasSize(kind, density?)` (density capped at the spec's, lowered
  by 0.25 until it fits 2,048), `spriteIds(kind)`, `ITEM_PROPS`.
- Id helpers, all **worklets** (the drag layer may call them on the UI thread): `goodSprite(c, k)`,
  `gearSprite(c)`, `customerSprite(species, coat)`, `minderSprite(c)`, `minderHeadSprite(c)`,
  `stallSprite(c, awning, silk?, closed?)`; `spriteXform(sprite, density, x, y, angle, size)`
  (worklet: [scos, ssin, tx, ty] for RSXform; `size` = drawn points / design points, e.g. cell / 48).
- Sampling: draw `<Atlas>` with linear sampling (its default). For the stall fronts pass
  `PixelRatio.get()` as density so a 52 to 60 pt front draws near 1:1 (at 4.8 px/pt on a 3x phone
  it would be a 0.54 to 0.63 downscale with no mipmaps, and thin ink lines would shimmer).

## Per frame (how each animated piece animates; never call a draw function per frame)
The draw functions allocate a Paint and a Path per shape: they are for RECORDING (a picture once,
an atlas once). Per frame only transforms, opacities and atlas sprites change.

| Piece | How it animates |
|---|---|
| Goods, gear, busts, stall fronts, shutters, blocks | atlas sprites; position and scale in the RSXform |
| Match glow, armed ring, target outline | fx sprites `match`, `armed`, `target`; the pulse is the sprite's opacity (Atlas `colors`) or a Group opacity |
| Merge puff, Lucky flash, tier-8 burst, drop rise | fx sprites `fx-*`, scaled and faded |
| FILLED stamp | `filledStampPicture(word)`, recorded once per word; Group scale 1.6 → 1 and opacity |
| Ticket fold, flying lantern | fx sprites `fold-0..5` (one frame every 60 to 80 ms), then `lantern-fly` moved along its path |
| Firefly | fx sprites `firefly-0..2` flipped for the wing beat; the glow pulse is opacity |
| Trail, particles, coins | fx sprites; position and opacity |
| Till fill | fx sprite `till-<level>`, swapped when the level changes |
| Loading screen | `drawLoadingBackdrop` recorded once; `wire-lit` / `wire-unlit` at `loadingLanterns` (scale r / 12); the flicker is the lit sprite's opacity |
| Street, gear rail, banner, tickets | pictures re-recorded on a STATE change (a lantern lit, a ticket drawn), never per frame |

## icons.ts and MergeIcon.tsx
`mergeIcons()` (name → `(c, size) => void`, centred), `mergeIconNames()`, `hasMergeIcon(name)`.
`<MergeIcon icon size fallback? />`, `mergeIconUri(name, size)`: cached PNG images, no canvas per row.
`warmMergeIcons(names, size)`: draws a sheet's icons before it opens (about 7 ms each the first time).
- **A customer is never a bare species name**: `customerIcon(species, coat)` → `beast:<species>-<coat>`
  (a ticket's customer). A minder: `minderIcon(chain)` → `beast:minder-<chain>`, or
  `beast:oldbrindle|pim|nettle|juniper|tansy|marlo`. Bare `beast:<species>` exists only for
  game.json's minder portraits (badger, owl, hedgehog, otter, hare and bat draw that MINDER;
  `beast:raccoon`, an old game.json's Tansy, draws the hare; `beast:fox` draws the coat-0 fox). `beast:dragon`, `beast:firefly`.
- `art:good-<chain>-<1..8>`, `art:gear-<chain>`, `art:stall-<chain>`, `art:coin`, `art:purse`,
  `art:basket`, `art:spark`, `art:giftbag-3|4`, `art:lantern-lit|unlit|moon`, `art:ticket`,
  `art:shutter`, `art:season-<0..3>`, `art:undo`, `art:new`, `art:stamp`, `art:book`, `art:gate`, `art:scroll`, `art:shop`,
  `art:awnings`, `art:late-hours`, `art:quiet-evening`.

## measure.ts, gallery.draw.ts, mock.draw.ts
`isRed`, `redShare(rgba)`, `lumaOf`, `greyDistance` (mean and share of pixels changed > 24 levels),
`GREY_MIN_CHANGED` (0.08); `sectionPicture`, `drawGoodsBoard(c, cell, {greyscale, pip})`,
`gallerySections()`; `drawMainMock(c, w, h, insets)`.
