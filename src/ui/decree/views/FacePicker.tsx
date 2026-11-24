/**
 * The face picker (spec 3.1, 7.3): a full-screen view (useOverlay) on the first day: the emblem (the
 * ribbon scissors over a folded napkin, D12; no goose), the six faces with their names from the data
 * and "Pick for me"; no name field anywhere. A face picked, the opening caption of 3.1 (the writers'
 * first caption) in violet under the chosen portrait, and "To the desk".
 * Faces are the art kit's cached images (DecreeIcon "face:<id>"), never a canvas per face.
 */
import { Canvas, Group, Picture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { decreeActions, decreeNow } from '../../../modes/decree/actions';
import { useOverlay } from '../../kit/overlay';
import { DecreeIcon } from '../art/DecreeIcon';
import { drawEmblem } from '../art/emblem.draw';
import { picture } from '../art/pen';
import { useFontScale } from '../hud/fontScale';
import { S } from '../strings';
import { useDecreeUi } from '../uiState';
import { useDecreeCfg } from '../useDecree';
import { TOUCH, type, viewScale } from './metrics';
import { openingCaption, pickedForMe, playerFaces } from './model';
import { INK, ViewButton } from './parts';

export function FacePicker({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  useOverlay(visible);
  // Finding 10: Android back does not close the first-day face picker (ViewsHost would reopen it).
  useEffect(() => {
    if (!visible) return;
    useDecreeUi.getState().setViewBack(() => true);
    return () => useDecreeUi.getState().setViewBack(null);
  }, [visible]);
  if (!visible) return null;
  return <Picker onDone={onDone} />;
}

function Picker({ onDone }: { onDone: () => void }) {
  const cfg = useDecreeCfg();
  const { width } = useWindowDimensions();
  const fontScale = useFontScale();
  const insets = useSafeAreaInsets();
  const s = viewScale(fontScale);
  const [chosen, setChosen] = useState<string | null>(null);
  const faces = useMemo(() => (cfg ? playerFaces(cfg) : []), [cfg]);
  const emblem = useMemo(() => picture({ x: -56, y: -56, w: 112, h: 112 }, (c) => drawEmblem(c, 40)), []);
  if (!cfg) return null;
  const W = Math.min(width, 520);
  const pad = 16;
  const cols = 3;
  const cellW = Math.floor((W - pad * 2 - (cols - 1) * 8) / cols);
  const face = Math.min(88, cellW - 12);
  const tTitle = type(18, s);
  const tWhat = type(13, s);
  const tName = type(12, s);
  const tCaption = type(17, s);
  const pick = (id: string) => {
    if (chosen) return;
    if (decreeActions.pickFace(id)) setChosen(id);
  };
  const pickForMe = () => {
    const now = decreeNow();
    if (now) pick(pickedForMe(now.cfg, now.g));
  };
  const chosenFace = faces.find((f) => f.id === chosen) ?? null;
  const caption = openingCaption(cfg);
  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <ScrollView contentContainerStyle={[styles.column, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: pad, width: W, alignSelf: 'center' }]}>
        <View style={styles.emblem}>
          <Canvas style={{ width: 112, height: 116 }} pointerEvents="none">
            <Group transform={[{ translateX: 56 }, { translateY: 58 }]}>
              <Picture picture={emblem} />
            </Group>
          </Canvas>
        </View>
        {chosenFace ? (
          <View style={styles.after}>
            <View style={styles.portrait}>
              <DecreeIcon icon={chosenFace.icon} size={132} />
            </View>
            <Text allowFontScaling={false} style={[styles.name, tTitle, { textAlign: 'center' }]}>
              {chosenFace.name}
            </Text>
            {caption ? (
              <Text allowFontScaling={false} style={[styles.caption, tCaption]}>
                {caption}
              </Text>
            ) : null}
            <ViewButton label={S.views.toDesk} onPress={onDone} s={s} kind="primary" style={styles.wide} />
          </View>
        ) : (
          <>
            <Text allowFontScaling={false} style={[styles.title, tTitle]}>
              {S.views.faceTitle}
            </Text>
            <Text allowFontScaling={false} style={[styles.what, tWhat]}>
              {S.views.faceWhat}
            </Text>
            <View style={styles.grid}>
              {faces.map((f) => (
                <Pressable key={f.id} accessibilityRole="button" accessibilityLabel={S.views.faceLabel(f.name)} onPress={() => pick(f.id)} style={({ pressed }) => [styles.cell, { width: cellW, minHeight: Math.max(TOUCH, face + tName.lineHeight * 2 + 12), opacity: pressed ? 0.7 : 1 }]}>
                  <View style={[styles.photo, { width: face + 6, height: face + 6, borderRadius: (face + 6) / 2 }]}>
                    <DecreeIcon icon={f.icon} size={face} />
                  </View>
                  <Text allowFontScaling={false} numberOfLines={2} style={[styles.faceName, tName, { width: cellW - 4 }]}>
                    {f.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ViewButton label={S.views.pickForMe} onPress={pickForMe} s={s} style={styles.wide} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: INK.paper, zIndex: 50 },
  column: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  emblem: { marginBottom: 8 },
  title: { color: INK.violetDeep, fontWeight: '700', textAlign: 'center' },
  what: { color: INK.soft, textAlign: 'center', marginTop: 4, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 16 },
  cell: { alignItems: 'center', paddingVertical: 4 },
  photo: { backgroundColor: INK.paperLight, borderWidth: 1.5, borderColor: INK.brass, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  faceName: { color: INK.ink, textAlign: 'center', marginTop: 6 },
  after: { alignItems: 'center', width: '100%' },
  portrait: { padding: 6, backgroundColor: INK.paperLight, borderWidth: 2, borderColor: INK.brass, borderRadius: 8, marginBottom: 10 },
  name: { color: INK.violetDeep, fontWeight: '700', marginBottom: 14 },
  caption: { color: INK.violet, fontStyle: 'italic', textAlign: 'center', marginBottom: 22, paddingHorizontal: 6 },
  wide: { alignSelf: 'stretch' },
});
