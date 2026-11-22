/**
 * The managers list of a classic game, shown at the top of its staff tab (App.tsx). Sim games hire
 * inline on the station rows of the home tab instead.
 */
import { ScrollView, StyleSheet, Text } from 'react-native';
import * as E from '../../engine/economy';
import { formatMoney } from '../../engine/format';
import { useGame } from '../../state/store';
import { Card, CardText } from '../../ui/kit';
import { useTheme } from '../../ui/theme';
import { Button } from '../../ui/components/Button';
import { GameIcon } from '../../ui/components/GameIcon';

export function ManagersPanel() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const venueId = useGame((s) => s.game.activeVenue);
  const businesses = useGame((s) => s.game.venues[s.game.activeVenue]?.businesses);
  const cash = useGame((s) => s.game.cash);
  const hire = useGame((s) => s.hire);
  if (!businesses) return null;
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {cfg.businesses.map((b) => {
        const s = businesses[b.id];
        if (!s || (s.owned === 0 && !s.managed)) return null;
        const cost = E.managerCost(cfg, venueId, b.id);
        return (
          <Card key={b.id}>
            <GameIcon icon={b.managerIcon ?? t.icons.manager} size={48} />
            <CardText title={b.managerName ?? `${b.name} manager`} sub={`Runs ${b.name} on its own, even while you are away.`} />
            {s.managed ? (
              <Text style={[t.display, { color: t.c.success, fontSize: 14 }]}>✓ Hired</Text>
            ) : (
              <Button label="Hire" sublabel={formatMoney(cost, t.strings.currencySymbol)} disabled={!E.canAfford(cash, cost)} onPress={() => hire(b.id)} />
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 10, paddingBottom: 8 },
});
