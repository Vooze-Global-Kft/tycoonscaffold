/**
 * The portrait drawn inside a Skia card's window (the window is CARD_WINDOW, origin at its top
 * left). A "char:<id>" icon draws the code-drawn bust of that cast member; an "asset:<key>" icon
 * draws the image; anything else (an emoji) draws a stable person seeded from the card id, so a
 * staff card always shows someone. Only for the few big cards of the overlay and the card dialog:
 * lists use GameIcon, which never makes a canvas per row.
 */
import { Group, Image as SkImage, Picture, useImage } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { gameAssets } from '../../../config/game';
import { useGame } from '../../../state/store';
import { type LookInput, resolveLook } from '../../sim/art';
import { bustMatrix } from '../../sim/art/CharacterBust';
import { getBustArt, releaseBustArt, retainBustArt } from '../../sim/art/characterArt';
import { CARD_WINDOW } from '../../sim/art/props';

export function CardPortrait({ icon, fallbackId, silhouette = false }: { icon: string; fallbackId: string; silhouette?: boolean }) {
  const asset = icon.startsWith('asset:') ? gameAssets[icon.slice(6)] : undefined;
  if (asset) return <AssetPortrait source={asset} silhouette={silhouette} />;
  return <BustPortrait id={icon.startsWith('char:') ? icon.slice(5) : fallbackId} silhouette={silhouette} />;
}

function BustPortrait({ id, silhouette }: { id: string; silhouette: boolean }) {
  const cast = useGame((s) => s.cfg.cast);
  const look = (cast[id] as LookInput) ?? id;
  const art = useMemo(() => getBustArt(resolveLook(look), 3.4), [look]);
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
    <Group opacity={silhouette ? 0.18 : 1}>
      <Picture picture={art.base} matrix={m} />
      {art.eyes ? <Picture picture={art.eyes} matrix={m} /> : null}
    </Group>
  );
}

function AssetPortrait({ source, silhouette }: { source: number | string | object; silhouette: boolean }) {
  const image = useImage(source as Parameters<typeof useImage>[0]);
  if (!image) return null;
  const pad = 6;
  return (
    <SkImage
      image={image}
      x={pad}
      y={pad}
      width={CARD_WINDOW.width - pad * 2}
      height={CARD_WINDOW.height - pad}
      fit="contain"
      opacity={silhouette ? 0.18 : 1}
    />
  );
}
