/**
 * The launch track (spec 4.1): the freighter pad at its centre with one stack of chevrons over the
 * docked freighter; a swipe up of 60 pt that starts here launches (the field gesture layer decides,
 * ../gestures/useFieldGestures.ts; this view takes no touches). While the freighter is away: a
 * progress arc round the empty pad and "Back in 9 s". With the autopilot: the policy chip
 * "AUTO · FULL" at the right end, a view of its own (errata 48): press 350 ms to switch the policy,
 * tap for the Station sheet's systems block. Target key `bay:launch`.
 *
 * The bay panel is opaque, so the docked freighter, its lift-off and its landing are drawn here;
 * the scene draws its climb through the field and the warp flash. Animations run on the UI thread
 * and only while something moves (the chevrons breathe only while the hold has cargo to ship and
 * no spoke covers the map).
 */
import { Canvas, Group, Picture, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Easing, cancelAnimation, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import * as H from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { modeEvents } from '../../../state/modeEvents';
import { useGame } from '../../../state/store';
import { targets } from '../../hints/targets';
import { drawAwayArc, drawChevron, drawPad, drawPolicyChip, freighterSize, hullFor, LOADED_FREIGHTER_SCALE, segmentsFor } from '../art/freighter.draw';
import { SPACE } from '../art/palette';
import { around, picture } from '../art/pen';
import { pictures } from '../art/pictures';
import { textWidth } from '../art/glyphs';
import { DRAG_SWIPE, dragLine, useFieldInput } from '../gestures/fieldInput';
import type { Rect } from '../layout';
import { HAUL_STRINGS } from '../strings';
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

/** Steps of the away arc (one picture per step, kept). */
const ARC_STEPS = 48;
/** The chevrons' loop while there is cargo to ship. */
const CHEVRON_MS = 1200;

export function LaunchTrack({ rect }: { rect: Rect }) {
  const f = useRunShallow(
    (cfg, g) => {
      const fr = g.haul.freighter;
      const awayLeft = fr.phase === 'away' ? fr.t + cfg.haul.freighter.land : fr.phase === 'climb' ? fr.t + fr.away + cfg.haul.freighter.land : 0;
      const total = cfg.haul.freighter.climb + fr.away;
      const gone = fr.phase === 'climb' || fr.phase === 'away' ? Math.round((1 - (fr.phase === 'away' ? fr.t : fr.t + fr.away) / Math.max(0.1, total)) * ARC_STEPS) : 0;
      return {
        phase: fr.phase,
        level: fr.level,
        cargo: H.holdTotal(g.haul) > H.EPS,
        backIn: Math.ceil(awayLeft),
        arc: Math.max(0, Math.min(ARC_STEPS, gone)),
        policy: g.haul.autopilot.online ? g.haul.autopilot.policy : null,
        landMs: Math.round(cfg.haul.freighter.land * 1000),
      };
    },
    { phase: 'docked', level: 1, cargo: false, backIn: 0, arc: 0, policy: null as string | null, landMs: 2000 },
  );
  const spoke = useHaulUi((s) => s.spoke !== null);
  const armed = useFieldInput((s) => s.launchArmed);
  const { fontScale, height: winH } = useWindowDimensions();
  const compact = winH < 740;
  const label = labelMetrics(compact ? 10 : 11, fontScale);
  const W = rect.width;
  const Hh = rect.height;

  // Geometry: the pad's centre near the bottom of the track; the freighter on it at the loaded scale.
  const padScale = compact ? 0.72 : 0.8;
  const cx = W / 2;
  const cy = Hh - 17 * (padScale / 0.8);
  const hull = hullFor(f.level);
  const seg = segmentsFor(f.level);
  const size = freighterSize(hull, seg);
  const fit = Math.min(1, (Hh - 6) / (size.h * LOADED_FREIGHTER_SCALE * padScale + 6));
  const shipScale = (f.cargo ? LOADED_FREIGHTER_SCALE : 1) * padScale * fit;

  // Lift-off and landing (0 = on the pad, 1 = gone up through the bay's top).
  const lift = useSharedValue(f.phase === 'docked' || f.phase === 'land' ? 0 : 1);
  useEffect(() => {
    const off = modeEvents.subscribe((events) => {
      for (const e of events as H.HaulEvent[]) {
        if (e.type === 'launch') {
          cancelAnimation(lift);
          lift.value = withTiming(1, { duration: 450, easing: Easing.in(Easing.cubic) });
        } else if (e.type === 'land') {
          cancelAnimation(lift);
          lift.value = 1;
          lift.value = withTiming(0, { duration: Math.max(300, (useGame.getState().cfg as H.HaulConfig).haul?.freighter.land * 1000 || 2000), easing: Easing.out(Easing.cubic) });
        }
      }
    });
    return off;
  }, [lift]);
  // A restart or a preset mid-flight: put the ship where the rules say it is.
  useEffect(() => {
    if (f.phase === 'away') lift.value = 1;
  }, [f.phase, lift]);

  const ready = f.phase === 'docked' && f.cargo;
  const loop = useSharedValue(0);
  useEffect(() => {
    if (ready && !spoke && !armed) {
      loop.value = 0;
      loop.value = withRepeat(withTiming(1, { duration: CHEVRON_MS, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(loop);
      loop.value = armed ? 1 : 0;
    }
    return () => cancelAnimation(loop);
  }, [ready, spoke, armed, loop]);

  const rise = Math.max(18, Hh * 0.5);
  const shipXform = useDerivedValue(() => {
    const d = dragLine.value;
    const pull = d.kind === DRAG_SWIPE ? Math.max(0, Math.min(60, d.y0 - d.y)) * 0.12 : 0;
    return [{ translateX: cx }, { translateY: cy - lift.value * rise - pull }, { scale: shipScale }];
  });
  const shipOpacity = useDerivedValue(() => 1 - lift.value);
  const chevOn = (i: number, l: number) => {
    'worklet';
    return ready ? 0.3 + 0.7 * Math.max(0, Math.min(1, l * 3.6 - i * 1.1)) : 0.22;
  };
  const c0 = useDerivedValue(() => chevOn(0, loop.value));
  const c1 = useDerivedValue(() => chevOn(1, loop.value));
  const c2 = useDerivedValue(() => chevOn(2, loop.value));
  const chevA = [c0, c1, c2];

  const chevTop = cy - (size.h / 2) * shipScale - 6;
  const pad = memo(`pad:${ready}`, () => picture(around(34), (c) => drawPad(c, ready)));
  const chevron = memo('chev', () => picture(around(12), (c) => drawChevron(c, 1)));
  const ship = pictures.freighter(hull, seg);
  const arc = memo(`arc:${f.arc}`, () => picture(around(26), (c) => drawAwayArc(c, f.arc / ARC_STEPS, '')));
  const away = f.phase === 'climb' || f.phase === 'away';
  const policyName = f.policy ? f.policy.toUpperCase() : '';
  const chip = memo(`policy:${policyName}`, () => picture(around(60), (c) => drawPolicyChip(c, policyName, true)));
  const chipW = f.policy ? textWidth(`AUTO · ${policyName}`, 5) + 16 : 0;
  const chipX = W - chipW / 2 - 4;
  const chipY = 10;

  useEffect(() => {
    targets.set('bay:launch', { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    return () => targets.set('bay:launch', null);
  }, [rect.x, rect.y, rect.width, rect.height]);

  const backIn = useMemo(() => fillIn(HAUL_STRINGS.backIn, { s: f.backIn }).toUpperCase(), [f.backIn]);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: rect.x, top: rect.y, width: W, height: Hh }}>
      <Canvas style={{ width: W, height: Hh }} pointerEvents="none">
        <Group transform={[{ translateX: cx }, { translateY: cy }, { scale: padScale }]}>
          <Picture picture={pad} />
          {away ? <Picture picture={arc} /> : null}
        </Group>
        <Group transform={shipXform} opacity={shipOpacity} layer>
          <Picture picture={ship} />
        </Group>
        {f.phase === 'docked'
          ? [0, 1, 2].map((i) => (
              <Group key={i} transform={[{ translateX: cx }, { translateY: chevTop - i * 5 }, { scale: 0.6 }]} opacity={chevA[i]} layer>
                <Picture picture={chevron} />
              </Group>
            ))
          : null}
        {f.policy ? (
          <Group transform={[{ translateX: chipX }, { translateY: chipY }]}>
            <Picture picture={chip} />
          </Group>
        ) : null}
      </Canvas>
      {away ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, width: cx - 26 * padScale - 4, top: cy - label.row / 2, height: label.row, justifyContent: 'center' }}>
          <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[DIGITAL, { color: SPACE.steel, fontSize: label.font, lineHeight: label.row, textAlign: 'right' }]}>
            {backIn}
          </Text>
        </View>
      ) : null}
      {f.policy ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`AUTO · ${policyName}`}
          hitSlop={10}
          delayLongPress={350}
          onLongPress={() => haulActions.setPolicy(f.policy === 'full' ? 'contract' : 'full')}
          onPress={() => useHaulUi.getState().openSheet({ type: 'station' })}
          style={{ position: 'absolute', left: chipX - chipW / 2, top: chipY - 8, width: chipW, height: 16 }}
        />
      ) : null}
    </View>
  );
}
