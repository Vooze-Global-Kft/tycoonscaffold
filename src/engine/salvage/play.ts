/**
 * A scripted hand (tests, the cross-check against the numbers prototype, later the bots): the boss
 * walks at `walk` m/s in straight lines, sending a presence sample every tick as the screen does, and
 * stands still. Pure: the device time is advanced by the ticks it plays. Owner: rules-sim.
 */
import { setPresence } from './actions';
import { advanceSalvage } from './tick';
import type { SalvageConfig, SalvageEvent, SalvageGame } from './types';

export interface Hand {
  cfg: SalvageConfig;
  g: SalvageGame;
  /** Device time, epoch ms (advanced with every tick). */
  now: number;
  events: SalvageEvent[];
  /** Tick length, seconds (0.1 as the shell). */
  dt: number;
  standing: number;
}

export function hand(cfg: SalvageConfig, g: SalvageGame, now: number, dt = 0.1): Hand {
  return { cfg, g, now, events: [], dt, standing: 0 };
}

function sample(h: Hand, x: number, y: number, moving: boolean, driving = false): void {
  h.g = setPresence(h.cfg, h.g, { x, y, moving, driving, standingFor: moving ? 0 : h.standing, heading: 0 }, h.g.salvage.t, h.events);
}

function step(h: Hand): void {
  h.now += h.dt * 1000;
  h.g = advanceSalvage(h.cfg, h.g, h.dt, h.now, h.events);
}

/** Walk (or drive, at `speed`) to (x, y) in straight steps, a sample before every tick. */
export function walkTo(h: Hand, x: number, y: number, speed = h.cfg.salvage.walk): void {
  const driving = h.g.salvage.truck.by === 'boss';
  for (let guard = 0; guard < 100_000; guard++) {
    const p = h.g.salvage.presence;
    const d = Math.hypot(x - p.x, y - p.y);
    const stepM = speed * h.dt;
    h.standing = 0;
    if (d <= stepM) {
      sample(h, x, y, false, driving);
      return;
    }
    sample(h, p.x + ((x - p.x) * stepM) / d, p.y + ((y - p.y) * stepM) / d, true, driving);
    step(h);
  }
}

/** Stand still for `seconds` (samples every tick, standingFor growing). */
export function stand(h: Hand, seconds: number): void {
  const n = Math.round(seconds / h.dt);
  const p = h.g.salvage.presence;
  for (let i = 0; i < n; i++) {
    sample(h, p.x, p.y, false, h.g.salvage.truck.by === 'boss');
    step(h);
    h.standing += h.dt;
  }
}

/** Stand until a condition holds (or `max` seconds). Returns true when it held. */
export function standUntil(h: Hand, cond: (g: SalvageGame) => boolean, max = 600): boolean {
  const n = Math.round(max / h.dt);
  const p = h.g.salvage.presence;
  for (let i = 0; i < n; i++) {
    if (cond(h.g)) return true;
    sample(h, p.x, p.y, false, h.g.salvage.truck.by === 'boss');
    step(h);
    h.standing += h.dt;
  }
  return cond(h.g);
}

/** Tick with no presence samples (the app backgrounded: the sample goes stale, no boss). */
export function idleTicks(h: Hand, seconds: number): void {
  const n = Math.round(seconds / h.dt);
  for (let i = 0; i < n; i++) step(h);
}
