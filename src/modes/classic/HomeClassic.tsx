/**
 * The home tab of a classic game: the hero scene to tap, the buy-amount row and the business list.
 * It reuses the station rows of the sim home (in a classic game they are simply its businesses);
 * there is no stage strip because a classic game has only one stage. The chest and missions
 * buttons sit at the scene's top right, where the sim scene has them.
 */
import type { ComponentType } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ChestButton } from '../../ui/meta/chest/ChestButton';
import { MissionsButton } from '../../ui/meta/missions/MissionsButton';
import { SkiaScene } from '../../ui/scene/SkiaScene';
import { useTheme } from '../../ui/theme';
import { BuyAmountRow } from '../../ui/home/BuyAmountRow';
import { useHomeMetrics } from '../../ui/home/layout';
import { RowRegistry, useRowScroller } from '../../ui/home/rows';
import { StationList } from '../../ui/home/StationList';

/**
 * The three.js scene is loaded only by a game that asks for it, so every other game skips
 * evaluating three.js and expo-gl at launch.
 */
let threeScene: ComponentType | null = null;
function loadThreeScene(): ComponentType {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  threeScene ??= (require('../../ui/scene/ThreeScene') as typeof import('../../ui/scene/ThreeScene')).ThreeScene;
  return threeScene;
}

export function HomeClassic() {
  const t = useTheme();
  const m = useHomeMetrics();
  const Scene = t.scene === 'three' ? loadThreeScene() : SkiaScene;
  // Scroll a focused row into view (the tutorial hand pointing at a row below the fold).
  const { ref, registry } = useRowScroller('production');
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
      <RowRegistry.Provider value={registry}>
        <ScrollView ref={ref} style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <StationList rowHeight={m.row} compact={m.compact} />
        </ScrollView>
      </RowRegistry.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: 2 },
  roundButtons: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 8 },
  list: { paddingTop: 6, paddingBottom: 16 },
});
