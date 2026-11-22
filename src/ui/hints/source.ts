/**
 * What the tutorial hand points at comes from the active mode, not from the shell: the mode's
 * entry (src/modes/<mode>) installs a hint source, and HintOverlay only asks it. A mode without
 * one has no tutorial hand. The list homes of the sim and classic modes share one source
 * (src/ui/home/hints.ts, the engine's guideHint plus the stage lists).
 */

export interface Hint {
  /** Stable id of the hint, which is also the target key of the control it is about. */
  key: string;
  /** Target keys from the control itself back to the chip or tab that leads to it (src/ui/hints/targets.ts). */
  route: string[];
  /** The list row that holds the control, when a list can scroll it into view; null otherwise. */
  row: string | null;
}

export interface HintSource<H extends Hint = Hint> {
  /** Every hint the mode would show now, most urgent first. Asked once a second; never throws. */
  ask(): H[];
  /**
   * A hook (called on every render of the hand, so always the same one): a test for route keys
   * that point at where the player already is, besides the current tab ("the stage chip you are on").
   */
  useIsHere?(): (key: string) => boolean;
  /** A new hint came first: called once per new hint (for example to switch a list to the one holding its control). */
  onNewHint?(hint: H): void;
  /** The hint's row exists but is scrolled out of view: scroll it in if that may happen now, and say whether it did. */
  reveal?(hint: H): boolean;
  /** Target keys (or key prefixes before ":") of drawings in the scene, with no label to keep clear of: the pointer taps their middle. */
  sceneKeys?: readonly string[];
  /** Target keys the pointer comes to from above (so it does not hide the control's name). */
  fromAboveKeys?: readonly string[];
}

let source: HintSource | null = null;

let installed = false;

/**
 * Called once by the mode entry's install (src/modes/contract.ts). The source must never change
 * afterwards: HintOverlay calls its `useIsHere` hook only when it has one, so another source would
 * change the overlay's hook order. A phone installs once; a hot reload in development may not.
 */
export function setHintSource(next: HintSource | null): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && installed && next !== source) console.warn('setHintSource: the hint source changed after install; reload the app (HintOverlay assumes it never changes).');
  installed = true;
  source = next;
}

export function hintSource(): HintSource | null {
  return source;
}
