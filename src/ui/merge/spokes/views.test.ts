/**
 * The spokes' data (spec 5.2, 5.3, 5.6, 2.11): every word of the rules' lists has its words, every
 * lantern says what it changes, the figures are the rules' own. Package SPOKES (7b).
 */
import { describe, expect, it } from 'vitest';
import * as R from '../../../engine/merge';
import { freshState, mergeState, mergeTestConfig } from '../../../engine/fixtures/merge';
import { S } from '../strings';
import { count, effectText, featText, gateView, ladderView, listWords, oddsView, scrollView, spokeKey } from './views';

const cfg = mergeTestConfig();

describe('the Season scroll lists', () => {
  it('every item of SEASON_RESETS and SEASON_STAYS has words, in the rules order', () => {
    for (const it of R.SEASON_RESETS) expect(S.spokes.resetItems[it.id], it.id).toBeTruthy();
    for (const it of R.SEASON_STAYS) expect(S.spokes.stayItems[it.id], it.id).toBeTruthy();
    expect(listWords(R.SEASON_RESETS, S.spokes.resetItems)).toHaveLength(R.SEASON_RESETS.length);
    expect(listWords(R.SEASON_STAYS, S.spokes.stayItems)[0]).toBe(S.spokes.stayItems[R.SEASON_STAYS[0].id]);
  });

  it('a fresh game cannot close; the next season is season 2 of the table with its sentence', () => {
    const g = freshState(cfg);
    const v = scrollView(cfg, g);
    expect(v.canClose).toBe(false);
    expect(v.season).toBe(R.seasonRow(cfg, 0).name);
    expect(v.next.season).toBe(R.seasonRow(cfg, 1).name);
    expect(v.next.sentence).toBe(S.spokes.place[R.seasonRow(cfg, 1).character]);
    expect(v.lines).toHaveLength(g.merge.festival.lines.length);
    expect(v.pieces).toHaveLength(0);
  });

  it('a filled Festival enables the close and shows this season\'s piece', () => {
    const g0 = freshState(cfg);
    const g = { ...g0, merge: { ...g0.merge, festival: { lines: g0.merge.festival.lines.map((l) => ({ ...l, filled: true })), filledAt: g0.stats.playSeconds } } };
    const v = scrollView(cfg, g);
    expect(v.canClose).toBe(true);
    expect(v.done).toBe(true);
    expect(v.filled).toBe(v.lines.length);
    expect(v.pieces.at(-1)?.now).toBe(true);
  });

  it('every season character has a sentence', () => {
    for (const row of cfg.merge.seasons.table) expect(S.spokes.place[row.character], row.character).toBeTruthy();
  });
});

describe('the Lantern Gate', () => {
  it('every lantern has a feat and an effect in words', () => {
    for (const l of cfg.merge.lanterns) {
      expect(featText(cfg, l.feat), `feat ${l.n}`).toBeTruthy();
      expect(effectText(cfg, l.n), `effect ${l.n}`).toBeTruthy();
    }
  });

  it('the next three unlit feats carry the rules\' featProgress; the rest no bar', () => {
    const g = freshState(cfg);
    const v = gateView(cfg, g);
    const p = R.featProgress(cfg, g);
    expect(v.next.map((r) => r.n)).toEqual(p.map((x) => x.n));
    expect(v.next.every((r) => r.bar !== null)).toBe(true);
    expect(v.dark.every((r) => r.bar === null)).toBe(true);
    expect(v.next.length + v.litRows.length + v.dark.length).toBe(cfg.merge.lanterns.length);
  });

  it('effects read the rules: lantern 7 says its Lucky odds, the minder lantern the rules\' interval', () => {
    const lucky = cfg.merge.lanterns.find((l) => l.effect.type === 'luckyOdds')!;
    expect(effectText(cfg, lucky.n)).toContain(String(R.lanternMods(cfg, [lucky.n]).luckyOdds));
    const pace = cfg.merge.lanterns.find((l) => l.effect.type === 'minderIntervalMult');
    if (pace) expect(effectText(cfg, pace.n)).toContain(String(Math.round(R.saleInterval(cfg, { minderIntervalMult: R.lanternMods(cfg, [pace.n]).minderIntervalMult! }) * 100) / 100));
  });

  it('counts read as figures', () => {
    expect(count(1000)).toBe('1,000');
    expect(count(25)).toBe('25');
  });
});

describe('the Ladder Book', () => {
  it('found goods show their worth from the rules; the next its name; the rest "?"', () => {
    const g = freshState(cfg);
    const v = ladderView(cfg, g, 0);
    const found = v.rungs.filter((r) => r.kind === 'found');
    const next = v.rungs.filter((r) => r.kind === 'next');
    expect(next.length).toBeLessThanOrEqual(1);
    for (const r of found) expect(r.detail).toBe(S.spokes.worth(String(R.roundCoins(cfg, R.value(cfg, g, 0, r.k)))));
    for (const r of v.rungs.filter((x) => x.kind === 'unknown')) expect(r.name).toBe('');
    expect(v.found).toBe(R.ladderCount(g.merge, 0));
  });

  it('the help page prints the Lucky odds the rules use now (a Fireflies season changes them)', () => {
    const g = freshState(cfg);
    expect(oddsView(cfg, g).lucky).toBe(S.spokes.lucky(R.currentMods(cfg, g.merge).luckyOdds));
    const summer = cfg.merge.seasons.table.findIndex((r) => r.character === 'fireflies');
    const gs = { ...g, merge: { ...g.merge, season: summer } };
    const o = oddsView(cfg, gs);
    expect(o.lucky).toBe(S.spokes.lucky(R.currentMods(cfg, gs.merge).luckyOdds));
    expect(o.luckyWhy).toBe(S.spokes.luckyFromSeason(R.seasonRow(cfg, summer).name));
  });

  it('the key changes when a good is stamped', () => {
    const a = mergeState(cfg, { goods: [] });
    const book = a.merge.book.map((r) => r.slice());
    book[1][0] = true;
    const b = { ...a, merge: { ...a.merge, book } };
    expect(spokeKey(cfg, a)).not.toBe(spokeKey(cfg, b));
  });
});
