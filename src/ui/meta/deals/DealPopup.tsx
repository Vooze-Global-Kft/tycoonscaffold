/** PLACEHOLDER (to be replaced): the one-time presentation of a limited offer. Shows while the store's `dealPopup` is set. */
import { Text } from 'react-native';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { RewardList, Sheet } from '../../kit';

export function DealPopup() {
  const id = useGame((s) => s.dealPopup);
  const deal = useGame((s) => s.cfg.meta.deals.find((d) => d.id === s.dealPopup));
  const dismiss = useGame((s) => s.dismissDealPopup);
  const buy = useGame((s) => s.buyDeal);
  if (!id || !deal) return null;
  return (
    <Sheet visible onClose={dismiss} title={deal.title} icon={deal.icon} footer={<Button label="Buy" onPress={() => buy(deal.id)} />}>
      <Text>{deal.blurb}</Text>
      <RewardList rewards={deal.contents} />
    </Sheet>
  );
}
