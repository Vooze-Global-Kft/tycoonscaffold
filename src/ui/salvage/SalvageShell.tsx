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
 * PLACEHOLDER HUD and words; the structure is what the screens package builds on.
 *
 * Hour-0 joint (contract step): the motion numbers come from the rules' content (`walk`, `truck.v`,
 * `worker`), the presence sample is the contract's `Presence` (with `standingFor`), the top bar shows the
 * rules' `topBar` through strings.ts `say`, and at a place with a card the one button shows "Open",
 * which opens `PlaceCard` (an empty card with the place's name from the rules' `cardOf`) until the
 * overlays package replaces it with the real cards.
 */
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as R from '../../engine/salvage';
import { salvageActions } from '../../modes/salvage/actions';
import { useGame } from '../../state/store';
import { DevPanel } from './dev/DevPanel';
import { yardSwitches } from './dev/switches';
import { OverlayHost, type Insets } from './overlays/OverlayHost';
import { PAL } from './palette';
import { S, say } from './strings';
import { useOverlay } from '../kit/overlay';
import { useSalvageUi } from './uiState';
import { spriteIds, useYardLoop, type Motion } from './world/frameLoop';
import { STICK_R, stick, useStickResponder, type StickZone } from './world/stick';
import { useRulesTable } from './world/useRulesTable';
import { sigOf, useYardArt, yardFor } from './world/useYard';
import { YardView } from './world/YardView';

/** The stick zone: this share of the safe area's width from its left, below this share of its height. */
const ZONE_W = 0.45;
const ZONE_TOP = 0.28;
/** How far inside the safe area the stick's edge stays, points. */
const EDGE = 24;

export function stickZone(width: number, height: number, i: Insets): StickZone {
  const sw = width - i.left - i.right;
  const sh = height - i.top - i.bottom;
  const x = i.left;
  const y = i.top + sh * ZONE_TOP;
  const zw = sw * ZONE_W;
  return {
    x,
    y,
    width: zw,
    height: height - y,
    minX: i.left + EDGE + STICK_R,
    maxX: Math.max(i.left + EDGE + STICK_R, x + zw - STICK_R),
    minY: Math.min(i.top + EDGE + STICK_R, height - i.bottom - EDGE - STICK_R),
    maxY: height - i.bottom - EDGE - STICK_R,
  };
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
  const overlays = useSalvageUi((s) => s.stack.length);
  const appActive = useAppActive();
  const [place, setPlace] = useState<string | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const active = !portrait && overlays === 0 && appActive && card === null;

  const yard = yardFor(cfg);
  const art = useYardArt(yard);
  const ids = useMemo(() => spriteIds(yard, art?.sheet ?? null, sigOf(yard)), [yard, art]);
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
    (_act: number, x: number, y: number, driving: number, moving: number) => {
      const t = Date.now();
      if (moving === 1) stillSince.current = null;
      else if (stillSince.current === null) stillSince.current = t;
      const standingFor = stillSince.current === null ? 0 : (t - stillSince.current) / 1000;
      salvageActions.presence({ x, y, driving: driving === 1, moving: moving === 1, standingFor });
      const at = driving === 1 ? null : R.placeNear(cfg, x, y);
      setPlace((p) => (p === at ? p : at));
    },
    [cfg],
  );
  const onDriving = useCallback((on: boolean) => useSalvageUi.getState().setDriving(on), []);
  useEffect(() => {
    useSalvageUi.getState().setDriving(false);
  }, []);
  // The stick is let go when the yard stops (an overlay opened, the phone turned upright).
  useEffect(() => {
    if (!active) stick.value = { on: 0, bx: 0, by: 0, kx: 0, ky: 0 };
  }, [active]);
  const anim = useYardLoop({ yard, sheet: art?.sheet ?? null, ids, motion, rules, capacity: CARRY_DRAWN, width, height, active, measure: yardSwitches.panel, insets, onSample, onDriving });

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
  const input = useMemo(
    () => ({
      ...responder,
      onResponderGrant: (e: Parameters<NonNullable<typeof grant>>[0]) => {
        grant?.(e);
        setUsed(true);
      },
    }),
    [responder, grant],
  );

  const atlasNote = art?.sheet ? `atlas ${art.sheet.width}x${art.sheet.height}@${art.sheet.density} (${art.sheet.names.length}) bake ${art.bakeMs} ms` : 'atlas baking';
  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <YardView yard={yard} art={art} anim={anim} />
      <View style={StyleSheet.absoluteFill} {...input} />
      <StickKnob />
      {!used ? (
        <View pointerEvents="none" style={[styles.hint, { left: insets.left + EDGE, bottom: insets.bottom + EDGE }]}>
          <Text style={styles.hintText}>{S.hintStick}</Text>
        </View>
      ) : null}
      <Hud cfg={cfg} insets={insets} />
      <Pressable accessibilityRole="button" accessibilityLabel={S.menu} onPress={() => useSalvageUi.getState().open('panel')} style={[styles.round, { top: insets.top + 10, right: insets.right + 12 }]}>
        <Text style={styles.roundText}>{'≡'}</Text>
      </Pressable>
      <StepOut insets={insets} onPress={() => (anim.exit.value = 1)} />
      {place && overlays === 0 && card === null ? <OpenButton insets={insets} onPress={() => setCard(place)} /> : null}
      {yardSwitches.panel ? <DevPanel stats={anim.stats} top={height - insets.bottom - 26} left={insets.left + Math.round(width * 0.36)} atlas={atlasNote} /> : null}
      <OverlayHost width={width} height={height} insets={insets} />
      {card !== null ? <PlaceCard cfg={cfg} place={card} width={width} insets={insets} onClose={() => setCard(null)} /> : null}
      {portrait ? <RotateCard /> : null}
    </View>
  );
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

function Hud({ cfg, insets }: { cfg: R.SalvageConfig; insets: Insets }) {
  // The rules' top bar, as words (strings.ts say; numbers through the rules' formatters).
  const cash = useGame((s) => s.game.cash);
  const salvage = useGame((s) => (s.game as R.SalvageGame).salvage);
  if (!salvage) return null;
  const g = useGame.getState().game as R.SalvageGame;
  const bar = R.topBar(cfg, { ...g, cash, salvage });
  const c = cfg.salvage;
  const rank = bar.next
    ? say({ key: 'rankChip', args: { rank: { rank: bar.rank }, n: { n: bar.of }, rival: { name: bar.next.name }, t: { mass_g: bar.next.need_g, step: 'lot' } } }, c)
    : say({ key: 'rankChipTop', args: { rank: { rank: bar.rank }, n: { n: bar.of } } }, c);
  const carry = bar.carry
    ? say({ key: 'carry', args: { a: { n: Math.round(bar.carry.kg * 10) / 10 }, b: { n: bar.carry.cap } } }, c)
    : bar.driving
      ? say({ key: bar.driving.trial ? 'trialLoad' : 'skipLoad', args: { kg: { mass_g: bar.driving.kg * 1000, step: 'bridge' } } }, c)
      : '';
  return (
    <View pointerEvents="none" style={[styles.hud, { top: insets.top + 10, left: insets.left + 12 }]}>
      <Text style={styles.hudCash}>{say({ key: 'cash', args: { x: { money: bar.cash } } }, c)}</Text>
      <Text style={styles.hudLine}>{rank}</Text>
      <Text style={styles.hudLine}>{carry}</Text>
    </View>
  );
}

/** "Open" at a place with a card: lower right, the 60 pt disc of 4.1 (pressed with the stick released). */
function OpenButton({ insets, onPress }: { insets: Insets; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={S.open} onPress={onPress} style={({ pressed }) => [styles.open, { right: insets.right + 16, bottom: insets.bottom + 8 }, pressed && { opacity: 0.7 }]}>
      <Text style={styles.openText}>{S.open}</Text>
    </Pressable>
  );
}

/**
 * HOUR-0 STAND-IN for the overlays package: the right panel of 4.3 with the card's title (the rules'
 * `cardOf` for the place) and nothing else. Registered with useOverlay; the scrim and Android back close it.
 */
function PlaceCard({ cfg, place, width, insets, onClose }: { cfg: R.SalvageConfig; place: string; width: number; insets: Insets; onClose: () => void }) {
  useOverlay(true);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);
  const g = useGame.getState().game as R.SalvageGame;
  const data = R.cardOf(cfg, g, { kind: 'place', place }, Date.now());
  const title = say(data.title, cfg.salvage);
  const w = Math.min(520, Math.round(width * 0.58));
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={S.close} style={[StyleSheet.absoluteFill, { backgroundColor: PAL.scrim }]} onPress={onClose} />
      <View style={[styles.panel, { width: w + insets.right, paddingTop: insets.top + 16, paddingRight: insets.right + 16, paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
    </>
  );
}

/** "Step out" while driving: lower right, pressed with the stick released (one responder at a time). */
function StepOut({ insets, onPress }: { insets: Insets; onPress: () => void }) {
  const driving = useSalvageUi((s) => s.driving);
  if (!driving) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={S.stepOut} onPress={onPress} style={({ pressed }) => [styles.step, { right: insets.right + 16, bottom: insets.bottom + 16 }, pressed && { opacity: 0.7 }]}>
      <Text style={styles.stepText}>{S.stepOut}</Text>
    </Pressable>
  );
}

function RotateCard() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.rotate]}>
      <View style={styles.rotateCard}>
        <Text style={styles.rotateGlyph}>{'↻'}</Text>
        <Text style={styles.rotateTitle}>{S.rotateTitle}</Text>
        <Text style={styles.rotateBody}>{S.rotateBody}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3A3631', overflow: 'hidden' },
  base: { position: 'absolute', left: 0, top: 0, width: STICK_R * 2, height: STICK_R * 2, borderRadius: STICK_R, borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(0,0,0,0.18)' },
  knob: { position: 'absolute', left: 0, top: 0, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,246,224,0.85)', borderWidth: 2, borderColor: PAL.ink },
  hint: { position: 'absolute', backgroundColor: PAL.hud, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  hintText: { color: PAL.hudText, fontSize: 14, fontWeight: '600' },
  hud: { position: 'absolute', backgroundColor: PAL.hud, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  hudCash: { color: PAL.accent, fontSize: 18, fontWeight: '800' },
  hudLine: { color: PAL.hudText, fontSize: 13, fontWeight: '600' },
  round: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: PAL.hud, alignItems: 'center', justifyContent: 'center' },
  roundText: { color: PAL.hudText, fontSize: 24, fontWeight: '800', marginTop: -2 },
  step: { position: 'absolute', minHeight: 52, paddingHorizontal: 20, borderRadius: 26, backgroundColor: PAL.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: PAL.ink },
  stepText: { color: PAL.ink, fontSize: 16, fontWeight: '800' },
  open: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: PAL.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: PAL.ink },
  openText: { color: PAL.ink, fontSize: 13, fontWeight: '800' },
  panel: { position: 'absolute', top: 0, right: 0, bottom: 0, backgroundColor: PAL.card, paddingLeft: 20 },
  panelTitle: { color: PAL.ink, fontSize: 15, fontWeight: '800' },
  rotate: { backgroundColor: '#2A2622', alignItems: 'center', justifyContent: 'center', padding: 24 },
  rotateCard: { backgroundColor: PAL.card, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 22, alignItems: 'center', maxWidth: 320 },
  rotateGlyph: { fontSize: 40, color: PAL.ink, marginBottom: 6 },
  rotateTitle: { fontSize: 20, fontWeight: '800', color: PAL.ink, textAlign: 'center' },
  rotateBody: { fontSize: 15, color: PAL.ink, marginTop: 6, textAlign: 'center' },
});
