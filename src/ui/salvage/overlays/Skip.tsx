/**
 * A partner load's card (yard-stage1.md 2.7, 4.3: the skip's label as a card): the skip seen from above
 * (the art kit's heaps.draw `drawSkipPlan` in one Skia canvas), "{partner} · full" or "trial load", the
 * net mass, EVERY thing on its label (the world plate prints three and "+ n more"), the price, and why it
 * cannot be hooked now ("Filling · full in {m} m {s} s", "Needs §{x} more for this load", "The tipping
 * floor needs room for {kg}", "Opens with the hook-lift truck"). Loads are honest (E3, E20): what the
 * card lists is what the weigh-in prints. Hooking is done in the world (stand still in the skip zone).
 * Data: `CardData.skip` (cardOf's skipLabel); the screen formats numbers and nothing else.
 */
import { StyleSheet, View } from 'react-native';
import type { Txt } from '../../../engine/salvage';
import { drawSkipPlan, type SkipPartner } from '../art/heaps.draw';
import { lineH, panelTextW } from './marketLayout';
import { planLoad, skipHead } from './marketLines';
import { Drawing, useSeenOnClose } from './marketParts';
import type { CardViewProps } from './OverlayHost';
import { Panel } from './Panel';
import { INK, Line, PadlockLine, useFrame } from './parts';
import { TYPE } from './layout';

export function Skip({ data, onClose }: CardViewProps) {
  const { layout } = useFrame();
  useSeenOnClose('skip');
  const s = data.skip;
  const title: Txt = s ? { key: 'title.skip', args: { partner: { name: s.partner } } } : data.title;
  if (!s) return <Panel title={title} onClose={onClose} lead={[{ key: 'away.nothing' }]} />;
  const w = Math.min(160, panelTextW(layout));
  const h = Math.round(w * 0.45) + 10;
  const filling = s.state === 'filling';
  return (
    <Panel title={title} onClose={onClose}>
      <View style={styles.top}>
        <Drawing w={w} h={h} deps={[s.partner, planLoad(s), s.slot]} draw={(c) => drawSkipPlan(c, (s.partner === 'partnerDemolition' ? 'partnerDemolition' : 'partnerFarm') as SkipPartner, planLoad(s), w / 2, h / 2, w - 12, 2 + s.slot)} />
        <View style={styles.topText}>
          <Line t={skipHead(s)} size="name" bold lines={2} />
          {filling ? null : <Line t={{ key: 'card.skipNet', args: { kg: { mass_g: s.net_g, step: 'bridge' } } }} size="name" />}
          <Line t={{ key: 'card.skipPrice', args: { x: { money: s.price } } }} size="title" bold />
        </View>
      </View>
      {s.refusal ? (
        <View style={styles.why}>
          <PadlockLine t={s.refusal} size="name" />
        </View>
      ) : s.state !== 'onTruck' && !filling ? (
        <View style={styles.why}>
          <Line t={{ key: 'card.skipReady' }} size="name" bold colour={INK.good} />
        </View>
      ) : null}
      {filling ? null : (
        <View>
          {s.things.map((t) => (
            <View key={t.obj} style={[styles.thing, { minHeight: lineH(TYPE.name, layout.fs) + 10 }]}>
              <Line t={{ key: 'card.skipLine', args: { thing: { thing: t.obj }, n: { n: t.n }, kg: { mass_g: t.g, step: 'lot' } } }} size="name" lines={2} />
            </View>
          ))}
        </View>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  topText: { flex: 1, minWidth: 0, gap: 2 },
  why: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  thing: { justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
});
