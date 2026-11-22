/**
 * The stage strip under the scene: three chips, one per stage of the chain, each with its icon,
 * name and how much cash per second it can handle. It is both the read-out ("which stage holds
 * the restaurant back?") and the selector for the list under it.
 *
 * The limiting stage is filled with its colour and marked "▼ limits income". On purpose there is
 * no red and no sound: a bottleneck is a normal thing to fix, not an alarm.
 */
import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import type { Stage } from '../../engine/chain';
import { formatMoney } from '../../engine/format';
import { stageReadout } from '../../engine/view';
import { useGame } from '../../state/store';
import { GameIcon } from '../components/GameIcon';
import { useTarget } from '../hints/targets';
import { STAGES, alpha, useStages, useTheme, type StageInfo } from '../theme';
import { useHomeUi } from './uiState';

interface ChipProps {
  info: StageInfo;
  rate: number;
  limiting: boolean;
  selected: boolean;
  /** Replaces the rate: what the player has to do by hand (stations and transport before their hires). */
  prompt: string | null;
  height: number;
  compact: boolean;
}

const Chip = memo(function Chip({ info, rate, limiting, selected, prompt, height, compact }: ChipProps) {
  const t = useTheme();
  const setStage = useHomeUi((s) => s.setStage);
  const target = useTarget(`stage:${info.stage}`);
  const pop = useSharedValue(1);
  useEffect(() => {
    if (limiting) pop.value = withSequence(withTiming(1.06, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 300 }));
  }, [limiting, pop]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const fg = limiting ? '#FFFFFF' : t.c.text;
  const sub = limiting ? alpha('#FFFFFF', 0.92) : info.color;
  const label = prompt ?? `${formatMoney(rate, t.strings.currencySymbol)}/s`;
  return (
    <Pressable
      {...target}
      onPress={() => setStage(info.stage)}
      hitSlop={{ top: 4, bottom: 4 }}
      style={styles.chipWrap}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${info.name}: ${label}${limiting ? ', limits income' : ''}`}
    >
      <Animated.View
        style={[
          styles.chip,
          {
            height: height - 6,
            borderRadius: (height - 6) / 2.4,
            backgroundColor: limiting ? info.color : selected ? alpha(info.color, 0.14) : t.c.surface,
            borderColor: selected ? info.color : alpha(info.color, 0.35),
            borderWidth: selected ? 2 : 1,
          },
          popStyle,
        ]}
      >
        <GameIcon icon={info.icon} size={compact ? 17 : 19} />
        <View style={styles.chipText}>
          <Text style={[styles.chipName, { color: fg, fontSize: compact ? 9.5 : 10.5, lineHeight: compact ? 11 : 12 }]} numberOfLines={1}>
            {info.name}
          </Text>
          <Text style={[t.display, styles.chipRate, { color: prompt && !limiting ? info.color : sub, fontSize: prompt ? (compact ? 9.5 : 10.5) : compact ? 11.5 : 13, lineHeight: compact ? 13 : 15 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {label}
          </Text>
        </View>
      </Animated.View>
      {limiting ? (
        <View style={[styles.tag, { top: compact ? -12 : -10, backgroundColor: t.c.surface, borderColor: info.color }]} pointerEvents="none">
          <Text style={[styles.tagText, { color: info.color }]} numberOfLines={1}>
            ▼ limits income
          </Text>
        </View>
      ) : null}
      {selected ? <View style={[styles.caret, { borderTopColor: info.color }]} pointerEvents="none" /> : null}
    </Pressable>
  );
});

export function StageStrip({ height, compact }: { height: number; compact: boolean }) {
  const t = useTheme();
  const stages = useStages();
  const selected = useHomeUi((s) => s.stage);
  const bell = useGame((s) => s.cfg.sim?.transport.bellName ?? null);
  const r = useGame(
    useShallow((s) => {
      const venueId = s.game.activeVenue;
      const venue = s.game.venues[venueId];
      if (!venue) return { production: 0, transport: 0, sales: 0, limiting: 'production' as Stage, manual: false, manualProduction: false };
      const x = stageReadout(s.cfg, s.game, venueId, Date.now());
      // No station has its hire yet: the kitchen makes only what the player taps.
      const manualProduction = !Object.values(venue.businesses).some((b) => b.managed);
      return { production: x.production, transport: x.transport, sales: x.sales, limiting: x.limiting, manual: x.manualTransport, manualProduction };
    }),
  );
  return (
    <View style={[styles.strip, { height, backgroundColor: t.c.backgroundAlt }]}>
      {STAGES.map((stage: Stage) => (
        <Chip
          key={stage}
          info={stages[stage]}
          rate={r[stage]}
          limiting={r.limiting === stage}
          selected={selected === stage}
          prompt={stage === 'transport' && r.manual ? `👆 ${bell ?? 'Bell'}` : stage === 'production' && r.manualProduction ? '👆 Tap to start' : null}
          height={height}
          compact={compact}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 6, zIndex: 2 },
  chipWrap: { flex: 1, minWidth: 0, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, gap: 4 },
  chipText: { flex: 1, minWidth: 0 },
  chipName: { fontWeight: '800' },
  chipRate: {},
  tag: { position: 'absolute', alignSelf: 'center', borderRadius: 8, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 0 },
  tagText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.2 },
  caret: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
