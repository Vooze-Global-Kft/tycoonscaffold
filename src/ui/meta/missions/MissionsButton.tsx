/** PLACEHOLDER (to be replaced): the round missions button that sits on the scene (about 44 pt), with a dot when something can be claimed. */
import { Pressable, Text } from 'react-native';
import { useGame } from '../../../state/store';
import { useTarget } from '../../hints/targets';
import { useTheme } from '../../theme';

export function MissionsButton({ size = 44 }: { size?: number }) {
  const t = useTheme();
  const target = useTarget('missionsButton');
  const open = useGame((s) => s.openModal);
  return (
    <Pressable {...target} onPress={() => open({ type: 'missions' })} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.c.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.5 }}>📋</Text>
    </Pressable>
  );
}
