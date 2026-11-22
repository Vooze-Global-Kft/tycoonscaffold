/**
 * The "art:<name>" icon registry: names and how to get each one's still drawing. No drawings
 * here: the active mode's entry registers its icons at install (src/modes/contract.ts), so a
 * game's bundle holds only the icons its mode draws. ArtIcon (./ArtIcon.tsx) turns a drawing into
 * a cached image.
 */
import type { SkPicture } from '@shopify/react-native-skia';

export interface ArtIconArt {
  pic: SkPicture;
  /** What the drawing covers, in its own units. */
  box: { l: number; t: number; r: number; b: number };
}

/** Records an icon's still drawing (called once per name), or null when it cannot. */
export type ArtIconSource = () => ArtIconArt | null;

const SOURCES: Record<string, ArtIconSource> = {};

/** Icon drawings, recorded once and kept for the life of the app (a dozen small pictures; never freed, so no canvas can draw a freed one). */
const ICON_ART = new Map<string, ArtIconArt | null>();

/** The still drawing behind "art:<name>", or null when it cannot be recorded (the caller shows its fallback). */
export function artIconArt(name: string): ArtIconArt | null {
  if (ICON_ART.has(name)) return ICON_ART.get(name) ?? null;
  let out: ArtIconArt | null = null;
  try {
    const source = SOURCES[name];
    if (!source) return null;
    out = source();
  } catch {
    out = null;
  }
  ICON_ART.set(name, out);
  return out;
}

/** Adds a mode's "art:" icons (called once by its entry in src/modes, before anything draws). */
export function registerArtIcons(sources: Record<string, ArtIconSource>): void {
  Object.assign(SOURCES, sources);
}

/** Every "art:" name this game's bundle can draw: those its mode registered. */
export function artIconNames(): string[] {
  return Object.keys(SOURCES);
}

export function isArtIconName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(SOURCES, name);
}
