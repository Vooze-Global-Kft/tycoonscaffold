/**
 * The posted price board (yard-stage1.md 4.4 and 2.8; a bay's card opens it at the bay's row): the
 * head "Market day {date} (UTC) · next prices in {h} h {m} m"; per grade seen a row: pictogram, name,
 * today's price and the day word, the five days' bars with the usual-price tick, the bay's stock (its
 * reservation and set-aside lot), and one button: Hold, Sell with its total (a held bay), or Held. The
 * first opening shows the hint at a day word and the fictional line. Sell carries the step it showed
 * (`sell(grade, shown)`); "Price updated: §a → §b" asks again with the rules' retry.
 *
 * Data: `CardData.board` when the rules give it, else the facade's `priceBoard` (a selector); the Sell of
 * a held row is ./marketSample.ts's stand-in while the rules' board has none. The screen computes
 * nothing: prices, words and buttons are the rules', numbers go through the facade's formatters.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import * as R from '../../../engine/salvage';
import type { BoardRow, CardButton, Txt } from '../../../engine/salvage';
import { gradePictogram } from '../art/pieces.draw';
import { BUY_H, BUY_MAX } from './layout';
import { BARS, PICTO, boardOffsets, barHeight } from './marketLayout';
import { DataLine, Drawing, Note, gradeName, useAsk, useContent, useSeenOnClose } from './marketParts';
import { DAY_WORD, rowExtra } from './marketLines';
import { boardWithSell } from './marketSample';
import type { CardViewProps } from './OverlayHost';
import { Panel } from './Panel';
import { INK, Line, LocalButton, RefusalLine, useFrame } from './parts';

export function PriceBoard({ cfg, g, data, onClose }: CardViewProps) {
  const { layout } = useFrame();
  const c = useContent();
  const ask = useAsk();
  useSeenOnClose('board');
  const board = boardWithSell(cfg, g, data.board ?? R.priceBoard(cfg, g, Date.now()));
  const focus = data.focus ?? null;
  // A bay's card opens the board at its row: the focused row first, marked (STAND-IN for a scroll offset: requests.md).
  const rows = focus ? [...board.rows.filter((r) => r.grade === focus), ...board.rows.filter((r) => r.grade !== focus)] : board.rows;
  const off = boardOffsets(layout, rows.map(rowExtra));
  const first = board.hint !== null;
  // The first opening's hint names a grade on a low day; with no grade seen yet there is none to name.
  const hint = board.hint && board.hint.args && Object.keys(board.hint.args).length ? board.hint : null;
  const head: Txt = { key: 'board.head', args: { date: { day: board.day }, t: { secs: board.nextInS } } };
  return (
    <Panel
      title={data.title}
      onClose={onClose}
      lead={[head]}
      after={
        data.legal && !first ? (
          <View style={{ paddingTop: 10 }}>
            <Line t={data.legal} size="line" colour={INK.soft} lines={4} />
          </View>
        ) : null
      }
    >
      {first ? (
        <Note tone="hivis">
          {hint ? <Line t={hint} size="name" bold lines={2} /> : null}
          {data.legal ? <Line t={data.legal} size="line" lines={4} /> : null}
        </Note>
      ) : null}
      <View style={{ height: off.total }}>
        <View style={styles.pictos} pointerEvents="none">
          <Drawing w={PICTO} h={off.total} deps={[rows.map((r) => r.grade).join(), off.total]} draw={(cv) => rows.forEach((r, i) => gradePictogram(cv, r.grade, 0, off.tops[i] + (off.heights[i] - PICTO) / 2, PICTO))} />
        </View>
        {rows.map((r, i) => (
          <BoardLine key={r.grade} r={r} h={off.heights[i]} focused={r.grade === focus} name={gradeName(c, r.grade)} onPress={(b) => ask.press(b.action, r.grade)} />
        ))}
      </View>
      {ask.asked ? (
        <View style={styles.asked}>
          <RefusalLine t={ask.asked.txt} />
          {ask.asked.retry ? <LocalButton label={retryLabel(ask.asked.retry)} onPress={() => ask.press(ask.asked!.retry!, ask.asked!.row)} /> : null}
        </View>
      ) : null}
    </Panel>
  );
}

/** The retry's label: Sell at the new step's total. */
function retryLabel(a: NonNullable<ReturnType<typeof useAsk>['asked']>['retry']): Txt {
  if (a && a.act === 'sell') return { key: 'board.sellTotal', args: { x: { money: R.roundMoney((a.shown.grams / 1000) * a.shown.price) } } };
  return { key: 'ok' };
}

function BoardLine({ r, h, focused, name, onPress }: { r: BoardRow; h: number; focused: boolean; name: string; onPress: (b: CardButton) => void }) {
  const word = DAY_WORD[r.word];
  const button = r.sell ?? r.hold;
  const holdOnly = !r.sell;
  return (
    <View style={[styles.row, { height: h }, focused ? styles.focused : null]}>
      <View style={{ width: PICTO + 8 }} />
      <View style={styles.text}>
        <View style={styles.line1}>
          <DataLine text={name} size="name" bold lines={1} style={{ flexShrink: 1 }} />
          {r.held && r.sell ? (
            <Pressable accessibilityRole="button" hitSlop={12} onPress={() => onPress(r.hold)} style={styles.heldTag}>
              <Line t={{ key: 'chip.held' }} size="line" bold />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.line1}>
          <Line t={{ key: 'ticket.gradeToday', args: { p: { price: r.price } } }} size="line" bold />
          {word ? (
            <View style={[styles.word, r.word === 'low' ? styles.low : styles.high]}>
              <Line t={word} size="line" bold colour={INK.ink} />
            </View>
          ) : null}
        </View>
        <View style={styles.line1}>
          <Bars days={r.days} pbar={r.pbar} />
          <Line t={{ key: 'board.stock', args: { kg: { mass_g: r.bay_g, step: 'lot' } } }} size="line" colour={INK.soft} style={{ flexShrink: 1 }} />
        </View>
        {r.reserved_g > 0 ? <Line t={{ key: 'card.dealReserve', args: { a: { mass_g: r.reserved_g, step: 'lot' }, b: { mass_g: r.bay_g, step: 'lot' } } }} size="line" colour={INK.soft} /> : null}
        {r.reserved_g <= 0 && r.aside_g > 0 ? <Line t={{ key: 'chip.aside', args: { kg: { mass_g: r.aside_g, step: 'lot' }, x: { price: r.price } } }} size="line" colour={INK.soft} /> : null}
      </View>
      <HoldOrSell button={button} held={r.held} holdOnly={holdOnly} onPress={onPress} />
    </View>
  );
}

/** One slot: Hold (off), Held (on, no stock to sell: tap releases), or Sell with its total; the held tag on line 1 releases then. */
function HoldOrSell({ button, held, holdOnly, onPress }: { button: CardButton; held: boolean; holdOnly: boolean; onPress: (b: CardButton) => void }) {
  const label: Txt = holdOnly && held ? { key: 'chip.held' } : button.label;
  return (
    <View style={{ minWidth: 96, maxWidth: BUY_MAX }}>
      <Pressable
        accessibilityRole="button"
        hitSlop={4}
        onPress={() => onPress(button)}
        style={({ pressed }) => [styles.slot, { height: BUY_H }, holdOnly && held ? styles.slotHeld : null, holdOnly && !held ? styles.slotHold : null, pressed ? { opacity: 0.75 } : null]}
      >
        <Line t={label} size="price" bold center />
      </Pressable>
    </View>
  );
}

/** Five days' bars with the usual-price tick (a picture of the week; the numbers are on the row). */
function Bars({ days, pbar }: { days: number[]; pbar: number }) {
  const w = (BARS.w - BARS.gap * 4) / 5;
  return (
    <View style={[styles.bars, { width: BARS.w, height: BARS.h }]} accessibilityElementsHidden>
      {days.slice(-5).map((p, i) => (
        <View key={i} style={{ position: 'absolute', left: i * (w + BARS.gap), bottom: 0, width: w, height: barHeight(p, pbar), backgroundColor: i === days.length - 1 ? INK.ink : INK.soft }} />
      ))}
      <View style={[styles.tick, { bottom: BARS.h / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pictos: { position: 'absolute', left: 0, top: 0 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule, gap: 8 },
  focused: { backgroundColor: INK.shade },
  text: { flex: 1, minWidth: 0, justifyContent: 'center', marginLeft: -8 },
  line1: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  heldTag: { paddingHorizontal: 5, borderRadius: 4, backgroundColor: INK.hivis },
  word: { paddingHorizontal: 6, borderRadius: 4, borderWidth: 1, borderColor: INK.ink },
  low: { backgroundColor: INK.shade },
  high: { backgroundColor: INK.hivis },
  bars: { position: 'relative' },
  tick: { position: 'absolute', left: -2, right: -2, height: 1, backgroundColor: INK.refuse },
  slot: { paddingHorizontal: 10, borderRadius: 8, borderWidth: 1.3, borderColor: INK.ink, backgroundColor: INK.hivis, alignItems: 'center', justifyContent: 'center' },
  slotHold: { backgroundColor: INK.paper },
  slotHeld: { backgroundColor: INK.good },
  asked: { paddingTop: 8, gap: 6 },
});
