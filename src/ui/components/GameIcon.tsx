import { Image, Text } from 'react-native';
import { gameAssets } from '../../config/game';
import { useGame } from '../../state/store';
import { CharacterBust, type LookInput } from '../sim/art';

/**
 * Every icon in game.json is one of:
 * - an emoji ("🍕"): ship a new theme with zero art;
 * - "asset:<key>": an image from the game's assets map;
 * - "char:<id>": a code-drawn character portrait, with the look from the game's top-level `cast`
 *   (an id that is not in the cast still draws: a built-in preset of that name, else a stable
 *   random person).
 */
export function GameIcon({ icon, size = 32, locked = false }: { icon: string; size?: number; locked?: boolean }) {
  const cast = useGame((s) => s.cfg.cast);
  if (icon.startsWith('asset:')) {
    const src = gameAssets[icon.slice(6)];
    // Locked art shows as a dark silhouette, a teaser for what's coming.
    if (src) {
      return <Image source={src} style={[{ width: size, height: size }, locked && { tintColor: '#00000055' }]} resizeMode="contain" />;
    }
  }
  if (icon.startsWith('char:') && !locked) {
    const id = icon.slice(5);
    return <CharacterBust look={(cast[id] as LookInput) ?? id} size={size} blink={size >= 40} />;
  }
  if (locked || icon.startsWith('char:') || icon.startsWith('asset:')) icon = '❔';
  return (
    <Text style={{ fontSize: size * 0.8, lineHeight: size, width: size, textAlign: 'center' }} allowFontScaling={false}>
      {icon}
    </Text>
  );
}
