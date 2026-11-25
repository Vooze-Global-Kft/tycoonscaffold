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
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CardData, Plate } from '../../../engine/salvage';
import { boardLayout, breakLines, fitPt, pt, TYPE } from './layout';
import { openCard } from './cardStack';
import { BuyButton, INK, Padlock, RefusalLine, useFrame, useRowNote, useSay, type Tab } from './parts';
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
  const stateSize = fitPt(state, lineSize, w - 8);
  const lh = (s: number) => Math.ceil(s * 1.15);
  const face = greyed ? styles.greyed : p.state === 'lit' || p.state === 'owned' ? styles.lit : p.state === 'buyable' ? styles.buyable : styles.locked;
  const ink = greyed || p.state === 'locked' ? INK.soft : p.state === 'buyable' ? INK.ink : INK.paper;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled: greyed }} accessibilityLabel={[name, say1(p.line)].filter(Boolean).join(', ')} onPress={onPress} disabled={greyed} style={[styles.plate, face, { width: w, height: h }, selected ? styles.selected : null]}>
      <Rivets />
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
      {/* A greyed or locked plate's padlock sits in its corner, so its lines still fit at font scale 1.3. */}
      {greyed || p.state === 'locked' ? (
        <View style={greyed ? styles.cornerLock : styles.topLock}>
          <Padlock size={greyed ? 11 : 9} colour={INK.soft} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** Four rivets in the plate's corners (enamel on steel). */
function Rivets() {
  return (
    <>
      {[styles.rTL, styles.rTR, styles.rBL, styles.rBR].map((s, i) => (
        <View key={i} style={[styles.rivet, s]} />
      ))}
    </>
  );
}

/** A riveted bar joining two plates. */
function Bar({ w }: { w: number }) {
  return (
    <View style={[styles.bar, { width: w }]}>
      <View style={styles.barRivet} />
      <View style={styles.barRivet} />
    </View>
  );
}

export function ProcessBoard({ data, tabs, onTab, onClose }: { data: CardData; tabs?: Tab[]; onTab?: (id: string) => void; onClose: () => void }) {
  const { layout } = useFrame();
  const b = boardLayout(layout.width);
  const board = data.processBoard;
  const [sel, setSel] = useState<string | null>(null);
  const plates = board?.rows.flatMap((r) => r.plates) ?? [];
  const picked = plates.find((p) => p.id === sel) ?? null;
  const note = useRowNote(picked?.id ?? '-');
  const joined = new Set((board?.bars ?? []).flatMap(([a, c]) => [`${a}|${c}`, `${c}|${a}`]));
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
        {board?.rows.map((r) => (
          <View key={r.id} style={[styles.row, { height: b.plateH, marginBottom: b.rowGap, gap: r.id === 'greyed' ? (b.plateW === 132 ? 10 : 4) : 0 }]}>
            {r.plates.map((p, i) => {
              const prev = r.plates[i - 1];
              const bar = r.id !== 'greyed' && prev && (joined.has(`${prev.id}|${p.id}`) || joined.has(`${r.plates[0].id}|${p.id}`));
              return (
                <View key={p.id} style={styles.cell}>
                  {bar ? <Bar w={b.barW} /> : i > 0 && r.id !== 'greyed' ? <View style={{ width: b.barW }} /> : null}
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
  rows: { paddingHorizontal: 14, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { flexDirection: 'row', alignItems: 'center' },
  plate: { borderRadius: 7, borderWidth: 1.3, borderColor: INK.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  plateBody: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  stateLine: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  lit: { backgroundColor: INK.machine },
  buyable: { backgroundColor: INK.enamel, borderStyle: 'solid' },
  locked: { backgroundColor: INK.shade, borderColor: INK.rule },
  greyed: { backgroundColor: INK.greyed, borderColor: INK.rule },
  selected: { borderColor: INK.hivis, borderWidth: 3 },
  cornerLock: { position: 'absolute', right: 9, bottom: 6 },
  topLock: { position: 'absolute', right: 3, top: 3 },
  rivet: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(43,46,51,0.35)' },
  rTL: { left: 4, top: 4 },
  rTR: { right: 4, top: 4 },
  rBL: { left: 4, bottom: 4 },
  rBR: { right: 4, bottom: 4 },
  bar: { height: 12, backgroundColor: INK.machine, borderTopWidth: 1, borderBottomWidth: 1, borderColor: INK.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  barRivet: { width: 4, height: 4, borderRadius: 2, backgroundColor: INK.paper },
  note: { position: 'absolute', left: 14, right: 14, bottom: 0 },
});
