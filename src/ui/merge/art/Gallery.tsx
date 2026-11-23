/**
 * Dev view `merge-art` (spec 9.1, 10.1 item 11): the contact sheet of the art kit in the web preview.
 * Each chain's eight tiers on the real board at 47 and 51 pt cells, every section of the kit, the
 * mock main screen at the phone's width with its measured red share (under 10 %), and a greyscale
 * switch. The same pictures scripts/art/merge-sheets.ts writes to PNG. Web preview only (mounted by
 * src/modes/merge/devViews.web.ts); the words here are review labels, never shown to a player.
 */
import { Canvas, Group, Picture, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { drawGoodsBoard, gallerySections, sectionPicture } from './gallery.draw';
import { redShare } from './measure';
import { drawMainMock } from './mock.draw';
import { NIGHT } from './palette';
import { grey, picture } from './pen';

function measureRed(w: number, h: number): number | null {
  try {
    const surface = Skia.Surface.Make(w, h);
    if (!surface) return null;
    const c = surface.getCanvas();
    drawMainMock(c, w, h);
    surface.flush();
    const img = surface.makeImageSnapshot();
    const px = img.readPixels(0, 0, { width: w, height: h, colorType: 4, alphaType: 3 });
    img.dispose();
    surface.dispose();
    return px ? redShare(px as Uint8Array) : null;
  } catch {
    return null;
  }
}

export function MergeArtGallery() {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 720);
  const [greyscale, setGrey] = useState(false);
  // Recorded once per width and switch, kept while mounted (pictures are never freed under a canvas).
  const boards = useMemo(
    () =>
      [47, 51].map((cell) => {
        let size = { w: 0, h: 0 };
        const pic = picture({ x: 0, y: 0, w: 1000, h: 1000 }, (c) => {
          size = drawGoodsBoard(c, cell, { greyscale });
        });
        return { cell, pic, ...size };
      }),
    [greyscale],
  );
  const sheets = useMemo(() => gallerySections().map((s) => ({ title: s.title, ...sectionPicture(s, w, { greyscale }) })), [w, greyscale]);
  const mockW = width > 380 ? 390 : 375;
  const mockH = width > 380 ? 844 : 667;
  const mock = useMemo(() => picture({ x: 0, y: 0, w: mockW, h: mockH }, (c) => (greyscale ? grey(c, (q) => drawMainMock(q, mockW, mockH)) : drawMainMock(c, mockW, mockH))), [mockW, mockH, greyscale]);
  const red = useMemo(() => measureRed(mockW, mockH), [mockW, mockH]);
  const k = w / mockW;
  return (
    <ScrollView style={styles.fill} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
      <Text style={styles.title}>Lantern Row art kit</Text>
      <Pressable onPress={() => setGrey((g) => !g)} style={styles.button} accessibilityRole="button">
        <Text style={styles.buttonText}>{greyscale ? 'Colour' : 'Greyscale'}</Text>
      </Pressable>
      <Text style={styles.note}>
        Red share of the mock screen {mockW} x {mockH}: {red === null ? 'not measured' : `${(red * 100).toFixed(2)} % (limit 10 %)`}
      </Text>
      {/* The boards at TRUE size (1 pt = 1 pt, as on the phone): scroll sideways for tiers 7 and 8. */}
      {boards.map((b) => (
        <ScrollView key={b.cell} horizontal style={{ width: Math.min(width, w + 40), flexGrow: 0 }} contentContainerStyle={{ width: b.w }}>
          <Canvas style={{ width: b.w, height: b.h }}>
            <Picture picture={b.pic} />
          </Canvas>
        </ScrollView>
      ))}
      {sheets.map((s) => (
        <Canvas key={s.title} style={{ width: w, height: s.height }}>
          <Picture picture={s.pic} />
        </Canvas>
      ))}
      <Text style={styles.title}>
        Mock screen {mockW} x {mockH}
      </Text>
      <View style={{ width: mockW * k, height: mockH * k }}>
        <Canvas style={{ width: mockW * k, height: mockH * k }}>
          <Group transform={[{ scale: k }]}>
            <Picture picture={mock} />
          </Group>
        </Canvas>
      </View>
    </ScrollView>
  );
}

export default MergeArtGallery;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: NIGHT.indigo },
  title: { color: NIGHT.amberSoft, fontSize: 14, fontWeight: '700', marginVertical: 10 },
  note: { color: NIGHT.paper, fontSize: 12, marginBottom: 8 },
  button: { backgroundColor: NIGHT.indigoLift, borderColor: NIGHT.brass, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 8 },
  buttonText: { color: NIGHT.paperLight, fontSize: 13 },
});
