import { Image, Text } from 'react-native';
import { gameAssets } from '../../config/game';

/**
 * Every icon in game.json is either an emoji ("🍕") or "asset:<key>" pointing
 * into the game's assets map. Emoji let you ship a new theme with zero art;
 * swap in images later for a more polished look.
 */
export function GameIcon({ icon, size = 32 }: { icon: string; size?: number }) {
  if (icon.startsWith('asset:')) {
    const src = gameAssets[icon.slice(6)];
    if (src) return <Image source={src} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  return (
    <Text style={{ fontSize: size * 0.8, lineHeight: size, width: size, textAlign: 'center' }} allowFontScaling={false}>
      {icon}
    </Text>
  );
}
