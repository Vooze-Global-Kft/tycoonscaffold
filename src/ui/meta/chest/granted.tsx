/** PLACEHOLDER helper: a plain list of what a chest gave. */
import { Text, View } from 'react-native';
import type { GrantedReward } from '../../../engine/meta';
import { useGame } from '../../../state/store';
import { describeGranted } from '../../kit';

export function RewardListGranted({ rewards }: { rewards: GrantedReward[] }) {
  const cfg = useGame((s) => s.cfg);
  return (
    <View>
      {rewards.map((g, i) => {
        const info = describeGranted(cfg, g);
        return <Text key={i}>{`${info.icon.startsWith('char:') || info.icon.startsWith('asset:') ? '' : info.icon} ${info.label}`}</Text>;
      })}
    </View>
  );
}
