/**
 * The VIEWS package's screens as data (src/ui/decree/views/model.ts), on the real game data and the
 * web presets' states (the reference reader on the real engine, src/modes/decree/presets.web.ts) and
 * on the rules' fixtures. No number is pinned: every value is compared with the rules' own.
 * - Election night shows the rules' announcement order and shares, number for number (H2).
 * - The result sheet offers what canPrestige allows (the engine mode's gate), after a win and a loss.
 * - The Office wall builds for an empty first day and for a late state.
 */
import { describe, expect, it } from 'vitest';
import game from '../../../../games/high-office/game.json';
import { GameConfigSchema } from '../../../config/schema';
import * as R from '../../../engine/decree';
import { decreeEngineMode, withDecreeContent } from '../../../engine/decreeMode';
import { FIXTURE_NOW, baseGameState } from '../../../engine/fixtures/decree';
import { botPresetState } from '../../../modes/decree/presets.web';
import { S } from '../strings';
import { moveModel, monumentModel, newThingName, nightModel, playerFaces, resultModel, wallModel } from './model';

const cfg = withDecreeContent(GameConfigSchema.parse(game)) as unknown as R.DecreeConfig;
/** A new game as the app makes it (the web preset "fresh"). */
const fresh = decreeEngineMode.create(cfg, baseGameState(FIXTURE_NOW)) as R.DecreeGame;
const mid = botPresetState(cfg, 'mid').game;
const late = botPresetState(cfg, 'late').game;

/** Decides everything the run-up brings (signing when the treasury pays, else refusing) until the votes may be counted, then counts. */
function countFrom(g: R.DecreeGame, choice: R.Choice): R.DecreeGame {
  let s = g;
  for (let k = 0; k < 600 && !R.canCount(cfg, s); k++) {
    const clock = s.stats.playSeconds;
    if (s.decree.desk) {
      let next = R.decide(cfg, s, choice, clock, []);
      if (next === s) next = R.decide(cfg, s, 'refuse', clock, []);
      s = next;
      if (s.decree.pending) s = R.commitPending(cfg, s, clock, []);
    } else s = R.advanceDecree(cfg, s, 1, 0);
  }
  expect(R.canCount(cfg, s)).toBe(true);
  return R.countVotes(cfg, s, []);
}

/** The same state with every mood at `m` before the count (a sure win or a sure loss on the real numbers). */
function withMoods(g: R.DecreeGame, m: number): R.DecreeGame {
  return { ...g, decree: { ...g.decree, moods: g.decree.moods.map(() => m) } };
}

describe('the presets the tests run on', () => {
  it('exist (the reader on the real engine)', () => {
    expect(mid?.decree.phase).toBe('campaign');
    expect(late?.decree.office).toBe(2);
  });
});

describe('election night (4.4, H2)', () => {
  for (const [label, choice, mood] of [
    ['signing the run-up', 'sign', null],
    ['a sure win', 'refuse', 90],
    ['a sure loss', 'refuse', 5],
  ] as const) {
    it(`shows the rules' announcement order and shares, number for number (${label})`, () => {
      const base = mood === null ? mid! : withMoods(mid!, mood);
      const night = countFrom(base, choice);
      const cnt = night.decree.count!;
      const m = nightModel(cfg, night)!;
      expect(m.rows.map((r) => r.district)).toEqual(cnt.order);
      expect(m.rows.map((r) => r.district)).toEqual(R.announcementOrder(cnt.districts.map((x) => x.share)));
      for (const r of m.rows) {
        expect(r.share).toBe(cnt.districts[r.district].share);
        expect(r.held).toBe(cnt.districts[r.district].held);
        expect(r.name).toBe(cfg.decree.offices[night.decree.office].districts[r.district].name);
      }
      expect(m.held).toBe(cnt.held);
      expect(m.won).toBe(cnt.won);
      expect(m.majority).toBe(cnt.majority);
      expect(m.heldAfter[m.heldAfter.length - 1]).toBe(cnt.held);
      if (cnt.won) expect(m.heldAfter[m.majorityAt!]).toBe(cnt.majority);
      else expect(m.majorityAt).toBeNull();
      // The poll before the count said the same (H2): the screen shows the poll's numbers.
      const before = countFrom(base, choice);
      expect(before.decree.count!.districts.map((x) => x.share)).toEqual(cnt.districts.map((x) => x.share));
    });
  }
});

describe('the result sheet follows canPrestige', () => {
  it('after a win, a loss, and on the desk', () => {
    const cases = [countFrom(withMoods(mid!, 90), 'refuse'), countFrom(withMoods(mid!, 5), 'refuse'), countFrom(mid!, 'sign')];
    let sawLoss = false;
    let sawWin = false;
    for (const counted of cases) {
      const res = R.endElectionNight(cfg, counted);
      const m = resultModel(cfg, res, S.views.quietTerm)!;
      expect(m).not.toBeNull();
      const can = decreeEngineMode.canPrestige!(cfg, res);
      expect(m.options).toEqual(can ? ['moveUp', 'stay'] : ['stay']);
      expect(m.won).toBe(res.decree.count!.won);
      if (!m.won) {
        sawLoss = true;
        expect(can).toBe(false);
        expect(m.resignation).not.toBeNull();
        expect(m.disarray).toBe(R.poll(cfg, res).disarray);
        expect(m.missing).toBeNull();
      } else {
        sawWin = true;
        expect(m.resignation).toBeNull();
        if (!can) expect(m.missing).not.toBeNull();
        if (can) expect(moveModel(cfg, res)).not.toBeNull();
      }
      expect(m.nrGained).toBe(R.resultSheet(cfg, res)!.nrGained);
    }
    expect(sawLoss && sawWin).toBe(true);
    // Off the result sheet there is no result and no move.
    expect(resultModel(cfg, late!, S.views.quietTerm)).toBeNull();
    expect(moveModel(cfg, late!)).toBeNull();
  });

  it('names every new thing the result sheet can announce', () => {
    for (let term = 2; term <= 200; term++)
      for (const office of [0, 1, 2] as const) {
        const label = R.newThingLabel(R.newThingAt(cfg, office, term));
        if (label) expect(newThingName(cfg, label, S.views.quietTerm)?.name).toBeTruthy();
      }
  });
});

describe('the Office wall', () => {
  it('builds for an empty first day', () => {
    const w = wallModel(cfg, fresh);
    expect(w.photos).toEqual([]);
    expect(w.formerOpponents).toEqual([]);
    expect(w.monuments).toEqual([]);
    expect(w.grandProjects).toEqual([]);
    expect(w.term).toBe(1);
    expect(w.age).toBe(0);
    expect(w.scrapbook.every((e) => !e.found)).toBe(true);
    expect(monumentModel(cfg, fresh)).toBeNull();
  });

  it('builds for a late state: the towns left with their levels, the projects, the shelf, the clippings', () => {
    const g = late!;
    const w = wallModel(cfg, g);
    expect(w.photos.map((p) => p.office)).toEqual(g.decree.wall.map((p) => p.office));
    w.photos.forEach((p, i) => {
      expect(p.terms).toBe(g.decree.wall[i].terms);
      expect(p.ministries.map((x) => x.level)).toEqual(g.decree.wall[i].levels);
      expect(p.ministries.every((x) => x.name)).toBe(true);
    });
    expect(w.grandProjects.map((p) => p.level)).toEqual(g.decree.ministries.slice(cfg.decree.offices[2].ministries.length).map((m) => m.level));
    expect(w.monuments.map((m) => m.id)).toEqual(g.decree.vanity);
    expect(w.scrapbook.filter((e) => e.found).map((e) => e.text)).toEqual(g.decree.clippings);
    expect(w.formerOpponents.map((o) => o.id)).toEqual(g.decree.formerOpponents);
    expect(w.formerOpponents.every((o) => o.name)).toBe(true);
  });

  it('offers the six faces with the data names', () => {
    expect(playerFaces(cfg).map((f) => f.name)).toEqual(cfg.decree.cast.players.map((p) => p.name));
    expect(playerFaces(cfg)).toHaveLength(6);
  });
});
