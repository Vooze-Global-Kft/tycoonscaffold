/**
 * The decree mode's icons for list rows, sheets, bars and shared screens (parts.Icon, GameIcon):
 * "art:" names (clubs, effects, ministries, monuments, buttons, products, props; icons.ts) and
 * "face:" names (the cast's busts and the players' portraits, drawn by faces/), each drawn once into
 * a small PNG and cached, so a list of 30 rows costs 30 small images and no GPU surface (AGENTS.md:
 * never one Skia canvas per row). Any size from 12 to 160 pt at the device's pixel density. Unknown
 * names show `fallback` (or nothing), remembered.
 *
 *   <DecreeIcon icon="art:club_veg" size={32} />
 *   <DecreeIcon icon="face:gourdley" size={44} />
 */
import { Skia } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { Image, PixelRatio, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ModeIconProps } from '../../modeParts';
import { resolveDecreeIcon } from './icons';

const images = new Map<string, string>();
const IMAGES_MAX = 300;

/** The prefixes this kit answers (parts.iconPrefixes). */
export const DECREE_ICON_PREFIXES = ['art:', 'face:'] as const;

/** A PNG data URI of icon `name` at `size` points ('' when it cannot be drawn). */
export function decreeIconUri(name: string, size: number): string {
  const density = Math.min(3, Math.max(1, PixelRatio.get()));
  const key = `${name}|${size}|${density}`;
  const hit = images.get(key);
  if (hit !== undefined) return hit;
  let uri = '';
  try {
    const draw = resolveDecreeIcon(name);
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

/** Draws and caches `names` at `size` ahead of time (call when a sheet is about to open), so a long list does not stall its first frame. */
export function warmDecreeIcons(names: readonly string[], size: number): void {
  for (const n of names) decreeIconUri(n, size);
}

export function DecreeIcon({ icon, size, fallback = null, style }: ModeIconProps & { fallback?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const uri = useMemo(() => decreeIconUri(icon, size), [icon, size]);
  if (!uri) return <>{fallback}</>;
  return (
    <View style={[{ width: size, height: size, pointerEvents: 'none' }, style]}>
      <Image source={{ uri }} style={{ width: size, height: size }} />
    </View>
  );
}

export default DecreeIcon;
