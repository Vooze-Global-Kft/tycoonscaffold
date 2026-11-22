import { Canvas, useClock } from '@shopify/react-native-skia';
import { useEffect, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Chair, Door, Pass, STATION_ART_KINDS, Station, Table } from './props';

/**
 * Dev-only gallery of every code-drawn prop (stations, counter, tables, door,
 * chest, cards, ...), for visual review. Open the web build with `?view=props`.
 *
 * Query parameters: `page` (see `PAGES`), `t` (freeze the clock at this many
 * ms; `window.__setArtTime(ms)` moves it).
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
}

/** One canvas with captions laid over it. */
function Sheet({ title, height, labels = [], children }: { title?: string; height: number; labels?: LabelSpec[]; children: ReactNode }) {
  return (
    <View style={{ width: W }}>
      {title ? <Text style={{ fontSize: 13, fontWeight: '700', color: '#5A4636', paddingHorizontal: 10, paddingTop: 10 }}>{title}</Text> : null}
      <View style={{ width: W, height }}>
        <Canvas style={{ width: W, height }}>{children}</Canvas>
        {labels.map((l, i) => (
          <Text key={i} style={{ position: 'absolute', left: l.x - (l.w ?? 80) / 2, top: l.y, width: l.w ?? 80, textAlign: 'center', fontSize: 9, color: '#8A7560' }}>
            {l.text}
          </Text>
        ))}
      </View>
    </View>
  );
}

function StationsPage({ clock }: { clock: SharedValue<number> }) {
  return (
    <>
      {STATION_ART_KINDS.map((kind) => (
        <Sheet
          key={kind}
          title={kind}
          height={352}
          labels={[
            { x: 40, y: 152, text: 'idle' },
            { x: 108, y: 152, text: 'working' },
            { x: 176, y: 152, text: 'locked' },
            { x: 300, y: 172, text: 'working x2.5' },
            { x: 96, y: 338, text: 'idle x2.5' },
            { x: 292, y: 338, text: 'locked x2.5' },
          ]}
        >
          <Station kind={kind} x={40} y={148} clock={clock} />
          <Station kind={kind} x={108} y={148} working clock={clock} />
          <Station kind={kind} x={176} y={148} locked clock={clock} />
          <Station kind={kind} x={300} y={168} scale={BIG} working clock={clock} />
          <Station kind={kind} x={96} y={334} scale={BIG} clock={clock} />
          <Station kind={kind} x={292} y={334} scale={BIG} locked clock={clock} />
        </Sheet>
      ))}
    </>
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

/** 0..1 that sweeps up and back every `ms` (saw wave with a hold at each end). */
function useSweep(clock: SharedValue<number>, ms: number): SharedValue<number> {
  return useDerivedValue(() => {
    const u = (clock.value % ms) / ms;
    const t = u < 0.5 ? u * 2 : 2 - u * 2;
    return Math.max(0, Math.min(1, t * 1.3 - 0.15));
  });
}

function FurniturePage({ clock }: { clock: SharedValue<number> }) {
  const rung = useBump(1600);
  const swing = useBump(2200);
  const fill = useSweep(clock, 6000);
  return (
    <>
      <Sheet title="pass: dishes 0 / 0.5 / 1 / animated, bell rings every 1.6 s" height={300}>
        <Pass x={100} y={50} width={180} dishes={0} rung={rung} clock={clock} />
        <Pass x={290} y={50} width={180} dishes={0.5} rung={rung} clock={clock} dish={['pizza', 'plate', 'bowl']} />
        <Pass x={100} y={120} width={180} dishes={1} clock={clock} />
        <Pass x={290} y={120} width={180} dishes={fill} rung={rung} clock={clock} dish="plate" />
        <Pass x={195} y={290} width={150} scale={BIG} dishes={0.6} rung={rung} clock={clock} />
      </Sheet>
      <Sheet title="table empty / food / finished, chairs, door" height={430}>
        <Chair x={36} y={80} />
        <Table x={60} y={84} state="empty" clock={clock} />
        <Chair x={84} y={80} facing={-1} />
        <Chair x={136} y={80} />
        <Table x={160} y={84} state="food" clock={clock} />
        <Chair x={184} y={80} facing={-1} />
        <Table x={250} y={84} state="finished" clock={clock} />
        <Door x={340} y={90} swing={swing} clock={clock} />
        <Chair x={45} y={250} scale={BIG} />
        <Table x={130} y={260} scale={BIG} state="food" clock={clock} />
        <Door x={300} y={300} scale={BIG} swing={swing} clock={clock} />
        <Table x={130} y={410} scale={BIG} state="finished" clock={clock} />
      </Sheet>
    </>
  );
}

const PAGES = ['stations', 'furniture'] as const;
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
    </ScrollView>
  );
}
