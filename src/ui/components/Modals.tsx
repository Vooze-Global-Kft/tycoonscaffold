/**
 * The two dialogs of the home shell that the store asks for:
 * - OfflineModal: what the venues earned while the player was away, with the real cap.
 * - StoryModal: the cast's story beats, typed out line by line with a voice blip per character.
 */
import { useEffect, useRef, useState, type ElementRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as E from '../../engine/economy';
import { formatMoney, formatNumber } from '../../engine/format';
import { fx } from '../../services/fx';
import { useGame } from '../../state/store';
import { useHomeUi } from '../home/uiState';
import { fly } from '../juice/fly';
import { useOverlay, useOverlaysOpen } from '../kit/overlay';
import { DIALOG_GAP_MS, Sheet } from '../kit/Sheet';
import { overlays } from '../../state/overlays';
import { shortDuration } from '../kit/time';
import { alpha, inkOf, textOn, useTheme } from '../theme';
import { Button } from './Button';
import { GameIcon } from './GameIcon';
import { RollingNumber } from './RollingNumber';

// ---------------------------------------------------------------- welcome back

/** "Earned while away": the amount counts up; Collect, or double it with an ad if the player wants. */
export function OfflineModal() {
  const offline = useGame((s) => s.offline);
  if (!offline) return null;
  return <OfflineSheet seconds={offline.seconds} earnings={offline.earnings} />;
}

function OfflineSheet({ seconds, earnings }: { seconds: number; earnings: number }) {
  const t = useTheme();
  const collect = useGame((s) => s.collectOffline);
  const maxHours = useGame((s) => s.cfg.economy.offline.maxHours);
  const [busy, setBusy] = useState(false);
  const amountRef = useRef<ElementRef<typeof View>>(null);
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -float.value * 6 }] }));
  const capped = seconds >= maxHours * 3600 - 1;

  const run = async (doubled: boolean) => {
    if (busy) return;
    setBusy(true);
    // Coins fly from the amount to the cash counter as the dialog closes.
    amountRef.current?.measureInWindow((x, y, w, h) => {
      if (w > 0) fly.emit({ kind: 'cash', from: { x: x + w / 2, y: y + h / 2 }, to: 'header:cash', count: doubled ? 14 : 9 });
    });
    await collect(doubled);
    setBusy(false);
  };

  return (
    <Sheet
      visible
      onClose={() => run(false)}
      title="Welcome back"
      icon={t.icons.offline}
      footer={
        <>
          <Button variant="success" disabled={busy} label="Collect" sublabel={formatMoney(earnings, t.strings.currencySymbol)} onPress={() => run(false)} />
          <Button variant="accent" disabled={busy} label="▶ Watch ad: ×2" sublabel={`Optional · ${formatMoney(earnings * 2, t.strings.currencySymbol)} in total`} onPress={() => run(true)} />
        </>
      }
    >
      <View style={styles.offlineBody}>
        <Animated.View style={iconStyle}>
          <GameIcon icon={t.strings.currencyIcon} size={56} />
        </Animated.View>
        <Text style={[styles.kicker, { color: t.c.textMuted }]}>EARNED WHILE AWAY</Text>
        <View ref={amountRef} collapsable={false} style={styles.amountBox}>
          <RollingNumber value={earnings} symbol={t.strings.currencySymbol} fromZero duration={1100} style={[t.display, styles.amount, { color: t.c.primary }]} />
        </View>
        <Text style={[styles.small, { color: t.c.textMuted }]}>
          {capped ? `Away ${maxHours} h or more: the most that counts` : `Away ${shortDuration(seconds)}`}
        </Text>
        <Text style={[styles.small, { color: t.c.textMuted }]}>Venues keep earning while you are away (up to {maxHours} h).</Text>
      </View>
    </Sheet>
  );
}

// ---------------------------------------------------------------- story

/** Two story dialogs are at least this far apart, so the game never feels like a slideshow. */
const STORY_GAP_MS = 45_000;
let lastStoryClosedAt = -Infinity;

/**
 * Story beats play like a visual novel. A beat that becomes due waits while a chest is opening, a
 * banner is showing, another dialog is up, or the last story closed less than 45 s ago; it shows
 * when the coast is clear. Once on screen it stays until the player finishes it.
 */
export function StoryModal() {
  const beat = useGame((s) => E.pendingStoryBeat(s.cfg, s.game));
  const storeBlocked = useGame((s) => s.offline !== null || s.chestOpening !== null || s.modal !== null || s.dealPopup !== null);
  // Any other dialog or overlay (a screen's own sheet, the chest opening). The decision below is only
  // taken while no story is showing, so the story's own registration never blocks itself.
  const others = useOverlaysOpen();
  const blocked = storeBlocked || others > 0;
  const banner = useHomeUi((s) => s.bannerOpen);
  const [showing, setShowing] = useState<string | null>(null);
  const [, wake] = useState(0);
  // Story spacing, and iOS's one-dialog-at-a-time rule: never present while another dialog may still be fading out.
  const waitMs = Math.max(lastStoryClosedAt + STORY_GAP_MS - Date.now(), blocked ? 0 : DIALOG_GAP_MS + 50 - overlays.msSinceClose());

  useEffect(() => {
    if (!beat || showing || waitMs <= 0) return;
    const timer = setTimeout(() => wake((n) => n + 1), waitMs + 50);
    return () => clearTimeout(timer);
  }, [beat, showing, waitMs, blocked]);

  useEffect(() => {
    if (!showing && beat && !blocked && !banner && waitMs <= 0) setShowing(beat.id);
    // The beat was dismissed (or the save was reset): close.
    if (showing && beat?.id !== showing) {
      setShowing(null);
      lastStoryClosedAt = Date.now();
    }
  }, [beat, blocked, banner, waitMs, showing]);

  if (!showing || beat?.id !== showing) return null;
  return <StoryScene key={showing} beatId={showing} />;
}

const VOICES = ['blip_mid', 'blip_low', 'blip_high'] as const;
/** Characters revealed per step and the time between steps: about 45 characters a second. */
const TYPE_CHARS = 2;
const TYPE_MS = 45;

function StoryScene({ beatId }: { beatId: string }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const dismiss = useGame((s) => s.dismissStory);
  const setStoryOpen = useHomeUi((s) => s.setStoryOpen);
  const beat = cfg.story.find((b) => b.id === beatId)!;
  const whoIndex = cfg.characters.findIndex((c) => c.id === beat.characterId);
  const who = whoIndex >= 0 ? cfg.characters[whoIndex] : undefined;
  const voice = VOICES[Math.max(0, whoIndex) % VOICES.length];
  const color = who?.color ?? t.c.primary;
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const text = beat.lines[line] ?? '';
  const typing = chars < text.length;
  const last = line >= beat.lines.length - 1;

  // Not a Sheet: count as an open overlay so offers and the tutorial hand wait.
  useOverlay(true);
  const enter = useSharedValue(0);
  const talk = useSharedValue(0);
  const nudge = useSharedValue(0);
  const blink = useSharedValue(0);

  useEffect(() => {
    fx.play('story_open');
    setStoryOpen(true);
    enter.value = withSpring(1, { damping: 13, stiffness: 150 });
    blink.value = withRepeat(withTiming(1, { duration: 520 }), -1, true);
    return () => setStoryOpen(false);
  }, [blink, enter, setStoryOpen]);

  // A new line: the character hops once and starts "talking".
  useEffect(() => {
    setChars(0);
    talk.value = withRepeat(withTiming(1, { duration: 170, easing: Easing.inOut(Easing.quad) }), -1, true);
    nudge.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, { damping: 6 }));
  }, [line, nudge, talk]);

  // Typewriter: a couple of letters per step, with a voice blip on each step that shows letters.
  useEffect(() => {
    if (!typing) {
      talk.value = withTiming(0, { duration: 120 });
      return;
    }
    const timer = setTimeout(() => {
      const chunk = text.slice(chars, chars + TYPE_CHARS);
      if (/\w/.test(chunk)) fx.play(voice);
      setChars((c) => Math.min(text.length, c + TYPE_CHARS));
    }, TYPE_MS);
    return () => clearTimeout(timer);
  }, [chars, typing, text, voice, talk]);

  const next = () => {
    if (typing) return setChars(text.length);
    if (!last) return setLine(line + 1);
    dismiss();
  };

  const charStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateX: (1 - enter.value) * -200 }, { translateY: -talk.value * 4 + nudge.value * -10 }, { rotate: `${(1 - enter.value) * -10 + (talk.value - 0.5) * 1.5}deg` }],
  }));
  const bubbleStyle = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateY: (1 - enter.value) * 50 }, { scale: 1 + nudge.value * 0.015 }] }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: 0.45 + blink.value * 0.55 }));

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={next}>
      <Pressable style={[styles.storyBackdrop, { backgroundColor: alpha('#000000', 0.6) }]} onPress={next} accessibilityRole="button" accessibilityLabel={typing ? 'Show the whole line' : last ? 'Close' : 'Next line'}>
        {beat.title ? (
          <Animated.View style={[styles.titlePill, { backgroundColor: color }, bubbleStyle]}>
            <Text style={[styles.titleText, t.display, { color: textOn(color) }]} numberOfLines={1} adjustsFontSizeToFit>
              {beat.title}
            </Text>
          </Animated.View>
        ) : null}
        <Animated.View style={[styles.character, charStyle]} pointerEvents="none">
          <View style={[styles.halo, { backgroundColor: alpha(color, 0.35) }]} />
          <GameIcon icon={beat.portrait ?? who?.portrait ?? '🙂'} size={180} />
        </Animated.View>
        <Animated.View style={[styles.bubble, { backgroundColor: t.c.surface, borderRadius: t.radius * 1.2, borderColor: color }, bubbleStyle]}>
          <View style={[styles.nameTag, { backgroundColor: color }]}>
            <Text style={[styles.nameText, t.display, { color: textOn(color) }]} numberOfLines={1}>
              {who?.name ?? ''}
            </Text>
          </View>
          <Text style={[styles.line, { color: t.c.text }]}>
            {text.slice(0, chars)}
            {/* The rest is laid out invisibly, so the bubble does not grow while typing. */}
            <Text style={{ color: 'transparent' }}>{text.slice(chars)}</Text>
          </Text>
          <View style={styles.bubbleFooter}>
            <View style={styles.dots}>
              {beat.lines.map((_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: i <= line ? color : alpha(t.c.text, 0.15) }]} />
              ))}
            </View>
            {last && beat.rewardGems > 0 ? (
              <View style={[styles.reward, { backgroundColor: alpha(color, 0.14), borderColor: alpha(color, 0.5) }]}>
                <GameIcon icon={t.strings.gemIcon} size={18} />
                <Text style={[t.display, { color: t.c.text, fontSize: 14 }]}>+{formatNumber(beat.rewardGems)}</Text>
              </View>
            ) : null}
            <Animated.Text style={[styles.tapHint, t.display, { color: inkOf(color, t.c.surface), opacity: typing ? 0 : 1 }, typing ? null : hintStyle]}>{last ? (beat.rewardGems > 0 ? 'Collect ▸' : "Let's go ▸") : 'Tap ▸'}</Animated.Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  offlineBody: { alignItems: 'center', paddingTop: 4, paddingBottom: 4, gap: 2 },
  kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginTop: 6 },
  amountBox: { alignSelf: 'stretch', alignItems: 'center' },
  amount: { fontSize: 40, height: 50, textAlign: 'center', alignSelf: 'stretch' },
  small: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  storyBackdrop: { flex: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: 40 },
  titlePill: { alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 8, borderRadius: 30, marginBottom: 'auto', marginTop: 90, maxWidth: '90%' },
  titleText: { fontSize: 22 },
  character: { marginLeft: 6, marginBottom: -28, zIndex: 2, alignSelf: 'flex-start' },
  halo: { position: 'absolute', left: 4, top: 8, width: 172, height: 172, borderRadius: 86 },
  bubble: { borderWidth: 3, padding: 18, paddingTop: 24, minHeight: 150 },
  nameTag: { position: 'absolute', top: -16, right: 18, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, maxWidth: '70%' },
  nameText: { fontSize: 16 },
  line: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 'auto', paddingTop: 12, gap: 10 },
  dots: { flexDirection: 'row', gap: 5, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1 },
  tapHint: { fontSize: 16 },
});
