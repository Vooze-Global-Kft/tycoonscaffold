/**
 * The Ladder Book (spec 5.2, 4.4): six bamboo ladders of eight rungs, one shown at a time under a
 * row of six chain tabs (the gear's icon and its count). A found good shows its picture, name and
 * worth; the next good of the ladder its name and silhouette; later rungs "?". This season's best
 * tier wears a brass ring; a complete ladder says the lantern it lit. A discovery pays no coins and
 * nothing here suggests it does. The help page ("Odds") prints the Lucky odds the rules use now and
 * the gift box odds.
 *
 * Drawing: ONE canvas for the shown ladder (poles, rungs and goods recorded once per state and
 * kept), the tabs' icons are the kit's cached MergeIcon images: no canvas per row.
 * Package SPOKES (7b).
 */
import { Canvas, Picture, Skia, type SkPicture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as R from '../../../engine/merge';
import { Sheet } from '../../kit';
import { MergeIcon } from '../art/MergeIcon';
import { drawGood } from '../art/goods.draw';
import { NIGHT, alpha } from '../art/palette';
import { at } from '../art/pen';
import { drawBambooPole, drawRung } from '../art/spokes.draw';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { C, Card, GUTTER, Head, PaperButton, T, useFs, useSpokeView } from './kit';
import { useSpokeLocal } from './local';
import { SpokeFrame, Subtitle } from './SpokeFrame';
import { gearIcon, ladderLantern, ladderView, oddsView, type RungView } from './views';

const W = S.spokes;
const LADDER_W = 84;
const WINDOW_R = 20;

const pictures = new Map<string, SkPicture>();

/** The shown ladder: two poles, eight rungs with the good, its silhouette or "?" in each window (tier 1 at the bottom). */
function ladderPicture(c: number, rungs: RungView[], rowH: number): SkPicture {
  const key = `${c}:${rowH}:${rungs.map((r) => r.kind[0] + (r.best ? '*' : '')).join('')}`;
  const hit = pictures.get(key);
  if (hit) return hit;
  const h = rowH * 8;
  const rec = Skia.PictureRecorder();
  const q = rec.beginRecording(Skia.XYWHRect(0, 0, LADDER_W, h));
  for (const x of [8, LADDER_W - 8]) at(q, x, 0, 1, 0, (k) => drawBambooPole(k, h, 8, rowH));
  for (let i = 0; i < 8; i++) {
    const r = rungs[i];
    const y = h - rowH * (i + 0.5);
    at(q, LADDER_W / 2, y, 1, 0, (k) => {
      drawRung(k, LADDER_W - 6, r.kind, { r: WINDOW_R, best: r.best });
      const s = (WINDOW_R * 2 - 4) / 48;
      if (r.kind === 'found') at(k, 0, -1, s, 0, (g) => drawGood(g, c, r.k, { pip: true }));
      else if (r.kind === 'next') at(k, 0, -1, s, 0, (g) => drawGood(g, c, r.k, { pip: false, silhouette: alpha(NIGHT.inkSoft, 0.75) }));
    });
  }
  const p = rec.finishRecordingAsPicture();
  pictures.set(key, p);
  return p;
}

export function LadderBook() {
  const fs = useFs();
  const { width } = useWindowDimensions();
  const chosen = useSpokeLocal((s) => s.ladder);
  const view = useSpokeView((cfg, g) => ({
    ladders: Array.from({ length: R.CHAINS }, (_, c) => ladderView(cfg, g, c)),
    lantern: ladderLantern(cfg),
    odds: oddsView(cfg, g),
  }));
  const rowH = Math.max(54, Math.ceil(50 * fs));
  const ladder = view?.ladders[chosen] ?? null;
  const pic = useMemo(() => (ladder ? ladderPicture(ladder.c, ladder.rungs, rowH) : null), [ladder, rowH]);
  if (!view || !ladder || !pic) return <SpokeFrame title={W.bookTitle} />;
  const found = view.ladders.reduce((a, l) => a + l.found, 0);
  const all = R.CHAINS * R.TIERS;
  const tabW = Math.floor((width - 2 * GUTTER - 5 * 6) / 6);
  const toGo = R.TIERS - ladder.found;
  return (
    <SpokeFrame title={W.bookTitle} right={<PaperButton small tone="paper" label={W.oddsOpen} onPress={() => useSpokeLocal.getState().setOdds(true)} />}>
      <Subtitle>{W.bookFound(found, all)}</Subtitle>
      <View style={styles.tabs}>
        {view.ladders.map((l) => {
          const on = l.c === chosen;
          return (
            <Pressable
              key={l.c}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={W.ladderLabel(l.name, l.found, R.TIERS)}
              onPressIn={() => useMergeUi.getState().touched()}
              onPress={() => useSpokeLocal.getState().setLadder(l.c)}
              style={[styles.tab, { width: tabW }, on && styles.tabOn]}
            >
              <MergeIcon icon={gearIcon(l.c)} size={30} />
              <T size={11} weight="700" color={l.complete ? C.amber : on ? C.text : C.dim} lines={1}>
                {W.ladderCount(l.found, R.TIERS)}
              </T>
              {l.complete ? (
                <View style={styles.tabLantern}>
                  <MergeIcon icon="art:lantern-lit" size={14} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <Card style={styles.page} glow={ladder.complete}>
        <T size={17} weight="700" lines={1} style={{ marginBottom: 6 }}>
          {ladder.name}
        </T>
        <View style={styles.ladderRow}>
          <Canvas style={{ width: LADDER_W, height: rowH * 8 }}>
            <Picture picture={pic} />
          </Canvas>
          <View style={styles.names}>
            {[...ladder.rungs].reverse().map((r) => (
              <View key={r.k} style={[styles.rungText, { height: rowH }]}>
                {r.kind === 'unknown' ? (
                  <T size={15} color={C.faint} lines={1}>
                    {W.unknown}
                  </T>
                ) : (
                  <>
                    <T size={15} weight={r.kind === 'found' ? '700' : '400'} color={r.best ? C.amberSoft : r.kind === 'found' ? C.text : C.dim} lines={1}>
                      {r.name}
                    </T>
                    <T size={12} color={C.faint} lines={1}>
                      {r.detail}
                    </T>
                  </>
                )}
              </View>
            ))}
          </View>
        </View>
        <View style={styles.footLine}>
          {ladder.complete ? <MergeIcon icon="art:lantern-lit" size={22} /> : null}
          <T size={13} color={ladder.complete ? C.amberSoft : C.dim} style={{ flex: 1 }}>
            {ladder.complete && view.lantern !== null ? W.ladderDone(view.lantern) : W.ladderToGo(toGo)}
          </T>
        </View>
      </Card>
      <T size={13} color={C.dim} style={{ marginTop: 14 }}>
        {W.bestLegend}
      </T>
      <T size={13} color={C.dim} style={{ marginTop: 6 }}>
        {W.bookNote}
      </T>
      <OddsPage odds={view.odds} />
    </SpokeFrame>
  );
}

function OddsPage({ odds }: { odds: ReturnType<typeof oddsView> }) {
  const open = useSpokeLocal((s) => s.odds);
  const close = () => useSpokeLocal.getState().setOdds(false);
  return (
    <Sheet visible={open} onClose={close} title={W.oddsTitle} footer={<PaperButton label={W.oddsClose} onPress={close} />}>
      <Head>{W.luckyHead}</Head>
      <T size={15} color={NIGHT.paperLight}>
        {odds.lucky}
      </T>
      {odds.luckyWhy ? (
        <T size={13} color={C.dim}>
          {`${odds.luckyWhy} ${odds.luckyBase ?? ''}`.trim()}
        </T>
      ) : null}
      <View style={styles.oddsRow}>
        <MergeIcon icon="art:spark" size={26} />
        <T size={13} color={C.dim} style={{ flex: 1 }}>
          {odds.sparks}
        </T>
      </View>
      <Head>{W.giftHead}</Head>
      <T size={14} color={NIGHT.paperLight}>
        {odds.giftEvery}
      </T>
      <T size={14} color={NIGHT.paperLight} style={{ marginTop: 2 }}>
        {odds.giftSlots}
      </T>
      {odds.giftRows.map((r) => (
        <View key={r.icon} style={styles.oddsRow}>
          <MergeIcon icon={r.icon} size={26} />
          <T size={14} color={NIGHT.paperLight} style={{ flex: 1 }}>
            {r.text}
          </T>
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 },
  tab: { minHeight: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, backgroundColor: alpha(NIGHT.indigoLift, 0.85), borderWidth: 1, borderColor: alpha(NIGHT.brass, 0.25) },
  tabOn: { borderColor: NIGHT.amber, backgroundColor: alpha(NIGHT.indigoMid, 0.95) },
  tabLantern: { position: 'absolute', top: 2, right: 2 },
  page: { paddingTop: 10 },
  ladderRow: { flexDirection: 'row', gap: 10 },
  names: { flex: 1 },
  rungText: { justifyContent: 'center' },
  footLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
});
