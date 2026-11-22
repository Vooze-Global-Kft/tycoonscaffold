/**
 * The portrait drawn inside a Skia card's window (the window is CARD_WINDOW, origin at its top
 * left). An "asset:<key>" icon draws the image. Anything else goes to the active mode's card bust
 * (src/ui/modeParts.tsx): in the sim mode a "char:<id>" icon draws the code-drawn bust of that
 * cast member and an emoji a stable person seeded from the card id, so a staff card always shows
 * someone; a mode without one leaves the window empty. Only for the few big cards of the overlay
 * and the card dialog: lists use GameIcon, which never makes a canvas per row.
 */
import { BlendColor, Group, Image as SkImage, Paint, useImage } from '@shopify/react-native-skia';
import { gameAssets } from '../../../config/game';
import { CARD_WINDOW } from '../../art/props';
import { modeParts } from '../../modeParts';

export function CardPortrait({ icon, fallbackId, silhouette = false }: { icon: string; fallbackId: string; silhouette?: boolean }) {
  const asset = icon.startsWith('asset:') ? gameAssets[icon.slice(6)] : undefined;
  if (asset) return <AssetPortrait source={asset} silhouette={silhouette} />;
  const CardBust = modeParts().CardBust;
  return CardBust ? <CardBust id={icon.startsWith('char:') ? icon.slice(5) : fallbackId} silhouette={silhouette} /> : null;
}

/**
 * A card not found yet: the person drawn as one flat dark shape (every drawn pixel takes this
 * colour), so the outline teases who it is without showing them. Drawn as a layer with a colour
 * filter, not with a low opacity (that would still show the colours, as a ghost).
 */
export const SILHOUETTE = (
  <Paint opacity={0.85}>
    <BlendColor color="#3A2416" mode="srcIn" />
  </Paint>
);

function AssetPortrait({ source, silhouette }: { source: number | string | object; silhouette: boolean }) {
  const image = useImage(source as Parameters<typeof useImage>[0]);
  if (!image) return null;
  const pad = 6;
  return (
    <Group layer={silhouette ? SILHOUETTE : undefined}>
    <SkImage
      image={image}
      x={pad}
      y={pad}
      width={CARD_WINDOW.width - pad * 2}
      height={CARD_WINDOW.height - pad}
      fit="contain"
    />
    </Group>
  );
}
