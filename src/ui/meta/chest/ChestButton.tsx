/**
 * PLACEHOLDER (to be replaced): the round chest button that sits on the scene (about 44 pt).
 * Claims a free chest when one is ready, else opens an owned one, else explains when the next comes.
 */
import { Pressable, Text } from 'react-native';
import { useGame } from '../../../state/store';
import { useTarget } from '../../hints/targets';
import { useTheme } from '../../theme';

export function ChestButton({ size = 44 }: { size?: number }) {
  const t = useTheme();
  const target = useTarget('openChest');
  const claim = useGame((s) => s.claimFreeChest);
  return (
    <Pressable {...target} onPress={claim} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.c.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.5 }}>🎁</Text>
    </Pressable>
  );
}
