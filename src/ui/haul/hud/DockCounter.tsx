/**
 * The dock counter (spec 4.1): the Credits as a rolling digital counter, then 2 pt, then the
 * receipt ticker ("WARPED · MANIFEST 48 COPPER · 12 IRON · ₵612" for 4 s after a warp-out,
 * otherwise the income "₵36/s"). Tap: the Contract Board, once contracts unlock (errata 60).
 * Target key `bay:counter` (credit glyphs fly to it, the board hint rings it).
 * A warp-out that meets the contract stamps the receipt row itself ("CONTRACT MET +₵19.4K", and
 * "DAY SHIFT x2" when the shift doubles it): a green frame that lands on the row, never over the
 * credits number (Decision 40, play-11).
 *
 * Fixed-height rule (AGENTS.md, ./bayMetrics.ts): both rows absolutely placed at tops that add up
 * to the block, fonts sized by hand from fontScale with allowFontScaling off, the RollingNumber with
 * a height and no lineHeight. The counter follows the cash outside React (no render per tick) and
 * holds a warp-out's credits back until the glyphs land (money arrives with them, not before).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { formatMoney } from '../../../engine/format';
import * as H from '../../../engine/haul';
import { modeEvents } from '../../../state/modeEvents';
import { useGame } from '../../../state/store';
import { RollingNumber } from '../../components/RollingNumber';
import { useTarget } from '../../hints/targets';
import { alpha, SPACE } from '../art/palette';
import type { Rect } from '../layout';
import { useRun } from '../useRun';
import { useHaulUi } from '../uiState';
import { TICKER_MIN_FONT, bayCounterMetrics, bayCounterRows, fitTicker } from './bayMetrics';
import { DIGITAL, bayWord, fillIn } from './bayText';
import { metParts, receiptPages, receiptParts } from './receipt';
import { HAUL_STRINGS } from '../strings';
import { GLYPH_FALL_MS, GLYPH_LEAD_MS } from './feedbackTiming';

/** How long the receipt stays on the ticker after a warp-out. */
const RECEIPT_MS = 4000;
/** How long each page of a receipt too long for one row stays (Decision 59: every ore is named). */
const PAGE_MS = 2200;
/** The widest amount the counter is sized for ("₵999.99Qd"), so its font never jumps as the money grows. */
const WIDEST_GLYPHS = 9;
/** Inner padding of the counter's frame, each side. */
const PAD = 8;

let holdUntil = 0;

/** Feeds the counter every change of cash outside React; a warp-out's credits wait for their glyphs. */
function followCash(set: (v: number) => void): () => void {
  set(useGame.getState().game.cash);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const offEvents = modeEvents.subscribe((events) => {
    if (events.some((e) => (e as H.HaulEvent).type === 'warp')) holdUntil = Date.now() + GLYPH_LEAD_MS + GLYPH_FALL_MS;
  });
  const offCash = useGame.subscribe((s, prev) => {
    if (s.game.cash === prev.game.cash) return;
    const wait = holdUntil - Date.now();
    if (timer) clearTimeout(timer);
    timer = null;
    if (wait > 0 && s.game.cash > prev.game.cash) timer = setTimeout(() => set(useGame.getState().game.cash), wait);
    else set(s.game.cash);
  });
  return () => {
    offEvents();
    offCash();
    if (timer) clearTimeout(timer);
  };
}

export function DockCounter({ rect }: { rect: Rect }) {
  const sym = useGame((s) => s.cfg.strings.currencySymbol);
  const unlocked = useRun((_c, g) => g.haul.contracts.unlocked, false);
  const income = useRun((cfg, g) => {
    const v = H.haulIncome(cfg, g);
    return v > 0 ? `${formatMoney(v, cfg.strings.currencySymbol)}${bayWord('perSecond')}` : '';
  }, '');
  const [startCash] = useState(() => useGame.getState().game.cash);
  const [receipt, setReceipt] = useState<{ pages: string[]; page: number; met: boolean } | null>(null);
  const stamp = useSharedValue(0);
  const stampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, stamp.value * 3),
    transform: [{ scale: 1 + 0.35 * (1 - stamp.value) }],
  }));
  const target = useTarget('bay:counter');
  const { fontScale, height } = useWindowDimensions();
  const compact = height < 740;
  // The frame's 1 pt border is outside the rows: they add up to the inner height.
  const m = bayCounterMetrics(compact, rect.height - 2, fontScale, rect.width - 2 * PAD, WIDEST_GLYPHS);
  const rows = bayCounterRows(m);
  // The ticker's row, for fitting a receipt into pages when it arrives (outside render).
  const row = useRef({ width: rect.width - 2 * PAD + 4, font: m.tickerFont });
  row.current = { width: rect.width - 2 * PAD + 4, font: m.tickerFont };
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let popTimer: ReturnType<typeof setTimeout> | null = null;
    let pageTimers: ReturnType<typeof setTimeout>[] = [];
    const off = modeEvents.subscribe((events) => {
      const w = events.find((e) => (e as H.HaulEvent).type === 'warp') as Extract<H.HaulEvent, { type: 'warp' }> | undefined;
      if (!w) return;
      const cfg = useGame.getState().cfg as H.HaulConfig;
      if (!H.isHaul(cfg)) return;
      const metEv = events.find((e) => (e as H.HaulEvent).type === 'contractMet') as Extract<H.HaulEvent, { type: 'contractMet' }> | undefined;
      const progEv = events.find((e) => (e as H.HaulEvent).type === 'contractProgress') as Extract<H.HaulEvent, { type: 'contractProgress' }> | undefined;
      // The contract's ores lead the manifest: the one this launch met or fed, else the taken one.
      const C = (useGame.getState().game as { haul?: H.HaulState }).haul?.contracts;
      const taken = C && C.active !== null ? C.board[C.active] : undefined;
      const first = (metEv?.contract ?? progEv?.contract ?? (taken?.taken ? taken : undefined))?.wants.map((x) => x.ore) ?? [];
      const bonus = (w as { bonus?: number }).bonus ?? 0;
      const mult = metEv?.shift ? cfg.haul.shift.mult : 0;
      const base = mult > 0 ? bonus / mult : bonus;
      const parts = w.met ? metParts(cfg, w.cargo, base, mult > 0 ? mult : null, first) : receiptParts(cfg, w.cargo, w.payout, first);
      const { width, font } = row.current;
      const pages = receiptPages(parts, (line) => fitTicker([line], width, font).font >= TICKER_MIN_FONT);
      setReceipt({ pages, page: 0, met: w.met });
      // The stamp lands on the receipt row as the money does.
      stamp.value = 0;
      if (w.met) stamp.value = withDelay(GLYPH_LEAD_MS + GLYPH_FALL_MS, withTiming(1, { duration: 220, easing: Easing.in(Easing.cubic) }));
      if (timer) clearTimeout(timer);
      for (const t of pageTimers) clearTimeout(t);
      pageTimers = pages.slice(1).map((_, i) => setTimeout(() => setReceipt((r) => (r ? { ...r, page: i + 1 } : r)), (i + 1) * PAGE_MS));
      timer = setTimeout(() => setReceipt(null), Math.max(RECEIPT_MS, pages.length * PAGE_MS));
      // The counter pops as the first glyphs land.
      if (popTimer) clearTimeout(popTimer);
      popTimer = setTimeout(() => {
        pop.value = withSequence(withTiming(1.06, { duration: 90 }), withTiming(1, { duration: 260 }));
      }, GLYPH_LEAD_MS + GLYPH_FALL_MS);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
      if (popTimer) clearTimeout(popTimer);
      for (const t of pageTimers) clearTimeout(t);
    };
  }, [pop, stamp]);

  const ticker = fitTicker(receipt ? [receipt.pages[Math.min(receipt.page, receipt.pages.length - 1)]] : [income], rect.width - 2 * PAD + 4, m.tickerFont);
  const tickerColor = receipt ? (receipt.met ? SPACE.green : SPACE.white) : SPACE.steel;
  const frame = useMemo(
    () => ({
      position: 'absolute' as const,
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
      borderRadius: 8,
      backgroundColor: SPACE.hull0,
      borderWidth: 1,
      borderColor: alpha(SPACE.line, receipt ? 0.75 : 0.4),
    }),
    [rect.x, rect.y, rect.width, rect.height, receipt],
  );
  const open = unlocked ? () => useHaulUi.getState().openSheet({ type: 'contracts' }) : undefined;
  const label = fillIn(HAUL_STRINGS.counterLabel, { cash: formatMoney(useGame.getState().game.cash, sym), income: income || formatMoney(0, sym) });
  return (
    <Pressable
      onPress={open}
      disabled={!unlocked}
      accessibilityRole={unlocked ? 'button' : 'text'}
      accessibilityLabel={unlocked ? `${label} ${HAUL_STRINGS.counterBoard}` : label}
      style={frame}
      ref={target.ref}
      onLayout={target.onLayout}
      collapsable={false}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: PAD,
            right: PAD,
            top: rows.counterTop,
            height: m.counterRow,
            alignItems: 'center',
            justifyContent: 'center',
          },
          popStyle,
        ]}
      >
        <RollingNumber
          value={startCash}
          follow={followCash}
          symbol={sym}
          allowFontScaling={false}
          style={[
            DIGITAL,
            {
              color: SPACE.gold,
              fontSize: m.counterFont,
              height: rows.counterBox,
              padding: 0,
              textAlign: 'center',
              alignSelf: 'stretch',
              textShadowColor: alpha(SPACE.gold, 0.45),
              textShadowRadius: 8,
            },
          ]}
        />
      </Animated.View>
      {receipt?.met ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: PAD - 5,
              right: PAD - 5,
              top: rows.tickerTop,
              height: m.tickerRow,
              borderRadius: 4,
              borderWidth: 1.2,
              borderColor: SPACE.green,
              backgroundColor: alpha(SPACE.green, 0.14),
            },
            stampStyle,
          ]}
        />
      ) : null}
      <View
        style={{
          position: 'absolute',
          left: PAD - 2,
          right: PAD - 2,
          top: rows.tickerTop,
          height: m.tickerRow,
          justifyContent: 'center',
        }}
      >
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[
            DIGITAL,
            {
              color: tickerColor,
              fontSize: ticker.font,
              lineHeight: m.tickerRow,
              textAlign: 'center',
              fontWeight: '600',
            },
          ]}
        >
          {ticker.text}
        </Text>
      </View>
    </Pressable>
  );
}
