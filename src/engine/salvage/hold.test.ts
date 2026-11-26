/**
 * RULING2.md 14.6 (the attack on the engine step, finding 5; ECONOMY E40 as amended): HOLD SELLS ONLY WHAT
 * THE NEXT LOAD NEEDS, AND STAYS ON. The attacker's case on the real content as the bots play it: a day-1
 * yard, every bay held, the cash at §50, twelve hours away (the cap runs the yard for part of it). Before the
 * fix the rule took whole bays off Hold for good, on low days too, and the round then took every gram of
 * them. The three assertions of the ruling: the yard runs; every held bay is still held at the end; no more
 * was sold from hold than the loads' prices (within one 0.1 kg step a load, and the second skip a lot pays for:
 * bays.ts HOLD_SKIPS, the ruling's fallback). Owner: engine2-fixB.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import * as R from '../salvage';
import { awayPass } from './away';
import { away, newBot, playTo, seededCfg, startGame } from './bot';
import { HOLD_SKIPS } from './bays';
import { lineAmount } from './money';
import type { AwayCard, SalvageConfig, SalvageGame } from './types';

const NOW = Date.UTC(2026, 10, 25, 9, 0, 0);

/** The real content; `unbounded` lifts the bays' capacities (a held bay's grams over its capacity go to the round as the first yard's rule, 2.3: not "from hold"). */
function cfgOf(seed: number, unbounded = false): SalvageConfig {
  const raw = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8'));
  const c = SalvageSchema.parse(raw.salvage) as Record<string, unknown>;
  return seededCfg({ mode: 'salvage', salvage: unbounded ? { ...c, bays: {} } : c } as unknown as SalvageConfig, seed);
}

describe('Hold everything, cash §50, twelve hours away (the attacker’s case, 14.6)', () => {
  for (const seed of [31, 101]) {
    it(`seed ${seed}, day 1: the yard runs, every held bay stays held, only the loads’ prices are sold from hold`, () => {
      const cfg = cfgOf(seed);
      const b = newBot(cfg, startGame(cfg, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed });
      playTo(b, 3600);
      for (let k = 0; k < 2; k++) {
        away(b, 11.75 * 3600);
        playTo(b, b.g.salvage.t + 15 * 60);
      }
      let g = { ...b.g, lastSavedAt: b.g.salvage.clock.highMs } as SalvageGame;
      for (const gr of Object.keys(cfg.salvage.grades)) g = R.setHold(cfg, g, gr, true, g.salvage.t);
      const g0 = { ...g, cash: 50 } as SalvageGame;
      const held0 = Object.entries(g0.salvage.bays).filter(([, q]) => q.held).map(([gr]) => gr);
      expect(held0.length).toBeGreaterThan(3);
      // Measured with the bays' capacities lifted, so that every gram sold was set aside by the rule.
      const out = awayPass(cfgOf(seed, true), g0, g0.salvage.clock.highMs + 12 * 3600_000);
      const card = out.salvage.away as AwayCard & { heldSold?: string[] };
      // 1. The yard runs: loads bought and paid for from hold.
      expect(card.loads).toBeGreaterThan(10);
      expect(card.heldSold?.length ?? 0).toBeGreaterThan(0);
      // 2. Every held bay is still held at the end.
      for (const gr of held0) expect(out.salvage.bays[gr].held, gr).toBe(true);
      // 3. What was sold (every bay is held, so every lot came from hold) is at most the loads' prices plus
      //    one 0.1 kg step of the dearest grade a load (each lot covers one load's shortfall, rounded up).
      const sold = card.lines.reduce((a, l) => a + l.money, 0);
      let step = 0;
      for (const l of card.lines) step = Math.max(step, lineAmount(100, l.money / Math.max(1e-9, l.g / 1000)));
      // A lot pays for HOLD_SKIPS loads (the ruling's fallback, bays.ts): at most the last lot's extra loads unspent.
      const dearest = Math.max(0, ...(card.bought ?? []).map((q) => q.spent / Math.max(1, q.n)));
      expect(sold).toBeLessThanOrEqual(50 + (card.spent ?? 0) + (HOLD_SKIPS - 1) * dearest + card.loads * step + 0.01 * card.loads);
      // The rest of the held stock is still in the bays (Hold kept it), and nothing went below zero.
      expect(out.cash).toBeGreaterThanOrEqual(0);
    }, 600_000);
  }
});
