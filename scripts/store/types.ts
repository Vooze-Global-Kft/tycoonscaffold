/**
 * Shared types and the store image sizes of the screenshot tool (scripts/store/shots.ts).
 * Sources of the sizes, read 2026-11-22: see scripts/store/README.md ("Sizes").
 */

/** A point in the preview's viewport, in CSS points (the game's own layout units). */
export type P = [number, number];

/** One input step on the running preview. */
export type Step =
  | { tap: P }
  | { down: P }
  | { move: P; steps?: number }
  | { up: true }
  | { drag: [P, P]; steps?: number }
  | { wait: number }
  | { key: string }
  /**
   * Waits until the page text matches `untilText` (or, with `absent`, no longer matches it): for a
   * moment the game reaches on its own clock, e.g. the freighter docking ("BACK IN n S" gone). The
   * text is the app's own DOM text (React Native web renders it as text). Fails the scene after
   * `timeout` ms (default 30000).
   */
  | { untilText: RegExp; absent?: boolean; timeout?: number };

export type SizeId = 'ios-6.9' | 'ios-6.5' | 'play-phone';

export interface Size {
  id: SizeId;
  /** Store image in pixels. */
  w: number;
  h: number;
  /** The phone the image stands for: viewport in points and its pixel ratio (w = vw × dsf, h = vh × dsf). */
  vw: number;
  vh: number;
  dsf: number;
  label: string;
}

/**
 * Every phone set. The game is captured at vw × vh points, the aspect of the store image, so the
 * picture is never stretched: the framed template scales it down whole, the full-bleed one uses it
 * 1:1.
 */
export const SIZES: Size[] = [
  // App Store Connect, "iPhone with Dynamic Island (large display)" (6.9"): 1320 x 2868 (iPhone 16/17 Pro Max class, 440 x 956 pt @3x).
  { id: 'ios-6.9', w: 1320, h: 2868, vw: 440, vh: 956, dsf: 3, label: 'iPhone 6.9"' },
  // App Store Connect, "iPhone with Face ID (large display)" (6.5"): 1284 x 2778 (428 x 926 pt @3x).
  { id: 'ios-6.5', w: 1284, h: 2778, vw: 428, vh: 926, dsf: 3, label: 'iPhone 6.5"' },
  // Google Play phone screenshot, 9:16 portrait, 1080 x 1920 (360 x 640 dp @3x).
  { id: 'play-phone', w: 1080, h: 1920, vw: 360, vh: 640, dsf: 3, label: 'Google Play phone 9:16' },
];

/** Google Play feature graphic. */
export const FEATURE = { w: 1024, h: 500 };

export interface View {
  size: Size;
  /** Viewport in points. */
  w: number;
  h: number;
}

export interface Scene {
  /** File name part, e.g. "drag-a-drone". */
  slug: string;
  /** The preview address after "?", e.g. "preset=mid&tab=staff". */
  query: string;
  /** Milliseconds to let the game load and settle before the steps (default 8000). */
  settle?: number;
  /** Input to reach the moment; the screenshot is taken right after the last step. */
  steps?: (v: View) => Step[];
  /** At most six words. */
  caption: string;
  /** One short line under the caption. */
  sub: string;
  /** What the scene shows and why it is true of the build (README). */
  shows: string;
  /** Template option: where the caption sits ("top" or "bottom"); each template has its own default. */
  place?: 'top' | 'bottom';
}

export interface GameScenes {
  game: string;
  /** Default preview port. */
  port: number;
  /** A word that must appear in the preview page's title, to catch the wrong game on the port. */
  titleHas: string;
  /** The scene (1-based) whose capture goes into the Play feature graphic (default 1). */
  featureScene?: number;
  scenes: Scene[];
}
