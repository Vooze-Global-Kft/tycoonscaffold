/**
 * E4 (a) (RULING2.md 22; the economy attacker's bridgeLevels dead end): THE DRIVER KEEPS EVERY OPEN PARTNER SERVED. Among
 * full skips the hired driver takes the best by his rule, but no open partner's full skip waits longer than content
 * truck.fairAfter_trips of his trips; when the one due waits only for the tipping floor's room he takes nothing and waits
 * for it. From the works' opening only: the first yard's driver at release.stage 1 is unchanged. Owner: the loop
 * (s2-fix-loop).
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { FIXTURE_NOW, SALVAGE_TEST, fixtureGame } from '../fixtures/salvage';
import { r3Works, worksCfg } from '../fixtures/salvage2works';
import { awayPass } from './away';
import { newBot, playTo, seededCfg, startGame } from './bot';
import { begin, finish } from './clock';
import { contentAt } from './layer';
import { advanceNoBoss } from './tick';
import type { SalvageConfig, SalvageGame } from './types';

const N = 3;
const withFair = (cfg: SalvageConfig, n: number | undefined): SalvageConfig => {
  const { fairAfter_trips: _drop, ...truck } = cfg.salvage.truck as Record<string, unknown>;
  void _drop;
  return { ...cfg, salvage: { ...cfg.salvage, truck: n === undefined ? truck : { ...truck, fairAfter_trips: n } } } as SalvageConfig;
};

/** r3Works with the two bridge partners open at level 4 (four skips each, the attacker's levelled bridge in small) and cash to spare. */
function bridgeYard(): SalvageGame {
  const g = r3Works();
  const s = structuredClone(g.salvage);
  s.owned.push('truckBridge');
  for (const id of ['partner.garage', 'partner.plumbing']) s.partners[id] = { ...s.partners[id], level: 4 };
  return { ...g, cash: 1e9, salvage: s };
}

/** Three hours of no-boss play in 5 s steps: the partner of every trip the driver sets out on, and the largest fairWait seen. */
function trips(cfg: SalvageConfig, g: SalvageGame): { seq: string[]; maxWait: number; g: SalvageGame } {
  const x = begin(cfg, g, [], false);
  const seq: string[] = [];
  let last = '';
  let maxWait = 0;
  for (let k = 0; k < 3 * 720; k++) {
    advanceNoBoss(x, 5);
    const tr = x.s.truck.trip;
    const key = tr ? `${tr.partner}.${tr.slot}.${tr.t0}` : '';
    if (tr && key !== last) seq.push(tr.partner);
    last = key;
    for (const p of Object.values(x.s.partners)) maxWait = Math.max(maxWait, p.fairWait ?? 0);
  }
  return { seq, maxWait, g: finish(g, x) };
}

describe('E4 (a): the driver keeps every open partner served (from the works\' opening)', () => {
  it('with fairAfter_trips N, no partner\'s waiting skip waits through more than N of his trips; the first yard\'s partners get more trips than without the rule', () => {
    const g = bridgeYard();
    const on = trips(withFair(worksCfg(), N), g);
    const off = trips(withFair(worksCfg(), undefined), g);
    const n = (seq: string[], id: string) => seq.filter((p) => p === id).length;
    expect(on.seq.length).toBeGreaterThan(20);
    expect(on.maxWait).toBeLessThanOrEqual(N);
    // Without the rule nothing is written.
    expect(off.maxWait).toBe(0);
    expect(Object.values(off.g.salvage.partners).some((p) => p.fairWait !== undefined)).toBe(false);
    const first = (seq: string[]) => n(seq, 'partnerFarm') + n(seq, 'partnerDemolition');
    process.stderr.write(`E4a: trips with the rule ${JSON.stringify(Object.fromEntries(['partnerFarm', 'partnerDemolition', 'partner.garage', 'partner.plumbing'].map((p) => [p, n(on.seq, p)])))}, without ${JSON.stringify(Object.fromEntries(['partnerFarm', 'partnerDemolition', 'partner.garage', 'partner.plumbing'].map((p) => [p, n(off.seq, p)])))}\n`);
    expect(first(on.seq)).toBeGreaterThanOrEqual(first(off.seq));
    // Every open partner is fetched within N + 1 trips at least once in every window of the run where it had loads (the bridge's plenty does not starve the farm).
    for (const id of ['partnerFarm', 'partnerDemolition']) expect(n(on.seq, id)).toBeGreaterThan(0);
  }, 120_000);

  it('tick = jump = away for the rule: the same state through an away pass in one and in three passes', () => {
    const cfg = withFair(worksCfg(), N);
    const g = { ...bridgeYard(), lastSavedAt: 0 };
    const at = g.salvage.clock.highMs;
    const one = awayPass(cfg, g, at + 3 * 1800_000);
    let three = g;
    for (const k of [1, 2, 3]) three = awayPass(cfg, three, at + k * 1800_000);
    const strip = (h: SalvageGame) => JSON.stringify({ p: h.salvage.partners, cash: h.cash, t: h.salvage.t, tr: h.salvage.truck });
    expect(strip(three)).toBe(strip(one));
    expect(Object.values(one.salvage.partners).every((p) => (p.fairWait ?? 0) <= N)).toBe(true);
  }, 120_000);

  it('the first yard (works not open) is unchanged by the key: the frozen test content with and without it play the same', () => {
    const base = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
    const g0 = fixtureGame('m30', { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never, FIXTURE_NOW);
    expect(g0.salvage.counts?.bathSet).toBeUndefined();
    const a = awayPass(withFair(base, 1), g0, g0.salvage.clock.highMs + 3 * 3600_000);
    const b = awayPass(withFair(base, undefined), g0, g0.salvage.clock.highMs + 3 * 3600_000);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('the shipped content at release.stage 1 (the owner\'s phone): the key is in it, the driver never counts (a played hour and three hours away write no fairWait, and play as without the key)', () => {
    const raw = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8'));
    const cfg = seededCfg({ mode: 'salvage', salvage: SalvageSchema.parse(raw.salvage), monetization: raw.monetization } as unknown as SalvageConfig, 707);
    expect((cfg.salvage.truck as { fairAfter_trips?: number }).fairAfter_trips).toBeGreaterThan(0);
    const NOW = Date.UTC(2026, 10, 25, 9);
    const b = newBot(cfg, startGame(cfg, NOW), NOW, { seed: 707, hand: 'normal', habit: 'goal', route: 'A' } as Parameters<typeof newBot>[3]);
    playTo(b, 3600);
    const g = { ...b.g, lastSavedAt: b.g.salvage.clock.highMs };
    const a = awayPass(cfg, g, g.salvage.clock.highMs + 3 * 3600_000);
    const c = awayPass(withFair(cfg, undefined), g, g.salvage.clock.highMs + 3 * 3600_000);
    expect(JSON.stringify(a)).toBe(JSON.stringify(c));
    expect(Object.values(a.salvage.partners).some((p) => p.fairWait !== undefined)).toBe(false);
    void contentAt;
  }, 300_000);
});
