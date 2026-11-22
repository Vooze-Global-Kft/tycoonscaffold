/**
 * The map's layout for the bay's overlays that the shell mounts without props (FloatingFeedback,
 * the hint layer's fallbacks): the same pure `fieldLayout` call as HaulShell's, from the same inputs,
 * so both always agree.
 */
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HaulConfig } from '../../../engine/haul';
import { useGame } from '../../../state/store';
import { fieldLayout, type FieldLayout } from '../layout';

export function useMapLayout(): FieldLayout {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cfg = useGame((s) => s.cfg) as HaulConfig;
  const trait = useGame((s) => (s.game as unknown as { haul?: { trait: string | null } | null }).haul?.trait ?? null);
  return useMemo(() => fieldLayout({ width, height, insets: { top: insets.top, bottom: insets.bottom } }, cfg, trait), [width, height, insets.top, insets.bottom, cfg, trait]);
}
