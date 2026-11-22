import { Image, Text } from 'react-native';
import { gameAssets } from '../../config/game';
import { useGame } from '../../state/store';
import { ArtIcon } from '../art/ArtIcon';
import { modeParts } from '../modeParts';

/**
 * Every icon in game.json is one of:
 * - an emoji ("🍕"): ship a new theme with zero art;
 * - "asset:<key>": an image from the game's assets map;
 * - "char:<id>": a code-drawn character portrait, with the look from the game's top-level `cast`,
 *   drawn by the active mode (src/ui/modeParts.tsx; the sim mode draws its cartoon people: an id
 *   that is not in the cast still draws a built-in preset of that name, else a stable random
 *   person). A mode without portraits shows the unknown-icon fallback;
 * - "art:<name>": a code-drawn still from the art kit (src/ui/art/props.tsx): art:chest-wood,
 *   art:chest-silver, art:chest-gold (closed chests per tier), art:gem, art:coin, art:card-back,
 *   and the sim mode's own art:truffle, art:truffle-pile, art:truffle-basket, art:truffle-crate
 *   (growing piles for currency packs) and art:storefront (src/ui/sim/art/props.tsx). An unknown
 *   name shows the same fallback as an unknown asset.
 *
 * Portraits and art icons are cached images: a list of 30 costs 30 images, never 30 GPU surfaces.
 * Only the one or two big live portraits on screen (story dialog, card dialog) pass `render="canvas"`
 * to get their own blinking Skia canvas on phones.
 */
export function GameIcon({ icon, size = 32, locked = false, render = 'image' }: { icon: string; size?: number; locked?: boolean; render?: 'image' | 'canvas' }) {
  const cast = useGame((s) => s.cfg.cast);
  if (icon.startsWith('asset:')) {
    const src = gameAssets[icon.slice(6)];
    // Locked art shows as a dark silhouette, a teaser for what's coming.
    if (src) {
      return <Image source={src} style={[{ width: size, height: size }, locked && { tintColor: '#00000055' }]} resizeMode="contain" />;
    }
  }
  const { CharIcon, Icon: ModeIcon, iconPrefixes } = modeParts();
  if (ModeIcon && !locked && iconPrefixes?.some((p) => icon.startsWith(p))) return <ModeIcon icon={icon} size={size} />;
  if (icon.startsWith('char:') && !locked && CharIcon) {
    const id = icon.slice(5);
    return <CharIcon look={cast[id] ?? id} size={size} blink={size >= 40} render={render} />;
  }
  if (icon.startsWith('art:') && !locked) {
    return <ArtIcon name={icon.slice(4)} size={size} fallback={<Emoji icon="❔" size={size} />} />;
  }
  if (locked || icon.startsWith('char:') || icon.startsWith('asset:') || icon.startsWith('art:')) icon = '❔';
  return <Emoji icon={icon} size={size} />;
}

function Emoji({ icon, size }: { icon: string; size: number }) {
  return (
    <Text style={{ fontSize: size * 0.8, lineHeight: size, width: size, textAlign: 'center' }} allowFontScaling={false}>
      {icon}
    </Text>
  );
}
