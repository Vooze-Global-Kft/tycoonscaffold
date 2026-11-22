/**
 * Comms (spec 4.6, 5.3, 5.4; the shared missions and daily gift in this game's container).
 *
 * Pinned at the top: the Daily Allotment as a 5-dish relay (art kit DishRelay, errata 38): a dish
 * lights for each day of the current cycle received, today's dish pulses when ready, the amount
 * of each day under its dish, "Receive · 12 DM" or the real time to the next allotment.
 * Below: a radio log with two open channels. Each mission is a transmission: the call-sign plate of
 * whoever sent it (from the line's "CALLSIGN:" prefix and the config's characters), the line in the
 * terminal face, a thin gauge, the reward; a done one shows "Acknowledge" (the shared claim plus
 * ackTransmission: every 4th adds a Derelict Cache). The archive holds the story lines received.
 *
 * Data: meta.missionViews, economy.dailyCalendar / canClaimDaily / dailyReward. Actions:
 * haulActions.acknowledge, receiveAllotment.
 */
import { Canvas, Group, Picture } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, FadeOutUp, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import * as E from '../../../engine/economy';
import { formatNumber } from '../../../engine/format';
import type * as H from '../../../engine/haul';
import * as M from '../../../engine/meta';
import type { GameState } from '../../../engine/types';
import { haulActions } from '../../../modes/haul/actions';
import { formatCountdown, useNow } from '../../kit';
import { HaulIcon } from '../art/HaulIcon';
import { relayDishes } from '../art/spokes.draw';
import { spokePictures } from '../art/Spokes';
import { useHaul, useHaulCfg } from './spokeData';
import { Bracket, Gauge, INK, Key, Mono, Rule } from './spokeKit';
import { SPOKE_STRINGS as S, words } from './spokeStrings';
import { GUTTER, SpokeFrame } from './SpokeFrame';

interface Transmission {
  index: number;
  sign: string;
  portrait: string | null;
  color: string;
  line: string;
  progress: number;
  target: number;
  done: boolean;
  reward: string;
  rewardIcon: string | null;
}

/** Splits "OPS-2: Clear the pad 3 times." into the sender (a config character) and the line. */
function sender(cfg: H.HaulConfig, text: string): { sign: string; portrait: string | null; color: string; line: string } {
  const i = text.indexOf(': ');
  const sign = i > 0 ? text.slice(0, i) : '';
  const ch = cfg.characters.find((c) => c.name === sign);
  return { sign, portrait: ch?.portrait ?? null, color: ch?.color ?? INK.line, line: i > 0 ? text.slice(i + 2) : text };
}

function logOf(cfg: H.HaulConfig, g: H.HaulGame) {
  const game = g as unknown as GameState;
  const tx: Transmission[] = M.missionViews(cfg, game).map((m) => {
    const s = sender(cfg, m.text);
    const r = m.reward;
    const reward = r.type === 'gems' ? `${r.amount} ${S.dmShort}` : r.type === 'chest' ? (cfg.meta.chests.find((c) => c.id === r.chestId)?.name ?? '') : r.type === 'cash' ? cfg.strings.currencySymbol : '';
    return { index: m.index, ...s, progress: m.progress, target: m.target, done: m.done, reward, rewardIcon: r.type === 'gems' ? cfg.strings.gemIcon : null };
  });
  const quietToday = game.missions.doneToday + tx.length >= cfg.meta.missions.perDay;
  const archive = [...game.storySeen]
    .reverse()
    .map((id) => cfg.story.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .slice(0, 12)
    .map((b) => {
      const ch = cfg.characters.find((c) => c.id === b.characterId);
      return { id: b.id, sign: ch?.name ?? '', portrait: ch?.portrait ?? null, color: ch?.color ?? INK.dim, line: b.lines.join(' ') };
    });
  const every = cfg.haul.pods.transmissionsEvery;
  return { tx, slots: cfg.meta.missions.slots, quietToday, archive, acked: (g.stats.transmissionsAcked ?? 0) % every, every };
}

export function Comms() {
  const cfg = useHaulCfg();
  const log = useHaul((c, g) => logOf(c, g), { tx: [], slots: 2, quietToday: false, archive: [], acked: 0, every: 4 });
  const channels = Array.from({ length: log.slots }, (_, i) => log.tx[i] ?? null);
  return (
    <SpokeFrame title={S.commsTitle} code={S.commsCode}>
      <Relay cfg={cfg} />
      <Rule label={`${S.channel.replace('{n}', '1')} / ${S.channel.replace('{n}', String(log.slots))}`} color={INK.lineDim} />
      {channels.map((t, i) => (
        <Channel key={t ? `tx${t.index}:${t.line}` : `quiet${i}`} cfg={cfg} n={i + 1} t={t} quiet={log.quietToday} />
      ))}
      <Mono size={10} color={INK.dim} caps={false} style={{ marginTop: 2 }}>
        {words(cfg, S.derelictEvery, { n: log.every, a: log.acked })}
      </Mono>
      <Rule label={S.archive} />
      {log.archive.length === 0 ? (
        <Mono size={10} color={INK.faint} caps={false}>
          {S.archiveEmpty}
        </Mono>
      ) : (
        log.archive.map((a) => (
          <View key={a.id} style={styles.archRow}>
            <Mono size={9} color={a.color} weight="700" style={{ width: 70 }} lines={1}>
              {a.sign}
            </Mono>
            <Mono size={10} color={INK.dim} caps={false} style={{ flex: 1 }}>
              {a.line}
            </Mono>
          </View>
        ))
      )}
    </SpokeFrame>
  );
}

function Relay({ cfg }: { cfg: H.HaulConfig }) {
  const { width } = useWindowDimensions();
  const now = useNow(1000);
  const st = useHaul((c, g) => {
    const game = g as unknown as GameState;
    const t = Date.now();
    const cal = E.dailyCalendar(c, game, t);
    return { days: cal.map((d) => ({ gems: d.gems, claimed: d.claimed, today: d.today })), can: E.canClaimDaily(game, t), next: E.dailyReward(c, game, t).gems, minute: Math.floor(t / 60000) };
  }, { days: [], can: false, next: 0, minute: 0 });
  const w = width - 2 * GUTTER - 24;
  const lit = st.days.filter((d) => d.claimed).length;
  const pic = spokePictures.dishRelay(w, lit, st.can);
  const dishes = relayDishes(w);
  const ph = Math.round(w * 0.3);
  // Under the picture's day numbers (spokes.draw.ts: number at 13 s, s = w / 300 × 1.6).
  const amtTop = Math.round(ph / 2 + (w / 300) * 1.6 * 19);

  // Today's dish breathes while the allotment waits (stops when received or the spoke closes).
  const glow = useSharedValue(0);
  useEffect(() => {
    if (st.can) glow.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true);
    else {
      cancelAnimation(glow);
      glow.value = 0;
    }
    return () => cancelAnimation(glow);
  }, [st.can, glow]);
  const todayIdx = st.days.findIndex((d) => d.today);
  const ring = useAnimatedStyle(() => ({ opacity: 0.25 + glow.value * 0.75, transform: [{ scale: 0.9 + glow.value * 0.2 }] }));
  const msLeft = M.msUntilNextDay(now);

  return (
    <Bracket label={S.allotment} color={st.can ? INK.line : INK.lineDim} right={<Mono size={10} color={INK.dim}>{`${lit}/${st.days.length}`}</Mono>}>
      <View style={{ width: w, height: amtTop + 16 }}>
        <Canvas style={{ width: w, height: ph }}>
          <Group transform={[{ translateX: w / 2 }, { translateY: ph / 2 }]}>
            <Picture picture={pic} />
          </Group>
        </Canvas>
        {todayIdx >= 0 && dishes[todayIdx] ? <Animated.View pointerEvents="none" style={[styles.todayRing, { left: w / 2 + dishes[todayIdx].x - 22, top: ph / 2 + dishes[todayIdx].y - 26 }, ring]} /> : null}
        {st.days.map((d, i) =>
          dishes[i] ? (
            <Mono key={i} size={9} weight="700" color={d.claimed ? INK.line : d.today ? INK.text : INK.faint} center style={[styles.dayAmt, { left: w / 2 + dishes[i].x - 24, top: amtTop }]}>
              {`${d.gems} ${S.dmShort}`}
            </Mono>
          ) : null,
        )}
      </View>
      {st.can ? (
        <Key solid label={words(cfg, S.receive, { n: formatNumber(st.next) })} onPress={haulActions.receiveAllotment} style={{ marginTop: 6 }} />
      ) : (
        <Mono size={11} color={INK.dim} center style={{ marginTop: 6 }}>
          {words(cfg, S.nextAllotment, { t: formatCountdown(msLeft) })}
        </Mono>
      )}
    </Bracket>
  );
}

function Channel({ cfg, n, t, quiet }: { cfg: H.HaulConfig; n: number; t: Transmission | null; quiet: boolean }) {
  if (!t)
    return (
      <View style={[styles.channel, { borderLeftColor: INK.edge }]}>
        <Mono size={10} color={INK.faint} weight="700">
          {S.channel.replace('{n}', String(n))}
        </Mono>
        <Mono size={11} color={INK.faint} caps={false} style={{ marginTop: 4 }}>
          {quiet ? S.channelQuiet : S.channelIdle}
        </Mono>
        <Static />
      </View>
    );
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOutUp.duration(220)} layout={LinearTransition.duration(200)} style={[styles.channel, { borderLeftColor: t.done ? INK.green : t.color }]}>
      <View style={styles.txHead}>
        {t.portrait ? <HaulIcon name={t.portrait} size={34} /> : <View style={styles.noPortrait} />}
        <View style={{ flex: 1 }}>
          <View style={styles.signRow}>
            <Mono size={10} weight="700" color={t.color}>
              {t.sign || S.channel.replace('{n}', String(n))}
            </Mono>
            <Mono size={9} color={INK.faint}>
              {S.channel.replace('{n}', String(n))}
            </Mono>
          </View>
          <Mono size={12} color={INK.text} caps={false} style={{ marginTop: 3 }}>
            {t.line}
          </Mono>
        </View>
      </View>
      <View style={styles.txFoot}>
        <View style={{ flex: 1 }}>
          <Gauge value={t.progress / Math.max(1, t.target)} color={t.done ? INK.green : t.color} />
          <Mono size={9} color={INK.dim} style={{ marginTop: 3 }}>{`${formatNumber(t.progress)}/${formatNumber(t.target)}`}</Mono>
        </View>
        <View style={styles.reward}>
          {t.rewardIcon ? <HaulIcon name={t.rewardIcon} size={16} /> : null}
          <Mono size={11} weight="700" color={INK.dm}>
            {t.reward}
          </Mono>
        </View>
        {t.done ? <Key small tone="green" solid label={S.acknowledge} onPress={() => haulActions.acknowledge(t.index)} /> : null}
      </View>
    </Animated.View>
  );
}

/** A quiet channel's carrier: a row of faint static bars (drawn as views; nothing animates). */
function Static() {
  const bars = [3, 6, 2, 8, 4, 2, 5, 7, 3, 2, 6, 3, 2, 4, 7, 2, 3, 5, 2, 6];
  return (
    <View style={styles.static}>
      {bars.map((h, i) => (
        <View key={i} style={{ width: 2, height: h, backgroundColor: INK.edge }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  channel: { borderLeftWidth: 2, paddingLeft: 10, paddingVertical: 10, paddingRight: 4, marginBottom: 10, backgroundColor: 'rgba(12,19,38,0.7)' },
  txHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noPortrait: { width: 34, height: 34, borderWidth: 1, borderColor: INK.edge },
  txFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingRight: 6 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  archRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  static: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 8, height: 8 },
  todayRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: INK.line },
  dayAmt: { position: 'absolute', width: 48 },
});
