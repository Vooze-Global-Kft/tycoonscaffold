/**
 * Orbit Haulers. The six store screenshots, in listing order: the first minute (a drone to a rock,
 * the freighter away), then contracts, the far rings, the autopilot's Shift Log and the Star Map
 * (Pizza Empire's six tell another story in another template). Captions in the game's voice
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

/**
 * The Contract Board as rows (strings.ts, "Contract Board"): three different buyers (the line
 * before each "x1.n" rate), the taken one first with its TAKEN tag, and the pod counter's line.
 */
function boardRows(text: string): string | null {
  const i = text.indexOf('CONTRACT BOARD');
  if (i < 0) return 'no Contract Board on screen';
  const lines = text.slice(i).split('\n').map((l) => l.trim());
  const buyers = lines.filter((_, k) => /^[x×]\d/.test(lines[k + 1] ?? ''));
  if (buyers.length < 3) return `only ${buyers.length} buyers read`;
  if (new Set(buyers).size !== buyers.length) return `the same buyer twice (${buyers.join(', ')})`;
  const taken = lines.indexOf('TAKEN');
  if (taken < 0) return 'no contract taken';
  if (lines.findIndex((l, k) => k > 0 && /^[x×]\d/.test(l) && k > taken) < 0) return 'the TAKEN row is not first';
  if (!/SCRAP POD ·/i.test(text.slice(i))) return 'no pod counter under the rows';
  return tutorialLine(text);
}

/** The radio's first tutorial line ("Drone idle on the rack..."): allowed only in the first-minute scene. */
const tutorialLine = (text: string): string | null => (/DRONE IDLE ON THE RACK|SEND IT TO THE ROCK/i.test(text) ? 'the tutorial line is on the radio' : null);

/** Any radio line ("SPEAKER: TEXT") at the top of the field: on the Play size it lies over the outer ring's rocks. */
const radioLine = (text: string): string | null => (/^[A-Z][A-Z .'&-]+: [A-Z0-9]/m.test(text) ? 'a radio line covers the top of the field' : null);

const scenes: GameScenes = {
  game: 'space-miner',
  port: 8302,
  titleHas: 'Orbit',
  // Captured at 4/3 of the phone's pixel ratio: the field scenes are shown zoomed in up to 1.08 x,
  // and the feature graphic needs the station larger than a 1:1 crop.
  captureScale: 4 / 3,
  // The feature graphic: the late field (scene 4) around the station, the rings above it, the bay below.
  feature: {
    scene: 4,
    frame: (v) => {
      const L = field(v);
      return { y0: L.station.y - L.radii[2] - 30, y1: L.station.y + 60, cx: L.station.x, anchor: 'center' };
    },
  },
  scenes: [
    {
      slug: 'drag-a-drone',
      query: 'preset=early',
      settle: 9000,
      // The first minutes: an early station (three rocks claimed, the inner rings, credits in the
      // hundreds). A drone is picked up off the right-hand rock's route chip (slot 1) and dragged
      // to the rock on the left of ring 2 (slot 2); the picture is taken with the finger still
      // down, the drag line drawn to it.
      steps: (v) => {
        const L = field(v);
        const from = chip(L, 1);
        const to = rock(L, 2);
        // The first move goes well past the 10 pt slop in one event: a slow stream of small moves
        // on a busy machine lets the 350 ms long-press fire first (a long press opens the rig sheet).
        return [{ down: from }, { move: lerp(from, to, 0.3), steps: 1 }, { move: lerp(from, to, 0.95), steps: 6 }, { wait: 350 }];
      },
      check: (t) => (/Drones move on the map|Dry in about/i.test(t) ? 'the rig sheet opened (a long press, not a drag)' : null),
      frame: fieldBand,
      caption: 'Drone to rock.\nOre to hold.',
      shows: 'An early station (three rocks on the inner rings, credits in the hundreds): a drone dragged off one route\'s chip onto another rock, the drag line showing the new route; the hold filling and the credit counter. The field band, so the radio line at the top (a tutorial line here) is outside the picture.',
    },
    {
      slug: 'freighter-away',
      query: 'preset=mid',
      settle: 9000,
      // A running station: the freighter cycles (away about 11 s, then docked while the hold fills).
      // Wait until it is docked (no "BACK IN n S"), make the launch swipe, and take the picture
      // right after the finger lifts: the freighter leaving the pad. Whether it launched shows a
      // moment later ("BACK IN n S" / "WARPED"), so the check reads the page 1.5 s after the
      // picture. (A full hold cannot be waited for: the Dock Autopilot launches the moment it fills.)
      steps: (v) => {
        const L = field(v);
        const z = L.zones.launch;
        const from: P = [z.x + z.width / 2, z.y + z.height * 0.6];
        return [
          { untilText: /BACK IN \d+ S/i, absent: true, timeout: 25000 },
          // The game only lets the freighter go with something in the hold: give the drones a
          // moment to unload into a hold that may have just been emptied.
          { wait: 1500 },
          { down: from },
          // One move event for the whole rise: on a busy machine a slow stream of small moves can
          // let the 350 ms long-press timer fire first (a long press on the pad toggles the
          // autopilot's policy instead).
          { move: [from[0], from[1] - 130], steps: 1 },
          { up: true },
          { wait: 100 },
        ];
      },
      checkAfter: 1500,
      check: (t) =>
        !/WARPED|BACK IN \d+ S/i.test(t) ? 'the swipe did not launch the freighter' : /CONTRACT MET/i.test(t) ? 'a "contract met" banner covers the counter' : null,
      frame: fieldBand,
      caption: 'Swipe up.\nFreighter away.',
      shows: 'A mid-game station at the launch: the swipe just made, the freighter leaving the pad with the hold\'s load (the check reads "BACK IN n S" or the WARPED receipt 1.5 s later).',
    },
    {
      slug: 'contracts',
      query: 'preset=late',
      settle: 9000,
      // The radio's first tutorial line ("Drone idle on the rack", which the late preset still
      // plays) closes by itself after 5 s on the map, but holds its time behind a sheet: wait for it
      // to go, then open the Contract Board from the strip ("PICK A CONTRACT") and take the second
      // buyer's row. The board then lists the TAKEN row first, and the strip at the top of the
      // screen shows the taken contract (delivered, launches left, the pace light).
      steps: () => [
        { untilText: /DRONE IDLE ON THE RACK/i, absent: true, timeout: 20000 },
        { tapText: /^pick a contract$/i },
        { wait: 1500 },
        { untilText: /CONTRACT BOARD/i, timeout: 8000 },
        { tapText: /^x\d+(\.\d+)?$/, nth: 1 },
        { wait: 1500 },
        // On a short phone the rows scroll inside the sheet: bring the pod counter up (no-op on a tall one).
        { scrollTo: /^scrap pod ·/i },
      ],
      check: boardRows,
      tries: 4,
      frame: () => ({ y0: 0, y1: { text: /^scrap pod ·/i, edge: 'bottom', pad: 16 }, anchor: 'bottom' }),
      caption: 'Take a contract.\nShip it in time.',
      shows: 'A late station with the Contract Board open, a contract just taken: the TAKEN row first (wanted ore, delivered so far, launches left and the pace), two more buyers as rows ("IN 6 LAUNCHES · NEEDS +n % ORE", the bonus), the pod counter\'s stamp boxes; the contract strip at the top of the screen shows the same contract.',
    },
    {
      slug: 'far-rings',
      query: 'preset=late',
      settle: 10000,
      check: radioLine,
      tries: 5,
      frame: fieldBand,
      caption: 'Far rings. Rich ore.\nLong trips.',
      shows: 'A late station: every ring claimed, routes to copper, ice, titanium and platinum rocks out to the far rings, drones in flight, the hold and the counter. Cropped from the outer ring\'s rocks to just above the nav row.',
    },
    {
      slug: 'shift-log',
      // The app opened on a save 10 minutes old (the store's own offline computation): the Shift
      // Log over the dimmed field. The band is the screen from the top to just above the hold and
      // the counter (a counter cut in half at the bottom edge reads as a mistake).
      query: 'preset=mid&away=600',
      settle: 10000,
      check: (t) => (/SHIFT LOG/i.test(t) && /Boost \+50 % · ad/i.test(t) ? null : 'no Shift Log with its Boost key'),
      frame: (v) => {
        const z = field(v).zones;
        // A band a little shorter than the picture box: zoomed in just enough to fill it (the Shift
        // Log's card keeps its edges), so nothing of the bay shows below.
        return { y0: 0, y1: Math.min(z.hold.y, z.counter.y) - 8, cx: v.w / 2, maxZoom: 1.25, anchor: 'top' };
      },
      caption: 'Off shift.\nStill shipping.',
      shows: 'The Shift Log after ten minutes away (AWAY 10 m): the ore hauled by kind, rocks gone dry, pods, the credits earned, "Collect" and "Boost +50 % · ad"; the Dock Autopilot shipped while the player was away (without it the log says "Nothing shipped").',
    },
    {
      slug: 'star-map',
      query: 'preset=late&spoke=starmap',
      settle: 9000,
      // The Star Map pins its Jump keys in a footer: the whole screen, top bar to footer. On a short
      // phone the spoke is scrolled until the Jump panel's Kept list shows (no-op on a tall one).
      steps: () => [{ scrollTo: /Warp Cores and Star Map/i }],
      check: (t) => (/STAR MAP/.test(t) && /JUMP/.test(t) ? null : 'no Star Map'),
      frame: () => ({ y0: 0, y1: { text: /^(jump now|jump anyway.*)$/i, edge: 'bottom', pad: 16 }, anchor: 'top' }),
      caption: 'Jump galaxies.\nKeep your Warp Cores.',
      shows: 'The Star Map with its header (back button, "STAR MAP · NAV", the Warp Cores in hand, the galaxy plate), the node tree, a node\'s card, and the Jump panel: what a Jump gives, whether it is ready ("NOT READY · 14 OF 20 WARP CORES"), what is kept (Warp Cores and Star Map first) and what resets; the Jump keys in the footer.',
    },
  ],
};

export default scenes;
