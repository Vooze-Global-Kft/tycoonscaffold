/**
 * The Trade Post (spec 4.6, 5.4): a docking terminal. A readout bar with the Dark Matter aboard,
 * then horizontal bays, each a docking slot with its bay code down the left edge:
 *   Supplies: Time Warp (Dark Matter for hours of station income, priced through the shared
 *             engine's activeIncome) and a flare charge for an optional rewarded ad (3 a day).
 *   Fuel:     Dark Matter cells (the config's `gems` products).
 *   Licences: the permanent products (clearance, unlock, the one-time starter pack), "Owned" once
 *             bought.
 * Purchases go through the shared store's `purchase` (the platform's own sheet and price; never a
 * typed price in a release build); "Restore purchases" at the foot. No timers, no pressure words,
 * nothing vibrates for an offer. Pods are never sold here.
 */
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { IapProduct } from '../../../config/schema';
import * as E from '../../../engine/economy';
import { formatNumber, formatShort } from '../../../engine/format';
import * as H from '../../../engine/haul';
import * as M from '../../../engine/meta';
import type { GameState } from '../../../engine/types';
import { haulActions } from '../../../modes/haul/actions';
import { iap } from '../../../services/iap';
import { useGame } from '../../../state/store';
import { formatCountdown, useNow, useRewardedReady } from '../../kit';
import { HaulIcon } from '../art/HaulIcon';
import { useHaul, useHaulCfg } from '../spokes/spokeData';
import { INK, Key, Mono } from '../spokes/spokeKit';
import { SPOKE_STRINGS as S, words } from '../spokes/spokeStrings';
import { SpokeFrame } from '../spokes/SpokeFrame';

/** How long the Trade Post says "+1 flare charge" after the ad paid it. */
const GRANTED_MS = 4000;
const LICENCE_KINDS = new Set(['clearance', 'unlock', 'starterPack', 'noAds', 'pass']);

/** Product art: the errata 42 icons by kind, else the product's own icon. */
function productIcon(p: IapProduct): string {
  if (p.kind === 'clearance') return 'art:clearance';
  if (p.kind === 'unlock') return 'art:hangar-expansion';
  if (p.kind === 'starterPack') return 'art:prospector-charter';
  if (p.kind === 'gems') return (p.value ?? 0) >= 500 ? 'art:fuel-tank' : 'art:fuel-cell';
  return p.icon ?? 'art:dark-matter';
}

/** Re-renders when the store returns prices. */
function usePrices(): number {
  return useSyncExternalStore(
    (fn) => iap.onChange(fn),
    () => priceTick,
    () => priceTick,
  );
}
let priceTick = 0;
iap.onChange(() => {
  priceTick++;
});

export function TradePost() {
  const cfg = useHaulCfg();
  const gems = useGame((s) => s.game.gems);
  const products = cfg.monetization.iap.products;
  const fuel = products.filter((p) => p.kind === 'gems');
  const licences = products.filter((p) => LICENCE_KINDS.has(p.kind));
  return (
    <SpokeFrame
      title={S.tradeTitle}
      code={S.tradeCode}
      right={
        <View style={styles.balance} accessibilityLabel={words(cfg, S.balance)}>
          <HaulIcon name={cfg.strings.gemIcon} size={20} />
          <View>
            <Mono size={16} weight="700" color={INK.dm}>
              {formatNumber(gems)}
            </Mono>
            <Mono size={8} color={INK.dim}>
              {words(cfg, S.balance)}
            </Mono>
          </View>
        </View>
      }
    >
      <Bay code="A" title={S.supplies}>
        <TimeWarp cfg={cfg} />
        <FlareAd cfg={cfg} />
      </Bay>
      {fuel.length ? (
        <Bay code="B" title={S.fuel}>
          {fuel.map((p) => (
            <ProductSlot key={p.id} cfg={cfg} p={p} />
          ))}
        </Bay>
      ) : null}
      {licences.length ? (
        <Bay code="C" title={S.licences}>
          {licences.map((p) => (
            <ProductSlot key={p.id} cfg={cfg} p={p} />
          ))}
        </Bay>
      ) : null}
      <Restore />
      <Mono size={9} color={INK.faint} caps={false} center style={{ marginTop: 6 }}>
        {S.noForcedAds}
      </Mono>
    </SpokeFrame>
  );
}

/** A docking bay: its code in a vertical strip at the left, its slots stacked at the right. */
function Bay({ code, title, children }: { code: string; title: string; children: ReactNode }) {
  return (
    <View style={styles.bay}>
      <View style={styles.bayStrip}>
        <Mono size={11} weight="700" color={INK.bg}>
          {code}
        </Mono>
        <View style={styles.hazard}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.hazardBar} />
          ))}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Mono size={10} weight="700" color={INK.lineDim} style={styles.bayTitle}>
          {S.bayTitle.replace('{code}', code).replace('{title}', title)}
        </Mono>
        {children}
      </View>
    </View>
  );
}

function Slot({ icon, title, line, children, dim, lineColor }: { icon: string; title: string; line: string; children: ReactNode; dim?: boolean; lineColor?: string }) {
  return (
    <View style={[styles.slot, dim && { opacity: 0.75 }]}>
      <View style={styles.slotIcon}>
        <HaulIcon name={icon} size={34} />
      </View>
      <View style={{ flex: 1 }}>
        <Mono size={12} weight="700" color={INK.text} lines={1}>
          {title}
        </Mono>
        <Mono size={10} color={lineColor ?? INK.dim} caps={false} lines={3} style={{ marginTop: 2 }}>
          {line}
        </Mono>
      </View>
      <View style={styles.slotKey}>{children}</View>
    </View>
  );
}

function TimeWarp({ cfg }: { cfg: H.HaulConfig }) {
  const tw = cfg.economy.timeWarp;
  const st = useHaul((c, g) => {
    const game = g as unknown as GameState;
    const rate = E.activeIncomePerSecond(c, game, Date.now());
    const value = Math.round(rate * tw.hours * 3600);
    // rules-7: a Time Warp worth nothing (no drone on a route: a run's start, right after a Jump) is never offered.
    return { value, can: game.gems >= tw.gemCost && !!g.haul && value > 0 };
  }, { value: 0, can: false });
  const line = st.value > 0 ? words(cfg, S.timeWarpLine, { h: tw.hours, v: formatShort(st.value) }) : words(cfg, S.timeWarpNone);
  return (
    <Slot icon="art:time-warp" title={words(cfg, S.timeWarp, { h: tw.hours })} line={line} lineColor={st.value > 0 ? undefined : INK.amber}>
      <Key small tone="dm" solid={st.can} disabled={!st.can} label={`${tw.gemCost} ${S.dmShort}`} onPress={haulActions.timeWarp} />
    </Slot>
  );
}

function FlareAd({ cfg }: { cfg: H.HaulConfig }) {
  const now = useNow(1000);
  const ready = useRewardedReady();
  const [busy, setBusy] = useState(false);
  // play-14: the reward is said on the row for a few seconds once it has arrived.
  const [granted, setGranted] = useState(0);
  const st = useHaul((c, g) => {
    const t = Date.now();
    const h = g.haul;
    if (!h) return { run: false, can: false, left: 0, wait: 0, full: false };
    const day = E.dayKey(t);
    const used = h.flare.adDay === day ? h.flare.adsToday : 0;
    return {
      run: true,
      can: H.canAdFlare(c, g as H.HaulGame & { haul: H.HaulState }, day, t),
      left: Math.max(0, c.haul.flare.adsPerDay - used),
      wait: Math.max(0, Math.ceil((h.flare.adNextAt - t) / 1000)),
      full: h.flare.charges >= c.haul.flare.maxCharges,
    };
  }, { run: false, can: false, left: 0, wait: 0, full: false });
  void now;
  const max = cfg.haul.flare.adsPerDay;
  const showGranted = granted > 0 && now - granted < GRANTED_MS;
  const line = showGranted ? words(cfg, S.flareGranted) : !st.run ? S.flareNoRun : st.full ? S.flareFull : st.wait > 0 && st.left > 0 ? words(cfg, S.flareWait, { t: formatCountdown(st.wait * 1000) }) : words(cfg, S.flareLine, { left: st.left, max });
  const enabled = st.can && ready && !busy;
  return (
    <Slot icon="art:flare" title={S.flareCharge} line={line} lineColor={showGranted ? INK.green : undefined}>
      <Key small tone="cyan" solid={enabled} disabled={!enabled} label={S.watchAd} sub={st.can && !ready ? S.adNotReady : words(cfg, S.flareAdGives)} onPress={async () => {
        setBusy(true);
        try {
          if (await haulActions.watchFlareAd()) setGranted(Date.now());
        } finally {
          setBusy(false);
        }
      }} />
    </Slot>
  );
}

function ProductSlot({ cfg, p }: { cfg: H.HaulConfig; p: IapProduct }) {
  usePrices();
  const owned = useGame((s) => M.isNonConsumable(p) && M.productOwned(s.game, p));
  const [busy, setBusy] = useState(false);
  const price = iap.price(p);
  const available = iap.available(p);
  const line = p.kind === 'gems' ? words(cfg, S.fuelLine, { n: formatNumber(p.value ?? 0) }) : (M.shopLineOf(p) ?? '');
  return (
    <Slot icon={productIcon(p)} title={p.title} line={line} dim={owned}>
      {owned ? (
        <View style={styles.owned}>
          <Mono size={10} weight="700" color={INK.green}>
            {S.owned}
          </Mono>
        </View>
      ) : (
        <Key small tone={p.kind === 'gems' ? 'dm' : 'gold'} disabled={!available || busy} label={price} onPress={async () => {
          setBusy(true);
          try {
            await useGame.getState().purchase(p);
          } finally {
            setBusy(false);
          }
        }} />
      )}
    </Slot>
  );
}

function Restore() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <Pressable
      disabled={busy}
      onPress={async () => {
        setBusy(true);
        try {
          const n = await useGame.getState().restorePurchases();
          setMsg(n > 0 ? S.restored.replace('{n}', String(n)) : S.noneRestored);
        } finally {
          setBusy(false);
        }
      }}
      accessibilityRole="button"
      hitSlop={8}
      style={styles.restore}
    >
      <Mono size={10} weight="700" color={INK.line} center>
        {msg ?? S.restore}
      </Mono>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: INK.edge, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(12,19,38,0.9)' },
  bay: { flexDirection: 'row', marginBottom: 14, borderWidth: 1, borderColor: INK.edge, backgroundColor: 'rgba(12,19,38,0.85)' },
  bayStrip: { width: 22, backgroundColor: INK.lineDim, alignItems: 'center', paddingTop: 8, justifyContent: 'space-between', paddingBottom: 6 },
  hazard: { gap: 4 },
  hazardBar: { width: 12, height: 4, backgroundColor: INK.amber, transform: [{ skewY: '-30deg' }] },
  bayTitle: { letterSpacing: 1.6, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 2 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(34,52,92,0.6)' },
  slotIcon: { width: 44, height: 44, borderWidth: 1, borderColor: INK.edge, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A1022' },
  slotKey: { minWidth: 84, alignItems: 'flex-end' },
  owned: { borderWidth: 1, borderColor: INK.green, paddingHorizontal: 8, paddingVertical: 5, transform: [{ rotate: '-4deg' }] },
  restore: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12 },
});
