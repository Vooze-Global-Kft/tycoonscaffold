import { Canvas, useClock } from '@shopify/react-native-skia';
import { useEffect, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { STATION_ART_KINDS, Station } from './props';

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

const PAGES = ['stations'] as const;
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
    </ScrollView>
  );
}
