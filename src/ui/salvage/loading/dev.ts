/**
 * The loading animation's web-preview switches (./dev.web.ts); on phones none of them exists and
 * this twin answers "not set" (scripts/lib/modes.js WEB_ONLY lists the web file).
 */
export interface LoadingDev {
  /** Hold the clock at this many seconds (a still frame to look at). */
  t: number | null;
  /** Another title for the plates. */
  title: string | null;
  /** Reduced motion on or off, whatever the device says. */
  still: boolean | null;
  /** Treat the yard's bakes as done (the review screen has no yard), so the gate parts. */
  ready: boolean;
  /** Pretend this is not the first launch (a tap skips). */
  seen: boolean;
}

export const loadingDev: LoadingDev = { t: null, title: null, still: null, ready: false, seen: false };

/** Notes a frame's length for the preview's frame-rate check (phones: nothing). */
export function noteFrame(_ms: number): void {
  'worklet';
}
