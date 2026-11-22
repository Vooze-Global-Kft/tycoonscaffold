/**
 * The hold tank (spec 4.1, 4.3): a vertical capsule with stacked ore bands, "34/50" under it. The
 * bands ease over 0.3 s on `unload` events (and drain at a launch): the new fractions go into
 * shared values from the event listener, so the tank costs no React render per tick; only the
 * label re-renders, when its integers change. No action (errata 48): the field gesture layer
 * passes touches here through to the bay.
 *
 * Phones (phone-1, perf-2, Decision 50): the blend of the running ease is computed on this thread
 * from its own copy of the numbers (reading a shared value back here blocks on the UI thread), the
 * ease starts at most every 500 ms (later unloads join the next one), and nothing moves while a
 * full-screen spoke covers the bay (it catches up without easing when the spoke closes). One mapper
 * computes every band's geometry; each band reads its two rectangles and its mark from it.
 */
import { Canvas, Group, Picture, Rect, rrect as skRRect, rect as skRect, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import * as H from '../../../engine/haul';
import { modeEvents } from '../../../state/modeEvents';
import { useGame } from '../../../state/store';
import { drawOreShape } from '../art/ore.draw';
import { alpha, oreColor, SPACE } from '../art/palette';
import { around, circle, fill, litStroke, picture, rrect, stroke } from '../art/pen';
import { drawHoldTank } from '../art/fx.draw';
import type { Rect as Box } from '../layout';
import { HAUL_STRINGS } from '../strings';
import { useHaulUi } from '../uiState';
import { runParams } from '../useRun';
import { DIGITAL, fillIn, fitLabel, labelMetrics, unitShort } from './bayText';

type Run = H.HaulGame & { haul: H.HaulState };

/** The bands' ease, and the least time between two eases (perf-2). */
const EASE_MS = 300;
const EVERY_MS = 500;

interface Fill {
  fractions: number[];
  units: number;
  cap: number;
}

/** The hold as fractions of the freighter limit, in the config's ore order. */
function readFill(): Fill | null {
  const { cfg, game } = useGame.getState();
  const g = game as unknown as Run;
  if (!H.isHaul(cfg) || !g.haul) return null;
  const F = runParams(cfg, g).F;
  const cap = F > 0 ? F : 1;
  return {
    fractions: cfg.haul.ores.map((o) => Math.max(0, (g.haul.hold[o.id] ?? 0) / cap)),
    units: H.holdTotal(g.haul),
    cap: F,
  };
}

const pics = new Map<string, SkPicture>();
function memo(key: string, make: () => SkPicture): SkPicture {
  let p = pics.get(key);
  if (!p) {
    p = make();
    pics.set(key, p);
  }
  return p;
}

/** Every band's top and height ([y0, h0, y1, h1, ...]), from the eased fractions. One mapper for the tank. */
function useBandGeometry(from: SharedValue<number[]>, to: SharedValue<number[]>, k: SharedValue<number>, h: number) {
  const ih = h - 8;
  return useDerivedValue(() => {
    const out: number[] = [];
    let below = 0;
    const n = Math.max(from.value.length, to.value.length);
    for (let i = 0; i < n; i++) {
      const a = from.value[i] ?? 0;
      const f = a + ((to.value[i] ?? 0) - a) * k.value;
      const bh = Math.max(0, Math.min(1 - below, f)) * ih;
      const bottom = h / 2 - 4 - below * ih;
      out.push(bottom - bh, bh);
      below += f;
    }
    return out;
  });
}

/** One band: its bottom is the sum of the bands under it. All on the UI thread. */
function Band({ i, geo, color, ore, w }: { i: number; geo: SharedValue<number[]>; color: string; ore: string; w: number }) {
  const body = useDerivedValue(() => skRect(-w / 2, geo.value[2 * i] ?? 0, w, geo.value[2 * i + 1] ?? 0));
  const line = useDerivedValue(() => skRect(-w / 2, geo.value[2 * i] ?? 0, w, (geo.value[2 * i + 1] ?? 0) > 0 ? 0.8 : 0));
  // Shown only on bands tall enough for it (a picture ignores group opacity: it scales to nothing).
  const markXform = useDerivedValue(() => {
    const y = geo.value[2 * i] ?? 0;
    const bh = geo.value[2 * i + 1] ?? 0;
    return [{ translateX: -w / 2 + 11 }, { translateY: y + bh / 2 }, { scale: bh >= 7 ? 1 : 0 }];
  });
  const mark = memo(`mark:${ore}`, () => picture(around(6), (c) => drawOreShape(c, ore, 3.2, { glow: 0, line: 0.8 })));
  return (
    <Group>
      <Rect rect={body} color={color} />
      <Rect rect={line} color={alpha('#FFFFFF', 0.45)} />
      <Group transform={markXform}>
        <Picture picture={mark} />
      </Group>
    </Group>
  );
}

export function HoldTank({ rect }: { rect: Box }) {
  const ores = useGame((s) => (H.isHaul(s.cfg) ? s.cfg.haul.ores.map((o) => o.id).join(',') : ''))
    .split(',')
    .filter(Boolean);
  const { fontScale, height: winH } = useWindowDimensions();
  const compact = winH < 740;
  const label = labelMetrics(compact ? 11 : 12, fontScale);
  const w = Math.min(compact ? 48 : 56, rect.width - 8);
  const h = Math.max(40, Math.min(compact ? 69 : 88, rect.height - label.row - 8));
  const [shown, setShown] = useState(() => {
    const f = readFill();
    return {
      units: f ? Math.floor(f.units + 1e-9) : 0,
      cap: f ? Math.round(f.cap) : 0,
      full: !!f && f.units >= f.cap - H.EPS,
    };
  });
  const start = useMemo(() => readFill()?.fractions ?? [], []);
  const from = useSharedValue<number[]>(start);
  const to = useSharedValue<number[]>(start);
  const k = useSharedValue(1);
  const geo = useBandGeometry(from, to, k, h);

  useEffect(() => {
    // This thread's copy of what the bands do (never read back from the shared values, phone-1).
    const js = { from: start, to: start, t0: 0 };
    let trailing: ReturnType<typeof setTimeout> | null = null;
    let covered = useHaulUi.getState().spoke !== null;
    const blendNow = () => {
      const u = Math.max(0, Math.min(1, (Date.now() - js.t0) / EASE_MS));
      const e = 1 - Math.pow(1 - u, 3);
      return js.from.map((v, j) => v + ((js.to[j] ?? 0) - v) * e);
    };
    const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, j) => Math.abs(v - (b[j] ?? 0)) < 1e-4);
    const sync = (animate: boolean) => {
      const f = readFill();
      if (!f) return;
      if (covered) return;
      if (animate && !same(f.fractions, js.to)) {
        const since = Date.now() - js.t0;
        if (since < EVERY_MS) {
          // Unloads come several times a second late in a run: they join one ease every 500 ms.
          if (!trailing) trailing = setTimeout(() => {
            trailing = null;
            sync(true);
          }, EVERY_MS - since);
        } else {
          // Ease from where the bands are drawn now.
          const now = blendNow();
          js.from = now;
          js.to = f.fractions;
          js.t0 = Date.now();
          from.value = now;
          to.value = f.fractions;
          k.value = 0;
          k.value = withTiming(1, { duration: EASE_MS, easing: Easing.out(Easing.cubic) });
        }
      } else if (!animate) {
        js.from = f.fractions;
        js.to = f.fractions;
        js.t0 = 0;
        from.value = f.fractions;
        to.value = f.fractions;
        k.value = 1;
      }
      const next = {
        units: Math.floor(f.units + 1e-9),
        cap: Math.round(f.cap),
        full: f.units >= f.cap - H.EPS,
      };
      setShown((p) => (p.units === next.units && p.cap === next.cap && p.full === next.full ? p : next));
    };
    const off = modeEvents.subscribe((events) => {
      if (
        events.some((e) => {
          const t = (e as H.HaulEvent).type;
          return t === 'unload' || t === 'launch' || t === 'holdFull';
        })
      )
        sync(true);
    });
    // Anything else that changes the hold or the limit (a load, a Jump, a freighter upgrade): resync quietly.
    const offStore = useGame.subscribe((s, prev) => {
      if (s.game !== prev.game && ((s.game as unknown as Run).haul?.freighter.level !== (prev.game as unknown as Run).haul?.freighter.level || !(prev.game as unknown as Run).haul)) sync(false);
    });
    // Under a full-screen spoke nothing moves; the tank catches up without easing when it closes.
    const offUi = useHaulUi.subscribe((s, prev) => {
      if ((s.spoke !== null) === (prev.spoke !== null)) return;
      covered = s.spoke !== null;
      if (!covered) sync(false);
    });
    sync(false);
    return () => {
      off();
      offStore();
      offUi();
      if (trailing) clearTimeout(trailing);
    };
  }, [from, to, k, start]);

  const shell = memo(`shell:${w}:${h}:${shown.full}`, () => picture(around(Math.max(w, h) / 2 + 6), (c) => drawHoldTank(c, w, h, [], shown.full)));
  const glass = memo(`glass:${w}:${h}:${shown.full}`, () =>
    picture(around(Math.max(w, h) / 2 + 6), (c) => {
      const outer = rrect(-w / 2, -h / 2, w, h, w / 2);
      c.drawRect({ x: -w / 2 + 7, y: -h / 2 + 4, width: 3, height: h - 8 }, fill(alpha('#FFFFFF', 0.1)));
      litStroke(c, outer, shown.full ? SPACE.green : SPACE.line, 1.5, shown.full ? 1.2 : 0.7);
      if (shown.full) c.drawPath(circle(w / 2 - 6, -h / 2 + 10, 2), stroke(SPACE.green, 1));
    }),
  );
  // Both sides in the board's short figures (9.8K/103K, never 9819/103K: play-8, play:new:10).
  const holdText = `${unitShort(shown.units)}/${unitShort(shown.cap)}`;
  const holdFont = fitLabel(holdText, rect.width, compact ? 11 : 12, fontScale);
  const clip = useMemo(() => skRRect(skRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8), w / 2 - 4, w / 2 - 4), [w, h]);
  const cx = rect.width / 2;
  const cy = 4 + h / 2;
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLabel={fillIn(HAUL_STRINGS.holdLabel, { a: shown.units, b: shown.cap })}
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    >
      <Canvas style={{ width: rect.width, height: h + 10 }}>
        <Group transform={[{ translateX: cx }, { translateY: cy }]}>
          <Picture picture={shell} />
          <Group clip={clip}>
            {ores.map((ore, i) => (
              <Band key={ore} i={i} geo={geo} color={oreColor(ore)} ore={ore} w={w} />
            ))}
          </Group>
          <Picture picture={glass} />
        </Group>
      </Canvas>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h + 10,
          height: label.row,
          justifyContent: 'center',
        }}
      >
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[
            DIGITAL,
            {
              color: shown.full ? SPACE.green : SPACE.steel,
              fontSize: holdFont.font,
              lineHeight: label.row,
              textAlign: 'center',
            },
          ]}
        >
          {holdText}
        </Text>
      </View>
    </View>
  );
}
