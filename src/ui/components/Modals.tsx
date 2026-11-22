import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as E from '../../engine/economy';
import { formatDuration, formatMoney } from '../../engine/format';
import { useGame } from '../../state/store';
import { alpha, useTheme } from '../theme';
import { Button } from './Button';
import { GameIcon } from './GameIcon';

/** Counts a number up from zero, easing out. */
function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / ms);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p >= 1) clearInterval(timer);
    }, 33);
    return () => clearInterval(timer);
  }, [target, ms]);
  return value;
}

/** "Welcome back" with the option to double via a rewarded ad. Top earner in most idle games. */
export function OfflineModal() {
  const offline = useGame((s) => s.offline);
  if (!offline) return null;
  return <OfflineSheet seconds={offline.seconds} earnings={offline.earnings} />;
}

function OfflineSheet({ seconds, earnings }: { seconds: number; earnings: number }) {
  const t = useTheme();
  const collect = useGame((s) => s.collectOffline);
  const [busy, setBusy] = useState(false);
  const shown = useCountUp(earnings);
  const pop = useSharedValue(0.6);
  const float = useSharedValue(0);
  useEffect(() => {
    pop.value = withSpring(1, { damping: 9, stiffness: 180 });
    float.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float, pop]);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -float.value * 8 }] }));
  const run = async (doubled: boolean) => {
    setBusy(true);
    await collect(doubled);
    setBusy(false);
  };
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: alpha('#000000', 0.6) }]}>
        <Animated.View style={[styles.sheet, { backgroundColor: t.c.surface, borderRadius: t.radius * 1.5 }, sheetStyle]}>
          <Animated.View style={iconStyle}>
            <GameIcon icon={t.icons.offline} size={84} />
          </Animated.View>
          <Text style={[styles.h1, t.display, { color: t.c.text }]}>Welcome back!</Text>
          <Text style={[styles.p, { color: t.c.textMuted }]}>While you were away for {formatDuration(seconds)} you earned</Text>
          <Text style={[styles.amount, t.display, { color: t.c.primary }]}>{formatMoney(shown, t.strings.currencySymbol)}</Text>
          <Button variant="accent" disabled={busy} label={`▶ Double it: ${formatMoney(earnings * 2, t.strings.currencySymbol)}`} onPress={() => run(true)} style={styles.full} />
          <Button variant="ghost" disabled={busy} label="Collect" onPress={() => run(false)} style={styles.full} />
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Story beats play like a visual novel: the character slides in, their line
 * types out in a speech bubble, and a tap skips the typing or moves on.
 */
export function StoryModal() {
  const beat = useGame((s) => E.pendingStoryBeat(s.cfg, s.game));
  const blocked = useGame((s) => s.offline !== null || s.celebrations.length > 0);
  if (!beat || blocked) return null;
  return <StoryScene key={beat.id} beatId={beat.id} />;
}

function StoryScene({ beatId }: { beatId: string }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const dismiss = useGame((s) => s.dismissStory);
  const beat = cfg.story.find((b) => b.id === beatId)!;
  const who = cfg.characters.find((c) => c.id === beat.characterId);
  const color = who?.color ?? t.c.primary;
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const text = beat.lines[line];
  const typing = chars < text.length;
  const last = line >= beat.lines.length - 1;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const enter = useSharedValue(0);
  const talk = useSharedValue(0);
  const nudge = useSharedValue(0);
  const blink = useSharedValue(0);

  useEffect(() => {
    enter.value = withSpring(1, { damping: 12, stiffness: 140 });
    blink.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
  }, [blink, enter]);

  // Typewriter. The character bobs while "talking".
  useEffect(() => {
    setChars(0);
    talk.value = withRepeat(withTiming(1, { duration: 170, easing: Easing.inOut(Easing.quad) }), -1, true);
    nudge.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, { damping: 6 }));
    timer.current = setInterval(() => setChars((c) => c + 1), 24);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [line, nudge, talk]);

  useEffect(() => {
    if (!typing) {
      if (timer.current) clearInterval(timer.current);
      talk.value = withTiming(0, { duration: 120 });
    }
  }, [typing, talk]);

  const next = () => {
    if (typing) return setChars(text.length);
    if (!last) return setLine(line + 1);
    dismiss();
  };

  const charStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateX: (1 - enter.value) * -220 },
      { translateY: -talk.value * 5 + nudge.value * -10 },
      { rotate: `${(1 - enter.value) * -12 + (talk.value - 0.5) * 1.5}deg` },
    ],
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 60 }, { scale: 1 + nudge.value * 0.02 }],
  }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: 0.4 + blink.value * 0.6 }));

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable style={[styles.storyBackdrop, { backgroundColor: alpha('#000000', 0.62) }]} onPress={next}>
        {beat.title ? (
          <Animated.View style={[styles.titlePill, { backgroundColor: color }, bubbleStyle]}>
            <Text style={[styles.titleText, t.display]}>{beat.title}</Text>
          </Animated.View>
        ) : null}
        <Animated.View style={[styles.character, charStyle]} pointerEvents="none">
          <View style={[styles.halo, { backgroundColor: alpha(color, 0.35) }]} />
          <GameIcon icon={beat.portrait ?? who?.portrait ?? '🙂'} size={210} />
        </Animated.View>
        <Animated.View style={[styles.bubble, { backgroundColor: t.c.surface, borderRadius: t.radius * 1.3, borderColor: color }, bubbleStyle]}>
          <View style={[styles.nameTag, { backgroundColor: color }]}>
            <Text style={[styles.nameText, t.display]}>{who?.name}</Text>
          </View>
          <Text style={[styles.line, { color: t.c.text }]}>
            {text.slice(0, chars)}
            {/* Reserve the full height so the bubble doesn't grow while typing. */}
            <Text style={{ color: 'transparent' }}>{text.slice(chars)}</Text>
          </Text>
          <View style={styles.bubbleFooter}>
            <Text style={[styles.dots, { color: t.c.textMuted }]}>
              {beat.lines.map((_, i) => (i === line ? '●' : '○')).join(' ')}
            </Text>
            {typing ? null : (
              <Animated.Text style={[styles.tapHint, t.display, { color }, hintStyle]}>
                {last ? (beat.rewardGems > 0 ? `Collect ${beat.rewardGems} ${t.strings.gemName} ▸` : "Let's go! ▸") : 'Tap ▸'}
              </Animated.Text>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { alignSelf: 'stretch', alignItems: 'center', padding: 24, gap: 6 },
  h1: { fontSize: 26, marginTop: 8 },
  p: { fontSize: 14, textAlign: 'center' },
  amount: { fontSize: 40, marginVertical: 8 },
  full: { alignSelf: 'stretch', marginTop: 6 },

  storyBackdrop: { flex: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: 40 },
  titlePill: { alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 8, borderRadius: 30, marginBottom: 'auto', marginTop: 90 },
  titleText: { color: '#FFFFFF', fontSize: 24 },
  character: { marginLeft: 6, marginBottom: -34, zIndex: 2, alignSelf: 'flex-start' },
  halo: { position: 'absolute', left: 5, top: 10, width: 200, height: 200, borderRadius: 100 },
  bubble: { borderWidth: 3, padding: 18, paddingTop: 26, minHeight: 150 },
  nameTag: { position: 'absolute', top: -16, right: 18, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14 },
  nameText: { color: '#FFFFFF', fontSize: 16 },
  line: { fontSize: 19, lineHeight: 27, fontWeight: '600' },
  bubbleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12 },
  dots: { fontSize: 10, letterSpacing: 2 },
  tapHint: { fontSize: 16 },
});
