import { Canvas, Group, Picture, Rect, useClock } from '@shopify/react-native-skia';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Character } from './Character';
import { bustMatrix } from './CharacterBust';
import { getBustArt, releaseBustArt, retainBustArt } from './characterArt';
import { randomLook, resolveLook } from './looks';
import {
  CARD_WINDOW,
  CHAIR_OFFSET,
  Card,
  CardBack,
  CardFrame,
  Chair,
  Chest,
  Coin,
  ContactShadow,
  Dish,
  Door,
  Floor,
  FlyingDish,
  Gem,
  HandPointer,
  MenuBoard,
  Pass,
  STATION_ART_KINDS,
  Shelf,
  SparkleBurst,
  Station,
  Table,
  Tray,
  Wall,
  makePalette,
} from './props';
import { CHEST_TIERS, RARITIES, type ArtPalette, type Rarity } from './types';

/**
 * Dev-only gallery of every code-drawn prop (stations, counter, tables, door,
 * room, small things, chest, cards, and a mock restaurant), for visual review.
 * Open the web build with `?view=props`.
 *
 * Query parameters: `page` (see `PAGES`), `t` (freeze the clock at this many
 * ms; `window.__setArtTime(ms)` moves it), `bare` (hide the tab bar).
 */
const param = (name: string) => (typeof location !== 'undefined' ? new URLSearchParams(location.search).get(name) : null);

const W = 390;
const BG = '#FFF6E9';
const BIG = 2.5;

/** The scene clock, or a frozen one when `?t=` is given so screenshots are repeatable. */
function useGalleryClock(): SharedValue<number> {
  const live = useClock();
  const t = param('t');
  const frozen = useSharedValue(Number(t ?? 0));
  useEffect(() => {
    (globalThis as { __setArtTime?: (ms: number) => void }).__setArtTime = (ms: number) => {
      frozen.value = ms;
    };
  }, [frozen]);
  return t === null ? live : frozen;
}

interface LabelSpec {
  x: number;
  y: number;
  text: string;
  w?: number;
  color?: string;
}

/** One canvas with captions laid over it. */
function Sheet({ title, height, labels = [], children }: { title?: string; height: number; labels?: LabelSpec[]; children: ReactNode }) {
  return (
    <View style={{ width: W }}>
      {title ? <Text style={{ fontSize: 13, fontWeight: '700', color: '#5A4636', paddingHorizontal: 10, paddingTop: 10 }}>{title}</Text> : null}
      <View style={{ width: W, height }}>
        <Canvas style={{ width: W, height }}>{children}</Canvas>
        {labels.map((l, i) => (
          <Text key={i} style={{ position: 'absolute', left: l.x - (l.w ?? 80) / 2, top: l.y, width: l.w ?? 80, textAlign: 'center', fontSize: 9, color: l.color ?? '#8A7560' }}>
            {l.text}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** A shared value that goes up by one every `ms`: rings bells, swings doors. */
function useBump(ms: number): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    const id = setInterval(() => {
      v.value += 1;
    }, ms);
    return () => clearInterval(id);
  }, [v, ms]);
  return v;
}

/** 0..1 that sweeps up and back every `ms`, holding a moment at each end. */
function useSweep(clock: SharedValue<number>, ms: number, phase = 0): SharedValue<number> {
  return useDerivedValue(() => {
    const u = ((clock.value + phase) % ms) / ms;
    const t = u < 0.5 ? u * 2 : 2 - u * 2;
    return Math.max(0, Math.min(1, t * 1.3 - 0.15));
  });
}

/** 0..1 that runs up once every `ms` and jumps back. */
function useLoop(clock: SharedValue<number>, ms: number, phase = 0): SharedValue<number> {
  return useDerivedValue(() => ((clock.value + phase) % ms) / ms);
}

// ---------------------------------------------------------------------------

function StationsPage({ clock }: { clock: SharedValue<number> }) {
  return (
    <>
      {STATION_ART_KINDS.map((kind) => (
        <Sheet
          key={kind}
          title={kind}
          height={372}
          labels={[
            { x: 40, y: 152, text: 'idle' },
            { x: 108, y: 152, text: 'working' },
            { x: 176, y: 152, text: 'locked' },
            { x: 300, y: 172, text: 'working x2.5' },
            { x: 96, y: 356, text: 'idle x2.5' },
            { x: 292, y: 356, text: 'locked x2.5' },
          ]}
        >
          <Station kind={kind} x={40} y={148} clock={clock} />
          <Station kind={kind} x={108} y={148} working clock={clock} />
          <Station kind={kind} x={176} y={148} locked clock={clock} />
          <Station kind={kind} x={300} y={168} scale={BIG} working clock={clock} />
          <Station kind={kind} x={96} y={352} scale={BIG} clock={clock} />
          <Station kind={kind} x={292} y={352} scale={BIG} locked clock={clock} />
        </Sheet>
      ))}
    </>
  );
}

function FurniturePage({ clock }: { clock: SharedValue<number> }) {
  const rung = useBump(1600);
  const swing = useBump(2200);
  const fill = useSweep(clock, 6000);
  return (
    <>
      <Sheet
        title="pass: dishes 0 / 0.5 (mixed) / 1 / animated; bell rings every 1.6 s"
        height={310}
        labels={[
          { x: 100, y: 54, text: '0' },
          { x: 290, y: 54, text: '0.5, mixed dishes' },
          { x: 100, y: 124, text: '1' },
          { x: 290, y: 124, text: 'sweeping 0..1' },
          { x: 195, y: 294, text: 'x2.5, 0.6' },
        ]}
      >
        <Pass x={100} y={50} width={180} dishes={0} rung={rung} clock={clock} />
        <Pass x={290} y={50} width={180} dishes={0.5} rung={rung} clock={clock} dish={['pizza', 'plate', 'bowl']} />
        <Pass x={100} y={120} width={180} dishes={1} clock={clock} />
        <Pass x={290} y={120} width={180} dishes={fill} rung={rung} clock={clock} dish="plate" />
        <Pass x={195} y={290} width={150} scale={BIG} dishes={0.6} rung={rung} clock={clock} />
      </Sheet>
      <Sheet
        title="table empty / food / finished, chairs, door (swings every 2.2 s)"
        height={440}
        labels={[
          { x: 60, y: 92, text: 'empty' },
          { x: 160, y: 92, text: 'food' },
          { x: 250, y: 92, text: 'finished' },
          { x: 340, y: 94, text: 'door' },
        ]}
      >
        <Chair x={60 - CHAIR_OFFSET} y={80} />
        <Chair x={60 + CHAIR_OFFSET} y={80} facing={-1} />
        <Table x={60} y={84} state="empty" clock={clock} />
        <Chair x={160 - CHAIR_OFFSET} y={80} />
        <Chair x={160 + CHAIR_OFFSET} y={80} facing={-1} />
        <Table x={160} y={84} state="food" clock={clock} />
        <Table x={250} y={84} state="finished" clock={clock} />
        <Door x={340} y={90} swing={swing} clock={clock} />
        <Chair x={130 - CHAIR_OFFSET * BIG} y={250} scale={BIG} />
        <Table x={130} y={260} scale={BIG} state="food" clock={clock} />
        <Door x={300} y={300} scale={BIG} swing={swing} clock={clock} />
        <Table x={130} y={420} scale={BIG} state="finished" clock={clock} />
        <Table x={300} y={420} scale={BIG} state="empty" clock={clock} />
      </Sheet>
    </>
  );
}

const THEMED: Partial<ArtPalette> = { primary: '#2E6FB7', accent: '#F2B53A', wood: '#8A5A3C', wall: '#F2E2C4', floorA: '#E9EEF2', floorB: '#C9D3DC', cloth: '#FFFFFF', stone: '#DCD6CC', glow: '#FF7A3D' };

function RoomPage() {
  return (
    <>
      <Sheet title="wall + floor (default palette), contact shadows" height={250}>
        <Wall x={0} y={0} width={W} height={100} shelf={0.06} menu={0.94} />
        <Floor x={0} y={100} width={W} height={150} />
        <ContactShadow x={80} y={170} />
        <ContactShadow x={170} y={170} width={60} height={14} />
        <ContactShadow x={260} y={170} strength={0.5} />
      </Sheet>
      <Sheet title="the same room re-coloured with makePalette (another theme)" height={210}>
        <Wall x={0} y={0} width={W} height={100} shelf={0.5} menu={0.05} palette={THEMED} />
        <Floor x={0} y={100} width={W} height={110} palette={THEMED} tile={30} />
      </Sheet>
      <Sheet title="shelf and menu board, x1 and x2.5" height={300}>
        <Rect x={0} y={0} width={W} height={300} color={makePalette().wall} />
        <Shelf x={60} y={60} />
        <MenuBoard x={160} y={44} />
        <Shelf x={110} y={200} scale={BIG} width={80} />
        <MenuBoard x={290} y={180} scale={BIG} width={52} height={36} />
      </Sheet>
    </>
  );
}

function SmallPage({ clock }: { clock: SharedValue<number> }) {
  const fly = useLoop(clock, 1800);
  const fly2 = useLoop(clock, 1800, 900);
  const burst = useBump(1400);
  return (
    <>
      <Sheet
        title="x1: dish (pizza, plate), flying dish, coin, spinning coin, gem, tray, burst, hand"
        height={200}
        labels={[
          { x: 30, y: 60, text: 'pizza' },
          { x: 70, y: 60, text: 'plate' },
          { x: 175, y: 60, text: 'flying (arc + spin)' },
          { x: 290, y: 60, text: 'coin / spin / gem' },
          { x: 40, y: 160, text: 'tray' },
          { x: 100, y: 160, text: 'tray + dish' },
          { x: 190, y: 160, text: 'sparkle burst' },
          { x: 310, y: 160, text: 'hand pointer' },
        ]}
      >
        <Dish x={30} y={44} />
        <Dish x={70} y={44} dish="plate" />
        <FlyingDish from={{ x: 120, y: 48 }} to={{ x: 230, y: 48 }} progress={fly} />
        <FlyingDish from={{ x: 230, y: 30 }} to={{ x: 120, y: 30 }} progress={fly2} dish="plate" height={20} spins={-0.5} />
        <Coin x={260} y={40} />
        <Coin x={290} y={40} spin={0.8} clock={clock} />
        <Gem x={320} y={40} clock={clock} />
        <Tray x={40} y={140} />
        <Tray x={100} y={140} dish="pizza" />
        <SparkleBurst x={190} y={130} trigger={burst} clock={clock} />
        <Station kind="generic" x={310} y={148} locked padlock={false} clock={clock} scale={0.7} />
        <HandPointer x={310} y={128} clock={clock} />
      </Sheet>
      <Sheet title="x2.5" height={560}>
        <Dish x={60} y={60} scale={BIG} />
        <Dish x={150} y={60} scale={BIG} dish="plate" />
        <Coin x={250} y={60} scale={BIG} />
        <Coin x={330} y={60} scale={BIG} spin={0.6} clock={clock} />
        <Gem x={70} y={170} scale={BIG} clock={clock} />
        <Gem x={150} y={170} scale={BIG} color="#FF5A7A" clock={clock} />
        <Tray x={260} y={175} scale={BIG} dish="plate" />
        <FlyingDish from={{ x: 40, y: 300 }} to={{ x: 350, y: 300 }} progress={fly} scale={BIG} height={70} />
        <SparkleBurst x={110} y={450} scale={BIG} trigger={burst} clock={clock} />
        <HandPointer x={290} y={420} scale={BIG} clock={clock} />
      </Sheet>
    </>
  );
}

const DARK = '#2B1B3D';

function ChestCycle({ clock, tier }: { clock: SharedValue<number>; tier: (typeof CHEST_TIERS)[number] }) {
  // 0-1.4 s rattles harder and harder, bursts open, stays open, closes at 5.2 s.
  const lid = useDerivedValue(() => {
    const t = (clock.value % 6000) / 1000;
    if (t < 1.4) return 0;
    if (t < 1.9) {
      const u = (t - 1.4) / 0.5;
      return 1 - (1 - u) * (1 - u) * (1 - u);
    }
    if (t < 5.2) return 1;
    return Math.max(0, 1 - (t - 5.2) / 0.6);
  });
  const shake = useDerivedValue(() => {
    const t = (clock.value % 6000) / 1000;
    return t < 1.4 ? (t / 1.4) * (t / 1.4) : 0;
  });
  return (
    <Sheet title={`${tier} chest: rattle, open, rays (animated)`} height={290}>
      <Rect x={0} y={0} width={W} height={290} color={DARK} />
      <Chest x={W / 2} y={250} tier={tier} lid={lid} shake={shake} clock={clock} />
    </Sheet>
  );
}

function ChestPage({ clock }: { clock: SharedValue<number> }) {
  const lids = [0, 0.3, 0.7, 1];
  return (
    <>
      <Sheet
        title="lid 0 / 0.3 / 0.7 / 1, all three tiers (scale 0.42)"
        height={420}
        labels={CHEST_TIERS.flatMap((tier, r) => lids.map((l, i) => ({ x: 50 + i * 97, y: 120 + r * 136, text: `${tier} ${l}`, color: '#D9C9E8' })))}
      >
        <Rect x={0} y={0} width={W} height={420} color={DARK} />
        {CHEST_TIERS.map((tier, r) => lids.map((l, i) => <Chest key={`${tier}${i}`} x={50 + i * 97} y={116 + r * 136} scale={0.42} tier={tier} lid={l} clock={clock} />))}
      </Sheet>
      {CHEST_TIERS.map((tier) => (
        <ChestCycle key={tier} tier={tier} clock={clock} />
      ))}
      <Sheet title="closed, on the light background (scale 0.8)" height={170}>
        {CHEST_TIERS.map((tier, i) => (
          <Chest key={tier} x={70 + i * 125} y={150} scale={0.62} tier={tier} lid={0} clock={clock} />
        ))}
      </Sheet>
    </>
  );
}

const CARD_CAST: Record<Rarity, string> = { common: 'fiona', rare: 'sal', epic: 'marco', legendary: 'nonna' };

/** A character portrait drawn straight into the card window. */
function Portrait({ name }: { name: string }) {
  const art = useMemo(() => getBustArt(resolveLook(name), 3.4), [name]);
  useEffect(() => {
    retainBustArt(art);
    return () => releaseBustArt(art);
  }, [art]);
  const size = CARD_WINDOW.height + 4;
  const m = useMemo(() => {
    const b = bustMatrix(art.bounds, size, 1);
    b[2] += (CARD_WINDOW.width - size) / 2;
    b[5] += CARD_WINDOW.height - size + 2;
    return b;
  }, [art, size]);
  return (
    <Group>
      <Picture picture={art.base} matrix={m} />
      {art.eyes ? <Picture picture={art.eyes} matrix={m} /> : null}
    </Group>
  );
}

function CardsPage({ clock }: { clock: SharedValue<number> }) {
  const flip = useSweep(clock, 4000);
  return (
    <>
      <Sheet title="x0.68: back, common, rare, epic, legendary; and a card turning over" height={280} labels={[{ x: 42, y: 122, text: 'back' }, ...RARITIES.map((r, i) => ({ x: 120 + i * 76, y: 122, text: r }))]}>
        <CardBack x={42} y={68} scale={0.68} clock={clock} />
        {RARITIES.map((r, i) => (
          <CardFrame key={r} x={120 + i * 76} y={68} scale={0.68} rarity={r} clock={clock}>
            <Portrait name={CARD_CAST[r]} />
          </CardFrame>
        ))}
        <Card x={140} y={210} scale={0.7} rarity="legendary" flip={flip} clock={clock}>
          <Portrait name="nonna" />
        </Card>
        <Card x={260} y={210} scale={0.7} rarity="rare" flip={flip} clock={clock} palette={{ primary: '#2E6FB7', accent: '#F2B53A' }}>
          <Portrait name="sal" />
        </Card>
      </Sheet>
      <Sheet title="x1 (110 x 150): every rarity, with a portrait and without" height={370}>
        {RARITIES.map((r, i) => (
          <CardFrame key={r} x={60 + (i % 2) * 135 + (i > 1 ? 0 : 0)} y={100 + Math.floor(i / 2) * 170} rarity={r} clock={clock}>
            <Portrait name={CARD_CAST[r]} />
          </CardFrame>
        ))}
        <CardFrame x={330} y={100} rarity="epic" clock={clock} />
        <CardBack x={330} y={270} clock={clock} />
      </Sheet>
      <Sheet title="x2.5: legendary and epic" height={840}>
        <CardFrame x={W / 2} y={230} scale={BIG} rarity="legendary" clock={clock}>
          <Portrait name="nonna" />
        </CardFrame>
        <CardFrame x={W / 2} y={630} scale={BIG} rarity="epic" clock={clock}>
          <Portrait name="marco" />
        </CardFrame>
      </Sheet>
      <Sheet title="x2.5: rare, common and the back" height={1200}>
        <CardFrame x={W / 2} y={200} scale={BIG} rarity="rare" clock={clock}>
          <Portrait name="sal" />
        </CardFrame>
        <CardFrame x={W / 2} y={600} scale={BIG} rarity="common" clock={clock}>
          <Portrait name="fiona" />
        </CardFrame>
        <CardBack x={W / 2} y={1000} scale={BIG} clock={clock} />
      </Sheet>
    </>
  );
}

// --- one mock restaurant at phone width ------------------------------------------
//
// Staging rules the real restaurant screen should copy:
// - Depth: draw back to front by floor y (or pass `zIndex={y}`). At a table: the chairs, then whoever sits
//   on them, then the table (zIndex y + 0.5), so the cloth hides the guests' laps. Standing actors in
//   front of a table have a larger y and come after it.
// - A table's state matches its guest: `sit-wait` -> `empty`, `sit-eat` -> `food`, left -> `finished`.
// - A flying dish always goes from somewhere to someone (oven -> pass, pass -> tray) and is hidden at rest.

const GUEST = randomLook(11, 'customer');
const GUEST2 = randomLook(4, 'customer');
const GUEST3 = randomLook(27, 'customer');
const GUEST4 = randomLook(8, 'customer');
const WAITER = randomLook(5, 'waiter');
const WAITER2 = randomLook(12, 'waiter');
const WALL_H = 112;
const SCENE_H = 420;
const PASS_Y = WALL_H + 64;
const WALK_Y = PASS_Y + 50;
const ROWS = [WALK_Y + 52, WALK_Y + 140];
const COLS = [70, 195, 320];

/** One table with its two chairs, in the right drawing order. `left`/`right` are the seated guests, if any. */
function TableSet({ x, y, clock, state, dish, left, right }: { x: number; y: number; clock: SharedValue<number>; state: 'empty' | 'food' | 'finished'; dish?: 'pizza' | 'plate' | 'bowl'; left?: ReactNode; right?: ReactNode }) {
  return (
    <>
      <ContactShadow x={x} y={y} width={58} height={13} />
      <Chair x={x - CHAIR_OFFSET} y={y - 4} />
      <Chair x={x + CHAIR_OFFSET} y={y - 4} facing={-1} />
      {left}
      {right}
      <Table x={x} y={y} state={state} dish={dish} clock={clock} />
    </>
  );
}

function ScenePage({ clock }: { clock: SharedValue<number> }) {
  const rung = useBump(2600);
  const swing = useBump(3400);
  const coin = useBump(2000);
  const dishes = useSweep(clock, 9000);
  // The waiter walks the walkway and back.
  const walk = useDerivedValue(() => (clock.value % 9000) / 9000);
  const waiterX = useDerivedValue(() => {
    const u = walk.value;
    const tri = u < 0.5 ? u * 2 : 2 - u * 2;
    const e = tri * tri * (3 - 2 * tri);
    return 40 + 250 * e;
  });
  const waiterFacing = useDerivedValue(() => (walk.value < 0.5 ? 1 : -1));
  // A pizza hops from the oven onto the pass, then waits hidden for the next one.
  const fly = useDerivedValue(() => {
    const u = (clock.value % 2600) / 2600;
    return u < 0.22 ? u / 0.22 : 0;
  });
  const sit = (look: ReturnType<typeof randomLook> | string, x: number, y: number, facing: 1 | -1, pose: 'sit-wait' | 'sit-eat', dish?: 'pizza' | 'plate' | 'bowl') => (
    <Character look={look} x={x} y={y - 4} pose={pose} facing={facing} dish={dish ?? 'pizza'} clock={clock} poses={[pose]} />
  );
  return (
    <Sheet title="mock restaurant (390 px wide)" height={SCENE_H}>
      <Wall x={0} y={0} width={W} height={WALL_H} shelf={null} menu={null} />
      <Floor x={0} y={WALL_H} width={W} height={SCENE_H - WALL_H} />
      <MenuBoard x={268} y={46} width={62} height={40} />
      {/* Kitchen line against the wall. */}
      <Station kind="oven" x={52} y={WALL_H + 16} working clock={clock} />
      <Station kind="stove" x={124} y={WALL_H + 16} working clock={clock} />
      <Station kind="fryer" x={196} y={WALL_H + 16} locked clock={clock} />
      <HandPointer x={204} y={WALL_H - 18} clock={clock} scale={0.8} />
      <Character look="marco" x={92} y={WALL_H + 42} pose="cook" facing={-1} clock={clock} />
      <FlyingDish from={{ x: 52, y: WALL_H - 4 }} to={{ x: 40, y: PASS_Y - 22 }} progress={fly} height={26} spins={0} />
      <Pass x={136} y={PASS_Y} width={250} dishes={dishes} dish={['pizza', 'pizza', 'plate', 'pizza', 'bowl']} rung={rung} clock={clock} bell={0.95} />
      <Door x={348} y={WALL_H + 18} swing={swing} clock={clock} />
      <Character look={WAITER2} x={350} y={WALL_H + 50} pose="wave" facing={-1} clock={clock} />
      {/* Walkway: the waiter with a tray. */}
      <Character look={WAITER} x={waiterX} y={WALK_Y} facing={waiterFacing} pose="carry" dish="pizza" clock={clock} />
      {/* Six tables, back row first. */}
      <TableSet x={COLS[0]} y={ROWS[0]} clock={clock} state="food" left={sit('fiona', COLS[0] - CHAIR_OFFSET, ROWS[0], 1, 'sit-eat')} right={sit(GUEST2, COLS[0] + CHAIR_OFFSET, ROWS[0], -1, 'sit-eat')} />
      <TableSet x={COLS[1]} y={ROWS[0]} clock={clock} state="finished" />
      <SparkleBurst x={COLS[1]} y={ROWS[0] - 34} trigger={coin} clock={clock} />
      <TableSet x={COLS[2]} y={ROWS[0]} clock={clock} state="empty" right={sit(GUEST, COLS[2] + CHAIR_OFFSET, ROWS[0], -1, 'sit-wait', 'plate')} />
      <TableSet x={COLS[0]} y={ROWS[1]} clock={clock} state="empty" left={sit(GUEST3, COLS[0] - CHAIR_OFFSET, ROWS[1], 1, 'sit-wait')} />
      <TableSet x={COLS[1]} y={ROWS[1]} clock={clock} state="food" dish="plate" right={sit(GUEST4, COLS[1] + CHAIR_OFFSET, ROWS[1], -1, 'sit-eat', 'plate')} />
      <TableSet x={COLS[2]} y={ROWS[1]} clock={clock} state="empty" />
    </Sheet>
  );
}

const PAGES = ['stations', 'furniture', 'room', 'small', 'chest', 'cards', 'scene'] as const;
type Page = (typeof PAGES)[number];

function Tabs({ page }: { page: Page }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 6, gap: 6 }}>
      {PAGES.map((p) => (
        <Pressable
          key={p}
          onPress={() => {
            if (typeof location !== 'undefined') location.search = `?view=props&page=${p}`;
          }}
          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: p === page ? '#E63946' : '#F1DFC8' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: p === page ? '#FFFFFF' : '#5A4636' }}>{p}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function PropsGallery() {
  const raw = param('page');
  const page: Page = (PAGES as readonly string[]).includes(raw ?? '') ? (raw as Page) : PAGES[0];
  const clock = useGalleryClock();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }}>
      {param('bare') === null ? <Tabs page={page} /> : null}
      {page === 'stations' ? <StationsPage clock={clock} /> : null}
      {page === 'furniture' ? <FurniturePage clock={clock} /> : null}
      {page === 'room' ? <RoomPage /> : null}
      {page === 'small' ? <SmallPage clock={clock} /> : null}
      {page === 'chest' ? <ChestPage clock={clock} /> : null}
      {page === 'cards' ? <CardsPage clock={clock} /> : null}
      {page === 'scene' ? <ScenePage clock={clock} /> : null}
    </ScrollView>
  );
}
