/**
 * The Salvage Bay (spec 4.6, 5.2; the shared reward boxes in this game's container).
 *
 * A rack of waiting pods hangs across the top on a rail of cradles (up to 8, the count beyond);
 * under it the counters ("Next Scrap Pod: 4/6 rocks dry · 2/4 contracts", "Next Derelict Cache:
 * 1/4 transmissions", the supply drop's real countdown and what is stored). Tap a pod: the laser
 * cuts it open in one step (PodCutter, 1.2 s) and the contents rise with their rarity light:
 * module parts as cartridges sliding into the "To tray" stack, Dark Matter and credits as
 * readouts. "Next pod" opens the next one; "Stow" closes. "Manifest odds" opens the exact odds in
 * place. Pods are earned in play, never sold.
 *
 * Built on haulActions.openPod (the shared openChest), the store's chestOpening / closeChest /
 * claimFreeChest, meta.freeChestStatus, mergeSameCards, chestOddsFacts. Target key salvage:pod0.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInLeft } from 'react-native-reanimated';
import { formatShort } from '../../../engine/format';
import type * as H from '../../../engine/haul';
import * as M from '../../../engine/meta';
import type { GameState } from '../../../engine/types';
import { haulActions } from '../../../modes/haul/actions';
import { fx } from '../../../services/fx';
import { useGame } from '../../../state/store';
import { useTarget } from '../../hints/targets';
import { formatCountdown, useNow } from '../../kit';
import { HaulIcon } from '../art/HaulIcon';
import { drawCartridge } from '../art/modules.draw';
import { RARITY, type Rarity } from '../art/palette';
import { drawPod, POD_FOR_CHEST_TIER, type PodTier } from '../art/pods.draw';
import { useHaul, useHaulCfg } from '../spokes/spokeData';
import { ArtImage, Bracket, Gauge, INK, Key, Mono, Rule } from '../spokes/spokeKit';
import { SPOKE_STRINGS as S, words } from '../spokes/spokeStrings';
import { GUTTER, SpokeFrame } from '../spokes/SpokeFrame';
import { ManifestOdds } from './ManifestOdds';
import { PodCutter } from './PodCutter';

const RACK_MAX = 8;
const RANK: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
const kitRarity = (r: string): Rarity => (r === 'common' || r === 'rare' ? r : 'epic');

function tierOf(cfg: H.HaulConfig, chestId: string): PodTier {
  const tier = cfg.meta.chests.find((c) => c.id === chestId)?.tier ?? 'wood';
  return POD_FOR_CHEST_TIER[tier] ?? 'scrap';
}

function bayOf(cfg: H.HaulConfig, g: H.HaulGame) {
  const owned = g.chests.owned;
  // Rarer pods first (later in the config), each kind grouped.
  const order = [...cfg.meta.chests].reverse().map((c) => c.id);
  const rack: string[] = [];
  for (const id of order) for (let i = 0; i < (owned[id] ?? 0); i++) rack.push(id);
  const p = cfg.haul.pods;
  const st = g.stats;
  return {
    rack,
    rocks: { a: (st.depleted ?? 0) % p.depletedEvery, b: p.depletedEvery },
    contracts: { a: (st.contractsMet ?? 0) % p.contractsEvery, b: p.contractsEvery },
    tx: { a: (st.transmissionsAcked ?? 0) % p.transmissionsEvery, b: p.transmissionsEvery },
  };
}

export function SalvageBay() {
  const cfg = useHaulCfg();
  const bay = useHaul((c, g) => bayOf(c, g), { rack: [] as string[], rocks: { a: 0, b: 1 }, contracts: { a: 0, b: 1 }, tx: { a: 0, b: 1 } });
  const opening = useGame((s) => s.chestOpening);
  const [odds, setOdds] = useState(false);
  const podOpen = opening && cfg.meta.chests.some((c) => c.id === opening.chestId) ? opening : null;
  return (
    <SpokeFrame title={S.salvageTitle} code={S.salvageCode}>
      <Rack cfg={cfg} rack={bay.rack} busy={!!podOpen} />
      {podOpen ? (
        <Opening key={podOpen.id} cfg={cfg} id={podOpen.id} chestId={podOpen.chestId} rewards={podOpen.rewards} next={bay.rack[0] ?? null} />
      ) : (
        <>
          <Counters cfg={cfg} bay={bay} />
          <View style={styles.oddsKey}>
            <Key tone="cyan" small label={S.manifestOdds} onPress={() => {
              fx.play(odds ? 'ui_close' : 'ui_open');
              setOdds(!odds);
            }} />
          </View>
          {odds ? <ManifestOdds cfg={cfg} /> : null}
        </>
      )}
    </SpokeFrame>
  );
}

function Rack({ cfg, rack, busy }: { cfg: H.HaulConfig; rack: string[]; busy: boolean }) {
  const { width } = useWindowDimensions();
  const inner = width - 2 * GUTTER;
  const pitch = Math.floor(inner / 4);
  const shown = rack.slice(0, RACK_MAX);
  const more = rack.length - shown.length;
  return (
    <View>
      <View style={styles.rackHead}>
        <Mono size={10} color={INK.dim} weight="700" style={{ letterSpacing: 1.6 }}>{`${cfg.haul.names.pod} rack`}</Mono>
        <Mono size={10} color={rack.length ? INK.amber : INK.faint} weight="700">{`${rack.length}${more > 0 ? ` (+${more})` : ''}`}</Mono>
      </View>
      {shown.length === 0 ? (
        <>
          <View style={styles.rail} />
          <Mono size={11} color={INK.faint} caps={false} style={{ paddingVertical: 22, paddingHorizontal: 4 }}>
            {words(cfg, S.rackEmpty)}
          </Mono>
        </>
      ) : (
        [0, 4].filter((k) => k < shown.length).map((k) => (
          <View key={k} style={{ marginBottom: 6 }}>
            <View style={styles.rail} />
            <View style={styles.rack}>
              {shown.slice(k, k + 4).map((id, i) => (
                <RackPod key={`${id}:${k + i}`} cfg={cfg} id={id} index={k + i} pitch={pitch} disabled={busy} />
              ))}
            </View>
          </View>
        ))
      )}
      {shown.length > 0 && !busy ? (
        <Mono size={10} color={INK.dim} caps={false} style={{ marginTop: 4 }}>
          {words(cfg, S.cutOpen)}
        </Mono>
      ) : null}
    </View>
  );
}

function RackPod({ cfg, id, index, pitch, disabled }: { cfg: H.HaulConfig; id: string; index: number; pitch: number; disabled: boolean }) {
  const target = useTarget(index === 0 ? 'salvage:pod0' : `salvage:rack${index}`);
  const tier = tierOf(cfg, id);
  const name = cfg.meta.chests.find((c) => c.id === id)?.name ?? id;
  return (
    <Pressable {...target} disabled={disabled} onPress={() => haulActions.openPod(id)} accessibilityRole="button" accessibilityLabel={name} style={({ pressed }) => [{ width: pitch, alignItems: 'center', opacity: disabled ? 0.45 : 1 }, pressed && { transform: [{ translateY: 3 }] }]}>
      <View style={styles.cradle} />
      <ArtImage id={`pod:${tier}`} w={76} h={58} draw={(c) => {
        c.scale(1.1, 1.1);
        drawPod(c, tier);
      }} />
    </Pressable>
  );
}

function Counters({ cfg, bay }: { cfg: H.HaulConfig; bay: ReturnType<typeof bayOf> }) {
  const now = useNow(1000);
  const drop = useGame((s) => {
    const st = M.freeChestStatus(s.cfg, s.game, Date.now());
    return st ? `${st.ready}|${st.stored}|${Math.ceil(st.nextInMs / 1000)}` : '';
  });
  void now;
  const [ready, stored, secs] = drop ? drop.split('|').map(Number) : [0, 0, 0];
  const take = () => {
    const before = useGame.getState().chestOpening;
    useGame.getState().claimFreeChest();
    if (useGame.getState().chestOpening !== before) fx.play('salvage_cut');
  };
  const line = (label: string, parts: { text: string; v: number }[]) => (
    <View style={styles.counter}>
      <Mono size={10} weight="700" color={INK.text} style={{ marginBottom: 4 }}>
        {label}
      </Mono>
      {parts.map((p) => (
        <View key={p.text} style={styles.counterRow}>
          <Gauge value={p.v} color={INK.amber} style={{ flex: 1 }} />
          <Mono size={10} color={INK.dim} caps={false} style={styles.counterText}>
            {p.text}
          </Mono>
        </View>
      ))}
    </View>
  );
  return (
    <Bracket style={{ marginTop: 12 }} color={INK.lineDim}>
      {line(words(cfg, S.nextScrap), [
        { text: words(cfg, S.rocksDry, bay.rocks), v: bay.rocks.a / bay.rocks.b },
        { text: words(cfg, S.contractsMet, bay.contracts), v: bay.contracts.a / bay.contracts.b },
      ])}
      {line(words(cfg, S.nextDerelict), [{ text: words(cfg, S.transmissions, bay.tx), v: bay.tx.a / bay.tx.b }])}
      {drop ? (
        <View style={[styles.counter, styles.dropRow]}>
          <View style={{ flex: 1 }}>
            <Mono size={10} weight="700" color={INK.text}>
              {S.supplyDrop}
            </Mono>
            <Mono size={10} color={ready > 0 ? INK.amber : INK.dim} caps={false} style={{ marginTop: 3 }}>
              {[ready < stored ? words(cfg, S.dropIn, { t: formatCountdown(secs * 1000) }) : '', words(cfg, S.dropStored, { n: `${ready}/${stored}` })].filter(Boolean).join(' · ')}
            </Mono>
          </View>
          {ready > 0 ? <Key small tone="gold" solid label={S.take} onPress={take} /> : null}
        </View>
      ) : null}
    </Bracket>
  );
}

function Opening({ cfg, id, chestId, rewards, next }: { cfg: H.HaulConfig; id: number; chestId: string; rewards: M.GrantedReward[]; next: string | null }) {
  const { width } = useWindowDimensions();
  const [revealed, setRevealed] = useState(false);
  const items = M.mergeSameCards(rewards);
  const best = items.reduce((r, x) => {
    if (x.type !== 'card') return r;
    const rr = cfg.meta.cards.find((c) => c.id === x.cardId)?.rarity ?? 'common';
    return RANK[rr] > RANK[r] ? rr : r;
  }, 'common');
  const light = RARITY[kitRarity(best)];
  const tier = tierOf(cfg, chestId);
  const played = useRef(false);
  useEffect(() => () => {
    played.current = false;
  }, []);
  const onRevealed = () => {
    if (played.current) return;
    played.current = true;
    setRevealed(true);
    fx.play(best === 'epic' || best === 'legendary' ? 'salvage_epic' : best === 'rare' ? 'salvage_rare' : 'salvage_common');
  };
  const name = cfg.meta.chests.find((c) => c.id === chestId)?.name ?? chestId;
  const cards = items.filter((x): x is Extract<M.GrantedReward, { type: 'card' }> => x.type === 'card');
  const others = items.filter((x) => x.type !== 'card');
  const size = Math.min(150, width * 0.36);
  return (
    <Bracket style={{ marginTop: 12, alignItems: 'center' }} color={light} label={name}>
      <PodCutter tier={tier} light={light} size={size} runKey={id} onRevealed={onRevealed} />
      {revealed ? (
        <View style={{ alignSelf: 'stretch' }}>
          {cards.length ? <Rule label={S.toTray} color={INK.line} /> : null}
          <View style={styles.tray}>
            {cards.map((x, i) => {
              const card = cfg.meta.cards.find((c) => c.id === x.cardId);
              const mod = cfg.haul.modules.find((m) => m.card === x.cardId);
              const rarity = kitRarity(card?.rarity ?? 'common');
              const level = Math.max(1, Math.min(5, ((useGame.getState().game as GameState).cards[x.cardId]?.level ?? 1)));
              return (
                <Animated.View key={x.cardId} entering={FadeInLeft.delay(120 + i * 160).duration(320)} style={styles.trayItem}>
                  <ArtImage id={`cart-s:${x.cardId}:${rarity}:${level}`} w={58} h={72} draw={(c) => {
                    c.scale(0.6, 0.6);
                    drawCartridge(c, { module: x.cardId, rarity, socket: (mod?.socket ?? 'rig') as 'rig', mark: level });
                  }} />
                  <View style={{ flex: 1 }}>
                    <Mono size={12} weight="700" color={INK.text} lines={1}>
                      {card?.name ?? x.cardId}
                    </Mono>
                    <Mono size={10} color={RARITY[rarity]}>{`${rarity} · ${words(cfg, x.copies === 1 ? S.parts1 : S.partsN, { n: x.copies })}`}</Mono>
                    {x.isNew ? (
                      <Mono size={9} weight="700" color={INK.green} style={{ marginTop: 2 }}>
                        {S.newModule}
                      </Mono>
                    ) : null}
                  </View>
                </Animated.View>
              );
            })}
          </View>
          {others.map((x, i) => (
            <Animated.View key={`${x.type}${i}`} entering={FadeInDown.delay(120 + (cards.length + i) * 160).duration(300)} style={styles.readout}>
              <HaulIcon name={x.type === 'gems' ? cfg.strings.gemIcon : cfg.strings.currencyIcon} size={22} />
              <Mono size={15} weight="700" color={x.type === 'gems' ? INK.dm : INK.gold}>
                {x.type === 'gems' ? `+${x.amount} ${cfg.strings.gemName}` : x.type === 'cash' ? `+${cfg.strings.currencySymbol}${formatShort(x.amount)}` : ''}
              </Mono>
            </Animated.View>
          ))}
          <Animated.View entering={FadeIn.delay(300 + items.length * 160)} style={styles.keys}>
            <Key tone="ghost" label={S.done} onPress={() => {
              fx.play('ui_close');
              useGame.getState().closeChest();
            }} style={{ flex: 1 }} />
            {next ? (
              <Key solid label={words(cfg, S.next, { pod: cfg.meta.chests.find((c) => c.id === next)?.name ?? '' })} onPress={() => {
                useGame.getState().closeChest();
                haulActions.openPod(next);
              }} style={{ flex: 1.5 }} />
            ) : null}
          </Animated.View>
        </View>
      ) : (
        <View style={{ height: 40 }} />
      )}
    </Bracket>
  );
}

const styles = StyleSheet.create({
  rackHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rail: { height: 3, backgroundColor: INK.edge, borderTopWidth: 1, borderTopColor: INK.lineDim },
  rack: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  cradle: { width: 30, height: 10, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#4B5F83', marginBottom: -2 },
  oddsKey: { alignItems: 'flex-start', marginTop: 12, marginBottom: 10 },
  counter: { marginBottom: 10 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  counterText: { width: 150 },
  dropRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 0 },
  tray: { gap: 8 },
  trayItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readout: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  keys: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
