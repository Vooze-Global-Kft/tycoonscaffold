/**
 * The yard on screen: ONE full-bleed Skia canvas drawn in two draw calls a frame, the ground (one
 * rectangle with the baked tile image repeated, moved by the camera) and every sprite (one `Atlas`
 * call, depth-sorted by the frame loop, ./frameLoop.ts), plus the fence round the yard. It is drawn
 * under the notch and the home indicator; the controls never are (../SalvageShell.tsx). Touches belong
 * to the input view over it.
 */
import { Atlas, Canvas, Fill, FilterMode, Group, ImageShader, MipmapMode, Rect } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import type { YardAnim } from './frameLoop';
import { GROUND } from './ground';
import type { YardArt } from './useYard';
import type { YardLayout } from './yard';

const OUTSIDE = '#3A3631';

export function YardView({ yard, art, anim }: { yard: YardLayout; art: YardArt | null; anim: YardAnim }) {
  const sheet = art?.sheet ?? null;
  const ground = art?.ground ?? null;
  const shader = ground ? [{ scale: 1 / ground.density }] : undefined;
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill color={OUTSIDE} />
      <Group transform={anim.ground}>
        <Rect x={0} y={0} width={yard.pxW} height={yard.pxH} color={GROUND}>
          {ground ? <ImageShader image={ground.image} tx="repeat" ty="repeat" transform={shader} sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.None }} /> : null}
        </Rect>
        <Rect x={-3} y={-3} width={yard.pxW + 6} height={yard.pxH + 6} style="stroke" strokeWidth={6} color="#5C544A" />
      </Group>
      {sheet ? <Atlas image={sheet.image} sprites={anim.rc} transforms={anim.xf} colors={anim.col} colorBlendMode="modulate" /> : null}
    </Canvas>
  );
}
