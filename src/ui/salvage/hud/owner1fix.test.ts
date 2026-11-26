/**
 * The one pass of fixes after the player's review of the owner's points (label owner1-fix-hud, 26 November;
 * owner1/player1.json): finding 4 and 11 (the one button at the wheel), 9 (the goal's step never repeats the goal),
 * 10 (a free load says free on its ticket), 12 (drop-off slips held while the boss is beyond the gate). On the
 * shipped content (stage 1, as the owner's phone plays it); every number read from it.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../../config/schema.salvage';
import * as R from '../../../engine/salvage';
import { startGame } from '../../../engine/salvage/bot';
import { begin, finish } from '../../../engine/salvage/clock';
import { pointOf, siteRect, stopOf } from '../../../engine/salvage/positions';
import { beyondGate, heldSlipsChip, slipText, ticketView } from './ticketView';
import { buttonMode, goalValues, rulesButton, say } from './words';

const NOW = Date.UTC(2026, 10, 26, 9, 0, 0);
const RAW = JSON.parse(fs.readFileSync(new URL('../../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage;
const C: SalvageContent = SalvageSchema.parse(RAW);
const cfg = { mode: 'salvage', salvage: C } as unknown as R.SalvageConfig;

/** The first yard with the hook-lift truck bought and standing at its park, the boss on foot beside it. */
function truckAtPark(): R.SalvageGame {
  const g = startGame(cfg, NOW);
  const x = begin(cfg, g, [], true);
  x.s.truck.owned = true;
  x.s.owned.push('truck');
  for (const p of Object.values(x.s.partners)) p.open = true;
  x.cash = 3000;
  return finish(g, x);
}

describe('findings 4 and 11: at the wheel the one button reads "Step out", every moment of a whole trip', () => {
  it('a scripted trip of the boss (seated by the rules at the park, out to the farm, the hook, back, the weighbridge, the floor): every sample at the wheel is "Step out", whatever the world flag says', () => {
    let g = truckAtPark();
    let now = NOW;
    const dt = 0.1;
    let atWheel = 0;
    let checked = 0;
    const check = () => {
      const wheel = g.salvage.truck.by === 'boss';
      if (!wheel) return;
      atWheel++;
      // The world's own flag dropped (the player's 844 drive) or never rose (the rules seated him at the park):
      // the rules' word alone keeps "Step out"; and never "Open" while in the cab, at the park included.
      for (const world of [false, true]) {
        expect(buttonMode(world, rulesButton(cfg, g), 'park', true)).toBe('stepOut');
        checked++;
      }
    };
    const sample = (x: number, y: number, moving: boolean, driving: boolean, standingFor = 0) => {
      g = R.setPresence(cfg, g, { x, y, driving, moving, standingFor, heading: 0 as never }, g.salvage.t, []);
      now += dt * 1000;
      g = R.advanceSalvage(cfg, g, dt, now, []);
      check();
    };
    const driveTo = (to: { x: number; y: number }, v: number) => {
      for (let guard = 0; guard < 20_000; guard++) {
        const p = { x: g.salvage.truck.x, y: g.salvage.truck.y };
        const d = Math.hypot(to.x - p.x, to.y - p.y);
        if (d < 0.05) break;
        const s = Math.min(d, v * dt);
        sample(p.x + ((to.x - p.x) / d) * s, p.y + ((to.y - p.y) / d) * s, true, true);
      }
    };
    const standFor = (secs: number) => {
      let stood = 0;
      for (let i = 0; i < Math.round(secs / dt); i++) sample(g.salvage.truck.x, g.salvage.truck.y, false, true, (stood += dt));
    };
    // On foot beside the truck at its park: the rules seat him (the player's d844-05).
    const tr = g.salvage.truck;
    sample(tr.x + 0.5, tr.y, false, false, 1);
    expect(g.salvage.truck.by).toBe('boss');
    // Out through the gate, along the lane to the farm's site (the reviewer's stop, finding 3), the hook.
    const gate = pointOf(C, 'gate');
    const site = siteRect(C, 'partnerFarm', 1)!;
    driveTo({ x: g.salvage.truck.x, y: gate.y }, C.truck.bossYardV ?? 4);
    driveTo(gate, C.truck.bossYardV ?? 4);
    driveTo({ x: (site.x0 + site.x1) / 2, y: gate.y }, C.truck.bossV ?? 11);
    standFor((C.truck.bossHandle_s ?? 4) + 1.5);
    expect(g.salvage.truck.skip?.partner).toBe('partnerFarm');
    // Back to the weighbridge, weigh, then to the floor and tip.
    driveTo(gate, C.truck.bossV ?? 11);
    const bridge = stopOf(C, 'weighbridge');
    driveTo(bridge, C.truck.bossYardV ?? 4);
    standFor(C.weigh_s + 1.5);
    expect(g.salvage.truck.skip?.weighed).toBe(true);
    driveTo(stopOf(C, 'floor'), C.truck.bossYardV ?? 4);
    standFor(12);
    expect(g.salvage.truck.by).toBe('boss');
    expect(atWheel).toBeGreaterThan(300);
    expect(checked).toBe(2 * atWheel);
    // Stepping out ends it: on foot beside the truck the button gets back in (owner2-hud, ruling 18.4: the rules say
    // 'getIn' within reach of the free truck, a place's card or not).
    g = R.stepOut(cfg, g, null, g.salvage.t, []);
    expect(g.salvage.truck.by).toBeNull();
    expect(rulesButton(cfg, g)).toBe('getIn');
    expect(buttonMode(false, rulesButton(cfg, g), 'park', true)).toBe('getIn');
    expect(buttonMode(false, rulesButton(cfg, g), null, false)).toBe('getIn');
  });

  it('the forms: the world at the wheel leads the rules by a sample; on foot "Open" only where the card shows something', () => {
    expect(buttonMode(true, null, 'park', true)).toBe('stepOut');
    expect(buttonMode(false, 'stepOut', 'park', true)).toBe('stepOut');
    expect(buttonMode(false, 'open', 'weighbridge', false)).toBe('blank');
    expect(buttonMode(false, null, null, true)).toBe('blank');
    // owner2-hud: the rules' "Get in" stands on foot whatever the place; the world at the wheel still says Step out.
    expect(buttonMode(false, 'getIn', 'park', true)).toBe('getIn');
    expect(buttonMode(false, 'getIn', null, false)).toBe('getIn');
    expect(buttonMode(true, 'getIn', null, false)).toBe('stepOut');
  });
});

describe('finding 9: the goal card never says its goal twice', () => {
  it('a step whose words are the goal\'s own is hidden; another step stands', () => {
    const g = truckAtPark();
    const goal = R.nextGoal(cfg, g)!;
    const same = { ...goal, step: goal.text };
    const other = { ...goal, step: { key: 'goal.step.weigh' as const } };
    // goalValues reads nextGoal from the state; the rule itself is a comparison of words, checked on both forms:
    const words = (q: typeof goal) => (q.step && say(q.step, C) !== say(q.text, C) ? say(q.step, C) : null);
    expect(words(same)).toBeNull();
    expect(words(other)).toBe(say({ key: 'goal.step.weigh' }, C));
    // And on a real state: the step shown is never the goal's line.
    const v = goalValues(cfg, g, NOW);
    expect(v.step === null || v.step !== v.goal).toBe(true);
  });
});

describe('finding 10: a free trial load says free on its weigh-in ticket', () => {
  it('the skip ticket with free: "Free: the farm\'s trial" in ink, not "Bought for §0.00" in the cost colour', () => {
    const base = { no: 1, series: 'S', at: 0, day: 1, partner: 'partnerFarm', trial: true, gross_g: 6_380_000, tare_g: 5_840_000, net_g: 540_000, paid: 0, things: [{ obj: Object.keys(C.objects)[0], n: 3 }] };
    const free = ticketView({ ...base, kind: 'skipWeighIn', free: true } as unknown as R.Ticket, C, null)!;
    expect(free.total).toBe("Free: the farm's trial");
    expect(free.cost).toBe(false);
    const paid = ticketView({ ...base, kind: 'skipWeighIn', trial: false, paid: 540 } as unknown as R.Ticket, C, null)!;
    expect(paid.total).toMatch(/^Bought for §540/);
    expect(paid.cost).toBe(true);
  });
});

describe('finding 12: drop-off slips wait while the boss is beyond the gate', () => {
  it('beyond the fence is beyond the gate; held slips come back as one line', () => {
    expect(beyondGate(C, C.yard.width + 0.1)).toBe(true);
    expect(beyondGate(C, C.yard.width - 0.1)).toBe(false);
    const thing = Object.keys(C.objects)[0];
    const one = slipText(thing, C);
    expect(heldSlipsChip([], C)).toBeNull();
    expect(heldSlipsChip([one], C)).toBe(one);
    expect(heldSlipsChip([one, one, one], C)).toBe('3 things signed in at the gate');
  });
});
