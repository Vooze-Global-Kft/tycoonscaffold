# The cast of High Office (`src/ui/decree/art/faces`)

Every person of the Republic of Middling, drawn in code from parts (office-design.md 1.2, 4.5,
7.3). Editorial cartoon, kindly: busts of adults in an oval photograph, long oval heads (1.36 to
1.5 times taller than wide), dot eyes under heavy brows, a thin warm-brown ink line whose width
swells on the shadow side (`ink()`: the path stroked twice, the second shifted down-right),
one-direction hatching (`HATCH_DEG`, never crossed) over two flat washes. Pure Skia, no React:
runs in the app and in Node.

Look at it: `npx tsx scripts/art/decree-faces.ts [outDir]` (default `scripts/art/out/decree-faces`,
ignored by git): busts at 128 x 160 and at 44 pt, colour and greyscale, the tone sheet, the
portraits with ageing, the cut-outs, the three baked pages, and the closest pairs at 44 pt in
greyscale (`faces.json`).

## What to import (`./index.ts`)

| Need | Import |
|---|---|
| A bust anywhere (any box; the design is 100 x 125) | `drawBust(canvas, castId, {x, y, width, height}, options?)` → false for an unknown id |
| Options | `tone` (another skin tone), `age` 0..2, `mono` (true = violet ink on paper, or `{ink, paper}`), `greyscale`, `frame` (rim, default on), `ground` (photo paper, default on), `hatch` (default on), `skin` (two wash colours, tests) |
| The Office wall's portraits | `drawBust(c, id, box, { mono: PORTRAIT_INK, age })`, or the atlas sprite `portrait-<id>-<age>` |
| Election night | `drawCutout(canvas, castId, box)` (120 x 340 design: head 1/6 of the figure, on a stick), `drawBand(canvas, box, {color})` (240 x 180), ids in `CUTOUT_IDS` (the Counting Clerk, then every rival) |
| The table | `CAST`, `CAST_IDS`, `lookOf(id)`, `hasLook(id)`, `PLAYER_IDS` (the face picker's six), `PART_COLUMNS`, `partsKey`, `lookProblems` |
| The atlas | `faceSprites()` (name, page, x, y, w, h at density 1, `draw(c)` into its cell), `facePageSize(page)`, `FACE_PAGES`, `faceSpriteName(id)` = `face-<id>`, `portraitSpriteName(id, age)`, `cutoutSpriteName(id)`, `band`; `bakeFacePage(page, density)` for sheets and tests |
| Sheets (gallery) | `drawCastSheet`, `drawToneSheet`, `drawPortraitSheet`, `drawCutoutSheet` and their `...Size` |

## Pages

| Page | Grid | Size at density 1 | Sprites |
|---|---|---|---|
| `faces` | 8 x 6 of 128 x 160 | 1,024 x 960 | the first 48 busts in the register's order |
| `faces2` | 8 x 4 of 128 x 160 | 1,024 x 640 | the other 10 busts (rivals), then the 6 player portraits x 3 ageing steps |
| `cutouts` | 8 x 3 of 120 x 340 | 960 x 1,020 | 19 cut-outs, the band (240 x 180) |

Each cell keeps a transparent 2 px border (tested); the anchor is the cell's centre. A 44 pt
photo on a 3x phone is 132 px: the 128 px cell draws near 1:1. Bake once, never free while a
canvas may draw it; list rows get cached images (DecreeIcon), never a canvas per row.

## The rules of 7.3, and where they are kept

- **Tone is a palette parameter only.** `TONES` (six, light to deep) are two wash colours. Parts get
  the skin as colours in a `Wash` and never see a tone id; `cast.ts` rows are the tone then the
  feature parts, and `PART_COLUMNS` has no tone column. `faces.test.ts` draws every look with two
  marker skins and checks the skin's drawn shape is identical pixel for pixel (with a control that
  changing one part does move it), and that no feature part is reserved to one tone. `tones.png`
  draws ten part sets across all six tones.
- **Player faces:** six, tones t1 to t6, three women and three men (`PLAYER_PRESENTATION`). The
  rosette is their vanity prop.
- **No uniform, religious or uniform headwear, crown or national dress.** Hats: bowler, flat cap,
  boater, cloche, bucket hat, bobble hat, trilby, beret, a hat of cloth flowers (Stitchley's hobby),
  a hat with a smaller hat on it (Slake). A tall "beehive" hair style was cut because a hatched dome
  read as a wrap; the band plays bare-headed.
- **Distinct at 44 pt in greyscale.** The sheet measures every pair (share of pixels changed by more
  than 24 grey levels at 44 x 55 pt, 3 px a point; bar 12 %).

## Adding a person

Add a row to `ROWS` in `cast.ts` with the register's id (the test fails for any register id
without a look, any look outside the register, two looks with the same parts, or a part that does
not exist). New parts go in `head.ts` (faces, hair), `wear.ts` (hats, clothes) or `props.ts`.
