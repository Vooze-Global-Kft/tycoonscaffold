/**
 * Who sits in the cab (the lead, 26 November; the owner's review, point 5: "I got in the truck then drove to
 * the farm ... nothing really happened", and the player's finding 11): the screen's cab flag IS the player's
 * getting in. A presence sample that says he is at the wheel seats him whenever the truck stands free, so the
 * truck the screen drives is always the truck the rules hook with. On the shipped content. Owner: the lead.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import { setPresence, stepOut } from './actions';
import { awayPass } from './away';
import { startGame } from './bot';
import { begin, finish, type Ctx } from './clock';
import { newCrew } from './crew';
import { pointOf } from './positions';
import type { SalvageConfig, SalvageEvent, SalvageGame } from './types';

const NOW = Date.UTC(2026, 10, 26, 9, 0, 0);
const RAW = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage;
const C: SalvageContent = SalvageSchema.parse(RAW);
const cfg = { mode: 'salvage', salvage: C } as unknown as SalvageConfig;
const park = pointOf(C, 'park');

/** A yard whose truck stands at the park; the boss on foot `dx` metres west of it, heard just now. */
function yard(dx: number, change?: (s: SalvageGame['salvage'], x: Ctx) => void): SalvageGame {
  const g = startGame(cfg, NOW);
  const x = begin(cfg, g, [], true);
  x.s.truck.owned = true;
  x.s.owned.push('truck');
  x.s.truck.x = park.x;
  x.s.truck.y = park.y;
  x.s.presence = { x: park.x - dx, y: park.y, driving: false, moving: false, standingFor: 1, heading: 0 };
  x.s.presenceAt = x.s.t;
  change?.(x.s, x);
  return finish(g, x);
}

const sample = (g: SalvageGame, x: number, y: number, driving: boolean, moving: boolean, ev?: SalvageEvent[], dt = 0.1): SalvageGame =>
  setPresence(cfg, g, { x, y, driving, moving, standingFor: moving ? 0 : 1, heading: 0 }, g.salvage.t + dt, ev);

describe('the cab flag seats the boss when the truck stands free', () => {
  it('a sample at the wheel seats him: the truck is his, it goes where the sample is, the screens hear enterTruck', () => {
    const ev: SalvageEvent[] = [];
    const g = sample(yard(1.5), park.x, park.y, true, true, ev);
    expect(g.salvage.truck.by).toBe('boss');
    expect(g.salvage.presence.driving).toBe(true);
    expect(g.salvage.act.kind).toBe('drive');
    expect(ev.filter((e) => e.type === 'enterTruck')).toHaveLength(1);
    const h = sample(g, park.x + 0.4, park.y - 0.2, true, true);
    expect(h.salvage.truck.x).toBeCloseTo(park.x + 0.4, 9);
    expect(h.salvage.truck.y).toBeCloseTo(park.y - 0.2, 9);
  });

  it('an act under way no longer keeps him on foot while the screen drives off (a pick-up ring beside the truck)', () => {
    const g0 = yard(1.5, (s) => {
      s.act = { kind: 'pickup', target: 'tray.hand_stripper', since: s.t, endsAt: s.t + 5 };
    });
    const g = sample(g0, park.x, park.y, true, true);
    expect(g.salvage.truck.by).toBe('boss');
    expect(g.salvage.act.kind).toBe('drive');
  });

  it('the door needs no re-arming for the flag: after Step out, a sample at the wheel seats him again', () => {
    const g0 = yard(1.5, (s) => {
      s.counts = { ...(s.counts ?? {}), 'truck:out': 1 };
    });
    // Without the flag he stays on foot beside it (the walk-in is armed only once he has walked away).
    expect(sample(g0, park.x - 1, park.y, false, false).salvage.truck.by).toBeNull();
    const g = sample(g0, park.x, park.y, true, false);
    expect(g.salvage.truck.by).toBe('boss');
    expect(g.salvage.counts?.['truck:out']).toBeUndefined();
  });

  it('a truck that is not free is not taken: not owned, on a trip, with the driver, still on its way in', () => {
    const cases: ((s: SalvageGame['salvage']) => void)[] = [
      (s) => {
        s.truck.owned = false;
      },
      (s) => {
        s.truck.trip = { phase: 'out' } as never;
      },
      (s) => {
        s.truck.by = 'driver';
      },
      (s) => {
        s.arriving = [...s.arriving, { item: 'truck', at: s.t + 20 } as never];
      },
    ];
    for (const change of cases) {
      const g0 = yard(6, change);
      const before = g0.salvage.truck.by;
      const ev: SalvageEvent[] = [];
      // Six metres from the truck, so the walk-in cannot be what seats him either.
      const g = sample(g0, park.x - 6, park.y, true, false, ev);
      expect(g.salvage.truck.by).toBe(before);
      expect(g.salvage.presence.driving).toBe(false);
      expect(ev.some((e) => e.type === 'enterTruck')).toBe(false);
    }
  });

  it('only at the door: a flag from farther off seats nobody and moves no truck (the attack, 26 November)', () => {
    // On foot 40 m from the parked truck, a sample that claims the wheel: the truck stays parked and nobody's.
    const g0 = yard(40);
    const ev: SalvageEvent[] = [];
    let g = sample(g0, park.x - 40, park.y, true, false, ev);
    for (let k = 0; k < 20; k++) g = sample(g, park.x - 40, park.y - k, true, true, ev);
    expect(g.salvage.truck.by).toBeNull();
    expect(g.salvage.truck.x).toBe(park.x);
    expect(g.salvage.truck.y).toBe(park.y);
    expect(g.salvage.presence.driving).toBe(false);
    expect(ev.some((e) => e.type === 'enterTruck')).toBe(false);
    // The place is clamped as any sample's (R7), and it is the clamped place that must be at the door: a
    // sample that names the truck's own place from 40 m off seats nobody either.
    const lie = sample(g0, park.x, park.y, true, false);
    expect(lie.salvage.truck.by).toBeNull();
    const reach = (C.truck.bossV ?? C.truck.v) * 0.1 + 3;
    expect(Math.hypot(lie.salvage.presence.x - (park.x - 40), lie.salvage.presence.y - park.y)).toBeLessThanOrEqual(reach + 1e-9);
  });

  it('the same sample twice is the same object, also when its cab flag cannot be honoured', () => {
    const g0 = yard(6, (s) => {
      s.truck.by = 'driver';
    });
    const a = setPresence(cfg, g0, { x: park.x - 6, y: park.y, driving: true, moving: false, standingFor: 1, heading: 0 }, g0.salvage.t + 0.1);
    const b = setPresence(cfg, a, { x: park.x - 6, y: park.y, driving: true, moving: false, standingFor: 1, heading: 0 }, a.salvage.t + 0.1);
    expect(b).toBe(a);
  });
});

describe('time away at the wheel', () => {
  const lane = { x: C.yard.width + 60, y: pointOf(C, 'gate').y };
  const atWheelOut = (driver: boolean, skip: boolean) =>
    yard(0, (s, x) => {
      s.truck.by = 'boss';
      s.truck.x = lane.x;
      s.truck.y = lane.y;
      s.presence = { x: lane.x, y: lane.y, driving: true, moving: false, standingFor: 5, heading: 2 };
      s.act = { kind: 'drive', target: null, since: s.t, endsAt: null };
      s.counts = { ...(s.counts ?? {}), played: 1 };
      if (driver) s.crew = [...s.crew, newCrew(x, 'driver', s.t)];
      if (skip) s.truck.skip = { partner: 'partnerFarm', slot: 0, contents: {}, mass_g: 1000, price: 0, trial: true, weighed: false } as never;
    });

  it('with a hired driver and a skip aboard the driver takes the truck home, and the boss rides with him (he is not left on the lane)', () => {
    const g0 = atWheelOut(true, true);
    const g = awayPass(cfg, g0, NOW + 2 * 3600_000);
    const start = pointOf(C, 'start');
    expect(g.salvage.truck.by).not.toBe('boss');
    expect(g.salvage.presence.x).toBeCloseTo(start.x, 9);
    expect(g.salvage.presence.y).toBeCloseTo(start.y, 9);
    expect(g.salvage.presence.x).toBeLessThanOrEqual(C.yard.width);
  });

  it('with nobody to take it the truck waits where he left it, free, and he with it', () => {
    const g0 = atWheelOut(false, false);
    const g = awayPass(cfg, g0, NOW + 2 * 3600_000);
    expect(g.salvage.truck.by).toBeNull();
    expect(g.salvage.truck.x).toBe(lane.x);
    expect(g.salvage.presence.x).toBe(lane.x);
    // Back at the phone the first sample (he is at the truck's place) seats him again: at the wheel, as he left.
    const back = setPresence(cfg, g, { x: lane.x, y: lane.y, driving: false, moving: false, standingFor: 0.1, heading: 2 }, g.salvage.t + 0.1);
    expect(back.salvage.truck.by).toBe('boss');
  });
});

describe('Step out as the screen sends it', () => {
  it('still at the wheel, then out: the truck stands where the screen stopped it, facing as it faced, and he is on foot', () => {
    let g = sample(yard(1.5), park.x, park.y, true, true);
    g = sample(g, park.x - 2, park.y - 3, true, true);
    // The screen's last word before the action: at the wheel, standing still, exactly here.
    g = sample(g, park.x - 2.2, park.y - 3.1, true, false, undefined, 0.02);
    const ev: SalvageEvent[] = [];
    const out = stepOut(cfg, g, { x: park.x - 2.2, y: park.y - 3.1, heading: 5 }, g.salvage.t + 0.01, ev);
    expect(ev.some((e) => e.type === 'refused')).toBe(false);
    expect(out.salvage.truck.by).toBeNull();
    expect(out.salvage.truck.x).toBeCloseTo(park.x - 2.2, 9);
    expect(out.salvage.truck.y).toBeCloseTo(park.y - 3.1, 9);
    expect(out.salvage.truck.heading).toBe(5);
    // On foot beside it (no flag): he is not seated again until he has walked away and back.
    const beside = sample(out, park.x - 2.2, park.y - 3.1 + C.truck.radius + C.worker.radius + 0.25, false, false);
    expect(beside.salvage.truck.by).toBeNull();
  });

  it('the truck is never set down somewhere else: a place far from where he sat is not taken (its heading is)', () => {
    let g = sample(yard(1.5), park.x, park.y, true, true);
    g = sample(g, park.x, park.y, true, false, undefined, 0.02);
    const out = stepOut(cfg, g, { x: 10, y: 10, heading: 3 }, g.salvage.t + 0.01);
    expect(out.salvage.truck.by).toBeNull();
    expect(out.salvage.truck.x).toBe(park.x);
    expect(out.salvage.truck.y).toBe(park.y);
    expect(out.salvage.truck.heading).toBe(3);
  });
});
