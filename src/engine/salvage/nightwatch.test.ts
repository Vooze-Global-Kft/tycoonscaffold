/**
 * desk2 item 1 (E33): the Night watch's row on the rota prints THIS rung's hours from the helper the away
 * pass applies (a = the cap now, b = the cap with the Night watch), and is offered only once the player has
 * been away (the content's own 'why'). On the game's own content (game.json).
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import { SalvageSchema } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NOW, playedGame } from '../fixtures/salvage';
import { awayPass } from './away';
import { cardOf } from './cards';
import type { SalvageConfig, SalvageGame } from './types';

const cfg = { ...GameConfigSchema.parse(gameJson), mode: 'salvage', salvage: SalvageSchema.parse((gameJson as { salvage: unknown }).salvage) } as unknown as SalvageConfig;
const base = () => E.createInitialState(cfg as never, FIXTURE_NOW);

const nightRow = (g: SalvageGame) => cardOf(cfg, g, { kind: 'office', tab: 'rota' }, FIXTURE_NOW).rows.find((r) => r.id === 'night');

/** The hours the away pass applies to a ten-hour absence from `g` (its card's capS). */
function appliedH(g: SalvageGame): number {
  const out = awayPass(cfg, g, g.salvage.clock.highMs + 10 * 3600_000);
  return out.salvage.away!.capS / 3600;
}

function at(rung: number, beenAway: boolean): SalvageGame {
  const g = structuredClone(playedGame(cfg, 'm30', base(), FIXTURE_NOW)) as SalvageGame;
  g.salvage.ladder.rung = rung;
  g.salvage.beenAway = beenAway;
  g.salvage.away = null;
  g.salvage.owned = g.salvage.owned.filter((k) => k !== 'night');
  g.cash = 1e7;
  return g;
}

describe('desk2: the Night watch row (E33)', () => {
  it('the content holds the E33 keys and no old awayCap_h', () => {
    expect(cfg.salvage.awayCapByRung_h.length).toBeGreaterThan(0);
    expect('awayCap_h' in cfg.salvage).toBe(false);
  });
  for (const rung of [1, 2, 3]) {
    it(`rung ${rung}: the row's two durations equal what the away pass applies without and with the Night watch`, () => {
      const g = at(rung, true);
      const r = nightRow(g);
      expect(r).toBeTruthy();
      expect(r!.extra?.key).toBe('card.nightWatch');
      const args = r!.extra!.args as Record<string, { n: number }>;
      const without = appliedH(g);
      const withNight = appliedH({ ...g, salvage: { ...g.salvage, owned: [...g.salvage.owned, 'night'] } });
      expect(args.a.n).toBeCloseTo(without, 9);
      expect(args.b.n).toBeCloseTo(withNight, 9);
      expect(args.b.n - args.a.n).toBeCloseTo(cfg.salvage.nightWatch_h, 9);
      expect(args.a.n).toBe(cfg.salvage.awayCapByRung_h[Math.min(rung, cfg.salvage.awayCapByRung_h.length) - 1]);
    });
  }
  it('content written before E33 (awayCap_h [a, b]) reads as one rung at a, the Night watch adding b - a', () => {
    const { awayCapByRung_h: _r, nightWatch_h: _n, ...old } = (gameJson as { salvage: Record<string, unknown> }).salvage;
    const c = SalvageSchema.parse({ ...old, awayCap_h: [4, 6] });
    expect(c.awayCapByRung_h).toEqual([4]);
    expect(c.nightWatch_h).toBe(2);
    expect('awayCap_h' in c).toBe(false);
  });
  it('before any absence the row is not offered', () => {
    for (const rung of [1, 2, 3]) expect(nightRow(at(rung, false))).toBeUndefined();
    expect(nightRow(playedGame(cfg, 'fresh', base(), FIXTURE_NOW) as SalvageGame)).toBeUndefined();
  });
});
