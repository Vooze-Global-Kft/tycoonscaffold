/**
 * Web preview only (`?view=yard-atlas`, src/modes/salvage/devViews.web.ts): the baked sprite atlas of
 * the active yard on a checker, with its size and density, to look at what the world draws.
 */
import { Canvas, Image, Rect } from '@shopify/react-native-skia';
import { ScrollView, Text, View } from 'react-native';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { useYardArt, yardFor } from './useYard';

export function AtlasView() {
  const cfg = useGame((s) => s.cfg);
  if (!R.isSalvage(cfg)) return <Text>not a salvage game</Text>;
  return <Sheet cfg={cfg} />;
}

function Sheet({ cfg }: { cfg: R.SalvageConfig }) {
  const yard = yardFor(cfg);
  const art = useYardArt(yard);
  const s = art?.sheet;
  if (!s) return <Text>baking...</Text>;
  const w = s.width / s.density;
  const h = s.height / s.density;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#222' }}>
      <Text style={{ color: '#fff', padding: 8 }}>{`atlas ${s.width} x ${s.height} px at density ${s.density}; ${s.names.length} sprites; baked in ${art.bakeMs} ms`}</Text>
      <View style={{ width: w, height: h }}>
        <Canvas style={{ width: w, height: h }}>
          <Rect x={0} y={0} width={w} height={h} color="#555" />
          <Image image={s.image} x={0} y={0} width={w} height={h} />
        </Canvas>
      </View>
    </ScrollView>
  );
}
