import { it } from 'vitest';
import { appendFileSync } from 'node:fs';
const log = (...a: unknown[]) => appendFileSync('/tmp/claude-0/-home-user/f22d4cbe-c353-58da-a893-27d84a9b8342/scratchpad/yard/join2b/p/out.txt', a.join(' ') + '\n');
import { shopCfg, shopGame } from '../fixtures/salvage2money';
import { jump } from './tick';
import { reconcileSalvage } from './save';
it('probe', () => {
  const cfg = shopCfg();
  let g = shopGame({ cash: 5_000 });
  g = { ...g, salvage: { ...g.salvage, presenceAt: g.salvage.t - 100, act: { kind: 'none', target: null, since: g.salvage.t, endsAt: null } } };
  g = jump(cfg, g, g.salvage.t + 1);
  const loaded = reconcileSalvage(cfg, { ...g, salvage: undefined } as never, JSON.parse(JSON.stringify(g)), g.salvage.clock.highMs);
  log('orig trip', JSON.stringify(g.salvage.truck.trip));
  log('load trip', JSON.stringify(loaded.salvage.truck.trip));
  log('t', g.salvage.t);
});
