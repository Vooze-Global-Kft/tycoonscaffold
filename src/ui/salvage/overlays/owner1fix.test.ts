/**
 * The one pass of fixes after the player's review of the owner's points (label owner1-fix-hud, 26 November;
 * owner1/player1.json): finding 7 (a place's card is titled from the place whose rows it shows), 8 (the away
 * card adds up at first sight), 14 (the rung sign says when the rung opened). On the shipped content.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../../config/schema.salvage';
import * as R from '../../../engine/salvage';
import { startGame } from '../../../engine/salvage/bot';
import { say } from '../strings';
import { measureW } from '../hud/metrics';
import { awayDocket } from './awayDocket';
import { AWAY_SAMPLES } from './awaySample';
import { PAD, TYPE, frameLayout, pt } from './layout';
import { rungLines } from './marketLines';
import { placeCardShows, rackRows, withSample } from './sample';

const NOW = Date.UTC(2026, 10, 26, 9, 0, 0);
const RAW = JSON.parse(fs.readFileSync(new URL('../../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage;
const C: SalvageContent = SalvageSchema.parse(RAW);
const cfg = { mode: 'salvage', salvage: C } as unknown as R.SalvageConfig;
const w = (t: R.Txt | null | undefined) => (t ? say(t, C) : '');

describe("finding 7: a place's card is titled from the place whose rows it shows", () => {
  const g = startGame(cfg, NOW);
  const card = (place: string) => withSample(cfg, g, { kind: 'place', place }, R.cardOf(cfg, g, { kind: 'place', place }, NOW));
  const rackIds = rackRows(cfg, g).map((r) => r.id).join(',');

  it("the reviewer's two positions: between the rack and the weighbridge (52.6, 27.4) no card titled 'Weighbridge' shows the rack's list; at (52.3, 27.8) the rack's card is 'Tool rack'", () => {
    const a = R.placeNear(cfg, 52.6, 27.4);
    const b = R.placeNear(cfg, 52.3, 27.8);
    expect(a).toBe('weighbridge');
    expect(b).toBe('rack');
    const da = card(a!);
    // The cause: the rules give a place with no card kind of its own an empty 'rack' panel titled by that place, and
    // the stand-in filled it with the rack's rows. Now its rows are its own (none), and the button offers no "Open".
    expect(w(da.title)).toBe('Weighbridge');
    expect(da.rows.map((r) => r.id).join(',')).not.toBe(rackIds);
    expect(da.rows).toEqual([]);
    expect(placeCardShows(cfg, g, a!, NOW)).toBe(false);
    const db = card(b!);
    expect(w(db.title)).toBe('Tool rack');
    expect(db.rows.map((r) => r.id).join(',')).toBe(rackIds);
    expect(placeCardShows(cfg, g, b!, NOW)).toBe(true);
  });

  it("over every place with a card: the rack's rows appear only under the rack's title", () => {
    for (const place of Object.keys(C.map.places)) {
      if (!C.map.places[place].card) continue;
      const d = card(place);
      if (d.rows.length && d.rows.map((r) => r.id).join(',') === rackIds) expect(place, place).toBe('rack');
    }
  });
});

describe('finding 8: the away card adds up at first sight', () => {
  it("the foot carries 'Sold +§x · Loads −§y' from CardData's own totals (and the bank's share when there is one)", () => {
    const two = awayDocket(AWAY_SAMPLES.two);
    expect(two.sum?.key).toBe('away.sumBoth');
    expect((two.sum!.args!.x as { money: number }).money).toBe(AWAY_SAMPLES.two.money);
    expect((two.sum!.args!.y as { money: number }).money).toBe(AWAY_SAMPLES.two.spent);
    expect(w(two.sum)).toMatch(/^Sold \+§[\d,.]+ · Loads −§[\d,.]+$/);
    const every = awayDocket(AWAY_SAMPLES.every);
    expect(every.sum?.key).toBe('away.sumBank');
    expect((every.sum!.args!.z as { money: number }).money).toBe(AWAY_SAMPLES.every.bank);
    // Nothing went out: the net is the sales; no line to explain it.
    const salesOnly = awayDocket({ ...AWAY_SAMPLES.two, spent: 0, bought: [], net: AWAY_SAMPLES.two.money });
    expect(salesOnly.sum).toBeNull();
  });

  const PHONES = [
    { name: '844 x 390', w: 844, h: 390, i: { top: 0, left: 47, right: 47, bottom: 21 } },
    { name: '667 x 375', w: 667, h: 375, i: { top: 0, left: 0, right: 0, bottom: 0 } },
  ];
  for (const p of PHONES)
    for (const fsc of [1, 1.3])
      it(`the line at its widest fits the foot on ONE line, and the card keeps two rows of the list: ${p.name} at ${fsc}`, () => {
        const L = frameLayout(p.w, p.h, p.i, fsc);
        const widest = say({ key: 'away.sumBank', args: { x: { money: 999_999.99 }, y: { money: 999_999.99 }, z: { money: 99_999.99 } } }, C);
        const room = L.centred.w - 2.6 - 2 * PAD;
        expect(measureW(widest, pt(TYPE.name, L.fs)), `${p.name} ${fsc}`).toBeLessThanOrEqual(room);
        // heights: the title band, the head, the foot with the line and at least two rows within the card
        const n = pt(TYPE.name, L.fs);
        const big = pt(24, L.fs);
        const f17 = pt(17, L.fs);
        const title = Math.max(34, pt(TYPE.title, L.fs) * 1.7);
        const head = 14 + Math.ceil(pt(TYPE.line, L.fs) * 1.25) + Math.ceil(f17 * 1.2);
        const sumLine = 6 + Math.ceil(n * 1.25);
        const foot = 18 + Math.max(Math.ceil(pt(TYPE.line, L.fs) * 1.25) + Math.ceil(big * 1.15), 36);
        const row = Math.ceil(n * 1.25) + 9;
        expect(title + head + sumLine + foot + 8 + 2 * row, `${p.name} ${fsc}`).toBeLessThanOrEqual(L.centred.h);
      });
});

describe('finding 14: the rung sign says when the rung opened', () => {
  it("'{homeYard} · Opened at {t}' with the rung's own tonnage, never '{t} supplied' beside 'You: {t} supplied'", () => {
    const r2 = rungLines(2, 2.8, null);
    expect(r2.sign.key).toBe('table.rungOpened');
    const words = say(r2.sign, C);
    expect(words).toContain('Opened at 2.8 t');
    expect(words).not.toContain('supplied');
  });
});
