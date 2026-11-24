/**
 * The loading card (spec 3.1, 4.6 with D12; `ModeEntry.Loading`): the Republic's emblem (the giant
 * ribbon-cutting scissors over a folded napkin on a beige field; no goose, D12) on a pale paper card
 * laid on the baize, and "The Republic of Middling. Proudly Adequate." in the art kit's drawn letters.
 *
 * - It needs no font file (the display font is not ready yet: the words are the kit's `drawLetters`,
 *   or a system-font Text in the plain fallback) and no atlas: the card is drawn straight from the kit
 *   (`drawBaize`, `drawLoadingCard`) into ONE picture, recorded once per window size, never animated.
 * - Behind it, the art kit's atlases are warmed one per turn of the JS loop (`decreeAtlas`, baked once
 *   for the app's life, never freed), so the desk's first frame bakes nothing; three ink dots under
 *   the card fill in as the save and the atlases come in. A bake that fails (or throws) counts as done:
 *   the screen never waits for it, and the app leaves this screen when the save and fonts are ready
 *   (src/ui/App.tsx), whatever the bakes did. So a failing bake can never hold the player here.
 * - If Skia cannot record at all, plain views stand in (baize, a pale card, the two lines as text),
 *   so the player is never left on a blank screen.
 * Owned by the hints and platform package (PLATFORM).
 */
import { Canvas, Picture, Skia, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useGame } from '../../../state/store';
import { decreeAtlas, type AtlasKind } from '../art/atlas';
import { drawBaize } from '../art/desk.draw';
import { drawLoadingCard } from '../art/emblem.draw';
import { DESK } from '../art/palette';
import { S } from '../strings';

/** The atlases warmed behind this card, in the order the desk needs them (props first: the trays, clips, icons; then the faces). */
const WARM: AtlasKind[] = ['props', 'faces'];
/** Steps of loading: the card, the save, each atlas. */
const STEPS = 2 + WARM.length;
/** The card's size: a sheet of paper, never wider than the screen allows. */
const CARD_MAX_W = 300;
const CARD_RATIO = 1.25;

/** Warmed once per app: a remount of this screen bakes nothing again. */
let warmed = 0;

function record(w: number, h: number, draw: (c: Parameters<typeof drawBaize>[0]) => void): SkPicture | null {
  try {
    const rec = Skia.PictureRecorder();
    const c = rec.beginRecording(Skia.XYWHRect(0, 0, w, h));
    draw(c);
    return rec.finishRecordingAsPicture();
  } catch {
    return null;
  }
}

/** How far loading has come, 1 to STEPS: the card (1), the save (+1), each atlas warmed (+1 each, failed ones too). */
function useLoadingSteps(): number {
  const hydrated = useGame((s) => s.hydrated);
  const [atlases, setAtlases] = useState(warmed);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One atlas per turn of the JS loop, after the first frame is on screen.
    const next = () => {
      if (!alive || warmed >= WARM.length) return;
      timer = setTimeout(() => {
        try {
          decreeAtlas(WARM[warmed]);
        } catch {
          // A failed bake counts as done: the desk bakes (or draws without) what it needs; this card never waits for it.
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

/** The card's rectangle in a window of w × h: centred, a little above the middle. */
function cardBox(w: number, h: number) {
  const cw = Math.min(CARD_MAX_W, w - 48);
  const ch = Math.min(Math.round(cw * CARD_RATIO), h - 120);
  return {
    x: Math.round((w - cw) / 2),
    y: Math.round((h - ch) / 2 - h * 0.04),
    w: cw,
    h: ch,
  };
}

export function DecreeLoading() {
  const { width, height } = useWindowDimensions();
  const steps = useLoadingSteps();
  const card = cardBox(width, height);
  const pic = useMemo(
    () =>
      record(width, height, (c) => {
        drawBaize(c, { x: 0, y: 0, w: width, h: height });
        c.save();
        c.translate(card.x, card.y);
        drawLoadingCard(c, card.w, card.h, S.platform.loading.country, S.platform.loading.motto);
        c.restore();
      }),
    // The card follows the window; nothing else changes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height],
  );
  const label = `${S.platform.loading.country} ${S.platform.loading.motto}`;
  if (!pic) return <PlainLoading steps={steps} />;
  return (
    <View style={styles.root} accessible accessibilityLabel={label}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={pic} />
      </Canvas>
      <Dots steps={steps} top={card.y + card.h + 22} />
    </View>
  );
}

/** Three ink dots under the card: one fills in per step after the first (no clock: they change only when a step completes). */
function Dots({ steps, top }: { steps: number; top: number }) {
  return (
    <View style={[styles.dots, { top }]} pointerEvents="none">
      {Array.from({ length: STEPS - 1 }, (_, i) => (
        <View key={i} style={[styles.dot, i < steps - 1 ? styles.dotOn : null]} />
      ))}
    </View>
  );
}

/** Plain views when Skia cannot draw: the same card in its simplest form. */
function PlainLoading({ steps }: { steps: number }) {
  return (
    <View style={[styles.root, styles.plain]}>
      <View style={styles.plainCard}>
        <Text allowFontScaling={false} style={styles.country}>
          {S.platform.loading.country}
        </Text>
        <View style={styles.rule} />
        <Text allowFontScaling={false} style={styles.motto}>
          {S.platform.loading.motto}
        </Text>
      </View>
      <View style={styles.plainDots}>
        <Dots steps={steps} top={0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DESK.baize },
  plain: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  plainCard: {
    backgroundColor: DESK.paper,
    borderRadius: 6,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    alignSelf: 'stretch',
    maxWidth: CARD_MAX_W,
  },
  country: {
    color: DESK.line,
    fontSize: 15,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  rule: {
    height: 1.2,
    width: '44%',
    backgroundColor: DESK.violet,
    marginVertical: 12,
  },
  motto: {
    color: DESK.violet,
    fontSize: 22,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  plainDots: { height: 24, alignSelf: 'stretch', marginTop: 20 },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.2,
    borderColor: DESK.paperShade,
  },
  dotOn: { backgroundColor: DESK.violetPale, borderColor: DESK.violetPale },
});
