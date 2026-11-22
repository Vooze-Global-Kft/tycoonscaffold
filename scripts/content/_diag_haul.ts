// scratch diagnostic (deleted after use)
import { GameConfigSchema } from '../../src/config/schema';
import { withHaulContent } from '../../src/engine/haulMode';
import * as H from '../../src/engine/haul';
import { runHaulBot } from './haul-bot';
const raw = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'));
const cfg = withHaulContent(GameConfigSchema.parse(raw)) as H.HaulConfig;
const T = Number(process.argv[4]);
const r = runHaulBot(cfg, { hours: T / 3600 + 0.01, prestige: true, seed: Number(process.argv[3]), keepAt: [T], noOffline: true });
const g = r.states[T] as any;
const p = H.haulParams(cfg, g);
console.log('cash', g.cash.toPrecision(3), 'income', H.haulIncome(cfg, g).toPrecision(3), 'F', p.F.toPrecision(3), 'trait', g.haul.trait, 'drones', g.haul.fleet, 'cap', p.droneCap);
const lim = H.routeLimits(cfg, g); console.log(JSON.stringify(lim));
const before = H.haulIncome(cfg, g);
const opts: [string, number, any][] = [['drone', H.droneCost(cfg, g), (x: any) => H.buyDrone(cfg, x)], ['cap', H.capacityCost(cfg, g), (x: any) => H.buyCapacity(cfg, x)], ['eng', H.engineCost(cfg, g), (x: any) => H.buyEngine(cfg, x)], ['frt', H.freighterCost(cfg, g), (x: any) => H.buyFreighter(cfg, x)]];
g.haul.slots.forEach((s: any, i: number) => { if (s.claimed) opts.push([`rig${i} L${s.rigLevel} ${s.ore} n${s.haulers}`, H.rigCost(cfg, g, i), (x: any) => H.upgradeRig(cfg, x, i)]); else opts.push([`claim${i}`, H.claimCost(cfg, g, i), (x: any) => H.claimSlot(cfg, x, i)]); });
for (const [k, c, f] of opts) { if (!(c < Infinity)) continue; let n = f({ ...g, cash: c + 1 }); while (n.haul.idle > 0) { const b = H.bestSlotForDrone(cfg, n); if (b === null) break; n = H.assignDrone(cfg, n, b); } const gain = H.haulIncome(cfg, n) - before; console.log(k.padEnd(28), 'cost', c.toPrecision(3), 'gain', gain.toPrecision(3), 'payback s', (c / gain).toFixed(0)); }
g.haul.slots.forEach((s: any, i: number) => s.claimed && console.log('slot', i, s.ore, 'n', s.haulers, 'r', p.slots[i].r.toPrecision(3), 'h', p.slots[i].h.toPrecision(3), 'price', p.slots[i].price));
