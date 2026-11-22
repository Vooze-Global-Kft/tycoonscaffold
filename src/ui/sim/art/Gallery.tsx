import { Canvas, useClock } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Character } from './Character';
import { LOOKS, LOOK_NAMES, lookFor, randomLook } from './looks';
import { POSES, type CharacterKind, type CharacterLook, type DishKind, type Pose } from './types';

/**
 * Dev-only art gallery: every procedural character, pose and prop on one
 * screen, for visual review. Open the web build with `?view=art`.
 *
 * Query parameters: `page`, `look` (a cast name or `r<seed>`), `pose`, `dish`,
 * `t` (freeze the clock at this many ms; `window.__setArtTime(ms)` moves it).
 */
const param = (name: string) => (typeof location !== 'undefined' ? new URLSearchParams(location.search).get(name) : null);

const W = 390;
const BG = '#FFF6E9';

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

function pickLook(fallback: CharacterLook): CharacterLook {
  const name = param('look');
  if (!name) return fallback;
  const m = /^r(\d+)([a-z]*)$/.exec(name);
  if (m) return randomLook(Number(m[1]), (m[2] || 'customer') as CharacterKind);
  return lookFor(name);
}

function Label({ x, y, w, children }: { x: number; y: number; w: number; children: string }) {
  return <Text style={{ position: 'absolute', left: x, top: y, width: w, textAlign: 'center', fontSize: 10, color: '#8A7560' }}>{children}</Text>;
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
          <Character key={n} look={LOOKS[n]} x={(i % cols) * cw + cw / 2} y={Math.floor(i / cols) * ch + ch - 30} clock={clock} scale={3} pose={pose} />
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
        <Character key={n} look={LOOKS[n]} x={34 + (i % 6) * 62} y={90 + Math.floor(i / 6) * 90} clock={clock} pose={pose} />
      ))}
      {Array.from({ length: 36 }, (_, i) => (
        <Character key={i} look={randomLook(i + 1, kinds[i % 6])} x={34 + (i % 6) * 62} y={280 + Math.floor(i / 6) * 84} clock={clock} pose={pose} />
      ))}
    </Canvas>
  );
}

function PosesPage({ clock }: { clock: SharedValue<number> }) {
  const look = pickLook(LOOKS.marco);
  const dish = (param('dish') as DishKind) ?? 'pizza';
  const big = Number(param('zoom') ?? 2.5);
  const ch = 168;
  return (
    <View style={{ width: W, height: POSES.length * 0.5 * ch + 20 }}>
      <Canvas style={{ width: W, height: POSES.length * 0.5 * ch + 20 }}>
        {POSES.map((p, i) => {
          const cx = (i % 2) * (W / 2);
          const cy = Math.floor(i / 2) * ch;
          return [
            <Character key={p + 's'} look={look} x={cx + 36} y={cy + ch - 26} clock={clock} pose={p} dish={dish} />,
            <Character key={p + 'b'} look={look} x={cx + 122} y={cy + ch - 26} clock={clock} pose={p} dish={dish} scale={big} />,
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

export function ArtGallery() {
  const page = param('page') ?? 'cast';
  const clock = useGalleryClock();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }}>
      {page === 'cast' ? <CastPage clock={clock} /> : null}
      {page === 'crowd' ? <CrowdPage clock={clock} /> : null}
      {page === 'poses' ? <PosesPage clock={clock} /> : null}
    </ScrollView>
  );
}
