/** SKELETON (package "spokes"). The Trade Post (spec 4.6, 5.4): a docking terminal of horizontal bays: the Dark Matter readout, Supplies (Time Warp 2 h for 40 DM; the flare charge for an ad), Fuel (two Dark Matter cells), Licences (Clearance, Hangar Expansion, Prospector Charter once). Purchases through the shared store's `purchase`; Time Warp through haulActions.timeWarp. A banner only at the bottom edge of a spoke (removed by Clearance). */
import { Text } from 'react-native';
import { haulActions } from '../../../modes/haul/actions';
import { useGame } from '../../../state/store';
import { useShallow } from 'zustand/react/shallow';
import { SpokeFrame } from '../spokes/SpokeFrame';

export function TradePost() {
  const gems = useGame((s) => s.game.gems);
  const products = useGame(useShallow((s) => s.cfg.monetization.iap.products.map((p) => p.id)));
  return (
    <SpokeFrame title="Trade Post" file="trade/TradePost.tsx" pkg="spokes">
      <Text style={{ color: '#E6F1FF' }}>{`Dark Matter ${gems}`}</Text>
      <Text style={{ color: '#3FD8FF' }} onPress={haulActions.timeWarp}>
        Time Warp 2 h
      </Text>
      {products.map((id) => (
        <Text key={id} style={{ color: '#3FD8FF' }} onPress={() => {
          const p = useGame.getState().cfg.monetization.iap.products.find((x) => x.id === id);
          if (p) void useGame.getState().purchase(p);
        }}>
          {id}
        </Text>
      ))}
    </SpokeFrame>
  );
}
