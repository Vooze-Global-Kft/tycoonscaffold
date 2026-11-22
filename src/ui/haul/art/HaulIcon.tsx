/**
 * Draws one of this game's "art:" or "mach:" icons (icons.ts) as a cached image: a list of 30
 * icons costs 30 small images and no GPU surfaces (AGENTS.md: never one Skia canvas per row).
 * Any size from 12 to 128 pt, drawn at the device's pixel density. This is the haul mode's own
 * cache, so the haul bundle does not need the first game's art-icon cache (src/ui/art, family
 * "tabs" in scripts/lib/modes.js).
 *
 *   <HaulIcon name="art:ore-copper" size={24} />
 *
 * Fails safe: an unknown name or a failed surface shows `fallback` (or nothing), remembered.
 */
import { Skia } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { Image, PixelRatio, View, type StyleProp, type ViewStyle } from 'react-native';
import { HAUL_ICONS } from './icons';

const images = new Map<string, string>();
const IMAGES_MAX = 200;

/** A PNG data URI of icon `name` at `size` points ('' when it cannot be drawn). */
export function haulIconUri(name: string, size: number): string {
  const density = Math.min(3, Math.max(1, PixelRatio.get()));
  const key = `${name}|${size}|${density}`;
  const hit = images.get(key);
  if (hit !== undefined) return hit;
  let uri = '';
  try {
    const draw = Object.prototype.hasOwnProperty.call(HAUL_ICONS, name) ? HAUL_ICONS[name] : undefined;
    const px = Math.max(1, Math.ceil(size * density));
    const surface = draw ? Skia.Surface.Make(px, px) : null;
    if (draw && surface) {
      const c = surface.getCanvas();
      c.scale(px / size, px / size);
      c.translate(size / 2, size / 2);
      draw(c, size);
      surface.flush();
      const snap = surface.makeImageSnapshot();
      const data = snap.encodeToBase64();
      snap.dispose();
      if (data) uri = 'data:image/png;base64,' + data;
      surface.dispose();
    }
  } catch {
    uri = '';
  }
  images.set(key, uri);
  if (images.size > IMAGES_MAX) images.delete(images.keys().next().value as string);
  return uri;
}

export function HaulIcon({ name, size, fallback = null, style }: { name: string; size: number; fallback?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const uri = useMemo(() => haulIconUri(name, size), [name, size]);
  if (!uri) return <>{fallback}</>;
  return (
    <View style={[{ width: size, height: size, pointerEvents: 'none' }, style]}>
      <Image source={{ uri }} style={{ width: size, height: size }} />
    </View>
  );
}
