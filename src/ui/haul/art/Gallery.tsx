/**
 * Dev view: every piece and variant of the art kit on the game's dark background, with labels
 * (the same sheets scripts/art/haul-sheets.ts writes to PNG), plus the animated hint reticle.
 * Mounted by the mode entry as a dev view; never shown on phones.
 */
import { Canvas, Group, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { sectionPicture } from './gallery.draw';
import { gallerySections } from './gallery.sections';
import { drawFieldMock } from './mock.draw';
import { SPACE } from './palette';
import { picture } from './pen';
import { Reticle } from './Reticle';

export function Gallery() {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 640);
  // Recorded once per width and kept while mounted (pictures are never freed under a canvas).
  const sheets = useMemo(() => gallerySections().map((s) => ({ title: s.title, ...sectionPicture(s, w) })), [w]);
  const mock = useMemo(() => picture({ x: 0, y: 0, w: 390, h: 844 }, (c) => drawFieldMock(c, 390, 844)), []);
  return (
    <ScrollView style={styles.fill} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
      <Text style={styles.title}>Orbit Haulers art kit</Text>
      {sheets.map((s) => (
        <Canvas key={s.title} style={{ width: w, height: s.height }}>
          <Picture picture={s.pic} />
        </Canvas>
      ))}
      <Text style={styles.title}>Hint reticle (live)</Text>
      <View style={{ width: w, height: 200 }}>
        <Canvas style={{ width: w, height: 200 }}>
          <Reticle hint={{ kind: 'point', from: { x: w * 0.15, y: 100 } }} />
          <Reticle hint={{ kind: 'drag', from: { x: w * 0.3, y: 160 }, to: { x: w * 0.6, y: 50 } }} />
          <Reticle hint={{ kind: 'swipe', from: { x: w * 0.85, y: 170 } }} />
        </Canvas>
      </View>
      <Text style={styles.title}>Main screen mock 390 x 844</Text>
      <Canvas style={{ width: 390 * (w / 390), height: 844 * (w / 390) }}>
        <Group transform={[{ scale: w / 390 }]}>
          <Picture picture={mock} />
        </Group>
      </Canvas>
    </ScrollView>
  );
}

export default Gallery;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: SPACE.bg },
  title: { color: SPACE.line, fontSize: 14, fontWeight: '700', marginVertical: 10 },
});
