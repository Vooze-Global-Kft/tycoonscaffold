/**
 * The Contract Board sheet (spec 4.5, errata 26, 60, 62): three buyer manifests side by side
 * (110 x 156 at 390 width, 104 x 148 at 375, gaps 12): emblem, buyer, each wanted ore with its fill
 * bar (hold units / wanted) and "12 Ice to go", the multiplier, launch pips, "+₵420 if met"
 * (src/engine/haul `contractGain`), ACTIVE on the selected one. Tap selects (nothing else ever
 * picks a contract for the player). Footer: "Scrap Pod every 4 contracts met (2/4)".
 * Card targets `contract:card<i>` (the second stage of the board hint, errata 53).
 */
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as H from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { useTarget } from '../../hints/targets';
import { alpha } from '../../theme';
import { HaulIcon } from '../art/HaulIcon';
import { useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import { buyerName, money, oreColorOf, oreName, portraitOf } from './format';
import { HaulSheet, Line, MONO, Meter, useColors, useLast, useType } from './parts';
import { say } from './shellText';

interface Want {
  ore: string;
  name: string;
  color: string;
  fill: number;
  text: string;
}
interface CardView {
  buyer: string;
  emblem: string;
  wants: Want[];
  mult: string;
  left: number;
  lifetime: number;
  gain: string;
  active: boolean;
  ready: boolean;
}
interface BoardView {
  unlocked: boolean;
  unlockAt: number;
  cards: CardView[];
  footer: string;
}

function boardView(cfg: H.HaulConfig, g: H.HaulGame & { haul: H.HaulState }): BoardView {
  const h = g.haul;
  const p = H.haulParams(cfg, g);
  const C = cfg.haul.contracts;
  const every = cfg.haul.pods.contractsEvery;
  const podName = cfg.meta.chests.find((x) => x.id === cfg.haul.pods.scrap)?.name ?? cfg.haul.names.pod;
  const cards = h.contracts.board.map((k, i): CardView => {
    const missing = H.contractMissing(h, i);
    const wants = k.wants.map((w, j): Want => {
      const have = Math.min(w.units, h.hold[w.ore] ?? 0);
      const m = missing[j]?.units ?? 0;
      return {
        ore: w.ore,
        name: oreName(cfg, w.ore),
        color: oreColorOf(cfg, w.ore),
        fill: w.units > 0 ? have / w.units : 0,
        text: m > 0 ? say('toGo', { n: m, ore: oreName(cfg, w.ore) }) : say('inHold'),
      };
    });
    return {
      buyer: buyerName(cfg, k.buyer),
      emblem: portraitOf(cfg, k.buyer),
      wants,
      mult: `×${(Math.round((k.mult + p.contractAdd) * 10) / 10).toFixed(1)}`,
      left: k.launchesLeft,
      lifetime: C.lifetime,
      gain: say('gain', { v: money(cfg, H.contractGain(cfg, p, h, i)) }),
      active: h.contracts.active === i,
      ready: missing.every((x) => x.units <= 0),
    };
  });
  return {
    unlocked: h.contracts.unlocked,
    unlockAt: C.unlockLaunches,
    cards,
    footer: say('boardFooter', {
      pod: podName,
      n: every,
      k: every > 0 ? (g.stats.contractsMet ?? 0) % every : 0,
    }),
  };
}

export function ContractBoardSheet() {
  const ty = useType();
  const open = useHaulUi((s) => s.sheet?.type === 'contracts');
  const board = useRunShallow((cfg, g) => (open ? boardView(cfg, g) : null), null);
  const title = useRunShallow(
    (cfg) => ({
      t: say('boardTitle'),
      icon: portraitOf(cfg, cfg.haul.contracts.buyers[0]?.id ?? ''),
    }),
    { t: '', icon: '' },
  );
  const v = useLast(board);
  const close = () => useHaulUi.getState().closeSheet();
  const anyActive = v?.cards.some((x) => x.active) ?? false;
  return (
    <HaulSheet visible={open && board !== null} onClose={close} title={title.t} left={title.icon ? <HaulIcon name={title.icon} size={26} /> : null}>
      {v ? (
        !v.unlocked ? (
          <Line muted>{say('boardLocked', { n: v.unlockAt })}</Line>
        ) : v.cards.length === 0 ? (
          <Line muted>{say('boardEmpty')}</Line>
        ) : (
          <>
            {!anyActive ? (
              <Line size={ty.small} muted>
                {say('boardHint')}
              </Line>
            ) : null}
            <View style={styles.row}>
              {v.cards.map((card, i) => (
                <Manifest key={i} index={i} card={card} />
              ))}
            </View>
            <Line mono muted size={ty.small} style={styles.footer}>
              {v.footer}
            </Line>
          </>
        )
      ) : null}
    </HaulSheet>
  );
}

function Manifest({ index, card }: { index: number; card: CardView }) {
  const c = useColors();
  const ty = useType();
  const { width } = useWindowDimensions();
  const target = useTarget(`contract:card${index}`);
  const compact = width < 385;
  const w = compact ? 104 : 110;
  const edge = card.active ? c.success : card.ready ? alpha(c.success, 0.6) : alpha(c.primary, 0.35);
  return (
    <Pressable
      {...target}
      onPress={() => haulActions.pickContract(index)}
      accessibilityRole="button"
      accessibilityState={{ selected: card.active }}
      accessibilityLabel={`${card.buyer} ${card.wants.map((x) => x.text).join(', ')} ${card.mult} ${card.gain} ${say('ifMet')}`}
      style={StyleSheet.flatten([
        styles.card,
        {
          width: w,
          minHeight: compact ? 148 : 156,
          borderColor: edge,
          backgroundColor: card.active ? alpha(c.success, 0.08) : alpha(c.surface, 0.9),
        },
      ])}
    >
      <View style={styles.cardTop}>
        {card.emblem ? <HaulIcon name={card.emblem} size={26} /> : null}
        <Text style={[styles.mult, { color: c.text, fontSize: ty.big, fontFamily: MONO }]} maxFontSizeMultiplier={1.15}>
          {card.mult}
        </Text>
      </View>
      <Text style={[styles.buyer, { color: c.text, fontSize: ty.tiny }]} numberOfLines={2} maxFontSizeMultiplier={1.15}>
        {card.buyer.toUpperCase()}
      </Text>
      {card.wants.map((want) => (
        <View key={want.ore} style={styles.want}>
          <View style={styles.wantRow}>
            <HaulIcon name={`art:ore-${want.ore}`} size={12} />
            <Meter value={want.fill} color={want.color} height={4} style={styles.flex} />
          </View>
          <Text style={{ color: c.textMuted, fontSize: ty.tiny, fontFamily: MONO }} numberOfLines={2} maxFontSizeMultiplier={1.15}>
            {want.text}
          </Text>
        </View>
      ))}
      <View style={styles.flex} />
      <View style={styles.pips}>
        {Array.from({ length: card.lifetime }, (_, j) => (
          <View
            key={j}
            style={[
              styles.pip,
              {
                backgroundColor: j < card.left ? c.primary : alpha(c.text, 0.15),
              },
            ]}
          />
        ))}
      </View>
      <Text
        style={{
          color: c.success,
          fontSize: ty.body,
          fontFamily: MONO,
          fontWeight: '800',
        }}
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
      >
        {card.gain}
      </Text>
      <Text style={{ color: c.textMuted, fontSize: ty.tiny }} numberOfLines={1} maxFontSizeMultiplier={1.15}>
        {say('ifMet')}
      </Text>
      {card.active ? (
        <View style={[styles.badge, { backgroundColor: c.success }]}>
          <Text
            style={{
              color: c.background,
              fontSize: ty.tiny,
              fontWeight: '900',
              letterSpacing: 1,
            }}
            maxFontSizeMultiplier={1.1}
          >
            {say('active')}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 10,
  },
  card: { borderWidth: 1.5, borderRadius: 12, padding: 8, gap: 5 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mult: { fontWeight: '800' },
  buyer: { fontWeight: '800', letterSpacing: 0.6 },
  want: { gap: 2 },
  wantRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pips: { flexDirection: 'row', gap: 3 },
  pip: { width: 8, height: 4, borderRadius: 2 },
  badge: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    left: 0,
    right: 0,
    marginHorizontal: 22,
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 1,
  },
  footer: { textAlign: 'center', marginTop: 4 },
});
