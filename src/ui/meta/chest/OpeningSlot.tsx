/**
 * One reward of a chest opening, inside the overlay's canvas: it flies out of the chest face down,
 * then turns over with the build-up of its rarity (design sheet §5, the rarity ladder). The parent
 * only sets `phase`; every movement runs here on the UI thread, so React renders once per step.
 * Timings live in REVEAL so the parent can schedule sounds and the next reveal on the same clock.
 */
import { BlurMask, Group, Oval, Path, RoundedRect, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  Easing,
  cancelAnimation,
  makeMutable,
  useDerivedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { Rarity } from '../../../config/schema';
import { Card, CARD_SIZE, Coin } from '../../sim/art/props';
import { Burst, Glow, Rays } from './Fx';
import { CardPortrait } from './Portrait';
import { RARITY_GLOW } from './shared';

export type SlotKind = 'card' | 'cash' | 'gems';
export type SlotPhase = 'hidden' | 'dealt' | 'reveal' | 'done' | 'shown';

/** Build-up before the flip, the flip itself, and the moment held after it (ms). */
export interface RevealPlan {
  pre: number;
  flip: number;
  hold: number;
}

export const DEAL_MS = 380;
export const DEAL_GAP_MS = 80;

export function revealPlan(kind: SlotKind, rarity: Rarity | null): RevealPlan {
  if (kind !== 'card' || !rarity) return { pre: 0, flip: 220, hold: 120 };
  switch (rarity) {
    case 'common':
      return { pre: 0, flip: 220, hold: 160 };
    case 'rare':
      return { pre: 250, flip: 260, hold: 300 };
    case 'epic':
      return { pre: 500, flip: 300, hold: 600 };
    case 'legendary':
      // The 2 s hold, then 400 ms to fly back to its place.
      return { pre: 900, flip: 360, hold: 2400 };
  }
}

export interface Spot {
  x: number;
  y: number;
  scale: number;
}

/** The moving parts of one slot. Made with makeMutable so the canvas and the React Native labels share them. */
export interface SlotMotion {
  x: SharedValue<number>;
  y: SharedValue<number>;
  s: SharedValue<number>;
  rot: SharedValue<number>;
  shown: SharedValue<number>;
  flip: SharedValue<number>;
  pop: SharedValue<number>;
  glow: SharedValue<number>;
  rays: SharedValue<number>;
  burst: SharedValue<number>;
  shimmer: SharedValue<number>;
  z: SharedValue<number>;
}

/**
 * Every slot draws above the chest group and the dim wash that share its parent (z 0), so a slot
 * can never tie with them and land underneath, whatever order the canvas sorts equal zIndex in.
 */
export function slotZ(index: number): number {
  return 10 + index;
}

export function makeSlotMotion(from: Spot, kind: SlotKind, index: number): SlotMotion {
  return {
    x: makeMutable(from.x),
    y: makeMutable(from.y),
    s: makeMutable(from.scale),
    rot: makeMutable(0),
    shown: makeMutable(0),
    flip: makeMutable(kind === 'card' ? 0 : 1),
    pop: makeMutable(1),
    glow: makeMutable(0),
    rays: makeMutable(0),
    burst: makeMutable(0),
    shimmer: makeMutable(0),
    z: makeMutable(slotZ(index)),
  };
}

interface Props {
  m: SlotMotion;
  index: number;
  kind: SlotKind;
  rarity: Rarity | null;
  icon: string;
  cardId: string;
  phase: SlotPhase;
  rest: Spot;
  from: Spot;
  centre: Spot;
  clock: SharedValue<number>;
  backPalette: { primary: string; accent: string };
  gemColor: string;
}

const out = Easing.out(Easing.cubic);
const inOut = Easing.inOut(Easing.quad);

/** A card-sized tile under a cash or gem reward, so every reward in the row reads as a thing won. */
function RewardTile({ w, h, frame }: { w: number; h: number; frame: string }) {
  return (
    <Group>
      <RoundedRect x={-w / 2} y={-h / 2 + 4} width={w} height={h} r={12} color="rgba(0,0,0,0.35)" />
      <RoundedRect x={-w / 2} y={-h / 2} width={w} height={h} r={12} color="#FFF4DC" />
      <RoundedRect x={-w / 2 + 6} y={-h / 2 + 6} width={w - 12} height={h - 12} r={8} color="#F6E2B8" />
      <RoundedRect x={-w / 2} y={-h / 2} width={w} height={h} r={12} color={frame} style="stroke" strokeWidth={5} />
    </Group>
  );
}

export function OpeningSlot({ m, index, kind, rarity, icon, cardId, phase, rest, from, centre, clock, backPalette, gemColor }: Props) {
  const { x, y, s, rot, shown, flip, pop, glow, rays, burst, shimmer, z } = m;
  const sack = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    b.moveTo(-14, -20);
    b.cubicTo(-20, -8, -40, 4, -38, 24);
    b.cubicTo(-36, 44, -18, 50, 0, 50);
    b.cubicTo(18, 50, 36, 44, 38, 24);
    b.cubicTo(40, 4, 20, -8, 14, -20);
    b.close();
    return b.build();
  }, []);

  // Whether this slot was dealt onto the table. A quick tap can move a slot from 'hidden' straight to
  // 'reveal' (both state changes in one render); it is then put in place first, or it would stay
  // invisible while its labels show.
  const dealt = useRef(false);
  useEffect(() => {
    const all = [x, y, s, rot, shown, flip, pop, glow, rays, burst, shimmer];
    const settle = () => {
      all.forEach((v) => cancelAnimation(v));
      x.value = rest.x;
      y.value = rest.y;
      s.value = rest.scale;
      rot.value = 0;
      shown.value = 1;
      flip.value = 1;
      pop.value = 1;
      glow.value = 0;
      rays.value = 0;
      burst.value = 0;
      shimmer.value = 0;
      z.value = slotZ(index);
    };
    if (phase === 'hidden') {
      dealt.current = false;
      shown.value = 0;
      return;
    }
    if (phase === 'shown') return settle();
    if (phase !== 'dealt' && !dealt.current) {
      dealt.current = true;
      settle();
      if (phase === 'reveal' && kind === 'card') flip.value = 0;
    }
    if (phase === 'dealt') {
      dealt.current = true;
      const d = index * DEAL_GAP_MS;
      // withDelay(0, ...) is avoided on purpose: the first slot starts its animations directly.
      const later = <T,>(ms: number, a: T): T => (ms > 0 ? (withDelay(ms, a as never) as T) : a);
      rot.value = index % 2 === 0 ? -0.5 : 0.5;
      shown.value = later(d, withTiming(1, { duration: 60 }));
      x.value = later(d, withTiming(rest.x, { duration: DEAL_MS, easing: out }));
      // An arc: up out of the chest, then down onto its place.
      y.value = later(
        d,
        withSequence(
          withTiming(Math.min(from.y, rest.y) - 50, { duration: DEAL_MS * 0.45, easing: Easing.out(Easing.quad) }),
          withTiming(rest.y, { duration: DEAL_MS * 0.55, easing: Easing.in(Easing.quad) }),
        ),
      );
      s.value = later(d, withTiming(rest.scale, { duration: DEAL_MS, easing: out }));
      rot.value = later(d, withTiming(0, { duration: DEAL_MS, easing: out }));
      pop.value = withDelay(d + DEAL_MS, withSequence(withTiming(1.08, { duration: 70 }), withTiming(1, { duration: 120 })));
      return;
    }
    if (phase !== 'reveal') return;
    const plan = revealPlan(kind, rarity);
    const flipAt = plan.pre;
    const endAt = plan.pre + plan.flip;
    if (kind !== 'card') {
      // Coins and gems: a quick hop and a sparkle.
      pop.value = withSequence(withTiming(1.3, { duration: 120, easing: out }), withTiming(1, { duration: 200, easing: Easing.out(Easing.back(2)) }));
      burst.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 650 }));
      glow.value = withSequence(withTiming(0.9, { duration: 100 }), withTiming(0, { duration: 500 }));
      return;
    }
    flip.value = withDelay(flipAt, withTiming(1, { duration: plan.flip, easing: inOut }));
    switch (rarity) {
      case 'common':
      case null:
        pop.value = withDelay(endAt, withSequence(withTiming(1.1, { duration: 80 }), withTiming(1, { duration: 140 })));
        break;
      case 'rare':
        shimmer.value = withSequence(withTiming(1, { duration: plan.pre }), withTiming(0.6, { duration: plan.flip }), withTiming(0, { duration: 300 }));
        pop.value = withDelay(endAt, withSequence(withTiming(1.12, { duration: 90 }), withTiming(1, { duration: 180 })));
        burst.value = withDelay(endAt, withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 700 })));
        break;
      case 'epic':
        z.value = 60;
        // Lift towards the player while purple light fans out behind.
        y.value = withSequence(withTiming(rest.y - 22, { duration: plan.pre, easing: out }), withDelay(plan.flip + 300, withTiming(rest.y, { duration: 300, easing: inOut })));
        s.value = withSequence(withTiming(rest.scale * 1.22, { duration: plan.pre, easing: out }), withDelay(plan.flip + 300, withTiming(rest.scale, { duration: 300, easing: inOut })));
        rays.value = withSequence(withTiming(1, { duration: plan.pre }), withDelay(plan.flip + 200, withTiming(0, { duration: 400 })));
        glow.value = withSequence(withTiming(0.8, { duration: plan.pre }), withTiming(1, { duration: plan.flip }), withTiming(0, { duration: 600 }));
        burst.value = withDelay(endAt, withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 900 })));
        break;
      case 'legendary': {
        z.value = 110;
        const move = 400;
        const beat = (plan.pre - move) / 3;
        x.value = withSequence(withTiming(centre.x, { duration: move, easing: out }), withDelay(plan.flip + 2000, withTiming(rest.x, { duration: 400, easing: inOut })));
        y.value = withSequence(withTiming(centre.y, { duration: move, easing: out }), withDelay(plan.flip + 2000, withTiming(rest.y, { duration: 400, easing: inOut })));
        s.value = withSequence(withTiming(centre.scale, { duration: move, easing: out }), withDelay(plan.flip + 2000, withTiming(rest.scale, { duration: 400, easing: inOut })));
        // Three gold heartbeats.
        const thump = withSequence(withTiming(1.1, { duration: beat * 0.3, easing: out }), withTiming(1, { duration: beat * 0.7, easing: Easing.in(Easing.quad) }));
        pop.value = withSequence(withTiming(1, { duration: move }), thump, thump, thump, withTiming(1.15, { duration: 100 }), withTiming(1, { duration: plan.flip }));
        glow.value = withSequence(
          withTiming(0.5, { duration: move }),
          withRepeat(withSequence(withTiming(1, { duration: beat * 0.3 }), withTiming(0.55, { duration: beat * 0.7 })), 3, false),
          withTiming(1, { duration: plan.flip }),
          withDelay(1700, withTiming(0, { duration: 700 })),
        );
        rays.value = withSequence(withTiming(0.6, { duration: plan.pre }), withTiming(1, { duration: plan.flip }), withDelay(1600, withTiming(0, { duration: 800 })));
        burst.value = withDelay(endAt, withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 1100 })));
        break;
      }
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }, { rotate: rot.value }, { scale: Math.max(0.001, s.value * pop.value) }]);
  const glowColor = rarity ? RARITY_GLOW[rarity] : kind === 'gems' ? gemColor : '#FFE08A';
  const rayColor = rarity === 'legendary' ? '#FFD95A' : '#C77DFF';
  const burstColors =
    rarity === 'legendary' ? ['#FFC93C', '#FFF2AE', '#FFFFFF'] : rarity === 'epic' ? ['#C77DFF', '#F1DBFF', '#FFFFFF'] : rarity === 'rare' ? ['#5CB8FF', '#FFFFFF'] : kind === 'gems' ? [gemColor, '#FFFFFF'] : ['#FFC93C', '#FFFFFF'];
  const W = CARD_SIZE.width;
  const H = CARD_SIZE.height;

  let body: ReactNode;
  if (kind === 'card') {
    body = (
      <>
        <RoundedRect x={-W / 2 - 3} y={-H / 2 - 3} width={W + 6} height={H + 6} r={13} color="#7CC8FF" style="stroke" strokeWidth={7} opacity={shimmer}>
          <BlurMask blur={7} style="solid" />
        </RoundedRect>
        <Card x={0} y={0} rarity={rarity ?? 'common'} flip={flip} clock={clock} palette={backPalette}>
          <CardPortrait icon={icon} fallbackId={cardId} />
        </Card>
      </>
    );
  } else if (kind === 'cash') {
    body = (
      <Group>
        <RewardTile w={W} h={H} frame="#E0A93A" />
        <Group transform={[{ translateY: -12 }]}>
        <Coin x={-16} y={30} scale={1.5} />
        <Coin x={14} y={30} scale={1.5} />
        <Coin x={-1} y={18} scale={1.5} />
        <Coin x={-1} y={4} scale={1.6} />
        <Coin x={0} y={-12} scale={1.7} spin={0.35} clock={clock} />
        </Group>
      </Group>
    );
  } else {
    // A cloth pouch; the game's own gem icon sits in its mouth (a React Native label over the canvas,
    // because the icon may be an emoji, which Skia cannot draw without a font).
    body = (
      <Group>
        <RewardTile w={W} h={H} frame={gemColor} />
        <Path path={sack} color="#D9B47A" />
        <Path path={sack} color="#5B3A1E" style="stroke" strokeWidth={3.5} />
        <Oval x={-24} y={10} width={20} height={26} color="#FFFFFF" opacity={0.25} />
        <RoundedRect x={-17} y={-24} width={34} height={9} r={4} color="#9A6430" />
        <RoundedRect x={-17} y={-24} width={34} height={9} r={4} color="#5B3A1E" style="stroke" strokeWidth={3} />
      </Group>
    );
  }

  return (
    <Group transform={transform} opacity={shown} zIndex={z}>
      {rarity === 'epic' || rarity === 'legendary' ? <Rays cx={0} cy={0} radius={rarity === 'legendary' ? 230 : 160} color={rayColor} opacity={rays} clock={clock} count={rarity === 'legendary' ? 18 : 12} /> : null}
      <Glow cx={0} cy={0} r={kind === 'card' ? 110 : 80} color={glowColor} opacity={glow} />
      {body}
      <Burst cx={0} cy={0} progress={burst} colors={burstColors} radius={rarity === 'legendary' ? 210 : rarity === 'epic' ? 160 : 100} count={rarity === 'legendary' ? 36 : 20} seed={index + 3} />
    </Group>
  );
}
