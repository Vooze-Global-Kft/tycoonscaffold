/**
 * The chest opening: the showpiece moment of the game (design sheet §5, timed to the millisecond).
 * Shown while the store's `chestOpening` is set; closeChest() ends it.
 *
 * Built as ONE Skia canvas (dim, chest, rays, cards, particles) with a few React Native texts and
 * buttons on top. React only renders when the step changes (landed, opened, dealt, each reveal);
 * every movement is a Reanimated animation on the UI thread. Discrete moments (sounds, the next
 * reveal) are scheduled with timers on the same timings, and Skip cancels them all.
 *
 * Honesty rules built in: the lid glows in the colour of the best rarity really inside (no tease
 * that the result does not match); Skip is visible from the first frame and jumps to the summary;
 * levelling up is never automatic, the level bars only show what can be done later.
 */
import { Canvas, Group, useClock } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type HostInstance, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, cancelAnimation, makeMutable, useAnimatedStyle, useDerivedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { Rarity } from '../../../config/schema';
import { formatMoney, formatNumber } from '../../../engine/format';
import * as M from '../../../engine/meta';
import { fx } from '../../../services/fx';
import { useGame, type ChestOpening } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { fly } from '../../juice/fly';
import { useOverlay } from '../../kit/overlay';
import { CARD_NAMEPLATE, CARD_SIZE, Chest, CHEST_SIZE } from '../../sim/art/props';
import { RARITY_COLORS, RARITY_NAMES, alpha, useTheme } from '../../theme';
import { Burst, Confetti, Dust, Glow, Wash } from './Fx';
import { DEAL_GAP_MS, DEAL_MS, OpeningSlot, makeSlotMotion, revealPlan, type SlotKind, type SlotMotion, type SlotPhase, type Spot } from './OpeningSlot';
import { RARITY_GLOW, bestRarity, cardOf, progressAfterReveal, rewardRarity } from './shared';

export function ChestOverlay() {
  const opening = useGame((s) => s.chestOpening);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  // Not a Sheet: say "an overlay is up" so offers, story beats, banners and the hand wait.
  useOverlay(opening !== null);
  if (!opening) return null;
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 1 || Math.abs(size.h - height) > 1) setSize({ w: width, h: height });
  };
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {size ? <Opening key={opening.id} opening={opening} w={size.w} h={size.h} /> : null}
    </View>
  );
}

type Stage = 'intro' | 'ready' | 'opening' | 'dealing' | 'reveal' | 'summary';

interface SlotInfo {
  kind: SlotKind;
  rarity: Rarity | null;
  icon: string;
  cardId: string;
  rest: Spot;
}

const LABEL_H = 48;

/** Where everything sits for a screen size and a number of rewards. */
function computeLayout(w: number, h: number, n: number) {
  const top = Math.max(70, h * 0.1);
  const bottom = h - 168;
  const rows = n <= 3 ? 1 : 2;
  const perRow = rows === 1 ? n : Math.ceil(n / 2);
  const colW = (w - 20) / Math.max(perRow, 3);
  const gap = 14;
  const scale = Math.min(0.95, (colW - 10) / CARD_SIZE.width, ((bottom - top) / rows - LABEL_H - gap) / CARD_SIZE.height);
  const cardH = CARD_SIZE.height * scale;
  const rowH = cardH + LABEL_H + gap;
  const startY = top + Math.max(0, (bottom - top - rows * rowH) / 2);
  const spots: Spot[] = [];
  for (let i = 0; i < n; i++) {
    const row = rows === 1 || i < perRow ? 0 : 1;
    const inRow = row === 0 ? perRow : n - perRow;
    const col = row === 0 ? i : i - perRow;
    spots.push({ x: w / 2 + (col - (inRow - 1) / 2) * colW, y: startY + row * rowH + cardH / 2, scale });
  }
  const introScale = Math.min(1, (w * 0.62) / CHEST_SIZE.width, (h * 0.3) / CHEST_SIZE.height);
  const restScale = Math.min(0.6, 104 / CHEST_SIZE.height);
  return {
    spots,
    cardW: CARD_SIZE.width * scale,
    cardH,
    colW,
    intro: { x: w / 2, y: h * 0.64, scale: introScale },
    rest: { x: w / 2, y: h - 22, scale: restScale },
    centre: { x: w / 2, y: h * 0.42, scale: Math.min(1.8, (w * 0.56) / CARD_SIZE.width, (h * 0.46) / CARD_SIZE.height) },
  };
}

/** setTimeout with one place to cancel everything (Skip, unmount). */
function useTimers() {
  const ids = useRef<ReturnType<typeof setTimeout>[]>([]);
  const at = useCallback((ms: number, fn: () => void) => {
    ids.current.push(setTimeout(fn, ms));
  }, []);
  const clear = useCallback(() => {
    ids.current.forEach(clearTimeout);
    ids.current = [];
  }, []);
  useEffect(() => clear, [clear]);
  return { at, clear };
}

const PULSES_FULL: Record<Rarity, number> = { common: 1, rare: 1, epic: 2, legendary: 4 };
const REVEAL_SOUND = { common: 'reveal_common', rare: 'reveal_rare', epic: 'reveal_epic', legendary: 'reveal_legendary' } as const;

function Opening({ opening, w, h }: { opening: ChestOpening; w: number; h: number }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const closeChest = useGame((s) => s.closeChest);
  const openChest = useGame((s) => s.openChest);
  // The next chest to open: the same kind first, then any other the player owns.
  const nextId = useGame((s) => {
    if ((s.game.chests.owned[opening.chestId] ?? 0) > 0) return opening.chestId;
    return s.cfg.meta.chests.find((c) => (s.game.chests.owned[c.id] ?? 0) > 0)?.id ?? null;
  });
  const left = useGame((s) => M.chestCount(s.game));
  const chest = cfg.meta.chests.find((c) => c.id === opening.chestId);
  const tier = chest?.tier ?? 'wood';
  const rewards = opening.rewards;
  const L = useMemo(() => computeLayout(w, h, rewards.length), [w, h, rewards.length]);
  // Card states after the whole chest (the store applied it before this overlay started).
  const cardsSnap = useMemo(() => useGame.getState().game.cards, []); // eslint-disable-line react-hooks/exhaustive-deps
  const best = useMemo(() => bestRarity(cfg, rewards), [cfg, rewards]);
  const pulses = useMemo(() => M.chestRevealPulses(cfg, rewards, 7), [cfg, rewards]);
  const mouth: Spot = { x: L.rest.x, y: L.rest.y - 70 * L.rest.scale, scale: 0.12 };

  const slots: SlotInfo[] = useMemo(
    () =>
      rewards.map((g, i) => {
        const kind: SlotKind = g.type === 'card' ? 'card' : g.type === 'gems' ? 'gems' : 'cash';
        const card = g.type === 'card' ? cardOf(cfg, g.cardId) : undefined;
        return { kind, rarity: rewardRarity(cfg, g), icon: card?.icon ?? '', cardId: card?.id ?? `slot${i}`, rest: L.spots[i] };
      }),
    [rewards, cfg, L],
  );
  const motions: SlotMotion[] = useMemo(() => slots.map((s, i) => makeSlotMotion(mouth, s.kind, i)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const clock = useClock();
  const timers = useTimers();
  const [stage, setStage] = useState<Stage>('intro');
  const [revealing, setRevealing] = useState(-1);
  const [done, setDone] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [chestGone, setChestGone] = useState(false);
  const stageRef = useRef<Stage>('intro');
  const busy = useRef(false);
  const nextIndex = useRef(0);
  const go = (s: Stage) => {
    stageRef.current = s;
    setStage(s);
  };

  // Canvas-wide moving parts, made once per opening.
  const sv = useMemo(
    () => ({
      dim: makeMutable(0),
      legendDim: makeMutable(0),
      flash: makeMutable(0),
      goldFlash: makeMutable(0),
      drop: makeMutable(-h),
      squash: makeMutable(0),
      dust: makeMutable(0),
      bobOn: makeMutable(0),
      wob: makeMutable(0),
      shake: makeMutable(0),
      lid: makeMutable(0),
      chestX: makeMutable(L.intro.x),
      chestY: makeMutable(L.intro.y),
      chestS: makeMutable(L.intro.scale),
      chestO: makeMutable(0),
      lidGlow: makeMutable(0),
      openBurst: makeMutable(0),
      confetti: makeMutable(0),
      tapHint: makeMutable(0),
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ---- the timeline -------------------------------------------------------------------------

  const finishReveal = useCallback(
    (i: number) => {
      busy.current = false;
      setRevealing(-1);
      setDone(i + 1);
      nextIndex.current = i + 1;
      if (i + 1 >= rewards.length) {
        timers.at(400, () => toSummary(false));
      } else {
        timers.at(700, () => revealNext());
      }
    },
    [rewards.length], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const revealNext = useCallback(() => {
    if (busy.current || stageRef.current !== 'reveal') return;
    const i = nextIndex.current;
    if (i >= rewards.length) return;
    timers.clear();
    busy.current = true;
    setRevealing(i);
    const slot = slots[i];
    const plan = revealPlan(slot.kind, slot.rarity);
    if (slot.kind === 'cash') fx.play('coin', { haptic: false });
    else if (slot.kind === 'gems') fx.play('gems', { haptic: false });
    else if (slot.rarity) {
      const r = slot.rarity;
      const haptic = pulses[i] >= PULSES_FULL[r];
      timers.at(plan.pre, () => fx.play('card_flip'));
      timers.at(plan.pre + plan.flip, () => fx.play(REVEAL_SOUND[r], haptic ? undefined : { haptic: false }));
      if (r === 'legendary') {
        sv.legendDim.value = withSequence(withTiming(0.82, { duration: 400 }), withDelay(plan.pre - 400 + plan.flip + 1700, withTiming(0, { duration: 600 })));
        sv.goldFlash.value = withDelay(plan.pre + plan.flip, withSequence(withTiming(0.75, { duration: 70 }), withTiming(0, { duration: 650 })));
        sv.confetti.value = withDelay(plan.pre + plan.flip, withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 2600, easing: Easing.linear })));
      }
    }
    timers.at(plan.pre + plan.flip + plan.hold, () => finishReveal(i));
  }, [rewards.length, slots, pulses]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = useCallback(() => {
    if (stageRef.current !== 'ready' && stageRef.current !== 'intro') return;
    timers.clear();
    go('opening');
    sv.tapHint.value = withTiming(0, { duration: 120 });
    sv.bobOn.value = withTiming(0, { duration: 120 });
    fx.play('chest_shake');
    sv.wob.value = 0;
    sv.wob.value = withTiming(1, { duration: 450, easing: Easing.linear });
    sv.shake.value = withSequence(withTiming(1, { duration: 120 }), withDelay(230, withTiming(0, { duration: 100 })));
    timers.at(450, () => {
      fx.play('chest_open');
      sv.lid.value = withSpring(1, { damping: 9, stiffness: 160 });
      sv.flash.value = withSequence(withTiming(0.8, { duration: 60 }), withTiming(0, { duration: 380 }));
      sv.openBurst.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 900 }));
      sv.lidGlow.value = withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 700 }));
    });
    timers.at(700, () => {
      const e = { duration: 420, easing: Easing.inOut(Easing.cubic) };
      sv.chestY.value = withTiming(L.rest.y, e);
      sv.chestS.value = withTiming(L.rest.scale, e);
    });
    timers.at(900, () => go('dealing'));
    const firstReveal = Math.max(1300, 900 + (rewards.length - 1) * DEAL_GAP_MS + DEAL_MS + 60);
    timers.at(firstReveal, () => {
      go('reveal');
      nextIndex.current = 0;
      revealNext();
    });
  }, [rewards.length, L, revealNext]); // eslint-disable-line react-hooks/exhaustive-deps

  const toSummary = useCallback(
    (skip: boolean) => {
      timers.clear();
      if (skip) {
        busy.current = false;
        setSkipped(true);
        [sv.legendDim, sv.flash, sv.goldFlash, sv.confetti, sv.openBurst, sv.lidGlow, sv.wob, sv.shake, sv.tapHint, sv.bobOn, sv.squash, sv.dust].forEach((v) => {
          cancelAnimation(v);
          v.value = 0;
        });
        cancelAnimation(sv.drop);
        sv.drop.value = 0;
        sv.dim.value = withTiming(0.82, { duration: 150 });
        sv.lid.value = 1;
        sv.chestY.value = L.rest.y;
        sv.chestS.value = L.rest.scale;
      }
      sv.chestO.value = withTiming(0, { duration: 260 });
      // Also take the chest out of the canvas once faded: the summary panel sits where it was.
      timers.at(280, () => setChestGone(true));
      setRevealing(-1);
      setDone(rewards.length);
      go('summary');
    },
    [rewards.length, L], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // The intro: dim, drop, land, bob. It opens on its own at 2.5 s.
  useEffect(() => {
    sv.dim.value = withTiming(0.82, { duration: 250 });
    sv.chestO.value = withDelay(250, withTiming(1, { duration: 1 }));
    sv.drop.value = withDelay(250, withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) }));
    timers.at(600, () => {
      fx.play('chest_appear');
      sv.squash.value = withSequence(withTiming(1, { duration: 70 }), withSpring(0, { damping: 7, stiffness: 260 }));
      sv.dust.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 520 }));
      sv.bobOn.value = withDelay(200, withTiming(1, { duration: 300 }));
      sv.tapHint.value = withDelay(300, withTiming(1, { duration: 250 }));
      if (stageRef.current === 'intro') go('ready');
    });
    timers.at(2500, () => open());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onBackdrop = () => {
    const s = stageRef.current;
    if (s === 'ready' || s === 'intro') open();
    else if (s === 'reveal') {
      if (!busy.current) revealNext();
    }
  };

  const skip = () => toSummary(true);

  // ---- end ----------------------------------------------------------------------------------

  const totalsRef = useRef<HostInstance>(null);
  const totals = useMemo(() => {
    let cash = 0;
    let gems = 0;
    let cards = 0;
    let copies = 0;
    let fresh = 0;
    for (const g of rewards) {
      if (g.type === 'cash') cash += g.amount;
      else if (g.type === 'gems') gems += g.amount;
      else if (g.type === 'card') {
        cards++;
        copies += g.copies;
        if (g.isNew) fresh++;
      }
    }
    return { cash, gems, cards, copies, fresh };
  }, [rewards]);

  const announce = (after: () => void) => {
    const node = totalsRef.current;
    let doneOnce = false;
    const finish = () => {
      if (doneOnce) return;
      doneOnce = true;
      after();
    };
    if (!node || (totals.cash <= 0 && totals.gems <= 0)) return finish();
    node.measureInWindow((x, y, width, height) => {
      if (totals.cash > 0) fly.emit({ kind: 'cash', from: { x: x + width * 0.3, y: y + height / 2 }, to: 'header:cash', count: 8 });
      if (totals.gems > 0) fly.emit({ kind: 'gems', from: { x: x + width * 0.7, y: y + height / 2 }, to: 'header:gems', count: 6 });
      finish();
    });
    setTimeout(finish, 120);
  };

  const collect = () => {
    fx.play('ui_close');
    announce(() => closeChest());
  };
  const openNext = () => {
    if (!nextId) return collect();
    announce(() => openChest(nextId));
  };

  // ---- drawing ------------------------------------------------------------------------------

  const chestTransform = useDerivedValue(() => {
    const bob = sv.bobOn.value * Math.sin(clock.value / 260) * 5;
    const q = sv.squash.value;
    const wob = sv.wob.value;
    // Three wobbles, strongest in the middle.
    const angle = wob > 0 && wob < 1 ? Math.sin(wob * Math.PI * 6) * 0.11 * Math.sin(wob * Math.PI) : 0;
    return [
      { translateX: sv.chestX.value },
      { translateY: sv.chestY.value + sv.drop.value - Math.max(0, bob) },
      { rotate: angle },
      { scaleX: 1 + 0.16 * q },
      { scaleY: 1 - 0.2 * q },
    ];
  });
  const lidGlowO = useDerivedValue(() => {
    const ready = sv.bobOn.value * (0.55 + 0.35 * Math.sin(clock.value / 260));
    return Math.max(ready, sv.lidGlow.value);
  });
  const lidGlowY = useDerivedValue(() => -105 * sv.chestS.value);
  const glowScale = useDerivedValue(() => sv.chestS.value);
  const glowColor = best ? RARITY_GLOW[best] : '#FFE7A3';
  const backPalette = useMemo(() => ({ primary: t.c.primary, accent: t.c.accent }), [t.c.primary, t.c.accent]);
  const gemColor = '#3FB8F5';
  const burstColors = useMemo(() => [glowColor, '#FFFFFF', '#FFE08A'], [glowColor]);

  const phaseOf = (i: number): SlotPhase => {
    if (skipped) return 'shown';
    if (i < done) return 'done';
    if (i === revealing) return 'reveal';
    if (stage === 'dealing' || stage === 'reveal' || stage === 'summary') return 'dealt';
    return 'hidden';
  };

  const tapHintStyle = useAnimatedStyle(() => ({ opacity: sv.tapHint.value * (0.65 + 0.35 * Math.sin(clock.value / 300)) }));
  const showLabels = (i: number) => skipped || i < done;
  const legendOn = revealing >= 0 && slots[revealing]?.rarity === 'legendary';

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onBackdrop} accessibilityLabel={stage === 'ready' ? 'Open the chest' : 'Next reward'}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Wash width={w} height={h} color="#120A06" opacity={sv.dim} />
          <Group>
            {/* The chest, its lid light in the best rarity colour, and the landing dust. */}
            <Group opacity={sv.chestO}>
              {chestGone ? null : (
              <Group transform={chestTransform}>
                <Glow cx={0} cy={lidGlowY} r={150} color={glowColor} opacity={lidGlowO} scale={glowScale} />
                <Chest x={0} y={0} scale={sv.chestS} tier={tier} lid={sv.lid} shake={sv.shake} clock={clock} />
              </Group>
              )}
              <Dust cx={L.intro.x} cy={L.intro.y} progress={sv.dust} spread={110 * L.intro.scale} />
              <Burst cx={sv.chestX} cy={L.rest.y - 60} progress={sv.openBurst} colors={burstColors} radius={220} count={30} seed={11} />
            </Group>
            <Wash width={w} height={h} color="#000000" opacity={sv.legendDim} />
            {slots.map((s, i) => (
              <OpeningSlot
                key={i}
                m={motions[i]}
                index={i}
                kind={s.kind}
                rarity={s.rarity}
                icon={s.icon}
                cardId={s.cardId}
                phase={phaseOf(i)}
                rest={s.rest}
                from={mouth}
                centre={L.centre}
                clock={clock}
                backPalette={backPalette}
                gemColor={gemColor}
              />
            ))}
          </Group>
          <Confetti width={w} height={h} progress={sv.confetti} />
          <Wash width={w} height={h} color="#FFFFFF" opacity={sv.flash} />
          <Wash width={w} height={h} color="#FFE7A0" opacity={sv.goldFlash} />
        </Canvas>
      </Pressable>

      {/* Gem icons and every label sit over the canvas, following the slots' own motion values. */}
      {slots.map((s, i) =>
        s.kind === 'gems' ? <SlotIcon key={`i${i}`} m={motions[i]} icon={cfg.strings.gemIcon} /> : null,
      )}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, legendOn && { opacity: 0.15 }]}>
        {slots.map((s, i) => (showLabels(i) ? <SlotLabel key={`l${i}`} index={i} slot={s} L={L} cardsSnap={cardsSnap} rewards={rewards} /> : null))}
      </View>
      {legendOn ? <LegendBanner slot={slots[revealing]} L={L} /> : null}

      <View pointerEvents="box-none" style={[styles.header, { width: w }]}>
        <View style={styles.headerSide} />
        <View style={styles.headerMid} pointerEvents="none">
          <Text style={[styles.title, t.display]} numberOfLines={1} adjustsFontSizeToFit>
            {chest?.name ?? ''}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {stage === 'summary' ? 'Everything you got' : `${rewards.length} ${rewards.length === 1 ? 'item' : 'items'}`}
          </Text>
        </View>
        <View style={styles.headerSide}>
          {stage === 'summary' ? (
            <Pressable onPress={collect} accessibilityRole="button" accessibilityLabel="Collect and close" style={styles.skip} hitSlop={8}>
              <Text style={styles.skipText}>✕</Text>
            </Pressable>
          ) : (
            <Pressable onPress={skip} accessibilityRole="button" accessibilityLabel="Skip to the summary" style={styles.skip} hitSlop={8}>
              <Text style={styles.skipText}>Skip ⏭</Text>
            </Pressable>
          )}
        </View>
      </View>

      {stage === 'ready' || stage === 'intro' ? (
        <Animated.View pointerEvents="none" style={[styles.tapHint, { top: L.intro.y + 18 }, tapHintStyle]}>
          <Text style={[styles.tapText, t.display]}>Tap to open</Text>
        </Animated.View>
      ) : null}

      {stage === 'summary' ? (
        <Summary
          totalsRef={totalsRef}
          totals={totals}
          left={left}
          nextLabel={nextId ? cfg.meta.chests.find((c) => c.id === nextId)?.name ?? '' : ''}
          onCollect={collect}
          onNext={nextId ? openNext : undefined}
        />
      ) : null}
    </View>
  );
}

/** The game's gem icon riding on a gem slot (an emoji cannot be drawn inside the canvas). */
function SlotIcon({ m, icon }: { m: SlotMotion; icon: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: m.shown.value,
    transform: [{ translateX: m.x.value - 28 }, { translateY: m.y.value - 42 }, { scale: Math.max(0.001, m.s.value * m.pop.value) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.slotIcon, style]}>
      <GameIcon icon={icon} size={56} />
    </Animated.View>
  );
}

/** Under a revealed reward: its name or amount, NEW, the copies gained and the card's level bar. */
function SlotLabel({ index, slot, L, cardsSnap, rewards }: { index: number; slot: SlotInfo; L: ReturnType<typeof computeLayout>; cardsSnap: Parameters<typeof progressAfterReveal>[1]; rewards: M.GrantedReward[] }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const g = rewards[index];
  const fade = useMemo(() => makeMutable(0), []);
  const stamp = useMemo(() => makeMutable(1.7), []);
  useEffect(() => {
    fade.value = withTiming(1, { duration: 220 });
    stamp.value = withDelay(120, withSpring(1, { damping: 14, stiffness: 380, overshootClamping: false }));
  }, [fade, stamp]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: (1 - fade.value) * 6 }] }));
  const stampStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, fade.value * 2), transform: [{ rotate: '-14deg' }, { scale: stamp.value }] }));
  if (!g) return null;
  const { rest } = slot;
  const width = Math.min(L.colW - 4, 132);
  const left = rest.x - width / 2;
  const top = rest.y + L.cardH / 2 + 4;
  const progress = progressAfterReveal(cfg, cardsSnap, rewards, index);
  const card = g.type === 'card' ? cardOf(cfg, g.cardId) : undefined;
  const color = card ? RARITY_COLORS[card.rarity] : '#FFE08A';

  let title = '';
  if (g.type === 'cash') title = `+${formatMoney(g.amount, cfg.strings.currencySymbol)}`;
  else if (g.type === 'gems') title = `+${formatNumber(g.amount)} ${cfg.strings.gemName}`;
  const s = rest.scale;

  return (
    <>
      {card ? (
        // The name goes on the card's own blank name plate.
        <Animated.View pointerEvents="none" style={[styles.plate, { left: rest.x + CARD_NAMEPLATE.x * s, top: rest.y + CARD_NAMEPLATE.y * s, width: CARD_NAMEPLATE.width * s, height: CARD_NAMEPLATE.height * s }, fadeStyle]}>
          <Text style={[styles.plateText, t.display, { fontSize: Math.max(9, 11.5 * s) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {card.name}
          </Text>
        </Animated.View>
      ) : null}
      <Animated.View pointerEvents="none" style={[styles.label, { left, top, width }, fadeStyle]}>
        {title ? (
          <Text style={[styles.labelTitle, t.display, { fontSize: 17, color: '#FFE9A8' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {title}
          </Text>
        ) : null}
        {progress && card ? (
          <View style={styles.barRow}>
            <Text style={[styles.lv, t.display, { color }]} numberOfLines={1}>
              {`Lv ${progress.level}`}
            </Text>
            <View style={[styles.bar, { borderColor: alpha('#FFFFFF', 0.35) }]}>
              <View style={{ width: `${Math.min(1, progress.copies / progress.needed) * 100}%`, height: '100%', backgroundColor: progress.canLevel ? '#5BD46B' : color }} />
              <Text style={styles.barText} numberOfLines={1} adjustsFontSizeToFit>
                {progress.canLevel ? 'Level up ready' : `${progress.copies}/${progress.needed}`}
              </Text>
            </View>
          </View>
        ) : null}
      </Animated.View>
      {g.type === 'card' ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.copies, { left: rest.x + L.cardW / 2 - 34, top: rest.y + L.cardH / 2 - 26, backgroundColor: color }, fadeStyle]}>
            <Text style={[styles.copiesText, t.display]} numberOfLines={1}>{`×${g.copies}`}</Text>
          </Animated.View>
          {g.isNew ? (
            <Animated.View pointerEvents="none" style={[styles.stamp, { left: rest.x - L.cardW / 2 - 10, top: rest.y - L.cardH * 0.12 }, stampStyle]}>
              <Text style={[styles.stampText, t.display]}>NEW</Text>
            </Animated.View>
          ) : null}
          {card && (card.rarity === 'epic' || card.rarity === 'legendary') ? (
            <Animated.View pointerEvents="none" style={[styles.rarityTag, { left: rest.x - 40, top: rest.y - L.cardH / 2 - 12, borderColor: color }, fadeStyle]}>
              <Text style={[styles.rarityText, { color }]} numberOfLines={1}>{RARITY_NAMES[card.rarity].toUpperCase()}</Text>
            </Animated.View>
          ) : null}
        </>
      ) : null}
    </>
  );
}

/** The name of a legendary card, shown under it while it is held in the middle of the screen. */
function LegendBanner({ slot, L }: { slot: SlotInfo; L: ReturnType<typeof computeLayout> }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const card = cardOf(cfg, slot.cardId);
  const plan = revealPlan('card', 'legendary');
  const o = useMemo(() => makeMutable(0), []);
  useEffect(() => {
    o.value = withDelay(plan.pre + plan.flip, withSequence(withSpring(1, { damping: 10, stiffness: 200 }), withDelay(1500, withTiming(0, { duration: 300 }))));
  }, [o, plan.pre, plan.flip]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, o.value), transform: [{ scale: 0.7 + 0.3 * o.value }] }));
  if (!card) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.legend, { top: L.centre.y + (CARD_SIZE.height * L.centre.scale) / 2 + 14 }, style]}>
      <Text style={styles.legendKicker}>{RARITY_NAMES.legendary.toUpperCase()}</Text>
      <Text style={[styles.legendName, t.display]} numberOfLines={1} adjustsFontSizeToFit>
        {card.name}
      </Text>
    </Animated.View>
  );
}

function Summary({ totalsRef, totals, left, nextLabel, onCollect, onNext }: {
  totalsRef: React.RefObject<HostInstance | null>;
  totals: { cash: number; gems: number; cards: number; copies: number; fresh: number };
  left: number;
  nextLabel: string;
  onCollect: () => void;
  onNext?: () => void;
}) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const rise = useMemo(() => makeMutable(0), []);
  useEffect(() => {
    rise.value = withSpring(1, { damping: 14, stiffness: 180 });
  }, [rise]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, rise.value * 1.5), transform: [{ translateY: (1 - rise.value) * 60 }] }));
  const parts: { icon: string; text: string }[] = [];
  if (totals.cash > 0) parts.push({ icon: cfg.strings.currencyIcon, text: `+${formatMoney(totals.cash, cfg.strings.currencySymbol)}` });
  if (totals.gems > 0) parts.push({ icon: cfg.strings.gemIcon, text: `+${formatNumber(totals.gems)}` });
  if (totals.cards > 0) parts.push({ icon: '🃏', text: `${totals.cards} ${totals.cards === 1 ? 'card' : 'cards'}${totals.copies > totals.cards ? ` (${totals.copies} copies)` : ''}${totals.fresh > 0 ? ` · ${totals.fresh} new` : ''}` });
  return (
    <Animated.View style={[styles.summary, { backgroundColor: t.c.surface, borderRadius: t.radius * 1.3 }, style]}>
      <View ref={totalsRef} style={styles.totals}>
        {parts.map((p, i) => (
          <View key={i} style={styles.total}>
            <GameIcon icon={p.icon} size={22} />
            <Text style={[styles.totalText, t.display, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {p.text}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.buttons}>
        {onNext ? <Button label={`Open next (${left} left)`} sublabel={nextLabel} variant="accent" onPress={onNext} style={styles.btn} /> : null}
        <Button label="Collect" onPress={onCollect} variant="success" style={styles.btn} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 10 },
  headerSide: { width: 92, alignItems: 'flex-end' },
  headerMid: { flex: 1, alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 24, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700', marginTop: 1 },
  skip: { minWidth: 76, height: 44, borderRadius: 22, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  skipText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  tapHint: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  tapText: { color: '#FFFFFF', fontSize: 22, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  slotIcon: { position: 'absolute', left: 0, top: 0, width: 56, height: 56 },
  label: { position: 'absolute', alignItems: 'center' },
  plate: { position: 'absolute', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  plateText: { color: '#3A2416', textAlign: 'center' },
  legend: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  legendKicker: { color: '#FFD95A', fontSize: 15, fontWeight: '900', letterSpacing: 4 },
  legendName: { color: '#FFFFFF', fontSize: 30, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  labelTitle: { color: '#FFFFFF', fontSize: 14, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, alignSelf: 'stretch' },
  lv: { fontSize: 11 },
  bar: { flex: 1, height: 15, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, justifyContent: 'center' },
  barText: { position: 'absolute', left: 2, right: 2, textAlign: 'center', color: '#FFFFFF', fontSize: 10, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 2 },
  copies: { position: 'absolute', minWidth: 34, height: 24, borderRadius: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  copiesText: { color: '#FFFFFF', fontSize: 13, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 2 },
  stamp: { position: 'absolute', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#FF4D5E', borderWidth: 2, borderColor: '#FFFFFF' },
  stampText: { color: '#FFFFFF', fontSize: 14, letterSpacing: 1 },
  rarityTag: { position: 'absolute', width: 80, alignItems: 'center', borderRadius: 8, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 1 },
  rarityText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  summary: { position: 'absolute', left: 12, right: 12, bottom: 14, padding: 12, gap: 10 },
  totals: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14, rowGap: 4 },
  total: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  totalText: { fontSize: 17, flexShrink: 1 },
  buttons: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, minHeight: 52 },
});
