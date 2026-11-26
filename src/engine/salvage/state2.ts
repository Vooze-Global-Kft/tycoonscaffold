/**
 * THE EMPTY STAGE-2 PART OF A STATE (contract version 3; yard-stage2.md 2.18 and 2.20; label contract2).
 * `freshStage2` is the one function that makes the stage's new fields fresh: create.ts spreads it into a
 * new yard and save.ts gives it to a layout-2 save (the owner's first yard) on load. `repairStage2` repairs
 * a layout-3 save's fields against what can be read (bounded, finite, nothing invented), and leaves the
 * first yard's fields alone.
 *
 * What is fresh, and why (2.20; the lead's notes for contract2):
 * - `works` {} and `routes` {}: nothing bought, every grade follows I's own allocation.
 * - `lots.nextAt` null: it is first set at `backFieldOpen` (never at creation or migration), so a save
 *   that reaches rung 3 later has no backlog of lots (E6).
 * - `reuse` null dates: no visitor before the first thing is ever racked, no van before a batch.
 * - `bank`: no agreement, the letter not seen.
 * - `iap.createdMs` = the creation's or the migration's device time (information only, RULING2 15.1);
 *   `iap.sessions2At` null: "the second session" begins when the next away card from an absence of at
 *   least 30 minutes is closed (2.15.2). [The lead's answer N3 in yard-stage2.md 11.3 said a migrated save at
 *   rung 2 or more gets it SET; the step's notes say null: null is built, the point is in requests.md.]
 * - `ads`: no count used on the creation's market day, no offer.
 * - `forklift` null: not owned.
 * Nothing here reads a tuned number, the clock beyond `now`, or randomness.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import type { AdsState, Agreement, BankState, CraneMove, ForkliftState, HeatState, IapState, LedgerEntry, LookSlot, LotsState, PendingQuote, ReuseState, SalvageState, WorksState } from './types';

/** The stage-2 fields of SalvageState (2.18). */
export type Stage2Fields = Pick<SalvageState, 'works' | 'routes' | 'lots' | 'reuse' | 'bank' | 'iap' | 'ads' | 'forklift'>;
/** Their keys, in the state's order (the migration's test walks them). */
export const STAGE2_KEYS = ['works', 'routes', 'lots', 'reuse', 'bank', 'iap', 'ads', 'forklift'] as const satisfies readonly (keyof Stage2Fields)[];

const LOOKS: readonly LookSlot[] = ['colour', 'dressing', 'plaque', 'sign'];

/** The fresh stage-2 part at device time `now` (epoch ms) on market day `day`. */
export function freshStage2(c: SalvageContent, now: number, day: number): Stage2Fields {
  void c;
  return {
    works: {},
    routes: {},
    lots: { nextAt: null, n: 0 },
    reuse: { nextAt: null, vanAt: null, level: 0, sold: { day, n: 0, money: 0 } },
    bank: { agreement: null, letterSeen: false, done: [] },
    iap: { looks: { colour: null, dressing: null, plaque: null, sign: null }, ledger: [], pending: [], hidden: null, ageBand: null, createdMs: now, sessions2At: null },
    ads: { day, awayUsed: 0, spotUsed: 0, awayOffer: null },
    forklift: null,
  };
}

/** The id of the next pending quote (`q<n>`, from `counts['quote#']`), and the count to store with it. */
export function quoteId(counts: Record<string, number> | undefined): { id: string; n: number } {
  const n = Math.max(0, Math.floor(counts?.['quote#'] ?? 0)) + 1;
  return { id: `q${n}`, n };
}

// ============================================================================================ repair (layout 3)

const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const num = (v: unknown, d = 0): number => (fin(v) ? v : d);
const whole = (v: unknown): number => Math.max(0, Math.floor(num(v)));
const money = (v: unknown): number => Math.max(0, Math.round(num(v) * 100) / 100);
const dateOrNull = (v: unknown): number | null => (fin(v) ? v : null);
const str = (v: unknown, max = 64): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown, max: number): string[] => arr(v).filter((x): x is string => str(x, 128)).slice(0, max);
const isStock = (v: unknown): boolean => Object.values(obj(v)).every(fin);
const stock = (v: unknown): Record<string, number> => Object.fromEntries(Object.entries(obj(v)).filter(([k, x]) => str(k) && fin(x)).map(([k, x]) => [k, Math.max(0, Math.round(x as number))]));

/** At most this many plates, quotes, history rows (bounded state). */
const MAX_PLATES = 64;
const MAX_PENDING = 16;
const MAX_DONE = 64;

function heatOf(v: unknown): HeatState | undefined {
  const h = obj(v);
  const phases = ['empty', 'filling', 'heating', 'ready', 'pouring', 'cooling'];
  if (!str(h.recipe) || !phases.includes(h.phase as string) || !fin(h.phaseSince) || !fin(h.lastFeedAt)) return undefined;
  const c = h.cooling === null || h.cooling === undefined ? null : obj(h.cooling);
  return {
    recipe: h.recipe,
    fromBays: h.fromBays !== false,
    charge_g: whole(h.charge_g),
    ...(isStock(h.chargeBy) && h.chargeBy ? { chargeBy: stock(h.chargeBy) } : {}),
    heel_g: whole(h.heel_g),
    phase: h.phase as HeatState['phase'],
    phaseSince: h.phaseSince,
    endsAt: dateOrNull(h.endsAt),
    lastFeedAt: h.lastFeedAt,
    firstPoured: !!h.firstPoured,
    cooling: c && str(c.grade) ? ({ ...(c as object), grade: c.grade, n: whole(c.n), short_g: whole(c.short_g) } as HeatState['cooling']) : null,
  };
}

function moveOf(v: unknown, t: number): CraneMove | null {
  const m = obj(v);
  if (!fin(m.t0) || !fin(m.end) || m.end < m.t0 || !str(m.from) || !str(m.to)) return null;
  const planned = arr(m.planned)
    .map(obj)
    .filter((p) => fin(p.end))
    .slice(0, 64)
    .map((p) => ({ items: strs(p.items, 64), g: whole(p.g), end: p.end as number }));
  return { items: strs(m.items, 64), g: whole(m.g), from: m.from, to: m.to, t0: m.t0, end: Math.max(m.end, t), ...(planned.length ? { planned } : {}) };
}

/**
 * A saved plate, kept when well formed (its machine part as save.ts keeps a machine's: hopper pieces
 * with a grade and grams, tray grams), else dropped. Phase B (rules-works) adds: unknown plates of the
 * content dropped, levels within `works.maxLevel`, hopper grades known.
 */
function worksOf(id: string, v: unknown, t: number): WorksState | null {
  const w = obj(v);
  const phases = ['arriving', 'installed', 'running'];
  if (!phases.includes(w.phase as string) || typeof w.owned !== 'boolean') return null;
  const hopper = arr(w.hopper).filter((p) => str(obj(p).grade) && whole(obj(p).g) > 0 && str(obj(p).uid, 128)) as WorksState['hopper'];
  const out: WorksState = {
    ...(w as unknown as WorksState),
    plate: id,
    phase: w.phase as WorksState['phase'],
    level: Math.max(w.owned ? 1 : 0, Math.min(99, whole(w.level))),
    hopper,
    tray_g: stock(w.tray_g),
    trayClaim_g: stock(w.trayClaim_g),
    since: num(w.since),
    commissionAt: dateOrNull(w.commissionAt),
  };
  if (w.heat !== undefined) {
    const h = heatOf(w.heat);
    if (h) out.heat = h;
    else delete out.heat;
  }
  if (w.segStart !== undefined && !fin(w.segStart)) delete out.segStart;
  if (w.drawn_g !== undefined) out.drawn_g = stock(w.drawn_g);
  if (w.move !== undefined) out.move = w.move === null ? null : moveOf(w.move, t);
  if (w.car !== undefined) {
    const c = obj(w.car);
    out.car = str(c.thing, 128) && fin(c.t0) && fin(c.end) && c.end >= c.t0 ? { thing: c.thing, t0: c.t0, end: Math.max(c.end, t) } : null;
  }
  if (w.course !== undefined) {
    const c = obj(w.course);
    if (fin(c.t0) && c.t0 <= t && str(c.from) && str(c.to)) out.course = { t0: c.t0, from: c.from, to: c.to };
    else delete out.course;
  }
  return out;
}

function agreementOf(v: unknown): Agreement | null {
  const a = obj(v);
  if (!str(a.plate) || ![a.P, a.F, a.c, a.T, a.taken, a.signedAt, a.I].every(fin)) return null;
  const T = money(a.T);
  return { kind: 'bank', plate: a.plate, P: money(a.P), F: money(a.F), c: money(a.c), T, taken: Math.min(T, money(a.taken)), signedAt: a.signedAt as number, I: money(a.I) };
}

function pendingOf(v: unknown): PendingQuote | null {
  const q = obj(v);
  if (!str(q.id) || !str(q.product) || !fin(q.S) || !fin(q.atMs) || (q.state !== 'open' && q.state !== 'waiting')) return null;
  return { id: q.id, product: q.product, S: money(q.S), I: money(q.I), atMs: q.atMs, known: strs(q.known, 1000), state: q.state };
}

function ledgerOf(v: unknown): LedgerEntry | null {
  const e = obj(v);
  if (!str(e.txId, 256) || !str(e.product) || !fin(e.S)) return null;
  return { txId: e.txId, product: e.product, S: money(e.S), atMs: num(e.atMs), ...(str(e.quote) ? { quote: e.quote } : {}) };
}

/**
 * A layout-3 save's stage-2 fields repaired (bounded, finite; what cannot be read is fresh). `t` is the
 * save's yard clock (dated ends are never before it). The ledger is NEVER cut short (a granted id must
 * stay known, or it could be granted again).
 */
export function repairStage2(raw: Partial<SalvageState>, fresh: Stage2Fields, t: number): Stage2Fields {
  const works: Record<string, WorksState> = {};
  for (const [id, v] of Object.entries(obj(raw.works)).slice(0, MAX_PLATES)) {
    if (!str(id)) continue;
    const w = worksOf(id, v, t);
    if (w) works[id] = w;
  }
  const routes = Object.fromEntries(Object.entries(obj(raw.routes)).filter(([g, to]) => str(g) && str(to)) as [string, string][]);

  const l = obj(raw.lots);
  const lots: LotsState = { nextAt: dateOrNull(l.nextAt), n: whole(l.n) };

  const r = obj(raw.reuse);
  const sold = obj(r.sold);
  const reuse: ReuseState = { nextAt: dateOrNull(r.nextAt), vanAt: dateOrNull(r.vanAt), level: Math.min(99, whole(r.level)), sold: { day: Math.floor(num(sold.day, fresh.reuse.sold.day)), n: whole(sold.n), money: money(sold.money) } };

  const b = obj(raw.bank);
  const bank: BankState = {
    agreement: b.agreement === null || b.agreement === undefined ? null : agreementOf(b.agreement),
    letterSeen: !!b.letterSeen,
    done: arr(b.done)
      .map(obj)
      .filter((d) => str(d.plate) && fin(d.T) && fin(d.signedAt) && fin(d.repaidAt))
      .slice(-MAX_DONE)
      .map((d) => ({ plate: d.plate as string, T: money(d.T), signedAt: d.signedAt as number, repaidAt: d.repaidAt as number })),
  };

  const i = obj(raw.iap);
  const looks = obj(i.looks);
  const hidden = obj(i.hidden);
  const iap: IapState = {
    looks: Object.fromEntries(LOOKS.map((k) => [k, str(looks[k]) ? (looks[k] as string) : null])) as IapState['looks'],
    ledger: arr(i.ledger).map(ledgerOf).filter((e): e is LedgerEntry => !!e),
    pending: arr(i.pending)
      .map(pendingOf)
      .filter((q): q is PendingQuote => !!q)
      .slice(-MAX_PENDING),
    hidden: str(hidden.codeHash, 256) ? { codeHash: hidden.codeHash } : null,
    ageBand: i.ageBand === 'u13' || i.ageBand === 't13' || i.ageBand === 'a18' ? i.ageBand : null,
    createdMs: fin(i.createdMs) ? i.createdMs : fresh.iap.createdMs,
    sessions2At: dateOrNull(i.sessions2At),
  };

  const a = obj(raw.ads);
  const offer = obj(a.awayOffer);
  const ads: AdsState = {
    day: Math.floor(num(a.day, fresh.ads.day)),
    awayUsed: whole(a.awayUsed),
    spotUsed: whole(a.spotUsed),
    awayOffer: fin(offer.amount) && fin(offer.I) ? { amount: money(offer.amount), I: money(offer.I) } : null,
  };

  const f = obj(raw.forklift);
  const forklift: ForkliftState | null =
    fin(f.x) && fin(f.y)
      ? {
          x: f.x,
          y: f.y,
          heading: Math.floor(num(f.heading)),
          // As the truck's `by` and the presence's `driving` are kept (save.ts), so is who is in the forklift.
          by: f.by === 'boss' ? 'boss' : null,
          load: arr(f.load).filter((p) => str(obj(p).grade) && whole(obj(p).g) > 0 && str(obj(p).uid, 128)) as ForkliftState['load'],
        }
      : null;

  return { works, routes, lots, reuse, bank, iap, ads, forklift };
}
