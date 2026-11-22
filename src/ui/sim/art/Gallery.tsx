import { Canvas, useClock } from '@shopify/react-native-skia';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Character, type CharacterProps } from './Character';
import { BustCanvas, BustImage, CharacterBust, bustOutline } from './CharacterBust';
import { getBustArt } from './characterArt';
import { LOOK_NAMES, randomLook, resolveLook, type LookInput } from './looks';
import { CHARACTER_HEIGHT, SEAT_HEIGHT, UNIT } from './rig';
import { POSES, type CharacterKind, type DishKind, type Pose } from './types';

/**
 * Dev-only review screen for the code-drawn cast. Open the web build with
 * `?view=art`; pages are `&page=1` to `6` (or by name):
 *
 *   1 busts    every built-in look and 8 random people as portraits at 40 and 120 px, then a size ladder
 *   2 poses    every pose, animated, at scene size and at 2.5x
 *   3 variety  line-ups of random customers, waiters and chefs at scene size
 *   4 cast     the built-in looks, full body, large
 *   5 crowd    forty-odd people at scene size
 *   6 live     a small scripted scene: walking, turning, carrying, sitting, pose changes
 *
 * Tools for checking motion frame by frame (used by the screenshot scripts):
 *   page=strip&pose=walk&n=8&dt=80   one pose as a film strip of frozen frames
 *   t=1234                           freeze the clock at that many ms; `window.__setArtTime(ms)` moves it
 * Other parameters: `look` (a built-in name, or `r<seed>` / `r<seed>chef` for a random person), `pose`, `dish`, `zoom`.
 */
const param = (name: string) => (typeof location !== 'undefined' ? new URLSearchParams(location.search).get(name) : null);
const num = (name: string, fallback: number) => {
  const v = param(name);
  return v === null || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v);
};

const W = 390;
const BG = '#FFF6E9';
const INK = '#8A7560';
/** Scale that makes a standing adult 52 px tall: the size characters have in the restaurant scene. */
const SCENE = 52 / CHARACTER_HEIGHT;
const BACKDROPS = ['#FFD9A8', '#FFC7B8', '#CFE8D5', '#CFE3F5', '#F3D1E6', '#FBE7A6'];

const PAGES = ['busts', 'poses', 'variety', 'cast', 'crowd', 'live'] as const;

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

function pickLook(fallback: LookInput): LookInput {
  const name = param('look');
  if (!name) return fallback;
  const m = /^r(\d+)([a-z]*)$/.exec(name);
  if (m) return randomLook(Number(m[1]), (m[2] || 'customer') as CharacterKind);
  return { preset: name };
}

function Label({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  return <Text style={{ position: 'absolute', left: x, top: y, width: w, textAlign: 'center', fontSize: 10, color: INK }}>{children}</Text>;
}

function Heading({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B5038', marginTop: 14, marginBottom: 6, marginLeft: 10 }}>{children}</Text>;
}

/** The people shown as portraits: the built-in cast, then eight strangers. */
const PEOPLE: { name: string; look: LookInput }[] = [
  ...LOOK_NAMES.map((n) => ({ name: n as string, look: { preset: n } as LookInput })),
  ...([
    [11, 'customer'],
    [12, 'customer'],
    [13, 'customer'],
    [14, 'customer'],
    [15, 'waiter'],
    [16, 'waiter'],
    [17, 'chef'],
    [18, 'chef'],
  ] as const).map(([seed, kind]) => ({ name: `${kind} ${seed}`, look: randomLook(seed, kind) as LookInput })),
];

/**
 * A bust with its eyes held at a given point of the blink, to check the blink without waiting for one.
 * `canvas` draws it the way phones do (a Skia canvas) rather than the way web does (an image), to compare the two.
 */
function BlinkSample({ look, size, shut, background, canvas, facing }: { look: LookInput; size: number; shut: number; background?: string; canvas?: boolean; facing?: number }) {
  const art = useMemo(() => getBustArt(resolveLook(look), bustOutline(size)), [look, size]);
  const value = useSharedValue(shut);
  return canvas ? <BustCanvas art={art} size={size} shut={value} background={background} facing={facing} /> : <BustImage art={art} size={size} shut={shut} background={background} facing={facing} />;
}

function BustsPage() {
  const ladder: LookInput[] = [{ preset: 'marco' }, { preset: 'gina' }, randomLook(13, 'customer'), { preset: 'overlord' }];
  return (
    <View style={{ width: W, paddingBottom: 40 }}>
      <Heading>Portraits: 120 px badge, 40 px plain and 40 px badge</Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {PEOPLE.map(({ name, look }, i) => {
          const bg = BACKDROPS[i % BACKDROPS.length];
          return (
            <View key={name} style={{ width: W / 3, alignItems: 'center', marginBottom: 12 }}>
              <CharacterBust look={look} size={120} background={bg} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <CharacterBust look={look} size={40} />
                <View style={{ width: 8 }} />
                <CharacterBust look={look} size={40} background={bg} />
              </View>
              <Text style={{ fontSize: 10, color: INK }}>{name}</Text>
            </View>
          );
        })}
      </View>
      <Heading>Size ladder: 28, 40, 64, 120, 220 px</Heading>
      {ladder.map((look, i) => (
        <View key={i} style={{ marginBottom: 14, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <CharacterBust look={look} size={220} background={BACKDROPS[(i + 2) % BACKDROPS.length]} />
            <View style={{ width: 10 }} />
            <CharacterBust look={look} size={120} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
            {[64, 40, 28].map((s) => (
              <View key={s} style={{ flexDirection: 'row', alignItems: 'flex-end', marginRight: 14 }}>
                <CharacterBust look={look} size={s} />
                <View style={{ width: 4 }} />
                <CharacterBust look={look} size={s} background={BACKDROPS[(i + 2) % BACKDROPS.length]} />
              </View>
            ))}
          </View>
        </View>
      ))}
      <Heading>Blink: open, half, shut</Heading>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', marginLeft: 10 }}>
        {[0, 0.5, 1].map((s) => (
          <BlinkSample key={s} look={{ preset: 'nonna' }} size={100} shut={s} background={BACKDROPS[3]} />
        ))}
        {[0, 0.5, 1].map((s) => (
          <BlinkSample key={s} look={{ preset: 'tony' }} size={40} shut={s} />
        ))}
      </View>
      <Heading>The same, drawn the way phones draw it (a canvas each)</Heading>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', marginLeft: 10 }}>
        {[0, 0.5, 1].map((s) => (
          <BlinkSample key={s} look={{ preset: 'nonna' }} size={100} shut={s} background={BACKDROPS[3]} canvas />
        ))}
        {[0, 1].map((s) => (
          <BlinkSample key={s} look={{ preset: 'tony' }} size={40} shut={s} canvas />
        ))}
        <BlinkSample look={{ preset: 'carl' }} size={40} shut={0} canvas facing={-1} background={BACKDROPS[4]} />
      </View>
      <Heading>Happy mood, facing left</Heading>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', marginLeft: 10, marginTop: 8 }}>
        <CharacterBust look="marco" size={100} mood="happy" background={BACKDROPS[0]} />
        <CharacterBust look="fiona" size={100} mood="happy" />
        <CharacterBust look="carl" size={100} facing={-1} background={BACKDROPS[4]} />
        <CharacterBust look="sal" size={40} mood="happy" />
        <CharacterBust look="mayor" size={40} facing={-1} />
      </View>
    </View>
  );
}

function PosesPage({ clock }: { clock: SharedValue<number> }) {
  const look = pickLook({ preset: 'marco' });
  const dish = (param('dish') as DishKind) ?? 'pizza';
  const big = num('zoom', 2.5);
  const ch = 168;
  const h = Math.ceil(POSES.length / 2) * ch + 20;
  return (
    <View style={{ width: W, height: h }}>
      <Canvas style={{ width: W, height: h }}>
        {POSES.map((p, i) => {
          const cx = (i % 2) * (W / 2);
          const cy = Math.floor(i / 2) * ch;
          return [
            <Character key={p + 's'} look={look} x={cx + 36} y={cy + ch - 26} clock={clock} pose={p} dish={dish} scale={SCENE} />,
            <Character key={p + 'b'} look={look} x={cx + 122} y={cy + ch - 26} clock={clock} pose={p} dish={dish} scale={big * SCENE} />,
          ];
        })}
      </Canvas>
      {POSES.map((p, i) => (
        <Label key={p} x={(i % 2) * (W / 2)} y={Math.floor(i / 2) * ch + ch - 20} w={W / 2}>
          {p}
        </Label>
      ))}
    </View>
  );
}

/** A floor-coloured band, so line-ups are judged against something like the restaurant rather than a blank page. */
function Floor({ y, h, color }: { y: number; h: number; color: string }) {
  return <View style={{ position: 'absolute', left: 0, top: y, width: W, height: h, backgroundColor: color }} />;
}

function VarietyPage({ clock }: { clock: SharedValue<number> }) {
  const pose = (param('pose') as Pose) ?? 'idle';
  const groups = [0, 1, 2, 3];
  const rowH = 76;
  const groupH = rowH * 2 + 30;
  const h = groups.length * groupH + 10;
  const floors = ['#F6E7CF', '#EBD3B0', '#F3E1E1', '#D9E4EA'];
  const staff: CharacterKind[] = ['waiter', 'waiter', 'waiter', 'chef', 'chef', 'chef'];
  return (
    <View style={{ width: W, height: h }}>
      {groups.map((g) => (
        <Floor key={g} y={g * groupH + 4} h={groupH - 8} color={floors[g]} />
      ))}
      <Canvas style={{ width: W, height: h }}>
        {groups.map((g) => [
          ...Array.from({ length: 6 }, (_, i) => (
            <Character key={`c${g}-${i}`} look={randomLook(g * 40 + i + 1, 'customer')} x={34 + i * 64} y={g * groupH + rowH} clock={clock} pose={pose} scale={SCENE} />
          )),
          ...staff.map((kind, i) => (
            <Character key={`s${g}-${i}`} look={randomLook(g * 40 + i + 21, kind)} x={34 + i * 64} y={g * groupH + rowH * 2} clock={clock} pose={pose} scale={SCENE} />
          )),
        ])}
      </Canvas>
      {groups.map((g) => (
        <Label key={g} x={0} y={g * groupH + rowH * 2 + 6} w={W}>
          {`6 customers above; 3 waiters and 3 chefs below (seeds ${g * 40 + 1}...)`}
        </Label>
      ))}
    </View>
  );
}

function CastPage({ clock }: { clock: SharedValue<number> }) {
  const cols = 3;
  const cw = W / cols;
  const ch = 200;
  const rows = Math.ceil(LOOK_NAMES.length / cols);
  const pose = (param('pose') as Pose) ?? 'idle';
  return (
    <View style={{ width: W, height: rows * ch }}>
      <Canvas style={{ width: W, height: rows * ch }}>
        {LOOK_NAMES.map((n, i) => (
          <Character key={n} look={{ preset: n }} x={(i % cols) * cw + cw / 2} y={Math.floor(i / cols) * ch + ch - 30} clock={clock} scale={3} pose={pose} />
        ))}
      </Canvas>
      {LOOK_NAMES.map((n, i) => (
        <Label key={n} x={(i % cols) * cw} y={Math.floor(i / cols) * ch + ch - 22} w={cw}>
          {n}
        </Label>
      ))}
    </View>
  );
}

function CrowdPage({ clock }: { clock: SharedValue<number> }) {
  const pose = (param('pose') as Pose) ?? 'idle';
  const kinds: CharacterKind[] = ['chef', 'waiter', 'customer', 'customer', 'manager', 'customer'];
  return (
    <Canvas style={{ width: W, height: 800 }}>
      {LOOK_NAMES.map((n, i) => (
        <Character key={n} look={{ preset: n }} x={34 + (i % 6) * 62} y={90 + Math.floor(i / 6) * 90} clock={clock} pose={pose} scale={SCENE} />
      ))}
      {Array.from({ length: 36 }, (_, i) => (
        <Character key={i} look={randomLook(i + 1, kinds[i % 6])} x={34 + (i % 6) * 62} y={280 + Math.floor(i / 6) * 84} clock={clock} pose={pose} scale={SCENE} />
      ))}
    </Canvas>
  );
}

/** A character whose clock stands still at `t`: one frame of a film strip. */
function Frozen({ t, ...rest }: { t: number } & Omit<CharacterProps, 'clock'>) {
  const clock = useSharedValue(t);
  return <Character {...rest} clock={clock} />;
}

/** One pose as a row of frozen frames, `dt` ms apart, to check the motion drawing by drawing. */
function StripPage() {
  const look = pickLook({ preset: 'marco' });
  const pose = (param('pose') as Pose) ?? 'walk';
  const dish = (param('dish') as DishKind) ?? 'pizza';
  const n = num('n', 8);
  const dt = num('dt', 100);
  const t0 = num('t0', 0);
  const zoom = num('zoom', 2.5);
  const cols = num('cols', 4);
  const cw = W / cols;
  const ch = num('ch', 62 * zoom + 24);
  const rows = Math.ceil(n / cols);
  return (
    <View style={{ width: W, height: rows * ch + 10 }}>
      <Canvas style={{ width: W, height: rows * ch + 10 }}>
        {Array.from({ length: n }, (_, i) => (
          <Frozen
            key={i}
            t={t0 + i * dt}
            look={look}
            x={(i % cols) * cw + cw * num('ox', 0.45)}
            y={Math.floor(i / cols) * ch + ch - 14}
            pose={pose}
            dish={dish}
            scale={zoom * SCENE}
            seed={0}
            facing={num('facing', 1)}
          />
        ))}
      </Canvas>
      {Array.from({ length: n }, (_, i) => (
        <Label key={i} x={(i % cols) * cw} y={Math.floor(i / cols) * ch + ch - 12} w={cw}>
          {`${t0 + i * dt} ms`}
        </Label>
      ))}
    </View>
  );
}

/** A stool drawn with plain views, so seated poses have something under them here (the real chairs are scene props). */
function Stool({ x, y, scale }: { x: number; y: number; scale: number }) {
  const seat = SEAT_HEIGHT * UNIT * scale;
  const w = 26 * scale * UNIT * 2;
  return (
    <View style={{ position: 'absolute', left: x - w / 2, top: y - seat, width: w, height: seat }}>
      <View style={{ height: 5 * scale, borderRadius: 3 * scale, backgroundColor: '#B9794A', borderWidth: 1.5, borderColor: '#4A2C17' }} />
      <View style={{ flex: 1, marginHorizontal: w * 0.3, backgroundColor: '#8E5A36', borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: '#4A2C17' }} />
    </View>
  );
}

/**
 * A small scripted scene driven the way the game will drive it: positions,
 * facing and pose are shared values, here worked out from the clock.
 */
function LivePage({ clock }: { clock: SharedValue<number> }) {
  const zoom = num('zoom', 2);
  const s = zoom * SCENE;
  const floor = 170 + 60 * zoom;
  // The waiter: carries a dish across, serves, walks back empty-handed, waves.
  const wx = useDerivedValue(() => {
    const t = (clock.value / 1000) % 9;
    const a = 70;
    const b = 300;
    if (t < 3) return a + ((b - a) * t) / 3;
    if (t < 5) return b;
    if (t < 8) return b - ((b - a) * (t - 5)) / 3;
    return a;
  });
  const wFacing = useDerivedValue(() => {
    const t = (clock.value / 1000) % 9;
    return t < 4.5 ? 1 : t < 8 ? -1 : 1;
  });
  const wPose = useDerivedValue<Pose>(() => {
    const t = (clock.value / 1000) % 9;
    return t < 4 ? 'carry' : t < 5 ? 'idle' : t < 8 ? 'walk' : 'wave';
  });
  // The chef: whisks, tosses, cheers, dozes off.
  const cPose = useDerivedValue<Pose>(() => {
    const t = (clock.value / 1000) % 12;
    return t < 3 ? 'cook' : t < 6.6 ? 'toss' : t < 8 ? 'cheer' : t < 9 ? 'idle' : 'sleep';
  });
  // The customer: walks in, sits and waits, eats, cheers, leaves.
  const gx = useDerivedValue(() => {
    const t = (clock.value / 1000) % 14;
    const door = 410;
    const seat = 250;
    if (t < 2.5) return door - ((door - seat) * t) / 2.5;
    if (t < 11.5) return seat;
    return seat + ((door - seat) * (t - 11.5)) / 2.5;
  });
  const gFacing = useDerivedValue(() => {
    const t = (clock.value / 1000) % 14;
    return t < 11.5 ? -1 : 1;
  });
  const gPose = useDerivedValue<Pose>(() => {
    const t = (clock.value / 1000) % 14;
    return t < 2.5 ? 'walk' : t < 5.5 ? 'sit-wait' : t < 10 ? 'sit-eat' : t < 11.5 ? 'cheer' : 'walk';
  });
  const h = floor + 60;
  return (
    <View style={{ width: W, height: h }}>
      <Floor y={floor - 16 * zoom} h={30 * zoom + 30} color="#EBD3B0" />
      <Stool x={250} y={floor} scale={s} />
      <Canvas style={{ width: W, height: h }}>
        <Character look={{ preset: 'marco' }} x={60} y={floor - 90 * zoom} clock={clock} pose={cPose} scale={s} />
        <Character look={randomLook(22, 'waiter')} x={wx} y={floor - 40 * zoom + 40} clock={clock} pose={wPose} facing={wFacing} scale={s} />
        <Character look={randomLook(3, 'customer')} x={gx} y={floor} clock={clock} pose={gPose} facing={gFacing} scale={s} />
      </Canvas>
      <Label x={0} y={h - 20} w={W}>
        chef: cook, toss, cheer, idle, sleep · waiter: carry, idle, walk, wave · customer: walk, sit-wait, sit-eat, cheer, walk
      </Label>
    </View>
  );
}

function Nav({ page }: { page: string }) {
  const go = (name: string) => {
    if (typeof location === 'undefined') return;
    const q = new URLSearchParams(location.search);
    q.set('page', name);
    location.search = q.toString();
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6, paddingTop: 6 }}>
      {PAGES.map((name, i) => (
        <Pressable key={name} onPress={() => go(name)} style={{ paddingHorizontal: 8, paddingVertical: 5, marginRight: 4, borderRadius: 8, backgroundColor: page === name ? '#E63946' : '#F1DFC8' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: page === name ? '#FFFFFF' : '#6B5038' }}>{`${i + 1} ${name}`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ArtGallery() {
  const raw = param('page') ?? '1';
  const page = /^\d+$/.test(raw) ? (PAGES[Number(raw) - 1] ?? 'busts') : raw;
  const clock = useGalleryClock();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }}>
      {param('nav') === '0' ? null : <Nav page={page} />}
      {page === 'busts' ? <BustsPage /> : null}
      {page === 'poses' ? <PosesPage clock={clock} /> : null}
      {page === 'variety' ? <VarietyPage clock={clock} /> : null}
      {page === 'cast' ? <CastPage clock={clock} /> : null}
      {page === 'crowd' ? <CrowdPage clock={clock} /> : null}
      {page === 'live' ? <LivePage clock={clock} /> : null}
      {page === 'strip' ? <StripPage /> : null}
    </ScrollView>
  );
}
