/**
 * Feedback drawn over the map and the bay (spec 4.2, 4.3), one full-screen canvas that takes no
 * touches, plus the ghost slot's confirm chip:
 * - the drag line while a drone or the flare is dragged: from where it left to the finger, locking
 *   onto the target it would drop on (UI thread: it reads ../gestures/fieldInput's shared value);
 *   the dragged drone or flare rides under the finger;
 * - the selection of tap-tap (a drone or the flare): its origin ringed, the rocks it may go to marked;
 * - credit glyphs falling from the warp flash into the dock counter (at most 12, one credit_tick
 *   each as it lands), then "+₵612" over the counter; the "CONTRACT MET" stamp on the receipt;
 * - a "DRY" tag rising from a rock whose life ran out;
 * - "Claim ₵21": the confirm chip over a tapped ghost slot (tap it, or the slot again, to claim).
 * Listens to src/state/modeEvents.ts; React renders only when one of these starts or ends.
 */
import { Canvas, DashPathEffect, Group, Path, Picture, Skia, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { formatMoney } from '../../../engine/format';
import * as H from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { fx } from '../../../services/fx';
import { modeEvents } from '../../../state/modeEvents';
import { useGame } from '../../../state/store';
import { targets } from '../../hints/targets';
import { drawDrone } from '../art/drone.draw';
import { drawCreditGlyph, drawFlare } from '../art/fx.draw';
import { alpha, SPACE } from '../art/palette';
import { around, circle, dashed, picture, stroke } from '../art/pen';
import { spokePictures } from '../art/Spokes';
import { CLAIM_CONFIRM_MS, DRAG_DRONE, DRAG_FLARE, dragLine, useFieldInput } from '../gestures/fieldInput';
import type { FieldLayout, Pt } from '../layout';
import { HAUL_STRINGS } from '../strings';
import { useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import { DIGITAL, bayWord, labelMetrics } from './bayText';
import { GLYPH_FALL_MS, GLYPH_GAP_MS, GLYPH_LEAD_MS, MAX_GLYPHS } from './feedbackTiming';
import { useMapLayout } from './useMapLayout';

const pics = new Map<string, SkPicture>();
function memo(key: string, make: () => SkPicture): SkPicture {
  let p = pics.get(key);
  if (!p) {
    p = make();
    pics.set(key, p);
  }
  return p;
}

// ---------------------------------------------------------------------------------------------
// Drag line (UI thread)
// ---------------------------------------------------------------------------------------------

/** The drag line's glow, made once (colour maths is not UI-thread code). */
const GLOW = {
  gold: alpha(SPACE.gold, 0.12),
  goldSnap: alpha(SPACE.gold, 0.28),
  line: alpha(SPACE.line, 0.12),
  lineSnap: alpha(SPACE.line, 0.28),
};

function DragLayer() {
  const path = useDerivedValue(() => {
    const d = dragLine.value;
    const b = Skia.PathBuilder.Make();
    if (d.kind === DRAG_DRONE || d.kind === DRAG_FLARE) {
      b.moveTo(d.x0, d.y0);
      b.lineTo(d.snap ? d.sx : d.x, d.snap ? d.sy : d.y);
    }
    return b.build();
  });
  const color = useDerivedValue(() => {
    const d = dragLine.value;
    return d.kind === DRAG_FLARE ? SPACE.gold : d.color || SPACE.line;
  });
  const glowColor = useDerivedValue(() => {
    const d = dragLine.value;
    return d.kind === DRAG_FLARE ? (d.snap ? GLOW.goldSnap : GLOW.gold) : d.snap ? GLOW.lineSnap : GLOW.line;
  });
  const ring = useDerivedValue(() => {
    const d = dragLine.value;
    const b = Skia.PathBuilder.Make();
    if (d.kind === DRAG_DRONE || d.kind === DRAG_FLARE) {
      if (d.snap) b.addCircle(d.sx, d.sy, 32);
      else b.addCircle(d.x, d.y, 9);
    }
    return b.build();
  });
  const visible = useDerivedValue(() => (dragLine.value.kind === DRAG_DRONE || dragLine.value.kind === DRAG_FLARE ? 1 : 0));
  // A picture ignores a group's opacity unless the group draws into a layer: hidden pieces scale to nothing instead.
  const droneShow = useDerivedValue(() => [{ scale: dragLine.value.kind === DRAG_DRONE ? 1 : 0 }]);
  const flareShow = useDerivedValue(() => [{ scale: dragLine.value.kind === DRAG_FLARE ? 1 : 0 }]);
  const carry = useDerivedValue(() => {
    const d = dragLine.value;
    // Above the fingertip, so the thumb never hides what it carries; nose toward the target.
    const tx = d.snap ? d.sx : d.x;
    const ty = d.snap ? d.sy : d.y - 34;
    const a = Math.atan2(ty - d.y0, tx - d.x0);
    return [{ translateX: d.x }, { translateY: d.y - 34 }, { rotate: d.kind === DRAG_DRONE ? a : 0 }, { scale: 1.25 }];
  });
  const drone = memo('drag-drone', () => picture(around(14), (c) => drawDrone(c, { ore: null, loaded: false })));
  const flare = memo('drag-flare', () => picture(around(16), (c) => drawFlare(c, true)));
  return (
    <Group opacity={visible} layer>
      <Path path={path} style="stroke" strokeWidth={7} color={glowColor} strokeCap="round" />
      <Path path={path} style="stroke" strokeWidth={1.8} color={color} strokeCap="round">
        <DashPathEffect intervals={[6, 4]} />
      </Path>
      <Path path={ring} style="stroke" strokeWidth={1.6} color={color} />
      <Group transform={carry}>
        <Group transform={droneShow}>
          <Picture picture={drone} />
        </Group>
        <Group transform={flareShow}>
          <Picture picture={flare} />
        </Group>
      </Group>
    </Group>
  );
}

// ---------------------------------------------------------------------------------------------
// Selection (tap-tap)
// ---------------------------------------------------------------------------------------------

function SelectionLayer({ layout }: { layout: FieldLayout }) {
  const sel = useHaulUi((s) => s.selection);
  const ok = useRunShallow((_c, g) => g.haul.slots.map((s, i) => (sel?.kind === 'flare' ? H.canFlare(g, i) : s.claimed && !(sel?.kind === 'drone' && sel.from === i))), [] as boolean[]);
  const pic = useMemo(() => {
    if (!sel) return null;
    const gold = sel.kind === 'flare';
    const col = gold ? SPACE.gold : SPACE.line;
    return picture({ x: 0, y: 0, w: layout.width, h: layout.height }, (c) => {
      // The origin: the rack's arms, the route's chip or the launcher, ringed.
      if (sel.kind === 'drone' && sel.from === 'rack') {
        for (const r of [layout.rack.left, layout.rack.right])
          c.drawRRect(
            {
              rect: {
                x: r.x - 3,
                y: r.y - 3,
                width: r.width + 6,
                height: r.height + 6,
              },
              rx: 12,
              ry: 12,
            },
            stroke(alpha(col, 0.85), 1.6),
          );
      } else if (sel.kind === 'drone') {
        const chip = layout.chips.find((q) => q.slot === sel.from);
        if (chip) c.drawPath(circle(chip.x, chip.y, 20), stroke(col, 2));
      } else {
        const f = layout.zones.flare;
        c.drawPath(circle(f.x + f.width / 2, f.y + f.height / 2, f.width * 0.55), stroke(alpha(col, 0.9), 1.6));
      }
      // Where it may go: a dashed ring on each rock.
      layout.rocks.forEach((r) => {
        if (!ok[r.slot]) return;
        c.drawPath(circle(r.x, r.y, r.r + 9), dashed(alpha(col, 0.85), 1.4, 5, 4));
      });
    });
  }, [sel, ok, layout]);
  if (!pic) return null;
  return <Picture picture={pic} />;
}

// ---------------------------------------------------------------------------------------------
// Credit glyphs
// ---------------------------------------------------------------------------------------------

interface Flight {
  from: Pt;
  to: Pt;
  n: number;
}

function Glyph({ i, clock, flight }: { i: number; clock: SharedValue<number>; flight: Flight }) {
  const pic = memo('glyph', () => picture(around(12), (c) => drawCreditGlyph(c, 13)));
  const side = ((i * 37) % 7) - 3;
  const fx0 = flight.from.x + side * 9;
  const fy0 = flight.from.y + ((i * 13) % 5) * 4;
  const tx = flight.to.x + (((i * 5) % 5) - 2) * 4;
  const ty = flight.to.y;
  const n = flight.n;
  const xf = useDerivedValue(() => {
    const k = Math.max(0, Math.min(1, (clock.value - i * GLYPH_GAP_MS) / GLYPH_FALL_MS));
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const x = fx0 + (tx - fx0) * e + Math.sin(k * Math.PI) * side * 6;
    const y = fy0 + (ty - fy0) * Math.pow(k, 1.5);
    const live = i < n && k > 0 && k < 1;
    return [{ translateX: x }, { translateY: y }, { scale: live ? 1 - 0.25 * k : 0 }];
  });
  const op = useDerivedValue(() => {
    if (i >= n) return 0;
    const k = (clock.value - i * GLYPH_GAP_MS) / GLYPH_FALL_MS;
    return k <= 0 || k >= 1 ? 0 : k < 0.1 ? k / 0.1 : 1;
  });
  return (
    <Group transform={xf} opacity={op} layer>
      <Picture picture={pic} />
    </Group>
  );
}

// ---------------------------------------------------------------------------------------------
// The layer
// ---------------------------------------------------------------------------------------------

/** How many glyphs a payout earns: more for bigger payouts, 4 to 12. */
export function glyphCount(payout: number): number {
  if (!(payout > 0)) return 0;
  return Math.max(4, Math.min(MAX_GLYPHS, Math.round(4 + Math.log2(1 + payout / 10))));
}

interface Floater {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

function FloatText({ f, onDone }: { f: Floater; onDone: (id: number) => void }) {
  const k = useSharedValue(0);
  const { fontScale } = useWindowDimensions();
  const m = labelMetrics(13, fontScale);
  useEffect(() => {
    k.value = withTiming(1, {
      duration: 1300,
      easing: Easing.out(Easing.cubic),
    });
    const t = setTimeout(() => onDone(f.id), 1350);
    return () => {
      clearTimeout(t);
      cancelAnimation(k);
    };
  }, [f.id, k, onDone]);
  const style = useAnimatedStyle(() => ({
    opacity: k.value < 0.15 ? k.value / 0.15 : 1 - Math.max(0, (k.value - 0.6) / 0.4),
    transform: [{ translateY: -26 * k.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: f.x - 80,
          top: f.y - m.row / 2,
          width: 160,
          height: m.row,
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[
          DIGITAL,
          {
            color: f.color,
            fontSize: m.font,
            lineHeight: m.row,
            textAlign: 'center',
            textShadowColor: alpha(f.color, 0.5),
            textShadowRadius: 6,
          },
        ]}
      >
        {f.text}
      </Text>
    </Animated.View>
  );
}

function ClaimChip({ layout }: { layout: FieldLayout }) {
  const armed = useFieldInput((s) => s.claimArmed);
  const info = useRunShallow(
    (cfg, g) => {
      if (!armed) return { cost: '', can: false };
      const cost = H.claimCost(cfg, g, armed.slot);
      return {
        cost: Number.isFinite(cost) ? formatMoney(cost, cfg.strings.currencySymbol) : '',
        can: H.affordable(g.cash, cost),
      };
    },
    { cost: '', can: false },
  );
  const { fontScale } = useWindowDimensions();
  const m = labelMetrics(13, fontScale);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => {
      if (useFieldInput.getState().claimArmed === armed) useFieldInput.getState().arm(null);
    }, CLAIM_CONFIRM_MS);
    return () => clearTimeout(t);
  }, [armed]);
  if (!armed || !info.cost) return null;
  const rock = layout.rocks[armed.slot];
  if (!rock) return null;
  const w = 128;
  const h = m.row + 14;
  const x = Math.max(12, Math.min(layout.width - w - 12, rock.x - w / 2));
  const y = rock.y - rock.r - h - 10 < layout.zones.comms.y + layout.zones.comms.height + 4 ? rock.y + rock.r + 18 : rock.y - rock.r - h - 10;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        useFieldInput.getState().arm(null);
        haulActions.claimSlot(armed.slot);
      }}
      hitSlop={8}
      style={[
        styles.chip,
        {
          left: x,
          top: y,
          width: w,
          height: h,
          borderColor: info.can ? SPACE.line : SPACE.steelDim,
          backgroundColor: info.can ? alpha(SPACE.line, 0.16) : SPACE.hull1,
        },
      ]}
    >
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[
          DIGITAL,
          {
            color: info.can ? '#E6FBFF' : SPACE.steel,
            fontSize: m.font,
            lineHeight: m.row,
          },
        ]}
      >
        {`${HAUL_STRINGS.claim} ${info.cost}`}
      </Text>
    </Pressable>
  );
}

export function FloatingFeedback() {
  const layout = useMapLayout();
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(1e6);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const stampK = useSharedValue(0);
  const stampOp = useSharedValue(0);
  const [stampOn, setStampOn] = useState(false);
  const nextId = useRef(1);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const counterCentre = (): Pt => {
      const L = layoutRef.current;
      const r = targets.get('bay:counter') ?? L.zones.counter;
      return { x: r.x + r.width / 2, y: r.y + r.height * 0.36 };
    };
    const off = modeEvents.subscribe((events) => {
      const cfg = useGame.getState().cfg as H.HaulConfig;
      const sym = cfg.strings?.currencySymbol ?? '';
      for (const e of events as H.HaulEvent[]) {
        if (e.type === 'warp') {
          const n = glyphCount(e.payout);
          const L = layoutRef.current;
          const to = counterCentre();
          const from = {
            x: L.station.x,
            y: L.zones.comms.y + L.zones.comms.height + 36,
          };
          setFlight({ from, to, n });
          cancelAnimation(clock);
          clock.value = 0;
          const total = (n - 1) * GLYPH_GAP_MS + GLYPH_FALL_MS;
          clock.value = withDelay(
            GLYPH_LEAD_MS,
            withTiming(total + 20, {
              duration: total + 20,
              easing: Easing.linear,
            }),
          );
          for (let i = 0; i < n; i++) later(GLYPH_LEAD_MS + i * GLYPH_GAP_MS + GLYPH_FALL_MS, () => fx.play('credit_tick'));
          later(GLYPH_LEAD_MS + total + 40, () => setFlight(null));
          later(GLYPH_LEAD_MS + GLYPH_FALL_MS, () =>
            setFloaters((fl) => [
              ...fl.slice(-3),
              {
                id: nextId.current++,
                text: `+${formatMoney(e.payout, sym)}`,
                x: to.x,
                y: to.y - 34,
                color: e.met ? SPACE.green : SPACE.gold,
              },
            ]),
          );
        } else if (e.type === 'contractMet') {
          // The stamp lands on the receipt as the money does.
          cancelAnimation(stampK);
          cancelAnimation(stampOp);
          stampK.value = 0;
          stampOp.value = 0;
          stampK.value = withDelay(GLYPH_LEAD_MS + GLYPH_FALL_MS, withTiming(1, { duration: 220, easing: Easing.in(Easing.cubic) }));
          stampOp.value = withDelay(GLYPH_LEAD_MS + GLYPH_FALL_MS, withSequence(withTiming(1, { duration: 120 }), withDelay(1500, withTiming(0, { duration: 400 }))));
          setStampOn(true);
          later(GLYPH_LEAD_MS + GLYPH_FALL_MS + 2100, () => setStampOn(false));
        } else if (e.type === 'dry') {
          const r = layoutRef.current.rocks[e.slot];
          if (r)
            setFloaters((fl) => [
              ...fl.slice(-3),
              {
                id: nextId.current++,
                text: bayWord('tagDry', 'DRY'),
                x: r.x,
                y: r.y - r.r - 10,
                color: SPACE.red,
              },
            ]);
        }
      }
    });
    return () => {
      off();
      timers.forEach(clearTimeout);
    };
  }, [clock, stampK, stampOp]);

  const done = useMemo(() => (id: number) => setFloaters((fl) => fl.filter((f) => f.id !== id)), []);
  const stampW = Math.min(150, layout.zones.counter.width - 20);
  const stamp = spokePictures.receiptStamp(stampW);
  const sc = layout.zones.counter;
  const stampXf = useDerivedValue(() => [{ translateX: sc.x + sc.width / 2 }, { translateY: sc.y + sc.height / 2 }, { scale: 1.4 - 0.4 * stampK.value }]);
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* The canvas sits in a view that takes no touches (a canvas alone may catch them on the web). */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
        <Canvas style={{ width, height }}>
          <SelectionLayer layout={layout} />
          <DragLayer />
          {flight ? Array.from({ length: flight.n }, (_, i) => <Glyph key={i} i={i} clock={clock} flight={flight} />) : null}
          {stampOn ? (
            <Group transform={stampXf} opacity={stampOp} layer>
              <Picture picture={stamp} />
            </Group>
          ) : null}
        </Canvas>
      </View>
      {floaters.map((f) => (
        <FloatText key={f.id} f={f} onDone={done} />
      ))}
      <ClaimChip layout={layout} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
