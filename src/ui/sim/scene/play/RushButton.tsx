/**
 * The skill button [Rush] that floats over the walkway. Ready: tap to start it. Active: shows the
 * seconds left. Cooling down: shows the time left, and a tap offers (never forces) a rewarded ad
 * that makes it ready again. The ring around it is drawn in the effects canvas (Effects.tsx).
 */
import { useEffect, useReducer, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as E from '../../../../engine/economy';
import { fx } from '../../../../services/fx';
import { useGame } from '../../../../state/store';
import { GameIcon } from '../../../components/GameIcon';
import { formatCountdown, useNow } from '../../../kit';
import { alpha, useTheme } from '../../../theme';
import type { SceneLayout } from '../../layout';
import { sceneBus } from '../bus';
import { RUSH_FACE } from './Effects';
import type { RushPhase } from './shared';

/** Hit area of the button: larger than the drawn face, as the sheet asks (56 pt or more). */
export const RUSH_HIT = 60;
/** How long the ad offer stays open if the player does nothing. */
const CHIP_MS = 5000;

/**
 * Where the rush is in its cycle. Re-renders only when the phase changes (a timer is set for the
 * next change), never every second.
 */
export function useRushPhase(visible: boolean): { phase: RushPhase; until: number; readyAt: number } {
  const until = useGame((s) => s.game.rush.until);
  const readyAt = useGame((s) => s.game.rush.readyAt);
  const sim = useGame((s) => E.isSim(s.cfg));
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const now = Date.now();
  const phase: RushPhase = !visible || !sim ? 'hidden' : now < until ? 'active' : now < readyAt ? 'cooling' : 'ready';
  useEffect(() => {
    const next = phase === 'active' ? until : phase === 'cooling' ? readyAt : 0;
    if (!next) return;
    const id = setTimeout(bump, Math.max(0, next - Date.now()) + 30);
    return () => clearTimeout(id);
  }, [phase, until, readyAt]);
  return { phase, until, readyAt };
}

export function RushButton({ layout, phase, until, readyAt }: { layout: SceneLayout; phase: RushPhase; until: number; readyAt: number }) {
  const t = useTheme();
  const rush = useGame((s) => s.cfg.sim?.rush);
  const skipAds = useGame((s) => s.game.entitlements.skipRewarded);
  const startRush = useGame((s) => s.startRush);
  const adResetRush = useGame((s) => s.adResetRush);
  const [chip, setChip] = useState(false);
  const press = useSharedValue(1);

  // The offer closes by itself, and whenever the button leaves the cooling phase.
  useEffect(() => {
    if (!chip) return;
    if (phase !== 'cooling') return setChip(false);
    const id = setTimeout(() => setChip(false), CHIP_MS);
    return () => clearTimeout(id);
  }, [chip, phase]);

  const face = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  if (!rush || phase === 'hidden') return null;

  const onPress = () => {
    if (phase === 'ready') {
      startRush();
      if (E.isRushActive(useGame.getState().game, Date.now())) sceneBus.emit({ type: 'rush' });
    } else if (phase === 'cooling') {
      fx.play(chip ? 'ui_close' : 'ui_open');
      setChip(!chip);
    }
  };

  const { x, y } = layout.rush;
  const ready = phase === 'ready';
  const active = phase === 'active';
  const faceColor = ready ? t.c.primary : active ? t.c.stages.production : alpha('#3A2A1E', 0.88);
  return (
    <>
      {chip ? (
        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={[styles.chipWrap, { right: layout.width - x + RUSH_HIT / 2 + 2, top: y - 22 }]}>
          <Pressable
            onPress={() => {
              setChip(false);
              adResetRush();
            }}
            style={({ pressed }) => [styles.chip, { backgroundColor: t.c.surface, borderColor: t.c.primary, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            accessibilityRole="button"
            accessibilityLabel={`${skipAds ? '' : 'Watch an ad: '}${rush.name} ready now`}
          >
            <Text style={[t.display, styles.chipText, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {skipAds ? `${rush.name}: ready now` : `▶ Ad: ready now`}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
      <Pressable
        onPressIn={() => (press.value = withTiming(0.88, { duration: 70 }))}
        onPressOut={() => (press.value = withSpring(1, { damping: 7, stiffness: 320 }))}
        onPress={onPress}
        style={[styles.hit, { left: x - RUSH_HIT / 2, top: y - RUSH_HIT / 2 }]}
        accessibilityRole="button"
        accessibilityLabel={ready ? `Start ${rush.name}` : active ? `${rush.name} running` : `${rush.name} recharging`}
      >
        <Animated.View style={[styles.face, { backgroundColor: faceColor, borderColor: alpha('#FFFFFF', ready ? 0.9 : 0.35) }, face]}>
          {active ? (
            <Remaining to={until} big />
          ) : ready ? (
            <GameIcon icon={rush.icon} size={26} />
          ) : (
            <>
              <View style={{ opacity: 0.35, position: 'absolute' }}>
                <GameIcon icon={rush.icon} size={26} />
              </View>
              <Remaining to={readyAt} />
            </>
          )}
        </Animated.View>
      </Pressable>
      {ready || active ? (
        <View pointerEvents="none" style={[styles.labelWrap, { left: x - 50, top: y + RUSH_HIT / 2 - 6 }]}>
          <Text style={[t.display, styles.label, { backgroundColor: active ? t.c.stages.production : t.c.primary, color: t.c.primaryText }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false}>
            {active ? `×${formatMult(rush.multiplier)}` : rush.name}
          </Text>
        </View>
      ) : null}
    </>
  );
}

const formatMult = (m: number) => (Number.isInteger(m) ? String(m) : m.toFixed(1));

/** Time left to `to`: the only part of the button that ticks, four times a second. */
function Remaining({ to, big }: { to: number; big?: boolean }) {
  const t = useTheme();
  const now = useNow(250);
  const ms = Math.max(0, to - now);
  const text = big ? String(Math.ceil(ms / 1000)) : formatCountdown(ms).replace(/m /, ':').replace(/s$/, '');
  return (
    <Text style={[t.display, { color: '#FFFFFF', fontSize: big ? 20 : 12, textAlign: 'center', width: RUSH_FACE - 6 }]} numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  hit: { position: 'absolute', width: RUSH_HIT, height: RUSH_HIT, alignItems: 'center', justifyContent: 'center' },
  face: {
    width: RUSH_FACE,
    height: RUSH_FACE,
    borderRadius: RUSH_FACE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  labelWrap: { position: 'absolute', width: 100, alignItems: 'center' },
  label: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden', maxWidth: 100 },
  chipWrap: { position: 'absolute' },
  chip: { height: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 2, justifyContent: 'center', maxWidth: 170 },
  chipText: { fontSize: 13 },
});
