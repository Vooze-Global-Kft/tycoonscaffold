/**
 * Web preview only (Metro takes ./devOpen.ts on phones): open a card at load,
 * so each card can be looked at in the frozen states (the font scale: the hud's `?fontScale=`).
 * - `card=rack | office | partners | processBoard | stripper | bench | crucible | table | board | clipboard | away | deal`
 *   (a place's card, or the office at a tab);
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
  return { ref: { kind: 'place', place: v } };
}
