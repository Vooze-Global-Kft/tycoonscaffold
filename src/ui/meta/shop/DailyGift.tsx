/**
 * The daily gift: today's gems, big, with one Claim button, and the coming days in a row so
 * the player sees tomorrow's gift today. It counts days, it never scolds: there is no "streak
 * lost" anywhere, a missed day simply continues the row from where the engine puts it.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as E from '../../../engine/economy';
import * as M from '../../../engine/meta';
import { formatNumber } from '../../../engine/format';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { alpha, textOn, useTheme } from '../../theme';
import { Countdown, OfferCard, Shine, ShopSection, useFlyFrom, withGemFlight } from './parts';

export function DailyGift() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const daily = useGame((s) => s.game.daily);
  const claim = useGame((s) => s.claimDaily);
  const { ref, emit } = useFlyFrom();
  // The row of days comes from the engine: the gift table cycles, and it counts days claimed.
  const now = Date.now();
  const canClaim = useGame((s) => E.canClaimDaily(s.game, now));
  const days = useMemo(() => E.dailyCalendar(cfg, { ...useGame.getState().game, daily }, now), [cfg, daily, canClaim]); // eslint-disable-line react-hooks/exhaustive-deps
  if (days.length === 0) return null;
  // Today's day: the one to claim, or the one claimed today.
  const current = days.find((d) => d.today) ?? days.find((d) => d.claim === Math.max(1, daily.streak)) ?? days[0];
  const day = current.day;
  const todayGems = current.gems;

  return (
    <ShopSection title="Daily gift" note={canClaim ? null : <Countdown until={Date.now() + M.msUntilNextDay(Date.now())} prefix="Next gift in " style={[styles.note, { color: t.c.textMuted }]} />}>
      <OfferCard tint={t.c.success} strong={canClaim}>
        <View style={styles.top}>
          <View style={[styles.giftWrap, { backgroundColor: alpha(t.c.success, 0.14) }]}>
            <GameIcon icon={t.icons.gift} size={52} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: t.c.textMuted }]}>{canClaim ? `Day ${day}` : `Day ${day} claimed`}</Text>
            <View style={styles.amountRow}>
              <GameIcon icon={t.strings.gemIcon} size={28} />
              <Text style={[styles.amount, t.display, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatNumber(todayGems)} {t.strings.gemName}
              </Text>
            </View>
            <Text style={[styles.sub, { color: t.c.textMuted }]} numberOfLines={2}>
              {canClaim ? 'A free gift, every day you play.' : 'See you tomorrow for the next one.'}
            </Text>
          </View>
        </View>
        <View style={styles.days}>
          {days.map((d) => {
            const { claimed, today } = d;
            return (
              <View
                key={d.claim}
                style={[
                  styles.day,
                  {
                    borderRadius: t.radius * 0.5,
                    backgroundColor: today ? t.c.success : claimed ? alpha(t.c.success, 0.12) : alpha(t.c.text, 0.05),
                    borderColor: today ? t.c.success : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.dayLabel, { color: today ? textOn(t.c.success) : t.c.textMuted }]} numberOfLines={1}>
                  Day {d.day}
                </Text>
                {claimed ? (
                  <Text style={[styles.check, { color: t.c.success }]}>✓</Text>
                ) : (
                  <GameIcon icon={t.strings.gemIcon} size={18} />
                )}
                <Text style={[styles.dayGems, t.display, { color: today ? textOn(t.c.success) : t.c.text }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatNumber(d.gems)}
                </Text>
              </View>
            );
          })}
        </View>
        <View ref={ref} collapsable={false}>
          <Button
            variant="success"
            label={canClaim ? `Claim ${formatNumber(todayGems)} ${t.strings.gemName}` : 'Claimed today'}
            disabled={!canClaim}
            onPress={() => withGemFlight(claim, emit)}
          />
          {canClaim ? <Shine radius={t.radius * 0.75} /> : null}
        </View>
      </OfferCard>
    </ShopSection>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 12, fontWeight: '800' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  giftWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { fontSize: 26, flexShrink: 1 },
  sub: { fontSize: 12, fontWeight: '600' },
  days: { flexDirection: 'row', gap: 4, marginTop: 12, marginBottom: 12 },
  day: { flex: 1, alignItems: 'center', paddingVertical: 6, borderWidth: 1.5, minHeight: 64, justifyContent: 'space-between' },
  dayLabel: { fontSize: 11, fontWeight: '900' },
  check: { fontSize: 16, fontWeight: '900', lineHeight: 18 },
  dayGems: { fontSize: 13 },
});
