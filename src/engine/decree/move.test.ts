/**
 * The bigger office (2.12; spec 10.2 `move`): canPrestige only on the result sheet after a win with
 * both requirements; the resets and the carries held against the two lists of data field by field,
 * so a field added later cannot slip through unlisted; ministers follow their club. Frozen test
 * content only (lesson 4).
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { decreeEngineMode } from '../decreeMode';
import { FIXTURE_NOW, built, decreeTestConfig } from '../fixtures/decree';

const cfg = decreeTestConfig();
const c = cfg.decree;
const stand1 = c.offices[1].stand!;
const C0 = R.callDayOf(c.offices[0]);

/** The record the governor needs, spread over the mayor's ministries (each under the cap). */
const levels = (record: number) => {
  const n = c.offices[0].ministries.length;
  return Array.from({ length: n }, (_, i) => Math.floor(record / n) + (i < record % n ? 1 : 0));
};

/** The result sheet after a count with `moods`, Name Recognition `nr` before it and the record `record`. */
function afterCount(moods: number[], nr: number, record: number, extra: Partial<R.DecreeState> = {}): R.DecreeGame {
  const g0 = built({ day: C0, moods, nr, ministries: levels(record), cabinet: ['pockle', 'pellow'], desk: 'test-mayor-bus-swap-1', tray: ['test-mayor-shops-fee-1'] }, cfg);
  let s = R.callElection(cfg, { ...g0, decree: { ...g0.decree, ...extra } }, g0.stats.playSeconds, []);
  for (let k = 0; k < 40 && !R.canCount(cfg, s); k++) {
    s = s.decree.desk ? R.decide(cfg, s, 'refuse', s.stats.playSeconds, []) : R.advanceDecree(cfg, s, 1, 0);
  }
  return R.endElectionNight(cfg, R.countVotes(cfg, s, []));
}

const win = () => afterCount([80, 80, 80], stand1.nr, stand1.record, { clippings: ['A CLIPPING'], vanity: ['bust'], face: 'quill', standingOrder: true, cooldowns: { openDoors: 99 }, drawerCount: 12, wall: [] });

describe('canMoveUp (2.12)', () => {
  it('only on the result sheet after a win with Name Recognition and the record met', () => {
    const g = win();
    expect(g.decree.phase).toBe('result');
    expect(R.canMoveUp(cfg, g)).toBe(true);
    expect(decreeEngineMode.canPrestige!(cfg, g)).toBe(true);
    expect(R.resultSheet(cfg, g)).toMatchObject({ canMoveUp: true, missing: null });
    // A loss, a short record, a short NR, the night itself: refused (the same object).
    const lost = afterCount([20, 20, 20], stand1.nr, stand1.record);
    expect(R.canMoveUp(cfg, lost)).toBe(false);
    const shortRecord = afterCount([80, 80, 80], stand1.nr, stand1.record - 1);
    expect(R.canMoveUp(cfg, shortRecord)).toBe(false);
    expect(R.resultSheet(cfg, shortRecord)!.missing).toMatchObject({ record: stand1.record - 1, recordNeeded: stand1.record });
    expect(R.moveUp(cfg, shortRecord, FIXTURE_NOW, [])).toBe(shortRecord);
    const shortNr = afterCount([80, 80, 80], -100, stand1.record);
    expect(shortNr.decree.nr).toBeLessThan(stand1.nr);
    expect(R.canMoveUp(cfg, shortNr)).toBe(false);
    const night = { ...g, decree: { ...g.decree, phase: 'count' as const } };
    expect(R.canMoveUp(cfg, night)).toBe(false);
    expect(decreeEngineMode.prestige(cfg, night, FIXTURE_NOW)).toBe(night);
    expect(R.canMoveUp(cfg, built({ office: 2, phase: 'result' }, cfg))).toBe(false);
  });
});

describe('the two lists of 2.12, field by field', () => {
  it('every decree field is in exactly one list', () => {
    const g = win();
    const moved = R.moveUp(cfg, g, FIXTURE_NOW, []);
    const keys = new Set([...Object.keys(g.decree), ...Object.keys(moved.decree), ...Object.keys(R.movedState(cfg, g, FIXTURE_NOW).decree)]);
    const listed = [...R.MOVE_RESETS, ...R.MOVE_STAYS].flatMap((x) => x.fields).filter((f) => f !== 'cash' && f !== 'runEarnings');
    expect(new Set(listed).size, 'no field in two lists').toBe(listed.length);
    for (const k of keys) expect(listed, `decree.${k} is in neither list`).toContain(k);
    for (const k of listed) expect(keys, `${k} is not a field`).toContain(k);
  });

  it('resets take the new office’s fresh values (the fund, the moods and the offer by their rules); stays keep theirs', () => {
    const g = win();
    const back = R.returnToDeck(cfg, g);
    const m = R.movedState(cfg, g, FIXTURE_NOW + 5);
    const fresh = R.freshDecree(cfg, g.decree.seed, 1);
    const fund = R.roundDibs(cfg, c.ladder.transitionFund * R.decreeParams(cfg, g).B);
    for (const item of R.MOVE_RESETS) {
      for (const f of item.fields) {
        if (f === 'cash') expect(m.cash).toBe(fund);
        else if (f === 'runEarnings') expect(m.runEarnings).toBe(fund);
        else if (f === 'moods') expect(m.decree.moods).toEqual(fresh.moods.map(() => c.mood.start + Math.min(c.ladder.moveMoodCap, Math.floor(g.decree.nr / c.ladder.moveMoodPerNr))));
        else if (f === 'monumentOffer') expect(m.decree.monumentOffer).toBe(R.monumentFor(cfg, 1, 1, g.decree.vanity));
        else if (f === 'appSlotsUsed') expect(m.decree.appSlotsUsed).toBe(0);
        else if (f === 'result' || f === 'cashAnchor') expect(m.decree[f]).toBeNull();
        else expect(m.decree[f], `reset ${f}`).toEqual(fresh[f]);
      }
    }
    for (const item of R.MOVE_STAYS) {
      for (const f of item.fields) {
        if (f === 'cash' || f === 'runEarnings') continue;
        if (f === 'wall') expect(m.decree.wall).toEqual([...back.decree.wall, { office: 0, terms: g.decree.term, levels: g.decree.ministries.map((x) => (x.open ? x.level : 0)) }]);
        // The old treasury is booked under 'reset' and the fund under 'transition' (H5); every other counter stays.
        else if (f === 'stats') expect({ ...m.decree.stats, book: { ...m.decree.stats.book, transition: 0, reset: 0 } }).toEqual({ ...back.decree.stats, book: { ...back.decree.stats.book, transition: 0, reset: 0 } });
        else expect(m.decree[f], `stays ${f}`).toEqual(back.decree[f]);
      }
    }
    // The H5 book: the fund enters through 'transition'; purchases (entitlements) are not touched.
    expect(m.decree.stats.book.transition).toBe((g.decree.stats.book.transition ?? 0) + fund);
    expect(m.decree.stats.book.reset).toBe((g.decree.stats.book.reset ?? 0) - g.cash);
    expect(m.entitlements).toBe(g.entitlements);
    expect(m.prestigeCount).toBe(g.prestigeCount + 1);
    expect(m.lastSavedAt).toBe(FIXTURE_NOW + 5);
  });

  it('the tray and the aside papers go back to the deck unseen; their follow-ups come again in the new office', () => {
    const g = win();
    expect(g.decree.tray.length + g.decree.asideTray.length).toBeGreaterThan(0);
    const m = R.movedState(cfg, g, FIXTURE_NOW);
    expect(m.decree.tray).toEqual([]);
    expect(m.decree.asideTray).toEqual([]);
    for (const p of [...g.decree.tray, ...g.decree.asideTray]) if (p.kind === 'comic') expect(m.decree.seen[p.source]).toBeUndefined();
  });

  it('the move lands the new office’s first paper and starts its clock; ministers run their club’s ministry there', () => {
    const g = win();
    const ev: R.DecreeEvent[] = [];
    const x = R.moveUp(cfg, g, FIXTURE_NOW, ev);
    expect(x.decree.office).toBe(1);
    expect(x.decree.desk?.type === 'paper' && x.decree.desk.paper.kind).toBe('scripted');
    expect(x.decree.scriptedDone).toContain('governor:1');
    expect(x.decree.nextArrivalAt).toBe(x.stats.playSeconds + c.offices[1].tau);
    expect(ev).toContainEqual({ type: 'moved', from: 0, to: 1 });
    // Pockle (Bus) runs the governor's Bus ministry; her rule is scoped to the Bus club's index there.
    const busMinistry = c.offices[1].ministries.findIndex((mi) => mi.club === 'bus');
    expect(R.ministerOf(cfg, x, busMinistry)).toBe('pockle');
    expect(R.cabinet(cfg, x).find((s) => s.minister === 'pockle')).toMatchObject({ appointed: true, ministry: busMinistry });
    const f = R.ministerFactors(cfg, x).list.find((e) => e.source === 'pockle')!;
    expect(f.club).toBe(c.offices[1].clubs.indexOf('bus'));
    expect(R.ledger(cfg, x).rows[busMinistry].minister).toBe('pockle');
    // The engine mode's prestige is the same move.
    expect(JSON.stringify(decreeEngineMode.prestige(cfg, g, FIXTURE_NOW))).toBe(JSON.stringify(R.moveUp(cfg, g, FIXTURE_NOW, [])));
  });

  it('the move sheet lists the resets and stays, the fund, and when the new income passes the old', () => {
    const g = win();
    const sheet = R.moveSheet(cfg, g)!;
    expect(sheet).toMatchObject({ from: 0, to: 1, resets: R.MOVE_RESETS.map((x) => x.id), stays: R.MOVE_STAYS.map((x) => x.id), transitionFund: R.transitionFund(cfg, g) });
    expect(sheet.passesIn).not.toBeNull();
    expect(R.moveSheet(cfg, afterCount([20, 20, 20], stand1.nr, stand1.record))).toBeNull();
  });
});
