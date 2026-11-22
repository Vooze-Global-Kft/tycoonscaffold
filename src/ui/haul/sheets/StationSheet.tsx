/** SKELETON (package "sheets"). The Station sheet (spec 4.5, errata 58, 59): a station schematic strip with Fleet (drones n/cap, capacity, engines), Freighter (hull art, level, holds, away) and Systems (the autopilot beacon, "Bring online · ₵90", then the FULL / CONTRACT policy chips). Target keys station:buyDrone, station:autopilot. */
import { Text } from 'react-native';
import { haulActions } from '../../../modes/haul/actions';
import { Sheet } from '../../kit';
import { useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';

export function StationSheet() {
  const open = useHaulUi((s) => s.sheet?.type === 'station');
  const r = useRunShallow((_c, g) => ({ drones: g.haul.fleet.drones, freighter: g.haul.freighter.level, auto: g.haul.autopilot.online }), { drones: 0, freighter: 0, auto: false });
  const row = (label: string, onPress: () => void) => (
    <Text key={label} style={{ color: '#3FD8FF', marginTop: 10 }} onPress={onPress}>
      {label}
    </Text>
  );
  return (
    <Sheet visible={open} onClose={() => useHaulUi.getState().closeSheet()} title="Station (placeholder)">
      <Text style={{ color: '#E6F1FF' }}>{`sheets/StationSheet.tsx · drones ${r.drones} · freighter L${r.freighter} · autopilot ${r.auto ? 'online' : 'dark'}`}</Text>
      {row('Buy drone', haulActions.buyDrone)}
      {row('Drone capacity', haulActions.buyCapacity)}
      {row('Drone engines', haulActions.buyEngine)}
      {row('Freighter', haulActions.buyFreighter)}
      {row('Dock Autopilot', haulActions.buyAutopilot)}
    </Sheet>
  );
}
