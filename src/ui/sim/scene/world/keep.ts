/**
 * Keeps the drawings of every look the room uses alive for as long as the room is on screen.
 *
 * The art kit caches character drawings and frees idle ones when too many pile up. When many looks
 * change in one go (a venue change, a new uniform tier, the first frames after loading), new
 * drawings could be freed in the same commit that builds them, and Skia then draws a freed picture.
 * Claiming them here, while rendering, and letting go a moment after the room changes avoids that.
 */
import { useEffect, useMemo } from 'react';
import { resolveLook, type LookInput } from '../../art';
import { getCharacterArt, releaseCharacterArt, retainCharacterArt } from '../../art/characterArt';

export function useKeepLooks(looks: readonly LookInput[]): void {
  const key = looks.map((l) => JSON.stringify(resolveLook(l))).join('|');
  const arts = useMemo(() => {
    const list = looks.map((l) => getCharacterArt(resolveLook(l)));
    list.forEach(retainCharacterArt);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(
    () => () => {
      setTimeout(() => arts.forEach(releaseCharacterArt), 1500);
    },
    [arts],
  );
}
