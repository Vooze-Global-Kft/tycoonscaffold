/**
 * The Fitting Bay (docs/design/space-design.md section 5.1): modules are cards of `meta.cards`
 * that work only while fitted into a socket of their type. Three sockets in order Rig, Fleet, Dock.
 * Swap and remove are free and instant. Pure functions; the state shape is `loadout.sockets`.
 *
 * `fittedBonus(cfg, state, stat)` is the B(stat) of section 2.3: the sum of the fitted modules'
 * values for `stat` as a fraction (0.08 = +8 %), each capped by its module's `cap`. A module's value
 * is its card's percent from `cards.ts` (`meta.cardEffect` by rarity and level) / 100.
 */
import type { Card } from '../config/schema';
import { HAUL_SOCKETS, type HaulModule, type HaulModuleStat, type HaulSocket } from '../config/schema.haul';
import { cardPercent } from './cards';
import type { HaulConfig } from './haul/types';

/** The parts of the state the loadout reads and writes. */
export interface LoadoutState {
  cards: Record<string, { level: number; copies: number }>;
  loadout: { sockets: (string | null)[] };
}

/** Number of sockets in this version (section 5.1). */
export const SOCKET_COUNT = HAUL_SOCKETS.length;

/** The socket type of socket `i` (0 Rig, 1 Fleet, 2 Dock); null for an index that does not exist. */
export function socketType(i: number): HaulSocket | null {
  return Number.isInteger(i) && i >= 0 && i < SOCKET_COUNT ? HAUL_SOCKETS[i] : null;
}

/** The socket index of a socket type. */
export function socketIndex(type: HaulSocket): number {
  return HAUL_SOCKETS.indexOf(type);
}

/** The module entry of a card, or null when the card is not a module. */
export function moduleOf(cfg: HaulConfig, cardId: string): HaulModule | null {
  return cfg.haul.modules.find((m) => m.card === cardId) ?? null;
}

function cardOf(cfg: HaulConfig, cardId: string): Card | null {
  return cfg.meta.cards.find((c) => c.id === cardId) ?? null;
}

/** A fresh loadout: every socket empty. */
export function emptyLoadout(): { sockets: (string | null)[] } {
  return { sockets: HAUL_SOCKETS.map(() => null) };
}

/**
 * True when `cardId` may go into socket `i`: the card is a module of that socket's type and is owned
 * (level 1 or more). A card already fitted in the same socket also returns true.
 */
export function canFit(cfg: HaulConfig, state: LoadoutState, i: number, cardId: string): boolean {
  const type = socketType(i);
  const mod = moduleOf(cfg, cardId);
  if (!type || !mod || mod.socket !== type) return false;
  return (state.cards[cardId]?.level ?? 0) > 0 && cardOf(cfg, cardId) !== null;
}

/**
 * Fits `cardId` into socket `i` (replacing what was there), or empties it with null. A card can sit
 * in one socket only: fitting it elsewhere removes it from the old one. Returns the state unchanged
 * when the fit is not allowed.
 */
export function equip<S extends LoadoutState>(cfg: HaulConfig, state: S, i: number, cardId: string | null): S {
  if (!socketType(i)) return state;
  if (cardId !== null && !canFit(cfg, state, i, cardId)) return state;
  const sockets = normaliseSockets(state.loadout?.sockets).map((s) => (cardId !== null && s === cardId ? null : s));
  if (sockets[i] === cardId) return state;
  sockets[i] = cardId;
  return { ...state, loadout: { ...state.loadout, sockets } };
}

/** Socket list of the right length (missing entries null). */
export function normaliseSockets(sockets: unknown): (string | null)[] {
  const list = Array.isArray(sockets) ? sockets : [];
  return HAUL_SOCKETS.map((_, i) => (typeof list[i] === 'string' ? (list[i] as string) : null));
}

/** Value of a module as a fraction at the card's current level (0 when not owned), capped by its module cap. Fitted or not. */
export function moduleValue(cfg: HaulConfig, state: LoadoutState, cardId: string): number {
  const mod = moduleOf(cfg, cardId);
  const card = cardOf(cfg, cardId);
  if (!mod || !card) return 0;
  const v = cardPercent(cfg, card, state.cards[cardId]?.level ?? 0) / 100;
  const safe = Number.isFinite(v) && v > 0 ? v : 0;
  return mod.cap === null ? safe : Math.min(mod.cap, safe);
}

/** The fitted modules, socket by socket (only valid fits count; a module whose card was lost does nothing). */
export function fittedModules(cfg: HaulConfig, state: LoadoutState): { socket: number; card: string; module: HaulModule; value: number }[] {
  const out: { socket: number; card: string; module: HaulModule; value: number }[] = [];
  normaliseSockets(state.loadout?.sockets).forEach((cardId, i) => {
    if (!cardId || !canFit(cfg, state, i, cardId)) return;
    out.push({ socket: i, card: cardId, module: moduleOf(cfg, cardId)!, value: moduleValue(cfg, state, cardId) });
  });
  return out;
}

/** B(stat) of section 2.3: the summed value of fitted modules with this stat (0 when none). */
export function fittedBonus(cfg: HaulConfig, state: LoadoutState, stat: HaulModuleStat): number {
  let sum = 0;
  for (const f of fittedModules(cfg, state)) if (f.module.stat === stat) sum += f.value;
  return sum;
}
