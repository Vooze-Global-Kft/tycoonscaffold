/** PLACEHOLDER (to be replaced): the drop-rate dialog. Shows when the store's modal is { type: 'chestOdds' }. */
import { Text } from 'react-native';
import * as M from '../../../engine/meta';
import { useGame } from '../../../state/store';
import { Sheet } from '../../kit';

export function ChestOddsSheet() {
  const modal = useGame((s) => s.modal);
  const cfg = useGame((s) => s.cfg);
  const close = useGame((s) => s.closeModal);
  if (modal?.type !== 'chestOdds') return null;
  return (
    <Sheet visible onClose={close} title="Drop rates">
      {M.chestCardOdds(cfg, modal.chestId).map((o) => (
        <Text key={o.rarity}>{`${o.rarity}: ${o.percent.toFixed(1)}%`}</Text>
      ))}
    </Sheet>
  );
}
