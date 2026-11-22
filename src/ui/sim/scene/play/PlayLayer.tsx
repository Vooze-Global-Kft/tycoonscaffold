/**
 * PLACEHOLDER (to be replaced): everything the player touches on the scene, laid over the world:
 * tap areas (stations, the bell, the floor), the skill button, the flying bonus, floating numbers,
 * and the three round buttons (venue, chest, missions).
 */
import { Pressable, View } from 'react-native';
import { useGame } from '../../../../state/store';
import { ChestButton } from '../../../meta/chest/ChestButton';
import { VenueChip } from '../../../meta/empire/VenueChip';
import { MissionsButton } from '../../../meta/missions/MissionsButton';
import type { SceneLayout } from '../../layout';
import { sceneBus } from '../bus';

export function PlayLayer({ layout }: { layout: SceneLayout }) {
  const ringBell = useGame((s) => s.ringBell);
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width: layout.width, height: layout.height }} pointerEvents="box-none">
      <Pressable
        style={{ position: 'absolute', left: layout.bell.x - 28, top: layout.bell.y - 28, width: 56, height: 56 }}
        onPress={() => {
          ringBell();
          sceneBus.emit({ type: 'bell' });
        }}
      />
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
