/**
 * Android back and the stick (H9, pure; tested in overlays.test.ts): a thumb that lands at the left edge
 * and drags right is Android's back gesture, so while a steering touch is held, or just after one ended or
 * was taken by the system, OverlayHost's back handler swallows back instead of closing a card or leaving.
 */

/** What this reads of world/stick.ts (passed in, so the rule runs without the native modules). */
export interface StickModule {
  stickHeld?: unknown;
  lastStickEndAt?: unknown;
  stick?: { value?: { on?: number } };
}

/** How long after a steering touch ended Android back is still taken for the stick's (H9). */
export const STICK_BACK_MS = 500;

/**
 * True while a finger steers or within STICK_BACK_MS of the last steering touch's end (H9). Reads
 * world/stick.ts `stickHeld()` and `lastStickEndAt()` (world-a's exports; until they exist, the stick's
 * shared value and no end time).
 */
export function steeringNow(nowMs: number, s: StickModule): boolean {
  const held = typeof s.stickHeld === 'function' ? !!(s.stickHeld as () => boolean)() : (s.stick?.value?.on ?? 0) > 0;
  if (held) return true;
  const end = typeof s.lastStickEndAt === 'function' ? Number((s.lastStickEndAt as () => number)()) : 0;
  return end > 0 && nowMs - end < STICK_BACK_MS;
}
