/**
 * The process board (yard-stage1.md 2.5, 4.5; the wide card): four rows of enamel plates joined by
 * riveted bars. Plates are 132 × 60 at 844 and 120 × 60 at 667: a name of up to two lines of 12
 * characters (12 pt) and a state line (11 pt: "Owned · level 2", "§210", "Level 3 · §640", a padlock);
 * bars 24 pt (20 at 667). Row 4's five greyed plates are 108 pt (112 at 667), their name up to three
 * lines of 11 characters and no state line: a greyed plate names its material and nothing else.
 *
 * Touch: a plate with nothing to buy (the hand stripper, lit from the start) opens its machine's card at
 * once; a plate with something to buy (a machine, a recipe, a machine level) is selected and the title
 * row offers its button, with the price the plate shows, beside "Open" (its machine's card, before or
 * after buying). A greyed plate shows only its padlock.
 *
 * Drawing (the lead's ruling of 15:25): the plates, their rivets, glyphs, lamps and padlocks and the bars
 * are drawn live from the art kit (../art/ui.draw.ts `boardPlate`, `plateBar`) in ONE Skia canvas behind
 * the board (never a canvas per plate); the words and the touch targets are views on top of it.
 */
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CardData, Plate, ProcessBoardRows } from '../../../engine/salvage';
import { boardPlate, plateBar, plateGlyph } from '../art/ui.draw';
import { boardLayout, breakLines, fitPt, pt, TYPE } from './layout';
import { openCard } from './cardStack';
import { BuyButton, INK, RefusalLine, useFrame, useRowNote, useSay, type Tab } from './parts';
import { WideCard } from './WideCard';

function PlateView({ p, w, h, selected, onPress }: { p: Plate; w: number; h: number; selected: boolean; onPress: () => void }) {
  const { layout } = useFrame();
  const say1 = useSay();
  const greyed = p.state === 'greyed';
  const name = say1(p.name);
  const lines = greyed ? breakLines(name, 11, 3) : breakLines(name, 12, 2);
  const nameSize = pt(greyed ? TYPE.greyName : TYPE.plateName, layout.fs);
  const lineSize = pt(TYPE.plateLine, layout.fs);
  const state = say1(p.line);
  const stateSize = fitPt(state, lineSize, w - 16);
  const lh = (s: number) => Math.ceil(s * 1.15);
  const ink = greyed || p.state === 'locked' ? INK.soft : p.state === 'buyable' ? INK.ink : INK.paper;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled: greyed }} accessibilityLabel={[name, say1(p.line)].filter(Boolean).join(', ')} onPress={onPress} disabled={greyed} style={[styles.plate, { width: w, height: h }]}>
      <View style={styles.plateBody}>
        {lines.map((l, i) => (
          <Text key={i} allowFontScaling={false} numberOfLines={1} style={{ fontSize: nameSize, lineHeight: lh(nameSize), fontWeight: '800', color: ink, textAlign: 'center' }}>
            {l}
          </Text>
        ))}
        {!greyed && p.line ? (
          <View style={styles.stateLine}>
            <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: stateSize, lineHeight: lh(stateSize), fontWeight: '700', color: ink, flexShrink: 1 }}>
              {state}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Where each plate and bar of the board stands inside the rows' box (the same sums as the flex rows below). */
function boardBoxes(board: ProcessBoardRows | undefined, b: ReturnType<typeof boardLayout>, padX: number, padTop: number) {
  const plates: { p: Plate; x: number; y: number; w: number }[] = [];
  const bars: { x: number; y: number; w: number }[] = [];
  const joined = new Set((board?.bars ?? []).flatMap(([a, c]) => [`${a}|${c}`, `${c}|${a}`]));
  (board?.rows ?? []).forEach((r, ri) => {
    const y = padTop + ri * (b.plateH + b.rowGap);
    const greyed = r.id === 'greyed';
    const w = greyed ? b.greyW : b.plateW;
    const step = greyed ? w + greyGap(b) : w + b.barW;
    r.plates.forEach((p, i) => {
      const x = padX + i * step;
      plates.push({ p, x, y, w });
      const prev = r.plates[i - 1];
      if (!greyed && prev && (joined.has(`${prev.id}|${p.id}`) || joined.has(`${r.plates[0].id}|${p.id}`))) bars.push({ x: x - b.barW, y: y + b.plateH / 2 - 6, w: b.barW });
    });
  });
  return { plates, bars };
}

const greyGap = (b: ReturnType<typeof boardLayout>) => (b.plateW === 132 ? 10 : 4);
const PAD_X = 14;
const PAD_TOP = 8;

export function ProcessBoard({ data, tabs, onTab, onClose }: { data: CardData; tabs?: Tab[]; onTab?: (id: string) => void; onClose: () => void }) {
  const { layout } = useFrame();
  const b = boardLayout(layout.width);
  const board = data.processBoard;
  const [sel, setSel] = useState<string | null>(null);
  const plates = board?.rows.flatMap((r) => r.plates) ?? [];
  const picked = plates.find((p) => p.id === sel) ?? null;
  const note = useRowNote(picked?.id ?? '-');
  // The plates and bars, drawn once per change of the board (or the selection) into one picture.
  const boxes = useMemo(() => boardBoxes(board, b, PAD_X, PAD_TOP), [board, b.plateW, b.plateH, b.barW, b.greyW, b.rowGap]); // eslint-disable-line react-hooks/exhaustive-deps
  const pic = useMemo(() => {
    const rec = Skia.PictureRecorder();
    const c = rec.beginRecording(Skia.XYWHRect(0, 0, 1200, 400));
    for (const bar of boxes.bars) plateBar(c, bar.x, bar.y, bar.w);
    for (const q of boxes.plates) boardPlate(c, q.x, q.y, q.w, b.plateH, q.p.state, plateGlyph(q.p.id), q.p.id === sel);
    return rec.finishRecordingAsPicture();
  }, [boxes, b.plateH, sel]);
  const canvasW = Math.max(0, ...boxes.plates.map((q) => q.x + q.w + 4));
  const canvasH = PAD_TOP + 4 * (b.plateH + b.rowGap);
  // A plate without a button opens its card; one with a button is selected first (its button shows at the
  // row's end, with the plate's price), and a second tap on it opens its card.
  const onPlate = (p: Plate) => {
    if (p.state === 'greyed') return;
    if (!p.button || sel === p.id) {
      if (p.opens) openCard(p.opens);
      return;
    }
    setSel(p.id);
  };
  return (
    <WideCard title={data.title} onClose={onClose} tabs={tabs} onTab={onTab}>
      <View style={styles.rows}>
        <Canvas pointerEvents="none" style={[styles.canvas, { width: canvasW, height: canvasH }]}>
          <Picture picture={pic} />
        </Canvas>
        {board?.rows.map((r) => (
          <View key={r.id} style={[styles.row, { height: b.plateH, marginBottom: b.rowGap, gap: r.id === 'greyed' ? greyGap(b) : 0 }]}>
            {r.plates.map((p, i) => {
              return (
                <View key={p.id} style={styles.cell}>
                  {i > 0 && r.id !== 'greyed' ? <View style={{ width: b.barW }} /> : null}
                  <PlateView p={p} w={r.id === 'greyed' ? b.greyW : b.plateW} h={b.plateH} selected={p.id === sel} onPress={() => onPlate(p)} />
                </View>
              );
            })}
            {picked?.button && r.plates.some((p) => p.id === picked.id) ? (
              <View style={styles.actions}>
                <BuyButton button={picked.button} row={picked.id} />
              </View>
            ) : null}
          </View>
        ))}
      </View>
      {note ? (
        <View style={styles.note}>
          <RefusalLine t={note} />
        </View>
      ) : null}
    </WideCard>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  rows: { paddingHorizontal: PAD_X, paddingTop: PAD_TOP },
  canvas: { position: 'absolute', left: 0, top: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { flexDirection: 'row', alignItems: 'center' },
  plate: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  plateBody: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingTop: 4 },
  stateLine: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  note: { position: 'absolute', left: 14, right: 14, bottom: 0 },
});
