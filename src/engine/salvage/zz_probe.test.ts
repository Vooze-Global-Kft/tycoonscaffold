import { it } from 'vitest';
import { appendFileSync } from 'node:fs';
const log = (...a: unknown[]) => appendFileSync('/tmp/claude-0/-home-user/f22d4cbe-c353-58da-a893-27d84a9b8342/scratchpad/yard/join2b/p/out.txt', a.join(' ') + '\n');
import { r4Game, worksCfg } from '../fixtures/salvage2works';
import { jump } from './tick';
import type { SalvageState, SalvageGame } from './types';
it('probe', () => {
  const cfg = worksCfg();
  const g0 = r4Game();
  const s = structuredClone(g0.salvage) as SalvageState;
  s.dropoff.nextAt = -1;
  for (const p of Object.values(s.partners)) p.open = false;
  s.truck.trip = null; s.truck.by = null; s.truck.earmark = null; s.lots.nextAt = null; s.presenceAt = -1;
  s.merchant = { phase: 'away', since: s.t, endsAt: s.t + 1e6, lot: [] };
  for (const grade of ['cbody', 'li', 'zorba', 'pbb', 'brs', 'bzs', 'alcast', 'alw', 'pbp']) {
    const b = (s.bays[grade] ??= { g: 0, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 });
    b.g += 40_000_000;
  }
  let h: SalvageGame = { ...g0, salvage: s };
  for (let k = 1; k <= 12; k++) {
    h = jump(cfg, h, s.t + k * 7200);
    const w = h.salvage.works;
    log(k * 2, 'cash', h.cash.toFixed(0), JSON.stringify(Object.fromEntries(['shredder', 'sorter', 'breaker', 'rotary', 'induction', 'smelter'].map((p) => [p, [h.salvage.counts?.['worked:' + p], w[p].status, w[p].work ? 1 : 0, w[p].heat?.phase]]))), 'bays', JSON.stringify(Object.fromEntries(['pbb', 'pbp', 'pp', 'zorba', 'shred', 'twitch', 'ss', 'cbody', 'li'].map((q) => [q, [h.salvage.bays[q]?.g, h.salvage.bays[q]?.reserved]]))), 'routes', JSON.stringify(h.salvage.routes));
  }
});
