/**
 * "art:<name>" icons: still drawings the active mode registered (./icons.ts), shown as a cached image like the small portraits, so a list of them costs
 * images and no GPU surfaces. Any size from 16 to 96 pt, drawn at the device's pixel density.
 *
 *   <ArtIcon name="chest-gold" size={28} />
 *
 * Fails safe: if the drawing or the offscreen surface cannot be made, it shows `fallback`
 * (or nothing) and never tries again for that name and size.
 */
import { Skia } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { Image, PixelRatio, View, type StyleProp, type ViewStyle } from 'react-native';
import { artIconArt, isArtIconName } from './icons';

const images = new Map<string, string>();
const IMAGES_MAX = 200;

/** Draws `name` into a `size` x `size` PNG data URI ('' when it cannot be drawn). */
export function artIconImage(name: string, size: number): string {
  const density = Math.min(3, Math.max(1, PixelRatio.get()));
  const key = `${name}|${size}|${density}`;
  const hit = images.get(key);
  if (hit !== undefined) return hit;
  let uri = '';
  try {
    const art = isArtIconName(name) ? artIconArt(name) : null;
    const px = Math.max(1, Math.ceil(size * density));
    const surface = art ? Skia.Surface.Make(px, px) : null;
    if (art && surface) {
      const { l, t, r, b } = art.box;
      // A little air round the drawing so outlines never touch the edge.
      const pad = 0.04 * size;
      const k = (size - pad * 2) / Math.max(r - l, b - t);
      const c = surface.getCanvas();
      c.scale(px / size, px / size);
      c.translate(size / 2 - ((l + r) / 2) * k, size / 2 - ((t + b) / 2) * k);
      c.scale(k, k);
      c.drawPicture(art.pic);
      surface.flush();
      const snapshot = surface.makeImageSnapshot();
      const data = snapshot.encodeToBase64();
      snapshot.dispose();
      if (data) uri = 'data:image/png;base64,' + data;
    }
    surface?.dispose();
  } catch {
    // The surface may be left undisposed here; it is rare and small, and the result is remembered.
    uri = '';
  }
  images.set(key, uri);
  if (images.size > IMAGES_MAX) images.delete(images.keys().next().value as string);
  return uri;
}

export interface ArtIconProps {
  name: string;
  size: number;
  /** Shown when the name is unknown or the drawing cannot be made. */
  fallback?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ArtIcon({ name, size, fallback = null, style }: ArtIconProps) {
  const uri = useMemo(() => artIconImage(name, size), [name, size]);
  if (!uri) return <>{fallback}</>;
  return (
    <View style={[{ width: size, height: size, pointerEvents: 'none' }, style]}>
      <Image source={{ uri }} style={{ width: size, height: size }} />
    </View>
  );
}
