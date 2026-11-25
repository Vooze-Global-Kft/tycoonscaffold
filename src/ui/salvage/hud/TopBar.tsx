/**
 * The top bar (yard-stage1.md 4.1): cash rolling with the § coin, the ladder chip (a tap opens the
 * industry table), the carry chip ("28.6 / 30 kg"; "Trial load 400 kg" while driving), the clipboard.
 * Slots and gaps are 4.1's widths (./metrics.ts), text sized by hand from min(fontScale, 1.3). Selects
 * only the few values it shows (the store's game changes ten times a second).
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { PAL } from '../palette';
import { say } from '../strings';
import { useSalvageUi } from '../uiState';
import { hudAnchors } from './anchors';
import { coinSize, cashCoinPoint, fitText, pickForm, type HudLayout } from './metrics';
import { BarText, Paper } from './Paper';

/** The few numbers of the bar (primitives, compared shallowly). */
export interface BarValues {
  ok: boolean;
  cash: number;
  rank: number;
  of: number;
  next: string | null;
  need: number;
  carryKg: number;
  cap: number;
  driving: boolean;
  drivingKg: number;
  trial: boolean;
}

const NONE: BarValues = { ok: false, cash: 0, rank: 0, of: 0, next: null, need: 0, carryKg: 0, cap: 0, driving: false, drivingKg: 0, trial: false };

export function barValues(cfg: R.SalvageConfig, g: R.SalvageGame | undefined): BarValues {
  if (!g?.salvage) return NONE;
  const b = R.topBar(cfg, g);
  return {
    ok: true,
    cash: b.cash,
    rank: b.rank,
    of: b.of,
    next: b.next?.chip ?? null,
    need: b.next?.need_g ?? 0,
    carryKg: b.carry?.kg ?? 0,
    cap: b.carry?.cap ?? 0,
    driving: b.driving !== null,
    drivingKg: b.driving?.kg ?? 0,
    trial: b.driving?.trial ?? false,
  };
}

/** The ladder chip's three forms in words, longest first (5.2). */
export function ladderForms(v: BarValues, c: R.SalvageContent): string[] {
  const rank = { rank: v.rank };
  if (!v.next) return [say({ key: 'rankChipTop', args: { rank, n: { n: v.of } } }, c)];
  const t = { mass_g: v.need, step: 'lot' as const };
  return [
    say({ key: 'rankChip', args: { rank, n: { n: v.of }, rival: { name: v.next }, t } }, c),
    say({ key: 'rankChipShort', args: { rank, rival: { name: v.next } } }, c),
    say({ key: 'rankChipToNext', args: { rank, t } }, c),
  ];
}

/** The carry chip in words. */
export function carryText(v: BarValues, c: R.SalvageContent): string {
  if (v.driving) return say({ key: v.trial ? 'trialLoad' : 'skipLoad', args: { kg: { mass_g: v.drivingKg * 1000, step: 'bridge' } } }, c);
  return say({ key: 'carry', args: { a: { n: Math.round(v.carryKg * 10) / 10 }, b: { n: v.cap } } }, c);
}

export function TopBar({ cfg, L }: { cfg: R.SalvageConfig; L: HudLayout }) {
  const v = useGame(useShallow((s) => barValues(cfg, s.game as R.SalvageGame)));
  const c = cfg.salvage;
  const { slots, s } = L;
  const h = L.rows.bar - 6;
  const y = L.barY + 3;
  // The coin's arc ends at the § coin (world-b reads it).
  useEffect(() => {
    hudAnchors.setCash(cashCoinPoint(L));
  }, [L]);
  if (!v.ok) return null;
  const ladder = pickForm(ladderForms(v, c), slots.ladder - 40, h - 2, s);
  const ladderText = ladderForms(v, c)[ladder.index];
  const carry = carryText(v, c);
  const carryFit = fitText(carry, slots.carry - 12, h - 2, 12, s, true);
  const x1 = L.left;
  const x2 = x1 + slots.cash + slots.gap;
  const x3 = x2 + slots.ladder + slots.gap;
  const x4 = x3 + slots.carry + slots.gap;
  return (
    <>
      <Paper style={[styles.abs, { left: x1, top: y, width: slots.cash, height: h }]} face={styles.row}>
        <Coin size={coinSize(s)} />
        <RollingCash value={v.cash} pt={Math.min(15 * s, h / 1.25)} />
      </Paper>
      <Pressable accessibilityRole="button" accessibilityLabel={ladderText} onPress={() => useSalvageUi.getState().openCard({ kind: 'table' })} style={[styles.abs, { left: x2, top: y, width: slots.ladder, height: h }]}>
        {({ pressed }) => (
          <Paper style={StyleSheet.absoluteFill} face={[styles.row, styles.ladder, pressed && styles.pressed]}>
            <Rung />
            <BarText pt={ladder.fit.pt} weight="700" style={styles.flex}>
              {ladderText}
            </BarText>
          </Paper>
        )}
      </Pressable>
      <Paper style={[styles.abs, { left: x3, top: y, width: slots.carry, height: h }]} face={[styles.row, styles.center, v.driving && { backgroundColor: PAL.hivisLight }]}>
        <BarText pt={carryFit.pt} lines={carryFit.lines} style={styles.centerText}>
          {carry}
        </BarText>
      </Paper>
      <Pressable accessibilityRole="button" accessibilityLabel={say({ key: 'title.clipboard' }, c)} onPress={() => useSalvageUi.getState().openCard({ kind: 'clipboard' })} style={[styles.abs, { left: x4, top: y, width: slots.clip, height: h }]}>
        {({ pressed }) => (
          <Paper style={StyleSheet.absoluteFill} face={[styles.row, styles.center, pressed && styles.pressed]}>
            <Clipboard />
          </Paper>
        )}
      </Pressable>
    </>
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

/** Cash rolling to its new value over 450 ms (the facade's fmtMoney for every frame's figure). */
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
      {R.fmtMoney(shown)}
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
  coin: { backgroundColor: PAL.brass, borderWidth: 1.3, borderColor: PAL.ink, alignItems: 'center', justifyContent: 'center' },
  coinIn: { borderWidth: 1, borderColor: 'rgba(43,46,51,0.55)' },
  rung: { flexDirection: 'row', alignItems: 'flex-end', height: 14, gap: 2 },
  rungBar: { width: 4, borderRadius: 1 },
  clip: { width: 18, height: 22, borderWidth: 1.6, borderColor: PAL.ink, borderRadius: 3, backgroundColor: '#E8D9B5', alignItems: 'center', paddingTop: 5, gap: 2.5 },
  clipTop: { position: 'absolute', top: -3, width: 9, height: 5, borderRadius: 1.5, backgroundColor: PAL.ink },
  clipLine: { width: 10, height: 1.6, backgroundColor: PAL.ink },
});
