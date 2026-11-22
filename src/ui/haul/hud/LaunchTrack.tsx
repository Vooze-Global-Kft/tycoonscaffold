/**
 * The launch track (spec 4.1): the freighter pad at its centre with one stack of chevrons over the
 * docked freighter; a swipe up of 60 pt that starts here launches (the field gesture layer decides,
 * ../gestures/useFieldGestures.ts; this view takes no touches). While the freighter is away: a
 * progress arc round the empty pad and "Back in 9 s". With the autopilot: the policy chip
 * "AUTO · FULL" at the right end, a view of its own (errata 48): press 350 ms to switch the policy,
 * tap for the Station sheet's systems block. Target key `bay:launch`.
 *
 * The bay owns everything below its top edge (lead's decision 6): the pad, the docked freighter,
 * its lift-off and its landing are drawn here, in a canvas that reaches up to the panel's crest;
 * the scene draws the same flight path (./flight.ts) above the crest. Both read ONE clock, the
 * field frame loop's `flightMode` / `flightP` (decision 51), so the two halves of a freighter
 * crossing the crest are always at the same height. Between the crest and the launch track the
 * freighter passes behind the dock counter (clipped away from the counter's box: store-10), so it
 * never covers the credits.
 * Animations run on the UI thread and only on events (decision 50): the chevrons step at 8 Hz
 * (no offscreen layer), only while the hold has cargo to ship and no spoke covers the map, and
 * rest after a few cycles until something changes.
 */
import { Canvas, Group, Picture, type SkPicture } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { runOnJS, useDerivedValue, useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated';
import * as H from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { targets } from '../../hints/targets';
import { drawAwayArc, drawChevronStack, drawPad, drawPolicyChip, freighterSize, policyLabel, hullFor, LOADED_FREIGHTER_SCALE, segmentsFor } from '../art/freighter.draw';
import { freighterFlamePicture } from '../scene/pics';
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
import { climbY, flightMode, flightP, landAt, padScaleFor, padSpot } from './flight';

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
/** The chevrons' loop while there is cargo to ship: CHEVRON_STEPS steps of 1200 ms / 10 (8 a second, rounded). */
const CHEVRON_MS = 1200;
const CHEVRON_STEPS = 10;
/** Cycles the chevrons play before they rest lit (until the cargo, the arming or a spoke changes). */
const CHEVRON_CYCLES = 6;
/** Chevron stack pictures: index 0..CHEVRON_STEPS-1 the loop's steps, CHEVRON_STEPS fully lit, CHEVRON_STEPS + 1 not ready. */
const CHEV_LIT = CHEVRON_STEPS;
const CHEV_DIM = CHEVRON_STEPS + 1;
/** Height of the policy chip's press area (phone-8: with its hitSlop 8 above and below it is 44 pt). */
const CHIP_PRESS_H = 28;

/** `crest`: the bay panel's top edge and `topY` the top of the climb, in screen points (./flight.ts). */
export function LaunchTrack({ rect, crest, topY }: { rect: Rect; crest: number; topY: number }) {
  // Under a full-screen spoke the track keeps what it shows: no re-render, no redraw (decision 50).
  const spoke = useHaulUi((s) => s.spoke !== null);
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
    {
      phase: 'docked',
      level: 1,
      cargo: false,
      backIn: 0,
      arc: 0,
      policy: null as string | null,
      landMs: 2000,
    },
    spoke,
  );
  const armed = useFieldInput((s) => s.launchArmed);
  const { fontScale, height: winH } = useWindowDimensions();
  const compact = winH < 740;
  const label0 = labelMetrics(compact ? 10 : 11, fontScale);
  const W = rect.width;
  const Hh = rect.height;

  // Geometry: the pad's centre near the bottom of the track; the freighter on it at the loaded scale.
  const padScale = padScaleFor(compact);
  const hull = hullFor(f.level);
  const seg = segmentsFor(f.level);
  const size = freighterSize(hull, seg);
  const spot = padSpot(rect, compact, size, LOADED_FREIGHTER_SCALE);
  const cx = W / 2;
  const cy = spot.y - rect.y;
  const shipScale = f.cargo ? spot.loaded : spot.empty;
  // The canvas reaches from the panel's crest down to the track's bottom: `up` points above the track.
  const up = Math.max(0, rect.y - crest);

  // The flight: the field frame loop's one clock (./flight.ts flightMode / flightP; decision 51).
  const ready = f.phase === 'docked' && f.cargo;
  // The chevrons: a step index written at most 8 times a second by a frame callback that runs only
  // while they breathe; the canvas redraws only when the step changes (decision 50, perf-2).
  const chevStep = useSharedValue(CHEV_DIM);
  const chevT0 = useSharedValue(-1);
  const breathing = ready && !spoke && !armed;
  // device:new:3: once the chevrons rest lit, the callback stops itself (no idle callback per vsync).
  const stopRef = useRef<() => void>(() => {});
  const stopChev = useCallback(() => stopRef.current(), []);
  const onChevFrame = useCallback(
    (info: FrameInfo) => {
      'worklet';
      if (chevT0.value < 0) chevT0.value = info.timestamp;
      const el = info.timestamp - chevT0.value;
      const next = el >= CHEVRON_MS * CHEVRON_CYCLES ? CHEV_LIT : Math.floor((el % CHEVRON_MS) / (CHEVRON_MS / CHEVRON_STEPS));
      if (next !== chevStep.value) {
        chevStep.value = next;
        if (next === CHEV_LIT) runOnJS(stopChev)();
      }
    },
    [chevT0, chevStep, stopChev],
  );
  const chevTick = useFrameCallback(onChevFrame, false);
  stopRef.current = () => chevTick.setActive(false);
  useEffect(() => {
    if (breathing) {
      chevT0.value = -1;
      chevTick.setActive(true);
    } else {
      chevTick.setActive(false);
      chevStep.value = armed ? CHEV_LIT : ready ? CHEV_LIT : CHEV_DIM;
    }
    return () => chevTick.setActive(false);
  }, [breathing, armed, ready, chevTick, chevT0, chevStep]);

  /** Flame frames over one flight (about 18 a second). */
  const FLICKS = 45;
  const shipXform = useDerivedValue(() => {
    const m = flightMode.value;
    const p = flightP.value;
    let y = spot.y;
    let sc = shipScale;
    if (m === 1) {
      y = climbY(p, spot.y, topY);
      sc = spot.loaded;
    } else if (m === 3) {
      const l = landAt(p, spot.y, topY, spot.loaded, shipScale);
      y = l.y;
      sc = l.scale;
    } else {
      const d = dragLine.value;
      y -= d.kind === DRAG_SWIPE ? Math.max(0, Math.min(60, d.y0 - d.y)) * 0.12 : 0;
    }
    // Above the crest the scene draws it: scaled to nothing here (the canvas clips it anyway).
    return [{ translateX: cx }, { translateY: y - rect.y + up }, { scale: y < crest - 80 ? 0 : sc }];
  });
  // The flame flickers (three frames) while the freighter flies.
  const flameXf = (i: number) => {
    'worklet';
    const p = flightP.value;
    const flying = (flightMode.value === 1 || flightMode.value === 3) && p < 1;
    return [{ scale: flying && Math.floor(p * FLICKS) % 3 === i ? 1 : 0 }];
  };
  const fl0 = useDerivedValue(() => flameXf(0));
  const fl1 = useDerivedValue(() => flameXf(1));
  const fl2 = useDerivedValue(() => flameXf(2));
  const flames = [fl0, fl1, fl2];
  // One transform per chevron-stack picture: scale 1 for the step shown, 0 for the others (no layer, no alpha pass).
  const chevXf = (i: number) => {
    'worklet';
    return [{ scale: chevStep.value === i ? 1 : 0 }];
  };
  const ch = [
    useDerivedValue(() => chevXf(0)),
    useDerivedValue(() => chevXf(1)),
    useDerivedValue(() => chevXf(2)),
    useDerivedValue(() => chevXf(3)),
    useDerivedValue(() => chevXf(4)),
    useDerivedValue(() => chevXf(5)),
    useDerivedValue(() => chevXf(6)),
    useDerivedValue(() => chevXf(7)),
    useDerivedValue(() => chevXf(8)),
    useDerivedValue(() => chevXf(9)),
    useDerivedValue(() => chevXf(CHEV_LIT)),
    useDerivedValue(() => chevXf(CHEV_DIM)),
  ];
  const chevPics = useMemo(
    () =>
      Array.from({ length: CHEVRON_STEPS + 2 }, (_, i) =>
        memo(`chevs:${i}`, () => picture({ x: -16, y: -22, w: 32, h: 30 }, (c) => drawChevronStack(c, i === CHEV_LIT ? 1 : (i + 0.5) / CHEVRON_STEPS, i !== CHEV_DIM))),
      ),
    [],
  );

  const chevTop = cy + up - (size.h / 2) * shipScale - 6;
  const pad = memo(`pad:${ready}`, () => picture(around(34), (c) => drawPad(c, ready)));
  const ship = pictures.freighter(hull, seg);
  const arc = memo(`arc:${f.arc}`, () => picture(around(26), (c) => drawAwayArc(c, f.arc / ARC_STEPS, '')));
  const away = f.phase === 'climb' || f.phase === 'away';
  const policyName = f.policy ? f.policy.toUpperCase() : '';
  const chip = memo(`policy:${policyName}`, () => picture(around(60), (c) => drawPolicyChip(c, policyName, true)));
  const chipW = f.policy ? textWidth(policyLabel(policyName), 5) + 16 : 0;
  const chipX = W - chipW / 2 - 4;
  const chipY = 10;
  // The dock counter's box in this canvas (it spans the track's width from 8 pt under the crest to
  // 4 pt above the track: ../layout.ts zones.counter): the freighter is clipped away from it.
  const counterClip = useMemo(() => ({ x: -4, y: 6, width: W + 8, height: Math.max(0, up - 6) }), [W, up]);

  useEffect(() => {
    targets.set('bay:launch', {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
    return () => targets.set('bay:launch', null);
  }, [rect.x, rect.y, rect.width, rect.height]);

  const backIn = useMemo(() => fillIn(HAUL_STRINGS.backIn, { s: f.backIn }).toUpperCase(), [f.backIn]);
  // "BACK IN 12 S" left of the pad: the font shrinks by hand to the room there (0.62 em a glyph).
  const labelRoom = cx - 26 * padScale - 6;
  const labelFont = Math.max(7, Math.min(label0.font, labelRoom / (Math.max(1, backIn.length) * 0.62)));
  const label = {
    font: Math.round(labelFont * 10) / 10,
    row: Math.ceil(labelFont * 1.25),
  };
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: W,
        height: Hh,
      }}
    >
      <View
        pointerEvents="none"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={f.phase === 'docked' ? HAUL_STRINGS.launchLabel : HAUL_STRINGS.launchWaiting}
        accessibilityValue={away ? { text: backIn } : undefined}
        accessibilityActions={ready ? [{ name: 'increment' }] : []}
        onAccessibilityAction={(e) => {
          // A screen reader's swipe up on the adjustable track is the launch swipe.
          if (e.nativeEvent.actionName === 'increment' && ready) haulActions.launch();
        }}
        style={{ position: 'absolute', left: 0, top: 0, width: W, height: Hh, overflow: 'visible' }}
      >
        <Canvas style={{ position: 'absolute', left: 0, top: -up, width: W, height: Hh + up }}>
          <Group transform={[{ translateX: cx }, { translateY: cy + up }, { scale: padScale }]}>
            <Picture picture={pad} />
            {away ? <Picture picture={arc} /> : null}
          </Group>
          <Group clip={counterClip} invertClip>
            <Group transform={shipXform}>
              {flames.map((t, i) => (
                <Group key={i} transform={t}>
                  <Picture picture={freighterFlamePicture(hull, seg, i)} />
                </Group>
              ))}
              <Picture picture={ship} />
            </Group>
          </Group>
          {f.phase === 'docked' ? (
            <Group transform={[{ translateX: cx }, { translateY: chevTop }, { scale: 0.6 }]}>
              {chevPics.map((pic, i) => (
                <Group key={i} transform={ch[i]}>
                  <Picture picture={pic} />
                </Group>
              ))}
            </Group>
          ) : null}
          {f.policy ? (
            <Group transform={[{ translateX: chipX }, { translateY: chipY + up }]}>
              <Picture picture={chip} />
            </Group>
          ) : null}
        </Canvas>
      </View>
      {away ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            width: labelRoom,
            top: cy - label.row / 2,
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
                textAlign: 'right',
              },
            ]}
          >
            {backIn}
          </Text>
        </View>
      ) : null}
      {f.policy ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={policyLabel(policyName)}
          hitSlop={8}
          delayLongPress={350}
          onLongPress={() => haulActions.setPolicy(f.policy === 'full' ? 'contract' : 'full')}
          onPress={() => useHaulUi.getState().openSheet({ type: 'station' })}
          style={{
            position: 'absolute',
            left: chipX - chipW / 2,
            top: chipY - CHIP_PRESS_H / 2,
            width: chipW,
            height: CHIP_PRESS_H,
          }}
        />
      ) : null}
    </View>
  );
}
