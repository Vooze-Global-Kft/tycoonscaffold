/** SKELETON (package "sheets"). The Rig sheet (spec 4.5, errata 61): rock thumbnail, "Rock T-3 · R2 · Copper", life bar and "dry in about", ‹ › to the previous/next claimed rig, level and drill, "Next bit: Deep Bore at L10", one Upgrade button, the route's verdict. Data: src/engine/haul `slotReadout`. */
import { Text } from 'react-native';
import { haulActions } from '../../../modes/haul/actions';
import { Sheet } from '../../kit';
import { useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';

export function RigSheet() {
  const sheet = useHaulUi((s) => s.sheet);
  const slot = sheet?.type === 'rig' ? sheet.slot : -1;
  const r = useRunShallow((_c, g) => ({ level: g.haul.slots[slot]?.rigLevel ?? 0, ore: g.haul.slots[slot]?.ore ?? '', haulers: g.haul.slots[slot]?.haulers ?? 0 }), { level: 0, ore: '', haulers: 0 });
  return (
    <Sheet visible={slot >= 0} onClose={() => useHaulUi.getState().closeSheet()} title={`Rig T-${slot + 1} (placeholder)`}>
      <Text style={{ color: '#E6F1FF' }}>{`sheets/RigSheet.tsx · L${r.level} · ${r.ore} · ${r.haulers} drones`}</Text>
      <Text style={{ color: '#3FD8FF', marginTop: 12 }} onPress={() => haulActions.upgradeRig(slot)}>
        Upgrade
      </Text>
    </Sheet>
  );
}
