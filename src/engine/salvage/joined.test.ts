/**
 * THE RULES OF STAGE 2 TOGETHER (join2b, 26 November; yard-stage2.md 2.1.7, 2.14.4, 2.17, 2.20, 8.1). The works'
 * rules (plates, lines, halls, the crane, partners, vehicles, oversize pieces, the picking table, the Yard sale)
 * and the money's (the bank, the shop, ads, every card, the save) were written apart against one contract; these
 * tests run them at once, from the frozen states r3, r4, r3fin, rackFull, lots4, u13 and firstHour2min:
 * - ten minutes as 0.1 s ticks, as one jump and as ten jumps give the same WHOLE state;
 * - the first oversize piece is dated alike when the works open inside the window (the dispatch check's F5);
 * - an absence at the rung's cap pays what its away card prints, once;
 * - a save in the middle of everything at once reloads and goes on as the unsaved yard;
 * - mass over hours of every plate working;
 * - every card of every frozen state is made without a throw, and what a card's button shows is what its action applies;
 * - every lot payment goes through payLot (with an agreement open, the tickets' bank lines sum to what was taken);
 * - no shop entry or ad on a card that shows a debt; nothing of money or ads from firstHour2min; no shop from u13.
 * Frozen content only: no tuned number of game.json is read.
 */
import { describe, expect, it } from 'vitest';
import { r4Game, rackFull, lots4, worksCfg, r3Works } from '../fixtures/salvage2works';
import { firstHour2min, moneyCfg, r3finGame, shopCfg, shopGame, SHOP_NOW, u13Game } from '../fixtures/salvage2money';
import { stage2Cfg, stage2Game } from '../fixtures/salvage';
import { advanceSalvage, jump } from './tick';
import { salvageOffline, awayCapS } from './away';
import { reconcileSalvage } from './save';
import { buy, hire, level, sell, setHold, setRecipe, setFromBays, signDeal, declineDeal, skipGoal, ackAway } from './actions';
import { adPaid, chooseLook, quotePack, settleQuote, signFinance } from './actionsMoney';
import { setPlateRecipe, setRoute } from './actionsWorks';
import { cardOfCfg as cardOf } from './cards';
import { contentAt } from './layer';
import { begin } from './clock';
import { pieceCount, pieceSpec } from './content';
import { roundMoney } from './money';
import type { GameState } from '../types';
import type { CardAction, CardData, CardRef, SalvageConfig, SalvageEvent, SalvageGame, SalvageState, Ticket } from './types';

type Named = { name: string; cfg: SalvageConfig; g: SalvageGame };

/** The seven frozen states of 8.1 with the content each runs on. */
function frozen(): Named[] {
  const fh = firstHour2min();
  return [
    { name: 'r3', cfg: stage2Cfg('r3'), g: stage2Game('r3') },
    { name: 'r4', cfg: worksCfg(), g: r4Game() },
    { name: 'r3fin', cfg: moneyCfg(), g: r3finGame() },
    { name: 'rackFull', cfg: worksCfg(), g: rackFull() },
    { name: 'lots4', cfg: worksCfg(), g: lots4() },
    { name: 'u13', cfg: shopCfg(), g: u13Game() },
    { name: 'firstHour2min', cfg: fh.cfg, g: fh.closed },
  ];
}

/** The boss's last sample 100 s old and his act ended: a tick and a jump see the same (stale) boss. */
export function staleBoss(g: SalvageGame): SalvageGame {
  const s = g.salvage;
  return { ...g, salvage: { ...s, presenceAt: s.t - 100, act: { kind: 'none', target: null, since: s.t, endsAt: null } } } as SalvageGame;
}

/** The whole state as data (keys sorted), numbers to 1e-6 (the yard clock summed tick by tick drifts by 1e-10), the market clock's high mark left out (a tick raises it to the device's now). */
export function whole(g: SalvageGame): string {
  const { clock, presenceAt, ...rest } = g.salvage as SalvageGame['salvage'] & { presenceAt: number };
  void presenceAt;
  return JSON.stringify({ cash: Math.round(g.cash * 100), earned: Math.round((g.lifetimeEarnings ?? 0) * 100), day: clock.day, s: rest }, (_k, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]])) : v));
}

/** The first difference of two whole states, as a short path (for a readable failure). */
function firstDiff(a: unknown, b: unknown, path = ''): string | null {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    for (const k of keys) {
      const d = firstDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
      if (d) return d;
    }
  }
  return `${path}: ${JSON.stringify(a)?.slice(0, 160)} vs ${JSON.stringify(b)?.slice(0, 160)}`;
}

export function sameWhole(a: SalvageGame, b: SalvageGame): string | null {
  return firstDiff(JSON.parse(whole(a)), JSON.parse(whole(b)));
}

/** `seconds` of live play as 0.1 s ticks from device time `now`. */
export function ticks(cfg: SalvageConfig, g: SalvageGame, seconds: number, now = g.salvage.clock.highMs): SalvageGame {
  let a = g;
  let ms = now;
  for (let i = 0; i < Math.round(seconds * 10); i++) {
    ms += 100;
    a = advanceSalvage(cfg, a, 0.1, ms);
  }
  return a;
}

function tenJumps(cfg: SalvageConfig, g: SalvageGame, seconds: number): SalvageGame {
  let a = g;
  for (let k = 1; k <= 10; k++) a = jump(cfg, a, g.salvage.t + (seconds * k) / 10);
  return a;
}

describe('ten minutes: ticks, one jump and ten jumps give the same whole state (2.1.7 (a))', () => {
  for (const n of frozen()) {
    it(`${n.name}`, () => {
      const g = staleBoss(n.g);
      const one = jump(n.cfg, g, g.salvage.t + 600);
      const ten = tenJumps(n.cfg, g, 600);
      const tk = ticks(n.cfg, g, 600);
      expect(sameWhole(ten, one)).toBeNull();
      expect(sameWhole(tk, one)).toBeNull();
    });
  }
});

describe('the works open inside the window: the first oversize piece is dated alike (the dispatch check F5)', () => {
  it('r3 below a rung-3 threshold it crosses within ten minutes: ticks, one jump and ten jumps open the works at the same event and date lots.nextAt alike', () => {
    const base = worksCfg();
    const g0 = staleBoss(stage2Game('r3'));
    const s = g0.salvage;
    // The rung-3 threshold put 20 kg above what r3 has supplied: the next weigh-in reaches it.
    const tT = (s.ladder.supplied_g + 20_000) / 1e6;
    const c = structuredClone(base.salvage) as SalvageConfig['salvage'];
    c.ladder = { ...c.ladder, rung3: { ...c.ladder.rung3, t: tT }, rungs: c.ladder.rungs.map((r) => (r.n === 3 ? { ...r, t: tT } : r)) };
    const cfg = { ...base, salvage: c } as SalvageConfig;
    const g = { ...g0, salvage: { ...s, ladder: { ...s.ladder, rung: 2 } } } as SalvageGame;
    const one = jump(cfg, g, s.t + 600);
    expect(one.salvage.counts?.bathSet).toBe(1);
    expect(one.salvage.ladder.rung).toBe(3);
    const ten = tenJumps(cfg, g, 600);
    const tk = ticks(cfg, g, 600);
    expect(ten.salvage.lots.nextAt).toBe(one.salvage.lots.nextAt);
    expect(tk.salvage.lots.nextAt).toBeCloseTo(one.salvage.lots.nextAt!, 6);
    // Dated from the opening's instant (the rung's event), not from the start of the window.
    expect(one.salvage.lots.nextAt!).toBeGreaterThan(s.t + (cfg.salvage.lots!.period_s as number));
    expect(sameWhole(tk, one)).toBeNull();
  });

  it('a save already at the works rung (the works not yet open): dated from the start of the transition, alike in a tick, a jump and ten jumps', () => {
    const cfg = worksCfg();
    const g = staleBoss(stage2Game('r3'));
    const one = jump(cfg, g, g.salvage.t + 60);
    const tk = ticks(cfg, g, 60);
    const ten = tenJumps(cfg, g, 60);
    expect(one.salvage.lots.nextAt).toBe(g.salvage.t + (cfg.salvage.lots!.period_s as number));
    expect(ten.salvage.lots.nextAt).toBe(one.salvage.lots.nextAt);
    expect(tk.salvage.lots.nextAt).toBeCloseTo(one.salvage.lots.nextAt!, 6);
  });
});


describe('an absence at the rung\'s cap pays what its away card prints, once (2.17)', () => {
  for (const n of frozen()) {
    it(`${n.name}`, () => {
      const cap = awayCapS(n.cfg, n.g);
      const from = Math.max(n.g.lastSavedAt || 0, n.g.salvage.clock.highMs);
      const now = from + cap * 1000 + 3_600_000;
      const r = salvageOffline(n.cfg, n.g, now);
      const card = r.game.salvage.away!;
      expect(card, 'an away card').toBeTruthy();
      expect(card.seconds).toBeCloseTo(cap, 6);
      expect(r.earnings).toBe(0);
      // The card's money is gross of the bank's share and its net is money − spent (2.14.4): the cash moved by net − bank.
      expect(roundMoney(r.game.cash - n.g.cash)).toBe(roundMoney((card.net ?? 0) - (card.bank ?? 0)));
      expect(roundMoney(card.net ?? NaN)).toBe(roundMoney(card.money - (card.spent ?? 0)));
      expect(roundMoney((r.game.lifetimeEarnings ?? 0) - (n.g.lifetimeEarnings ?? 0))).toBe(roundMoney(card.money - (card.bank ?? 0)));
      if (n.g.salvage.bank.agreement) expect(roundMoney(r.game.salvage.bank.agreement ? r.game.salvage.bank.agreement.taken - n.g.salvage.bank.agreement.taken : n.g.salvage.bank.agreement.T - n.g.salvage.bank.agreement.taken)).toBe(card.bank ?? 0);
      // Once: the same device time again pays nothing and changes nothing.
      expect(salvageOffline(n.cfg, r.game, now).game).toBe(r.game);
      // A clock set back pays nothing either.
      expect(salvageOffline(n.cfg, r.game, now - 3_600_000).game).toBe(r.game);
    });
  }
});

/** Every gram of the yard (the closed yard's ledger: what is on the ground, in bays, machines, plates, carriers, the merchant's lot, waste and supplied). */
function massOf(cfg: SalvageConfig, g: SalvageGame): number {
  const s = g.salvage;
  const M = begin(cfg, g, [], true).c;
  let m = s.waste_g + s.ladder.supplied_g - s.scaleRound_g;
  for (const p of s.pieces) m += p.g;
  for (const th of s.things) {
    if (th.g !== undefined && th.cut === 0) {
      m += th.g;
      continue;
    }
    m += M.objects[th.obj].waste_g;
    for (let k = th.cut; k < pieceCount(M, th.obj); k++) m += pieceSpec(M, th.obj, k)!.g;
  }
  for (const b of Object.values(s.bays)) m += b.g;
  for (const w of Object.values(s.works)) {
    for (const p of w.hopper) m += p.g;
    // A hands-fed plate's credited grams are in its tray; a bay-fed plate's stay on its belt until the piece is done.
    if (w.work) m += M.works!.plates[w.plate].feedBy === 'hands' ? w.work.piece.g - Object.values(w.work.credited).reduce((a, v) => a + v, 0) : w.work.piece.g;
    m += Object.values(w.tray_g).reduce((a, v) => a + v, 0);
    if (w.heat) m += w.heat.charge_g;
  }
  m += s.machines.crucible.charge_g + s.machines.crucible.heel_g;
  for (const k of Object.values(s.machines)) {
    for (const p of k.hopper) m += p.g;
    if (k.work) m += k.work.piece.g - Object.values(k.work.credited).reduce((a, v) => a + v, 0);
    m += Object.values(k.tray_g).reduce((a, v) => a + v, 0);
  }
  for (const c of s.crew) for (const p of c.load) m += p.g;
  for (const p of s.load) m += p.g;
  for (const p of s.forklift?.load ?? []) m += (p as { g: number }).g;
  for (const l of s.merchant.lot) m += l.g;
  return m;
}

describe('mass over a day of every plate working (2.5.3: Σ out + Σ waste = the input)', () => {
  it('r4 closed to inflow, the merchant away all day, the back field\'s bays stocked with tonnes, the floor stocked with the yard plates\' inputs: every gram kept at every two hours of a day; every bay-fed plate and hall worked all day', () => {
    const cfg = worksCfg();
    const g0 = r4Game();
    const s = structuredClone(g0.salvage) as SalvageState;
    s.dropoff.nextAt = -1;
    for (const p of Object.values(s.partners)) p.open = false;
    s.truck.trip = null;
    s.truck.by = null;
    s.truck.earmark = null;
    s.lots.nextAt = null;
    s.presenceAt = -1;
    // The merchant on a round that outlasts the day: the bays keep what the plates make and draw (no collection, no Hold).
    s.merchant = { phase: 'away', since: s.t, endsAt: s.t + 1e6, lot: [] };
    // 40 t of each input the back field draws.
    for (const grade of ['cbody', 'li', 'zorba', 'pbb', 'brs', 'bzs', 'alcast', 'alw', 'pbp']) {
      const b = (s.bays[grade] ??= { g: 0, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 });
      b.g += 40_000_000;
    }
    // The yard plates' inputs on the tipping floor (pieces of light iron, heavy melting, cable).
    for (let i = 0; i < 120; i++) {
      const grade = ['li', 'hmsu', 'tcab'][i % 3];
      s.pieces.push({ uid: `j.${i}`, grade, g: 25_000, from: `j${i}`, spec: 0, pile: 'floor', k: i % 30, claim: null } as SalvageState['pieces'][number]);
    }
    // Light iron to the baler (by default it goes to the shredder, the better margin a kilogram: 2.7.1).
    const g = setRoute(cfg, { ...g0, salvage: s }, 'li', 'baler', s.t);
    expect(g.salvage.routes.li).toBe('baler');
    const m0 = massOf(cfg, g);
    let h = g;
    const worked0 = { ...(g.salvage.counts ?? {}) };
    for (let k = 1; k <= 12; k++) {
      h = jump(cfg, h, g.salvage.t + k * 7200);
      expect(massOf(cfg, h), `at ${k * 2} h`).toBe(m0);
    }
    const c = h.salvage.counts ?? {};
    const did = (key: string) => (c[key] ?? 0) - (worked0[key] ?? 0);
    for (const plate of ['shredder', 'sorter', 'breaker', 'rotary', 'induction', 'smelter']) expect(did(`worked:${plate}`), plate).toBeGreaterThan(300);
    for (const hall of ['rotary', 'induction', 'smelter']) expect(did(`poured:${hall}`), hall).toBeGreaterThan(300);
    for (const plate of ['baler', 'shear', 'granulator']) expect(did(`worked:${plate}`), plate).toBeGreaterThan(10);
  });
});

describe('a save in the middle of everything at once reloads and goes on as the unsaved yard (2.20)', () => {
  it('r4 with a plate arriving, a heat hot, an agreement open, a quote waiting, a thing racked and its visitor dated, the van dated, a crane move and a planned run: saved, reloaded, ten minutes on: the same whole state', () => {
    const cfg = shopCfg();
    let g = staleBoss(shopGame({ cash: 5_000 }));
    g = jump(cfg, g, g.salvage.t + 1);
    const t = g.salvage.t;
    // a plate on the machine flatbed (the depollution bay: bought now, set down deliver_s later)
    g = buy(cfg, g, 'depollution', 1000, t);
    // an agreement open (the test plates are under the bank's floor: the agreement is the stored record, as a signature leaves it)
    const s = structuredClone(g.salvage) as SalvageState;
    s.bank = { ...s.bank, letterSeen: true, agreement: { kind: 'bank', plate: 'shear', P: 50_000, F: 40_000, c: 3_200, T: 43_200, taken: 1_000, signedAt: t - 100, I: 20_000 } };
    // a thing racked (its visitor dated as racking dates it)
    if (!s.things.some((th) => th.at.at === 'rack')) s.things.push({ uid: 'rk0', obj: 'radiator', at: { at: 'rack', slot: 0, since: t }, cut: 0, progress: 0, by: null });
    s.reuse = { ...s.reuse, nextAt: s.reuse.nextAt ?? t + 50 };
    g = { ...g, salvage: s };
    // a quote waiting for approval
    const S = 1_000;
    g = { ...g, salvage: { ...g.salvage, iap: { ...g.salvage.iap, pending: [{ id: `pack2:${SHOP_NOW}`, product: 'pack2', S, I: 2_000, atMs: SHOP_NOW, askedMs: SHOP_NOW, known: [], state: 'waiting', wait: 'pending' }] } } };
    const w = g.salvage.works;
    expect(w.depollution?.phase).toBe('arriving');
    expect(Object.values(w).some((x) => x.heat?.phase === 'heating')).toBe(true);
    expect(w.crane?.move).toBeTruthy();
    expect(g.salvage.crew.some((m) => m.run)).toBe(true);
    expect(g.salvage.reuse.vanAt).not.toBeNull();
    expect(g.salvage.things.some((th) => th.at.at === 'rack')).toBe(true);
    const raw = JSON.parse(JSON.stringify(g));
    const base = { ...g, salvage: undefined } as unknown as GameState;
    // A load counts itself (`epoch`, the frame's reset): the rest is the yard as it was.
    const loaded0 = reconcileSalvage(cfg, base, raw, g.salvage.clock.highMs);
    expect(loaded0.salvage.epoch).toBe(g.salvage.epoch + 1);
    // and the boss's standing time is not kept across a load (save.ts: a reloaded boss starts standing afresh; he is stale here)
    const loaded = { ...loaded0, salvage: { ...loaded0.salvage, epoch: g.salvage.epoch, presence: { ...loaded0.salvage.presence, standingFor: g.salvage.presence.standingFor } } };
    // What a load changes on purpose: save.ts clamps a bay's reserve to its grams (rebuilt by the works at the next instant).
    const norm = (x: SalvageGame) => ({ ...x, salvage: { ...x.salvage, bays: Object.fromEntries(Object.entries(x.salvage.bays).map(([k, b]) => [k, { ...b, reserved: undefined }])) } }) as SalvageGame;
    expect(sameWhole(norm(loaded), norm(g))).toBeNull();
    const a = jump(cfg, g, t + 600);
    const b = jump(cfg, loaded, t + 600);
    expect(sameWhole(b, a)).toBeNull();
    // the agreement went on taking its share, the plate arrived, the quote still stands
    expect(a.salvage.bank.agreement!.taken).toBeGreaterThan(1_000);
    expect(a.salvage.works.depollution.phase).not.toBe('arriving');
    expect(a.salvage.iap.pending).toHaveLength(1);
  });
});

/** Every card ref the state can open on its content (as cardsMoney.test.ts walks them). */
function refsOf(cfg: SalvageConfig, g: SalvageGame): CardRef[] {
  const c = contentAt(cfg.salvage, g.salvage);
  const refs: CardRef[] = [];
  for (const place of Object.keys(c.map.places ?? {})) refs.push({ kind: 'place', place });
  for (const tab of ['rota', 'partners', 'processBoard', 'agreements'] as const) refs.push({ kind: 'office', tab });
  for (const machine of ['hand_stripper', 'stripper', 'bench', 'crucible'] as const) refs.push({ kind: 'machine', machine });
  for (const grade of Object.keys(g.salvage.bays)) refs.push({ kind: 'bay', grade });
  refs.push({ kind: 'board' }, { kind: 'deal' }, { kind: 'table' }, { kind: 'processBoard' }, { kind: 'clipboard' }, { kind: 'settings' }, { kind: 'help' });
  if (g.salvage.away) refs.push({ kind: 'away' });
  for (let n = 1; n <= 5; n++) refs.push({ kind: 'rung', n });
  for (const [partner, p] of Object.entries(g.salvage.partners)) for (const sk of p.skips) refs.push({ kind: 'skip', partner, slot: sk.slot });
  for (const plate of Object.keys((c as { works?: { plates?: Record<string, unknown> } }).works?.plates ?? {})) refs.push({ kind: 'works', plate }, { kind: 'finance', plate });
  refs.push({ kind: 'letter' }, { kind: 'yardSale' }, { kind: 'crate' }, { kind: 'shop' }, { kind: 'ageQuestion' }, { kind: 'awayBonus' });
  for (let k = 0; k < 4; k++) refs.push({ kind: 'lot', k });
  for (const product of ['pack2', 'pack5', 'pack10', 'pack20']) refs.push({ kind: 'packSheet', product });
  for (const mode of ['set', 'confirm', 'enter'] as const) refs.push({ kind: 'packCode', mode });
  return refs;
}

/** Every pressable button of a card (any depth). */
function pressable(cd: CardData): CardAction[] {
  const out: CardAction[] = [];
  const seen = new Set<unknown>();
  const visit = (v: unknown) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    const o = v as { action?: CardAction; label?: unknown; refusal?: unknown };
    if (o.action && typeof o.action === 'object' && 'act' in o.action && o.label !== undefined && !o.refusal) out.push(o.action);
    for (const x of Array.isArray(v) ? v : Object.values(v)) visit(x);
  };
  visit(cd);
  return out;
}

const STORE_SIDE = new Set<CardAction['act']>(['buyProduct', 'restorePurchases', 'setPacksHidden', 'open']);

/** Apply a card's action as the store's actions do; returns the new game, or null for the store's own (no rules action). */
function applyAction(cfg: SalvageConfig, g: SalvageGame, a: CardAction, now: number, ev: SalvageEvent[]): SalvageGame | null {
  const t = g.salvage.t;
  switch (a.act) {
    case 'buy': return buy(cfg, g, a.item, a.price, t, ev);
    case 'hire': return hire(cfg, g, a.role, a.price, t, ev);
    case 'level': return level(cfg, g, a.target, a.price, t, ev);
    case 'setHold': return setHold(cfg, g, a.grade, a.on, t, ev);
    case 'sell': return sell(cfg, g, a.grade, a.shown, now, t, ev);
    case 'setRecipe': return a.plate ? setPlateRecipe(cfg, g, a.plate, a.recipe, a.confirmHeel, t, ev) : setRecipe(cfg, g, a.recipe, a.confirmHeel, t, ev);
    case 'setFromBays': return a.plate ? null : setFromBays(cfg, g, a.on, t, ev);
    case 'signDeal': return signDeal(cfg, g, a.terms, now, t, ev);
    case 'declineDeal': return declineDeal(cfg, g, t, ev);
    case 'skipGoal': return skipGoal(cfg, g, a.id, t, ev);
    case 'ackAway': return ackAway(cfg, g);
    case 'signFinance': return signFinance(cfg, g, a.plate, a.shown, t, ev);
    case 'setRoute': return setRoute(cfg, g, a.grade, a.to, t, ev);
    case 'chooseLook': return chooseLook(cfg, g, a.slot, a.id, t, ev);
    case 'watchAd': return adPaid(cfg, g, a.kind, a.amount, { grade: a.grade, sell: a.sell }, t, ev);
    case 'buyPack': return quotePack(cfg, g, a.product, a.S, now, [], now, t, ev, { country: 'US' });
    default: return null;
  }
}

describe('every card of every frozen state, and every button on it: applying it does exactly what it showed (2.19, shown = applied)', () => {
  for (const n of frozen()) {
    it(`${n.name}`, () => {
      const now = SHOP_NOW;
      const ctx = { country: 'US' };
      let cards = 0;
      let pressed = 0;
      const kinds = new Set<string>();
      for (const ref of refsOf(n.cfg, n.g)) {
        const cd = cardOf(n.cfg, n.g, ref, now, ctx); // never throws
        cards++;
        kinds.add(cd.kind);
        for (const a of pressable(cd)) {
          if (STORE_SIDE.has(a.act)) {
            if (a.act === 'open') expect(() => cardOf(n.cfg, n.g, a.card, now, ctx)).not.toThrow();
            continue;
          }
          const ev: SalvageEvent[] = [];
          const out = applyAction(n.cfg, n.g, a, now, ev);
          if (!out) continue;
          pressed++;
          const what = `${cd.kind} ${JSON.stringify(a).slice(0, 140)}`;
          // a pressable button is never refused (but the crucible's and a hall's recipe change with a heel, which asks first and carries its retry: 4.5)
          const conf = ev.find((e) => e.type === 'refused' && e.key === 'confirmHeel' && !!e.retry);
          if (conf) continue;
          expect(ev.find((e) => e.type === "refused"), `${what} ${JSON.stringify(ev.find((e) => e.type === "refused"))}`).toBeUndefined();
          const paid = roundMoney(n.g.cash - out.cash);
          if (a.act === 'buy' || a.act === 'hire' || a.act === 'level') expect(paid, what).toBe(roundMoney(a.price));
          if (a.act === 'signFinance') {
            expect(paid, what).toBe(roundMoney(a.shown.P - a.shown.F));
            expect(out.salvage.bank.agreement, what).toMatchObject({ plate: a.plate, F: a.shown.F, T: a.shown.T });
          }
          if (a.act === 'watchAd') expect(-paid, what).toBe(roundMoney(a.amount));
          if (a.act === 'buyPack') expect(out.salvage.iap.pending.at(-1), what).toMatchObject({ product: a.product, S: a.S, state: 'open' });
          if (a.act === 'setRoute') expect(out.salvage.routes[a.grade], what).toBe(a.to);
          if (a.act === 'setHold') expect(out.salvage.bays[a.grade]?.held ?? false, what).toBe(a.on);
          if (a.act === 'chooseLook') expect((out.salvage.iap.looks as Record<string, string | null>)[a.slot], what).toBe(a.id);
          if (a.act === 'sell') {
            const before = n.g.salvage.bays[a.grade].aside.reduce((q, l) => q + l.g, 0);
            const after = out.salvage.bays[a.grade].aside.reduce((q, l) => q + l.g, 0);
            expect(after - before, what).toBe(a.shown.grams);
          }
          // nothing is paid for a button that is not a purchase, a deposit or a reward
          if (!['buy', 'hire', 'level', 'signFinance', 'watchAd', 'signDeal'].includes(a.act)) expect(paid, what).toBe(0);
        }
      }
      expect(cards).toBeGreaterThan(60);
      void pressed;
      void kinds;
    });
  }
});

const LOT_TICKETS = new Set<Ticket['kind']>(['collection', 'dealDelivery', 'rackSale', 'vanCollection', 'crateLot']);

describe('every lot payment goes through payLot before its ticket (2.14.4)', () => {
  it('r3fin, an hour minute by minute: every lot ticket printed while the agreement is open carries the bank\'s line at the share; the share\'s sum is what the agreement took; earnings rose by the payments less the bank, nothing else', () => {
    const cfg = moneyCfg();
    let g = staleBoss(r3finGame());
    const share = (cfg.salvage as { bank?: { share: number } }).bank!.share;
    const a0 = g.salvage.bank.agreement!;
    const byKind: Record<string, number> = {};
    let paid = 0;
    let y = 0;
    let lastNo = g.salvage.ticketNo;
    for (let k = 1; k <= 60; k++) {
      const before = g;
      g = jump(cfg, g, before.salvage.t + 60);
      const fresh = g.salvage.tickets.filter((tk) => tk.no >= lastNo);
      expect(g.salvage.ticketNo - lastNo, 'fewer than 50 tickets a minute (all seen)').toBeLessThan(50);
      lastNo = g.salvage.ticketNo;
      for (const tk of fresh) {
        if (!LOT_TICKETS.has(tk.kind)) continue;
        const p = (tk as { paid: number }).paid;
        const b = (tk as { bank?: { y: number } }).bank;
        byKind[tk.kind] = (byKind[tk.kind] ?? 0) + 1;
        paid += p;
        const open = before.salvage.bank.agreement;
        if (open) {
          const want = Math.min(roundMoney(share * p), roundMoney(open.T - open.taken));
          if (want > 0) expect(b?.y, `${tk.kind} ${tk.no}`).toBe(want);
        }
        y += b?.y ?? 0;
      }
      const ag = g.salvage.bank.agreement;
      if (!ag) break;
    }
    const taken = g.salvage.bank.agreement ? g.salvage.bank.agreement.taken - a0.taken : a0.T - a0.taken;
    expect(y).toBeGreaterThan(0);
    expect(roundMoney(y)).toBe(roundMoney(taken));
    expect(roundMoney((g.lifetimeEarnings ?? 0) - (r3finGame().lifetimeEarnings ?? 0))).toBe(roundMoney(paid - y));
    // the payments seen by kind (the closed list of 2.14.4 that an hour without the boss can make)
    expect(byKind.collection).toBeGreaterThan(5);
    expect((byKind.rackSale ?? 0) + (byKind.vanCollection ?? 0)).toBeGreaterThan(0);
  });
});

/** Every button and row id at any depth of a card. */
function actsOf(cd: CardData): { acts: CardAction['act'][]; opens: string[] } {
  const acts: CardAction['act'][] = [];
  const opens: string[] = [];
  const seen = new Set<unknown>();
  const visit = (v: unknown) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    const o = v as { action?: CardAction };
    if (o.action && typeof o.action === 'object' && 'act' in o.action) {
      acts.push(o.action.act);
      if (o.action.act === 'open') opens.push(o.action.card.kind);
    }
    for (const x of Array.isArray(v) ? v : Object.values(v)) visit(x);
  };
  visit(cd);
  return { acts, opens };
}

const MONEY_ACTS = new Set<CardAction['act']>(['buyPack', 'buyProduct', 'restorePurchases', 'watchAd']);

describe('the money\'s promises over every card of the joined states (2.14.5, 2.15.2, P1, P8)', () => {
  const cardsOf = (n: Named) => {
    const out: CardData[] = [];
    for (const country of ['US', 'DE', null]) for (const ref of refsOf(n.cfg, n.g)) out.push(cardOf(n.cfg, n.g, ref, SHOP_NOW, { country }));
    return out;
  };
  for (const n of frozen()) {
    it(`${n.name}: no shop entry and no ad on a card that shows a debt`, () => {
      for (const cd of cardsOf(n)) {
        if (!cd.showsDebt) continue;
        const { acts, opens } = actsOf(cd);
        expect(acts.filter((a) => MONEY_ACTS.has(a)), cd.kind).toEqual([]);
        expect(opens.filter((k) => k === 'shop' || k === 'packSheet' || k === 'awayBonus'), cd.kind).toEqual([]);
      }
    });
  }
  it('r3fin shows a debt somewhere (the walk above is not empty)', () => {
    const n = frozen().find((f) => f.name === 'r3fin')!;
    expect(cardsOf(n).some((cd) => cd.showsDebt)).toBe(true);
  });
  it('firstHour2min: nothing of money or ads on any card (no shop row, no ad button, no shop data)', () => {
    const n = frozen().find((f) => f.name === 'firstHour2min')!;
    for (const g of [n.g, firstHour2min().card]) {
      for (const country of ['US', 'DE', null]) for (const ref of refsOf(n.cfg, g)) {
        const cd = cardOf(n.cfg, g, ref, SHOP_NOW, { country });
        const { acts, opens } = actsOf(cd);
        expect(acts.filter((a) => MONEY_ACTS.has(a)), cd.kind).toEqual([]);
        expect(opens.filter((k) => k === 'shop' || k === 'packSheet' || k === 'awayBonus'), cd.kind).toEqual([]);
        expect(cd.shop, cd.kind).toBeUndefined();
        expect(cd.bonus, cd.kind).toBeUndefined();
      }
    }
  });
  it('u13: no shop anywhere (no row, no shop data, no pack)', () => {
    const n = frozen().find((f) => f.name === 'u13')!;
    for (const cd of cardsOf(n)) {
      const { acts, opens } = actsOf(cd);
      expect(opens.filter((k) => k === 'shop' || k === 'packSheet'), cd.kind).toEqual([]);
      expect(acts.filter((a) => a === 'buyPack' || a === 'buyProduct'), cd.kind).toEqual([]);
      expect(cd.shop, cd.kind).toBeUndefined();
    }
  });
});

describe('the plates in rated income and in the yard hands\' order (2.3.1 step 5, 2.5.3; join2b)', () => {
  it('no plate and no plate level lowers I (17.1, gate two): r3 on the works\' content, the plates bought one by one in content order, then each running plate one level up', async () => {
    const { ratedIncome, ratedIncome0 } = await import('./rate');
    const { R4_ORDER } = await import('../fixtures/salvage2works');
    const cfg = worksCfg();
    const I = (g: SalvageGame) => ratedIncome(contentAt(cfg.salvage, g.salvage), g.salvage);
    let g: SalvageGame = { ...staleBoss(r3Works()), cash: 1e7 };
    let prev = I(g);
    const steps: string[] = [];
    for (const id of R4_ORDER) {
      g = buy(cfg, g, id, 1000, g.salvage.t);
      g = jump(cfg, g, g.salvage.t + 111);
      const now = I(g);
      steps.push(`${id} ${prev.toFixed(0)} -> ${now.toFixed(0)}`);
      expect(now, steps.join('; ')).toBeGreaterThanOrEqual(prev - 0.005);
      expect(ratedIncome0(contentAt(cfg.salvage, g.salvage), g.salvage)).toBeLessThanOrEqual(now);
      prev = now;
    }
    // every plate's level, one at a time from this yard
    for (const id of R4_ORDER) {
      const w = g.salvage.works[id];
      if (!w || w.phase !== 'running') continue;
      const s = structuredClone(g.salvage);
      s.works[id].level += 1;
      expect(I({ ...g, salvage: s }), `${id} level ${w.level + 1}`).toBeGreaterThanOrEqual(I(g) - 0.005);
    }
  });

  it('a hands-fed plate is fed inside the yard hands\' order on a busy yard (not only by an idle hand): the baler on r3, light iron routed to it', () => {
    const cfg = worksCfg();
    let g: SalvageGame = { ...staleBoss(r3Works()), cash: 1e6 };
    g = buy(cfg, g, 'baler', 1000, g.salvage.t);
    g = jump(cfg, g, g.salvage.t + 111);
    g = setRoute(cfg, g, 'li', 'baler', g.salvage.t);
    const s = structuredClone(g.salvage) as SalvageState;
    for (let i = 0; i < 20; i++) s.pieces.push({ uid: `jb.${i}`, grade: 'li', g: 20_000, from: `jb${i}`, spec: 0, pile: 'floor', k: i % 10, claim: null } as SalvageState['pieces'][number]);
    g = { ...g, salvage: s };
    const busy = g.salvage.crew.filter((m) => m.role === 'hand' && m.job !== 'idle').length;
    const h = jump(cfg, g, g.salvage.t + 600);
    expect(busy, 'the hands were at work').toBeGreaterThan(0);
    expect((h.salvage.counts?.['worked:baler'] ?? 0) - (g.salvage.counts?.['worked:baler'] ?? 0)).toBeGreaterThan(0);
  });
});
