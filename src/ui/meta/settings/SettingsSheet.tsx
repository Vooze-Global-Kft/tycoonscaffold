/** PLACEHOLDER (to be replaced): the settings dialog. Shows when the store's modal is { type: 'settings' }. */
import { Text } from 'react-native';
import { useGame } from '../../../state/store';
import { Sheet } from '../../kit';

export function SettingsSheet() {
  const modal = useGame((s) => s.modal);
  const close = useGame((s) => s.closeModal);
  if (modal?.type !== 'settings') return null;
  return (
    <Sheet visible onClose={close} title="Settings">
      <Text>settings placeholder</Text>
    </Sheet>
  );
}
