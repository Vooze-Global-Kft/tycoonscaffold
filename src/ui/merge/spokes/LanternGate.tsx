/**
 * The Lantern Gate (spec 5.3, 4.4, with M5 and M24): a lacquered arch with 20 hooks; each lit
 * lantern glows on its hook and, below, says what it changed. The next three unlit feats show their
 * progress from the rules' featProgress (a soft halo marks them on the arch); the rest show their
 * feat without a bar. A lantern is earned, never bought: nothing on this screen buys anything.
 *
 * Drawing: ONE canvas for the arch (recorded once per lit set and kept); the rows use the kit's
 * cached lantern icons. Package SPOKES (7b).
 */
import { Canvas, Picture, Skia, type SkPicture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { MergeIcon } from '../art/MergeIcon';
import { NIGHT, alpha } from '../art/palette';
import { at, glow } from '../art/pen';
import { archHooks, drawGateLantern, drawLanternArch } from '../art/spokes.draw';
import { S } from '../strings';
import { C, Card, Cord, GUTTER, Head, T, useSpokeView } from './kit';
import { SpokeFrame, Subtitle } from './SpokeFrame';
import { gateView, type LanternRow } from './views';

const W = S.spokes;
const ARCH_H = 200;

const pictures = new Map<string, SkPicture>();

function archPicture(w: number, lit: readonly number[], next: readonly number[]): SkPicture {
  const key = `${Math.round(w)}:${[...lit].sort((a, b) => a - b).join(',')}:${next.join(',')}`;
  const hit = pictures.get(key);
  if (hit) return hit;
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(0, 0, w, ARCH_H));
  // The warm light of the lit lanterns pools under the arch.
  const share = lit.length / 20;
  if (share > 0) glow(c, w / 2, ARCH_H * 0.62, w * 0.42, NIGHT.amber, 0.08 + 0.22 * share);
  drawLanternArch(c, w, ARCH_H);
  archHooks(w, ARCH_H).forEach((p, i) => {
    const n = i + 1;
    const on = lit.includes(n);
    if (!on && next.includes(n)) glow(c, p.x, p.y + 12, 13, NIGHT.amberSoft, 0.35);
    at(c, p.x, p.y, 1, 0, (q) => drawGateLantern(q, on, 7));
  });
  const p = rec.finishRecordingAsPicture();
  pictures.set(key, p);
  return p;
}

export function LanternGate() {
  const { width } = useWindowDimensions();
  const view = useSpokeView((cfg, g) => gateView(cfg, g));
  const w = width - 2 * GUTTER;
  const pic = useMemo(() => (view ? archPicture(w, view.lit, view.next.map((r) => r.n)) : null), [view, w]);
  if (!view || !pic) return <SpokeFrame title={W.gateTitle} />;
  return (
    <SpokeFrame title={W.gateTitle}>
      <Subtitle>{W.gateLit(view.lit.length, view.total)}</Subtitle>
      <Canvas style={{ width: w, height: ARCH_H }}>
        <Picture picture={pic} />
      </Canvas>
      <T size={13} color={C.dim} align="center" style={{ marginTop: 4 }}>
        {W.gateNote}
      </T>
      {view.next.length ? (
        <>
          <Head>{W.gateNext}</Head>
          {view.next.map((r) => (
            <Row key={r.n} r={r} />
          ))}
        </>
      ) : (
        <T size={14} color={C.amberSoft} align="center" style={{ marginTop: 14 }}>
          {W.gateAll}
        </T>
      )}
      <Head>{W.gateLitHead}</Head>
      {view.litRows.length ? (
        view.litRows.map((r) => <Row key={r.n} r={r} />)
      ) : (
        <T size={13} color={C.faint}>
          {W.gateNone}
        </T>
      )}
      {view.dark.length ? (
        <>
          <Head>{W.gateDark}</Head>
          {view.dark.map((r) => (
            <Row key={r.n} r={r} />
          ))}
        </>
      ) : null}
    </SpokeFrame>
  );
}

function Row({ r }: { r: LanternRow }) {
  const dark = !r.lit && !r.bar;
  return (
    <Card style={styles.row} glow={r.lit}>
      <View style={styles.icon}>
        <MergeIcon icon={r.lit ? 'art:lantern-lit' : 'art:lantern-unlit'} size={30} />
        <T size={11} weight="700" color={r.lit ? C.amber : C.faint} lines={1}>
          {W.lanternNo(r.n)}
        </T>
      </View>
      <View style={styles.text}>
        <T size={15} weight="700" color={dark ? C.dim : C.text}>
          {r.feat}
        </T>
        <T size={13} color={r.lit ? C.amberSoft : C.faint} style={{ marginTop: 1 }}>
          {r.lit ? r.effect : W.gives(r.effect)}
        </T>
        {r.bar ? (
          <View style={styles.bar}>
            <View style={{ flex: 1 }}>
              <Cord have={r.bar.have} need={r.bar.need} />
            </View>
            <T size={12} weight="700" color={C.dim} lines={1}>
              {r.bar.text}
            </T>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 8, paddingVertical: 10, backgroundColor: alpha(NIGHT.indigoLift, 0.9) },
  icon: { width: 34, alignItems: 'center' },
  text: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
});
