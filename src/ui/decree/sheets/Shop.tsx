/**
 * The Shop (spec 5.11, D11): the five products, each said plainly in the game's own words (their
 * titles and descriptions are the config's), owned or with the store's price; "Restore purchases";
 * then the rewarded ads as favours, each from a button the player taps ("Watch ad"), its play-clock
 * cooldown stated, a failed load losing nothing. Nothing is offered from the call to the end of
 * election night (the rules' canShop / canWatchAd): "Closed during the run-up" stands in place of
 * every button then. None of it is random or reaches a mood, the poll or the count.
 * Opened from the Settings sheet (the top bar's menu). Owned by the bars package (BARS).
 */
import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import * as R from '../../../engine/decree';
import * as M from '../../../engine/meta';
import { iap } from '../../../services/iap';
import { useGame } from '../../../state/store';
import { S, aboutText } from '../strings';
import { useDecreeUi } from '../uiState';
import { useAdFree, useCanShop, useDecreeCfg } from '../useDecree';
import { AdButton, Btn, Card, DecreeSheet, INK, Pill, Txt, useType } from './parts';

let priceTick = 0;
iap.onChange(() => {
  priceTick++;
});
/** Re-renders when the store returns prices. */
function usePrices(): number {
  return useSyncExternalStore(
    (fn) => iap.onChange(fn),
    () => priceTick,
    () => priceTick,
  );
}

export function ShopSheet() {
  const open = useDecreeUi((s) => s.sheet?.type === 'shop');
  const close = () => useDecreeUi.getState().closeSheet();
  return (
    <DecreeSheet visible={open} onClose={close} title={S.sheets.shopTitle} icon="art:btn_shop">
      {open ? <ShopBody /> : null}
    </DecreeSheet>
  );
}

function ShopBody() {
  const ty = useType();
  const cfg = useDecreeCfg();
  usePrices();
  const owned = useGame((s) => s.game.entitlements.products.join(','));
  const canShop = useCanShop();
  const adFree = useAdFree();
  const restore = useGame((s) => s.restorePurchases);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!cfg) return null;
  const ownedIds = owned ? owned.split(',') : [];
  const doorsEvery = aboutText(R.about(cfg.decree.ads.openDoorsCooldown));
  return (
    <>
      <Txt size={ty.small} bold color={INK.soft}>
        {S.sheets.shopProducts}
      </Txt>
      {cfg.monetization.iap.products.map((p) => {
        const has = M.isNonConsumable(p) && ownedIds.includes(p.id);
        return (
          <Card key={p.id} icon={`art:product_${p.id}`} iconSize={40}>
            <View style={styles.head}>
              <Txt size={ty.body} bold color={INK.violetDeep} style={styles.flex}>
                {p.title}
              </Txt>
              {has ? <Pill label={S.sheets.owned} /> : null}
            </View>
            {p.description ? (
              <Txt size={ty.small} color={INK.soft}>
                {p.description}
              </Txt>
            ) : null}
            {has ? null : canShop ? (
              <Btn label={iap.price(p)} enabled={iap.available(p)} onPress={() => void useGame.getState().purchase(p)} />
            ) : (
              <Txt size={ty.small} bold color={INK.slate}>
                {S.hud.closedRunUp}
              </Txt>
            )}
          </Card>
        );
      })}
      <Btn
        kind="plain"
        label={busy ? S.sheets.restoring : S.sheets.restore}
        enabled={!busy}
        onPress={async () => {
          if (busy) return;
          setBusy(true);
          const n = await restore();
          setBusy(false);
          setNote(n > 0 ? S.sheets.restored(n) : S.sheets.restoredNone);
        }}
      />
      {note ? (
        <Txt size={ty.small} color={INK.soft} center>
          {note}
        </Txt>
      ) : null}
      <Txt size={ty.small} bold color={INK.soft} style={styles.section}>
        {adFree ? S.sheets.shopAdsFree : S.sheets.shopAds}
      </Txt>
      <AdButton kind="checkSofa" icon="art:ad_sofa" title={S.sheets.sofa} what={S.sheets.sofaWhat} cooldown={S.sheets.adOnceTerm} idle={S.sheets.sofaUsed} />
      <AdButton kind="openDoors" icon="art:ad_doors" title={S.sheets.adDoors} what={S.sheets.adDoorsWhat} cooldown={S.sheets.adCooldown(doorsEvery)} />
      <AdButton kind="courier" icon="art:ad_courier" title={S.sheets.adCourier} what={S.sheets.adCourierWhat} />
      <AdButton kind="spinDoctor" icon="art:ad_spin" title={S.sheets.adSpin} what={S.sheets.adSpinWhat} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { marginTop: 6 },
});
