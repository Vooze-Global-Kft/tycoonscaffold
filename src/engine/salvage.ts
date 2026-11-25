/**
 * PLACEHOLDER rules of the salvage mode (the scrapyard): the ground work's test loop only
 * (docs/design/yard-ground.md). Standing next to a wreck for `loop.cutSeconds` cuts it into
 * `loop.pieces` pieces the worker carries (up to `loop.capacity`); standing next to the machine
 * unloads them one every `loop.unloadSeconds`, each paying `loop.pieceValue` of placeholder cash; a cut
 * wreck is whole again after `loop.respawnSeconds`. No designed rule, no tuned number: the rules
 * engineers replace this file, src/engine/salvage/ and src/engine/salvageMode.ts with the
 * specification's (docs/design/yard-design.md).
 *
 * Pure TypeScript, deterministic: time comes in as `dt` and the play clock (`stats.playSeconds`); no
 * React, no Math.random, no Date.now. The worker's position is an INPUT (the presence sample the screen
 * sends at most ten times a second, src/modes/salvage/actions.ts); the rules check its distance again.
 */
import type { GameConfig } from '../config/schema';
import type { SalvageProp } from '../config/schema.salvage';
import type { GameState } from './types';
import type { Presence, SalvageConfig, SalvageEvent, SalvageGame, SalvageState } from './salvage/types';

export type * from './salvage/types';

/** True for a config of mode "salvage" whose block was parsed (src/engine/salvageMode.ts `config`). */
export function isSalvage(cfg: GameConfig): cfg is SalvageConfig {
  return cfg.mode === 'salvage' && !!cfg.salvage && typeof (cfg.salvage as { loop?: unknown }).loop === 'object';
}

const NOBODY: Presence = { near: null, driving: false, moving: false, x: 0, y: 0 };

/** A fresh salvage state: every test wreck whole, nothing carried. */
export function freshSalvage(cfg: SalvageConfig): SalvageState {
  return {
    v: 1,
    carried: 0,
    wrecks: cfg.salvage.props.filter((p) => p.kind === 'wreck').map((p) => ({ id: p.id, cut: 0, cutAt: null })),
    presence: NOBODY,
    presenceAt: -1,
    unloadT: 0,
    unloaded: 0,
  };
}

export function createSalvage(cfg: SalvageConfig, base: GameState): SalvageGame {
  return { ...base, salvage: freshSalvage(cfg) };
}

const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);

/** A loaded save repaired against the config: unknown wrecks dropped, new ones whole. Throws on nothing readable (salvageMode catches). */
export function reconcileSalvage(cfg: SalvageConfig, base: GameState, raw: unknown): SalvageGame {
  const fresh = freshSalvage(cfg);
  const r = (raw as { salvage?: Partial<SalvageState> } | null)?.salvage;
  if (!r || r.v !== 1) return { ...base, salvage: fresh };
  const old = new Map((Array.isArray(r.wrecks) ? r.wrecks : []).map((w) => [w?.id, w]));
  return {
    ...base,
    salvage: {
      ...fresh,
      carried: Math.max(0, Math.min(cfg.salvage.loop.capacity, Math.floor(num(r.carried, 0)))),
      wrecks: fresh.wrecks.map((w) => {
        const o = old.get(w.id);
        if (!o) return w;
        const cut = Math.max(0, Math.min(1, num(o.cut, 0)));
        return { id: w.id, cut, cutAt: cut >= 1 ? num(o.cutAt, 0) : null };
      }),
      unloaded: Math.max(0, Math.floor(num(r.unloaded, 0))),
    },
  };
}

/** The state, with `salvage` made when a bare shared state (a test) has none. */
export function withSalvageFields(cfg: SalvageConfig, g: GameState): SalvageGame {
  const s = g as SalvageGame;
  return s.salvage ? s : createSalvage(cfg, g);
}

const propById = (cfg: SalvageConfig, id: string | null): SalvageProp | undefined => (id === null ? undefined : cfg.salvage.props.find((p) => p.id === id));

/** Distance from (x, y) to the edge of a prop's footprint, metres (0 inside). */
export function edgeDistance(p: SalvageProp, x: number, y: number): number {
  if (p.shape === 'circle') return Math.max(0, Math.hypot(x - p.x, y - p.y) - p.r);
  const dx = Math.max(0, Math.abs(x - p.x) - p.w / 2);
  const dy = Math.max(0, Math.abs(y - p.y) - p.d / 2);
  return Math.hypot(dx, dy);
}

/** Whether a presence sample really stands next to its prop (the rules repeat the screen's check, with a little slack). */
export function isNext(cfg: SalvageConfig, p: Presence): boolean {
  const prop = propById(cfg, p.near);
  if (!prop) return false;
  const body = p.driving ? cfg.salvage.truck.radius : cfg.salvage.worker.radius;
  return edgeDistance(prop, p.x, p.y) <= body + cfg.salvage.worker.reach + 0.5;
}

/** The screen's sample of where the worker stands (at most ten a second). Returns the same object when nothing changes. */
export function setPresence(cfg: SalvageConfig, g: SalvageGame, p: Presence): SalvageGame {
  const s = g.salvage;
  const at = g.stats.playSeconds;
  const moving = p.moving === true;
  const same = s.presence.near === p.near && s.presence.driving === p.driving && s.presence.moving === moving && s.presence.x === p.x && s.presence.y === p.y;
  if (same && at - s.presenceAt < cfg.salvage.loop.staleSeconds / 2) return g;
  return { ...g, salvage: { ...s, presence: { near: p.near, driving: p.driving, moving, x: p.x, y: p.y }, presenceAt: at } };
}

/** Advances the test loop by `dt` seconds (it adds `stats.playSeconds` itself, as the EngineMode contract says). */
export function advanceSalvage(cfg: SalvageConfig, g: SalvageGame, dt: number, events?: SalvageEvent[]): SalvageGame {
  const L = cfg.salvage.loop;
  const clock = g.stats.playSeconds + dt;
  const s = g.salvage;
  let carried = s.carried;
  let unloadT = s.unloadT;
  let unloaded = s.unloaded;
  let paid = 0;
  const fresh = clock - s.presenceAt <= L.staleSeconds;
  const p = fresh && isNext(cfg, s.presence) ? s.presence : NOBODY;
  const target = propById(cfg, p.near);
  let wrecks = s.wrecks;
  let changed = false;
  // Cut wrecks become whole again.
  if (wrecks.some((w) => w.cutAt !== null && clock - w.cutAt >= L.respawnSeconds)) {
    wrecks = wrecks.map((w) => {
      if (w.cutAt === null || clock - w.cutAt < L.respawnSeconds) return w;
      events?.push({ type: 'whole', wreck: w.id });
      return { id: w.id, cut: 0, cutAt: null };
    });
    changed = true;
  }
  // A wreck is cut only while the worker stands still beside it (walking past does not cut; moving again
  // pauses the cut, and it fades once the worker has left). Unloading at the machine needs no stop.
  if (target?.kind === 'wreck' && !p.driving && !p.moving && carried < L.capacity) {
    const i = wrecks.findIndex((w) => w.id === target.id);
    const w = wrecks[i];
    if (w && w.cutAt === null) {
      const cut = Math.min(1, w.cut + dt / L.cutSeconds);
      const done = cut >= 1;
      const got = done ? Math.min(L.pieces, L.capacity - carried) : 0;
      wrecks = wrecks.slice();
      wrecks[i] = { id: w.id, cut, cutAt: done ? clock : null };
      if (done) {
        carried += got;
        events?.push({ type: 'cut', wreck: w.id, pieces: got });
      }
      changed = true;
    }
  } else if (target?.kind === 'machine' && carried > 0) {
    unloadT += dt;
    while (unloadT >= L.unloadSeconds && carried > 0) {
      unloadT -= L.unloadSeconds;
      carried--;
      unloaded++;
      paid += L.pieceValue;
      events?.push({ type: 'unload', value: L.pieceValue });
    }
    changed = true;
  } else if (unloadT !== 0) {
    unloadT = 0;
    changed = true;
  }
  // Walking away from a half-cut wreck lets its cut fade back (the ring empties): the test loop's choice.
  if (wrecks.some((w) => w.cutAt === null && w.cut > 0 && w.id !== target?.id)) {
    wrecks = wrecks.map((w) => (w.cutAt === null && w.cut > 0 && w.id !== target?.id ? { ...w, cut: Math.max(0, w.cut - dt / L.cutSeconds) } : w));
    changed = true;
  }
  const stats = { ...g.stats, playSeconds: clock };
  if (!changed) return { ...g, stats };
  return {
    ...g,
    cash: g.cash + paid,
    runEarnings: g.runEarnings + paid,
    lifetimeEarnings: g.lifetimeEarnings + paid,
    stats,
    salvage: { ...s, carried, unloadT, unloaded, wrecks },
  };
}

/** What the HUD shows: the carried stack and its capacity. */
export function carryLine(cfg: SalvageConfig, g: SalvageGame): { carried: number; capacity: number } {
  return { carried: g.salvage.carried, capacity: cfg.salvage.loop.capacity };
}
