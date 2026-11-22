/**
 * A head-and-shoulders portrait of a character, with its own small canvas:
 * the icon for lists, cards and story dialogue.
 *
 *   <CharacterBust look={{ preset: 'nonna' }} size={40} />
 *   <CharacterBust look={cast.marco} size={160} background="#FFE3B8" mood="happy" />
 *
 * The portrait is framed around whatever the look wears, so a tall toque or a
 * big head of hair always fits; the shoulders run off the bottom edge. With a
 * `background` it becomes a round badge: the shoulders are cut by the circle
 * while hair and hats may poke out over its top edge. It holds still except
 * for a blink every few seconds, so a screen full of them costs next to nothing.
 *
 * On phones each bust is a small Skia canvas. On web every canvas would hold a
 * WebGL context and browsers allow only a handful per page, so there the same
 * drawing is rendered once into an image instead.
 */
import { Canvas, Circle, ClipOp, Group, Picture, Skia, type SkCanvas, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, PixelRatio, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { Easing, cancelAnimation, useDerivedValue, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { BUST_BOTTOM, EYE_LINE, getBustArt, releaseBustArt, retainBustArt, type BustArt, type BustMood } from './characterArt';
import { hashString, rng, skColor, type Bounds } from './draw';
import { lookKey, resolveLook, type LookInput } from './looks';

export interface CharacterBustProps {
  /** Who to draw: a look entry from game.json (`preset` and overrides welcome), a built-in name, or nothing for the default customer. */
  look?: LookInput;
  /** Width and height in points. Made for 28 to 220. */
  size: number;
  /** Colour of a round backdrop. Leave out for a transparent background. */
  background?: string;
  /** 1 looks to the right (default), -1 to the left: turn the speaker towards the text. */
  facing?: 1 | -1;
  /** `calm` (default) smiles and blinks; `happy` laughs with eyes shut. */
  mood?: BustMood;
  /** Set false to stop the blinking (very long lists, reduced motion). */
  blink?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Outline weight in drawing units: small icons need a heavier line to survive, big portraits a finer one. */
export function bustOutline(size: number): number {
  return size < 36 ? 4.2 : size <= 150 ? 3.4 : 2.9;
}

/**
 * Where the portrait goes: the matrix that maps head units to canvas points.
 * The frame is the square that holds the hair and hat on top and the collar at the bottom.
 */
export function bustMatrix(b: Bounds, size: number, facing: number): number[] {
  const pad = 2;
  const top = Math.min(b.t, -27) - pad;
  const left = Math.min(b.l, -31) - pad;
  const right = Math.max(b.r, 31) + pad;
  const side = Math.max(BUST_BOTTOM - top, right - left);
  const k = size / side;
  // Centre on what is drawn, but never push the body far off the middle.
  const mid = Math.max(-6, Math.min(6, (left + right) / 2));
  return [k * facing, 0, size / 2 - mid * k * facing, 0, k, size - BUST_BOTTOM * k, 0, 0, 1];
}

/** The portrait matrix with the eyes squashed towards the eye line; `shut` runs from 0 (open) to 1. */
function eyeMatrix(base: number[], shut: number): number[] {
  'worklet';
  // The last sliver stays, so a closed eye is a short dark line rather than nothing.
  const open = 1 - 0.94 * shut;
  const m = base.slice();
  m[1] = base[1] * open;
  m[4] = base[4] * open;
  m[2] = base[2] + base[1] * EYE_LINE * (1 - open);
  m[5] = base[5] + base[4] * EYE_LINE * (1 - open);
  return m;
}

/** A square with a round bottom: lets hats rise over the top of the backdrop while the shoulders are cut by it. */
function badgeClip(size: number): SkPath {
  const b = Skia.PathBuilder.Make();
  b.moveTo(0, 0);
  b.lineTo(size, 0);
  b.lineTo(size, size / 2);
  b.arcToOval({ x: 0, y: 0, width: size, height: size }, 0, 180, false);
  b.close();
  const path = b.build();
  b.dispose();
  return path;
}

/** Portrait drawings for a look, kept alive while mounted. */
function useBustArt(look: LookInput, size: number, mood: BustMood): BustArt {
  const resolved = resolveLook(look);
  const key = lookKey(resolved);
  const ow = bustOutline(size);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const art = useMemo(() => getBustArt(resolved, ow, mood), [key, ow, mood]);
  useEffect(() => {
    retainBustArt(art);
    return () => releaseBustArt(art);
  }, [art]);
  return art;
}

/** Calls `blink` every few seconds, at times that differ from look to look. */
function useBlinkTimer(enabled: boolean, seed: number, blink: () => void) {
  const latest = useRef(blink);
  latest.current = blink;
  useEffect(() => {
    if (!enabled) return;
    const random = rng(seed);
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (wait: number) => {
      timer = setTimeout(() => {
        latest.current();
        // Mostly one blink every three to six seconds; now and then a quick second one.
        schedule(random() < 0.15 ? 330 : 2800 + random() * 3400);
      }, wait);
    };
    schedule(700 + random() * 3000);
    return () => clearTimeout(timer);
  }, [enabled, seed]);
}

// ---------------------------------------------------------------------------
// Phones: a canvas
// ---------------------------------------------------------------------------

export interface BustCanvasProps {
  art: BustArt;
  size: number;
  background?: string;
  facing?: number;
  /** 0 = eyes open, 1 = shut. */
  shut: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
}

/** The canvas of a bust with the blink driven from outside. `CharacterBust` is the one to use; this exists for previews and tests. */
export function BustCanvas({ art, size, background, facing = 1, shut, style }: BustCanvasProps) {
  const base = useMemo(() => bustMatrix(art.bounds, size, facing), [art, size, facing]);
  const eyes = useDerivedValue(() => eyeMatrix(base, shut.value), [base]);
  const clip = useMemo(() => (background ? badgeClip(size) : null), [background, size]);
  useEffect(
    () => () => {
      // Freed a little later: the canvas may still draw one more frame with it.
      if (clip) setTimeout(() => clip.dispose(), 1000);
    },
    [clip],
  );
  return (
    <View style={[{ width: size, height: size, pointerEvents: 'none' }, style]}>
      <Canvas style={{ width: size, height: size }}>
        {background ? <Circle cx={size / 2} cy={size / 2} r={size / 2} color={background} /> : null}
        <Group clip={clip ?? undefined}>
          <Picture picture={art.base} matrix={base} />
          {art.eyes ? <Picture picture={art.eyes} matrix={eyes} /> : null}
        </Group>
      </Canvas>
    </View>
  );
}

function NativeBust({ look, size, background, facing = 1, mood = 'calm', blink = true, style }: CharacterBustProps) {
  const art = useBustArt(look, size, mood);
  const shut = useSharedValue(0);
  useBlinkTimer(blink && art.eyes !== null, hashString(art.key), () => {
    shut.value = withSequence(withTiming(1, { duration: 70, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 120, easing: Easing.inOut(Easing.quad) }));
  });
  useEffect(
    () => () => {
      cancelAnimation(shut);
    },
    [shut],
  );
  return <BustCanvas art={art} size={size} background={background} facing={facing} shut={shut} style={style} />;
}

// ---------------------------------------------------------------------------
// Web: an image
// ---------------------------------------------------------------------------

function paintBust(c: SkCanvas, art: BustArt, size: number, background: string | undefined, facing: number, shut: number) {
  const base = bustMatrix(art.bounds, size, facing);
  c.save();
  if (background) {
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(skColor(background));
    c.drawCircle(size / 2, size / 2, size / 2, paint);
    paint.dispose();
    const clip = badgeClip(size);
    c.clipPath(clip, ClipOp.Intersect, true);
    clip.dispose();
  }
  c.save();
  c.concat(base);
  c.drawPicture(art.base);
  c.restore();
  if (art.eyes) {
    c.save();
    c.concat(eyeMatrix(base, shut));
    c.drawPicture(art.eyes);
    c.restore();
  }
  c.restore();
}

const images = new Map<string, string>();
const IMAGES_MAX = 400;

/** The bust as a PNG data URI, drawn on first use. */
function bustImage(art: BustArt, size: number, background: string | undefined, facing: number, shut: number): string {
  const density = Math.min(3, Math.max(1, PixelRatio.get()));
  const key = `${art.key}|${size}|${background ?? ''}|${facing}|${shut}|${density}`;
  const hit = images.get(key);
  if (hit !== undefined) {
    // Keep recently used images at the fresh end of the queue.
    images.delete(key);
    images.set(key, hit);
    return hit;
  }
  const px = Math.max(1, Math.ceil(size * density));
  let uri = '';
  const surface = Skia.Surface.Make(px, px);
  if (surface) {
    const c = surface.getCanvas();
    c.scale(px / size, px / size);
    paintBust(c, art, size, background, facing, shut);
    surface.flush();
    const snapshot = surface.makeImageSnapshot();
    uri = 'data:image/png;base64,' + snapshot.encodeToBase64();
    snapshot.dispose();
    surface.dispose();
  }
  images.set(key, uri);
  if (images.size > IMAGES_MAX) images.delete(images.keys().next().value as string);
  return uri;
}

export interface BustImageProps {
  art: BustArt;
  size: number;
  background?: string;
  facing?: number;
  /** 0 = eyes open, 1 = shut. */
  shut?: number;
  style?: StyleProp<ViewStyle>;
}

/** The bust as a plain image (the web path). `CharacterBust` is the one to use; this exists for previews and tests. */
export function BustImage({ art, size, background, facing = 1, shut = 0, style }: BustImageProps) {
  const open = useMemo(() => bustImage(art, size, background, facing, 0), [art, size, background, facing]);
  // The closed-eyes frame is drawn the first time it is needed and then stays mounted, so a blink never flashes.
  const [seenShut, setSeenShut] = useState(shut > 0);
  if (shut > 0 && !seenShut) setSeenShut(true);
  const closed = useMemo(() => (seenShut && art.eyes ? bustImage(art, size, background, facing, shut > 0 ? shut : 1) : null), [seenShut, art, size, background, facing, shut]);
  const box = { position: 'absolute', left: 0, top: 0, width: size, height: size } as const;
  return (
    <View style={[{ width: size, height: size, pointerEvents: 'none' }, style]}>
      <Image source={{ uri: open }} style={box} />
      {closed ? <Image source={{ uri: closed }} style={[box, { opacity: shut > 0 ? 1 : 0 }]} /> : null}
    </View>
  );
}

function WebBust({ look, size, background, facing = 1, mood = 'calm', blink = true, style }: CharacterBustProps) {
  const art = useBustArt(look, size, mood);
  const [shut, setShut] = useState(0);
  const reopen = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useBlinkTimer(blink && art.eyes !== null, hashString(art.key), () => {
    setShut(1);
    reopen.current = setTimeout(() => setShut(0), 120);
  });
  useEffect(() => () => clearTimeout(reopen.current), []);
  return <BustImage art={art} size={size} background={background} facing={facing} shut={shut} style={style} />;
}

export function CharacterBust(props: CharacterBustProps) {
  return Platform.OS === 'web' ? <WebBust {...props} /> : <NativeBust {...props} />;
}
