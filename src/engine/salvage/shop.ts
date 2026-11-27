/**
 * THE SHOP'S RULES (stage 2, docs/design/yard-stage2.md 2.15; RULING2.md 15 to 15.13): the quote of a
 * scrip pack, the pending list (`iap.pending`, oldest = the list's order), headroom, the grant to the
 * right quote (shown equals applied), the ledger, the 24-hour refusal and the 72-hour withdrawal on the
 * store's clock, who sees packs (the second session, the rung, the store country, the age band, the
 * Settings switch), the age band, the code's hash. Granted scrip goes through `clock.ts credit(x, S, t,
 * 'grant')`, never a lot payment, never the bank. Owner: rules-money (wave 2, 26 Nov).
 *
 * Every function is PURE: a function of the content, the state and its arguments; the hooks the shared
 * store calls return the SAME object when nothing changes. NO CLOCK DECIDES A GRANT (15.1): the device's
 * time (`now`, a quote's `atMs`) is read only for the 24-hour courtesy refusal; the 72 hours are measured on
 * the STORE's request times (`askedMs` against a fresh listing's `requestMs`, 15.12 a); `iap.createdMs` and
 * a purchase's `purchasedMs` are information only.
 *
 * THE RULE AS BUILT (where yard-stage2.md 2.15 leaves a choice; notes/s2b-rules-money.md "Wave 2"):
 * - A pack is a product of the game's shared list (`monetization.iap.products`) of kind `hoursOfIncome`, its
 *   value H hours; S = roundMoney(H × I), I the rated income on the state's content (ratedI, as bank.ts ratedIG).
 * - Packs show (2.15.3) only when: the second session has begun (`iap.sessions2At`), the age band is 'a18',
 *   the rung is at least `iap.packsFromRung`, the store country is known and not in `iap.packsOff`, and the
 *   packs are not hidden in Settings, and no Bank loan is open (RULING2 28.2 c). The age question is due when all
 *   but the band hold and no band is kept (the loan does not count there).
 * - The quote refuses, in order: `packOff` (not a pack, or packs not shown, a Bank loan open among them), `packPending`
 *   (`iap.maxStanding` quotes of the product stand, or a WAITING one with 0 ≤ now − atMs < 24 h), `packHeadroom` (S ≤ 0, or cash
 *   + Σ S of every standing quote + S > U), `quoteUpdated` (the S shown is not the S now; event quoteUpdated
 *   {a, b}). Else `{id: q<n>, product, S, I, atMs: now, askedMs, known, state: 'open', wait: null}` is
 *   appended to the END of `iap.pending`; no older quote is ever withdrawn by a Buy (15.12 b).
 * - U (headroom, E10) = Σ of the price of everything a card sells next whose gate is met and that the
 *   ceiling allows: every shop item and plate for sale, the next hire of each role, the next level of every
 *   crew member, machine, open partner, running plate and the Yard sale's room. Cash does not decide it.
 */
import { plateBuyCheck, plateLevelCheck } from './actionsWorks';
import { begin, credit, finish } from './clock';
import { buyCheck, hireCheck, hiredState, levelCheck, levelCheckAt, levelled, levelQuote, ratedGain, shopItems, worksTauH } from './ladder';
import { contentAt, worksOpened } from './layer';
import { roundMoney } from './money';
import { ratedTerms } from './rate';
import { quoteId } from './state2';
import type { SalvageContent } from '../../config/schema.salvage';
import type { AgeBand, CardContext, CrewRole, LevelTarget, LookSlot, PendingQuote, ProductArrival, ProductListing, QuoteOutcome, RefusalKey, SalvageConfig, SalvageEvent, SalvageGame, TxtArgs } from './types';

export const HOUR_MS = 3_600_000;
/** A WAITING quote refuses a new Buy of its product for this long on the device's clock (15.6, 15.12 c). */
export const WAIT_MS = 24 * HOUR_MS;
/** A standing quote goes when a fresh listing's STORE time is this long after its `askedMs` (15.11 b, 15.12 a). */
export const EXPIRE_MS = 72 * HOUR_MS;
/** The age question's first year (4.8: "a year between 1900 and this year"). */
export const MIN_YEAR = 1900;
/** At most this many expired quotes are kept for the shop card's one line (bounded state). */
const MAX_EXPIRED = 8;
/** The outcomes that withdraw a quote (the shared store's WITHDRAWING), and the `why` each gives (15.13 b). */
const WITHDRAW_WHY: Partial<Record<QuoteOutcome, 'cancelled' | 'refused'>> = { cancelled: 'cancelled', declined: 'refused', unavailable: 'refused', unsaved: 'refused' };

type Product = { id: string; kind: string; value: number };

/** The content's `iap` block, or null (a content without it sells nothing of the mode's). */
export function iapDef(c: SalvageContent): NonNullable<SalvageContent['iap']> | null {
  return c.iap ?? null;
}

/** The game's shared product list (`monetization.iap.products`; none on a bare test config). */
export function productsOf(cfg: SalvageConfig): readonly Product[] {
  return ((cfg as { monetization?: { iap?: { products?: readonly Product[] } } }).monetization?.iap?.products ?? []) as readonly Product[];
}

/** The scrip packs of the list, in its order: product id and H, its hours of I (kind `hoursOfIncome`, value H). */
export function packProducts(cfg: SalvageConfig): { product: string; H: number }[] {
  return productsOf(cfg)
    .filter((p) => p.kind === 'hoursOfIncome' && p.value > 0)
    .map((p) => ({ product: p.id, H: p.value }));
}

/** H of a pack product, or null when the id is not a pack. */
export function packHours(cfg: SalvageConfig, product: string): number | null {
  return packProducts(cfg).find((p) => p.product === product)?.H ?? null;
}

/** The No ad videos product (kind `skipAds`), or null. */
export function noAdsProduct(cfg: SalvageConfig): string | null {
  return productsOf(cfg).find((p) => p.kind === 'skipAds')?.id ?? null;
}

/** The looks for sale: products of kind `cosmetic` the content maps to a slot (`iap.lookOf`), in the content's order. */
export function lookProducts(cfg: SalvageConfig): { product: string; slot: LookSlot }[] {
  const lookOf = iapDef(cfg.salvage)?.lookOf ?? {};
  const sold = new Set(productsOf(cfg).filter((p) => p.kind === 'cosmetic').map((p) => p.id));
  return Object.entries(lookOf)
    .filter(([id]) => sold.has(id))
    .map(([product, v]) => ({ product, slot: v.slot as LookSlot }));
}

// ============================================================================ who sees what (2.15.2, 2.15.3)

/** "The second session" has begun (2.15.2: one stored moment, `iap.sessions2At`). Nothing of money or ads before it. */
export function secondSession(g: SalvageGame): boolean {
  return g.salvage.iap.sessions2At !== null;
}

/** The shop can be reached (a Rota row, a Settings row): from the second session, never for the age band 'u13' (P8). */
export function shopReachable(g: SalvageGame): boolean {
  return secondSession(g) && g.salvage.iap.ageBand !== 'u13';
}

/** The store country's switch (2.15.3): on only for a KNOWN country not in `iap.packsOff`; unknown (null) means off. */
export function countryOn(c: SalvageContent, country: string | null | undefined): boolean {
  const d = iapDef(c);
  if (!d || !country) return false;
  return !d.packsOff.includes(country.toUpperCase());
}

/** Every condition of a pack row but the age band (the rung, the country, not hidden, the shop reachable). */
function packsBarBand(cfg: SalvageConfig, g: SalvageGame, ctx: CardContext | undefined): boolean {
  const d = iapDef(cfg.salvage);
  return !!d && shopReachable(g) && g.salvage.ladder.rung >= d.packsFromRung && countryOn(cfg.salvage, ctx?.country) && !g.salvage.iap.hidden && packProducts(cfg).length > 0;
}

/**
 * Pack rows show (2.15.3): rung ≥ packsFromRung, the country's switch on, the age band 18 or over, packs not hidden,
 * and NO BANK LOAN OPEN (RULING2 28.2 c, amending 27.3 D7; s2e-join): while an agreement is open the pack section is
 * absent, no header, no row, no word, exactly as where the country's switch is off (a Buy pressed all the same is
 * refused `packOff`). A quote already waiting when the loan is signed is still granted (grantProduct reads no switch).
 */
export function packsShown(cfg: SalvageConfig, g: SalvageGame, ctx?: CardContext): boolean {
  return packsBarBand(cfg, g, ctx) && g.salvage.iap.ageBand === 'a18' && !g.salvage.bank.agreement;
}

/** The age question is due (4.8): the first time a pack row would show and no band is kept. */
export function ageDue(cfg: SalvageConfig, g: SalvageGame, ctx?: CardContext): boolean {
  return packsBarBand(cfg, g, ctx) && g.salvage.iap.ageBand === null;
}

/**
 * The Settings switch "Scrip packs: shown / hidden" (2.15.3, L14, P17): from the second session wherever the
 * country's switch is on, whatever the rung; absent for the bands 'u13' and 't13' (it could do nothing there).
 */
export function packsSwitchShown(cfg: SalvageConfig, g: SalvageGame, ctx?: CardContext): boolean {
  const band = g.salvage.iap.ageBand;
  return !!iapDef(cfg.salvage) && secondSession(g) && countryOn(cfg.salvage, ctx?.country) && band !== 'u13' && band !== 't13';
}

/**
 * Help's pages on packs and on the code (P13; s2c-fix-money M6, ruling 13.2 "nothing of money before the second
 * session, the help included"): only where the pack rows and their switch could be: the second session begun, the
 * country's switch on, and an age band that allows packs (not 'u13' nor 't13'; no band kept yet is the age
 * question's moment, which comes before any pack row).
 */
export function packsHelpShown(cfg: SalvageConfig, g: SalvageGame, ctx?: CardContext): boolean {
  return packsSwitchShown(cfg, g, ctx);
}

// ============================================================================ the quote (2.15.4)

/** I, the rated income (§ an hour, net) on the state's content (rate.ts ratedTerms; the same figure as bank.ts ratedIG). */
export function ratedI(cfg: SalvageConfig, g: SalvageGame): number {
  return Math.max(0, ratedTerms(contentAt(cfg.salvage, g.salvage), g.salvage).I);
}

/** S of a pack of H hours now: roundMoney(H × I), I read now on the state's content (it moves only with assets). */
export function packS(cfg: SalvageConfig, g: SalvageGame, H: number, I = ratedI(cfg, g)): number {
  return roundMoney(Math.max(0, H * I));
}

/** Σ S of every standing quote, open and waiting alike, of every product (15.6, 15.12 b). */
export function standingS(g: SalvageGame): number {
  return roundMoney(g.salvage.iap.pending.reduce((a, q) => a + q.S, 0));
}

const LEVEL_MACHINES = ['hand_stripper', 'stripper', 'bench', 'crucible'] as const;
const ROLES: readonly CrewRole[] = ['hand', 'cutter', 'driver'];

/**
 * U, the headroom's bound (E10): the sum over every card of the price of what it sells next whose gate is met
 * and that the ceiling allows (plates, shop items, the next hire of each role, the next level of everything
 * levelled). What the cash can pay does not decide it (a price greyed for cash counts).
 */
export function headroomU(cfg0: SalvageConfig, g: SalvageGame): number {
  const c = contentAt(cfg0.salvage, g.salvage);
  const cfg = c === cfg0.salvage ? cfg0 : { ...cfg0, salvage: c };
  // s2e-levels (yard-stage2-economy.md 2.15; RULING2 27.3 D11): from the works' opening, the headroom by payback (headroomWorks).
  if (worksOpened(g.salvage)) return headroomWorks(cfg, g);
  const s = g.salvage;
  const counted = (st: string, price: number | null) => (price !== null && st !== 'locked' && st !== 'top' && st !== 'owned' && st !== 'arriving' && st !== 'info' ? price : 0);
  let u = 0;
  for (const it of shopItems(c)) {
    if (it.kind === 'crew') continue;
    const ch = it.kind === 'works' ? plateBuyCheck(cfg, g, it.key) : buyCheck(cfg, g, it.key);
    u += counted(ch.state, ch.price);
  }
  for (const role of ROLES) {
    const ch = hireCheck(cfg, g, role);
    u += counted(ch.state, ch.price);
  }
  const targets: LevelTarget[] = [];
  for (const m of s.crew) targets.push({ kind: 'crew', id: m.id });
  for (const id of LEVEL_MACHINES) if (s.machines[id]?.owned) targets.push({ kind: 'machine', machine: id });
  for (const [pid, p] of Object.entries(s.partners)) if (p.open) targets.push({ kind: 'partner', partner: pid });
  for (const t of targets) {
    const ch = levelCheck(cfg, g, t);
    u += counted(ch.state, ch.price);
  }
  for (const [pid, w] of Object.entries(s.works)) {
    if (w.phase !== 'running') continue;
    const ch = plateLevelCheck(cfg, g, pid);
    u += counted(ch.state, ch.price);
  }
  return roundMoney(u);
}

/**
 * The headroom's window, in tau_r (RULING2 27.3 D11: "the headroom counts what pays back within 1.5 tau_r"; the band's own
 * error, a rule of the ruling like the advice's 1.25, not a tuned number). Content `iap.headroomTau` where given (a request to
 * the content owner), else this.
 */
export const HEADROOM_TAU = 1.5;

/**
 * The state with a shop item owned, as rated income reads assets (advice.ts boughtState's rule, copied: that function is not
 * exported and advice.ts is not this package's; requests.md): the item in `owned`, a tool's tier, a better carrier, a
 * first-yard machine on its pad, the truck; a works plate running at level 1 and, a hall, poured once.
 */
function boughtFor(c: SalvageContent, g: SalvageGame, item: string): SalvageGame {
  const s = g.salvage;
  if (c.works?.plates[item]) {
    const w = { phase: 'running', level: 1 } as unknown as (typeof s.works)[string];
    return { ...g, salvage: { ...s, works: { ...s.works, [item]: w }, counts: { ...(s.counts ?? {}), [`poured:${item}`]: Math.max(1, s.counts?.[`poured:${item}`] ?? 0) } } };
  }
  const n = { ...s, owned: s.owned.includes(item) ? s.owned : [...s.owned, item] };
  const tool = c.tools[item];
  if (tool) n.tier = Math.max(s.tier, tool.tier);
  if (c.carriers[item] !== undefined && (c.carriers[item] ?? 0) > (c.carriers[s.carrier] ?? 0)) n.carrier = item;
  if (item === 'stripper' || item === 'bench' || item === 'crucible') n.machines = { ...s.machines, [item]: { ...s.machines[item], owned: true, level: Math.max(1, s.machines[item].level) } };
  if (item === 'truck') n.truck = { ...s.truck, owned: true };
  return { ...g, salvage: n };
}

/** A check's price counts toward U (a state that sells: Buy, or greyed for the cash or the earmark; never locked, top, owned, arriving or info). */
const sells = (st: string, price: number | null): price is number => price !== null && (st === 'buy' || st === 'cantAfford');

/**
 * U FROM THE WORKS' OPENING (s2e-levels; yard-stage2-economy.md 2.15 "The headroom rule, changed"; RULING2 27.3 D11, 27.2 a):
 * the sum of the price of every step buyable NOW whose payback on its calculated gain is within HEADROOM_TAU × tau_r:
 * - every check is the one the card applies (buyCheck, plateBuyCheck, hireCheck, levelCheck), whose ceiling comes BEFORE the
 *   money from the works' opening, so U never depends on the cash: a step greyed for the cash counts, a step the ceiling
 *   refuses (or gated, dark, owned, arriving, at its top) counts nothing;
 * - a step's gain: a shop item's or a plate's rated gain bought (ladder.ts ratedGain on the bought state: the replay), a
 *   hire's on the hired state, a level's `levelGain` (levelQuote: the one measure its price is made of);
 * - a step counts only while price ≤ window × gain (no item counts above what it earns; a zero gain counts nothing);
 * - EACH LADDER IS COUNTED UP while each step pays: the next hire of a role on the state with the last one hired, the next
 *   level of a target on the state one level up, until a step fails (a level not sold, under levels.minShareI × I, ends its
 *   ladder: it counts nothing). The 1 % test of every step reads I at the state U is asked on (one envelope a call).
 * A rung without tau: the window is open (every priced step with a gain counts).
 */
export function headroomWorks(cfg: SalvageConfig, g: SalvageGame): number {
  const c = cfg.salvage;
  const s = g.salvage;
  const tau = worksTauH(c, s.ladder.rung);
  const k = (iapDef(c) as { headroomTau?: number } | null)?.headroomTau ?? HEADROOM_TAU;
  const win = tau === null ? Infinity : k * tau;
  const pays = (price: number, gain: number) => gain > 1e-6 && price <= win * gain + 1e-9;
  const I = ratedI(cfg, g);
  let u = 0;
  for (const it of shopItems(c)) {
    if (it.kind === 'crew') continue;
    const ch = it.kind === 'works' ? plateBuyCheck(cfg, g, it.key) : buyCheck(cfg, g, it.key);
    if (!sells(ch.state, ch.price)) continue;
    if (pays(ch.price, ratedGain(cfg, g, boughtFor(c, g, it.key)))) u += ch.price;
  }
  for (const role of ROLES) {
    let h = g;
    for (let n = 0; n < 16; n++) {
      const ch = hireCheck(cfg, h, role);
      if (!sells(ch.state, ch.price)) break;
      const next = hiredState(h, role);
      if (!pays(ch.price, ratedGain(cfg, h, next))) break;
      u += ch.price;
      h = next;
    }
  }
  const targets: LevelTarget[] = [];
  for (const m of s.crew) targets.push({ kind: 'crew', id: m.id });
  for (const id of LEVEL_MACHINES) if (s.machines[id]?.owned) targets.push({ kind: 'machine', machine: id });
  for (const [pid, p] of Object.entries(s.partners)) if (p.open) targets.push({ kind: 'partner', partner: pid });
  for (const t of targets) {
    let h = g;
    for (let n = 0; n < 64; n++) {
      const ch = levelCheckAt(cfg, h, t, I);
      if (!sells(ch.state, ch.price)) break;
      const q = levelQuote(cfg, h, t, I);
      if (!q || !pays(ch.price, q.gain)) break;
      u += ch.price;
      h = levelled(h, t);
    }
  }
  for (const [pid, w] of Object.entries(s.works)) {
    if (w.phase !== 'running') continue;
    const ch = plateLevelCheck(cfg, g, pid);
    if (!sells(ch.state, ch.price)) continue;
    const up = { ...g, salvage: { ...s, works: { ...s.works, [pid]: { ...w, level: (w.level || 1) + 1 } } } };
    if (pays(ch.price, ratedGain(cfg, g, up))) u += ch.price;
  }
  return roundMoney(u);
}

/** The quotes of a product that stand, in the order they were made. */
export function standingOf(g: SalvageGame, product: string): PendingQuote[] {
  return g.salvage.iap.pending.filter((q) => q.product === product);
}

/** A WAITING quote of the product that still refuses a new Buy (0 ≤ now − atMs < 24 h; an earlier clock counts as elapsed, 15.12 c), or null. */
export function blockingWait(g: SalvageGame, product: string, now: number): PendingQuote | null {
  return standingOf(g, product).find((q) => q.state === 'waiting' && now >= q.atMs && now - q.atMs < WAIT_MS) ?? null;
}

/** The first refusal of a Buy of `product` now (the order of the header), with S now; refusal null when a quote would be made. */
export function quoteCheck(cfg: SalvageConfig, g: SalvageGame, product: string, shownS: number | null, now: number, ctx?: CardContext, I?: number, U?: number): { S: number; refusal: { key: RefusalKey; args: TxtArgs } | null } {
  const H = packHours(cfg, product);
  if (H === null || !packsShown(cfg, g, ctx)) return { S: 0, refusal: { key: 'packOff', args: {} } };
  const S = packS(cfg, g, H, I);
  const d = iapDef(cfg.salvage)!;
  if (standingOf(g, product).length >= d.maxStanding || blockingWait(g, product, now)) return { S, refusal: { key: 'packPending', args: {} } };
  if (S <= 0 || g.cash + standingS(g) + S > (U ?? headroomU(cfg, g)) + 1e-9) return { S, refusal: { key: 'packHeadroom', args: {} } };
  if (shownS !== null && Math.abs(shownS - S) >= 0.005) return { S, refusal: { key: 'quoteUpdated', args: { a: { money: shownS }, b: { money: S } } } };
  return { S, refusal: null };
}

/**
 * The mode's quote at Buy (the shared store's QuoteFn, with the product and the S shown): the SAME object
 * when refused (the refusal pushed to `events`); else the quote appended to the end of `iap.pending` with the
 * store's `known` ids and `askedMs` (15.3, 15.12 a, d). The id is the contract's counter `q<n>` (15.13 a).
 */
export function quoteState(cfg: SalvageConfig, g: SalvageGame, product: string, shownS: number, now: number, known: readonly string[], askedMs: number, events?: SalvageEvent[], ctx?: CardContext): SalvageGame {
  const I = ratedI(cfg, g);
  const ch = quoteCheck(cfg, g, product, shownS, now, ctx, I);
  if (ch.refusal) {
    if (ch.refusal.key === 'quoteUpdated') events?.push({ type: 'quoteUpdated', product, a: shownS, b: ch.S });
    events?.push({ type: 'refused', key: ch.refusal.key, args: ch.refusal.args, retry: ch.refusal.key === 'quoteUpdated' ? { act: 'buyPack', product, S: ch.S } : null });
    return g;
  }
  const s = g.salvage;
  const { id, n } = quoteId(s.counts);
  const q: PendingQuote = { id, product, S: ch.S, I: roundMoney(I), atMs: now, askedMs: Number.isFinite(askedMs) ? askedMs : null, known: [...known], state: 'open', wait: null };
  return { ...g, salvage: { ...s, counts: { ...(s.counts ?? {}), 'quote#': n }, iap: { ...s.iap, pending: [...s.iap.pending, q] } } };
}

/** The standing quote a shared-store name {product, atMs} names: the first made with that product and atMs, or -1. */
function quoteIndex(g: SalvageGame, product: string, atMs: number): number {
  return g.salvage.iap.pending.findIndex((q) => q.product === product && q.atMs === atMs);
}

/**
 * The sheet's outcome told to its quote (the shared store's SettleFn, 15.4): cancelled, declined, unavailable
 * and unsaved WITHDRAW that quote (event quoteWithdrawn: 'cancelled' for the player's cancel, 'refused' for the
 * others, 15.13 b); pending and unconfirmed make it WAITING (`wait` keeps which, for the row's words). The SAME
 * object when the named quote no longer stands. It never drops "the last" quote.
 */
export function settleState(cfg: SalvageConfig, g: SalvageGame, outcome: QuoteOutcome, q: { product: string; atMs: number }, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  const i = quoteIndex(g, q.product, q.atMs);
  if (i < 0) return g;
  const s = g.salvage;
  const why = WITHDRAW_WHY[outcome];
  if (why) {
    events?.push({ type: 'quoteWithdrawn', product: q.product, atMs: q.atMs, why });
    return { ...g, salvage: { ...s, iap: { ...s.iap, pending: s.iap.pending.filter((_, k) => k !== i) } } };
  }
  const wait: 'pending' | 'unconfirmed' = outcome === 'unconfirmed' ? 'unconfirmed' : 'pending';
  const cur = s.iap.pending[i];
  if (cur.state === 'waiting' && cur.wait === wait) return g;
  const pending = s.iap.pending.map((p, k) => (k === i ? { ...p, state: 'waiting' as const, wait } : p));
  return { ...g, salvage: { ...s, iap: { ...s.iap, pending } } };
}

// ============================================================================ the grant (2.15.5, 15.5)

/**
 * Which standing quote an arriving purchase belongs to (15.5), or -1: an id already in the ledger: none;
 * the sheet's own result (`own`): THAT quote (product and atMs), unless its `known` has the id; a later
 * arrival: the OLDEST standing quote of its product (the list's order, never atMs, 15.12 d) whose `known`
 * lacks the id; none: it belongs to another save.
 */
export function quoteFor(g: SalvageGame, a: ProductArrival): number {
  const iap = g.salvage.iap;
  if (!a.txId || iap.ledger.some((l) => l.txId === a.txId)) return -1;
  if (a.own) {
    const i = quoteIndex(g, a.productId, a.own.atMs);
    return i >= 0 && !iap.pending[i].known.includes(a.txId) ? i : -1;
  }
  return iap.pending.findIndex((q) => q.product === a.productId && !q.known.includes(a.txId));
}

/**
 * EngineMode.grantProduct: the quote that gets the id is taken and cash += its S EXACTLY (frozen at Buy,
 * however late the approval) through credit(…, 'grant'), never a lot payment, never the bank; the ledger
 * gains {txId, product, S, atMs, quote}; event `granted`. The SAME object when the arrival is not this
 * save's (no quote, a known id, an id already granted). No date is read (15.1).
 */
export function grantState(cfg: SalvageConfig, g: SalvageGame, a: ProductArrival, events?: SalvageEvent[]): SalvageGame {
  const i = quoteFor(g, a);
  if (i < 0) return g;
  const q = g.salvage.iap.pending[i];
  const x = begin(cfg, g, events, true);
  credit(x, q.S, x.s.t, 'grant');
  x.s.iap.pending = x.s.iap.pending.filter((_, k) => k !== i);
  x.s.iap.ledger = [...x.s.iap.ledger, { txId: a.txId, product: q.product, S: q.S, atMs: q.atMs, quote: q.id }];
  x.ev.push({ type: 'granted', product: q.product, S: q.S, txId: a.txId });
  return finish(g, x);
}

/**
 * EngineMode.afterListing (15.11 b, 15.12 a): only for a FRESH listing with the store's own request time,
 * every quote still standing whose `askedMs` is at least 72 hours before it is withdrawn (event quoteWithdrawn
 * 'expired'; the shop card's one line until it is closed). The device's `now` is never read; a quote with
 * `askedMs` null is never withdrawn by time. The SAME object when nothing goes.
 */
export function expireState(cfg: SalvageConfig, g: SalvageGame, listing: ProductListing, now: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void now;
  const at = listing.requestMs;
  if (!listing.fresh || at === null || at === undefined || !Number.isFinite(at)) return g;
  const iap = g.salvage.iap;
  const gone = iap.pending.filter((q) => q.askedMs !== null && at - q.askedMs >= EXPIRE_MS);
  if (!gone.length) return g;
  for (const q of gone) events?.push({ type: 'quoteWithdrawn', product: q.product, atMs: q.atMs, why: 'expired' });
  const expired = [...(iap.expired ?? []), ...gone.map((q) => ({ product: q.product, atMs: q.atMs }))].slice(-MAX_EXPIRED);
  return { ...g, salvage: { ...g.salvage, iap: { ...iap, pending: iap.pending.filter((q) => !gone.includes(q)), expired } } };
}

// ============================================================================ the age band and the code (2.15.3)

/** The calendar year of a device time (UTC), for the age question's range. */
export function yearOf(now: number): number {
  return new Date(now).getUTCFullYear();
}

/**
 * The band a year of birth gives (kept instead of the year), or null for a year outside [1900, this year].
 * Only the year is asked, so the age is Y − year or one less: the band follows the YOUNGER age (a child is
 * never taken for older): under 13 while Y − year ≤ 13, 13 to 17 while Y − year ≤ 18, else 18 or over.
 */
export function ageBandOf(year: number, now: number): AgeBand | null {
  const Y = yearOf(now);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > Y) return null;
  const younger = Y - year - 1;
  return younger < 13 ? 'u13' : younger < 18 ? 't13' : 'a18';
}

/** A four-digit code. */
export function validCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

/** The code as the save keeps it (FNV-1a over a fixed salt and the digits; never the digits themselves). */
export function codeHash(code: string): string {
  let h = 0x811c9dc5;
  for (const ch of `yard-code:${code}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `f1:${h.toString(16).padStart(8, '0')}`;
}

// ============================================================================ "the second session" (2.15.2)

/** The absence an away card reports (seconds; the whole absence before the cap). */
export function absenceOf(card: { absentS?: number; seconds: number }): number {
  return card.absentS ?? card.seconds;
}

/** `iap.sessions2At` after an away card from an absence of `absentS` seconds was closed at yard second t (set once, from an absence of at least `ads.awayMinAbsence_min`). */
export function sessions2After(c: SalvageContent, g: SalvageGame, absentS: number, t: number): number | null {
  const at = g.salvage.iap.sessions2At;
  if (at !== null) return at;
  const min = c.ads?.awayMinAbsence_min;
  if (min === undefined || !c.iap) return null;
  return absentS >= min * 60 ? t : null;
}

// ============================================================================ the hooks the shared store calls

/** The shared store's QuoteFn for one Buy (src/state/store.ts buyQuoted): the product, the S on the row and the store country the shop was opened with. */
export function quoteFn(product: string, shownS: number, ctx?: CardContext, events?: SalvageEvent[]): (cfg: SalvageConfig, g: SalvageGame, now: number, known: readonly string[], askedMs: number) => SalvageGame {
  return (cfg, g, now, known, askedMs) => quoteState(cfg, g, product, shownS, now, known, askedMs, events, ctx);
}

/** The shared store's SettleFn (src/state/store.ts buyQuoted). */
export function settle(cfg: SalvageConfig, g: SalvageGame, outcome: QuoteOutcome, q: { product: string; atMs: number }): SalvageGame {
  return settleState(cfg, g, outcome, q);
}

/** A quote without its product (Phase A's shape, kept for stubs.test.ts): nothing can be quoted (the same object). Use quoteFn. */
export function quote(cfg: SalvageConfig, g: SalvageGame, now: number, known: readonly string[], askedMs: number): SalvageGame {
  void cfg;
  void now;
  void known;
  void askedMs;
  return g;
}

/** EngineMode.grantProduct (salvageMode.ts). */
export function grantProduct(cfg: SalvageConfig, g: SalvageGame, arrival: ProductArrival): SalvageGame {
  return grantState(cfg, g, arrival);
}

/** EngineMode.afterListing (salvageMode.ts). */
export function afterListing(cfg: SalvageConfig, g: SalvageGame, listing: ProductListing, now: number): SalvageGame {
  return expireState(cfg, g, listing, now);
}

/** EngineMode.adAudience (P8): 'child' for the band 'u13', 'teen' for 't13', else null. */
export function adAudience(g: SalvageGame): 'child' | 'teen' | null {
  const b = g.salvage.iap?.ageBand ?? null;
  return b === 'u13' ? 'child' : b === 't13' ? 'teen' : null;
}
