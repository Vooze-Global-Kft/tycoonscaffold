/**
 * The road of venues, first to last, as a vertical journey: a rail with a node per venue and a card
 * beside it. Open venues say what they earn and let the player jump there; the next one shows its
 * price, how close the cash is and the Unlock button; the ones after it are teased (icon and place
 * only) so the road visibly goes on without spoiling what is at the end.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import type { Venue } from '../../../config/schema.sim';
import * as E from '../../../engine/economy';
import { formatDuration, formatMoney, formatNumber } from '../../../engine/format';
import { useGame } from '../../../state/store';
import { GameIcon } from '../../components/GameIcon';
import { useTarget } from '../../hints/targets';
import { Pill, SectionTitle } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { PriceButton } from '../upgrades/PriceButton';
import { closeEnough, usePaced } from './paced';

type VenueStatus = 'open' | 'next' | 'later';

const RAIL = 34;

export function VenueJourney() {
  const venues = useGame((s) => s.cfg.sim?.venues ?? null);
  const statuses = useGame(
    useShallow((s): VenueStatus[] => {
      const list = s.cfg.sim?.venues ?? [];
      const next = E.nextVenueToUnlock(s.cfg, s.game);
      return list.map((v) => (s.game.venues[v.id]?.unlocked ? 'open' : v.id === next ? 'next' : 'later'));
    }),
  );
  if (!venues) return null;
  const open = statuses.filter((s) => s === 'open').length;
  return (
    <View>
      <SectionTitle right={<OpenCount open={open} total={venues.length} />}>YOUR VENUES</SectionTitle>
      <View style={styles.journey}>
        {venues.map((v, i) => (
          <JourneyStep key={v.id} venue={v} status={statuses[i]} first={i === 0} last={i === venues.length - 1} prevName={i > 0 ? (venues[i - 1].place ?? '') : ''} />
        ))}
      </View>
    </View>
  );
}

function OpenCount({ open, total }: { open: number; total: number }) {
  const t = useTheme();
  return (
    <Text style={[t.display, { color: t.c.text, fontSize: 14 }]}>
      {open}
      <Text style={{ color: t.c.textMuted }}> of {total} open</Text>
    </Text>
  );
}

function JourneyStep({ venue, status, first, last, prevName }: { venue: Venue; status: VenueStatus; first: boolean; last: boolean; prevName: string }) {
  const t = useTheme();
  const lineDone = alpha(t.c.success, 0.7);
  const lineTodo = alpha(t.c.text, 0.14);
  return (
    <View style={styles.step}>
      <View style={styles.rail}>
        <View style={[styles.line, { top: 0, height: 26, backgroundColor: first ? 'transparent' : status === 'open' || status === 'next' ? lineDone : lineTodo }]} />
        <View style={[styles.line, { top: 26, bottom: 0, backgroundColor: last ? 'transparent' : status === 'open' ? lineDone : lineTodo }]} />
        <Node status={status} />
      </View>
      <View style={{ flex: 1 }}>
        {status === 'open' ? <OpenVenue venue={venue} /> : status === 'next' ? <NextVenue venue={venue} /> : <LaterVenue venue={venue} prevName={prevName} />}
      </View>
    </View>
  );
}

/** The dot on the rail: a check for open venues, a gently pulsing ring for the next one, a lock after. */
function Node({ status }: { status: VenueStatus }) {
  const t = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (status === 'next') pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), -1);
    else pulse.value = 0;
  }, [status, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: status === 'next' ? 0.55 * (1 - pulse.value) : 0, transform: [{ scale: 1 + pulse.value * 0.9 }] }));
  const bg = status === 'open' ? t.c.success : status === 'next' ? t.c.accent : t.c.surface;
  return (
    <View style={styles.nodeWrap}>
      <Animated.View style={[styles.node, styles.nodeRing, { backgroundColor: t.c.accent }, ring]} />
      <View style={[styles.node, { backgroundColor: bg, borderColor: status === 'later' ? alpha(t.c.text, 0.2) : t.c.surface }]}>
        <Text style={[styles.nodeText, { color: status === 'later' ? t.c.textMuted : '#FFFFFF' }]}>{status === 'open' ? '✓' : status === 'next' ? '★' : '🔒'}</Text>
      </View>
    </View>
  );
}

function VenueIcon({ venue, size, dim }: { venue: Venue; size: number; dim?: boolean }) {
  const t = useTheme();
  const tint = venue.palette?.wall ?? t.c.accent;
  return (
    <View style={[{ width: size + 14, height: size + 14, borderRadius: (size + 14) / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(tint, dim ? 0.12 : 0.22) }]}>
      <View style={{ opacity: dim ? 0.45 : 1 }}>
        <GameIcon icon={venue.icon} size={size} />
      </View>
    </View>
  );
}

function OpenVenue({ venue }: { venue: Venue }) {
  const t = useTheme();
  const active = useGame((s) => s.game.activeVenue === venue.id);
  const setVenue = useGame((s) => s.setVenue);
  const income = usePaced((s) => E.venueIncomePerSecond(s.cfg, s.game, venue.id, Date.now()), 1000, closeEnough);
  return (
    <View style={[styles.card, { backgroundColor: t.c.surface, borderRadius: t.radius }, active && { borderWidth: 2, borderColor: t.c.accent }]}>
      <VenueIcon venue={venue} size={34} />
      <View style={styles.text}>
        <Text style={[t.display, styles.name, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {venue.name}
        </Text>
        {venue.place ? (
          <Text style={[styles.place, { color: t.c.textMuted }]} numberOfLines={1}>
            {venue.place}
          </Text>
        ) : null}
        <Text style={[t.display, styles.income, { color: t.c.success }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {income > 0 ? `+${formatMoney(income, t.strings.currencySymbol)}/s` : 'Earning by hand for now'}
        </Text>
      </View>
      {active ? (
        <View style={styles.here}>
          <Pill color={alpha(t.c.accent, 0.2)} textColor={t.c.text}>
            ON SCREEN
          </Pill>
        </View>
      ) : (
        <PriceButton label="Go" onPress={() => setVenue(venue.id)} variant="ghost" style={{ minWidth: 72 }} />
      )}
    </View>
  );
}

function NextVenue({ venue }: { venue: Venue }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const unlockVenue = useGame((s) => s.unlockVenue);
  const cost = E.venueUnlockCost(cfg, venue.id);
  const affordable = useGame((s) => s.game.cash >= cost);
  const cash = usePaced((s) => s.game.cash, 1000, closeEnough);
  const income = usePaced((s) => E.incomePerSecond(s.cfg, s.game, Date.now()), 1000, closeEnough);
  const target = useTarget(`unlockVenue:${venue.id}`);
  const firstName = cfg.sim?.venues[0]?.name ?? '';
  const frac = cost > 0 ? Math.min(1, cash / cost) : 1;
  const eta = income > 0 && !affordable ? (cost - cash) / income : Infinity;

  const fill = useSharedValue(frac);
  useEffect(() => {
    fill.value = withTiming(frac, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [frac, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={[styles.card, styles.nextCard, { backgroundColor: t.c.surface, borderRadius: t.radius, borderColor: t.c.accent }]}>
      <View style={styles.nextTop}>
        <VenueIcon venue={venue} size={44} />
        <View style={styles.text}>
          <Pill>NEXT</Pill>
          <Text style={[t.display, styles.nextName, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {venue.name}
          </Text>
          {venue.place ? (
            <Text style={[styles.place, { color: t.c.textMuted }]} numberOfLines={1}>
              {venue.place}
            </Text>
          ) : null}
        </View>
      </View>
      {venue.blurb ? (
        <Text style={[styles.blurb, { color: t.c.text }]} numberOfLines={2}>
          “{venue.blurb}”
        </Text>
      ) : null}
      <View style={[styles.track, { backgroundColor: alpha(t.c.text, 0.1) }]}>
        <Animated.View style={[styles.fill, { backgroundColor: affordable ? t.c.success : t.c.progress }, fillStyle]} />
        <Text style={[t.display, styles.trackLabel, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {formatMoney(Math.min(cash, cost), t.strings.currencySymbol)} / {formatMoney(cost, t.strings.currencySymbol)}
        </Text>
      </View>
      <View style={styles.nextBottom}>
        <Text style={[styles.eta, { color: affordable ? t.c.success : t.c.text }]} numberOfLines={2}>
          {affordable ? 'Ready to open!' : Number.isFinite(eta) && eta < 86400 * 7 ? `About ${formatDuration(eta)} at your current income` : 'Keep growing to afford it'}
        </Text>
        <View {...target}>
          <PriceButton label="Unlock" price={formatMoney(cost, t.strings.currencySymbol)} variant={affordable ? 'success' : 'ghost'} onPress={() => unlockVenue(venue.id)} />
        </View>
      </View>
      <Text style={[styles.note, { color: t.c.textMuted }]}>
        Prices and earnings here are ×{formatNumber(venue.scale)}
        {firstName && venue.scale !== 1 ? ` those of ${firstName}` : ''}. Every open venue keeps earning while you play in another.
      </Text>
    </View>
  );
}

function LaterVenue({ venue, prevName }: { venue: Venue; prevName: string }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: alpha(t.c.surface, 0.55), borderRadius: t.radius, borderStyle: 'dashed', borderWidth: 1.5, borderColor: alpha(t.c.text, 0.15) }]}>
      <VenueIcon venue={venue} size={28} dim />
      <View style={styles.text}>
        <Text style={[t.display, styles.name, { color: t.c.textMuted }]} numberOfLines={1}>
          {venue.place ?? '? ? ?'}
        </Text>
        <Text style={[styles.place, { color: t.c.textMuted }]} numberOfLines={1}>
          {prevName ? `Opens after ${prevName}` : 'Still a mystery'}
        </Text>
      </View>
      <Text style={[t.display, { color: alpha(t.c.text, 0.25), fontSize: 20 }]}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  journey: { paddingRight: 12, paddingLeft: 4 },
  step: { flexDirection: 'row' },
  rail: { width: RAIL, alignItems: 'center' },
  line: { position: 'absolute', width: 3, left: RAIL / 2 - 1.5, borderRadius: 1.5 },
  nodeWrap: { marginTop: 14, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  node: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  nodeRing: { position: 'absolute', borderWidth: 0 },
  nodeText: { fontSize: 11, fontWeight: '900' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 8, minHeight: 64 },
  nextCard: { flexDirection: 'column', alignItems: 'stretch', borderWidth: 2, padding: 12 },
  nextTop: { flexDirection: 'row', alignItems: 'center' },
  nextBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  text: { flex: 1, marginHorizontal: 10 },
  name: { fontSize: 16 },
  nextName: { fontSize: 20, marginTop: 3 },
  place: { fontSize: 12, fontWeight: '700', marginTop: 1 },
  income: { fontSize: 14, marginTop: 2 },
  here: { paddingHorizontal: 4 },
  blurb: { fontSize: 13, fontStyle: 'italic', marginTop: 8 },
  track: { height: 22, borderRadius: 11, overflow: 'hidden', justifyContent: 'center', marginTop: 10 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 11 },
  trackLabel: { textAlign: 'center', fontSize: 12, paddingHorizontal: 8 },
  eta: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 17 },
  note: { fontSize: 11, fontWeight: '600', lineHeight: 15, marginTop: 8 },
});
