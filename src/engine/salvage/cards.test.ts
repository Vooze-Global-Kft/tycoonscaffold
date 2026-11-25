/**
 * cards.ts (4.3): every card of every frozen state is data: each row has a state, every key printed is
 * a text key, every refusal key has its text, every button's price is the purchase check's price (the
 * one the action applies), and when the simulation's action exists, pressing it charges exactly that.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../fixtures/salvage';
import * as R from '../salvage';
import { cardOf, processBoardOf, topBarOf } from './cards';
import { buyCheck, hireCheck, levelCheck } from './ladder';
import type { CardAction, CardData, CardRef, SalvageGame } from './types';
import { REFUSAL_KEYS, TEXT_KEYS } from './types';

const cfg = withTestContent(GameConfigSchema.parse(gameJson));
const base = () => E.createInitialState(cfg, FIXTURE_NOW);
const KEYS = new Set<string>(Object.values(TEXT_KEYS).flat());

const REFS: CardRef[] = [
  ...Object.keys(cfg.salvage.map.places).map((place) => ({ kind: 'place', place }) as CardRef),
  { kind: 'machine', machine: 'hand_stripper' },
  { kind: 'machine', machine: 'stripper' },
  { kind: 'machine', machine: 'bench' },
  { kind: 'machine', machine: 'crucible' },
  { kind: 'office', tab: 'rota' },
  { kind: 'office', tab: 'partners' },
  { kind: 'office', tab: 'processBoard' },
  { kind: 'board' },
  { kind: 'bay', grade: 'ci' },
  { kind: 'skip', partner: 'partnerFarm' },
  { kind: 'skip', partner: 'partnerDemolition' },
  { kind: 'deal' },
  { kind: 'table' },
  { kind: 'processBoard' },
  { kind: 'away' },
  { kind: 'rung', n: 2 },
  { kind: 'clipboard' },
  { kind: 'settings' },
  { kind: 'help' },
];

/** Every { key } of a value, walked. */
function keysOf(x: unknown, out: string[] = []): string[] {
  if (Array.isArray(x)) for (const v of x) keysOf(v, out);
  else if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if (typeof o.key === 'string' && ('args' in o || Object.keys(o).length === 1)) out.push(o.key);
    if (typeof o.text === 'string' && Object.keys(o).length === 1) out.push(o.text);
    for (const v of Object.values(o)) keysOf(v, out);
  }
  return out;
}

/** Every button (rows, foot, plates, board rows) with its row state when it has one. */
function buttonsOf(d: CardData): { action: CardAction; state?: string; refusal: unknown }[] {
  const out: { action: CardAction; state?: string; refusal: unknown }[] = [];
  for (const r of d.rows) if (r.button) out.push({ action: r.button.action, state: r.state, refusal: r.button.refusal });
  for (const b of d.foot) out.push({ action: b.action, refusal: b.refusal });
  for (const row of d.processBoard?.rows ?? []) for (const p of row.plates) if (p.button) out.push({ action: p.button.action, refusal: p.button.refusal });
  return out;
}

const checkOf = (g: SalvageGame, a: CardAction) => (a.act === 'buy' ? buyCheck(cfg, g, a.item) : a.act === 'hire' ? hireCheck(cfg, g, a.role) : a.act === 'level' ? levelCheck(cfg, g, a.target) : null);

describe('every card of every frozen state', () => {
  for (const name of FIXTURE_NAMES) {
    it(`${name}: rows have states, keys exist, prices are the checks' prices`, () => {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      for (const ref of REFS) {
        const d = cardOf(cfg, g, ref, FIXTURE_NOW);
        for (const r of d.rows) expect(r.state, `${name} ${JSON.stringify(ref)} ${r.id}`).toBeDefined();
        for (const k of keysOf(d)) expect(KEYS.has(k), `${name} ${JSON.stringify(ref)}: ${k}`).toBe(true);
        for (const b of buttonsOf(d)) {
          const ch = checkOf(g, b.action);
          if (!ch) continue;
          expect((b.action as { price: number }).price, `${name} ${JSON.stringify(b.action)}`).toBe(ch.price);
          if (b.state === 'cantAfford') expect(b.refusal).not.toBeNull();
          if (b.state === 'buy') expect(b.refusal).toBeNull();
        }
      }
    });
  }
  it('every refusal key has its text', () => {
    for (const k of REFUSAL_KEYS) expect(KEYS.has(`refusal.${k}`)).toBe(true);
  });
  it('a gated item shows its padlock line and no button; an unaffordable one its cash refusal', () => {
    const g = fixtureGame('fresh', base(), FIXTURE_NOW) as SalvageGame;
    const rack = cardOf(cfg, g, { kind: 'place', place: 'rack' }, FIXTURE_NOW);
    const torch = rack.rows.find((r) => r.id === 'torch')!;
    expect(torch.state).toBe('locked');
    expect(torch.button).toBeNull();
    expect(torch.line?.key).toBe('refusal.rung');
    const sack = rack.rows.find((r) => r.id === 'sack')!;
    expect(sack.state).toBe(g.cash >= 50 ? 'buy' : 'cantAfford');
    if (sack.state === 'cantAfford') expect(sack.button?.refusal?.key).toBe('refusal.cash');
  });
  it('pressing a card button charges exactly its price (when the simulation has the action)', () => {
    for (const name of FIXTURE_NAMES) {
      const g0 = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      const g = { ...g0, cash: 1e7 };
      for (const ref of REFS) {
        const d = cardOf(cfg, g, ref, FIXTURE_NOW);
        for (const b of buttonsOf(d)) {
          const a = b.action;
          if (a.act !== 'buy' && a.act !== 'hire' && a.act !== 'level') continue;
          const ev: R.SalvageEvent[] = [];
          const after = a.act === 'buy' ? R.buy(cfg, g, a.item, a.price, g.salvage.t, ev) : a.act === 'hire' ? R.hire(cfg, g, a.role, a.price, g.salvage.t, ev) : R.level(cfg, g, a.target, a.price, g.salvage.t, ev);
          const refused = ev.find((e) => e.type === 'refused');
          if (refused) {
            expect(refused.type === 'refused' && ['notBuilt', 'ceiling'].includes(refused.key), `${name} ${JSON.stringify(a)} refused ${JSON.stringify(refused)}`).toBe(true);
            continue;
          }
          expect(R.roundMoney(g.cash - after.cash), `${name} ${JSON.stringify(a)}`).toBe(a.price);
        }
      }
    }
  });
  it('the top bar and the process board read each frozen state', () => {
    for (const name of FIXTURE_NAMES) {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      const t = topBarOf(cfg, g);
      expect(t.of).toBe(26);
      expect(t.rank).toBeGreaterThanOrEqual(1);
      const b = processBoardOf(cfg, g);
      expect(b.rows.map((r) => r.id)).toEqual(['cable', 'motors', 'melt', 'greyed']);
      expect(b.rows[3].plates.every((p) => p.state === 'greyed' && p.line === null && p.button === null)).toBe(true);
    }
  });
});
