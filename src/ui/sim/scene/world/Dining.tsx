/**
 * The dining room: a table per seat, each with its chair and guest. A guest walks in through the
 * front door (it swings as they pass), sits and waits with an order bubble, eats when a waiter
 * serves them (the plate pops onto the table with a little steam), pays (a coin pops over the
 * table and its value flies to the cash counter), cheers and leaves. Guests are seeded by seat and
 * visit, so the room keeps changing faces.
 */
import { Circle, Group, Oval, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import { Easing, useDerivedValue, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { simEvents } from '../../../../state/events';
import { useGame } from '../../../../state/store';
import { Character, type LookInput } from '../../art';
import { Coin, ContactShadow, Table } from '../../art/props';
import { putTS, useMatrix } from '../matrix';
import type { ArtPalette, DishLook, Pose, TableState } from '../../art/types';
import { guestFrame, tableState } from '../../layout';
import { guestLook } from './cast';
import { isLateMount, type SceneCtx } from './context';
import { bump, glide } from './ticker';

const GUEST_POSES: readonly Pose[] = ['walk', 'sit-wait', 'sit-eat', 'cheer'];
const COIN_MS = 820;
const STEAM_MS = 1600;
/** Guests mounted per table, taking turns. */
const GUESTS_PER_SEAT = 2;

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
  pool,
  shadowBaked = false,
}: {
  ctx: SceneCtx;
  index: number;
  dishes: DishLook[];
  dining: number;
  handles: Map<number, SeatHandle>;
  pool: readonly LookInput[];
  /** The table's floor shadow is in the room's baked image (World.tsx BackLayer). */
  shadowBaked?: boolean;
}) {
  const { layout: L, clock, venueId, cfg } = ctx;
  const t = L.tables[index];
  const spot = L.guests[index];
  const k = L.artScale;

  const seatNow = () => useGame.getState().game.venues[venueId]?.chain?.seats[index];
  // A few guests per table are mounted once and take turns (shared values pick the one shown), so
  // a new guest never re-renders React or re-records the canvas. Each seat orders its own dish.
  const looks = useMemo(() => Array.from({ length: GUESTS_PER_SEAT }, (_, j) => guestLook(pool, cfg, index, index * GUESTS_PER_SEAT + j + 1)), [pool, cfg, index]);
  const dish = dishes.length > 0 ? dishes[index % dishes.length] : undefined;

  const x = useSharedValue(spot.x);
  const y = useSharedValue(spot.y);
  const facing = useSharedValue(-1);
  const pose = useSharedValue<Pose>('sit-wait');
  const visible = useSharedValue(0);
  /** Which of the seat's guests is the current one. */
  const slot = useSharedValue(0);
  const table = useSharedValue<TableState>('empty');
  const steam = useSharedValue(1);
  const coin = useSharedValue(1);
  const pop = useSharedValue(isLateMount(ctx) ? 0 : 1);

  useEffect(() => {
    if (pop.value < 1) pop.value = withSpring(1, { damping: 13, stiffness: 170 });
    handles.set(index, {
      pay: () => {
        coin.value = 0;
        coin.value = withTiming(1, { duration: COIN_MS, easing: Easing.linear });
      },
    });
    let shown = false;
    let lastSeat: unknown = null;
    let lastGuest = seatNow()?.guest ?? 0;
    let current = 0;
    let lastPhase = '';
    let lastT = 0;
    let table0: TableState = 'empty';
    const apply = (jump: boolean) => {
      const seat = seatNow();
      if (!seat || seat === lastSeat) return;
      lastSeat = seat;
      if (seat.guest !== lastGuest && seat.phase !== 'empty') {
        lastGuest = seat.guest;
        // The next guest is always another face than the one who just left.
        current = (current + 1) % GUESTS_PER_SEAT;
        slot.value = current;
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
      // Compared with a JS-side copy: reading a shared value here would block on the UI thread on phones.
      if (ts === 'food' && table0 !== 'food' && !jump) {
        steam.value = 0;
        steam.value = withTiming(1, { duration: STEAM_MS, easing: Easing.linear });
      }
      if (ts !== table0) table.value = ts;
      table0 = ts;
      // The door swings as the guest passes it, coming in and going out.
      const crossed = (phase: string, at: number) => seat.phase === phase && seat.t >= at && (lastPhase !== phase || lastT < at);
      if (!jump && (crossed('arriving', 0.2) || crossed('leaving', 0.82))) bump(ctx.doorSwing);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, index, L, ctx]);

  const scale = useDerivedValue(() => k * pop.value);
  const tablePalette = useMemo<Partial<ArtPalette>>(
    () => (dining >= 1 ? { ...ctx.palette, primary: ctx.stages.sales } : ctx.palette),
    [dining, ctx.palette, ctx.stages.sales],
  );

  return (
    <>
      {/* The chair (and, once baked, the floor shadow) is drawn by World.tsx as still furniture. */}
      {shadowBaked ? null : (
        <Group zIndex={spot.y - 0.5}>
          <ContactShadow x={t.x + 6 * k} y={t.y} width={70} height={13} scale={scale} />
        </Group>
      )}
      {looks.map((look, j) => (
        <Guest key={j} ctx={ctx} j={j} slot={slot} visible={visible} look={look} x={x} y={y} facing={facing} pose={pose} dish={dish} seed={index * 313 + j} />
      ))}
      <Group zIndex={t.y}>
        <Table x={t.x} y={t.y} scale={scale} palette={tablePalette} state={table} dish={dish} clock={clock} />
        {dining >= 2 ? <CandleFlame ctx={ctx} at={candleSpot(L, t)} seed={index} /> : null}
        <Steam ctx={ctx} x={t.x} y={t.y - 21 * k} progress={steam} />
      </Group>
      <PayCoin ctx={ctx} x={t.x} y={t.y - 30 * k} progress={coin} />
    </>
  );
}

/**
 * One of a seat's guests. Only the current one (`slot`) is shown; the others are switched off
 * (`active`), so they cost one check per frame.
 */
function Guest({
  ctx,
  j,
  slot,
  visible,
  look,
  x,
  y,
  facing,
  pose,
  dish,
  seed,
}: {
  ctx: SceneCtx;
  j: number;
  slot: SharedValue<number>;
  visible: SharedValue<number>;
  look: LookInput;
  x: SharedValue<number>;
  y: SharedValue<number>;
  facing: SharedValue<number>;
  pose: SharedValue<Pose>;
  dish: DishLook | undefined;
  seed: number;
}) {
  const k = ctx.layout.artScale;
  const on = useDerivedValue<boolean>(() => visible.value > 0.5 && slot.value === j);
  const z = useDerivedValue(() => (on.value ? y.value : -1));
  // While off, the art kit collapses the character once and skips its rig every frame.
  return (
    <Group zIndex={z}>
      <Character look={look} x={x} y={y} facing={facing} pose={pose} clock={ctx.clock} scale={k} dish={dish} poses={GUEST_POSES} seed={seed} active={on} />
    </Group>
  );
}

/** Three wisps rising off a freshly served plate. */
function Steam({ ctx, x, y, progress }: { ctx: SceneCtx; x: number; y: number; progress: SharedValue<number> }) {
  const { layout: L } = ctx;
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
    const u = progress.value;
    return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) * 0.75;
  });
  const matrix = useMatrix(
    (o) => {
      'worklet';
      const u = Math.max(0, Math.min(1, progress.value));
      // Resting (no steam showing): keep the last matrix, nothing to redraw.
      if ((u <= 0 || u >= 1) && o[5] === y - 6 * k * u) return false;
      putTS(o, x, y - 6 * k * u, k, k);
    },
    [progress, x, y, k],
  );
  return (
    <Group matrix={matrix} opacity={opacity}>
      <Path path={path} style="stroke" strokeWidth={2.2} strokeCap="round" color="#FFFFFF" />
    </Group>
  );
}

/** Where a table's candle stands (decor tier 2). */
export function candleSpot(L: SceneCtx['layout'], t: { x: number; y: number }): { x: number; y: number } {
  const k = L.artScale;
  return { x: t.x - 11 * k, y: t.y - 16.5 * k };
}

/** The candle itself, which never moves: drawn as still furniture by World.tsx. */
export function CandleBase({ x, y, k }: { x: number; y: number; k: number }) {
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: k }]}>
      <Oval x={-4} y={-1.6} width={8} height={3.2} color="#C9A24A" />
      <Path path="M -2.2 0 L -2.2 -8 L 2.2 -8 L 2.2 0 Z" color="#FFF6E0" />
      <Path path="M -2.2 0 L -2.2 -8 L 2.2 -8 L 2.2 0 Z" style="stroke" strokeWidth={1.2} color="#3A2416" />
    </Group>
  );
}

/** Decor tier 2: the candle's flame, breathing (a matrix filled in place, nothing allocated per frame). */
function CandleFlame({ ctx, at, seed }: { ctx: SceneCtx; at: { x: number; y: number }; seed: number }) {
  const { clock, layout: L } = ctx;
  const k = L.artScale;
  const { x, y } = at;
  const flame = useMatrix(
    (o) => {
      'worklet';
      const t = clock.value / 1000 + seed * 1.7;
      putTS(o, x, y - 9 * k, k * (1 + 0.08 * Math.sin(t * 9)), k * (1 + 0.16 * Math.sin(t * 7.3)));
    },
    [clock, x, y, k, seed],
  );
  return (
    <Group matrix={flame}>
      <Circle cx={0} cy={-1} r={4.6} color="#FFD98A" opacity={0.35} />
      <Path path="M 0 -4.5 C 2.4 -1.5 2.2 1.6 0 1.8 C -2.2 1.6 -2.4 -1.5 0 -4.5 Z" color="#FFB238" />
    </Group>
  );
}

/** A coin that pops up over a table when the guest pays, spins and fades. */
function PayCoin({ ctx, x, y, progress }: { ctx: SceneCtx; x: number; y: number; progress: { value: number } }) {
  const { clock, layout: L } = ctx;
  const k = L.artScale;
  const u = useDerivedValue(() => progress.value);
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

