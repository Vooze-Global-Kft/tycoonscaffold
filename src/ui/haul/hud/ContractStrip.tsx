/**
 * The contract strip at the top of the map (spec 4.1, Decision 40): the taken contract, delivered
 * over several launches. A floating card with the buyer's emblem and name, the multiplier, each
 * wanted ore as "3.7K/8.4K COPPER" with a bar (delivered solid, aboard the climbing freighter as a
 * lighter segment), the fixed bonus "+₵19.4K", and a status row: "4 LAUNCHES LEFT" in words (the
 * last one pulses) and a pace light ("ON PACE", or "SHORT ON COPPER" in amber). "x2 SHIFT" when the
 * day shift would pay the bonus twice (Decision 53). Nothing on it falls back after a launch: the
 * figure is what is delivered (the same as the board's), the bar adds what is aboard as a lighter
 * segment, and aboard becomes delivered at the warp-out.
 * "PICK A CONTRACT" when none is taken (it glows once each time that happens). Hidden until
 * contracts unlock. Tap: the Contract Board. Target key `contract:strip`.
 *
 * Fixed-height card: three rows at tops that add up to the card, fonts sized by hand from
 * fontScale (shrunk together when the text size setting would overflow the card).
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import * as H from '../../../engine/haul';
import { modeEvents } from '../../../state/modeEvents';
import { GameIcon } from '../../components/GameIcon';
import { useTarget } from '../../hints/targets';
import { alpha, oreColor, SPACE } from '../art/palette';
import type { Rect } from '../layout';
import { clock, moneyShort, rockName } from '../sheets/format';
import { HAUL_STRINGS } from '../strings';
import { runParams, useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import { DIGITAL, fillIn, fitLabel, labelMetrics, unitShort } from './bayText';

/** How long the strip says an order was resized. */
const RESIZED_MS = 4000;

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
  /** The raise the short ore still needs, as a whole percent (the board's figure); 0 when none. */
  raise: number;
  shift: boolean;
  /** The first-drying rock under each wanted ore (slot), only when it dries inside the contract's remaining launches. */
  dryWatch: { ore: string; slot: number; k: number }[];
  /** Seconds the contract's remaining launches take (launches left x the launch interval). */
  horizon: number;
  /** "T-5 DRIES IN 0:20" while such a rock is drilling (live from the slot's life, Decision 64), else ''. */
  dry: string;
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
  raise: 0,
  shift: false,
  dryWatch: [],
  horizon: 0,
  dry: '',
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
  const v = stripBase(cfg, g);
  if (!v.active || v.done || !v.dryWatch.length) return v;
  const dry = dryLine(cfg, g.haul, v.dryWatch, v.horizon);
  return dry === v.dry ? v : { ...v, dry };
}

/**
 * Decision 64, "T-5 DRIES IN 0:20": the wanted ore's rock that dries first, read live from its slot
 * (the seconds change every tick, the view of the contract does not), while it is the same rock and
 * dries inside the contract's remaining launches. Whole seconds, so the strip renders once a second.
 */
function dryLine(cfg: H.HaulConfig, h: H.HaulState, watch: { ore: string; slot: number; k: number }[], horizon: number): string {
  let best: { slot: number; life: number } | null = null;
  for (const w of watch) {
    const s = h.slots[w.slot];
    // The rules' seconds (when given) scaled by how much of the rock's drilling life is left since.
    const life = s ? s.life * w.k : 0;
    if (!s?.claimed || s.respawnAt !== null || s.rockN < 0 || s.ore !== w.ore || !(life > 0) || !(life < horizon)) continue;
    if (!best || life < best.life) best = { slot: w.slot, life };
  }
  return best ? fillIn(HAUL_STRINGS.stripDries, { rock: rockName(cfg, best.slot), t: clock(Math.ceil(best.life)) }) : '';
}

/** The want's `dries` field when the rules provide it (Decision 64), undefined while they do not. */
type Dries = { slot: number; seconds: number } | null;

/**
 * The first-drying rock of `ore` among the routes feeding it: the rules' `dries` when the view has
 * one, else the claimed rock of that ore with drones on it and the least life.
 */
function dryingSlot(h: H.HaulState, ore: string, dries: Dries | undefined): { slot: number; k: number } | null {
  if (dries !== undefined) {
    if (!dries) return null;
    const life = h.slots[dries.slot]?.life ?? 0;
    return { slot: dries.slot, k: life > 0 && dries.seconds > 0 ? dries.seconds / life : 1 };
  }
  let slot: number | null = null;
  let life = Infinity;
  h.slots.forEach((s, i) => {
    if (!s?.claimed || s.respawnAt !== null || s.rockN < 0 || s.ore !== ore || !(s.haulers > 0) || !(s.life > 0)) return;
    if (s.life < life) {
      life = s.life;
      slot = i;
    }
  });
  return slot === null ? null : { slot, k: 1 };
}

function stripBase(cfg: H.HaulConfig, g: H.HaulGame & { haul: H.HaulState }): StripView {
  const h = g.haul;
  if (!h.contracts.unlocked) return NONE;
  const k = h.contracts.active;
  const c = k === null ? null : h.contracts.board[k];
  if (!c || k === null || c.taken === false) return { ...NONE, unlocked: true };
  // The pace figure counts the next launch from the real hold (Decision 56): the hold in twentieths of
  // a freighter keeps the strip's "NEEDS +N %" with the board's without a new view per tick.
  const F = runParams(cfg, g).F;
  const fill = F > 0 ? Math.floor((H.holdTotal(h) / F) * 20) : 0;
  const routes = h.slots.map((s) => (s.claimed ? `${s.haulers}.${s.rigLevel}.${s.ore}` : '')).join(',') + `|${h.freighter.level}|${fill}`;
  const shift = (g as { haulStats?: H.HaulStats }).haulStats?.shift;
  if (memo && memo.cfg === cfg && memo.contracts === h.contracts && memo.phase === h.freighter.phase && memo.toward === h.freighter.contract && memo.routes === routes && memo.shift === shift) return memo.view;
  let view: StripView;
  try {
    const params = runParams(cfg, g);
    // Only the taken contract: the strip never needs the offers' views.
    const one = { ...h, contracts: { ...h.contracts, board: [c], active: 0 } } as H.HaulState;
    const cv = H.contractViews(cfg, params, one, (g as { haulStats?: H.HaulStats }).haulStats)[0];
    const wants = cv.wants.map((w) => {
      // A want the rules count as delivered (within UNIT_TOL, rules-10) reads full: never "69/70" for 69.7.
      const done = !(w.left > 0);
      const got = done && w.aboard <= 0 ? w.units : Math.min(w.units, w.got);
      return {
        ore: w.ore,
        name: oreNameOf(cfg, w.ore),
        got,
        aboard: done ? Math.max(0, w.units - got) : Math.max(0, Math.min(w.units - got, w.aboard)),
        units: w.units,
      };
    });
    view = {
      unlocked: true,
      active: true,
      buyer: c.buyer,
      name: (cfg.haul.contracts.buyers.find((b) => b.id === c.buyer)?.name ?? c.buyer).toUpperCase(),
      wants,
      mult: `×${c.mult.toFixed(1)}`,
      left: cv.launchesLeft,
      // One figure with the board and the receipt: the board's short money format.
      bonus: cv.bonus > 0 ? `+${moneyShort(cfg, cv.bonus)}` : '',
      done: cv.wants.every((w) => !(w.left > 0)),
      onPace: cv.onPace,
      short: cv.shortOre ? oreNameOf(cfg, cv.shortOre) : '',
      // The board's figure (ContractBoardSheet: Math.max(1, round(raise x 100)) of the short ore).
      raise: raisePercent((cv.wants.find((w) => w.ore === cv.shortOre) as { raise?: number } | undefined)?.raise),
      shift: cv.shift,
      dryWatch: cv.wants.flatMap((w) => {
        if (!(w.left > 0)) return [];
        const d = dryingSlot(h, w.ore, (w as { dries?: Dries }).dries);
        return d === null ? [] : [{ ore: w.ore, ...d }];
      }),
      horizon: cv.launchesLeft * launchInterval(cfg, params, h),
      dry: '',
    };
  } catch {
    view = { ...NONE, unlocked: true };
  }
  memo = { cfg, contracts: h.contracts, phase: h.freighter.phase, toward: h.freighter.contract, routes, shift, view };
  return view;
}

/** Seconds between two launches as the rules count them for the contracts (the basis's interval), Infinity when unknown. */
function launchInterval(cfg: H.HaulConfig, params: H.HaulParams, h: H.HaulState): number {
  try {
    const t = H.contractBasis(cfg, params, h).interval;
    return t > 0 ? t : Infinity;
  } catch {
    return Infinity;
  }
}

/** A want's raise as the board writes it (whole percent, at least 1), or 0 when there is no figure. */
function raisePercent(raise: number | undefined): number {
  return typeof raise === 'number' && raise > 0 && Number.isFinite(raise) ? Math.max(1, Math.round(raise * 100)) : 0;
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
  // Decision 56: a freighter level resizes the taken order; the strip says so for a moment instead
  // of letting the figure jump silently ("ORDER RESIZED · 133", the new order, as the bar shows it).
  const [resized, setResized] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = modeEvents.subscribe((events) => {
      const e = (events as H.HaulEvent[]).find((x) => x.type === 'contractResized' && x.contract.taken) as Extract<H.HaulEvent, { type: 'contractResized' }> | undefined;
      if (!e || !(e.factor > 0) || Math.abs(e.factor - 1) < 1e-9) return;
      // The new order size, the figure the bar beside it shows (check3 NEW[5]: not what is left).
      setResized(fillIn(HAUL_STRINGS.stripResized, { n: e.contract.wants.map((w) => unitShort(w.units)).join(' + ') }));
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setResized(null), RESIZED_MS);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, []);
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
  // While the freighter climbs, what it carries for the contract (play-4: the launch is never lost from view).
  const aboard = v.wants.reduce((a, w) => a + w.aboard, 0);
  const statusW = midW + rightW - (v.shift ? 64 : 0) - 10;
  const statusBase = compact ? 9.5 : 10.5;
  // Short of pace: the board's words and figure ("NEEDS +27 % COPPER"); "+27 % COPPER" only when that
  // does not fit at a readable size (85 % of the row's type), "NEEDS MORE COPPER" when there is no figure.
  const shortWords = () => {
    if (!v.raise) return fillIn(HAUL_STRINGS.stripShort, { ore: v.short });
    const full = fillIn(HAUL_STRINGS.stripRaise, { p: v.raise, ore: v.short });
    const fits = fitLabel(`${launches} · ${full}`, statusW, statusBase, fontScale).font >= labelMetrics(statusBase, fontScale).font * 0.85;
    return fits ? full : fillIn(HAUL_STRINGS.stripRaiseShort, { p: v.raise, ore: v.short });
  };
  // A wanted ore's rock dries before the contract ends (Decision 64): said instead of ON PACE, and in
  // front of the shortfall when both fit at a readable size ("T-5 DRIES IN 0:20 · +61 % IRON").
  const dryWords = () => {
    if (v.onPace || !v.raise) return v.dry;
    const both = `${v.dry} · ${fillIn(HAUL_STRINGS.stripRaiseShort, { p: v.raise, ore: v.short })}`;
    return fitLabel(`${launches} · ${both}`, statusW, statusBase, fontScale).font >= labelMetrics(statusBase, fontScale).font * 0.85 ? both : v.dry;
  };
  const drying = !!v.dry && !v.done && aboard < 1 && !resized;
  const pace = resized && !v.done && aboard < 1 ? resized : v.done ? HAUL_STRINGS.stripMet : aboard >= 1 ? fillIn(HAUL_STRINGS.stripAboard, { n: unitShort(aboard) }) : drying ? dryWords() : v.onPace ? HAUL_STRINGS.stripOnPace : shortWords();
  const paceColor = resized && pace === resized ? SPACE.white : drying ? SPACE.amber : v.done || aboard >= 1 || v.onPace ? SPACE.green : SPACE.amber;
  const status = `${launches} · ${pace}`;
  const statusFit = fitLabel(status, statusW, statusBase, fontScale);
  const label = v.active
    ? fillIn(HAUL_STRINGS.stripLabel, {
        buyer: v.name,
        wants: v.wants.map((w) => `${unitShort(w.got)}/${unitShort(w.units)} ${w.name}`).join(', '),
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

/** One wanted ore: [icon] bar (delivered solid, aboard lighter) "3.7K/8.4K COPPER" (delivered / wanted). */
function WantChip({ w, many, share, row, compact }: { w: WantView; many: boolean; share: number; row: { font: number; row: number }; compact: boolean }) {
  const text = `${unitShort(w.got)}/${unitShort(w.units)}${many ? '' : ` ${w.name}`}`;
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
