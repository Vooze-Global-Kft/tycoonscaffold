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

const chip = (L: FieldLayout, slot: number): P => {
  const c = L.chips.find((x) => x.slot === slot);
  if (!c) throw new Error(`no route chip for slot ${slot}`);
  return [c.x, c.y];
};
const rock = (L: FieldLayout, slot: number): P => [L.rocks[slot].x, L.rocks[slot].y];
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * The working field: from the outer ring's rocks down to the hold, the counter and the freighter,
 * above the row of round nav buttons (dim empty slots there read as unfinished). Zoomed in only as
 * far as keeps the hold gauge with its label (left) and the flare box (right) whole; the empty
 * starfield above the rings is what gets cropped.
 */
function fieldBand(v: View): BandSpec {
  const L = field(v);
  const top = Math.min(...L.rocks.map((k) => k.y - k.r)) - 30;
  const bottom = Math.min(...L.zones.rail.map((r) => r.y)) - 2;
  const left = Math.max(0, L.zones.hold.x - 14);
  const right = Math.min(L.width, L.zones.flare.x + L.zones.flare.width + 4);
  return { y0: top, y1: bottom, cx: (left + right) / 2, maxZoom: L.width / (right - left), anchor: 'bottom' };
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
      return { y0: L.station.y - L.radii[2] - 30, y1: L.station.y + 110, cx: L.station.x, anchor: 'center' };
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
      // A running station (its rack is empty: every drone is out on a route). A drone is picked up
      // off a busy route's chip (slot 1, the right-hand iron rock on ring 2) and dragged out to a rock
      // on ring 3; the picture is taken with the finger still down, the drag line drawn to it.
      steps: (v) => {
        const L = field(v);
        const from = chip(L, 1);
        const to = rock(L, 6);
        return [{ down: from }, { move: lerp(from, to, 0.4), steps: 6 }, { move: lerp(from, to, 0.95), steps: 8 }, { wait: 350 }];
      },
      frame: fieldBand,
      caption: 'Drone to rock.\nOre to hold.',
      shows: 'A mid-game station with routes to iron, copper and ice: a drone dragged off one route\'s chip onto a rock further out, the drag line showing the new route being set; the hold and the credit counter running.',
    },
    {
      slug: 'contracts',
      query: 'preset=late&sheet=contracts&speed=6',
      // Tap the first manifest (its "if met" line): it becomes ACTIVE. The board is drawn from live
      // state; a board with the same buyer twice is taken again.
      steps: () => [{ tapText: /^if met$/ }, { wait: 900 }],
      check: buyersDistinct,
      tries: 4,
      frame: () => ({ y0: 0, y1: { text: /^Scrap Pod every/, edge: 'bottom', pad: 16 }, anchor: 'bottom' }),
      caption: 'Buyers on the line.\nThey lapse.',
      shows: 'A late station (every ring worked) with the Contract Board open, first manifest just tapped active: three different buyers, what each pays if met and the launches left before it lapses; the contract strip at the top of the screen is in the picture.',
    },
    {
      slug: 'freighter-away',
      query: 'preset=mid',
      settle: 9000,
      // A running station: the freighter cycles (away about 11 s, then docked while the hold fills).
      // Wait until it is docked (no "BACK IN n S"), make the launch swipe, and take the picture
      // right after the finger lifts: the freighter leaving the pad, the WARPED receipt coming up.
      // A swipe that did not launch (no "WARPED" / "BACK IN" yet) is taken again. (A full hold
      // cannot be waited for: the Dock Autopilot launches the moment it fills.)
      steps: (v) => {
        const L = field(v);
        const z = L.zones.launch;
        const from: P = [z.x + z.width / 2, z.y + z.height * 0.6];
        return [
          { untilText: /BACK IN \d+ S/i, absent: true, timeout: 25000 },
          { wait: 300 },
          { down: from },
          // One move event for the whole rise: on a busy machine a slow stream of small moves can
          // let the 350 ms long-press timer fire first (a long press on the pad toggles the
          // autopilot's policy instead).
          { move: [from[0], from[1] - 130], steps: 1 },
          { up: true },
          { wait: 100 },
        ];
      },
      check: (t) => (/WARPED|BACK IN \d+ S/i.test(t) ? null : 'the swipe did not launch the freighter'),
      frame: fieldBand,
      caption: 'Swipe up.\nFreighter away.',
      shows: 'A mid-game station at the launch: the swipe just made, the freighter leaving the pad with the hold\'s manifest, the receipt coming up on the counter.',
    },
    {
      slug: 'star-map',
      query: 'preset=late&spoke=starmap',
      frame: () => ({ y0: 0, y1: { text: /^jump now$/i, edge: 'bottom', pad: 22 }, anchor: 'top' }),
      caption: 'Jump.\nPick the next galaxy.',
      shows: 'The Star Map with its own header (back button, "STAR MAP · NAV", the Warp Cores in hand, the galaxy plate): the nodes Warp Cores build, and the Jump panel (what is kept, what resets).',
    },
  ],
};

export default scenes;
