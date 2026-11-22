/**
 * The first game's drawn pieces that the tab-shell modes share (family "tabs", scripts/lib/modes.js):
 * coins, gems, the sparkle burst, the tutorial glove, the treasure chest, the staff cards and the
 * six "art:" icons drawn in this style. Never in a bundle of a mode outside that family. Moved here from
 * src/ui/sim/art/props.tsx (the restaurant's own props stay there). Same conventions: every
 * export is a Skia element that sits inside someone else's <Canvas>; `x`, `y` are canvas pixels
 * (floating things are placed by their centre); `scale` 1 is scene size; animation runs on the
 * UI thread from `clock`.
 */
import { Group, Picture, Skia, type SkPath, type SkPicture } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { OUTLINE, Pen, alpha, arc, blob, capsule, circle, curve, ellipse, hashString, lightOf, line, merged, mix, outlineFor, poly, rrect, rrect4, shadeOf, star, twinkle, type Pt } from './draw';
import { DEFAULT_PALETTE, usePalette, INK, WHITE, type Anim, put, pop, clamp01, ease, backOut, life, frac, num, tick, sinceBump, useRig, useArt, rc, rec, addLight, shapeWith, UNIT, drawShadow } from './kit';
import type { ArtIconArt, ArtIconSource } from './icons';
import type { ArtPalette, ChestTier, Rarity } from './types';

/** The gold of coins, sparkles and gilded trims. */
export const GOLD = '#FFC93C';

function drawCoinFace(p: Pen, gold: string) {
  p.shape(circle(0, 0, 20), gold, { ow: 3, shade: 3.6, light: 2.4 });
  p.stroke(circle(0, 0, 14), shadeOf(gold, 0.9), 2.2);
  // An embossed star.
  p.shape(star(0.6, 1.2, 9, 5, 0.48), shadeOf(gold, 0.7), { ow: 0, shade: false });
  p.shape(star(0, 0, 9, 5, 0.48), lightOf(gold, 0.45), { ow: 1.8, outline: shadeOf(gold, 1.6), shade: false });
  p.shine(arc(0, 0, 16.5, 16.5, 200, 55), WHITE, 2.6, 0.9);
}

function drawCoinEdge(p: Pen, gold: string) {
  p.shape(circle(0, 0, 20), shadeOf(gold, 1.5), { ow: 3, shade: false });
}

export interface CoinProps {
  /** Centre, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  /** 1 is about 22 px across. */
  scale?: Anim<number>;
  /** Turns per second; 0 holds it still, facing us. */
  spin?: number;
  clock?: SharedValue<number>;
  /** Coin colour. Default gold. */
  color?: string;
  zIndex?: Anim<number>;
}

const COIN_KEYS = ['edge', 'face'] as const;

/** A gold coin with a star on it; spins on its axis if asked. */
export function Coin({ x, y, scale = 1, spin = 0, clock, color = GOLD, zIndex }: CoinProps) {
  const art = useArt(`coin:${color}`, () => ({ face: rec((p) => drawCoinFace(p, color)), edge: rec((p) => drawCoinEdge(p, color)) }));
  const m = useRig(
    COIN_KEYS,
    (o) => {
      'worklet';
      const k = UNIT * num(scale);
      const a = clock && spin ? (clock.value / 1000) * spin * Math.PI * 2 : 0;
      const cs = Math.cos(a);
      const sn = Math.sin(a);
      const w = Math.max(0.1, Math.abs(cs));
      put(o.face, num(x) - sn * 2.4 * k, num(y), 0, w * k, k);
      if (Math.abs(cs) > 0.985) pop(o.edge, 0, 0, 0, 0);
      else put(o.edge, num(x) + sn * 2.4 * k, num(y), 0, Math.max(0.16, w) * k, k);
    },
    [x, y, scale, spin, clock],
  );
  return (
    <Group zIndex={zIndex}>
      <Picture picture={art.edge} matrix={m.edge} />
      <Picture picture={art.face} matrix={m.face} />
    </Group>
  );
}

function drawGem(p: Pen, color: string) {
  const outline = [[-17, -6], [-9, -15], [9, -15], [17, -6], [0, 17]] as Pt[];
  p.shape(poly(outline), color, { ow: 3, shade: false });
  const lite = lightOf(color, 0.7);
  const mid = lightOf(color, 0.3);
  const deep = shadeOf(color, 1.2);
  // Crown facets.
  p.fill(poly([[-9, -15], [9, -15], [5, -6], [-5, -6]]), lite);
  p.fill(poly([[-17, -6], [-9, -15], [-5, -6]]), mid);
  p.fill(poly([[17, -6], [9, -15], [5, -6]]), color);
  // Pavilion facets.
  p.fill(poly([[-17, -6], [-5, -6], [0, 17]]), mid);
  p.fill(poly([[-5, -6], [5, -6], [0, 17]]), color);
  p.fill(poly([[5, -6], [17, -6], [0, 17]]), deep);
  const facet = alpha(outlineFor(color, OUTLINE), 0.5);
  p.stroke(poly([[-17, -6], [17, -6]], false), facet, 1.4);
  p.stroke(poly([[-5, -6], [0, 17], [5, -6]], false), facet, 1.2);
  p.stroke(poly([[-9, -15], [-5, -6]], false), facet, 1.2);
  p.stroke(poly([[9, -15], [5, -6]], false), facet, 1.2);
  p.stroke(poly(outline), OUTLINE, 3);
  p.shine(line(-6, -12, 2, -12), WHITE, 2.4, 0.9);
}

export interface GemProps {
  /** Centre, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  /** 1 is about 20 px across. */
  scale?: Anim<number>;
  /** Default a bright blue. */
  color?: string;
  /** With a clock it twinkles and floats a little. */
  clock?: SharedValue<number>;
  zIndex?: Anim<number>;
}

const GEM_KEYS = ['gem', 'twinkle'] as const;

/** A cut gem (the premium currency). */
export function Gem({ x, y, scale = 1, color = '#3FB8F5', clock, zIndex }: GemProps) {
  const art = useArt(`gem:${color}`, () => ({ gem: rec((p) => drawGem(p, color)), twinkle: rec((p) => p.shape(twinkle(0, 0, 7), WHITE, { ow: 1.6, shade: false })) }));
  const seed = useMemo(() => (hashString(color) % 100) / 10, [color]);
  const m = useRig(
    GEM_KEYS,
    (o) => {
      'worklet';
      const k = UNIT * num(scale);
      const t = clock ? clock.value / 1000 + seed : 0;
      const bob = clock ? Math.sin(t * 2.2) * 1.6 : 0;
      put(o.gem, num(x), num(y) + bob * k, 0, k, k);
      if (!clock) {
        pop(o.twinkle, 0, 0, 0, 0);
        return;
      }
      const u = frac(t / 1.7);
      const s = life(u, 0.15, 0.25) * (u < 0.4 ? 1 : 0);
      pop(o.twinkle, num(x) - 13 * k, num(y) + (bob - 15) * k, u * 2, s * k * 0.85);
    },
    [x, y, scale, clock, seed],
  );
  return (
    <Group zIndex={zIndex}>
      <Picture picture={art.gem} matrix={m.gem} />
      <Picture picture={art.twinkle} matrix={m.twinkle} />
    </Group>
  );
}


/** How long a sparkle burst lasts after `trigger` changes, in ms. */
export const SPARKLE_MS = 900;

const BURST_N = 8;
const BURST_KEYS = ['ring', 'plus', ...Array.from({ length: BURST_N }, (_, i) => `s${i}`)] as readonly string[];

function drawPlusOne(p: Pen, color: string) {
  const plus = merged(rrect(-20, -4.5, 17, 9, 3.5), rrect(-16, -12.5, 9, 25, 3.5));
  // The "1": a flag, a stem and a foot.
  const one = poly([[4, -10], [11, -16], [17, -16], [17, 10], [21, 10], [21, 17], [5, 17], [5, 10], [9.5, 10], [9.5, -6], [4, -2.5]]);
  // A heavy dark rim first, so the gold reads on a cream floor.
  p.stroke(plus, OUTLINE, 8);
  p.stroke(one, OUTLINE, 8);
  p.shape(plus, color, { ow: 3, shade: 2.2, light: 1.4 });
  p.shape(one, color, { ow: 3, shade: 2.2, light: 1.4 });
}

export interface SparkleBurstProps {
  /** Centre of the burst, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  scale?: Anim<number>;
  /** Fires a burst whenever it changes: `trigger.value += 1`. Lasts `SPARKLE_MS`. */
  trigger: SharedValue<number>;
  clock: SharedValue<number>;
  /** Sparkle colour. Default gold. */
  color?: string;
  /** Show the rising "+1". Default true. */
  plusOne?: boolean;
  zIndex?: Anim<number>;
}

/** A burst of sparkles with a "+1" that pops up and floats away. Shapes only. */
export function SparkleBurst({ x, y, scale = 1, trigger, clock, color = GOLD, plusOne = true, zIndex }: SparkleBurstProps) {
  const art = useArt(`burst:${color}`, () => ({
    spark: rec((p) => {
      p.shape(twinkle(0, 0, 8), color, { ow: 2.6, shade: false });
      p.fill(twinkle(-1, -1, 3.4), WHITE);
    }),
    ring: rec((p) => {
      p.stroke(circle(0, 0, 20), alpha(OUTLINE, 0.75), 6.5);
      p.stroke(circle(0, 0, 20), lightOf(color, 0.4), 3.6);
    }),
    plus: rec((p) => drawPlusOne(p, color)),
  }));
  const m = useRig(
    BURST_KEYS,
    (o, mem) => {
      'worklet';
      const u = sinceBump(mem, 1, trigger.value, clock.value) / SPARKLE_MS;
      const X = num(x);
      const Y = num(y);
      const k = UNIT * num(scale);
      if (u >= 1 || u < 0) {
        for (const key of BURST_KEYS) pop(o[key], 0, 0, 0, 0);
        return;
      }
      const out = 1 - (1 - u) * (1 - u) * (1 - u);
      const rs = life(u, 0.05, 0.6) * (0.4 + 1.3 * out);
      pop(o.ring, X, Y, 0, rs * k);
      for (let i = 0; i < BURST_N; i++) {
        const a = (i / BURST_N) * Math.PI * 2 + 0.3;
        const r = (i % 2 === 0 ? 34 : 24) * out;
        const s = life(u, 0.08, 0.55) * (i % 2 === 0 ? 1 : 0.7);
        pop(o[`s${i}`], X + Math.cos(a) * r * k, Y + Math.sin(a) * r * k, u * 3, s * k);
      }
      if (!plusOne) {
        pop(o.plus, 0, 0, 0, 0);
        return;
      }
      // The "+1" pops in with an overshoot (about 1.2x), settles, floats up and shrinks away.
      const pin = u < 0.12 ? ease(u / 0.12) * 1.22 : u < 0.24 ? 1.22 - 0.22 * ease((u - 0.12) / 0.12) : 1;
      const ps = 1.25 * pin * (u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1);
      pop(o.plus, X, Y - (12 + 30 * ease(u)) * k, -0.08 + 0.08 * u, ps * k);
    },
    [x, y, scale, trigger, clock, plusOne],
  );
  return (
    <Group zIndex={zIndex}>
      <Picture picture={art.ring} matrix={m.ring} />
      {BURST_KEYS.slice(2).map((key) => (
        <Picture key={key} picture={art.spark} matrix={m[key]} />
      ))}
      <Picture picture={art.plus} matrix={m.plus} />
    </Group>
  );
}

/** A cartoon glove pointing up, fingertip at the origin. */
function drawHand(p: Pen, glove: string, cuff: string) {
  const sh = shadeOf(glove, 0.9);
  // Cuff.
  p.shape(rrect4(-15, 50, 31, 15, 4, 4, 6, 6), cuff, { ow: 2.8, shade: 2.2, light: 1.2 });
  p.stroke(line(-11, 56, 12, 56), shadeOf(cuff, 1.3), 1.6);
  // Fist with the three curled fingers.
  const fist = blob([[-18, 26], [-8, 18], [10, 19], [20, 28], [21, 42], [14, 52], [-12, 52], [-20, 42]]);
  p.shape(fist, glove, { ow: 3, shade: 3, light: 1.8 });
  for (const y of [30, 37.5, 45]) p.stroke(curve([[3, y], [12, y - 1], [19, y + 1]]), sh, 1.8);
  // Index finger.
  p.shape(capsule(0, 6.5, 0, 30, 7), glove, { ow: 3, shade: 2.2, light: 1.6 });
  p.stroke(line(-2.4, 22, 2.4, 22), sh, 1.5);
  // Thumb across the front.
  p.shape(capsule(-17, 34, -4, 29, 5.6), glove, { ow: 2.8, shade: 1.8 });
  p.shine(line(-3, 11, -3, 18), WHITE, 2, 0.9);
}

export interface HandPointerProps {
  /** The spot it taps, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  scale?: Anim<number>;
  clock: SharedValue<number>;
  /** Degrees: 0 points straight up from below, positive tilts the hand to come from the lower right. Default 25. */
  angle?: number;
  palette?: Partial<ArtPalette>;
  zIndex?: Anim<number>;
}

/** How long one tap of the tutorial hand takes, in ms. */
export const HAND_TAP_MS = 1100;
const HAND_KEYS = ['hand', 'ring'] as const;

/** A bouncing hand that taps a spot, with a ripple on each tap: for tutorials. */
export function HandPointer({ x, y, scale = 1, clock, angle = 25, palette, zIndex }: HandPointerProps) {
  const [pal, palKey] = usePalette(palette);
  const art = useArt(`hand:${palKey}`, () => ({
    hand: rec((p) => drawHand(p, WHITE, pal.primary), pal.outline),
    ring: rec((p) => {
      p.stroke(ellipse(0, 0, 16, 9), alpha(pal.outline, 0.5), 4.6);
      p.stroke(ellipse(0, 0, 16, 9), WHITE, 2.6);
    }, pal.outline),
  }));
  const rad = (angle * Math.PI) / 180;
  const m = useRig(
    HAND_KEYS,
    (o) => {
      'worklet';
      const k = UNIT * num(scale);
      const u = frac(clock.value / HAND_TAP_MS);
      // Hovers back, swoops in, presses (a squash), and lifts off again.
      let d: number;
      let squash = 0;
      if (u < 0.45) d = 18 - 18 * ease(u / 0.45);
      else if (u < 0.6) {
        d = 0;
        squash = Math.sin(((u - 0.45) / 0.15) * Math.PI);
      } else d = 18 * ease((u - 0.6) / 0.4);
      const dx = Math.sin(rad) * d * k;
      const dy = Math.cos(rad) * d * k;
      put(o.hand, num(x) + dx, num(y) + dy, rad, k * (1 + 0.06 * squash), k * (1 - 0.08 * squash));
      const r = u >= 0.5 && u < 0.95 ? (u - 0.5) / 0.45 : -1;
      if (r < 0) pop(o.ring, 0, 0, 0, 0);
      else pop(o.ring, num(x), num(y), 0, k * (0.4 + 1.1 * r) * life(r, 0.1, 0.5));
    },
    [x, y, scale, clock, rad],
  );
  return (
    <Group zIndex={zIndex}>
      <Picture picture={art.ring} matrix={m.ring} />
      <Picture picture={art.hand} matrix={m.hand} />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Treasure chest
// ---------------------------------------------------------------------------

interface ChestStyle {
  body: string;
  band: string;
  lock: string;
  rivet: string;
  /** Studs on the bands and the lid; null for none. */
  gem: string | null;
  glow: string;
  rays: string;
}

const CHEST_STYLES: Record<ChestTier, ChestStyle> = {
  wood: { body: '#C27C3F', band: '#7F889A', lock: '#E9B04E', rivet: '#C7CEDA', gem: null, glow: '#FFC24D', rays: '#FFE7A3' },
  silver: { body: '#4E72C2', band: '#E4EAF2', lock: '#F6F8FC', rivet: '#FFFFFF', gem: '#5CD3F7', glow: '#9DE6FF', rays: '#E8FAFF' },
  gold: { body: '#C7303F', band: '#FFC93C', lock: '#FFD95A', rivet: '#FFF2B0', gem: '#2FCB8C', glow: '#FFD047', rays: '#FFF4B8' },
};

/** Size of the closed chest at `scale` 1, in pixels: made to be the star of a reward screen. */
export const CHEST_SIZE = { width: 180, height: 170 } as const;
/** Ms of one lid rattle cycle while `shake` is up (sound and haptics can follow it). */
export const CHEST_RATTLE_MS = 200;

const CHEST_UNIT = 1.17;
const CW = 72;
const RIM_Y = -86;
const BACK_Y = -102;

function chestGemAt(p: Pen, x: number, y: number, r: number, color: string) {
  p.shape(poly([[x, y - r], [x + r * 0.8, y], [x, y + r], [x - r * 0.8, y]]), color, { ow: 2.2, shade: false });
  p.fill(poly([[x, y - r], [x + r * 0.8, y], [x, y]]), lightOf(color, 0.55));
  p.fill(poly([[x, y + r], [x - r * 0.8, y], [x, y]]), shadeOf(color, 0.9));
  p.stroke(poly([[x, y - r], [x + r * 0.8, y], [x, y + r], [x - r * 0.8, y]]), OUTLINE, 2.2);
}

function drawChestBody(p: Pen, s: ChestStyle, tier: ChestTier) {
  const box = rrect4(-CW, -84, CW * 2, 84, 4, 4, 12, 12);
  shapeWith(
    p,
    box,
    s.body,
    () => {
      const joint = shadeOf(s.body, 1.6);
      for (const y of [-58, -31]) p.stroke(line(-CW, y, CW, y), joint, 2.4, true);
      // Grain.
      for (const [x, y, w] of [[-30, -70, 16], [8, -45, 20], [-22, -18, 14], [24, -66, 10], [26, -20, 14]] as [number, number, number][])
        p.stroke(curve([[x - w / 2, y], [x, y - 1.6], [x + w / 2, y]]), alpha(joint, 0.55), 1.6);
      // The lid's shadow on the front, right under the rim.
      p.fill(rrect(-CW, -84, CW * 2, 9, 0), alpha(INK, 0.2));
    },
    { shade: 7, light: 3 },
  );
  // Iron (or silver, or gold) straps.
  for (const bx of [-47, 47]) {
    p.shape(rrect(bx - 8.5, -84, 17, 84, 2), s.band, { ow: 2.8, shade: 3, light: 1.6 });
    for (const y of [-70, -13]) p.shape(circle(bx, y, 2.8), s.rivet, { ow: 1.6, shade: false });
    if (s.gem) chestGemAt(p, bx, -42, 6.5, s.gem);
  }
  // Corner caps.
  for (const sg of [-1, 1]) {
    const x0 = sg * (CW + 2);
    p.shape(poly([[x0, -26], [x0, 0], [x0 - sg * 24, 0]]), shadeOf(s.band, 0.4), { ow: 2.6, shade: false });
    p.shape(circle(x0 - sg * 6, -7, 2.4), s.rivet, { ow: 1.4, shade: false });
  }
  p.shape(rrect(-CW - 3, -11, CW * 2 + 6, 11, 4), s.band, { ow: 2.8, shade: 2.6 });
  // The front rim the lid closes on.
  p.shape(rrect(-CW - 3, RIM_Y - 3, CW * 2 + 6, 11, 4), s.band, { ow: 2.8, shade: 2.4, light: 1.4 });
  // Lock plate and keyhole.
  const plate = rrect4(-16, -80, 32, 36, 3, 3, 14, 14);
  p.shape(plate, s.lock, { ow: 2.8, shade: 3.2, light: 2 });
  p.dot(0, -63, 4.4, INK);
  p.fill(poly([[-2.4, -61], [2.4, -61], [3.8, -51], [-3.8, -51]]), INK);
  if (tier === 'gold') {
    p.shape(circle(-10, -48, 2.2), s.rivet, { ow: 1.3, shade: false });
    p.shape(circle(10, -48, 2.2), s.rivet, { ow: 1.3, shade: false });
  }
}

const LID_H = 56;

function lidPath(inset = 0): SkPath {
  const w = CW + 2 - inset;
  const h = LID_H - inset * 1.1;
  return blob([[-w, 0, 0], [-w, -h * 0.44], [-w * 0.78, -h * 0.84], [0, -h], [w * 0.78, -h * 0.84], [w, -h * 0.44], [w, 0, 0]]);
}

/** The lid's front, origin at the middle of its bottom edge. */
function drawChestLid(p: Pen, s: ChestStyle, tier: ChestTier) {
  const dome = lidPath();
  shapeWith(
    p,
    dome,
    s.body,
    () => {
      const joint = shadeOf(s.body, 1.6);
      p.stroke(curve([[-CW - 2, -26], [-40, -36], [0, -39], [40, -36], [CW + 2, -26]]), joint, 2.4);
      for (const bx of [-47, 47]) {
        p.shape(rrect(bx - 8.5, -LID_H - 4, 17, LID_H + 4, 0), s.band, { ow: 2.8, shade: 3, light: 1.6 });
        p.shape(circle(bx, -22, 2.8), s.rivet, { ow: 1.6, shade: false });
      }
    },
    { shade: 7, light: 4 },
  );
  p.shine(curve([[-62, -24], [-52, -40], [-30, -50]]), WHITE, 4.2, 0.7);
  // The lid's bottom edge.
  p.shape(rrect(-CW - 3, -11, CW * 2 + 6, 12, 4), s.band, { ow: 2.8, shade: 2.4, light: 1.4 });
  if (tier === 'gold' && s.gem) {
    // A crest on top.
    p.shape(rrect(-14, -LID_H - 4, 28, 18, 6), s.band, { ow: 2.6, shade: 2.4, light: 1.4 });
    chestGemAt(p, 0, -LID_H + 5, 7.5, s.gem);
  } else if (tier === 'silver') {
    for (const x of [-20, 20]) p.shape(circle(x, -5, 2.4), s.rivet, { ow: 1.4, shade: false });
  }
  // The hasp, hanging over the lock.
  p.shape(rrect4(-10.5, -15, 21, 27, 3, 3, 9, 9), s.lock, { ow: 2.6, shade: 2.4, light: 1.5 });
  p.dot(0, 5, 3, shadeOf(s.lock, 1.5));
}

/** The underside of the open lid, standing up behind the opening; origin at the hinge. */
function drawChestLidInside(p: Pen, s: ChestStyle) {
  shapeWith(
    p,
    lidPath(),
    s.band,
    () => {
      const inner = lidPath(9);
      p.fill(inner, mix(s.body, '#1A0C06', 0.42));
      for (const bx of [-47, 47]) p.fill(rrect(bx - 7, -LID_H, 14, LID_H, 0), alpha(shadeOf(s.band, 1.6), 0.55));
      p.stroke(curve([[-CW + 7, -24], [-30, -32], [30, -32], [CW - 7, -24]]), alpha(INK, 0.4), 2);
      p.radial(inner, 0, 4, 64, [alpha(lightOf(s.glow, 0.4), 0.85), alpha(s.glow, 0.35), alpha(s.glow, 0)], [0, 0.5, 1]);
    },
    { shade: false },
  );
  p.stroke(lidPath(9), alpha(OUTLINE, 0.7), 2);
}

/** The opening seen from above: dark, full of light. Chest coordinates. */
function drawChestMouth(p: Pen, s: ChestStyle) {
  p.shape(rrect(-CW - 3, BACK_Y - 6, CW * 2 + 6, 10, 4), shadeOf(s.band, 1.1), { ow: 2.6, shade: false });
  const m = rrect(-CW + 3, BACK_Y - 2, CW * 2 - 6, RIM_Y - BACK_Y + 6, 6);
  p.fill(m, '#2A1609');
  p.radial(m, 0, RIM_Y, 76, [alpha(WHITE, 0.95), alpha(s.glow, 0.9), alpha(s.glow, 0.2)], [0, 0.45, 1]);
  p.stroke(m, OUTLINE, 2.4);
}

/** What is inside, origin at the middle of the front rim; it pops up out of the chest. */
function drawLoot(p: Pen, s: ChestStyle, tier: ChestTier) {
  const mound = blob([[-62, 6, 0], [-54, -5], [-30, -15], [0, -20], [30, -15], [54, -5], [62, 6, 0]]);
  p.shape(mound, GOLD, { ow: 2.8, shade: 4, light: 2.4 });
  const coin = (x: number, y: number, r = 7) => {
    p.shape(ellipse(x, y, r, r * 0.46), lightOf(GOLD, 0.3), { ow: 1.9, shade: false });
    p.stroke(ellipse(x, y, r * 0.55, r * 0.24), shadeOf(GOLD, 0.8), 1.2);
  };
  for (const [x, y] of [[-40, -6], [-22, -12], [-4, -16], [16, -13], [36, -7], [-30, -1], [6, -6], [26, 0], [48, 0], [-50, 2]] as Pt[]) coin(x, y);
  // A coin standing up.
  p.at(-14, -20, () => drawCoinFace(p, GOLD), -14, 0.42);
  const gems = tier === 'wood' ? [] : tier === 'silver' ? [[22, -22, s.gem ?? '#5CD3F7'], [-38, -14, '#B48CFF']] : [[24, -24, '#2FCB8C'], [-38, -16, '#3FB8F5'], [44, -12, '#FF5A7A']];
  for (const [x, y, c] of gems as [number, number, string][]) p.at(x, y, () => drawGem(p, c), 10, 0.5);
  if (tier === 'gold') {
    // A little crown on top of the pile.
    p.at(4, -24, () => {
      p.shape(poly([[-13, 6], [-15, -10], [-7, -2], [0, -14], [7, -2], [15, -10], [13, 6]]), GOLD, { ow: 2.4, shade: 2.2, light: 1.4 });
      p.dot(0, -1, 2.6, '#FF5A7A');
      p.shape(rrect(-13, 3, 26, 5, 2), shadeOf(GOLD, 0.6), { ow: 2, shade: false });
    }, 8, 0.9);
  }
}

function drawRays(p: Pen, s: ChestStyle) {
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const long = i % 2 === 0;
    const hw = long ? 0.13 : 0.08;
    const L = long ? 200 : 150;
    const wedge = poly([[0, 0], [Math.cos(a - hw) * L, Math.sin(a - hw) * L], [Math.cos(a + hw) * L, Math.sin(a + hw) * L]]);
    p.radial(wedge, 0, 0, L, [alpha(s.rays, 0.95), alpha(s.rays, 0.55), alpha(s.rays, 0)], [0, 0.4, 1]);
  }
}

function drawHalo(p: Pen, s: ChestStyle) {
  p.radial(circle(0, 0, 120), 0, 0, 120, [alpha(WHITE, 0.95), alpha(lightOf(s.glow, 0.5), 0.7), alpha(s.glow, 0)], [0, 0.35, 1]);
}

function drawLeak(p: Pen, s: ChestStyle) {
  p.at(0, 0, () => addLight(p, circle(0, 0, 90), 0, 0, 90, [alpha(WHITE, 0.9), alpha(s.glow, 0.5), alpha(s.glow, 0)], [0, 0.35, 1]), 0, 1, 0.42);
}

function drawGleam(p: Pen) {
  p.fill(poly([[-16, -170], [6, -170], [-44, 20], [-66, 20]]), alpha(WHITE, 0.42));
  p.fill(poly([[14, -170], [22, -170], [-28, 20], [-36, 20]]), alpha(WHITE, 0.3));
}

const CHEST_SPARKS = 6;
const CHEST_KEYS = ['root', 'halo', 'rays', 'lidIn', 'mouth', 'loot', 'lidOut', 'gleam', 'leak', ...Array.from({ length: CHEST_SPARKS }, (_, i) => `k${i}`)] as readonly string[];

interface ChestArt {
  shadow: SkPicture;
  halo: SkPicture;
  rays: SkPicture;
  lidIn: SkPicture;
  mouth: SkPicture;
  loot: SkPicture;
  body: SkPicture;
  lidOut: SkPicture;
  gleam: SkPicture;
  leak: SkPicture;
  spark: SkPicture;
}

export interface ChestProps {
  /** The floor point under the middle of the chest, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  /** 1 is `CHEST_SIZE` (180 px wide). */
  scale?: Anim<number>;
  tier: ChestTier;
  /** 0 closed .. 1 wide open. Drive it with `withTiming`/`withSpring`; light, rays and loot follow. */
  lid: Anim<number>;
  /** 0..1: how hard it rattles (the "tap to open" build-up). */
  shake?: Anim<number>;
  /** Glow rays behind the open chest. Default true. */
  rays?: boolean;
  clock: SharedValue<number>;
  zIndex?: Anim<number>;
}

/** A treasure chest in three tiers. It rattles, bursts open, and its light fans out as rays. */
export function Chest({ x, y, scale = 1, tier, lid, shake = 0, rays = true, clock, zIndex }: ChestProps) {
  const s = CHEST_STYLES[tier];
  const art = useArt<ChestArt>(`chest:${tier}`, () => ({
    shadow: rec((p) => drawShadow(p, 84, 12, 1.4)),
    halo: rec((p) => drawHalo(p, s)),
    rays: rec((p) => drawRays(p, s)),
    lidIn: rec((p) => drawChestLidInside(p, s)),
    mouth: rec((p) => drawChestMouth(p, s)),
    loot: rec((p) => drawLoot(p, s, tier)),
    body: rec((p) => drawChestBody(p, s, tier)),
    lidOut: rec((p) => drawChestLid(p, s, tier)),
    gleam: rec((p) => drawGleam(p)),
    leak: rec((p) => drawLeak(p, s)),
    spark: rec((p) => {
      p.shape(twinkle(0, 0, 10), lightOf(s.glow, 0.5), { ow: 2, shade: false });
      p.fill(twinkle(-1.2, -1.2, 4.2), WHITE);
    }),
  }));
  // The closed silhouette, for the gleam that runs across it.
  const clip = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    b.addRRect({ rect: rc(-CW - 3, -86, CW * 2 + 6, 86), rx: 10, ry: 10 });
    b.addPath(translatedLid());
    const path = b.build();
    b.dispose();
    return path;
  }, []);
  // The light spilling over the front dims as the chest opens, so the loot (and the gold tier's crown and gems) stay crisp.
  const dimTo = tier === 'gold' ? 0.45 : 0.6;
  const leakOpacity = useDerivedValue(() => 1 - (1 - dimTo) * ease((clamp01(num(lid)) - 0.3) / 0.4));
  const m = useRig(
    CHEST_KEYS,
    (o, mem) => {
      'worklet';
      const now = clock.value;
      tick(mem, now);
      const t = now / 1000;
      const u = clamp01(num(lid));
      const sh = clamp01(num(shake));
      const k = CHEST_UNIT * num(scale);
      const wob = sh * Math.sin((now / CHEST_RATTLE_MS) * Math.PI * 2);
      const rot = 0.07 * wob;
      const c = Math.cos(rot);
      const sn = Math.sin(rot);
      // Rotate about the floor point, with a little hop on each rattle.
      const r = o.root;
      r[0] = c * k;
      r[1] = -sn * k;
      r[2] = num(x) + sh * 2.5 * k * Math.sin(t * 53);
      r[3] = sn * k;
      r[4] = c * k * (1 + 0.03 * Math.abs(wob));
      r[5] = num(y);
      // The lid swings about its hinge on the back rim: 0 shut, 0.7 about 77 degrees, 1 tipped back to 110 degrees.
      // Its front lip travels on a circle round the hinge; the outside face foreshortens (cos) as it tips,
      // and the dark, lit inside fills the gap between the lip and the hinge, so the lid never floats.
      const rattle = u < 0.02 ? 5 * sh * Math.abs(Math.sin((now / CHEST_RATTLE_MS) * Math.PI)) : 0;
      const th = 1.92 * (0.15 * ease(u) + 0.85 * u);
      const hy = BACK_Y + 1;
      const lipY = hy + (RIM_Y - BACK_Y) * Math.cos(th) - LID_H * Math.sin(th) - rattle;
      const face = Math.cos(th);
      if (face > 0.06) put(o.lidOut, 0, lipY, 0, 1, face);
      else pop(o.lidOut, 0, 0, 0, 0);
      const inside = (hy - lipY) / LID_H;
      if (inside > 0.02) put(o.lidIn, 0, hy, 0, 1, inside);
      else pop(o.lidIn, 0, 0, 0, 0);
      put(o.mouth, 0, 0, 0, 1, 1);
      pop(o.loot, 0, RIM_Y + 2, 0, 1.22 * backOut((u - 0.25) / 0.45));
      const leak = Math.max(clamp01(u * 3), (rattle / 5) * 0.8);
      pop(o.leak, 0, RIM_Y - 6, 0, leak * (1 + 0.05 * Math.sin(t * 7)));
      const ray = rays ? ease((u - 0.3) / 0.6) : 0;
      pop(o.rays, 0, RIM_Y - 14, t * 0.35, ray * (1 + 0.04 * Math.sin(t * 2.6)));
      pop(o.halo, 0, RIM_Y - 14, 0, ease((u - 0.15) / 0.6) * (1 + 0.06 * Math.sin(t * 3.1)));
      // A gleam runs over the closed chest every few seconds.
      const g = frac(t / 3.2);
      if (u < 0.02 && g < 0.25) put(o.gleam, -110 + 240 * (g / 0.25), 0, 0, 1, 1);
      else pop(o.gleam, 0, 0, 0, 0);
      // Sparkles pop around the open chest.
      for (let i = 0; i < CHEST_SPARKS; i++) {
        const q = frac(t / 1.6 + i / CHEST_SPARKS);
        const a = -Math.PI / 2 + (i - (CHEST_SPARKS - 1) / 2) * 0.55;
        const rr = 70 + 40 * q + (i % 2) * 18;
        pop(o[`k${i}`], Math.cos(a) * rr * 1.25, RIM_Y - 10 + Math.sin(a) * rr, q * 2, ease((u - 0.5) / 0.4) * life(q, 0.2, 0.4) * (i % 2 ? 0.7 : 1));
      }
    },
    [clock, x, y, scale, lid, shake, rays],
  );
  return (
    <Group matrix={m.root} zIndex={zIndex}>
      <Picture picture={art.shadow} />
      <Picture picture={art.halo} matrix={m.halo} />
      <Picture picture={art.rays} matrix={m.rays} />
      <Picture picture={art.lidIn} matrix={m.lidIn} />
      <Picture picture={art.mouth} matrix={m.mouth} />
      <Picture picture={art.loot} matrix={m.loot} />
      <Picture picture={art.body} />
      <Picture picture={art.lidOut} matrix={m.lidOut} />
      <Group clip={clip}>
        <Picture picture={art.gleam} matrix={m.gleam} />
      </Group>
      <Group opacity={leakOpacity}>
        <Picture picture={art.leak} matrix={m.leak} />
      </Group>
      {CHEST_KEYS.slice(9).map((key) => (
        <Picture key={key} picture={art.spark} matrix={m[key]} />
      ))}
    </Group>
  );
}

/** The closed lid's outline in chest coordinates (not tracked: it outlives any recording). */
function translatedLid(): SkPath {
  const w = CW + 2;
  const h = LID_H;
  const b = Skia.PathBuilder.Make();
  b.moveTo(-w, RIM_Y);
  b.lineTo(-w, RIM_Y - h * 0.44);
  b.quadTo(-w, RIM_Y - h, 0, RIM_Y - h);
  b.quadTo(w, RIM_Y - h, w, RIM_Y - h * 0.44);
  b.lineTo(w, RIM_Y);
  b.close();
  const path = b.build();
  b.dispose();
  return path;
}

// ---------------------------------------------------------------------------
// Staff cards: a back, and a front frame per rarity
// ---------------------------------------------------------------------------

/** Size of a card at `scale` 1, in pixels. Cards are placed by their centre. */
export const CARD_SIZE = { width: 110, height: 150 } as const;
/** The window for the portrait, in pixels from the card's centre at `scale` 1. `CardFrame` children are drawn in it. */
export const CARD_WINDOW = { x: -43, y: -60, width: 86, height: 84 } as const;
/** The blank name plate under the window, in pixels from the card's centre at `scale` 1 (put the name over it). */
export const CARD_NAMEPLATE = { x: -46, y: 30, width: 92, height: 17 } as const;
/** How long the shine takes to cross an epic or legendary card, and how often it comes back (ms). */
export const CARD_SHINE_MS = 650;
export const CARD_SHINE_EVERY_MS = 2600;

const CARD_UNIT = 0.5;
const CHW = 110;
const CHH = 150;
const WIN = { x: CARD_WINDOW.x * 2, y: CARD_WINDOW.y * 2, w: CARD_WINDOW.width * 2, h: CARD_WINDOW.height * 2 };

interface CardStyle {
  frame: string;
  trim: string;
  panel: string;
  bg: [string, string];
  gem: string;
  pips: number;
  plate: string;
}

const CARD_STYLES: Record<Rarity, CardStyle> = {
  common: { frame: '#B7AC9C', trim: '#F3EDE3', panel: '#D9D0C2', bg: ['#FFFFFF', '#E3DBCD'], gem: '#A8A094', pips: 1, plate: '#F3EDE3' },
  rare: { frame: '#3C8AE0', trim: '#E7EEF7', panel: '#7DB7EE', bg: ['#F0FAFF', '#86C6F2'], gem: '#5FC6FF', pips: 2, plate: '#E7EEF7' },
  epic: { frame: '#9A4BDD', trim: '#FFC93C', panel: '#BE8AF0', bg: ['#FCF2FF', '#B47CEE'], gem: '#E177FF', pips: 3, plate: '#FFF4D6' },
  legendary: { frame: '#FFAE22', trim: '#FFF2AE', panel: '#FFD066', bg: ['#FFFBE0', '#FFB13F'], gem: '#FF4D5E', pips: 4, plate: '#D8343F' },
};

const cardPath = () => rrect(-CHW, -CHH, CHW * 2, CHH * 2, 18);
const winPath = () => rrect(WIN.x, WIN.y, WIN.w, WIN.h, 14);

function pipGem(p: Pen, x: number, y: number, r: number, color: string) {
  chestGemAt(p, x, y, r, color);
}

/** Frame and window backdrop: everything under the portrait. Card units (2 per pixel), origin at the centre. */
function drawCardBase(p: Pen, r: Rarity) {
  const s = CARD_STYLES[r];
  const fancy = r === 'epic' || r === 'legendary';
  shapeWith(
    p,
    cardPath(),
    s.frame,
    () => {
      // Inner panel inside the trim.
      p.fill(rrect(-CHW + 13, -CHH + 13, CHW * 2 - 26, CHH * 2 - 26, 10), s.panel);
      if (r === 'rare' || fancy) {
        // A pattern on the panel: diagonal lattice.
        const lat = alpha(WHITE, r === 'rare' ? 0.16 : 0.2);
        for (let d = -CHH * 2; d < CHH * 2; d += 22) {
          p.stroke(line(d, -CHH, d + CHH * 2, CHH), lat, 2, true);
          p.stroke(line(d, CHH, d + CHH * 2, -CHH), lat, 2, true);
        }
      }
      if (r === 'legendary') {
        // Sun rays behind everything.
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          p.fill(poly([[0, -30], [Math.cos(a - 0.07) * 260, -30 + Math.sin(a - 0.07) * 260], [Math.cos(a + 0.07) * 260, -30 + Math.sin(a + 0.07) * 260]]), alpha(WHITE, 0.18));
        }
      }
    },
    { ow: 4.6, shade: 7, light: 4 },
  );
  // Trim line between frame and panel.
  p.stroke(rrect(-CHW + 13, -CHH + 13, CHW * 2 - 26, CHH * 2 - 26, 10), s.trim, fancy ? 5 : 3.6);
  p.stroke(rrect(-CHW + 13, -CHH + 13, CHW * 2 - 26, CHH * 2 - 26, 10), alpha(OUTLINE, 0.55), 1.4);
  if (fancy) p.stroke(rrect(-CHW + 6, -CHH + 6, CHW * 2 - 12, CHH * 2 - 12, 14), alpha(s.trim, 0.8), 2);
  // Window backdrop.
  const win = winPath();
  p.radial(win, 0, WIN.y + WIN.h * 0.45, WIN.w * 0.75, s.bg, [0.1, 1]);
  p.clipped(win, () => {
    if (r === 'rare') p.fill(ellipse(0, WIN.y + WIN.h + 6, WIN.w * 0.55, 30), alpha(WHITE, 0.35));
    if (r === 'epic') for (const [x, y, k] of [[-62, -100, 5], [54, -88, 4], [-48, -30, 3], [66, -40, 5], [20, -110, 3]] as [number, number, number][]) p.fill(twinkle(x, y, k * 1.6), alpha(WHITE, 0.85));
    if (r === 'legendary')
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const cy = WIN.y + WIN.h * 0.42;
        p.fill(poly([[0, cy], [Math.cos(a - 0.13) * 160, cy + Math.sin(a - 0.13) * 160], [Math.cos(a + 0.13) * 160, cy + Math.sin(a + 0.13) * 160]]), alpha(WHITE, 0.32));
      }
  });
}

/** Window rim, name plate, crest, corners and rarity pips: drawn over the portrait. */
function drawCardTop(p: Pen, r: Rarity) {
  const s = CARD_STYLES[r];
  const win = winPath();
  // A little shade along the window's top edge so the portrait sits inside.
  p.clipped(win, () => p.gradient(rrect(WIN.x, WIN.y, WIN.w, 12, 0), 0, WIN.y, 0, WIN.y + 12, [alpha(INK, 0.22), alpha(INK, 0)]));
  p.stroke(win, s.trim, r === 'common' ? 5 : 7);
  p.stroke(rrect(WIN.x - 4.5, WIN.y - 4.5, WIN.w + 9, WIN.h + 9, 17), OUTLINE, 2.6);
  p.stroke(win, OUTLINE, 2.6);
  // Name plate: a tab for common and rare, a ribbon for epic and legendary.
  const NP = { x: CARD_NAMEPLATE.x * 2, y: CARD_NAMEPLATE.y * 2, w: CARD_NAMEPLATE.width * 2, h: CARD_NAMEPLATE.height * 2 };
  if (r === 'epic' || r === 'legendary') {
    const ribbon = r === 'legendary' ? s.plate : s.frame;
    for (const sg of [-1, 1]) {
      const x0 = sg * (NP.w / 2 - 6);
      const x1 = sg * (NP.w / 2 + 16);
      p.shape(poly([[x0, NP.y + 8], [x1, NP.y + 8], [x1 - sg * 9, NP.y + NP.h / 2 + 8], [x1, NP.y + NP.h + 8], [x0, NP.y + NP.h + 8]]), shadeOf(ribbon, 1.1), { ow: 2.6, shade: false });
    }
    p.shape(rrect(NP.x, NP.y, NP.w, NP.h, 6), ribbon, { ow: 3, shade: 3, light: 2 });
    p.stroke(rrect(NP.x + 5, NP.y + 5, NP.w - 10, NP.h - 10, 3), alpha(s.trim, 0.9), 1.8);
  } else {
    p.shape(rrect(NP.x, NP.y, NP.w, NP.h, 9), s.plate, { ow: 3, shade: 3, light: 1.6 });
  }
  // Rarity pips.
  const n = s.pips;
  for (let i = 0; i < n; i++) pipGem(p, (i - (n - 1) / 2) * 24, 122, 8, s.gem);
  // Corners.
  const corners: Pt[] = [[-CHW + 14, -CHH + 14], [CHW - 14, -CHH + 14], [-CHW + 14, CHH - 14], [CHW - 14, CHH - 14]];
  if (r === 'rare') for (const [x, y] of corners) p.shape(circle(x, y, 5), s.trim, { ow: 2, shade: 1.2 });
  if (r === 'epic' || r === 'legendary') {
    for (const [x, y] of corners) {
      const sx = Math.sign(x);
      const sy = Math.sign(y);
      p.shape(poly([[x + sx * 6, y + sy * 6], [x - sx * 22, y + sy * 6], [x + sx * 6, y - sy * 22]]), r === 'epic' ? s.trim : '#FFE070', { ow: 2.6, shade: false });
      if (r === 'legendary') pipGem(p, x - sx * 1, y - sy * 1, 6, s.gem);
      else p.shape(circle(x - sx * 1, y - sy * 1, 3.4), s.frame, { ow: 1.6, shade: false });
    }
  }
  // Crest over the top edge.
  if (r === 'rare') pipGem(p, 0, -CHH + 2, 10, s.gem);
  if (r === 'epic') {
    const shield = blob([[-18, -CHH - 10, 0], [18, -CHH - 10, 0], [17, -CHH + 6], [0, -CHH + 20, 0], [-17, -CHH + 6]]);
    p.shape(shield, s.trim, { ow: 3, shade: 3, light: 2 });
    pipGem(p, 0, -CHH + 2, 9, s.gem);
  }
  if (r === 'legendary') {
    // Wings and a crown.
    for (const sg of [-1, 1]) {
      const wing = blob([[sg * 14, -CHH + 6], [sg * 30, -CHH - 12], [sg * 54, -CHH - 16], [sg * 46, -CHH - 4], [sg * 58, -CHH + 2], [sg * 40, -CHH + 10], [sg * 20, -CHH + 14]]);
      p.shape(wing, WHITE, { ow: 3, shade: 3, shadeColor: '#E9DFC9' });
      p.stroke(curve([[sg * 24, -CHH + 4], [sg * 38, -CHH - 4], [sg * 50, -CHH - 8]]), alpha(OUTLINE, 0.45), 1.6);
    }
    const crown = poly([[-24, -CHH + 12], [-28, -CHH - 20], [-12, -CHH - 6], [0, -CHH - 28], [12, -CHH - 6], [28, -CHH - 20], [24, -CHH + 12]]);
    p.shape(crown, '#FFD43B', { ow: 3, shade: 3, light: 2 });
    p.shape(rrect(-25, -CHH + 4, 50, 10, 3), '#F6B71E', { ow: 2.6, shade: false });
    for (const [x, y] of [[-28, -CHH - 20], [0, -CHH - 28], [28, -CHH - 20]] as Pt[]) p.shape(circle(x, y, 3.6), WHITE, { ow: 1.8, shade: false });
    pipGem(p, 0, -CHH - 4, 7, s.gem);
  }
}

function drawCardBack(p: Pen, c: ArtPalette) {
  const base = c.primary;
  const trim = c.accent;
  shapeWith(
    p,
    cardPath(),
    base,
    () => {
      p.fill(rrect(-CHW + 13, -CHH + 13, CHW * 2 - 26, CHH * 2 - 26, 10), shadeOf(base, 0.7));
      // Diamond lattice.
      const lat = alpha(lightOf(base, 0.6), 0.35);
      for (let d = -CHH * 2; d < CHH * 2; d += 28) {
        p.stroke(line(d, -CHH, d + CHH * 2, CHH), lat, 2.4, true);
        p.stroke(line(d, CHH, d + CHH * 2, -CHH), lat, 2.4, true);
      }
      p.radial(circle(0, 0, 140), 0, 0, 140, [alpha(lightOf(base, 0.7), 0.55), alpha(base, 0)], [0, 1]);
    },
    { ow: 4.6, shade: 7, light: 4 },
  );
  p.stroke(rrect(-CHW + 13, -CHH + 13, CHW * 2 - 26, CHH * 2 - 26, 10), trim, 4.6);
  p.stroke(rrect(-CHW + 13, -CHH + 13, CHW * 2 - 26, CHH * 2 - 26, 10), alpha(OUTLINE, 0.55), 1.4);
  // Medallion with a star.
  p.shape(circle(0, 0, 48), trim, { ow: 4, shade: 4, light: 2.6 });
  p.shape(circle(0, 0, 37), shadeOf(base, 0.4), { ow: 3, shade: 3 });
  p.shape(star(0, 2, 26, 5, 0.47), trim, { ow: 3, shade: 2.6, light: 1.8 });
  p.shine(arc(0, 0, 42, 42, 200, 60), WHITE, 3.4, 0.8);
  for (const [x, y] of [[-CHW + 26, -CHH + 26], [CHW - 26, -CHH + 26], [-CHW + 26, CHH - 26], [CHW - 26, CHH - 26]] as Pt[]) p.shape(twinkle(x, y, 9), trim, { ow: 2.2, shade: false });
}

function drawCardShine(p: Pen, gold: boolean) {
  const c = gold ? '#FFF6C8' : WHITE;
  p.fill(poly([[-22, -170], [14, -170], [-48, 170], [-84, 170]]), alpha(c, 0.55));
  p.fill(poly([[26, -170], [38, -170], [-24, 170], [-36, 170]]), alpha(c, 0.4));
}

const CARD_SPARKS = 4;
const CARD_KEYS = ['root', 'back', 'front', 'shine', 'aura', ...Array.from({ length: CARD_SPARKS }, (_, i) => `k${i}`)] as readonly string[];

interface CardArt {
  base: SkPicture;
  top: SkPicture;
  back: SkPicture;
  shine: SkPicture;
  aura: SkPicture | null;
  spark: SkPicture;
}

export interface CardProps {
  /** Centre of the card, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  /** 1 is `CARD_SIZE` (110 x 150 px). */
  scale?: Anim<number>;
  rarity?: Rarity;
  /** 0 shows the back, 1 the front; in between it turns over (drive it with `withTiming`). */
  flip?: Anim<number>;
  /** Colours of the card back (primary and accent). */
  palette?: Partial<ArtPalette>;
  clock: SharedValue<number>;
  /** The portrait, in pixels with the origin at the window's top left (`CARD_WINDOW` is the size); clipped to the window. */
  children?: ReactNode;
  zIndex?: Anim<number>;
}

/** A staff card that can turn over: the back, then the front frame of its rarity with a portrait in the window. */
export function Card({ x, y, scale = 1, rarity = 'common', flip = 1, palette, clock, children, zIndex }: CardProps) {
  const [pal, palKey] = usePalette(palette);
  const fancy = rarity === 'epic' || rarity === 'legendary';
  const art = useArt<CardArt>(`card:${rarity}:${palKey}`, () => ({
    base: rec((p) => drawCardBase(p, rarity), OUTLINE, 4.6),
    top: rec((p) => drawCardTop(p, rarity), OUTLINE, 4.6),
    back: rec((p) => drawCardBack(p, pal), OUTLINE, 4.6),
    shine: rec((p) => drawCardShine(p, rarity === 'legendary')),
    aura: fancy ? rec((p) => p.glow(rrect(-CHW - 4, -CHH - 4, CHW * 2 + 8, CHH * 2 + 8, 22), alpha(rarity === 'legendary' ? '#FFC93C' : '#C77DFF', 0.9), 14)) : null,
    spark: rec((p) => {
      p.shape(twinkle(0, 0, 11), rarity === 'legendary' ? '#FFF2AE' : WHITE, { ow: 2.2, shade: false });
      p.fill(twinkle(-1.2, -1.2, 4.4), WHITE);
    }),
  }));
  const shapes = useMemo(() => {
    const card = Skia.PathBuilder.Make().addRRect({ rect: rc(-CHW, -CHH, CHW * 2, CHH * 2), rx: 18, ry: 18 });
    const win = Skia.PathBuilder.Make().addRRect({ rect: rc(WIN.x, WIN.y, WIN.w, WIN.h), rx: 14, ry: 14 });
    const out = { card: card.build(), win: win.build() };
    card.dispose();
    win.dispose();
    return out;
  }, []);
  const m = useRig(
    CARD_KEYS,
    (o) => {
      'worklet';
      const now = clock.value;
      const t = now / 1000;
      const k = CARD_UNIT * num(scale);
      const f = clamp01(num(flip));
      const cs = Math.cos(f * Math.PI);
      // Lifts a little while it turns.
      const lift = 1 + 0.08 * Math.sin(f * Math.PI);
      put(o.root, num(x), num(y), 0, k * lift, k * lift);
      if (cs > 0) {
        put(o.back, 0, 0, 0, Math.max(0.02, cs), 1);
        pop(o.front, 0, 0, 0, 0);
      } else {
        put(o.front, 0, 0, 0, Math.max(0.02, -cs), 1);
        pop(o.back, 0, 0, 0, 0);
      }
      const g = (now % CARD_SHINE_EVERY_MS) / CARD_SHINE_MS;
      if (g < 1) put(o.shine, -200 + 400 * ease(g), 0, 0, 1, 1);
      else pop(o.shine, 0, 0, 0, 0);
      const a = 1 + 0.04 * Math.sin(t * 3);
      put(o.aura, 0, 0, 0, a, 1 + 0.03 * Math.sin(t * 3));
      for (let i = 0; i < CARD_SPARKS; i++) {
        const q = frac(t / 1.9 + i * 0.27);
        const sx = i % 2 === 0 ? -1 : 1;
        const sy = i < 2 ? -1 : 1;
        pop(o[`k${i}`], sx * (CHW - 8 - 14 * (i % 3)), sy * (CHH - 30 - 20 * ((i + 1) % 2)), q * 2.4, life(q, 0.2, 0.35) * (q < 0.45 ? 1 : 0));
      }
    },
    [clock, x, y, scale, flip],
  );
  const showShine = fancy;
  return (
    <Group matrix={m.root} zIndex={zIndex}>
      <Group matrix={m.back}>
        <Picture picture={art.back} />
        <Group clip={shapes.card}>
          <Picture picture={art.shine} matrix={m.shine} />
        </Group>
      </Group>
      <Group matrix={m.front}>
        {art.aura ? <Picture picture={art.aura} matrix={m.aura} /> : null}
        <Picture picture={art.base} />
        {children ? (
          <Group clip={shapes.win}>
            <Group matrix={[2, 0, WIN.x, 0, 2, WIN.y, 0, 0, 1]}>{children}</Group>
          </Group>
        ) : null}
        <Picture picture={art.top} />
        {showShine ? (
          <Group clip={shapes.card}>
            <Picture picture={art.shine} matrix={m.shine} />
          </Group>
        ) : null}
        {rarity === 'legendary' || rarity === 'epic'
          ? CARD_KEYS.slice(5, rarity === 'legendary' ? 5 + CARD_SPARKS : 7).map((key) => <Picture key={key} picture={art.spark} matrix={m[key]} />)
          : null}
      </Group>
    </Group>
  );
}

export type CardFrameProps = Omit<CardProps, 'flip'> & { rarity: Rarity };

/** The front of a staff card: a frame for its rarity, with `children` (the portrait) in the window. */
export function CardFrame(props: CardFrameProps) {
  return <Card {...props} flip={1} />;
}

export type CardBackProps = Omit<CardProps, 'flip' | 'rarity' | 'children'>;

/** The back of a staff card, in the palette's primary and accent colours, with a passing shine. */
export function CardBack(props: CardBackProps) {
  return <Card {...props} flip={0} />;
}

// ---------------------------------------------------------------------------
// Static icons ("art:<name>" in game.json): still drawings of the props above
// ---------------------------------------------------------------------------


function drawClosedChest(p: Pen, tier: ChestTier) {
  const s = CHEST_STYLES[tier];
  drawChestBody(p, s, tier);
  p.at(0, RIM_Y + 1, () => drawChestLid(p, s, tier));
}


/** How an "art:" icon is drawn: once, into a picture, in its own units. */
export interface ArtIconDef {
  draw: (p: Pen) => void;
  ow?: number;
  box?: ArtIconArt['box'];
}

/**
 * The "art:" icons drawn in this kit's style: closed chests per tier, gem, coin, card back. The
 * tab-shell modes register them from their entries (src/modes/sim, src/modes/classic), the sim
 * mode with its own (truffles, shop front) on top; a mode outside the "tabs" family never bundles them.
 */
export const TABS_ART_ICONS: Record<string, ArtIconDef> = {
  'chest-wood': { draw: (p) => drawClosedChest(p, 'wood') },
  'chest-silver': { draw: (p) => drawClosedChest(p, 'silver') },
  'chest-gold': { draw: (p) => drawClosedChest(p, 'gold') },
  gem: { draw: (p) => drawGem(p, '#3FB8F5') },
  coin: { draw: (p) => drawCoinFace(p, GOLD) },
  // The back's glow reaches past its edge but is clipped to it: frame the card itself.
  'card-back': { draw: (p) => drawCardBack(p, DEFAULT_PALETTE), ow: 4.6, box: { l: -CHW - 3, t: -CHH - 3, r: CHW + 3, b: CHH + 3 } },
};

/** Icon defs as registry sources (src/ui/art/icons.ts): each records its drawing once, framed by what it covers. */
export function artIconSources(defs: Record<string, ArtIconDef>): Record<string, ArtIconSource> {
  const out: Record<string, ArtIconSource> = {};
  for (const [name, def] of Object.entries(defs)) {
    out[name] = () => {
      const box = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
      const pic = rec((p) => {
        p.box = box;
        def.draw(p);
        p.box = null;
      }, OUTLINE, def.ow ?? 3.4);
      const frame = def.box ?? box;
      return Number.isFinite(frame.l) && frame.r > frame.l && frame.b > frame.t ? { pic, box: frame } : null;
    };
  }
  return out;
}
