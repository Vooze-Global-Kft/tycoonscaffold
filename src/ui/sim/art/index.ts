/**
 * The code-drawn world of the living restaurant: characters, portraits and
 * scene props. Everything is Skia shapes (no images, no text, no emoji) and
 * animates on the UI thread: every part is recorded once into a cached
 * SkPicture and moved by one matrix per frame from a worklet, with no React
 * re-render per frame. Any game gets a cast and a room for free: looks come
 * from game.json, colours from `makePalette`.
 *
 * Conventions for every Skia element below (they go inside your <Canvas>):
 * - `x`, `y` are canvas pixels; for anything that stands, it is the floor point under it.
 * - Inputs typed `Anim<T>` take a plain value OR a Reanimated shared / derived value
 *   (`useSharedValue`, `useDerivedValue`): change the shared value and the element follows
 *   without a React render. `clock` is always a shared value in milliseconds
 *   (`useSceneClock()` below, or Skia's `useClock()`); one clock drives the whole scene.
 * - Triggers (`rung`, `swing`, `trigger`) are shared numbers: `v.value += 1` fires once.
 * - `scale` 1 is the scene size; `zIndex` sorts siblings (pass the floor y).
 * - `palette` is a `Partial<ArtPalette>`; the same palette gives the same cached drawings.
 *
 * ===========================================================================
 * CHARACTERS
 * ===========================================================================
 *
 * <Character look? x y facing? pose? clock scale? dish? seed? poses? zIndex? shadow? />
 *   look     LookInput: a game.json look (`{ preset: 'marco', hair: '#333' }`), a built-in name, or nothing
 *   x, y     Anim<number>  floor point between the feet (seated poses: the floor under the seat)
 *   facing   Anim<1 | -1>  1 faces right; a change plays as a quick pivot turn
 *   pose     Anim<Pose>    'idle' | 'walk' | 'carry' | 'cook' | 'toss' | 'sit-wait' | 'sit-eat' | 'cheer' | 'sleep' | 'wave'
 *                          changes blend over ~0.25 s; `carry` walks while x/y move and stands when they stop;
 *                          a guest in `sit-wait` turns impatient (small "o" mouth, foot tapping) after ~4 s
 *   clock    Readable<number> ms
 *   scale    Anim<number>  1 = an adult about 50 px tall (CHARACTER_HEIGHT)
 *   dish     DishLook | DishKind   on the tray (carry), in the hand (sit-eat), in the thought bubble (sit-wait)
 *   seed     number        de-syncs idle timing in a crowd (default: from the look)
 *   poses    Pose[]        poses this character will take; parts only those need are not mounted.
 *                          Default ROLE_POSES[look.kind] (chef, waiter, customer, manager)
 *   shadow   boolean       soft floor shadow, default true
 *
 * <CharacterBust look? size background? facing? mood? blink? render? style? />
 *   A React Native VIEW (not a Skia element): a head-and-shoulders portrait, 28-220 pt, blinking now and then.
 *   mood 'calm' | 'happy'; render 'auto' (canvas from BUST_CANVAS_MIN = 120 pt up on phones, cached image below
 *   and on web), 'canvas' (the 1-4 big portraits on screen) or 'image' (lists of many). blink={false} for long lists.
 *
 * <ArtIcon name size fallback? />   (also a React Native VIEW)
 *   A still from the kit as a cached image, 16-96 pt: one of ART_ICON_NAMES (chest-wood, chest-silver,
 *   chest-gold, gem, truffle, truffle-pile, truffle-basket, truffle-crate, coin, card-back, storefront).
 *   game.json reaches it as the icon "art:<name>" through GameIcon.
 *
 * Looks: resolveLook(entry), randomLook(seed, kind?), LOOKS / LOOK_NAMES (the named pizza cast),
 *   WAITER_VEST (every waiter wears it; customers never do), expandLook, lookFor, lookKey.
 * Sizes: CHARACTER_HEIGHT (px, adult, scale 1), SEAT_HEIGHT (drawing units), UNIT (px per drawing unit).
 *
 * ===========================================================================
 * SCENE PROPS (all Skia elements; shared values listed are the animated inputs)
 * ===========================================================================
 *
 * <Station kind x y clock scale? palette? working? locked? padlock? dish? seed? zIndex? />
 *   kind StationArtKind ('oven' | 'stove' | 'prep' | 'fryer' | 'dessert' | 'espresso' | 'generic');
 *   working Anim<boolean | 0..1> (fire, steam, wheels ease in/out); locked: drawn light grey with a padlock.
 *   About STATION_SIZE (60 x 64 px) at scale 1; stands against the wall; casts its own floor shadow.
 * <Pass x y width clock scale? palette? dishes? dish? stacks? bell? rung? zIndex? />
 *   The counter between kitchen and room. dishes Anim<0..1> fills the piles; dish one or a list (cycled);
 *   bell 0..1 position or null; rung SharedValue<number> rings the bell (BELL_RING_MS). Height PASS_HEIGHT.
 * <Table x y clock scale? palette? state? dish? zIndex? />
 *   state Anim<'empty' | 'food' | 'finished'> (changes pop in). TABLE_SIZE 41 x 28 px; plate at TABLE_TOP.
 * <Chair x y scale? palette? facing? zIndex? />
 *   x, y = the same point a seated Character takes. Put chairs at table x -/+ CHAIR_OFFSET, y - 4.
 * <Door x y clock scale? palette? swing? open? facing? zIndex? />
 *   swing SharedValue<number> (+1 opens and closes: DOOR_OPEN_MS, DOOR_HOLD_MS, DOOR_CLOSE_MS); open Anim<0..1>.
 * <Wall x y width height? palette? shelf? menu? zIndex? />   (height WALL_HEIGHT; shelf/menu 0..1 or null)
 * <Floor x y width height palette? tile? zIndex? />          (tile FLOOR_TILE; a dark band where it meets the wall)
 * <Shelf x y width? scale? palette? zIndex? />  <MenuBoard x y width? height? scale? palette? zIndex? />
 * <ContactShadow x y width? height? scale? strength? zIndex? />
 *   strength Anim<number>: 1 on the floor; lower as the caster rises (fades 0.22 -> 0.08 alpha, shrinks to 0.75).
 * <Dish x y scale? dish? rotation? zIndex? />   <Tray x y scale? dish? palette? zIndex? />
 * <FlyingDish from to progress height? spins? dish? scale? hideAtRest? shadow? zIndex? />
 *   progress Anim<0..1> (drive with withTiming). Fly only from somewhere to someone (oven -> pass, pass -> tray).
 * <Coin x y scale? spin? clock? color? zIndex? />   <Gem x y scale? color? clock? zIndex? />
 * <SparkleBurst x y trigger clock scale? color? plusOne? zIndex? />   trigger SharedValue<number>; SPARKLE_MS
 * <HandPointer x y clock scale? angle? palette? zIndex? />            tutorial tap; HAND_TAP_MS
 * <Chest x y tier lid clock scale? shake? rays? zIndex? />
 *   tier 'wood' | 'silver' | 'gold'; lid Anim<0..1> (hinged: 0.7 ~ 77 deg, 1 tipped back); shake Anim<0..1>. CHEST_SIZE.
 * <Card x y clock rarity? flip? scale? palette? zIndex?>{portrait}</Card>, <CardFrame rarity .../>, <CardBack .../>
 *   flip Anim<0..1> turns it over; children are drawn in CARD_WINDOW (use getBustArt + bustMatrix).
 * makePalette(overrides), DEFAULT_PALETTE, ArtPalette, STATION_ART_KINDS.
 *
 * useSceneClock(running = true, speed = 1): a pausable clock (ms). Pause it when the scene is
 *   off screen: nothing in the scene does any work while it is stopped.
 *
 * ===========================================================================
 * STAGING RULES (the gallery's mock restaurant follows them; the real screen should too)
 * ===========================================================================
 * - Draw back to front by floor y, or pass zIndex={y}. At a table: chairs, then the seated
 *   characters, then the Table (zIndex y + 0.5), so the cloth hides their laps; standing actors in
 *   front of the table have a larger y. Seated character z < table z < standing actors in front.
 * - A table's state matches its guest: sit-wait -> 'empty', sit-eat -> 'food', guest gone -> 'finished'.
 * - Waiters are told apart by the uniform (burgundy vest, white apron, bow tie); keep guests out of it.
 *
 * ===========================================================================
 * EXAMPLE: a canvas with a station, the pass and a waiter walking
 * ===========================================================================
 *
 *   import { Canvas } from '@shopify/react-native-skia';
 *   import { useSharedValue, withTiming } from 'react-native-reanimated';
 *   import { Character, Pass, Station, Wall, Floor, useSceneClock, type Pose } from '../sim/art';
 *
 *   function Kitchen({ visible }: { visible: boolean }) {
 *     const clock = useSceneClock(visible);      // one clock for the whole scene, paused off screen
 *     const x = useSharedValue(40);
 *     const facing = useSharedValue(1);
 *     const pose = useSharedValue<Pose>('walk');
 *     const rung = useSharedValue(0);
 *     const walkTo = (to: number) => {
 *       facing.value = to > x.value ? 1 : -1;
 *       pose.value = 'carry';                    // the legs walk while x moves
 *       x.value = withTiming(to, { duration: 1500 }, () => { pose.value = 'idle'; });
 *     };
 *     return (
 *       <Canvas style={{ width: 390, height: 300 }}>
 *         <Wall x={0} y={0} width={390} height={100} />
 *         <Floor x={0} y={100} width={390} height={200} />
 *         <Station kind="oven" x={60} y={116} working clock={clock} />
 *         <Pass x={190} y={170} width={260} dishes={0.5} rung={rung} clock={clock} />
 *         <Character look={{ kind: 'waiter' }} x={x} y={230} facing={facing} pose={pose} dish="pizza" clock={clock} />
 *       </Canvas>
 *     );
 *   }
 *
 * The review screens are `?view=art` (characters) and `?view=props` (props, mock restaurant) in the web build.
 */
export { Character, ROLE_POSES, useCharacterArt, type Anim, type CharacterProps, type Readable } from './Character';
export { ArtIcon, artIconImage, type ArtIconProps } from './ArtIcon';
export { ART_ICON_NAMES, artIconArt, isArtIconName, type ArtIconName } from './props';
export { BUST_CANVAS_MIN, CharacterBust, bustMatrix, type CharacterBustProps } from './CharacterBust';
export { LOOKS, LOOK_NAMES, WAITER_VEST, expandLook, lookFor, lookKey, randomLook, resolveLook, type LookInput, type LookName, type ResolvedLook } from './looks';
export { CHARACTER_HEIGHT, SEAT_HEIGHT, UNIT } from './rig';
export { getBustArt, releaseBustArt, retainBustArt, type BustMood } from './characterArt';
export { useSceneClock } from './clock';
export {
  BELL_RING_MS,
  CARD_NAMEPLATE,
  CARD_SHINE_EVERY_MS,
  CARD_SHINE_MS,
  CARD_SIZE,
  CARD_WINDOW,
  CHAIR_OFFSET,
  CHEST_RATTLE_MS,
  CHEST_SIZE,
  Card,
  CardBack,
  CardFrame,
  Chair,
  Chest,
  Coin,
  ContactShadow,
  DEFAULT_PALETTE,
  DOOR_CLOSE_MS,
  DOOR_HOLD_MS,
  DOOR_OPEN_MS,
  DOOR_SIZE,
  Dish,
  Door,
  FLOOR_TILE,
  Floor,
  FlyingDish,
  Gem,
  HAND_TAP_MS,
  HandPointer,
  MenuBoard,
  PASS_HEIGHT,
  Pass,
  SPARKLE_MS,
  STATION_ART_KINDS,
  STATION_SIZE,
  Shelf,
  SparkleBurst,
  Station,
  TABLE_SIZE,
  TABLE_TOP,
  Table,
  Tray,
  WALL_HEIGHT,
  Wall,
  makePalette,
  type CardBackProps,
  type CardFrameProps,
  type CardProps,
  type ChairProps,
  type ChestProps,
  type CoinProps,
  type ContactShadowProps,
  type DishProps,
  type DoorProps,
  type FloorProps,
  type FlyingDishProps,
  type GemProps,
  type HandPointerProps,
  type MenuBoardProps,
  type PassProps,
  type ShelfProps,
  type SparkleBurstProps,
  type StationArtKind,
  type StationProps,
  type TableProps,
  type TrayProps,
  type WallProps,
} from './props';
export {
  BEARDS,
  BODY_SHAPES,
  BROWS,
  CHARACTER_KINDS,
  CHEST_TIERS,
  DISH_KINDS,
  GLASSES,
  HAIR_STYLES,
  HATS,
  MOUSTACHES,
  NECKWEAR,
  OUTFIT_STYLES,
  PATTERNS,
  POSES,
  RARITIES,
  SPECIES,
  type ArtPalette,
  type CharacterKind,
  type CharacterLook,
  type ChestTier,
  type DishKind,
  type DishLook,
  type LookEntry,
  type Pose,
  type Rarity,
  type TableState,
} from './types';
