/**
 * The waiters (the transport workers). Each one follows its engine worker: the engine moves them
 * ten times a second, and here they glide between those positions on the UI thread for the time
 * the ticks are really apart. They carry a dish while loaded, doze at the pass until the bell rings
 * when nobody manages them (and pop a "!" when it does), and all stand up and cheer when the
 * automation hire arrives.
 */
import { Circle, Group, RoundedRect } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { Easing, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useGame } from '../../../../state/store';
import { Character, type LookInput } from '../../art';
import type { DishLook, Pose } from '../../art/types';
import { MAX_WORKERS_DRAWN, workerFrame } from '../../layout';
import { putTS, useMatrix } from '../matrix';
import type { SceneCtx } from './context';
import { glide } from './ticker';

const CHEER_MS = 1200;
const BANG_MS = 1500;
const WAITER_POSES: readonly Pose[] = ['idle', 'walk', 'carry', 'sleep', 'cheer'];

export function Waiter({ ctx, index, look, dish }: { ctx: SceneCtx; index: number; look: LookInput; dish: DishLook }) {
  const { layout: L, clock, venueId } = ctx;
  const x = useSharedValue(L.door.x);
  const y = useSharedValue(L.door.y);
  const facing = useSharedValue(1);
  const pose = useSharedValue<Pose>('idle');
  const visible = useSharedValue(0);
  const bang = useSharedValue(1);

  useEffect(() => {
    let shown = false;
    let cheerUntil = 0;
    let lastWorker: unknown = null;
    let lastAuto: boolean | null = null;
    let lastPose: Pose | null = null;
    const apply = (jump: boolean) => {
      const chain = useGame.getState().game.venues[venueId]?.chain;
      const w = chain?.workers[index];
      if (!chain || !w || index >= MAX_WORKERS_DRAWN) {
        visible.value = 0;
        shown = false;
        return;
      }
      if (lastAuto === false && chain.transportManaged) cheerUntil = Date.now() + CHEER_MS;
      lastAuto = chain.transportManaged;
      const cheering = Date.now() < cheerUntil;
      if (w === lastWorker && !cheering && lastPose !== 'cheer') return;
      lastWorker = w;
      const f = workerFrame(L, w, index, chain.workers.length, chain.seats.length, chain.transportManaged);
      const teleport = jump || !shown;
      glide(x, f.x, teleport);
      glide(y, f.y, teleport);
      facing.value = f.facing;
      const next: Pose = cheering && !f.moving ? 'cheer' : f.pose;
      // Woken by the bell: the "!" pops as the waiter gets up.
      if (lastPose === 'sleep' && next !== 'sleep' && !jump) {
        bang.value = 0;
        bang.value = withTiming(1, { duration: BANG_MS, easing: Easing.linear });
      }
      lastPose = next;
      pose.value = next;
      visible.value = f.visible ? 1 : 0;
      shown = f.visible;
    };
    apply(true);
    return useGame.subscribe((s, prev) => {
      if (s.game !== prev.game) apply(false);
    });
  }, [venueId, index, L, x, y, facing, pose, visible, bang]);

  // Hidden by moving off the canvas: a parent group's opacity does not reach children sorted by zIndex.
  const shownX = useDerivedValue(() => (visible.value > 0.5 ? x.value : -9999));
  const z = useDerivedValue(() => y.value);
  return (
    <Group zIndex={z}>
      <Character look={look} x={shownX} y={y} facing={facing} pose={pose} clock={clock} scale={L.artScale} dish={dish} poses={WAITER_POSES} seed={index * 977 + 3} />
      <Bang ctx={ctx} x={x} y={y} progress={bang} />
    </Group>
  );
}

/** A "!" that pops over a waiter's head when the bell wakes them. */
function Bang({ ctx, x, y, progress }: { ctx: SceneCtx; x: SharedValue<number>; y: SharedValue<number>; progress: SharedValue<number> }) {
  const { layout: L } = ctx;
  const k = L.artScale;
  // A matrix filled in place; while the "!" is not showing nothing is computed or redrawn,
  // however much the waiter moves.
  const matrix = useMatrix(
    (o) => {
      'worklet';
      const u = progress.value;
      const hidden = !(u >= 0 && u < 1);
      if (hidden && o[0] === 0) return false;
      let s = 0;
      if (!hidden) {
        // Pop in with an overshoot, hold, then shrink away.
        if (u < 0.18) {
          const t = u / 0.18;
          s = Math.max(0, 1 + 0.35 * Math.sin(Math.PI * t) - (1 - t) * 1);
        } else if (u < 0.8) s = 1;
        else s = 1 - (u - 0.8) / 0.2;
      }
      putTS(o, x.value + 8 * k, y.value - 62 * k - (u > 0 && u < 1 ? 4 * k * u : 0), s * k, s * k);
    },
    [progress, x, y, k],
  );
  return (
    <Group matrix={matrix}>
      <Circle cx={0} cy={0} r={11} color="#3A2416" />
      <Circle cx={0} cy={0} r={9} color="#FFFFFF" />
      <RoundedRect x={-1.9} y={-6.5} width={3.8} height={8} r={1.9} color="#3A2416" />
      <Circle cx={0} cy={4.6} r={2} color="#3A2416" />
    </Group>
  );
}
