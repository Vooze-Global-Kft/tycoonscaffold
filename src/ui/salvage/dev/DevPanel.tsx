/**
 * Phones: no development panel (the web preview takes ./DevPanel.web.tsx).
 */
import type { SharedValue } from 'react-native-reanimated';
import type { FrameStats } from '../world/frameLoop';

export function DevPanel(_: { stats: SharedValue<FrameStats>; top: number; left: number; atlas: string }) {
  return null;
}
