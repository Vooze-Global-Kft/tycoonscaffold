/**
 * The loading screen (spec 4.6, `ModeEntry.Loading`): the street at dusk, the wire's lanterns
 * lighting one by one as loading proceeds, the name (game.json `app.displayName`) in the art kit's
 * paper-cut letters (no font file: it shows before the display font is ready).
 *
 * - The static part (`drawLoadingBackdrop`) and the two lantern looks are recorded once into
 *   pictures; per frame only the next lantern's flicker changes (its opacity, one clock at 30
 *   frames a second, stopped once every lantern is lit). README "Per frame".
 * - Loading proceeds in steps: the screen is up, the save is read (`hydrated`), then each of the
 *   art kit's atlases is warmed (`mergeAtlas`, baked once for the app's life, so the board's first
 *   frame bakes nothing). A step that fails counts as done: the screen never waits for it, and the
 *   app leaves this screen when the save and fonts are ready (src/ui/App.tsx), whatever the bakes.
 * - If Skia cannot record at all, plain views stand in (an indigo ground, a row of amber lanterns,
 *   the name as text), so the player is never left on a blank screen.
 * Owned by the hints and platform package (docs/design/market-build-plan.md).
 */
import { Canvas, Group, Picture, Skia, useClock, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { PixelRatio, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { useGame } from '../../../state/store';
import { mergeAtlas, type AtlasKind } from '../art/atlas';
import { drawLantern } from '../art/lantern.draw';
import { drawLoadingBackdrop, LOADING_LANTERNS, loadingLanterns } from '../art/loading.draw';
import { NIGHT } from '../art/palette';
import { S } from '../strings';

/** The atlases warmed behind this screen, in the order the board needs them. The stall fronts at the device's density (art README "Sampling"). */
const WARM: { kind: AtlasKind; density?: () => number }[] = [{ kind: 'items' }, { kind: 'fx' }, { kind: 'animals' }, { kind: 'stalls', density: () => PixelRatio.get() }];
/** Steps of loading: the screen, the save, each atlas. */
const STEPS = 2 + WARM.length;
/** A lantern lights at most this often (one by one, never all at once). */
const LIGHT_MS = 240;
/** The lantern picture's radius (the wire's lanterns are drawn at r/12 of it). */
const LANTERN_R = 12;

/** Warmed once per app: a remount of this screen bakes nothing again. */
let warmed = 0;

function record(x: number, y: number, w: number, h: number, draw: (c: SkCanvas) => void): SkPicture | null {
  try {
    const rec = Skia.PictureRecorder();
    const c = rec.beginRecording(Skia.XYWHRect(x, y, w, h));
    draw(c);
    return rec.finishRecordingAsPicture();
  } catch {
    return null;
  }
}

let lanternPics: { lit: SkPicture; unlit: SkPicture } | null | undefined;
function lanterns(): { lit: SkPicture; unlit: SkPicture } | null {
  if (lanternPics !== undefined) return lanternPics;
  const box = LANTERN_R * 4;
  const lit = record(-box, -box, 2 * box, 2 * box, (c) => drawLantern(c, LANTERN_R, { look: 'lit', cord: LANTERN_R * 0.6 }));
  const unlit = record(-box, -box, 2 * box, 2 * box, (c) => drawLantern(c, LANTERN_R, { look: 'unlit', cord: LANTERN_R * 0.6 }));
  lanternPics = lit && unlit ? { lit, unlit } : null;
  return lanternPics;
}

/** How far loading has come, 0 to STEPS: the screen (1), the save (+1), each atlas warmed (+1 each, failed ones too). */
function useLoadingSteps(): number {
  const hydrated = useGame((s) => s.hydrated);
  const [atlases, setAtlases] = useState(warmed);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One atlas per turn of the JS loop, after the first frame is on screen, so the lanterns can show between bakes.
    const next = () => {
      if (!alive || warmed >= WARM.length) return;
      timer = setTimeout(() => {
        const w = WARM[warmed];
        try {
          mergeAtlas(w.kind, w.density?.());
        } catch {
          // A failed bake counts as done: the board bakes (or draws without) what it needs; this screen never waits for it.
        }
        warmed++;
        if (alive) setAtlases(warmed);
        next();
      }, 60);
    };
    next();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);
  return 1 + (hydrated ? 1 : 0) + atlases;
}

/** The lanterns lit on screen: they follow the steps one at a time (LIGHT_MS apart), never jumping. */
function useLitCount(steps: number): number {
  const target = Math.min(LOADING_LANTERNS, Math.round((steps / STEPS) * LOADING_LANTERNS));
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (lit >= target) return;
    const t = setTimeout(() => setLit((n) => Math.min(target, n + 1)), LIGHT_MS);
    return () => clearTimeout(t);
  }, [lit, target]);
  return lit;
}

export function MergeLoading() {
  const name = useGame((s) => s.cfg.app.displayName);
  const { width, height } = useWindowDimensions();
  const steps = useLoadingSteps();
  const lit = useLitCount(steps);
  const backdrop = useMemo(() => record(0, 0, width, height, (c) => drawLoadingBackdrop(c, width, height, name)), [width, height, name]);
  const pics = lanterns();
  const spots = useMemo(() => loadingLanterns(width, height), [width, height]);
  const nameSize = Math.min(54, width / 7);
  const subTop = height * 0.36 + nameSize * 1.35 + 14;

  if (!backdrop || !pics) return <PlainLoading name={name} lit={lit} />;
  return (
    <View style={styles.root} accessible accessibilityLabel={name}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={backdrop} />
        {spots.map((l, i) => (
          <Group key={i} transform={[{ translateX: l.x }, { translateY: l.y }, { scale: l.r / LANTERN_R }]}>
            <Picture picture={i < lit ? pics.lit : pics.unlit} />
          </Group>
        ))}
        {lit < spots.length ? <Flicker at={spots[lit]} pic={pics.lit} /> : null}
      </Canvas>
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.sub, { top: subTop }]}>
        {S.hints.loading}
      </Text>
    </View>
  );
}

/** The next lantern catching: the lit look fading in and out over the unlit one (one clock, 30 frames a second). */
function Flicker({ at, pic }: { at: { x: number; y: number; r: number }; pic: SkPicture }) {
  const clock = useClock();
  const opacity = useDerivedValue(() => {
    const t = Math.floor(clock.value / 33) * 33;
    return 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t / 110)) * (0.6 + 0.4 * Math.sin(t / 47));
  });
  return (
    <Group transform={[{ translateX: at.x }, { translateY: at.y }, { scale: at.r / LANTERN_R }]} opacity={opacity}>
      <Picture picture={pic} />
    </Group>
  );
}

/** Plain views when Skia cannot draw: the same screen in its simplest form. */
function PlainLoading({ name, lit }: { name: string; lit: number }) {
  return (
    <View style={[styles.root, styles.plain]}>
      <View style={styles.wire}>
        {Array.from({ length: LOADING_LANTERNS }, (_, i) => (
          <View key={i} style={[styles.lantern, { opacity: i < lit ? 1 : 0.3 }]} />
        ))}
      </View>
      <Text style={styles.name} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>
        {name}
      </Text>
      <Text style={styles.subPlain} allowFontScaling={false}>
        {S.hints.loading}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NIGHT.indigo },
  plain: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  sub: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: NIGHT.brass, fontSize: 13, letterSpacing: 1 },
  wire: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  lantern: { width: 14, height: 18, borderRadius: 7, backgroundColor: NIGHT.amber },
  name: { color: NIGHT.paperLight, fontSize: 30, letterSpacing: 2 },
  subPlain: { color: NIGHT.brass, fontSize: 13, marginTop: 8 },
});
