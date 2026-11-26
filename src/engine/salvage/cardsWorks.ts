/**
 * THE WORKS' CARDS (stage 2, yard-stage2.md 4.3, 4.4, 4.6, 4.7): the works card of each plate, the process
 * board's stage-2 rows and pages, the Yard sale, an oversize piece, the picking table. Owner: rules-works
 * (Phase B). cards.ts `cardOf` dispatches these card kinds here (s2a-fix, the lead's ruling of 26 Nov 09:50:
 * cards.ts is the closed dispatcher; this file and cardsMoney.ts each have one owner).
 *
 * rules-works wave 1: the works card's data (`CardData.works`, worksCardOf). The Yard sale, an oversize piece and
 * the picking table are wave 2's (a card with its title only until then). Every number a body shows is computed
 * from the state at each read (B11) and is exactly what its action applies.
 */
import { bankRow, loanFoot } from './bank';
import { plateBuyCheck, plateLevelCheck } from './actionsWorks';
import { refusalTxt } from './ladder';
import { contentAt } from './layer';
import type { CardButton, CardContext, CardData, CardRef, SalvageConfig, SalvageGame, TextKey, WorksCard } from './types';

/** The card kinds this file answers (cards.ts dispatches them). */
export const WORKS_CARD_KINDS = ['works', 'yardSale', 'lot', 'crate'] as const;

const rungOfGate = (gate: string | undefined): number | null => {
  const m = /^rung(\d+)$/.exec(gate ?? '');
  return m ? Number(m[1]) : null;
};

/**
 * THE WORKS CARD's data (4.3; rules-works wave 1): every number from the state at this read and exactly what its
 * action applies (Buy: plateBuyCheck, the same object buyWorks applies; Level: plateLevelCheck; the bank's foot
 * and row: rules-money's bank.ts loanFoot / bankRow). A locked plate shows its gate and nothing else (no price, no
 * terms). `gain` is what a kilogram of the plate's first input gains at p̄ after reagents, as a share of its
 * value (never tonnes an hour). Wave 2 / Phase C add the depollution bay's car, the permit's words, the rows.
 */
export function worksCardOf(cfg: SalvageConfig, g: SalvageGame, plate: string): WorksCard | null {
  const c = contentAt(cfg.salvage, g.salvage);
  const d = c.works?.plates[plate];
  if (!d) return null;
  const w = g.salvage.works[plate];
  const it = c.shop.find((i) => i.key === plate);
  const buyCh = plateBuyCheck(cfg, g, plate);
  const locked = !w && buyCh.state === 'locked';
  const state: WorksCard['state'] = w ? w.phase : locked ? 'locked' : 'buyable';
  const gate = { rung: rungOfGate(it?.gate ?? undefined), tonnes_g: null, needsItem: d.needs ?? null };
  const empty = { buy: null, loan: null, loanShort: null, saveUp_s: null };
  if (locked) return { plate, kind: d.kind, state, gate, in: [], out: [], gain: null, chip: null, arrivesAt: null, commission_s: 0, selfStartAt: null, level: null, foot: empty, bank: null };
  const pbar = (k: string) => c.grades[k]?.pbar ?? (c.objects[k]?.whole ? (c.grades[c.objects[k].whole!]?.pbar ?? 0) : 0);
  let ins: string[] = [...d.in];
  let outs: string[] = [];
  let gain: WorksCard['gain'] = null;
  const reag = (list: readonly (readonly [string, number, number])[]) => list.reduce((a, r) => a + r[1] * r[2], 0);
  if (d.kind === 'batch') {
    const rec = d.recipes?.[w?.heat?.recipe ?? Object.keys(d.recipes ?? {})[0] ?? ''];
    if (rec) {
      ins = [...rec.in];
      outs = rec.out.map(([o]) => o).filter((o) => !!c.grades[o]);
      const v = rec.out.reduce((a, [o, sh]) => a + sh * (c.grades[o]?.pbar ?? 0), 0) - reag(rec.reagents);
      if (ins[0] && pbar(ins[0]) > 0) gain = { from: ins[0], pct: v / pbar(ins[0]) - 1 };
    }
  } else {
    const seen = new Set<string>();
    for (const k of d.in) for (const [o] of d.out[k] ?? []) if (c.grades[o] && !seen.has(o)) seen.add(o), outs.push(o);
    const k0 = d.in[0];
    if (k0 && k0 !== 'stream' && pbar(k0) > 0) {
      const v = (d.out[k0] ?? []).reduce((a, [o, sh]) => a + sh * (c.grades[o]?.pbar ?? 0), 0) - reag(d.reagents);
      gain = { from: k0, pct: v / pbar(k0) - 1 };
    }
  }
  let chip: WorksCard['chip'] = null;
  if (w?.phase === 'running') {
    if (w.status === 'trayFull') chip = { kind: 'trayFull' };
    else if (w.heat?.phase === 'ready') chip = { kind: 'readyToPour' };
    else if (w.status === 'idle' || w.status === 'waiting') chip = { kind: 'waiting', ...(ins[0] ? { grade: ins[0] } : {}) };
  }
  let level: WorksCard['level'] = null;
  if (w?.phase === 'running' && d.maxLevel > 1) {
    const ch = plateLevelCheck(cfg, g, plate);
    const button: CardButton | null =
      ch.price !== null && (ch.state === 'buy' || ch.state === 'cantAfford')
        ? { label: { key: 'card.level' as TextKey, args: { x: { money: ch.price } } }, action: { act: 'level', target: { kind: 'plate', plate }, price: ch.price }, refusal: ch.state === 'cantAfford' ? refusalTxt(ch) : null }
        : null;
    level = { level: w.level, max: Math.min(d.maxLevel, c.works?.maxLevel ?? d.maxLevel), pct: d.lev, button, state: ch.state };
  }
  const buy: CardButton | null =
    !w && buyCh.price !== null ? { label: { key: 'card.buy' as TextKey, args: { x: { money: buyCh.price } } }, action: { act: 'buy', item: plate, price: buyCh.price }, refusal: buyCh.state === 'cantAfford' ? refusalTxt(buyCh) : null } : null;
  const lf = !w ? loanFoot(cfg, g, plate) : { loan: null, loanShort: null, saveUp_s: null };
  return {
    plate,
    kind: d.kind,
    state,
    gate,
    in: ins,
    out: outs,
    gain,
    chip,
    arrivesAt: w?.phase === 'arriving' ? w.commissionAt : null,
    commission_s: c.works?.commission_s ?? 0,
    selfStartAt: w?.phase === 'installed' ? w.commissionAt : null,
    level,
    ...(d.recipes
      ? { recipes: Object.entries(d.recipes).map(([r, rec]) => ({ recipe: r, in: [...rec.in], out: rec.out.map(([o]) => o).filter((o) => !!c.grades[o]), selected: (w?.heat?.recipe ?? '') === r, button: w?.phase === 'running' && w.heat?.recipe !== r ? { label: { key: 'card.recipe' as TextKey, args: { recipe: { text: `recipe.${r}` as TextKey } } }, action: { act: 'setRecipe', recipe: r, confirmHeel: false, plate }, refusal: null } : null })) }
      : {}),
    ...(d.feedBy === 'bays' && d.kind === 'rate' ? { takesFrom: d.in.filter((k) => !!c.grades[k]).map((k) => ({ grade: k, route: g.salvage.routes[k] ?? (plate as string) })) } : {}),
    permit: d.permit ? (d.permit.endsWith('Lead') ? 'lead' : 'elv') : null,
    foot: { buy, ...lf },
    bank: bankRow(g, plate),
  };
}

/** A card of the works (cards.ts cardOf for WORKS_CARD_KINDS). The works card carries `works` (worksCardOf); the Yard sale, an oversize piece and the picking table are wave 2's (the title only). */
export function cardOfWorks(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, now: number, ctx: CardContext): CardData {
  void now;
  void ctx;
  const title: TextKey = ref.kind === 'works' ? (`title.works.${ref.plate}` as TextKey) : (`title.${ref.kind}` as TextKey);
  const card: CardData = { kind: ref.kind as CardData['kind'], shape: 'panel', title: { key: title }, lead: [], rows: [], foot: [] };
  if (ref.kind === 'works') {
    const wc = worksCardOf(cfg, g, ref.plate);
    if (wc) {
      card.works = wc;
      if (wc.bank) card.showsDebt = true;
      const btns = [wc.foot.buy, wc.foot.loan].filter((b): b is CardButton => !!b);
      card.foot = btns;
    }
  }
  return card;
}
