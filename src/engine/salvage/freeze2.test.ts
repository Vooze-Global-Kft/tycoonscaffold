/**
 * X6 (RULING2.md 22; the exactness attacker's a0-stage1.test.ts, third case): A SAVE THAT HAS SEEN STAGE 2, LOADED BY A
 * BUILD AT release.stage 1, IS KEPT AND FROZEN. Nothing of stage 2 advances, pays or shows; the first yard's rules run on
 * what the first yard owns; the ladder shows at most rung 3; every stage-2 field is kept as saved (save.ts
 * `stage2Frozen`) for the day a build at stage 2 loads it again, and then it goes on from where it was. The attacker's
 * save: seed 611 at rung 5 with 13 works, played on the shipped content at stage 2 (__fixtures__/x6-r5.json). Owner: the
 * loop (s2-fix-loop).
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { shipped2Config } from '../fixtures/shipped2';
import { away, newBot, newSitting, playTo, seededCfg } from './bot';
import { reconcileSalvage } from './save';
import { jump } from './tick';
import type { SalvageConfig, SalvageGame } from './types';

const FX = JSON.parse(fs.readFileSync(new URL('./__fixtures__/x6-r5.json', import.meta.url), 'utf8')) as { seed: number; now: number; g: SalvageGame };
const RAW = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8'));
const cfg1 = seededCfg({ mode: 'salvage', salvage: SalvageSchema.parse(RAW.salvage), monetization: RAW.monetization } as unknown as SalvageConfig, FX.seed);
const cfg2 = seededCfg(shipped2Config(SalvageSchema.parse), FX.seed);
const STAGE2_AT = new Set(['rack', 'corner', 'crate', 'lot', 'elvPad', 'apron', 'canopy']);
const STAGE2_TICKETS = new Set(['rackSale', 'vanCollection', 'crateLot', 'plateWeighIn', 'lotWeighIn', 'pour', 'ingot']);
const load = (cfg: SalvageConfig, g: SalvageGame, now: number) => reconcileSalvage(cfg, { ...g, salvage: undefined } as never, JSON.parse(JSON.stringify(g)), now);
const saved = (g: SalvageGame) => JSON.parse(JSON.stringify(g)) as SalvageGame;

/** Nothing of stage 2 runs or shows in this state (the first yard's view). */
function dark(cfg: SalvageConfig, g: SalvageGame): string[] {
  const s = g.salvage;
  const out: string[] = [];
  if (s.counts?.bathSet !== undefined) out.push('bathSet');
  if (Object.keys(s.works).length) out.push(`works ${Object.keys(s.works).length}`);
  if (s.lots.nextAt !== null || s.lots.n !== 0) out.push('lots');
  if (s.reuse.nextAt !== null || s.reuse.vanAt !== null) out.push('reuse');
  if (s.bank.agreement) out.push('bank');
  if (s.forklift) out.push('forklift');
  if (s.ladder.rung > 3) out.push(`rung ${s.ladder.rung}`);
  for (const th of s.things) if (STAGE2_AT.has(th.at.at) || !cfg.salvage.objects[th.obj]) out.push(`thing ${th.uid} ${th.obj} at ${th.at.at}`);
  for (const p of s.pieces) if (!cfg.salvage.grades[p.grade]) out.push(`piece ${p.grade}`);
  for (const gr of Object.keys(s.bays)) if (!cfg.salvage.grades[gr]) out.push(`bay ${gr}`);
  for (const id of Object.keys(s.partners)) if (!cfg.salvage.partners[id]) out.push(`partner ${id}`);
  return out;
}

describe('X6: a stage-2 save at a stage-1 build is kept and frozen', () => {
  it('the attacker\'s save (rung 5, 13 works) at release.stage 1: a day of play and two absences; nothing of stage 2 runs; then at stage 2 the works as saved, and it goes on', () => {
    expect(cfg1.salvage.release?.stage).toBe(1);
    const r5 = FX.g;
    expect(r5.salvage.ladder.rung).toBe(5);
    expect(Object.keys(r5.salvage.works).length).toBe(13);
    const g1 = load(cfg1, r5, r5.salvage.clock.highMs);
    expect(dark(cfg1, g1)).toEqual([]);
    const F0 = JSON.stringify(g1.salvage.stage2Frozen);
    expect(g1.salvage.stage2Frozen?.v).toBe(1);
    expect(Object.keys((g1.salvage.stage2Frozen!.fields as { works: object }).works).length).toBe(13);
    // A day at the twice-a-day habit, at stage 1: two sittings of 15 minutes and two absences of 11.75 hours.
    const b = newBot(cfg1, g1, r5.salvage.clock.highMs, { seed: FX.seed, hand: 'normal', habit: 'goal', route: 'A' } as Parameters<typeof newBot>[3]);
    const tickets0 = g1.salvage.ticketNo;
    for (let k = 0; k < 2; k++) {
      playTo(b, b.g.salvage.t + 900);
      expect(dark(cfg1, b.g)).toEqual([]);
      newSitting(b);
      away(b, 11.75 * 3600);
      expect(dark(cfg1, b.g)).toEqual([]);
    }
    const g1b = saved(b.g);
    // The aside never moved; no ticket of the stage was printed; the first yard earned.
    expect(JSON.stringify(g1b.salvage.stage2Frozen)).toBe(F0);
    expect(g1b.salvage.tickets.filter((tk) => STAGE2_TICKETS.has((tk as { kind: string }).kind) && tk.no > tickets0)).toEqual([]);
    expect(g1b.lifetimeEarnings).toBeGreaterThan(r5.lifetimeEarnings);
    // Loaded again at stage 1: still frozen, the aside as it was.
    const again = load(cfg1, g1b, g1b.salvage.clock.highMs);
    expect(JSON.stringify(again.salvage.stage2Frozen)).toBe(F0);
    expect(dark(cfg1, again)).toEqual([]);
    // Loaded at stage 2: the works as saved (plates, owned, levels, phases), bathSet, the rung; the aside gone.
    const g2 = load(cfg2, g1b, g1b.salvage.clock.highMs);
    expect(g2.salvage.stage2Frozen).toBeUndefined();
    expect(g2.salvage.counts?.bathSet).toBe(r5.salvage.counts?.bathSet);
    expect(g2.salvage.ladder.rung).toBe(5);
    expect(g2.salvage.tier).toBe(r5.salvage.tier);
    const plates = (w: SalvageGame['salvage']['works']) => Object.fromEntries(Object.entries(w).map(([id, p]) => [id, [p.owned, p.level, p.phase]]));
    expect(plates(g2.salvage.works)).toEqual(plates(r5.salvage.works));
    expect(Object.keys(g2.salvage.partners).sort()).toEqual(Object.keys(r5.salvage.partners).sort());
    for (const id of ['partner.garage', 'partner.plumbing']) expect(g2.salvage.partners[id]?.level).toBe(r5.salvage.partners[id]?.level);
    expect(g2.salvage.bank).toEqual(r5.salvage.bank);
    // The stage's things are back (the rack, the picking table, the pad), none claimed.
    const at = (g: SalvageGame) => g.salvage.things.filter((th) => STAGE2_AT.has(th.at.at)).length;
    expect(at(g2)).toBe(at(r5));
    expect(g2.salvage.things.filter((th) => STAGE2_AT.has(th.at.at)).every((th) => th.by === null)).toBe(true);
    // Every uid once.
    const uids = [...g2.salvage.things.map((th) => th.uid), ...g2.salvage.pieces.map((p) => p.uid)];
    expect(new Set(uids).size).toBe(uids.length);
    // It goes on: ten minutes at stage 2 move the works, no throw.
    const g3 = jump(cfg2, g2, g2.salvage.t + 600);
    expect(JSON.stringify(g3.salvage.works)).not.toBe(JSON.stringify(g2.salvage.works));
  }, 600_000);

  it('a save that never saw stage 2 loads at stage 1 as before (no aside)', () => {
    const g = saved(FX.g);
    delete g.salvage.counts!.bathSet;
    g.salvage.works = {};
    const out = load(cfg1, g, g.salvage.clock.highMs);
    expect(out.salvage.stage2Frozen).toBeUndefined();
  });
});
