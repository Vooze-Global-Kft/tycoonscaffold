/**
 * Web preview only (`?view=yard-atlas`, src/modes/salvage/devViews.web.ts): the baked sheets the yard draws
 * (the manifest's A, B, G and the world's shadow sheet S) on a grey ground, with their size and density. C-WORLD-1: the
 * works' C and D follow when baked (stageOn(), rung 2 or more); unbaked they are not listed (the first yard's view as before).
 */
import { Canvas, Image, Rect } from '@shopify/react-native-skia';
import { ScrollView, Text, View } from 'react-native';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { SHEETS } from './actors';
import { useYardArt, yardFor } from './useYard';

export function AtlasView() {
  const cfg = useGame((s) => s.cfg);
  if (!R.isSalvage(cfg)) return <Text>not a salvage game</Text>;
  return <Sheets cfg={cfg} />;
}

function Sheets({ cfg }: { cfg: R.SalvageConfig }) {
  const art = useYardArt(yardFor(cfg));
  if (!art) return <Text>baking...</Text>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#222' }}>
      <Text style={{ color: '#fff', padding: 8 }}>{`baked in ${art.bakeMs} ms`}</Text>
      {art.sheets.map((s, i) =>
        !s && i >= 4 ? null : s ? (
          <View key={SHEETS[i]}>
            <Text style={{ color: '#fff', padding: 8 }}>{`sheet ${SHEETS[i]}: ${s.width} x ${s.height} px at density ${s.density}; ${s.rects.length / 6} cells`}</Text>
            <View style={{ width: s.width / s.density, height: s.height / s.density }}>
              <Canvas style={{ width: s.width / s.density, height: s.height / s.density }}>
                <Rect x={0} y={0} width={s.width / s.density} height={s.height / s.density} color="#555" />
                <Image image={s.image} x={0} y={0} width={s.width / s.density} height={s.height / s.density} />
              </Canvas>
            </View>
          </View>
        ) : (
          <Text key={SHEETS[i]} style={{ color: '#f88', padding: 8 }}>{`sheet ${SHEETS[i]}: not baked`}</Text>
        ),
      )}
    </ScrollView>
  );
}
