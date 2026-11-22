/**
 * The comms slot under the contract strip (spec 4.1, 3, 7.4, errata 56, 57): one radio line at a
 * time, the speaker's call-sign portrait (a `mach:` icon from game.json characters) with a moving
 * waveform, then the line. A line closes after 5 s or on a tap.
 *
 * Three kinds of line, in this order of precedence:
 * - hint lines (section 3's voice lines): shown at once when their tutorial step starts, no gap;
 *   "Hold at capacity..." once per run after the tutorial (errata 57);
 * - story lines (7.4 beats, game.json `story`): queue behind hint lines and come at least 45 s
 *   apart; showing one marks the beat seen (store action `dismissStory`);
 * - radio chatter from the run's events (ore changes at most every 45 s, bonanza rocks, rich seams,
 *   contracts closed, lapsed and new): dropped when stale, at most two waiting.
 * Waits while a spoke, an overlay or the Shift Log covers the map. Plays comms_in per line.
 *
 * Speakers are found from the data, never by id: the AI is the speaker of the `start` beat, the
 * dock controller of the first `launches` beat, dispatch of the `contracts` beat; buyers speak for
 * their own contracts (characters with the buyer's id).
 *
 * Fixed-height text (AGENTS.md): sized by hand from fontScale, allowFontScaling off; a line too long
 * for one row takes two rows, and the slot grows by one row (never more than two lines on screen).
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import * as E from '../../../engine/economy';
import * as H from '../../../engine/haul';
import { fx } from '../../../services/fx';
import { modeEvents } from '../../../state/modeEvents';
import { useGame } from '../../../state/store';
import { alpha } from '../../theme';
import { HaulIcon } from '../art/HaulIcon';
import { allHaulHints } from '../hints';
import { buyerName, oreName, rockName } from '../sheets/format';
import { MONO } from '../sheets/parts';
import { say, type ShellTextKey } from '../sheets/shellText';
import { useHaulUi } from '../uiState';
import type { Rect } from '../layout';

/** How long a line stays up (spec 4.1). */
export const LINE_MS = 5000;
/** Least time between two story lines (spec 4.1, errata 56). */
export const STORY_GAP_MS = 45_000;
/** Least time between two "T-4 is copper now." calls (spec 2.4 step 2). */
export const ORE_CALL_GAP_MS = 45_000;
/** Chatter older than this is dropped instead of shown late. */
const STALE_MS = 12_000;
const TICK_MS = 400;

type Kind = 'hint' | 'story' | 'chatter';
interface Radio {
  id: string;
  kind: Kind;
  /** Character id (game.json characters) or '' for none. */
  who: string;
  text: string;
  at: number;
}

type Role = 'ai' | 'dock' | 'dispatch';

/** The character id that speaks for a role, from the story's own speakers. */
function speaker(cfg: H.HaulConfig, role: Role): string {
  const type = role === 'ai' ? 'start' : role === 'dock' ? 'launches' : 'contracts';
  return cfg.story.find((b) => b.trigger.type === type)?.characterId ?? cfg.characters[0]?.id ?? '';
}

/** The voice line of the hint shown now (section 3), with its once-key, or null. */
function hintLine(cfg: H.HaulConfig, g: H.HaulGame, hint: H.HaulHint | undefined): { key: ShellTextKey; role: Role } | null {
  if (!hint || !g.haul) return null;
  if (hint.step >= 2 && hint.step <= 6) {
    const key = `hintStep${hint.step}` as ShellTextKey;
    return { key, role: hint.step <= 3 ? 'dock' : 'ai' };
  }
  if (hint.key === 'station:autopilot') return { key: 'hintAutopilot', role: 'dock' };
  if (hint.kind === 'swipe' && hint.step === 0 && !g.haul.autopilot.online) return { key: 'holdCapacity', role: 'dock' };
  return null;
}

export function CommsSlot({ rect }: { rect: Rect }) {
  const { fontScale } = useWindowDimensions();
  const characters = useGame((s) => s.cfg.characters);
  const [line, setLine] = useState<Radio | null>(null);
  const cur = useRef<{ radio: Radio; until: number } | null>(null);
  const queue = useRef<Radio[]>([]);
  const lastStory = useRef(-Infinity);
  const lastOreCall = useRef(-Infinity);
  /** Hint lines already voiced, per run seed (a restart may voice the current one again, once). */
  const voiced = useRef(new Set<string>());

  useEffect(() => {
    const show = (radio: Radio, now: number) => {
      cur.current = { radio, until: now + LINE_MS };
      setLine(radio);
      fx.play('comms_in');
    };
    const clear = () => {
      if (!cur.current) return;
      cur.current = null;
      setLine(null);
    };

    const tick = () => {
      const now = Date.now();
      const { cfg, game, offline } = useGame.getState();
      if (!H.isHaul(cfg)) return;
      const g = game as unknown as H.HaulGame;
      const ui = useHaulUi.getState();
      if (cur.current && now >= cur.current.until) clear();
      // Covered: keep everything for later (the line on screen expires as usual).
      if (ui.spoke !== null || ui.overlay !== null || offline !== null || !g.haul) return;

      // 1. Hint lines: at once, no gap.
      const hint = allHaulHints()[0];
      const hl = hintLine(cfg, g, hint);
      if (hl) {
        const id = `${g.haul.seed}:${g.haul.galaxy}:${hl.key}`;
        if (!voiced.current.has(id)) {
          voiced.current.add(id);
          show({ id, kind: 'hint', who: speaker(cfg, hl.role), text: say(hl.key), at: now }, now);
          return;
        }
      }
      if (cur.current && cur.current.radio.kind !== 'chatter') return;

      // 2. Story lines: 45 s apart, behind hint lines; chatter makes way.
      if (now - lastStory.current >= STORY_GAP_MS) {
        const beat = E.pendingStoryBeat(cfg, game);
        if (beat) {
          lastStory.current = now;
          useGame.getState().dismissStory();
          show({ id: `story:${beat.id}`, kind: 'story', who: beat.characterId ?? '', text: beat.lines.join(' '), at: now }, now);
          return;
        }
      }
      if (cur.current) return;

      // 3. Chatter, freshest first among what is not stale.
      queue.current = queue.current.filter((r) => now - r.at < STALE_MS);
      const next = queue.current.shift();
      if (next) show(next, now);
    };

    const onEvents = (events: readonly unknown[]) => {
      const { cfg, game } = useGame.getState();
      if (!H.isHaul(cfg)) return;
      const g = game as unknown as H.HaulGame;
      const now = Date.now();
      const add = (id: string, who: string, text: string) => {
        queue.current = [...queue.current.filter((r) => r.id !== id), { id, kind: 'chatter' as const, who, text, at: now }].slice(-2);
      };
      const ai = speaker(cfg, 'ai');
      const dispatch = speaker(cfg, 'dispatch');
      for (const raw of events) {
        const ev = raw as H.HaulEvent;
        switch (ev.type) {
          case 'arrive':
            if (ev.bonanza) add(`bonanza:${ev.slot}`, ai, say('bonanza', { rock: rockName(cfg, ev.slot) }));
            else if (ev.oreChanged && now - lastOreCall.current >= ORE_CALL_GAP_MS) {
              lastOreCall.current = now;
              add(`ore:${ev.slot}`, ai, say('oreChanged', { rock: rockName(cfg, ev.slot), ore: oreName(cfg, ev.ore).toLowerCase() }));
            }
            break;
          case 'vein':
            if (!ev.flare) add(`seam:${ev.slot}`, ai, say('seam', { rock: rockName(cfg, ev.slot) }));
            break;
          case 'contractMet':
            add('contractMet', dispatch, say('contractClosed'));
            break;
          case 'contractLapsed':
            if (ev.wasActive) add('lapsed', dispatch, say('contractLapsed', { buyer: buyerName(cfg, ev.contract.buyer) }));
            break;
          case 'contractNew':
            if (g.haul?.contracts.unlocked && ev.contract.wants[0]) add(`new:${ev.contract.k}`, ev.contract.buyer, say('contractNew', { buyer: buyerName(cfg, ev.contract.buyer), ore: oreName(cfg, ev.contract.wants[0].ore).toLowerCase() }));
            break;
          default:
            break;
        }
      }
    };

    const timer = setInterval(tick, TICK_MS);
    const off = modeEvents.subscribe(onEvents);
    tick();
    return () => {
      clearInterval(timer);
      off();
    };
  }, []);

  if (!line) return null;
  const who = characters.find((c) => c.id === line.who);
  return <RadioLine rect={rect} fontScale={fontScale} radio={line} name={who?.name ?? ''} portrait={who?.portrait ?? ''} color={who?.color ?? ''} onClose={() => {
    cur.current = null;
    setLine(null);
  }} />;
}

function RadioLine({ rect, fontScale, radio, name, portrait, color, onClose }: { rect: Rect; fontScale: number; radio: Radio; name: string; portrait: string; color: string; onClose: () => void }) {
  const c = useGame((s) => s.cfg.theme.colors);
  const tint = color || c.primary;
  // Sized by hand (the fixed-height rule): the font from the slot's height and the text size setting.
  const scale = Math.max(0.85, Math.min(1.2, fontScale));
  const font = Math.round(Math.min(12 * scale, (rect.height - 8) / 1.3) * 2) / 2;
  const row = Math.ceil(font * 1.3);
  const icon = Math.min(20, rect.height - 4);
  const textW = rect.width - 8 - icon - 8 - 22 - 8;
  const label = name ? `${name.toUpperCase()}: ` : '';
  const full = label + radio.text.toUpperCase();
  const perRow = Math.max(8, Math.floor(textW / (font * 0.62)));
  const rows = full.length > perRow ? 2 : 1;
  const height = Math.max(rect.height, rows * row + 8);
  const slide = useSharedValue(0);
  useEffect(() => {
    slide.value = 0;
    slide.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
  }, [radio.id, slide]);
  const style = useAnimatedStyle(() => ({ opacity: slide.value, transform: [{ translateY: (1 - slide.value) * -6 }] }));
  return (
    <Animated.View style={[styles.slot, { left: rect.x, top: rect.y, width: rect.width, height, borderRadius: Math.min(12, rect.height / 2), backgroundColor: alpha(c.backgroundAlt, 0.9), borderColor: alpha(tint, 0.35) }, style]}>
      <Pressable style={styles.press} onPress={onClose} accessibilityRole="button" accessibilityLabel={full} accessibilityHint={say('close')}>
        {portrait ? <HaulIcon name={portrait} size={icon} /> : null}
        <Wave color={tint} height={Math.min(14, rect.height - 10)} id={radio.id} />
        <View style={{ flex: 1, height: rows * row, justifyContent: 'center' }}>
          <Text allowFontScaling={false} numberOfLines={rows} style={{ fontFamily: MONO, fontSize: font, color: c.text, fontWeight: '600' }}>
            {label ? <Text style={{ color: tint, fontWeight: '800' }}>{label}</Text> : null}
            {radio.text.toUpperCase()}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Three bars that move while a line shows (the waveform of the call-sign plates); stops on unmount. */
function Wave({ color, height, id }: { color: string; height: number; id: string }) {
  return (
    <View style={[styles.wave, { height }]}>
      {[0, 1, 2].map((i) => (
        <Bar key={`${id}:${i}`} color={color} height={height} delay={i * 130} />
      ))}
    </View>
  );
}

function Bar({ color, height, delay }: { color: string; height: number; delay: number }) {
  const k = useSharedValue(0.3);
  useEffect(() => {
    // Moves for the line's 5 s, then rests (nothing animates while nobody speaks).
    k.value = withDelay(delay, withRepeat(withTiming(1, { duration: 260, easing: Easing.inOut(Easing.quad) }), Math.floor((LINE_MS - 400) / 260), true));
    return () => cancelAnimation(k);
  }, [k, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: k.value }] }));
  return <Animated.View style={[styles.bar, { height, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', borderWidth: 1, overflow: 'hidden' },
  press: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, gap: 6 },
  wave: { width: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bar: { width: 3, borderRadius: 1.5 },
});
