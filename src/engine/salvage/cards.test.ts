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
// C-CARDS-a (PLAN2 2.1, batch 0c): the works' card data.
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import { stage2Cfg, stage2Game } from '../fixtures/salvage';
import { lots4, r3Works, r4Game, rackFull, worksCfg, worksContent } from '../fixtures/salvage2works';
import { shipped2Config } from '../fixtures/shipped2';
import { cardOfCfg } from './cards';
import { padCardOf } from './cardsWorks';
import { frameCfg } from './frame';
import { heatView } from './heatView';
import { contentAt, worksOpened } from './layer';
import { measuredGain, shopItems } from './ladder';
import { jump } from './tick';
import type { CardRow, SalvageConfig, WorksCard } from './types';

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
  const g = (name: (typeof FIXTURE_NAMES)[number]) => fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
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
          // The rate keys are deleted (join3): no text key prints a rate; no argument carries one.
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

// ============================================================================ C-CARDS-a (PLAN2 2.1, batch 0c): the works' card data
//
// On the frozen states r3 and held14 (stage 2's content, the works not yet open) and the first yard's frozen states: nothing
// added. On hand-built rung-3 and rung-4 states of the works' frozen test content (fixtures/salvage2works.ts r3Works, r4Game,
// lots4, rackFull, a hall set to each phase, the shredder line fed by the garage's recovery truck): WorksCard.heat is the
// frame's object; every unbought sold plate, rack and park Buy row carries what it earns (the content's measured gain and the
// Buy's own price over it); the line's car and recovery are the frame's; LotCard's tier; the pad's card. No tuned number of
// game.json is pinned: the shipped content is read only for "every Buy row carries earns".

const W = worksCfg();
const NOW2 = FIXTURE_NOW;
const C2 = (k: SalvageConfig, g: SalvageGame) => contentAt(k.salvage, g.salvage);

function edit2(g: SalvageGame, f: (s: SalvageGame['salvage']) => void, cash = g.cash): SalvageGame {
  const s = structuredClone(g.salvage) as SalvageGame['salvage'];
  f(s);
  return { ...g, cash, salvage: s };
}

/** The works' test content with a measured gain on every plate and every works-layer item that is not a plate (distinct round numbers). */
let EARNS: SalvageConfig | null = null;
function earnsCfg(): SalvageConfig {
  if (EARNS) return EARNS;
  const c = structuredClone(worksContent()) as SalvageContent & { works: NonNullable<SalvageContent['works']>; worksLayer: NonNullable<SalvageContent['worksLayer']> };
  let k = 0;
  for (const id of Object.keys(c.works.plates)) (c.works.plates[id] as { gain_h?: number }).gain_h = 100 + 10 * k++;
  c.worksLayer.shop = c.worksLayer.shop.map((it) => (it.kind !== 'works' ? { ...it, gain_h: 500 + 10 * k++ } : it));
  return (EARNS = { ...W, salvage: { ...c, worldSeed: W.salvage.worldSeed } } as unknown as SalvageConfig);
}

/** The works' test content with the shredder line fed by the garage's own recovery truck (frameWorks.test.ts lineCfg's shape). */
let LINE2: SalvageConfig | null = null;
function lineCfg2(): SalvageConfig {
  if (LINE2) return LINE2;
  const c = structuredClone(worksContent()) as SalvageContent & { works: NonNullable<SalvageContent['works']>; worksLayer: NonNullable<SalvageContent['worksLayer']> };
  (c.works.plates.depollution as { feedBy: string }).feedBy = 'truck';
  (c.works.plates.shredder as { with?: string[] }).with = ['depollution'];
  const partners = c.worksLayer.partners as Record<string, { recovery?: unknown; grows?: { body?: string }[] }>;
  const pid = Object.keys(partners).find((p) => p.includes('garage')) ?? Object.keys(partners)[0];
  partners[pid].recovery = { needs: 'shredder', obj: 'elv', period_s: 600 };
  partners[pid].grows = (partners[pid].grows ?? []).filter((x) => x.body !== 'flatrack');
  return (LINE2 = { ...W, salvage: { ...c, worldSeed: W.salvage.worldSeed } } as unknown as SalvageConfig);
}

/** r4 on the line's content with the depollution bay running: no car (landed `ago` s back, or never), one whole on the apron, or draining. */
function lineState2(car: 'none' | 'whole' | 'draining', ago: number | null, cash?: number): SalvageGame {
  return edit2(
    r4Game(),
    (s) => {
      const t = s.t;
      s.works.depollution = {
        owned: true, level: 1, hopper: [], work: null, tray_g: {}, trayClaim_g: {}, status: car === 'draining' ? 'working' : 'idle', since: t - 1000,
        plate: 'depollution', phase: 'running', commissionAt: null, commissionedBy: 'self', car: null,
        ...(ago !== null ? { carLandedAt: t - ago } : {}),
      } as SalvageGame['salvage']['works'][string];
      if (car !== 'none') {
        s.things.push({ uid: 'fcar', obj: 'elv', at: { at: 'apron', plate: 'depollution' }, cut: 0, progress: 0, by: car === 'draining' ? 'depollution' : null, sender: 'partner.garage' });
        if (car === 'draining') s.works.depollution.car = { thing: 'fcar', t0: t - 5, end: t + 55 };
      }
    },
    cash,
  );
}

/** r4's rotary hall set to a phase of its heat by hand (the heat's own fields, as halls.ts writes them). */
function hallAt2(phase: 'empty' | 'filling' | 'heating' | 'ready' | 'cooling' | 'pinned'): SalvageGame {
  return edit2(r4Game(), (s) => {
    const w = s.works.rotary;
    const h = w.heat!;
    const t = s.t;
    h.charge_g = 0;
    h.chargeBy = {};
    h.endsAt = null;
    h.phaseSince = t;
    h.phase = phase === 'pinned' ? 'empty' : phase;
    if (phase === 'pinned') h.pinned = true;
    if (phase === 'filling') (h.charge_g = 30_000), (h.chargeBy = { alcast: 30_000 });
    if (phase === 'heating' || phase === 'ready') (h.charge_g = 100_000), (h.chargeBy = { alcast: 100_000 }), (h.endsAt = t + 50);
    if (phase === 'ready') h.firstPoured = false;
    if (phase === 'cooling') (h.firstPoured = true), (h.cooling = { grade: 'ali', n: 0, short_g: 0, since: t - 1, by: 'boss' });
  });
}

const worksRef = (plate: string): CardRef => ({ kind: 'works', plate }) as CardRef;
const NEW_WORKS_FIELDS = ['heat', 'earns', 'recovery', 'car'] as const;

/** Every row of every card of the state (REFS plus the works' kinds), with the card's ref. */
function allRows(k: SalvageConfig, g: SalvageGame): { ref: CardRef; r: CardRow }[] {
  const out: { ref: CardRef; r: CardRow }[] = [];
  for (const ref of REFS) for (const r of cardOfCfg(k, g, ref, NOW2).rows) out.push({ ref, r });
  return out;
}

describe('C-CARDS-a: below the works\' opening nothing is added (r3, held14 and the first yard\'s frozen states)', () => {
  const states: [string, SalvageConfig, SalvageGame][] = [
    ['r3', stage2Cfg('r3'), stage2Game('r3')],
    ['held14', stage2Cfg('held14'), stage2Game('held14')],
    ...FIXTURE_NAMES.map((n) => [n, cfg, fixtureGame(n, base(), FIXTURE_NOW) as SalvageGame] as [string, SalvageConfig, SalvageGame]),
  ];
  for (const [name, k, g] of states)
    it(`${name}: no row carries earns, no works card carries heat, earns, recovery or car, no lot card a pad`, () => {
      expect(worksOpened(g.salvage)).toBe(false);
      for (const { ref, r } of allRows(k, g)) expect('earns' in r, `${name} ${JSON.stringify(ref)} ${r.id}`).toBe(false);
      for (const plate of Object.keys(C2(k, g).works?.plates ?? {})) {
        const w = cardOfCfg(k, g, worksRef(plate), NOW2).works;
        for (const f of NEW_WORKS_FIELDS) expect(w && f in w, `${name} ${plate} ${f}`).toBeFalsy();
      }
      const lot = cardOfCfg(k, g, { kind: 'lot' } as unknown as CardRef, NOW2);
      if (!C2(k, g).lots) expect(lot.pad).toBeUndefined();
    });
});

describe('C-CARDS-a: WorksCard.heat is the frame\'s own object (heatView.ts)', () => {
  const states: [string, SalvageGame][] = [['r4', r4Game()], ...(['empty', 'filling', 'heating', 'ready', 'cooling', 'pinned'] as const).map((p) => [`rotary ${p}`, hallAt2(p)] as [string, SalvageGame])];
  for (const [name, g] of states)
    it(`${name}: every running hall's card heat equals heatView and the frame's plot heat; no heat on another kind`, () => {
      const c = C2(W, g);
      const f = frameCfg(W, g);
      let halls = 0;
      for (const plate of Object.keys(c.works!.plates)) {
        const w = cardOfCfg(W, g, worksRef(plate), NOW2).works!;
        if (w.plate !== plate) continue;
        const hv = heatView(c, g.salvage, plate);
        if (c.works!.plates[plate].kind === 'batch' && hv) {
          halls++;
          expect(w.heat, `${name} ${plate}`).toEqual(hv);
          expect(w.heat).toEqual(f.works?.find((p) => p.plate === plate)?.heat);
        } else expect('heat' in w, `${name} ${plate}`).toBe(false);
      }
      expect(halls).toBeGreaterThan(0);
    });
  it('a hall not yet running (r3Works: nothing bought) has no heat', () => {
    const g = r3Works();
    for (const plate of ['rotary', 'induction', 'smelter']) expect(cardOfCfg(W, g, worksRef(plate), NOW2).works!.heat).toBeUndefined();
  });
});

describe('C-CARDS-a: every works, rack and park Buy row carries what it earns (RULING2 28.5 b; critic I11)', () => {
  /** The earns of a Buy: the content's measured gain and the Buy's own price over it. */
  const expectEarns = (k: SalvageConfig, g: SalvageGame, item: string, price: number, got: unknown, where: string) => {
    const gain = measuredGain(C2(k, g), item)!;
    expect(gain, where).toBeGreaterThan(0);
    expect(got, where).toEqual({ gain_h: gain, payback_h: price / gain });
  };
  for (const cash of [0, 1316, 1e6])
    it(`a measured gain on every item (r3Works, cash ${cash}): each unbought sold plate's card and each rack and park Buy row`, () => {
      const k = earnsCfg();
      const g = { ...r3Works(), cash };
      let buys = 0;
      for (const plate of Object.keys(C2(k, g).works!.plates)) {
        const w = cardOfCfg(k, g, worksRef(plate), NOW2).works!;
        if (w.state === 'buyable') {
          expect(w.foot.buy, plate).not.toBeNull();
          expectEarns(k, g, w.plate, (w.foot.buy!.action as { price: number }).price, w.earns, plate);
          buys++;
        } else expect(w.earns ?? null, `${plate} ${w.state}`).toBeNull();
      }
      expect(buys).toBeGreaterThan(0);
      let rows = 0;
      for (const place of ['rack', 'park']) {
        for (const r of cardOfCfg(k, g, { kind: 'place', place } as CardRef, NOW2).rows) {
          if (!r.button || r.button.action.act !== 'buy') continue;
          expectEarns(k, g, r.button.action.item, r.button.action.price, r.earns, `${place} ${r.id}`);
          rows++;
        }
      }
      // the plasma at the rack and the hook-lift at the park are among them
      expect(rows).toBeGreaterThanOrEqual(2);
    });
  it('the plates bought (r4): no works card of an ordered plate carries earns', () => {
    const k = earnsCfg();
    const g = r4Game();
    let owned = 0;
    for (const plate of Object.keys(C2(k, g).works!.plates)) {
      const w = cardOfCfg(k, g, worksRef(plate), NOW2).works!;
      if (w.state !== 'buyable') (owned++, expect(w.earns ?? null, plate).toBeNull());
    }
    expect(owned).toBeGreaterThan(0);
  });
  it('no measured gain in the content (the plain test content): earns is null, never a figure of the replay', () => {
    const g = { ...r3Works(), cash: 1e6 };
    for (const plate of Object.keys(C2(W, g).works!.plates)) {
      const w = cardOfCfg(W, g, worksRef(plate), NOW2).works!;
      expect(w.earns ?? null, plate).toBeNull();
    }
    for (const place of ['rack', 'park']) for (const r of cardOfCfg(W, g, { kind: 'place', place } as CardRef, NOW2).rows) if (r.button?.action.act === 'buy') expect(r.earns, r.id).toBeNull();
  });
  it('the shipped content at the works\' opening: every Buy of a sold item carries earns, and nothing dark is listed at the rack or the park', () => {
    const k = shipped2Config((x) => SalvageSchema.parse(x));
    const g0 = stage2Game('r3');
    const g = { ...jump(k, g0, g0.salvage.t + 0.01), cash: 1e7 };
    expect(worksOpened(g.salvage)).toBe(true);
    const c = C2(k, g);
    let n = 0;
    for (const plate of Object.keys(c.works!.plates)) {
      const w = cardOfCfg(k, g, worksRef(plate), NOW2).works!;
      if (w.foot.buy) (n++, expect(w.earns, plate).not.toBeNull());
    }
    const top = c.ladder.topRung ?? 5;
    for (const place of ['rack', 'park'])
      for (const r of cardOfCfg(k, g, { kind: 'place', place } as CardRef, NOW2).rows) {
        const it = shopItems(c).find((i) => i.key === r.id);
        if (it?.gate) expect(Number(/^rung(\d+)$/.exec(it.gate)?.[1] ?? 0), `${place} ${r.id} is dark`).toBeLessThanOrEqual(top);
        if (r.button?.action.act === 'buy') (n++, expect(r.earns, `${place} ${r.id}`).not.toBeNull());
      }
    expect(n).toBeGreaterThanOrEqual(3);
  });
  it('a level row reads the list\'s one I: every level Buy\'s price is levelCheck\'s own (r4 and the works\' states)', () => {
    for (const g of [r4Game(), { ...r3Works(), cash: 1e6 }, rackFull()]) {
      for (const ref of REFS) {
        const d = cardOfCfg(W, g, ref, NOW2);
        for (const b of buttonsOf(d)) if (b.action.act === 'level') expect(b.action.price, JSON.stringify(b.action)).toBe(levelCheck(W, g, b.action.target).price);
      }
    }
  });
});

describe('C-CARDS-a: the line\'s car and its recovery truck (cards contract C4)', () => {
  const cases: [string, SalvageGame][] = [
    ['no car yet', lineState2('none', null)],
    ['period', lineState2('none', 100)],
    ['cash short', lineState2('none', 1000, 0)],
    ['apron taken', lineState2('whole', 100)],
    ['draining', lineState2('draining', 100)],
  ];
  for (const [name, g] of cases)
    it(`${name}: recovery is the frame's line.recovery; car only while draining, with the drain's end`, () => {
      const k = lineCfg2();
      const w = cardOfCfg(k, g, worksRef('depollution'), NOW2).works!;
      expect(w.plate).toBe('depollution');
      const f = frameCfg(k, g);
      expect(f.line).toBeDefined();
      expect(w.recovery).toEqual(f.line!.recovery);
      expect(w.recovery!.arrivesAt).toBeNull();
      expect(w.recovery!.waitsFor).not.toBe('coming');
      if (name === 'draining') {
        const src = (C2(k, g).objects.elv as { source?: { ref?: string } }).source?.ref ?? 'fcar';
        expect(w.car).toEqual({ thing: 'fcar', ref: src, endsAt: g.salvage.works.depollution.car!.end });
      } else expect(w.car).toBeNull();
      if (name === 'apron taken') expect(w.recovery!.waitsFor).toBe('apron');
      if (name === 'period') expect(w.recovery!.waitsFor).toBe('period');
      if (name === 'cash short') expect(w.recovery!.waitsFor === 'cash' ? w.recovery!.short : 1).toBeGreaterThan(0);
    });
  it('a plate that no truck feeds carries no recovery and no car', () => {
    const g = r4Game();
    for (const plate of ['shredder', 'baler', 'rotary']) {
      const w = cardOfCfg(W, g, worksRef(plate), NOW2).works! as WorksCard;
      expect('recovery' in w || 'car' in w, plate).toBe(false);
    }
  });
});

describe('C-CARDS-a: an oversize piece\'s tier and the pad\'s card (cards contract C5)', () => {
  it('lots4: each piece names the tier it needs and that the yard\'s tier reaches it; at a lower tier it does not', () => {
    const g = lots4();
    const c = C2(W, g);
    for (let k = 0; k < 4; k++) {
      const lot = cardOfCfg(W, g, { kind: 'lot', k }, NOW2).lot!;
      expect(lot.needsTier).toBe(c.objects[lot.obj].tier);
      expect(lot.tierOwned).toBe(c.objects[lot.obj].tier <= g.salvage.tier);
      expect(lot.tierOwned).toBe(true);
    }
    const low = edit2(g, (s) => void (s.tier = 3));
    expect(cardOfCfg(W, low, { kind: 'lot', k: 0 }, NOW2).lot!.tierOwned).toBe(false);
  });
  it('{kind:"lot"} without a piece is kind "lot" with the pad filled and no lot; its n and max are the frame\'s', () => {
    for (const g of [lots4(), r3Works(), r4Game()]) {
      const d = cardOfCfg(W, g, { kind: 'lot' } as unknown as CardRef, NOW2);
      expect(d.kind).toBe('lot');
      expect(d.lot).toBeUndefined();
      expect(d.pad).toEqual(padCardOf(W, g));
      const f = frameCfg(W, g);
      expect(d.pad!.n).toBe(f.pad!.n);
      expect(d.pad!.max).toBe(f.pad!.max);
      expect(d.pad!.incoming).toBeNull();
      const next = g.salvage.lots.nextAt;
      expect(d.pad!.nextInS).toBe(next === null ? null : Math.max(0, next - g.salvage.t));
    }
  });
  it('a piece no longer on the pad opens the pad\'s card', () => {
    const d = cardOfCfg(W, r3Works(), { kind: 'lot', k: 3 }, NOW2);
    expect(d.lot).toBeUndefined();
    expect(d.pad).toBeDefined();
  });
  it('waitsForTier: the lowest tier a kind needs while no kind the yard has a line for can be opened (r3Works: tier 3, every kind tier 4); null once one can', () => {
    const g = r3Works();
    const c = C2(W, g);
    const pad = padCardOf(W, g)!;
    const lineKinds = c.lots!.kinds.filter((k) => k.line.length === 0 || k.line.some((id) => (g.salvage.machines as Record<string, { owned: boolean }>)[id]?.owned || g.salvage.works[id]));
    const tiers = lineKinds.map((k) => c.objects[k.obj].tier);
    if (tiers.every((t) => t > g.salvage.tier)) expect(pad.waitsForTier).toBe(Math.min(...tiers));
    expect(padCardOf(W, lots4())!.waitsForTier).toBeNull();
    // the frame says the same: no kind to open
    expect(frameCfg(W, g).pad!.why?.key === 'plate.pad.noKind').toBe(pad.waitsForTier !== null);
  });
});

// ============================================================================ C-CARDS-b: the works' goal steps (C7), their completing events (W8), the levels' notice (C8)

import { goalDoneBy, goalOf as goalOfRules, goalSpecs, isGoalDoneEvent, lineStep, worksGoalStep } from './goals';
import { LEVELS_NOTICE_MARK, levelsNoticeDue } from './cards';
import { noteSeen } from './actions';
import { worksCardOf } from './cardsWorks';
import { lots4 as lots4b } from '../fixtures/salvage2works';
import { reconcileSalvage } from './save';
import type { CardKind, SalvageEvent, Txt } from './types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const keyIn = (t: Txt | null | undefined) => !t || KEYS.has(t.key);
const stepOf = (g: SalvageGame, done: string, k: SalvageConfig = W) => worksGoalStep(k, g, { done });
/** A key C-CARDS-b asks of the words ([seam]): the step uses it once the words hold it, else its stand-in. */
const want = (proposed: string, standIn: string | null) => (KEYS.has(proposed) ? proposed : standIn);

describe('C-CARDS-b: below the works\' opening no goal has a works step and no card a notice (r3, held14, the first yard)', () => {
  const states: [string, SalvageConfig, SalvageGame][] = [
    ['r3', stage2Cfg('r3'), stage2Game('r3')],
    ['held14', stage2Cfg('held14'), stage2Game('held14')],
    ...FIXTURE_NAMES.map((n) => [n, cfg, fixtureGame(n, base(), FIXTURE_NOW) as SalvageGame] as [string, SalvageConfig, SalvageGame]),
  ];
  for (const [name, k, g] of states)
    it(`${name}: worksGoalStep null for every goal of every list; no 'notice' on any card; the notice not due`, () => {
      expect(worksOpened(g.salvage)).toBe(false);
      const sp = goalSpecs(k.salvage);
      for (const d of [...sp.goals, ...sp.dayOne, ...sp.stage2]) expect(worksGoalStep(k, g, d), `${name} ${d.id}`).toBeNull();
      expect(levelsNoticeDue(g)).toBe(false);
      for (const ref of [...REFS, { kind: 'place', place: 'park' } as CardRef]) expect('notice' in cardOfCfg(k, g, ref, NOW2), `${name} ${JSON.stringify(ref)}`).toBe(false);
    });
});

describe('C-CARDS-b: a stage-2 goal\'s step (cards contract C7) from the rules\' own state', () => {
  const t0 = r3Works().salvage.t;
  it('start-up (commissioned:<plate>): on its way, set down ("Stand at it to start · n s"), running: none', () => {
    const arriving = edit2(r3Works(), (s) => {
      s.works.analyser = { ...structuredClone(r4Game().salvage.works.analyser), phase: 'arriving', commissionAt: s.t + 40 } as SalvageGame['salvage']['works'][string];
    });
    expect(stepOf(arriving, 'commissioned:analyser')).toEqual({ key: 'card.works.arrivesIn', args: { t: { secs: 40 } } });
    const installed = edit2(arriving, (s) => {
      s.works.analyser.phase = 'installed';
    });
    expect(stepOf(installed, 'commissioned:analyser')).toEqual({ key: want('goal.step.startUp', 'plate.works.commission'), args: { n: { n: C2(W, installed).works!.commission_s } } });
    expect(stepOf(r4Game(), 'commissioned:analyser')).toBeNull();
    // not bought: the goal's own line (the purchase goal before it is current anyway)
    expect(stepOf(r3Works(), 'commissioned:analyser')).toBeNull();
    void t0;
  });

  it('pour (poured:<plate>): the heat\'s phase as the rules hold it; READY sends the boss to the apron', () => {
    const c = C2(W, r4Game());
    const empty = stepOf(hallAt2('empty'), 'poured:rotary')!;
    expect(empty.key).toBe('card.heat.empty');
    const grade = (empty.args!.grade as { grade: string }).grade;
    expect(c.works!.plates.rotary.recipes![r4Game().salvage.works.rotary.heat!.recipe].in).toContain(grade);
    const filling = stepOf(hallAt2('filling'), 'poured:rotary')!;
    expect(filling.key).toBe('card.heat.filling');
    expect(filling.args!.a).toEqual({ mass_g: 30_000 });
    // the cap is the card's own heat view's (the furnace window and the goal card say the same)
    expect((filling.args!.b as { mass_g: number }).mass_g).toBe(heatView(c, hallAt2('filling').salvage, 'rotary')!.cap_g);
    expect(stepOf(hallAt2('heating'), 'poured:rotary')).toEqual({ key: 'card.heat.heating', args: { t: { secs: 50 } } });
    expect(stepOf(hallAt2('ready'), 'poured:rotary')).toEqual({ key: want('goal.step.toApron', 'plate.works.ready') });
    expect(stepOf(hallAt2('cooling'), 'poured:rotary')).toBeNull();
    // a hall not yet started up: the start-up's step first
    const installed = edit2(hallAt2('ready'), (s) => {
      s.works.rotary.phase = 'installed';
    });
    expect(stepOf(installed, 'poured:rotary')!.key).toBe(want('goal.step.startUp', 'plate.works.commission'));
    // the first yard's `poured:<n>` is never a works step
    expect(stepOf(hallAt2('ready'), 'poured:1')).toBeNull();
  });

  it('the oversize piece (lot:1), the picking table (crate:1) and the Yard sale\'s first thing (racked:1)', () => {
    const g = lots4b();
    expect(stepOf(g, 'lot:1')).toEqual(KEYS.has('goal.step.cutLot') ? { key: 'goal.step.cutLot' } : null);
    const none = edit2(g, (s) => {
      s.things = s.things.filter((t) => t.at.at !== 'lot');
      s.lots = { nextAt: s.t + 300, n: 4 };
    });
    expect(stepOf(none, 'lot:1')).toEqual({ key: 'card.pad.next', args: { t: { secs: 300 } } });
    expect(stepOf(g, 'crate:1')).toEqual({ key: want('goal.step.sort', 'card.crate.stand'), args: { n: { n: C2(W, g).crate!.sort_s } } });
    expect(stepOf(r3Works(), 'crate:1')).toBeNull();
    const first = r3Works().salvage.things.some((t) => t.uid === 'reuse.first');
    expect(stepOf(r3Works(), 'racked:1')).toEqual(first && KEYS.has('goal.step.lift') ? { key: 'goal.step.lift' } : null);
    const carried = edit2(r3Works(), (s) => {
      s.load.push({ uid: 'reuse.first', grade: 'waste', g: 1000, from: null, spec: -1, whole: 'bath' } as SalvageGame['salvage']['load'][number]);
    });
    expect(stepOf(carried, 'racked:1')).toEqual(KEYS.has('goal.step.toRack') ? { key: 'goal.step.toRack' } : null);
  });

  it('purchases, rungs, the walk and the repeating goal have no step (their own line, Goal.waits, the chevron)', () => {
    for (const done of ['plate:analyser', 'owned:truckBridge', 'rung:4', 'at:backfield', 'repeat', 'fetched:partner.garage:1']) expect(stepOf(r4Game(), done), done).toBeNull();
  });

  it('every step any of these states gives is a key the words hold (no line the screen cannot print)', () => {
    const gs = [r3Works(), r4Game(), lots4b(), rackFull(), ...(['empty', 'filling', 'heating', 'ready', 'cooling', 'pinned'] as const).map(hallAt2)];
    // goals.json's own stage-2 list (the works' test content carries none)
    const list = (JSON.parse(readFileSync(join(__dirname, '../../../scripts/content/yard/goals.json'), 'utf8')) as { stage2: { id: string; done: string }[] }).stage2;
    let steps = 0;
    for (const g of gs)
      for (const d of list) {
        const st = stepOf(g, d.done);
        if (st) steps++;
        expect(keyIn(st), d.id).toBe(true);
      }
    expect(steps).toBeGreaterThan(0);
  });

  it('the goal card carries the step of its current goal (a stage-2 list on the works\' test content)', () => {
    // the works' test content has no stage-2 list: two goals of goals.json's grammar put in (the start-up, a first pour)
    const spec = (id: string, done: string, target: string) => ({ id, text: 'goal.widen', target, via: null, done, buy: null, optional: false, stall: null });
    const k = { ...W, salvage: { ...W.salvage, stage2: [spec('startAnalyser', 'commissioned:analyser', 'scalehouse'), spec('pourRotary', 'poured:rotary', 'rotary.apron')] } } as unknown as SalvageConfig;
    const sp = goalSpecs(k.salvage);
    const at = (g: SalvageGame, f: (s: SalvageGame['salvage']) => void = () => {}) =>
      edit2(g, (s) => {
        s.goals = { ...s.goals, done: [...sp.goals, ...sp.dayOne].map((d) => d.id), skipped: [] };
        f(s);
      });
    const a = at(r4Game(), (s) => {
      s.works.analyser.phase = 'installed';
    });
    expect(goalOfRules(k, a)!.id).toBe('startAnalyser');
    expect(goalOfRules(k, a)!.step).toEqual(stepOf(a, 'commissioned:analyser', k));
    expect(goalOfRules(k, a)!.step).not.toBeUndefined();
    for (const ph of ['filling', 'heating', 'ready'] as const) {
      const g = at(hallAt2(ph), (s) => {
        s.goals.done.push('startAnalyser');
      });
      expect(goalOfRules(k, g)!.id).toBe('pourRotary');
      expect(goalOfRules(k, g)!.step, ph).toEqual(stepOf(g, 'poured:rotary', k));
      expect(keyIn(goalOfRules(k, g)!.step)).toBe(true);
    }
  });
});

describe('C-CARDS-b: the shredder line\'s step while its first car is awaited (lineStep)', () => {
  const L = lineCfg2();
  it('reads the station\'s own RecoveryView: next car, cash short, apron taken; none once a car has landed', () => {
    for (const [g, name] of [[lineState2('none', null), 'none'], [lineState2('none', null, 0), 'cash 0'], [lineState2('whole', null), 'apron']] as [SalvageGame, string][]) {
      const rv = worksCardOf(L, g, 'depollution')!.recovery!;
      const st = lineStep(L, g, 'shredder');
      if (rv.waitsFor === 'apron') expect(st, name).toEqual({ key: 'card.line.apronTaken' });
      else if (rv.waitsFor === 'cash') expect(st, name).toEqual({ key: 'card.line.cashShort', args: { x: { money: rv.short } } });
      else if (rv.nextAt !== null) expect(st, name).toEqual({ key: want('goal.step.firstCar', 'card.line.nextCar'), args: { t: { secs: Math.max(0, rv.nextAt - g.salvage.t) } } });
      else expect(st, name).toBeNull();
      expect(keyIn(st)).toBe(true);
    }
    expect(lineStep(L, lineState2('none', 100), 'shredder')).toBeNull();
    expect(lineStep(L, lineState2('none', null), 'depollution')).toEqual(lineStep(L, lineState2('none', null), 'shredder'));
    expect(lineStep(stage2Cfg('r3'), stage2Game('r3'), 'shredder')).toBeNull();
  });
});

describe('C-CARDS-b: each goal\'s completing event (wiring W8)', () => {
  // the stage's goal list as goals.json holds it (the lead's note: scripts/content/yard/goals.json; the analyser before the plasma, ruling 29.5)
  const shipped = (JSON.parse(readFileSync(join(__dirname, '../../../scripts/content/yard/goals.json'), 'utf8')) as { stage2: { id: string; done: string; buy: string | null }[] }).stage2;
  it('every stage-2 goal of the shipped list names its event, but the walk and the repeating goal (the rules\' `goal` event)', () => {
    expect(shipped.length).toBeGreaterThan(10);
    for (const d of shipped) {
      const by = goalDoneBy(d);
      if (d.done.startsWith('at:') || d.done === 'repeat') expect(by, d.id).toBeNull();
      else expect(by, d.id).not.toBeNull();
    }
    expect(goalDoneBy({ done: 'commissioned:analyser', buy: null })).toEqual({ type: 'commissioned', match: { plate: 'analyser' } });
    expect(goalDoneBy({ done: 'poured:induction', buy: null })).toEqual({ type: 'pour', match: { plate: 'induction' } });
    expect(goalDoneBy({ done: 'plate:shredder', buy: 'shredder' })).toEqual({ type: 'plateState', match: { plate: 'shredder', status: 'arriving' } });
    expect(goalDoneBy({ done: 'lot:1', buy: null })!.type).toBe('lotOpened');
    expect(goalDoneBy({ done: 'fetched:partner.garage:1', buy: null })).toEqual({ type: 'bridgeWeighIn', match: { partner: 'partner.garage' } });
  });

  it('the rules emit that event at the instant the goal is met: the first pour, the start-up, the order of a plate', () => {
    // the first heat left to itself pours by itself (halls.ts: its self-pour): the pour event names the hall
    const g0 = hallAt2('ready');
    const ev: SalvageEvent[] = [];
    const g1 = jump(W, g0, g0.salvage.works.rotary.heat!.phaseSince + C2(W, g0).works!.selfCommission_s + 60, ev);
    const by = goalDoneBy({ done: 'poured:rotary', buy: null });
    const hit = ev.filter((e) => isGoalDoneEvent(by, e));
    expect(hit.length).toBeGreaterThan(0);
    expect((g1.salvage.counts?.['poured:rotary'] ?? 0)).toBeGreaterThan(0);
    expect(isGoalDoneEvent(by, { type: 'pour', ingots: 1, grade: 'x', short_g: 0, dross_g: 0, first: true, by: 'boss', plate: 'induction' })).toBe(false);
    // a plate set down starts up by itself at its date: `commissioned` names it
    const inst = edit2(r4Game(), (s) => {
      s.works.analyser.phase = 'installed';
      s.works.analyser.commissionAt = s.t + 5;
    });
    const ev2: SalvageEvent[] = [];
    jump(W, inst, inst.salvage.t + 10, ev2);
    expect(ev2.some((e) => isGoalDoneEvent(goalDoneBy({ done: 'commissioned:analyser', buy: null }), e))).toBe(true);
  });

  it('the bridge weigh-in matches by its ticket\'s partner', () => {
    const by = goalDoneBy({ done: 'fetched:partner.garage:1', buy: null });
    const tk = (partner: string) => ({ type: 'bridgeWeighIn', ticket: { kind: 'skipWeighIn', partner } }) as unknown as SalvageEvent;
    expect(isGoalDoneEvent(by, tk('partner.garage'))).toBe(true);
    expect(isGoalDoneEvent(by, tk('partner.plumbing'))).toBe(false);
    expect(isGoalDoneEvent(null, tk('partner.garage'))).toBe(false);
  });
});

describe('C-CARDS-b: the levels\' notice (cards contract C8; RULING2.md 30.3)', () => {
  const NOTICE_REFS: CardRef[] = [{ kind: 'office', tab: 'rota' }, { kind: 'office', tab: 'partners' }, { kind: 'place', place: 'park' } as CardRef, { kind: 'place', place: 'office' } as CardRef];
  const OTHER_REFS: CardRef[] = [{ kind: 'office', tab: 'processBoard' }, { kind: 'board' }, { kind: 'table' }, { kind: 'clipboard' }, { kind: 'help' }, worksRef('analyser')];
  for (const [name, g] of [['r3Works', r3Works()], ['r4', r4Game()], ['rackFull', rackFull()]] as [string, SalvageGame][])
    it(`${name}: the rota, the partners' tab and the truck park carry it until seen; no other card; seen through noteSeen, no new save field`, () => {
      expect(levelsNoticeDue(g)).toBe(true);
      for (const ref of NOTICE_REFS) {
        const d = cardOfCfg(W, g, ref, NOW2);
        if (['rota', 'partners', 'park'].includes(d.kind)) expect(d.notice, JSON.stringify(ref)).toEqual({ key: 'card.notice.levelsWorks' });
      }
      expect(KEYS.has('card.notice.levelsWorks')).toBe(true);
      for (const ref of OTHER_REFS) expect('notice' in cardOfCfg(W, g, ref, NOW2), JSON.stringify(ref)).toBe(false);
      const seen = noteSeen(W, g, { card: LEVELS_NOTICE_MARK as unknown as CardKind }, g.salvage.t);
      expect(levelsNoticeDue(seen)).toBe(false);
      for (const ref of NOTICE_REFS) expect('notice' in cardOfCfg(W, seen, ref, NOW2), JSON.stringify(ref)).toBe(false);
      // no new save field: the state's keys are the same, only seen.cards grew by the mark
      expect(Object.keys(seen.salvage).sort()).toEqual(Object.keys(g.salvage).sort());
      expect(seen.salvage.seen.cards).toEqual([...g.salvage.seen.cards, LEVELS_NOTICE_MARK]);
      // a second note is the same object (seen once)
      expect(noteSeen(W, seen, { card: LEVELS_NOTICE_MARK as unknown as CardKind }, seen.salvage.t).salvage.seen).toBe(seen.salvage.seen);
    });

  it('the mark survives a save and a load (save.ts keeps seen.cards as it finds it)', () => {
    const g = noteSeen(W, r4Game(), { card: LEVELS_NOTICE_MARK as unknown as CardKind }, r4Game().salvage.t);
    const raw = JSON.parse(JSON.stringify({ salvage: g.salvage }));
    const back = reconcileSalvage(W, { ...g, salvage: undefined } as never, raw, g.salvage.clock.highMs);
    expect(back.salvage.t).toBe(g.salvage.t);
    expect(back.salvage.seen.cards).toContain(LEVELS_NOTICE_MARK);
  });
});
