// scratch diagnostic (deleted after use)
import { GameConfigSchema } from '../../src/config/schema';
import { withHaulContent } from '../../src/engine/haulMode';
import * as H from '../../src/engine/haul';
import { runHaulBot } from './haul-bot';
const raw = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'));
const cfg = withHaulContent(GameConfigSchema.parse(raw)) as H.HaulConfig;
const seed = Number(process.argv[3]);
const r1 = runHaulBot(cfg, { hours: 4, prestige: true, seed, noOffline: true });
const end1 = r1.runs[0].end!;
const r = runHaulBot(cfg, { hours: end1 / 3600, prestige: false, seed, noOffline: true });
const g = r.end;
const NOW = Date.UTC(2026, 10, 22, 12) + end1 * 1000;
let c = H.confirmJump(cfg, g, NOW);
for (const id of ['preload', 'assay', 'assay', 'assay', 'assay', 'assay', 'afterburner', 'seedcredits']) c = H.buyStarNode(cfg, c, id);
const offers = c.haulStats.pendingJump!.offers;
console.log('run1', end1, 'earn', g.runEarnings.toPrecision(3), 'offers', offers);
for (const tr of offers) {
  const s = H.startGalaxy(cfg, c, NOW, tr) as any;
  const p = runHaulBot(cfg, { hours: 2, prestige: false, start: s, now: NOW, noOffline: true });
  const reach = Object.values(p.states).length;
  let at = -1; // find time reaching run1 earnings via windows
  let acc = 0; for (const w of p.windows) { acc += w.earned; if (acc >= g.runEarnings) { at = w.from + 600; break; } }
  console.log(tr, 'start rate', H.haulIncome(cfg, s).toPrecision(3), 'earn 2h', p.end.runEarnings.toPrecision(3), 'reach ~', at, 'ratio', (at / end1).toFixed(2));
}
