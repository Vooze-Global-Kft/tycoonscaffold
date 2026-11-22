/**
 * PLACEHOLDER (to be replaced by the living scene): the venue on screen, drawn and animated.
 * Contract: fills exactly `width` x `height`; hosts the venue chip (top-left) and the chest and
 * missions buttons (top-right) at the positions of the design sheet.
 */
import { Text, View } from 'react-native';
import { useGame } from '../../state/store';
import { ChestButton } from '../meta/chest/ChestButton';
import { VenueChip } from '../meta/empire/VenueChip';
import { MissionsButton } from '../meta/missions/MissionsButton';
import { useTheme } from '../theme';

export function VenueScene({ width, height }: { width: number; height: number }) {
  const t = useTheme();
  const ringBell = useGame((s) => s.ringBell);
  return (
    <View style={{ width, height, backgroundColor: t.c.backgroundAlt, overflow: 'hidden' }}>
      <Text style={{ position: 'absolute', left: 0, right: 0, top: height / 2 - 10, textAlign: 'center', color: t.c.textMuted }} onPress={ringBell}>
        scene placeholder (tap = ring the bell)
      </Text>
      <View style={{ position: 'absolute', left: 8, top: 8 }}>
        <VenueChip />
      </View>
      <View style={{ position: 'absolute', right: 60, top: 8 }}>
        <ChestButton />
      </View>
      <View style={{ position: 'absolute', right: 8, top: 8 }}>
        <MissionsButton />
      </View>
    </View>
  );
}
