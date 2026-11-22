/**
 * Draws a part of the room that never moves ONCE into an image, so the canvas shows one image per
 * frame instead of replaying hundreds of vector paths. Re-made only when `key` changes (the room's
 * structure, its size, its colours).
 *
 * Skia's documented offscreen route: `drawAsPicture` records the element, an offscreen surface
 * rasterises it at the screen's pixel density, and `makeNonTextureImage` gives an image any canvas
 * can draw. On the web every GPU offscreen surface is a new WebGL context (browsers allow only a
 * few), so the web preview rasterises on a CPU surface instead: same picture, same image.
 *
 * Until the image is ready, or if it cannot be made, the hook returns null and the caller keeps
 * drawing the live vectors: nothing ever goes missing.
 */
import { Group, Skia, drawAsPicture, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { PixelRatio, Platform } from 'react-native';

export function useBakedImage(make: () => ReactElement, width: number, height: number, key: string, delayMs = 0): SkImage | null {
  const [baked, setBaked] = useState<{ key: string; image: SkImage } | null>(null);
  const makeRef = useRef(make);
  makeRef.current = make;
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const dpr = Math.max(1, Math.min(3, PixelRatio.get()));
      const w = Math.ceil(width * dpr);
      const h = Math.ceil(height * dpr);
      if (!(w > 0 && h > 0)) return;
      if (Platform.OS === 'web' && typeof location !== 'undefined' && location.search.includes('nobake')) return; // TEMP A/B
      try {
        const picture = await drawAsPicture(<Group transform={[{ scale: dpr }]}>{makeRef.current()}</Group>, Skia.XYWHRect(0, 0, w, h));
        if (cancelled) return;
        const surface = Platform.OS === 'web' ? Skia.Surface.Make(w, h) : Skia.Surface.MakeOffscreen(w, h);
        if (!surface) return;
        surface.getCanvas().drawPicture(picture);
        surface.flush();
        const image = surface.makeImageSnapshot().makeNonTextureImage();
        surface.dispose();
        picture.dispose();
        // The previous image is not freed here: a canvas may still draw it until React commits.
        if (!cancelled && image) setBaked({ key, image });
      } catch {
        // Keep drawing live.
      }
    };
    const id = setTimeout(run, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, width, height]);
  return baked && baked.key === key ? baked.image : null;
}
