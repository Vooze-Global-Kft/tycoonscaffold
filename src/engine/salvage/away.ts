/**
 * Time away (yard-stage1.md 2.16): the same `advance` with NO BOSS (no boss acts, no foreman, the hand
 * stripper idle, cutters on whole-thing events). A = min(t_m − max(lastSavedMs, highMs), cap); day
 * boundaries inside A happen at their market time; the time beyond A passes with no work. Cash is in
 * the state when the pass returns (paid when computed); highMs rises to t_m, so a clock that jumps
 * forward and back never pays a stretch twice. Owner: rules-sim.
 */
import { marketDay } from './board';
import { begin, finish, type Ctx } from './clock';
import { cancelAct } from './hand';
import { advance } from './tick';
import { driverTakesOver } from './truck';
import type { AwayCard, SalvageConfig, SalvageEvent, SalvageGame } from './types';

/** The away cap, seconds: awayCap_h[0], or [1] with the Night watch. */
export function awayCapS(cfg: SalvageConfig, g: SalvageGame): number {
  return (g.salvage.owned.includes('night') ? cfg.salvage.awayCap_h[1] : cfg.salvage.awayCap_h[0]) * 3600;
}

/** Seconds of absence a state would be paid for at device time `now` (A of 2.16, before the cap). */
export function awaySeconds(g: SalvageGame, now: number): number {
  const from = Math.max(g.lastSavedAt || 0, g.stats.clockHigh ?? 0, g.salvage.clock.highMs);
  const raw = (now - from) / 1000;
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function card(x: Ctx, seconds: number, capS: number): AwayCard {
  const acc = x.away!;
  const lines = Object.entries(acc.lines).map(([grade, v]) => ({ grade, g: v.g, money: v.money })).sort((a, b) => b.money - a.money);
  const supplied = x.s.ladder.supplied_g - acc.supplied0;
  const crew = x.s.crew;
  let hint: AwayCard['hint'] = null;
  if (acc.money <= 0) hint = { key: 'away.nothing' };
  else if (!crew.some((m) => m.role === 'cutter')) hint = { key: 'away.hintCutter' };
  else if (!crew.some((m) => m.role === 'hand')) hint = { key: 'away.hintHand' };
  return { seconds, capS, lines, supplied_g: supplied, money: acc.money, loads: acc.loads, deliveries: acc.deliveries, passed: acc.passed, hint };
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
  const x = begin(cfg, g, events, false);
  const s = x.s;
  // The market clock of the pass starts where the player left.
  x.ms0 = Math.max(g.lastSavedAt || 0, g.stats.clockHigh ?? 0, s.clock.highMs);
  x.t0 = s.t;
  cancelAct(x, s.t);
  if (s.act.kind === 'drive' || s.truck.by === 'boss') driverTakesOver(x, s.t);
  const showCard = raw > cfg.salvage.away.gapS;
  x.away = { lines: {}, money: 0, supplied0: s.ladder.supplied_g, loads: 0, deliveries: 0, passed: [] };
  // The boss's last sample is stale from the first second of the pass (no boss).
  s.presence = { ...s.presence, moving: false, standingFor: 0 };
  advance(x, s.t + A);
  s.clock.highMs = Math.max(s.clock.highMs, Number.isFinite(now) ? now : 0, x.ms0 + A * 1000);
  s.clock.day = Math.max(s.clock.day, marketDay(x.c, s.clock.highMs));
  if (showCard) {
    const c = card(x, A, capS);
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
      s.away = { ...c, seconds: prev.seconds + c.seconds, lines: [...lines.values()], supplied_g: prev.supplied_g + c.supplied_g, money: prev.money + c.money, loads: prev.loads + c.loads, deliveries: prev.deliveries + c.deliveries, passed: [...prev.passed, ...c.passed] };
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
