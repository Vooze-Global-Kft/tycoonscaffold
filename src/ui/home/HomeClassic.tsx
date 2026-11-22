/** The home tab of a classic game: the hero scene to tap and the list of businesses under it. */
import { View } from 'react-native';
import { BusinessesPanel } from '../components/Panels';
import { SkiaScene } from '../scene/SkiaScene';
import { ThreeScene } from '../scene/ThreeScene';
import { useTheme } from '../theme';

export function HomeClassic() {
  const t = useTheme();
  const Scene = t.scene === 'three' ? ThreeScene : SkiaScene;
  return (
    <View style={{ flex: 1 }}>
      <Scene />
      <View style={{ flex: 1 }}>
        <BusinessesPanel />
      </View>
    </View>
  );
}
