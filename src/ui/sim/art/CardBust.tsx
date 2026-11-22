/**
 * A cast member's code-drawn bust inside a Skia card's window (CARD_WINDOW, origin at its top
 * left): the sim mode's card portrait (installed by src/modes/sim; drawn by CardPortrait in
 * src/ui/meta/chest/Portrait.tsx). Moved there from Portrait.tsx unchanged.
 */
import { Group, Picture } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { useGame } from '../../../state/store';
import { CARD_WINDOW } from '../../art/props';
import { SILHOUETTE } from '../../meta/chest/Portrait';
import type { CardBustProps } from '../../modeParts';
import { bustMatrix } from './CharacterBust';
import { getBustArt, releaseBustArt, retainBustArt } from './characterArt';
import { resolveLook, type LookInput } from './looks';

export function CardBust({ id, silhouette }: CardBustProps) {
  const cast = useGame((s) => s.cfg.cast);
  const look = (cast[id] as LookInput) ?? id;
  // An outline weight no list icon uses, so these drawings are never shared with (and freed by)
  // the small portraits elsewhere on screen while a card still draws them.
  const art = useMemo(() => getBustArt(resolveLook(look), 3.35), [look]);
  useEffect(() => {
    retainBustArt(art);
    return () => releaseBustArt(art);
  }, [art]);
  const size = CARD_WINDOW.height + 4;
  const m = useMemo(() => {
    const b = bustMatrix(art.bounds, size, 1);
    b[2] += (CARD_WINDOW.width - size) / 2;
    b[5] += CARD_WINDOW.height - size + 2;
    return b;
  }, [art, size]);
  return (
    <Group layer={silhouette ? SILHOUETTE : undefined}>
      <Picture picture={art.base} matrix={m} />
      {art.eyes && !silhouette ? <Picture picture={art.eyes} matrix={m} /> : null}
    </Group>
  );
}

