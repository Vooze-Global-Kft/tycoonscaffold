/**
 * Orbit Haulers. The six store screenshots, in listing order. Captions in the game's voice (dry,
 * short, radio-like; src/ui/haul/strings.ts and games/space-miner/game.json), at most six words.
 * Preview switches: src/dev/devtools.ts and src/ui/haul/dev.ts.
 *
 * Touches on the field are placed with the game's own geometry (src/ui/haul/layout.ts, fieldLayout:
 * pure, the same function the screen and its gestures use), so they follow the layout when it
 * changes and land on the rack, a rock or the launch pad at every phone size.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fieldLayout, type FieldLayout } from '../../../src/ui/haul/layout';
import type { GameScenes, P, View } from '../types';

const ROOT = path.resolve(__dirname, '../../..');
let cfg: unknown = null;

/** The field geometry for this viewport (web preview: no safe-area insets; no galaxy condition at these presets). */
function field(v: View): FieldLayout {
  cfg ??= JSON.parse(fs.readFileSync(path.join(ROOT, 'games/space-miner/game.json'), 'utf8'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fieldLayout({ width: v.w, height: v.h, insets: { top: 0, bottom: 0 } }, cfg as any, null);
}

const rackDrone = (L: FieldLayout): P => [L.rack.left.x + L.rack.left.width * 0.72, L.rack.left.y + L.rack.left.height * 0.3];
const rock = (L: FieldLayout, slot: number): P => [L.rocks[slot].x, L.rocks[slot].y];
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const scenes: GameScenes = {
  game: 'space-miner',
  port: 8301,
  titleHas: 'Orbit',
  featureScene: 4,
  scenes: [
    {
      slug: 'drag-a-drone',
      query: 'preset=fresh',
      settle: 9000,
      // The first minute: an idle drone picked up off the rack and dragged onto the first rock; the
      // picture is taken with the finger still down, the route line drawn to the rock.
      steps: (v) => {
        const L = field(v);
        const from = rackDrone(L);
        const to = rock(L, 0);
        return [{ down: from }, { move: lerp(from, to, 0.5), steps: 6 }, { move: lerp(from, to, 0.92), steps: 8 }, { wait: 350 }];
      },
      caption: 'Drone to rock.\nOre to hold.',
      sub: 'Drag to set a route',
      shows: 'A new station (first minute): an idle drone dragged from the rack onto the first rock; the drag line shows the route being set.',
    },
    {
      slug: 'clear-the-pad',
      query: 'preset=early',
      settle: 9000,
      // An early station: the freighter cycles (away about 11 s, then docked while the hold fills).
      // Wait until it is docked ("BACK IN n S" gone), then the launch swipe; the picture is taken
      // once the freighter is on its way (the label is back) and has climbed clear of the station.
      steps: (v) => {
        const L = field(v);
        const z = L.zones.launch;
        const from: P = [z.x + z.width / 2, z.y + z.height * 0.6];
        return [
          { untilText: /BACK IN \d+ S/i, timeout: 15000 },
          { untilText: /BACK IN \d+ S/i, absent: true, timeout: 20000 },
          { wait: 200 },
          { down: from },
          { move: [from[0], from[1] - 50], steps: 3 },
          { move: [from[0], from[1] - 120], steps: 3 },
          { up: true },
          { untilText: /BACK IN \d+ S/i, timeout: 8000 },
          { wait: 700 },
        ];
      },
      caption: 'Hold full.\nFreighter away.',
      sub: 'One swipe sells the whole manifest',
      shows: 'An early station right after the freighter left: the counter shows the WARPED manifest receipt (the ores and what they sold for), the hold is empty and the bay counts down to its return.',
    },
    {
      slug: 'contracts',
      query: 'preset=mid&sheet=contracts',
      // Tap the first manifest (its "×2.3" multiplier): it becomes ACTIVE (and the board's "tap a
      // manifest" marker goes).
      steps: () => [{ tapText: /^[×x]\d+(\.\d+)?$/ }, { wait: 900 }],
      caption: 'Buyers on the line',
      sub: 'Contracts pay more. They lapse.',
      shows: 'The Contract Board, first manifest just tapped active: three buyers, the active manifest, what each pays if met and how many launches are left before it lapses.',
    },
    {
      slug: 'far-rings',
      query: 'preset=late',
      settle: 10000,
      caption: 'Far rings. Rich ore.\nLong trips.',
      sub: 'Rocks run dry. New ones drift in.',
      shows: 'A late station: every ring claimed, routes to copper, ice, titanium and platinum rocks, drones in flight.',
    },
    {
      slug: 'shift-log',
      query: 'preset=mid&away=3600',
      settle: 9000,
      place: 'bottom',
      caption: 'Autopilot kept shipping',
      sub: 'Shift log waiting on return',
      shows: 'The Shift Log after an hour away (the store\'s own offline computation): what the Dock Autopilot shipped while the app was closed.',
    },
    {
      slug: 'star-map',
      query: 'preset=late&spoke=starmap',
      caption: 'Jump.\nPick the next galaxy.',
      sub: 'Warp Cores rebuild the Star Map',
      shows: 'The Star Map: Warp Cores from a Jump, the nodes they build, and the Jump panel (what is kept, what resets).',
    },
  ],
};

export default scenes;
