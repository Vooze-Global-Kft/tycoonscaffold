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
import { hallBusy } from './halls';
import { contentAt } from './layer';
import { begin, dayAt } from './clock';
import { lotValue } from './lots';
import { carLabelPrice, recoveryOf } from './works';
import { preparedLines, rackCap } from './reuse';
import { roundMoney } from './money';
import type { CardButton, CardContext, CardData, CardRef, CrateCard, LotCard, SalvageConfig, SalvageGame, TextKey, WorksCard, YardSaleCard } from './types';

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
  // s2e-line (RULING2.md 27.3 D1: ONE purchase, one card, two plots): until the line is ordered, the plot of a plate that
  // comes `with` another (the depollution bay) opens the line's card (its price, gate, Buy and finance are the line's).
  if (!w) for (const [lead, ld] of Object.entries(c.works?.plates ?? {})) if (ld.with?.includes(plate)) return worksCardOf(cfg, g, lead);
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
      ? { recipes: Object.entries(d.recipes).map(([r, rec]) => ({ recipe: r, in: [...rec.in], out: rec.out.map(([o]) => o).filter((o) => !!c.grades[o]), selected: (w?.heat?.recipe ?? '') === r, button: recipeButton(w, plate, r) })) }
      : {}),
    ...(d.recipes && Object.keys(d.recipes).length > 1 && w?.phase === 'running' && w.heat ? { recipeBy: recipeByOf(w, plate) } : {}),
    ...(d.feedBy === 'bays' && d.kind === 'rate' ? { takesFrom: d.in.filter((k) => !!c.grades[k]).map((k) => ({ grade: k, route: g.salvage.routes[k] ?? (plate as string) })) } : {}),
    permit: d.permit ? (d.permit.endsWith('Lead') ? 'lead' : 'elv') : null,
    foot: { buy, ...lf },
    bank: bankRow(g, plate),
  };
}

/**
 * A recipe row's button (2.8; s2g-halls, RULING2.md 29.1): a running hall's tap PINS that recipe (actionsWorks.ts
 * setPlateRecipe: another recipe is refused `heatRunning` while a heat runs; the recipe it is on is pinned as it stands).
 * The pinned recipe's own row has no button (its hand-back is recipeBy's).
 */
function recipeButton(w: SalvageGame['salvage']['works'][string] | undefined, plate: string, r: string): CardButton | null {
  const h = w?.heat;
  if (w?.phase !== 'running' || !h) return null;
  if (h.recipe === r && h.pinned) return null;
  const refusal = h.recipe !== r && hallBusy(h.phase) ? { key: 'refusal.heatRunning' as TextKey } : null;
  return { label: { key: 'card.recipe' as TextKey, args: { recipe: { text: `recipe.${r}` as TextKey } } }, action: { act: 'setRecipe', recipe: r, confirmHeel: false, plate }, refusal };
}

/** s2g-halls: the hall's recipe and who chose it ("The hall chooses: {recipe}" / "Kept on {recipe} by you"), and "Let the hall choose" while a tap holds it (actionsWorks.ts letHallChoose). */
function recipeByOf(w: SalvageGame['salvage']['works'][string], plate: string): NonNullable<WorksCard['recipeBy']> {
  const h = w.heat!;
  const recipe = { text: `recipe.${h.recipe}` as TextKey };
  if (!h.pinned) return { pinned: false, line: { key: 'card.works.recipeHall' as TextKey, args: { recipe } }, button: null };
  return {
    pinned: true,
    line: { key: 'card.works.recipeKept' as TextKey, args: { recipe } },
    button: { label: { key: 'card.works.letChoose' as TextKey }, action: { act: 'setRecipe', recipe: h.recipe, confirmHeel: false, plate, choose: true }, refusal: null },
  };
}

/** A card of the works (cards.ts cardOf for WORKS_CARD_KINDS). The works card carries `works` (worksCardOf); the Yard sale, an oversize piece and the picking table are wave 2's (the title only). */
export function cardOfWorks(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, now: number, ctx: CardContext): CardData {
  void now;
  void ctx;
  const title: TextKey = ref.kind === 'works' ? (`title.works.${ref.plate}` as TextKey) : (`title.${ref.kind}` as TextKey);
  const card: CardData = { kind: ref.kind as CardData['kind'], shape: 'panel', title: { key: title }, lead: [], rows: [], foot: [] };
  if (ref.kind === 'yardSale') {
    const yc = yardSaleCardOf(cfg, g);
    if (yc) card.yardSale = yc;
  } else if (ref.kind === 'lot') {
    const lc = lotCardOf(cfg, g, ref.k);
    if (lc) card.lot = lc;
  } else if (ref.kind === 'crate') {
    const cc = crateCardOf(cfg, g);
    if (cc) card.crate = cc;
  }
  if (ref.kind === 'works') {
    const wc = worksCardOf(cfg, g, ref.plate);
    if (wc) {
      card.works = wc;
      if (wc.bank) card.showsDebt = true;
      const btns = [wc.foot.buy, wc.foot.loan].filter((b): b is CardButton => !!b);
      card.foot = btns;
      // s2f-plasma-cars (RULING2.md 28.7 b; shown equals applied): the truck-fed bay's card says what a car from the partner's
      // recovery truck costs today, the price its landing pays (works.ts carLabelPrice, the same function).
      if (recoveryOf(contentAt(cfg.salvage, g.salvage), ref.plate)) {
        const x = begin(cfg, g, [], false);
        const p = carLabelPrice(x, ref.plate, x.s.t);
        if (p !== null) card.rows.push({ id: 'carPrice', name: { key: 'card.works.carPrice' as TextKey, args: { x: { money: p } } }, line: null, button: null, icon: null, state: 'info' });
      }
    }
  }
  return card;
}

// ---------------------------------------------------------------------------------------- wave 2: the Yard sale, an oversize piece, the picking table (4.6, 4.7)

/**
 * The Yard sale's card (4.6): its places, each racked thing oldest first with "§q at the gate" (q = what its visitor
 * pays at today's posted price: reuse.ts visitorBuys's rule) and its scrap value v, the next visitor (only while the
 * rack holds a thing), today's sales, the trade corner. `level`: null (no price key for the rack's room yet: 2.12
 * names levels, not their prices; levelWorks refuses `nothing`).
 */
export function yardSaleCardOf(cfg: SalvageConfig, g: SalvageGame): YardSaleCard | null {
  const x = begin(cfg, g, [], false);
  const R = x.c.reuse;
  if (!R) return null;
  const s = x.s;
  const day = dayAt(x, s.t);
  const racked = s.things.filter((t) => t.at.at === 'rack').sort((a, b) => (a.at as { since: number }).since - (b.at as { since: number }).since || (a.uid < b.uid ? -1 : 1));
  const things = racked.map((t) => {
    const { v } = preparedLines(x, t.obj, day);
    return { uid: t.uid, obj: t.obj, q: roundMoney(R.factor * v), v };
  });
  const slots = rackCap(x);
  const batches = s.things.filter((t) => t.at.at === 'corner').length;
  return {
    slots,
    free: Math.max(0, slots - racked.length),
    things,
    nextVisitorInS: racked.length && s.reuse.nextAt !== null ? Math.max(0, s.reuse.nextAt - s.t) : null,
    soldToday: s.reuse.sold.day === day ? { n: s.reuse.sold.n, money: s.reuse.sold.money } : { n: 0, money: 0 },
    level: null,
    corner: { dealer: 'reclaimer', batches, vanInS: s.reuse.vanAt !== null ? Math.max(0, s.reuse.vanAt - s.t) : null },
  };
}

/** An oversize piece's card (4.7): sender, thing, its fixed mass, "about §x once cut" at p̄ (lots.ts lotValue, the value its pieces are worth), its cut seconds. */
export function lotCardOf(cfg: SalvageConfig, g: SalvageGame, k: number): LotCard | null {
  const c = contentAt(cfg.salvage, g.salvage);
  const th = g.salvage.things.find((t) => t.at.at === 'lot' && t.at.k === k);
  if (!th || !c.lots) return null;
  return { uid: th.uid, obj: th.obj, sender: th.sender ?? null, g: th.g ?? c.objects[th.obj]?.gross_g ?? 0, valueOnceCut: roundMoney(lotValue({ c }, th)), cut_s: c.lots.kinds.find((q) => q.obj === th.obj)?.cut_s ?? c.lots.cut_s[0] };
}

/** The picking table's card (4.7): how many things, its room, seconds a thing, the things oldest first. No time: nothing expires. */
export function crateCardOf(cfg: SalvageConfig, g: SalvageGame): CrateCard | null {
  const c = contentAt(cfg.salvage, g.salvage);
  if (!c.crate) return null;
  const on = g.salvage.things.filter((t) => t.at.at === 'crate').sort((a, b) => (a.at as { since: number }).since - (b.at as { since: number }).since || (a.uid < b.uid ? -1 : 1));
  return { n: on.length, max: c.crate.max, sort_s: c.crate.sort_s, things: on.map((t) => ({ uid: t.uid, obj: t.obj })) };
}
