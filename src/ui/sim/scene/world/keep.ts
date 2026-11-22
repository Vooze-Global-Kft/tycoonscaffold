/**
 * Keeps the drawings of every look the room uses alive for as long as the room is on screen.
 *
 * The art kit caches character drawings and frees idle ones when too many pile up. When many looks
 * change in one go (a venue change, a new uniform tier, the first frames after loading), new
 * drawings could be freed before the characters that draw them claim them. Claiming them here, in
 * a layout effect (before the canvas draws the commit), and letting go a moment after the room
 * changes avoids that. A set freed between render and the claim is fetched again.
 */
import { useLayoutEffect, useMemo, useState } from 'react';
import { resolveLook, type LookInput } from '../../art';
import { getCharacterArt, releaseCharacterArt, retainCharacterArt } from '../../art/characterArt';

export function useKeepLooks(looks: readonly LookInput[]): void {
  const key = looks.map((l) => JSON.stringify(resolveLook(l))).join('|');
  // Bumped when a set got during render was freed before it could be claimed.
  const [gen, setGen] = useState(0);
  const arts = useMemo(
    () => looks.map((l) => getCharacterArt(resolveLook(l))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, gen],
  );
  useLayoutEffect(() => {
    const held = arts.filter((a) => retainCharacterArt(a));
    if (held.length < arts.length) {
      // Some set was freed: let go of the rest at once and fetch fresh sets.
      held.forEach(releaseCharacterArt);
      setGen((g) => g + 1);
      return;
    }
    return () => {
      setTimeout(() => held.forEach(releaseCharacterArt), 1500);
    };
  }, [arts]);
}
