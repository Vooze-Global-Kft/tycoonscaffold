/**
 * The bottom row (spec 4.1): the in-tray (a tap shows the next 3 faces) and Ledger, Cabinet, Poll,
 * Office. PLACEHOLDER now: labelled boxes at their final rectangles that open their sheet or view in
 * uiState (the sheets themselves mount in overlays/Overlays.tsx when they exist).
 * Keeps its name and props. Written by the skeleton; owned by P7 (docs/design/office-build-plan.md).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DeskLayout, Rect } from '../layout';
import { at, PH } from '../placeholder';
import { S } from '../strings';
import { useDecreeUi } from '../uiState';

function Button({ rect, label, onPress, s }: { rect: Rect; label: string; onPress: () => void; s: number }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[at(rect), styles.button]}>
      <Text allowFontScaling={false} style={[styles.text, { fontSize: 11 * s }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BottomRow({ layout }: { layout: DeskLayout }) {
  const b = layout.buttons;
  // Relative to the row, 6 pt in from its top and bottom edges.
  const y = (r: Rect): Rect => ({ ...r, y: 6, h: r.h - 12 });
  const ui = useDecreeUi.getState;
  return (
    <View style={[at(layout.bottomRow), styles.row]}>
      <Button rect={y(b.inTray)} label={S.hud.inTray} s={layout.s} onPress={() => ui().openPeek()} />
      <Button rect={y(b.ledger)} label={S.hud.ledger} s={layout.s} onPress={() => ui().openSheet({ type: 'ledger' })} />
      <Button rect={y(b.cabinet)} label={S.hud.cabinet} s={layout.s} onPress={() => ui().openSheet({ type: 'cabinet' })} />
      <Button rect={y(b.poll)} label={S.hud.poll} s={layout.s} onPress={() => ui().openSheet({ type: 'poll' })} />
      <Button rect={y(b.office)} label={S.hud.office} s={layout.s} onPress={() => ui().openView('office')} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: PH.walnut },
  button: { justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: PH.brass, borderRadius: 6 },
  text: { color: PH.paper },
});
