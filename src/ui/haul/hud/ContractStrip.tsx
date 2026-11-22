/**
 * The contract strip at the top of the map (spec 4.1, Decision 40): the taken contract, delivered
 * over several launches. A floating card with the buyer's emblem and name, the multiplier, each
 * wanted ore as "3.7K/8.4K COPPER" with a bar (delivered solid, aboard the climbing freighter as a
 * lighter segment), the fixed bonus "+₵19.4K", and a status row: "4 LAUNCHES LEFT" in words (the
 * last one pulses) and a pace light ("ON PACE", or "SHORT ON COPPER" in amber). "x2 SHIFT" when the
 * day shift would pay the bonus twice (Decision 53). Nothing on it falls back after a launch: the
 * figures are delivered plus aboard, and aboard becomes delivered at the warp-out.
 * "PICK A CONTRACT" when none is taken (it glows once each time that happens). Hidden until
 * contracts unlock. Tap: the Contract Board. Target key `contract:strip`.
 *
 * Fixed-height card: three rows at tops that add up to the card, fonts sized by hand from
 * fontScale (shrunk together when the text size setting would overflow the card).
 */
import { useEffect, useRef } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { formatMoney } from '../../../engine/format';
import * as H from '../../../engine/haul';
import { GameIcon } from '../../components/GameIcon';
import { useTarget } from '../../hints/targets';
import { alpha, oreColor, SPACE } from '../art/palette';
import type { Rect } from '../layout';
import { HAUL_STRINGS } from '../strings';
import { runParams, useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import { DIGITAL, fillIn, fitLabel, labelMetrics, unitShort } from './bayText';

interface WantView {
  ore: string;
  name: string;
  /** Delivered, and aboard the climbing freighter (units). */
  got: number;
  aboard: number;
  units: number;
}

interface StripView {
  unlocked: boolean;
  active: boolean;
  buyer: string;
  name: string;
  wants: WantView[];
  mult: string;
  left: number;
  bonus: string;
  /** All wanted units are delivered or aboard. */
  done: boolean;
  onPace: boolean;
  short: string;
  shift: boolean;
}

const NONE: StripView = {
  unlocked: false,
  active: false,
  buyer: '',
  name: '',
  wants: [],
  mult: '',
  left: 0,
  bonus: '',
  done: false,
  onPace: true,
  short: '',
  shift: false,
};


/** Ore names in capitals, once per config (perf-4: not a new Map per store change). */
const oreNames = new WeakMap<object, Map<string, string>>();
function oreNameOf(cfg: H.HaulConfig, ore: string): string {
  let m = oreNames.get(cfg);
  if (!m) {
    m = new Map(cfg.haul.ores.map((o) => [o.id, o.name.toUpperCase()]));
    oreNames.set(cfg, m);
  }
  return m.get(ore) ?? ore.toUpperCase();
}

/**
 * The strip's view of the run (perf-4): the contract's views change only with the contracts, the
 * freighter's flight and the routes, so the last result is kept while those stay the same (the
 * hold filling, ten times a second, does not touch it).
 */
let memo: { cfg: object; contracts: object; phase: string; toward: unknown; routes: string; shift: unknown; view: StripView } | null = null;

function stripView(cfg: H.HaulConfig, g: H.HaulGame & { haul: H.HaulState }): StripView {
  const h = g.haul;
  if (!h.contracts.unlocked) return NONE;
  const k = h.contracts.active;
  const c = k === null ? null : h.contracts.board[k];
  if (!c || k === null || c.taken === false) return { ...NONE, unlocked: true };
  const routes = h.slots.map((s) => (s.claimed ? `${s.haulers}.${s.rigLevel}.${s.ore}` : '')).join(',') + `|${h.freighter.level}`;
  const shift = (g as { haulStats?: H.HaulStats }).haulStats?.shift;
  if (memo && memo.cfg === cfg && memo.contracts === h.contracts && memo.phase === h.freighter.phase && memo.toward === h.freighter.contract && memo.routes === routes && memo.shift === shift) return memo.view;
  let view: StripView;
  try {
    const params = runParams(cfg, g);
    // Only the taken contract: the strip never needs the offers' views.
    const one = { ...h, contracts: { ...h.contracts, board: [c], active: 0 } } as H.HaulState;
    const cv = H.contractViews(cfg, params, one, (g as { haulStats?: H.HaulStats }).haulStats)[0];
    const wants = cv.wants.map((w) => ({
      ore: w.ore,
      name: oreNameOf(cfg, w.ore),
      got: Math.min(w.units, w.got),
      aboard: Math.max(0, Math.min(w.units - w.got, w.aboard)),
      units: w.units,
    }));
    view = {
      unlocked: true,
      active: true,
      buyer: c.buyer,
      name: (cfg.haul.contracts.buyers.find((b) => b.id === c.buyer)?.name ?? c.buyer).toUpperCase(),
      wants,
      mult: `×${c.mult.toFixed(1)}`,
      left: cv.launchesLeft,
      bonus: cv.bonus > 0 ? `+${formatMoney(cv.bonus, cfg.strings.currencySymbol)}` : '',
      done: cv.wants.every((w) => !(w.left > 0)),
      onPace: cv.onPace,
      short: cv.shortOre ? oreNameOf(cfg, cv.shortOre) : '',
      shift: cv.shift,
    };
  } catch {
    view = { ...NONE, unlocked: true };
  }
  memo = { cfg, contracts: h.contracts, phase: h.freighter.phase, toward: h.freighter.contract, routes, shift, view };
  return view;
}

/** The strip's rows: name, wants, status, at tops that add up inside the card (shrunk together when needed). */
function stripRows(height: number, compact: boolean, fontScale: number) {
  let name = labelMetrics(compact ? 10.5 : 11.5, fontScale);
  let small = labelMetrics(compact ? 9.5 : 10.5, fontScale);
  const top = compact ? 3 : 4;
  const need = top + name.row + small.row * 2 + 2 + top;
  if (need > height) {
    const k = (height - 2 * top - 2) / (name.row + small.row * 2);
    name = { font: Math.floor(name.font * k * 10) / 10, row: Math.floor(name.row * k) };
    small = { font: Math.floor(small.font * k * 10) / 10, row: Math.floor(small.row * k) };
  }
  return { name, small, top, wantsTop: top + name.row + 1, statusTop: top + name.row + 1 + small.row + 1 };
}

export function ContractStrip({ rect }: { rect: Rect }) {
  const covered = useHaulUi((s) => s.spoke !== null);
  const v = useRunShallow<StripView>(stripView, NONE, covered);
  const target = useTarget(v.unlocked ? 'contract:strip' : null);
  const { fontScale, height: winH } = useWindowDimensions();
  const compact = winH < 740;
  const rows = stripRows(rect.height, compact, fontScale);
  const big = labelMetrics(compact ? 15 : 17, fontScale);
  const glow = useSharedValue(0);
  const pulse = useSharedValue(1);
  const wasActive = useRef(v.active);
  useEffect(() => {
    // "Pick a contract": the strip glows once when the board needs a pick.
    if (v.unlocked && !v.active && wasActive.current !== false) glow.value = withSequence(withTiming(1, { duration: 260 }), withTiming(0, { duration: 900 }));
    wasActive.current = v.active;
  }, [v.unlocked, v.active, glow]);
  const last = v.active && v.left === 1 && !v.done;
  useEffect(() => {
    // The last launch pulses its words a few times, then stays lit (nothing animates for long).
    cancelAnimation(pulse);
    pulse.value = last ? withRepeat(withSequence(withTiming(0.35, { duration: 380 }), withTiming(1, { duration: 380 })), 4, false) : 1;
    return () => cancelAnimation(pulse);
  }, [last, pulse]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  if (!v.unlocked) return null;
  const pad = 8;
  const emblem = Math.min(rect.height - 2 * pad, 34);
  const rim = v.done ? SPACE.green : v.active ? (v.onPace ? alpha(SPACE.line, 0.55) : alpha(SPACE.amber, 0.75)) : SPACE.amber;
  const open = () => useHaulUi.getState().openSheet({ type: 'contracts' });
  const leftX = pad + emblem + 8;
  const rightW = 96;
  const midW = rect.width - leftX - rightW - pad;
  const launches = v.left === 1 ? HAUL_STRINGS.stripLaunch : fillIn(HAUL_STRINGS.stripLaunches, { n: v.left });
  const pace = v.done ? HAUL_STRINGS.stripMet : v.onPace ? HAUL_STRINGS.stripOnPace : fillIn(HAUL_STRINGS.stripShort, { ore: v.short });
  const paceColor = v.done || v.onPace ? SPACE.green : SPACE.amber;
  const status = `${launches} · ${pace}`;
  const statusFit = fitLabel(status, midW + rightW - (v.shift ? 64 : 0) - 10, compact ? 9.5 : 10.5, fontScale);
  const label = v.active
    ? fillIn(HAUL_STRINGS.stripLabel, {
        buyer: v.name,
        wants: v.wants.map((w) => `${unitShort(w.got + w.aboard)}/${unitShort(w.units)} ${w.name}`).join(', '),
        left: `${launches}, ${pace}`,
        bonus: v.bonus,
      })
    : HAUL_STRINGS.pickContract;
  return (
    <Pressable
      ref={target.ref}
      onLayout={target.onLayout}
      collapsable={false}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        borderRadius: 12,
        backgroundColor: alpha(SPACE.panel, 0.94),
        borderWidth: 1.2,
        borderColor: rim,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: -1, top: -1, right: -1, bottom: -1, borderRadius: 12, borderWidth: 2, borderColor: SPACE.amber }, glowStyle]}
      />
      {v.active ? (
        <>
          <View style={{ position: 'absolute', left: pad, top: (rect.height - 2.4 - emblem) / 2, width: emblem, height: emblem }}>
            <GameIcon icon={`mach:buyer-${v.buyer}`} size={emblem} />
          </View>
          {/* Row 1: the buyer; the multiplier on the right. */}
          <View style={{ position: 'absolute', left: leftX, width: midW, top: rows.top, height: rows.name.row, justifyContent: 'center' }}>
            <Text allowFontScaling={false} numberOfLines={1} style={[DIGITAL, { color: '#FFFFFF', fontSize: fitLabel(v.name, midW, rows.name.font, 1).font }]}>
              {v.name}
            </Text>
          </View>
          <View style={{ position: 'absolute', right: pad + 2, top: rows.top - 1, width: rightW, height: Math.min(big.row, rows.name.row + 4), justifyContent: 'center' }}>
            <Text allowFontScaling={false} numberOfLines={1} style={[DIGITAL, { color: SPACE.gold, fontSize: Math.min(big.font, rows.name.font + 4), textAlign: 'right' }]}>
              {v.mult}
            </Text>
          </View>
          {/* Row 2: each wanted ore, delivered and aboard; the fixed bonus on the right. */}
          <View style={{ position: 'absolute', left: leftX, width: midW, top: rows.wantsTop, height: rows.small.row, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {v.wants.map((w) => (
              <WantChip key={w.ore} w={w} many={v.wants.length > 1} share={(midW - 8 * (v.wants.length - 1)) / v.wants.length} row={rows.small} compact={compact} />
            ))}
          </View>
          <View style={{ position: 'absolute', right: pad + 2, top: rows.wantsTop, width: rightW, height: rows.small.row, justifyContent: 'center' }}>
            <Text allowFontScaling={false} numberOfLines={1} style={[DIGITAL, { color: SPACE.green, fontSize: fitLabel(v.bonus, rightW, rows.small.font, 1).font, textAlign: 'right' }]}>
              {v.bonus}
            </Text>
          </View>
          {/* Row 3: launches left in words and the pace light; the day-shift tag on the right. */}
          <Animated.View style={[{ position: 'absolute', left: leftX, right: pad + 2 + (v.shift ? 64 : 0), top: rows.statusTop, height: rows.small.row, flexDirection: 'row', alignItems: 'center', gap: 5 }, last ? pulseStyle : null]}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: paceColor }} />
            <Text allowFontScaling={false} numberOfLines={1} style={[DIGITAL, { color: last ? SPACE.amber : SPACE.steel, fontSize: statusFit.font, flexShrink: 1 }]}>
              {launches}
              <Text style={{ color: SPACE.steelDim }}>{' · '}</Text>
              <Text style={{ color: paceColor }}>{pace}</Text>
            </Text>
          </Animated.View>
          {v.shift ? (
            <View style={{ position: 'absolute', right: pad + 2, top: rows.statusTop, width: 60, height: rows.small.row, borderRadius: 4, borderWidth: 1, borderColor: alpha(SPACE.gold, 0.7), alignItems: 'center', justifyContent: 'center' }}>
              <Text allowFontScaling={false} numberOfLines={1} style={[DIGITAL, { color: SPACE.gold, fontSize: fitLabel(HAUL_STRINGS.stripShift, 56, rows.small.font - 1, 1).font }]}>
                {HAUL_STRINGS.stripShift}
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text allowFontScaling={false} numberOfLines={1} style={[DIGITAL, { color: SPACE.amber, fontSize: rows.name.font + 2, letterSpacing: 1 }]}>
            {HAUL_STRINGS.pickContract}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** One wanted ore: [icon] bar (delivered solid, aboard lighter) "3.7K/8.4K COPPER". */
function WantChip({ w, many, share, row, compact }: { w: WantView; many: boolean; share: number; row: { font: number; row: number }; compact: boolean }) {
  const text = `${unitShort(w.got + w.aboard)}/${unitShort(w.units)}${many ? '' : ` ${w.name}`}`;
  const barW = many ? (compact ? 20 : 26) : compact ? 34 : 44;
  const room = share - barW - 4 - (many ? row.row + 4 : 0) - 2;
  const fit = fitLabel(text, room, row.font, 1);
  const color = oreColor(w.ore);
  const pct = (n: number) => `${Math.max(0, Math.min(100, (100 * n) / Math.max(1, w.units)))}%` as const;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
      {many ? <GameIcon icon={`art:ore-${w.ore}`} size={row.row} /> : null}
      <View style={{ width: barW, height: 7, borderRadius: 3.5, backgroundColor: SPACE.hull2, overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ width: pct(w.got), height: 7, backgroundColor: color }} />
        <View style={{ width: pct(w.aboard), height: 7, backgroundColor: alpha(color, 0.45) }} />
      </View>
      <Text allowFontScaling={false} numberOfLines={1} style={[DIGITAL, { color: SPACE.steel, fontSize: Math.max(6, fit.font) }]}>
        {text}
      </Text>
    </View>
  );
}
