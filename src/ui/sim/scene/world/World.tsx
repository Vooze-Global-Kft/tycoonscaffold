/**
 * The living restaurant: the drawn, animated venue under the play layer. Kitchen stations with their
 * cooks along the back, the pass with its pile and bell, waiters carrying dishes, guests coming in,
 * eating, paying and leaving. It only draws; taps belong to the play layer above it.
 *
 * Built for 60 fps on a mid-range phone: ONE Skia canvas, a fixed pool of actors, and no React render
 * per engine tick. Actors subscribe to the store and to the simulation's events themselves and write
 * shared values that the drawing reads on the UI thread. React re-renders only when the room's
 * structure changes (stations bought, waiters or tables added, a decor tier, the venue).
 */
import { Canvas, Group, Image, useClock } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, type ReactElement } from 'react';
import { View, type HostInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as E from '../../../../engine/economy';
import type { GameState } from '../../../../engine/types';
import { useGame } from '../../../../state/store';
import { fly } from '../../../juice/fly';
import { useStages } from '../../../theme';
import { Chair, ContactShadow, Station, makePalette } from '../../art/props';
import { UNIT } from '../../art';
import { MAX_SEATS_DRAWN, MAX_STATIONS_DRAWN, MAX_WORKERS_DRAWN, decorTiers, type SceneLayout } from '../../layout';
import { Backdrop } from './Backdrop';
import { useBakedImage } from './bake';
import { cookLook, dishOf, guestPool, stationKindOf, waiterLook, workPoseOf } from './cast';
import type { SceneCtx } from './context';
import { CandleBase, TableSeat, candleSpot, usePayments, type SeatHandle } from './Dining';
import { Entrance, Plant } from './Entrance';
import { useKeepLooks } from './keep';
import { StationSlot, type StationInfo } from './Kitchen';
import { PileCount, PayLabels } from './Overlays';
import { venuePalette } from './palette';
import { PassArea } from './PassArea';
import { Waiter } from './Waiters';

export function World({ layout }: { layout: SceneLayout }) {
  const sim = useGame((s) => E.isSim(s.cfg));
  const venueId = useGame((s) => s.game.activeVenue);
  const hasChain = useGame((s) => Boolean(s.game.venues[s.game.activeVenue]?.chain));
  if (!sim || !hasChain) return null;
  // A new venue is a new room: everything re-seeds, and the room fades in.
  return <Room key={venueId} layout={layout} venueId={venueId} />;
}

/** What the room is made of right now, as a string: React re-renders only when this changes. */
function structureOf(cfg: { businesses: { id: string }[] }, game: GameState, venueId: string): string {
  const v = game.venues[venueId];
  const chain = v?.chain;
  const owned = cfg.businesses
    .slice(0, MAX_STATIONS_DRAWN)
    .map((b) => ((v?.businesses[b.id]?.owned ?? 0) > 0 ? '1' : '0'))
    .join('');
  const tiers = decorTiers(chain?.transportLevel ?? 0, chain?.salesLevel ?? 0);
  return `${owned}|${Math.min(MAX_WORKERS_DRAWN, chain?.workers.length ?? 0)}|${Math.min(MAX_SEATS_DRAWN, chain?.seats.length ?? 0)}|${tiers.uniform}|${tiers.dining}`;
}

function Room({ layout: L, venueId }: { layout: SceneLayout; venueId: string }) {
  const cfg = useGame((s) => s.cfg);
  const structure = useGame((s) => structureOf(s.cfg, s.game, venueId));
  const stageInfo = useStages();
  const clock = useClock();
  const doorSwing = useSharedValue(0);
  const bellRung = useSharedValue(0);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const bornAt = useRef(Date.now()).current;

  const venueIndex = cfg.sim ? Math.max(0, cfg.sim.venues.findIndex((v) => v.id === venueId)) : 0;
  const venueColors = cfg.sim?.venues[venueIndex]?.palette;
  const palette = useMemo(() => makePalette(venuePalette(venueIndex, venueColors)), [venueIndex, venueColors]);
  const stages = useMemo(
    () => ({ production: stageInfo.production.color, transport: stageInfo.transport.color, sales: stageInfo.sales.color }),
    [stageInfo],
  );

  const ctx = useMemo<SceneCtx>(
    () => ({ layout: L, cfg, venueId, clock, palette, stages, origin, doorSwing, bellRung, bornAt }),
    [L, cfg, venueId, clock, palette, stages, doorSwing, bellRung, bornAt],
  );

  const [ownedFlags, workerCount, seatCount, uniform, dining] = useMemo(() => {
    const [o, w, se, u, d] = structure.split('|');
    return [o, Number(w), Math.min(Number(se), L.tables.length), Number(u), Number(d)] as const;
  }, [structure, L.tables.length]);

  const stations = useMemo<StationInfo[]>(() => {
    const next = ownedFlags.indexOf('0');
    const list: StationInfo[] = [];
    cfg.businesses.slice(0, Math.min(MAX_STATIONS_DRAWN, L.stations.length)).forEach((b, i) => {
      const owned = ownedFlags[i] === '1';
      if (!owned && i !== next) return;
      const kind = stationKindOf(b.stationKind);
      list.push({
        index: i,
        businessId: b.id,
        status: owned ? 'owned' : 'next',
        kind,
        dish: dishOf(kind),
        workPose: workPoseOf(kind),
        look: cookLook(cfg, venueId, b.id, stages.production),
      });
    });
    return list;
  }, [cfg, ownedFlags, venueId, stages.production, L.stations.length]);

  const freeSlots = useMemo(() => {
    const used = new Set(stations.map((s) => s.index));
    return L.stations.map((_, i) => i).filter((i) => !used.has(i));
  }, [stations, L.stations]);

  const dishes = useMemo(() => {
    const own = stations.filter((s) => s.status === 'owned').map((s) => s.dish);
    return own.length > 0 ? own : stations.length > 0 ? [stations[0].dish] : [dishOf('generic')];
  }, [stations]);

  const waiterLooks = useMemo(
    () => Array.from({ length: workerCount }, (_, i) => waiterLook(cfg, venueId, i, uniform, stages.transport)),
    [workerCount, cfg, venueId, uniform, stages.transport],
  );

  const pool = useMemo(() => guestPool(cfg), [cfg]);
  const allLooks = useMemo(() => [...stations.map((s) => s.look), ...waiterLooks, ...pool], [stations, waiterLooks, pool]);
  useKeepLooks(allLooks);

  // Payments: the seat's coin, the "+cash" label and coins flying to the header.
  const handles = useRef(new Map<number, SeatHandle>()).current;
  const labelApi = useRef<((seat: number, cash: number) => void) | null>(null);
  const countApi = useRef<((n: number) => void) | null>(null);
  const onLabel = useCallback((seat: number, cash: number) => labelApi.current?.(seat, cash), []);
  const onCount = useCallback((n: number) => countApi.current?.(n), []);
  const onFly = useCallback(
    (seat: number, count: number) => {
      const o = origin.current;
      const t = L.tables[seat];
      if (!o || !t) return;
      fly.emit({ kind: 'cash', from: { x: o.x + t.x, y: o.y + t.y - 34 * L.artScale }, to: 'header:cash', count: Math.min(6, Math.max(1, count)) });
    },
    [L],
  );
  usePayments(ctx, handles, onLabel, onFly);

  // Where the canvas is in the window, measured once per layout (the scene never scrolls).
  const root = useRef<HostInstance>(null);
  const measure = useCallback(() => {
    root.current?.measureInWindow((x: number, y: number, w: number, h: number) => {
      if (w > 0 && h > 0 && Number.isFinite(x) && Number.isFinite(y)) origin.current = { x, y };
    });
  }, []);
  useEffect(() => {
    const id = setTimeout(measure, 300);
    return () => clearTimeout(id);
  }, [measure, L]);

  // Quick fade-in, so a venue change reads as a cut to a new place rather than a blink.
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.value = withTiming(1, { duration: 260 });
  }, [fade]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  // Everything that never moves (the room, the floor shadows of the tables, the padlocked next
  // station) is drawn once into an image; live vectors stand in until it is ready.
  const backKey = `${structure}|${L.width}x${L.height}|${venueIndex}|${JSON.stringify(stages)}|${JSON.stringify(venueColors ?? null)}`;
  const backLayer = () => <BackLayer ctx={ctx} freeSlots={freeSlots} dining={dining} seatCount={seatCount} locked={stations.filter((s) => s.status === 'next')} />;
  const backImage = useBakedImage(backLayer, L.width, L.height, backKey, Date.now() - bornAt > 600 ? 650 : 0);
  const baked = backImage !== null;

  // Furniture that never moves but stands among the people (chairs, candle holders, plants) keeps
  // its place in the depth order: it is drawn once into a transparent image, and each piece shows
  // its own clipped rectangle of that image at its own zIndex.
  const fixtures = useMemo(() => fixturesOf(ctx, seatCount, dining), [ctx, seatCount, dining]);
  const fixturesImage = useBakedImage(() => <FixturesLayer fixtures={fixtures} />, L.width, L.height, `f|${backKey}`, Date.now() - bornAt > 600 ? 650 : 0);
  const fixed = fixturesImage !== null;

  return (
    <View
      ref={root}
      collapsable={false}
      onLayout={measure}
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, top: 0, width: L.width, height: L.height, backgroundColor: palette.floorA }}
    >
      <Animated.View style={[{ width: L.width, height: L.height }, fadeStyle]}>
        <Canvas style={{ width: L.width, height: L.height }}>
          {backImage ? <Image image={backImage} x={0} y={0} width={L.width} height={L.height} fit="fill" /> : backLayer()}
          <Group>
            <Entrance ctx={ctx} />
            {stations.map((info) => (
              <StationSlot key={info.businessId} ctx={ctx} info={info} bodyBaked={baked && info.status === 'next'} />
            ))}
            <PassArea ctx={ctx} dishes={dishes} onCount={onCount} />
            {waiterLooks.map((look, i) => (
              <Waiter key={i} ctx={ctx} index={i} look={look} dish={dishes[i % dishes.length]} />
            ))}
            {Array.from({ length: seatCount }, (_, i) => (
              <TableSeat key={i} ctx={ctx} index={i} dishes={dishes} dining={dining} handles={handles} pool={pool} shadowBaked={baked} />
            ))}
            {fixturesImage
              ? fixtures.map((f) => (
                  <Group key={f.key} zIndex={f.z} clip={f.rect}>
                    <Image image={fixturesImage} x={0} y={0} width={L.width} height={L.height} fit="fill" />
                  </Group>
                ))
              : fixtures.map((f) => (
                  <Group key={f.key} zIndex={f.z}>
                    {f.node}
                  </Group>
                ))}
          </Group>
        </Canvas>
        <PileCount layout={L} api={countApi} />
        <PayLabels layout={L} api={labelApi} />
      </Animated.View>
    </View>
  );
}

/** The part of the room that never moves, drawn into the baked image (or live until it is ready). */
function BackLayer({ ctx, freeSlots, dining, seatCount, locked }: { ctx: SceneCtx; freeSlots: number[]; dining: number; seatCount: number; locked: StationInfo[] }) {
  const L = ctx.layout;
  const k = L.artScale;
  return (
    <Group>
      <Backdrop ctx={ctx} freeSlots={freeSlots} dining={dining} />
      {L.tables.slice(0, seatCount).map((t, i) => (
        <ContactShadow key={`s${i}`} x={t.x + 6 * k} y={t.y} width={70} height={13} scale={k} />
      ))}
      {locked.map((info) => {
        const st = L.stations[info.index];
        return st ? <Station key={info.businessId} kind={info.kind} x={st.x} y={st.y} scale={L.stationScale} palette={ctx.palette} working={0} locked clock={ctx.clock} dish={info.dish} seed={info.index * 131} /> : null;
      })}
    </Group>
  );
}

interface Fixture {
  key: string;
  z: number;
  rect: { x: number; y: number; width: number; height: number };
  node: ReactElement;
}

/** The still furniture standing among the people, each with the rectangle it covers. */
function fixturesOf(ctx: SceneCtx, seatCount: number, dining: number): Fixture[] {
  const L = ctx.layout;
  const k = L.artScale;
  const box = (x: number, y: number, halfW: number, up: number, down: number) => ({ x: x - halfW, y: y - up, width: halfW * 2, height: up + down });
  const out: Fixture[] = [];
  for (let i = 0; i < seatCount; i++) {
    const spot = L.guests[i];
    const t = L.tables[i];
    if (!spot || !t) continue;
    const u = UNIT * k;
    out.push({ key: `chair${i}`, z: spot.y - 0.5, rect: box(spot.x, spot.y, 19 * u, 46 * u, 3 * u), node: <Chair x={spot.x} y={spot.y} scale={k} palette={ctx.palette} facing={-1} /> });
    if (dining >= 2) {
      const c = candleSpot(L, t);
      out.push({ key: `candle${i}`, z: t.y + 0.1, rect: box(c.x, c.y, 5 * k, 9.5 * k, 2.5 * k), node: <CandleBase x={c.x} y={c.y} k={k} /> });
    }
  }
  if (dining >= 3) {
    const plants = [
      { x: 10 * L.unit, y: L.pass.y + L.pass.height + 26 * k, size: 1 },
      { x: L.door.x - 36 * k, y: L.door.y + 4 * k, size: 0.9 },
    ];
    plants.forEach((p, i) => {
      const s = k * p.size;
      out.push({ key: `plant${i}`, z: p.y, rect: box(p.x, p.y, 15 * s, 40 * s, 5 * s), node: <Plant ctx={ctx} x={p.x} y={p.y} size={p.size} /> });
    });
  }
  return out;
}

/** All still furniture at its place in the room, on a transparent background: the source of the fixtures image. */
function FixturesLayer({ fixtures }: { fixtures: Fixture[] }) {
  return <Group>{[...fixtures].sort((a, b) => a.z - b.z).map((f) => <Group key={f.key}>{f.node}</Group>)}</Group>;
}
