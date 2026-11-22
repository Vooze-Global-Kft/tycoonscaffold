# Store screenshots

One tool makes every store image of both games from their running web previews:
the App Store and Google Play phone screenshots, the Play feature graphic, and a
side-by-side sheet of both games for signing off the "same template" check
(spam research, `docs/design/research/spam.md`, dimension 7).

## Run it

Start the previews (each is the game itself, in a browser). Prefer a production web
export served as static files: it has no development overlays at all.

```bash
GAME=pizza-empire npx expo export -p web --output-dir /tmp/web-pizza-empire
GAME=space-miner  npx expo export -p web --output-dir /tmp/web-space-miner
npx serve /tmp/web-pizza-empire -l 8300 -s   # any static server; -s: single-page fallback
npx serve /tmp/web-space-miner  -l 8301 -s
```

(The preview switches the scenes use, `?preset=` and the rest, are read on any web
build, not only in development: `src/dev/devtools.ts`, `src/ui/haul/dev.ts`. The
export path above was not run on this machine, where builds are not allowed; the
images were made from development servers, `GAME=<id> npx expo start --web --port
<port>`, which work too thanks to the overlay guard below.)

Then ONE command makes every image of both games, into the repository:

```bash
npx tsx scripts/store/shots.ts --game all --write
```

Without `--write` nothing in the repository changes: the images go to
`scripts/store/.cache/out/<game>/` (git-ignored), so a trial run cannot replace the
approved set. Options: `--out <dir>` (write to `<dir>/<game>/` instead),
`--game pizza-empire|space-miner`, `--port N` (another preview port), `--only 1,3`
(scenes, 1-based), `--sizes ios-6.9,play-phone`, `--reuse` (compose again from the
last captures, no preview needed: for template work), `--sheet` (only the
side-by-side sheet). The log first says how many scenes and images the run makes.
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
buyers and an active manifest; the launch shot must have launched; Pizza Empire's
bottleneck shot must show "limits income"), and is taken again up to `tries` times.

## What it writes

```
games/<id>/store/screenshots/ios-6.9/NN-<slug>.png      1320 x 2868  App Store, iPhone 6.9"
games/<id>/store/screenshots/ios-6.5/NN-<slug>.png      1284 x 2778  App Store, iPhone 6.5"
games/<id>/store/screenshots/play-phone/NN-<slug>.png   1080 x 1920  Google Play phone, 9:16
games/<id>/store/screenshots/play-feature-graphic.png   1024 x 500   Google Play feature graphic
games/space-miner/store/screenshots/SIDE-BY-SIDE.png    both icons, both 6.9" sets, both feature graphics
scripts/store/.cache/<game>/<size>/NN-<slug>.png/.json  raw captures and the band each shows (git-ignored)
scripts/store/.cache/out/                               trial runs (git-ignored)
```

Pizza Empire has six shots, Orbit Haulers five.

Every image is an 8-bit RGB PNG without an alpha channel (App Store Connect
refuses alpha; Play asks for 24-bit PNG). The tool checks size and colour type
of each file it writes.

## How it works

- `scenes/<game>.ts`: the data. Per scene: the preview address (`preset=`, `tab=`,
  `sheet=`, `spoke=`, `speed=`: `src/dev/devtools.ts` and `src/ui/haul/dev.ts`),
  the steps to reach the moment (taps, drags, a finger held down, waits, and
  `untilText`: wait for the app's own text, e.g. the freighter's "BACK IN n S"
  to go; `tapText`: a touch on the first text that matches, wherever the layout
  put it), an optional `check` of the page text, the `frame` (the band of the
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
- `templates/warm.ts` (Pizza Empire) and `templates/panel.ts` (Orbit Haulers): the
  two templates. `templates/fonts.ts`: the font files. `png.ts`: PNG decode and
  alpha removal (Node's zlib only).

## The two templates (dimension 7)

They differ in composition, not only in colour, and so do the two sets:

| | Pizza Empire, "warm" | Orbit Haulers, "panel" |
|---|---|---|
| Set | six shots: restaurant, bottleneck, staff, chests, franchise, recipes | five shots: the full field, a drag, the Contract Board, the launch, the Star Map |
| Game picture | framed: the phone screen on a white-edged rounded card with a soft shadow, leaning left and right in turn; a scene that shows a band of its screen gets a wider, shorter card | edge to edge under the readout, square corners, cropped to the band that matters (no empty starfield, no nav row) |
| Caption position | below the picture, on a deep tomato sauce wave (the wave's highest bump at about 81 % of the height: the caption block stays under 20 %) | above the picture, on a hard-edged deep-blue readout panel (15 % of the 6.9" image, 18 % of the Play one); the panel never covers the game |
| Type | Lilita One (the game's rounded display face), centred, sentence case, two lines; a cream sub-line in Inter Bold (5.4:1 on the band) | JetBrains Mono ExtraBold, left-aligned, capitals; headline only, no sub-line |
| Colour | cream gingham, saffron sun, deep tomato #C4262F | deep blue #060A16, cyan #3FD8FF, amber #E07A3F |
| Ornament and counter | none but the card; no set counter | channel counter "CH 01/05" (the only set counter of the two), tick-marked cyan rule |
| Rhythm across the set | the card leans left, right, left...; the sun and the wave's bumps swap sides | rigid: every image on the same grid, like a log, the channel number counting up |
| Feature graphic | centred and symmetric: the name in Lilita One over a big saffron sun, a wide crop of the restaurant scene under it (no phone, no tilt), on gingham; no icon, no tagline | the asteroid field around the station, its edges fading into a deep-blue nebula (#0B1A3A, the game's black space lifted by a screen blend), a thin letter-spaced cyan wordmark in the lower third; no icon, no tagline |

Nothing in either: no device frame, no store badge, no award, rank, price,
"free", "No.1", "best", no call to action, no app icon in the feature graphic
(Play: "do not use prominent branding that is similar to your app icon"). Caption
blocks stay under 20 % of the image height (Play's limit for taglines), measured
from the top of the red wave or to the bottom of the readout panel.

## Scenes

Each caption was checked against the picture the tool made.

### Pizza Empire (warm, cream and tomato)

| # | Caption / sub-line | Address | Shows |
|---|---|---|---|
| 1 | Bake it, serve it, grow it! / Your cooks, waiters and guests at work | `preset=mid` | The restaurant at work: cooks at the stations, waiters carrying pizza, guests at the tables, the production chain and its upgrades below. |
| 2 | Find the slow spot and fix it / Upgrade the stage that limits income | `preset=mid`, tap the "Dining Room" pill; band: top of the screen to the stage's description; check: "limits income" on screen | The busy restaurant with its bottleneck stage open: the Dining Room pill carries the game's "limits income" tag, its row offers the upgrade. The list under one stage is short, so the card shows the screen down to the stage's text (no empty cream; the earlier `preset=early` version had the tutorial hand on). |
| 3 | Collect a staff of twelve / Level up the characters you love | `preset=mid&tab=staff` | The Staff tab: chests and the collection of twelve characters (8/12 found, "can level up" marks). |
| 4 | Open boxes, meet new faces / Boxes come from daily missions | `preset=mid&chest=golden`, two taps | A Golden Oven Chest being opened. Missions reward boxes ("Every 30th mission: Golden Oven Chest"). |
| 5 | From Napoli all the way up / Eight restaurants, one pizza planet | `preset=mid&tab=empire` | The Franchise tab: Nonna's Corner in Napoli, then Roma, Venezia, Paris, New York, Tokyo, The Moon ("1 of 8 open"). |
| 6 | Cook up two dozen recipes / Each one multiplies what you earn | `preset=mid&tab=upgrades` | The Recipes tab: "2 of 24", each recipe a multiplier. |

Feature graphic: scene 1's restaurant, from the "Nonna's Corner" plate to just
above the stage pills.

### Orbit Haulers (panel, cold instrument)

| # | Caption | Address and steps | Shows |
|---|---|---|---|
| 1 | Far rings. Rich ore. Long trips. | `preset=late`; field band | Every ring in use: iron, copper, ice, titanium and platinum rocks, drones in flight, the hold and the counter. Also the feature graphic's picture. |
| 2 | Drone to rock. Ore to hold. | `preset=mid`; finger down on the route chip of slot 1, dragged onto the rock of slot 6, held; field band | A running station: a drone pulled off a busy route onto a rock further out, the drag line and the target ring drawn. (The mid save's rack is empty, every drone is out, so the drone comes off a chip, which the game allows.) |
| 3 | Buyers on the line. They lapse. | `preset=late&sheet=contracts&speed=6`, tap the first manifest ("if met"); band: top of the screen to the board's last line; check: three different buyers and an active manifest | The Contract Board over a late field: three buyers, the manifest just made ACTIVE, what each pays if met, the launches left; the contract strip and the buyer's radio line at the top. (At normal speed the late save's board shows the same buyer twice; `speed=6` lets the board turn over before the picture.) |
| 4 | Swipe up. Freighter away. | `preset=mid`; wait until docked (no "BACK IN n S"), the launch swipe as one move, picture about 100 ms later; check: launched; field band | The freighter climbing off the pad, the hold emptied, "BACK IN 15 S" on the bay. |
| 5 | Jump. Pick the next galaxy. | `preset=late&spoke=starmap`; band: top of the screen to the "JUMP NOW" button | The Star Map with its own header (back, "STAR MAP · NAV · GALAXY 1", Warp Cores in hand, the galaxy plate), the nodes, "JUMP NOW: +24 WARP CORES", kept and reset lists. |

The Shift Log shot of the earlier set was dropped (five shots, a different story
from Pizza Empire's six). No sentence is shared between the two games' captions.

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

To retake on a device: put the device screenshot in
`scripts/store/.cache/<game>/<size>/NN-<slug>.png`, next to the `.json` the tool
wrote for it (set its `vw` to the phone's width in points; the band is in points),
and run with `--reuse --write`; the templates compose it the same way.
