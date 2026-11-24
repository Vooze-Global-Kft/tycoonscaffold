/**
 * Boycotts, the strike named for what it is (2.8). Package P1a (docs/design/office-build-plan.md).
 *
 * After a commit, any club below 20 whose strike is armed boycotts its ministries (s_i = 0); its
 * picket slogan (none twice a term) hangs on its Ledger row and its spokesperson's grievance goes on
 * top of the tray (it may exceed the cap by 1). Sign "Return the scissors": 20 s of B, the club +10
 * (fixed), the boycott ends. Refuse "Keep the scissors": it runs 8 more decided papers (counted from
 * the paper after the grievance), then ends with no mood change (D6). While the grievance waits the
 * count does not run. It ends at once when the club reaches 25 by any means; it re-arms at 30. "Send
 * a Courier" ends it now with no mood change. Nothing here moves with time: every count is in decided
 * day papers (2.17 step 2).
 *
 * SEAM: `countDownStrikes` and `checkStrikes` are steps 2 and 3 of 2.17 (decide.ts `commitItem`);
 * `endStrike` is called by the Courier ad (./grants.ts, P1b) and by the new term's halfway reset
 * (./term.ts, P1b: "any boycott whose club is now 25 or more ends").
 */
import { grievancePaper, onTop } from './draw';
import { officeOf } from './params';
import type { ClubIx, DecreeConfig, DecreeEvent, DecreeGame, Strike } from './types';

const withDecree = (g: DecreeGame, patch: Partial<DecreeGame['decree']>): DecreeGame => ({ ...g, decree: { ...g.decree, ...patch } });

/** Whether club g's grievance still waits for a decision (desk, take-back window or tray). */
function grievanceWaits(g: DecreeGame, club: ClubIx): boolean {
  const d = g.decree;
  const is = (p: { kind: string; petitioner: ClubIx | null }) => p.kind === 'strike' && p.petitioner === club;
  return (d.desk?.type === 'paper' && is(d.desk.paper)) || (!!d.pending && is(d.pending.item.paper)) || d.tray.some(is);
}

/** 2.17 step 2 for a day paper: every running boycott's counter −1, ending at 0 with no mood change; a boycott whose grievance was just decided starts counting from the next paper. Built. */
export function countDownStrikes(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  let s = g;
  g.decree.strikes.forEach((st, gi) => {
    if (!st) return;
    if (st.waiting) {
      if (!grievanceWaits(s, gi)) s = withDecree(s, { strikes: s.decree.strikes.map((x, k) => (k === gi && x ? { ...x, waiting: false } : x)) });
      return;
    }
    const left = st.papersLeft - 1;
    s = left <= 0 ? endStrike(cfg, s, gi, 'count', events) : withDecree(s, { strikes: s.decree.strikes.map((x, k) => (k === gi && x ? { ...x, papersLeft: left } : x)) });
  });
  return s;
}

/** 2.17 step 3: boycotts that end (the club at endsAt), clubs that re-arm (at rearmAt), boycotts that start (below `below`, armed: picket, grievance on top). Built. */
export function checkStrikes(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  const b = cfg.decree.boycott;
  let s = g;
  const clubs = officeOf(cfg, g.decree.office).clubs;
  for (let gi = 0; gi < g.decree.moods.length; gi++) {
    const m = s.decree.moods[gi];
    if (s.decree.strikes[gi] && m >= b.endsAt) s = endStrike(cfg, s, gi, 'mood', events);
    if (!s.decree.armed[gi] && m >= b.rearmAt) s = withDecree(s, { armed: s.decree.armed.map((x, k) => (k === gi ? true : x)) });
    if (!s.decree.strikes[gi] && s.decree.armed[gi] && m < b.below) {
      const d = s.decree;
      const own = cfg.decree.deck.grievances.filter((x) => x.club === clubs[gi]);
      const def = own.find((x) => !d.picketsThisTerm.includes(x.picket)) ?? own[0];
      const strike: Strike = { papersLeft: b.papers, picket: def?.picket ?? '', grievance: def?.id ?? '', waiting: true };
      s = withDecree(s, {
        strikes: d.strikes.map((x, k) => (k === gi ? strike : x)),
        armed: d.armed.map((x, k) => (k === gi ? false : x)),
        picketsThisTerm: def ? [...d.picketsThisTerm, def.picket] : d.picketsThisTerm,
        stats: { ...d.stats, boycotts: d.stats.boycotts + 1 },
      });
      events.push({ type: 'boycottStart', club: gi });
      if (def) {
        const r = grievancePaper(cfg, s, gi, def);
        s = onTop(r.g, r.paper);
      } else s = withDecree(s, { strikes: s.decree.strikes.map((x, k) => (k === gi && x ? { ...x, waiting: false } : x)) });
    }
  }
  return s;
}

/**
 * Ends club g's boycott now (settled by its grievance, its count, the club at endsAt, the Courier ad, a
 * new term): no mood change; its grievance goes wherever it still waits (the tray, the desk, the
 * take-back window), so no strip is left that promises to end a boycott that no longer runs. A desk
 * left empty is the caller's to fill (draw.ts `landNext`: grants.ts does it for the Courier). The same
 * object when none runs. Built.
 */
export function endStrike(cfg: DecreeConfig, g: DecreeGame, club: ClubIx, how: 'settled' | 'count' | 'ad' | 'mood' | 'term', events: DecreeEvent[]): DecreeGame {
  void cfg;
  const d = g.decree;
  if (!d.strikes[club]) return g;
  events.push({ type: 'boycottEnd', club, how });
  const is = (p: { kind: string; petitioner: ClubIx | null }) => p.kind === 'strike' && p.petitioner === club;
  const deskGoes = d.desk?.type === 'paper' && is(d.desk.paper);
  const pendingGoes = !!d.pending && is(d.pending.item.paper);
  return withDecree(g, {
    strikes: d.strikes.map((x, k) => (k === club ? null : x)),
    tray: d.tray.filter((p) => !is(p)),
    desk: deskGoes ? null : d.desk,
    pending: pendingGoes ? null : d.pending,
  });
}
