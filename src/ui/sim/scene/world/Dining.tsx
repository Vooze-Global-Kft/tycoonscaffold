/**
 * The dining room: a table per seat, each with its chair and guest. A guest walks in through the
 * front door (it swings as they pass), sits and waits with an order bubble, eats when a waiter
 * serves them (the plate pops onto the table with a little steam), pays (a coin pops over the
 * table and its value flies to the cash counter), cheers and leaves. Guests are seeded by seat and
 * visit, so the room keeps changing faces.
 */
import { Circle, Group, Oval, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Easing, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { simEvents } from '../../../../state/events';
import { useGame } from '../../../../state/store';
import { Character } from '../../art';
import { Chair, Coin, ContactShadow, Table } from '../../art/props';
import type { ArtPalette, DishLook, Pose, TableState } from '../../art/types';
import { guestFrame, tableState } from '../../layout';
import { guestLook } from './cast';
import { isLateMount, type SceneCtx } from './context';
import { glide } from './ticker';

const GUEST_POSES: readonly Pose[] = ['walk', 'sit-wait', 'sit-eat', 'cheer'];
const COIN_MS = 820;
const STEAM_MS = 1600;

/** What a seat can be asked to show from outside: a payment. */
export interface SeatHandle {
  pay(): void;
}

export function TableSeat({
  ctx,
  index,
  dishes,
  dining,
  handles,
}: {
  ctx: SceneCtx;
  index: number;
  dishes: DishLook[];
  dining: number;
  handles: Map<number, SeatHandle>;
}) {
  const { layout: L, clock, venueId, cfg } = ctx;
  const t = L.tables[index];
  const spot = L.guests[index];
  const k = L.artScale;

  const seatNow = () => useGame.getState().game.venues[venueId]?.chain?.seats[index];
  const [guest, setGuest] = useState(() => seatNow()?.guest ?? 0);
  const look = useMemo(() => guestLook(cfg, index, guest), [cfg, index, guest]);
  const dish = dishes.length > 0 ? dishes[guest % dishes.length] : undefined;

  const x = useSharedValue(spot.x);
  const y = useSharedValue(spot.y);
  const facing = useSharedValue(-1);
  const pose = useSharedValue<Pose>('sit-wait');
  const visible = useSharedValue(0);
  const table = useSharedValue<TableState>('empty');
  const servedAt = useSharedValue(-1e9);
  const coinAt = useSharedValue(-1e9);
  const pop = useSharedValue(isLateMount(ctx) ? 0 : 1);

  useEffect(() => {
    if (pop.value < 1) pop.value = withSpring(1, { damping: 9, stiffness: 160 });
    handles.set(index, { pay: () => (coinAt.value = clock.value) });
    let shown = false;
    let lastSeat: unknown = null;
    let lastGuest = guest;
    let lastPhase = '';
    let lastT = 0;
    const apply = (jump: boolean) => {
      const seat = seatNow();
      if (!seat || seat === lastSeat) return;
      lastSeat = seat;
      if (seat.guest !== lastGuest && seat.phase !== 'empty') {
        lastGuest = seat.guest;
        setGuest(seat.guest);
      }
      const f = guestFrame(L, seat, index);
      const teleport = jump || !shown || !f.visible;
      glide(x, f.x, teleport);
      glide(y, f.y, teleport);
      facing.value = f.facing;
      pose.value = f.pose;
      visible.value = f.visible ? 1 : 0;
      shown = f.visible;
      const ts = tableState(seat);
      if (ts === 'food' && table.value !== 'food' && !jump) servedAt.value = clock.value;
      table.value = ts;
      // The door swings as the guest passes it, coming in and going out.
      const crossed = (phase: string, at: number) => seat.phase === phase && seat.t >= at && (lastPhase !== phase || lastT < at);
      if (!jump && (crossed('arriving', 0.2) || crossed('leaving', 0.82))) ctx.doorSwing.value += 1;
      lastPhase = seat.phase;
      lastT = seat.t;
    };
    apply(true);
    const off = useGame.subscribe((s, prev) => {
      if (s.game !== prev.game) apply(false);
    });
    return () => {
      off();
      handles.delete(index);
    };
    // The guest id only seeds the first comparison; later changes come from the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, index, L, ctx]);

  const opacity = useDerivedValue(() => visible.value);
  const z = useDerivedValue(() => y.value);
  const scale = useDerivedValue(() => k * pop.value);
  const tablePalette = useMemo<Partial<ArtPalette>>(
    () => (dining >= 1 ? { ...ctx.palette, primary: ctx.stages.sales } : ctx.palette),
    [dining, ctx.palette, ctx.stages.sales],
  );

  return (
    <>
      <Group zIndex={spot.y - 0.5}>
        <ContactShadow x={t.x + 6 * k} y={t.y} width={70} height={13} scale={scale} />
        <Chair x={spot.x} y={spot.y} scale={scale} palette={ctx.palette} facing={-1} />
      </Group>
      <Group opacity={opacity} zIndex={z}>
        <Character look={look} x={x} y={y} facing={facing} pose={pose} clock={clock} scale={k} dish={dish} poses={GUEST_POSES} seed={index * 313 + guest} />
      </Group>
      <Group zIndex={t.y}>
        <Table x={t.x} y={t.y} scale={scale} palette={tablePalette} state={table} dish={dish} clock={clock} />
        {dining >= 2 ? <Candle ctx={ctx} x={t.x - 11 * k} y={t.y - 16.5 * k} seed={index} /> : null}
        <Steam ctx={ctx} x={t.x} y={t.y - 21 * k} at={servedAt} />
      </Group>
      <PayCoin ctx={ctx} x={t.x} y={t.y - 30 * k} at={coinAt} />
    </>
  );
}

/** Three wisps rising off a freshly served plate. */
function Steam({ ctx, x, y, at }: { ctx: SceneCtx; x: number; y: number; at: { value: number } }) {
  const { clock, layout: L } = ctx;
  const k = L.artScale;
  const path = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (const dx of [-5, 0, 5]) {
      b.moveTo(dx, 0);
      b.cubicTo(dx - 3, -4, dx + 3, -7, dx, -11);
    }
    return b.build();
  }, []);
  const opacity = useDerivedValue(() => {
    const u = (clock.value - at.value) / STEAM_MS;
    return u < 0 || u > 1 ? 0 : Math.sin(Math.PI * u) * 0.75;
  });
  const transform = useDerivedValue(() => {
    const u = Math.max(0, Math.min(1, (clock.value - at.value) / STEAM_MS));
    return [{ translateX: x }, { translateY: y - 6 * k * u }, { scale: k }];
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={path} style="stroke" strokeWidth={2.2} strokeCap="round" color="#FFFFFF" />
    </Group>
  );
}

/** Decor tier 2: a candle on every table, its flame breathing. */
function Candle({ ctx, x, y, seed }: { ctx: SceneCtx; x: number; y: number; seed: number }) {
  const { clock, layout: L } = ctx;
  const k = L.artScale;
  const flame = useDerivedValue(() => {
    const t = clock.value / 1000 + seed * 1.7;
    return [{ translateX: x }, { translateY: y - 9 * k }, { scaleX: k * (1 + 0.08 * Math.sin(t * 9)) }, { scaleY: k * (1 + 0.16 * Math.sin(t * 7.3)) }];
  });
  return (
    <Group>
      <Group transform={[{ translateX: x }, { translateY: y }, { scale: k }]}>
        <Oval x={-4} y={-1.6} width={8} height={3.2} color="#C9A24A" />
        <Path path="M -2.2 0 L -2.2 -8 L 2.2 -8 L 2.2 0 Z" color="#FFF6E0" />
        <Path path="M -2.2 0 L -2.2 -8 L 2.2 -8 L 2.2 0 Z" style="stroke" strokeWidth={1.2} color="#3A2416" />
      </Group>
      <Group transform={flame}>
        <Circle cx={0} cy={-1} r={4.6} color="#FFD98A" opacity={0.35} />
        <Path path="M 0 -4.5 C 2.4 -1.5 2.2 1.6 0 1.8 C -2.2 1.6 -2.4 -1.5 0 -4.5 Z" color="#FFB238" />
      </Group>
    </Group>
  );
}

/** A coin that pops up over a table when the guest pays, spins and fades. */
function PayCoin({ ctx, x, y, at }: { ctx: SceneCtx; x: number; y: number; at: { value: number } }) {
  const { clock, layout: L } = ctx;
  const k = L.artScale;
  const u = useDerivedValue(() => (clock.value - at.value) / COIN_MS);
  const cy = useDerivedValue(() => {
    const v = Math.max(0, Math.min(1, u.value));
    return y - 22 * k * (1 - (1 - v) * (1 - v));
  });
  const scale = useDerivedValue(() => {
    const v = u.value;
    if (v < 0 || v >= 1) return 0;
    const inn = Math.min(1, v / 0.2);
    return k * 0.85 * (inn < 1 ? 1.25 * Math.sin((Math.PI / 2) * inn) : 1);
  });
  const opacity = useDerivedValue(() => {
    const v = u.value;
    return v < 0 || v >= 1 ? 0 : v > 0.7 ? 1 - (v - 0.7) / 0.3 : 1;
  });
  return (
    <Group opacity={opacity} zIndex={6000}>
      <Coin x={x} y={cy} scale={scale} spin={2} clock={clock} />
    </Group>
  );
}

/**
 * Payments of this venue: pops the seat's coin, shows the "+cash" label and announces coins flying
 * to the header. Above four payments a second, flights are merged: one every 250 ms.
 */
export function usePayments(ctx: SceneCtx, handles: Map<number, SeatHandle>, onLabel: (seat: number, cash: number) => void, onFly: (seat: number, count: number) => void) {
  const pending = useRef<{ seat: number; count: number } | null>(null);
  useEffect(() => {
    let lastFly = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      timer = null;
      const p = pending.current;
      pending.current = null;
      if (!p) return;
      lastFly = Date.now();
      onFly(p.seat, p.count);
    };
    const off = simEvents.subscribe((events) => {
      for (const e of events) {
        if (e.type !== 'pay' || e.venue !== ctx.venueId) continue;
        handles.get(e.seat)?.pay();
        onLabel(e.seat, e.cash);
        const p = pending.current;
        pending.current = { seat: e.seat, count: (p?.count ?? 0) + 1 };
        const wait = 250 - (Date.now() - lastFly);
        if (wait <= 0 && !timer) flush();
        else if (!timer) timer = setTimeout(flush, Math.max(0, wait));
      }
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, [ctx, handles, onLabel, onFly]);
}

export { Easing, withTiming };
