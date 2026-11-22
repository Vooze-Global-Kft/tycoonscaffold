/**
 * Sizes of the home shell (design sheet section 3). Two phone classes: the tall 390 x 844 kind and
 * the small 375 x 667 kind. Every height here is in points; the header, tab bar and home tab read
 * them so the zones always add up to the screen.
 */
import { useWindowDimensions } from 'react-native';

export interface HomeMetrics {
  compact: boolean;
  header: number;
  scene: number;
  strip: number;
  buyRow: number;
  row: number;
  tabBar: number;
  /** Smallest scene we accept when the list would otherwise show fewer than three rows. */
  minScene: number;
}

const TALL: HomeMetrics = { compact: false, header: 56, scene: 300, strip: 36, buyRow: 32, row: 76, tabBar: 56, minScene: 200 };
const SMALL: HomeMetrics = { compact: true, header: 48, scene: 220, strip: 32, buyRow: 28, row: 64, tabBar: 50, minScene: 170 };

/** A phone shorter than this (in points) gets the small layout. */
const COMPACT_BELOW = 760;

export function useHomeMetrics(): HomeMetrics {
  const { height } = useWindowDimensions();
  return height < COMPACT_BELOW ? SMALL : TALL;
}

/** Gap between list rows. */
export const ROW_GAP = 6;
