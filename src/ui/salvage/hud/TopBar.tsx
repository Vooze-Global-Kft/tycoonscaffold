/**
 * The top bar (yard-stage1.md 4.1): cash rolling with the § coin, the ladder chip (a tap opens the
 * industry table), the carry chip ("28.6 / 30 kg"; "Trial load 400 kg" while driving), the clipboard.
 * Slots and gaps are 4.1's widths (./metrics.ts), text sized by hand from min(fontScale, 1.3). Selects
 * only the few values it shows (the store's game changes ten times a second).
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { PAL } from '../palette';
import { say } from './words';
import { openCard } from '../overlays/cardStack';
import { hudAnchors } from './anchors';
import { CARRY_CHROME, CARRY_SKIP, LADDER_CHROME, coinSize, cashCoinPoint, cashFit, fitText, lineH, pickForm, textW, type HudLayout } from './metrics';
import { BarText, Paper } from './Paper';
import { yardEvents } from './pump';
import { barMoney, barValues, carryText, ladderForms } from './words';

/** How long the debit line stays under the cash counter (finding P12), ms. */
export const DEBIT_MS = 2600;

export function TopBar({ cfg, L }: { cfg: R.SalvageConfig; L: HudLayout }) {
  const v = useGame(useShallow((s) => barValues(cfg, s.game as R.SalvageGame)));
  const c = cfg.salvage;
  const { slots, s } = L;
  const h = L.rows.bar - 4;
  const y = L.barY + 2;
  // The coin's arc ends at the § coin (world-b reads it).
  useEffect(() => {
    hudAnchors.setCash(cashCoinPoint(L));
  }, [L]);
  // The ladder chip slides in when a rival is passed (finding P16); the toast is ./Toasts.tsx's.
  const slide = useSharedValue(0);
  const lastPassed = useRef(v.passed);
  useEffect(() => {
    if (v.passed && v.passed !== lastPassed.current) slide.value = withSequence(withTiming(1, { duration: 1 }), withTiming(0, { duration: 520 }));
    lastPassed.current = v.passed;
  }, [v.passed, slide]);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slide.value * 28 }], opacity: 1 - slide.value * 0.6 }));
  if (!v.ok) return null;
  const ladder = pickForm(ladderForms(v, c), slots.ladder - LADDER_CHROME, h - 2, s);
  const ladderText = ladderForms(v, c)[ladder.index];
  const carry = carryText(v, c);
  const carryFit = fitText(carry, slots.carry - CARRY_CHROME - (v.driving ? CARRY_SKIP : 0), h - 3, 12, s, true);
  const x1 = L.left;
  const x2 = x1 + slots.cash + slots.gap;
  const x3 = x2 + slots.ladder + slots.gap;
  const x4 = x3 + slots.carry + slots.gap;
  return (
    <>
      <Paper style={[styles.abs, { left: x1, top: y, width: slots.cash, height: h }]} face={styles.row}>
        <Coin size={coinSize(s)} />
        {/* Sized from the value it rolls to (H10), so the size does not flicker; never cut (P4). */}
        <RollingCash value={v.cash} pt={cashFit(barMoney(v.cash), slots.cash, h, s).pt} />
      </Paper>
      <Animated.View style={[styles.abs, { left: x2, top: y, width: slots.ladder, height: h }, slideStyle]}>
        <Pressable accessibilityRole="button" accessibilityLabel={ladderText} onPress={() => openCard({ kind: 'table' })} style={StyleSheet.absoluteFill}>
          {({ pressed }) => (
            <Paper style={StyleSheet.absoluteFill} face={[styles.row, styles.ladder, pressed && styles.pressed]}>
              <Rung />
              <BarText pt={ladder.fit.pt} weight="700" style={styles.flex}>
                {ladderText}
              </BarText>
            </Paper>
          )}
        </Pressable>
      </Animated.View>
      <Paper style={[styles.abs, { left: x3, top: y, width: slots.carry, height: h }]} face={[styles.row, styles.center, v.driving && { backgroundColor: PAL.hivisLight }]}>
        {v.driving ? <SkipPicto /> : null}
        <BarText pt={carryFit.pt} lines={carryFit.lines} style={[styles.centerText, v.driving && styles.flex]}>
          {carry}
        </BarText>
      </Paper>
      <Pressable accessibilityRole="button" accessibilityLabel={say({ key: 'title.clipboard' }, c)} onPress={() => openCard({ kind: 'clipboard' })} style={[styles.abs, { left: x4, top: y, width: slots.clip, height: h }]}>
        {({ pressed }) => (
          <Paper style={StyleSheet.absoluteFill} face={[styles.row, styles.center, pressed && styles.pressed]}>
            <Clipboard />
          </Paper>
        )}
      </Pressable>
    </>
  );
}

/**
 * Money going out is seen (finding P12): at a skip's hook a rust line under the cash counter,
 * "−§1,877 · Cottle Demolition", for DEBIT_MS. Drawn over the goal card's start (it is brief).
 */
export function CashDebit({ cfg, L }: { cfg: R.SalvageConfig; L: HudLayout }) {
  const [line, setLine] = useState<{ id: number; text: string } | null>(null);
  const n = useRef(0);
  const c = cfg.salvage;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = yardEvents.on('hook', (e) => {
      if (!(e.price > 0)) return;
      const text = say({ key: 'cashDebit', args: { x: { ref: barMoney(e.price) }, partner: { name: e.partner } } }, c);
      clearTimeout(timer);
      setLine({ id: ++n.current, text });
      timer = setTimeout(() => setLine(null), DEBIT_MS);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, [c]);
  if (!line) return null;
  const pt = 12 * L.s;
  const w = Math.min(L.safeW, Math.ceil(textW(line.text, pt) + 20));
  return (
    <Animated.View key={line.id} pointerEvents="none" style={[styles.abs, styles.debit, { left: L.left, top: L.barY + L.rows.bar + 1, width: w, height: lineH(pt) + 8 }]}>
      <BarText pt={pt} weight="800" color={PAL.cost}>
        {line.text}
      </BarText>
    </Animated.View>
  );
}

/** The § coin: a brass disc with its rim (the amount beside it carries the § sign). */
function Coin({ size }: { size: number }) {
  return (
    <View style={[styles.coin, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[styles.coinIn, { width: size * 0.56, height: size * 0.56, borderRadius: size * 0.28 }]} />
    </View>
  );
}

/** The skip pictogram of the carry chip while driving (the lead's ruling, 15:55): a skip's side in its red. */
function SkipPicto() {
  return (
    <View style={styles.skip}>
      <View style={styles.skipLip} />
    </View>
  );
}

/** A small step pictogram for the ladder (three rising bars). */
function Rung() {
  return (
    <View style={styles.rung}>
      {[6, 10, 14].map((hh, i) => (
        <View key={i} style={[styles.rungBar, { height: hh, backgroundColor: i === 2 ? PAL.hivisDark : PAL.ink }]} />
      ))}
    </View>
  );
}

/** The clipboard pictogram: a board with its clip and three lines. */
function Clipboard() {
  return (
    <View style={styles.clip}>
      <View style={styles.clipTop} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.clipLine} />
      ))}
    </View>
  );
}

/** Cash rolling to its new value over 450 ms (barMoney for every frame's figure: whole from §100). */
function RollingCash({ value, pt }: { value: number; pt: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const t0 = Date.now();
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / 450);
      const e = 1 - (1 - k) * (1 - k);
      const x = k >= 1 ? value : start + (value - start) * e;
      from.current = x;
      setShown(x);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [value]);
  return (
    <BarText pt={Math.floor(pt * 2) / 2} weight="900" style={styles.flex}>
      {barMoney(shown)}
    </BarText>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  ladder: { paddingHorizontal: 8 },
  center: { justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  flex: { flex: 1, marginLeft: 6 },
  pressed: { backgroundColor: PAL.paperShade },
  debit: { backgroundColor: PAL.paper, borderWidth: 1.3, borderColor: PAL.cost, borderRadius: 5, paddingHorizontal: 8, justifyContent: 'center' },
  coin: { backgroundColor: PAL.brass, borderWidth: 1.3, borderColor: PAL.ink, alignItems: 'center', justifyContent: 'center' },
  coinIn: { borderWidth: 1, borderColor: 'rgba(43,46,51,0.55)' },
  skip: { width: 18, height: 11, backgroundColor: '#B8452C', borderWidth: 1.3, borderColor: PAL.ink, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, transform: [{ perspective: 40 }, { rotateX: '0deg' }] },
  skipLip: { position: 'absolute', top: -3, left: -3, right: -3, height: 3, backgroundColor: PAL.ink, borderRadius: 1 },
  rung: { flexDirection: 'row', alignItems: 'flex-end', height: 14, gap: 2 },
  rungBar: { width: 4, borderRadius: 1 },
  clip: { width: 18, height: 22, borderWidth: 1.6, borderColor: PAL.ink, borderRadius: 3, backgroundColor: '#E8D9B5', alignItems: 'center', paddingTop: 5, gap: 2.5 },
  clipTop: { position: 'absolute', top: -3, width: 9, height: 5, borderRadius: 1.5, backgroundColor: PAL.ink },
  clipLine: { width: 10, height: 1.6, backgroundColor: PAL.ink },
});
