/**
 * The play layer: everything the player touches on the living scene, laid exactly over the drawn
 * world (both read the same layout object). Tap areas, the skill button, the flying bonus,
 * floating numbers and the combo meter, the three round buttons at the top, the rush atmosphere,
 * the grand opening, and the hint targets that let the tutorial hand point into the scene.
 *
 * It selects only values that change rarely; anything that moves runs on the UI thread.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { View, type HostInstance } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import * as E from '../../../../engine/economy';
import { useGame } from '../../../../state/store';
import { targets } from '../../../hints/targets';
import { ChestButton } from '../../../meta/chest/ChestButton';
import { VenueChip } from '../../../meta/empire/VenueChip';
import { MissionsButton } from '../../../meta/missions/MissionsButton';
import type { SceneLayout } from '../../layout';
import { BonusFlyer } from './BonusFlyer';
import { ComboMeter } from './ComboMeter';
import { Effects } from './Effects';
import { FloatingNumbers } from './FloatingNumbers';
import { bellRect, stationRect } from './geometry';
import { extrasUnlocked, openings, type Opening } from '../../../play/gate';
import { GrandOpening } from './GrandOpening';
import { Hotspots, useStationKinds } from './Hotspots';
import { RUSH_HIT, RushButton, useRushPhase } from './RushButton';
import type { BonusPath, BurstSpec } from './shared';

const ROUND = 44;
const EDGE = 8;
const GAP = 8;

export function PlayLayer({ layout }: { layout: SceneLayout }) {
  const sim = useGame((s) => E.isSim(s.cfg));
  const businessIds = useGame((s) => s.cfg.businesses.map((b) => b.id).join('|'));
  const unlockedNow = useGame((s) => extrasUnlocked(s.cfg, s.game));
  // Once shown, the extras stay for this visit even if a state change briefly reads otherwise.
  const unlockedRef = useRef(unlockedNow);
  if (unlockedNow) unlockedRef.current = true;
  const unlocked = unlockedRef.current;
  // They pop in only when they appear in front of the player, not on every visit to the tab.
  const [popIn] = useState(() => !unlockedNow);

  const kinds = useStationKinds();
  const { phase, until, readyAt } = useRushPhase(unlocked);

  // --- window position, for hint targets and coins flying to the header
  const rootRef = useRef<HostInstance>(null);
  const offset = useRef({ x: 0, y: 0 });
  const [measured, setMeasured] = useState(0);
  const measure = useCallback(() => {
    rootRef.current?.measureInWindow((x, y, w, h) => {
      if (!(w > 0 && h > 0 && Number.isFinite(x) && Number.isFinite(y))) return;
      if (x === offset.current.x && y === offset.current.y) return;
      offset.current = { x, y };
      setMeasured((n) => n + 1);
    });
  }, []);
  const toWindow = useCallback((x: number, y: number) => ({ x: x + offset.current.x, y: y + offset.current.y }), []);

  useEffect(() => {
    if (measured === 0) return;
    const ids = businessIds.split('|');
    const keys: string[] = [];
    const put = (key: string, r: { x: number; y: number; width: number; height: number } | null) => {
      if (!r) return;
      keys.push(key);
      targets.set(key, { ...r, x: r.x + offset.current.x, y: r.y + offset.current.y }, measure);
    };
    // Only stations the player runs by hand are a "tap here" target; automated ones are not.
    ids.slice(0, layout.stations.length).forEach((id, i) => {
      if (kinds[i] === 'i' || kinds[i] === 'r') put(`tapStation:${id}`, stationRect(layout, i));
    });
    if (sim) put('bell', bellRect(layout));
    if (phase !== 'hidden') put('startRush', { x: layout.rush.x - RUSH_HIT / 2, y: layout.rush.y - RUSH_HIT / 2, width: RUSH_HIT, height: RUSH_HIT });
    return () => keys.forEach((k) => targets.set(k, null));
  }, [measured, businessIds, kinds, layout, sim, phase, measure]);

  // --- rush: ring progress and atmosphere, animated to the real end times
  const ringP = useSharedValue(1);
  const rushVis = useSharedValue(0);
  useEffect(() => {
    const { cfg, game } = useGame.getState();
    const now = Date.now();
    rushVis.value = withTiming(phase === 'active' ? 1 : 0, { duration: phase === 'active' ? 350 : 600 });
    if (phase === 'active') {
      const total = Math.max(1, E.rushSeconds(cfg, game) * 1000);
      ringP.value = Math.min(1, (until - now) / total);
      ringP.value = withTiming(0, { duration: Math.max(0, until - now), easing: Easing.linear });
    } else if (phase === 'cooling') {
      // The recharge ring moves a sub-pixel per frame over minutes: step it once a second on a JS
      // timer instead of animating (and redrawing the effects canvas) every frame while idle.
      const total = Math.max(1, (cfg.sim?.rush.cooldownSeconds ?? 1) * 1000);
      const step = () => (ringP.value = Math.max(0, Math.min(1, 1 - (readyAt - Date.now()) / total)));
      step();
      const id = setInterval(step, 1000);
      return () => clearInterval(id);
    } else ringP.value = withTiming(1, { duration: 200 });
  }, [phase, until, readyAt, ringP, rushVis]);

  // --- flying bonus and coin bursts
  const bonus = {
    p: useSharedValue(0),
    on: useSharedValue(0),
    path: useSharedValue<BonusPath>({ x0: -100, x1: -100, y: 0, amp: 0, waves: 1 }),
  };
  const bonusRef = useRef(bonus);
  const [bursts, setBursts] = useState<BurstSpec[]>([]);
  const burstSeq = useRef(0);
  const onCaught = useCallback((x: number, y: number) => setBursts((b) => [...b.slice(-3), { id: ++burstSeq.current, x, y }]), []);
  const onBurstDone = useCallback((id: number) => setBursts((b) => b.filter((x) => x.id !== id)), []);

  // --- grand opening
  const [opening, setOpening] = useState<Opening | null>(() => openings.take());
  useEffect(() => openings.subscribe(() => setOpening(openings.take())), []);
  const endOpening = useCallback(() => setOpening(null), []);

  const rightChest = EDGE + ROUND + GAP;
  const [chipRight, setChipRight] = useState(EDGE);
  return (
    <View
      ref={rootRef}
      onLayout={measure}
      collapsable={false}
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, top: 0, width: layout.width, height: layout.height }}
    >
      <Hotspots layout={layout} sim={sim} kinds={kinds} />
      <Effects layout={layout} rushPhase={phase} rushVis={rushVis} ringP={ringP} bonus={bonusRef.current} bursts={bursts} onBurstDone={onBurstDone} confettiSeq={opening?.seq ?? 0} />
      {phase !== 'hidden' ? (
        <PopIn animate={popIn} delay={0} style={{ position: 'absolute', left: 0, top: 0, width: layout.width, height: layout.height, transformOrigin: `${layout.rush.x}px ${layout.rush.y}px` }}>
          <RushButton layout={layout} phase={phase} until={until} readyAt={readyAt} />
        </PopIn>
      ) : null}
      <View pointerEvents="box-none" onLayout={(e) => setChipRight(EDGE + e.nativeEvent.layout.width)} style={{ position: 'absolute', left: EDGE, top: EDGE }}>
        <VenueChip />
      </View>
      {unlocked ? (
        <>
          <PopIn animate={popIn} delay={220} style={{ position: 'absolute', right: rightChest, top: EDGE }}>
            <ChestButton size={ROUND} />
          </PopIn>
          <PopIn animate={popIn} delay={440} style={{ position: 'absolute', right: EDGE, top: EDGE }}>
            <MissionsButton size={ROUND} />
          </PopIn>
        </>
      ) : null}
      <ComboMeter layout={layout} top={EDGE + (ROUND - 36) / 2} below={EDGE + ROUND + 6} left={chipRight + GAP} right={layout.width - (unlocked ? rightChest + ROUND : 0) - GAP} />
      <BonusFlyer layout={layout} bonus={bonusRef.current} toWindow={toWindow} onCaught={onCaught} />
      <FloatingNumbers layout={layout} />
      {opening ? <GrandOpening layout={layout} opening={opening} onDone={endOpening} /> : null}
    </View>
  );
}

/**
 * Pops its child in with a small bounce the first time it appears in front of the player
 * (`animate`), staggered by `delay`; otherwise shows it as is.
 */
function PopIn({ animate, delay, style, children }: { animate: boolean; delay: number; style: object; children: ReactNode }) {
  const s = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    s.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 240 }));
  }, [animate, delay, s]);
  const a = useAnimatedStyle(() => ({ opacity: Math.min(1, s.value * 2), transform: [{ scale: s.value }] }));
  return (
    <Animated.View pointerEvents="box-none" style={[style, a]}>
      {children}
    </Animated.View>
  );
}
