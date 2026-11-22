/**
 * The code-drawn cast: characters for the living restaurant scene and
 * portraits for lists, cards and dialogue. Everything is drawn with Skia
 * shapes (no images, no text) and animated on the UI thread.
 *
 * PUBLIC API
 *
 *   <Character look x y facing? pose? clock scale? dish? seed? poses? zIndex? shadow? />
 *     A Skia element: put it inside someone else's <Canvas>. `x`, `y`, `facing`,
 *     `pose` and `scale` may be plain values or Reanimated shared / derived
 *     values; `clock` (ms) must be a shared value, e.g. Skia's `useClock()`.
 *     Changing values never re-renders React: the rig runs in a worklet.
 *
 *   <CharacterBust look size background? facing? mood? blink? style? />
 *     A React Native view with its own small canvas (an image on web): a
 *     head-and-shoulders portrait, 28 to 220 px, with an idle blink.
 *
 *   resolveLook(entry)   game.json look (`{ preset?, ...CharacterLook }`) -> complete look
 *   randomLook(seed, kind?)  a stable random customer / waiter / chef / manager
 *   LOOKS, LOOK_NAMES    the named pizza cast (nonna, carl, tony, marco, ...)
 *   POSES                'idle' | 'walk' | 'carry' | 'cook' | 'toss' | 'sit-wait' | 'sit-eat' | 'cheer' | 'sleep' | 'wave'
 *   CHARACTER_HEIGHT     px height of a standing adult at scale 1 (hats not counted)
 *   SEAT_HEIGHT, UNIT    seat height in drawing units and px per unit, to build chairs that fit
 *
 * PLACING A CHARACTER AND DRIVING IT
 *
 *   import { Canvas, useClock } from '@shopify/react-native-skia';
 *   import { useSharedValue, withTiming } from 'react-native-reanimated';
 *   import { Character, type Pose } from '../sim/art';
 *
 *   function Waiter() {
 *     const clock = useClock();                 // one clock can drive the whole scene
 *     const x = useSharedValue(40);
 *     const y = useSharedValue(300);            // floor point between the feet
 *     const facing = useSharedValue(1);         // 1 right, -1 left
 *     const pose = useSharedValue<Pose>('carry');
 *     const go = (to: number) => {
 *       facing.value = to > x.value ? 1 : -1;
 *       pose.value = 'carry';                    // legs walk while x moves, stand when it stops
 *       x.value = withTiming(to, { duration: 1500 }, () => { pose.value = 'idle'; });
 *     };
 *     return (
 *       <Canvas style={{ flex: 1 }}>
 *         <Character look={{ preset: 'sal' }} x={x} y={y} facing={facing} pose={pose} clock={clock} dish="pizza" />
 *       </Canvas>
 *     );
 *   }
 *
 * Notes
 * - Seated poses put the hips at SEAT_HEIGHT above `y`: draw the chair at the same `y`.
 * - Pass `zIndex={y}` (a shared value is fine) to sort a crowd by depth.
 * - Pass `poses={['walk', 'sit-wait', 'sit-eat']}` when a character only ever does a few things;
 *   it skips the parts the other poses need (tray, dough, bowl, z's).
 * - A scale of about 1.04 (52 / CHARACTER_HEIGHT) gives the 52 px scene size.
 * - Drawings are cached per look and shared by every character wearing it.
 *
 * The review screen is `?view=art` in the web build (see Gallery.tsx).
 */
export { Character, useCharacterArt, type Anim, type CharacterProps, type Readable } from './Character';
export { CharacterBust, type CharacterBustProps } from './CharacterBust';
export { LOOKS, LOOK_NAMES, expandLook, lookFor, lookKey, randomLook, resolveLook, type LookInput, type LookName, type ResolvedLook } from './looks';
export { CHARACTER_HEIGHT, SEAT_HEIGHT, UNIT } from './rig';
export type { BustMood } from './characterArt';
export {
  BEARDS,
  BODY_SHAPES,
  BROWS,
  CHARACTER_KINDS,
  DISH_KINDS,
  GLASSES,
  HAIR_STYLES,
  HATS,
  MOUSTACHES,
  NECKWEAR,
  OUTFIT_STYLES,
  PATTERNS,
  POSES,
  SPECIES,
  type CharacterKind,
  type CharacterLook,
  type DishKind,
  type DishLook,
  type LookEntry,
  type Pose,
} from './types';
