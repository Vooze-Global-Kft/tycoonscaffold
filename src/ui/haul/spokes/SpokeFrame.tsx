/**
 * The frame of every full-screen spoke (spec 4.4): a bulkhead header with the back key at top left,
 * the spoke's name and bay code in the terminal face, an optional readout at the right; the same
 * 16 pt gutter; the safe areas; a blueprint grid over deep space behind everything (one static
 * picture, recorded once per size and never freed). Registers with useOverlay so popups and hints
 * wait (a hint whose target is inside the spoke still shows: errata 53). The map stops animating
 * under a spoke (the world package reads useHaulUi's `spoke`).
 *
 * `onBack` null hides the back key (the Star Map while a confirmed Jump waits for its condition).
 * `footer` stays pinned under the scrolling body, above the bottom safe area (the Star Map's Jump
 * key, Decision 41: in view without scrolling at every size).
 */
import { Canvas, Picture, Skia, type SkPicture } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fx } from '../../../services/fx';
import { useOverlay } from '../../kit';
import { SPACE, alpha } from '../art/palette';
import { HAUL_STRINGS } from '../strings';
import { useHaulUi } from '../uiState';
import { INK, Mono } from './spokeKit';

/** check3 NEW[9]: on the web a drag that starts over spoke text must not select it (phones never select). */
const NO_SELECT = (Platform.OS === 'web' ? { userSelect: 'none' } : {}) as ViewStyle;

export const GUTTER = 16;

const backdrops = new Map<string, SkPicture>();

/** Deep space, a faint 24 pt blueprint grid and a lit horizon under the header. Never freed. */
function backdrop(w: number, h: number, top: number): SkPicture {
  const key = `${Math.round(w)}x${Math.round(h)}:${Math.round(top)}`;
  let p = backdrops.get(key);
  if (p) return p;
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(0, 0, w, h));
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(SPACE.bg));
  c.drawRect(Skia.XYWHRect(0, 0, w, h), paint);
  const grad = Skia.Paint();
  grad.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: 0, y: h }, [Skia.Color('#0B1430'), Skia.Color(SPACE.bg), Skia.Color('#070C1C')], [0, 0.55, 1], 0));
  c.drawRect(Skia.XYWHRect(0, 0, w, h), grad);
  const grid = Skia.Paint();
  grid.setColor(Skia.Color(alpha(SPACE.line, 0.05)));
  grid.setStrokeWidth(1);
  for (let x = 12; x < w; x += 24) c.drawLine(x, top, x, h, grid);
  for (let y = top + 12; y < h; y += 24) c.drawLine(0, y, w, y, grid);
  // A few cold stars, seeded so every spoke shares the same sky.
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const star = Skia.Paint();
  for (let i = 0; i < 70; i++) {
    star.setColor(Skia.Color(alpha(SPACE.white, 0.15 + rnd() * 0.45)));
    c.drawCircle(rnd() * w, rnd() * h, 0.5 + rnd() * 0.9, star);
  }
  const edge = Skia.Paint();
  edge.setColor(Skia.Color(alpha(SPACE.line, 0.35)));
  edge.setStrokeWidth(1);
  c.drawLine(0, top, w, top, edge);
  p = rec.finishRecordingAsPicture();
  backdrops.set(key, p);
  return p;
}

export function SpokeFrame({
  title,
  code,
  right,
  children,
  scroll = true,
  onBack,
  footer,
}: {
  title: string;
  code?: string;
  right?: ReactNode;
  children?: ReactNode;
  scroll?: boolean;
  onBack?: (() => void) | null;
  footer?: ReactNode;
}) {
  useOverlay(true);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const headerH = insets.top + 58;
  const pic = useMemo(() => backdrop(width, height, headerH), [width, height, headerH]);
  const back = onBack === undefined ? () => {
    fx.play('ui_close');
    useHaulUi.getState().closeSpoke();
  } : onBack;
  return (
    <View style={[StyleSheet.absoluteFill, styles.fill, NO_SELECT]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={pic} />
      </Canvas>
      <View style={[styles.header, { paddingTop: insets.top + 8, height: headerH }]}>
        {back ? (
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={HAUL_STRINGS.back} hitSlop={10} style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}>
            <View style={styles.chevron} />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.titles}>
          <Mono size={17} weight="700" lines={1} style={{ letterSpacing: 2 }}>
            {title}
          </Mono>
          {code ? (
            <Mono size={10} color={INK.lineDim} lines={1} style={{ letterSpacing: 1.6, marginTop: 1 }}>
              {code}
            </Mono>
          ) : null}
        </View>
        {right}
      </View>
      {scroll ? (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: footer ? 16 : insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, { paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: footer ? 10 : insets.bottom + 10 }]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: INK.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, gap: 12 },
  back: { width: 36, height: 36, borderWidth: 1, borderColor: INK.lineDim, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,19,38,0.9)' },
  backSpacer: { width: 0 },
  chevron: { width: 11, height: 11, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: INK.line, transform: [{ translateX: 2 }, { rotate: '45deg' }] },
  titles: { flex: 1 },
  body: { flex: 1 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 10, borderTopWidth: 1, borderTopColor: INK.edge, backgroundColor: 'rgba(6,10,23,0.94)' },
});
