/**
 * The hold tank (spec 4.1, 4.3): a vertical capsule with stacked ore bands, "34/50" under it. The
 * bands ease over 0.3 s on `unload` events (and drain at a launch): the new fractions go into
 * shared values from the event listener, so the tank costs no React render per tick; only the
 * label re-renders, when its integers change. No action (errata 48): the field gesture layer
 * passes touches here through to the bay.
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
import { DIGITAL, labelMetrics } from './bayText';

type Run = H.HaulGame & { haul: H.HaulState };

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
  const F = H.haulParams(cfg, g).F;
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

/** One band: its bottom is the sum of the bands under it. All on the UI thread. */
function Band({ i, from, to, k, color, ore, w, h }: { i: number; from: SharedValue<number[]>; to: SharedValue<number[]>; k: SharedValue<number>; color: string; ore: string; w: number; h: number }) {
  const ih = h - 8;
  const geo = useDerivedValue(() => {
    let below = 0;
    for (let j = 0; j < i; j++) below += (from.value[j] ?? 0) + ((to.value[j] ?? 0) - (from.value[j] ?? 0)) * k.value;
    const f = (from.value[i] ?? 0) + ((to.value[i] ?? 0) - (from.value[i] ?? 0)) * k.value;
    const bh = Math.max(0, Math.min(1 - below, f)) * ih;
    const bottom = h / 2 - 4 - below * ih;
    return { y: bottom - bh, h: bh };
  });
  const y = useDerivedValue(() => geo.value.y);
  const bh = useDerivedValue(() => geo.value.h);
  const lineY = useDerivedValue(() => geo.value.y);
  // Shown only on bands tall enough for it (a picture ignores group opacity: it scales to nothing).
  const markXform = useDerivedValue(() => [{ translateX: -w / 2 + 11 }, { translateY: geo.value.y + geo.value.h / 2 }, { scale: geo.value.h >= 7 ? 1 : 0 }]);
  const mark = memo(`mark:${ore}`, () => picture(around(6), (c) => drawOreShape(c, ore, 3.2, { glow: 0, line: 0.8 })));
  return (
    <Group>
      <Rect x={-w / 2} y={y} width={w} height={bh} color={color} />
      <Rect x={-w / 2} y={lineY} width={w} height={0.8} color={alpha('#FFFFFF', 0.45)} />
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

  useEffect(() => {
    const sync = (animate: boolean) => {
      const f = readFill();
      if (!f) return;
      if (animate) {
        // Ease from where the bands are drawn now.
        const now = from.value.map((v, j) => v + ((to.value[j] ?? 0) - v) * k.value);
        from.value = now;
        to.value = f.fractions;
        k.value = 0;
        k.value = withTiming(1, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
      } else {
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
    sync(false);
    return () => {
      off();
      offStore();
    };
  }, [from, to, k]);

  const shell = memo(`shell:${w}:${h}:${shown.full}`, () => picture(around(Math.max(w, h) / 2 + 6), (c) => drawHoldTank(c, w, h, [], shown.full)));
  const glass = memo(`glass:${w}:${h}:${shown.full}`, () =>
    picture(around(Math.max(w, h) / 2 + 6), (c) => {
      const outer = rrect(-w / 2, -h / 2, w, h, w / 2);
      c.drawRect({ x: -w / 2 + 7, y: -h / 2 + 4, width: 3, height: h - 8 }, fill(alpha('#FFFFFF', 0.1)));
      litStroke(c, outer, shown.full ? SPACE.green : SPACE.line, 1.5, shown.full ? 1.2 : 0.7);
      if (shown.full) c.drawPath(circle(w / 2 - 6, -h / 2 + 10, 2), stroke(SPACE.green, 1));
    }),
  );
  const clip = useMemo(() => skRRect(skRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8), w / 2 - 4, w / 2 - 4), [w, h]);
  const cx = rect.width / 2;
  const cy = 4 + h / 2;
  return (
    <View
      pointerEvents="none"
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
              <Band key={ore} i={i} from={from} to={to} k={k} color={oreColor(ore)} ore={ore} w={w} h={h} />
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
              fontSize: label.font,
              lineHeight: label.row,
              textAlign: 'center',
            },
          ]}
        >
          {`${shown.units}/${shown.cap}`}
        </Text>
      </View>
    </View>
  );
}
