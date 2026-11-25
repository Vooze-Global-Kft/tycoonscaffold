/**
 * PLACEHOLDER ground: gravel tiles baked ONCE into a small image (2 x 2 tiles of `yard.tile` metres,
 * each a slightly different tone, with a faint joint line and a few specks), drawn as ONE textured
 * rectangle repeated over the whole yard (./YardView.tsx). The art package replaces the drawing; the
 * image-shader way of drawing it stays. Pure Skia; never freed (a mounted canvas may still draw it).
 */
import { Skia, type SkImage } from '@shopify/react-native-skia';
import { Platform } from 'react-native';
import { fill, shade, stroke } from './draw';
import type { YardLayout } from './yard';

export const GROUND = '#8C8577';

export interface GroundTile {
  image: SkImage;
  density: number;
  /** The image's size in points (two tiles each way). */
  w: number;
  h: number;
}

export function bakeGround(y: YardLayout, density: number): GroundTile | null {
  const tw = y.tile * y.ppm;
  const th = y.tile * y.ppm * y.tilt;
  const w = tw * 2;
  const h = th * 2;
  const pw = Math.max(1, Math.round(w * density));
  const ph = Math.max(1, Math.round(h * density));
  const surface = Platform.OS === 'web' ? Skia.Surface.Make(pw, ph) : (Skia.Surface.MakeOffscreen(pw, ph) ?? Skia.Surface.Make(pw, ph));
  if (!surface) return null;
  const c = surface.getCanvas();
  c.scale(pw / w, ph / h);
  const tones = [0, 0.05, -0.05, 0.02];
  for (let j = 0; j < 2; j++)
    for (let i = 0; i < 2; i++) {
      c.drawRect({ x: i * tw, y: j * th, width: tw, height: th }, fill(shade(GROUND, tones[j * 2 + i])));
      for (let k = 0; k < 9; k++) {
        const sx = i * tw + (((k * 53 + i * 17 + j * 29) % 97) / 97) * tw;
        const sy = j * th + (((k * 31 + i * 41 + j * 7) % 89) / 89) * th;
        c.drawCircle(sx, sy, 0.6 + (k % 3) * 0.5, fill(k % 2 ? shade(GROUND, -0.25) : shade(GROUND, 0.2)));
      }
      c.drawRect({ x: i * tw + 0.5, y: j * th + 0.5, width: tw - 1, height: th - 1 }, stroke(shade(GROUND, -0.12), 1, 0.6));
    }
  surface.flush();
  const snap = surface.makeImageSnapshot();
  const image = Platform.OS === 'web' ? snap : (snap.makeNonTextureImage() ?? snap);
  return { image, density, w, h };
}
