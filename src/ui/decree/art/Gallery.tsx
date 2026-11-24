/**
 * Dev view `decree-art` (office-design.md 9.1): the contact sheet of the art kit in the web preview.
 * The mock desk at the window's phone size with its measured brick share (under 8 %) and the paper
 * it shows switchable, every section of the kit, the cast's busts at 44 pt through DecreeIcon (as
 * list rows get them), and a greyscale switch. The same pictures scripts/art/decree-sheets.ts writes
 * to PNG. Web preview only; the words here are review labels, never shown to a player.
 */
import { Canvas, Group, Picture, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { DecreeIcon } from './DecreeIcon';
import { CAST_IDS } from './faces';
import { gallerySections, sectionPicture } from './gallery.draw';
import { BRICK_MAX_SHARE, brickShare } from './measure';
import { drawDeskMock, type MockPaper } from './mock.draw';
import { DESK } from './palette';
import { grey, picture } from './pen';

const PAPERS: MockPaper[] = ['day', 'grievance', 'front', 'signing'];

function measureBrick(w: number, h: number, paper: MockPaper, office: 0 | 1 | 2): number | null {
  try {
    const surface = Skia.Surface.Make(w, h);
    if (!surface) return null;
    drawDeskMock(surface.getCanvas(), w, h, { paper, office });
    surface.flush();
    const img = surface.makeImageSnapshot();
    const px = img.readPixels(0, 0, { width: w, height: h, colorType: 4, alphaType: 3 });
    img.dispose();
    surface.dispose();
    return px ? brickShare(px as Uint8Array) : null;
  } catch {
    return null;
  }
}

export function DecreeArtGallery() {
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 720);
  const [greyscale, setGrey] = useState(false);
  const [paper, setPaper] = useState(0);
  const [office, setOffice] = useState<0 | 1 | 2>(0);
  const mockW = width > 380 ? 390 : 375;
  const mockH = height > 760 || width > 380 ? 844 : 667;
  const p = PAPERS[paper];
  // Recorded once per input, kept while mounted (pictures are never freed under a canvas).
  const mock = useMemo(() => picture({ x: 0, y: 0, w: mockW, h: mockH }, (c) => (greyscale ? grey(c, (q) => drawDeskMock(q, mockW, mockH, { paper: p, office })) : drawDeskMock(c, mockW, mockH, { paper: p, office }))), [mockW, mockH, greyscale, p, office]);
  const brick = useMemo(() => measureBrick(mockW, mockH, p, office), [mockW, mockH, p, office]);
  const sheets = useMemo(() => gallerySections().map((s) => ({ title: s.title, ...sectionPicture(s, w, { greyscale }) })), [w, greyscale]);
  const k = Math.min(1, width / mockW);
  return (
    <ScrollView style={styles.fill} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
      <Text style={styles.title}>High Office art kit</Text>
      <View style={styles.row}>
        <Pressable onPress={() => setGrey((g) => !g)} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>{greyscale ? 'Colour' : 'Greyscale'}</Text>
        </Pressable>
        <Pressable onPress={() => setPaper((i) => (i + 1) % PAPERS.length)} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>Paper: {p}</Text>
        </Pressable>
        <Pressable onPress={() => setOffice((o) => ((o + 1) % 3) as 0 | 1 | 2)} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>Desk: {['mayor', 'governor', 'president'][office]}</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>
        Brick share of the mock {mockW} x {mockH}: {brick === null ? 'not measured' : `${(brick * 100).toFixed(2)} % (limit ${BRICK_MAX_SHARE * 100} %)`}
      </Text>
      <View style={{ width: mockW * k, height: mockH * k }}>
        <Canvas style={{ width: mockW * k, height: mockH * k }}>
          <Group transform={[{ scale: k }]}>
            <Picture picture={mock} />
          </Group>
        </Canvas>
      </View>
      <Text style={styles.title}>The cast at 44 pt (DecreeIcon, as list rows get them)</Text>
      <View style={[styles.faces, { width: w }]}>
        {CAST_IDS.map((id) => (
          <DecreeIcon key={id} icon={`face:${id}`} size={44} style={greyscale ? styles.greyed : undefined} />
        ))}
      </View>
      {sheets.map((s) => (
        <Canvas key={s.title} style={{ width: w, height: s.height }}>
          <Picture picture={s.pic} />
        </Canvas>
      ))}
    </ScrollView>
  );
}

export default DecreeArtGallery;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: DESK.baizeDeep },
  title: { color: DESK.brassLight, fontSize: 14, fontWeight: '700', marginVertical: 10 },
  note: { color: DESK.paper, fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  button: { backgroundColor: DESK.walnut, borderColor: DESK.brass, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, margin: 4 },
  buttonText: { color: DESK.paperLight, fontSize: 13 },
  faces: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginBottom: 12 },
  greyed: { filter: [{ grayscale: 1 }] } as never,
});
