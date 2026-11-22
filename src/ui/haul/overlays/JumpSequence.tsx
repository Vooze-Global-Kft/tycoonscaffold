/**
 * The Jump sequence (spec 4.6, Decision 41), in two parts:
 * - Leaving (uiState overlay 'leave'), played at the confirm: stars streak into lines (1 s), the
 *   station shudders, "LEAVING <galaxy>" holds briefly, and the Star Map's between-galaxies panel
 *   shows, its condition cards tappable within 2.5 s of the confirm.
 * - Arriving (overlay 'jump'), played when the next galaxy's run starts (the shell sees its galaxy
 *   index rise, after the condition is picked): the streaks fall back into stars, the arrival line
 *   "GALAXY 2 · HALDEN REACH" types out (Decision 52) with the condition under it, it holds, and the
 *   map comes back.
 * `&overlay=jump` / `&overlay=leave` show them in the preview. jump_warp is played by the action
 * that starts the galaxy. Registers with the overlay manager; one full-screen canvas while it runs,
 * nothing animates once it closes. A tap after the line has typed out closes it early.
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

/**
 * Timings. Leaving is short (the lead's finishing note: the condition cards must be tappable within
 * 2.5 s of the confirm): streak 1.0 s, shudder 0.3 s, the name typed in 0.5 s, held 0.5 s, faded in
 * 0.22 s, about 2.37 s in all (LEAVE_TOTAL_MS). Arriving keeps its longer hold: it is the reward.
 */
export const LEAVE = { streak: 1000, shudder: 300, type: 500, hold: 500, fade: 220 } as const;
export const ARRIVE = { arrive: 900, type: 1000, hold: 1300, fade: 300 } as const;
export const LEAVE_TOTAL_MS = LEAVE.streak + LEAVE.shudder * 0.5 + LEAVE.type + LEAVE.hold + LEAVE.fade + 20;
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
  const mode = useHaulUi((s) => (s.overlay === 'jump' ? 'arrive' : s.overlay === 'leave' ? 'leave' : null));
  useOverlay(mode !== null);
  if (!mode) return null;
  return <Sequence key={mode} leaving={mode === 'leave'} />;
}

function Sequence({ leaving }: { leaving: boolean }) {
  const { width, height } = useWindowDimensions();
  const ty = useType();
  const c = useGame((s) => s.cfg.theme.colors);
  const info = useGame((s) => {
    const cfg = s.cfg;
    const g = s.game as unknown as H.HaulGame;
    if (!H.isHaul(cfg)) return '';
    const pending = g.haulStats?.pendingJump?.galaxy;
    // Leaving: the galaxy left behind (the run is gone, the pending Jump names the next one).
    const galaxy = leaving ? (pending !== undefined ? pending - 1 : (g.haul?.galaxy ?? 0)) : (g.haul?.galaxy ?? pending ?? 0);
    const cond = leaving ? null : H.condition(cfg, g.haul?.trait ?? null);
    const named = say('arrivalLine', { galaxy: cfg.haul.names.galaxy.toUpperCase(), n: galaxy + 1, name: H.galaxyName(cfg, galaxy).toUpperCase() });
    return JSON.stringify({
      name: leaving ? H.galaxyName(cfg, galaxy).toUpperCase() : named,
      line: cond ? `${cond.name.toUpperCase()}${cond.lines?.length ? ` · ${cond.lines[0]}` : ''}` : '',
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
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (leaving) {
      t.value = withTiming(1, { duration: LEAVE.streak, easing: Easing.in(Easing.cubic) });
      shake.value = withDelay(LEAVE.streak - 150, withSequence(...[6, -5, 4, -3, 2, 0].map((v) => withTiming(v, { duration: LEAVE.shudder / 6 }))));
    } else {
      // Arriving: the lines fall back into points of light.
      t.value = 1;
      t.value = withTiming(0, { duration: ARRIVE.arrive, easing: Easing.out(Easing.cubic) });
    }
    const startType = leaving ? LEAVE.streak + LEAVE.shudder * 0.5 : ARRIVE.arrive * 0.6;
    const typeMs = leaving ? LEAVE.type : ARRIVE.type;
    const holdMs = leaving ? LEAVE.hold : ARRIVE.hold;
    const fadeMs = leaving ? LEAVE.fade : ARRIVE.fade;
    const letters = Math.max(1, name.length);
    for (let i = 1; i <= letters; i++) timers.push(setTimeout(() => setTyped(i), startType + (typeMs * i) / letters));
    timers.push(setTimeout(() => setDone(true), startType + typeMs));
    timers.push(setTimeout(() => (fade.value = withTiming(0, { duration: fadeMs })), startType + typeMs + holdMs));
    timers.push(setTimeout(() => useHaulUi.getState().closeOverlay(), startType + typeMs + holdMs + fadeMs + 20));
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(t);
      cancelAnimation(fade);
      cancelAnimation(shake);
    };
  }, [t, fade, shake, name.length, leaving]);

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
            <RadialGradient c={vec(cx, cy)} r={glowR} colors={[alpha(hue, 0.45), alpha(hue, 0)]} />
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
            allowFontScaling={false}
          >
            {say(leaving ? 'leavingGalaxy' : 'jumping')}
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
            allowFontScaling={false}
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
            allowFontScaling={false}
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
