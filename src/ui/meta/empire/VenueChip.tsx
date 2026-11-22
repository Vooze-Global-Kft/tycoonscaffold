/**
 * PLACEHOLDER (to be replaced): the chip on the scene that names the venue on screen and, once
 * there are two or more, opens the list to switch between them.
 */
import { Text, View } from 'react-native';
import { useGame } from '../../../state/store';
import { useTheme } from '../../theme';

export function VenueChip() {
  const t = useTheme();
  const name = useGame((s) => s.cfg.sim?.venues.find((v) => v.id === s.game.activeVenue)?.name ?? '');
  if (!name) return null;
  return (
    <View style={{ backgroundColor: t.c.surface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={[t.display, { color: t.c.text, fontSize: 13 }]}>{name}</Text>
    </View>
  );
}
