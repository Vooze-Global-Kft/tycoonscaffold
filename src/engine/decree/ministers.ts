/**
 * Ministers (2.9, 7.3). Package P1b (docs/design/office-build-plan.md).
 *
 * Nine ministers arrive as applications in a fixed order (the config's order), the next undelivered
 * one at days 9, 30 and 60 of any term until all have come. Sign appoints; refuse sends them away and
 * the same application returns 30 papers later, in any office. Each runs their club's ministry in
 * every office and brings one desk rule, a factor on one parameter printed as their initials on every
 * paper it touches ("DS ×0.9"). Never bought, never random, never ranked. D21: the next application is
 * the next undelivered minister whose club the current office has (one of a club the town does not
 * have waits for the office that has it).
 *
 * The days are slots: a term's k-th application is due once the day has reached the k-th of 9, 30,
 * 60 (a day the draw skipped, because several papers were decided between two arrivals, is not lost).
 * A slot is used when its application is decided (`appoint` / `sendAway` count it in
 * `appSlotsUsed`) or while it waits in the tray, on the desk, in the take-back window or aside. A
 * return is not a slot: it is due 30 decided papers after the refusal, whatever the day.
 *
 * SEAM: `nextApplication` is what the draw's step (4) asks (draw.ts, P1a); `ministerFactors` goes into
 * the ONE Factors object (./twists.ts `deskFactors`); the appoint effect of an application is applied
 * by decide.ts (P1a) `applyShown` through `appoint`, its refusal through `sendAway`; slips.ts `ledger`
 * (P1a) reads `cabinet` for each row's minister.
 */
import { clubIndex } from './params';
import { combineFactors, neutralFactors, ruleFactors } from './twists';
import type { DecreeConfig, DecreeEvent, DecreeGame, Factors, Paper } from './types';

const withDecree = (g: DecreeGame, patch: Partial<DecreeGame['decree']>): DecreeGame => ({ ...g, decree: { ...g.decree, ...patch } });

/** Every paper the player still has to decide (tray, desk, take-back window, aside). */
function waitingPapers(g: DecreeGame): Paper[] {
  const d = g.decree;
  const out = [...d.tray, ...d.asideTray];
  if (d.desk?.type === 'paper') out.push(d.desk.paper);
  if (d.pending) out.push(d.pending.item.paper);
  return out;
}

/** The ministers whose application paper waits to be decided. */
function inFlight(g: DecreeGame): Set<string> {
  const s = new Set<string>();
  for (const p of waitingPapers(g)) if (p.kind === 'application') for (const e of p.sign.effects) if (e.type === 'appoint') s.add(e.minister);
  return s;
}

/** Whether the current office has minister `id`'s club (D21). */
function clubHere(cfg: DecreeConfig, g: DecreeGame, id: string): boolean {
  const m = cfg.decree.ministers.find((x) => x.id === id);
  return !!m && clubIndex(cfg, g.decree.office, m.club) >= 0;
}

/** Whether `minister`'s application waiting now is a return (it was sent away and is due back). */
function isReturn(g: DecreeGame, minister: string): boolean {
  return g.decree.applicationReturns.some((r) => r.minister === minister);
}

/**
 * The minister whose application is due now, or null (2.9, D21): a return due (30 decided papers
 * after its refusal) first, earliest first; else, when the day has passed a slot this term has not
 * used, the next undelivered minister of the fixed order whose club the office has. Never one whose
 * application already waits. Built.
 */
export function nextApplication(cfg: DecreeConfig, g: DecreeGame): string | null {
  const d = g.decree;
  const flying = inFlight(g);
  const back = d.applicationReturns
    .filter((r) => r.dueAt <= d.stats.decisions && !flying.has(r.minister) && clubHere(cfg, g, r.minister) && !d.cabinet[r.minister])
    .sort((a, b) => a.dueAt - b.dueAt)[0];
  if (back) return back.minister;
  const slots = cfg.decree.forms.application.days.filter((day) => d.day >= day).length;
  const slotsFlying = [...flying].filter((m) => !isReturn(g, m)).length;
  if (slots <= (d.appSlotsUsed ?? 0) + slotsFlying) return null;
  return cfg.decree.ministers.find((m) => !d.applicationsDelivered.includes(m.id) && !d.cabinet[m.id] && !flying.has(m.id) && clubHere(cfg, g, m.id))?.id ?? null;
}

/** The appointed ministers' desk rules as Factors (club-scoped to their ministry's club where the rule names one), in the fixed order. Built. */
export function ministerFactors(cfg: DecreeConfig, g: DecreeGame): Factors {
  let f = neutralFactors();
  for (const m of cfg.decree.ministers) if (g.decree.cabinet[m.id]) f = combineFactors(f, ruleFactors(cfg, g.decree.office, m.rule, m.id, m.initials));
  return f;
}

/** The bookkeeping of a decided application: delivered, its slot counted (a first application only), its return removed. */
function decided(g: DecreeGame, minister: string): DecreeGame {
  const d = g.decree;
  const wasReturn = isReturn(g, minister);
  return withDecree(g, {
    applicationsDelivered: d.applicationsDelivered.includes(minister) ? d.applicationsDelivered : [...d.applicationsDelivered, minister],
    applicationReturns: d.applicationReturns.filter((r) => r.minister !== minister),
    appSlotsUsed: (d.appSlotsUsed ?? 0) + (wasReturn ? 0 : 1),
  });
}

/** Appoints `minister` (the application's sign effect); the same object for an unknown or seated minister. Built. */
export function appoint(cfg: DecreeConfig, g: DecreeGame, minister: string, events: DecreeEvent[]): DecreeGame {
  const def = cfg.decree.ministers.find((m) => m.id === minister);
  if (!def || g.decree.cabinet[minister]) return g;
  const s = decided(g, minister);
  events.push({ type: 'appointed', minister });
  return withDecree(s, { cabinet: { ...s.decree.cabinet, [minister]: { club: def.club, termsServed: 0 } } });
}

/**
 * Sends `minister` away (the refusal): the application returns `returnAfter` decided papers after this
 * one (dueAt in decisions ever, counted after this paper's own decision); the same object for an
 * unknown or seated minister. Built.
 */
export function sendAway(cfg: DecreeConfig, g: DecreeGame, minister: string): DecreeGame {
  const def = cfg.decree.ministers.find((m) => m.id === minister);
  if (!def || g.decree.cabinet[minister]) return g;
  const s = decided(g, minister);
  const dueAt = g.decree.stats.decisions + 1 + cfg.decree.forms.application.returnAfter;
  return withDecree(s, { applicationReturns: [...s.decree.applicationReturns, { minister, dueAt }] });
}

/**
 * The Cabinet (4.4): every minister in the fixed order, appointed or a dotted place, the ministry of
 * their club in the current office (null when the office has no such ministry), terms served and
 * initials. Built.
 */
export function cabinet(cfg: DecreeConfig, g: DecreeGame): { minister: string; appointed: boolean; ministry: number | null; termsServed: number; initials: string }[] {
  const row = cfg.decree.offices[g.decree.office];
  return cfg.decree.ministers.map((m) => {
    const seat = g.decree.cabinet[m.id];
    const i = row.ministries.findIndex((x) => x.club === m.club);
    return { minister: m.id, appointed: !!seat, ministry: i >= 0 ? i : null, termsServed: seat?.termsServed ?? 0, initials: m.initials };
  });
}

/** The minister who runs ministry i of the current office (their club's ministry), or null. Built. */
export function ministerOf(cfg: DecreeConfig, g: DecreeGame, i: number): string | null {
  const club = cfg.decree.offices[g.decree.office].ministries[i]?.club ?? null;
  if (!club) return null;
  return cfg.decree.ministers.find((m) => m.club === club && g.decree.cabinet[m.id])?.id ?? null;
}
