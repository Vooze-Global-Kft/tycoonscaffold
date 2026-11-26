/**
 * The owner's review of 26 November, point 2 ("the helpers sometimes freeze"): a waiting worker's tag
 * (RULING-owner1 H6, screens1 finding 1): when it shows, which ones, where.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../../config/schema.salvage';
import * as F from '../../../engine/fixtures/salvage';
import * as R from '../../../engine/salvage';
import { IDLE_SHOW_S, TAG_GAP, idleTags, placeTags } from './idleTags';

const member = (id: string, x: number, why: R.FrameCrew['idleWhy'] | null, phase: R.FrameCrew['phase'] = 'wait') =>
  ({ id, role: 'hand', pose: 'stand', tool: null, sprite: 'person.hand', job: why ? 'idle' : 'floor', phase, from: { x, y: 10 }, to: { x, y: 10 }, t0: 0, t1: 0, carries: null, load: [], ...(why ? { idleWhy: why, idleText: { key: `card.crewWhy.${why}` } } : {}) }) as unknown as R.FrameCrew;

describe('a waiting worker says why', () => {
  it('shows after two seconds of waiting (walking to his place too), goes the moment he departs', () => {
    const since = new Map<string, number>();
    const a = [member('h0', 5, 'uncut', 'walkTo')];
    expect(idleTags(a, 100, since, null)).toEqual([]);
    expect(idleTags(a, 100 + IDLE_SHOW_S - 0.1, since, null)).toEqual([]);
    const shown = idleTags(a, 100 + IDLE_SHOW_S, since, null);
    expect(shown.map((t) => [t.id, t.why, t.text.key, t.quiet])).toEqual([['h0', 'uncut', 'card.crewWhy.uncut', false]]);
    // A change of reason keeps the count; departing forgets him.
    expect(idleTags([member('h0', 5, 'yours')], 102.5, since, null).map((t) => t.why)).toEqual(['yours']);
    expect(idleTags([member('h0', 5, null)], 102.6, since, null)).toEqual([]);
    expect(since.size).toBe(0);
    expect(idleTags([member('h0', 5, 'yours')], 102.7, since, null)).toEqual([]);
  });

  it('at most three, the nearest to the boss; "nothing" in the quieter ink', () => {
    const since = new Map<string, number>();
    const crew = [member('a', 40, 'nothing'), member('b', 12, 'uncut'), member('c', 30, 'yours'), member('d', 11, 'tool'), member('e', 50, null)];
    idleTags(crew, 0, since, { x: 10, y: 10 });
    const shown = idleTags(crew, 5, since, { x: 10, y: 10 });
    expect(shown.map((t) => t.id)).toEqual(['d', 'b', 'c']);
    expect(shown.map((t) => t.idx)).toEqual([3, 1, 2]);
    const far = idleTags(crew, 5, since, { x: 45, y: 10 });
    expect(far[0]).toMatchObject({ id: 'a', quiet: true });
  });

  it('tags are laid out over the heads, below the top bars, never on one another', () => {
    const left: number[] = [];
    const tops: number[] = [];
    // Three workers standing close together, one right under the top bars, one not drawn.
    const ax = [200, 210, 220, 600, NaN];
    const ay = [150, 152, 148, 40, 100];
    const w = [120, 140, 110, 100, 80];
    placeTags(left, tops, ax, ay, w, 20, 5, 10, 834, 44, 380);
    expect(Number.isNaN(left[4])).toBe(true);
    for (let i = 0; i < 4; i++) {
      expect(tops[i]).toBeGreaterThanOrEqual(44 + TAG_GAP);
      expect(left[i]).toBeGreaterThanOrEqual(10);
      expect(left[i] + w[i]).toBeLessThanOrEqual(834);
      for (let j = 0; j < i; j++) {
        const apart = left[i] >= left[j] + w[j] || left[j] >= left[i] + w[i] || tops[i] >= tops[j] + 20 || tops[j] >= tops[i] + 20;
        expect(apart, `${i} ${j}`).toBe(true);
      }
    }
    // A worker off the side gets no tag; one under the one button's box: the tag goes above the box.
    placeTags(left, tops, [900, 780], [200, 330], [100, 100], 20, 2, 10, 834, 44, 380, [760, 300, 834, 380]);
    expect(Number.isNaN(left[0])).toBe(true);
    expect(tops[1] + 20).toBeLessThanOrEqual(300);
    // A free tag sits with its foot on its anchor, centred.
    placeTags(left, tops, [400], [200], [100], 20, 1, 10, 834, 44, 380);
    expect([left[0], tops[0]]).toEqual([350, 180]);
  });

  it('the game\'s own minute 30: the frame marks waiting workers and their tags come after two seconds', () => {
    const GAME = SalvageSchema.parse(JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8')).salvage);
    const cfg = { mode: 'salvage', salvage: GAME } as unknown as R.SalvageConfig;
    const played = F.playedOn(cfg);
    let g = { cash: 1e6, stats: { playSeconds: 0 }, lifetimeEarnings: 0, salvage: structuredClone(played.games.m30.salvage) } as unknown as R.SalvageGame;
    const since = new Map<string, number>();
    let seen = 0;
    let marked = 0;
    for (let k = 0; k < 600; k++) {
      g = R.tick(cfg, g, 0.1, F.FIXTURE_NOW + k * 100).game;
      const f = R.frame(cfg, g);
      marked += f.crew.filter((m) => m.idleWhy).length > 0 ? 1 : 0;
      const tags = idleTags(f.crew, f.t, since, null);
      for (const t of tags) {
        const m = f.crew[t.idx];
        expect(m.id).toBe(t.id);
        expect(m.job).toBe('idle');
        expect(m.role === 'hand' || m.role === 'cutter').toBe(true);
      }
      seen += tags.length;
    }
    // (measured 26 Nov: 568 of 600 ticks mark someone; 1,060 tags drawn)
    expect(marked).toBeGreaterThan(0);
    expect(seen).toBeGreaterThan(0);
  });
});
