/**
 * The yard on screen: ONE full-bleed Skia canvas, back to front (findings P5 and L1: the running world is
 * the art director's picture, look/stage1/yard-844.png, art/proof.draw.ts drawHero):
 *   1. the ground OUTSIDE the fence (./ground.ts drawOffsite, a baked tile repeated): never a clear colour;
 *   2. the yard's floor from the back wall south: the proof's warm concrete (the baked slab tile repeated);
 *   3. in SCREEN space above the back wall's top: the late-day sky and the far yard (ground.ts bakeSky, baked
 *      once), moving at 0.3 of the camera; its foot hides under the wall's lock blocks (./dressing.ts);
 *   4. the frame loop's picture (./frameLoop.ts: decals, shadows, the depth-sorted sprites in atlas runs);
 *   5. the low sun as drawHero draws it: SUN_WASH, then one Multiply rectangle of SUN_MULTIPLY.
 * The bars, tickets and cards are other views over this one, so the light never tints them. Everything
 * here is two textured rectangles, one image and three plain rectangles a frame: nothing is drawn per frame
 * that could be baked. Touches belong to the input view over it; the controls are never drawn here.
 */
import { Canvas, FilterMode, Group, Image, ImageShader, LinearGradient, MipmapMode, Picture, Rect, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { SUN_MULTIPLY, SUN_WASH } from '../art/ground.draw';
import { YARD } from '../art/palette';
import { BLOCK_M, WALL_H, northOf } from './dressing';
import type { YardAnim } from './frameLoop';
import { GROUND, OFFSITE, SKY_HORIZON, SKY_PARALLAX, bakeOffsite, bakeSky } from './ground';
import { DENSITY, type YardArt } from './useYard';
import type { YardLayout } from './yard';

const SAMPLING = { filter: FilterMode.Linear, mipmap: MipmapMode.None } as const;
/** How far the off-site ground reaches past the yard on every side, metres. */
const BEYOND = 60;

export function YardView({ yard, art, anim }: { yard: YardLayout; art: YardArt | null; anim: YardAnim }) {
  const cfg = useGame((s) => s.cfg);
  const north = R.isSalvage(cfg) ? northOf(cfg.salvage) : 0.4;
  const { width: SW, height: SH } = useWindowDimensions();
  const ground = art?.ground ?? null;
  // baked once the yard's art is (Skia is up): the off-site tile and the far band
  const baked = useMemo(() => {
    if (!art) return null;
    try {
      return { off: bakeOffsite(yard, DENSITY), sky: bakeSky(yard, Math.max(SW, 932), DENSITY) };
    } catch (e) {
      console.warn('salvage: the far yard could not be baked', e);
      return null;
    }
    // the window's width only sizes the band once; a rotation does not re-bake it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art, yard]);
  const off = baked?.off ?? null;
  const sky = baked?.sky ?? null;
  const { ppm, tilt, lift, pxW, pxH } = yard;
  // the back wall: the concrete starts under it; the sky's horizon hides behind its top face
  const wallTop = north * ppm * tilt - WALL_H * ppm * lift;
  const floorY = (north - BLOCK_M / 2) * ppm * tilt;
  const xMax = pxW;
  const skyX = useDerivedValue(() => -SKY_PARALLAX * Math.max(0, Math.min(xMax, anim.camera.value.x)) - 20);
  const skyY = useDerivedValue(() => {
    const cam = anim.camera.value;
    return (wallTop - cam.y - SH / 2) * (cam.zoom > 0 ? cam.zoom : 1) + SH / 2 + 4 - SKY_HORIZON;
  });
  const skyTop = useDerivedValue(() => Math.max(0, skyY.value + 2));
  const x0 = -BEYOND * ppm;
  const y0 = floorY - BEYOND * ppm * tilt;
  const offW = Math.max(pxW, yard.drawW * ppm) + BEYOND * ppm * 2;
  const offH = pxH - y0 + BEYOND * ppm * tilt;
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group transform={anim.ground}>
        <Rect x={x0} y={y0} width={offW} height={offH} color={OFFSITE}>
          {off ? <ImageShader image={off.image} tx="repeat" ty="repeat" transform={[{ scale: 1 / off.density }]} sampling={SAMPLING} /> : null}
        </Rect>
        <Rect x={0} y={floorY} width={pxW} height={pxH - floorY} color={GROUND}>
          {ground ? <ImageShader image={ground.image} tx="repeat" ty="repeat" transform={[{ scale: 1 / ground.density }]} sampling={SAMPLING} /> : null}
        </Rect>
      </Group>
      <Rect x={0} y={0} width={SW} height={skyTop} color={YARD.sky} />
      {sky ? <Image image={sky.image} x={skyX} y={skyY} width={sky.w} height={sky.h} fit="fill" sampling={SAMPLING} /> : null}
      <Picture picture={anim.pic} />
      <Rect x={0} y={0} width={SW} height={SH}>
        <LinearGradient start={vec(0, 0)} end={vec(SW, 0)} colors={[...SUN_WASH.colors]} positions={[...SUN_WASH.stops]} />
      </Rect>
      <Rect x={0} y={0} width={SW} height={SH} blendMode="multiply">
        <LinearGradient start={vec(0, 0)} end={vec(SW, SH * 0.3)} colors={[...SUN_MULTIPLY.colors]} positions={[...SUN_MULTIPLY.stops]} />
      </Rect>
    </Canvas>
  );
}
