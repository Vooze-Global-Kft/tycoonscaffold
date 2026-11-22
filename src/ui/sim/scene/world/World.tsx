/**
 * PLACEHOLDER (to be replaced): the drawn, animated venue: room, stations and their workers, the
 * counter, transport workers, seats and guests, the door. Draws only; taps belong to the play layer.
 */
import { Text, View } from 'react-native';
import { useTheme } from '../../../theme';
import type { SceneLayout } from '../../layout';

export function World({ layout }: { layout: SceneLayout }) {
  const t = useTheme();
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width: layout.width, height: layout.height, backgroundColor: t.c.backgroundAlt }}>
      <Text style={{ position: 'absolute', left: 0, right: 0, top: layout.height / 2 - 10, textAlign: 'center', color: t.c.textMuted }}>world placeholder</Text>
    </View>
  );
}
