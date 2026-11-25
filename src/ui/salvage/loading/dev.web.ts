/**
 * Web preview only (Metro takes ./dev.ts on phones): the loading animation's switches in the page
 * address, read once at load, for `?view=loading` and the game itself.
 * - `lt=2.1`: hold the clock at 2.1 s (a still frame); `lt=6` is in the calm loop.
 * - `ltitle=Scrap%20to%20Ingot`: another title on the plates (the game's title otherwise).
 * - `lrm=1` / `lrm=0`: reduced motion on / off.
 * - `lready=1`: the bakes count as done, so the gate parts (the review screen has no yard beneath).
 * - `lseen=1`: not the first launch (a tap skips to the end).
 * The frame lengths of the running animation are kept in `globalThis.__loadingFrames` (the last 600),
 * so a script can read the frame rate.
 */
import type { LoadingDev } from './dev';

function read(): LoadingDev {
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    if (!q) return { t: null, title: null, still: null, ready: false, seen: false };
    const t = q.get('lt');
    const n = t === null ? NaN : Number(t);
    const rm = q.get('lrm');
    return {
      t: Number.isFinite(n) && n >= 0 ? Math.min(600, n) : null,
      title: q.get('ltitle')?.slice(0, 60) ?? null,
      still: rm === '1' ? true : rm === '0' ? false : null,
      ready: q.get('lready') === '1',
      seen: q.get('lseen') === '1',
    };
  } catch {
    return { t: null, title: null, still: null, ready: false, seen: false };
  }
}

export const loadingDev: LoadingDev = read();

export function noteFrame(ms: number): void {
  'worklet';
  const g = globalThis as unknown as { __loadingFrames?: number[] };
  const a = g.__loadingFrames ?? (g.__loadingFrames = []);
  a.push(ms);
  if (a.length > 600) a.shift();
}
