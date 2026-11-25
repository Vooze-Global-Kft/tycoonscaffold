/**
 * Time away (yard-stage1.md 2.16): the same `advance` with NO BOSS (no boss acts, no foreman, the hand
 * stripper idle, cutters on whole-thing events). A = min(t_m − max(lastSavedMs, highMs), cap); day
 * boundaries inside A happen at their market time; the time beyond A passes with no work. Cash is in
 * the state when the pass returns (paid when computed); highMs rises to t_m, so a clock that jumps
 * forward and back never pays a stretch twice. Owner: rules-sim.
 */
import { releaseHolds } from './bays';
import { marketDay } from './board';
import { begin, finish, priceAt, type Ctx } from './clock';
import { dealDeliver, dealReprice } from './deal';
import { cancelAct } from './hand';
import { floorGrams, lineAmount, roundMoney } from './money';
import { advance } from './tick';
import { driverTakesOver } from './truck';
import type { AwayCard, SalvageConfig, SalvageEvent, SalvageGame } from './types';

const DAY_MS = 86_400_000;

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
  for (let r = g.salvage.ladder.rung + 1; r <= by.length; r++) {
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
    net: roundMoney(acc.money - acc.spent),
    deliveryList: acc.deliveryList,
    runLonger,
  };
}

/** A sink for the pass's events: only awayReport, passed and rung reach the caller (types.ts MAX_TICK: never item events); the rest are dropped as they come (no 35,000-event array, R3). */
function awaySink(out: SalvageEvent[] | undefined): SalvageEvent[] {
  const sink: SalvageEvent[] = [];
  sink.push = function push(e: SalvageEvent): number {
    if (out) {
      for (let i = 0; i < arguments.length; i++) {
        const q = arguments[i] as SalvageEvent;
        if (q.type === 'awayReport' || q.type === 'passed' || q.type === 'rung') out.push(q);
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
  const s = x.s;
  // The market clock of the pass starts where the player left.
  x.ms0 = Math.max(g.lastSavedAt || 0, g.stats.clockHigh ?? 0, s.clock.highMs);
  x.t0 = s.t;
  cancelAct(x, s.t);
  if (s.act.kind === 'drive' || s.truck.by === 'boss') driverTakesOver(x, s.t);
  // join2 (seam a): the card needs a real absence (over away.cardS, a minute) and a game in which something
  // was done (a count of the rules above zero); a stall under the loading curtain is no absence.
  const cardS = Math.max(cfg.salvage.away.gapS, (cfg.salvage.away as { cardS?: number }).cardS ?? 60);
  const played = Object.values(g.salvage.counts ?? {}).some((v) => (v ?? 0) > 0);
  const showCard = raw > cardS && played;
  x.away = { lines: {}, money: 0, supplied0: s.ladder.supplied_g, loads: 0, deliveries: 0, passed: [], spent: 0, bought: {}, deliveryList: [] };
  // The boss's last sample is stale from the first second of the pass (no boss).
  s.presence = { ...s.presence, moving: false, standingFor: 0 };
  const runLonger = runLongerOf(cfg, g, capS);
  // join3: the bays before the pass, so the card can say what the time away left in them unsold.
  const bays0 = new Map(Object.entries(s.bays).map(([gr, b]) => [gr, b.g] as const));
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
