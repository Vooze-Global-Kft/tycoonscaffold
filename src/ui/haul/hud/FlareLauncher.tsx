/**
 * The Survey Flare launcher (spec 2.8, 4.1): the flare and its charge count, right of the launch
 * track. Hidden until the run's first charge; with no charge left it shows the flare dark and the
 * real time to the next free one. Drawn here, touched through the field gesture layer (errata 48):
 * drag the flare onto a rock, or tap it (selected: a gold rim) and then the rock. Target `bay:flare`.
 *
 * The card itself is a plain view (its fill and rim), so the refill timer always sits inside a
 * card even before the canvas has drawn its first frame (play-23). A charge that arrives (a free
 * one, or the Trade Post's ad) pops the card and rises "+1" over it (play-14).
 */
import { Canvas, Group, Picture, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { HAUL_STRINGS } from '../strings';
import { targets } from '../../hints/targets';
import { drawChargePlate, drawFlare } from '../art/fx.draw';
import { alpha, SPACE } from '../art/palette';
import { around, glow, picture } from '../art/pen';
import type { Rect } from '../layout';
import { useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import { DIGITAL, fillIn, labelMetrics } from './bayText';

const pics = new Map<string, SkPicture>();
function memo(key: string, make: () => SkPicture): SkPicture {
  let p = pics.get(key);
  if (!p) {
    p = make();
    pics.set(key, p);
  }
  return p;
}

const clockText = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export function FlareLauncher({ rect }: { rect: Rect }) {
  // Under a full-screen spoke or overlay the card is hidden: its selectors hold their last value,
  // so the refill countdown does not redraw the canvas once a second unseen (device:new:2).
  const covered = useHaulUi((s) => s.spoke !== null || s.overlay !== null);
  const f = useRunShallow(
    (cfg, g) => ({
      charges: g.haul.flare.charges,
      shown: g.haul.flare.charges > 0 || g.haul.clock >= cfg.haul.flare.firstAt,
    }),
    { charges: 0, shown: false },
    covered,
  );
  const { refill } = useRunShallow((_c, g) => ({ refill: g.haul.flare.charges > 0 ? '' : clockText(g.haul.flare.nextFreeAt - g.haul.clock) }), { refill: '' }, covered);
  const selected = useHaulUi((s) => s.selection?.kind === 'flare');
  const { fontScale } = useWindowDimensions();
  const label = labelMetrics(10, fontScale);
  const s = Math.min(rect.width, rect.height);

  useEffect(() => {
    if (!f.shown) return;
    targets.set('bay:flare', { x: rect.x, y: rect.y, width: s, height: s });
    return () => targets.set('bay:flare', null);
  }, [f.shown, rect.x, rect.y, s]);

  // A new charge: the card pops and "+1" rises over it (play-14).
  const pop = useSharedValue(1);
  const rise = useSharedValue(0);
  const last = useRef(f.charges);
  const [gain, setGain] = useState(0);
  useEffect(() => {
    const before = last.current;
    last.current = f.charges;
    if (!(f.charges > before)) return;
    setGain((n) => n + 1);
    pop.value = withSequence(withTiming(1.12, { duration: 120 }), withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
    rise.value = 0;
    rise.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
    const t = setTimeout(() => setGain(0), 1250);
    return () => clearTimeout(t);
  }, [f.charges, pop, rise]);
  useEffect(
    () => () => {
      cancelAnimation(pop);
      cancelAnimation(rise);
    },
    [pop, rise],
  );
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const riseStyle = useAnimatedStyle(() => ({ opacity: rise.value < 0.15 ? rise.value / 0.15 : 1 - Math.max(0, (rise.value - 0.6) / 0.4), transform: [{ translateY: -22 * rise.value }] }));

  if (!f.shown) return null;
  const on = f.charges > 0;
  const halo = selected ? memo(`halo:${s}`, () => picture({ x: -4, y: -4, w: s + 8, h: s + 8 }, (c) => glow(c, s / 2, s / 2, s * 0.6, SPACE.gold, 0.35))) : null;
  const flare = memo(`flare:${on}`, () => picture(around(16), (c) => drawFlare(c, on)));
  const plate = memo(`plate:${f.charges}`, () => picture(around(14), (c) => drawChargePlate(c, f.charges)));
  const k = s / 72;
  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLabel={fillIn(HAUL_STRINGS.flareLabel, { n: f.charges })}
      style={[
        {
          position: 'absolute',
          left: rect.x,
          top: rect.y,
          width: s,
          height: s,
          borderRadius: 14,
          backgroundColor: SPACE.hull0,
          borderWidth: selected ? 1.6 : 1,
          borderColor: alpha(SPACE.gold, selected ? 1 : on ? 0.5 : 0.22),
        },
        popStyle,
      ]}
    >
      <Canvas style={{ position: 'absolute', left: -1, top: -1, width: s, height: s }}>
        {halo ? <Picture picture={halo} /> : null}
        <Group transform={[{ translateX: s / 2 }, { translateY: s / 2 - 4 * k }, { scale: 1.6 * k }]} opacity={on ? 1 : 0.45} layer>
          <Picture picture={flare} />
        </Group>
        <Group transform={[{ translateX: s - 16 * k }, { translateY: s - 12 * k }, { scale: k }]}>
          <Picture picture={plate} />
        </Group>
      </Canvas>
      {refill ? (
        <View
          style={{
            position: 'absolute',
            left: 6,
            top: s - label.row - 4,
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
                color: SPACE.steel,
                fontSize: label.font,
                lineHeight: label.row,
              },
            ]}
          >
            {refill}
          </Text>
        </View>
      ) : null}
      {gain > 0 ? (
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: -label.row - 2, height: label.row + 4, alignItems: 'center', justifyContent: 'center' }, riseStyle]}>
          <Text allowFontScaling={false} numberOfLines={1} style={[DIGITAL, { color: SPACE.gold, fontSize: label.font + 3, textShadowColor: alpha(SPACE.gold, 0.6), textShadowRadius: 6 }]}>
            {HAUL_STRINGS.flareCharged}
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
