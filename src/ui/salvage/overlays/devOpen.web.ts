/**
 * Web preview only (Metro takes ./devOpen.ts on phones): open a card at load,
 * so each card can be looked at in the frozen states (the font scale: the hud's `?fontScale=`).
 * - `card=rack | office | partners | processBoard | stripper | bench | crucible | table | board | clipboard | away | deal`
 *   (a place's card, or the office at a tab); `card=skip | rung | settings | help | bay:<grade>` (the market's
 *   cards: the farm's skip, the rung-2 sign, settings, help, a bay's card = the board at that grade's row);
 * - `cardAt=<ms>`: open it that long after load instead of 600 ms (e.g. after the away card has been closed).
 * - `counting=hold | run` (owner2-hud, item 2): once the curtain has parted, a return after `countingH` hours
 *   (default 3; a state in which something was done: ?preset=m15 or later): `hold` keeps the counting card on
 *   screen (the pass never runs), `run` runs it two frames later and the away card takes its place.
 */
import type { CardRef } from '../../../engine/salvage';
import type { OfficeTab } from './cardStack';

function query(): URLSearchParams | null {
  try {
    return typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  } catch {
    return null;
  }
}

/** How long after load the ?card= switch opens its card (ms). */
export function devCardDelay(): number {
  const n = Number(query()?.get('cardAt') ?? 600);
  return Number.isFinite(n) && n >= 0 ? n : 600;
}

export function devCard(): { ref: CardRef; tab?: OfficeTab } | null {
  const v = query()?.get('card');
  if (!v) return null;
  if (v === 'partners') return { ref: { kind: 'office', tab: 'partners' } };
  if (v === 'processBoard') return { ref: { kind: 'processBoard' } };
  if (v === 'officeBoard') return { ref: { kind: 'office', tab: 'processBoard' } };
  if (v === 'table') return { ref: { kind: 'table' } };
  if (v === 'clipboard') return { ref: { kind: 'clipboard' } };
  if (v === 'away') return { ref: { kind: 'away' } };
  if (v === 'deal') return { ref: { kind: 'deal' } };
  if (v === 'board') return { ref: { kind: 'place', place: 'scalehouse' } };
  if (v === 'skip') return { ref: { kind: 'skip', partner: 'partnerFarm' } };
  if (v === 'rung') return { ref: { kind: 'rung', n: 2 } };
  if (v === 'settings') return { ref: { kind: 'settings' } };
  if (v === 'help') return { ref: { kind: 'help' } };
  if (v.startsWith('bay:')) return { ref: { kind: 'bay', grade: v.slice(4) } };
  return { ref: { kind: 'place', place: v } };
}

let counting: { mode: 'hold' | 'run'; hours: number } | null | undefined;

export function devCounting(): { mode: 'hold' | 'run'; hours: number } | null {
  if (counting !== undefined) return counting;
  const q = query();
  const v = q?.get('counting');
  const h = Number(q?.get('countingH') ?? 3);
  counting = v === 'hold' || v === 'run' ? { mode: v, hours: Number.isFinite(h) && h > 0 ? h : 3 } : null;
  return counting;
}
