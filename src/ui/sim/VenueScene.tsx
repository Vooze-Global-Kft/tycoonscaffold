/**
 * The venue on screen: the animated world with the play layer on top. Both halves get the same
 * layout (src/ui/sim/layout.ts), so what is drawn and what can be tapped always line up.
 * Fills exactly `width` x `height`.
 */
import { useMemo } from 'react';
import { View } from 'react-native';
import { useGame } from '../../state/store';
import { MAX_SEATS_DRAWN, computeLayout } from './layout';
import { PlayLayer } from './scene/play/PlayLayer';
import { World } from './scene/world/World';

export function VenueScene({ width, height }: { width: number; height: number }) {
  const stationCount = useGame((s) => s.cfg.businesses.length);
  const seatCount = useGame((s) => Math.min(MAX_SEATS_DRAWN, s.game.venues[s.game.activeVenue]?.chain?.seats.length ?? 0));
  const layout = useMemo(() => computeLayout(width, height, stationCount, seatCount), [width, height, stationCount, seatCount]);
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <World layout={layout} />
      <PlayLayer layout={layout} />
    </View>
  );
}
