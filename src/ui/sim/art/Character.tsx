/**
 * One articulated, code-drawn character. Place it inside a Skia `<Canvas>`.
 *
 *   const clock = useClock();
 *   <Canvas style={{ flex: 1 }}>
 *     <Character look={LOOKS.marco} x={x} y={y} facing={facing} pose={pose} clock={clock} />
 *   </Canvas>
 *
 * `x`, `y` are the point on the floor between the feet (for seated poses, the
 * floor under the seat). Everything animates on the UI thread from `clock`
 * (milliseconds); slowing or speeding the clock slows or speeds the character.
 * Changing `pose` blends over about a quarter of a second.
 */
import { Group, Image, Picture, select, type SharedValueSelector, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { startMapper, stopMapper, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { FACE_SHIFT, getCharacterArt, mouthYFor, releaseCharacterArt, retainCharacterArt, type CharacterArt } from './characterArt';
import { hashString } from '../../art/draw';
import { commonArt, dishArt } from './items';
import { lookKey, resolveLook, type LookInput } from './looks';
import { PART_SAMPLING, lasting, rasterDensity, type RasterSet } from '../../art/raster';
import { POSE_INDEX, UNIT, makeRig, makeRigState, stepRig, type Rig, type RigConfig, type RigState } from './rig';
import type { CharacterKind, DishKind, DishLook, Pose } from './types';

/** Anything from Reanimated with a `.value` to read: `useSharedValue`, `useDerivedValue`, Skia's `useClock`. */
export interface Readable<T> {
  readonly value: T;
}
/** A plain value, or a shared / derived value that changes it without a React render. */
export type Anim<T> = T | Readable<T>;

export interface CharacterProps {
  /** Who this is: a look entry from game.json (`preset` and overrides welcome), a built-in name, or nothing for the default customer. */
  look?: LookInput;
  /** Floor point between the feet, in canvas pixels. */
  x: Anim<number>;
  y: Anim<number>;
  /** 1 faces right, -1 faces left. A change plays as a quick turn. */
  facing?: Anim<number>;
  pose?: Anim<Pose>;
  /** Milliseconds, e.g. Skia's `useClock()`. One clock can drive the whole scene. */
  clock: Readable<number>;
  /** 1 draws an adult about 50 px tall (`CHARACTER_HEIGHT`). */
  scale?: Anim<number>;
  /** The dish on the tray (`carry`), in the hand (`sit-eat`) and in the thought bubble (`sit-wait`). */
  dish?: DishLook | DishKind;
  /** Shifts this character's idle timing so a crowd does not move in step. Defaults to a value derived from the look. */
  seed?: number;
  /**
   * The poses this character will ever take. Listing them skips drawing parts the others need (trays, dough, z's).
   * Defaults to `ROLE_POSES[look.kind]`; any pose still plays without the list, only its held prop is missing.
   */
  poses?: readonly Pose[];
  /** Drawing order among siblings; pass the y position to sort a crowd by depth. */
  zIndex?: Anim<number>;
  /** Draw the soft shadow under the feet. Default true. */
  shadow?: boolean;
  /**
   * While false, the rig is not stepped and nothing is drawn: no per-frame work beyond one check. Use it to
   * keep a few characters mounted and switch between them with a shared value, without a React render.
   * Default true.
   */
  active?: Anim<boolean>;
  /**
   * `image` (default) draws each part from an image made once per look at the shown size, falling back to
   * the vector pictures when an image cannot be made or the character is shown very large; `vector` always
   * draws the pictures (close-ups).
   */
  render?: 'image' | 'vector';
}

/** The poses each kind of character normally takes; the default `poses` of a Character. */
export const ROLE_POSES: Record<CharacterKind, readonly Pose[]> = {
  chef: ['idle', 'walk', 'cook', 'toss', 'cheer', 'sleep'],
  waiter: ['idle', 'walk', 'carry', 'wave', 'cheer'],
  customer: ['idle', 'walk', 'sit-wait', 'sit-eat', 'cheer', 'wave'],
  manager: ['idle', 'walk', 'wave', 'cheer', 'sleep'],
};

function isShared<T>(v: Anim<T>): v is Readable<T> {
  return typeof v === 'object' && v !== null && (v as { _isReanimatedSharedValue?: boolean })._isReanimatedSharedValue === true;
}

const sharedOnly = (list: unknown[]) => list.filter((v) => isShared(v));

/** The drawings for a look, kept alive while the component is mounted. */
export function useCharacterArt(look: LookInput): CharacterArt {
  const resolved = resolveLook(look);
  const key = lookKey(resolved);
  // Bumped if the set got during render was freed before this component could claim it.
  const [gen, setGen] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const art = useMemo(() => getCharacterArt(resolved), [key, gen]);
  useLayoutEffect(() => {
    if (!retainCharacterArt(art)) {
      setGen((g) => g + 1);
      return;
    }
    return () => releaseCharacterArt(art);
  }, [art]);
  return art;
}

/** One part: its image when there is one (a textured quad), else the vector picture, moved by the same matrix. */
function part(pic: SkPicture, matrix: SharedValueSelector<number[]>, set: RasterSet, ppu: number | null) {
  const img = ppu === null ? null : set.get(pic, ppu);
  if (!img) return <Picture picture={pic} matrix={matrix} />;
  return <Image image={img.image} x={img.x} y={img.y} width={img.width} height={img.height} fit="fill" sampling={PART_SAMPLING} matrix={matrix} />;
}

export function Character(props: CharacterProps) {
  // A plain `active={false}` mounts nothing at all.
  if (props.active === false) return null;
  return <LiveCharacter {...props} />;
}

function LiveCharacter({ look, x, y, facing = 1, pose = 'idle', clock, scale = 1, dish, seed, poses: posesProp, zIndex, shadow = true, active = true, render = 'image' }: CharacterProps) {
  const art = useCharacterArt(look);
  const poses = posesProp ?? ROLE_POSES[art.look.kind] ?? ROLE_POSES.customer;
  const dishKey = typeof dish === 'string' ? dish : JSON.stringify(dish ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const food = useMemo(() => dishArt(dish), [dishKey]);
  const common = commonArt();

  const cfg = useMemo<RigConfig>(
    () => ({
      d: art.dims,
      mouthY: mouthYFor(art.look),
      faceX: FACE_SHIFT,
      offset: (((seed ?? hashString(art.key)) % 9973) / 9973) * 40,
      top: art.top,
    }),
    [art, seed],
  );

  // The first frame is worked out here so the character never flashes in unposed.
  const [first] = useState<Rig>(() => {
    const read = <T,>(v: Anim<T>): T => (isShared(v) ? v.value : v);
    // Mounted switched off: start collapsed, so it never shows for a frame before the mapper runs.
    if (!read(active)) return makeRig();
    const o = stepRig(makeRigState(), cfg, read(x), read(y), read(facing), POSE_INDEX[read(pose)] ?? 0, clock.value, read(scale));
    const copy = makeRig();
    for (const k in o) copy[k as keyof Rig] = o[k as keyof Rig].slice();
    return copy;
  });
  const rig = useSharedValue<Rig>(first);
  const [blank] = useState(makeRigState);
  const state = useSharedValue<RigState>(blank);
  /** True while switched off and collapsed (UI thread only). */
  const off = useSharedValue(false);

  // Raster density from the size it is shown at (read once: scenes set the scale at layout time).
  const scale0 = isShared(scale) ? scale.value : scale;
  const ppu = useMemo(() => (render === 'vector' ? null : rasterDensity(UNIT, scale0)), [render, scale0]);

  useEffect(() => {
    const index = POSE_INDEX;
    const hidden = makeRig();
    const id = startMapper(
      () => {
        'worklet';
        const on = typeof active === 'boolean' ? active : active.value;
        if (!on) {
          // Once: every part collapses to nothing (Skia skips zero-size draws); then no work per frame.
          if (!off.value) {
            off.value = true;
            rig.value = hidden;
          }
          return;
        }
        off.value = false;
        const px = typeof x === 'number' ? x : x.value;
        const py = typeof y === 'number' ? y : y.value;
        const f = typeof facing === 'number' ? facing : facing.value;
        const ps = typeof pose === 'string' ? pose : pose.value;
        const sc = typeof scale === 'number' ? scale : scale.value;
        // The state object lives on the UI thread and is updated in place.
        rig.value = stepRig(state.value, cfg, px, py, f, index[ps] ?? 0, clock.value, sc);
      },
      sharedOnly([clock, x, y, facing, pose, scale, active]),
      [rig as SharedValue<unknown>],
    );
    return () => stopMapper(id);
  }, [cfg, clock, x, y, facing, pose, scale, rig, state, active, off]);

  const m = useMemo(() => {
    const out = {} as Record<keyof Rig, SharedValueSelector<number[]>>;
    for (const k of Object.keys(first) as (keyof Rig)[]) out[k] = select(rig, k);
    return out;
  }, [rig, first]);

  const can = (p: Pose) => poses.includes(p);
  const cooks = can('cook');
  const eats = can('sit-eat');
  return (
    <Group zIndex={zIndex}>
      {shadow ? part(common.shadow, m.shadow, lasting, ppu) : null}
      {part(art.headBack, m.headBack, art.rasters, ppu)}
      {part(art.legB, m.legB, art.rasters, ppu)}
      {part(art.legF, m.legF, art.rasters, ppu)}
      {part(art.torso, m.torso, art.rasters, ppu)}
      {part(art.arm, m.armB, art.rasters, ppu)}
      {part(art.hand, m.handB, art.rasters, ppu)}
      {part(art.head, m.head, art.rasters, ppu)}
      {part(art.eyes, m.eyes, art.rasters, ppu)}
      {part(art.eyesShut, m.eyesShut, art.rasters, ppu)}
      {part(art.mouthSmile, m.mouthSmile, art.rasters, ppu)}
      {part(art.mouthOpen, m.mouthOpen, art.rasters, ppu)}
      {eats ? part(art.mouthChew, m.mouthChew, art.rasters, ppu) : null}
      {cooks ? part(common.spoon, m.spoon, lasting, ppu) : null}
      {cooks ? part(common.bowl, m.bowl, lasting, ppu) : null}
      {cooks ? part(common.steam, m.steam, lasting, ppu) : null}
      {part(art.arm, m.armF, art.rasters, ppu)}
      {part(art.hand, m.handF, art.rasters, ppu)}
      {can('carry') ? part(food.tray, m.tray, lasting, ppu) : null}
      {can('toss') ? part(common.dough, m.dough, lasting, ppu) : null}
      {eats ? part(food.bite, m.bite, lasting, ppu) : null}
      {can('sit-wait') ? part(food.bubble, m.bubble, lasting, ppu) : null}
      {can('sleep') ? (
        <>
          {part(common.z, m.z1, lasting, ppu)}
          {part(common.z, m.z2, lasting, ppu)}
          {part(common.z, m.z3, lasting, ppu)}
        </>
      ) : null}
      {eats ? (
        <>
          {part(common.heart, m.heart, lasting, ppu)}
          {part(common.crumb, m.crumb1, lasting, ppu)}
          {part(common.crumb, m.crumb2, lasting, ppu)}
        </>
      ) : null}
      {can('cheer') ? (
        <>
          {part(common.spark, m.spark1, lasting, ppu)}
          {part(common.spark, m.spark2, lasting, ppu)}
        </>
      ) : null}
    </Group>
  );
}
