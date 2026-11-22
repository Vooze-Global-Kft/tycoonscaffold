/**
 * The kitchen line along the back wall: one station per business, lit while it works, the next one
 * to unlock as a padlocked silhouette, and a cook at each station that has its automation hire.
 *
 * Everything that happens here is read from the store, not from taps: a level bought bounces the
 * station, a milestone adds a gold burst, the first purchase drops the station in from above, a
 * hire walks the new cook in from the front door. Every finished cycle tosses a dish to the pass.
 */
import { Group } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Easing, useDerivedValue, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import * as E from '../../../../engine/economy';
import { simEvents } from '../../../../state/events';
import { useGame } from '../../../../state/store';
import { Character, type LookInput } from '../../art';
import { FlyingDish, PASS_HEIGHT, SparkleBurst, Station, type StationArtKind } from '../../art/props';
import type { DishLook, Pose } from '../../art/types';
import { kitchenPath, type Point } from '../../layout';
import { sceneBus } from '../bus';
import type { SceneCtx } from './context';

export interface StationInfo {
  index: number;
  businessId: string;
  status: 'owned' | 'next';
  kind: StationArtKind;
  dish: DishLook;
  workPose: Pose;
  look: LookInput;
}

const TOSS_MS = 350;
const FLIGHTS = 2;

/** Where dishes land on the pass: its top surface, around the pile. */
export function passTop(ctx: SceneCtx): number {
  const L = ctx.layout;
  const k = L.pass.height / PASS_HEIGHT;
  return L.pass.y + L.pass.height - 21.6 * k;
}

export function StationSlot({ ctx, info }: { ctx: SceneCtx; info: StationInfo }) {
  const { layout: L, clock, venueId, cfg } = ctx;
  const st = L.stations[info.index];
  const spot = L.cooks[info.index];
  const s = L.stationScale;

  const read = () => useGame.getState().game.venues[venueId]?.businesses[info.businessId];
  const initial = read();
  const working = useSharedValue(initial && initial.owned > 0 && (initial.running || initial.managed) ? 1 : 0);
  const bounce = useSharedValue(1);
  const drop = useSharedValue(0);
  const burst = useSharedValue(0);
  const managed = useSharedValue(initial?.managed && initial.owned > 0 ? 1 : 0);
  /** 0..1 along the hire's walk-in; 1 = at the station. */
  const walk = useSharedValue(1);
  const arrivedAt = useSharedValue(-1e9);
  const flights = [useSharedValue(0), useSharedValue(0)];

  // Store changes: running state, levels bought, milestones, the first purchase and the hire.
  useEffect(() => {
    let prev = read();
    return useGame.subscribe((state) => {
      const b = state.game.venues[venueId]?.businesses[info.businessId];
      if (!b || b === prev) return;
      const before = prev;
      prev = b;
      working.value = b.owned > 0 && (b.running || b.managed) ? 1 : 0;
      if (!before) return;
      if (b.owned > before.owned) {
        if (before.owned === 0) {
          // First purchase: down from the ceiling with a bounce, the padlock bursting off.
          drop.value = withSequence(withTiming(-(st.y + 10), { duration: 0 }), withTiming(0, { duration: 520, easing: Easing.bounce }));
          burst.value += 1;
        } else {
          bounce.value = withSequence(withTiming(1.15, { duration: 80, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 80, easing: Easing.in(Easing.quad) }));
          if (E.previousMilestone(cfg, b.owned) > before.owned) burst.value += 1;
        }
      }
      if (b.managed && !before.managed && b.owned > 0) {
        managed.value = 1;
        arrivedAt.value = -1e9;
        walk.value = 0;
        const path = kitchenPath(L, spot);
        let len = 0;
        for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
        const ms = Math.max(1200, Math.min(3200, (len / (L.width * 0.42)) * 1000));
        walk.value = withTiming(1, { duration: ms, easing: Easing.linear }, (done) => {
          'worklet';
          if (done) arrivedAt.value = clock.value;
        });
      } else if (!b.managed) managed.value = 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, info.businessId, L]);

  // Finished cycles toss a dish to the pass; a tap squashes the station a little.
  useEffect(() => {
    let next = 0;
    const offEvents = simEvents.subscribe((events) => {
      for (const e of events) {
        if (e.type !== 'cycle' || e.venue !== venueId || e.business !== info.businessId) continue;
        const f = flights[next];
        // Both dishes in the air: skip this one rather than restart a flight mid-arc.
        if (f.value > 0 && f.value < 1) continue;
        next = (next + 1) % FLIGHTS;
        f.value = 0;
        f.value = withTiming(1, { duration: TOSS_MS, easing: Easing.linear });
      }
    });
    const offBus = sceneBus.subscribe((m) => {
      if (m.type === 'tapStation' && m.businessId === info.businessId) {
        bounce.value = withSequence(withTiming(0.94, { duration: 60 }), withTiming(1.06, { duration: 90 }), withTiming(1, { duration: 90 }));
      }
    });
    return () => {
      offEvents();
      offBus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, info.businessId]);

  const scale = useDerivedValue(() => s * bounce.value);
  const y = useDerivedValue(() => st.y + drop.value);
  const from = useMemo(() => ({ x: st.x, y: st.y - 30 * s }), [st, s]);
  const to = useMemo(() => ({ x: L.passStack.x + ((info.index * 37) % 50) - 25, y: passTop(ctx) }), [L, info.index, ctx]);

  if (!st) return null;
  const owned = info.status === 'owned';
  return (
    <>
      <Station
        kind={info.kind}
        x={st.x}
        y={y}
        scale={scale}
        palette={ctx.palette}
        working={working as SharedValue<number | boolean>}
        locked={!owned}
        clock={clock}
        dish={info.dish}
        seed={info.index * 131}
        zIndex={st.y}
      />
      {owned ? (
        <Cook ctx={ctx} spot={spot} look={info.look} workPose={info.workPose} working={working} managed={managed} walk={walk} arrivedAt={arrivedAt} />
      ) : null}
      <SparkleBurst x={st.x} y={st.y - 34 * s} scale={s} trigger={burst} clock={clock} plusOne={false} zIndex={5000} />
      {owned
        ? flights.map((p, i) => <FlyingDish key={i} from={from} to={to} progress={p} height={34 * s} spins={0.5} dish={info.dish} scale={L.artScale * 1.1} zIndex={4000} />)
        : null}
    </>
  );
}

function Cook({
  ctx,
  spot,
  look,
  workPose,
  working,
  managed,
  walk,
  arrivedAt,
}: {
  ctx: SceneCtx;
  spot: Point;
  look: LookInput;
  workPose: Pose;
  working: SharedValue<number>;
  managed: SharedValue<number>;
  walk: SharedValue<number>;
  arrivedAt: SharedValue<number>;
}) {
  const { layout: L, clock } = ctx;
  // The walk-in route as plain numbers, so the worklets below can follow it on the UI thread.
  const route = useMemo(() => {
    const pts = kitchenPath(L, spot);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
    return { xs, ys, acc, total: acc[acc.length - 1] || 1 };
  }, [L, spot]);

  const pos = useDerivedValue(() => {
    const u = walk.value;
    const { xs, ys, acc, total } = route;
    if (u >= 1) return [xs[xs.length - 1], ys[ys.length - 1], -1];
    const d = Math.max(0, u) * total;
    let i = 1;
    while (i < acc.length - 1 && acc[i] < d) i++;
    const seg = acc[i] - acc[i - 1] || 1;
    const t = Math.min(1, Math.max(0, (d - acc[i - 1]) / seg));
    const dx = xs[i] - xs[i - 1];
    return [xs[i - 1] + dx * t, ys[i - 1] + (ys[i] - ys[i - 1]) * t, Math.abs(dx) < 0.5 ? -1 : dx > 0 ? 1 : -1];
  });
  const x = useDerivedValue(() => pos.value[0]);
  const y = useDerivedValue(() => pos.value[1]);
  const facing = useDerivedValue(() => pos.value[2]);
  const pose = useDerivedValue<Pose>(() => {
    if (walk.value < 1) return 'walk';
    if (clock.value - arrivedAt.value < 1100) return 'cheer';
    return working.value > 0.5 ? workPose : 'idle';
  });
  // Hidden by moving off the canvas: a parent group's opacity does not reach children sorted by zIndex.
  const shownX = useDerivedValue(() => (managed.value > 0.5 ? x.value : -9999));
  const z = useDerivedValue(() => pos.value[1]);
  return (
    <Group zIndex={z}>
      <Character look={look} x={shownX} y={y} facing={facing} pose={pose} clock={clock} scale={L.artScale} poses={['idle', 'walk', 'cheer', workPose]} />
    </Group>
  );
}
