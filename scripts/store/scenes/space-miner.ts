/**
 * Orbit Haulers. The five store screenshots, in listing order (Pizza Empire has six, in another
 * order: the two sets differ in length and story as well as template). Captions in the game's voice
 * (dry, short, radio-like; src/ui/haul/strings.ts and games/space-miner/game.json), at most six
 * words, headline only. Preview switches: src/dev/devtools.ts and src/ui/haul/dev.ts.
 *
 * Touches on the field and the bands the images show are placed with the game's own geometry
 * (src/ui/haul/layout.ts, fieldLayout: pure, the same function the screen and its gestures use), so
 * they follow the layout when it changes and land on the rack, a rock or the launch pad at every
 * phone size. Screens with a top bar of their own (Contract Board, Star Map) keep it: the band
 * starts at the top of the screen and the template puts its readout above the picture, not on it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fieldLayout, type FieldLayout } from '../../../src/ui/haul/layout';
import type { BandSpec, GameScenes, P, View } from '../types';

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

/**
 * The working field: from the outer ring's rocks down to the hold and the counter, above the row
 * of round nav buttons (dim empty slots there read as unfinished). Zoomed in a little (at most
 * 1.08 x, so the hold gauge at the left edge stays whole); the empty starfield above the rings is
 * what gets cropped.
 */
function fieldBand(v: View): BandSpec {
  const L = field(v);
  const top = Math.min(...L.rocks.map((k) => k.y - k.r)) - 30;
  const bottom = Math.min(...L.zones.rail.map((r) => r.y)) - 8;
  return { y0: top, y1: bottom, cx: L.station.x, maxZoom: 1.08, anchor: 'bottom' };
}

/** Distinct buyers on the Contract Board (the line after each "×n.n" rate, below the board's title). */
function buyersDistinct(text: string): string | null {
  const i = text.indexOf('CONTRACT BOARD');
  if (i < 0) return 'no Contract Board on screen';
  const lines = text.slice(i).split('\n').map((l) => l.trim());
  const buyers = lines.filter((_, k) => k > 0 && /^×\d/.test(lines[k - 1]));
  if (buyers.length < 3) return `only ${buyers.length} buyers read`;
  if (new Set(buyers).size !== buyers.length) return `the same buyer twice (${buyers.join(', ')})`;
  if (!/ACTIVE/.test(text.slice(i))) return 'no manifest active';
  return null;
}

const scenes: GameScenes = {
  game: 'space-miner',
  port: 8301,
  titleHas: 'Orbit',
  // Captured at 4/3 of the phone's pixel ratio: the field scenes are shown zoomed in up to 1.08 x,
  // and the feature graphic needs the station larger than a 1:1 crop.
  captureScale: 4 / 3,
  // The feature graphic: the late field around the station, the rings above it, the bay below.
  feature: {
    scene: 1,
    frame: (v) => {
      const L = field(v);
      return { y0: L.station.y - L.radii[2] - 40, y1: L.station.y + 40, cx: L.station.x, anchor: 'center' };
    },
  },
  scenes: [
    {
      slug: 'far-rings',
      query: 'preset=late',
      settle: 10000,
      frame: fieldBand,
      caption: 'Far rings. Rich ore.\nLong trips.',
      shows: 'A late station: every ring claimed, routes to copper, ice, titanium and platinum rocks, drones in flight, the hold and the counter. Cropped from the outer ring\'s rocks to just above the nav row (the empty starfield above the rings and the contract strip are outside the band).',
    },
    {
      slug: 'drag-a-drone',
      query: 'preset=mid',
      settle: 9000,
      // A running station: an idle drone picked up off the rack and dragged onto a rock; the
      // picture is taken with the finger still down, the route line drawn to the rock.
      steps: (v) => {
        const L = field(v);
        const from = rackDrone(L);
        const to = rock(L, 0);
        return [{ down: from }, { move: lerp(from, to, 0.5), steps: 6 }, { move: lerp(from, to, 0.92), steps: 8 }, { wait: 350 }];
      },
      frame: fieldBand,
      caption: 'Drone to rock.\nOre to hold.',
      shows: 'A mid-game station with routes to iron, copper and ice: a drone dragged from the rack onto a rock, the drag line showing the route being set; the hold and the credit counter running.',
    },
    {
      slug: 'contracts',
      query: 'preset=mid&sheet=contracts',
      // Tap the first manifest (its "if met" line): it becomes ACTIVE. The board is drawn from live
      // state; a board with the same buyer twice is taken again.
      steps: () => [{ tapText: /^if met$/ }, { wait: 900 }],
      check: buyersDistinct,
      tries: 4,
      frame: () => ({ y0: 0, y1: { text: /^Scrap Pod every/, edge: 'bottom', pad: 16 }, anchor: 'bottom' }),
      caption: 'Buyers on the line.\nThey lapse.',
      shows: 'The Contract Board, first manifest just tapped active: three different buyers, what each pays if met and the launches left before it lapses; the contract strip at the top of the screen is in the picture.',
    },
    {
      slug: 'hold-full',
      query: 'preset=early',
      settle: 9000,
      // An early station whose Dock Autopilot waits for a full hold: wait until the hold gauge
      // reads full ("76/76", its own line; the contract strip's "71/76 IRON" does not match), then
      // the launch swipe, and the picture about 150 ms after the finger lifts: the freighter is
      // climbing off the pad with the full manifest.
      steps: (v) => {
        const L = field(v);
        const z = L.zones.launch;
        const from: P = [z.x + z.width / 2, z.y + z.height * 0.6];
        return [
          { untilText: /(^|\n)76\/76(\n|$)/, timeout: 45000 },
          { down: from },
          { move: [from[0], from[1] - 50], steps: 2 },
          { move: [from[0], from[1] - 120], steps: 2 },
          { up: true },
          { wait: 120 },
        ];
      },
      frame: fieldBand,
      caption: 'Hold full.\nSwipe. Freighter away.',
      shows: 'An early station at the launch: the hold gauge full (76/76), the launch swipe just made, the freighter leaving the pad with the whole manifest.',
    },
    {
      slug: 'star-map',
      query: 'preset=late&spoke=starmap',
      frame: () => ({ y0: 0, y1: { text: /^JUMP NOW$/, edge: 'bottom', pad: 22 }, anchor: 'top' }),
      caption: 'Jump.\nPick the next galaxy.',
      shows: 'The Star Map with its own header (back button, "STAR MAP · NAV", the Warp Cores in hand, the galaxy plate): the nodes Warp Cores build, and the Jump panel (what is kept, what resets).',
    },
  ],
};

export default scenes;
