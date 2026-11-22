import { Image, Text } from 'react-native';
import { gameAssets } from '../../config/game';

/**
 * Every icon in game.json is either an emoji ("🍕") or "asset:<key>" pointing
 * into the game's assets map. Emoji let you ship a new theme with zero art;
 * swap in images later for a more polished look.
 */
export function GameIcon({ icon, size = 32, locked = false }: { icon: string; size?: number; locked?: boolean }) {
  if (icon.startsWith('asset:')) {
    const src = gameAssets[icon.slice(6)];
    // Locked art shows as a dark silhouette, a teaser for what's coming.
    if (src) {
      return <Image source={src} style={[{ width: size, height: size }, locked && { tintColor: '#00000055' }]} resizeMode="contain" />;
    }
  }
  if (locked) icon = '❔';
  return (
    <Text style={{ fontSize: size * 0.8, lineHeight: size, width: size, textAlign: 'center' }} allowFontScaling={false}>
      {icon}
    </Text>
  );
}
