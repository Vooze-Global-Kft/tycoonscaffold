/** SKELETON (package "spokes"). The Fitting Bay (spec 4.6, 5.1): a station schematic (art kit StationSchematic when it exists, errata 38) with three typed sockets (Rig, Fleet, Dock), a tray of module cartridges (art kit drawCartridge); tap a cartridge then a socket; "Mk II · Parts 3/5 · Refit 40 DM". Opens on the first module copy (errata 75). Actions: haulActions.fitModule, refitModule. Target keys fitting:socket0, fitting:module0. */
import { Text } from 'react-native';
import { haulActions } from '../../../modes/haul/actions';
import { useRunShallow } from '../useRun';
import { SpokeFrame } from './SpokeFrame';

export function FittingBay() {
  const s = useRunShallow((_c, g) => ({ sockets: g.loadout.sockets.map((x) => x ?? 'empty'), owned: Object.entries(g.cards).filter(([, c]) => c.level > 0).map(([id]) => id) }), { sockets: [], owned: [] });
  return (
    <SpokeFrame title="Fitting Bay" file="spokes/FittingBay.tsx" pkg="spokes">
      <Text style={{ color: '#E6F1FF' }}>{`sockets: ${s.sockets.join(' · ')}`}</Text>
      {s.owned.map((id) => (
        <Text key={id} style={{ color: '#3FD8FF' }} onPress={() => haulActions.fitModule(0, id)}>
          {`fit ${id} in socket 0`}
        </Text>
      ))}
    </SpokeFrame>
  );
}
