# Store screenshots

One tool makes every store image of both games from their running web previews:
the App Store and Google Play phone screenshots, the Play feature graphic, and a
side-by-side sheet of both games for signing off the "same template" check
(spam research, `docs/design/research/spam.md`, dimension 7).

## Run it

Start the previews (each is the game itself, in a browser):

```bash
GAME=pizza-empire npx expo start --web --port 8300
GAME=space-miner  npx expo start --web --port 8301
```

Then, one command per game, or both:

```bash
npx tsx scripts/store/shots.ts --game pizza-empire     # its 6 scenes x 3 sizes + feature graphic
npx tsx scripts/store/shots.ts --game space-miner
npx tsx scripts/store/shots.ts --game all              # both, then SIDE-BY-SIDE.png
```

Options: `--port N` (another preview port), `--only 1,3` (scenes, 1-based),
`--sizes ios-6.9,play-phone`, `--reuse` (compose again from the last captures,
no preview needed: for template work), `--sheet` (only the side-by-side sheet).
A game takes about 2 to 5 minutes; on a busy machine longer.

Suggested `package.json` script: `"store:shots": "tsx scripts/store/shots.ts"`
(then `npm run store:shots -- --game all`).

Playwright is not a dependency of this project (no new dependencies): the tool
loads the copy installed on the machine (`NODE_PATH`, `/opt/node-tools/node_modules`
or `npm root -g`). Elsewhere: `npm i -g playwright && npx playwright install chromium`.

## What it writes

```
games/<id>/store/screenshots/ios-6.9/NN-<slug>.png      1320 x 2868  App Store, iPhone 6.9"
games/<id>/store/screenshots/ios-6.5/NN-<slug>.png      1284 x 2778  App Store, iPhone 6.5"
games/<id>/store/screenshots/play-phone/NN-<slug>.png   1080 x 1920  Google Play phone, 9:16
games/<id>/store/screenshots/play-feature-graphic.png   1024 x 500   Google Play feature graphic
games/space-miner/store/screenshots/SIDE-BY-SIDE.png    both icons, both 6.9" sets, both feature graphics
scripts/store/.cache/                                   raw captures (git-ignored)
```

Every image is an 8-bit RGB PNG without an alpha channel (App Store Connect
refuses alpha; Play asks for 24-bit PNG). The tool checks size and colour type
of each file it writes.

## How it works

- `scenes/<game>.ts`: the data. Per scene: the preview address (`preset=`, `tab=`,
  `sheet=`, `spoke=`, `away=`: `src/dev/devtools.ts` and `src/ui/haul/dev.ts`),
  the steps to reach the moment (taps, drags, a finger held down, waits, and
  `untilText`: wait for the app's own text, e.g. the freighter's "BACK IN n S"
  to go; `tapText`: a touch on the first text that matches, wherever the layout
  put it), the caption (at most six words) and the sub-line.
  Orbit Haulers' touches are placed with the game's own geometry
  (`src/ui/haul/layout.ts`, `fieldLayout`, the function the screen and its
  gestures use), so they keep landing on the rack, a rock or the launch pad when
  the layout changes or the phone size differs.
- `shots.ts`: opens the preview at the phone's viewport in points (the store
  image's aspect, so nothing is stretched), lets it settle, plays the steps, and
  takes the picture. The game runs at pixel ratio 1 and the ratio goes to 3 only
  for the picture (Chrome DevTools Protocol, `Emulation.setDeviceMetricsOverride`,
  then `Page.captureScreenshot`): Skia on a software GL draws a 3x canvas at about
  one frame a second on a busy machine, which slows the game's clock and its
  animations to a crawl; the canvas is redrawn sharp at 3x before the capture.
  Then it composes the store image: an HTML page from the game's template,
  rendered by the same browser at the exact pixel size.
- `templates/warm.ts` (Pizza Empire) and `templates/panel.ts` (Orbit Haulers): the
  two templates. `templates/fonts.ts`: the font files. `png.ts`: PNG decode and
  alpha removal (Node's zlib only).

## The two templates (dimension 7)

They differ in composition, not only in colour:

| | Pizza Empire, "warm" | Orbit Haulers, "panel" |
|---|---|---|
| Game picture | framed: the whole phone screen, scaled to 76 % width, on a white-edged rounded card with a soft shadow | full-bleed: edge to edge, square corners, 1:1 with the phone |
| Caption position | below the picture, on a tomato-red sauce wave | over the picture, on a hard-edged deep-blue readout panel at the top (the Shift Log scene: bottom, so the log stays readable) |
| Type | Lilita One (the game's rounded display face), centred, sentence case; sub-line Inter Bold | JetBrains Mono ExtraBold, left-aligned, capitals; sub-line JetBrains Mono, `>` prompt |
| Colour | cream gingham, saffron sun, tomato red | deep blue #060A16, cyan #3FD8FF, amber #E07A3F |
| Ornament | none but the card; page dots at the bottom right | channel counter "CH 01/06", tick-marked cyan rule, viewfinder corners |
| Rhythm across the set | the card leans left, right, left...; the sun and the wave's bumps swap sides | rigid: every image on the same grid, like a log, the channel number counting up |
| Feature graphic | icon and name on cream at the left, the restaurant on a leaning card at the right | the asteroid field full-bleed at the right, a dark readout with icon, name and prompt line at the left |

Nothing in either: no device frame, no store badge, no award, rank, price,
"free", "No.1", "best", no call to action. Captions take far less than 20 % of the
image (Play's limit for taglines).

## Scenes

Each caption was checked against the preview (the scene's picture shows it).

### Pizza Empire (warm, cream and tomato)

| # | Caption / sub-line | Address | Shows |
|---|---|---|---|
| 1 | Bake it, serve it, grow it! / Your cooks, waiters and guests at work | `preset=mid` | The restaurant at work: cooks at the stations, waiters carrying pizza, guests at the tables, the production chain and its upgrades below. |
| 2 | Find the slow spot and fix it / More stations, more waiters, more tables | `preset=early` | The first restaurant in its first minutes: Kitchen, Waiters and Dining Room, the Dining Room tagged "limits income"; the game's hint hand points at the fix (hire the Maître d'). The hand is allowed here (a first-minute scene); `preset=late` was tried first and also shows the hand (that save is not yet a "veteran" to the hint script, `nextHint` in `src/engine/meta.ts`), so the bottleneck is shown where the hand belongs. |
| 3 | Collect a staff of twelve / Level up the characters you love | `preset=mid&tab=staff` | The Staff tab: chests and the collection of twelve characters (8/12 found, "can level up" marks). |
| 4 | Open boxes, meet new faces / Boxes come from daily missions | `preset=mid&chest=golden`, two taps | A Golden Oven Chest being opened: three cards turned, two to go. Missions reward boxes ("Every 30th mission: Golden Oven Chest"). |
| 5 | From Napoli all the way up / Eight restaurants, one pizza planet | `preset=mid&tab=empire` | The Franchise tab: Nonna's Corner in Napoli, then Roma, Venezia, Paris, New York, Tokyo, The Moon ("1 of 8 open"). |
| 6 | Cook up two dozen recipes / Each one multiplies what you earn | `preset=mid&tab=upgrades` | The Recipes tab: "2 of 24", each recipe a multiplier. |

The first two carry the listing: the restaurant chain at work.

### Orbit Haulers (panel, cold instrument)

| # | Caption / sub-line | Address and steps | Shows |
|---|---|---|---|
| 1 | Drone to rock. Ore to hold. / Drag to set a route | `preset=fresh`; finger down on the rack's idle drone, dragged onto rock 1, held | The first minute: a drone dragged onto the first rock, the route line drawn, the rock highlighted. The game's own "!" hint over the rack is on (first-minute scene). |
| 2 | Hold full. Freighter away. / One swipe sells the whole manifest | `preset=early`; wait for the freighter to be away, then docked (its "BACK IN n S" label goes), the launch swipe, then wait for the WARPED receipt | Just after the launch: the counter shows the WARPED manifest receipt (the ores and what they sold for), the hold is empty, the bay counts down to the freighter's return. |
| 3 | Buyers on the line / Contracts pay more. They lapse. | `preset=mid&sheet=contracts`, tap the first manifest (its "if met" line) | The Contract Board: three buyers, the manifest just made ACTIVE, what each pays if met, the launches left (the dots). |
| 4 | Far rings. Rich ore. Long trips. / Rocks run dry. New ones drift in. | `preset=late` | Every ring in use: iron, copper, ice, titanium and platinum rocks, drones in flight. Also the feature graphic's picture. |
| 5 | Autopilot kept shipping / Shift log waiting on return | `preset=mid&away=3600` | The Shift Log after an hour away (the store's own offline computation): what the Dock Autopilot shipped. |
| 6 | Jump. Pick the next galaxy. / Warp Cores rebuild the Star Map | `preset=late&spoke=starmap` | The Star Map: nodes bought with Warp Cores, "JUMP NOW: +24 WARP CORES", kept and reset lists. |

No sentence is shared between the two games' captions.

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

To retake on a device: put the device screenshot (at the size above) in
`scripts/store/.cache/<game>/<size>/NN-<slug>.png` and run with `--reuse`; the
templates compose it the same way.
