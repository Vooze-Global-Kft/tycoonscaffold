/**
 * THE MONEY'S PART OF A LAYOUT-3 SAVE repaired (stage 2, yard-stage2.md 2.14 to 2.16, 2.18, 2.20; RULING2 15):
 * the bank, the shop's state (looks, ledger, pending quotes, the hidden code, the age band), the ads' counts.
 * Owner: rules-money (Phase B). state2.ts `repairStage2` dispatches here and to state2Works.ts (s2a-fix, the
 * lead's ruling of 26 Nov 09:50). The ledger is NEVER cut short (a granted id must stay known).
 */
import type { AdsState, Agreement, BankState, IapState, LedgerEntry, LookSlot, PendingQuote, SalvageState } from './types';
import type { Stage2Fields } from './state2';
import { arr, dateOrNull, fin, money, num, obj, str, strs, whole } from './state2Read';

/** At most this many quotes and history rows (bounded state). */
const MAX_PENDING = 16;
const MAX_DONE = 64;
const LOOKS: readonly LookSlot[] = ['colour', 'dressing', 'plaque', 'sign'];

function agreementOf(v: unknown): Agreement | null {
  const a = obj(v);
  if (!str(a.plate) || ![a.P, a.F, a.c, a.T, a.taken, a.signedAt, a.I].every(fin)) return null;
  const T = money(a.T);
  return { kind: 'bank', plate: a.plate, P: money(a.P), F: money(a.F), c: money(a.c), T, taken: Math.min(T, money(a.taken)), signedAt: a.signedAt as number, I: money(a.I) };
}

function pendingOf(v: unknown): PendingQuote | null {
  const q = obj(v);
  if (!str(q.id) || !str(q.product) || !fin(q.S) || !fin(q.atMs) || (q.state !== 'open' && q.state !== 'waiting')) return null;
  const wait = q.state === 'waiting' && (q.wait === 'pending' || q.wait === 'unconfirmed') ? q.wait : null;
  return { id: q.id, product: q.product, S: money(q.S), I: money(q.I), atMs: q.atMs, askedMs: fin(q.askedMs) ? (q.askedMs as number) : null, known: strs(q.known, 1000), state: q.state, ...(q.wait !== undefined ? { wait } : {}) };
}

function ledgerOf(v: unknown): LedgerEntry | null {
  const e = obj(v);
  if (!str(e.txId, 256) || !str(e.product) || !fin(e.S)) return null;
  return { txId: e.txId, product: e.product, S: money(e.S), atMs: num(e.atMs), ...(str(e.quote) ? { quote: e.quote } : {}) };
}

/** The money's stage-2 fields of a layout-3 save (`fresh`: the fresh fields, for what cannot be read). */
export function repairMoney(raw: Partial<SalvageState>, fresh: Stage2Fields, t: number): Pick<Stage2Fields, 'bank' | 'iap' | 'ads'> {
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
  // s2a-fix (the critic's minor 14): an agreement saved with taken >= T is repaid: it would load open and never
  // close (payLot takes nothing more from it). It goes into the history, repaid at the save's clock.
  if (bank.agreement && bank.agreement.taken >= bank.agreement.T) {
    const a = bank.agreement;
    bank.done = [...bank.done, { plate: a.plate, T: a.T, signedAt: a.signedAt, repaidAt: t }].slice(-MAX_DONE);
    bank.agreement = null;
  }

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

  return { bank, iap, ads };
}
