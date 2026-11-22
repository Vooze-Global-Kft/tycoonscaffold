/** SKELETON (package "spokes"). The Salvage Bay (spec 4.6, 5.2): a rack of waiting pods (art kit drawPod), the counters ("Next Scrap Pod: 4/6 rocks · 2/4 contracts ..."), the one-step laser-cut opening (1.2 s) with contents rising by rarity, "Manifest odds" (chestOddsFacts in this game's layout). Actions: haulActions.openPod; the store's chestOpening drives the reveal. Target key salvage:pod0. */
import { Text } from 'react-native';
import { haulActions } from '../../../modes/haul/actions';
import { useGame } from '../../../state/store';
import { useShallow } from 'zustand/react/shallow';
import { SpokeFrame } from '../spokes/SpokeFrame';

export function SalvageBay() {
  const pods = useGame(useShallow((s) => Object.entries(s.game.chests.owned).filter(([, n]) => n > 0).map(([id, n]) => `${id} x${n}`)));
  const opening = useGame((s) => s.chestOpening);
  return (
    <SpokeFrame title="Salvage Bay" file="salvage/SalvageBay.tsx" pkg="spokes">
      {pods.length === 0 ? <Text style={{ color: '#7F93B5' }}>No pods waiting.</Text> : null}
      {pods.map((p) => (
        <Text key={p} style={{ color: '#3FD8FF' }} onPress={() => haulActions.openPod(p.split(' ')[0])}>
          {`Cut open ${p}`}
        </Text>
      ))}
      {opening ? (
        <Text style={{ color: '#E6F1FF' }} onPress={() => useGame.getState().closeChest()}>
          {`Opened ${opening.chestId}: ${opening.rewards.map((r) => r.type).join(', ')} (tap to close)`}
        </Text>
      ) : null}
    </SpokeFrame>
  );
}
