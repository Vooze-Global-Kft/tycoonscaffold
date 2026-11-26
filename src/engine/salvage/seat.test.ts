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
import { startGame } from './bot';
import { begin, finish } from './clock';
import { pointOf } from './positions';
import type { SalvageConfig, SalvageEvent, SalvageGame } from './types';

const NOW = Date.UTC(2026, 10, 26, 9, 0, 0);
const RAW = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage;
const C: SalvageContent = SalvageSchema.parse(RAW);
const cfg = { mode: 'salvage', salvage: C } as unknown as SalvageConfig;
const park = pointOf(C, 'park');

/** A yard whose truck stands at the park; the boss on foot `dx` metres west of it, heard just now. */
function yard(dx: number, change?: (s: SalvageGame['salvage']) => void): SalvageGame {
  const g = startGame(cfg, NOW);
  const x = begin(cfg, g, [], true);
  x.s.truck.owned = true;
  x.s.owned.push('truck');
  x.s.truck.x = park.x;
  x.s.truck.y = park.y;
  x.s.presence = { x: park.x - dx, y: park.y, driving: false, moving: false, standingFor: 1, heading: 0 };
  x.s.presenceAt = x.s.t;
  change?.(x.s);
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

  it('the flag moves him no faster than any sample: the place is clamped as before (R7)', () => {
    const g0 = yard(1.5);
    const far = { x: park.x - 40, y: park.y - 8 };
    const g = sample(g0, far.x, far.y, true, true);
    const reach = (C.truck.bossV ?? C.truck.v) * 0.1 + 3;
    expect(Math.hypot(g.salvage.presence.x - (park.x - 1.5), g.salvage.presence.y - park.y)).toBeLessThanOrEqual(reach + 1e-9);
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
});
