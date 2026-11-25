/**
 * The crucible's card (yard-stage1.md 2.5, 4.3; S11, E22): before buying, the machine card's Buy; after,
 * the recipe (and the other owned recipe to change to), Take from bays, the charge "{a} / {b} kg",
 * "Pours in {m} m {s} s" or "Ready to pour", the heel, "Level on the process board". A recipe change with
 * a heel in the pot first asks the confirming line ("Pour the heel as a short ingot?", OK / Not now),
 * then calls setRecipe with confirmHeel; the rules refuse a change during a heat ("Wait for the heat to pour").
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { CardButton, CardData, SalvageConfig, SalvageGame, Txt } from '../../../engine/salvage';
import { RECIPE_NAME, crucibleRows, machineRows, ownedRecipes } from './sample';
import { Panel } from './Panel';
import { INK, Line, LocalButton, RefusalLine, Row, pressButton, useFrame, useRowNote, useSay } from './parts';
import { BUY_H, BUY_W, rowHeight } from './layout';

function Toggle({ on, label, onPress }: { on: boolean; label: Txt; onPress: () => void }) {
  const say1 = useSay();
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={say1(label)} onPress={onPress} hitSlop={6} style={[styles.toggle, { width: BUY_W, height: BUY_H }, on ? styles.toggleOn : null]}>
      <View style={[styles.knob, on ? styles.knobOn : null]} />
    </Pressable>
  );
}

export function Crucible({ cfg, g, data, onClose }: { cfg: SalvageConfig; g: SalvageGame; data: CardData; onClose: () => void }) {
  const { layout } = useFrame();
  const m = data.machine!;
  const [ask, setAsk] = useState<string | null>(null);
  const note = useRowNote('recipe');
  const bayNote = useRowNote('fromBays');
  if (!m.owned || !m.crucible) {
    return (
      <Panel title={data.title} onClose={onClose} lead={data.lead} foot={data.foot}>
        {(data.rows.length ? data.rows : machineRows(cfg, g, m)).map((r) => (
          <Row key={r.id} row={r} />
        ))}
      </Panel>
    );
  }
  const c = m.crucible;
  const others = ownedRecipes(cfg, g).filter((r) => r !== c.recipe);
  const change = (recipe: string, confirmHeel: boolean): CardButton => ({ label: { key: RECIPE_NAME[recipe] ?? 'card.recipe' }, action: { act: 'setRecipe', recipe, confirmHeel }, refusal: null });
  const rows = data.rows.length ? data.rows : crucibleRows(cfg, g, data);
  const fromBays: CardButton = { label: { key: 'card.fromBays' }, action: { act: 'setFromBays', on: !c.fromBays }, refusal: null };
  const recipeRow = rows.find((r) => r.id === 'recipe');
  return (
    <Panel title={data.title} onClose={onClose} lead={data.lead} foot={data.foot}>
      {recipeRow ? (
        <View style={[styles.line, { minHeight: rowHeight(layout.fs) }]}>
          <View style={{ flex: 1 }}>
            <Line t={recipeRow.name} size="name" bold />
          </View>
          {others.map((r) => (
            <LocalButton key={r} label={change(r, false).label} onPress={() => (c.heel_g > 0 ? setAsk(r) : pressButton(change(r, false), 'recipe'))} />
          ))}
        </View>
      ) : null}
      {ask ? (
        <View style={styles.ask}>
          <Line t={{ key: 'card.heelAsk' }} size="name" bold lines={2} />
          <View style={styles.askButtons}>
            <LocalButton label={{ key: 'card.notNow' }} onPress={() => setAsk(null)} />
            <LocalButton
              label={{ key: 'ok' }}
              onPress={() => {
                setAsk(null);
                pressButton(change(ask, true), 'recipe');
              }}
            />
          </View>
        </View>
      ) : null}
      {note ? <RefusalLine t={note} /> : null}
      {rows
        .filter((r) => r.id !== 'recipe')
        .map((r) => (
          <Row key={r.id} row={r} />
        ))}
      <View style={[styles.line, { minHeight: rowHeight(layout.fs) }]}>
        <View style={{ flex: 1 }}>
          <Line t={{ key: 'card.fromBays' }} size="name" bold />
        </View>
        <Toggle on={c.fromBays} label={{ key: 'card.fromBays' }} onPress={() => pressButton(fromBays, 'fromBays')} />
      </View>
      {bayNote ? <RefusalLine t={bayNote} /> : null}
      <Row row={{ id: 'level', name: { key: 'card.levelOnBoard' }, line: null, button: { label: { key: 'title.processBoard' }, action: { act: 'open', card: { kind: 'processBoard' } }, refusal: null }, icon: null }} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  toggle: { borderRadius: BUY_H / 2, backgroundColor: INK.shade, borderWidth: 1.3, borderColor: INK.ink, justifyContent: 'center', paddingHorizontal: 4 },
  toggleOn: { backgroundColor: INK.good },
  knob: { width: 28, height: 28, borderRadius: 14, backgroundColor: INK.paper, borderWidth: 1.3, borderColor: INK.ink },
  knobOn: { alignSelf: 'flex-end' },
  ask: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  askButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
});
