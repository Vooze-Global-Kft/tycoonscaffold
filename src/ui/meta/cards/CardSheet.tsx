/** PLACEHOLDER (to be replaced): the card dialog. Shows when the store's modal is { type: 'card' }; renders nothing otherwise. */
import { Text } from 'react-native';
import { useGame } from '../../../state/store';
import { Sheet } from '../../kit';

export function CardSheet() {
  const modal = useGame((s) => s.modal);
  const close = useGame((s) => s.closeModal);
  if (modal?.type !== 'card') return null;
  return (
    <Sheet visible onClose={close} title="Card">
      <Text>{modal.cardId}</Text>
    </Sheet>
  );
}
