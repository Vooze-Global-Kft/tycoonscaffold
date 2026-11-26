/**
 * The whole game screen of the salvage mode (docs/design/yard-ground.md): LANDSCAPE, one yard several
 * screens wide in a three-quarter view, steered with one thumb. From the back to the front:
 * - the yard (./world/YardView.tsx), full bleed: drawn under the notch or island (left or right) and the
 *   home indicator;
 * - the input view: one full-screen responder; a touch that begins in the stick zone (the lower left
 *   of the safe area) places the floating stick there (./world/stick.ts); nothing else needs a touch on it;
 * - the stick's base and knob (drawn on the UI thread from the stick's shared value);
 * - the HUD and the buttons, always inside the safe area (insets on all four sides);
 * - the mode's own overlays (./overlays/OverlayHost.tsx: a side panel, a centred card; never a Modal);
 * - the portrait card: when the window is taller than wide (the web preview, a phone that did not turn),
 *   "Turn your phone sideways" covers everything and the yard stops (its frame loop and the presence
 *   samples), so the game is paused behind it.
 * - the event pump (./hud/pump.ts): ONE listener on the rules' events hands them to every subscriber
 *   (tickets, toasts, the world's effects, hints, the card triggers) and plays their sounds (section 7).
 * Package 4 (`hud`) owns this file: the bars, tickets and toasts are ./hud/*; the cards are the overlay
 * engineers' (./overlays/*), opened through ./overlays/cardStack.ts `openCard`.
 *
 * Hour-0 joint (contract step): the motion numbers come from the rules' content (`walk`, `truck.v`,
 * `worker`), the presence sample is the contract's `Presence` (with `standingFor`), and the place the
 * boss stands at (the rules' `placeNear`) gives the one button its "Open".
 */
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as R from '../../engine/salvage';
import { salvageActions } from '../../modes/salvage/actions';
import { useGame } from '../../state/store';
import { DevPanel } from './dev/DevPanel';
import { LoadingCurtain, useCurtainShut } from './loading';
import { yardSwitches } from './dev/switches';
import { hudDemo } from './hud/dev';
import { useFontScale } from './hud/fontScale';
import { HudLayer, OneButton, RotateCard } from './hud/Hud';
import { hudLayout } from './hud/metrics';
import { yardSound } from './hud/pump';
import { useEventPump } from './hud/usePump';
import { Autoplay, HintLayer } from './hints';
import { useHudTriggers } from './hud/useTriggers';
import { OverlayHost, type Insets } from './overlays/OverlayHost';
import { PAL } from './palette';
import { overlaysOpen, useSalvageUi } from './uiState';
import { useYardLoop, type Motion } from './world/frameLoop';
import { STICK_R, stick, useStickResponder, type StickZone } from './world/stick';
import { useRulesTable } from './world/useRulesTable';
import { useYardArt, yardFor } from './world/useYard';
import { HERO } from './world/heroFrame';
import { CoinLayer, WorldLayer } from './world/WorldLayer';
import { YardView } from './world/YardView';

/** The stick zone: this share of the safe area's width from its left, below this share of its height. */
const ZONE_W = 0.45;
const ZONE_TOP = 0.28;
/** How far inside the safe area the stick's edge stays, points. */
const EDGE = 24;
/** H9: the zone starts at least this far from the left edge (Android's back gesture lives there in landscape). */
const LEFT_KEEP = 20;
/** H9: and ends this far above the bottom inset (the iOS home indicator's go-home swipe). */
const BOTTOM_KEEP = 6;

export function stickZone(width: number, height: number, i: Insets): StickZone {
  const sw = width - i.left - i.right;
  const sh = height - i.top - i.bottom;
  const x = Math.max(i.left, LEFT_KEEP);
  const y = i.top + sh * ZONE_TOP;
  const zw = Math.max(0, i.left + sw * ZONE_W - x);
  return {
    x,
    y,
    width: zw,
    height: Math.max(0, height - i.bottom - BOTTOM_KEEP - y),
    minX: i.left + EDGE + STICK_R,
    maxX: Math.max(i.left + EDGE + STICK_R, x + zw - STICK_R),
    minY: Math.min(i.top + EDGE + STICK_R, height - i.bottom - EDGE - STICK_R),
    maxY: height - i.bottom - EDGE - STICK_R,
  };
}

/** The responder's props for the input view (its `release` is the shell's to call, not a View prop). */
function withoutRelease<T extends object>(r: T): Omit<T, 'release'> {
  const { release: _release, ...rest } = r as T & { release?: unknown };
  return rest;
}

function useAppActive(): boolean {
  const [on, setOn] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setOn(s !== 'background'));
    return () => sub.remove();
  }, []);
  return on;
}

/** Pieces the placeholder actor draws on the boss's frame at most. */
const CARRY_DRAWN = 6;

export function SalvageShell() {
  const cfg = useGame((s) => s.cfg);
  if (!R.isSalvage(cfg)) return null;
  return <Yard cfg={cfg} />;
}

function Yard({ cfg }: { cfg: R.SalvageConfig }) {
  const { width, height } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const dev = yardSwitches.insets;
  const insets: Insets = dev ? { top: safe.top, left: dev.left, right: dev.right, bottom: dev.bottom } : { top: safe.top, bottom: safe.bottom, left: safe.left, right: safe.right };
  const portrait = height > width;
  const overlays = useSalvageUi(overlaysOpen);
  const appActive = useAppActive();
  const active = !portrait && overlays === 0 && appActive;
  const fontScale = useFontScale();
  // L11 (loading's request): the bars, plates and the one button mount only once the gate starts to part.
  const shut = useCurtainShut();
  const L = useMemo(() => hudLayout(width, height, insets, fontScale), [width, height, insets.top, insets.left, insets.right, insets.bottom, fontScale]); // eslint-disable-line react-hooks/exhaustive-deps
  // THE event pump: one listener on the rules' events; sounds play while the yard is live (not upright, not in the background).
  useEventPump(cfg, !portrait && appActive);
  useHudTriggers();
  useEffect(() => hudDemo(cfg, useGame.getState().game as R.SalvageGame) ?? undefined, [cfg]);

  const yard = yardFor(cfg);
  const art = useYardArt(yard);
  const motion = useMemo<Motion>(
    () => ({
      walk: cfg.salvage.walk,
      workerR: cfg.salvage.worker.radius,
      reach: cfg.salvage.worker.reach,
      drive: cfg.salvage.truck.v,
      truckR: cfg.salvage.truck.radius,
      enter: cfg.salvage.truck.enter,
      helperSpeed: cfg.salvage.helpers.speed,
      lead: 0.35,
      ease: 0.28,
    }),
    [cfg],
  );
  const rules = useRulesTable(yard);
  // The presence sample (at most ten a second, from the UI thread): where the boss stands; the rules decide nearness.
  const stillSince = useRef<number | null>(null);
  const onSample = useCallback(
    (_act: number, x: number, y: number, driving: number, moving: number, still?: number, heading?: number) => {
      const t = Date.now();
      if (moving === 1) stillSince.current = null;
      else if (stillSince.current === null) stillSince.current = t;
      const standingFor = still ?? (stillSince.current === null ? 0 : (t - stillSince.current) / 1000);
      // At the wheel the sample carries the truck's heading (one of eight), so the rules' truck faces as the drawn one.
      const h = driving === 1 && heading !== undefined && heading >= 0 && heading < 8 ? { heading: heading as R.Heading } : null;
      salvageActions.presence({ x, y, driving: driving === 1, moving: moving === 1, standingFor, ...h });
      useSalvageUi.getState().setPlace(driving === 1 ? null : R.placeNear(cfg, x, y));
    },
    [cfg],
  );
  // The frame loop says who sits in the cab on its first frame and at every change (world/frameLoop.ts: the
  // epoch snap); a reset here on mount could land after it and blank the button at the wheel (the player's finding 4).
  const onDriving = useCallback((on: boolean) => useSalvageUi.getState().setDriving(on), []);
  // The stick is let go when the yard stops (an overlay opened, the phone turned upright): the responder
  // forgets the finger too (H12), so the next move does not steer again under the card.
  const releaseRef = useRef<() => void>(() => {
    stick.value = { on: 0, bx: 0, by: 0, kx: 0, ky: 0 };
  });
  useEffect(() => {
    if (!active) releaseRef.current();
  }, [active]);
  // `active` is "may steer": the loop itself runs while landscape and in the foreground (2.8: the rules
  // keep running under an open card; the boss stands). It reports footsteps and the diesel to the pump.
  const anim = useYardLoop({ yard, motion, rules, capacity: CARRY_DRAWN, width, height, active, measure: yardSwitches.panel, insets, onSample, onDriving, sound: yardSound });

  const zoneRef = useRef<StickZone>(stickZone(width, height, insets));
  zoneRef.current = stickZone(width, height, insets);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [used, setUsed] = useState(false);
  const responder = useStickResponder(
    () => zoneRef.current,
    () => activeRef.current,
  );
  const grant = responder.onResponderGrant;
  if (typeof (responder as { release?: () => void }).release === 'function') releaseRef.current = (responder as { release: () => void }).release;
  const input = useMemo(
    () => ({
      ...withoutRelease(responder),
      onResponderGrant: (e: Parameters<NonNullable<typeof grant>>[0]) => {
        grant?.(e);
        setUsed(true);
      },
    }),
    [responder, grant],
  );

  // The dev panel's atlas line: the bake's time; the draws of a frame are the loop's `stats.runs`.
  const atlasNote = art ? `bake ${art.bakeMs} ms` : 'atlas baking';
  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <YardView yard={yard} art={art} anim={anim} />
      {shut ? null : <WorldLayer cfg={cfg} yard={yard} anim={anim} width={width} height={height} insets={insets} active={active} />}
      <View style={StyleSheet.absoluteFill} {...input} />
      {/* The store's hero picture (?view=hero-store) shows no stick, no hint and no ghost thumb. */}
      {HERO.store ? null : <StickKnob />}
      {HERO.store ? null : <HintLayer cfg={cfg} width={width} height={height} insets={insets} zone={zoneRef.current} used={used} active={active} />}
      {HERO.store ? null : <Autoplay cfg={cfg} zone={zoneRef.current} />}
      {shut ? null : <HudLayer cfg={cfg} L={L} camera={anim.camera} yard={yard} body={anim.body} />}
      {/* The store's hero picture shows no one button either (world-b, L2). */}
      {shut || HERO.store ? null : <OneButton cfg={cfg} L={L} hidden={overlays > 0} onStepOut={() => (anim.exit.value = 1)} onGetIn={() => getIn(anim)} />}
      {/* Coins fly over the bars to the cash counter (world-b's layer; touch-through, runs only while one flies). */}
      <CoinLayer />
      {yardSwitches.panel ? <DevPanel stats={anim.stats} top={height - insets.bottom - 26} left={insets.left + Math.round(width * 0.36)} atlas={atlasNote} /> : null}
      <OverlayHost width={width} height={height} insets={insets} />
      {portrait ? <RotateCard cfg={cfg} s={L.s} /> : null}
      <LoadingCurtain />
    </View>
  );
}

/**
 * owner2-hud (ruling 18.4): the one button's "Get in" asks the world to seat him (the frame loop's `enter`, owned by
 * the world's engineer: requests.md 26 Nov ~18:50); read optionally, so until that side is in a press does nothing.
 */
function getIn(anim: object): void {
  const enter = (anim as { enter?: { value: number } }).enter;
  if (enter) enter.value = 1;
}

/** The stick's base and knob, moved on the UI thread from the stick's shared value. */
function StickKnob() {
  const base = useAnimatedStyle(() => {
    const s = stick.value;
    return { opacity: s.on ? 1 : 0, transform: [{ translateX: s.bx - STICK_R }, { translateY: s.by - STICK_R }] };
  });
  const knob = useAnimatedStyle(() => {
    const s = stick.value;
    return { opacity: s.on ? 1 : 0, transform: [{ translateX: s.bx + s.kx - 26 }, { translateY: s.by + s.ky - 26 }] };
  });
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.base, base]} />
      <Animated.View pointerEvents="none" style={[styles.knob, knob]} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3A3631', overflow: 'hidden' },
  base: { position: 'absolute', left: 0, top: 0, width: STICK_R * 2, height: STICK_R * 2, borderRadius: STICK_R, borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(0,0,0,0.18)' },
  knob: { position: 'absolute', left: 0, top: 0, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,246,224,0.85)', borderWidth: 2, borderColor: PAL.ink },
});
