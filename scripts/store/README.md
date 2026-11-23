# Store screenshots

One tool makes every store image of the three games from their running web previews:
the App Store and Google Play phone screenshots, the Play feature graphic, and a
side-by-side sheet of the games for signing off the "same template" check
(spam research, `docs/design/research/spam.md`, dimension 7).

## Run it

Start the previews (each is the game itself, in a browser). Prefer a production web
export served as static files: it has no development overlays at all.

```bash
GAME=pizza-empire npx expo export -p web --output-dir /tmp/web-pizza-empire
GAME=space-miner  npx expo export -p web --output-dir /tmp/web-space-miner
npx serve /tmp/web-pizza-empire -l 8300 -s   # any static server; -s: single-page fallback
npx serve /tmp/web-space-miner  -l 8302 -s
```

The scenes' default ports: Pizza Empire 8300, Orbit Haulers 8302, Lantern Row 8302
(`--port N` for another one; the tool checks the page title, so the wrong game on a
port stops the run). Lantern Row's images of 2026-11-23 were made from the shared
development server of the build, `GAME=night-market npx expo start --web --port 8302`.

(The preview switches the scenes use, `?preset=` and the rest, are read on any web
build, not only in development: `src/dev/devtools.ts`, `src/ui/haul/dev.ts`. The
export path above was not run on this machine, where builds are not allowed; the
images were made from development servers, `GAME=<id> npx expo start --web --port
<port>`, which work too thanks to the overlay guard below.)

Then one command per game makes all of its images, into the repository:

```bash
npx tsx scripts/store/shots.ts --game pizza-empire --write   # 18 shots + feature graphic + the sheet
npx tsx scripts/store/shots.ts --game space-miner --write    # 18 shots + feature graphic + the sheet
npx tsx scripts/store/shots.ts --game night-market --write   # 18 shots + feature graphic + the sheet
npx tsx scripts/store/shots.ts --sheet --write               # only SIDE-BY-SIDE.png, from the images written
```

(`--game all --write` does all three. Careful: `--sheet` with `--game` still captures
that game first; only `--sheet` alone makes just the sheet.)

Without `--write` nothing in the repository changes: the images go to
`scripts/store/.cache/out/<game>/` (git-ignored), so a trial run cannot replace the
approved set. Options: `--out <dir>` (write to `<dir>/<game>/` instead),
`--game pizza-empire|space-miner|night-market|all`, `--port N` (another preview port), `--only 1,3`
(scenes, 1-based), `--sizes ios-6.9,play-phone`, `--reuse` (compose again from the
last captures, no preview needed: for template work), `--sheet` (only the
side-by-side sheet; without `--game`). The log first says how many scenes and images the run makes.
A full run of both games takes about 10 to 15 minutes on a busy machine.

A full run of a game (no `--only`) with `--write` also removes images of scenes
that are no longer in its list (renamed, reordered or dropped).

Suggested `package.json` script: `"store:shots": "tsx scripts/store/shots.ts"`
(then `npm run store:shots -- --game all --write`).

Playwright is not a dependency of this project (no new dependencies): the tool
loads the copy installed on the machine (`NODE_PATH`, `/opt/node-tools/node_modules`
or `npm root -g`). Elsewhere: `npm i -g playwright && npx playwright install chromium`.

### Development overlays

Before every picture the tool hides everything on the page that the app did not
draw (a dev-server tools button, LogBox, an error toast: anything outside the app
that lacks react-native-web's generated classes), names it in the log ("hid
non-app overlay: ..."), then hit-tests a 20 x 40 grid of points over the screen and
fails the scene if any point still lands on such an element. Errors thrown by the
page and red screens fail the scene too. A failed scene is listed at the end and the
run exits with status 1: look at those images before committing.

### Live state and retakes

The pictures come from a game that is running: live numbers (cash, rates, timers,
buyers, drone positions) differ a little on every run, and the tool cannot make a
run bit-for-bit repeatable (freezing the game's clock needs a switch in the game;
Playwright's fake clock was tried and made each scene take minutes while still
varying). What must be true of a picture is checked instead: a scene can carry a
`check` on the page text (Orbit Haulers' Contract Board must show three different
buyers with a TAKEN row first; the launch shot must have launched, read 1.5 s after
the picture with `checkAfter`; the far-rings shot must have no radio line over the
top of the field; Pizza Empire's bottleneck shot must show "limits income"), and is
taken again up to `tries` times.

Two moments are faster than the usual capture (three frames drawn at the store's
pixel ratio, which take seconds on a busy machine): Orbit Haulers' freighter climbs
for 2.5 s, and Pizza Empire's tutorial hand comes back 600 ms after a touch. Those
scenes set `shotFrames: 1` (one frame, still sharp). Even so the freighter's place
varies from run to run (on the pad, mid-field, or already gone): look at shot 2 of
every size after a run and take it again (`--only 2 --sizes <size>`) until the
freighter is over the field. The 6.9" image of 2026-11-22 was picked from five takes.

## What it writes

```
games/<id>/store/screenshots/ios-6.9/NN-<slug>.png      1320 x 2868  App Store, iPhone 6.9"
games/<id>/store/screenshots/ios-6.5/NN-<slug>.png      1284 x 2778  App Store, iPhone 6.5"
games/<id>/store/screenshots/play-phone/NN-<slug>.png   1080 x 1920  Google Play phone, 9:16
games/<id>/store/screenshots/play-feature-graphic.png   1024 x 500   Google Play feature graphic
games/night-market/store/screenshots/SIDE-BY-SIDE.png   every game's icon, 6.9" set and feature graphic, one row each
games/space-miner/store/screenshots/SIDE-BY-SIDE.png    the two-game sheet of 2026-11-22 (kept as signed off; no longer rewritten)
scripts/store/.cache/<game>/<size>/NN-<slug>.png/.json  raw captures and the band each shows (git-ignored)
scripts/store/.cache/out/                               trial runs (git-ignored)
```

Each game has six shots (in a different story order and template).

Every image is an 8-bit RGB PNG without an alpha channel (App Store Connect
refuses alpha; Play asks for 24-bit PNG). The tool checks size and colour type
of each file it writes.

## How it works

- `scenes/<game>.ts`: the data. Per scene: the preview address (`preset=`, `tab=`,
  `sheet=`, `spoke=`, `speed=`: `src/dev/devtools.ts` and `src/ui/haul/dev.ts`),
  the steps to reach the moment (taps, drags, a finger held down, waits, and
  `untilText`: wait for the app's own text, e.g. the freighter's "BACK IN n S"
  to go; `tapText`: a touch on the first text that matches, wherever the layout
  put it, or the `nth` match), an optional `check` of the page text (`checkAfter`:
  read that many ms after the picture), `shotFrames` (frames drawn at the store's
  pixel ratio before the picture, default 3), the `frame` (the band of the
  screen the image shows, below), the caption (at most six words) and, for Pizza
  Empire, the sub-line. Each game also names its feature graphic's scene and band.
  Orbit Haulers' touches and bands are placed with the game's own geometry
  (`src/ui/haul/layout.ts`, `fieldLayout`, the function the screen and its
  gestures use), so they keep landing on a chip, a rock or the launch pad when
  the layout changes or the phone size differs.
- Bands (`templates/frame.ts`): a scene says which part of the phone screen
  matters, from `y0` to `y1` in points, either numbers or the top or bottom edge
  of a text found on the page at capture time. The template fits the band into
  its picture box with one scale (never stretched): up to `maxZoom` times the
  full-width scale, cropping the sides around `cx`; a band too tall for the box
  is shown whole. Orbit Haulers' field shots crop the empty starfield above the
  rings and the round nav row (zoom just enough to keep the hold gauge and the
  flare box whole); its Contract Board and Star Map shots start at the top of the
  screen, so the game's own top bar stays in the picture. The resolved band is
  stored next to the raw capture, so `--reuse` composes the same picture.
- `shots.ts`: opens the preview at the phone's viewport in points (the store
  image's aspect), lets it settle, plays the steps, hides and checks for
  development overlays, and takes the picture. The game runs at pixel ratio 1 and
  the ratio goes up only for the picture (Chrome DevTools Protocol,
  `Emulation.setDeviceMetricsOverride`, then `Page.captureScreenshot`): Skia on a
  software GL draws a 3x canvas at about one frame a second on a busy machine,
  which slows the game's clock and its animations to a crawl; the canvas is
  redrawn sharp before the capture. Orbit Haulers is captured at 4x (its field
  shots are zoomed in a little and its feature graphic more), Pizza Empire at 3x.
  Then it composes the store image: an HTML page from the game's template,
  rendered by the same browser at the exact pixel size.
- `templates/warm.ts` (Pizza Empire), `templates/panel.ts` (Orbit Haulers) and
  `templates/tag.ts` (Lantern Row): the three templates. `templates/fonts.ts`: the font files. `png.ts`: PNG decode and
  alpha removal (Node's zlib only).

## The templates (dimension 7)

They differ in composition, not only in colour, and so do the sets (Lantern Row's
"paper tag" is described after the table of the first two):

| | Pizza Empire, "warm" | Orbit Haulers, "panel" |
|---|---|---|
| Set | six shots: restaurant, bottleneck, staff, chests, franchise, recipes | six shots: a drag (the first minutes), the launch, the Contract Board, the far rings, the Shift Log, the Star Map |
| Game picture | framed: the phone screen on a white-edged rounded card with a soft shadow, leaning left and right in turn; a scene that shows a band of its screen gets a wider, shorter card | edge to edge under the readout, square corners, cropped to the band that matters (no empty starfield, no nav row) |
| Caption position | below the picture, on a deep tomato sauce wave (the wave's highest bump at about 82 % of the height: the caption block is at most 18 % of the image, measured) | above the picture, on a hard-edged deep-blue readout panel (15 % of the 6.9" image, 18 % of the Play one); the panel never covers the game |
| Type | Lilita One (the game's rounded display face), centred, sentence case, two lines; a cream sub-line in Inter Bold (5.4:1 on the band) | JetBrains Mono ExtraBold, left-aligned, capitals; headline only, no sub-line |
| Colour | cream gingham, saffron sun, deep tomato #C4262F | deep blue #060A16, cyan #3FD8FF, amber #E07A3F |
| Ornament and counter | none but the card; no set counter | channel counter "CH 01/06" (the only set counter of the two), tick-marked cyan rule |
| Rhythm across the set | the card leans left, right, left...; the sun and the wave's bumps swap sides | rigid: every image on the same grid, like a log, the channel number counting up |
| Feature graphic | centred and symmetric: the name in Lilita One over a big saffron sun, a wide crop of the restaurant scene under it (no phone, no tilt), on gingham; no icon, no tagline | the asteroid field around the station, its edges fading into a deep-blue nebula (#0B1A3A, the game's black space lifted by a screen blend), a thin letter-spaced cyan wordmark in the lower third; no icon, no tagline |

### Lantern Row, "paper tag" (`templates/tag.ts`)

| | Lantern Row, "paper tag" |
|---|---|
| Set | six shots, board first: a merge under the fox's waiting ticket, that ticket stamped and folded into a lantern, the paper dragon's gold ticket, the Ladder Book, the Lantern Gate, the Autumn Moon board |
| Game picture | from the top edge of the image (no card, no frame, no tilt, no band above it); its foot fades softly into a strip of dusk sky (at least 15.5 % of the iPhone images, 19 % of the Play one; more when a spoke's band ends higher, so the picture never shows past it). Shots 1 to 3 are close looks (up to 1.6x: the ticket, its price and the held good, or the four counters with the dragon); shot 6 is the whole screen with its bottom row (Book, Lanterns, Season, Shop), drawn a little narrower than the image with sky at its sides |
| Caption position | below the game, on a rice-paper tag about two thirds of the width, hanging off-centre from a wire of paper lanterns by a brass string, tilted 3 degrees; left of centre on odd shots, right on even ones; never over a good, a ticket or the purse |
| Type | the game's own paper-cut letters (the art kit's glyph table, `src/ui/merge/art/letters.ts`, drawn as SVG strips with a cut rim and a shadow, each letter tilted a little): capitals in indigo ink on paper, centred on the tag, two to four short lines; no font file, no sub-line |
| Colour | the game's palette lantern-night: indigo #1C2140 to dusk #3A3466, lantern amber #F2A541, rice paper #DCE3EA, brass #C9A45C; red only as the lanterns' tassels |
| Ornament and counter | the lantern wire (four or five lanterns with soft glows); no counter, no rule, no band |
| Rhythm across the set | the tag swings left, right, left... |
| Feature graphic | asymmetric: "LANTERN ROW" in large paper-cut letters in lantern-flame colour with brass rims, on the left on a dusk warmed to amber by the glow of a wire of lanterns; on the right the street at a Parade from below the stall fronts (the counters, the dragon's gold ticket, the board's top rows) fading into the sky on its left edge; no icon, no tagline |

Nothing in any of them: no device frame, no store badge, no award, rank, price,
"free", "No.1", "best", no call to action, no app icon in the feature graphic
(Play: "do not use prominent branding that is similar to your app icon"). Caption
blocks stay under 20 % of the image height (Play's limit for taglines), measured
from the top of the red wave, to the bottom of the readout panel, or from the
lantern wire.

## Scenes

Each caption was checked against the picture the tool made.

### Pizza Empire (warm, cream and tomato)

| # | Caption / sub-line | Address | Shows |
|---|---|---|---|
| 1 | Bake it, serve it, grow it! / Your cooks, waiters and guests at work | `preset=mid`; two touches on the "BUY" label (it does nothing), one frame | The restaurant at work: cooks at the stations, waiters carrying pizza, guests at the tables, the production chain and its upgrades below. The game's tutorial hand (which keeps pointing at the missions clipboard on a preset save: `nextHint` in `src/engine/meta.ts` counts it as a new player) hides for 600 ms after a touch, so the picture has no hand. |
| 2 | Find the slow spot and fix it / Upgrade the stage that limits income | `preset=mid`, tap the "Dining Room" pill, then the "BUY" label (no hand), one frame; band: top of the screen to the stage's description; check: "limits income" on screen | The busy restaurant with its bottleneck stage open: the Dining Room pill carries the game's "limits income" tag, its row offers the upgrade. The list under one stage is short, so the card shows the screen down to the stage's text (no empty cream; the earlier `preset=early` version had the tutorial hand on). |
| 3 | Collect a staff of twelve / Level up the characters you love | `preset=mid&tab=staff` | The Staff tab: chests and the collection of twelve characters (8/12 found, "can level up" marks). |
| 4 | Open boxes, meet new faces / Boxes come from daily missions | `preset=mid&chest=golden`, two taps | A Golden Oven Chest being opened. Missions reward boxes ("Every 30th mission: Golden Oven Chest"). What the chest holds varies by run; on the 2026-11-22 Play image two cash cards ("+$229.95M", "+$189.84M") show their amounts whole (the game now sizes that label by hand). |
| 5 | From Napoli to the world / Open restaurants from Roma to Tokyo | `preset=late&tab=empire`; band: top of the screen to below Tokyo's row; check: Canal Side, Bistro Pepe and Tokyo on screen | The Franchise tab of a late save: Nonna's Corner (Napoli), Trattoria Roma and Canal Side (Venezia, on screen) open and earning, Bistro Pepe in Paris next, New York and Tokyo after it ("3 of 8 open"). The picture stops at Tokyo: the two venues after it (The Moon, Deep Space) are not shown or named, so the listing does not reach into space next to the same developer's space game. On the Play size the card ends at Bistro Pepe (the screen is shorter). |
| 6 | Cook up two dozen recipes / Each one multiplies what you earn | `preset=mid&tab=upgrades` | The Recipes tab: "2 of 24", each recipe a multiplier. |

Feature graphic: scene 1's restaurant, from the "Nonna's Corner" plate to just
above the stage pills.

### Orbit Haulers (panel, cold instrument)

The set's story: what the player does in the first minutes (a drone to a rock, the
freighter away), then contracts, the far rings, the autopilot's Shift Log and the
Star Map. Words in the pictures are the game's own (`src/ui/haul/strings.ts`). The
radio's first tutorial line ("Drone idle on the rack. Send it to the rock.") still
plays on the mid and late presets: the field shots leave the radio slot out of the
band, and the Contract Board and far-rings scenes wait for it to close.

| # | Caption | Address and steps | Shows |
|---|---|---|---|
| 1 | Drone to rock. Ore to hold. | `preset=early`; finger down on the route chip of slot 1, dragged onto the rock of slot 2 (first move past the slop in one event), held; check: the rig sheet did not open; field band | The first minutes: an early station (three rocks on the inner rings, ₵490, empty claim slots with their prices), a drone pulled off one route onto another rock, the drag line and its gain ("+₵4.14/s · FREIGHTER LIMIT"). |
| 2 | Swipe up. Freighter away. | `preset=mid`; wait until docked (no "BACK IN n S") and 1.5 s more, the launch swipe as one move, picture after one frame (`shotFrames: 1`); check 1.5 s later: launched ("BACK IN n S" or WARPED), no "CONTRACT MET" banner; field band | The freighter climbing off the pad over the field, "BACK IN 15 S" on the bay. The freighter's height varies by run (see "Live state and retakes"). |
| 3 | Take a contract. Ship it in time. | `preset=late`; wait for the tutorial line to close, tap "PICK A CONTRACT" on the strip, then the second row's rate; band: top of the screen to the pod counter; check: three different buyers, TAKEN row first, pod counter, no tutorial line | The Contract Board as rows: the TAKEN row first (Halden Yards, "0 / 17.6M COPPER", "6 LAUNCHES LEFT · NEEDS +34 % COPPER", "+₵44.1M X2 SHIFT"), two more buyers ("IN 6 LAUNCHES · NEEDS +n % ORE"), the pod counter's stamp boxes ("SCRAP POD · 4 MORE CONTRACTS"); at the top the contract strip with the same contract (delivered, launches left, the pace light) and a buyer's radio call. On the Play size the sheet shows the TAKEN row and the next one (the rest is below the sheet's fold). |
| 4 | Far rings. Rich ore. Long trips. | `preset=late`; wait until no radio line is up; check: none; field band | Every ring in use: copper, iron, ice, titanium and platinum rocks out to ring 5, drones in flight, the hold and ₵41.07M. Also the feature graphic's picture. |
| 5 | Off shift. Still shipping. | `preset=mid&away=600` (the store's own offline computation for a save ten minutes old); band: top of the screen to just above the hold and the counter, zoomed up to 1.25x; check: "SHIFT LOG" and "Boost +50 % · ad" | The Shift Log ("SHIFT LOG · TAMSIN STATION": AWAY 10 m, iron, copper, ice hauled, ROCKS DRY 2, PODS 0, CREDITS ₵3.77M, "Collect", "Boost +50 % · ad +₵1.88M") over the dimmed field. The mid save has the Dock Autopilot (without it the log says "Nothing shipped"). |
| 6 | Jump galaxies. Keep your Warp Cores. | `preset=late&spoke=starmap`; the Kept list scrolled into view (only moves on the Play size); band: top of the screen to the Jump keys in the footer | The Star Map: header (back, "STAR MAP · NAV · GALAXY 1", Warp Cores in hand, the galaxy plate), the node tree and a node's card, the Jump panel ("NOT READY · 14 OF 20 WARP CORES", "+14 WARP CORES", Kept: "Warp Cores and Star Map" first, Reset), and the footer's "NEXT GALAXY" and "JUMP ANYWAY: +14 CORES". |

The feature graphic prints only the name, no subtitle (the listing's subtitle,
"Space mining by drone routes", is in `games/space-miner/game.json`). No sentence is
shared between the two games' captions.

### Lantern Row (paper tag, lantern-night)

Captions in the lantern-calm voice (spec 7.3), at most 40 characters; the scene
list and its reasons: `scenes/night-market.ts`. Touches are placed with the game's
own geometry (`src/ui/merge/layout.ts` mergeLayout, `play/geometry.ts` cellCentre).
No owl in shots 1 and 2: they are staged in a new game's first seconds, before the
Tea stall (whose minder is an owl) opens.

| # | Caption | Address and steps | Shows |
|---|---|---|---|
| 1 | Two of a kind make one finer snack | `preset=fresh`; a finger down on the fourth opening skewer, moved onto the third and held; band: just above the customers' heads to the fourth board row, up to 1.6x, centred | The first seconds: the fox's paper ticket (a Twin Skewer line, the printed price 12), the gear rail, the six opening Pepper Skewers, one held mid-drag above its outlined twin, the matches glowing. |
| 2 | A full ticket folds into a paper lantern | `preset=fresh&fxSlow=20` (beats twenty times slower); two skewers merged, the Twin Skewer dragged onto the fox's ticket, the picture 25 s later (one frame; `NIGHT_FOLD_WAIT=<ms>` overrides it for a retake); the same close band as shot 1 | The fox's ticket paid: the lit paper lantern rising from its counter towards the purse, the hedgehog's ticket (Glazed Skewer, 29) beside it. The beat's phase varies with the machine's load (the fold, the lantern rising, or already at the purse): look at shot 2 of every size and retake with `--only 2 --sizes <size>` (and `NIGHT_FOLD_WAIT`) until the lit lantern is in view. |
| 3 | A paper dragon brings a gold ticket | `preset=late` (the bot's first season, one Festival line left, a Parade out); pageCheck: a gold ticket at a counter; band: the stall fronts to the second board row, as wide as the four counters (up to 1.45x) | Four counters, one held by the paper dragon with its gold ticket of three lines; minders at the stall fronts; the board's top rows. Also the feature graphic's picture. |
| 4 | Each new snack stamps the Ladder Book | `preset=mid&spoke=book`; check: at most one "?" rung (retaken up to four times) | The Ladder Book: six ladders as tabs with their counts, the Grill ladder's stamped rungs with names and ticket values. |
| 5 | Twenty lanterns, each lit by a feat | `preset=mid&spoke=lanterns`; band to just above the "Lit" heading (the picture ends there) | The Lantern Gate: the arch of twenty hooks (three or four lit, by run), the next three feats with progress. |
| 6 | Autumn sets a moon gate in the board | `preset=late&festival=filled&ceremony=1`, then (a `goto` step, same tab, the saved game) `festival=filled&ceremony=1`, then the saved game with no switch; check: "Autumn Moon" on screen | The third season, Autumn Moon, reached by closing two seasons with the game's own close: the moon gate's stone cells in the board, new tickets at four counters; the whole screen, bottom row included. |

The `goto` step (types.ts) opens another address of the same preview in the same tab,
so a state reached across page loads (a season closed, saved, a second one closed on
the next load) can be pictured. Nothing is drawn by hand.

## Sizes and where they come from

Read on 2026-11-22:

- Apple, App Store Connect Help, "Screenshot specifications":
  https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
  - iPhone with Dynamic Island, large display (6.9"): 1260 x 2736, 1290 x 2796 or
    1320 x 2868 portrait. We make 1320 x 2868.
  - iPhone with Face ID, large display (6.5"): 1284 x 2778 or 1242 x 2688;
    "Required if app runs on iPhone and screenshots for iPhone with Dynamic Island
    (large display) aren't provided". We make 1284 x 2778 anyway: it is cheap and
    avoids scaling.
  - Smaller iPhones are scaled from these by App Store Connect.
  - .png or .jpg, no alpha, 1 to 10 per size.
  - New on that page: "iPhone Duo" (outer 1398 x 2034, inner 2007 x 2853):
    "Starting in April 2027, screenshots will be required for any app using the
    iOS 27.1 SDK or later." Not made yet: add a size here (and a viewport that
    matches it) before the first build on that SDK.
- Google Play Console Help, "Add preview assets to showcase your app":
  https://support.google.com/googleplay/android-developer/answer/9866151
  - Phone screenshots: 2 to 8, PNG or JPEG (24-bit, no alpha), up to 8 MB, each
    side 320 to 3840 px, long side at most 2.3 x the short; for the large format,
    at least four at 9:16 portrait, at least 1080 x 1920. We make six at 1080 x 1920.
  - Feature graphic: 1024 x 500, JPEG or 24-bit PNG.
  - Content rules: taglines at most 20 % of the image, no store badges, no
    rankings or awards ("Best", "#1", "Top"), no prices or "Free", no calls to
    action, the real in-app experience.

Tablets: `app.config.ts` sets `ios.supportsTablet: false` (the iPad set is not
needed) and gives Android no tablet setting; Play's tablet screenshots are
optional, so no tablet sets are made. If either app is opened to tablets, add the
sizes here.

## Fonts

All under the SIL Open Font License 1.1, which allows use in images:

- Lilita One: `games/pizza-empire/assets/fonts/LilitaOne.ttf` (licence:
  `LilitaOne-LICENSE.txt` beside it). Pizza Empire's own display face.
- Inter (SemiBold, Bold): `/usr/share/fonts/opentype/inter/` (Debian package
  `fonts-inter`). Pizza Empire's sub-lines and the side-by-side sheet.
- Lantern Row uses no font file in its images: its captions and wordmark are the art
  kit's paper-cut letters (`src/ui/merge/art/letters.ts`, read by `templates/tag.ts`).
- JetBrains Mono (Regular, Medium, ExtraBold):
  `/usr/share/fonts/truetype/jetbrains-mono/` (Debian package
  `fonts-jetbrains-mono`). Orbit Haulers' captions.

The tool stops if a file is missing. On another machine install the two Debian
packages (or point `templates/fonts.ts` at the same files).

## Retake on a real device before a release

The captions are set by the tool and are the same everywhere. The game pictures
are not: the web preview draws the game's own text with this machine's fonts.
What would differ on a phone:

- Pizza Empire: everything except the header numbers and titles in Lilita One
  (bundled with the app, so the same): the station names and figures in the list
  ("Wood-Fired Oven", "$6.25K / 2s", "Buy x1 $7.95M"), the stage pills (Kitchen,
  Waiters, Dining Room, "limits income"), the tab bar labels, the card names and
  rarity labels on the Staff tab, "Golden Oven Chest / 6 items" and "Skip",
  the venue list on the Franchise tab and the recipe list. The app sets no font
  for these, so the browser's stack resolves to Inter or Liberation Sans here;
  an iPhone uses San Francisco and an Android phone Roboto (slightly different
  widths: a long name can wrap or truncate differently).
- Orbit Haulers: every monospaced text (the counter "₵87.00M", hold "1.63M/1.89M",
  rock tags "↑10/10", ring labels, the galaxy plate, the Contract Board figures,
  the Shift Log table, the Star Map panels, "BACK IN 11 S", "AUTO · CONTRACT").
  The app asks for Menlo on iOS and `monospace` (Droid Sans Mono) on Android; the
  preview here draws DejaVu Sans Mono (Menlo is derived from it, so iPhone shots
  should be very close; check the "₵" credit sign, which Menlo may draw from a
  fallback font). The few sans texts ("CONTRACT BOARD", "Tap a manifest...",
  "Collect", "Double it · ad", "Scrap Pod every 4 contracts met") are Inter or
  Liberation Sans here, San Francisco / Roboto on phones.
- Both: the web preview has no status bar and no home indicator inset; a phone
  screenshot has them (the game moves its bottom bar up by the inset). Apple and
  Google accept either; if the release shots are retaken on a device, clean the
  status bar (full battery, no notification icons, a neutral time).
- Live numbers (cash, rates, timers, the station's name in Orbit Haulers) come
  from the presets and differ a little on every run; that is expected.
- Before a release, on a device: Orbit Haulers shot 2 (the freighter mid-climb,
  timing-dependent here), shot 3 on the Play size (a taller phone shows all three
  rows and the pod counter), and shot 6 with a Jump that is ready ("JUMP NOW")
  if the release wants the Jump itself in the picture; Pizza Empire shot 4 (what
  the chest holds is random: check any cash amount is whole on the narrowest
  phone) and shot 5 on the Play size (shorter screen: the card ends at Paris).

To retake on a device: put the device screenshot in
`scripts/store/.cache/<game>/<size>/NN-<slug>.png`, next to the `.json` the tool
wrote for it (set its `vw` to the phone's width in points; the band is in points),
and run with `--reuse --write`; the templates compose it the same way.
