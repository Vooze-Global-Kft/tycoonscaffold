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
import { useCards } from './cardStack';
import { RECIPE_NAME, crucibleRows, machineRows, ownedRecipes } from './sample';
import { Panel } from './Panel';
import { INK, Line, LocalButton, Row, pressButton, useFrame, useSay } from './parts';
import { BUY_H, BUY_W } from './layout';

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
  const note = useCards((s) => (s.note && s.note.row === 'recipe' ? s.note.txt : null));
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
  return (
    <Panel title={data.title} onClose={onClose} lead={data.lead} foot={data.foot}>
      {rows.map((r) => (
        <Row key={r.id} row={r} />
      ))}
      <View style={[styles.line, { minHeight: 44 * Math.min(layout.fs, 1.3) }]}>
        <View style={{ flex: 1 }}>
          <Line t={{ key: 'card.fromBays' }} size="name" bold />
        </View>
        <Toggle on={c.fromBays} label={{ key: 'card.fromBays' }} onPress={() => pressButton(fromBays, 'fromBays')} />
      </View>
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
      {note ? <Line t={note} size="line" bold colour={INK.refuse} lines={2} /> : null}
      <RecipeSwitch others={others} heel={c.heel_g > 0} onAsk={setAsk} change={change} />
      <Row row={{ id: 'level', name: { key: 'card.levelOnBoard' }, line: null, button: { label: { key: 'title.processBoard' }, action: { act: 'open', card: { kind: 'processBoard' } }, refusal: null }, icon: null }} />
    </Panel>
  );
}

/** The buttons that change the recipe: with a heel in the pot they ask first (the confirming line). */
function RecipeSwitch({ others, heel, onAsk, change }: { others: string[]; heel: boolean; onAsk: (r: string | null) => void; change: (r: string, confirm: boolean) => CardButton }) {
  if (!others.length) return null;
  return (
    <View style={styles.line}>
      <View style={{ flex: 1 }}>
        <Line t={{ key: 'card.recipe', args: { recipe: { text: 'card.empty' } } }} size="line" colour={INK.soft} />
      </View>
      {others.map((r) => (
        <LocalButton key={r} label={change(r, false).label} onPress={() => (heel ? onAsk(r) : pressButton(change(r, false), 'recipe'))} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  toggle: { borderRadius: BUY_H / 2, backgroundColor: INK.shade, borderWidth: 1.3, borderColor: INK.ink, justifyContent: 'center', paddingHorizontal: 4 },
  toggleOn: { backgroundColor: INK.good },
  knob: { width: 28, height: 28, borderRadius: 14, backgroundColor: INK.paper, borderWidth: 1.3, borderColor: INK.ink },
  knobOn: { alignSelf: 'flex-end' },
  ask: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  askButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
});
