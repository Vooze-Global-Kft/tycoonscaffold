/**
 * The hud's words and numbers from the facade's selectors, as plain functions (no React, no React Native,
 * so ./hud.test.ts checks them): the top bar's values and its chips' forms, the goal card's lines, the
 * toasts. Every word through ../strings.ts `say`; every number through the facade's formatters.
 */
import * as R from '../../../engine/salvage';
import { say } from '../strings';

/** The few numbers of the bar (primitives, compared shallowly). */
export interface BarValues {
  ok: boolean;
  cash: number;
  rank: number;
  of: number;
  next: string | null;
  need: number;
  carryKg: number;
  cap: number;
  driving: boolean;
  drivingKg: number;
  trial: boolean;
}

const NONE: BarValues = { ok: false, cash: 0, rank: 0, of: 0, next: null, need: 0, carryKg: 0, cap: 0, driving: false, drivingKg: 0, trial: false };

export function barValues(cfg: R.SalvageConfig, g: R.SalvageGame | undefined): BarValues {
  if (!g?.salvage) return NONE;
  const b = R.topBar(cfg, g);
  return {
    ok: true,
    cash: b.cash,
    rank: b.rank,
    of: b.of,
    next: b.next?.chip ?? null,
    need: b.next?.need_g ?? 0,
    carryKg: b.carry?.kg ?? 0,
    cap: b.carry?.cap ?? 0,
    driving: b.driving !== null,
    drivingKg: b.driving?.kg ?? 0,
    trial: b.driving?.trial ?? false,
  };
}

/** The ladder chip's three forms in words, longest first (5.2). */
export function ladderForms(v: BarValues, c: R.SalvageContent): string[] {
  const rank = { rank: v.rank };
  if (!v.next) return [say({ key: 'rankChipTop', args: { rank, n: { n: v.of } } }, c)];
  const t = { mass_g: v.need, step: 'lot' as const };
  return [
    say({ key: 'rankChip', args: { rank, n: { n: v.of }, rival: { name: v.next }, t } }, c),
    say({ key: 'rankChipShort', args: { rank, rival: { name: v.next } } }, c),
    say({ key: 'rankChipToNext', args: { rank, t } }, c),
  ];
}

/** The carry chip in words. */
export function carryText(v: BarValues, c: R.SalvageContent): string {
  if (v.driving) return say({ key: v.trial ? 'trialLoad' : 'skipLoad', args: { kg: { mass_g: v.drivingKg * 1000, step: 'bridge' } } }, c);
  return say({ key: 'carry', args: { a: { n: Math.round(v.carryKg * 10) / 10 }, b: { n: v.cap } } }, c);
}

export interface GoalValues {
  goal: string | null;
  progress: string | null;
  next: string | null;
  advice: string | null;
}

export function goalValues(cfg: R.SalvageConfig, g: R.SalvageGame | undefined, now: number): GoalValues {
  if (!g?.salvage) return { goal: null, progress: null, next: null, advice: null };
  const c = cfg.salvage;
  const goal = R.nextGoal(cfg, g);
  const adv = R.advice(cfg, g, now);
  const nextDef = goal ? c.goals[goal.n + 1] : undefined;
  return {
    goal: goal ? say(goal.text, c) : null,
    progress: goal?.progress ? say({ key: 'goalProgress', args: { a: { n: goal.progress.a }, b: { n: goal.progress.b } } }, c) : null,
    next: nextDef ? say({ key: nextDef.text as R.TextKey }, c) : null,
    advice: adv ? say(adv.line, c) : null,
  };
}

/** The toast's words for an event, or null (pure; ./hud.test.ts). */
export function toastText(e: R.SalvageEvent, c: R.SalvageContent, cardOpen: boolean): { text: string; refusal: boolean } | null {
  if (e.type === 'loadFull') return { text: say({ key: 'loadFull' }, c), refusal: false };
  if (e.type === 'refused' && !cardOpen) return { text: say({ key: `refusal.${e.key}` as R.TextKey, args: e.args }, c), refusal: true };
  return null;
}

