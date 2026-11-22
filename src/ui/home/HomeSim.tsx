/**
 * PLACEHOLDER (to be replaced): the home tab of a sim game: the living scene, the stage strip,
 * the buy-amount row and the list of the selected stage.
 */
import { useWindowDimensions, View } from 'react-native';
import { BusinessesPanel } from '../components/Panels';
import { VenueScene } from '../sim/VenueScene';

export function HomeSim() {
  const { width, height } = useWindowDimensions();
  const sceneHeight = height >= 780 ? 300 : 220;
  return (
    <View style={{ flex: 1 }}>
      <VenueScene width={width} height={sceneHeight} />
      <View style={{ flex: 1 }}>
        <BusinessesPanel />
      </View>
    </View>
  );
}
