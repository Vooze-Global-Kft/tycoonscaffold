/**
 * Web preview only (Metro takes ./labelsDev.ts on phones): the address switches of the world's labels
 * and effects (./WorldLayer.tsx), read once at load.
 * - `fontScale=1.3`: the labels as an iPhone with larger text draws them (the browser's own scale is 1);
 * - `fxdemo=1`: every effect of ./effects.ts's table fires once in turn near the boss, every 9 s, from
 *   made-up events given to the effects canvas only (the rules, the sounds and the store see nothing).
 */
function read(): { fontScale: number | null; fxDemo: boolean } {
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    const f = Number(q?.get('fontScale'));
    return { fontScale: Number.isFinite(f) && f >= 0.8 && f <= 3 ? f : null, fxDemo: q?.get('fxdemo') === '1' };
  } catch {
    return { fontScale: null, fxDemo: false };
  }
}

export const labelsDev = read();
