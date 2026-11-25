/// <reference types="node" />
/**
 * World labels (labels.ts): on the four frozen states every plate keeps the limits of yard-stage1.md 4.6
 * and fits at font scale 1.3, text never under 11 pt, the bay chip prints today's price and the held
 * flag, the crucible's padlock chip its exact price, a skip's plate at most three thing lines, and the
 * stacked plates never overlap. Frozen test content (no tuned number pinned).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../../config/schema';
import * as E from '../../../engine/economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../../../engine/fixtures/salvage';
import * as R from '../../../engine/salvage';
import { hudLayout } from '../hud/metrics';
import { LABEL_PT, LIMITS, labelItems, labelSize, layoutPlates, mergePlates, plateFits, plateHidden, skipPlate, type LabelItem, type PlacedLabel, type PlateScene, type Rect } from './labels';

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'games', 'scrap-yard', 'game.json'), 'utf8'));
const cfg = withTestContent(GameConfigSchema.parse(raw));
const game = (n: (typeof FIXTURE_NAMES)[number]) => fixtureGame(n, E.createInitialState(cfg, FIXTURE_NOW) as R.SalvageGame, FIXTURE_NOW);
const day = R.marketDay(cfg, FIXTURE_NOW);
const V = { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) };

describe('world labels on the frozen states', () => {
  for (const name of FIXTURE_NAMES) {
    it(`${name}: every plate keeps its limits and fits at font scale 1.3`, () => {
      const g = game(name);
      const items = labelItems(cfg, g, R.frame(cfg, g), day);
      expect(items.length).toBeGreaterThan(0);
      const size = labelSize(1.3);
      for (const it of items) {
        for (const l of it.lines) expect(l.text.length, `${it.id}: "${l.text}"`).toBeLessThanOrEqual(l.max);
        if (it.kind === 'place') expect(it.lines[0].text.length).toBeLessThanOrEqual(18);
        expect(plateFits(it, size), it.id).toBe(true);
        for (const l of it.lines) expect(l.text).not.toMatch(/\{[A-Za-z.]+\}/);
      }
    });
  }

  it('text never under 11 pt, capped at font scale 1.3', () => {
    expect(labelSize(0.8)).toBe(LABEL_PT);
    expect(labelSize(1)).toBe(11);
    expect(labelSize(2)).toBeCloseTo(11 * 1.3);
    expect(labelSize(Number.NaN)).toBe(11);
  });

  it('the bay chip prints the grade, kilograms and today\'s price; a held bay says so', () => {
    const g = game('m30');
    const items = labelItems(cfg, g, R.frame(cfg, g), day);
    const ci = items.find((i) => i.id === 'bay.ci')!;
    const bay = R.frame(cfg, g).bays.find((b) => b.grade === 'ci')!;
    // The rules' chip (line 1) and its first other chip (held first): the words and the value are the frame's.
    expect(ci.lines[0].text).toContain(R.fmtMoney((bay as unknown as { value: number }).value));
    expect(ci.lines[0].text).toContain(cfg.salvage.grades.ci.short ?? cfg.salvage.grades.ci.name);
    expect(ci.lines.length).toBeLessThanOrEqual(2);
    if (bay.held) expect(ci.lines.some((l) => l.text === 'held' || l.text.includes('held'))).toBe(true);
    // An empty bay that is not held shows no chip.
    expect(items.find((i) => i.id === 'bay.alw')).toBeUndefined();
  });

  it('a locked pad wears the padlock with the exact price; the zones their condition', () => {
    const g = game('fresh');
    const items = labelItems(cfg, g, R.frame(cfg, g), day);
    const pad = items.find((i) => i.id === 'pad.crucible')!;
    expect(pad.padlock).toBe(true);
    expect(pad.lines[0].text).toContain(R.fmtMoney(R.shopPrice(cfg, g, 'crucible')!));
    expect(items.find((i) => i.id === 'padlock.Z2')!.lines[0].text).toMatch(/^Needs /);
    // One plate per thing: inside the padlocked zone the things' own chips go (the zone's plate says it).
    expect(items.some((i) => i.id.startsWith('lock.Z2.'))).toBe(false);
  });

  it("a partner load's plate: header, at most three thing lines and + n more, net and price, the refusal", () => {
    const lab: R.SkipLabel = {
      partner: 'partnerFarm',
      state: 'full',
      net_g: 1_020_000,
      things: ['washer', 'radiator', 'washer', 'radiator', 'washer'].map((obj, i) => ({ obj, n: i + 1, grade: 'li', g: 40_000 })),
      price: 150,
      refusal: { key: 'refusal.loadCash', args: { x: { money: 20 } } },
      fullInS: null,
      slot: 0,
      fullAt: 0,
    };
    const p = skipPlate(cfg.salvage, lab);
    expect(p.lines[0].text).toContain(cfg.salvage.names.partnerFarm);
    expect(p.lines.filter((l) => l.text.includes('×')).length).toBe(3);
    expect(p.lines.some((l) => l.text === '+ 2 more')).toBe(true);
    expect(p.lines.some((l) => l.text.includes(R.fmtMoney(150)))).toBe(true);
    expect(p.lines[p.lines.length - 1].tone).toBe('warn');
    expect(plateFits(p, labelSize(1.3))).toBe(true);
  });

  it('limits are those of 4.6', () => {
    expect(LIMITS.place).toBe(18);
    expect(LIMITS.padlock).toBeLessThanOrEqual(38);
  });
});

// ============================================================================================ the layout (L3, P7)

const SIZES = [
  { W: 844, H: 390, insets: { top: 0, left: 47, right: 47, bottom: 21 } },
  { W: 667, H: 375, insets: { top: 0, left: 0, right: 0, bottom: 0 } },
];

const places = cfg.salvage.map.places as Record<string, { w: number; d: number }>;
const points = cfg.salvage.map.points as Record<string, [number, number]>;
const FOOT: Record<string, Rect> = Object.fromEntries(
  Object.keys(places)
    .filter((id) => points[id])
    .map((id) => [id, { x0: points[id][0] - places[id].w / 2, x1: points[id][0] + places[id].w / 2, y0: points[id][1] - places[id].d / 2, y1: points[id][1] + places[id].d / 2 }]),
);

/** The scene the layer builds: the camera on a point, the hud's rows (goal card closed or open), the button, a held stick. */
function scene(at: { x: number; y: number }, sz: (typeof SIZES)[number], fontScale: number, opts: { goalOpen?: boolean; stick?: { x: number; y: number }; boss?: { x: number; y: number } | null; hides?: Rect[] } = {}): { sc: PlateScene; L: ReturnType<typeof hudLayout>; blocks: Rect[] } {
  const L = hudLayout(sz.W, sz.H, sz.insets, fontScale);
  const goalH = opts.goalOpen ? 84 : L.rows.goal - 4;
  const blocks: Rect[] = [
    { x0: L.left, x1: L.left + L.goalW, y0: L.goalY, y1: L.goalY + 4 + goalH },
    { x0: L.button.x, x1: L.button.x + L.button.size, y0: L.button.y, y1: L.button.y + L.button.size },
  ];
  if (opts.stick) blocks.push({ x0: opts.stick.x - 60, x1: opts.stick.x + 60, y0: opts.stick.y - 60, y1: opts.stick.y + 60 });
  const cam = { x: at.x * V.ppm - sz.W / 2, y: at.y * V.ppm * V.tilt - sz.H * 0.61, zoom: 1 };
  const boss = opts.boss === undefined ? at : opts.boss;
  return {
    L,
    blocks,
    sc: {
      view: V,
      cam,
      W: sz.W,
      H: sz.H,
      size: labelSize(fontScale),
      bounds: { x0: L.left, x1: L.right, y0: L.goalY, y1: sz.H - sz.insets.bottom - 2 },
      blocks,
      hides: opts.hides ?? [],
      people: boss ? [boss] : [],
      workAt: new Set(),
      busy: new Set(),
      footprints: FOOT,
      boss,
    },
  };
}

/** A placed plate's box on screen (the layer's pixels less the camera; zoom 1). */
const onScreen = (p: PlacedLabel, sc: PlateScene): Rect => ({ x0: p.x - sc.cam.x, x1: p.x + p.w - sc.cam.x, y0: p.y - sc.cam.y, y1: p.y + p.h - sc.cam.y });
const hit = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Every point the boss stands at in these cases: the start, every place with a card, and a few things. */
const SPOTS = Object.keys(FOOT).map((id) => ({ x: (FOOT[id].x0 + FOOT[id].x1) / 2, y: FOOT[id].y1 + 0.6, id }));

describe('the plates\' layout (L3, P7)', () => {
  for (const name of FIXTURE_NAMES)
    for (const sz of SIZES)
      for (const fs of [1, 1.3])
        it(`${name} at ${sz.W} x ${sz.H}, font scale ${fs}: plates never overlap each other, the bars, the goal card, the button, the stick or the boss; all inside the side margins`, () => {
          const g = game(name);
          const items = labelItems(cfg, g, R.frame(cfg, g), day).filter((i) => !i.near);
          let shown = 0;
          for (const spot of SPOTS) {
            for (const goalOpen of [false, true]) {
              const { sc, L, blocks } = scene(spot, sz, fs, { goalOpen, stick: { x: L0(sz).left + 90, y: sz.H - 80 } });
              const placed = layoutPlates(items, sc);
              shown += placed.length;
              const rects = placed.map((p) => onScreen(p, sc));
              for (let i = 0; i < rects.length; i++) {
                const r = rects[i];
                const id = `${placed[i].item.id} at ${spot.id}`;
                expect(r.x0 >= L.left - 0.01 && r.x1 <= L.right + 0.01, `${id} inside the side margins`).toBe(true);
                expect(r.y0 >= L.goalY - 0.01, `${id} under the top bar`).toBe(true);
                expect(r.y1 <= sz.H, `${id} above the bottom`).toBe(true);
                for (const b of blocks) expect(hit(r, b), `${id} against ${JSON.stringify(b)}`).toBe(false);
                for (let j = i + 1; j < rects.length; j++) expect(hit(r, rects[j]), `${id} / ${placed[j].item.id}`).toBe(false);
              }
            }
          }
          expect(shown).toBeGreaterThan(0);
        });

  it('a plate never covers the boss: his box is a block', () => {
    const g = game('m5');
    const items = labelItems(cfg, g, R.frame(cfg, g), day).filter((i) => !i.near);
    for (const spot of SPOTS) {
      const { sc } = scene(spot, SIZES[0], 1);
      const bx = SIZES[0].W / 2;
      const by = SIZES[0].H * 0.61;
      const bossBox = { x0: bx - 18, x1: bx + 18, y0: by - 57, y1: by };
      sc.blocks.push(bossBox);
      for (const p of layoutPlates(items, sc)) expect(hit(onScreen(p, sc), bossBox), `${p.item.id} at ${spot.id}`).toBe(false);
    }
  });

  it('a place\'s plate is hidden while somebody stands in its footprint or works there, and while a ticket covers it', () => {
    const g = game('fresh');
    const items = labelItems(cfg, g, R.frame(cfg, g), day);
    const scale = items.find((i) => i.id === 'place.scale');
    expect(scale, 'the scale has a name plate').toBeDefined();
    const f = FOOT.scale;
    const inScale = { x: (f.x0 + f.x1) / 2, y: (f.y0 + f.y1) / 2 };
    expect(plateHidden(scale!, { people: [inScale], workAt: new Set(), busy: new Set(), footprints: FOOT })).toBe(true);
    expect(plateHidden(scale!, { people: [{ x: f.x1 + 5, y: f.y1 + 5 }], workAt: new Set(), busy: new Set(), footprints: FOOT })).toBe(false);
    expect(plateHidden(scale!, { people: [], workAt: new Set(['scale']), busy: new Set(), footprints: FOOT })).toBe(true);
    // A ticket over the whole screen hides every plate.
    const { sc } = scene({ x: f.x1 + 3, y: f.y1 + 3 }, SIZES[0], 1, { hides: [{ x0: 0, x1: 844, y0: 0, y1: 390 }] });
    expect(layoutPlates(items, sc)).toEqual([]);
  });

  it('one plate per thing: a locked pad is ONE plate (its name and price with the padlock); identical "Needs ..." plates of one floor are one with a count', () => {
    const g = game('fresh');
    const items = labelItems(cfg, g, R.frame(cfg, g), day);
    const pad = items.find((i) => i.id === 'pad.crucible')!;
    expect(pad.padlock).toBe(true);
    expect(items.some((i) => i.kind === 'place' && i.at === 'crucible')).toBe(false);
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const mk = (n: number): LabelItem => ({ id: `lock.floor.t${n}`, kind: 'padlock', x: 50 + n, y: 33, z: 1.3, lines: [{ text: 'Needs a sledgehammer', tone: 'ink', max: 38 }], padlock: true, near: false, place: null, of: `floor.t${n}` });
    const merged = mergePlates([mk(1), mk(2), mk(3), mk(4), mk(5)], cfg.salvage);
    expect(merged.length).toBe(1);
    expect(merged[0].count).toBe(5);
    expect(merged[0].lines[0].text).toBe('Needs a sledgehammer · 5');
    expect(merged[0].x).toBeCloseTo(53);
    // Inside a zone that wears its own padlock the things' chips go.
    expect(mergePlates([{ ...mk(1), id: 'lock.Z2.a' }], cfg.salvage, new Set(['Z2']))).toEqual([]);
  });

  it('a plate whose thing is off screen, or that cannot stand whole anywhere, is not shown', () => {
    const g = game('m30');
    const items = labelItems(cfg, g, R.frame(cfg, g), day).filter((i) => !i.near);
    const { sc } = scene({ x: 54, y: 24 }, SIZES[1], 1.3);
    const shownIds = new Set(layoutPlates(items, sc).map((p) => p.item.id));
    for (const it of items) {
      const sx = it.x * V.ppm - sc.cam.x;
      if (sx < 0 || sx > SIZES[1].W) expect(shownIds.has(it.id), it.id).toBe(false);
    }
    // No room at all: nothing shows.
    const tiny = { ...sc, bounds: { x0: 0, x1: 10, y0: 0, y1: 10 } };
    expect(layoutPlates(items, tiny)).toEqual([]);
  });

  it('a bay\'s chip is one plate of at most two lines', () => {
    for (const name of FIXTURE_NAMES) {
      const g = game(name);
      for (const it of labelItems(cfg, g, R.frame(cfg, g), day).filter((i) => i.kind === 'bay')) expect(it.lines.length, `${name} ${it.id}`).toBeLessThanOrEqual(2);
    }
  });
});

function L0(sz: (typeof SIZES)[number]) {
  return hudLayout(sz.W, sz.H, sz.insets, 1);
}
