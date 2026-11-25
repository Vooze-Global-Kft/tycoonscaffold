/**
 * The yard on screen: ONE full-bleed Skia canvas: the outside colour, the yard's floor (one rectangle with
 * the baked slab tile repeated, moved and zoomed by the camera) and the frame loop's picture (./frameLoop.ts:
 * ground decals, actors' shadows, then everything that stands or walks, depth-sorted and drawn in runs of
 * the same atlas sheet). It is drawn under the notch and the home indicator; the controls never are
 * (../SalvageShell.tsx). Touches belong to the input view over it.
 */
import { Canvas, Fill, FilterMode, Group, ImageShader, MipmapMode, Picture, Rect } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import type { YardAnim } from './frameLoop';
import { GROUND } from './ground';
import type { YardArt } from './useYard';
import type { YardLayout } from './yard';

const OUTSIDE = '#3A3631';

export function YardView({ yard, art, anim }: { yard: YardLayout; art: YardArt | null; anim: YardAnim }) {
  const ground = art?.ground ?? null;
  const shader = ground ? [{ scale: 1 / ground.density }] : undefined;
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill color={OUTSIDE} />
      <Group transform={anim.ground}>
        <Rect x={0} y={0} width={yard.pxW} height={yard.pxH} color={GROUND}>
          {ground ? <ImageShader image={ground.image} tx="repeat" ty="repeat" transform={shader} sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.None }} /> : null}
        </Rect>
      </Group>
      <Picture picture={anim.pic} />
    </Canvas>
  );
}
