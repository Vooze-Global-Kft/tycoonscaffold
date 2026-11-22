/**
 * The shop tab, top to bottom: the daily gift, limited offers, today's shop, the gem packs (the
 * header's "+" scrolls here), boosts with the one time-warp card, permanent boosts, ads, chests
 * for gems (only where they may be sold) and the account footer.
 * Each section hides itself when the game does not have it, so a classic game with no deals or
 * daily shop still gets a tidy shop. Sections select only the few values they show: the game
 * state changes ten times a second and this list must not re-render with it.
 */
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { Boosts } from './Boosts';
import { ChestShop } from './ChestShop';
import { DailyGift } from './DailyGift';
import { DailyShop } from './DailyShop';
import { Offers } from './Offers';
import { DevResetButton, PrivacyChoicesButton, RestoreButton, SimulatedNote } from './account';
import { shopFocus } from './focus';
import { AdProducts, GemPacks, PermanentBoosts } from './Store';

export function ShopTab() {
  const scroll = useRef<ScrollViewInstance>(null);
  const packsY = useRef<number | null>(null);
  const want = useRef(false);
  const show = () => {
    if (packsY.current === null) return;
    want.current = false;
    scroll.current?.scrollTo({ y: Math.max(0, packsY.current - 4), animated: true });
  };
  useEffect(() => {
    if (shopFocus.take() === 'packs') want.current = true;
    return shopFocus.subscribe(() => {
      shopFocus.take();
      want.current = true;
      show();
    });
  }, []);
  return (
    <ScrollView ref={scroll} contentContainerStyle={styles.list}>
      <DailyGift />
      <Offers />
      <DailyShop />
      <View
        onLayout={(e) => {
          packsY.current = e.nativeEvent.layout.y;
          if (want.current) show();
        }}
      >
        <GemPacks />
      </View>
      <Boosts />
      <PermanentBoosts />
      <AdProducts />
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
