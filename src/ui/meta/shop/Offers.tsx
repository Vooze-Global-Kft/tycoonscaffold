/** The shop's limited offers: every active deal the player may see, each with its real end time. */
import { DealCard, useVisibleDealIds } from '../deals/DealCard';
import { ShopSection } from './parts';

export function Offers() {
  const ids = useVisibleDealIds();
  if (ids.length === 0) return null;
  return (
    <ShopSection icon="🏷️" title={ids.length > 1 ? 'Offers' : 'Offer'}>
      {ids.map((id) => (
        <DealCard key={id} dealId={id} />
      ))}
    </ShopSection>
  );
}
