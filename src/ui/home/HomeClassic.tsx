/**
 * The home tab of a classic game: the hero scene to tap, the buy-amount row and the business list.
 * It reuses the station rows of the sim home (in a classic game they are simply its businesses);
 * there is no stage strip because a classic game has only one stage. The chest and missions
 * buttons sit at the scene's top right, where the sim scene has them.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { ChestButton } from '../meta/chest/ChestButton';
import { MissionsButton } from '../meta/missions/MissionsButton';
import { SkiaScene } from '../scene/SkiaScene';
import { ThreeScene } from '../scene/ThreeScene';
import { useTheme } from '../theme';
import { BuyAmountRow } from './BuyAmountRow';
import { useHomeMetrics } from './layout';
import { StationList } from './StationList';

export function HomeClassic() {
  const t = useTheme();
  const m = useHomeMetrics();
  const Scene = t.scene === 'three' ? ThreeScene : SkiaScene;
  return (
    <View style={{ flex: 1 }}>
      <View>
        <Scene />
        <View pointerEvents="box-none" style={styles.roundButtons}>
          <ChestButton size={44} />
          <MissionsButton size={44} />
        </View>
      </View>
      <View style={[styles.bar, { backgroundColor: t.c.backgroundAlt }]}>
        <BuyAmountRow height={m.buyRow + 4} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <StationList rowHeight={m.row} compact={m.compact} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: 2 },
  roundButtons: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 8 },
  list: { paddingTop: 6, paddingBottom: 16 },
});
