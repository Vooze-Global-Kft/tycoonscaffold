/**
 * The loading animation's checks (S22, yard-stage1.md 6.4): the timeline for any number of words
 * (0.6 s a plate, about 3.5 s for three, the display only counting up to its final reading, the ticket
 * after the pour, the gate after the ticket), the calm loop never frozen, reduced motion still but
 * breathing, the layout at both phone sizes with their safe areas (plates never overlap each other or
 * the display, the hood never covers a plate, everything that tells the story inside the safe area) for
 * short, long and many-word titles, and that every frame draws. Skia runs on CanvasKit.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@shopify/react-native-skia', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
  const CanvasKit = await CanvasKitInit({});
  (globalThis as Record<string, unknown>).CanvasKit = CanvasKit;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Module = require('node:module');
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request: string, ...rest: unknown[]) {
    return resolve.call(this, request === 'react-native' ? 'react-native-web' : request, ...rest);
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@shopify/react-native-skia/lib/commonjs/mock').Mock(CanvasKit);
  } finally {
    Module._resolveFilename = resolve;
  }
});

import { loadingLayout, titleWords, type Insets } from './layout';
import { GATE_S, GLINT_AT, GLINT_S, LOADING_SOUNDS, LOADING_T, PLATE_S, loadingCues, loadingPose, loadingTimeline, plateKg } from './timeline';

const SIZES: [number, number, Insets][] = [
  [844, 390, { top: 0, left: 47, right: 47, bottom: 21 }],
  [844, 390, { top: 0, left: 0, right: 0, bottom: 0 }],
  [667, 375, { top: 0, left: 0, right: 0, bottom: 0 }],
];
const TITLES = ['Scrap to Ingot', 'PLACEHOLDER Yard', 'Ingot', 'The Big Yard Works', 'Big Yard Metal Recycling Works', 'Thwaiteby Metals'];

describe('titleWords', () => {
  it('one plate per word, upper case, at most four (the rest share the last)', () => {
    expect(titleWords('Scrap to Ingot')).toEqual(['SCRAP', 'TO', 'INGOT']);
    expect(titleWords('  a  b ')).toEqual(['A', 'B']);
    expect(titleWords('one two three four five six')).toEqual(['ONE', 'TWO', 'THREE', 'FOUR FIVE SIX']);
    expect(titleWords('')).toHaveLength(1);
  });
});

describe('timeline', () => {
  it('three words take about 3.5 s; each plate 0.6 s', () => {
    expect(LOADING_T.n).toBe(3);
    expect(LOADING_T.end).toBeGreaterThan(3.3);
    expect(LOADING_T.end).toBeLessThan(3.8);
    for (const [a, b] of LOADING_T.plates) expect(b - a).toBeCloseTo(PLATE_S, 9);
  });
  for (const n of [1, 2, 3, 4]) {
    const words = ['SCRAP', 'TO', 'INGOT', 'WORKS'].slice(0, n);
    const tl = loadingTimeline(words);
    it(`${n} plate(s): the display only counts up and reads the sum once the last plate lands`, () => {
      let last = -1;
      for (let t = 0; t <= tl.end; t += 0.005) {
        const p = loadingPose(t, tl);
        expect(p.kg).toBeGreaterThanOrEqual(last);
        expect(p.kg % 20).toBe(0);
        last = p.kg;
      }
      expect(loadingPose(tl.plates[n - 1][1], tl).kg).toBe(tl.kg.reduce((a, b) => a + b, 0));
      expect(loadingPose(0, tl).kg).toBe(0);
    });
    it(`${n} plate(s): plates land in order, each shakes once, nothing pours before the last has landed`, () => {
      for (let i = 0; i < n; i++) {
        expect(loadingPose(tl.plates[i][0] - 0.01, tl).plates[i].drop).toBe(0);
        expect(loadingPose(tl.plates[i][1] + 0.01, tl).plates[i].drop).toBe(1);
        expect(loadingPose(tl.plates[i][1] + 0.2, tl).plates[i].shake).toBe(0);
        const shakes = Array.from({ length: 120 }, (_, j) => loadingPose(tl.plates[i][0] + j * 0.005, tl).plates[i].shake !== 0);
        expect(shakes.some(Boolean)).toBe(true);
      }
      expect(loadingPose(tl.plates[n - 1][1] - 0.01, tl).tilt).toBe(0);
      expect(loadingPose(tl.pour[0] - 0.001, tl).pour).toBe(0);
      expect(loadingPose(tl.pour[1], tl).pour).toBe(1);
      expect(loadingPose(tl.cool[1], tl).cool).toBeGreaterThanOrEqual(3);
    });
    it(`${n} plate(s): the ticket prints after the pour and is out before the gate's slot`, () => {
      expect(loadingPose(tl.pour[1] - 0.01, tl).ticket).toBe(0);
      expect(loadingPose(tl.gate[0], tl).ticket).toBe(1);
      expect(tl.gate[1] - tl.gate[0]).toBeCloseTo(GATE_S, 9);
    });
  }
  it('the gate waits for the screen: with no gate time it stays shut however long the loop runs', () => {
    for (const t of [3, 5, 20, 100]) expect(loadingPose(t, LOADING_T, 1e9).gate).toBe(0);
    expect(loadingPose(10.4, LOADING_T, 10).gate).toBe(1);
    expect(loadingPose(10.2, LOADING_T, 10).gate).toBeGreaterThan(0);
  });
  it('the calm loop is never a frozen frame: the magnet sways, the furnace breathes, the ingots glint once (never again), the display lamp ticks (its reading stays as printed)', () => {
    const sw = new Set<number>();
    const br = new Set<number>();
    const kg = new Set<number>();
    const ticks = new Set<boolean>();
    let glints = 0;
    for (let t = LOADING_T.end; t < LOADING_T.end + 6; t += 1 / 60) {
      const p = loadingPose(t, LOADING_T, 1e9);
      sw.add(Math.round(p.sway * 10));
      br.add(Math.round(p.breathe * 20));
      kg.add(p.kg);
      ticks.add(p.tick);
      if (p.glint >= 0) {
        glints++;
        expect(t - LOADING_T.end).toBeLessThan(GLINT_AT + GLINT_S + 0.02);
      }
      // between frames nothing jumps: the parked magnet moves a fraction of a degree
      const q = loadingPose(t + 1 / 60, LOADING_T, 1e9);
      expect(Math.abs(q.sway - p.sway)).toBeLessThan(0.2);
      expect(Math.abs(q.swing - p.swing)).toBeLessThan(0.5);
    }
    expect(sw.size).toBeGreaterThan(10);
    expect(br.size).toBeGreaterThan(10);
    expect(kg.size).toBe(1);
    expect(ticks.size).toBe(2);
    expect(glints).toBeGreaterThan(30);
    expect(glints).toBeLessThan(50);
  });
  it('the timeline runs into the loop without a jump (trolley parked, ingots cooled, ticket out)', () => {
    const a = loadingPose(LOADING_T.end - 1 / 120, LOADING_T, 1e9);
    const b = loadingPose(LOADING_T.end + 1 / 120, LOADING_T, 1e9);
    expect(a.park).toBe(1);
    expect(b.park).toBe(1);
    expect(Math.abs(a.swing + a.sway - (b.swing + b.sway))).toBeLessThan(0.3);
    expect(b.ticket).toBe(1);
    expect(Math.abs(a.breathe - b.breathe)).toBeLessThan(0.05);
  });
  it('reduced motion: the final frame with only the breathing', () => {
    const ps = [0, 0.7, 1.9, 4].map((t) => loadingPose(t, LOADING_T, 1e9, true));
    for (const p of ps) {
      expect(p.sway).toBe(0);
      expect(p.glint).toBe(-1);
      expect(p.ticket).toBe(1);
      expect(p.kg).toBe(LOADING_T.kg.reduce((a, b) => a + b, 0));
      expect(p.plates.every((q) => q.drop === 1)).toBe(true);
      expect(p.cool).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(ps.map((p) => Math.round(p.breathe * 100))).size).toBeGreaterThan(1);
  });
  it('plates weigh in 20 kg steps and the load stays under four display digits', () => {
    for (const w of ['A', 'TO', 'SCRAP', 'PLACEHOLDER']) expect(plateKg(w) % 20).toBe(0);
    const tl = loadingTimeline(['ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ', 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ', 'X', 'Y']);
    expect(tl.kg.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(9999);
  });
  it('sounds by id: the crane, one set-down per plate, the pour, the cooled bars', () => {
    for (const n of [1, 3, 4]) {
      const tl = loadingTimeline(['A', 'B', 'C', 'D'].slice(0, n));
      const cues = loadingCues(tl);
      expect(cues.filter((c) => c.id === LOADING_SOUNDS.plate)).toHaveLength(n);
      expect(cues.map((c) => c.id)).toEqual(expect.arrayContaining([LOADING_SOUNDS.crane, LOADING_SOUNDS.pour, LOADING_SOUNDS.cooled]));
      for (const c of cues) expect(c.t).toBeLessThanOrEqual(tl.end);
      for (let i = 1; i < cues.length; i++) expect(cues[i].t).toBeGreaterThanOrEqual(cues[i - 1].t);
    }
  });
});

describe('layout', () => {
  for (const [w, h, ins] of SIZES)
    for (const title of TITLES) {
      it(`${w}x${h} (safe ${ins.left}/${ins.right}/${ins.bottom}), "${title}": plates apart, clear of the display, the story inside the safe area`, () => {
        const words = titleWords(title);
        const L = loadingLayout(w, h, ins, words);
        const left = ins.left;
        const right = w - ins.right;
        const bottom = h - ins.bottom;
        expect(L.plateX).toHaveLength(words.length);
        for (let i = 0; i < words.length; i++) {
          const a = L.plateX[i] - L.plateW[i] / 2;
          const b = L.plateX[i] + L.plateW[i] / 2;
          expect(a).toBeGreaterThanOrEqual(L.deckL);
          expect(b).toBeLessThanOrEqual(L.dX - L.dW / 2 - 4);
          expect(a).toBeGreaterThanOrEqual(left);
          if (i > 0) expect(a).toBeGreaterThan(L.plateX[i - 1] + L.plateW[i - 1] / 2 + 4);
        }
        // the letters stay readable at phone size (a store title has at most 30 characters)
        expect(L.size).toBeGreaterThanOrEqual(14);
        // display and its ticket inside the safe area
        expect(L.dX + L.dW / 2).toBeLessThanOrEqual(right);
        expect(L.dX - L.dW / 2).toBeGreaterThanOrEqual(left);
        expect(L.slotY + L.tkH).toBeLessThanOrEqual(L.deckTop + 8);
        // the hood stands below the deck's lip (never over a plate) and above the crucible's rim
        expect(L.hoodTop).toBeGreaterThan(L.deckTop + 14 * L.k);
        expect(L.hoodBot).toBeLessThanOrEqual(L.sY - 32 * L.k);
        // the stream falls (the lip at full tilt is above the launder)
        const a = (L.tiltDeg * Math.PI) / 180;
        const lipY = L.sY + Math.sin(a) * L.lip[0] + Math.cos(a) * L.lip[1];
        expect(L.lY - lipY).toBeGreaterThan(8 * L.k);
        // the moulds on their table, the crucible, the furnace hand inside the safe area
        expect(L.footY).toBeLessThanOrEqual(bottom + 0.01);
        expect(L.tableY).toBeGreaterThan(L.mY);
        // five separate moulds with clear gaps (never one trough that reads as a progress bar)
        expect(L.mouldX).toHaveLength(5);
        for (let i = 1; i < 5; i++) expect(L.mouldX[i] - (L.mouldX[i - 1] + L.mouldW)).toBeGreaterThan(6 * L.k);
        // the moulds stand under the crucible's lip at full tilt: the stream falls into the first one's launder
        const lipX = L.sX + Math.cos(a) * L.lip[0] - Math.sin(a) * L.lip[1];
        expect(lipX).toBeGreaterThanOrEqual(L.lX0);
        expect(lipX).toBeLessThan(L.mL);
        // the ticket's print is 11 points or more
        expect(L.tkPrint).toBeGreaterThanOrEqual(11);
        expect(L.manY).toBeLessThanOrEqual(bottom);
        expect(L.manX - 34 * L.k).toBeGreaterThanOrEqual(left - 1);
        expect(L.mR + 30 * L.k).toBeLessThanOrEqual(right);
        // the magnet at its stand is on screen
        expect(L.parkX - 36 * L.k).toBeGreaterThanOrEqual(0);
      });
    }
});

describe('drawing', () => {
  type SkiaT = typeof import('@shopify/react-native-skia');
  let S: SkiaT;
  beforeAll(async () => {
    S = await import('@shopify/react-native-skia');
  }, 60_000);
  it('every key frame, the loop, the gate and reduced motion draw at both sizes for every title', async () => {
    const D = await import('./draw');
    for (const [w, h, ins] of SIZES)
      for (const title of TITLES) {
        const words = titleWords(title);
        const tl = loadingTimeline(words);
        const surface = S.Skia.Surface.MakeOffscreen(w, h)!;
        for (const t of [0, 0.3, 0.9, 1.5, 2.1, 2.8, 3.3, tl.end + 2.5]) expect(() => D.drawLoading(surface.getCanvas(), w, h, loadingPose(t, tl, 1e9), words, ins)).not.toThrow();
        expect(() => D.drawLoading(surface.getCanvas(), w, h, loadingPose(tl.end + 1, tl, tl.end + 0.8), words, ins)).not.toThrow();
        expect(() => D.drawLoading(surface.getCanvas(), w, h, loadingPose(2, tl, 1.9, true), words, ins, true)).not.toThrow();
      }
  }, 120_000);
});
