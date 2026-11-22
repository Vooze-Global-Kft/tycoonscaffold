/**
 * The Jump sequence (spec 4.6): stars streak into lines (1.5 s), the station shudders, the new
 * galaxy's name types out (1 s), it holds, and the map comes back. The shell opens it (uiState
 * overlay 'jump') when a new galaxy starts (its run's galaxy index rises); `&overlay=jump` shows it
 * in the preview. jump_warp is played by the action that starts the galaxy. Registers with the
 * overlay manager; one full-screen canvas while it runs, nothing animates once it closes. A tap
 * after the name has typed out closes it early.
 *
 * Streaks: one path rebuilt per frame on the UI thread from fixed star positions (a worklet), so
 * React renders only for the typed letters.
 */
import { Canvas, Circle, Group, Path, Skia, vec, RadialGradient, Rect } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import * as H from '../../../engine/haul';
import { useGame } from '../../../state/store';
import { useOverlay } from '../../kit';
import { alpha } from '../../theme';
import { galaxyHue, SPACE } from '../art/palette';
import { MONO, useType } from '../sheets/parts';
import { say } from '../sheets/shellText';
import { useHaulUi } from '../uiState';

export const STREAK_MS = 1500;
export const SHUDDER_MS = 450;
export const TYPE_MS = 1000;
export const HOLD_MS = 1300;
const STARS = 90;

/** Fixed star field for the streaks: angle and starting distance (0..1 of the half diagonal). */
function starTable(seed: number): number[] {
  const out: number[] = [];
  let s = (seed * 2654435761) >>> 0 || 1;
  const next = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  for (let i = 0; i < STARS; i++) out.push(next() * Math.PI * 2, 0.08 + next() * 0.9);
  return out;
}

export function JumpSequence() {
  const open = useHaulUi((s) => s.overlay === 'jump');
  useOverlay(open);
  if (!open) return null;
  return <Sequence />;
}

function Sequence() {
  const { width, height } = useWindowDimensions();
  const ty = useType();
  const c = useGame((s) => s.cfg.theme.colors);
  const info = useGame((s) => {
    const cfg = s.cfg;
    const g = s.game as unknown as H.HaulGame;
    if (!H.isHaul(cfg)) return '';
    const galaxy = g.haul?.galaxy ?? g.haulStats?.pendingJump?.galaxy ?? 0;
    const cond = H.condition(cfg, g.haul?.trait ?? null)?.name ?? '';
    return JSON.stringify({
      name: H.galaxyName(cfg, galaxy),
      line: `${cfg.haul.names.galaxy.toUpperCase()} ${galaxy + 1}${cond ? ` · ${cond.toUpperCase()}` : ''}`,
      galaxy,
    });
  });
  const { name, line, galaxy } = (info ? JSON.parse(info) : { name: '', line: '', galaxy: 0 }) as { name: string; line: string; galaxy: number };
  const hue = galaxyHue(galaxy);
  const stars = useMemo(() => starTable(galaxy + 7), [galaxy]);
  const cx = width / 2;
  const cy = height * 0.42;
  const half = Math.hypot(width, height) / 2;

  const t = useSharedValue(0);
  const fade = useSharedValue(0);
  const shake = useSharedValue(0);
  const [typed, setTyped] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 220 });
    t.value = withTiming(1, {
      duration: STREAK_MS,
      easing: Easing.in(Easing.cubic),
    });
    shake.value = withDelay(STREAK_MS - 150, withSequence(...[6, -5, 4, -3, 2, 0].map((v) => withTiming(v, { duration: SHUDDER_MS / 6 }))));
    const timers: ReturnType<typeof setTimeout>[] = [];
    const startType = STREAK_MS + SHUDDER_MS * 0.5;
    const letters = Math.max(1, name.length);
    for (let i = 1; i <= letters; i++) timers.push(setTimeout(() => setTyped(i), startType + (TYPE_MS * i) / letters));
    timers.push(setTimeout(() => setDone(true), startType + TYPE_MS));
    timers.push(setTimeout(() => (fade.value = withTiming(0, { duration: 300 })), startType + TYPE_MS + HOLD_MS));
    timers.push(setTimeout(() => useHaulUi.getState().closeOverlay(), startType + TYPE_MS + HOLD_MS + 320));
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(t);
      cancelAnimation(fade);
      cancelAnimation(shake);
    };
  }, [t, fade, shake, name.length]);

  const streaks = useDerivedValue(() => {
    const p = Skia.PathBuilder.Make();
    const k = t.value;
    for (let i = 0; i < stars.length; i += 2) {
      const a = stars[i];
      const r0 = stars[i + 1] * half;
      const r = r0 * (1 + k * 1.6);
      const len = 1.2 + k * k * half * 0.55 * stars[i + 1];
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      p.moveTo(cx + ca * r, cy + sa * r);
      p.lineTo(cx + ca * (r + len), cy + sa * (r + len));
    }
    return p.build();
  });
  const glowR = useDerivedValue(() => 40 + t.value * half * 0.5);
  const layer = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: shake.value }, { translateY: shake.value * 0.4 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, layer]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => done && useHaulUi.getState().closeOverlay()} accessibilityRole="button" accessibilityLabel={`${say('jumping')} ${name}`}>
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect x={0} y={0} width={width} height={height} color={alpha(SPACE.bg, 0.94)} />
          <Circle cx={cx} cy={cy} r={glowR}>
            <RadialGradient c={vec(cx, cy)} r={half * 0.6} colors={[alpha(hue, 0.45), alpha(hue, 0)]} />
          </Circle>
          <Group>
            <Path path={streaks} style="stroke" strokeWidth={1.6} strokeCap="round" color={alpha(SPACE.white, 0.85)} />
          </Group>
        </Canvas>
        <View style={[styles.title, { top: cy - 40 }]} pointerEvents="none">
          <Text
            style={{
              color: c.primary,
              fontFamily: MONO,
              fontSize: ty.small,
              letterSpacing: 3,
              fontWeight: '700',
            }}
            maxFontSizeMultiplier={1.2}
          >
            {say('jumping')}
          </Text>
          <Text
            style={{
              color: c.text,
              fontFamily: MONO,
              fontSize: Math.round(ty.big * 1.6),
              fontWeight: '800',
              letterSpacing: 1.5,
              textAlign: 'center',
            }}
            numberOfLines={2}
            maxFontSizeMultiplier={1.15}
          >
            {name.slice(0, typed).toUpperCase()}
            <Text style={{ color: typed < name.length ? c.primary : 'transparent' }}>▌</Text>
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: MONO,
              fontSize: ty.small,
              letterSpacing: 1.5,
              opacity: done ? 1 : 0,
            }}
            maxFontSizeMultiplier={1.2}
          >
            {line}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  title: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    gap: 8,
  },
});
