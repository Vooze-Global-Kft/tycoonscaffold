/**
 * PLACEHOLDER (to be replaced): the full-screen chest opening. Shows while the store's
 * `chestOpening` is set and calls closeChest() when the player has seen everything.
 */
import { Text } from 'react-native';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { RewardListGranted } from './granted';
import { Sheet } from '../../kit';

export function ChestOverlay() {
  const opening = useGame((s) => s.chestOpening);
  const close = useGame((s) => s.closeChest);
  if (!opening) return null;
  return (
    <Sheet visible onClose={close} title="Chest" footer={<Button label="Collect" onPress={close} />}>
      <Text>{opening.chestId}</Text>
      <RewardListGranted rewards={opening.rewards} />
    </Sheet>
  );
}
