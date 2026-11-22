/**
 * The shop tab, top to bottom: the daily gift, limited offers, today's shop, boosts, the
 * real-money store, chests for gems (only where they may be sold) and the account footer.
 * Each section hides itself when the game does not have it, so a classic game with no deals or
 * daily shop still gets a tidy shop. Sections select only the few values they show: the game
 * state changes ten times a second and this list must not re-render with it.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { Boosts } from './Boosts';
import { ChestShop } from './ChestShop';
import { DailyGift } from './DailyGift';
import { DailyShop } from './DailyShop';
import { Offers } from './Offers';
import { DevResetButton, PrivacyChoicesButton, RestoreButton, SimulatedNote } from './account';
import { Store } from './Store';

export function ShopTab() {
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <DailyGift />
      <Offers />
      <DailyShop />
      <Boosts />
      <Store />
      <ChestShop />
      <View style={styles.footer}>
        <RestoreButton />
        <PrivacyChoicesButton />
        <SimulatedNote />
        <DevResetButton />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 2, paddingBottom: 28 },
  footer: { marginHorizontal: 16, marginTop: 22, gap: 8 },
});
