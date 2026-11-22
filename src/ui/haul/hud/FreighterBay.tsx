/** SKELETON (package "bay"). The freighter bay at the bottom (spec 4.1): the dark panel with its curved top edge, holding the dock counter, hold tank, flare launcher, launch track and rail. */
import { View } from 'react-native';
import type { FieldLayout } from '../layout';
import { DockCounter } from './DockCounter';
import { FlareLauncher } from './FlareLauncher';
import { HoldTank } from './HoldTank';
import { LaunchTrack } from './LaunchTrack';
import { StationRail } from './StationRail';

export function FreighterBay({ layout }: { layout: FieldLayout }) {
  const z = layout.zones;
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: z.bay.y, width: z.bay.width, height: z.bay.height, backgroundColor: '#0B1226', borderTopLeftRadius: 28, borderTopRightRadius: 28 }} />
      <DockCounter rect={z.counter} />
      <HoldTank rect={z.hold} />
      <FlareLauncher rect={z.flare} />
      <LaunchTrack rect={z.launch} />
      <StationRail rects={z.rail} />
    </>
  );
}
