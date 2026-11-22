/**
 * The missions dialog (store modal { type: 'missions' }): today's count against the daily limit,
 * the milestone track ("every 5th mission: a chest"), and the open missions with their real
 * progress, reward and a Claim button. Slots shift after a claim, so every render reads the
 * list fresh from the engine and Claim uses the index it was given in that same render.
 * When the daily limit is reached the list rests with a friendly "New missions tomorrow" and the
 * real time left; nothing here expires or is lost by not playing.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import type { GameConfig, Reward } from '../../../config/schema';
import type { MissionTemplate } from '../../../config/schema.sim';
import * as E from '../../../engine/economy';
import { formatMoney, formatNumber } from '../../../engine/format';
import * as M from '../../../engine/meta';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { useTarget } from '../../hints/targets';
import { describeReward, ProgressBar, Sheet } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { Countdown, Shine, useFlyFrom, withGemFlight } from '../shop/parts';

/** An icon for each kind of mission, from the game's own config where it has one. */
function typeIcon(cfg: GameConfig, type: MissionTemplate['type']): string {
  switch (type) {
    case 'serve':
      return cfg.sim?.sales.icon ?? '🛎️';
    case 'earn':
      return cfg.strings.currencyIcon;
    case 'levels':
      return '⬆️';
    case 'taps':
      return '👆';
    case 'bonus':
      return cfg.theme.icons.bonus;
    case 'chests':
      return cfg.meta.chests[0]?.icon ?? '🎁';
    case 'rush':
      return '⚡';
    case 'hires':
      return cfg.theme.icons.manager;
  }
}

export function MissionsSheet() {
  const t = useTheme();
  const open = useGame((s) => s.modal?.type === 'missions');
  const close = useGame((s) => s.closeModal);
  const cfg = useGame((s) => s.cfg);
  // Plain numbers and strings only, so the dialog re-renders when progress really moves.
  const rows = useGame(useShallow((s) => M.missionViews(s.cfg, s.game).map((m) => `${m.index}|${m.templateId}|${m.progress}|${m.target}`)));
  const total = useGame((s) => s.game.missions.total);
  const doneToday = useGame((s) => (s.game.missions.day === E.dayKey(Date.now()) ? s.game.missions.doneToday : 0));
  if (!open) return null;

  const m = cfg.meta.missions;
  const limitReached = doneToday >= m.perDay;
  const now = Date.now();

  return (
    <Sheet visible onClose={close} title="Missions" icon="📋">
      {m.templates.length === 0 ? (
        <Text style={[styles.empty, { color: t.c.textMuted }]}>No missions in this game yet.</Text>
      ) : (
        <>
          <View style={[styles.today, { backgroundColor: alpha(t.c.text, 0.05), borderRadius: t.radius * 0.6 }]}>
            <Text style={[styles.todayText, { color: t.c.text }]}>Today</Text>
            <View style={{ flex: 1 }}>
              <ProgressBar value={doneToday / m.perDay} height={14} color={t.c.success} />
            </View>
            <Text style={[styles.todayText, t.display, { color: t.c.text }]}>
              {Math.min(doneToday, m.perDay)} / {m.perDay}
            </Text>
          </View>

          {m.milestones.length > 0 ? <Milestones total={total} /> : null}

          {rows.length === 0 ? (
            <View style={[styles.rest, { backgroundColor: alpha(t.c.success, 0.1), borderRadius: t.radius * 0.7 }]}>
              <Text style={{ fontSize: 40 }}>🌙</Text>
              <Text style={[styles.restTitle, t.display, { color: t.c.text }]}>{limitReached ? 'All done for today!' : 'New missions soon'}</Text>
              <Text style={[styles.restSub, { color: t.c.textMuted }]}>
                {limitReached ? 'New missions tomorrow. ' : ''}
                <Countdown until={now + M.msUntilNextDay(now)} prefix="Next ones in " style={{ fontWeight: '800' }} />
              </Text>
            </View>
          ) : (
            rows.map((r) => {
              const [index, templateId, progress, target] = r.split('|');
              return <MissionRow key={`${index}:${templateId}`} index={Number(index)} templateId={templateId} progress={Number(progress)} target={Number(target)} />;
            })
          )}
        </>
      )}
    </Sheet>
  );
}

/** The "every Nth mission" rewards: a pip track toward the nearest one, then a line for each. */
function Milestones({ total }: { total: number }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const list = [...cfg.meta.missions.milestones].sort((a, b) => a.every - b.every);
  const first = list[0];
  const inRun = total % first.every;
  return (
    <View style={[styles.milestones, { borderColor: alpha(t.c.accent, 0.45), borderRadius: t.radius * 0.7 }]}>
      <View style={styles.track}>
        {Array.from({ length: first.every }, (_, i) => {
          const filled = i < inRun;
          const last = i === first.every - 1;
          return (
            <View key={i} style={styles.pipWrap}>
              {last ? (
                <View style={[styles.goal, { backgroundColor: alpha(t.c.accent, 0.22), borderColor: t.c.accent }]}>
                  <GameIcon icon={describeReward(cfg, first.reward).icon} size={26} />
                </View>
              ) : (
                <View style={[styles.pip, { backgroundColor: filled ? t.c.success : alpha(t.c.text, 0.1) }]}>
                  {filled ? <Text style={styles.pipCheck}>✓</Text> : null}
                </View>
              )}
            </View>
          );
        })}
      </View>
      {list.map((ms) => {
        const toGo = ms.every - (total % ms.every);
        const info = describeReward(cfg, ms.reward);
        return (
          <View key={ms.every} style={styles.msRow}>
            <GameIcon icon={info.icon} size={20} />
            <Text style={[styles.msText, { color: t.c.text }]} numberOfLines={2}>
              Every {ordinal(ms.every)} mission: {info.label}
            </Text>
            <Text style={[styles.msToGo, { color: t.c.textMuted }]} numberOfLines={1}>
              {toGo} to go
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
}

function rewardShort(cfg: GameConfig, r: Reward): { icon: string; text: string } {
  if (r.type === 'gems') return { icon: cfg.strings.gemIcon, text: `+${formatNumber(r.amount)}` };
  const info = describeReward(cfg, r);
  return { icon: info.icon, text: info.label };
}

function MissionRow({ index, templateId, progress, target }: { index: number; templateId: string; progress: number; target: number }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const claim = useGame((s) => s.claimMission);
  const tpl = cfg.meta.missions.templates.find((x) => x.id === templateId);
  const done = progress >= target;
  const claimTarget = useTarget(done ? `claimMission:${index}` : null);
  const { ref, emit } = useFlyFrom();
  if (!tpl) return null;
  const isMoney = tpl.type === 'earn';
  const fmt = (n: number) => (isMoney ? formatMoney(n, cfg.strings.currencySymbol) : formatNumber(n));
  const text = tpl.text.replace('{n}', fmt(target));
  const reward = rewardShort(cfg, tpl.reward);
  return (
    <View
      style={[
        styles.mission,
        { backgroundColor: done ? alpha(t.c.success, 0.1) : alpha(t.c.text, 0.04), borderColor: done ? t.c.success : 'transparent', borderRadius: t.radius * 0.7 },
      ]}
    >
      <View style={styles.missionTop}>
        <View style={[styles.mIcon, { backgroundColor: t.c.surface }]}>
          <GameIcon icon={typeIcon(cfg, tpl.type)} size={28} />
        </View>
        <Text style={[styles.mText, t.display, { color: t.c.text }]} numberOfLines={2}>
          {text}
        </Text>
        <View style={[styles.reward, { backgroundColor: t.c.surface, borderRadius: 12 }]}>
          <GameIcon icon={reward.icon} size={20} />
          <Text style={[styles.rewardText, t.display, { color: t.c.text }]} numberOfLines={1}>
            {reward.text}
          </Text>
        </View>
      </View>
      {done ? (
        <View {...claimTarget} style={{ marginTop: 8 }}>
          <View ref={ref} collapsable={false}>
            <Button variant="success" label="Claim" onPress={() => withGemFlight(() => claim(index), emit)} />
            <Shine radius={t.radius * 0.75} />
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          <ProgressBar value={progress / target} height={18} label={`${fmt(progress)} / ${fmt(target)}`} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', fontWeight: '700', marginVertical: 24 },
  today: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  todayText: { fontSize: 14, fontWeight: '800' },
  milestones: { marginTop: 10, padding: 10, borderWidth: 1.5, gap: 4 },
  track: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pipWrap: { flex: 1, alignItems: 'center' },
  pip: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pipCheck: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  goal: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  msRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  msText: { flex: 1, fontSize: 12, fontWeight: '700' },
  msToGo: { fontSize: 12, fontWeight: '800' },
  rest: { alignItems: 'center', padding: 18, marginTop: 12, gap: 4 },
  restTitle: { fontSize: 20 },
  restSub: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  mission: { marginTop: 10, padding: 10, borderWidth: 2 },
  missionTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mText: { flex: 1, fontSize: 16 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 120 },
  rewardText: { fontSize: 14, flexShrink: 1 },
});
