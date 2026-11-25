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

describe('a skip still filling (strings 16:45; 2.7: its contents are fixed when it fills)', () => {
  it('prints no net and no price, on its card and on the Partners tab', () => {
    let checked = 0;
    for (const n of FIXTURE_NAMES) {
      const g0 = fixtureGame(n, base(), FIXTURE_NOW);
      for (const [pid, p] of Object.entries(g0.salvage.partners)) {
        if (!p.open || !p.skips.length) continue;
        const sk0 = p.skips[0];
        const sk = { ...sk0, phase: 'filling' as const, trial: false, setAt: g0.salvage.t, fullAt: g0.salvage.t + 60, contents: {}, mass_g: 0, price: 0 };
        const g: SalvageGame = { ...g0, salvage: { ...g0.salvage, partners: { ...g0.salvage.partners, [pid]: { ...p, skips: [sk, ...p.skips.slice(1)] } } } };
        const card = cardOf(cfg, g, { kind: 'skip', partner: pid, slot: sk.slot } as CardRef, g.salvage.clock.highMs);
        const keys = JSON.stringify(card.lead ?? []);
        expect(keys, `${n} ${pid}`).not.toContain('card.skipNet');
        expect(keys, `${n} ${pid}`).not.toContain('card.skipPrice');
        const tab = cardOf(cfg, g, { kind: 'office', tab: 'partners' }, g.salvage.clock.highMs);
        const r = tab.rows.find((x) => x.id === `${pid}.${sk.slot}`);
        if (r) expect(r.extra, `${n} ${pid}`).toBeNull();
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
  it('a duration never breaks inside itself (no-break spaces)', () => {
    for (const s of [5, 250, 3 * 3600 + 12 * 60]) expect(R.fmtDuration(s)).not.toMatch(/ /);
  });
});

describe('fix pass: the away card (P3), the rung box and tiles (P17, S10), rows without rates (W5), machine cards (W7)', () => {
  const g = (name: string) => fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
  it('the away card: net = sales − loads bought; held (unpaid) lines never listed; at most three; a next step while a goal is open', () => {
    const b = g('back');
    expect(b.salvage.away).toBeTruthy();
    const away = { ...b.salvage.away!, money: 1000, spent: 300, bought: [{ partner: 'partnerFarm', n: 3, spent: 200 }, { partner: 'partnerDemolition', n: 1, spent: 100 }], lines: [
      { grade: 'li', g: 1e6, money: 400 }, { grade: 'ci', g: 2e7, money: 0 }, { grade: 'bb', g: 1e5, money: 500 }, { grade: 'no2', g: 1e5, money: 50 }, { grade: 'brs', g: 1e5, money: 40 }, { grade: 'alw', g: 1e5, money: 30 }, { grade: 'mot', g: 1e5, money: 20 },
    ] };
    const v = R.awayView(cfg, { ...b, salvage: { ...b.salvage, away } } as SalvageGame)!;
    expect(v.sales).toBe(1000);
    expect(v.boughtTotal).toEqual({ n: 4, money: 300 });
    expect(v.bought.length).toBe(2);
    expect(v.net).toBe(700);
    expect(v.lines.map((l) => l.grade)).toEqual(['bb', 'li', 'no2', 'brs', 'alw']);
    expect(v.lines.some((l) => l.money <= 0)).toBe(false);
    expect(v.more).toBe(1);
    if (R.nextGoal(cfg, b)) expect(v.next).toEqual(R.nextGoal(cfg, b)!.text);
    expect(R.awayView(cfg, g('m5'))).toBe(null);
    // Nothing spent: no "loads bought" line, net = sales.
    const v0 = R.awayView(cfg, { ...b, salvage: { ...b.salvage, away: { ...b.salvage.away!, money: 80, spent: 0, net: 80, bought: [] } } } as SalvageGame)!;
    expect(v0.net).toBe(v0.sales);
    expect(v0.boughtTotal).toBe(null);
  });
  for (const name of FIXTURE_NAMES) {
    it(`${name}: the rung box prints the player's own figures; tiles past the stage carry no "Opens"`, () => {
      const s = g(name);
      const p = R.rungProgress(cfg, s);
      expect(p.own.args?.t).toEqual({ tonnes_g: s.salvage.ladder.supplied_g });
      if (p.rung >= 3) expect(p.next).toBe(null);
      const tiles = R.rungTiles(cfg, s);
      for (const t of tiles) {
        if (t.n > 3) expect(t.inStage).toBe(false);
        if (!t.inStage || t.open) expect(t.line).toBe(null);
        else expect(t.line?.key).toBe('table.locked');
      }
    });
    it(`${name}: no row of the rota, the partners or a machine card prints a rate an hour or a second (W5)`, () => {
      const s = g(name);
      const refs: CardRef[] = [{ kind: 'office', tab: 'rota' }, { kind: 'office', tab: 'partners' }, { kind: 'machine', machine: 'hand_stripper' }, { kind: 'machine', machine: 'stripper' }, { kind: 'machine', machine: 'bench' }, { kind: 'machine', machine: 'crucible' }];
      for (const ref of refs) {
        const d = cardOf(cfg, s, ref, FIXTURE_NOW);
        for (const r of d.rows) for (const t of [r.name, r.line, r.extra]) {
          if (!t) continue;
          expect(['card.carriesRate', 'card.cutsRate', 'card.levelAdds', 'card.rateKgS', 'card.rate'], `${ref.kind} ${r.id}`).not.toContain(t.key);
          for (const a of Object.values(t.args ?? {})) expect('rate_g_h' in a, `${r.id}`).toBe(false);
        }
      }
    });
    it(`${name}: a machine card lists every output largest first, and its status row is named by the machine (W7)`, () => {
      const s = g(name);
      const d = cardOf(cfg, s, { kind: 'place', place: 'stripper' }, FIXTURE_NOW);
      for (const m of d.machines ?? []) {
        if (m.machine === 'bench') expect(m.out.length).toBe(cfg.salvage.machines.bench.out.filter(([, sh]) => sh > 0).length);
        const st = d.rows.find((r) => r.id === `${m.machine}.status`);
        if (st) expect(st.name.key).toBe(m.machine === 'hand_stripper' ? 'item.handStripper' : `item.${m.machine}`);
      }
      const bench = cardOf(cfg, s, { kind: 'machine', machine: 'bench' }, FIXTURE_NOW).machines![0];
      const share = new Map(cfg.salvage.machines.bench.out);
      for (let i = 1; i < bench.out.length; i++) expect(share.get(bench.out[i - 1])!).toBeGreaterThanOrEqual(share.get(bench.out[i])!);
      expect(R.inOutTxt(bench).key).toBe(bench.out.length >= 3 ? 'card.inOut3' : bench.out.length === 2 ? 'card.inOut2' : 'card.inOut');
    });
  }
});
