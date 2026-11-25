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
import { LABEL_PT, LIMITS, labelItems, labelSize, plateFits, plateSize, skipPlate, stackLabels } from './labels';

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
    expect(ci.lines[0].text).toContain(R.fmtPrice(R.priceOf(cfg, 'ci', day)));
    expect(ci.lines[0].text).toContain(cfg.salvage.grades.ci.name);
    expect(ci.lines.some((l) => l.text === 'held')).toBe(true);
    // An empty bay that is not held shows no chip.
    expect(items.find((i) => i.id === 'bay.alw')).toBeUndefined();
  });

  it('a locked pad wears the padlock with the exact price; the zones their condition', () => {
    const g = game('fresh');
    const items = labelItems(cfg, g, R.frame(cfg, g), day);
    const pad = items.find((i) => i.id === 'pad.crucible')!;
    expect(pad.padlock).toBe(true);
    expect(pad.lines[0].text).toContain(R.fmtMoney(R.shopPrice(cfg, g, 'crucible')!));
    expect(items.find((i) => i.id === 'padlock.Z2')!.lines[0].text).toBe('Needs a sledgehammer');
    // A radiator inside the padlocked zone shows its own chip only when the boss is near.
    expect(items.find((i) => i.id.startsWith('lock.Z2.'))!.near).toBe(true);
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
    };
    const p = skipPlate(cfg.salvage, lab);
    expect(p.lines[0].text).toContain(cfg.salvage.names.partnerFarm);
    expect(p.lines.filter((l) => l.text.includes('×')).length).toBe(3);
    expect(p.lines.some((l) => l.text === '+ 2 more')).toBe(true);
    expect(p.lines.some((l) => l.text.includes(R.fmtMoney(150)))).toBe(true);
    expect(p.lines[p.lines.length - 1].tone).toBe('warn');
    expect(plateFits(p, labelSize(1.3))).toBe(true);
  });

  it('stacked plates never overlap', () => {
    const g = game('m30');
    const size = labelSize(1.3);
    const items = labelItems(cfg, g, R.frame(cfg, g), day).filter((i) => !i.near);
    const placed = stackLabels(items, V, size);
    const rect = (p: (typeof placed)[number]) => ({ x0: p.px - p.w / 2, x1: p.px + p.w / 2, y0: p.py - p.lift - p.h - 7, y1: p.py - p.lift - 7 });
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++) {
        const a = rect(placed[i]);
        const b = rect(placed[j]);
        const overlap = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
        expect(overlap, `${placed[i].item.id} / ${placed[j].item.id}`).toBe(false);
      }
    expect(placed.every((p) => p.h === plateSize(p.item, size).h)).toBe(true);
  });

  it('limits are those of 4.6', () => {
    expect(LIMITS.place).toBe(18);
    expect(LIMITS.padlock).toBeLessThanOrEqual(38);
  });
});
