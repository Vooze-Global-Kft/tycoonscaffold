/**
 * The Season scroll (spec 5.6, 2.8, 2.11 with M36 and M37): a paper scroll with the season's
 * Festival (its lines and ticks; a line whose good lies on the board now is marked; goods are
 * brought to the banner on the street, not here, said in one calm line), what filling it gives,
 * the "Resets" and "Stays" lists (the items are the rules' SEASON_RESETS and SEASON_STAYS, the
 * words ours), the next season drawn as a small board with its shape and decoration and one
 * sentence about the place, the street pieces of past seasons, and "Close the season", enabled only
 * when the rules allow it (canCloseSeason); it opens the close confirm (./SeasonClose.tsx).
 *
 * Drawing: the scroll paper and the small board are two pictures recorded once per size and kept;
 * goods and pieces are the kit's cached MergeIcon images. Package SPOKES (7b).
 */
import { Canvas, Picture, Skia, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { fx } from '../../../services/fx';
import { MergeIcon } from '../art/MergeIcon';
import { NIGHT, alpha } from '../art/palette';
import { at } from '../art/pen';
import { PARTICLES, drawParticle, drawScroll, drawSeasonBoard } from '../art/spokes.draw';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { C, PaperButton, T, useSpokeView } from './kit';
import { SpokeFrame } from './SpokeFrame';
import { gearIcon, goodIcon, scrollView, type BoardShape, type FestivalLineView } from './views';

const W = S.spokes;
const INK = NIGHT.ink;
const INK_SOFT = NIGHT.inkSoft;
const CELL = 9;

const pictures = new Map<string, SkPicture>();

function keep(key: string, w: number, h: number, draw: (c: SkCanvas) => void): SkPicture {
  const hit = pictures.get(key);
  if (hit) return hit;
  const rec = Skia.PictureRecorder();
  draw(rec.beginRecording(Skia.XYWHRect(0, 0, w, h)));
  const p = rec.finishRecordingAsPicture();
  pictures.set(key, p);
  return p;
}

const scrollPicture = (w: number, h: number) => keep(`scroll:${Math.round(w)}x${Math.round(h)}`, w, h, (c) => drawScroll(c, w, h));

/** The next season's board, 7 x 8 cells of CELL pt, with a few of its decoration's particles over it. */
export function seasonBoardPicture(shape: BoardShape, decoration: number, cell = CELL): SkPicture {
  const bw = 7 * cell + 8;
  const bh = 8 * cell + 8;
  return keep(`board:${shape}:${decoration}:${cell}`, bw, bh, (c) => {
    at(c, 4, 4, 1, 0, (q) => drawSeasonBoard(q, shape, cell));
    const kind = PARTICLES[decoration % PARTICLES.length];
    const spots = [[0.2, 0.15], [0.75, 0.1], [0.5, 0.42], [0.15, 0.7], [0.82, 0.62], [0.45, 0.88]];
    for (const [x, y] of spots) at(c, x * bw, y * bh, cell / 10, 0, (q) => drawParticle(q, kind, 0.9));
  });
}

export function SeasonScroll() {
  const view = useSpokeView((cfg, g) => scrollView(cfg, g));
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const paper = useMemo(() => (size ? scrollPicture(size.w, size.h) : null), [size]);
  const board = useMemo(() => (view ? seasonBoardPicture(view.next.shape, view.next.decoration) : null), [view]);
  if (!view || !board) return <SpokeFrame title={W.scrollTitle} />;
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - w) > 0.5 || Math.abs(size.h - h) > 0.5) setSize({ w, h });
  };
  const footer = (
    <View>
      {!view.canClose ? (
        <T size={13} color={C.dim} align="center" style={{ marginBottom: 8 }}>
          {W.closeLocked}
        </T>
      ) : null}
      <PaperButton
        label={W.close}
        disabled={!view.canClose}
        onPress={() => {
          fx.play('ui_open');
          useMergeUi.getState().openSheet({ type: 'seasonClose' });
        }}
      />
    </View>
  );
  return (
    <SpokeFrame title={W.scrollTitle} footer={footer}>
      <View onLayout={onLayout} style={styles.scroll}>
        {paper ? (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Picture picture={paper} />
          </Canvas>
        ) : null}
        <T size={20} weight="700" color={INK} align="center">
          {view.season}
        </T>
        <PaperHead>{`${W.festivalHead} · ${view.filled}/${view.lines.length}`}</PaperHead>
        {view.lines.map((l, i) => (
          <Line key={`${l.c}-${l.k}-${i}`} l={l} />
        ))}
        <T size={13} color={INK_SOFT} style={styles.para}>
          {view.done ? W.festivalDone : W.festivalHow}
        </T>
        {!view.done ? (
          <T size={13} color={INK_SOFT} style={styles.para}>
            {view.gives}
          </T>
        ) : null}
        <View style={styles.lists}>
          <View style={styles.list}>
            <PaperHead>{W.resets}</PaperHead>
            {view.resets.map((w) => (
              <Item key={w} text={w} />
            ))}
          </View>
          <View style={styles.list}>
            <PaperHead>{W.stays}</PaperHead>
            {view.stays.map((w) => (
              <Item key={w} text={w} keep />
            ))}
          </View>
        </View>
        <PaperHead>{W.nextHead(view.next.season)}</PaperHead>
        <View style={styles.next}>
          <View style={styles.boardBox}>
            <Canvas style={{ width: 7 * CELL + 8, height: 8 * CELL + 8 }}>
              <Picture picture={board} />
            </Canvas>
          </View>
          <View style={{ flex: 1 }}>
            <T size={14} color={INK}>
              {view.next.sentence}
            </T>
            {view.next.newStall && view.next.newStallChain !== null ? (
              <View style={styles.newStall}>
                <MergeIcon icon={gearIcon(view.next.newStallChain)} size={28} />
                <T size={13} color={INK_SOFT} style={{ flex: 1 }}>
                  {view.next.newStall}
                </T>
              </View>
            ) : null}
          </View>
        </View>
        <PaperHead>{W.piecesHead}</PaperHead>
        {view.pieces.length ? (
          <View style={styles.pieces}>
            {view.pieces.map((p) => (
              <View key={p.season} style={styles.piece}>
                <MergeIcon icon={`art:season-${p.season % 4}`} size={40} />
                <T size={11} color={INK_SOFT} align="center" lines={2}>
                  {p.now ? `${p.name}, ${W.pieceThis}` : p.name}
                </T>
              </View>
            ))}
          </View>
        ) : (
          <T size={13} color={INK_SOFT}>
            {W.piecesNone}
          </T>
        )}
      </View>
    </SpokeFrame>
  );
}

function PaperHead({ children }: { children: string }) {
  return (
    <View style={styles.head}>
      <T size={12} weight="700" color={NIGHT.brassDeep} lines={1} style={styles.headText}>
        {children}
      </T>
      <View style={styles.headRule} />
    </View>
  );
}

function Line({ l }: { l: FestivalLineView }) {
  const ready = l.state === 'ready';
  return (
    <View style={[styles.line, ready && styles.lineReady, l.state === 'filled' && styles.lineFilled]}>
      <MergeIcon icon={goodIcon(l.c, l.k)} size={36} />
      <View style={{ flex: 1 }}>
        <T size={15} weight="700" color={INK} lines={1}>
          {l.name}
        </T>
        <T size={12} weight={ready ? '700' : '400'} color={ready ? NIGHT.amberDeep : INK_SOFT} lines={1}>
          {l.note}
        </T>
      </View>
      {l.state === 'filled' ? <MergeIcon icon="art:stamp" size={30} /> : <View style={[styles.ring, ready && styles.ringReady]} />}
    </View>
  );
}

function Item({ text, keep: stays }: { text: string; keep?: boolean }) {
  return (
    <View style={styles.item}>
      <View style={[styles.dot, { backgroundColor: stays ? NIGHT.tealLift : NIGHT.paperEdge }]} />
      <T size={13} color={INK} style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 30, paddingTop: 34, paddingBottom: 36, marginTop: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 6 },
  headText: { letterSpacing: 1.1, textTransform: 'uppercase' },
  headRule: { flex: 1, height: 1, backgroundColor: alpha(NIGHT.brassDeep, 0.35) },
  para: { marginTop: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4, backgroundColor: alpha(NIGHT.paperLight, 0.55), borderWidth: 1, borderColor: 'transparent' },
  lineReady: { borderColor: NIGHT.amber, backgroundColor: alpha(NIGHT.amberPale, 0.7) },
  lineFilled: { opacity: 0.85 },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: NIGHT.paperEdge },
  ringReady: { borderColor: NIGHT.amberDeep, backgroundColor: alpha(NIGHT.amber, 0.35) },
  lists: { flexDirection: 'row', gap: 14 },
  list: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  next: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  boardBox: { borderRadius: 6, padding: 2, backgroundColor: alpha(NIGHT.indigo, 0.9) },
  newStall: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  pieces: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  piece: { width: 72, alignItems: 'center' },
});
