/** PLACEHOLDER (to be replaced): the missions dialog. Shows when the store's modal is { type: 'missions' }. */
import { Text } from 'react-native';
import * as M from '../../../engine/meta';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { Sheet } from '../../kit';

export function MissionsSheet() {
  const modal = useGame((s) => s.modal);
  const cfg = useGame((s) => s.cfg);
  const game = useGame((s) => s.game);
  const close = useGame((s) => s.closeModal);
  const claim = useGame((s) => s.claimMission);
  if (modal?.type !== 'missions') return null;
  return (
    <Sheet visible onClose={close} title="Missions">
      {M.missionViews(cfg, game).map((m) => (
        <Button key={m.index} label={`${m.text} ${Math.floor(m.progress)}/${m.target}`} disabled={!m.done} onPress={() => claim(m.index)} />
      ))}
      <Text> </Text>
    </Sheet>
  );
}
