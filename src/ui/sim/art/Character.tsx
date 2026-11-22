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
import { Group, Picture, select, type SharedValueSelector } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { startMapper, stopMapper, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { FACE_SHIFT, getCharacterArt, mouthYFor, releaseCharacterArt, retainCharacterArt, type CharacterArt } from './characterArt';
import { hashString } from './draw';
import { commonArt, dishArt } from './items';
import { lookKey, resolveLook, type LookInput } from './looks';
import { POSE_INDEX, makeRig, makeRigState, stepRig, type Rig, type RigConfig, type RigState } from './rig';
import { POSES, type DishKind, type DishLook, type Pose } from './types';

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
  /** The poses this character will ever take. Listing them skips drawing parts the others need (trays, dough, z's). */
  poses?: readonly Pose[];
  /** Drawing order among siblings; pass the y position to sort a crowd by depth. */
  zIndex?: Anim<number>;
  /** Draw the soft shadow under the feet. Default true. */
  shadow?: boolean;
}

function isShared<T>(v: Anim<T>): v is Readable<T> {
  return typeof v === 'object' && v !== null && (v as { _isReanimatedSharedValue?: boolean })._isReanimatedSharedValue === true;
}

const sharedOnly = (list: unknown[]) => list.filter((v) => isShared(v));

/** The drawings for a look, kept alive while the component is mounted. */
export function useCharacterArt(look: LookInput): CharacterArt {
  const resolved = resolveLook(look);
  const key = lookKey(resolved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const art = useMemo(() => getCharacterArt(resolved), [key]);
  useEffect(() => {
    retainCharacterArt(art);
    return () => releaseCharacterArt(art);
  }, [art]);
  return art;
}

export function Character({ look, x, y, facing = 1, pose = 'idle', clock, scale = 1, dish, seed, poses = POSES, zIndex, shadow = true }: CharacterProps) {
  const art = useCharacterArt(look);
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
    const o = stepRig(makeRigState(), cfg, read(x), read(y), read(facing), POSE_INDEX[read(pose)] ?? 0, clock.value, read(scale));
    const copy = makeRig();
    for (const k in o) copy[k as keyof Rig] = o[k as keyof Rig].slice();
    return copy;
  });
  const rig = useSharedValue<Rig>(first);
  const [blank] = useState(makeRigState);
  const state = useSharedValue<RigState>(blank);

  useEffect(() => {
    const index = POSE_INDEX;
    const id = startMapper(
      () => {
        'worklet';
        const px = typeof x === 'number' ? x : x.value;
        const py = typeof y === 'number' ? y : y.value;
        const f = typeof facing === 'number' ? facing : facing.value;
        const ps = typeof pose === 'string' ? pose : pose.value;
        const sc = typeof scale === 'number' ? scale : scale.value;
        // The state object lives on the UI thread and is updated in place.
        rig.value = stepRig(state.value, cfg, px, py, f, index[ps] ?? 0, clock.value, sc);
      },
      sharedOnly([clock, x, y, facing, pose, scale]),
      [rig as SharedValue<unknown>],
    );
    return () => stopMapper(id);
  }, [cfg, clock, x, y, facing, pose, scale, rig, state]);

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
      {shadow ? <Picture picture={common.shadow} matrix={m.shadow} /> : null}
      <Picture picture={art.headBack} matrix={m.headBack} />
      <Picture picture={art.legB} matrix={m.legB} />
      <Picture picture={art.legF} matrix={m.legF} />
      <Picture picture={art.torso} matrix={m.torso} />
      <Picture picture={art.arm} matrix={m.armB} />
      <Picture picture={art.hand} matrix={m.handB} />
      <Picture picture={art.head} matrix={m.head} />
      <Picture picture={art.eyes} matrix={m.eyes} />
      <Picture picture={art.eyesShut} matrix={m.eyesShut} />
      <Picture picture={art.mouthSmile} matrix={m.mouthSmile} />
      <Picture picture={art.mouthOpen} matrix={m.mouthOpen} />
      {eats ? <Picture picture={art.mouthChew} matrix={m.mouthChew} /> : null}
      {cooks ? <Picture picture={common.spoon} matrix={m.spoon} /> : null}
      {cooks ? <Picture picture={common.bowl} matrix={m.bowl} /> : null}
      <Picture picture={art.arm} matrix={m.armF} />
      <Picture picture={art.hand} matrix={m.handF} />
      {can('carry') ? <Picture picture={food.tray} matrix={m.tray} /> : null}
      {can('toss') ? <Picture picture={common.dough} matrix={m.dough} /> : null}
      {eats ? <Picture picture={food.bite} matrix={m.bite} /> : null}
      {can('sit-wait') ? <Picture picture={food.bubble} matrix={m.bubble} /> : null}
      {can('sleep') ? (
        <>
          <Picture picture={common.z} matrix={m.z1} />
          <Picture picture={common.z} matrix={m.z2} />
          <Picture picture={common.z} matrix={m.z3} />
        </>
      ) : null}
      {eats ? (
        <>
          <Picture picture={common.heart} matrix={m.heart} />
          <Picture picture={common.crumb} matrix={m.crumb1} />
          <Picture picture={common.crumb} matrix={m.crumb2} />
        </>
      ) : null}
      {can('cheer') ? (
        <>
          <Picture picture={common.spark} matrix={m.spark1} />
          <Picture picture={common.spark} matrix={m.spark2} />
        </>
      ) : null}
    </Group>
  );
}
