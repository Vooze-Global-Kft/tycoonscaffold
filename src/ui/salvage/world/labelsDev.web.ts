/**
 * Web preview only (Metro takes ./labelsDev.ts on phones): the address switches of the world's labels
 * and effects (./WorldLayer.tsx), read once at load.
 * - `fontScale=1.3`: the labels as an iPhone with larger text draws them (the browser's own scale is 1);
 * - `fxdemo=work|sledge|torch|arcs|weigh|round|coin|pour|all`: that effect of ./effects.ts's table fires
 *   from made-up events given to the effects canvas only (the rules, the sounds and the store see
 *   nothing), 0.5 s after the loading curtain has parted and then every 4 s (`all`: each in turn); `1` = all.
 * - `idleDemo=1`: every yard hand and cutter wears a waiting tag (./IdleTags.tsx), the four reasons in turn,
 *   made up for the picture only (the rules see nothing).
 */
function read(): { fontScale: number | null; fxDemo: string | null; idleDemo: boolean } {
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    const f = Number(q?.get('fontScale'));
    return { fontScale: Number.isFinite(f) && f >= 0.8 && f <= 3 ? f : null, fxDemo: q?.get('fxdemo') === '1' ? 'all' : (q?.get('fxdemo') ?? null), idleDemo: q?.get('idleDemo') === '1' };
  } catch {
    return { fontScale: null, fxDemo: null, idleDemo: false };
  }
}

export const labelsDev = read();
