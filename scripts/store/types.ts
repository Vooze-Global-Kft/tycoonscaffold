/**
 * Shared types and the store image sizes of the screenshot tool (scripts/store/shots.ts).
 * Sources of the sizes, read 2026-11-22: see scripts/store/README.md ("Sizes").
 */

/** A point in the preview's viewport, in CSS points (the game's own layout units). */
export type P = [number, number];

/** One input step on the running preview. */
export type Step =
  | { tap: P }
  /** Taps the first element whose text matches (or the `nth`, from 0; e.g. a row's "x1.3"), wherever the layout put it. */
  | { tapText: RegExp; nth?: number }
  /** Scrolls the first element whose text matches into view (a scrolling panel on a short phone). */
  | { scrollTo: RegExp }
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

/**
 * A vertical position in the preview, in points: a number, or the top or bottom edge of the first
 * element whose text matches (looked up on the page at capture time, so it follows the layout).
 */
export type Y = number | { text: RegExp; edge: 'top' | 'bottom'; pad?: number };

/**
 * The part of the phone screen a store image must show (templates/frame.ts places it). The band
 * [y0, y1] is fitted to the template's picture box: scaled up to fill it, but never more than
 * `maxZoom` times the full-width scale (the sides are then cropped around `cx`); a band too tall
 * for the box at full width is shown whole with the box colour beside it. `anchor` says which end
 * of the band stays put when the box shows more than the band.
 */
export interface BandSpec {
  y0: Y;
  y1: Y;
  cx?: number;
  maxZoom?: number;
  anchor?: 'top' | 'bottom' | 'center';
  /** Never show the screen narrower than the box: a band too tall is cropped (from `anchor`), not shown whole. */
  crop?: boolean;
}

/** A band with its text positions resolved (stored next to the raw capture, for --reuse). */
export interface Band {
  y0: number;
  y1: number;
  cx?: number;
  maxZoom?: number;
  anchor?: 'top' | 'bottom' | 'center';
  crop?: boolean;
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
  /**
   * A test of the page text at the moment of the picture: returns what is wrong (the capture is
   * taken again, up to `tries` times in all), or null. For live state the scene does not control,
   * e.g. the same buyer twice on the Contract Board.
   */
  check?: (text: string) => string | null;
  /**
   * Milliseconds after the picture to read the page text again for `check` (default 0: the text
   * at the picture). For a moment whose result shows only a little later, e.g. the freighter's
   * "BACK IN n S" after the launch swipe.
   */
  checkAfter?: number;
  /** Captures in all when `check` fails (default 3). */
  tries?: number;
  /** The part of the screen the image shows (default: all of it). */
  frame?: (v: View) => BandSpec;
  /** At most six words. A "\n" is a chosen line break. */
  caption: string;
  /** One short line under the caption (the warm template only; the panel template has none). */
  sub?: string;
  /** What the scene shows and why it is true of the build (README). */
  shows: string;
}

export interface GameScenes {
  game: string;
  /** Default preview port. */
  port: number;
  /** A word that must appear in the preview page's title, to catch the wrong game on the port. */
  titleHas: string;
  /**
   * Pixel ratio of the raw capture as a multiple of the phone's (default 1). Above 1 when the
   * template zooms into a band, so the zoomed picture is drawn, not enlarged.
   */
  captureScale?: number;
  /** The Play feature graphic: which scene's capture (1-based) and which part of it. */
  feature: { scene: number; frame: (v: View) => BandSpec };
  scenes: Scene[];
}
