# High Office art kit (`src/ui/decree/art`)

Everything a player of the decree mode sees that is not a face and not text, drawn in code with
Skia (office-design.md 4.1 to 4.6, 5, 7.1, 7.9, 9.2 P4). The faces (busts, portraits, election
night's cut-outs and band) are the cast package's, in `faces/` (its own README); `index.ts`
re-exports them so a screen has one import.

Palette "baize-and-ink": green baize and walnut, a cool pale blue-grey paper (never cream or
manila), violet ink (signature, SIGN), slate (REFUSE), brass (tray, clip, lamp), mustard for money
only, soft brick only for boycott and scandal words. Measured: brick 0.00 to 0.24 % of the mock desk
at 375 x 667 and 390 x 844 (day paper, boycott, scandal, signing, three desks; limit 8 %); SIGN
#5B3E8C / REFUSE #6C7A89 is not a green-and-red pair. Flat two washes, a thin warm-brown line
(`LINE` #3A2A22, never black) and one-direction hatching for shadow; no blur or mask filters.

- Pure Skia (no React; app and Node): `palette.ts`, `pen.ts`, `letters.ts`, `*.draw.ts`, `atlas.ts`,
  `icons.ts`, `measure.ts`, `gallery.draw.ts`, `mock.draw.ts`.
- React: `DecreeIcon.tsx` (parts.Icon, cached PNGs), `Gallery.tsx` (dev view `decree-art`, via `devViews.ts`).

Look at it: `npx tsx scripts/art/decree-sheets.ts <outDir>` (sections in colour and grey, the mock
desks, icons at 18 pt, the atlases, `measure.json`; about 25 s); `?view=decree-art` in the preview
(port 8303). App icons: `npx tsx scripts/art/icons/office.build.ts candidates|preview <outDir>` / `final`.

**Conventions.** Sizes are points. "Centred" pieces draw round the origin; pieces that take w and h
draw from their top-left. Icons are designed in a box of ±12 (24 pt). Atlas anchors are the design
origin. Words (labels, counts, names) are always the caller's; pieces give a `*Box` for them.

## palette.ts
`DESK` (the tokens of 4.6 and their shades: baize, walnut, mahogany, paper*, violet*, slate*,
brass*, mustard*, brick*, chalk*, line, green (the governor's lamp glass only), beige (emblem
field), napkin, wall, gilt, bronze, sticky, glass, shadow), `CLUB_IDS` (bus, shops, veg, brass,
anglers, kites, hedges: the schema's order), `CLUB` (main, light, deep, pattern, colour name:
terracotta stripes, sage dots, slate-blue checks, copper chevrons, plum waves, ochre diamonds, dove-grey
grid), `clubOf(id)` (aliases), `alpha`, `mix`, `shade`, `luma`, `rgbOf`, `GREY_MATRIX`.

## pen.ts
Paints (`fill`, `stroke`, `dashed`, `linearPaint`, `radialPaint`), paths (`poly`, `rect`, `rrect`,
`circle`, `oval`, `line`, `arc`, `wedge`, `ngon`, `star`, `blob`, `curve`, `union`, `minus`, `moved`,
`scallops`, `wobble`), verbs (`clip`, `shape`, `hatch`, `washed`, `dropShadow`, `flat`, `grey`,
`faded`, `at`), the broad nib (`nibPath(points, nib, deg, end)`, `sampleCurve`, `polyLength`,
`indexAt`), `picture`, `around`, `seeded`, `hashOf`; `LINE`, `LINE_W` 1.1, `HATCH_DEG`, `HATCH_GAP`.

## letters.ts
`drawLetters(c, text, x, y, {size, style: 'nib'|'chalk'|'print', color, slant, tracking, weight, seed})`
(baseline-left anchor; capitals, digits, `. , : ' - − + / % & ( ) ! ? · →`), `lettersWidth`, `lettersCover`.

## clubs.draw.ts
| Export | Size | Anchor |
|---|---|---|
| `drawClubBadge(c, club, r=12, {mood, boycott, flag})` | disc 2r (24 pt), mood ring at 1.2 r | centre |
| `drawClubGlyph(c, club, k, ink)` | ±10·k | centre |
| `drawPattern(c, path, club, k, toneA?, toneB?)` | fills `path` | – |
| `drawMoodRing(c, r, mood, boycott)`, `moodRingRadius(r)` | ring at 1.2 r | centre |
| `drawSmallFlag(c, k)` | ~10·k tall | pin foot ≈ centre |

## effects.draw.ts
`EFFECT_IDS` (coin, gossip, approval, every, level, minister, boycott, boycott_end, scandal,
scandal_end, returns, flag, nr, record, district, nochange) and `drawEffect(c, id)` (±12, centre);
`drawCoin(c, r)`, `drawGossip`, `drawApproval(c, value)`, `drawEvery`, `drawLevel`, `drawMinister`,
`drawRosette(c, x, y, r, col)`, `drawPicket(c, ended)`, `drawScandal(c, ended)`, `drawReturns`,
`drawRecord`, `drawDistrict`, `drawNoChange`; chip grounds (w x h from top left):
`drawChip(c, w, h, 'sign'|'refuse'|'bar')`, `drawApprovalChip(c, w, h, value)` (86 x 26),
`drawGossipChip(c, w, h, n, max)` (48 x 26).

## ministries.draw.ts
`MINISTRY_IDS` (18, game.json ids), `PROJECT_IDS` (5), `MINISTRY_ALIASES` (names.json ids),
`ministryArtOf(id)`, `drawMinistry(c, id)` (±12, centre), `drawStoreys(c, n, w=14, fh=4)` (n 0..8,
anchor bottom centre, height `storeysHeight(n)`, ≤ 38 pt).

## desk.draw.ts
| Export | Size (pt) | Anchor |
|---|---|---|
| `drawDesk(c, box, office, set)` | the desk canvas box (out-tray band + paper + drawer band) | box |
| `drawDeskTop(c, box, office, set, railY)` | the band behind the bars (screen top to the ribbon's bottom; per office: plain walnut / mahogany crossbanding / walnut with gilt line and brass rail) | box, railY = the felt's edge |
| `drawDeskFront(c, box, office, set)` | the desk front under the drawer (goal line to screen bottom; plain / inlaid mahogany panels / long walnut with brass rails) | box |
| `drawBaize(c, box)`, `drawWood(c, box, wood)`, `woodOf(office, set)` | box | box |
| `drawLamp(c, h=30, set)` (governor), `drawLampPool(c, r)` | ~26 x 30 | bottom centre |
| `drawTelephones(c, k)` (president), `drawTelephone(c, body, k)` | ~80 x 16 | base centre |
| `drawDeskSet(c, k)` (Walnut & Brass cosmetic) | ~60 x 16 | centre |
| `drawDoor(c, w, h, office, shadow)` + `doorGlassBox(w, h)` for "Next visitor 0:07" | ~118 x 30 | top left |
| `drawInTray(c, w, h, count, {digits, full})` + `inTrayBadge(w, h)`, `trayEdges(n)` | 72 x 60/64 | top left |
| `drawOutTray(c, w, h, signed)`, `outTraySheets(n)` (a sheet per signed paper to 24, then 1 per 4) | ~150 x 32..56 | top left |
| `drawDrawer(c, w, h, stage, open, office)` + `drawerLabelBox(dw, h)`, `drawerStage(refused)` (0; 1 at 100: second drawer; 2 at 1,000: filing cabinet; 3 at 10,000: warehouse photo) | 343 x 36..56 | top left |
| `drawWarehousePhoto(c, w, h)` | w x h | centre |
| `drawStickyNote(c, w, h)` + `stickyBox(w, h)` | ~120 x 44 | top left |
| `drawPaperclip(c, len=22, color)` | 7 x len | centre |
| `drawPen(c, len=64, set)`: the hint pointer (0 deg = nib up, as HintPointerProps) | 10 x 64 | nib tip |
| `drawTakeBackRest(c, w, h, left)` (2 s ring drawn by `left` 1 → 0) | ~160 x 30 | top left |
| `drawPaperShadow(c, w, h, lift)` | paper | top left |

## paper.draw.ts
| Export | Size | Anchor |
|---|---|---|
| `drawPaper(c, w, h, {m, armed, armedBy, shake, lift, slot})` (m: rows from paperMetrics) | 343 x 405/461 | top left |
| `signatureBox(stripW, chipTop)` | the box in the SIGN strip's title row where the signature writes (never over a chip) | strip's top left |
| `drawSignatureIn(c, playerId, progress, box)` / `signatureBounds(playerId, box)` | the signature revealed into that box / its bounds with the nib | strip's top left |
| `MASTHEAD_TILT` | -4.5 deg: draw the front page's masthead words in this tilt about the masthead box's centre | - |
| `drawSheet(c, w, h, lift, tint)` | w x h | top left |
| `drawStrip(c, w, h, side, {armed 0..1 → 110 %, shake, rows})` | inner 315 x 106 | top left |
| `shakeOffset(t, amp)` (worklet: the "Short by" shake, 0.45 s) | – | – |
| `drawPhotoSlot`, `photoOval`, `drawPhotoClip` | 44 x 54 | slot top left |
| `defaultRows(h)` | – | – |
| `drawSlip(c, w, h, lift)` (budget slip, ledger-ruled) | ~240 x 110 | top left |
| `drawFormFace(c, w, h, 'requisition'|'ribbon'|'application')`, `drawRibbonCorner`, `drawEmblemMark` | the header + proposal rows | top left |
| `drawPicketSign(c, k, deg)` + `picketSignBox()` | 60 x 66 | board centre |
| `drawFrontPage(c, w, h, lift)` + `frontPageBoxes(w, h)` (masthead, headline, photo, caption); `drawGoosePhoto` (the one small plain goose photo: side view in its RESERVED parking bay, D12, D43) | paper | top left |
| `drawRunUpPaper(c, w, h, o)`, `drawBunting(c, x0, x1, y, n, sag, flag)` | paper | top left |
| `drawSignature(c, face, progress, k, color)`, `signatureOf(face)`, `signatureTip`, `SIGNATURE_IDS` (the 6 player faces), `SIGNATURE_BOX` 120 x 34 | 120 x 34 · k | box top left |

## meta.draw.ts
`BUTTON_ICONS` + `drawButtonIcon(c, id)` (±12: ledger, cabinet, poll, office, shop, settings,
scrapbook, shelf, call); `drawLedger(c, w, h)` + `ledgerRows(w, h, n)`; `drawCabinetFrame(c, w, h,
filled[9])` + `cabinetSlots(w, h)`; `districtPaths(office)` (Skia paths in 100 x 100, game.json's
district order), `drawDistrictMap(c, w, h, office, {held[], focus, pins})`, `districtLabel`,
`drawDistrictBadge(c, office, i, r, held)`; `drawTallyBoard(c, w, h, n, {majority, bunting})` +
`tallyRows`, `drawChalkMarks(c, n, h, seed, held?)` (one chalk tick held, one dash not held; finding 49), `drawEnvelope(c, open, k)` (40 x 26, centre),
`drawTallyResult(c, held, r)`.

## wall.draw.ts
`drawWallpaper(c, box, 'walnut'|'gilt', rail)`, `drawFrame(c, w, h, style, oval)` + `frameInner`,
`drawAgeing(c, box, age)`, `drawTownPhoto(c, w, h, 0|1|2, tilt)`, `drawOpponentsCard(c, w, h, n)`,
`MONUMENTS` (24: id, label, statue; 5 statues or busts), `MONUMENT_IDS`, `monumentArtOf(id or written
name)`, `drawMonument(c, idOrName)` (±12, base at y 10), `drawVanityShelf(c, w, h, placed[24])` +
`shelfSlots`, `drawScrapbook(c, w, h)` + `scrapbookSlots`, `drawClipping(c, w, h, seed, {photo, election})`.

## emblem.draw.ts
`drawEmblem(c, r=40)` (80 pt, centre: ribbon scissors over a folded napkin on a beige field),
`drawGiantScissors(c, r, {open, ribbon, chunky, darkSteel})` (chunky widens the blades, darkSteel gives slate blades for pale grounds: the app icon), `drawNapkin(c, r)`, `drawCutRibbon(c, r)` (a ribbon cut in two, halves falling apart, centred), `drawLoadingCard(c, w, h, title,
motto)`, `drawCaptionBand(c, w, h)`, `drawCaption(c, lines, x, y, size, color)` (the "signature"
template's violet hand with a nib flourish), `drawNibMark`.

## atlas.ts
`decreeAtlas(kind, density)` (THE way to get one: baked once, never freed), `bakeAtlas`,
`atlasSize`, `spriteIds`, `spriteXform` (worklet), `faceAtlasOf(name)`; ids (worklets):
`clubSprite(club, boycott)`, `effectSprite`, `ministrySprite`, `monumentSprite`, `storeySprite(n)`,
`faceSpriteName`, `portraitSpriteName`, `cutoutSpriteName`, and `PROP_SPRITES` (paperclip, pen,
envelope, envelope-open, rosette, flag, coin, pin).

| Atlas | Content | Size |
|---|---|---|
| props | 94 sprites, shelf-packed at 3 px/pt | 1,007 x 782 (fits the spec's 1,024 x 1,024) |
| faces | the cast's 48 busts, 128 x 160 px cells | 1,024 x 960 |
| faces2 | 10 more busts + 6 portraits x 3 ages | 1,024 x 640 |
| cutouts | 19 cut-outs + the band | 960 x 1,020 |

## icons.ts and DecreeIcon.tsx
`decreeIcons()`, `decreeIconNames()`, `hasDecreeIcon`, `resolveDecreeIcon(name)` (forgiving:
monuments by any name, ministries by register id, bare cast ids), `clubIcon`, `ministryIcon`,
`monumentIcon`, `effectIcon`, `faceIcon`. Names: `art:club_<id>[_boycott]`, `art:fx_<effect>`,
`art:ministry_<id>`, `art:monument_<id>`, `art:btn_<id>`, `art:product_<product id>`,
`art:ad_<sofa|spin|courier|doors|away>`, `art:storeys_<n>`, `art:emblem|scissors|pen|paperclip|
envelope|rosette|intray|drawer|lamp|telephones|deskset|map_0|map_1|map_2`, `face:<castId>`,
`face:portrait-<player>-<age>`. `<DecreeIcon icon size fallback />`, `decreeIconUri`,
`warmDecreeIcons`, `DECREE_ICON_PREFIXES`.

## measure.ts, mock.draw.ts, gallery.draw.ts
`brickShare`, `isBrick` (RGB within 28 of #B0563F; terracotta is 34 away), `BRICK_MAX_SHARE`,
`isGreenRedPair`, `hsv`, `lumaOf`, `greyDistance`; `drawDeskMock(c, w, h, {office, paper, set,
face})`, `drawButtonGround`; `gallerySections`, `sectionPicture`.
