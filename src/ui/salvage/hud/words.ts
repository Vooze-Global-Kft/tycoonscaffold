/**
 * The hud's words and numbers from the facade's selectors, as plain functions (no React, no React Native,
 * so ./hud.test.ts checks them): the top bar's values and its chips' forms, the goal card's lines, the
 * toasts. Every word through ../strings.ts `say`; every number through the facade's formatters.
 */
import * as R from '../../../engine/salvage';
import { say as sayRaw, TEXT } from '../strings';

/**
 * `say`, but a key the strings file does not define yet prints as a visible "[key]" (BUILD.md: a missing
 * key is a request to the strings engineer and shows until it is written), never a crash.
 */
export function say(t: R.Txt, c: Parameters<typeof sayRaw>[1]): string {
  if (!(t.key in TEXT)) return `[${t.key}]`;
  return sayRaw(t, c);
}

/**
 * Money in the bars and chips (finding P4's ruling): the facade's fmtMoney, which prints whole § from §100
 * since rules-book's W11 ("§142", "§13,309"); tickets keep their hundredths (./ticketView.ts exact()).
 */
export function barMoney(x: number): string {
  return R.fmtMoney(x);
}

/** The few numbers of the bar (primitives, compared shallowly). */
export interface BarValues {
  ok: boolean;
  cash: number;
  rank: number;
  of: number;
  next: string | null;
  need: number;
  /** The rival just passed (its chip name id), else null. */
  passed: string | null;
  load_g: number;
  cap_g: number;
  driving: boolean;
  net_g: number;
  trial: boolean;
}

const NONE: BarValues = { ok: false, cash: 0, rank: 0, of: 0, next: null, need: 0, passed: null, load_g: 0, cap_g: 0, driving: false, net_g: 0, trial: false };

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
    passed: b.passed?.chip ?? null,
    load_g: b.carry?.load_g ?? 0,
    cap_g: b.carry?.cap_g ?? 0,
    driving: b.driving !== null,
    net_g: b.driving?.net_g ?? 0,
    trial: b.driving?.trial ?? false,
  };
}

/**
 * The ladder chip's forms in words, longest first (5.2): "26th of 26 · next {rival} 0.15 t", "{rank} · next
 * {rival}", "{rank} · 0.15 t to next"; just after a pass, "25th of 26 · passed {rival}" first.
 */
export function ladderForms(v: BarValues, c: R.SalvageContent): string[] {
  const rank = { rank: v.rank };
  const passed = v.passed ? [say({ key: 'rankChipPassed', args: { rank, n: { n: v.of }, rival: { name: v.passed } } }, c)] : [];
  if (!v.next) return [...passed, say({ key: 'rankChipTop', args: { rank, n: { n: v.of } } }, c)];
  const t = { tonnes_g: v.need };
  return [
    ...passed,
    say({ key: 'rankChip', args: { rank, n: { n: v.of }, rival: { name: v.next }, t } }, c),
    say({ key: 'rankChipShort', args: { rank, rival: { name: v.next } } }, c),
    say({ key: 'rankChipToNext', args: { rank, t } }, c),
  ];
}

/**
 * The carry chip in words: "28.6 / 30 kg" on foot; while driving the skip's mass alone ("1,020 kg", the
 * lead's ruling of 15:55; the chip draws a skip pictogram before it): `carryDriving` "{kg}".
 */
export function carryText(v: BarValues, c: R.SalvageContent): string {
  const kg = { mass_g: v.net_g, step: 'bridge' as const };
  if (v.driving) return say({ key: 'carryDriving', args: { kg } }, c);
  // 2.2's mass rule on both sides: one decimal below 100 kg, whole kilograms from 100 kg ("28.6 / 60.0 kg",
  // "120 / 150 kg"); the chip's 104 pt hold "150 / 150 kg" on one line where "150.0 / 150.0 kg" wrapped.
  return say({ key: 'carry', args: { a: { ref: carryKg(v.load_g) }, b: { ref: carryKg(v.cap_g) } } }, c);
}

function carryKg(g: number): string {
  const kg = R.fmtKg(g);
  return Number(kg) >= 100 ? R.fmtMass(g).replace(/\s*kg$/, '') : kg;
}

export interface GoalValues {
  goal: string | null;
  /** The goal's meter ("1.20 / 2.50 t") and its share 0..1, or null. */
  progress: string | null;
  share: number | null;
  next: string | null;
  advice: string | null;
}

/** The goal card's lines from the facade's `nextGoal` (with its meter and next line) and `advice`. */
export function goalValues(cfg: R.SalvageConfig, g: R.SalvageGame | undefined, now: number): GoalValues {
  if (!g?.salvage) return { goal: null, progress: null, share: null, next: null, advice: null };
  const c = cfg.salvage;
  const goal = R.nextGoal(cfg, g);
  const adv = R.advice(cfg, g, now);
  const meter = goal?.meter ?? null;
  const progress = meter ? say(meter.text, c) : goal?.progress ? say({ key: 'goalProgress', args: { a: { n: goal.progress.a }, b: { n: goal.progress.b } } }, c) : null;
  return {
    goal: goal ? say(goal.text, c) : null,
    progress,
    share: meter ? Math.max(0, Math.min(1, meter.share)) : null,
    next: goal?.next ? say(goal.next, c) : null,
    advice: adv ? say(adv.line, c) : null,
  };
}

/** The toast's words for an event, or null (pure; ./hud.test.ts). */
export function toastText(e: R.SalvageEvent, c: R.SalvageContent, cardOpen: boolean): { text: string; refusal: boolean } | null {
  if (e.type === 'loadFull') return { text: say({ key: 'loadFull' }, c), refusal: false };
  if (e.type === 'refused' && !cardOpen) return { text: say({ key: `refusal.${e.key}` as R.TextKey, args: e.args }, c), refusal: true };
  return null;
}

