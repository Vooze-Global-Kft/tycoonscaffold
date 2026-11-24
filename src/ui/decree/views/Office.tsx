/**
 * The Office wall (spec 4.4, 5.7 to 5.9, 7.3, D11): a full-screen view (useOverlay) where everything
 * the player did is kept. The player's portrait, greying a little each term (the art kit's three
 * ageing steps and a veil); photographs of the towns left behind with their ministries' levels on
 * record; the Grand Projects; the "Former opponents" card; the vanity shelf with the monuments owned
 * (and this term's offer); the scrapbook (clippings found, the unfound chains by their first line).
 * Gilt frames and wallpaper when the "Gilt Portrait Frames" cosmetic is owned. Terms served appear as
 * plain facts, never as a score. Everything shown is views/model.ts `wallModel` (the rules' state
 * and the game's data); one canvas per section, never one per row; faces and icons are the art kit's
 * cached images (DecreeIcon). Owned by the views package (VIEWS).
 */
import { Canvas, Group, Picture } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { decreeNow } from '../../../modes/decree/actions';
import { useOverlay } from '../../kit/overlay';
import { DecreeIcon } from '../art/DecreeIcon';
import { DESK, alpha } from '../art/palette';
import { dashed, picture, rect } from '../art/pen';
import { drawClipping, drawFrame, drawTownPhoto, drawVanityShelf, drawWallpaper, frameInner, scrapbookSlots, drawScrapbook } from '../art/wall.draw';
import { useFontScale } from '../hud/fontScale';
import { S } from '../strings';
import { useDecree } from '../useDecree';
import { type, viewScale } from './metrics';
import { surnameOf, wallModel, type WallModel } from './model';
import { INK, ViewButton } from './parts';

export function OfficeWall({ visible, onClose, onOffer }: { visible: boolean; onClose: () => void; onOffer: () => void }) {
  useOverlay(visible);
  if (!visible) return null;
  return <Wall onClose={onClose} onOffer={onOffer} />;
}

function Wall({ onClose, onOffer }: { onClose: () => void; onOffer: () => void }) {
  // What the wall reads changes rarely: a stable key of the few fields it shows.
  const key = useDecree((_c, g) => {
    const d = g.decree;
    return `${d.office}|${d.term}|${d.losses > 0}|${d.face}|${d.wall.length}|${d.formerOpponents.length}|${d.vanity.length}|${d.monumentOffer}|${d.clippings.length}|${d.ministries.length}|${d.phase}`;
  }, '');
  const levels = useDecree((_c, g) => g.decree.ministries.map((m) => m.level).join(','), '');
  const m = useMemo<WallModel | null>(() => {
    const now = decreeNow();
    return now ? wallModel(now.cfg, now.g) : null;
  }, [key, levels]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = viewScale(useFontScale());
  if (!m) return null;
  const W = Math.min(width, 560);
  const pad = 16;
  const w = W - pad * 2;
  const t = { title: type(18, s), head: type(15, s), body: type(13, s), small: type(12, s), clip: type(11, s) };
  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.title, t.title]}>
          {S.views.officeTitle}
        </Text>
        <ViewButton label={S.views.back} onPress={onClose} s={s} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 12, paddingBottom: insets.bottom + 24, width: W, alignSelf: 'center', gap: 18 }}>
        <Portrait m={m} w={w} t={t} />
        <Towns m={m} w={w} t={t} />
        {m.grandProjects.length ? <Projects m={m} t={t} /> : null}
        <Opponents m={m} t={t} />
        <Shelf m={m} w={w} s={s} t={t} onOffer={onOffer} />
        <Scrapbook m={m} w={w} s={s} t={t} />
      </ScrollView>
    </View>
  );
}

type Types = Record<'title' | 'head' | 'body' | 'small' | 'clip', { fontSize: number; lineHeight: number }>;

function Heading({ children, t }: { children: string; t: Types }) {
  return (
    <Text allowFontScaling={false} style={[styles.heading, t.head]}>
      {children}
    </Text>
  );
}

// ----------------------------------------------------------------------------- the portrait (5.7)

function Portrait({ m, w, t }: { m: WallModel; w: number; t: Types }) {
  const fw = 128;
  const fh = 164;
  const h = fh + 20;
  const style = m.gilt ? 'gilt' : 'walnut';
  const pic = useMemo(
    () =>
      picture({ x: 0, y: 0, w, h }, (c) => {
        drawWallpaper(c, { x: 0, y: 0, w, h }, style, 0);
        c.save();
        c.translate(10, 10);
        drawFrame(c, fw, fh, style, true);
        c.restore();
      }),
    [w, h, style],
  );
  const inner = frameInner(fw, fh);
  const size = Math.min(inner.w, inner.h);
  const textX = 10 + fw + 14;
  const name = m.player ? (m.acting ? S.views.portraitActing(m.title, surnameOf(m.player.name)) : S.views.portrait(m.title, surnameOf(m.player.name))) : S.views.noPortrait;
  return (
    <View style={{ width: w, height: h }}>
      <Canvas style={{ width: w, height: h }} pointerEvents="none">
        <Picture picture={pic} />
      </Canvas>
      {m.player ? (
        <View style={[styles.abs, { left: 10 + inner.x + (inner.w - size) / 2, top: 10 + inner.y + (inner.h - size) / 2 }]} pointerEvents="none">
          <DecreeIcon icon={`face:portrait-${m.player.id}-${m.age}`} size={size} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: alpha(DESK.paperShade, 0.35 * m.veil) }]} />
        </View>
      ) : null}
      <View style={[styles.abs, styles.plate, { left: textX, top: 14, width: w - textX - 8 }]}>
        <Text allowFontScaling={false} style={[styles.name, t.head]}>
          {name}
        </Text>
        <Text allowFontScaling={false} style={[styles.fact, t.small]}>
          {S.views.seat(m.place)}
        </Text>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------- the towns left behind (5.7)

function Towns({ m, w, t }: { m: WallModel; w: number; t: Types }) {
  const n = m.photos.length;
  const colW = n ? Math.floor((w - (n - 1) * 12) / Math.max(n, 2)) : w;
  const pw = Math.min(140, colW - 8);
  const ph = Math.round(pw * 0.72);
  const pic = useMemo(
    () =>
      picture({ x: 0, y: 0, w, h: ph + 8 }, (c) => {
        m.photos.forEach((p, i) => {
          c.save();
          c.translate(i * (colW + 12) + (colW - pw) / 2, 4);
          drawTownPhoto(c, pw, ph, p.office, i % 2 ? 2 : -2);
          c.restore();
        });
      }),
    [m.photos, w, colW, pw, ph],
  );
  return (
    <View>
      <Heading t={t}>{S.views.townsLeft}</Heading>
      {n === 0 ? (
        <Text allowFontScaling={false} style={[styles.soft, t.body]}>
          {S.views.noTowns}
        </Text>
      ) : (
        <>
          <Canvas style={{ width: w, height: ph + 8 }} pointerEvents="none">
            <Picture picture={pic} />
          </Canvas>
          <View style={styles.row}>
            {m.photos.map((p, i) => (
              <View key={i} style={{ width: colW, marginRight: i < n - 1 ? 12 : 0 }}>
                <Text allowFontScaling={false} style={[styles.caption, t.small]}>
                  {S.views.photoCaption(p.place, p.title)}
                </Text>
                <Text allowFontScaling={false} style={[styles.soft, t.clip]}>
                  {S.views.levelsOnRecord}
                </Text>
                {p.ministries.map((x, k) => (
                  <Text key={k} allowFontScaling={false} style={[styles.fact, t.clip]}>
                    {S.views.levelOf(x.name, x.level)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ----------------------------------------------------------------------------- Grand Projects (2.2, 2.14)

function Projects({ m, t }: { m: WallModel; t: Types }) {
  return (
    <View>
      <Heading t={t}>{S.views.grandProjects}</Heading>
      {m.grandProjects.map((p) => (
        <View key={p.id} style={styles.listRow}>
          <DecreeIcon icon={`art:ministry_${p.id}`} size={32} />
          <View style={styles.flex}>
            <Text allowFontScaling={false} style={[styles.fact, t.body, styles.bold]}>
              {p.name}
            </Text>
            <Text allowFontScaling={false} style={[styles.soft, t.small]}>
              {p.open ? S.views.projectLevel(p.level) : S.views.projectClosed}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ----------------------------------------------------------------------------- Former opponents (5.7)

function Opponents({ m, t }: { m: WallModel; t: Types }) {
  return (
    <View style={styles.card}>
      <View style={styles.pin} />
      <Text allowFontScaling={false} style={[styles.cardTitle, t.head]}>
        {S.views.opponents}
      </Text>
      <View style={styles.cardRule} />
      {m.formerOpponents.length === 0 ? (
        <Text allowFontScaling={false} style={[styles.soft, t.body]}>
          {S.views.noOpponents}
        </Text>
      ) : (
        m.formerOpponents.map((o) => (
          <View key={o.id} style={styles.opponent}>
            <Text allowFontScaling={false} style={[styles.fact, t.body, styles.bold]}>
              {o.name}
            </Text>
            {o.slogan ? (
              <Text allowFontScaling={false} style={[styles.soft, t.small, styles.italic]}>
                {o.slogan}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

// ----------------------------------------------------------------------------- the vanity shelf (5.8)

function Shelf({ m, w, s, t, onOffer }: { m: WallModel; w: number; s: number; t: Types; onOffer: () => void }) {
  const h = Math.round(Math.min(132, w * 0.38));
  const placed = useMemo(() => Array.from({ length: 24 }, (_, i) => m.monuments[i]?.id ?? null), [m.monuments]);
  const pic = useMemo(() => picture({ x: 0, y: 0, w, h }, (c) => drawVanityShelf(c, w, h, placed)), [w, h, placed]);
  return (
    <View>
      <Heading t={t}>{S.views.shelf}</Heading>
      <Canvas style={{ width: w, height: h }} pointerEvents="none">
        <Picture picture={pic} />
      </Canvas>
      <Text allowFontScaling={false} style={[m.monuments.length ? styles.fact : styles.soft, t.small, styles.below]}>
        {m.monuments.length ? m.monuments.map((x) => x.name).join(' · ') : S.views.shelfEmpty}
      </Text>
      {m.offer ? <ViewButton label={S.views.seeOffer} onPress={onOffer} s={s} kind="primary" style={styles.below} /> : null}
    </View>
  );
}

// ----------------------------------------------------------------------------- the scrapbook (5.9)

function Scrapbook({ m, w, s, t }: { m: WallModel; w: number; s: number; t: Types }) {
  const perPage = 4;
  const pages = Math.max(1, Math.ceil(m.scrapbook.length / perPage));
  const [page, setPage] = useState(0);
  const at = Math.min(page, pages - 1);
  const entries = m.scrapbook.slice(at * perPage, at * perPage + perPage);
  // Each place holds up to 90 characters at 11 × s: seven lines and the band above them.
  const slotH = t.clip.lineHeight * 7 + 22;
  const h = slotH * 2 + 3 * 14;
  const slots = scrapbookSlots(w, h);
  const pic = useMemo(
    () =>
      picture({ x: 0, y: 0, w, h }, (c) => {
        drawScrapbook(c, w, h);
        entries.forEach((e, i) => {
          const b = slots[i];
          c.save();
          c.translate(b.x, b.y);
          if (e.found) drawClipping(c, b.w, b.h, 7 + at * 4 + i, { photo: false });
          else c.drawPath(rect(1, 1, b.w - 2, b.h - 2), dashed(DESK.slate, 1.2, 5, 4));
          c.restore();
        });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w, h, at, m.scrapbook],
  );
  return (
    <View>
      <Heading t={t}>{S.views.scrapbook}</Heading>
      {m.scrapbook.length === 0 ? (
        <Text allowFontScaling={false} style={[styles.soft, t.body]}>
          {S.views.scrapbookEmpty}
        </Text>
      ) : (
        <>
          <View style={{ width: w, height: h }}>
            <Canvas style={{ width: w, height: h }} pointerEvents="none">
              <Picture picture={pic} />
            </Canvas>
            {entries.map((e, i) => {
              const b = slots[i];
              return (
                <View key={i} style={[styles.abs, { left: b.x + 7, top: b.y + 8, width: b.w - 14, height: b.h - 14 }]} pointerEvents="none">
                  {e.found ? null : (
                    <Text allowFontScaling={false} numberOfLines={1} style={[styles.unfoundHead, t.clip]}>
                      {S.views.notInPapers}
                    </Text>
                  )}
                  <Text allowFontScaling={false} numberOfLines={e.found ? 7 : 6} style={[e.found ? styles.headline : styles.unfound, t.clip]}>
                    {e.text}
                  </Text>
                </View>
              );
            })}
          </View>
          {pages > 1 ? (
            <View style={styles.pager}>
              <ViewButton label={S.views.prevMark} accessibilityLabel={S.views.prevPage} onPress={() => setPage(Math.max(0, at - 1))} s={s} disabled={at === 0} style={styles.pageBtn} />
              <Text allowFontScaling={false} style={[styles.fact, t.small]}>
                {S.views.page(at + 1, pages)}
              </Text>
              <ViewButton label={S.views.nextMark} accessibilityLabel={S.views.nextPage} onPress={() => setPage(Math.min(pages - 1, at + 1))} s={s} disabled={at >= pages - 1} style={styles.pageBtn} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: INK.wall, zIndex: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: INK.walnut, borderBottomWidth: 3, borderColor: INK.walnutDeep },
  title: { color: INK.paperLight, fontWeight: '800', flexShrink: 1 },
  abs: { position: 'absolute' },
  plate: { gap: 6 },
  name: { color: INK.violetDeep, fontWeight: '800' },
  fact: { color: INK.ink },
  soft: { color: INK.soft },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  heading: { color: INK.walnutDeep, fontWeight: '800', marginBottom: 8 },
  caption: { color: INK.ink, fontWeight: '700', marginTop: 4 },
  row: { flexDirection: 'row', marginTop: 4 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  flex: { flex: 1, minWidth: 0 },
  card: { backgroundColor: INK.paperLight, borderWidth: StyleSheet.hairlineWidth, borderColor: DESK.paperEdge, padding: 12, paddingTop: 14 },
  pin: { position: 'absolute', top: 4, alignSelf: 'center', left: '50%', width: 8, height: 8, borderRadius: 4, backgroundColor: INK.brass },
  cardTitle: { color: INK.violetDeep, fontWeight: '800' },
  cardRule: { height: 1.5, backgroundColor: INK.violet, marginVertical: 6 },
  opponent: { paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: DESK.slateLight },
  below: { marginTop: 8 },
  headline: { color: INK.ink, fontWeight: '800' },
  unfoundHead: { color: DESK.slateDeep, fontWeight: '700' },
  unfound: { color: DESK.slateDeep, fontStyle: 'italic' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 },
  pageBtn: { minWidth: 56 },
});
