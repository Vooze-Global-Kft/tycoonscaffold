/**
 * owner1 play 1 (the lead's ruling: A PLAYER ALWAYS SEES HIMSELF): every roofed place of the game's map is
 * drawn see-through while the boss (or a crew member) stands where its roof as drawn covers him. The roofs
 * come from the map and the manifest's own bounds (./actors.ts roofTable); the frame loop asks `underRoof`
 * each frame and eases the roof's ink with `roofInk`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SalvageSchema } from '../../../config/schema.salvage';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));

const A = await import('./actors');
const { yardLayout } = await import('./yard');
const { blocked } = await import('./collide');
const GAME = SalvageSchema.parse(JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8')).salvage);
const Y = yardLayout(GAME);

/** A resolver giving every (id, frame, heading) its own cell on sheet B (the world's sorted sheet). */
function testRes(): import('./actors').Resolver {
  const m = new Map<string, number>();
  return (id, frame = 0, heading = 0) => {
    const k = `${id}#${frame}#${heading}`;
    if (!m.has(k)) m.set(k, A.packCell(1, m.size, false));
    return m.get(k)!;
  };
}
const res = testRes();
const statics = A.presortItems(A.staticItems(GAME, res));
const RF = A.roofTable(GAME, statics, res, Y.tilt);
const PB = A.personBox();
const nRoofs = RF.length / A.ROOF;
const roofOfPlace = (place: string) => {
  const p = GAME.map.points[place];
  for (let r = 0; r < nRoofs; r++) {
    const o = RF[r * A.ROOF + 5] * A.ITEM;
    if (statics[o + 3] === p[0] && statics[o + 4] === p[1]) return r;
  }
  return -1;
};

/** The share of the boss's drawn box at (x, y) that roof r's drawn box covers, when the roof is drawn after him (else 0). */
function coveredShare(r: number, x: number, y: number): number {
  const o = r * A.ROOF;
  if (Math.floor(RF[o + 4] / A.DEPTH_BAND) <= Math.floor((y + 0.25) / A.DEPTH_BAND)) return 0;
  const w = Math.min(x + PB[1], RF[o + 1]) - Math.max(x + PB[0], RF[o]);
  const h = Math.min(y * Y.tilt + PB[3], RF[o + 3]) - Math.max(y * Y.tilt + PB[2], RF[o + 2]);
  return w > 0 && h > 0 ? (w * h) / ((PB[1] - PB[0]) * (PB[3] - PB[2])) : 0;
}

describe('owner1 play 1: a player always sees himself', () => {
  it('every roofed place of the map has a roof, matched to its own static sprite', () => {
    const roofed = Object.entries(GAME.map.places).filter(([, pl]) => A.ROOFED_IDS.includes(pl.sprite));
    expect(roofed.map(([id]) => id).sort()).toEqual(['board', 'noticeboard', 'office', 'rack', 'scalehouse']);
    // owner2-fix P7: and each container of the container wall (props of kind 'wall').
    const walls = GAME.props.filter((p) => p.kind === 'wall');
    expect(walls.length).toBe(5);
    expect(nRoofs).toBe(roofed.length + walls.length);
    for (const w of walls) {
      let found = false;
      for (let r = 0; r < nRoofs; r++) if (statics[RF[r * A.ROOF + 5] * A.ITEM + 3] === w.x && statics[RF[r * A.ROOF + 5] * A.ITEM + 4] === w.y) found = true;
      expect(found, w.id).toBe(true);
    }
    for (const [id] of roofed) expect(roofOfPlace(id), id).toBeGreaterThanOrEqual(0);
    expect(A.ROOF_BAND).toBe(A.DEPTH_BAND);
  });

  it('the reviewer\'s two places (the boss at the tool rack, the boss behind the office) turn the roof see-through', () => {
    expect(A.underRoof(RF, roofOfPlace('rack'), 52.3, 27.75, 27.75 + 0.25, Y.tilt, PB)).toBe(true);
    expect(A.underRoof(RF, roofOfPlace('office'), 55.9, 27.5, 27.5 + 0.25, Y.tilt, PB)).toBe(true);
    // In front of the office (south of its front edge) nothing fades.
    expect(A.underRoof(RF, roofOfPlace('office'), 55.7, 31.4, 31.65, Y.tilt, PB)).toBe(false);
  });

  it('over every roofed place: at its centre, at each edge and on a grid of its drawn ground, wherever the boss can stand and the roof would cover a fifth of him or more, the roof fades', () => {
    let checked = 0;
    let covered = 0;
    for (let r = 0; r < nRoofs; r++) {
      const o = r * A.ROOF;
      const [x0, x1, y0, y1] = [RF[o], RF[o + 1], RF[o + 2] / Y.tilt, (RF[o + 3] - PB[2]) / Y.tilt];
      const xs = [x0, (x0 + x1) / 2, x1];
      const ys = [y0, (y0 + y1) / 2, y1];
      const pts: [number, number][] = [];
      for (const x of xs) for (const y of ys) pts.push([x, y]);
      for (let k = 0; k <= 12; k++) for (let j = 0; j <= 12; j++) pts.push([x0 + ((x1 - x0) * k) / 12, y0 + ((y1 - y0) * j) / 12]);
      for (const [x, y] of pts) {
        if (blocked(x, y, 0.35, Y.solids, Y.width, Y.depth)) continue;
        checked++;
        const share = coveredShare(r, x, y);
        if (share >= A.ROOF_COVER) {
          covered++;
          expect(A.underRoof(RF, r, x, y, y + 0.25, Y.tilt, PB), `roof ${r} at ${x.toFixed(2)}, ${y.toFixed(2)} (${(share * 100).toFixed(0)} % covered)`).toBe(true);
        } else expect(A.underRoof(RF, r, x, y, y + 0.25, Y.tilt, PB)).toBe(false);
      }
    }
    expect(checked).toBeGreaterThan(200);
    expect(covered).toBeGreaterThan(20);
  });

  it('owner2-fix P7: the boss in the passage between two containers of the wall (behind the southern one) sees it turn see-through; beside the wall it does not', () => {
    const walls = GAME.props.filter((p) => p.kind === 'wall');
    const wallRoof = (id: string) => {
      const w = walls.find((p) => p.id === id)!;
      for (let r = 0; r < nRoofs; r++) if (statics[RF[r * A.ROOF + 5] * A.ITEM + 3] === w.x && statics[RF[r * A.ROOF + 5] * A.ITEM + 4] === w.y) return r;
      return -1;
    };
    const w2 = walls.find((p) => p.id === 'wall-2')!;
    // The passage: between wall-1's south end and wall-2's north end, on the wall's line.
    const gy = w2.y - w2.d / 2 - 0.5;
    expect(blocked(w2.x, gy, 0.35, Y.solids, Y.width, Y.depth)).toBe(false);
    expect(A.underRoof(RF, wallRoof('wall-2'), w2.x, gy, gy + 0.25, Y.tilt, PB)).toBe(true);
    // West of the wall, level with its middle: not behind it.
    expect(A.underRoof(RF, wallRoof('wall-3'), w2.x - w2.w / 2 - 0.5, 30.4, 30.65, Y.tilt, PB)).toBe(false);
  });

  it('the roof\'s ink eases to a third in a fifth of a second and back', () => {
    let a = 1;
    for (let f = 0; f < 6; f++) a = A.roofInk(a, true, 1 / 30);
    expect(a).toBeCloseTo(A.ROOF_SEE, 6);
    a = 1;
    a = A.roofInk(a, true, 1 / 60);
    expect(a).toBeLessThan(1);
    expect(a).toBeGreaterThan(0.9);
    for (let f = 0; f < 6; f++) a = A.roofInk(a, false, 1 / 30);
    expect(a).toBe(1);
  });
});

describe('owner1 play 13: an empty chalk circle is faint', () => {
  it('a circle with nothing in it at a quarter of its ink, one with a thing in it at full ink', () => {
    const ci = { x: 40, y: 20, r: 0.8 };
    expect(A.circleFilled({ things: [], pieces: [] } as never, ci)).toBe(false);
    expect(A.circleFilled({ things: [{ x: 40.3, y: 20.2 }], pieces: [] } as never, ci)).toBe(true);
    expect(A.circleFilled({ things: [], pieces: [{ x: 41.5, y: 20 }] } as never, ci)).toBe(false);
    expect(A.CHALK_EMPTY_ALPHA).toBe(0.25);
  });
});
