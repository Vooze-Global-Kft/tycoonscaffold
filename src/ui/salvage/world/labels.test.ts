/// <reference types="node" />
/**
 * World labels (labels.ts): on the four frozen states every plate keeps the limits of yard-stage1.md 4.6
 * and fits at font scale 1.3, text never under 11 pt, the bay chip prints today's price and the held
 * flag, the crucible's padlock chip its exact price, a skip's plate at most three thing lines, and the
 * stacked plates never overlap. Frozen test content (no tuned number pinned).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// The layout cases walk every place at two sizes and two font scales; a busy machine needs more than 5 s.
vi.setConfig({ testTimeout: 60_000 });
import { GameConfigSchema } from '../../../config/schema';
import * as E from '../../../engine/economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../../../engine/fixtures/salvage';
import * as R from '../../../engine/salvage';
import { hudLayout } from '../hud/metrics';
import { doorSpots, LABEL_PT, LIMITS, labelItems, labelSize, layoutPlates, lockGroup, mergePlates, plateFits, plateHidden, skipPlate, type LabelItem, type PlacedLabel, type PlateScene, type Rect } from './labels';

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

  it('owner1 finding 10: a free trial load\'s plate says "Free trial load", never a price of 0.00', () => {
    const lab: R.SkipLabel = { partner: 'partnerFarm', state: 'trial', net_g: 540_000, things: [{ obj: 'washer', n: 2, grade: 'li', g: 40_000 }], price: 0, refusal: null, fullInS: null, slot: 0, fullAt: 0, free: true };
    const p = skipPlate(cfg.salvage, lab);
    expect(p.lines.some((l) => l.text.includes('Free trial load'))).toBe(true);
    expect(p.lines.some((l) => l.text.includes(R.fmtMoney(0)))).toBe(false);
    expect(plateFits(p, labelSize(1.3))).toBe(true);
  });

  it('owner1 T4: while the boss stands refused at a skip, its plate carries the frame\'s refusal with its figure, in the warning ink', () => {
    const g = game('m30');
    const f = R.frame(cfg, g);
    const sk = f.skips[0];
    expect(sk).toBeDefined();
    const refusal: R.Txt = { key: 'refusal.loadCash', args: { x: { money: 1234 } } };
    const held = { ...f, boss: { ...f.boss, target: `refused.${sk.partner}`, refusal } } as R.FrameTable;
    const words = R.fmtMoney(1234);
    const plate = labelItems(cfg, g, held, day).find((it) => it.id.startsWith(`skip.${sk.partner}.`));
    expect(plate).toBeDefined();
    const last = plate!.lines[plate!.lines.length - 1];
    expect(last.tone).toBe('warn');
    expect(last.text).toContain(words);
    expect(plateFits(plate!, labelSize(1.3))).toBe(true);
    // Not held: the plate does not carry it.
    const free = labelItems(cfg, g, { ...f, boss: { ...f.boss, refusal: null } } as R.FrameTable, day).find((it) => it.id === plate!.id);
    expect(free!.lines.some((l) => l.text.includes(words))).toBe(false);
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
    // desk2 (L3's rest): the tipping floor's things (uids f<n>) and the drop-off's (d<n>) are piles too:
    // identical chips of one pile are one plate; the floor's and the drop-off's never merge with each other.
    const fl = (id: string, n: number): LabelItem => ({ ...mk(n), id: `lock.${id}`, of: id, lines: [{ text: 'Needs the hammer and grinder', tone: 'ink', max: 38 }] });
    const tip = mergePlates([fl('f0', 0), fl('f1', 1), fl('f2', 2), fl('f3', 3), fl('f4', 4), fl('f5', 5), fl('d1', 6), fl('d2', 7)], cfg.salvage);
    expect(tip.length).toBe(2);
    expect(tip[0].lines[0].text).toBe('Needs the hammer and grinder · 6');
    expect(tip[0].id).toBe('lock.floor.x6');
    expect(tip[1].lines[0].text).toBe('Needs the hammer and grinder · 2');
    expect(mergePlates([fl('f0', 0)], cfg.salvage)[0].lines[0].text).toBe('Needs the hammer and grinder');
    // Inside a zone that wears its own padlock the things' chips go.
    expect(mergePlates([{ ...mk(1), id: 'lock.Z2.a' }], cfg.salvage, new Set(['Z2']))).toEqual([]);
    expect([lockGroup('Z2.washer.3'), lockGroup('f12'), lockGroup('d3'), lockGroup('x')]).toEqual(['Z2', 'floor', 'dropoff', 'x']);
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

describe('join3: the partners\' names on their lane signs (L7, P10)', () => {
  it('each partner of the rules has one sign plate, at the sign the lane art places, with its register name', async () => {
    const { laneGeo, laneSigns } = await import('./lane');
    const g = game('m30');
    const items = labelItems(cfg, g, R.frame(cfg, g), day).filter((i) => i.id.startsWith('sign.'));
    const signs = laneSigns(laneGeo(cfg.salvage)!);
    expect(items.length).toBe(Object.keys(g.salvage.partners).length);
    for (const it of items) {
      const id = it.id.slice(5);
      const sg = signs.find((s) => s.id === id)!;
      expect([it.x, it.y]).toEqual([sg.x, sg.y]);
      expect(it.lines[0].text.length).toBeGreaterThan(0);
      expect(it.lines[0].text).not.toBe(id);
    }
  });
});

describe('desk1: a partner skip\'s plate stands on the road side', () => {
  it('a skip plate is laid UNDER its foot (south, clear of the site\'s buildings behind it) when there is room; other plates above', () => {
    const sc: PlateScene = {
      view: { ppm: 40, tilt: 0.9, lift: 0.7 },
      cam: { x: 0, y: 0, zoom: 1 },
      W: 844,
      H: 390,
      size: LABEL_PT,
      bounds: { x0: 0, x1: 844, y0: 0, y1: 390 },
      blocks: [],
      hides: [],
      people: [],
      workAt: new Set(),
      busy: new Set(),
      footprints: {},
      boss: null,
    };
    const lines = [{ text: 'Hob\'s Farm Clearance · trial load', tone: 'strong' as const, max: 38 }, { text: 'Net 540 kg · §150', tone: 'strong' as const, max: 38 }];
    const at = { x: 10.5, y: 4 };
    const skip: LabelItem = { id: 'skip.farm.0', kind: 'skip', x: at.x, y: at.y, z: 2.2, lines, padlock: false, near: false, place: null, at: null, under: true, footDy: 1.1 };
    const [p] = layoutPlates([skip], sc);
    expect(p.below).toBe(true);
    // Its top lies under the skip's foot on screen (the shed stands north of the skip, so above it on screen).
    const footY = (at.y + 1.1) * 40 * 0.9;
    expect(p.y).toBeGreaterThanOrEqual(footY);
    const [q] = layoutPlates([{ ...skip, id: 'other', under: undefined, footDy: undefined }], sc);
    expect(q.below).toBe(false);
    // No room under the foot (the skip low on the screen): BESIDE it, its foot level with the skip's, not over the shed.
    const low = { ...skip, x: 10.5, y: 9.5, halfW: 1.4 };
    const [r] = layoutPlates([low], sc);
    expect(r.below).toBe(true);
    const foot = (low.y + 1.1) * 40 * 0.9;
    expect(r.y + r.h).toBeCloseTo(foot, 5);
    expect(Math.abs(r.x + r.w / 2 - low.x * 40)).toBeGreaterThanOrEqual(r.w / 2 + 1.4 * 40);
  });
});

describe('desk2 (4a): a place\'s plate hides while the boss stands at its standing spot', () => {
  it('the office plate hides with the boss at its door (south), not when he is a few metres off; others unchanged', () => {
    const spots = doorSpots({ office: { w: 4.4, d: 3, door: 's' }, rack: { w: 2, d: 0.8 } }, { office: [55.7, 29.35], rack: [52.5, 28.5] });
    expect(Object.keys(spots)).toEqual(['office']);
    expect(spots.office.x).toBeCloseTo(55.7);
    expect(spots.office.y).toBeCloseTo(29.35 + 1.5 + 0.6);
    const it0: LabelItem = { id: 'place.office', kind: 'place', x: 55.7, y: 29.35, z: 2.6, lines: [{ text: 'Office', tone: 'ink', max: 38 }], padlock: false, near: false, place: 'office', at: 'office' };
    const base = { people: [], workAt: new Set<string>(), busy: new Set<string>(), footprints: { office: { x0: 53.5, x1: 57.9, y0: 27.85, y1: 30.85 } }, spots };
    expect(plateHidden(it0, { ...base, boss: { x: 55.6, y: 31.5 } })).toBe(true);
    expect(plateHidden(it0, { ...base, boss: { x: 55.6, y: 35 } })).toBe(false);
    expect(plateHidden(it0, { ...base, boss: null })).toBe(false);
    expect(plateHidden(it0, { ...base, spots: undefined, boss: { x: 55.6, y: 31.5 } })).toBe(false);
  });
});
