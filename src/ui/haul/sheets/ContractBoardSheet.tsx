/** SKELETON (package "sheets"). The Contract Board sheet (spec 4.5, errata 26, 62): three buyer manifests side by side (110 x 156 at 390, 104 x 148 at 375), wanted ores with fill bars and "12 Ice to go", the multiplier, launch pips, "+₵420 if met" (src/engine/haul `contractGain`), ACTIVE on the selected one; tap selects. Footer: "Every 4th contract met: Scrap Pod (2/4)". */
import { Text } from 'react-native';
import { haulActions } from '../../../modes/haul/actions';
import { Sheet } from '../../kit';
import { useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';

export function ContractBoardSheet() {
  const open = useHaulUi((s) => s.sheet?.type === 'contracts');
  const board = useRunShallow((_c, g) => g.haul.contracts.board.map((c, i) => `${i === g.haul.contracts.active ? 'ACTIVE · ' : ''}${c.buyer} · ${c.wants.map((w) => `${w.units} ${w.ore}`).join(' + ')} · x${c.mult} · ${c.launchesLeft}`), []);
  return (
    <Sheet visible={open} onClose={() => useHaulUi.getState().closeSheet()} title="Contract Board (placeholder)">
      {board.map((line, i) => (
        <Text key={i} style={{ color: '#3FD8FF', marginTop: 8 }} onPress={() => haulActions.pickContract(i)}>
          {line}
        </Text>
      ))}
    </Sheet>
  );
}
