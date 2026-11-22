/**
 * The names an "art:<name>" icon may use: code-drawn stills from the art kit (src/ui/sim/art,
 * ART_ICON_NAMES in props.tsx). The schema lint lives outside the UI and cannot import Skia code,
 * so this is a copy; src/config/artIcons.test.ts fails when the two lists differ.
 */
export const ART_ICON_NAMES = [
  'chest-wood',
  'chest-silver',
  'chest-gold',
  'gem',
  'truffle',
  'truffle-pile',
  'truffle-basket',
  'truffle-crate',
  'coin',
  'card-back',
  'storefront',
] as const;

export function isArtIcon(name: string): boolean {
  return (ART_ICON_NAMES as readonly string[]).includes(name);
}
