/**
 * Scene props, drawn in code: kitchen stations, the pass, tables, the room,
 * and the small flying things of the restaurant. The chest, cards, coin, gem, sparkle burst
 * and tutorial hand every game uses live in src/ui/art/props.tsx (re-exported below).
 *
 * Every export is a Skia component that sits inside someone else's `<Canvas>`:
 *
 *   const clock = useClock();
 *   <Canvas style={{ flex: 1 }}>
 *     <Floor x={0} y={96} width={390} height={300} />
 *     <Station kind="oven" x={60} y={96} working={cooking} clock={clock} />
 *     <Character look={LOOKS.marco} x={60} y={110} pose="cook" clock={clock} />
 *   </Canvas>
 *
 * Shared rules:
 *   - `x`, `y` are canvas pixels. For things that stand on the floor it is the
 *     floor point under their middle (like `Character`); cards, coins and the
 *     other floating things are placed by their centre. Each component says which.
 *   - `scale` 1 is scene size: a station is about 60 x 64 px next to a 50 px
 *     character. `x`, `y` and `scale` take a number or a shared value.
 *   - `palette` recolours a prop; pass the same few colours to every prop and a
 *     re-themed game gets a matching room (see `makePalette`).
 *   - Animation runs on the UI thread from `clock` (milliseconds, e.g. Skia's
 *     `useClock()`); nothing re-renders per frame. Art is recorded once into
 *     pictures and only moved with matrices afterwards.
 *   - One-shot animations (bell, door, sparkle burst) start when their shared
 *     value changes: `rung.value += 1`. Their lengths are exported (`BELL_RING_MS`,
 *     ...) so sound and haptics can be timed to them.
 */
import { Group, Image, Picture, type SkPath, type SkPicture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { Pen, alpha, arc, blob, builder, capsule, circle, curve, done, ellipse, hashString, lightOf, line, merged, mix, poly, record, rng, rrect, rrect4, shadeOf, star, twinkle, type Pt } from '../../art/draw';
import { DEFAULT_PALETTE, usePalette, INK, WHITE, dark, tint, type Anim, type Mat, type Mats, makeMats, put, pop, clamp01, ease, backOut, life, frac, num, level, tick, approach, sinceBump, useRig, ROOT_KEYS, useRoot, useArt, archPath, flamePath, softGlow, drawPuff, baseShadow, drawPadlock, lockedTint, recordTinted, rec, addLight, shapeWith, rod, gearPath, UNIT } from '../../art/kit';
import { GOLD, type ArtIconDef } from '../../art/props';
import { dishArt, drawShadow, drawTray, resolveDish, type ResolvedDish } from './items';
import { PART_SAMPLING, lasting, rasterDensity } from '../../art/raster';
import type { ArtPalette, DishKind, DishLook, StationKind, TableState } from './types';

// The shared pieces, so existing imports of this file keep working inside the sim folder.
export {
  CARD_NAMEPLATE,
  CARD_SHINE_EVERY_MS,
  CARD_SHINE_MS,
  CARD_SIZE,
  CARD_WINDOW,
  CHEST_RATTLE_MS,
  CHEST_SIZE,
  Card,
  CardBack,
  CardFrame,
  Chest,
  Coin,
  Gem,
  HAND_TAP_MS,
  HandPointer,
  SPARKLE_MS,
  SparkleBurst,
  TABS_ART_ICONS,
  artIconSources,
  type ArtIconDef,
  type CardBackProps,
  type CardFrameProps,
  type CardProps,
  type ChestProps,
  type CoinProps,
  type GemProps,
  type HandPointerProps,
  type SparkleBurstProps,
} from '../../art/props';
export { DEFAULT_PALETTE, makePalette, type Anim } from '../../art/kit';
export { artIconArt, artIconNames, isArtIconName, registerArtIcons, type ArtIconArt } from '../../art/icons';

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------

/** The station kinds of `types.ts` plus `generic`, a neutral workbench for themes without a kitchen. */
export type StationArtKind = StationKind | 'generic';
export const STATION_ART_KINDS: readonly StationArtKind[] = ['oven', 'stove', 'prep', 'fryer', 'dessert', 'espresso', 'generic'];

/** Size of a station at `scale` 1, in pixels. Steam and smoke rise a little above it. */
export const STATION_SIZE = { width: 60, height: 64 } as const;

const STATION_KEYS = ['root', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const;
type StationKey = (typeof STATION_KEYS)[number];
type PartKey = Exclude<StationKey, 'root'>;

interface LayerSpec {
  draw: (p: Pen) => void;
  /** The rig slot that moves this layer; none for art that never moves. */
  key?: PartKey;
  /** A moving part that is there when nothing is cooking, so it belongs in the locked silhouette. */
  idle?: boolean;
}

interface StationDef {
  layers: (c: ArtPalette, dish: ResolvedDish) => LayerSpec[];
  /** Places the moving parts. `t` is seconds, `w` is 0 idle .. 1 working, `tw` the seconds spent working so far (for things that turn). */
  step: (o: Mats<StationKey>, t: number, w: number, tw: number) => void;
}

/** A flickering flame, standing on its base point. */
function flameAt(o: Mat, x: number, y: number, t: number, ph: number, s: number) {
  'worklet';
  if (s < 0.02) {
    pop(o, 0, 0, 0, 0);
    return;
  }
  const a = Math.sin(t * 11 + ph);
  const b = Math.sin(t * 23 + ph * 2.3);
  put(o, x, y, 0.1 * Math.sin(t * 7 + ph), s * (1 - 0.1 * a), s * (0.84 + 0.18 * a + 0.08 * b));
}

/** A puff that rises `rise` units from (x, y) over each cycle of `u`, growing and then popping. */
function puffAt(o: Mat, x: number, y: number, u: number, rise: number, drift: number, s: number) {
  'worklet';
  const k = frac(u);
  pop(o, x + drift * Math.sin(k * 5 + Math.floor(u) * 1.7), y - rise * k, 0.3 * Math.sin(k * 4), s * life(k, 0.2, 0.45) * (0.55 + 0.6 * k));
}

const brickOf = (c: ArtPalette) => mix(c.stone, '#B4522D', 0.62);
const marbleOf = (c: ArtPalette) => mix(c.cloth, '#CFC4B4', 0.42);
const IRON = '#4A5062';
const GREEN = '#57B26A';

// --- oven: a wood-fired brick oven ---------------------------------------------

const OVEN: StationDef = {
  layers: (c, dish) => {
    const brick = brickOf(c);
    const mouth = () => archPath(0, -52, 20.5, 37.5);
    const hot = lightOf(c.glow, 1.1);
    return [
      {
        draw: (p) => {
          // Chimney.
          p.shape(rrect(15, -132, 20, 34, 3), brick, { ow: 2.8, shade: 3 });
          p.shape(rrect(11, -136, 28, 8.5, 3), shadeOf(c.stone, 1.5), { ow: 2.8, shade: false });
          // Brick plinth with the log store.
          const plinth = rrect(-51, -47, 102, 47, 5);
          shapeWith(
            p,
            plinth,
            brick,
            () => {
              const joint = shadeOf(brick, 1.5);
              for (const y of [-35.5, -24, -12.5]) p.stroke(line(-51, y, 51, y), joint, 1.7, true);
              for (let row = 0; row < 4; row++) {
                const y0 = -47 + row * 11.6;
                for (let x = -51 + (row % 2 === 0 ? 17 : 8.5); x < 51; x += 17) p.stroke(line(x, y0, x, y0 + 11.6), joint, 1.7, true);
              }
              for (const [x, y] of [[-44, -46], [27, -34.5], [-36, -23], [35.5, -11.5]] as Pt[]) p.fill(rrect(x, y, 15.4, 9.8, 1.5), lightOf(brick, 0.35));
            },
            { shade: 4 },
          );
          p.shape(archPath(0, -1.7, 17, 30), '#3A2118', { ow: 2.6, shade: false });
          for (const [x, y] of [[-7.6, -8.6], [7.6, -8.6], [0, -20.5]] as Pt[]) {
            p.shape(circle(x, y, 7), tint(c.wood, 0.34), { ow: 2.2, shade: 1.4, outline: dark(c.wood, 0.5) });
            p.stroke(circle(x, y, 3.3), shadeOf(c.wood, 0.9), 1.3);
          }
          // Dome.
          const dome = blob([[-55, -52, 0], [-57, -76], [-47, -103], [-25, -118], [0, -122], [25, -118], [47, -103], [57, -76], [55, -52, 0]]);
          shapeWith(
            p,
            dome,
            c.stone,
            () => {
              p.fill(ellipse(0, -97, 21, 12), mix(c.stone, '#8A6650', 0.5));
              p.fill(ellipse(0, -100, 14, 9), mix(c.stone, '#6E4E3E', 0.55));
              for (const [x, y, r] of [[-41, -74, -8], [38, -84, 12], [-30, -103, -24], [43, -63, 4]] as [number, number, number][])
                p.at(x, y, () => p.fill(rrect(-6.5, -3.6, 13, 7.2, 2), shadeOf(c.stone, 0.75)), r);
            },
            { shade: 5.5, light: 3 },
          );
          p.shine(curve([[-44, -86], [-37, -102], [-24, -112]]), WHITE, 3.2, 0.75);
          // Tiled arch and the dark mouth.
          shapeWith(
            p,
            archPath(0, -52, 30, 47),
            c.primary,
            () => {
              const joint = dark(c.primary, 0.38);
              for (const deg of [200, 232, 264, 296, 328]) {
                const a = (deg * Math.PI) / 180;
                p.stroke(line(Math.cos(a) * 19, -69 + Math.sin(a) * 19, Math.cos(a) * 31, -69 + Math.sin(a) * 31), joint, 1.8, true);
              }
              p.stroke(line(-31, -63, -19, -63), joint, 1.8, true);
              p.stroke(line(19, -63, 31, -63), joint, 1.8, true);
              p.shine(arc(0, -69, 26.2, 26.2, 196, 62), lightOf(c.primary), 2.2, 0.8);
            },
            { ow: 2.8, shade: 2.6 },
          );
          p.shape(mouth(), '#2A1510', { ow: 2.6, shade: false });
          p.fill(ellipse(0, -58, 16, 6), '#4A1F12');
        },
      },
      {
        // The fire's light inside the mouth; squashed flat it is a bed of embers.
        key: 'p0',
        draw: (p) => p.clipped(archPath(0, 0.5, 18.6, 31.5), () => p.radial(rrect(-22, -34, 44, 36, 0), 0, 2, 33, [hot, c.glow, mix(c.glow, '#B32B12', 0.7), alpha('#7A1D0E', 0)], [0, 0.38, 0.72, 1])),
      },
      ...([[13, 22, 0.25], [16.5, 29, -0.1], [12, 19, -0.3]] as [number, number, number][]).map(
        ([w, h, lean], i): LayerSpec => ({
          key: (['p1', 'p2', 'p3'] as const)[i],
          draw: (p) => {
            p.fill(flamePath(w, h, lean), c.glow);
            p.fill(flamePath(w * 0.62, h * 0.66, lean), mix(hot, '#FFE98A', 0.5));
            p.fill(flamePath(w * 0.3, h * 0.36, lean), '#FFFBE0');
          },
        }),
      ),
      {
        // What is baking, on the oven floor.
        key: 'p4',
        draw: (p) => {
          p.shape(ellipse(0, 0, 13.5, 4), dish.plate, { ow: 1.8, shade: false });
          p.fill(ellipse(0, -0.2, 10.8, 2.8), dish.food);
          for (const [x, y] of [[-5.5, -0.6], [0.5, 0.6], [5.6, -0.8]] as Pt[]) p.fill(ellipse(x, y, 2, 1), dish.topping);
        },
      },
      {
        draw: (p) => {
          const slab = tint(c.stone, 0.45);
          p.shape(rrect(-60, -57, 120, 11, 4), slab, { ow: 2.8, shade: 2.4 });
          p.shine(line(-52, -53.6, 20, -53.6), WHITE, 1.6, 0.8);
        },
      },
      {
        // Firelight spilling over the ledge.
        key: 'p5',
        draw: (p) => p.at(0, 0, () => addLight(p, circle(0, 0, 48), 0, 0, 48, [alpha(hot, 0.55), alpha(c.glow, 0.22), alpha(c.glow, 0)], [0, 0.5, 1]), 0, 1, 0.42),
      },
      { key: 'p6', draw: (p) => drawPuff(p, 8.5, '#F6F1EA', alpha(c.outline, 0.55)) },
      { key: 'p7', draw: (p) => drawPuff(p, 8.5, '#F6F1EA', alpha(c.outline, 0.55)) },
    ];
  },
  step: (o, t, w) => {
    'worklet';
    const fl = Math.sin(t * 9.1) * Math.sin(t * 5.3 + 1);
    put(o.p0, 0, -57, 0, 1, 0.24 + w * (0.68 + 0.08 * fl));
    flameAt(o.p1, -9.5, -57, t, 0, w);
    flameAt(o.p2, 1.5, -57, t, 1.9, w);
    flameAt(o.p3, 11, -57, t, 3.7, w * 0.9);
    pop(o.p4, 0, -59.5, 0, backOut(w));
    const sp = w * (0.92 + 0.1 * fl);
    put(o.p5, 0, -52, 0, sp, sp);
    puffAt(o.p6, 25, -138, t * 0.5, 30, 5, w);
    puffAt(o.p7, 25, -138, t * 0.5 + 0.5, 30, 5, w);
  },
};

// --- stove: a range with a pot, a pan and a hood ---------------------------------

const STOVE: StationDef = {
  layers: (c) => {
    const M = c.metal;
    const flames = (half: number): LayerSpec['draw'] => (p) => {
      for (const s of [-1, 1]) {
        p.at(s * half, 0, () => {
          p.fill(flamePath(8.5, 13, s * 0.3), '#4FB4F5');
          p.fill(flamePath(4.6, 7.5, s * 0.3), '#D4F1FF');
        });
      }
      p.fill(ellipse(0, -1.2, half, 2.6), '#4FB4F5');
    };
    const steam: LayerSpec['draw'] = (p) => drawPuff(p, 8, WHITE, alpha(c.outline, 0.5));
    return [
      {
        draw: (p) => {
          p.shape(rrect(-11, -133, 22, 12, 3), shadeOf(M, 1.3), { ow: 2.6, shade: false });
          const body = rrect(-50, -44, 100, 44, 6);
          shapeWith(p, body, M, () => p.fill(rrect(-50, -44, 100, 11.5, 0), shadeOf(M, 0.8)), { shade: 4, light: 2 });
          for (const x of [-33, -11, 11, 33]) {
            p.shape(circle(x, -38.3, 3.9), c.primary, { ow: 1.8, shade: 1.2 });
            p.dot(x - 1.1, -39.5, 1, alpha(WHITE, 0.85));
          }
          p.shape(rrect(-39, -30.5, 78, 26.5, 5), tint(M, 0.35), { ow: 2.4, shade: 2.2 });
          rod(p, line(-23, -26.4, 23, -26.4), '#5E6B7A', 2.6, 1.3);
          p.shape(rrect(-29, -22.4, 58, 14.6, 4), '#4A566B', { ow: 2.2, shade: false });
          p.shine(line(-21, -11.4, -15, -19), WHITE, 2.2, 0.45);
          p.shine(line(-14, -11.4, -10.5, -15.8), WHITE, 1.6, 0.45);
          p.shape(rrect(-55, -52.5, 110, 9.5, 3.5), IRON, { ow: 2.8, shade: 2 });
          p.shine(line(-48, -49.8, 26, -49.8), '#98A1B5', 1.5, 0.75);
          p.fill(rrect(-45, -56.2, 36, 4.4, 1.5), '#2C2F3D');
          p.fill(rrect(6, -56.2, 40, 4.4, 1.5), '#2C2F3D');
        },
      },
      { key: 'p0', draw: flames(21.5) },
      { key: 'p1', draw: flames(19.5) },
      {
        draw: (p) => {
          const side = dark(c.primary, 0.3);
          p.shape(rrect(0.5, -76, 9, 6.4, 2.6), side, { ow: 2.2, shade: false });
          p.shape(rrect(42.5, -76, 9, 6.4, 2.6), side, { ow: 2.2, shade: false });
          p.shape(rrect4(7, -80.5, 38, 25, 3, 3, 8.5, 8.5), c.primary, { ow: 2.8, shade: 3.2 });
          p.shine(line(13, -74, 13, -64), lightOf(c.primary), 2.6, 0.85);
          p.shape(rrect(5, -83.5, 42, 5.4, 2.6), tint(M, 0.2), { ow: 2.2, shade: false });
        },
      },
      {
        // The pan, on its base.
        key: 'p2',
        idle: true,
        draw: (p) => {
          const pan = '#3D4252';
          p.shape(capsule(-15, -5.4, -34, -12.6, 2.9), pan, { ow: 2.3, shade: false });
          p.shape(rrect4(-18, -9.6, 36, 9.6, 2.5, 2.5, 6.5, 6.5), pan, { ow: 2.6, shade: 2 });
          p.shape(ellipse(0, -9.6, 12.5, 3.5), '#FFD166', { ow: 1.8, shade: false });
          p.fill(ellipse(-2.5, -10.2, 5.5, 1.4), '#FFE9A8');
        },
      },
      {
        // The pot lid, on the rim.
        key: 'p3',
        idle: true,
        draw: (p) => {
          p.shape(blob([[-19, 0, 0], [19, 0, 0], [15.5, -6], [0, -9], [-15.5, -6]]), tint(M, 0.25), { ow: 2.4, shade: 2 });
          p.shape(circle(0, -11.2, 3.5), '#3D4252', { ow: 1.9, shade: false });
          p.shine(curve([[-12, -3.4], [-6, -6.2], [1, -7]]), WHITE, 1.6, 0.9);
        },
      },
      { key: 'p4', draw: steam },
      { key: 'p5', draw: steam },
      { key: 'p6', draw: steam },
      { key: 'p7', draw: (p) => p.shape(ellipse(0, 0, 6.6, 2.8), '#FFD166', { ow: 1.8, shade: false }) },
      {
        draw: (p) => {
          p.shape(poly([[-28, -126], [28, -126], [47, -110], [-47, -110]]), M, { shade: 3, light: 2 });
          p.shape(rrect(-50, -112.5, 100, 8, 3), c.primary, { ow: 2.6, shade: 1.8 });
          p.shine(line(-42, -109.6, -8, -109.6), lightOf(c.primary), 1.6, 0.8);
        },
      },
    ];
  },
  step: (o, t, w) => {
    'worklet';
    flameAt(o.p0, 26, -53, t, 0.4, w);
    flameAt(o.p1, -27, -53, t, 2.6, w);
    // The pan slides back and forth; the lid rattles.
    put(o.p2, -27 + w * 1.8 * Math.sin(t * 9), -56, w * 0.05 * Math.sin(t * 9 + 1), 1, 1);
    const rattle = Math.abs(Math.sin(t * 13));
    put(o.p3, 26, -83.5 - w * (0.5 + 1.6 * rattle), w * 0.07 * Math.sin(t * 13), 1, 1);
    puffAt(o.p4, 22, -97, t * 0.62, 24, 4, w);
    puffAt(o.p5, 30, -97, t * 0.62 + 0.37, 24, 4, w);
    puffAt(o.p6, 26, -97, t * 0.62 + 0.7, 24, 3, w * 0.9);
    // A pancake hops out of the pan and turns over.
    const u = frac(t * 0.9);
    const h = u < 0.6 ? Math.sin((Math.PI * u) / 0.6) : 0;
    if (w < 0.05 || h <= 0) pop(o.p7, 0, 0, 0, 0);
    else put(o.p7, -27 + 1.8 * Math.sin(t * 9), -67 - 20 * h, 0, w, w * Math.cos((Math.PI * u) / 0.6));
  },
};

// --- prep: a counter with a chopping board ---------------------------------------

const PREP: StationDef = {
  layers: (c) => {
    const M = c.metal;
    return [
      {
        draw: (p) => {
          // A rail with a ladle, garlic and chillies.
          for (const x of [-44, 44]) p.shape(circle(x, -120, 3.4), shadeOf(M, 1.2), { ow: 2, shade: false });
          rod(p, line(-44, -120, 44, -120), M, 2.6, 1.4);
          rod(p, line(-29, -119, -29, -105), M, 2, 1.3);
          p.shape(circle(-29, -100, 5.9), M, { ow: 2, shade: 1.6 });
          rod(p, line(0, -119, 0, -112), '#C9B58A', 1.6, 1.1);
          for (const [x, y] of [[-2.8, -106.5], [2.9, -102.6], [-1, -97.6]] as Pt[])
            p.shape(blob([[x, y - 5.8, 0], [x + 4.7, y - 0.6], [x + 2.5, y + 4.1], [x - 2.5, y + 4.1], [x - 4.7, y - 0.6]]), c.cloth, { ow: 1.8, shade: 1.3 });
          rod(p, line(28, -119, 28, -113), GREEN, 1.6, 1.1);
          for (const [dx, rot] of [[-2.6, 17], [0, 0], [2.6, -17]] as Pt[])
            p.at(28 + dx, -113, () => p.shape(blob([[-2.5, 0], [2.5, 0], [2.7, 8], [0.6, 17, 0], [-2.1, 9]]), c.primary, { ow: 1.7, shade: 1.1 }), rot);
          p.shape(circle(28, -113.4, 2.7), GREEN, { ow: 1.5, shade: false });
          // Cabinet.
          p.shape(rrect(-52, -46, 104, 46, 5), c.wood, { shade: 4 });
          const groove = shadeOf(c.wood, 1.5);
          p.stroke(rrect(-44.5, -38.5, 40, 31, 4), groove, 1.9);
          p.stroke(rrect(4.5, -38.5, 40, 31, 4), groove, 1.9);
          p.shape(circle(-9.5, -23, 2.7), c.accent, { ow: 1.6, shade: false });
          p.shape(circle(9.5, -23, 2.7), c.accent, { ow: 1.6, shade: false });
          // Worktop.
          p.shape(rrect(-57, -56, 114, 11, 4), marbleOf(c), { ow: 2.8, shade: 2.2 });
          p.shine(line(-49, -52.8, 18, -52.8), WHITE, 1.6, 0.85);
          // Oil bottle.
          const oil = '#A3B54C';
          p.shape(rrect(-51.6, -86, 4.6, 8, 1.5), oil, { ow: 1.8, shade: false });
          p.shape(rrect(-52.3, -89, 6, 3.8, 1.3), '#C98B4A', { ow: 1.5, shade: false });
          p.shape(rrect(-54.4, -79.5, 10.2, 24, 3.2), oil, { ow: 2, shade: 1.6 });
          p.fill(rrect(-52.6, -72.5, 6.6, 8.5, 1.4), c.cloth);
          // Chopping board with a few slices already cut.
          p.shape(rrect(-42, -63.5, 56, 8, 2.6), tint(c.wood, 0.45), { ow: 2.4, shade: 1.6 });
          for (const x of [-16.5, -9]) {
            p.shape(ellipse(x, -65, 4.5, 2.3), mix(c.primary, '#FFB199', 0.55), { ow: 1.5, shade: false });
            p.fill(ellipse(x, -65.1, 2.5, 1.1), c.primary);
          }
          // Bowl of greens.
          for (const [x, y, rot] of [[22.5, -70, -32], [30, -73.5, 2], [37.5, -70, 30]] as [number, number, number][])
            p.at(x, y, () => p.shape(ellipse(0, 0, 3.7, 6.6), GREEN, { ow: 1.6, shade: 1.2 }), rot);
          p.shape(blob([[16.5, -68, 0], [43.5, -68, 0], [41, -60.5], [35, -56.4], [25, -56.4], [19, -60.5]]), c.cloth, { ow: 2.3, shade: 2 });
          p.stroke(line(19, -64.2, 41, -64.2), c.primary, 1.8, true);
        },
      },
      {
        // A tomato waiting its turn.
        key: 'p0',
        idle: true,
        draw: (p) => {
          p.shape(circle(0, -7.6, 7.7), c.primary, { ow: 2, shade: 2 });
          p.dot(-2.8, -10.4, 1.7, alpha(WHITE, 0.8));
          p.shape(star(0, -14.4, 4.6, 5, 0.42), GREEN, { ow: 1.4, shade: false });
        },
      },
      {
        // The knife, drawn around the heel of its blade.
        key: 'p1',
        idle: true,
        draw: (p) => {
          p.shape(poly([[1.5, -3.8], [-25, -1.7], [-21.5, 3.9], [1.5, 3.9]]), tint(M, 0.35), { ow: 1.8, shade: false });
          p.shine(line(-19, 1.9, -1, 1.9), WHITE, 1.2, 0.9);
          p.shape(rrect(1, -3.2, 13.5, 6.4, 2.6), '#6B4226', { ow: 1.8, shade: 1.2 });
        },
      },
      { key: 'p2', draw: (p) => p.shape(poly([[-3, 1.6], [3, 1.6], [0, -3.2]]), c.primary, { ow: 1.4, shade: false }) },
      { key: 'p3', draw: (p) => p.shape(ellipse(0, 0, 2.2, 3.6), GREEN, { ow: 1.4, shade: false }) },
    ];
  },
  step: (o, t, w) => {
    'worklet';
    const ph = t * 14;
    const s = Math.sin(ph);
    const up = s > 0 ? s : 0;
    const hit = s < 0 ? -s : 0;
    put(o.p1, 9, -67, w * 0.55 * up, 1, 1);
    put(o.p0, -29, -63.5 - w * 1.2 * hit, w * 0.05 * Math.sin(ph * 0.5), 1 + w * 0.04 * hit, 1 - w * 0.05 * hit);
    const u = frac(t * 1.15);
    pop(o.p2, -13 - 16 * u, -67 - 80 * u * (1 - u), u * 7, w * life(u, 0.1, 0.3));
    const v = frac(t * 1.15 + 0.5);
    pop(o.p3, -12 + 15 * v, -67 - 70 * v * (1 - v), -v * 6, w * life(v, 0.1, 0.3));
  },
};

// --- fryer -----------------------------------------------------------------------

function sauceBottle(p: Pen, x: number, baseY: number, color: string) {
  p.shape(poly([[x - 2.3, baseY - 18.5], [x + 2.3, baseY - 18.5], [x + 1, baseY - 24.5], [x - 1, baseY - 24.5]]), color, { ow: 1.7, shade: false });
  p.shape(rrect4(x - 6, baseY - 19, 12, 19, 4.5, 4.5, 2.5, 2.5), color, { ow: 2, shade: 1.6 });
  p.shine(line(x - 3.2, baseY - 14, x - 3.2, baseY - 7), lightOf(color), 1.6, 0.9);
}

function bubbleAt(o: Mat, x: number, y: number, u: number, s: number) {
  'worklet';
  const k = frac(u);
  pop(o, x, y - 4.5 * k, 0, s * life(k, 0.35, 0.12) * (0.5 + 0.7 * k));
}

function twinkleAt(o: Mat, x: number, y: number, u: number, s: number) {
  'worklet';
  const k = frac(u);
  pop(o, x, y, k * 1.6, s * life(k, 0.3, 0.3));
}

const OIL = '#F2B33D';

const FRYER: StationDef = {
  layers: (c) => {
    const M = c.metal;
    const golden = '#EFAE45';
    const bubble: LayerSpec['draw'] = (p) => {
      p.shape(circle(0, 0, 3.4), tint(OIL, 0.55), { ow: 1.3, shade: false, outline: dark(OIL, 0.4) });
      p.dot(-1, -1, 0.9, WHITE);
    };
    const heat: LayerSpec['draw'] = (p) => drawPuff(p, 7, '#FFF4DA', alpha(c.outline, 0.45));
    return [
      {
        draw: (p) => {
          // Shelf with sauces and salt.
          for (const x of [-30, 30]) p.shape(poly([[x - 4.5, -98.5], [x + 4.5, -98.5], [x, -90.5]]), shadeOf(c.wood, 1.3), { ow: 2, shade: false });
          p.shape(rrect(-41, -104.5, 82, 6.5, 2.6), c.wood, { ow: 2.4, shade: 1.6 });
          sauceBottle(p, -23, -104.5, c.primary);
          sauceBottle(p, -6, -104.5, c.accent);
          p.shape(rrect(13.5, -117, 12.5, 12.5, 3.6), c.cloth, { ow: 2, shade: 1.6 });
          p.shape(rrect(14.2, -121.2, 11.1, 5.2, 2), shadeOf(M, 1.2), { ow: 1.8, shade: false });
          // Body with its control panel and vents.
          p.shape(rrect(-50, -46, 100, 46, 6), M, { shade: 4, light: 2 });
          p.shape(rrect(-41, -39.5, 82, 15, 4.5), IRON, { ow: 2.2, shade: false });
          for (const x of [-28, -12]) {
            p.shape(circle(x, -32, 4.7), c.cloth, { ow: 1.7, shade: 1.2 });
            p.stroke(line(x, -32, x + 2.3, -34.9), INK, 1.5);
          }
          p.shape(rrect(1, -36.4, 14, 8.8, 2), '#2F4A3E', { ow: 1.6, shade: false });
          p.fill(rrect(3.2, -34.4, 6, 1.7, 0.8), '#7CE0A0');
          p.fill(rrect(3.2, -31.4, 9.4, 1.7, 0.8), '#7CE0A0');
          p.shape(circle(27, -32, 3.8), '#7A2A22', { ow: 1.7, shade: false });
          for (const y of [-18, -12.5, -7]) p.stroke(line(-30, y, 30, y), shadeOf(M, 1.7), 2.3);
          // The vat: back rim and the oil.
          p.shape(rrect(-55, -59.5, 110, 14.5, 4.5), shadeOf(M, 0.9), { ow: 2.8, shade: false });
          p.shape(rrect(-49.5, -57.2, 99, 8.4, 3.5), OIL, { ow: 1.9, shade: false, outline: dark(OIL, 0.45) });
        },
      },
      {
        // Both baskets, drawn around the oil line.
        key: 'p4',
        idle: true,
        draw: (p) => {
          for (const s of [-1, 1]) {
            p.at(s * 25, 0, () => {
              rod(p, line(s * 10, -14, s * 17.5, -33), M, 2.4, 1.4);
              p.shape(capsule(s * 15.4, -27.5, s * 19.2, -37.5, 3.2), c.primary, { ow: 1.9, shade: false });
              for (const [x, y] of [[-8, -17], [0, -19.6], [8, -17], [-4.4, -12], [5, -11.6]] as Pt[]) p.shape(circle(x, y, 4.8), golden, { ow: 1.6, shade: 1.3, shadeColor: '#C97B2A' });
              const cage = rrect(-15, -18, 30, 18.5, 3.6);
              p.fill(cage, alpha(IRON, 0.2));
              for (const x of [-7.5, 0, 7.5]) p.stroke(line(x, -18, x, 0), '#6B7688', 1.3, true);
              p.stroke(line(-15, -9, 15, -9), '#6B7688', 1.3, true);
              p.stroke(cage, IRON, 2.3);
              p.stroke(line(-15, -18, 15, -18), IRON, 3.2);
            });
          }
        },
      },
      {
        draw: (p) => {
          p.fill(rrect(-48.5, -53.4, 97, 4.8, 2), OIL);
          p.shine(line(-43, -52, -31, -52), tint(OIL, 0.6), 1.5, 0.9);
          p.shape(rrect(-55, -50.4, 110, 6.2, 2.8), tint(M, 0.15), { ow: 2.6, shade: 1.6 });
        },
      },
      { key: 'p0', draw: bubble },
      { key: 'p1', draw: bubble },
      { key: 'p2', draw: bubble },
      { key: 'p3', draw: bubble },
      { key: 'p5', draw: heat },
      { key: 'p6', draw: heat },
      {
        key: 'p7',
        draw: (p) => {
          softGlow(p, 0, 0, 10, 10, '#FF6A3D');
          p.dot(0, 0, 2.7, '#FFE2B0');
        },
      },
    ];
  },
  step: (o, t, w) => {
    'worklet';
    // The baskets hang over the oil when idle and bob in it while frying.
    put(o.p4, 0, -50 - 11.5 * (1 - ease(w)) + w * 1.1 * Math.sin(t * 6), w * 0.012 * Math.sin(t * 6.5), 1, 1);
    bubbleAt(o.p0, -45, -55, t * 1.9, w);
    bubbleAt(o.p1, -4, -55, t * 1.9 + 0.3, w);
    bubbleAt(o.p2, 5, -55.4, t * 1.9 + 0.62, w);
    bubbleAt(o.p3, 45, -55, t * 1.9 + 0.85, w);
    puffAt(o.p5, -24, -74, t * 0.6, 22, 4, w * 0.8);
    puffAt(o.p6, 25, -74, t * 0.6 + 0.5, 22, 4, w * 0.8);
    const g = w * (0.9 + 0.1 * Math.sin(t * 5));
    put(o.p7, 27, -32, 0, g, g);
  },
};

// --- dessert: a gelato cart with a striped canopy ------------------------------------

const DESSERT: StationDef = {
  layers: (c) => {
    const flavours = ['#F28CA8', '#A8DDB5', '#FBE6C4'];
    const scoop =
      (color: string): LayerSpec['draw'] =>
      (p) => {
        p.shape(blob([[-11, 0, 0], [-11.6, -7], [-6.4, -13.4], [0, -15], [6.4, -13.4], [11.6, -7], [11, 0, 0]]), color, { ow: 2.2, shade: 2.2, light: 1.4 });
        p.stroke(arc(-1, -7, 5.5, 4, 200, 120), shadeOf(color, 0.9), 1.3);
      };
    const glass = () => rrect(-46, -80, 92, 24, 7.5);
    const sparkle: LayerSpec['draw'] = (p) => {
      p.shape(twinkle(0, 0, 6.5), '#FFF3B0', { ow: 1.6, shade: false });
      p.fill(twinkle(0, 0, 2.8), WHITE);
    };
    return [
      {
        draw: (p) => {
          for (const x of [-45, 45]) rod(p, line(x, -104, x, -58), c.cloth, 3, 1.5);
          for (const x of [-33, 33]) {
            p.shape(circle(x, -13, 13), '#5E4030', { ow: 2.8, shade: false });
            p.shape(circle(x, -13, 8.8), tint(c.wood, 0.4), { ow: 1.8, shade: 1.6 });
            for (const deg of [0, 45, 90, 135]) {
              const a = (deg * Math.PI) / 180;
              p.stroke(line(x - Math.cos(a) * 8, -13 - Math.sin(a) * 8, x + Math.cos(a) * 8, -13 + Math.sin(a) * 8), '#5E4030', 1.5);
            }
            p.shape(circle(x, -13, 3.2), c.accent, { ow: 1.6, shade: false });
          }
          rod(p, curve([[48, -44], [60, -47], [63, -62]]), c.metal, 2.8, 1.5);
          p.shape(capsule(62, -58, 63.4, -67, 3.2), c.primary, { ow: 1.9, shade: false });
          shapeWith(
            p,
            rrect(-50, -58, 100, 42, 9),
            c.accent,
            () => {
              p.fill(rrect(-50, -27, 100, 11, 0), c.primary);
              p.fill(rrect(-50, -29.6, 100, 2.6, 0), c.cloth);
            },
            { shade: 4, light: 2.2 },
          );
          p.fill(glass(), '#D9F1FA');
        },
      },
      { key: 'p0', idle: true, draw: scoop(flavours[0]) },
      { key: 'p1', idle: true, draw: scoop(flavours[1]) },
      { key: 'p2', idle: true, draw: scoop(flavours[2]) },
      {
        draw: (p) => {
          const g = glass();
          p.fill(g, alpha('#E8F8FF', 0.3));
          p.shine(line(-37, -63.5, -30, -75.5), WHITE, 3, 0.75);
          p.shine(line(-29, -63.5, -24.5, -71), WHITE, 1.8, 0.75);
          p.stroke(g, c.outline, 2.6);
          p.shape(rrect(-51, -60.5, 102, 6.4, 3), tint(c.accent, 0.3), { ow: 2.4, shade: false });
        },
      },
      {
        // The cone painted on the front, drawn around the top of its wafer.
        key: 'p3',
        idle: true,
        draw: (p) => {
          p.shape(poly([[-7.6, -1], [7.6, -1], [0, 16]]), '#E8B36B', { ow: 2, shade: 1.6 });
          p.stroke(line(-4.4, 3.2, 3, 9.2), '#C98B4A', 1.1);
          p.stroke(line(4.4, 3.2, -3, 9.2), '#C98B4A', 1.1);
          p.shape(circle(0, -6.6, 8.5), flavours[0], { ow: 2, shade: 1.8, light: 1.2 });
          p.shape(circle(2.4, -15.6, 2.8), c.primary, { ow: 1.5, shade: false });
        },
      },
      {
        draw: (p) => {
          const b = builder();
          b.moveTo(-47, -126);
          b.lineTo(47, -126);
          b.lineTo(58, -106);
          const n = 5;
          const wv = 116 / n;
          for (let i = 0; i < n; i++) b.quadTo(58 - (i + 0.5) * wv, -92.5, 58 - (i + 1) * wv, -106);
          b.close();
          shapeWith(
            p,
            done(b),
            c.cloth,
            () => {
              for (let i = 0; i < n; i += 2) {
                const a = i / n;
                const z = (i + 1) / n;
                p.fill(poly([[-47 + 94 * a, -126], [-47 + 94 * z, -126], [-58 + 116 * z, -106], [-58 + 116 * z, -90], [-58 + 116 * a, -90], [-58 + 116 * a, -106]]), c.primary);
              }
              p.fill(rrect(-60, -108.6, 120, 3, 0), alpha(INK, 0.16));
            },
            { shade: false },
          );
          p.shine(line(-41, -122.4, -30, -122.4), WHITE, 1.7, 0.7);
        },
      },
      { key: 'p4', draw: sparkle },
      { key: 'p5', draw: sparkle },
      { key: 'p6', draw: (p) => drawPuff(p, 7, '#EAF8FF', alpha(c.outline, 0.45)) },
    ];
  },
  step: (o, t, w) => {
    'worklet';
    let b = Math.sin(t * 5);
    put(o.p0, -28, -59.5, w * 0.05 * b, 1 - w * 0.05 * b, 1 + w * 0.09 * b);
    b = Math.sin(t * 5 + 2.1);
    put(o.p1, 0, -59.5, w * 0.05 * b, 1 - w * 0.05 * b, 1 + w * 0.09 * b);
    b = Math.sin(t * 5 + 4.2);
    put(o.p2, 28, -59.5, w * 0.05 * b, 1 - w * 0.05 * b, 1 + w * 0.09 * b);
    put(o.p3, 0, -38 - w * 3 * Math.abs(Math.sin(t * 4)), w * 0.1 * Math.sin(t * 4), 1, 1);
    twinkleAt(o.p4, -39, -88, t * 0.8, w);
    twinkleAt(o.p5, 40, -72, t * 0.8 + 0.5, w);
    puffAt(o.p6, 18, -84, t * 0.45, 15, 5, w * 0.8);
  },
};

// --- espresso: a machine with steam and a tiny cup ---------------------------------

const ESPRESSO: StationDef = {
  layers: (c) => {
    const M = c.metal;
    const cup = (p: Pen, x: number, y: number) =>
      p.at(x, y, () => {
        const ear = arc(6, -5.2, 3, 2.8, -80, 170);
        p.stroke(ear, c.outline, 3.6);
        p.stroke(ear, c.cloth, 1.5);
        p.shape(blob([[-6.4, -9.4, 0], [6.4, -9.4, 0], [5.6, -2.6], [0, 0], [-5.6, -2.6]]), c.cloth, { ow: 1.9, shade: 1.3 });
        p.stroke(line(-5.4, -6.3, 5.4, -6.3), c.primary, 1.4, true);
      });
    const steam: LayerSpec['draw'] = (p) => drawPuff(p, 6.5, WHITE, alpha(c.outline, 0.5));
    return [
      {
        draw: (p) => {
          // Cabinet with drawers, and the worktop.
          p.shape(rrect(-52, -40, 104, 40, 5), c.wood, { shade: 4 });
          for (const y of [-27, -14]) p.stroke(line(-47, y, 47, y), shadeOf(c.wood, 1.5), 1.9, true);
          for (const y of [-33.6, -20.6, -7.4]) rod(p, line(-6, y, 6, y), c.accent, 2, 1.2);
          p.shape(rrect(-57, -49.5, 114, 10.5, 4), marbleOf(c), { ow: 2.8, shade: 2.2 });
          p.shine(line(-49, -46.4, -36, -46.4), WHITE, 1.6, 0.85);
          // The machine: cups warming on top, a red body with a dark bay for the cup.
          for (const x of [-24, -8, 8]) cup(p, x, -106);
          p.shape(rrect(-42, -106.5, 84, 8.5, 3), tint(M, 0.15), { ow: 2.6, shade: 1.6 });
          shapeWith(p, rrect(-38, -101, 76, 52, 8), c.primary, () => p.fill(rrect(-27, -77, 54, 30, 4), dark(c.primary, 0.52)), { shade: 4, light: 2.4 });
          p.shape(rrect(-30, -97, 60, 16.5, 4.5), tint(M, 0.4), { ow: 2.2, shade: 1.6 });
          p.shape(circle(-15, -88.8, 6.3), c.cloth, { ow: 1.8, shade: false });
          for (const deg of [200, 245, 295, 340]) {
            const a = (deg * Math.PI) / 180;
            p.stroke(line(-15 + Math.cos(a) * 3.6, -88.8 + Math.sin(a) * 3.6, -15 + Math.cos(a) * 4.9, -88.8 + Math.sin(a) * 4.9), INK, 1);
          }
          p.shape(circle(3.5, -88.8, 2.8), c.accent, { ow: 1.5, shade: false });
          p.shape(circle(12, -88.8, 2.8), tint(M, 0.1), { ow: 1.5, shade: false });
          p.shape(circle(21.5, -88.8, 2.7), '#35513A', { ow: 1.5, shade: false });
          p.shape(rrect(-11.5, -80.5, 23, 7.5, 2.6), shadeOf(M, 1.2), { ow: 2, shade: false });
          p.shape(capsule(3, -71, 17.5, -67.2, 2.7), '#3B2620', { ow: 1.8, shade: false });
          p.shape(rrect(-7, -73.5, 14, 5, 1.6), shadeOf(M, 1.7), { ow: 1.8, shade: false });
          rod(p, curve([[27, -80], [30.5, -72], [30, -61]]), M, 2, 1.3);
          p.shape(rrect(-31, -55.5, 62, 6.5, 2.6), shadeOf(M, 1.3), { ow: 2.2, shade: false });
          for (const x of [-22, -12, 9, 19]) p.stroke(line(x, -52.2, x + 4.5, -52.2), IRON, 1.2);
        },
      },
      {
        key: 'p4',
        idle: true,
        draw: (p) => {
          p.stroke(line(0, 0.8, 0, -4.9), c.primary, 1.7);
          p.dot(0, 0, 1.4, INK);
        },
      },
      {
        key: 'p0',
        draw: (p) => {
          p.stroke(line(-2.2, 0, -2.2, 6.4), '#7A4A2A', 1.7, true);
          p.stroke(line(2.2, 0, 2.2, 6.4), '#7A4A2A', 1.7, true);
        },
      },
      {
        draw: (p) => {
          cup(p, 0, -55.3);
          p.fill(ellipse(0, -64.4, 4.8, 1.1), '#6B4226');
        },
      },
      { key: 'p1', draw: steam },
      { key: 'p2', draw: steam },
      { key: 'p3', draw: steam },
      {
        key: 'p5',
        draw: (p) => {
          softGlow(p, 0, 0, 8.5, 8.5, '#6BE07F');
          p.dot(0, 0, 2.5, '#DBFFD8');
        },
      },
    ];
  },
  step: (o, t, w) => {
    'worklet';
    put(o.p4, -15, -88.8, -1.0 + w * (1.55 + 0.22 * Math.sin(t * 7)), 1, 1);
    if (w < 0.05) pop(o.p0, 0, 0, 0, 0);
    else put(o.p0, 0.3 * Math.sin(t * 31), -68.6, 0, 1, w * (0.92 + 0.08 * Math.sin(t * 17)));
    puffAt(o.p1, -2.5, -69, t * 0.7, 24, 3.5, w * 0.85);
    puffAt(o.p2, 3, -69, t * 0.7 + 0.5, 24, 3.5, w * 0.85);
    puffAt(o.p3, 33, -61, t * 0.9 + 0.2, 15, 5, w * 0.75);
    const g = w * (0.9 + 0.1 * Math.sin(t * 6));
    put(o.p5, 21.5, -88.8, 0, g, g);
  },
};

// --- generic: a neutral workbench with a little machine ------------------------------

const GENERIC: StationDef = {
  layers: (c) => {
    const M = c.metal;
    const puff: LayerSpec['draw'] = (p) => drawPuff(p, 7.5, '#F6F1EA', alpha(c.outline, 0.5));
    return [
      {
        draw: (p) => {
          // A gauge on the wall, piped down to the bench.
          rod(p, line(38, -101, 38, -56), M, 2.8, 1.5);
          p.shape(circle(38, -111, 10.5), c.cloth, { ow: 2.4, shade: 2 });
          for (const deg of [180, 225, 270, 315, 360]) {
            const a = (deg * Math.PI) / 180;
            p.stroke(line(38 + Math.cos(a) * 6.2, -111 + Math.sin(a) * 6.2, 38 + Math.cos(a) * 8.2, -111 + Math.sin(a) * 8.2), INK, 1.2);
          }
          // The bench: legs, a shelf with boxes, a drawer and a thick top.
          for (const x of [-50, 37]) p.shape(rrect(x, -46, 13, 46, 3), shadeOf(c.wood, 1.2), { ow: 2.8, shade: 2 });
          p.shape(rrect(-26, -39.6, 34, 23, 3), tint(c.wood, 0.36), { ow: 2.4, shade: 2 });
          p.stroke(line(-25, -32, 7, -32), shadeOf(c.wood, 1.1), 1.5, true);
          p.stroke(line(-25, -24.4, 7, -24.4), shadeOf(c.wood, 1.1), 1.5, true);
          p.shape(rrect(13, -31, 20, 14.4, 2.6), c.primary, { ow: 2.2, shade: 1.8 });
          p.stroke(line(23, -31, 23, -16.6), c.cloth, 2.4, true);
          p.shape(rrect(-53, -17, 106, 7.5, 2.6), c.wood, { ow: 2.4, shade: 1.6 });
          p.shape(rrect(-44, -47, 88, 10.5, 2), c.wood, { ow: 2.4, shade: false });
          p.shape(circle(0, -41.4, 2.7), c.accent, { ow: 1.5, shade: false });
          p.shape(rrect(-57, -56.5, 114, 11, 3.5), tint(c.wood, 0.32), { ow: 2.8, shade: 2.2 });
          p.shine(line(-49, -53.2, 4, -53.2), WHITE, 1.5, 0.6);
          // The machine: a metal housing with a pipe and a lamp.
          p.shape(rrect(6, -110, 12, 14, 2.6), shadeOf(M, 1.3), { ow: 2.2, shade: false });
          p.shape(rrect(3, -113.5, 18, 5.6, 2), IRON, { ow: 2, shade: false });
          p.shape(rrect(-30, -103.5, 6, 6, 1.5), IRON, { ow: 1.8, shade: false });
          p.shape(circle(-27, -107.5, 5.2), mix(c.glow, '#7A6A66', 0.62), { ow: 2, shade: 1.4 });
          p.shape(rrect(-42, -61.5, 66, 6, 2.2), IRON, { ow: 2.2, shade: false });
          p.shape(rrect(-38, -99, 58, 39, 7), M, { shade: 4, light: 2 });
          for (const [x, y] of [[-32, -93.5], [14, -93.5], [-32, -65.5], [14, -65.5]] as Pt[]) p.dot(x, y, 1.6, shadeOf(M, 1.9));
        },
      },
      {
        key: 'p7',
        idle: true,
        draw: (p) => {
          p.stroke(line(0, 1.5, 0, -7.4), c.primary, 1.9);
          p.dot(0, 0, 1.9, INK);
        },
      },
      {
        key: 'p0',
        idle: true,
        draw: (p) => {
          p.shape(gearPath(14.6, 9, 3.6), c.accent, { ow: 2.2, shade: 2 });
          for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2 + 0.4;
            p.dot(Math.cos(a) * 7.2, Math.sin(a) * 7.2, 2, shadeOf(c.accent, 1.4));
          }
          p.shape(circle(0, 0, 4.2), IRON, { ow: 1.8, shade: false });
        },
      },
      {
        key: 'p1',
        idle: true,
        draw: (p) => {
          p.shape(gearPath(8.8, 6, 3), c.primary, { ow: 2, shade: 1.4 });
          p.shape(circle(0, 0, 2.6), IRON, { ow: 1.5, shade: false });
        },
      },
      {
        // The lever, drawn around its pivot.
        key: 'p5',
        idle: true,
        draw: (p) => {
          rod(p, line(0, 0, 0, -20), M, 2.4, 1.4);
          p.shape(circle(0, -22, 4.7), c.primary, { ow: 2, shade: 1.4 });
          p.shape(rrect(-5.5, -2.6, 11, 5.2, 2), IRON, { ow: 1.8, shade: false });
        },
      },
      {
        key: 'p2',
        draw: (p) => {
          softGlow(p, 0, 0, 14, 14, c.glow);
          p.shape(circle(0, 0, 5.2), lightOf(c.glow, 0.9), { ow: 2, shade: false });
          p.dot(-1.6, -1.7, 1.4, WHITE);
        },
      },
      { key: 'p3', draw: puff },
      { key: 'p4', draw: puff },
      {
        key: 'p6',
        draw: (p) => {
          p.shape(twinkle(0, 0, 6), '#FFF3B0', { ow: 1.6, shade: false });
          p.fill(twinkle(0, 0, 2.6), WHITE);
        },
      },
    ];
  },
  step: (o, t, w, tw) => {
    'worklet';
    put(o.p7, 38, -111, -0.95 + w * (1.5 + 0.15 * Math.sin(t * 5)), 1, 1);
    const a = tw * 2.6;
    put(o.p0, -13, -79.5, a, 1, 1);
    put(o.p1, 4.1, -89.4, -a * 1.5 + 0.3, 1, 1);
    put(o.p5, 30, -57, 0.5 - 0.85 * ease(w) + w * 0.05 * Math.sin(t * 6), 1, 1);
    const g = w * (0.92 + 0.08 * Math.sin(t * 6));
    put(o.p2, -27, -107.5, 0, g, g);
    puffAt(o.p3, 12, -118, t * 0.6, 24, 4, w);
    puffAt(o.p4, 12, -118, t * 0.6 + 0.5, 24, 4, w);
    twinkleAt(o.p6, -31, -86, t * 1.1, w);
  },
};

const STATION_DEFS: Record<StationArtKind, StationDef> = { oven: OVEN, stove: STOVE, prep: PREP, fryer: FRYER, dessert: DESSERT, espresso: ESPRESSO, generic: GENERIC };

interface StationArt {
  /** Its shadow on the floor (drawn under both the working and the locked station). */
  shadow: SkPicture;
  layers: { pic: SkPicture; key?: PartKey }[];
  /** The whole station at rest, light and grey (not bought yet). */
  locked: SkPicture;
}

function buildStation(kind: StationArtKind, c: ArtPalette, dish: ResolvedDish): StationArt {
  const def = STATION_DEFS[kind];
  const specs = def.layers(c, dish);
  const rest = makeMats(STATION_KEYS);
  def.step(rest, 0, 0, 0);
  return {
    shadow: rec((p) => baseShadow(p, 52, 10), c.outline),
    layers: specs.map((s) => ({ pic: rec(s.draw, c.outline), key: s.key })),
    locked: recordTinted(
      (p) => {
        for (const s of specs) {
          if (!s.key) s.draw(p);
          else if (s.idle) {
            p.c.save();
            p.c.concat(rest[s.key]);
            s.draw(p);
            p.c.restore();
          }
        }
      },
      lockedTint(c.wall),
      mix(c.outline, c.wall, 0.45),
    ),
  };
}

let padlockPic: SkPicture | null = null;
const padlockArt = () => (padlockPic ??= rec((p) => drawPadlock(p)));

export interface StationProps {
  kind: StationArtKind;
  /** The floor point under the middle of the station, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  /** 1 draws it about 60 x 64 px (`STATION_SIZE`). */
  scale?: Anim<number>;
  palette?: Partial<ArtPalette>;
  /** Cooking or not: `true`/`false`, or 0..1. The fire, steam and so on ease in and out by themselves. */
  working?: Anim<number | boolean>;
  /** Not bought yet: drawn light and grey, with a coloured padlock. */
  locked?: boolean;
  /** Show a padlock on a locked station. Default true. */
  padlock?: boolean;
  /** Milliseconds, e.g. Skia's `useClock()`. */
  clock: SharedValue<number>;
  /** What the oven bakes. */
  dish?: DishLook | DishKind;
  /** Shifts the timing so two stations of one kind do not flicker in step. */
  seed?: number;
  zIndex?: Anim<number>;
}

/** A kitchen station standing against the wall. */
export function Station({ kind, x, y, scale = 1, palette, working = false, locked = false, padlock = true, clock, dish, seed, zIndex }: StationProps) {
  const [pal, palKey] = usePalette(palette);
  const food = resolveDish(dish);
  const art = useArt(`station:${kind}:${palKey}:${JSON.stringify(food)}`, () => buildStation(kind, pal, food));
  const step = STATION_DEFS[kind].step;
  const offset = (((seed ?? hashString(kind)) % 997) / 997) * 20;
  const m = useRig(
    STATION_KEYS,
    (o, mem) => {
      'worklet';
      const now = clock.value;
      const dt = tick(mem, now);
      const k = UNIT * num(scale);
      put(o.root, num(x), num(y), 0, k, k);
      const t = now / 1000 + offset;
      const w = approach(mem, 1, locked ? 0 : level(working), dt, 150);
      // Time spent working, so wheels keep their angle when the work pauses.
      if (mem[2] !== mem[2]) mem[2] = t * w;
      else mem[2] += (w * dt) / 1000;
      step(o, t, w, mem[2]);
    },
    [clock, x, y, scale, working, locked, step, offset],
  );
  const scale0 = typeof scale === 'number' ? scale : scale.value;
  const ppu = useMemo(() => rasterDensity(UNIT, scale0), [scale0]);
  return (
    <Group matrix={m.root} zIndex={zIndex}>
      <Picture picture={art.shadow} />
      {locked ? (
        <>
          <Picture picture={art.locked} />
          {padlock ? <Picture picture={padlockArt()} matrix={LOCK_AT} /> : null}
        </>
      ) : (
        art.layers.map((l, i) => {
          // A layer that never moves (the station's body) draws from an image made once at the shown
          // size; moving layers (fire, steam, wheels, glows that add light) stay vector pictures.
          const img = !l.key && ppu !== null ? lasting.get(l.pic, ppu) : null;
          return img ? (
            <Image key={i} image={img.image} x={img.x} y={img.y} width={img.width} height={img.height} fit="fill" sampling={PART_SAMPLING} />
          ) : (
            <Picture key={i} picture={l.pic} matrix={l.key ? m[l.key] : undefined} />
          );
        })
      )}
    </Group>
  );
}

const LOCK_AT = [1.15, 0, 0, 0, 1.15, -62, 0, 0, 1];

// ---------------------------------------------------------------------------
// The pass: a long counter with dishes piling up and a service bell
// ---------------------------------------------------------------------------

/** How long the bell shakes after `rung` changes, in ms. */
export const BELL_RING_MS = 620;
/** Height of the pass at `scale` 1, in pixels (dishes and the bell stand on top of that). */
export const PASS_HEIGHT = 25;

const PASS_TOP = -48;
const PASS_LIP = -35;
const PASS_DISH_Y = -41.5;
const MAX_PASS_DISHES = 21;
const DISH_KEYS = Array.from({ length: MAX_PASS_DISHES }, (_, i) => `d${i}`);
const PASS_KEYS = ['root', 'bell', 'ringL', 'ringR', ...DISH_KEYS] as readonly string[];

/** How much higher the next dish sits when stacked on one of this kind, in units. */
const DISH_RISE: Record<DishKind, number> = { pizza: 5.2, plate: 6.5, bites: 7, bowl: 9.5, cup: 9, dessert: 15 };

function drawCounter(p: Pen, c: ArtPalette, len: number) {
  const h = len / 2;
  const marble = marbleOf(c);
  baseShadow(p, h + 2, 10);
  // Front: wooden panels on a dark kick board.
  shapeWith(
    p,
    rrect(-h + 3, -34, len - 6, 34, 4),
    c.wood,
    () => {
      p.fill(rrect(-h, -5.5, len, 6, 0), dark(c.wood, 0.42));
      // The marble top overhangs: a soft shadow falls from it onto the wood.
      p.gradient(rrect(-h, -31, len, 9, 0), 0, -31, 0, -22, [alpha(INK, 0.34), alpha(INK, 0)], null);
    },
    { shade: 3.4 },
  );
  const n = Math.max(1, Math.round((len - 14) / 46));
  const pw = (len - 14) / n;
  for (let i = 0; i < n; i++) p.stroke(rrect(-h + 7 + i * pw + 3.5, -26.5, pw - 7, 17.5, 3.5), shadeOf(c.wood, 1.5), 1.9);
  // Top: a pale slab seen from a little above, with its front edge in shade.
  shapeWith(p, rrect(-h, PASS_TOP, len, 17.5, 5), marble, () => p.fill(rrect(-h, PASS_LIP, len, 6, 0), shadeOf(marble, 1.25)), { ow: 3.2, shade: false });
  p.stroke(line(-h + 4, PASS_LIP, h - 4, PASS_LIP), mix(marble, c.outline, 0.5), 1.6, true);
  // A dark line right under the lip gives the slab its thickness.
  p.stroke(line(-h + 5, PASS_TOP + 19.2, h - 5, PASS_TOP + 19.2), alpha(INK, 0.45), 1.8, true);
  p.shine(line(-h + 9, PASS_TOP + 4, -h + 9 + Math.min(60, len * 0.3), PASS_TOP + 4), WHITE, 1.8, 0.9);
}

/** Drawn 1.35x the first pass: the bell is the key "order up" cue. */
const BELL_SCALE = 1.35;

function drawBell(p: Pen, c: ArtPalette) {
  p.at(0, 0, () => {
    p.shape(rrect(-1.9, -17.4, 3.8, 5.4, 1.5), c.metal, { ow: 2, shade: false });
    p.shape(circle(0, -18, 2.5), c.metal, { ow: 2, shade: false });
    p.shape(blob([[-10, -1.2, 0], [-9.4, -7.4], [-5.4, -12], [0, -13.4], [5.4, -12], [9.4, -7.4], [10, -1.2, 0]]), c.accent, { ow: 2.3, shade: 2.4 });
    p.shine(curve([[-6.4, -6], [-4.6, -9.4], [-1.4, -11.2]]), WHITE, 1.9, 0.9);
    p.shape(ellipse(0, -0.6, 12, 3.6), '#4A3328', { ow: 2.2, shade: false });
  }, 0, BELL_SCALE);
}

function drawRingMarks(p: Pen, c: ArtPalette) {
  p.stroke(arc(-2, -13, 19, 19, -38, 60), c.outline, 2.8);
  p.stroke(arc(-2, -13, 26, 26, -30, 44), c.outline, 2.8);
}

interface PassLayout {
  xs: number[];
  ys: number[];
  /** A small turn per dish (rad), so the piles look set down by hand rather than a pattern fill. */
  rs: number[];
  kinds: number[];
  count: number;
}

function layoutPass(len: number, bellX: number | null, kinds: DishKind[], stacks: number | undefined): PassLayout {
  let from = -len / 2 + 20;
  let to = len / 2 - 20;
  // Keep the dishes clear of the bell: use the longer free side.
  if (bellX !== null) {
    if (bellX - 28 - from >= to - (bellX + 28)) to = Math.min(to, bellX - 30);
    else from = Math.max(from, bellX + 30);
  }
  const span = Math.max(0, to - from);
  const slots = Math.max(1, Math.min(7, stacks ?? Math.floor(span / 34) + 1));
  const layers = Math.min(3, Math.floor(MAX_PASS_DISHES / slots));
  const count = slots * layers;
  const xs: number[] = [];
  const ys: number[] = [];
  const rs: number[] = [];
  const ks: number[] = [];
  const top = Array.from({ length: slots }, () => PASS_DISH_Y);
  const r = rng(len * 31 + slots);
  // Each pile is a few units off the even spacing; each dish in it a little off the pile and turned up to 10 degrees.
  const pileX = Array.from({ length: slots }, (_, s) => (slots === 1 ? (from + to) / 2 : from + (span * s) / (slots - 1)) + (r() * 2 - 1) * 4);
  for (let i = 0; i < count; i++) {
    const s = i % slots;
    const k = i % kinds.length;
    xs.push(pileX[s] + (r() * 2 - 1) * 1.6);
    ys.push(top[s]);
    rs.push((r() * 2 - 1) * 0.17);
    ks.push(k);
    top[s] -= DISH_RISE[kinds[k]];
  }
  return { xs, ys, rs, kinds: ks, count };
}

export interface PassProps {
  /** The floor point under the middle of the counter, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  /** Length of the counter in pixels at `scale` 1. Any length works. */
  width: number;
  scale?: Anim<number>;
  palette?: Partial<ArtPalette>;
  /** How full the pass is, 0..1: 0 is an empty counter, 1 is every pile at full height. */
  dishes?: Anim<number>;
  /** What piles up: one dish, or a list that is cycled through. Default pizza. */
  dish?: DishLook | DishKind | readonly (DishLook | DishKind)[];
  /** Number of piles (1..7). Default: as many as fit. */
  stacks?: number;
  /** Where the bell stands, 0 (left end) .. 1 (right end); `null` for no bell. Default 0.93. */
  bell?: number | null;
  /** Rings the bell whenever it changes: `rung.value += 1`. The shake lasts `BELL_RING_MS`. */
  rung?: SharedValue<number>;
  /** Milliseconds, e.g. Skia's `useClock()`. */
  clock: SharedValue<number>;
  zIndex?: Anim<number>;
}

/** The pass. Draw it after the cooks behind it and before the waiters in front of it (or sort by `zIndex`). */
export function Pass({ x, y, width, scale = 1, palette, dishes = 0, dish, stacks, bell = 0.93, rung, clock, zIndex }: PassProps) {
  const [pal, palKey] = usePalette(palette);
  const len = Math.max(40, Math.round(width / UNIT));
  const list = (Array.isArray(dish) ? dish : [dish ?? 'pizza']) as (DishLook | DishKind)[];
  const dishKey = JSON.stringify(list);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const foods = useMemo(() => list.map((d) => ({ kind: resolveDish(d).kind, pic: dishArt(d).dish })), [dishKey]);
  const bellX = bell === null ? null : -len / 2 + 16 + (len - 32) * Math.max(0, Math.min(1, bell));
  const art = useArt(`pass:${palKey}:${len}`, () => ({
    counter: rec((p) => drawCounter(p, pal, len), pal.outline),
    bell: rec((p) => drawBell(p, pal), pal.outline),
    ring: rec((p) => drawRingMarks(p, pal), pal.outline),
  }));
  const lay = useMemo(
    () =>
      layoutPass(
        len,
        bellX,
        foods.map((f) => f.kind),
        stacks,
      ),
    [len, bellX, foods, stacks],
  );
  const m = useRig(
    PASS_KEYS,
    (o, mem) => {
      'worklet';
      const now = clock.value;
      const k = UNIT * num(scale);
      put(o.root, num(x), num(y), 0, k, k);
      const fill = clamp01(num(dishes)) * lay.count;
      for (let i = 0; i < MAX_PASS_DISHES; i++) {
        const mat = o[DISH_KEYS[i]];
        if (i >= lay.count) pop(mat, 0, 0, 0, 0);
        else pop(mat, lay.xs[i], lay.ys[i], lay.rs[i], backOut(fill - i));
      }
      if (bellX === null) return;
      // A ring: the bell dips as it is hit, then wobbles while the marks fly out.
      const u = sinceBump(mem, 1, rung ? rung.value : 0, now) / BELL_RING_MS;
      if (u >= 1) {
        put(o.bell, bellX, PASS_DISH_Y, 0, 1, 1);
        pop(o.ringL, 0, 0, 0, 0);
        pop(o.ringR, 0, 0, 0, 0);
        return;
      }
      const decay = (1 - u) * (1 - u);
      const hit = u < 0.12 ? Math.sin((Math.PI * u) / 0.12) : 0;
      put(o.bell, bellX, PASS_DISH_Y, 0.3 * decay * Math.sin(u * 30), 1 + 0.1 * hit, 1 - 0.16 * hit);
      const s = life(u, 0.12, 0.5) * (0.75 + 0.6 * u);
      put(o.ringR, bellX + 4 * u, PASS_DISH_Y, 0, s, s);
      put(o.ringL, bellX - 4 * u, PASS_DISH_Y, 0, -s, s);
    },
    [clock, x, y, scale, dishes, rung, lay, bellX],
  );
  return (
    <Group matrix={m.root} zIndex={zIndex}>
      <Picture picture={art.counter} />
      {DISH_KEYS.slice(0, lay.count).map((key, i) => (
        <Picture key={key} picture={foods[lay.kinds[i]].pic} matrix={m[key]} />
      ))}
      {bellX !== null ? (
        <>
          <Picture picture={art.ring} matrix={m.ringL} />
          <Picture picture={art.ring} matrix={m.ringR} />
          <Picture picture={art.bell} matrix={m.bell} />
        </>
      ) : null}
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Table, chair, door
// ---------------------------------------------------------------------------

/** Size of a table at `scale` 1, in pixels (sized for 50 px people: a seated guest's knees go under the cloth). */
export const TABLE_SIZE = { width: 41, height: 28 } as const;
/** Where the chairs go: this many pixels left and right of the table's middle at `scale` 1 (half the table + 4). */
export const CHAIR_OFFSET = Math.round(TABLE_SIZE.width / 2 + 4);
/** Where the plate sits: this far above the table's floor point at `scale` 1, in pixels. */
export const TABLE_TOP = 16;

const TABLE_Y = -31;
const TABLE_RX = 39;
const TABLE_RY = 15;

function drawTable(p: Pen, c: ArtPalette) {
  // Foot and column.
  p.shape(ellipse(0, -2.6, 18, 5.2), shadeOf(c.wood, 0.9), { ow: 3, shade: false });
  p.shape(rrect(-5.4, -24, 10.8, 22, 2.5), c.wood, { ow: 3, shade: 1.8 });
  // The cloth hanging over the edge, with a scalloped hem.
  const drop = 8.5;
  const b = builder();
  b.moveTo(-TABLE_RX, TABLE_Y);
  const n = 7;
  let px = -TABLE_RX;
  let py = TABLE_Y + drop;
  b.lineTo(px, py);
  for (let i = 1; i <= n; i++) {
    const a = Math.PI - (Math.PI * i) / n;
    const mid = Math.PI - (Math.PI * (i - 0.5)) / n;
    const x = Math.cos(a) * TABLE_RX;
    const y = TABLE_Y + drop + Math.sin(a) * TABLE_RY;
    b.quadTo(Math.cos(mid) * (TABLE_RX + 1.2), TABLE_Y + drop + Math.sin(mid) * TABLE_RY + 4.4, x, y);
    px = x;
    py = y;
  }
  b.lineTo(TABLE_RX, TABLE_Y);
  b.close();
  void px;
  void py;
  const check = alpha(c.primary, 0.5);
  shapeWith(
    p,
    done(b),
    c.cloth,
    () => {
      for (let x = -TABLE_RX - 3.1; x < TABLE_RX; x += 12.4) p.fill(rrect(x, TABLE_Y, 6.2, 40, 0), check);
      p.fill(rrect(-50, TABLE_Y, 100, 40, 0), alpha(INK, 0.1));
    },
    { ow: 3, shade: false },
  );
  // The top: gingham.
  const top = ellipse(0, TABLE_Y, TABLE_RX, TABLE_RY);
  shapeWith(
    p,
    top,
    c.cloth,
    () => {
      for (let x = -TABLE_RX - 3.1; x < TABLE_RX; x += 12.4) p.fill(rrect(x, TABLE_Y - 17, 6.2, 34, 0), check);
      for (let y = TABLE_Y - TABLE_RY - 1.2; y < TABLE_Y + TABLE_RY; y += 4.8) p.fill(rrect(-50, y, 100, 2.4, 0), check);
    },
    { ow: 3.2, shade: false },
  );
  p.shine(arc(0, TABLE_Y, TABLE_RX - 3.4, TABLE_RY - 2.6, 196, 50), WHITE, 1.6, 0.85);
}

/** An empty plate with crumbs and a fork: someone enjoyed that. Centred like a dish. */
function drawFinishedPlate(p: Pen, c: ArtPalette, d: ResolvedDish) {
  const plate = d.kind === 'pizza' ? c.cloth : d.plate;
  p.shape(ellipse(0, 1.2, 13, 5.2), shadeOf(plate), { ow: 2.7, shade: false });
  p.shape(ellipse(0, 0, 13, 5.2), plate, { ow: 2.7, shade: false });
  p.fill(ellipse(0, 0.3, 9.2, 3.3), shadeOf(plate, 0.7));
  const crumb = d.kind === 'pizza' ? d.plate : d.food;
  for (const [x, y, r] of [[-4.6, -0.6, 1.2], [2.2, 1.4, 1], [5.4, -0.8, 0.9], [-1, 1.2, 0.8]] as [number, number, number][]) p.dot(x, y, r, shadeOf(crumb, 0.6));
  p.stroke(arc(-4, 0.4, 3.4, 1.6, 150, 150), shadeOf(d.topping, 0.3), 1.3);
  rod(p, line(-9.5, 3.4, 7.5, -3), c.metal, 1.5, 1);
}

interface TableArt {
  table: SkPicture;
  done: SkPicture;
}

export interface TableProps {
  /** The floor point under the middle of the table, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  scale?: Anim<number>;
  palette?: Partial<ArtPalette>;
  /** `empty`, `food` (a full plate) or `finished` (an empty plate with crumbs). Changes pop in. */
  state?: Anim<TableState>;
  /** The dish that is served here. Default pizza. */
  dish?: DishLook | DishKind;
  /** Milliseconds, e.g. Skia's `useClock()`. */
  clock: SharedValue<number>;
  zIndex?: Anim<number>;
}

const TABLE_KEYS = ['root', 'food', 'done'] as const;

/** A round table with a checkered cloth. */
export function Table({ x, y, scale = 1, palette, state = 'empty', dish, clock, zIndex }: TableProps) {
  const [pal, palKey] = usePalette(palette);
  const food = resolveDish(dish);
  const foodKey = JSON.stringify(food);
  const art = useArt<TableArt>(`table:${palKey}:${foodKey}`, () => ({
    table: rec((p) => drawTable(p, pal), pal.outline),
    done: rec((p) => drawFinishedPlate(p, pal, food), pal.outline),
  }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const served = useMemo(() => dishArt(dish).dish, [foodKey]);
  const m = useRig(
    TABLE_KEYS,
    (o, mem) => {
      'worklet';
      const dt = tick(mem, clock.value);
      const k = UNIT * num(scale);
      const s = typeof state === 'string' ? state : state.value;
      const f = approach(mem, 1, s === 'food' ? 1 : 0, dt, 70);
      const d = approach(mem, 2, s === 'finished' ? 1 : 0, dt, 70);
      // Nothing popping in or out and not moved: skip the frame.
      const px = num(x);
      const py = num(y);
      const sig = f * 3.7 + d * 5.3 + px * 7.1 + py * 13.3 + k * 101;
      if (sig === mem[6]) return false;
      mem[6] = sig;
      put(o.root, px, py, 0, k, k);
      pop(o.food, 0, TABLE_Y - 0.5, 0, backOut(f));
      pop(o.done, 0, TABLE_Y - 0.5, 0, backOut(d));
    },
    [clock, x, y, scale, state],
  );
  // The table top never changes shape: draw it from an image made once at the shown size (one quad
  // instead of replaying its vectors every frame). Falls back to the picture when no image can be made.
  const scale0 = typeof scale === 'number' ? scale : scale.value;
  const ppu = useMemo(() => rasterDensity(UNIT, scale0), [scale0]);
  const body = ppu === null ? null : lasting.get(art.table, ppu);
  return (
    <Group matrix={m.root} zIndex={zIndex}>
      {body ? (
        <Image image={body.image} x={body.x} y={body.y} width={body.width} height={body.height} fit="fill" sampling={PART_SAMPLING} />
      ) : (
        <Picture picture={art.table} />
      )}
      <Picture picture={art.done} matrix={m.done} />
      <Picture picture={served} matrix={m.food} />
    </Group>
  );
}

function drawChair(p: Pen, c: ArtPalette) {
  const far = shadeOf(c.wood, 1.3);
  // Far legs, then the back post and the near legs.
  // Outer edges at least 2.6 units, so the chair weighs the same as the people on it.
  p.shape(rrect(-5.5, -13, 4.4, 11.5, 1.5), far, { ow: 2.6, shade: false });
  p.shape(rrect(10, -13, 4.4, 11.5, 1.5), far, { ow: 2.6, shade: false });
  p.shape(rrect4(-13.5, -42, 8, 42, 3.5, 3.5, 1.5, 1.5), c.wood, { ow: 3, shade: 1.6 });
  p.stroke(line(-9.6, -37, -9.6, -21), shadeOf(c.wood, 1.2), 1.4);
  p.shape(rrect(5.5, -13, 5, 13, 1.6), c.wood, { ow: 2.8, shade: false });
  // Seat and cushion.
  p.shape(rrect(-13.5, -15.6, 25.5, 5.6, 2.4), c.wood, { ow: 3, shade: 1.4 });
  p.shape(rrect(-10.5, -18.6, 21.5, 4.6, 2.3), c.accent, { ow: 2.6, shade: 1.2 });
}

export interface ChairProps {
  /** The floor point under the seat, in canvas pixels: the same point a seated `Character` takes. */
  x: Anim<number>;
  y: Anim<number>;
  scale?: Anim<number>;
  palette?: Partial<ArtPalette>;
  /** 1: whoever sits here faces right (the backrest is on the left). -1: mirrored. */
  facing?: Anim<number>;
  zIndex?: Anim<number>;
}

/** A wooden chair, seat at the height seated characters use (`SEAT_HEIGHT`). */
export function Chair({ x, y, scale = 1, palette, facing = 1, zIndex }: ChairProps) {
  const [pal, palKey] = usePalette(palette);
  const art = useArt(`chair:${palKey}`, () => ({ chair: rec((p) => drawChair(p, pal), pal.outline) }));
  const root = useRoot(x, y, scale, UNIT, facing);
  return (
    <Group matrix={root} zIndex={zIndex}>
      <Picture picture={art.chair} />
    </Group>
  );
}

/** Size of the door with its awning at `scale` 1, in pixels. */
export const DOOR_SIZE = { width: 50, height: 72 } as const;
/** The door's swing after `swing` changes: it opens, stays open, then closes (ms). */
export const DOOR_OPEN_MS = 240;
export const DOOR_HOLD_MS = 760;
export const DOOR_CLOSE_MS = 420;

const DOOR_W = 54;
const DOOR_H = 104;

function awningPath(hwTop: number, hwBottom: number, top: number, fold: number, scallops: number, depth: number): SkPath {
  const b = builder();
  b.moveTo(-hwTop, top);
  b.lineTo(hwTop, top);
  b.lineTo(hwBottom, fold);
  const wv = (hwBottom * 2) / scallops;
  for (let i = 0; i < scallops; i++) b.quadTo(hwBottom - (i + 0.5) * wv, fold + depth * 2, hwBottom - (i + 1) * wv, fold);
  b.close();
  return done(b);
}

/** A striped awning: `stripes` bands, the odd ones in the brand colour. */
function drawAwning(p: Pen, c: ArtPalette, hwTop: number, hwBottom: number, top: number, fold: number, stripes: number, depth: number) {
  shapeWith(
    p,
    awningPath(hwTop, hwBottom, top, fold, stripes, depth),
    c.cloth,
    () => {
      for (let i = 0; i < stripes; i += 2) {
        const a = i / stripes;
        const z = (i + 1) / stripes;
        p.fill(
          poly([[-hwTop + hwTop * 2 * a, top], [-hwTop + hwTop * 2 * z, top], [-hwBottom + hwBottom * 2 * z, fold], [-hwBottom + hwBottom * 2 * z, fold + depth * 2], [-hwBottom + hwBottom * 2 * a, fold + depth * 2], [-hwBottom + hwBottom * 2 * a, fold]]),
          c.primary,
        );
      }
      p.fill(rrect(-hwBottom - 2, fold - 2.6, hwBottom * 2 + 4, 3, 0), alpha(INK, 0.16));
    },
    { shade: false },
  );
  p.shine(line(-hwTop + 6, top + 3.6, -hwTop + 17, top + 3.6), WHITE, 1.7, 0.7);
}

function drawDoorBack(p: Pen, c: ArtPalette) {
  const frame = shadeOf(c.wood, 1.25);
  baseShadow(p, DOOR_W / 2 + 8, 9);
  p.shape(rrect4(-DOOR_W / 2 - 6, -DOOR_H - 7, DOOR_W + 12, DOOR_H + 7, 5, 5, 0, 0), frame, { shade: 3 });
  // Outside: daylight and a strip of pavement.
  const hole = rrect4(-DOOR_W / 2, -DOOR_H, DOOR_W, DOOR_H, 3, 3, 0, 0);
  p.gradient(hole, 0, -DOOR_H, 0, 0, ['#9ADBF7', '#DDF4FB', '#FFF4CF'], [0, 0.62, 1]);
  p.clipped(hole, () => {
    p.fill(ellipse(-9, -30, 26, 15), '#B9E6A8');
    p.fill(ellipse(21, -26, 21, 13), '#A2DB98');
    p.fill(rrect(-30, -19, 60, 20, 0), '#F4E3C1');
    p.fill(circle(12, -80, 8.5), alpha(WHITE, 0.9));
    p.fill(circle(20, -77, 6.5), alpha(WHITE, 0.9));
    p.fill(circle(3, -77.5, 6), alpha(WHITE, 0.9));
    p.fill(rrect(-30, -DOOR_H, 7, DOOR_H, 0), alpha(INK, 0.16));
  });
  p.stroke(hole, c.outline, 2.4);
  // Doormat.
  p.shape(rrect(-DOOR_W / 2 - 3, -3.5, DOOR_W + 6, 6.5, 2.5), mix(c.primary, '#7A3B2E', 0.45), { ow: 2.4, shade: false });
}

/** The door itself, drawn from its hinge at the bottom left. */
function drawDoorLeaf(p: Pen, c: ArtPalette) {
  const leaf = rrect4(0, -DOOR_H, DOOR_W, DOOR_H, 3, 3, 0, 0);
  p.shape(leaf, c.primary, { ow: 2.6, shade: 3.4, light: 1.6 });
  p.stroke(rrect(7, -38, 40, 30, 4), dark(c.primary, 0.3), 2);
  const glass = rrect(8, -94, 38, 46, 7);
  p.shape(glass, '#BFE6F5', { ow: 2.3, shade: false });
  p.clipped(glass, () => {
    p.fill(rrect(8, -62, 38, 16, 0), '#E4F6FC');
    p.shine(line(15, -58, 26, -86), WHITE, 3.4, 0.7);
    p.shine(line(22.5, -58, 30, -77), WHITE, 1.8, 0.7);
  });
  p.stroke(line(27, -94, 27, -48), c.outline, 2);
  p.stroke(line(8, -70, 46, -70), c.outline, 2);
  p.stroke(glass, c.outline, 2.3);
  p.shape(rrect(40.5, -45.5, 7, 12, 2.5), c.accent, { ow: 1.8, shade: 1.2 });
  p.shape(circle(44, -42, 3.3), tint(c.accent, 0.35), { ow: 1.7, shade: false });
}

function drawDoorFront(p: Pen, c: ArtPalette) {
  // Brackets and the awning.
  drawAwning(p, c, 34, 47, -139, -117, 5, 5.2);
}

export interface DoorProps {
  /** The floor point under the middle of the doorway, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  scale?: Anim<number>;
  palette?: Partial<ArtPalette>;
  /** Swings the door open and shut again whenever it changes: `swing.value += 1` (see `DOOR_OPEN_MS` and friends). */
  swing?: SharedValue<number>;
  /** Holds the door open by hand: 0 shut .. 1 wide open. The wider of this and the swing wins. */
  open?: Anim<number>;
  /** -1 hinges the door on the right. */
  facing?: Anim<number>;
  /** Milliseconds, e.g. Skia's `useClock()`. */
  clock: SharedValue<number>;
  zIndex?: Anim<number>;
}

const DOOR_KEYS = ['root', 'leaf'] as const;

/** The front door, with a striped awning. */
export function Door({ x, y, scale = 1, palette, swing, open = 0, facing = 1, clock, zIndex }: DoorProps) {
  const [pal, palKey] = usePalette(palette);
  const art = useArt(`door:${palKey}`, () => ({
    back: rec((p) => drawDoorBack(p, pal), pal.outline),
    leaf: rec((p) => drawDoorLeaf(p, pal), pal.outline),
    front: rec((p) => drawDoorFront(p, pal), pal.outline),
  }));
  const m = useRig(
    DOOR_KEYS,
    (o, mem) => {
      'worklet';
      const k = UNIT * num(scale);
      const ms = sinceBump(mem, 1, swing ? swing.value : 0, clock.value);
      let a = 0;
      if (ms < DOOR_OPEN_MS) a = backOut(ms / DOOR_OPEN_MS);
      else if (ms < DOOR_OPEN_MS + DOOR_HOLD_MS) a = 1;
      else if (ms < DOOR_OPEN_MS + DOOR_HOLD_MS + DOOR_CLOSE_MS) a = 1 - ease((ms - DOOR_OPEN_MS - DOOR_HOLD_MS) / DOOR_CLOSE_MS);
      const held = num(open);
      if (held > a) a = held;
      // Idle (closed and not moving): skip the frame.
      const px = num(x);
      const py = num(y);
      const sig = a + px * 7.1 + py * 13.3 + k * 101 + (num(facing) < 0 ? 1 : 0);
      if (sig === mem[6]) return false;
      mem[6] = sig;
      put(o.root, px, py, 0, k * (num(facing) < 0 ? -1 : 1), k);
      // Seen from the front, an opening door gets narrower and its free edge swings towards us.
      const leaf = o.leaf;
      leaf[0] = 1 - 0.8 * a;
      leaf[1] = 0;
      leaf[2] = -DOOR_W / 2;
      leaf[3] = 0.2 * a;
      leaf[4] = 1;
      leaf[5] = 0;
    },
    [clock, x, y, scale, facing, swing, open],
  );
  return (
    <Group matrix={m.root} zIndex={zIndex}>
      <Picture picture={art.back} />
      <Picture picture={art.leaf} matrix={m.leaf} />
      <Picture picture={art.front} />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// The room: floor, wall, shelf, menu board, contact shadow
// ---------------------------------------------------------------------------

/** Default floor tile size in pixels. */
export const FLOOR_TILE = 26;
/** Default height of the wall strip in pixels. */
export const WALL_HEIGHT = 96;

function drawFloor(p: Pen, c: ArtPalette, w: number, h: number, tile: number) {
  p.fill(rrect(0, 0, w, h, 0), c.floorB);
  const cols = Math.ceil(w / tile);
  // A hint of depth: rows are shallower at the back (about 0.78 of a tile) and deeper at the front.
  const rowY = [0];
  while (rowY[rowY.length - 1] < h) {
    const y = rowY[rowY.length - 1];
    rowY.push(y + tile * (0.78 + 0.32 * Math.min(1, y / Math.max(1, h))));
  }
  const rows = rowY.length - 1;
  const lite = lightOf(c.floorA, 0.5);
  for (let r = 0; r < rows; r++) {
    const y = rowY[r];
    const th = rowY[r + 1] - y;
    for (let q = 0; q < cols; q++) {
      const x = q * tile;
      if ((r + q) % 2 === 0) {
        p.fill(rrect(x, y, tile, th, 0), c.floorA);
        // A soft gleam on the top left corner of the light tiles.
        p.fill(poly([[x + 2, y + 2], [x + tile * 0.42, y + 2], [x + 2, y + th * 0.42]]), alpha(lite, 0.55));
      } else {
        p.fill(rrect(x, y + th - 2.4, tile, 2.4, 0), alpha(shadeOf(c.floorB, 0.8), 0.6));
      }
    }
  }
  const grout = alpha(c.outline, 0.12);
  for (let q = 1; q < cols; q++) p.stroke(line(q * tile, 0, q * tile, h), grout, 1, true);
  for (let r = 1; r < rows; r++) p.stroke(line(0, rowY[r], w, rowY[r]), grout, 1, true);
  // The back of the room is a touch darker than the front.
  p.gradient(rrect(0, 0, w, h, 0), 0, 0, 0, h * 0.7, [alpha(INK, 0.09), alpha(INK, 0)]);
  // Where the floor meets the wall: a dark contact band, then a soft falloff.
  p.fill(rrect(0, 0, w, 3, 0), alpha(INK, 0.24));
  p.gradient(rrect(0, 0, w, 20, 0), 0, 0, 0, 20, [alpha(INK, 0.3), alpha(INK, 0.1), alpha(INK, 0)], [0, 0.35, 1]);
}

export interface FloorProps {
  /** Top left corner, in canvas pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  palette?: Partial<ArtPalette>;
  /** Tile size in pixels. Default `FLOOR_TILE`. */
  tile?: number;
  zIndex?: Anim<number>;
}

/** Checkerboard floor tiles for any size. */
export function Floor({ x, y, width, height, palette, tile = FLOOR_TILE, zIndex }: FloorProps) {
  const [pal, palKey] = usePalette(palette);
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const art = useArt(`floor:${palKey}:${w}:${h}:${tile}`, () => ({ pic: rec((p) => drawFloor(p, pal, w, h, tile), pal.outline) }));
  const m = useMemo(() => [1, 0, x, 0, 1, y, 0, 0, 1], [x, y]);
  return <Picture picture={art.pic} matrix={m} zIndex={zIndex} />;
}

/** A wooden shelf with jars, bottles and a plant; `len` units long, origin at the middle of the plank's top. */
function drawShelf(p: Pen, c: ArtPalette, len: number) {
  const h = len / 2;
  // Brackets.
  for (const bx of [-h + 12, h - 12]) p.shape(poly([[bx - 4, 0], [bx + 4, 0], [bx + 4, 16], [bx - 4, 6]]), shadeOf(c.wood, 1.2), { ow: 2.2, shade: false });
  // What stands on it, left to right, spread over the length.
  const slots = Math.max(3, Math.floor(len / 26));
  const step = (len - 20) / slots;
  for (let i = 0; i < slots; i++) {
    const x = -h + 10 + step * (i + 0.5);
    switch (i % 5) {
      case 0: {
        // Tomato tin.
        p.shape(rrect(x - 7, -19, 14, 19, 3), c.primary, { ow: 2.2, shade: 2 });
        p.fill(rrect(x - 7, -14, 14, 8, 0), c.cloth);
        p.dot(x, -10, 2.4, c.primary);
        p.stroke(rrect(x - 7, -19, 14, 19, 3), c.outline, 2.2);
        p.shine(line(x - 4, -16, x - 4, -4), WHITE, 1.6, 0.7);
        break;
      }
      case 1: {
        // Olive oil bottle.
        p.shape(merged(rrect(x - 6, -24, 12, 24, 4), rrect(x - 2.4, -34, 4.8, 12, 1.5)), mix(GREEN, c.accent, 0.25), { ow: 2.2, shade: 2 });
        p.fill(rrect(x - 6, -15, 12, 8, 0), alpha(c.cloth, 0.9));
        p.stroke(merged(rrect(x - 6, -24, 12, 24, 4), rrect(x - 2.4, -34, 4.8, 12, 1.5)), c.outline, 2.2);
        p.shape(rrect(x - 3, -37, 6, 4, 1), c.primary, { ow: 1.8, shade: false });
        break;
      }
      case 2: {
        // Stack of plates.
        for (let k = 0; k < 3; k++) p.shape(ellipse(x, -3 - k * 4, 10, 3), c.cloth, { ow: 2, shade: false });
        break;
      }
      case 3: {
        // Little plant in a pot.
        for (const [lx, ly, r] of [[-5, -22, -30], [4, -24, 25], [0, -28, 0]] as [number, number, number][]) p.at(x + lx, ly, () => p.shape(ellipse(0, 0, 4, 8), GREEN, { ow: 1.8, shade: 1.2 }), r);
        p.shape(poly([[x - 8, -15], [x + 8, -15], [x + 6, 0], [x - 6, 0]]), mix(c.stone, '#C0603A', 0.6), { ow: 2.2, shade: 1.8 });
        break;
      }
      default: {
        // Jar of pasta.
        p.shape(rrect(x - 7, -20, 14, 20, 4), alpha('#E7F4F8', 0.95), { ow: 2.2, shade: false });
        for (let k = 0; k < 4; k++) p.stroke(line(x - 4 + k * 2.6, -15, x - 2 + k * 2.6, -3), c.accent, 1.6);
        p.shape(rrect(x - 8, -24, 16, 5, 2), c.wood, { ow: 2, shade: false });
        p.shine(line(x - 4, -17, x - 4, -6), WHITE, 1.4, 0.8);
      }
    }
  }
  // Plank.
  p.shape(rrect(-h, 0, len, 7, 2.5), c.wood, { ow: 2.6, shade: 2, light: 1 });
}

/** A chalk menu board in a wooden frame (a pizza doodle and handwriting squiggles, no text); `w` x `h` units, origin at its middle. */
function drawMenuBoard(p: Pen, c: ArtPalette, w: number, h: number) {
  // String and nail.
  p.stroke(poly([[-w * 0.3, -h / 2 + 3], [0, -h / 2 - 12], [w * 0.3, -h / 2 + 3]], false), c.outline, 1.6);
  p.shape(circle(0, -h / 2 - 12, 2.4), c.metal, { ow: 1.6, shade: false });
  p.shape(rrect(-w / 2, -h / 2, w, h, 6), c.wood, { ow: 2.8, shade: 2.4, light: 1.2 });
  const board = rrect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 3);
  const slate = mix('#2F4A40', c.wall, 0.12);
  shapeWith(
    p,
    board,
    slate,
    () => {
      // Old rubbed-out chalk behind today's menu.
      p.stroke(curve([[-w * 0.3, h * 0.3], [0, h * 0.24], [w * 0.3, h * 0.3]]), alpha(WHITE, 0.08), 5);
      // Today's menu, in shapes: a pizza doodle on the left and handwriting squiggles on the right.
      const chalk = alpha(WHITE, 0.85);
      const pr = Math.min(h * 0.27, w * 0.15);
      const px = -w / 2 + 8 + pr * 1.25;
      const py = h * 0.02;
      p.stroke(circle(px, py, pr), chalk, 2);
      p.stroke(circle(px, py, pr * 0.72), alpha(WHITE, 0.45), 1.2);
      for (const a of [0.3, 1.35, 2.4, 3.45, 4.5, 5.55]) p.stroke(line(px, py, px + Math.cos(a) * pr, py + Math.sin(a) * pr), alpha(WHITE, 0.6), 1.1);
      for (const [dx, dy] of [[-0.35, -0.3], [0.32, -0.12], [-0.08, 0.38], [0.4, 0.38], [-0.45, 0.15]] as Pt[]) p.dot(px + dx * pr, py + dy * pr, 1.5, alpha('#FF8A80', 0.9));
      const lx = px + pr * 1.5;
      const rx = w / 2 - 10;
      const wave = (y: number, x1: number, amp: number, n: number) => {
        const pts: [number, number][] = [];
        for (let i = 0; i <= n; i++) pts.push([lx + ((x1 - lx) * i) / n, y + (i % 2 === 0 ? -amp : amp)]);
        return curve(pts);
      };
      p.stroke(wave(-h * 0.24, rx, 1.6, 7), chalk, 1.8);
      p.stroke(wave(-h * 0.04, rx - w * 0.08, 1.3, 6), alpha(WHITE, 0.7), 1.5);
      p.stroke(wave(h * 0.15, rx - w * 0.02, 1.3, 6), alpha(WHITE, 0.7), 1.5);
      p.stroke(wave(h * 0.32, lx + (rx - lx) * 0.6, 1.2, 4), alpha(WHITE, 0.6), 1.4);
      // Price dots in yellow chalk.
      for (const y of [-h * 0.04, h * 0.15]) p.dot(rx + 1, y, 1.6, alpha('#FFE58A', 0.9));
    },
    { ow: 2.2, shade: 2.2 },
  );
  p.shine(line(-w / 2 + 10, -h / 2 + 10, -w / 2 + 10 + w * 0.25, -h / 2 + 10), alpha(WHITE, 0.6), 1.6, 0.6);
  // Chalk tray.
  p.shape(rrect(-w * 0.32, h / 2 - 4, w * 0.64, 5, 2), shadeOf(c.wood, 0.8), { ow: 2, shade: false });
  p.shape(rrect(w * 0.08, h / 2 - 6.5, 9, 3, 1.5), WHITE, { ow: 1.4, shade: false });
}

function drawWall(p: Pen, c: ArtPalette, w: number, h: number, shelfAt: number | null, menuAt: number | null) {
  const wain = Math.round(h * 0.3);
  // Plaster with soft vertical stripes.
  p.fill(rrect(0, 0, w, h, 0), c.wall);
  const stripe = alpha(lightOf(c.wall, 0.5), 0.45);
  for (let x = 10; x < w; x += 36) p.fill(rrect(x, 0, 14, h - wain, 0), stripe);
  // Crown moulding.
  p.fill(rrect(0, 0, w, 9, 0), shadeOf(c.wall, 1.1));
  p.stroke(line(0, 9, w, 9), c.outline, 2.2, true);
  // Wainscot panels.
  const panel = mix(c.wood, c.primary, 0.12);
  p.fill(rrect(0, h - wain, w, wain, 0), panel);
  const n = Math.max(1, Math.round(w / 64));
  const pw = w / n;
  for (let i = 0; i < n; i++) {
    const r = rrect(i * pw + 8, h - wain + 12, pw - 16, wain - 26, 4);
    p.fill(r, tint(panel, 0.1));
    p.stroke(r, shadeOf(panel, 1.1), 1.8);
    p.shine(line(i * pw + 13, h - wain + 16, i * pw + pw * 0.4, h - wain + 16), WHITE, 1.4, 0.35);
  }
  p.shape(rrect(-4, h - wain - 4, w + 8, 8, 2), lightOf(c.wood, 0.25), { ow: 2.4, shade: 1.6 });
  // Skirting board.
  p.shape(rrect(-4, h - 10, w + 8, 10, 0), shadeOf(c.wood, 1.4), { ow: 2.4, shade: false });
  if (shelfAt !== null) {
    // Drawn at 1.3x so the bottles and tins read at scene scale.
    const big = 1.3;
    const len = Math.min(150, w * 0.36);
    const sx = len / 2 + 6 + (w - len - 12) * shelfAt;
    p.at(sx, h * 0.56, () => drawShelf(p, c, len / big), 0, big);
  }
  if (menuAt !== null) {
    const bw = Math.min(110, w * 0.3);
    const bh = Math.min(h * 0.46, 64);
    const mx = bw / 2 + 8 + (w - bw - 16) * menuAt;
    p.at(mx, h * 0.33, () => drawMenuBoard(p, c, bw, bh));
  }
}

export interface WallProps {
  /** Top left corner, in canvas pixels. The floor starts at `y + height`. */
  x: number;
  y: number;
  width: number;
  /** Default `WALL_HEIGHT`. */
  height?: number;
  palette?: Partial<ArtPalette>;
  /** Where a shelf hangs along the wall, 0 (left) .. 1 (right); `null` for none. Default 0.08. */
  shelf?: number | null;
  /** Where a chalk menu board hangs, 0 .. 1; `null` for none. Default 0.92. */
  menu?: number | null;
  zIndex?: Anim<number>;
}

/** The back wall: striped plaster over wooden panels, with an optional shelf and menu board. Stations stand in front of it. */
export function Wall({ x, y, width, height = WALL_HEIGHT, palette, shelf = 0.08, menu = 0.92, zIndex }: WallProps) {
  const [pal, palKey] = usePalette(palette);
  const w = Math.max(10, Math.round(width / UNIT));
  const h = Math.max(10, Math.round(height / UNIT));
  const art = useArt(`wall:${palKey}:${w}:${h}:${shelf}:${menu}`, () => ({ pic: rec((p) => p.clipped(rrect(0, 0, w, h, 0), () => drawWall(p, pal, w, h, shelf, menu)), pal.outline) }));
  const m = useMemo(() => [UNIT, 0, x, 0, UNIT, y, 0, 0, 1], [x, y]);
  return <Picture picture={art.pic} matrix={m} zIndex={zIndex} />;
}

export interface ShelfProps {
  /** Middle of the plank's top edge, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  /** Length in pixels at `scale` 1. Default 70. */
  width?: number;
  scale?: Anim<number>;
  palette?: Partial<ArtPalette>;
  zIndex?: Anim<number>;
}

/** A wall shelf with jars, bottles, plates and a plant. */
export function Shelf({ x, y, width = 70, scale = 1, palette, zIndex }: ShelfProps) {
  const [pal, palKey] = usePalette(palette);
  const len = Math.max(40, Math.round(width / UNIT));
  const art = useArt(`shelf:${palKey}:${len}`, () => ({ pic: rec((p) => drawShelf(p, pal, len), pal.outline) }));
  const root = useRoot(x, y, scale, UNIT);
  return (
    <Group matrix={root} zIndex={zIndex}>
      <Picture picture={art.pic} />
    </Group>
  );
}

export interface MenuBoardProps {
  /** Centre of the board, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  /** Size in pixels at `scale` 1. Default 56 x 34. */
  width?: number;
  height?: number;
  scale?: Anim<number>;
  palette?: Partial<ArtPalette>;
  zIndex?: Anim<number>;
}

/** A blank chalk menu board; lay real text over it outside the canvas if needed. */
export function MenuBoard({ x, y, width = 56, height = 34, scale = 1, palette, zIndex }: MenuBoardProps) {
  const [pal, palKey] = usePalette(palette);
  const w = Math.round(width / UNIT);
  const h = Math.round(height / UNIT);
  const art = useArt(`menu:${palKey}:${w}:${h}`, () => ({ pic: rec((p) => drawMenuBoard(p, pal, w, h), pal.outline) }));
  const root = useRoot(x, y, scale, UNIT);
  return (
    <Group matrix={root} zIndex={zIndex}>
      <Picture picture={art.pic} />
    </Group>
  );
}

let contactPic: SkPicture | null = null;
const contactArt = () =>
  (contactPic ??= rec((p) => {
    p.radial(circle(0, 0, 1), 0, 0, 1, [alpha(INK, 0.3), alpha(INK, 0.2), alpha(INK, 0)], [0, 0.55, 1]);
  }));

export interface ContactShadowProps {
  /** Centre of the shadow (the floor point under the thing), in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  /** Size in pixels at `scale` 1. Default 34 x 9. */
  width?: number;
  height?: number;
  scale?: Anim<number>;
  /** 0..1 (or more); e.g. smaller while something is up in the air. */
  strength?: Anim<number>;
  zIndex?: Anim<number>;
}

/** A soft round shadow on the floor. */
export function ContactShadow({ x, y, width = 34, height = 9, scale = 1, strength = 1, zIndex }: ContactShadowProps) {
  // As whatever casts it rises, the shadow mostly fades (alpha 0.22 -> 0.08) and shrinks only a little (1 -> 0.75).
  const opacity = useDerivedValue(() => {
    const k = Math.min(1, Math.max(0, num(strength)));
    return (0.08 + 0.14 * k) / 0.22;
  });
  const m = useRig(
    ROOT_KEYS,
    (o) => {
      'worklet';
      const s = num(scale);
      const k = Math.max(0, num(strength));
      const g = 0.75 + 0.25 * Math.min(1, k);
      pop(o.root, num(x), num(y), 0, k > 0.01 ? 1 : 0);
      if (k > 0.01) {
        o.root[0] = (width / 2) * s * g;
        o.root[4] = (height / 2) * s * g;
      }
    },
    [x, y, scale, strength, width, height],
  );
  return (
    <Group matrix={m.root} zIndex={zIndex} opacity={opacity}>
      <Picture picture={contactArt()} />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Small things: dishes in flight, coin, gem, tray, sparkle burst, hand pointer
// ---------------------------------------------------------------------------

export interface DishProps {
  /** Centre of the dish's base, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  /** 1 is the size a dish has on a table (about 14 px wide). */
  scale?: Anim<number>;
  /** Default pizza; `'plate'` is a generic plated dish. */
  dish?: DishLook | DishKind;
  /** Radians. */
  rotation?: Anim<number>;
  zIndex?: Anim<number>;
}

/** One dish, on its own. */
export function Dish({ x, y, scale = 1, dish, rotation = 0, zIndex }: DishProps) {
  const key = JSON.stringify(resolveDish(dish));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pic = useMemo(() => dishArt(dish).dish, [key]);
  const m = useRig(
    ROOT_KEYS,
    (o) => {
      'worklet';
      const k = UNIT * num(scale);
      put(o.root, num(x), num(y), num(rotation), k, k);
    },
    [x, y, scale, rotation],
  );
  return (
    <Group matrix={m.root} zIndex={zIndex}>
      <Picture picture={pic} />
    </Group>
  );
}

let flyingShadow: SkPicture | null = null;
/**
 * One ground shadow shared by every flying dish and never freed. (A picture per dish, freed when the
 * dish unmounted, could be freed while the canvas still drew its last frame: a crash on phones.)
 */
function flyingShadowPicture(): SkPicture {
  if (!flyingShadow) flyingShadow = record((p) => drawShadow(p, 12, 3.4, 0.9));
  return flyingShadow;
}

export interface FlyingDishProps {
  /** Start and end points (centre of the dish), in canvas pixels. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** 0 at `from` .. 1 at `to`; drive it with `withTiming`. */
  progress: Anim<number>;
  /** How far the arc rises above the straight line, in pixels. Default 36. */
  height?: number;
  /** Turns over the whole flight. Default 1. */
  spins?: number;
  dish?: DishLook | DishKind;
  scale?: Anim<number>;
  /** Hide the dish when progress is 0 or 1 (so it can wait at rest unseen). Default true. */
  hideAtRest?: boolean;
  /** Draw a soft shadow under the flight path. Default true. */
  shadow?: boolean;
  zIndex?: Anim<number>;
}

const FLY_KEYS = ['dish', 'shadow'] as const;

/** A dish flying along an arc and spinning: from the pass to a tray, from a table to the sink. */
export function FlyingDish({ from, to, progress, height = 36, spins = 1, dish, scale = 1, hideAtRest = true, shadow = true, zIndex }: FlyingDishProps) {
  const key = JSON.stringify(resolveDish(dish));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pic = useMemo(() => dishArt(dish).dish, [key]);
  const fx = from.x;
  const fy = from.y;
  const tx = to.x;
  const ty = to.y;
  const m = useRig(
    FLY_KEYS,
    (o) => {
      'worklet';
      const u = num(progress);
      if (hideAtRest && (u <= 0 || u >= 1)) {
        pop(o.dish, 0, 0, 0, 0);
        pop(o.shadow, 0, 0, 0, 0);
        return;
      }
      const v = clamp01(u);
      const lift = 4 * v * (1 - v);
      const bx = fx + (tx - fx) * v;
      const by = fy + (ty - fy) * v;
      const k = UNIT * num(scale);
      // A little bigger at the top of the arc: it comes towards us.
      const grow = 1 + 0.25 * lift;
      put(o.dish, bx, by - height * lift, spins * Math.PI * 2 * v, k * grow, k * grow);
      if (shadow) {
        const s = k * (1 - 0.45 * lift);
        put(o.shadow, bx, by + 6 * k, 0, s, s);
      } else pop(o.shadow, 0, 0, 0, 0);
    },
    [progress, fx, fy, tx, ty, height, spins, scale, hideAtRest, shadow],
  );
  const shadowPic = flyingShadowPicture();
  return (
    <Group zIndex={zIndex}>
      <Picture picture={shadowPic} matrix={m.shadow} />
      <Picture picture={pic} matrix={m.dish} />
    </Group>
  );
}


export interface TrayProps {
  /** Middle of the tray, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  scale?: Anim<number>;
  /** A dish on the tray; `null` (default) for an empty tray. */
  dish?: DishLook | DishKind | null;
  palette?: Partial<ArtPalette>;
  zIndex?: Anim<number>;
}

/** A round serving tray, empty or with a dish on it. */
export function Tray({ x, y, scale = 1, dish = null, palette, zIndex }: TrayProps) {
  const [pal, palKey] = usePalette(palette);
  const dishKey = dish === null ? '' : JSON.stringify(resolveDish(dish));
  const art = useArt(`tray:${palKey}`, () => ({ pic: rec((p) => drawTray(p, pal.metal), pal.outline) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const full = useMemo(() => (dish === null ? null : dishArt(dish).tray), [dishKey]);
  const root = useRoot(x, y, scale, UNIT);
  return (
    <Group matrix={root} zIndex={zIndex}>
      <Picture picture={full ?? art.pic} />
    </Group>
  );
}


const TRUFFLE = '#6B4A2E';
const TRUFFLE_INK = '#3D2A1A';

/** One knobbly truffle, about 36 units across, centred on 0,0. `seed` varies the bumps. */
function drawTruffle(p: Pen, seed = 1, sparkle = true) {
  const r = rng(seed * 7919);
  const n = 16;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.12;
    // Small round knobs all the way round: a lumpy ball, not a rock.
    const rr = (i % 2 ? 16.4 : 18) + r() * 1.1;
    pts.push([Math.cos(a) * rr * 1.04, Math.sin(a) * rr * 0.95]);
  }
  const body = blob(pts);
  p.shape(body, TRUFFLE, { ow: 3, outline: TRUFFLE_INK, shade: 4.2, shadeColor: shadeOf(TRUFFLE, 1.1), light: 2.6, lightColor: lightOf(TRUFFLE, 0.32) });
  // Warty skin: little dark pits and pale knobs.
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 10;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    if (i % 2) p.dot(x, y, 1.5 + r(), alpha(TRUFFLE_INK, 0.55));
    else p.dot(x - 0.6, y - 0.6, 1.3 + r() * 0.8, alpha(lightOf(TRUFFLE, 0.55), 0.8));
  }
  p.shine(arc(0, 0, 11, 10, 205, 50), WHITE, 2.4, 0.45);
  if (sparkle) {
    p.shape(twinkle(11, -13, 7.5), GOLD, { ow: 1.6, outline: shadeOf(GOLD, 1.6), shade: false });
    p.fill(twinkle(10.4, -13.6, 2.6), WHITE);
  }
}

function drawTrufflePile(p: Pen) {
  p.at(-14, 6, () => drawTruffle(p, 2, false), 0, 0.85);
  p.at(15, 7, () => drawTruffle(p, 3, false), 0, 0.82);
  p.at(0, -6, () => drawTruffle(p, 1, true), 0, 0.92);
}

function drawTruffleBasket(p: Pen) {
  const wicker = '#C98A3E';
  // Handle behind the truffles.
  p.stroke(curve([[-30, -2], [0, -46], [30, -2]]), shadeOf(wicker, 1.4), 7);
  p.stroke(curve([[-30, -2], [0, -46], [30, -2]]), wicker, 4);
  p.at(-14, -6, () => drawTruffle(p, 4, false), 0, 0.72);
  p.at(14, -7, () => drawTruffle(p, 5, false), 0, 0.7);
  p.at(0, -12, () => drawTruffle(p, 1, false), 0, 0.78);
  const bowl = blob([[-36, -6, 0], [36, -6, 0], [30, 22], [0, 27], [-30, 22]]);
  shapeWith(
    p,
    bowl,
    wicker,
    () => {
      for (const y of [2, 10, 18]) p.stroke(line(-36, y, 36, y), shadeOf(wicker, 0.9), 1.8, true);
      for (let x = -30; x <= 30; x += 10) p.stroke(line(x, -6, x * 0.85, 27), alpha(shadeOf(wicker, 1.2), 0.6), 1.6, true);
    },
    { shade: 4, light: 2 },
  );
  p.shape(rrect(-38, -10, 76, 8, 4), lightOf(wicker, 0.15), { ow: 2.6, shade: false });
  p.shape(twinkle(24, -26, 7.5), GOLD, { ow: 1.6, outline: shadeOf(GOLD, 1.6), shade: false });
  p.fill(twinkle(23.4, -26.6, 2.6), WHITE);
}

function drawTruffleCrate(p: Pen) {
  const wood = '#B9773C';
  for (const [x, y, s, k] of [[-22, -18, 0.7, 6], [0, -22, 0.75, 7], [22, -17, 0.7, 8], [-11, -28, 0.66, 9], [12, -29, 0.68, 10]] as [number, number, number, number][])
    p.at(x, y, () => drawTruffle(p, k, false), 0, s);
  const box = rrect(-40, -14, 80, 42, 4);
  shapeWith(
    p,
    box,
    wood,
    () => {
      const joint = shadeOf(wood, 1.4);
      p.stroke(line(-40, 0, 40, 0), joint, 2, true);
      p.stroke(line(-40, 14, 40, 14), joint, 2, true);
    },
    { shade: 5, light: 2.4 },
  );
  for (const x of [-34, 34]) p.shape(rrect(x - 4, -14, 8, 42, 2), shadeOf(wood, 0.5), { ow: 2, shade: false });
  for (const [x, y] of [[-34, -9], [34, -9], [-34, 23], [34, 23]] as Pt[]) p.dot(x, y, 1.6, '#E9D6B5');
  p.shape(twinkle(30, -36, 8), GOLD, { ow: 1.6, outline: shadeOf(GOLD, 1.6), shade: false });
  p.fill(twinkle(29.4, -36.6, 2.8), WHITE);
}


/** A little shop front: a wide facade with a striped awning, two windows and the front door. */
function drawStorefront(p: Pen) {
  const c = DEFAULT_PALETTE;
  const W = 70;
  const H = 112;
  const brick = brickOf(c);
  // Facade with a cornice.
  shapeWith(
    p,
    rrect4(-W, -H, W * 2, H, 6, 6, 0, 0),
    c.stone,
    () => {
      p.fill(rrect(-W, -16, W * 2, 16, 0), shadeOf(c.stone, 0.5));
    },
    { shade: 5, light: 2 },
  );
  p.shape(rrect(-W - 5, -H - 8, W * 2 + 10, 12, 4), brick, { ow: 2.6, shade: 2 });
  // Windows with a warm light inside.
  for (const sx of [-1, 1]) {
    const win = rrect(sx * 46 - 17, -72, 34, 46, 5);
    p.shape(win, shadeOf(c.wood, 0.9), { ow: 2.8, shade: false });
    const glass = rrect(sx * 46 - 13, -68, 26, 38, 3);
    p.gradient(glass, 0, -68, 0, -30, ['#FFE7A8', '#FFC86A'], null);
    p.stroke(line(sx * 46, -68, sx * 46, -30), shadeOf(c.wood, 0.9), 2.4);
    p.stroke(line(sx * 46 - 13, -50, sx * 46 + 13, -50), shadeOf(c.wood, 0.9), 2.4);
    p.shine(line(sx * 46 - 9, -40, sx * 46 - 4, -62), WHITE, 2.4, 0.6);
    p.shape(rrect(sx * 46 - 20, -28, 40, 7, 2.5), brick, { ow: 2.2, shade: false });
  }
  // The door, a little smaller than the one in the room.
  p.at(0, 0, () => {
    p.shape(rrect4(-DOOR_W / 2 - 5, -DOOR_H - 5, DOOR_W + 10, DOOR_H + 5, 5, 5, 0, 0), shadeOf(c.wood, 1.25), { shade: 3 });
    p.at(-DOOR_W / 2, 0, () => drawDoorLeaf(p, c));
  }, 0, 0.62, 0.78);
  drawAwning(p, c, W - 4, W + 10, -H + 2, -H + 30, 7, 5.5);
}


/** The restaurant's own "art:" icons, registered by the sim mode entry (src/modes/sim). */
export const SIM_ART_ICONS: Record<string, ArtIconDef> = {
  truffle: { draw: (p) => drawTruffle(p, 1, true) },
  'truffle-pile': { draw: drawTrufflePile },
  'truffle-basket': { draw: drawTruffleBasket },
  'truffle-crate': { draw: drawTruffleCrate },
  storefront: { draw: drawStorefront },
};

