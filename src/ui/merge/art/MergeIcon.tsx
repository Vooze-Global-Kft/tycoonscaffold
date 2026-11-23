/**
 * The merge mode's icons for list rows, sheets and shared screens (parts.Icon, spec 7.2): "beast:"
 * names (customers, minders, the dragon, the firefly) and "art:" names (goods, gear, props; see
 * icons.ts), each drawn once into a small PNG and cached, so a list of 30 icons costs 30 small
 * images and no GPU surface (AGENTS.md: never one Skia canvas per row). Any size from 12 to 128 pt,
 * at the device's pixel density. Unknown names show `fallback` (or nothing), remembered.
 *
 *   <MergeIcon icon="beast:badger" size={40} />
 */
import { Skia } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { Image, PixelRatio, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ModeIconProps } from '../../modeParts';
import { mergeIcons } from './icons';

const images = new Map<string, string>();
const IMAGES_MAX = 240;

/** A PNG data URI of icon `name` at `size` points ('' when it cannot be drawn). */
export function mergeIconUri(name: string, size: number): string {
  const density = Math.min(3, Math.max(1, PixelRatio.get()));
  const key = `${name}|${size}|${density}`;
  const hit = images.get(key);
  if (hit !== undefined) return hit;
  let uri = '';
  try {
    const all = mergeIcons();
    const draw = Object.prototype.hasOwnProperty.call(all, name) ? all[name] : undefined;
    const px = Math.max(1, Math.ceil(size * density));
    const surface = draw ? (Skia.Surface.Make(px, px) ?? Skia.Surface.MakeOffscreen(px, px)) : null;
    if (draw && surface) {
      const c = surface.getCanvas();
      c.clear(Skia.Color('#00000000'));
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

/**
 * Draws and caches `names` at `size` ahead of time (each icon costs about 7 ms on the JS thread the
 * first time): call it when a sheet or spoke is about to open (an effect on its open flag), so a
 * list of 30 rows does not stall its first frame.
 */
export function warmMergeIcons(names: readonly string[], size: number): void {
  for (const n of names) mergeIconUri(n, size);
}

export function MergeIcon({ icon, size, fallback = null, style }: ModeIconProps & { fallback?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const uri = useMemo(() => mergeIconUri(icon, size), [icon, size]);
  if (!uri) return <>{fallback}</>;
  return (
    <View style={[{ width: size, height: size, pointerEvents: 'none' }, style]}>
      <Image source={{ uri }} style={{ width: size, height: size }} />
    </View>
  );
}
