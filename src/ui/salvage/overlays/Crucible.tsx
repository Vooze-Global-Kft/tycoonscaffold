/**
 * The crucible's card (yard-stage1.md 2.5, 4.3; S11, E22). Before buying, the machine card's Buy. After:
 * the section titled "Crucible" with its state and in → out (L14), the recipes (each row names the recipe
 * and its state; the button is the action, "Use": W18), Take from bays (the row says On or Off; the
 * button says what pressing does, "Start" or "Stop": W18), the charge "{a} / {b} kg" with "Pours in ..." or
 * "Ready to pour", the heel, the hopper and the tray, and "Level on the process board" (Open). A recipe
 * change with a heel in the pot first asks the confirming line ("Pour the heel as a short ingot?", OK /
 * Not now), then calls setRecipe with confirmHeel; the rules refuse a change during a heat. Every row and
 * every action is the rules' (cardOf); this view orders them and words the buttons as verbs.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CardButton, CardData, CardRow, SalvageConfig, SalvageGame } from '../../../engine/salvage';
import { crucibleRows, machineRows } from './sample';
import { crucibleOrder, crucibleVerbs, machineSections } from './machineView';
import { Panel } from './Panel';
import { INK, Line, LocalButton, RefusalLine, Row, pressButton, useFrame, useRowNote } from './parts';
import { rowHeight } from './layout';
import { isPadlockRow } from './ToolRack';

/** A recipe row: its name and state, and Use (which asks first when a heel would be poured). */
function RecipeRow({ row, heel, onAsk }: { row: CardRow; heel: boolean; onAsk: (b: CardButton) => void }) {
  const { layout } = useFrame();
  const note = useRowNote(row.id);
  const b = row.button;
  if (!b || b.action.act !== 'setRecipe') return <Row row={row} padlock={isPadlockRow(row)} />;
  return (
    <View style={styles.wrap}>
      <View style={[styles.line, { minHeight: rowHeight(layout.fs) }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Line t={row.name} size="name" bold lines={2} />
          {row.line ? <Line t={row.line} size="line" colour={INK.soft} lines={2} /> : null}
        </View>
        <LocalButton label={b.label} onPress={() => (heel ? onAsk(b) : pressButton(b, row.id))} />
      </View>
      {note ? <RefusalLine t={note} /> : null}
    </View>
  );
}

export function Crucible({ cfg, g, data, onClose }: { cfg: SalvageConfig; g: SalvageGame; data: CardData; onClose: () => void }) {
  const m = data.machine!;
  const [ask, setAsk] = useState<{ b: CardButton; row: string } | null>(null);
  const raw = data.rows.length ? data.rows : m.owned && m.crucible ? crucibleRows(cfg, g, data) : machineRows(cfg, g, m);
  const [s] = machineSections([m], raw);
  const heel = (m.crucible?.heel_g ?? 0) > 0;
  const rows = crucibleOrder(s.rows).map(crucibleVerbs);
  return (
    <Panel title={data.title} onClose={onClose} lead={data.lead} foot={data.foot}>
      {s.head ? <Row row={s.head} /> : null}
      {rows.map((r) =>
        r.button?.action.act === 'setRecipe' ? (
          <View key={r.id}>
            <RecipeRow row={r} heel={heel} onAsk={(b) => setAsk({ b, row: r.id })} />
            {ask && ask.row === r.id ? (
              <View style={styles.ask}>
                <Line t={{ key: 'card.heelAsk' }} size="name" bold lines={2} />
                <View style={styles.askButtons}>
                  <LocalButton label={{ key: 'card.notNow' }} onPress={() => setAsk(null)} />
                  <LocalButton
                    label={{ key: 'ok' }}
                    onPress={() => {
                      const b = ask.b;
                      setAsk(null);
                      if (b.action.act === 'setRecipe') pressButton({ ...b, action: { ...b.action, confirmHeel: true } }, r.id);
                    }}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <Row key={r.id} row={r} padlock={isPadlockRow(r)} />
        ),
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  ask: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  askButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
});
