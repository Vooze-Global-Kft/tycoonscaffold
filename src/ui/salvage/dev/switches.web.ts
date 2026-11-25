/**
 * Web preview only (Metro takes ./switches.ts on phones): the yard's development switches in the page
 * address, read once at load.
 * - `dev=1`: show the development panel (./DevPanel.web.tsx); also on with `actors=` or `sprites=`.
 * - `actors=N`: N helpers walk (default: the config's count), to load the yard until it stutters.
 * - `sprites=N`: N extra crates on free ground (each one more sprite in the atlas draw).
 * - `insets=L,R,B`: pretend a phone's landscape safe-area insets (a notch on the left of 59 pt:
 *   `insets=59,0,21`; turned the other way: `insets=0,59,21`).
 */
import type { YardSwitches } from './switches';

function read(): YardSwitches {
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    if (!q) return { panel: false, actors: null, sprites: 0, insets: null };
    const int = (k: string, max: number) => {
      const v = q.get(k);
      if (v === null) return null;
      const n = Math.floor(Number(v));
      return Number.isFinite(n) && n >= 0 ? Math.min(max, n) : null;
    };
    const actors = int('actors', 200);
    const sprites = int('sprites', 600) ?? 0;
    const raw = q.get('insets')?.split(',').map(Number) ?? null;
    const insets = raw && raw.length === 3 && raw.every((x) => Number.isFinite(x) && x >= 0 && x < 200) ? { left: raw[0], right: raw[1], bottom: raw[2] } : null;
    return { panel: q.get('dev') === '1' || actors !== null || q.has('sprites'), actors, sprites, insets };
  } catch {
    return { panel: false, actors: null, sprites: 0, insets: null };
  }
}

export const yardSwitches: YardSwitches = read();
