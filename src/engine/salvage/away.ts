/**
 * Time away (yard-stage1.md 2.16): the same `advance` with NO BOSS (no boss acts, no foreman, the hand
 * stripper idle, cutters on whole-thing events). A = min(t_m − max(lastSavedMs, highMs), cap); day
 * boundaries inside A happen at their market time; the time beyond A passes with no work. Cash is in
 * the state when the pass returns (paid when computed); highMs rises to t_m, so a clock that jumps
 * forward and back never pays a stretch twice. Owner: rules-sim.
 */
import { releaseHolds } from './bays';
import { marketDay } from './board';
import { begin, finish, priceAt, type AwayAcc, type Ctx } from './clock';
import { dealDeliver, dealReprice } from './deal';
import { cancelAct } from './hand';
import { floorGrams, lineAmount, roundMoney } from './money';
import { topRungOf } from './ladder';
import { crateCount } from './crate';
import { worksOpened } from './layer';
import { lotsWaiting } from './lots';
import { advance } from './tick';
import { driverTakesOver } from './truck';
import type { AwayCard, AwayWorks, SalvageConfig, SalvageEvent, SalvageGame, SalvageState } from './types';

const DAY_MS = 86_400_000;

/** engine2-income (E40): the card's list of held bays sold to keep the yard running (types.ts AwayCard.heldSold: requests.md). */
type HeldCard = AwayCard & { heldSold?: string[] };

/** E33: the away cap in hours on rung `rung` (1-based) with or without the Night watch. */
export function awayCapH(c: SalvageConfig['salvage'], rung: number, night: boolean): number {
  const by = c.awayCapByRung_h;
  const base = by[Math.min(by.length, Math.max(1, Math.floor(rung))) - 1];
  return base + (night ? c.nightWatch_h : 0);
}

/** The away cap, seconds (E33): the rung's cap (awayCapByRung_h), plus nightWatch_h with the Night watch. */
export function awayCapS(cfg: SalvageConfig, g: SalvageGame): number {
  return awayCapH(cfg.salvage, g.salvage.ladder.rung, g.salvage.owned.includes('night')) * 3600;
}

/** E33: what would make the yard run longer than `capS`: the next rung whose cap is longer, else the Night watch when not owned, else null. */
export function runLongerOf(cfg: SalvageConfig, g: SalvageGame, capS: number): AwayCard['runLonger'] {
  const c = cfg.salvage;
  const night = g.salvage.owned.includes('night');
  const by = c.awayCapByRung_h;
  // engine2-hooks (content2's request, 26 Nov): only a rung this stage can reach is named (ladder.ts
  // STAGE_TOP_RUNG; `ladder.topRung` once the rules read it), so a stage-2 cap list longer than the ladder
  // promises nothing beyond it.
  const top = Math.min(by.length, topRungOf(c)); // rules-money (2.11): the stage's top rung is content (ladder.topRung, else 3)
  for (let r = g.salvage.ladder.rung + 1; r <= top; r++) {
    const h = awayCapH(c, r, night) * 3600;
    if (h > capS + 1e-6) return { rung: r, capS: h };
  }
  const onSale = [...c.shop, ...c.dayOneList].some((i) => i.key === 'night');
  if (!night && onSale) {
    const h = awayCapH(c, g.salvage.ladder.rung, true) * 3600;
    if (h > capS + 1e-6) return { item: 'night', capS: h };
  }
  return null;
}

/** Seconds of absence a state would be paid for at device time `now` (A of 2.16, before the cap). */
export function awaySeconds(g: SalvageGame, now: number): number {
  const from = Math.max(g.lastSavedAt || 0, g.stats.clockHigh ?? 0, g.salvage.clock.highMs);
  const raw = (now - from) / 1000;
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function card(x: Ctx, seconds: number, capS: number, absentS: number, runLonger: AwayCard['runLonger']): AwayCard {
  const acc = x.away!;
  const lines = Object.entries(acc.lines).map(([grade, v]) => ({ grade, g: v.g, money: v.money })).sort((a, b) => b.money - a.money);
  const supplied = x.s.ladder.supplied_g - acc.supplied0;
  const crew = x.s.crew;
  let hint: AwayCard['hint'] = null;
  if (acc.money <= 0) hint = { key: 'away.nothing' };
  else if (!crew.some((m) => m.role === 'cutter')) hint = { key: 'away.hintCutter' };
  else if (!crew.some((m) => m.role === 'hand')) hint = { key: 'away.hintHand' };
  const bought = Object.entries(acc.bought).map(([partner, v]) => ({ partner, n: v.n, spent: v.spent })).sort((a, b) => b.spent - a.spent);
  return {
    seconds,
    capS,
    lines,
    supplied_g: supplied,
    money: acc.money,
    loads: acc.loads,
    deliveries: acc.deliveries,
    passed: acc.passed,
    hint,
    absentS,
    spent: acc.spent,
    bought,
    // The lead, 27 November (ruling 23.2): NET is what the cash moved: sold, less the loads, less the bank's share.
    net: roundMoney(acc.money - acc.spent - (acc.bank > 0 ? acc.bank : 0)),
    deliveryList: acc.deliveryList,
    runLonger,
    // engine2-income (E40): the held bays sold to keep the yard running, in order (only when there were any).
    ...((acc as AwayAcc & { heldSold?: string[] }).heldSold?.length ? { heldSold: [...(acc as AwayAcc & { heldSold?: string[] }).heldSold!] } : {}),
    // Stage 2 (2.14.4, 2.17; s2a-fix): each line only when it holds something, so a first-yard card is unchanged.
    ...(acc.bank > 0 ? { bank: acc.bank } : {}),
    ...(acc.repaid.length ? { repaid: [...acc.repaid] } : {}),
    ...(acc.rack.n > 0 ? { rack: { ...acc.rack } } : {}),
    ...(acc.van.n > 0 ? { van: { ...acc.van } } : {}),
    ...(acc.lotsWaiting !== null && acc.lotsWaiting > 0 ? { lotsWaiting: acc.lotsWaiting } : {}),
  } as AwayCard;
}

/** s2e-crew (2.17): what the works' report reads from the state as the pass begins (pour counts, supplied worth by material). */
interface WorksBefore {
  poured: Record<string, number>;
  worth: Record<string, number>;
}

function worksBefore(s: SalvageState): WorksBefore {
  const poured: Record<string, number> = {};
  for (const [k, v] of Object.entries(s.counts ?? {})) if (k.startsWith('poured:')) poured[k.slice(7)] = v ?? 0;
  return { poured, worth: { ...s.ladder.worth } };
}

/** The content's plate order (pours are listed in it; a plate it does not name comes last, by id). */
function byPlateOrder(order: readonly string[]): (a: { plate: string }, b: { plate: string }) => number {
  const at = (p: string) => {
    const i = order.indexOf(p);
    return i < 0 ? Infinity : i;
  };
  return (a, b) => at(a.plate) - at(b.plate) || (a.plate < b.plate ? -1 : a.plate > b.plate ? 1 : 0);
}

const byGrowth = (a: { material: string; worth: number }, b: { material: string; worth: number }): number => b.worth - a.worth || (a.material < b.material ? -1 : a.material > b.material ? 1 : 0);

/**
 * s2e-crew (the economy designed again 2.17): the works' report of one pass, read at the pass's end. Gross is the card's
 * money, the bank's part its `bank`: the numbers the pass applied (paid when computed, lesson 5).
 */
function worksReport(x: Ctx, b: WorksBefore): AwayWorks {
  const acc = x.away!;
  const s = x.s;
  const gross = acc.money;
  const toBank = acc.bank > 0 ? acc.bank : 0;
  const a = s.bank?.agreement ?? null;
  const loan: AwayWorks['loan'] = a
    ? { plate: a.plate, left: roundMoney(Math.max(0, a.T - a.taken)), T: a.T }
    : acc.repaid.length
      ? { plate: acc.repaid[acc.repaid.length - 1], repaid: true }
      : null;
  const pours: AwayWorks['pours'] = [];
  for (const [k, v] of Object.entries(s.counts ?? {})) {
    if (!k.startsWith('poured:')) continue;
    const plate = k.slice(7);
    const n = (v ?? 0) - (b.poured[plate] ?? 0);
    if (n > 0) pours.push({ plate, n });
  }
  pours.sort(byPlateOrder(Object.keys(x.c.works?.plates ?? {})));
  const grown: AwayWorks['grown'] = [];
  for (const [material, w] of Object.entries(s.ladder.worth)) {
    const d = roundMoney(w - (b.worth[material] ?? 0));
    if (d > 0) grown.push({ material, worth: d });
  }
  grown.sort(byGrowth);
  return { gross, toBank, toYard: roundMoney(gross - toBank), loan, pours, lots: { n: lotsWaiting(x), max: x.c.lots?.max ?? 0 }, crate: crateCount(x), grown };
}

/**
 * s2e-crew (2.17; ruling 22 X2): two passes' works reports on one open card. Money and pours add up; the pieces waiting
 * and the picking table are the later pass's; the loan is the later pass's, and a loan repaid on the first pass stays
 * "repaid" on the card (the same absence) unless an agreement stands at its end.
 */
function mergeWorks(p: AwayWorks | undefined, q: AwayWorks | undefined, order: readonly string[]): AwayWorks | undefined {
  if (!p || !q) return q ?? p;
  const pours = new Map(p.pours.map((r) => [r.plate, r.n] as const));
  for (const r of q.pours) pours.set(r.plate, (pours.get(r.plate) ?? 0) + r.n);
  const grown = new Map(p.grown.map((r) => [r.material, r.worth] as const));
  for (const r of q.grown) grown.set(r.material, roundMoney((grown.get(r.material) ?? 0) + r.worth));
  const gross = roundMoney(p.gross + q.gross);
  const toBank = roundMoney(p.toBank + q.toBank);
  return {
    gross,
    toBank,
    toYard: roundMoney(gross - toBank),
    loan: q.loan ?? (p.loan && 'repaid' in p.loan ? p.loan : null),
    pours: [...pours].map(([plate, n]) => ({ plate, n })).sort(byPlateOrder(order)),
    lots: { ...q.lots },
    crate: q.crate,
    grown: [...grown].map(([material, worth]) => ({ material, worth })).sort(byGrowth),
  };
}

/** A sink for the pass's events: only awayReport, passed, rung and repaid reach the caller (types.ts MAX_TICK: never item events); the rest are dropped as they come (no 35,000-event array, R3). */
function awaySink(out: SalvageEvent[] | undefined): SalvageEvent[] {
  const sink: SalvageEvent[] = [];
  sink.push = function push(e: SalvageEvent): number {
    if (out) {
      for (let i = 0; i < arguments.length; i++) {
        const q = arguments[i] as SalvageEvent;
        // 2.19 (s2a-fix): the away pass emits awayReport, passed, rung and repaid (an agreement repaid in full).
        if (q.type === 'awayReport' || q.type === 'passed' || q.type === 'rung' || (q as { type: string }).type === 'repaid') out.push(q);
      }
    }
    void e;
    return 0;
  } as SalvageEvent[]['push'];
  return sink;
}

/**
 * E34: the market midnights the cap did not play (from the end of the yard's run to device time `endMs`):
 * the market clock jumps to each, the supply deal delivers from its reserve as it stands (the yard does
 * no work beyond the cap: nothing is weighed in), an offered deal re-prices, holds may let go.
 */
function skippedMidnights(x: Ctx, endMs: number): void {
  const s = x.s;
  for (let guard = 0; guard < 100_000; guard++) {
    const nextMs = x.c.board.epochMs + (s.clock.day + 1) * DAY_MS;
    if (!(nextMs <= endMs)) return;
    if (s.deal.phase !== 'running' && s.deal.phase !== 'declined' && s.deal.phase !== 'offered') return;
    // The yard clock stands at the end of its run; the market clock is at this midnight.
    x.ms0 = nextMs - (s.t - x.t0) * 1000;
    s.clock.day += 1;
    dealDeliver(x, s.t);
    dealReprice(x, s.t);
    releaseHolds(x);
  }
}

/**
 * The away pass from the state's market high mark to device time `now`: advances `salvage.t` by A (never
 * stats.playSeconds), pays into cash, leaves the one away card in `salvage.away` (a gap under away.gapS
 * advances silently), bumps `epoch`, and raises highMs to `now`.
 */
export function awayPass(cfg: SalvageConfig, g: SalvageGame, now: number, events?: SalvageEvent[]): SalvageGame {
  const raw = awaySeconds(g, now);
  if (raw <= 0) return g;
  const capS = awayCapS(cfg, g);
  const A = Math.min(raw, capS);
  const x = begin(cfg, g, awaySink(events), false);
  // RULING2.md 14.4: the state handed in was checked where it was made (live play checks at every instant,
  // an away pass at every changed instant), so the pass starts clean: a pass that begins where another ended
  // looks at the same instants as one pass would.
  x.dirty = false;
  const s = x.s;
  // The market clock of the pass starts where the player left.
  x.ms0 = Math.max(g.lastSavedAt || 0, g.stats.clockHigh ?? 0, s.clock.highMs);
  x.t0 = s.t;
  cancelAct(x, s.t);
  if (s.act.kind === 'drive' || s.truck.by === 'boss') driverTakesOver(x, s.t);
  // join2 (seam a): the card needs a real absence (over away.cardS, a minute) and a game in which something
  // was done (a count of the rules above zero); a stall under the loading curtain is no absence.
  const cardS = Math.max(cfg.salvage.away.gapS, (cfg.salvage.away as { cardS?: number }).cardS ?? 60);
  const played = Object.entries(g.salvage.counts ?? {}).some(([k, v]) => k !== 'goalsAt' && (v ?? 0) > 0);
  // s2-fix-loop (X2, RULING2.md 22): AN OPEN AWAY CARD TAKES EVERY PASS. A pass made while a card still waits (an
  // absence over away.gapS and under cardS, the card not yet closed) is added to it (its sold rows, its loads, its
  // net, its time away), so the card always equals what the cash moved. The first yard too (the owner's phone).
  const showCard = (raw > cardS && played) || !!g.salvage.away;
  x.away = { lines: {}, money: 0, supplied0: s.ladder.supplied_g, loads: 0, deliveries: 0, passed: [], spent: 0, bought: {}, deliveryList: [], bank: 0, repaid: [], rack: { n: 0, money: 0 }, van: { n: 0, money: 0 }, lotsWaiting: null };
  // The boss's last sample is stale from the first second of the pass (no boss).
  s.presence = { ...s.presence, moving: false, standingFor: 0 };
  const runLonger = runLongerOf(cfg, g, capS);
  // join3: the bays before the pass, so the card can say what the time away left in them unsold.
  const bays0 = new Map(Object.entries(s.bays).map(([gr, b]) => [gr, b.g] as const));
  // s2e-crew (2.17): what the works' report counts from (read only once the works have opened).
  const works0 = worksBefore(s);
  advance(x, s.t + A);
  // E34: deal deliveries at every midnight beyond the cap, up to the device time.
  const endMs = Number.isFinite(now) ? now : x.ms0 + A * 1000;
  skippedMidnights(x, endMs);
  s.clock.highMs = Math.max(s.clock.highMs, Number.isFinite(now) ? now : 0, x.ms0 + A * 1000);
  s.clock.day = Math.max(s.clock.day, marketDay(x.c, s.clock.highMs));
  // Days the cap did not play still count for Hold (E32, away alike).
  releaseHolds(x);
  if (showCard) {
    const c = card(x, A, capS, raw, runLonger);
    // join3: the bays' change at today's lot price (gains are stock not yet sold; a collection lowers it).
    let dv = 0;
    for (const [gr, b] of Object.entries(s.bays)) {
      const d = b.g - (bays0.get(gr) ?? 0);
      if (d !== 0) dv += Math.sign(d) * lineAmount(floorGrams(Math.abs(d)), priceAt(x, gr, s.clock.day));
    }
    c.bayDelta = roundMoney(dv);
    c.unsold = roundMoney(Math.max(0, dv));
    // s2e-crew (2.17): the works' report, from the works' opening only (the first yard's card keeps its fields).
    if (worksOpened(s)) c.works = worksReport(x, works0);
    if (s.away) {
      // A card still waiting: the two passes add up on one card (paid already, each when computed).
      const prev = s.away;
      const lines = new Map(prev.lines.map((l) => [l.grade, { ...l }]));
      for (const l of c.lines) {
        const q = lines.get(l.grade);
        if (q) {
          q.g += l.g;
          q.money += l.money;
        } else lines.set(l.grade, { ...l });
      }
      const bought = new Map((prev.bought ?? []).map((b) => [b.partner, { ...b }]));
      for (const b of c.bought ?? []) {
        const q = bought.get(b.partner);
        if (q) {
          q.n += b.n;
          q.spent = roundMoney(q.spent + b.spent);
        } else bought.set(b.partner, { ...b });
      }
      const money = roundMoney(prev.money + c.money);
      const spent = roundMoney((prev.spent ?? 0) + (c.spent ?? 0));
      s.away = {
        ...c,
        seconds: prev.seconds + c.seconds,
        absentS: (prev.absentS ?? prev.seconds) + (c.absentS ?? c.seconds),
        lines: [...lines.values()].sort((a, b) => b.money - a.money),
        supplied_g: prev.supplied_g + c.supplied_g,
        money,
        loads: prev.loads + c.loads,
        deliveries: prev.deliveries + c.deliveries,
        passed: [...prev.passed, ...c.passed],
        spent,
        bought: [...bought.values()].sort((a, b) => b.spent - a.spent),
        net: roundMoney(money - spent),
        bayDelta: roundMoney((prev.bayDelta ?? prev.unsold ?? 0) + (c.bayDelta ?? 0)),
        unsold: roundMoney(Math.max(0, (prev.bayDelta ?? prev.unsold ?? 0) + (c.bayDelta ?? 0))),
        deliveryList: [...(prev.deliveryList ?? []), ...(c.deliveryList ?? [])],
      };
      // engine2-income (E40): both passes' held bays sold to keep the yard running.
      const held = [...new Set([...((prev as HeldCard).heldSold ?? []), ...((c as HeldCard).heldSold ?? [])])];
      if (held.length) (s.away as HeldCard).heldSold = held;
      // Stage 2 (s2a-fix): the bank's line, the repaid agreements and the gate's and the van's sales add up across
      // passes; the oversize pieces waiting are the latest pass's count. Absent where neither pass had any.
      const merged = s.away as AwayCard;
      delete merged.bank;
      delete merged.repaid;
      delete merged.rack;
      delete merged.van;
      const bank = roundMoney((prev.bank ?? 0) + (c.bank ?? 0));
      if (bank > 0) merged.bank = bank;
      // Ruling 23.2: the merged card's NET is the cash's own change over both passes.
      merged.net = roundMoney(money - spent - (bank > 0 ? bank : 0));
      const repaid = [...(prev.repaid ?? []), ...(c.repaid ?? [])];
      if (repaid.length) merged.repaid = repaid;
      for (const k of ['rack', 'van'] as const) {
        const n = (prev[k]?.n ?? 0) + (c[k]?.n ?? 0);
        if (n > 0) merged[k] = { n, money: roundMoney((prev[k]?.money ?? 0) + (c[k]?.money ?? 0)) };
      }
      // s2e-crew (2.17): the works' report adds up across passes too (absent on a first-yard card).
      delete merged.works;
      const works = mergeWorks(prev.works, c.works, Object.keys(x.c.works?.plates ?? {}));
      if (works) merged.works = works;
    } else s.away = c;
    s.beenAway = true;
    x.ev.push({ type: 'awayReport', card: s.away });
  }
  s.epoch += 1;
  x.away = null;
  return finish(g, x, 0);
}

/**
 * The engine mode's offline hook (2.16). MONEY IS PAID ONCE: `earnings` is ALWAYS 0 and `report` always
 * undefined; the cash is already in the returned game.
 */
export function salvageOffline(cfg: SalvageConfig, g: SalvageGame, now: number): { seconds: number; earnings: 0; game: SalvageGame; report: undefined } {
  const raw = awaySeconds(g, now);
  if (raw <= 0) return { seconds: 0, earnings: 0, game: g, report: undefined };
  const seconds = Math.min(raw, awayCapS(cfg, g));
  return { seconds, earnings: 0, game: awayPass(cfg, g, now), report: undefined };
}
