/**
 * The frame of every spoke (spec 4.4): a full-screen overlay registered with useOverlay (so hints,
 * popups and the firefly wait), opened only by a tap and closed by its own back button (and by
 * Android back, through uiState's closeTop). Behind it one static picture, recorded once per size
 * and title and never freed: the dusk sky from indigo to deep teal, a wire of lit lanterns, and the
 * spoke's name in paper-cut letters. The play canvas stops its clocks while a spoke is open (it
 * reads uiState's `spoke`). Package SPOKES (7b).
 */
import { Canvas, Picture, Skia, type SkPicture } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fx } from '../../../services/fx';
import { useOverlay } from '../../kit';
import { drawPaperName } from '../art/loading.draw';
import { NIGHT, alpha } from '../art/palette';
import { drawWire } from '../art/street.draw';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { C, GUTTER, T } from './kit';

/** On the web a drag over text must not select it (phones never select). */
const NO_SELECT = (Platform.OS === 'web' ? { userSelect: 'none' } : {}) as ViewStyle;

export const HEADER = 60;

const pictures = new Map<string, SkPicture>();

function backdrop(w: number, h: number, top: number, title: string): SkPicture {
  const key = `${Math.round(w)}x${Math.round(h)}:${Math.round(top)}:${title}`;
  const hit = pictures.get(key);
  if (hit) return hit;
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(0, 0, w, h));
  const sky = Skia.Paint();
  sky.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: 0, y: h }, [Skia.Color(NIGHT.indigoDeep), Skia.Color(NIGHT.indigo), Skia.Color(NIGHT.tealDeep)], [0, 0.45, 1], 0));
  c.drawRect(Skia.XYWHRect(0, 0, w, h), sky);
  // A few faint stars above the wire.
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const star = Skia.Paint();
  for (let i = 0; i < 26; i++) {
    star.setColor(Skia.Color(alpha(NIGHT.moon, 0.12 + rnd() * 0.3)));
    c.drawCircle(rnd() * w, rnd() * (top + HEADER - 6), 0.5 + rnd() * 0.8, star);
  }
  const titleY = top + 14;
  // Room for the back button on the left and a small paper button on the right (the Ladder Book's "Odds").
  drawPaperName(c, title.toUpperCase(), w / 2, titleY, 20, w - 2 * (GUTTER + 92));
  drawWire(c, -10, w + 10, top + HEADER - 6, Math.max(5, Math.round(w / 52)), Math.max(5, Math.round(w / 52)), 3);
  const edge = Skia.Paint();
  edge.setColor(Skia.Color(alpha(NIGHT.brass, 0.25)));
  edge.setStrokeWidth(1);
  c.drawLine(0, top + HEADER + 6, w, top + HEADER + 6, edge);
  const p = rec.finishRecordingAsPicture();
  pictures.set(key, p);
  return p;
}

/** Closes the open spoke with its paper slide. */
export function closeSpoke(): void {
  fx.play('ui_close');
  useMergeUi.getState().closeSpoke();
}

export function SpokeFrame({ title, right, children, footer, scroll = true }: { title: string; right?: ReactNode; children?: ReactNode; footer?: ReactNode; scroll?: boolean }) {
  useOverlay(true);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const pic = useMemo(() => backdrop(width, height, insets.top, title), [width, height, insets.top, title]);
  const headerH = insets.top + HEADER + 8;
  return (
    <View style={[StyleSheet.absoluteFill, styles.fill, NO_SELECT]}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Picture picture={pic} />
      </Canvas>
      <View style={[styles.header, { paddingTop: insets.top + 4, height: headerH }]}>
        <Pressable
          onPress={closeSpoke}
          onPressIn={() => useMergeUi.getState().touched()}
          accessibilityRole="button"
          accessibilityLabel={S.spokes.back}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
        >
          <View style={styles.chevron} />
        </Pressable>
        <View style={styles.spacer} />
        <View style={styles.right}>{right}</View>
      </View>
      {scroll ? (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: footer ? 16 : insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, { paddingHorizontal: GUTTER }]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>{footer}</View> : null}
    </View>
  );
}

/** A line of small text under the title (counts), centred. */
export function Subtitle({ children }: { children: string }) {
  return (
    <T size={13} color={C.dim} align="center" lines={1} style={{ marginBottom: 4 }}>
      {children}
    </T>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: NIGHT.indigo },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: GUTTER - 4 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(NIGHT.indigoLift, 0.92), borderWidth: 1, borderColor: alpha(NIGHT.brass, 0.6) },
  chevron: { width: 12, height: 12, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: NIGHT.paperLight, transform: [{ translateX: 2 }, { rotate: '45deg' }] },
  spacer: { flex: 1 },
  right: { minWidth: 44, alignItems: 'flex-end' },
  body: { flex: 1 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: alpha(NIGHT.brass, 0.4), backgroundColor: alpha(NIGHT.indigoDeep, 0.95) },
});
