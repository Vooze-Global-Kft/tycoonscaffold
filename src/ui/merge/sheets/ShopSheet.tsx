/**
 * The Shop (spec 5.7, 4.4, M13, M14), a sheet opened from the bottom row: the three products with
 * the store's prices (the config's fallback prices only in a development build, iap.ts), what each
 * does in one plain sentence, owned or not, and "Restore purchases"; then the rewarded ads, each
 * with what it gives and when it is ready ("ready after 4 min of play", M10): fill one line (from a
 * ticket), gear rush, call the dragon. Nothing random is sold; no timers on offers, no "best value",
 * no pressure words. Titles come from game.json; the sentences from strings.ts (Late Hours' hours
 * from the config). Owned by the bars package (BARS, 7a).
 */
import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import type { IapProduct } from '../../../config/schema';
import * as M from '../../../engine/meta';
import type * as R from '../../../engine/merge';
import { mergeActions } from '../../../modes/merge/actions';
import { iap } from '../../../services/iap';
import { useGame } from '../../../state/store';
import { useRewardedReady } from '../../kit';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { useAdFree, useAdsView, useMergeCfg } from '../useMerge';
import { Btn, Card, INK, MergeSheet, Pill, Txt, useType } from './parts';
import { cooldownParts, figure } from './views';

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

function wait(seconds: number): string {
  const p = cooldownParts(seconds);
  return p.unit === 'min' ? S.sheets.minutes(p.n) : S.sheets.seconds(p.n);
}

export function ShopSheet() {
  const open = useMergeUi((s) => s.sheet?.type === 'shop');
  const close = () => useMergeUi.getState().closeSheet();
  return (
    <MergeSheet visible={open} onClose={close} title={S.sheets.shopTitle} icon="art:shop">
      {open ? <ShopBody /> : null}
    </MergeSheet>
  );
}

function role(cfg: R.MergeConfig, p: IapProduct): { icon: string; what: string } {
  const ids = cfg.merge.products;
  if (p.id === ids.awnings) return { icon: 'art:awnings', what: S.sheets.awningsWhat };
  if (p.id === ids.lateHours) return { icon: 'art:late-hours', what: S.sheets.lateHoursWhat(figure(cfg.merge.away.lateHoursHours)) };
  if (p.id === ids.quietEvening) return { icon: 'art:quiet-evening', what: S.sheets.quietEveningWhat };
  return { icon: 'art:shop', what: '' };
}

function ShopBody() {
  const ty = useType();
  const cfg = useMergeCfg();
  usePrices();
  const owned = useGame((s) => s.game.entitlements.products.join(','));
  const ads = useAdsView();
  const adReady = useRewardedReady();
  const free = useAdFree();
  const restore = useGame((s) => s.restorePurchases);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const counterWithLines = useGame((s) => {
    const m = (s.game as R.MergeGame).merge;
    return m ? m.counters.findIndex((ct) => (ct.ticket?.lines.filter((l) => !l.filled).length ?? 0) >= 2) : -1;
  });
  if (!cfg) return null;
  const products = cfg.monetization.iap.products;
  const ownedIds = owned ? owned.split(',') : [];
  const adSub = (waitS: number, ok: boolean, what: string, blocked?: string) => (waitS > 0 ? S.sheets.adReadyAfter(wait(waitS)) : !adReady ? S.sheets.adNotLoaded : blocked && !ok ? blocked : what);
  // With the ad skip owned no video plays: the button says what it gives, never "Watch ad".
  const adLabel = free ? S.sheets.adTake : S.sheets.adReady;
  return (
    <>
      <Txt size={ty.small} bold color={INK.soft}>
        {S.sheets.shopProducts}
      </Txt>
      {products.map((p) => {
        const r = role(cfg, p);
        const has = M.isNonConsumable(p) && ownedIds.includes(p.id);
        return (
          <Card key={p.id} icon={r.icon} iconSize={40}>
            <View style={styles.head}>
              <Txt size={ty.body} bold style={styles.flex} lines={1}>
                {p.title}
              </Txt>
              {has ? <Pill label={S.sheets.owned} color={INK.good} /> : null}
            </View>
            <Txt size={ty.small} color={INK.soft}>
              {r.what}
            </Txt>
            {!has ? <Btn label={iap.price(p)} enabled={iap.available(p)} onPress={() => void useGame.getState().purchase(p)} /> : null}
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
        {free ? S.sheets.shopAdsFree : S.sheets.shopAds}
      </Txt>
      <Card icon="art:ticket">
        <Txt size={ty.body} bold>
          {S.sheets.adFillLine}
        </Txt>
        <Txt size={ty.small} color={INK.soft}>
          {S.sheets.adFillLineWhat}
        </Txt>
        <Btn
          kind="ad"
          label={S.sheets.adFromTicket}
          sub={ads.fillWait > 0 ? S.sheets.adReadyAfter(wait(ads.fillWait)) : undefined}
          enabled={counterWithLines >= 0}
          onPress={() => useMergeUi.getState().openSheet({ type: 'ticket', counter: counterWithLines })}
        />
      </Card>
      <Card icon={`art:gear-grill`}>
        <Txt size={ty.body} bold>
          {S.sheets.adGearRush}
        </Txt>
        <Btn kind="ad" label={adLabel} sub={adSub(ads.rushWait, ads.rushOk, S.sheets.gearRushWhat(cfg.merge.ads.gearRushGoods), S.sheets.adNotNow)} enabled={ads.rushOk && adReady} onPress={() => void mergeActions.watchAd('gearRush')} />
      </Card>
      <Card icon="beast:dragon" iconSize={40}>
        <Txt size={ty.body} bold>
          {S.sheets.adDragon}
        </Txt>
        {ads.dragonOut || ads.dragonDue ? (
          // M46: while the Parade is out or due, no button: the dragon is here, or on its way to the next free counter.
          <Txt size={ty.small} color={INK.soft}>
            {ads.dragonOut ? S.sheets.adDragonOut : S.sheets.adDragonComing}
          </Txt>
        ) : (
          <Btn
            kind="ad"
            label={adLabel}
            sub={adSub(ads.dragonWait, ads.dragonOk, S.sheets.adDragonWhat, S.sheets.adNotNow)}
            enabled={ads.dragonOk && adReady}
            onPress={() => void mergeActions.watchAd('callDragon')}
          />
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  section: { marginTop: 4 },
});
