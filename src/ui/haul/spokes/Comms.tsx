/**
 * Comms (spec 4.6, 5.3; the shared missions in this game's container).
 *
 * Pinned at the top: the day shift (Decision 53, in place of a daily gift ladder): the first 3
 * contracts met in each shift pay their bonus twice. Three shift lamps (lit while a double is left),
 * "DAY SHIFT · 2 OF 3 LEFT", and when all are used the real time until the next shift can start
 * (the calendar day has changed and 16 h have passed since this one began).
 * Below: a radio log with two open channels. Each mission is a transmission: the call-sign plate of
 * whoever sent it (from the line's "CALLSIGN:" prefix and the config's characters), the line in the
 * terminal face, a thin gauge, the reward; a done one shows "Acknowledge" (the shared claim plus
 * ackTransmission: every 4th adds a Derelict Cache). The archive holds the story lines received.
 *
 * Data: meta.missionViews, H.shiftView and haulStats.shift. Action: haulActions.acknowledge.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { formatNumber } from '../../../engine/format';
import * as H from '../../../engine/haul';
import * as M from '../../../engine/meta';
import type { GameState } from '../../../engine/types';
import { haulActions } from '../../../modes/haul/actions';
import { formatCountdown, useNow } from '../../kit';
import { HaulIcon } from '../art/HaulIcon';
import { useHaul, useHaulCfg } from './spokeData';
import { Bracket, Gauge, INK, Key, Mono, Rule } from './spokeKit';
import { SPOKE_STRINGS as S, words } from './spokeStrings';
import { SpokeFrame } from './SpokeFrame';

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
      <DayShift cfg={cfg} />
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

function DayShift({ cfg }: { cfg: H.HaulConfig }) {
  const now = useNow(1000);
  const st = useHaul((c, g) => {
    const v = H.shiftView(c, g);
    return { ...v, startedAt: g.haulStats.shift?.startedAt ?? 0, started: !!g.haulStats.shift };
  }, { left: 0, of: 0, mult: 2, startedAt: 0, started: false });
  // The next shift needs a new calendar day and minHours since this one started (haulShift).
  const nextAt = Math.max(now + M.msUntilNextDay(now), st.startedAt + cfg.haul.shift.minHours * 3600 * 1000);
  const line = st.left > 0 ? words(cfg, S.shiftLeft, { n: st.left, of: st.of }) : words(cfg, S.shiftDone);
  return (
    <Bracket label={S.shiftTitle} color={st.left > 0 ? INK.green : INK.lineDim}>
      <View style={styles.lamps}>
        {Array.from({ length: st.of }, (_, i) => {
          const on = i < st.left;
          return (
            <View key={i} style={[styles.lamp, { borderColor: on ? INK.green : INK.edge, backgroundColor: on ? 'rgba(61,220,151,0.14)' : 'transparent' }]}>
              <Mono size={13} weight="700" color={on ? INK.green : INK.faint}>
                {words(cfg, S.shiftMult, { m: st.mult })}
              </Mono>
            </View>
          );
        })}
      </View>
      <Mono size={13} weight="700" color={st.left > 0 ? INK.text : INK.dim} style={{ marginTop: 8 }}>
        {line}
      </Mono>
      <Mono size={10} color={INK.dim} caps={false} style={{ marginTop: 3 }}>
        {st.left > 0 || !st.started ? words(cfg, S.shiftRule, { n: st.of, m: st.mult }) : words(cfg, S.shiftNext, { t: formatCountdown(Math.max(0, nextAt - now)) })}
      </Mono>
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
  lamps: { flexDirection: 'row', gap: 10, marginTop: 4 },
  lamp: { flex: 1, height: 40, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
