/**
 * The safe area for the loading picture: the provider's insets when there is one (the app shell has
 * one; the preview's review screens do not), the preview's `insets=L,R,B` switch over them.
 */
import { useContext } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { yardSwitches } from '../dev/switches';
import type { Insets } from './layout';

export function useLoadingInsets(): Insets {
  const safe = useContext(SafeAreaInsetsContext);
  const dev = yardSwitches.insets;
  const top = safe?.top ?? 0;
  const left = dev ? dev.left : safe?.left ?? 0;
  const right = dev ? dev.right : safe?.right ?? 0;
  const bottom = dev ? dev.bottom : safe?.bottom ?? 0;
  return { top, left, right, bottom };
}
