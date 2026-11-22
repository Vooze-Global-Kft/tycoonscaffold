/**
 * The one-time presentation of a limited offer, shown while the store's `dealPopup` is set.
 * One calm card: the close button is there from the first frame (the kit's Sheet), "Not now"
 * is a plain equal-weight way out, nothing vibrates, nothing is pre-selected, and the same offer
 * stays in the shop until it really ends, so saying no here loses nothing.
 */
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { Sheet } from '../../kit';
import { useTheme } from '../../theme';
import { DealCard, useDealView } from './DealCard';

export function DealPopup() {
  const t = useTheme();
  const id = useGame((s) => s.dealPopup);
  const deal = useGame((s) => s.cfg.meta.deals.find((d) => d.id === s.dealPopup));
  const view = useDealView(id);
  const dismiss = useGame((s) => s.dismissDealPopup);

  // An offer that is not on sale (it ended, sold out or never started) is never presented;
  // clear the request so it does not block later popups.
  const stale = id !== null && (!deal || !view);
  useEffect(() => {
    if (stale) dismiss();
  }, [stale, dismiss]);

  if (!id || !deal || !view) return null;
  return (
    <Sheet
      visible
      onClose={dismiss}
      title={deal.title}
      footer={<Button variant="ghost" label="Not now" onPress={dismiss} />}
    >
      <DealCard dealId={deal.id} inPopup />
      <Text style={[styles.note, { color: t.c.textMuted }]}>This offer also stays in the Shop until it ends.</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },
});
